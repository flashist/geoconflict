# Deploy Scripts Run `apt` Non-Interactively (task 0286)

**Source**: `ai-agents/tasks/done/0286-deploy-scripts-run-apt-with-no-debian-frontend-noninteractive-a-deploy-blocks-on-a-dialog/brief.md`
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 6, rank 32 (append position, not merit) / priority `Low` (owner-ruled 2026-09-22) / task `0286`

> ✅ **Closed 2026-09-29** `(agent-closed — not owner-verified)` on an owner ruling relayed by `fkit-lead`
> (*"Write note, then close"*). The owner ran plan step 8 on the boxes on **2026-09-26**.
>
> ⛔ **Never write this up as "the deploy can no longer hang."** It can no longer hang on a **debconf**
> prompt. It **can still hang on a dpkg conffile prompt** — residual R1, recorded rather than fixed by owner
> ruling D3.

## Goal

On **2026-09-18** the owner's `npm run deploy:telemetry` (run for task `0284`, not caused by it) stopped three
times on `debconf` prompts (`keyboard-configuration` country, `console-setup` encoding and character set). A
deploy that can block on a dialog cannot run unattended, and an unattended run would **hang silently rather
than fail**: nothing errors, so `set -e` never fires. `DEBIAN_FRONTEND` appeared in none of the three deploy
scripts. `setup-profile.sh` had the same exposure across more `apt` calls, and `setup.sh` suppresses the
output of its nginx install, so a prompt there would print nothing.

## Key Changes

- **One script-wide `export DEBIAN_FRONTEND=noninteractive`** near the top of `setup-telemetry.sh`,
  `setup-profile.sh` and `setup.sh`, each with a comment block. **Why script-wide, not per call:** all three
  scripts pipe the Docker convenience installer into `sh`, and that installer runs `apt-get` itself; only an
  **exported** variable reaches that child process.
- In `setup-profile.sh` the export must stay above the pre-lock `util-linux` install (the call that installs
  `flock`, and so the earliest `apt` call). No other line in that file changed, and no `apt` line was touched
  in any script (the three scripts show additions only).
- **Hardening harness** (`tests/scripts/profile-deploy-hardening.test.sh`): three new ordering assertions, one
  per script — the export must sit above that script's first `apt` call. They match only real `apt` lines, so
  the prose in each new comment block cannot satisfy them. `setup.sh` joined the harness's covered-file list.
- **`CLAUDE.md`** gained `setup.sh` in the hardening-harness file list (owner ruling D4). This is why `setup.sh`
  now appears there at all.
- **Owner ruling D2 — keep the full `apt-get upgrade -y` in the deploys.** The brief's raise-do-not-settle
  question (keep / security-only / drop) was put to the owner at the plan gate; the upgrade lines are
  unchanged.

## Outcome

- **Step 8, owner-executed 2026-09-26** (see [[systems/weekend-deploy-window]]):
  - **Telemetry box** (Ubuntu 24.04.5 LTS — the first time its distro was recorded anywhere): the deploy ran
    with **no prompt**, and the "after" capture was **byte-identical** to the "before" one (all debconf lines,
    both `/etc/default` files, `needrestart`, `os-release`). So the fix changed **no box state** on the box
    where the defect was seen.
  - **Profile box** (Ubuntu 26.04.1 LTS): **no debconf prompt** in the full log. ⚠️ **No profile-box "after"
    capture exists**, so "no settings changed" is proven on the telemetry box only.
  - `needrestart` is installed on both boxes; with the export it switches to list mode and restarts nothing
    (read from its code on both boxes, 2026-09-20).
- **Gaps carried into the close, NOT closed:** the full list of packages that `apt-get upgrade` upgraded or
  installed during either deploy was **never captured** — only the in-scope packages are recorded.
- **Residuals:**
  - **R1 — dpkg conffile prompts are NOT covered** (owner ruling D3: record, do not fix). Closing it would need
    a dpkg option that silently decides which config file wins, and would rewrite the harness-anchored upgrade
    line.
  - **R3 — `setup.sh` uses `apt` where the other two scripts use `apt-get`** (`apt` has no stable CLI for
    scripts). Filed separately as `0290` on the Backlog board.
  - **R4 — `setup.sh`'s fix is preventative only.** No hang was ever seen there; it is one-time manual
    game-box provisioning that no deploy script re-runs.
- ⚠️ Adjacent but different, not fixed here: `apt-daily-upgrade` can hold the apt lock during a deploy's
  upgrade. That one **fails loud** under `set -e` and is simply re-run.
- **Evidence at build (2026-09-20):** `bash -n` exit 0; hardening harness `ALL PASS`; `npm test` 138 suites /
  1870 tests; `npm run lint` exit 0; review round 1 closed out with full Codex coverage.

## Related

- [[systems/weekend-deploy-window]] — the 2026-09-26 window where step 8 ran
- [[tasks/alert-path-liveness-probe]] — task `0284`, the deploy during which the prompts were seen (observed during, not caused by)
- [[tasks/setup-profile-heredoc-root-command-execution]] — task `0282`, another `setup-profile.sh` defect under the same harness
- [[tasks/profile-deploy-hardening]] — the hardening harness these new assertions extend
- [[decisions/sprint-6]] — the board that carried and closed this task
- [[decisions/sprint-4]] — the board that first carried it
- [[decisions/sprint-5]] — the board it passed through
