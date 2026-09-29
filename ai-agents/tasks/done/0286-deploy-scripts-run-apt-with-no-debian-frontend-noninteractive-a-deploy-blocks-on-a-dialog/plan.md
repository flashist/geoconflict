# Plan — 0286: deploy scripts run `apt` with no `DEBIAN_FRONTEND=noninteractive`

> **Written by `fkit-sprint-ship-loop` (the driver) at plan approval, 2026-09-19, BEFORE the Build
> spawn.** Copied from the planning worker's returned plan, not re-rendered or summarised.
>
> ⚠️ **One declared transformation:** the worker's reply reached the driver with HTML entities escaped
> (`&amp;` `&gt;` `&lt;`) and with `|` escaped as `\|` inside markdown tables. Those were un-escaped to their
> literal characters when writing this file. **No other change was made to the worker's text.**

## Owner decisions taken at this plan gate — 2026-09-19, live in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead`

⛔ **Not producer/coder precedent — four rulings, one task.**

| # | Question put | Owner ruled |
|---|---|---|
| **D1** | Approve this plan? | **Approve — build it.** |
| **D2** | The brief's mandated question: does `apt-get upgrade -y` belong in a deploy at all? | **Keep as-is.** All three full-upgrade sites stay. |
| **D3** | dpkg conffile prompts stay uncovered — how handled? | **Record it honestly as a residual.** Do NOT add `--force-confold`. |
| **D4** | May `CLAUDE.md` gain one line (add `setup.sh` to the consequence-1 list)? | **Yes — add it.** |

⚠️ **D2 was answered with the tradeoff stated:** the owner was told this fix makes an unattended full
upgrade **quieter, not safer**, and that with `needrestart` present services could restart mid-deploy
with nothing printed — the G7 scenario. They ruled keep-as-is knowing that.

⚠️ **D2 does not change this plan's change surface.** The plan already leaves all three upgrade sites
untouched, which is why it was safe to approve either way.

---

## The approved plan, as returned by the planning worker

> **Citation frame.** Re-derived by reading the working tree on 2026-09-19, **not** a commit:
> `git status` shows `ai-agents/tasks/backlog/0286-…/brief.md` itself modified and uncommitted, and a
> producer is concurrently editing other files. Per
> `ai-agents/knowledge-base/conventions/file-line-citations.md`, a commit hash is **not** a sufficient
> frame here (the CONCURRENT UNCOMMITTED EDITS shape). Line numbers below are the exception-case aid
> only; **every one is paired with a greppable content anchor, which is the actual citation.**

### 1. The exposure, as it actually is

| Script | apt call sites (content anchor) | Line today |
|---|---|---|
| `setup-telemetry.sh` | `apt-get update -y && apt-get upgrade -y` | `:168` |
| | `apt-get install -y docker-compose-plugin` | `:242` |
| | `apt-get install -y nginx certbot` | `:827` |
| | `curl -fsSL https://get.docker.com | sh` — **runs apt-get internally** | `:236` |
| `setup-profile.sh` | `apt-get install -y util-linux` (**pre-flock**) | `:199` |
| | `apt-get update -y && apt-get upgrade -y` (**harness-anchored**) | `:221` |
| | `apt-get install -y docker-compose-plugin` | `:343` |
| | `apt-get install -y ufw` | `:355` |
| | `apt-get install -y unattended-upgrades` (**harness-anchored**) | `:397` |
| | `apt-get install -y fail2ban python3-systemd` | `:451` |
| | `apt-get install -y nginx certbot` | **`:1299`** (brief said `:1235`) |
| | `apt-get install -y age rclone` | **`:1579`** (brief said `:1515`) |
| | `unattended-upgrades --dry-run --debug` | `:434` |
| | `curl -fsSL https://get.docker.com | sh` — **runs apt-get internally** | `:328` |
| `setup.sh` | **`apt update && apt upgrade -y`** — ⚠️ **the brief missed this one** | `:18` |
| | `apt-get install -y nginx >/dev/null` (output suppressed) | `:177` |
| | `sh get-docker.sh` — **runs apt-get internally** | `:27` |

Confirmed: `DEBIAN_FRONTEND` and `debconf` appear **nowhere** in the repo outside `0286`'s own brief
and sprint row.

**Why the owner was prompted over SSH at all** (mechanism, since the fix depends on it):
`build-deploy-telemetry.sh` / `build-deploy-profile.sh` run the remote script with plain
`ssh host "…"` — **no `-t`**, so no tty. debconf therefore falls back from `dialog` to its
`readline`/`teletype` frontend, which still reads the **stdin ssh forwards from the owner's local
terminal**. That is why it asked instead of failing. Unattended (no terminal on stdin) the same read
blocks forever, holding the lock, with `set -e` never firing.

### 2. Decision: **script-wide `export`, immediately after `set -e`** — not per-call prefixes

The brief left this to me. Script-wide, for three reasons, the first of which is decisive:

1. **A per-call prefix cannot reach the Docker installer.** All three scripts pipe `get.docker.com`
   into `sh`, and that installer runs `apt-get update`/`apt-get install` itself. Only an **exported**
   variable is inherited by that child. Prefixing our own eight/three/two lines would leave a real
   prompt surface open while the worklog claimed the script was covered — the worst outcome available.
2. **It is the brief's own stated preference** ("fewer places for the next `apt-get install` to be
   added without it"), and it also covers `unattended-upgrades --dry-run --debug`.
3. **Zero textual change to either harness-anchored line.**

Placement is **not interchangeable** in `setup-profile.sh`: its earliest apt call
(`apt-get install -y util-linux`) runs **before** `flock -n 9`, because that is the call that installs
`flock`. An export placed after the lock would leave the first apt call uncovered. Anchoring on
`set -e` puts it above everything in all three scripts and keeps them mirrored (`setup-profile.sh`'s
header: *"Mirrors `setup-telemetry.sh` (do NOT invent a parallel pattern)"*).

### 3. Steps

**Step 1 — baseline, before touching anything.**
`bash tests/scripts/profile-deploy-hardening.test.sh` → expect `ALL PASS`. Record it. Without this a
later green proves nothing.

**Step 2 — `setup-telemetry.sh`.** Insert after `set -e`, above `UPTRACE_DIR="/opt/uptrace"`:

```bash
# ── Unattended package operations (task 0286) ─────────────────────────────────
# A deploy runs with no terminal to answer debconf. Without this, `apt-get upgrade` stopped
# three times on keyboard-configuration/console-setup prompts (observed 2026-09-18) — and
# unattended it would WAIT FOREVER holding the apt lock, with set -e never firing.
# EXPORTED, not prefixed per call, deliberately: get.docker.com's installer below runs
# apt-get itself, which only an exported variable reaches — and any apt line added later
# inherits it.
# ⚠️ NOT a universal muzzle: it suppresses the PROMPT and takes debconf's stored (or default)
# answer. dpkg's own conffile prompt is NOT governed by it (see the worklog).
export DEBIAN_FRONTEND=noninteractive
```

**Step 3 — `setup-profile.sh`.** The same block, same anchor (after `set -e`, above
`PROFILE_DIR="/opt/profile"`), wording adjusted to note it must stay above the pre-flock `util-linux`
install. Nothing else in this file changes — in particular **`apt-get update -y && apt-get upgrade -y`
is not touched, moved relative to `flock -n 9`, or reworded**, and the `apt-daily-upgrade` comment's
*"that line is harness-anchored and not changed here"* clause **remains true**, so it is left alone.

**Step 4 — `setup.sh`.** The same block after `set -e`, placed **after** the required-env-var guard and
**before** `apt update && apt upgrade -y`. Comment adds the file-specific point: this script's
`apt-get install -y nginx >/dev/null` suppresses output, so a prompt here hung printing nothing at all.
*Not changed:* `apt` → `apt-get` at `setup.sh:18` (`apt` has no stable CLI for scripts). Real, separate,
out of scope — recorded in the worklog, not fixed here.

**Step 5 — new harness assertions**, in the existing *"Structural: on-box flock/marker + telemetry
mirror"* section of `tests/scripts/profile-deploy-hardening.test.sh`, right after the
`flock not before apt` assertion. Three ordering checks, in the file's existing `awk`-ordering idiom:

- `setup-profile.sh`: `export DEBIAN_FRONTEND=noninteractive` exists **and precedes
  `apt-get install -y util-linux`** (the earliest, pre-flock apt call). This is the assertion that
  would catch someone "helpfully" moving the export under the lock.
- `setup-telemetry.sh`: export exists and precedes `apt-get update -y && apt-get upgrade -y`.
- `setup.sh`: export exists and precedes `apt update && apt upgrade -y`.

Two knock-ons, both handled in the same change:
- The harness header enumerates the files it covers (`setup-profile.sh`, `setup-telemetry.sh`,
  `build-deploy-telemetry.sh`, `update.sh` + `nginx.conf`). Adding `setup.sh` makes that list wrong →
  the header sentence is updated with it.
- `tests/scripts/ShellHarnesses.test.ts` needs **no** change: its marker is `/^ALL PASS$/m`, which is
  assertion-count-independent. Verified by reading it.

**Step 6 — prove the new assertions are not vacuous.** Revert only the three script edits (keep the
harness edit), run the harness, show the three new assertions **RED**; restore, re-run, `ALL PASS`.
Same evidence pattern `0262`'s brief asks for. A structural assertion never shown red is not evidence.

**Step 7 — local gates.**
- `bash -n setup-telemetry.sh setup-profile.sh setup.sh` (syntax; the only static gate these files have
  — `npm run lint` is ESLint over TS and does not read `.sh`).
- `bash tests/scripts/profile-deploy-hardening.test.sh` → `ALL PASS`.
- `npm test` → green, ~22–25 s (the shell harnesses are unconditional;
  `scripts/test-check-docker-secret-boundary.sh` may report `○ skipped` if Docker Desktop is down —
  **that is not a pass**, and it will be reported as skipped, not green).
- `npm run lint` → exit 0.
- `npm run check:config-parity` → unchanged. `DEBIAN_FRONTEND` is a deploy-time shell variable, never
  read by `src/`, so parity cannot see it. ⚠️ Parity does not reach telemetry variables anyway — the
  same residual `0277` and `0284` record.

**Step 8 — box verification. Owner-executed; I cannot do this** (it is a write, it needs the box, and
no host may appear in any artifact).
- `npm run deploy:telemetry` runs start to finish with **no prompt**.
- `npm run deploy:profile` likewise — the larger surface, and the one the three pending live tails
  (`0014`, `0221`, `0220`) all run.
- **Evidence for *What to build* 4** — which packages this actually affects:
  `debconf-show keyboard-configuration console-setup` on the box **before and after** (read-only), plus
  `cat /etc/default/keyboard /etc/default/console-setup`. **Expected** (stated as a prediction, not a
  finding): because both packages are already configured on that box, debconf's noninteractive frontend
  returns the **value already in the box's debconf database** rather than a fresh template default — so
  those files should be byte-identical across the deploy. **That expectation is what the before/after
  capture is for. If the files change, the fix silently altered box state and must be reconsidered.**
- Worklog records the date, the package names, the diff (or its absence). No IP, hostname, port or token.

### 4. Edge cases and non-obvious failure modes the plan accounts for

1. **The pre-flock apt call** (`setup-profile.sh`, `apt-get install -y util-linux`). Placement below the
   lock silently leaves the first apt call exposed. Gated by the Step-5 assertion, not just by care.
2. **The Docker convenience script's internal apt** — reachable only by an exported variable. This is
   why the decision is script-wide.
3. **dpkg conffile prompts are NOT covered.** *"Configuration file '/etc/…' … What would you like to
   do?"* is dpkg's own prompt, not debconf's; `DEBIAN_FRONTEND` does not govern it, and dpkg will read
   stdin on a non-tty. Closing it needs `-o Dpkg::Options::=--force-confold`, which **silently decides
   which config file wins** — a behaviour change, not this fix. **Deliberately out of scope, recorded
   as a live residual**, and it is the reason this task must not be written up as *"the deploy can no
   longer hang."*
4. **ucf-managed files ARE covered, and in the direction we want.** `setup-profile.sh` overwrites
   `/etc/apt/apt.conf.d/20auto-upgrades`, which `unattended-upgrades` manages via `ucf` — and `ucf`
   asks through debconf, so `noninteractive` keeps **our** file. Worth stating: without the export, a
   future upgrade of that package could have prompted to replace the `0221` config.
5. **`needrestart`.** On recent Ubuntu, `apt-get upgrade` triggers a *"Which services should be
   restarted?"* debconf prompt. The export suppresses it — but its noninteractive default may then
   **restart services automatically mid-deploy**, which is exactly the G7 scenario `setup-profile.sh`'s
   compose restart policy exists to survive. **Unverified: I cannot tell from the repo whether
   `needrestart` is installed, or the distro.** Verification step: `dpkg -l needrestart` +
   `cat /etc/os-release` (read-only, box-side) alongside step 8.
6. **The boxes' OS is not recorded anywhere in the repo.** `setup-profile.sh` is written
   distro-agnostic on purpose (*"the pocket name on both Ubuntu and Debian"*). Every behavioural claim
   about debconf defaults is therefore a prediction until step 8 runs.
7. **`setup.sh` is not invoked by any deploy script** — one-time manual game-box provisioning; nothing
   re-runs it (`0262`'s brief says the same). Its fix is **preventative only** and must not be reported
   as fixing an observed hang.
8. **The harness is a `bash <path>` invocation of a mode-644 file** and `npm test`'s only gate on it.
   The hardcoded-harness-list residual is untouched: no new `.sh` file is created here.
9. **`npm test` can go red for someone who touched no test code** — that is consequence 1 in
   `CLAUDE.md`, and adding `setup.sh` to the covered set widens it by one file.

### 5. Change surface

| File | Change |
|---|---|
| `setup-telemetry.sh` | +1 `export` + comment, after `set -e` |
| `setup-profile.sh` | +1 `export` + comment, after `set -e`. **No other line touched** |
| `setup.sh` | +1 `export` + comment, after the env guard |
| `tests/scripts/profile-deploy-hardening.test.sh` | +3 ordering assertions; header covered-file list updated |
| `CLAUDE.md` | **owner-approved at this gate (D4)** — one-line list update |

Not touched: `tests/scripts/ShellHarnesses.test.ts`, `build-deploy-*.sh`, `update.sh`, `deploy.sh`,
`nginx.conf`, `0286`'s `## Status`, the Sprint 4 row, `ai-agents/wiki-vault/`. No commit, no push.

### 6. Evidence — what is verified vs. not

**Verified at planning time, by reading the tree:** every apt call site and its content anchor;
`DEBIAN_FRONTEND`/`debconf` absent repo-wide; both harness anchors are `awk` content-ordering, so the
fix leaves them green; the harness carries **no** fixed-line-number assertion against any `setup-*`
file; the `ShellHarnesses.test.ts` marker is `ALL PASS`; `setup-profile.sh:393-395`'s *"not changed
here"* clause stays true; all three scripts share a `set -e` + constants prologue; both build-deploy
scripts invoke the remote script as a child bash over `ssh` with no `-t`.

**NOT verified, and cannot be from a planning run:** any box state (distro, `needrestart`, debconf
answers, `/etc/default/keyboard`); that a real deploy now runs prompt-free; `npm test` / harness / lint
actual results — **the planning run executed no test**; dpkg's exact conffile behaviour on these boxes'
dpkg version.

---

## Open questions as returned — and their dispositions

- **Q1 — does `apt-get upgrade -y` belong in a deploy at all?** → **RULED D2: keep as-is.** The planner
  noted, and the owner was told, that there are **three** full-upgrade sites, not the brief's two:
  `setup-telemetry.sh:168`, `setup-profile.sh:221`, and **`setup.sh:18`**. This plan leaves all three
  untouched.
- **Q2 — the dpkg conffile residual.** → **RULED D3: record it honestly as a residual.** Do **not** add
  `-o Dpkg::Options::=--force-confold`; that would be a policy change and would rewrite the
  harness-anchored line.
- **Q3 — may one line be added to `CLAUDE.md`?** → **RULED D4: yes**, add `setup.sh` to the
  consequence-1 list of files whose edits can turn `npm test` red.
