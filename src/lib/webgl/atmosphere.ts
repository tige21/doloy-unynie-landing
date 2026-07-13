import {
  Clock,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderer,
} from 'three';
import { gsap } from 'gsap';
import { dbg } from '../debug';
import { resetWaveImpl, setWaveImpl } from '../climax';
import { setGrainImpl } from '../grain';
import { prefersReducedMotion } from '../choreography';

/**
 * Three.js сцена v2 (REDESIGN-NOTES): заметная атмосфера.
 * — фон: живой градиент из плывущих цветовых пятен + плёночное зерно
 *   (в ночи зерно сильное — кино; днём деликатное);
 * — состояния night/day/after лерпятся в шейдере;
 * — волна крика: неровный тёплый фронт (заменяет CSS-вспышку);
 * — единый renderer: photos.ts добавляет свои планы в эту же сцену.
 * Право на отказ: нет WebGL / низкий FPS → слой умирает, CSS остаётся.
 */

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uState;      // 0 night, 1 day, 2 after
uniform float uWave;       // прогресс фронта; >=2 — нет
uniform float uGrainBoost; // пульс зерна (вдох/крик)

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1, 0)), f.x),
    mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}

vec3 palette(float which, int slot) {
  // slot 0 — база, 1..2 — пятна
  if (which < 0.5) { // night
    if (slot == 0) return vec3(0.078, 0.075, 0.067);
    if (slot == 1) return vec3(0.125, 0.110, 0.090);
    return vec3(0.150, 0.115, 0.085);
  } else if (which < 1.5) { // day
    if (slot == 0) return vec3(0.957, 0.945, 0.918);
    if (slot == 1) return vec3(0.965, 0.925, 0.860);
    return vec3(0.930, 0.940, 0.900);
  } else { // after
    if (slot == 0) return vec3(0.965, 0.941, 0.886);
    if (slot == 1) return vec3(1.000, 0.910, 0.820);
    return vec3(1.000, 0.890, 0.945);
  }
}

vec3 slotColor(int slot) {
  float s = clamp(uState, 0.0, 2.0);
  vec3 a = palette(0.0, slot), b = palette(1.0, slot), c = palette(2.0, slot);
  return s < 1.0 ? mix(a, b, s) : mix(b, c, s - 1.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  float t = uTime;

  vec3 col = slotColor(0);

  // два плывущих пятна
  vec2 p1 = vec2(0.28 + 0.20 * sin(t * 0.05), 0.62 + 0.16 * cos(t * 0.041));
  vec2 p2 = vec2(0.74 + 0.18 * cos(t * 0.037), 0.30 + 0.20 * sin(t * 0.047));
  float m1 = smoothstep(0.72, 0.05, length((uv - p1) * asp));
  float m2 = smoothstep(0.78, 0.08, length((uv - p2) * asp));
  col = mix(col, slotColor(1), m1 * 0.75);
  col = mix(col, slotColor(2), m2 * 0.6);

  // волна крика: неровный тёплый фронт от центра
  if (uWave < 2.0) {
    vec2 c = (uv - 0.5) * asp;
    float ang = atan(c.y, c.x);
    float wob = noise(vec2(ang * 1.6 + 5.0, t * 0.4)) * 0.16;
    float front = uWave * 1.4;
    float d = length(c);
    float band = smoothstep(front - 0.30, front - 0.06, d + wob) *
                 (1.0 - smoothstep(front - 0.02, front + 0.07, d + wob));
    col = mix(col, vec3(1.0, 0.353, 0.118), band * 0.55 * (1.0 - uWave * 0.5));
  }

  // плёночное зерно: в ночи сильное, днём деликатное
  float grainAmt = mix(0.085, 0.022, clamp(uState, 0.0, 1.0)) + uGrainBoost;
  float g = (hash(gl_FragCoord.xy + fract(t) * 917.0) - 0.5) * grainAmt;
  col += g;

  gl_FragColor = vec4(col, 1.0);
}
`;

const VERT = `void main() { gl_Position = vec4(position, 1.0); }`;

type Stage = {
  scene: Scene;
  camera: OrthographicCamera;
  renderer: WebGLRenderer;
  onFrame: (cb: (dt: number) => void) => void;
};

let stage: Stage | null = null;
const destroyCbs: Array<() => void> = [];

/** Доступ к сцене для photos.ts (планы добавляются в тот же рендер). */
export function getStage(): Stage | null {
  return stage;
}

/** Подписка на самоотключение слоя (photos возвращает DOM-фото). */
export function onStageDestroy(cb: () => void): void {
  destroyCbs.push(cb);
}

const STATE_NUM: Record<string, number> = { night: 0, day: 1, after: 2 };

export function initAtmosphere(): void {
  if (prefersReducedMotion()) {
    dbg('webgl', 'атмосфера: reduce-motion — не создаётся');
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText =
    'position:fixed;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none;';

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false });
  } catch {
    dbg('webgl', 'атмосфера: WebGL недоступен — CSS остаётся');
    return;
  }

  const dpr = Math.min(devicePixelRatio, 1.5);
  renderer.setPixelRatio(dpr);
  renderer.setSize(innerWidth, innerHeight);
  document.body.prepend(canvas);

  // Непрозрачные фоны html/body закрыли бы canvas (z:-1) — при живом
  // слое поверхность рисует шейдер, CSS-фон отдаёт сцену ему
  document.documentElement.style.background = 'transparent';
  document.body.style.background = 'transparent';

  const scene = new Scene();
  const camera = new OrthographicCamera(
    -innerWidth / 2, innerWidth / 2, innerHeight / 2, -innerHeight / 2, -100, 100,
  );

  const uniforms = {
    uRes: { value: new Vector2(innerWidth * dpr, innerHeight * dpr) },
    uTime: { value: 0 },
    uState: { value: STATE_NUM[document.documentElement.dataset.state ?? 'night'] ?? 0 },
    uWave: { value: 2 },
    uGrainBoost: { value: 0 },
  };

  const quad = new Mesh(
    new PlaneGeometry(2, 2),
    new ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms, depthWrite: false }),
  );
  quad.frustumCulled = false;
  quad.renderOrder = -1;
  scene.add(quad);

  // Смена состояния страницы → плавный лерп палитры
  new MutationObserver(() => {
    const target = STATE_NUM[document.documentElement.dataset.state ?? 'night'] ?? 0;
    gsap.to(uniforms.uState, { value: target, duration: 1.8, ease: 'power2.inOut' });
    dbg('webgl', 'атмосфера: state →', target);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-state'] });

  // Волна крика через шейдер
  let waveStart = -1;
  setWaveImpl((n) => {
    waveStart = performance.now();
    gsap.fromTo(uniforms.uGrainBoost, { value: 0.09 }, { value: 0, duration: 0.9 });
    dbg('webgl', `волна ${n} (шейдер)`);
  });

  // Пульс зерна извне (вдох, разгон) — через лёгкий мост grain.ts
  setGrainImpl((amt, dur) => {
    gsap.fromTo(uniforms.uGrainBoost, { value: amt }, { value: 0, duration: dur });
  });

  const frameCbs: Array<(dt: number) => void> = [];

  const resize = (): void => {
    renderer.setSize(innerWidth, innerHeight);
    camera.left = -innerWidth / 2;
    camera.right = innerWidth / 2;
    camera.top = innerHeight / 2;
    camera.bottom = -innerHeight / 2;
    camera.updateProjectionMatrix();
    uniforms.uRes.value.set(innerWidth * dpr, innerHeight * dpr);
  };
  addEventListener('resize', resize);

  // FPS-самоконтроль (право на отказ, DL 15.3 остаётся законом)
  let frames = 0;
  let windowStart = performance.now();
  let alive = true;
  const clock = new Clock();

  const loop = (): void => {
    if (!alive) return;
    if (!document.hidden) {
      const dt = clock.getDelta();
      uniforms.uTime.value += dt;
      // Fail-safe (фидбек: зависшая клякса): через 1.2с после strike фронт
      // гарантированно завершён, что бы ни случилось с таймингом
      const sinceWave = waveStart < 0 ? Infinity : performance.now() - waveStart;
      uniforms.uWave.value = sinceWave > 1200 ? 2 : Math.min(sinceWave / 900, 2);
      if (uniforms.uWave.value < 2 && Math.floor(uniforms.uTime.value) % 2 === 0) {
        dbg('webgl', '[FIX] uWave', uniforms.uWave.value.toFixed(2), 'since', Math.round(sinceWave));
      }
      for (const cb of frameCbs) cb(dt);
      renderer.render(scene, camera);

      frames++;
      const now = performance.now();
      if (now - windowStart > 2500) {
        const fps = (frames * 1000) / (now - windowStart);
        if (fps < 38) {
          alive = false;
          canvas.remove();
          renderer.dispose();
          resetWaveImpl();
          // вернуть CSS-поверхности и оповестить зависимые слои (photos)
          document.documentElement.style.background = '';
          document.body.style.background = '';
          destroyCbs.forEach((cb) => cb());
          stage = null;
          dbg('webgl', `атмосфера отключена: fps=${fps.toFixed(0)}`);
          return;
        }
        frames = 0;
        windowStart = now;
      }
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  stage = { scene, camera, renderer, onFrame: (cb) => frameCbs.push(cb) };
  dbg('webgl', 'атмосфера включена', { dpr });
}

