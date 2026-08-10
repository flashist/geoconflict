# Agent Conventions

**Layer**: shared
**Key files**: `ai-agents/knowledge-base/conventions/`

## Summary

The project's **standing law** for how agents work — the rules in force *right now*, which an agent that contradicts is simply wrong. Seven conventions plus a README that defines the folder's purpose. Never ingested into the wiki before this page.

A convention is **prescriptive and current**, and is **maintained in place**: when it stops being true you *edit* it, you do not append. That is what separates it from the two neighbouring document kinds:

| | records | answers |
|---|---|---|
| **conventions** | **what the rule is** | "how must I do this?" |
| **decisions (ADRs)** | **why the rule is what it is** | "why was it done this way — may I change it?" |
| **reports / incidents** | **what happened, once** | "what did we find, on that day?" |

An ADR may *create* a convention; it never *is* one. A report is **never promoted** into a convention — if its conclusion hardens into a rule, the rule is written as its own convention document and the report stays where it is as the evidence.

Source: `ai-agents/knowledge-base/conventions/` (README + 7 conventions)

## Architecture

### The seven conventions

**1. Task status vocabulary** — the *only* valid values for a brief's `## Status`, a sprint plan's Status column, or a dashboard: `🔲 Backlog`, `🔄 In progress`, `🚧 Blocked — <reason>`, `✅ Done`, `⛔ Cancelled (YYYY-MM-DD) — <reason>`, `➡️ Moved to [Sprint N](…) — priority M`, plus **agent-closed** variants of the last two. No other value is valid — not "Not started", not "WIP", not "Todo".

The authority split is the point. `In progress` and `Blocked` are **free** — any session may set them, and should, the moment they become true. `Done` and `Cancelled` are **skill-gated and role-gated**: only the mover skills may set them, never a hand edit, and **only the producer may invoke those skills** — enforced by a hook that denies a mover call from any non-producer identity at any spawn depth.

⚠️ Three caveats the source states plainly and this page does not soften: a close performed **without the owner present must write the `(agent-closed — not owner-verified)` variant**, including a producer that was *spawned* to close. **Role-gating is not prevention** — an agent that has decided its work is done can still spawn a producer to close, the same act with an extra hop; the marker is prose, not enforcement. And **the marker does not appear in the status dashboard** — an agent-closed row is counted and filtered as an ordinary closed row, so telling them apart means opening the plan or the brief.

**2. Task owner vocabulary** — every brief carries exactly one `## Owner`, and it must be one of the seven live fkit roles (`fkit-producer`, `fkit-coder`, `fkit-architect`, `fkit-reviewer`, `fkit-adversarial-reviewer`, `fkit-wiki`, `fkit-lead`). Not a person's name, not a team, not "unassigned", not two roles. It is populated at creation, sits immediately after `## Status`, and records *which seat is accountable* — it does not change just because another role consulted. ⚠️ A planned eighth role (a sandboxed e2e tester) is **decided but not built**, and is **not** a valid owner until it ships.

**3. Status report format** — how a status briefing is shaped: **six beats, then the board**. Headline (one sentence) → where we are → what's moving → what's next (**one** thing, a recommendation, not a ranked list of five) → what's in the way (only *real* blockers; "nothing's blocked" is a real answer) → what I need from you (**exists to be empty as often as it's full**) → the dashboard, last, because it is reference material rather than the briefing. The board shows **open work only**, with a roll-up that counts *every* task and ends `— of M` so hidden rows cannot make the scope lie. A row with drift on it **always shows**, whatever its marker says.

**4. Evidence before assertion** — a claim about repository or project state must come from a check made **this turn**; never from memory, an earlier turn, or a skill's boilerplate. The rule fixes a specific recurring failure: answering *"does this work exist?"* by checking *"what changed since the last commit?"*. **The working tree is not the record; committed history is.** "I don't know" is a valid and often correct answer — an unchecked claim stated confidently is worse than no claim, because it gets acted on. When a claim and reality diverge, "my evidence-gathering was broken" belongs *first* among the explanations offered.

**5. One skill, one output** — for any given subject a skill produces one output, and it is the complete one. Arguments select **subjects** and provide **inputs**; they never select output shapes, verbosity levels, or partial/full modes ("delta unless much has changed" is the same defect in a different hat). The litmus test: does the argument change *what the skill works on*, or *what the same work looks like when reported*? The first is a parameter, the second is a variant. A genuinely needed variant is an **owner decision at proposal time**, taken *before* the variant is written.

**6. Priority is rank, not identity** — a sprint board's Priority cell is board **rank**, written `P<n>`; a task's identity is its task-folder name's `NNNN` prefix and nothing else. Rank is mutable (one sprint was re-ranked twice in a day); identity is permanent and never reused. The backlog board's Priority cell is always `—`. Frozen history is **not** mass-edited: existing `priority (folderID)` board-cell notations and closed sprint plans stay byte-identical.

**7. Dependency declaration form** — a brief records dependencies in `## Notes` as `- **Depends on:** …`, with **nothing between the `**` and the label**. The board renderer parses that exact anchor; decoration in front of the label (a warning emoji is the common one) makes the parser miss it, and the board's contract maps "none recorded" to **`ready`** — a false "nothing blocks this" that stays wrong on every status run until a human notices. A non-canonical declaration now renders a LOUD unparseable flag rather than a fabricated `ready`. `nothing` is a valid value and should be written explicitly.

### The bar for adding one

A new convention earns its place only if **all four** hold: it is **read on a normal run**; it is **prescriptive** (it can be complied with or violated); it is **enforceable somewhere**, ideally in tooling; and it is **not already covered** — prefer amending an existing convention to adding another document. Anything that misses the bar is a report, an ADR, or a task brief. A *new* convention imposes a rule on every future run, so it needs the **owner's sign-off**.

Naming is `<subject>.md`, **never dated** — a dated filename means "a record of a moment", and that is not a convention. A convention has exactly one home; a second copy of a rule is how the two drift apart and the project stops knowing which is law. Lifecycle is maintained, not archived: edit in place, carry no changelog (git is the changelog), and when genuinely retired, **delete it** and record the retirement in the ADR that retires it.

## Gotchas / Known Issues

- **Legacy sprint plans still carry non-canonical status markers** (`⬜`, `⚠️ Urgent`, `⏸ Parked`, `No sprint`). These are historical drift, not a licence to invent new ones. Reconciling them is a filed backlog task — see [[decisions/sprint-backlog]].
- **The owner-vocabulary check is not yet wired into the dashboard.** The convention defines the field and its values; treating an absent or out-of-vocabulary `## Owner` as drift is described as separate, later work.
- **The dependency-form guard is not prose-proof.** A declaration-shaped line with a non-Latin-script prefix, or inside a blockquote or table, can still trip it. That is the safe direction — a loud flag, never a fabricated `ready` — and a deliberate limit, not a defect. The guard is a safety net, not a licence: the fix for a loud row is to rewrite the declaration canonically.
- **One convention is dual-homed** and must stay byte-identical across two copies, which is why it cites two documents by name without linking them — a relative link would be dead in every project the toolkit sets up. Do not "fix" that.

## Related

- [[systems/project-brief]] — the working rules for agents these conventions expand
- [[decisions/adr-numbering-two-series]] — how conventions differ from ADRs, and the ADR number bands
- [[systems/producer-workflow]] — the producer role that owns the task lifecycle and the status briefing
- [[systems/project-operations]] — the operational handbook these rules sit inside
- [[decisions/fkit-transfer-blueprint]] — the toolkit these conventions ship with
- [[decisions/sprint-backlog]] — where the legacy status-marker reconciliation task is filed
