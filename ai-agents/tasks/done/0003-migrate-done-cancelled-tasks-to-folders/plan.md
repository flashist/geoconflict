# Plan — Task 0003: Migrate `tasks/done/` and `tasks/cancelled/` to the fkit task-folder convention

> **Approval provenance.** Produced by a spawned `@fkit-coder` (plan step) on 2026-08-25 and
> **approved by the owner in the lead session on 2026-08-25**, relayed to the same spawn as a
> declared owner ruling: *"the 0003 plan is APPROVED as returned, and D1–D7 each take option (A)"*.
> The build ran in that same spawn under that declared approval. Approval leaves no artifact of its
> own (ADR-021); this file is the plan text as returned, with the rulings recorded up front.
>
> ⚠️ The approval was **declared prose relayed by the coordinator**, not something this spawn could
> verify (the owner channel is session-only). Stated here rather than hardened into a guarantee.

## Rulings (owner, 2026-08-25) — all seven took option (A)

| # | Decision | Ruling |
|---|---|---|
| D1 | Ordering rule on closed boards | Convention as written: `git log --diff-filter=A` add-date **without `--follow`** (= close-date order for these files), tie-break basename. |
| D2 | Slug rule | As tabled in §1 (legacy prefixes/number tokens stripped; `5d-b-` kept on the one collision). |
| D3 | `hf11a-hotfix-stale-build-investigation-plan.md` | **Fold** into `0110-stale-build-investigation/plan.md`. **118 IDs, `0074`–`0191`**; verification 1 = **110** new `done/` dirs. Every ID at or after the plan file's row in the §1 table shifts down by one. |
| D4 | Three briefs with a pre-existing `## Status` | **Additions-only**: `✅ Done` inserted as the first value line under the existing heading; legacy line/paragraph left beneath; heading not moved; `## Owner` inserted at the end of that Status section. |
| D5 | Cross-references inside the 119 | **Rewrite them.** Verification 9 amended to "only added field blocks plus legacy-filename→new-path substitutions", proven by the forward-map byte check (§2.4). |
| D6 | HF-5 / HF-11e cancellation dates | **Git rename commits count as the date record** — `49f96bc` (2026-03-10) and `b6c871a` (2026-04-10). |
| D7 | Cancelled reason wording | Condensed strings as tabled in §3. |

---

## 0. Ground truth checked at plan time (2026-08-25, `HEAD` = `2d1135c`)

| Fact | Measured |
|---|---|
| `done/` | 111 loose `.md` + 10 folders (`0002`, `0013`, `0019`, `0041`, `0042`, `0046`, `0049`, `0054`, `0055`, `0066`) |
| `cancelled/` | 8 loose `.md` + 1 folder (`0072`) |
| `backlog/` | 62 folders, 0 loose (an untracked `.DS_Store` only) |
| Highest ID across boards | `0073` → allocation starts `0074` |
| 0002's convention | `conventions/task-id-allocation.md` — next free number; batch order = git add-date **without `--follow`**, tie-break filename; never reuse/renumber; folder name authoritative |
| `sprints/cancelled-tasks.md` | **absent** (deleted `6666989`; now `wiki-vault/wiki/decisions/cancelled-tasks.md`) |
| 0004 | still in backlog; edits Status cells of the same plans — this task touches Brief cells / prose only |
| Wiki | `[[systems/agent-conventions]]` records the ID rule; nothing in the vault contradicts this plan |

## 1. ID allocation (deterministic)

**Rule (convention as written, D1):** `git log --diff-filter=A --format=%ad --date=short -- <path> | tail -1` (no `--follow`), sort by date ascending, tie-break by **basename** ascending (`LC_ALL=C`), assign `0074` upward in one pass, freeze to a mapping file, and every later step reads only the frozen map.

⚠️ **What that date means on a closed board.** All but a handful of these files were created in `backlog/` and later `git mv`'d, so the no-`--follow` add-date is the **date the file landed on the closed board** (its close date), not when it was scoped. 75 of 119 dates change under `--follow`. The convention explicitly accepts this ("a renamed brief reports the rename date… ID order carries no meaning") and says "Task 0003 follows the same rule" — so the sequence reads as close-order. Ruled D1 (A).

**Slug rule (D2):** lowercase kebab; strip legacy sprint/series/number prefixes — `s3-`, `s4-`, `s4c-`, `sprint4-`, `sprint4b-`, `sec<NN>-`, `task-`, `task-<NN><a-z>?-`, `task-5d-a-`, `5d-<x>-task-`, `8d-<x>-task-`, `hotfix-`, `hotfix-hf<N>-`, `hf<N><a-z>?-hotfix-`, trailing `-task`; `feature_spec_…` → hyphens, prefix dropped. Every stripped number survives in the brief's H1 ("# Task 2a —", "# HF-11a —", "# Task 5d-B —"), satisfying the convention's "meaning must survive in the brief" clause. **One collision guard:** `task-server-performance.md` and `5d-b-task-server-performance.md` both reduce to `server-performance`; the second keeps `5d-b-`. No other duplicate slugs.

**The table as approved (119 rows). Under D3 the plan-file row is folded and every ID from `0112` on shifts down by one — the frozen build map in `worklog.md` is the authoritative 118-row form.**

| ID | add-date | board | legacy file | new folder |
|---|---|---|---|---|
| 0074 | 02-23 | done | `feature_spec_ai_players_standalone.md` | `0074-ai-players-standalone` |
| 0075 | 02-26 | done | `task-01-analytics.md` | `0075-analytics` |
| 0076 | 02-26 | done | `task-02-crash-reconnection.md` | `0076-crash-reconnection` |
| 0077 | 02-26 | done | `task-02a-reconnection-analytics.md` | `0077-reconnection-analytics` |
| 0078 | 02-27 | done | `task-02b-feedback-button.md` | `0078-feedback-button` |
| 0079 | 02-27 | done | `task-02c-device-environment-info.md` | `0079-device-environment-info` |
| 0080 | 02-28 | done | `task-02d-additional-analytics-events.md` | `0080-additional-analytics-events` |
| 0081 | 02-28 | done | `task-02e-performance-monitoring.md` | `0081-performance-monitoring` |
| 0082 | 02-28 | done | `task-02f-device-type-analytics.md` | `0082-device-type-analytics` |
| 0083 | 02-28 | done | `task-02g-new-returning-player.md` | `0083-new-returning-player` |
| 0084 | 03-01 | done | `task-02h-sentry.md` | `0084-sentry` |
| 0085 | 03-02 | done | `task-03-mobile-quick-wins.md` | `0085-mobile-quick-wins` |
| 0086 | 03-04 | done | `task-02j-spawn-anomaly-investigation.md` | `0086-spawn-anomaly-investigation` |
| 0087 | 03-07 | done | `task-04-tutorial.md` | `0087-tutorial` |
| 0088 | 03-07 | done | `task-04a-auto-spawn.md` | `0088-auto-spawn` |
| 0089 | 03-07 | done | `task-04c-auto-expansion.md` | `0089-auto-expansion` |
| 0090 | 03-07 | done | `task-04e-spawn-indicator.md` | `0090-spawn-indicator` |
| 0091 | 03-07 | done | `task-zoom-to-territory.md` | `0091-zoom-to-territory` |
| 0092 | 03-08 | done | `task-experiment-analytics.md` | `0092-experiment-analytics` |
| 0093 | 03-09 | done | `hotfix-hf3-ui-tap-analytics.md` | `0093-ui-tap-analytics` |
| 0094 | 03-09 | done | `hotfix-hf4-control-panel-hit-area.md` | `0094-control-panel-hit-area` |
| 0095 | 03-09 | done | `hotfix-tutorial-skip-visibility.md` | `0095-tutorial-skip-visibility` |
| 0096 | 03-10 | **cancelled** | `hotfix-hf5-win-condition-bug.md` | `0096-win-condition-bug` |
| 0097 | 03-13 | done | `hotfix-hf7-build-number.md` | `0097-build-number` |
| 0098 | 03-13 | done | `hotfix-hf8-tutorial-attempt-count.md` | `0098-tutorial-attempt-count` |
| 0099 | 03-18 | done | `hotfix-hf9-remove-refresh-push.md` | `0099-remove-refresh-push` |
| 0100 | 03-28 | done | `hotfix-hf10-cache-busting.md` | `0100-cache-busting` |
| 0101 | 04-07 | done | `investigation-server-logging.md` | `0101-investigation-server-logging` |
| 0102 | 04-07 | done | `task-autospawn-bug-investigation.md` | `0102-autospawn-bug-investigation` |
| 0103 | 04-07 | done | `task-feedback-match-ids-simple.md` | `0103-feedback-match-ids-simple` |
| 0104 | 04-07 | done | `task-server-performance.md` | `0104-server-performance` |
| 0105 | 04-07 | done | `task-uptrace-setup.md` | `0105-uptrace-setup` |
| 0106 | 04-08 | done | `task-humans-vs-nations.md` | `0106-humans-vs-nations` |
| 0107 | 04-09 | done | `5d-b-task-server-performance.md` | `0107-5d-b-server-performance` |
| 0108 | 04-09 | done | `5d-c-task-telemetry-knowledge-base.md` | `0108-telemetry-knowledge-base` |
| 0109 | 04-09 | done | `task-5d-a-server-metrics.md` | `0109-server-metrics` |
| 0110 | 04-10 | done | `hf11a-hotfix-stale-build-investigation.md` | `0110-stale-build-investigation` |
| 0111 | 04-10 | done | `hf11a-hotfix-stale-build-investigation-plan.md` | **D3: folded → `0110-stale-build-investigation/plan.md`** |
| 0112 | 04-10 | done | `hf11b-hotfix-version-endpoint.md` | `0112-version-endpoint` |
| 0113 | 04-10 | done | `hf11c-hotfix-stale-build-detection.md` | `0113-stale-build-detection` |
| 0114 | 04-10 | done | `hf11d-hotfix-stale-build-modal.md` | `0114-stale-build-modal` |
| 0115 | 04-10 | **cancelled** | `hf11e-hotfix-build-number-automation.md` | `0115-build-number-automation` |
| 0116 | 04-10 | done | `hf12-hotfix-spawn-camera-timing.md` | `0116-spawn-camera-timing` |
| 0117 | 04-17 | done | `hf13-hotfix-map-preload.md` | `0117-map-preload` |
| 0118 | 04-17 | done | `s4-ai-lobby-slot-bug.md` | `0118-ai-lobby-slot-bug` |
| 0119 | 04-18 | done | `s3-investigation-ui-click-multiplayer.md` | `0119-investigation-ui-click-multiplayer` |
| 0120 | 04-18 | **cancelled** | `s4-nations-balance-task.md` | `0120-nations-balance` |
| 0121 | 04-18 | **cancelled** | `s4-tutorial-action-pause.md` | `0121-tutorial-action-pause` |
| 0122 | 04-18 | done | `s4-tutorial-build-menu-lock.md` | `0122-tutorial-build-menu-lock` |
| 0123 | 04-18 | done | `s4-tutorial-no-nations.md` | `0123-tutorial-no-nations` |
| 0124 | 04-18 | done | `s4-tutorial-reduce-bots.md` | `0124-tutorial-reduce-bots` |
| 0125 | 04-18 | done | `sprint4-investigation-player-store.md` | `0125-investigation-player-store` |
| 0126 | 04-18 | done | `sprint4-investigation-yandex-payments.md` | `0126-investigation-yandex-payments` |
| 0127 | 04-19 | done | `8d-a-task-global-announcements.md` | `0127-global-announcements` |
| 0128 | 04-20 | done | `s4-email-subscribe-task.md` | `0128-email-subscribe` |
| 0129 | 04-21 | done | `s4-legal-vat-investigation.md` | `0129-legal-vat-investigation` |
| 0130 | 04-21 | done | `sec00-incident-index.md` | `0130-incident-index` |
| 0131 | 04-21 | done | `sec01-immediate-containment.md` | `0131-immediate-containment` |
| 0132 | 04-21 | done | `sec02-registry-image-exposure-audit.md` | `0132-registry-image-exposure-audit` |
| 0133 | 04-21 | done | `sec03-vps-access-audit-and-hardening.md` | `0133-vps-access-audit-and-hardening` |
| 0134 | 04-21 | done | `sec04-repo-build-context-hardening.md` | `0134-repo-build-context-hardening` |
| 0135 | 04-21 | done | `sec05-deployment-credential-model-hardening.md` | `0135-deployment-credential-model-hardening` |
| 0136 | 04-21 | done | `sec06-clean-rebuild-redeploy-and-validation.md` | `0136-clean-rebuild-redeploy-and-validation` |
| 0137 | 04-21 | done | `sec07-postmortem-wiki-and-follow-ups.md` | `0137-postmortem-wiki-and-follow-ups` |
| 0138 | 04-21 | done | `sec08-ci-docker-secret-boundary-check.md` | `0138-ci-docker-secret-boundary-check` |
| 0139 | 04-21 | done | `sec09-registry-visibility-and-image-retention-policy.md` | `0139-registry-visibility-and-image-retention-policy` |
| 0140 | 04-22 | done | `s4-start-screen-redesign-investigation.md` | `0140-start-screen-redesign-investigation` |
| 0141 | 04-28 | done | `s4-solo-win-condition-fix.md` | `0141-solo-win-condition-fix` |
| 0142 | 04-28 | done | `s4-telegram-link.md` | `0142-telegram-link` |
| 0143 | 04-29 | done | `s4-missions-difficulty-investigation.md` | `0143-missions-difficulty-investigation` |
| 0144 | 04-29 | done | `s4-nuke-trajectory-visibility.md` | `0144-nuke-trajectory-visibility` |
| 0145 | 04-29 | done | `s4-teams-mode-max-teams.md` | `0145-teams-mode-max-teams` |
| 0146 | 04-29 | done | `s4-vk-link.md` | `0146-vk-link` |
| 0147 | 04-30 | done | `analytics-p0-game-mode-segmentation.md` | `0147-analytics-p0-game-mode-segmentation` |
| 0148 | 04-30 | done | `analytics-p0-match-duration.md` | `0148-analytics-p0-match-duration` |
| 0149 | 04-30 | done | `analytics-p0-spawn-confirmation.md` | `0149-analytics-p0-spawn-confirmation` |
| 0150 | 05-02 | done | `analytics-p0-player-days-played.md` | `0150-analytics-p0-player-days-played` |
| 0151 | 05-02 | done | `analytics-p0-session-match-count.md` | `0151-analytics-p0-session-match-count` |
| 0152 | 05-02 | done | `analytics-p0-yandex-login-status.md` | `0152-analytics-p0-yandex-login-status` |
| 0153 | 05-05 | done | `investigate-clans-system.md` | `0153-investigate-clans-system` |
| 0154 | 05-05 | done | `sprint4b-duos-trios-quads.md` | `0154-duos-trios-quads` |
| 0155 | 05-05 | done | `sprint4b-mini-mode-investigation.md` | `0155-mini-mode-investigation` |
| 0156 | 05-06 | done | `sprint4b-compact-map-rotation.md` | `0156-compact-map-rotation` |
| 0157 | 05-06 | done | `sprint4b-weird-setting-modifier.md` | `0157-weird-setting-modifier` |
| 0158 | 05-07 | done | `s4c-fix-cosmetics-serving.md` | `0158-fix-cosmetics-serving` |
| 0159 | 05-08 | done | `s4c-fix-local-server-hash-guard.md` | `0159-fix-local-server-hash-guard` |
| 0160 | 06-01 | done | `s4c-reduce-archive-telemetry-noise.md` | `0160-reduce-archive-telemetry-noise` |
| 0161 | 06-02 | **cancelled** | `s4c-fix-compact-map-boat-attack.md` | `0161-fix-compact-map-boat-attack` |
| 0162 | 06-02 | done | `s4c-leaderboard-player-count.md` | `0162-leaderboard-player-count` |
| 0163 | 06-03 | done | `s4c-disable-compact-public-maps.md` | `0163-disable-compact-public-maps` |
| 0164 | 06-03 | done | `s4c-investigate-lobby-map-fetch.md` | `0164-investigate-lobby-map-fetch` |
| 0165 | 06-04 | done | `s4c-enable-client-source-maps.md` | `0165-enable-client-source-maps` |
| 0166 | 06-11 | done | `s4-feedback-modal-space-key.md` | `0166-feedback-modal-space-key` |
| 0167 | 06-12 | done | `s4-start-screen-redesign-impl.md` | `0167-start-screen-redesign-impl` |
| 0168 | 06-13 | done | `s4-app-bootstrap-single-entry-point.md` | `0168-app-bootstrap-single-entry-point` |
| 0169 | 06-13 | done | `s4-profile-01-schema-contract.md` | `0169-profile-01-schema-contract` |
| 0170 | 06-13 | **cancelled** | `s4-profile-02-guest-localstorage.md` | `0170-profile-02-guest-localstorage` |
| 0171 | 06-13 | done | `s4-profile-03-yandex-identity.md` | `0171-profile-03-yandex-identity` |
| 0172 | 06-13 | **cancelled** | `s4-profile-07-guest-migration.md` | `0172-profile-07-guest-migration` |
| 0173 | 06-14 | done | `s4-profile-04-backend-infra.md` | `0173-profile-04-backend-infra` |
| 0174 | 06-19 | done | `s4-profile-04a-server-skeleton.md` | `0174-profile-04a-server-skeleton` |
| 0175 | 06-19 | done | `s4-profile-04b-client-api-url-config.md` | `0175-profile-04b-client-api-url-config` |
| 0176 | 06-19 | done | `s4-profile-04c-dockerfile.md` | `0176-profile-04c-dockerfile` |
| 0177 | 06-20 | done | `s4-profile-04d-vps-provisioning.md` | `0177-profile-04d-vps-provisioning` |
| 0178 | 06-21 | done | `s4-profile-04e1-build-push-digest.md` | `0178-profile-04e1-build-push-digest` |
| 0179 | 06-22 | done | `s4-profile-04e-deploy-mechanics.md` | `0179-profile-04e-deploy-mechanics` |
| 0180 | 06-22 | done | `s4-profile-04e2-onbox-stack-gate.md` | `0180-profile-04e2-onbox-stack-gate` |
| 0181 | 06-22 | done | `s4-profile-04e3-deploy-wiring-milestone.md` | `0181-profile-04e3-deploy-wiring-milestone` |
| 0182 | 06-23 | done | `s4-profile-04f-image-secret-scan.md` | `0182-profile-04f-image-secret-scan` |
| 0183 | 06-23 | done | `s4-profile-04i-server-bring-up-runbook.md` | `0183-profile-04i-server-bring-up-runbook` |
| 0184 | 06-24 | done | `s4-profile-04g-argv-concurrency-hardening.md` | `0184-profile-04g-argv-concurrency-hardening` |
| 0185 | 06-24 | done | `s4-profile-04h-game-server-deploy-env.md` | `0185-profile-04h-game-server-deploy-env` |
| 0186 | 06-25 | done | `s4-profile-05-backend-db-api.md` | `0186-profile-05-backend-db-api` |
| 0187 | 06-26 | done | `s4-personal-data-compliance-investigation.md` | `0187-personal-data-compliance-investigation` |
| 0188 | 06-28 | **cancelled** | `s4-profile-hash-player-ids.md` | `0188-profile-hash-player-ids` |
| 0189 | 06-29 | done | `s4-profile-06-match-end-crediting.md` | `0189-profile-06-match-end-crediting` |
| 0190 | 07-01 | done | `s4-postgres-backup-routine.md` | `0190-postgres-backup-routine` |
| 0191 | 07-02 | done | `s4-citizenship-card-guest-cta-no-sdk.md` | `0191-citizenship-card-guest-cta-no-sdk` |
| 0192 | 07-02 | done | `s4-citizenship-xp-progress-ui.md` | `0192-citizenship-xp-progress-ui` |

## 2. Mechanics — scripted, from one frozen map

1. **Freeze the map** once (`scratchpad/map.tsv`: old-path, ID, slug, board, owner, status-line). Regenerate independently at build time and `diff` against this table — must match row-for-row (with the D3 shift) before anything moves (0002's D-1 discipline).
2. **`git mv`** — `mkdir -p <board>/<NNNN>-<slug>` + `git mv <old> <board>/<NNNN>-<slug>/brief.md` for each row. Staged as R100; content edits stay unstaged so the rename is exact. The hf11a plan file → `0110-stale-build-investigation/plan.md` (D3), no fields added.
3. **Field insertion** — scripted, rules fixed per file class:
   - `## ID\n<NNNN>` inserted **immediately after line 1** (the H1). Two files have many H1s (`task-uptrace-setup.md` 18, `s4-profile-04i-…` 10) — only the first counts. Two cancelled briefs open with a cancellation blockquote right under the H1; `## ID` goes between the H1 and the blockquote.
   - `## Status` + `## Owner` inserted after `## Priority`; else after `## Sprint`; else right after `## ID`. Counts on disk: 71 have Sprint+Priority, 24 Priority only, 3 Sprint only, 21 neither.
   - `## Status` = `✅ Done` (plain — these were closed by the owner by hand, so no agent-closed marker) or the recovered `⛔ Cancelled (YYYY-MM-DD) — <reason>` line from §3.
   - `## Owner` = value from §4.
   - **3 files already have `## Status`** → D4 (additions-only).
4. **Proof that body prose is untouched (verification 9, as amended by D5)** — per file: `A = git show HEAD:<old>`; apply the frozen forward map to `A` → `A'`; `B` = new `brief.md`; `C` = `B` with the inserted lines removed (exact indices recorded by the insertion script); assert `A' == C` byte-for-byte. Zero tolerance; any mismatch is a stop.

## 3. Cancelled board — dates and reasons, each traced to a record (D6, D7)

| ID (final) | `## Status` line | Date source | Reason source |
|---|---|---|---|
| 0119 | `⛔ Cancelled (2026-04-18) — no-ship: implementation turned removed nation slots into regular Bots (three-faction match) and only covered public HvN; see hvn-balance-pr70-no-ship-review.md` | `knowledge-base/hvn-balance-pr70-no-ship-review.md` (dated 2026-04-18; git rename same day) | same doc |
| 0120 | `⛔ Cancelled (2026-04-18) — created too many implementation problems` | `plan-sprint-4.md:441` (verbatim) | same line |
| 0160 | `⛔ Cancelled (2026-06-02) — runtime fallback sends boats to semantically wrong destinations on degraded compact maps; deferred to root-cause fix 0026` | in-file header | in-file header + ADR-105 |
| 0169 | `⛔ Cancelled (2026-06-13) — guest-first dropped, now authenticated-only; localStorage-authoritative guest store outgrew its slice (see cancellation report 2026-06-13)` | in-file + `plan-sprint-4.md:40,257` | `plan-sprint-4.md:257` + cancellation report |
| 0171 | `⛔ Cancelled (2026-06-13) — part of the dropped guest-first story (with T2); no guest store to migrate` | in-file | in-file |
| 0187 | `⛔ Cancelled (2026-06-28) — superseded: hashing does not remove the 152-ФЗ notification/consent obligation; PR #127 reverted` | `plan-sprint-4.md:355` | same |
| 0096 HF-5 | `⛔ Cancelled (2026-03-10) — cancelled & reverted: ghost-bot logic too entangled, contradicting test instructions` | **git rename into `cancelled/`** (`49f96bc`, 2026-03-10) — D6 | `plan-index.md:71`; wiki cancelled-tasks page |
| 0114 HF-11e | `⛔ Cancelled (2026-04-10) — not needed: HF-11a confirmed BUILD_NUMBER is already automated via scripts/bump-version.js` | **git rename** (`b6c871a`, 2026-04-10) — D6 | `plan-sprint-3.md:195`; wiki page |

(IDs above are the post-D3 final IDs; the §1 table shows pre-shift numbers for rows from `0112` on.)

## 4. Owner assignment (judgment, not automated)

- **`fkit-producer` (10):** ai-players-standalone (feature spec), investigation-player-store, investigation-yandex-payments (pre-sprint scoping investigations), legal-vat-investigation, incident-index, start-screen-redesign-investigation (UX decisions), missions-difficulty-investigation (game design), investigate-clans-system (product research), personal-data-compliance-investigation (legal).
- **`fkit-coder` (all others):** including technical investigations (spawn-anomaly, server-logging, autospawn-bug, stale-build, ui-click-multiplayer, mini-mode, lobby-map-fetch) — matches 0002's precedent (0022/0032/0039 → coder) and the security series (ops work).
- **Ambiguous, defaulted to coder, listed in the hand-off:** telemetry-knowledge-base (a document), postmortem-wiki-and-follow-ups (coder vs `fkit-wiki`), uptrace-setup (ops).

## 5. Inbound-link sweep

**Rewrite rules, applied longest filename first, full filename incl. `.md` only:**

| Rule | Shape found | Rewrite to |
|---|---|---|
| R1 | Path-shaped: `ai-agents/tasks/<board>/<legacy>.md`, `../tasks/<board>/…`, `<board>/<legacy>.md` (incl. **stale `backlog/` paths** in `src/core/profile/*.ts`, `profile-backup.sh`, 11 `reviews/` `Task:` lines, the T2 cancellation report) | same shape, path → `…/tasks/<actual board>/NNNN-slug/brief.md` |
| R2 | **Sprint-plan table Brief cell** bare span | `` [`NNNN-slug`](../tasks/<board>/NNNN-slug/brief.md) `` (`../../` from `sprints/done/`) — 0002's ratified D5 |
| R3 | Any other bare `` `legacy.md` `` mention (prose, `**Brief:**` / `See full brief:` lines, KB tables, the 0013 slice table, sec00's index list) | `` `NNNN-slug` `` — 0002's D-6 |
| R4 | Bare filename with line suffix (`s4-profile-04e-deploy-mechanics.md:57`, 1 occurrence) | `NNNN-slug/brief.md:57` |
| R5 | **Never-existed variants** (14): `s3-hf11a…e-*`, `s3-hf12-*`, `s3-hf13-*`, `s3-5d-a-task-server-metrics`, `s3-5d-b-task-server-performance`, `s3-feedback-match-ids-simple-task`, `s3-humans-vs-nations-task` (all `plan-sprint-3.md`), `s4-8d-a-task-global-announcements`, `s4-investigation-player-store`, `s4-investigation-yandex-payments`, `s3-hf11d-…` (producer KB) | hand-curated alias table → R2/R3 by context (0002's D-4 precedent) |

**Guards:** refuse a match preceded by `reviews/` or `wiki/tasks/` (5 review ledgers and 13 wiki pages share basenames with briefs); refuse any other `<dir>/` prefix that is not `tasks/<board>/`; `task-server-performance.md` ⊂ `5d-b-task-server-performance.md` handled by a leading-boundary check (no match when preceded by `-`, `/`, `.`, `_` or an alphanumeric).

**Surface (lines, outside the vault, plan-time count):** `plan-sprint-4.md` 48 · `done/plan-sprint-3.md` 18 (+11 aliases) · `done/plan-sprint-4c.md` 12 · `done/hotfix-post-sprint2.md` 10 · `done/plan-sprint-4b.md` 4 · `sprint-backlog.md` 1 · `knowledge-base/` 40 across 15 files · `reviews/` 15 across 11 files · `src/core/profile/{PlayerProfile,CreditContract,MatchQualification,Citizenship}.ts` 1 comment each · `profile-backup.sh` 1 · `.claude/skills/update-announcements/SKILL.md` 1 · backlog briefs 12 files · already-migrated done folders (`0013` 21, `0046` 3, `0049` 2, `0042` 1) · the 119 themselves: 57 lines (D5). **No Status cell is edited.**

**Left alone, reported:** 0002's own `plan.md`/`worklog.md`/`review.md` (historical record); this task's own artefacts; `static/`, `.fkit/` (git-ignored); names that were never tasks (`s3-5b-…`, `s3-5c-…`, `s4c-fix-archive-endpoint.md`, `task-feedback-match-history.md`, `s4-profile-08-backups.md`); two `See cancelled-tasks.md` pointers to the deleted file (`plan-index.md:71,74`, `hotfix-post-sprint2.md:148`) — flagged for 0004/producer.

**Wiki (READ-ONLY for this task):** `log.md` must stay unedited (append-only); the per-page list goes in the worklog hand-off for `@fkit-wiki` / task 0052.

## 6. Verification (run as one script; output pasted into `worklog.md`)

1. `done/`: 0 loose `.md`, 120 dirs (110 new + 10); `cancelled/`: 0 loose, 9 dirs.
2. `test -f <dir>/brief.md` for every folder on all three boards.
3. Duplicate-ID check across all boards → empty.
4. Sequence `0001`…`0191` contiguous; first new ID == old max + 1.
5. Folder prefix == `## ID` value for every folder.
6. Every `done/` brief's first `## Status` value line is exactly `✅ Done`; every `cancelled/` one matches the canonical dated form; every `## Owner` in the seven roles; 3 cancelled spot-checks against §3 records.
7. Repo-wide grep for the 119 legacy filenames (excluding `.git`, `node_modules`, `wiki-vault`, `static`, `.fkit`) → only the documented residual set, itemised.
8. `git diff --cached -M --name-status` → 119× `R100`; `git log --follow` on 3 old paths walks history (pre-commit substitution, as 0002's D-10).
9. The §2.4 byte-identity proof: 0 mismatches.
10. Every markdown link written by R1/R2 resolves.
11. Prettier + eslint on the 4 `.ts` files; `npm test`.
12. `dashboard.sh sprint-backlog.md` before/after: identical row set.
13. `git status` shows no `wiki-vault/` entry.

## 7. Sequencing

1. Regenerate + diff the map → freeze. 2. `git mv` ×119 (118 briefs + 1 plan). 3. Insert fields. 4. Rewrite references (R1–R5), `wiki-vault/` excluded. 5. Hand-review every hit on the shared-basename review ledgers and every alias rewrite. 6. Run §6. 7. Worklog with decision log + hand-off report. One uncommitted working-tree change; **no commit, no push**.

## 8. Risks (as tabled at the plan gate)

- IDs are permanent; no-`--follow` yields close-date order (75/119 differ under `--follow`).
- Substring collision `task-server-performance.md` ⊂ `5d-b-task-server-performance.md`.
- Shared basenames in `reviews/` (5) and wiki pages (13).
- 14 never-existed `s3-`/`s4-` variants — alias table is judgment.
- 57 cross-links inside the 119 (D5).
- HF-5 record is self-contradictory (`hotfix-post-sprint2.md:74` `✅ Done` vs `:148` / `plan-index.md:71` cancelled) — Status cell is 0004's.
- Possible duplicate task: `task-server-performance` vs `5d-b-task-server-performance` — both get IDs, nothing merged.
- `sec00`–`sec09` grouping leaves the filenames (index brief keeps the linkage).
- 0051's bare-identity sweep must now also use this map.
- Prettier may reflow the 4 `.ts` comment lines.
- Verification 7 can never reach literal zero while 0002's and this task's records exist.
