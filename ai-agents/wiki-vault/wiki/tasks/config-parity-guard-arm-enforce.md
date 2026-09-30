# Config-Parity Guard: First Real Production Run, Then Arm `--enforce` (task 0298)

**Source**: `ai-agents/tasks/done/0298-config-parity-guard-first-real-report-only-production-run-then-arm-enforce/brief.md`
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 6, rank 33 (split out of `0064` on 2026-09-23) / task `0298`

> 🆕 **2026-09-29 — the FIRST ARMED DEPLOYS RAN** (telemetry → game → profile; [[systems/weekend-deploy-window]]).
> The armed guards **stopped none** of the three (owner reported no failure); the pre-flight `--enforce` run was
> exit 0, `REQUIRED 0`. ⚠️ **The guards' own output was NOT captured** — the record owner step 3 asks for does not
> exist for these runs. Owner step 1 was done through the owner's browser: game-server **logs** arriving in Uptrace
> with the OTEL header blank — **logs only, not metrics; the environment label was not seen.** The deploy order
> (game before profile) overrode this task's cost-only *"profile first"* preference; a dated note is in its worklog.
>
> ✅ Done (agent-closed — not owner-verified). Part B committed in `68303d5`. 🚨 ~~**No ARMED deploy is recorded yet**~~ *(superseded 2026-09-29, above)*
> (a profile deploy leaves no git artifact) — the first armed deploys are owner steps. ⛔ Names and verdicts only on this page;
> no values.

## Goal

`0064`'s verification step 8 and the arming of `--enforce`, split out when Sprint 4 was rescoped: **Part A** —
the parity and value guards' first real **report-only** production run; **Part B** — arm both, per `0203`'s
per-pipeline rules.

## Key Changes

**Part A — the 2026-09-26 window (owner-executed; output relayed):** the name guard read **REQUIRED 0** on
game / profile / client — `0064`'s zero-required prediction **held**. ⚠️ Only the `0.0.152` (W12) run is
confirmed against a real run; the `0.0.153` / `0.0.154` rows are the tagged tree's output (exact only if the
tree was clean then), and the W3/W7 profile deploys are **inferred, not captured**. Every INFO line was
explained (INFO can never block). The value guard (W12, prod) found **one REQUIRED: `OTEL_AUTH_HEADER` —
forwarded but EMPTY** — explained: the game server adds that header only when it is set and still creates its
exporters without it, and the telemetry side needs no auth. No token string in the deploy log.

⚠️ **Side note found in Part A, NOT fixed and NOT filed:** `BASIC_AUTH_USER` / `BASIC_AUTH_PASS` appear only
in `deploy.sh` and nothing on the game box reads them, so `--enable_basic_auth` **protects nothing there**. The
worklog suggests a producer brief; none exists.

**Owner rulings (verbatim, 2026-09-28):** Q1 **"Arm both; password may be blank (Recommended)"**; Q2 **"No
override (Recommended)"**; Q3 **"Yes, check names first (Recommended)"**. Accepted with the plan: a missing
`node` stops the deploy, like a missing guard script.

**Part B — armed:**
- `scripts/check-config-parity.mjs` gains `--block-on=<pipelines>` (needs `--enforce`): only REQUIRED findings
  in a blocking pipeline, plus a PARSE-FAILURE / DYNAMIC-READ tagged `global` or overlapping it, fail the run.
  Other pipelines' findings print, loudly, but do not block (`0203`'s *"Only its own deploy"*).
- `deploy.sh`: name guard `--pipeline=all --enforce --block-on=game,client`, and the **value guard** now
  returns non-zero on any failure — both stop the deploy. `build-deploy-profile.sh`: the same with
  `--block-on=profile`. `build-deploy.sh`: an **early name check before the version bump** (Q3), so name
  problems no longer cost a version number (value problems still do).
- `OTEL_AUTH_HEADER` → allowlist entry, `game`, `optional` (Q1). A clean prod run should read `REQUIRED 0`,
  `OPTIONAL 6`.
- **No override flag exists (Q2).**

## Outcome

- **Owner steps still owed:** (1) **before the first armed prod deploy**, confirm in Uptrace that prod game-server
  logs or metrics arrived after 2026-09-26 with the header blank; (2) first armed deploys in order — profile →
  game dev if used → game prod — and record each guard output (names only). **Rollback for a false block:** add
  an allowlist entry *with a reason*, or restore `--report-only || true` on the one call-site line, commit,
  redeploy.
- Part A's verification-step verdicts were partly ⚠️ at first relay (W3/W7 output not relayed); the worklog
  records the later reproduction on all three deploys.
- ⚠️ The on-box value report in `setup-profile.sh` (task `0220`) is **untouched — still report-only**.

## Related

- [[tasks/deploy-time-config-parity-guard]] — task `0064`, the guard and its Phase 2 value checks
- [[tasks/config-parity-guard-pre-arming-gate]] — task `0203`, the pre-arming rulings (per-pipeline tagging, R4b, R14)
- [[decisions/config-parity-failure-class]] — the failure class the guard exists for
- [[systems/weekend-deploy-window]] — W12, the first real report-only run
- [[tasks/profile-secret-persistence-value-parity]] — task `0220`, the on-box value report
- [[tasks/name-change-operator-decide-command]] — task `0312`, whose runtime-only variables are allowlisted
- [[decisions/sprint-6]] — the board carrying this task
