import { dbg } from '../debug';
import { resetWaveImpl, setWaveImpl } from '../climax';

/**
 * WebGL-слой (DL 15): «пользователь ощущает не WebGL, а погоду».
 * Два применения и только они:
 *   ВОЗДУХ — дыхание света фона на грани различимости (скриншот-тест:
 *   кадр неотличим от статичной заливки);
 *   ВОЛНА — живой неровный фронт тепла на ударах кульминации
 *   (заменяет CSS-вспышку через setWaveImpl).
 * Право на отказ: слой самоотключается при низком FPS; без него сайт
 * полноценен (CSS-волны возвращаются автоматически).
 * Реализация — чистый WebGL без библиотек: один квад и один шейдер;
 * тащить Three.js ради этого — нарушение мобильного бюджета DL 15.3.
 */

const FRAG = `
precision mediump float;
uniform vec2 u_res;
uniform float u_t;
uniform vec3 u_base;
uniform float u_wave;      // прогресс фронта 0..1; >=2.0 — фронта нет
uniform vec3 u_waveColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 asp = vec2(u_res.x / u_res.y, 1.0);

  // ВОЗДУХ: медленное дыхание тона, амплитуда ниже порога осознания
  float breath = noise(uv * 1.6 + vec2(u_t * 0.018, u_t * 0.011));
  vec3 col = u_base * (1.0 + (breath - 0.5) * 0.02);

  // ВОЛНА: неровный тёплый фронт от центра
  if (u_wave < 2.0) {
    vec2 c = (uv - 0.5) * asp;
    float ang = atan(c.y, c.x);
    float wob = noise(vec2(ang * 1.4 + 3.0, u_t * 0.35)) * 0.14;
    float front = u_wave * 1.35;
    float d = length(c);
    float band = smoothstep(front - 0.28, front - 0.05, d + wob) *
                 (1.0 - smoothstep(front - 0.02, front + 0.06, d + wob));
    float fade = 1.0 - u_wave; // фронт остывает к краю
    col = mix(col, u_waveColor, band * 0.4 * fade);
  }

  gl_FragColor = vec4(col, 1.0);
}
`;

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

function parseColor(css: string): [number, number, number] {
  const m = css.match(/(\d+(?:\.\d+)?)/g);
  if (!m || m.length < 3) return [0.95, 0.94, 0.92];
  return [Number(m[0]) / 255, Number(m[1]) / 255, Number(m[2]) / 255];
}

export function initAir(): void {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText =
    'position:fixed;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none;';
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
  if (!gl) {
    dbg('webgl', 'отказ: контекст недоступен — остаёмся на CSS');
    return;
  }

  const compile = (type: number, src: string): WebGLShader | null => {
    const sh = gl.createShader(type);
    if (!sh) return null;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      dbg('webgl', 'shader error:', gl.getShaderInfoLog(sh));
      return null;
    }
    return sh;
  };

  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  const prog = gl.createProgram();
  if (!vs || !fs || !prog) return;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    dbg('webgl', 'link error');
    return;
  }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW,
  );
  const loc = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, 'u_res');
  const uT = gl.getUniformLocation(prog, 'u_t');
  const uBase = gl.getUniformLocation(prog, 'u_base');
  const uWave = gl.getUniformLocation(prog, 'u_wave');
  const uWaveColor = gl.getUniformLocation(prog, 'u_waveColor');

  const resize = (): void => {
    const dpr = Math.min(devicePixelRatio, 1.5); // фону не нужен retina
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  resize();
  addEventListener('resize', resize);

  document.body.prepend(canvas);

  let waveStart = -1;
  const WAVE_DUR = 900; // мс — фронт удара

  setWaveImpl((n) => {
    waveStart = performance.now();
    dbg('webgl', `wave ${n} (живой фронт)`);
  });

  // Токен КРИК #ff5a1e (tokens.css) в linear-ish sRGB долях
  const screamColor: [number, number, number] = [1.0, 0.353, 0.118];

  // Самоконтроль FPS: если слой стоит плавности — он вырезается (DL 15.3)
  let frames = 0;
  let fpsWindowStart = performance.now();
  let alive = true;

  const destroy = (reason: string): void => {
    alive = false;
    canvas.remove();
    resetWaveImpl(); // волны возвращаются к CSS-вспышке
    dbg('webgl', 'слой отключён:', reason);
  };

  const t0 = performance.now();
  const frame = (): void => {
    if (!alive) return;
    if (!document.hidden) {
      const now = performance.now();
      const t = (now - t0) / 1000;

      // фон читаем каждый кадр — переходы состояний подхватываются сами
      const base = parseColor(getComputedStyle(document.body).backgroundColor);

      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uT, t);
      gl.uniform3f(uBase, base[0], base[1], base[2]);
      const wp = waveStart < 0 ? 2.0 : Math.min((now - waveStart) / WAVE_DUR, 2.0);
      gl.uniform1f(uWave, wp);
      gl.uniform3f(uWaveColor, screamColor[0], screamColor[1], screamColor[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      frames++;
      if (now - fpsWindowStart > 2000) {
        const fps = (frames * 1000) / (now - fpsWindowStart);
        if (fps < 40) {
          destroy(`fps=${fps.toFixed(0)}`);
          return;
        }
        frames = 0;
        fpsWindowStart = now;
      }
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  dbg('webgl', 'воздух включён');
}
