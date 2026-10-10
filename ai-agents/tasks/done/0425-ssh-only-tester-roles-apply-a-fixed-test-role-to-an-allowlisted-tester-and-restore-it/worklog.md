# Worklog — 0425 SSH-only tester roles

## 2026-10-09 — Build (fkit-coder, spawned by `fkit-sprint-ship-loop` as the Build worker)

Built against the owner-approved `plan.md` (blob `c4b385c63afbc0769e0c2e736d3b08385798f81f`, checked
with `git hash-object` at the start of the build). **No live-box contact** (no SSH, no production
read), no deploy, no commit.

### Change surface

New:
- `migrations/008_tester_role_snapshots.sql` — the snapshot table (plan D3).
- `src/profile-server/TesterRoles.ts` — the frozen role table (D4).
- `src/profile-server/TesterRoleRepository.ts` — `show` / `apply` / `restore` (D5).
- `src/profile-server/TesterRoleCommand.ts` — arguments, fail-closed allowlist, run log, `show`
  output, the guarded run (D2, D6, D7, D8).
- `src/profile-server/testerRole.ts` — the one-shot entry.
- `tests/profile-server/TesterRoles.test.ts`, `tests/profile-server/TesterRoleCommand.test.ts`.
- `tests/integration/TesterRole.it.test.ts`.
- `ai-agents/knowledge-base/profile-tester-roles-runbook.md` — the runbook (plan §5).

Changed:
- `package.json` — `tester-role` script.
- `setup-profile.sh` — `mkdir … tester-roles && chmod 700`; compose mount
  `./tester-roles:/var/lib/profile/tester-roles`; one `echo` line after "Written: docker-compose.yml".
- `tests/scripts/profile-deploy-hardening.test.sh` — new structural block (mount, drift guard,
  own directory, 0700 mkdir, never writes into `tester-roles/`, never names the allowlist).
  Success marker unchanged (`ALL PASS`), so `ShellHarnesses.test.ts` needs no edit.
- `scripts/config-parity-allowlist.json` — `TESTER_ROLE_OPERATOR`, profile, runtime-supplied, phase 1.
- `tests/integration/Migration006.it.test.ts` — expects `[006, 007, 008]`; `tester_role_snapshots`
  in the uuid `player_id` list.
- `tests/integration/support/db.ts` — `tester_role_snapshots` first in `PROFILE_TABLES`.
- `src/profile-server/PaymentsRepository.ts` — header comment only (D9).

### Decision log (calls made without asking — each inside the approved plan's intent)

1. **Snapshot ⇄ players copied inside SQL, never through JS.** *Why:* a JS `Date` holds
   milliseconds, `timestamptz` holds microseconds — a JS round trip would make "restore exactly"
   false (the brief's word). *Qualified as:* obvious winner within D3/D5's intent (exact restore).
   Proven by the integration round trip, which compares the full-precision `row_to_json` text.
2. **"Lock the snapshot; insert if none" written as one `INSERT … SELECT … ON CONFLICT (player_id) DO
   NOTHING`.** Same effect as plan D5 step 3: the player row lock (taken first) already serializes
   every apply for that tester, and `DO NOTHING` is what keeps the FIRST snapshot. *Qualified as:*
   mechanical, in-plan, equivalent.
3. **Added reason code `allowlist_unreadable`** next to `allowlist_missing` (D6's list is "such as";
   D2 names "missing or unreadable" as two cases). Mechanical, in-plan.
4. **Exit code for a log-append failure on a non-write run:** `show` → `3` (it succeeded but was not
   logged); a refusal keeps its own non-zero code and prints `NOT LOGGED`. D7 only defined `3` for a
   committed write; this is the smallest consistent extension. In-plan intent (D6 fail-closed log).
5. **An inline `# comment` after an id is a malformed line** (refuses everything), not a stripped
   comment. D2 says "`#` comments" and "any non-comment line not a UUID" fails closed; reading a
   comment only as a whole line is the stricter, fail-closed reading. The runbook says so.
6. **`show` and every refusal/apply message print no UUID at all** (D8 asked it of `show`; extended
   to all messages — cheaper than proving each one safe). Tested.
7. **Tester-id lookup: the runbook recommends option 2** (read the middle, payload segment of the
   login response's session token in the tester's own browser devtools and decode `pid` in the
   console). *Why:* it identifies **exactly the record that browser logs into now** — the thing
   `0424` broke; it needs no SSH, types no Yandex id into a shell, and reads nothing from the
   production DB. Copying only the payload segment avoids handling a credential (no signature = it
   cannot authenticate); the runbook forbids pasting the whole token. Option 1 (`player_identities`
   lookup by Yandex id) is kept as a fallback, marked not recommended. *Qualified as:* the plan said
   "the build picks the recommended option and says why".
8. **Started the stopped local test container `gc-0012-it-pg`** (`docker start`) for
   `npm run test:integration`. The Docker daemon was already up (owner started Docker Desktop); only
   the container was stopped. Local, throwaway, the designated test DB — not Docker Desktop itself,
   which is what the spawn prompt said not to start.
9. **Runbook additions beyond plan §5** (found in the §7 checks below): no real purchase while a role
   is held; the `below_minimum` trap for `brand-new` on a browser with < 3 days; client analytics
   events a role change can trigger.

### §7 "check, not assume" findings

**1. Paid status beyond the profile DB — does reconciliation fight a role?**
- `getPurchases()` is used only by `src/client/PaymentsReconciliation.ts`, which posts to
  `POST /v1/payments/yandex/reconcile` (`src/profile-server/Routes.ts:1105-1170`).
- That route skips every token already in `processed_purchases`, needs a valid intent, grants to the
  **intent's** player, and `GRANT_FLAGS_SQL` only ever sets paid to **true**
  (`PaymentsRepository.ts` `GRANT_FLAGS_SQL`).
- **Verdict:** reconciliation can never undo a role-set paid flag. It could fight a **non-paid** role
  only if the tester account has an unconsumed purchase whose intent belongs to the tester's record
  — then the next session start sets paid back to true. Not expected for a test account.
- **Found in the build, the reverse case:** a real purchase made **while a role is held**, then
  `restore`, would put back "not paid" while the receipt stays → a buyer shown as not paid. Runbook
  rule: no real purchase while a role is applied.
- Client display: paid shows only in the **owner view** (verified login) —
  `src/client/PlayerProfileView.ts:132-154`; the unverified projection omits paid state and pins a
  citizen's XP at 100 (`src/profile-server/PublicProjection.ts:50-52`, `:69-84`).

**2. Statistics.**
- `profile-checks.sh` player-growth check counts `players` rows only (`profile-checks.sh:393-408`); a
  role never creates or deletes one → unaffected.
- No metric or alert reads the paid flag or purchases: grep of `profile-checks.sh`,
  `AlertRelay.ts`, `Telemetry.ts` for `is_paid` / `paid` / `purchase` → no hits.
- The ad-hoc `0402`/`0424`-style reads ("paid players", "paid without a purchase") **would** count a
  `paid-citizen` tester as one paid player with no purchase. Handling: runbook exclusion guidance
  (`NOT IN (SELECT player_id FROM tester_role_snapshots)`), no code change, no follow-up filed.
- **Found in the build:** client **analytics** events are real. `Citizenship:Earned:XP` fires when a
  verified read first sees an earned date after a stored "not earned" observation
  (`PlayerProfileView.ts` `reportEarnedCitizenshipTransition`), so e.g. `non-citizen` →
  `earned-citizen` on a device can send one. `brand-new` → the tenure claim sends the claim
  events (`TenureGrantClaim.ts`). One tester, a handful of events; noted in the runbook. A follow-up
  to suppress analytics for testers was **not** filed — owner's call if wanted.

**3. Client and server caches — does a reload show the new role?**
- Session token: module variable only, never persisted (`src/client/ProfileSession.ts:17-25`); the
  client logs in on every page load.
- `GET /v1/profile` and `POST /v1/login` answer `Cache-Control: no-store` (`Routes.ts:683`, `:827`).
- Profile server: no in-memory profile cache (the only `Map`s are the alert relay's rate entries and
  the name-change notifier's timestamps; `Telemetry.ts` caches a players-count estimate only).
- Game server: citizen status is taken at join/resolve and **only ever set true**
  (`src/server/GameServer.ts:352` carries it across a reconnect, `:1671-1672` sets it on resolve).
  So a change made while in a lobby/match shows from the next one; a citizen → non-citizen change
  does not clear the icon inside the current game.
- **Steps for the tester:** apply between matches, outside a lobby; full page reload.

**4. "Brand-new" eligibility — what the tenure gift reads.**
- Server: only the grant row — login answers `grantChecks.tenure: "pending"` when there is no
  `tenure` row (`Routes.ts:803-818`, via `hasXpGrant`). Creation time and login history are not read.
- Client (`src/client/TenureGrantClaim.ts`): the citizenship surfaces gate, login `pending`, and the
  browser's local evidence (`readTenureEvidence(localStorage)` — days played and game-record days);
  once per page load.
- Popup: only on `granted` with XP > 0 (`src/client/CitizenshipCard.ts:409-428`).
- Amount: from that browser's local history, 1 XP/day, cap 50, minimum 3 days
  (`src/core/profile/Citizenship.ts` `TENURE_*`). A browser under 3 days records a **final** 0-XP
  check (`below_minimum`) with no popup — re-apply `brand-new` to try again.
- Integration test: after `brand-new`, `recordTenureCheck` answers `granted` again.

### Residuals (recorded, not fixed)

- ~~**Restore drill does not compare `tester_role_snapshots`** (`tests/profile-backup-dryrun.sh` not
  edited: Docker-only, not in `npm test`, could not be verified here). Small, transient, the tester's
  own data. As planned.~~ **Wrong, and fixed in review round 1 (R1).** It was not a silent skip:
  `verify.sql`'s `uncovered_tables` check names any table it does not cover, so migration `008` made
  the dry-run harness red and the owner's box drill hit its STOP line. `tester_role_snapshots` is now
  covered — see "Review round 1" below.
- **Pre-existing, unrelated failure in `npm run test:integration`:** `tests/integration/Routes.it.test.ts`
  — 2 tests ("resolve -> credit -> read produces xp 10, no leaked fields" and "resolve returns the
  approved display name …") expect a resolve body without `verified`, but the committed resolve
  route now returns `verified: false` (added with `0340`-era work). Neither `Routes.ts` nor that test
  is modified in this working tree; nothing in this task touches the resolve route. Not fixed here
  (outside the approved plan).

### Verification

All run 2026-10-09 through the npm scripts, on the owner's Mac.

| Gate | Result |
|---|---|
| New unit suites (`TesterRoleCommand`, `TesterRoles`) | 88/88 pass |
| `npm test` (full, project lock, 1 worker) | **1st run red: 1 failure** — `PaymentsRoutes.test.ts` "is 401 for a legacy yandexPlayerId body…" with `socket hang up` (supertest flake family, untraced shape; no `SIGSEGV`, no new `node-*.ips`). **Re-ran** (CLAUDE.md flake rule): that suite alone 33/33, then the full run **221/221 suites, 4516/4516 tests, exit 0**. Includes `ShellHarnesses.test.ts` (the edited hardening harness). |
| Hardening harness run directly | `ALL PASS`; the new writer guard was mutation-checked (a `cp`, an `rm -rf` and a `: >` into `tester-roles/` are all caught) |
| `npm run test:integration` (local `gc-0012-it-pg`, port 5433) | `TesterRole.it.test.ts` and `Migration006.it.test.ts` pass (3 repeat runs of the two, 32/32 each). Whole run: 176/178 — the **2 failures are the pre-existing `Routes.it.test.ts` `verified` mismatch** (Residuals). |
| `npm run lint` | exit 0 |
| `npx tsc --noEmit -p .` | exit 0 |
| `npm run check:config-parity` | exit 0, profile REQUIRED 0; `TESTER_ROLE_OPERATOR` listed as allowed. Also `--enforce`: exit 0 |
| Entry smoke test (`npm run -s tester-role -- show`, locally) | loads under ts-node ESM, refuses with exit 1 (no `/var/lib/profile/tester-roles` locally) — proves the entry runs and fails closed |

**Not verified, and why:** anything on the box — the deploy, migration `008` on the real DB, the
compose mount, `docker compose exec` of the command, the allowlist file, and the devtools id lookup.
All owner-run in the verify task (no live-box contact in this task, by instruction).

## 2026-10-09 — Review round 1 (fkit-coder, spawned by `fkit-sprint-ship-loop` as the Process-review worker)

Ledger: `review.md` (R1 medium, R2 low). Both verified CORRECT and fixed under the standing plan
approval plus the owner's live rulings on this round (relayed by `fkit-lead`, 2026-10-09).

### Decision log (fixes applied without a per-fix ask)

1. **R1 — restore drill did not cover `tester_role_snapshots`.** *Changed:*
   `tests/testdata/profile-restore-drill/verify.sql` — table added to the `uncovered_tables` exclusion
   list and given a count + content-digest line (ordered by its primary key `player_id`); header
   "10 tables" → "11 tables". `ai-agents/knowledge-base/profile-backup-restore-runbook.md` — inventory
   10 → 11 base tables (names `tester_role_snapshots`, migration `008`); expected migration list now
   ends `…,006_…,007_…,008_tester_role_snapshots.sql`; expected counts `schema_migrations 5` → `7`
   and `tester_role_snapshots 0` added (the seed writes none, and the drill only runs on an empty DB,
   so the FK makes 0 certain); "all 10 tables" → 11 in two places. `tests/profile-backup-dryrun.sh` —
   only its `fingerprint IDENTICAL (10 tables, …)` message → 11. *Why it qualified:* **owner ruling R1
   "Fix it inside 0425 (Recommended)"**, which explicitly overrides the plan's "Deliberately not
   changed: restore-drill table list" line for this point; verified CORRECT (reproduced, below);
   mechanical and localized. ⚠️ `schema_migrations 5` was already stale before this task (`007` had
   made it 6); corrected to the true value 7 rather than to 6.
2. **R2 — runbook's allowlist create step would empty an existing list.** *Changed:*
   `ai-agents/knowledge-base/profile-tester-roles-runbook.md` § One-time setup step 3 — create only
   if absent (`[ -e … ] || install …`) and say to edit, never re-create. *Why it qualified:* **owner
   ruling R2 "Fix the wording (Recommended)"**; verified CORRECT (`install … /dev/null <existing>`
   truncates it to 0 bytes, reproduced on a temp file); docs-only, localized.
3. **Obvious-winner calls:** none beyond the dry-run message label in item 1 (a stale "10" that the
   fix would otherwise have made false).

### Verification (round 1)

- **`tests/profile-backup-dryrun.sh` (the full harness) was NOT run to completion:** Docker, `age`,
  `age-keygen`, `rclone`, `curl` and `jq` were all present, but it stopped at container start —
  `pull access denied for minio/minio` (Docker Hub refused the MinIO image). An environment limit,
  not a code result.
- **Instead, the drill SQL was run for real** against a throwaway `postgres:16-alpine` container
  (loopback port 55433, removed afterwards; not `gc-0012-it-pg`), schema built by the real
  `npm run migrate` (001–004, 006, 007, 008):
  - **Before the fix:** seed + `verify.sql` → `uncovered_tables: tester_role_snapshots` (R1 reproduced).
  - **After the fix:** `uncovered_tables: none`, `verify_end: complete`, exit 0; `schema_migrations 7`.
    With one synthetic `tester_role_snapshots` row added, `pg_dump -Fc | pg_restore` into a second
    DB in the same container, `verify.sql` on both, `diff` → **IDENTICAL**. Changing that row's `xp`
    on the restored side → the diff shows exactly the `tester_role_snapshots` digest line (the new
    line is live, not vacuous).
  - `behaviour.sql` on the restored DB printed every expected line; `cleanup.sql` returned the 9 data
    tables to 0 and left `schema_migrations` unchanged; `tester_role_snapshots` 0 after cleanup.
  - **Not exercised:** the backup script's encrypt → upload → download path (needs MinIO).
- No `npm test` suite reads `verify.sql`, the restore runbook or the tester runbook (grep), so no jest
  run covers these edits; no source file changed this round.

