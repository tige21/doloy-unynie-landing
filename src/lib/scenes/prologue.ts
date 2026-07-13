import { gsap } from 'gsap';
import { dbg } from '../debug';
import { advanceState } from '../state';
import { splitText } from '../split';
import { pinScene } from '../motion';

/**
 * Сцены 0–1 v2: кинематографический пролог.
 * Сцена 0 — load-секвенция: гигантский контур проступает, строка
 * поднимается по буквам. Сцена 1 — PINNED: три мысли исповеди сменяются
 * внутри одного экрана; рассвет night→day зовётся из таймлайна.
 */

/** Сцена 0: интро-секвенция загрузки. Играет во всех постановках,
 *  кроме reduce-motion (мобильная — тоже: это событие фильма). */
export function initPrologueIntro(): void {
  const bg = document.querySelector<HTMLElement>('.s0-bg');
  const line = document.querySelector<HTMLElement>('.s0-line');

  if (bg && line) {
    // Интро ждёт готовности шрифтов: сплит по финальным метрикам,
    // ноль CLS от свопа на герое (замер Lighthouse)
    void document.fonts.ready.then(() => {
      // сплитим каждую строку отдельно — <br> между .s0-row сохраняются
      const chars = Array.from(
        line.querySelectorAll<HTMLElement>('.s0-row'),
      ).flatMap((row) => splitText(row, 'chars'));
      const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
      intro
        // только transform: paint контура не откладывается (LCP ранний)
        .from(bg, { y: 90, duration: 1.6, ease: 'power2.out' })
        .from(
          chars,
          { yPercent: 115, rotate: 3, duration: 0.8, stagger: 0.02 },
          0.35,
        );
      dbg('scroll', 'prologue: load sequence started (fonts ready)');
    });
  }
}

/** Сцена 1: pinned-исповедь — только десктопная постановка.
 *  На мобилке шаги идут потоком (одна мысль на вьюпорт, ES §13),
 *  рассвет зовёт initStateTriggers по IO. */
export function initConfessionPin(): void {
  const scene = document.getElementById('scene-1');
  const steps = Array.from(document.querySelectorAll<HTMLElement>('.s1-step'));
  const drop = document.querySelector<HTMLElement>('.s1-drop');
  if (!scene || steps.length !== 3) return;

  scene.classList.add('is-pinned'); // absolute-слои только в моушн-режиме
  gsap.set(steps[0], { autoAlpha: 1, y: 0 });
  gsap.set([steps[1], steps[2]], { autoAlpha: 0, y: 60 });

  // Калибровка: пин 1.4 → 1.0, паузы между сменами стянуты до 0.4-0.6
  // юнита (время чтения) — каждый тик колёсика даёт видимое движение
  pinScene(scene, 1.0, (tl) => {
    tl.to(steps[0], { autoAlpha: 0, y: -60, duration: 1 }, 0.6)
      .fromTo(
        steps[1],
        { autoAlpha: 0, y: 60 },
        { autoAlpha: 1, y: 0, duration: 1 },
        1.2,
      )
      .to(steps[1], { autoAlpha: 0, y: -60, duration: 1 }, 2.6)
      .fromTo(
        steps[2],
        { autoAlpha: 0, y: 60 },
        { autoAlpha: 1, y: 0, duration: 1 },
        3.2,
      )
      .call(
        () => {
          advanceState('day'); // рассвет — из таймлайна (идемпотентно)
          drop?.classList.add('is-lit');
          dbg('scroll', 'confession pin: dawn');
        },
        undefined,
        4.0,
      )
      .to({}, { duration: 1.0 }); // hold: дать рассвету прозвучать
  });
}
