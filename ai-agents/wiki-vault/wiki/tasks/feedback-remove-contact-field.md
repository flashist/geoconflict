# Feedback Contact Field Removal

**Source**: `ai-agents/tasks/done/0046-feedback-remove-contact-field/brief.md` (plus `plan.md`, `worklog.md`, `review.md` in the same folder)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 4 / task 0046 / 152-ФЗ data minimization

## Goal

Remove the optional email/Telegram contact field from the in-game feedback popup end-to-end — UI, request payload, server schema, and both delivery formats. Collecting a personal contact makes the field personal data under 152-ФЗ, bringing operator-notification and consent obligations the project does not want for an incidental support field. Removal is pure data minimization: feedback already carries automatic device/build/match context, and players wanting a reply have the Telegram/VK channels.

## Key Changes

Four files, pure removal:

- `src/client/FeedbackModal.ts` — `contact` state, input block, payload key, resets, and now-dead CSS all removed; zero `contact` references remain. The `StaleBuildModal` reuse loses the field too (expected).
- `src/server/Master.ts` — `contact` removed from `FeedbackSchema` (the key server change: Zod strips unknown keys on parse, so stale clients still sending `contact` have the value dropped, not forwarded and not logged — empirically confirmed on zod 4.0.5 in review); the Contact field removed from both the webhook embed and the Telegram message body.
- `resources/lang/en.json` + `ru.json` — `feedback_modal.contact_placeholder` removed from both, kept in sync. Unrelated "contact support" keys untouched; stale keys in other language files left dead per the en/ru-only project rule.
- No template edits needed — the field lived entirely in the Lit component's shadow DOM (verified no-op against both HTML templates).

Analytics unchanged: `Feedback:Submitted:<screen>` fires as before; no new event needed.

## Outcome

The feedback form is now category + free text + send. Review round 1 produced **zero findings** (both reviewers, including the Codex adversarial pass). Verified: tsc/lint clean, 87 suites / 691 tests green, greps clean, en/ru key sets identical.

**Carried caveats (agent-closed, not owner-verified):**

- **Live checks not run** (post-deploy, owner/driver-side): popup shows no contact input on start/battle/stale-build screens; a delivered Telegram report carries no Contact line; `Feedback:Submitted` unchanged.
- Accepted residuals: no `/api/feedback` server test (owner-ruled; none existed before either); historical contact values already delivered to Telegram/webhook history are owner-ruled to the 152-ФЗ compliance track (feedback is fire-and-forward — nothing stored in our DBs).

**Flag carried for the owner:** the **email subscription modal** collects email under the same 152-ФЗ logic and is a *larger* exposure, but cannot be fixed by removal (email is the feature). The brief recommends folding it into the 152-ФЗ compliance track's scope rather than fixing PII surfaces piecemeal. **Resolved 2026-08-21 — owner ruled the fold-in:** the modal is now an explicit in-scope item of compliance task `0048`. See [[decisions/personal-data-152fz-compliance]].

## Related

- [[features/feedback-button]] — the feature this changes; its form no longer has a contact field
- [[decisions/personal-data-152fz-compliance]] — the compliance track this data-minimization serves; email-subscribe and historical values are routed there
- [[tasks/email-subscribe-modal]] — the adjacent email-collecting surface flagged under the same logic
- [[decisions/sprint-4]] — carried as an independent Sprint 4 compliance task
- [[decisions/sprint-backlog]] — the board where `0048` carries the folded-in email-subscribe scope
