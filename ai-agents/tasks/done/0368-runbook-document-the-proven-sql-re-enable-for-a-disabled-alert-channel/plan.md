# Approved plan — 0368

> **Provenance (written by `fkit-lead`, `fkit-sprint-ship-loop`, 2026-10-02).** Approved by the owner via
> `AskUserQuestion` in the live `fkit lead` session on 2026-10-02 (answer: *"Approve, incl. :98-99 fix
> (Recommended)"*).
> ⚠️ **Honest note:** the owner was shown a plain-language rendering of this plan in the session, not these
> exact bytes. The text below the line is the plan the spawned `fkit-coder` returned, **transcribed by
> `fkit-lead` from that worker's message — not a byte copy** (every file:line, change, check, risk and scope
> item kept). Both the owner-facing rendering and this file derive from that same return. This is the
> `carried-not-approved` residual the skill names — approval leaves no artifact (ADR-021).
>
> **Owner rulings on the plan's open questions (`AskUserQuestion`, 2026-10-02):**
> - **Q1 (0368 vs 0369 step 6):** *"Only what's true now (Recommended)"* — add the SQL fallback and an
>   "if the UI doesn't work, use SQL" pointer; do NOT name the UI control and do NOT call it unproven; naming
>   the control, step 3, and the general Test-channel warning stay with 0369 step 6. 0368 deliberately does
>   not meet its brief's verification-step-1 wording ("UI control unproven"), because that is no longer true.
> - **Q2 (one-row guard):** *"Add the guard (Recommended)"* (asked twice — the owner first chose "Explain
>   more, then ask again") — the documented UPDATE carries the count = 1 condition.
> - **Twin stale line `:98-99`:** included (the approval option named it).

---

# Plan — 0368: runbook, SQL re-enable fallback + 0289's idle-delivery result

**Summary**
- Doc-only. Edits `ai-agents/knowledge-base/alert-delivery-runbook.md` and nothing else (plus this task's own `worklog.md` during the build). No code, no deploy, no live box run.
- ⚠️ **0369's live look (2026-10-01) has already overtaken two parts of this brief.** The UI control exists (`Unpause channel` ▶, proven once). The *Test channel* button failed silently 3 times. So the brief's suggested wording, *"the UI control for a DISABLED channel has not been found yet"*, would now be **false**, and "press Test channel to confirm" would point at an unreliable signal. The plan writes only what is still true. Naming the control and adding the general Test-channel warning stay with 0369 step 6. (Q1.)
- One small safety change to the brief's SQL statement: a guard so that it **cannot** change two rows. As briefed, "more than 1 row → stop" can only be noticed *after* both rows were already changed. (Q2.)

## How 0368 and 0369 step 6 split the runbook (no collision)

| Runbook spot | 0368 (this task) | 0369 step 6 (later) |
|---|---|---|
| New § *Re-enabling a DISABLED channel — SQL fallback* | **creates it**: the one place the SQL method lives | keeps it as the fallback (its brief says so); may add a pointer to the Test-channel warning |
| 3 UI re-enable sentences (trap `:43-45`, probe step 4 `:204-206`, channel-state step 2 `:211-213`) | adds only *"if you cannot re-enable it in the UI, use the SQL fallback (§ link)"*. Keeps "in the monitoring UI" as the first method. Does **not** name the control and does **not** call it unproven. | replaces the UI wording with the exact control (`Alerting → CHANNELS → row → Unpause channel ▶`) |
| Channel-state step 3 `PAUSED`/`DRAFT` `:214` | **untouched** (brief item 4) | updates it from the Pause check |
| General *Test channel is not a liveness signal* warning | not written (Q1). Only the SQL subsection's own confirm step mentions it, in one line. | writes it |
| Check-13 / probe "not yet seen to trip" lines, 0289 idle result | **0368 only** | not touched |

Order: 0368 lands first. 0369 step 6 then edits the sentences "as left by 0368", exactly as 0369's brief expects. Old text is kept struck (`~~…~~` plus "true until 2026-10-01"), so each task's change stays readable on its own.

## Changes (line numbers as of 2026-10-02; the build re-reads first)

1. **New subsection** `#### Re-enabling a DISABLED channel — SQL fallback`, placed right after § *When `alert-channel-state` fails* (after `:236`, before the `---` at `:238`). Contents:
   - **Where it runs:** as root on the monitoring box, inside the monitoring stack's directory, through the same `postgres` compose service the probe's `read_channel_state` uses (`setup-telemetry.sh:1130-1136`). Unlike the probe, it **writes**, so there is no read-only transaction.
   - **The command** (final form gets tested in the build). It runs in a subshell, so the env file's values never stay in the operator's shell. The URL is taken from `ALERT_PROBE_URL` in `/opt/uptrace/alert-probe.env`. It reaches psql through the environment (`docker compose exec -T -e ALERT_PROBE_URL …` + psql `\getenv`), so it never appears in argv, the SQL text, the terminal or a log. The SQL goes in on stdin:
     ```
     \getenv probe_url ALERT_PROBE_URL
     UPDATE notif_channels SET status = 'delivering'
      WHERE params->>'url' = :'probe_url'
        AND (SELECT count(*) FROM notif_channels WHERE params->>'url' = :'probe_url') = 1;
     ```
     The second condition is the Q2 guard. When exactly one channel matches, the write is identical to the one 0341 proved.
   - **Never** `SELECT` or print `params`: its `payload` key holds the shared secret.
   - **Expect `UPDATE 1`.** `UPDATE 0` → stop. Either no channel has the probe's URL, or several do. Compare channels in the UI, and see the existing *Several channels with the probe's URL* note (`:152-153`).
   - **Then:** existing step 6 (hand-run the probe, log ends `channel state: delivering`; then `checks.sh`, `alert-channel-state … OK`). Then confirm a message reaches Telegram: in `0341` the *Test channel* button did; ⚠️ it has since failed silently 3× (`0369`), so no arrival from it does not prove the channel is dead. The throwaway-monitor drill (§ *The working drill procedure*) is the reliable proof.
   - **Caveats, plain words:** (a) proven once, one host, 2026-10-01 (`0341`). (b) A **real, monitor-fired alert after an SQL re-enable is unproven**: the write bypasses the app, which might hold channel state in memory. `0289`'s Phase A will not supply this, because 0289 closed without its drill. (0369's real alert came after a **UI** unpause, so it does not count here either.) (c) It writes the vendor's internal table and is checked against the pinned image only (`uptrace/uptrace:2.0.2`, `postgres:17-alpine`; `\getenv` needs psql ≥ 15). The same upgrade rule as check 13 applies.
2. **Three UI sentences**: add the fallback pointer only (see table). Old wording is unchanged apart from the appended pointer, so nothing needs striking.
3. **Stale "not yet seen to trip" line, check-13 section `:173-175`** → replace with the bounded fact. On 2026-10-01 (`0341`) an SQL-set `disabled` made the probe read `disabled`, a **hand-run** `checks.sh` FAIL `DISABLED`, and the dead-man's switch page the owner. The re-enable was by SQL, not UI. Bounds: one host; the disable was SQL-written, not a real vendor-written failure; the daily 08:00 cron run was not the one that tripped; whether the incident resolves itself on the next success ping was not observed (it was closed by hand). Old text struck.
   - ➕ **Its twin at `:98-99`** (probe section: *"Not yet seen to trip on the real box — the owner's drill is still to run"*) states the same now-stale fact. Same treatment there, so the runbook does not contradict itself (owner approved).
4. **Untouched:** channel-state step 3 (`:214`).
5. **§ *What is still unproven*, IDLE paragraph `:554-556`** → replace with the observed result. A send from the profile box's long-running process arrived after **4 h 36 min** of silence, 2026-10-01 08:12 → 12:48 UTC. It came via the name-change notifier, which shares the relay's sender, pool and proxy in the same process (code reading, `0289` plan). An **owner ruling** replaced the ≥ 8 h drill with this observed gap; **the drill was not run**. Bounds, each stated: overnight (≥ 8 h) still unproven · retry use not determined (that notifier is not counted by `geoconflict_profile_alert_relay`) · the monitoring → relay hop after quiet is not covered (the hourly `0284` probe keeps it warm) · the Alerts topic itself was proven 2026-09-17 only on a warm connection · quiet at the proxy unknown (the game server may share it) · `0061`'s stale-pool mechanism neither confirmed nor ruled out (undici closes idle pooled connections within ≤ 10 min, code reading only, so the 12:48 send most likely used a fresh connection). Old text struck.
6. **Pointers**:
   - `:505-507` ("… A1 stands."): add *"A1 was since closed on observed evidence, bounded to 4 h 36 min. See § What is still unproven."* The drill's own claim stays.
   - `:583-585` (digest item 2): same pointer. Keep *"Do not record A1 as discharged by this."*
7. **Byte-identical, must not change:** `0283` digest warning `:56-59`, `0284` A1/mask bullet `:108-110`, check-13 bullet `:171`.
- Noticed, **not touched** (out of scope): `:510-512` says the already-disabled state is "still uncovered … a separate follow-up". That has been stale since `0285` shipped check 13. Candidate for 0369 step 6 or a later tidy-up.

## Verification
1. **Command test, local and throwaway** (scratchpad only, nothing in the repo). A one-service compose file runs `postgres:17-alpine` with a stand-in `notif_channels` table: a status enum with the 4 values, and `params` jsonb with `url` + `payload`. The exact command is run through `docker compose exec`. Cases:
   - 1 match, `disabled` → `UPDATE 1`, row `delivering`
   - 0 matches → `UPDATE 0`
   - 2 matches → `UPDATE 0`, **both rows unchanged**
   - the URL and the payload never appear in output, and not in `ps` argv while it runs
   - check that `-e VAR` with no value passes through on compose v2. If it does not, use the fallback form and re-test.
   ⚠️ Needs Docker Desktop running, which cannot be started headlessly. If it is down, ask the owner to start it (return NEEDS-DECISION). Otherwise this step degrades to a **dry-read only** (brief verification 3) and is flagged as untested.
2. **Dry-read against the recorded schema** (`:135-140`, `setup-telemetry.sh:1085-1087`, `:1130-1136`).
3. **Diff checks:**
   - `git diff` touches only the runbook (plus the task worklog). The working tree already has other tasks' edits, so compare against `git status` taken before the build.
   - The three item-7 passages: no hunk.
   - Old text struck where replaced.
4. **Secret grep over added lines:** URLs (`https?://`), IPv4 addresses, `chat_id`/topic ids, bot tokens, hostnames. Must be zero hits. The `/opt/uptrace/...` paths and env-var names are already in the runbook and are not secrets.
5. **`npm test` unaffected:** re-confirm that nothing under `tests/` or `scripts/` references the runbook (zero hits today). No run needed.
6. **Brief verification 1 deviation:** under Q1 the three sentences do **not** say "the UI control is unproven", because that is no longer true. Recorded in the worklog.

## Risks
- Compose `-e VAR` passthrough or `\getenv` behaving differently than expected → caught by the local test. Without Docker it is untested; flagged.
- The guard makes the documented statement differ from the literal one 0341 ran (same effect for exactly one match).
- A runbook carrying the SQL method may tempt operators to prefer it over the UI. It is labelled a fallback.
- Effort: under an hour plus the local test.

No commit. No wiki write. No task move.
