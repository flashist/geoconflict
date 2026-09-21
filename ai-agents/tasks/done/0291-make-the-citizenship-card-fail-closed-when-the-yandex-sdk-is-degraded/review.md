# Review — 0291

Task: `ai-agents/tasks/done/0291-make-the-citizenship-card-fail-closed-when-the-yandex-sdk-is-degraded/brief.md`
File(s) under review: `src/client/CitizenshipCard.ts`, `src/client/flashist/FlashistFacade.ts`, `tests/client/CitizenshipCard.test.ts` (working tree; the ~45 other modified files in the tree are other tasks and were excluded)
Status: closed-out

Round 1 — reviewers run: **fkit-reviewer (Claude) + Codex adversarial pass** (`codex exec --sandbox read-only`, exit 0). **Coverage: FULL — both reviewers ran, neither degraded.**

Verdict (round 1, superseded): **⚠️ Changes requested — 1 defect (low, non-blocking, comment-only).** The behaviour change itself verified correct and complete.

**Close-out verdict (2026-09-21): ✅ Approved — closed-out.** R1 fixed and the new wording re-verified true against source; all open questions ruled by the owner; coverage was FULL in round 1; `npm test` 138 suites / 1870 tests passing (re-run by `fkit-lead` after the fix, independently of the coder). One residual carried: **no live/browser verification** — see *Accepted residuals*.

## Reviewer findings

| #  | Round | Sev | file:line | Claim | Disposition |
|----|-------|-----|-----------|-------|-------------|
| R1 | 1 | low | `tests/client/CitizenshipCard.test.ts:208-211` | The rewritten test's title and comment claim degraded mode means "the flag cannot be read". False as a general claim: `isYandexDegraded()` is `yaGamesAvailable && !yandexSdkPlayerObject` (`src/client/flashist/FlashistFacade.ts:1166`), so it is also true when the SDK **is** present and only `getPlayer()` failed/timed out — in that sub-case `getFlags()` runs normally and the flag is fully readable. The assertions are correct (the mock forces `isCitizenshipUiEnabled → false` explicitly); only the stated reason is wrong. Raised independently by **both** reviewers. Documentation defect, no behavioural impact. | **Fixed** (owner ruled FIX, live `AskUserQuestion` 2026-09-21, relayed by `fkit-lead` — ⛔ **not precedent**). Wording re-verified true by the reviewer at close-out; see below. |

### Close-out verification of the R1 fix (2026-09-21)
Re-read the new title and comment (`tests/client/CitizenshipCard.test.ts:208-215`) against source. **Every claim in the new wording is true:**
- The predicate quoted matches `FlashistFacade.ts:1166-1171` exactly.
- Shape 1 (SDK never loaded ⇒ flag genuinely unreadable): `loadExperimentFlags()` returns early without memoising when there is no SDK (`FlashistFacade.ts:833-838`), so `yandexExperimentFlags` stays absent and `checkExperimentFlag()` resolves **false**. ✅
- Shape 2 (SDK loaded, `getPlayer()` failed ⇒ flag readable, so a false flag is a real switch-off): `getFlags()` is called on `this.yandexGamesSDK` (`FlashistFacade.ts:845-861`), independent of `yandexSdkPlayerObject`. ✅
- "0291 withdrew that — degraded mode fails CLOSED either way": matches the assertions below it and the gate in `CitizenshipCard.ts:95,101-109,227-230`. ✅

Scope confirmed unchanged by the round: `CitizenshipCard.ts` `+3/-9`, `FlashistFacade.ts` `+2/-2` (doc comment only); only the test file grew. The gate is still the single flag read.

### Verification notes behind R1
The false premise was inherited from the 4-line comment this change deleted (`CitizenshipCard.ts`, old `:101-104`) — that comment was the *original* justification for the fail-open, and it over-generalised from the SDK-init-failure sub-case to all of degraded mode. Worth correcting rather than carrying forward, because it is the same claim that made the fail-open look necessary in the first place.

## Coder response

Round 1 processed 2026-09-21 by `fkit-coder` (spawned by `fkit-sprint-ship-loop`, under the driver's declared-approval marker).

| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R1 | **CORRECT** | Defect (documentation) | Rewrote the test's title and comment so both degraded shapes are stated truthfully. **Assertions untouched, no behaviour change.** | **Fixed** |

### Verification behind the R1 verdict — checked against the source, not taken on the reviewer's word

`src/client/flashist/FlashistFacade.ts:1166-1171`:
```ts
public isYandexDegraded(): boolean {
  return this.yaGamesAvailable && !this.yandexSdkPlayerObject;
}
```
Two distinct shapes satisfy it, and the finding turns on the second:
1. **SDK never loaded** — `getFlags()` is unreachable, so the flag genuinely cannot be read and `fetchExperimentFlags()` resolves it false.
2. **SDK loaded, `getPlayer()` failed** — `yandexSdkPlayerObject` stays unset while the SDK object is live, so `getFlags()` works and the flag **is** readable.

The old title/comment asserted shape 1 for all of degraded mode. **Confirmed false.** Owner ruling relayed by `fkit-lead` (live `AskUserQuestion`, 2026-09-21): **fix the wording**, not accept it — the same false premise is what made the original fail-open look necessary, and an owner-run devtools probe on a signed-in production session (2026-09-21) returned exactly shape 2 (`yaGamesAvailable: true`, `isYandexDegraded: true`), so it is live behaviour, not a theoretical edge.

**New wording** (`tests/client/CitizenshipCard.test.ts`, the `citizenship_ui experiment flag` describe — re-derive by content):
- Title: `stays hidden in degraded mode when the flag reads false (task 0291)` — drops the false "cannot be read" claim; true of both shapes.
- Comment: names the predicate, enumerates both shapes (unreadable vs readable-and-genuinely-off), and states that the gate now fails CLOSED either way.

**Scope held as ruled:** title + comment only. The four assertions, the two mocks, and every other test are byte-unchanged. Nothing in `src/` was touched this round.

### Evidence
- `npx jest tests/client/CitizenshipCard.test.ts tests/client/FlashistFacade.test.ts` → **2 suites passed, 81/81 tests passed** (0.877 s). Identical to the driver's pre-edit 81/81 — a comment change moved nothing, as required.
- `npx prettier --check tests/client/CitizenshipCard.test.ts` → clean (the new comment block is 6 lines and within the print width).

### Not re-opened, as fenced
The fail-closed tradeoff, ruling D2 (one test not two), and `0238/brief.md:497`'s stale fail-open line — all owner-ruled; untouched and not re-filed. The reviewer's *Observations* (async-gate layout window, open-coded layer 1 + 2) carry no recommended action and none was taken.

## Accepted residuals (shared, do-not-re-litigate)

- **Degraded-SDK players lose the card instead of an honest "couldn't connect" state** — What: the card fails CLOSED when the `citizenship_ui` flag reads false, degraded or not. · Why (structural): an unreadable kill switch must fail closed; the owner ruled this 2026-09-21 and explicitly withdrew the 2026-09-10 ruling that accepted the fail-open (it was made while `CITIZENSHIP_CARD_ENABLED` was `false`, so the carve-out was inert). · Re-raise only if: the owner reverses the fail-closed ruling, or evidence shows a material player-facing cost beyond the stated one.
- 🚨 **No live/browser verification — do not let this disappear at close-out.** What: nobody has observed the card failing to render in a real degraded **production** session; the whole change is proven by unit tests plus source tracing only. · Why (structural): live verification of the kill switch in a real build is `0238`'s launch check, not this task's scope. · Re-raise only if: `0238`'s launch check is skipped or its result contradicts the unit-level behaviour recorded here.
- **One test, not two, for degraded + flag-off** — What: the previously-fail-open test was rewritten in place into the negative check instead of adding a second test. · Why (structural): owner ruling D2 at the plan gate, taking the planner's own recommendation, under the standing proportionality instruction. · Re-raise only if: the single test is shown not to cover what both would have (checked this round — it does; see Verified clean, item 2).

## Verified clean this round (no finding — recorded so it is not re-derived next round)

1. **No remaining path renders the card with the switch off.** `connectedCallback` early-returns on layer 1 (`CitizenshipCard.ts:95`) before `flashist_waitGameInitComplete()`, so analytics and profile loads are skipped entirely; layer 2 is the only other gate (`:101`) and `isEnabled` is set only on its true branch (`:109`); `render()` returns `nothing` while `isEnabled` is false (`:227-230`). The only surviving `isYandexDegraded()` call in the card is inside `renderGuest()` (`:237`), reached only once the card already renders. External `requestUpdate()` from `LangSelector.ts:245` and the `PURCHASES_RECONCILED_EVENT` listener (`:143-147`, guarded by `isEnabled`) cannot render content past the gate. `maybeReportSeen()` is public but has exactly one caller, inside the enabled branch (`:127`).
2. **Test coverage is a complete 2×2, so D2's collapse loses nothing.** flag-off/degraded-off `:189`; flag-off/degraded-**on** `:208` (the rewritten negative check); flag-on/degraded-on `:251` (card renders, degraded subtitle, no CTA); flag-on/degraded-off `:200`, `:225`.
3. **The negative check is not vacuous.** Asserts `hidden` present *and* empty text *and* no `Citizenship:Seen` *and* no `loadProfile`. If the async gate never resolved inside `appendCard`'s flushes (`:1018-1030`), `hidden` would still be absent and `:218` would fail. Independently corroborated by the coder's red-before/green-after run on the unchanged source, re-verified by `fkit-lead`.
4. **`citizenship_card.guest_subtitle_degraded` is NOT orphaned, and not dev-only.** Still rendered by `renderGuest()` (`CitizenshipCard.ts:277-281`) whenever the gate passes and the session is degraded. That is genuinely reachable in production, not just under the `GAME_ENV === "dev"` flag override: `isYandexDegraded()` is true in the SDK-present / `getPlayer()`-failed case, where `getFlags()` still returns the flag as enabled. Both locale files intact and in sync — `resources/lang/en.json:59`, `resources/lang/ru.json:63`. Nothing to add or remove.
5. **The removed `||` short-circuit does not widen exception exposure.** `isCitizenshipUiEnabled()` cannot reject or hang: `yandexInitPromise` is always resolved (deadline race plus the unconditional `.finally` at `FlashistFacade.ts:527-531`), and `fetchExperimentFlags()` bounds `getFlags()` with its own timeout and swallows every error (`FlashistFacade.ts:844-871`). A no-SDK boot returns early without memoising, so the flag resolves `false` immediately.
6. **The new `FlashistFacade.ts:977-978` comment is true.** Four citizenship surfaces, all fail closed: the card (layer 1 early return + layer 2 await), `CitizenBadge.ts:31` (sync snapshot, defaults `false`), `Inbox.ts:150`, `PaymentsReconciliation.ts:57` (both the combined `isCitizenshipSurfacesEnabled()`). No carve-out survives anywhere — `grep` for `carve`/`0049` across `src` and `tests` returns only this comment and unrelated `WinCheckExecution` text.
7. **The rewritten layer-1 comment (`CitizenshipCard.ts:92-94`) is accurate** — the dev experiment-flag override it claims to beat is real (`FlashistFacade.ts:903-905`, `checkExperimentFlag` returns `true` unconditionally when `GAME_ENV === "dev"`).

## Observations — no action recommended, recorded for context

- **Async-gate layout window.** Between `flashist_waitGameInitComplete()` resolving and the flag read settling, the host carries neither `hidden` nor content (templates ship it as `class="block"` — `src/client/index.html:191`, `src/client/yandex-games_iframe.html:301`), so an empty gap slot can persist for up to the flag-fetch bound on a late-SDK boot. This is **pre-existing** for the normal flag-off path and **inert today** (layer 1 is `false`, so the early return hides the card synchronously). It becomes visible only after the launch flip, and it is inherent to gating on an awaited flag — not introduced here. No change recommended.
- **The card open-codes layer 1 + layer 2 instead of calling `isCitizenshipSurfacesEnabled()`.** Semantically identical now that the carve-out is gone, and justified: layer 1 must gate *before* `flashist_waitGameInitComplete()` so a switched-off session touches no analytics and no profile load, which the combined helper cannot do. Not a defect; no refactor proposed (proportionality).
- **Stale claim outside this task's scope, flagged not edited:** `ai-agents/tasks/backlog/0238-validate-citizenship-ui-kill-switch-in-a-real-build-launch-gate/brief.md:497` still records the card's fail-open carve-out as accepted behaviour. `0238` was fenced off for this task; someone should strike that line. (The plan already noted this under "Not doing".)

## Re-litigates settled decisions (suppressed)

None. Neither reviewer raised the fail-closed tradeoff or the one-test-vs-two question.

## Convergence call

**Act, minimally, then close.** Round 1 produced one low, comment-only defect and zero behavioural findings; the change does exactly what it says and the test matrix is complete. No sign of a review loop. Recommend the coder correct R1's wording (or record it as accepted) and close out — a second review round is not warranted for this diff.

**Closed out 2026-09-21 by `fkit-reviewer` (phase 2, no re-review).** R1 fixed and its wording re-verified true. **No round 2.** Two owner rulings recorded, both relayed live by `fkit-lead` via `AskUserQuestion` on 2026-09-21:

| Question | Ruling | Authority | Scope |
|---|---|---|---|
| R1 — fix the false test wording, or accept it? | **FIX** | Owner, 2026-09-21 (⛔ not precedent) | In scope; done, verified. |
| `0238/brief.md:497`'s stale fail-open acceptance line | **LEAVE IT** for whoever next opens `0238` (owner took the reviewer's own recommendation) | Owner, 2026-09-21 | ⛔ **Out of scope for `0291` — ruled, and NOT a residual of this task.** |

---

## ⚠️ Post-close factual correction — appended 2026-09-21, NOT a review round

**Added by a spawned `fkit-producer` on an OWNER RULING given live via `AskUserQuestion`, relayed by `fkit-lead`: *fix it*.** ⛔ Not producer precedent. ⛔ **Nothing above is rewritten** — no finding, no verdict, no ruling, no accepted residual, and not the `Status: closed-out` header. **This note only corrects a factual premise; the row above stands as the ruling that was actually given.**

**The premise was already false when it was written.** Two places above — the *Observations* entry on `0238/brief.md:497` and the ruling row immediately above — describe the card's fail-open carve-out as *still recorded as accepted* in `0238`'s brief and in need of striking. **It had already been struck**, at the **2026-09-21 re-scope of `0238`**, before the question was put to the owner: the bullet beginning *"Known accepted limitation of the thing being validated"* (`0238/brief.md:496` — ⚠️ verify by content, not line number) carries `~~…~~` plus a `🔴 STRUCK 2026-09-21 — the acceptance is WITHDRAWN by owner ruling` note. **Verified against the file 2026-09-21.**

🔎 **Root cause: `fkit-lead` put a stale question to the owner** — about work a producer had already done earlier that day. The owner answered *"leave it"* in good faith, and that answer propagated into the process-review spawn, this ledger, and `0291`'s close record. ⛔ **The owner did not change their mind, and no agent defied a ruling.** The reviewer's observation was made in good faith from the same stale picture.

📌 **Also corrected, for the record:** `0238/brief.md` **was** edited by this close — **hrefs only, four lines** (`:66`, `:74`, `:487`, `:504`: `../0291-` → `../../done/0291-`), after `fkit-lead` lifted its own `0238` fence and authorised that repair. ⛔ Nothing else in `0238` was touched; its `## Status` is still `🔲 Backlog`. **The full corrected record is in `0291`'s `## Status`.**
