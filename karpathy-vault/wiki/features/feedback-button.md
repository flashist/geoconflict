# Feedback Button

**Status**: active
**Source files**: `src/client/` (FeedbackModal or similar), `FeedbackIconWhite.svg`

## Summary

An in-game feedback button on both the start screen and battle screen lets players submit bug reports, suggestions, or general feedback at any time. Reports arrive with automatic context (device, build, match IDs) so they are actionable without requiring the player to provide technical details.

Source: `ai-agents/tasks/done/task-02b-feedback-button.md`

## Placement

- **Start screen:** bottom bar, next to the settings gear icon (bottom right)
- **Battle screen:** top right corner, next to settings and exit icons
- Uses `FeedbackIconWhite.svg` speech bubble icon. **Not red** (red signals errors in game UI).

## Form

Lightweight overlay (not full-screen). Contains:
- Category selector: Bug / Suggestion / Other
- Free-text field (optional)
- Optional contact field (for follow-up)
- Send button
- Confirmation: *"Thanks, we read every report"*

## Automatic Context Attached

| Field | Source |
|---|---|
| Platform (mobile/desktop) | User agent detection |
| Yandex login status | Yandex SDK |
| Username | Yandex username or AnonXXXX |
| Game version | `BUILD_NUMBER` |
| Last 3 match IDs | `localStorage['game-records']` keys (Sprint 3 addition) |
| Timestamp | `Date.now()` |
| Source screen | start screen or battle screen |
| Device info | UA, screen resolution, CPU cores, RAM, GPU string (best-effort) |

The last 3 match IDs are included silently — not shown to the player. See `ai-agents/tasks/done/task-feedback-match-ids-simple.md` for the match ID attachment implementation.

## Analytics Events

| Event | When |
|---|---|
| `Feedback:Opened` | Player tapped the button |
| `Feedback:Submitted` | Player sent a report |

Both include which screen the button was opened from.

## Admin View

Submissions land in a simple list view: category, free text, attached context, timestamp.

## Gotchas / Known Issues

- Must use `FeedbackIconWhite.svg` — not a new icon, not red
- Device info collection is error-proof: each API call is individually wrapped; any failure is caught silently and that field is omitted. A submission with zero device fields is acceptable — text always goes through.
- Sprint 3 added match ID attachment via existing `localStorage['game-records']` — no new localStorage writes needed

## Related

- [[systems/analytics]] — analytics events from this feature
- [[decisions/sprint-1]] — sprint where feedback button was built
- [[decisions/hotfix-post-sprint2]] — HF-3 added `UI:Tap:*` events for tutorial skip buttons (same `UI:Tap` convention)
- [[decisions/sprint-3]] — Sprint 3 added last 3 match IDs to feedback payload
