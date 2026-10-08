# Citizenship Explainer Popup: the Paid-Only Ad-Free Perk Under Its Own "Paid citizenship only:" Sub-Heading (task 0408)

**Source**: `ai-agents/tasks/done/0408-explainer-popup-put-the-paid-only-ad-free-perk-under-its-own-paid-citizenship-sub-heading/brief.md` (`plan.md`, `worklog.md`, `review.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 7, rank 55 (ADR-035 append rank; moved in from the Backlog board 2026-10-08) / task `0408`

> ✅ Done (agent-closed — not owner-verified), closed 2026-10-08 by `fkit-sprint-ship-loop`. Committed in `a555111`
> (2026-10-08, "Sprint push"); `git tag --contains a555111` → none ⇒ **committed, not deployed** (checked 2026-10-08).
> Cleared for a same-day deploy by owner ruling (*"might"*). Live look → `0420` ([[decisions/sprint-8]]).

## Goal

In the citizenship explainer popup ([[tasks/citizenship-explainer-popup]], live since `0.0.157`) the ad-free line sat
under *"Что получают граждане"* ("what citizens get"), so it read as a perk of every citizen; only a trailing suffix said
it was for bought citizenship. Owner, 2026-10-08: *"the text shows about ALL citizenship types, but some persk are only
for the PAID citizenship"*. An owner-requested change to approved `0301` text, not a bug fix.

## Key Changes

**Owner rulings (2026-10-08):** option 2 of three — a small paid-only sub-heading, RU text exactly
**`Только для платного гражданства:`** (owner's words). Plan gate: EN **`Paid citizenship only:`**; **drop** the
now-redundant suffix → RU *"Без полноэкранной рекламы перед матчами и после них"*, EN *"No full-screen ads before and
after matches"*.

- `src/client/CitizenshipExplainerModal.ts` — badge, name change and (when enabled) private lobby stay under the
  all-citizens heading; a new smaller sub-heading follows, with the ad-free line as its own short list.
- New key `citizenship_explainer.paid_only_title`; `benefit_no_ads` shortened — both in `en.json` and `ru.json`.
- Tests: key lists updated, DOM placement checked. **Review R1 + R2 (low, test-only):** EN title and both
  `benefit_no_ads` strings now pinned exactly.

## Outcome

- Verify: 2 suites 112/112; 15 other lang-reading suites 380/380; lint clean; `citizenship_explainer` key sets equal
  (16 = 16).
- **Local visual check done** (Playwright, guest): EN/RU at desktop and 360×740 — fits; at 360×560 the box scrolls and
  Close is reachable.
- `0397`'s card line already said *"платного"*, so the wording now matches across card and popup (later rewritten by
  `0407`, [[tasks/paid-citizen-thank-you-line]]).

## Related

- [[tasks/citizenship-explainer-popup]] — task `0301`, the popup and its approved wording
- [[tasks/citizenship-explainer-popup-live]] — task `0401`, whose live check surfaced this
- [[tasks/paid-citizen-ad-free]] — task `0248`, the paid-only ad-free perk
- [[tasks/explainer-buy-for-earned-citizens]] — task `0409`, same popup; its button sits after this section
- [[tasks/explainer-popup-wider]] — task `0417`, same popup, built after this
- [[decisions/sprint-7]] — the board (rank 55)
- [[decisions/sprint-8]] — `0420`, the live-check checklist
