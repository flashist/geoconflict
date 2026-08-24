# Review — 0066

Task: ai-agents/tasks/done/0066-licensing-remediation-proprietary-purge/brief.md
File(s) under review: webpack.config.js, Dockerfile, src/client/sound/SoundManager.ts,
src/client/index.html, src/client/yandex-games_iframe.html, resources/manifest.json,
src/core/configuration/ProdConfig.ts, src/core/configuration/PreprodConfig.ts,
resources/images/GeoConflictFavicon.svg (new), staged deletions: proprietary/ (7 files),
resources/images/{Favicon.svg,Favicon.png,OpenFrontLogo.png,OpenFrontLogo.svg,OpenFrontLogoDark.svg}
Status: closed-out

## Reviewer findings

| #  | Round | Sev | file:line | Claim |
|----|-------|-----|-----------|-------|
| R1 | 1     | low | tsconfig.json:27 | Stale `"proprietary/**/*"` include pattern references the deleted directory. Harmless today (tsc only errors when zero inputs match across ALL includes; `src/**/*` matches — local build + docker-context inspection both consistent), but it is a dangling reference left by this diff's purge. |
| R2 | 1     | low | LICENSE-ASSETS:18-26, LICENSING.md:49-55,103-125 | Repo legal docs still document `/proprietary` as an existing All-Rights-Reserved directory and point to the now-deleted `/proprietary/LICENSE` ("See /proprietary/LICENSE for full terms"). After the purge these docs misdescribe the repo's actual licensing state — a coherence gap in a licensing-remediation task. Doc-only; nothing built or served. |
| R3 | 1     | low | resources/manifest.json:2-14 (icons), resources/icons/icon512_rounded.png, icon512_maskable.png | PWA manifest now says name/short_name "Geoconflict" but its install icons are still upstream OpenFront's app-icon PNGs (world-map-on-dark-rounded-square mark — visually verified). Same A1 brand-identity class as the replaced favicon, on the PWA-install surface. Not introduced by this diff (files predate it; outside the brief's enumerated deletion set) — a residual surface the brand-string retarget exposes. |

## Coder response

| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R1 | CORRECT | Defect (hygiene; sev low confirmed — tsc has matching inputs via other globs, no build impact) | Removed `"proprietary/**/*"` from `tsconfig.json` include (was line 27). Verified: `npx tsc --noEmit` clean. Owner-approved 2026-08-24. | ✅ done |
| R2 | CORRECT | Defect (doc coherence; sev low confirmed — docs only, nothing built/served) | Recorded the removal factually, minimal wording: `LICENSE-ASSETS` §Proprietary now states the `/proprietary` tree + its LICENSE were removed 2026-08-23 (task 0066), terms retained as historical/upstream-applicable; its Legal Notice bullet updated; `LICENSING.md` Phase 4 history left intact + fork-note line appended; §External/Proprietary bullet marked removed-from-fork. No new legal posture authored. Owner-approved 2026-08-24. | ✅ done |
| R3 | CORRECT | Frontier-move (residual brand surface, predates this diff; sev low confirmed — PWA-install surface only) | No code change (owner ruling 2026-08-24): folded into the existing placeholder-now/brand-later design follow-up; brief Notes extended to cover the two `icon512_*.png` install icons alongside the favicon redesign. Residual recorded below. | won't fix (frontier) |

## Accepted residuals (shared, do-not-re-litigate)

- claude-design-files OpenFrontLogo.svg copies — What: two repo-only copies under
  `resources/claude-design-files/**` stay (verification #2 grep expected non-empty) · Why
  (structural): owner ruling 2026-08-23; webpack-ignored, never built or served; deletion adds no
  licensing value · Re-raise only if: the design-files tree starts being emitted/served.
- No git-history rewrite — What: purged files remain in git history · Why (structural): owner-accepted
  audit recommendation; upstream distributes these files publicly; forward-clean is proportionate ·
  Re-raise only if: a takedown/complaint targets the repo history specifically.
- Placeholder favicon — What: trivially-original placeholder SVG now; proper brand design later ·
  Why (structural): owner ruling 2026-08-23; branding work not yet scoped · Re-raise only if:
  branding work is scoped.
- jwt fallback host "geoconflict.ru" both configs — What: same fallback for Prod AND Preprod · Why
  (structural): owner ruling at plan gate (no preprod geoconflict domain exists); worst-case fallback
  now derives own host `https://api.geoconflict.ru` · Re-raise only if: a real preprod domain is
  provisioned.
- Standalone footer ©OpenFront notice — What: `index.html` live footer keeps `©2025 OpenFront™` +
  GitHub/Wiki/Reddit links · Why (structural): deliberately untouched, owner informed (worklog);
  copyright-notice removal is a legal-posture call, not a string retarget · Re-raise only if: the
  owner rules on the footer.
- "Based on OpenFront" attribution — What: `main.license_text` stays, required · Why (structural):
  AGPL §7 + CC BY-SA attribution obligation · Re-raise only if: never (its removal would be the
  defect).
- PWA manifest install icons still upstream's mark (R3) — What: `resources/icons/icon512_rounded.png`
  + `icon512_maskable.png` stay for now; replacement folded into the favicon/brand-design follow-up
  recorded in the brief's Notes · Why (structural): owner ruling 2026-08-24; same
  placeholder-now/brand-later decision as the favicon — proper brand design is one batch of work,
  not yet scoped · Re-raise only if: branding work is scoped, or Yandex moderation flags the
  install icon.

## Close-out (reviewer, Round 2, 2026-08-24)

Fixes verified against the files, not the ledger claims:
- R1 — `tsconfig.json` include no longer contains `proprietary/**/*` (diff confirmed);
  `npx tsc --noEmit` re-run by reviewer → exit 0.
- R2 — `LICENSE-ASSETS` §Proprietary retitled/reworded to removed-2026-08-23 (task 0066) with terms
  retained as historical/upstream-applicable; dangling `See /proprietary/LICENSE` reference gone;
  Legal Notice bullet updated. `LICENSING.md`: Phase 4 history intact + fork-note appended
  (:57-59); §External/Proprietary bullet marked removed-from-fork (:115). Factual wording only —
  no new legal posture authored.
- R3 — residual recorded above; brief Notes extended to cover the icon512 install icons (brief:122).
- Scope integrity: the 0066 diff surface (8 modified files + staged deletions + new favicon) is
  unchanged since Round 1 (diff-stat match); no new references to purged files anywhere.

No open findings. Review closed. Prod-redeploy checks (worklog pendings) remain the task's own
owner-side validation gate; the 0065 flip-ON gate stands until Part A is deployed.
