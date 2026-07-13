import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { dbg } from './debug';
import { prefersReducedMotion } from './choreography';

/**
 * Моушн-инфраструктура v2 (REDESIGN-NOTES): Lenis smooth-scroll +
 * ScrollTrigger по официальному рецепту интеграции. На тач — нативный
 * скролл (syncTouch выключен). Reduce-motion: Lenis не создаётся вовсе.
 */

let lenis: Lenis | null = null;

export function initMotion(): void {
  gsap.registerPlugin(ScrollTrigger);
  if (prefersReducedMotion()) {
    dbg('scroll', 'motion: reduce-motion — Lenis/pin/scrub отключены');
    return;
  }

  // Калибровка (фидбек «плохо проскролливается»): сглаживание короче —
  // суммарный лаг Lenis+scrub упал вдвое, скролл отвечает, а не плывёт
  lenis = new Lenis({
    duration: 0.55,
    smoothWheel: true,
    syncTouch: false, // на таче — нативная инерция
  });

  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => {
    lenis?.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  dbg('scroll', 'motion: lenis + scrolltrigger готовы', { duration: 0.55, scrub: 0.35 });

  // [FIX] контроль плотности: полная высота страницы после раскладки
  requestAnimationFrame(() => {
    dbg(
      'scroll',
      '[FIX] page height',
      document.body.scrollHeight,
      `(${(document.body.scrollHeight / innerHeight).toFixed(1)} экранов)`,
    );
  });
}

export function getLenis(): Lenis | null {
  return lenis;
}

/** Скорость скролла (для marquee и дисторшна). */
export function scrollVelocity(): number {
  return lenis?.velocity ?? 0;
}

/**
 * Pinned-сцена: закрепляет секцию и возвращает scrub-таймлайн длиной
 * lengthVh вьюпортов. Контент сменяется внутри закреплённого экрана —
 * скролл двигает фильм, а не листает пустоты.
 */
export function pinScene(
  section: HTMLElement,
  lengthVh: number,
  build: (tl: gsap.core.Timeline) => void,
): gsap.core.Timeline {
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: `+=${Math.round(lengthVh * 100)}%`,
      pin: true,
      scrub: 0.35,
      anticipatePin: 1,
      onUpdate: (self) => dbg('scroll', `pin ${section.id}`, self.progress.toFixed(2)),
    },
  });
  build(tl);
  return tl;
}
