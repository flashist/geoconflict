# Review — 0409

Task: ai-agents/tasks/done/0409-explainer-popup-offer-a-buy-button-to-earned-citizens-who-have-not-paid-verified-sessions-only/brief.md
File(s) under review: src/client/CitizenshipOffer.ts, src/client/CitizenshipCard.ts, src/client/CitizenshipExplainerModal.ts, src/client/flashist/FlashistFacade.ts, resources/lang/en.json, resources/lang/ru.json, ai-agents/knowledge-base/analytics-event-reference.md, tests/client/CitizenshipOffer.test.ts, tests/client/CitizenshipExplainerModal.test.ts, tests/client/CitizenshipCard.test.ts, tests/client/CitizenshipExplainerLang.test.ts (working tree vs HEAD; task 0408's uncommitted hunks in the same files are baseline, not reviewed)
Status: closed-out
Coverage: reasoning-only second opinion — round 1: Codex ran (codex-cli 0.157.1, exit 0) and returned a usable findings list, but executed only source-text inspection (rg, sed, git diff; "did not run tests"); the reviewer's own leg ran the four touched suites (4 suites, 337 tests passed).

## Reviewer findings

| #  | Round | Sev | Location | Claim |
|----|-------|-----|----------|-------|

Round 1: **no confirmed findings.** Nothing to act on.

Disproven in round 1 (recorded here only so it is not re-chased; no coder action needed):
- **Codex X1 (raised high) — "popup tap does not re-check the live offer, so a stale `citizen_buy` button can start a purchase after a re-read says paid/unverified/checking" — INCORRECT (disproven).** `refreshProfile()` applies the profile and the paid/verification publishes synchronously, then `requestUpdate()` (src/client/CitizenshipCard.ts:327-339); the card's `updated()` dispatches `CITIZENSHIP_OFFER_CHANGED_EVENT` synchronously (src/client/CitizenshipCard.ts:520-523) and the open popup's `onOfferChanged` calls `requestUpdate()` (src/client/CitizenshipExplainerModal.ts:195-199). Lit schedules both updates as microtasks (no `scheduleUpdate`/rAF override in either file), so the stale button is gone before any input event can be dispatched. The only staleness a tap can hit is the server-side stale verified read — the owner-accepted gap (stale-verified-read, 2026-10-08), identical to today's non-citizen Buy. A tap-time re-check would be defence in depth only, not a fix for a reachable defect.

## Coder response

| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|

Round 1 (fkit-coder, Process-review worker of `fkit-sprint-ship-loop`, 2026-10-08): **no finding rows to answer — no rows written, no code changed.**

- **Codex X1 — coder concurs with the reviewer's disproof (re-verified at file:line, not inherited).** Every write to the offer's verified/paid inputs is followed synchronously by `requestUpdate()` on the card: `refreshProfile()` (src/client/CitizenshipCard.ts:327-339, publishes at :333/:335, `requestUpdate()` at :339) and the late-login reset to `"unknown"` (src/client/CitizenshipCard.ts:247-248) — the only two publishers in `src/client` (grep of `publishProfileVerificationStatus(` / `publishPaidCitizenship(`). `paidGrantConfirmed` is set with `requestUpdate()` straight after (src/client/CitizenshipCard.ts:1042-1044). The card's `updated()` dispatches `CITIZENSHIP_OFFER_CHANGED_EVENT` (src/client/CitizenshipCard.ts:520-523); the open popup's `onOfferChanged` calls `requestUpdate()` (src/client/CitizenshipExplainerModal.ts:195-199) and re-reads the offer live via `currentOffer()` (src/client/CitizenshipExplainerModal.ts:268-270). Both are plain `LitElement`s with no `scheduleUpdate`/rAF override (grep), so both re-renders run as microtasks, before any input event task. Remaining staleness = `stale-verified-read` (accepted residual), not a client defect. No row added.
- **Owner ruling (live `AskUserQuestion`, lead session, 2026-10-08): "Ship as is"** — no tap-time re-check added as defence in depth.

## Accepted residuals (shared, do-not-re-litigate)

- **stale-verified-read** — What: the `citizen_buy` button can show to someone who has just paid when the page's *verified* read is stale (paid on another device/tab after this page read the profile, or a paid purchase whose server confirm never landed and is re-granted only by session-start reconciliation); the server's intent route does not refuse a second purchase · Why (structural): the client can only act on the last read it has; the same window exists today for the non-citizen Buy; a server-side "already paid" refusal is a separate profile-server task and still would not cover the reconciliation case — owner accepted it for now (worklog.md § Owner answers to the plan's open questions, Q10: "Accept for now (as today); no follow-up task filed.") · Re-raise only if: a path shows Buy to a paid or unverified citizen that is NOT one of those two stale-read cases, or the owner reopens the server-side refusal.

