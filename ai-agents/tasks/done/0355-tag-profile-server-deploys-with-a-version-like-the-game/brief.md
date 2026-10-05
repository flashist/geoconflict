# Tag profile-server deploys with a version, the way the game server is tagged

## ID
0355

## Sprint
Sprint 7

## Priority
28 — append rank. ⚠️ **NOT the owner-ruled placement: by OWNER RULING (2026-09-30) this task is at the TOP of
Sprint 7**, whatever this number says. It could not be written at rank 1: the closed `➡️ Moved` rows at ranks 2–3 and
the closed `✅ Done` rows at 10–13, 20 and 22–24 sit below that point, and ADR-035 forbids renumbering closed rows
**even under an owner ruling**. So it was appended after the highest rank (27). See the Sprint 7 addendum dated
2026-09-30 for this task.

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder

## Context

**Filed 2026-09-30 by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER REQUEST given live in
the `fkit lead` session on 2026-09-30, relayed by `fkit-lead`.** ⛔ Not producer precedent. The owner's words,
verbatim:

> *"we need to do tagging of profile and telemetry servers, similarly to the way we currently tag our game server. We
> can use the same package.json version for that, but with different postfixes (e.g. 1.2.3-profile). My idea is not
> final, I am open for discussion and better solutions. Brief a task and put it to the top of the current sprint."*

**The problem in plain words.** When the game server is deployed, we get a version number (like `0.0.155`), a git tag
with that number, and the running game can tell you its number. When the profile server is deployed, none of that
happens in the same way — you can find out what is running only from a local log on the machine that ran the deploy.
The owner wants the profile and telemetry servers tagged the same way, so "what is running on that box?" has one easy
answer.

**Split (producer's call, flagged for the owner).** This brief covers the **profile** server only. The **telemetry**
server is [`0356`](../0356-tag-telemetry-server-deploys-with-a-version-like-the-game/brief.md). They are different
deploy units, are tested apart, and can ship apart — and they are genuinely different: the profile server is **our own
image**, while the telemetry box runs **only third-party images** configured by our setup script (see below). The
naming scheme is decided **once**, at this task's plan step, and `0356` reuses it.

### How the game server is tagged today (read from the code, 2026-09-30)

- **Version number:** `package.json` `"version": "0.0.155"` (`package.json:3`).
- **Bump on every game deploy:** `build-deploy.sh:69` runs `scripts/bump-version.js <env>`. Prod bumps the patch
  (`0.0.154` → `0.0.155`); dev/staging add a counter (`0.0.141-dev.1`, `-dev.2`, …) — `scripts/bump-version.js`
  accepts **only** `X.Y.Z` or `X.Y.Z-(dev|staging).N` and throws on anything else.
- **Commit + git tag + push:** `build-deploy.sh:73-77` commits `package.json`/`package-lock.json` as
  `DEPLOY <env>: bump version to <v>`, runs `git tag <v>`, and pushes the branch and the tag. Repo has 76 tags,
  e.g. `0.0.147`…`0.0.155` and `0.0.120-dev.2`…`0.0.141-dev.1`.
- ⚠️ **This happens BEFORE the image is built** (`build-deploy.sh:44-47` says so): a failed build still uses up a
  version number.
- **The Docker image is NOT tagged with the version.** Its tag is a timestamp, `YYYYMMDD-HHMMSS`
  (`build-deploy.sh:66`, used at `build.sh:72`).
- **Visible in the running game:** `GIT_COMMIT` is a build arg baked into the image and into `static/commit.txt`
  (`Dockerfile:21-22,45`); the server serves the `package.json` version at `GET /api/version`
  (`src/server/Master.ts:71-74`, `:201-209`). The browser's telemetry reports `service.version` = the commit
  (`src/client/OtelBrowserInit.ts:41`). ⚠️ The **game server's own** telemetry `service.version` is hardcoded
  `"1.0.0"` (`src/server/OtelResource.ts:13`) — out of scope here, see open question Q7.

### How the profile server identifies itself today

- **Image tag:** `profile-<short commit>`, with `-dirty` added when the working tree has uncommitted or untracked
  files (`build-deploy-profile.sh:163-180`). A dirty build is allowed on purpose — it only warns
  (`:166-177`).
- **Deploy is by `@sha256` digest, not by tag** (`build-deploy-profile.sh:550-554`; `setup-profile.sh` refuses
  anything not digest-pinned). The project policy says tags are operator labels and **not the trust anchor**
  (`docs/security/registry-image-policy.md:55`). ⛔ **Nothing in this task may weaken digest pinning.**
- **No `package.json` version, no git tag, no commit.** The profile deploy never writes to git.
- **A deploy record** (timestamp, tag, digest, commit, result) is appended to a log **on the operator's own machine**
  (`build-deploy-profile.sh:284`, `:340-350`, `:311-313`) — not on the box, not in git.
- **The running server cannot say what it is:** `/health` returns only `{"status":"ok"}` and `/ready` only
  `{"status":"ready"}` (`src/profile-server/Routes.ts:570-583`); telemetry `service.version` is hardcoded `"1.0.0"`
  (`src/profile-server/Telemetry.ts:480`); `Dockerfile.profile` takes no `GIT_COMMIT` build arg and sets no label.

### Dependencies, conflicts and hazards

- 🚨 **Do not add an extra profile redeploy before [`0297`](../../done/0297-paid-citizenship-owner-run-test-buy-sequence/brief.md)
  §1 reads `0309`'s HMAC log line.** `docker logs` is lost when the container is recreated, and `0297` says to read
  that line **before the next profile deploy**. This task's change must **ride the regular weekend profile deploy**
  (next slot 2026-10-03/04), not cause an extra one.
- ⚠️ **Deploy scripts are touched, so `npm test` can go red.** `tests/scripts/profile-deploy-hardening.test.sh` runs
  the **real** `build-deploy-profile.sh` against stub `git`/`docker`/`ssh`, and carries grep-level structural
  assertions over `build-deploy-profile.sh`, `setup-profile.sh`, `build-deploy-telemetry.sh`, `setup-telemetry.sh`
  and others (CLAUDE.md § *Shell harnesses*). Its `git` stub answers only `rev-parse` and `status` and returns
  success with **no output** for everything else (`:52-60`) — so a new `git tag`/`git push`/`git describe` will
  silently "succeed" there unless the stub and assertions are extended. That is the gate working, not a broken test.
- ⚠️ **Config-parity gate.** If the server starts reading a new environment variable (e.g. a version passed into the
  container), `build-deploy-profile.sh` runs `check:config-parity --enforce --block-on=profile` and **will stop the
  deploy** unless the variable is forwarded (task `0298`). Baking the value into the image avoids this.
- ⚠️ **Never write a suffixed version into `package.json`.** `scripts/bump-version.js` throws on anything other than
  `-dev.N`/`-staging.N`, so a `-profile` version there would break the next game deploy.
- **Weekend deploy slot rule** (owner ruling 2026-09-29): committed ≠ deployed; this ships in a weekend slot.
- **Build / verify split** (owner ruling 2026-09-29): the proof needs a real deploy and an owner check, so when this
  build task closes, a **verify task is filed at the top of the next sprint (Sprint 8)**. It must not block this
  sprint's deploy.
- **Wiki gap:** the wiki has no page on deploy versioning/tagging (only `project-operations.md:28` mentions
  `bump-version.js`). Worth an ingest after this closes.

## What to build

### Step 0 — the owner picks the scheme (at the plan step, before any code)

**The owner's idea is the starting proposal, and it is NOT final** — the owner asked for discussion and better
options. The plan step puts the open questions below to the owner; `fkit-coder` consults `fkit-architect` at plan time
on the trade-offs. `0356` reuses whatever is ruled here.

**Starting proposal (owner's idea, not final):** keep one shared number — the `package.json` version — and add a
per-server suffix: `0.0.155-profile`, `0.0.155-telemetry`.

**Alternatives the plan must lay out, with trade-offs:**

| Option | What it looks like | Good | Bad |
|---|---|---|---|
| A. Owner's idea | `0.0.155-profile` | One number to remember; matches the game's | Two profile deploys at the same game version collide (the tag already exists). The number says which **game** release was current, not whether profile code changed |
| B. Owner's idea + a counter | `0.0.155-profile.1`, `.2` | Same as A, and fixes the collision; same shape as the game's existing `0.0.141-dev.1` tags | Counter logic in the script. Like the dev tags, version-sorting tools place it *before* `0.0.155` (cosmetic) |
| C. Prefix, not suffix | `profile-0.0.155.1` | Matches today's image tag `profile-<commit>`; groups nicely in `git tag -l 'profile-*'` | Differs from the game's shape |
| D. Own number per server | profile `1.4.0`, telemetry `1.1.0` | Number changes only when that server changes | A second (and third) version to bump and keep; new file or field; more to maintain |
| E. Commit only | `profile-a1b2c3d` (today's image tag) | Nothing new to maintain; exact | Not human-friendly; no git tag; not "like the game" |

Also for the plan: git tag only, image tag only, or **both** (recommended: both — the git tag says which code, the
image tag says which image; the digest stays the trust anchor).

### Step 1 — build the ruled scheme into the profile deploy

Guidance, not a recipe — the plan decides how:
- `build-deploy-profile.sh` computes the ruled version name, tags the image with it (in addition to, or instead of,
  `profile-<commit>` — per ruling), creates the git tag on the source commit, and pushes it (the game pushes its tags,
  `build-deploy.sh:77`).
- Decide **when** the git tag is written (open question Q6): recommended **after the deploy succeeds**, so a tag
  always means "this actually ran" — unlike the game, which tags before building.
- Handle a **dirty working tree** per the ruling on Q4 — a git tag can only point at a commit, so a dirty build
  cannot be honestly tagged.
- Handle "**the tag already exists**" explicitly (fail loudly or take the next counter) — never overwrite a tag.
- Bake the version (and commit) **into the image** — build arg → label + value the server can read — so the
  running server can report it without a new deploy-time environment variable.
- Make the running version visible per the ruling on Q5 (e.g. in the `/health` body, the telemetry
  `service.version` instead of `"1.0.0"`, the image label).
- Add the version to the existing deploy record (`build-deploy-profile.sh:340-350`).
- Extend `tests/scripts/profile-deploy-hardening.test.sh`: stub the new `git` calls, assert the tag name, the "tag
  exists" path and the dirty-tree path. If the server code changes (`/health`, telemetry), add jest tests.
- Update the profile deploy runbook/docs where they describe the image tag.

### Out of scope
- The telemetry server (→ `0356`).
- The game server's own telemetry `service.version` `"1.0.0"` (→ open question Q7).
- Changing how the game server is tagged.
- Anything that replaces digest pinning with tag pinning.

## Verification steps

Local (this task):
1. `npm test` is green, including `tests/scripts/ShellHarnesses.test.ts` → the hardening harness prints its success
   marker with the new assertions counted in the pass total.
2. The harness proves: a clean-tree deploy computes the ruled tag name; a second deploy at the same version takes the
   next name or fails loudly (per ruling) — never overwrites; a dirty-tree deploy behaves per the Q4 ruling.
3. `grep` confirms `build-deploy-profile.sh` still passes `PROFILE_IMAGE` to the box as the `@sha256` digest.
4. `package.json` `version` is unchanged by a profile deploy run (unless the owner rules otherwise on Q3), and
   `node scripts/bump-version.js dev` still works afterwards on a scratch copy.
5. If `/health` or telemetry changed: a jest test shows `/health` returns the version and still returns 200 with no
   database; the telemetry resource carries the baked version, not `"1.0.0"`.
6. A local image build shows the version label (`docker inspect` on the built image), if Docker is available —
   otherwise say so; do not claim it.

After deploy (the verify task filed at close, top of Sprint 8 — owner-run, weekend slot):
7. After the slot's profile deploy: the git tag exists on the remote and points at the deployed commit; the running
   server reports the same version where Q5 says it should; the deploy record carries it.

## Notes

- **Depends on:** nothing (the scheme is ruled at this task's own plan step)
- **Blocks:** [`0356`](../0356-tag-telemetry-server-deploys-with-a-version-like-the-game/brief.md) — soft: `0356`
  reuses the naming scheme ruled here.
- **Ordering constraint:** the profile deploy carrying this change must come **after** `0297` §1 reads `0309`'s log
  line (or be that same weekend deploy, read before recreate). Say this at the slot.
- **Plan-time consult:** `fkit-architect`, on the scheme trade-offs and the harness impact. The owner explicitly
  invited better solutions — the architect may propose one not in the table.

### Open questions for the plan step (plain words, recommended option first)

- **Q1 — What does a tag look like?** Recommended: **B, `0.0.155-profile.1`** — the owner's idea plus a counter, so
  deploying the profile server twice without a game deploy in between never clashes, and it looks like the game's
  existing `-dev.1` tags. Others: A (no counter — clashes), C (prefix), D (own numbers), E (commit only).
- **Q2 — One shared number, or each server its own?** Recommended: **shared `package.json` number** (owner's idea).
  Simplest, nothing new to bump. Trade-off: the number tells you which game release was current, not whether profile
  code changed — the git tag's commit tells you that.
- **Q3 — Does a profile deploy bump the version, like a game deploy does?** Recommended: **no.** Only a game deploy
  bumps `package.json`. A profile deploy only adds a tag — no commit, no push of code. Bumping would move the game's
  number and create commits from a server deploy.
- **Q4 — What if files are uncommitted when you deploy?** A git tag can only point at a saved commit, so it would
  lie. Recommended: **still deploy (as today), skip the git tag, warn loudly, and write "untagged (uncommitted
  changes)" in the deploy record.** Alternative: refuse to deploy until everything is committed (stricter, changes
  today's deliberate behaviour).
- **Q5 — Where do you see the running version?** Recommended: **all three** — in the `/health` answer (one `curl`
  shows it; the game already shows its version publicly at `/api/version`), in telemetry (`service.version`, instead
  of the fake `"1.0.0"`), and as an image label. Trade-off: the version becomes public on `/health` — low risk, same
  as the game.
- **Q6 — Tag before or after the deploy?** Recommended: **after it succeeds**, so a tag means "this really ran". The
  game tags before building, so a failed build still uses up a number.
- **Q7 — Fix the game server's own fake `"1.0.0"` telemetry version too?** Recommended: **yes, but as a separate
  small task**, not in this one. Say the word and it gets briefed.
- **Q8 — Order against the other "top" rows?** Recommended: **run in parallel** with the owner-check groups (G1
  precedent); for the coder, take it next after `0308` (already in progress).

### Owner rulings — 2026-09-30 (append-only; nothing above is edited)

**Authority:** OWNER RULINGS given live 2026-09-30 in the `fkit lead` session via `AskUserQuestion`, relayed by
`fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037). ⛔ Not producer precedent. Recorded here
by that producer; this task's status and rank are unchanged.

- **Split kept.** The owner confirmed keeping this task and
  [`0356`](../0356-tag-telemetry-server-deploys-with-a-version-like-the-game/brief.md) as two tasks.
- **Plan approved 2026-09-30** (see `plan.md` in this folder, which carries the gate's full ruling text).
- **Q1 — name format ruled: `<base>-profile.<N>`**, e.g. `0.0.155-profile.3` — the owner's original suffix idea plus a
  counter. The architect's alternative `profile-<base>.<N>` was **declined**. It follows that
  [`0356`](../0356-tag-telemetry-server-deploys-with-a-version-like-the-game/brief.md) uses
  **`<base>-telemetry.<N>`**. (`package.json` is still never written with a suffix.)
- **Q4 — uncommitted shipped files ruled: refuse to deploy.** This **overrides** the recommendation written in Q4
  above ("still deploy, skip the git tag, warn loudly"): if a shipped file has uncommitted changes, the deploy stops
  before anything is built, with a clear message.
- **Q7 — the game server's own fake `"1.0.0"` ruled: "Yes, file it"** — filed as a separate task,
  [`0357`](../../backlog/0357-game-server-telemetry-reports-its-real-version-not-a-fake-1-0-0/brief.md) (Backlog board). Not
  part of this build.
- **Shared helper:** `scripts/deploy-version-tag.sh`, built in this task, is the piece `0356` reuses.
- **Pending follow-up (the owner has NOT been asked yet):** the architect recommends recording the naming convention
  as an **ADR** now that it is ruled, since it spans `0355`, `0356` and any future server. To be put to the owner
  (`/fkit-record-decision`, owner session).
