# Review — 0012-personal-inbox

Task: ai-agents/tasks/backlog/0012-personal-inbox/brief.md
File(s) under review: working tree vs HEAD, 0012 change surface only — new: migrations/003_player_messages.sql, src/core/profile/InboxContract.ts, src/profile-server/InboxRepository.ts, src/client/Inbox.ts, tests/core/profile/InboxContract.test.ts, tests/profile-server/Inbox{Routes,Hooks,Repository}.test.ts, tests/client/Inbox.test.ts, tests/integration/InboxRepository.it.test.ts; modified: src/profile-server/{PlayerProfileRepository,PaymentsRepository,Routes,Server}.ts, src/client/NewsModal.ts, src/client/components/NewsButton.ts, src/client/flashist/FlashistFacade.ts, resources/lang/{en,ru}.json, ai-agents/knowledge-base/{analytics-event-reference,architecture}.md, tests/integration/Routes.it.test.ts
Status: closed-out

> **Round 2 — close-out confirmed by reviewer (2026-08-26).** Every R1–R4 fix verified against the
> code, not the coder's description:
> - **R1** `src/client/Inbox.ts:67-70, :100-117, :124-140, :226-231, :261` — `markInboxRead` awaits
>   any in-flight refresh before PATCHing; a successful PATCH bumps `generation`; `refreshInbox`
>   records the generation it started at and, if a mark-read landed meanwhile, merges through
>   `keepLocalReadState` (local `readAt` kept where the stale GET still says unread; read state is
>   monotonic). A failed PATCH does not bump, so the snapshot applies as-is. Tests
>   `tests/client/Inbox.test.ts:235-328` pin both orderings: test 1 asserts the PATCH is not issued
>   until the GET resolves; test 2 would fail without the merge (unconditional `cachedState = state`
>   yields `unreadCount 2`, asserted `0`). The `flush()` (`:248`) only drains the awaited SDK/config
>   lookups before counting fetch calls — test-only, no product change. Note (not a defect): with
>   mark-all-on-open, a message that lands during the open-refresh is now marked read and shown
>   without the "New" marker on its first view — consistent with the server, brief-conformant.
> - **R2** `src/core/profile/InboxContract.ts:122-141` refine is XOR (template ⇒ no title/body;
>   literal ⇒ both + no `templateParams`); `migrations/003_player_messages.sql:29-36` CHECK is the
>   same XOR; `psql` on `gc_it` shows the XOR constraint as applied. Tests: contract XOR cases, route
>   400, it-test 23514 on template+literal.
> - **R3** `InboxContract.ts:85-93` wire `templateKey` is `z.string().min(1).max(64).nullable()`;
>   `isKnownInboxTemplateKey` (`:34-40`); `Inbox.ts:196-204` filters an unknown-key message only;
>   `renderInboxMessage` (`:284-301`) falls back to literal; `InboxRepository.rowToMessage` cast
>   widened (`:130`); send boundary keeps the strict enum (`:125`). Test: `Inbox.test.ts:216-230`
>   list survives, no `Inbox:LoadFailed`.
> - **R4** `InboxContract.ts:49-67` per-key required-params map + `missingInboxTemplateParams`
>   (empty string = missing); second refine (`:142-148`) ⇒ clean 400 (route test `:221`); client
>   defaults required params to `""` (`Inbox.ts:289-293`) so IntlMessageFormat cannot throw.
> - **R6** dead `width: 100%` gone (`NewsModal.ts` diff shows only `calc(100% - 2rem)`).
> - **R5** residual recorded by the coder under D4 (fire-and-forget seams have no settle signal);
>   reviewer agrees it is redundant with the deterministic `InboxHooks.test.ts` cases. Owner may
>   strike it; does not block close-out.
>
> Reviewer re-runs, round 2: `npx tsc --noEmit` exit 0 · `npm run lint` exit 0 · `npm test` 96
> suites / **823** tests PASS · `RUN_DB_TESTS=1 npx jest --runInBand` vs `gc_it` 4 suites / 37 tests
> PASS. Scope: the 0012 code surface is the same 10 modified + 10 new files (717 insertions / 61
> deletions vs 718 in round 1 — the one CSS line); other dirty paths (0057 move, `backlog.md`,
> sprint plan, ADR-109, 0192/0193) belong to other units of this run and were not reviewed. No new
> findings; nothing re-litigated. **Deferred Live Tail (0062) remains the gate on closing the task.**

> **Round 1 coverage: FULL — both reviewers ran** (own pass + Codex adversarial via `codex exec`,
> exit 0, 5 findings). Reviewer re-runs this round: `npm test` 96 suites / 812 tests PASS;
> `npm run lint` exit 0; `RUN_DB_TESTS=1 npx jest --runInBand` against `gc_it` (warm DB — second
> application of 001–003, so migration idempotence is exercised) 4 suites / 37 tests PASS.
> Express prefix/query probe run by the reviewer (`app.use("/v1/messages")` does not match
> `/v1/messagesX`; array/object `yandexPlayerId` query values reach Zod as non-strings → 400).
>
> **Owner rulings D1–D6 honoured, not re-litigated** (see suppressed list in the report). The 0017
> residual "Unguarded post-COMMIT hook call (R1)" re-raise condition ("0012 fills either seam →
> harden BOTH together") is **met and discharged**: both seams wrapped at the call site
> (`PlayerProfileRepository.ts:284-288`, `PaymentsRepository.ts:178-182`) AND inside the hook
> (`:303-316`, `:196-209`); sync throw + async rejection pinned by `tests/profile-server/InboxHooks.test.ts`.

## Reviewer findings
| #  | Round | Sev | file:line | Claim |
|----|-------|-----|-----------|-------|
| R1 | 1 | low | src/client/Inbox.ts:97-104, :184-225 | Stale-overwrite race: `NewsModal.open()` fires `refreshInbox()` (GET in flight); selecting Personal fires `markInboxRead()` (PATCH), which neither awaits the in-flight refresh nor tags a generation. If the older GET (snapshot taken before the PATCH) resolves after the PATCH, `.then` unconditionally sets `cachedState` back to unread → bell dot + "New" tags return although the server has them read; self-heals on the next tab select / open (PATCH re-sent, server returns `updated: 0`). Needs a click within one GET round-trip of opening the modal. (Raised by both reviewers; verified CORRECT by code read.) |
| R2 | 1 | low | src/core/profile/InboxContract.ts:86-93, migrations/003_player_messages.sql:29-30 | Content model is documented as EITHER template OR literal, but both the Zod refine and `chk_message_content` are "at least one": a send carrying `templateKey` AND `title`+`body` is accepted and stored; the client (`Inbox.ts:236`) then renders the template and silently drops the literal text. Internal (trusted) endpoint only — no player-facing harm today, a contract-precision gap. 003 has been applied only to the local throwaway DBs, so the CHECK can still be tightened in place (XOR) rather than via a 004. (Codex finding, verified CORRECT.) |
| R3 | 1 | low | src/core/profile/InboxContract.ts:46, src/client/Inbox.ts:157-160 | `templateKey` is parsed as the strict enum; ONE message with a key the client bundle does not know (profile server deployed ahead of the client — separate pipelines — or a player on a cached older bundle) fails the whole-list `safeParse` → `failedState()` → the Personal tab vanishes for that citizen and `Inbox:LoadFailed` fires on every load until the bundle catches up. Not reachable today (all four keys are registered on both sides — D6 pre-registered the name-change ones for exactly this reason); becomes reachable on the first server-side key added after this ships. Lenient parse (`z.string()`, unknown key ⇒ per-message fallback/skip) closes it without touching the wire. |
| R4 | 1 | low | src/core/profile/InboxContract.ts:78-93, src/client/Utils.ts:149-157 | Template sends do not validate the params a template needs (`name`, `reason`). A `name_change_rejected` send with no params passes 400-validation; on the client `IntlMessageFormat.format` throws ("variable name was not provided" — verified with intl-messageformat), `translateText` catches and returns the RAW source, so the player sees `Your requested name ''{name}'' was not approved — {reason}…` with the ICU escapes visible. Reachable only through the internal endpoint / the future name-change caller; a per-key required-params map in `InboxContract.ts` (src/core, testable) would make it a clean 400. |
| R5 | 1 | nit | tests/integration/Routes.it.test.ts:116-123, :149-156 | The "still exactly one message" negative assertions wait a fixed 100 ms after the duplicate / replay call; a slow (but real) duplicate send would pass vacuously. Redundant with the deterministic `InboxHooks.test.ts` not-invoked cases, so a weak check rather than a coverage gap. |
| R6 | 1 | nit | src/client/NewsModal.ts:94, :101 | `.news-tabs` declares `width: 100%` then `width: calc(100% - 2rem)` — the first is dead. |

## Coder response
| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R1 | CORRECT (sev low — self-heals on next tab select/open; needs a click within one GET round-trip) | Defect | Owner-ruled FIX 2026-08-26. `src/client/Inbox.ts`: module `generation` counter bumped by every successful mark-read; `markInboxRead` first `await`s an in-flight refresh (PATCH runs off the freshest state); `refreshInbox` records the generation it started at and, if a mark-read landed meanwhile, merges the snapshot through `keepLocalReadState` (read state is monotonic — local `readAt` kept where the stale GET still says unread). Tests: `tests/client/Inbox.test.ts` "markInboxRead vs an in-flight refresh" (both orderings + the no-mark-read control). | ✅ done |
| R2 | CORRECT (sev low — internal endpoint only; contract-precision gap) | Defect | Owner-ruled FIX 2026-08-26. `InboxContract.ts` refine is now XOR (template ⇒ no title/body; literal ⇒ both title+body and no `templateParams`); `migrations/003_player_messages.sql` `chk_message_content` tightened in place to the same XOR (only throwaway DBs had 003 — `gc_it`/`gc_local` dropped, recreated, re-applied cold; `psql` shows the new CHECK). Tests: `InboxContract.test.ts` XOR cases; `InboxRoutes.test.ts` 400 on template+literal; `InboxRepository.it.test.ts` CHECK rejects template+literal (23514). | ✅ done |
| R3 | CORRECT (sev low today, latent — unreachable until the first server-side key added after ship) | Defect | Owner-ruled FIX 2026-08-26. `InboxMessageSchema.templateKey` is `z.string().min(1).max(64).nullable()` on the wire; `isKnownInboxTemplateKey` guard exported from `InboxContract.ts`; `Inbox.ts` filters an unknown-key message out at load (that message only — list survives, no `Inbox:LoadFailed`); `renderInboxMessage` falls back to literal rendering for anything not known. `InboxRepository.rowToMessage` cast widened to `string \| null`; the send boundary keeps the strict enum. Tests: `InboxContract.test.ts` lenient-wire case; `Inbox.test.ts` "skips ONE message with an unknown key". | ✅ done |
| R4 | CORRECT (sev low — reachable only via the internal endpoint / future name-change caller) | Defect | Owner-ruled FIX 2026-08-26. `InboxContract.ts`: `INBOX_TEMPLATE_REQUIRED_PARAMS` per-key map (`name_change_approved: [name]`, `name_change_rejected: [name, reason]`, citizenship keys: none) + `missingInboxTemplateParams()`; second refine on `SendMessageRequestSchema` ⇒ clean 400 (empty string counts as missing). Belt-and-braces on the client: `renderInboxMessage` defaults any required param to `""` so IntlMessageFormat can never throw and leak the raw ICU source. Tests: `InboxContract.test.ts` required-params cases + every-key-has-an-entry; `InboxRoutes.test.ts` 400 on a missing param; `Inbox.test.ts` render default. | ✅ done |
| R5 | CORRECT (nit, test-only) | Frontier | No code change. A negative assertion on a fire-and-forget send has no settle signal to await; the deterministic not-invoked cases live in `tests/profile-server/InboxHooks.test.ts` (duplicate credit, paid-citizen crossing, below-threshold, `already_processed`). Recorded as an accepted residual below (coder's call under the ADR-019 mechanical-fix discipline, as the lead's relay allowed). | won't fix (frontier) |
| R6 | CORRECT (nit) | Defect | Dead `width: 100%` removed from `.news-tabs` in `src/client/NewsModal.ts` (mechanical, one line). | ✅ done |

> **Round 1 processed 2026-08-26 by the Process-review worker (spawned by `fkit-sprint-ship-loop`, standing approval under the approved plan + the owner's R1–R4 FIX rulings).** Re-runs after the fixes: `npx tsc --noEmit` exit 0 · `npm run lint` exit 0 · `npm test` 96 suites / **823** tests PASS (+11) · `RUN_DB_TESTS=1 npx jest --runInBand` against a **cold** `gc_it` (dropped + recreated so the in-place CHECK edit is what was applied) 4 suites / 37 tests PASS. Nothing re-litigated; no regression against an earlier finding (this is round 1). Worklog decision log carries the per-fix qualification record.

## Accepted residuals (shared, do-not-re-litigate)
- Client-asserted `yandexPlayerId` on the player inbox routes (D1, ADR-103) — What: `GET /v1/messages` / `PATCH /v1/messages/read` trust the client-supplied id through the single `resolvePlayerId` funnel (`Routes.ts:111-115`), citizen gate in SQL, shared 60/min/IP limiter with `/v1/profile` · Why (structural): no signed-player verification exists until the Yandex secret lands (0014); same trust class as `/v1/profile`; owner-ruled 2026-08-26 · Re-raise only if: ADR-103's own conditions (secret issued; paid value reachable via unverified id; observed abuse; a second call site reads the id bypassing `resolvePlayerId`).
- Best-effort post-commit send (D4) — What: a crash/DB blip between COMMIT and the inbox INSERT loses the message (logged only); hooks never throw, call sites also wrapped · Why (structural): a durable grant must never be misreported as a wire error (0017 residual R1); no durable outbox in scope · Re-raise only if: an outbox/queue is introduced for another feature, or lost citizenship messages are observed in production.
- Fail-soft Personal tab (plan risk 4) — What: on a transient fetch failure (network, 5xx, 429, timeout, malformed body) a citizen sees NO Personal tab until the next bell open / reconcile / reload; `Inbox:LoadFailed` fires once per failed load · Why (structural): no partial or misleading tab; owner-approved plan · Re-raise only if: `Inbox:LoadFailed` volume in analytics shows the shared limiter or the API is failing citizens at a material rate.
- Inbox gated behind `CITIZENSHIP_CARD_ENABLED` (D5) — What: the fetch never runs and the tab never renders while the flag is `false` (it is `false` at HEAD and in this diff) · Why (structural): one consistent unlaunched surface · Re-raise only if: the flag is flipped without the Deferred Live Tail having run.
- Weak negative waits in the HTTP inbox it-tests (R5, test-only) — What: `tests/integration/Routes.it.test.ts` asserts "still exactly one message" after a fixed 100 ms following the duplicate credit / replayed grant · Why (structural): the seams are fire-and-forget by owner ruling D4, so a non-send has no observable settle point to await; making the wait longer only slows the suite without proving the negative. The deterministic proof that the hook is NOT invoked on `duplicate`, paid-crossing, below-threshold and `already_processed` is `tests/profile-server/InboxHooks.test.ts` (mock pool, call-count assertions) · Re-raise only if: the seams gain an awaitable outcome (e.g. an outbox — see the D4 residual), or a real duplicate send is ever observed.
