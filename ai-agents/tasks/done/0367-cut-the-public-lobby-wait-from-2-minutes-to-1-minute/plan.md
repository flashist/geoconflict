# Approved plan — 0367

> **Provenance (written by `fkit-lead`, `fkit-sprint-ship-loop`, 2026-10-02).** Approved by the owner via
> `AskUserQuestion` in the live `fkit lead` session on 2026-10-02 (answer: *"Approve (Recommended)"*).
> ⚠️ **Honest note:** the owner was shown a plain-language rendering of this plan in the session, not these
> exact bytes. The text below the line is the plan the spawned `fkit-coder` returned, **transcribed by
> `fkit-lead` from that worker's message — not a byte copy** (some wording lightly condensed; every file:line,
> change, test, risk and scope item kept). Both the owner-facing rendering and this file derive from that same
> return. This is the `carried-not-approved` residual the skill names — approval leaves no artifact (ADR-021).
>
> **Owner rulings on the plan's open questions (same `AskUserQuestion`, 2026-10-02):**
> - **Q1 (baseline timing):** *"Read now + re-run on deploy day (Recommended)"* — read what can be read now for
>   the worklog AND record the exact query in the worklog so it is re-run on deploy day for the exact
>   7-days-before-deploy window.
> - **Q2 (verify task, not this build):** *"Read on day 7 + snapshot day 4 (Recommended)"* — the verify task
>   reads the "after" lone-player number on day 7 exactly plus a mid-test snapshot on day 4; Uptrace retention
>   is NOT changed. (For the producer filing the verify task at close.)

---

# Plan — 0367: cut the public lobby wait from 2 minutes to 1 minute

**Summary**
- The build is one number: `DefaultConfig.ts:247-249`, `120 * 1000` → `60 * 1000`. Prod and preprod both inherit it; Dev keeps its own 5 s override.
- Every consumer still reads this one method and nothing in client or server hardcodes 120 s (re-checked), so no other source changes.
- One new test file pins the value (prod/preprod 60 s, dev 5 s) and drives a real prod-config `GameServer` lobby on fake time: countdown, AI fill, Lobby→Active at 60 s, empty-game cleanup at 90 s.
- Docs: `architecture.md:368`, plus a one-line dated note on ADR-107 (its "is still 120 * 1000" is present-tense and would become false).
- ⚠️ Biggest risk is the baseline, not the code: Uptrace server logs are kept **7 days** (`setup-telemetry.sh:83`, default `UPTRACE_RETENTION_DAYS=7`), so the lone-player "before" number must be read close to the deploy or it is gone for good — and this constrains the later verify task (see open questions).

## 1. Facts re-checked in the code (2026-10-02)
- `gameCreationRate()` is defined only in `DefaultConfig.ts:247-249` (120 000) and `DevConfig.ts:21-23` (5 000). `ProdConfig.ts` and `PreprodConfig.ts` do not override it → both get 120 s today. `ConfigLoader.ts` `getServerConfig`: "prod"→`prodConfig`, "staging"→`preprodConfig`, "dev"→`DevServerConfig`.
- All consumers are in `src/server/GameServer.ts` and none change: `:493` lobby `startTime()`; `:594` AI ramp length (prod sets no `timeoutSec`, so the ramp is the whole window); `:1019` lobby lifetime (strict `<`); `:1029` empty-game cleanup at window+30 s; `:1064` `msUntilStart` — an absolute timestamp (`createdAt + window`), which `Master.ts:523` turns into time remaining and `Master.ts:529-531` drops from the list at ≤250 ms.
- Client: `PublicLobby.ts:99-100` counts down from whatever the server sends. The 15 s join-ad threshold (`FlashistFacade.ts:316`, used at `PublicLobby.ts:335`) is untouched, per owner ruling Q3+Q4.
- No hardcoded 120 / 120_000 in `PublicLobby.ts`, `Master.ts`, `MapPlaylist.ts`, `GameManager.ts`, `Worker.ts` (grepped).
- Not simulation (server wall-clock), so no desync / determinism impact.
- Wiki: `wiki-vault/wiki/systems/architecture-overview.md:55` says 120,000 ms — **not edited by me**; `fkit-wiki` updates it after close.

## 2. Changes (in order)
1. **`src/core/configuration/DefaultConfig.ts:247-249`** — `return 120 * 1000;` → `return 60 * 1000;`, with a one-line `// Flashist Adaptation` comment (public lobby window halved — 1-minute test, task 0367; revert = back to 120 s), per the fork's divergence convention. No other source change; no env var, no switch (owner ruling Q3); nothing new for `check:config-parity`.
2. **New test `tests/server/PublicLobbyWindow.test.ts`** (beside `ProfileApiUrlConfig.test.ts`, copying its `jose` mock; reuses the GameServer construction pattern from `PrivateLobbyStartGate.test.ts` — stub logger, stub `ProfileApiClient`). No new test infrastructure.
   - **(a) Value pins:** `prodConfig.gameCreationRate()` = 60 000; `preprodConfig.gameCreationRate()` = 60 000; `new DevServerConfig().gameCreationRate()` = 5 000; and the same three via `getServerConfig("prod" | "staging" | "dev")` so a future override in one env file cannot slip past.
   - **(b) Prod-like lobby behaviour** (brief verification step 3, without a live server): `jest.useFakeTimers()`, `setSystemTime(T0)`, `new GameServer(id, logger, T0, prodConfig, <public GameConfig, maxPlayers e.g. 50>, stub)` — the **real** `prodConfig` (AI on), so the constructor's AI interval runs on fake time. Assert: `gameInfo().msUntilStart === T0 + 60_000` (→ ~60 000 ms remaining via `Master.ts:523`); advance 30 s → `aiPlayersCount > 0` and `phase()` still `Lobby`; at T0+59 999 → still `Lobby`, AI present; at T0+60 000 → `Active` (strict `<` at `:1019` — I'll assert exactly that boundary); at T0+90 001 with no humans → `Finished` (window+30 s cleanup). `afterEach`: `jest.useRealTimers()` so the fake interval is discarded and nothing leaks.
   - **(c)** Not editing `tests/util/TestServerConfig.ts` (throws on `gameCreationRate` — unrelated) and `Master.test.ts:110`'s `60_000` is its own fixture, untouched.
3. **`ai-agents/knowledge-base/architecture.md:368`** — 120,000 ms → **60,000 ms**, with a short dated note (task 0367, 2026-10; was 120,000 ms), and fix the stale line citation (`:244-246` → `:247-249`).
4. **`ai-agents/knowledge-base/decisions/adr-107-…md:124-126`** — leave the sentence; add one dated line under it: "2026-10-02 (task 0367): the lobby window was later cut to 60 s independently; the sentence above is true as of ADR-107's date." Reason: "is still `120 * 1000`" reads as a current fact — within the brief's "only if the plan judges it misleading".
5. **Not touched:** `geoconflict-producer-knowledge-base.md:419,549` mention a "2-minute wait window" inside a historical AI-players spec / bug write-up — not a current-value statement; flagged, left. No announcement text (brief item 5).

## 3. Verification
1. `npm test -- tests/server/PublicLobbyWindow.test.ts` green.
2. Full `npm test` green (includes the shell harnesses — slow, expected), `npm run lint` and `npx tsc --noEmit` clean. On a supertest failure: check the known-flake signature from CLAUDE.md, re-run, and say I re-ran — never a retry hack.
3. Prod-like behaviour check = test 2(b) (real `prodConfig`, real `GameServer`); the worklog records how it was run. I am **not** booting a local `GAME_ENV=prod` server — it needs prod-only runtime config (JWT, profile URL, etc.) I should not stand up locally; the brief allows the test route.
4. Docs: `architecture.md` no longer states 120,000 ms as current.
5. Baseline in the worklog — read-only, owner-ruled numbers first:
   - **Multiplayer matches per day:** GameAnalytics `Game:Mode:Multiplayer`, last 7 days. Caveat: it fires once per client per match, not once per match, and includes private lobbies — so it is "multiplayer match entries per day", a proxy; I will label it that way, not pass it off as matches. I have no GameAnalytics access → the worklog gives the owner the exact dashboard filter to read.
   - **Share of public matches with exactly one real player:** server `"sending start message"` log (`GameServer.ts:570`) — written once per real player at match start, carries `gameID` via the child logger at `:143`. Group by `gameID`; lone-player share = games with exactly 1 line / all games. Caveats: no public/private flag on the line, so private games are mixed in (few now — 0302 limits private to citizens); AI-only games log nothing; whether these info lines actually reach Uptrace is **unconfirmed**. Read-only over SSH to the telemetry box (ClickHouse query inside the Uptrace container), per the run-it-don't-hand-it-over rule; the box is known unreachable under a full-tunnel VPN — if I can't reach it, the worklog gives the exact query for the owner. No fabricated stand-in.
   - Context numbers if readable: `UI:ClickMultiplayer` → `Game:Mode:Multiplayer` conversion, `Match:Spawned` timing, join-interstitial count/day. Any not read are marked "not read" with the reason.

## 4. Risks and edge cases
- **Baseline expiry (real).** 7-day retention. A baseline read today (Fri 2026-10-02) covers ~Sep 25–Oct 1; the ruled window is "the 7 days before the deploy" (Sat/Sun 10-03/04), so it is off by 1–2 days unless read on deploy day. If no one reads it before ~Oct 9, the "before" lone-player number is unrecoverable. The verify task has the mirror problem: day 1 of the "after" window expires on ~day 8, so the after-number must be read on day 7 exactly, or snapshotted daily. Affects the verify task's design, not this build — raised as open question 1.
- **Slow devices get half the map-preload time before start.** Most plausible harm. Background preload / 0035 mitigate; nothing in this build changes it. A watch item for the verify task.
- **Join ads:** more joins land in the last 15 s (~1 in 4 instead of ~1 in 8) → fewer join ads; more matches/hour → more end-of-match ads. Watch only (Q4 ruling).
- **AI fill doubles in speed:** same 10-AI target, reached at 60 s; each join still gated by 300–2000 ms jitter and the 500 ms tick → ~1 AI per 6 s, no burst problem.
- **Dev unaffected** (5 s override kept, pinned by the test).
- **Client bundle:** `DefaultServerConfig` also ships to the client, but the client never calls `gameCreationRate()` → no client/server mismatch risk (unlike `numWorkers`).
- **Deploy:** game-server deploy, weekend slot; committed ≠ deployed; I do not commit unless asked. **Revert** = the same one-line change back to `120 * 1000` (+ flip the new test's 60 000).
- **Fake-timer test pitfall:** `GameServer`'s constructor starts a `setInterval` when AI is on — fake timers must be installed before construction and restored in `afterEach`, or the suite leaks a handle ("Jest did not exit"). Handled in 2(b).

## 5. Out of scope (per owner rulings)
No separate AI timeout; no change to the 15 s join-ad rule; no runtime switch / env setting; no wiki edits; no announcement; the verify task is filed by the producer at close (2026-09-29 build/verify split rule), not by me.
