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

## 2026-10-28 — read-only box checks over SSH (agent-run by a spawned `fkit-coder`; relayed by `fkit-lead`, recorded by a spawned `fkit-producer`)

Run 2026-10-28 ~07:15 UTC, **read-only**, over SSH, on the owner's read approval, given in chat in the `fkit-lead`
session on 2026-10-28, verbatim: *"try it again and let me know if ssh-is still disabled"*. **Nothing was written on the
box.** No ids, tokens, signatures, IPs, endpoints or payloads recorded here.

**Versions (step 7):** profile box `/health` **`0.0.165-profile.1`**, commit `3e3a7c20`; containers created 2026-10-27
14:03–14:04 UTC. Live game (public version route): **`0.0.167`**.

| Step | Result | Evidence |
|---|---|---|
| 1. Migrations `009`–`011` applied; `purchase_holder_sightings` exists | ✅ **Pass** | `schema_migrations` has `009`–`012`, all applied 2026-10-27 14:04:45 UTC. `purchase_holder_sightings`: 0 rows. |
| 2. `/complete` answers `consume:false` for citizenship | ⚠️ **Can't tell — inferred pass** | One `/complete` since the deploy (15:03:41 UTC): HTTP 200, +1 citizenship row in `processed_purchases`. The response body is not logged. The code sends `consume: mayConsume()`, which is false for citizenship while the setting is OFF. |
| 3. A reconcile with an already-held token answers quietly | ✅ **Pass for the grant part** · ⚠️ **can't tell for `consumeTokens`** | 10 reconciles: outcome `held` 8, `held_no_caller` 2, `granted` 0. |
| 4. New counters move; `issuedAt` present | ✅ **Pass, from the log copy** (the Uptrace counters were **not** read) | Outcomes `held` 8 / `held_no_caller` 2; callers verified 8 / none 2. `issued_at=under_1m` on all 11 payloads; `issuedAt` present and numeric on every one (spec §14 item 2: **yes, the live payload carries it**). Statuses: `/complete` `success:1`; every reconcile `absent:1`. |
| 5. No token, payload, player id or signature in the new log lines | ✅ **Pass (leak check clean)** | 22 new lines. Only the fixed labels `construction=`, `issued_at=`, `statuses=`, `caller=`, `outcomes=` appear. Zero ids, tokens, signatures, IPs or payloads. |
| 6. Boot log reads `payments consume-permanent: OFF (ConsumePermanentSetting.ts)` | ✅ **Pass** | Exactly that line (re-read; also met 2026-10-27). |
| 7. Date, deployed version, results; no secrets | ✅ **Now complete** | Versions above. |
| 8. No reconcile 500s; no `reconcile entry failed` (from `0493` step 4) | ✅ **Pass** | `reconcile entry failed` 0, `reconcile skip` 0, `holder sighting failed` 0, warn 0. nginx 27–28 Oct: `/reconcile` 10 (all 200), `/complete` 1 (200), `/intent` 61 (all 200), no 5xx. |
| 9. Which game client version is live (from `0493`, `0498`, `0499`, `0512`) | ✅ **Pass** | `0.0.167`. |
| 10. `purchase_holder_sightings` re-read (from `0512` step 3) | ✅ **Pass** | 0 at ~07:16 UTC 2026-10-28. |
| 11. Passive evidence that reconcile grants a stray purchase (from `0493` step 3) | ⚪ **Unproven — not a fail** | 0 `granted` outcomes since the deploy; no purchase made. |
| 12. Step sources named | ✅ | As listed in the brief (steps 8–11). |

### Reported, not diagnosed

- **Boot-time errors:** at boot (14:04:36 UTC) the API logged 2 errors, `entitlements lookup failed: relation
  "player_entitlements" does not exist`, about 10 s **before** migrations `009`–`012` were recorded (14:04:45). None
  since; the table exists now. No personal data in the error text. Not investigated.
- **For `0516`:** 61 `/intent` vs 1 `/complete` since the deploy (nginx, 27–28 Oct). Compare with the GameAnalytics
  `Purchase:Started` / `Abandoned` counts at the 0516 read.

**Status unchanged (`🔄 In progress`); not closed** — closing is the owner's decision, being put to him by `fkit-lead`.
Still open or partial: step 2 (inferred only), step 3's `consumeTokens` half, step 4's Uptrace counters (not read),
step 11 (unproven).

## 2026-10-28, later — OWNER RULING: close, the purchase-only parts accepted as unproven (recorded by a spawned `fkit-producer`)

Given via `AskUserQuestion` in the `fkit-lead` session on 2026-10-28, relayed to a spawned `fkit-producer` with no owner
channel (ADR-021/037); ⛔ not producer precedent. Verbatim:

- Question: *"0511 is done apart from 2 steps that need a real purchase. Close it?"*
- Answer: **"Close, accept 2 as unproven (Recommended)"** — option text: *"Producer closes 0511; the 2 purchase-only
  steps are recorded as unproven. Knock-on: none (checked); nothing waits on 0511."*

**Accepted as unproven by this ruling:**

| Step | What stays unproven | Why |
|---|---|---|
| 2 | The `/complete` reply body (`consume:false`) was never seen | Inferred pass only: HTTP 200 + the code path (`mayConsume()` false while the setting is OFF). The body is not logged. |
| 3 | The `consumeTokens` part of the quiet reconcile answer was never seen | Inferred pass only; the grant part passed (`granted` 0 of 10). |
| 11 | That reconcile still grants a stray purchase | No `granted` outcome since the deploy; no purchase made. |

**Also noted:** step 4 was read from the **log copy** of the counters, not from Uptrace.

Closed via `/fkit-task-done` with `✅ Done (agent-closed — not owner-verified)` — a spawned producer is an agent, even
on a relayed owner ruling (ADR-033 §5).

**Follow-up filed:** the boot-time `player_entitlements does not exist` errors (2026-10-28 entry above) → task `0517` on
the Backlog board (owner ruling *"Brief a task on Backlog (Recommended)"*, same session).

## 2026-10-28, after the close — OWNER RULING: the close covers all 3 unproven items, not 2 (recorded by a spawned `fkit-producer`)

The close question above said *"2 steps"*; this worklog's own table lists **3** unproven items (flagged by the wiki
sync). The owner was asked again, via `AskUserQuestion` in the `fkit-lead` session on 2026-10-28, relayed to a spawned
`fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Verbatim:

- Question: *"0511 closed with 3 things unproven, not 2 (reply body, its 'consume' part, and 'stray purchase still
  granted'). OK?"*
- Answer: **"Yes, all 3 accepted (Recommended)"** — option text: *"Producer adds this to 0511's record; nothing else
  changes. Knock-on: none (checked)."*

So the close accepts as unproven **all three**: step 2 (the `/complete` reply body, `consume:false`), step 3 (the
`consumeTokens` part of the quiet reconcile answer), and step 11 (reconcile still grants a stray purchase). Nothing else
changes: status and board untouched.
