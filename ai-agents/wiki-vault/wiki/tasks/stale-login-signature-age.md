# Measure How Old `stale` Login Signatures Are (task 0366)

**Source**: `ai-agents/tasks/done/0366-measure-how-old-stale-login-signatures-are/brief.md` (what was built: its Sprint 7 board row in `ai-agents/sprints/plan-sprint-7.md`, and the committed code in `src/profile-server/`)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 7, rank 30 (✅ owner-ruled 2026-10-01: placed **directly below `0337`**, with the top group, whatever the number says — the number stays 30, ADR-035) / task `0366`

> 📌 **2026-10-06 sync — read, then re-cut.** `0373` read these brackets: only ≈ 11 % of stale was 15–20 min old,
> ≈ 58 % was 30 min – 6 h, `past_over_24h` ≈ 2.5 % of logins ([[tasks/stale-login-fix-decision]]). `0391` (**deployed
> 2026-10-06**, `0.0.156-profile.2`) **retired the five sub-24 h past brackets** and split the old `past_over_24h` into
> `past_24h_48h` / `past_48h_7d` / `past_over_7d`; the counter name, label key and the future side are unchanged. Old
> bracket series stop at that deploy ([[tasks/login-signature-24h-window]]).
>
> ✅ Done (agent-closed — not owner-verified), 2026-10-01. Built to the owner-approved plan; the code landed in
> commit `e581824` ("Sprint push", 2026-10-01). ⚠️ **Not deployed** — it targets Saturday's (2026-10-03/04) profile
> deploy. 📌 *2026-10-08 lint: deployed since — profile `0.0.156-profile.1`, 2026-10-03 (✔️ `e581824` is an ancestor of that tag; that deploy verified by `0358`).* ⚠️ The board row's own text says *"Not committed"*; that was true when the producer closed it and is now
> stale — the code **is** in `e581824` (checked with `git show`, 2026-10-01). **No bracket has been read yet**, so
> the cause of `stale` is still unknown.
>
> 📌 **2026-10-01, later — board and brief corrected by OWNER RULING** (verbatim *"I've commited the files, you can do
> the needed things by producer"*, relayed by `fkit-lead`; not producer precedent): the row's *"Not committed"* is now
> struck through and reads committed in `e581824`, **still NOT deployed**; and the placement directly below `0337` is
> recorded. The "stale row text" caveat above is now history.
>
> 📌 **2026-10-02 — the "next, not filed" step is now filed.** An architect consult (read-only) found these server
> brackets **cannot pick the fix on their own** (they cannot tell first boot from after-match reload, or whether a
> second Yandex call returns a newer `issuedAt`). Two tasks followed, on owner rulings: **`0372`** — client diagnostics
> mirroring these brackets one-to-one, done (agent-closed — not owner-verified), committed in `0c9a620`, **not
> deployed** 📌 *2026-10-08 lint: released since — game `0.0.156`, 2026-10-03 (✔️ `0c9a620` is an ancestor of tag `0.0.156`).* ([[tasks/stale-login-client-diagnostics]]); and **`0373`** — read both sets of data and choose the fix,
> owner-placed at rank 2 on [[decisions/sprint-8]]. The *"fold into the re-check"* ruling (Q2) is now carried out by
> `0373`.

## Goal

[[tasks/verified-login-live-check]] (`0339`) found about **1 login in 3 is `stale`** in `0325`'s shadow-mode login
check — the signature is genuine and for the right player, but its `issuedAt` is more than 900 s old or more than
300 s ahead — and the share is not falling. The owner ruled `0325`'s S2 exit **not met**, so `0340` (S3a, enforce)
cannot start.

The existing counter says *that* a signature is stale, not *by how much*, and three causes need three fixes:

| `issuedAt` is… | What it would mean | Likely fix (not decided) |
|---|---|---|
| just over 15 min old | the 900 s window is too tight for real play | retune the window |
| hours or days old | Yandex hands back an old `issuedAt` even on a fresh call | a different fix — a wider window would accept genuinely old signatures |
| ahead of now | a clock problem somewhere | look at clocks |

This task only **measures**: record an age bracket for every `stale` login. Profile server only; client and login
behaviour unchanged. Filed 2026-10-01 on owner ruling *"Agree"* (relayed by `fkit-lead`); moved from the Backlog
board to Sprint 7 the same day.

**Owner rulings, 2026-10-01** (live `fkit lead` session, relayed; ⛔ not producer precedent):
- **Q1** *"Move to Sprint 7 (Recommended)"*.
- **Q2** *"Fold into the re-check (Recommended)"* — **no separate verify task.** Reading the brackets after the
  deploy is part of the **S2-exit re-check before `0340`**. ⚠️ An owner-ruled exception, for this task only, to the
  2026-09-29 build/verify-split rule; the task closes on its build proof, not on the reading.
- **Q3** *"Stale only (Recommended)"* — no age recorded for `ok` signatures.

## Key Changes

- **New counter `geoconflict.profile.login.verification.stale_age`**, one label `bracket`, **8 fixed values**
  (`StaleSignatureAgeBracket` in `src/profile-server/Telemetry.ts`). Each range is open below, closed above, so
  exactly 900 s old / 300 s ahead stay `ok` and get no bracket:

  | `bracket` | `issuedAt` relative to now |
  |---|---|
  | `future_5m_15m` | 300 s < ahead ≤ 900 s — small clock difference |
  | `future_over_15m` | ahead > 900 s — gross error |
  | `past_15m_20m` | 900 s < age ≤ 1 200 s — just past the window |
  | `past_20m_30m` | ≤ 1 800 s |
  | `past_30m_1h` | ≤ 3 600 s |
  | `past_1h_6h` | ≤ 21 600 s |
  | `past_6h_24h` | ≤ 86 400 s |
  | `past_over_24h` | > 86 400 s |

  The brief's starting point had one future bracket; the plan split it in two.
- **Where:** `staleSignatureAgeBracket` in `src/profile-server/PlayerSignature.ts` turns the age into a bracket — the
  raw age never leaves that module. A `stale` result carries `ageBracket`; `classifyLoginSignature` in
  `src/profile-server/LoginVerification.ts` passes it on as `staleAgeBracket`; the `/v1/login` handler in
  `src/profile-server/Routes.ts` calls `metrics.loginStaleSignatureAge` inside **its own try/catch** — it can never
  cost a login. The no-op metrics object got the matching no-op.
- **Unchanged:** the existing `geoconflict.profile.login.verification` counter (same name, label, seven values), so
  `0339`'s readings stay comparable; the 900 s / 300 s window; what counts as `stale`; the client.
- **Privacy:** fixed label values only — never the raw age, an id, a signature, a token or a payload (ADR-113,
  ADR-116).

## Outcome

- **Proof (from the board row; not re-run here):** full `npm test` 186/186 suites green, lint and `tsc` clean;
  ⚠️ `AlertRoutes.test.ts` was red intermittently, read as the known `supertest` flake. Review round 1: 0 findings —
  ⚠️ the second opinion was **reasoning-only**.
- ⚠️ **Caveat recorded at close:** `stale` is decided **before** the id check, so a bracket can include genuine
  signatures issued for a *different* id. The counts are "stale signatures", not "stale signatures for the right
  player".
- **Deploy constraint:** rides Saturday's (2026-10-03/04) profile deploy, or waits until `0297` §1 has read `0309`'s
  log line from the profile container ([[tasks/hmac-construction-log-label]]) — no second profile deploy before
  that read. See [[systems/weekend-deploy-window]].
- **Next** *(filed 2026-10-02 as `0373` — see the note at the top)*: once the brackets are read — a **fix** chosen from them (retune, or the other fix in the
  table) and an **S2-exit re-check** with the owner. Only then can `0340` be considered (it also needs a separate
  owner approval to enforce — [[decisions/adr-116-verified-login]]).
- **Optional sub-check** (does an old cached build fail to reach the server? — `0339`'s side finding): its result is
  **not recorded** in the brief or on the board.

## Related

- [[tasks/verified-login-live-check]] — task `0339`, the failed live check that filed this task
- [[tasks/verified-login-shadow-mode]] — task `0325`, the S2 shadow-mode check this measures
- [[decisions/adr-116-verified-login]] — the verified-login decision; S3a (`0340`) waits on this measurement
- [[systems/player-profile-store]] — the profile server, its login route and counters
- [[decisions/sprint-7]] — the board (rank 30); `0373`, the reading task, moved here at rank 36 on 2026-10-04
- [[decisions/sprint-backlog]] — where it was filed before the move
- [[tasks/hmac-construction-log-label]] — task `0309`, whose log line gates a second profile deploy
- [[systems/weekend-deploy-window]] — the weekend deploy slot this targets
- [[tasks/stale-login-client-diagnostics]] — task `0372`, the client-side labels that mirror these brackets (same edges, a parity test)
- [[decisions/sprint-8]] — where `0373` reads these brackets (rank 2 until 2026-10-04; then moved to Sprint 7, rank 36)
- [[systems/analytics]] — the client mirror of these brackets (`0372`'s `Profile:Login:SignatureAge:*` events)
- [[tasks/stale-login-fix-decision]] — task `0373`, which read these brackets
- [[tasks/login-signature-24h-window]] — task `0391`, which re-cut them (deployed 2026-10-06)
- [[decisions/adr-121-login-signature-24h-window]] — the decision that retired the sub-24 h brackets
- [[tasks/post-24h-window-login-read]] — task `0392` (2026-10-07): the re-cut brackets after `0391` — `past_24h_48h` 137, `past_48h_7d` 106, 0 under 24 h
