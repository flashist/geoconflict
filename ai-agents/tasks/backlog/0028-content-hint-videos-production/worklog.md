# 0028 — worklog

## 2026-09-02 — Version B, first batch (agent capture)

Produced 4 clean Version B clips per the 2026-09-02 owner rulings (D1 MP4, D2 HUD stays,
D3 topics #2/#3/#4/#5). **Written to `/tmp/gc0028/batch1/`, deliberately not in the repo** —
the final asset home is still an owner decision and `0029` has not started.

| File | Topic | Duration | Size |
|---|---|---|---|
| `hint-conquering-territory.mp4` | #2 | 16.0 s | 479 KB |
| `hint-empty-territory.mp4` | #3 | 16.0 s | 483 KB |
| `hint-bots-nations-players.mp4` | #4 | 14.8 s | 1.30 MB |
| `hint-terrain-types.mp4` | #5 | 16.0 s | 1.32 MB |

All 1000×700, h264, no captions / voice-over / watermarks. **HUD language is Russian**
(`localStorage.lang = "ru"`), which is a production choice, not a ruling — see the report.

### Method

Headless Chromium via Playwright, driving a real singleplayer game locally; Playwright's
own video recording, then `ffmpeg` trim + encode. No production contact. No tracked file
was modified.

Harness (⚠️ **lives in `/tmp/gc0028/`, which does not survive a reboot** — move it somewhere
durable before the next batch):

- `lib.mjs` — boot, curtain, spawn pick, camera helpers (`centerOn`, `panTo`, `startFollow`),
  cursor overlay, encode helpers.
- `clip2.mjs` / `clip3.mjs` / `clip4.mjs` / `clip5.mjs` — one per topic.
- `enc.sh` — blackdetect-based trim + h264 encode. `analyze2.sh` — capture-timing analysis.

Three things that cost real time and should not be rediscovered:

1. **Camera offsets are not `world − gameWidth/2`.** `TransformHandler`'s screen mapping is
   `screenX = (worldX − offsetX) * scale + game.width()/2`. Always move the camera via
   `th.screenCenter()` deltas (what `zoomToPlayer` itself does), never by assigning offsets.
2. **A follow camera is wrong for a growth clip.** Holding the territory at a constant
   on-screen size cancels out the growth the clip exists to show. Fixed camera, framed for
   the *end* state.
3. **Player colour is seeded by `gameID`, not `clientID`** (`GameRunner.ts:47-58` →
   `PseudoRandom(simpleHash(gameID)).nextID()` → `humanColorAllocator`). Pale colours
   (`#ffdfba`, `#f0f0c8`) are invisible against Iceland's tan/white terrain. Seeds used:
   `HintSeed2` → `#93c5fd`, `Hint4` → `#ef4444`, `Hint8` → `#2dd4bf`, `ClipA` → `#a855f7`.

Also: `playerViews()` is empty until the human has spawned, so bots/nations can only be
located *after* the spawn click.

### Verification

- Capture cadence, measured on the source webm inside each clip window: exactly 25.00 fps,
  40.0 ms between frames, stddev 0.0000, zero intervals over 60 ms. No stalls, no gaps.
- Near-duplicate frames (`mpdecimate`, default thresholds): 6–20 % depending on clip —
  consistent with sampling a 66.7 ms tick at 40 ms. At the strictest threshold, 0 repeats.
- **Motion smoothness itself is NOT certified** — nobody watched the files play. Owner call.
- Determinism: same seed twice reproduces the map, the spawn tile and the first ~4 seconds
  exactly, then drifts by 1 tick because the driver is wall-clock paced. Output bytes differ.

---

## 2026-09-02 (later) — homing the assets, declaring Playwright, harness move BLOCKED

Three owner-ruled follow-ups. Two landed; the third is blocked on a decision — see below.

### Job 1 — clips homed to `resources/hints/` ✅

Copied all four Version B clips from `/tmp/gc0028/batch1/` into `resources/hints/`.

| File | sha256 (identical at source and destination) | Bytes |
|---|---|---|
| `hint-conquering-territory.mp4` | `9d39d583…0fad6f5d` | 479 153 |
| `hint-empty-territory.mp4` | `f41138ba…fed74710` | 482 554 |
| `hint-bots-nations-players.mp4` | `12a813b5…c31585fc` | 1 298 779 |
| `hint-terrain-types.mp4` | `efad0767…073d1a23` | 1 323 320 |

`cmp` reports all four byte-identical. Ruling basis re-verified in code, not assumed:
`webpack.config.js:347-360` (`CopyPlugin`, `resources/` → `static/`, only
`**/claude-design-files/**` ignored) and `Master.ts:83` (`express.static`, `maxAge: "1y"`).
Subdirectory copying confirmed empirically — `images/ sounds/ sprites/ fonts/ icons/ lang/
maps/ cosmetics/` all mirror into `static/`, and `claude-design-files/` correctly does not.

Serve path verified live against a local `express.static` replicating `Master.ts:83`:
`200` · `content-type: video/mp4` · `cache-control: public, max-age=31536000` ·
`accept-ranges: bytes`, and the sha256 of the **served bytes** matches the source exactly.

⚠️ **For `0029` — reported, deliberately NOT fixed.** `.mp4` is absent from the nginx
image-cache block (`nginx.conf:75` covers `jpg|jpeg|png|gif|ico|svg|webp|woff|woff2|ttf|eot`),
so MP4s fall through to `location /` and proxy to node **uncached by nginx**. Browsers still get
`max-age=1y` from Express, so this is a origin-load question, not a correctness one. Adding `mp4`
to that list is one line, but `nginx.conf` is baked into the image at `Dockerfile:86` and ships
only via `build-deploy.sh` — deploy-coupled, so it belongs to a deploy task.

### Job 2 — Playwright declared as a devDependency ✅

`package.json` — one line added, `"playwright": "1.61.1"`, alphabetically between `pixi.js` and
`postcss`. Task `0064`'s `check:config-parity` script edit was not disturbed (verified by diff).

**Exact pin, not a range — deliberate.** Playwright pins a browser revision per version:
1.61.1 requires `chromium` **1228** and `ffmpeg` **1011**, both already in
`~/Library/Caches/ms-playwright/`. `ffmpeg` matters specifically because the harness records via
`recordVideo`, which Playwright drives with its own bundled ffmpeg. A `^1.61.1` range would let
npm resolve 1.62+, whose `browsers.json` names a different chromium revision and would force a
fresh browser download — reintroducing exactly the fragility this ruling exists to remove.

**Lockfile:** measured in an isolated copy first, then applied with the narrow
`npm install --package-lock-only --ignore-scripts`. Result is purely additive — three entries
(`playwright`, `playwright-core`, `playwright/node_modules/fsevents`), **zero** version changes
to any existing package, zero removals. No broad install was run.

**An install IS still needed before the harness can use the bare `playwright` specifier** —
`node_modules/playwright` does not exist yet, so the harness still imports from the npx cache.
Nothing in the repo imports Playwright, so `npm test` and `npm run lint` are unaffected meanwhile.
Left for the owner rather than run here, since `npm install` also rebuilds native modules
(`canvas`) and runs the husky `prepare` hook.

### Job 3 — harness move: **BLOCKED, left undone** ⛔

**Home chosen (this part is settled):** `scripts/`, not `tools/`. `tools/` does not exist;
`scripts/` already holds every dev tool in the repo (`bump-version.js`, `upload-sourcemaps.js`,
`telemetry-tunnel.sh`, `check-docker-secret-boundary.sh`, and `0064`'s new
`check-config-parity.mjs`). Creating `tools/` would be the parallel solution the repo rule warns
against. Intended path `scripts/hint-capture/` — no collision with `0064`'s files.

**Why it did not land:** `tsconfig.json`'s `include` does not cover `scripts/`, so any new `.mjs`
there fails typed linting with `was not found by the project service`, and **`npm run lint` goes
red repo-wide**. Verified empirically with a throwaway probe file (since removed): bare `eslint`
exited 1 with that as the only error in the repo.

The established fix is a `projectService: false` override block in `eslint.config.js` — the file
already carries two (`scripts/bump-version.js`; `0064`'s `scripts/check-config-parity.mjs`). But
`eslint.config.js` is owned by in-flight task `0064` with a reviewer running, and this session was
told to touch none of it. The one alternative that avoids `0064`'s files —
`tsconfig.json` `include` + `allowJs: true` — was tested and does work, but `allowJs: true`
pulls every `.js` under `src/**`, `resources/**` and `tests/**` into the TypeScript program.
That is a broad, behaviour-changing edit, disproportionate to housing a dev tool.

Escalated as `NEEDS-DECISION`. **The harness is still only in `/tmp/gc0028/` and still does not
survive a reboot.** The knowledge is preserved below so at least that is not lost with it.

### Harness knowledge — recorded here because the code could not be

Six traps now, not three. The first three are what it takes to get a capture running at all;
the last three (from the earlier entry above) are what it takes to get a *usable* clip.

1. **A first-run tutorial overlay dims the map and swallows clicks.** Seed `localStorage`
   (`tutorialCompleted`, `gamesPlayed`) via `addInitScript` **before** page load, not after.
2. **Hand-rolled camera math puts targets off-canvas.** Use the game's own `transformHandler`
   (`screenToWorldCoordinates` / `worldToScreenCoordinates` / `zoomToPlayer`).
3. **Synthetic `dispatchEvent` does not drive the game.** Use Playwright's real mouse (CDP input).
4. Camera offsets are **not** `world − gameWidth/2` — move via `th.screenCenter()` deltas.
5. A follow camera is wrong for a growth clip — it cancels out the growth being demonstrated.
6. Player colour is seeded by **`gameID`**, not `clientID`.

**Entry point:** a `document`-level `join-lobby` `CustomEvent` (`src/client/Main.ts:279`, handler
`:666`) carrying a `GameStartInfo` payload. This bypasses `SinglePlayerModal.startGame()` and its
interstitial ad. Singleplayer needs no websocket (`Transport.ts:198-200` → `LocalServer.ts`).

Files that make up the harness, for whoever unblocks the move: `lib.mjs` (boot, curtain, spawn
pick, `centerOn` / `panTo` / `startFollow`, cursor overlay, encode), `clip2.mjs`–`clip5.mjs` (one
per topic), `enc.sh` (blackdetect trim + h264), `analyze2.sh` (capture-timing analysis),
`color.ts` (resolves player colour from a `gameID` — supports trap 6). `clip.mjs` is the original
spike, superseded by `lib.mjs`.

### Decision log — calls made without asking

| Call | Why it qualified |
|---|---|
| `scripts/` over `tools/` as the harness home | Obvious winner inside the ruling's own escape hatch ("unless you find a clearly better-established home"). `tools/` does not exist; `scripts/` holds every existing dev tool. |
| Exact pin `1.61.1` over `^1.61.1` | Verified, mechanical, inside the plan: only the exact version maps to the installed chromium-1228 / ffmpeg-1011. A range defeats the ruling's purpose. |
| Applied the lockfile sync rather than only reporting it | Measured zero churn in an isolated copy first; a declared dep with a desynced lockfile breaks `npm ci`. Narrow `--package-lock-only`, not a broad install. |
| Kept the `/tmp/gc0028/batch1/` originals instead of deleting after the copy | The repo copy is verified byte-identical but still **untracked and uncommitted**; a stray `git clean -fd` in this shared tree would destroy it. Zero cost to keep a fallback until commit. |
| Recorded the harness traps in this worklog although Job 3 is blocked | The reboot risk is to the knowledge as much as the code; the code is blocked, the knowledge need not be. |

⚠️ **Process note, recorded because it touched the shared tree.** While verifying the lockfile I
ran a careless `git stash push --keep-index package-lock.json`, which briefly stashed the lockfile
change (and an unstaged `0021` brief edit caught by the same pathspec). Caught immediately and
restored with `git stash pop`; the stash I created was dropped. Working tree re-verified against
its session-start state — `0064`'s and `0201`'s files were never in the stash and were untouched.
The pre-existing `claude-nations-vs-humans` GitHub Desktop stash was not disturbed.

⚠️ **Unexplained: the lockfile change reverted itself once, mid-session.** After the stash was
popped the three playwright entries were verified present on disk; a later status check found
`package-lock.json` clean against `HEAD` again, with the entries gone. I re-applied it and then
tried to reproduce the loss — `npm run lint`, the `pretest` hook, and a full `npm test` were each
run against the restored lockfile and **none** of them strips the entries. So I could not
reproduce it and **cannot attribute it**. The most likely cause is concurrent activity in this
shared tree (`0064`'s reviewer and `0201` are both live in it), but that is a guess, not a
finding. Final state is verified correct — `package.json` and `package-lock.json` both carry
`playwright 1.61.1`. **Re-check both immediately before committing**, in case whatever did it
recurs.

### Verification

- `npm run lint` — **exit 0, clean**, no output.
- `npm test` — **exit 0**, 108 suites / 1121 tests passed, 2.2 s. First run, green; no supertest
  flake seen, so no re-run was needed.
- Both were run with `0064`'s and `0201`'s uncommitted work present in the tree, so the results
  cover the combined tree, not this task's changes in isolation.
- Nothing committed, nothing pushed, no production contact.
