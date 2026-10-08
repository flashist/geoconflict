# Plan — 0416: private lobby "Start" fails with 403 (container nginx drops the query string on `/w<N>/` routes)

## Summary
- **Cause confirmed, by a live repro (not just reading).** The worker route in `nginx.conf` passes on the path but drops the query string. So `?creatorClientID=…` never reaches the worker, the lobby gets no creator, and "Start" is refused with 403.
- **Fix: one line in `nginx.conf`** — add `$is_args$args` to the worker `proxy_pass`. Tried in a throwaway container: query strings now get through, and every other path is forwarded exactly as before.
- **Test: one new lint section in the existing harness** `tests/scripts/profile-deploy-hardening.test.sh`, which `npm test` already runs. No new harness. Its success line `ALL PASS` does not change.
- **No app code changes.** `Worker.ts` and `HostLobbyModal.ts` are already correct.
- Ships with today's game image deploy (`build-deploy.sh`), by owner ruling, alongside `0407`–`0409`.

## Goal
A private lobby created in production keeps its creator, so a citizen host can press "Начать игру" without a 403.

## Cause — confirmed (planning step, 2026-10-08)
**How it was checked:** a throwaway local container of the current prod game image (`flashist/geoconflict-prod:20261008-095100`, nginx 1.22.1 — the nginx the image ships). The entrypoint was overridden, so no game server started and no secrets or env were passed. The image's own baked `nginx.conf` was in place, with a small echo server on worker ports 3015 and 3004 that prints the URL it receives. Then the same requests were repeated with the `proxy_pass` line patched inside that container. Nothing in the repo was touched. The run used amd64 emulation on an arm64 host; that does not change nginx's URI handling.

| Request to nginx | Worker receives today | Worker receives with fix |
|---|---|---|
| `/w14/api/start_game/abc?creatorClientID=xyz` | `/api/start_game/abc` (**query lost**) | `/api/start_game/abc?creatorClientID=xyz` |
| `/w14/api/create_game/abc?a=1&b=2` | `/api/create_game/abc` (**query lost**) | `/api/create_game/abc?a=1&b=2` |
| `/w14/api/game/abc` (no query) | `/api/game/abc` | `/api/game/abc` (same) |
| `/w3` (bare — the WebSocket path the client uses) | `/w3` | `/w3` (same) |
| `/w3/` | `/` | `/` (same) |
| `/w3?x=1` (bare + query; no client sends this) | `/w3?x=1` | `/?x=1` (fine — the worker reads `/` either way) |

`nginx -t` passed on both versions.

**Why:** in `nginx.conf:375`, `proxy_pass http://127.0.0.1:$worker_port$2;` contains variables, plus a URI part (`$2`). In that form nginx sends exactly the URI written there, and `$2` is the path only, so the query string is dropped. Local dev does not go through this nginx (it uses the webpack proxy), which is why tests and local runs never caught it.

**The chain in the app code (checked, no change needed):**
- `src/client/HostLobbyModal.ts:1149` sends `POST /w<N>/api/create_game/<code>?creatorClientID=…`.
- `src/server/Worker.ts:237-245` reads `req.query.creatorClientID`. It arrives undefined, so `createGameIfAbsent` gets no creator.
- The log line at `Worker.ts:321` therefore has no `, creator:` part. That matches the production log.
- `start_game` (`Worker.ts:327+`) then runs `creatorMayStartPrivateLobby()`, which returns false for a lobby with no creator. Result: 403.

## Files to change
1. **`nginx.conf`** — the worker location block (`location ~* ^/w(\d+)(/.*)?$`, line ~329):
   - Change `proxy_pass http://127.0.0.1:$worker_port$2;` to `proxy_pass http://127.0.0.1:$worker_port$2$is_args$args;`
   - Add a `# Flashist Adaptation (task 0416): …` comment just above it. This block is upstream code, carried over from the fork's first commit. The comment says why: with variables in `proxy_pass`, nginx sends only the URI written there, so `$2` alone loses the query string, and the worker needs `?creatorClientID=` from `create_game`.
   - Nothing else in the block changes. The WebSocket upgrade headers, the `$worker_port` `if` ladder and the other `proxy_set_header` lines stay as they are.
2. **`tests/scripts/profile-deploy-hardening.test.sh`** — a new structural section, `== Structural: worker route keeps the query string (0416) ==`, written in the same style as the existing `nginx.conf` sections (awk-scoped, never vacuous, checks the exact value):
   - Extract only the worker location block (from `location ~* ^/w(\d+)` to its closing `    }`). Pass or fail on "located the worker block", so the next check can never pass on nothing.
   - Assert that the block's `proxy_pass` line is exactly `proxy_pass http://127.0.0.1:$worker_port$2$is_args$args;`. The failure message explains the 403 consequence.
   - A file-wide guard: every non-comment `proxy_pass` line in `nginx.conf` that contains a `$` variable must also contain `$is_args$args`. This catches the next variable route someone adds. Known limit, accepted: a variable used only for the host, with no URI part, would be flagged even though it is fine. That is a false red, which is the safe way for a lint to be wrong. Today the only variable `proxy_pass` is the worker one.
   - Add `0416` to the header comment's list of `nginx.conf` checks (one line).
   - Leave the final `ALL PASS` / `SOME FAILED` line exactly as it is (`tests/scripts/ShellHarnesses.test.ts` checks for it).

No other files. No client or server TypeScript changes.

## Other query-string routes — checked
- **Other `nginx.conf` locations:** all 11 other `proxy_pass` lines are the plain `http://127.0.0.1:3000;` form (no variables, no URI). In that form nginx forwards the client's original URI *with* its query string. Not affected.
- **Worker APIs the client calls with a query:** only one — `create_game?creatorClientID=` (`HostLobbyModal.ts:1149`). The others (`start_game`, `game/:id` GET/PUT, `game/:id/exists`, the WebSocket at bare `/w<N>`) carry no query.
- **Server code that reads a query:** only `Worker.ts:240-242` across `src/server`.
- **Out of reach of this file:** the profile server's nginx (in `setup-profile.sh`) and the host proxy (written by `setup.sh`) are different layers, and neither is changed here.

The worklog will list all of the above.

## Edge cases considered
- **Bare `/w<N>` (the WebSocket):** with no query, `$is_args$args` is empty, so `proxy_pass` has no URI part and nginx forwards the original URI as it does today. Shown unchanged in the repro. The build step adds one real WebSocket-upgrade probe through the fixed config, to show the upgrade still works.
- **Bare `/w<N>?x`:** no client sends this. With the fix the worker gets `/?x`, which is harmless.
- **Escaping:** `$args` is forwarded raw (still percent-encoded), so an `encodeURIComponent`'d `creatorClientID` arrives intact. `$2` is the *decoded* path. That is how it already works, the codes and ids are plain alphanumeric, and it is not changed here.
- **Caching:** the worker block has no `proxy_cache`, so there is no cache-key effect.
- **Rejected alternative:** dropping `$2` and passing the full `/w<N>/…` URI, letting `Worker.ts`'s prefix-stripping middleware handle it. That would also fix the bug, but it changes what every worker request looks like and turns on the middleware's "worker mismatch" 404 in production for the first time. Too broad for a same-day fix.

## Build sequence
1. Re-run the repro against the **edited repo file**: same throwaway container of the prod image, with the edited `nginx.conf` mounted read-only over `/etc/nginx/conf.d/default.conf`. Check `nginx -t`, the six requests from the table, and a WebSocket-upgrade probe on bare `/w3`. Record the commands and output in the worklog (no hosts or secrets).
2. Edit `nginx.conf` as above.
3. Add the harness section. Confirm it fails on the **old** line (temporarily revert the one line, see the new check go red, restore it), so the check is shown not to be vacuous.
4. Run the verification below.

## Tests / verification
1. `bash tests/scripts/profile-deploy-hardening.test.sh` — the new section passes and the run ends with `ALL PASS`.
2. Existing creator tests still pass: `npm test -- tests/server/PrivateLobbyStartGate.test.ts tests/client/HostLobbyModalUrl.test.ts`. These cover "citizen creator may start" and "lobby with no creator is refused".
3. Full `npm test` (includes the shell harnesses) and `npm run lint`. If a lone `Exceeded timeout of 5000 ms` appears in a `supertest` suite, apply the known-flake rule (re-run, and say so).
4. Worklog records: how the cause was confirmed (above), the list of query-string routes checked, and the before/after repro output.

**Not testable here:** the real production path (the host proxy in front of the container nginx). That is the live check below.

## Deploy note
- Ships only with a **game image** rebuild and deploy (`build-deploy.sh`). `setup.sh` does not carry `nginx.conf`.
- Today (2026-10-08), with `0407`–`0409`, by owner ruling. Committing and deploying are the owner's call. This task writes code only.

## Live check — left open, not filed (per the brief)
After deploy: a citizen host plus a second account in a private lobby press "Начать игру". Expect no 403 in the console, and the game log's create line carries `, creator: …` again. By the build/verify split rule, this task closes on the build. The owner or `fkit-lead` decides whether the live check becomes its own task or rides on `0376`.

## Out of scope
- Any change to `Worker.ts`, `HostLobbyModal.ts` or the creator/citizen gate.
- The `$2` decoded-path behaviour, the `if` ladder, and the other `nginx.conf` locations.
- A Docker-backed behavioural nginx test inside `npm test`. The brief asks for a check "as far as testable without a running nginx"; the live repro is recorded in the worklog instead.
- `CLAUDE.md` changes. It already warns that `nginx.conf` edits can turn `npm test` red.

## Small brief drift, for the record
The brief says the lobby id comes from `generateID()`. Since `0389` it comes from `generatePrivateLobbyCode()` (`HostLobbyModal.ts:1146`). This makes no difference to the bug or the fix.
