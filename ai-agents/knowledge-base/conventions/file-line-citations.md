# File:line citations

> **A citation names a file and a greppable content anchor — not a line number.** Where a line number
> is still used (the **committed-`src/` exception**), the document states which commit its citations
> were read against, the citation is re-derived by opening the file — never by shifting the old
> number arithmetically — and bare `:NNN` with no filename is not allowed.
>
> ⛔ ~~*Superseded 2026-09-10:* "Every document that cites `file:line` states which commit its
> citations were read against. A citation is re-derived by opening the file…"~~ — line numbers were
> the **primary** form until the owner's 2026-09-10 amendment demoted them to a named exception. The
> struck framing and the reasons it changed are kept in
> **"✅ BINDING — content anchors are the primary form"** below.
>

> Approved by the owner on 2026-09-07 as a convention, explicitly **not** as an ADR. Written after
> task `0227` (commit `c910452`) invalidated the citations in four sibling briefs, which took three
> separate catches to clean up.

📌 **Citation frame for this document, and it applies to this document's own practice of what it
preaches.** The citations added by the 2026-09-10 correction below — those to
`ai-agents/tasks/done/0182-profile-04i-server-bring-up-runbook/brief.md` and to
`ai-agents/tasks/done/0215-profile-p1-stand-up-the-box/worklog.md` — were re-derived by content
against commit **`00058df`**, and both files are **clean in the working tree at that commit**, so a
commit frame is sufficient for them (checked, not assumed — that is exactly what the CONCURRENT
UNCOMMITTED EDITS shape below demands). Citations predating 2026-09-10 in the `0227` section carry
their own inline frames (`702a8ea`, `c910452`) and were **not** re-verified by that correction.

## What went wrong — the whole justification

`0227` changed `src/client/ClientGameRunner.ts` (+30/−1) and `src/client/Main.ts` (+26/−0). Every
`file:line` in four neighbouring briefs went stale the moment it landed. Three distinct failure
modes, all in one afternoon:

1. **A stale range.** A brief cited the dead crash branch at `ClientGameRunner.ts:487-501`. Correct
   at `702a8ea`; it is `:513-527` at `c910452`.
2. **Invisible bare refs.** Two further refs in the same brief — `showErrorModal` at `:492`,
   `this.stop()` at `:499` — were written as bare `:NNN` with no filename. A grep for
   `ClientGameRunner.ts:` missed them completely. They are `:518` and `:525` today.
3. **Arithmetic that dropped the load-bearing line.** The lead tried to fix a range by adding the
   file's offset: `stop()` had been cited at `:753-766`, the file shifted +26, so `:779-792`. Wrong.
   `stop()` starts at `:779` (+26) but ends at `:794` (+29) — `0227` added three lines *inside* the
   function, one of which is `this.onGameEnd();` at `ClientGameRunner.ts:793`, the exact line
   downstream task `0232` exists to prove fires. The arithmetic range cut it off. The original
   `:753-766` had also been off by one already: `stop()` ended at `:765`, and `:766` was blank.
4. **Wrong from birth, then preserved perfectly by a careful re-derivation.** Task `0228`'s brief
   cited an `await` at `Main.ts:702`. At `702a8ea` that line was `clientID: lobby.clientID,` — the
   `await` it meant was the next one, `:703`. The brief was off by one the day it was filed. When
   `0227` landed and a producer swept every citation forward to `c910452`, `:702` was re-derived
   faithfully to `:711` — which is still `clientID: lobby.clientID,`, still not an `await`. The sweep
   was careful and did exactly what it was asked. It **re-derived the number it was given, not the
   thing the sentence describes.** Now corrected to `Main.ts:712`. Two mechanical passes carried the
   error intact; only a semantic pass caught it.

## 🚨 Confirmed recurrences of failure 4 — the pattern is not rare

**Failure 4 (wrong from birth, then carried forward by careful people) has now been confirmed a
second time, on a completely different line of work.** It is recorded here because the whole argument
for this convention is that the failure recurs.

**2026-09-10, the profile-backend line of work.** A citation sweep re-derived every `0182`-runbook
citation by content and found **four** wrong citations, not one:

| Citation | Cited as | What was actually there | Shape |
|---|---|---|---|
| `0182/brief.md:136-137` | the `PROFILE_INTERNAL_TOKEN` *"leave blank"* trap | `## 3. Confirm SSH access to the box` + a blank line | **wrong from birth** |
| `0182:147-153` | *"the 2026-07-01 restore drill ran against 0 rows"* | `0182`'s `## 4. Configure the deploy` header — **but the claim is correctly sourced elsewhere**, see the row below | **bare ref resolved to the wrong FILE** |
| `0218 brief:136-137` | *"Record the LOCATION, never the value."* | a blank line + `## Verification steps` | **wrong at its own declared frame** |
| `0218 brief:193` | *"due before the first backup runs"* | `from crontab content.` | **wrong at its own declared frame** |

**The mechanism, and it is a new sub-shape worth naming: SELF-INVALIDATION INSIDE ONE COMMIT.** The
`:136-137` citation was **true of the file the author read** (commit `282655c`). But the same author,
in the **same commit** (`879b2f4`, 2026-09-04), also annotated `0182`'s brief in place — inserting a
correction banner **above** the cited lines and pushing the text ~40 lines down. The citation was
therefore already wrong the moment it was committed. **It never pointed at the sentence in any commit
in which the citing sentence existed.**

⚠️ **This is why "I read it before I wrote it" is not enough.** If you edit a file *and* cite it in
the same change, **re-derive the citation after your own edit**, not before. Your own edit is a commit
like any other.

**How it spread, and why nobody caught it.** `:136-137` was copied into five documents over six days.
Every copy was made by someone careful, and every copy **re-derived the number it was given rather
than the sentence the number was supposed to support.** Two later readers even *diagnosed* it as
"stale" — and were themselves wrong about how, reporting propagation sites that never existed
(`0218`'s brief, the project auto-memory) while missing three that did. **Only opening the file and
matching the words caught it.**

### A wrong line number sends you to the wrong text. A wrong FILE means you conclude the text never existed.

**This is the sharpest lesson of the day, and it nearly destroyed a true, well-sourced fact.**

`0182`'s brief said the 2026-07-01 restore drill ran against an empty database — *"0 rows — see
`:147-153` below"*. A **bare `:NNN`, written inside `0182` itself**, so every later reader resolved it
to `0182/brief.md:147-153`. That range is `0182`'s `## 4. Configure the deploy` header: real,
plausible, unrelated. One reader propagated it into a sprint board as `0182:147-153`. The 2026-09-10
sweep then checked every commit of `0182`'s brief, found no 0-rows evidence in any of them, and
**flagged the claim UNSOURCED** — which was escalated, and **an owner ruling to retract the claim was
issued on that finding.**

**The claim was never unsourced.** It lives at
[`../profile-backup-restore-runbook.md:147-153`](../profile-backup-restore-runbook.md) — the
*backup/restore* runbook, a different document — at **exactly those line numbers**, unchanged in every
commit from `879b2f4` to `589249c`. The bare `:147-153` was numerically **right all along**. Only its
file was missing, and the word *"runbook"* in the citing sentences meant a different runbook than
readers assumed.

⚠️ **The asymmetry is the point.** A wrong line number is survivable — you land on the wrong text and
may notice. A wrong *file* is not: **"I checked every commit and the evidence isn't there" reads as
proof of fabrication**, and the next step is deleting a true statement. The retraction was stopped
only because the sweep grepped the wider knowledge-base before executing it.

**Two rules follow, and they are the operative output of this whole section:**

- ⛔ **Never write a bare `:NNN`. This is the failure it causes**, not a style preference. The ban
  already existed; this is what it costs when broken.
- 🚨 **Before declaring a claim unsourced, search for the source outside the cited file.** "Not at the
  cited location" ≠ "does not exist". A missing-file citation looks identical to a fabrication, and
  the remedies are opposite: fix the pointer, or delete the claim. **Get that wrong and you delete
  evidence.**

### The fixer reproduces the defect while fixing it — third recurrence, 2026-09-10

🚨 **THIS SECTION CARRIED A FALSE ATTRIBUTION FOR THREE DAYS. Read the correction before the
example.**

#### ⛔ Superseded — the version below was WRONG. Kept visible, not deleted.

> ~~Two agents introduced fresh instances of this exact defect **inside the work of fixing it**:~~
>
> - ~~The **wiki librarian** published corrected citations (`0182:175`, `:207`) in the morning, then
>   content-matched them later the same day and found they did not hold — its own words: *"the same
>   defect I was sent to fix, committed by me, in the fix's own source material."*~~

**Ruled wrong by a producer on 2026-09-10, on evidence, at frame `00058df`. The wiki librarian did
not reproduce the defect.** Both of its citations were **correct at the commit it declared**:

| Citation, as the wiki librarian published it | What is at that line at its declared frame `589249c` | Verdict |
|---|---|---|
| `0182/brief.md:175` | `> ~~*"Optional — leave blank; the box auto-generates and persists it."*~~ **That was true at T4i. It` — the struck trap sentence itself | ✅ **correct** |
| `0182/brief.md:207` | `#     "Optional — leave blank; the box auto-generates and persists it."` — the same sentence copied inside the `.env.profile.secret` code block | ✅ **correct** |

They stopped holding **only because later, still-uncommitted edits to that file displaced them** — a
citation-frame block and a set of refuted-silence corrections, both added after the librarian read
the file. At `00058df` those same two anchors are `0182/brief.md:185` and `0182/brief.md:241`.

⇒ **This is the CONCURRENT UNCOMMITTED EDITS shape named below, not a citing error.** The librarian
stated the self-blame in good faith, having content-matched against a tree that had moved under it.

📌 **How the falsehood got into standing law, which is a failure mode in its own right.** The
librarian's good-faith self-blame was relayed to the owner **as fact** by the lead; a producer later
checked it and refuted it; the refutation reached the **task records and the wiki** — but **never
reached this convention.** For three days the project's standing law about citations asserted an
attribution that every other record contradicted. **A correction that lands everywhere except the
document that governs the behaviour has not landed.** When you refute something, sweep the
conventions directory too.

#### The real instance, correctly attributed

**The producer running the 2026-09-10 citation sweep** did reproduce the defect, and its two stale
citations are **still live at `00058df`**:

- It added a citation-frame block near the top of `0182`'s brief, **moving every line it had just
  finished correcting**, and in the **same commit** (`00058df`) wrote a frame block into
  `0215`'s worklog claiming *"`0182` numbers here are POST-sweep and will not match a bare `589249c`
  checkout."*
- **They are not post-sweep.** `0215-profile-p1-stand-up-the-box/worklog.md:191` and
  `0215-profile-p1-stand-up-the-box/worklog.md:299` both cite `0182/brief.md:175` and
  `0182/brief.md:207` — the **pre-sweep** numbers, at `00058df` displaced to `0182/brief.md:185` and
  `0182/brief.md:241`. The label asserting they had been verified forward is false, and the numbers
  are stale. **This is a live defect at `00058df`, left for the owner to route — this correction
  changed only the present convention document.**
- This is the **SELF-INVALIDATION INSIDE ONE COMMIT** shape, committed by the agent that had just
  finished documenting it — while stating in writing that it had avoided it.

⚠️ **The lesson is not "be more careful."** It is that a frame block asserting *"verified post-sweep"*
is a claim like any other and is worth exactly what it was checked against
([`evidence-before-assertion.md`](evidence-before-assertion.md)). **Writing the reassurance is not
performing the check.**

#### 🔢 The arithmetic ban, worked from this same incident — the cleanest example we have

The displacement of those two anchors between `589249c` and `00058df` was **not uniform**:

| Anchor (both in `0182/brief.md`) | At `589249c` | At `00058df` | Shift |
|---|---|---|---|
| the struck *"leave blank"* sentence | `0182/brief.md:175` | `0182/brief.md:185` | **+10** |
| its copy inside the code block | `0182/brief.md:207` | `0182/brief.md:241` | **+34** |

**Same file, same two commits, same edit — and the offset differs by 24 lines**, because the edits
that landed between them were inserted *between* the two anchors, not above both. Anyone who fixed
`0182/brief.md:175` → `0182/brief.md:185` correctly and then applied that same "+10" to
`0182/brief.md:207` would
land on `0182/brief.md:217`, which at `00058df` reads
`> on BOTH sides** — here on the box, and in the game server's production environment. See` —
real, plausible, and not the cited sentence. **There is no such thing as a file's offset.**

#### ⚠️ A SHAPE worth its own name: CONCURRENT UNCOMMITTED EDITS

A citation can be correct at the declared commit and wrong in the working tree, because someone
else's unpushed edit moved the target. **The wiki librarian incident above is the worked example**,
and nobody was careless in it: the librarian re-derived correctly against what it read, and the tree
changed afterwards. **When several agents edit and cite the same file in one session, the commit hash
is not a sufficient frame** — say so, and re-derive last, after the edits have stopped.

📌 Sweep record: the `0215` worklog's drift table and `plan.md` step-31 note, plus the corrected
banner in
[`../reports/2026-09-04-profile-backend-clean-slate-survey.md`](../reports/2026-09-04-profile-backend-clean-slate-survey.md).

## The rule

- **Declare the frame.** A document that cites `file:line` names the commit its citations were read
  against — near the top, once, e.g. *"Citations against `c910452`."* A citation with no frame
  cannot be verified, only guessed at.
- **Re-derive by reading the file. Never shift by arithmetic.** The 2026-09-10 `0182` displacement is
  the cleanest proof — **+10 for one anchor and +34 for another, in the same file across the same two
  commits** (table above). A file-level offset does not exist. Failure 3 is the earlier and subtler
  proof of the same thing: an edit inside a function moves its end by a different amount than its
  start, and the line the arithmetic silently drops is as likely as not the one that mattered.
- **Re-anchor on the code, not on the old number.** "Re-derive by reading" has two readings and only
  one is safe: find where **the thing the sentence describes** now lives — *not* where the old line
  number's content moved to. The second is still reading the file, and still wrong; it carries a bad
  starting number forward forever (failure 4).
- **A citation is a claim about content, so check it by content match.** Open the cited line and
  confirm it holds what the sentence says it holds. If it doesn't, the citation is wrong — and it
  makes no difference whether it went stale or was never right. That one test catches both, and it is
  what caught failure 4.
- **Never write a bare `:NNN`.** Always `path:line` or `path:line-line` — full path, every time, even
  for the second and third reference to a file already named a sentence earlier. The point is not
  readability; it is that `grep -rn 'ClientGameRunner.ts'` must find *all* of them. A bare `:492`
  survives every sweep and goes stale in the dark.
- **Re-verify on read, even against a declared frame.** A frame tells you what to check against; it
  is not a promise the number is still right. A document that went stale once is evidence it can go
  stale again — not a reason to trust its newest numbers.

## Why a stale citation is worse than a typo

A typo produces an error. A wrong path 404s, a wrong symbol name doesn't resolve, and the reader
knows immediately that something is broken.

A stale line number produces **real, plausible-looking code**. `ClientGameRunner.ts:492` still
exists; it is simply a different statement now. The reader lands on it, reads it as the thing the
document meant, and draws a wrong conclusion with nothing anywhere to warn them. Failure 3 is the
worst version: the range looked right, was arrived at deliberately, and quietly excluded the single
line the downstream task was written to verify.

## What this does not catch

This reduces the problem; it does not prevent it.

- **It does not stop citations going stale.** Any commit touching a cited file still invalidates
  them. The frame only makes the staleness *detectable* instead of silent.
- **It does not find the documents that need updating** after a commit — a full-path grep helps, but
  nobody is obliged to run one, and nothing here creates that obligation.
- **The content-match test needs a sentence with content to match.** "See `Main.ts:712`" says nothing
  the line can be checked against, so nothing catches it when it drifts. Say what is at the line —
  the `await`, the guard, the call — or the citation is unverifiable by anyone, including you.
- **It does nothing about frames that go unread.** A reader who skips the frame line and trusts the
  numbers is in exactly the position this document was written about.
- **A declared frame can itself be wrong** — stated from memory, or never true. It is a claim like
  any other, subject to
  [`evidence-before-assertion.md`](evidence-before-assertion.md).

## Where this is enforced

At **write time**, by whoever writes the citation, and at **read time**, by whoever follows one. There
is no automated check today. The one mechanical aid the convention does buy is that a full-path
citation is greppable: `grep -rn '<Filename>.ts:' ai-agents/` finds every reference to a file you are
about to change. A bare `:NNN` will not appear in that output, which is the entire reason bare refs
are banned.

*Not part of the convention, noted as a possibility only:* a script could compare each document's
declared frame against `git log` for the files it cites and flag the ones whose frame predates the
last change. Nobody has asked for it and it is not proposed here.

## ✅ BINDING — content anchors are the primary form (amendment, 2026-09-10)

> 🔴 **THIS IS AN AMENDMENT TO STANDING LAW, NOT A CLARIFICATION.** It changes what the
> owner approved on 2026-09-07. **Authority: owner ruling 2026-09-10, given live in session and
> relayed through the spawning session.** Proposed by the producer, escalated rather than adopted on
> the producer's own authority, and **decided by the owner** — which is the only reason it binds.

**A citation names a file and a greppable content anchor. It does NOT carry a line number by
default.**

```
✅  `0182/brief.md` — the struck "Optional — leave blank; the box auto-generates" sentence
✅  `src/profile-server/InternalAuth.ts` — the `timingSafeEqual` call in `internalAuth`
❌  `0182/brief.md:185`
```

#### ⛔ What this supersedes — struck, kept visible so you can see what changed

> ~~**Every document that cites `file:line` states which commit its citations were read against. A
> citation is re-derived by opening the file — never by shifting the old number arithmetically.**~~
>
> ~~The primary act of citing is to produce a line number and then keep re-deriving it forward as the
> file moves.~~

**What changed and why:** re-deriving the number was always the *harder* path, and the 2026-09-10
incident is what it costs — **two successive sets of numbers, both correctly derived by careful
agents, both stale within one day**, in a file that moved four times while uncommitted. *A number
that must be re-derived every few hours is not a citation, it is a treadmill.* **What did not
change: the ban on bare `:NNN`, the frame requirement, the content-match test, and the arithmetic
ban all still bind — in full — wherever a line number is still used.**

### The justification — keep this, someone will challenge the rule later

- **The existing rules were already anchor rules wearing a line number's clothes.** *"Re-anchor on
  the code, not on the old number"* and *"a citation is a claim about content, so check it by content
  match"* both say the content is the citation and the number is a fragile proxy for it. This
  amendment stops paying for the proxy.
- **Four of the five recorded failures are NUMBER failures that an anchor cannot have** — stale
  range, bare `:NNN`, arithmetic, wrong-from-birth-then-faithfully-re-derived. Only the wrong-*file*
  failure survives, and a path is required either way.
- **🚨 The asymmetry is what decides it. Failure mode, not failure rate.** A dead anchor fails
  **LOUDLY** — `grep` returns nothing, and you know instantly. A stale number fails **SILENTLY** — it
  lands on real, plausible prose, the reader takes it for the cited thing, and nothing anywhere warns
  them. That is the whole thesis of *"Why a stale citation is worse than a typo"*, now applied to the
  citation form itself.
- **Precedent.** On 2026-09-10 the wiki role established that its own `schema.md` Cross-Reference
  Rule already required backtick paths without line numbers, and that line-precise citation binds
  **only** glossary pages (owner ruling 2026-09-03, explicitly not relaxed). It converted the vault
  and the rule caught a live defect on its first run.

### ⚠️ An anchor MUST be unique in its file — an ambiguous anchor is no better than a wrong number

An anchor that matches three places sends the reader to a coin flip, which is the failure this
amendment exists to stop. **Check it, at the moment you write it:**

```bash
grep -c 'the exact anchor text' path/to/file    # must print exactly 1
```

**Exactly one hit, or it is not an anchor yet.** When the text is not unique:

1. **Lengthen it first** — extend the quoted span until it is unique, or pair it with the enclosing
   heading (*"under `## 4. Configure the deploy`, the `PROFILE_INTERNAL_TOKEN` line"*). This is the
   preferred fix and it usually works.
2. **If it genuinely cannot be made unique, fall back to a framed line number — and say why**, in the
   citation itself: *"`Foo.ts:412` (frame `00058df`; the anchor text recurs 6× in this file)."* The
   fallback is legitimate; **using it silently is not**, because the next reader cannot tell a
   considered fallback from a lapse.

### The exception — where line numbers still earn their place

**Committed source under `src/`**, where the target is one identifier inside a large file and an
anchor would be ambiguous or expensive to grep. This generalises the glossary ruling, whose reasoning
is the same: an exact spot in a large **committed** source file, not a churning markdown brief.

**Never for markdown under `ai-agents/`** — briefs, worklogs, plans, reports. That is where **every**
failure recorded in this document happened.

Under the exception, **every rule in "The rule" above still binds in full**: declared frame, content
match, no bare `:NNN`, no arithmetic.

### 🚨 Scope — this governs NEW citations. It is NOT a sweep order.

**Existing citations are explicitly OUT OF SCOPE.** There are roughly **2,186** bare refs in the
repository today. **Nobody is required to retrofit them, and adopting this rule does not schedule
that work.** Whether to sweep them, and at what cost, is task `0239`'s question, which the owner has
**deliberately not scheduled**. Do not read this amendment as authorising a mass rewrite; correct an
old citation when you are already working on the document that carries it, and otherwise leave it.

## Related

- [`evidence-before-assertion.md`](evidence-before-assertion.md) — the general rule this is a special
  case of: a claim about repository state comes from a check made this turn. A line number is such a
  claim.
