# Verify `0331` in Production — the `sdk` Query Parameter Survives a Match Exit (task 0337)

**Source**: `ai-agents/tasks/done/0337-verify-0331-in-production-the-sdk-query-parameter-survives-a-match-exit/brief.md` (its `worklog.md` read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 7, rank 1 (owner-ruled top placement on the build/verify-split rule) / task `0337`

> ✅ **Closed 2026-10-04** `(agent-closed — not owner-verified)` by a spawned `fkit-producer` (no owner channel), on
> results relayed by `fkit-lead` from the live `fkit lead` session. **VERIFICATION PASSED** — the pass/fail item
> (probe P1 after a match exit) read **true / 138**.
>
> ⚠️ **Who saw what:** the owner ran probe P1 and the citizenship-card check personally in production. The
> GameAnalytics numbers were read by `fkit-lead` itself, at the owner's request (*"GameAnalytics can be done by
> you"*), read-only in the owner's logged-in browser. The marker records only that an agent made the **close**.
>
> ⛔ Yes/no and numbers only — no query string, query value, id, token, host or full URL (the brief's own rule).

## Goal

The verify half of [[tasks/match-exit-keeps-query-string]] (`0331`), split out on 2026-09-29 by owner ruling
(*"Split the task into 2 … The verify task should be put on top of the next sprint"*). `0331` made a match exit keep
the page's query string so Yandex's loader can still read its `sdk` parameter after the post-match reload ("trigger
B" of the `0318` investigation — [[tasks/citizenship-card-vanishes-investigation]]). `0331` was proven in tests only:
the local dev frame has no platform `sdk` parameter, so **only a production re-run of probe P1 proves the real
effect**. This task is that re-run. It blocked nothing — in particular not Sprint 6's deploy.

## Key Changes

Nothing built — an owner-run, read-only production check.

1. **Deploy that shipped `0331`** — game **`0.0.155`, 2026-09-29** (`572d134`); **`0.0.156`** (live 2026-10-03)
   also carries it. See [[systems/weekend-deploy-window]].
2. **Fresh load (game iframe):** `has("sdk")` **true**, query length **138**. (Pre-`0331` fresh load, 2026-09-29:
   true / 120.)
3. **After a match exit — the pass/fail item:** in the game iframe, **re-picked after the post-match reload**
   (owner confirmed: *"Yes, after match, iframe"*), `has("sdk")` **true**, length **138** → **PASS** (rule: true and
   length > 0). Pre-`0331` baseline: **false / 0**, measured twice.
4. **GameAnalytics, informational (not pass/fail)** — read by `fkit-lead`:
   - **M2 `Session:PlatformInitTimeout` per `Session:Start`, clean days only:** ≈ **6.6 %** before (5 days) vs
     ≈ **6.85 %** after (3 days) — **no visible drop**. Read as "no visible change", **not** as a measured rise
     (small samples, inputs rounded by GameAnalytics to ~3 significant figures).
   - Raw daily M2 averages: ≈ 1,307/day before (Sep 22–28, 7 days) vs ≈ 1,445/day after (Sep 30–Oct 3, 4 days).
   - **After-match share of `InitTimeout` boots: ≈ 23.6 % after** (79 of 335, Sep 30–Oct 3, 4 days). **No before
     side exists** — `0328`'s `Session:PlatformDegraded:*` event shipped in the same `0.0.155` deploy
     ([[tasks/platform-degraded-analytics-event]]).
5. **Citizenship card on the after-match page:** **yes** (owner-reported).
6. **Defect task:** not applicable — P1 passed; `0331` not reopened.
7. **Privacy:** confirmed — numbers and yes/no only.

## Outcome

- ✅ **`0331`'s effect is proven in production**: the `sdk` parameter now survives a match exit. Trigger B's fix
  works as designed.
- ⚠️ **GameAnalytics caveats — recorded, NOT blocking the close:**
  1. **Unfiltered pull.** The brief's filter (custom dimension 02 = `yandex`) returned an **empty** dataset —
     `yandex` was not among that dimension's loaded values (only `null` was listed). The numbers are for the whole
     GameAnalytics game that is the Yandex Games build.
  2. **"Demo mode" banner — not checked.** GameAnalytics showed *"You're viewing data in Demo mode"*. The numbers
     looked like real data (DAU matched the portfolio row), but what the banner means was **not verified**.
  3. **`Session:Start` spikes** on **Sep 26, Sep 28 and Oct 3** (5–75× a normal day) were excluded from the rate.
     **Cause not investigated; nothing filed.**
  4. The after-match share has **no before side**, so `0331`'s effect on boot timeouts **cannot be shown in the
     analytics** — only P1 proves it.
- ⚠️ **Open, not owned by any task (as recorded):** the dimension-02 filter not working and the `Session:Start`
  spikes. Both are observations in the worklog only; no task was filed for either.
- **Board effect:** Sprint 7 rank 1 → `✅ Done`; the `0337` link repointed to `tasks/done/` across the boards and
  briefs that cited it ([[decisions/sprint-7]]).

## Related

- [[tasks/match-exit-keeps-query-string]] — task `0331`, the build half this verifies
- [[tasks/citizenship-card-vanishes-investigation]] — task `0318`, trigger B and probe P1
- [[tasks/platform-degraded-analytics-event]] — task `0328`, the `InitTimeout` after-match marker read in step 4
- [[systems/flashist-init]] — the 5 s boot deadline and the match-exit reload
- [[systems/weekend-deploy-window]] — the 2026-09-29 deploy that shipped `0331`
- [[decisions/sprint-7]] — the board (rank 1)
- [[decisions/adr-119-yandex-invite-sdk-link-plus-code]] — the invite build that must also keep `location.search` intact
