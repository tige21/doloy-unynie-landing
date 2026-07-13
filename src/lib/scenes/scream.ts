import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { dbg } from '../debug';
import { pinScene } from '../motion';
import { startClimax } from '../climax';
import { isMobileStaging } from '../choreography';

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

  const words = scene.querySelectorAll<HTMLElement>('.s5-word');

  // Метраж события по постановке (осознанное решение, не глобальное ужатие):
  // десктоп 1.5 — короче 1.9 ради «проскролливаемости», но длиннее 1.1,
  // на котором событие проскакивало; мобилка 1.0 — рост быстрый, дальше
  // видео играет в реальном времени, удары гарантирует watch() + страховка
  // «skipped past climax» на любой скорости свайпа.
  const PIN_LENGTH = isMobileStaging() ? 1.0 : 1.5;
  dbg('climax', '[FIX] scream pin length', PIN_LENGTH);

  const tl = pinScene(scene, PIN_LENGTH, (t) => {
    t.to(video, { scale: 1, duration: 1, ease: 'power2.inOut' }, 0)
      .call(
        () => {
          startClimax?.();
          dbg('climax', 'growth complete → playback');
        },
        undefined,
        1.02,
      )
      .to({}, { duration: 1.6 }); // держим кадр: крик играет в реальном времени
  });

  // Слова paper-цвета невидимы на светлой странице при неполном кадре —
  // «призраки» (фидбек Img 3). На прогрессе <55% слова уводятся со сцены.
  const st = tl.scrollTrigger;
  if (st) {
    let offstage: boolean | null = null;
    const applyStage = (): void => {
      const off = st.progress < 0.55;
      if (off === offstage) return;
      offstage = off;
      words.forEach((w) => w.classList.toggle('is-offstage', off));
      dbg('climax', off ? 'words offstage' : 'words onstage');
    };
    applyStage();
    st.animation?.eventCallback('onUpdate', applyStage);
    ScrollTrigger.create({
      trigger: scene,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: applyStage,
    });
  }

  dbg('scroll', 'scream growth ready');
}
