# Private lobbies — add the missing analytics events for a full usage funnel

## ID
0451

> ℹ️ **ID allocation, checked 2026-10-13 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/` (folder
> names and `## ID` fields agree, base-10 arithmetic) was `0450`. `0451`: no task folder, no reference in
> `ai-agents/tasks/`, `ai-agents/sprints/` or `.claude/`, and no `tasks/*/0451*` path in any branch's history.

## Sprint
Sprint 8

> 📌 **OWNER RULING, 2026-10-13, typed by the owner live in the `fkit lead` session** (not an `AskUserQuestion` answer),
> relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ **not producer precedent.**
> Verbatim: *"private_lobbies_all - this is on for everybody. Brief a task for the current sprint ot add missing
> events."* It places this task on Sprint 8, the current sprint.

## Priority
45

⚠️ **Priority 45 is append rank, NOT a merit ranking — flagged for owner confirmation.**
**On merit this belongs directly above `0426`**, because `0426`'s Timing rule makes the news entry wait on every Sprint 8
build task that rides the final Sprint 8 deploy, and this is now one of them. ADR-035 forbids inserting above closed
rows (and a spawned producer never re-ranks), so it appends after the board's highest (44, `0450`) — a position, not
merit.

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder

## Context

**What this is, in plain terms.** Private lobbies are now visible to every player. The owner states the Yandex flag
`private_lobbies_all` is `enabled` for everybody — recorded by [`0428`](../../done/0428-turn-private-lobbies-on-for-everyone-in-the-yandex-games-console/brief.md)'s
close as live since about 17:09–17:12 MSK 2026-10-13 on game `0.0.163` (owner statement; no agent has read the console).
The owner wants to see, in GameAnalytics, how players actually use the feature, step by step. Today most of those steps
send no event, so the funnel cannot be built.

**Private-lobby events that already exist** (source:
[`analytics-event-reference.md`](../../../knowledge-base/analytics-event-reference.md), checked 2026-10-13):

| Event | When it fires | Task |
|---|---|---|
| `UI:Tap:PrivateTab` | Tap on the Private tab on the start screen | `0412` |
| `LockedFeature:Tap:PrivateLobby` | A non-citizen taps the **locked** Create Lobby button | `0301` / `0302` |
| `Citizenship:Explainer:Opened:LockedFeature:PrivateLobby` | The citizenship popup opened from that tap | `0301` |
| `Match:WinCondition:{FfaPrivate\|TeamPrivate}:…` | A private match reaches its win condition (not every match does) | — |
| `Experiment:private_lobbies_all:enabled` | Cohort marker | `0354` |

**What is missing — no event today:**
1. A citizen actually **creating** a private lobby (the host window creates the lobby as soon as it opens).
2. The **invite copied** — the host's copy button (link inside Yandex once the portal link is known, bare code otherwise).
3. A player **joining** a private lobby as a guest — split by **how**: through the invite link, or by typing/pasting the
   code. The host must not count as a guest.
4. The **host pressing Start** (Start may first show an ad, then sends the start request — that request has failed in
   production before, see `0416`).
5. A **private match starting.** `Game:Mode:Multiplayer` fires for public **and** private matches alike, so private
   starts cannot be separated today.
6. *Possibly:* a player **leaving the private lobby before it starts** (lobby abandoned), and a **private match ending**
   (today only the win-condition events above are private-specific, and not every match reaches them).

**The funnel this should make possible:** Private tab → Create → invite copied → friend joined → host Start → private
match started → match ended.

**Code areas, for orientation only — the coder's plan decides the exact hooks** (looked at 2026-10-13, not traced):
`src/client/HostLobbyModal.ts` (create on open, copy button, Start), `src/client/JoinPrivateLobbyModal.ts` (join by code),
`src/client/Main.ts` (invite-payload auto-join path, `join-lobby` handler), `src/client/InvitePayload.ts`,
`src/client/MatchStartAnalytics.ts` (`Game:Start` / `Game:Mode:*`, already skips reconnects and replays).

**Related, not dependencies:** [`0434`](../../backlog/0434-private-lobby-host-window-keeps-polling-a-lobby-that-no-longer-exists/brief.md)
(Backlog board) touches the same host window; no ordering between them. [`0418`](../0418-recheck-in-gameanalytics-the-two-0397-status-events-missing-from-the-2026-10-08-read/brief.md)
is the model for the later GameAnalytics read (owner's Chrome, owner logged in).

## What to build

1. **Confirm the event set against the code.** The list above is the expected set, not a final one. The plan names each
   event, the exact moment it fires, and why — and says plainly if a listed step cannot be measured or should be dropped,
   or if something not listed is needed for the funnel. The "possibly" items (leave-before-start, match end) are the
   plan's call, with a reason either way.
2. **Name the events by the project convention.** `Category:Action` / `Category:Subcategory:Value`, PascalCase,
   colon-separated, **no underscores**, **at most 5 colon parts** (GameAnalytics limit; each part ≤ 64 characters).
   Illustration only — the plan picks the final names: `PrivateLobby:Created`, `PrivateLobby:CreateFailed`,
   `PrivateLobby:InviteCopied:{Link|Code}`, `PrivateLobby:Joined:{Link|Code}`, `PrivateLobby:Start:Tapped`,
   `PrivateLobby:Start:Failed`, `PrivateLobby:MatchStarted:{Host|Guest}`, `PrivateLobby:Left:{Host|Guest}`.
3. **Register every new string in `flashistConstants.analyticEvents`** in `src/client/flashist/FlashistFacade.ts` (or
   the matching existing registry, e.g. `uiElementIds` for a `UI:Tap:*` event). **Never an inline string.**
4. **Keep every existing event's meaning unchanged.** In particular, do **not** redefine `Game:Mode:Multiplayer`: the
   preferred design is a **new, separate** private-start event fired alongside it, so public + private totals stay
   comparable with all past data. If the plan argues for changing an existing event instead, it must say so as an open
   question for the owner — **flagged, not decided in the plan.**
5. **Count each step once, for the right person.**
   - The host is not a guest: creating a lobby must not also fire the guest "joined" event.
   - Reconnects, page refreshes back into a lobby, and replays must not fire "joined" or "match started" (follow how
     `MatchStartAnalytics.ts` already skips them).
   - A double tap on Start or copy must not double-count (Start already ignores a second tap while starting).
   - A copy that failed (the copy-failed state from `0380`) must not count as copied.
6. **Privacy.** **No lobby code, invite link, game ID, client ID, player ID or name in any event** — not in the string
   and not as the value. Only fixed buckets (like `Link` / `Code`, `Host` / `Guest`).
7. **Event budget.** GameAnalytics caps events per user per day, and design-event name count is a watched metric (see
   the wiki `systems/analytics` page). These are low-frequency, one-per-action events with a small fixed set of names;
   the plan states the number of new distinct names and confirms nothing fires on a timer or per tick.
8. **Document every added or changed event in
   [`analytics-event-reference.md`](../../../knowledge-base/analytics-event-reference.md) in the same change** — enum
   key, full string, exactly when it fires, when it does not, and any gating (e.g. the private row is hidden when the
   flag is off). Add a short "private-lobby funnel" note listing the funnel steps in order and which event marks each.
9. **Tests.** Unit tests for each new event: fires at the right moment, once, with the exact string; does not fire on
   the excluded paths (host-as-guest, reconnect, replay, failed copy, double tap). Code in `src/core/` must be tested if
   touched (not expected to be).

## Verification steps

1. **Plan approved** by the owner before code: the final event list, each one's firing moment, and the answer on the
   "possibly" items and on `Game:Mode:Multiplayer` (unchanged, or an owner ruling to change it).
2. **Strings are valid:** each new event string matches the convention — no underscores, PascalCase parts, ≤ 5 colon
   parts, each part ≤ 64 characters — checked by a test or listed in the worklog with the count. No inline event strings
   in the diff: outside `FlashistFacade.ts`, the diff adds no quoted event-string literal (the worklog shows the grep
   used and its empty result).
3. **Reference doc updated:** every new enum key in `FlashistFacade.ts` has a row in `analytics-event-reference.md`
   (diff the two lists in the worklog); the funnel note is present.
4. **Existing events unchanged:** `Game:Mode:Multiplayer`, `Game:Start`, `UI:Tap:PrivateTab`,
   `LockedFeature:Tap:PrivateLobby` and the `Match:WinCondition:*Private*` events fire exactly as before (existing tests
   still green; a test shows a private start still fires `Game:Mode:Multiplayer` too, unless the owner ruled otherwise).
5. **No private data:** a test or worklog check shows no event string or value carries a lobby code, link, ID or name.
6. **Local walk-through** (dev build, two browser windows — host and guest): open Private tab → create → copy → guest
   joins by code (and, if reachable locally, by link) → host Start → match starts → match ends. The worklog lists each
   event seen in the analytics debug output/console, in order, with no duplicates and no host-as-guest event.
7. **`npm test` green** (full run, through the npm script, one at a time — see `CLAUDE.md`), plus `npm run lint`.

## Notes

- **Depends on:** nothing — the private-lobby flow (`0302`, `0354`, `0412`, `0428`) is already live.
- **Blocks:** `0426` — under its Timing rule the news entry waits on every Sprint 8 build task that rides the final
  Sprint 8 deploy, including ones filed after 2026-10-09; this task joins that set. ⚠️ These events are not visible to
  players and the news entry will not mention them, so the owner may choose to exempt this task from `0426`'s wait —
  open question, not decided here.
- **Not part of this task — follow-up, filed at close:** after the weekend deploy, the GameAnalytics funnel itself is
  built (and the events confirmed arriving) **in the owner's Chrome, with the owner logged in**, like `0418`. Per the
  owner's build/verify split rule (2026-09-29) that is a separate verify/build-in-GA task, filed when this one closes;
  it must not block this sprint's deploy. Which sprint it goes to is the owner's call at close (the standing rule says
  the top of the next sprint; recent rulings have bent that for Sprint 8 case by case).
- **Ships in the weekend deploy slot** like any game client change (owner ruling 2026-09-29); committed ≠ deployed.
- Localization: no player-visible text is expected; if any is added, both `en.json` and `ru.json` change together.
- The owner's statement that `private_lobbies_all` is on for everybody is **not verified by any agent**; it does not
  change what this task builds (the events fire wherever the private row is visible), only how much data will arrive.
