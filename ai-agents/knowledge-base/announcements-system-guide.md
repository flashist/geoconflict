# Geoconflict — Announcements System Guide

## Overview

The **announcements system** is the in-game channel used to inform players about important updates, upcoming features, and recently shipped improvements.

For players, it appears as a **bell icon** on the start screen. If there is something new they have not opened yet, the bell shows a small **unread badge**. When the player taps the bell, a popup opens with the latest announcements in reverse chronological order.

This system is intentionally simple:

- there is **no backend**
- there is **no admin panel**
- announcement content lives in a **JSON file inside the repository**
- publishing or editing announcements requires a **client deploy**

This makes the system low-maintenance and reliable for a product with relatively infrequent updates.

---

## Why This Feature Exists

The main product goal is to give the game a built-in way to communicate with returning players.

Without this feature, a player who has not opened the game in several days or weeks has no obvious way to learn that something important has changed. The announcements bell solves that by giving the game a lightweight “what’s new” channel.

Examples of good uses:

- announcing an upcoming feature such as citizenship
- highlighting a recently shipped quality-of-life improvement
- informing players that a new support or feedback tool is now available

Examples of bad uses:

- posting minor internal tweaks players would not care about
- keeping a long permanent release-history archive inside the game
- using the system as a substitute for targeted player-specific messaging

The current design is closer to a **short in-game changelog / update bulletin** than to a full news feed.

---

## What Players See

### Start screen entry point

The feature is available from the **start screen**, not during the match itself.

Current behavior:

- the bell is shown in the **bottom-left corner** of the start screen
- it is a compact round blue button, visually aligned with the rest of the Geoconflict utility controls
- it is hidden as soon as the match-start transition begins

This is important because the bell is meant to support entry/start-screen communication, not to distract the player during active gameplay.

### Unread badge

The bell may show a small **orange dot**.

That badge means:

- the player has never opened the announcements popup before
- or a newer announcement has been added since they last opened it
- or the stored “last seen” announcement ID no longer exists in the current announcements list

The badge does **not** show a numeric count. It is only an “unread exists” signal.

### Popup behavior

When the player taps the bell:

- the announcements popup opens
- the popup lists entries from newest to oldest
- each entry shows a date, title, body text, and optional tag
- the unread badge clears immediately because the player has now “seen” the latest announcement

The popup does **not** auto-open. It opens only when the player explicitly taps the bell.

---

## How Content Is Stored

Announcement content lives in:

- `resources/announcements.json`

This file is the single source of truth for global announcements.

### Current entry shape

Each announcement is one object in a JSON array. The array must always be in **newest-first order**.

Current structure:

```json
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
```

### Meaning of each field

| Field | Meaning |
|-------|---------|
| `id` | Unique stable identifier for the entry. Also used for unread tracking. |
| `date` | Human-readable display date. Current convention: `YYYY-MM-DD`. |
| `title` | Localized short headline. |
| `body` | Localized plain-text main message. |
| `tag` | Optional badge used for visual classification: `new`, `upcoming`, or `update`. |

### Authoring rules

- Add new announcements at the **top** of the array.
- Never reuse an old `id`.
- Keep the list short and focused on current or recent important updates.
- Use plain text only. No HTML or Markdown.
- English text is mandatory for every entry.
- Additional languages are optional per entry.

Detailed schema and authoring rules are documented in:

- `resources/announcements.schema.md`

---

## Localization

The system supports localized announcement text inside the same `announcements.json` file.

### Current supported content languages

At the moment, announcements are authored in:

- English (`en`)
- Russian (`ru`)

### How localization works

Each announcement stores `title` and `body` as language maps, for example:

```json
"title": {
  "en": "Feedback is now in the game",
  "ru": "Обратная связь теперь прямо в игре"
}
```

The client checks the player’s currently selected language and resolves the most appropriate text at runtime.

### Fallback behavior

English is the required fallback language.

If the current locale is missing:

- the game first tries the exact locale code
- then, if relevant, its base language
- finally falls back to English

Example:

- player locale = `ru-RU`
- if `ru-RU` is not present, the system tries `ru`
- if `ru` is also missing, it uses `en`

Fallback is **per field**, not per whole entry.

That means this is valid behavior:

- Russian title exists
- Russian body is missing
- result: Russian title + English body

### Important limitation

Only the announcement **content** (`title`, `body`) is localized this way.

Other UI strings around the popup, such as:

- the bell tooltip
- modal title
- empty-state text
- tag labels

are handled through the normal game translation files in `resources/lang/*.json`.

---

## How Unread Detection Works

Unread state is intentionally simple and robust.

### What is stored

The game stores one value in the player’s browser:

- `localStorage["geoconflict.announcements.lastSeenId"]`

This value is the `id` of the newest announcement the player had seen when they last opened the popup.

### When the unread badge is shown

The badge is shown if:

1. there is at least one announcement
2. and the stored `lastSeenId` is missing, outdated, or unknown

More specifically:

- if there is **no** stored ID, the badge is shown
- if the stored ID is **not present** in the current list, the badge is shown
- if the stored ID exists but is **not the first item**, the badge is shown

### When the unread badge disappears

When the player opens the popup, the game stores the ID of the **current newest announcement** as the new `lastSeenId`.

From that moment, the badge disappears until a newer top entry is added later.

### Why IDs matter

Unread detection is tied to the stable `id`, not to the text itself.

This means:

- localization changes do not create a false unread state
- editing the English or Russian wording of an existing entry does not mark it as “new”
- only adding a new top-level announcement with a new `id` creates a new unread signal

---

## Publishing Workflow

There is no live CMS. The workflow is repository-based.

### To publish a new announcement

1. Edit `resources/announcements.json`
2. Add the new entry at the top
3. Provide English text and any optional translations
4. Commit the change
5. Deploy the client

### Important operational consequence

Announcements are bundled into the client build.

So:

- changing `announcements.json` alone is not enough
- players will only see the updated content after a new client build is deployed

This is acceptable because announcements are expected to change relatively rarely.

### Caching behavior

The announcements file is **not** fetched as a separate runtime API response.

Instead, it is imported into the client bundle during the webpack build. In production, the JavaScript bundle has a content hash in its filename. That means:

- browsers can cache the bundle safely
- after a deploy, the bundle URL changes if the content changed
- the browser then requests the new bundle instead of reusing the old one

The main stale-content risk is not ordinary browser caching, but an already-open old client tab that has not refreshed yet.

---

## Analytics

The system currently emits two analytics signals.

| Event | Meaning |
|-------|---------|
| `UI:Tap:AnnouncementsBell` | Player tapped the bell on the start screen |
| `Announcements:Opened` | Announcements popup opened |

Why this matters:

- product can measure whether players notice and use the feature
- future announcement experiments can compare “bell tapped” vs “modal opened” behavior
- the system creates a measurable communication surface without needing a backend

The analytics naming reference is documented in:

- `ai-agents/knowledge-base/analytics-event-reference.md`

---

## Current Technical Structure

The main implementation pieces are:

| File | Responsibility |
|------|----------------|
| `resources/announcements.json` | Announcement content |
| `resources/announcements.schema.md` | Authoring rules and schema |
| `src/client/Announcements.ts` | Data normalization, localization resolution, unread-state helpers |
| `src/client/components/NewsButton.ts` | Bell button, unread state, click behavior |
| `src/client/NewsModal.ts` | Popup rendering and mark-as-read behavior |
| `src/client/LangSelector.ts` | Forces announcement UI rerender on language change |
| `src/client/flashist/FlashistFacade.ts` | Analytics event constants |

### UI placement

The start-screen mount points currently live in:

- `src/client/index.html`
- `src/client/yandex-games_iframe.html`

Both place the bell inside:

- `#start-screen-announcements-button`

### Match transition behavior

When a match begins, the start-screen bell is hidden together with other start-screen utility controls. This behavior is handled in:

- `src/client/Main.ts`

---

## Known Limits

The current design is intentionally narrow.

### 1. No backend editing

Announcements cannot be created from an admin interface. A code/content change plus deploy is required.

### 2. All localizations live in one file

This is acceptable now because:

- only two languages are planned for announcement content
- the announcements list is intentionally short

If the number of supported content languages grows significantly, the file could become unwieldy.

### 3. No full historical archive

The system is meant for current communication, not for preserving every historical release note forever.

### 4. Global only

Current announcements are visible to all players equally.

There is no player-specific targeting, segmentation, or inbox behavior yet.

---

## Future Direction

The existing popup is designed to become the base for a broader messaging surface.

The planned next step is a **personal inbox** for citizens, described in task `8d-B`.

That future feature would add:

- a second tab inside the same popup
- player-specific system messages
- unread state combined with the global announcements bell

In other words, the current global announcements system is both:

- useful on its own today
- a foundation for a more advanced notification/inbox system later

---

## Practical Guidance For Non-Technical Stakeholders

If you are deciding whether something should become an announcement, use this checklist:

- Is this important enough that a returning player should know about it immediately?
- Does it affect player motivation, retention, or feature discovery?
- Is the message still relevant if a player opens the game several days later?
- Can it be expressed in a short headline and 1 short paragraph?

Good candidates:

- citizenship is coming
- major UI improvement shipped
- feedback/reporting tool added
- important player-facing feature now live

Poor candidates:

- internal refactors
- small balance tweaks with no clear player-facing value
- very frequent patch spam

If in doubt, fewer higher-signal announcements are better than many low-value ones.

---

## Source References

- `ai-agents/tasks/backlog/8d-a-task-global-announcements.md`
- `ai-agents/tasks/backlog/8d-b-task-personal-inbox.md`
- `ai-agents/sprints/done/plan-sprint-2.md`
- `resources/announcements.json`
- `resources/announcements.schema.md`
- `src/client/Announcements.ts`
- `src/client/components/NewsButton.ts`
- `src/client/NewsModal.ts`
- `src/client/Main.ts`
