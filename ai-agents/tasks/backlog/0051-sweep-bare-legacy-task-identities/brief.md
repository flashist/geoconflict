# Sweep the bare legacy task identities left behind by the `0002` migration

## ID
0051

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

`0002` rewrote references to the 38 briefs it migrated by matching the **full filename including the
`.md` suffix** — `s4-yandex-payments-impl.md` → `0019-yandex-payments-impl`. That match could not, by
construction, catch a **bare identity**: the same stem written with no suffix, in running prose.

**10 such occurrences remain**, all outside `ai-agents/wiki-vault/`. Re-verified against the working
tree on 2026-08-10:

| File | Line | Bare identities on that line | Now |
|---|---|---|---|
| `ai-agents/knowledge-base/s4-preexisting-infra-impact-2026-06-24.md` | 53 | `s4-yandex-payments-impl`, `s4-citizenship-paid` | 0019, 0018 |
| ″ | 79 | `s4-yandex-payments-impl` | 0019 |
| ″ | 108 | `s4-yandex-payments-impl`, `analytics-p1-citizenship-funnel` | 0019, 0021 |
| ″ | 168 | `s4-yandex-payments-impl`, `s4-citizenship-earned` | 0019, 0017 |
| `ai-agents/knowledge-base/pre-s4-player-infra-audit-2026-06-24.md` | 175 | `s4-yandex-payments-impl`, `s4-citizenship-paid`, `s4-yandex-catalog-registration` | 0019, 0018, 0014 |

7 in the impact document, 3 in the audit document.

### ⚠️ The load-bearing hazard — this is why the task exists as hand-work

The prose uses an **elision grammar**. Only the **head token** of a list carries the `s4-` prefix;
every later member is written as a bare `-suffix` that borrows it. Verbatim, from
`s4-preexisting-infra-impact-2026-06-24.md:108`:

```
**s4 tasks impacted.** s4-yandex-payments-impl (sole writer), -citizenship-paid,
-yandex-catalog-registration, -profile-05, analytics-p1-citizenship-funnel,
-citizenship-xp-progress-ui, -citizenship-earned.
```

Rewrite the head to `0019-yandex-payments-impl` and **every `-suffix` member after it is stranded** —
they only parse because the head supplied the prefix they drop. `-citizenship-paid` becomes an
orphan fragment pointing at nothing.

> **These lines must be hand-edited as whole lists. Never pattern-substitute them.** A `sed` over
> these files is the specific failure mode this brief exists to prevent, and it fails *silently* —
> the file still reads like prose, so nothing breaks loudly.

Lines 53, 79 and 108 of the impact document all use the elision grammar. Line 168 and audit line 175
write each member fully qualified, so they are structurally safer — but they are still hand-work, not
substitution targets, because the surrounding sentences reason about the tasks by name.

### ⚠️ Why this waits for `0003`

Those same lists mix **backlog** members with **done-board** members. On impact line 108,
`-profile-05` resolves to `s4-profile-05-backend-db-api.md`, which still lives in
`ai-agents/tasks/done/` — a name `0003` migrates. Impact line 53 mixes `s4-profile-03 (done)`,
`-05`, `-06`, `-04/04h` with the backlog names. Impact line 167 cites
`s4-postgres-backup-routine.md` (done board) and `s4-profile-08-backups.md` (a brief that was
*removed*, not migrated).

Sweeping before `0003` means editing the same lines twice and getting the done-board members wrong on
the first pass. This residual is already recorded as accepted in `0002`'s `review.md`; this brief is
what makes it actionable, in the right order.

### Two bare identities that are CORRECT and must not be "fixed"

- `ai-agents/reviews/degraded-mode-full-ux-treatment.md:1` — H1 `# Review ledger — degraded-mode-full-ux-treatment`
- `ai-agents/reviews/degraded-mode-full-ux-treatment-coder-handoff.md:1` — H1 `# Coder handoff — degraded-mode-full-ux-treatment (round 3 fix)`

These are each document's **own H1 title**, and each matches its **own filename**. They are not
references to the task brief. **The sweep must leave them alone**; rewriting them to `0049-…` would
desynchronize a document's title from its own name to fix a reference that does not exist.

## What to build

1. **Re-derive the occurrence list at start.** Do not trust the table above as the working set —
   `0003` will have landed in between and may have changed these very lines. Rebuild it from the
   `0002` rename map (recoverable from git) by searching for each legacy stem **without** the `.md`
   suffix, excluding `ai-agents/wiki-vault/` and excluding matches already carrying an `NNNN-` prefix.

2. **Extend the same derivation to `0003`'s renames.** `0003` migrates `done/` and `cancelled/` with
   the same full-filename matching, so it will leave the same class of bare-identity residue. Sweep
   both sets in one pass — that is the whole reason for the ordering.

3. **Hand-edit every affected line as a whole list.** For each elision-grammar line, decide and apply
   one consistent rewrite for the entire list. Two defensible shapes; pick one, apply it uniformly,
   and say which in the hand-off:
   - **Fully qualify every member** — `0019-yandex-payments-impl (sole writer), 0018-citizenship-paid, 0014-yandex-catalog-registration, …`
   - **Keep the list shape and re-head it** — only if every member still resolves unambiguously.

4. **Leave the two review-document H1s untouched** (see Context).

5. **Do not rewrite history documents into inaccuracy.** These two files are dated findings
   (`2026-06-24`). Updating a *pointer* so a reader can still find the brief is correct; rewriting a
   *statement about what was true then* is not. If a line's meaning depends on the old name — for
   example impact line 167's account of `s4-profile-08-backups.md` being **removed** — keep the
   historical name and, where it helps, add the current ID alongside it rather than replacing it.

6. **No `sed`, `perl -pi`, or any bulk substitution over these two files.** State in the hand-off
   that the edits were made by hand.

## Verification steps

1. **Zero bare legacy identities remain outside the vault.** For every stem in the combined
   `0002` + `0003` rename map, a search across `ai-agents/` excluding `wiki-vault/` returns no match
   that is neither `NNNN-`-prefixed nor an allowed exception. Run it and paste the (empty) output.
2. **The two review-document H1s are byte-identical to before.** `git diff` shows no change to
   `ai-agents/reviews/degraded-mode-full-ux-treatment.md` or its `-coder-handoff.md` sibling.
3. **Every rewritten ID resolves to a real folder.** For each `NNNN-<slug>` introduced, a folder of
   that exact name exists under `ai-agents/tasks/{backlog,done,cancelled}/`. No dangling ID.
4. **No orphan fragments.** Search both edited files for a list member that begins with `-` and is
   not preceded on its line by a token supplying its prefix. Expect zero.
5. **`git diff --stat` touches only the two knowledge-base files** — plus nothing under
   `ai-agents/wiki-vault/`, nothing under `ai-agents/tasks/done/`, and no source file.
6. **Read both edited files end to end and confirm the prose still parses as English.** Each rewritten
   list reads as a complete sentence naming resolvable tasks. This step is manual and is not optional —
   it is the only check that catches a semantically-broken-but-syntactically-fine list.
7. `bash .claude/skills/fkit-status/dashboard.sh ai-agents/sprints/backlog.md` runs and reports no new
   drift.

## Notes

- **Depends on:** 0003
- **Blocks:** nothing

- **The dependency is hard, not advisory.** Running before `0003` produces wrong edits on the
  done-board members, then requires a second pass over the same lines.
- Coder-owned: it is a mechanical-looking edit that is specifically **not** mechanizable, which is
  exactly the judgement the coder seat carries. It touches no source code — only two knowledge-base
  documents.
- **Never touch `ai-agents/wiki-vault/`** — the vault is `0052`'s scope and `fkit-wiki`'s exclusive
  write surface.
- No secrets: these files go to git.
