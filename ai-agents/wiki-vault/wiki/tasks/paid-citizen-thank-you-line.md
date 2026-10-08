# Thank Paid Citizens for Supporting the Game on the Citizenship Card (task 0407)

**Source**: `ai-agents/tasks/done/0407-thank-paid-citizens-for-supporting-the-game-on-the-citizenship-card/brief.md` (`plan.md`, `worklog.md`, `review.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 7, rank 54 (ADR-035 append rank; moved in from the Backlog board 2026-10-08) / task `0407`

> ✅ Done (agent-closed — not owner-verified), closed 2026-10-08 by `fkit-sprint-ship-loop`. Committed in `a555111`
> (2026-10-08, "Sprint push"); `git tag --contains a555111` → none ⇒ **committed, not deployed** (checked 2026-10-08).
> Cleared for a same-day deploy by owner ruling (*"might"*, not a commitment). **No visual or live check done** — the
> live look is on `0420` ([[decisions/sprint-8]]).

## Goal

The owner (2026-10-08) could not tell whether an account's citizenship was **paid** or **earned**, and asked for plain
text — *"thank you for supporting the game"* — not another check mark or badge. Design had to be approved by the owner
before any build (a recorded gate in the brief).

## Key Changes

**Design approval (owner, 2026-10-08, live `AskUserQuestion`, option labels as relayed):** Q1 **"A: One line, no ✓"** —
rewrite `0397`'s existing paid line instead of adding a second one · Q3 **"Same as status lines"** (small grey text, no
icon) · Q4 **"Accept all five"** defaults: an **unverified** paid player sees no thank-you (ADR-116 Decision 4 — they see
`0397`'s *couldn't confirm* line); hidden with the card (kill switch / `citizenship_ui`); paid **and** earned still sees
it; start screen only; no analytics event.

- `citizenship_status.verified_paid` rewritten in both lang files — EN *"Thank you for supporting the game! Your paid
  citizenship benefits are on."* / RU *"Спасибо, что поддерживаете игру! Преимущества платного гражданства включены."*
  ⚠️ **This supersedes `0397`'s owner-approved wording** (*"✓ Verified — your paid citizenship benefits are on"*), and
  drops the ✓. `0397`'s other status lines are untouched. See [[tasks/session-verified-status-line]].
- Source changes are comments only (`CitizenshipCard.ts`, `CitizenshipNotice.ts`); the line is still rendered by `0397`'s
  `renderStatusNotice()` and read from the single paid source (`isPaidCitizen`, true only on a verified read —
  [[tasks/authenticated-profile-read]]).
- Tests: new `describe("paid thank-you (task 0407)")` in `tests/client/CitizenshipCard.test.ts`; lang pins.
- **Review R1 (low, partially correct):** the "not shown" rows asserted only absence; the coder added positive witnesses
  (expected status and line) — test-only.

## Outcome

- Verify: 4/4 suites, 276/276; both strings byte-equal to the approved text; tsc, lint clean. Non-vacuity shown by
  mutation.
- **No local visual check** (text-only change in the same element) and no live check yet.
- The brief's *"`0396` still open"* lines are history: `0396` passed 2026-10-08 ([[tasks/authenticated-profile-read-live]]),
  so the live check's precondition is met.

## Related

- [[tasks/session-verified-status-line]] — task `0397`, whose paid line this rewrote
- [[tasks/authenticated-profile-read]] — task `0250` S3b, the verified owner view behind `isPaidCitizen`
- [[tasks/authenticated-profile-read-live]] — task `0396`, the live check that makes this visible
- [[tasks/paid-citizen-ad-free]] — task `0248`, same single paid source
- [[decisions/adr-116-verified-login]] — Decision 4: unverified fails closed
- [[tasks/explainer-buy-for-earned-citizens]] — task `0409`, built alongside on the same card's offer rule
- [[decisions/sprint-7]] — the board (rank 54)
- [[decisions/sprint-8]] — `0420`, the live-check checklist
- [[tasks/explainer-paid-only-subheading]] — task `0408`, the popup's *paid only* wording, built the same day
- [[tasks/citizenship-explainer-popup-live]] — task `0401`, the live check during which `0407`–`0409` were moved in
