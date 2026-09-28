# Worklog — 0322: game server shows a citizen's approved name in multiplayer matches

## 2026-09-28 — Build (fkit-coder, spawned by `fkit-sprint-ship-loop` / fkit-lead)

Declared-approval marker: caller `fkit-sprint-ship-loop`; approved plan `plan.md` (blob
`3691e5b46fd27cf229de55b93c1b45a49b5c609f`, 17726 bytes — re-hashed this turn with `git hash-object`,
matches); owner approved live via `AskUserQuestion` in the `fkit lead` session, 2026-09-28.

Scope of this step: plan work-order steps 1–8. **Step 9 (the ADR) is not the build worker's** — the lead
spawns `fkit-architect` for it after this build and before the stateful review.

### Owner rulings — verbatim, as relayed by fkit-lead (copied from the end of the approved plan)

- **Q1 (reword the name-approved inbox message now?):** "Keep the short message" — No change; still true,
  just doesn't say where the name shows. ⇒ **no lang change** in this task; the 0316 short wording stays.
  (Not the recommended option.)
- **Q2 (names approved before this ships were never filter-checked):** "Accept, note in the ADR
  (Recommended)" — No extra code; recorded as a known leftover.
- **Plan approval:** "Approve (Recommended)" — 2026-09-28.

Also from the brief (verbatim, already ruled before planning): D2 "(a) Server swaps it in (Recommended)";
D3 "Accept, record as ADR (Recommended)"; rude-name filter "Keep filter, warn me first (Recommended)";
D6 "Keep accepting, revisit in 0308 (Recommended)".

### Decision log

**Unattended fixes / obvious-winner calls (ADR-019 audit, ADR-032 A4): none.** This was a Build step; no
review findings were processed.

Build-time choices inside the plan (recorded so a wrong one can be found later):

1. **"Match has not started" = `_hasStarted`, not `hasStarted()`.** `hasStarted()` also counts prestart.
   The roster freezes in `start()`, so a resolve landing during prestart still applies — to the lobby poll
   and the roster alike, which stay consistent. Only a resolve after `start()` is ignored for the name.
2. **Wire schema has no length bound on `displayName`** (`z.string().nullable().optional().catch(undefined)`).
   The game server's join-rule check (3–27, charset) is the bound; a bound on the wire would only add a
   second, drifting copy of the rule.
3. **`wouldMatchFilterHideName` is exported from `NameChangeRepository.ts`** and used by both the
   per-request message and the digest list, so the "which check is the warning" decision lives in one named
   place. It is a one-line wrapper over the shared `isProfaneUsername`.
4. **The digest's import-cost note went into `NameChangeDigest.ts`**, next to the existing zod note (that is
   where the zod note actually lives), not into `sendNameChangeDigest.ts`, whose documented surface lists
   only its direct imports. The harness's forbidden-import check (`./Server` / `./Routes` / `./Telemetry`)
   is unaffected.
5. **`profanity.ts` proof is two-sided:** a static check that its only import is `obscenity`, and a runtime
   check that loads it with `src/client/Utils` mocked to throw.
6. **Runbook formatting accident, reverted.** Running Prettier over `name-change-digest-runbook.md`
   reformatted the whole file (it is not Prettier-clean at `HEAD`: `*em*` → `_em_`, padded tables),
   including other tasks' uncommitted text. Reverted by a script (tables back to compact form, `_em_` back
   to `*em*`), verified by a round trip (Prettier over the restored file equals the Prettier output) and by
   reading the remaining diff: only real content lines (0314's and this task's) differ from `HEAD`. No other
   task's wording changed.
7. **Smoke-tested the profile-server loader.** A throwaway entry (deleted after) imported
   `NameChangeRepository` + `NameChangeDigest` under `node --loader ts-node/esm
   --experimental-specifier-resolution=node` (the image's CMD flags) and got the right verdicts — so the
   new `obscenity` import loads the way the box runs it.

### Change surface

- `src/core/profile/CreditContract.ts` — optional `displayName` on `PlayerResolveResponseSchema`, with
  `.catch(undefined)`.
- `src/core/validations/profanity.ts` (new) — the obscenity matcher + `isProfaneUsername`, no client deps.
- `src/core/validations/username.ts` — imports and re-exports `isProfaneUsername`; keeps `fixProfaneUsername`.
- `src/profile-server/Routes.ts` — resolve reply carries `displayName: resolved.profile.display_name`.
- `src/server/Client.ts` — `approvedName: string | null = null`.
- `src/server/GameServer.ts` — same-id reconnect carry; after-start guard in `startProfileResolve`;
  `checkedApprovedName` (one warn, clientID only); `matchDisplayName` swap used by `start()` and `gameInfo()`.
- `src/profile-server/NameChangeRepository.ts` — `wouldMatchFilterHideName` + warning line.
- `src/profile-server/NameChangeDigest.ts` — `⚠️ rude-name filter` list suffix; import-cost note.
- `ai-agents/knowledge-base/name-change-digest-runbook.md` — section *The rude-name filter warning (task
  `0322`)* + one bullet in the list section.
- Tests: `tests/core/profile/CreditContract.test.ts`, `tests/core/Profanity.test.ts` (new),
  `tests/core/ApprovedNameInvariants.test.ts` (new), `tests/server/ApprovedNameInMatch.test.ts` (new),
  `tests/server/ProfileApiClient.test.ts`, `tests/profile-server/Routes.test.ts`,
  `tests/profile-server/NameChangeRepository.test.ts`, `tests/profile-server/NameChangeDigest.test.ts`,
  `tests/integration/Routes.it.test.ts`.
- **No lang change (Q1). No new setting. No client change.**

### Evidence (2026-09-28)

- Targeted suites: all green. Two mutation checks on `GameServer.ts` (drop the after-start guard; drop the
  swap-time re-check) each turned exactly one new test red; source restored after each.
- `npm test`: **168 suites, 2949 tests passed, exit 0**, first run — no supertest flake, no re-run needed.
- `npx tsc --noEmit`: clean.
- `npm run lint`: 1 error, the known untracked `0325` helper (`s0-hmac-check.mjs`, not in the project
  service) — not this task's, not fixed. Nothing else.
- `npm run check:config-parity -- --enforce --block-on=game,client`: exit 0, no required findings.
- `npm run check:config-parity -- --enforce --block-on=profile`: exit 0, no required findings.
- `npm run test:integration` (local test Postgres container up): **12 suites, 155 tests passed, exit 0**;
  the new test *resolve returns the approved display name, and null for a player with none* confirmed in a
  verbose re-run.

### Not verified

- Brief verification steps 4–5 (two browsers, local profile server with an approved name; a rule-failing
  approved name showing the typed name plus the log line in a live run) — **not done**: they need a local
  profile server with a seeded approved name and two interactive browsers. Covered only by the mocked
  server tests.
- Brief step 6 on a real Telegram delivery — not done; the message text is unit-tested.
- Step 7 (the ADR) — not this worker's; pending `fkit-architect`.

## 2026-09-28 — Process review, round 1 (fkit-coder, spawned by `fkit-sprint-ship-loop` / fkit-lead)

Declared-approval marker: caller `fkit-sprint-ship-loop`; approved plan `plan.md` (blob
`3691e5b46fd27cf229de55b93c1b45a49b5c609f` — re-hashed this turn with `git hash-object`, matches); owner
approved live via `AskUserQuestion` in the `fkit lead` session, 2026-09-28. Method:
`fkit-process-stateful-review` steps 0–7, per-fix owner gate replaced by the loop's standing approval.

### Decision log — unattended fixes (ADR-019 audit, ADR-032 A4)

1. **Finding R1 (review.md § Reviewer findings, "After `start()`, `gameInfo()` still derives names from the
   live `activeClients`").**
   - **Verified:** a post-start reconnect whose socket has a missing or different creditable id gets no
     carried `approvedName` (the same-id carry in `addClient`), and its fresh resolve is dropped for the name
     by the `!this._hasStarted` guard in `startProfileResolve`. `gameInfo()` then swaps on the live client →
     typed name, while the frozen roster holds the approved one. CORRECT. Severity low: `GET /api/game/:id`
     and the lobby poll only; no in-app reader after start.
   - **What changed:** `src/server/GameServer.ts` `gameInfo()` — after start (and only if `gameStartInfo` was
     set, i.e. `start()` did not fail its parse), a `clientID → username` map from the frozen roster is read
     first; `matchDisplayName` stays the fallback for a client the roster does not list (a post-start late
     joiner) and for everything before start. `matchDisplayName`'s doc comment gained one sentence saying so.
   - **Tests:** 3 new in `tests/server/ApprovedNameInMatch.test.ts` § *reconnect*: after-start reconnect with
     a different id and with a missing id → the poll shows the roster's approved name; an off-roster client
     after start → typed name. **Mutation-proven:** (M1) poll ignores the roster → exactly the 2 reconnect
     tests red; (M2) roster read with no fallback → exactly the off-roster test red. Source restored after
     each (byte-compared to a backup).
   - **Why it qualified:** verified CORRECT + mechanical/localized (one method, one file) + inside the
     approved plan (plan §3 "the lobby poll after start agrees with the frozen roster"; §4 one swap point).
   - **Side effect, stated so it is findable:** a post-start reconnect under a different *typed* name now also
     shows the roster's name in the poll (it showed the new typed name before). Same invariant, same
     direction; in-match screens always showed the roster name.
   - **Not changed (out of R1's scope):** `gameInfo()`'s `isCitizen` still reads the live client after start
     (pre-existing `0068` behaviour: the flag only ever turns true, so it can differ from the frozen roster in
     one direction). Not a 0322 hunk; noted, not touched.

Obvious-winner calls: **none.**

### ADR-115 drift (not edited — the ADR is the architect's)

The `gameInfo()` edit added 10 lines above the resolve/check/swap code (12 above `matchDisplayName`, whose
doc comment grew by 2). Citations to `src/server/GameServer.ts` in ADR-115 that no longer point at the right
line (old → current):

- funnel `:1340-1342` → `:1350-1352`; `:1341` → `:1351`
- resolve `.then` `:1403-1408` → `:1413-1418`; guard `:1403` (Decision 6) → `:1413`; id read `:1379` → `:1389`
- resolve range `:1377-1419` → `:1387-1429`
- `checkedApprovedName` `:1429-1445` → `:1439-1455`
- `matchDisplayName` `:1458-1464` → `:1470-1476`
- `gameInfo()` swap `:1046` (Decision 4) → `:1056`

Unmoved and still correct: `:280`, `:284-294`, `:433`, `:546`, `:558-561`.

**Substance:** Decision 6 ("Frozen at start") now reads truer than before — the poll after start agrees with
the roster even across a different-id reconnect. Decision 4 ("`matchDisplayName` used by `start()` and
`gameInfo()`") is still true but incomplete: after start `gameInfo()` reads the frozen roster first and uses
`matchDisplayName` only as a fallback. Worth one clause when the architect refreshes the citations.

### Evidence (2026-09-28)

- `tests/server/ApprovedNameInMatch.test.ts`: 23/23. Targeted set (that file + `CitizenFlag`,
  `ProfileApiClient`, `CreditContract`, `ApprovedNameInvariants`, `Profanity`): 6 suites, 120 tests, pass.
- `npm test`: **170 suites, 2969 tests passed, exit 0**, first run — no flake, no re-run.
- `npx tsc --noEmit`: exit 0.
- `eslint` + `prettier --check` on the two touched files: clean. (Full `npm run lint` not re-run this round.)
- `npm run test:integration`: not re-run — the change is game-server-only with no DB path.

Ledger: R1 `✅ done`; header `Status: closed-out`. No commit.
