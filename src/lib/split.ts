import { dbg } from './debug';
import { prefersReducedMotion } from './choreography';

/**
 * Самописный сплиттер текста для кинетической типографики.
 * A11y: исходный текст уходит в aria-label родителя, спаны — aria-hidden.
 * Reduce-motion: элемент не трогается вовсе.
 */

export type SplitMode = 'chars' | 'words' | 'lines';

export function splitText(el: HTMLElement, mode: SplitMode): HTMLElement[] {
  if (prefersReducedMotion()) return [];

  const text = el.textContent ?? '';
  el.setAttribute('aria-label', text.trim());

  const wrap = (content: string, cls: string): string =>
    `<span class="split-unit ${cls}" aria-hidden="true">${content}</span>`;

  if (mode === 'chars') {
    // буквы группируются в nowrap-слова — иначе браузер рвёт слово посреди
    el.innerHTML = text
      .split(/(\s+)/)
      .map((tok) => {
        if (/^\s+$/.test(tok)) return ' ';
        if (!tok) return '';
        const chars = tok.split('').map((ch) => wrap(ch, 'split-char')).join('');
        return `<span class="split-word-wrap" aria-hidden="true">${chars}</span>`;
      })
      .join('');
  } else {
    // words (и базис для lines): каждый пробельный токен — спан
    el.innerHTML = text
      .split(/(\s+)/)
      .map((tok) => (/^\s+$/.test(tok) ? tok : tok ? wrap(tok, 'split-word') : ''))
      .join('');
  }

  let units = Array.from(el.querySelectorAll<HTMLElement>('.split-unit'));

  if (mode === 'lines') {
    // группировка слов по фактическим строкам (offsetTop)
    const lines = new Map<number, HTMLElement[]>();
    units.forEach((u) => {
      const top = u.offsetTop;
      const arr = lines.get(top) ?? [];
      arr.push(u);
      lines.set(top, arr);
    });
    units = [];
    for (const group of lines.values()) {
      const lineEl = document.createElement('span');
      lineEl.className = 'split-unit split-line';
      lineEl.setAttribute('aria-hidden', 'true');
      group[0].before(lineEl);
      group.forEach((u, i) => {
        lineEl.append(u);
        if (i < group.length - 1) lineEl.append(' ');
      });
      units.push(lineEl);
    }
  }

  dbg('scroll', `split ${mode}: ${units.length} units`, el.className);
  return units;
}
