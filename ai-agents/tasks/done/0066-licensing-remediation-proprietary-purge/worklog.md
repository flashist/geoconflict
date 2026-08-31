# Worklog — Task 0066: Licensing Remediation (Proprietary Purge)

**Coder:** fkit-coder (sprint-ship-loop Build worker, declared-approval path per ADR-032)
**Plan:** `plan.md` (this folder) — approved by owner 2026-08-23 via AskUserQuestion relay in the
lead session. Owner ruling on the plan's one NEEDS-DECISION: jwt-audience fallback =
`"geoconflict.ru"` for BOTH ProdConfig and PreprodConfig.

## Changes (all within the approved plan)

### Part A — proprietary music purge (V1, gates 0065)
- `webpack.config.js` — deleted the CopyPlugin `proprietary` pattern (was lines 360–364).
- `Dockerfile` — deleted `COPY proprietary ./proprietary` (was line 44).
- `git rm -r proprietary/` — 7 files staged for deletion (6 mp3 + LICENSE, 18 MB).
- `src/client/sound/SoundManager.ts` — deleted dead commented music imports and the three
  commented Howl blocks; constructor now `this.backgroundMusic = [];` under a single
  `// Flashist Adaptation: upstream background music removed for licensing (task 0066)` marker.
  Consumers verified safe on the empty array (length-guarded no-ops; `playNext` unreachable).

### Part B — original placeholder favicon (A1)
- **Created** `resources/images/GeoConflictFavicon.svg` — hand-authored original 64×64 SVG:
  dark slate rounded square (#1e293b), irregular green territory polygon (#4ade80), gold
  capital dot (#facc15). No OpenFront derivation; no country flags. Temporary placeholder;
  proper brand design is a recorded later follow-up (brief Notes).
- `src/client/index.html:9` + `src/client/yandex-games_iframe.html:12` — icon link retargeted
  to the new SVG, MIME corrected `image/x-icon` → `image/svg+xml`. Identical lines, both files.
  Third template (`yandex-games_iframe-parent.html`) has no icon ref — untouched, as planned.
- `git rm` staged for 5 brand files: `resources/images/Favicon.svg`, `Favicon.png`,
  `OpenFrontLogo.png`, `OpenFrontLogo.svg`, `OpenFrontLogoDark.svg`.
- Side-check: `resources/manifest.json` icons point to `/icons/icon512_*.png` — unaffected.

### Part C — jwt-audience fallback retarget (H1)
- `src/core/configuration/ProdConfig.ts:27` — `"openfront.io"` → `"geoconflict.ru"`.
- `src/core/configuration/PreprodConfig.ts:21` — `"openfront.dev"` → `"geoconflict.ru"`
  (owner-ruled). Worst-case fallback now derives `https://api.geoconflict.ru` (own host).

## Increment 2 — brand strings (owner-ruled fold-in, 2026-08-23)

Owner rulings via AskUserQuestion relay in the lead session:
1. The two `claude-design-files` `OpenFrontLogo.svg` copies: **accepted as residue — not
   deleted.** Verification check #2's grep is expected non-empty by owner ruling (recorded in
   the brief's Notes so review/close doesn't flag it).
2. Brand strings folded into 0066:
   - `src/client/index.html` `<title>`: `OpenFront (ALPHA)` → `Geoconflict`
   - `src/client/yandex-games_iframe.html` `<title>`: `YANDEX GAMES - OpenFront (ALPHA)` →
     `Геоконфликт` (production template, ru audience — matches `ru.json` `main.title`; the
     ru/en split is the delegated wording choice, templates stay distinct as before)
   - `resources/manifest.json`: `name` `OpenFront.io` → `Geoconflict`, `short_name`
     `OpenFront` → `Geoconflict` (Latin domain-brand form kept for the PWA manifest)
   - Sweep of served HTML/manifest for other user-visible OpenFront brand strings:
     - Production template (`yandex-games_iframe.html`): upstream footer is fully commented
       out and **minification strips it** — emitted production HTML now contains **zero**
       OpenFront strings. Live footer is only `#license-credits` (attribution target).
     - Standalone `index.html`: live footer keeps `©2025 OpenFront™` + GitHub source link,
       Wiki (openfront.miraheze.org), Reddit (r/Openfront). **Left untouched** — upstream
       copyright notice / source link / community links are attribution-adjacent, not product
       -identity naming ("same kind"); removing a copyright notice is a legal-posture call,
       not a string retarget. Flagged to the driver.
   - **Attribution untouched, verified:** `main.license_text` ("Based on OpenFront" /
     "Основано на OpenFront") not in my diff (`git diff` on both lang files contains no
     license lines; the lang-file diffs are 0017's). No code identifiers/comments touched.

## Verification ledger (2026-08-23)

| # | Check | Command / method | Outcome |
|---|---|---|---|
| 1 | Fresh prod build | `rm -rf static/ && npm run build-prod` | ✅ compiled (2 warnings — pre-existing entrypoint-size only) |
| 2 | No music/proprietary in `static/` | `find static` for mp3/music/proprietar | ✅ only `sounds/ka-ching.*.mp3` (CC BY-SA effect) |
| 3 | No brand files in `static/` | `find static -iname *openfrontlogo* -o -iname favicon*` | ✅ empty |
| 4 | New favicon emitted + referenced | grep emitted HTML | ✅ both HTMLs: `rel="icon" type="image/svg+xml" href="/images/GeoConflictFavicon.<hash>.svg"`, identical |
| 5 | `static/LICENSE` collision moot (H2) | `wc -c` + head | ✅ 283-byte CC BY-SA notice only |
| 6 | Bundle jwt-fallback grep | `grep -o "openfront\.io\|openfront\.dev" static/js/*.js` | ✅ zero matches ("Based on OpenFront" attribution untouched, stays) |
| 7 | `git ls-files proprietary` | — | ✅ empty |
| 8 | `git ls-files \| grep -i openfrontlogo` | — | ⚠️ NOT empty: 2 copies under `resources/claude-design-files/**` — outside the plan's file set, NOT deleted; NEEDS-DECISION (see below). Build-excluded (webpack ignore) and not served (audit-verified). |
| 9 | Test suite | `npm test` | ✅ 89 suites / 709 tests passed |
| 10 | Lint | `npm run lint` | ✅ clean |
| 11 | Local serving, both templates | `npm run start:client` + curl :9000 | ✅ both pages link the new icon; asset 200, `image/svg+xml`, 445 B |
| 12 | SVG renders | `xmllint --noout` + QuickLook rasterize + visual inspect | ✅ well-formed; renders as designed (Playwright browser backend failed to launch — 2× 30s timeout — so render proof is via QuickLook rasterization instead of a live tab) |
| 13 | Increment 2: fresh rebuild | `rm -rf static/ && npm run build-prod` | ✅ compiled (same 2 pre-existing size warnings) |
| 14 | Emitted titles | grep emitted HTML | ✅ `index.html` → `Geoconflict`; `yandex-games_iframe.html` → `Геоконфликт`; parent test template unchanged |
| 15 | Emitted manifest | grep `static/manifest.json` | ✅ name/short_name = `Geoconflict`; favicon wiring intact in both HTMLs |
| 16 | Emitted-HTML OpenFront sweep (case-insensitive) | `grep -io openfront…` over both emitted HTMLs | ✅ production HTML: **zero** matches; standalone `index.html`: only the live footer's attribution/community block (©2025 OpenFront™ + GitHub/Wiki/Reddit links) — deliberately untouched, flagged |
| 17 | Attribution line untouched | `git diff` on both lang files grep license | ✅ `main.license_text` absent from diff (lang diffs are 0017's) |
| 18 | Bundle jwt grep after rebuild | `grep static/js/*.js` | ✅ still zero |
| 19 | Tests + lint after increment 2 | `npm test` / `npm run lint` | ✅ 89 suites / 709 tests pass; lint clean |

**Prod-redeploy pendings (owner-side; task not fully done until run):** — ✅ **RUN 2026-08-30 by the
lead, in the browser against live production. All discharged; see the brief's Verification steps 7
and 8 for the method and numbers.**
- ~~`geoconflict.ru/sounds/music/{openfront,war,win}.mp3` → 404/absent.~~ ✅ **PASSED — but the
  "404/absent" expectation was WRONG for this server and is superseded.** Unknown paths hit the
  `app.get("*")` SPA catch-all, so nothing 404s. Correct test = byte-identity against a
  known-nonexistent control. **Seven** purged paths (the three `.mp3`s plus `OpenFrontLogo.png`,
  `OpenFrontLogo.svg`, `OpenFrontLogoDark.svg`, `Favicon.svg`) all returned `200` / `10801` bytes /
  `text/html`, identical to the control → none serves real content.
- ~~New favicon serves live in the tab; `geoconflict.ru/images/OpenFrontLogo.png` no longer serves
  real content.~~ ✅ **PASSED.** `/images/GeoConflictFavicon.7aaf278f4fba2c4b180d.svg` → `200`, 445
  bytes, `image/svg+xml`; **`yandex-games_iframe.html` links the identical hashed file**, so both
  entry points carry the same original icon.
- The `Dockerfile` COPY removal itself — no local docker build possible (Docker Desktop needs an
  interactive prompt); verified by inspection, proven at deploy.

  ✅ **VERIFIED AT SOURCE 2026-08-30 by the lead — this is a verified fact, not an inference.**

  📌 *Correction trail, kept deliberately:* the producer first recorded this as "discharged by
  **inference** from the step-7 result — nobody inspected the built image." That honest downgrade is
  what prompted the source check, which then settled it properly. The inference framing is
  **superseded**; the evidence below stands on its own.

  **The evidence:**
  - `Dockerfile` has **no `COPY proprietary` line at all** — there is nothing left to remove.
  - Lines **38–43** are an explicit **allowlist** copy, and the block's own comment states it exists
    so local files cannot ride along into the image.
  - `proprietary/` is **untracked** — local only, never committed.
  - **No `sounds/music` files are tracked.**
  - The only `OpenFrontLogo.svg` hits are the two `resources/claude-design-files/**` design-handoff
    copies — **precisely the residue the owner's 2026-08-23 ruling declared EXPECTED NON-EMPTY**
    (see this brief's Notes). Not a finding, and not to be re-flagged as one.

## Decision log (ADR-019/ADR-032 audit obligation)

- **Fixes applied without asking:** none beyond the approved plan — every edit above is an
  enumerated plan step. Owner's jwt-host ruling applied verbatim.
- **Obvious-winner calls:** none needed.
- **NEEDS-DECISION (returned to driver):**
  1. Two additional git-tracked `OpenFrontLogo.svg` copies inside
     `resources/claude-design-files/geoconflict-start-screen-citizenship{,-logged-in}/project/assets/icons/`
     — outside the plan's enumerated deletion set, so left in place.
     **RESOLVED by owner ruling 2026-08-23: accepted as repo-only residue, not deleted;**
     verification #2's non-empty grep is expected (recorded in brief Notes).
- **Observations:** brand *strings* (titles, manifest name) — **RESOLVED: folded into 0066 by
  owner ruling, done in Increment 2** (above). Remaining flag for the driver: standalone
  `index.html`'s live footer still shows `©2025 OpenFront™` + upstream GitHub/Wiki/Reddit
  links — attribution-adjacent, deliberately not retargeted; owner call if it should change.

## Review Round 1 processed (2026-08-24, Process-review worker under declared approval)

All three findings verified against the code before acting (R3's icon visually confirmed as
upstream's world-map mark). Owner dispositions relayed via the lead session; fixes applied under
that approval:
- **R1** (verified CORRECT, mechanical/localized, owner-approved): removed dangling
  `"proprietary/**/*"` from `tsconfig.json` include. Qualified: verified-correct + in-disposition.
- **R2** (verified CORRECT, doc-only, owner-approved): `LICENSE-ASSETS` + `LICENSING.md` now
  record the proprietary tree's removal (2026-08-23, task 0066) factually — history preserved,
  no new legal posture authored. Qualified: verified-correct + in-disposition.
- **R3** (verified CORRECT, frontier): no code change per owner ruling — folded into the brief's
  favicon design follow-up note (extended to cover `icon512_*.png`); residual recorded in
  review.md.
- Obvious-winner calls: none. Fixes beyond the dispositions: none.
- Re-verification: `npx tsc --noEmit` clean · `npm test` 89/709 green · `npm run lint` clean ·
  fresh `npm run build-prod` compiled (same 2 pre-existing size warnings).
- review.md header left **in-review** — reviewer/driver confirms the R1/R2 fixes and closes.

## Constraints honored
- No commit, no push, no task-file moves.
- 0017's uncommitted changes untouched — final diff surface: 7 modified files
  (`webpack.config.js`, `Dockerfile`, `SoundManager.ts`, both HTML templates, `ProdConfig.ts`,
  `PreprodConfig.ts`), 12 staged deletions (7 proprietary + 5 brand files), 1 new file
  (`GeoConflictFavicon.svg`), plus this folder's `plan.md`/`worklog.md`. Zero overlap with
  0017's file set.
- **Gate (loud): 0065 step 6 (paid flip-ON) must not execute until Part A is deployed.**
