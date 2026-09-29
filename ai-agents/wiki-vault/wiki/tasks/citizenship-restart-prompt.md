# After a Purchase, a "Restart to Apply" Popup (task 0303)

**Source**: `ai-agents/tasks/done/0303-the-whole-game-reflects-a-purchase-without-a-reload/brief.md`
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 6, rank 12 / task `0303`

> ✅ Done (agent-closed — not owner-verified). Committed in `68303d5`. **The `Main.ts` wiring has no unit
> test** and nothing was seen live in the Yandex iframe — the owner checks it at the next real purchase.

## Goal

The owner, voice-dictated: *"… after purchasing the citizenship or doing any other purchase … the game isn't
changing anything right so in order to … disable advertisements etc etc we need to restart the game."*
Inventory what does not update after a purchase, then choose live update vs a restart step.

## Key Changes

- **Step-0 inventory (code-read):** the real gaps were small — the inbox bell dot, and the ★ badge in a lobby
  or match already in progress. The larger risk was **future perks**, each reading citizen status somewhere.
- **Owner ruling Q1 (verbatim):** **"'Restart to apply' popup"** — *"After paying, a popup offers a restart.
  Covers everything, but an extra tap + up to ~5 s reload in Yandex; needs new text, a popup, 3 analytics
  events."* ⚠️ **Not the recommended option** (live update, (A)); the owner chose (B), not "Both".
- Other rulings: Q3 **"Accept, ★ from next match"**; Q4 **"Tests + next real purchase"**; Q-A **"Same restart
  popup after"** the tenure-gift thank-you popup, **only** for players the gift made citizens; Q-B texts
  approved as written; Q-C **"Leave both out; file (ii)"** — the stale-read race became `0326`.
- **Built:** `src/client/CitizenshipRestartOffer.ts` (offer logic) and `<citizenship-restart-modal>` in
  **both** HTML templates; the signal is dispatched in `CitizenshipPurchase.ts` right before `return
  "granted"`, nowhere else. The popup shows **only on the start screen** — a grant made in a lobby waits, and
  is dropped if the match starts (the page reloads after a match anyway). Restart uses `reloadApp()`, **not**
  the login-restart helper (whose events feed `0274`'s monitoring and which refuses without sessionStorage).
  **No popup after session-start reconciliation** (the page just loaded).
- **Events:** `Citizenship:RestartPrompt:{Shown,Restart,Later}` — not split by source
  ([[systems/analytics]]).

## Outcome

- **Review rulings (verbatim):** R1 **"Accept in 0303, file bug"** — closing a joined private-lobby window
  never ran `handleLeaveLobby`, so a grant made there stayed pending; filed and fixed as `0327`. R2
  **"Accept as harmless"**. R3 **"Tiny fix in 0303"** — a refused restart keeps the offer waiting.
- ⚠️ **Correction recorded in the worklog:** the plan claimed the private-lobby close path was covered via
  `closeAndLeave()`; that method had **no caller** — the claim was wrong.
- **Standing note for perks:** a perk that reads status at load time is fine (the popup offers a restart and a
  match end reloads anyway); a grant made by **session-start reconciliation** applies from the next load unless
  the perk listens to `PURCHASES_RECONCILED_EVENT`.
- **Not verified:** the popup, Restart reloading inside the Yandex iframe, the bell dot after reload, the three
  events arriving, whether Yandex shows its own ad on the reload, and the tenure → restart path live.

## Related

- [[tasks/citizenship-paid]] — task `0018`, the purchase flow whose `granted` result triggers the popup
- [[tasks/tenure-xp-grant]] — task `0253`, the gift that can also trigger it (Q-A)
- [[tasks/private-lobby-citizen-perk]] — task `0302`, the first perk reading citizen status
- [[tasks/private-lobby-close-leaves-lobby]] — task `0327`, the bug review R1 filed
- [[tasks/citizenship-card-newest-profile-read]] — task `0326`, the stale-read guard Q-C filed
- [[tasks/citizen-verified-icon]] — task `0068`: ★ from the next match (Q3)
- [[systems/analytics]] — the three `Citizenship:RestartPrompt:*` events
- [[decisions/sprint-6]] — the board carrying this task
- [[tasks/citizenship-card-vanishes-investigation]] — task `0318` (2026-09-28): why the citizenship card vanished after a match on a shaky connection
