# Plan — Task 0066: Licensing Remediation (Proprietary Purge)

**Status:** awaiting owner approval (orchestrated plan gate, ADR-031). No source written yet.
**Brief:** `ai-agents/tasks/done/0066-licensing-remediation-proprietary-purge/brief.md`
**Ground truth:** `ai-agents/knowledge-base/reports/s4-licensing-asset-audit-findings.md` (0025 audit)
**Planner:** fkit-coder (spawned, plan-only unit), 2026-08-23

## Claim verification (brief vs working tree, 2026-08-23)

All file/line claims re-verified against the current tree; no drift found.

| Claim | Verified |
|---|---|
| CopyPlugin `proprietary` pattern `webpack.config.js:360-364` | ✅ block at 360–364 (`from` at :361) |
| `Dockerfile:44` `COPY proprietary ./proprietary` | ✅ exactly line 44 |
| `SoundManager.ts` dead music code lines 3-6, 22-41 | ✅ imports 3–6 (incl. marker comment), Howl blocks 22–41 |
| `proprietary/` = 6 mp3 + LICENSE, all git-tracked | ✅ `git ls-files proprietary` → 7 files |
| Favicon refs `index.html:9`, `yandex-games_iframe.html:12` | ✅ both, identical lines; third template (`yandex-games_iframe-parent.html`) has **no** icon ref |
| Brand files present | ✅ `resources/images/`: `Favicon.svg`, `Favicon.png`, `OpenFrontLogo.png`, `OpenFrontLogo.svg`, `OpenFrontLogoDark.svg`; no other source refs (grep) |
| `ProdConfig.ts:27` → `"openfront.io"`, `PreprodConfig.ts:21` → `"openfront.dev"` | ✅ exact lines |
| `DefaultConfig.jwtIssuer()` derives `https://api.${audience}` | ✅ (`DefaultConfig.ts:~178-186`); `jwt.ts:23-24` short-circuits persistentIds |
| `resources/LICENSE` = 283-byte CC BY-SA notice | ✅ |

**0017 overlap check:** none of this task's files (`webpack.config.js`, `Dockerfile`,
`SoundManager.ts`, both HTML templates, `ProdConfig.ts`, `PreprodConfig.ts`,
`resources/images/*`, `proprietary/`) appear in the current uncommitted change set
(15 modified files, all profile-server/client-profile scope). No conflict; 0017's
uncommitted changes are left untouched.

## Part A — purge proprietary music (V1, gates 0065)

1. `webpack.config.js` — delete the whole CopyPlugin pattern object at lines 360–364
   (`{ from: proprietary, to: static, noErrorOnMissing: true }`).
2. `Dockerfile:44` — delete `COPY proprietary ./proprietary`.
3. `git rm -r proprietary/` — staged working-tree deletion (7 files, 18 MB). **No commit** —
   owner's call, per brief.
4. `src/client/sound/SoundManager.ts` — delete the commented-out music imports (lines 4–6)
   and the three commented Howl blocks in the constructor (lines 23–40), leaving
   `this.backgroundMusic = [];`. Replace the two `// Flashist Adaptation: disabling music`
   markers with a single one-line marker noting the music was removed for licensing (task 0066),
   preserving the fork's `// Flashist Adaptation` divergence convention.
   - Safety verified: all consumers (`ClientGameRunner.ts:435,703`, `SettingsModal.ts:51-54`)
     hit length-guarded no-ops on an empty array; `playNext()` (the only modulo-by-zero risk)
     is reachable only from a Howl `onend`, and no Howl remains. Ka-ching effect path untouched.
5. Out of scope (owner-accepted): git history rewrite.

## Part B — original placeholder favicon (A1)

1. **Create `resources/images/GeoConflictFavicon.svg`** — a new, hand-authored original SVG
   (concept below). Not derived from any OpenFront asset (no upstream file opened or traced);
   no country flags / national symbols (Yandex rule).

   **Placeholder concept:** 64×64 viewBox; dark slate rounded square (`#1e293b`); on it, a
   small irregular green polygon (`#4ade80`) — an abstract "claimed territory" shape with
   hand-picked vertex coordinates — plus a single gold dot (`#facc15`) as a "capital" marker.
   Reads as GeoConflict's territory-expansion motif at tab size; trivially original.
   Deliberately temporary — proper brand design is a recorded later follow-up (brief Notes),
   no design task created now.

2. Update **both** templates identically —
   `src/client/index.html:9` and `src/client/yandex-games_iframe.html:12`:
   `<link rel="icon" type="image/svg+xml" href="../../resources/images/GeoConflictFavicon.svg" />`
   (also corrects the wrong `image/x-icon` MIME type on the same line; no other HTML touched).
   The third template needs no change (no icon ref).
3. `git rm` the five upstream brand files: `resources/images/Favicon.svg`, `Favicon.png`,
   `OpenFrontLogo.png`, `OpenFrontLogo.svg`, `OpenFrontLogoDark.svg`.
   - Build-time safety net: `html-loader` resolves the favicon `href` at build time, so a
     missed reference to a deleted file fails the build loudly rather than shipping broken.

## Part C — retarget jwt-audience fallbacks (H1)

1. `ProdConfig.ts:27`: `"openfront.io"` → `"geoconflict.ru"`.
2. `PreprodConfig.ts:21`: `"openfront.dev"` → `"geoconflict.ru"` (see NEEDS-DECISION).
3. String retarget only — no restructuring of the near-dead JWT path.
   Effect: worst-case fallback (`runtimeConfig` AND `JWT_AUDIENCE` both missing) now derives
   `jwtIssuer()` = `https://api.geoconflict.ru` — our own live host, not OpenFront infra.

## Sequencing

Part A → Part B → Part C (independent, but A is the 0065 gate — done first), then verification
as one pass over the combined change.

## Verification

**Local / pre-deploy (I run these):**
1. `rm -rf static/` then fresh `npm run build-prod` (local stale-leftover hazard noted in the
   audit; webpack `clean` alone isn't trusted). Then assert over `static/`:
   - no `sounds/music/` and no other `proprietary` content;
   - no `OpenFrontLogo.*`, no upstream `Favicon.*`; new favicon asset present and referenced
     by both emitted HTML files identically;
   - `static/LICENSE` is the 283-byte CC BY-SA notice only (H2 collision moot);
   - `grep -R "openfront\.io\|openfront\.dev" static/js/` → no jwt-fallback hits ("Based on
     OpenFront" attribution text is NOT touched and stays).
2. `git ls-files proprietary` → empty; `git ls-files | grep -i openfrontlogo` → empty.
3. `npm test` and `npm run lint` green (no existing tests reference SoundManager or the
   favicon — verified by grep — so green suite + build is the expected proof; no new tests:
   nothing in `src/core/` changes behavior, Part C is a config-string change exercised by the
   existing config path).
4. Local run: `npm run start:client`, check the tab icon renders on `index.html` AND on the
   `yandex-games_iframe.html` template (the production one), per brief item 3.

**Only provable by prod redeploy (owner-triggered; task not fully done before this):**
5. `https://geoconflict.ru/sounds/music/openfront.mp3` (+ `war.mp3`, `win.mp3`) → 404/absent.
6. New favicon serves; `geoconflict.ru/images/OpenFrontLogo.png` no longer serves real content.
7. The `Dockerfile:44` removal itself — a local docker build can't be run headlessly here
   (Docker Desktop needs an interactive prompt), so the Dockerfile edit is verified by
   inspection locally and proven only by the deploy build.

## Edge cases / failure modes considered

- **Favicon href resolution:** `html-loader` turns the template `href` into an emitted-asset
  reference; a stale path breaks the build (loud, good). Verified both templates use the same
  relative-path mechanism, so the new SVG rides the existing pipeline — no webpack change needed.
- **Empty `backgroundMusic` array:** all public methods are guarded; verified no NaN/undefined
  path is reachable (details in Part A.4).
- **Bundle grep false positives:** comments (`PreprodConfig.ts:29`) are stripped in prod;
  attribution strings say "OpenFront" not `openfront.io` — grep targets the dotted domains only.
- **Concurrent 0017 build in the same tree:** zero file overlap (checked above); `git rm`
  operations touch only `proprietary/` and `resources/images/` brand files.
- **`git rm` stages a deletion:** that is a staged working-tree change like any other edit —
  explicitly sanctioned by the brief; still no commit without the owner's ask.

## Gate (loud, per brief)

**`0065` step 6 (paid-citizenship flip-ON) must not execute until Part A is deployed to prod.**

## NEEDS-DECISION (for the plan gate)

1. **Preprod fallback host (Part C.2).** No preprod/staging geoconflict domain exists anywhere
   in the code or env examples (only `geoconflict.ru` + `api.geoconflict.ru`). Options:
   (a) **`"geoconflict.ru"` (recommended)** — self-owned, derives our own live API host,
   simplest; (b) throw instead of falling back (audit offered it; more invasive than the
   "string retarget, not a refactor" scope); (c) some other host the owner names.

No other open questions — everything else in the brief is verified and unambiguous.
