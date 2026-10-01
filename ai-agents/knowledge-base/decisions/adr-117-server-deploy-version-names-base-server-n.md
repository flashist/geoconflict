# ADR-117: Server deploys are named `<base>-<server>.<N>` — one registry name per attempt, a git tag only when the deploy succeeded

- **Status:** accepted (owner sign-off 2026-09-30, relayed by fkit-lead). Promoted `proposed` → `accepted` in
  place, per `decisions/README.md` § *Immutability starts at `accepted`*.
  - **The rulings** (live via `AskUserQuestion` in the `fkit lead` session, 2026-09-30, relayed by `fkit-lead`):
    on the ADR itself, **"Accept it"**; on the counter gap, **"Accept as is"** (recorded as *Limit 4* under
    *Consequences*); on the retention conflict, **"File a task for it"** (recorded under *Open points*). The last
    two were folded into the body in the same pass as the promotion, before `accepted` took effect.
  - *History, kept visible:* until 2026-09-30 this line read *"proposed — **every decision below is already
    owner-ruled** (2026-09-30, see *Deciders*); what is pending is the owner's sign-off on **this text**. Promote to
    `accepted` in place, per `decisions/README.md` § *Immutability starts at `accepted`*. Left `proposed` because
    the owner has not read these words, and a `proposed` body can still be corrected without a superseding ADR."*
- **Date:** 2026-09-30
- **Deciders:** Owner (Mark Dolbyrev). Drafted by `fkit-architect` (spawned by `fkit-lead`); the architect heard no
  ruling first-hand — every ruling below arrived by relay.
  - **Owner rulings this ADR rests on (all live via `AskUserQuestion` in the `fkit lead` session, 2026-09-30,
    relayed by `fkit-lead`):**
    - **`0355` plan gate** — plan approved with the §10 defaults (shared number, no bump, tag only after success,
      annotated tags, visible on `/health` + telemetry + labels, failed attempts use up their number); **Q1** name
      = `<base>-profile.<N>` (the architect's `profile-<base>.<N>` declined); **Q2** uncommitted shipped files →
      **refuse to deploy** (warn-and-deploy declined). Source: `0355` `plan.md` § *Owner decisions at approval*.
    - **`0355` brief Q7** — the game server's fake `"1.0.0"` → *"Yes, file it"* (became `0357`).
    - **`0355` review round 1** — R2 *"Drop profile-<commit> tag"*, then **Option 1** *"Upload as 0.0.155-profile.N"*;
      R3 *"Fix the wording, accept"*; the three known limits *"Accept all three"*. Source: `0355` `review.md`,
      `worklog.md` § *PROCESS REVIEW round 1, part 2*.
    - **`0355` review round 2** — R8 *"Add the test now"*.
    - **This ADR** — *"Yes, after 0355 is built"*; then, on this text, *"Accept it"*, counter gap *"Accept as
      is"*, retention conflict *"File a task for it"* (see *Status*).
- **Citation frame:** code citations are **content anchors** (file + quoted phrase), read against the **uncommitted
  working tree of 2026-09-30 on top of `26b85c0`** — `0355`'s code was not yet committed when this was written
  (`ai-agents/knowledge-base/conventions/file-line-citations.md`).

## Context

The game server has a version story: `package.json` `version` (e.g. `0.0.155`) is bumped by `scripts/bump-version.js`
on every game deploy, committed, and pushed as a lightweight git tag — **before** the image is built
(`build-deploy.sh`, `git tag "${PACKAGE_VERSION}"`), and the running game serves it at `GET /api/version`.

The profile server had none of that. Its image tag was `profile-<short sha>[-dirty]`, a dirty tree deployed with only
a warning, nothing was written to git, `/health` returned only `{"status":"ok"}`, and telemetry `service.version` was
a hardcoded `"1.0.0"`. "What is running on that box?" could be answered only from a deploy log on the operator's
laptop. The owner asked for the profile and telemetry servers to be tagged "similarly to the way we currently tag our
game server", proposing the shared `package.json` number plus a per-server suffix, and explicitly invited better
options (`0355` brief § *Context*, owner's words verbatim).

Constraints that made this a real decision:

- **`package.json` cannot carry a server suffix.** `scripts/bump-version.js` matches only
  `^(\d+)\.(\d+)\.(\d+)(?:-(dev|staging)\.(\d+))?$` and throws `Invalid version format` otherwise, so a
  `-profile` version there breaks the next game deploy.
- **Digest pinning is the trust anchor and must not weaken.** `setup-profile.sh` refuses a `PROFILE_IMAGE` that is
  not `@sha256`-pinned ("Refusing to deploy a mutable tag"); `docs/security/registry-image-policy.md` § *Deploy
  Rules*: "Tags are useful operator labels, but they are not the trust anchor" — the anchor is commit + digest +
  validation result.
- **A git tag can only name a commit.** A build from uncommitted files cannot be honestly tagged.
- **Several profile deploys can happen at one game version**, so a bare `0.0.155-profile` would collide.
- **Nothing in the repo reads, lists or sorts git tags** other than the new helper and the game's one
  `git tag` call (verified by grep 2026-09-30), so the name's shape is free to choose.
- **The config-parity gate** (`0298`) stops a profile deploy on any new, unforwarded env var — so the version must be
  baked into the image, not passed at deploy time.

## Decision

**1. The name is `<base>-<server>.<N>`**, e.g. `0.0.155-profile.3`, `0.0.155-telemetry.1`.
- `<base>` = `package.json` `version` with any `-dev.N` / `-staging.N` removed — the last game release the tree comes
  from. It must match `bump-version.js`'s own pattern (kept identical in `scripts/deploy-version-tag.sh`,
  `DEPLOY_VERSION_PATTERN`); anything else **stops the deploy before the build**.
- `<server>` = a lower-case word (`^[a-z]+$`): `profile`, `telemetry`, and any future server.
- `<N>` = a counter **per base**, starting at 1. It is 1 + the highest `N` for that `<base>-<server>` across **local
  git tags, the remote's git tags (`git ls-remote`), and the local deploy record's `version=` lines**; then, where
  the server ships its own image, the result is moved forward past any name the **registry already holds**
  (`deploy_first_free_in_registry`). **A failed attempt uses up its number** — it is recorded, and a pushed attempt
  also holds its name in the registry — so two different images never deliberately share one name.

**2. One shared number; `package.json` is read, never written.** A server deploy never bumps, suffixes, commits or
pushes `package.json` and never calls `bump-version.js`. Only a game deploy moves the number.

**3. Refuse to deploy when a shipped file has uncommitted changes.** The check is **scoped** to what the deploy
actually ships (for the profile server, `PROFILE_SHIPPED_PATHS`: `Dockerfile.profile`'s `COPY` sources plus the
scripts the deploy uploads, this script and its helper) — a note under `ai-agents/` never blocks a deploy. No git
commit at all, or a failing `git status`, also refuses (fail closed). The refusal happens **before anything is built**
and consumes no number. The old `-dirty` image tag is gone (unreachable).

**4. Registry (servers that ship their own image):**
- The version name is the image's **only** registry tag — `profile-<sha>` is dropped.
- It is pushed **before** the deploy (`docker push` needs a tag), after the registry has been asked twice: once
  before the build (held → skip to the next number; can't tell → stop, "Nothing was built") and again right before
  the push (taken or can't tell → stop, push nothing). A name is **never overwritten**; the skip loop is capped at 20.
- The box still deploys **by `@sha256` digest**, resolved from the built image ID and re-verified in the registry.
  A version name that does not resolve to that digest after the push only **warns** (a label fault, not a content
  fault).
- **Meaning:** a registry name = "built and pushed as attempt N" — **not** "deployed".

**5. Git:** an **annotated** tag named `<base>-<server>.<N>`, created **only after the deploy succeeded**, on the commit
captured before the build (not whatever `HEAD` is by then), pushed as `refs/tags/<name>` only. The message carries the
name, full commit, raw `package.json` version, `sha256:` digest and `validation_result=ok` — **no host, no repo name**.
Never `-f`/`--force`, never `--tags`/`--follow-tags`. Any tagging fault is **warn-only** (the deploy already happened,
exit code stays 0) and is fixed with the printed git command, **never by redeploying**. **Meaning:** a git tag =
"deployed OK".

**6. Visibility of the running version:** the name and commit are baked into the image as late build args →
`ENV` (`PROFILE_BUILD_VERSION` / `PROFILE_BUILD_COMMIT` in `Dockerfile.profile`) and shown in four places: `GET
/health` → `{status, version, commit}` (public, same exposure as the game's `/api/version`); telemetry
`service.version`; OCI labels `org.opencontainers.image.version` / `.revision`; one boot log line. Values that are
not a short plain token (`^[A-Za-z0-9._+-]{1,80}$`) or are unset read `"unknown"` (`src/profile-server/BuildInfo.ts`,
`parseBuildInfo`). The deploy record gains `version=` and `package_version=`, and `git_tag=<outcome>` on its final
`validation_result=` line.

**7. One shared implementation.** The logic lives in the sourced helper `scripts/deploy-version-tag.sh` (functions
only, server name and pathspec as parameters). Each server's deploy script reuses it rather than copying it.

## Options considered

- **`<base>-<server>.<N>` — suffix + counter (chosen).** The owner's original idea plus the counter that fixes the
  collision; same shape as the game's existing `0.0.141-dev.1` tags. Chosen by the owner at `0355`'s plan gate.
- **`<server>-<base>.<N>` — prefix form, e.g. `profile-0.0.155.3` (rejected by the owner).** The architect's and
  coder's recommendation: server tags group under `git tag -l 'profile-*'`, apart from the game's `0.0.x` tags; it
  matched the then-existing `profile-<sha>` image tags; and version-sorting tools read the suffix form as "a
  pre-release of 0.0.155". **Declined by the owner in favour of his original suffix idea; no further reason was
  relayed**, and none is invented here. Both forms were equally workable because nothing reads tags.
- **`<base>-<server>` with no counter (rejected).** A second deploy at the same game version collides with an existing
  tag.
- **An own version number per server (rejected).** A new file or field to bump, and a commit on every server deploy;
  more to maintain for "number changes only when that server changes", which the tag's commit already tells you.
- **Commit only, e.g. `profile-<sha>` (rejected).** Nothing to maintain, but not human-friendly and not "like the
  game"; no git tag.
- **Bump `package.json` on a server deploy, or write a suffixed version into it (rejected).** Moves the game's number
  from a server deploy, creates commits, and a suffix breaks `bump-version.js`.
- **Warn-and-deploy on uncommitted files, with no tag (rejected by the owner).** Today's behaviour and the plan's
  recommendation (cheapest to reverse; `/health` would say `untagged`). The owner chose the stricter rule: a deploy
  that cannot be named after a commit does not happen.
- **Keep `profile-<sha>` and add the version tag after the deploy (rejected by the owner, review R2).** Because every
  build now bakes a unique version, every build is a distinct digest, so `profile-<sha>` would **move** between images
  on a same-commit redeploy; and a post-deploy registry push could overwrite a name another deploy held (R1). The
  owner dropped `profile-<sha>` and chose Option 1, "Upload as `0.0.155-profile.N`".
- **Lightweight git tags, like the game (rejected).** An annotated tag carries commit + digest + "ran OK" — the
  policy's trust anchor — in a durable copy off the operator's laptop.
- **Tag before the build, like the game (rejected).** A failed build would still leave a tag; a tag must mean "this
  really ran".

## Consequences

- **Positive:**
  - "What is running?" has one answer on four surfaces (`/health`, telemetry, image label, boot log), plus the record.
  - The two tags carry distinct, honest meanings: registry name = pushed attempt; git tag = deployed OK.
  - Digest pinning is untouched; no new deploy-time env var, so the config-parity gate stays green.
  - `package.json` and the game's release flow are unaffected.
- **Negative / costs:**
  - **Every server deploy needs its shipped files committed.** Until a change is committed, the deploy refuses.
  - The registry gains one permanent, never-reused name per pushed attempt, including attempts that never deployed.
    Retention of these names is **not solved** (`0355` plan § *Out of scope*) — see the residual on retention below.
  - Deploys now need network access to the registry before the build (can't read it → stop) and to origin for the
    counter (can't read it → warn only).
  - Plain `git describe` (annotated tags only) will now return profile tags on branches after a profile deploy.
    Nothing in the repo uses it.
  - Version-sorting tools place `0.0.155-profile.3` **before** `0.0.155` (the suffix reads as a pre-release) —
    cosmetic, accepted with the owner's choice of the suffix form.
- **Residual risks — accepted by owner ruling 2026-09-30 (`0355` `review.md` § *Accepted residuals*; the full text
  lives there and is deliberately not restated here, so there is one place to keep true rather than two):**
  - **R3 — the dirty gate is a `git status` check, not proof the image equals the commit** (gitignored files under
    `src/`, the `package*.json` glob, the check-then-build window). Re-raise only if a non-harmless gitignored or
    post-check file is found shipped, or the owner asks for commit-exact images.
  - **Limit 1 — a short window between the pre-push re-check and `docker push`** can silently overwrite a registry
    label (content is never wrong — the box runs the digest). Re-raise only if two profile deploys ever run
    concurrently (including one stopped by the lock *after* its push), the post-push "resolves to … not this
    build's" WARNING is seen, or two images are seen carrying one name.
  - **Limit 2 — a pushed-but-never-deployed image keeps its name** in the registry, with no git tag and no record
    line. Re-raise only if a name is found on two digests, or such a name is mistaken for a deploy.
  - **Limit 3 — the remote-tag read only warns when offline.** Re-raise only if a remote-read failure is followed by
    a duplicate name, or the owner wants the deploy to refuse then.
- **Accepted known limit — owner ruling 2026-09-30, "Accept as is" (relayed by fkit-lead):**
  - **Limit 4 — version numbers may not strictly increase.** The counter takes max(local git tags, remote git tags,
    record `version=` lines) + 1, then `deploy_first_free_in_registry` (`scripts/deploy-version-tag.sh`, the
    `taken)` branch: "skipping to the next number") probes the registry **upward from that candidate** and stops at
    the first free name. So when the registry holds a higher name than any git tag or record line knows about (e.g.
    `.3` and `.5` held, git/record max `.2`), the deploy takes the **gap** (`.4`), below the higher registry-held
    `.5`. A later deploy therefore can carry a lower `N` than an earlier registry name. **Names are never duplicated**
    — every candidate is checked free before use and the pre-push re-check still applies (decision 4). Re-raise only
    if anything starts relying on tag numbers being strictly increasing (e.g. "the highest `N` is the latest
    deploy"), or a duplicate name is ever seen.
- **Re-raise this ADR only if:** the game's own versioning changes shape (e.g. `bump-version.js` accepts another
  suffix, or `package.json` stops being the shared number); a tool is introduced that reads, sorts or releases by git
  tags; the registry is replaced by one that offers an atomic "create tag only if absent" (which would close Limit 1
  and could change decision 4); or a server has to deploy uncommitted code as a matter of routine.

### How other servers apply this

- **Telemetry — `0356`.** Name `<base>-telemetry.<N>` via the same helper, with its own pathspec (the telemetry
  scripts), so a profile-only change never blocks a telemetry deploy and the reverse. The telemetry box runs **only
  third-party images**, so decision **4 (registry) does not apply** and the `/health`/telemetry/label surfaces of
  decision 6 do not exist there: its visible version is a marker file on the box plus a local deploy record (`0356`
  brief § *What to build*). Decisions 1, 2, 3 and 5 apply. ⚠️ **Decision 3 is the convention's default, but `0356`'s
  brief records it as "not yet ruled for this task — confirm at this task's plan gate"**; this ADR does not settle
  that confirmation for the owner.
- **Game server — `0357`.** Not renamed: the game keeps its own bump-before-build lightweight tags. `0357` only
  replaces the game server's fake `service.version` `"1.0.0"` with the real `package.json` version — the same
  "report the real version, never a hardcoded one" rule as decision 6.
- **Any future server** that ships its own image: decisions 1–7 in full, reusing `scripts/deploy-version-tag.sh` with
  a new `<server>` word and its own shipped-paths list; bake the name in as late image layers under names that are not
  runtime env-file keys.

### Open points recorded, not decided here

- **Registry retention vs "never reuse a name".** `docs/security/registry-image-policy.md` § *Retention Policy* says
  to remove superseded tags quickly. If a pruned registry name was the **only** claim on its number (a Limit 2
  attempt with the highest `N` for its base), the next deploy can reuse that number — one name on two digests over
  time. Any retention job must keep, or record elsewhere, the highest name per base. Owner's call when retention is
  built.
  - **Owner ruling 2026-09-30, "File a task for it" (relayed by fkit-lead):** tracked as its own work — a Backlog
    task filed 2026-09-30 to decide clean-up rules for version tags, so that removing the newest never-deployed
    registry name cannot let a later deploy reuse its number. Still not decided here; that task decides it.
    - *Clarification 2026-09-30 (in place, per `decisions/README.md` carve-out; requested by `fkit-lead`):* that
      task is **`0359`** —
      [`0359-decide-registry-retention-rules-so-a-server-version-number-is-never-reused/brief.md`](../../tasks/backlog/0359-decide-registry-retention-rules-so-a-server-version-number-is-never-reused/brief.md).
      Pointer only; no decision changed.

## Related

- Task `0355` (built, reviewed two rounds, closed agent-closed — not owner-verified):
  `ai-agents/tasks/done/0355-tag-profile-server-deploys-with-a-version-like-the-game/` — `brief.md` (§ *Owner
  rulings — 2026-09-30*), `plan.md` (§ *Owner decisions at approval* overrides the plan body), `worklog.md`
  (decision logs), `review.md` (R1–R9, *Accepted residuals*).
- `ai-agents/tasks/backlog/0356-tag-telemetry-server-deploys-with-a-version-like-the-game/brief.md`;
  `ai-agents/tasks/backlog/0357-game-server-telemetry-reports-its-real-version-not-a-fake-1-0-0/brief.md`.
- Code: `scripts/deploy-version-tag.sh` (`deploy_version_base`, `deploy_version_next`, `deploy_shipped_tree_dirty`,
  `deploy_registry_tag_state`, `deploy_first_free_in_registry`, `deploy_tag_and_push`); `build-deploy-profile.sh`
  (§ "Source commit + version name (task 0355)", § "Registry login + a free version name", "print_header \"TAGGING");
  `Dockerfile.profile` ("Build identity (task 0355)"); `src/profile-server/BuildInfo.ts`; `src/profile-server/Routes.ts`
  (`app.get("/health"`); `src/profile-server/Telemetry.ts` (`profileResourceAttributes`).
- Tests: `tests/scripts/profile-deploy-hardening.test.sh` (T20–T39 + the 0355 structural section),
  `tests/profile-server/BuildInfo.test.ts`, `Routes.test.ts`, `Telemetry.test.ts`.
- Policy: `docs/security/registry-image-policy.md` (§ *Deploy Rules*, § *Retention Policy*, § *Minimum Deploy Record*).
- Game side: `build-deploy.sh`, `scripts/bump-version.js`.
