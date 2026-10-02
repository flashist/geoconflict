# Worklog — 0368

**Build + verify, 2026-10-02.** `fkit-coder`, spawned by `fkit-sprint-ship-loop` (driven by `fkit-lead`) as the
Build worker, under the owner-approved plan in [`plan.md`](./plan.md) (approved via `AskUserQuestion` 2026-10-02;
owner rulings Q1 / Q2 and the `:98-99` twin are in its header). No commit, no push, no wiki write, no task move.

## Result

- Doc-only. The one file changed is `ai-agents/knowledge-base/alert-delivery-runbook.md` (+ this worklog).
- ⚠️ **One change to the plan's SQL, made in the build** (decision log, D1): the URL goes to Postgres as a
  **bound parameter** (`$1` + psql `\bind`), not as an interpolated literal (`:'probe_url'`). Tested: the plan's
  literal form printed the URL on the terminal **and** into the Postgres container log when the statement failed —
  which contradicts the plan's own stated aim ("never appears in … the SQL text, the terminal or a log"). Same
  statement, same guard, same effect.
- Brief verification 1 deliberately **not** met as worded (Q1, below).

## What changed in the runbook (line numbers as of this build)

| Plan item | Where | What |
|---|---|---|
| 1 | new `#### Re-enabling a DISABLED channel — SQL fallback`, after § *When `alert-channel-state` fails* step 6 | where it runs; the tested command; how the URL travels; never select `params`; the one-row guard; `UPDATE 1` expected, and what each other outcome means; follow-up checks (probe → `checks.sh` → Telegram, with the one-line *Test channel* caveat); 3 caveats (proven once / real alert after SQL re-enable unproven / pinned images, `\bind` needs psql ≥ 16) |
| 2 | trap `:43-47`, probe step 4 `:215-219`, channel-state step 2 `:224-228` | appended only: "If you cannot re-enable it in the UI, use the SQL fallback" (link). UI stays the first method; control not named; not called unproven (Q1) |
| 3 | check-13 bounds `:177-185` | old "not yet seen to trip" struck + *(True until 2026-10-01.)*; new bounded `0341` fact |
| 3 ➕ | twin `:98-102` | old line struck + *(True until 2026-10-01.)*; pointer to the check-13 bounds |
| 4 | channel-state step 3 (`PAUSED` / `DRAFT`) | untouched |
| 5 | § *What is still unproven*, IDLE paragraph | old text struck; new observed result (4 h 36 min, 08:12 → 12:48 UTC, name-change notifier shares sender/pool/proxy, owner ruling, drill not run) + all six bounds |
| 6 | "A1 stands." bullet; digest item 2 | pointer added; the drill's own claim and *"Do not record A1 as discharged by this"* kept |
| 7 | `0283` digest warning, `0284` A1/mask bullet, check-13 "not `0274` A1" bullet | byte-identical (checked, below) |

Noticed, not touched (out of scope, as the plan says): the drill bounds bullet "the already-disabled state is still
uncovered … a separate follow-up" (now `:590-592`) has been stale since `0285` shipped check 13. Candidate for `0369`
step 6 or a later tidy-up.

## Verification evidence (plan § Verification)

### 1. Command test — local, throwaway, real Docker

Docker Desktop was up (`docker info` OK). Scratchpad only, nothing in the repo. A one-service compose project
(`postgres:17-alpine`, psql 17.11, Docker Compose v2.40.0) with a stand-in `notif_channels` table: a 4-value enum
(`draft`/`delivering`/`paused`/`disabled`) and `params jsonb` holding `url` + `payload` (a fake secret). The env file
was written the way `setup-telemetry.sh:1057` writes it (`printf 'ALERT_PROBE_URL=%q\n'`), with a fake `.invalid`
URL. The exact runbook command was run, with only the two `/opt/uptrace` paths pointed at the scratch dir.

| Case | Result |
|---|---|
| 1 match, `disabled` (+1 other channel) | `UPDATE 1`, rc 0; that row → `delivering`, the other unchanged |
| 0 matches | `UPDATE 0`, rc 0; nothing changed |
| 2 matches (`disabled` + `paused`) | `UPDATE 0`, rc 0; **both rows unchanged** |
| `ALERT_PROBE_URL=` empty | stops with `ALERT_PROBE_URL is empty …`, rc 1; nothing changed |
| `ALERT_PROBE_URL` absent from the file | same stop, rc 1 |
| `-e ALERT_PROBE_URL` removed (simulates passthrough not working) | `UPDATE 0`, nothing changed — fails safe |
| schema changed (`params` column renamed) | `ERROR: column "params" does not exist`, rc 3; **URL in output: 0; in Postgres log: 0 new** |
| enum changed (`delivering` renamed) | `ERROR: invalid input value for enum …`, rc 3; URL in output: 0; in log: 0 new |
| argv while running (a `pg_sleep(4)` variant, sampled mid-run) | host `ps`: `docker compose exec -T -e ALERT_PROBE_URL postgres psql -X -v ON_ERROR_STOP=1 -U uptrace -d uptrace` — no URL; container `ps`: `psql -X -v ON_ERROR_STOP=1 -U uptrace -d uptrace` — no URL; `pg_stat_activity` shows `$1` only. (The one host-`ps` hit was my own test harness's shell, whose script text contained the grep pattern — not the command under test.) |

- **`-e VAR` with no value passes through on compose v2** — proven by the 1-match case (the value reached psql).
- **The plan's literal form, run first:** 1/0/2 cases behaved identically (`UPDATE 1` / `0` / `0`, both rows
  unchanged), but on the schema-changed case psql printed `LINE 2:  WHERE params->>'url' = 'https://<host>/inter...`
  and the container log gained 2 lines carrying the full URL (`STATEMENT:` echo). Hence D1.
- Torn down: `docker compose down -v`; no `t0368` container, network or volume left.
- ⚠️ **Not run on the real box** (no live run is part of this task). Real box's compose version unknown; if `-e`
  passthrough ever failed there, the result is `UPDATE 0` (tested above), i.e. the operator stops — safe.

### 2. Dry-read against the recorded schema

- Runbook *Verified schema* (`:139-144`) + `setup-telemetry.sh:1085-1087`: table `notif_channels`, column `status`,
  enum includes `delivering`, URL at `params->>'url'` — the statement uses exactly these.
- `setup-telemetry.sh:1130-1136` (`read_channel_state`): `cd "$DIR"` (= `/opt/uptrace`, `UPTRACE_DIR`, `:59`) then
  `docker compose exec -T … postgres psql -X … -U uptrace -d uptrace` — the command uses the same service, user, db
  and directory, minus the read-only `PGOPTIONS`.
- `setup-telemetry.sh:1057-1061`: `alert-probe.env` is `%q`-quoted bash, mode 0600 → sourced with `.` by root, as the
  probe itself does (`:1099`).
- Compose images: `postgres:17-alpine` (`:565`), `uptrace/uptrace:2.0.2` (`:590`). psql 17 ≥ 16 for `\bind`.

### 3. Diff checks

- `git status --short` taken before the build vs after: the **only** new line is
  ` M ai-agents/knowledge-base/alert-delivery-runbook.md` (+ this worklog, untracked task folder already present).
  Every other modified file was already modified before the build (other tasks' edits).
- Runbook hunks (old-file lines): 45, 98-99, 173, 175, 206, 213, 237, 507, 554, 556, 585 — none in `56-59`,
  `108-110` or `171`.
- Item-7 passages: all 8 lines of HEAD `:56-59`, `:108-110`, `:171` found byte-identical (`grep -qxF`) in the
  working file.
- Every removed line is either re-added struck (`~~…~~` + *(True until 2026-10-01.)*) or is a line whose only change
  is an appended pointer.

### 4. Secret grep over the 103 added lines

`https?://` 0 · IPv4 0 · `chat_id`/`topic_id`/`-100…` 0 · bot-token shape 0 · long hex/base64 0 · hostnames
(`.ru/.com/.io/.dev/.net/.org/.invalid/.app`) 0 · player ids 0. The `/opt/uptrace/...`, `/opt/profile/...` paths and
env-var names were already in the runbook and are not secrets. This worklog names only a fake `.invalid` test host,
redacted as `<host>` above.

### 5. `npm test` unaffected

`grep -rln alert-delivery-runbook tests scripts` → 0 files. Not run (no code or harness-checked file changed).

### 6. Brief verification 1 — deliberate deviation (owner ruling Q1)

The brief asks the three UI sentences to "say the UI control is unproven". Per Q1 (*"Only what's true now"*) they
do **not**: `0369`'s live look (2026-10-01) found and used the control (`Unpause channel`), so that wording would now
be false. The three sentences carry only the SQL-fallback pointer. Naming the control, step 3, and the general
*Test channel* warning stay with `0369` step 6.

## Decision log (autonomous calls, ADR-019 / ADR-032 discipline)

- **D1 — bound parameter instead of an interpolated literal.** *Finding it answers:* my own local test (above): the
  plan's `:'probe_url'` form echoed the URL to the terminal and into the Postgres log on a failing statement.
  *What changed:* `WHERE params->>'url' = $1 … = $1) = 1` + `\bind :probe_url \g` instead of `= :'probe_url'` +
  `;`. The runbook's caveat 3 says `\bind` needs psql ≥ 16 (the plan said `\getenv` ≥ 15). *Why it qualified:*
  obvious winner within the plan's intent — the plan explicitly delegated the command's final form to the build
  ("final form gets tested in the build") and states the aim it now meets; statement, guard and effect unchanged;
  verified by the same 1/0/2 cases plus two error paths.
- **D2 — empty-URL guard line in the command.** *What:* `[ -n "${ALERT_PROBE_URL:-}" ] || { …; exit 1; }` before
  the `docker compose exec`. *Why:* with an empty value the statement would run against `''`; without the variable,
  psql would bind the literal text. Both happen to fail safe (`UPDATE 0`), but a named stop is clearer. Mechanical,
  localized, inside the plan's "final form gets tested" remit; tested (rc 1, nothing changed).
- **D3 — an `ERROR:` outcome listed under "Expect `UPDATE 1`".** *What:* one bullet saying an `ERROR:` line (rc 3)
  means the schema changed → re-verify (`0285` step 0). *Why:* it is the third outcome the test actually produced;
  points at an existing runbook procedure; adds no new method. Mechanical, in-plan.
- **D4 — caveat 1 states the documented command was tested locally only.** *Why:* the guard and the bind make the
  documented command differ from the literal one `0341` ran (the plan's own Risk); saying so is the honest bound.
  In-plan.

## Process review — round 1 (2026-10-02)

`fkit-coder`, spawned by `fkit-sprint-ship-loop` as the Process-review worker under the same owner-approved plan.
Ledger: [`review.md`](./review.md) — R1, R2 both `CORRECT`, both `✅ done`; ledger set `closed-out`. Runbook only.

### Decision log (applied without per-fix owner approval)

- **D5 — R1 (no status precondition): added `AND status = 'disabled'`.** *Finding:* R1 — a lone matching
  `paused`/`draft` channel was flipped to `delivering` with `UPDATE 1`. *What changed:* one WHERE condition in the
  SQL block (the count guard still counts URL matches only); the guard bullet now names both guards; a "not
  `disabled`" cause under `UPDATE 0` (`delivering` needs nothing, `paused`/`draft` → step 3, UI); caveat 1
  "guard" → "guards". *Why it qualified:* verified `CORRECT`, localized, and an **obvious winner within the plan's
  intent** over the reviewer's other option (a warning line): the section is *Re-enabling a DISABLED channel*,
  the write for a disabled channel is unchanged (still the one `0341` proved), and it follows the owner's Q2
  reasoning — a "stop if" instruction can only be acted on after the write. ⚠️ It **does** change behaviour for
  a non-disabled channel (`UPDATE 1` → `UPDATE 0`); the caller flagged this as the judgment point and I judged it
  in-plan. If the owner disagrees, the revert is one line plus the bullets.
- **D6 — R2 (missing `UPDATE 0` cause): named the failed `-e` hand-off.** *Finding:* R2. *What changed:* the
  `UPDATE 0` bullet now has three sub-causes with how to tell them apart in the UI; the third (one matching channel,
  and it **is** `disabled`) = the URL did not reach psql → re-enable in the UI, never paste the URL into the SQL.
  *Why it qualified:* verified `CORRECT`, mechanical, text-only, inside plan item 1 ("Expect `UPDATE 1` … stop").

### Re-test after the change (throwaway, scratchpad, torn down)

The runbook's command block extracted verbatim (only the two `/opt/uptrace` paths repointed), run against a fresh
`postgres:17-alpine` stand-in (same 4-value enum, `params` with `url` + fake `payload` secret):

| Case | Result |
|---|---|
| 1 match `disabled` (+1 other channel) | `UPDATE 1`, rc 0; row → `delivering`, other unchanged |
| 1 match `paused` / `draft` / `delivering` | `UPDATE 0`, rc 0; unchanged (each) |
| 0 matches | `UPDATE 0`, unchanged |
| 2 matches (`disabled`+`disabled`; `disabled`+`paused`) | `UPDATE 0`, both unchanged (each) |
| `-e ALERT_PROBE_URL` removed, 1 match `disabled` | `UPDATE 0`, unchanged (R2's third cause) |
| `ALERT_PROBE_URL=` empty | `ALERT_PROBE_URL is empty …`, rc 1, unchanged |

URL / fake secret in command output: 0 in every case; in the Postgres container log: 0. `docker compose down -v`:
no `t0368` container, volume or network left. Secret grep over the runbook's added lines (same patterns as § 4):
0. Not run on the real box (unchanged bound).
