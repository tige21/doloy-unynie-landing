import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { dbg } from './debug';
import { advanceState } from './state';

/**
 * Хореография скролла (AD раздел 7):
 * — движение = дыхание: появления в ответ на скролл, ничего автономного;
 * — вес анимаций убывает по фильму (утро тяжёлое → после крика невесомое);
 * — скролл никогда не блокируется (никаких pin/scrub-захватов);
 * — бюджет резкости не тратится: все появления мягкие (удары — в climax.ts).
 */

export const prefersReducedMotion = (): boolean =>
  matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Вес дыхания по сценам: смещение (px) и длительность (с). */
const BREATH: Record<string, { y: number; dur: number }> = {
  '0': { y: 28, dur: 1.6 }, // серое утро — самое тяжёлое движение фильма
  '1': { y: 26, dur: 1.5 },
  '2': { y: 20, dur: 1.0 },
  '3': { y: 18, dur: 0.9 },
  '4': { y: 14, dur: 0.55 }, // разгон — лёгкое и быстрое
  '4b': { y: 10, dur: 1.2 }, // вдох: медленное появление единственной реплики
  '6': { y: 8, dur: 0.5 }, // после крика — невесомость
  '7': { y: 8, dur: 0.5 },
  '8': { y: 8, dur: 0.5 },
  '9': { y: 6, dur: 0.6 },
};

/** Верхнеуровневые блоки сцены (spread раскрывается в детей). */
function blocksOf(scene: HTMLElement): HTMLElement[] {
  const out: HTMLElement[] = [];
  for (const child of Array.from(scene.children) as HTMLElement[]) {
    if (child.classList.contains('spread')) {
      out.push(...(Array.from(child.children) as HTMLElement[]));
    } else {
      out.push(child);
    }
  }
  return out;
}

/** Переходы состояния страницы — работают и без GSAP (reduce-motion: катом). */
export function initStateTriggers(): void {
  const turn = document.querySelectorAll<HTMLElement>('.s1-step')[2];
  if (!turn) return;

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        // Поворот исповеди: рассвет — morning → day (AD, сцена 1)
        advanceState('day');
        turn.querySelector('.s1-drop')?.classList.add('is-lit');
        dbg('scroll', 'confession turn: dawn');
        io.disconnect();
      }
    },
    { threshold: 0.5 },
  );
  io.observe(turn);
}

/** Дыхательные появления. Вызывается только без reduce-motion. */
export function initBreathing(): void {
  gsap.registerPlugin(ScrollTrigger);

  document.querySelectorAll<HTMLElement>('.scene').forEach((scene) => {
    const id = scene.dataset.scene ?? '';
    const conf = BREATH[id];
    if (!conf) return; // сцена 5 дышит по собственной партитуре (climax.ts)

    for (const block of blocksOf(scene)) {
      gsap.from(block, {
        autoAlpha: 0,
        y: conf.y,
        duration: conf.dur,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: block,
          start: 'top 88%',
          once: true, // появление честное и однократное — без «подпрыгиваний»
          onEnter: () => dbg('scroll', `breath scene=${id}`, block.className),
        },
      });
    }
  });

  dbg('scroll', 'breathing initialized');
}
