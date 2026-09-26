# `PROFILE_INTERNAL_TOKEN` Never Forwarded to Production — the Profile Client Silently No-Ops

**Source**: `ai-agents/tasks/done/0062-forward-profile-internal-token-in-deploy/brief.md` (plus `worklog.md` and `review.md` in the same folder)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 4 · task `0062` · config-parity track (`0063` → `0062` → `0195` → `0064` → `0060`)

> 🆕 **2026-09-26 — PROVEN IN PRODUCTION.** `0296` ran this task's moved checks and closed
> ([[tasks/after-deploy-production-checks]]): **A1** `MATCH`, **A2** `NONEMPTY` with a non-empty source
> value (both halves), **A3** credits landing end to end, **A4** no partial-config warning and the token in
> no log or deploy output. The *"none of D1–D4 has been run with a real value"* caveats below are the
> pre-deploy record.

> 📌 **UPDATE 2026-09-26 — the production checks RAN, as `0296` A1–A4, in the weekend window.** A1
> token-match **`MATCH`** (W11); A2 **`NONEMPTY`** in the container with a non-empty source (W13); A3 a
> real authenticated credit end to end — **13 credit rows** (W14); A4 no partial-config warning with both
> values set and no token string in the game logs — ⚠️ "fires when it should" is shown by tests only.
> ⇒ **the token now demonstrably reaches production.** Recorded under `0217`'s close — see
> [[tasks/profile-p2-wire-game-server]]. The block below is kept as written.
>
> 🚨 **READ THIS FIRST — CLOSED IS NOT PROVEN IN PRODUCTION.**
> Closed **2026-09-23** on an **owner ruling** given live in the `fkit lead` session via
> `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer` holding **no owner channel**
> (ADR-021, ADR-033 §5) ⇒ the marker **`(agent-closed — not owner-verified)`** is load-bearing: **no
> human verified this work, and none of the production checks D1–D4 has ever run with a real value.**
> The owner closed it **as built + reviewed** so the tasks depending on it stop being blocked, and
> **moved its production checks to task `0296`** (Sprint 5, section A). ⛔ **Do not summarise this close
> as "the token reaches production".** That is still an inference — see *Outcome*.

## Goal

`.env.prod` defined `PROFILE_INTERNAL_TOKEN`, but **`deploy.sh` never sent it to the server**: the remote
env heredoc passed `PROFILE_API_URL` and nothing else from the pair. Verified 2026-08-23, the full chain:

1. `ProfileApiClient.isConfigured()` (`src/server/ProfileApiClient.ts`) needs **both** a non-empty base
   URL **and** a non-empty token.
2. The token read falls back to `""`, so in production `isConfigured()` was **false**.
3. Every profile call returned early — `upsertProfile()` at client join and `creditMatch()` at match
   end.
4. The miss was logged at **`debug`**, which is effectively invisible in production.
5. **Independently**, the profile server **fails closed** on an empty token
   (`src/profile-server/InternalAuth.ts`). Two separate barriers.

**Net effect: no profile row was ever created and no XP was ever credited in production** — silently.
It was a blocker for the citizenship go-live (`0017`'s and `0012`'s production tails, and `0065`), not a
live player-facing bug, because `0054`'s default-OFF `CITIZENSHIP_CARD_ENABLED` flag hides the card.
See [[decisions/config-parity-failure-class]] for the class this belongs to.

## Key Changes

Built **2026-08-24** by the sprint ship-loop; plan owner-approved the same day.

| File | Change |
|---|---|
| `deploy.sh` | **one heredoc line** — search for `PROFILE_INTERNAL_TOKEN=${PROFILE_INTERNAL_TOKEN}` (exactly one match) |
| `src/server/ProfileApiClient.ts` | the constructor calls the new `warnIfPartiallyConfigured()`: a **`warn`** when the URL is set and the token is empty, and the symmetric `warn` when the token is set and the URL is empty; silent when both or neither are set. **Names variables only, never values** |
| `tests/server/ProfileApiClient.test.ts` | +4 tests, including one asserting the warn text never contains the token value |

- **The general guard was split out, not built here** — owner ruling 2026-08-23 made it task `0064`,
  sequenced to land after this fix (a guard that enforces first would correctly fail the very deploy
  that carries the fix).
- **Review:** stateful, **✅ Ready to merge (validation-gated)**. Residuals **R1** (the token expands
  locally into a single `ssh` argument, so it is briefly visible in process tables; `bash -x` would trace
  it) and **R2** (a theoretical heredoc-delimiter injection if the value contained a newline plus the
  delimiter) were **inherited by `0064`**, not fixed here. R3/R4 were observations, not defects.

## Outcome

### What is established, and what is only inferred

- ✅ The fix commit **is an ancestor** of the 2026-08-29 production deploy commit, and that commit's
  `deploy.sh` carries the forwarding line.
- ⛔ **That is not proof the fix is live.** `deploy.sh` runs from the owner's **local working tree**, and
  what that tree held on the day is not recoverable from git.
- 🚩 **D2 ran 2026-09-04 against the live container and read the token EMPTY — INCONCLUSIVE, not a
  refutation.** The owner had **deliberately blanked** the value before that release to keep citizenship
  off. **Forwarding an empty value and never forwarding at all look identical at the container**, so how
  to read D2 depends on the *source* value too:

  | Container reads | Source value at deploy time | Means |
  |---|---|---|
  | non-empty | — | the fix is live |
  | empty | non-empty | **the fix did not work** — a real failure |
  | empty | blank | **nothing — inconclusive** (2026-09-04) |

- ✅ **D5 passed LOCALLY on 2026-09-23** — tests (`ProfileApiClient` 27/27; the five suites that inject
  the client, 50/50) **plus a live server-only run** with both variables unset: master + two workers up,
  `/api/env` reported an empty profile URL, zero `warn`/`error` lines. **Step 6's local half passed** by
  reading the code plus a unit test. ⚠️ **Not covered by that run:** the join and match-end profile paths
  were never reached live (no player joined, no match ended), the `debug` miss line cannot show locally
  (the logger is fixed at `info`), and whether a fetch transport error ever includes request headers was
  **read from code, not proven** with a real network failure.

### Where the rest went — task `0296` (Sprint 5)

**D1 → A1, D2 → A2, D3 → A3, D4 + step 6's production half → A4.** Section A runs after the deploy window
in which the token is deployed **non-empty** (owner ruling 2026-09-19). The step text, including D1's
verdict-only script, **stays in this task's `worklog.md`**; results are recorded in `0296`, not here.
See [[decisions/sprint-5]] and [[systems/weekend-deploy-window]] (steps W11, W13, W14).

### ⚠️ The deploy-time forget-risk — carried to the top of `0296`, still standing

`deploy.sh` forwards **whatever** the local shell holds, correctly. A production deploy with a non-empty
local value **turns profile upsert and XP crediting on in production.** Blanking it is a **manual step
with no automated guard** — `npm run check:config-parity` compares variable **names only** and cannot
see a value. `0054`'s flag hides the **card** but does **not** stop server-side crediting.

🔴 **RULED 2026-09-04 — NO GUARD WILL BE BUILT.** Owner, verbatim: *"Neither — I'll just remember."*
Both an automated guard and a checklist item were offered and declined. ⛔ **A decision, not an
oversight — do not file a task for it and do not re-recommend one.** The risk is **accepted, not
removed**; the manual step is the control.

### Rulings this close superseded, kept as the record

- **2026-09-04 — "stays in Sprint 4"**, given over the producer's recommendation to move it to Backlog.
  **Superseded 2026-09-23** by the close.
- The wiki's own 2026-09-04 reading on [[decisions/config-parity-failure-class]] — that this task *"can
  only be closed after `0215` … and `0217`"* — is **superseded by the owner's close**. ⚠️ The
  substance behind it is **not** gone: `0296` section A depends on `0217`.

### Downstream re-points, same ruling (2026-09-23)

- `0065`'s `0062` condition → **`0296` A2–A3**. `0065` still has **two** conditions (`0296`, `0195`) and
  stays `🚧 Blocked`.
- `0064`'s dependency on `0062` was **removed**, citing the 2026-09-02 ruling that `0062` gates only
  switching the guard **on**, not building it. `0064`'s own deploy-gated steps are unchanged.
- 📌 **Superseded later the same day and on 2026-09-24 (owner rulings):** `0296` **no longer gates
  `0065`** (*"Keep it in Sprint 5, but the task shouldn't block Sprint 4"*), and `0195`'s condition
  moved to `0297` — **`0065` now has NO task condition** (the go-live only, timed by the owner). `0064`'s
  deploy-gated step 8 moved to `0298` and `0064` **closed 2026-09-24** on Phase 2 — see
  [[tasks/deploy-time-config-parity-guard]]. 🚩 **The "blank the token by hand before a prod release"
  rule is RETIRED** (owner, 2026-09-23 amendment to `0064`, then *"Retire it"* 2026-09-24): a blank
  token now prints `REQUIRED` in the value guard. ⚠️ Still **no check that the value MATCHES the box's**
  other than the runbook's W11 step.
- `0017` and `0012` closed the same day — see [[tasks/citizenship-earned]] and [[tasks/personal-inbox]].

## Related

- [[decisions/config-parity-failure-class]] — the recurring class this is the sharpest instance of
- [[decisions/incident-2026-08-22-public-lobbies-outage]] — §9 of that incident record is where this was found
- [[systems/player-profile-store]] — the store whose crediting path this no-op switched off
- [[tasks/profile-match-end-crediting]] — the match-end crediting path (T6) that no-ops without the token
- [[decisions/adr-101-fail-soft-xp-crediting]] — why a missing token is silent: fail-soft, lost not queued
- [[tasks/citizenship-earned]] — task `0017`, closed the same day; its production tail moved to `0296` with this one's
- [[tasks/personal-inbox]] — task `0012`, closed the same day; same move
- [[tasks/hide-citizenship-card-flag]] — task `0054`, the card flag that hides the card but does NOT stop crediting
- [[tasks/prod-api-env-https-apex]] — task `0063`, the config-track item sequenced before this one
- [[tasks/yandex-payments-secret-forwarding]] — task `0195`, the same class on the profile pipeline
- [[systems/weekend-deploy-window]] — the window whose W11/W13/W14 carry this task's checks, now as `0296` A1–A4
- [[decisions/sprint-4]] — the board this task closed on
- [[decisions/sprint-5]] — where `0296`, which received the production checks, was filed
- [[tasks/deploy-time-config-parity-guard]] — task `0064`, the guard whose acceptance test is this task's defect; closed 2026-09-24, report-only, arming is `0298`'s
- [[tasks/profile-p2-wire-game-server]] — task `0217`, whose window ran this task's checks as `0296` A1–A4 on 2026-09-26
- [[tasks/citizenship-go-live]] — task `0065`, the citizenship go-live — `CITIZENSHIP_CARD_ENABLED` flipped, live in release `0.0.154` on 2026-09-26
