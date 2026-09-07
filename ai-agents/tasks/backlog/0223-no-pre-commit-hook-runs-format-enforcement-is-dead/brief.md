# The pre-commit hook does not exist — `lint-staged` never runs, and formatting is enforced nowhere

## ID
0223

## Sprint
Backlog board

⚠️ **Deliberately NOT Sprint 4.** The placement reasoning is in *Why this is on the Backlog board*
below, and it is the producer's call, not an owner ruling — **one edit overrules it.**

## Priority
Unscheduled (board is unranked by design)

**Producer's merit rank: Medium.** Nothing is broken for players. But this is a **silent** failure of a
control the repository believes it has, and it has already let unformatted code reach production.

## Status
🔲 Backlog

## Owner
Owner (the mechanism decision) / fkit-coder (the implementation, once ruled)

## Depends on
Nothing.

⚠️ **Related but NOT the same task:**
[`0201`](../../done/0201-gate-the-shell-test-harnesses-so-they-cannot-rot-unrun/brief.md) — see
*Relationship to `0201`* below. **This is not a duplicate of it and must not be folded into it
without an owner ruling.**

---

## Context

### The defect, in one sentence

**`package.json` declares `husky` and a `lint-staged` formatting rule, but no hook file exists, so no
pre-commit hook has ever run — and `prettier` is therefore enforced by nothing, anywhere.**

### The evidence — verified in the repository 2026-09-05, each item re-checked, not taken on report

| Claim | How it was verified | Result |
|---|---|---|
| The repo **declares** husky | `package.json:34` — `"prepare": "husky"`; `husky` in `devDependencies` (`package.json:92`) | ✅ Confirmed |
| The repo **declares** a formatting rule | `package.json:40-43` — `lint-staged` block runs `prettier --ignore-unknown --write` | ✅ Confirmed |
| Git **is** pointed at husky | `git config core.hooksPath` → `.husky/_` | ✅ Confirmed |
| **No hook file exists** | `ls -la .husky/` | ✅ Confirmed — the directory contains **only** husky's internal `_/` shim directory. **No top-level hook files at all.** |
| ⇒ **the hook is a guaranteed no-op** | Read `.husky/_/h`, the shim every hook sources. It computes the user hook path as `.husky/<hookname>` and does `[ ! -f "$s" ] && exit 0` | ✅ Confirmed — with `.husky/pre-commit` absent, `.husky/_/pre-commit` **exits 0 immediately**. It is not "misconfigured"; it is structurally inert. |
| 🔴 **`.husky/` is NOT TRACKED IN GIT — no hook file was EVER committed** | `git ls-files .husky` → empty. `git log --all -- .husky` → empty. | ✅ Confirmed. **This is the strongest form of the finding.** |
| **Nothing else enforces format either** | `ls .github/workflows/` → *No such file or directory* | ✅ Confirmed — **this repository has no CI at all.** |
| **There is no prettier config file** | `ls -a` for `.prettierrc*` / `prettier.config.*` → none; `package.json` has **no `prettier` key**; **no `.prettierignore`** | ✅ Confirmed — prettier runs entirely on its defaults, over the entire repository tree. |

🔴 **Why the untracked-`.husky/` finding matters more than "the hook is missing on this machine".**
`prepare: husky` runs on `npm install` and regenerates `.husky/_/`, so the *shims* always come back —
which is exactly why this looks healthy. **The user hook is the part that was never committed**, so
**no `npm install`, on any machine, by any contributor, has ever produced a working pre-commit hook.**
This has never worked. It is not local drift.

### The rot this permitted — measured, not asserted

`npx prettier --ignore-unknown --check .` on 2026-09-05, clean working tree:

| Scope | Files failing `prettier --check` |
|---|---|
| **Whole repository** | **673** |
| `src/` | **61** |
| `tests/` | **12** |
| `ai-agents/` (markdown docs) | **521** |

🔴 **`src/client/leaderboard/LeaderboardReporter.ts` is one of the 61** — verified individually. That
is [`0208`](../0208-measure-clientless-leader-at-win-condition-in-production/brief.md)'s Part B, which
**shipped to production in build `0.0.141` unformatted**. This is the concrete harm: the control the
repo believes it has would have caught it, and did not exist.

> 🚨 **A NUMBER DISCREPANCY, RECORDED RATHER THAN RESOLVED.** The lead session that raised this defect
> reported **142** drifted files. **This brief could not reproduce that number** — the measurement
> above gives **673** repo-wide and **61** under `src/`. ⚠️ **Neither figure is dismissed.** The most
> likely explanation is a different scope or a different invocation, but **that is a guess and is
> labelled as one.** ⇒ **Re-measure at plan time and record the command used.** Do not quote `142`.

⚠️ **The 521 markdown files are the reason scope is a real decision, not a detail.** With no
`.prettierignore`, `prettier .` walks `ai-agents/` too. A naive repo-wide `--check` gate fails
immediately on documentation churn that has nothing to do with code quality, and a naive repo-wide
`--write` reformats **521 task briefs and reports in one commit**, destroying the readability of every
future `git blame` over the project's own records. ⛔ **Do not do either without a ruling.**

### Relationship to [`0201`](../../done/0201-gate-the-shell-test-harnesses-so-they-cannot-rot-unrun/brief.md) — read this before filing anything else

`0201` is **in progress** and a coder is planning it now. The two tasks **touch the same facts and are
not the same task**:

| | `0201` | **This task (`0223`)** |
|---|---|---|
| **What rots** | `tests/scripts/*.sh` deploy harnesses — nothing ever runs them | **`prettier` formatting** — nothing ever enforces it |
| **Owner ruling** | ✅ **Already ruled 2026-09-02: fold the shell harnesses into `npm test`.** A **pre-push git hook** and **CI** were both **explicitly rejected**. | ⛔ **Nothing ruled.** |
| **Status** | 🔄 In progress | 🔲 Backlog |

✅ **`0201` already RECORDS the husky fact** — its evidence table, row *"No git hook runs it"*, states
`.husky/` holds only the `_/` shims. **What `0201` does NOT record is the CONSEQUENCE**: that the same
absence kills `lint-staged`, and that 673 files have drifted behind it. `0201` cites the fact to
justify *its own* mechanism choice; it does not treat it as a defect and it is not scoped to fix it.

🔴 **The interaction that actually matters, and the reason this needs the owner and not a coder:**
`0201`'s ruling **rejected git hooks** as a gating mechanism and **rejected introducing CI**. The most
obvious repair here — *commit a `.husky/pre-commit` that runs `lint-staged`* — is **a git hook**, in a
repository where the owner has just declined one for the adjacent purpose. ⚠️ **That rejection was
made about the shell harnesses, on the shell harnesses' reasoning; it is NOT automatically a ruling
about this.** ⛔ **But an agent must not assume it transfers, and must not assume it doesn't.** The
owner settles it.

## What to build

**Nothing yet. The first deliverable is a ruling.** Put these to the owner, together:

**Q1 — the mechanism.** How is formatting enforced?

| Option | Cost | Note |
|---|---|---|
| **A. Commit `.husky/pre-commit` running `lint-staged`** | Lowest — one small file; the machinery is already installed and declared. | ✅ Formats only **staged** files, so it never touches the 673-file backlog. ⚠️ **It is a git hook** — see the `0201` interaction above. |
| **B. Fold `prettier --check` into `npm test`** | Low. | ✅ **Consistent with `0201`'s already-ruled pattern** — one gate, one place. ⚠️ Needs Q2 answered first, or `npm test` fails for everyone on day one. |
| **C. CI** | Highest — introduces a CI platform to a repo with none. | ⛔ **Owner rejected this for `0201`.** Recorded for completeness; not recommended. |
| **D. Accept it — remove the dead `husky` + `lint-staged` declarations** | Lowest. | ✅ **A legitimate answer, and better than the status quo**, which is a control that *looks* live. ⚠️ Formatting then drifts by choice, not by accident. |

📌 **Producer's recommendation: A, plus D's honesty clause.** It restores exactly the control the repo
already claims, costs almost nothing, and touches no existing file. **If the owner declines a git
hook, B is the next best** because it reuses `0201`'s ruled mechanism.

**Q2 — the scope of the check.** What is prettier allowed to look at?

⚠️ **This must be answered before ANY `--check` gate lands**, or the gate is red for everyone
immediately. The concrete sub-question: **add a `.prettierignore` excluding `ai-agents/`?** — 521 of
the 673 failures are project records, not code.

**Q3 — the 673-file backlog.** Reformat now (one large mechanical commit), reformat `src/` and
`tests/` only (73 files), or leave it and gate only new work?

⚠️ **A repo-wide `--write` is a `git blame` event over the project's own task briefs.** Flagged as a
cost, not argued as a blocker.

**Q4 — a prettier config file.** There is none. Adopting the defaults explicitly is a one-line
decision, but it should be a decision.

**Only after Q1–Q4:** implement exactly and only what was ruled.

## Verification steps

1. **Re-measure the drift and record the exact command**, since this brief's `673` and the raising
   session's `142` disagree. ⛔ **Do not carry either number forward unverified.**
2. **Prove the hook actually fires** after any fix — make a deliberately misformatted staged change,
   commit, and confirm it was reformatted or rejected. ⚠️ **Reading the hook file is NOT this step**;
   the whole defect is a file that exists in belief and not in fact.
3. **Confirm the hook is TRACKED** — `git ls-files .husky` must list it. ⛔ **A hook that works only on
   the machine that created it is this same defect again.**
4. **Confirm a fresh clone + `npm install` produces a working hook** — this is the check that would
   have caught the original defect.
5. **State plainly whether the 673-file backlog was addressed or deliberately left**, and where that
   was ruled. ⚠️ **Do not let a green gate imply a clean repository.**
6. **Confirm no conflict with `0201`'s implementation** if `0201` has landed by then — both may end up
   touching `npm test`.

## Why this is on the Backlog board and not Sprint 4

**Producer's call, stated so the owner can overrule it in one edit** — the same reasoning
[`0201`](../../done/0201-gate-the-shell-test-harnesses-so-they-cannot-rot-unrun/brief.md) recorded for its own
original placement:

1. **Nothing is broken for players.** This is developer tooling. It does not compete with Sprint 4's
   live-defect and launch-blocking work.
2. **The task opens with an owner decision, not with code.** Q1's options differ in kind, and one of
   them collides with a live owner ruling on `0201`. Sprinting an implementation before that ruling
   exists would presume the answer.
3. 🔴 **A Sprint 4 row could only be APPENDED at the bottom of that board**, which reads as *lowest
   rank in the sprint* — a false signal in the other direction. fkit's **ADR-035** (*a mid-board
   insertion is not the owner-ruled re-rank exception*) bars inserting a new row above that board's
   closed rows, and a spawned producer has no owner channel to be granted a re-rank anyway. **The
   honest placement is the unranked Backlog board, with the merit statement recorded here.**

📎 **ADR-035 is cited by name, never linked, on purpose.** It is one of **fkit's own upstream ADRs**
(the `adr-0XX` series, which lives in the fkit install share). This project's
`ai-agents/knowledge-base/decisions/` holds only the `adr-1XX` series, so a relative link into it would
not resolve.

**If the owner judges that unformatted code reaching production is worth paying for now — it already
has, in `0.0.141` — this is a Sprint 4 candidate and the producer would not argue.**

## Notes

- **Filed 2026-09-05 by a spawned `fkit-producer`, from a defect raised by the lead session.** Every
  claim above was re-verified against the repository before it was written down; the one number that
  did **not** reproduce is flagged in place rather than quietly corrected.
- ⚠️ **This brief asserts no owner ruling.** Q1–Q4 are all open.
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- 🔒 **No secrets in any artifact** — names and file names only.
</content>
