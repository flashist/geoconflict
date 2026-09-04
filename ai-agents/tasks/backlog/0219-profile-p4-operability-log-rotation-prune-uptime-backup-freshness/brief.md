# P4 — Operability on the profile box: log rotation, image prune, an uptime check, and a reader for `last-backup.json`

## ID
0219

## Parent / Epic
[`0213-profile-backend-clean-slate-rebuild`](../0213-profile-backend-clean-slate-rebuild/brief.md)

## Sprint
Sprint 4

## Priority
**High.** ⚠️ **Technically this is easy work. By CONSEQUENCE it is the "outage nobody noticed for
three weeks" class.** Do not let the low technical difficulty set the rank.

⚠️ **The rank is the producer's**; the owner ruled scheduling, not rank.

## Status
🔲 Backlog

## Owner
fkit-coder

## Depends on
[`0215`](../0215-profile-p1-stand-up-the-box/brief.md) (P1) — a box to configure.

## Context

Four gaps, all verified, all on the same box. Each one is individually small; together they are the
difference between a service you operate and a service that fails quietly.

### G1 — 🔴 No container log rotation. This is the class that already took down game prod.

`setup-profile.sh` **never writes `daemon.json`**, and the compose file **declares no `logging:`
block** ⇒ Docker's default **unbounded `json-file`** driver.

`ai-agents/knowledge-base/container-log-retention.md:5-6` says so outright:
> *"The profile and telemetry boxes are not covered here."*

⚠️ **This is the exact mechanism that filled the game production disk** — an unrotated container log
grew until the disk was full and assets began truncating mid-transfer. It is not hypothetical; it has
happened on this project once already, on a different box.

### G2 — No image prune. Storage grows every redeploy.

The previous image is retained for rollback (correctly), but **nothing ever removes older ones**.
`0182:224-227` already records this as a known limitation and says to run a prune periodically —
nothing does. The script logs a disk warning past 60% to a file, and **nothing pages on it**.

### G3 — 🔴 No monitoring or alerting of ANY kind.

- **No OTEL — by design** (`src/profile-server/Logger.ts:5-8`). That is a deliberate choice, not a
  gap to fix by adding OTEL.
- **No external uptime check.** Container healthchecks and systemd auto-restart exist, but **nothing
  off-box observes liveness.** `0182:228-230` already asks for one.
- 🚨 **NOTHING reads `last-backup.json`.** The backup path writes a freshness record and **no
  consumer exists.** Cron mails root **only if an MTA is installed**, and **nothing installs one.**

⚠️ **The compound failure is the point: a backup that stops is INVISIBLE, while the 14-day prune
keeps deleting.** Three weeks later there is no backup and no signal that there ever stopped being
one.

### The precedent to mirror, not reinvent

The game box already solves two of these. **Mirror it:**

| Concern | Existing solution on the game box |
|---|---|
| Docker log rotation | `update.sh:91-92` |
| Image prune | `update.sh:37` / `:102` |

**Do not design something new.** Same shape, applied to the profile box's provisioning.

## What to build

1. **Docker log rotation on the profile box.** Mirror `update.sh:91-92` — a `daemon.json` written by
   `setup-profile.sh`, and/or a `logging:` block in the compose file. ⚠️ **Decide and record which
   layer owns it**, so the next person does not add a second, conflicting one.
2. **Image prune on the profile box.** Mirror `update.sh:37` / `:102`. **Keep the current image and
   the rollback image**; prune older ones.
3. **One external uptime check on `/health`.** Off-box. ⚠️ **"External" is the requirement** — a
   check that runs on the box it is checking observes nothing when the box is down.
   💡 `/ready` also exists (`src/profile-server/Routes.ts:198-207`) — decide explicitly which endpoint
   the check hits and why.
4. **A consumer for `last-backup.json`.** 🚨 **This is [`0034`](../0034-monitoring-alert-bot-phase2/brief.md) item 5** — check that task before building, so this is one
   implementation rather than two. Something must **read the freshness record and raise an alert when
   it goes stale**. ⚠️ **Do not "solve" this by installing an MTA so cron can mail root** — an email
   nobody reads is the same silence with extra steps.
5. **Update `ai-agents/knowledge-base/container-log-retention.md`** so `:5-6` no longer says the
   profile box is uncovered. ⚠️ A document that disclaims coverage after coverage exists is a
   document that will send someone to add a duplicate.

### 🚫 Not in this phase

- Adding OTEL to the profile server. **Its absence is by design** (`Logger.ts:5-8`) — changing that
  is a separate decision, not an operability fix.
- The restore drill and key custody (P3 / `0218`). This task only needs the cron's **output** to
  monitor; proving the restore works is P3's job.
- The full alert-bot build — coordinate with `0033` / `0034` rather than duplicating them.

## Verification steps

1. **Container logs are bounded** — demonstrated by configuration **and** by an observed rotation or
   an enforced size cap, not by reading the config file alone.
2. **Image prune runs** and leaves current + rollback intact. ⚠️ **Prove the rollback image
   survives** — a prune that breaks rollback is worse than no prune.
3. **The uptime check fires on a real outage.** 🚨 **Stop the service deliberately and observe the
   alert arrive.** ⚠️ **An alert that was never seen firing is not a verified alert** — this is the
   same standard `0201` applies to its gate, and for the same reason.
4. **The backup-freshness consumer alerts on a stale record.** Deliberately age or withhold the
   record and observe the alert. Then restore normal operation and observe it clear.
5. **Alerts reach a human who will actually see them** — the destination is named in the worklog.
   ⚠️ *"It writes to a log file"* does not satisfy this task; that is the state it exists to end.
6. **`container-log-retention.md` reflects reality**, and its `:5-6` disclaimer is corrected.
7. **`0034` item 5 is either implemented here or explicitly cross-referenced** so it is not built
   twice.
8. 🔒 **No values in any alert payload, config, or worklog** — no endpoints, no tokens, no bucket
   names.

## Notes

- **Effort: ~1 day. Technical risk: Low. Consequence of skipping: HIGH.**
- **Related:** [`0033`](../0033-monitoring-alert-bot-phase1/brief.md) and
  [`0034`](../0034-monitoring-alert-bot-phase2/brief.md) — the alert-bot track. **Item 5 of `0034` is
  the `last-backup.json` consumer.** Read both before starting; the right outcome may be that this
  task contributes to `0034` rather than duplicating it.
- **Related:** `0182:224-230` already recorded the prune and uptime-check gaps as known limitations.
  **They were recorded and then not done** — which is itself the argument for doing them now.
- **The prod disk-full incident** is the precedent for G1. The mechanism (unrotated container log →
  full disk → truncated assets) is documented in project memory; do not re-derive it.
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- 🔒 **No secrets in any artifact** — variable names, file names and ports only.
</content>
