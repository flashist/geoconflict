# Plan — `0285`: detect an already-disabled monitoring notification channel

Plan only. Nothing was written: no source, no tests, no plan.md, no status change.

## Summary
- **The schema question (step 1 of the brief) is mostly answered, with one caveat.** Evidence comes from the pinned `uptrace/uptrace:2.0.2` image, which is already on this machine. The state lives in the monitoring stack's **Postgres**:
  - table `notif_channels`, column `status`;
  - `status` is an enum with four values: `draft`, `delivering`, `paused`, `disabled`.
  - The vendor code that disables a channel writes `status = 'disabled'`.
- ⚠️ **Not yet confirmed on the box itself.**
  - The local copy is the arm64 build of the same tag.
  - My read-only SSH attempt was **blocked by the permission classifier** at the step that checks which SSH credential variables are set. I did not try to work around it.
  - So the schema check on the box is step 0 of the build, and needs either the owner or a permission grant (Q4).
- **Reading the state needs no new credential and no API.** It uses `docker compose exec -T postgres psql -U uptrace -d uptrace` as root on the monitoring box. That is the same path `setup-telemetry.sh` already uses at `:794`, `:821` and the backup cron at `:1115`. There is no new deploy variable.
- **Proposed shape.** The hourly `0284` probe on the monitoring box reads the channel state, then carries it in its existing POST as `channel_state`. The relay writes it into the existing marker. A new `profile-checks.sh` check 13, `alert-channel-state`, reads it. A problem fails to the existing external dead-man's switch. Nothing travels the monitoring stack's notification channel.
- **Five owner decisions** (Q1–Q5). The biggest is Q1: the proposed shape adds a field to `0284`'s probe script, and the brief says "do not modify its probe".

## Evidence — what I verified, and where

| Fact | Source |
|---|---|
| Postgres holds the monitoring stack's metadata. Compose pins `uptrace/uptrace:2.0.2` and `postgres:17-alpine`. | `setup-telemetry.sh:530-544`, `:556`, the `pg:` config at `:292-296` |
| An existing on-box psql precedent needs no password: root plus `docker compose exec` on the local socket. | `setup-telemetry.sh:794`, `:821`, `:1115` |
| The embedded migration defines `CREATE TABLE notif_channels (id, project_id, name, status notif_channel_state_enum NOT NULL DEFAULT 'delivering', condition, type, params jsonb)`. | Strings in the local `2.0.2` binary (extracted with `docker create`/`docker cp`, then deleted) |
| `notif_channel_state_enum` = `'draft','delivering','paused','disabled'`. `notif_channel_type_enum` includes `'webhook'`. | same |
| `NotifChannelGateway.Disable` calls `UpdateNotifChannelStatus` with the string constant `disabled` and the query fragment `status = ?`. So **a disable is a state change on `status`**: not an error field, not a timestamp. | Disassembly of `Disable` plus the strings at the addresses it loads |
| The notifier refuses to send unless the status is `delivering`. So **anything other than `delivering` means alerts are dropped.** | `0277/plan.md:629-631` (architect's disassembly) |
| The webhook channel params have JSON tags `url` and `payload`. **Unconfirmed on the box** that the stored key is `url`. | binary strings |
| Per-attempt response history lives in ClickHouse table `notifications` (30-day TTL), which is not needed here. | binary strings |
| The probe script, its env file (`ALERT_PROBE_URL`, `ALERT_PROBE_SECRET`) and its hourly cron | `setup-telemetry.sh:1016-1028`, `:1031-1100`, `:1145` |
| The relay's probe branch, marker write and schema | `src/profile-server/AlertRelay.ts:172-195` (`probe: z.unknown()` at `:189`), `:410-415`, `:518-537`, `:559-576`, `:633-637` |
| Check 11 reads the marker. `json_field` needs one key per line. | `profile-checks.sh:58`, `:93`, `:122-124`, `:463-485`, call list `:549-560` |
| Harness layout | `tests/profile-checks.sh:126-133` (`write_probe_marker`), `:148-175` (`reset_fixture`), C22 `:466-522`; hardening harness probe section `:1545-1750` (stub curl `:1706-1712`, `run_probe` `:1718-1723`, `PATH=bin:/usr/bin:/bin`) |
| The exact-shape marker test | `tests/profile-server/AlertRoutes.test.ts:875-882` |
| **The working tree is clean for every file this task touches.** Uncommitted work elsewhere does not overlap. | `git status` |

## Design

```
monitoring box, hourly cron (:17) — alert-probe.sh
  1. read state: psql (read-only transaction, 20 s timeout) → status of the channel(s) whose url = ALERT_PROBE_URL
  2. POST {"payload":{"secret":…,"probe":"liveness","channel_state":"<state>"}}   ← same POST as today, one extra field
       → relay: secret check → probe branch → marker gains  "channel_state": "<state>"
          → profile-checks.sh check 13 (daily 08:00 UTC) → anything but `delivering` ⇒ FAIL
             → POST $PROFILE_CHECKS_PING_URL/fail → external dead-man's switch pages
```

### Step 1 — the state read, inside the probe script (`setup-telemetry.sh`, the heredoc at `:1031-1100`)

A new `read_channel_state` function runs **before** the POST.

- **The command.** `( cd "$DIR" && timeout 20 docker compose exec -T -e PGOPTIONS='-c default_transaction_read_only=on' postgres psql -X -q -tA -F $'\t' -v ON_ERROR_STOP=1 -U uptrace -d uptrace -c "SELECT status, coalesce(params->>'url','') FROM notif_channels" )`.
  - The query is one fixed `SELECT`, with nothing interpolated.
  - It runs in a **read-only transaction**, so any write would be refused by Postgres itself.
- **Choosing the channel.** The script compares the URL in bash against `ALERT_PROBE_URL`, which the runbook says is copied from the channel config.
  - The URL never goes into SQL, into docker or psql argv, or into any log. The secret column is never selected.
- **What it reports:**
  - one or more matches: the worst state wins (`disabled` > `paused` > `draft` > anything else > `delivering`);
  - no match: `missing`;
  - psql fails, times out or prints something unexpected: `unreadable`.
- **Liveness is never affected by the state read.**
  - `set -e` stays off and the read is bounded.
  - The POST always happens, whatever the state read did.
  - The exit code keeps `0284`'s meaning (0 = the relay recorded the probe), so its five harness cases stay valid.
  - The one-line log gains `channel state: <state>` so a hand-run shows it.
- **Header comment.** It names the version the query was verified against. A harness guard (step 5) pins it.

### Step 2 — the relay stores it (`src/profile-server/AlertRelay.ts`)

- **Schema.** Add `channel_state: z.unknown().optional()` to `payload`.
  - It is `unknown`, not `string`: `0284`'s review R1 lesson is that a typed field would let a stray non-string in a real alert's payload fail the whole-body parse and drop the alert.
- **Clean the value** (`sanitizeChannelState`):
  - absent: `undefined`, and the key is left out of the marker, so the marker is byte-identical to today's and `0284`'s exact-shape test stays green;
  - a string matching `^[a-z][a-z-]{0,31}$`: kept as is;
  - anything else: `invalid`.
  - The relay does **not** interpret the value. Interpretation lives in one place, check 13.
- **Where it is read.** Only on the probe branch, which is strictly **after** the secret check. `Decision` `{ kind: "probe" }` gains `channelState?: string`, and `writeProbeMarker` adds `"channel_state"` as its own line.
- **Unchanged:** the response status, the metrics and the rule that a probe is never delivered as an alert.
- **Safe on rollback:** an older relay ignores the unknown key, so the probe still works; check 13 then FAILs and names that cause.

### Step 3 — check 13 (`profile-checks.sh`)

`check_alert_channel_state()` reads the **same** `PROBE_MARKER` (no new marker, no new mount, no new threshold) and reports:

| Marker state | Result, with the operator instruction as the FAIL text |
|---|---|
| missing, unparseable, future-dated or stale (the same `MAX_ALERT_PROBE_AGE_HOURS`) | **FAIL**: state unknown, because no fresh probe arrived (see `alert-path-probe`) |
| no `channel_state` key | **FAIL**: the probe script or the relay predates `0285`; redeploy both |
| `delivering` | **OK**: "the monitoring stack records its alert channel as delivering, Nh ago. Its own record only, NOT proof a message arrives." |
| `disabled` | **FAIL**: every alert is dropped at source. Re-enable it in the monitoring UI, then find the cause (usually a 401/403/404; check `PROFILE_INTERNAL_ALLOW_IPS`). Fixing the cause does not undo the disable. |
| `paused` / `draft` | **FAIL**, naming the state: someone paused it, or never finished saving it |
| `missing` | **FAIL**: no channel's URL equals `TELEMETRY_ALERT_PROBE_URL`. Either the channel was deleted, or the probe is testing a different URL than alerts use. |
| `unreadable` | **FAIL**: the monitoring stack's Postgres is down, or the schema changed (was the image upgraded?). Read `/var/log/uptrace-alert-probe.log` on the monitoring box. |
| `invalid` / anything else | **FAIL**, naming the value |

The check is added to the call list and the header comment. FAIL text names variables only.

### Step 4 — what an unreadable state means (the brief asks for this decision to be written down)

- **Proposal: unreadable ⇒ FAIL, every run.** A check that cannot read the state cannot say alerting is alive. If the monitoring stack's Postgres is down, alerting is dead too.
- **The "unrelated version bump" worry is handled at build time, not by paging.**
  - The image is pinned (`setup-telemetry.sh:556`), so an upgrade is a deliberate edit.
  - A hardening-harness guard fails `npm test` if the pinned tag stops matching the version the query was verified against. That forces the schema to be re-checked before an upgrade ships, instead of the owner being paged nightly afterwards.
- This is Q2.

### Step 5 — tests

**`tests/profile-server/AlertRoutes.test.ts`**, new tests in the `0284` probe `describe`:
- `channel_state: "delivering"` ⇒ the marker has a `"channel_state": "delivering"` line matching a `json_field`-equivalent regex;
- `"disabled"` is written verbatim;
- uppercase, too long, non-string, object or null ⇒ `invalid`, and the whole-body parse still succeeds;
- absent ⇒ the key is absent and the marker is exactly `0284`'s shape;
- wrong secret plus `channel_state` ⇒ **no marker**;
- `channel_state` alongside real alert fields ⇒ **delivered as an alert**, no marker;
- the marker never contains any other body content.

**`tests/profile-checks.sh`:**
- `write_probe_marker` gains a `channel_state` argument (default `delivering`), so `reset_fixture` stays green.
- New case **C24** covers `delivering` (OK), `disabled`, `paused`, `draft`, `missing`, `unreadable`, `invalid`, key absent, stale marker, and future-dated marker. Each FAIL case asserts `pinged_fail` plus its reason.
- 🚩 **Re-baseline the counts** (13 checks now): `:215`, `:338` (`12 ok` → `13 ok`); `:293`, `:375`, `:547`, `:568` (`11 ok, 1 failed` → `12 ok, 1 failed`); `:361` (`11 ok, 2` → `12 ok, 2`).
- 🚩 **C22's missing, stale, future and unparseable cases now fail check 13 as well:** `:484` and `:500` become `11 ok, 2 failed`, the junk-threshold case at `:512` is re-counted, and `:482` ("body names ONLY the probe check") is widened to allow `alert-channel-state`. These are mechanical changes, but they would read as an unrelated regression if missed.
- **Seen to fail before the fix** (brief verification step 4): C24 is run against the unmodified `profile-checks.sh` first, and the red output is recorded in the worklog.

**`tests/scripts/profile-deploy-hardening.test.sh`**, probe section `:1545-1750`:
- **Behaviour** (the existing extract-and-run idiom):
  - add stub `docker` and `timeout` to `$PROBE_RUN_DIR/bin`;
  - the stub curl saves the stdin body to a file;
  - cases: one delivering row ⇒ body carries `"channel_state":"delivering"`; one disabled row ⇒ `disabled`; mixed ⇒ worst wins; no URL match ⇒ `missing`; docker fails ⇒ `unreadable` **and the POST is still sent with the liveness exit code unchanged**.
  - The existing five cases stay as they are. They now also prove a failed state read does not break liveness.
- **Structure:**
  - the state query is `SELECT`-only and runs under `default_transaction_read_only=on`;
  - neither `ALERT_PROBE_SECRET` nor `ALERT_PROBE_URL` appears on a `docker`/`psql` argv, or in `say`;
  - the drift guard: the compose `uptrace/uptrace:<tag>` equals the "verified against" tag in the probe section;
  - the key-name drift guard: `channel_state` is spelled the same in the probe script, `AlertRelay.ts` and `profile-checks.sh`.
- ✅ **No new `.sh` harness, so no change to `tests/scripts/ShellHarnesses.test.ts`.** Every file touched is already registered, and the wrapper's success markers do not depend on counts.

**Gates:**
- `npx tsc --noEmit`
- `npm run lint`
- `npm test`, plus the single suite `tests/profile-server/AlertRoutes.test.ts`
- `bash tests/profile-checks.sh` (`RESULT: N passed, 0 failed`)
- `bash tests/scripts/profile-deploy-hardening.test.sh` (`ALL PASS`)
- `npm run check:config-parity` (expected unchanged: no new app env var)
- If a supertest suite goes red, check the known-flake signature and the `0197` `SIGSEGV` signature first.

### Step 6 — docs (`ai-agents/knowledge-base/alert-delivery-runbook.md`)

- Replace the "cannot see a channel that is ALREADY disabled" bullet (`:94-98`) with the new guard.
- Add check 13 to the component table and to the "when it fails" steps (the re-enable step).
- Record the verified schema facts, with no names or ids.
- Keep the residuals listed below.
- No new runbook file.

## Deploy — order matters, one window, before the next 08:00 UTC

1. `./build-deploy-profile.sh`: relay plus check 13. ⚠️ **Check 13 FAILs until the first probe carrying a state arrives.**
2. `./build-deploy-telemetry.sh`: the new probe script. No new variables.
3. On the monitoring box, run `/opt/uptrace/alert-probe.sh` by hand. The log should show `channel state: delivering`. Then, on the profile box, the marker should hold `channel_state`, and `/opt/profile/checks.sh` should report `alert-channel-state … OK`.

⚠️ **Order hazard, stated plainly:** deploying the monitoring box first is harmless (an older relay ignores the field). Rolling back the relay makes check 13 FAIL with its "predates 0285" message, which is the intended behaviour.

## What the owner must run on the boxes

- **Step 0: schema check on the box. Read-only; gates the build.** Run on the monitoring box, all under `PGOPTIONS='-c default_transaction_read_only=on'`:
  - `\d notif_channels`
  - `SELECT enum_range(NULL::notif_channel_state_enum)`
  - `SELECT type, status, count(*) FROM notif_channels GROUP BY 1,2`
  - `SELECT type, (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(params) k) FROM notif_channels` (**key names only**: `params` holds the URL and the shared secret)
  - `docker image inspect` on the running image's digest
  - If the result differs from the binary evidence above: **stop and re-scope with the producer** (the brief's escape hatch).
- **Deploy steps 1–3** above.
- **The drill** (brief verification step 3). ⚠️ It takes live alerting down for minutes and must be supervised. The method is Q3.
  - Put the channel into a genuinely `disabled` state.
  - Run the probe by hand on the monitoring box, then force `checks.sh` on the profile box. Confirm **the dead-man's switch pages with `alert-channel-state` … DISABLED**.
  - Re-enable the channel in the monitoring UI, re-run the probe and the check, and confirm OK.
  - Confirm alerting is live (the runbook's §7.6 drill, or the channel's Test button).
- **Demonstrating "no write"** (brief verification step 6):
  - Read `n_tup_ins/n_tup_upd/n_tup_del` from `pg_stat_user_tables` for `notif_channels` before and after a probe run, and expect no change.
  - Together with the read-only transaction setting and the harness assertion, that is the evidence.

## Edge cases designed against

| # | Case | How it is handled |
|---|---|---|
| 1 | The state read hangs because the stack's Postgres is wedged (this box has had OOM freezes) | `timeout 20`; reported as `unreadable`; the POST still goes |
| 2 | The state read kills the liveness probe | No `set -e`; the POST always happens; harness case |
| 3 | A stray `channel_state` in a real alert payload drops the alert | `z.unknown()`, read only on the probe branch |
| 4 | A caller without the secret sets the state | Read only after `tokensMatch` |
| 5 | A value injected into the marker | Kept only if it matches the pattern, otherwise `invalid`; one key per line |
| 6 | The URL or secret leaks | Compared in bash; never selected, never put on argv, never logged |
| 7 | A duplicate channel pointing at the relay | The worst state wins. A deliberately paused duplicate would page; delete it. |
| 8 | Probe URL drifted from the channel URL | `missing` FAIL. This is a real finding: the probe would be testing the wrong URL. |
| 9 | A vendor upgrade changes the schema | Harness pin guard at build time; `unreadable` FAIL at run time |
| 10 | Clock skew or a future-dated marker | Covered by the same negative-age rule as check 11 |
| 11 | A macOS harness lacks `timeout`/`md5sum`/docker | Stubbed; the script uses no hashing |

**Detection latency:** the same as `0284`, roughly 3–27 h, bounded by the daily run. This follows the D2 owner ruling. No new cron.

## What this still does NOT cover (flagged, not absorbed; the brief lists these as out of scope)

- The **secret held in the channel's own config**. This design could compare it cheaply, because the probe already holds the secret, but that is explicitly out of scope. It is a candidate follow-up.
- Whether any **monitor is attached** to the channel (the `monitor_channels` table exists; not read).
- **Telegram delivery**, or a message reaching a human.
- `0274` A1 (delivery after an idle period).
- **Automatic re-enable**: detection only.
- It reads the stack's **own record**. If the vendor ever dropped alerts without updating `status`, this would not see it.
- **One host, no CI.**

## Estimate

| Area | Size |
|---|---|
| `setup-telemetry.sh` | ~45 lines |
| `AlertRelay.ts` | ~25 lines |
| `profile-checks.sh` | ~45 lines |
| `AlertRoutes.test.ts` | ~70 lines |
| `tests/profile-checks.sh` | ~60 lines plus ~12 re-baselined asserts |
| hardening harness | ~60 lines |
| runbook | ~30 lines |

It is small. The expensive parts are step 0 on the box and the drill.

## Owner rulings (2026-09-28, live via `AskUserQuestion` in the `fkit lead` session, relayed by fkit-lead) — record verbatim
- **Q1 (how the state travels):** "Add a line to hourly hello (Recommended)" — Same message, note and schedule, one extra piece of info. Changes 0284's script slightly. Safe in any deploy order. (Asked twice; the owner first chose "Explain more, then ask again".)
- **Q2 (unreadable state):** "Alert every run; catch upgrades in tests (Recommended)" — A real outage alerts you. Upgrading the pinned Uptrace version turns the tests red until the query is re-checked, so an upgrade can't cause nightly alerts.
- **Q3 (drill method):** "One SQL update, re-enable in UI (Recommended)" — Exactly what Uptrace's own 'disable' does; takes minutes.
- **Q4 (who runs step 0 on the box):** "I run them (Recommended)" — The build worker gives you the queries; they never print the secret or URL. No permission change.
- **Q5 (which channel):** "The one the probe sends to (Recommended)" — The channel whose address equals the probe's address. No new setting; also catches the probe and the real channel drifting apart.
- **Plan approval:** "Approve (Recommended)" — 2026-09-28. Build proceeds only after the owner's step-0 box check confirms the schema; if it differs, stop and re-scope with the producer.
