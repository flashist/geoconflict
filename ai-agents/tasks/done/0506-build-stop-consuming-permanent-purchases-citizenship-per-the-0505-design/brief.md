# Profile box: stop consuming permanent purchases — server-owned consume policy, "held elsewhere" detection, sightings evidence (S1 of the 0505 design)

> ✂️ **2026-10-26 — NARROWED to row S1 of the approved spec** (was ~~"Build: stop consuming permanent purchases
> (citizenship), per the 0505 design"~~, a placeholder for the whole build). Done openly by a spawned `fkit-producer`
> (no owner channel; ADR-021/037) on the OWNER RULING relayed by `fkit-lead`: asked *"Approve the 0505 'stop consuming'
> design and ADR-126 as described?"*, the owner picked **"Approve (Recommended)"** — option text: *"ADR-126 becomes
> accepted; producer splits 0506 into profile-server and game build tasks, then planning starts."* ⛔ Not producer
> precedent. This brief now carries **S1 (profile box) only**. The other three rows of the spec's §12 are new tasks:
> **S2** client → [`0510`](../0510-client-stop-consuming-permanent-purchases-held-elsewhere-offer-and-coordinator-end-state-s2/brief.md),
> **S1v** → [`0511`](../../backlog/0511-verify-0506-live-the-profile-box-answers-held-purchases-quietly-and-says-consume-false-for-citizenship-s1v/brief.md),
> **S2v** → [`0512`](../../backlog/0512-verify-0510-pre-release-checks-t1-t3-on-the-yandex-test-copy-then-live-after-the-game-deploy-s2v/brief.md).
> Narrowed rather than cancelled because S1 is what the held deploy and the four held checks wait on first (box ships
> first, spec §9), and keeping the id keeps every existing `Depends on: 0506` line true. Folder name unchanged (links).

## ID
0506

## Sprint
Sprint 9

> 📌 **Filed on OWNER RULINGS of 2026-10-26**, relayed by `fkit-lead` to a spawned `fkit-producer` (no owner channel;
> ADR-021/037). ⛔ Not producer precedent. Owner picked **"Merge tool + stop consuming"**; full provenance in
> [`0505`](../../done/0505-design-and-adr-stop-consuming-permanent-purchases-citizenship/brief.md).

## Priority
33

> ⚠️ Priority 33 is append rank, NOT a merit ranking — flagged for owner confirmation.
> **On merit this belongs directly below `0505`** (where it sits), because it builds that design. Appended after the
> board's highest rank, never inserted (ADR-035); no row renumbered. Unchanged by the narrowing.

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder

## Context

The **profile-box half** of the owner's *"we don't consume it anymore"*, per the approved spec
[`2026-10-26-0505-design-stop-consuming-permanent-purchases.md`](../../../knowledge-base/reports/2026-10-26-0505-design-stop-consuming-permanent-purchases.md)
(revision 2) and [ADR-126](../../../knowledge-base/decisions/adr-126-permanent-purchases-are-not-consumed-reconcile-flags-a-purchase-held-by-another-profile.md)
(accepted 2026-10-26).

- **The rule:** citizenship and every `durable_item` are **never consumed**; a future consumable kind still is
  (spec §4.2). **The server owns the policy** and lists what the client may consume (§4.3). Safe default = consume
  nothing.
- **D1, ruled 2026-10-26:** a permanent purchase held by a **different** profile than the caller's **verified**
  (`vfy:true`) session is **detected, blocked, and recorded** as evidence for the owner's manual merge (`0503`).
  **Nothing moves automatically** (`0424`'s rule stays). Unverified callers are treated as "no caller" (privacy, G8).
- **Never revoke on absence** (G4).
- This builds on code that is **committed but not deployed** (`0491`, `0492`, `0496`) and ships with it in one
  profile-box deploy (deploy hold, *"Hold it"*). Spec §9 lists exactly what changes in each held piece.
- **Entry gate (spec §12):** spec approved and D1 ruled — **met 2026-10-26**.

### Superseded context (kept for the record)

~~Placeholder until `0505`'s spec is approved … "move purchase to the record now holding it" path, move never copy, with
`issuedAt` freshness against replay …~~ — the spec is approved; the automatic move was **not** picked (D1 = option 1).
No move is built here. The client consume changes are in `0510` (S2), not here.

## What to build

Spec §12 row **S1**, with §4.2–§4.5, §4.7, §5, §6.2, §6.4, §7 and §9 as the detail. The coder's plan quotes the
sections it implements and lists any deviation for owner approval.

1. `isPermanentProductKind` in `src/core` (pure; every product kind classified at compile time).
2. `/complete` returns `consume` (false for permanent products unless the safety switch is on).
3. `/reconcile`: an **optional** verified caller (Bearer optional; absent/invalid/expired → no caller, never refused;
   `vfy:false` → no caller); new fields `grantedTokens` / `consumeTokens` / `heldElsewhere`; `processedTokens`
   **unchanged byte for byte** (old clients).
4. ~~Safety switch `PAYMENTS_CONSUME_PERMANENT`, default **off**, forwarded by the profile deploy path so
   `check:config-parity --enforce` passes. Runbook line with the **one-way-door** warning (§4.3): turning it on makes
   clients consume, and a consumed purchase cannot be brought back.~~
   ✏️ **2026-10-26 — the switch is a SOURCE SETTING, not an env var. OWNER DIRECTION**, typed in the `fkit-lead`
   session and relayed to a spawned `fkit-producer` (ADR-021/037); ⛔ not producer precedent. Verbatim (typos kept):
   *"I am not sure it should be connected to deploys. I should be some settings that we can change in the source files
   and when the redeploy happens, this settings is taken into account"*. **As built:**
   `src/profile-server/ConsumePermanentSetting.ts` exports `CONSUME_PERMANENT_PURCHASES = false`, with the
   **one-way-door** comment beside it (§4.3: turning it on makes clients consume, and a consumed purchase cannot be
   brought back); a test pins it **OFF**; the boot log reads `payments consume-permanent: OFF (ConsumePermanentSetting.ts)`.
   No env var `PAYMENTS_CONSUME_PERMANENT`, no deploy-script wiring. **To flip it:** edit the constant **and** its
   pinning test, commit, redeploy the profile box. Recorded in this folder's `worklog.md` (decision log, item 1).
5. `YandexSignature` exposes the envelope `issuedAt` and each entry's `status`.
6. Migration `011_purchase_holder_sightings.sql` (next free number **at build time** — after `0491`'s `009` and
   `0496`'s `010`) and a best-effort upsert, `vfy:true` callers only; a failing write never fails the reconcile.
7. Shadow counters and **labels-only** logs (§4.7): `issuedAt` presence and age bracket, entry `status` labels,
   reconcile outcome per entry. Never a token, payload, id or signature in a log.

## Verification steps

1. Spec §12 *Testing strategy* — the `src/core` and **server** parts — each covered: `isPermanentProductKind` over every
   kind and the compile-time classification check; schema tests for the new optional fields (present / absent / old
   shape).
2. Route tests (`tests/profile-server/PaymentsRoutes.test.ts`) for §7 rows 1–5, 9, 11, 15: held + same verified caller
   → quiet, no sighting; held + other **verified** caller → `heldElsewhere`, sighting upserted, **no** grant, **no**
   change to either profile; held + other **unverified** caller → quiet, no sighting, counter only; absent / invalid /
   expired Bearer → never refused; `processedTokens` as today in every case; switch on → permanent tokens in
   `consumeTokens` and `consume:true`; a throwing sighting write → still 200 with the right fields; no log line holds a
   token, payload or id (logger mock).
3. `YandexSignature` tests: `issuedAt` present / absent / non-numeric; entry `status` passed through; never throws.
4. Integration (`npm run test:integration`, real Postgres): migration `011` through the runner; the upsert increments
   `seen_count` and `last_seen_at`; `seen_player_id` cascades on erasure; the ledger row is untouched.
5. Paid state is never removed because a purchase is absent (G4) — a test shows it.
6. ~~`npm run check:config-parity` shows `PAYMENTS_CONSUME_PERMANENT` forwarded (no required finding).~~
   ✏️ 2026-10-26 — superseded by the source setting (item 4, owner direction quoted there): there is no env var to
   forward. Instead: `npm run check:config-parity` reports **REQUIRED 0**; the pinning test holds
   `CONSUME_PERMANENT_PURCHASES` at `false`; the boot log line reads `payments consume-permanent: OFF
   (ConsumePermanentSetting.ts)`.
7. `npm test` and `npm run test:integration` green, through the npm scripts (project lock; supertest flake rule applies
   to the route suites).
8. ~~A draft build passes Yandex moderation with an unconsumed citizenship~~ — **withdrawn** (owner, 2026-10-26: our
   iframe updates skip per-update moderation; D3 withdrawn). The pre-release checks T1–T3 are `0512`'s part (a).

## Notes

- **Depends on:** 0505
- **Blocks:** 0510 (S2 builds on S1's contract), 0511, 0512, 0493, 0497, 0498, 0499
- 📌 **2026-10-26 — the pending purchase-flow deploy is HELD for this task. OWNER RULING** given via `AskUserQuestion` in the `fkit-lead` session, relayed to a spawned `fkit-producer` (ADR-021/037); ⛔ not producer precedent. The owner picked **"Hold it"** — option text: *"0493, 0497, 0498, 0499 then also wait on 0506 (design + ADR + build first). All Sprint 9."* The committed-but-undeployed `0491`, `0492`, `0494`, `0495`, `0496` do not deploy until this build is done; their live checks `0493`, `0497`, `0498`, `0499` now list `0506` in their `Depends on:`. Plan the build so it lands on top of that code and ships with it.
- 📌 **2026-10-26, later — hold carried over at the split.** `0506` is now S1 (profile box) only. The held **profile-box**
  code (`0491`/`0492`/`0496`) ships with this task; the held **game** code (`0494`/`0495`/`0488`) ships with `0510`
  (S2). `0493` (box-only check) keeps `0506`; `0497`, `0498`, `0499` keep `0506` and also gained `0510`.
- **Deploy order (spec §9, recommended):** this profile-box deploy first (safe alone: old clients behave as today, §7
  row 12) → `0512` part (a), the owner's T1–T3 on the Yandex-side test copy → the game deploy (`0510`). One weekend
  slot if the checks fit; otherwise the box goes first and the game follows.
  > 📌 **2026-10-26 — there is NO dev profile box. OWNER'S OWN WORDS**, typed in answer to *"Which profile server does
  > the dev game box use?"* via `AskUserQuestion` in the `fkit-lead` session, relayed to a spawned `fkit-producer`
  > (ADR-021/037); ⛔ not producer precedent. Verbatim (typo kept): *"We don't have the dev profile server, so if we need
  > to it test, we better test it on our prod profile server"*. Order that follows: S1 (`0506`) deploys to the **live**
  > profile box first → `0511` (S1v) right after that deploy → `0512` part (a), the owner's T1–T3 on the Yandex test copy
  > against the live profile box → the live game deploy (`0510`).
  So this deploy goes to the **live** profile box, and the live check `0511` runs right after it, before `0512` (a).
- **Ships by:** a profile-box deploy — weekend slot unless urgent (owner rule); committed is not deployed. Live check is
  `0511` (S1v), filed at the split, so none is split out at close.
- **Related:** `0501` (treat `held_elsewhere` as a block — note in its brief), `0503` (one `transferPurchase` primitive,
  built there, not here — note in its brief), `0508` (no dependency; D2).
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
