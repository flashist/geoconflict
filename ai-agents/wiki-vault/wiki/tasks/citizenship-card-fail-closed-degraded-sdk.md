# Make the Citizenship Card Fail CLOSED When the Yandex SDK Is Degraded

**Source**: `ai-agents/tasks/done/0291-make-the-citizenship-card-fail-closed-when-the-yandex-sdk-is-degraded/brief.md`
**Status**: done
**Sprint/Tag**: Sprint 4 — citizenship launch preconditions; split out of `0238`

> ✅ **Closed 2026-09-21 by a spawned `fkit-producer` with NO owner channel (ADR-021, ADR-033 §5) ⇒
> `✅ Done (agent-closed — not owner-verified)`. No human has verified this work.**
>
> 🚩 **LOUDEST RESIDUAL — THERE IS NO LIVE OR BROWSER VERIFICATION. Nobody has observed the card failing
> to render in a REAL degraded production session.** Every piece of evidence below is `npm test`, a diff,
> and code reading. That one observation is **deliberately handed onward** to `0238`'s launch check — the
> review ledger passes it on rather than settling it. ⛔ **Do not write this page up as *"the card is
> proven to fail closed in production"*.**
>
> ⛔ **THIS TASK LAUNCHES NOTHING.** `flashistConstants.features.CITIZENSHIP_CARD_ENABLED` is
> **unchanged and still `false`.** It discharges a **code** precondition, not a launch.

## Goal

Make the citizenship card's kill-switch gate behave like the project's other three gated citizenship
surfaces: **flag off ⇒ no card**, degraded SDK or not.

**The defect.** `src/client/CitizenshipCard.ts` gated the card on an **OR** (verify by content, not by
line number — search the file for `isYandexDegraded`):

```
FlashistFacade.instance.isYandexDegraded() ||
  (await FlashistFacade.instance.isCitizenshipUiEnabled())
```

⇒ 🔴 **a degraded-SDK session rendered the citizenship card EVEN WITH THE `citizenship_ui` FLAG OFF.**
The other three gated surfaces — the ★ citizen badge, the inbox, and the payments-reconciliation `POST`
— all fail **closed**. **The card was the odd one out.**

⚠️ **`CITIZENSHIP_CARD_ENABLED` was already checked first and absolutely, ahead of that expression.**
That half was correct and is **not** what changed here.

**AUTHORITY.** An **owner ruling given live in the `fkit lead` session via `AskUserQuestion` on
2026-09-21**, relayed by `fkit-lead` to a spawned `fkit-producer` holding no owner channel of its own.
⛔ **Not producer precedent — one ruling, one task.** The owner ruled the **change**; the board and the
rank are the **producer's**, and the Sprint 4 Priority cell reads `—` (**unranked**) to match.

### 🔴 Why the earlier acceptance no longer held — the durable lesson

This same fail-open was **shown to the owner and ACCEPTED on 2026-09-10**, recorded as an owner ruling on
[[tasks/citizenship-kill-switch-coverage]]. ⛔ **That acceptance is WITHDRAWN.**

🚩 **The reason is the part worth carrying: the acceptance was made while `CITIZENSHIP_CARD_ENABLED` was
`false` and the code was INERT. Flipping layer 1 at launch would have made a dead carve-out live** — so
the ruling never covered the situation it was about to meet. **An acceptance granted over unreachable
code is not an acceptance of that code running.**

This also **resolves a tension the vault had recorded as deliberately unresolved**: the owner had ruled
*"kill means kill"* for the ★ badge and *"keep the fail-open"* for the card. After `0291`, *kill means
kill* applies uniformly.

### 🚩 The degraded path is real and OBSERVED — not theoretical

On a **signed-in production session on 2026-09-21**, an **owner-run devtools probe inside the Yandex game
frame returned `isYandexDegraded: true`.** ⚠️ **That proves the degraded STATE occurs in production. It
does NOT prove the card's new behaviour was observed there** — see the residual at the top.

## Key Changes

**Scope: one gate expression plus its unit coverage.** The OR carve-out is removed; the gate is now the
**single flag read**, so **all four citizenship surfaces fail closed.**

| File | Change |
|---|---|
| `src/client/CitizenshipCard.ts` | **+3 / −9** — the degraded-mode fail-open carve-out removed; the gate becomes the single flag read |
| `src/client/flashist/FlashistFacade.ts` | **+2 / −2** — **doc comment only**, no behaviour |
| `tests/.../CitizenshipCard.test.ts` | **+12 / −9** — unit coverage for the degraded + flag-off case, alongside `0236`'s existing kill-switch tests |

**Verification, re-run by `fkit-lead` independently of both workers:**

- `npm test` — **138 suites / 1870 tests, all passing.**
- ✅ **A real negative control: the new check was shown RED BEFORE the change** (the card rendered the
  degraded guest state instead of hiding) **and GREEN AFTER.** ⚠️ **This is unit-level, in jsdom — it is
  the strongest evidence that exists here, and it is still not a browser.**
- Stateful review round 1: **Codex coverage FULL** (no degradation), **one low comment-only finding
  (R1)**, fixed on an owner ruling; review ledger header `Status: closed-out`.

## Outcome

- ✅ **All four client citizenship surfaces now fail closed.** The card matches the ★ badge, the inbox and
  the payments-reconciliation `POST`.
- ⚠️ **ACCEPTED COST, ruled on and NOT to be re-litigated: degraded-SDK players lose the card entirely
  instead of seeing a "couldn't connect" state — which was the fail-open's original purpose.** The owner
  was shown this and accepted it. ⛔ **Do not restore the fail-open to "fix" the lost error state.** If a
  degraded-session affordance is wanted later, that is separate, deliberate work.
- ⚠️ **SCOPE OF THE SWITCH, so nobody over-trusts it in an incident: it hides FOUR CLIENT SURFACES and
  does NOT stop the server crediting XP** ⇒ ⛔ **it is not a legal or moderation takedown mechanism.**
- 🔴 **`0291` IS NOW THE ONLY THING PRECEDING THE `CITIZENSHIP_CARD_ENABLED` FLIP — `0238` is not.** The
  same 2026-09-21 ruling **dropped `0238`'s gate**; see [[decisions/sprint-4]].
- 📌 **Proportionality was an explicit owner instruction on this line of work**, verbatim: *"it looks
  like we are overfocused on the enable/disable flags … it should be a boolean thing, that's it."*
  ⛔ **That is a standing instruction on SCOPE AND CEREMONY — it was NOT a licence to skip the plan gate
  or the review, and neither was skipped.**

### 🚩 FLAGGED FOR A HUMAN — the brief contradicts itself about `0238`, and the file settles it

`0291`'s brief says **two incompatible things** about the hand-off:

| Where in `0291`'s brief | What it claims |
|---|---|
| `## Status` — search for `HAND-OFF, owner-ruled` | `0238`'s bullet *"still records the old fail-open as accepted and is **now stale**"*, and `0238` *"was **NOT edited** by this close"* |
| `## Notes` — search for `Split out of` | `0238`'s `## Notes` bullet *"is struck there and points here"* |

✅ **VERIFIED AGAINST THE FILE AT `7eebaf3` (this sync's HEAD): the `## Notes` version is correct and the
`## Status` version is FALSE.** `0238`'s brief **was** modified in that same commit; its bullet **is**
struck (`~~**Known accepted limitation … owner-ruled 2026-09-10 …**~~`), carries an explicit
*"STRUCK 2026-09-21 — the acceptance is WITHDRAWN by owner ruling"*, and **links to `0291`**. `0238`
names `0291` four times.

🚨 **This is failure mode 4 from `ai-agents/knowledge-base/conventions/file-line-citations.md` — a claim
that was self-invalidated inside the very commit that wrote it**, and it arrived with a **bare-style
`:497` coordinate** of exactly the form convention 10 bans. ⛔ **The vault cannot fix a brief (ADR-005) —
a human must.** ⚠️ **The owner's *ruling* is not in question**: they ruled the hand-off be left for
whoever next opens `0238`. Only the brief's **description of what was done** is wrong.

## Related

- [[tasks/citizenship-kill-switch-coverage]] — task `0236`, which built the two gating layers and
  **recorded the 2026-09-10 fail-open acceptance this task withdrew**; also where the *"kill means kill"*
  / *"keep the fail-open"* tension was recorded as unresolved
- [[tasks/hide-citizenship-card-flag]] — task `0054`, which created layer 1 (`CITIZENSHIP_CARD_ENABLED`),
  **still `false`**; flipping it is the launch this task precedes
- [[tasks/citizenship-xp-progress-ui]] — the card content the gate hides
- [[tasks/degraded-mode-ux-treatment]] — task `0049`, which built the degraded-mode *"connection problem"*
  card state that this task's accepted cost gives up
- [[tasks/citizen-verified-icon]] — task `0068`, the ★ badge: the surface that **already** failed closed
  and that the card now matches
- [[systems/flashist-init]] — home of `flashistConstants`, `isYandexDegraded()` and the bounded platform
  init that produces the degraded state
- [[decisions/sprint-4]] — the sprint board carrying the citizenship launch, `0238`'s dropped gate, and
  this task's row
- [[systems/player-profile-store]] — the backend behind the surfaces the switch hides; ⛔ **the switch does
  not stop it crediting XP**
