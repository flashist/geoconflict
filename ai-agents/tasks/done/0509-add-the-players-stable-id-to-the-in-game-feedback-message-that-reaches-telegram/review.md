# Review — 0509

Task: ai-agents/tasks/done/0509-add-the-players-stable-id-to-the-in-game-feedback-message-that-reaches-telegram/brief.md
File(s) under review: src/core/FeedbackPlayerReference.ts (new), src/client/FeedbackPlayerReference.ts (new), src/client/FeedbackModal.ts, src/server/Master.ts (`/api/feedback` only), tests/server/MasterFeedbackRoutes.test.ts, tests/client/FeedbackPlayerReference.test.ts (new) — working tree vs HEAD
Status: closed-out
Coverage: reasoning-only second opinion — round 1: Codex ran (`codex-cli 0.157.1`, exit 0) and returned a usable findings list, but executed only `git diff --check` (source-text inspection, not measurement); the reviewer's own leg measured (targeted `npm test` on both suites, 50/50 pass; a node check that the shared pattern accepts `undefined` and `12345`).

## Reviewer findings
| #  | Round | Sev  | Location | Claim |
|----|-------|------|----------|-------|
| R1 | 1     | medium | src/client/FeedbackPlayerReference.ts:20 (`yandexId === null \|\| !FEEDBACK_YANDEX_ID_PATTERN.test(yandexId)`) | The guard checks `=== null` then `RegExp.test`, which coerces non-strings: `undefined` → `"undefined"`, `12345` → `"12345"` both pass (measured). `getYandexUniqueId()` returns the SDK's `getUniqueID()` off an `any`-typed object (FlashistFacade.ts:2361/2676), so the `string \| null` type is unchecked. If the SDK ever yields a non-string, the client sends `{kind:"yandex"}` (JSON drops `undefined`) or a number, the server schema 400s it, and every logged-in player's feedback fails — the exact "real client never 400s" guarantee the resolver exists to give (plan step 2/3a). Raised by both. Direction: a `typeof … !== "string"` gate before the pattern, plus a resolver test for a non-string id. |

## Coder response
| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R1 | CORRECT | Defect | `src/client/FeedbackPlayerReference.ts` (`resolveFeedbackPlayerReference`): guard changed to `typeof yandexId !== "string" \|\| !FEEDBACK_YANDEX_ID_PATTERN.test(yandexId)` with a one-line why-comment; new resolver case in `tests/client/FeedbackPlayerReference.test.ts` for `undefined` and `12345` → `unavailable`. Severity (coder): medium — trigger is speculative (`getUniqueID()` off an `any` object, FlashistFacade.ts `getYandexUniqueId` → `return this.yandexSdkPlayerObject.getUniqueID();`), but if it fires every logged-in report 400s and is lost (`FeedbackModal.ts` `onSubmit`: `if (!resp.ok) throw`). Applied under the ADR-055 standing approval (in-plan: plan step 2). Targeted tests 52/52, lint 0, tsc 0. Optional nit (exhaustive `never` in `describePlayerReference`) not applied — not in plan, not an obvious winner. | ✅ done |

## Accepted residuals (shared, do-not-re-litigate)
- Raw Yandex id in Telegram — What: the client-reported raw Yandex id is shown in the Telegram feedback message (and the webhook, if ever configured) · Why (structural): owner ruling 2026-10-28 (AskUserQuestion, fkit-lead session, quoted in worklog.md); fingerprint rejected for lookup simplicity; logs/analytics stay id-free · Re-raise only if: the id reaches a sink other than Telegram/webhook (logs, OTEL, analytics).
