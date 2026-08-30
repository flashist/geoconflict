# Licensing Remediation — Proprietary Purge, Favicon Replacement, JWT Fallback Retarget

**Source**: `ai-agents/tasks/done/0066-licensing-remediation-proprietary-purge/brief.md`
**Status**: done (agent-closed — not owner-verified; **deployed in `362a2f9` 2026-08-29 — deploy proven, effect unverified**)
**Sprint/Tag**: Sprint 4, task 0066

## Goal

Fix the confirmed violation and the trademark-posture item from the 0025 licensing audit
(`ai-agents/knowledge-base/reports/s4-licensing-asset-audit-findings.md`) before paid citizenship
goes live. All three scope items were owner-approved 2026-08-23 as one remediation task. Priority
driver: **V1 gates the paid go-live — `0065`'s flip-ON must not execute until the proprietary music
is out of the production build.**

## Key Changes

- **Part A (V1)** — purge OpenFront's All-Rights-Reserved music (6 files, 18 MB, `proprietary/`)
  from repo and build: CopyPlugin pattern deleted (`webpack.config.js`), `COPY proprietary` deleted
  (`Dockerfile`), `git rm -r proprietary/`, dead commented music imports/Howl blocks deleted in
  `src/client/sound/SoundManager.ts`. Zero gameplay impact — the game never played them; the only
  sound in use is `resources/sounds/effects/ka-ching.mp3` (CC BY-SA). Git history rewrite explicitly
  out of scope (upstream distributes the files publicly; forward-clean is proportionate).
- **Part B (A1)** — the live favicon (upstream's brand mark `resources/images/Favicon.svg`, since **deleted** — the icon both templates reference today is `resources/images/GeoConflictFavicon.svg`) replaced
  with a simple **original placeholder** icon in both HTML templates (`src/client/index.html` and
  `src/client/yandex-games_iframe.html`); the replaced favicon files and the three unused
  `OpenFrontLogo.*` brand images deleted. Owner-ruled: placeholder now, proper design later.
- **Part C (H1)** — `jwtAudience()` fallback strings retargeted off `openfront.io` / `openfront.dev`
  (`ProdConfig.ts`, `PreprodConfig.ts`) to geoconflict hosts; string retarget only, no JWT
  restructure.
- **Fold-in (owner-ruled 2026-08-23)** — both templates' `<title>` values and `manifest.json`
  name/short_name retargeted to Geoconflict naming. The "Based on OpenFront" attribution
  (`main.license_text`) stays untouched — it is required (AGPL §7 + CC BY-SA).

## Outcome

Built and review-converged 2026-08-24; closed to `done/` the same day (agent-closed — not
owner-verified).

> 🔧 **CORRECTED 2026-08-30 — this paragraph previously said "Deployment has NOT happened", and that
> is no longer true.** A production release landed as commit `362a2f9`; this task's commit
> (`6f66aff` — proprietary-music purge, original favicon, JWT fallback retarget) is an **ancestor of
> that release**, and the release is live in production per the `commit.txt` check recorded in
> [[tasks/prod-api-env-https-apex]]. **`0065`'s flip-ON gate — "`0066` DEPLOYED to prod" — is
> therefore satisfied on the deploy fact.**
>
> ⚠️ **What is NOT established: that the intended effect is visible.** The three prod redeploy checks
> this task listed — the removed music URLs returning 404, the placeholder favicon serving, and
> `OpenFrontLogo.png` no longer serving — **were not run in this pass and remain unevidenced.** The
> deploy is proven; the outcome of the deploy is not. Anyone treating the licensing gate as
> *demonstrated* rather than *shipped* should run those three checks first.

Accepted residuals (owner-ruled):
- Two `OpenFrontLogo.svg` copies inside `resources/claude-design-files/**` stay as repo-only residue
  (never built or served; webpack-ignored) — check #2's grep is expected non-empty.
- The PWA manifest install icons (`resources/icons/icon512_rounded.png`, `icon512_maskable.png`) are
  still upstream OpenFront's app-icon mark — same placeholder-now/brand-later follow-up as the
  favicon (owner-ruled 2026-08-24, review R3); replace together with the proper brand design. No
  design task filed, by ruling.
- Out of scope per the audit: H3 inert HTML leftovers; the ShareAlike constraint on paid cosmetics
  (relevant to `0010`/`0011`).

## Related

- [[decisions/licensing-compliance]] — the compliance posture this task's audit findings and fixes
  feed into
- [[decisions/sprint-4]] — the sprint carrying the 0025 audit → 0066 remediation → 0065 go-live gate
  chain
- [[systems/project-brief]] — carries the paid-IAP licensing gate this remediation must deploy to
  clear
- [[tasks/prod-api-env-https-apex]] — task `0063`, whose close-out carries the `362a2f9`
  production-deploy evidence this page now cites
