# Private Lobby "Start" Fails With 403 in Production — the Container nginx Drops the Query String on `/w<N>/` Worker Routes (task 0416)

**Source**: `ai-agents/tasks/done/0416-private-lobby-start-fails-with-403-because-the-container-nginx-drops-the-query-string-on-worker-routes/brief.md` (`plan.md`, `worklog.md`, `review.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 7, rank 62 (ADR-035 append rank; on merit the top open row, per the brief) / task `0416`

> ✅ Done (agent-closed — not owner-verified), closed 2026-10-08 by `fkit-sprint-ship-loop`. Committed in `a555111`
> (2026-10-08, "Sprint push"); `git tag --contains a555111` → none ⇒ **committed, not deployed** (checked 2026-10-08),
> although the owner ruled it **"Sprint 7, ship today"**. Ships only with a **game image rebuild** (`build-deploy.sh`),
> not `setup.sh`. Live check → `0420` ([[decisions/sprint-8]]).

## Goal

On production `0.0.157` (2026-10-08, during `0398`'s live check), a citizen host pressing *"Начать игру"* in a private
lobby got **403** on `…/w<N>/api/start_game/<code>`. The game log's create line lacked the usual `, creator: …` suffix,
and both starts logged `refused to start private lobby … creator not a citizen`. **No private lobby could start in
production for anyone** (still tester-only, so real players were not hit). It blocked `0376`, `0401` check 4 and made
`0382`'s invite link useless ([[tasks/yandex-invite-sdk-link]]).

## Key Changes

- **Cause, confirmed by reproduction:** the client sends the creator as a query parameter
  (`create_game/<id>?creatorClientID=…`, in `HostLobbyModal.ts`). The container nginx worker route
  `location ~* ^/w(\d+)(/.*)?$` proxied to `http://127.0.0.1:$worker_port$2` — and **when `proxy_pass` contains
  variables, nginx sends exactly that URI**, so `$2` (path only) dropped the query string. The worker never saw the
  creator → `creatorMayStartPrivateLobby()` false → 403. Local dev does not go through this nginx, so tests never caught
  it.
- **Fix** (`nginx.conf`, one line + comment): `proxy_pass http://127.0.0.1:$worker_port$2$is_args$args;`. WebSocket
  upgrade headers and the rest of the block unchanged.
- **Repro** in a throwaway local container of the game image (entrypoint overridden, no game server, no env/secrets):
  before — `/w14/api/start_game/abc?creatorClientID=xyz` reached the worker as `/api/start_game/abc`; after — with its
  query. Bare `/w3`, `/w3/`, WebSocket upgrade unchanged; `/w3?x=1` now arrives as `/?x=1` (harmless, nothing sends it).
- **Other routes checked:** the other 11 `proxy_pass` lines carry no variable (query forwarded). Only one client → worker
  call carries a query, and only `Worker.ts` reads `req.query.creatorClientID`.
- **Gate:** a new `0416` section in `tests/scripts/profile-deploy-hardening.test.sh` (run by `npm test`) — the worker
  `proxy_pass` must match exactly, and any **variable** `proxy_pass` must carry `$is_args$args`. **Review R1 (low,
  fixed):** the file-wide check tested the whole line, so the token in a trailing comment passed; now only the directive
  text before `#` / `;` is tested.

## Outcome

- Harness `ALL PASS`; named suites 57/57; full `npm test` 211/211 suites (Docker up, so the Docker-probed harness ran).
- **Not testable locally:** the real production path (host proxy in front of the container nginx).
- **Open live check:** a citizen host + a second account → *"Начать игру"* succeeds with no 403, and the create log line
  carries `, creator:` again. Rides on `0420` ([[decisions/sprint-8]]).
- ⚠️ Editing `nginx.conf` can now turn `npm test` red through this harness — the gate working, per `CLAUDE.md`.

## Related

- [[tasks/private-lobby-citizen-perk]] — task `0302`, the creator check that refused the start
- [[tasks/paid-citizen-ad-free-live]] — task `0398`, during whose live check the 403 surfaced
- [[tasks/yandex-invite-sdk-link]] — task `0382`, useless in production until this ships
- [[systems/networking]] — worker routes and the private-lobby HTTP calls
- [[systems/weekend-deploy-window]] — the 2026-10-08 deploy that surfaced it, and the same-day exception
- [[decisions/sprint-7]] — the board (rank 62)
- [[decisions/sprint-8]] — `0420`, the live-check checklist
