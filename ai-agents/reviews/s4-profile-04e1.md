# Review ledger — s4-profile-04e1

Task: `ai-agents/tasks/backlog/s4-profile-04e1-build-push-digest.md`
File(s) under review: `build-deploy-profile.sh`, `package.json` (`deploy:profile`)
Status: **closed-out** (finalized R7 via PR#119) — converged after 7 rounds (original 2-round budget); both reviewers came back clean on the R6 fixes

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
| 6-C | (PR#119 stateful review, both reviewers) Digest match interpolates the repo name into a regex — `.` in a repo name (or `ghcr.io/org` prefix) is a wildcard that could select a sibling repo's entry | CORRECT — defect (robustness) | Replaced the grep regex with a while-loop **exact** repo-prefix equality + separate `sha256:` validation. Preserves fail-closed; verified on a `.`-in-repo sibling-first case. |
| 6-A | (PR#119) `mktemp` IIDFILE leaks on build failure under `set -e` (exit before the manual `rm`) | CORRECT — defect (hygiene) | Added `trap 'rm -f "$IIDFILE"' EXIT`; **kept** the manual `rm` (forward-safe variant) so a future EXIT trap can't silently re-leak it. See forward note. |
| 6-B | (PR#119) The build-time POSTGRES_PASSWORD preflight (a runtime secret) reads as accidental | CORRECT — clarity (comment-only) | Added a comment: it's a deliberate whole-pipeline fail-fast preflight. No behavior change. |
| 6-D | (PR#119) Optional `set -o pipefail` | APPLIED (optional; user opted in) | Added **with** the required pipe audit (only `echo \| docker login` [already aborts] + `printf \| grep -q` inside an if) documented inline. |
| 7 | (PR#119 re-review of the R6 fixes — both reviewers) New code (exact-match digest loop, IIDFILE trap, `pipefail`) checked for regressions | CORRECT — no new defects (Codex: *approve, no material findings*; Claude: clean) | **Closeout.** Both independently confirmed C/A/B/D correct & fail-closed (while-loop is `set -e`-safe; `docker inspect` failure → empty → L166 exit 1; double-`rm -f` is a no-op; pipefail audit holds). Neither proposed reverting the exact-match loop → no oscillation. Only a trivial comment nit (see Open). |

**Oscillation note:** R2 added the staging tag; R4 removed it; R5 flagged the
reintroduced race. Root cause: stateless reviewers re-discovering the *opposite* cost
of an unavoidable tradeoff. Net-additive changes (R1 digest bind, R3 provenance, R5
registry-presence check) were kept; the staging-tag round-trip (R2↔R4) was pure churn
this ledger exists to prevent.

## Open / actionable

- (none blocking) — R7 re-review converged: both reviewers clean on the R6 fixes, no
  new defects, no re-litigation. Task **closed out**.
- **Optional cleanup (trivial, non-blocking):** the `pipefail` audit comment at
  `build-deploy-profile.sh:16` says `printf | grep -q`; the code at L160 uses `grep -Eq`
  (the `-E` is required — `{64}` is an ERE quantifier). Comment-only; the code is correct.
  Fold into any future touch of this file; not worth a standalone change.

## Forward notes (for downstream tasks)

- **T4e3 trap consolidation:** R6-A keeps a manual `rm -f "$IIDFILE"` alongside
  `trap 'rm -f "$IIDFILE"' EXIT`. When T4e3 adds its secret-cleanup `trap … EXIT INT
  TERM`, it **replaces** the IIDFILE EXIT trap (bash traps are not additive) — fold
  IIDFILE cleanup into T4e3's cleanup function so the build-failure path still cleans up.

## Final state of the push/digest path

`buildx --load --iidfile` (iidfile trap-cleaned) → rebind + push durable `profile-<sha>`
tag → resolve `PROFILE_DIGEST` from `BUILT_IMAGE_ID` RepoDigests by **exact** repo-prefix
match (fail-closed) → verify digest present in registry (fail-closed) → stubbed transport
(lands in T4e3). Plus: `set -e`/`pipefail`, layered env load, local-only validation,
`--password-stdin` login, K7 amd64, dirty-provenance marking. No VPS contacted.
