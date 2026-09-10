# Agent Conventions

**Layer**: shared
**Key files**: `ai-agents/knowledge-base/conventions/`

## Summary

The project's **standing law** for how agents work — the rules in force *right now*, which an agent that contradicts is simply wrong. **Ten** conventions plus a README that defines the folder's purpose: the scaffold's seven, and **three** added by this project — task-ID allocation, and, both on 2026-09-07, the task-attribute cross-reference sweep and file:line citations.

A convention is **prescriptive and current**, and is **maintained in place**: when it stops being true you *edit* it, you do not append. That is what separates it from the two neighbouring document kinds:

| | records | answers |
|---|---|---|
| **conventions** | **what the rule is** | "how must I do this?" |
| **decisions (ADRs)** | **why the rule is what it is** | "why was it done this way — may I change it?" |
| **reports / incidents** | **what happened, once** | "what did we find, on that day?" |

An ADR may *create* a convention; it never *is* one. A report is **never promoted** into a convention — if its conclusion hardens into a rule, the rule is written as its own convention document and the report stays where it is as the evidence.

Source: `ai-agents/knowledge-base/conventions/` (README + **10** conventions, count re-checked 2026-09-08). ✅ **The tenth is now COMMITTED, in `5913ac2`, and listed in the conventions `README.md` catalog** — an earlier note here warning it was uncommitted in the working tree (so that `git log` at `c910452` showed only nine) is **spent and removed**.

## Architecture

### The ten conventions

**1. Task status vocabulary** — the *only* valid values for a brief's `## Status`, a sprint plan's Status column, or a dashboard: `🔲 Backlog`, `🔄 In progress`, `🚧 Blocked — <reason>`, `✅ Done`, `⛔ Cancelled (YYYY-MM-DD) — <reason>`, `➡️ Moved to [Sprint N](…) — priority M`, plus **agent-closed** variants of the last two. No other value is valid — not "Not started", not "WIP", not "Todo". ⚠️ Clarified 2026-08-10: the `N` in the `Moved to [Sprint N]` marker is the target sprint's *identity*, not a number — `Sprint 4` and `Sprint 4c` are different sprints.

The authority split is the point. `In progress` and `Blocked` are **free** — any session may set them, and should, the moment they become true. `Done` and `Cancelled` are **skill-gated and role-gated**: only the mover skills may set them, never a hand edit, and **only the producer may invoke those skills** — enforced by a hook that denies a mover call from any non-producer identity at any spawn depth.

⚠️ Three caveats the source states plainly and this page does not soften: a close performed **without the owner present must write the `(agent-closed — not owner-verified)` variant**, including a producer that was *spawned* to close. **Role-gating is not prevention** — an agent that has decided its work is done can still spawn a producer to close, the same act with an extra hop; the marker is prose, not enforcement. And **the marker does not appear in the status dashboard** — an agent-closed row is counted and filtered as an ordinary closed row, so telling them apart means opening the plan or the brief.

> #### 📌 Added 2026-09-08 — TWO board-level exceptions were ratified, then WIDENED the same day
>
> Two non-canonical status values are now **ratified board-level exceptions**, both by owner ruling given live in session on **2026-09-08**:
>
> | Value | Means | Valid where |
> |---|---|---|
> | `⬜ No sprint` | Defined, worth doing, **no sprint home** — not scheduled, not blocked, not dropped | `sprints/sprint-backlog.md` **and** `sprints/backlog.md`, those two only |
> | `⏸ Parked` | Deliberately not scheduled **until a named external condition is met** — blocked on a *signal*, not on work | the same two boards, and no others |
>
> They were found in use during a board-visibility sweep — **21 rows** of `⬜ No sprint` and **2** of `⏸ Parked`. The choice put to the owner was *reconcile them to `🔲 Backlog`* versus *ratify and document*; **ratify won, and the existing rows were deliberately left as they are.** ⚠️ The board now carries **23** `⬜ No sprint` rows, not 21 — the same session appended `0026` and `0029` under a separate ruling in the same batch. The "21" is the count at the moment of the ruling, kept because it is what the owner ruled on.
>
> 🔴 **The scope was WIDENED LATER THE SAME DAY, and the source records this as a DELIBERATE RE-SCOPING — not as what was always meant.** Both exceptions were ratified **first** as valid on `sprint-backlog.md` **alone**; the narrower wording is **kept and struck in the source, superseded rather than deleted**, and this page keeps that framing. ⛔ **Do not read the two-board rule as the original ruling.** The reason for the widening: task `0001` retires `sprint-backlog.md` by consolidating it into `backlog.md`, and under the narrow wording those rows could only arrive on `backlog.md` **by being flattened to `🔲 Backlog`** — destroying the distinction the same day's ruling had just found worth keeping. **The owner took the re-scoping over the flattening.**
>
> **What did NOT change, and each of these is stated as a limit rather than an oversight:**
> - ❌ **Still invalid in a task brief's `## Status` field.** Briefs keep `🔲 Backlog` and record the fact in `## Sprint` (or, for a park, its condition in the board row's prose).
> - ❌ **Still invalid on `plan-sprint-N.md`** — a row on a sprint plan has a home by definition.
> - ❌ **Still not rendered by `/fkit-status`.** Widening the boards did **not** make these values visible to the dashboard. See [[decisions/adr-108-active-sprint-pointer]].
> - ❌ **Still not a general-purpose status.** Two named boards, not "wherever unscheduled work lives".
>
> 🚨 **A `⏸ Parked` row MUST state its unpark condition, and the rule survives the widening unchanged.** This is mandatory, not stylistic: a park with no named condition is **indistinguishable from an abandoned task** and will sit on a board forever with nobody able to say what would move it. The condition must be a falsifiable signal someone could check — the two existing rows are *"mobile DAU crosses 1,500 in analytics"* and *"mobile performance baseline confirmed stable in Sentry/analytics"*. If you cannot name the condition, the task is not parked; it is either `⬜ No sprint` or a cancellation.
>
> **Why neither could be folded into an existing value.** `🔲 Backlog` means *scoped and filed, not picked up* — it says nothing about scheduling, and loses the fact that the task **needs a sprint home before implementation begins**. `🚧 Blocked` is the near miss for `⏸ Parked` and is wrong: Blocked means *started, cannot proceed*, while a parked task has not started and is not being attempted. `⛔ Cancelled` is simply false — the work is still wanted. The vocabulary's own **"report reality, not the template"** rule says the answer to a distinction the vocabulary cannot express is to fix the vocabulary, not to flatten the row into a value that quietly drops the fact.

**2. Task owner vocabulary** — every brief carries exactly one `## Owner`, and it must be one of the seven live fkit roles (`fkit-producer`, `fkit-coder`, `fkit-architect`, `fkit-reviewer`, `fkit-adversarial-reviewer`, `fkit-wiki`, `fkit-lead`). Not a person's name, not a team, not "unassigned", not two roles. It is populated at creation, sits immediately after `## Status`, and records *which seat is accountable* — it does not change just because another role consulted. ⚠️ A planned eighth role (a sandboxed e2e tester) is **decided but not built**, and is **not** a valid owner until it ships.

**3. Status report format** — how a status briefing is shaped: **six beats, then the board**. Headline (one sentence) → where we are → what's moving → what's next (**one** thing, a recommendation, not a ranked list of five) → what's in the way (only *real* blockers; "nothing's blocked" is a real answer) → what I need from you (**exists to be empty as often as it's full**) → the dashboard, last, because it is reference material rather than the briefing. The board shows **open work only**, with a roll-up that counts *every* task and ends `— of M` so hidden rows cannot make the scope lie. A row with drift on it **always shows**, whatever its marker says.

**4. Evidence before assertion** — a claim about repository or project state must come from a check made **this turn**; never from memory, an earlier turn, or a skill's boilerplate. The rule fixes a specific recurring failure: answering *"does this work exist?"* by checking *"what changed since the last commit?"*. **The working tree is not the record; committed history is.** "I don't know" is a valid and often correct answer — an unchecked claim stated confidently is worse than no claim, because it gets acted on. When a claim and reality diverge, "my evidence-gathering was broken" belongs *first* among the explanations offered.

**5. One skill, one output** — for any given subject a skill produces one output, and it is the complete one. Arguments select **subjects** and provide **inputs**; they never select output shapes, verbosity levels, or partial/full modes ("delta unless much has changed" is the same defect in a different hat). The litmus test: does the argument change *what the skill works on*, or *what the same work looks like when reported*? The first is a parameter, the second is a variant. A genuinely needed variant is an **owner decision at proposal time**, taken *before* the variant is written.

**6. Priority is rank, not identity** — a sprint board's Priority cell is board **rank**, written `P<n>`; a task's identity is its task-folder name's `NNNN` prefix and nothing else. Rank is mutable (one sprint was re-ranked twice in a day); identity is permanent and never reused. The backlog board's Priority cell is always `—`. Frozen history is **not** mass-edited: existing `priority (folderID)` board-cell notations and closed sprint plans stay byte-identical.

**7. Dependency declaration form** — a brief records dependencies in `## Notes` as `- **Depends on:** …`, with **nothing between the `**` and the label**. The board renderer parses that exact anchor; decoration in front of the label (a warning emoji is the common one) makes the parser miss it, and the board's contract maps "none recorded" to **`ready`** — a false "nothing blocks this" that stays wrong on every status run until a human notices. A non-canonical declaration now renders a LOUD unparseable flag rather than a fabricated `ready`. `nothing` is a valid value and should be written explicitly.

**8. Task-ID allocation** (`task-id-allocation.md` — added by this project, beyond the scaffold's seven) — how a task's permanent four-digit ID is allocated, and that an ID is **never reused or renumbered**. The ID is the task's only identity (convention 6 makes rank explicitly not-identity); allocation happens when the brief is written.

**9. Task-attribute cross-reference sweep** (`task-attribute-cross-reference-sweep.md` — added 2026-09-07, the project's second addition beyond the scaffold's seven) — **after a ruling changes a task attribute that has an authoritative brief section** — sprint, status, rank, owner, dependencies — **the prose copies of that attribute in *other* files get swept too.** The brief and the sprint plan are the task's *own* records and were already covered by convention 4 (task-status vocabulary), which now points here for everything beyond those two. This convention exists because a ruling relayed into one file leaves stale restatements scattered across sibling briefs, board addenda and reports, and each of those reads as the live record to whoever finds it first.

**10. File:line citations** (`file-line-citations.md` — added 2026-09-07; ✅ **committed in `5913ac2` — an earlier note here reading "uncommitted in the working tree" is now SPENT and has been removed**) — **every document citing `file:line` declares which commit its citations were read against**, near the top, once. **Citations are re-derived by opening the file — never shifted arithmetically.** **Bare `:NNN` with no filename is not allowed**, even on the second reference to a file named a sentence earlier, because `grep -rn '<file>'` must find *all* of them. Approved by the owner **explicitly as a convention, not an ADR**.

**Six rules, not three** — the last three were added after the fourth failure mode below and are the ones a careful reader is most likely to think they already comply with:

1. **Declare the frame** — name the commit, near the top, once. A citation with no frame cannot be verified, only guessed at.
2. **Re-derive by reading. Never shift by arithmetic.**
3. 🆕 **Re-anchor on the CODE, not on the old number.** *"Re-derive by reading"* has two readings and **only one is safe**: find where **the thing the sentence describes** now lives — **not** where the old line number's content moved to. The second is still reading the file, and still wrong; it carries a bad starting number forward forever.
4. 🆕 **A citation is a claim about CONTENT, so check it by content match.** Open the cited line and confirm it holds what the sentence says it holds. If it does not, the citation is wrong — **and it makes no difference whether it went stale or was never right.** That one test catches both.
5. **Never write a bare `:NNN`.** Full path every time. The point is not readability; it is that `grep -rn '<File>.ts'` must find *all* of them.
6. 🆕 **Re-verify on read, even against a declared frame.** A frame tells you what to check against; **it is not a promise the number is still right.** A document that went stale once is evidence it can go stale again — not a reason to trust its newest numbers more.

Its justification is one afternoon of real damage: `0227` changed `ClientGameRunner.ts` (+30/−1) and `Main.ts` (+26), and every `file:line` in four sibling briefs went stale at once — **in FOUR distinct ways** (the convention listed three when first ingested; a fourth was added 2026-09-08):

1. **A stale range** — the dead crash branch cited at `ClientGameRunner.ts:487-501`, correct at `702a8ea`, `:513-527` at `c910452`.
2. **Invisible bare refs** — two refs written as bare `:NNN` with no filename, which a grep for `ClientGameRunner.ts:` missed completely.
3. 🔴 **An arithmetic "fix" that silently dropped the load-bearing line.** A file-level offset is **not uniform**: `stop()` started +26 but ended +29, because `0227` added three lines *inside* the function — one of them `this.onGameEnd();`, **the exact line task `0232` exists to prove fires.** The arithmetic range cut it off, and it looked right. ⚠️ The original range had *also* been off by one from the start.
4. 🆕 🔴 **Wrong from birth, then preserved perfectly by a careful re-derivation.** Task `0228`'s brief cited an `await` at `Main.ts:702`. **At `702a8ea` that line was `clientID: lobby.clientID,`** — the `await` it meant was the next one, `:703`. **The brief was off by one the day it was filed.** When `0227` landed and a producer swept every citation forward, `:702` was re-derived **faithfully** to `:711` — still `clientID: lobby.clientID,`, still not an `await`. 🚨 **The sweep was careful and did exactly what it was asked: it re-derived THE NUMBER IT WAS GIVEN, not THE THING THE SENTENCE DESCRIBES.** Corrected to `Main.ts:712`. ⛔ **Two mechanical passes carried the error intact; only a SEMANTIC pass caught it** — which is the entire case for rules 3 and 4.

🚨 **Why a stale line number is worse than a typo:** a typo produces an error the reader sees. A stale line number produces **real, plausible-looking code** — the line still exists, it is simply a different statement now — and the reader draws a wrong conclusion with nothing anywhere to warn them.

⚠️ **What it does NOT do, stated in the convention itself:** it does not stop citations going stale (it makes staleness *detectable* rather than silent); it does not find the documents needing updating after a commit, and creates no obligation to look; it does nothing about a frame that goes unread; **a declared frame can itself be wrong** — a claim like any other, subject to convention 4; and 🆕 **the content-match test needs a sentence with content to match** — *"See `Main.ts:712`"* says nothing the line can be checked against, so nothing catches it when it drifts. **Say what is at the line, or the citation is unverifiable by anyone, including its author.**

⚠️ **There is no automated check.** Enforcement is at **write time** by whoever writes the citation and at **read time** by whoever follows one. The one mechanical aid is that a full-path citation is greppable. *(A script comparing each document's declared frame against `git log` is noted in the convention as a possibility only — **nobody has asked for it and it is not proposed.**)*

#### 🚨 EXTENDED 2026-09-10 — failure 4 recurred on a different line of work, and the recurrence nearly deleted true evidence

The convention's own case is that the failure repeats. It did. A 2026-09-10 citation sweep over the **profile-backend** line of work — a completely different area from `0227`'s teardown work — re-derived every `0182`-runbook citation by content and found **four wrong citations, not one**. Source: `ai-agents/knowledge-base/conventions/file-line-citations.md` — search for `Confirmed recurrences of failure 4`.

**Three new sub-shapes, each with its own name:**

1. 🆕 **Self-invalidation inside one commit.** The `0182:136-137` citation was true of the file its author had read. But **the same author, in the same commit**, also annotated `0182`'s brief in place — inserting a correction banner **above** the cited lines and pushing the text down. ⇒ **The citation was already wrong the moment it was committed, and never pointed at that sentence in any commit in which the citing sentence existed.** ⚠️ **"I read it before I wrote it" is therefore not enough** — if you edit a file *and* cite it in the same change, **re-derive after your own edit**. Your own edit is a commit like any other.
2. 🆕 🔴 **A wrong FILE is categorically worse than a wrong line — and this one nearly destroyed a true, well-sourced fact.** `0182`'s brief supported *"the 2026-07-01 restore drill ran against an empty DB (0 rows)"* with a **bare `:147-153`** written inside `0182` itself, so every later reader resolved it to `0182`'s own brief — where that range is the `## 4. Configure the deploy` header: real, plausible, unrelated. The sweep checked every commit of `0182`, found no 0-rows evidence, and **flagged the claim UNSOURCED**. ⛔ **The claim was never unsourced** — it lives in `ai-agents/knowledge-base/profile-backup-restore-runbook.md` (search for `Recorded RTO`), at exactly those numbers, unchanged across every commit checked. ⚠️ **The asymmetry is the lesson: a wrong line number lands you on the wrong text and you may notice; a wrong file reads as PROOF OF FABRICATION**, and the next step is deleting a true statement. See [[tasks/postgres-backup-routine]] for how close that came.
3. 🆕 **Concurrent uncommitted edits — the commit hash is not a sufficient frame.** A citation can be **correct at its declared commit and wrong in the working tree**, because another agent's unpushed edit moved the target. When several agents edit and cite one file in a single session, say so, and **re-derive last, after the edits have stopped.**

**Two operative rules follow, and they are what this section exists to produce:**

- ⛔ **Never write a bare `:NNN`** — rule 5 already said so; **this is what it costs when broken**, not a style preference.
- 🚨 **Before declaring a claim UNSOURCED, search for the source OUTSIDE the cited file.** *"Not at the cited location"* ≠ *"does not exist"*. **A missing-file citation looks identical to a fabrication, and the remedies are opposite** — fix the pointer, or delete the claim. Get it wrong and you delete evidence.

⛔ **This is not a carelessness problem, and must not be recorded as one.** Every 2026-09-10 defect came from careful people following a procedure that had an ambiguity in it. The producer running the sweep **introduced two fresh instances inside the work of fixing it** — including adding a citation-frame block near the top of `0182`'s brief, which **moved every line it had just finished correcting** (sub-shape 1, committed by the person who had just documented it).

> ⚠️ **FLAGGED FOR HUMAN REVIEW — the two sources in this delta CONTRADICT EACH OTHER about who caused the third recurrence, and the vault takes the side the file supports.**
> `conventions/file-line-citations.md` (search for `The fixer reproduces the defect while fixing it`) attributes one instance to **the wiki librarian**, saying it published `0182:175` / `:207` and that these "did not hold". **The `0239` brief row on `sprints/backlog.md` says the opposite** — that *"the wiki agent's apparent error was NOT its own (its numbers were right at `589249c` and moved because of the producer's frame block)"*.
> ✅ **Checked against the file, and the `0239` row is right.** At the declared frame `589249c`, `0182/brief.md:175` **is** the struck sentence `~~*"Optional — leave blank; the box auto-generates and persists it."*~~` and `:207` **is** the same claim inside the `.env.profile.secret` block. Both were **correct at the frame they declared**; they moved only when the producer's later, uncommitted sweep edits displaced them — which is **sub-shape 3, not a defect by the citing agent.** *(Post-sweep the same two sentences are `0182/brief.md:185` and `:241` at `00058df`.)*
> 📌 **A second, incidental confirmation of failure mode 3:** the displacement was **+10 lines for one and +34 for the other**. A file-level offset is **not uniform** — arithmetic would have broken both.
> ⛔ **The vault cannot fix the convention document** (writes outside `ai-agents/wiki-vault/` are not the wiki's to make, ADR-005). **A human should correct that attribution at the source.**

### The bar for adding one

A new convention earns its place only if **all four** hold: it is **read on a normal run**; it is **prescriptive** (it can be complied with or violated); it is **enforceable somewhere**, ideally in tooling; and it is **not already covered** — prefer amending an existing convention to adding another document. Anything that misses the bar is a report, an ADR, or a task brief. A *new* convention imposes a rule on every future run, so it needs the **owner's sign-off**.

Naming is `<subject>.md`, **never dated** — a dated filename means "a record of a moment", and that is not a convention. A convention has exactly one home; a second copy of a rule is how the two drift apart and the project stops knowing which is law. Lifecycle is maintained, not archived: edit in place, carry no changelog (git is the changelog), and when genuinely retired, **delete it** and record the retirement in the ADR that retires it.

## Gotchas / Known Issues

- 📌 **The Codex second opinion is a REVIEW-SKILL rule, not a convention — and 2026-09-10 confirmed it rather than changing it.** The owner ruled, live in session, that **no code review closes without a Codex second opinion, and a Codex outage is a LOUD degradation flag, not a quiet skip.** ⛔ **No convention document was written, and that was deliberate** — the rule already lives in three review skills, and `conventions/README.md` is explicit that a convention has **exactly one home** and *"a second copy of a rule is how the two drift apart and the project stops knowing which one is law."* ⚠️ **The reasoning relayed with that ruling did NOT survive the ledgers** — a *"three for three"* Codex-catch claim that originated with the lead and was relayed before anyone checked it. **That is convention 4 (evidence before assertion) being broken about the review process itself.** Real strength: **two** Codex-only catches, one of them `high`. See [[decisions/codex-second-opinion-mandatory]].
- ~~**Legacy sprint plans still carry non-canonical status markers** (`⬜`, `⚠️ Urgent`, `⏸ Parked`, `No sprint`). These are historical drift, not a licence to invent new ones.~~ 🔧 **PARTLY SUPERSEDED 2026-09-08 — struck, not deleted.** Two of those four markers are **no longer drift**: `⬜ No sprint` and `⏸ Parked` were **ratified as board-level exceptions** by owner ruling and then widened to two boards the same day (see convention 1 above). ⚠️ **The supersession is narrow and the rest of the note still stands:** `⚠️ Urgent` and a bare `⬜` remain non-canonical, ratification covers **only** `sprints/sprint-backlog.md` and `sprints/backlog.md` — a non-canonical marker on a `plan-sprint-N.md` is **still drift** — and this is **still not a licence to invent new values inline**; the sanctioned route is to amend the vocabulary doc, which is exactly the route that produced this ruling. Reconciling what remains is a filed backlog task (`0004`) — see [[decisions/sprint-backlog]].
- **The two ratified exceptions are invisible to `/fkit-status`, and ratifying them did not change that.** The dashboard knows the canonical set only. ⚠️ It is **degraded, not blind**: the source's own architect assessment corrected a stronger claim — `dashboard.sh` renders every row with its status cell verbatim and the marker lookup's default arm is a **bucket, not a drop**, so the cost is a useless summary line plus drift-noise lines, not a vanished row. 🚨 **The blind spot follows the rows.** Task `0001` moves them onto `backlog.md`, so after it ships **that** board carries values the dashboard does not render. ⛔ `0001` fixes *reachability*, not *rendering* — do not read it as a complete fix. See [[decisions/adr-108-active-sprint-pointer]].
- **The owner-vocabulary check is not yet wired into the dashboard.** The convention defines the field and its values; treating an absent or out-of-vocabulary `## Owner` as drift is described as separate, later work.
- **The dependency-form guard is not prose-proof.** A declaration-shaped line with a non-Latin-script prefix, or inside a blockquote or table, can still trip it. That is the safe direction — a loud flag, never a fabricated `ready` — and a deliberate limit, not a defect. The guard is a safety net, not a licence: the fix for a loud row is to rewrite the declaration canonically.
- **One convention is dual-homed** and must stay byte-identical across two copies, which is why it cites two documents by name without linking them — a relative link would be dead in every project the toolkit sets up. Do not "fix" that.

## Related

- [[systems/project-brief]] — the working rules for agents these conventions expand
- [[systems/glossary]] — the **game-domain** vocabulary, deliberately separate from the task-process vocabulary (board statuses, role owners) defined here
- [[decisions/adr-numbering-two-series]] — how conventions differ from ADRs, and the ADR number bands
- [[systems/producer-workflow]] — the producer role that owns the task lifecycle and the status briefing
- [[systems/project-operations]] — the operational handbook these rules sit inside
- [[decisions/fkit-transfer-blueprint]] — the toolkit these conventions ship with
- [[decisions/sprint-backlog]] — where the legacy status-marker reconciliation task is filed
- [[decisions/adr-108-active-sprint-pointer]] — why "the active sprint" must be owner-set rather than derived, and the interim rule to ask for status **by name**
- [[tasks/dependency-declaration-sweep]] — task `0196`, which swept the canonical `**Depends on:**` declaration into the briefs that lacked one, so the board stops rendering a fabricated `ready`
- [[systems/client-game-teardown]] — the area that **produced convention 10**: `0227` invalidated four sibling briefs' `file:line` citations in one afternoon, and the semantic pass that followed found one that had been wrong since the day it was filed
- [[tasks/crashed-game-teardown-seam]] — task `0227` itself, the commit that broke the citations; its own site table carries **two commit frames**, re-derived and labelled under this convention
- [[decisions/codex-second-opinion-mandatory]] — the 2026-09-10 owner confirmation that a review carries a Codex second opinion, and the corrected evidence behind it
- [[tasks/postgres-backup-routine]] — the true claim that convention 10's wrong-FILE recurrence nearly got deleted, and the owner retraction that was ruled, refused and withdrawn
- [[tasks/profile-server-bring-up-runbook]] — task `0182`, the most-cited document in the profile line of work and the file every 2026-09-10 citation defect landed in
