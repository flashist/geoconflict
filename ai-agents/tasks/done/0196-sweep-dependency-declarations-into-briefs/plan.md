# Implementation plan — `0196` Sweep real dependencies into the canonical `**Depends on:**` declaration

**Task:** `0196` · Sprint 4 · Medium · owner: fkit-producer
**Brief:** `/Users/mark.dolbyrev/Workspace/geoconflict/ai-agents/tasks/done/0196-sweep-dependency-declarations-into-briefs/brief.md`
**Plan written:** 2026-08-31, by the producer, from re-derived measurements (the brief's own lists were NOT trusted, per its step 1).

> ⚠️ **Driver transcription note (fkit-lead, 2026-08-31).** This plan was returned by a spawned
> `fkit-producer` through the subagent return channel, which **HTML-escaped four character classes**:
> `&lt;` → `<`, `&gt;` → `>`, `&amp;` → `&`, and `&&` inside the awk snippet. The driver **decoded those
> entities back to their literal characters** when writing this file, so the shell and awk commands in
> §5 are runnable as written. That decoding is the **only** alteration; no other byte was changed, and
> nothing was summarised, reordered, or omitted. **This is disclosed rather than claimed as a pure
> byte-for-byte copy** — a decode is a transformation, and calling it "verbatim" without saying so
> would be the exact overstatement this loop's carry construction exists to prevent.

---

## 0. Two approval points the owner must settle before the sweep starts

Both are inside the brief's own rules; neither reopens the two closed rulings (scope = all no-declaration briefs; Sprint 4 / Medium). Read these before approving.

### AP-1 — What a *silent* brief gets. **This is the sharpest call in the task.**

The brief's step 5 says a brief with genuinely no dependencies gets an explicit `- **Depends on:** nothing.` But a brief that simply **never mentions** dependencies is not the same as a brief that **asserts it has none**. Writing `nothing.` over silence would fabricate an absence — the exact error class this task exists to delete, just relocated from the parser into the brief.

The 30 briefs split three ways:

| Class | Example briefs | What it says |
|---|---|---|
| **Asserts independence in prose** | `0036`, `0043`, `0039`, `0028`, `0027` | "no dependencies", "no dependency on the citizenship/payments track", "no engineering dependency" |
| **States real gates in prose** | `0012`, `0017`, `0018`, `0030`, `0032`, `0014`, `0020`, `0021`, `0023`, `0026`, `0029`, `0034`, `0047`, `0048` | a `## Dependencies` section or explicit sequencing prose |
| **Silent — no dependency statement of any kind** | `0015`, `0016`, `0022`, `0031`, `0033`, `0035`, `0037`, `0038`, `0044`, `0045`, `0024` | nothing to transcribe in either direction |

Options for the silent class:

- **A.** Write `- **Depends on:** nothing.` — literal step 5, maximum board coverage, **claims a verified absence the brief never asserted.**
- **B (recommended).** Write an honest canonical declaration that is still a single parseable bullet, e.g.
  `- **Depends on:** nothing recorded — this brief asserts no gate anywhere in its text, and `0196` transcribed rather than re-scoped it. Not an independent verification that none exist.`
  Parser-readable, board-visible, and it never claims more than the source does.
- **C.** Leave them untouched and report them as a residue — but that leaves them rendering `none recorded`, which is the failure we are removing.

**Recommendation: B for the silent class, A's plain `nothing.` for the class that positively asserts independence.** Tradeoff: B's board cells are longer and read as a caveat rather than a clean "ready". That is the intended signal.

### AP-2 — A throwaway board is needed to verify the 23 unlinked briefs.

`dashboard.sh` has **only** board mode — one argument, a plan file (`.claude/skills/fkit-status/dashboard.sh:303-317`). It reads a brief only through a board row that links it. **23 of the 30 briefs in scope are on no board**, so the brief's verification step 2 ("the emitted `derive` text is the complete declaration") is unreachable for them without a board.

- **Recommended:** create a throwaway board `ai-agents/sprints/_scratch-0196-verify.md` linking all 30 briefs, run the parser against it, then **delete it**. It must live under a directory with `tasks/backlog` above it (`dashboard.sh:320-328` walks up), so the scratchpad cannot host it. It is **untracked**, so `git diff --stat` never shows it, and `git status --porcelain` at hand-off proves it is gone.
- Alternative: skip parser verification for the 23 and report them as *added-but-not-parser-verified*. That is exactly the "verify with your eyes" the brief forbids in step 6.

**Recommendation: the throwaway board, disclosed here rather than done quietly.**

---

## 1. Measurements, re-derived today (2026-08-31)

Both were re-run from scratch. **Do not carry the brief's 8 / 31 forward.**

### (1) `depends="none recorded"` over every board — run today

`bash .claude/skills/fkit-status/dashboard.sh ai-agents/sprints/<plan>` on all five boards plus `plan-index.md`:

| Board | `none recorded` facts | Of those, with a real linked brief |
|---|---|---|
| `plan-sprint-4.md` | 6 | **6** — `0012`, `0014`, `0017`, `0018`, `0030`, `0032` |
| `plan-sprint-6.md` | 5 | **1** — `0027` (other 4 are `drift missing-brief`, no linked brief) |
| `plan-sprint-5.md` | 7 | **0** — all 7 are `drift missing-brief` rows |
| `sprint-backlog.md` | 23 | **0** — all 23 are `missing-brief` + `unknown-marker` |
| `backlog.md` | 0 | 0 — every row there already declares |
| `plan-index.md` | 0 | 0 |

**Board-visible-today set is 7, not 8.** The brief's 8 included **`0025`**, which has since moved to `ai-agents/tasks/done/0025-licensing-asset-audit/` (commit `f2b9422`). Its row no longer emits the fact. **`0018` is now the only live Sprint 4 row in this set** — the brief's "`0018` and `0025`, both live Sprint 4 rows" is one task out of date.

### (2) No declaration of any form under `tasks/backlog/` — run today

The brief's own loop, re-run verbatim: **30 briefs**, not 31.

```
0012-personal-inbox                            0033-monitoring-alert-bot-phase1
0014-yandex-catalog-registration               0034-monitoring-alert-bot-phase2
0015-remove-password-deploy-fallbacks          0035-worker-init-timeout-map-refetch
0016-secret-management-beyond-env-files        0036-bots-skip-sam-when-nukes-disabled
0017-citizenship-earned                        0037-fix-fusetag-dead-polling-loop
0018-citizenship-paid                          0038-fix-gutterads-usermeresponse-unsubscribe
0020-analytics-p1-ad-impression-tier           0039-bots-hydrogen-bomb-sam-penetration-investigation
0021-analytics-p1-citizenship-funnel           0043-defense-post-range-always-visible
0022-win-check-multiplayer-regression-invest.  0044-infinite-gold-force-no-nukes-public-rotation
0023-streamer-program                          0045-vps-registry-credential-hygiene
0024-ux-quick-message-access                   0047-deploy-transport-secret-hygiene
0026-fix-compact-map-shore-generation          0048-compliance-152fz-notification-consent
0027-new-maps-community-demand
0028-content-hint-videos-production
0029-hint-videos-in-game
0030-archive-s3-backed-citizen-gated
0031-mobile-webgl-rendering
0032-investigate-null-id-errors
```

**Why the number moved, honestly:** `0025` and `0066` both closed out of `tasks/backlog/` in commit `f2b9422` (2026-08-31) and **both lacked a declaration**, so the set should have dropped by 2 (31 → 29). It reads 30. Every one of the 30 was created on or before 2026-08-10 (`git log --diff-filter=A`), and no brief filed since 2026-08-28 lacks a declaration — so no new arrival explains the gap. **The brief's "31" is off by one against today's reproducible list and I could not reconcile it**, because the brief recorded only the count, never the list. I do not treat 31 as authoritative. **The list of 30 above is the scope of record**, and it is what gets copied verbatim into the worklog.

---

## 2. Batch order

**Batch A — the 7 board-visible-today briefs** (`0012`, `0014`, `0017`, `0018`, `0027`, `0030`, `0032`). These are the ones lying to a reader *now*, and `0018` is a live Sprint 4 row the ship-loop's eligibility check reads. Swept first, **fully verified before Batch B starts** — so a method error surfaces on 7 briefs, not 30.

**Batch B — the remaining 23.** Same edit, verified through the AP-2 throwaway board.

Within Batch A, `0018` goes first (highest live consequence), then `0030` and `0032` (both carry numbered `## Dependencies` lists — the flattening hazard, see §3), then `0012`, `0017`, `0014`, `0027`.

---

## 3. The two parser facts, and exactly how each is handled

Both re-read from `dashboard.sh` source today rather than taken from the brief's summary.

### (a) Single unbroken bullet — `joinFrom`, `dashboard.sh:600-607`

```
if (blank(L[j]) || heading(L[j]) || F[j]) break
if (listItem(L[j]) && indent(L[j]) <= base) break
```

The join ends at a **blank line**, a **heading**, a **fenced-code line**, or a **sibling-or-shallower list item**. A *more-indented* list item is swallowed as part of the declaration — that is the truncation trap: `**Depends on:** hard prerequisites:` + `- task 12` / `- task 13` returned the non-empty string `hard prerequisites:`, so the loud path never fired and both tasks vanished.

**Rules the sweep follows, without exception:**

1. Exactly **one** `- **Depends on:** …` bullet per brief, at top level of `## Notes`.
2. **No sub-bullets. No blank line. No heading. No fence** inside the declaration.
3. Wrapping across lines is allowed and expected — continuation lines are **indented plain text** (leading spaces, not starting with `-`/`*`/`+`), which `joinFrom` joins.
4. `0030`'s `## Dependencies (hard blockers)` numbered list and `0032`'s `## Dependencies (both must be live before triage)` list are **flattened into one prose sentence**, joined with "and"/";" — never transcribed as a list.
5. `0018`'s `## Dependencies` contains **struck-through** entries (`~~Yandex catalog item~~ — moved to 0065`). Struck items are **excluded** from the declaration; the strike is the brief saying it is no longer a gate. The strikethrough prose stays in place untouched.

### (b) Form priority, not line order — `dashboard.sh:644-693`

Verified in source: the arms are **four separate full-file loops**, `S` → `B` → `P` → `U`, each exiting on first catch. So the loud `U` (unparseable) arm **cannot** preempt a bold declaration placed later in the file, and neither can a stray prose line. Two consequences:

- **Placement in `## Notes` at the end of the brief is safe** for all 30. The step-1 loop's regex covers exactly the `S`/`B`/`P` forms, and it returned all 30 — proving none of them contains any competing declaration-shaped line to win the `B` loop first.
- **Use the `BL` form** (`- **Depends on:** text`). Extraction (`dashboard.sh:647-654`) sees text opening with `**`, strips it, and returns the remainder whole — bold *inside* the dependency text is then safe. The `BI` form (`**Depends on: text**`) truncates at the next `**` and must not be used.

---

## 4. Per-brief procedure

For each brief, in batch order:

1. **Read the brief's own dependency prose** — its `## Dependencies` section, Priority/Context sequencing sentences, or Notes.
2. **Transcribe, never re-scope.** Only gates the brief already asserts. No inference, no upgrade, no "obviously it also needs X". *A fabricated dependency is a different lie, not a fix.*
3. **Leave every line of existing prose exactly where it is.** The bullet sits beside it. `0065` is the worked precedent — it carries both and says so inside the bullet.
4. **Append one bullet** to `## Notes` in the `BL` shape, first bullet in the section:
   ```
   - **Depends on:** <gates, one unbroken sentence — full prose stays in the `## Dependencies` section above; this bullet is the machine-readable form beside it>
   ```
   If a brief has no `## Notes` section, add one at the end of the file — that is a heading addition inside `brief.md` only.
5. **Verify with the parser before moving to the next brief** (§5). Never by reading the diff — the (a) failure mode is invisible in a diff.
6. **Secrets:** several briefs in scope name credentials as variables (`0016`, `0045`, `0047`, and `0195`-adjacent prose). The declaration names the **variable** only — never a value, host, or DSN.

### Briefs where transcription is likely to be genuinely unclear — flagged now, resolved during the sweep, **left and reported rather than guessed**

| Brief | Why it may resist clean transcription |
|---|---|
| `0047` | States ordering against **`T4g`** — an internal chunk label, not a board task id. Plan: transcribe the label verbatim (`after T4g's transport code merges`) and do **not** map it to a task number. |
| `0031` | Gate is a **metric threshold**, not a task: "gated on mobile DAU > 1,500". Transcribe as-is. |
| `0048` | Says a Sprint 4 legal gate is "deliberately lifted" — the gate's live state is ambiguous from the brief's own text. Candidate for leave-and-report. |
| `0026` | Calls itself "the prerequisite for" other work but names nothing it depends **on** — a `Blocks:` fact, not a `Depends on:` fact. |
| `0023` | Names a "Sprint 5 dependency" on a centralized name-rendering component from "Task 8" — `Task 8` does not resolve to a current task id. Transcribe the label, do not guess the id. |
| the 11 silent briefs | AP-1 decides these. |

Any brief that cannot be transcribed honestly is **skipped and listed in the worklog by name and reason.** A skipped brief is a reported outcome, not a failure.

---

## 5. Verification protocol

### Per brief, immediately after the edit

Board-linked briefs, against their own board:

```
bash .claude/skills/fkit-status/dashboard.sh ai-agents/sprints/plan-sprint-4.md \
  | sed -n 's/^derive 0018 depends="\(.*\)"$/\1/p'
```

Three assertions, all mechanical:

1. **The fact is no longer `none recorded`**, and no `drift depends-unparseable` / `⟨UNPARSEABLE — see brief⟩` appeared for that id.
2. **Tail match — the truncation detector.** The sentinel's last ~40 characters equal the bullet's last ~40 characters. Truncation at a sub-bullet or blank line changes the tail and nothing else; this is the assertion that catches failure (a).
3. **Whole-string diff.** Extract the expected text from the brief and diff it against the sentinel:
   ```
   diff <(awk '/^- \*\*Depends on:\*\*/{f=1;printf "%s",$0;next} \
                f && /^[ \t]+[^-*+ ]/{printf " %s",$0;next} f{exit}' \
            ai-agents/tasks/backlog/<dir>/brief.md \
          | sed 's/^- \*\*Depends on:\*\* *//' | tr -s ' ') \
         <(bash .claude/skills/fkit-status/dashboard.sh ai-agents/sprints/<plan> \
          | sed -n 's/^derive <id> depends="\(.*\)"$/\1/p' | tr -s ' ')
   ```
   A non-empty diff is inspected by eye before proceeding — `sanitise()` may legitimately alter quoting, and that is the only acceptable class of difference. **Any difference in length or tail is treated as truncation and fixed, not accepted.**

Unlinked briefs: identical assertions, run against the AP-2 throwaway board.

### Before/after evidence for the whole run

Captured **before the first edit** and again at the end, and both saved to the worklog:

- Every board's `⟦FACTS⟧` block, whole.
- Every board's roll-up counts line (e.g. Sprint 4's `42 done · 1 in progress · 6 blocked · 6 backlog · 3 cancelled — of 58`) — **must be byte-identical after.**
- Every `drift` fact. The pre-existing drift stays **exactly as it is**: 7 `missing-brief` on `plan-sprint-5.md`; 4 `missing-brief` on `plan-sprint-6.md`; 23 `missing-brief` + 23 `unknown-marker` on `sprint-backlog.md`; and on `backlog.md` the `0008`/`0010`/`0011` disagreements and the `0057`/`0062` `moved-without-target` rows. This task fixes none of it and must not make it worse — the before/after pair is what proves that.

### Final gates

- `bash .claude/skills/fkit-status/dashboard.sh` on all five boards emits **no** `depends="none recorded"` for any brief in scope (except any brief deliberately skipped under §4 and named in the worklog).
- No new `drift depends-unparseable` anywhere.
- Every prose dependency section that existed before still exists, unedited — proved by the diff showing pure additions in those regions.

---

## 6. No-change surface

`git diff --stat` at hand-off shows **only** `ai-agents/tasks/backlog/*/brief.md` files, plus `0196`'s own `worklog.md`. Specifically **not** changed:

- No status cell, no priority cell, no sprint field — in any brief or any board.
- No plan/board file at all. No `dashboard.sh` edit (upstream fkit tooling; a suspected defect there is `0053`'s territory, not this task's).
- No file moved between `backlog/`, `done/`, `cancelled/`. No mover skill invoked — producer-only since ADR-033; this run routes its close to the producer.
- Nothing under `ai-agents/wiki-vault/` — `fkit-wiki`'s exclusive surface. A stale vault mirror of a swept brief is a `/fkit-wiki-sync` for the wiki role, reported not fixed.
- No commit, no push.
- `git status --porcelain` shows the AP-2 throwaway board is deleted.

---

## 7. Stop conditions

Stop and report rather than continue if any of these appear:

- A Batch A verification diff is non-empty for a reason other than `sanitise()` quoting — the method is wrong and Batch B must not run on it.
- A roll-up count changes.
- Any new `drift` fact of any kind.
- More than ~3 briefs in Batch B prove untranscribable — that is a signal the AP-1 ruling needs revisiting, not something to push through.

---

**Deliverables:** 30 `brief.md` files carrying one canonical declaration each (minus any named skip), and `0196`'s `worklog.md` recording the verbatim list acted on, the before/after board facts, the skipped briefs with reasons, and the two measurement numbers found today (7 board-visible, 30 in scope) against the brief's stated 8 / 31.

---

# OWNER RULINGS — 2026-08-31, binding amendments to this plan

The owner approved this plan via `AskUserQuestion` in the fkit-lead session on 2026-08-31, and in the
same exchange settled both approval points in §0. **These are owner rulings, not the producer's
recommendations restated — they bind the build.**

## R-AP1 — Silent briefs get the honest hedge (option **B**). RULED.

The 11 briefs that make **no dependency statement of any kind** (`0015`, `0016`, `0022`, `0031`,
`0033`, `0035`, `0037`, `0038`, `0044`, `0045`, `0024`) get option **B**, not option A:

```
- **Depends on:** nothing recorded — this brief asserts no gate anywhere in its text, and `0196`
  transcribed rather than re-scoped it. Not an independent verification that none exist.
```

The wording above is the shape, not a mandated byte string; it must stay **one unbroken bullet** under
§3(a)'s rules and must not claim more than the source does.

**The distinction in §0/AP-1 is preserved and is load-bearing:** briefs that **positively assert
independence** in their own prose (`0036`, `0043`, `0039`, `0028`, `0027` and any other found during
the sweep) get the plain `- **Depends on:** nothing.` — because there the brief *did* make the claim
and transcribing it is honest. **Do not collapse the two classes.** The owner's stated reason for
choosing B was that writing a bare `nothing.` over silence would assert a verified absence the brief
never made — relocating the fabricated-absence defect from the parser into the brief.

**Consequence accepted by the owner:** board cells for these 11 are longer and read as a caveat rather
than a clean `ready`. **That is the intended signal, not a defect to tidy up later.**

## R-AP2 — Verify the 23 unlinked briefs through a throwaway board (option **recommended**). RULED.

Create `ai-agents/sprints/_scratch-0196-verify.md` linking all 30 briefs in scope, run the parser
against it to satisfy §5's three assertions for the unlinked ones, then **delete it before hand-off.**

Binding conditions on this:

1. It **must not be committed** and must stay untracked — `git diff --stat` must never show it.
2. It **must be deleted** before the build returns. `git status --porcelain` at hand-off is the proof,
   and that output goes in the worklog.
3. It is a **verification scaffold only**. It is not a board, it is not linked from `plan-index.md`,
   and no task's status is read from or written to it.
4. If it cannot be deleted for any reason, that is a **stop-and-report**, not something to leave behind.

The owner's stated reason: skipping the parser check for the 23 is exactly the *"verify with your
eyes"* the brief's step 6 forbids, and the truncation failure in §3(a) is **invisible to eyes** — it
is visible only in the sentinel.

## What was NOT reopened

The two rulings of **2026-08-28** stand untouched: **scope is every no-declaration brief** (today's
re-derived list of **30**, not the brief's stated 31), and the task stays in **Sprint 4** at
**Medium**. The owner was shown a narrower "7 board-visible only" option at the plan gate and
**declined it**.

## Standing on the disputed count

The producer's refusal to launder the unreconcilable **31 → 30** gap is **endorsed**, not overridden.
The **list of 30** in §1(2) is the scope of record. The worklog carries the list verbatim, and states
that the brief's 31 could not be reconciled and why.
