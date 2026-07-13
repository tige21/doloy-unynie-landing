import { dbg } from './debug';
import { hasSoundConsent } from './sound-consent';
import { advanceState } from './state';
import { prefersReducedMotion } from './choreography';

/**
 * Кульминация (AD раздел 6, посекундная партитура):
 *   3.4с — ПИК I: «ДОЛОЙ» жёстким катом + волна;
 *   4.7с — ПИК II: «УНЫНИЕ» + вторая волна = необратимое состояние after;
 *   5.0с+ — спад: слова мягко отпускают масштаб.
 * Волны здесь — CSS-fallback (быстрый тёплый фронт); живой WebGL-фронт
 * подключается слоем в webgl/wave.ts и заменяет вспышку.
 * Беззвучная и статичная постановки полноценны (AD: беззвучная версия —
 * не деградация).
 */

const STRIKE_1 = 3.4;
const STRIKE_2 = 4.7;
const RELEASE = 5.0;

type WaveFn = (n: 1 | 2) => void;

/** CSS-вспышка волны; WebGL-слой может подменить через setWaveImpl. */
let waveImpl: WaveFn = (n) => {
  const el = document.createElement('div');
  el.className = 'strike-wave';
  el.setAttribute('aria-hidden', 'true');
  document.body.append(el);
  requestAnimationFrame(() => el.classList.add('is-running'));
  el.addEventListener('animationend', () => el.remove());
  dbg('climax', `wave ${n} (css fallback)`);
};

export function setWaveImpl(fn: WaveFn): void {
  waveImpl = fn;
}

function strike(n: 1 | 2): void {
  const word = document.querySelector<HTMLElement>(`.s5-word[data-strike='${n}']`);
  word?.classList.add('is-struck'); // жёсткий кат — без easing (бюджет резкости)
  waveImpl(n);
  if (n === 2) advanceState('after'); // точка невозврата
  dbg('climax', `strike ${n}`);
}

function release(): void {
  document.querySelectorAll('.s5-word').forEach((w) => w.classList.add('is-released'));
  dbg('climax', 'release');
}

/** Статичная постановка: постер + оба слова + after (reduce-motion, отказ видео). */
function staticClimax(reason: string): void {
  document.querySelectorAll('.s5-word').forEach((w) => w.classList.add('is-struck'));
  advanceState('after');
  dbg('climax', 'static staging:', reason);
}

export function initClimax(): void {
  const video = document.getElementById('climax-video');
  const scene = document.getElementById('scene-5');
  if (!(video instanceof HTMLVideoElement) || !scene) return;

  if (prefersReducedMotion()) {
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          staticClimax('prefers-reduced-motion');
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(scene);
    return;
  }

  let played = false;
  const struck = new Set<number>();

  const tick = (t: number): void => {
    if (t >= STRIKE_1 && !struck.has(1)) {
      struck.add(1);
      strike(1);
    }
    if (t >= STRIKE_2 && !struck.has(2)) {
      struck.add(2);
      strike(2);
    }
    if (t >= RELEASE && !struck.has(3)) {
      struck.add(3);
      release();
    }
  };

  const watch = (): void => {
    // requestVideoFrameCallback — покадровая точность; fallback — rAF-петля
    const rvfc = (
      video as HTMLVideoElement & {
        requestVideoFrameCallback?: (cb: (now: number, meta: { mediaTime: number }) => void) => void;
      }
    ).requestVideoFrameCallback?.bind(video);

    if (rvfc) {
      const onFrame = (_now: number, meta: { mediaTime: number }): void => {
        tick(meta.mediaTime);
        if (!video.ended) rvfc(onFrame);
      };
      rvfc(onFrame);
      dbg('climax', 'sync: requestVideoFrameCallback');
    } else {
      const loop = (): void => {
        tick(video.currentTime);
        if (!video.ended && !video.paused) requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
      dbg('climax', 'sync: rAF fallback');
    }
  };

  const start = async (): Promise<void> => {
    if (played) return;
    played = true;
    video.muted = !hasSoundConsent();
    dbg('climax', 'start', { sound: !video.muted });
    try {
      await video.play();
    } catch (err) {
      if (!video.muted) {
        // автоплей со звуком заблокирован браузером — честно пробуем немую версию
        video.muted = true;
        try {
          await video.play();
          dbg('climax', 'autoplay-with-sound blocked, playing muted');
        } catch {
          staticClimax('video.play() rejected');
          return;
        }
      } else {
        staticClimax('video.play() rejected');
        return;
      }
    }
    watch();
  };

  video.addEventListener('error', () => staticClimax('video error'), { once: true });

  const io = new IntersectionObserver(
    (es) => {
      if (es.some((e) => e.isIntersecting)) {
        void start();
        io.disconnect();
      }
    },
    { threshold: 0.55 },
  );
  io.observe(scene);

  // Страховка пролистывателя: кульминация настигает на любой скорости —
  // вход в сцену 6 гарантирует état after и собранную фразу
  const after = document.getElementById('scene-6');
  if (after) {
    const io6 = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          if (document.documentElement.dataset.state !== 'after') {
            staticClimax('skipped past climax');
          }
          io6.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    io6.observe(after);
  }
}

/** Эхо (сцена 8): цикл «2.3с крика → 2с стоп-кадра (кулаки) → повтор» (Ж12). */
export function initEchoCycle(): void {
  const video = document.getElementById('echo-video');
  if (!(video instanceof HTMLVideoElement)) return;
  if (prefersReducedMotion()) return; // остаётся постер — полноценная статика

  const STOP_FRAME = 0.4; // кулаки вверху
  const PAUSE_MS = 2000;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let active = false;

  const cycle = (): void => {
    if (!active) return;
    video.currentTime = 0;
    void video.play().catch(() => dbg('media', 'echo play rejected'));
  };

  video.addEventListener('ended', () => {
    video.currentTime = STOP_FRAME;
    timer = setTimeout(cycle, PAUSE_MS);
  });

  const io = new IntersectionObserver(
    (es) => {
      for (const e of es) {
        active = e.isIntersecting;
        if (active) {
          dbg('media', 'echo cycle: start');
          cycle();
        } else {
          clearTimeout(timer);
          video.pause();
        }
      }
    },
    { threshold: 0.35 },
  );
  io.observe(video);
}

/** Поп-камертон (сцена 6): чистый луп, живёт пока видим (Ж13). */
export function initPopLoop(): void {
  const video = document.getElementById('pop-video');
  if (!(video instanceof HTMLVideoElement)) return;
  if (prefersReducedMotion()) return;

  const io = new IntersectionObserver(
    (es) => {
      for (const e of es) {
        if (e.isIntersecting) {
          void video.play().catch(() => dbg('media', 'pop play rejected'));
        } else {
          video.pause();
        }
      }
    },
    { threshold: 0.25 },
  );
  io.observe(video);
}
