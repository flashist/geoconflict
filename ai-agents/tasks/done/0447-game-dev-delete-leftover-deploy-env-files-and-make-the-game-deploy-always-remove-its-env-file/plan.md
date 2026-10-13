# Plan — 0447: clear the leftover deploy env files on game dev, and make the game deploy always remove its env file

## Summary
- **The cause, confirmed in the code.** `update.sh` deletes its secrets file in one place only: the success branch after `docker run` (`update.sh:106-109`). It has no `EXIT` trap. In practice the one failure that leaves a file is **`docker run` failing** (`exit 1` at `update.sh:112`), along with Ctrl-C, a dropped ssh session, a wrong argument count or a missing file. `update.sh` has **no `set -e`**, so a failed `docker pull` or `docker stop` does **not** stop the script. It carries on to `docker run`.
- **The fix is about 15 lines in `update.sh`.** One cleanup function plus traps, armed before the file is checked or loaded. It removes only the path the script was given, and the success path does exactly what it does today.
- **`deploy.sh` is not touched (recommended).** Three small gaps remain that only `deploy.sh` could close, listed below. `0444` rewrites that exact block anyway. This is open question 1.
- **⚠️ I found a separate, existing problem, which is not a cleanup bug.** When `docker pull` fails (for example a wrong tag or digest), `update.sh` still **stops and removes the running game**, and then `docker run` fails. The game stays down until the next good deploy, on dev and prod alike. The follow-up verify task's planned "deliberately failed deploy with a nonexistent tag" would take game dev offline. An optional fix (Part C) is open question 2.
- **Tests:** new behaviour tests in the existing harness, `tests/scripts/profile-deploy-hardening.test.sh` (T72–T76). They run the real `update.sh` against the shared stubbed `docker`. No new harness, so `ShellHarnesses.test.ts` does not change. The marker stays `ALL PASS`.
- **Box work is done by the owner only.** It is a read-only listing on game dev and prod, then a one-off delete on game dev that matches the deploy's own exact file name. The commands are below. No agent has touched any box in this step.
- **Verified so far:** only how bash handles signals and the EXIT trap, tried locally with `bash -c` and no files written (results below). Nothing has been built or run against the repo yet.

## What I read
- The brief, `deploy.sh` (all of it), `update.sh` (all of it), `docs/vps-deployment-guide.md`, and the parts of `tests/scripts/profile-deploy-hardening.test.sh` that matter here: the stubs (lines 44–345), the 0060 `update.sh` lint (885–930), the 0441/0443 `deploy.sh` cases (3141–3375, last test T71), and the tail.
- Also: `tests/scripts/ShellHarnesses.test.ts` (header), the `0443` worklog § Surprises, `0444`'s brief item 5, and how `scripts/check-config-parity.mjs` reads `update.sh`. It only checks names that appear in the text, so adding code there cannot break the check.
- Wiki: `update.sh` appears only in the 0060 log-retention notes. Nothing there conflicts with this plan.
- **`0443` has landed.** `deploy_cleanup()` and its single `EXIT` trap are already in `deploy.sh`.

## How the file gets left behind today
`deploy.sh` sends a single ssh command to the box. It does three things in order:
1. writes `<home>/<DEPLOYMENT_ID>-<RANDOM>.env` with `cat >` (on dev this is `/root/dev-NNNNN.env`, where NNNNN is 0–32767)
2. runs `chmod 600` on it
3. runs `update-openfront.sh <file>` (the copy of `update.sh` it uploaded)

| Where it stops | File left today? | After this change |
|---|---|---|
| `docker run` fails | yes | **removed** |
| `docker pull` / stop / rm fails | no exit at that point; it goes on to `docker run` | removed whichever way it ends |
| Ctrl-C, ssh session dropped (HUP/PIPE), kill (TERM) | yes | **removed** |
| file named but missing / not a file | nothing to leave | `rm -f` does nothing |
| Wrong argument count | yes, if a file was written | **still left.** `update.sh` cannot know which argument is the file. `deploy.sh` always passes exactly one. Residual. |
| `chmod 600` fails, or the session drops in the milliseconds between writing the file and `update.sh` arming its trap, or `update.sh` cannot start at all (bad copy, noexec home) | yes | **still left.** `update.sh` never ran. Only a `deploy.sh` change closes this (open question 1). Residual. |
| SIGKILL (including the OOM killer) or the box losing power mid-deploy | yes | **still left.** Nothing can clean up. Residual. |

**Docker reads `--env-file` only when it creates the container.** So removing the file on any path is safe. Today's success path already does it.

**Signal behaviour, checked locally** (`bash -c` with a child process signalling its parent, bash 3.2, no files written):
- With traps set, INT, TERM, HUP and PIPE all exit with 130, 143, 129 and 141, and the EXIT cleanup runs.
- **With no INT trap, a SIGINT is effectively lost while bash waits on a child.** The script continued and exited 0. That is why the traps are explicit, not left to defaults.
- A failing command inside the EXIT trap does not change the script's exit code.

## Part A — `update.sh` (the fix)
Insert right after `ENV_FILE="$1"` (line 12), before the `[ ! -f "$ENV_FILE" ]` check and long before `source`:

```bash
# Remove the env file on EVERY exit, not only after a successful docker run (task 0447). It
# holds every deploy secret; before this, any earlier exit (docker run failing, a Ctrl-C, a
# dropped ssh session) left it in the deploy user's home, and 21 piled up on game dev.
# Armed BEFORE the file is checked or loaded, so no later step can skip it. Docker reads
# --env-file only when it CREATES the container, so removing it afterwards is safe on every
# path (the success branch below already did). Removes ONLY the path this script was given.
# Silent on purpose: after a dropped session stdout is gone. INT/TERM/HUP/PIPE go through
# `exit`, so the cleanup runs for them too (HUP/PIPE are what a dropped ssh session
# delivers). Not covered: SIGKILL (the OOM killer included) and power loss.
cleanup_env_file() {
    [ -n "$ENV_FILE" ] && rm -f -- "$ENV_FILE"
    return 0
}
trap cleanup_env_file EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
trap 'exit 129' HUP
trap 'exit 141' PIPE
```

- The explicit `rm -f` and its messages on the success branch stay exactly as they are, so the success output and behaviour are unchanged. The trap's second `rm -f` does nothing at that point.
- This is the only `EXIT` trap in `update.sh`. `deploy.sh`'s `deploy_cleanup` runs in a different process on the operator's machine, so the two cannot replace each other.
- A dropped session, a signal or Ctrl-C still ends the deploy at the same point it does today. The only difference is that the file gets removed.
- Exit codes: `docker run` failing still exits 1. A signal now gives 129, 130, 141 or 143 instead of dying silently. `deploy.sh` (`set -e`) passes any non-zero result through as a failed deploy, as it does today.
- The new file reaches the box on the **very next deploy**: `deploy.sh` uploads `update.sh` before every run. No box setup is needed.

## Part B — `deploy.sh`: left alone (recommended, open question 1)
- **Why:** the gaps that remain are in the "Still left" rows of the table above. They are tiny windows or need an exotic failure. The 21 files come from `update.sh`'s own exits, which Part A covers.
- `0444` replaces this exact heredoc block with staging plus a separate copy step. That opens a **bigger** gap (file copied in one login, used in the next), so the right place to close it is `0444`'s item 5, made required.
- Changing the block now would also touch the line the config-parity checker anchors on (`cat > … << 'EOL'`, `check-config-parity.mjs:159`), only for `0444` to rewrite it.
- I record this reasoning in the worklog, as the brief asks.
- If the owner picks the alternative in open question 1, it is **one remote-side line**, not a second local trap. The ssh command string would start with `trap 'rm -f ${ENV_FILE}' EXIT;` (it runs in the box's shell, so it does not conflict with `deploy_cleanup`). Plus one test case in the 0441/0443 block.

## Part C — keep the running game when the new image cannot be pulled (ONLY if the owner says yes to open question 2)
Replace the bare `docker pull "${DOCKER_IMAGE}"` (line 41) with:

```bash
if ! docker pull "${DOCKER_IMAGE}"; then
    if ! docker image inspect "${DOCKER_IMAGE}" >/dev/null 2>&1; then
        echo "❌ Could not pull ${DOCKER_IMAGE} and it is not on this box — the running container is left as it is."
        exit 1
    fi
    echo "⚠️ Pull failed, but ${DOCKER_IMAGE} is already on this box — deploying it."
fi
```

- It stops **before** the old container is touched, but only when the image is really missing. That keeps today's one case where a failed pull still works: re-deploying an image already on the box while Docker Hub is unreachable.
- It changes a failure path only. The success path is untouched.

## Part D — docs
- `docs/vps-deployment-guide.md`, after the bullet list at line 38–42 that describes the env file: add one sentence. The file lives in the deploy user's home on the box, is created 0600, and `update.sh` removes it on **every** exit, success or failure. The exceptions are a hard kill or power loss mid-deploy, plus the small `deploy.sh`-side window closed by `0444`.
- If Part C is in: one more sentence saying a failed pull of a missing image leaves the running game alone.
- Optional (the owner approves by approving this plan): one clause in `CLAUDE.md`'s harness note — "Since `0447` it also runs `update.sh` end to end against a stubbed `docker`". `update.sh` is already listed there as a file whose edits can turn `npm test` red.
- Header comment of the harness: add `update.sh`'s env-file cleanup to its scope list.

## Part E — tests (`tests/scripts/profile-deploy-hardening.test.sh`, new block after T71)
**Stub change.** It is written once in `make_stubs`, keeping the 0371 rule: no new executables and no per-test rewrite. Inside the existing `docker` stub, after its two logging lines:
- `$W/docker_fail_on`: lines such as `run`, `pull`, `image inspect`. A call whose `$1` or `"$1 $2"` matches exits 1.
- `$W/docker_signal_on`: `"<subcommand> <SIGNAL>"`. The stub runs `kill -<SIGNAL> $PPID`, which is `update.sh`'s bash, and exits 0.
- Profile and telemetry tests never create these files, so their behaviour is unchanged.

**Runner, `run_update`:**
- Copies the real `update.sh` into `$WORK/urun/`.
- Writes a fake env file `$WORK/uhome/dev-12345.env` (0600) with `GAME_ENV=dev ENVIRONMENT=dev DEPLOYMENT_ID=dev DOCKER_IMAGE=acme/game:0.0.1` and one obviously fake secret.
- Writes two decoys next to it that must survive: `dev-54321.env` (same naming) and `geoconflict-dev.env`.
- Runs `env -i PATH="$BIN:$PATH" … perl -e '$SIG{$_}="DEFAULT" for qw(INT TERM HUP PIPE); exec @ARGV or die' bash update.sh <file>`.
- **Why perl:** a signal ignored when the shell starts (for example `npm test` launched as a background job, or under nohup) cannot be trapped. The test would then be wrong in a way that depends on how it was launched. Resetting the signals first makes it deterministic. If perl is missing, the test fails loudly. It never skips green.
- `docker ps` prints nothing in the stub, so the `sleep 5` branch never runs. That keeps the cost to well under a few seconds against the harness's 150 s deadline. No timing was measured yet.

**Cases:**
- **T72 success:** exit 0. The env file is gone. `Environment file removed.` is printed. Both decoys survive. `docker run` was called with `--env-file <that path>`. The existing 0060 log-option lint stays green, because the `docker run` block is untouched and still at column 0.
- **T73 `docker run` fails:** exit 1, `Failed to start container`, file gone, decoys survive.
- **T74 `docker pull` and `docker run` fail** (the realistic missing-image case):
  - Without Part C: exit 1, file gone, decoys survive.
  - With Part C: same, also `image inspect` failing. It asserts that **no `docker stop`/`rm`/`run` call happened**, and adds a case where pull fails but `image inspect` succeeds. That deploy continues to exit 0 with the file gone.
- **T75 signals:** INT, TERM, HUP and PIPE, each sent during `pull`, plus TERM during `run`. Expects exit 130, 143, 129 or 141, file gone, decoys survive, and (for the pull cases) no `docker run` call, so it stopped where it does today.
- **T76 edge cases:**
  - missing file path: exit 1, decoys survive
  - wrong argument count: exit 1, nothing deleted
  - structural checks:
    - exactly one `trap … EXIT` in `update.sh`
    - the EXIT trap line sits **above** both `[ ! -f "$ENV_FILE" ]` and `source "$ENV_FILE"`
    - all four `trap 'exit N' SIG` lines are present
- Every case checks that the fake secret never appears in `docker.argv`.

**Run order (the CLAUDE.md test rules):**
1. `bash -n update.sh`.
2. `bash tests/scripts/profile-deploy-hardening.test.sh` directly: a targeted run, not jest, so it takes no lock. It must end with `ALL PASS`.
3. **One** full `npm test` through the npm script (project lock; about 5 min at 1 worker). Never `npx jest`, and never two full runs at once.
4. A single `Exceeded timeout of 5000 ms` in a supertest suite is judged by the known-flake rule. If that happens I re-run and say so.

## Part F — box steps (OWNER runs them, or explicitly OKs an agent running the read-only listing)
Nothing written down names a host or address, and nothing ever prints file contents. The worklog records counts and modes only.

**F1 — read-only listing, on game dev, then the same on game prod, as root:**
```bash
stat -c '%a %U' /root                                           # expect 700 root
find /root /home -maxdepth 2 -type f -name '*.env' -printf '%m %u:%g %s %TY-%Tm-%Td %p\n' | sort -k5
echo "strict deploy-name matches:"; find /root /home -maxdepth 2 -type f -regextype posix-extended -regex '.*/(dev|staging|prod)-[0-9]{1,5}\.env' | wc -l
echo "NOT private (group/other bits, or not root-owned):"; find /root /home -maxdepth 2 -type f -regextype posix-extended -regex '.*/(dev|staging|prod)-[0-9]{1,5}\.env' \( -perm /077 -o ! -user root \) -printf '%m %u %p\n'
```
- Expected: about 21 or more on dev (more if dev deploys failed since 2026-10-12), 0 on prod, and an empty "NOT private" list.
- **Stop and tell the owner before deleting** if any of these are true:
  - a file is not 0600/root
  - `/root` is not 700
  - a `dev-*.env` name does not match the strict pattern
  - prod is not 0
- Note: `/root/geoconflict-dev.env` (seen by `0443`) is **not** a deploy leftover. The strict pattern never matches it.

**F2 — one-off delete, game dev only, as root, when no deploy is running:**
```bash
pgrep -af update-openfront.sh || echo "no deploy running"        # must say "no deploy running"
P='/root/dev-[0-9]{1,5}\.env'
find /root -maxdepth 1 -type f -regextype posix-extended -regex "$P" | sort    # dry run: exactly what goes
find /root -maxdepth 1 -type f -regextype posix-extended -regex "$P" | wc -l   # must equal F1's dev count
# only if the count matches:
find /root -maxdepth 1 -type f -regextype posix-extended -regex "$P" -print -delete | wc -l
# proof:
find /root -maxdepth 1 -type f -name 'dev-*.env' | wc -l                       # expect 0
docker ps --filter name=geoconflict-dev --format '{{.Names}} {{.Status}}'       # game still up (it never needed the files)
```
- `-maxdepth 1 -type f` means: no subfolders and no symlinks, only real files directly in `/root`, named exactly the way `deploy.sh` names them.
- This is not a deploy, so no weekend slot is needed unless the owner says otherwise.
- It does not depend on Parts A–C. It can run before or after the code ships. Until the fix is deployed, a failed dev deploy can still add a file.
- The worklog records the counts before and after, and the modes. No names of hosts, no contents.

## Sequencing
1. Part A, then Part C if approved, then E (tests), then D (docs). Run the harness directly, then one full `npm test`.
2. Worklog: the decision log, the record of why `deploy.sh` was left alone, and the residuals.
3. Review (stateful) through the driver.
4. F1/F2 whenever the owner chooses, independent of the code.
5. At close, the producer files the verify task at the top of the next sprint (build/verify split rule): one ordinary dev deploy leaves no file, and optionally one deliberately failed dev deploy. ⚠️ **Without Part C, that failed-deploy test with a nonexistent tag takes game dev offline** until the next good deploy.

## Known residuals (recorded in the worklog)
1. SIGKILL / OOM kill / power loss in the middle of `update.sh`.
2. The `deploy.sh`-side windows: `chmod 600` fails; the session drops between writing the file and `update.sh` arming its trap; `update.sh` cannot start. These are for `0444` item 5, unless open question 1 says otherwise.
3. `update.sh` called with the wrong number of arguments.
4. The real "dropped ssh session gives HUP/PIPE" link is not tested here. The traps are tested by sending the signals directly. Live proof belongs to the verify task.
5. The harness runs on macOS bash 3.2. The box runs a newer bash. The behaviour relied on (EXIT trap after `exit` from a signal trap) is the same in both, but it was not run on the box.

## Seen, not in scope (flagged, not changed)
- `deploy.sh` writes the file before running `chmod 600`, and `update.sh` `source`s unquoted values. Both belong to `0444`.
- `update.sh:2` still says "Hetzner", which is stale. All boxes are reg.ru.

---

## Owner rulings at the plan gate (added by `fkit-lead`, 2026-10-12 — live `AskUserQuestion`; the plan text above is unchanged)
- **Plan:** *"Approve (Recommended)"*.
- **Q1 (tiny deploy.sh gap):** *"Leave it to 0444 (Recommended)"* — Part B stands: `deploy.sh` untouched; the producer makes `0444`'s item 5 required at close.
- **Q2 (failed image download takes the game down):** *"Yes, include Part C (Recommended)"* — Part C is IN.
- **Q3 (box steps):** *"Agent F1, me F2 (Recommended)"* — an agent may run the read-only F1 listing; the owner runs F2 (or approves it line by line after F1's numbers).
- **Q4 (rotate secrets):** *"Only if a file is not private (Recommended)"* — no rotation if F1 shows every file private to root; otherwise stop and ask.
- **Q5 (auto-sweep on every deploy):** *"No, not in this task (Recommended)"*.
