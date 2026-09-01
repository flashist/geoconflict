# Review — 0196

Task: `ai-agents/tasks/done/0196-sweep-dependency-declarations-into-briefs/brief.md`
File(s) under review: the 30 modified `ai-agents/tasks/backlog/*/brief.md` in the uncommitted working
tree (`ai-agents/sprints/plan-sprint-4.md` and `0196/brief.md` are the driver's own status flip and are
out of scope — verified as exactly one `🔲 Backlog` → `🔄 In progress` line each, nothing else).
Status: in-review

**Verdict (round 1): ⚠️ Changes requested — 3 defects (none blocking).** Plus 2 findings classified as
frontier-moves that are the owner's call, not the coder's. Reviewer coverage is **FULL** — both this
reviewer's own pass and the Codex adversarial pass ran to completion.

## Reviewer findings

| #  | Round | Sev    | file:line | Claim |
|----|-------|--------|-----------|-------|
| R1 | 1     | medium | `0012-personal-inbox/brief.md:126`, `0014-yandex-catalog-registration/brief.md:43`, `0017-citizenship-earned/brief.md:158`, `0018-citizenship-paid/brief.md:164` | Four live Sprint 4 rows now render a `depends=` fact that OPENS with a negation — "nothing blocks the buildable scope", "nothing blocks the build", "nothing blocks the mock build", "no task" — while the row's Status cell reads `🚧 Blocked` and a real live gate (`0062`, `0065`, Yandex catalog approval) is named only in a LATER sentence of the same bullet. The full text does render (no cell truncation — see disproven list), so nothing is hidden from a human; the hazard is a reader or eligibility check that keys on the opening clause, which is the precise "fabricated ready" direction this task exists to remove. **Frontier-move, not a defect:** the negation wording is the owner's own 2026-08-23 ruling language, faithfully transcribed. Reordering the clause is an owner call. Precedent for the other order: `0065`'s pre-existing declaration leads with its gates. |
| R2 | 1     | low    | `0047-deploy-transport-secret-hygiene/brief.md:112-115` | The bullet asserts `T4g` "is an internal chunk label, **not a board task id**, and `0196` did not map it to a task number." The label DOES resolve: `ai-agents/tasks/done/0183-profile-04g-argv-concurrency-hardening/brief.md:1` is titled `# Task — Profile Backend Infra: Argv-safety + concurrency lock + atomic deploy record + deploy-target preflight (T4g)`. Two consequences: the "not a board task id" clause is factually false, and because `0183` is in `done/`, the single gate this declaration records ("should land after T4g merges") is **already satisfied** — the board now shows an open gate that is met. Defect (accuracy). ⚠️ Note for whoever acts on this: transcribing the label was the plan's explicit instruction (plan §4 table), so only the false "not a board task id" clause is correctable without re-scoping. |
| R3 | 1     | low    | `0044-infinite-gold-force-no-nukes-public-rotation/brief.md:104-105` | The plain `- **Depends on:** nothing.` justification cites the Priority field's "Not a prod blocker; safe weekend deploy" (`:10`) as evidence of no dependency. That is a **Blocks/urgency fact offered as a Depends-on fact** — the exact distinction other bullets in this same sweep draw explicitly (`0028:75-76`, `0026:87`, `0033:178`, `0039:83`). The Class-P classification itself still stands, but on the `0042` decoupling sentence alone (`:111`, "The two tasks no longer depend on or sequence against each other"), which is narrower than the blanket independence claims the other five plain-`nothing.` briefs make. Defect (accuracy of a stated justification); no dependency is invented or lost. |
| R4 | 1     | low    | `0021-analytics-p1-citizenship-funnel/brief.md:133` | **Raised by both reviewers.** The machine-readable `Depends on:` field names `0166`, `0191`, `0018`, `0017`, but the brief's prose states the reverse direction: `:7` "This brief must be read **before** implementing `0166…`, `0191…`, `0018…`, or `0017…`" and `:27` "Each task above is responsible for implementing the events listed against it. This brief is the shared analytics spec." **Frontier-move, not a defect:** the brief itself titles that list `## Dependencies`, and the bullet explicitly caveats the direction in the same sentence ("though that section states the relationship as ownership rather than blocking … `0196` did not re-scope the direction of the relationship"). Re-scoping it would violate the sweep's own governing rule. `0021` is on no board today, so nothing renders from it yet. Codex rated this high; I rate it low — the caveat is inline and no id is dropped. |
| R5 | 1     | low    | `0022-win-check-multiplayer-regression-investigation/brief.md:108` | The hedge's wording "this brief asserts **no gate anywhere in its text**" is literally overstated: `:88` reads "**Decide the resolution policy with Mark before implementing.**" — a stated pre-implementation gate (an owner decision, not another task). The sibling hedge on `0035:267` uses the accurate narrower wording "no gate **on another task** anywhere in its text". The S-set wording is inconsistent across the five hedged briefs, and `0022` carries the one variant that is false as written. Defect (accuracy); the hedge already declines to claim a verified absence, so no dependency is lost. |

## Coder response

_(coder-owned — reviewer does not write this section)_

**Round 1 response — all five findings verified against the files before any edit. All five verified
CORRECT as claimed; none was found wrong or partly wrong, so no `NEEDS-DECISION` was raised.**
Owner dispositions were ruled 2026-09-01 via `AskUserQuestion` in the fkit-lead session (D1: correct
R2/R3/R5; D2: reorder R1 gate-first; D3: accept R4 as residual).

| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R1 | agreed — claim verified | **Frontier-move** (reviewer's classification upheld; wording is the owner's own 2026-08-23 ruling language, so only the owner could reorder it) | Owner ruled **D2 — reorder gate-first**. In `0012`, `0014`, `0017`, `0018` the live gate now **opens** the bullet and the owner's negation wording is kept verbatim, moved behind it and bridged by "Beyond that tail," / "Beyond that live tail," / "It is this task's only gate. On tasks:". **No gate added, removed, or re-scoped in any of the four** — same ids, same directions, same caveats. Follows `0065`'s gate-first precedent. | ✅ applied |
| R2 | agreed — claim verified | **Defect** (accuracy of a justification clause) | Owner ruled **D1 — correct**. Verified independently: `ai-agents/tasks/done/0183-profile-04g-argv-concurrency-hardening/brief.md:1` is titled `… (T4g)`, and `ai-agents/tasks/done/0013-player-profile-store-impl/brief.md:79` maps `T4g → 0183 … ✅ Done (PR #125)`. The false "not a board task id, and `0196` did not map it to a task number" clause is replaced with the resolution **and** the gate's satisfied state: "it does resolve to a board task — `0183-…`, whose title ends `(T4g)` and which is already in `ai-agents/tasks/done/` (PR #125), so this gate is **already satisfied** and nothing open blocks this task on it." The gate itself is unchanged and still transcribed as the brief writes it (plan §4). | ✅ applied |
| R3 | agreed — claim verified | **Defect** (accuracy of a stated justification) | Owner ruled **D1 — correct**. Verified: `0044/brief.md:10` reads "Not a prod blocker; safe weekend deploy" — an urgency/Blocks fact. That clause is **deleted** from the bullet. The `nothing.` classification is unchanged and now rests solely on the `0042` decoupling sentence (`:111`), which the bullet already cited. **No dependency conclusion changed.** No commentary added in its place. | ✅ applied |
| R4 | agreed — claim verified, severity `low` upheld over Codex's `high` | **Frontier-move** (re-scoping the direction would breach the sweep's own transcribe-never-re-scope rule) | Owner ruled **D3 — accept as residual. `0021` NOT edited.** Recorded below so no future round re-raises it. | 🔵 accepted residual |
| R5 | agreed — claim verified | **Defect** (accuracy) | Owner ruled **D1 — correct**. Verified: `0022/brief.md:88` reads "**Decide the resolution policy with Mark before implementing.**" — a real in-text gate, so "no gate **anywhere** in its text" was false as written. Adopted the sibling wording from `0035:267` — "no gate **on another task** anywhere in its text" — and added the in-text gate explicitly: "The one in-text gate is an owner decision, not a task: `:88` … which applies only to the risk-2 branch." **No task named, so the dependency conclusion is unchanged.** The other three hedges (`0015`, `0016`, `0045`) keep the "anywhere in its text" variant: each was re-checked and none carries an in-text gate, so their wording is not false and was left alone. | ✅ applied |

**Change surface of this round: 7 `brief.md` files** — `0012`, `0014`, `0017`, `0018` (R1/D2 reorder)
and `0022`, `0044`, `0047` (R2/R3/R5 corrections). No source, no board file, no status/priority/sprint
cell, no file move, no `dashboard.sh` edit, no commit. `git diff -U0` shows **zero deleted lines across
all 30 briefs** — the only 2 deletions in the whole tree remain the driver's own `🔲 Backlog` →
`🔄 In progress` flip on `plan-sprint-4.md` and `0196/brief.md`.

**Re-verification after the edits — the plan's §5 three assertions, re-run on all 7 edited bullets.**
Board-linked four through `plan-sprint-4.md`; the three unlinked (`0022`, `0044`, `0047`) through a
throwaway R-AP2 scaffold (`ai-agents/sprints/_scratch-0196-verify.md`), **since deleted** —
`git status --porcelain` shows it gone and `ai-agents/sprints/` holds only the five real boards plus
`plan-index.md`.

1. **No `none recorded`, no `depends-unparseable`, no `UNPARSEABLE`** for any of the 7.
2. **Tail match — 7/7.** Every sentinel ends on the bullet's own final characters
   (`…machine-readable form beside it.`, and for `0022` `…applies only to the risk-2 branch.)`).
   No truncation at a sub-bullet, blank line, heading, or fence.
3. **Whole-string diff — 7/7 text-identical.** The only byte differences are the two acceptable
   classes: the extraction's missing trailing newline (all 7, 1 byte), and `sanitise()` rewriting
   `"` → `'` in `0022` and stripping the `**` around *already satisfied* in `0047` (−4 bytes). No
   length or tail difference of any other kind.

**Board state after — byte-identical to the reviewer's independently re-derived pre-state.** Sprint 4
`none recorded` = 0; Sprint 5 = 7; Sprint 6 = 4; sprint-backlog = 23; `backlog` and `plan-index` = 0.
`UNPARSEABLE` = **0 on every board.** Sprint 4 roll-up unchanged:
`42 done · 1 in progress · 6 blocked · 6 backlog · 3 cancelled  —  of 58`. Drift unchanged and no new
fact of any kind: 7 `missing-brief` (Sprint 5), 4 `missing-brief` (Sprint 6), 23 `missing-brief` + 23
`nonconformance` (sprint-backlog), 3 `disagreement` + 2 `nonconformance` (backlog).

## Accepted residuals (shared, do-not-re-litigate)

- **R4 — `0021-analytics-p1-citizenship-funnel/brief.md:133`, direction of the `## Dependencies` list.**
  The declaration names `0166`, `0191`, `0018`, `0017` while the brief's prose (`:7`, `:27`) states the
  relationship as ownership/read-before rather than blocking. **Owner-accepted 2026-09-01 as a
  residual; `0021` is deliberately NOT edited.** Grounds: the brief itself titles that list
  `## Dependencies`, so the bullet transcribed what the brief says, and re-scoping the direction would
  breach `0196`'s own transcribe-never-re-scope rule. The bullet already caveats the direction inline,
  and `0021` is on no board today so nothing renders from it. **Do not re-raise.** If the direction is
  to be corrected, that is a separate brief against `0021`, not a `0196` finding.

---

## Reviewers run

- **fkit-reviewer own pass** — ran in full.
- **Codex adversarial pass** (`codex exec --sandbox read-only`) — ran in full, exit 0. **No degradation.**
  Returned one high finding (`0021`, recorded here as R4 at low severity after verification) and
  explicit "no findings" for truncation, competing declarations, collateral edits, and secrets.
- Two verification subagents cross-read all 30 briefs against their source prose.

## Verified and DISPROVEN — do not chase these

- **Silent `joinFrom` truncation: does not occur.** Verified independently of the build's comparator:
  I extracted `depends_raw()` verbatim from `.claude/skills/fkit-status/dashboard.sh:560-695`, ran it
  against all 30 briefs, and compared each result to the bullet text taken **from the diff hunk**
  (not from a re-implementation of `joinFrom`). Result: **30/30 byte-exact, 0 mismatches.** All 30
  parse as form `BL` with non-empty text. No sub-bullets, blank lines, headings, or fences inside any
  declaration; no brief uses the truncating `**Depends on: text**` (`BI`) form.
- **Board-cell truncation: does not occur.** I hypothesised `one_line_cell()` would trim each cell at
  its first `. ` and amputate the trailing gate sentence. **Disproven** — `one_line_cell` is applied
  only to the status cell (`dashboard.sh:777`); the derive cell renders whole. Confirmed by rendering
  `plan-sprint-4.md`.
- **The `0031` DAU fabrication the build says it avoided: the build's call is CORRECT.** The plan told
  it to transcribe "gated on mobile DAU > 1,500" as `0031`'s gate. `0031/brief.md:10-11` in fact reads
  "Related to the parked **Task 5** — Deep Mobile Rendering Optimization (gated on mobile DAU > 1,500)"
  — the threshold gates Task 5, and `0031` is only "Related to" it. Declining to transcribe it was
  right, and the bullet flags the near-miss explicitly.
- **Parser board state — re-derived independently, matches the driver.** Sprint 4 `none recorded` = 0;
  Sprint 5 = 7; Sprint 6 = 4; sprint-backlog = 23; `backlog` and `plan-index` = 0. Every remaining
  `none recorded` is matched by a `drift missing-brief` row with no real brief. `UNPARSEABLE` = **0**
  on every board. Sprint 4 roll-up `42 done · 1 in progress · 6 blocked · 6 backlog · 3 cancelled — of 58`.
- **Collateral edits: none.** `0` deleted lines across all 30 briefs. Every addition is either the
  single declaration bullet with its indented continuation lines, or one of 9 new `## Notes` headings
  (permitted by plan §4 step 4). Exactly **one** declaration-shaped line per brief — no competing
  declaration can shadow the new bullet.
- **Secrets: clean.** No IP, host, URL, DSN, token, key, or credential value in any added line. The
  only credential-adjacent content is `0030`'s bullet naming config slot **names**
  (`storageEndpoint` / `storageBucket` / `storageAccessKey` / `storageSecretKey`) and `0045`'s
  `PROFILE_IMAGE` — variable names only, which is what the rule permits.
- **R-AP2 honoured.** No `ai-agents/sprints/_scratch*` exists; `ai-agents/sprints/` holds only the five
  real boards plus `plan-index.md`. The only untracked files are `0196`'s own `plan.md` and `worklog.md`.
- **Every task id cited in all 30 bullets resolves** to a folder under `ai-agents/tasks/`. Every status
  claim checked is true: `0019` Done, `0191` Done, `0166` Done, `0013` Done, `0164` Done, `0159` Done,
  `0042` Done, `0140` Done (merged PR #77), `0160` **cancelled 2026-06-02** (date confirmed in the
  cancelled brief), `0062`/`0065`/`0014`/`0012` still in backlog, `8d-A` = `done/0126-global-announcements`.
- **R-AP1 honoured; the two classes were NOT collapsed.** 6 briefs given the plain `nothing.`
  (`0028`, `0036`, `0037`, `0038`, `0043`, `0044`) — each verified to positively assert its own
  independence in prose. 5 given the hedge (`0015`, `0016`, `0022`, `0035`, `0045`) — each verified
  genuinely silent. **No brief given a "no dependency" wording states a real gate on another task that
  its bullet erases — the serious failure mode did not occur.**
- **The build's reclassifications against the plan's pre-read guesses are CORRECT, and two of them are
  genuine catches.** `0027`, `0024`, `0033`, `0039`, `0031`, `0026`, `0048`, `0014` received a third
  wording ("no task — …", "a timing gate, not a task"), each verified against the brief's own prose.
  Two are improvements on the plan: `0039` would have received a plain `nothing.` under the plan and
  would then have HIDDEN the procedural gate its Sprint field states ("needs a sprint home before
  implementation") and its `## Deferred — implementation` section states (owner review first); `0024`
  would likewise have hidden its own self-gate (`:81` "Do not scope implementation until a short
  investigation confirms…"). Reclassifying both was right.

## Convergence call

**Round 1 on a fresh ledger — no prior findings, no accepted residuals, nothing suppressed as settled.
No re-litigation.** Nothing here is a loop.

The sweep's central risk — a fabricated dependency — **did not materialise.** No invented gate, no
dropped gate, no wrong-direction record that the bullet does not itself caveat, across all 30 briefs
checked against their own source prose. The two mechanical hazards (silent parser truncation,
collateral edits) are both disproven with evidence. The two owner rulings were honoured as written.

The three defects (R2, R3, R5) are **accuracy slips inside justification clauses**, not wrong
dependency facts: one false claim that a label is unresolvable, one Blocks-fact cited as Depends-on
evidence, one hedge overstated by a wording variant its sibling gets right. Each is a one-clause edit.
None changes a board fact and none blocks the task.

**Recommendation: act on R2, R3, R5 (cheap, and they are exactly the kind of overstatement this task
exists to delete), and put R1 and R4 to the owner as dispositions rather than fixes.**
