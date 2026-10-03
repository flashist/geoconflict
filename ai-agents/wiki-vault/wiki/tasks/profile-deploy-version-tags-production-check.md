# Verify `0355` in Production — the Profile Deploy Is Tagged With Its Version (task 0358)

**Source**: `ai-agents/tasks/done/0358-verify-0355-in-production-the-profile-deploy-is-tagged-with-its-version/brief.md` (its `worklog.md` read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 8, rank 4 (placed at the top on the build/verify-split rule, then moved down by later placements) / task `0358`

> ✅ **Closed 2026-10-03** `(agent-closed — not owner-verified)` on the OWNER RULING *"Yes, close both
> (Recommended)"* (live `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer`). **Every
> verification step met** (1–4, 7, 8; 5 and 6 not needed).
>
> ⚠️ **Who saw what:** the deploy and some readings are the owner's; `fkit-lead` ran the `/health` check, read the
> deploy record, and read Uptrace through the owner's Chrome (owner-approved, read-only); the producer did the tag
> and registry look-ups. The marker records only that an agent made the **close**.
>
> 🚨 **Standing rule this close does NOT end:** **no second profile deploy and no profile box restart until `0297`
> §1 has read `0309`'s log line after a real purchase** (see [[tasks/hmac-construction-log-label]]).
>
> ⛔ Version names, commits, short digests and yes/no only — no host, IP, URL, registry path or credential.

## Goal

The verify half of [[tasks/profile-deploy-version-tags]] (`0355`), filed 2026-09-30 on the owner's standing
build/verify-split rule: `0355` closed on local proof only (harness 615 checks, a fake registry, a local image run),
so **no real registry name, git tag or deploy had ever happened**. This task checks the real effect after the first
weekend profile deploy that carried it. Naming rule: [[decisions/adr-117-server-deploy-version-names]].

## Key Changes

Nothing built — read-only checks after the owner's deploy in the 2026-10-03 window
([[systems/weekend-deploy-window]]):

1. **Name printed, deploy succeeded, tag result** — name **`0.0.156-profile.1`** (*"Deploy version:
   0.0.156-profile.1 (package.json 0.0.156, commit f712263)"*); deploy record block 10:02:38 UTC,
   `validation_result=ok`, `git_tag=pushed`. The base is `0.0.156` because the game deploy bumped the version first
   in the same slot — **correct per the brief**, not a fault.
2. **`/health` reports the name** — `version` `0.0.156-profile.1`, `commit` `f712263…`.
3. **Annotated tag on origin at the deployed commit; registry name at the deployed digest** — tag present,
   annotated, points at `f712263`; registry name `:0.0.156-profile.1` resolves to `sha256:b26113a8…df32`, the digest
   in the deploy record. ✔️ *Wiki re-check this run: the local tag `0.0.156-profile.1` is an annotated tag object
   pointing at `f712263`.*
4. **Telemetry `service.version`** — first recorded as **not recorded**, then met later the same day (~10:35 UTC):
   Uptrace metric `geoconflict_profile_http_duration` grouped by `service_version` shows `1.0.0` (the old image's
   placeholder) up to ~10:03 UTC, then `0.0.156-profile.1`, with a small gap at the container recreate.
5. / 6. Hand tag push and new-defect filing — not needed.
7. **`0297` §1 ordering respected — so far.** This was the first tagged profile deploy and the first carrying
   `0309`'s log line (`26b85c0` is an ancestor of `f712263`); no second profile deploy has happened. A standing
   condition, true only while it holds.
8. No host / IP / URL / registry path / credential in the record.

## Outcome

- **Result: verification passed.** The profile server now has a real, checkable version in all four places: registry
  name, `/health`, annotated git tag, local deploy record — plus telemetry `service.version`.
- **Rollback target after this deploy:** the S2-or-later profile image to keep as `0340`'s future rollback target is
  now `sha256:b26113a8…df32` (`0.0.156-profile.1`); the previous image was `sha256:75fd196a…28e0`.
- **Also seen (not steps of this task):** profile error lines 0 at 15 and 40 minutes; migrations all *"skip (already
  applied)"*.
- **Cost of the deploy, recorded elsewhere:** during the container recreate one XP award was **lost, not queued**
  (502s on `credit`) — the standing cost of [[decisions/adr-101-fail-soft-xp-crediting]], not a defect of this task.

## Related

- [[tasks/profile-deploy-version-tags]] — task `0355`, the build this verifies
- [[tasks/telemetry-deploy-version-tags-production-check]] — task `0363`, the telemetry twin, closed the same day
- [[decisions/adr-117-server-deploy-version-names]] — the naming rule now seen working for real
- [[systems/weekend-deploy-window]] — the 2026-10-03 window this check ran in
- [[tasks/hmac-construction-log-label]] — task `0309`: its log line shipped in this deploy; no second profile deploy until `0297` §1 reads it
- [[decisions/sprint-8]] — the board (rank 4)
- [[decisions/adr-101-fail-soft-xp-crediting]] — why the award dropped during the recreate is lost, not queued
- [[decisions/sprint-7]] — the board where the build task `0355` closed
