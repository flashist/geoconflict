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
~~Owner (the mechanism decision)~~ **✅ Q1 ruled 2026-09-07 — see below.** / **fkit-coder** (the
implementation of Q1) — ⚠️ **the owner still owns Q2, Q3 and Q4, which are NOT ruled.**

---

## ✅ OWNER RULING — 2026-09-07, given live in session (answers Q1 ONLY)

> ✅ **Commit a `.husky/pre-commit` hook.**

That is this brief's **option A**. The other options were put to the owner and **not chosen**:

| Option | Outcome |
|---|---|
| **A. Commit `.husky/pre-commit` running `lint-staged`** | ✅ **RULED — this is the mechanism.** |
| **B. Fold `prettier --check` into `npm test`** | ❌ Not chosen. |
| **C. CI** | ❌ Not chosen (and separately rejected on `0201`). |
| **D. Accept it — delete the dead `husky`/`lint-staged` declarations** | ❌ Not chosen. |

⛔ **Q2 (check scope / `.prettierignore`), Q3 (the drifted-file backlog) and Q4 (a prettier config
file) are STILL OPEN.** This ruling settles the mechanism and nothing else. Do **not** read it as
approving a repo-wide `--check` gate or a repo-wide `--write`.

📌 **Board placement is unchanged** — still the Backlog board, still unranked, producer's merit rank
still **Medium**. The ruling was about the mechanism, **not** about scheduling or rank.

### ⚠️ A consequence the owner should have in writing: the backlog gets reformatted GRADUALLY

`lint-staged` formats **staged files only**. So the drifted-file backlog is **not** fixed in one sweep
— each drifted file is reformatted **the first time someone happens to touch and stage it**.

- ✅ **This is a feature, not a defect of the ruling.** It is exactly why option A never triggers the
  `git blame` event that a repo-wide `--write` would (see Q3).
- ⚠️ **But it has a real cost that will show up in review:** for a long time, diffs on old files will
  carry **unrelated formatting churn** alongside the actual change. A one-line fix to a drifted file
  can arrive as a fifty-line diff. Reviewers must expect this and not read it as scope creep.
- 🔴 **The backlog is therefore NOT resolved by this ruling.** Q3 stays open on purpose.

### 🔁 Re-measured 2026-09-07 (the brief requires this; do not carry old numbers unverified)

Command run, verbatim, from the repository root:

```
npx prettier --ignore-unknown --check .
```

| Scope | Files failing `prettier --check` — **2026-09-07** | (2026-09-05 filing) |
|---|---|---|
| **Whole repository** | **681** | 673 |
| `src/` | **61** | 61 |
| `tests/` | **12** | 12 |
| `ai-agents/` | **529** | 521 |

⚠️ **The working tree was NOT clean at this measurement** (`plan-sprint-4.md` modified; the `0225`
task folder untracked), and briefs filed since 2026-09-05 are also new. **The entire +8 is under
`ai-agents/`; `src/` and `tests/` reproduced exactly.** That is the expected shape — the drift grows
with new markdown, not with code — and it is recorded as an explanation, **not** as proof.

🚨 **The `142` figure from the raising session still does not reproduce** and is still not dismissed.
⛔ **Do not quote `142`.** Re-measure again at plan time and record the command, per verification
step 1.

### 🔁 Re-verified 2026-09-07 — the mechanism is still half-declared, and the hook still does not exist

At `HEAD` = `35afc64`:

| Claim | Result |
|---|---|
| `package.json` declares `lint-staged` and `"prepare": "husky"` | ✅ still true |
| `git config core.hooksPath` | ✅ `.husky/_` |
| `.husky/` contents | ✅ **only `_/`** — no top-level hook file |
| `git ls-files .husky` | ✅ **empty** |
| `git log --all -- .husky` | ✅ **empty** |

⇒ **No hook has ever run for anyone, on any machine.** The ruling is therefore *"commit the missing
half of a mechanism that is already installed and declared"*, not *"introduce a new mechanism"*.

### 🚨 READ THIS BEFORE YOU CONCLUDE THAT `0201` IS STALE

A future reader will find **"git hooks rejected"** in [`0201`](../../done/0201-gate-the-shell-test-harnesses-so-they-cannot-rot-unrun/brief.md)
and **"commit a git hook"** here, and will assume one of the two must be out of date.

🔴 **Neither is stale. They are two rulings, by the same owner, about two different subjects.**

| | [`0201`](../../done/0201-gate-the-shell-test-harnesses-so-they-cannot-rot-unrun/brief.md) — ruled 2026-09-02 | **This task (`0223`)** — ruled 2026-09-07 |
|---|---|---|
| **What is being gated** | the **shell test harnesses** (`tests/scripts/*.sh`) | **`prettier` formatting** |
| **The ruling** | fold the harnesses into `npm test`; a **pre-push git hook** and **CI** were both rejected **for that purpose** | commit a **`.husky/pre-commit`** hook running `lint-staged` |
| **Task status** | ✅ **Done — closed 2026-09-06** | 🔲 Backlog |

⛔ **This is NOT an overturn, and `0201` was NOT wrong.** `0201`'s rejection of a git hook was reasoned
**about shell test harnesses** — whether a hook was the right gate for *those*, on *their* cost and
*their* failure mode. The owner has now ruled that a pre-commit hook **is** the right mechanism for
**formatting**. Different subject, different ruling, **both stand**.

⛔ **`0201` is CLOSED. Do not reopen it, do not edit its status, do not re-rank it, and do not
"correct" its recorded rejection.** The distinction is recorded **here, and only here**, on purpose,
so that a closed task's record is left untouched. A reader arriving from the `0201` side reaches this
section through the `Depends on` block at the top of this brief, which names `0201` and points here.

## Depends on
Nothing.

⚠️ **Related but NOT the same task:**
[`0201`](../../done/0201-gate-the-shell-test-harnesses-so-they-cannot-rot-unrun/brief.md) — see
*Relationship to `0201`* below. **This is not a duplicate of it and must not be folded into it
without an owner ruling.**

🚨 **If you came here from `0201` because it says "git hooks rejected" and this task commits one —
read *READ THIS BEFORE YOU CONCLUDE THAT `0201` IS STALE*, immediately below. Neither ruling is
stale.** ⛔ `0201` is **closed**; leave its files alone.

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
is [`0208`](../../done/0208-measure-clientless-leader-at-win-condition-in-production/brief.md)'s Part B, which
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

📌 **Updated 2026-09-07: `0201` is now ✅ Done — closed 2026-09-06.** The text below was written on
2026-09-05, when it was still in progress; the struck line is kept rather than rewritten so the
sequence of events stays visible.

~~`0201` is **in progress** and a coder is planning it now.~~ The two tasks **touch the same facts and are
not the same task**:

| | `0201` | **This task (`0223`)** |
|---|---|---|
| **What rots** | `tests/scripts/*.sh` deploy harnesses — nothing ever runs them | **`prettier` formatting** — nothing ever enforces it |
| **Owner ruling** | ✅ **Ruled 2026-09-02: fold the shell harnesses into `npm test`.** A **pre-push git hook** and **CI** were both **explicitly rejected — for THAT subject.** | ✅ **Q1 ruled 2026-09-07: commit `.husky/pre-commit`.** Q2–Q4 still open. |
| **Status** | ✅ **Done — closed 2026-09-06** *(was `🔄 In progress` when this table was written)* | 🔲 Backlog |

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

✅ **SETTLED 2026-09-07.** The owner ruled the pre-commit hook. **The rejection did not transfer** —
and the reason it did not is that it was never a ruling about formatting. See the ruling section at
the top of this brief for the full side-by-side. ⛔ **`0201` stands as written and stays closed.**

## What to build

**Nothing yet. The first deliverable is a ruling.** Put these to the owner, together:

**Q1 — the mechanism.** How is formatting enforced?

✅ **ANSWERED 2026-09-07 — option A. The table below is kept as the record of what was weighed.**
⛔ **The remaining questions Q2, Q3 and Q4 are still open and still block implementation scope.**

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

📌 **State of the four as of 2026-09-07:** **Q1 ✅ ruled** (commit `.husky/pre-commit`). **Q2, Q3, Q4
⛔ still open.** ⚠️ Q1's mechanism can be built **without** Q2–Q4 — `lint-staged` scopes itself to
staged files, so it needs neither a `.prettierignore` nor a backlog decision to be safe. **But do not
close this task while implying Q2–Q4 were handled.**

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
- ~~⚠️ **This brief asserts no owner ruling.** Q1–Q4 are all open.~~ 📌 **Superseded 2026-09-07:**
  **Q1 IS now ruled** — owner ruling given live in session, recorded by a spawned `fkit-producer`;
  the ruling section is at the top of this brief. **Q2, Q3 and Q4 remain open.**
- ⚠️ **Also updated 2026-09-07:** `0201` has since been closed (2026-09-06), and the drift figures
  were re-measured (**681** repo-wide, `src/` and `tests/` unchanged at **61** / **12**). Both are
  recorded in place; **no number was quietly corrected.**
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- 🔒 **No secrets in any artifact** — names and file names only.
</content>
