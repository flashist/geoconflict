# Investigate: the citizenship card (and buy button) vanishes after a match on a shaky connection

## ID
0318

## Sprint
Sprint 6

## Priority
13

✅ **13 — OWNER-RULED 2026-09-26** (third re-rank: R1 *"Keep 7 (Recommended)"*, R2 *"Move as proposed (Recommended)"*, R3 *"A: lobbies stay 2nd (Recommended)"* — given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer`, ADR-021; ADR-037 §3). Directly below `0303`. See the *RE-RANK 2026-09-26, THIRD* addendum on the Sprint 6 board. *Earlier value, kept:* ~~33~~ (append rank).

~~⚠️ **33 is append rank, NOT a merit ranking — flagged for owner confirmation.**~~ ✅ Answered by that ruling. **On merit this belongs
directly below `0303`**, because it is the same family — the citizenship/purchase surfaces showing the wrong
state — and a hidden buy button costs sales for every affected session; how many sessions is exactly what this
task measures, so the merit case may move either way once the number is in.

## Status
🔲 Backlog

## Owner
fkit-architect

## Context

**Filed 2026-09-26 by a spawned `fkit-producer` with no owner channel (ADR-021), on OWNER RULINGS given live
in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead`:** Q *"Which of today's findings
should get task briefs?"* → includes **"Card lost after match"**; Q *"Where should the chosen briefs go?"* →
**"Sprint 6, bottom (Recommended)"**. ⚠️ The owner did not rule the approach or the rank. ⛔ Not producer
precedent.

**What happened (prod `0.0.154`, owner's own session, 2026-09-26):**
- 18:21 MSK, after winning a match and returning to the menu, the browser console showed the Yandex SDK
  script request failing with `net::ERR_SOCKET_NOT_CONNECTED`, then
  `FlashistFacade | Main | getLanguageCode __ ERROR! No yandexGamesSDK: undefined`, and a
  `Player:YandexUnknown` analytics event → **degraded boot** → the citizenship card and its buy button were
  **hidden** by the fail-closed gate (`0291`, working as designed).
- 18:00 MSK, the card was also missing on an ordinary load. The owner attributes both to flaky internet.
- Other players' profile reads stayed healthy at the same time (76 `GET /v1/profile` 200s in 10 minutes), so
  the profile server was not the cause.

**Why a match makes it worse.** Leaving a match (`WinModal.ts`, `GameRightSidebar.ts`, `Main.ts`,
`SettingsModal.ts`, `TutorialLayer.ts`) calls `FlashistFacade.changeHref(rootPathname)` — a **full page
reload** (the upstream pattern). Every return to the menu re-downloads the Yandex SDK and re-runs platform init
(flags, profile, login). So each match is one more chance to hit a degraded boot.

**What the code does on a failed SDK script** (read 2026-09-26, `dev`): `yandex-games_iframe.html` loads
`sdk.js` with `async`; both `onload` and `onerror` resolve the same promise. On `onerror` there is no `YaGames`
global, init returns at once, and the session is degraded for its whole life. The late-recovery path in
`FlashistFacade` only helps when the SDK **arrives late** — a script that **failed** is never fetched again.

### 🚩 Conflicts with locked decisions — surface, do not plan around

- **`0049` (degraded-mode UX, done) locked two decisions:** *"no active SDK retry (a failed init has low odds of
  succeeding on re-attempt)"* and *"late-recovery UI refresh deferred … revisit if `Session:PlatformInitTimeout`
  volume proves non-trivial"*. Option (i) below reverses the first; the measurement is exactly the trigger the
  second named. ⚠️ Note the first was reasoned about a failed **init**; a failed **network fetch** of the script
  is a different case — the investigation should say whether the reasoning still holds for it. **Reversing it is
  the owner's call.**
- **`0291` (fail-closed card, done, owner ruling 2026-09-21):** the card must stay hidden when the SDK is
  degraded. Nothing here may re-open it fail-open.
- **Bootstrap's 5 s shared platform-init deadline** (`PLATFORM_INIT_DEADLINE_MS`) is a locked design
  (`app-bootstrap` task, wiki `systems/flashist-init`). Any retry must fit inside it or run after it as recovery.
- **Option (ii) is an upstream divergence** from OpenFront's reload-to-menu pattern — it must be marked
  `// Flashist Adaptation` and weighed as ongoing merge cost.

## What to build (the investigation)

1. **Measure first.** How often do Yandex sessions boot degraded? Split, if the data allows: SDK script failed
   to load · `YaGames.init()` failed · deadline hit (`Session:PlatformInitTimeout`) · player object missing.
   `Player:YandexUnknown` is only a proxy — it also fires on timeouts. If the current events cannot separate
   "script failed" from "timed out", say so and propose the smallest new analytics event (name per
   `analytics-event-reference.md` conventions). Also: what share of degraded boots follow a return from a match?
   ⚠️ The analytics dashboard may need the owner to pull numbers — say exactly what to pull.
2. **Weigh the options** (use `/fkit-evaluate-approach`), at least:
   (i) **retry the SDK script load** (and/or `YaGames.init()`) with a short backoff inside the 5 s deadline, and
   keep retrying after the deadline as a recovery that re-shows the card when it succeeds;
   (ii) **return to the menu without a full page reload** (bigger; upstream divergence; also relevant to
   `0303`, which asks whether a purchase should trigger a restart);
   (iii) a **visible "couldn't load — retry" state** instead of silently hiding the card (still fail-closed: no
   buy button until the SDK is real). ⚠️ `0049` once showed a *"Couldn't connect — try again later"* subtitle;
   `0291` hid the whole card — say how (iii) relates to both.
   For each: sessions saved (from step 1), cost, risk, which locked decision it touches.
3. **Recommend** one or a combination, and the implementation briefs it splits into, with dependencies. The
   producer files them after the owner rules.
4. Save findings to `ai-agents/knowledge-base/reports/` (never the wiki). No code.

## Verification steps

1. A findings report exists with a measured degraded-boot rate (or an explicit statement of why it cannot be
   measured yet, plus the event that would make it measurable).
2. Each option is costed and tied to the locked decision it touches (`0049`, `0291`, the 5 s deadline, upstream
   divergence).
3. The report states whether retrying a **failed script fetch** is expected to succeed on a flaky connection,
   with evidence or a clear "unknown".
4. The owner has ruled on the approach — including any reversal of `0049`'s "no SDK retry" — recorded verbatim
   before any implementation brief is filed.

## Notes

- **Depends on:** nothing
- **Blocks:** the implementation briefs this investigation will propose.
- **Related:** [`0291`](../../done/0291-make-the-citizenship-card-fail-closed-when-the-yandex-sdk-is-degraded/brief.md)
  (fail-closed gate — stays) · [`0303`](../0303-the-whole-game-reflects-a-purchase-without-a-reload/brief.md)
  (reload vs live update after purchase — same reload question from the other side) ·
  [`0049`](../../done/0049-degraded-mode-full-ux-treatment/brief.md) (degraded-mode UX — locked "no SDK retry") · `src/client/Bootstrap.ts`, `FlashistFacade` platform init,
  `src/client/yandex-games_iframe.html` (the SDK script tag).
- **Privacy/secrets:** no player ids or session identifiers in the report.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.

### Open questions for the owner
1. `0049` locked *"no active SDK retry"*. If the numbers show degraded boots are common, are you open to
   reversing it for a **failed script download** (not a failed init)? The investigation will bring the numbers
   either way.
