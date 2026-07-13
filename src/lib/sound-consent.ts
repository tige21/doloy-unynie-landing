import { dbg } from './debug';

/**
 * Согласие на звук — единственное звуковое решение фильма (AD 5.2–5.3).
 * Спрашивается один раз (сцена 4½), живёт до конца сеанса.
 * Кульминация читает состояние в момент воспроизведения.
 */

const KEY = 'du-sound-consent';

export function hasSoundConsent(): boolean {
  return sessionStorage.getItem(KEY) === '1';
}

export function initSoundConsent(): void {
  const btn = document.getElementById('sound-consent');
  if (!(btn instanceof HTMLButtonElement)) return;

  const apply = (on: boolean): void => {
    btn.setAttribute('aria-pressed', String(on));
    dbg('climax', 'sound consent', on);
  };

  apply(hasSoundConsent());

  btn.addEventListener('click', () => {
    const next = !hasSoundConsent();
    if (next) sessionStorage.setItem(KEY, '1');
    else sessionStorage.removeItem(KEY);
    apply(next);
  });
}
