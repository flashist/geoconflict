# ADR-111 — The XP economy is rescaled 10× down (1 XP per match, 100 XP for citizenship) so every future change to the award can move UP, never DOWN

**Date**: 2026-09-11
**Status**: accepted

> Project ADR-111 — see [[decisions/adr-numbering-two-series]].
> **Recorded 2026-09-11; the ruling itself was given by the owner on 2026-09-10**, live in session.
>
> **Provenance split — it matters.** The **ruling is the owner's** (the numbers *and* the reasoning).
> The **recommendation to record it as an ADR** rather than leave it in a task brief **was the
> architect's**, because the reasoning is a standing constraint on future work and would otherwise
> survive only inside a brief that eventually moves to `done/`.
>
> Source: `ai-agents/knowledge-base/decisions/adr-111-xp-economy-rescale-awards-move-up-never-down.md`

> # 🔴 NOTHING HAS SHIPPED — READ EVERY FIGURE ON THIS PAGE THAT WAY
>
> **Verified in the working tree on 2026-09-11:** `src/core/profile/Citizenship.ts` still declares
> `CITIZENSHIP_XP_THRESHOLD = 1000` and `XP_PER_MATCH = 10`. **This ADR is what task `0211` will
> implement, not a description of the code today.** The page is written to read correctly **both before
> and after** `0211` ships.

## Context

### The economy as it stands today

The two constants in `src/core/profile/Citizenship.ts` are the **single source of truth**, deliberately
placed in `src/core` so the client and the profile server consume the same values. They are read by:

- `src/core/profile/MatchQualification.ts` — the award attached to each qualifying credit
- `src/profile-server/PlayerProfileRepository.ts` — the authoritative citizenship flip
- `src/client/CitizenshipCard.ts` and `src/client/PlayerProfileView.ts` — the display
- `tests/core/profile/Citizenship.test.ts` and `tests/client/CitizenshipCard.test.ts` — both **pin** the
  current values, so both go red on the change and must move with it. **That is the pin working, not a
  regression.**

The threshold is also **stated to players in copy** — `resources/lang/en.json` and
`resources/lang/ru.json` both carry the *"you've reached … XP and earned citizenship"* sentence — which
is why this is **not** a pure-constants change.

### Why this is a real decision, not a constant tweak

The per-match award is **the price of the product's supporter tier**. Once players have seen a number,
the number becomes a promise. The decision is about **which direction later corrections may move** — a
constraint on all future work, not a one-off value.

The ratio between award and threshold — *how many matches citizenship costs* — is **load-bearing for
two accepted ADRs**: [[decisions/adr-101-fail-soft-xp-crediting]] (what a silently dropped credit costs
a player) and [[decisions/adr-103-identity-trust-seam]] (what forging an identity buys an abuser).

### Where it came from — this reverses the owner's own earlier ruling

On **2026-09-04** the owner had ruled the amount stay **10 flat** — *"do not change two things at
once"* — recorded as a deliberate hold on `0211`. 🔴 **The 2026-09-10 ruling reverses that.** The
earlier ruling is **struck, not deleted**, in `0211`: it was correct when given and is now spent.

## Decision

**Four parts. All four are the decision; none is a note.**

**1. The per-match award drops from 10 XP to 1 XP.** Flat, as it is today — **not scaled, not tiered**.

**2. The citizenship threshold is divided by EXACTLY 10** — 1,000 XP → 100 XP.
⛔ ***"About 10×"* is NOT the ruling.** It is **exactly** 10, and the reason is part 3.

**3. 🔴 THE LOAD-BEARING PART — a standing directional constraint on every future change to the
award.** The owner, **verbatim**, 2026-09-10:

> *"My decision is that instead of 10, we should give 1 XP. The logic is: if in the future we would
> like to change it, the players will be more willingly accepting if we change the amount of given XP
> in the greater side, rather than in the smaller. If we change it to 1XP, then the amount of XP that
> is needed to be collected to get citizenship also should be 10x smaller."*

Stated as the rule it is: **players accept an award moving UP far more readily than DOWN. So start low,
and keep every later move upward.**

🔴 **`1` is therefore a DELIBERATE FLOOR, not an arbitrary constant.**
⛔ **A future planner must NOT "round it back up" for tidiness**, and **must NOT propose moving the
award DOWN without the owner reopening this ADR.**

**4. Both changes ship together, inside task `0211`.** Owner-ruled when put to them. They were shown
the cost first and accepted it, and **declined** both alternatives offered — a separate amount task
shipping **before** `0211`, and one shipping **after**.

### What the decision deliberately does NOT do

⛔ **The owner DECLINED to decide scaling or tuning as part of this.** The award is held **flat at 1**.
Tuning the amount once real data exists is a **separate future question, deliberately not answered
here** — and by part 3 any such tuning is expected to move the number **up**.
⛔ **Record that as a DELIBERATE HOLD, not an omission.** `0211`'s own record closes it explicitly:
*"CLOSED 2026-09-10 BY DECISION, NOT BY FILING A TASK … do not file an XP-amount tuning task and do not
report this as an unfiled gap."*

## Options considered

- **Rescale 10× down, threshold ÷ exactly 10 (chosen)** — buys permanent headroom to move the award
  upward later, **at zero cost to the player's actual journey**, because the ratio is untouched.
- **Hold the award at 10 flat and tune after data** — the owner's **own earlier ruling of 2026-09-04**,
  reversed by them 2026-09-10. Rejected because it leaves the only available future correction pointing
  **downward**, the direction players reject. **Waiting for data does not fix that; it just spends the
  good direction first.**
- **Rescale the award without rescaling the threshold** (1 XP toward 1,000) — rejected. It multiplies
  time-to-citizenship by ten, **a product decision about the tier's price that nobody made**, and it
  would invalidate ADR-101's and ADR-103's reasoning rather than leave it standing.
- **An approximate divisor** — rejected by the ruling itself. A threshold of 120 or 90 **quietly
  re-prices citizenship under cover of a rounding**. Exactly 10 is what keeps this a **rescale** rather
  than a **re-pricing**.
- **Scaled / participation-weighted award** (pay by time survived, or a minimum-participation floor) —
  ⚠️ **NOT rejected on the merits; deliberately not decided.** See the residual below.
- **A separate XP-amount task, before or after `0211`** — both offered, both **declined**.

## Consequences

- **Positive — time-to-citizenship is DELIBERATELY UNCHANGED.** ~100 qualifying matches before, ~100
  after (1,000 ÷ 10 = 100; 100 ÷ 1 = 100). **The threshold is divided by exactly 10 *so that* this
  holds.** This invariant is **not a happy side effect** — it is the mechanism by which the rescale
  costs nothing and by which ADR-101's and ADR-103's reasoning survives untouched.
- **Positive — permanent upward headroom.** Every future correction to the award can be a gift.
- **Negative / accepted cost — a post-deploy XP anomaly CANNOT BE ATTRIBUTED** between `0211`'s new
  crediting trigger and this amount change, because they ship together. 🚨 **Shown to the owner before
  they chose, and accepted. An accepted cost, NOT a defect, and NOT to be re-litigated.**
- ⚠️ **Negative — the architect's standing point, RECORDED AND NOT DISMISSED by this ruling.** `0211`
  also **moves the crediting trigger earlier**, which **changes what the number means**: a player who
  dies **30 seconds in** is paid **the same** as one who plays to the end. **That was true at 10 and is
  equally true at 1.** The owner ruled the **amount** separately and deliberately; ⛔ **that point is
  NOT settled by this ADR.** It remains open as the **minimum-participation-floor** question (`0211`'s
  brief; the architect's elimination-time crediting design assessment, §11 q3).
- **Player-facing copy must be rescaled in the SAME change** — `resources/lang/en.json` **and**
  `resources/lang/ru.json`, which must stay in sync by standing project rule. This is already
  **verification step `4d`** on `0211`; **it is not polish, and it breaks the day the constants change
  if it is skipped.**
- **The constants are pinned by tests** (`tests/core/profile/Citizenship.test.ts`,
  `tests/client/CitizenshipCard.test.ts`). Both go red on the change and must move with it.

> # 🚨 CLARIFICATION — 2026-09-11 (producer, recording an owner ruling given live the same day). **NO XP MIGRATION. THE FREE CITIZENSHIP GRANTS ARE ACCEPTED.**
>
> ⛔ **This changes no line above.** It records a **consequence** of the rescale and the owner's ruling
> on it — a dated clarification under the carve-out *"Immutability starts at `accepted`"*, **not a
> reversal**. This ADR stays **`accepted`**, confirmed by the owner today. It is also recorded as
> **ruling 8** on `0211` — see [[tasks/credit-participation-xp-elimination-or-match-end]].
>
> **The question**, raised by the architect while writing this ADR and **not previously recorded
> anywhere**: when `0211` ships the rescale, any existing player row already at **≥ 100 XP instantly
> becomes a citizen** — a grant roughly **10× easier than intended**. A player sitting at 500 XP is
> half-way today and a citizen the moment it lands.
>
> **Three options were put to the owner:** a **divide-by-10 migration** preserving every player's
> progress exactly; **accepting the free grants**; or **resequencing** `0211` to ship *before* `0217`
> wires anything, so no rows exist to grant. **The owner chose: ACCEPT THE FREE GRANTS.**
>
> 🚨 **THE CONSEQUENCE, STATED PLAINLY AND NOT SOFTENED:** players at **≥ 100 XP when `0211` lands
> become citizens immediately, on a threshold they did not actually meet under the rules in force when
> they earned it.** ⛔ **The owner ruled this acceptable KNOWINGLY.** An accepted cost — **not a defect,
> and not a gap to be closed.**
>
> ⛔ **NO MIGRATION IS TO BE WRITTEN.** A future implementer who notices the discrepancy must **NOT**
> "fix" it by adding one — **that would reverse an owner ruling.** If they believe circumstances have
> changed, they **ESCALATE TO THE OWNER; they do not migrate.**
>
> **Evidence available today — A DATED OBSERVATION, NOT A STANDING FACT.** On **2026-09-11** the lead
> read **every profile table on the production box** during task `0218` and found **all zero rows**,
> observed **twice** (Phase A2, and again at Phase E1). ⚠️ **That is a reading taken on one day, not a
> guarantee about ship day.** Task `0217` wires the game server and **will start creating rows**, and
> the owner's own ordering runs `0217` **before** `0211` is likely to ship. **So the population at ship
> time is UNKNOWN, and this ruling accepts whatever it turns out to be.**

### Residual risks / "re-raise only if"

- **Anyone proposes moving the per-match award DOWN**, or lengthening time-to-citizenship. That is
  precisely what part 3 forbids without the owner. It needs a **superseding ADR**, not a plan decision.
- **The ratio itself is deliberately changed** — i.e. citizenship is **re-priced in matches** rather
  than rescaled. A different decision from this one, and **ADR-101's and ADR-103's reasoning must be
  re-read in full** when it happens, because both rest on ~100 matches.
- **A minimum-participation floor or a scaled award is adopted** (`0211`'s open §11 q3). This ADR fixes
  the award at **flat 1 per qualifying match**; it says **nothing** about what *"qualifying"* should
  mean. If the floor lands, revisit whether flat is still right.
- **Tuning after real data.** Expected, welcome, and by part 3 an **upward** move. Record it as a new
  ADR when it happens.

Absent those, a review finding of the form *"1 XP is a trivially small award"*, *"why not 10"*, or
*"this constant looks arbitrary"* is **closeout of this ADR, not a new defect.**

## Cross-references — what this does and does NOT move

- **[[decisions/adr-101-fail-soft-xp-crediting]] — NO re-raise trigger moves.** A dropped credit costs
  **1 % of the way to citizenship before and after**; the loss as a fraction of the journey is
  identical. ⛔ **The wrong reading, recorded so it is not made again:** *"the loss is smaller now
  (1 XP not 10), so the case for accepting silent loss is stronger"* is **WRONG** — it takes the
  numerator without the denominator. **Nothing about ADR-101's acceptance gets easier or harder.**
  ⚠️ **Separate and NOT settled by this ADR:** `0211`'s **ADR-101 supersede gate** — whether moving the
  crediting trigger earlier warrants a superseding ADR. **That turns on the trigger, not the figures.
  This ADR must not be cited as having answered it.**
  ⛔ **This ADR does not edit ADR-101** — that clarification was applied separately, the same day.
- **[[decisions/adr-103-identity-trust-seam]] — unaffected, and needs NO amendment.** It states its
  abuse bound **qualitatively** and carries **no figure at all**. Farming economics are **identical**:
  ~100 forged qualifying matches buys citizenship before and after. ⛔ **The risk grade is UNCHANGED —
  it is NOT lowered.** A smaller award number is not a smaller abuse surface when the threshold moved
  with it. **No amendment should be made to ADR-103 on the strength of this ADR.**

## Related

- [[decisions/adr-101-fail-soft-xp-crediting]] — the fail-soft crediting path; its figures are the
  pre-`0211` economy and its three re-raise triggers are unmoved
- [[decisions/adr-103-identity-trust-seam]] — the identity seam; unaffected, risk grade unchanged
- [[tasks/credit-participation-xp-elimination-or-match-end]] — task `0211`, which carries the
  implementation: both constants, the copy rescale (verification step `4d`), the new crediting trigger,
  **ruling 8 (no migration / free grants accepted)**, and the **pre-committed gate** to re-examine
  ADR-101 when the survivor mechanism is chosen
- [[systems/player-profile-store]] — the profile/XP backend that holds the rows the rescale re-reads
- [[tasks/citizenship-xp-progress-ui]] — task `0191`, the XP-progress UI that renders the threshold.
  ⚠️ **That page records what `0191` BUILT and still reads `CITIZENSHIP_XP_THRESHOLD = 1000`, which is
  correct** — it describes shipped code, not this decision
- [[decisions/adr-numbering-two-series]] — why this is 111 and not 011
- `src/core/profile/Citizenship.ts` — the two constants and `isCitizenFromXp`
- `src/core/profile/MatchQualification.ts` — where the award is attached
- `src/profile-server/PlayerProfileRepository.ts` — the authoritative citizenship flip
- `src/client/CitizenshipCard.ts` — progress percentage and the displayed threshold
- `resources/lang/en.json`, `resources/lang/ru.json` — player-facing copy stating the threshold
- `ai-agents/knowledge-base/reports/2026-09-04-elimination-time-xp-crediting-design-assessment.md` —
  §11 q3, the unresolved participation-floor question
