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
    // Рекурсивный обход: вложенная разметка (<em class="mk"> и т.п.)
    // сохраняется — сплитятся только текстовые ноды. Буквы группируются
    // в nowrap-слова, чтобы браузер не рвал слово посреди.
    const splitTextNode = (node: Node): void => {
      if (node.nodeType === Node.TEXT_NODE) {
        const t = node.textContent ?? '';
        if (!t.trim()) return;
        const frag = document.createDocumentFragment();
        for (const tok of t.split(/(\s+)/)) {
          if (!tok) continue;
          if (/^\s+$/.test(tok)) {
            frag.append(' ');
            continue;
          }
          const w = document.createElement('span');
          w.className = 'split-word-wrap';
          w.setAttribute('aria-hidden', 'true');
          for (const ch of tok) {
            const c = document.createElement('span');
            c.className = 'split-unit split-char';
            c.setAttribute('aria-hidden', 'true');
            c.textContent = ch;
            w.append(c);
          }
          frag.append(w);
        }
        (node as ChildNode).replaceWith(frag);
      } else if (
        node.nodeType === Node.ELEMENT_NODE &&
        !(node as HTMLElement).classList.contains('split-unit')
      ) {
        Array.from(node.childNodes).forEach(splitTextNode);
      }
    };
    Array.from(el.childNodes).forEach(splitTextNode);
    dbg('scroll', '[FIX] split preserved markup:', el.querySelectorAll('em, strong, a').length, 'elements');
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
