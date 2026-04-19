# Global Announcements Re-enable

**Source**: `ai-agents/tasks/done/8d-a-task-global-announcements.md`
**Status**: done
**Sprint/Tag**: Sprint 4 brief, shipped earlier in Sprint 2

## Goal

Re-enable the dormant OpenFront announcements feature so Geoconflict has an in-game communication channel for new features and important updates. The feature needed to work without a backend, using repo-authored JSON content and a start-screen bell with unread state.

## Key Changes

- Reused the existing dormant `news-button` / `news-modal` path instead of building a new system from scratch.
- Switched content to a repo-backed `resources/announcements.json` file with documented schema and seeded real entries.
- Added unread tracking based on the latest seen announcement stored in browser `localStorage`.
- Added start-screen bell entry point, popup rendering, and analytics events for bell tap and modal open/close.
- Localized the popup chrome through the normal translation files and added localized announcement text support inside the JSON content itself.

## Outcome

The announcements system is now active and available as a shipped dependency for later work, especially Sprint 4's planned personal inbox (`8d-B`). In practice, the feature became a lightweight global messaging surface: start-screen bell, unread dot, reverse-chronological popup, repo-managed content, and no backend operational burden.

The task brief originated in Sprint 4 planning, but the feature was pulled forward and shipped in Sprint 2 because enough player-facing updates already existed to justify the channel.

## Related

- [[features/announcements]] — live feature behavior and current implementation
- [[decisions/sprint-2]] — sprint where the feature was ultimately shipped

