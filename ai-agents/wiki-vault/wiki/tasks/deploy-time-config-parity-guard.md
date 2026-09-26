# Deploy-Time Config Parity Guard — Catch a Variable That Never Reaches Production

**Source**: `ai-agents/tasks/done/0064-deploy-time-config-parity-guard/brief.md` (plus `plan.md`, `plan-phase2.md`, `worklog.md` and `review.md` in the same folder)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 4 · task `0064` · config-parity track (`0063` → `0062` → `0195` → `0064` → `0060`)

> 📌 **2026-09-26 — the first real production run happened (report-only, `0298` Part A, runbook W12).**
> `./build-deploy.sh prod` (release `0.0.152`): the **names** guard reported **REQUIRED 0** on game,
> profile and client; the prod **value** guard reported **REQUIRED 1** — the expected
> `OTEL_AUTH_HEADER — forwarded but EMPTY` (harmless by design, handled by `0298`); last line
> `report-only — exit 0`. On the profile side, `0220`'s on-box value parity reported **0 findings / 13
> ok** at W3. ⛔ **Still not armed** — `--enforce` is `0298` Part B. See [[systems/weekend-deploy-window]].
>
> 🚨 **READ THIS FIRST — CLOSED IS NOT ARMED, AND NOT PROVEN IN PRODUCTION.**
> Closed **2026-09-24** by a spawned `fkit-producer` at the close step of `/fkit-sprint-ship-loop`
> (fkit-lead driver), **no owner present** (ADR-033 §5) ⇒ the marker
> **`(agent-closed — not owner-verified)`** is load-bearing. It closed on the **Phase 2 only** scope
> left to it by the 2026-09-23 Sprint 4 rescope (Q2 = (a)).
> - ⛔ **`--enforce` is wired NOWHERE.** Both guards run report-only and exit 0; neither can fail a
>   deploy. Arming belongs to `0298` (Sprint 5), after every `0203` item — see
>   [[tasks/config-parity-guard-pre-arming-gate]].
> - ⛔ **The guard has never run against a real production deploy.** Verification step 8 (the first
>   real report-only production run, runbook W12) **moved to `0298`**. Everything below is proven on
>   fixtures and the committed tree, not on `.env.prod`.

## Goal

Close the gap that let three (later four) configuration defects fail silently: **production
configuration does not match what the application needs, and nothing says so.** The class and its
instances (`0061`, `0062`, `0063`, `0195`) are recorded on [[decisions/config-parity-failure-class]].

Two hard requirements from the brief's hazard section, both honoured:

1. **Warn first, enforce second.** A guard that enforces on its first run would correctly fail the very
   deploys carrying the known fixes — a block on all deploys.
2. **Names and verdicts only — never a value**, not truncated, not "starts with". A checker that prints
   a token into deploy output is a worse defect than the one it catches.

Scope was `deploy.sh`, `build-deploy-profile.sh` and small checkers they call. **No application code.**

## Key Changes

**Phase 1 — parity of NAMES (built 2026-09-02, two-round stateful review, converged *ship report-only*).**
- `scripts/check-config-parity.mjs` + `scripts/config-parity-allowlist.json` + `tests/scripts/ConfigParity.test.ts`; `npm run check:config-parity`.
- Three static relations: **A** game (`src/server/**` + `src/core/**` reads vs `deploy.sh` heredoc or `Dockerfile` `ENV`); **B** profile, two hops (B1 reads vs `setup-profile.sh`'s `profile.env`, **B2 every `profile.env` key exported by `build-deploy-profile.sh`** — `0195`'s exact shape, caught with no values); **C** client (`src/client/**` vs webpack `DefinePlugin`). Plus a pipeline-scoped reverse (dead forwarded key) check.
- Parsers anchor on text, not line numbers, and **fail loud** (`PARSE-FAILURE`, `DYNAMIC-READ`) rather than comparing an empty set.
- First real-tree run: **0 REQUIRED, 6 INFO (dead forwarded keys), 4 allowlisted** — matching the plan's hand-count.
- Reported, **not fixed** (a guard, not a fix): `STRIPE_PUBLISHABLE_KEY` never forwarded (allowlisted optional, RU ships no Stripe flow); six dead forwarded keys; `deploy.sh` defaulting `PUBLIC_PROTOCOL` to `"http"`.

**Phase 2 — presence and shape of VALUES (built 2026-09-23/24, game side only).**
- New `scripts/check-config-values.mjs` + `tests/scripts/ConfigValues.test.ts` (52 tests); `deploy.sh` gains `run_config_value_guard`, called `|| true` just before the remote-update step. It reads values from the deploying shell by name, **validates each name against a regex first** (without it, an indirect expansion on a crafted name ran a command — proven, then blocked), and passes `name\0value\0` records on stdin.
- **Rules apply in `prod` only** (owner amendment 3): required keys must be **non-empty**; the format list is **exactly** `PUBLIC_PROTOCOL`, `API_BASE_URL`, `JWT_ISSUER`, `PROFILE_API_URL` — **`https`, host not a bare IP** (owner ruling Q5, *approved as proposed*; nothing else).
- 🚩 **Owner amendment 1 (2026-09-23) retired the "deliberately blank" exception for `PROFILE_INTERNAL_TOKEN`** — owner, verbatim: *"I don't think we can allow the PROFILE INTERNAL TOKEN to be empty anymore, because this token is a requirement for the profile/citizenship logic to work properly"*. So a blank token on a prod deploy prints `REQUIRED … PROFILE_INTERNAL_TOKEN — forwarded but EMPTY`. Once `0298` arms `--enforce`, a blank token **blocks** a prod deploy.
- Five `phase: 2` optional value entries added (`STORAGE_*` ×4, `FEEDBACK_WEBHOOK_URL`).
- Out-of-plan, **owner-approved 2026-09-24**: one `eslint.config.js` entry so the new `.mjs` lints (typed linting's `allowDefaultProject` is at its cap of 8).
- 18 mutation proofs (incl. two deliberate value-leak mutations) all turned their suites red. Full `npm test` 139 suites / 1923 tests, first run.

## Outcome

| Verification step | State at close |
|---|---|
| 1 `0062`'s defect caught — removed **and** forwarded-but-empty | ✅ fixtures |
| 2 `0063`'s http-on-bare-IP caught | ✅ fixtures + the real `deploy.sh` function |
| 3 forwarded-but-empty caught, incl. `PROFILE_INTERNAL_TOKEN` | ✅ fixtures |
| 4 clean config passes | ✅ prod-shaped fixture — ⚠️ **not against the real `.env.prod`**; not literally silent (count lines print) |
| 5 optional does not fire, unlisted does | ✅ |
| 6 report-only exits 0, enforce exits non-zero | ✅ as a flag — **wired to nothing** |
| 7 no value ever printed | ✅ four layers, canary tests |
| 8 a real deploy runs clean | ➡️ **moved to `0298`** |

**Known limits carried, not widened:** a bare-IP `PUBLIC_HOST` is not checked; a value containing a
line break is not checked; a blank `ADMIN_TOKEN` bypasses its `??` default (the guard names it
`REQUIRED`; not fixed here). The two mechanism residuals inherited from `0062` (secrets in the ssh argv;
theoretical heredoc-delimiter injection) remain accepted.

🚩 **If Phase 2 lands after the 2026-09-26 window** its checks are absent from step 8's run and need
one more report-only real deploy before `0298` enforces them. ⚠️ **The guard compares what the
DEPLOYING SHELL holds — it cannot tell whether the value MATCHES the box's.** The runbook's W11 token
match is still the only check of that.

**History worth keeping.** Filed 2026-08-23 as its own task (moved out of `0062` step 4); merged the
cancelled duplicate `0072`'s scope (cover the profile pipeline too; typed well-formedness checks). The
"must land after `0062`/`0063`/`0195`" hazard was **owner-ruled on 2026-09-02 to bind the enforcing
switch, not the build**. The owner's 2026-09-02 R3 wording (*"wiring enforcing is a follow-up step within
this same task — not a new task"*) was **superseded 2026-09-23** by the split into `0298`.

## Related

- [[decisions/config-parity-failure-class]] — the class this guard exists to catch
- [[tasks/config-parity-guard-pre-arming-gate]] — task `0203`, the pre-arming items that must all land before `--enforce` is wired
- [[tasks/forward-profile-internal-token]] — task `0062`, the acceptance test's defect
- [[tasks/prod-api-env-https-apex]] — task `0063`, the format rule's defect
- [[tasks/yandex-payments-secret-forwarding]] — task `0195`, the profile-pipeline instance B2 catches
- [[tasks/container-log-retention]] — task `0060`, the next item on the config track
- [[systems/weekend-deploy-window]] — where the first real report-only run (now `0298`'s) happens, and the W11 token match
- [[systems/configuration]] — the deploy-environment plumbing the guard reads
- [[decisions/sprint-4]] — the board it closed on
- [[decisions/sprint-5]] — the board carrying `0298`
- [[systems/player-profile-store]] — the profile API whose deploy pipeline the guard's B1/B2 checks cover
- [[tasks/profile-secret-persistence-value-parity]] — task `0220`, the profile box's on-box value parity (0 findings at W3)
