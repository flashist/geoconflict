# 0447 — worklog

## Step 2 — Build (Parts A, C, D, E), 2026-10-12

Built by `fkit-coder` as the **Build worker** of `fkit-sprint-ship-loop`, under the declared-approval marker: owner
approved [`plan.md`](plan.md) (blob `34998f65…`, re-checked with `git hash-object` before starting) via live
`AskUserQuestion` on 2026-10-12, with the plan-gate rulings Q1–Q5 recorded at the end of the plan. **No box was
touched in this step** — Part F (F1 listing, F2 delete) is outside the Build step by the driver's instruction.

### What was built

| Part | File | Change |
|---|---|---|
| A | `update.sh` | `cleanup_env_file()` + `trap cleanup_env_file EXIT` + `trap 'exit N'` for INT (130), TERM (143), HUP (129), PIPE (141), armed right after `ENV_FILE="$1"` — above the `[ ! -f "$ENV_FILE" ]` check and the `source`. Removes only the given path (`rm -f --`). The success branch's own `rm -f` and messages are unchanged (the trap's second `rm -f` is a no-op there). |
| C (IN, ruling Q2) | `update.sh` | `docker pull` is now guarded: on a failed pull, `docker image inspect` decides — image missing → message + `exit 1` **before** the running container is looked up, stopped or removed; image present → warning, deploy continues as before. Success path untouched. |
| B (ruling Q1) | `deploy.sh` | **Not touched.** See *Why deploy.sh was left alone* below. |
| D | `docs/vps-deployment-guide.md` | One paragraph after the env-file bullet list: where the file lives, `0600`, removed on every exit, the residual windows, and Part C's behaviour. |
| D (optional clause, approved with the plan) | `CLAUDE.md` | Harness note: "Since `0447` it also runs `update.sh` end to end against a stubbed `docker`." |
| D | `tests/scripts/profile-deploy-hardening.test.sh` header | Scope list gains `update.sh`'s env-file cleanup + Part C. |
| E | `tests/scripts/profile-deploy-hardening.test.sh` | Docker stub: two fixture knobs written once in `make_stubs` (0371 rule kept — no new executable, no per-test rewrite): `$W/docker_fail_on` (calls matched on `$1` or `"$1 $2"` exit 1) and `$W/docker_signal_on` (`"<call> <SIGNAL>"` → `kill -SIGNAL $PPID`, exit 0). No other test creates either file. New block T72–T76 before the final run_deploy check. |

No new harness file, so `tests/scripts/ShellHarnesses.test.ts` is unchanged; the success marker stays `ALL PASS`.
No TS/JS changed, so `npm run lint` was not needed.

### Tests (T72–T76)

Each case runs the **real** `update.sh` (copied into the fixture) via
`env -i PATH=… perl -e '$SIG{$_}="DEFAULT" for qw(INT TERM HUP PIPE); exec @ARGV' bash update.sh …`, with a fake
0600 env file `uhome/dev-12345.env` (fake values only) and two decoys (`dev-54321.env`, `geoconflict-dev.env`).

- **T72 success:** exit 0, file gone, `Environment file removed.` still printed, success banner, `docker run` got
  `--env-file <that path>`, decoys survive, fake secret in no docker argv.
- **T73 `docker run` fails:** exit 1, `Failed to start container`, file gone, decoys survive.
- **T74 Part C:** pull + `image inspect` fail → exit 1, "left as it is" message, `image inspect` was called, **no
  `docker ps`/`stop`/`rm`/`run`**, file gone. Pull fails but image present → warning, `docker run` runs, exit 0, file
  gone. Pull **and** run fail → exit 1, file gone.
- **T75 signals:** INT/TERM/HUP/PIPE during `pull` → exit 130/143/129/141, file gone, no `docker run`; TERM during `run`
  → 143, file gone, no success banner.
- **T76:** missing env file → exit 1, nothing else deleted; zero args and two args → exit 1, usage, no docker call,
  env file **kept** (residual 3); structural: exactly one `trap … EXIT` (`cleanup_env_file`), armed above both the
  file check and the `source`, all four `trap 'exit N' SIG` lines, guarded pull above `RUNNING_CONTAINER=`.
- The 0060 log-retention lint over `update.sh`'s `docker run` block stays green (block untouched, still column 0).

### Evidence (targeted only — the driver's Verify step owns the one full `npm test`)

- `bash -n update.sh` → clean.
- `bash -n tests/scripts/profile-deploy-hardening.test.sh` → clean.
- `bash tests/scripts/profile-deploy-hardening.test.sh` → **`ALL PASS`**, exit 0, 0 `❌`, ~22 s wall clock on the
  first run (one run, not a benchmark). Re-run after the header-comment edit: `ALL PASS`, exit 0.
- **Mutation check (the new tests bite):** with `update.sh` temporarily replaced by `git show HEAD:update.sh`, the
  harness went red (`SOME FAILED`, 21 `❌`): file LEFT BEHIND on `docker run` failure, on pull+run failure and on
  TERM/HUP/PIPE; SIGINT during pull → exit 0 and the deploy carried on to `docker run` (the "lost SIGINT" the plan
  predicted); `docker ps`/`docker run` ran after a failed pull; every structural check failed. The new `update.sh`
  was restored byte-identically afterwards (`cmp` clean).
- `npm run check:config-parity` (report-only) → `REQUIRED 0`; the new code adds no setting name.

### Not verified (and why)

- **Full `npm test`** — not run here by instruction (one full run at a time; the driver's Verify step runs it).
- **The real "dropped ssh session → HUP/PIPE" link** — the traps are tested by sending the signals directly; a real
  dropped session is live proof for the follow-up verify task (residual 4).
- **The box's bash** — the harness ran on macOS bash 3.2.57; the box runs a newer bash (residual 5).

### Why `deploy.sh` was left alone (Part B, owner ruling Q1 "Leave it to 0444")

- The 21 files come from `update.sh`'s own exits, which Part A covers. What is left on the `deploy.sh` side is tiny
  windows or exotic failures: `chmod 600` failing, the session dropping between the `cat >` and `update.sh` arming its
  trap, or `update.sh` not starting at all.
- `0444` replaces that exact heredoc block with staging + a separate copy step, which opens a **bigger** gap (file
  copied in one login, used in the next). The right place to close all of it is `0444`'s item 5 — the producer makes
  it **required** at close (ruling Q1).
- Touching the block now would also move the line `check-config-parity.mjs` anchors on (`cat > … << 'EOL'`), only for
  `0444` to rewrite it.

### Known residuals

1. SIGKILL (the OOM killer included) or power loss in the middle of `update.sh` — nothing can clean up.
2. The `deploy.sh`-side windows above — for `0444` item 5 (ruling Q1).
3. `update.sh` called with the wrong number of arguments: it cannot know which argument is the file, so it deletes
   nothing. `deploy.sh` always passes exactly one. Asserted as such in T76.
4. A real dropped ssh session is not exercised here — the follow-up verify task.
5. Harness on macOS bash 3.2; box on a newer bash. The behaviour relied on (EXIT trap runs after `exit` from a signal
   trap) is the same in both, but was not run on the box.

### Seen, not in scope (flagged, nothing changed)

- `deploy.sh` writes the file before `chmod 600`, and `update.sh` `source`s unquoted values — both `0444`.
- `update.sh:2` still says "Hetzner" — stale; all boxes are reg.ru.
- Part C's "image already on the box" branch relies on the image surviving the `docker image prune -a -f` that runs
  **before** the pull. It survives only while a container still references it — true for the usual case (re-deploying
  the running tag while the registry is unreachable). Pre-existing ordering, unchanged.

### Decision log (choices made unattended; owner decisions are not listed here)

Build worker, in-plan only — no review fixes in this step.

1. **Part C got a three-line comment above the guarded pull** (the plan's snippet had none). Why: obvious winner within
   the plan's intent — matches the file's comment density (every block in `update.sh` is commented) and changes no
   behaviour.
2. **T74's "never touched the old container" check also asserts no `docker ps`** (the plan named stop/rm/run). Why:
   the stub's `docker ps` prints nothing, so stop/rm alone could never be called and would pass vacuously; asserting
   no `ps` is what makes the check bite against the old script (proved by the mutation run). No stub change needed.
3. **T76's wrong-argument cases cover both zero and two arguments**, and assert the env file is **kept** (residual 3)
   rather than only "nothing deleted". Why: the plan's "nothing deleted" made explicit for both shapes; in-plan.
4. **The new block sits after the 0443 structural sections**, just before the final run_deploy check, rather than
   directly after T71. Why: keeps 0443's tests and structural checks contiguous; ordering-only, no behaviour.
5. **The harness loops use `read -r … <<< "$spec"`, not `set --`.** Why: the harness is one top-level script and other
   sections are not written to expect clobbered positional parameters; mechanical.

## Part F1 — read-only box listing (2026-10-12)
**BLOCKED — not run on either box.** Spawned by `fkit-sprint-ship-loop` under the owner's *"Agent F1, me F2"* ruling.
Nothing was run on any box; no login was attempted (so no failed attempts toward fail2ban).
- Why: the repo's deploy config names **no SSH key** for game dev or game prod (`SSH_KEY_DEV` / `SSH_KEY_PROD` / `SSH_KEY`
  all unset), and the local ssh agent holds **no identities**. `deploy.sh`'s root step needs a key and never logs in as root
  by password (BatchMode); the configured password fallback logs in as the non-root deploy user, which cannot read `/root`.
- Needed: the game keys installed for root and configured locally (task `0445`), **or** the owner runs F1 by hand
  (commands in `plan.md` § *Part F*) and records counts/modes here.

## Step 4 — Process review, round 1 (2026-10-12)
`fkit-coder` as the **Process-review worker** of `fkit-sprint-ship-loop`, under the declared-approval marker (plan blob
`34998f65…`, owner-approved 2026-10-12). Ledger: [`review.md`](review.md). One finding (R1).

- **R1** (prune runs before the guarded pull): verified **CORRECT**, classified **frontier / pre-existing** —
  `docker image prune -a -f` drops every image no container uses, so Part C's fallback finds only an image a container
  still references. Owner ruled *"Record as settled (Recommended)"* → Status `won't fix (frontier)`, Accepted residual
  *pull-fallback-after-prune* added to the ledger. No behaviour change.
- **Residual 5 (box bash), partly addressed:** the reviewer ran the real `update.sh` under **bash 5.2.15** (Debian
  container) for every signal case and a closed-stdout case (per the ledger's Coverage line). That covers "a newer
  bash than 3.2"; it is still **not** the box's own bash, and not a real dropped ssh session (residual 4 unchanged).
- Evidence after the edit: `bash -n update.sh` clean; `bash tests/scripts/profile-deploy-hardening.test.sh` →
  **`ALL PASS`**, exit 0, 0 `❌`. Full `npm test` not run here (driver re-verifies, by instruction).
- Ledger `Status:` set to `closed-out` — nothing blocking remains.

### Decision log (choices made unattended)
1. **R1 → comment-only tweak at the guarded `docker pull` comment in `update.sh`** ("unless the image is still on this
   box — after the prune above, only if a container still uses it …"). Answers R1's optional suggestion. What changed:
   three comment lines became four; no code. Why it qualified: verified-`CORRECT` (the old comment implied any local
   copy would do), mechanical/localized (comment only; no test greps the comment text — checked), in-plan (Part C's
   comment, offered as in-plan by the driver).
