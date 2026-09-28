**0322 — Game server shows a citizen's approved name in multiplayer matches: implementation plan**

Planning only. No source, tests or plan.md written, and no statuses changed. The plan reads the tree as it is now, including the uncommitted work from 0250 S1, 0302, 0314, 0315, 0321 and 0298.

### Summary
- **One new optional field** on the resolve reply the ★ badge already uses. There is no new request, no new trust path and **no new setting**, so the 0298 config-parity guard is not affected.
- **One swap point** in `GameServer.ts`, used by both the lobby list (`gameInfo()`) and the frozen match roster (`start()`). It reaches every multiplayer screen with **no client change**. Checked against the current tree (table in §4).
- **Moderator warning** is computed on the profile server. It appears in the per-request Telegram message **and** the digest list, plus a runbook section. It is shown to the operator only. The one real refactor is moving the rude-name matcher into its own module that has no client dependencies.
- **Two traps the plan guards against:**
  1. A malformed `displayName` must not break the resolve. If it did, the player would lose their XP credit and ★.
  2. A swapped name that fails the schema must never be able to stop `start()`.
- **The ADR (D3)** is written by `fkit-architect` after the code lands and before review, as the next free number (**ADR-115** today). It also adds a link in ADR-103.
- **Out of scope:** 0325 and the join-token second step, the 0323 mark, single-player (0321 covers it), and the 0308 character rules.

---

### 1. Contract (`src/core/profile/CreditContract.ts:74-79`) — core change
- Add `displayName` to `PlayerResolveResponseSchema`: an optional string or null, with a `.catch(undefined)` so a bad value is dropped instead of failing.
- **Why the catch matters:** `ProfileApiClient.resolvePlayer` (`src/server/ProfileApiClient.ts:117-123`) returns `null` for the **whole** resolve if parsing fails. Without the catch, one bad `displayName` would also drop `playerId` (so no XP credit) and `isCitizen` (so no ★). With it, a bad value is simply ignored.
- The three states are handled differently on purpose:
  - **absent** = an old profile server, so "unknown": keep whatever the game server already holds;
  - **`null`** = no approved name (never approved, or cleared by 0314), so clear it;
  - **a string** = a candidate name, which is re-checked before use.
- Both deploy orders are safe:
  - Old parser, new reply: the schema is a plain `z.object`, which drops unknown keys, so the reply still parses.
  - New parser, old reply: the field is optional, so the reply parses with `displayName` absent.

### 2. Profile server — resolve route (`src/profile-server/Routes.ts:744-768`)
- Add `displayName: resolved.profile.display_name` to the reply.
- No extra database query: `FIND_PLAYER_SQL` already selects `p.*` (`PlayerIdentityRepository.ts:86-90`), and `rowToProfile` already carries `display_name`.
- The name is returned whatever the citizen status. This matches the owner's 0321 Q1 ruling: "There is no way somebody loses their citizenship."
- This is an internal, service-authenticated route, so no player sees the reply. The existing error line logs no id, and no name will be logged either.

### 3. Game server — store, carry, ignore after start
**`src/server/Client.ts`:**
- Add `approvedName: string | null = null`.
- Mark it SERVER-SIDE and never logged.
- Note in its comment that it comes from the ADR-103 funnel, so it is only as trusted as that id.

**`src/server/GameServer.ts` `startProfileResolve` (`:1369-1401`):**
- Inside `.then`, after the existing `profilePlayerId` and `isCitizen` updates, apply the name only if the match has not started and the field is present.
- **"Ignored after start"** is the brief's rule. The citizen flag today is not guarded like this: it still writes, but the frozen roster hides that. The name is guarded so that the lobby poll after start agrees with the frozen roster.
- `profilePlayerId` and crediting behave exactly as today.
- **The rule-check at resolve time:**
  - Run the name through `JoinUsernameSchema` (`src/core/Schemas.ts:255-260`, which trims and applies the current name rule).
  - Store the trimmed result, or `null` if it fails.
  - On a failure, log **once** at `warn` with `clientID` only and **no name**: "approved name fails the current join rule; typed name used".
  - Log here, not in the swap, because `gameInfo()` is polled once a second and would otherwise spam the log.
- **Reconnect (`:277-289`):** carry `approvedName` across **only when the reconnecting socket presents the same creditable id**. This is the same condition as `profilePlayerId`, **not** the unconditional carry `isCitizen` uses. A name carried across a different identity would show someone else's name. The fresh resolve at `:319` then refreshes it if the match has not started.
- A late `update_identity` (`:424-436`) already calls `resolveProfileForClient`, so a player whose SDK recovers before the start gets the swap too.
- **The funnel is kept:** every read goes through `getCreditableYandexId` (`:1332`). Nothing new reads `client.yandexPlayerId`, as ADR-103's own "re-raise if" line requires.

### 4. The swap point — one helper, two callers
- Add a private `matchDisplayName(c: Client): string`. It returns `approvedName` if it passes `JoinUsernameSchema` again at the moment of the swap (a silent check, as the brief asks), otherwise `c.username`.
- `start()` `:539`: `username: this.matchDisplayName(c)`.
- `gameInfo()` `:1038`: `username: this.matchDisplayName(c)`.
- **Why `start()` cannot abort:** `PlayerSchema.username` is `UsernameSchema = SafeString` (`Schemas.ts:204-209, :235, :475`), and `start()` returns without starting if the roster fails its check (`:548-552`). Every name that passes `JoinUsernameSchema` also passes `SafeString`, because letters, digits, whitespace, `[`, `]` and `_` are all inside it. A test will pin this.
- `archiveGame()` `:1137, :1145` reads the frozen roster, so the archive and clan tag follow the swapped name. `archive()` is still a no-op (ADR-104).

**Where the name appears (file:line, current tree).** Every in-match screen reads `player.name()` or `displayName()` from the simulation. That value comes from `GameStartInfo` via `GameRunner.ts:49-57` and then `PlayerImpl.ts:118` (`sanitizeUsername`). Every lobby list reads `gameInfo()`.

| Surface | Read at | Covered by |
|---|---|---|
| Map labels | `NameLayer.ts:268, :380` | `start()` |
| Leaderboard ★ | `Leaderboard.ts:133, :169` | `start()` |
| Player panel ★ / chooser | `PlayerPanel.ts:440-442, :582-584` | `start()` |
| Hover overlay | `PlayerInfoOverlay.ts:312, :422` | `start()` |
| Events, alliances, trades, emoji | `EventsDisplay.ts:290-788` | `start()` |
| Chat | `ChatModal.ts:147, :216` | `start()` |
| Win screen | `WinModal.ts:465` | `start()` |
| Late joiner or reconnect | `sendStartGameMsg`, the frozen `gameStartInfo` (`:474-476`) | `start()` |
| Host lobby list ★ | `HostLobbyModal.ts:557, :566` | `gameInfo()` |
| Join-private list ★ | `JoinPrivateLobbyModal.ts:92` | `gameInfo()` |
| Lobby poll / create reply | `Worker.ts:342, :254` → `gameInfo()` | `gameInfo()` |
| Public lobby list | `Master.ts:517-524` strips `clients` (count only) | n/a |
| The player's own name | `ClientGameRunner.ts:1017` finds "me" by **clientID**, not by name | safe |
| Not covered (as designed) | single-player `LocalServer`, own win record `ClientGameRunner.ts:464`, feedback `Master.ts:229` | 0321 / out of scope |

Profanity for **other** players still runs on the swapped name: `GameRunner.ts:54`, then `fixProfaneUsername`. The filter stays, as ruled.

### 5. Moderator warning (rude-name filter)
**Move the matcher out:**
- Create `src/core/validations/profanity.ts` holding the obscenity `matcher` and `isProfaneUsername`.
- `username.ts` re-exports them and keeps `fixProfaneUsername`, which needs `simpleHash`.
- Why: the profile server cannot import `username.ts`, because that file imports client `Utils` (Lit components) and `core/Util`. `usernameRules.ts:3-14` records this same problem.
- `obscenity` 0.4.3 ships an ESM build (`exports.import → dist/index.mjs`). Checked that it loads under Node ESM, which is how the profile image runs ts-node.

**Computing it exactly as the match does:**
- The match checks `sanitize(name)` (`Util.ts:173`).
- For any name that passes the rule, `sanitize` changes nothing, because the rule's characters are a subset of what `sanitize` keeps.
- So the warning is `isProfaneUsername(trimmedRequestedName)`.
- A core test pins "`sanitize(x) === x` for names that pass the rule", so that if 0308 changes the cleaner, the drift shows up.

**Where it shows:**
- (a) **Per-request Telegram message:** `requestedNameLines` (`NameChangeRepository.ts:~798-810`) adds a line next to the existing hidden-characters warning: *"⚠️ The match's rude-name filter would hide this name: other players would see a stand-in name. Consider rejecting."*
- (b) **Digest list** (`NameChangeDigest.ts` `formatPendingNameChangeList`, next to `⚠️ hidden characters`): append `⚠️ rude-name filter`.
  - This is needed, not optional: the per-player 10-minute notification cooldown (`OPERATOR_NOTIFY_COOLDOWN_MS`) means **some requests never get their own message**, so the digest is the only place they would be flagged.
  - The existing 4000-character list budget accounts for the extra text.
- (c) **Runbook:** a short section in `name-change-digest-runbook.md` covering:
  - what the line means;
  - that it is **the English-word filter only**, so it will not catch Russian insults and the moderator's eye is still the real check;
  - what to do: reject with a reason, or use the 0314 clear command for a name that was already approved.

**How it avoids leaking (privacy):**
- A yes/no only. It never shows which word matched, and never shows the stand-in name.
- It goes to the operator's Telegram only. That message already carries the name and the internal player uuid (owner-accepted), so no new kind of data is added.
- It is **not** added to the player's request reply, so the request route cannot be used to probe the filter.
- No log line carries the name or the result.
- Cost: `sendNameChangeDigest.ts` will now also load `obscenity` through `NameChangeRepository`. That module is not in the file's documented must-not-import list (`./Server` / `./Routes` / `./Telemetry`), and the harness does not check it. The cost is a small memory increase on the low-RAM box. Noted in the file header next to the existing zod note.

### 6. ADR (D3) — `fkit-architect`, via `/fkit-record-decision`
**When:** after the code is written and tests are green, **before** the stateful review, so the reviewer also reviews the ADR and its file:line references are real. The driver spawns the architect, or the build worker consults it and states the hop count.

**What it records (existing rulings only, no new decisions):**
- The ruling, verbatim: D3 *"Accept, record as ADR (Recommended)"*. Also cited: D2, D6 and the filter ruling ("Keep filter, warn me first").
- **ADR-103 scope:** a third user of the funnel, after crediting/resolve and the 0302 lobby gate. Showing a player-chosen identity to other players is new. It works at ADR-103 trust level. When 0325 lands **plus the join-token second step** (not filed yet; see the 0250 design §6), the forged-id case closes with no change here.
- **Accepted risks:**
  1. Forged id: someone who sends a citizen's Yandex id gets that citizen's approved name. A forger and the victim in the same match both show it.
  2. Anyone can type a copy or a look-alike (D1, D6, to be revisited in 0308).
  3. Slow resolve: the match uses the typed name (as 0068 already accepted). The name is only as fresh as the last join.
  4. **Widens 0068 R3:** the unauthenticated `GET /api/game/:id` now carries a stable, unique name alongside the clientID. Public lobby ids are listed publicly, so anyone can watch who sits in which public lobby. This is the same exposure class as today's usernames, but now tied to one person.
  5. Names approved before this shipped were never checked by the filter (see Q2).
- **Edit to ADR-103:** add one line under "Related" or "Consequences" linking to the new ADR. This meets verification step 7.
- **Rules:** no ids, names, hosts or tokens anywhere in it.

### 7. Deploy order
- **Both orders are safe** (§1). **Recommended: profile server first** (`build-deploy-profile.sh`), then the game (`build-deploy.sh`), so the moderator warning and the field exist before the game servers start reading them.
- There are no client changes, so a player with an older cached build is unaffected. The client and game server ship in one image anyway.
- **No new setting is read, so nothing new needs passing through the deploy.** The existing `PROFILE_INTERNAL_TOKEN` and profile URL already used by resolve are enough.
- Deploying is the owner's step; nothing is committed or pushed without the owner's ask.

### 8. Tests
**Core (required, because `src/core` changes):**
- `tests/core/profile/CreditContract.test.ts`: `displayName` absent, `null` or a string parses; a number or object becomes `undefined` **while `playerId` and `isCitizen` still parse**; a copy of the old schema accepts the new reply.
- `profanity.ts` test: it gives the same verdicts as `username.ts`, and it imports **without** the client `Utils` mock that `Censor.test.ts` needs.
- `sanitize(x) === x` for sample names that pass the rule (Cyrillic, `[TAG]`, `_`, inner spaces).
- A `JoinUsernameSchema` pass implies `UsernameSchema` passes, on the same samples.

**Server (`tests/server/CitizenFlag.test.ts` harness, new `ApprovedNameInMatch.test.ts`):**
- The approved name appears on the start roster **and** the lobby poll.
- `null` or absent `displayName` → typed name.
- Re-check fallback: a stored name that is too long, too short, or contains `-` → typed name, with exactly one log line that has the clientID and no name.
- A resolve that finishes after `start()` → roster and poll keep the typed name, while `profilePlayerId` is still set.
- A hung or rejected resolve → join not delayed, typed name.
- Reconnect with the same id keeps the name; with a different or missing id it does not.
- A later resolve returning `null` clears the name (the 0314 clear).
- A late `update_identity` before the start → swap applies.
- `start()` never aborts.

**`ProfileApiClient.test.ts`:** a malformed `displayName` still returns `playerId`.

**Profile server:**
- `Routes.test.ts`: resolve returns `displayName` as a string or `null`.
- `NameChangeRepository.test.ts`: the warning line is there for a filter-matched name (a word from the English dataset, as `Censor.test.ts` already uses) and absent for a clean one. It never contains the matched term, and the existing size and HTML checks from 0312 still pass.
- `NameChangeDigest.test.ts`: the list suffix appears, and the budget still holds.

**Integration:** `tests/integration/Routes.it.test.ts` — resolve returns the approved name for a player who has one, and `null` for one who does not.

**Runs:**
- `npm test` (includes the shell harnesses). If the known supertest flake appears, re-run and say so.
- `npm run lint`.
- `npm run test:integration` needs local Docker and Postgres, which cannot be started headlessly. **If Docker is down, it will be reported as not run, never as passed.**
- Brief verification steps 4–5 (two browsers, local profile server plus an approved name) probably need the owner's help. If they are not done, they will be flagged as not verified.

### 9. Order of work
1. Contract, with its tests.
2. `profanity.ts` extraction, with its tests.
3. The resolve route.
4. `Client` and `GameServer`: store, carry, guard, swap.
5. Server tests.
6. Telegram warning and digest line.
7. Runbook.
8. Full test run.
9. ADR (architect).
10. Stateful review.

Estimate: about 1.5–2 days. It is easy to undo: remove one field and one helper.

### 10. Risks and edge cases carried
- **Clan tags:** a `[TAG]` in an approved name now drives clan grouping. This is deterministic because every client gets the same roster, and with 0321 the typed name already equals the approved one.
- **Two players under one name** (a forger, or a typed copy): allowed today, accepted under D3 and D6.
- **The filter checks English words only.** The warning says exactly what the match will do; it does not judge whether a name is rude.
- **0316 rewording:** optional per the owner's ruling. See Q1.

### Owner questions put with the plan
- **Q1** reword the name-approved inbox message now (Rec: en "Your new display name '{name}' has been approved. Other players will see it from your next match." / ru «Ваше новое имя «{name}» одобрено. Другие игроки увидят его со следующего матча.»), or keep the short message.
- **Q2** names approved before this ships were never filter-checked (Rec: accept and note in the ADR; alternative: a one-off read-only operator check, ~½ day).

## Owner rulings (2026-09-28, live via `AskUserQuestion` in the `fkit lead` session, relayed by fkit-lead) — record verbatim
- **Q1 (reword the name-approved inbox message now?):** "Keep the short message" — No change; still true, just doesn't say where the name shows. ⇒ **no lang change** in this task; the 0316 short wording stays. (Not the recommended option.)
- **Q2 (names approved before this ships were never filter-checked):** "Accept, note in the ADR (Recommended)" — No extra code; recorded as a known leftover.
- **Plan approval:** "Approve (Recommended)" — 2026-09-28.
