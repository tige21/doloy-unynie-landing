import { dbg } from './debug';
import { getLenis } from './motion';

/**
 * Навигация хедера v3. Якоря целятся в начало секции (top элемента
 * включает pin-спейсер — попадаем в старт закреплённой сцены).
 */

const HEADER_OFFSET = 56;

export function initHeader(): void {
  document.querySelectorAll<HTMLAnchorElement>('[data-nav]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href') ?? '';
      const target = document.querySelector<HTMLElement>(id);
      if (!target) return;
      e.preventDefault();

      const y = Math.max(
        0,
        target.getBoundingClientRect().top + scrollY - HEADER_OFFSET,
      );
      const lenis = getLenis();
      if (lenis) {
        lenis.scrollTo(y, { duration: 1.2 });
      } else {
        window.scrollTo({ top: y }); // reduce-motion: мгновенно
      }
      dbg('scroll', 'nav →', id, Math.round(y));
    });
  });
  dbg('scroll', 'header nav ready');
}
