# Worklog — `0196` Sweep real dependencies into the canonical `**Depends on:**` declaration

**Run:** 2026-08-31, Build step of a `/fkit-sprint-ship-loop` run (spawned `fkit-producer` worker).
**Plan executed:** `plan.md` in this folder, blob `37c8860214edaf68e1e5299f18fcceb7c43fc36b`, 21402
bytes — **verified by this worker** with `git hash-object` and `wc -c` against the bytes it was handed.
The two owner rulings **R-AP1** (silent briefs get the honest hedge) and **R-AP2** (throwaway
verification board) were both honoured; see §5 and §7.

**Outcome: complete. 30 of 30 briefs in scope swept. Zero skipped.**

---

## 1. Measurements re-derived today (2026-08-31) — the plan's numbers were NOT taken on faith

Both measurements were re-run from scratch before any edit, per the brief's step 1.

### (1) `depends="none recorded"` over every board, before the sweep

| Board | `none recorded` facts | Of those, with a real linked brief |
|---|---|---|
| `plan-sprint-4.md` | 6 | **6** — `0012`, `0014`, `0017`, `0018`, `0030`, `0032` |
| `plan-sprint-6.md` | 3 `derive` facts | **1** — `0027` (other 2 are `drift missing-brief`, no linked brief) |
| `plan-sprint-5.md` | 7 | **0** — all 7 are `drift missing-brief` rows |
| `sprint-backlog.md` | 15 `derive` facts | **0** — all are `missing-brief` + `unknown-marker` |
| `backlog.md` | 0 | 0 |

**Board-visible-today set = 7**, matching the plan's re-derivation and **not** the brief's stated 8.
The brief's 8 included `0025`, which closed to `ai-agents/tasks/done/0025-licensing-asset-audit/`
before this run, so its row no longer emits the fact. **`0018` is the only live Sprint 4 row in the
set** — the brief's "`0018` and `0025`, both live Sprint 4 rows" is one task out of date.

> 📌 A counting note the plan did not make, recorded so nobody re-derives a different number and
> thinks something moved. The plan's table reports raw `none recorded` **counts** per board (7 / 5 /
> 23); this table reports `^derive` **sentinel lines**. They differ on `plan-sprint-6.md` (3 vs 5) and
> `sprint-backlog.md` (15 vs 23) because a raw `grep -c 'none recorded'` also matches the rendered
> `⟨derive: none recorded⟩` cells in the table body, and on `sprint-backlog.md` several rows share a
> repeated id. **Neither count is wrong; they count different things.** The conclusion is identical
> under both: only 7 rows in the whole repo carried a real linked brief rendering `none recorded`.

### (2) Briefs under `tasks/backlog/` carrying no declaration of any form

The brief's own loop, re-run verbatim: **30 briefs**, confirming the plan's re-derivation and **not**
the brief's stated 31.

**⚠️ The 31 → 30 gap is NOT reconciled, and is not laundered.** Per the owner's standing ruling
endorsing the producer's refusal to launder it, the **list of 30 below is the scope of record**. The
brief recorded only a count, never a list, so the discrepancy cannot be traced. It is reported, not
explained.

### The verbatim list of 30 briefs actually acted on

Re-derived at the start of this run — **not copied from the plan on faith**, as the Build instruction
required. It came back identical to the plan's list.

```
0012-personal-inbox                                  0033-monitoring-alert-bot-phase1
0014-yandex-catalog-registration                     0034-monitoring-alert-bot-phase2
0015-remove-password-deploy-fallbacks                0035-worker-init-timeout-map-refetch
0016-secret-management-beyond-env-files               0036-bots-skip-sam-when-nukes-disabled
0017-citizenship-earned                              0037-fix-fusetag-dead-polling-loop
0018-citizenship-paid                                0038-fix-gutterads-usermeresponse-unsubscribe
0020-analytics-p1-ad-impression-tier                 0039-bots-hydrogen-bomb-sam-penetration-investigation
0021-analytics-p1-citizenship-funnel                 0043-defense-post-range-always-visible
0022-win-check-multiplayer-regression-investigation   0044-infinite-gold-force-no-nukes-public-rotation
0023-streamer-program                                0045-vps-registry-credential-hygiene
0024-ux-quick-message-access                         0047-deploy-transport-secret-hygiene
0026-fix-compact-map-shore-generation                0048-compliance-152fz-notification-consent
0027-new-maps-community-demand
0028-content-hint-videos-production
0029-hint-videos-in-game
0030-archive-s3-backed-citizen-gated
0031-mobile-webgl-rendering
0032-investigate-null-id-errors
```

**All 30 were swept. None was skipped.**

---

## 2. Skipped briefs

**None.** Every one of the 30 proved transcribable from its own text. The plan's §7 stop condition
"more than ~3 briefs in Batch B prove untranscribable" never came close to firing — zero did.

The six briefs the plan flagged as *likely to resist clean transcription* were each resolved without
guessing; how, is in the decision log (§6, D-4 through D-9).

---

## 3. Verification protocol actually run

### Method

A comparator script independently re-implemented `dashboard.sh`'s `joinFrom` join rules and its
`sanitise()` function, extracted the expected declaration from each brief, and diffed it against the
parser's own `derive <id> depends="…"` sentinel. **The comparison is byte-exact**, not a
tail-match — so the §3(a) truncation failure (invisible in a diff) could not pass.

One legitimate transformation is applied to the expected side before comparison: `dashboard.sh:60-62`
`fact_value()` is `tr '\n"' " '"` — newline→space, double-quote→single-quote. **It is
length-preserving by construction, so it cannot mask a truncation.** This was read out of the source
and confirmed, not assumed; it first surfaced as an apparent `0027` mismatch of identical length
(404 vs 404) and was run to ground before being accepted (decision log D-2).

### Result — all 30, exact match, zero truncation, zero unparseable

| Task | chars | Task | chars | Task | chars |
|---|---|---|---|---|---|
| `0012` | 853 | `0026` | 683 | `0036` | 341 |
| `0014` | 531 | `0027` | 404 | `0037` | 362 |
| `0015` | 325 | `0028` | 399 | `0038` | 550 |
| `0016` | 165 | `0029` | 457 | `0039` | 862 |
| `0017` | 940 | `0030` | 711 | `0043` | 297 |
| `0018` | 767 | `0031` | 631 | `0044` | 409 |
| `0020` | 540 | `0032` | 430 | `0045` | 414 |
| `0021` | 745 | `0033` | 679 | `0047` | 640 |
| `0022` | 312 | `0034` | 447 | `0048` | 882 |
| `0023` | 977 | `0035` | 431 | | |
| `0024` | 622 | | | | |

Every row returned `OK: exact match`. Aggregate result: **fail=0**.

### Batch discipline

**Batch A (the 7 board-visible-today briefs) was swept and fully verified before Batch B started**,
exactly as the plan required, so a method error would have surfaced on 7 briefs rather than 30. Batch
A's gate passed clean: `plan-sprint-4.md` went from 6 `none recorded` to 0, `plan-sprint-6.md` lost
`0027`, no roll-up count moved and no drift fact appeared. Only then did Batch B run.

### Reproducing this

```
bash .claude/skills/fkit-status/dashboard.sh ai-agents/sprints/plan-sprint-4.md \
  | sed -n 's/^derive 0018 depends="\(.*\)"$/\1/p'
```

---

## 4. Before/after board facts

### Roll-up counts — byte-identical, all five boards

| Board | Before | After |
|---|---|---|
| `plan-sprint-4.md` | `total 58 · done 42 · in-progress 1 · blocked 6 · backlog 6 · cancelled 3` | **identical** |
| `plan-sprint-5.md` | `total 7 · backlog 7` | **identical** |
| `plan-sprint-6.md` | `total 5 · backlog 5` | **identical** |
| `sprint-backlog.md` | `total 23 · unrecognized 23` | **identical** |
| `backlog.md` | `total 27 · done 2 · blocked 3 · backlog 18 · cancelled 1 · moved 3` | **identical** |

Compared by string equality of the extracted `total`/`count` lines, not by eye.

### Drift facts — byte-identical, all five boards

`diff` of the `^drift ` lines before vs after returned empty on every board.

| Board | drift facts, before and after | What they are |
|---|---|---|
| `plan-sprint-4.md` | **0** | — |
| `plan-sprint-5.md` | **7** | 7 × `missing-brief` (ids 8, 10–15), all `linked=""` |
| `plan-sprint-6.md` | **4** | 4 × `missing-brief` (ids `?`, `?`, 1, 2), all `linked=""` |
| `sprint-backlog.md` | **46** | 23 × `missing-brief` + 23 × `nonconformance unknown-marker` (`⬜ No sprint`, `⏸ Parked`) |
| `backlog.md` | **5** | 3 × `disagreement` (`0008`, `0010`, `0011`) + 2 × `nonconformance moved-without-target` (`0057`, `0062`) |

**This pre-existing drift is unchanged. This task fixed none of it and made none of it worse** — the
before/after pair above is the proof the brief's verification step 6 asked for.

### `depends="none recorded"` — after the sweep

| Board | residual `^derive … none recorded` | Verdict |
|---|---|---|
| `plan-sprint-4.md` | **0** | clean |
| `backlog.md` | **0** | clean |
| `plan-sprint-5.md` | 7 | **every one is a `missing-brief` row with `linked=""` — not a brief at all** |
| `plan-sprint-6.md` | 2 | same — ids 1 and 2, no linked brief |
| `sprint-backlog.md` | 15 | same — all `missing-brief`, `linked=""` |

Each residual id was **mechanically checked** against that board's `drift missing-brief <id> linked=""`
line; all 24 matched. **Not one residual `none recorded` belongs to a brief that exists.** These rows
are the pre-existing dangling-row drift and are out of this task's scope.

**`UNPARSEABLE` / `drift depends-unparseable` count across all five boards, after: 0.**

### The brief's own scope loop, re-run after the sweep

Returns **nothing**. No brief under `ai-agents/tasks/backlog/` lacks a declaration any more.

> 📎 `plan-index.md` is **not a board** — `dashboard.sh` exits 1 on it with `no '## Status' section`.
> Pre-existing, unchanged by this task, and noted only because the plan's §1 table listed it as
> emitting 0 facts, which reads as if it rendered.

---

## 5. R-AP2 — the throwaway verification board

Created `ai-agents/sprints/_scratch-0196-verify.md` linking all 30 briefs in scope, used solely to make
`dashboard.sh` emit a sentinel for the 23 briefs no real board links, then deleted before hand-off.
All four binding conditions met:

1. **Never committed, stayed untracked** — it never appears in `git diff --stat`. ✅
2. **Deleted before returning** — `git status --porcelain` below shows no trace. ✅
3. **Verification scaffold only** — not linked from `plan-index.md`; no task status read from or
   written to it. ✅
4. **Deletion succeeded**, so the stop-and-report branch did not fire. ✅

One scaffold artifact, disclosed rather than quietly dropped: the scratch board hardcoded every row as
`🔲 Backlog`, so `0012`, `0014`, `0017` and `0018` — whose briefs read `🚧 Blocked` — produced a
`drift disagreement` **on the scratch file** and no `derive` fact there. Those four are Batch A and
were verified against the **real** `plan-sprint-4.md` instead, so nothing went unverified. The artifact
died with the file.

### `git status --porcelain` at hand-off

```
 M ai-agents/sprints/plan-sprint-4.md
 M ai-agents/tasks/backlog/0012-personal-inbox/brief.md
 M ai-agents/tasks/backlog/0014-yandex-catalog-registration/brief.md
 M ai-agents/tasks/backlog/0015-remove-password-deploy-fallbacks/brief.md
 M ai-agents/tasks/backlog/0016-secret-management-beyond-env-files/brief.md
 M ai-agents/tasks/backlog/0017-citizenship-earned/brief.md
 M ai-agents/tasks/backlog/0018-citizenship-paid/brief.md
 M ai-agents/tasks/backlog/0020-analytics-p1-ad-impression-tier/brief.md
 M ai-agents/tasks/backlog/0021-analytics-p1-citizenship-funnel/brief.md
 M ai-agents/tasks/backlog/0022-win-check-multiplayer-regression-investigation/brief.md
 M ai-agents/tasks/backlog/0023-streamer-program/brief.md
 M ai-agents/tasks/backlog/0024-ux-quick-message-access/brief.md
 M ai-agents/tasks/backlog/0026-fix-compact-map-shore-generation/brief.md
 M ai-agents/tasks/backlog/0027-new-maps-community-demand/brief.md
 M ai-agents/tasks/backlog/0028-content-hint-videos-production/brief.md
 M ai-agents/tasks/backlog/0029-hint-videos-in-game/brief.md
 M ai-agents/tasks/backlog/0030-archive-s3-backed-citizen-gated/brief.md
 M ai-agents/tasks/backlog/0031-mobile-webgl-rendering/brief.md
 M ai-agents/tasks/backlog/0032-investigate-null-id-errors/brief.md
 M ai-agents/tasks/backlog/0033-monitoring-alert-bot-phase1/brief.md
 M ai-agents/tasks/backlog/0034-monitoring-alert-bot-phase2/brief.md
 M ai-agents/tasks/backlog/0035-worker-init-timeout-map-refetch/brief.md
 M ai-agents/tasks/backlog/0036-bots-skip-sam-when-nukes-disabled/brief.md
 M ai-agents/tasks/backlog/0037-fix-fusetag-dead-polling-loop/brief.md
 M ai-agents/tasks/backlog/0038-fix-gutterads-usermeresponse-unsubscribe/brief.md
 M ai-agents/tasks/backlog/0039-bots-hydrogen-bomb-sam-penetration-investigation/brief.md
 M ai-agents/tasks/backlog/0043-defense-post-range-always-visible/brief.md
 M ai-agents/tasks/backlog/0044-infinite-gold-force-no-nukes-public-rotation/brief.md
 M ai-agents/tasks/backlog/0045-vps-registry-credential-hygiene/brief.md
 M ai-agents/tasks/backlog/0047-deploy-transport-secret-hygiene/brief.md
 M ai-agents/tasks/backlog/0048-compliance-152fz-notification-consent/brief.md
 M ai-agents/tasks/backlog/0196-sweep-dependency-declarations-into-briefs/brief.md
?? ai-agents/tasks/backlog/0196-sweep-dependency-declarations-into-briefs/plan.md
```

**No `_scratch-0196-verify.md` anywhere.** Captured immediately after deletion and before this worklog
was written — the worklog itself will appear as one further `??` line once created, and `plan.md` was
untracked before this step began (the driver wrote it).

⚠️ **Two entries in that list are NOT this build's work, stated so they are not misread as ours:**
`plan-sprint-4.md` and `0196`'s own `brief.md` carry the **driver's** pre-existing status change
`🔲 Backlog` → `🔄 In progress`. This build did not touch either file. `0196`'s status was left
`🔄 In progress` as instructed.

### Change surface

`git diff --numstat` over the 30 swept briefs: **pure additions, 0 deleted lines on every one of the
30.** Total deletions across the whole diff: **1** — the driver's status line in `0196`'s own brief.
Every prose dependency section that existed before still exists, unedited. No status cell, priority
cell, sprint field, board file, `dashboard.sh` edit, file move, mover-skill invocation, wiki-vault
write, commit or push.

---

## 6. Decision log

Every judgment call made during this run.

**D-1 — Plan integrity checked, not assumed.** `git hash-object` on `plan.md` returned
`37c8860214edaf68e1e5299f18fcceb7c43fc36b` at 21402 bytes, matching the driver's self-reported pointer.
That pointer is checked by no hook; this worker verified it independently rather than taking it on
faith.

**D-2 — The `0027` "mismatch" was run to ground before being accepted.** The first `0027` comparison
differed from the sentinel in quote characters at *identical* length (404 vs 404). Rather than eyeball
it as benign, `fact_value()` was read from `dashboard.sh:60-62` and found to be `tr '\n"' " '"` —
provably length-preserving, so incapable of hiding a truncation. It was then folded into the
comparator so every subsequent check stayed byte-exact. **The alternative — accepting an eyeball
verdict — is precisely what the brief's step 6 forbids.**

**D-3 — Deviation from the plan's AP-1 class list for `0027`, and why.** The plan's §0 table filed
`0027` under *"asserts independence in prose"*, which would have earned it a plain
`- **Depends on:** nothing.` **Reading the brief showed that is wrong** — `0027` asserts no
independence anywhere; it states a real timing gate ("revisit when Sprint 5 is underway"; "Both briefs
are intentionally deferred until Sprint 5 is underway"). It was transcribed as a timing gate. The
governing rule is the owner's — classify by what the brief actually says — and it beats the plan's
pre-read guess. **This is why the Build instruction said to re-derive rather than copy the plan's
lists, and it is the one place that instruction changed an outcome.**

**D-4 — `0024` likewise reclassified out of the silent class.** The plan listed it silent (R-AP1
option B). Its own Notes in fact state a gate: *do not scope implementation until a short investigation
confirms which messages are most frequently sent*. That is a brief-asserted prerequisite, so it was
transcribed as one rather than given the hedge.

**D-5 — `0031`: the DAU threshold was NOT attributed to this task.** The plan's §4 flag said the gate
is "gated on mobile DAU > 1,500" and to transcribe as-is. Reading the brief, that threshold gates **the
parked Task 5**, which `0031` is merely *"Related to"* — it is not stated as a gate on `0031` itself.
Transcribing it as `0031`'s gate would have **fabricated a dependency**, the exact failure the brief
forbids. The declaration records `0031`'s own stated gate (schedule once mobile performance/crash data
is clearer) and flags the DAU threshold with its real owner.

**D-6 — `0047`: `T4g` transcribed verbatim, never mapped.** The brief sequences this task *after T4g
merges*. `T4g` is an internal chunk label with no board task id. It was copied as written, with an
explicit note that `0196` did not map it to a task number.

**D-7 — `0023`: `Task 8` transcribed verbatim, never mapped.** Same treatment. The brief names a
centralized name-rendering component as "Task 8 (Sprint 4/5)"; that label does not resolve to a current
task id and was not guessed at. Also, `0013-player-profile-store-impl` was transcribed exactly as the
brief names it — its current file location was **not** looked up and folded in, because that would be
re-scoping, not transcription.

**D-8 — `0026` and `0048`: `Blocks:` facts recorded as such, not converted.** The plan flagged `0026`
as naming nothing it depends *on*. Confirmed, and `0048` turned out to be the same shape — its Sprint
field describes the gate it *imposed* on profile-store go-live, since **lifted** by owner ruling
2026-06-28. Both declarations say plainly that the relationship runs outward, so a reader is not misled
into treating a Blocks fact as a gate. **`0048` was NOT left-and-reported** as the plan allowed for:
its own gate (engineering scoped only after legal findings) is stated unambiguously in its Type field.

**D-9 — `0018`: struck-through entries excluded, per plan §3(a) rule 5.** The `~~Yandex catalog item~~
— moved to 0065` line is the brief saying it is no longer a gate, so it is recorded as struck and
moved, not as a live dependency. The strikethrough prose was left untouched.

**D-10 — R-AP1's two classes were kept distinct, as ruled.** Six briefs got the plain
`- **Depends on:** nothing.` because their own prose positively asserts independence — `0028`
("no engineering dependency"), `0036` ("no dependencies" / "No dependency on the citizenship/payments
track"), `0037`, `0038` ("independent bug" / "independent fix"), `0043` ("no dependency… Self-contained,
no blockers"), `0044` (an explicitly *removed* coupling). Five briefs got option B's honest hedge
because they assert nothing either way — `0015`, `0016`, `0022`, `0035`, `0045`. **The classes were not
collapsed.** The count differs from the plan's forecast (11 silent, 5 asserting) because four of its
predicted-silent briefs (`0024`, `0031`, `0033`, `0039`) turned out to state real gates on re-reading,
and `0027` moved out of the asserting class per D-3.

**D-11 — Declarations deliberately over-include.** `dashboard.sh`'s own rule 3 orders it: *"for BL/P/S,
OVER-INCLUDE trailing prose rather than guess where the dependency ends: verbose is a cosmetic cost, a
dropped dependency is a fabrication."* Board cells for these briefs are therefore long, and R-AP1's
hedge cells read as a caveat rather than a clean `ready`. **That is the intended signal the owner
accepted, not a defect to tidy up later.**

**D-12 — Bold markup avoided *inside* declaration bodies.** `sanitise()` strips `**`, so bold inside
the text would make the expected/actual comparison diverge for a purely cosmetic reason and dilute the
truncation signal. Pipes (`|`) were avoided for the same reason — `sanitise()` replaces them with a
space.

**D-13 — Nine briefs needed a `## Notes` section created.** `0015`, `0016`, `0021`, `0027`, `0033`,
`0034`, `0035`, `0045` and `0047` had none, so one was appended **at the end of the file** per plan §4
step 4. `0035` does have a `## Notes for the release decision` section; that was **left alone** and a
separate plain `## Notes` added, rather than repurposing a section scoped to something else.

> ⚠️ **Self-corrected mid-run, recorded rather than quietly fixed.** `0033` and `0034` first got their
> new `## Notes` inserted directly after `## Status`, mid-document, which contradicts plan §4 step 4's
> "at the end of the file". Both were moved to the end and **re-verified through the parser** (`0033`
> 697 → 679 chars, from a small wording change made in the same move; `0034` unchanged at 447). The
> full 30-brief verification was re-run after the move and returned `fail=0`, and the board gate was
> re-run and stayed clean.

**D-14 — No secrets in any artifact.** `0016`, `0030`, `0045` and `0047` name credentials. Every
declaration names the **variable or config-slot name only** — `storageEndpoint`, `storageBucket`,
`storageAccessKey`, `storageSecretKey`, `PROFILE_IMAGE`, `DOCKER_TOKEN`. No value, host, DSN or
endpoint appears anywhere.

**D-15 — No §7 stop condition fired.** No Batch A diff was wrong; no roll-up count changed; no new
drift fact of any kind appeared; zero Batch B briefs proved untranscribable against the ~3 threshold.
The run completed without needing to stop.

---

### Review round 1 — process-review dispositions (2026-09-01)

**D-16 — Review round 1, R2 (`0047`): corrected a false justification clause. Autonomously applied
under owner disposition D1 (2026-09-01).** The bullet asserted `T4g` "is an internal chunk label, not a
board task id, and `0196` did not map it to a task number." **That was false.** Verified in two places:
`ai-agents/tasks/done/0183-profile-04g-argv-concurrency-hardening/brief.md:1` is titled
`… Argv-safety + concurrency lock + atomic deploy record + deploy-target preflight (T4g)`, and
`ai-agents/tasks/done/0013-player-profile-store-impl/brief.md:79` carries the mapping row
`| T4g | 0183-profile-04g-argv-concurrency-hardening | … | ✅ Done (PR #125) |`. Because `0183` is in
`done/`, the single gate this declaration records was **already satisfied**, so the board was showing
an open gate that is met — the fabricated-blocker direction, the mirror of the fabricated-`ready` this
task exists to delete. **What changed:** only the false clause, replaced by the resolution plus the
satisfied state. **What did not:** the gate itself, still transcribed verbatim as `T4g` per plan §4's
instruction, and every other clause in the bullet. **Why it qualified:** it is a factual error inside a
justification, correctable without re-scoping — exactly the class D1 authorised.

**D-17 — Review round 1, R3 (`0044`): removed a Blocks fact cited as Depends-on evidence.
Autonomously applied under owner disposition D1 (2026-09-01).** The plain `- **Depends on:** nothing.`
cited the Priority field's "Not a prod blocker; safe weekend deploy" (`0044/brief.md:10`) as evidence of
no dependency. **That is an urgency/Blocks fact, not a dependency fact** — the very distinction
`0028:75-76`, `0026:87`, `0033:178` and `0039:83` draw explicitly in this same sweep. **What changed:**
that clause is deleted; nothing was put in its place. **What did not:** the `nothing.` classification,
which stands on the `0042-starting-gold-public-modifier` decoupling sentence (`:111`, "The two tasks no
longer depend on or sequence against each other") that the bullet already cited. **Why it qualified:**
no dependency was invented or lost — only an unsound piece of evidence removed.

**D-18 — Review round 1, R5 (`0022`): narrowed an overstated hedge and named the in-text gate.
Autonomously applied under owner disposition D1 (2026-09-01).** The hedge read "this brief asserts no
gate **anywhere in its text**", but `0022/brief.md:88` reads "**Decide the resolution policy with Mark
before implementing.**" — a real stated pre-implementation gate. **What changed:** the wording now
matches the accurate sibling variant at `0035:267` ("no gate **on another task** anywhere in its
text"), and the in-text gate is named explicitly as an owner decision scoped to the risk-2 branch.
**What did not:** no task is named, so the dependency conclusion is unchanged. **Scope of the fix:**
`0022` only. The other three hedges keeping the "anywhere in its text" variant (`0015`, `0016`,
`0045`) were each re-read — none carries an in-text gate, so their wording is not false and was
deliberately left alone rather than harmonised for cosmetic consistency.

**D-19 — Review round 1, R1 (`0012`, `0014`, `0017`, `0018`): reordered gate-first. Applied under
owner disposition D2 (2026-09-01) — NOT autonomous.** These four rendered a `depends=` fact that
**opened with a negation** ("nothing blocks the buildable scope", "nothing blocks the build", "nothing
blocks the mock build", "no task") while the row's Status cell read `🚧 Blocked` and the real live gate
sat only in a later sentence. Nothing was hidden — the full text renders (`one_line_cell` is applied
only to the status cell, `dashboard.sh:777`) — but a reader or eligibility check keying on the opening
clause meets a `ready`-shaped phrase. **This was classified a frontier-move, not a defect, and was NOT
touched autonomously:** the negation wording is the owner's own 2026-08-23 ruling language, so
reordering it was the owner's call and was ruled explicitly. **What changed:** clause order only — the
live gate now opens each bullet (`0062` for `0012` and `0017`, `0065` for `0018`, Yandex catalog
approval for `0014`), bridged into the owner's wording by "Beyond that tail," / "Beyond that live
tail," / "It is this task's only gate. On tasks:". **What did not:** the owner's negation wording is
kept verbatim, and no gate was added, dropped, re-scoped, or re-directed in any of the four. Precedent
followed: `0065`'s pre-existing declaration, which already leads with its gates.

**D-20 — Review round 1, R4 (`0021`): accepted as a residual, NOT fixed. Owner disposition D3
(2026-09-01).** The declaration names `0166`, `0191`, `0018`, `0017` while the brief's prose (`:7`,
`:27`) states the relationship as ownership/read-before rather than blocking. **`0021` was deliberately
not edited.** Grounds: the brief itself titles that list `## Dependencies`, so the bullet transcribed
what the brief says, and reversing the direction would breach this task's own transcribe-never-re-scope
rule. Recorded in `review.md`'s **Accepted residuals** section so no later review round re-raises it.
Correcting the direction, if wanted, is a separate brief against `0021`.

**D-21 — Every review finding was verified against the files before any edit; none was applied
mechanically.** All five were checked and **all five held**, so nothing was returned as
`NEEDS-DECISION` and nothing was refused. The R-AP2 scaffold was re-created solely to re-verify the
three unlinked briefs (`0022`, `0044`, `0047`) through the parser rather than by eye, and **deleted
again before hand-off** — `git status --porcelain` shows it gone, and `ai-agents/sprints/` holds only
the five real boards plus `plan-index.md`. Post-edit re-verification re-ran the plan's §5 three
assertions on all 7 edited bullets: 7/7 non-`none recorded`, 7/7 tail-matched, 7/7 whole-string
text-identical (the only byte deltas being the extraction's missing trailing newline and `sanitise()`
rewriting `"`→`'` in `0022` and stripping `**` around *already satisfied* in `0047`). All five boards
re-checked: `UNPARSEABLE` = 0 everywhere, Sprint 4 roll-up byte-identical, no new drift fact.

---

## 7. Residual notes for the owner

- **The 31 → 30 discrepancy in the brief remains unexplained** and is recorded as such rather than
  smoothed over. The list of 30 is the scope of record.
- **The brief's own text is now one task out of date** in two places — it names `0025` as a live
  Sprint 4 row rendering `none recorded`, and states the board-visible count as 8. Both were true when
  filed. **Not corrected by this run**: editing the brief's Context beyond adding the declaration is
  outside this task's documentation-only surface, and `0196`'s brief already carries a correct
  `**Depends on:** nothing.` of its own.
- **A stale wiki-vault mirror of any swept brief is a `/fkit-wiki-sync` for `fkit-wiki`.** Not checked
  and not touched by this run — the vault is that role's exclusive write surface.
- **`plan-index.md` does not render** under `dashboard.sh` (`no '## Status' section`). Pre-existing,
  untouched, flagged only so it is not mistaken for something this sweep broke.
