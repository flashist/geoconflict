# Profile-Server Deploys Carry a Version Name, Like the Game (task 0355)

**Source**: `ai-agents/tasks/done/0355-tag-profile-server-deploys-with-a-version-like-the-game/brief.md` (evidence read from the same folder's `plan.md`, `worklog.md` and `review.md`)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 7, rank 28 (append rank; owner-ruled **top** of Sprint 7) / task `0355`

> ✅ Done (agent-closed — not owner-verified), 2026-09-30. Committed in `49a419d`. **Nothing deployed; no real
> git tag or registry tag was ever created.** Verify task **`0358`** is Sprint 8 rank 1 ([[decisions/sprint-8]]),
> owner-run after the weekend profile deploy (next slot 2026-10-03/04). The naming rule is recorded as
> [[decisions/adr-117-server-deploy-version-names]].

## Goal

Owner request, 2026-09-30 (verbatim): *"we need to do tagging of profile and telemetry servers, similarly to the
way we currently tag our game server. We can use the same package.json version for that, but with different
postfixes (e.g. 1.2.3-profile). My idea is not final, I am open for discussion and better solutions."*

**Before:** the game bumps `package.json`, commits, git-tags and serves its version at `/api/version`. The profile
server's image was tagged `profile-<short sha>[-dirty]`, a dirty tree deployed with only a warning, nothing went
to git, `/health` said only `{"status":"ok"}`, and telemetry `service.version` was a hard-coded `"1.0.0"`. "What is
running on that box?" was answerable only from a deploy log on the operator's laptop.

Split (confirmed by the owner): this task is the **profile** server; the telemetry server is **`0356`** (Sprint 7,
rank 29 — **done 2026-10-01**, agent-closed, not deployed: [[tasks/telemetry-deploy-version-tags]]). The game server's own fake `"1.0.0"` became **`0357`** (owner: *"Yes, file it"*, Backlog board).

## Key Changes

- **Owner rulings at the plan gate:** name **`<base>-profile.<N>`** (e.g. `0.0.155-profile.3`; the architect's
  `profile-<base>.<N>` declined); shared `package.json` number, **never written or bumped** by a profile deploy;
  **refuse to deploy** when a shipped file has uncommitted changes (the brief's "warn and deploy" recommendation
  overridden); git tag **only after a successful deploy**; annotated tags.
- **New `scripts/deploy-version-tag.sh`** — the shared helper (`0356` reuses it): base version, next counter,
  shipped-tree dirty check, registry name state, first free name, tag-and-push.
- **`build-deploy-profile.sh`** — registry login → first free version name (registry asked; held → next number,
  unreadable → stop, "Nothing was built") → build → secret byte scan → registry re-check → push the **version name
  as the only registry tag** (`profile-<sha>` dropped, review R2 / owner *Option 1*) → deploy by **`@sha256`
  digest** (unchanged) → annotated git tag after success. No printed `docker push` retry exists any more (R1).
- **`Dockerfile.profile`** — version and commit baked in as late build args / `ENV` plus OCI labels.
- **`src/profile-server/BuildInfo.ts`** (new), **`Routes.ts`**, **`Telemetry.ts`**, **`Server.ts`** — `/health`
  returns `{status, version, commit}`; telemetry `service.version` is the baked name; one boot log line; anything
  unset or not a short plain token reads `"unknown"`.
- **Harness:** `tests/scripts/profile-deploy-hardening.test.sh` grew T20–T39 plus a structural section; the `git`
  stub now **fails on any unstubbed call** (R4). R8 (owner: *"Add the test now"*) pins the registry login to
  `--password-stdin` in both deploy scripts.

## Outcome

- **Evidence:** hardening harness **615 ✅ / 0 ❌, ALL PASS** after review round 2; targeted jest 6 suites 233/233;
  a local `Dockerfile.profile` build showed the labels and that `npm ci` stays cached. ⚠️ The worklog records **no
  full `npm test` run** (each step left it to the loop's Verify step); the Sprint 7 close addendum lists "full
  `npm test`" among the close evidence — not cross-checked here. `shellcheck` not run (not installed).
- **Accepted residuals (owner, *"Accept all three"* + R3 *"Fix the wording, accept"*):** the dirty gate is a
  `git status` check, not proof the image equals the commit (gitignored files under `src/` still ship); a short
  re-check→push window can silently overwrite a registry **label** (never the deployed content); a pushed but
  never-deployed image keeps its name; an offline remote-tag read only warns. Full text lives in the task's
  `review.md`.
- 🚨 **Operational:** every profile deploy now **needs its shipped files committed**, or it refuses. The first
  tagged profile deploy must be the weekend deploy that first ships `0309`'s log line, and **no second profile
  deploy may come before `0297` §1 reads it** (see [[tasks/hmac-construction-log-label]]). A tagging fault is fixed
  with a git command, never by redeploying.
- Open point, filed: registry clean-up rules so a version number is never reused → **`0359`** (Backlog board).

## Related

- [[decisions/adr-117-server-deploy-version-names]] — the naming decision this task built
- [[tasks/profile-deploy-hardening]] — the harness and digest-pinned deploy this extends
- [[tasks/profile-deploy-wiring]] — the deploy wiring and digest passthrough
- [[tasks/hmac-construction-log-label]] — task `0309`: its log line must be read before a second profile deploy
- [[systems/player-profile-store]] — the profile server whose `/health` and telemetry now report the version
- [[systems/project-operations]] — the game's `bump-version.js` flow this mirrors
- [[systems/weekend-deploy-window]] — the slot the first tagged deploy rides
- [[decisions/sprint-7]] — the board; [[decisions/sprint-8]] carries verify task `0358`
- [[decisions/sprint-backlog]] — the Backlog board, where `0357` (game-server version) and `0359` (registry retention) sit
- [[tasks/telemetry-deploy-version-tags]] — task `0356`, the telemetry half, reusing the shared helper (done 2026-10-01)
- [[tasks/hardening-harness-speedup]] — task `0371` (2026-10-02): this task's new harness checks multiplied the stub writes that pushed the hardening harness past its 150 s deadline; fixed test-side
