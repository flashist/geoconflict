# P4 — Operability on the Profile Box: Log Rotation, Image Prune, Outside Uptime Check, Backup-Freshness Reader (task 0219)

**Source**: `ai-agents/tasks/done/0219-profile-p4-operability-log-rotation-prune-uptime-backup-freshness/brief.md` (`plan.md`, `review.md`, `worklog.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 9, rank 2 (moved in from Sprint 8 at its close, 2026-10-16) / task `0219` / phase P4 of epic `0213`

> ✅ Closed 2026-10-20 by a spawned `fkit-producer` on the owner ruling **"Yes, close all 5 (Recommended)"** (with
> `0385`, `0213`, `0452`'s and `0449`'s neighbours). Item (4) met by `0385` passing; the V8 cross-references written
> into `0034` item 5 and `0182` §8; V9 secret grep clean. This page is a **summary** — the long history of this task
> (the 2026-09-19 split, the 2026-10-09 un-pause, every drill) lives on [[systems/player-profile-store]].

## Goal

Close four verified operability gaps on the profile box: **G1** no container log rotation (the failure class that
already took down game prod), **G2** no image prune, **G3** no outside uptime check and nobody reading the certificate
renewal log, **G4** nobody reading the `last-backup.json` freshness marker.

## Key Changes

- **Built and reviewed 2026-09-13** (all of G1–G4, code + docs); **deployed 2026-09-26**. Rotation observed (B5/V1).
- Each profile deploy now prunes images with a keep-list (current + rollback + the Postgres image in use). The
  Postgres-image hazard found here (B6/V2) became `0384`, proven on the box by `0385`
  ([[tasks/profile-postgres-digest-lock]]).
- A daily checker (`profile-checks.sh`) reads the renewal log and the backup marker and also alerts on disk use
  (`0274`); two outside uptime monitors watch `/health` and `/ready`.
- **Ownership shift:** G3/G4 were deferred 2026-09-19 (re-affirmed 2026-10-02), then **un-paused 2026-10-09** (*"Yes,
  un-pause in Sprint 8 (Recommended)"*).

## Outcome

- **Every alarm was fired on purpose and seen arriving** (drills B7–B10, 2026-10-15/16, owner-run, relayed): failed
  renewal, service stopped, stale backup records, missing heartbeat — each cleared on a normal run. B7(b) was
  **owner-skipped, not passed**.
- ⚠️ **Alerts reach the owner by email only.** Owner ruling 2026-10-15: email-only Better Stack alerts are accepted; the
  Telegram part was **waived**. The upgrade question is `0466` (Backlog board). The SSL-expiration check is not on the
  free plan.
- ⚠️ The heartbeat's 3 h grace was set by the owner and **not re-read** by an agent.
- This closed the epic's last open item — see [[tasks/profile-clean-slate-rebuild-epic]].

## Related

- [[systems/player-profile-store]] — the box, and this task's full history
- [[tasks/profile-clean-slate-rebuild-epic]] — epic `0213`, item 8 of which this met
- [[tasks/profile-postgres-digest-lock]] — `0384`/`0385`, the prune fix and its proof
- [[systems/alert-delivery]] — the alert paths; Better Stack alarms are email-only
- [[tasks/profile-weekly-backup-copy-verified]] — task `0241`, the weekly-copy half of the freshness check
- [[tasks/telemetry-cert-expired-renewal-cron]] — the expired-certificate incident this class of alarm guards against
- [[decisions/sprint-9]] — the board (rank 2)
- [[decisions/sprint-8]] — where most of the drill work ran
