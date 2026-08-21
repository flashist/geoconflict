# Task — Degraded-Mode UX: Give Yandex SDK Timeout/Failure Its Own Player-Facing Treatment

## ID
0049

## Sprint
Sprint 4 — moved in from Sprint backlog 2026-07-02 (Mark). Conceptually follows `s4-citizenship-card-guest-cta-no-sdk.md` (done), which is what first exposed the collapsed-states problem this task resolves properly.

## Priority
**Reclassified 2026-07-02 (Mark): must ship before citizenship (Earned/Paid) is delivered to real players.** A real player who hits degraded mode during the citizenship funnel — logging in specifically to claim earned XP or pay for citizenship — would see a dead CTA at exactly the moment they're being asked to authenticate. That's a materially worse outcome than the same bug in today's plain guest state, so this no longer waits on `Session:PlatformInitTimeout` volume before scheduling. Still worth pulling that number during implementation to size the actual blast radius, but it does not gate whether this ships.
**Must be live before:** Citizenship Core — Earned Citizenship, Citizenship Core — Paid Citizenship.

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder

## Experiments
❌ Excluded — UX/reliability correctness, ships to all players once implemented.

## Scope
`src/client/flashist/FlashistFacade.ts`, `src/client/CitizenshipCard.ts`. No `src/core/` changes.

---

## Context

Surfaced while fixing `s4-citizenship-card-guest-cta-no-sdk.md`: `FlashistFacade` currently exposes only two effective states to the rest of the client — "authorized" and "not authorized" — collapsing three genuinely different situations:

- **(a)** standalone/no Yandex context at all (handled by the sibling Sprint 4 task via `yaGamesAvailable`)
- **(b)** real Yandex guest, logged out, SDK healthy
- **(c)** Yandex context, but `YaGames.init()` timed out or rejected within Bootstrap's 5s platform-init deadline (degraded mode)

Case (c) is architecturally indistinguishable from (b) anywhere in the client today — `yaGamesAvailable` reflects "is this a Yandex-platform session," which stays `true` even when init failed. `isYandexAuthorized()` / `openYandexAuthDialog()` only check the (absent) player/SDK object.

**Player-facing consequence:** a real player whose Yandex SDK degrades sees the exact same "Войти в Яндекс" CTA as a genuinely logged-out guest, and tapping it silently does nothing (`openYandexAuthDialog()` no-ops when `yandexGamesSDK` is unset). There's no retry, no "something went wrong" messaging — nothing distinguishes "you're not logged in" from "we couldn't reach Yandex."

## Locked Decisions (2026-07-02)

> Decided via producer recommendation after Mark didn't respond in-session to the scoping questions — override anytime, nothing here is irreversible.

**Detection is free — no new state needed.** Traced `FlashistFacade.runPlatformInit()` (`FlashistFacade.ts:456-514`): `yandexGamesSDK` is only ever assigned once `YaGames.init()` genuinely succeeds, independently of `yaGamesAvailable` (which just means "we're in a Yandex context," set at construction before init settles). So at card-render time, `yaGamesAvailable === true && !yandexGamesSDK` **is** the degraded-mode signal, using two fields the facade already has. No `sdkStatus` enum, no new analytics-driven state. Expose it via a small computed accessor (e.g. `FlashistFacade.instance.isYandexDegraded()`) rather than having `CitizenshipCard` read both raw fields directly.

**Scope check is done — only `CitizenshipCard` needs this.** The only other caller of `isYandexAuthorized()`/`isYandexLoggedIn()` is `Transport.ts:411`, which uses it solely to decide whether to forward a Yandex player ID during match join — it already no-ops safely in both the real-guest and degraded case (no player-facing state, nothing to fix there).

**UX treatment: distinct message, no retry.** When `isYandexDegraded()` is true, swap the guest-state subtitle to something conveying a connection problem rather than "you're not logged in" — e.g. "Не удалось подключиться — попробуйте позже" / "Couldn't connect — try again later" — and hide the CTA (a tap can't succeed; don't offer it). No active retry of `YaGames.init()`: the SDK already failed or timed out once, a client-side re-init attempt has low odds of succeeding differently, and it's not worth the added engineering for a case expected to be rare.

**Recovery: deferred, not in this pass.** Confirmed late recovery is a real (if narrow) case — the code comment at `FlashistFacade.ts:489-492` states "If the SDK arrives after the deadline, `yandexGamesSDK` is still assigned" — but confirmed **no plumbing exists today** to notify already-rendered UI when that happens (`yandexGamesReadyCallback` only logs and calls `LoadingAPI.ready()`, no `dispatchEvent`/broadcast). Building that notification path is a real scope increase for an already-narrow case (only the subset of degraded sessions where the SDK *later* recovers). Ship without it; a recovered player just needs to reload / start their next match to see the correct state. Revisit if `Session:PlatformInitTimeout` volume turns out to be non-trivial.

## Out of scope

- Re-litigating Bootstrap's core degraded-mode design (bounded deadline, default flags, browser-language fallback, no-ads) — that's already settled.
- The Sprint 4 sibling fix for case (a) (standalone/no-SDK) — already scoped and shipped independently.
- Active SDK retry and late-recovery auto-refresh — see Locked Decisions above.

## What to build

1. Add `FlashistFacade.instance.isYandexDegraded(): boolean` returning `this.yaGamesAvailable && !this.yandexGamesSDK`.
2. In `CitizenshipCard`'s guest-state render, branch on `isYandexDegraded()`: if true, show the connection-problem subtitle and no CTA; otherwise keep today's real-guest CTA behavior unchanged.
3. Localization: add both en/ru keys for the new subtitle under `citizenship_card` in `en.json`/`ru.json` (per project convention, both files in the same change).

## Verification

1. Pull `Session:PlatformInitTimeout` rate from analytics to size real-world impact (informational, not a gate).
2. Simulate degraded mode (stub/delay `YaGames.init()` past the 5s deadline): confirm the card shows the new connection-problem subtitle with no CTA, not the generic guest CTA.
3. Confirm real logged-out guests (case b) are unaffected — CTA still renders and functions as shipped.
4. Confirm standalone/no-SDK (case a, from the sibling task) is unaffected — still shows the plain guest state with no CTA, not the new degraded copy.

## Notes

- Analytics: no new event planned for this pass — the existing `Session:PlatformInitTimeout` already measures incidence. If degraded-state card views need their own funnel signal later, follow `analytics-event-reference.md` conventions.
- If `Session:PlatformInitTimeout` volume turns out to be non-trivial once measured, revisit the deferred recovery-path decision above.
- **Close caveats (2026-08-14, owner rulings via AskUserQuestion in the fkit-lead ship-loop session; recorded in this folder's `plan.md` header):**
  - Implementation accepted as committed at `be0ea1b` + `2b43274` (2026-07-02), including the broader `!yandexSdkPlayerObject` degraded-detection deviating from the locked `!yandexGamesSDK` wording.
  - Live simulation (verification #2): cases **(c)** degraded and **(a)** standalone demonstrated live — evidence in this folder's `worklog.md` and `evidence/degraded-mode-case-c.png`. **Case (b) — healthy-SDK real Yandex guest — was NOT live-verified** (unreachable outside a real Yandex embed); it is covered by unit tests only (verification #3 is therefore unit-test-level, not live).
  - Verification #1 (`Session:PlatformInitTimeout` analytics pull) **deferred post-close** — owner will pull it at their convenience; informational only, never a gate.
  - No fresh review round at close (owner ruling): the review of record is the pre-fkit round series ending in commit `2b43274` (ledger: `ai-agents/reviews/degraded-mode-full-ux-treatment.md`); no in-folder `review.md` exists, deliberately.
