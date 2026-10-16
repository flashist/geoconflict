# ADR-120: Third-Party Images on the Profile and Telemetry Boxes Are Digest-Pinned — Postgres Upgrades Are Deliberate and Backup-First

**Date**: 2026-10-04
**Status**: proposed

> 📌 **2026-10-16 sync, third run (`29811f0`):** §1 (profile Postgres digest-pinned, `0384`) is **deployed** — profile `0.0.164-profile.2`, 2026-10-16;
> the running container names the locked reference (`0385` step 1, owner-run, not re-verified by me); `0385` waits only on
> the next nightly backup marker. See [[tasks/profile-postgres-digest-lock]]. The ADR's status is still `proposed` — the
> source ADR did not change in this window.

> Source: `ai-agents/knowledge-base/decisions/adr-120-third-party-images-digest-pinned-postgres-upgrades-deliberate-backup-first.md`
>
> ⚠️ **PROPOSED — NOT ACCEPTED. Read this before citing it.** The **decision itself is owner-ruled** (2026-10-04, live
> via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`). What is still pending is the owner's
> sign-off on **the ADR's wording** — the owner has not read the text. It is to be promoted to `accepted` in place;
> until then its body may still be corrected without a superseding ADR. Drafted by `fkit-architect`, which heard none
> of the rulings first-hand.
>
> **Implementing tasks (all `🔲 Backlog`, unscheduled, on [[decisions/sprint-backlog]]; none built):** `0384` (profile
> box: lock Postgres by digest) + its verify `0385`; `0386` (telemetry box: lock all five outside images) + its verify
> `0387`; `0388` (quarterly Postgres minor-release check, first instance).

> 📌 *2026-10-15 sync (`930048b`):* **§1 is BUILT for the profile box — NOT deployed.** `0384` closed `✅ Done
> (agent-closed — not owner-verified)` ([[tasks/profile-postgres-digest-lock]]): `setup-profile.sh` now names
> `postgres:16.15-alpine@sha256:<index digest>` — the digest the box already ran, so the deploy changes no Postgres
> bytes — and the runbook drill plus both dry-run images carry the same reference; harness checks A1–A4 fail if any copy
> drifts or any compose image is unpinned. Committed in `d6458d9`; no deploy tag contains it at this sync. `0384` and
> `0385` moved to [[decisions/sprint-8]] (ranks 54/55, owner ruling *"Build it as 0384 (Recommended)"*); they now carry
> `0219`'s B6/V2 item. **§2's procedure is written** in the runbook ("Updating the pinned Postgres image"). Still
> unbuilt: `0386`/`0387` (telemetry), `0388`. ADR status unchanged — still `proposed`. ⚠️ The *Context* anchor
> `image: postgres:16-alpine` below no longer matches `setup-profile.sh` — it describes the state before `0384` (kept as
> history).

## Context

Both server boxes ran third-party images from **moving tags** — names whose content the publisher changes:

| Box | Service | Image | Moves? |
|---|---|---|---|
| profile | Postgres (all profile / XP data) | `postgres:16-alpine` | yes — every 16.x minor and Alpine rebuild |
| telemetry | Postgres (Uptrace metadata) | `postgres:17-alpine` | yes |
| telemetry | Redis (Uptrace cache) | `redis:7-alpine` | yes |
| telemetry | ClickHouse, Uptrace, OTel collector | exact version tags | rarely (a version tag *can* be re-pushed) |

(Anchors, verified 2026-10-04: in `setup-profile.sh` search `image: postgres:16-alpine`; in `setup-telemetry.sh`
search `image: postgres:17-alpine`, `image: redis:7-alpine`, `image: uptrace/uptrace`.)

**How the profile box upgraded itself.** A profile deploy runs `docker compose pull` — which pulls **every** service,
Postgres included — and then recreates the database container if the tag now means a newer image. So an ordinary
**app** deploy could also upgrade the **database**, unchosen, with no backup first and no record of the old build.
It **did happen**: finding **F-C** of the 2026-09-26 window — an unplanned upgrade to **PostgreSQL 16.15**, data
intact, filed on `0219` with "no fix decided" ([[systems/weekend-deploy-window]], [[systems/player-profile-store]]).

Three things make it worse than "just a minor bump":
1. **The automatic rollback does not cover Postgres** — it swaps only the `profile-api` image back (search
   `Rolling back profile-api to the last known-good image`).
2. **The old Postgres image is deleted after a successful deploy** by the keep-list prune.
3. **The app image already follows the opposite rule** — deployed and rolled back only by immutable `@sha256` digest
   (the K2 invariant in `ai-agents/knowledge-base/profile-deploy-hardening-postmortem-2026-06-19.md`; the box refuses a
   mutable tag — search `Refusing to deploy a mutable tag`). The database was the only part still on a moving tag.

The telemetry box has the same exposure by another path: it does not pull, so moving tags resolve to whatever is
current whenever the image is missing (fresh setup, rebuilt box, manual pull). Lower stakes — not player data.

**Why automatic patches are not much of a loss here:** neither Postgres is internet-reachable — the profile one is
bound to loopback only, the telemetry Postgres and Redis publish no ports.

## Decision

1. **Every third-party image on both boxes is pinned by digest** (`<name>:<tag>@sha256:<digest>`, the tag kept as a
   human label) — **no exceptions**: six images today (profile Postgres; telemetry Postgres, Redis, ClickHouse, Uptrace,
   OTel collector), and any image added later is pinned from day one. Extends K2 from our own image to third-party
   images: *the box runs a digest someone chose, never whatever a tag means today*.
2. **A Postgres upgrade is a deliberate, separate change — never a side effect of an app deploy.** Each upgrade:
   **backup first** (fresh, encrypted, confirmed uploaded) → **restore drill against the new image** in a throwaway
   container, the way [[tasks/profile-backup-restore-reproof-006]] (`0275`) proved the path → **weekend slot** →
   **verify after** (`SELECT version()` shows the intended build; the profile server's DB-backed `/ready` returns 200).
3. **A quarterly reminder** (a backlog item) prompts a check whether the pinned digests are behind on security fixes.
4. **A Postgres major upgrade (e.g. 16 → 17) is out of scope** — on-disk format change, its own project and task.

**Scope provenance, stated exactly:** the question that authorised *this ADR* named only the **profile box**. The
telemetry box is in scope by a **separate** ruling (*"Include telemetry too (Recommended)"*); the three version-tagged
telemetry images by a **follow-up** ruling (*"Lock those 3 too (Recommended)"*). The fix shape (option b) was ruled
*"Yes, file a task"*; the cadence *"Quarterly backlog item (Recommended)"*.

**Options rejected:** (a) keep the previous Postgres image in the prune — treats the symptom, leaves the unchosen
upgrade; (a) + (b) — no added value once pinned; keep moving tags (status quo) — free patches at the price of
unplanned, un-backed-up, un-rolled-back database changes.

## Consequences

- **Positive:** a deploy changes only what it means to; database upgrades become visible, planned events; the box
  config records exactly which build runs (reproducible on a rebuild); one rule across the stack.
- **Costs:**
  - **No silent security patches** — digests are bumped by hand; the quarterly reminder is the only prompt. Skip it
    and the images age.
  - Each upgrade costs a small ritual (backup, drill, weekend slot, verify).
  - ⚠️ **The automatic rollback still does not cover Postgres.** Pinning stops *unplanned* changes; it adds no database
    rollback. For a deliberate upgrade, backup + restore drill is the recovery path.
  - A digest is unreadable to humans — always keep the tag beside it.
- **Re-raise only if** (otherwise *"why not auto-update the database image?"* is closeout, not a new defect):
  Postgres or Redis on either box becomes reachable beyond loopback / the compose network; a CVE needs faster patching
  than manual bumps allow; or an automated update path with a built-in pre-upgrade backup is adopted.
- ⚠️ **Open owner questions sit in `0388`'s brief, unanswered** (the producer had no owner channel): which images the
  quarterly check covers (recommended: Postgres on both boxes + Redis bumped, the other three report-only, because an
  Uptrace bump re-opens a schema check); whether to accept up-to-three-months-late out-of-cycle security releases
  (recommended: accept for now); and the recurrence mechanism (recommended: one task per quarter, the next filed at
  close).
- ⚠️ Backlog task `0287` (the app-image digest check is not anchored against a newline-bearing value) — whatever
  validates the new digests should not copy that weakness.

## Related

- [[systems/player-profile-store]] — the profile box and its Postgres; F-C, the unplanned 16.15 upgrade
- [[systems/weekend-deploy-window]] — where F-C was observed (W3 prune + W10 restart, 2026-09-26)
- [[systems/telemetry]] — the telemetry box's five outside images
- [[tasks/profile-backup-restore-reproof-006]] — task `0275`, the restore drill the upgrade routine reuses
- [[decisions/adr-117-server-deploy-version-names]] — the box deploys our own app by `@sha256` digest
- [[decisions/sprint-backlog]] — where `0384`–`0388` were filed
- [[tasks/profile-postgres-digest-lock]] — task `0384`, §1 built for the profile box (2026-10-15, not deployed)
- [[decisions/sprint-8]] — `0384`/`0385` moved there 2026-10-15
