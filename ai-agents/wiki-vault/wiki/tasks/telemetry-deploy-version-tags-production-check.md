# Verify `0356` in Production — the Telemetry Deploy Is Tagged With Its Version (task 0363)

**Source**: `ai-agents/tasks/done/0363-verify-0356-in-production-the-telemetry-deploy-is-tagged-with-its-version/brief.md` (its `worklog.md` read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 8, rank 3 (placed at the top on the build/verify-split rule, then moved down by later placements) / task `0363`

> ✅ **Closed 2026-10-03** `(agent-closed — not owner-verified)` on the OWNER RULING *"Yes, close both
> (Recommended)"* (live `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer`). **Every
> verification step met** (1–4 and 7; 5 and 6 not needed).
>
> ⚠️ **Who saw what:** the deploy and the box-marker reading are the owner's; `fkit-lead` read the local deploy
> record, checked the tag, and read the Uptrace UI through the owner's Chrome (owner-approved, read-only); the
> producer re-read the record and checked the tag type. The marker records only that an agent made the **close**.
>
> ⛔ Version names, commits and yes/no only — no host, IP, URL or credential.

## Goal

The verify half of [[tasks/telemetry-deploy-version-tags]] (`0356`), filed 2026-10-01 on the owner's standing
build/verify-split rule. `0356` closed on local proof only (harness 740 checks, full `npm test`), so **no real
telemetry deploy, git tag or box marker had ever happened**. The telemetry box runs only third-party images, so the
name means *"which commit of our telemetry setup scripts is live"*; it lives in three places — an annotated git tag,
a version marker file on the box, and the local deploy record. **The Uptrace UI does not show it.** Naming rule:
[[decisions/adr-117-server-deploy-version-names]].

## Key Changes

Nothing built — read-only checks after the owner's telemetry deploy, the first step of the 2026-10-03 window
([[systems/weekend-deploy-window]]):

1. **Name, date, success, tag result** — **`0.0.155-telemetry.1`**, deployed 2026-10-03 (deploy record block
   09:04:37 UTC), `validation_result=ok`, `git_tag=pushed`. ⚠️ The printed `Deployed version: …` console line itself
   was not relayed; the record carries the same values.
2. **Annotated tag on origin at the deployed commit** — present, annotated, points at **`204f931`**. ✔️ *Wiki
   re-check this run: the local tag is an annotated tag object pointing at `204f931`.*
3. **Box marker, local record and tag agree** — marker `version=0.0.155-telemetry.1`, `commit=204f931…`; the record's
   newest block the same; tag → `204f931`. Neither marker line `unknown`.
4. **Uptrace still answers** — first **not recorded** (the alert probe's *"channel state: delivering"* at 09:06:52
   UTC shows the alert relay works, **not** that the UI loads), then met later the same day (~10:35 UTC): Uptrace
   Logs → "By service", last hour, all after the deploy — game server 62 info/min, 2.3 warn/min, 0.05 error/min;
   the client service also present; 116 log/min total.
5. / 6. Hand tag push and new-defect filing — not needed.
7. No host / IP / URL / credential in the record.

## Outcome

- **Result: verification passed.** "Which telemetry setup is live?" is now answerable from the box itself, the
  deploy record, and git — all three agree.
- **The base is `0.0.155`, not `0.0.156`:** the telemetry deploy ran first in the window, before the game deploy
  bumped `package.json` (the name reads `package.json` at the deployed commit).
- ⚠️ Telemetry has **no config-parity guard** — there was no guard output to record for this deploy (the lead first
  asked for one by mistake and corrected it).
- A telemetry deploy restarts the Uptrace stack; on 2026-10-03 it ran ~1 h before `0370`'s Step 1 query, which
  found no gap in the stored data ([[tasks/public-lobby-one-minute]]).

## Related

- [[tasks/telemetry-deploy-version-tags]] — task `0356`, the build this verifies
- [[tasks/profile-deploy-version-tags-production-check]] — task `0358`, the profile twin, closed the same day
- [[decisions/adr-117-server-deploy-version-names]] — the naming rule now seen working for real
- [[systems/telemetry]] — the box this versions
- [[systems/weekend-deploy-window]] — the 2026-10-03 window this check ran in
- [[decisions/sprint-8]] — the board (rank 3)
- [[tasks/public-lobby-one-minute]] — task `0367`: its verify `0370` queried the telemetry store an hour after this restart
- [[decisions/sprint-7]] — the board where the build task `0356` closed
