# Implementation plan — task `0283`: daily digest of pending name-change reviews

## 0. Premise check — does the brief still hold?

**Yes. It is buildable now, and nothing in `0277`/`0284` has already built it or blocks it.** Two corrections to the brief, neither changing its substance:

1. **Schema column.** The brief cites `migrations/004_name_change.sql`, where the partial unique index `player_name_history_one_pending_uq` is on `yandex_player_id`. That is superseded: `migrations/006_player_identity.sql:144-146` recreated the table and the index **on `player_id`** (internal uuid). The brief's *conclusion* is unchanged and correct — the index is still `where moderation_status = 'pending'`, still one pending row per player, so **the count of pending rows IS the count of waiting players**. No `DISTINCT`, no grouping.
2. **The design question the brief flagged has a third answer, and it dominates both options it listed.** The brief framed it as *"`profile-checks.sh` (cron on the box) vs an in-process daily timer"*, and correctly priced both: the cron path "needs a DB credential and a Telegram send added to a shell script"; the in-process path "survives no restart schedule of its own and doubles a message if two instances ever run". **Neither cost has to be paid.** See §1.

The dependency on `0277` is **met and verified in code**, not merely asserted: `src/core/notifications/TelegramNotifier.ts:63` carries `threadId` (topic routing), and `src/profile-server/Server.ts:151,168` already reads `TELEGRAM_TOPIC_NAME_CHANGES` and passes it to `NameChangeRepository`. Brief step 4's "inherit `0277`'s send-failure fix, do not fork it" is also satisfiable as written: the retry landed (`TelegramNotifier.ts:226-254`, `sent_after_retry`), so there is a shape to inherit.

---

## 1. Where the digest is produced, and where it is sent

### The decision

**A host cron line on the profile box triggers a one-shot Node process *inside* the existing `profile-api` container. That process counts, formats, and sends through `TelegramNotifier.ts` to the Name Changes topic. It then exits.**

```
/etc/cron.d/profile-backups (profile box, 09:00 UTC daily)
  → docker compose exec -T profile-api npm run digest:name-changes
     → sendNameChangeDigest.ts  (new entry, the migrate.ts shape)
        → countPendingNameChanges(pool)   — one SELECT
        → formatNameChangeDigest(count)   — pure
        → sendTelegramMessage(config, text)  — the EXISTING helper, threadId = Name Changes
     → exit 0 on sent / sent_after_retry, exit 1 on anything else
```

### Why this seam

- **Scheduling is structural, not coded.** Vixie cron fires once a day at a fixed UTC minute. A container restart, a crash-loop, a redeploy — none of them can produce a second message, and none can produce a message per restart. The brief's hardest requirement (verification step 4) is satisfied *by construction* rather than by a persistence file that can itself go wrong.
- **A fixed arrival time is load-bearing for the heartbeat.** An in-process timer fires 24 h after whenever the container last booted, so the "daily" message wanders across the clock. A human cannot notice "it didn't arrive today" against a wandering hour. The owner's ruling turns arrival into a monitor, so the arrival must be predictable.
- **The brief's two stated costs both disappear.** The DB credential and the Telegram send stay *inside the container*, where `DATABASE_URL`, `FEEDBACK_TELEGRAM_TOKEN`, `FEEDBACK_TELEGRAM_CHAT_ID`, `TELEGRAM_PROXY_URL` and `TELEGRAM_TOPIC_NAME_CHANGES` already are (`setup-profile.sh:992-1010`, the 0600 `profile.env`). The cron line is a pure trigger and carries no secret. **No new environment variable, no second Telegram client, no second proxy variable** — the brief's ⛔ constraints are met by not introducing anything.
- **There is an exact precedent for this invocation.** `setup-profile.sh:1238` already runs `docker compose exec -T profile-api npm run migrate` on every deploy. This is the same idiom on a schedule, and `src/profile-server/migrate.ts` is the literal template for the entry file.
- **It adds no HTTP surface at all** — see §2, which is why that section is short.

### Should it reuse `0284`'s machinery? — worked out, and the answer is *partly*

| `0284` piece | Reuse? | Why |
|---|---|---|
| The hourly cron in `setup-telemetry.sh` | **No** | Wrong box. The digest is produced on the profile box, from profile-box data. Nothing about it belongs on the monitoring box. |
| The webhook route + relay (`AlertRelay.ts`) | **No — and deliberately never** | Routing the digest through that route would make the digest's own failure modes share a surface with the route whose 401/403/404 permanently disables alerting. `AlertRelay.ts` is **not edited by this task**. |
| The atomic marker writer (`writeMarkerFileAtomically`, `AlertRelay.ts:129`) | **Only if optional step 8 is taken** (§8) | It is the right primitive if we persist "the digest was delivered at T". Not needed for scheduling — cron owns that. |
| The `./alerts:/var/lib/profile/alerts` bind mount (`setup-profile.sh:1054`) | **Only if step 8 is taken, and then as a sibling directory, not this one** | `alerts/` is the alert probe's directory; a digest marker gets `digest/`, so a future reader cannot confuse the two signals. |
| `profile-checks.sh` as the *host* of the digest | **No** | `set -euo pipefail` means an earlier check's failure could abort before the digest ran, and the digest's failure would dirty the checks' pass/fail. Two different jobs with two different consumers (dead-man's switch vs a human in Telegram). Separate cron lines, one cron file. |
| `profile-checks.sh` as a *reader* of the digest | **Optional step 8 — recommended, §8** | This is the genuinely valuable reuse and the one worth deciding on explicitly. |

### Rejected alternatives, recorded so they are not re-proposed

- **In-process daily timer in `Server.ts`** — needs its own last-sent persistence to satisfy verification step 4, drifts its arrival hour, and puts a scheduler in a process whose job is serving requests. Strictly more code for strictly less guarantee.
- **A new internal HTTP route that cron `curl`s** — adds a served route and therefore adds status codes, for nothing the `docker compose exec` path does not already do.
- **A pure-shell send (curl to Telegram from `profile-checks.sh`)** — forbidden by the brief (⛔ no second Telegram client), and would need the bot token and topic id in a host-side env file that does not hold them today.

---

## 2. Every HTTP status any new or changed route can return

**This task adds no route and changes no route. There is nothing to enumerate, and that is a design goal, not an omission.**

Stated explicitly against the 401/403/404 rule:

- The digest **serves no HTTP**. It is a one-shot process that makes one *outbound* client call (`POST https://api.telegram.org/bot…/sendMessage`, via `TelegramNotifier.ts:191`). An outbound call has no status *it* returns to anyone.
- `src/profile-server/AlertRelay.ts` is **not modified**. `ALERT_WEBHOOK_PATH`, its 200/202/500/429 behaviour, `ALERT_PROBE_RESPONSE_STATUS`, and the dedupe are all untouched. The monitoring stack's webhook channel therefore cannot see any new status from this task, so it cannot be disabled by this task.
- `src/profile-server/Routes.ts` is **not modified**. No new mount under `/internal/`, so nginx's IP allowlist (the thing that answers 403 and thereby disables the channel) is not extended or reshaped.
- The digest is also, by construction, **not a test of the alert path** — exactly as the runbook already warns at `alert-delivery-runbook.md:56-59`. It never touches the monitoring stack, never crosses nginx, never leaves from the monitoring box's egress address. Its daily arrival proves **Telegram delivery** and nothing else. That warning stays true after this ships and must not be softened.

If a reviewer later proposes reaching the digest over HTTP, the answer is: it would buy nothing and would put a new served status code next to the one route in this system where a wrong status is permanently fatal.

---

## 3. What happens when the count is zero

**It sends. Every day. Reporting `0`.**

This is an **owner ruling given live on 2026-09-17** and is not re-opened by this plan. The rationale, which is the load-bearing part: *a message every day doubles as a heartbeat; if the digest stops arriving, the silence is itself the signal.* A digest that speaks only when there is something to report is indistinguishable from a digest whose delivery has broken — the exact silent-failure class `0061` documents.

Concretely, this constrains the build in four places:

1. The CLI has **no early return on `count === 0`**. It formats and sends on every run.
2. **No config flag, no environment variable, no CLI argument** that could suppress an empty digest. Adding one would re-open a settled ruling and re-introduce the hole it closed. (⛔ `setup-profile.sh` gets no new `persist_or_reuse_secret` line for this reason among others.)
3. A unit test asserts **the zero case sends**. A test asserting "no send when empty" would be asserting the opposite of the ruling and is wrong.
4. The ruling and its heartbeat rationale are recorded in a code comment at the top of `NameChangeDigest.ts`, in `worklog.md`, and in the runbook line — so a future reader tempted to "optimise away the daily 0" understands they would be **removing a liveness check, not removing a nuisance**.

---

## 4. The change, file by file

### 4.1 `src/profile-server/NameChangeDigest.ts` — **new**, the logic

Pure and side-effect-free at import. Three exports:

```ts
export const PENDING_COUNT_SQL = `
SELECT count(*)::int AS pending
FROM player_name_history
WHERE moderation_status = 'pending'
`;

export async function countPendingNameChanges(pool: Pool): Promise<number>
export function formatNameChangeDigest(count: number, at: Date): string
export async function runNameChangeDigest(deps): Promise<"sent" | "failed">
```

- `countPendingNameChanges` — runs `PENDING_COUNT_SQL`, returns the integer. A header comment records **why one number suffices**: `player_name_history_one_pending_uq` (`migrations/006_player_identity.sql:144`) is `unique (player_id) where moderation_status = 'pending'`, so rows and players are the same count. No `DISTINCT`, no `GROUP BY` — and a note saying so, so nobody "improves" it into a grouped query.
- `formatNameChangeDigest` — three lines, HTML parse mode (matching every other operator message):
  ```
  <b>[Name change] Daily digest</b>
  Waiting for review: 3
  2026-09-19 09:00 UTC
  ```
  The only interpolated values are an integer we produced and a timestamp we produced, so nothing needs escaping — but the count goes through `String(count)` on a value already narrowed to a number, and the comment says why no `escapeTelegramHtml` call is present (a stray `<` would make Telegram *reject* the message and lose it — `AlertRelay.ts:310` records the same trap).
- `runNameChangeDigest({ pool, telegram, send, now })` — `send` and `now` are **test seams** with production defaults (`sendTelegramMessage`, `() => new Date()`), exactly the seam pattern `AlertRelayConfig` uses (`AlertRelay.ts:394-407`).
- **Send-failure handling inherits `0277`'s shape and does not fork it**: call `sendTelegramMessage`, treat **both** `sent` and `sent_after_retry` as success (the `0277` lesson recorded at `NameChangeRepository.ts:545-551` — treating a rescued retry as failure logs a warn for every message the fix saved), and on anything else `log.error` with the bounded `result`/`status`/`code` fields only. **No token, no URL, no chat id, no topic id in any log line** — the helper's outcome object is bounded by construction.

### 4.2 `src/profile-server/sendNameChangeDigest.ts` — **new**, the entry point

Modelled line-for-line on `src/profile-server/migrate.ts`:

```ts
dotenv.config();
const log = logger.child({ comp: "name-change-digest" });
run().then(code => process.exit(code)).catch(...)
```

- Builds the pool with `createPool()` (`Db.ts:17`, reads `DATABASE_URL`) and **always `await pool.end()`** in a `finally`, or the process hangs on an open handle.
- Reads the Telegram config with **literal `process.env.X` reads** — `FEEDBACK_TELEGRAM_TOKEN`, `FEEDBACK_TELEGRAM_CHAT_ID`, `TELEGRAM_PROXY_URL`, `TELEGRAM_TOPIC_NAME_CHANGES`. Literal, because `scripts/check-config-parity.mjs` is static analysis over `src/profile-server/**` and reports a **DYNAMIC-READ blind spot** for anything computed. All four names already exist in `profile.env` (`setup-profile.sh:1000-1010`) and are already exported by `build-deploy-profile.sh`, so **parity stays clean and no new name is introduced**.
- Exit code: **0** on `sent`/`sent_after_retry`, **1** on anything else (including `not_configured`, i.e. the bot is not set up). A non-zero exit is what puts the failure into the cron log — and, if optional step 8 is taken, what withholds the marker.

🚨 **The one trap in this file, called out because it is silent and fatal:** it must **never** import `Server.ts` (which calls `server.listen()` at module load) or `Routes.ts`/`Telemetry.ts` (which would start an exporter). Its import surface is exactly `dotenv`, `Db`, `Logger`, `NameChangeDigest`. This also keeps the ts-node compile cheap on a low-RAM box with an OOM history. A test asserts the module graph stays small (§5.1).

### 4.3 `package.json` — one script

```json
"digest:name-changes": "node --loader ts-node/esm --experimental-specifier-resolution=node src/profile-server/sendNameChangeDigest.ts"
```

Same flags as `migrate` and `start:profile-server`. No change to `Dockerfile.profile` — it already `COPY src ./src`, so the new files ship in the image automatically, and the harness assertion that the Dockerfile `CMD` matches `start:profile-server` is unaffected.

### 4.4 `setup-profile.sh` — one cron line, in the always-present header block

Appended inside the existing `cat > "$CRON_FILE" << EOF` heredoc (`setup-profile.sh:1703-1719`), **after** the 08:00 `checks.sh` line, so it runs in **both** backup modes:

```
# Daily name-change digest (0283) at 09:00 UTC (12:00 MSK) — ONE message into the Name Changes
# topic with the number of players waiting for a name review. It sends EVEN WHEN THE COUNT IS
# ZERO (owner ruling, 2026-09-17): the daily arrival is the Telegram-delivery heartbeat, so its
# ABSENCE is the signal. ⛔ Never add a "skip when empty" condition here or in the CLI.
# No literal % in this line, so no Vixie escaping is needed. </dev/null so a compose exec can
# never consume cron's stdin (the same footgun profile-checks.sh's check 10 guards against).
0 9 * * * root docker compose -f $PROFILE_DIR/docker-compose.yml exec -T profile-api npm run digest:name-changes </dev/null >> /var/log/profile-name-change-digest.log 2>&1
```

Four details, each deliberate:

- **09:00 UTC**, not 08:00 — clear of the existing 08:00 pile-up (`checks.sh` + the disk-usage line) so a slow checks run cannot delay the digest, and 12:00 MSK is an hour an operator is awake to notice a *missing* message.
- **`-f $PROFILE_DIR/docker-compose.yml`** rather than `cd`, matching `profile-checks.sh:384`'s check 10, so the line does not depend on cron's cwd.
- `$PROFILE_DIR` expands at write time — the heredoc is unquoted `EOF`, same as the `checks.sh` line above it.
- **Ordering is already safe**: `setup-profile.sh` pulls and recreates the image (~line 1168) and migrates (1238) long *before* the cron block (1700+), so the cron line is never written against an image that lacks the script.

**No change to the compose file, no new volume, no new `persist_or_reuse_secret`, no change to `profile.env`, no change to `checks.env`.**

### 4.5 `setup-telemetry.sh`, `build-deploy-telemetry.sh`, `nginx.conf`, `update.sh`, `AlertRelay.ts`, `Routes.ts`, `Server.ts` — **unchanged**

Listed explicitly because the hardening harness lints several of them and an accidental edit is how `npm test` goes red for someone who is not touching test code.

### 4.6 Documentation

- **New:** `ai-agents/knowledge-base/name-change-digest-runbook.md` — a short page matching the existing `profile-*-runbook.md` naming: where it runs (profile box cron, 09:00 UTC), what it sends, **the variable NAMES only** it needs, how to run it by hand, how to turn it off (comment the cron line and redeploy, or clear `TELEGRAM_TOPIC_NAME_CHANGES`… noting that clearing the topic does **not** turn it off, it moves it to General), and — first and loudest — **that it proves Telegram delivery and nothing about the monitoring→relay hop**. ⛔ No host, no IP, no chat id, no topic id, no token.
- **Edit, two lines:** `ai-agents/knowledge-base/alert-delivery-runbook.md:470-475` currently says *"Sustained delivery is unproven until `0283` lands"*. Once this ships, that becomes "proven from `<date>`, and here is what it still does not prove". The warning at `:56-59` (*the digest cannot catch the alert-path failure and is actively misleading if read that way*) **stays exactly as it is** — shipping the digest makes that warning more important, not less.
- **`worklog.md`** records: the owner's zero-count ruling *with its heartbeat rationale*; that `0277`'s send-failure fix is inherited (verified present in `TelegramNotifier.ts`, not assumed); the date the owner observed a real arrival; and the date the owner observed a real **zero-count** arrival. ⛔ No topic id, chat id, token or host.

---

## 5. Tests

### 5.1 New unit suite — `tests/profile-server/NameChangeDigest.test.ts`

Style follows `tests/profile-server/NameChangeRepository.test.ts`: `jest.mock` the Telegram module, drive a scripted fake pool that throws loudly on unanticipated SQL.

| Case | Asserts |
|---|---|
| count query | `countPendingNameChanges` issues SQL containing `moderation_status = 'pending'` and `player_name_history`, with **no `DISTINCT`/`GROUP BY`**, and returns the integer |
| **zero sends** | `count = 0` ⇒ `send` called **exactly once**, message reads `Waiting for review: 0`, result `"sent"` |
| non-zero | `count = 7` ⇒ one send, message carries `7` |
| exactly-once per invocation | `send` called once per `runNameChangeDigest` call — never twice, never zero |
| `sent_after_retry` is success | outcome `sent_after_retry` ⇒ result `"sent"`, **no error logged** (the `0277` lesson) |
| failure is loud | `http_error` / `network_error` / `not_configured` ⇒ result `"failed"`, `log.error` called, and the logged text contains **no token, no URL, no chat id** |
| topic routing | the `TelegramConfig` handed to `send` carries the `threadId` it was given |
| no side effects on import | importing `NameChangeDigest` opens no pool, binds no port, registers no timer |

### 5.2 Existing suite extended — `tests/integration/NameChange.it.test.ts` (real Postgres)

Per brief verification step 1. Seed across **several distinct players**: some `pending`, some `approved`, some `rejected`, and at least one player whose only row is a **decided** request (so they must *not* be counted). Assert the reported number equals the number of players with a pending request — **not** the number of history rows and **not** the number of players. Plus a zero-rows case ⇒ `0`.

⚠️ **This suite is NOT in `npm test`.** It runs only via `npm run test:integration`, which needs `RUN_DB_TESTS` (set by the script) and a `TEST_DATABASE_URL` the developer supplies, against the local `gc-0012-it-pg` container on port 5433. **The run DROPs and recreates the `public` schema.** If the coder cannot start that container, the honest report is *"the integration assertion was written but not executed, here is why"* — not a claim of green.

### 5.3 `tests/scripts/profile-deploy-hardening.test.sh` — new assertions

The harness has **no assertion that would break from adding a cron line**: `tests/scripts/profile-deploy-hardening.test.sh:478-481` extracts the cron header heredoc into `$CRON_HEADER` and `grep -qE`s for the `checks.sh` line *within* it — a per-line search, not a whole-block match. Adding a line beside it is safe.

Assertions touched: **none changed.** Assertions **added**, in the file's own idiom (banner → `awk`-extract → non-vacuity guard → value assert), reusing the existing `$CRON_HEADER` extraction:

1. `$CRON_HEADER` contains **exactly one** line matching `^0 [0-9]+ \* \* \* root docker compose -f \$PROFILE_DIR/docker-compose\.yml exec -T profile-api npm run digest:name-changes` — *exactly one*, because two cron lines is the only way this design can double-send.
2. That line has a **daily** schedule (day/month/weekday all `*`) — a `*/N` hour field would turn the heartbeat into a flood.
3. That line ends with `</dev/null` and redirects to a log file.
4. `package.json` declares the `digest:name-changes` script whose target file matches the path in the cron line — the same two-files-agree-on-one-string drift guard the harness already uses for `ALERT_PROBE_MARKER_PATH` (`:1591-1601`).
5. `src/profile-server/sendNameChangeDigest.ts` imports neither `./Server` nor `./Routes` — the silent-fatal trap from §4.2, asserted statically because a runtime failure would only show up on the box.
6. `src/profile-server/NameChangeDigest.ts` contains **no** "skip/suppress when empty" branch — a grep guard on the owner's ruling, so a later "optimisation" turns `npm test` red instead of silently deleting the heartbeat.

The harness's final summary line (`ALL PASS` / `SOME FAILED`) is unchanged, so `tests/scripts/ShellHarnesses.test.ts` needs **no edit**.

### 5.4 `tests/profile-checks.sh` — **untouched** unless optional step 8 is taken

`profile-checks.sh` is not modified by the base plan, so its harness needs no change and its `==== RESULT: N passed, 0 failed ====` marker is unchanged.

### 5.5 Gates

`npm test` (including the shell harnesses, ~22–25 s), `npx tsc --noEmit`, `npm run lint` — all must exit 0. `npm run check:config-parity` must stay clean; **no new variable is introduced**, so the expectation is *no new finding*, and any new finding is a defect in the plan, not an accepted output.

⚠️ If a `supertest` suite flakes during a full run, apply `CLAUDE.md`'s rule: rule out `0197`'s `SIGSEGV` first, then **re-run and say that you re-ran**. Do not report a flake as a pass without saying so.

---

## 6. Verification — what an agent proves, and what only the owner can

### Verified by the agent, without deploying

1. The count is right against the real schema, real constraints, real partial index — §5.2, **if** the integration database can be started; otherwise flagged as unrun.
2. Zero sends — §5.1.
3. Exactly one send per invocation, and exactly one daily cron line — §5.1 + §5.3.
4. Failure is loud and leaks nothing — §5.1.
5. **The per-request notification is undisturbed** (brief verification step 6): `NameChangeRepository.ts`'s existing path (its `notifyOperator`, around `:542`) is not modified; its existing tests in `tests/profile-server/NameChangeRepository.test.ts` and `tests/integration/NameChange.it.test.ts` must stay green **unchanged** — that, not a new test, is the regression proof.
6. `npm test`, `tsc --noEmit`, `lint`, `check:config-parity` — §5.5.

### ⛔ Owner-executed on the real box — never claimed by an agent

`0219`'s precedent is explicit: an arrival that has only been asserted does not count.

1. **Deploy** (`./build-deploy-profile.sh`) — owner-run.
2. **Run it once by hand** and watch the message arrive in the **Name Changes** topic:
   `docker compose -f /opt/profile/docker-compose.yml exec -T profile-api npm run digest:name-changes`
   Exit 0 ⇒ Telegram accepted it.
3. **Confirm the room**: Name Changes topic — *not* the Alerts topic and *not* the player-feedback chat (brief verification step 3).
4. **The second day's single message** — one message, not two, proving the schedule.
5. **A zero-count day sends** — observed arriving on a day with nothing pending.
6. Worklog records **the dates and that it arrived**. ⛔ No topic id, no chat id, no token, no host.

---

## 7. Deploy: which box, and what a rollback does

**The profile box only. The telemetry/monitoring box is not touched and needs no deploy.**

One run of `./build-deploy-profile.sh` covers both halves: it builds and pushes the image carrying the new CLI, then runs `setup-profile.sh` on the box, which recreates the container and (later in the same run) rewrites `/etc/cron.d/profile-backups` with the new line. The ordering inside `setup-profile.sh` means the image is already current when the cron line is written.

🚩 **Rollback surprise, to be written into the runbook before it bites someone** — the same shape as `0284`'s surprise 1: **a profile image rolled back to a build predating `0283` leaves the cron line in place**, calling an npm script that does not exist. The result is a daily `npm ERR! Missing script` in `/var/log/profile-name-change-digest.log` and **no digest** — which looks exactly like a broken Telegram path. Check the running image before hunting for a delivery fault.

---

## 8. OPTIONAL step 8 — make the missing heartbeat page a machine, not a human

**Recommended IN. Flagged for the owner's call at this gate. If the owner says no, drop this section and nothing else in the plan changes.**

### The gap it closes

As built above, a digest that fails to send writes `log.error` and exits 1 into a cron log **that nothing reads**. That is the `0219` shape the runbook itself names at `alert-delivery-runbook.md:60-61`. The owner's ruling makes the digest's *absence* the signal — but the only observer of that absence is a human who happens to remember. This step gives the absence a mechanical observer that already exists and already pages.

### What it is

1. `sendNameChangeDigest.ts` writes a marker **only on a successful send** — `{schema, finished_at, source}` at `/var/lib/profile/digest/last-name-change-digest.json`, using `0284`'s atomic temp-file-then-rename pattern (lifted from `AlertRelay.ts:129`). A failed send writes nothing, so the marker ages.
2. `setup-profile.sh` creates `$PROFILE_DIR/digest` (0700) and adds `- ./digest:/var/lib/profile/digest` to the `profile-api` service — a **sibling of `alerts/`, never the same directory**, so the two signals can never be confused. ⛔ Never mount `backups/`.
3. `profile-checks.sh` gains **check 12**, `name-change-digest`, reading that marker's age in the existing daily 08:00 run: stale (> 26 h) or missing ⇒ FAIL ⇒ the **external dead-man's switch** pages — a path that touches neither the monitoring stack nor Telegram, which is exactly why it works where the thing it is watching has broken.
4. 🚩 **It needs a negative-age guard**, per the project's own rule after `0284` review R5: a future-dated `finished_at` gives a negative age that `-gt` reads as *fresh*, so the check would stay green for as long as the clock skew lasts. Same wording and shape as `check_alert_probe` (`profile-checks.sh:460-466`).

### Its honest cost — this is why it is a separate decision

- **Seven `RESULT: N ok` assertions in `tests/profile-checks.sh` must be bumped** (lines 199, 277, 322, 345, 359, 468, 484) because a 12th check changes every counted total. Mechanical, but it is seven edits in a file that is a `npm test` gate.
- A new `C23` block in `tests/profile-checks.sh` covering fresh / stale / missing / future-dated / threshold-override, in that file's existing idiom.
- `reset_fixture()` must seed the new marker directory.
- Two more hardening-harness assertions: the `digest/` bind-mount target must equal the marker path compiled into the CLI (the drift guard), and `checks.sh` must actually call check 12.
- It touches the compose heredoc, which the hardening harness lints closely (`:398-456`) — the `${NAME}`-substitution and unbraced-`$NAME` assertions apply to anything added there. The proposed line contains no `$`, so it is safe, but it is the one edit in this step that can turn `npm test` red for an unrelated reason.

Roughly a third more work than the base plan. **The base plan is complete and shippable without it.**

---

## 9. What this task does and does not prove — to be stated in the runbook, not discovered later

- ✅ It proves **Telegram delivery from the profile box is alive**, once per day, unconditionally. That is the only non-circular proof of *sustained* delivery this system has, which is why `alert-delivery-runbook.md:470-475` has been waiting for it.
- ⛔ It proves **nothing about Uptrace alert delivery**, and reading it that way is actively dangerous. The digest never touches the monitoring stack, never crosses nginx's `/internal/` allowlist, and never arrives from the monitoring box's egress address. **A 403 could have permanently disabled the alert channel and this digest would keep arriving daily, saying "the bot works", while every alert was dead.** `0284`'s probe guards that path; the two complement each other and neither substitutes for the other.
- ⛔ It is only a **partial** backstop for `0061`. It tells you the path was alive *at 09:00 UTC*; it does not tell you that any individual per-request notification arrived. `0061` still owns the fix for the send itself; this only notices that sending stopped.
- ⛔ It does not prove **delivery after an idle period** (`0274` amendment A1). A daily cadence exercises a cold connection roughly the way a rare real alert would — so it is weak evidence *toward* A1, but it is not the test A1 asks for, and it must not be recorded as discharging it.

### Deliberately out of scope, so it is not added by drift

- **The age of the oldest pending request** ("waiting 6 days") would be genuinely useful, but the owner's requirement was verbatim *"the amount of users that wait"*, and it would add another age computation needing its own negative-age guard. Not in this task.
- **A metric counter for the digest.** A monitor on "the digest failed" would travel the alert path to tell you the alert path is fine — circular. And a metric appears in the picker only after its first increment, so it would be un-monitorable on day one anyway. Skipped on purpose.

---

## 10. Open questions for the owner

1. **Take optional step 8?** (marker + `profile-checks.sh` check 12 → the dead-man's switch pages when the digest stops). **Recommendation: yes** — it converts "a human notices the silence" into "the pager fires", which is what makes the owner's heartbeat ruling actually operable. **Cost if yes:** seven `RESULT: N ok` count bumps in `tests/profile-checks.sh`, a new `C23` test block, a compose bind-mount edit, two extra harness assertions — roughly a third more work. **If no:** the base plan ships complete; the digest's failure is then visible only in a cron log nobody reads, plus the absent message.
2. **Cron hour — 09:00 UTC (12:00 MSK)?** Proposed because it is clear of the 08:00 checks pile-up and lands at a Moscow midday when a missing message is noticeable. Any other fixed hour works identically; only *fixed* matters. **Recommendation: 09:00 UTC**, no strong view.

---

## ⛔ OWNER RULINGS AT THE PLAN GATE — appended by the `fkit-sprint-ship-loop` driver, 2026-09-18

**Everything above this line is the plan as the coder returned it and as the owner approved it. Nothing above has been edited.** This section is appended, not merged, so the approved bytes stay readable as approved. **Where this section and the plan above disagree, THIS SECTION WINS** — it carries the owner's answers to §10's two open questions, given live in the lead session via `AskUserQuestion` on 2026-09-18.

### Ruling 1 — the plan is APPROVED as written. Build it.

### Ruling 2 — §10 question 1: **TAKE OPTIONAL STEP 8. It is IN SCOPE.**

§8 is **no longer optional**. Build it in full:
- the success-only marker at `/var/lib/profile/digest/last-name-change-digest.json`, written with `0284`'s atomic temp-then-rename pattern;
- the `digest/` directory (0700) and its bind mount — a **sibling of `alerts/`, never the same directory**;
- `profile-checks.sh` **check 12**, `name-change-digest`, stale (> 26 h) or missing ⇒ FAIL;
- 🚩 **the negative-age guard is mandatory, not optional** — a future-dated `finished_at` yields a negative age that `-gt` reads as *fresh*, so the check would stay green for the whole duration of a clock skew. Same shape as `check_alert_probe` (`profile-checks.sh:460-466`). This is the `0284` review R5 lesson and it is not to be re-learned.

**Its full cost is accepted knowingly**, as §8 priced it: seven `RESULT: N ok` bumps in `tests/profile-checks.sh` (lines 199, 277, 322, 345, 359, 468, 484), a new `C23` block covering fresh / stale / missing / future-dated / threshold-override, a `reset_fixture()` seeding change, two more hardening-harness assertions, and one compose-heredoc edit.

⚠️ **That compose-heredoc edit lands in the block `0282` hardened yesterday.** `N1`–`N5` now guard it: the delimiter must stay `<< 'EOF'`, **no backtick** may appear in the block (not even escaped), **no `$( )`**, every `${NAME}` needs an explicit substitution line, and **no unbraced `$NAME`**. The proposed `- ./digest:/var/lib/profile/digest` line contains no `$` at all, so it is safe as written — **but do not introduce one**, and if you must, add its substitution line or `npm test` goes red.

### Ruling 3 — §10 question 2: **THE HOUR IS 07:00 MSK, WHICH IS `0 4 * * *` UTC.**

⛔ **This OVERRIDES the `09:00 UTC` / `0 9 * * *` written throughout §1, §4.4, §4.6 and §6 above.** The owner chose **07:00 Moscow time**. Moscow is **UTC+3 year-round** — Russia abolished seasonal clock changes in 2014 — so there is no summer/winter variant and the cron field is simply:

```
0 4 * * * root docker compose -f $PROFILE_DIR/docker-compose.yml exec -T profile-api npm run digest:name-changes </dev/null >> /var/log/profile-name-change-digest.log 2>&1
```

**Every place the plan says `09:00 UTC` or `12:00 MSK` — the cron line itself, its explanatory comment, the runbook page, and the §6 verification text — must read `04:00 UTC (07:00 MSK)` instead.**

📌 **The reasoning §4.4 gave for its hour still holds at this one, and that was checked, not assumed:** `04:00 UTC` is clear of the `08:00 UTC` pile-up (`checks.sh` plus the disk-usage line) by four hours, so a slow checks run cannot delay the digest. **⚠️ Before writing the line, read the WHOLE cron file `setup-profile.sh` generates and confirm nothing else already fires at or near `0 4` — the nightly backup in particular.** A collision would not corrupt anything, but it would put the digest behind a long job on a low-RAM box with an OOM history. **If something does collide, say so and return `NEEDS-DECISION` rather than silently picking a different minute** — the owner chose the hour and only the owner changes it.

**Do not "correct" `07:00 MSK` to the planner's `12:00 MSK` anywhere.** The planner's midday argument was that an operator is awake to notice a *missing* message; the owner chose early morning instead, and that is the owner's call to make, not a mistake to fix.
