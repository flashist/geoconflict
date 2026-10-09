# Tenure gift popup can open over a lobby or match when the player joins right after the citizenship card reveals

## ID
0336

> ℹ️ **ID allocation, checked 2026-09-28 before filing.** Highest existing ID `0335`, by both the briefs'
> `## ID` fields and the folder prefixes across `ai-agents/tasks/{backlog,done,cancelled}/`. **`0336`:** no task
> folder, and no hit under `ai-agents/tasks/`, `ai-agents/sprints/` (all boards, incl. `done/`) or
> `ai-agents/knowledge-base/`. No other local branch carries a committed `03xx` task folder. (The `0600` / `0700`
> strings on some boards are file modes, not task IDs.)

## Sprint
Sprint 7

## Priority
13

> 📌 **2026-09-29 — rank 11 → 13.** Shifted down two by an OWNER-RULED placement that put `0339` + `0340` directly below `0337` on the [Sprint 7 board](../../../sprints/done/plan-sprint-7.md) (relayed by `fkit-lead`; see that board's 2026-09-29 `0339`/`0340` addendum). Not a merit change for this task.

> 📌 **2026-09-29 — rank 10 → 11.** Shifted down one by an OWNER-RULED re-rank that put `0337` on top of the [Sprint 7 board](../../../sprints/done/plan-sprint-7.md) (relayed by `fkit-lead`; see that board's 2026-09-29 addendum). Not a merit change for this task.

⚠️ **Priority 10 is append rank, NOT a merit ranking — flagged for owner confirmation.** The **placement** is
owner-ruled (end of Sprint 7, 2026-09-28 — see *Context*); the number is this board's highest (9, `0335`) plus
one. No row was moved or renumbered (ADR-035).
**On merit this belongs directly below `0335`** — i.e. where it is appended — because it is rare (an unclaimed
one-time gift plus a join within ~1–2 s), it predates `0329`, and the owner's ruling called it low priority.

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder

## Context

### Authority — filed on an owner ruling

**Filed 2026-09-28 by a spawned `fkit-producer` holding no owner channel, on two OWNER RULINGS given live via
`AskUserQuestion` in the `fkit lead` session and relayed by `fkit-lead` (ADR-021/037). ⛔ Not producer
precedent.** The question was `0329`'s review finding **R3**. Verbatim:

- **Disposition:** **"Accept + file own bug (Recommended)"**. Option text: *"0329 closes. A new bug covers both
  normal and late reveals (likely fix: check the menu right before the popup opens, and close the gift popup at
  match start)."*
- **Placement:** **"End of Sprint 7 (Recommended)"**. Option text: *"Rare and pre-existing; next sprint is fine.
  Low priority."*

Source: `0329`'s review ledger (`review.md` in the `0329` task folder — `0329-citizenship-card-re-checks-its-gate-when-the-platform-recovers-late`),
finding **R3** and its residual entry. Raised by both reviewers. `0329` is being closed as this is filed, so its
folder may have moved to `done/` by the time you read this — find it by ID.

### The bug, in plain terms

The citizenship card shows a one-time **thank-you popup for the tenure gift** (`tenure-grant-modal`) the first
time a long-standing player's gift is granted. The popup can open **as the player enters a lobby**, and then
**stays over the live match until tapped**.

How it happens — the card decides "the player is on the start screen" too early, then waits on the network, then
shows the popup without asking again:

- **Late reveal (`0329`).** `recheckWhenPlatformRecovers()` waits `whenOnStartScreen()` **once**, then calls
  `revealCard()` (around `src/client/CitizenshipCard.ts:207-211`).
- **Normal reveal at the gate (`0253`, every boot).** It does **not ask at all** — it assumes the player is on
  the start screen at that moment (around `CitizenshipCard.ts:116-126`). ⚠️ The spawn summary said this path
  "checks once"; the code shows **no check**. Same effect: nothing is asked again before the popup. The reviewer
  judged this path, if anything, **more exposed**, because it overlaps the player's first clicks.
- **Gap 1 — a join already under way looks like "on the start screen".** `handleJoinLobby` in `src/client/Main.ts`
  (around `:739-778`) awaits three things — server config, cosmetics, the Yandex id — before it sets
  `this.gameStop`. The start-screen test is `this.gameStop !== null` (registered in `Main.ts` via
  `setStartScreenPresenceSource`), so during those awaits the player reads as "on the start screen".
- **Gap 2 — network round trips inside the reveal.** After the check, `revealCard()` still awaits
  `updateComplete`, `refreshProfile()` (network) and `startTenureClaim()` → `maybeClaimTenureGrant()` (network).
  A join clicked during those gets through.
- **No second look before the popup.** `startTenureClaim()`'s only guard before `modal.show(` is `isConnected`
  (around `CitizenshipCard.ts:303-326`), and the card is always connected.
- **Nothing closes it at match start.** `tenure-grant-modal` is **not** in `Main.ts`'s pre-start close list (the
  list whose last entry is `"citizenship-restart-modal"`, around `:790-808`), and it has only `hide()`, not
  `close()`.

**How rare:** it needs an unclaimed one-time gift **and** a join within about 1–2 s of the reveal. **Not new with
`0329`** — the gate reveal has had the same shape since `0253`. The tenure popup is **live in production** (release
`0.0.154`, per the wiki's citizenship go-live page), so this can happen to real players today.

### Precedent — the same gap was closed once already

`0303`'s restart popup follows the rule **"a lobby or match is never interrupted"**: `restart()` asks
`isAwayFromStartScreen()` **right before** showing, and keeps the offer waiting instead of losing it
(`src/client/CitizenshipRestartOffer.ts:111-120`). `0303`'s own review R3 was this same join gap, and it was
fixed. Follow that pattern rather than inventing a new one.

### Fix directions (from the review and the owner's option text — directions, not a design)

No single direction covers both gaps; the plan picks the combination and says why:

1. **Ask again right before the popup opens** — wait `whenOnStartScreen()` (`src/client/StartScreenPresence.ts`,
   added by `0329`) inside `startTenureClaim()`, after the claim returns and before `modal.show(`. Closes Gap 2.
   ⚠️ **Alone it does not close Gap 1** — during a join's own awaits `gameStop` is still `null`, so the wait
   resolves at once.
2. **Close the gift popup at match start** — add it to the pre-start close list (it needs a way to be closed
   there). A backstop for both gaps: the popup can still flash up as the lobby opens, but never stays over the
   match.
3. **Have `Main.ts` count the player as "away" from the first line of a join**, not only once `gameStop` is set.
   Closes Gap 1 at the source. ⚠️ This also changes what `0303`'s restart offer sees (it uses the same
   `gameStop !== null` test), and it must still report "back on the start screen" if a join fails before
   `gameStop` is set — otherwise a waiter hangs forever.

The owner's option text named **1 + 2** as the likely fix.

## What to build

1. **The tenure thank-you popup never opens while a lobby or match is being joined or played**, from either
   reveal path (the gate reveal and `0329`'s late reveal) — including a join clicked during a join's own setup
   awaits and during `revealCard()`'s network round trips.
2. **If it did open, it never stays over a match**: starting a match closes it.
3. **Keep what works today.** A player who stays on the start screen still sees the popup exactly once, as now.
   `Citizenship:Seen` behaviour is unchanged (the review found it correct). The follow-up after the popup closes
   (`dispatchCitizenshipGrantedMidSession("tenure")`, which waits for the popup to be closed) still fires when
   it should — **the plan must say what happens to that follow-up when the popup is closed by a match start or
   never shown**, and must not leave it waiting forever in a way that matters.
4. **Say what happens to a deferred thank-you.** The server grants the gift once; a second claim answers
   `duplicate` and shows nothing. If the popup is held back until the start screen and the player leaves via the
   match (which reloads the page), the thank-you is never shown — the XP is still credited. **See open question
   Q1** — build to the owner's answer; if none has been given when the plan is written, surface it at plan
   approval rather than choosing silently.
5. **Tests** that fail on today's code and pass after, covering at least: a join started during the gate reveal's
   network round trips → no popup over the lobby; the same for `0329`'s late reveal; a join started during
   `handleJoinLobby`'s setup awaits (if direction 3 is chosen); popup already open when a match starts → closed;
   player stays on the start screen → popup shown once.

**Out of scope:**
- `0329`'s own shipped behaviour beyond what this fix needs; the `0329` folder is not edited.
- Changing the tenure grant itself (server, amounts, eligibility, `TenureGrantClaim.ts`'s claim rules).
- The restart offer (`CitizenshipRestartOffer.ts`) — except that direction 3, if chosen, changes the presence
  signal it reads; say so in the plan and keep its tests green.
- The other `handleJoinLobby` race, `0228` (stale `gameStop`) — related timing, separate bug; do not absorb it.

## Verification steps

- New tests **fail on the current code** and **pass** with the fix. Record both runs in the worklog.
- Existing suites stay green: `tests/client/CitizenshipCard.test.ts`, `StartScreenPresence.test.ts`,
  `TenureGrantModal.test.ts`, `TenureGrantClaim.test.ts`, `CitizenshipRestartOffer.test.ts`.
- **Locally** (`npm run dev`, a profile with an unclaimed tenure gift, network throttled to widen the gap): boot,
  and join a lobby within the first second or two. Record: the popup does not open over the lobby, and — with
  the popup forced open — starting a match closes it. If the gap cannot be widened enough to hit live, say so and
  rely on the tests; do not claim a live check that did not happen.
- `npm run lint` clean; `tsc --noEmit` clean.
- Full `npm test`; if a known `supertest` flake appears, follow the CLAUDE.md flake procedure and say that you
  re-ran.

## Notes

- **Depends on:** `0329` (uses `whenOnStartScreen()` from `src/client/StartScreenPresence.ts`, which `0329` added; `0329` is closing as this is filed)
- **Blocks:** nothing
- **Related:** `0329` (source — review R3 and its residual), `0253` (the gate reveal, same gap), `0303` (the
  restart popup's "never interrupt a lobby or match" rule and its fixed R3 — the pattern to follow), `0228`
  (another `handleJoinLobby` timing bug, not absorbed).
- Client-only change expected (`CitizenshipCard.ts`, `Main.ts`, possibly `TenureGrantModal.ts` /
  `StartScreenPresence.ts`). No `src/core/` change expected.
- Line numbers are from the working tree on 2026-09-28 and will drift — find the code by name.

### Open questions for the owner

- **Q1 — a thank-you held back, then lost.** If the player joins before the popup can show, the fix holds the
  popup back until they return to the start screen. But a match ends with a page reload, and the gift can only be
  granted once, so a held-back thank-you may **never** be shown (the XP is still given — only the "thank you"
  message is lost). Options: (a) accept that — rare, and the XP is kept; (b) remember "thank-you not shown yet"
  on the device and show it on the next start screen (more work, and a new stored flag). Producer's lean: (a),
  because the case is rare and nothing the player owns is lost — owner's call.
