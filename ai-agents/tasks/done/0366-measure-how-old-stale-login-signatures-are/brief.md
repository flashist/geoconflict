# Measure how old `stale` login signatures are

## ID
0366

> ℹ️ **ID allocation, checked 2026-10-01 before filing** (method:
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md)). Highest task folder on
> all three boards: `0365`. `0366`: no task folder, no `## ID` hit, no `.claude/` hit, no hit under `ai-agents/`.

## Sprint
Sprint 7

📌 **Moved from the Backlog board to Sprint 7 on 2026-10-01** — OWNER RULING Q1, *"Move to Sprint 7 (Recommended)"* (see the 2026-10-01 rulings addendum at the end). *(Earlier value, kept as history — true from filing until this move:)* ~~Backlog~~

## Priority
30

> ⚠️ **Priority 30 is append rank on [Sprint 7](../../../sprints/done/plan-sprint-7.md), NOT a merit ranking — flagged for owner confirmation.** The owner ruled the move (Q1) but named no rank; the board's highest was 29 and writing it higher would renumber closed rows (ADR-035). **On merit this belongs directly below `0337`**, with the top group, because it must ride Saturday's (2026-10-03/04) profile deploy and `0340` waits on it. *(Earlier value, kept as history — true from filing until 2026-10-01:)* ~~Unscheduled~~

> ✅ **Answered 2026-10-01 — OWNER RULING** (live `fkit lead` session, verbatim *"I've commited the files, you can do the needed things by producer"*, relayed by `fkit-lead` to a spawned `fkit-producer`; ⛔ not producer precedent): **placed directly below `0337`, with the top group, whatever the number says.** The number stays 30 — the board row is closed, and ADR-035 forbids renumbering closed rows even under an owner ruling. The "flagged for owner confirmation" wording above is kept as history. See the last section of this brief.

> ⚠️ **Open owner question — Backlog or Sprint 7?** Filed on the Backlog board because no sprint was named. The
> owner's aim is for this to ride **Saturday's (2026-10-03/04) profile deploy**, which argues for pulling it into
> [Sprint 7](../../../sprints/done/plan-sprint-7.md) (the active sprint). Recommendation: pull it into Sprint 7. That
> pull is a producer act on an owner ruling (three edits: board row, backlog row → `➡️ Moved`, this field).

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder

## Context

**Filed 2026-10-01 by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER RULING given
live in the `fkit lead` session on 2026-10-01, relayed by `fkit-lead`.** ⛔ Not producer precedent. The owner
typed **"Agree"** to the lead's recommendation: *"`0339` Step 4: **not met for now**, plus a small task to
**measure how old the `stale` tickets are**, aiming for Saturday's profile deploy if it's ready in time."* This
is that small task.

**The problem, in plain terms.** At every login the profile server checks Yandex's signed player data and counts
the result (`0325` slice S2, shadow mode — nothing is enforced). Over ≈ 40 h of real traffic
([`0339`](../0339-verify-0325-s2-live-the-login-signature-check-in-production/brief.md) worklog, 2026-10-01),
about **1 login in 3 is `stale`**: the signature is genuine and for the right player, but the time stamp inside
it (`issuedAt`) is more than 900 s (15 min) old or more than 300 s (5 min) in the future. That share is **not
falling** (≈ 35 % in the last hour read). Because of it, the owner ruled `0325`'s S2 exit **not met**, so
[`0340`](../0340-0325-s3a-enforce-mint-verified-sessions/brief.md) (turn the check on) cannot start.

**Why we cannot just widen the window.** The counter says *that* a signature is stale, not *by how much*. Three
different causes need three different fixes:

| `issuedAt` is… | What it would mean | Likely fix (not decided here) |
|---|---|---|
| just over 15 min old (say 15–30 min) | the 900 s window is simply too tight for real play | retune the window |
| hours or days old | Yandex hands back an old `issuedAt` even on a fresh call | a different fix — a wider window would accept genuinely old signatures |
| ahead of now | a clock problem somewhere | look at clocks |

**Already ruled out** (`0339` worklog § *Step 7*): our server clock (NTP-synced); the game reusing an old
signature (the client throws away a held one older than 300 s and fetches fresh —
`src/client/flashist/FlashistFacade.ts` ~:479); old game versions (they send no signature, so they count as
`absent`, ≈ 26 in 40 h). **Leading suspect, unverified:** Yandex's `issuedAt` is sometimes far from "now" even on
a fresh `getPlayer({signed:true})` call.

**Timing — the deploy constraint.** The owner's aim: ship in **Saturday's (2026-10-03/04) profile deploy** if it
is built, reviewed and committed in time. ⚠️ **After Saturday's profile deploy, no second profile deploy may run
until [`0297`](../../done/0297-paid-citizenship-owner-run-test-buy-sequence/brief.md) §1 has read `0309`'s log line**
from the profile container (a recreate loses `docker logs` — see `0297`'s `## Status` and its Sprint 7 row). So
this task **rides Saturday's deploy, or waits until after that read** — there is no mid-week profile deploy for
it. Missing Saturday is allowed; it only delays the answer.

## What to build

**Profile server only. The client is unchanged. Nothing about login changes.**

1. **When a login signature is classified `stale`, also record which age bracket it fell in**, including whether
   `issuedAt` was in the **past or the future**. The classification today is in
   `src/profile-server/PlayerSignature.ts` (~:82–94); the counter is
   `geoconflict.profile.login.verification` in `src/profile-server/Telemetry.ts` (~:290).
2. **Bracket resolution must tell the three causes in the table apart.** Fine near the 900 s limit, coarse far
   from it. A starting point the plan may adjust: future (over 5 min); past 15–20 min, 20–30 min, 30–60 min,
   1–6 h, 6–24 h, over 24 h. The coder's plan picks the exact edges and says why.
3. **Mechanism is the coder's plan to choose** — e.g. a small new counter with one bracket label, or a histogram
   of the age, read in Uptrace the same way `0339` read the existing counter. Constraints, whichever is chosen:
   - **A small, fixed set of label values.** Never the raw age, never any id, signature, token or payload as a
     label or a log field (ADR-113 privacy + metric cardinality; ADR-116).
   - **The existing `outcome` counter is unchanged** — same name, same label, same seven values — so `0339`'s
     readings stay comparable with what comes after.
   - **The no-op telemetry path** (`Telemetry.ts` ~:217) gets the matching no-op.
   - **Never costs a login.** Like the S2 check, a failure here must not throw into the login route or change its
     response, status or the `vfy:false` session it mints.
4. **Nothing else.** No retune of the 900 s / 300 s window, no change to what counts as `stale`, no client
   change. Those are decided **after** the brackets are read.

## Verification steps

1. **Unit tests, at the edges:** exactly 900 s old and exactly 300 s ahead are still `ok` and record no bracket;
   just past each edge lands in the lowest past / future bracket; one value inside each bracket lands in that
   bracket; a value far in the past lands in the top bracket.
2. **Fail-safe:** a fault in the bracket recording (simulated) does not change the login's status, body, or
   session. Tested.
3. **No leak:** the S2 no-leak test (the signature never appears in any log write or repository call) still
   passes and covers the new path; no new label value is derived from player data.
4. **Unchanged counter:** a test (or the existing one) shows the `outcome` counter's name and values are
   unchanged.
5. `npm test` green; `npm run lint` clean. If a known `supertest` flake or `0197`'s segfault shows, re-run and say
   so (CLAUDE.md).
6. **Deploy recorded** in the worklog: which profile deploy carried it (date), or that it missed Saturday and why.
   ⚠️ Per the owner's standing rule (2026-09-29: *close the build task when proof needs a deploy; put a verify task
   at the top of the next sprint*), **reading the brackets in Uptrace after the deploy is not this task's close
   condition** — see *Notes*, open question 2.
7. No secret, key, real player id, signature, token, host or IP in any committed artifact.

## Optional sub-check — old builds that never log in (owner/lead, read-only, no code)

⚠️ **Not scope creep, and not this task's close condition** — it is a reading, not a build, carried here only so
it is not lost. From `0339`'s worklog § *Side finding*: GameAnalytics shows ≈ 14–30 % of daily players still on
pre-0.0.155 builds, yet the server saw almost no signature-less logins, and its login counter shows no failure
outcomes — so old-build logins are not failing at the server; they mostly do not arrive. **Harmless** (tabs opened
before the deploy, no new login) **or not** (old cached builds that never reach the server) is undetermined.
**Check:** a GameAnalytics split of the `Profile:Login:*` events by build. If the GameAnalytics UI cannot do it
(the lead's attempt was abandoned), record "not determined" and move on. If it shows old builds failing to reach
the server, that is a **new** task, not this one.

## Notes

- **Depends on:** nothing — `0325`'s S2 code is already in the tree and live.
- **Blocks:** [`0340`](../0340-0325-s3a-enforce-mint-verified-sessions/brief.md) (in practice — `0340` waits on
  `0325`'s S2 exit; [`0339`](../0339-verify-0325-s2-live-the-login-signature-check-in-production/brief.md) ruled it
  **not met** 2026-10-01, and the next step toward it is this measurement. Recorded as a dated note in `0340`'s
  brief.)
- **Expected after this task (not filed):** once the brackets are read, a **fix** (retune the window, or the other
  fix the table names) and a **re-check of the S2 exit** with the owner. Neither is decided or filed now.
- **Related:** [`0339`](../0339-verify-0325-s2-live-the-login-signature-check-in-production/brief.md) (the readings,
  in its `worklog.md`) · [`0325`](../0325-verified-login-check-yandex-signed-player-data-and-mint-verified-sessions/brief.md)
  (the S2 build) ·
  [ADR-116](../../../knowledge-base/decisions/adr-116-first-verified-identity-yandex-signed-player-data-at-login.md)
  · [ADR-113](../../../knowledge-base/decisions/adr-113-profile-internal-player-id-and-platform-identities.md)
  (privacy) · [weekend-deploy-slot runbook](../../../knowledge-base/weekend-deploy-slot-runbook.md).
- **Effort:** small — a guess, not an estimate from a plan.
- **Open questions for the owner** (via `fkit-lead`):
  1. **Backlog or Sprint 7?** Recommended: **Sprint 7**, because of the Saturday aim (see `## Priority`).
  2. **Who reads the brackets after the deploy?** Recommended: **a separate verify task at the top of the next
     sprint**, per the 2026-09-29 standing rule — or, simpler, fold the reading into the S2-exit re-check that has
     to happen anyway. The producer files it when this build closes, on the owner's choice.
  3. **Also record the age of `ok` signatures?** It would show how close real logins sit to the 900 s edge, which
     helps size a retune. Recommended: **no, `stale` only** — it is what the owner asked for, and `ok` ages can be
     added later if the brackets point at a retune.
- **Privacy:** counts and brackets only. Never paste ids, signatures, tokens, hosts or URLs into any artifact.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.

## 📌 2026-10-01 — owner rulings on Q1–Q3 (appended; nothing above edited, ADR-035)

**Authority.** OWNER RULINGS given live 2026-10-01 via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. These answer the three open questions in *Notes* above; the questions are kept as written.

- **Q1 — Backlog or Sprint 7?** → *"Move to Sprint 7 (Recommended)"*. Done: appended on [Sprint 7](../../../sprints/done/plan-sprint-7.md) at rank 30 (append rank — see `## Priority`); the [Backlog board](../../../sprints/backlog.md) row now reads `➡️ Moved to Sprint 7 — priority 30`; `## Sprint` updated. The `⚠️ Open owner question` note under `## Priority` is answered.
- **Q2 — who reads the brackets after the deploy?** → *"Fold into the re-check (Recommended)"*. **No separate verify task is filed for this task.** Reading the age brackets in Uptrace after the deploy is part of the **S2-exit re-check before [`0340`](../0340-0325-s3a-enforce-mint-verified-sessions/brief.md)**. ⚠️ This is an **owner-ruled exception, for this task only,** to the 2026-09-29 standing rule (close the build, put a verify task at the top of the next sprint). This task still closes on its build proof (verification steps 1–7); the reading is **not** its close condition.
- **Q3 — also record the age of `ok` signatures?** → *"Stale only (Recommended)"*. Scope unchanged: `stale` only.

## 📌 2026-10-01 — owner ruling: committed + placement (appended; nothing above edited except a dated note under `## Priority`, ADR-035)

**Authority.** OWNER RULING given live 2026-10-01 in the `fkit lead` session, verbatim *"I've commited the files, you can do the needed things by producer"*, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent for re-ranking.

- **Committed, not deployed.** This task's code + folder are in commit `e581824` ("Sprint push", 2026-10-01). Still **not deployed** — targets Saturday's (2026-10-03/04) profile deploy. The [Sprint 7](../../../sprints/done/plan-sprint-7.md) row's old *"Not committed"* is struck through there.
- **Placement.** Directly below `0337`, with the top group. Rank number unchanged at 30 (closed row, ADR-035).
