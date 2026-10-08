# Citizenship card: don't show "0 / 100" XP and an empty bar when the profile couldn't load

## ID
0410

> ℹ️ **ID allocation, checked 2026-10-08 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/`
> (folder names and `## ID` fields agree) is `0409`, so this is `0410`. `grep -rn 0410 ai-agents/tasks
> ai-agents/sprints`: no hits before this filing.

## Sprint
Backlog

## Priority
Unscheduled

⚠️ The owner gave no rank. Filed on the unranked [Backlog board](../../../sprints/backlog.md) as an appended row
(ADR-035) — its place on that board is **append order, not a merit ranking**. Needing a rank is the signal to pull it
into a sprint.

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

### Why this exists

Owner, 2026-10-08, typed live in the `fkit lead` session and relayed by `fkit-lead` to a spawned `fkit-producer` (no
owner channel; ADR-021/037). ⛔ Not producer precedent. Verbatim:

> *"regarding this - brief a task for that and put it to the backlog sprint"*

"This" is what `fkit-lead` had just told the owner, after the owner's production screenshot of the "couldn't load"
state (task [`0400`](../../done/0400-verify-0397-live-the-session-status-line-shows-the-right-state-in-production/brief.md)
check 5a, game `0.0.157`, the owner's paid account, profile request blocked in DevTools):

> *"when the profile can't load, the card shows "0 / 100" XP and an empty bar. It also shows your Yandex name (…)
> instead of your game name. A player could think their XP was wiped. The text does say "Ничего не потеряно" (nothing
> is lost), but the "0 / 100" says the opposite. This is a small, real issue, so I'll log it as one."*

(The owner's real name is elided from the quote on purpose — this brief says "the Yandex display name".)
Recorded in `0400`'s `worklog.md` § *Observation*.

**The problem, in plain words:** when the game can't load a logged-in player's profile, the citizenship card still
draws its normal header — a name, an XP count of **"0 / 100"** and an **empty XP bar**. A paid citizen also loses the
**ГРАЖДАНИН** (citizen) label. Below that, the notice says nothing is lost. The numbers say the opposite, and players
believe numbers before they read text.

**Goal:** in the **couldn't load** (`read_failed`) and **still failing** (`still_failing`) states, the card shows no
number, bar or name that looks like the player's real data was lost.

### What the code does today (checked by `fkit-lead`, re-read by the producer 2026-10-08)

- `src/client/PlayerProfileView.ts:97-118` `loadPlayerProfileView()` — for a logged-in player it builds a
  **zero-state**: `displayName` = the **Yandex display name** (`getCurPlayerName()`), `xp: 0`, `isCitizen: false`,
  `isAuthoritative: false`, `isPaidCitizen: false`, `isVerifiedRead: false`. Every failure path (no id, profile API
  not set up, 404, non-200, network error, timeout, bad body) returns it.
- `src/client/CitizenshipStatus.ts` `deriveProfileVerificationStatus()` — a non-null profile with
  `isAuthoritative === false` **is** `read_failed`. So "couldn't load" and "the card holds the zero-state" are the same
  condition; `CitizenshipNotice.ts` turns it into `read_failed`, or `still_failing` after a restart from the button.
- `src/client/CitizenshipCard.ts` `renderLoggedIn()` (~L693-780) — always renders `profile.displayName`, the XP label,
  `profile.xp / CITIZENSHIP_XP_THRESHOLD` and the bar (`barPercent`). It never checks `isAuthoritative` or the notice.
  The status line with the Restart button comes from `renderStatusNotice()` (~L785-810).
- `CitizenshipCard.ts` `render()` (~L580-593) — the **checking** state returns `renderChecking()` early: one quiet
  line, **no header, no XP, no name.** So "checking" does not have this problem today (see open point 3).

### ⚠️ An edge case the coder must handle — purchase confirmed, re-read failed

`renderLoggedIn()` computes `isCitizen = profile.isCitizen || this.paidGrantConfirmed`. After a confirmed purchase
whose profile re-read then fails, the card would show the citizen label **and a full bar** next to **"0 / 100"** and
the couldn't-load notice. Whatever the owner picks below must give a consistent result in that case too — the plan
must say what that case shows.

### Related work

- [`0397`](../../done/0397-show-players-whether-their-session-is-verified/brief.md) — the session status line, built
  and live. ⛔ **Its `read_failed` / `still_failing` texts and its Restart logic are owner-approved and are NOT changed
  by this task.**
- [`0400`](../../done/0400-verify-0397-live-the-session-status-line-shows-the-right-state-in-production/brief.md) — the live
  check that found this.
- [`0407`](../../done/0407-thank-paid-citizens-for-supporting-the-game-on-the-citizenship-card/brief.md),
  [`0408`](../../done/0408-explainer-popup-put-the-paid-only-ad-free-perk-under-its-own-paid-citizenship-sub-heading/brief.md),
  [`0409`](../../done/0409-explainer-popup-offer-a-buy-button-to-earned-citizens-who-have-not-paid-verified-sessions-only/brief.md)
  — same card / popup area, on Sprint 7. **This task does not wait on them.** ⚠️ **Sequencing note:** `0407` also
  changes the card (`renderLoggedIn()` area). If both are in flight, build one after the other, or expect a merge
  conflict in `CitizenshipCard.ts` and its tests.

## What to build

### Open design points — the owner confirms at the coder's plan gate

**Listed with recommendations, NOT decided.** The coder's plan puts these to the owner; nothing is built on a guess.

1. **XP number and bar in `read_failed` / `still_failing`.**
   - **(a) Hide them** — no "XP" label, no "0 / 100", no bar. Keep the notice and the Restart button.
     ← **Recommended** (`fkit-lead`'s suggestion; the producer agrees): nothing on screen contradicts "nothing is
     lost", and it needs no new text.
   - (b) Show a neutral placeholder, e.g. "— / 100" and an empty grey bar. Keeps the card's shape, but "/ 100" still
     invites a reading of the number.
2. **The name in those states.**
   - **(a) Keep the Yandex display name.** ← **Recommended** (`fkit-lead`'s suggestion): it is the player's own name,
     not wrong data; the game name is unknown when the read failed, so it cannot be shown.
   - (b) No name. (c) A neutral label (new text — en + ru, owner approves wording).
   - **Owner decides.**
3. **The "checking" state.** Verified in code (above): it renders no header today, so **no change is recommended** —
   only a test that pins "checking shows no XP number and no bar", so a future change can't bring the problem back.
   Owner confirms.
4. **The purchase-confirmed-but-re-read-failed case** (edge case above): recommended to follow whatever (1) and (2)
   pick — no number, no bar — while keeping the citizen label, since the purchase itself was confirmed by the server.
   Owner confirms.

### Build (after the plan gate)

- Client-only change in `src/client/CitizenshipCard.ts`'s logged-in render.
- **One source for "couldn't load":** key the change off the same condition the notice uses (the card's
  `read_failed` / `still_failing` notice, i.e. a non-authoritative read). ⛔ No second profile read, no second
  "did it fail?" check that could disagree with the notice.
- ⛔ Do **not** change the `citizenship_status.read_failed` / `still_failing` texts, the Restart button or its logic
  (`0397`, owner-approved).
- Successful reads (`verified`, `unverified`, earned or not, citizen or not) render exactly as today.
- Any new user-visible text goes through `translateText()`, with keys in **both** `resources/lang/en.json` and
  `resources/lang/ru.json`. Option 1(a) + 2(a) needs **no** new text.
- The explainer popup (`CitizenshipExplainerModal.ts`) already shows only the read-failed text in this state, no
  numbers — out of scope unless the plan finds otherwise.

## Verification steps

1. **Plan gate:** the owner's answers to open points 1–4 are recorded in this task's worklog (who, date, channel,
   words verbatim) before the build starts.
2. Unit tests in `tests/client/CitizenshipCard.test.ts` (the existing *"couldn't load (failed read)"* block under
   *"session status line (task 0397)"*):
   - `read_failed`: the card shows no "0 / 100" (or shows exactly the approved placeholder) and no XP bar fill
     (`#citizenship-xp-bar-fill` absent, or as approved); the read-failed notice and `#citizenship-status-restart`
     are still there.
   - `still_failing`: the same.
   - The name: matches the owner's ruling on point 2.
   - Purchase confirmed, re-read failed: matches the owner's ruling on point 4.
   - `checking`: no XP number, no bar (pins point 3).
   - Regression: an authoritative read (earned non-citizen, citizen, verified paid) still shows the XP number and bar
     exactly as before — the existing tests in *"authorized, not yet a citizen"* and *"citizen state"* stay green.
3. If any text was added: both `en.json` and `ru.json` carry it; no hardcoded user-visible string.
4. `npm test` green (judge a lone `Exceeded timeout of 5000 ms` by the supertest-flake rule in `CLAUDE.md`, and say
   if you re-ran).
5. **Live check (separate, per the owner's build/verify split rule, 2026-09-29):** on the live game, block the profile
   request in DevTools (as `0400` check 5a did) and confirm the card shows the approved result. This needs a deploy and
   an owner check, so it is filed as its own verify task when this one closes — it does not hold this task open.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing
- Related: `0397` (status line — texts and Restart logic not changed), `0400` (found this), `0407` (also edits the
  card — sequencing note above), `0408`, `0409`.
- Small, client-only, no server or data change. No analytics change expected; if the plan adds one, follow
  `analytics-event-reference.md` and the `flashistConstants.analyticEvents` enum.
- No ids, hosts, real names or secrets belong in this brief or its follow-ups.
- Filed 2026-10-08 by a spawned `fkit-producer` on an owner request relayed by `fkit-lead`. ⛔ Not producer precedent.
