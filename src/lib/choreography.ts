import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { dbg } from './debug';
import { advanceState } from './state';
import { splitText } from './split';

/**
 * Хореография v2 (REDESIGN-NOTES): моушн — часть зрелища.
 * Построчные/посимвольные реверлы с масками, заметные входы блоков.
 * Pinned-сцены (0-1, 2, 5) ставятся собственными таймлайнами в scenes/*.
 */

export const prefersReducedMotion = (): boolean =>
  matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Сцены с генерик-реверлами (pinned-сцены исключены — у них свои таймлайны) */
const REVEAL_SCENES = new Set(['3', '4', '6', '7', '8', '9']);

function blocksOf(scene: HTMLElement): HTMLElement[] {
  const out: HTMLElement[] = [];
  for (const child of Array.from(scene.children) as HTMLElement[]) {
    if (child.classList.contains('spread')) {
      out.push(...(Array.from(child.children) as HTMLElement[]));
    } else {
      out.push(child);
    }
  }
  return out;
}

/** Переходы состояния страницы — работают и без GSAP (reduce-motion: катом). */
export function initStateTriggers(): void {
  const turn = document.querySelectorAll<HTMLElement>('.s1-step')[2];
  if (turn) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          // Поворот исповеди: рассвет — night → day (AD, сцена 1)
          advanceState('day');
          turn.querySelector('.s1-drop')?.classList.add('is-lit');
          dbg('scroll', 'confession turn: dawn');
          io.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(turn);
  }
}

/** Страховка рассвета: прыжок мимо pin-исповеди (якорь хедера, быстрый
 *  скролл) обязан зажечь день — IO на сцену 2, идемпотентно. */
export function initDawnGuard(): void {
  const scene2 = document.getElementById('scene-2');
  if (!scene2) return;
  const io = new IntersectionObserver(
    (es) => {
      if (es.some((e) => e.isIntersecting)) {
        advanceState('day');
        dbg('state', 'dawn guard: day (сцена 2 видима)');
        io.disconnect();
      }
    },
    { threshold: 0.05 },
  );
  io.observe(scene2);
}

/** Посимвольный подъём дисплейного заголовка. */
export function titleReveal(el: HTMLElement, trigger?: HTMLElement): void {
  const chars = splitText(el, 'chars');
  if (chars.length === 0) return;
  gsap.from(chars, {
    yPercent: 110,
    rotate: 4,
    duration: 0.7,
    ease: 'power3.out',
    stagger: 0.022,
    scrollTrigger: {
      trigger: trigger ?? el,
      start: 'top 82%',
      once: true,
      onEnter: () => dbg('scroll', 'title reveal', el.className),
    },
  });
}

/** Заметные реверлы блоков нефиксированных сцен. */
export function initReveals(): void {
  gsap.registerPlugin(ScrollTrigger);

  document.querySelectorAll<HTMLElement>('.scene').forEach((scene) => {
    const id = scene.dataset.scene ?? '';
    if (!REVEAL_SCENES.has(id)) return;

    for (const block of blocksOf(scene)) {
      if (block.classList.contains('t-title')) continue; // титры — посимвольно
      gsap.from(block, {
        autoAlpha: 0,
        y: 56,
        clipPath: 'inset(0% 0% 32% 0%)',
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: block,
          start: 'top 86%',
          once: true,
          onEnter: () => dbg('scroll', `reveal scene=${id}`, block.className),
        },
      });
    }

    scene.querySelectorAll<HTMLElement>('.t-title').forEach((t) => titleReveal(t));
  });

  dbg('scroll', 'reveals initialized');
}
