# Plan: task 0312, a working operator command to approve and reject name changes

**Summary**
- Today's Telegram message holds one `curl` Approve line. It gets 403 from a laptop because nginx only allows `/internal/` from certain boxes. The message has **no Reject line at all**.
- Proposal (**needs your pick of shape first**, brief Step 0): a small **built-in command inside the profile-server image**, `npm run -s name-change:decide`. The Telegram message carries two ready-to-paste lines, **Approve** and **Reject**. You run them on the profile box after SSH-ing in, the same way as the command that worked on 2026-09-26.
- The token and port are read **inside the container** and are never typed, printed or put in Telegram.
- Builds on 0307, does not undo it. The name still travels as 0307's pure-ASCII JSON body inside `'…'`, and the `⟨U+XXXX⟩` display is untouched.
- The `expectedName` binding (owner ruling 0067 option A) is kept for **both** decisions. The route contract does not change.
- The 0307 coordination question is settled by events. 0307 is already closed (uncommitted in the tree), so this task lands second and **its review must re-check 0307's F2 and F3 properties** (brief: "whichever lands second re-checks the other").
- Nothing committed.

## Grounding (the code as it stands, including 0307's uncommitted changes)
- `src/profile-server/NameChangeRepository.ts:495-509`, `notifyOperator`: builds the message and appends `decideCommandLines(...)`.
- `NameChangeRepository.ts:610-622`, `buildDecideCommandBody`: body is hard-coded to `decision:"approve"`. Characters outside `\x20-\x7E`, and `'`, become `\uXXXX` (0307 F2).
- `NameChangeRepository.ts:640-652`, `decideCommandLines`: emits only `<b>Approve:</b>` plus the laptop `curl … "$PROFILE_API_URL/internal/…" -H "Authorization: Bearer $PROFILE_INTERNAL_TOKEN"`. It returns `[]` for a player id outside `[A-Za-z0-9_-]`.
- `NameChangeRepository.ts:325`: `expectedName` is compared (after trim) for approve **and** reject. On a mismatch the result is `409 name_mismatch` with `pending_name`.
- `src/core/profile/NameChangeContract.ts:74-104`: the schema allows `expectedName` as optional on the wire. `reason` is required and non-blank for a reject, max `MAX_REJECTION_REASON_LENGTH` = 500 (`:64`).
- `src/profile-server/Routes.ts:1282-1356`: the decide route. It maps 200 / 400 / 401 / 404 `no_pending` / 409 `name_taken` / 409 `name_mismatch` / 503 / 500. Its comment still documents the laptop curl (`:1285`, `:1303-1307`).
- Precedent for a one-shot command inside the image: `package.json:19` `digest:name-changes` → `src/profile-server/sendNameChangeDigest.ts`, run on the box as `docker compose exec -T profile-api npm run …`. That file warns: **never import `./Server`, `./Routes` or `./Telemetry`**, because `Server.ts` calls `listen()` when it loads.
- `src/profile-server/ProfileEndpoints.ts:10`, `profileHttpPort()`: an existing, lightweight read of `PROFILE_PORT` to reuse.
- `setup-profile.sh:105`: `PROFILE_DIR="/opt/profile"` is hard-coded. The service is named `profile-api` (`:1050`).
- `tests/scripts/ConfigParity.test.ts:2155-2169`: the **real-tree gate** fails `npm test` on any new `process.env.X` read in `src/profile-server/**` that is not forwarded or allowlisted.

## Proposed design (option (b), with the script shipped in the image)
**What the Telegram message shows** (the placeholders are generated per request):
```
<b>Approve</b> (on the profile box, see runbook):
<pre>docker compose -f /opt/profile/docker-compose.yml exec -T -e NAME_CHANGE_DECISION='{"playerId":"<uuid>","decision":"approve","expectedName":"<ascii-escaped name>"}' profile-api npm run -s name-change:decide</pre>
<b>Reject</b> (replace the reason first):
<pre>docker compose -f /opt/profile/docker-compose.yml exec -T -e NAME_CHANGE_DECISION='{…"decision":"reject","expectedName":"…"}' -e NAME_CHANGE_REASON='REPLACE-WITH-REASON' profile-api npm run -s name-change:decide</pre>
```
Why this shape:
- **Only one shell reads the name:** the operator's shell on the box, inside `'…'`, and 0307's F2 makes that safe for any name.
- `docker compose exec -e` passes the value straight through as an argument, with no second shell.
- `npm run` runs a fixed command string and never sees the data.
- The message and the command ship in **the same image**, so they cannot drift apart after a rollback. A script written onto the box separately could.

**What the command does** (`decideNameChange.ts` → `runNameChangeDecide`):
1. Read `NAME_CHANGE_DECISION` and JSON-parse it. The escapes decode back to the exact name.
2. **Refuse** if `expectedName` is missing. This command always makes a bound decision (option A).
3. For a reject, take `NAME_CHANGE_REASON`. **Refuse** if it is missing, blank, or still the literal placeholder `REPLACE-WITH-REASON`, so an unedited placeholder never reaches the player's inbox.
4. For an approve, refuse if a reason is set, to avoid confusion.
5. Validate with `NameChangeDecisionRequestSchema`, so a >500-character reason fails with a clear message before any request is sent.
6. Read `PROFILE_INTERNAL_TOKEN`. **Refuse** if it is empty. The value is never printed.
7. `POST http://127.0.0.1:<profileHttpPort()>/internal/v1/name-change/decide` with a Bearer token and a 10 s timeout. It goes through the real route, with no second decision path.
8. Print the HTTP status and a plain-language meaning for each outcome:
   - 200 approved / rejected
   - 404 nothing pending
   - 409 `name_taken`: still pending; retry or reject
   - 409 `name_mismatch`: prints `pending_name` **ASCII-escaped**, so hidden characters or terminal escape codes in a name cannot affect a root terminal
   - 400 / 401 / 503 / 500
   - network failure
9. Exit 0 only on 200, 1 on a server refusal or network failure, 2 on bad input (nothing sent).

## Steps (files)
1. **New `src/profile-server/NameChangeDecideCommand.ts`.** Pure, and imports only `NameChangeContract` and `ProfileEndpoints`. It holds:
   - shared constants: compose file path `/opt/profile/docker-compose.yml`, service `profile-api`, npm script `name-change:decide`, env names `NAME_CHANGE_DECISION` / `NAME_CHANGE_REASON`, `REASON_PLACEHOLDER`
   - `parseDecideInput(decisionJson, reason)`
   - `describeDecideResponse(status, body)`
   - `runNameChangeDecide({ decisionJson, reason, token, port, fetch, out, err }) → exitCode`, with an injected fetch so it can be tested.
2. **New entry `src/profile-server/decideNameChange.ts`.** It follows the `sendNameChangeDigest.ts` shape and header comment. It uses *literal* `process.env` reads (parity-checker rule) and imports **only** `./NameChangeDecideCommand` and `./ProfileEndpoints`, never Server, Routes, Telemetry or Logger. It writes plain stdout/stderr.
3. **`package.json`:** add `"name-change:decide": "node --loader ts-node/esm --experimental-specifier-resolution=node src/profile-server/decideNameChange.ts"`.
4. **`NameChangeRepository.ts`:**
   - `buildDecideCommandBody(playerId, requestedName, decision = "approve")`. The default keeps 0307's tests and its integration case unchanged, and the escape rule stays byte-for-byte the same.
   - `decideCommandLines` emits the two box commands above, built from the step-1 constants. The laptop curl is **removed** (brief: no two command shapes). The HTML escape on the body stays, and so does the `[]` for an unsafe player id.
   - Doc comments updated.
5. **`Routes.ts:1282-1307`:** comment only. It now says decisions go through `name-change:decide` on the box (runbook), with the request/response contract unchanged.
6. **`scripts/config-parity-allowlist.json`:** two entries, `NAME_CHANGE_DECISION` and `NAME_CHANGE_REASON`, pipeline `profile`, class `runtime-supplied`, phase 1. Reason: set per run by the operator's `docker compose exec -e`, never a deploy input. Without them the real-tree gate turns `npm test` red.
7. **Runbook: extend `ai-agents/knowledge-base/name-change-digest-runbook.md`** with a section *Deciding a request: approve or reject (task 0312)*, plus a one-line pointer near the top. It covers:
   - Where to run it: SSH to the profile box as the user that runs other `/opt/profile` commands, **then** paste. ⚠️ Do not wrap it as `ssh <box> '…'`: that adds a second shell that re-reads the quotes and breaks them.
   - Approve.
   - Reject: replace the placeholder. For an apostrophe in the reason type `'\''`. An unclosed quote leaves the shell waiting for more input; press Ctrl-C.
   - What 200 / 404 / 409 `name_taken` / 409 `name_mismatch` / 400 / 401 / 503 / exit 2 mean.
   - Read-only confirmation: `docker compose -f <profile dir>/docker-compose.yml exec -T postgres psql -X -U <user> -d <db> -tA -c "select moderation_status, decided_at, rejection_reason is not null from player_name_history where player_id = '<player uuid>' order by id desc limit 1"`, plus the card in-game.
   - Messages sent before this deploy still show the old curl line; how to decide those.
   - Variable names only. No hostnames, IPs or values.
8. **Tests:**
   - `tests/profile-server/NameChangeRepository.test.ts`:
     - Update 0307's "inside the '…' of the curl line" test and the `:340-352` cases. The old ones assert `$PROFILE_INTERNAL_TOKEN` and `not.toContain("curl")`. The new ones assert `name-change:decide`, and that the message never contains a token fixture, `http`, or an IPv4 pattern.
     - **New: both Approve and Reject are present.** This fails on today's code, which satisfies verification 2.
     - The reject body parses to `decision:"reject"` with the exact name.
     - **Real-bash test**, extending 0307's pattern. Take each `<pre>` command, HTML-unescape it, and run it with `bash -c` and a stub `docker` first on PATH that records its arguments. Assert the arguments are exactly `compose -f /opt/profile/docker-compose.yml exec -T -e NAME_CHANGE_DECISION=<body> [-e NAME_CHANGE_REASON=…] profile-api npm run -s name-change:decide`, and that no file was created. Run it for 0307's hostile names plus `=` and `!`.
     - Valid Telegram HTML: no raw `<` or `>` and no stray `&` inside `<pre>`.
     - A worst-case 128-unit hostile name keeps the whole message under Telegram's 4096 limit.
   - **New `tests/profile-server/NameChangeDecideCommand.test.ts`** (fake fetch):
     - approve 200 → exit 0, and the posted body is exact
     - reject posts the reason
     - these refuse with exit 2 and never call fetch: missing, blank or placeholder reason; reason set on an approve; malformed JSON; missing `expectedName`; missing token; a reason over 500 characters
     - the token fixture never appears in stdout or stderr
     - a `name_mismatch` `pending_name` containing ESC or U+202E is printed escaped
     - the 404 / 409 / 401 / 500 / network-error messages
     - plus static checks: the entry file references none of `./Server`, `./Routes`, `./Telemetry`, using the 0283 harness's specifier-scan rule with comments stripped; `setup-profile.sh` still says `PROFILE_DIR="/opt/profile"`, matching the constant; the `package.json` script points at an existing entry file.
   - `tests/integration/NameChange.it.test.ts`: one new case. `parseDecideInput(buildDecideCommandBody(id, "Iv an", "reject"), "reason")` posted to the real route → 200. The row is rejected with that reason.
9. **Run:** `npm test`, `npm run test:integration` (needs the local Postgres container; if Docker is down, I will say so and not claim it passed), `npx tsc --noEmit`, `npm run lint`. The known `supertest` flake gets one re-run, and I will say that I re-ran.

## Edge cases and failure modes covered
- **The name breaks the quoting:** covered by 0307's F2 plus the real-bash argument check.
- **`=` in the name:** docker splits `-e` on the first `=` only.
- **`!` in the name:** history expansion does not happen inside single quotes.
- **The operator forgets the reason placeholder:** refused locally.
- **Apostrophe in the reason:** the operator's own typing; handled in the runbook.
- **A name that fakes terminal output on a 409:** printed escaped.
- **The command accidentally binds the server port:** guarded by the import-surface test, the same trap as 0283.
- **A new env read turns the parity gate red:** allowlisted.
- **Rollback drift:** none, because the message and the command ship in one image.
- **Messages sent before the deploy:** covered in the runbook.
- **Cost:** ts-node startup on the low-RAM box is the same cost the daily digest already pays.

## Not in scope
- The route contract, the rate limiting or auth-failure logging (0279), the digest contents (0315), the rejected state on the card (0314), and the character set (0308).

## Verification left for the owner (live; brief step 4)
- Deploy with `./build-deploy-profile.sh`.
- Make a test-account request and check the message shows both commands.
- Approve on the box → 200, and the card shows the name.
- Make a second request and reject it with a reason → 200, and the card shows the rejected state.
- Check that the token is never printed.

## Open question (brief Step 0, must be recorded verbatim)
Which command shape? See openQuestions.

## Owner ruling on the Step 0 question (2026-09-27, live via `AskUserQuestion` in the `fkit lead` session, relayed by fkit-lead) — record verbatim
- Question: "How should the Telegram name-change message let you approve or reject? (You run it on the profile server after SSH-ing in; the secret token is never typed or shown.)"
- Answer: **"Built-in command (Recommended)"** — option text: "Two short ready-to-paste lines (Approve, Reject) calling a small command shipped inside the profile server. Tested like normal code, and it can never get out of step with the server after a rollback."
