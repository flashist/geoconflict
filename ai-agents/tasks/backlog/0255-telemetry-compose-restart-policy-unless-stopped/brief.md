# Telemetry box: `restart: on-failure` → `unless-stopped` on all five compose services, harness-asserted, daemon-restart verified

## ID
0255

> ℹ️ **ID allocation, checked 2026-09-13 before filing. `0255` is free.** The four checks from
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md), run this turn:
> **1.** `ls -d ai-agents/tasks/*/0255-*/` — no matches (highest ID on disk across all three boards was
> `0253`; `0254` was allocated in the same run, sequentially, before this one). **2.**
> `grep -rn "^0255$" ai-agents/tasks/ --include=brief.md` — zero hits. **3.** `grep -rn "0255" .claude/`
> — zero hits. **4.** repo-wide (`node_modules`, `.git`, `static` excluded, `.svg`/`.json`/binaries
> filtered) — **one hit, coincidental**: `resources/ads.txt:831` carries the digits inside an ad-vendor
> ID (`1025558`), not a task reference. Duplicate-ID check (`sort | uniq -d` over folder prefixes) —
> empty.

## Sprint
Backlog

## Priority
Unscheduled

**Producer's rank, if pulled into a sprint: Medium** — not owner-ruled. Medium because the fix is
small (five values plus a harness block) and it closes a **known** recovery hole on the one box whose
outages are historically found late — the telemetry VPS has no external uptime alerting (wiki
`systems/telemetry`), so a stack that stays down after a daemon restart stays down until someone
notices missing traces. Not High because the hole needs a daemon restart *without* a reboot to
trigger, which has not been observed on that box (its recorded outages were OOM hangs that ended in
reboots — a path systemd already covers).

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**Filed 2026-09-13 on an owner ruling given live in the lead session during `0221`'s plan approval
(`0221` plan Q4: telemetry's five `on-failure` lines are out of `0221`'s scope — "separate brief").**
It is filed now rather than at `0221`'s close because `0221` is currently `🚧 Blocked` on the owner's
live tail (B1–B6); this task shares no file with `0221` and does not need to wait on it.

### The hole (verified 2026-09-13, `setup-telemetry.sh` identical in the working tree and at `6822210`)

`setup-telemetry.sh` writes the telemetry stack's `docker-compose.yml` from an unquoted heredoc
(`cat > "$UPTRACE_DIR/docker-compose.yml" << EOF`, lines 457–540 at `6822210`). Inside it, **all five
services carry `restart: on-failure`**:

| Service | Line at `6822210` |
|---|---|
| `clickhouse` | 461 |
| `postgres` | 484 |
| `redis` | 500 |
| `uptrace` | 509 |
| `otelcol` | 527 |

⚠️ **`on-failure` does NOT bring a container back after a Docker DAEMON restart** — it re-runs a
container only when the container's own process exits non-zero. When `dockerd` restarts (a Docker
package upgrade, `needrestart` after an unattended upgrade, a manual `systemctl restart docker`), the
containers are stopped by the daemon going away and are **not** restarted by it coming back. A
**reboot** is covered separately by `uptrace.service` (`ExecStart=/usr/bin/docker compose up`,
`Restart=always`, `RestartSec=15`, lines 877–897) — so the box comes back after a reboot, and only
then.

This is the same hole `0221` closed on the profile box (its G7), with the same fix ruled there:
**`unless-stopped`** — survives a daemon restart, still honours a deliberate `docker stop`/`compose
stop` (which `always` would fight). The game box already uses `--restart=always` (`update.sh:64` at
`6822210`); `unless-stopped` is the value `0221` chose over it because the profile and telemetry boxes
are managed through `compose stop`/`down`, and `always` would resurrect a container an operator meant
to keep down.

### Three things about this box that make the fix less mechanical than five substitutions

1. **The redeploy only recreates three of the five services.** `setup-telemetry.sh:550` runs
   `docker compose up -d --force-recreate clickhouse uptrace otelcol`. A restart policy is a
   container attribute, read at **create** time — changing the compose file does **not** change the
   policy on a running `postgres` or `redis` container until that container is recreated. A deploy
   that edits the heredoc and ships would leave two of five containers on `on-failure` on the live
   box, with the file claiming otherwise. The plan must decide how the two get recreated (a plain
   `compose up -d` recreates on config diff; the explicit service list at `:550` was written to avoid
   recreating the stateful services on every redeploy — find out why before widening it) and
   verification must inspect **all five** live containers, not the file.
2. **The systemd unit is `enable`d but never started by the deploy** (`systemctl enable uptrace`,
   `:897` — no `--now`). Same nuance `0221`'s plan A1 recorded for the profile box: the unit only
   becomes active after a boot, so whether the attached `compose up` gets re-run by systemd after a
   daemon restart depends on the unit's state at the time. `unless-stopped` is correct in **both**
   unit states — that is the argument for it — but verification must record the unit's state before
   the daemon restart, and the result may differ between "unit inactive" (today's deploy path) and
   "unit active" (after a reboot). Record both.
3. **The box has an OOM history — context, not scope.** The telemetry VPS (~3.8 GB RAM) repeatedly hung
   on ClickHouse OOM-kills until 2026-06-04 (swap + `metric_log` disabled + memory ratio 0.6; wiki
   `systems/telemetry`, memory `project_telemetry_oom_root_cause`). Those outages ended in **reboots**,
   which `on-failure` + systemd already survive — so this fix does not address that history. It matters
   here for one reason: **a daemon restart drill on this box costs a real telemetry gap** (traces and
   logs from the game server are dropped while the collector is down — the client and server exporters
   do not queue durably), so schedule the drill and say in the worklog how long the gap was.

### The harness — what exists today (checked 2026-09-13)

`tests/scripts/profile-deploy-hardening.test.sh` **does** read `setup-telemetry.sh` and
`build-deploy-telemetry.sh`, but asserts almost nothing over them: one role-marker grep on
`setup-telemetry.sh` (line 280) and two preflight/`sshpass -f` greps on `build-deploy-telemetry.sh`
(282–285). **There is no compose-heredoc extraction for the telemetry file.** The idiom to mirror is
the profile one: `COMPOSE_BLOCK=$(awk '/cat > "\$PROFILE_DIR\/docker-compose.yml" << EOF/ …')` +
`n_services` counted from two-space-indented service keys, then `restart: unless-stopped` count ==
`n_services` and zero `restart: on-failure` (the `0221` G7 block, lines ~733–742 in the working tree —
cite by content, that file carries uncommitted `0220`/`0221` hunks). The telemetry heredoc's start
line differs (`$UPTRACE_DIR`, not `$PROFILE_DIR`) and its `volumes:` terminator sits at line 539.
The harness is already in `npm test` via `tests/scripts/ShellHarnesses.test.ts` (`0201`), so no
wrapper change is needed as long as the `ALL PASS` marker is unchanged.

### 🚫 Not in scope

- Anything on the profile box (`0221` owns its restart policy; done, pending live tail).
- The game box's `--restart=always` (`update.sh`) — a different management model; leave it.
- Memory, swap, ClickHouse settings, log rotation, uptime alerting on the telemetry box.
- A graceful-shutdown handler for any telemetry container — these are third-party images.
- `init: true` — `0221` added it on the profile API for a Node PID-1 reason that does not apply here.

## What to build

1. **Five value changes** in the `docker-compose.yml` heredoc in `setup-telemetry.sh`:
   `restart: on-failure` → `restart: unless-stopped` on `clickhouse`, `postgres`, `redis`, `uptrace`,
   `otelcol`. No other compose change.
2. **Decide how the policy reaches the two services the redeploy does not recreate** (`postgres`,
   `redis`) — either widen the `--force-recreate` list once (and say why it was narrow), or a
   one-time documented `docker compose up -d` on the box during verification. Record the choice in
   the plan; the owner approves it, because recreating `postgres` restarts Uptrace's metadata store.
3. **Harness block** in `tests/scripts/profile-deploy-hardening.test.sh`, `0219`/`0221` idiom,
   before the `ALL PASS` line: extract the telemetry compose heredoc, count services, assert
   `restart: unless-stopped` on every one and `restart: on-failure` on none. **Negative control
   first**: RED against the pre-change `setup-telemetry.sh`, then green. `ALL PASS` marker unchanged
   → `ShellHarnesses.test.ts` unchanged.
4. **One banner/echo line** in `setup-telemetry.sh` naming the policy, if the script has a summary
   block that lists what it configured (match whatever the profile script does; do not invent a new
   section).
5. **Deploy** via `build-deploy-telemetry.sh` (owner's terminal — the memory note says a redeploy
   needs local Docker Desktop up and the VPN off or bypassed), then the daemon-restart drill below.

## Verification steps

1. **Harness**: `bash tests/scripts/profile-deploy-hardening.test.sh` → `ALL PASS`, with the new block
   shown **RED** against a pre-change copy of `setup-telemetry.sh` first (paste both outputs in the
   worklog). `npm test` green, counts unchanged.
2. **All five live containers carry the new policy** after the deploy — on the box,
   `docker inspect --format '{{.Name}} {{.HostConfig.RestartPolicy.Name}}' $(docker ps -aq)` shows
   `unless-stopped` for every one. 🚨 **This is the check that catches the recreate gap in Context
   item 1** — the file saying `unless-stopped` is not evidence for `postgres` and `redis`.
3. **The daemon-restart drill — the specific hole, tested exactly** (`0221` B5 shape): record
   `systemctl is-active uptrace` **before**; `systemctl restart docker`; `docker compose ps` → all five
   `running`/`healthy` within the health-check window **without a reboot**. Record the unit state the
   result was obtained under (Context item 2) and how long telemetry ingestion was interrupted.
4. **Then reboot the box** and show all five come back via `uptrace.service` — proving the fix did not
   break the path that already worked. **Both, in that order.**
5. **A deliberate `docker compose stop otelcol` stays stopped** across a subsequent
   `systemctl restart docker` — this is the property that distinguishes `unless-stopped` from `always`,
   and the reason `0221` chose it. Start it again afterwards and show ingestion resumes (a trace
   arrives in Uptrace).
6. 🔒 **No values anywhere** — the telemetry host's IP and hostname stay out of the worklog (they are
   in the memory notes, which is where they stay); container names and policy values only.

## Notes

- **Depends on: nothing.** Shares no file with `0221` (`setup-telemetry.sh` and the harness's tail are
  disjoint from `0221`'s `setup-profile.sh` edits and its own harness block). ⚠️ One **working-tree**
  caution, not a dependency: the harness file currently carries uncommitted `0220`/`0221` hunks; the
  new block goes at the tail, after theirs, and touches nothing above it.
- **Blocks:** nothing.
- **Why filed now, not at `0221`'s close:** `0221` is `🚧 Blocked` on the owner's live tail B1–B6 as of
  2026-09-13; the Q4 ruling was given at plan approval and the reason needs no further input from that
  tail.
- **Effort: ~0.5 day** including the drill. **Risk: Low** — the only way to make things worse is the
  recreate step on `postgres`/`redis` (Context item 1), which is why the plan must put that choice to
  the owner rather than pick it.
- **Sibling from the same ruling session:**
  [`0254`](../0254-profile-non-root-deploy-user/brief.md) (`0221` Q8) — unrelated work, filed
  together for the record.
- **Source:** `ai-agents/tasks/backlog/0221-profile-p6-os-baseline-hardening/worklog.md` ("Note for
  the producer — telemetry restart policy") and `plan.md` (summary bullet on restart policy; Q4).
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- 🔒 **No secrets in any artifact** — variable names, file names and ports only.
