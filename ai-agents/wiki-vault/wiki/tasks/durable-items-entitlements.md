# Durable Items Base: Entitlements Migration, Item Grant Branch, Private Ownership, Already-Owned Refusal — B4 (task 0496)

**Source**: `ai-agents/tasks/done/0496-durable-items-base-entitlements-migration-item-grant-branch-private-ownership-and-already-owned-refusal-b4/brief.md` (`plan.md`, `review.md`, `worklog.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 9, rank 25 (ADR-035 append rank; on merit directly below `0495`) / task `0496` / build B4 of the shared purchase flow

> ✅ Closed 2026-10-26. Plan owner-approved 2026-10-24 (OP-1 *"After B2 is done"*, OP-2 *"Leave it alone"*, OP-3
> *"Accept it"*). `npm run test:integration` 14 suites / 203 tests green (`010` applied); `npm run test:scripts:docker`
> 55 passed (13 tables, fingerprint identical); full `npm test` 5042 green on a re-run (run 1: one untraced failure in
> the untouched `tests/server/MasterFeedbackRoutes.test.ts` — now `0500`).
> 🏗️ **2026-10-26 sync (`4e9160a`): committed in `a3c32b4`; `git tag --contains` → none ⇒ NOT deployed.** Live check:
> `0497` (B4v, Sprint 9, `🔲 Backlog`).

## Goal

The generic base for items you buy once ("durable items"), built **standalone** — no real item id exists yet; tested
with a test-only product string that is **not** added to `PAYMENT_PRODUCT_IDS`.

## Key Changes

- **`migrations/010_player_entitlements.sql`** — table `player_entitlements`, PK `(player_id, product_id)`, FK to
  `players` with cascade. Number = next free after `0491`'s `009`.
- `PaymentsRepository.ts` — `durableItemGrant()` factory (`INSERT … ON CONFLICT DO NOTHING`), `listEntitlements()`,
  a registry seam for tests, the item inbox template, ordered post-grant sends.
- `Routes.ts` — `entitlements` read for `GET /v1/profile` and login; **`/intent` → 409 `already_owned`** via the pure
  `intentRefusal(kind, isOwned, callerVerified)` — only for a **verified** caller who owns the item.
- `src/core/profile/PlayerProfile.ts` — optional `entitlements` on the owner (verified) view schema only.
- `PublicProjection.ts` — the unverified view never carries `entitlements` and drops item-purchase inbox messages
  (a "your item is ready" message would also reveal "paid").
- `PlayerProfileView.ts` parses `entitlements` (missing ⇒ unknown, `null`); `CitizenshipCard.snapshot()` fills it.
- **Restore drill**: `verify.sql` and the runbook now cover **13 tables** (`player_rewarded_match_xp` from `009`,
  `player_entitlements` from `010`).

## Outcome

- Ownership is **private** (owner OD-2, *"Private (Recommended)"*) — ADR-116 Decision 4 unchanged.
- ⚠️ **Accepted residual:** the `/intent` 409 route path is first exercised end to end by the first real item build;
  B4 pins the rule as the pure function (8 cases).
- ⚠️ **Deploy order:** profile box only after `0491`'s migration `009`. The live restore drill must **STOP** before
  seeding on a box missing `009` or `010` (runbook warning).
- Blocks `0497`, and with `0495` the item builds `0486`, `0010`, `0011` (owner OD-3).

## Related

- [[systems/shared-purchase-flow]] — the flow
- [[tasks/shared-purchase-flow-design]] — task `0484`, the spec (OD-2)
- [[tasks/purchase-grant-registry]] — task `0492` (B1), the registry this adds a branch type to
- [[tasks/guest-log-in-and-buy]] — task `0495` (B3)
- [[tasks/rewarded-match-xp-grant-route]] — task `0491`, whose migration `009` must deploy first
- [[decisions/adr-116-verified-login]] — Decision 4, extended to item ownership
- [[systems/player-profile-store]] — the store and the restore drill
- [[tasks/profile-backup-restore-reproof-006]] — the drill's table inventory (now 13)
- [[decisions/sprint-9]] — the board (rank 25); `0497` at 26
- [[tasks/stop-consuming-profile-box-s1]] — task `0506`, 2026-10-26: durable items are never consumed either; this code now deploys with S1 (owner: *"Hold it"*)
