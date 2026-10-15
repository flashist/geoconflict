# Plan — 0350: name-change moderation without copy-and-paste (shape A1)

## Summary
- **What it is:** one new command on the profile box, `npm run -s name-change:review`. It walks through the waiting name requests one at a time, oldest first, and asks **approve / reject / skip / quit** for each.
- **No new decision path.** Every decision goes through the **existing** decide route, using the same code the `name-change:decide` command already uses. That code is split into small shared helpers (a mechanical refactor). The command does **not** start a second process.
- **`expectedName` stays.** The command reads the request from the database just before it shows it, and posts exactly that name as `expectedName`. If the name changed in between, the route still refuses it with `409 name_mismatch`.
- **Token:** read from the container's own environment, as `decideNameChange.ts:31` does today. It is never typed or printed. No new env var, no new route, no nginx or allowlist change, and no change to any Telegram message.
- **Out of scope (owner ruling 2026-09-29 Q3):** Telegram buttons or links (B), `approve <id>` (C), a laptop wrapper over SSH, and Claude's question popup (A2).
- **Out of scope (owner ruling 2026-10-15):** box deploy and the live check. They go in their own weekend profile deploy plus a separate verify task at the top of the next sprint. This task plans **no box steps**.

## How the owner uses it (target)
SSH to the profile box, then run (note: **no `-T`**, the command needs a terminal):
```
docker compose -f /opt/profile/docker-compose.yml exec profile-api npm run -s name-change:review
```
Per request it shows:
```
Request 1 · 4 waiting
Player:  <uuid>
Name:    «Иван_Петров»            ← Cyrillic shown as letters; hidden chars as ⟨U+00A0⟩
⚠️ hidden characters / ⚠️ rude-name filter would hide this name   (only when true)
Waiting: 2 d 5 h
[a] approve  [r] reject  [s] skip  [q] quit >
```
- **`a`** posts the approval at once and prints the existing result line (`HTTP 200: approved…`).
- **`r`** asks for the reason the player will read. An empty line goes back to the choice. The reason is checked by the existing rules (max 500 characters, not blank, not the placeholder) **before** anything is sent; if it fails, the command asks again.
- **`s`** skips: the request stays waiting and is not shown again in this run.
- **`q`** quits and prints a summary: approved N, rejected M, skipped K, and how many are still waiting.
- Any other input asks again and sends nothing.

## Files

### 1. `src/profile-server/NameChangeDecideCommand.ts`: mechanical refactor, behavior unchanged
- Extract the token checks at `:367-383` into an exported `checkInternalToken(token): string | null`. It returns the same refusal text as today, or null.
- Extract the POST and answer parsing at `:385-414` into an exported `postNameChangeDecision(request, { token, port, fetch, timeoutMs })`. It returns `{ kind: "answer", status, body }` or `{ kind: "no_answer", detail }`, where `detail` already passes through `describeNetworkError`, so the token is redacted.
- `runNameChangeDecide` (`:359`) keeps its signature, output and exit codes, and is rebuilt from those two helpers plus `parseDecideInput` (`:73`) and `describeDecideResponse` (`:183`).
- No new imports, so the static import-surface test at `tests/profile-server/NameChangeDecideCommand.test.ts:594-620` (no `./Logger`, no `./Db`) still holds.

### 2. `src/profile-server/NameChangeRepository.ts`: small refactor of the name display
- Split `describeRequestedNameForModerator` (`:782-797`) into:
  - a new exported `visibleRequestedName(name): { text, hasHiddenCharacters }`. It is the same loop over `PLAIN_NAME_CHARACTER` (`:763`) and `visibleCodePoint` (`:767`), with no HTML.
  - `describeRequestedNameForModerator`, which becomes `escapeTelegramHtml` over that result. Its output stays byte-identical.
- The terminal uses `visibleRequestedName`. Cyrillic (category `\p{L}`) is shown as letters, so the owner can read it. Every control, format, bidi, combining, invisible or newline character is shown as `⟨U+XXXX⟩`, so a name cannot move the cursor or fake a line in a root terminal.
- `wouldMatchFilterHideName` (`:816`) is reused for the rude-name warning.
- The paste lines (`decideCommandLines`, `:920-939`) are **unchanged**. The old way keeps working until the new one is proven, as the brief requires.

### 3. New `src/profile-server/NameChangeReviewCommand.ts`: pure logic, all dependencies injected
- **SQL constant `NEXT_PENDING_SQL`**, modelled on `PENDING_LIST_SQL` (`NameChangeDigest.ts:130-136`):
  ```sql
  SELECT id, player_id, new_display_name, changed_at, count(*) OVER ()::int AS total
  FROM player_name_history
  WHERE moderation_status = 'pending' AND NOT (id = ANY($1::bigint[]))
  ORDER BY changed_at, id
  LIMIT 1
  ```
  - Skips are tracked by the **history row id** (`bigserial`), not the player id. So if a skipped player withdraws and asks again, the new request does show.
  - There is no join to `players`, so no Yandex id can be selected.
- **`fetchNextPending(pool, excludedIds)`** runs that query. `pg` is imported as a type only, as the digest does (`NameChangeDigest.ts:33`).
- **`formatReviewCard(entry, waitingTotal, now)`** builds the card shown above, using `visibleRequestedName`, `wouldMatchFilterHideName` and `formatWaitingTime` (`NameChangeDigest.ts:213`).
- **`runNameChangeReview(options)`** takes: `isInteractive`, `token`, `port`, `fetch` (`DecideFetch`), `nextPending(excluded)`, `ask(prompt) → Promise<string | null>` (null means EOF or interrupt), `stop: { requested: boolean }`, `out`, `err`, `now`. It returns an exit code. The loop:
  1. Not interactive → `Refused: this command asks questions; run it with a terminal (docker compose exec, WITHOUT -T). Nothing was sent.`, exit 2. **Piped answers are refused on purpose:** a script typing `a` would approve names nobody read. Nothing is queried.
  2. `checkInternalToken`; on failure, exit 2. Nothing is queried or sent.
  3. Loop: `nextPending(skipped)`. If null, print `No requests waiting` (or the summary) and exit 0.
  4. Show the card, then ask. The name was read from the database moments before it is shown. The decision is built as `{ playerId, decision, expectedName: <exactly that DB string> }` and checked through `parseDecideInput` (so the binding and reason rules are the same code), then posted with `postNameChangeDecision`. The result line comes from `describeDecideResponse`, which is already terminal-safe.
  5. What happens next, by answer:
     - `200` → count it, continue.
     - `404 no_pending` (withdrawn, or decided elsewhere in the meantime) → print, continue.
     - `409 name_mismatch` (the name changed after it was shown) → print the existing escaped message, continue. The row is **not** added to the skip set, so the new name comes up as its own card, read fresh. Nothing is ever applied to a name that was not shown.
     - `409 name_taken` → print, continue. The request is still waiting and comes back next, so the owner can reject or skip it.
     - `400`, `401`, `503`, `500`, an unexpected answer, or no answer → print (no answer keeps "may or may not have been applied; run the read-only check"), **stop the run**, exit 1. These point to a problem with the whole system, not with one request.
  6. `q` or EOF (Ctrl-D) → summary, exit 0. Ctrl-C → summary, exit 130.
  7. **Ctrl-C while a decision is being sent:** `stop.requested` is set. The decision already sent is allowed to finish (it is bounded by the existing 10 s timeout) and its result is printed. Then the run stops. So it never ends as "unknown" because of Ctrl-C. Ctrl-C at a prompt or in the reason prompt → nothing is sent for that request.

### 4. New entry `src/profile-server/reviewNameChanges.ts`, the `testerRole.ts` shape (`:20-60`)
- Steps: `dotenv.config()`, then `createPool()`, then a `node:readline` interface on stdin/stdout with `terminal: true`.
- `isInteractive = process.stdin.isTTY === true && process.stdout.isTTY === true`.
- `ask` = `rl.question` wrapped to return null on `close`.
- `rl.on("SIGINT")` sets `stop.requested` and resolves any open prompt to null. In raw mode Ctrl-C arrives as a keypress here, not as a process signal.
- The token comes from a literal `process.env.PROFILE_INTERNAL_TOKEN` read, as at `decideNameChange.ts:31`. The port comes from `profileHttpPort()`.
- `finally`: `rl.close()` and `await pool.end()`.
- Header comment: the same "never import `./Server`, `./Routes` or `./Telemetry`" trap note. Its import surface is dotenv, Db (and Logger through it), ProfileEndpoints, NameChangeReviewCommand and node:readline.

### 5. `package.json`
Add after `:21`:
`"name-change:review": "node --loader ts-node/esm --experimental-specifier-resolution=node src/profile-server/reviewNameChanges.ts"`

Add a constant `REVIEW_NPM_SCRIPT` plus an exported `reviewCommandLine()` built from `PROFILE_COMPOSE_FILE` and `PROFILE_API_SERVICE` (`NameChangeDecideCommand.ts:26-30`), so the runbook line and the tests share one source.

### 6. Runbook `ai-agents/knowledge-base/name-change-digest-runbook.md`
- Top pointer box: name the new command first.
- New first subsection under *Deciding a request*: **"Deciding everything waiting: the walk-through command (task 0350)"**. It covers:
  - where to run it (SSH first, then run; no `-T`; not from the laptop)
  - the keys, and what each answer means (reusing the existing outcome table)
  - that skip leaves a request waiting
  - Ctrl-C and Ctrl-D behavior
  - that it stops on a system-level error
  - that it needs nothing new (no env var)
- The paste-line sections stay. They are marked **"still works — fallback until the walk-through is proven on the box"**.
- *Acting on a request you only see in the list*: the walk-through comes first. Building the line by hand (with `\uXXXX`) becomes the fallback.
- Add owner-run verification steps for the later verify task, from brief steps 1-3: 3+ requests including one Cyrillic name and one with a hidden character; a name changed after it was shown is refused; the token is never shown. No host, id, name or token is written in the runbook.

## Tests (new: `tests/profile-server/NameChangeReviewCommand.test.ts`)
These use the scripted fake-pool and fake-fetch style of `NameChangeDigest.test.ts` and `NameChangeDecideCommand.test.ts`.

**Refusals before anything happens**
1. Not interactive → exit 2, refusal text names `-T`; nothing is queried or sent.
2. Missing token, or a token with a line break → exit 2; nothing is queried or sent; the token never appears in the output.

**Normal walk**
3. Empty queue → `No requests waiting`, exit 0, no fetch.
4. Approve → exactly one POST to `http://127.0.0.1:<port>/internal/v1/name-change/decide` with a Bearer header, and a body of exactly `{playerId, decision:"approve", expectedName:<DB name>}` with no reason.

**Names**
5. Cyrillic name: the card shows the Cyrillic letters (no `\u` and no `⟨U+` codes), and the posted `expectedName` equals the stored string exactly.
6. A name with U+00A0: the card shows `⟨U+00A0⟩` and the hidden-character warning, and the posted `expectedName` holds the real U+00A0.
7. Hostile name (ESC, U+202E, newline, `<`): the card has no raw control or format character and no extra line.
8. Rude-name warning appears only for a name the filter matches.

**Reject**
9. An empty reason goes back to the choice with nothing sent. A 501-character reason or the placeholder asks again with nothing sent. A valid Cyrillic reason is posted exactly.

**Skip, quit, bad input**
10. Skip: the next `nextPending` call gets that row id; the summary counts it; it is never posted.
11. Quit, and EOF at the prompt → exit 0, summary, no further fetch.
12. Unknown input asks again and sends nothing.

**Server answers**
13. `409 name_mismatch`: the escaped message is printed, the walk continues, the row is not skipped, and the next card shows the new name; deciding posts the **new** name.
14. `404` continues. `409 name_taken` continues, and the same request is shown again.
15. `500`, `401`, `503`, unexpected answer, and a network error → stop, exit 1, and no further `nextPending` call. The network-error text says the outcome is unknown.
16. The token never appears in any output, for every outcome (an `out`/`err` capture sweep).

**Ctrl-C**
17. Stop requested while a POST is in flight → that POST's result is printed, then the run stops with exit 130 and no further fetch. Ctrl-C at a prompt → nothing is sent.

**Query and wiring**
18. `fetchNextPending` SQL: pending only, oldest first with the id tie-break, ids passed as `$1`, `LIMIT 1`, no `yandex`, and no join to `players`.
19. Static wiring, copying `NameChangeDecideCommand.test.ts:575-620`:
    - the package.json script points at an existing entry file
    - neither the entry nor the logic module refers to `./Server`, `./Routes` or `./Telemetry`
    - the logic module does not import `./Db` (the pool is injected)
    - `pg` is imported as a type only in the logic module

**Changes to existing test files**
- `tests/profile-server/NameChangeRepository.test.ts`: `visibleRequestedName` gives plain text with the same codes; `describeRequestedNameForModerator` output is unchanged (pinned).
- Existing `NameChangeDecideCommand.test.ts` stays green **unmodified**. That is the proof the refactor in file 1 changed no behavior.

**Integration (DB)**
- Add one `describe` to `tests/integration/NameChange.it.test.ts`: `fetchNextPending` against real Postgres, covering oldest-first order, exclusion by row id, `total` without the skipped rows, and that a re-request after a skipped one shows.
- It runs only if the local `gc-0012-it-pg` container and `.env.test` are available. If not, it is reported as **not run**, never as passed.

## Local verification (no box)
1. Targeted runs:
   `npm test -- tests/profile-server/NameChangeReviewCommand.test.ts tests/profile-server/NameChangeDecideCommand.test.ts tests/profile-server/NameChangeRepository.test.ts tests/profile-server/NameChangeDigest.test.ts tests/profile-server/NameChangeRoutes.test.ts`
2. `npm run lint`
3. `npm run check:config-parity`. Expect no new finding: the env names used are `PROFILE_INTERNAL_TOKEN`, `PROFILE_PORT` and `DATABASE_URL`, all already known. If it does report one, I fix it; I do not allowlist it blindly.
4. Smoke test of the real entry, local, non-TTY: `echo a | npm run -s name-change:review` must print the refusal and exit 2. Nothing is touched, because the refusal comes before any query.
5. `npm run test:integration` only if the local test Postgres is up (see the Tests section).
6. **One full `npm test` at the end, through the npm script (it waits on the project lock).** Brief verification step 5 requires it. About 5 minutes at 1 worker.

The shell harnesses are not affected: `setup-profile.sh` and the other scripts the harness greps are not touched.

## Edge cases covered (summary)
- Empty queue
- Name changed between show and decide → `409`, not applied, shown again fresh
- Withdrawn or decided meanwhile, including a second walk-through or a Telegram line pasted at the same time → `404`, continue
- Name taken by someone else → `409`, the request stays and is shown again
- Not a TTY, or run with `-T` → refused, nothing sent
- Cyrillic names readable; hidden or hostile characters shown as codes, while the real string is what gets posted
- Ctrl-C and Ctrl-D handled cleanly, with an in-flight POST allowed to finish
- A system-level error stops the run
- Token never printed, with the existing redaction kept

## Known limits, unverified until the box (they belong to the verify task)
- **Ctrl-C through SSH + `docker compose exec` + `npm run`:** that it reaches readline as a keypress (raw mode) and not as a signal to npm is expected, not proven.
- **Readline behavior and UTF-8 input of a Cyrillic reason over that chain** are not proven.
- **ts-node start-up time and memory on the low-RAM box.** Same cost as the digest and decide commands, but paid once per run, not once per decision.
- **An SSH drop (SIGHUP) mid-POST** kills the process. That decision's outcome is then unknown, and the runbook's read-only check covers it.

## Not done here
No commit. No deploy. No Telegram message change. Wiki update after close goes via `fkit-wiki`.

The verify task is filed at close by the producer, per the owner's build/verify rule. It goes at the top of the next sprint and runs after the weekend profile deploy (owner ruling 2026-10-15).
