# 0511 worklog — S1v live check

## 2026-10-27 — first live read (owner-run; relayed by `fkit-lead`, recorded by a spawned `fkit-producer`)

The owner ran these read-only checks on the **live** profile box and relayed the results through the `fkit-lead`
session. A spawned producer with no owner channel recorded them (ADR-021/037). No agent touched the box.

**Deploys that day (as relayed):** the profile box was deployed, then the live game. Repo history shows two live-game
version-bump commits, `0.0.166` and `0.0.167` (both 2026-10-27, about 14:28 and 14:33 UTC). Whether two live deploys
actually ran is **unconfirmed**. The profile box's own deployed version was **not read** (GET /health not checked).

| Step | Result | Evidence |
|---|---|---|
| 1. Migrations `009`, `010`, `011` applied; `purchase_holder_sightings` exists, 0 rows | ✅ **Met** | `schema_migrations` newest four read `012, 011, 010, 009` (owner). `purchase_holder_sightings` count **0**. ⚠️ Read after the game deploy too (see 0512), so 0 here is a T3 result as well, not only the "expected 0 before S2" of this step. `012` is newer than this step names; not explained here (not a failure of this step). |
| 2. `/complete` answers `consume:false` for a citizenship test purchase | ⚠️ **Not directly observed** | The response body was not read. Indirect only: after account B's live purchase (~15:03 UTC, see 0493/0512) reloads were quiet, which fits "not consumed". |
| 3. A reconcile with an already-held token answers quietly | ⚠️ **Not directly observed** | Indirect only: account B's 2–3 reloads after the purchase showed no popup, card redraw or inbox message (0512 T1). The reconcile response itself (no grant, not in `grantedTokens`, not in `consumeTokens`) was not read. |
| 4. New server counters move; does the live payload carry `issuedAt` | ❌ **Not run** | Counters not checked. `issuedAt` presence (spec §14 item 2) not recorded. |
| 5. No token, payload, player id or signature in the new log lines | ❌ **Not run** | The content of the new (shadow) log lines was not read. |
| 6. Boot log reads `payments consume-permanent: OFF (ConsumePermanentSetting.ts)` | ✅ **Met** | Owner read that exact line in the boot log. |
| 7. Worklog records date, deployed version, each result; no secrets | ⚠️ **Partial** | Date and results recorded here. Profile box version **missing** (step above). |

Also read (not a step of this task): `player_merges` count **0**.

**Not closed.** Steps 2–5 and the profile box version are still open. Remaining work: read the box version (GET
/health), the new counters, the new log lines' content (for leaks), and whether payloads carry `issuedAt`; for steps 2
and 3, read the `/complete` and reconcile responses (network tab or box log) on a test purchase — see the account
problem in 0512's worklog.
