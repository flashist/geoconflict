# Plan — 0057 Investigation: public-game routing to a dead or unready worker

**Approval record.** Plan produced by a spawned `fkit-architect` (plan-only) on 2026-08-26 and
**approved by the owner via `AskUserQuestion` in the `fkit lead` session the same day**, driver
`fkit-sprint-ship-loop`. The text under "Investigation plan — 0057" is the architect's return, copied
verbatim by the driver at approval. Owner rulings folded in at approval:

- **Outage-track hold lifted for 0057 only** (2026-08-26). The brief's "🚨 Do not start yet" (2026-08-23)
  no longer applies to this task; `0056` stays held until the owner reviews these findings.
- **§7 scope:** public scheduling **plus a bounded §7** on the client-side surfaces of the same hash
  (private lobbies, WS reconnect) — no options costed for them.
- **Q5 live Uptrace query:** the owner will run it **if** master logs reach OTEL at all; the architect
  traces that first and returns exact search strings. If master logs never leave stdout, Q5 is marked
  undeterminable, catalogue-only.
- **Local reproduction:** approved — boot the dev server, kill / SIGSTOP a worker. Dev-only; ports
  3001/3002 must be free.

---

## Investigation plan — 0057

### Corrections to the brief's citations (carry into the report)
- The hash line is `workerIndex()` at `src/core/configuration/DefaultConfig.ts:296-298`; `schedulePublicGame` is `src/server/Master.ts:508-535` and reaches it via `workerPort()` (`:517`) / `workerPath()` (`:512`).
- The gate is now `Master.ts:119` (was `:110`); exit handler `:142-173`. `0055` moved lines.
- `0056`'s brief says `0055` is "not pushed, not deployed". `git log` shows PR #133 (`7410bfb`) merged `fix/0055-...` into `dev`, and `dev`'s `Master.ts:87` carries the `0055` body fix. Pushed: yes. Deployed to prod: **unknown** (not checked this turn). Stale claim in `0056`'s brief — relay to producer, do not edit.

### Q1 — What actually happens (trace + local reproduction)
**Trace, master side** (`Master.ts`):
- `:509-510` `generateID()` then `publicLobbyIDs.add(gameID)` **before** the create call — the set is populated even if create fails.
- `:516-530` `fetch` to `localhost:<port>` (`DefaultConfig.ts:305-307`, `3001+index`) with **no timeout**; dead/unbound port → `ECONNREFUSED`; `!response.ok` → throw. Catch `:531-534` logs `Failed to schedule public game on worker w<N>` and rethrows → `:123-125` logs `Error scheduling public game`. **Nothing removes the ID.**
- Next 100 ms tick `:128-136`: `fetchLobbies()` `:436-456` hits `/api/game/<id>` on the same dead port, 5 s abort guard `:438`, catch `:448-453` logs `Error fetching game` **and deletes the ID**; result filtered `:462`; JSON rewritten with `lobbies: []` `:500`; returns `0` → `scheduleLobbies()` again with a **fresh random ID** → new hash.
- Need to confirm: `fetchLobbies` runs on every tick regardless of whether the previous one finished (no in-flight guard visible) — whether overlapping ticks can double-schedule while a slow (5 s timeout, not `ECONNREFUSED`) failure is pending. This is the "half-succeed / orphan" candidate: `unready` ≠ `dead`; a port that is bound but hangs behaves differently from one that refuses.
- Worker-side double-check `Worker.ts:148-155` (`workerIndex` mismatch → 400) and `:341-347` (WS join mismatch → silently returns, socket left open) — relevant to any approach that moves games off the hash index.

**Trace, player side:** `PublicLobby.ts:138-142` polls `/api/public_lobbies` every 1 s (`:68-71`); a failed schedule shows as *no lobby card* for the retry window. If create succeeded and the worker dies later: `fetchLobbies` drops the lobby on the next tick; joined players' sockets close → `Transport.ts:361-374` non-1000 close → `reconnect()` → `connectRemote` `:309-320` recomputes the same `workerPath` → nginx `/w<N>/` upstream (`nginx.conf:3-42`) is dead → reconnect loop; `ClientGameRunner.ts:213-221` / `:1031-1034` govern what the player sees. Also `Main.ts:666+` `handleJoinLobby`. I will name the exact modal/text per path.

**Reproduction (dev, no prod access):** `DevConfig.numWorkers()=2` (`DevConfig.ts:40`) → hash hits each index ~50%. Boot `npm run start:server-dev`, `kill` worker 1's PID (crash recovery is disarmed, so it stays dead), watch master log for the retry cadence, error-line count per successful schedule, and `/api/public_lobbies` body over time. Second run: SIGSTOP (not kill) the worker to get the *hung-port* variant and observe the 5 s-timeout path. Evidence form: log excerpts + timings. Caveat: dev has no nginx; client-side 502 behaviour must be reasoned from `nginx.conf`, not observed — flagged in the report.

**Preliminary read, to be verified, not a finding:** the scheduling case looks self-healing (fresh random ID per retry, ~100-200 ms per miss, 2 error lines per miss); the worse cases are (a) the hung-port variant and (b) surfaces that compute the worker path client-side (below).

### Q2 — What deterministic hashing buys us (trace)
- **Client computes the same index with no server round-trip**: `Transport.ts:317-320` (WS URL), `HostLobbyModal.ts:736-871` (private create/start/poll), `JoinPrivateLobbyModal.ts:204,307`, `Matchmaking.ts:110`, `LocalServer.ts:303`. The client-side `numWorkers()` is compile-time per env config (`Prod/Dev/PreprodConfig.ts`) — grep shows no runtime source. So placement is a **shared contract** across client, master, worker (`Worker.ts:149,341`) and nginx (`nginx.conf:3-42`, path→port map).
- No shared registry: master keeps only `publicLobbyIDs` (`Master.ts:89`); no game→worker table anywhere. `Worker.ts:545-556` already rejection-samples IDs to land on a given worker — proof the codebase treats the hash as a fixed contract and moves the *ID*, not the *index*.
- `git log -S` shows the line unchanged since `feea527` (upstream inheritance, no local "why") — will state that; wiki `architecture-overview.md:53` records "sharding, not load balancing".
- Load balance / locality claims: hash quality of `simpleHash` (`Util.ts:64-72`) over 8-char IDs at `% 20` — quick offline distribution count, not a claim from memory.

### Q3 — Candidates to cost (5, not 4)
Dimensions per option: client change needed? nginx change? breaks the client-side contract? worker-side mismatch checks (`Worker.ts:149,341`)? behaviour when the dead index later restarts (0056) — orphaned/duplicate placement? test surface (`tests/server/Master.test.ts` exists, 3 tests).
1. (i) Modulus over the ready set — **breaks the client contract** unless lobby info carries the worker path; costliest.
2. (ii) Retry on another worker — as written, needs a new ID (index is a function of ID); effectively what the 100 ms loop already does. Cost = making it explicit + bounded.
3. (iii) Hold scheduling for an unready index — conflicts with 0056's purpose (would re-stall on a permanently capped index).
4. (iv) Leave it + alarm — cost = the error-line noise + hung-port variant; needs the alarm's log family to reach Uptrace (unproven, `0056` Step 3a).
5. **(v) Rejection-sample the game ID onto a ready index at `Master.ts:509`** — the `Worker.ts:545` pattern; master-only, contract intact, zero client/nginx change. Needs the ready set to be *maintained* (today `readyWorkers` never shrinks — `0056` Step 1 adds `markDead`). Likely recommendation; main tradeoff: couples routing to `0056`'s readiness unit, and public games become unroutable to a capped index (fine) while private games stay exposed (not fixed by any master-only option).

### Q4 — Residual at 18/20
Quantify from Q1's measured cost-per-miss: expected extra attempts at 2/20 dead = 0.1/(0.9) ≈ 0.11 per schedule; time and log volume per miss; the hung-port case separately. Then a plain statement whether the findings support 18/20 — my recommendation, the owner's call.

### Q5 — Ever bit us in prod
**Catalogue check (no live access):** `ai-agents/knowledge-base/telemetry-error-priorities-2026-05-07.md` (families 1-6 are all client/worker; family 4 is *client* lobby-fetch aborts, `lobby-map-fetch-investigation-2026-06-03.md` §2), `uptrace-knowledge-base.md` §2a/§2d, `telemetry-server-incident-history-2026-06-03.md`, `monitoring-alert-bot-findings-2026-06-04.md` §2, wiki `systems/telemetry.md:86-96`. Expected result: master-side families (`Failed to schedule public game`, `Error scheduling public game`, `Error fetching game`, `comp: "m"`) were **never catalogued** — absence of evidence, and I will say so.
**Live query — owner must run** (I have no Uptrace access; VPN caveat in memory): log search over max retention for those three message prefixes with `comp = "m"`, grouped by day; plus `worker crashed could not find id` count (any pre-0822 crash = a period when these signatures *should* appear). Also check whether the master process even ships logs to OTEL (`Logger.ts` transport vs `Worker.ts:69-72` which only inits metrics/tracing in workers) — trace first; if master logs never leave stdout, the live query is moot and Q5 answer is "undeterminable, retention 150 MB".

### Report
`ai-agents/knowledge-base/reports/2026-08-26-0057-worker-routing-dead-worker-findings.md`
Outline: 0 Summary + recommendation + tradeoff · 1 Corrections to cited lines · 2 Q1 trace (master, worker, nginx, client) + reproduction log · 3 Q2 what the hash buys · 4 Q3 option table (5 rows × dimensions) · 5 Q4 residual at 18/20 + recommendation on the ruling · 6 Q5 catalogue result + live-query script for owner · 7 Adjacent surfaces outside the brief (private lobbies, reconnect) · 8 Decisions for the owner · 9 Open questions · Appendix: repro commands, no IPs/endpoints.

### "Reviewed with the owner"
Final message to lead = §0 + §5 + §8 verbatim; lead relays; owner answers the decision blocks; `0056` unblocks only on that answer. If outcome is "implement (v)" → producer writes a new brief (I do not).

## Risks
- Dev repro is 2 workers without nginx — the client-facing 502/WS path cannot be observed locally; reasoned only. Port 3001 squatters (Remotion) can fake a "dead worker" (memory note).
- Hung-port variant may not reproduce cleanly with SIGSTOP (OS keeps the socket accepting); if not, that path stays trace-only.
- Master log → Uptrace path unproven either way; Q5 may end as "not determinable".
- `0056` brief carries a stale "0055 not pushed" claim; if it is also not *deployed*, prod's exit handler is the old one — affects nothing in 0057 but the producer should know.
- Scope creep: private-lobby/reconnect surfaces use the same function; I plan one bounded section, not a second investigation.

## Decisions raised at plan time (all ruled at approval — see the approval record above)
- §7 scope → public + bounded §7.
- Q5 live query → owner runs it if master logs reach OTEL; else catalogue-only, undeterminable.
- Local reproduction → yes.
