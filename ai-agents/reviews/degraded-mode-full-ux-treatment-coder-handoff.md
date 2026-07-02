# Coder handoff — degraded-mode-full-ux-treatment (round 3 fix)

**This is a spec, not an applied fix.** Produced by `/stateful-review`, a review-only skill — no code has been changed. Whoever picks this up should implement it independently and verify against the acceptance criteria below.

Source review: `ai-agents/reviews/degraded-mode-full-ux-treatment.md` (round 2, finding C2). Task: `ai-agents/tasks/backlog/degraded-mode-full-ux-treatment.md`.

## Context

`FlashistFacade.instance.isYandexDegraded()` (`src/client/flashist/FlashistFacade.ts:843-845`) currently returns `this.yaGamesAvailable && !this.yandexGamesSDK` — true only when `YaGames.init()` itself failed or timed out. `CitizenshipCard.renderGuest()` uses this to decide whether to show the normal login CTA or a "couldn't connect" message with no CTA.

The gap: a session where `YaGames.init()` **succeeds** (so `yandexGamesSDK` is set) but the subsequent boot-time player fetch (`initPlayer()` → `this.yandexGamesSDK.getPlayer()`, `FlashistFacade.ts:861-878`) fails or doesn't resolve before the shared `PLATFORM_INIT_DEADLINE_MS` (5000ms, `FlashistFacade.ts:281`) is **not** caught by `isYandexDegraded()`. `yandexSdkPlayerObject` stays unset, so `isYandexAuthorized()` (`FlashistFacade.ts:888-891`) resolves `false` — indistinguishable from a real logged-out guest. `CitizenshipCard` shows the normal login CTA, and tapping it calls `openYandexAuthDialog()` (`FlashistFacade.ts:893-907`), which has no timeout around its own `getPlayer()` re-fetch — the tap can hang instead of failing cleanly.

**In scope:** `src/client/flashist/FlashistFacade.ts`, `src/client/CitizenshipCard.ts`, their test files. **Out of scope — do not touch:** anything else. No `src/core/` changes (matches the parent task's stated scope).

## Do NOT change (accepted residuals — see the ledger for full rationale)

- **Degraded sessions bypass the `citizenship_ui` experiment gate** (`CitizenshipCard.ts:55-61`, `enabled = isYandexDegraded() || await isCitizenshipUiEnabled()`). This is intentional — the flag is unknowable without a working SDK. Do not gate the fix below behind the experiment flag.
- **No active SDK/player retry, no late-recovery notification path.** The task's Locked Decisions explicitly deferred this ("a recovered player just needs to reload"). The fix below must not add retry logic or a recovery-broadcast mechanism — it only needs to *classify* the state correctly at render time, same as the existing `isYandexDegraded()` does for SDK-init failure.
- **No new analytics event.** `Session:PlatformInitTimeout` already measures incidence; don't add a new event for this narrower case.

## Changes to make

| Severity | Required? | Location | Summary |
|---|---|---|---|
| High | Yes | `FlashistFacade.ts:843-845` | Broaden `isYandexDegraded()` to also cover "SDK present but no player object obtained" |
| Low | Optional (not required to close C2) | `FlashistFacade.ts:893-907` | Consider bounding `openYandexAuthDialog()`'s `getPlayer()` re-fetch with a timeout, as defense-in-depth |
| — | No (explicitly declined by reviewer, non-blocking) | `CitizenshipCard.ts:42-44` | Stale doc comment (Cl1/Cl2) — leave for whoever next touches that comment; not part of this handoff |

### 1. Broaden `isYandexDegraded()` (required)

**Problem:** the formula only checks `!yandexGamesSDK`, missing the case where the SDK object exists but `yandexSdkPlayerObject` was never obtained.

**Honest impact:** confirmed via independent trace (not just Codex's claim) — this is real, but it's **pre-existing behavior**, identical to what `dev` does today; round 1 and round 2 of this task didn't make it worse. It's being fixed now because it's the same class of player-facing failure (dead/hung citizenship CTA) the task exists to close, not because this diff regressed anything.

**Recommended fix:** `yandexSdkPlayerObject` can only ever be assigned via `this.yandexGamesSDK.getPlayer()` calls (three call sites, all requiring `yandexGamesSDK` to already exist: `FlashistFacade.ts:673`, `:869`, `:901`) — so `!yandexSdkPlayerObject` is a strict superset of `!yandexGamesSDK` and already subsumes today's degraded detection. Change:

```ts
// Before
public isYandexDegraded(): boolean {
  return this.yaGamesAvailable && !this.yandexGamesSDK;
}

// After
public isYandexDegraded(): boolean {
  return this.yaGamesAvailable && !this.yandexSdkPlayerObject;
}
```

Update the doc comment above it (`FlashistFacade.ts:836-842`) to describe both covered cases: `YaGames.init()` failure/timeout, and SDK-present-but-player-fetch failure/timeout.

**Verify before landing:** confirm a genuine logged-out guest (SDK succeeds, `getPlayer()` succeeds, returns an object with `isAuthorized() === false`) still has `yandexSdkPlayerObject` set to that (truthy) object — so `isYandexDegraded()` stays `false` for them. This should already hold given `isYandexLoggedIn()` (`FlashistFacade.ts:880-886`) reads `yandexSdkPlayerObject?.isAuthorized()`, implying the SDK returns a real object even for non-authorized players — but confirm against the actual Yandex SDK contract/existing tests rather than assuming.

**Update `tests/client/FlashistFacade.test.ts`:** the current truth-table test only varies `yaGamesAvailable`/`yandexGamesSDK`. Add `yandexSdkPlayerObject` as a third varied field and add at least these cases:
- `yaGamesAvailable=true, yandexGamesSDK={}, yandexSdkPlayerObject=undefined` → `true` (new case this fix closes — SDK present, player fetch never completed)
- `yaGamesAvailable=true, yandexGamesSDK={}, yandexSdkPlayerObject={isAuthorized: () => false}` → `false` (real guest, unchanged)
- Keep existing cases (SDK entirely absent, standalone) passing.

**`CitizenshipCard.test.ts` does not need changes for this fix** — it mocks `isYandexDegraded()` directly as a jest function, decoupled from the underlying formula.

### 2. Timeout on `openYandexAuthDialog()`'s `getPlayer()` re-fetch (optional, not required)

After fix #1 lands, `openYandexAuthDialog()` is only reachable for sessions where `yandexSdkPlayerObject` was already successfully obtained once at boot — so the risk of the CTA hanging is much smaller than before (the pathway is proven to work for this session). Not required to close C2. If you want defense-in-depth anyway, wrap the `getPlayer()` call at `FlashistFacade.ts:901` in a bounded race similar to the pattern already used elsewhere in this file (e.g. `fetchExperimentFlags()`'s `Promise.race` against `PLATFORM_INIT_DEADLINE_MS`, `FlashistFacade.ts:742-747`) — but don't add this speculatively if you're not also going to exercise it with a test.

## Validation + acceptance criteria

1. `npx jest tests/client/FlashistFacade.test.ts tests/client/CitizenshipCard.test.ts` — all pass, including the new/updated truth-table cases.
2. `npm run lint` clean on both changed files.
3. Manual/simulated check (per the parent task's own verification steps): stub `YaGames.init()` to succeed but stub/delay the SDK's `getPlayer()` past `PLATFORM_INIT_DEADLINE_MS` — confirm the citizenship card now shows the degraded subtitle with no CTA, not the normal guest CTA.
4. Confirm unaffected: real logged-out guest (case b) still shows the normal CTA and functions; standalone/no-SDK (case a) still shows the plain guest state; the existing case-(c) SDK-init-failure path is unchanged (still correctly detected, just via the broadened condition).
5. Update the ledger (`ai-agents/reviews/degraded-mode-full-ux-treatment.md`) — add a round-3 decision log entry recording the fix, and close out the "Open / actionable" C2 item once verified.
