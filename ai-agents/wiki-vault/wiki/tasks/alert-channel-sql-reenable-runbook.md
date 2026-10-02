# Runbook: the SQL Fallback for Re-enabling a DISABLED Alert Channel (task 0368)

**Source**: `ai-agents/tasks/done/0368-runbook-document-the-proven-sql-re-enable-for-a-disabled-alert-channel/brief.md` (its `worklog.md` read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 7, rank 32 (append position; owner ruled *"Leave at the bottom"* — 32 is its real place) / task `0368`

> ✅ **Closed 2026-10-02; the runbook edit is committed in `2247699`.** Doc-only — no code, no deploy.
>
> 🚩 **The command is tested on a throwaway local Postgres only — NOT run on the real monitoring box.** What was proven
> on the box (once, 2026-10-01, `0341`) is the **unguarded** form of the same update.
>
> 🚩 **A real, monitor-fired alert after an SQL re-enable is UNPROVEN.** The update writes the vendor's table behind
> the app's back; if the running app keeps channel state in memory it might not notice until a restart.

## Goal

In `0341`'s production drill ([[tasks/uptrace-channel-state-production-check]]) the runbook told the operator to
re-enable the disabled alert channel **in the monitoring UI**. The owner could not find that control in time and used
the **reverse SQL update** instead. This task writes that proven method into the runbook as a **fallback**, so an
operator in a real incident is not stuck in the same place. The sibling task `0369` finds the UI control and corrects
the UI wording (owner ruling: *"Keep two (Recommended)"* — the split stands).

**Scope addition (owner-confirmed 2026-10-01, *"Yes, keep it in 0368 (Recommended)"*):** `0289`'s owed runbook edit —
*"delivery after an IDLE period is unproven"* → the observed 4 h 36 min result ([[tasks/alert-delivery-after-idle]]) —
rides here.

## Key Changes

All in `ai-agents/knowledge-base/alert-delivery-runbook.md`:

- **New subsection — *Re-enabling a DISABLED channel — SQL fallback*.** Run as root on the monitoring box, in the
  monitoring stack's directory, through the same `postgres` compose service the probe's state read uses — but it
  **writes**. One `UPDATE` of the channel's `status` back to `delivering`, with **two guards**: it changes a row only
  when that channel is `disabled` (never a deliberate pause or a half-saved draft), and only when **exactly one**
  channel has the probe's URL. **Expect `UPDATE 1`**; the runbook spells out what `UPDATE 0`, an empty-config stop and
  an `ERROR:` line each mean, and says **stop** on any of them.
  - **The URL never appears anywhere.** It is read from the probe's env file inside a subshell, handed to psql by
    variable **name**, and sent to Postgres as a **bound parameter** — so it is not on a command line, not in psql's
    output, and not in Postgres's log **even when the statement fails**. ⛔ Never paste it into the SQL; never print
    the channel's `params` (one key holds the shared secret).
  - Follow-up: hand-run the probe, then `checks.sh` (`alert-channel-state … OK`), then confirm a message reaches
    Telegram — ⚠️ *Test channel* has failed silently 3 times (`0369`), so its silence does not prove the channel dead.
  - Three caveats: proven once on one host, the guarded form tested locally only; real-alert delivery after an SQL
    re-enable unproven; tied to the pinned images (`uptrace/uptrace:2.0.2`, `postgres:17-alpine`; `\bind` needs psql
    16+) — re-verify the schema before bumping either.
- **Pointers** to the fallback on the three UI re-enable sentences (the trap section, probe-failure step 4,
  channel-state step 2). ⚠️ **The brief asked them to call the UI control "unproven"; they do not**, by owner ruling Q1
  (*"Only what's true now"*): `0369`'s live look had since found and used the control (`Unpause channel`), so that
  wording would be false. Naming the control stays with `0369`.
- **Check 13's "not yet seen to trip on the real box"** lines (and a twin) struck as history, replaced with the
  bounded `0341` fact.
- **The IDLE paragraph** → `0289`'s observed 4 h 36 min result, drill not run, every bound kept; two pointers added
  elsewhere. Three passages the brief protected were checked **byte-identical**.

**Two build changes to the plan:** the URL goes as a **bound parameter**, not an interpolated literal — the plan's
literal form, tested, printed the URL to the terminal **and** into the Postgres log on a failing statement. And, from
review round 1, the `status = 'disabled'` guard — a **behaviour change** (a lone paused/draft channel now gets
`UPDATE 0` instead of being flipped), accepted by owner ruling *"Keep fix + close (Recommended)"*.

## Outcome

- Command tested against a stand-in table on `postgres:17-alpine`, real Docker, torn down: 1 disabled match →
  `UPDATE 1`; paused/draft/delivering, 0 matches, 2 matches, or the URL not handed in → `UPDATE 0`, nothing changed;
  empty config → named stop; schema changed → `ERROR:` with the URL in neither output nor log.
- Secret grep over the added lines: clean. `npm test` unaffected (the runbook is not in the hardening harness's list).
- Stateful review round 1: R1 + R2 (both low) fixed, ledger closed-out, no residuals.
- **Noticed, not touched:** a drill-bounds bullet in the runbook (*"the already-disabled state is still uncovered … a
  separate follow-up"*) has been stale since check 13 shipped — a candidate for `0369` or a later tidy-up.
- **Still open:** ~~`0369` (UI control wording), and~~ the unproven real-alert-after-SQL-re-enable caveat.
- 📌 *2026-10-02:* `0369` done ([[tasks/alert-channel-ui-reenable-runbook]]) — the runbook now names the UI control
  (`Unpause channel` ▶) as the first choice, keeps this SQL section as the fallback (three links added, otherwise
  byte-identical), and struck the stale drill-bounds bullet noticed above.

## Related

- [[systems/alert-delivery]] — the alert path and runbook this edits
- [[tasks/uptrace-channel-state-production-check]] — task `0341`, the drill that proved the SQL route and found the gap
- [[tasks/uptrace-channel-state-check]] — task `0285`, check 13 and its verified schema
- [[tasks/alert-delivery-after-idle]] — task `0289`, whose runbook edit rode here
- [[tasks/alert-path-liveness-probe]] — task `0284`, the probe whose env file and state read this reuses
- [[decisions/sprint-7]] — the board (rank 32); closed 2026-10-02
- [[tasks/alert-channel-ui-reenable-runbook]] — task `0369`, the sibling that named the UI control (done 2026-10-02)
