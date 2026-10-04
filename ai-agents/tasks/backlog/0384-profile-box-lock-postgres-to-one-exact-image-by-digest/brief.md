# Profile box: lock Postgres to one exact image by digest

## ID
0384

> ℹ️ **ID allocation, checked 2026-10-04 before filing.** Highest task folder and highest `## ID` across `backlog/`,
> `done/` and `cancelled/`: `0383`. `0384`–`0388` allocated in this run, in that order.

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**OWNER RULINGS, relayed by `fkit-lead`; ⛔ not producer precedent.** Filed 2026-10-04 by a spawned `fkit-producer`
with no owner channel (ADR-021/037), on rulings the owner gave live via `AskUserQuestion` in the `fkit lead` session:

1. *"Lock Postgres to one exact version (the architect's option b)?"* → **"Yes, file a task (Recommended)"** —
   *"Producer files a small task: lock the version in setup-profile.sh + the restore-test files, plus a test check that
   it stays locked. Deploys in a weekend slot."*
2. Telemetry included — and, by a same-day follow-up ruling, **all five** of its outside images → that is the sibling
   task [`0386`](../0386-telemetry-box-lock-postgres-and-redis-to-one-exact-image-by-digest/brief.md), not this one.
3. *"Locked means no automatic patches. How should we remember to update Postgres?"* → **"Quarterly backlog item
   (Recommended)"** → [`0388`](../0388-quarterly-check-for-a-new-postgres-minor-release-on-both-boxes-and-bump-the-lock/brief.md).

**Decision record:** [ADR-120](../../../knowledge-base/decisions/adr-120-third-party-images-digest-pinned-postgres-upgrades-deliberate-backup-first.md) (status *proposed*; the decision itself is owner-ruled). §1: every third-party image on both boxes is pinned by digest; §2: a Postgres upgrade is deliberate and backup-first, with a restore drill against the new image.

### The problem, in plain terms

- The profile box's compose file asks for **`postgres:16-alpine`** — a *moving label*. Docker Hub re-points it at
  each new 16.x release (and at Alpine rebuilds). So *which* Postgres the box runs depends on *when* it last pulled.
- Every deploy pulls (`docker compose pull`) and then starts Postgres (`docker compose up -d postgres`); the
  `profile` systemd unit's `compose up` can also recreate it. Any of those can silently move the database to a newer
  minor version that nobody chose.
- **It already happened.** Recorded in
  [`0219`](../0219-profile-p4-operability-log-rotation-prune-uptime-backup-freshness/brief.md) (the 2026-09-26 slot,
  *FINDING (W5 → W10)*): the box was running an older, untagged image; `0219`'s G2 prune deleted the tagged
  `postgres:16-alpine`; after a Docker restart the systemd unit re-pulled the label and recreated the DB on
  **PostgreSQL 16.15**. Data was intact — but it was an unplanned upgrade. `0219` left the fix direction undecided;
  the owner has now ruled it: **lock by digest.**
- **The prune only exposed it.** The box was already drifting before the prune. A "keep the tag" prune (the
  architect's option a) does **not** fix the moving label, so it is not the fix.

### Code facts (architect consult 2026-10-04; producer re-checked the line numbers 2026-10-04 — find code by name if they drift)

- `setup-profile.sh:1018` — `image: postgres:16-alpine`, inside a **quoted** heredoc (`<< 'EOF'`, nothing expands).
- `setup-profile.sh:1192` `docker compose pull`; `:1199` `docker compose up -d postgres`.
- `setup-profile.sh:1110-1111` — the compose file is rendered by four `${...}` substitutions; the `0282` R3 residual
  says *"Adding a fifth value is the moment to revisit this."* **So the lock must be a literal in the heredoc, not a
  fifth substitution.**
- `setup-profile.sh:163-176` — K2 already requires the **app** image to be `@sha256:<64-hex>`. Locking Postgres the
  same way matches an existing rule; it does not invent one.
- `setup-profile.sh:1474-1475` — the prune comment names `postgres:16-alpine` ("a superseded postgres:16-alpine
  included"); it needs rewording.
- Other copies of the moving label that must follow the lock (the restore drill must test the same Postgres the box
  runs): `ai-agents/knowledge-base/profile-backup-restore-runbook.md:257`, `tests/profile-backup-dryrun.sh:70,78`.
  A repo-wide search on 2026-10-04 found no other `postgres:16` reference outside task/report history.
- `tests/scripts/profile-deploy-hardening.test.sh:2431` — precedent: the harness already reads a pinned image tag
  out of `setup-telemetry.sh` with `sed` and asserts on it.
- ⚠️ **Rollback does not cover Postgres.** The deploy's auto-rollback (`setup-profile.sh:1221-1250`) recreates
  `profile-api` only. A bad Postgres change is a **hand revert**. Within major 16, minor versions keep the same
  on-disk format, so going 16.15 → 16.15 (same bytes) is safe; a move to 17 is a separate dump/restore project.
- Consistent with the wiki's [registry image policy](../../../wiki-vault/wiki/decisions/registry-image-policy.md):
  *"The trust anchor for a production image is … image digest … not a mutable tag name alone."*

## What to build

1. **Plan first** (`/fkit-plan-task`), owner approves before any edit.
2. **Get the digest the box runs today — a read-only box check, not yet run.** On the profile box, inspect the image
   of the running Postgres container and read its registry digest (`RepoDigests`). Expected: **16.15**, image ID
   `721873c3…` per `0219`. Use the **multi-arch index digest** (the one `RepoDigests` gives for a tag pull), not a
   single-platform manifest digest. Read-only ⇒ an agent session runs it over SSH if it can (standing rule: run it,
   don't hand it over); otherwise it is the one command the owner runs. **Locking to what the box already runs means
   the deploy changes no Postgres bytes.** If `RepoDigests` is empty or names something other than 16.15, **stop and
   report** — do not pick a digest from Docker Hub instead.
3. **Lock the compose file.** Replace the moving label in the quoted heredoc with a literal of the form
   `postgres:16.15-alpine@sha256:<64-hex>` (version tag kept for humans, digest is what Docker actually uses).
   **No new `${...}` substitution.**
4. **Point the restore drill at the same lock:** the runbook's throwaway restore target (`:257`) and both images in
   `tests/profile-backup-dryrun.sh` (`:70,78`). One value, written identically in all four places.
5. **Reword the prune comment** (`:1474-1475`) so it no longer describes a superseded `postgres:16-alpine` as
   normal. The plan checks whether the keep-list prune treats a digest-pulled image (which may list as `<none>` in
   `docker images`) correctly — today it keeps container images by ID, which should still hold.
6. **New structural assertion** in `tests/scripts/profile-deploy-hardening.test.sh`: the compose `postgres` image in
   `setup-profile.sh` ends in `@sha256:[0-9a-f]{64}`. The plan may propose a second assertion that the runbook and
   dry-run use the **same** reference (cheap, and it stops the drill drifting from the box) — owner decides.
7. **One deploy note** for the owner, in the worklog: the first deploy after this change will likely **recreate the
   Postgres container once** (same image bytes, new reference). Data lives on the volume and is untouched. Weekend
   slot (owner's standing rule). Take a backup (or confirm last night's backup marker is fresh) before deploying.

**Out of scope:** the telemetry box (`0386`); the periodic bump (`0388`); a Postgres major upgrade; changing the
prune's strategy.

## Verification steps

1. `bash tests/scripts/profile-deploy-hardening.test.sh` passes, including the new assertion. **Negative check:**
   with the compose line temporarily put back to `postgres:16-alpine`, the new assertion **fails** (show both runs in
   the worklog, then restore).
2. `grep -rn 'postgres:16-alpine' setup-profile.sh tests/ ai-agents/knowledge-base/profile-backup-restore-runbook.md`
   returns **nothing** (the bare moving label is gone; the locked form `postgres:16.15-alpine@sha256:…` does not
   match this pattern). The prune comment's reworded text must not reintroduce it either.
3. The four references are byte-identical (one `grep -o` over the four files shows a single distinct value).
4. `setup-profile.sh` still has exactly four `compose_rendered=` substitution lines (no fifth).
5. The digest in the file equals the one read from the box in step 2 (quote the box output in the worklog, digest
   only — no hostnames, IPs or credentials).
6. `npm test` green (the shell-harness wrapper runs the hardening harness).
7. If Docker plus the dry-run tools are available: `npm run test:scripts:docker` passes (it now pulls by digest).
   If not, say so in the worklog — do not mark it passed.
8. The production check is **not** part of this task — it is `0385`, run after the weekend deploy.

## Notes

- **Depends on:** nothing
- **Blocks:** 0385, 0388
- **Why its own task.** Different box, different script, different deploy command from the telemetry lock (`0386`);
  each can be built, tested and deployed alone. The quarterly bump (`0388`) needs both locks to exist first.
- **Related:** [`0219`](../0219-profile-p4-operability-log-rotation-prune-uptime-backup-freshness/brief.md) — where the
  incident is recorded and where this fix direction was left open. `0282` (the R3 substitution residual). `0275`
  (restore proven against the moving label — the drill should keep using the same image as the box).
- **Unverified side notes (carried from the architect, not checked):**
  - The stray `postgres:16` image (642 MB) pulled during `0219`'s W5 — the owner was told to remove it; **removal not
    confirmed.** `0385` checks it.
  - Why W3's `up -d postgres` did **not** recreate the DB but W10's systemd `compose up` **did** is unexplained.
    Moot once the reference is locked; not to be chased here.
- **Deploy:** the owner's, in a weekend slot. Committed ≠ deployed.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
