# Долой уныние — лендинг

Проект лендинга для мероприятия «Долой уныние».

## Ассеты

- `assets/videos/` — 3 видео (загружены 2026-07-13)
- `assets/photos/` — 10 фото со страницы FAQ: https://telegra.ph/FAQ-meropriyatiya-Doloj-unynie-07-11
  (оригиналы хостятся на i.postimg.cc; `faq-05-letnee-raspisanie.png` — летнее расписание)

## Деплой на сервер

Публикация на боевой сервер (`https://doloy-unynie.duckdns.org`, корень `/var/www/doloy-unynie`):

```bash
tools/deploy.sh            # собрать (если Node-проект) и выложить
tools/deploy.sh --dry-run  # показать, что изменится, ничего не трогая
tools/deploy.sh --rollback # откатить к предыдущему бэкапу
```

Скрипт сам делает бэкап текущего сайта, синхронизирует файлы, проверяет nginx и
делает health-check. При ошибке — авто-откат. Собранный сайт ищется в
`source/{dist,build,site,public}/index.html` либо `source/index.html`.
