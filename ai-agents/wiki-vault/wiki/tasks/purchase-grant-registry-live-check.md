# Live Check B1v: Citizenship Purchases Still Grant After the B1 Profile-Box Deploy (task 0493) — CANCELLED

**Source**: `ai-agents/tasks/cancelled/0493-verify-0492-live-citizenship-purchases-still-grant-after-the-b1-profile-box-deploy/brief.md` (`worklog.md` in the same folder read as supporting evidence)
**Status**: cancelled (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 9, rank 22 (ADR-035 append rank, flagged; on merit directly below `0492`) / task `0493` — live check B1v of the shared purchase flow

> ⛔ Cancelled 2026-10-28 via `/fkit-task-cancelled` by a spawned `fkit-producer`. Reason, as on the board: *"Hand-run
> live verification replaced by GameAnalytics metrics verification in `0516` (owner ruling 2026-10-28, relayed by
> `fkit-lead`); server-side read-only steps folded into `0511`."* The owner typed *"cancel the verification by hand
> task, brief a task to verify it by metrics after some amount of time (e.g. by checking the GameAnalytics metrics)"*,
> then picked **"The 4 purchase ones (Recommended)"**, **"1 week, ~3 Nov"** and **"Sprint 9 (Recommended)"**.

## Goal

Prove citizenship sales still work after `0492` ([[tasks/purchase-grant-registry]]) reached the live profile box: a
test purchase grants citizenship and (since ADR-126) is **not** consumed; `/complete` carries `becamePaidCitizen`; a
normal reconcile still grants a stray purchase; no reconcile 500s, and no `reconcile entry failed` lines (after B1 a
failing entry no longer gives a 500, so the grep is the real check). Owner-run.

## Key Changes

Nothing built. Live run 2026-10-27, owner-run, relayed by `fkit-lead`; test accounts are "account A/B" only.

## Outcome

- **Order on 2026-10-27:** profile box deployed, then the live game, then account B's citizenship purchase ~15:03 UTC —
  so the **new** client was live and "not consumed" was the expected result.
- **Step 1:** grant ✅ (newest `processed_purchases` row = citizenship at 15:03 UTC); "stays in Yandex's purchase list"
  **not looked at**; 2–3 reloads afterwards were quiet.
- **Step 2** (`becamePaidCitizen` in the reply): not observed. **Steps 3–4:** not run — step 3 needs a never-completed
  purchase, and both of the owner's accounts are now citizens.
- **Where the open steps went:** step 4 → `0511` step 8 (✅ passed 2026-10-28: 0 `reconcile entry failed`, no 5xx);
  versions → `0511` steps 7 and 9; step 3 → `0511` step 11 as passive counter evidence only (**unproven** — no
  `granted` outcome). Step 1's "not consumed" half, step 2 and a purchase-driven step 3 need a paid purchase and were
  **not carried** anywhere. Client-side metrics → `0516`.

## Related

- [[tasks/purchase-grant-registry]] — task `0492`, the build this checked
- [[tasks/stop-consuming-profile-box-live-check]] — task `0511`, which took its server-side steps
- [[tasks/stop-consuming-client-live-check]] — task `0512`, same live session (account B)
- [[systems/shared-purchase-flow]] · [[decisions/adr-126-permanent-purchases-not-consumed]]
- [[decisions/sprint-9]] — the board (rank 22)
- [[tasks/guest-log-in-and-buy-live-check]] — task `0498` · [[tasks/rewarded-video-live-check]] — task `0499`: cancelled by the same ruling
- [[tasks/stop-consuming-profile-box-s1]] — task `0506`, deployed in the same profile release
