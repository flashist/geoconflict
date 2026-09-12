# ADR-111: The XP economy is rescaled 10× down (1 XP per match, 100 XP for citizenship) so every future change to the award can move UP, never DOWN

- **Status:** accepted
- **Date:** 2026-09-11 (recorded). The **ruling itself was given 2026-09-10**, live in session.
- **Deciders:** Owner (Mark Dolbyrev) — the decision, in full, including the reasoning below.
- **Provenance split (record it, it matters):** the **ruling is the owner's**; the **recommendation to
  record it as an ADR rather than leave it in a task brief was the architect's**. The owner ruled the
  numbers and the reasoning; the architect proposed this file because the reasoning is a standing
  constraint on future work and would otherwise survive only inside a brief that moves to `done/`.

> ## 🔧 CITATION REPAIR — 2026-09-11 (producer). ⛔ NOT a clarification. ⛔ NOT a reversal.
>
> **Every citation in this ADR was converted from a line number to a greppable content anchor**, under
> the project convention [`../conventions/file-line-citations.md`](../conventions/file-line-citations.md)
> (*"content anchors are the primary form"*, owner amendment 2026-09-10). **28 numbered citations → 0.**
> Two unresolvable `…/0211-…/brief.md` ellipsis paths were replaced with the full path.
>
> 🔴 **Four citations were WRONG FROM BIRTH and now point at what they always claimed to point at**
> — they pointed at the survivors ruling instead of the tuning closure, at *"this brief deliberately
> contains NO design"* instead of the §11 participation-floor question, at the Investigation list
> instead of the ADR-101 supersede gate, and at the survivors section instead of the closed tuning
> question. Every anchor written here was `grep`-verified to exactly one hit before it was written.
>
> ⛔ **NO decision, option, figure, consequence, ruling, verbatim quote or emphasis was changed.**
> A repair makes a pointer point correctly; it does not touch the record it points from.
>
> **Authority — and this WIDENS the carve-out in [`README.md`](README.md), deliberately, so the next
> person finds the precedent instead of re-litigating it:**
> **Owner ruling, 2026-09-11, given live in session — a citation-form repair MAY be applied in place to
> an `accepted` ADR, recorded as a repair.** The README's carve-out (*"CLARIFICATIONS ONLY"*) was
> **silent** on citation repairs, and the owner ruled that **silence is a gap, not a prohibition**.
> ⚠️ **The boundary, and it is narrow:** this permits **repairing a pointer**. It NEVER permits altering
> a claim, a figure, a decision or a consequence. Those still require a superseding ADR.
> This ADR remains **`accepted`**.

## Context

### The economy as it stands today — nothing has shipped

Verified in the working tree on **2026-09-11**:

```
src/core/profile/Citizenship.ts   export const CITIZENSHIP_XP_THRESHOLD = 1000;
src/core/profile/Citizenship.ts   export const XP_PER_MATCH = 10;
```

Those two constants are the single source of truth, shared by the client and the profile server
(`src/core/profile/Citizenship.ts`, its header doc comment — *"the single source of truth for the"*
earned-citizenship threshold and per-match award). They are consumed at:

- `src/core/profile/MatchQualification.ts` — the award attached to each qualifying credit: the
  `import { XP_PER_MATCH } from "./Citizenship";` and the `xpAwarded: XP_PER_MATCH,` field
- `src/profile-server/PlayerProfileRepository.ts` — the authoritative citizenship flip: the
  `import { CITIZENSHIP_XP_THRESHOLD }`, the `newXp >= CITIZENSHIP_XP_THRESHOLD &&` predicate, and the
  `CITIZENSHIP_XP_THRESHOLD,` query argument below it
- `src/client/CitizenshipCard.ts` (the `CITIZENSHIP_XP_THRESHOLD` import, the
  `Math.round((profile.xp / CITIZENSHIP_XP_THRESHOLD) * 100)` progress calculation, and the
  `${CITIZENSHIP_XP_THRESHOLD.toLocaleString()}` template expression) and
  `src/client/PlayerProfileView.ts` (its
  `export { CITIZENSHIP_XP_THRESHOLD } from "../core/profile/Citizenship";` re-export) — the display
- `tests/core/profile/Citizenship.test.ts` (`expect(CITIZENSHIP_XP_THRESHOLD).toBe(1000);` and
  `expect(XP_PER_MATCH).toBe(10);`) and `tests/client/CitizenshipCard.test.ts`
  (`CITIZENSHIP_XP_THRESHOLD: 1000,`) — pinned

🔴 **This ADR therefore reads correctly both before and after task `0211` ships.** At the time of
writing the code still says `1000` / `10`; the decision below is what `0211` implements.

The threshold is also **stated to players in copy**, which is why the rescale is not a pure-constants
change: `resources/lang/en.json`, the `inbox.templates.citizenship_earned` → `body` string
(*"You've reached 1,000 XP and earned citizenship…"*) and `resources/lang/ru.json`, the same
`inbox.templates.citizenship_earned` → `body` string in Russian.

### Why this is a real decision and not a constant tweak

The per-match award is the price of the product's supporter tier. Once players have seen a number, the
number becomes a promise. The owner's decision is about **which direction later corrections can move**,
which is a constraint on all future work, not a one-off value.

At the same time, the ratio between the award and the threshold — *how many matches citizenship costs*
— is load-bearing for two accepted ADRs whose reasoning rests on it:
[ADR-101](adr-101-fail-soft-xp-crediting-no-durable-queue.md) (what a silently dropped credit costs a
player) and [ADR-103](adr-103-identity-trust-seam-client-asserted-yandex-id.md) (what forging an
identity buys an abuser).

### Where it came from

The owner had previously ruled, **2026-09-04**, that the amount stay **10 flat** — *"do not change two
things at once"* — recorded as a deliberate hold on
`ai-agents/tasks/done/0211-credit-participation-xp-at-elimination-or-match-end/brief.md`, under
the struck heading *"Ruling 3 — the XP amount stays 10 flat"* and its
*"DELIBERATE HOLD, NOT AN OVERSIGHT"* line.
🔴 **The 2026-09-10 ruling reverses that earlier ruling of their own.** The earlier one is struck, not
deleted, in `0211` — it was correct when given and is now spent.

## Decision

**Four parts. All four are the decision; none is a note.**

**1. The per-match award drops from 10 XP to 1 XP.** Flat, as it is today — not scaled, not tiered.

**2. The citizenship threshold is divided by EXACTLY 10 — 1,000 XP → 100 XP.**
⛔ *"About 10×"* is **not** the ruling. It is **exactly** 10, and the reason is part 3.

**3. 🔴 THE LOAD-BEARING PART — a standing directional constraint on every future change to the
award.** Owner, **verbatim**, 2026-09-10:

> *"My decision is that instead of 10, we should give 1 XP. The logic is: if in the future we would
> like to change it, the players will be more willingly accepting if we change the amount of given XP
> in the greater side, rather than in the smaller. If we change it to 1XP, then the amount of XP that
> is needed to be collected to get citizenship also should be 10x smaller."*

Stated as the rule it is: **players accept an award moving UP far more readily than DOWN. So start
low, and keep every later move upward.** `1` is therefore **a deliberate floor, not an arbitrary
constant.** ⛔ **A future planner must not "round it back up" for tidiness**, and must not propose
moving the award **down** without the owner reopening this ADR.

**4. Both changes ship together, inside task `0211`.** Owner-ruled when it was put to them. The owner
was shown the cost before choosing and accepted it (see Consequences), and **declined** both
alternatives offered: a separate amount task shipping **before** `0211`, and one shipping **after**.

### What the decision deliberately does NOT do

⛔ **The owner DECLINED to decide scaling or tuning as part of this.** The award is held **flat at 1**.
Tuning the amount once real data exists is a **separate future question, deliberately not answered
here** — and, per part 3, any such tuning is expected to move the number **up**.
⛔ **Record that as a deliberate hold, not an omission.** `0211`'s own record closes this explicitly:
*"CLOSED 2026-09-10 BY DECISION, NOT BY FILING A TASK… do not file an XP-amount tuning task and do not
report this as an unfiled gap"*
(`ai-agents/tasks/done/0211-credit-participation-xp-at-elimination-or-match-end/brief.md`, the
*"CLOSED 2026-09-10 BY DECISION, NOT BY FILING A TASK"* item).

## Options considered

- **Rescale 10× down, threshold divided by exactly 10 (chosen)** — buys permanent headroom to move the
  award upward later, at zero cost to the player's actual journey, because the ratio is untouched.
- **Hold the award at 10 flat and tune after data** — the owner's **own earlier ruling of 2026-09-04**,
  reversed by them on 2026-09-10. Rejected because it leaves the only available future correction
  pointing **downward**, which is the direction players reject. Waiting for data does not fix that; it
  just spends the good direction first.
- **Rescale the award without rescaling the threshold** (1 XP toward 1,000) — rejected. It multiplies
  time-to-citizenship by ten, which is a **product decision about the tier's price** that nobody made,
  and it would invalidate the reasoning in ADR-101 and ADR-103 rather than leave it standing.
- **An approximate divisor** — rejected by the ruling itself. A threshold of, say, 120 or 90 quietly
  re-prices citizenship under cover of a rounding. Exactly 10 is what keeps this a **rescale** rather
  than a re-pricing.
- **Scaled / participation-weighted award** (pay by time survived, or a minimum-participation floor) —
  **not rejected on the merits; deliberately not decided.** See the residual below.
- **A separate XP-amount task, before or after `0211`** — both offered to the owner and **declined**.

## Consequences

- **Positive — time-to-citizenship is deliberately UNCHANGED.** ~100 qualifying matches before,
  ~100 after (1,000 ÷ 10 = 100; 100 ÷ 1 = 100). **The threshold is divided by exactly 10 *so that*
  this holds.** This invariant is not a happy side effect — it is the mechanism by which the rescale
  costs nothing and by which ADR-101's and ADR-103's reasoning survives untouched.
- **Positive — permanent upward headroom.** Every future correction to the award can be a gift.
- **Negative / accepted cost — a post-deploy XP anomaly CANNOT be attributed** between `0211`'s new
  crediting trigger and this amount change, because they ship together. 🚨 **This was shown to the
  owner before they chose, and they accepted it. It is an accepted cost, NOT a defect, and it is not
  to be re-litigated.**
- ⚠️ **Negative — the architect's standing point, recorded and NOT dismissed by this ruling.** `0211`
  also **moves the crediting trigger earlier**, which **changes what the number means**: a player who
  dies **30 seconds in** is paid **the same** as one who plays to the end. **That was true at 10 and is
  equally true at 1.** The owner ruled the **amount** separately and deliberately; **that point is not
  settled by this ADR.** It remains open as the minimum-participation-floor question
  (`ai-agents/tasks/done/0211-credit-participation-xp-at-elimination-or-match-end/brief.md`, the
  *"§11 q3's second half — a MINIMUM-PARTICIPATION FLOOR"* residual; architect's report §11 q3).
- **Player-facing copy must be rescaled in the same change.** `resources/lang/en.json` and
  `resources/lang/ru.json` both state the threshold to players (in each, the
  `inbox.templates.citizenship_earned` → `body` string); the two
  files must stay in sync by standing project rule. This is already a **requirement with its own
  verification step (4d) on `0211`** — it is not polish, and it breaks the day the constants change if
  it is skipped.
- **The constants are pinned by tests.** `tests/core/profile/Citizenship.test.ts` asserts `1000` / `10`
  (`expect(CITIZENSHIP_XP_THRESHOLD).toBe(1000);`, `expect(XP_PER_MATCH).toBe(10);`) and
  `tests/client/CitizenshipCard.test.ts` mocks `1000` (`CITIZENSHIP_XP_THRESHOLD: 1000,`); both go red on the change and must
  move with it. That is the pin working, not a regression.

> **📌 Clarification — 2026-09-11 (producer, recording an owner ruling given live in the lead session
> the same day). NO XP MIGRATION. THE FREE CITIZENSHIP GRANTS ARE ACCEPTED.**
> ⛔ **This changes no line above. It records a consequence of the rescale and the owner's ruling on
> it** — a dated clarification under the carve-out in `README.md` (*"Immutability starts at
> `accepted`"*), not a reversal. This ADR stays **`accepted`**, confirmed by the owner today.
>
> **The question, raised by the architect while writing this ADR and not previously recorded
> anywhere:** when task `0211` ships the rescale (award `10` → `1`, threshold `1,000` → `100`), any
> existing player row already at **≥ 100 XP instantly becomes a citizen** — a grant roughly **10×
> easier than intended**. A player sitting at 500 XP is half-way today and a citizen the moment it
> lands.
>
> **Three options were put to the owner:** a divide-by-10 migration preserving every player's progress
> exactly; accepting the free grants; or sequencing `0211` to ship **before** `0217` wires anything, so
> no rows exist to grant. **The owner chose: ACCEPT THE FREE GRANTS.**
>
> 🚨 **The consequence, stated plainly and not softened:** players at **≥ 100 XP when `0211` lands
> become citizens immediately, on a threshold they did not actually meet under the rules in force when
> they earned it.** ⛔ **The owner ruled this acceptable knowingly** — it is an accepted cost, not a
> defect, and not a gap to be closed.
>
> ⛔ **NO MIGRATION IS TO BE WRITTEN.** A future implementer who notices the discrepancy must **not**
> "fix" it by adding one — that would **reverse an owner ruling**. If they believe circumstances have
> changed, they **escalate to the owner**; they do not migrate.
>
> **Evidence available today — a dated observation, not a standing fact.** On **2026-09-11** the lead
> read **every profile table on the production box** during task `0218` and found **all zero rows**,
> observed **twice** (Phase A2, and again at Phase E1). ⚠️ **That is a reading taken on one day, not a
> guarantee about ship day.** Task `0217` wires the game server and **will start creating rows**, and
> the owner's own ordering runs `0217` **before** `0211` is likely to ship. **So the population at ship
> time is unknown, and this ruling accepts whatever it turns out to be.**

### Residual risks / "re-raise only if"

- **Anyone proposes moving the per-match award DOWN**, or lengthening time-to-citizenship. That is the
  precise thing part 3 forbids without the owner. It needs a **superseding ADR**, not a plan decision.
- **The ratio itself is deliberately changed** — i.e. citizenship is re-priced in matches rather than
  rescaled. That is a different decision from this one, and ADR-101's and ADR-103's reasoning must be
  re-read **in full** when it happens, because both rest on ~100 matches.
- **A minimum-participation floor or a scaled award is adopted** (`0211`'s open §11 q3). This ADR fixes
  the award at **flat 1 per qualifying match**; it says nothing about what "qualifying" should mean. If
  the floor lands, revisit whether flat is still right.
- **Tuning after real data.** Expected, welcome, and by part 3 it is an **upward** move. Record it as a
  new ADR when it happens.

Absent those, a review finding of the form *"1 XP is a trivially small award"*, *"why not 10"*, or
*"this constant looks arbitrary"* is **closeout of this ADR, not a new defect.**

## Cross-references — what this does and does not move

### ADR-101 (fail-soft XP crediting, no durable queue) — **no re-raise trigger moves**

[ADR-101](adr-101-fail-soft-xp-crediting-no-durable-queue.md) now carries a **dated clarification**
(applied 2026-09-11, while this ADR was being written) recording that its `10 XP` / `1,000 XP` figures
are the **pre-`0211` economy**, that the decision itself is unchanged, and that the ~100-matches ratio
its reasoning rests on is **unchanged by design**. ⛔ **This ADR does not edit ADR-101** — that
clarification was applied separately.

**This rescale moves NONE of ADR-101's three re-raise triggers** (paid entitlements on the path;
observed drop volume stops being negligible; a funded dead-letter path). The reason is the invariant
above: a dropped credit costs a player **1 % of the way to citizenship** before the change and **1 %
after**. The **loss as a fraction of the journey is identical.**

⛔ **RECORD THE WRONG READING SO IT IS NOT MADE: *"the loss is smaller now (1 XP not 10), so the case
for accepting silent loss is stronger"* is WRONG.** It takes the numerator without the denominator.
1 of 100 is the same loss as 10 of 1,000. **Nothing about ADR-101's acceptance gets easier, and
nothing about it gets harder.**

⚠️ **Separate and NOT settled by any of this:** `0211`'s **ADR-101 supersede gate** (owner ruling,
2026-09-11) — whether moving the crediting trigger earlier, and spreading the fail-soft calls through
a match instead of one batch at the end, warrants a superseding ADR. That turns on the **trigger**, not
the **figures**. **This ADR must not be cited as having answered it.**

### ADR-103 (identity trust seam) — **unaffected, and needs no amendment**

[ADR-103](adr-103-identity-trust-seam-client-asserted-yandex-id.md) states its abuse bound
**qualitatively** and carries **no figure** at all: *"there is nothing to steal, only something to gift
or to farm."* Nothing in it references 10 or 1,000.

**The farming economics are identical:** ~100 forged qualifying matches buys citizenship **before and
after** this change. ⛔ **The risk grade is therefore UNCHANGED — it is NOT lowered.** A smaller award
number is not a smaller abuse surface when the threshold moved with it.

**No amendment to ADR-103 is required, and none should be made on the strength of this ADR.**

### Task `0211` — carries the implementation

`ai-agents/tasks/done/0211-credit-participation-xp-at-elimination-or-match-end/brief.md` ships both
constants, the copy rescale (verification step 4d), and the new crediting trigger. It also carries the
**pre-committed gate to re-examine ADR-101 when the survivor mechanism is chosen** — that brief's
heading *"REQUIRED — the ADR-101 supersede gate"*.

## Related

- `src/core/profile/Citizenship.ts` — the two constants (`export const CITIZENSHIP_XP_THRESHOLD`,
  `export const XP_PER_MATCH`) and `export function isCitizenFromXp`
- `src/core/profile/MatchQualification.ts` — where the award is attached: `xpAwarded: XP_PER_MATCH,`
- `src/profile-server/PlayerProfileRepository.ts` — the authoritative citizenship flip:
  `newXp >= CITIZENSHIP_XP_THRESHOLD &&`
- `src/client/CitizenshipCard.ts` — progress percentage
  (`Math.round((profile.xp / CITIZENSHIP_XP_THRESHOLD) * 100)`) and the displayed threshold
  (`${CITIZENSHIP_XP_THRESHOLD.toLocaleString()}`)
- `resources/lang/en.json`, `resources/lang/ru.json` — player-facing copy stating the threshold: the
  `inbox.templates.citizenship_earned` → `body` string in each
- `tests/core/profile/Citizenship.test.ts` (`expect(CITIZENSHIP_XP_THRESHOLD).toBe(1000);`,
  `expect(XP_PER_MATCH).toBe(10);`), `tests/client/CitizenshipCard.test.ts`
  (`CITIZENSHIP_XP_THRESHOLD: 1000,`) — the pins
- `ai-agents/tasks/done/0211-credit-participation-xp-at-elimination-or-match-end/brief.md` — the
  ruling and its reversal of the 2026-09-04 hold (the struck
  *"Ruling 3 — the XP amount stays 10 flat"* heading, superseded by
  *"SUPERSEDED 2026-09-10 — THE AMOUNT IS **1 XP**"*), and the closed tuning question (the
  *"CLOSED 2026-09-10 BY DECISION, NOT BY FILING A TASK"* item)
- `ai-agents/knowledge-base/reports/2026-09-04-elimination-time-xp-crediting-design-assessment.md` —
  the architect's report whose §11 q3 carries the unresolved participation-floor question
- ADR-101, ADR-103 — see the cross-reference section above
