import { gsap } from 'gsap';
import { dbg } from './debug';
import { scrollVelocity } from './motion';
import { prefersReducedMotion } from './choreography';

/**
 * Бегущая строка v2: бесконечный трек, скорость дышит от velocity
 * скролла (в разгоне — data-boost усиливает разгон ленты).
 * Reduce-motion: статичная строка без клона и тикера.
 */

export function initMarquees(): void {
  document.querySelectorAll<HTMLElement>('.marquee').forEach((m) => {
    const track = m.querySelector<HTMLElement>('.marquee-track');
    if (!track) return;

    if (prefersReducedMotion()) return; // статичная строка

    const clone = track.cloneNode(true) as HTMLElement;
    clone.setAttribute('aria-hidden', 'true');
    m.append(clone);

    const base = parseFloat(m.dataset.speed ?? '60'); // px/s
    const boostK = parseFloat(m.dataset.boost ?? '1');
    let x = 0;

    gsap.ticker.add((_t, deltaMs) => {
      const boost = 1 + Math.min(Math.abs(scrollVelocity()) / 20, 4) * boostK;
      x -= (base * boost * deltaMs) / 1000;
      const w = track.offsetWidth;
      if (w > 0 && -x >= w) x += w;
      track.style.transform = `translate3d(${x}px,0,0)`;
      clone.style.transform = `translate3d(${x}px,0,0)`;
    });

    dbg('scroll', 'marquee started', { base, boostK });
  });
}
