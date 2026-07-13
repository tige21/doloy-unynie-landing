import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { dbg } from '../debug';
import { boostGrain } from '../webgl/atmosphere';

/**
 * Сцены 4–4½ v2 «Разгон»: таймкод листает минуты 15:50→15:59 по
 * прогрессу сцены, кадры влетают жёстче обычных реверлов, у «вдоха»
 * пульсирует зерно атмосферы — напряжение перед криком.
 */

export function initBuildup(): void {
  const scene = document.getElementById('scene-4');
  const timer = document.getElementById('s4-timer');
  if (!scene || !timer) return;

  // Таймкод-счётчик: минуты листаются скроллом
  const counter = { m: 50 };
  gsap.to(counter, {
    m: 59,
    ease: 'none',
    scrollTrigger: {
      trigger: scene,
      start: 'top 70%',
      end: 'bottom 35%',
      scrub: 0.4,
    },
    onUpdate: () => {
      timer.textContent = `15:${Math.round(counter.m)}`;
    },
  });

  // Жёсткие входы кадров разгона (перебивают мягкие реверлы)
  scene.querySelectorAll<HTMLElement>('.s4-frag').forEach((frag, i) => {
    gsap.from(frag, {
      y: 90,
      scale: 0.9,
      autoAlpha: 0,
      duration: 0.5,
      ease: 'power4.out',
      scrollTrigger: { trigger: frag, start: 'top 90%', once: true },
      delay: i * 0.04,
    });
  });

  // Пульс зерна на выходе из разгона — атмосфера задерживает дыхание
  ScrollTrigger.create({
    trigger: scene,
    start: 'bottom 60%',
    once: true,
    onEnter: () => {
      boostGrain(0.055, 2.4);
      dbg('scroll', 'inhale: grain pulse');
    },
  });
}
