import './styles/fonts.css';
import './styles/tokens.css';
import './styles/typography.css';
import './styles/base.css';
import './styles/header.css';
import './styles/scenes/scene0.css';
import './styles/scenes/scene1.css';
import './styles/scenes/scene2.css';
import './styles/scenes/scene3.css';
import './styles/scenes/scene4.css';
import './styles/scenes/scene5.css';
import './styles/scenes/scene6.css';
import './styles/scenes/scene7.css';
import './styles/scenes/scene8.css';
import { gsap } from 'gsap';
import { dbg, debugEnabled } from './lib/debug';
import { restoreState } from './lib/state';
import {
  initDawnGuard,
  initMobileReveals,
  initReveals,
  initStateTriggers,
  isMobileStaging,
  prefersReducedMotion,
} from './lib/choreography';
import { initMotion } from './lib/motion';

import { initClimax, initEchoCycle, initPopLoop } from './lib/climax';
import { initLoadingOrder } from './lib/degradation';

import { initConfessionPin, initPrologueIntro } from './lib/scenes/prologue';
import { initDoorScene } from './lib/scenes/door';
import { initMarquees } from './lib/marquee';
import { initBuildup } from './lib/scenes/buildup';
import { initScreamGrowth } from './lib/scenes/scream';
import { initFinale } from './lib/scenes/finale';
import { initHeader } from './lib/header';

restoreState();
initMotion();
initHeader();
initDawnGuard();
const mobileStaging = isMobileStaging();
if (prefersReducedMotion()) {
  initStateTriggers(); // статика: рассвет по IO
} else if (mobileStaging) {
  // Мобильная постановка: минимум моушна — контент просто есть и читается.
  // Остаются события фильма: интро пролога, рост крика (короткий пин),
  // удары/волны, рассвет, marquee. Реверлы/пины 1-2/таймкод/параллакс —
  // не создаются (фидбек: «слишком анимированное, пользователь теряется»).
  dbg('scroll', 'staging: mobile — статичный поток, пин только на крике');
  initPrologueIntro();
  initStateTriggers(); // рассвет по IO вместо пин-таймлайна
  initMobileReveals(); // картинки оживают лёгким фейдом, текст статичен
  initMarquees();
  initScreamGrowth(); // ДО initClimax: класс is-pinned переключает старт на ручной
} else {
  dbg('scroll', 'staging: desktop — полная постановка');
  initReveals();
  initPrologueIntro();
  initConfessionPin(); // pinned-исповедь зовёт рассвет из таймлайна
  initDoorScene();
  initMarquees();
  initBuildup();
  initScreamGrowth(); // ДО initClimax: класс is-pinned переключает старт на ручной
  initFinale();

  // Параллакс доминанты процесса: фото «едет» медленнее скролла
  const processImg = document.querySelector('.s3-process img');
  if (processImg) {
    gsap.fromTo(
      processImg,
      { yPercent: -6 },
      {
        yPercent: 6,
        ease: 'none',
        scrollTrigger: { trigger: '.s3-process', scrub: 0.5, start: 'top bottom', end: 'bottom top' },
      },
    );
  }
}
initClimax();
initEchoCycle();
initPopLoop();
initLoadingOrder();

/* WebGL — только при явных признаках «потянет» (DL 15.3: право на отказ).
   Отдельный чанк: при отказе не грузится ни байта. */
type NavigatorHints = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};
const nav = navigator as NavigatorHints;
const webglAllowed =
  !prefersReducedMotion() &&
  !mobileStaging && // мобильная постановка: минимум моушна, CSS-волны полноценны
  !nav.connection?.saveData &&
  (nav.deviceMemory ?? 8) >= 4;

if (webglAllowed) {
  // Отложенная загрузка three-чанка: не конкурирует с первым экраном
  // (TBT/Speed Index), атмосфера догоняет за ~1с после простоя
  const loadWebgl = (): void => {
    import('./lib/webgl/atmosphere')
      .then(async (m) => {
        m.initAtmosphere();
        const photos = await import('./lib/webgl/photos');
        photos.initPhotoPlanes();
      })
      .catch((e) => dbg('webgl', 'chunk load failed (остаёмся на CSS):', e));
  };
  if ('requestIdleCallback' in window) {
    requestIdleCallback(loadWebgl, { timeout: 1500 });
  } else {
    setTimeout(loadWebgl, 400);
  }
} else {
  dbg('webgl', 'отказ по бюджету устройства/настройкам');
}

dbg('state', 'init', {
  state: document.documentElement.dataset.state,
  viewport: `${innerWidth}x${innerHeight}`,
});

/** Debug-наблюдение входа/выхода сцен — работает только с ?debug=1. */
if (debugEnabled) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const id = (e.target as HTMLElement).dataset.scene;
        dbg('scene', e.isIntersecting ? 'enter' : 'leave', id);
      }
    },
    { threshold: 0.25 },
  );
  document.querySelectorAll<HTMLElement>('.scene').forEach((s) => io.observe(s));
}
