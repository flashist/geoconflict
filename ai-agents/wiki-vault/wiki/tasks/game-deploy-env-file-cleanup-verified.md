# Verify 0447 on the Boxes — Leftover Deploy Env Files Deleted on Game Dev, a Dev Deploy Leaves None (task 0450)

**Source**: `ai-agents/tasks/done/0450-verify-0447-on-the-boxes-list-the-leftover-deploy-env-files-owner-deletes-them-on-game-dev-and-confirm-a-dev-deploy-leaves-no-file/brief.md` (`worklog.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 8, rank 44 (ADR-035 append rank; merit order owner-confirmed 2026-10-15: `0452` → `0462` → `0449`/`0450`) / task `0450`

> ✅ Done (agent-closed — not owner-verified), closed 2026-10-15 by a spawned `fkit-producer` via `/fkit-task-done`
> (ADR-033 §5 — no owner channel in that spawn). Evidence was relayed by `fkit-lead`; the producer did not see the box
> output. **The box commands were run by `fkit-lead` over SSH with the owner's in-session OK; both deploys were run by
> the owner.** Re-verified by me: nothing — no box access; this page records the worklog.
>
> ⛔ No host, address, secret value, env-file name/path or file contents on this page — counts, modes and dates only.

## Goal

The box half of [[tasks/game-deploy-env-file-cleanup]] (`0447`, repo work only): every game deploy writes a small env
file of server settings and secrets on the box and, before `0447`, removed it only on success — about **21** leftover
`dev-*.env` files had piled up on game dev; game prod had none. This task: (F1) list them read-only, (F2) delete them
on game dev, and prove on the real box that a deploy now leaves no file. Filed in Sprint 8 rather than the next sprint
by owner ruling *"Sprint 8 (Recommended)"* — the same one-off bend of the build/verify-split rule as `0445` and `0449`.
Its deploys waited for `0452`'s pre-checks P1–P4, because any key deploy now also turns SSH password login off
([[tasks/ssh-password-login-off]]); the game key came from [[tasks/ssh-key-login-live]] (`0445`).

## Key Changes

Nothing in the repo. Box work, 2026-10-15 (~13:02–13:1x UTC):

- **F1 (read-only, both game boxes):** game dev — `/root` mode `700`; **21** strict deploy-name matches, all `600
  root:root`; 0 loose non-matching names; "NOT private" list empty; file dates 2025-11-07 → 2026-03-22. Game prod —
  `/root` `700`; **0** matches. ℹ️ A first "deploy running: YES" was a false positive (`pgrep -f` matched the check's own
  command line); re-checked with a self-excluding pattern.
- **Stop-and-ask gates:** none tripped — no secret-rotation question arose.
- **F2 (game dev, 13:04:33 UTC)** — owner ruling *"Yes, you run it (Recommended)"*: dry-run count **21** = F1; deleted
  **21**; afterwards **0** `dev-*.env` in `/root`, 0 strict matches in `/root` and `/home`; game container still up.

## Outcome

| Step | Result |
|---|---|
| 1 F1 both boxes | Met |
| 2 gates | N/a — none tripped |
| 3 F2 delete | Met — 21 = 21, then 0 left, game up |
| 4 deploy check | **Met, with a caveat** — owner's ordinary dev deploy `./deploy.sh dev 20261003-122424` (same-version redeploy, ~13:05 UTC); count after: **0**. The `0447` code (`910bc14`) is an ancestor of the deployed tree. ⚠️ This was **not** the first dev deploy to carry `0447` — two earlier same-day deploys (for `0452` and `0449`) did, but no count was taken after them; it is the first one **checked with a count** |
| 5 failed deploy (optional) | **Run, passed** — owner ruling *"Yes, run it (Recommended)"*: `./deploy.sh dev` with a made-up tag, directly (not `build-deploy.sh`). Pull failed (*manifest unknown*), deploy stopped with *"the running container is left as it is"*; the same container ID was Up before and after, never restarted; game answered on its local web port; **0** env files left |
| 6 dropped ssh session (optional) | **Not run** (allowed) |
| 7 no host/secret in the record | Met |

- **Step 5 is the first box proof of `0447`'s remove-on-failure behaviour** (that run wrote its own env file first) **and
  of its Part C** — a failed pull of an image not on the box leaves the running game alone. The earlier "Environment
  file removed" lines were success-path messages that `update.sh` printed before `0447` too, so they proved neither.
- **Residuals unchanged, out of scope:** the `deploy.sh`-side window (file written but `update.sh` never arms its trap,
  cannot start, or `chmod` fails) → `0444` item 5 (required); a real dropped ssh session (plan residual 4) is still
  unproven on a box; SIGKILL / OOM / power loss mid-run.

## Related

- [[tasks/game-deploy-env-file-cleanup]] — task `0447`, the repo half this task verified
- [[tasks/ssh-key-login-live]] — task `0445`, the game root key this task's box steps needed
- [[tasks/ssh-password-login-off]] — task `0442` / verify `0452`: its pre-checks gated this task's deploys
- [[tasks/ssh-security-alerts]] — task `0443` / verify `0449`: one of the same-day dev deploys that carried `0447` uncounted
- [[systems/weekend-deploy-window]] — the 2026-10-15 game dev deploys
- [[decisions/sprint-8]] — the board (rank 44)
