# Task — Licensing Remediation: Purge Proprietary Music, Replace OpenFront Favicon, Retarget JWT Fallbacks

## ID
0066

## Sprint
Sprint 4

## Priority
High — **V1 gates the paid go-live: `0065`'s flip-ON must not execute until the proprietary music is
out of the production build.** The rest of the scope removes the fork's strongest brand-confusion
surface before Yandex moderation of a paid product.

## Status
✅ Done (agent-closed — not owner-verified) *(status value UNCHANGED — only the evidence record improved. ✅ **The two deferred prod checks, verification steps 7 and 8, were RUN AND PASSED in the browser against live production on 2026-08-30 by the lead.** The licensing gate therefore moves from **"shipped, not demonstrated" to DEMONSTRATED** — it gates `0065`'s paid go-live and is a legal-exposure item. Step 7's original "404/absent" wording was **wrong for this server** and is superseded: unknown paths hit the `app.get("*")` SPA catch-all, so the correct test is byte-identity against a known-nonexistent control. All seven purged paths matched the control; the new original favicon serves on both entry points. Method and numbers in the Verification section. The agent-closed marker stays — no human reviewed the code itself.)*

## Owner
fkit-coder

## Context

The `0025` licensing audit completed 2026-08-23 with **1 confirmed violation (V1), 1 trademark-posture
item (A1), and hygiene items** — findings report (ground truth for all file/line references below):
[`ai-agents/knowledge-base/reports/s4-licensing-asset-audit-findings.md`](../../../knowledge-base/reports/s4-licensing-asset-audit-findings.md).

All three scope items below were **approved by the owner 2026-08-23** (via AskUserQuestion in the
lead session) as ONE remediation task.

Key mitigating fact from the audit: **the game never plays the proprietary music** — all imports and
Howl entries are already commented out (`src/client/sound/SoundManager.ts:4-6, 23-40`, "Flashist
Adaptation: disabling music"). The only sound in use is `resources/sounds/effects/ka-ching.mp3`
(CC BY-SA, fine). So this task has **zero gameplay/UX impact**.

---

## What to Build

### Part A — V1: remove OpenFront's All-Rights-Reserved music from repo and build

Six music files (18 MB) under `proprietary/` (All Rights Reserved, license explicitly forbids
commercial use outside OpenFront) currently ship to the served web root and are redistributed via
the public GitHub repo. Confirmed serving live at `geoconflict.ru/sounds/music/*.mp3` as of deployed
commit `bcdf9af`.

1. Delete the CopyPlugin `proprietary` pattern — `webpack.config.js:360-364`.
2. Delete `COPY proprietary ./proprietary` — `Dockerfile:44`.
3. `git rm -r proprietary/` — removes the tree from the working copy AND the public repo going
   forward.
4. Delete the dead commented music imports/Howl blocks in `src/client/sound/SoundManager.ts`
   (lines 3-6, 22-41 per the audit) — they reference files that will no longer exist.
5. **Explicitly out of scope:** git history rewrite. Audit recommendation, accepted: upstream itself
   distributes these files publicly; forward-clean is the proportionate fix.

### Part B — A1: replace the OpenFront favicon with an ORIGINAL placeholder; delete brand files

The live favicon of BOTH HTML entry points is upstream's brand mark (`resources/images/Favicon.svg`,
referenced at `src/client/index.html:9` and `src/client/yandex-games_iframe.html:12`). Copyright is
likely fine (CC at fork date), but as our tab/platform identity it exceeds nominative attribution —
trademark exposure, and a possible Yandex moderation flag for a paid product.

1. Create a **simple ORIGINAL placeholder icon** (owner-ruled 2026-08-23: placeholder now, proper
   design later — see Notes). Any trivially-original mark is acceptable; it must not derive from any
   OpenFront asset.
2. Reference it from **both** HTML templates — `src/client/index.html` AND
   `src/client/yandex-games_iframe.html` must stay in sync (the Yandex one is what production
   serves).
3. Delete the replaced upstream favicon files (`resources/images/Favicon.svg` and its `.png`
   counterpart if present) and the three unused brand images:
   `resources/images/OpenFrontLogo.png`, `OpenFrontLogo.svg`, `OpenFrontLogoDark.svg`
   (referenced by no source code — audit-verified).

### Part C — H1: retarget the `openfront.io` / `openfront.dev` jwt-audience fallback strings

The shipped bundle carries OpenFront-host fallbacks: `jwtAudience()` defaults at `ProdConfig.ts:27`
(`openfront.io`) and `PreprodConfig.ts:21` (`openfront.dev`). In practice overridden by `/api/env`,
but the latent chain matters: if runtime config and `JWT_AUDIENCE` were both missing,
`DefaultConfig.jwtIssuer()` (`DefaultConfig.ts:178-186`) would fetch OpenFront's jwks — a call to
OpenFront infrastructure from our product.

1. Change both fallbacks to the corresponding geoconflict host (per the audit recommendation).
2. Do not restructure the JWT path — it is near-dead here (`src/server/jwt.ts:23-24` short-circuits
   on persistentIds); this is a string retarget, not a refactor.

---

## Verification

**Local / pre-deploy:**
1. Fresh `npm run build-prod`: `static/` output contains **no** `sounds/music/` files and no
   `proprietary` content; no `OpenFrontLogo.*` or upstream `Favicon.*` in the output.
2. `git ls-files proprietary` returns nothing; `git ls-files | grep -i openfrontlogo` returns
   nothing.
3. Both HTML templates reference the new placeholder icon, identically; it renders as the tab icon
   in a local run (standalone AND a Yandex-iframe-template check).
4. Grep the built bundle: no `openfront.io` / `openfront.dev` jwt-audience fallback strings remain
   (other inert commented HTML leftovers are H3, out of scope here).
5. `npm test` + `npm run lint` green; the `SoundManager.ts` edit is dead-code deletion only —
   ka-ching effect still plays.
6. H2 side-effect check (audit): with `proprietary/LICENSE` gone, `static/LICENSE` now maps only
   from `resources/LICENSE` (the CC BY-SA notice) — collision moot.

**Prod redeploy check — ✅ RUN AND PASSED 2026-08-30** *(previously deferred; deploys are
owner-triggered. The lead ran both checks in the browser against live production on 2026-08-30. **This
moves the licensing gate from "shipped, not demonstrated" to DEMONSTRATED** — which matters because it
gates `0065`'s paid go-live and is a legal-exposure item.)*

7. ~~`https://geoconflict.ru/sounds/music/openfront.mp3` (and `war.mp3`, `win.mp3`) → **404/absent**.~~

   ⚠️ **SUPERSEDED — "404/absent" is the WRONG TEST for this server and would make a future re-run read
   a pass as a failure.** Original wording kept above, struck through, deliberately.

   **The correct test: a purged path must return the SPA fallback, BYTE-IDENTICAL to a known-nonexistent
   control path — never a 404.** This server has no 404 for unknown paths: `app.get("*")` in
   `src/server/Master.ts` serves the SPA shell for anything unmatched (the same catch-all mechanism
   `0198` turned on). So a `200` here proves nothing on its own, and an expectation of `404` can never
   be met.

   **The control method, recorded so this is reproducible:**
   - **Nonexistent control** — request a path that certainly does not exist, e.g.
     `/this-path-cannot-exist-12345.png`. On 2026-08-30 it returned **`200`, `10801` bytes,
     `text/html`**. That is the SPA shell, and it is the signature of "not served".
   - **Positive control** — request a path that certainly *does* exist, e.g. `/commit.txt`. It returned
     **`41` bytes of `text/plain`**, proving real assets still serve normally and the fallback is not
     swallowing everything.
   - **A purged path passes iff it is byte-identical to the nonexistent control** — same status, same
     byte count, same content-type.

   **Result 2026-08-30 — PASS.** All **seven** purged paths returned `200` / `10801` bytes /
   `text/html`, byte-identical to the nonexistent control, so **none serves real content**:
   `/sounds/music/openfront.mp3`, `/sounds/music/war.mp3`, `/sounds/music/win.mp3`,
   `/images/OpenFrontLogo.png`, `/images/OpenFrontLogo.svg`, `/images/OpenFrontLogoDark.svg`,
   `/images/Favicon.svg`.

   📌 **Read the `200`s correctly: they are a PASS, not a failure.** Anyone re-running this and seeing
   seven `200`s has reproduced the pass, not found a regression. Compare against the control before
   concluding anything.

8. ✅ **PASS 2026-08-30 — the new favicon serves, on BOTH entry points.** The live page links
   `/images/GeoConflictFavicon.7aaf278f4fba2c4b180d.svg`, which returned **`200`, 445 bytes,
   `image/svg+xml`** — a real, original SVG, not the SPA fallback. **`yandex-games_iframe.html` links
   the identical hashed file**, so both entry points carry the same original icon — including the
   template that actually runs in production. Legacy `OpenFrontLogo.*` and `Favicon.svg` no longer
   serve real content, per step 7's seven-path result above.

## Notes

- **Owner ruling 2026-08-23 (build phase): verification check #2's `git ls-files | grep -i
  openfrontlogo` is EXPECTED NON-EMPTY** — two `OpenFrontLogo.svg` copies inside
  `resources/claude-design-files/**` design-handoff bundles are accepted as repo-only residue
  (never built or served; webpack-ignored). Review/close must not flag this as a failure.
- **Owner ruling 2026-08-23 (build phase): brand strings folded into this task** — both templates'
  `<title>` values and `manifest.json` name/short_name retargeted to Geoconflict naming. The
  "Based on OpenFront" attribution (`main.license_text`) stays, untouched.
- **Gate (say it loudly): `0065` step 6 (flip-ON / paid go-live) must not execute before this task's
  V1 part is deployed.** `0065`'s Notes carry the cross-reference.
- **Favicon follow-up (owner-ruled 2026-08-23, recorded here instead of a design task):** the
  placeholder is deliberately temporary; a properly designed GeoConflict favicon/brand icon is
  wanted later. Re-raise when branding work is scoped — do not create a design task now.
  **Extended by owner ruling 2026-08-24 (review R3):** the PWA manifest install icons
  (`resources/icons/icon512_rounded.png`, `icon512_maskable.png`) are still upstream OpenFront's
  app-icon mark — same placeholder-now/brand-later follow-up; replace them together with the
  proper favicon/brand design. No code change in this task.
- **Owner-ruled 2026-08-24 (open-questions interview, relayed via the lead session): the standalone
  template footer's existing upstream mentions (©2025 OpenFront™, source/community links) are KEPT;
  no new upstream-brand mentions may be added.** Recorded here because this brief owns the
  brand-mention surface; the H3 inert-leftover cleanup (`0073`) must not touch the footer.
- Out of scope, per the audit: git history rewrite (see Part A.5); H3 inert HTML leftovers
  ("delete at leisure"); the ShareAlike constraint on paid cosmetics (recorded in the audit's
  Part 2 — relevant to `0010`/`0011`, not to this task).
- Attribution stays: the "Based on OpenFront" line (`main.license_text`) and the repo license files
  are **required** (AGPL §7 + CC BY-SA) — this task removes brand *assets*, never the attribution.
- **Never commit or push unprompted** — Part A.3 is a staged working-tree change like any other;
  the commit is the owner's call.
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
