import {
  LinearFilter,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  TextureLoader,
} from 'three';
import { gsap } from 'gsap';
import { dbg } from '../debug';
import { getStage, onStageDestroy } from './atmosphere';
import { scrollVelocity } from '../motion';
import { prefersReducedMotion } from '../choreography';

/**
 * Дисторшн-планы фотографий (REDESIGN-NOTES): img с data-distort
 * рендерятся Three.js-планами в сцене атмосферы — волна по velocity
 * скролла + RGB-shift на hover. В покое фото честное (лица
 * неприкосновенны — искажение живёт только в движении).
 * Отключено: тач, reduce-motion, мёртвая атмосфера. DOM-img остаётся
 * источником правды (a11y/фолбэк) и возвращается при отказе слоя.
 */

const FRAG = `
precision highp float;
uniform sampler2D uMap;
uniform float uVel;   // нормированная скорость скролла
uniform float uHover; // 0..1
uniform float uTime;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  // волна по вертикали кадра, амплитуда — от скорости скролла
  float w = sin(uv.y * 7.0 + uTime * 2.2) * 0.012 * uVel;
  uv.x += w;
  // RGB-shift: скорость + hover
  float shift = 0.006 * uVel + 0.008 * uHover;
  vec4 c = texture2D(uMap, uv);
  float r = texture2D(uMap, uv + vec2(shift, 0.0)).r;
  float b = texture2D(uMap, uv - vec2(shift, 0.0)).b;
  gl_FragColor = vec4(r, c.g, b, c.a); // alpha сохраняем: PNG-фигуры прозрачны
}
`;

const VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

type Plane = {
  img: HTMLImageElement;
  mesh: Mesh<PlaneGeometry, ShaderMaterial>;
  hover: { value: number };
};

export function initPhotoPlanes(): void {
  const stage = getStage();
  if (!stage) {
    dbg('webgl', 'photos: атмосферы нет — DOM-фото остаются');
    return;
  }
  if (prefersReducedMotion() || matchMedia('(hover: none)').matches) {
    dbg('webgl', 'photos: тач/reduce-motion — дисторшн отключён');
    return;
  }

  const imgs = document.querySelectorAll<HTMLImageElement>('img[data-distort]');
  const planes: Plane[] = [];
  const vel = { value: 0 };

  const loader = new TextureLoader();

  const buildPlane = (img: HTMLImageElement): void => {
    const tex = loader.load(img.currentSrc || img.src, () => {
      // прячем DOM-фото только когда текстура реально готова
      img.style.visibility = 'hidden';
      dbg('webgl', 'photo texture ready:', (img.currentSrc || img.src).split('/').pop());
    });
    // ShaderMaterial пишет gl_FragColor без color-space конверсии:
    // текстуру оставляем «сырой» (NoColorSpace), иначе кадр темнеет
    tex.minFilter = LinearFilter;
    tex.generateMipmaps = false;

    const hover = { value: 0 };
    const mesh = new Mesh(
      new PlaneGeometry(1, 1),
      new ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        uniforms: {
          uMap: { value: tex },
          uVel: { value: 0 },
          uHover: { value: 0 },
          uTime: { value: 0 },
        },
      }),
    );
    stage.scene.add(mesh);
    planes.push({ img, mesh, hover });

    img.addEventListener('mouseenter', () =>
      gsap.to(hover, { value: 1, duration: 0.4 }),
    );
    img.addEventListener('mouseleave', () =>
      gsap.to(hover, { value: 0, duration: 0.6 }),
    );
    dbg('webgl', 'photo plane:', img.src.split('/').pop());
  };

  imgs.forEach((img) => {
    if (img.complete && img.naturalWidth > 0) buildPlane(img);
    else img.addEventListener('load', () => buildPlane(img), { once: true });
  });

  stage.onFrame((dt) => {
    // velocity → 0..1 c плавным спадом
    const target = Math.min(Math.abs(scrollVelocity()) / 40, 1);
    vel.value += (target - vel.value) * Math.min(dt * 6, 1);

    for (const p of planes) {
      const r = p.img.getBoundingClientRect();
      if (r.bottom < -80 || r.top > innerHeight + 80) {
        p.mesh.visible = false;
        continue;
      }
      p.mesh.visible = true;
      p.mesh.position.set(
        r.left + r.width / 2 - innerWidth / 2,
        -(r.top + r.height / 2 - innerHeight / 2),
        1,
      );
      p.mesh.scale.set(r.width, r.height, 1);
      const u = p.mesh.material.uniforms;
      u.uVel.value = vel.value;
      u.uHover.value = p.hover.value;
      u.uTime.value += dt;
    }
  });

  // при смерти атмосферы фото возвращаются в DOM
  onStageDestroy(() => {
    planes.forEach((p) => {
      p.img.style.visibility = '';
    });
    dbg('webgl', 'photos: планы сняты, DOM-фото возвращены');
  });
}
