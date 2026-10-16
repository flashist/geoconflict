# Profile Box: Lock Postgres to One Exact Image by Digest (task 0384)

**Source**: `ai-agents/tasks/done/0384-profile-box-lock-postgres-to-one-exact-image-by-digest/brief.md` (`plan.md`, `review.md`, `worklog.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 8, rank 54 (ADR-035 append rank; merit order `0219` → `0384` → `0385` owner-confirmed 2026-10-15) / task `0384`

> 🚀 **2026-10-16 sync, third run (`29811f0`) — DEPLOYED in profile `0.0.164-profile.2`** (mid-week, 2026-10-16 ~12:10–12:15Z, owner-run; `git tag
> --contains d6458d9` → yes, checked by me). From `0385`'s worklog (owner-run read-only batches, relayed — **not
> re-verified by me**): before — the box already ran image ID `721873c3…` (same as the lock's digest prefix), version
> 16.15, 7 migrations, fresh nightly backup; the stray 642 MB `postgres:16` image was already gone. After — Postgres
> names exactly the locked reference (`MATCHES LOCK`) ✅, version 16.15 ✅, migrations 7 → 7 and `/ready` 200 ✅, the
> locked image survived the prune ✅; the container **was recreated once** (12:12:44Z, healthy) — matches the "likely
> once" guess; optional restart **skipped** by owner ruling *"Skip it (Recommended)"*. ⏳ **Only step 5 left:** the next
> nightly backup marker (~02:30Z 2026-10-17) must be fresh and successful. `0385` is now [[decisions/sprint-9]] rank 1.
> The "NOT DEPLOYED" lines below are history.

> ✅ Done (agent-closed — not owner-verified), closed 2026-10-15 by a spawned `fkit-producer` at the close step of
> `fkit-sprint-ship-loop`, on the owner ruling *"Restart the ship-loop for 0384 (Recommended)"* (relayed by `fkit-lead`;
> ⛔ not producer precedent). Plan owner-approved; review round 1 closed-out (R1–R4, all low, all fixed).
>
> ⚠️ **REPO WORK ONLY — NOT DEPLOYED.** The brief's close note says *"Not committed, not deployed"*; the code has since
> been committed (`d6458d9`, 2026-10-15 — `setup-profile.sh`, `tests/profile-backup-dryrun.sh`,
> `tests/scripts/profile-deploy-hardening.test.sh`), but `git tag --contains d6458d9` → **none** at this sync ⇒ **not on
> the box.** The box keeps resolving `postgres:16-alpine` until the next profile deploy (weekend slot). The on-box check
> is **`0385`** (Sprint 8, rank 55, `🔲 Backlog`), which is also `0219`'s B6/V2 re-check.

## Goal

Fix finding **F-C** of the 2026-09-26 weekend window ([[systems/weekend-deploy-window]]): the profile box's compose file
named the **moving label** `postgres:16-alpine`, so every deploy's `docker compose pull` (and the systemd unit's
`compose up`) could silently move the database to a newer minor that nobody chose. It already did — an unplanned upgrade
to **PostgreSQL 16.15**, data intact, recorded on `0219`. Owner rulings of 2026-10-04 chose the architect's option (b),
**lock by digest** — [[decisions/adr-120-third-party-images-digest-pinned]] §1 (still `proposed`: decision owner-ruled,
wording not owner-signed). A "keep the tag" prune (option a) was rejected: it treats the symptom and leaves the label
moving.

**Owner rulings 2026-10-15** (live `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`; ⛔ not producer
precedent):
- **A** — *"Build it as 0384 (Recommended)"*: the B6/V2 fix the owner had just chosen inside `0219` (*"Pin by digest"*)
  is built **here**; `0219`'s B6/V2 item points to `0384` + `0385` and is met when `0385` passes.
- **B** — *"Yes, add the check (Recommended)"*: a test fails if the four copies of the reference stop matching.
- **C** — `0385` stays on Sprint 8 (a bend of the build/verify-split rule, this case only).
- **D** — merit order `0219` → `0384` → `0385` confirmed (row numbers unchanged, ADR-035).

**Locking to what the box already ran means the deploy changes no Postgres bytes.** The digest came from the owner's
read-only box batch (2026-10-15) plus `fkit-lead`'s registry cross-check: running image ID = repo digest = registry
**multi-arch index** digest (`721873c3…`), `PostgreSQL 16.15`, index lists `linux/amd64`; both `16-alpine` and
`16.15-alpine` resolved to it that day.

## Key Changes

- **`setup-profile.sh`** — the compose heredoc's `postgres` `image:` is now the literal
  `postgres:16.15-alpine@sha256:<64-hex>` (tag kept as a human label; Docker uses the digest). Search
  `image: postgres:16.15-alpine@sha256:`. **No fifth `${...}` substitution** — the `0282` R3 residual said a fifth value
  is the moment to revisit the rendering ([[tasks/setup-profile-heredoc-root-command-execution]]). The prune comment was
  reworded so it no longer names `postgres:16-alpine`. No logic change: prune, pull, `up`, rollback, systemd unit
  untouched.
- **The same reference in four places, byte for byte:** `setup-profile.sh` (compose `postgres`), the runbook's drill
  step 3 `restore-test` image (`ai-agents/knowledge-base/profile-backup-restore-runbook.md`), and `tests/profile-backup-dryrun.sh`'s
  `postgres` and `restore-target` services (twice). This also settles `0436`'s review note that the dry-run tested the
  moving label ([[tasks/backup-dryrun-minio-image]]).
- **New harness checks A1–A4** in `tests/scripts/profile-deploy-hardening.test.sh` (part of `npm test`), in the `0219`
  structural block:
  - **A1** — the `postgres` service's image matches `postgres:16\.[0-9]+-alpine@sha256:[0-9a-f]{64}`, anchored both
    ends — a **major-16 tripwire** (a 16 → 17 move is its own project, ADR-120 §4).
  - **A2** — every compose `image:` is `${PROFILE_IMAGE}` or a whole-value `name:tag@sha256:<64 hex>` (tightened in
    review, R4, so a trailing comment carrying a digest no longer passes — ADR-120 asks new digest validators not to
    copy `0287`'s unanchored check). Side effect: an unfamiliar form (quoted value, registry `:port`, tagless
    `name@sha256:`) now fails — false red, never false green.
  - **A3** — exactly 4 compose substitutions in `setup-profile.sh`.
  - **A4** — the runbook's `restore-test` image (every such command) and exactly 2 dry-run `image: postgres…` lines
    equal A1's value byte for byte (Ruling B).
- **Runbook — new section "Updating the pinned Postgres image (ADR-120 §2)"** (8 steps): newest release within major 16;
  read the index digest and confirm `linux/amd64`; change all four places, harness `ALL PASS`; **a fresh backup in the
  same slot, right before the deploy** (last night's is named not enough — review R2, owner ruling *"Match ADR-120: fresh
  backup (Recommended)"*); restore drill against the new reference; commit, weekend-slot `npm run deploy:profile`,
  record the previous reference as the rollback; verify (`select version()`, `RepoDigests` lists the new digest, `/ready`
  200, `schema_migrations` count unchanged); rollback is a **hand revert**, same major only.
- **`architecture.md`** — the profile Postgres now reads `postgres:16.15-alpine`, digest-pinned (ADR-120), in the image
  table **and** the "Two Postgres instances" callout (the callout fix was review R1, owner ruling *"Fix line 677 too
  (Recommended)"*). Telemetry's `postgres:17-alpine` left as is — `0386`'s scope.

## Outcome

- **Tests (worklog, final bytes):** hardening harness `ALL PASS`; negative checks — compose line put back to
  `postgres:16-alpine` → exactly 5 ❌ (A1, A2, A4 ×3); one digest character changed in the runbook → exactly 1 ❌ (A4);
  the R4 comment case → exactly 1 ❌ (A2); each restored with sha256 identical. `npm test -- tests/scripts/ShellHarnesses.test.ts`
  5/5 (one earlier attempt hit the 150 s deadline under another project's load — **re-run, said so**, no change between).
  Full `npm test` **228/228 suites, 4757/4757 tests**, green. `npm run test:scripts:docker` **55 passed, 0 failed** — it
  pulled the pinned reference, the local proof that Docker/Compose accept the `name:tag@sha256:` form.
- **Observation (worklog):** before this change the dry-run on the builder's Mac had been silently testing a **stale,
  4-month-old cached `postgres:16-alpine`**, not the box's build. The Mac is arm64, so it ran the index's arm64 entry,
  not the box's `linux/amd64` one.
- **Review:** stateful; Codex second opinion was **reasoning-only** (its harness run was denied by the read-only
  sandbox, and two model pins in `.codex/config.toml` were rejected before a third ran) — execution evidence is the Claude
  reviewer's harness run plus 7 mutation runs. R1–R4 all low, all `✅ done`.

**Not verified (stated by the worklog):**
- Nothing on the box. Whether `docker compose pull` by tag+digest adds an extra local image name, and whether Postgres is
  recreated once on the first deploy, are **unknown** — `0385`.
- The `linux/amd64` entry was not pulled or run anywhere in the build (the box already runs that exact image).
- `setup-profile.sh` itself was not executed (it needs a box) — covered by the structural harness, `bash -n`, and the
  dry-run's use of the same reference.
- Classic-store Docker `RepoDigests` behaviour (runbook step 7) is stated as expected, **not tested**; on this box's
  containerd store the container's `{{.Image}}` also equals the digest, on a classic store it would not.

⚠️ **Still true after this ships:** the deploy's automatic rollback covers `profile-api` only — **not Postgres**. Pinning
stops *unplanned* upgrades; it adds no database rollback.

**Carried, unverified (brief's side notes):** the stray `postgres:16` image (642 MB) from `0219`'s W5 — removal not
confirmed (`0385` checks it); why W3's `up -d postgres` did not recreate the DB but W10's systemd `compose up` did —
unexplained, moot once locked.

**Follow-ups:** `0385` (on-box check, Sprint 8, after the weekend deploy); `0386`/`0387` (telemetry box, five images,
Backlog board); `0388` (quarterly minor bump, depends on `0384` + `0386`; three open owner questions in its brief).

## Related

- [[decisions/adr-120-third-party-images-digest-pinned]] — the decision this implements (§1 pin, §2 deliberate backup-first upgrades)
- [[systems/player-profile-store]] — the profile box and its Postgres; finding F-C
- [[systems/weekend-deploy-window]] — where F-C was found (W5/W10, 2026-09-26); this lock deploys in a weekend slot
- [[tasks/profile-backup-restore-reproof-006]] — task `0275`, the restore drill whose image now follows the lock
- [[tasks/backup-dryrun-minio-image]] — task `0436`, whose review note (dry-run on the moving label) this covers
- [[tasks/setup-profile-heredoc-root-command-execution]] — task `0282`, why the lock is a literal, not a fifth substitution
- [[decisions/registry-image-policy]] — "the trust anchor for a production image is its digest, not a mutable tag"
- [[decisions/adr-117-server-deploy-version-names]] — our own app image is already deployed by `@sha256` digest
- [[decisions/sprint-8]] — rank 54; `0385` at 55
- [[decisions/sprint-backlog]] — where `0384`–`0388` were filed; `0386`–`0388` still there
- [[decisions/sprint-9]] — verify task `0385` moved there at the Sprint 8 close (rank 1)
