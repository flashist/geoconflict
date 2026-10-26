# Review — 0494

Task: ai-agents/tasks/done/0494-client-shared-purchase-core-offer-product-purchase-coordinator-and-per-product-restart-popup-b2/brief.md
File(s) under review: src/client/{PurchaseOffer,ProductClientConfig,ProductPurchase,PurchaseCoordinator}.ts (new); src/client/{CitizenshipOffer,CitizenshipPurchase,CitizenshipCard,CitizenshipRestartOffer,CitizenshipRestartModal,PaymentsApiClient,PaymentsReconciliation,Main}.ts; src/client/flashist/FlashistFacade.ts (only `authDialogInFlight` + `openYandexAuthDialog`/`runAuthDialog`); ai-agents/knowledge-base/analytics-event-reference.md (only the `CITIZENSHIP_RESTART_PROMPT_SHOWN` row); tests/client/{PurchaseOffer,PurchaseCoordinator,ProductPurchase,ProductClientConfig}.test.ts (new); tests/client/{CitizenshipPurchase,PaymentsApiClient,PaymentsReconciliation,CitizenshipRestartOffer,CitizenshipRestartModal,CitizenshipCard,FlashistFacade}.test.ts. Working tree, B2 surface only — 0488/0491/0492 hunks out of scope.
Status: closed-out
Coverage: reasoning-only second opinion — Codex ran (`codex-cli 0.157.1`, exit 0) and returned "no significant issues found in B2 scope"; it executed only `tsc --noEmit` (a type check, not measurement) and its jest attempt was denied by the read-only sandbox. Execution evidence is the Claude reviewer's: 13 targeted suites 532/532 pass, plus an exhaustive 1024-case old-vs-new `deriveCitizenshipOffer` parity probe with 0 mismatches.

## Reviewer findings
| #  | Round | Sev | Location | Claim |
|----|-------|-----|----------|-------|
| R1 | 1 | low | src/client/PlatformDialogPresence.ts:9 — "Marked by runCitizenshipPurchase() (intent → payment frame → server /complete)" | Comment made wrong by B2: the 0404 marker now lives in `runProductPurchase()` (ProductPurchase.ts:36), and in production nothing calls `runCitizenshipPurchase()` any more (card → coordinator → `runProductPurchase`, wired at Main.ts:226). Project rule: fix a comment your change makes wrong. Same drift, milder, in the edited analytics-reference row ("the flow `runCitizenshipPurchase()` delegates to" reads as if that wrapper were on the live path). Docs/comment only; no behaviour impact. |

## Coder response
| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R1 | CORRECT | Defect (comment/doc drift, low — no behaviour impact) | `PlatformDialogPresence.ts` header comment now names `runProductPurchase()` (verified: the marker is `beginPlatformDialog()` at `ProductPurchase.ts:36`; the only production caller is the coordinator wired in `Main.ts`); `analytics-event-reference.md` `CITIZENSHIP_RESTART_PROMPT_SHOWN` row: dropped "— the flow `runCitizenshipPurchase()` delegates to". Comment/doc only; targeted suites + lint re-run green | ✅ done |

## Accepted residuals (shared, do-not-re-litigate)
