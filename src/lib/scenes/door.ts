import { gsap } from 'gsap';
import { dbg } from '../debug';
import { pinScene } from '../motion';

/**
 * Сцена 2 v2 «Дверь открыта»: pinned scrub-зум.
 * Кадр начинается с двоих у двери (крупно), по скроллу «камера
 * отъезжает»: фрагмент растёт и растворяется, за ним — полная толпа,
 * подпись-факт поднимается на градиентной подложке.
 */

export function initDoorScene(): void {
  const scene = document.getElementById('scene-2');
  const first = scene?.querySelector<HTMLElement>('.s2-first');
  const crowd = scene?.querySelector<HTMLElement>('.s2-crowd');
  const caption = scene?.querySelector<HTMLElement>('.s2-crowd-caption');
  const stamp = scene?.querySelector<HTMLElement>('.s2-stamp');
  if (!scene || !first || !crowd || !caption || !stamp) return;

  scene.classList.add('is-pinned');

  gsap.set(crowd, { autoAlpha: 0 });
  gsap.set(crowd.querySelector('img'), { scale: 1.28 });
  gsap.set(caption, { autoAlpha: 0, y: 36 });

  // Калибровка: пин 1.1 → 0.8, зазоры таймлайна встык, hold короче
  pinScene(scene, 0.8, (tl) => {
    tl.fromTo(stamp, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, 0)
      // «пролетаем сквозь» двоих: фрагмент уходит ПОЛНОСТЬЮ до появления
      // толпы — последовательность, а не «двойная экспозиция» (фидбек)
      .to(first, { scale: 2.1, autoAlpha: 0, duration: 1.0, ease: 'power2.in' }, 0.4)
      .to(crowd, { autoAlpha: 1, duration: 0.7 }, 1.4)
      .to(crowd.querySelector('img'), { scale: 1, duration: 1.6, ease: 'power2.out' }, 1.4)
      .to(caption, { autoAlpha: 1, y: 0, duration: 0.8 }, 2.3)
      .to({}, { duration: 0.4 }); // hold на толпе
  });

  dbg('scroll', 'door scene: pinned zoom ready');
}
