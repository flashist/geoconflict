# Analytics: `Session:PlatformDegraded:{Cause}` — count degraded boots by cause, and which follow a match exit

## ID
0328

> ℹ️ **ID allocation, checked 2026-09-28 before filing.** Highest ID on all three boards (folder names and
> `## ID` fields agree): `0327`. `0328`–`0331` allocated in dependency order to `0318`'s briefs B1–B4.

## Sprint
Sprint 6

## Priority
41

> **41 is the append rank** — the bottom of the [Sprint 6 board](../../../sprints/plan-sprint-6.md), appended
> after `0326`, never inserted (ADR-035). **Placement OWNER-RULED 2026-09-28:** *"End of Sprint 6
> (Recommended)"* (see *Context*). ⚠️ The owner ruled the placement, not a merit rank. **On merit this could sit
> directly above `0326`**, because it depends on nothing and the report wants it shipped first or with the fixes
> so their effect can be measured; the owner's ruled order (`0326` first, then B1–B4) is kept.

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder

## Context

**Filed 2026-09-28 by a spawned `fkit-producer` with no owner channel (ADR-021), on OWNER RULINGS on `0318`
given live via `AskUserQuestion` in the `fkit lead` session and relayed by `fkit-lead` (ADR-021/037).** ⛔ Not
producer precedent.
- **D-2** (fix package), verbatim: **"B1+B2+B3, B4 if confirmed (Recommended)"** — option text: *"Measure,
  re-check late, retry the download, and fix the match-exit address if the check confirms it."* This task is **B1**.
- **Placement**, verbatim: **"End of Sprint 6 (Recommended)"** — option text: *"Like the other follow-ups today;
  the loop reaches them after the tasks already queued."*
- **Owner fact:** `citizenship_ui` is served to **100%** of Yandex players — verbatim *"Yes, 100%"*, option text
  *"Existing data gives a clean estimate."* So the existing-data proxy **M6** below (page loads minus page loads
  with flags) is a **clean** measure of "card hidden for lack of flags", not an approximation.
- **D-3**, verbatim: **"Don't remember"** (whether DevTools "Disable cache" was on in the 2026-09-26 session) —
  option text: *"Rely on the console check and the new event instead."* This event is that "new event".

**Source:** [`0318` findings report](../../../knowledge-base/reports/2026-09-28-0318-citizenship-card-vanishes.md)
§3 (Measurement) and §6 row B1.

**The problem.** The citizenship card hides itself when the Yandex flags are missing at boot (`0291`,
fail-closed, correct). Today's events **cannot** say how often that happens, why, or whether it follows a match:
- A failed SDK loader download produces only `Player:YandexUnknown` (`FlashistFacade.ts:660-666`) — identical to
  a slow-but-healthy `init()` (the 1 s window, `FlashistFacade.ts:629-636`, `:651-659`), so `YandexUnknown` is
  only an upper bound (report §3.1).
- Flags failing with a healthy SDK (`FlashistFacade.ts:919-950`) hides the card but `isYandexDegraded()` stays
  false — so any "degraded" count undercounts card loss (report §2.2).
- Nothing marks a boot as "follows a match exit". `Session:MatchesPlayed` fires on any boot that finds a pending
  entry, including next-day loads (report §3.1).

## What to build

1. **New event `Session:PlatformDegraded:{Cause}`**, enum key `SESSION_PLATFORM_DEGRADED` in
   `flashistConstants.analyticEvents` (`FlashistFacade.ts`). Three PascalCase segments per
   `analytics-event-reference.md` conventions. Never write the string inline.
   - **When:** at most **once per page load**, at gate time (when the platform-init gate resolves), and only when
     the card-relevant platform state is missing.
   - **Cause** — first match wins, in this order:
     - `ScriptFailed` — the SDK loader script's `onerror` ran. Needs one flag set in the template's `onerror`
       (`src/client/yandex-games_iframe.html:24-26`); keep the logic in TS, the template only records "failed".
     - `InitFailed` — `YaGames.init()` rejected (`FlashistFacade.ts:867-872`).
     - `InitTimeout` — the 5 s deadline won before `init()` settled (`FlashistFacade.ts:638-644`).
     - `NoPlayer` — SDK present, no player object.
     - `NoFlags` — SDK present, flags missing (covers report trigger D).
   - **Value:** `1` when this boot follows a match exit, `0` otherwise. So count = degraded boots and
     sum = degraded boots after a match.
2. **After-match marker.** A `sessionStorage` key written right before the match-exit navigation in
   `FlashistFacade.changeHref` (`FlashistFacade.ts:785-788`) and consumed (read + removed) at boot.
   `sessionStorage` survives same-tab navigation. Wrap **every** access in try/catch, as `Bootstrap.ts:61-65`
   does; a storage failure must never break boot or the navigation — it only reads as value `0`.
   ⚠️ `reloadApp()` (`FlashistFacade.ts:790-798`, used by `0303`'s restart) is **not** a match exit and must not
   write the marker.
3. **Companion event `Session:PlatformRecovered`** (enum key `SESSION_PLATFORM_RECOVERED`) — fired when a
   degraded boot's SDK arrives late, from the late-recovery branch (`FlashistFacade.ts:824-866`), only when the
   degraded event already fired on this page. It sizes how much `0329` can save. The report marks it
   **optional**; the coder may propose dropping it at the plan gate, and the owner decides.
4. **Docs.** Add both events to `ai-agents/knowledge-base/analytics-event-reference.md` (enum key, string, when
   it fires, value meaning, the cause list and order). English only — no UI text, so no `en.json`/`ru.json` change.
   While there, fix the drift the report found (§3.1): the reference says `Session:PlatformInitTimeout` fires
   *"at most once per stage"* (`:30`); the code latches it **once per boot** (`FlashistFacade.ts:619-626`).
5. **Tests** in the nearest existing facade/bootstrap tests: each cause fires exactly once with the right name;
   first-match order holds when several apply; value `1` only with the marker, marker consumed; no event on a
   healthy boot; storage throwing → still boots, value `0`.

**Out of scope:** any change to what the card shows (`0329`), any retry (`0330`), any change to the match-exit
URL (`0331`).

## Verification steps

1. Unit tests above pass; they fail (event missing) on today's code.
2. A local `npm run build-prod` served from `static/` with the loader blocked in DevTools (report §5, *Trigger A*)
   logs `Session:PlatformDegraded:ScriptFailed` once, value `0` on first load and `1` after a match exit.
   ⚠️ `npm run dev` cannot show this (`GAME_ENV === "dev"` forces flags on, `FlashistFacade.ts:980-982`).
3. `analytics-event-reference.md` has both rows and the corrected `PlatformInitTimeout` wording.
4. `npm run lint` clean; full `npm test` (known `supertest` flake → follow the CLAUDE.md procedure, say you re-ran).
5. **Owner, after release (informational, not a gate):** pull a **baseline before release** and again a week after.
   GameAnalytics, last 7 days, custom dimension 02 = `yandex` (report §3.2):
   - **M1** `Session:Start` count (page loads) · **M2** `Session:PlatformInitTimeout` · **M3** `Player:YandexUnknown`
     · **M4** error events containing `yandexSdkInit __ error` (split `load sdk file error` / `url sdk not valid` /
     other) · **M5** error events containing `initPlayer __ error` and `loadExperimentFlags __ error` (Debug)
     · **M6** sum of `Experiment:<citizenship_ui flag>:<any value>` — **M1 − M6 = page loads with no flags ≈ card
     hidden** (clean, because the flag is at 100%) · **M7** `Citizenship:Seen`.
   - After release, add: `Session:PlatformDegraded:*` count per cause and value sum (after-match share).
   - ⚠️ **Report numbers only.** M4/M5 are lower bounds (error events may be capped per session — unverified).

## Notes

- **Depends on: nothing.**
- **Blocks:** nothing hard. `0330` recommends this first so the retry's effect is measurable.
- **Related:** `0318` (the investigation), `0329`, `0330`, `0331` (the rest of the package), `0049`, `0291`.
- **Privacy:** no player ids, session ids, query values, hosts or tokens in any artifact, event value or log.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
