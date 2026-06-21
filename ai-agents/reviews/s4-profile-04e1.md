# Review ledger — s4-profile-04e1

Task: `ai-agents/tasks/backlog/s4-profile-04e1-build-push-digest.md`
File(s) under review: `build-deploy-profile.sh`, `package.json` (`deploy:profile`)
Status: closed-out (recommended) — 5 rounds against a stated 2-round budget

## Accepted residuals (do-not-re-litigate)

- **Shared durable push tag (no per-run staging tag)** — What: the build pushes the
  durable `profile-<sha>` tag directly (rebind `BUILT_IMAGE_ID` → tag → push). Why
  (structural): `docker push` can only target `NAME[:TAG]` (not an image ID/digest),
  and the T4f pre-push scan forces `--load` (rules out atomic `buildx --push`), so a
  tag→push step is unavoidable. A per-run staging tag was tried (R2) and removed (R4)
  because it accumulates remote tags, violating `docs/security/registry-image-policy.md`
  §Retention ("remove temp tags quickly") and needing provider-specific deletion. The
  residual tag→push race is **liveness-only** — a diverted push fails closed at digest
  resolution + the registry-presence check; it is never a wrong-content deploy.
  Re-raise only if: an atomic, scan-compatible push/digest mechanism becomes
  available, OR the registry-presence check is removed.
- **Dirty worktree = warn + record, not fail-closed** — What: a dirty build is tagged
  `-dirty`, warns, and records the full commit SHA + a DIRTY marker; it does not
  abort. Why (structural): the trusted-image policy gates *deploys*, not this local
  build/push slice (deploy half is stubbed → T4e3); the artifact is honestly labeled
  (not "recorded as HEAD"); user explicitly chose warn-over-fail (R3); deploy is by
  content digest so nothing wrong ever ships. Re-raise only if: this slice starts
  performing the production deploy, or policy changes to require clean builds at build
  time.
- **No bash test harness for deploy scripts** — What: no automated regression tests
  for `build-deploy-profile.sh`. Why (structural): no deploy script in the repo has
  tests (`build-deploy*.sh`, `setup-*.sh`); adding a harness is out of this slice's
  scope and disproportionate. Re-raise only if: a deploy-script test harness is
  introduced repo-wide.
- **Adversarial docker-socket peer not defended** — What: an attacker with local
  docker-socket access can retag any (enumerable) name in the tag→push window. Why
  (structural): no tag scheme closes this with plain `docker push`; the
  content-addressed digest resolution + registry-presence check make the worst case a
  fail-closed build, never a wrong artifact. Re-raise only if: the threat model
  expands to a shared/CI daemon (then the whole approach is reconsidered, not patched).

## Decision log

| Round | Finding | Verdict | Action |
|-------|---------|---------|--------|
| 1 | Mutable-tag push not bound to built ID | PARTIALLY CORRECT | Added `docker tag BUILT_IMAGE_ID` rebind before push. |
| 2 | Rebind still has tag→push TOCTOU | PARTIALLY CORRECT | **Added per-run staging tag** (later reverted, R4). 4-agent verification: RepoDigests is content-addressed → never wrong-content; residual is liveness-only. |
| 3 | Dirty worktree breaks provenance | PARTIALLY CORRECT | User chose warn + record full SHA + `-dirty` (declined fail-closed). |
| 4a | Dirty worktree should fail-closed (re-raise of R3) | INCORRECT | No change — policy gates deploys, not this slice; user already decided in R3. |
| 4b | Per-run staging tag accumulates remotely | PARTIALLY CORRECT | **Removed the staging tag** (reverts R2); push durable tag directly. Net simplification. |
| 5 | Stale RepoDigest can report a GC'd/diverted digest as success | PARTIALLY CORRECT | Added registry-presence check (`docker buildx imagetools inspect`, fail-closed); tightened push comment. |

**Oscillation note:** R2 added the staging tag; R4 removed it; R5 flagged the
reintroduced race. Root cause: stateless reviewers re-discovering the *opposite* cost
of an unavoidable tradeoff. Net-additive changes (R1 digest bind, R3 provenance, R5
registry-presence check) were kept; the staging-tag round-trip (R2↔R4) was pure churn
this ledger exists to prevent.

## Open / actionable

- (none) — recommend closeout. Further passes will relocate frontier costs, not fix
  defects.

## Final state of the push/digest path

`buildx --load --iidfile` → rebind + push durable `profile-<sha>` tag → resolve
`PROFILE_DIGEST` from `BUILT_IMAGE_ID` RepoDigests (fail-closed) → verify digest
present in registry (fail-closed) → stubbed transport (lands in T4e3). Plus: layered
env load, local-only validation, `--password-stdin` login, K7 amd64, dirty-provenance
marking. No VPS contacted.
