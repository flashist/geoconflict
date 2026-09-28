# Retry a failed Yandex SDK loader download (download only — never `init()`)

## ID
0330

## Sprint
Sprint 6

## Priority
43

> **43 is the append rank** — the bottom of the [Sprint 6 board](../../../sprints/plan-sprint-6.md), appended
> after `0329`, never inserted (ADR-035). **Placement OWNER-RULED 2026-09-28:** *"End of Sprint 6
> (Recommended)"*. ⚠️ Not a merit rank. **On merit this belongs directly below `0329`**, because without `0329`
> a download that succeeds after the deadline still leaves the card hidden — which is where it sits.

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder

## Context

**Filed 2026-09-28 by a spawned `fkit-producer` with no owner channel (ADR-021), on OWNER RULINGS on `0318`
given live via `AskUserQuestion` in the `fkit lead` session and relayed by `fkit-lead` (ADR-021/037).** ⛔ Not
producer precedent.

### 🔓 D-1 — the owner narrowed a locked decision (read this first)

- **`0049` locked** *"No active retry of `YaGames.init()`: the SDK already failed or timed out once, a client-side
  re-init attempt has low odds of succeeding differently"* ([`0049` brief](../../done/0049-degraded-mode-full-ux-treatment/brief.md),
  *Locked Decisions*).
- **Owner ruling D-1, 2026-09-28**, verbatim: **"Retry download only (Recommended)"** — option text: *"A couple of
  retries within the 5 s start-up limit, then quiet background retries. Never retry Yandex's start-up call itself.
  ~1 day."*
- **Effect:** `0049`'s "no retry" is **narrowed for a failed script download only**. It **still holds** for
  `init()` — never retry, never re-call `YaGames.init()`. The narrowing is also recorded as a dated note in
  `0049`'s brief.
- **Why the reasoning did not carry over** (report §2.4): `0049` reasoned about a **rejected or timed-out
  `init()`** (mostly deterministic — bad address, wrong frame). A **failed download** is transient: the owner's
  2026-09-26 session loaded the rest of the page on the same boot, and the error was
  `net::ERR_SOCKET_NOT_CONNECTED` (one dead connection, not a dead network). Evidence is circumstantial, **not
  measured** — `0328` measures it.

Also: **D-2**, verbatim **"B1+B2+B3, B4 if confirmed (Recommended)"** — this task is **B3**. **Placement**,
verbatim **"End of Sprint 6 (Recommended)"**. **D-3**, verbatim **"Don't remember"** (DevTools "Disable cache" in
the 2026-09-26 session) — option text *"Rely on the console check and the new event instead."* ⇒ whether the
owner's session overstated what players see stays unknown; `0328`'s `ScriptFailed` count is the answer.

**Source:** [`0318` findings report](../../../knowledge-base/reports/2026-09-28-0318-citizenship-card-vanishes.md)
§2.1, §2.3, §2.4, §4 option (i), §6 row B3.

**What happens today (report §2.1).** The loader tag's `onerror` resolves the **same** ready promise as `onload`
(`src/client/yandex-games_iframe.html:24-26`); `yandexSdkInit` then finds no `YaGames` and returns
(`FlashistFacade.ts:814-817`). Nothing ever fetches the script again, and the late-recovery branch only runs when
`YaGames` exists — so **a failed download never recovers** for the whole page.

**How Yandex's loader behaves (report §2.3, read from the public script 2026-09-28).** It is a small loader that
defines a `window.YaGames` stub and then fetches the real SDK file itself, with **3 immediate retries** of that
inner file. The loader is served with a **30-day** cache. ⚠️ **Trigger C — the inner file failing after those 3
retries — is NOT retryable from our side** without resetting the loader's globals, i.e. reaching into Yandex
internals. Out of scope; `0049`'s reasoning still holds there.

**Precedent in this codebase:** `Bootstrap.ts:26-37` already retries a failed app chunk once after 1 s.

## What to build

1. **Record the failure, retry in TS.** The template's `onerror` only records "failed" (the flag `0328` adds —
   reuse it). The retry logic lives in the facade, unit-testable. Do not grow inline template script.
2. **In-deadline retries.** On a recorded failure, re-insert the loader script with a short backoff (report
   suggests about +0.5 s, then +1.5 s) **inside** the shared 5 s deadline (`PLATFORM_INIT_DEADLINE_MS`,
   `FlashistFacade.ts:422`). The deadline itself does **not** move. A success inside it continues the normal init.
3. **Background retries after the deadline.** If still failed when the deadline wins, keep retrying quietly in the
   background with a capped backoff (report suggests about 5 s / 15 s / 45 s, then stop). A success hands off to
   the **existing late-recovery branch** (`FlashistFacade.ts:824-866`), which with `0329` re-shows the card.
4. **Never run the loader twice.** Retry **only after `onerror`** (nothing executed). Remove the failed tag before
   inserting a new one. Never retry after `onload`, and never re-call `YaGames.init()` — if `init()` rejects or
   hangs, behave exactly as today.
5. **No retry outside the Yandex iframe path** (standalone `index.html` has no loader) and no change to the
   5 s deadline semantics for any other stage.
6. **Tests:** fail → retry → success inside the deadline (normal init, no degraded event); fail ×N → degraded at
   the deadline → background success → late-recovery branch runs; retries stop at the cap; `onload` path never
   retries; `init()` rejection is never retried; exactly one loader script tag executes.

**Out of scope:** retrying `init()` or the inner SDK file (trigger C); the card's reveal logic (`0329`); the
match-exit URL (`0331`); a visible retry button (report option (iii), not proposed).

## Verification steps

1. Unit tests above pass.
2. **Local browser** (report §5, *Trigger A*): `npm run build-prod`, serve `static/`, DevTools → Network → block
   the loader URL named at `yandex-games_iframe.html:24`, load, then unblock within ~1 s → the in-deadline retry
   loads it and the boot is not degraded. Repeat, unblocking after ~10 s → degraded at 5 s, then a background retry
   recovers (with `0329` landed, the card appears). ⚠️ Outside a real Yandex frame the loader does nothing at top
   level, so use the iframe harness and state in the worklog exactly what was and was not observable.
3. Count of loader tags executed is 1 in every scenario (assert in tests; observe in the Network panel).
4. `npm run lint` clean; full `npm test` (known `supertest` flake → CLAUDE.md procedure, say you re-ran).
5. **Owner, after release (informational):** compare `Session:PlatformDegraded:ScriptFailed` (from `0328`) and
   **M3** `Player:YandexUnknown` / **M6** flags-seen vs **M1** `Session:Start` before and after (report §3.2;
   GameAnalytics, 7 days, dimension 02 = `yandex`). Optional live probe **P1b** on a post-match load, in the game
   frame's console:
   `performance.getEntriesByType("resource").filter(e => e.name.includes("sdk")).map(e => ({ path: new URL(e.name).pathname, transferSize: e.transferSize, ms: Math.round(e.duration) }))`
   → `transferSize: 0` means served from cache. ⚠️ **Report yes/no and numbers only; never paste query values or
   full URLs into any artifact.**

## Notes

- **Depends on:** 0329 (without the card re-check, a post-deadline success does not show the card).
- **Blocks:** nothing.
- **Recommended first, not a hard dependency:** `0328`, so the retry's effect is measurable and so this task can
  reuse its `onerror` flag. If `0328` has not landed, this task adds the flag itself and `0328` reuses it.
- **Owner ruling cited:** D-1 (above) — narrows `0049` for downloads only.
- **Related:** `0318`, `0049`, `0291`, `0331`.
- **Privacy:** no player ids, tokens, hosts or query values in any artifact.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
