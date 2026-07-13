/**
 * Мост пульса зерна: лёгкий модуль без three — статический импорт
 * из сцен не утаскивает WebGL-чанк в главный бандл.
 * Реализацию подставляет atmosphere.ts при инициализации.
 */

let impl: ((amt: number, dur: number) => void) | null = null;

export function boostGrain(amt: number, dur: number): void {
  impl?.(amt, dur);
}

export function setGrainImpl(fn: (amt: number, dur: number) => void): void {
  impl = fn;
}
