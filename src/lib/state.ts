import { dbg } from './debug';

/**
 * Три состояния страницы (DL 3.3): morning → day → after.
 * Направление необратимо в рамках сеанса — серость после крика
 * не возвращается никогда (AD, закон 4).
 */

const ORDER = ['morning', 'day', 'after'] as const;
export type PageState = (typeof ORDER)[number];

const AFTER_KEY = 'du-state-after';

export function getState(): PageState {
  return (document.documentElement.dataset.state as PageState) ?? 'morning';
}

export function advanceState(next: PageState): void {
  const cur = getState();
  if (ORDER.indexOf(next) <= ORDER.indexOf(cur)) return; // только вперёд
  document.documentElement.dataset.state = next;
  if (next === 'after') sessionStorage.setItem(AFTER_KEY, '1');
  dbg('state', `${cur} → ${next}`);
}

/** Пришедший по прямой ссылке после крика (шэринг) не видит серого утра
 *  повторно — ритуал в этом сеансе уже совершён (EXPERIENCE-SCRIPT §19.7). */
export function restoreState(): void {
  if (sessionStorage.getItem(AFTER_KEY) === '1') {
    document.documentElement.dataset.state = 'after';
    dbg('state', 'restored: after (сеанс уже прошёл крик)');
  }
}
