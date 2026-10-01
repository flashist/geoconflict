# Plan — `0289`: prove a Telegram alert still arrives after a quiet period (`0274` **amendment A1**, not alert rule A1)

Plan only. I wrote nothing: no source, no tests, no plan.md, no status change. I did not SSH to or touch either box. There was no permission denial to report.

## Summary
- **No code is needed.** This is an owner-run drill plus two small doc edits: `worklog.md` in the task folder, and the "what is still unproven" part of the alert runbook.
- **🚩 Correction to the brief: the relay writes NO log line when a send succeeds.**
  - `AlertRelay.ts` `deliver()` writes a log line only on failure (`delivery failed (…)`).
  - On success it only increments the counter `geoconflict_profile_alert_relay`, tagged `result` = `sent` or `sent_after_retry` (`Telemetry.ts:266-270`, `:386-387`).
  - So brief steps 4/5 ("read the relay's log line") cannot be done as written.
  - The evidence is that counter, read in the monitoring UI and grouped by `result`. It needs no code and no box access.
- **🚩 Finding that changes how a result should be read. It comes from reading the library's source; it was not observed on the box.**
  - The relay sends through `undici` 8.0.2, pinned by the lockfile. `Dockerfile.profile` runs `npm ci`, so the image uses the same version.
  - Its client closes an unused kept-open connection after **4 s** by default (`client.js:251`). If the server sends a keep-alive hint, the cap is **10 min** (`:252`).
  - So after a 30-minute or overnight quiet spell, the relay should hold **no** pooled connection at all. The second alert opens a fresh one.
  - ⇒ The brief's reading "`sent` ⇒ the window was too short, not a pass" looks wrong for any window over 10 min. The drill tests "does an alert arrive after N hours of quiet?", which is what a 3am alert needs. It probably does **not** test the "connection sat idle in the pool for hours" mechanism.
  - How to record a `sent` result is therefore an owner question (Q2).
- **What else shares the relay's connection pool** (verified): in the long-running profile-server process there are exactly two senders, the alert relay and `NameChangeRepository`, which notifies on each name-change request. Both go through one `ProxyAgent` per proxy URL (`TelegramNotifier.ts:139`).
  - The `0283` digest is a separate short-lived process with its own pool. It does use the same egress proxy.
  - The `0284` probe sends nothing to Telegram.
- **The hourly `0284` probe is left running on purpose.** Production always has it running, so a real 3am alert also crosses that warm first hop. Pausing it for more than 3 h would also make check 11 page at 08:00 UTC, and would mean writing on the monitoring box. The drill therefore claims nothing about quiet on the monitoring → profile hop, and says so.
- **Overlap with `0285`: one shared file, and a live-state clash.**
  - The only shared file is the runbook, and the sections differ.
  - The clash: `0285`'s deploy restarts the relay, and its drill deliberately **disables the channel**. Either one during `0289`'s quiet window would ruin the result.
  - Recommendation: run `0289` after `0285` has deployed and finished its drill (Q3).

## What the drill proves, and what it does not
- **Proves:** a real alert from the real path (a monitor rule fires, the monitoring stack calls the webhook, nginx `/internal/` allowlist, the relay, the egress proxy, Telegram's Alerts topic) is **seen arriving by the owner** after a measured quiet gap `G` with no Telegram sends from the profile box. It also records whether the send needed the one retry `0277` added.
- **Does not prove:**
  - anything about quiet on the monitoring → profile hop (the probe keeps it warm, as it always will in production);
  - quiet at the proxy, if the game server shares the same egress proxy (player feedback sends can happen at any time; the repo cannot say whether the proxies are the same);
  - delivery after a gap longer than `G`;
  - that `0061`'s stale-pooled-connection mechanism exists (see the undici finding);
  - anything about an already-disabled channel (that is `0285`).

## How "quiet" is produced and measured
- **Quiet window** = from the arrival of Phase A's ✅ (the relay's last send) to the moment Phase C's 🚨 alert is created in the monitoring UI.
- **All four conditions must hold, and each is recorded:**
  1. **Alerts topic:** no message between the two markers. This also catches the relay's own out-of-band alarm and nag repeats from any open alert.
  2. **Name Changes topic:** no name-change notification (sent by the long-running process). A digest message (`Waiting for review: N`) is a different process and does not break quiet for the relay, but record its time (see Q1).
  3. **No profile-box deploy or restart during the window.** In particular, no `0285` deploy.
  4. **Channel never disabled during the window.** No `0285` drill runs inside it.
- **Optional, read-only:** the owner looks at the counter in the monitoring UI over the window. Expect only `result=probe` and no `sent*` or `failed`.
- **Record the real wall-clock gap `G`**, not the planned one. If the window crossed a digest, also record the proxy-side gap since that digest.

## Owner-run steps
Placeholders only. The owner fills them from their own env files and the UI.

**0. Before starting (write every value into the worklog)**
- Monitoring UI, channel `alerts-to-telegram`: status is delivering / not disabled. Once `0285` has landed, also check the profile box's `checks.sh` line `alert-channel-state … OK`.
- Monitor list: record the **total count**. **A5 (id 9) is active and has no open alert.** An open alert would re-notify every 15 min or more and keep the path warm.
- Metric `geoconflict_profile_session_rejected`, grouped by `reason`, last 24 h. Record the `invalid` rate.
  - If it is non-zero, real traffic would disturb the throwaway monitor. Stop and report it.
  - Reason: `GET /v1/profile` now serves players, so `absent` and `expired` may be non-zero. That is why the monitor filters on `reason = invalid` (below).
- Metric `geoconflict_profile_alert_relay`, grouped by `result`: record the all-time totals for `sent`, `sent_after_retry` and `failed` as the baseline.

**Phase A — warm-up firing, the same as the proven 2026-09-17 drill**
1. If `geoconflict_profile_session_rejected` is not in the picker, send **one** junk request, then wait at least 2 min:
   `curl -s -o /dev/null -w '%{http_code}\n' -H 'Authorization: Bearer drill-junk' "<PROFILE_PUBLIC_BASE_URL>/v1/profile"` → expect `401`.
2. Create the throwaway monitor `DRILL — delete me — rejected sessions (>0 / 1 min)`:
   - `perMin(sum(geoconflict_profile_session_rejected))`, **filtered `reason = invalid`**;
   - grouping 1 min, check the last 1 point, max allowed 0;
   - tick the `alerts-to-telegram` channel.
   - **Commit the metric row with its green tick**, then re-read the list to confirm the monitor exists (the known UI trap).
3. Burst: `for i in $(seq 1 20); do curl -s -o /dev/null -w '%{http_code}\n' -H 'Authorization: Bearer drill-junk' "<PROFILE_PUBLIC_BASE_URL>/v1/profile"; done` → expect twenty `401`s.
   - 20 is well under the 60/min limiter (`Routes.ts:579-584`).
   - A `429` means no increment; redo after a minute.
4. Watch the Alerts topic for the 🚨 message. Stop sending, then wait for the ✅. **Record the UTC arrival time of each, as seen in Telegram.** The ✅ time is the start of the quiet window.
5. **Delete the monitor.** Re-read the list: the count is back to the baseline and A5 is still active.
   - The monitor is deleted between firings so it cannot pick up stray junk-token traffic mid-window and break the quiet.
   - If there is no 🚨 or no ✅, stop. That is `§7.6` failing, a finding in its own right.

**Phase B — quiet.** Wait for the agreed gap (Q1). Touch nothing on the alert path. Watch the four conditions above.

**Phase C — the test**
6. Re-check that the channel is not disabled and A5 is active.
7. Create the identical monitor again, with the green tick, and re-read the list. **Do not send traffic before creating it.** If the metric is missing from the picker, repeat step 1 first.
8. Burst as in step 3. **Record the time the alert opens in the monitoring UI and the 🚨 arrival time in Telegram.** 🚩 This arrival is the test.
9. Stop sending → ✅ arrives → record its time.
10. Counter `geoconflict_profile_alert_relay` by `result`, over the minutes from the 🚨 to the ✅, compared against the baseline. Expect `sent + sent_after_retry` to rise by 2. **Record which result the 🚨 minute carries.** The export runs about once a minute, so allow a minute or two of lag.
11. Cleanup: delete the monitor. The count equals the baseline. **A5 is active. The channel is still delivering**, confirmed explicitly, because a disable happens silently.

**If the 🚨 does not arrive within about 10 min of the alert opening in the UI:** this is a finding, not a failed task. Record it loudly and stop. The owner may do these read-only checks:
- relay counter `failed`;
- the channel's notification history in the monitoring UI (status code);
- `docker logs` on the profile box, grepping for `alert relay: delivery failed`.

Then route the fix decision to the owner. **No fix inside this task.**

## Pass / fail
- **PASS:** Phase C 🚨 **seen by the owner** after gap `G` (at least the agreed minimum), all quiet conditions held, and cleanup verified.
  - Counter `sent` means a fresh connection worked. Record it per Q2.
  - Counter `sent_after_retry` also passes, and is recorded **loudly** as the first production firing of `0277`'s retry: the first attempt failed at the network layer.
- **INCONCLUSIVE (re-run, never record a pass):** a quiet condition broke, `G` fell short of the agreed minimum, the monitor did not fire, or a `0285` deploy or drill overlapped the window.
- **FINDING / FAIL:** the alert opened in the UI but no 🚨 arrived.
  - Relay counter shows nothing ⇒ failure on the monitoring → relay hop (disabled channel or 403).
  - `failed` ⇒ failure on the Telegram hop.
  - Record which, and escalate.

## What changes in the repo (Build worker, after the owner reports)
- `ai-agents/tasks/backlog/0289-…/worklog.md`:
  - the procedure above, written **before** the drill runs (brief step 1), unless the driver persists this approved plan as `plan.md`;
  - then the owner-observed values, each marked as owner-observed. No agent records an arrival it did not see (`0219` precedent);
  - decision log: `none` if no unattended fixes (there is nothing to fix).
- `ai-agents/knowledge-base/alert-delivery-runbook.md`, edited as it stands then, after re-reading:
  - `:466-468` "Delivery after an IDLE period is unproven" → the observed result: date, the real `G`, `sent` or `sent_after_retry`, explicit bounds (quiet-hop scope, proxy caveat, and the undici note as it comes out of Q2).
  - `:417-419` and `:495-497` ("A1 stands" / "still unproven") → point to that result.
  - ⛔ `:56-59` untouched. The `0283` "does not discharge" warnings and the `0284` bullet at `:107-109` stay as they are.
- No source, no tests. No test or harness reads the runbook (checked: no hits under `tests/` or `scripts/`), so `npm test` is not affected. There is nothing to run.
- The brief's `## Owner` line already names an owner step. The ship loop should **park** `0289` while it waits for the owner's observations rather than block other tasks, because the wait may be hours.

## Overlap with `0285` and ordering
| | `0285` touches | `0289` touches |
|---|---|---|
| `setup-telemetry.sh` (probe) | yes, adds a channel-state read | no |
| `AlertRelay.ts` | yes, stores the state; the probe branch still sends nothing | no (read only) |
| `profile-checks.sh`, tests | yes, check 13 | no |
| runbook | `:94-98`, component table, the "when it fails" steps | `:417-419`, `:466-468`, `:495-497` |
| live state | profile and monitoring deploys (relay restart), a drill that **disables the channel** | needs an untouched channel and no restart across the window |

Recommended order: `0285` deploys and its drill completes and re-enables the channel, then `0289` runs.
- `0289`'s pre-flight can then also use check 13.
- `0285`'s closing "confirm alerting is live" step can double as `0289`'s Phase A, if the owner wants to save one firing. Optional.
- Runbook edits: whoever edits second re-reads the file first. The sections do not overlap, so this is a text merge only.
- After `0285` lands, re-check once that the probe branch still sends nothing to Telegram. `0285`'s plan says it does not, but that should be confirmed, not assumed.

## Edge cases
- Real rejected-session traffic → the monitor is filtered to `reason=invalid`, the rate is checked in pre-flight, and the monitor exists only for minutes.
- The metric aged out of the picker → one junk request, wait, then create the monitor.
- UI trap: an uncommitted metric row → green tick plus re-reading the list.
- The alert-name suffix (`: rejected`) is expected, not an error.
- A monitor that never clears nags every 15 min → stop the traffic and delete the monitor.
- Counter export lag → read a few minutes around the event.
- A profile-box restart mid-window → counts as inconclusive under condition 3, even though undici's pool is empty anyway.
- The digest at 04:00 UTC crosses the window → see Q1.

## Estimate
Owner: about 10 min of attention at each end, plus the quiet gap. Worker: about 30 min of doc edits.

**For approval with the plan (depart from the brief):**
- (a) Read `sent` / `sent_after_retry` from the metric counter, because no success log line exists. Adding one would need code and a deploy; if wanted, file it as a separate task, not folded in here.
- (b) Delete and recreate the throwaway monitor between firings, filtered to `reason=invalid`.

## Owner rulings (2026-09-28, live via `AskUserQuestion` in the `fkit lead` session, relayed by fkit-lead) — record verbatim
- **Q1 (quiet gap):** "≥8 h, not crossing 07:00 MSK (Recommended)" — E.g. 07:30 → 19:30. Strongest clean result; costs a day of waiting.
- **Q2 (a first-try `sent` result):** "Pass, with a note (Recommended)" — 'Arrives after G of quiet; retry not exercised' + note that the stale-connection theory looks unlikely from the library code (not verified live).
- **Q3 (order vs 0285):** "0289 after 0285 is done (Recommended)" — Safe; 0285's final 'alerting works' firing can be 0289's warm-up; pre-check gains the new check 13.
- **Plan approval:** "Approve (Recommended)" — 2026-09-28, including (a) proving success from the `geoconflict_profile_alert_relay` counter and (b) deleting and recreating the throwaway monitor between firings. The task is parked until the owner runs the drill, after 0285 is deployed and its drill is finished.
- 📌 **2026-10-01 (appended; nothing above edited, ADR-035):** OWNER RULING live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer` (⛔ not producer precedent) — **"No, fresh start (Recommended)"**: `0341`'s 14:31 UTC Test-channel firing does **not** count as Phase A. Phase A runs on this task's own drill day, after its step-0 pre-checks. The *"`0285`'s closing step can double as Phase A"* option above is not taken. See the brief's `## Status` notes.
- 📌 **2026-10-01, later (appended; nothing above edited, ADR-035) — Q1 AND THE DRILL METHOD SUPERSEDED.** OWNER RULING live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer` (⛔ not producer precedent). Question, verbatim: *"If the Alerts topic was empty between 11:12 and 15:48 MSK today, should we close 0289 using this as the proof (no test)? This replaces your earlier rule of '8+ hours, run as a drill' with '4 h 36 min of real silence, seen in the wild'."* → **"Yes, close on this (Recommended)"**; the owner then confirmed **"It was empty"**. So: **the drill above (step 0, Phases A–C) was NOT run**, and Q1's ≥ 8 h minimum is replaced by the observed 4 h 36 min gap (two Name Changes messages from the long-running profile-api process, 08:12 → 12:48 UTC, the second arrived). Q2 still governs how a retry is read (here: retry use not determined). The runbook edit under *What changes in the repo* moves to `0368` as a dated scope addition. Evidence and bounds: `worklog.md`.
