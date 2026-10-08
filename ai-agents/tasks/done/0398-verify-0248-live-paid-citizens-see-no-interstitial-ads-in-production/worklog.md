# Worklog — 0398 Verify 0248 live: paid citizens see no interstitial ads in production

## 2026-10-08 — gates, deploy, owner's live checks (in progress)

Recorded by `fkit-lead` in the owner's session. Checks run by the owner on production (game `0.0.157`); readings are
the owner's reports and console screenshots. No token, id, response body or URL recorded.

### 1. Gates (verification step 1)
1. `0396` passed — ✅ 2026-10-08: verified paid account → `is_paid_citizen: true`; `vfy:false` session → S1 view
   ([`0396` worklog](../0396-verify-0250-s3b-live-deploy-the-verified-owner-view-and-confirm-it-in-production/worklog.md)).
2. `0397` in the same deploy — ✅ game `0.0.157` carries both (owner ruling R3).
3. `0248` committed — ✅ (on `dev`, in the deployed game image).
4. Weekend slot — **mid-week exception, owner's call** (Thu 2026-10-08).

### 2. Deploy (verification step 2)
- Game client **`0.0.157`**, commit `c12cd8e`, image `20261008-095100`, container started **2026-10-08T06:56:17Z**.
- **Rollback target:** `20261003-123251` (`0.0.156`) — registry only (pruned from the box, runbook F-D). Client
  rollback alone is safe for ads (the old client shows ads to everyone) but, with the S3b server live, `0397`'s Q4
  pairing also needs `citizenship_ui` off — see `0396`'s worklog § *Rollback rules*.

### 3. Owner's live checks

**Check 1 — verified paid account, the six placements — ✅ all six passed** (console filter `showInterstitial`; one fresh session; the
citizenship card was visible, i.e. flags loaded):

| # | Placement | No ad + *"showInterstitial __ suppressed for a paid citizen"* |
|---|---|---|
| 1 | Public lobby join | ✅ yes — `showInterstitial __ suppressed for a paid citizen` at 09:36:00Z (local 12:36), no ad (owner). |
| 2 | Mission start | ✅ yes |
| 3 | Solo start | ✅ yes |
| 4 | Private-lobby host start | ✅ yes — at Start (with a second account joined) the console showed the GameAnalytics event `Ad:InterstitialSuppressed:PaidCitizen` (09:26:42Z) and no ad. ⚠️ The match itself did **not** start: the server answered `start_game` with **403 `citizens_only`** — a separate production bug (nginx drops the `?creatorClientID=` query on worker paths, `nginx.conf` worker `proxy_pass …$2;`), recorded for the owner. The ad gate runs before the request, so this placement's check stands. |
| 5 | End-of-match exit (win/lose modal closed) | ✅ yes |
| 6 | In-game quit (sidebar exit) | ✅ yes |

Owner walked them in the order 2 → 6 → 3 → 5. Console lines at 08:54:14Z, 08:54:21Z, 08:54:27Z, 08:54:56Z (local
11:54 Moscow), each `showInterstitial` followed by `showInterstitial __ suppressed for a paid citizen`; the owner
reported no ad shown at any of the four.

- Check 2 (analytics event `Ad:InterstitialSuppressed:PaidCitizen`) — _pending, read later in GameAnalytics_.
- **Check 3 (non-paid → ads requested)** — ✅ **yes**, run as a **guest** (logged out, incognito). Owner: *"ads shown when can be"*; otherwise the console showed `showInterstitial __ showFullscreenAdv __ BEFORE`, then `onError __ error: Error: Fullscreen ad skipped: too frequent requests` and `onClose __ wasShown: false` — **Yandex's own frequency cap**, expected per this brief (judge by the request line). ⚠️ Which placements were walked was not itemised by the owner.
- **Check 4 (earned-only citizen → ads requested)** — ✅ **yes**, same result as check 3 on the owner's earned account (ads shown when Yandex allowed; otherwise `BEFORE` + the frequency-cap skip). ⚠️ Placements not itemised.
- No non-paid session ever printed the *suppressed* line (owner report).
- **Check 5 (kill switch → ads return)** — ✅ **yes** — owner, 2026-10-08, flag off → on within ~5 min ending ≈09:48Z (owner gave no exact times: *"The changes in the flags are done almost immediately, so I can't tell you exact timestamps, but it's just happened (the whole process took 5 min or less)"*). Owner, verbatim: *"everything worked as expected (no card, interstitials are shown - when the flag was disabled)"*. With the flag off, the paid account got interstitials (ads requested/shown, not suppressed). One flip served both `0398` and `0400`. ⚠️ Exact off/on times not recorded.

### ⚠️ Found during these checks — a page load where the flags never arrive
On one load the citizenship card was missing entirely. Owner's console (throttling off): the Yandex SDK reported
*"too long resolve for method 'get_flags/fetch'"* and the game logged `loadExperimentFlags __ error: Error: getFlags
timed out`. On such a load `citizenship_ui` reads off for the whole session, so the paid-citizen ad suppression is off
too (fails open for ads, by design `0236`) — **a paid citizen sees ads until a reload**. Check-1 readings above come
only from a load where the card was visible. Filed as **`0411`** (Backlog; owner ruling: suggest a reload, reuse
`0397`'s Restart button). Frequency not yet measured (the error is a GameAnalytics `Debug` event).

### Check 2 — analytics (verification step 4)
- Source: GameAnalytics Explore through the owner's Chrome (owner logged in himself), **read-only, nothing saved**; Design events, aggregation Count, "Past 7 days" + **current day included**, read about 11:39Z on 2026-10-08. ⚠️ GA showed its **"Demo mode" banner** on every page (as on 2026-09-29 and 2026-10-05). Today's numbers are a **partial day**; the owner's 10:56Z test purchase already appears, so data was near-current.
- **`Ad:InterstitialSuppressed:PaidCitizen` — seen ✅. Count 2026-10-08: 24** (partial day). Count 1–7 Oct: none (N/A) — the event did not exist before this deploy, as expected.
- For scale: `Ad:Interstitial` 2026-10-08: 2,720 (partial day). The suppressed count is an **upper bound** on ads given up (it counts requests; Yandex's cap would have declined some).

## 2026-10-08 — close

Closed `✅ Done (agent-closed — not owner-verified)` by a spawned `fkit-producer` (no owner channel, ADR-021/037) via `/fkit-task-done`, on the OWNER RULING given live 2026-10-08 in the `fkit lead` session, relayed by `fkit-lead`, verbatim *"Close them"*. The owner ran the live checks; the close itself is agent-run, hence the marker.
- Carried as recorded above, not resolved: checks 3 and 4 do not itemise which placements were walked; check 5's flag off/on times are approximate (~5 min ending ≈09:48Z), not exact.
- Follow-ups filed during the checks: `0411` (flags-fetch timeout load), `0416` (private-lobby start 403).
