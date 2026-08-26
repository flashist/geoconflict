# Worklog — Task 0003: Migrate `tasks/done/` and `tasks/cancelled/` to the task-folder convention

Build run by a spawned `@fkit-coder` on 2026-08-25 under a declared owner approval relayed from the
lead session (plan approved as returned; D1–D7 all option A). Scope: plan §7 steps 1–7.

**Nothing is committed.** All work is in the working tree. `HEAD` at start and end: `2d1135c`.

⚠️ The approval this build ran under is **declared prose** (coordinator relay of an owner ruling in the
lead session). This spawn cannot verify it; it is stated, not asserted as proof (ADR-021 / ADR-032).

---

## What was done

| Plan step | Result |
|---|---|
| §7.1 Freeze map | Regenerated from git independently, diffed against the approved §1 table with the D3 shift applied — **118/118 rows identical** (IDs and slugs). Frozen to `map.tsv`; every later step read only that file. |
| §7.2 `git mv` | **118 briefs** → `<board>/<NNNN>-<slug>/brief.md` + the hf11a plan doc → `done/0110-stale-build-investigation/plan.md` (D3). **119 staged as `R100`** (exact renames). |
| §7.3 Insert fields | `## ID` / `## Status` / `## Owner` added to all 118. Anchors: after `## Priority` ×80, after `## Sprint` ×1, right after `## ID` ×34 (no Sprint/Priority heading), D4 additions-only ×3. |
| §7.4 Rewrite references | **271 lines in 89 files** (R1–R5). `wiki-vault/` untouched. |
| §7.5 Hand review | Every changed line in `reviews/`, `src/`, `profile-backup.sh`, the skill doc, and every alias rewrite read by eye — all correct; the review-ledger path at `reviews/s4-postgres-backup-routine-coder-handoff.md:6` survives untouched. 49 changed sprint-plan table rows, **0 Status-cell changes** (scripted guard). |
| §7.6 Verify | Run in full; output pasted below. **12 of 13 pass; V10 fails on 8 links that were already broken at `HEAD`** (wrong `../` depth in `sprints/done/plan-sprint-4c.md`) — stopped, not improvised (see D-7). |
| §7.7 This worklog | Written; hand-off lists below. |

### Working-tree shape (`git status --porcelain`)

- `R ` ×1 — `0110-stale-build-investigation/plan.md` (rename only, byte-identical)
- `RM` ×118 — the migrated briefs (rename staged, field/link edits unstaged)
- ` M` ×54 — reference rewrites outside the 118 (sprints 6, knowledge-base 16, reviews 11, backlog briefs 11, done folders 4, `src/core/profile/*.ts` 4, `profile-backup.sh`, `.claude/skills/update-announcements/SKILL.md`)
- `??` ×2 — this task's `plan.md` and `worklog.md`

---

## The frozen map (authoritative post-D3 IDs)

| ID | board | add-date | legacy file | new path |
|---|---|---|---|---|
| 0074 | done | 2026-02-23 | `feature_spec_ai_players_standalone.md` | `done/0074-ai-players-standalone/brief.md` |
| 0075 | done | 2026-02-26 | `task-01-analytics.md` | `done/0075-analytics/brief.md` |
| 0076 | done | 2026-02-26 | `task-02-crash-reconnection.md` | `done/0076-crash-reconnection/brief.md` |
| 0077 | done | 2026-02-26 | `task-02a-reconnection-analytics.md` | `done/0077-reconnection-analytics/brief.md` |
| 0078 | done | 2026-02-27 | `task-02b-feedback-button.md` | `done/0078-feedback-button/brief.md` |
| 0079 | done | 2026-02-27 | `task-02c-device-environment-info.md` | `done/0079-device-environment-info/brief.md` |
| 0080 | done | 2026-02-28 | `task-02d-additional-analytics-events.md` | `done/0080-additional-analytics-events/brief.md` |
| 0081 | done | 2026-02-28 | `task-02e-performance-monitoring.md` | `done/0081-performance-monitoring/brief.md` |
| 0082 | done | 2026-02-28 | `task-02f-device-type-analytics.md` | `done/0082-device-type-analytics/brief.md` |
| 0083 | done | 2026-02-28 | `task-02g-new-returning-player.md` | `done/0083-new-returning-player/brief.md` |
| 0084 | done | 2026-03-01 | `task-02h-sentry.md` | `done/0084-sentry/brief.md` |
| 0085 | done | 2026-03-02 | `task-03-mobile-quick-wins.md` | `done/0085-mobile-quick-wins/brief.md` |
| 0086 | done | 2026-03-04 | `task-02j-spawn-anomaly-investigation.md` | `done/0086-spawn-anomaly-investigation/brief.md` |
| 0087 | done | 2026-03-07 | `task-04-tutorial.md` | `done/0087-tutorial/brief.md` |
| 0088 | done | 2026-03-07 | `task-04a-auto-spawn.md` | `done/0088-auto-spawn/brief.md` |
| 0089 | done | 2026-03-07 | `task-04c-auto-expansion.md` | `done/0089-auto-expansion/brief.md` |
| 0090 | done | 2026-03-07 | `task-04e-spawn-indicator.md` | `done/0090-spawn-indicator/brief.md` |
| 0091 | done | 2026-03-07 | `task-zoom-to-territory.md` | `done/0091-zoom-to-territory/brief.md` |
| 0092 | done | 2026-03-08 | `task-experiment-analytics.md` | `done/0092-experiment-analytics/brief.md` |
| 0093 | done | 2026-03-09 | `hotfix-hf3-ui-tap-analytics.md` | `done/0093-ui-tap-analytics/brief.md` |
| 0094 | done | 2026-03-09 | `hotfix-hf4-control-panel-hit-area.md` | `done/0094-control-panel-hit-area/brief.md` |
| 0095 | done | 2026-03-09 | `hotfix-tutorial-skip-visibility.md` | `done/0095-tutorial-skip-visibility/brief.md` |
| 0096 | cancelled | 2026-03-10 | `hotfix-hf5-win-condition-bug.md` | `cancelled/0096-win-condition-bug/brief.md` |
| 0097 | done | 2026-03-13 | `hotfix-hf7-build-number.md` | `done/0097-build-number/brief.md` |
| 0098 | done | 2026-03-13 | `hotfix-hf8-tutorial-attempt-count.md` | `done/0098-tutorial-attempt-count/brief.md` |
| 0099 | done | 2026-03-18 | `hotfix-hf9-remove-refresh-push.md` | `done/0099-remove-refresh-push/brief.md` |
| 0100 | done | 2026-03-28 | `hotfix-hf10-cache-busting.md` | `done/0100-cache-busting/brief.md` |
| 0101 | done | 2026-04-07 | `investigation-server-logging.md` | `done/0101-investigation-server-logging/brief.md` |
| 0102 | done | 2026-04-07 | `task-autospawn-bug-investigation.md` | `done/0102-autospawn-bug-investigation/brief.md` |
| 0103 | done | 2026-04-07 | `task-feedback-match-ids-simple.md` | `done/0103-feedback-match-ids-simple/brief.md` |
| 0104 | done | 2026-04-07 | `task-server-performance.md` | `done/0104-server-performance/brief.md` |
| 0105 | done | 2026-04-07 | `task-uptrace-setup.md` | `done/0105-uptrace-setup/brief.md` |
| 0106 | done | 2026-04-08 | `task-humans-vs-nations.md` | `done/0106-humans-vs-nations/brief.md` |
| 0107 | done | 2026-04-09 | `5d-b-task-server-performance.md` | `done/0107-5d-b-server-performance/brief.md` |
| 0108 | done | 2026-04-09 | `5d-c-task-telemetry-knowledge-base.md` | `done/0108-telemetry-knowledge-base/brief.md` |
| 0109 | done | 2026-04-09 | `task-5d-a-server-metrics.md` | `done/0109-server-metrics/brief.md` |
| 0110 | done | 2026-04-10 | `hf11a-hotfix-stale-build-investigation.md` | `done/0110-stale-build-investigation/brief.md` |
| 0111 | done | 2026-04-10 | `hf11b-hotfix-version-endpoint.md` | `done/0111-version-endpoint/brief.md` |
| 0112 | done | 2026-04-10 | `hf11c-hotfix-stale-build-detection.md` | `done/0112-stale-build-detection/brief.md` |
| 0113 | done | 2026-04-10 | `hf11d-hotfix-stale-build-modal.md` | `done/0113-stale-build-modal/brief.md` |
| 0114 | cancelled | 2026-04-10 | `hf11e-hotfix-build-number-automation.md` | `cancelled/0114-build-number-automation/brief.md` |
| 0115 | done | 2026-04-10 | `hf12-hotfix-spawn-camera-timing.md` | `done/0115-spawn-camera-timing/brief.md` |
| 0116 | done | 2026-04-17 | `hf13-hotfix-map-preload.md` | `done/0116-map-preload/brief.md` |
| 0117 | done | 2026-04-17 | `s4-ai-lobby-slot-bug.md` | `done/0117-ai-lobby-slot-bug/brief.md` |
| 0118 | done | 2026-04-18 | `s3-investigation-ui-click-multiplayer.md` | `done/0118-investigation-ui-click-multiplayer/brief.md` |
| 0119 | cancelled | 2026-04-18 | `s4-nations-balance-task.md` | `cancelled/0119-nations-balance/brief.md` |
| 0120 | cancelled | 2026-04-18 | `s4-tutorial-action-pause.md` | `cancelled/0120-tutorial-action-pause/brief.md` |
| 0121 | done | 2026-04-18 | `s4-tutorial-build-menu-lock.md` | `done/0121-tutorial-build-menu-lock/brief.md` |
| 0122 | done | 2026-04-18 | `s4-tutorial-no-nations.md` | `done/0122-tutorial-no-nations/brief.md` |
| 0123 | done | 2026-04-18 | `s4-tutorial-reduce-bots.md` | `done/0123-tutorial-reduce-bots/brief.md` |
| 0124 | done | 2026-04-18 | `sprint4-investigation-player-store.md` | `done/0124-investigation-player-store/brief.md` |
| 0125 | done | 2026-04-18 | `sprint4-investigation-yandex-payments.md` | `done/0125-investigation-yandex-payments/brief.md` |
| 0126 | done | 2026-04-19 | `8d-a-task-global-announcements.md` | `done/0126-global-announcements/brief.md` |
| 0127 | done | 2026-04-20 | `s4-email-subscribe-task.md` | `done/0127-email-subscribe/brief.md` |
| 0128 | done | 2026-04-21 | `s4-legal-vat-investigation.md` | `done/0128-legal-vat-investigation/brief.md` |
| 0129 | done | 2026-04-21 | `sec00-incident-index.md` | `done/0129-incident-index/brief.md` |
| 0130 | done | 2026-04-21 | `sec01-immediate-containment.md` | `done/0130-immediate-containment/brief.md` |
| 0131 | done | 2026-04-21 | `sec02-registry-image-exposure-audit.md` | `done/0131-registry-image-exposure-audit/brief.md` |
| 0132 | done | 2026-04-21 | `sec03-vps-access-audit-and-hardening.md` | `done/0132-vps-access-audit-and-hardening/brief.md` |
| 0133 | done | 2026-04-21 | `sec04-repo-build-context-hardening.md` | `done/0133-repo-build-context-hardening/brief.md` |
| 0134 | done | 2026-04-21 | `sec05-deployment-credential-model-hardening.md` | `done/0134-deployment-credential-model-hardening/brief.md` |
| 0135 | done | 2026-04-21 | `sec06-clean-rebuild-redeploy-and-validation.md` | `done/0135-clean-rebuild-redeploy-and-validation/brief.md` |
| 0136 | done | 2026-04-21 | `sec07-postmortem-wiki-and-follow-ups.md` | `done/0136-postmortem-wiki-and-follow-ups/brief.md` |
| 0137 | done | 2026-04-21 | `sec08-ci-docker-secret-boundary-check.md` | `done/0137-ci-docker-secret-boundary-check/brief.md` |
| 0138 | done | 2026-04-21 | `sec09-registry-visibility-and-image-retention-policy.md` | `done/0138-registry-visibility-and-image-retention-policy/brief.md` |
| 0139 | done | 2026-04-22 | `s4-start-screen-redesign-investigation.md` | `done/0139-start-screen-redesign-investigation/brief.md` |
| 0140 | done | 2026-04-28 | `s4-solo-win-condition-fix.md` | `done/0140-solo-win-condition-fix/brief.md` |
| 0141 | done | 2026-04-28 | `s4-telegram-link.md` | `done/0141-telegram-link/brief.md` |
| 0142 | done | 2026-04-29 | `s4-missions-difficulty-investigation.md` | `done/0142-missions-difficulty-investigation/brief.md` |
| 0143 | done | 2026-04-29 | `s4-nuke-trajectory-visibility.md` | `done/0143-nuke-trajectory-visibility/brief.md` |
| 0144 | done | 2026-04-29 | `s4-teams-mode-max-teams.md` | `done/0144-teams-mode-max-teams/brief.md` |
| 0145 | done | 2026-04-29 | `s4-vk-link.md` | `done/0145-vk-link/brief.md` |
| 0146 | done | 2026-04-30 | `analytics-p0-game-mode-segmentation.md` | `done/0146-analytics-p0-game-mode-segmentation/brief.md` |
| 0147 | done | 2026-04-30 | `analytics-p0-match-duration.md` | `done/0147-analytics-p0-match-duration/brief.md` |
| 0148 | done | 2026-04-30 | `analytics-p0-spawn-confirmation.md` | `done/0148-analytics-p0-spawn-confirmation/brief.md` |
| 0149 | done | 2026-05-02 | `analytics-p0-player-days-played.md` | `done/0149-analytics-p0-player-days-played/brief.md` |
| 0150 | done | 2026-05-02 | `analytics-p0-session-match-count.md` | `done/0150-analytics-p0-session-match-count/brief.md` |
| 0151 | done | 2026-05-02 | `analytics-p0-yandex-login-status.md` | `done/0151-analytics-p0-yandex-login-status/brief.md` |
| 0152 | done | 2026-05-05 | `investigate-clans-system.md` | `done/0152-investigate-clans-system/brief.md` |
| 0153 | done | 2026-05-05 | `sprint4b-duos-trios-quads.md` | `done/0153-duos-trios-quads/brief.md` |
| 0154 | done | 2026-05-05 | `sprint4b-mini-mode-investigation.md` | `done/0154-mini-mode-investigation/brief.md` |
| 0155 | done | 2026-05-06 | `sprint4b-compact-map-rotation.md` | `done/0155-compact-map-rotation/brief.md` |
| 0156 | done | 2026-05-06 | `sprint4b-weird-setting-modifier.md` | `done/0156-weird-setting-modifier/brief.md` |
| 0157 | done | 2026-05-07 | `s4c-fix-cosmetics-serving.md` | `done/0157-fix-cosmetics-serving/brief.md` |
| 0158 | done | 2026-05-08 | `s4c-fix-local-server-hash-guard.md` | `done/0158-fix-local-server-hash-guard/brief.md` |
| 0159 | done | 2026-06-01 | `s4c-reduce-archive-telemetry-noise.md` | `done/0159-reduce-archive-telemetry-noise/brief.md` |
| 0160 | cancelled | 2026-06-02 | `s4c-fix-compact-map-boat-attack.md` | `cancelled/0160-fix-compact-map-boat-attack/brief.md` |
| 0161 | done | 2026-06-02 | `s4c-leaderboard-player-count.md` | `done/0161-leaderboard-player-count/brief.md` |
| 0162 | done | 2026-06-03 | `s4c-disable-compact-public-maps.md` | `done/0162-disable-compact-public-maps/brief.md` |
| 0163 | done | 2026-06-03 | `s4c-investigate-lobby-map-fetch.md` | `done/0163-investigate-lobby-map-fetch/brief.md` |
| 0164 | done | 2026-06-04 | `s4c-enable-client-source-maps.md` | `done/0164-enable-client-source-maps/brief.md` |
| 0165 | done | 2026-06-11 | `s4-feedback-modal-space-key.md` | `done/0165-feedback-modal-space-key/brief.md` |
| 0166 | done | 2026-06-12 | `s4-start-screen-redesign-impl.md` | `done/0166-start-screen-redesign-impl/brief.md` |
| 0167 | done | 2026-06-13 | `s4-app-bootstrap-single-entry-point.md` | `done/0167-app-bootstrap-single-entry-point/brief.md` |
| 0168 | done | 2026-06-13 | `s4-profile-01-schema-contract.md` | `done/0168-profile-01-schema-contract/brief.md` |
| 0169 | cancelled | 2026-06-13 | `s4-profile-02-guest-localstorage.md` | `cancelled/0169-profile-02-guest-localstorage/brief.md` |
| 0170 | done | 2026-06-13 | `s4-profile-03-yandex-identity.md` | `done/0170-profile-03-yandex-identity/brief.md` |
| 0171 | cancelled | 2026-06-13 | `s4-profile-07-guest-migration.md` | `cancelled/0171-profile-07-guest-migration/brief.md` |
| 0172 | done | 2026-06-14 | `s4-profile-04-backend-infra.md` | `done/0172-profile-04-backend-infra/brief.md` |
| 0173 | done | 2026-06-19 | `s4-profile-04a-server-skeleton.md` | `done/0173-profile-04a-server-skeleton/brief.md` |
| 0174 | done | 2026-06-19 | `s4-profile-04b-client-api-url-config.md` | `done/0174-profile-04b-client-api-url-config/brief.md` |
| 0175 | done | 2026-06-19 | `s4-profile-04c-dockerfile.md` | `done/0175-profile-04c-dockerfile/brief.md` |
| 0176 | done | 2026-06-20 | `s4-profile-04d-vps-provisioning.md` | `done/0176-profile-04d-vps-provisioning/brief.md` |
| 0177 | done | 2026-06-21 | `s4-profile-04e1-build-push-digest.md` | `done/0177-profile-04e1-build-push-digest/brief.md` |
| 0178 | done | 2026-06-22 | `s4-profile-04e-deploy-mechanics.md` | `done/0178-profile-04e-deploy-mechanics/brief.md` |
| 0179 | done | 2026-06-22 | `s4-profile-04e2-onbox-stack-gate.md` | `done/0179-profile-04e2-onbox-stack-gate/brief.md` |
| 0180 | done | 2026-06-22 | `s4-profile-04e3-deploy-wiring-milestone.md` | `done/0180-profile-04e3-deploy-wiring-milestone/brief.md` |
| 0181 | done | 2026-06-23 | `s4-profile-04f-image-secret-scan.md` | `done/0181-profile-04f-image-secret-scan/brief.md` |
| 0182 | done | 2026-06-23 | `s4-profile-04i-server-bring-up-runbook.md` | `done/0182-profile-04i-server-bring-up-runbook/brief.md` |
| 0183 | done | 2026-06-24 | `s4-profile-04g-argv-concurrency-hardening.md` | `done/0183-profile-04g-argv-concurrency-hardening/brief.md` |
| 0184 | done | 2026-06-24 | `s4-profile-04h-game-server-deploy-env.md` | `done/0184-profile-04h-game-server-deploy-env/brief.md` |
| 0185 | done | 2026-06-25 | `s4-profile-05-backend-db-api.md` | `done/0185-profile-05-backend-db-api/brief.md` |
| 0186 | done | 2026-06-26 | `s4-personal-data-compliance-investigation.md` | `done/0186-personal-data-compliance-investigation/brief.md` |
| 0187 | cancelled | 2026-06-28 | `s4-profile-hash-player-ids.md` | `cancelled/0187-profile-hash-player-ids/brief.md` |
| 0188 | done | 2026-06-29 | `s4-profile-06-match-end-crediting.md` | `done/0188-profile-06-match-end-crediting/brief.md` |
| 0189 | done | 2026-07-01 | `s4-postgres-backup-routine.md` | `done/0189-postgres-backup-routine/brief.md` |
| 0190 | done | 2026-07-02 | `s4-citizenship-card-guest-cta-no-sdk.md` | `done/0190-citizenship-card-guest-cta-no-sdk/brief.md` |
| 0191 | done | 2026-07-02 | `s4-citizenship-xp-progress-ui.md` | `done/0191-citizenship-xp-progress-ui/brief.md` |
| — | done | 2026-04-10 | `hf11a-hotfix-stale-build-investigation-plan.md` | `done/0110-stale-build-investigation/plan.md` (D3, no ID of its own) |

---

## Decision log

Every call made without asking, and why it qualified (ADR-019 discipline as carried into this spawn:
verified `CORRECT`, mechanical/localized, inside the approved plan, or an obvious winner within intent).

### D-1 — Frozen map implemented verbatim (in-plan)

Regenerated the map from `git log --diff-filter=A` (no `--follow`, date asc, basename asc, `LC_ALL=C`),
excluding the plan doc per D3, and diffed IDs+slugs against the plan's §1 table with the D3 shift:
**exact match, 118 rows**. *Qualified:* implementing the owner-ratified table is the plan itself.

### D-2 — Two more briefs excluded from the rewrite: `0051` and `0052` (obvious winner)

Plan §5 excluded 0002's own artefacts because they *record* legacy names. The same holds for the
`0051` (bare-identity sweep) and `0052` (wiki follow-up) briefs: `0052:71` quotes a wiki sentence
verbatim (`` `…/done/s4-profile-05-backend-db-api.md` ``) and `0051:64,67` name legacy files as the
sweep's *subjects*. Rewriting those lines would falsify what they describe. Excluded; both appear in the
V7 residual (3 lines). *Qualified:* the alternative corrupts a record; stays inside the plan's intent
(update inbound *links*, not descriptions of legacy strings). **Both briefs now need the producer to
re-brief them against this map** — flagged in the hand-off.

### D-3 — Plan-time anchor counts were a miscount; no rule changed

Plan §2.3 said "71 have Sprint+Priority, 24 Priority only, 3 Sprint only, 21 neither". Measured on the
118 at build: **81 carry `## Priority`, 60 carry `## Sprint`, 34 carry neither.** The insertion rule
(Priority → Sprint → after `## ID`) is unchanged and was verified per file (0 files with a
Priority/Sprint heading that fell through to the `ID` anchor). I first suspected heading variants and
restored/re-ran the insertion with a prefix matcher (`## Priority\b`); the result was identical, i.e.
the headings are all exact. Recorded so the discrepancy is not read as a defect.

### D-4 — D4 files: `## Owner` placement (in-plan, one placement detail chosen)

For the 3 pre-existing-`## Status` briefs the plan says "`## Owner` at the end of that Status section".
Chosen: immediately before the next `## ` heading, but **before** a trailing `---` rule when the section
ends with one (`0107`). For `0139` the existing `## Status` sits *before* `## Priority`, so
`## Owner` lands before `## Priority` — additions-only, canonical values, but not the canonical
ID→Sprint→Priority→Status→Owner order. Not "fixed": moving a section is a content edit the brief forbids.

### D-5 — Verification-1 script bug, fixed in the script, not the tree

My first `verify.sh` had a defective V1 assertion (compared `"$ld$dd$lc$dc"` against `"01200"`, an
impossible string) that printed a spurious FAIL beside the real check's PASS. Removed the bad line and
re-ran the whole script; the pasted output below is from the corrected run. Also excluded the
git-ignored `coverage/` directory from V7's grep (stale build output, 6 hits, not tracked).

### D-6 — Verification 8 substituted (as 0002's D-10)

Nothing is committed, so `git log --follow` on the **new** paths has nothing to follow. Substituted:
`git diff --cached -M --name-status` shows **119 × `R100`**, and `--follow` on three **old** paths
walks full history (2, 6, 3 commits). Reported as substituted, not as passed-as-written.

### D-7 — 🚩 STOPPED: 8 links in `sprints/done/plan-sprint-4c.md` were broken at `HEAD` and remain broken

V10 fails on 8 hrefs of the form `../tasks/done/<new>/brief.md` inside `ai-agents/sprints/done/`
— one `../` short (from `sprints/done/` the correct depth is `../../tasks/`). Checked at `HEAD`: all 8
were **already broken** with the legacy names (0002's worklog noted "8 pre-existing broken links" in
files it never touched — these). R1 rewrote the filename part and preserved the shape, exactly as the
plan says, so the depth bug survives. The fix is mechanical (8 hrefs, `../` → `../../`) and inside the
task's intent — but it is a verification failure the plan did not anticipate, and the spawn instruction
says stop rather than improvise. **Not applied. Returned as `NEEDS-DECISION` (see hand-off).**

### D-8 — 🚩 STOPPED: 4 inbound references in shapes the plan did not enumerate, left unrewritten

- `ai-agents/knowledge-base/geoconflict-overview.md:558,590,624` — `` `ai-agents/tasks/feature_spec_ai_players_standalone.md` `` (a **board-less** path from before boards existed; R1 requires a board segment, R3 refuses a `/`-preceded name). Target: `ai-agents/tasks/done/0074-ai-players-standalone/brief.md`.
- `ai-agents/reviews/s4-profile-04e3.md:4` — `` `…/s4-profile-04i-server-bring-up-runbook.md` `` (an **ellipsis-elided** path). Target: `…/0182-profile-04i-server-bring-up-runbook/brief.md`.

Same reasoning as D-7: mechanical, in intent, but unanticipated → **not applied**, bundled into the
same `NEEDS-DECISION`. Nothing dangles worse than at `HEAD` (they were stale paths already).

### D-9 — `.claude/skills/update-announcements/SKILL.md:59` example rewritten (in-plan R3)

The example filename in that skill doc became `` `0162-disable-compact-public-maps` ``. It is a
project skill, not an fkit-authored one, and the line is an illustrative example; R3 applied as written.
Noted because it is the one edit outside `ai-agents/`, `src/` and the shell script.

### D-10 — D-7/D-8 resolved: owner ruled option (A), fixes applied (explicit owner disposition)

**Ruling (owner, via the driver, 2026-08-25):** apply both fixes in this working tree.

**What changed (12 lines, 3 files):**

- `ai-agents/sprints/done/plan-sprint-4c.md` — the 8 hrefs at lines 31–38: `](../tasks/…)` → `](../../tasks/…)`
  (0157, 0158, 0159, 0163, 0164, 0161 in `done/`; 0160 in `cancelled/`; 0162 in `done/`). Checked first that
  these 8 are the **only** `../tasks/` hrefs in the file.
- `ai-agents/knowledge-base/geoconflict-overview.md:558,590,624` — `ai-agents/tasks/feature_spec_ai_players_standalone.md`
  → `ai-agents/tasks/done/0074-ai-players-standalone/brief.md` (3 lines; this file was not previously modified).
- `ai-agents/reviews/s4-profile-04e3.md:4` — `…/s4-profile-04i-server-bring-up-runbook.md`
  → `…/0182-profile-04i-server-bring-up-runbook/brief.md` (1 line; line 3 of that file was the earlier R1 rewrite).

**Verified before applying:** all 8 hrefs were broken at `HEAD` (checked against the HEAD blob); the 3 + 1
targets exist on disk. **Qualified:** explicit owner disposition; mechanical; inside "update every inbound link".

**Nothing else changed:** `git status` shape went from `R `1 / `RM`118 / ` M`54 / `??`2 to ` M`55 — the
single new entry is `geoconflict-overview.md`; the other two files were already modified. Byte proof re-run:
118 briefs + 1 plan, 0 mismatches. Still no commit, no push, no wiki-vault, no Status cell, no mover.

**Re-run output (verbatim):**

```
### V7 (re-run after ruling A) — legacy filenames outside wiki-vault
lines=260
 126 ai-agents/tasks/backlog/0003-migrate-done-cancelled-tasks-to-folders/worklog.md
 125 ai-agents/tasks/backlog/0003-migrate-done-cancelled-tasks-to-folders/plan.md
   3 ai-agents/tasks/done/0002-migrate-backlog-tasks-to-folders/review.md
   2 ai-agents/tasks/backlog/0051-sweep-bare-legacy-task-identities/brief.md
   1 ai-agents/tasks/done/0002-migrate-backlog-tasks-to-folders/worklog.md
   1 ai-agents/tasks/done/0002-migrate-backlog-tasks-to-folders/plan.md
   1 ai-agents/tasks/backlog/0052-wiki-vault-legacy-filename-follow-up/brief.md
   1 ai-agents/reviews/s4-postgres-backup-routine-coder-handoff.md
### V10 (re-run) — every rewritten link into tasks/ resolves
links checked=91 broken=0
RESULT: PASS
### V13 (re-run) — wiki-vault entries in git status: 0
RESULT: PASS
```

The 260 V7 lines are self-referential growth: this worklog (126, its map names every legacy file) + this
task's `plan.md` (125). Outside those two: **9 lines** — 0002's artefacts 5, `0051`/`0052` briefs 3
(D-2), the correct review-ledger pointer 1. The 4 D-8 lines are gone.

## Decision log — review round 1 (process-stateful-review, 2026-08-25)

### D-11 — R1: `0119-nations-balance` cancel line replaced with the owner's own words (explicit owner disposition)

**Which finding:** R1 (medium per reviewer; **low** as assigned by me — closed task, two records disagree,
nothing runtime). **Verified before applying:** `plan-sprint-4.md:56` reads `⛔ Cancelled (2026-04-21) —
created too many bugs; cancelled forever, though a similar task might return someday (owner-supplied
reason, 2026-08-14)`; that reason arrived in `0beb899` (2026-08-21) and the `04-21` date is the plan-edit
commit `e7e1b12`; the brief entered `cancelled/` in `1e857a0` (2026-04-18). Plan §3 took the string from
`knowledge-base/hvn-balance-pr70-no-ship-review.md` and never disclosed the conflict — so D7 was ruled
without it in view. The finding is CORRECT.

**Ruling (owner, via the driver, 2026-08-25): option (C).** The brief's `## Status` value became
`⛔ Cancelled (2026-04-18) — created too many bugs; cancelled forever, though a similar task might return
someday` — date from the git rename, reason from the plan cell. **One line** (`brief.md:13`, inserted
index 12). The sprint-plan cell was **not touched** (0004's). Byte proof re-run over all 118 + 1: 0
mismatches — the edited line sits inside the recorded insert set, so body prose is untouched by
construction. Canonical-form check passes.

**Qualified:** verified CORRECT; one-line, localized; explicit owner disposition.

⚠️ **Deliberately unresolved:** the brief says `04-18`, the plan cell still says `04-21`. Reconciling the
cell is 0004's scope per the ruling; noted so the next reader does not read it as a miss.

**X1 and the round-1 report's non-defect notes:** no code change (recorded in `review.md`). Added to the
producer hand-off below: the `0104`/`0107` possible duplicate (already listed), `reviews/s4-profile-04i.md:4`
(flagged by the round-1 report; I have not re-derived its rationale here), and plan §4's "10 vs 9"
producer-owner count (the 10 counted `0111` before D3 folded it; 9 were assigned).

**Ledger:** `review.md` status set to **closed-out** — R1 fixed, nothing blocking remains.

---

## Verification results

| # | Check | Result |
|---|---|---|
| 1 | `done/` 0 loose / 120 dirs; `cancelled/` 0 loose / 9 dirs | **PASS** |
| 2 | Every folder has `brief.md` (191 folders) | **PASS** |
| 3 | No duplicate IDs across boards | **PASS** |
| 4 | `0001`–`0191` contiguous; first new ID `0074` = old max + 1 | **PASS** |
| 5 | Folder prefix == `## ID` (191/191) | **PASS** |
| 6 | Status/Owner values; 109 coder / 9 producer; 3 cancelled spot-checks match their records | **PASS** |
| 7 | Legacy filenames outside `wiki-vault/` | **PASS with documented residual** — after ruling A: 9 lines outside this task's own artefacts (see below); not a literal zero |
| 8 | History preserved | **SUBSTITUTED** (D-6): 119 × `R100` |
| 9 | Byte proof: inserted blocks + forward-map substitutions only | **PASS** — 118 briefs + 1 plan, 0 mismatches |
| 10 | Every rewritten link resolves | **PASS after ruling A** (was FAIL 8/91 — pre-existing depth errors in `plan-sprint-4c.md`, D-7; fixed under D-10) |
| 11 | Prettier + eslint on the 4 `.ts` files | **PASS** (both clean) |
| 11b | `npm test` (full suite) | **PASS** — 91 suites / 744 tests, all green (`Time: 3.442 s`) |
| 12 | `dashboard.sh sprint-backlog.md` before (HEAD worktree) vs after | **PASS** — identical output (102 lines, 0 diff) |
| 13 | No `wiki-vault/` entry in `git status` | **PASS** |

### Verification script output (verbatim, corrected run)

```
### V1 — board shape
done/: loose=0 dirs=120 (expect 0/120)   cancelled/: loose=0 dirs=9 (expect 0/9)
RESULT: PASS
### V2 — every folder has brief.md
folders=191 missing=0
RESULT: PASS
### V3 — duplicate IDs across boards
duplicates: ''
RESULT: PASS
### V4 — contiguous 0001..0191, first new = old max + 1
sequence 0001..0191 contiguous
RESULT: PASS
old max was 0073; first new ID 0074
### V5 — folder prefix == ## ID
mismatches=0
RESULT: PASS
### V6 — status / owner values
bad=0 over 118
RESULT: PASS
owner tally:
 109 fkit-coder
   9 fkit-producer
spot-check 3 cancelled against their records:
  0119 brief : ⛔ Cancelled (2026-04-18) — no-ship: implementation turned removed nation slots into regular Bots (three-faction match) and only covered public HvN; see hvn-balance-pr70-no-ship-review.md
  0119 record: **Date:** 2026-04-18   / **Recommendation:** Do not deploy this implementation. Cancel or close the curre
  0120 brief : ⛔ Cancelled (2026-04-18) — created too many implementation problems
  0120 record: 60:| ⛔ Cancelled (2026-04-18) — created too many implementation problems | — | Tutorial — Pause During Action-Required S
443:**Status:** ⛔ Cancelled (2026-04-18) — created too many implementation problems.
  0187 brief : ⛔ Cancelled (2026-06-28) — superseded: hashing does not remove the 152-ФЗ notification/consent obligation; PR #127 reverted
  0187 record: SUPERSEDED 2026-06-28.** The 2026-06-26 decision (pseudonymize via an irreversible Yandex-ID hash) was **overturned on further investigation:
### V7 — legacy filenames remaining outside wiki-vault (itemised)
lines=138
 125 ./ai-agents/tasks/backlog/0003-migrate-done-cancelled-tasks-to-folders/plan.md
   3 ./ai-agents/tasks/done/0002-migrate-backlog-tasks-to-folders/review.md
   3 ./ai-agents/knowledge-base/geoconflict-overview.md
   2 ./ai-agents/tasks/backlog/0051-sweep-bare-legacy-task-identities/brief.md
   1 ./ai-agents/tasks/done/0002-migrate-backlog-tasks-to-folders/worklog.md
   1 ./ai-agents/tasks/done/0002-migrate-backlog-tasks-to-folders/plan.md
   1 ./ai-agents/tasks/backlog/0052-wiki-vault-legacy-filename-follow-up/brief.md
   1 ./ai-agents/reviews/s4-profile-04e3.md
   1 ./ai-agents/reviews/s4-postgres-backup-routine-coder-handoff.md
(residual is documented in the worklog; not a literal zero)
### V8 — history preservation (pre-commit substitute)
staged renames: 119 × R100 (expect 119)
-- git log --follow ai-agents/tasks/done/task-01-analytics.md: 2 commits, oldest 2026-02-23
-- git log --follow ai-agents/tasks/done/sec00-incident-index.md: 6 commits, oldest 2026-04-20
-- git log --follow ai-agents/tasks/cancelled/hotfix-hf5-win-condition-bug.md: 3 commits, oldest 2026-03-10
RESULT: PASS
### V9 — byte proof (inserted blocks + forward-map substitutions only)
proof: 118 briefs + 1 plan checked, 0 mismatches
RESULT: PASS
### V10 — every rewritten link into tasks/ resolves
BROKEN ai-agents/sprints/done/plan-sprint-4c.md ../tasks/done/0157-fix-cosmetics-serving/brief.md
BROKEN ai-agents/sprints/done/plan-sprint-4c.md ../tasks/done/0158-fix-local-server-hash-guard/brief.md
BROKEN ai-agents/sprints/done/plan-sprint-4c.md ../tasks/done/0159-reduce-archive-telemetry-noise/brief.md
BROKEN ai-agents/sprints/done/plan-sprint-4c.md ../tasks/done/0163-investigate-lobby-map-fetch/brief.md
BROKEN ai-agents/sprints/done/plan-sprint-4c.md ../tasks/done/0164-enable-client-source-maps/brief.md
BROKEN ai-agents/sprints/done/plan-sprint-4c.md ../tasks/done/0161-leaderboard-player-count/brief.md
BROKEN ai-agents/sprints/done/plan-sprint-4c.md ../tasks/cancelled/0160-fix-compact-map-boat-attack/brief.md
BROKEN ai-agents/sprints/done/plan-sprint-4c.md ../tasks/done/0162-disable-compact-public-maps/brief.md
links checked=91 broken=8
RESULT: FAIL
### V11 — lint on the 4 .ts comment edits
Checking formatting...
All matched files use Prettier code style!
RESULT: PASS
eslint clean
RESULT: PASS
(npm test runs separately — result pasted below in the worklog)
### V12 — dashboard.sh sprint-backlog.md before/after
before: exit=0 lines=102
after : exit=0 lines=102
diff lines: 0
worktree removed: 1 worktree(s) remain
### V13 — no wiki-vault entry in git status
0
RESULT: PASS
### overall: AT LEAST ONE FAIL
```

### On verification 7 — the residual (138 lines before ruling A; 9 lines outside this task's own artefacts after it)

| Lines | File | Why it stays |
|---|---|---|
| 125 | this task's `plan.md` | The approved §1 table names every legacy file; it is the record of what moved. |
| 3 + 1 + 1 | 0002's `review.md`, `worklog.md`, `plan.md` | Historical record of task 0002; excluded by plan §5. |
| 2 + 1 | `0051` and `0052` briefs | They *describe* legacy names as sweep subjects (D-2); to be re-briefed by the producer. |
| 1 | `reviews/s4-postgres-backup-routine-coder-handoff.md:6` | Points at the review **ledger** `reviews/s4-postgres-backup-routine.md`, which keeps its name — a live link, correctly untouched. |

`wiki-vault/` (excluded by plan): `log.md` 137 lines + 89 pages / 96 lines — hand-off below.
`static/`, `.fkit/`, `coverage/` are git-ignored build/scratch output and excluded.

---

## Handed off, not done here

### `NEEDS-DECISION` on D-7/D-8 — RESOLVED by owner ruling (A), 2026-08-25

Both fixes applied; see D-10 in the decision log. V7/V10/V13 re-run output pasted there.

### `@fkit-wiki` / task 0052 — legacy filenames that would now break in the vault

`log.md`: **137 lines — leave unedited** (append-only history, per 0002's D3 and 0052's hard constraint).

**89 pages, 96 lines** (path under `ai-agents/wiki-vault/`, occurrences):
`wiki/decisions/sprint-4.md` (4); `wiki/features/reconnection.md` (2); `wiki/features/feedback-button.md` (2); `wiki/decisions/profile-storage-strategy.md` (2); `wiki/decisions/cancelled-tasks.md` (2); `wiki/decisions/sprint-4c.md` (1); `wiki/decisions/sprint-3.md` (1); `wiki/decisions/personal-data-152fz-compliance.md` (1); `wiki/decisions/hvn-balance-pr70-no-ship.md` (1); `wiki/decisions/hotfix-post-sprint2.md` (1); `wiki/features/tutorial.md` (1); `wiki/features/announcements.md` (1); `wiki/features/ai-players.md` (1); `wiki/systems/telemetry.md` (1); `wiki/systems/player-profile-store.md` (1); `wiki/systems/analytics.md` (1); and one each in `wiki/tasks/`: `yandex-payments-investigation`, `yandex-identity-plumbing`, `vps-access-hardening`, `vk-link`, `ui-click-multiplayer`, `tutorial-reduce-bots`, `tutorial-no-nations`, `tutorial-build-menu-lock`, `telegram-link`, `teams-mode-max-teams`, `start-screen-redesign-investigation`, `start-screen-redesign-implementation`, `stale-build-detection`, `sprint4b-weird-setting-modifier`, `sprint4b-mini-mode-investigation`, `sprint4b-duos-trios-quads`, `sprint4b-compact-map-rotation`, `spawn-ux`, `solo-win-condition-fix`, `session-start-sequence`, `s4c-investigate-lobby-map-fetch`, `s4c-enable-client-source-maps`, `repo-build-context-hardening`, `registry-image-policy-followup`, `registry-image-audit`, `profile-vps-provisioning`, `profile-server-skeleton`, `profile-server-bring-up-runbook`, `profile-schema-contract`, `profile-onbox-stack-gate`, `profile-match-end-crediting`, `profile-image-secret-scan`, `profile-game-server-deploy-env`, `profile-docker-image`, `profile-deploy-wiring`, `profile-deploy-hardening`, `profile-build-push-digest`, `profile-backend-db-api`, `profile-api-url-config`, `postgres-backup-routine`, `player-profile-store-investigation`, `personal-data-compliance-investigation`, `nuke-trajectory-visibility`, `mobile-quick-wins`, `missions-difficulty-investigation`, `map-preload`, `local-server-hash-guard`, `legal-vat-investigation`, `leaderboard-player-count`, `investigate-clans-system`, `incident-response-index`, `incident-postmortem-followups`, `immediate-containment`, `global-announcements`, `feedback-modal-space-key`, `email-subscribe-modal`, `docker-secret-boundary-check`, `disable-compact-public-maps`, `deployment-credential-hardening`, `cosmetics-serving`, `clean-redeploy-validation`, `citizenship-xp-progress-ui`, `citizenship-card-guest-cta-no-sdk`, `build-number-tracking`, `archive-endpoint-failures`, `app-bootstrap-single-entry-point`, `analytics-p0-yandex-login-status`, `analytics-p0-spawn-confirmation`, `analytics-p0-session-match-count`, `analytics-p0-player-days-played`, `analytics-p0-match-duration`, `analytics-p0-game-mode-segmentation`, `ai-lobby-slot-bug` (73 pages).

Most `wiki/tasks/*` hits are the page's **Source files** field. The map above gives every old→new path.

### Ambiguous owners (defaulted, per plan §4)

| ID | Brief | Default | Why ambiguous |
|---|---|---|---|
| 0108 | telemetry-knowledge-base | `fkit-coder` | A knowledge-base *document* task — coder wrote it, but it is documentation |
| 0137 | postmortem-wiki-and-follow-ups | `fkit-coder` | Postmortem + wiki work — could be `fkit-wiki` |
| 0105 | uptrace-setup | `fkit-coder` | Ops/infra setup, no better-fitting role |

### For the producer

- **`0051` must be re-briefed against this map** — its elided lists cite done-board names (`-profile-05` → `0185`, `s4-profile-08-backups` ≈ `0189`?) and its brief still describes the pre-0003 tree (D-2). `0052` already covers 0003's renames by the 2026-08-10 ruling; the list above is its input.
- **`See cancelled-tasks.md`** pointers at `sprints/plan-index.md:71,74` and `sprints/done/hotfix-post-sprint2.md:148` name a file deleted in `6666989` (content now in `wiki/decisions/cancelled-tasks.md`). Not one of the 119; untouched.
- **HF-5 record is self-contradictory**: `hotfix-post-sprint2.md:74` says `✅ Done`, its checklist `:148` and `plan-index.md:71` say cancelled. The brief carries the cancelled status (0096). Status cells are 0004's.
- **Possible duplicate task**: `0104-server-performance` (added 04-07) and `0107-5d-b-server-performance` (04-09) share a title. Both migrated; nothing merged. *(Re-raised by review round 1.)*
- **`reviews/s4-profile-04i.md:4`** — flagged by the round-1 review report for the producer (rationale not restated here).
- **Plan §4 counted 10 producer-owned briefs; 9 were assigned** — the 10th was `0111`, which D3 folded into `0110/plan.md`. Label discrepancy only.
- **`0119` date split (D-11):** brief `04-18` (git rename) vs plan cell `04-21` (plan-edit date) — the cell is 0004's.
- **Two cancelled dates rest on git only** (D6): 0096 HF-5 ← `49f96bc`; 0114 HF-11e ← `b6c871a`.
- **`0139`'s `## Owner` precedes `## Priority`** (D-4) — cosmetic ordering, additions-only.

### Not done / not verified here

- `git log --follow` on the new paths (needs a commit) — substituted, D-6.
- No commit, no push, no wiki write, no Status cell edit, no mover invoked.
