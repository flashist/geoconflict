# Geoconflict Announcements Schema

`resources/announcements.json` is the source of truth for the global announcements popup.

## Format

The file must contain a JSON array of objects in newest-first order:

```json
[
  {
    "id": "2026-04-citizenship-coming",
    "date": "2026-04-18",
    "title": {
      "en": "Citizenship is coming to Geoconflict",
      "ru": "Гражданство скоро появится в Geoconflict"
    },
    "body": {
      "en": "The next update introduces citizenship for committed players...",
      "ru": "Следующее обновление добавит гражданство для постоянных игроков..."
    },
    "tag": "upcoming"
  }
]
```

## Fields

- `id`: required unique string. This is the unread-tracking key stored in `localStorage`.
- `date`: required display date string. Use `YYYY-MM-DD`.
- `title`: required localized map. `title.en` is required; other locale keys such as `ru` are optional.
- `body`: required localized map. `body.en` is required; other locale keys such as `ru` are optional. Newlines are allowed and render as line breaks.
- `tag`: optional badge. Allowed values: `new`, `upcoming`, `update`.

## Authoring Rules

- Keep entries in reverse chronological order, newest first.
- Add new announcements to the top of the array.
- Do not reuse or edit old `id` values after they ship.
- English source text is mandatory for every entry because the client falls back to `en` when the current locale is missing.
- Localized fields fall back per field, not per entry. If `title.ru` exists but `body.ru` does not, the Russian title renders with the English body.
- Announcement content is plain text in V1. Do not use Markdown or HTML.
- Additional locales can be added later by adding more keys inside `title` and `body`.
- Publishing a new announcement requires a client deploy because the JSON is bundled with the app.
