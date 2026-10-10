# Join Token — the Game Server Has the Profile Server Vouch for a Player's Verified Session (task 0332)

**Source**: `ai-agents/tasks/done/0332-join-token-game-server-has-the-profile-server-vouch-for-a-verified-session/brief.md` (supporting: the same folder's `worklog.md` and `review.md`; design report `ai-agents/knowledge-base/reports/2026-10-07-0332-join-token-design.md`)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 7, rank 9 (append rank, not a merit rank) / task `0332`

> 🆕 **2026-10-10 sync — VERIFIED LIVE: `0405` closed** ([[tasks/join-token-identity-vouch-live]]),
> `(agent-closed — not owner-verified)`. Over ~49 h: `verified` on 94.75 % of 14,266 resolves, every warning outcome 0;
> match-start verified share 95.3 % vs login 97.55 % — ADR-124 **trigger 2 recorded as NOT hit**, by owner ruling;
> **0 token hits in ~3.0M log lines**. Coverage limits: no host nginx logs, no weekend evening. Also: the `verified` key
> this task added to the resolve reply had left two exact-match integration tests stale — fixed by `0431`
> ([[tasks/routes-it-test-verified-field]]).

> 🆕 **2026-10-08 sync — DEPLOYED, NOT YET VERIFIED.** Both sides rode along with `0250` S3b: the profile side in
> **`0.0.156-profile.4`** (06:41:41Z), the game side in **`0.0.157`** (06:56:17Z) — profile first, as required (`0396`'s
> delta check named it as expected, nothing unexpected; [[tasks/authenticated-profile-read-live]]). Early watch only:
> the `resolve_vouch` counter read `verified` 43 · `absent` 84 · no rejected outcome; credits flowed. Its own verify-live
> task `0405` is still open. The *"NOT DEPLOYED"* note below was true when written.
>
> ✅ Done (agent-closed — not owner-verified), closed **2026-10-07** by a spawned `fkit-producer`, routed by
> `fkit-lead` driving `/fkit-sprint-ship-loop`, on an **owner ruling given live via `AskUserQuestion`**: *"Close it
> (Recommended)"* — *"A producer closes 0332 and files the 'verify it live' task for after the deploy. The high
> flaky-test rate gets noted in the close."*
>
> 🚨 **NOT DEPLOYED.** Deploy is owner-run in a weekend slot: **profile server first, then the game image**. Verify-live
> task: `0405` ([[decisions/sprint-8]], rank 15).
>
> 🔧 **"Not committed" in the brief and board is stale against the repo:** the build's source and tests are in commit
> `077c9e3` ("Sprint push", 2026-10-07 15:48 +0300), checked by `git show --stat` this sync. That commit is in **no
> release tag**, so it is committed, **not deployed**. Sources not changed.
>
> ⚠️ **Verify was NOT clean** — see *Outcome*.

## Goal

The game server decides who a player is from the Yandex id the client **says** is its own (ADR-103 —
[[decisions/adr-103-identity-trust-seam]]). Since `0340` the **profile** server can prove who a player is at login
(`vfy:true`, [[decisions/adr-116-verified-login]]), but the game server never saw that session. This task is the
missing second step: the client sends its session token, the profile server vouches for it, and the game server knows
whether the Yandex id is **verified**.

Two phases: **phase 1, design** (`fkit-architect`) — report + ADR, owner rules the open questions; **phase 2, build**
(`fkit-coder`).

## Key Changes

### Phase 1 — design and owner rulings (2026-10-07)

- Design report written; [[decisions/adr-124-join-token]] drafted and **accepted** the same day.
- **Owner rulings Q1–Q8** (verbatim, live `AskUserQuestion`, relayed by `fkit-lead`):

  | # | Question | Answer | Recommended? |
  |---|---|---|---|
  | Q1 | Measure first, or switch on at once? | FREE TEXT: *"No, we're not spending another weekend slot for counting only, but we can add some metrics to the code and check them after."* | — |
  | Q2 | XP for unverified players | *"Keep XP (Recommended)"* | yes |
  | Q3 | ★ badge for unverified citizens | *"Keep the ★ (Recommended)"* | yes |
  | Q4 | Private lobby for unverified citizens | *"Keep it open (Recommended)"* | yes |
  | Q5 | Approved name only when verified? | *"Keep for unconfirmed"* | **no** — the design recommended *verified only* |
  | Q6 | How the game server asks | *"Reuse login pass (Recommended)"* | yes |
  | Q7 | Profile server cannot answer | *"Treat as unconfirmed (Recommended)"* | yes |
  | Q8 | Sign off ADR-124 | *"Accept with answers (Recommended)"* | yes |

- **Consequence: one slice, no player-visible change.** Every perk stays open to unverified players, so the design's
  enforcement slice B was **not filed**. `0267`'s "game-server path" scope was narrowed to this task by a dated note.
- The phase-1 premise *"`0325` is blocked on an owner-run test"* was stale — verified sessions have been live since
  2026-10-07 ([[tasks/verified-login-enforce-live]]).

### Phase 2 — build (slice A)

Per the approved `plan.md` and ADR-124 (details there; this page does not restate them):
- **Client** (`src/client/ProfileSession.ts`, `src/client/Transport.ts`): sends its session token as an optional
  `profileSession` in the `join` when it holds one, else once in `update_identity` after a slow login
  (`maybeSendLateProfileSession`); open socket only, never buffered ahead of a join, none for local games.
- **Profile server**: new `src/profile-server/SessionVouch.ts`; the resolve route (`src/profile-server/Routes.ts`)
  checks the token after the find-or-create and replies an optional `verified`. Contract in
  `src/core/profile/CreditContract.ts`; message schemas in `src/core/Schemas.ts`.
- **Game server**: `Client.profileSession` / `Client.identityVerified` (`src/server/Client.ts`); the funnel
  `getCreditableIdentity` → `{ yandexId, verified }` (`src/server/GameServer.ts`); late-token chaining and reconnect
  carry; Worker builds the `Client` through exported `clientFromJoin` (`src/server/Worker.ts`).
- **Counters**: `geoconflict.profile.resolve.vouch{outcome}` and `geoconflict.server.match.identity{state}` — see
  [[systems/telemetry]].
- **Log-leak fix and hardening**: the pre-join message log in `Worker.ts` logs the message type only; the raw-message
  echo and raw catch-all logs were stopped (ADR-124 Decision 7).
- **No `IdentityPolicy.ts`** — architect's call, recorded in ADR-124 Decision 5 (every row is `allow`).

### Review — 2 rounds, `/fkit-stateful-review`

Coverage **reasoning-only second opinion** both rounds (Codex ran, found nothing, ran no tests).
- **R1** (no limit on tokens per socket; each queued another resolve — 50 tokens → 51 resolves in a probe) ✅ fixed
  per owner ruling *"Fix in this build"*: cap **`MAX_LATE_PROFILE_SESSIONS_PER_CLIENT` = 2** late tokens per `Client`,
  one warn line past it; at most one queued resolve, which reads the newest token.
- **R2** (a token past its 24 h TTL is still sent at join; the player then reads `expired` / unverified for that
  socket) — **accepted residual by owner ruling**; its exit is [[tasks/long-session-refresh-popup]] (`0404`).
- **R3** (no test for the line that puts a join's token on the `Client`) ✅ fixed via `clientFromJoin` + 3 tests,
  mutation-checked.
- **R4** (ADR-124 Decision 4 did not record the cap) ✅ fixed in docs — owner ruling *"Add ADR note (Recommended)"*;
  `fkit-architect` added the Decision 4 clarification and a re-raise line.

## Outcome

- **Built, committed (`077c9e3`), not deployed, not proved live.**
- ⚠️ **Verify NOT clean, recorded plainly by the close:** post-fix independent verify ran full `npm test` 3 times —
  **red 2 of 3**, a different `supertest` suite each time (`AlertRoutes` unexpected 404, `LoginRoutes` 5000 ms timeout,
  `TenureGrantRoutes` socket hang up); run 3 green, 4108 / 4108. Each failing suite 10 / 10 green alone; the new
  queue-logic suites 10 / 10; `0197` (`SIGSEGV`) ruled out; lint and `tsc` clean. Read as the known `supertest` flake
  family — **likely, not proven** ([[tasks/supertest-profile-server-flake]]). ⚠️ **The rate was above the ~4–7 %
  measured in `0200`**; an earlier side-by-side showed the old code failing at a similar rate.
- **Integration suite (`gc-0012-it-pg`) NOT run** — the container was down.
- 🚨 **Closes no forged-id risk.** By Q2–Q5 a forged id still earns XP for its victim, shows the ★, hosts a private
  lobby and shows a citizen's approved name; ADR-115 residual 1 and ADR-116 residual 7 stay open by owner ruling. The
  build supplies the `verified` bit and the counters a later ruling can use.
- **`0323` cancelled the same day** (owner: *"Cancel 0323 (Recommended)"*; players don't care about a confirmed-name
  mark, admins' need met by this task's counters) — see [[decisions/cancelled-tasks]]. The start-time counter is now
  the only planned reader of `verified`.
- **Follow-ups:** `0405` (verify live — read the two counters, confirm no token in the logs; [[decisions/sprint-8]]
  rank 15, append rank flagged), `0404` (R2's exit, done the same day), `0402` (non-blocking re-read of the login
  numbers — they no longer gate this deploy, [[decisions/adr-123-login-numbers-monitored-not-gate]]).

## Related

- [[decisions/adr-124-join-token]] — the ADR this task designed and built
- [[decisions/adr-103-identity-trust-seam]] — the funnel; design rule 2 superseded in part, XP decision stands
- [[decisions/adr-115-approved-name-in-matches]] — residual 1 stays open by Q5
- [[decisions/adr-116-verified-login]] — residual 7 stays open
- [[decisions/adr-113-internal-player-id]] — point 6 clarified (the game server relays the token, never holds the secret)
- [[decisions/adr-123-login-numbers-monitored-not-gate]] — the login numbers no longer gate this deploy
- [[tasks/long-session-refresh-popup]] — task `0404`, the exit for review finding R2
- [[tasks/verified-login-enforce]] — task `0340`, S3a — the hard dependency (the verified session this task sends)
- [[tasks/verified-login-enforce-live]] — task `0395`, `vfy: true` live — the deploy precondition, met
- [[tasks/verified-login-shadow-mode]] — task `0325`, which first named this second step
- [[tasks/approved-name-in-multiplayer-matches]] — task `0322`, the approved-name user of the funnel
- [[tasks/approved-name-in-matches-investigation]] — task `0317`, whose brief B3 became `0323`
- [[tasks/citizen-verified-icon]] — task `0068`, the ★ user of the funnel
- [[tasks/private-lobby-citizen-perk]] — task `0302`, the private-lobby user of the funnel
- [[tasks/session-verified-status-line]] — task `0397`: its *not confirmed* text is **not** reworded (no perk lost)
- [[tasks/authenticated-profile-read]] — task `0250`, whose design report §6 first named this step
- [[tasks/supertest-profile-server-flake]] — the flake family the red runs were read as
- [[decisions/cancelled-tasks]] — `0323`, cancelled 2026-10-07
- [[systems/telemetry]] — the two new counters
- [[systems/player-profile-store]] — the profile server's resolve route
- [[decisions/sprint-7]] — the board row (rank 9)
- [[decisions/sprint-8]] — verify task `0405`
- [[tasks/authenticated-profile-read-live]] — task `0396` (closed 2026-10-08): the deploy this task rode along in
- [[tasks/join-token-identity-vouch-live]] — task `0405`, the live read (closed 2026-10-10)
- [[tasks/routes-it-test-verified-field]] — task `0431`, the stale integration test this task's `verified` key broke
