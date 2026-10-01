# ADR-117: Server Deploys Are Named `<base>-<server>.<N>`

**Date**: 2026-09-30
**Status**: accepted

> Source: `ai-agents/knowledge-base/decisions/adr-117-server-deploy-version-names-base-server-n.md`. Accepted by
> owner sign-off 2026-09-30 (*"Accept it"*, relayed by `fkit-lead`), promoted from `proposed` in place. Drafted by
> `fkit-architect`, who heard no ruling first-hand — every ruling arrived by relay. The source's code citations are
> content anchors against the uncommitted tree of 2026-09-30; that code is now committed in `49a419d`.

## Context

The game server has a version story (`package.json` bumped by `scripts/bump-version.js`, committed, git-tagged
**before** the build, served at `/api/version`). The profile server had none — see
[[tasks/profile-deploy-version-tags]]. What made it a real decision:

- **`package.json` cannot carry a server suffix** — `bump-version.js` throws on anything but `X.Y.Z` or
  `X.Y.Z-(dev|staging).N`, so a `-profile` version there breaks the next game deploy.
- **Digest pinning is the trust anchor and must not weaken** (`setup-profile.sh` refuses a non-`@sha256` image;
  `docs/security/registry-image-policy.md`: tags are labels, not the anchor).
- **A git tag can only name a commit**, so a build from uncommitted files cannot be honestly tagged.
- **Several profile deploys can happen at one game version**, so a bare `0.0.155-profile` would collide.
- **Nothing in the repo reads, lists or sorts git tags** (grep, 2026-09-30), so the shape was free to choose.
- **The config-parity gate** stops a deploy on any new unforwarded env var — so the version is baked into the image.

## Decision

1. **Name `<base>-<server>.<N>`**, e.g. `0.0.155-profile.3`. `<base>` = `package.json` version minus any
   `-dev.N`/`-staging.N` (must match `bump-version.js`'s pattern, else the deploy stops before the build);
   `<server>` = a lower-case word; `<N>` = 1 + the highest `N` for that base across local tags, remote tags and the
   local deploy record, then moved past any name the registry already holds. **A failed attempt uses up its number.**
2. **One shared number; `package.json` is read, never written** by a server deploy. Only a game deploy moves it.
3. **Refuse to deploy when a shipped file has uncommitted changes** — scoped to what the deploy ships, fail-closed,
   before anything is built, consuming no number.
4. **Registry (servers with their own image):** the version name is the image's **only** registry tag; checked free
   before the build and again right before the push; never overwritten; skip loop capped at 20. The box still
   deploys **by `@sha256` digest**. A registry name means **"built and pushed as attempt N"**, not "deployed".
5. **Git:** an **annotated** tag, created **only after the deploy succeeded**, on the commit captured before the
   build; message carries name, commit, raw version, digest and `validation_result=ok` — no host, no repo name. Never
   forced, never `--tags`. Tagging faults are warn-only and fixed with a git command, **never by redeploying**. A git
   tag means **"deployed OK"**.
6. **Visibility:** name and commit baked in as late build args → shown on `GET /health`, telemetry
   `service.version`, OCI labels, and one boot log line; bad or unset values read `"unknown"`.
7. **One shared implementation:** `scripts/deploy-version-tag.sh`, reused by each server's deploy script.

**Rejected:** the prefix form `profile-<base>.<N>` (architect's and coder's recommendation — **declined by the owner
in favour of his suffix idea; no further reason was relayed**); no counter; an own number per server; commit only;
bumping or suffixing `package.json`; warn-and-deploy on uncommitted files (declined by the owner); keeping
`profile-<sha>` beside the version tag (owner, review R2); lightweight tags; tagging before the build.

## Consequences

- **Positive:** one answer to "what is running?" on four surfaces plus the record; two tags with distinct, honest
  meanings; digest pinning and the config-parity gate untouched; the game's release flow unaffected.
- **Costs:** every server deploy needs its shipped files committed; the registry gains one permanent name per pushed
  attempt; deploys need registry access before the build (can't read → stop) and origin for the counter (can't read
  → warn); `git describe` will return profile tags; version-sorting tools place `0.0.155-profile.3` **before**
  `0.0.155` (cosmetic, accepted).
- **Accepted residuals** (owner, 2026-09-30; full text in `0355`'s `review.md`): R3 — the dirty gate is a
  `git status` check, not proof the image equals the commit; Limit 1 — a short re-check→push window can silently
  overwrite a registry label; Limit 2 — a pushed-but-never-deployed image keeps its name; Limit 3 — the remote-tag
  read only warns when offline; **Limit 4** (*"Accept as is"*) — version numbers may **not strictly increase**
  (the counter can fill a gap below a higher registry-held name), but names are never duplicated.
- **Open point, not decided here:** registry retention vs "never reuse a name" — pruning the newest
  never-deployed name could let a later deploy reuse its number. Owner: *"File a task for it"* → **`0359`**
  (Backlog board).
- **How other servers apply it:** telemetry (**`0356`**) — `<base>-telemetry.<N>` via the same helper; it runs only
  third-party images, so decision 4 and the decision-6 surfaces do not apply (a marker file on the box instead);
  ⚠️ decision 3 there is the default but `0356` says it is **not yet ruled for that task**. *(📌 2026-10-01: ruled at
  `0356`'s plan gate — **refuse** on uncommitted shipped files, no deploy lock, no commit-exact upload; `0356` is
  done (agent-closed — not owner-verified), not deployed; verify `0363` on Sprint 8 — see
  [[tasks/telemetry-deploy-version-tags]].)* Game server
  (**`0357`**) — not renamed; only its fake `service.version` `"1.0.0"` is replaced by the real version.
- **Re-raise only if:** the game's own versioning changes shape; a tool starts reading or sorting git tags; the
  registry offers an atomic "create tag only if absent"; or a server must routinely deploy uncommitted code.

## Related

- [[tasks/profile-deploy-version-tags]] — task `0355`, which built it
- [[tasks/profile-deploy-hardening]] — the digest-pinned deploy and harness this keeps intact
- [[systems/project-operations]] — the game's `bump-version.js` flow
- [[systems/telemetry]] — `0356` / `0357` apply this to the telemetry box and the game server's `service.version`
- [[tasks/telemetry-deploy-version-tags]] — task `0356` (done 2026-10-01), which applied it to the telemetry box
- [[decisions/sprint-7]] — `0355`, `0356`; [[decisions/sprint-backlog]] — `0357`, `0359`
