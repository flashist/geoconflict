# 0493 worklog — B1v live check

## 2026-10-27 — first live purchase after the B1 + S1 profile-box deploy (owner-run; relayed by `fkit-lead`, recorded by a spawned `fkit-producer`)

The owner ran these checks and relayed the results through the `fkit-lead` session. A spawned producer with no owner
channel recorded them (ADR-021/037). Test account names stay out of git ("account B" here, as in 0512).

**Which client was live when step 1 ran (as step 1's timing note asks):** the **new** game client. Order on 2026-10-27:
profile box deployed, then the live game (repo history: version-bump commits `0.0.166` and `0.0.167`, about 14:28 and
14:33 UTC; whether two live deploys ran is unconfirmed), then the purchase at ~15:03 UTC. So "not consumed" is the
expected result here, not "consumed". Profile box version not read (see 0511).

| Step | Result | Evidence |
|---|---|---|
| 1. Citizenship test purchase grants; **not consumed** — stays in Yandex's list; next reload quiet | ⚠️ **Grant met; "not consumed" not directly observed** | Account B bought citizenship with the new game at ~15:03 UTC. `processed_purchases` newest row = citizenship at 2026-10-27 15:03 UTC → the grant works on the new box. "Stays in Yandex's purchase list" is client-side and was **not** looked at. Consistent with it: 2–3 reloads afterwards were quiet (no restart popup, no card redraw, no inbox message — 0512 T1). |
| 2. `/complete`'s response carries `becamePaidCitizen` | ⚠️ **Not directly observed** | The response body was not read. |
| 3. A normal reconcile still grants a stray (unconsumed) purchase | ❌ **Not run** | Needs a purchase that was never completed. Both of the owner's accounts are now citizens (see 0512), so this needs another account. |
| 4. No reconcile 500s after the deploy; also grep for `reconcile entry failed` | ❌ **Not run** | Neither the 500 check nor the `reconcile entry failed` grep was run. |
| 5. Worklog records date, deployed version, each result; no secrets | ⚠️ **Partial** | Date and results here; profile box version missing. |

**Not closed.** Open: the "not consumed" half of step 1 (look at Yandex's purchase list, or the network tab), step 2,
step 3, step 4 (box-log read incl. `reconcile entry failed`), the profile box version.

## 2026-10-28 — cancelled (spawned `fkit-producer`, relayed owner ruling; agent-closed — not owner-verified)

OWNER RULING in the `fkit-lead` session, relayed (ADR-021/037); ⛔ not producer precedent: the hand-run live checks are replaced by a metrics read — task `0516` (GameAnalytics, on or after 2026-11-03). Option picked: **"The 4 purchase ones (Recommended)"**. The 2026-10-27 results above stand as recorded; `0516`'s Context summarises them.

Where the open steps went: step 4 (no reconcile 500s, plus the `reconcile entry failed` grep) → `0511` step 8; the profile box version (step 5) → `0511` step 7 (already there); the game client version → `0511` step 9; step 3 (a stray purchase still granted) → `0511` step 11, as passive counter evidence only. Step 1's "not consumed" half, step 2 and a purchase-driven step 3 need a paid purchase: not carried. The client-side metrics → `0516` step 2.
