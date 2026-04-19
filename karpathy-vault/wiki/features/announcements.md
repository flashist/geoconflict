# Announcements

**Status**: active
**Source files**: `ai-agents/knowledge-base/announcements-system-guide.md`, `src/client/Announcements.ts`, `src/client/components/NewsButton.ts`, `src/client/NewsModal.ts`, `resources/announcements.json`

## Summary

An in-game announcements bell on the start screen gives Geoconflict a lightweight communication channel for player-facing updates. Players see a compact bell with an unread badge when there is something new, and tapping it opens a popup with the latest announcements in reverse chronological order.

The feature is intentionally low-ops: there is no backend or admin UI. Announcement content lives in a repository JSON file and ships with the client build. This makes the system suitable for infrequent, high-signal product messages such as upcoming features, recently shipped improvements, and support-related updates.

## Implementation

`resources/announcements.json` is the source of truth. Entries are stored newest-first and include a stable `id`, display `date`, optional `tag`, and localized `title` / `body` maps. `src/client/Announcements.ts` normalizes the raw JSON, enforces `title.en` / `body.en` as required fields, resolves the current language at runtime, and falls back per field to English when a localization is missing.

`src/client/components/NewsButton.ts` renders the start-screen bell, checks unread state from `localStorage["geoconflict.announcements.lastSeenId"]`, and fires `UI:Tap:AnnouncementsBell` before opening the popup. `src/client/NewsModal.ts` renders the popup, marks the newest announcement as read on open, dispatches `announcements-state-changed` so the bell refreshes immediately, and logs `Announcements:Opened`.

Mount points live in `src/client/index.html` and `src/client/yandex-games_iframe.html` under `#start-screen-announcements-button`. `src/client/Main.ts` hides that container when the match-start flow begins so the bell is only visible on the start screen. The unread indicator is a simple orange dot styled in `src/client/styles.css`.

## Intent → Execution Flow

There is no core-game intent/execution path for this feature. It is client UI only:

1. Player sees the bell on the start screen.
2. `NewsButton` compares the newest announcement ID against the last-seen ID stored in localStorage.
3. If the player taps the bell, `UI:Tap:AnnouncementsBell` is fired.
4. `NewsModal.open()` stores the latest ID as read, emits `announcements-state-changed`, logs `Announcements:Opened`, and opens the modal.
5. The modal renders localized announcement text for the player’s current language, with English fallback.

## Gotchas / Known Issues

- Announcements require a client deploy because the JSON is bundled into the JavaScript build; editing the file alone does not publish new content.
- Unread state is ID-based, not text-based. Updating wording inside an existing entry does not create a new unread badge; only a new top entry with a new `id` does.
- All content localizations currently live in one JSON file. This is acceptable now because only a short recent list of entries is kept, but it may become unwieldy if many languages are added later.
- The current system is global-only. Player-specific messages are planned separately in `ai-agents/tasks/backlog/8d-b-task-personal-inbox.md`.

## Related

- [[systems/analytics]] — bell tap and popup open analytics events
- [[decisions/sprint-2]] — Sprint where announcements were pulled forward and shipped
- [[decisions/sprint-4]] — Sprint planning context showing 8d-A was no longer future scope

