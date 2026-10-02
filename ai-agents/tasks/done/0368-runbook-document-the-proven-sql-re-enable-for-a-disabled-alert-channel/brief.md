# Runbook: document the proven SQL re-enable for a DISABLED alert channel, and mark the UI step unproven

## ID
0368

> ℹ️ **ID allocation, checked 2026-10-01 before filing** (method:
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md)). Highest task folder on
> all three boards: `0367`; highest `## ID`: `0367`. `0368`: no task folder, no `## ID` hit, no hit under
> `ai-agents/sprints/` or `.claude/`. `0369` was allocated in the same run, after this one (split sibling).

## Sprint
Sprint 7

## Priority
32

> ⚠️ **Priority 32 is append rank, NOT a merit ranking — flagged for owner confirmation.** The owner named the
> sprint but no rank; the board's highest was 31, and writing it higher would renumber closed rows (ADR-035).
> **On merit this belongs directly below `0341`** (closed), i.e. above `0289`, because it closes the gap `0341`'s
> drill found — an operator following the runbook in a real incident would get stuck exactly where the owner did —
> and it is a short doc edit with no deploy and no outage.
>
> ✅ **ANSWERED 2026-10-01 — OWNER RULING** (live `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead`
> to a spawned `fkit-producer` with no owner channel, ADR-021/037; ⛔ not producer precedent): **"Leave at the
> bottom"**. Rank **32 is this task's real place** — it is **not** moved up into the top group, and the merit note
> above is not acted on. Appended; nothing above edited (ADR-035).

## Status
✅ Done (agent-closed — not owner-verified)

📌 **Set 2026-10-02** by `fkit-lead` driving `fkit-sprint-ship-loop`. *(Earlier value, kept as history:)* ~~🔲 Backlog~~

## Owner
fkit-coder

## Context

**Filed 2026-10-01 by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER RULING given live
2026-10-01 in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead`.** ⛔ Not producer precedent.
The question was whether to file a task for the runbook's re-enable step; the choice, verbatim: **"Yes, file it
(Recommended)"**.

⚠️ **Split, flagged for owner confirmation.** The relay asked for *one small task*. `/fkit-task-brief` requires
the smallest independently shippable units, and this work has a clean seam, so the producer filed **two**:

- **this task (`0368`)** — write down the re-enable method that is **already proven** (the reverse SQL update from
  `0341`'s drill) as a fallback, and say plainly that the UI step is unproven. Needs no outage, no owner time.
- **[`0369`](../../backlog/0369-find-the-ui-re-enable-for-a-disabled-alert-channel-and-correct-the-runbook/brief.md)** — find
  the real UI control for a DISABLED channel (or confirm there is none) and correct the UI wording. Needs a short
  supervised alerting outage on an owner-chosen day.

Why split: the runbook can be made honest **today**, while `0369` may wait days for a quiet slot. If the owner
prefers one task, cancel this one and fold its scope into `0369`.

✅ **ANSWERED 2026-10-01 — OWNER RULING** (live `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead`;
⛔ not producer precedent): **"Keep two (Recommended)"**. `0368` and `0369` stay separate tasks; the split is
owner-confirmed. Appended; nothing above edited (ADR-035).

### What happened

In [`0341`](../../done/0341-verify-0285-in-production-deploy-it-and-run-its-disabled-channel-drill/brief.md)'s
drill (2026-10-01) the runbook told the operator to **re-enable the channel in the monitoring UI**. The owner could
not find that control in time and re-enabled it with the **reverse SQL update** instead (`status` back to
`delivering`, `UPDATE 1`). Afterwards, with the channel already `delivering`, `fkit-lead` saw the row actions
**Test / Pause / Edit / Delete** in Alerting → Channels. So the UI control for a *disabled* channel was never seen.
Evidence: `0341`'s [`worklog.md`](../../done/0341-verify-0285-in-production-deploy-it-and-run-its-disabled-channel-drill/worklog.md)
§ *Step 3* and § *What this does NOT prove*.

### What the SQL route has proven — and what it has not

**Proven once, one host, 2026-10-01:** the update matched exactly one row; the hourly probe then read
`channel state: delivering`; `checks.sh` check 13 read OK; a *Test channel* press reached the Telegram Alerts topic.

**🚩 Not proven — producer's reading, NOT verified:**
- That a **real, monitor-fired alert** is delivered after an SQL re-enable. A direct write to the vendor's table
  bypasses the app; if the running app keeps channel state in memory, it might not notice until a restart. The
  *Test channel* button may not consult the stored status at all. `0289`'s Phase A (a real monitor firing) will
  give incidental evidence; until then, say "unproven" in the runbook.
- That the method survives a vendor upgrade — it writes the vendor's internal table, verified against the pinned
  image only (the same constraint check 13 already carries, runbook § *The channel's own state — check 13*).

## What to build

Edits to [`alert-delivery-runbook.md`](../../../knowledge-base/alert-delivery-runbook.md) only. No code, no deploy.

1. **Add one short subsection — "Re-enabling a DISABLED channel"** — near § *When `alert-channel-state` fails*,
   holding the SQL fallback as the single place the method lives:
   - run on the monitoring box, inside the monitoring stack's directory, through the same `postgres` service the
     probe uses (`setup-telemetry.sh`'s `read_channel_state` is the model) — but **not** read-only, since it writes;
   - one statement: `UPDATE notif_channels SET status = 'delivering' WHERE params->>'url' = <the probe URL>`;
   - the URL comes from `ALERT_PROBE_URL` in `/opt/uptrace/alert-probe.env`, passed in without ever being printed,
     echoed, pasted or logged; **never** select or print `params` (its `payload` key holds the shared secret);
   - expect `UPDATE 1`. **`UPDATE 0` or more than 1 → stop** and compare channels (the runbook's existing
     *several channels with the probe's URL* note applies);
   - then the runbook's existing step 6 (hand-run the probe, then `checks.sh`, confirm OK), then press *Test
     channel* and confirm arrival in Telegram;
   - the caveats from *What the SQL route has proven* above, in plain words.
   The exact shell command is the coder's to write and test against the pinned version's schema; keep it free of
   hosts, URLs, ids and secrets.
2. **Point the three UI re-enable instructions at it**, keeping the UI as the first-named method but marked
   unproven: § *The trap that makes alerting die silently* (the "re-enable the webhook channel in the monitoring
   UI" sentence), § *When `alert-path-probe` fails* step 4, and § *When `alert-channel-state` fails* step 2. Wording
   in spirit: *"Re-enable it in the monitoring UI — ⚠️ the UI control for a DISABLED channel has not been found yet
   (`0341`, `0369`); if you cannot find it, use the SQL fallback below."*
3. **Fix one now-stale line** in § *The channel's own state — check 13*: *"⚠️ Not yet seen to trip on the real box"*
   is no longer true — `0341` saw it trip on 2026-10-01. Replace it with the bounded fact (seen once, one host, the
   re-enable done by SQL not UI), keeping the old text struck as history.
4. Leave § *When `alert-channel-state` fails* step 3 (`PAUSED` / `DRAFT`) alone — `0369` checks it.

### ➕ Scope addition, 2026-10-01 — `0289`'s runbook edit rides this task

**Authority.** Added 2026-10-01 by a spawned `fkit-producer` (no owner channel, ADR-021/037) at `fkit-lead`'s
direction, when [`0289`](../../done/0289-prove-a-telegram-alert-arrives-after-an-idle-period-0274-amendment-a1/brief.md)
closed on an OWNER RULING given live that day via `AskUserQuestion` (*"Yes, close on this (Recommended)"*). Folding the
edit in here, instead of a separate doc-only task, is **`fkit-lead`'s choice, not an owner ruling — ⚠️ the owner may
object**; if so, cancel this addition and file it as its own task. Nothing above this heading was changed (ADR-035).

✅ **OWNER-CONFIRMED 2026-10-01 — OWNER RULING** (live `fkit lead` session via `AskUserQuestion`, relayed by
`fkit-lead`; ⛔ not producer precedent): **"Yes, keep it in 0368 (Recommended)"**. The scope addition below stands
as written and is no longer only `fkit-lead`'s call; the "⚠️ the owner may object" caveat above is answered.
Appended; nothing above edited (ADR-035).

**Why.** `0289` closed on observed evidence, not a drill: a Telegram send from the profile box's long-running process —
the alert relay's own sender, connection pool and egress proxy — **arrived after 4 h 36 min of silence**
(2026-10-01, 08:12 → 12:48 UTC), with the Alerts topic empty throughout (owner-confirmed). `0289`'s approved plan owed
a runbook update recording that; it lands here. Evidence and bounds: `0289`'s
[`worklog.md`](../../done/0289-prove-a-telegram-alert-arrives-after-an-idle-period-0274-amendment-a1/worklog.md).

**What to change in [`alert-delivery-runbook.md`](../../../knowledge-base/alert-delivery-runbook.md)** — re-read it
first; line numbers below are as of 2026-10-01 and will drift with items 1–3:

5. § *What is still unproven*, the paragraph **"⚠️ Delivery after an IDLE period is unproven (`0274` amendment A1)"**
   (≈ `:554-556`) → replace with the observed result, keeping the old text struck as history. It must say:
   - **observed 2026-10-01, 4 h 36 min** gap, second send arrived — via the name-change notifier, which shares the
     relay's sender, pool and proxy in the same process (`0289` plan § *Summary*, code reading);
   - **owner ruling** replaced the ≥ 8 h drill with this observed gap — **the drill was not run**;
   - the bounds, each in plain words: **an overnight (≥ 8 h) gap is still unproven** · **retry use not determined**
     (the name-change notifier is not counted by `geoconflict_profile_alert_relay`) · **the monitoring → relay hop
     after quiet is not covered** (the hourly `0284` probe keeps it warm in production) · **the Alerts topic itself**
     was proven 2026-09-17 on a warm connection, not after quiet · **proxy-side quiet unknown** (the game server may
     share the proxy) · **`0061`'s stale-pool mechanism** neither confirmed nor ruled out (undici closes idle pooled
     connections within ≤ 10 min — code reading only, so the 12:48 send most likely used a fresh connection).
6. **Point these at that result** (a short "see *What is still unproven*" pointer; do not delete their bounds):
   - § *⚠️ Bounds — what this PASS does NOT cover*, the bullet ending **"A1 stands."** (≈ `:505-507`) — the drill's
     own claim stays true (its bursts were minutes apart); add that A1 was since closed on observed evidence, bounded
     to 4 h 36 min.
   - The digest list item **"2. Delivery after an IDLE period is still unproven"** (≈ `:583-585`) — same pointer;
     keep *"Do not record A1 as discharged by this"* (it is about the digest, and still true).
7. ⛔ **Leave untouched:** the `0283` digest warning in § *What does NOT catch this* (*"The daily name-change digest
   (`0283`) cannot, and is actively misleading"*, ≈ `:55-58` — formerly cited as `:56-59`); the `0284` bullet
   *"It does not discharge `0274` amendment A1 … could **mask** an idle-path defect"* (≈ `:108-110`) — still true,
   since this evidence never crossed that hop; and the check-13 bullet *"not `0274` A1 (delivery after idle)"* under *"What a green check 13 does NOT prove"* (≈ `:171`).

## Verification steps

1. The new subsection exists, and all three UI instructions (trap section, probe step 4, channel-state step 2) link
   to it and say the UI control is unproven.
2. The SQL subsection says: where to run it, that the URL comes from the probe's env file unprinted, `UPDATE 1`
   expected and what to do otherwise, the follow-up checks (probe → `checks.sh` → Test channel), and both caveats
   (real-alert delivery after an SQL re-enable unproven; tied to the pinned vendor version).
3. The coder dry-reads the command against the schema the runbook already records (table `notif_channels`, column
   `status`, enum values) and `setup-telemetry.sh`'s `read_channel_state` — **no live run is part of this task.**
4. The "not yet seen to trip" line is replaced with the bounded `0341` fact; old text kept struck.
5. `grep` the changed sections: no hostname, IP, URL, channel id, chat or topic id, token or secret.
6. Nothing outside the runbook changed. `npm test` is unaffected (the runbook is not in the hardening harness's
   grep list — confirm that before closing rather than assuming it).
7. *(Scope addition 2026-10-01.)* The IDLE paragraph in § *What is still unproven* states the 4 h 36 min observed
   result, that the drill was not run, and **every** bound from item 5; the two pointers from item 6 exist; the three
   passages in item 7 are byte-identical to before; old text kept struck. No player id, name, chat/topic id, host,
   URL or token anywhere in the new text.

## Notes

- **Depends on:** [`0341`](../../done/0341-verify-0285-in-production-deploy-it-and-run-its-disabled-channel-drill/brief.md) (done 2026-10-01 — the drill that proved the SQL route)
- **Blocks:** [`0369`](../../backlog/0369-find-the-ui-re-enable-for-a-disabled-alert-channel-and-correct-the-runbook/brief.md)
  (soft — `0369` edits the same runbook lines and falls back to this subsection if the UI has no control).
- **Related:** [`0285`](../../done/0285-detect-an-already-disabled-uptrace-notification-channel-read-its-own-channel-state/brief.md)
  (check 13; verified schema) · [`0284`](../../done/0284-alert-path-liveness-probe-a-webhook-403-permanently-disables-uptrace-alerting/brief.md)
  (the probe) · [`0289`](../../done/0289-prove-a-telegram-alert-arrives-after-an-idle-period-0274-amendment-a1/brief.md)
  (its Phase A is the first real alert after `0341`'s SQL re-enable — incidental evidence for caveat 1; record it
  there if it arrives, do not wait on it here).
- **Build/verify:** a doc-only task; nothing to deploy, so no verify task follows it.
- **Effort:** small — under an hour.
- 🔒 **Privacy:** the runbook is tracked in git. No hosts, URLs, ids, tokens or secrets.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask. No wiki writes. Do not invoke
  the mover skills (producer-only, ADR-033).
- 📌 *2026-10-01, appended (nothing above edited, ADR-035):* `0289` closed **without running its drill** (owner
  ruling, see the scope addition under *What to build*), so **its Phase A will not happen** and gives no incidental
  evidence for caveat 1 in *What the SQL route has proven*. A real, monitor-fired alert after `0341`'s SQL re-enable
  stays **unproven** — write it so in the runbook; do not wait for evidence from `0289`.
