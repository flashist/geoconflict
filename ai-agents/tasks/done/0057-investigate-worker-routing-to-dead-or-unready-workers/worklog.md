# Worklog — 0057 Investigation: routing to a dead or unready worker

Build unit executed 2026-08-26 by a spawned `fkit-architect` (driver `fkit-sprint-ship-loop`).
`plan.md` (blob `a8824c6`, 10932 bytes — re-hashed this turn, matched the driver's paste) was
owner-approved the same day and **not re-authored**. Nothing committed. No routing code changed. The
incident record and `ai-agents/wiki-vault/` were read only.

## Output

- Report: `ai-agents/knowledge-base/reports/2026-08-26-0057-worker-routing-dead-worker-findings.md`
  — §0 summary/recommendation/tradeoff, §1 citation corrections, §2 Q1 trace + reproduction, §3 Q2,
  §4 option table (5 rows), §5 Q4 residual + ruling recommendation, §6 Q5 catalogue + owner query,
  §7 adjacent surfaces (bounded), §8 owner decisions, §9 open questions, Appendix (commands;
  loopback literals `localhost` / `127.0.0.1` and default local ports only — no remote hosts, no
  secrets).
- This worklog.

## What was done, in order

1. Verified the plan blob and read the brief, `Master.ts` (whole), `Worker.ts` (routes, mismatch
   checks, listen/ready, limiter, ID sampler), `DefaultConfig.ts` / `DevConfig.ts` / `ProdConfig.ts` /
   `PreprodConfig.ts`, `Util.ts` (`simpleHash`, `generateID`), `nginx.conf`, `Transport.ts`,
   `PublicLobby.ts`, `ClientGameRunner.ts`, `ReconnectModal.ts`, `Main.ts` (`handleJoinLobby`),
   `HostLobbyModal.ts`, `JoinPrivateLobbyModal.ts`, `GameServer.ts` (phase, gameInfo, AI lobby),
   `GameManager.ts` (tick), `Logger.ts`, `Server.ts`, `tests/server/Master.test.ts` (3 tests).
2. `git log -S` on the hash line → `feea527` only. `git log` for `0055`: PR #133 (`7410bfb`) merged
   into `dev`; deployment to prod **not checked** (no access).
3. Catalogue grep for the master-side log signatures across `knowledge-base/` and `wiki-vault/` →
   zero hits. Read the five catalogue documents named in the plan at the cited sections.
4. Traced master → OTEL: `Logger.ts` installs the OTLP exporter at module load when the endpoint env
   var is set, regardless of process role; `Dockerfile:25-26` bakes it, `deploy.sh:302` forwards it
   (names only recorded). So the Q5 live query is runnable by the owner; strings are in §6.3.
5. Offline hash-distribution count (node script in the session scratchpad; 10⁶ IDs; 20 and 2
   indices; rejection-sampling trial at 18/20). Results in §3.
6. Local reproduction, dev only, after confirming ports 3000–3002 free:
   - Run 1: `npm run start:server-dev`, `kill -9` worker 1, 45 s of master log + 500 ms sampler on
     `/api/public_lobbies`. Evidence in §2.5.
   - Run 2: fresh server, `kill -STOP` worker 1 for 40 s, `lsof` on the worker port, `kill -CONT`,
     15 s more. Evidence in §2.5.
   - Server stopped after each run; `pgrep`/`lsof` confirmed no `Server.ts` process and ports free
     before writing the report and again before returning.
7. Wrote the report per the plan's outline; corrected one wiki line citation after re-checking.

## Evidence gathered (where it lives)

- All `path:line` citations: report §1–§7, checked against `dev` at `282655c` this session.
- Reproduction logs, sampler output, and the hash script: session scratchpad only (not committed,
  not in the repo). Key excerpts are reproduced verbatim in report §2.5.
- Exact counts carried into the report: run 1 — 90 samples, 2 empty; run 2 — 120 samples, 25
  empty; 207 `Error fetching game` lines over the stop window (50/50/50/50/6/1 per stuck ID); 108
  established connections to the stopped worker's port; 8 creates drained on resume, 2 orphans
  (`RRD9kQZt`, `zoLHrA3N`), 3 `Too Many Requests` create failures; orphans ended at created + 35 s
  with 404 turns.

## What could not be observed, and why

- **Client-facing 502 / WebSocket close code on a dead `/w<N>/` upstream** — dev has no nginx.
  Reasoned from `nginx.conf` and `Transport.ts`; marked "(reasoned, not observed)" in §2.4.
- **The eventual failure of a hung `create_game`** — undici's documented default headers timeout is
  300 s; the reproduction window was 40 s and it did not fire. Marked in §2.2 and §9.
- **Prod telemetry (Q5 live query)** — no Uptrace access from this unit; owner runs §6.3.
- **Whether `0055` is deployed** — no prod access; left as unknown in §1.
- **Whether `comp` reaches Uptrace as an attribute** — same unresolved point as `0056` Step 3a.

## Decision log (autonomous judgment calls)

1. **Added a `SIGCONT` phase to run 2** (the plan said "SIGSTOP … observe the 5 s-timeout path").
   Resuming the worker was the only way to test the "orphan" hypothesis the plan itself raised
   (Q1: "half-succeed / orphan candidate"). It stayed dev-only and within the approved kill/STOP
   scope. It produced the orphan + 429 evidence.
2. **Reported the `fetchLobbies` overlap and the worker rate limiter as adjacent findings (§7), not
   as options in the §4 table.** They are not routing changes and the owner ruled §7 bounded with
   no options costed; scoping them is the producer's call (§8 item 3).
3. **Did not run a third "port squatter" (EADDRINUSE) variant.** Its master-side path is
   `!response.ok` → identical cadence to run 1 (`Master.ts:528-530`); trace-only was sufficient
   and it risked a fake "dead worker" (memory note). Stated in §2.1 rather than observed.
4. **Kept 18/20 as the recommendation** rather than proposing a tighter quorum: the measured
   dead-shape residual is rarely and briefly player-visible (corrected in review round 1 — see
   below) and the bad shape is quorum-independent. Owner's call;
   §5 and §8 item 1.
5. **Did not edit the `0056` brief** despite the stale "not pushed" claim — the brief for 0057 says
   relay, not edit; recorded in §1 and §8 item 6 for the producer.
6. **Scratchpad artefacts were not copied into the repo** — the report reproduces the load-bearing
   log excerpts verbatim; raw logs contain local PIDs and nothing else of value, and the Appendix
   lets anyone regenerate them.

## Review round 1 (2026-08-26) — applied per owner ruling "fix all three in one wording pass"

Ledger: `review.md` in this folder. Verdict was "changes requested": 1 defect (R1) + 2 nits (R2, R3),
none blocking, no rulings re-litigated. Each verified against `dev` (`282655c`) before editing.

- **R1 (defect, document accuracy) — accepted.** `Master.ts:200-202` serves `publicLobbiesJsonStr`
  as-is; a miss tick rewrites it to `lobbies: []` (`:500-502`); `nginx.conf:108` caches any 200 for
  1 s. So a client poll inside the ~100 ms miss window pins an empty body for all clients for up to
  1 s, and misses chain (my run 1: 2/90 samples empty; reviewer rerun: 6 consecutive ≈ 600 ms).
  Report §0, §2.4, §5 and §8 item 1 reworded from "not visible / players see nothing /
  player-invisible" to "rarely visible (≈ 1 blink/hour at 100 games/hour), brief (≤ 1 s)". The
  18/20 recommendation is unchanged.
- **R2 (nit) — accepted.** "A new lobby only every ~5 s" was the 2-worker dev cadence. §0 and §5 now
  say: ~5 s replacement delay only on draws that land on the wedged index (p = 1/20 per draw at 20
  workers); per-stuck-ID costs (50 lines, flapping, orphans, 429s) are worker-count-independent.
- **R3 (nit) — accepted.** `Worker.ts:110-115` → `:109-114` (three places); "five more call sites" →
  "eight more lines in four files" (§0; §3 list was already correct); bound-but-wrong-listener path
  in §2.1 now carries "(reasoned, not observed)"; Appendix heading and this worklog now say "loopback
  literals only" instead of "no hosts/IPs".
- **ADR-109 consistency check (read-only):** consistent in direction and in every number. Two
  wording drifts inherited from my pre-review report text: "player-invisible" (Context, dead-index
  bullet; Consequences, quorum bullet) and "five more call sites" (Context, client bullet) / "all six
  client call sites" (option (i)). Neither changes the decision or its "re-raise only if" field. Not
  edited by me — reported to the lead for the ADR's author.

No code, incident record, or wiki touched in this pass; nothing committed.

## Not done (by design)

- No code changes, no test changes, no ADR (the recommendation is not yet an owner decision —
  §8 item 2 is where it becomes one; if approved, record it with `fkit-record-decision`).
- No wiki writes; if the owner wants §2–§3 in the wiki, `fkit-wiki` should ingest the report.
- No task status or board changes; no commits.
