# Plan: 0496 (B4), durable items base

**Planning only. I wrote nothing and changed no files.** Plan review was off for this run (no switch line), so there were no approver consults and no Codex pass. I consulted nobody.

## Summary (read this first)
- **B4's build has to wait for B2's (0494) build and stateful review.** The reason is not edit collisions. B2 adds `CitizenshipCard.snapshot()`, which B4's client hunk fills in. B2's `src/client/PurchaseOffer.ts` and `ProductClientConfig.ts` are being written in the tree right now; the card is not modified yet. While B2 is half-built, a full `npm test` or `tsc` run gives no clean signal, and a working-tree review would mix the two tasks. → OP-1.
- **The migration is `010_player_entitlements.sql`.** I re-checked `migrations/`: 001–004 and 006–009 exist, with `009_player_rewarded_match_xp.sql` uncommitted (0491).
- **One choice the spec does not cover: the entitlements read runs for every caller, and the result is used only in the owner view.** An existing guard (`tests/profile-server/SessionRoutes.test.ts:381-397`, from 0250 S3b) asserts the same database calls for a `vfy:true` and a `vfy:false` read of `/v1/profile`. Querying only for verified callers would break it. So I keep "the branch is an in-memory choice" (the projection decides, the query runs regardless).
- **A deploy-window fact that makes the soft read necessary.** `setup-profile.sh` runs migrations after the new container passes its health gate (`:1251`, `:1309-1315`). So the new code serves `/v1/profile` for a moment before table `010` exists. The entitlements read therefore fails soft: on an error it leaves the key out (meaning "unknown") and never answers 500.
- **B1 left one type gap.** `ProductGrant.itemInboxTemplate` is typed `string | null`, but `InboxSender.sendTemplate` takes an `InboxTemplateKey`. B4 narrows it to `InboxTemplateKey | null`.
- **The test-only product reaches the repository through a constructor seam.** `new PaymentsRepository(pool, inbox?, grants = PRODUCT_GRANTS)`. Production passes nothing. `PAYMENT_PRODUCT_IDS` stays `["citizenship"]`.
- **Every test goes into an existing file. No new test files.**
- **Found while planning:** an old table, `player_cosmetic_ownership` (migration 006 `:152`), already exists. It is limited to `flag`/`pattern`, has no source references, and the spec does not mention it. → OP-2.

## Grounding
- Spec `2026-10-24-design-shared-purchase-flow.md` REVISION 2, read in full: §4.1, §5, §5.3, §6, §7, §10, §11.
- Brief 0496, brief 0497 (B4v checks), B2's plan (0494 `plan.md`).
- Code as it stands: B1's `PaymentsRepository.ts` (`PRODUCT_GRANTS`, `GrantOutcome`, `productGrantFor`, `afterPaidPurchaseGranted`) and `PaymentsContract.ts` (`PRODUCT_DEFINITIONS`, `failedCount`).
- `Routes.ts`: `/v1/profile` `:687-716`, login `:806-848`, `/intent` `:1016-1050`, inbox `:1248-1325`.
- `PublicProjection.ts`, `PlayerProfile.ts`, `LoginContract.ts:64`, `PlayerProfileView.ts`, `CitizenshipCard.ts:321-345` and `:501-518`.
- B2's in-progress `PurchaseOffer.ts`: `entitlements: readonly PaymentProductId[] | null` at `:49`, the durable rule at `:120-142`. `CitizenshipOffer.ts:85` passes `entitlements: null`.
- 0491's pattern for a new table: `tests/integration/support/db.ts`, `Migration006.it.test.ts`, `verify.sql`, `profile-backup-dryrun.sh`, and the runbook.
- Wiki: no page covers the shared purchase flow or entitlements yet, so the spec is the newest source. `profile-storage-strategy.md` calls `player_cosmetic_ownership` "future-aware, no application logic".

## Steps

**0. Preconditions at build start**
- B2 (0494) is built and its stateful review is closed (OP-1).
- `CitizenshipCard.snapshot()` exists in the form B2 planned.
- Re-check `migrations/`: if a new file has appeared after `009`, take the next free number.

**1. `migrations/010_player_entitlements.sql` (new)**
- Exactly as in spec §5: `player_entitlements (player_id uuid not null references players(id) on delete cascade, product_id text not null, purchase_token text not null, granted_at timestamptz not null default now(), primary key (player_id, product_id))`.
- A short header in 009's style: task, what the primary key means, and "not idempotent on purpose, like 006–009".
- No data migration. Citizenship stays on the `players` flags.

**2. `src/profile-server/PaymentsRepository.ts`**
- (a) `itemInboxTemplate: InboxTemplateKey | null` (was `string | null`).
- (b) A new exported factory, `durableItemGrant(itemInboxTemplate: InboxTemplateKey | null): ProductGrant`.
  - Its `applyEntitlement` runs `INSERT INTO player_entitlements (player_id, product_id, purchase_token) VALUES ($1,$2,$3) ON CONFLICT (player_id, product_id) DO NOTHING`.
  - It never touches the paid flags, which the shared step writes (S2).
- (c) A test seam: a third constructor parameter `grants: Readonly<Record<string, ProductGrant>> = PRODUCT_GRANTS`.
  - `productGrantFor(registry, productId)` keeps the own-property lookup and the throw before `connect()` (R2).
  - `PRODUCT_GRANTS` stays `Record<PaymentProductId, ProductGrant>`, so the compile-time check is unchanged.
- (d) `listEntitlements(playerId): Promise<string[]>`: `SELECT product_id … WHERE player_id = $1 ORDER BY product_id`.
- (e) The `becamePaidCitizen` inbox rule, as a pure exported `welcomeTemplatesFor(isCitizenshipProduct, becamePaidCitizen, itemTemplate): InboxTemplateKey[]`:
  - `citizenship_paid` when the product is citizenship **or** the buyer just became paid;
  - then the item's template, if it has one.
  - "Citizenship product" = own-property `PRODUCT_DEFINITIONS` lookup with kind `citizenship`. A test-only id is therefore an item.
  - `afterPaidPurchaseGranted` sends the list in order: the item send runs after the citizenship send settles, so the welcome message is the older of the two.
  - It still never throws. Each failure is logged under its own key.
  - Citizenship behaves exactly as today: always one `citizenship_paid`.

**3. `src/profile-server/PublicProjection.ts`**
- `UnverifiedPublicProfile` also omits `entitlements`, so the type forbids the key on the unverified view.
- `toOwnerProfile(profile, nameChange, entitlements?)` adds `entitlements` when it is an array (`[]` included). When it is null or undefined (unknown), the key is left out.
- `profileForCaller(…, verified, entitlements)` passes entitlements to the owner view only. `toPublicProfile` never takes the parameter, so it cannot leak them.
- New `ITEM_PURCHASE_INBOX_TEMPLATE_KEYS: ReadonlySet<InboxTemplateKey>`, empty today.
- `toPublicInboxMessages(messages, itemKeys = ITEM_PURCHASE_INBOX_TEMPLATE_KEYS)` drops item-purchase messages from the unverified view.
- `hiddenInboxMessageIds` derives from that list, so mark-read equalization covers dropped item messages with no change of its own.

**4. `src/profile-server/Routes.ts`**
- `PaymentsRepo` gains `listEntitlements`.
- A `readEntitlements(playerId)` helper, mirroring `readNameChangeState`. No payments repo → `null`; a throw → log (no ids) → `null`.
- `GET /v1/profile`: read for every caller (keeps the same-calls guard), then pass the result to `profileForCaller`.
- Login: for an existing player, read every time. For a newly created player, use `[]` with no query, as name change already does.
  - The login profile gets entitlements too: one owner-view shape, and `LoginVerificationRoutes.test.ts:565` compares the login profile with `GET /v1/profile` under the same token.
- `/intent`:
  - `kind = PRODUCT_DEFINITIONS[productId].kind`;
  - `isOwned` is read **only** when `caller.verified && kind === "durable_item"`;
  - `intentRefusal(kind, isOwned, caller.verified) === "already_owned"` → `409 {error:"already_owned"}`, and no intent is created;
  - a read error → the existing 500 path (fail closed: no intent).
- New exported pure function `intentRefusal(kind, isOwned, callerVerified): "already_owned" | null`, placed beside `callerFromSession`.
- Fix the comments this makes wrong:
  - the `SessionCaller` doc (`:339-342`, "nor do payments");
  - the `/intent` comment (`:1016-1024`, "this route does not read `verified`").

**5. `src/core/profile/PaymentsContract.ts`**
- Header comment only (`:9-12`, "the route does not read `verified`" → durable items read it). No code change.

**6. `src/core/profile/PlayerProfile.ts`** (`src/core`: tests required)
- `PublicPlayerProfileSchema` gains `entitlements: z.array(z.string().min(1)).optional()`.
- The comment gives the reasons: owner view only (OD-2), and optional because the box and the client deploy separately.
- Elements are plain strings, not `PaymentProductIdSchema`. A box that knows an id the client bundle does not yet know must not fail the whole parse.
- `PlayerProfileSchema` (the database and localStorage contract) is untouched.

**7. `src/client/PlayerProfileView.ts`**
- New field: `entitlements: readonly PaymentProductId[] | null`, null in the zero-state.
- Owner view (`isOwnerView`, the existing marker) with an array → keep only known ids. Any other case → `null`.
- So an unverified body could never fill it, even if one carried the key by mistake.

**8. `src/client/CitizenshipCard.ts`** (B2's file)
- One hunk in B2's `snapshot()`: `entitlements: this.profile?.entitlements ?? null` instead of B2's `null`.
- `CitizenshipOffer.ts:85` stays `null`. The citizenship rule never reads the list.

**9. Restore drill and docs** (0491's pattern)
- `tests/testdata/profile-restore-drill/verify.sql`:
  - add `player_entitlements` to the coverage list;
  - add a digest row ordered by `player_id, product_id`;
  - 12 → 13 tables.
- `tests/profile-backup-dryrun.sh`: the "12 tables" message → 13.
- `tests/integration/support/db.ts`: add the table to `PROFILE_TABLES`.
- `ai-agents/knowledge-base/profile-backup-restore-runbook.md`:
  - 13 tables;
  - `010` in the `schema_migrations` list (9 entries);
  - `player_entitlements 0` in the expected counts;
  - a "live drill only after `010` is on the box" note, like 0491's.
- `worklog.md`: record the accepted residual (verification 8).

**Not changed:**
- `PAYMENT_PRODUCT_IDS`, `PRODUCT_DEFINITIONS`, `PurchaseOffer.ts`, `PaymentsApiClient.ts` (B2 already maps 409 → `already_owned`).
- Lang files and analytics: B4 adds no text and no event.
- `TesterRoleRepository` (spec §6: it does not touch the table). `player_cosmetic_ownership`.

## Shared-file hunks and build order

| File | B4 hunk | Shared with | Collision |
|---|---|---|---|
| `src/client/CitizenshipCard.ts` | 1 line in B2's new `snapshot()` | B2 (being built), B3 later | must come after B2 |
| `tests/client/CitizenshipCard.test.ts` | fixtures + 1–2 `snapshot()` cases | B2 adds `snapshot` cases | after B2 |
| `PaymentsRepository.ts`, `Routes.ts`, `PaymentsRoutes.test.ts`, `InboxHooks.test.ts`, `PaymentsRepository.{test,it.test}.ts` | as above | B1 (closed, uncommitted) | none (B4 builds on it) |
| `support/db.ts`, `Migration006.it.test.ts`, `verify.sql`, `profile-backup-dryrun.sh`, runbook | +1 table | 0491 (uncommitted) | none (append) |
| `PlayerProfile.ts`, `PlayerProfileView.ts`, `PublicProjection.ts` | as above | nobody | none |

**Order:**
- B2 build and review, then B4 build.
- B4 and B3 both touch `CitizenshipCard.ts`. Run them one at a time, either order. Never in parallel in one tree.
- Scope the reviewer to B4's file list. Nothing is committed between tasks, so the tree also holds 0488, 0491, B1 and B2 work.

## Tests (all in existing files; no new test files)

**`src/core` (required):** `tests/core/profile/PlayerProfile.test.ts`
- `entitlements` is carried when sent (owner view);
- it is never invented (S1 view);
- a non-array, or non-string elements, are rejected;
- `[]` is accepted;
- cross-deploy: a pre-B4 copy of the schema strips the key from a B4 owner view;
- `PlayerProfileSchema` strips it.

**Server unit:**
- `tests/profile-server/PaymentsRepository.test.ts`:
  - `durableItemGrant` issues one exact `INSERT … ON CONFLICT (player_id, product_id) DO NOTHING` with `[playerId, productId, token]`, and its template passes through;
  - with the injected registry `{…PRODUCT_GRANTS, [TEST_ITEM]: durableItemGrant(null)}`, the shared order still holds (BEGIN → receipt → paid read → flags → entitlement → intent → COMMIT) and the flags are always written;
  - the default repository still throws for `TEST_ITEM` before `connect()`;
  - `listEntitlements` mapping;
  - `welcomeTemplatesFor` over every combination;
  - registry guard: every non-null `itemInboxTemplate` in `PRODUCT_GRANTS` is in `ITEM_PURCHASE_INBOX_TEMPLATE_KEYS`;
  - `PAYMENT_PRODUCT_IDS` equals `["citizenship"]` (verification 2).
- `tests/profile-server/InboxHooks.test.ts`, through `grantPaidPurchase` with the injected registry:
  - item to a non-paid buyer → `citizenship_paid`, then the item key, in that order;
  - item to an already-paid buyer → item key only;
  - item with no template to an already-paid buyer → nothing;
  - replay → nothing;
  - a send failure never throws;
  - the existing citizenship cases are unchanged.
- `tests/profile-server/PaymentsRoutes.test.ts`:
  - `intentRefusal` over both kinds × owned × verified (8 cases): 409 only for durable + verified + owned (verification 3);
  - the route: citizenship with a verified **and** an unverified caller → 200, `listEntitlements` not called.
- `tests/profile-server/PublicProjection.test.ts`:
  - owner view with `[]` / `[X]` / null → key `[]` / `[X]` / absent;
  - `profileForCaller(false, [X])` → no key;
  - the unverified inbox drops item messages (injected key set);
  - `hiddenInboxMessageIds` includes them;
  - the verified inbox keeps them;
  - the unverified view of a paid buyer with an item, and of an earned citizen, are deep-equal.
- `tests/profile-server/SessionRoutes.test.ts`:
  - the payments mock gains `listEntitlements` → `[]`;
  - `GET /v1/profile` `verifiedBody` gains `entitlements: []`;
  - the unverified body is unchanged;
  - the same-calls assertion stays green;
  - fix the guard's "payments" comment.
- `tests/profile-server/Routes.test.ts`: a read that throws → 200, owner view without the key.
- `LoginVerificationRoutes.test.ts` and other owner-view equality suites: update expected bodies where payments are wired. The full run shows which.

**Integration (real Postgres, `npm run test:integration`; required, because the SQL changes):**
- `tests/integration/PaymentsRepository.it.test.ts`, a new `describe` over `TEST_ITEM` with the injected registry:
  - `createIntent` works;
  - first grant → `granted, becamePaidCitizen:true`, plus one row (player, item, token), `is_paid_citizen` and `is_citizen` set, and the receipt;
  - `listEntitlements` → `[TEST_ITEM]`; a player with no items → `[]`;
  - replay → `already_processed`, still one row;
  - a second token for the same item (the two-tab case) → `granted, false`, still one row with the original token and `granted_at`;
  - citizenship first, then the item → `becamePaidCitizen:false`, row written;
  - deleting the player cascades the rows (the receipt stays);
  - the default repository refuses `TEST_ITEM`.
- `tests/integration/Migration006.it.test.ts`: `010_player_entitlements.sql` joins the applied list and `player_entitlements` the table list (verification 1).
- `tests/integration/PaidStateEqualization.it.test.ts`:
  - verified `GET /v1/profile` and verified login → `entitlements: []`, then `[TEST_ITEM]` after a test-registry grant on the same pool;
  - unverified → no key, and a paid-with-item body deep-equals an earned citizen's;
  - a paid citizen with no items → `[]`, never `["citizenship"]`.

**Client:**
- `tests/client/PlayerProfileView.test.ts`:
  - owner view with a list → known ids only (an unknown string is filtered);
  - owner view without the key → null;
  - unverified view, even one carrying the key → null;
  - malformed → zero-state;
  - guest → null (verification 6).
- `tests/client/CitizenshipCard.test.ts`: `snapshot().profile.entitlements` follows the view; null when unverified.
- Fixtures `entitlements: null` in `CitizenshipStatus.test.ts` and `CitizenshipCard.test.ts`, where `tsc` requires it.

**Test-only product, how exactly:** a constant `TEST_ITEM = "test_durable_item"` that exists only in test files. It reaches the code by:
- (1) calling the factory directly;
- (2) the repository constructor seam (unit tests and real Postgres);
- (3) `intentRefusal(kind, …)`, which takes a kind rather than an id.

It is never added to `PAYMENT_PRODUCT_IDS` or `PRODUCT_DEFINITIONS`, and wire validation still refuses it.

⚠️ **Accepted residual (§10):** the `/intent` route's 409 path is first exercised end to end by the first item build. Recorded in the worklog; not a gap of B4.

## Checks
1. Targeted while building: `npm test -- <each file above>` (no lock).
2. `npx tsc --noEmit -p tsconfig.json`. Required: jest with SWC does not type-check. It also covers the other uncommitted tasks, so it is a clean signal only once those are green.
3. `npm run lint`.
4. One full `npm test`, through the npm script (project lock, 1 worker, about 5 min). A lone `Exceeded timeout of 5000 ms` in a supertest suite → follow the known-flake rule, re-run, and say so.
5. `npm run test:integration` with `TEST_DATABASE_URL` from `.env.test` (container `gc-0012-it-pg`, port 5433). It needs Docker Desktop running, which an agent cannot start without the owner. If it is down, I report the check as **not run**, never as passed.
6. `npm run test:scripts:docker` (`profile-backup-dryrun.sh`). It is the only gate for the `verify.sql` and dry-run edits, and it needs Docker plus `age`, `rclone`, `curl` and `jq`. I run it if they are present; otherwise I report it skipped, with that reason.

**Skipped:**
- `check:config-parity`: no env change.
- A local game run: no visible change; no item exists.

## Deploy (weekend slot unless urgent; committed is not deployed)
- **Profile box:** only after 0491 (`009`) and B1 (0492) are deployed. `setup-profile.sh` then applies `010` after the health gate.
- **The deploy window is covered:** before `010` exists, the read fails soft (key left out) and the citizenship grant does not touch the table.
- **Rollback:** the image can roll back. The table stays and the old code ignores it.
- **Restore drill:** from B4 on, the repo's `verify.sql` reads `player_entitlements`. A live drill runs only on a box with `010` (runbook note).
- **Game deploy (the client parse):** no order constraint with the box.
  - A new client against an old box → null. Items would read "can't verify" for citizens, but none exist, so nothing visible changes.
  - An old client against a new box → the key is stripped.
  - Ships with or after B2's game deploy.
- **Then 0497 (B4v)**, which checks: `010` applied; verified read `entitlements: []`; unverified read with no key; a citizenship test purchase still grants.

## Edge cases and failure modes
- **Two tabs double-charge an item:** the second grant is `granted, false`. No new row, but the item's welcome message is sent a second time. Cosmetic, on top of the named double-charge residual. I keep the spec's rule (OP-3).
- **A malformed `entitlements`:** the whole profile parse fails → zero-state → `read_failed`. Fails closed, as with the paid keys today.
- **Tester reset to non-citizen while owning an item, on an unverified login:** offered `buy`, and no 409. Spec-accepted residual.
- **Cost:** one indexed query more per `GET /v1/profile` and per existing-player login.
- **`/intent` query pattern:** it now depends on `verified` for durable items only. That says nothing about paid state (the caller knows its own token), and the citizenship path stays identical (the SessionRoutes guard stays green).
- **Erasure:** cascades through the foreign key; the receipt outlives it, as designed.

## Open points (recommendations are mine, the coder's)
- **OP-1: when B4's build starts.**
  - (a) **Rec:** after B2's build and its stateful review close; the whole of B4 at once. Knock-on: 0496 waits on 0494; 0497 waits on 0496's deploy as before. 0486, 0010 and 0011 already wait on B3, which also waits on B2, so they lose nothing. All on Sprint 9; no cross-sprint knock-on.
  - (b) Start the server and core parts now, and add the card hunk after B2. Knock-on: none on boards (checked). Cost: a half-red tree while B2 builds, and a muddier review scope.
- **OP-2: the old `player_cosmetic_ownership` table** (006; `flag`/`pattern` only; unused; not in the spec).
  - **Rec:** build `player_entitlements` as the approved spec says, and leave the old table alone.
  - The 0010 and 0011 item builds should use `player_entitlements`.
  - Dropping the old table would be a separate cleanup task (restore-drill edits). Ask the architect if you want it settled now. Knock-on: none (checked).
- **OP-3: a duplicate item welcome on a double charge.**
  - **Rec:** accept, as the spec has it.
  - Alternative: `applyEntitlement` reports a new row and the item message is sent only then. That changes B1's interface.
