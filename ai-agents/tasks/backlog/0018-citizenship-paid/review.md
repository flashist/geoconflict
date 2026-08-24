# Review — 0018-citizenship-paid

Task: ai-agents/tasks/backlog/0018-citizenship-paid/brief.md
File(s) under review: uncommitted working-tree diff vs HEAD (7b58655) — src/client/CitizenshipPurchase.ts (new), src/client/CitizenshipCard.ts, src/client/flashist/FlashistFacade.ts, src/client/PaymentsReconciliation.ts, src/profile-server/PaymentsRepository.ts (comment-only), resources/lang/en.json + ru.json, ai-agents/knowledge-base/analytics-event-reference.md, tests (CitizenshipPurchase.test.ts + PaymentsReconciliation.test.ts new; CitizenshipCard/FlashistFacade test additions; 2 compose it-tests in PaymentsRepository.it.test.ts)
Status: closed-out

## Reviewer findings

| #  | Round | Sev    | file:line | Claim |
|----|-------|--------|-----------|-------|
| R1 | 1     | medium | src/client/CitizenshipCard.ts:255,318,327 | An existing citizen can be shown a WORKING buy CTA when the profile read degrades: `loadPlayerProfileView` maps every authorized fetch failure to zero-state `{isCitizen:false}` (PlayerProfileView.ts:76-79), and the card keys CTA rendering on `isCitizen === false` + catalog-ready — it cannot distinguish "confirmed non-citizen" from "unknown". `paidGrantConfirmed` only protects the same element after a same-session flow. Window is narrowed by the shared API base (config-failure zero-states also kill `/intent`, so no charge), but a partial failure — `GET /v1/profile/:id` failing (429/500/timeout/parse) while payments POSTs work — leaves a real second-charge path for the whole session. Raised by Codex (High); verified CORRECT, severity mine: Medium — real-money exposure only after 0065 flips live, but systematic. Defect (rendering a paid CTA off non-authoritative profile data is new in this diff; NOT a re-litigation of the settled zero-state fallback or the ms-scale stale-UI residual). Must be resolved (fix or explicit residual) before 0065 go-live. |
| R2 | 1     | low    | src/client/CitizenshipPurchase.ts:87; src/client/CitizenshipCard.ts:366-373 | A hung (never-settling) `consumePurchase` SDK call freezes the purchase flow AFTER the server grant: `runCitizenshipPurchase` awaits the consume before returning "granted", so the card never sets `paidGrantConfirmed`, never refreshes, shows no error, and the in-flight latch stays held (button dead) for the session. Rejections are handled; hangs are not — and the codebase explicitly treats hung SDK calls as real (boot deadline, FlashistFacade.ts:555-565). Blast radius small: latch prevents a second charge, reload self-heals, reconciliation consumes next session. Raised by Codex (Medium); verified CORRECT, severity mine: Low. Defect (robustness). Shared root cause with R3: unbounded await on `consumePurchase`. Candidate fix shape: don't gate the "granted" return on the consume settling (fire-and-forget or timeout) — consume-after-grant ordering is preserved either way. |
| R3 | 1     | low    | src/client/PaymentsReconciliation.ts:59-68 | Same hang class blocks the reconciled signal: `PURCHASES_RECONCILED_EVENT` is dispatched only after every `await consumePurchase(token)` settles. The grants are already committed when `/reconcile` responds (line 55); one hung consume means the event never fires, the once-per-session latch (line 35) blocks a retry, and the card keeps a live buy CTA all session for a player the server just granted — the exact stale-CTA/second-charge state the event exists to prevent. The comment "fired even when a consume fails" covers rejections only. Raised by Codex (Medium); verified CORRECT, severity mine: Low (requires an SDK hang + a subsequent real purchase; live only post-0065). Defect. Candidate fix shape: dispatch the event before (or independent of) the consume loop. |
| R4 | 1     | info   | ai-agents/tasks/backlog/0018-citizenship-paid/worklog.md (Phase 1, FlashistFacade bullet) | Worklog attribution inaccuracy, no code change needed: the 3 `PURCHASE_*_CITIZENSHIP` analyticEvents keys already exist at HEAD — `git log -S` shows them introduced by commit 7b58655 itself (the 0017 review-round commit), so the working-tree diff does not add them, contradicting the worklog's "3 new analyticEvents keys" claim. Implies a slice of 0018 Phase-1 content was swept into the 0017 commit. State of the code is correct; worklog (and the owner's awareness of the commit-content mix) is what needs the touch-up. |

### Re-verification (Round 1 fixes) — reviewer, 2026-08-24

All four fixes verified against the actual files; **close-out confirmed**.

- **R1 ✅** — `isAuthoritative` has exactly two writers in source: `false` in the shared zero-state
  object (PlayerProfileView.ts:66, reused by every fallback return) and `true` only in the success
  return reached after a non-null, Zod-parsed `fetchPublicProfile` (PlayerProfileView.ts:104). No
  path sets it true on a failed fetch. CTA gate `isCitizen || !profile.isAuthoritative → nothing`
  (CitizenshipCard.ts:318). Pinned: card zero-state-no-CTA test (CitizenshipCard.test.ts:477) +
  `toEqual` flag assertions across PlayerProfileView paths.
- **R2 ✅** — consume is now `void facade.consumePurchase(...).catch(...)` issued only after the
  server-confirmed `/complete` and the Completed event (CitizenshipPurchase.ts:83-90) — ordering
  preserved, hang can no longer gate "granted"/the card latch. Pinned: never-settling-consume test
  (CitizenshipPurchase.test.ts:154) incl. `invocationCallOrder` ordering assertion.
- **R3 ✅** — event dispatched once, before the consume loop, still guarded by `tokens.length > 0`
  and the once-per-session latch (PaymentsReconciliation.ts:53-74) — no double-fire path exists;
  per-token consume-after-grant ordering unchanged (tokens come from the `/reconcile` response).
  Pinned: first-consume-hangs test (PaymentsReconciliation.test.ts:84).
- **R4 ✅** — attribution note added to worklog.md Phase 1 (owner-ruled: note only).

Re-run by reviewer: 5 affected client suites (CitizenshipPurchase, PaymentsReconciliation,
CitizenshipCard, FlashistFacade, PlayerProfileView) — **81/81 PASS**; `npx tsc --noEmit` clean
(also proves no other consumer of the widened `PlayerProfileView` type broke). Coder-reported full
suite 91/740 PASS accepted on top of that.

No new residuals recorded — all four findings were fixed, none accepted as residual.
Reminder unchanged: this close-out covers the mock/local scope only; the task stays open for 0065 +
the live tail.

## Coder response

*(Round 1 processed 2026-08-24. Owner dispositions relayed via AskUserQuestion through the lead
session: R1 fix now; R2+R3 fix now as one shared change; R4 worklog note only. Fixes applied under
that approval; ready for reviewer re-verification.)*

| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R1 | CORRECT | Defect | `PlayerProfileView` gains `isAuthoritative` (true only on a successfully fetched server profile; false on every zero-state fallback — PlayerProfileView.ts:16-29,53-58,86-92); card renders the buy CTA only for an authoritative non-citizen read (CitizenshipCard.ts, render gate `isCitizen \|\| !profile.isAuthoritative`). Severity Medium confirmed (session-long second-charge path, live only post-0065). Test-pinned: new card test "hidden when the profile read is NOT authoritative (zero-state), even with the product present"; PlayerProfileView.test.ts assertions now pin the flag on every path (zero-states false, 200-fetch true). | ✅ done |
| R2 | CORRECT | Defect (robustness; shared root cause with R3) | `runCitizenshipPurchase` no longer awaits `consumePurchase` — fire-and-forget with swallowed rejection (CitizenshipPurchase.ts:80-92), so a hung SDK consume cannot freeze the flow or hold the card latch after the server committed the grant. Consume-after-grant ordering preserved (call still issued only after the confirmed `/complete`, after the Completed event). Test-pinned: "a HUNG consume never blocks the granted result" (never-settling promise → resolves "granted"; ordering asserted via invocationCallOrder). | ✅ done |
| R3 | CORRECT | Defect (shared root cause with R2) | `PURCHASES_RECONCILED_EVENT` now dispatches BEFORE the consume loop (PaymentsReconciliation.ts:59-74) — grants are committed the moment `/reconcile` responds, so the card-refresh signal no longer waits on any SDK consume settling. Consume-after-grant ordering preserved (each consume still starts only after the server listed its token as processed). Test-pinned: "still fires the event when a consume HANGS" (first consume never settles → event fired once). | ✅ done |
| R4 | CORRECT | Neither (process/attribution) | Verified: `git log -S PURCHASE_STARTED_CITIZENSHIP` → introduced by 7b58655 itself (0017-labelled commit), whose stat also carries 0018's `plan.md` — the driver's `add -A` sweep, not a worklog fabrication (the keys were new relative to the tree state the worklog described). Owner-ruled: worklog note only, no history rewrite. Attribution note added to worklog.md (Phase 1). | ✅ done |

## Accepted residuals (shared, do-not-re-litigate)

- mock-first scope split — What: no real Yandex anywhere in 0018; real catalog/purchase/signed-payload verification is 0065 · Why (structural): owner-ruled 2026-08-23, don't block on external turnaround · Re-raise only if: 0018 code turns out to require real-Yandex behavior to be correct at all
- no dev-browser mock harness — What: client verification is jsdom-level; no `window.YaGames` stub · Why (structural): owner-ruled at plan gate 2026-08-24; 0019 precedent; 0065 repeats the flow for real · Re-raise only if: a defect is found that only a browser click-through could have caught and 0065 won't
- generic error on deliberate cancel — What: player closing the Yandex frame sees `citizenship_paid.purchase_error` like any failure · Why (structural): owner-ruled at plan gate 2026-08-24; SDK doesn't distinguish cancel from failure · Re-raise only if: the SDK gains a distinguishable cancel signal
- CITIZENSHIP_CARD_ENABLED stays false — What: flag not flipped in this task; guard test pins it · Why (structural): flip is the 0065/0017 live tail (task 0054 gate) · Re-raise only if: the flip lands without its gating task
- inbox no-op seam — What: `afterPaidPurchaseGranted` stays a no-op; lang keys parked · Why (structural): inbox is task 0012; owner-approved seam shape (0019 plan gate 2026-08-14) · Re-raise only if: 0012 lands without wiring the seam
- UI:Tap:PurchaseCitizenship name — What: supersedes 0021's `UI:Tap:CitizenshipBuy` · Why (structural): 3 sources vs 1; reference doc authoritative; producer fixes 0021's brief separately · Re-raise only if: 0021's brief is corrected the other way
- Abandoned-after-capture funnel semantics — What: a real payment whose `/complete` failed logs `Purchase:Abandoned:Citizenship` even though reconciliation later lands the grant · Why (structural): 0021 §5 as written; no client-side signal distinguishes it · Re-raise only if: 0021's spec changes the definition
- ms-scale stale-UI second purchase — What: a player granted milliseconds ago can still tap Buy before the UI catches up; grant idempotent, charge real · Why (structural): unavoidable without a pre-purchase profile round-trip; same class as 0019's any-state-intent reconcile residual · Re-raise only if: a pre-purchase server check is added anyway. NOTE: this residual covers the ms-scale race only — it does NOT cover R1 (session-long CTA off a degraded profile read) or R3 (session-long CTA after a blocked reconcile signal).
