# Plan — 0060: Container log retention after the nginx stream merge

**Planned by:** fkit-coder (Plan step of `/fkit-sprint-ship-loop`), 2026-09-01.
**Brief:** [`brief.md`](brief.md)

> ⚠️ **Driver transcription note (fkit-lead, 2026-09-01).** This plan came back through the subagent
> return channel, which **HTML-escaped** `<`, `>` and `&`. The driver **decoded those entities to their
> literal characters** when writing this file, so the `--log-opt max-size=<SIZE>` placeholders read
> correctly. That decoding is the **only** alteration — nothing was summarised, reordered, or omitted.
> **Disclosed rather than claimed as a pure byte-for-byte copy.**

---

## 0. Headline: the brief's central premise is refuted

The brief says (§"⚠️ The log configuration is NOT in this repository"):

> **This may therefore not be a code change at all.** … it determines whether this task produces a commit or a documented server-side change.

**It produces a commit.** The retention *value currently in effect* is indeed set outside the tree, but the *place where it should be set* is in this repo, is version-controlled, and already ships to production on every ordinary deploy.

Evidence chain, all verified this session:

| # | Fact | Evidence |
|---|---|---|
| 1 | `deploy.sh` scp's **this repo's `update.sh`** to the box as `update-openfront.sh` and executes it | `/Users/mark.dolbyrev/Workspace/geoconflict/deploy.sh:226` (`UPDATE_SCRIPT="./update.sh"`), `:255` (scp), `:278` (ssh exec) |
| 2 | `update.sh` **stops, removes, and re-creates** the prod container on every deploy | `/Users/mark.dolbyrev/Workspace/geoconflict/update.sh:44-62` (stop/rm), `:71` (`docker run -d`) |
| 3 | That `docker run` carries **no** `--log-opt` / `--log-driver` | `update.sh:71-76` — flags are `--restart`, `--env-file`, `--name`, `-p` only |
| 4 | Therefore the container inherits the **daemon default** from the host's `daemon.json` | Corroborated by the repo's own comment: `nginx.conf:70` "rotated via daemon.json max-size" |
| 5 | A per-container `--log-opt` **overrides** `daemon.json` for that container | Docker log-driver precedence |

So: add `--log-opt max-size=… --log-opt max-file=…` at `update.sh:71`, and the next ordinary deploy applies it. No manual server edit, no hand-editing `daemon.json`, and the container recreate that verification step 1 demands happens **inherently** — `update.sh` already does `docker rm` + `docker run` every time.

This also fixes the brief's own closing worry — *"A change nobody can locate later is how this setting became invisible in the first place"* — by construction. Moving the value from an invisible host file into a tracked, deployed script is a win **independent of what number we pick**.

**Consequence for this plan:** the "Deferred Live Tail" shape is still needed, but it shrinks a lot. It covers *measurement and verification*, not the change itself.

## 1. Claims audit (the brief asked for this explicitly)

This sprint has already found three claims that propagated unchecked. Auditing these before building on them.

| Claim | Status | Notes |
|---|---|---|
| `max-file:3 × max-size:50m` = 150 MB | ⚠️ **Single-source, unverified** | Appears only at `incidents/2026-08-22-…:186` and in the brief quoting it. No repo artifact sets it. It is *plausible* — it is **not** a Docker default (json-file defaults to `max-size` unlimited, `max-file` 1), so someone deliberately set it — but nothing in the tree confirms the numbers. **Must be confirmed by `docker inspect` on the box before it is treated as fact.** |
| nginx access logs now share the container stream | ✅ **Verified in repo** | `nginx.conf:72` `access_log /dev/stdout;` + `supervisord.conf` `[program:nginx] stdout_logfile=/dev/stdout`. Both nginx and node pipe into the same stream. |
| Prior unrotated nginx log grew to 32 GB, disk-full 2026-07-15 | 🟡 **Corroborated, no incident record** | Three independent-ish mentions: `nginx.conf:71` (contemporaneous with the fix), `knowledge-base/architecture.md:596`, `incidents/…:123`. But `knowledge-base/incidents/` contains **only** the 2026-08-22 file — there is no 2026-07-15 record. Good enough to respect as a hard constraint; not good enough to cite as measured. |
| "nearly cost us the investigation window" | ⚠️ **Single-source, unquantified** | `incidents/…:188`, asserted without stating how close. **However** — see §3, the volume arithmetic derived from code independently supports it. I would not have accepted the assertion alone. |
| `/` at 22 % used during the incident | ✅ **Recorded measurement** | `incidents/…:123`, logged as the evidence that refuted the disk-full hypothesis. Point-in-time; re-confirm before relying on headroom. |
| Total disk size ~50 G | ⚠️ **From operator memory, not the repo** | Needed for the headroom math. Confirm on the box. |

## 2. Every log destination, named and bounded (verification step 4)

| # | Destination | Bound today | Note |
|---|---|---|---|
| 1 | Container stdout/stderr → Docker `json-file` | **Unverified** (claimed 150 MB) | Carries **both** nginx access/error and all node output. The subject of this task. |
| 2 | `/var/log/supervisor/supervisord.log` (in-container) | Supervisor defaults — `logfile_maxbytes` 50 MB × `logfile_backups` 10 ≈ 550 MB | `supervisord.conf` sets `logfile=` but **not** the maxbytes/backups, so it rides on defaults. Bounded, on the container's ephemeral writable layer, destroyed on every deploy's `docker rm`. Low risk; named because step 4 demands every destination be named. |
| 3 | `/var/cache/nginx` + `/var/cache/nginx/api` | `max_size=1g` + `max_size=100m` | `nginx.conf:61,63`. Not logs, but bounded disk consumers on the same layer — they belong in the headroom sum. |

No unbounded destination exists in the repo today. **The plan must not create one** — this is what rules out the naive "separate the streams" option (§4).

## 3. Volume estimate, derived from code without touching a server

The brief's step 2 says measure first. I can get most of the way there statically, and the result is the strongest argument in this plan.

**The dominant access-log source is a 1-second poll.**

- `src/client/PublicLobby.ts:68-70` — `window.setInterval(…, 1000)` refreshing the lobby list
- `:138` — each tick issues `fetch("/api/public_lobbies")`
- `nginx.conf` `location = /api/public_lobbies` caches for `1s`, **but nginx logs every request including cache hits** — the cache saves the upstream call, not the log line

So **every client sitting on the main menu emits one access-log line per second**, whether or not anything changed.

Line-size arithmetic:
- `nginx.conf:72` is `access_log /dev/stdout;` with **no format argument** → nginx's built-in `combined` format, typically ~150–250 bytes for this URL
- Docker's `json-file` driver wraps each line as `{"log":"…","stream":"stdout","time":"…"}` — roughly **+68 bytes** of fixed envelope
- Call it **~270 bytes/line** on disk

| Concurrent menu-sitters | Lines/day | Bytes/day | Time to fill a 150 MB budget |
|---|---|---|---|
| 20 | 1.73 M | ~470 MB | **~7.7 hours** |
| 50 | 4.32 M | ~1.2 GB | **~3.1 hours** |
| 100 | 8.64 M | ~2.3 GB | **~1.6 hours** |

The 2026-08-22 investigation needed logs from a boot **~3.5 hours** before anyone looked (brief §3). At even modest concurrency the app's own history is evicted inside that window **by lobby polling alone**.

⚠️ **This is an estimate from code, not a measurement.** Concurrency is unknown to me, and the bytes/line figure is a standard-format approximation. It does not replace the on-box measurement — but it independently corroborates the incident record's unquantified near-miss claim, and it tells us *which* lever matters most.

**Conclusion: the highest-volume log lines in production are also the lowest-value ones.** That reframes the whole task.

## 4. Options weighed, and the recommendation

**(A) Raise the json-file budget only.** Cheap — one line in `update.sh`. But it treats a volume problem as a storage problem: at 100 concurrent, a 10× budget still buys ~16 hours, and the app's signal stays diluted ~1000:1 by poll noise. Necessary, insufficient alone.

**(B) Separate the streams — nginx access log back to its own file.** ❌ **Reject.** This is precisely the 32 GB failure mode. There is no logrotate in the image (`Dockerfile:81-82` installs `nginx` and `supervisor`, not `logrotate`), and nginx cannot rotate itself — it needs an external `nginx -s reopen` cycle. Rebuilding that machinery to un-do a fix that worked is a large diff against the task's one hard constraint.

**(C) Cut access-log verbosity at the source.** ✅ The `location = /api/public_lobbies` block **already exists** (`nginx.conf`, in the caching section). Adding `access_log off;` inside it removes the single dominant line source with a one-line change, and loses almost nothing: the endpoint's health is already visible via the `API_CACHE` hit-ratio header, the node-side handler at `src/server/Master.ts:195`, and OTEL server metrics.

**(D) Ship logs off-box.** Correct long-term answer, and OTEL infrastructure already exists (`setup.sh` runs an otel-collector). But it is a project, not this task.

### Recommendation: **C + A together**, and say plainly that the real fix is D

Do both cheap levers, in the same task:
1. **(C)** stops the app's history being flushed by poll noise — the actual mechanism of the problem
2. **(A)** makes the budget explicit, version-controlled, and larger — and rescues the setting from an invisible host file

The honest framing the brief asked for: **the cheap fix is a config value and a one-line nginx directive; the real fix is shipping logs off-box (D), which is out of scope here.** C+A buys days of window for hours of work. It does not make the container log a durable evidence store, and nobody should later believe it did.

## 5. Implementation steps (repo phase — agent-doable, reviewable, committable)

**Step 1 — `nginx.conf`, inside the existing `location = /api/public_lobbies` block**

Add `access_log off;` with a comment explaining *why* (1-second client poll, `PublicLobby.ts:68`), so the next reader does not "restore" it.

⚠️ **Deploy cost differs from step 2.** `nginx.conf` is baked into the image (`Dockerfile:87`), so this requires an **image rebuild via `build-deploy.sh`**, not just a `deploy.sh` run. Per the operator note that repo `nginx.conf` is the *container* nginx, not the host proxy.

**Step 2 — `update.sh:71`, the `docker run -d` invocation**

Add explicit log options with a comment naming this task and stating that this overrides the host `daemon.json`:

```
--log-driver json-file \
--log-opt max-size=<SIZE> \
--log-opt max-file=<COUNT> \
```

Provisional values: `max-size=100m`, `max-file=10` → **1 GB total**, ~6.8× the claimed current budget. Marked provisional pending §6's measurement.

**Step 3 — Record where the setting lives**

Short note in `ai-agents/knowledge-base/` (not the wiki — `fkit-wiki`'s surface) recording: retention is now set at `update.sh:71`, it overrides `daemon.json`, and it applies on the next deploy. This is the brief's own "record what was changed and where" requirement.

**Step 4 — Tests**

No `src/core/` change, so the mandatory-test rule is not triggered. There is no existing harness for `nginx.conf` or `update.sh`. Proposed minimum: extend the existing `tests/scripts/profile-deploy-hardening.test.sh`-style shell assertion pattern with a grep-level check that `update.sh`'s `docker run` carries both `--log-opt` flags — cheap regression protection against a future edit silently dropping them. **Flagging honestly: this is a lint, not a behavioural test.** The actual behaviour is only observable on the box (§6).

### ⚠️ Deviation from the brief, surfaced for the owner

The brief's step 2 says **measure before changing**. This plan changes first, measures second. Reason: measurement requires the box, and both changes are safe in either direction — (C) strictly *reduces* volume, (A) strictly *increases* retention, and the worst case is bounded and computable in advance (§7). Waiting for a measurement would stall a safe change behind a live-server session. **If the owner prefers the brief's ordering, steps 1–2 hold until §6 runs.**

## 6. Deferred Live Tail — requires the owner on a live box

⛔ **No agent performs any of these.** Each needs a production shell; each is the owner's to run and authorize.

- [ ] **Confirm the current effective config.** `docker inspect --format '{{json .HostConfig.LogConfig}}'` on the prod container. **Gate: settles whether "150 MB" is real** (§1 flags it as unverified). If it comes back materially different, §3's arithmetic and step 2's values must be re-derived before deploying.
- [ ] **Measure real daily volume**, split app vs access lines, scoped to one boot via `docker logs --since "$(docker inspect --format '{{.State.StartedAt}}' "$CID")" "$CID"`. **Gate: converts step 2's provisional numbers into sized ones.** ⚠️ Output contains `persistentID` values (JWT `sub`, PII) — filter before any excerpt reaches a worklog, review, or commit.
- [ ] **Confirm disk headroom**: `df -h /` for current use and **total size**. **Gate: §7's worst case cannot be closed without the total.**
- [ ] **Deploy.** Image rebuild (`build-deploy.sh`) for step 1, since `nginx.conf` is baked in; that path also re-runs `update.sh` for step 2.
- [ ] **Re-inspect after recreate** — verification step 1. The recreate is inherent to `update.sh`, but confirm rather than assume.
- [ ] **Verify a real window survives** — verification step 2. Read the *oldest* line actually present and check its timestamp against the intended window. Do **not** infer this from config values.
- [ ] **Confirm boot-scoped reads still work** — verification step 5, the technique the next investigation depends on.

## 7. Risk and the worst case (verification step 3, computed not observed)

New worst-case log footprint: **1 GB** (10 × 100 MB), replacing a claimed 150 MB → **delta ≈ +850 MB**.

Against a disk recorded at 22 % used (`incidents/…:123`), that delta is small. But **the total disk size is not established anywhere in the repo** — the ~50 G figure is operator memory. Until `df -h /` confirms it, the headroom conclusion is **not closed**; it is the third Deferred Live Tail item and it gates the deploy.

Note also that Docker's `max-size`/`max-file` bound is **per container**. The other containers on the host (`node-exporter`, `otel-collector`, created by `setup.sh:123,137`) likewise carry no `--log-opt` and still inherit `daemon.json`. Out of scope here, worth a follow-up brief.

Nothing in this plan creates an unbounded destination. Constraint §5 of the brief holds.

## 8. Owner decisions required at the plan gate

1. **Do both levers (C+A), or only the budget (A)?** C is one line but costs an image rebuild and gives up per-request visibility on the poll endpoint. *Rec: both* — A alone leaves the actual mechanism in place.
2. **Accept change-before-measure, or hold for §6's numbers?** *Rec: proceed* — both changes are safe in both directions and the worst case is bounded (§7).
3. **Retention target.** `100m × 10` = 1 GB is provisional. *Rec: adopt provisionally, re-tune after measurement.*
4. **Is the grep-level shell assertion (step 4) worth it, or skip tests entirely** given nothing behavioural is testable off-box? *No strong rec.*

---

**evidence** — every file:line cited above was read this session. No server was contacted; no file was written; nothing was committed.

---

# OWNER RULINGS — 2026-09-01, binding amendments to this plan

The owner approved this plan via `AskUserQuestion` in the fkit-lead session on 2026-09-01 and settled
all four §8 decisions in the same exchange. **These are owner rulings, not the coder's recommendations
restated — they bind the build.**

## R1 — §8.1: BOTH LEVERS (C + A). RULED.

Ship **(C)** `access_log off;` inside the existing `location = /api/public_lobbies` block **and**
**(A)** the explicit `--log-driver` / `--log-opt` flags at `update.sh:71`.

**Budget-only (A alone) was offered and DECLINED**, on the plan's stated grounds: it treats a volume
problem as a storage problem and leaves the actual mechanism — a 1-second client poll generating the
dominant log line source — in place, with the app's own signal diluted roughly 1000:1.

**Option (B), separating the streams, stays REJECTED** and must not be reintroduced: it is the exact
32 GB disk-full failure mode, and there is no `logrotate` in the image.
**Option (D), shipping logs off-box, is the acknowledged real fix and is OUT OF SCOPE here.** The
worklog and close must say so — nobody may later read C+A as having made the container log a durable
evidence store.

## R2 — §8.2: PROCEED NOW, MEASURE AFTER. RULED — and it is a deliberate deviation from the brief.

The brief's step 2 says measure before changing. **The owner ruled the other way**, on the plan's
stated grounds: measurement requires a production shell, both changes are safe in either direction
(**C strictly reduces volume, A strictly increases retention**), and the worst case is bounded and
computable in advance (§7).

⚠️ **Record this as an owner-ruled deviation from the brief, not as the brief being followed.**

## R3 — §8.3: 1 GB, EXPLICITLY PROVISIONAL. RULED.

`max-size=100m`, `max-file=10` → **1 GB**. A smaller 500 MB option was offered and declined.

⚠️ **"Provisional" is load-bearing and must survive into the code comment, the worklog and the close.**
The 150 MB baseline it is measured against is **itself unverified** (§1) — single-source, in no repo
artifact. **Nobody may later cite 1 GB as a sized figure.** It is re-tuned after §6's first two Live
Tail items land.

## R4 — §8.4: ADD THE GREP-LEVEL SHELL ASSERTION. RULED.

Add the check that `update.sh`'s `docker run` still carries both `--log-opt` flags.

⚠️ **Do not overstate it.** The plan is right that this is **a lint, not a behavioural test** — the real
behaviour is observable only on the box. And `0201` established the day before that this repo has **no
CI** and that its one existing shell harness sat broken for ~2 months precisely because nothing runs
it. **The assertion raises the local ceiling; it creates no automatic gate.** Say that in the worklog.

## R5 — Standing constraints for the build.

- ⛔ **Touch NO production server.** No SSH, no `deploy.sh`, no `build-deploy.sh`, no container restart,
  no live config edit. Every §6 item is the owner's, on the owner's shell.
- **Create no unbounded log destination** (brief constraint §5, plan §2).
- **Do not edit `daemon.json` or any host file** — the whole point is moving the setting into the repo.
- **🚨 No secrets, and no PII.** §6 flags that `docker logs` output carries `persistentID` values (JWT
  `sub`). Nothing of that kind may reach a worklog, report, review or commit.
- **The `~50 G` disk total and the `150 MB` current budget are UNVERIFIED.** Neither may be stated as
  fact in any artifact this task produces.
