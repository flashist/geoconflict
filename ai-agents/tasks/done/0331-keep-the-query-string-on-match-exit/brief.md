# Keep the query string on match exit — only if the owner's probe P1 confirms it matters

## ID
0331

## Sprint
Sprint 6

## Priority
44

> **44 is the append rank** — the bottom of the [Sprint 6 board](../../../sprints/done/plan-sprint-6.md), appended
> after `0330`, never inserted (ADR-035). **Placement OWNER-RULED 2026-09-28:** *"End of Sprint 6
> (Recommended)"*. ⚠️ Not a merit rank. **On merit this could sit directly below `0328`**, because it is tiny and
> independent of `0329`/`0330`; but it is gated on an owner probe, so last is the right place until P1 is in.

## Status
✅ Done (agent-closed — not owner-verified)

📌 **2026-09-29 — unblocked: owner probe P1 confirmed trigger B.** Owner-run in production, in the game frame's
console, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037): fresh first load
`has("sdk")` **true** / query length **120**; after a match exit **false** / **0** (twice). **Step 0 is done; ready
for Step 1 (build). Nobody is building it yet.** ⚠️ A "Cancel it" answer given on an earlier, misread sample was
treated as **void** by the lead and nothing was cancelled; the standing ruling is `0318` D-2 *"B1+B2+B3, B4 if
confirmed (Recommended)"*, and the owner may still ask to cancel. Detail, P1b and the ruling trail: `worklog.md`.
*(Earlier value: `🚧 Blocked — waiting on owner probe P1 (0318 report §5); OWNER RULING 2026-09-28 "Park it: mark
0331 Blocked (Recommended)", relayed by fkit-lead`.)*

## Owner
fkit-coder

> ⚠️ **Step 0 is the owner's**, not the coder's (a live DevTools probe in the owner's own Yandex session). The
> coder does nothing until P1's answer is recorded. ✅ **Recorded 2026-09-29 — confirmed** (`worklog.md`).

## Context

**Filed 2026-09-28 by a spawned `fkit-producer` with no owner channel (ADR-021), on OWNER RULINGS on `0318`
given live via `AskUserQuestion` in the `fkit lead` session and relayed by `fkit-lead` (ADR-021/037).** ⛔ Not
producer precedent.
- **D-2**, verbatim: **"B1+B2+B3, B4 if confirmed (Recommended)"** — option text: *"Measure, re-check late,
  retry the download, and fix the match-exit address if the check confirms it."* This task is **B4**, and
  **"if confirmed" is part of the ruling**: it ships only if probe P1 confirms trigger B.
- **Placement**, verbatim: **"End of Sprint 6 (Recommended)"**.

**Source:** [`0318` findings report](../../../knowledge-base/reports/2026-09-28-0318-citizenship-card-vanishes.md)
§0 item 2 (trigger B), §2.3, §4 option (iv), §5 (P1), §6 row B4.

**Trigger B — inferred, NOT verified (report §2.3).**
- Leaving a match navigates to `rootPathname`, which is `window.location.pathname` captured at construction
  (`FlashistFacade.ts:453`), via `changeHref` (`FlashistFacade.ts:785-788`). **The query string and hash are
  dropped.** The five exit sites: `WinModal.ts:346`, `GameRightSidebar.ts:136`, `SettingsModal.ts:160`,
  `TutorialLayer.ts:318`, `Main.ts:728`.
- Yandex's loader reads the real SDK address from the `sdk` query parameter. If absent, it asks the parent frame
  and waits **500 ms**; on timeout it logs `SDK initialization failed` and `init()` **never settles**, so the 5 s
  deadline makes the boot degraded.
- **Unknown:** whether the iframe URL the platform gives us actually carries that parameter. If it does not, first
  loads use the parent lookup too and this change buys nothing.
- `0273`'s plan already flagged it (*"production already drops the query after every match exit and evidently
  works. But SDK health after that navigation was not verified"*, `0273/plan.md:151`), which is why `reloadApp()`
  keeps the query (`FlashistFacade.ts:790-798`).

**Coordinate with `0199`.** `0199` (Backlog) owns the wider question *"is any query parameter load-bearing on the
Yandex path?"* and the `copyToClipboard()` residual (*"Re-raise only if: a query parameter becomes load-bearing for
a joining client"*). A **yes** from P1 answers part of that question: record it in `0199`'s brief as a dated note
(producer's edit) so the two do not diverge. This task does **not** touch `copyToClipboard()` or invite links.

## What to build

**Step 0 — OWNER probe P1 (read-only, production, the owner's own session).** In the **game frame's** DevTools
console (not the portal page), run on a **first load**, and again **after exiting a match**:

`new URLSearchParams(location.search).has("sdk")` and `location.search.length`

- **Report yes/no and numbers only. Never paste the query string or any value from it** — it can carry ids.
- `true` on first load and `false` after the match exit **confirms trigger B** → go to step 1.
- **Anything else** (both `false`, both `true`, or unclear) → **the task STOPS and returns to the owner** with the
  answer recorded; do not build. The owner then decides whether to cancel it (the producer runs the mover).
- Optional alongside it, **P1b** on the post-match load (see `0330`'s brief for the one-liner) — `transferSize: 0`
  means the loader came from cache. Numbers only.

**Step 1 — only after P1 confirms.** `changeHref` navigates to `rootPathname` **plus the current
`location.search`**; the hash is still dropped. One place, the facade; the five upstream exit sites stay untouched
(`changeHref` is already a Flashist adaptation — keep the `// Flashist Adaptation` marker). Behaviour for
`reloadApp()` is unchanged.

**Step 2 — tests.** `changeHref` keeps the search and drops the hash; an empty search yields the bare pathname;
`reloadApp()` unchanged.

## Verification steps

1. **P1's result is recorded** in the worklog as yes/no + numbers only, with the date. If it did not confirm,
   verification ends here with the task returned to the owner.
2. Unit tests above pass.
3. `npm run lint` clean; full `npm test` (known `supertest` flake → CLAUDE.md procedure, say you re-ran).
4. **Owner, after release:** repeat P1 after a match exit → `has("sdk")` now `true`. Informational: **M2**
   `Session:PlatformInitTimeout` and `0328`'s `Session:PlatformDegraded:InitTimeout` value-sum (after-match
   share) before vs after (report §3.2; GameAnalytics, 7 days, dimension 02 = `yandex`). Numbers only.

## Notes

- **Depends on: nothing** among tasks. **Gated** on the owner-run probe P1 (step 0); if P1 does not confirm, the
  task stops and returns to the owner.
- **Blocks:** nothing.
- **Coordinate with:** `0199` (shares the "does any query parameter matter?" question — see *Context*).
- **Related:** `0318`, `0328`, `0330`, `0273`, `0303` (its restart uses `reloadApp()`, which already keeps the
  query).
- **Privacy:** never paste query values, full URLs, ids, tokens or hosts into any artifact.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
- 📌 **2026-09-29 — verification item 4 SPLIT OUT by OWNER RULING** (given live in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead`): this task is the **build** task; the owner's post-release P1 repeat now lives in [`0337`](../../backlog/0337-verify-0331-in-production-the-sdk-query-parameter-survives-a-match-exit/brief.md) (rank 1, Sprint 7). Closed on items 1–3 only — see `worklog.md` § *Closed*.
