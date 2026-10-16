# Worklog — 0385

## 2026-10-16 — before the deploy (mid-week, owner's call)

**Context.** Owner ruling 2026-10-16, live `AskUserQuestion` in a Claude Code session: *"Now, I'll run them"* — profile
and game prod deployed on Friday instead of the Saturday slot, to finish Sprint 8. Owner ran this read-only batch on the
profile box as root (~12:00Z) and pasted the output; the agent recorded it. Digests shortened; no host, address or
secret recorded.

| Item | Before the deploy |
|---|---|
| Postgres container image (as named in compose) | `postgres:16-alpine` (tag, not digest) |
| Postgres image ID on box | `721873c34ceb…` — same leading 12 hex as the digest locked in `setup-profile.sh` (`sha256:721873c34ceb…`) |
| Postgres container started | 2026-10-16T07:31:26Z (this morning's restart — the `0219` B8 service-stop drill) |
| profile-api image (rollback target) | `@sha256:08c6d327ae7e…`, started 2026-10-16T07:31:32Z |
| `schema_migrations` rows | **7** |
| `server_version` | **16.15** |
| Last backup marker | `last-backup.json` 2026-10-16T02:30Z, `exit_status` 0 → fresh, success ✔ (precondition met) |
| Postgres images on box | only `postgres:16-alpine` `721873c34ceb` 420 MB |

Observations, not yet pass/fail:
- **Step 7 (stray image) — answered: no.** The 642 MB `postgres:16` image from `0219`'s W5 is **not** on the box any more.
- The box already runs the same image content as the lock (ID matches the locked digest's prefix, version already
  16.15); the deploy changes how compose **names** it (tag → digest). Whether that recreates the container: step 4,
  after the deploy.

## 2026-10-16 — the deploy and the after-checks

**Deploy:** `npm run deploy:profile`, run by the owner ~12:10–12:15Z, mid-week by owner ruling (above). Deployed
version **`0.0.164-profile.2`** (git tag pushed, commit `84d322e`). Deploy output (owner-pasted): the deploy-time
backup + smoke check passed (`backup OK`, *"candidate promoted; encrypted object written + verified off-box"*);
checks installed, `alerting: yes`; name-change digest sent (expected, not an alert); SSH alert agent up to date.
Public `/health` → 200 `"status":"ok"`, version `0.0.164-profile.2`; `/ready` → 200 (agent-checked from the
workstation, ~12:20Z).

**After-checks** — owner ran the read-only batch on the box (~12:25Z) and pasted the output; agent recorded it.

| Step | Result | Pass? |
|---|---|---|
| 1. Image | the running Postgres container names exactly the locked `postgres:16.15-alpine@sha256:721873c34ceb…` (string compare in the batch: `MATCHES LOCK`) | ✅ |
| 2. Version | `16.15` | ✅ |
| 3. Data intact | `schema_migrations` **7** before → **7** after; `/ready` 200 | ✅ |
| 4. Recreate seen | **yes, once** — Postgres started 2026-10-16T12:12:44Z (was 07:31:26Z), `healthy`. Matches `0384`'s "likely once". | (observation) |
| 5. Backups still work | ⏳ **pending.** The marker is still 2026-10-16T02:30Z / exit 0 — the deploy's own backup (12:13Z, off-box verified) does not rewrite the nightly marker. The **next nightly** marker is due 2026-10-17 ~02:30Z. | ⏳ |
| 6. Prune kept it | after the deploy's prune, the locked image is present: ID `721873c34ceb`, digest `sha256:721873c34ceb…` | ✅ |
| 7. Stray image | the 642 MB `postgres:16` is **not** on the box (answered before the deploy) | (observation) |
| 8. Optional restart | not run yet — owner's call | — |

**Rollback target** (if ever needed): profile-api `@sha256:08c6d327ae7e…` (the image before this deploy). Postgres
rollback would be a hand revert (brief); not needed — every check passed.

**Step 8 — skipped by the owner.** Live `AskUserQuestion` 2026-10-16, verbatim *"Skip it (Recommended)"* (step 1
already shows the lock; a restart costs about a minute of profile downtime and loses XP credits in that minute).

**Where 0385 stands:** steps 1, 2, 3, 6 pass; 4 and 7 recorded; 8 skipped by the owner. **Only step 5 is left** — the
next nightly backup marker (due 2026-10-17 ~02:30Z) must be fresh and report success.
