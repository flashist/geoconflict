# Game Deploy Always Removes Its Env File — and the Leftovers on Game Dev (task 0447)

**Source**: `ai-agents/tasks/done/0447-game-dev-delete-leftover-deploy-env-files-and-make-the-game-deploy-always-remove-its-env-file/brief.md` (`plan.md`, `review.md`, `worklog.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 8, rank 43 (ADR-035 append rank; moved in from the Backlog board 2026-10-12) / task `0447`

> ✅ Done (agent-closed — not owner-verified), closed 2026-10-13 by a spawned `fkit-producer` on the owner ruling
> *"Move it to the verify task (Recommended)"* (2026-10-12; relayed by `fkit-lead`; ⛔ not producer precedent).
>
> ⚠️ **REPO WORK ONLY. THE ~21 LEFTOVER FILES ON GAME DEV ARE STILL THERE.** The read-only listing (F1) was blocked —
> no SSH key is configured for the game boxes yet (`0445`) — and the one-off delete (F2) was never run. Listing, delete
> and a live dev-deploy check moved to the verify task **`0450`** (Sprint 8, Backlog). Committed in `910bc14`;
> `git tag --contains` → none at this sync ⇒ **not deployed**.

> 📌 *2026-10-14 sync:* `910bc14` is in game tag `0.0.164`, deployed to game prod on 2026-10-13
> ([[tasks/ssh-key-login-live]]); the "not deployed" line above is history. Game dev still runs an older build; the
> leftover files there and the dev check are still `0450` (open, now unblocked by `0445`'s key). ⚠️ With `0442`
> committed, `0450`'s dev deploy will also turn SSH password login off on game dev — `0452`'s pre-checks first
> ([[tasks/ssh-password-login-off]]).

> 📌 *2026-10-15 sync:* `0450` now has a worklog. The 2026-10-15 game dev deploy (a same-version redeploy for `0452`)
> printed *"Removing environment file …"* then *"Environment file removed."*, copied in by owner ruling *"Copy it into
> 0450 now (Recommended)"*. ⚠️ **It satisfies none of `0450`'s verification steps** — partial evidence toward step 4
> only: no file count was taken; the ~21 old leftovers are almost certainly still there (F1/F2 not run); those two lines
> are the success-path messages, which `update.sh` printed **before** `0447` too, so they do not show the new
> remove-on-every-exit behaviour; and whether that deploy really carried `0447`'s `update.sh` is **likely, not proven**
> (working-tree state at the time not recorded). `0450` stays `🔲 Backlog`; its game-dev deploys are unblocked by
> `0452`'s pre-checks ([[tasks/ssh-password-login-off]]).

> 📌 *2026-10-15 sync, second run (`aa0973b`):* **the box half is done** — `0450` closed 2026-10-15 (agent-closed — not owner-verified). F1: 21 leftover files on game dev (all `600 root:root`), 0 on prod; F2 deleted the 21; an ordinary dev deploy then left **0**; a deliberately failed dev deploy left the running game up and **0** files — the first box proof of the remove-on-failure path and of Part C. The "still there" warning and the "partial evidence" note above are **history**. Step 6 (a real dropped ssh session) not run; the `deploy.sh`-side window stays with `0444`. [[tasks/game-deploy-env-file-cleanup-verified]]

## Goal

`0443`'s read-only inventory ([[tasks/ssh-security-alerts]]) found **~21 leftover `dev-*.env` deploy files** in root's
home on game dev (12 of them holding the feedback-Telegram setting names; by what the deploy writes, very likely the
other deploy secrets too). Game prod had none. Owner ruling 2026-10-12: *"File a task (Recommended)"* — *"delete them,
and make the deploy always clean up, even when it fails. You approve any box change."* Then moved to Sprint 8: *"Move
it to the Sprint 8"*.

**Cause:** `deploy.sh` writes the env file on the box and runs `update.sh` with its path; `update.sh` removed it **only
on its success branch**, after `docker run`, with no EXIT trap — so every failed deploy left one. Docker reads
`--env-file` only when it creates the container, so removing it afterwards on any path is safe.

**Risk, honestly:** hygiene, not an incident — root on that box can already read the same values from the running
container. Whether every leftover file is 0600 and root-owned is **not recorded** (`deploy.sh` writes before it
`chmod`s).

## Key Changes

| Part | Change |
|---|---|
| A — `update.sh` | `cleanup_env_file()` + `trap cleanup_env_file EXIT`, plus `trap 'exit N'` for INT (130), TERM (143), HUP (129), PIPE (141) — **armed right after the path is known**, before the file check and the `source`. Removes only the given path. Success path unchanged. |
| C — `update.sh` (in scope by ruling Q2) | A failed `docker pull` now checks `docker image inspect`: image missing → message and `exit 1` **before** the running container is looked up, stopped or removed; image present → warning, continue. |
| B — `deploy.sh` | **Not touched** (ruling Q1 *"Leave it to 0444"*). The `deploy.sh`-side windows (file written but `update.sh` never started; `chmod` failing) go to `0444` item 5, made **required**. |
| D — docs | `docs/vps-deployment-guide.md`: the env file is removed on every exit; residual windows; Part C. One `CLAUDE.md` clause: the hardening harness now runs `update.sh` end to end against a stubbed `docker`. |
| E — tests | Hardening harness T72–T76 run the **real** `update.sh` with fault knobs on the existing `docker` stub (no new executable): success, `run` fails, pull fails (image missing / present), signals during `pull` and `run`, wrong argument counts, decoy files survive. Mutation check against the old `update.sh`: 21 failures. |

## Outcome

- Full `npm test` green twice (225/225 suites, 4611 tests); harness ALL PASS; review round 1 closed out.
- **Accepted residual `pull-fallback-after-prune`** (owner *"Record as settled"*): `update.sh` prunes images **before**
  the guarded pull, so the "pull failed but image is here" fallback only finds an image a container still uses —
  in practice, re-deploying the running tag while the registry is down. Failure mode is safe (stop before touching the
  running game).
- **Known residuals:** SIGKILL / OOM / power loss mid-run; the `deploy.sh` windows (→ `0444`); a wrong argument count
  deletes nothing (it cannot know which argument is the file); a real dropped ssh session not exercised (→ `0450`);
  harness ran on macOS bash 3.2, the reviewer also ran it under bash 5.2 — still not the box's own bash.
- **Seen, not in scope:** `update.sh`'s header still says "Hetzner" — stale; the boxes are reg.ru.

## Related

- [[tasks/ssh-security-alerts]] — task `0443`, whose inventory found the files and whose `deploy_cleanup()` `0444` will reuse
- [[tasks/deploy-ssh-key-login]] — task `0441`; the missing game key (`0445`) blocked this task's box listing
- [[tasks/container-log-retention]] — the `update.sh` `docker run` log options the harness still checks
- [[systems/weekend-deploy-window]] — the deploy that will carry the new `update.sh`
- [[decisions/sprint-8]] — the board (rank 43)
- [[decisions/sprint-backlog]] — where `0444` (secrets off the ssh command line, item 5 now required) and the moved row sit
- [[tasks/ssh-key-login-live]] — task `0445`: the game key that unblocks `0450`; `0.0.164` deployed
- [[tasks/ssh-password-login-off]] — task `0442`: a `0450` dev deploy now also turns password login off
- [[tasks/game-deploy-env-file-cleanup-verified]] — task `0450`, the box half: 21 files deleted, deploys leave none
