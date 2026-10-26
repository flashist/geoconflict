## 0506 (S1, profile box): implementation plan. Plan only, nothing written.

**Summary**
- **The plan follows your new fact (2026-10-26) that there is no dev profile box.** S1 deploys straight to the live profile box, together with the held 0491/0492/0496 code and migrations 009, 010 and 011. The owner then runs T1–T3 against it from the Yandex test copy. The design's §14 item 1 ("dev box gets 011 and the env var") is superseded, and the plan has no dev-box step.
- **S1 is safe live on its own with today's game client.** The live client never sends a Bearer token to `/reconcile`, so every entry takes the "no caller" path: no `heldElsewhere`, no sighting row, `processedTokens` exactly as today. Its zod schemas are plain `z.object` (not strict), so it silently drops the new `consume`, `grantedTokens`, `consumeTokens` and `heldElsewhere` fields. The CORS rules already allow `Authorization`.
- **I found ten gaps or departures from the spec that need the owner's approval.** Three are put as questions at the end (below). The biggest is a hole in the spec: a fresh grant through reconcile to someone else's purchase intent, while a different verified player is calling.
- **Files I share with 0507: none.** 0507's build is in `src/client` plus `index.html` and `yandex-games_iframe.html`; S1 touches none of those. But full `npm test` and `npx tsc` run over the whole working tree, so a red caused by 0507's unfinished work can show up in S1's checks. I would report it under 0507, not treat it as S1's fault.
- **A type error would take the live box down.** The profile image runs `ts-node/esm`, which type-checks at boot. So `npx tsc --noEmit -p tsconfig.json` must be clean before any deploy.

---

### Sources
- Brief, approved spec (revision 2, all of it), ADR-126 (accepted).
- Code at `aca097e1` plus the working tree: `Routes.ts` (payments block :1036-1283, `resolveCaller` :561-584, `intentRefusal` :370), `YandexSignature.ts`, `PaymentsRepository.ts`, `PaymentsContract.ts`, `Telemetry.ts`, `LoginCreationSwitch.ts`, `Server.ts`, `setup-profile.sh`, `build-deploy-profile.sh`, the config-parity checker and allowlist, the deploy-hardening harness, the restore-drill SQL, and the integration helpers.
- Yandex sdk-purchases page, read today:
  - the only documented entry `status` value is `"waiting"`;
  - the example `issuedAt` is `1571233371`, which is in seconds.
- Running `node scripts/check-config-parity.mjs --pipeline=profile --report-only` today gives `REQUIRED 0`.

### Spec sections implemented
§4.2, §4.3 (switch plus one-way warning), §4.4 (server half), §4.5, §4.7, §5 (server contracts), §6.2, §6.4 (`issuedAt` stored, nothing moved), §7 rows 1–5, 9, 11, 12, 15, §9 (config parity), and the server and core parts of §12 S1 *Testing strategy*. No `transferPurchase` is built; that is 0503's.

### Step-by-step

**1. `src/core/profile/PaymentsContract.ts` (core, so tests are mandatory)**
- Add `isPermanentProductKind(kind: ProductKind): boolean`. It uses an exhaustive `switch` with a `never` default: `citizenship` and `durable_item` return true. A new kind then fails `tsc` until it is classified. Jest/SWC does not type-check, so `tsc` is the real gate here.
- `PurchaseCompleteResponseSchema` gains `consume: z.boolean().optional()`.
- `PurchaseReconcileResponseSchema` gains three optional fields: `grantedTokens` and `consumeTokens` (each `z.array(z.string().min(1))`), and `heldElsewhere` (`z.array(PaymentProductIdSchema)`).
- `processedTokens` and `failedCount` do not change. The old doc comment ("Every token now safe to consume") becomes wrong, so it is fixed: it is now the legacy meaning, for old clients only.
- Tests, in the existing `tests/core/profile/PaymentsContract.test.ts`:
  - `isPermanentProductKind` over every kind;
  - every `PRODUCT_DEFINITIONS` entry is classified as permanent;
  - schema present / absent / old shape for both responses;
  - an unknown product id inside `heldElsewhere` fails to parse. This is why the server only ever sends known ids.

**2. `src/profile-server/YandexSignature.ts`**
- `VerifiedPurchase.status: string | null`, read from the entry's `status` field.
- `VerifiedPayload.issuedAt: number | null`: a finite number from the top-level envelope, otherwise null (absent, or not a number).
- Still never throws.
- Tests in `YandexSignature.test.ts`: `issuedAt` present, absent, and a string; `status` passed through and absent; the flat (non-envelope) shape gives null.

**3. Telemetry (`src/profile-server/Telemetry.ts`)**
New bounded counters, labels only:

| Counter | Labels |
|---|---|
| `geoconflict.profile.payments.reconcile.entries` | `outcome` = `granted`, `held`, `held_no_caller`, `held_elsewhere_verified`, `held_elsewhere_unverified`, `already_processed_race`, `skip_unmapped_payload`, `skip_unknown_intent`, `skip_product_mismatch`, `failed` |
| `geoconflict.profile.payments.reconcile.caller` | `state` = `none`, `invalid`, `expired`, `unverified`, `verified`, `session_unavailable` |
| `geoconflict.profile.payments.payload.issued_at` | `route` (`complete`/`reconcile`) × `bracket` (see deviation 1) |
| `geoconflict.profile.payments.entry.status` | `route` × `status` (see deviation 2) |

- Add the matching no-op methods.
- Four test files that build a full `ProfileMetrics` object need the new methods: `AlertRoutes`, `InternalPathCase`, `RouteMetrics` and `RewardedMatchXpRoutes`.
- `Telemetry.test.ts` gains cases for the new counters.

**4. Safety switch `PAYMENTS_CONSUME_PERMANENT`**
- New file `src/profile-server/ConsumePermanentSwitch.ts`, modelled on `LoginCreationSwitch.ts` but **failing toward OFF**, because ON is the one-way door:
  - `true` (any case, trimmed) turns it on;
  - blank or `false` leaves it off;
  - anything else leaves it off and logs a warning naming the variable. Unlike the login switch, it does not echo the raw value.
- `Server.ts` reads `process.env.PAYMENTS_CONSUME_PERMANENT` literally (so the parity checker sees it) and logs `payments consume-permanent: OFF|ON (PAYMENTS_CONSUME_PERMANENT)` at boot.
- `PaymentsConfig` gains `consumePermanent?: boolean`, defaulting to false.
- New test file `tests/profile-server/ConsumePermanentSwitch.test.ts`.

**5. Migration and repository**
- `migrations/011_purchase_holder_sightings.sql`: exactly the DDL in spec §6.2. Like 010, it is deliberately not idempotent (the runner wraps it in one transaction).
- `PaymentsRepository.recordHolderSighting(s)`:
  ```sql
  INSERT … ON CONFLICT (purchase_token, seen_player_id) DO UPDATE
  SET last_seen_at = now(), seen_count = seen_count + 1,
      holder_player_id = EXCLUDED.holder_player_id,
      payload_issued_at = EXCLUDED.payload_issued_at
  ```
  The holder and `issuedAt` columns take the latest value seen (deviation 9).
- `payload_issued_at` is `to_timestamp(issuedAt)` only if the value is plausible (between 2019 and now + 1 day); otherwise null. A value like 1e15 would otherwise raise a Postgres range error.
- Add the method to the `PaymentsRepo` interface (required). Update the payments mocks in `PaymentsRoutes.test.ts`, `Routes.test.ts` and `SessionRoutes.test.ts`, and add a mocked-pool case in `PaymentsRepository.test.ts`.

**6. Routes (`Routes.ts`)**
- **`resolveOptionalCaller(req)`**: no header, sessions not configured, a non-Bearer header, an invalid or expired token → no caller. `vfy:false` → no caller, but the counter records it as `unverified`. `vfy:true` → the caller's player id. It never refuses a request and **never calls `metrics.sessionRejected`** (deviation 6).
- **Exported pure helpers**, next to `intentRefusal`:
  - `mayConsume(productId: string, consumePermanent: boolean)`: an unknown product (own-property check) → false; otherwise `!isPermanentProductKind(kind) || consumePermanent`.
  - `classifyHeld(holderPlayerId, caller)`: returns `held`, `held_no_caller`, `held_elsewhere_verified` or `held_elsewhere_unverified`.
- **`/complete`**: every 200 answer (fresh grant, replay, race) adds `consume: mayConsume(...)`. The product comes from the receipt on the replay branch and from the verified purchase otherwise. Add a shadow `issuedAt` / status count. Error branches are unchanged.
- **`/reconcile`**, for each entry:
  - token already in the ledger → `processedTokens` (as today), then `classifyHeld`:
    - `held_elsewhere_verified` and the product is a permanent, known product → add the product id to `heldElsewhere` (deduplicated) and call `recordHolderSighting`. The sighting call has its own try/catch: a failure is logged by error name only, without touching `failedCount` or the answer;
  - fresh grant `granted` → `processedTokens` and `grantedTokens` (plus deviation 3 if approved);
  - grant returns `already_processed` (a race with a parallel request) → `processedTokens` only, labelled `already_processed_race`;
  - after the loop: `consumeTokens = processedTokens.filter(mayConsume)`. With the switch OFF this is `[]` today. With the switch ON it equals `processedTokens` exactly, held-elsewhere tokens included, which is today's behaviour (deviation 4).
  - Response: `{ processedTokens, grantedTokens, consumeTokens, heldElsewhere }` (always present) plus `failedCount` when above 0, as today.
- **One shadow log line per request**, labels and counts only, e.g. `yandex purchase payload shadow (reconcile): caller=verified issued_at=under_1m statuses=waiting:1 outcomes=held:1`.
- The 0309 construction log line stays byte-identical, because a test pins it.
- The existing `token=<first 8 chars>…` text in the skip and failed lines is kept (deviation 10). No new line carries a token, a payload, an id or a signature.

**7. Deploy wiring (config parity)**
- `build-deploy-profile.sh`: `printf "export PAYMENTS_CONSUME_PERMANENT=%q\n"`.
- `setup-profile.sh`:
  - add the variable to the header comment, with the **one-way-door warning** (this is the runbook line, next to its sibling switch);
  - the box keeps its own copy of the value across redeploys, like the login switch (Q2): `persist_or_reuse_secret` into `/opt/profile/.consume_permanent`;
  - a `profile.env` line;
  - a `report_config_values` case: `OK … OFF (normal)`, `ON` with the warning "ON — clients consume permanent purchases; ONE-WAY per token", or `FINDING` for an unrecognised value ("stays OFF").
- `example.env.profile`: a commented entry.
- No allowlist entry is needed: forwarding at both deploy steps clears the checker. That leaves the inert list pinned in `ConfigParity.test.ts` untouched.
- Deploy-hardening harness: add the variable to the "profile.env carries" loop and the staged-env loop (the T18 pattern), plus the three value-report cases (on, off, unrecognised).

**8. Restore drill and test helpers that list every table**
- `tests/integration/support/db.ts`: add the table to `PROFILE_TABLES`.
- `Migration006.it.test.ts`: add `"011_purchase_holder_sightings.sql"` to the applied list. The `player_id`-column list is unchanged, because the new columns are named `seen_player_id` and `holder_player_id`.
- `tests/testdata/profile-restore-drill/verify.sql`: add the table to the coverage list and a digest row (ordered by token and seen player), and change the header from 13 to 14 tables.
- `tests/profile-backup-dryrun.sh`: change its "13 tables" text to 14.
- `profile-backup-restore-runbook.md`: update the inventory, and add a "STOP if 011 is not deployed" note like the ones for 009 and 010.

**9. Tests by verification step**
- **Route tests, in `PaymentsRoutes.test.ts`:**
  - held + same verified caller → quiet, no sighting;
  - held + a different **verified** caller → `heldElsewhere:["citizenship"]`, sighting upserted with the right ids and `issuedAt`, no grant, and no write to either profile;
  - held + a different **unverified** caller → quiet, no sighting, counter only;
  - no / invalid / expired / non-Bearer header → 200 and never refused, with `sessionRejected` not called;
  - `processedTokens` deep-equal to today's value in every case. Existing `toEqual` assertions are updated to include the new fields;
  - switch on → `consumeTokens` equals `processedTokens` and `/complete` says `consume:true`;
  - switch off → `consume:false` on fresh grant, replay and race;
  - a throwing sighting write → still 200 with the right fields, and `failedCount` absent;
  - an unknown product in the list → skipped, as today;
  - G4: an empty list, or a list missing the held token → no repository writes;
  - log guard: no full token, payload, player id or signature, and every logger call is a single string.
- **Integration** (extend `PaymentsRepository.it.test.ts` and `Routes.it.test.ts`):
  - 011 applied through the runner;
  - the upsert raises `seen_count` and `last_seen_at`;
  - deleting `seen_player_id` cascades;
  - the ledger row is unchanged;
  - end to end over the real database: a verified other caller writes the sighting, and the holder and caller profiles are unchanged;
  - G4: a paid player stays paid after an empty reconcile.

### Checks I will run
- `npx tsc --noEmit -p tsconfig.json`
- `npm run lint`
- `npm test` (full run, waits on the project lock; the shell harnesses cover the deploy-script edits)
- `npm run test:integration` (needs `.env.test` and the `gc-0012-it-pg` container; if Docker is down I will say so, not skip silently)
- `npm run check:config-parity`, plus `--pipeline=all --enforce --block-on=profile`, which mirrors the deploy

**Skipped:** `npm run test:scripts:docker` (the backup dry run, which also exercises the `verify.sql` change). It needs Docker plus age, rclone and jq, so I report it as **not run**, not as passed. The supertest flake rule applies to the route suites.

### Edge cases covered
- Two tokens for the same product → `heldElsewhere` deduplicated.
- A ledger product no longer in the catalogue → never put in `heldElsewhere`; otherwise the new client's parse of the whole answer would fail.
- A verified token for an erased player → the sighting write hits a foreign-key error and is caught.
- `issuedAt` in milliseconds or absurdly large → stored as null; it shows in the bracket counter as `future_over_5m`.
- Sessions not configured → no caller.
- A `vfy:false` caller never gets an answer that compares him with the receipt's holder (privacy, G8).
- Body size limit: unchanged (residual R5).

### Contract handed to S2 (0510)
- **`/complete`:** `consume` is true or false. If the field is absent, the box is old: consume nothing.
- **`/reconcile`:**
  - `grantedTokens` holds only fresh grants. If it is absent, the box is old: fall back to `processedTokens.length > 0` and consume nothing.
  - `consumeTokens` is the only list the client may consume.
  - `heldElsewhere` holds product ids only, and only for a `vfy:true` Bearer caller.
  - The Bearer header is optional, and sending it never causes a 401.
  - `processedTokens` and `failedCount` keep today's meaning.

### After the S1 live deploy: what the owner checks (for 0511)
1. The deploy log's migration step applies `009_…`, `010_…`, `011_…` with no error. Read-only `psql`: `\d purchase_holder_sightings` exists and `select count(*)` is 0. 0 is expected: the old client sends no Bearer, so no sighting is possible before S2.
2. The value report line reads `PAYMENTS_CONSUME_PERMANENT — OFF (normal)`, and the boot log reads `consume-permanent: OFF`. Do not turn it on.
3. `GET /health` shows the new version.
4. The new log lines (`payload shadow`) carry labels only.
5. **Expect the counters to barely move with the old client.** It only posts reconcile when `getPurchases()` is non-empty, and it consumes everything, so 0 is not a failure. 0511 steps 2–4 (`consume:false` on `/complete`, a quiet held reconcile, the counters, whether `issuedAt` is present) realistically complete during the owner's T1 on the test copy. The old live client does send `/complete`, so a test purchase's network answer would show `consume:false`, but the old client still consumes it.

**For the producer:**
- 0493's new wording ("granted and not consumed") is only true after the game deploy (0510). With today's client, "consumed" is still expected.
- The T1–T3 runs write the owner's test purchases into the **live** database.
- 0510/0512 must confirm the test copy's API base points at the live profile domain.

### Deviations for owner approval
1. **Bracket set for `issuedAt` age.** The spec says to reuse ADR-121's login brackets, but those only split ages beyond 24 h, so they cannot tell "seconds old" from "cached for hours". Proposed: `absent`, `not_numeric`, `future_over_5m`, `under_1m`, `1m_10m`, `10m_1h`, `1h_24h`, `over_24h`.
2. **Status label.** The value is passed through only if it matches `^[a-z_]{1,20}$` (it is HMAC-signed Yandex data, and the only documented value is `waiting`); anything else is `other`, and a missing one is `absent`.
3. **Fresh reconcile grant to another profile's intent while a different verified player is calling.** See Q1.
4. With the switch on, `consumeTokens` equals `processedTokens` exactly (held-elsewhere included, as today).
5. **The switch keeps its value across redeploys.** See Q2.
6. `/reconcile` never increments `session.rejected` (it rejects nothing). A separate caller-state counter is added instead.
7. A grant race is labelled `already_processed_race`: not in `grantedTokens`, still in `processedTokens`.
8. `heldElsewhere` is limited to permanent, known product ids.
9. The sighting upsert takes the latest holder and `issuedAt`.
10. The existing 8-character token prefix in skip and failed lines is kept, following the 0309/0492 precedent and its tests. New lines carry none.

### Open questions

```
NEEDS-DECISION {
  question: "Approve the S1 plan, including deviations 1, 2, 4 and 6–10?",
  options: [
    "Approve as written (Rec)",
    "Approve, but use ADR-121's login age brackets exactly as the spec says (deviation 1 dropped)",
    "Hold: I want changes (say which)"
  ],
  recommendation: "Approve as written",
  context: "The deviations are small gaps the spec left open. The only one that changes what the box measures is deviation 1: the spec's brackets only start at 24 hours, so they cannot answer the question the measurement exists for (is the purchase list fresh, or cached by Yandex). Nothing in this list changes what a player sees. The owner fact 'no dev profile server' is already applied: S1 goes to the live box first, and it is safe with today's game."
}

NEEDS-DECISION {
  question: "Should the box remember the PAYMENTS_CONSUME_PERMANENT setting between deploys?",
  options: [
    "Yes, like the login-creation switch: once set on the box it stays until someone changes it (Rec)",
    "No: every deploy uses only what that deploy supplies; blank means OFF"
  ],
  recommendation: "Yes",
  context: "The switch makes clients delete (consume) permanent purchases again. It is an emergency lever, and turning it ON cannot be undone per purchase. If the box remembers it, a routine redeploy during an emergency cannot silently switch it back OFF; it is cleared by deleting one file on the box. If it is not remembered, an emergency setting is lost on the next deploy. Either way the deploy report prints its state every time, and an unrecognised value counts as OFF. Knock-on: none."
}

NEEDS-DECISION {
  question: "Spec gap: a purchase whose payment window closed early gets granted by reconcile to the profile that started it (old profile O), but the logged-in, verified page is a different profile N. Flag it as 'held elsewhere' straight away?",
  options: [
    "Yes: grant to O as today, and on the same answer tell N it is held elsewhere and record a sighting (Rec)",
    "No: follow the spec literally; N only sees 'held elsewhere' from his next page load"
  ],
  recommendation: "Yes",
  context: "Case: a player pays, the tab closes before our server confirms, and when he comes back his login lands on a new profile N. Reconcile grants the purchase to old profile O (correct, as today). With 'No', N's card still offers Buy for the rest of that page, so he could pay twice before the next load catches it. With 'Yes', the same comparison the spec already makes for 'held' purchases runs right after the grant: no double charge, nothing moved, and the evidence row is written. Verified callers only, so nothing is revealed to unverified ones. One extra route test. Knock-on: none (S2's client handling is the same either way)."
}
```

**What's next?** The owner rules on the three questions above, and the plan is approved before any code is written. Implementing it then needs a spawn carrying the declared-approval marker, or a `fkit coder` session.
