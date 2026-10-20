# GameAnalytics event-volume spike log

Running log for task `0458` (*Monitor GameAnalytics for event-volume spikes*). One dated entry per check, newest
last. Monitoring only — no fixes, nothing dropped or filtered (owner's constraint: events from **all builds** keep
being collected). Every figure is read off the GameAnalytics UI on the date given. No game key, numeric game or
dashboard id, URL, user id or token is written here.

~~⚠️ This file's location, the spike threshold and the cadence are the producer's proposals in `0458`'s brief —
**owner's open questions 1–3**, not yet ruled.~~ ✅ **Owner-ruled 2026-10-20** (*"Accept all three (Recommended)"*, live
`AskUserQuestion`, relayed; recorded in `0458`'s brief): about once a month; spike = `Platform` ÷ sessions ≥ 1.5 (absolute ratio — confirmed by a second owner ruling
the same day, *"Ratio 1.5 or more (Recommended)"*); this
file is the log. Each check is one task instance; the next one is `0473`.

---

## 2026-10-20 — check 1 (window 2026-10-13 … 2026-10-19)

Read ~10:00–10:30Z in the owner's Chrome (owner logged in himself), by a Claude Code session, owner OK *"Browser
checks (Recommended)"*. Explore · Design · Count · Event id 01 = `Platform`, by day; and predefined
**"Session Count (started)"**, by day. "Past 7 days" (current day excluded). Dashboard timezone: not read (assumed UTC,
not checked). **"Demo mode" banner: shown.** No "Limit Exceeded" banner seen; the Integration chart showed no
"Limit reached" badge.

| Day | `Platform` | Sessions started | Ratio | |
|---|---|---|---|---|
| 13 Oct | 21.35K | 23.07K | 0.93 | |
| 14 Oct | 21.96K | 23.93K | 0.92 | |
| 15 Oct | 21.42K | 23.50K | 0.91 | |
| 16 Oct | 22.92K | 27.57K | 0.83 | (game 0.0.165 deployed ~12:17Z) |
| 17 Oct | 18.65K | 21.10K | 0.88 | |
| **18 Oct** | **30.02K** | **19.34K** | **1.55** | ⚠️ **spike** (≥ 1.5, the proposed threshold) |
| 19 Oct | 19.75K | 21.61K | 0.91 | |

### Spike: 18 Oct 2026

- **Size:** `Platform` 30.02K vs sessions 19.34K → ratio 1.55 (normal ≈ 0.9). Events per active user (Integration
  chart *"Total number of events per active user (per day)"*): **≈ 140**, read off the chart by eye (no tooltip
  value) — other days ≈ 115–122; far under the 500 limit.
- **Build split (`Platform`, Count):** 0.0.165 **29.79K**; every other build ≤ 48 (0.0.164 48, 0.0.163 38, …). ⇒ the
  extra events are tagged with the **current** build — unlike the earlier spikes (`0456`), which were old-build tagged.
- **Country split (`Platform`, Count):** **IE (Ireland) 13.09K** — on every other day of the window IE is 2–17; RU
  11.43K (normal range 11.9K–14.8K). Everything else in its normal range. ⇒ the excess is almost entirely IE.
- **Unique users for IE that day (`Platform`, Unique users):** **3**. ⇒ ≈ 4,400 `Platform` events per IE user, vs about
  3–4 per user normally. A few heavy sources, not many players.
- What those 3 sources are (a looping client, a bot, a crawler, a test device) — **could not be determined** from the
  UI; not investigated (monitoring only).
- **Banner at the time of the check:** no "Limit Exceeded" banner; no "Limit reached" badge on the Integration chart.

**Result: one spike (18 Oct), small in total volume, caused by ≈ 3 users in IE on build 0.0.165.** Nothing was saved,
exported, shared or changed in GameAnalytics for this check.
