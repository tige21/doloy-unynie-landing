/**
 * Verbose-логгер фильма. Активен только с ?debug=1 — в проде no-op.
 * Единая точка логирования для всех модулей (закон плана: логи через debug.ts).
 */
export type DebugTag = 'scene' | 'scroll' | 'state' | 'media' | 'webgl' | 'climax';

const enabled: boolean =
  typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug');

export const debugEnabled = enabled;

export function dbg(tag: DebugTag, ...args: unknown[]): void {
  if (!enabled) return;
  console.debug(`[${tag}]`, ...args);
}
