# Plan — 0425 SSH-only tester roles (apply a fixed test role to an allowlisted tester, and restore it)

Planning only. Nothing was written. Grounded in the code as of 2026-10-09: `src/profile-server/{decideNameChange,NameChangeDecideCommand,sendNameChangeDigest,migrate,Db,PlayerProfileRepository,PaymentsRepository,PublicProjection,Routes}.ts`, `migrations/006`/`007`, `src/core/profile/Citizenship.ts`, `src/client/{TenureGrantClaim,TenureEvidence,ProfileSession,PlayerProfileView}.ts`, `setup-profile.sh` (compose heredoc), `tests/scripts/profile-deploy-hardening.test.sh`, `tests/integration/{Migration006.it.test.ts,support/db.ts}`, `scripts/config-parity-allowlist.json`, and the wiki's `systems/player-profile-store.md`. No architect consult was run (the brief made it optional); the design-relevant calls are listed under "Design decisions" so the owner can overrule any of them at approval.

## 0. Summary
- A one-shot command **inside the profile container**, the `0312`/`0283` one-shot shape (`npm run -s tester-role -- <sub> …` via `docker compose exec -T`). It talks to Postgres **directly** through `createPool()`, not through any HTTP route. So it adds **no route and no endpoint**, and nothing outside SSH can reach it.
- Subcommands: `apply <tester-internal-id> <role-id>`, `restore <tester-internal-id>`, `show <tester-internal-id>`.
- **Allowlist:** a file on the box at `/opt/profile/tester-roles/allowlist` (host). It is bind-mounted into the container at `/var/lib/profile/tester-roles/allowlist`, and the owner edits it by hand. **It fails closed:** if the file is missing, unreadable, empty or has a bad line, every subcommand is refused, `show` included.
- **Roles** are a frozen table in code (`src/profile-server/TesterRoles.ts`). The command never accepts property values.
- **Snapshot** goes in a new table `tester_role_snapshots` (migration `008`). It is written in the **same transaction** as the first apply, a later apply never overwrites it, and `restore` puts every saved value back exactly and then deletes the snapshot row.
- **Run log:** one JSON line per run, appended to `/var/lib/profile/tester-roles/runs.log` (same bind-mounted directory). It stays on the box.
- **No live-box step in this task.** The deploy, creating the allowlist and the first `apply` all belong to the verify task filed at close. Each is owner-run, and each production write needs the owner's OK in-session.

## 1. Design decisions (stated so they can be overruled)

**D1 — Direct DB, not the 0312 HTTP hop.** `0312`'s decide command posts to an internal route on 127.0.0.1, but the brief forbids any route or internal endpoint. So the command uses the `migrate.ts` / `sendNameChangeDigest.ts` pattern instead: one pool, SQL, `pool.end()` in `finally`. Import surface: `Db`, `Logger` (through Db), `TesterRoleCommand`, `TesterRoleRepository`, `TesterRoles`, `../core/profile/Citizenship`, `fs`. **It never imports `./Server`, `./Routes` or `./Telemetry`** (the 0283 trap: `Server.ts` binds the port at load). A unit test asserts this, mirroring the scan in `NameChangeDecideCommand.test.ts:590-615`.

**D2 — The allowlist is a bind-mounted file, not an env value.**
- **Why not an env value:** `profile.env` is rewritten by `setup-profile.sh` on every deploy (line ~798), so a hand edit would be lost. Passing the list per run with `-e` would make the guard "whatever the operator typed", which defeats its purpose.
- **Why a file:** a file outside everything `setup-profile.sh` writes survives every redeploy untouched. The command reads it itself, so changing who may be targeted means deliberately editing that file.
- **Format:** UTF-8 text with one internal player id (UUID) per line. Blank lines and `#` comments are ignored. Each line is trimmed (CR and BOM stripped) and lower-cased.
- **Fail closed:**
  - the file is missing or unreadable;
  - no ids are left after stripping;
  - **any** non-comment line is not a UUID (a malformed line means the list is not what the owner thinks it is).
  
  Each case refuses every subcommand, prints a loud reason and writes nothing to the DB.
- **Permissions:**
  - host directory `/opt/profile/tester-roles`: `mkdir -p … && chmod 700` in `setup-profile.sh` (exactly the `alerts/` and `digest/` lines, 659/665);
  - the file: created by the owner, `root:root 0600`. The container runs as root (`Dockerfile.profile` has no `USER`), so it can read it.
  - `setup-profile.sh` **never creates, writes or overwrites** the allowlist file. A harness assertion checks this.
- **A directory mount, not a file mount**, on purpose. A file bind mount whose host file does not exist yet makes Docker create a *directory* in its place, a classic trap. A missing file inside a mounted directory is just "missing", so the command refuses everything.
- **Honest limit, written into the runbook:** anyone with root SSH can edit the list, or run `psql` directly. The allowlist protects against **mistakes** (a wrong id, an agent-driven run aimed at a real player). It does not protect against root.

**D3 — The snapshot lives in a DB table (migration `008_tester_role_snapshots.sql`), not in a file.**
- **Why a table:**
  - it commits in the same transaction as the apply, so there is never a role without a snapshot or a snapshot without a role;
  - the nightly `pg_dump` backup includes it;
  - it sits next to the data it restores;
  - `ON DELETE CASCADE` with `players` means a deleted player can never leave an orphan snapshot.
- **Columns:**

  | Column | Type |
  |---|---|
  | `player_id` | `uuid primary key references players(id) on delete cascade` |
  | `xp` | `bigint not null` |
  | `is_citizen` | `boolean not null` |
  | `is_paid_citizen` | `boolean not null` |
  | `citizenship_earned_at` | `timestamptz` |
  | `citizenship_purchased_at` | `timestamptz` |
  | `updated_at` | `timestamptz not null` |
  | `tenure_grant_present` | `boolean not null` |
  | `tenure_xp_awarded` | `integer` |
  | `tenure_evidence` | `jsonb` |
  | `tenure_granted_at` | `timestamptz` |
  | `applied_role` | `text not null` |
  | `applied_at` | `timestamptz not null` |
  | `saved_at` | `timestamptz not null default now()` |

- One CHECK ties the four tenure columns together: all three tenure values are set exactly when `tenure_grant_present`.
- **No CHECK on `applied_role`.** Adding a role must stay a code-only change, so the role id is validated in code.
- Style follows 006/007: no `BEGIN`/`COMMIT` (the runner wraps the file) and **not idempotent** (no `IF NOT EXISTS`, so a leftover table fails loudly).
- The table name is all the "current role" state there is. A held snapshot means a role is applied; no row means none is.

**D4 — Exact values per role**, each checked against what the real code paths produce. `T` = `CITIZENSHIP_XP_THRESHOLD` (100 today), always imported, never a copied literal. Timestamps marked `now()` use the transaction's `now()`, as the real writers do.

| Role id | `xp` | `is_citizen` | `is_paid_citizen` | `citizenship_earned_at` | `citizenship_purchased_at` | Tenure row | Matches which real path |
|---|---|---|---|---|---|---|---|
| `non-citizen` | 10 (`TESTER_NON_CITIZEN_XP`) | false | false | null | null | untouched | A player who has played some matches and is not yet a citizen |
| `almost-citizen` | `T - XP_PER_MATCH` (= 99) | false | false | null | null | untouched | One `creditMatchXp` short. The next credit crosses `T`, and `GRANT_CITIZENSHIP_SQL` flips the flag and stamps `earned_at` |
| `earned-citizen` | `T` (= 100) | true | false | `now()` | null | untouched | Exactly what `creditMatchXp` + `GRANT_CITIZENSHIP_SQL` leave at the first crossing (with `XP_PER_MATCH = 1` the crossing lands on exactly `T`) |
| `paid-citizen` | 10 | true | true | null | `now()` | untouched | Exactly what `PaymentsRepository.GRANT_FLAGS_SQL` leaves for a buyer who never earned (`chk_paid_implies_citizen` forces `is_citizen`). **No `processed_purchases` row, no `purchase_intents` row** (owner ruling 2). |
| `brand-new` | 0 | false | false | null | null | **deleted** (only `kind='tenure'`, only this player) | A new player's row: `GET /v1/login` then answers `grantChecks.tenure: "pending"` (`Routes.ts:804-818`) |

- **`almost-citizen` is written as `T - XP_PER_MATCH`, not `T - 1`.** So it stays "one match away" if `XP_PER_MATCH` ever moves (ADR-111 says the two move together). It equals 99 today, as the brief says.
- **Every role satisfies all three `players` CHECK constraints.** A unit test also asserts `isCitizen === isCitizenFromXp(xp)` for every non-paid role, plus `0 < non-citizen xp < almost-citizen xp`.
- **Things a role does NOT touch** (brief §4): `display_name`, `created_at`, `last_login_at`, `extra`, `player_identities`, `player_match_xp_credits`, `player_messages`, `player_name_history`, `processed_purchases`, `purchase_intents`. The runbook spells out the consequences:
  - `brand-new` is not byte-identical to a real new player: name, inbox and credit ledger are kept;
  - a role-set citizen gets no "citizenship earned/paid" inbox message, because a role does not fire the post-grant inbox hooks.

**D5 — Transactions and lock order.** Each run is one transaction that **locks the `players` row first** (`SELECT … FOR UPDATE`), the same order as `recordTenureCheck` and `creditMatchXp`. A run can therefore never deadlock with a match credit or a tenure claim; they queue on that row's lock.
- **apply:**
  1. Lock the player. Not found: refuse, rollback, nothing written.
  2. Read the tenure row.
  3. Lock the snapshot row. If there is none, INSERT one from the locked values.
  4. UPDATE `players` with the role's fields and `updated_at = now()`.
  5. For `brand-new`, delete the tenure row.
  6. UPDATE `applied_role` / `applied_at` on the snapshot.
  7. COMMIT.
- **restore:**
  1. Lock the player.
  2. Lock the snapshot. If there is none, refuse with no write.
  3. UPDATE `players` back to the saved values, **`updated_at` included** (the brief says "exactly"; nothing on the client reads `updated_at` except the projection).
  4. Delete the current tenure row. If the snapshot held one, re-insert it with the same `xp_awarded`, `evidence` and `granted_at`.
  5. Delete the snapshot.
  6. COMMIT.
- **show:** read-only and never locks anything.

**D6 — Run log.** Appended to `/var/lib/profile/tester-roles/runs.log`, one JSON object per line: `at` (ISO UTC), `operator`, `subcommand`, `role` (or null), `tester`, `outcome` (`applied` | `restored` | `shown` | `refused` | `error`), `reason` (a fixed code such as `not_allowlisted`, `allowlist_missing`, `allowlist_empty`, `allowlist_malformed`, `unknown_role`, `bad_arguments`, `no_such_player`, `no_snapshot`, `db_error`).
- **`tester` is logged only if it parses as a UUID; otherwise `"<not-a-uuid>"`.** So a Yandex id typed by mistake never lands in the log.
- **`operator`** is the runtime env `TESTER_ROLE_OPERATOR`, filled by the runbook command as `-e TESTER_ROLE_OPERATOR="$(logname 2>/dev/null || whoami)"`. It is self-reported (the container cannot see the SSH user), and the runbook says so. When it is unset the log records `"unknown"`.
- **No secrets, no `DATABASE_URL`, no pg error text in the log** (`db_error` only). The full error message goes to stderr for the operator.
- **Fail closed on the log too:** the log file is opened for append **before** any DB work. If it cannot be opened, the run is refused with nothing written. If the final append fails **after** a commit, the command prints a loud stderr warning ("APPLIED BUT NOT LOGGED") and exits `3`.
- It never goes to telemetry, Telegram or the repo.

**D7 — Exit codes** (`0312` convention extended):
- `0`: ok.
- `1`: refused (allowlist, unknown player, no snapshot) or a DB error. Nothing was written.
- `2`: bad input (argument count or shape, unknown subcommand or role). Nothing was written.
- `3`: the DB write committed but the log line failed.

**D8 — `show` output** prints, as plain `key: value` lines: role applied (`none` or the role id plus applied-at), `xp`, `is_citizen`, `is_paid_citizen`, `citizenship_earned_at`, `citizenship_purchased_at`, `tenure grant` (`absent`, or `present, xp_awarded=N, granted_at=…`), `snapshot held` (`no`, or `yes, saved_at=…`). **It prints no ids at all, not even the typed one.** A test asserts that the output contains no UUID-shaped string.

**D9 — The paid-flag invariant gets a documented exception.** `PaymentsRepository.ts:4-7` says `is_paid_citizen` / `citizenship_purchased_at` are written by `grantPaidPurchase` ONLY. The `paid-citizen` role breaks that sentence by owner ruling 2. The plan updates that comment, and only that comment (no code change in that file), to name the one exception: the allowlisted, SSH-only tester-role command, with no purchase record. That way the next reader is not misled.

## 2. Files

**New**
- `migrations/008_tester_role_snapshots.sql`: the D3 table.
- `src/profile-server/TesterRoles.ts`: the frozen role table (D4), the role-id type and `isTesterRoleId()`. Header: adding or changing a role is a code change plus review; values are never taken at run time.
- `src/profile-server/TesterRoleRepository.ts`: `show(playerId)`, `apply(playerId, role)`, `restore(playerId)` as in D5. Returns typed outcomes (`applied` / `no_such_player` / `restored` / `no_snapshot` …) and never throws for an expected refusal.
- `src/profile-server/TesterRoleCommand.ts`: pure logic with dependencies injected:
  - `parseTesterRoleArgs(argv)`: exact arity. `apply` takes exactly 2 values, `restore` and `show` exactly 1. Extra or missing arguments give exit 2.
  - `parseAllowlist(text)` and `readAllowlist(readFile)`: the fail-closed rules in D2.
  - `formatShow(state)`.
  - `buildLogLine(...)`.
  - `runTesterRole({ argv, operator, readAllowlistFile, openLog, repo, out, err, now })`. The order is load-bearing and asserted by tests: parse arguments, then open the log, then read and check the allowlist, then check the role id, then touch the DB.
- `src/profile-server/testerRole.ts`: the entry, the `decideNameChange.ts` shape. Literal `process.env.TESTER_ROLE_OPERATOR` read; `createPool()`; real `fs` adapters; `process.exit(code)`; `pool.end()` in `finally`. Header carries the 0283 import-surface warning and the exact runbook command.
- `tests/profile-server/TesterRoleCommand.test.ts`: unit tests (see §4).
- `tests/profile-server/TesterRoles.test.ts`: role-table consistency against `Citizenship.ts` and the CHECK constraints (D4).
- `tests/integration/TesterRole.it.test.ts`: real-Postgres tests (see §4).
- `ai-agents/knowledge-base/profile-tester-roles-runbook.md`: the runbook (see §5). It is a new file because no general profile operator runbook exists; `name-change-digest-runbook.md` is feature-specific.

**Changed**
- `package.json`: add the script `"tester-role": "node --loader ts-node/esm --experimental-specifier-resolution=node src/profile-server/testerRole.ts"` (same form as `name-change:decide`).
- `setup-profile.sh`:
  - add `mkdir -p "$PROFILE_DIR/tester-roles" && chmod 700 "$PROFILE_DIR/tester-roles"` beside the `alerts`/`digest` lines (~659/665);
  - in the compose heredoc, add the profile-api volume `- ./tester-roles:/var/lib/profile/tester-roles` with a comment block in the existing style (no `$`, backtick or command substitution, the 0282 rule).
  - **No change to `profile.env`.** Nothing writes the allowlist.
- `tests/scripts/profile-deploy-hardening.test.sh`: a new structural block mirroring the digest one (lines ~2571-2590):
  1. the compose mounts `./tester-roles:<path>`;
  2. `<path>` equals the directory of `TESTER_ROLE_DIR` in `TesterRoleCommand.ts` (drift guard);
  3. it is a different directory from `alerts`, `digest` and `backups`;
  4. the `mkdir … && chmod 700` line exists;
  5. `setup-profile.sh` never writes `tester-roles/allowlist` (no `>`/`tee`/`cp`/`install` onto that path).
  
  The harness's final success marker stays unchanged, so `ShellHarnesses.test.ts` needs no edit.
- `scripts/config-parity-allowlist.json`: an entry for `TESTER_ROLE_OPERATOR`, pipeline `profile`, class `runtime-supplied`, phase 1, with a reason in the `NAME_CHANGE_DECISION` style.
- `tests/integration/Migration006.it.test.ts`:
  - the "001–004 then 006" case expects exactly `[006, 007]` (line ~152) and becomes `[006, 007, 008]`;
  - the `player_id`-is-uuid table list (~line 160) gains `tester_role_snapshots`.
  
  Both updates are required, not optional: the new migration breaks these two assertions otherwise.
- `tests/integration/support/db.ts`: add `tester_role_snapshots` to `PROFILE_TABLES` (first in the list, as a child of `players`).
- `src/profile-server/PaymentsRepository.ts`: comment only (D9).
- Task folder `worklog.md`: §7 findings (see §6) and the decision log.

**Deliberately not changed**
- `tests/profile-backup-dryrun.sh` / the restore-drill table list. That harness is Docker-only and not in `npm test`, so editing it could not be verified here.
  - **Residual:** the restore drill will not compare `tester_role_snapshots`. It is small, transient and the tester's own data. Recorded in the worklog.
- `profile-checks.sh`: its player-growth check counts `players` rows, and a role never creates or deletes one.

## 3. Order of work
1. `TesterRoles.ts` + `TesterRoles.test.ts`.
2. Migration `008` + the `Migration006` / `support/db.ts` updates.
3. `TesterRoleRepository.ts` + `TesterRole.it.test.ts` (needs the test DB, see §4).
4. `TesterRoleCommand.ts` + `testerRole.ts` + the `package.json` script + `TesterRoleCommand.test.ts`.
5. `setup-profile.sh` mount/mkdir + hardening-harness assertions.
6. Config-parity allowlist entry; `PaymentsRepository` comment.
7. §7 investigations, recorded in the worklog.
8. Runbook.
9. Full verification (§4), then the reviewer (stateful review, task-id `0425`).

## 4. Tests and verification

**Unit (`npm test -- tests/profile-server/TesterRoleCommand.test.ts tests/profile-server/TesterRoles.test.ts`)**

The repository is a fake that records every call. "No write" means zero repository calls (or only `show` for read-only paths).

- **Not on the allowlist:** refused for `apply`, `restore` and `show`. Exit 1, zero repository calls, one `refused/not_allowlisted` log line.
- **Unknown role id:** exit 2, zero repository calls, logged.
- **Fail closed:** missing file (ENOENT), unreadable (the injected reader throws EACCES, plus a real `chmod 000` temp-file case when not running as root), empty file, comments/blank lines only, and one malformed line among valid ones. Each one refuses every subcommand with zero repository calls.
- **Allowlist parsing:** CRLF, BOM, surrounding spaces and upper case are all accepted and normalized.
- **Arity:** `apply` with 0, 1 and 3 values; `restore`/`show` with 0 and 2; an unknown subcommand; no arguments. All exit 2 with zero repository calls.
- **Order:** with no log file openable, nothing else runs (exit 1, zero repository calls).
- **`show` output:** contains no UUID-shaped string (regex), even when the typed id is a UUID.
- **Log:**
  - exactly one line per run, refusals included, with every D6 field;
  - a non-UUID tester is logged as `<not-a-uuid>`;
  - no line contains a `DATABASE_URL`-like or token-like string;
  - a post-commit append failure gives exit 3 and the loud warning.
- **Import surface:** `testerRole.ts` and `TesterRoleCommand.ts` never reference `./Server`, `./Routes` or `./Telemetry` (the same scan as `NameChangeDecideCommand.test.ts`, with its not-vacuous self-check).
- **Role table (`TesterRoles.test.ts`):** every D4 invariant; `almost-citizen` equals `T - XP_PER_MATCH`; no role sets paid without citizen, purchased without paid, or earned without citizen.

**Integration (`npm run test:integration`, new `tests/integration/TesterRole.it.test.ts`)**

It uses real migrations and real Postgres. The command runner is driven with a temp-dir allowlist and log plus the real repository, so the refusal paths are proven against a real DB too.
- **Each role gives exactly its D4 values** (timestamps checked as not-null / null, and `now()`-close).
- **A second player** (with a tenure row, credits and a name) is **byte-identical** before and after every apply and restore, compared with `row_to_json` over `players`, `player_xp_grants`, `player_match_xp_credits` and `player_identities`.
- **`processed_purchases` and `purchase_intents` counts stay at 0** throughout, `paid-citizen` included.
- **`almost-citizen`, then one `creditMatchXp(game, id, XP_PER_MATCH)`:** `is_citizen` true, `earned_at` set, `citizenshipNewlyGranted` true.
- Also checked, so roles stay consistent with the real paths:
  - **`paid-citizen` + one credit:** still paid, `earned_at` null;
  - **`earned-citizen` + one credit:** `xp = T+1`, `earned_at` unchanged.
- **`brand-new`** removes only this tester's `tenure` row. A following `recordTenureCheck` answers `granted` again.
- **Restore round trip:**
  1. Start from a player with a tenure row and non-default values.
  2. Apply `brand-new`, then `paid-citizen`.
  3. Check that the snapshot still holds the **original** values (the second apply did not overwrite it).
  4. Restore.
  5. Check that the `players` row equals the original (all columns; `last_login_at` is untouched anyway), the tenure row is identical (`xp_awarded`, `evidence`, `granted_at`), and the snapshot row is gone.
  
  Variants:
  - no tenure row originally, and one claimed during `brand-new`: after restore there is no tenure row;
  - restore with no snapshot: refused, row identical, exit 1.
- **Refusals over the real DB** (not allowlisted, unknown role, no such player): the snapshot table stays empty and the row is identical.

**Gates (brief §7):** `npm test` (full: takes the project lock, 1 worker, slow, about 5 min; runs the shell harnesses, including the edited hardening one), `npm run test:integration`, `npm run lint`, `npm run check:config-parity`.

⚠️ **About `npm run test:integration`:**
- It needs the local **`gc-0012-it-pg`** Postgres container on port 5433, with `TEST_DATABASE_URL` from `.env.test` exported.
- **Docker is not running right now** (checked 2026-10-09: daemon unreachable), and Docker Desktop cannot be started from the CLI. **The owner needs to start Docker Desktop before the build's integration run.**
- **The run DROPS and recreates the `public` schema of that test database** on every run (`globalSetup`). It is throwaway, and the host guard limits it to localhost, but it is destructive by design.
- The supertest flake family does not apply to this suite: no supertest is used.

## 5. Runbook (`ai-agents/knowledge-base/profile-tester-roles-runbook.md`): contents
- **What it is and is not.** SSH-only; fixed roles; one tester list; it does not protect against root; **every `apply`/`restore` on the live box is a production write and needs the owner's OK in-session.**
- **One-time setup:**
  - create `/opt/profile/tester-roles/allowlist` (`root:root 0600`) with the format rules;
  - find the tester's internal id with a read-only query the owner approves. Two options, with trade-offs:
    1. a `player_identities` lookup by the Yandex id. This types a Yandex id into a shell, which the brief wants to avoid;
    2. read the `pid` in the tester's own login-response session token in the browser's devtools. No shell and no Yandex id involved, but the runbook warns that the token is a credential and must never be pasted anywhere.
  
  The build picks the recommended option and says why.
- **Exact commands** (paths only, no ids/hosts/secrets):
  `docker compose -f /opt/profile/docker-compose.yml exec -T -e TESTER_ROLE_OPERATOR="$(logname 2>/dev/null || whoami)" profile-api npm run -s tester-role -- apply <tester-internal-id> earned-citizen` (and the `restore` / `show` forms).
- **The role table** (D4), the exit codes (D7), what each output line means, and where the log is and how to read it.
- **After a run (from the §7 findings):**
  - a full page reload is enough (the client logs in on every load, the session lives only in memory, and `GET /v1/profile` is `no-store`);
  - the game server takes citizen status at join/resolve, so apply **between** matches and outside a lobby.
- **Paid display** shows only on a **verified** (`vfy:true`) login. An unverified login shows a paid citizen as a plain citizen with XP pinned at 100 (`PublicProjection.ts` S1 view). An earned citizen likewise shows 100/100 unless verified.
- **`brand-new` gift popup:** it shows only if the citizenship surfaces flag is on, the login says `tenure: pending`, and **that browser's** local history has ≥ `TENURE_MIN_DAYS` (3) days. The amount comes from that history (cap 50), and the claim runs once per page load.
- **`restore`:**
  - discards any XP earned while a role was on;
  - leaves inbox messages and the match-credit ledger as they are;
  - a second `apply` keeps the first snapshot.
- **Statistics:** while a role is held, ad-hoc counts of paid players or "paid without a purchase" see one tester with no purchase record. Exclude `player_id IN (select player_id from tester_role_snapshots)`.
- **Recovery:**
  - if the image is rolled back, the table stays and `restore` works again after a roll forward;
  - if the tester's Yandex id changes again (`0424`), `show` reveals that the role sits on the old record.

## 6. "Check, not assume" findings (brief §7): what the build will verify, with first evidence
- **Paid status beyond the DB.** `getPurchases` is used only in `PaymentsReconciliation.ts`, which posts to `/v1/payments/yandex/reconcile`. That route calls `grantPaidPurchase` **only for tokens not in `processed_purchases`**, grants to the **intent's** player, and only ever sets paid to **true** (`Routes.ts:1131-1162`, `PaymentsRepository.ts:44-52`).
  - **First read:** reconciliation cannot undo a role-set paid flag. It could fight a *non-paid* role only if the tester account has an unconsumed purchase whose intent belongs to the tester's record.
  - The client shows paid only in the owner view (`PlayerProfileView.ts:136-154`).
  - To be confirmed in the build and recorded.
- **Statistics.**
  - `profile-checks.sh` counts `players` only, so it is unaffected.
  - No metric or alert reads `is_paid_citizen` (grep of `profile-checks.sh`, `AlertRelay.ts`, `Telemetry.ts`: none).
  - The ad-hoc `0424`-style reads ("paid players", "purchasers not marked paid", "tenure after purchase") would count a paid-role tester as one paid player with no purchase.
  - **Proposed handling:** runbook exclusion guidance (§5), no code change. A follow-up brief only if the owner wants automatic exclusion.
- **Client caches.**
  - Session token in a module variable only (`ProfileSession.ts:17-22`).
  - Profile read is `no-store` (`Routes.ts:~683`).
  - The game server takes `isCitizen` at join/resolve (`GameServer.ts:352`, `:1671`).
  - The build checks for any other in-memory profile cache in the profile server and the game server.
- **"Brand-new" eligibility.**
  - The server reads only the grant row (`Routes.ts:804-806`).
  - The client additionally needs the surfaces gate and local evidence (`TenureGrantClaim.ts`, `TenureEvidence.ts`).
  - The popup needs `granted` with XP > 0 (`CitizenshipCard.ts:~409-427`).

## 7. Edge cases covered by the design
- Apply racing a match credit or tenure claim: serialized on the `players` row lock, same lock order, so no deadlock.
- The same role applied twice: allowed; timestamps refresh; the snapshot is untouched.
- A tester id in the allowlist but not in the DB: `no_such_player`, nothing written.
- A tester in the allowlist but later deleted: the cascade removes the snapshot; restore refuses.
- An allowlist edited between runs: read fresh on every run.
- A Yandex id typed by mistake: refused as not a UUID; never logged.
- DB unreachable: exit 1, `db_error` logged, the pg message only on stderr.
- Image rollback after migration `008`: the table stays; old code ignores it (no other code touches it).

## 8. Out of this task (owner-run, belongs to the verify task filed at close)
- **A profile deploy is required before first use:** a new image, migration `008` (run by the deploy), and the new compose mount (`setup-profile.sh` rewrites the compose file and recreates `profile-api`).
- Creating the allowlist file on the box.
- The first `apply earned-citizen` to the owner's tester (unblocks `0420` 3a/8b/4-earned, and possibly `0376`), then `show`, then the later `restore`.
- Each is a production write with the owner's OK in-session. Agents may run read-only checks (`show`, read-only SQL) only with the owner's OK.
