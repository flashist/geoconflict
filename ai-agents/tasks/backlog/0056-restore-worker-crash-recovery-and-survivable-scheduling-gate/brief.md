# Restore worker crash recovery — with a restart cap — and make the scheduling gate survivable

## ID
0056

## Sprint
Sprint 4

## Priority
Highest open item in Sprint 4. This is the fix for the 2026-08-22 total loss of public lobbies.

## Status
🔲 Backlog

*(Was `🚧 Blocked` until 2026-08-22, when the owner ruled on both blocking decisions — recorded under
"Owner decisions (RULED)" below. Sequencing: `0057`'s findings are due **before** this task starts;
see Notes.)*

## Owner
fkit-coder

## Context

On **2026-08-22** production lost **all** public multiplayer lobbies for roughly 3.5 hours. Service
was recovered by a container restart. **The defects are still unfixed in `main`. Production is
running right now with crash recovery disarmed**, and every deploy and every restart re-runs the same
20-worker startup that triggered it.

Full investigation record — **read it first, it has everything**: the evidence chain, ten refuted
hypotheses, a local repro, and the draft fix plan this brief is scoped from:
[`ai-agents/knowledge-base/incidents/2026-08-22-prod-public-lobbies-empty-outage.md`](../../../knowledge-base/incidents/2026-08-22-prod-public-lobbies-empty-outage.md)

### What happened, in one chain

One of 20 game workers died 1.74 s after being forked. The master's `cluster.on("exit")` handler
reads `worker.process.env.WORKER_ID` (`src/server/Master.ts:134`) — but a Node `ChildProcess` has
**no `.env` property**, so the value is *always* `undefined`. The handler logged one opaque line and
`return`ed **without restarting**. That left 19 of 20 workers alive. The scheduling gate requires
**all 20** ready (`Master.ts:110`), so it never closed, the lobby-fetch interval never installed,
`publicLobbiesJsonStr` stayed `""`, and `/api/public_lobbies` served a zero-length body until
restart.

**The 2026-08-22 deploy did not cause this.** `git diff` over the deployed batch shows `Master.ts`
changed only in `/api/env` and the feedback handler. Defect #1 dates to `feea527`, the repository's
first commit — **no worker has ever been restarted after a crash in this project's history.**

### The defects this task fixes

From §5 of the incident record — **#1, #2, #3, #4**. (#5 and #6 were task `0055`, **closed 2026-08-22**
— its changes are in the working tree but **not committed and not deployed**.)

| # | Defect | Location |
|---|---|---|
| 1 | `worker.process.env` does not exist on a `ChildProcess`; `workerId` is **always** `undefined`, so **no worker is ever restarted after a crash** | `Master.ts:134-137` |
| 2 | `if (!workerId)` treats worker **0** as missing (`0` is falsy). Masked by #1 today; **goes live the moment #1 is fixed** | `Master.ts:135` |
| 3 | Gate requires `readyWorkers.size === numWorkers()` — no quorum, no timeout, no alarm. One lost worker in twenty = total outage | `Master.ts:110` |
| 4 | Gate re-satisfied after a restart installs a **second** `setInterval` (interval leak) | `Master.ts:112-127` |

Defect #1 is **proven** three ways: source inspection, a local Node 24 repro (§5.1 of the incident
record), and the production log line. Defects #2 and #4 are proven by inspection. Defect #3 caused
the outage.

---

## ⚠️ REQUIRED BEHAVIOUR — the restart cap ships in this same change, non-negotiable

**Fixing defect #1 arms worker restarts for the first time in this project's history.**

Defect #1 has suppressed every restart since the first commit — which also, silently, suppressed any
restart *loop*. **We do not know why worker 16 died** (§7 of the incident record: it produced zero
output, never reached its first log statement, and was not killed by the kernel; the signature is
consistent with a native-level abort or an abrupt exit inside the `ts-node`/ESM loader). A worker
that crashes *repeatedly* for that same unknown reason would be respawned **forever** if nothing
stopped it.

The cap is no longer an open risk — the owner specified it (decision (b) below). **The required
behaviour is therefore:**

- The restart cap and backoff **ship in the same change as the exit-handler fix.** Not a follow-up,
  not a fast-follow, not a flag defaulted off.
- A build that restores restarts **without** the cap in place is **not** a shippable increment of
  this task. It must not be split out, deferred, or landed "temporarily".
- The cap's test (Step 4, last bullet) is the fork-loop guard. **It is the most important test in the
  set** — if it cannot be written, that is a signal to stop and report, not to ship uncovered.

---

## Owner decisions (RULED — 2026-08-22)

Both blocking decisions are **made**. They are requirements, not suggestions. Implement these exact
values; do not re-open, re-derive, or "improve" them without going back to the owner.

**(a) Readiness gate quorum and deadline — RULED: `18` of `20` workers, with a `90`-second deadline.**
Public-game scheduling starts as soon as **18** workers report ready, or at **90 seconds** after
master start, whichever comes first. Owner's rationale as given: it tolerates a lost worker with no
delay at all, and 90 s sits comfortably past the measured 30–40 s boot, so the deadline never fires
spuriously on a healthy start. Today's outage would have been a non-event.

- Express the quorum against the **configured** worker count, not the literal `20` — `ProdConfig`
  is `20` and `DevConfig` is `2` (`src/core/configuration/ProdConfig.ts:6`, `DevConfig.ts:40`). A
  hard-coded `18` makes dev unstartable. Whether that is `numWorkers() - 2` or a configured ratio is
  an implementation call; state which in the plan.
- ⚠️ **Factual consequence to carry into `0057`, not a challenge to the ruling:** a quorum of 18 of
  20 permits **up to two** missing indices, so the routing residual is up to **2 in 20 (~10%)** of
  scheduled games landing on an absent worker — not the 1-in-20 figure used before the ruling.
  `0057` runs first and should size the impact against this number.

**(b) Restart cap and backoff — RULED: `5` restarts per worker index per rolling `10`-minute window,
exponential backoff from `1s` to a `30s` ceiling**, then stop re-forking that index and log at
`error` level. Owner's rationale as given: absorbs a one-off death instantly, refuses to spin on a
persistent crash.

- The window is **per worker index**, not global.
- Backoff grows `1s → 2s → 4s → 8s → 16s → 30s` (capped), applying to that index's restarts.
- On reaching the cap: **give up on that index and log at `error` level.** Do not keep retrying at
  the ceiling. A permanently missing worker must be loud, because with a quorum gate in place it is
  no longer visible as an outage.

**(c) Worker routing is explicitly OUT OF SCOPE here — no decision needed for this task.**
`schedulePublicGame` picks a worker with `simpleHash(gameID) % this.numWorkers()`
(`src/core/configuration/DefaultConfig.ts:297`), so it can route a game to a dead or unready worker —
**up to 2 in 20 (~10%)** of scheduled games under the ruled 18/20 quorum, **even with the quorum in
place**. Changing that alters game-to-worker distribution and is an architecture question. It is task
**`0057`**, an architect-led investigation, and the owner ruled on 2026-08-22 that **`0057` runs
before this task**. **Do not fold it into this fix.** Record the residual: after this task, a
degraded-quorum start still misroutes a fraction of games.

---

## What to build

**Scope: `src/server/Master.ts` plus new tests.** No client changes, no infra changes, no
`Dockerfile` changes. This scope is inherited from the investigating coder's draft plan (§10 of the
incident record) and is **input, not gospel** — if implementation shows the boundary is wrong, say so
before crossing it.

**Step 1 — Restore crash recovery and its diagnostics (defects #1, #2).**

Track worker indices in a `Map<number /* cluster worker.id */, number /* WORKER_ID */>`, populated at
fork time **and on every restart**. In the exit handler, look the index up in that map instead of
reading `worker.process.env`. Test the result with `=== undefined`, **not** falsiness, so worker
index `0` is not treated as missing. Remove the dead worker from `readyWorkers` (`Master.ts:20`) —
today nothing ever does, so the set can outlive the processes it describes.

**Carry forward the diagnostics `0055` shipped** — it logs `clusterId`, `pid`, `code` and `signal` on
the *failure* branch. Keep all four fields and extend them to **both branches**, not only the failure
one. `0055` also renamed `__filename`/`__dirname` to `moduleFilename`/`moduleDir` (a plan deviation
forced by `@swc/jest`, recorded in `0055`'s `worklog.md`) and exported `app` for testability — expect
those in the file and do not revert them. ⚠️ **See "OTEL delivery of the new log fields" below: those
four fields are proven on stdout but NOT proven to reach Uptrace, and verifying that is this task's
job.**

**Step 2 — Apply the ruled restart cap and backoff (decision (b): 5 per index per 10 min, 1s→30s).**

Per worker index, count restarts within a rolling **10-minute** window. Below **5**, re-fork with
**exponential backoff from 1s, capped at 30s**. At the cap, **stop re-forking that index and log at
`error` level** — a permanently missing worker must be loud, because with a quorum gate in place it
is no longer visible as an outage.

**Step 3 — Make the gate survivable (defects #3, #4) using the ruled quorum (decision (a): 18/20, 90s).**

Replace `readyWorkers.size === config.numWorkers()` with **quorum-or-deadline**: start scheduling when
**18** workers have reported ready, or at **90 seconds** after master start, whichever comes first.
Express the quorum against the configured worker count, not a literal `18` — see decision (a) above,
a hard-coded `18` makes dev (2 workers) unstartable. Guard with a `schedulingStarted` flag so the
interval installs **exactly once** — including across a worker restart that re-satisfies the
condition, and including the case where quorum is reached *and* the deadline later fires. When
scheduling starts below full strength, log at `error` level **which worker indices never reported**,
by index, not just a count.

**Step 3a — Confirm the structured log fields actually reach Uptrace (carried over from `0055`).**

**The problem.** `0055` added `clusterId`, `pid`, `code` and `signal` to the exit handler as
structured log fields. Those are **proven to reach stdout / `docker logs`** — the path that actually
mattered on 2026-08-22. They are **NOT proven to reach Uptrace.** Local dev runs with OTEL disabled,
so neither the implementing coder nor the reviewer ever observed them as OTEL log attributes. This
task touches that exact handler, so it is the right place to settle it. The owner ruled it belongs
here.

**The contradiction to resolve, stated honestly.** The wiki page
`ai-agents/wiki-vault/wiki/systems/telemetry.md`, *Gotchas* section, says:

> "Winston OTEL transport silently drops extra arguments — embed all error details in the message
> string."

Read literally, that says `0055`'s fields are lost in Uptrace. **The reviewer read the transport code
and concluded the gotcha does not apply here**: winston merges a *single object* meta into the info
record, and `emitLogRecord` spreads its non-symbol keys into log attributes, so the fields survive;
the gotcha is accurate only for the **multi-argument** form, whose extras land under
`Symbol(splat)`. The investigating coder agreed with that reading.

⚠️ **That is a code reading, not an observation — treat it as a hypothesis to confirm, not a
finding.** Two people agreeing on a code path is exactly the kind of evidence that was wrong about
`worker.process.env` for the entire history of this repository.

**What to do:**
1. **Observe the fields in an OTEL-enabled environment.** Confirm `clusterId`, `pid`, `code` and
   `signal` arrive in Uptrace **as log attributes**, not merely on stdout.
2. **If they do not arrive, move them into the message string** — the wiki gotcha's prescribed
   workaround — and apply the same treatment to any new fields this task adds (the degraded-start
   log's missing worker indices, and the restart-cap error log). A diagnostic that only exists on a
   stdout stream with ~150 MB of retention is one log rotation away from being no diagnostic at all;
   that nearly cost us the 2026-08-22 investigation (§9 of the incident record).
3. **Record which way it went**, in this task's `worklog.md`, with the evidence.
4. ⚠️ **Do not edit the wiki page either way.** `ai-agents/wiki-vault/` is `fkit-wiki`'s exclusive
   write surface (ADR-005). The owner chose not to route this to the wiki role for now, so the
   contradiction is recorded **here** so the next reader is not misled by the Gotchas line. If your
   observation settles it, say so in the worklog and flag that the wiki page may need `fkit-wiki` to
   amend it — **do not amend it yourself**.

**Step 4 — Tests.**

`tests/` had **no coverage for `Master.ts` or `Worker.ts` at all** — all 30+ files cover game logic
(§9 of the incident record). `0055` added `tests/server/Master.test.ts`, the first ever coverage of
this file (3 tests). Everything below is still greenfield relative to that: extend that file rather
than starting a new one.

The gate logic currently lives inline inside `startMaster()`, which forks real processes and cannot
be unit-tested. **Extracting readiness tracking into a small pure unit is required to test it** —
something like `markReady`, `markDead`, `missing()`, `shouldStart(quorum)` — and it **enlarges the
diff beyond a minimal patch**. That enlargement is expected and approved by this brief; flag it in
the plan so the reviewer is not surprised.

Cover at minimum:
- Worker index **0** is not dropped by the identity lookup.
- A dead worker is removed from `readyWorkers` **and** re-forked.
- The interval installs **exactly once** across repeated ready events, including after a restart,
  **and including quorum-then-deadline** (quorum reached at 18, deadline fires at 90 s — one interval,
  not two).
- **Quorum at exactly 18** triggers scheduling; **17 does not**. Both halves — an off-by-one here
  either starts a worker early or reproduces the outage.
- The **90-second deadline** triggers scheduling independently, with fewer than 18 ready.
- The deadline **does not fire spuriously** on a healthy boot that reaches quorum first.
- The quorum scales with the configured worker count — the same logic must be startable at
  `DevConfig`'s 2 workers, not just prod's 20.
- Missing indices are reported by index when scheduling starts degraded.
- **The restart cap holds**: a worker index that keeps dying stops being re-forked after **5**
  restarts in a **10-minute** window and raises an error-level log. This is the fork-loop guard — it
  is the most important test in the set.
- **Backoff grows and is capped**: successive restarts of one index are spaced 1s, 2s, 4s, 8s, 16s,
  30s — never beyond the 30s ceiling.
- **The window is per index and rolling**: restarts of worker 3 do not count against worker 7, and an
  index that died 4 times over 30 minutes is still restartable.

## Verification steps

1. **All new tests pass**, including the restart-cap test.
2. **The local repro from §5.1 of the incident record now restarts the worker.** Same script, Node
   24: the exit handler identifies the worker, logs `code`/`signal`/`id`/`pid`, and re-forks it.
3. **Worker 0 specifically.** Kill worker index `0` and confirm it is identified and restarted — not
   swallowed as "could not find id". This is defect #2 and it only becomes observable now.
4. **Simulate the outage.** Boot locally with the worker count raised and one worker forced to die at
   startup. Confirm: (i) the worker is restarted; (ii) if it keeps dying, restarts stop after **5** in
   a **10-minute** window with an error-level log and **no fork loop** — watch the process count, it
   must stabilise; (iii) scheduling starts anyway on the **18-worker quorum** or the **90-second
   deadline**; (iv) `/api/public_lobbies` serves real lobbies; (v) the degraded-start log names the
   missing index.
   **This is the 2026-08-22 scenario end to end** — under the ruled values it must resolve into a
   non-event, which is the whole point of the ruling.
4a. **⚠️ The structured log fields reach Uptrace, not just stdout — REQUIRED, and it needs an
   OTEL-enabled environment.** In an environment with OTEL **on** (local dev runs with it off, which is
   exactly why this is still unproven), trigger a worker death and confirm `clusterId`, `pid`, `code`
   and `signal` appear in Uptrace **as log attributes**. Do the same for this task's own new fields —
   the degraded-start log's missing worker indices and the restart-cap error log.
   **If they do not arrive, the fields move into the message string and you re-verify** — see Step 3a.
   **This check is not satisfied by reading the winston/OTEL transport code.** Two people have already
   read it and concluded the fields survive; that reading is recorded in Step 3a as a hypothesis. This
   step exists because nobody has *observed* it. State plainly in the worklog which environment you
   observed it in — if no OTEL-enabled environment was available, say **that**, and do not mark this
   step passed.
5. **Exactly one interval.** Across a full boot plus at least one worker restart that re-satisfies the
   gate, assert the lobby-fetch interval was installed once. A leaked second interval doubles the
   scheduling rate silently.
6. **Healthy path unchanged.** Full local boot with every worker healthy: `All workers ready`
   behavior, scheduling, and the endpoint are as before.
7. **Prod-shaped boot.** `ProdConfig.numWorkers()` is `20` versus `DevConfig`'s `2`
   (`src/core/configuration/ProdConfig.ts:6`, `DevConfig.ts:40`) — ten times the exposure. Exercise
   the gate logic at 20 workers at least in the unit tests, since the failure is prod-only.
8. **Deploy verification, on the real box, after ship.** Scope log counts to the current boot —
   `docker logs` is **cumulative across restarts** and counting over the whole log mixes boots. Use
   `docker logs --since "$(docker inspect --format '{{.State.StartedAt}}' "$CID")"`. Confirm 20/20
   ready, `All workers ready` present exactly once, and the endpoint serving a real lobby.

## Notes

- **Depends on:** `0057` — **owner-ruled 2026-08-22: `0057` runs BEFORE this task.** Its routing
  findings must be reviewed before implementation starts here. Rationale: quorum size sets the
  misroute rate, and at the ruled 18/20 the residual is up to 2 in 20 scheduled games; if `0057`
  finds that severity is worse than assumed, the owner may want to revisit the quorum *before* it is
  built rather than after. Both owner decisions (a) and (b) are **answered** and no longer block.
- **Sequencing:** `0057` → `0056`. `0055` is **closed (2026-08-22, agent-closed — not owner-verified)**
  and its changes sit in the working tree **uncommitted and undeployed** — so build on top of them,
  but do not assume production has them.
- **Carried in from `0055`:** the OTEL-attribute verification (Step 3a and verification step 4a). It
  was surfaced during `0055`'s review, could not be settled there, and the owner ruled it belongs in
  this task, which touches the same handler.
- **Blocks:** nothing scheduled.
- **Related:** `0058` (`Worker.ts` missing `server.on("error")` — same failure family: a silently
  hung worker), `0059` (precompile the server for prod — the leading hypothesis for *why* the worker
  died in the first place).

- **This task does not explain the crash.** It makes the system survive one and makes the next one
  diagnosable. Why worker 16 died stays open; `0059` addresses the most plausible contributing
  factor. Do not let the scope drift into hunting the crash cause.
- **Do not modify the incident record.** Reference it; it is the investigation's finished output.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **No secrets in any artifact.** Container logs contain `persistentID` values, documented as the JWT
  `sub` and PII. Filter any log excerpt before it lands in a worklog, review, or commit.
