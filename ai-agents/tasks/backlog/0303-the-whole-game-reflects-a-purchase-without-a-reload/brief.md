# After a purchase, the whole game reflects it at once — live update or a clear "restart to apply"

## ID
0303

## Sprint
Sprint 6

## Priority
12

📌 **12** — shifted down five more later on 2026-09-26 by a third OWNER RULING (R2/R3, live via `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer`, ADR-021; ADR-037 §3): five appended name-change rows were placed above it. Still directly below `0301`; the same ruling put [`0318`](../0318-investigate-citizenship-card-vanishes-after-a-match-on-a-shaky-connection/brief.md) (card vanishes after a match — same purchase-state family) **directly below this task**. ⛔ Not a merit re-rank of this task. See the *RE-RANK 2026-09-26, THIRD* addendum on the Sprint 6 board. *Earlier value, kept:* ~~7~~ —

📌 **7** — shifted down one more later on 2026-09-26 by a second OWNER RULING (live via `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer`, ADR-021): the owner moved `0250` into Sprint 6 at rank 4 — see the second *RE-RANK 2026-09-26* addendum on that board. ⛔ Not a merit re-rank of this task. Still directly below `0301`. *Earlier value, kept:* ~~6~~ —

**Board rank on [Sprint 6](../../../sprints/plan-sprint-6.md), OWNER-RULED 2026-09-26** — an OWNER RULING given live in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021; ADR-037 §3); ⛔ not producer precedent. Full record: the *RE-RANK 2026-09-26* addendum on the Sprint 6 board. Owner, Q2: *"Right after 0307/0308 (Recommended)"* — directly below `0301`. ~~21~~ was the append rank until then.

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**Filed 2026-09-26 by a spawned `fkit-producer` with no owner channel (ADR-021), on an OWNER RULING
given live in the `fkit lead` session via `AskUserQuestion` on 2026-09-26 and relayed by `fkit-lead`.**
Question: *"File a task so that after any purchase the whole game reflects it right away (badge, inbox
tab, perks, later ad-free) — either by updating each part live or by a controlled game restart?"* →
**"Yes, Sprint 6 (Recommended)"** — option text: *"Producer briefs it: first list which parts don't
update after purchase, then pick live-update vs a friendly 'restart to apply' step. Linked to 0297,
0301, 0302, 0248."* ⚠️ The owner ruled that the task exists and its sprint. They did **not** rule live
update vs restart, the rank, or the scope questions below. ⛔ Not producer precedent.

**The owner's words (voice-dictated), verbatim:**
> *"do we have any tasks in the backlog about restarting the game after successful purchase? The thing
> is that right now the user user UX user experience of the game after if after purchasing the
> citizenship or doing any other purchase is not really the best one because the game isn't changing
> anything right so in order to disable like to change the UI maybe to disable advertisements etc etc
> we need to restart the game"*

No existing task covered this (checked 2026-09-26: `grep` of `ai-agents/tasks/backlog/` for
restart/reload; the hits are all server, deploy or test-infra work).

### ⚠️ Preliminary inventory — producer read of the code, 2026-09-26. A LEAD, not settled.

Step 0 re-verifies every line. Citizenship is the only thing for sale today (catalog id `citizenship`,
`src/client/CitizenshipPurchase.ts`). A paid grant sets **both** `is_citizen` and `is_paid_citizen` on
the server (`src/profile-server/PaymentsRepository.ts`, `GRANT_FLAGS_SQL`) and sends an inbox message.

| Surface | Updates after purchase without reload? | Evidence |
|---|---|---|
| Start-screen citizenship card (citizen state, bar full, buy button gone) | **Likely yes** | `CitizenshipCard.ts` sets `paidGrantConfirmed`, then `refreshProfile()` after `"granted"` (~`:588`). Unproven in prod — `0297` is the first real purchase. |
| Name-change control (on the card) | **Likely yes, if the re-read succeeds** | Rendered only for `isCitizen && profile.isAuthoritative` (~`:407`). If the re-read fails, `paidGrantConfirmed` shows the citizen state but **not** the name-change control until reload. |
| Inbox — bell unread dot (the welcome message the grant sends) | **Likely NO** | The inbox cache (`src/client/Inbox.ts`) is re-fetched only on bell/modal open or on `PURCHASES_RECONCILED_EVENT`, which fires **only from session-start reconciliation** (`PaymentsReconciliation.ts:78`) — **not** after a normal purchase. So no dot until the player opens the modal or reloads. |
| Inbox — Personal tab | **Probably yes, on next modal open** | `NewsModal.ts` calls `refreshInbox()` on open (~`:349`); the tab appears once that fetch returns. Step 0 confirms there is no flash of "no tab". |
| ★ badge in a match (leaderboard, player panel) and lobby lists (host / join-private) | **Yes from the next match; NO for the current lobby or match** | Server resolves the flag **per join** (`GameServer.ts` `startProfileResolve`, ~`:1331-1337`, only ever sets `true`); the match roster is frozen at start (`GameView.ts` `citizenClientIDs`). Already a recorded `0068` residual: *"becoming a citizen mid-lobby shows no icon until the next join"*. Whether a purchase is even **reachable** mid-lobby or mid-match is a step-0 question. |
| ⚠️ Correction to the lead's hand-off | — | The **sync snapshot** in `FlashistFacade.ts` (`isCitizenshipSurfacesEnabledSync`, primed ~`:636`/`:783`) and read by `CitizenBadge.ts:31` is the **kill-switch flag**, not the player's citizen status. It does not make the badge stale after a purchase. |
| Ad-free — `0248` | **Not built** | No citizen check in the ad path. Blocked on `0250` (the client cannot read paid state today). |
| Private lobbies as a perk — `0302` | **Not built** | — |
| Match archive — `0030` | **Not built** | Server-side. |
| Explainer popup's buy button — `0301` | **Not built** | `0301` verification step 2 already asks for the card to update without reload; the popup must too. |
| Yandex's own *"Отключить рекламу"* button | **Out of scope** | Yandex's platform feature, not ours. |

**So the real gaps today are small** (the inbox dot, and the badge in a lobby or match the player is
already in). **The bigger risk is future perks**: `0248`, `0302`, `0030` and every perk that follows will
each read citizen status somewhere, and nothing today makes them update after a purchase.

### Constraints that bind this task
- **Kill switch** (`0236`): nothing here may surface while `isCitizenshipSurfacesEnabled()` is false.
- **`0068` review R3 (wiki: `citizen-verified-icon`)**: the server-side `isCitizen` flag is served on an
  **unauthenticated** endpoint and is acceptable **only while it stays cosmetic**. ⛔ This task must not
  turn it into an entitlement gate. A server-side refresh of it mid-session is allowed only as a
  cosmetic change; any perk that gates on it goes through `0250`'s seam and re-decides R3.
- **`0250`**: the client cannot tell *paid* from *earned* today. Anything paid-only (ad-free) needs
  `0250` first. This task builds the refresh mechanism, not the paid-state read.

## What to build

**Step 0 — inventory (verify, don't trust the table above).** For every surface whose look or behaviour
depends on citizenship or any purchase — client **and** server session — record: where it reads the
status, when it reads it, and whether it changes after a purchase without a reload. Include: can the
player reach a purchase while in a lobby or a match at all? Does anything read status once at platform
init and never again? Check the failure path too (the profile re-read after a purchase fails). Use a
local build with a stubbed payment flow; if `0297`'s owner-run purchase has happened, fold in what the
owner saw. Write the table into `worklog.md` with the date and game version.

**Step 1 — owner decision (hard stop, do not build before it).** Put the choice to the owner with the
step-0 table in hand:

- **(A) Live update — Recommended.** One *"entitlement changed"* signal, fired on a server-confirmed
  grant (after a purchase **and** after session-start reconciliation — today's
  `PURCHASES_RECONCILED_EVENT` is the precedent, and may simply become it). Every surface that shows
  citizen-dependent UI listens and re-reads. Plus a standing rule: *a perk that reads citizen status
  must listen to this signal* — recorded where future perk briefs will see it.
  - *Why recommended:* most surfaces already update or are one listener away; a reload inside the
    Yandex iframe re-runs platform init (up to its 5 s deadline) and loses the player's place; the
    player sees the reward the moment they pay.
  - *Tradeoff:* every future perk must remember to listen. One that forgets is silently stale.
- **(B) "Restart to apply" prompt.** After a confirmed purchase, a friendly popup: *"Citizenship is
  active — restart to apply"*, with a restart button. Simple and covers every surface at once,
  including ones not built yet. *Tradeoff:* an extra step right after paying; never allowed mid-match
  (it would drop the match), so it must wait until the start screen.
- **(C) Hybrid.** (A) for everything that can update live; (B) only for a surface that genuinely
  cannot (none known today).

**Step 2 — build the chosen option.**
- Fix the gaps step 0 confirms (at minimum the inbox dot; the name-change control on a failed re-read if
  confirmed).
- In-lobby / in-match badge: only if step 0 shows a purchase is reachable there. Otherwise record it as
  accepted (the badge shows from the next match) — do not build a mid-match server refresh speculatively.
- **If (B) or (C):** new popup follows the `GameStartingModal.ts` pattern; the custom element goes in
  **both** `src/client/index.html` and `src/client/yandex-games_iframe.html`; shown only on the start
  screen, never mid-match.
- **Analytics — only if a prompt is added:** prompt shown / restart tapped / dismissed, as enum keys in
  `flashistConstants.analyticEvents` (`Category:Action` form, no inline strings), and added to
  `ai-agents/knowledge-base/analytics-event-reference.md`. The existing `Purchase:*:Citizenship` events
  stay unchanged.
- All visible text via `translateText()`; every new key in **both** `resources/lang/en.json` and
  `resources/lang/ru.json` (ru is the audience that matters).
- Kill switch respected everywhere (see Context).

## Verification steps

1. `worklog.md` holds the step-0 table (date, game version, every surface, updates yes/no, evidence) and
   the owner's step-1 choice, quoted.
2. **Logged-in non-citizen, stubbed purchase → granted, no reload:** the card shows citizen state; the
   bell shows the unread dot for the welcome message; the modal shows the Personal tab on first open;
   the name-change control is present.
3. **Same, with the post-purchase profile re-read forced to fail:** no buy button is offered again; the
   documented behaviour for the name-change control holds (live, or recorded as accepted).
4. **Session-start reconciliation path** (an interrupted purchase re-granted at startup): every surface
   in step 2 updates the same way.
5. **Next match after purchase:** the ★ badge shows on the leaderboard and player panel.
6. **If a prompt was built:** it appears only after a server-confirmed grant, only on the start screen,
   never mid-match; restart works in the Yandex iframe template; the three analytics events fire and are
   in the reference doc; en + ru render with no missing-key fallback.
7. **Kill switch off:** no new UI appears and no new profile call is made.
8. Unit tests cover: the signal fires on both grant paths; each listening surface re-reads on it; nothing
   fires on `"error"` or on an abandoned purchase.
9. `npm test` and `npm run lint` pass.

## Notes

- **Depends on:** nothing — can start now. (Step 1's owner decision is a gate *inside* the task. `0297`'s
  real purchase, if done first, is useful input to step 0 but not required.)
- **Blocks:** nothing hard. **Soft sequencing:** [`0302`](../0302-private-lobby-as-a-locked-citizen-perk/brief.md)
  and [`0248`](../0248-suppress-interstitial-ads-for-paid-citizens/brief.md) should plug into this task's
  mechanism rather than each inventing their own; if either ships first, it adds its own listener and
  this task folds it in.
- **Related, linked not merged:** [`0297`](../0297-paid-citizenship-owner-run-test-buy-sequence/brief.md)
  (first real purchase — will show the live behaviour),
  [`0301`](../0301-citizenship-explainer-popup-and-purchase-funnel/brief.md) (explainer popup; its buy
  button must update too), [`0302`](../0302-private-lobby-as-a-locked-citizen-perk/brief.md),
  [`0248`](../0248-suppress-interstitial-ads-for-paid-citizens/brief.md) (ad-free, not built),
  [`0018`](../../done/0018-citizenship-paid/brief.md) (paid purchase flow),
  [`0250`](../0250-authenticated-profile-read-for-paid-entitlement/brief.md) (paid-state read),
  [`0030`](../0030-archive-s3-backed-citizen-gated/brief.md) (archive), `0068` (badge; residual
  "no icon until next join"), `0236` (kill switch), `0019` (reconciliation).
- **Why one brief, not two:** the inventory alone ships nothing a player sees, and the build's shape
  depends on it and on the owner's choice. The owner's own option text describes one task. The owner
  gate sits inside it (the `0301` pattern).
- ⚠️ **Priority 21 is append rank, NOT a merit ranking — flagged for owner confirmation.**
  **On merit this belongs directly below `0301`** (above `0302`), because `0301` drives players to buy
  and this makes the moment after buying feel right, and `0302` should plug into the mechanism this task
  builds. Every row between is open, so an owner-ruled move is possible (ADR-035).
  ✅ **Answered 2026-09-26 by owner ruling** — rank 6, directly below `0301`. ⚠️ `0302` now ranks **above**
  both (rank 2), so it will likely ship before this mechanism exists; per *Blocks* above, it adds its own
  listener and this task folds it in.
- **Open questions for the owner** (also in the producer's hand-off):
  1. **Live update (A) vs restart prompt (B)** — decided at step 1, recommendation (A).
  2. **Should earned citizenship count too?** A player who reaches 100 XP at match end, or claims the
     tenure gift, also becomes a citizen mid-session. Recommendation: yes — same signal, near-zero extra
     cost.
  3. **Badge in the lobby or match the player is already in** — accept "from the next match", or build a
     live server refresh? Recommendation: accept, unless step 0 shows a purchase is reachable there.
- 📌 **Evidence 2026-09-26 (first real purchase, build 0.0.154; relayed by `fkit-lead`, recorded by a
  spawned `fkit-producer`):** the server sent the `citizenship_paid` inbox message at purchase time, but the
  bell's unread dot did **not** show right after the purchase (17:46 MSK screenshot) and **did** show after
  a reload (17:50 MSK) — the predicted inbox-dot gap is confirmed live. Detail: `0297` `worklog.md` §3.
