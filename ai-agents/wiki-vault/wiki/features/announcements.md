# Announcements

**Status**: active
**Source files**: `ai-agents/knowledge-base/announcements-system-guide.md`, `ai-agents/tasks/done/0126-global-announcements/brief.md`, `src/client/Announcements.ts`, `src/client/components/NewsButton.ts`, `src/client/NewsModal.ts`, `resources/announcements.json`

## Summary

An in-game announcements bell on the start screen gives Geoconflict a lightweight communication channel for player-facing updates. Players see a compact bell with an unread badge when there is something new, and tapping it opens a popup with the latest announcements in reverse chronological order.

The feature is intentionally low-ops: there is no backend or admin UI. Announcement content lives in a repository JSON file and ships with the client build. This makes the system suitable for infrequent, high-signal product messages such as upcoming features, recently shipped improvements, and support-related updates.

## Implementation

`resources/announcements.json` is the source of truth. Entries are stored newest-first and include a stable `id`, display `date`, optional `tag`, and localized `title` / `body` maps. `src/client/Announcements.ts` normalizes the raw JSON, enforces `title.en` / `body.en` as required fields, resolves the current language at runtime, and falls back per field to English when a localization is missing.

`src/client/components/NewsButton.ts` renders the start-screen bell, checks unread state from `localStorage["geoconflict.announcements.lastSeenId"]`, and fires `UI:Tap:AnnouncementsBell` before opening the popup. `src/client/NewsModal.ts` renders the popup, marks the newest announcement as read on open, dispatches `announcements-state-changed` so the bell refreshes immediately, logs `Announcements:Opened` on open, and logs `Announcements:Closed` when the modal closes.

Mount points live in `src/client/index.html` and `src/client/yandex-games_iframe.html` under `#start-screen-announcements-button`. `src/client/Main.ts` hides that container when the match-start flow begins so the bell is only visible on the start screen. The unread indicator is a simple orange dot styled in `src/client/styles.css`.

### Personal inbox (task `0012` — built 2026-08-26, NOT launched)

Built on top of this feature rather than beside it: the popup grows a **tab strip** (Global / Personal), rendered **only when the personal inbox is available** — that is, when `GET /v1/messages` succeeded and so the server confirmed the viewer is a citizen. Guests and non-citizens see the popup exactly as before, with no tabs.

- **The server surface lives on the profile service, not the game server**: `GET /v1/messages?yandexPlayerId=` (unauthenticated, client-asserted ID under the ADR-103 trust seam; shares the 60 req/min limiter; **`403 not_citizen`** for non-citizens *and* for missing profiles, gated in SQL; 200 returns `{ messages }` newest first), `PATCH /v1/messages/read` (body `{ yandexPlayerId, ids? }` — an absent `ids` marks all of the caller's own; idempotent), and internal `POST /internal/v1/messages/send`.
- **Sends are either templated or literal.** A system send carries `templateKey` + `templateParams` and is **rendered client-side** from `inbox.templates.<key>`; an admin send carries a literal `title` + `body`. A database check constraint enforces one shape or the other.
- **Storage** is `player_messages` (migration `003_player_messages.sql`), foreign-keyed to `player_profiles` with `ON DELETE CASCADE`. `InboxRepository.ts` is its **only** reader and writer.
- **Both citizenship seams send through it** — `PlayerProfileRepository.afterCitizenshipEarned` and `PaymentsRepository.afterPaidPurchaseGranted` — via an `InboxSender` interface that **contractually never throws**, so a message failure cannot break a grant.
- **The whole path is gated behind `CITIZENSHIP_CARD_ENABLED`**: while the card is unlaunched, the inbox fetch never runs at all.
- **Four analytics events ship with it**, under that same gate: `Inbox:Opened` (a citizen selects the Personal tab — every selection, not just the first), `Inbox:LoadFailed` (network error, 5xx, 5 s timeout, or a body that fails schema validation — **not** a 403, which is the ordinary non-citizen answer, and never for guests or when the profile API is unconfigured), plus the tab taps `UI:Tap:AnnouncementsTabGlobal` and `UI:Tap:AnnouncementsTabPersonal`. See [[systems/analytics]].

## Intent → Execution Flow

There is no core-game intent/execution path for this feature. It is client UI only:

1. Player sees the bell on the start screen.
2. `NewsButton` compares the newest announcement ID against the last-seen ID stored in localStorage.
3. If the player taps the bell, `UI:Tap:AnnouncementsBell` is fired.
4. `NewsModal.open()` stores the latest ID as read, emits `announcements-state-changed`, logs `Announcements:Opened`, and opens the modal.
5. When the modal closes through any standard close path, `Announcements:Closed` is fired.
6. The modal renders localized announcement text for the player’s current language, with English fallback.

## Gotchas / Known Issues

- Announcements require a client deploy because the JSON is bundled into the JavaScript build; editing the file alone does not publish new content.
- Unread state is ID-based, not text-based. Updating wording inside an existing entry does not create a new unread badge; only a new top entry with a new `id` does.
- All content localizations currently live in one JSON file. This is acceptable now because only a short recent list of entries is kept, but it may become unwieldy if many languages are added later.
- **The bell is no longer global-only, but the personal half is not live.** Task `0012` (personal inbox) was **built and reviewed 2026-08-26** and adds a **Personal tab inside this same popup** for citizens — see below. It is **not closed**: the browser leg of its local verification loop was never run, and its live tail is gated on `0062`. Brief: `ai-agents/tasks/backlog/0012-personal-inbox/brief.md`.

## Related

- [[systems/analytics]] — bell tap and popup open analytics events
- [[systems/localization]] — current-language resolution and English fallback behavior
- [[decisions/sprint-2]] — Sprint where announcements were pulled forward and shipped
- [[decisions/sprint-4]] — Sprint planning context showing 8d-A was no longer future scope
- [[tasks/global-announcements]] — original re-enable task brief and shipped outcome
- [[systems/player-profile-store]] — the profile service that owns `player_messages` and the inbox routes
- [[decisions/adr-103-identity-trust-seam]] — the client-asserted-ID trust seam the inbox routes sit behind
