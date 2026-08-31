# Licensing Remediation — Proprietary Purge, Favicon Replacement, JWT Fallback Retarget

**Source**: `ai-agents/tasks/done/0066-licensing-remediation-proprietary-purge/brief.md`
**Status**: done (agent-closed — not owner-verified; **deployed in `362a2f9` 2026-08-29, and the licensing gate is DEMONSTRATED as of 2026-08-30 — both deferred prod checks ran and passed**)
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
> ✅ **UPDATED 2026-08-30 — the checks were run, and the gate is now DEMONSTRATED.** The paragraph
> that stood here said the three prod redeploy checks were unevidenced and that anyone treating the
> gate as *demonstrated* rather than *shipped* should run them first. **They were run, in the browser
> against live production, by the lead on 2026-08-30, and they passed.** The licensing gate moves from
> **"shipped, not demonstrated" to DEMONSTRATED** — which matters because it is a legal-exposure item
> and it gates `0065`'s paid go-live. The status value did **not** change and the agent-closed marker
> stays: no human reviewed the code itself.

### 🚨 Read the `200`s correctly — they are a PASS, not a failure

**The brief's original "the purged URLs must return 404" expectation is WRONG FOR THIS SERVER and is
superseded.** This server has no 404 for unknown paths: `app.get("*")` in `src/server/Master.ts`
serves the SPA shell for anything unmatched (the same catch-all mechanism task `0198` turned on). A
`200` on a purged path therefore proves nothing on its own, and an expectation of `404` **can never be
met**. Anyone re-running this and seeing seven `200`s has **reproduced the pass**, not found a
regression.

**The correct test — byte-identity against a known-nonexistent control.** Recorded here so the method
survives, not just the verdict:

| Control | Request | Result 2026-08-30 |
|---|---|---|
| **Negative** — a path that certainly does not exist | `/this-path-cannot-exist-12345.png` | `200`, **10801 bytes**, `text/html` — the SPA shell; this is the signature of "not served" |
| **Positive** — a path that certainly does exist | `/commit.txt` | **41 bytes**, `text/plain` — real assets still serve normally, so the fallback is not swallowing everything |

**A purged path passes iff it is byte-identical to the negative control** — same status, same byte
count, same content-type.

**Result — PASS.** All **seven** purged paths returned `200` / `10801` bytes / `text/html`,
byte-identical to the negative control, so **none serves real content**:
`/sounds/music/openfront.mp3`, `/sounds/music/war.mp3`, `/sounds/music/win.mp3`,
`/images/OpenFrontLogo.png`, `/images/OpenFrontLogo.svg`, `/images/OpenFrontLogoDark.svg`,
`/images/Favicon.svg`.

**The new favicon serves on BOTH entry points.** The live page links a hashed
`GeoConflictFavicon.svg`, which returned `200`, **445 bytes**, `image/svg+xml` — a real original SVG,
not the SPA fallback. **`src/client/yandex-games_iframe.html` links the identical hashed file**, so
both entry points carry the same original icon, including the template that actually runs in
production.

**The Dockerfile pending is verified AT SOURCE, not inferred** (re-checked against the repository
during this ingest, not taken on report): `Dockerfile` has **no `COPY proprietary` line at all** —
lines 38–43 are an explicit allowlist copy whose own comment says it exists so local files cannot ride
along. `proprietary/` is untracked, no `sounds/music` files are tracked, and the only
`OpenFrontLogo.svg` hits are the two `resources/claude-design-files/**` design-handoff copies — exactly
the residue the owner's 2026-08-23 ruling declared **expected non-empty**.

> ⚠️ **This clears ONE of `0065`'s blockers and no others.** `0065`'s licensing gate is now
> demonstrated; its other three blockers — `0014`, `0062`, `0195` — **remain open and unchanged**. The
> paid go-live is **not** unblocked.

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

- [[tasks/licensing-asset-audit]] — task `0025`, the audit this task remediates; closed 2026-08-31
  with V1/A1/H1 verified in production and **H3 left open under `0073`** (out of this task's scope)
- [[decisions/licensing-compliance]] — the compliance posture this task's audit findings and fixes
  feed into
- [[decisions/sprint-4]] — the sprint carrying the 0025 audit → 0066 remediation → 0065 go-live gate
  chain
- [[systems/project-brief]] — carries the paid-IAP licensing gate this remediation must deploy to
  clear
- [[tasks/prod-api-env-https-apex]] — task `0063`, whose close-out carries the `362a2f9`
  production-deploy evidence this page now cites
- [[tasks/private-lobby-start-url]] — task `0198`, whose fix relies on the same `app.get("*")` SPA
  catch-all that makes "expect a 404" the wrong test here
