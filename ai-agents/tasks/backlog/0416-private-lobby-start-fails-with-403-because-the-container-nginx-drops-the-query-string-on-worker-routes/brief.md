# Private lobby "Start" fails with 403 in production — the container nginx drops the query string on `/w<N>/` worker routes

## ID
0416

> ℹ️ **ID allocation, checked 2026-10-08 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/`
> (folder names and `## ID` fields agree) is `0415` (filed minutes earlier in the same run), so this is `0416`.
> `grep -rn 0416 ai-agents/tasks ai-agents/sprints`: no task hits before this filing.

## Sprint
Sprint 7

> 📌 **OWNER RULING, 2026-10-08, given live via `AskUserQuestion` in the `fkit lead` session**, relayed verbatim by
> `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Question:
> where should the private-lobby 403 bug task go? Owner picked **"Sprint 7, ship today (Recommended)"** — option text,
> verbatim: *"File it on Sprint 7 and include it in today's planned game deploy with 0407–0409. It's tiny, and it
> unblocks private-lobby testing (0376, 0401 check 4, 0382's invite link)."*
>
> 🚀 **Deploy: TODAY (2026-10-08), with `0407`–`0409`** — the same-day exception, by this ruling. This is an exception to
> the weekend-slot rule (2026-09-29) for this task only. Never filed on the Backlog board.

## Priority
62

⚠️ **Priority 62 is append rank, NOT a merit ranking — flagged for owner confirmation.** ADR-035 append position after
[Sprint 7](../../../sprints/plan-sprint-7.md)'s highest (61, `0383`); the owner named the sprint, not a rank.
**On merit this belongs at the top of Sprint 7's open rows**, because it is a production bug that stops **every**
private lobby from starting, it ships today by owner ruling, and three live checks (`0376`, `0401` check 4, `0383`)
cannot pass until it is fixed. A spawned producer cannot re-rank (ADR-035); the owner can move it in one edit.

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

### What was found (production game `0.0.157`, 2026-10-08, owner live test during `0398` check 1, place 4)

- A citizen host (the owner's paid account), with a second account joined, pressed "Начать игру". The window showed
  "Не удалось начать игру. Попробуйте ещё раз." The console showed `POST …/w14/api/start_game/<code> 403 (Forbidden)`.
  Twice.
- Game log (read-only, by `fkit-lead`): the create line read `creating Private game with id <code>` **without** the
  usual `, creator: <clientID>` suffix; both starts logged `refused to start private lobby <code>: creator not a
  citizen`.

### The code path (checked by `fkit-lead`, re-checked by the producer 2026-10-08)

- Client sends the creator as a **query parameter**: `src/client/HostLobbyModal.ts:1149` —
  `…/api/create_game/${id}?creatorClientID=…` (id from `generateID()`, a valid `ID`).
- Server reads `req.query.creatorClientID` (`src/server/Worker.ts:239–245`) and passes it to
  `createGameIfAbsent(id, gc, creatorClientID)` (`Worker.ts:312`); the log line at `Worker.ts:321` adds
  `, creator: …` only when it is set — so its absence in the log means the server never received it.
- `start_game` (`Worker.ts`, around lines 327–355) asks `GameServer.creatorMayStartPrivateLobby()`, which returns false
  when the lobby has no creator → 403 `citizens_only` (`Worker.ts:350` logs the refusal).

### Root cause — `fkit-lead`'s diagnosis, **the coder confirms it first**

- Container nginx, `nginx.conf:329` — the worker route `location ~* ^/w(\d+)(/.*)?$` — ends in
  `proxy_pass http://127.0.0.1:$worker_port$2;` (`nginx.conf:375`).
- When `proxy_pass` contains variables, nginx sends exactly the URI written there. `$2` is the **path only**, so the
  **query string is dropped** on every `/w<N>/…` request.
- Local dev does not go through this nginx, so it works there — which is why tests and local runs never caught it.
- ⚠️ This is a diagnosis from reading code and config, **not yet reproduced**. If the coder's check does not confirm
  it, stop and report before changing anything.

### Impact

- **No private lobby can start in production, for anyone.** Real players are not hit yet: private lobbies are still
  tester-only (the `geoconflict_tester` marker or the `private_lobbies_all` flag, `0354`).
- It blocks the private-lobby live checks: `0376`, `0401` check 4, and makes `0382`/`0383`'s invite link useless
  until fixed. (Recorded here as context only — no `Blocks:` line is added to those tasks, per the spawn instruction.)

### Dependencies and conflicts

- No conflict with a locked decision found.
- ⚠️ **Two nginx layers** (project memory, *Nginx — Two Layers*): the repo `nginx.conf` is the **container** nginx,
  baked into the game image and shipped by `build-deploy.sh` — **not** by `setup.sh`, which writes a separate minimal
  host proxy. This fix ships with the game image deploy.
- ⚠️ `nginx.conf` is covered by grep-level assertions in `tests/scripts/profile-deploy-hardening.test.sh`, which
  `npm test` runs (task `0201`). Editing `nginx.conf` can turn `npm test` red — that is the gate working; run it.

## What to build

Server-side config only (plus a test). Small.

1. **Confirm the cause** before editing: show that a `/w<N>/…?a=b` request reaches the worker without its query string
   through this nginx config (any safe local way — e.g. the container nginx locally, or `nginx -T` plus a reasoned
   reading of the docs; say which in the worklog).
2. **Fix the worker route so the query string is passed on.** Likely fix (coder confirms): append `$is_args$args` to
   that `proxy_pass` target. Keep WebSocket upgrade headers and everything else in the block unchanged.
3. **Check every other route that relies on a query string** — any other `location` in `nginx.conf` with variables in
   `proxy_pass`, and every worker API the client calls with `?…` (grep the client for `/api/` calls carrying a query).
   List them in the worklog; fix any that share the defect, report anything else to the owner.
4. Mark the change with a `// Flashist Adaptation`-style comment in the config (`#` comment) if the block is upstream
   code.

## Verification steps

1. **A test that the worker route keeps the query string**, as far as it is testable without a running nginx: e.g. an
   assertion in `tests/scripts/profile-deploy-hardening.test.sh` (or a jest test over `nginx.conf`) that the worker
   `proxy_pass` line carries `$is_args$args`. If added to the harness, keep its success marker line intact
   (`tests/scripts/ShellHarnesses.test.ts` checks it).
2. **The existing `start_game` creator tests** still pass (creator set → citizen may start; creator missing → 403).
3. **Cause confirmed** in the worklog (step 1 of *What to build*), and the list of query-string routes checked.
4. `npm test` and `npm run lint` pass — `npm test` includes the hardening harness that greps `nginx.conf`.
5. **Live check — left OPEN, not filed now.** Because the owner wants this shipped today, the live check can run
   **right after today's deploy**: a citizen host plus a second account in a private lobby → "Начать игру" succeeds
   (no 403 in the console), and the game log's create line carries `, creator: …` again. Per the owner's build/verify
   split rule (2026-09-29) this build task closes on the build; **no verify task is filed now** — the owner or
   `fkit-lead` decides whether the post-deploy check is its own task or rides on `0376`.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing
- Related: `0302` (private lobby as a locked citizen perk — the creator check), `0354` (who sees private lobbies),
  `0376` / `0401` check 4 / `0382` / `0383` (private-lobby live work this unblocks), `0398` (found during its live
  check), `0407`–`0409` (ship in the same deploy today).
- Deploy: **today, with `0407`–`0409`**, by owner ruling (see *Sprint*). Ships via the game image (`build-deploy.sh`).
- No ids, hosts, URLs, IPs or secrets belong in this brief or its follow-ups — the lobby code is written `<code>`.
- Filed 2026-10-08 by a spawned `fkit-producer` on an owner ruling relayed by `fkit-lead`. ⛔ Not producer precedent.
