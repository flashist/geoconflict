# Make the citizenship card fail CLOSED when the Yandex SDK is degraded — before launch

## ID
0291

## Sprint
Sprint 4

⚠️ **The field above is the bare token `Sprint 4` on purpose** — `dashboard.sh`'s drift rule compares
it against the board's identity, and a decorated value is reported as drift. **Do not decorate it.**

## Priority
**Unranked** — filed onto Sprint 4 by a spawned `fkit-producer`. ⛔ **The owner ruled the CHANGE, not
the board and not the rank** — both are the producer's, open to be overturned in one edit. The Sprint 4
Priority cell reads `—` to match.

## Status
✅ Done (agent-closed — not owner-verified) — closed 2026-09-21 by a spawned `fkit-producer` with **no owner channel** (ADR-021, ADR-033 §5) ⇒ **no human has verified this work.** **What landed:** the degraded-mode fail-open carve-out is removed, the gate is now the single flag read, and **all four citizenship surfaces fail closed.** **Evidence, re-run by `fkit-lead` independently of both workers:** `npm test` **138 suites / 1870 tests, all passing**; the negative check was shown **red before** the change (the card rendered the degraded guest state instead of hiding) and **green after**; change surface `CitizenshipCard.ts` `+3/-9`, `FlashistFacade.ts` `+2/-2` (doc comment only), `CitizenshipCard.test.ts` `+12/-9`; stateful review round 1 **Codex coverage FULL**, one low comment-only finding (R1) fixed on an owner ruling, ledger header `Status: closed-out`. 🚩 **LOUDEST RESIDUAL — NO LIVE/BROWSER VERIFICATION: nobody has observed the card failing to render in a REAL degraded production session.** That observation belongs to [`0238`](../0238-validate-citizenship-ui-kill-switch-in-a-real-build-launch-gate/brief.md)'s launch check; the review ledger deliberately hands it onward rather than settling it. ⛔ **This task launches NOTHING** — `CITIZENSHIP_CARD_ENABLED` is unchanged and still `false`. ~~📌 **HAND-OFF, owner-ruled and recorded here so it is not lost:** `0238/brief.md:497` still records the old fail-open as accepted and is **now stale**; the owner ruled to **leave it for whoever next opens `0238`**, so it was **NOT edited** by this close.~~ 🔴 **STRUCK AS FACTUALLY WRONG — 2026-09-21, by a spawned `fkit-producer` on an OWNER RULING given live via `AskUserQuestion` and relayed by `fkit-lead`: *fix it*.** ⛔ Not producer precedent. **Struck, not deleted, so the error stays readable.** ⛔ **THE OWNER'S RULING IS NOT IN QUESTION and is not re-opened — only this record's description of what was done was wrong.** **What actually happened, with each part's basis named separately — do not read one as carrying the other's strength:** **(1)** the fail-open acceptance in `0238`'s brief was **ALREADY STRUCK** before the ruling about it was ever sought — it was struck **at the 2026-09-21 re-scope of `0238`**, and today reads `~~…~~` plus a `🔴 STRUCK 2026-09-21 — the acceptance is WITHDRAWN by owner ruling` note, in the bullet beginning *"Known accepted limitation of the thing being validated"* (`0238/brief.md:496`, under `## Notes` — ⚠️ verify by content, not by line number). ⇒ **There was no stale line left to leave.** ✅ **The END STATE is repo-verified** (read from the file 2026-09-21). 📎 **The ORDERING is not, and here is exactly what it rests on. 🚩 GIT CANNOT ESTABLISH IT:** `0238/brief.md` holds **0** `0291` references at `45040b0` and **4** at `HEAD`, every one of them landing inside the single squashed `Sprint push` commit `7eebaf3`, so the same-day edits cannot be ordered from history. **What the ordering rests on instead is the re-scoping producer's own hand-back report to `fkit-lead`, delivered BEFORE the owner was asked anything about `:497`**, which enumerated this edit among its own changes — **verbatim:** *"Two `## Notes` bullets struck: 'Blocks: the launch flip' (now blocks nothing) and the 2026-09-10 fail-open acceptance (withdrawn, points to `0291`)."* ⇒ **the agent that performed the edit attesting to having performed it** — not an inference from file state. ⚠️ **RECORD IT AS ATTESTED BY THE PERFORMING AGENT, NOT AS REPO-VERIFIED and NOT as proof:** it is agent testimony relayed through a session transcript, not a repo artefact. ✅ **Cross-checked against the file 2026-09-21 and it holds:** `## Notes` begins at `0238/brief.md:462`, both bullets the report names are inside it and both are struck — `**Blocks:**` at `:481`, the fail-open acceptance at `:496` — and the file contains **exactly one** fail-open-acceptance bullet, so the report is not describing some second, still-unstruck one. **(2)** `0238/brief.md` **WAS** edited by this close — **hrefs only, four lines** (`:66`, `:74`, `:487`, `:504`: `../0291-` → `../../done/0291-`, verified correct now), done after **`fkit-lead` lifted its own `0238` fence and authorised exactly that repair**. ⛔ **Nothing else in `0238` was touched — its `## Status` is still `🔲 Backlog`, and its board and rank are unchanged.** 🔎 **ROOT CAUSE, recorded so nobody mis-reads this: `fkit-lead` put a STALE question to the owner** — asking whether to strike a bullet that a producer had already struck earlier the same day. The owner answered *"leave it for whoever next opens `0238`"* in good faith, and that answer was then propagated into the process-review spawn, the review ledger and this close record, all describing a state that no longer existed. ⛔ **The owner did NOT change their mind, and NO agent defied a ruling.**

· earlier: 🔄 In progress — driven from the `fkit lead` session by `/fkit-sprint-ship-loop`, started 2026-09-21 (plan step), on an OWNER RULING given live via `AskUserQuestion` and relayed by `fkit-lead`: *ship it through the loop*. ⚠️ The owner also asked that this be kept **proportionate** — verbatim, on the parent effort: *"it looks like we are overfocused on the enable/disable flags … it should be a boolean thing, that's it."* ⛔ That is a standing instruction on SCOPE AND CEREMONY, not a licence to skip the plan gate or the review. · earlier: 🔲 Backlog

## Owner
fkit-coder

## Context

**AUTHORITY.** An **OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on
2026-09-21**, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel. ⛔ **Not
producer precedent — one ruling, one task.**

`src/client/CitizenshipCard.ts` gates the card on (verify by content, not by line number):

```
FlashistFacade.instance.isYandexDegraded() ||
  (await FlashistFacade.instance.isCitizenshipUiEnabled())
```

⇒ 🔴 **A degraded-SDK session renders the citizenship card EVEN WITH THE `citizenship_ui` FLAG OFF.**
The other three gated surfaces — the ★ citizen badge, the inbox, and the payments-reconciliation POST —
all fail **closed**. The card is the odd one out.

**Why the earlier acceptance no longer holds.** This fail-open was **shown to the owner and accepted on
2026-09-10** — but that acceptance was made **while `flashistConstants.features.CITIZENSHIP_CARD_ENABLED`
was `false` and the code was inert**. Flipping layer 1 at launch makes it live. ⛔ **That acceptance is
WITHDRAWN.** The owner ruled: **make the card fail closed before launch**, matching the other three.

🚩 **LIVE EVIDENCE, RECORDED AS SUCH — the degraded path is real and observed, not theoretical.** On a
**signed-in production session on 2026-09-21**, an owner-run devtools probe inside the Yandex game frame
returned **`isYandexDegraded: true`**.

## What to build

Make the card's gate match the other three surfaces: **flag off ⇒ no card**, degraded SDK or not.

⚠️ `CITIZENSHIP_CARD_ENABLED` is already checked **first and absolutely**, ahead of this expression —
that half is correct and is not what changes here.

## Accepted cost — recorded, ruled on, and NOT a regression to re-litigate

**Degraded-SDK players lose the card entirely instead of seeing a "couldn't connect" state — which was
the fail-open's original purpose.** The owner was shown this and accepted it. ⛔ **Do not restore the
fail-open to "fix" the lost error state**; if a degraded-session affordance is wanted later, that is a
separate, deliberate piece of work.

## Verification steps

1. With the `citizenship_ui` flag **off** and the SDK **degraded**, the card **does not render**.
2. With the flag **on**, the card renders as before — no behaviour change on the normal path.
3. Unit coverage for the degraded + flag-off case, alongside `0236`'s existing kill-switch tests.
4. `npm test` green.

## Notes

- **Split out of** [`0238`](../0238-validate-citizenship-ui-kill-switch-in-a-real-build-launch-gate/brief.md)
  on the same 2026-09-21 ruling that dropped `0238`'s pre-launch gate. `0238`'s `## Notes` bullet
  recording the 2026-09-10 acceptance is struck there and points here.
- **Blocks:** the citizenship launch — i.e. flipping `CITIZENSHIP_CARD_ENABLED` to `true` in a
  production build. ⚠️ **This is the only thing that now precedes that flip**; `0238` does not.
- **Scope of the switch, so nobody over-trusts it in an incident:** it hides four client surfaces and
  **does NOT stop the server crediting XP** ⇒ ⛔ **not a legal or moderation takedown mechanism.**
- ⛔ **This brief writes no source.** Filed by a spawned `fkit-producer`; appended, nothing renumbered
  (ADR-035).
