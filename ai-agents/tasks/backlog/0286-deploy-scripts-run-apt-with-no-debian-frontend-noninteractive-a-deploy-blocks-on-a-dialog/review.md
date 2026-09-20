# Review — 0286

Task: `ai-agents/tasks/backlog/0286-deploy-scripts-run-apt-with-no-debian-frontend-noninteractive-a-deploy-blocks-on-a-dialog/brief.md`
File(s) under review (working tree, uncommitted — scoped by the driver's change table, **not** by
`git diff`, which also carries ~2 dozen unrelated `ai-agents/` + `wiki-vault/` edits from other agents):

- `setup-telemetry.sh` (export + comment after `set -e`)
- `setup-profile.sh` (same, above the pre-flock `util-linux` install)
- `setup.sh` (same, after the env guard)
- `tests/scripts/profile-deploy-hardening.test.sh` (+3 `awk` ordering assertions; header covered-file list)
- `CLAUDE.md` (one line — owner-ruled D4)
- `<task-folder>/worklog.md`

Status: in-review

Round 1 verdict: **✅ Ready to merge (validation-gated — plan step 8, owner-executed box run, is the
only remaining gate).** No confirmed defect in the fix. Two low/info accuracy findings, both about
wording and lint precision, neither blocking.

Reviewers run, round 1: **fkit-reviewer (Claude, own pass)** + **Codex (`codex-cli 0.152.0`,
`codex exec --sandbox read-only`) — ran to completion, exit 0. Coverage: FULL, model-diverse.**

## Reviewer findings

| #  | Round | Sev  | file:line | Claim |
|----|-------|------|-----------|-------|
| R1 | 1     | low  | `tests/scripts/profile-deploy-hardening.test.sh:312`, `:316`, `:320` + `CLAUDE.md:216-218` | The three ordering assertions enforce "export is above **this named** apt line", not "above the script's **first** apt call" as `CLAUDE.md:217` states. Two mechanisms, one root cause — each `awk` uses a **hard-coded** apt anchor and **last-match** `{e=NR}`/`{u=NR}`: (a) an apt call added **above** the export passes green (the old anchor still satisfies `e<u`), silently reopening the hang the assertion exists to prevent; (b) a second, redundant `export DEBIAN_FRONTEND=noninteractive` added **below** the anchor moves `e` past `u` and fails with a message that says no export exists when one does; (c) legitimately removing or rewording the anchored apt line sets `u=0` and fails with the same misdiagnosing text. First-match guards (`{if(!e)e=NR}` / `{if(!u)u=NR}`) plus a generic anchor (`^[[:space:]]*apt(-get)?[[:space:]]`) would make the assertion enforce the claim the harness comment (`:303-307`) and `CLAUDE.md` both already make. Raised by **both** reviewers (Codex findings 1 and 2, merged here). |
| R2 | 1     | info | `setup.sh:20-22`, restated at `tests/scripts/profile-deploy-hardening.test.sh:322` | "a prompt there would hang **printing nothing at all**" is stronger than the redirection proves. `setup.sh:191` is `apt-get install -y nginx >/dev/null` — **stdout only**. stderr stays attached, so debconf's frontend-fallback warning and apt's own stderr would still reach the operator's terminal. The prompt text itself would indeed be swallowed (debconf's readline frontend writes the question on stdout), so the point survives — the absolute "nothing at all" does not. Raised by Codex. |

**Notes that are deliberately NOT findings rows** (recorded so round 2 does not re-derive them):

- **Answering the driver's explicit angle — "is there an apt/debconf-reachable path the change
  misses?"** Verified exhaustively, both reviewers independently: **no missed path inside the three
  scripts.** The export precedes every in-script apt call in all three files (`setup-profile.sh`
  `:216, :238, :360, :372, :414, :468, :1316, :1596` and `unattended-upgrades --dry-run` `:450`;
  `setup-telemetry.sh` `:179, :253, :838`; `setup.sh` `:32, :191`), and it reaches the
  `get.docker.com` / `get-docker.sh` child's internal `apt-get` **because it is exported** — the
  plan's decisive argument for script-wide over per-call, and it is correct. Also checked and clear:
  **no `sudo`, `su`, or `env -i`** anywhere in the three scripts (any of which would have dropped the
  variable via `env_reset`); no apt/dpkg call in `build-deploy-profile.sh`, `build-deploy-telemetry.sh`,
  `update.sh`, `deploy.sh`, or in any heredoc-generated on-box script or cron entry
  (`profile-checks.sh:346-353` only *reads* reboot-required); no long-lived process inherits the
  variable in a way that changes container or systemd behaviour.
- **The only apt sites in the repo not covered are the three Dockerfile lines** — `Dockerfile:8`,
  `Dockerfile:67`, `Dockerfile.profile:18` — which run `apt-get` with no `DEBIAN_FRONTEND`. **Out of
  `0286`'s approved change surface** (the brief and plan scope to deploy shell scripts) and a debconf
  hang there is near-impossible in `docker build` (stdin is not a terminal). **Informational only —
  do not fix it under `0286`.**
- **The worklog does not overclaim.** It opens with "⛔ Do not read this task as 'the deploy can no
  longer hang'", carries R1–R7 as live residuals, and marks every box-side behavioural claim
  (`needrestart`, debconf stored answers, `/etc/default/keyboard`) as a **prediction, not a finding**,
  pending step 8. Its re-derived line anchors were spot-checked and are accurate (`setup.sh` export
  `:29`, `setup-profile.sh` `:103`, `setup-telemetry.sh` `:52`).
- **The harness header list is internally consistent**, not drifted: it omits `build-deploy-profile.sh`
  because that file is the harness's *primary* subject (stated at `:1-9`), not one of the files the
  trailing structural sections widened into. `CLAUDE.md`'s list naming both is also correct.

## Coder response

<!-- CODER-OWNED. The reviewer never writes here. -->

**Round 1 processed by `fkit-coder`, spawned as the Process-review worker of
`/fkit-sprint-ship-loop`, 2026-09-20.** Both findings verified against the code before any edit;
**R1's three mechanisms were reproduced, not read off the review.** Owner rulings on all three of the
reviewer's open questions were relayed with this spawn (live `AskUserQuestion`, 2026-09-20, via
`fkit-lead`) — ⛔ **not precedent.**

| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R1 | **CORRECT — confirmed by reproduction, all three mechanisms (a), (b), (c)** | **Defect in the lint, not in the fix.** The shipped `export` ordering in all three scripts was and is correct; what was wrong is the assertion's ability to *prove* it. | **Owner ruled: tighten the lint (reviewer's option (a)).** Replaced the three per-script `awk` expressions with one shared `FRONTEND_ORDER` program using **first-match guards** (`{if(!e)e=NR}` / `{if(!u)u=NR}`) and a **generic anchor** `^[[:space:]]*apt(-get)?[[:space:]]`. Failure text reworded to be true in every failing branch (missing export **or** not-first), since with a generic anchor a message naming one specific apt line would itself be false. **Harness only — no `setup-*.sh` logic touched, `CLAUDE.md` not softened.** | **FIXED** |
| R2 | **CORRECT.** `setup.sh:192` is `apt-get install -y nginx >/dev/null` — stdout only; stderr is unredirected. "printing nothing at all" overstates it. | Accuracy of a comment. Neither a defect in behaviour nor a frontier-move. | **Owner ruled: reword.** `setup.sh`'s comment now says the redirect is **stdout only**, that debconf's readline frontend writes the question on stdout, so a prompt hangs **printing no prompt** — and states explicitly that stderr stays attached so apt's own warnings would still reach the operator. The harness failure text at the `setup.sh` assertion carries the same corrected wording. | **FIXED** |

### R1 — the reproduction, before the change (why the verdict is CORRECT and not taken on trust)

Ran the **old** `awk` program against mutated copies of `setup-profile.sh` in a scratch dir. All three
mechanisms the reviewer claimed, reproduced exactly:

```
R1(a) CURRENT: GREEN (assertion passed) <-- bug confirmed   # apt call added ABOVE the export
R1(b) CURRENT: RED (fails though an export exists above)    # redundant 2nd export below the anchor
R1(c) CURRENT: RED (u=0, misdiagnosing message)             # anchored apt line merely reworded
baseline: GREEN (correct)                                   # unmutated file
```

**(a) is the one that mattered**: the exact regression the assertion exists to prevent — a new apt
call landing above the export — passed **green**. The reviewer's severity of `low` is arguably
generous to the old code; it is recorded as the reviewer wrote it and not re-litigated.

### R1 — hard requirement 1: the tightened assertions still bite (red-then-green, live harness)

Not the awk in isolation — the **real harness**, on the **real files**, mutated and restored.

**Proof 1 — export removed from all three scripts** (`grep -c DEBIAN_FRONTEND` = 0 in each):

```
EXIT=1
  ❌ setup-profile.sh: 'export DEBIAN_FRONTEND=noninteractive' is missing, or does not precede this script's first apt call (today the pre-flock util-linux install) — …
  ❌ setup-telemetry.sh: … does not precede this script's first apt call — …
  ❌ setup.sh: … does not precede this script's first apt call — …
SOME FAILED
```

**Proof 2 — export present but moved BELOW the first apt call** (the "helpful tidy"):

```
setup-profile.sh       export now at 216, first apt at 215
setup-telemetry.sh     export now at 179, first apt at 178
setup.sh               export now at  34, first apt at  33
EXIT=1 … all three ❌ … SOME FAILED
```

**Proof 3 — the NEW class, which the old lint passed green**: `apt-get install -y curl` inserted one
line **above** the export in each script. All three now **red** (`EXIT=1`, `SOME FAILED`). This is
mechanism (a) closed, demonstrated on the live harness.

**Restore → green:**

```
setup-profile.sh RESTORED IDENTICAL
setup-telemetry.sh RESTORED IDENTICAL
setup.sh RESTORED IDENTICAL
EXIT=0
  ✅ setup-profile.sh: DEBIAN_FRONTEND exported above its first apt call (the pre-flock util-linux install)
  ✅ setup-telemetry.sh: DEBIAN_FRONTEND exported above its first apt call
  ✅ setup.sh: DEBIAN_FRONTEND exported above its first apt call
ALL PASS
```

Restores were `cp` from pre-mutation copies and `diff -q`-verified; `git diff --stat` afterwards shows
only the four intended files differing from `HEAD`.

### R1 — hard requirement 2: the tightening is not vacuous in the new direction

A generic anchor matching **nothing** would make every assertion pass trivially. It matches, and its
first match is the intended anchor line in each file (printed from the live files, post-change):

| Script | `export` at | First generic-anchor match |
|---|---|---|
| `setup-profile.sh` | `:103` | `:216` `apt-get update -y >/dev/null 2>&1 && apt-get install -y util-linux …` (**pre-flock**) |
| `setup-telemetry.sh` | `:52` | `:179` `apt-get update -y && apt-get upgrade -y` |
| `setup.sh` | `:31` | `:34` `apt update && apt upgrade -y` |

Full enumeration of every line the anchor matches — **13 lines across the three files, every one a
real apt invocation, none a comment or prose line**: `setup-profile.sh` `:216 :238 :360 :372 :414
:468 :1316 :1596`; `setup-telemetry.sh` `:179 :253 :838`; `setup.sh` `:34 :192`. The anchor requires
`apt`/`apt-get` at line start (modulo leading whitespace) followed by whitespace, so each script's own
`# … apt-get …` comment prose cannot satisfy it — the property the pre-existing comment already
claimed, preserved.

### New residual introduced by the tightening — recorded, not hidden

**A generic anchor matches TEXT.** An apt line inside a heredoc that merely *generates* an on-box
script would count as that script's "first apt call". **No such line exists in any of the three files
today** (the 13-line enumeration above is exhaustive and every match is a real invocation). If one is
ever added above the export the assertion fails as a **false positive**; the right response is to move
the export above it, not to re-narrow the anchor. Written into the harness comment block itself, where
whoever trips it will actually read it.

### Gates re-run after the change

| Gate | Result |
|---|---|
| `bash -n setup-telemetry.sh setup-profile.sh setup.sh` | exit 0, no output |
| `bash tests/scripts/profile-deploy-hardening.test.sh` | **`ALL PASS`**, exit 0 |
| `npm test` (Docker daemon **up**, so the Docker-probed harness ran, 0 skipped) | **138 suites / 1870 tests, all passed** — matches the driver's independent pre-change measurement exactly |
| `npm run lint` | exit 0 |

⚠️ **One number differs from the Build worker's, reported rather than rounded to match:** wall clock
was **89.7 s** (`ShellHarnesses.test.ts` 89.4 s) against the Build worker's ~78 s. Same host, same
suite and test counts; the spread is load, not this change — `0280` already records a 59–85 s spread
for this gate, and 89.7 s sits just above it. **Not investigated further and not filed** (the stale
`CLAUDE.md` cost block is `0280`'s, per the accepted residual below).

### R3 — deliberately NOT actioned by this worker

`apt` vs `apt-get` at `setup.sh`'s upgrade line. **Owner ruled: file it as its own task** — and filing
is a **producer's** act, routed separately by the driver. This worker neither fixed it nor filed it,
and left worklog residual R3 as written. The *Accepted residuals* entry below is left exactly as the
reviewer wrote it, including its "not yet asked" clause, which was true when written.

### Not re-opened

D2 (`apt-get upgrade -y` stays in all three scripts), D3 (the dpkg conffile residual stays open,
`--force-confold` declined), D4 (the `CLAUDE.md` line is owner-authorised), and the stale `CLAUDE.md`
cost figures (`0280`'s, filed and evidenced there). **Nothing filed, nothing changed against any of
them.** `CLAUDE.md` was not edited by this round at all — its "above that script's **first** apt call"
claim is now literally true of the code, which is the direction the owner ruled.

**Step 8 of `plan.md` — the owner-executed box run — remains the only outstanding gate, unchanged by
this round.** Nothing here is evidence that a real deploy is prompt-free.

## Accepted residuals (shared, do-not-re-litigate)

> The four entries below are **transcribed from owner rulings D2–D4 already recorded in `plan.md`**
> (owner, 2026-09-19, live via `AskUserQuestion`) plus an existing board row. They are not new
> reviewer dispositions. The reviewer suppressed nothing against them this round — Codex honoured the
> priming and raised none of them.

- **dpkg conffile prompts stay open (owner ruling D3; worklog R1)** — What: a deploy can still block
  indefinitely on dpkg's own *"Configuration file '/etc/…' … What would you like to do?"* prompt, which
  `DEBIAN_FRONTEND` does not govern. · Why (structural): the only close is
  `-o Dpkg::Options::=--force-confold`, **offered to the owner and declined** because it silently
  decides which config file wins — a behaviour change, not this fix; it would also rewrite the
  harness-anchored `apt-get update -y && apt-get upgrade -y` line. · Re-raise only if: a deploy
  actually blocks on a conffile prompt on a box, or the owner reopens the config-precedence decision.
- **`apt-get upgrade -y` stays in all three scripts (owner ruling D2)** — What: all three full-upgrade
  sites (`setup-telemetry.sh:179`, `setup-profile.sh:238`, `setup.sh:32`) are kept as-is. · Why
  (structural): the owner ruled keep-as-is **after being told** this fix makes an unattended full
  upgrade *quieter, not safer*, and that with `needrestart` present services could restart mid-deploy
  with nothing printed (the G7 scenario). · Re-raise only if: a deploy is shown to have broken the box
  through the unattended upgrade, or the owner reopens D2.
- **The `CLAUDE.md` line exists by owner ruling D4** — What: one line added to the consequence-1
  covered-file list. · Why (structural): explicitly authorised at the plan gate; only its **accuracy**
  was ever in review scope (see R1). · Re-raise only if: the line becomes factually wrong.
- **`CLAUDE.md`'s stale `npm test` cost figures are task `0280`'s, not `0286`'s** — What: `CLAUDE.md`
  still says 113 suites / 1185 tests / ~22–25 s; this host measures **138 / 1870 / ~78 s**. Drift is
  repo growth since `0201`, **not** this change. · Why (structural): already filed and evidenced in
  `ai-agents/tasks/backlog/0280-…/brief.md` (item 1, with 2026-09-16 and 2026-09-18 re-measurements and
  an explicit instruction to write a **range**, not a point figure); D4 authorised exactly one line
  here. The coder's 138/1870/~78 s reading is consistent with `0280`'s recorded 137/1853 and 59–85 s
  spread and adds no new mechanism. · Re-raise only if: `0280` is cancelled without the correction
  being made. **Do not file a second task and do not widen `0286` to fix it.**
- **`apt` vs `apt-get` at `setup.sh:32` (worklog R3)** — What: `setup.sh` uses `apt update && apt
  upgrade -y`, and `apt` has no stable CLI contract for scripts. · Why (structural): real, separate,
  outside `0286`'s approved change surface; changing it would touch a D2-protected upgrade line. ·
  Re-raise only if: the owner wants it filed as its own task (**not yet asked** — see the open
  question relayed with this round's report).
