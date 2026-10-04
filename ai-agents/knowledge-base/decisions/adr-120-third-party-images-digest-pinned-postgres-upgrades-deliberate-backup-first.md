# ADR-120: Third-party images on the profile and telemetry boxes are digest-pinned — Postgres upgrades are deliberate and backup-first, never automatic

- **Status:** proposed — **the decision itself is owner-ruled** (2026-10-04, see *Deciders*); what is
  pending is the owner's sign-off on **this text**. Promote to `accepted` in place, per
  `decisions/README.md` § *Immutability starts at `accepted`*. Left `proposed` because the owner has not
  read these words, and a `proposed` body can still be corrected without a superseding ADR.
- **Date:** 2026-10-04
- **Deciders:** Owner (Mark Dolbyrev). Three rulings, all given live via `AskUserQuestion` in the
  `fkit lead` session on 2026-10-04 and relayed by `fkit-lead`:
  - **Record it:** asked *"Write down the rule as a decision record (ADR): 'images on the profile box are
    locked; Postgres upgrades are deliberate, backup first'?"*, the owner chose **"Yes, record it
    (Recommended)"**.
  - **The fix:** option (b), digest-pin, chosen (*"Yes, file a task"*).
  - **Scope:** **"Include telemetry too (Recommended)"** — the same fix applies to the telemetry box's
    moving Postgres and Redis tags. Reminder cadence: **"Quarterly backlog item (Recommended)"**.
  - **Version-tagged telemetry images too** (a follow-up ruling, same session, after this ADR's first
    draft): asked *"The telemetry server has 3 more programs (ClickHouse, Uptrace, the OTel collector) on
    exact version labels — not moving, so low risk. Lock those 3 too, so the rule is simply 'everything is
    locked'?"*, the owner chose **"Lock those 3 too (Recommended)"** — option text: *"Same task, tiny extra
    work. The rule stays simple: every outside program on both servers is locked to exact bytes."*

  **Provenance, stated exactly so it is not overstated:** the question that authorised *this ADR* named
  only the **profile box**. The **telemetry** box is in this ADR's scope because of the **separate** scope
  ruling above, not because the ADR question named it. The three **version-tagged** telemetry images are
  in scope because of the follow-up ruling; the first draft had left them as an open question. Drafted by `fkit-architect` (spawned by
  `fkit-lead`), which heard none of the rulings first-hand. Implementing tasks are being filed by the
  producer, 2026-10-04 (IDs not seen by the architect at time of writing).

## Context

Both boxes run third-party images from **moving tags** — tags whose content the publisher changes under
the same name (verified against the code 2026-10-04):

| Box | Service | Image reference | Moves? |
|---|---|---|---|
| profile | Postgres (holds all profile/XP data) | `postgres:16-alpine` — `setup-profile.sh:1018` | **yes** — every 16.x minor and Alpine rebuild |
| telemetry | Postgres (Uptrace metadata) | `postgres:17-alpine` — `setup-telemetry.sh:565` | **yes** |
| telemetry | Redis (Uptrace cache) | `redis:7-alpine` — `setup-telemetry.sh:581` | **yes** |
| telemetry | ClickHouse, Uptrace, OTel collector | exact version tags — `setup-telemetry.sh:542`, `:590`, `:608` | rarely (a version tag *can* be re-pushed, but in practice is not) |

**How the profile box upgrades silently today.** Every profile deploy runs `docker compose pull`
(`setup-profile.sh:1192`), which pulls *every* service in the compose file — including Postgres — and then
`docker compose up -d postgres` (`setup-profile.sh:1199`) recreates the database container if the tag now
points at a newer image. So an ordinary **app** deploy can also upgrade the **database**, with no one
choosing to, no backup taken first, and no record of which Postgres build ran before.

Three things make that worse than "it's just a minor bump":

1. **The automatic rollback does not cover Postgres.** The health-gate rollback only swaps the
   `profile-api` image back to the previous `@sha256` digest (`setup-profile.sh:1222-1249`, *"Rolling back
   profile-api to the last known-good image"*). Postgres is never rolled back.
2. **The old Postgres image is deleted after a successful deploy.** The keep-list prune keeps only images
   in use plus the current/previous **profile** image, and removes *"a superseded postgres:16-alpine
   included"* (`setup-profile.sh:1475`). After a silent upgrade, the previous Postgres build is gone from
   the box.
3. **The app image already has the opposite rule.** The profile API is deployed and rolled back **only by
   immutable `@sha256` digest** — the K2 invariant (`ai-agents/knowledge-base/profile-deploy-hardening-postmortem-2026-06-19.md`
   § *K2 — Deploy & roll back by immutable @sha256 digest*), enforced box-side by *"Refusing to deploy a
   mutable tag"* (`setup-profile.sh:171-174`) and stated as policy in `docs/security/registry-image-policy.md`
   § *Deploy Rules* ("Tags are useful operator labels, but they are not the trust anchor"). The database —
   the one component holding data we cannot rebuild — is the only part of the stack still on a moving tag.

**Telemetry** has the same exposure by a different path: its setup does not run `compose pull`
(`setup-telemetry.sh:632` only `up`s), so the moving tags resolve to *whatever is current* whenever the
image is absent locally — a fresh setup, a rebuilt box, or a manual pull. Same unrecorded, unchosen
upgrade; lower stakes, because telemetry data is not player data.

**What lowers the risk, and why this is still worth a rule:** neither Postgres is internet-reachable. The
profile Postgres publishes only on loopback (`setup-profile.sh:1031-1033`, *"Bound to loopback only"*);
the telemetry Postgres and Redis publish no ports at all (`setup-telemetry.sh:564-588`). So the main
argument *for* moving tags — security patches arriving automatically — is weak here, while the cost of an
unplanned database change is real.

## Decision

1. **Every third-party image on the profile and telemetry boxes is pinned by digest**
   (`image: <name>:<tag>@sha256:<64-hex>`, the tag kept as a human-readable label) — no exceptions for
   images that are "probably stable". Today that is six images: profile `postgres`
   (`setup-profile.sh:1018`); telemetry `postgres` and `redis` (`setup-telemetry.sh:565`, `:581`), whose
   tags move; and telemetry ClickHouse, Uptrace and the OTel collector (`setup-telemetry.sh:542`, `:590`,
   `:608`), whose exact version tags rarely move but can. Any third-party image added to either box later
   is pinned the same way from day one. This extends the K2 rule — already law for our own
   app image — to third-party images: **the box runs a digest someone chose, never whatever a tag means
   today.**
2. **A Postgres upgrade is a deliberate, separate change — never a side effect of an app deploy.** Each
   upgrade, minor or patch:
   - **Backup first** — a fresh encrypted backup taken and confirmed uploaded *before* the switch.
   - **Restore drill against the new image** — restore that backup into a throwaway container running the
     **new** digest and check it, the same way task `0275` proved the restore path, before the live switch.
   - **Weekend slot** — scheduled like any other deploy (owner ruling 2026-09-29), never urgent-by-default.
   - **Verify after** — `SELECT version()` shows the intended build, and the profile server's `/ready`
     returns 200 (it is DB-backed).
3. **A quarterly reminder** (backlog item) prompts a look at whether the pinned digests are behind on
   security fixes — the replacement for the patches moving tags used to deliver silently.
4. **A Postgres major-version upgrade (e.g. 16 → 17) is out of scope of this routine** — it changes the
   on-disk data format and needs a dump/restore or `pg_upgrade` plan of its own. Treat it as a separate
   project with its own task.

## Options considered

- **(b) Digest-pin third-party images; upgrades become deliberate (chosen).** Fixes the root cause — the
  moving tag — and matches the rule the app image already follows. Cost: no more silent security patches,
  covered by the quarterly reminder.
- **(a) Keep the previous Postgres image in the keep-list prune (rejected).** Would preserve a rollback
  image, but does **not** stop the moving tag from upgrading the database on the next deploy. It treats a
  symptom (the old image being deleted) and leaves the unchosen upgrade in place.
- **(a) + (b) together (rejected — no added value).** Once the digest is pinned, Postgres's image never
  changes during a normal deploy, so it is always "in use" and the prune never removes it. During a
  deliberate upgrade, the backup + restore drill is the safety net, not a retained image. Extra prune
  logic would add code with nothing to protect.
- **Keep moving tags, auto-update (implicitly rejected — the status quo).** Gets patches for free, at the
  price of unplanned, un-backed-up, un-rolled-back database changes during unrelated deploys.

## Consequences

- **Positive:**
  - A deploy changes only what it means to change. Database upgrades become visible, planned events.
  - The box config records exactly which Postgres/Redis build runs — reproducible on a rebuild.
  - One rule across the stack: our image and third-party images are both pinned by digest.
- **Negative / costs:**
  - **No silent security patches.** Someone must bump digests by hand; the quarterly reminder is the only
    thing that prompts it. If that reminder is skipped, the images age.
  - Each upgrade costs a small ritual (backup, drill, weekend slot, verify).
  - **The automatic rollback still does not cover Postgres.** Pinning stops *unplanned* changes; it does
    not add a database rollback. For a deliberate upgrade, the backup + restore drill is the recovery path.
  - A digest is unreadable to a human — always keep the tag alongside it as a label.
- **Residual risks / "re-raise only if":** treat any review finding of the shape *"why not auto-update the
  database image / why not use a moving tag?"* as **closeout, not a new defect**, unless one of these holds:
  - **Postgres (or Redis) on either box becomes reachable beyond loopback / the compose network** — the
    "not internet-reachable" premise that makes manual patching acceptable is gone.
  - **A CVE needs faster patching than manual digest bumps allow** — e.g. an actively exploited flaw
    reachable in our setup, where waiting for the next weekend slot is too slow.
  - **An automated update path with a built-in pre-upgrade backup is adopted** — then automation no longer
    carries the risk this ADR exists to stop.

## Related

- `setup-profile.sh:1017-1048` — profile Postgres service; `:1192`, `:1199` — pull + recreate;
  `:1222-1249` — profile-api-only rollback; `:1465-1503` — keep-list prune.
- `setup-telemetry.sh:538-616` — telemetry compose services; `:632` — startup.
- `ai-agents/knowledge-base/profile-deploy-hardening-postmortem-2026-06-19.md` § K2 — the app-image digest rule this extends.
- `docs/security/registry-image-policy.md` § *Deploy Rules* — "tags are not the trust anchor".
- ADR-117 (`adr-117-server-deploy-version-names-base-server-n.md`) — the box deploys the app by `@sha256` digest.
- Task `0287` (backlog) — the profile app-image digest check is not anchored against a newline-bearing
  value; whatever validates the new third-party digests should not copy that weakness.
- Task `0275` (done) — the restore drill this ADR's upgrade routine reuses.
- Tasks being filed 2026-10-04 by the producer: the digest-pin fix (profile + telemetry) and the quarterly
  reminder.
