# Client: a logged-in Buy checks again for an earlier paid-but-not-granted purchase before opening the payment window

## ID
0501

> ℹ️ **ID allocation, checked 2026-10-26 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/`
> (folder names and `## ID` fields agree, base-10 arithmetic) was `0500`. `0501`: no task folder and no reference in
> `ai-agents/tasks/`, `ai-agents/sprints/` or `.claude/`.

## Sprint
Backlog

> 📌 **Filed on an OWNER RULING of 2026-10-26**, given live via `AskUserQuestion` in the lead's Claude Code session and
> relayed by `fkit-lead` (driving `/fkit-sprint-ship-loop` on Sprint 9) to a spawned `fkit-producer` (no owner channel;
> ADR-021/037). The owner picked **"File a task for it (Recommended)"** — option text: *"A separate task on the Backlog
> board to add the re-check to the logged-in Buy. Nothing waits on it."* ⛔ Not producer precedent.

## Priority
Unscheduled

(Backlog board, unranked by design — the Priority cell stays `—`. Producer's read of weight: low-medium — it closes a
possible double charge, but only in a rare case: the server failed to grant a paid purchase **and** the player taps Buy
again in the same page.)

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

### The gap

- Task `0495` (**B3**, the guest "Log in and buy" path) now **checks again before paying**: when a guest taps Buy after
  the flow stopped at `needs_tap`, the client re-runs the purchase check (`reconcilePurchasesNow`) before the profile read
  and `/intent`. If the server reports a paid purchase it failed to grant (`pending_ungranted`), the flow ends at
  `earlier_purchase_pending` — no `/intent`, no payment window. This was `0495` review **R1**, owner ruling 2026-10-26
  **"Check again on the tap (Recommended)"**: *"Tap re-runs the server check. Undelivered purchase found → 'still
  processing, restart later', no payment. Check fails again → payment opens."*
- The **logged-in** Buy path has no such check. It was built in task `0494` (**B2**) as the coordinator's logged-in
  branch (`runLoggedIn` in `src/client/PurchaseCoordinator.ts` — find it by name; line numbers drift). It decides on the
  card's current snapshot and goes straight to the payment window.
- So a **logged-in** player whose earlier purchase was paid but never granted (for example the boot reconcile failed,
  or the server could not grant) can tap Buy and open a **second payment window**. For citizenship the server's
  `/intent` cannot refuse with "already owned", because the first purchase was never granted — so this can be a second
  real charge.
- `0495`'s round-2 review named this boundary and left it out of R1's scope on purpose ("the owner ruled only the guest
  tap; a separate task is the owner's call"). This is that task.

### Read first

- `0495`'s `review.md` — rows **R1** (reviewer finding and coder response) and the round-2 notes on the R1 fix and
  "Not raised — known boundary". `0495`'s `worklog.md` — the round-1 fixes. That is how B3 did it; reuse the same
  pieces (`reconcileNow`, `pending_ungranted`, the `earlier_purchase_pending` end, its popup line and its
  `Purchase:Blocked:EarlierPurchasePending:*` event) rather than inventing parallel ones.
- Spec: [`2026-10-24-design-shared-purchase-flow.md`](../../../knowledge-base/reports/2026-10-24-design-shared-purchase-flow.md)
  §4.3 (step 5, reconcile before the read; "a logged-in buyer starts at step 6"), §5, §7, §10.
- [ADR-125](../../../knowledge-base/decisions/adr-125-log-in-and-buy-skips-the-login-reload-every-purchase-ends-in-a-restart-prompt.md).

### ⚠️ A prior decision this touches — flag, not a blocker

`0494`'s approved plan, decision **OP-3**, kept the logged-in Buy **looking and timing exactly as today**: no re-read and
no "checking" before the payment window. A re-check before every logged-in Buy changes that — every buyer would wait
for the server check (up to the reconcile timeout) before the window opens. The **owner decides at plan approval**
which of these the build does (see *Open question for the plan* below). Do not settle it in code.

## What to build

Add a "check again before paying" step to the logged-in Buy path in the coordinator, matching B3's re-check:

1. Before the logged-in path opens the payment window, run the purchase check (`reconcileNow`), under the trigger the
   owner rules (open question below).
2. **`pending_ungranted`** → end at `earlier_purchase_pending`: no `/intent`, no payment window, the same popup line
   and analytics event B3 uses (per product, through the product config). Decide in the plan what follows the end on
   the logged-in path — B3's guest hand-off (the D3 reload) belongs to a guest who just logged in, so it may not apply
   here; say so explicitly.
3. **`failed` / `timeout`** → go on to the payment window, as ruled for B3 (*"check fails again → payment opens"*).
4. **`processed` / `none`** → go on. If `processed` granted something, the decision must not run on a stale snapshot:
   the plan says how (re-read the profile, or rely on `/intent`'s "already owned" answer) and why.
5. Keep the global purchase latch and every existing logged-in end state (`already_owned`, `cannot_verify`,
   `profile_unavailable`, `error`) unchanged.
6. Tests in the coordinator suite for each row above, plus a test that the logged-in path still makes **no** extra call
   in the case the owner rules should stay as today.

Applies to every product through the shared coordinator (citizenship today; item builds later).

### Open question for the plan — owner rules at plan approval

**When should the logged-in Buy re-check?**

- **(a) Only when this page's earlier check did not come back clean** (boot reconcile failed, timed out, or reported a
  pending ungranted purchase) — *producer's recommendation*. A normal logged-in buyer sees no change (OP-3 holds); only
  the rare at-risk player waits for the check. Cost: the client must remember the boot check's outcome, which it does
  not today (`schedulePaymentsReconciliation` reports no result).
- **(b) Before every logged-in Buy.** Simplest and safest, but every buyer waits for the server check and may see a
  "checking" state — a visible change to today's citizenship purchase, reversing OP-3.

## Verification steps

1. Coordinator tests, logged-in path: re-check `pending_ungranted` → `earlier_purchase_pending`, with no `/intent`
   call and no `runProductPurchase` call, and the `Purchase:Blocked:EarlierPurchasePending:<Product>` event logged.
2. Re-check `failed` and `timeout` → the payment window opens (`runProductPurchase` called once).
3. Re-check `processed` / `none` → the payment window opens; a test shows a grant landed by the re-check is not bought
   again (per the plan's choice in What-to-build item 4).
4. Under the owner's trigger ruling: a test proves the re-check runs exactly when ruled, and no extra call happens
   otherwise.
5. Existing logged-in tests and all B3 guest-path tests stay green unchanged, except where the plan names a change.
6. Any new string is in both `en.json` and `ru.json`; any new event is an enum entry and in
   `ai-agents/knowledge-base/analytics-event-reference.md`; the citizenship purchase event strings are unchanged.
7. `npm test` is green (full run through the npm script — project lock).

## Notes

- **Depends on:** nothing
- **Blocks:** nothing
- **Ruled by the owner:** *"Nothing waits on it"* — do not add this task to any other task's `Depends on:` line.
- **Sequencing note, not a dependency:** this edits `src/client/PurchaseCoordinator.ts`, which `0495` (B3, in
  progress) and the item builds (`0486`, `0010`, `0011`) also touch. Build it **after `0495` has landed**, and not in the
  same uncommitted working tree as another task editing that file, so tests and review scopes do not mix.
- 📝 **2026-10-26 — note for the plan, from the approved `0505` design (not a decision, not a dependency).** The owner
  approved the `0505` spec and ADR-126 (**"Approve (Recommended)"**, relayed by `fkit-lead`; ⛔ not producer
  precedent). That design adds a new reconcile answer and offer state, **`held_elsewhere`** (a permanent purchase this
  verified login's Yandex account already holds on **another** profile), built in `0510` (S2). Spec §4.6, §8 and
  residual R3: a logged-in tap **before** the boot reconcile answers is not covered there — **this task should treat
  `held_elsewhere` like `pending_ungranted`, as a block** (no payment window). The plan decides how; the owner approves
  the plan. `0510` also edits `PurchaseCoordinator.ts` — same working-tree rule as above. The owner's *"Nothing waits
  on it"* stands: no `Depends on:` line was added either way.
- 📌 **2026-10-26 — in scope: the late-login case from `0510` review R3 (OWNER RULING).** Given live via
  `AskUserQuestion` in the `fkit-lead` session (Sprint 9), relayed to a spawned `fkit-producer`; ⛔ not producer
  precedent. Q: *"R3: a late login can still show Buy to a player whose purchase is on another profile. What do we
  do?"* → **"Note it in 0501 (Recommended)"** — option text: *"0510 stays as is; 0501 (Backlog) gets this case. The
  rare gap goes live until 0501 ships. Knock-on: none (checked)."*
  - **The case.** When the Yandex login lands late (task `0397`'s late-auth path) — after the once-per-page boot
    reconcile already asked for a session and got none — that reconcile goes **without a Bearer**, so the server cannot
    answer `heldElsewhere` on that page and the held-elsewhere store stays empty. The card's late re-read then shows
    **Buy** to a logged-in player whose permanent purchase is held on another profile, and a **second real charge** is
    possible. Nothing re-runs the boot pass on late login. Rare: needs a late login **and** a purchase held on another
    profile. Code pointer: `src/client/PaymentsReconciliation.ts` ~:122 (the boot pass's session wait,
    `sessionTokenOrNull()`); line numbers drift — find it by name.
  - **How this task closes it.** The logged-in "check again before paying" re-check (`reconcileNow`, which since
    `0510` sends the Bearer and fills the held-elsewhere store) runs on the logged-in Buy and **blocks on
    `held_elsewhere`** exactly as it blocks on `pending_ungranted`: no `/intent`, no payment window, ending at `0510`'s
    `held_elsewhere` end state with its `Purchase:Blocked:OtherProfile:<Product>` event (per product, through the
    product config). Add the matching coordinator test (re-check `held_elsewhere` → that end, no `/intent`, no
    `runProductPurchase`).
  - ⚠️ **Interacts with the trigger question above.** Under option **(a)** ("re-check only when this page's earlier
    check did not come back clean"), a reconcile that ran **without a Bearer** must count as *not clean* for a player
    who is logged in by tap time — otherwise this case slips through (a) unchanged. The plan says how; the owner rules
    at plan approval as before.
  - **Accepted gap until this ships.** The owner accepted that this gap **goes live with the held `0510` deploy** and
    stays live until this task ships.
  - `0510` stays as is. 0501 stays on the Backlog board; `Depends on:` / `Blocks:` unchanged. Knock-on: none (checked).
- **Ships by:** a game deploy — weekend slot unless urgent (owner rule); committed is not deployed. Split a live verify
  task out at close, per the build-vs-verify rule.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
