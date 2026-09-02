# Backlog — the default home for unsprinted task briefs

This is **not a sprint**. It is the board every task brief lands on when no sprint was named for it.

The filename is deliberately `backlog.md` and **not** `sprint-backlog.md`: `/fkit-status` finds the
active sprint by globbing `sprint-*.md`, and a board of explicitly unscheduled work must stay outside
that glob or it can be reported as the active sprint.

> ⚠️ **A second, older board exists** at [`sprint-backlog.md`](sprint-backlog.md) — ~23 entries of
> unsprinted work, and its filename *is* inside the glob. Task `0001` consolidates the two boards and
> retires it. Until that ships, **both files must be read** to see all unsprinted work.

The **Priority** column reads `—` for every row: this board is unranked by design. Needing a rank is
the signal to pull the task into a sprint.

## Status

| Status | Priority | Task | Brief |
|---|---|---|---|
| ✅ Done (agent-closed — not owner-verified) | — | Migrate `tasks/backlog/` to the fkit task-folder convention | [`0002-migrate-backlog-tasks-to-folders`](../tasks/done/0002-migrate-backlog-tasks-to-folders/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | — | Migrate `tasks/done/` and `tasks/cancelled/` to the fkit task-folder convention | [`0003-migrate-done-cancelled-tasks-to-folders`](../tasks/done/0003-migrate-done-cancelled-tasks-to-folders/brief.md) |
| 🔲 Backlog | — | Consolidate unsprinted work onto `backlog.md` and retire `sprint-backlog.md` | [`0001-consolidate-unsprinted-work-onto-backlog-board`](../tasks/backlog/0001-consolidate-unsprinted-work-onto-backlog-board/brief.md) |
| 🔲 Backlog | — | Reconcile legacy status markers in the sprint plans to the canonical vocabulary | [`0004-reconcile-legacy-status-markers-in-sprint-plans`](../tasks/backlog/0004-reconcile-legacy-status-markers-in-sprint-plans/brief.md) |
| 🔲 Backlog | — | `ADMIN_TOKEN`: fail closed on a missing secret, and compare in constant time *(prod verified clean 2026-08-10 — normal-priority hardening, not an incident)* | [`0005-admin-token-fail-closed-and-constant-time-compare`](../tasks/backlog/0005-admin-token-fail-closed-and-constant-time-compare/brief.md) |
| 🔲 Backlog | — | Investigation: `SLOW_TURN_THRESHOLD_MS` vs the 66.7 ms turn interval | [`0006-investigate-slow-turn-threshold-vs-turn-interval`](../tasks/backlog/0006-investigate-slow-turn-threshold-vs-turn-interval/brief.md) |
| 🔲 Backlog | — | Investigation: blast radius of the `src/core` → `src/client` imports | [`0007-investigate-core-to-client-import-coupling`](../tasks/backlog/0007-investigate-core-to-client-import-coupling/brief.md) |
| 🚧 Blocked — needs 0009 findings **and** the first paid entitlement (by design) | — | Migrate `PrivilegeRefresher` to fail-closed | [`0008-privilege-refresher-fail-closed-migration`](../tasks/backlog/0008-privilege-refresher-fail-closed-migration/brief.md) |
| 🔲 Backlog | — | Self-host the upstream OpenFront API dependency (findings phase) — **pull ahead of any cosmetics monetization work** | [`0009-self-host-upstream-openfront-api-dependency`](../tasks/backlog/0009-self-host-upstream-openfront-api-dependency/brief.md) |
| 🚧 Blocked — 0009 findings + payment infra + owner decision on the design set | — | Re-enable flags as a paid non-country cosmetic (Task 9) | [`0010-re-enable-flags-paid-non-country-cosmetic`](../tasks/backlog/0010-re-enable-flags-paid-non-country-cosmetic/brief.md) |
| 🚧 Blocked — 0009 findings + payment infra + owner rulings (pattern set, ad coupling) | — | Re-enable territory patterns (Task 9a) | [`0011-re-enable-territory-patterns`](../tasks/backlog/0011-re-enable-territory-patterns/brief.md) |
| 🔲 Backlog | — | Reconcile `## Sprint` field values in task briefs to a parseable form | [`0050-reconcile-sprint-field-values`](../tasks/backlog/0050-reconcile-sprint-field-values/brief.md) |
| 🔲 Backlog | — | Sweep the bare legacy task identities left behind by the `0002` migration | [`0051-sweep-bare-legacy-task-identities`](../tasks/backlog/0051-sweep-bare-legacy-task-identities/brief.md) |
| 🔲 Backlog | — | Wiki vault follow-up: legacy task filenames left stale by the folder migrations | [`0052-wiki-vault-legacy-filename-follow-up`](../tasks/backlog/0052-wiki-vault-legacy-filename-follow-up/brief.md) |
| 🔲 Backlog | — | Track the upstream `PLAN_SPRINT` resolution defect in fkit's `dashboard.sh` until a release fixes it *(handed to the fkit maintainer 2026-08-10 — not our fix to make)* | [`0053-fix-plan-sprint-name-resolution-in-dashboard`](../tasks/backlog/0053-fix-plan-sprint-name-resolution-in-dashboard/brief.md) |
| ➡️ Moved | — | Investigation: public-game routing can send games to a dead or unready worker → **Sprint 4** *(promoted 2026-08-22, hours after filing, when the owner ruled it runs before `0056`; tracked on [`plan-sprint-4.md`](plan-sprint-4.md) from here on)* | [`0057-investigate-worker-routing-to-dead-or-unready-workers`](../tasks/done/0057-investigate-worker-routing-to-dead-or-unready-workers/brief.md) |
| 🔲 Backlog | — | `Worker.ts`: a failed port bind leaves a silently hung worker — add `server.on("error")` *(latent defect; explicitly refuted as the 2026-08-22 cause)* | [`0058-worker-server-on-error-handler`](../tasks/backlog/0058-worker-server-on-error-handler/brief.md) |
| 🔲 Backlog | — | Precompile the server at image-build time instead of running `ts-node/esm` in production *(leading — unproven — hypothesis for **why** the worker died on 2026-08-22. **Owner-ruled 2026-08-23: stays here; the outage-track pause covers it.** Reasoning and a "re-raise only if" condition are recorded in the brief)* | [`0059-precompile-server-for-prod-instead-of-ts-node`](../tasks/backlog/0059-precompile-server-for-prod-instead-of-ts-node/brief.md) |
| 🔲 Backlog | — | Investigation: prod Telegram feedback delivery fails with `TypeError: fetch failed` *(§9 follow-up — the player feedback channel is **dead in production and fails silently**. ⚠️ The recorded "likely needs `TELEGRAM_PROXY_URL`" diagnosis is **disproven**: the proxy is wired (`Master.ts:217-218,319`) and forwarded (`deploy.sh:308`), so this is an investigation, not a known fix. Strongest promotion candidate on this board)* | [`0061-investigate-prod-telegram-feedback-delivery-failure`](../tasks/backlog/0061-investigate-prod-telegram-feedback-delivery-failure/brief.md) |
| ➡️ Moved | — | `PROFILE_INTERNAL_TOKEN` is never forwarded to production — the profile client silently no-ops → **Sprint 4** *(filed here 2026-08-23 with the blocking claim flagged unverified; **verified the same day — it blocks `0017` and `0018`** — and promoted. Tracked on [`plan-sprint-4.md`](plan-sprint-4.md) from here on)* | [`0062-forward-profile-internal-token-in-deploy`](../tasks/backlog/0062-forward-profile-internal-token-in-deploy/brief.md) |
| 🔲 Backlog | — | Product decision: auth strategy — JWT/Discord auth service vs Yandex-only identity *(from `0063`'s reframe: no auth service exists on this origin — no login routes, no JWT signing, JWKS URL serves the SPA HTML — so the Discord/token login UI is dead code. Decide: build an auth service someday, or commit to Yandex-only and remove the surface. Decision task → ADR)* | [`0069-auth-strategy-jwt-discord-vs-yandex-only`](../tasks/backlog/0069-auth-strategy-jwt-discord-vs-yandex-only/brief.md) |
| 🔲 Backlog | — | `TokenLoginModal` silent failure — restore user-facing error or remove the dead login UI *(from `0063`'s reframe; `TokenLoginModal.ts:73` alert commented out, failures silent. Restore-vs-remove follows the `0069` ruling)* | [`0070-token-login-modal-silent-failure`](../tasks/backlog/0070-token-login-modal-silent-failure/brief.md) |
| 🔲 Backlog | — | Map label density tuning at mid-zoom *(owner judged `0041`'s shipped labels too cluttered at mid-zoom — the tuning pass `0041`'s clutter flag anticipated; `src/client/` only, owner eyeball is the gate)* | [`0071-map-label-density-tuning-mid-zoom`](../tasks/backlog/0071-map-label-density-tuning-mid-zoom/brief.md) |
| ⛔ Cancelled (agent-closed — not owner-verified) (2026-08-24) — duplicate of 0064 (pre-existing, owner-ruled 2026-08-23, better-scoped); useful specifics merged into 0064 — owner-ruled 2026-08-24 | — | Deploy-time config guard — required env vars forwarded and well-formed | [`0072-deploy-time-config-guard`](../tasks/cancelled/0072-deploy-time-config-guard/brief.md) |
| 🔲 Backlog | — | Remove inert upstream HTML leftovers *(audit §H3 — commented `og:`/googletag/Publift fragments + dead Steam link; deletion-only; footer mentions stay per the `0066` ruling)* | [`0073-remove-inert-upstream-html-leftovers`](../tasks/backlog/0073-remove-inert-upstream-html-leftovers/brief.md) |
| 🔲 Backlog | — | Product decision: a private-lobby invite shared from the Yandex build takes the recipient OUTSIDE the portal iframe — portal-relative vs standalone invite *(from `0198`, which fixed the **path** on that same line and deliberately left the **host** question open. Research what Yandex supports for portal deep-linking + measure the off-portal session, then owner ruling → ADR. Also settles the `location.search` residual. Decision task; producer's rank, not an owner ruling)* | [`0199-yandex-invite-link-leaves-portal-iframe`](../tasks/backlog/0199-yandex-invite-link-leaves-portal-iframe/brief.md) |
| ➡️ Moved to [Sprint 4](plan-sprint-4.md) | — | Confirm and fix the `supertest` profile-server flake — 9 failures in 170 runs → **Sprint 4** *(filed here 2026-08-29 as the default home for an unsprinted brief and **promoted the same day, owner-ruled** via `AskUserQuestion` in the lead session, on the producer's recommendation — priority **Medium** was the producer's rank and the owner **confirmed rather than disturbed** it. Split out of `0197` under owner amendment **A4**. Promoted on the grounds that `0197`'s segfault is an **upstream V8 bug with no repository-side fix** while this one is in **our own test code at roughly ten times the rate**. Tracked on [`plan-sprint-4.md`](plan-sprint-4.md) from here on)* | [`0200-supertest-profile-server-flake-confirm-and-fix`](../tasks/done/0200-supertest-profile-server-flake-confirm-and-fix/brief.md) |
| 🔲 Backlog | — | Nothing runs the shell test harnesses — decide how to gate them so they cannot rot unnoticed *(from `0195`: `tests/scripts/profile-deploy-hardening.test.sh` was broken for ~2 months because no npm script, no `npm test` reach (`jest.config.ts:47` matches TS only), no git hook and **no CI at all** ever runs it. Frames the problem; the gate — npm script / `npm test` / pre-push / CI — is an **owner ruling at the plan gate**, and CI is a materially bigger change than the rest. Producer's rank, not an owner ruling)* | [`0201-gate-the-shell-test-harnesses-so-they-cannot-rot-unrun`](../tasks/backlog/0201-gate-the-shell-test-harnesses-so-they-cannot-rot-unrun/brief.md) |
| 🔲 Backlog | — | Deploy harness prints ✅ for assertions an early abort satisfies vacuously — close the false-green class *(13 vacuous ✅ lines across T1/T2/T3/T5/T6/T7/T9, verified on a clean worktree at `f2b9422`. ⚠️ **The filing claim did not fully hold** — T3/T6/T7/T9 already carry distinguishing-message assertions and those are what caught the breakage; no block was fully false-green, so the defect is **latent, not realized**, and the `0196` parallel is weaker than filed. Priority is **`Low` — an owner ruling of 2026-09-01**, superseding the producer's earlier Low–Medium rank; the task **stands and was NOT cancelled**, and this Backlog board placement is **owner-confirmed** the same day)* | [`0202-shell-harness-absence-assertions-pass-vacuously`](../tasks/backlog/0202-shell-harness-absence-assertions-pass-vacuously/brief.md) |

**Execution order** for the migration set is `0002 → 0003 → 0001 → 0004`, which is dependency order,
not ID order. `0005`–`0009` are independent of it and of each other.

⚠️ **`0057`–`0059` were filed 2026-08-22 from the production outage that took out all public
multiplayer lobbies.** The outage fix itself is in **Sprint 4** (`0055`, `0056`); these were the
follow-ups *not* needed to restore crash recovery, so they landed here unsprinted rather than
inflating the sprint. Full record:
[`incidents/2026-08-22-prod-public-lobbies-empty-outage.md`](../knowledge-base/incidents/2026-08-22-prod-public-lobbies-empty-outage.md).

**`0057` did not stay here.** Later the same day the owner ruled the readiness-gate quorum
(**18 of 20, 90-second deadline**) and ruled that **`0057` runs before `0056`** — the routing findings
are most useful while that quorum is committed but not yet built. That made `0057` a hard dependency
of a Sprint 4 task, so it was **promoted into Sprint 4**; an unranked, explicitly-unscheduled board is
the wrong place for a blocker on a sprint's critical path. Its row above is kept as `➡️ Moved` rather
than deleted, so the trail from "filed here" to "tracked there" survives.

Note for anyone reading the earlier framing: the misroute estimate was *1 in 20*. Under the ruled
18/20 quorum — which permits **two** missing indices — it is **up to 2 in 20 (~10%)**. `0057` sizes it.

**`0059`** stays here, and remains the only item on the board that might *remove* the 2026-08-22 crash
rather than survive it. Whether it gets pulled into a sprint is an open owner call.

`0008` is **deliberately blocked** on two conditions, not one: `0009`'s findings, **and** the first
paid entitlement going live (paid citizenship, Task 9 flags, or Task 9a patterns). It is the
pre-committed migration from the owner's `adr-102` ruling, filed now so the commitment is a scheduled
task rather than a promise inside a document.

⚠️ **`0009` grew teeth on 2026-08-09.** Cosmetic entitlements (`flares`) come from the **upstream
OpenFront API**, not from Geoconflict's own infrastructure — so it blocks the cosmetics monetization
path, not just the archive task. The board is unranked by design, so there is no rank to raise; the
owner's ruling is that `0009` is **pulled into a sprint ahead of any cosmetics monetization work**,
and that ordering takes effect at pull time.

IDs were allocated when each brief was written; ordering lives in each brief's `**Depends on:**` line.

## The cosmetics monetization chain

`0010` (flags) and `0011` (patterns) are the **root** of a dependency chain that two later sprints
already assume is done:

```
0009 (entitlement origin)  →  0010 flags + 0011 patterns
                                   ↓
                    Sprint 5 Task 8a (nickname styling)
                    Sprint 5 Task 15 (custom uploaded flags/patterns)
                                   ↓
                    Sprint 6 paid map packs (purchase surface)
```

Until 2026-08-09 neither root had a brief, a sprint, or an owner — the chain rested on nothing.
`plan-index.md:87-88` assigns both to Sprint 4, but neither appears in the Sprint 4 plan document.
Both are now briefed and blocked, which is honest; previously they were invisible.

## Provenance

`0001`–`0004` were written during project initiation (2026-08-08). `0005`–`0011` came out of the
open-questions interview and its follow-ups on 2026-08-09, each authorised by an owner ruling
recorded in that session.

`0050`–`0052` surfaced during task `0002` (the `tasks/backlog/` folder migration) and were
owner-approved for briefing on 2026-08-10. They are the migration's three recorded residuals:
`0050` the unparseable `## Sprint` field, `0051` the bare legacy identities in the knowledge-base,
`0052` the wiki-vault references the migration deliberately excluded (plan decision D3).

`0051` and `0052` both **depend on `0003`** and are not pullable until it lands. `0052`'s ordering was
an open question when it was drafted; the owner ruled on **2026-08-10** that it runs **after `0003`**,
in one pass covering both migrations — so it now covers `0003`'s renames too, not just `0002`'s.

`0069`–`0070` were filed 2026-08-24 from `0063`'s owner-accepted reframe (see that task's worklog):
`0069` is the product decision the reframe surfaced (auth service vs Yandex-only identity), `0070` the
split-out silent-failure fix whose direction depends on it. Neither gates anything in Sprint 4 —
`0063`'s in-sprint scope proceeds regardless.

`0071`–`0073` were filed 2026-08-24 from the open-questions interview's owner rulings (relayed via
the lead session): `0071` the mid-zoom label-density tuning the owner asked for after judging
`0041`'s shipped labels too cluttered; `0072` the deploy-time config guard answering the
`0062`/`0063` silent-misconfig pattern — **cancelled the same day, owner-ruled: it duplicated the
pre-existing, board-invisible `0064-deploy-time-config-parity-guard`; its two useful specifics were
merged into `0064`'s brief**; `0073` the `0025` audit's §H3 inert-leftover cleanup. The
same interview also produced a no-task ruling recorded in `0066`'s brief Notes (standalone footer's
upstream mentions KEPT; no new upstream-brand mentions). None of the three gates anything in Sprint 4.
