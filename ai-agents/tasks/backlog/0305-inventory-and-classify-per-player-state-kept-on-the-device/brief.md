# Step 0 — list every piece of per-player state kept on the device, and classify each

## ID
0305

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-producer

## Context

**Filed 2026-09-26 by a spawned `fkit-producer` with no owner channel (ADR-021)** as the first child of
epic [`0304`](../0304-epic-server-side-player-settings-and-state-for-logged-in-players/brief.md) — read
the epic for the owner's words, the trigger (`0296`, second device) and the constraints.

This is **read-only research plus owner rulings**. No code, no database change. Its output decides what
`0306` has to design for.

### ⚠️ Preliminary list — producer `grep` of `src/client` and `src/core`, 2026-09-26. A LEAD, not settled

Step 1 re-verifies every row and finds what this missed (dynamic keys, key-name constants built at
runtime, `src/client/flashist/`, any third-party SDK wrapper).

| Key (storage) | Holds | Code | Crosses devices? (producer's first guess) |
|---|---|---|---|
| `tutorialCompleted` (local) | tutorial done | `TutorialStorage.ts`, `Main.ts`, `TutorialLayer.ts`, `WinModal.ts` | **Yes — the trigger** |
| `tutorialAttemptCount` (local) | tutorial attempts (analytics) | `TutorialStorage.ts` | Probably no (analytics only) |
| `tutorialStartTime` (session) | tutorial timer | `TutorialLayer.ts`, `WinModal.ts` | No — one page load |
| `geoconflict.announcements.lastSeenId` (local) | last general announcement seen | `Announcements.ts`, `NewsButton.ts`, `NewsModal.ts` | **Yes — the trigger** |
| `geoconflict.sp.nextMissionLevel`, `geoconflict.sp.lastCompletedAt` (local) | single-player mission progress | `SinglePlayMissionStorage.ts` | **Likely yes** — progress lost on a new device |
| `settings.*` booleans/volumes, `settings.keybinds`, `settings.attackRatio`, `settings.troopRatio`, `settings.territoryColor`, `territoryPattern` (local) | game settings | `src/core/game/UserSettings.ts`, `UserSettingModal.ts`, `InputHandler.ts`, `ControlPanel.ts`, `UnitDisplay.ts` | **Owner's call** — some are per-device by nature (keybinds on a phone? volume?) |
| `lang` (local) | chosen language | `LangSelector.ts` | Owner's call (Yandex also supplies a language) |
| `username` (local) | typed name | `UsernameInput.ts` | Probably no — the profile already holds a name (`0067` name change) |
| `flag` (local) | chosen flag | `FlagInput.ts`, `FlagInputModal.ts`, `CitizenshipCard.ts` | Flags are interim-suppressed; likely keep/leave |
| `geoconflict.player.daysPlayed`, `game-records`, `gamesPlayed` (local) | play history — analytics **and tenure-grant evidence** | `DaysPlayedAnalytics.ts`, `LocalPersistantStats.ts`, `Utils.ts`, `TenureGrantClaim.ts`, `FeedbackModal.ts` | **See open question 3** |
| `geoconflict.player.firstSeen` (local) | first-seen timestamp (analytics) | `FlashistFacade.ts` | Analytics — probably keep |
| `geoconflict.session.pendingEnd:*` (local) | unsent session-end analytics | `SessionMatchAnalytics.ts` | No — device-specific |
| `geoconflict_citizenship_earned_at:<id>` (local) | fires `Citizenship:Earned:XP` once | `PlayerProfileView.ts` | Maybe — a second device may fire the event again |
| `geoconflict_active_tab` (local) | last start-screen tab | `StartScreenTabStorage.ts` | No — UI convenience |
| `reconnect-session` (local), multi-tab lock (local) | reconnect / tab detection | `ReconnectSession.ts`, `MultiTabDetector.ts` | No — device-specific by nature |
| session latches (session) | reload / login-restart caps | `Bootstrap.ts`, `GameRestart.ts`, `ProfileSession.ts` | No |
| `token`, `apiHost` (local), JWT cookie | upstream OpenFront login — dead code | `jwt.ts` | **Delete candidate** — see `0069` (auth strategy) |
| `player_persistent_id` (cookie) | guest persistent id | `Main.ts` | No — identity, not a setting |
| `dev-pattern`, `dev-primary`, `dev-secondary` (local) | developer overrides | `UserSettings.ts` | No — dev only |
| **Yandex cloud save** (`player.setData`/`getData`) | — | **none found** | — (ADR-112 and `0253` findings agree) |

## What to build

1. **Inventory (read-only).** Produce the full, verified table: every `localStorage` / `sessionStorage` /
   cookie / IndexedDB / Yandex cloud-save key the client reads or writes — the key, what it holds, the
   value shape and rough size, every reader and writer (`file` + function), and whether it matters on a
   second device. Include tests only where they reveal an extra key. Re-confirm there is no Yandex cloud
   save anywhere (including `src/client/flashist/` and the HTML templates).
2. **Producer's recommended class per key:** **move to server** (logged-in players) / **keep on device** /
   **delete** (dead). For each "move", say what a second device should see and the merge rule when the
   device and the server disagree (e.g. tutorial: completed anywhere = completed; announcements: the
   **newer** of the two by position in `resources/announcements.json`, not string order).
3. **Owner rulings.** Put the classification to the owner (via the lead session) and record the answers
   verbatim with date and channel. Minimum set to rule: tutorial, announcements (already the owner's
   stated intent — confirm), single-player mission progress, the `settings.*` group, `lang`, the tenure
   evidence (open question 3).
4. **Write the findings** to `ai-agents/knowledge-base/reports/` (dated) and link them from this brief and
   from `0304`. No secrets, no real player ids.

## Verification steps

1. The report's table covers every key a fresh `grep -rn "localStorage\|sessionStorage\|document.cookie\|indexedDB\|setData\|getData" src/`
   finds (outside tests), plus any runtime-built key names — the report says how dynamic keys were found.
2. Every row has a class, and every **move** row has a stated merge rule.
3. The owner's rulings are recorded verbatim with date and channel; any key the owner did not rule is
   listed as open, not silently classified.
4. The Yandex cloud-save question has a one-line answer with evidence.

## Notes

- **Depends on:** nothing.
- **Blocks:** `0306`.
- Parent epic: `0304`.
- **Open question 3 (tenure evidence) — for the owner.** `geoconflict.player.daysPlayed` and
  `game-records` are the tenure grant's evidence. They are device-local **by owner ruling** (`0253`,
  2026-09-14), and `0268` deletes the claim logic ~60 days after release. Copying them to the server
  would not make them trustworthy (they are still whatever the device says) and would only widen the
  claim-on-behalf exposure recorded in `0268`. **Producer recommends: leave them on the device and out of
  this epic.** Options: (a) leave out — recommended; (b) move the play history too, for analytics only,
  with no link to the grant.
- `settings.keybinds` on a phone vs a desktop is a good example of a value that may be right to keep per
  device even for logged-in players — the owner decides.
