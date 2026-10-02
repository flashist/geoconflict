# Worklog — 0369

**Written 2026-10-01 by a spawned `fkit-producer` (no owner channel, ADR-021/037), from readings relayed by
`fkit-lead` from the live `fkit lead` session on 2026-10-01.** ⛔ Not producer precedent.
**The owner ran every box command himself** (output pasted to the lead) **and saw every Telegram arrival himself.**
**The monitoring-UI actions were done by `fkit-lead` in the owner's Chrome, at the owner's explicit instruction**
(*"Do all you need in Uptrace yourself"*), and are marked below. **The producer verified none of it.**
All times are **UTC, 2026-10-01**. UI labels, times and yes/no only — no hostname, IP, URL, channel id, chat or
topic id, token or secret (verification step 8). **No screenshot was taken into, or committed to, git.**

## Result

**Live part (steps 1–5) DONE. Step 6 (the runbook rewrite, `fkit-coder`) is still to do — the task is NOT
closed.**

- **The UI control exists.** For a `disabled` channel, Alerting → **CHANNELS** → the channel's row offers
  **`Unpause channel` (▶)**. It re-enabled the channel to `delivering`.
- **The same control serves `paused`.** Pause → `paused` → the row offers the same **`Unpause channel` (▶)**.
- ⚠️ **New finding: the *Test channel* button is not a reliable liveness signal.** Pressed 3 times after the
  re-enable; **none** arrived in Telegram and **none** reached the relay. Cause **unknown**. Delivery was instead
  proven by a **real alert** (throwaway-monitor drill) — see step 4.

## Step 0 — offline docs look-up

**Skipped — OWNER RULING** (live `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead`; ⛔ not
producer precedent). Choice, verbatim: **"Yes, now (Recommended)"** to *"Do 0369's live check now? … Skip the
optional docs look-up — the real screen is the answer anyway."* No vendor documentation or UI source was read.

## Step 1 — pre-flight

- Probe log at **15:32:36** ends `channel state: delivering` — **YES.**
- `0289` quiet-window rule — **moot**: `0289` closed 2026-10-01 without a drill.

## Step 2 — disable

- One SQL update of the channel's `status` to `disabled`, matched on the probe's own URL read from its env file
  (never printed), at **15:32:36** → `UPDATE 1` — **YES.**

## Step 3 — the look (UI by `fkit-lead`, owner-directed)

- Page: **Alerting → CHANNELS**, row `alerts-to-telegram`, type **webhook**.
- Status label: 🔴 **`disabled`** — **YES**, the channel was seen in the `disabled` state.
- Row actions (read from their tooltips), in order: **Test channel · Unpause channel (▶) · Edit channel · Delete
  channel**.
- For comparison, when the row is `delivering` the second action reads **Pause channel (⏸)** instead.
- **Edit not inspected, on purpose** — the Edit page displays the channel's secret. Whether Edit holds an
  enable/status control is therefore **not known**; it was not needed.

## Step 4 — re-enable through the UI

- **`Unpause channel` (▶)** pressed by `fkit-lead` at **~15:33:29** → row reads `delivering` — **YES**
  (confirmed after a page reload).
- **Outage: ≈ 53 s** (15:32:36 → ~15:33:29).
- Probe at **15:38:51** ends `channel state: delivering` — **YES.**
- Profile box `checks.sh` at **15:39:10**: `alert-channel-state … OK`, `RESULT: 13 ok, 0 failed`,
  `ping: success delivered` — **YES.**

### Telegram arrival — the *Test channel* button failed; a real alert was used instead

- ⚠️ **Test channel** pressed by `fkit-lead` at **15:34:37, 15:43:04 and 16:07:38** — **NO** arrival in Telegram
  for any of the three.
- The relay counter `geoconflict_profile_alert_relay`, grouped by `result` (read in the monitoring UI), shows
  **no** call at those times — only `probe` ticks. So the presses never reached the relay.
- Contrast: earlier the same day, the **14:31** Test-channel press (during `0341`, after an SQL re-enable)
  **did** arrive and **was** counted as `sent`.
- The monitoring stack's container log (owner-run, source-map noise filtered) shows **nothing** for any test
  press — working or not — so it cannot explain the difference.
- A background `error-monitor` job logs `transaction conflict … will retry` every few seconds all day, including
  around the working 14:31 press — **not shown to be the cause.**
- `fkit-lead`'s dedupe hypothesis was **disproved** (no `deduped` count).
- **Cause: unknown.** Not investigated further in this task.

**Delivery proven by a real alert instead (stronger than a test message)** — the runbook's own proven drill:

- Throwaway metric monitor **`DRILL — delete me — rejected sessions (>0 / 1 min)`**, created by `fkit-lead` in the
  UI: metric `geoconflict_profile_session_rejected`, filter `reason = "invalid"`, `perMin(sum)`, 1-minute grouping,
  check the last 1 point, max allowed 0, channel `alerts-to-telegram`.
- Pre-flight: no rejected logins in the prior hour except one probe request at 17:18.
- **17:28:38–17:28:44** — `fkit-lead` sent a burst of 20 junk-token requests to the profile API's public
  `GET /v1/profile`; all returned `401`.
- Owner saw in Telegram:
  - 🚨 `… DRILL — delete me — rejected sessions (>0 / 1 min): rej`, `Status: firing` (heading text as relayed — likely cut short by the screenshot or message), since 17:28 — arrived
    **17:29** — **YES.**
  - ✅ `… — resolved`, `Status: resolved` — arrived **17:30** — **YES.**
- The monitoring UI showed the alert closed — **YES.**
- Cleanup: the throwaway monitor deleted (in-page confirm) **~17:33** — **YES**; monitor list back to **10** —
  **YES**; `profile · DB pool saturated` still active — **YES**; channel `delivering` — **YES.**

## Step 5 — Pause check (in scope by OWNER RULING Q1, "Disabled + quick Pause (Recommended)")

- **Pause channel (⏸)** pressed by `fkit-lead` → row reads ⚪ **`paused`** — **YES.**
- The paused row offers the **same `Unpause channel` (▶)** action — **YES.**
- **Unpause channel** → `delivering` (after reload) at **~15:34:01** — **YES.** A few seconds of outage.
- Probe back to `delivering` — confirmed by the 15:38:51 probe run above (one run after both steps 4 and 5).

## Total alert downtime in this task

**≈ 53 s + a few seconds** (the disable, then the Pause).

## Verification steps (as of this worklog — step 6 not yet done)

1. Step 0 recorded — **skipped by owner ruling** (above); no source read, so nothing found and nothing claimed.
2. Channel seen `disabled` in the UI — **yes, 15:32–15:33**; label and every row action written down; Edit not
   opened, on purpose.
3. UI control re-enabled it — **yes: `Unpause channel` (▶)**, Alerting → CHANNELS.
4. Probe `delivering` — **yes (15:38:51)**; `checks.sh` `alert-channel-state … OK` — **yes (15:39:10)**;
   Test-channel message in Telegram — **NO (3 presses, none arrived)** ⚠️, **met instead by a real alert**:
   firing **17:29**, resolved **17:30**. Down ≈ 53 s + seconds.
5. Paused row's actions and the resume path recorded; channel back to `delivering` — **yes.**
6. Runbook matches what was seen — **NOT YET** — step 6 is `fkit-coder`'s, pending.
7. Channel ends `delivering`, alerting confirmed live — **yes** (real alert 17:29/17:30; channel `delivering`
   after cleanup).
8. No hostname, IP, URL, channel id, chat or topic id, token or secret in this worklog; no screenshot committed —
   **yes** for this worklog. The runbook part is checked when step 6 is done.
9. One reading came back "no" — the **Test channel** arrival. Recorded loudly above. The channel itself did return
   to `delivering` and a real alert arrived, so no SQL rescue was needed. Whether the unreliable Test button
   needs its own task is an **open question for the owner**, not decided here.

## What this does NOT prove

- **Why the Test channel button fails silently.** Cause unknown; the container log shows nothing.
- What the **Edit** page offers — not opened, on purpose.
- That a real alert arrives after a *real* vendor-written `disabled` (the disable here was the SQL update, as
  `0341` used) — the UI control seen should be the same, but the trigger was not a real failed delivery.
- One host, no CI; one version of the monitoring UI (the deployed one).

## Step 6 — runbook rewrite (`fkit-coder`, 2026-10-02)

**Written by a spawned `fkit-coder` (Build worker), called by `fkit-sprint-ship-loop` driven by `fkit-lead`,
under the loop's declared-approval marker.** The plan is `plan.md` in this folder (owner-approved via
`AskUserQuestion` in the live `fkit lead` session, 2026-10-02, *"Approve (Recommended)"*; owner rulings Q1 = fix the
stale drill-bounds bullet now, Q2 = warning only, no investigation task). `plan.md` blob checked before starting:
`aa60355f…` — matches the pointer the driver passed. **Docs only: no code, no deploy, no live run, no commit.**

### What changed — `ai-agents/knowledge-base/alert-delivery-runbook.md` only (9 hunks, = plan items 1–10)

| Plan item | Where (HEAD line → what) |
| --- | --- |
| 1 | Trap, after the SQL-fallback pointer (`:47`): the UI control path + link to the new UI subsection. Nothing struck. |
| 2 | *When `alert-path-probe` fails* step 4 (`:219`): the control path + details link; "use a real alert — *Test channel* is not a liveness signal" + link. Nothing struck. |
| 3 | *When `alert-channel-state` fails* step 2 (`:224`): `(Alerting → CHANNELS → row → Unpause channel (▶), details)` after "re-enable the channel in the monitoring UI". Nothing struck. |
| 4 | Same list, step 3 (`:229`): old line struck + *(Wording until 2026-10-02; replaced by `0369`, which named the control.)*; new `PAUSED` / `DRAFT` text. |
| 5 | New `#### Re-enabling a channel in the monitoring UI` after step 6 (`:251`): official route, 5 steps, ⚠️ bounds. |
| 6 | New `#### The Test channel button is not a liveness signal`, right after item 5. |
| 7 | SQL fallback intro (`:255`): `([how](…))` after "Re-enable in the monitoring UI first". |
| 8 | SQL `UPDATE 0` third cause (`:301`): `([how](…))` after "Re-enable in the UI instead". |
| 9 | SQL "Then:" bullet (`:310`): appended a link to the Test-channel warning. 0368's sentences kept, nothing struck. |
| 10 | Drill bounds bullet (`:600-601`): "the already-disabled state is still uncovered and is a separate follow-up" struck + *(True until `0285` shipped check 13.)* + "now caught by check 13 (`0285`), seen to trip once on the real box (`0341`, 2026-10-01)". The `0284` half kept. |

### Claim trace — every new sentence → its support

| New claim (runbook) | Support |
| --- | --- |
| Path **Alerting → CHANNELS → the channel's row → `Unpause channel` (▶)** (items 1–4, 5) | this worklog step 3 (page, row) + step 4 (control pressed → `delivering`) |
| Use a real alert to confirm; *Test channel* is not a liveness signal (item 2) | step 4, *Telegram arrival* |
| `PAUSED` takes the same control, returns to `delivering`, seen 2026-10-01 (item 4) | step 5 |
| `DRAFT` never looked at; what the UI offers for it unknown (items 4, 5) | absence: steps 3–5 looked only at `disabled` and `paused` |
| "finish saving it in the monitoring UI" for `DRAFT` (item 4) | carried from the pre-0369 line, not a new claim |
| Official route; SQL stays the fallback (item 5) | brief § *Step 6* input note ("keep it, as the fallback, not the official route") |
| Row `alerts-to-telegram`, type webhook; 🔴 `disabled` / ⚪ `paused` (item 5 step 1) | step 3; step 5 |
| Action names from hover/tooltips, order *Test · Unpause · Edit · Delete*; `Pause channel` (⏸) while `delivering` (item 5 step 2) | step 3 |
| Reload, row reads `delivering` (item 5 step 3) | step 4 ("confirmed after a page reload") |
| Probe `channel state: delivering`, `checks.sh` `alert-channel-state … OK` (item 5 step 4) | step 4 (15:38:51, 15:39:10) |
| Seen once, one host, one UI version (item 5 bounds) | *What this does NOT prove* |
| `disabled` set by SQL as in `0341`; vendor-written disable not seen | step 2 + *What this does NOT prove* |
| *Edit channel* not opened (shows the secret); status control there unknown, not needed | step 3 |
| Real alert 🚨 17:29 / ✅ 17:30 UTC after the UI re-enable | step 4, throwaway-monitor drill |
| 3 presses 15:34, 15:43, 16:07 UTC; nothing reached Telegram (item 6) | step 4 (15:34:37, 15:43:04, 16:07:38) |
| Relay counter showed no call at those times | step 4 |
| 14:31 press (`0341`, after the SQL re-enable) arrived, counted `sent` | step 4 |
| Cause unknown; container log shows nothing for any press | step 4 |
| Not investigated further (owner ruling, 2026-10-02: warning only) | `plan.md` header, owner ruling Q2 |
| Whether the re-enable route matters is not known | step 4 ("Cause: unknown") — states an unknown, claims no cause |
| The drill delivered 🚨 and ✅ the same afternoon | step 4 |
| Already-disabled state now caught by check 13, tripped once on the real box (`0341`, 2026-10-01) (item 10) | not this worklog: the runbook's own check-13 bounds (HEAD `:180-187`, `0341`) |

**Cuts: none** — every new sentence has a source above.

### Verification

1. **Diff scope.** `git status --porcelain` baseline before starting: one line only, `?? …/0369-…/plan.md`. ⚠️ The
   driver's prompt said the tree also held uncommitted Sprint 7 board + wiki-vault edits — **the baseline showed
   none.** After: the runbook and this `worklog.md` modified, `plan.md` still untracked and unmodified (blob
   unchanged). Runbook hunks (`git diff -U0`): `-47,0 +48,2` · `-219,0 +222,4` · `-224 +230,3` · `-229 +237,5` ·
   `-252,0 +265,43` · `-255 +310,2` · `-301 +357,2` · `-310 +367,2` · `-600,2 +658,3` — items 1, 2, 3, 4, 5+6, 7,
   8, 9, 10. Nothing else.
2. **Untouched passages byte-identical to HEAD** (each HEAD range checked line by line with `grep -qxF` and as one
   contiguous block): SQL code block `:264-280` (17 lines) · caveats 1–3 `:312-324` (12) · check-13 bounds
   `:177-187` (11) · whole check-13 section `:124-176` (47) · probe bounds `:97-103` (7) · drill procedure
   `:564-578` (14) · drill bounds A1 + `0283` `:593-598` (6) · the `0284` bullet's first line `:599` (1) · IDLE /
   *What is still unproven* `:638-666` (25). **0 missing, every block present contiguously.**
3. **Claim trace** — table above; no cuts.
4. **Anchors.** Scratchpad script (not in the repo): GitHub-style slugs for all 30 headings (fenced blocks
   skipped), every `](#…)` checked. 12 links, 4 distinct targets, **all resolve**:
   `re-enabling-a-channel-in-the-monitoring-ui` (5) · `re-enabling-a-disabled-channel--sql-fallback` (4, existing,
   heading unchanged) · `the-test-channel-button-is-not-a-liveness-signal` (2) ·
   `the-working-drill-procedure--reusable-run-it-again-whenever-you-need-to` (1). No file in the repo links into
   the runbook by anchor (`grep` for `alert-delivery-runbook.md#` → 0).
5. **Secret grep over the 58 added lines** (URLs, IPv4, chat/topic-id shapes, bot-token shape, long
   hex/base64/opaque strings, domain suffixes, `token=`/`secret=`/password/DSN, email shapes). Raw hits were only the
   anchor slugs and the metric name `geoconflict_profile_alert_relay` (long-string pattern); with those removed:
   **zero hits.** `alerts-to-telegram` and the metric name already appear in the runbook at HEAD. No screenshot
   involved.
6. **`npm test` not run — not affected.** `grep -rln alert-delivery-runbook tests scripts` → 0 files.

### Decision log (calls made without asking, under the approved plan)

All are wording/placement calls inside the plan's items; none changes a claim or the scope.

- **Item 1 placement:** the appended UI-path sentence sits after the SQL pointer and **before** the
  `_(Owner ruling B …)_` attribution line, so that line still closes the paragraph it attributes. Qualified:
  mechanical, in-plan ("Append" after the kept text).
- **Item 5 step 4 wording:** "Do step 6 of *When `alert-channel-state` fails* above" instead of the plan's
  shorthand "channel-state step 6" — the subsection now sits between two numbered lists, so the bare "step 6" was
  ambiguous. Qualified: obvious winner, same meaning.
- **Item 6 ruling wording:** the plan's "(owner ruling Q2: warning only)" written as "(owner ruling, 2026-10-02: a
  warning only)" — "Q2" means nothing to a runbook reader. Qualified: obvious winner, same fact.
- **Item 9 link text:** "See [The Test channel button is not a liveness signal](…)." Qualified: mechanical (plan:
  "append a link").
- **Item 3 line wrap:** re-wrapped only the edited line (leaves a short "disabled it — usually a" line) rather
  than reflowing the unchanged lines after it. Qualified: mechanical; keeps the diff to the planned hunk.

No commit, no push, no wiki write, no task move. Step 6 ⇒ brief verification 6 and the runbook half of 8 now
done; next is the stateful review (task `0369`).

## Step 6, review round 1 — process review (`fkit-coder`, 2026-10-02)

**Written by a spawned `fkit-coder` (Process-review worker), called by `fkit-sprint-ship-loop` driven by `fkit-lead`,
under the loop's declared-approval marker** (`plan.md` blob `aa60355f…` re-checked — matches). Ledger: `review.md`
round 1, 4 low findings (R1–R4). No accepted residuals existed; no ADR in `decisions/` covers runbook wording. Verdicts
and actions are in `review.md` § *Coder response*; ledger set to `Status: closed-out`. Runbook only; no code, no
commit.

### Decision log (fixes applied without asking, under the standing approval)

Each qualified as **verified `CORRECT` (R2: the substance), mechanical/localized wording, inside the approved plan**
(items 5, 6, 10 — the plan's own rule "every new sentence traces to the worklog; nothing in the runbook is a guess").
No obvious-winner call beyond these; nothing outside the plan.

- **R1** (Test-channel warning names only SQL-vs-UI as a difference). Changed: § *The Test channel button is not a
  liveness signal* — added a bullet that all 3 presses came after a Pause → Unpause (~15:34:01 UTC), the first ~36 s
  after it; the closing "not known" sentence now names both the re-enable route and that Pause → Unpause. Why it
  qualified: verified against step 4 ("15:34:37, 15:43:04 and 16:07:38") and step 5 ("at ~15:34:01"); adds a fact,
  claims no cause (ruling Q2 intact).
- **R2** (Edit page "shows the channel's secret" stated as fact). Changed: § *Re-enabling a channel in the monitoring
  UI* bounds — now "it was expected to show the channel's secret. What it shows, and whether it has a status control,
  is unknown — and not needed." Why it qualified: Edit was never opened (step 3), so the contents are unseen; the
  reviewer's sub-claim that no source said it is wrong (step 3 and the brief both say it — as the reason, not a
  sighting), hence PARTIALLY CORRECT; the fix narrows a claim, adds none.
- **R3** ("The official route" readable as vendor-documented). Changed: same subsection's first line → "This
  runbook's first choice (task `0369`; seen on the live UI, not taken from vendor docs)." Why it qualified: step 0
  skipped by owner ruling, no vendor docs read; meaning unchanged (SQL stays "A fallback, not the first choice").
  ⚠️ This departs from plan item 5's literal words "The official route" — a wording change inside the item's intent.
- **R4** (ambiguous "It" in the item-10 bullet). Changed: "It is now caught by check 13" → "The already-disabled
  state is now caught by check 13". Why it qualified: pronoun fix, no claim change.

The step-6 claim-trace table above still lists "Official route" and "(shows the secret)" — it records what was
written then; this section supersedes those two rows.

### Checks re-run after the fixes

- Anchors: scratchpad slug script — 12 links, 4 distinct targets, 0 unresolved.
- Secret grep over all 69 lines the runbook adds vs HEAD (same patterns as step 6): 0 hits after the known anchor
  slugs and metric name are excluded.
- 0368's / untouched passages, each HEAD block found contiguous and byte-identical in the working file: SQL code block
  (HEAD 264-280), caveats (312-324), check-13 bounds (177-187), check-13 section (124-176), probe bounds (97-103),
  drill procedure (564-578), drill bounds A1 + `0283` (593-598), `0284` bullet first line (599), IDLE / *What is still
  unproven* (638-666) — all OK.
- Round-1 diff vs the pre-fix file: 5 hunks, all in the four cited places.
