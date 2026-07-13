import { gsap } from 'gsap';
import { dbg } from '../debug';

/**
 * Сцены 6–9 v2: стикеры влетают с overshoot, кнопка-дверь магнитная.
 */

export function initFinale(): void {
  // Стикеры выдоха и финала: живой влёт с перекрутом
  document.querySelectorAll<HTMLElement>('.sticker, .print').forEach((el) => {
    const scene = el.closest('.scene');
    const sceneId = (scene as HTMLElement | null)?.dataset.scene ?? '';
    if (!['6', '7', '8'].includes(sceneId)) return;
    gsap.from(el, {
      scale: 0.55,
      rotation: (Math.random() > 0.5 ? 1 : -1) * 10,
      autoAlpha: 0,
      duration: 0.7,
      ease: 'back.out(1.8)',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });

  // Magnetic-кнопка (только точный указатель)
  const btn = document.querySelector<HTMLElement>('.btn-door');
  if (btn && matchMedia('(hover: hover)').matches) {
    const strength = 0.32;
    const reset = (): void => {
      gsap.to(btn, { x: 0, y: 0, scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    };
    const zone = btn.parentElement ?? btn;
    zone.addEventListener('mousemove', (e) => {
      const r = btn.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const dist = Math.hypot(dx, dy);
      if (dist < 220) {
        gsap.to(btn, {
          x: dx * strength,
          y: dy * strength,
          scale: 1.04,
          duration: 0.3,
          ease: 'power2.out',
        });
      } else {
        reset();
      }
    });
    zone.addEventListener('mouseleave', reset);
    dbg('scroll', 'magnetic button ready');
  }
}
