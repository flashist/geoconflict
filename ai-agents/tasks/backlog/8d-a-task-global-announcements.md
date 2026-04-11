# Task 8d-A — Global Announcements Re-enable

## Priority
Sprint 4 — ships early in the sprint, independent of all other Sprint 4 tasks. Provides the communication channel needed to announce citizenship before it launches.

## Context

The original OpenFront.io codebase includes an announcements feature — a bell icon that opens a popup showing game news and updates with an unread badge. This feature is currently disabled in Geoconflict.

Re-enabling it now, before citizenship launches, gives the game a channel to announce upcoming features. Players who haven't opened the game in a while will see the badge and learn about citizenship before it ships — improving adoption when it does.

**No backend required for this task.** Content is served from a JSON file in the repository. Publishing new announcements requires a deploy, which is acceptable given the low frequency of game updates.

---

## What to Build

### Re-enable the existing feature

Before writing any new code, inspect what the original OpenFront announcements implementation looks like and how much is already present but disabled. The goal is to re-enable with minimal changes, not rewrite.

### Content source

A JSON file in the repository with the following structure:

```json
[
  {
    "id": "2026-04-sprint4-citizenship",
    "date": "2026-04-XX",
    "title": "Citizenship is coming to Geoconflict",
    "body": "We're building a citizenship system that rewards loyal players...",
    "tag": "upcoming"
  }
]
```

Fields: `id` (unique string), `date`, `title`, `body`, `tag` (optional: `"new"`, `"upcoming"`, `"update"`). Newest entries first. Document the schema so announcements can be added without guessing.

### Unread detection

Track the ID of the last announcement the player has seen in localStorage. On game load, compare against the latest entry in the JSON — if newer entries exist, show the unread badge. When the player opens the popup, mark all as read.

### Behaviour rules

- Bell icon visible in main UI at all times
- Unread badge appears when there are unseen entries
- Clicking icon opens the popup — does not auto-open under any circumstances
- Badge clears when popup is opened
- Popup shows entries in reverse-chronological order

### Seed content

Ship with at least 2–3 real announcement entries so the popup doesn't open to an empty list. Include at minimum an announcement about citizenship coming in the next update.

---

## What "Done" Looks Like

- Bell icon visible in main UI
- Clicking opens the announcements popup with real content
- Unread badge appears correctly on game load when new entries exist
- Badge clears when popup is opened
- Popup never auto-opens
- JSON schema documented for future use
- Analytics: fire `UI:Tap:AnnouncementsBell` when icon clicked, `Announcements:Opened` when popup opens

## Dependencies

None — this task is fully independent and can ship at any point in Sprint 4.

## Notes

- Part B (personal inbox for citizens) is a separate task (8d-B) that depends on the player profile store. This task has no such dependency.
- The bell icon position should be reviewed in the context of the current Geoconflict UI layout — the original OpenFront position may need adjusting.
