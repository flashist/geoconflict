# Licensing / Asset Audit — Findings (Task 0025)

**Date:** 2026-08-23
**Auditor:** fkit-architect
**Task:** `ai-agents/tasks/done/0025-licensing-asset-audit/brief.md`
**Verdict:** **ISSUES FOUND — 1 confirmed violation (V1), 1 trademark-posture decision (A1), 3 hygiene items.**
**Gate impact:** V1 must be fixed (trivial removal, no gameplay impact) before paid citizenship (task 0065) goes live.

> Not legal advice. Copyright/trademark readings below are engineering analysis of the license
> texts, per `ai-agents/knowledge-base/GeoConflict-Licensing-Brief.md`.

---

## V1 — VIOLATION: OpenFront's All-Rights-Reserved music ships to the production web root

**What:** The fork carries upstream's `proprietary/` directory — 6 music files (18 MB):
`openfront.mp3, war.mp3, win.mp3, of2.mp3, of4.mp3, evan.mp3` plus `proprietary/LICENSE`
(OpenFront LLC, All Rights Reserved; explicitly forbids use "for any commercial purpose outside
of running OpenFront" and redistribution — `proprietary/LICENSE:16-20`).

**How it ships (three independent confirmations):**
1. Build config: `webpack.config.js:360-364` — a CopyPlugin pattern copies the whole
   `proprietary/` tree into `static/` (the served web root).
2. Deploy pipeline: `Dockerfile:44` — `COPY proprietary ./proprietary` into the build stage,
   then `npm run build-prod` (`Dockerfile:46`); `static` is in `.dockerignore`, so the image's
   copy comes freshly from this build every deploy. Verified in a fresh local production build
   (2026-08-23): `static/sounds/music/` contains all 6 files.
3. **Live production:** `https://geoconflict.ru/sounds/music/war.mp3` → HTTP 200,
   `audio/mpeg`, 3,515,315 bytes (matches the repo file); same for `win.mp3` (860,856 B) and
   `openfront.mp3` (4,043,825 B). Deployed commit `bcdf9af` (2026-08-22) — this is current, not stale.

**Provenance:** upstream added these files directly into `/proprietary` on 2025-09-30 (upstream
commit `b31200a3ac`, "MUSIC (#2090)") — they were **never** under CC BY-SA. Our fork
(2025-11-04, `feea527`) inherited them already-restricted.

**Mitigating fact:** the game never plays them. All imports and Howl entries are commented out —
`src/client/sound/SoundManager.ts:4-6, 23-40` ("Flashist Adaptation: disabling music"). The JS
bundle does not embed them. This is pure dead weight being publicly distributed by a commercial
product — and also redistributed via the public GitHub repo (`github.com/flashist/geoconflict`,
confirmed public; `git ls-files proprietary` shows all 7 files tracked).

**Remediation (follow-up implementation task to scope):**
1. Delete the CopyPlugin `proprietary` pattern (`webpack.config.js:360-364`).
2. Delete `COPY proprietary ./proprietary` (`Dockerfile:44`).
3. `git rm -r proprietary/` (removes it from the public repo too).
4. Delete the dead commented imports/Howl blocks in `SoundManager.ts` (lines 3-6, 22-41).
5. Redeploy; verify `https://geoconflict.ru/sounds/music/openfront.mp3` → 404.
6. (Optional, owner call) history rewrite is NOT recommended — upstream itself distributes these
   files in its public repo; going forward-clean is the proportionate fix.

Zero gameplay/UX impact: the only sound in use is `resources/sounds/effects/ka-ching.mp3`
(upstream `/resources`, CC BY-SA — fine).

---

## A1 — ATTENTION (owner decision): OpenFront brand images in `resources/images/`, one is the live favicon

**What:** `resources/images/OpenFrontLogo.png`, `OpenFrontLogo.svg`, `OpenFrontLogoDark.svg`,
`Favicon.svg` are upstream's brand images. `Favicon.svg` is **actively used** as the favicon of
both HTML entry points (`src/client/index.html:9`, `src/client/yandex-games_iframe.html:12`) and
serves live (`geoconflict.ru/images/Favicon.*` and `/images/OpenFrontLogo.png` → 200 with real
content types; `OpenFrontLogo.png` is byte-identical to upstream's current `/proprietary` copy,
sha256 `3f3830fd…`). The three logo files are referenced by no source code — dead weight, but
publicly served.

**Copyright reading:** likely **not** infringement. Upstream moved these images from
`/resources` to `/proprietary` only on **2026-04-16** (upstream commit `1ebac8e854`, "Move brand
images to proprietary/"). Our fork date is **2025-11-04** — at receipt they were CC BY-SA 4.0,
and CC licenses are irrevocable for copies already received. (Caveat: engineering reading, not
legal advice.)

**Why act anyway:**
- **Trademark ≠ copyright.** The licensing brief's trademark caution
  (`GeoConflict-Licensing-Brief.md:124`) says to keep "OpenFront" to the attribution line. Using
  OpenFront's brand mark as *our product's favicon* — the icon Yandex/browser tabs identify us by —
  exceeds nominative attribution and is the strongest brand-confusion surface we have.
- Upstream now classifies these as proprietary brand assets; keeping them invites a dispute we
  win on paper but lose on time.
- Yandex moderation for a paid product may flag foreign-brand marks.

**Recommendation:** replace the favicon with a GeoConflict-original icon (both HTML templates —
they must stay in sync) and delete the three `OpenFrontLogo.*` files + `Favicon.svg/png`.
Cheap, removes the exposure entirely.

---

## Hygiene (low risk, no gate)

- **H1 — `openfront.io` / `openfront.dev` fallback strings in the shipped bundle.** From
  `ProdConfig.ts:27` and `PreprodConfig.ts:21` (`jwtAudience()` defaults), visible in
  `static/js/*.js`. In practice overridden: live `/api/env` returns
  `jwtAudience: <prod host>`, so no OpenFront call happens. Latent risk: if runtime config and
  `JWT_AUDIENCE` were ever both missing, `DefaultConfig.jwtIssuer()`
  (`DefaultConfig.ts:178-186`) would fetch `https://api.openfront.io/.well-known/jwks.json` —
  an OpenFront API call. Recommend: change the fallback to `geoconflict.ru` or throw. Note the
  JWT path itself is near-dead here (tokens are persistentIds, short-circuited at
  `src/server/jwt.ts:23-24`; Discord login is not part of the Yandex flow).
- **H2 — `static/LICENSE` collision.** Both `resources/LICENSE` (CC BY-SA notice) and
  `proprietary/LICENSE` map to `static/LICENSE`; live serves the 283-byte CC one — mislabeling
  the proprietary music served next to it. Moot once V1 lands.
- **H3 — inert upstream leftovers in HTML.** Commented-out `og:url https://openfront.io`,
  googletag `page_url "http://openfront.io"`, Publift/Fuse CDN script, Steam wishlist link
  (`WinModal.ts:277-289` returns empty). All dead code; delete at leisure.

---

## Part 1 — Build pipeline scan (results)

| Check | Result |
|---|---|
| OpenFront CDN/API references in prod JS bundle | **Clean.** Full external-host scan of `static/js/*.js`: w3.org, github.com, cdn.discordapp.com (Discord avatars — feature-gated, not OpenFront), browser bug trackers, pixijs.com, vk.com, t.me. Only `openfront.io/.dev` strings are the H1 jwt fallbacks. |
| Runtime `fetch`/import of OpenFront-hosted resources in `src/` | **Clean.** No live code path fetches OpenFront infra (H1 latent fallback aside). Steam/Fuse/googletag all commented out or stubbed. |
| `/proprietary` assets in build output | **VIOLATION — V1** (music). Brand images: see A1 (CC-at-receipt, trademark concern). |
| Client calls OpenFront API at runtime | **No** — verified live `/api/env` config; audience/issuer point at own host. |

## Part 2 — Asset inventory

| Origin | Assets | License / status |
|---|---|---|
| OpenFront `/resources` at fork (2025-11-04) | sprites (`resources/sprites/*` — matches upstream), `flags_source/` (upstream `resources/flags`, runtime-suppressed by design), fonts (`overpass*.woff` — Overpass is an open Red Hat font; `round_6x6_modified.*` bitmap font), `sounds/effects/ka-ching.mp3`, most `images/*` UI icons, maps, lang files | CC BY-SA 4.0 — allowed with attribution (in place, see Part 3). Everything in upstream `resources/` at fork date was CC BY-SA; upstream's only `/proprietary` content then was the V1 music + LICENSE, so no other upstream-proprietary file can be in our `resources/`. |
| OpenFront `/proprietary` | 6 music files (`proprietary/sounds/music/`) | **All Rights Reserved — V1, remove** |
| OpenFront brand (CC at receipt, now upstream-proprietary) | `OpenFrontLogo.png/.svg/Dark.svg`, `Favicon.svg/png` | A1 — recommend replace/delete |
| GeoConflict-original (post-fork) | halloween sprite set, helpModal screenshots/webp, several unit icons, `Loading_icon.gif`, announcements, cosmetics.json edits, ru localization | Owned; note ShareAlike below |
| Third-party | Map data: OSM (ODbL), Natural Earth (PD), Bedmap3 (CC-BY 4.0); icons from The Noun Project; platform logos (GitHub, Discord, VK, Telegram — nominative use); Yandex SDK (runtime, platform-required) | Attributed in `CREDITS.md`; no issues found |

**ShareAlike note for monetization:** assets derived from upstream CC BY-SA art (including
modified sprites/screenshots) remain CC BY-SA — they cannot be sold as exclusive content. The
planned paid non-country flags must be original GeoConflict work to be genuinely proprietary
(consistent with the licensing brief, `GeoConflict-Licensing-Brief.md:112-116`).

## Part 3 — Attribution coverage

**In place:**
- In-game "Based on OpenFront" — `resources/lang/en.json:50` (`main.license_text`), rendered at
  `src/client/Main.ts:193`. Satisfies both AGPL Section 7 and the CC BY-SA attribution
  ("OpenFront") for `/resources` assets.
- Repo root preserves upstream `LICENSE` (AGPL v3 + Section 7 terms), `LICENSE-ASSETS`
  (CC BY-SA / proprietary split), `LICENSING.md` (license history), `CREDITS.md` (map data,
  icons).
- Public source repo exists and is public (`github.com/flashist/geoconflict`) — the AGPL §13
  Source-Code-link work is tracked separately per the brief and not gated here.

## Verified-clean side-checks

- `claude-design-files` are **not** served in prod: `geoconflict.ru/claude-design-files/...`
  returns the SPA fallback `index.html` (Content-Type text/html), not files; a fresh production
  build emits none of them (webpack ignore at `webpack.config.js:358` works; `.dockerignore`
  excludes `static`). The stale copies in the **local** `static/` dir are leftovers webpack's
  `clean` didn't remove — cosmetic, local-only.
- No `OpenFront.ttf`, `OF.png/webp`, or `OpenFront.png/webp` (the rest of upstream's current
  proprietary set) anywhere in the fork.

## Method / evidence base

Webpack + Dockerfile static-copy contract read directly; fresh `npm run build-prod` output
inspected (`static/`); prod bundle host-scanned; live production probed with content-type/size
verification (deployed commit `bcdf9af`, 2026-08-22); provenance established against the
upstream GitHub tree and commit history for `/proprietary` paths (fork history is squashed at
`feea527`, so upstream API was the provenance source). Not done: per-file hash comparison of all
~3,000 resource files against upstream — unnecessary, since everything in upstream `resources/`
at fork date carried CC BY-SA and only `/proprietary` membership matters; that set was
enumerated and checked exhaustively.

## Owner decisions needed

1. **Approve V1 remediation task** (purge `proprietary/` + webpack/Dockerfile lines + dead
   SoundManager code; redeploy; verify 404). Gates task 0065.
2. **A1:** approve replacing the favicon with a GeoConflict-original icon and deleting the
   OpenFront brand files — or explicitly accept the trademark exposure.
3. **H1 (optional):** change `jwtAudience` fallbacks off `openfront.io/.dev`.
