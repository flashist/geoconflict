# Sweep real dependencies into the canonical `**Depends on:**` declaration so the board can see them

## ID
0196

## Sprint
Sprint 4

## Priority
**Medium.**

The three sibling board-hygiene sweeps (`0050`, `0051`, `0053`) are all `Unscheduled`, and this task
looks like one of them. It is not quite: those repair **legacy/historical** records, while this one
repairs **live rows on the active Sprint 4 board** — `0018` and `0025` ⚠️ *(corrected 2026-09-01:
`0025` had closed by the time this task ran, leaving `0018` the only live Sprint 4 row — see the
correction in Context)* — that the sprint ship-loop's
eligibility check is reading *this week*. The failure mode is also the worse-signed one: not a missing
answer but a **fabricated** one (see Context). Nothing player-facing and nothing in production is at
risk, so it is not High.

✅ **Sprint placement OWNER-CONFIRMED 2026-08-28** (ruled that day via `AskUserQuestion` in the lead
session, relayed to the producer through the lead). The owner promoted this into **Sprint 4** over the
`0050`/`0051`/`0053` precedent, on the producer's stated grounds: those sweeps repair legacy records,
whereas this one repairs rows the ship-loop's eligibility check is reading now, and the error direction
is a **fabricated `ready`** rather than a visible blocker. The earlier "sprint placement is the
producer's default, not a ruling" marker is **closed — no longer an open question.** The **Medium**
priority is the producer's and the owner did not disturb it.

⚠️ **The Sprint 4 board row was appended at the end of the status table, and that encodes no rank.**
That board is unranked (every Priority cell reads `—`), so row order carries no meaning there. This was
an **append**, not a mid-board insertion above the `✅ Done` rows — the case fkit's **ADR-035**
(*a mid-board insertion is not the owner-ruled re-rank exception*) bars, and the same treatment `0195`
documents for itself.

> 📎 **ADR-035 is cited by name, not linked, on purpose.** It is one of **fkit's own upstream ADRs**
> (the `adr-0XX` series, which lives in the fkit install share). This project's
> `ai-agents/knowledge-base/decisions/` holds only the `adr-1XX` series, so a relative link into it
> would not resolve. ⚠️ **`0195`'s brief carries exactly that broken link** — pre-existing, out of this
> task's scope, and **not to be fixed from here**; recorded so it is not copied forward.

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-producer

## Context

`dashboard.sh` — the deterministic board renderer behind `/fkit-status`, and the same reader the sprint
ship-loop consults when deciding what is eligible to pull — derives each open task's next step from a
**canonical dependency declaration inside the brief**. When a brief carries none, the row renders
`⟨derive: none recorded⟩` and emits `derive <id> depends="none recorded"`.

A reader — human or agent — sees `none recorded` and concludes **"no gates, ready to pull."** For most
of the affected briefs that is false: their real gates exist, in prose, in the `## Notes` section or the
body, where the parser cannot reach them.

This is the same failure the board has already been bitten by twice this month: `0064` was
board-invisible until a row was added 2026-08-24, and `0065`'s gates lived only in a `## Dependencies`
prose section until they were converted into the canonical bullet.

### 🚨 The direction of the error is what makes this worth doing

`dashboard.sh`'s own source records the reasoning, at the `*)` branch of its next-step derivation:

> *…conflating them is what let a declaration the parser could not read become `none recorded` — which
> the LLM renders `ready`, inventing the ABSENCE of a dependency. That is the original R1 with the sign
> flipped, and it is the worse direction: **a wrong dependency is visible, a fabricated `ready` is
> not**.*

A wrong dependency gets challenged the moment somebody reads it. A fabricated `ready` gets acted on.

### What was actually measured (2026-08-28)

📌 **A "14" appeared in this task's framing and is WRONG — do not go looking for its source.** It was
an **unverified relay**: the lead session passed on a figure from an earlier producer's report without
measuring it, and confirmed on 2026-08-28 that it is not reproducible. **It was never a measurement.**
Recorded here so a later reader does not hunt for a derivation that never existed. The raw per-board
`depends="none recorded"` counts are 7 (`plan-sprint-4.md`), 7 (`plan-sprint-5.md`), 5
(`plan-sprint-6.md`), 23 (`sprint-backlog.md`), 0 (`backlog.md`) — **no combination yields 14.**

The two figures that *are* measured, by running
`bash .claude/skills/fkit-status/dashboard.sh <plan>` over every board and collecting the
`depends="none recorded"` facts:

**(1) 8 briefs are board-linked with a real brief and render `none recorded` TODAY** — the ones
actively misleading a reader right now:

| Board | Briefs rendering `none recorded` |
|---|---|
| `plan-sprint-4.md` | `0012`, `0014`, `0017`, `0018`, `0025`, `0030`, `0032` |
| `plan-sprint-6.md` | `0027` |
| `plan-sprint-5.md` | none with a real brief — its 7 `none recorded` rows are `drift missing-brief` rows with no linked brief at all |
| `sprint-backlog.md` | none with a real brief — 23 rows, all `missing-brief` + `unknown-marker` |
| `backlog.md` | **none** — every row on that board already declares |

Two of the 8 — **`0018`** (Citizenship Core — Paid Citizenship) and **`0025`** (Asset audit) — are
**live Sprint 4 rows**.

⚠️ **Correction 2026-09-01 — the two facts immediately above are one task out of date.** `0025` closed
to `ai-agents/tasks/done/0025-licensing-asset-audit/` before this task ran, so its row stopped emitting
the fact. Re-derived on the day the sweep ran, the board-visible-today set was **7, not 8**
(`plan-sprint-4.md`: `0012`, `0014`, `0017`, `0018`, `0030`, `0032`; `plan-sprint-6.md`: `0027`), and
**`0018` was the only live Sprint 4 row in it**. The 2026-08-28 measurement above is left exactly as
filed — it was correct on that date. Every count of 8 elsewhere in this brief reads against that same
dated measurement. **Scope is untouched by this correction**: the owner's 2026-08-28 ruling was all
no-declaration briefs, the sweep covered 30, and the unreconcilable 31 → 30 gap stands as recorded
below. Source: this task's own `worklog.md` §1 and §7.

**(2) 31 briefs under `tasks/backlog/` carry no declaration of any form** — the superset, and **the
agreed scope** (see the ruling below). Most are not currently linked from any board, so no sentinel is
generated for them today; they become invisible the day they get a row. Reproduce with:

```
cd ai-agents/tasks/backlog && for d in */; do f="$d/brief.md"; [ -f "$f" ] || continue; \
  grep -qE '\*\*Depends on[.: ]|^[ \t]*([-*+][ \t]*)?Depends on[.: ]|^##[ \t]+Depends on' "$f" \
  || echo "$d"; done
```

### ✅ Scope RULED 2026-08-28 — all 31

Owner ruling (via `AskUserQuestion` in the lead session, relayed through the lead), taking the
producer's recommendation. **Reasoning on the record:** the edit is identical per brief, so the marginal
cost past the first 8 is small, and sweeping all 31 stops the same surprise recurring when a
currently-unlinked brief later joins a board. **The scope boundary is no longer an open question.**

**Keep the 8 identified as the board-visible-today subset** while you work — that distinction still
matters, because those are the ones lying to a reader now. Do them first, and verify them first.

## What to build

**Documentation only. No code, no `dashboard.sh` change, no status change, no file moves.**

1. **Re-run both measurements first, do not trust the lists above.** Boards move; `0067` closed the
   same day this was filed. Re-derive (1) the `dashboard.sh` `none recorded` set over every board and
   (2) the no-declaration set under `tasks/backlog/`, and record the list you actually acted on in the
   worklog. **Scope is the full 31** (owner-ruled — see Context); expect the number to have shifted,
   and report the number you actually found rather than forcing it to 31.

2. **Sweep the 8 board-visible ones first**, and verify them before continuing. They are the only ones
   misleading a reader today, so the value lands early and a mistake in the method surfaces on the
   smallest possible batch. Then do the remainder.

3. **For each brief in scope, add one canonical declaration** to its `## Notes` section, in the shape
   the rest of the board already uses:

   ```
   - **Depends on:** <the real gates, in one unbroken sentence>
   ```

   Take the content from what the brief *already says* in prose. **This is a transcription job, not a
   re-scoping job** — do not invent, infer, or upgrade a dependency the brief does not already assert.
   If a brief's real gates are genuinely unclear from its own text, **leave it and report it** rather
   than guessing; a fabricated dependency is a different lie, not a fix.

4. **Leave the existing prose exactly where it is.** It stays the human-facing explanation. The bullet
   is the machine-readable form beside it, not a replacement for it. `0065`'s brief is the worked
   precedent — it carries both, and says so in the bullet itself.

5. **A brief with genuinely no dependencies gets an explicit "none", never silence.**

   ```
   - **Depends on:** nothing.
   ```

   Silence and "no gates" are indistinguishable to every reader; an explicit `nothing` is the difference
   between *"nobody wrote them down"* and *"there are none."* `0062`, `0063`, `0060` and `0195` already
   do this — copy their wording.

### ⚠️ Two parser facts that decide whether this sweep works or silently under-delivers

Both are recorded in `dashboard.sh`'s own source comments. Read them before writing the first bullet.

**(a) Each declaration must be a SINGLE UNBROKEN BULLET.** The parser joins wrapped continuation lines,
but it **stops at a blank line, at a heading, and at a sibling-or-shallower list item** (`joinFrom`).
Wrapping across lines is fine. **Splitting the gates into sub-bullets is not** — and this has already
happened: a declaration written as `**Depends on:** hard prerequisites:` followed by `- task 12` /
`- task 13` yielded the string `hard prerequisites:`, which is *non-empty*, so the loud unparseable path
never fired **and both tasks vanished**. A sweep done carelessly this way reports success while
truncating the declaration back toward `none recorded`.

**(b) The "fabricated absence" this sweep exists to remove has bitten twice already**, per the source
comments: once as the sub-bullet truncation in (a), and once as an unreadable declaration degrading to
the silent `none recorded` that renders as `ready`. The parser now has a loud
`⟨UNPARSEABLE — see brief⟩` + `drift depends-unparseable` path for the second case *precisely because*
the silent path was the more dangerous one. **The sweep is exposed to the identical risk** — that is
why step 5 exists and is not optional.

6. **Verify with the parser, not with your eyes.** After each brief, re-run `dashboard.sh` on the board
   that links it and confirm the `derive` fact carries the **full** text you wrote. Reading the diff is
   not verification here — the (a) failure mode is invisible in a diff and visible only in the sentinel.

## Verification steps

1. Re-running `bash .claude/skills/fkit-status/dashboard.sh <plan>` on **every** board emits **no**
   `depends="none recorded"` fact for any brief in the agreed scope.
2. For each swept brief, the emitted `derive <id> depends="…"` text is the **complete** declaration —
   compare it against the bullet, word for word. A truncation at a sub-bullet or a blank line is the
   failure this step exists to catch.
3. No new `drift depends-unparseable` and no `⟨UNPARSEABLE — see brief⟩` appears anywhere.
4. **No status cell, priority cell, sprint field or task-file location changed.** `git diff --stat`
   shows `brief.md` files and nothing else — no plan files, no moves.
5. The counts in each board's roll-up line are unchanged from before the sweep.
6. Pre-existing drift on `plan-sprint-5.md`, `plan-sprint-6.md`, `sprint-backlog.md` and `backlog.md`
   (missing-brief rows, unknown markers, the `0008`/`0010`/`0011` disagreements, the `0057`/`0062`
   moved-without-target rows) is **unchanged** — this task does not fix any of it, and must not make it
   worse. Record the before/after so that is provable.
7. Every prose dependency section that existed before still exists, unedited.

## Notes

- **Depends on:** nothing. Documentation-only, independently shippable today.
- **Blocks:** nothing directly, but it is what makes `/fkit-status` and the sprint ship-loop's
  eligibility check trustworthy on `0018` and `0025` — both live Sprint 4 rows when this was filed;
  ⚠️ *corrected 2026-09-01: `0025` had closed by the time this task ran, leaving `0018` the only live
  Sprint 4 row — see the correction in Context* — so it is worth doing
  before the next ship-loop pass over Sprint 4.
- **Related:** `0064` (was board-invisible until a row was added 2026-08-24 — the same class),
  `0065` (its prose `## Dependencies` section converted to the canonical bullet — the worked precedent
  to copy), `0050` / `0051` / `0053` (the sibling board-hygiene sweeps).
- **✅ Both open questions RULED 2026-08-28** (owner, via `AskUserQuestion` in the lead session, relayed
  through the lead). **No open questions remain on this brief.**
  - **Scope — all 31**, taking the producer's recommendation over the 8-brief minimum. The 8
    board-visible ones stay identified as a subset and are swept first. Full reasoning in Context.
  - **Sprint — promoted into Sprint 4**, over the `0050`/`0051`/`0053` `Unscheduled` precedent. Full
    reasoning in Priority. The **Medium** priority was the producer's and was not disturbed.
- **📌 The "14" in this task's original framing was never a measurement** — an unverified relay from the
  lead, corrected 2026-08-28. Do not go looking for its source; see Context.
- **Do not touch `dashboard.sh`.** It is upstream fkit tooling — the parser is behaving correctly and
  its comments are the specification this task follows. If you believe it has a defect, that is `0053`'s
  territory (a tracking task for upstream fixes), not this one's.
- **Do not change any task's status, priority or location**, and do not fix the pre-existing board drift
  you will see while running the dashboard. Report it; it is not this task's scope.
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface. If a swept brief has
  a stale vault mirror, that is a `/fkit-wiki-sync` for the wiki role.
- **No secrets in any artifact.** Some briefs in scope name credentials as *variables*; keep it that way
  — name the variable, never a value.
