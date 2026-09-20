# Worklog — 0286: deploy scripts run `apt` with no `DEBIAN_FRONTEND=noninteractive`

**Built by `fkit-coder`, spawned as the Build worker of `/fkit-sprint-ship-loop` (lead session),
2026-09-20.** Implemented steps 1–7 of `plan.md` exactly. **Step 8 (box verification) is the owner's
and was NOT attempted** — it needs the box and it is a write.

⛔ **Do not read this task as "the deploy can no longer hang."** It cannot hang on a **debconf**
prompt. It can still hang on a **dpkg conffile** prompt — see *Residual R1* below, which is a live,
owner-ruled residual, not a theoretical one.

---

## What changed

| File | Change |
|---|---|
| `setup-telemetry.sh` | `export DEBIAN_FRONTEND=noninteractive` + comment block, immediately after `set -e`, above `UPTRACE_DIR="/opt/uptrace"` |
| `setup-profile.sh` | Same, immediately after `set -e`, above `PROFILE_DIR="/opt/profile"`. Comment additionally records that it MUST stay above the pre-flock `util-linux` install. **No other line in the file touched.** |
| `setup.sh` | Same, after the required-env-var guard and before `apt update && apt upgrade -y`. Comment records that this script's `apt-get install -y nginx >/dev/null` suppresses output, so a prompt there would hang printing nothing. |
| `tests/scripts/profile-deploy-hardening.test.sh` | +3 ordering assertions in the *"Structural: on-box flock/marker + telemetry mirror"* section, right after the `flock not before apt` assertion; header covered-file list gains `setup.sh` |
| `CLAUDE.md` | One-line list update — **owner-ruled D4 at the plan gate**. `setup.sh` added to the consequence-1 file list, with the reason it is there. |

**Not touched**, as the plan required: `tests/scripts/ShellHarnesses.test.ts` (its marker is
`/^ALL PASS$/m`, assertion-count-independent — verified by reading it), `build-deploy-*.sh`,
`update.sh`, `deploy.sh`, `nginx.conf`, all three `apt-get upgrade` sites, `0286`'s `## Status`, the
Sprint 4 row, `ai-agents/wiki-vault/`. **No commit, no push.**

### Why script-wide `export`, not a per-call prefix

All three scripts pipe `get.docker.com` into `sh`, and that installer runs `apt-get` itself. Only an
**exported** variable is inherited by that child. Prefixing only our own apt lines would leave a real
prompt surface open while this worklog claimed the script was covered.

### Anchors re-derived by content (not trusted from the plan)

Line numbers had moved since planning, as warned. Re-derived 2026-09-20 on the working tree (frame:
working tree, not a commit — `ai-agents/` files are concurrently modified by other agents):

- `setup-telemetry.sh` — `set -e` at `:41`; export now `:52`; `apt-get update -y && apt-get upgrade -y` at `:179` (was `:168` in the plan).
- `setup-profile.sh` — `set -e` at `:86`; export now `:103`; pre-flock `apt-get install -y util-linux` at `:216` (was `:199`); `apt-get update -y && apt-get upgrade -y` at `:238` (was `:221`); `nginx certbot` at `:1316`; `age rclone` at `:1596`.
- `setup.sh` — `set -e` at `:4`; export now `:29`; `apt update && apt upgrade -y` at `:32` (was `:18`); `apt-get install -y nginx >/dev/null` at `:191`.

The plan's correction to the brief held: `setup-profile.sh`'s `nginx certbot` / `age rclone` calls are
nowhere near the brief's `:1235` / `:1515`.

### Why the harness assertions are anchored where they are

The `setup-profile.sh` assertion anchors on the **pre-flock `apt-get install -y util-linux`** — the
call that installs `flock` itself, and therefore the earliest apt call in the file. Anchoring on the
post-flock `apt-get upgrade` instead would pass green with the export moved under the lock, leaving
that first call exposed. All three assertions match `^[[:space:]]*apt…` so the prose inside each
script's own new comment block cannot satisfy them.

---

## Residuals — live, carried forward

### R1 — dpkg conffile prompts are NOT covered. **Owner-ruled D3: record honestly, do not fix.**

*"Configuration file '/etc/…' … What would you like to do?"* is **dpkg's own** prompt, not debconf's.
`DEBIAN_FRONTEND` does not govern it, and dpkg reads stdin even on a non-tty. Closing it would need
`-o Dpkg::Options::=--force-confold`, which **silently decides which config file wins** — a behaviour
change, and it would rewrite the harness-anchored `apt-get update -y && apt-get upgrade -y` line.
The owner ruled at the plan gate (D3): record it as a residual, do **not** add the flag.

**Consequence, stated plainly: a deploy can still block indefinitely on a dpkg conffile prompt.**
This task narrowed the prompt surface; it did not close it.

### R2 — every behavioural claim about debconf defaults is a PREDICTION until step 8 runs.

Nothing here was verified on a box. The boxes' distro is not recorded anywhere in the repo
(`setup-profile.sh` is deliberately written distro-agnostic). Specifically unverified:

- That a real `npm run deploy:telemetry` / `deploy:profile` now runs prompt-free.
- Whether `keyboard-configuration` / `console-setup` keep their current answers. **Prediction, not a
  finding:** both packages are already configured on the box, so debconf's noninteractive frontend
  should return the value already in the box's debconf database rather than a fresh template default,
  and `/etc/default/keyboard` + `/etc/default/console-setup` should be byte-identical across the
  deploy. **If they change, this fix silently altered box state and must be reconsidered.**
- Whether `needrestart` is installed. If it is, `apt-get upgrade` raises a *"Which services should be
  restarted?"* debconf prompt; the export suppresses it, but its noninteractive default may then
  **restart services automatically mid-deploy** — the G7 scenario `setup-profile.sh`'s compose restart
  policy exists to survive. The owner was told this at the plan gate and ruled D2 (keep the full
  upgrade) knowing it.

**Step 8, for the owner** (from the plan, unchanged): run both deploys and confirm no prompt; capture
`debconf-show keyboard-configuration console-setup` plus `cat /etc/default/keyboard
/etc/default/console-setup` **before and after** (read-only); and `dpkg -l needrestart` +
`cat /etc/os-release`. Record the date, package names, and the diff or its absence — no host, IP, port
or token.

### R3 — `apt` vs `apt-get` at `setup.sh`'s upgrade line: NOT fixed here.

`setup.sh` uses `apt update && apt upgrade -y`, and `apt` has no stable CLI contract for scripts. Real,
separate, out of scope for `0286`. Not filed as a task by this worker.

### R4 — `setup.sh`'s fix is PREVENTATIVE ONLY.

No hang has been observed in `setup.sh`. It is one-time manual game-box provisioning and no deploy
script invokes it — nothing re-runs it. Do not report it as fixing an observed hang.

### R5 — the hardcoded-harness-list residual is untouched.

No new `.sh` file was created, so `CLAUDE.md`'s known residual (a new harness not registered in
`tests/scripts/ShellHarnesses.test.ts` is gated by nothing) is neither widened nor narrowed.

### R6 — the three new assertions are LINTS over ordering, not behavioural tests.

They catch the cheap regression (export deleted, or moved below the first apt call). A genuinely
prompt-free deploy is observable only on the box — step 8.

### R7 — `npm test` now goes red for one more file's editors.

Editing `setup.sh` can now turn `npm test` red, for people touching no test code. That is
`CLAUDE.md` consequence 1 widening by one file; `CLAUDE.md` was updated accordingly under D4.

---

## Evidence — actual command output

### Step 1 — baseline, before any edit

```
$ bash tests/scripts/profile-deploy-hardening.test.sh
  …
  ✅ profile-checks.sh: check 12 has the negative-age guard (a future-dated marker must never read GREEN)

ALL PASS
EXIT=0
```

### Step 6 — red-then-green, proving the assertions are not vacuous

**6a. Three scripts reverted (`git checkout --`), harness edit kept.** Confirmed
`grep -c DEBIAN_FRONTEND` = `0` in all three. All three new assertions RED, and nothing else in the
harness broke:

```
  ❌ setup-profile.sh: no exported DEBIAN_FRONTEND=noninteractive above the pre-flock 'apt-get install -y util-linux' — an unattended deploy can block on a debconf prompt (task 0286)
  ❌ setup-telemetry.sh: no exported DEBIAN_FRONTEND=noninteractive above its apt upgrade — this is the script that actually prompted the owner three times (task 0286)
  ❌ setup.sh: no exported DEBIAN_FRONTEND=noninteractive above its apt upgrade — and this script's nginx install suppresses output, so a prompt hangs printing nothing (task 0286)
SOME FAILED
```

**6b. Scripts restored.** Same three assertions green, whole harness green:

```
  ✅ setup-profile.sh: DEBIAN_FRONTEND exported before the pre-flock util-linux install (the earliest apt call)
  ✅ setup-telemetry.sh: DEBIAN_FRONTEND exported before 'apt-get update -y && apt-get upgrade -y'
  ✅ setup.sh: DEBIAN_FRONTEND exported before 'apt update && apt upgrade -y'
ALL PASS
```

**6c. Extra proof the plan did not ask for, because "exists" and "precedes" are different claims.**
Moved `setup-profile.sh`'s export from `:103` to just *below* the pre-flock `util-linux` install
(line 216) — i.e. the exact "helpful tidy" the assertion exists to catch — leaving the other two
scripts alone. Only the profile assertion went red:

```
  ❌ setup-profile.sh: no exported DEBIAN_FRONTEND=noninteractive above the pre-flock 'apt-get install -y util-linux' — an unattended deploy can block on a debconf prompt (task 0286)
  ✅ setup-telemetry.sh: DEBIAN_FRONTEND exported before 'apt-get update -y && apt-get upgrade -y'
  ✅ setup.sh: DEBIAN_FRONTEND exported before 'apt update && apt upgrade -y'
SOME FAILED
```

Restored from a scratchpad copy and verified `diff` clean (`RESTORED IDENTICAL`).

### Step 7 — local gates

**`bash -n`** — syntax, the only static gate these files have (`npm run lint` is ESLint over TS and
does not read `.sh`):

```
$ bash -n setup-telemetry.sh setup-profile.sh setup.sh
(no output)
exit=0
```

**Hardening harness:** `ALL PASS`.

**`npm test`** — green, Docker **up**, so the Docker-probed harness ran rather than skipping (0 skipped
tests in the tally):

```
PASS tests/scripts/ShellHarnesses.test.ts (77.728 s)

Test Suites: 138 passed, 138 total
Tests:       1870 passed, 1870 total
Snapshots:   0 total
Time:        77.984 s
```

⚠️ **`CLAUDE.md`'s recorded cost figures are now stale** — it says 113 suites / 1185 tests / ~22–25 s;
this host measured **138 suites / 1870 tests / ~78 s**. That drift is from repo growth since `0201`,
**not** from this change. Noted, deliberately **not** edited here: it is outside `0286`'s approved
change surface, and D4 authorised exactly one line.

**`npm run lint`:**

```
$ npm run lint
> eslint
(no output)
LINT_EXIT=0
```

**`npm run check:config-parity`** — proven unchanged, not assumed. Ran it after the change, then
`git stash push`ed only the three scripts, ran it again, and diffed:

```
PARITY OUTPUT: byte-identical before vs after
```

Both runs: `REQUIRED 0` on all three pipelines; no `DEBIAN_FRONTEND` entry appears anywhere in the
output, as expected for a deploy-time shell variable `src/` never reads. ⚠️ Parity does not reach
telemetry variables at all — the same residual `0277` and `0284` record.

### Step 8 — NOT RUN. Owner's.

Needs the box and it is a write. Nothing in this worklog is evidence that a real deploy is
prompt-free.

---

## Decision log — autonomous actions taken without asking

Per ADR-019's audit obligation, carried to the sprint-loop Build-worker path by ADR-032.

**Fixes applied without asking: none** — this was a Build spawn implementing an approved plan, not a
review-fix pass. No review finding was answered here.

**Obvious-winner calls made without asking: one.**

1. **Added evidence step 6c** (the moved-export proof) on top of the plan's step 6. *Why it qualified:*
   strictly additive verification inside the approved plan's own intent — the plan's own words for that
   assertion are *"this is the assertion that would catch someone 'helpfully' moving the export under
   the lock,"* and step 6 as written (delete the export entirely) proves only *exists*, not *precedes*.
   It changed no source, touched no file permanently (restored and `diff`-verified identical), and
   widened no scope.

**Judgment calls surfaced rather than decided:** the stale `CLAUDE.md` cost figures (113 suites /
1185 tests / ~22–25 s vs 138 / 1870 / ~78 s measured). Left unedited and reported to the driver — D4
authorised one line, and rewriting the cost block is outside the approved change surface.

---

## Decision log — review round 1 (Process-review worker, 2026-09-20)

**Second `fkit-coder` spawn on this task** — Process-review worker of `/fkit-sprint-ship-loop`, under
the same declared-approval marker (owner approved `plan.md` 2026-09-19; rulings on all three of the
reviewer's round-1 open questions relayed live 2026-09-20). Findings verified before acting; the
reviewer's *Reviewer findings* section was not edited.

**Fixes applied without asking: two.** Both answer a finding the **owner had already ruled on**, so
neither is a fix chosen by this worker — the discretion exercised was only in *how* to implement the
ruling, and both stayed mechanical and inside the approved plan's change surface
(`tests/scripts/profile-deploy-hardening.test.sh` + a `setup.sh` comment, the same two files the plan
already lists).

1. **Answers R1 — the three ordering assertions proved "above **this named** apt line", not "above the
   script's **first** apt call" as `CLAUDE.md` claims.** *What changed:* the three per-script `awk`
   expressions in `tests/scripts/profile-deploy-hardening.test.sh` were replaced by one shared
   `FRONTEND_ORDER` program with **first-match guards** (`{if(!e)e=NR}` / `{if(!u)u=NR}`) and a
   **generic anchor** `^[[:space:]]*apt(-get)?[[:space:]]`; the comment block above them was rewritten
   to record all three old failure mechanisms; the three failure messages were reworded to be true in
   every failing branch. **No `setup-*.sh` logic touched; `CLAUDE.md` not edited or softened.**
   *Why it qualified:* **verified `CORRECT` by reproduction** — the old program was run against mutated
   copies and all three claimed mechanisms reproduced, including the serious one (an apt call added
   above the export passed **green**). **Mechanical and localized** — one harness file, one awk program.
   **Inside the approved plan** — the plan's step 5 owns these exact assertions, and the owner ruled
   "tighten the lint (option (a))", naming both the first-match guards and the generic anchor.
   *Proven, not assumed:* red with the export removed, red with the export moved below the first apt
   call, red on the new-apt-above-export class the old lint passed green, green on restore
   (`RESTORED IDENTICAL`); and the anchor proven **non-vacuous** — 13 matched lines across the three
   files, every one a real apt invocation, first match = the intended anchor in each.
2. **Answers R2 — `setup.sh`'s comment claimed a prompt would hang "printing nothing at all", but
   `>/dev/null` redirects stdout only.** *What changed:* `setup.sh`'s comment now states the redirect is
   **stdout only**, that debconf's readline frontend writes the question on stdout so a prompt hangs
   **printing no prompt**, and that **stderr stays attached** so apt's own warnings would still reach
   the operator; the harness's `setup.sh` failure text carries the same corrected wording. *Why it
   qualified:* **verified `CORRECT`** against `setup.sh:192` (`apt-get install -y nginx >/dev/null` —
   stdout only, stderr unredirected). **Mechanical** — comment/message wording, zero behaviour change.
   **Inside the approved plan** and explicitly owner-ruled ("reword"). ⚠️ Note this is the one place
   R1's "harness only" constraint does not apply: R2's ruling authorises the `setup.sh` **comment** too.

**Obvious-winner calls made without asking: two.**

1. **Reworded the three assertion messages** rather than keeping the old text. *Why it qualified:* with
   a generic anchor, a failure message naming one specific apt line would itself be **false** — and
   making the promise literally true is the whole point of the ruling. Keeping the old text would have
   preserved mechanism (c)'s misdiagnosis, which R1 explicitly names. One option clearly dominates;
   stays inside the ruling's intent.
2. **Recorded the generic anchor's own new false-positive class in the harness comment** (an apt line
   inside a heredoc that merely *generates* an on-box script would count as the first apt call).
   *Why it qualified:* strictly additive honesty about a limitation this change introduces, written
   where a future editor who trips it will read it; verified today's 13 matches contain no such line,
   so it is a documented limitation and not a live defect. No behaviour change, no scope widening.

**Judgment calls surfaced rather than decided (returned to the driver, not acted on):** none new. R3
(`apt` vs `apt-get`) was **owner-ruled "file it as its own task"** and filing is a producer's act —
this worker neither fixed nor filed it, and left residual R3 above as written. D2/D3/D4 and the stale
`CLAUDE.md` cost block (`0280`'s) were not re-opened.

### Gates after the round-1 fixes

`bash -n` on all three scripts exit 0 · hardening harness **`ALL PASS`** exit 0 · `npm test`
**138 suites / 1870 tests passed** (Docker up, 0 skipped) · `npm run lint` exit 0.

⚠️ Wall clock **89.7 s** vs the Build worker's ~78 s on this host. Same counts; reported rather than
rounded to match. Load, not this change — `0280` records a 59–85 s spread for this gate and 89.7 s sits
just above it. Not investigated, not filed.

⛔ **Step 8 (owner-executed box run) is still the only outstanding gate and is unaffected by this
round.** Nothing in round 1 is evidence that a real deploy is prompt-free.

---

## R2 RESOLVED — box facts verified read-only, 2026-09-20

> ⚠️ **Written by `fkit-lead` (the driver), not by a coder.** A transparent deviation from "the worklog
> is the Build worker's": the task is parked pending owner step 8, no worker was running, and the
> alternative was leaving verified evidence unrecorded until someone re-derived it. **Nothing here is
> source; nothing here is a review.** Recorded on an owner ruling given live via `AskUserQuestion`
> (*"Yes — check both boxes"*). ⛔ Not precedent.

**Residual R2 said:** *"box claims are predictions. Distro unrecorded in the repo; `needrestart`
presence unknown (if installed, the suppressed default may restart services mid-deploy — the G7
scenario; owner ruled D2 knowing this)."* **Both halves are now established.**

### What was run

Read-only SSH to both boxes. No writes, no deploy, no restart. ⛔ No host, IP, port, token or
credential appears here or was written anywhere.

### Findings

| | profile box | telemetry box |
|---|---|---|
| Distro | **Ubuntu 26.04.1 LTS** | **Ubuntu 24.04.5 LTS** |
| `needrestart` | **INSTALLED**, 3.11-1ubuntu2 | **INSTALLED**, 3.6-7ubuntu4.5 |
| apt hook `99needrestart` | present | present |
| `$nrconf{restart}` set in `/etc/needrestart/`? | **no** — only the commented `#$nrconf{restart} = 'i';`, so the package default `i` (interactive) applies | same |
| `/etc/default/keyboard` (sha256, first 12) | `9d2d64b5b738` | `9d2d64b5b738` |
| `/etc/default/console-setup` (sha256, first 12) | `e8601d8158ed` | `8910fde8c8dc` |

⚠️ **The two boxes are NOT on the same Ubuntu release.** Any behavioural claim proven on one is not
automatically true of the other — which is why the code path below was read on **both**.

### 🎯 The G7 fear is REFUTED — `needrestart` downgrades to LIST, it does not auto-restart

Read from `/usr/sbin/needrestart` on each box (line numbers differ by version; the code is identical):

```perl
my $debian_noninteractive = (exists($ENV{DEBIAN_FRONTEND}) && $ENV{DEBIAN_FRONTEND} eq 'noninteractive');
...
$is_tty = 0 if($opt_r eq 'i' && $debian_noninteractive);
$opt_r  = 'l' if(!$is_tty && $opt_r eq 'i');
```

profile box: `:220`, `:270`, `:271` · telemetry box: `:231`, `:281`, `:282`.

With the restart mode at its default `i` and `DEBIAN_FRONTEND=noninteractive` exported, `needrestart`
forces `$is_tty = 0` and then rewrites the mode to **`l` (list)** — **not `a` (automatic)**. It prints
which services would need restarting and **restarts nothing**.

⇒ **On these two boxes, at these two versions, the export makes `needrestart` quieter AND safer.** The
G7 scenario the plan feared — services restarting mid-deploy with nothing printed — **does not occur**;
the opposite does. The owner ruled D2 accepting that risk, and the risk turns out not to be present.

### ⛔ The limits of this — do not over-read it

- **Version- and config-specific.** It holds for `needrestart` 3.11/3.6 with **no uncommented**
  `$nrconf{restart}`. A package upgrade, or anyone setting `$nrconf{restart} = 'a'` in
  `/etc/needrestart/conf.d/`, changes the answer. ⚠️ And `apt-get upgrade -y` — which owner ruling D2
  **keeps** — is itself capable of upgrading `needrestart`.
- ⛔ **It says nothing about a real deploy.** Step 8 is **still required and still the owner's**. This
  removes one predicted hazard; it does not prove a deploy runs prompt-free.
- ⛔ **It does not touch residual R1** (dpkg conffile prompts), which remains uncovered by design under
  owner ruling D3.
- The two `/etc/default/*` digests above are the **"before" half** of step 8's before/after capture,
  taken early. If they differ after the deploy, the fix altered box state and must be reconsidered.
