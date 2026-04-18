# Geoconflict Announcements Schema

`resources/announcements.json` is the source of truth for the global announcements popup.

## Format

The file must contain a JSON array of objects in newest-first order:

```json
[
  {
    "id": "2026-04-citizenship-coming",
    "date": "2026-04-18",
    "title": "Citizenship is coming to Geoconflict",
    "body": "The next update introduces citizenship for committed players...",
    "tag": "upcoming"
  }
]
```

## Fields

- `id`: required unique string. This is the unread-tracking key stored in `localStorage`.
- `date`: required display date string. Use `YYYY-MM-DD`.
- `title`: required short headline.
- `body`: required plain-text body. Newlines are allowed and render as line breaks.
- `tag`: optional badge. Allowed values: `new`, `upcoming`, `update`.

## Authoring Rules

- Keep entries in reverse chronological order, newest first.
- Add new announcements to the top of the array.
- Do not reuse or edit old `id` values after they ship.
- Announcement content is plain text in V1. Do not use Markdown or HTML.
- Publishing a new announcement requires a client deploy because the JSON is bundled with the app.
