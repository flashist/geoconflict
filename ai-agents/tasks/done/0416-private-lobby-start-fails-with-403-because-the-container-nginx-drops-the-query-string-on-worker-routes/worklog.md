# Worklog — 0416: private lobby "Start" 403 (container nginx drops the query string on `/w<N>/`)

Build step, 2026-10-08. Worker: `fkit-coder`, spawned by `fkit-sprint-ship-loop` (Sprint 7, Build),
under the declared-approval marker. Implemented `plan.md` as approved (blob `4c09df4…`, verified by
`git hash-object` before starting). Nothing committed, nothing deployed, no status changed.

## What changed

1. **`nginx.conf`** — worker location block (`location ~* ^/w(\d+)(/.*)?$`):
   - `proxy_pass http://127.0.0.1:$worker_port$2;` → `proxy_pass http://127.0.0.1:$worker_port$2$is_args$args;`
   - A `# Flashist Adaptation (task 0416): …` comment above it explaining why.
   - Nothing else in the block touched (diff: 5 insertions, 1 deletion; the pre-existing
     whitespace-only line above it is preserved byte-for-byte).
2. **`tests/scripts/profile-deploy-hardening.test.sh`** — new section
   `== Structural: worker route keeps the query string (0416) ==`, placed right after the 0060
   `nginx.conf` checks:
   - awk-extracts only the worker block; pass/fail on "located the worker location block" (non-vacuous).
   - Asserts the block's `proxy_pass` line equals exactly
     `proxy_pass http://127.0.0.1:$worker_port$2$is_args$args;` — failure message names the 403.
   - File-wide guard: every non-comment `proxy_pass` with a `$` variable must carry `$is_args$args`,
     with its own "found at least one" non-vacuity check. Known, accepted limit (per plan): a
     host-only variable `proxy_pass` would false-RED.
   - Header comment: one line added naming the 0416 `nginx.conf` check.
   - Final `ALL PASS` / `SOME FAILED` line unchanged.

No TypeScript changes. `plan.md` untouched.

## Verification

### Repro against the edited repo file (Docker was up)
Throwaway local container of the current game image (tag `20261008-095100`, nginx 1.22.1),
`--platform linux/amd64` (emulated on an arm64 host), entrypoint overridden to `sh`, so no game
server ran and no env/secrets were passed. A small node echo server on 127.0.0.1:3015 and :3004
prints the URL it receives; for an `Upgrade` request it answers `101` and echoes the URL in a header.
Scratch scripts lived in `/tmp`, mounted read-only; nothing in the repo was written by the repro.

- **BEFORE:** the image's own baked `nginx.conf`.
- **AFTER:** the edited repo `nginx.conf` mounted read-only over `/etc/nginx/conf.d/default.conf`.
  Re-run on the final file (after the whitespace restore) — same output.

`nginx -t`: `test is successful` on both.

| Request to nginx | Worker receives — BEFORE | Worker receives — AFTER |
|---|---|---|
| `/w14/api/start_game/abc?creatorClientID=xyz` | `/api/start_game/abc` (query lost) | `/api/start_game/abc?creatorClientID=xyz` |
| `/w14/api/create_game/abc?a=1&b=2` | `/api/create_game/abc` (query lost) | `/api/create_game/abc?a=1&b=2` |
| `/w14/api/game/abc` | `/api/game/abc` | `/api/game/abc` (same) |
| `/w3` | `/w3` | `/w3` (same) |
| `/w3/` | `/` | `/` (same) |
| `/w3?x=1` | `/w3?x=1` | `/?x=1` (harmless; no client sends it) |
| WS upgrade on bare `/w3` | `HTTP/1.1 101`, worker saw `/w3` | `HTTP/1.1 101`, worker saw `/w3` (same) |

Matches the plan's table exactly. Not testable here: the real production path (host proxy in front
of the container nginx) — that is the post-deploy live check.

### The new check is not vacuous
Ran the new section alone against a temp copy of `nginx.conf` with only the `proxy_pass` line
reverted to the old form (`sed`, one line, confirmed 1 match):
- fixed file: 4/4 ✅, `FAILED=0`
- old line: ❌ `worker proxy_pass is 'proxy_pass http://127.0.0.1:$worker_port$2;', expected '…$2$is_args$args;' — … 403 (0416)`
  and ❌ `a variable proxy_pass lacks $is_args$args …`; `FAILED=1`.

### Test runs
- `bash tests/scripts/profile-deploy-hardening.test.sh` → exit 0, `ALL PASS` (19 s); re-run on the
  final file → `ALL PASS`.
- `npm test -- tests/server/PrivateLobbyStartGate.test.ts tests/client/HostLobbyModalUrl.test.ts`
  → 2 suites, 57/57 passed.
- `npm run lint` → clean.
- `npm test` (full, includes shell harnesses; Docker up so the Docker-probed harness ran)
  → exit 0, **211/211 suites, 4191/4191 tests**. No supertest flake appeared; no re-run needed.
  This run preceded the whitespace-only restore of one blank line in `nginx.conf`; the harness
  (the only `npm test` gate over `nginx.conf`) was re-run after it → `ALL PASS`.

## Other query-string routes — checked
- `nginx.conf`: the other 11 `proxy_pass` lines are all plain `http://127.0.0.1:3000;` (no variable,
  no URI part) — nginx forwards the original URI with its query. Not affected.
- Client → worker calls with a query: only `HostLobbyModal.ts:1149`
  (`create_game/<id>?creatorClientID=…`). `start_game`, `game/:id` GET/PUT, `game/:id/exists` and
  the bare `/w<N>` WebSocket carry none.
- Server code reading a query in `src/server`: only `Worker.ts:240-242` (`req.query.creatorClientID`).
- Out of scope, untouched: the profile server's nginx (`setup-profile.sh`) and the host proxy
  written by `setup.sh` — different layers.

## Deploy note
Ships only via a game image rebuild + deploy (`build-deploy.sh`); `setup.sh` does not carry
`nginx.conf`. Commit and deploy are the owner's call.

## Live check — open, not filed (per brief/plan)
After deploy: citizen host + second account in a private lobby press "Начать игру" → no 403, and
the game log's create line carries `, creator: …` again.

## Decision log (calls made without asking)
1. **Non-vacuity proof run against a temp copy, not by reverting the repo file in place.** Plan
   step 3 says "temporarily revert the one line, see the new check go red, restore it". I ran the
   identical section code against a `/tmp` copy of `nginx.conf` with only that line reverted.
   *Why it qualified:* obvious winner within the plan's intent — same evidence (same check code,
   same old line), and the repo file is never left in the broken state if a run is interrupted.
2. **Restored a whitespace-only blank line.** The edit tool stripped the trailing spaces from the
   pre-existing blank line above `proxy_pass`, which showed as unrelated churn in the diff. Put the
   original 8 spaces back so the diff is just the comment + the one line. *Why it qualified:*
   mechanical/localized, inside the plan ("nothing else in the block changes"); harness and repro
   re-run afterwards.
3. **Placement of the harness section** — directly after the existing 0060 `nginx.conf` checks
   (reuses that block's `$N`). *Why it qualified:* the plan names the file but not the position;
   grouping with the other `nginx.conf` checks is the obvious spot and changes no behaviour.

No review fixes applied (Build step — no review yet).

## Verify (independent re-run)

2026-10-08, sprint-ship-loop Verify worker, current working tree (after the whitespace-only edit). No source touched.

| Command | Result |
|---|---|
| `bash tests/scripts/profile-deploy-hardening.test.sh` | exit 0, `ALL PASS`; 744 ✅ / 0 ❌. New section `(0416)`: 4/4 ✅ (worker block located; `$2$is_args$args` present; variable `proxy_pass` lines found; every one carries `$is_args$args`). |
| `npm test -- tests/server/PrivateLobbyStartGate.test.ts tests/client/HostLobbyModalUrl.test.ts tests/scripts/ShellHarnesses.test.ts` | exit 0; 3/3 suites, 61/61 tests passed, 0 skipped (46 s). No supertest flake seen — no re-run needed. |
| `npm run lint` | exit 0, no findings. |

Full `npm test` not repeated (ran green in Build; nothing above failed).
Not covered here: the fix's real effect behind the container nginx — that needs a deploy + live private-lobby Start check.

## Process review — Round 1 (2026-10-08)

Worker: `fkit-coder`, spawned by `fkit-sprint-ship-loop` (Sprint 7, Process review), under the
declared-approval marker. `plan.md` re-hashed before starting: blob `4c09df4…`, 10089 bytes — matches.
Method: `fkit-process-stateful-review`, steps 0–7, with the loop's standing approval replacing the
per-round owner gate. Ledger: `review.md` (one finding, R1). No residuals on file; no ADR covers R1
(ADR-109 covers worker-index mapping, not this lint).

### Decision log (calls made without asking)
1. **R1 — fixed autonomously.** *Finding:* the file-wide guard in the 0416 harness section tested the
   whole `proxy_pass` line with `grep -vF '$is_args$args'`, so a variable route that drops the query
   but has `$is_args$args` in a trailing comment passed (false green). *What changed:* that one
   `grep -vF` became an awk filter that strips from the first `#`, then from the first `;`, and flags
   the line if the remaining directive lacks `$is_args$args` (plus one comment line).
   `tests/scripts/profile-deploy-hardening.test.sh` only; `nginx.conf` untouched. *Why it qualified:*
   verified `CORRECT` by reproduction (old guard flagged nothing on a `/tmp` copy with such a line);
   mechanical and localized (one pipeline stage in the guard); inside the approved plan (Files to
   change §2, "file-wide guard").
   No obvious-winner calls this round.

### Evidence
- `/tmp` copies, the 0416 section run alone: repo file → 4/4 pass; new non-worker route
  `proxy_pass http://127.0.0.1:$p/x; # $is_args$args` → old guard silent, new guard FAIL; same route
  as `$p/x$is_args$args; # comment` → pass; worker line with the token only in a comment → both
  checks FAIL; old worker line → both FAIL.
- `bash tests/scripts/profile-deploy-hardening.test.sh` → exit 0, `ALL PASS`, 744 ✅ / 0 ❌.
- `npm test -- tests/scripts/ShellHarnesses.test.ts` → 1 suite, 4/4 passed (46.7 s).
- `npm run lint` → exit 0.
- Full `npm test` not re-run: the change is inside one harness, which the wrapper run above covers.
