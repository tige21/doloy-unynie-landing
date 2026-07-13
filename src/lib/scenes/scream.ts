import { gsap } from 'gsap';
import { dbg } from '../debug';
import { pinScene } from '../motion';
import { startClimax } from '../climax';

/**
 * Сцена 5 v2: видео крика входит малой вклейкой в центре кадра и
 * растёт до fullscreen по scrub; на полном кадре стартует воспроизведение
 * (вся механика ударов/звука/страховок — climax.ts, здесь только рост).
 * Класс .is-pinned вешается ДО initClimax — тот переключается на ручной старт.
 */

export function initScreamGrowth(): void {
  const scene = document.getElementById('scene-5');
  const video = scene?.querySelector<HTMLElement>('.s5-video');
  if (!scene || !video) return;

  scene.classList.add('is-pinned');

  gsap.set(video, { scale: 0.3 });

  pinScene(scene, 1.1, (tl) => {
    tl.to(video, { scale: 1, duration: 1, ease: 'power2.inOut' }, 0)
      .call(
        () => {
          startClimax?.();
          dbg('climax', 'growth complete → playback');
        },
        undefined,
        1.02,
      )
      .to({}, { duration: 0.9 }); // держим кадр: крик играет в реальном времени
  });

  dbg('scroll', 'scream growth ready');
}
