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

export function initPrologue(): void {
  // --- Сцена 0: секвенция загрузки ---
  const bg = document.querySelector<HTMLElement>('.s0-bg');
  const whisper = document.querySelector<HTMLElement>('.s0-whisper');
  const line = document.querySelector<HTMLElement>('.s0-line');

  if (bg && whisper && line) {
    // сплитим каждую строку отдельно — <br> между .s0-row сохраняются
    const chars = Array.from(line.querySelectorAll<HTMLElement>('.s0-row')).flatMap(
      (row) => splitText(row, 'chars'),
    );
    const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
    intro
      .from(bg, { autoAlpha: 0, y: 60, duration: 1.6, ease: 'power2.out' })
      .from(whisper, { autoAlpha: 0, duration: 0.9 }, 0.4)
      .from(
        chars,
        { yPercent: 115, rotate: 3, duration: 0.8, stagger: 0.02 },
        0.55,
      );
    dbg('scroll', 'prologue: load sequence started');
  }

  // --- Сцена 1: pinned-исповедь ---
  const scene = document.getElementById('scene-1');
  const steps = Array.from(document.querySelectorAll<HTMLElement>('.s1-step'));
  const drop = document.querySelector<HTMLElement>('.s1-drop');
  if (!scene || steps.length !== 3) return;

  scene.classList.add('is-pinned'); // absolute-слои только в моушн-режиме
  gsap.set(steps[0], { autoAlpha: 1, y: 0 });
  gsap.set([steps[1], steps[2]], { autoAlpha: 0, y: 60 });

  pinScene(scene, 1.4, (tl) => {
    tl.to(steps[0], { autoAlpha: 0, y: -60, duration: 1 }, 1)
      .fromTo(
        steps[1],
        { autoAlpha: 0, y: 60 },
        { autoAlpha: 1, y: 0, duration: 1 },
        1.6,
      )
      .to(steps[1], { autoAlpha: 0, y: -60, duration: 1 }, 3.4)
      .fromTo(
        steps[2],
        { autoAlpha: 0, y: 60 },
        { autoAlpha: 1, y: 0, duration: 1 },
        4,
      )
      .call(
        () => {
          advanceState('day'); // рассвет — из таймлайна (идемпотентно)
          drop?.classList.add('is-lit');
          dbg('scroll', 'confession pin: dawn');
        },
        undefined,
        4.9,
      )
      .to({}, { duration: 1.6 }); // hold: дать рассвету прозвучать
  });
}
