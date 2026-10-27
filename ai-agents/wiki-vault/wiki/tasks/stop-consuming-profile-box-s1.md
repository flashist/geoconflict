# Profile Box: Stop Consuming Permanent Purchases — Server-Owned Consume Policy, "Held Elsewhere" Detection, Sightings Evidence (task 0506, S1)

**Source**: `ai-agents/tasks/done/0506-build-stop-consuming-permanent-purchases-citizenship-per-the-0505-design/brief.md` (`plan.md`, `worklog.md`, `review.md` in the same folder read as evidence)
**Status**: done (agent-closed — not owner-verified) — committed `baaf2f8`, **not deployed**
**Sprint/Tag**: Sprint 9 — live player incident (rank 33, append rank flagged)

## Goal

The **profile-box half** of the `0505` design ([[tasks/stop-consuming-design]], row S1): the server decides what the
client may consume, tells "granted now" / "held by you" / "held elsewhere" apart, and records a sighting when a
verified caller's page carries a purchase another profile holds. Nothing moves automatically (`0424`). Narrowed on
2026-10-26 from a whole-build placeholder to S1 only; the client half is `0510`. Hub:
[[decisions/incident-2026-10-25-lost-citizenship-player-id-change]].

## Key Changes

- `isPermanentProductKind` in `src/core` (pure; every kind classified at compile time).
- `/complete` returns `consume` (false for permanent products unless the switch is on).
- `/reconcile`: an **optional** verified caller (absent / invalid / expired Bearer → no caller, never refused;
  `vfy:false` → no caller); new fields `grantedTokens`, `consumeTokens`, `heldElsewhere`; `processedTokens` unchanged
  byte for byte for old clients.
- **The safety switch is a source setting** — owner direction during plan approval (verbatim, typos kept): *"I am not
  sure it should be connected to deploys. I should be some settings that we can change in the source files and when the
  redeploy happens, this settings is taken into account"* → [[decisions/adr-127-consume-switch-source-setting]].
  `src/profile-server/ConsumePermanentSetting.ts` exports `CONSUME_PERMANENT_PURCHASES = false` beside a one-way-door
  comment; a test pins it OFF; the boot log reads *"payments consume-permanent: OFF (ConsumePermanentSetting.ts)"*. No
  env var, no deploy-script wiring; `check:config-parity` reports `REQUIRED 0`.
- `YandexSignature` exposes the envelope `issuedAt` and each entry's `status`.
- Migration `011_purchase_holder_sightings.sql` and a best-effort upsert (`recordHolderSighting`), `vfy:true` callers
  only; a failing write never fails the reconcile.
- Shadow counters in `src/profile-server/Telemetry.ts` (reconcile entries, reconcile caller, payload `issuedAt`
  bracket, entry status) and **labels-only** logs — never a token, payload, id or signature.
- Restore drill helpers updated for the new table.
- **Review:** the reviewer found that no runbook carried the one-way-door warning → a *"Payments safety setting —
  consume permanent purchases"* section was added to `ai-agents/knowledge-base/profile-backup-restore-runbook.md`
  (where it lives, how to read the boot line, how to flip it, and that it **turns back OFF without saying so** on an
  older commit or a rollback). R3 corrected that section: **OFF protects nothing until the `0510` game deploy** — until
  then every client still consumes every purchase.

## Outcome

- **Tests (worklog):** full `npm test` 241 suites / 5297 tests green after review. Run by the coder; **not re-run by
  the wiki**.
- **Not deployed** (`git tag --contains baaf2f8` → none, 2026-10-27). **Deploy order** (ADR-127): this to the **live**
  profile box first (with the held `0491`/`0492`/`0496` and migrations `009`–`011`; `0503`'s `012` too if committed by
  then) → `0511` (S1v) → `0512` part (a), the owner's T1–T3 → the live game deploy (`0510`). Safe alone: old clients
  behave as today.
- **Live checks:** `0511` (S1v) and the held `0493` are `🔲 Backlog` on [[decisions/sprint-9]].

## Related

- [[decisions/adr-126-permanent-purchases-not-consumed]] · [[decisions/adr-127-consume-switch-source-setting]]
- [[tasks/stop-consuming-design]] — task `0505`, the design
- [[tasks/stop-consuming-client-s2]] — task `0510`, S2, which reads this contract
- [[tasks/profile-merge-tool]] — task `0503`, whose dry run prints the sightings
- [[tasks/purchase-grant-registry]] — task `0492`, held profile code shipping with this
- [[tasks/durable-items-entitlements]] — task `0496`, migration `010`, shipping with this
- [[tasks/rewarded-match-xp-grant-route]] — task `0491`, migration `009`, shipping with this
- [[systems/player-profile-store]] · [[systems/shared-purchase-flow]]
- [[decisions/incident-2026-10-25-lost-citizenship-player-id-change]]
