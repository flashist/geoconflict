# Config-Parity Failure Class — A Variable That Never Reaches Production

**Date**: 2026-08-28
**Status**: accepted

> This page records a **recurring failure class**, not a single defect. Three instances are confirmed.
>
> 🔧 **UPDATED 2026-08-30.** This line previously ended *"None of the three is fixed in production at the time of writing."* **That is no longer true of `0063`**, which shipped in release `362a2f9` and was measured live. `0062` and `0195` remain unfixed — and `0062`'s variable was **deliberately left blank for that release by the owner**, so the class's signature symptom (a value that never arrives, and nothing says so) is still present in production **by choice** rather than by accident.
>
> 🔧 **UPDATED 2026-09-02.** `0195`'s **repository fix shipped 2026-09-01** and the task closed. ⚠️ **That is not a production fix, and it is not a blocker clearing.** It shipped as **built + Deferred Live Tail**: the value `0014` has not yet issued still does not exist, so a profile deploy carried out today lands the variable **empty** and every `/v1/payments/*` route correctly keeps returning 503. `0065`'s gate count is **unchanged at three** — `0195` is a gate now **satisfied, not removed**. **All three instances of this class have now shipped a fix, and NONE of the three is demonstrated working in production**: `0063` is deployed and evidenced, `0062` is deployed with the variable deliberately blank, `0195` is not deployed at all. **`0060`, the last item on the execution order, shipped 2026-09-01 too — also repo-only.**

## Context

The class statement comes from `0064`'s brief and holds unchanged: **production configuration does not match what the application needs, and nothing says so.** A deploy script omits a variable, the on-box template writes it empty through a `${VAR:-}` default, and the application then fails closed or no-ops exactly as designed — correctly, quietly, and invisibly.

Three instances, all Sprint 4:

| Task | The variable | What it breaks | Pipeline | State (2026-08-30) |
|---|---|---|---|---|
| `0062` | `PROFILE_INTERNAL_TOKEN` never forwarded by `deploy.sh` | Profile writes silently no-op in prod — no profile row created, no XP credited. The miss is logged at `debug`, invisible in prod logs; the profile server independently fails closed | game server | **OPEN.** The one-line `deploy.sh` fix shipped in `362a2f9` but has **never been exercised** — the owner deliberately left the token **blank** for this release, so `ProfileApiClient.isConfigured()` is false and every profile call still no-ops. Citizenship stayed dark **by design**, not by defect |
| `0063` | `PUBLIC_PROTOCOL` / `API_BASE_URL` / `JWT_ISSUER` forwarded but carrying `http` on a raw IP | Prod `/api/env` advertised an unusable origin on an `https` site | game server | ✅ **FIXED, DEPLOYED AND — as of 2026-08-30 — FULLY EVIDENCED** in `362a2f9`; live `/api/env` measured on the apex domain over `https`, and the last outstanding pending was discharged in Uptrace: grouping on the `openfront_host` attribute shows the raw-IP host value stopping 19 seconds before the new master booted, and only the apex domain afterwards. ⚠️ **The close still preceded that evidence** — four of six pendings were unevidenced when the task moved to `done/`. See [[tasks/prod-api-env-https-apex]] — and note its reframe: no auth service exists in this deployment, so the "token login never completes" symptom was **vacuous**, though the config was wrong and is now right |
| `0195` | `YANDEX_PAYMENTS_SECRET` never forwarded by `build-deploy-profile.sh` | **Every `/v1/payments/*` route returns `503 {"error":"payments_unavailable"}` on the real box** — true since `0019` shipped | **profile server** | **SHIPPED IN THE REPO 2026-09-01, NOT FIXED IN PRODUCTION.** Two edits: the variable joins the staged-export block, and `example.env.profile` documents it. Closed as **built + Deferred Live Tail** (owner ruling R3) with **D1–D3 unchecked**, gated on `0014` **and** the pending profile deploy. **A profile deploy today lands it empty and the routes correctly keep 503ing.** See [[tasks/yandex-payments-secret-forwarding]] |

> ⚠️ **`0062` is the sharpest lesson this page has to offer, and it is a new one.** A shipped fix and a working configuration are different things. The deploy script now forwards the variable; the variable is empty; the observable production behaviour is **byte-for-byte what the unfixed pipeline produced**. Reading the deploy diff would show a fix. Reading production would show the bug. That is exactly the gap `0064` exists to close — and it is why `0064`'s check must assert **non-empty**, never merely **present**.

**`0195`'s shape difference is the reason this page exists.** `0062` was a game-server pipeline gap; `0195` is a profile-server pipeline gap. The class has now bitten in **both deploy pipelines independently**, so it is not a `deploy.sh` bug — it is a property of how this project ships configuration.

`0195` was found 2026-08-28 during `0067`'s build and owner-approved the same day as **its own task** rather than a one-line fix folded into `0067`'s review round, on the grounds that it is a live money path deserving its own verification.

## Decision

**`0064` — deploy-time config parity guard — is the mechanism that catches this class.** It already covers the profile pipeline (merged from the cancelled `0072`), so `0195` adds no scope to it; it adds a third data point and the first evidence outside `deploy.sh`.

**Hard sequencing, and it runs both ways.** `0064` must land **after** `0062`, `0063` and `0195`, or it correctly fails the very deploy that carries their fixes. Arming the guard on a known gap blocks the fix for that gap.

**`0195`'s specific input to `0064`:** `YANDEX_PAYMENTS_SECRET` must go on the guard's allowlist **as explicitly optional, with the reason recorded, until `0014` issues the key**, and be flipped to required afterwards. Getting this backwards in either direction is harmful — marked required today, the guard fails every profile deploy on a variable nobody can yet supply; left unlisted forever, the guard never catches the defect it was built for.

**Loudness was considered and deliberately left alone.** `0062`'s lesson was that a `debug`-level miss is invisible; `0195`'s warn is a level better, but it fires once at startup and never again, so a deploy that quietly loses a value looks identical to one that never had it. The recommendation of record is to leave the log level alone and let `0064` be the mechanism.

## Consequences

- **Fail-closed is working correctly in all three cases. That is the point.** The application is not broken; the configuration never arrived. This class cannot be found by reading application code, and **reading the deploy diff is not verification** — a variable that "looks forwarded" is precisely how it hides. `0195`'s own verification insists on confirming the on-box value is **non-empty, not merely present**, because a variable forwarded but unset locally still lands empty, which is the same bug with the fix applied.
- **`0195` blocks `0065`** (paid citizenship live verification): its steps 1–4 all drive `/v1/payments/*`, and every one would return 503 today with no clue why beyond a single `warn` line in the container log. ⚠️ **`0195`'s 2026-09-01 ship does NOT reduce `0065`'s blocker count.** Owner-ruled: the board row still states **three** conditions (`0014`, `0062`, `0195`), because the routes 503 today for the same observable reason — `0014` has not issued the per-game key, so the value lands empty on the box. **A gate satisfied is not a gate removed.**
- **`0062` blocks the whole citizenship go-live** — `0017`'s Deferred Live Tail and `0065` both wait on it. Without a profile row there is no purchase to attach, which is why `0195` ranks below `0062` rather than above it.
- **No player sees a broken purchase today**, because `0054`'s client flag hides the citizenship card by default and `0018` has not gone live. The damage is entirely to the go-live path.
- **`0014` is the upstream fact for `0195`.** Until Yandex issues the per-game secret key, the correct configured state for that variable is absent/empty and 503 is the correct behavior. Fixing the plumbing first means the key is not blocked on a deploy-script change when it arrives.
- **The operator-facing template is the second half of `0195`'s gap.** `example.env.profile` does not mention the variable anywhere, so an operator doing everything right has no way to learn it is a deploy input.
- **Execution order, owner-ruled 2026-08-28** — `0198` → `0063` → `0062` → `0195` → `0064` → `0060`, with `0198` above the whole config track because it was failing for players at the time of the ruling. **Its first two items are now discharged in production** (release `362a2f9` carries both `0198`'s fix and `0063`'s config), leaving `0062` → `0195` → `0064` → `0060`. 🔧 **Updated 2026-09-02: `0195` and `0060` have both shipped in the repository** (2026-09-01, both agent-closed and neither owner-verified, and **neither deployed**), so **`0064` is the only unstarted item on this order** — and its own hazard still stands: it must not arm until the fixes it would fail on have actually reached production. See [[tasks/container-log-retention]]. `0198` **closed 2026-08-30** on local proof only; `0063`'s evidence completed the same day. See [[tasks/private-lobby-start-url]] and [[decisions/windoworigin-url-join-defect]].
- **The `0064` sequencing hazard is now half-relieved, and half sharper.** `0064` still cannot arm before `0062` and `0195` land or it correctly fails the deploy carrying their fixes. But `0062`'s plumbing already shipped with an intentionally empty value, so **a naive presence check would pass today on a variable that is doing nothing** — the "non-empty, not merely present" requirement moved from a nicety to the thing that decides whether the guard works at all.

## Related

- [[decisions/incident-2026-08-22-public-lobbies-outage]] — the config-drift sweep that first surfaced `0062`/`0063`/`0060`
- [[systems/player-profile-store]] — the profile API whose crediting path `0062` no-ops and whose payments routes `0195` 503s
- [[systems/configuration]] — `/api/env`, runtime public settings, and the deploy-environment plumbing this class breaks
- [[tasks/citizenship-name-change]] — task `0067`, during whose build `0195` was found
- [[tasks/yandex-payments-implementation]] — task `0019`, which introduced `YANDEX_PAYMENTS_SECRET` and its fail-closed 503
- [[decisions/windoworigin-url-join-defect]] — task `0198`, which rode the same production deploy as `0062`/`0063`
- [[tasks/private-lobby-start-url]] — task `0198`'s close: unlike `0063`, it got **no** production evidence at all, because its check is unsatisfiable
- [[tasks/prod-api-env-https-apex]] — task `0063`, the one instance of this class fixed and deployed
- [[tasks/yandex-payments-secret-forwarding]] — task `0195`, the third instance: repo fix shipped 2026-09-01, production untouched
- [[tasks/container-log-retention]] — task `0060`, the last item on the execution order, also shipped repo-only 2026-09-01
- [[decisions/sprint-4]] — the sprint board carrying the config track
