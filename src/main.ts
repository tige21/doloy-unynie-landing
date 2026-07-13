import '@fontsource/golos-text/cyrillic-400.css';
import '@fontsource/golos-text/cyrillic-500.css';
import '@fontsource/golos-text/cyrillic-600.css';
import '@fontsource/golos-text/400.css';
import '@fontsource/golos-text/500.css';
import '@fontsource/golos-text/600.css';
import '@fontsource-variable/unbounded/index.css';
import './styles/tokens.css';
import './styles/typography.css';
import './styles/base.css';
import { dbg, debugEnabled } from './lib/debug';

dbg('state', 'init', {
  state: document.documentElement.dataset.state,
  viewport: `${innerWidth}x${innerHeight}`,
});

/** Debug-наблюдение входа/выхода сцен — работает только с ?debug=1. */
if (debugEnabled) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const id = (e.target as HTMLElement).dataset.scene;
        dbg('scene', e.isIntersecting ? 'enter' : 'leave', id);
      }
    },
    { threshold: 0.25 },
  );
  document.querySelectorAll<HTMLElement>('.scene').forEach((s) => io.observe(s));
}
