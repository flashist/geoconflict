# Make the Citizenship Card Fail CLOSED When the Yandex SDK Is Degraded

**Source**: `ai-agents/tasks/done/0291-make-the-citizenship-card-fail-closed-when-the-yandex-sdk-is-degraded/brief.md`
**Status**: done
**Sprint/Tag**: Sprint 4 — citizenship launch preconditions; split out of `0238`

> 🆕 **2026-09-26 — the flip this task preceded has happened** (`CITIZENSHIP_CARD_ENABLED: true`, release
> `0.0.154`, [[tasks/citizenship-go-live]]). The remote kill switch was proven in production for the card
> ([[tasks/citizenship-kill-switch-launch-check]]) — ⚠️ **but on a normal session. Nobody has yet observed
> the card failing closed in a real DEGRADED production session**; this page's loudest residual stands.

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
  📌 **REINFORCED 2026-09-22 — `0238` MOVED OFF SPRINT 4 ONTO [[decisions/sprint-5]]** on an owner
  ruling (*"You can move the tasks connected to checkings to the next sprint, so we do final checkups
  and figure out what's wrong with them after deploy."*). ⇒ **the live/browser observation this task
  handed onward now lives a board later, after the deploy.** ⛔ **`0238`'s status token, board rank and
  task folder were not touched by that move, and it still blocks nothing.**
  ✅ **What the owner said DOES matter was checked: the switchability property** — *flag absent, flag set
  to a wrong value, or the Yandex SDK never loaded ⇒ every citizenship surface is OFF* — is
  **VERIFIED IN SOURCE 2026-09-22** and recorded in `0238`'s brief. 🚨 ⛔ **NOT verified in production —
  no deployed build has been observed doing it — and it holds on PRODUCTION builds only**, because
  `checkExperimentFlag()` returns `true` **unconditionally** when `GAME_ENV === "dev"`. ⛔ **A local
  "the card appeared" reading proves nothing.**
- 📌 **Proportionality was an explicit owner instruction on this line of work**, verbatim: *"it looks
  like we are overfocused on the enable/disable flags … it should be a boolean thing, that's it."*
  ⛔ **That is a standing instruction on SCOPE AND CEREMONY — it was NOT a licence to skip the plan gate
  or the review, and neither was skipped.**

### ✅ RESOLVED 2026-09-22 — the flag below was raised, taken to the owner, and the brief was corrected

📌 **The contradiction recorded in this section is FIXED IN THE SOURCE.** On **2026-09-22** a spawned
`fkit-producer`, on an **owner ruling** given live via `AskUserQuestion` and relayed by `fkit-lead`
(verbatim: ***"fix it"***), **struck the false `## Status` paragraph as factually wrong** — struck, not
deleted, so the error stays readable. ⛔ **Not producer precedent.** ⛔ **The owner's original ruling was
never in question and was not re-opened** — only the record's description of what was done.
**The section below is KEPT as the true record of what the vault found and flagged.** What the
correction establishes, with each part's basis named separately — ⚠️ **do not read one as carrying the
other's strength**:

- **(1) The end state is REPO-VERIFIED.** The fail-open acceptance in `0238`'s brief was **already
  struck** before the ruling about it was ever sought — struck at the **2026-09-21 re-scope of `0238`**
  — in the `## Notes` bullet beginning *"Known accepted limitation of the thing being validated"*, which
  today carries `~~…~~` plus a `🔴 STRUCK 2026-09-21 — the acceptance is WITHDRAWN by owner ruling`
  note. ⇒ **There was no stale line left to leave.**
- **(2) The ORDERING is NOT repo-verified, and 🚩 GIT CANNOT ESTABLISH IT.** `0238`'s brief holds **0**
  `0291` references at `45040b0` and **4** at `HEAD`, every one landing inside the single squashed
  `Sprint push` commit `7eebaf3` — so the same-day edits cannot be ordered from history. The ordering
  rests instead on **the re-scoping producer's own hand-back report to `fkit-lead`, delivered BEFORE the
  owner was asked anything**, which enumerated that edit among its own changes (verbatim: *"Two
  `## Notes` bullets struck: 'Blocks: the launch flip' (now blocks nothing) and the 2026-09-10 fail-open
  acceptance (withdrawn, points to `0291`)."*). ⚠️ **ATTESTED BY THE PERFORMING AGENT — agent testimony
  relayed through a session transcript, NOT a repo artefact and NOT proof.** ✅ Cross-checked against the
  file and it holds: both named bullets sit inside `## Notes`, both are struck, and there is **exactly
  one** fail-open-acceptance bullet.
- **(3) `0238` WAS edited by the `0291` close — hrefs only, four lines** (`../0291-` →
  `../../done/0291-`), after `fkit-lead` lifted its own `0238` fence and authorised exactly that repair.
  ⛔ **Nothing else in `0238` was touched — its `## Status` is still `🔲 Backlog`, board and rank
  unchanged.**
- 🔎 **ROOT CAUSE, recorded so nobody mis-reads it: `fkit-lead` put a STALE question to the owner** —
  asking whether to strike a bullet a producer had already struck earlier the same day. The owner
  answered *"leave it for whoever next opens `0238`"* in good faith, and that answer propagated into the
  process-review spawn, the review ledger and the close record, all describing a state that no longer
  existed. ⛔ **The owner did NOT change their mind, and NO agent defied a ruling.**

⚠️ **One thing the correction did NOT fix: the bare-style `:497` citation problem is unchanged in kind.**
The corrected text still carries line coordinates (`:496`, `:462`, `:481`) — it now says *"verify by
content, not by line number"* beside them, which is better, but the underlying hazard is the one
`0239` exists to measure.

---

### 🚩 THE ORIGINAL FLAG, kept as the record — the brief contradicted itself about `0238`

`0291`'s brief said **two incompatible things** about the hand-off:

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
`:497` coordinate** of exactly the form convention 10 bans. ~~⛔ **The vault cannot fix a brief (ADR-005) —
a human must.**~~ ✅ **A human did — 2026-09-22, see the resolution block above.** ⚠️ **The owner's
*ruling* is not in question**: they ruled the hand-off be left for whoever next opens `0238`. Only the
brief's **description of what was done** was wrong.

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
- [[decisions/sprint-5]] — where `0238`, the launch-time observation this task handed onward, now sits
- [[tasks/yandex-catalog-registration]] — task `0014`, which set the **remote** half (`citizenship_ui`) of
  the same kill switch; closed 2026-09-22, and carrying the unresolved flag-name/value residual
