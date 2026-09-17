# 0274 — S5: monitoring, creation switch, cleanup runbook — APPROVED PLAN

> **Approved by the owner 2026-09-16** via `AskUserQuestion` in the `fkit lead` session
> (`fkit-sprint-ship-loop` driver). This file is the approved artifact; the driver wrote it at
> approval, before the Build spawn.

## Owner rulings folded into this plan

| Ruling | Decision |
|---|---|
| **D1** — alert delivery | **Telegram, not email.** Uptrace on the box has **no delivery channel at all** today, so this is a **separate task, [`0277`](../0277-uptrace-alert-delivery-to-telegram/brief.md)**, which S5 depends on. S5 **defines** the six rules; **`0277` makes them deliverable.** S5's alert drill and its "an alert actually arrives" verification **cannot pass until `0277` lands.** Everything else in S5 is unblocked. |
| **D2** — cleanup thresholds | **All recommended guards, no schema change.** Minimum age **6 h**; exclude players who came back after the window; batch size **10 000**; **no `created_source` column** — no migration 007. |
| **D3** — the creation switch | **Survives a redeploy** via a persist file (`persist_or_reuse_secret`). An **unknown value → ON**, with a loud warning at boot and a **FINDING** in the deploy's value report. |
| **D4** — what goes on the profile box | **`OTEL_EXPORTER_OTLP_ENDPOINT` only.** **No DSN, no project token, no `OTEL_AUTH_HEADER`** — the ingest path is anonymous; the telemetry collector adds the DSN itself. The endpoint is not a credential but it is a host, so it stays in gitignored env files and never appears in a tracked artifact. |
| **D5** — Uptrace retention | **No new decision.** Dashboards only need 14 days. Re-baselining on day 14 and arming A2 on day 8 belong to `0217`'s post-go-live steps (the producer's call). |
| **D6** — drills on the real box | **Yes.** One synthetic login on the live box with the switch off (expect 503, no row), then on (one row), then delete that row with the runbook. Rehearses the switch **and** the cleanup for real. |
| **D7 / Q2** — deploy bundle | **Two profile-box deploys.** Deploy 1 = S2 + S3 + `0273`'s legacy-fallback removal. **S5 is deploy 2.** Both land **before** the game deploy — which satisfies `0273`'s ruling D2 (monitoring live before real player rows start appearing). |

---

## Summary

- 🚨 **Email alerts cannot be delivered today, and neither can Telegram ones yet.** The Uptrace config `setup-telemetry.sh` writes has no `mailer:`/SMTP section and no `telegram: bot_token:`, and Uptrace ships with email off. Rules A1–A6 would fire and reach nobody. **Owner ruling D1 moves this to `0277`**; S5 depends on it and its drill cannot pass without it.
- **Correction to the brief: no Uptrace DSN goes on the profile box.** The ingest path is anonymous — the telemetry box's nginx `/v1/` passes straight to its collector, and the collector adds the DSN itself. `.env.prod` has an https endpoint set and no `OTEL_AUTH_HEADER`, and the game server's metrics arrive anyway. The profile box needs only `OTEL_EXPORTER_OTLP_ENDPOINT` (**D4**).
- **The cleanup query cannot see who created a player.** Nothing in the schema records login vs game-server. So "junk" can only be inferred, with guards: an operator-given time window, a minimum age, and "never came back" (**D2**). S3's concern — deleting a real player mid-match and losing that match's XP — is handled by the minimum-age guard.
- **The switch is checked in one place only:** the create step of `POST /v1/login`. Game-server resolve still creates, as the design rules. **Accepted risk:** anyone can open a WebSocket join with a made-up Yandex id and create a player through the game server. That is slow, and A1 counts both sources.
- **The switch must survive a redeploy** (**D3**) — otherwise a redeploy during an incident quietly turns creation back on. Also, `docker compose restart` does **not** re-read `env_file`: flipping the switch needs `up -d --force-recreate`.
- **No existing code to hook `tenure.claims` into.** `0253`'s route is not in `Routes.ts`. S5 only defines the counter; `0253` adds the call.
- **Alert A3 must not count `creation_paused`.** If it counted every login 5xx, A3 would page non-stop while the switch is off. A3 uses `outcome ∈ {error, session_unavailable}`.
- Effort: **2–2.5 dev days**, plus owner UI time and the drill. (`0277`'s ~0.5–1 d is its own task.)

## Evidence gathered during planning

- Profile server has no OTEL today. `Logger.ts` says so; `Server.ts` builds a winston logger only.
- Game-server OTEL pattern: `WorkerMetrics.ts` uses `MeterProvider`, `PeriodicExportingMetricReader` every 15 s, and `OTLPMetricExporter` to `${endpoint}/v1/metrics`. Endpoint and auth come from `src/core/configuration`, **which the profile server must never import** (a drift test enforces this).
- OTEL packages are already regular dependencies (`sdk-metrics` 2.6.1 + `exporter-metrics-otlp-http`). `Dockerfile.profile` runs a full `npm ci`, so the image already has them. Checked: they load under plain Node `require`.
- Telemetry ingest: `setup-telemetry.sh` nginx `location /v1/` proxies to the collector on port 4318, whose OTLP receiver has no auth. Its exporter sets the `uptrace-dsn` header. `uptrace.yml` has `auth: {}` and no `mailer`.
- `PlayerIdentityRepository.resolveOrCreatePlayer` has a `void source; // S5 metrics…` placeholder. Its private `findExisting` does find + touch `last_login_at` + profile.
- `LoginContract.ts` says: *"503 creation_paused is S5's — deliberately not declared here."*
- Config parity baseline today: profile REQUIRED 0 / INFO 0.
- `build-deploy-profile.sh` loads `.env → .env.secret → .env.profile → .env.profile.secret`. **A blank line in `.env.profile` overrides a value set earlier.**
- `profile-checks.sh` has 8 checks. Test assertions that will change: `RESULT: 8 ok` in C1/C13, `7 ok, 1 failed` in C9/C19, `7 ok, 2 failed` in C18.

⚠️ **Superseded by `0273` ruling D1:** `resolveCaller` no longer has a legacy branch or a `via` field — `0273` deleted them in the same change set. **The `session.rejected` reason `legacy_fallback_used` is NOT to be built.** Only `expired` and `invalid`.

---

## Step-by-step

### 1. `src/profile-server/Telemetry.ts` (new)

- **Interface:** `ProfileMetrics`, plus a `noopProfileMetrics` used by tests and when metrics are off. Methods: `loginRequest(platform, outcome)` · `playerCreated(platform, source)` · `httpRequest(route, method, statusClass, ms)` · `sessionRejected(reason)` · `tenureClaim(outcome)`.
- **`createProfileMetrics(meter, deps)`** takes `pool` and a `countPlayersEstimate()` function. It creates:

| Metric | Type | Attributes and notes |
|---|---|---|
| `geoconflict.profile.login.requests` | counter | `platform` (`yandex_games` or `unknown` — **never the raw body value**); `outcome` = existing / created / bad_request / creation_paused / session_unavailable / error. `session_unavailable` is new vs the design table: it is a real 503 the design did not list. |
| `geoconflict.profile.players.created` | counter | `platform`, `source` = login / game_server |
| `geoconflict.profile.http.duration` | histogram, ms | `route`, `method`, `status_class`. **Bucket boundaries must include 750** (for A4). |
| `geoconflict.profile.session.rejected` | counter | `reason` = expired / invalid. ⛔ **Not `legacy_fallback_used`** — see the superseded note above. |
| `geoconflict.profile.tenure.claims` | counter | `outcome` (**defined only, no caller yet** — `0253` adds the call) |
| `geoconflict.profile.db.pool.waiting` | gauge | reads `pool.waitingCount` |
| `geoconflict.profile.players.total` | gauge | value cached by an **unref'd** 5-min timer reading `reltuples`. Skip if it is `-1` (never analyzed); skip the query while `pool.waitingCount > 0`. |
| `geoconflict.profile.process.cpu.usage` | gauge | unit `"1"`, mirrors `WorkerMetrics` |
| `geoconflict.profile.process.memory.rss` / `.memory.heap.used` | gauges | mirror `WorkerMetrics` |
| `geoconflict.profile.login.create_enabled` | gauge, 0/1 | not in the design; cheap, and makes the switch state visible on the dashboard |

- **`startProfileTelemetry(log, pool)`** reads **literal** `process.env.OTEL_EXPORTER_OTLP_ENDPOINT` (the parity checker needs a literal read).
  - Empty → returns the no-op version and logs **one** warning naming the variable only.
  - Set → trims a trailing `/`, appends `/v1/metrics`, exports every 15 s with the default cumulative temporality — the same as the game server, which already works against this Uptrace.
  - Resource: `service.name=geoconflict-profile`; `service.instance.id` from `os.hostname()`. **Do not** read `HOSTNAME` from env — that would create a new parity finding.
  - Export failures are otherwise silent. Wrap the exporter so a failure logs **one warning at most every 10 min**, naming **only the error type** — no URL, no message. This is how a broken box → Uptrace path shows up in the container log.
- **Out of scope:** log and trace export; `src/server/*`; `src/core/configuration`; changes to `Shutdown.ts`. Up to 15 s of metrics is lost on each restart — accepted.

### 2. Wiring in `Server.ts` / `Routes.ts` / `PlayerIdentityRepository.ts`

- **`PlayerIdentityRepository`:**
  - The constructor takes an optional `{ onPlayerCreated(platform, source) }` callback. Called **once, after COMMIT, on the `created` branch only** — not on a found player, a lost race, or an id collision. This replaces the `void source` placeholder.
  - New public `resolveExistingPlayer(platform, id): Promise<ResolvedPlayer | null>` — the current private `findExisting`, made public. **It never inserts.**
- **`ProfileRepo` interface:** add `resolveExistingPlayer`. Mechanical updates in `Server.ts`, `tests/integration/support/db.ts` and ~7 mocks in `tests/profile-server/*`.
- **`createApp`:** new optional 6th parameter `options?: { loginCreateEnabled?: boolean; metrics?: ProfileMetrics }`. Defaults: `true` and no-op.
- **HTTP timing middleware**, mounted **first, before `express.json()`**, so 400/413/415 are timed too:
  - `res.once("finish")` records `route = req.route ? req.baseUrl + req.route.path : "unmatched"`. **Never `req.path` or `originalUrl`** — scanners would create unlimited label values, and ids would leak through the query string.
  - `status_class` is `2xx`…`5xx`.
- **`POST /v1/login`**, in this order:
  1. session check → 503 + `session_unavailable`
  2. parse → 400 + `bad_request`
  3. `loginCreateEnabled ? resolveOrCreatePlayer(…, "login") : resolveExistingPlayer(…)`
     - `null` → **503 `{error:"creation_paused"}`** with CORS (already on the route), outcome `creation_paused`, **no write**
  4. outcome `created`/`existing` from `resolved.created`; catch → `error`
- **`resolveCaller`:** expired/invalid → `sessionRejected`. That includes "no header" (it answers `session_invalid`). ⛔ No `legacy_fallback_used` — the branch no longer exists.
- **`/internal/v1/players/resolve`:** **unchanged.** It always creates, and its creations are counted through the repository callback.
- **`LoginContract.ts`:** add `LOGIN_ERROR_CODES` (`bad_request`, `creation_paused`, `session_unavailable`, `internal_error`) and update the header comment. This is a `src/core` change, so **it gets a test**.
- **`LoginCreationSwitch.ts`** (new, tiny): `parseLoginCreateEnabled(raw, log)`.
  - Blank → `true`
  - `true`/`false` (case-insensitive, trimmed) → that value
  - anything else → **`true` + a loud warning** (D3)
  - `Server.ts` reads literal `process.env.PROFILE_LOGIN_CREATE_ENABLED` and logs the effective state at boot ("login creation ENABLED/PAUSED").

### 3. Deploy wiring

- **`build-deploy-profile.sh`:** `printf "export OTEL_EXPORTER_OTLP_ENDPOINT=%q\n"` and the same for `PROFILE_LOGIN_CREATE_ENABLED`.
- **`setup-profile.sh`:**
  - Header docs for both variables.
  - `persist_or_reuse_secret OTEL_EXPORTER_OTLP_ENDPOINT "$PROFILE_DIR/.otel_endpoint"` — so a deploy from a machine without the value cannot silently turn metrics off (the `0195`/`0220` problem).
  - `persist_or_reuse_secret PROFILE_LOGIN_CREATE_ENABLED "$PROFILE_DIR/.login_create_enabled"` (**D3**).
  - Both lines added to the `profile.env` heredoc.
  - `report_config_values` rows:
    - endpoint: https + hostname → **OK**; http, IP literal or junk → **FINDING**; empty → **OPTIONAL** "no metrics ⇒ no alerts"
    - switch: `false` → a loud **PAUSED** line; unknown value → **FINDING** (D3)
  - A **report-only reachability probe**: `curl -sS -m 5 -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' --data '{}' "$endpoint/v1/metrics"`. Prints "OTLP ingest reachable (HTTP nnn)" or "UNREACHABLE", **never the URL**, and discards stderr. Runs on every deploy — the repeatable box → Uptrace proof.
  - `checks.env` gains `POSTGRES_USER` and `POSTGRES_DB` (for step 5). Not secrets.
- **`example.env.profile`:** a **commented** `# OTEL_EXPORTER_OTLP_ENDPOINT=` with notes (copy the game prod value; persisted; to clear, `rm` the persist file). **Commented, because a blank line would override a value sourced earlier.** Also a commented `# PROFILE_LOGIN_CREATE_ENABLED=` with semantics and the flip procedure.
- **`scripts/config-parity-allowlist.json`:** inert phase-2 `optional` entries for both, matching the Telegram entries. Must still show profile REQUIRED 0 / INFO 0.
- **`tests/scripts/profile-deploy-hardening.test.sh`:**
  - Staged env has exactly one `export` line per variable; `%q` values survive the round trip; blank stays blank.
  - Structural: both `persist_or_reuse_secret` lines, **neither in `generate` mode**; both keys in the `profile.env` heredoc.
  - Value report: bad endpoint (http, IP, trailing junk) → FINDING; empty → OPTIONAL; `false` → PAUSED; junk → FINDING; **a canary value never appears in output**.
  - Probe line exists and its curl stderr is discarded.
  - `checks.env` carries `POSTGRES_*`.

### 4. Cleanup runbook: `ai-agents/knowledge-base/profile-junk-cleanup-runbook.md` (new)

Kept **separate** from `profile-backup-restore-runbook.md`, which has uncommitted `0275` edits.

- **Sections:** when to use it; flip the switch first; take a fresh backup; dry run; delete in batches; VACUUM; flip back.
- **The one SQL block.** psql `\set window_start` / `window_end` / `min_age`, then deletes from `players p` where:
  - `created_at` is in `[window_start, window_end)` **and** `created_at < now() - :min_age` (**D2: minimum age 6 h**)
  - `last_login_at < window_end + interval '1 hour'` — never came back (**D2**)
  - `xp = 0`, not a citizen, not a paid citizen, `display_name IS NULL`
  - `NOT EXISTS` in: identities created outside the window, `player_match_xp_credits`, `player_xp_grants` (**0-XP rows count as real**), `purchase_intents`, `processed_purchases` (matched by `player_id`, which has **no foreign key**), `player_messages`, `player_name_history`, `player_cosmetic_ownership`
  - Identities are removed by cascade.
- **Dry run** = the same `WHERE` with `count(*)` plus min/max `created_at`. **No ids.**
- **Delete** runs in batches of **10 000** (`ctid IN (SELECT … LIMIT)`), repeated until 0 rows. Each batch commits separately, so the operator compares the running total against the dry-run count.
- **Disk note:** DELETE frees space for reuse, **not** back to the OS. Run `VACUUM (ANALYZE) players, player_identities`. `VACUUM FULL` locks the tables (a login outage) — maintenance window only.
- **Side effects:**
  - A player deleted by mistake loses nothing and is recreated on the next load or join.
  - A client token pointing at a deleted player gets 404 until the next page load.
  - A game server still holding the id gets `no_profile` for that match. **The minimum age exists to prevent that.**
- **Rehearsal:** the switch-flip commands listed exactly — edit `profile.env` + the persist file, then `docker compose up -d --force-recreate --no-deps profile-api`. **Not `restart`.**

### 5. `profile-checks.sh` backstop

- **Check 9 `disk-usage`:** `df -P` over `PROFILE_CHECKS_DISK_PATHS` (default `/`) → **FAIL if used % > `PROFILE_CHECKS_DISK_MAX_PCT`** (default 80). Threshold uses `int_or_default`.
- **Check 10 `players-growth`:**
  - Count: `docker compose -f "$PROFILE_DIR/docker-compose.yml" exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc 'select count(*) from players' </dev/null`
  - Count and timestamp stored in `STATE_DIR/players.count`.
  - First run → OK "baseline recorded". Growth scaled to 24 h (`Δ*24/hours`) → **FAIL if > `PROFILE_CHECKS_MAX_PLAYER_GROWTH_24H`** (default 20000). A count that went **down** (cleanup ran) → OK.
  - Query error, non-numeric output, or missing `POSTGRES_*` → **FAIL** "could not count players".
  - Ping bodies carry **counts only**.
- **`tests/profile-checks.sh`:**
  - Add `df` and `docker` stubs; update the `RESULT` counts.
  - New cases: 85 % → FAIL; 79 % → OK; junk percent threshold → FAIL + default; growth 25K → FAIL; 5K → OK; first run → baseline; shrink → OK; 48 h gap scaled; psql failure → FAIL.
  - Leak guard extended to the `POSTGRES_*` fixtures.

### 6. Tests — RED first, then mutations

- **Unit:**
  - `tests/profile-server/Telemetry.test.ts`: `MeterProvider` + `InMemoryMetricExporter`/`forceFlush`. Covers names, attribute keys ⊆ a per-instrument allowlist, the 750 bucket boundary, empty endpoint → no-op + one warning, URL normalization, `reltuples` `-1` skipped, pool gauge.
  - `LoginCreationSwitch.test.ts`: the parse table (**D3**, including unknown → ON + warning).
  - `LoginRoutes.test.ts` additions:
    - switch off + known player → 200 `created:false`, and `resolveOrCreatePlayer` is **never** called
    - switch off + unknown → **503 `creation_paused`** with CORS
    - order: `session_unavailable` before 400 before `creation_paused`
    - internal resolve with switch off → **still creates**
    - every outcome counted **once**
  - Session metrics: expired / invalid. ⛔ no legacy case.
  - HTTP middleware: labels are route patterns; `/nope/<canary>` → `unmatched`; a 415 from the body parser is timed.
  - **Id-leak test:** log in with a canary `platformUserId`, use a Bearer token and a known UUID, `JSON.stringify` every collected metric → **no canary anywhere**.
  - `PlayerIdentityRepository.test.ts`: callback fires **once** on create, **never** on found / lost race / collision; `resolveExistingPlayer` never inserts.
  - `LoginContract` test for the new codes.
- **Integration** (`npm run test:integration`):
  - `Login.it.test.ts`: switch off → known player logs in; unknown → 503 and `players` count unchanged; internal resolve still creates.
  - New `JunkCleanup.it.test.ts`: **pulls the runbook's fenced SQL block out of the markdown** (one source of truth; `\set` variables swapped for bind parameters). Seeds one junk row plus **one survivor of every kind**: credit, 0-XP grant, intent, `processed_purchase`, message, name history, cosmetic, display name, citizen, outside the window, too young, came back after the window. Asserts **exactly** the junk row is deleted and there are no orphans. Also runs the dry-run count.
- **Mutations** (each must turn a test red):
  - switch ignored
  - switch checked **after** create
  - `unknown` platform replaced by the raw body value
  - `route` taken from `req.path`
  - callback fired on the found-player path
  - each `NOT EXISTS` removed one at a time
  - min-age guard removed
  - disk `>` → `>=` at the boundary
  - growth scaling removed
  - persist line removed
- **Gates:** `npm test` (includes the shell harnesses), `npx tsc --noEmit`, `npm run lint`, `npm run check:config-parity`.

### 7. Owner steps (after deploy)

1. **Prerequisite — `0277` must have landed** so Uptrace can actually send to Telegram (**D1**).
2. **Profile-box deploy 2** with `OTEL_EXPORTER_OTLP_ENDPOINT` set. Check the deploy output shows the value row **OK** and the probe **"reachable"**.
3. **Uptrace → Metrics:** filter `service.name=geoconflict-profile`. Names show dots as underscores, e.g. `geoconflict_profile_login_requests`. Series should appear within about a minute. **This is the network-path proof.**
4. **Dashboard:** login rate by outcome · creations by source · created ÷ logins · login p95 · error share · pool waiting · players total · `create_enabled` · CPU / memory.
5. **Six alert rules.** ⚠️ Exact Uptrace query syntax is **not confirmed**; fill it in at build time from the UI and record what was actually done.
   - **A1:** creations (both sources) > 300 per 10 min, held 20 min.
   - **A2:** created ÷ logins > 60 % over 1 h. **Create it disabled**; arm it on day 8 after go-live.
   - **A3:** login `outcome ∈ {error, session_unavailable}` ÷ all logins > 5 % over 10 min, only when ≥ 20 requests. The "≥ 20" part may not be expressible in Uptrace — **record what was done.**
   - **A4:** p95 of `http.duration`, route `/v1/login`, method POST, > 750 ms for 10 min.
   - **A5:** `db.pool.waiting` > 0 for 5 min.
   - **A6:** login requests > 20/s for 5 min.
6. **Alert drill (blocked on `0277`):** temporarily add an always-true rule (`process.memory.rss > 1`), wait for the Telegram message, delete the rule. Worklog records date, rule and arrival time — **no addresses, no chat ids.**
7. **Live switch + cleanup drill on the real box (D6):** one synthetic login with the switch **off** (expect 503, **no row**), then **on** (one row), then delete that row using the runbook. Record the result; **no ids in the worklog.**

---

## What S5 must NOT do

- **No rate limiter.**
- **No log or trace export.**
- **No ids or tokens** in attributes or logs.
- **No DSN or project token on the profile box** (D4).
- **No imports** from `src/server/*` or `src/core/configuration`.
- **No scheduled cleanup** — the runbook is operator-run.
- **No schema migration** (D2: no `created_source` column).
- **No change to game-server creation.**
- **Do not arm A2.**
- **No client changes** (that is `0273`, already built).
- **Do not build `session.rejected reason=legacy_fallback_used`** — `0273`'s ruling D1 deleted the branch.
- **Do not touch nginx `/internal/`** — that is `0276`.
- **Do not touch the collector fix** — that is `0262`.
- **Do not build `0277`'s delivery channel** — separate task.
- **No deploy while `0275`'s drill runs.**
- **No wiki writes, no commit, no task moves.**

## Deploy order

`0275` Part B finishes → **profile-box deploy 1** (S2 + S3 + `0273`'s legacy-fallback removal) → **`0277`** (Telegram delivery) → **profile-box deploy 2 = this task** → metrics visible → dashboard + rules → drills (6 and 7) → hand to close → **then** the game deploy (`0273` D2 satisfied) → `0217` sets `PROFILE_INTERNAL_TOKEN`.

## Overlaps

- **`0276`:** `Routes.ts` app setup and the error handler's `/internal` check; `setup-profile.sh` nginx block. S5 touches **different parts** of both files (top middleware, login handler, `profile.env` / value report / `checks.env`). Conflicts would be textual only. If `0276` turns on case-sensitive routing, route labels are unaffected. **The driver sequences `Routes.ts` edits one task at a time — never in parallel.**
- **`0273` (S4):** **already built and reviewed.** Its client treats **any** 503 as fail-soft with **no retry**, so `creation_paused` is already handled. Its removal of the legacy fallback kills `legacy_fallback_used`. Both may touch the same `ProfileRepo` mocks.
- **`0275`:** its runbook edits; box timing.
- **`0277`:** S5 depends on it for delivery only; no shared files (different box, different scripts).

## Risks

- **The telemetry box is a single point of failure** (history of out-of-memory freezes, one expired cert). If Uptrace is down, no alert fires. The only backstop is the daily check — detecting within ~24 h, against 12–16 days of disk runway.
- **Uptrace "no data" alerting is unverified.** If it works, consider a missing-series rule.
- **`finish` does not fire on aborted requests.** Those are not timed.
- **The OTEL SDK adds memory on a low-RAM box.** Watch RSS on the dashboard after deploy.
- **The cleanup SQL is inference only.** Guards are D2's.
- **Nothing monitors the telemetry box itself** — a dead Uptrace silences A1–A6 under every option. Filed separately (see `0277`'s brief).

## Effort

**2–2.5 dev days**, plus owner UI time and the two drills. `0277` is ~0.5–1 d in its own task.

---

# ⬇️ AMENDMENTS AFTER APPROVAL — 2026-09-17

> **The plan above is unchanged and is the artifact the owner approved on 2026-09-16.** Nothing in it has
> been edited. This section records owner rulings made *after* approval that change **§7 Owner steps**, so a
> drill-runner following §7 does not miss them. Written by the driver (`fkit-lead` / `fkit-sprint-ship-loop`),
> which wrote §7 at approval. **Where this section and §7 disagree, this section is later and wins.**

## A1 — §7.6's alert drill is NOT sufficient as written 🚩

**Finding (producer, 2026-09-17), and it is the important one:** §7.6 fires **one** alert and checks it arrives.
A relay carrying the connection defect below **would PASS that test** — the first send on a fresh connection
always works. The defect shows up only later, **as silence**.

**So the drill as specified goes green and proves nothing about sustained delivery.**

**Requirement added:** the drill must also establish that delivery still works **after an idle period**, or
must explicitly exercise a connection-level failure. **The shape is deliberately not specified here** — it
belongs to `0277`'s architect/coder, together with the fix. Do **not** run §7.6 as the sole delivery
evidence and record the task as verified.

## A2 — the stale-connection defect this drill must not be fooled by

`src/server/Master.ts` and `src/core/notifications/TelegramNotifier.ts` each construct **one module-level
`ProxyAgent`** reused for the process's life, and **neither retries**. When the pooled keep-alive connection
dies — proxy restart, idle or NAT timeout — the next send fails with `TypeError: fetch failed`, the caller
logs and continues, and **the message is lost silently**.

**Reproduced in production 2026-09-17, by accident:** feedback was arriving; the owner restarted the egress
proxy; the very next feedback failed with that exact error while the player still received `200`; the
following one succeeded. Telegram Topics were **not** enabled at the time — excluded as a variable.

⚠️ **Hypothesis reproduced behaviourally, NOT confirmed in code.** Tracked as `0061`, which the owner moved
into Sprint 4 on 2026-09-17 to be **fixed together with `0277`**, because the same helper underlies feedback,
name-change notifications **and** alerts — one fix, three consumers.

## A3 — new owner step: prove the name-change operator notification ARRIVES

**Owner ruling 2026-09-17:** folded into this task's deploy drill rather than filed separately (~5 minutes).

Prove that an operator notification for a name-change request **actually arrives** — observed in Telegram,
not merely a `sent` result. This closes a handoff `0067` routed to `0033` that **`0033` never picked up**, so
it has been unowned since. It is now this task's.

**Context that makes it newly possible:** the profile box's Telegram egress was refused until 2026-09-17,
when the owner added the box to the egress proxy's allow list. Lead-verified read-only from the box
afterwards — direct to Telegram blocked as expected, **through the proxy a real HTTP status**, Bot API path a
real status — and then a real message was **successfully sent from that box**, the first in its history. So
the notification code needs **no change**; it simply could never get out before.

## A4 — Telegram topic routing

**Owner rulings 2026-09-17:** three topics — **Alerts, Feedbacks, Name Changes**. Alerts and name-change
notifications route from this box (profile deploy only). **Feedback's move is deferred to its own task** — it
needs a game deploy and touches the only Telegram path proven working in production; `0033` stays untouched.

**Owner-verified on the real group, 2026-09-17:** enabling forum Topics did **not** break the existing feedback
sender — with Topics on, a message sent with **no** thread id arrived in **General**. Lead-verified the same
day from the profile box: messages to each of the three topics were accepted, and a control message with no
thread id also succeeded. **So the `threadId` addition is additive and fail-soft: anything not explicitly
routed keeps behaving exactly as it does today.**

⚠️ Topic ids and the chat id are **not recorded here** — they live only in gitignored config. This file is
git-tracked.

## Unchanged by these amendments

§1–§6 and the deploy order stand exactly as approved. The loudest residual at approval — **`Server.ts`'s
wiring is executed by no test** — was **discharged on 2026-09-17**: the profile box deployed and §7.3 passed,
with **9 live `profile-metrics` series** in Uptrace. §7.7's switch drill remains **unrun** and is still the
only proof that the creation switch actually blocks.
