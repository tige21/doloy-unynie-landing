import { dbg } from './debug';

/**
 * Порядок загрузки по драматургии (DL 19.1) и тихие деградации:
 * — сцены 0–1 рендерятся без единого запроса картинок (в них нет медиа);
 * — фото lazy (native), плейсхолдер — бумага, без скелетонов и блюра;
 * — кульминационное видео начинает буфериться при входе в сцену 3 —
 *   запас в две сцены до крика;
 * — ошибки медиа тихие: пустой кадр с подписью честнее мутного пятна.
 */

export function initLoadingOrder(): void {
  const climax = document.getElementById('climax-video');
  const scene3 = document.getElementById('scene-3');

  if (climax instanceof HTMLVideoElement && scene3) {
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          climax.preload = 'auto';
          dbg('media', 'climax video: preload=auto (вход в сцену 3)');
          io.disconnect();
        }
      },
      { rootMargin: '25%' },
    );
    io.observe(scene3);
  }

  // Тихая регистрация ошибок медиа — без браузерных сообщений пользователю
  document.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
    img.addEventListener(
      'error',
      () => dbg('media', 'img failed (кадр останется бумагой):', img.src),
      { once: true },
    );
  });
}
