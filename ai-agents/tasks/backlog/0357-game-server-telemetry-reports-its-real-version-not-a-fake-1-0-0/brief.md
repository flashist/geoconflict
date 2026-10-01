# Game server telemetry reports its real version, not a fake "1.0.0"

## ID
0357

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**Filed 2026-09-30 by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER RULING given live on
2026-09-30 in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead`.** ⛔ Not producer precedent. The
ruling answered question Q7 of [`0355`](../../done/0355-tag-profile-server-deploys-with-a-version-like-the-game/brief.md)
(*"Fix the game server's own fake `"1.0.0"` telemetry version too? — recommended: yes, as a separate small task"*).
The owner's answer, verbatim: *"Yes, file it"*. Filed on the **Backlog board** as the caller asked — no sprint named.

**The problem in plain words.** Every log, trace and metric the game server sends to our telemetry (Uptrace) is
stamped with a version number. That number is fake: it is always `"1.0.0"`, on every deploy. So in Uptrace you cannot
tell "this error started with release `0.0.155`" — every release looks the same. The game already knows its real
version; the telemetry just doesn't use it.

### What the code does today (re-verified 2026-09-30)

- **The fake value:** `src/server/OtelResource.ts:13` — `getOtelResource()` sets `service.version` to the literal
  `"1.0.0"`. That one function feeds all three server signals: logs (`src/server/Logger.ts:16`), metrics
  (`src/server/WorkerMetrics.ts:30`) and traces (`src/server/OtelTracing.ts:24`). It runs in the master and in every
  worker process.
- **The real version is already there:**
  - `package.json` `version` (e.g. `0.0.155`; dev/staging carry `-dev.N` / `-staging.N`) — bumped by every game
    deploy **before** the image is built (see `0355` § *How the game server is tagged today*), so the image's
    `package.json` is the deployed version. The runtime image copies `package.json` in (`Dockerfile` final stage).
  - The server already reads it and serves it at `GET /api/version` (`src/server/Master.ts:71-74` reads it,
    `:201-209` serves it).
  - The commit: `GIT_COMMIT` is a build arg set as an `ENV` in **both** the build stage (`Dockerfile:21-22`) and the
    final runtime stage, and is already read by server code via `config.gitCommit()`
    (`src/core/configuration/DefaultConfig.ts:210-212`, used by `src/server/Archive.ts:91`). Locally (`npm run dev`)
    it is unset → empty string.
- **The browser is different:** the client's telemetry reports `service.version` = the **commit**, not the version
  number (`src/client/OtelBrowserInit.ts:41`). See open question Q2.

### Dependencies, conflicts and hazards

- **Config-parity gate (`npm run check:config-parity`):** the recommended fix needs **no new environment variable** —
  `package.json` is a file, and `GIT_COMMIT` is already read by server code under `src/` and baked into the image.
  ⚠️ If the plan does add a new env var, the gate (report-only locally, `--enforce` in the deploy scripts, task
  `0298`) will stop the deploy until it is forwarded. Don't add one without saying why.
- **Uptrace queries:** memory records no Uptrace dashboards exist, so nothing saved should break. But people do filter
  by `service.version` by hand — e.g. the wiki's weekend-deploy page asks a re-measure to filter to
  `service.version` `0.0.152`/`0.0.154` and to "confirm the exact values in Uptrace first". After this ships, the
  **server** half of that filter starts to mean something; the **browser** half still carries a commit (Q2).
- **Related, not dependencies:** [`0355`](../../done/0355-tag-profile-server-deploys-with-a-version-like-the-game/brief.md)
  replaces the profile server's own fake `"1.0.0"` (`src/profile-server/Telemetry.ts:480`) with its ruled tag
  (`<base>-profile.<N>`); [`0356`](../../done/0356-tag-telemetry-server-deploys-with-a-version-like-the-game/brief.md) tags
  the telemetry deploy. Neither touches `src/server/OtelResource.ts`, and this task touches no deploy script. No
  ordering between them — but keeping the attribute shapes consistent with `0355`'s is worth a look at plan time.
- **Weekend deploy slot** (owner ruling 2026-09-29) — ships with a normal game deploy.
- **Build / verify split** (owner ruling 2026-09-29): the proof needs a real deploy and a look in Uptrace, so when
  this build task closes, a **verify task is filed at the top of the next sprint**. It must not block that sprint's
  deploy.

## What to build

Guidance, not a recipe — the coder's plan decides how.

- Make `getOtelResource()` report the game's **real version** as `service.version` instead of `"1.0.0"` — the same
  `package.json` version `/api/version` already serves (recommended; see Q1).
- Optionally add the **commit** as a separate resource attribute (only when `GIT_COMMIT` is non-empty — never stamp an
  empty or `unknown` commit as if it were real). Naming it is the plan's call; follow an OTEL semantic convention if
  one fits.
- Avoid a second, drifting copy of the "read `package.json`" logic: `Master.ts:71-74` already does it. Sharing one
  small helper is the obvious shape — the plan decides.
- Missing/unreadable version must not crash the server or kill telemetry: fall back to a clearly-fake value (the
  existing `"0.0.0"` fallback in `Master.ts` is the precedent), never throw at import time.
- Add a jest test: the resource carries the `package.json` version (not `"1.0.0"`), and the commit attribute appears
  only when `GIT_COMMIT` is set.

### Out of scope
- The browser's `service.version` (it already carries the commit) — unless the owner rules otherwise on Q2; if they
  do, that is its own small task, not a scope creep here.
- `service.name` (`"openfront"`, a leftover from upstream) — noticed, not asked for. Renaming it changes how every
  server signal is grouped in Uptrace; raise it separately if wanted.
- The profile and telemetry servers (→ `0355`, `0356`). Any deploy-script or tagging change.

## Verification steps

Local (this task):
1. `npm test` green, including the new test: `getOtelResource()`'s `service.version` equals `package.json`'s
   `version`, and is not `"1.0.0"`.
2. The new test also shows: with `GIT_COMMIT` set, the commit attribute carries it; with it unset or empty, the
   attribute is absent (not `""`, not `"unknown"`).
3. `grep -n '"1.0.0"' src/server/` returns nothing.
4. `npm run check:config-parity` reports no new finding compared with before the change (run it before and after;
   quote both).
5. `npm run lint` clean on the touched files.

After deploy (the verify task filed at close — owner-run, weekend slot):
6. In Uptrace, a server log/span/metric from the new deploy carries `service.version` = the deployed version (the one
   `/api/version` returns), not `1.0.0`; and the commit attribute (if added) matches the deployed commit.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing
- Small: one resource function, one helper, one test.
- **Related:** [`0355`](../../done/0355-tag-profile-server-deploys-with-a-version-like-the-game/brief.md) (profile's own
  `"1.0.0"`, Q7 there is this task's origin), [`0356`](../../done/0356-tag-telemetry-server-deploys-with-a-version-like-the-game/brief.md).

### Open questions for the plan step (plain words, recommended option first)

- **Q1 — What goes in `service.version`: the version number or the commit?** Recommended: **the version number**
  (e.g. `0.0.155`), with the commit in a separate attribute. Why: it matches the git tags, `/api/version`, and what
  `0355` does for the profile server, and a human can read it and put releases in order. Alternative: the commit,
  like the browser — precise, but unreadable and unordered.
- **Q2 — Should the browser's telemetry version line up with the server's?** Today the browser reports the commit.
  Recommended: **leave the browser as it is for now; decide separately.** Why: the browser's commit value is
  deliberately kept as the key any future source-map path would use (`src/client/OtelBrowserInit.ts:43-47`), so
  changing it is not free, and the browser would first need to be told the version number at build time. Cheaper
  middle option if wanted: add the version number to the browser as an **extra** attribute, keeping `service.version`
  = commit. Either browser change would be its own small task.
