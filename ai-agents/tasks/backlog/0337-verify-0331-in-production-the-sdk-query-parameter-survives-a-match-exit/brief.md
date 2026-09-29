# Verify 0331 in production — the `sdk` query parameter survives a match exit

## ID
0337

## Sprint
Sprint 7

## Priority
1

> **Rank 1 is OWNER-RULED placement** — the owner's words, verbatim: *"The verify task should be put on top of
> the next sprint"*. It was appended at rank 11 (ADR-035: append, never insert) and then moved to the top within
> the [Sprint 7 board](../../../sprints/plan-sprint-7.md)'s contiguous run of open rows by that owner ruling;
> no closed row exists on that board, so none was renumbered. See the board's 2026-09-29 addendum. ⛔ Not
> producer precedent for re-ranking.

## Status
🔲 Backlog

## Owner
fkit-producer — ⚠️ **EXECUTED BY THE OWNER (human).** A live, read-only check in the owner's own production
Yandex Games session. No agent can run it.

*(The field names the accountable fkit seat, because the owner vocabulary admits no person — the same form as
[`0297`](../0297-paid-citizenship-owner-run-test-buy-sequence/brief.md), which the owner confirmed on 2026-09-23.)*

## Context

**Filed 2026-09-29 by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER RULING given
live in the `fkit lead` session via `AskUserQuestion` on 2026-09-29, relayed by `fkit-lead`.** ⛔ Not producer
precedent. The question was: *"0331 is built, tested and reviewed, but only proven once deployed and you re-run
P1. When should it close?"* The owner's answer, verbatim (typed as "Other"): *"Split the task into 2: the one is
about building the feature, another one should be about verifying it (the current one may stay as the "build"
task). The verify task should be put on top of the next sprint (if it depends on the deploy, it shouldn't block
the current sprint's deploy)"*.

**What this verifies.** [`0331`](../../done/0331-keep-the-query-string-on-match-exit/brief.md) (the **build**
task) makes a match exit keep the page's query string, so Yandex's loader can still read its `sdk` parameter
after the post-match reload. Before 0331, the owner's probe **P1** measured in production on 2026-09-29: fresh
first load `has("sdk")` **true**, query length **120**; after a match exit **false**, **0** (twice). That is
"trigger B" in the [`0318` findings report](../../../knowledge-base/reports/2026-09-28-0318-citizenship-card-vanishes.md)
(§2.3, §5). 0331 was proven in tests only — the local dev frame has no platform `sdk` parameter, so **only this
production re-run proves the real effect** (0331 plan §6.4–§6.5, brief verification item 4). This task is that
item, split out by the ruling above.

**Precondition — this task cannot start until 0331's change is deployed to production.** The owner deploys in
the regular weekend deploy slot unless something is urgent
([weekend-deploy-slot runbook](../../../knowledge-base/weekend-deploy-slot-runbook.md)). At filing, 0331's
change was **not committed and not deployed**.

> 📌 **2026-09-29 — the deploy that carries 0331 is planned** (undated). 0331 is committed (`572d134`) and rides
> the next slot's **game deploy** (`./build-deploy.sh prod`), step **N2** of the
> [weekend-deploy-slot runbook](../../../knowledge-base/weekend-deploy-slot-runbook.md) § *Next window — plan
> (written 2026-09-29)* (slot order owner-ruled 2026-09-29: telemetry → game → profile). Per that plan, P1 can
> run as soon as N2's smoke checks pass; it does not wait for the profile deploy. Step 1 below still records the
> deploy as it actually ran.

⚠️ **This task does NOT block Sprint 6's deploy.** It runs *after* the deploy, by definition; nothing in Sprint 6
waits on it, and Sprint 6's deploy must not be held for it.

## What to build

Nothing is built. This is an owner-run, **read-only** production check.

**Step 1 — precondition.** Confirm the game build that contains 0331's change is live in production (the deploy
that shipped it; date it).

**Step 2 — probe P1, repeated (owner, production, the game frame's console).** In DevTools:
- **Pick the game iframe** in the console's context dropdown (not `top` — that is the portal page).
- **Fresh load first**, for comparison: run `new URLSearchParams(location.search).has("sdk")` and
  `location.search.length`.
- **Play a match and exit it** (any exit — win screen, sidebar exit, settings exit).
- ⚠️ **Re-pick the game iframe after the post-match reload** — the dropdown resets to `top` on reload, and a probe
  run in `top` reads the portal page and gives a meaningless answer.
- Run the same two expressions again.
- **Expected after the match exit:** `has("sdk")` = **`true`** and `location.search.length` **> 0**.
- **Report yes/no and numbers only. Never paste the query string or any value from it** — it can carry ids.

**Step 3 — informational (not pass/fail).** GameAnalytics, 7 days, dimension 02 = `yandex`: **M2**
`Session:PlatformInitTimeout` and `0328`'s `Session:PlatformDegraded:InitTimeout` — the after-match share,
**before vs after** the deploy (`0318` report §3.2). Numbers only. Allow enough post-deploy days for a fair
comparison and say how many days each side covers.

**Step 4 — optional.** Whether the citizenship card shows on the after-match page (yes/no).

## Verification steps

1. The deploy that shipped 0331 is named with its date.
2. The fresh-load reading is recorded: `has("sdk")` yes/no and `location.search.length` as a number.
3. The after-match reading is recorded the same way, taken in the **game iframe** context (re-picked after the
   reload). **Pass = `true` and length > 0.**
4. Step 3's before/after numbers are recorded, with the day counts, or explicitly marked "not taken".
5. Step 4 is recorded or marked "not taken".
6. **If P1 still shows `false` after the deploy:** file a **new defect** task with the readings — **do not reopen
   0331 silently.** This task then closes with its result recorded as a failed verification, pointing at that
   defect.
7. No query string, id, token, host or full URL appears anywhere in the worklog.

## Notes

- **Depends on:** `0331` (build, closed 2026-09-29) plus its production deploy.
- **Blocks:** nothing. ⚠️ In particular it does **not** block Sprint 6's deploy.
- **Related:** `0318` (findings, trigger B, probe P1), `0328` (the `InitTimeout` degraded marker), `0330`
  (loader retry), `0199` (owns "is any query parameter load-bearing?" — its dated 2026-09-29 note already records
  that `sdk` is), `0273` (`reloadApp()` already keeps the query).
- **Wiki follow-up (not this task's work):** `systems/flashist-init.md` says a match exit "drops the URL query
  string" — stale once 0331 is deployed. The `fkit-wiki` role updates it at its next sync.
- **Privacy:** yes/no and numbers only. Never paste query values, full URLs, ids, tokens or hosts into any
  artifact.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
