# 0456 — GameAnalytics "500 events per active user per day" limit: findings and fix options

**Task:** [`0456`](../../tasks/done/0456-investigate-and-plan-the-fix-gameanalytics-500-events-per-user-per-day-limit-exceeded-again/brief.md)
· **Absorbs (conditionally):** [`0230`](../../tasks/backlog/0230-investigate-3-4-sep-gameanalytics-per-user-event-spike/brief.md)
· **Written:** 2026-10-14 by `fkit-coder` (Build worker, part C, spawned by `fkit-sprint-ship-loop`)
· **Revised:** 2026-10-14 (part D) after the reviewer's ephemeral pass (findings R1–R10) and a second short
GameAnalytics read (session counts). The mechanism verdict **changed** in this revision (§7, §10); fix-option letters
were re-assigned (§12).
· **Inputs:** the task's [`worklog.md`](../../tasks/done/0456-investigate-and-plan-the-fix-gameanalytics-500-events-per-user-per-day-limit-exceeded-again/worklog.md)
— pre-pass, full code read, the *Sitting record (2026-10-14)* with its *second short read* addendum, and the
*Revision (post-review)* note (all raw figures live there).

**Labels used throughout.** **[obs]** = read off the GameAnalytics UI on 2026-10-14 (in the owner's Chrome, owner
present, read-only). **[prior obs]** = a figure recorded by `0224`/`0230` in September, not re-read. **[code]** = code
fact, file:line at production tag `0.0.164` unless another tag is named. **[inference]** = my reading or arithmetic;
not proven. SDK citations are to `node_modules/gameanalytics/dist/GameAnalytics.node.js`, version **4.4.7** — the
version `package-lock.json` pins at `0.0.164` (and at `0.0.136`, `0.0.140`, `0.0.151`, `0.0.154`), and the one installed.
🔒 No key, game/dashboard ID, URL containing one, user id or token appears here. The GameAnalytics keys are cited by
location only (`src/client/flashist/FlashistFacade.ts:898-901` at `0.0.164`).

## Summary

- **Breach day: 12 Oct — 1,822.3 events per active user [obs]**, against ~106–121 on the days around it. 7–11 and
  13 Oct were under the limit. The banner the owner saw on 14 Oct is about 12 Oct.
- **What the excess is:** extra copies of the **once-per-page-load events** (`Session:Start`, `Device`, `Platform`,
  `Player`, `Experiment`, …) with nothing after them — no clicks, no matches. ~86.6 % of the extra `Platform` events
  carry **old build strings** (`0.0.136`, `0.0.140`, `0.0.151`, `0.0.154`), the rest the live build; all from Russia
  [obs + inference].
- **New in this revision — they were not new page loads.** A real page load starts one GameAnalytics session (normal
  days: sessions ≈ 1.07–1.10 × `Platform` count). 12 Oct had ~844K extra `Platform` events but **normal sessions:
  21.75K**, against 16.05K–25.47K on the other days of that week [obs + inference]. 26 Sep, 4 Sep and 9 Sep — the other
  biggest `Platform` days — are also not among the top 20 session days [obs].
- **Leading explanation: the GameAnalytics SDK re-sending events it already has queued** [code + inference]. Every
  8 s it marks every queued event "new" again and sends it; it deletes a batch only if *that same* request answers OK
  before the next 8-s tick; an empty answer resets the batch to "new". So an upload that takes over 8 s, or whose
  answer is lost, is sent again every 8 s, with no end (`GameAnalytics.node.js:3105-3114`, `:3168-3208`, `:3570-3581`).
  And the queue is **shared by all our builds** in a browser: it lives in `localStorage` under the game key, which is
  the same at every tag checked, and each queued event keeps the build string of the page that made it (`:1661`,
  `:2014-2053`, `:3245-3256`). So a browser now running the live build can re-send events an old-build page queued long
  ago — which would explain old build strings without any old copy of the game running [inference].
- **Not proven.** Whether GameAnalytics drops duplicate `event_uuid`s, how it dates an event whose `client_ts` is
  weeks old, and whether its session count counts `user` events or distinct session ids — all unknown. The rate is
  also unexplained: ~121.8K copies of one event per build in a day is ~11× what one open page can re-send (≤ 10,800 a
  day at one send per 8 s) [inference]. **Which browser(s) it is was not identified.**
- **The earlier reading (automated clients loading old copies of the game) is weaker now, not excluded.** It needs
  ~844K real page loads that started no GameAnalytics session. Old-build copies can exist — the repo is **public**, and
  anyone's production build of an old commit reports to our GameAnalytics under that build string (§4, §8).
- **Smaller spike days are mixed:** 19 Sep, 3 Oct, 3 Sep and 28 Sep show ~+10–20K extra sessions over a ~20.6K
  baseline, so some real extra loads (or counted re-sent session starts) — but still only ~9–16 % of their extra
  `Platform` events (19 Sep: ~+228K `Platform` vs ~+20K sessions) [obs + inference].
- **It has happened before, roughly weekly since late August** (2–10 days apart): `Platform` spikes on 25 Aug,
  3–4 Sep, 9 Sep, 19 Sep, 26 Sep (the biggest, 1.52M), 28 Sep, 3 Oct and 12 Oct [obs]. **4 Sep had the same shape**
  (half on `0.0.136`).
- **The arithmetic covers the whole excess** on 12 Oct (≈ 9.95M extra events ÷ ≈ 844K extra `Platform` events ≈ 11.8
  each) — **consistent with** a code-based estimate of the once-per-page block for that day's build mix (~11, +2 SDK
  events if they count); 4 Sep ≈ 10 [inference].
- **`0230`'s four hypotheses (§11):** 1 (owner's dev testing) **refuted**; 2 (`DEPLOY_ENV` fail-open) **refuted only
  in `0230`'s narrow wording** — the channel is real and open (`0226`) and, with a public repo, open to anyone; 3
  (client re-entry) **refuted for our code re-running the block**, but **open, and now the leading explanation, if read
  as "any client-side repeat of those events"** (the SDK re-send); 4 (something else) **confirmed only in that the excess
  lies outside 1–3 as `0230` worded them** — mechanism leaning re-send, source open. ⚠️ **H3's reading is a judgment
  point for the owner.**
- **The fix question now depends on which reading holds.** If it is re-sends from a browser's shared queue, the code
  doing the sending is whatever build that browser loads today — the live build — so a guard in a new build **can**
  reach the whole spike once that browser loads it. If it is old copies running, only the live-build share (~13 %). The
  cheap read-only checks that tell the two apart come first (§10, §12 A).
- **GameAnalytics says (its docs, [obs]):** going over a limit shows an alert; *"No data will be lost"* and *"There is
  no penalty or cost"* (worded for cardinality limits). The doc does **not** say the 500-per-user limit drops or
  throttles anything.
- **Open caveats:** dashboard timezone not read; a "Demo mode" text in the page with no visible banner (same as
  `0418`); the Error category, SDK `user`/`session_end` counts, sessions by build and a per-user distribution were not
  read. **Outside scope, for the owner:** three tracked files already contain the numeric GameAnalytics game ID, in a
  public repo (§13).

---

## 1. What was seen

All [obs], read 2026-10-14 in the owner's Chrome, read-only (no Save, Export, Share, alert or report; no setting
changed; banner not dismissed). Full tables: worklog § *Sitting record (2026-10-14)*.

- **Timezone: not captured.** Dates are as GameAnalytics labels them. GA days are usually UTC — **unverified**. Tag
  dates below are Moscow time (UTC+3), so a day boundary may shift by three hours between the two.
- **Demo mode:** every page's text contains "You're viewing data in Demo mode / Exit Demo", but **no banner was
  visible on screen**. The figures match the game's real scale (DAU 4.7–6.7K). Treated as real data; **kept as an open
  caveat**, as in `0418`.
- **Banner:** Game Home → Overview, Integration panel: *"Limit Exceeded: Total number of events per active user (per
  day) has exceeded the limit of 500. Review integration here. Learn more."* and *"Status: Collecting events…"*. The
  Integration tab's chart *"Total number of events per active user (per day)"* shows a **"Limit reached"** badge.
- **Overview tiles (as shown):** DAU 5.95K (−4.6 %), Playtime 2h 56m, New Users 2.93K, Sessions 25.84K.
- **Integration tab, "Total events sent yesterday" (13 Oct):** Design events 668.66K; every other event type "Not
  tracking".
- **Design cardinality:** ~170–190 distinct names a day, 7–13 Oct, flat; no dropped events shown.
- **Sessions (second short read):** Explore → predefined *"Session Count (started)"* (event category Session Start,
  aggregation Count), 7–13 Oct and the past 90 days — §2.

## 2. Breach day, trend, DAU and totals

| Day | Events / active user [obs] | DAU [obs] | Total events (≈ ratio × DAU) [inference] | `Platform` count [obs] | Sessions started [obs] |
|---|---|---|---|---|---|
| 7 Oct | ~110 (chart, not hovered) | 6.12K | ~0.67M | 21.14K | 22.64K |
| 8 Oct | ~110 (not hovered) | 6.37K | ~0.70M | 22.76K | 24.26K |
| 9 Oct | ~110 (not hovered) | 6.70K | ~0.74M | 23.73K | 25.47K |
| 10 Oct | ~110 (not hovered) | 5.29K | ~0.58M | 18.21K | 19.86K |
| 11 Oct | 106.2861 | 4.71K | ~0.50M | 14.57K | 16.05K |
| **12 Oct** | **1,822.3173** | **5,822** | **~10.61M** | **863.89K** | **21.75K** |
| 13 Oct | 121.4939 | 5.94K | ~0.72M | 21.35K | 23.07K |

- **The ratio trap is ruled out for 12 Oct:** DAU on 12 Oct (5,822) sits inside the week's range (4.71K–6.70K). The
  numerator went up ~15×; the denominator did not fall [obs].
- **`Platform` count = page loads, plus any re-sent copies.** `Platform:*` is created exactly once per page load,
  unconditionally [code] (`FlashistFacade.ts:947`, inside the once-per-page block `:868-966`; same block shape at
  `0.0.136` and `0.0.154`). GameAnalytics counts what arrives, so a copy the SDK sends twice is counted twice — unless
  GameAnalytics removes duplicates, which is unknown (§7). On normal days the count tracks sessions closely
  (sessions ÷ `Platform` = 1.07–1.10 on 7–11 and 13 Oct), so there it is a fair page-load count. Normal days: ~3.6
  page loads per active user (13 Oct: 21.35K ÷ 5.94K) [inference].
- **12 Oct breaks that link** [obs + inference]: sessions ÷ `Platform` = 0.025. Real loads at the normal ratio would
  have shown ~910K extra sessions; sessions were ~21.75K, against a mean of 21.89K on the other six days.
- **Recurrence, 90 days** [obs]:
  - `Platform` count: normal days ~11.8K–28.4K. Top days: 26 Sep **1.52M**; 12 Oct **863.89K**; 4 Sep **573.88K**;
    9 Sep **518.81K**; 19 Sep **248.47K**; 28 Sep 124.97K; 3 Oct 124.75K; 3 Sep 115.48K; 25 Aug 93.73K; 29 Aug 37.54K.
  - Sessions (16 Jul–13 Oct): total 1.85M, mean 20.58K/day, range ~12.99K (2 Aug) to **40.86K (19 Sep, the max)**.
    Top days: 19 Sep 40.86K; 3 Oct 37.15K; 3 Sep 30.91K; 14 Sep 30.47K; 28 Sep 30.23K; 5 Oct 28.36K; 19 Aug 26.98K;
    9 Oct 25.47K; 25 Sep 25.25K; 2 Oct 25.07K; 31 Aug 24.88K; 8 Oct 24.26K; … 13 Oct 23.07K; 21 Sep 22.84K (the
    top-20 list ends there). **26 Sep, 4 Sep, 9 Sep and 12 Oct — the four biggest `Platform` days — are not in it**
    (all ≤ 22.84K sessions).
  - **Smaller spike days do show extra sessions** [inference, against the 20.58K mean]: 19 Sep ~+20.3K sessions vs
    ~+228K `Platform`; 3 Oct ~+16.6K vs ~+104K; 3 Sep ~+10.3K vs ~+95K; 28 Sep ~+9.7K vs ~+105K — i.e. about 9–16 % of
    those days' extra `Platform` events could be real loads. Days like 14 Sep, 5 Oct and 19 Aug reached 27–30K
    sessions with no `Platform` spike at all, so part of that +10–20K may be ordinary busy-day variation.
  - Banner sightings so far: 4 Sep, 11 Sep, 14 Oct. **26 Sep, the largest spike, was never noticed.** At ~10 events
    per extra `Platform` event it would have been roughly 2,500–3,000 events per user [inference, not read].
  - **Spikes do not line up with deploys** [code + obs]: seven of these ten days had no production tag (25 Aug,
    3 Sep, 4 Sep, 9 Sep, 19 Sep, 28 Sep, 12 Oct); 29 Aug (0.0.140), 26 Sep (0.0.152–0.0.154) and 3 Oct (0.0.156) did.

## 3. Category and event-name breakdown: 12 Oct vs normal days

"Custom event count per user", aggregation **"Mean count per event user"**, split by Event id 01 [obs]:

| Category | Normal (11 / 13 Oct) | **12 Oct** | Extra per extra `Platform` event — indicative only, upper bound per category [inference] |
|---|---|---|---|
| Player | 10.63 / 12.26 | **499.16** | **3.00** |
| Experiment | 10.58 / 13.48 | **479.72** | **2.87** |
| Profile | 14.56 / 16.22 | **268.35** | **1.55** |
| Session | 12.20 / 13.49 | **164.04** | **0.93** |
| Device | 3.58 / 4.08 | **166.65** | 1.00 |
| Platform | 3.58 / 4.08 | **166.65** | 1.00 |
| Citizenship | 3.72 / 4.26 | **166.25** | **1.00** |
| Match | 25.48 / 28.87 | 28.04 | ≈ 0 |
| Performance | 24.21 / 22.99 | 23.08 | ≈ 0 |
| Game, UI, Tutorial, Reconnect, Worker, Ad, … | flat | flat | ≈ 0 |

*How the last column is made:* (12 Oct − mean of 11 and 13 Oct) ÷ the same difference for `Platform` (162.82).
⚠️ **It is not a per-load profile.** "Mean count per event user" divides each category by **its own** senders, not by
the `Platform` senders, so each row is scaled by a different group. Where a category has fewer senders than
`Platform`, its row overstates — hence "upper bound per category". Proof that it overstates [code]: Citizenship comes
out at 1.00, yet a `Citizenship:*` event **cannot** fire on three of the four old builds — `0.0.136` has no Citizenship
event; `0.0.140` and `0.0.151` have the strings but the card is compiled off (`CITIZENSHIP_CARD_ENABLED: false`,
`0.0.140:FlashistFacade.ts:182`, `0.0.151:FlashistFacade.ts:184`; the card returns early,
`0.0.140:CitizenshipCard.ts:76-79`); it is on only from `0.0.154` (`0.0.154:FlashistFacade.ts:232`).

**What one extra `Platform` event comes with** [code-based estimate + inference]:
- **The once-per-page block, in full:** `Session:Start`, `Device:*`, `Platform:*`, ~3 `Player` events (New/Returning,
  DaysPlayed, YandexLoggedIn/Guest/Unknown — `FlashistFacade.ts:950-964`, `:1160-1174`) and ~3 `Experiment:*` (one
  per Yandex flag, `:1574-1584`). That is **~9 Design events per load on `0.0.136`/`0.0.140`/`0.0.151`**; builds
  `0.0.154`+ add a Profile login (~1.5 events; `ProfileSession.ts:190-208`) and one Citizenship event, **~12–13**
  (reviewer's code-based estimate; not re-derived per build here). Weighted by 12 Oct's mix (~3 × 121.8K extra on
  ~9-event builds, ~479K on ~12.5-event builds) that is **~11**, +2 SDK events (`user`, `session_end`) if they count.
  The measured **11.8 is consistent with it** (§10).
- **Then nothing:** Session ≈ 0.93 means `Session:Start` only — no `Session:FirstAction`, no 5-minute
  `Session:Heartbeat` (`Main.ts:214-220`, `:667-683`). UI, Match, Game and Performance did not move: **no click, no
  match, under 5 visible minutes** — or, under the re-send reading (§7), no new activity at all, only copies of
  events made at page start.
- It carries Yandex experiment flags, which our code only logs when the Yandex SDK returned flags [code]. Whether the
  SDK can return flags outside a real Yandex Games frame was not established [inference].

**Same shape as September** [prior obs, `0230`'s table, per extra `Platform` event 2 → 4 Sep]: Player 3.32,
Experiment 2.97, Session 0.97, Device/Platform 1, UI 0.014, Match 0.05. Same once-per-page family, same "nothing after
it" — and the same caveat on what the column means.

**Per-event-name breakdown inside Player / Experiment / Profile / Session: not read** (sitting gap). The breakdown above
is by category only.

## 4. Heavy users or everyone? The splits

**A few clients, not everyone** [obs + inference]. `Platform` count and unique users by build, 12 Oct:

| Build (tag date) | `Platform` count [obs] | GA users [obs] (11 / 13 Oct) | Count per user [inference] | One every… if all users sent equally [inference] |
|---|---|---|---|---|
| 0.0.154 (26 Sep) | **365.27K** | 10 (9 / 5) | ~36.5K | ~2.4 s |
| 0.0.151 (12 Sep) | **121.78K** | 21 (17 / 15) | ~5.8K | ~15 s |
| 0.0.136 (6 Jun) | **121.76K** | 14 (18 / 15) | ~8.7K | ~10 s |
| 0.0.140 (29 Aug) | **121.75K** | 3 (6 / 4) | ~40.6K | ~2.1 s |
| 0.0.163 (10 Oct, **live**) | 132.95K | 5.17K (4.04K / 4.54K) | ~25.7 (11 Oct: ~3.5) | — |
| every other build | < 200 each | — | — | — |

The last column assumes the count is spread evenly over 24 h; the hourly view was unavailable, so that is unknown.

- **Old build strings: 730.56K of ≈ 843.6K extra `Platform` events (≈ 86.6 %)**, from builds with 48 GA users between
  them — 0.8 % of DAU [inference].
- **The spike added no visible users to those builds** [obs + inference]: 21 / 14 / 10 / 3 users on 12 Oct against
  17 / 18 / 9 / 6 on 11 Oct and 15 / 15 / 5 / 4 on 13 Oct. The same small groups are there every day. So the "count
  per user" column assumes every one of them took part; **the whole spike could equally come from one or two
  browsers** counted among them. A per-user distribution was not read.
- 🔎 **The counts are machine-like** [obs, read precisely]: three builds with 21, 14 and 3 users have **121.78K,
  121.76K and 121.75K** — within 0.03 % of each other — and `0.0.154` has **365.27K = 3.000 × 121.76K**. A bug in our
  page code would scale with how many clients hit it and for how long; it would not give three different user groups
  the same count to four digits [inference]. Two readings fit: **(R) one queue of events re-sent as a block** — every
  event in it gets the same number of copies, so builds with the same number of queued loads get equal counts and one
  with three times as many gets 3× (§7); **(C) one source loading each old build at a fixed rate**. Neither explains
  *why* the builds would hold equal shares.
- **The live build's share is not attributed.** `0.0.163` had ≈ 113–115K extra `Platform` events on 12 Oct (132.95K
  minus a normal 3.5–3.9 per user × 5.17K) [inference] — close to, but ~6 % under, the 121.76K "unit". Consistent with
  the same source, **not shown**.
- **Country:** RU went 13.41K → **856.82K**; every other country was flat on 12 Oct [obs]. RU accounts for the whole
  excess. (GameAnalytics sets country from the sending connection, so this is where the sender is, not where the
  events were first made.)
- **No `*-dev.N` build** in any build split read (7–13 Oct, 3–5 Sep) [obs].
- **Custom dimension 02 (yandex/web) is `null` every day** [obs] — and the code explains why [code]: the facade calls
  `GameAnalytics.setCustomDimension01/02(...)` (`FlashistFacade.ts:894-895`) but **never registers the allowed values**
  (`configureAvailableCustomDimensions01/02` is not called anywhere at the tag), and the SDK rejects any value not in
  the registered list with a warning (`GameAnalytics.node.js:1126-1143`, `:4040-4060`). So **both custom dimensions
  have never worked**, and the mobile/desktop and yandex/web splits were never available. **Task
  [`0212`](../../tasks/backlog/0212-investigate-tutorial-abandonment-by-platform-segment/brief.md) found this gap
  first, in September** (its brief: `configureAvailableCustomDimensions01/02` never called; runtime behaviour not
  verified there). This read adds the SDK lines that confirm the rejection. (Custom 01 was not read in the sitting;
  same code path.)
- **Not determinable:** time of day (the "Hour(s)" view is greyed out); browser/OS splits; sessions by build (not read).

**Old build strings do not by themselves mean old code is running** [code + inference]. The build string is stamped
on an event when it is **created** (`GameAnalytics.node.js:2052`, applied at `:3245`), stored with it, and sent as
stored (`:3149-3161`). The SDK queue lives in `localStorage` under a key made from the game key (`:1661`, `:1672`,
`:1763`); the key literals are **identical at `0.0.136`, `0.0.140`, `0.0.151`, `0.0.154` and `0.0.164`** (compared by
hash, values not printed), and every one of those tags pins SDK 4.4.7. So every build on a browser shares one queue,
and a page of today's build loads and sends whatever earlier pages left in it (`:2118`). The old-build events can come
from:

1. **A browser's queued events, re-sent by a later page** (whatever build it now loads) — the re-send path in §7.
   **The leading candidate for the big spike days**, given the session counts (§2).
2. **Old code actually running**, which needs an old copy of the game somewhere other than our server:
   - **Anyone's production build of an old commit — the most direct way such copies exist.** The repo is **public**
     (`gh repo view` → `PUBLIC`). The build string is the checkout's `package.json` version
     (`0.0.140:src/version.ts`; `configureBuild(version)` at `0.0.164:FlashistFacade.ts:897`), and
     `npm run build-prod` with no `DEPLOY_ENV` builds for prod and sends to our GameAnalytics (`webpack.config.js:336-337`,
     same default at `0.0.136:webpack.config.js:331-332`; `package.json` `build-prod` = `webpack --mode production`).
     A GA build string like `0.0.136` covers **every commit between version bumps** — for `0.0.136`, 6 Jun to 22 Aug.
   - A Yandex-side copy, a proxy/CDN cache we do not control, or a mirror/automation that saved the files.

**Our own server cannot be the source of old code** [code]: it only serves the current build. The image builds and
ships one `static/` (`Dockerfile:37-45`); HTML is `no-store` (`nginx.conf:262-287`, `:290-314`; and already at the
`0.0.136` tag, `nginx.conf:232-238`); JS is content-hashed. A browser that opens or reloads the game from our origin
gets the current build.

**The daily trickle of old-build events** (e.g. `0.0.136`: 16–23 users a day on 7–10 Oct with 23–76 `Platform` events
a day; 45 users with 110 on 5 Sep) [obs] fits both: old copies used now and then, **or** returning players whose
browsers still held events queued by an old build (a page closed before its first 8-s send leaves them behind) and
flush them on the next visit [inference]. Which, **not determined**.

## 5. What the limit does, in GameAnalytics' own words

From "Learn more" → "Event Tracking and Cardinality Limits", read from screen [obs]:

- Thresholds: *"Total number of events per active user (per day) 500"*, *"Cardinality of Design Events (per day)
  15000"*, *"Cardinality of Progression Events (per day) 8000"*, *"Cardinality of Resource Events (per day) 4000"*.
- *"When your event tracking limits are exceeded, GameAnalytics will alert you via the Game Overview → Integrations
  page."*
- "Starting October 1st, 2025 …": Design / Progression / Resource events over the daily **cardinality** limits are
  still collected, but their identifiers are set to "null"; *"any metrics derived from these events will not be
  accurate in the AnalyticsIQ interface"*; *"No data will be lost. The full event payload will still be included in
  Data Warehouse and Data Export for PipelineIQ users."*; *"There is no penalty or cost associated with exceeding the
  limits, however we strongly advise avoiding breaching cardinality limits…"*.
- **The doc does not say the 500-per-user limit drops or throttles events — only that an alert is shown.** It does not
  say whether SDK events (`user`, `session_end`) or Error events count toward the 500.
- Our cardinality (~170–190 distinct Design names a day) is ~1 % of the 15,000 limit [obs + inference]; the null-ing
  rule is not in play.
- The chart is **one average per day**, not a per-user list [obs]; how the limit treats an individual heavy user is not
  stated.

## 6. Repeating-emitter inventory (code at `0.0.164`)

Full tables with file:line: worklog § *Full code read*, 2.1. In short [code]:

- **116 `flashist_logEventAnalytics(` call sites** + 4 wrappers; each call = one `GameAnalytics.addDesignEvent`
  (`FlashistFacade.ts:543-566`), production builds only.
- **Once per page load (latched):** the session block (`:868-966`), `Player:Yandex*` (`:1160-1174`), `Experiment:*`
  × flags (`:1574-1584`), platform-degraded / SDK-retry events (latched), Profile login (`ProfileSession.ts:190-208`),
  `Session:FirstAction`, `Build:StaleDetected` (`BuildVersionChecker.ts:27-37`), `Session:LongSessionRefresh:*`,
  Citizenship surface/status events.
- **Once per match (latched):** start/spawn/end/result/duration families, `Ad:Interstitial` (≤ 2 per match),
  `Tutorial:*`.
- **On a timer (the only two):** `Performance:*` — 2–3 per 5 visible minutes of a match (`PerformanceMonitor.ts:29-67`),
  no cap; `Session:Heartbeat:*` — 1 per 5 minutes, max 12 per page (`Main.ts:667-683`).
- **Polls, retries, reconnects** (`PublicLobby`, `HostLobbyModal`, `JoinPrivateLobbyModal`, `Matchmaking`,
  `MultiTabDetector`, `ClientGameRunner` connection check, `Transport` ping, `TokenLoginModal`): **no Design events.**
- **Not a Design event, and uncapped: Error events.** `window.onerror` / `unhandledrejection` send every uncaught error
  to `GameAnalytics.addErrorEvent` with no de-duplication (`FlashistFacade.ts:606`, `:615-653`); the SDK does not cap
  them (`GameAnalytics.node.js:3018-3030`). Four code shapes can fire **one or more per second** while a fault lasts:
  a throw in the per-game-update path (~15/s; `ClientGameRunner.ts:661-790`, `WorkerClient.ts:70-71`), a storage
  throw in `MultiTabDetector.ts:90-99` (1/s), an unguarded `/api/env` rejection in `JoinPrivateLobbyModal.ts:483`
  (1/s), and third-party scripts in the same window. **None is shown to be happening** — the Error category was not
  read — and **none explains 12 Oct**, whose excess is fully in Design categories (§3).
- **Our code is not the only thing that repeats events: the SDK's own queue does** (§7). That path re-sends events our
  code made once.

## 7. Double init, SDK re-send, reload loops

- **Double init: no** [code]. One webpack entry with `runtimeChunk: "single"` (`webpack.config.js:179`, `:370`);
  `GameAnalytics.initialize` sits inside the per-page latch (`FlashistFacade.ts:868-871`, `:897-901`); no template
  loads a second GameAnalytics script. Two tabs or iframes = two real page loads.
- **SDK re-send: a real amplifier, and the leading explanation for the big spike days** [code + inference]. *(The
  first version of this report called it "bounded, not an amplifier" on the ground that `Platform` counts page loads,
  not re-sends. That was circular: `Platform` counts whatever arrives, and the session counts now show the extra
  `Platform` events were not new loads.)* How it works [code]:
  - Every 8 s the queue job runs `processEvents("", true)` (`:3570-3581`). Its clean-up step first marks **every**
    queued event `"new"` again — including ones already sent and waiting for an answer (`cleanupEvents`,
    `:3206-3208`, called at `:3111-3114`) — then tags up to 500 of them with a fresh request id and sends them
    (`:3115-3161`; `MaxEventCount = 500`, `:3428`; when there are more, the oldest by `client_ts`, `:3131-3143`).
  - On an OK answer it deletes **only rows still tagged with that request's id** (`:3168-3175`). If the answer took
    more than 8 s, the next tick has already re-tagged them, so nothing is deleted and they go out again.
  - An answer with an empty body counts as "no response" (`:2606-2609`) and resets the batch to `"new"`
    (`:3176-3181`) — retried every 8 s, while the collector may already have received it.
  - No request timeout exists in the SDK (no `timeout` / `ontimeout` anywhere in the 4.4.7 bundle).
  - ⇒ A browser whose uploads to GameAnalytics stay slower than 8 s, or whose answers are lost or emptied on the way
    back (a proxy, filter or extension), **re-sends the same queued events every 8 s for as long as a page is open,
    with no end** [inference from the code above].
  - The queue is in `localStorage` (saved on every insert, `:1656-1664`; loaded on initialize, `:2118`), capped at
    2,000 entries counting events and sessions (`:1466-1468`, `:1754`); past the cap only `user` / `session_end` /
    `business` are admitted (`:3240-3244`). It is **keyed by the game key, so shared by every build** (§4).
- **Do re-sent queues include session events?** [code] **Yes, they can.** The SDK's session start is a `user` event put
  in the **same** queue (`addSessionStartEvent`, `:2801-2815`). It is sent at once in its own request (`:2814`), but if
  that request is also slow or answered empty it stays queued and is re-sent with the rest; `session_end` rows too.
  So whether the re-send reading fits "Sessions stayed flat" depends on **how GameAnalytics counts sessions**: if by
  distinct session id, re-sent `user` events (same session id each time) add nothing — while every real page load has a
  new session id (`createGuid`) and would add one. If by `user` event, re-sent `user` events would have inflated
  sessions, and the fit needs the `user` rows to have got through while the Design batches stuck. **Which, unknown.**
  Either way, real page loads would have raised the session count — which is why "not new loads" is the stronger part
  of this verdict and "re-sends" the weaker.
- **What this reading explains** [inference]: old build strings with no old code running (§4); RU only (the sender's
  connection); no new users per build and DAU flat (re-sent events keep their `user_id`); no clicks or matches (only
  page-start events were queued); equal counts per build (every event in a re-sent block gets the same number of
  copies).
- **What it does not explain, or needs** [inference]:
  - **The rate.** One page sends at most once per 8 s — ≤ 10,800 copies of an event a day. ~121.8K copies per build
    on 12 Oct needs ~11 pages (tabs) re-sending all day, or ~11 queued loads per build in one page's batch, or a send
    trigger I did not find (the only other triggers are session start, `:2814`, and session end, `:2835`).
    Capacity is not the problem: one page re-sending a full 500-event batch every 8 s is ~5.4M events a day, so 12
    Oct's ~9.95M extra needs about two page-days of it.
  - **GameAnalytics not removing duplicates.** Each event carries an `event_uuid` (`:2017`); if GameAnalytics drops
    repeats, re-sends would add nothing and this reading fails. Unknown.
  - **GameAnalytics dating by arrival, not by the event's own `client_ts`.** Re-sent events keep their original
    timestamp; if GameAnalytics dated by it, copies of weeks-old events would land on old days, not on 12 Oct. Unknown.
  - **Why only on some days.** A browser's uploads would have to go bad on spike days and recover (or the browser stay
    closed) in between. Unknown.
- **Newer SDK: same code** [code, grep only]. `gameanalytics@5.0.0` is the newest on npm (checked 2026-10-14); its
  bundle has the same `cleanupEvents` and the same 8-s interval, and no request timeout. Its changelog was not read.
  So an upgrade alone is not shown to fix this. The SDK does expose `GameAnalytics.setEventProcessInterval(seconds)`
  (`:4078-4080` → `:3516-3519`) — a longer interval gives an upload longer to answer before it is re-sent, and slows
  any re-send loop by the same factor.
- **Reload loops: none** [code]. At `0.0.164` every reload/navigation site is a click, a one-shot, or latched
  (worklog 2.2 table). `LongSessionRefresh` does not force a reload (popup, then a click). `Bootstrap.ts:84-86` reloads
  at most once (sessionStorage latch). **The one built-in multiplier is one full page load per match exit**
  (`changeHref`, `FlashistFacade.ts:1240-1255`, from `MatchExit.ts:19`, `WinModal.ts:346`, `TutorialLayer.ts:318`) —
  normal behaviour, ~1 extra load per match.
- **The old builds, too** [code, targeted check — not a full read]: at `0.0.136`, `0.0.140`, `0.0.151` and `0.0.154`,
  a grep of every `location.reload` / `location.href =` site in `src/client` finds the same set: user clicks
  (`StaleBuildModal`, `AccountModal`, `TokenLoginModal`, exit buttons), a hash-dropping `#refresh` handler that
  cannot repeat (`0.0.136` `Main.ts:652-657`), and the latched `Bootstrap.ts:84-86` (from `0.0.140`; `0.0.136` has no
  `Bootstrap.ts`). No automatic loop.
- **And the data agrees** [inference]: the spike events have no UI clicks (so no click-driven stale-refresh loop), no
  matching sessions (so no reload loop of any kind), and machine-equal per-build counts (§4).

## 8. `0226` status

- **Unchanged at HEAD** [code]: `Dockerfile:23` `ARG DEPLOY_ENV=prod`; `webpack.config.js:336-337`
  `process.env.DEPLOY_ENV ?? (isProduction ? "prod" : "dev")`. `git diff 0.0.164 HEAD` touches neither. The same
  default is at `0.0.136` (`webpack.config.js:331-332`) and `0.0.140` (`:335-336`).
- **The sanctioned path is safe** [code]: `build.sh:104` passes `--build-arg DEPLOY_ENV`, `build.sh:30` allows only
  `prod`/`staging`/`dev`. The npm dev scripts run webpack in development mode, so `DEPLOY_ENV` resolves to `dev` and
  GameAnalytics is off (`package.json` `dev*` scripts → `start:client` = `webpack serve` with no `--mode production`, and
  `webpack.config.js:167` sets `isProduction = argv.mode === "production"`; checked at `0.0.140`).
- **The unsanctioned path is open to anyone** [code]: the repo is **public**, and `npm run build-prod` (`webpack --mode
  production`) with no `DEPLOY_ENV` builds for prod, with our GameAnalytics keys, and stamps the checkout's
  `package.json` version as the build string (§4). Every commit ever pushed carries this default.
- **Dev builds carry `-dev.N` versions** [code: `package.json` at `0.0.140-dev.1`]; none appeared in any split [obs].
  But a production-mode build made from a plain-versioned checkout outside `build.sh` reports the same build string as
  the live build of that version — so the build split cannot rule that out [inference].
- **Whether `0226`'s channel carried any of the spike traffic: not determinable** from GameAnalytics (§11,
  hypothesis 2). It stays a real, open channel.

## 9. Event budget

Model (worklog 2.5) [inference]: ~15 Design events per page load on the start screen (logged-in) / ~11 (guest);
~13–17 per match plus ~5 per 10 minutes of play; 2 SDK events per load; 0 Error events on a healthy load.

| Player day | Matches | Page loads | Design events (model) |
|---|---|---|---|
| Light | 2 | 3 | ~85 |
| Normal | 5 | 6 | ~190 |
| Heavy | 15 | 16 | ~540 |
| Very heavy | 30 | 31 | ~1,065 |

- **Measured normal is lower than the model: ~106–121 events per active user** on 7–11 and 13 Oct, at ~3.6 page loads
  per user [obs + inference]. The model is an upper estimate (many players are guests, play solo, or leave without a
  match).
- **Normal days have plenty of headroom** — ~114 of 500 (~23 %). The plan's suggested target (normal day ≤ ~250) is
  already met [inference].
- **Coming events fit easily:** `0451`'s `PrivateLobby:*` (≤ ~6 per host lobby cycle, ≤ ~3 per guest; user-driven) and
  room for `0299` (not built). Even +20 per user would leave a normal day under ~140 [inference].
- **To push the average to 500** [inference]: measured ≈ 114 events per user ÷ ≈ 3.6 loads ≈ **32 events per load**
  (matches included), so the average user would need **~16 page loads a day — about 4.4× today**. (The model above
  gives ~25+; that figure is the upper estimate.) Real heavy players can pass 500 alone but cannot move the average
  there; **the breaches come from spike days, not from the normal budget.**
- `Experiment:*` grows with Yandex flags, with no deploy [code: one event per flag per load, `FlashistFacade.ts:1582-1584`].

## 10. The mechanism, with evidence and arithmetic

**12 Oct** [inference, inputs all [obs] from §2–§4]:
- Normal events per user ≈ (106.29 + 121.49) ÷ 2 = **113.9**. Excess = (1,822.32 − 113.9) × 5,822 DAU ≈ **9.95M
  extra events.**
- Normal `Platform` count ≈ 20.3K (mean of 7–11 and 13 Oct). Extra ≈ 863.89K − 20.3K ≈ **843.6K.**
- 9.95M ÷ 843.6K ≈ **11.8 events per extra `Platform` event** — consistent with the code-based estimate of the
  once-per-page block for this build mix (~11 Design, + 2 SDK if they count; §3). **Extra copies of the once-per-page
  block account for the whole excess.**
- **They were not new page loads:** sessions 21.75K vs a 21.89K mean on the other six days, where real loads at the
  normal ratio would have meant ~910K more (§2).
- Of the extra `Platform` events, **≈ 730.5K (86.6 %) carry four old build strings** (48 GA users on those builds, no
  more than on the days around it); ≈ 113–115K (≈ 13.4 %) carry the live build `0.0.163`, distribution unknown.
- Without the old-build-tagged events, 12 Oct would have been roughly 114 + ~220 (the live-build excess × ~11.3 ÷
  5,822) ≈ **~330 events per user — under the limit.** Without either, ~114.

**4 Sep** [inference; 1,324.33 and the 2 / 5 Sep figures are [prior obs]; build figures [obs]]:
- DAU on 4 Sep was not read. **Estimate ~4.77K** — the sum of per-build unique users. That sum is an estimate, not a
  bound: it counts a user twice if they sent from two builds and misses users who sent no `Platform` event. (Check on
  12 Oct: `Platform` senders ≈ 863.89K ÷ 166.65 ≈ 5.18K, against DAU 5,822.) Normal ≈ (170 + 162.79) ÷ 2 ≈ 166.4 per
  user ⇒ excess ≈ 1,158 × ~4.77K ≈ **~5.5M extra events.**
- Extra `Platform` ≈ 573.88K − ~19K (4 per user normal) ≈ **~555K** ⇒ **~10 events per extra `Platform` event**,
  matching September's profile (§3). Those copies account for the whole excess. Sessions on 4 Sep ≤ 22.84K (not in
  the top 20) — so, as on 12 Oct, **not new loads** [obs + inference].
- **`0.0.136` (tagged 6 Jun, superseded on 22 Aug by `0.0.137`–`0.0.139`) had 279.56K from 45 users.** The live
  `0.0.140` had 294.24K from 4.68K users; its excess over normal (~275.5K) is **within ~1.5 % of `0.0.136`'s count** —
  the same "equal per build" fingerprint as 12 Oct, **suggestive, not shown** for the live half.
- **3 Sep breaks that pattern:** `0.0.136` 77.26K (43 users) against only ~20.5K over normal on `0.0.140` — far from
  equal. 5 Sep (clean): `0.0.136` 110 (45 users) — the same users present, quiet. The 3–5 Sep shape (ramp, peak,
  clean drop) is **described here, not explained.**

**Verdict, stated at the strength the evidence supports:**

> The spikes are **extra copies of the events a page makes when it starts** — tens of thousands of copies a day per
> build, with no play after them, from Russia, without new users or new sessions. On the big spike days (12 Oct,
> 26 Sep, 4 Sep, 9 Sep) they were **not new page loads**: session counts stayed normal. **The leading explanation is
> the GameAnalytics SDK re-sending events already in a browser's queue** — a loop the SDK enters whenever its uploads
> answer slower than 8 s or come back empty, and a queue that all our builds share, which would also explain the old
> build strings. **Not proven**: it needs GameAnalytics to keep duplicates and date them by arrival, and it leaves the
> rate (~11× one page's maximum) unexplained. Old copies of the game run by someone (the public repo makes that
> easy) remain possible, mainly for the smaller spike days, where some extra sessions did appear. **It is not a reload
> loop in our page code. Which browser(s) or source drives it was not identified.**

**What would settle it** (none of it checked; all read-only):
1. **Client telemetry (Uptrace) — the cleanest test of re-send vs old code.** Client spans carry `service.version` =
   the **running** build's git commit (`src/client/OtelBrowserInit.ts:40-41`, present from `0.0.136`). If on 12 Oct
   (or the next spike) no client spans come from the commits of `0.0.136`/`0.0.140`/`0.0.151`/`0.0.154`, the old code
   was not running and the old-build events were re-sent by a current page. If they do appear, from where and how
   often.
2. **GameAnalytics: sessions by build** for 12 Oct (the predefined "Session Count (started)" split by Build). Near
   zero on the old builds ⇒ re-sends. Also a per-user distribution or top users (counts only), and the hourly view
   (greyed out on the 7-day range; may need a shorter range). **And daily, going forward: `Platform` count ÷ sessions** —
   ~0.9–0.95 is normal; far above 1 is the re-send signature.
3. **GameAnalytics docs or support:** does the collector drop duplicate `event_uuid`s, and does it date events by
   arrival or by `client_ts`; does "Session Count (started)" count `user` events or distinct session ids.
4. **Game-server access logs** for the next spike: old code still calls relative APIs such as `/api/version`
   (`BuildVersionChecker.ts`, present at `0.0.136`); if old-build calls reach our server, their user agent, referrer
   and address pattern would identify the source. Read-only. (12 Oct may already have rotated out.)
5. **Yandex Games console** (owner): is the game an iframe URL to our domain or an uploaded archive; are older
   versions or drafts still reachable there; does Yandex run automated checks on the game.

## 11. `0230`'s four hypotheses

Strict marks — confirmed / refuted / still open — with evidence. `0230`'s rule: none may be written as a cause without
evidence.

| # | Hypothesis | Verdict | Evidence |
|---|---|---|---|
| 1 | The spike came from the owner's own local/dev testing | **Refuted** | Arithmetic: 4 Sep had ~555K extra `Platform` events (~5.5M events) in one day — one every ~0.16 s around the clock; hand testing cannot do that [inference on [obs]/[prior obs]]. Local dev runs send nothing (webpack development mode ⇒ `DEPLOY_ENV=dev`), and dev builds through `build.sh` send nothing either [code]. No `-dev.N` build in any split [obs]. 12 Oct repeats the pattern on four old builds [obs]. *(The first version also argued "no dev checkout would be running a 3-month-old build"; dropped — an old commit can be checked out, and `0.0.136` was superseded on 22 Aug, not three months earlier. H1 stands on the arithmetic and the dev paths sending nothing.)* |
| 2 | The `DEPLOY_ENV` fail-open channel made (1) possible | **Refuted only in `0230`'s narrow wording** (the channel carrying the owner's dev testing — nothing to carry once (1) is refuted). The channel itself is **confirmed to exist and is still open** (`0226`) — and, with a **public** repo, **open to anyone** | Whether any of the spike traffic came through it (a third party's production build of an old commit) is **not determinable** from GameAnalytics: such a build reports the same build string as our build of that version (§4, §8). On the big spike days the session counts point away from *any* new page loads, which also covers third-party builds being loaded [obs + inference]. |
| 3 | A per-session re-entry inside the client re-runs the once-per-session block | **Refuted for our code re-running the block. Open — and the leading explanation — if read as "any client-side repeat of the session-block events".** | Our code: the block is latched per page load [code: `0.0.164` `FlashistFacade.ts:868-871`; `0.0.154` `:433-436`; `0.0.136` runs it from the singleton's constructor]; no reload site fires automatically more than once or loops, at `0.0.164` (full read) or at `0.0.136`/`0.0.140`/`0.0.151`/`0.0.154` (targeted grep) [code]; the spike events have no clicks and no matching sessions [obs]. But the GameAnalytics SDK, which runs in the client, **re-sends already-queued events** — exactly the session-block events — every 8 s while uploads stay slow or come back empty (§7) [code], and that is now the leading reading of the big spike days [inference]. Residuals: old builds checked by grep for reload sites, not read in full; the re-send reading is not proven (§7). |
| 4 | Something else entirely | **Confirmed only in this sense: the excess lies outside 1–3 as `0230` worded them**, given those refutations | Delivery mechanism **open, leaning SDK re-send** (§7, §10, on the session counts); **source open** (which browser(s), or whether old copies also run). The 3–5 Sep shape is **described, not explained** (3 Sep breaks the equal-counts pattern, §10). *(The first version said H4 "explains the ramp, peak and drop"; that over-claimed.)* |

⚠️ **For the close condition** (cancel `0230` only if all four are answered) — **the judgment point, plainly:**
**H3 is the hinge.** If `0230` meant H3 as "*our code* re-runs the session block", all four are answered (1 refuted,
2 refuted as worded, 3 refuted, 4 confirmed as "outside 1–3") and `0230` can be closed into this report. If it meant
"*anything in the client* repeats those events", H3 is **open and leading**, so not all four are answered "refuted or
confirmed" — and the re-send reading itself is unproven. My recommendation: **put that reading of H3 to the owner**
rather than close on the narrow one; the producer's rule ("if in doubt, back to the owner") is theirs to apply. A
second, smaller point: H2's broad form (any build outside `build.sh`) is **not determinable**, not refuted.

**Data caveat 1 — categories do not sum to the daily total: likely explained, not formally reconciled.** The
category table uses **"Mean count per event user"**, which divides each category by the users who sent it, not by DAU
[obs: the aggregation name]. Summing those means therefore over-counts: 12 Oct sums to ~2,004 vs 1,822; normal days
~150–164 vs ~106–121 [inference]. September shows the same direction: 4 Sep's categories sum to ~1,380 vs 1,324.33; 2
Sep to ~202 vs ~170 [prior obs + inference]. (The same aggregation is why §3's per-category column is only indicative.)
A second, smaller gap: on 13 Oct the Integration tab's Design total (668.66K ÷ 5.94K ≈ 112.6 per user) is ~8.9 under
the chart's 121.49 — about 2.5 events per page load, close to the SDK's 2 non-Design events per load (`user`,
`session_end`). That suggests the chart may count SDK events too [inference, not confirmed].

**Data caveat 2 — the 7-day mean 581.97 vs 378.86: still unresolved.** Not re-read in the sitting.

**Could dev and production traffic be told apart?** **Partly.** The build split separates `-dev.N` builds (none
seen) and old build strings. It cannot separate a production-mode build made outside `build.sh` from our build of the
same version — one key pair and a fail-open default (`0226`) make that impossible from GameAnalytics alone. And since
re-sent events keep their old build string (§4), the build split shows which build **made** an event, not which code
**sent** it. The yandex/web dimension that might have helped has never worked (§4).

## 12. Fix options

**The key fact for every option, now with two branches** [code + inference]:
- **If the big spikes are SDK re-sends from a browser's shared queue** (the leading reading), the code doing the
  sending is whatever build that browser loads now — our server only serves the live one (§4). So **a guard in a new
  build reaches the whole spike, old build strings included, once that browser loads it** (and the cause — slow or
  emptied uploads — can return at any time).
- **If old copies of the game are running** (the weaker reading; possibly part of the smaller spike days), anything in
  the next build reaches only the live-build share (~13 % on 12 Oct); old commits cannot be changed.

Estimates below are labelled [inference] and use 12 Oct as the test case: excess ≈ 1,708 per user, of which events
with old build strings ≈ 1,250–1,500 and the live build ≈ ~220. **Option letters were re-assigned in this revision.**

| # | Option | Events removed per user per day | What is lost / costs | Notes |
|---|---|---|---|---|
| A | **Find the source with the read-only checks in §10** — Uptrace by build commit (re-send vs old code), GameAnalytics sessions by build, `Platform` ÷ sessions daily, server logs at the next spike, the Yandex console (owner) | Nothing by itself; decides which branch above holds, and so which options below work | Agent time; owner time for the console | Uptrace and the GA split are the cheapest discriminators. |
| B | **Read GameAnalytics filtered to current builds** (an Explore filter on Build) | 0 from the banner; removes ~87 % of the 12 Oct distortion from analysis | Nothing; a habit, and a note in the analytics reference | No code. Under the re-send reading the live-build copies (~13 %) stay in. The banner keeps appearing on spike days. |
| C | **SDK-level guard in new builds** — any of: (C1) `GameAnalytics.setEventProcessInterval(n)` with n > 8 s (`:4078-4080`) — gives each upload longer to answer and slows any re-send loop by n ÷ 8; (C2) on start-up, before `initialize`, drop queued events that are older than some hours or from another build (edits the SDK's own `localStorage` format — fragile across SDK versions); (C3) patch the SDK so clean-up does not re-mark rows still waiting for an answer, or add a request timeout; (C4) upgrade the SDK — **5.0.0 has the same clean-up and interval** (grep only; changelog unchecked), so not a fix alone | **Re-send branch: up to the whole excess (~1,708 on a 12-Oct-type day)** once the re-sending browser loads the new build — C3 most, C1 a factor (e.g. 30 s → ~÷3.75), C2 the backlog only. **Old-copy branch: up to ~220.** Normal day: ~0 | C1: tiny change, a slightly longer wait before events reach GameAnalytics. C2/C3: maintenance against SDK internals | Worth doing only once A confirms the re-send branch. A per-browser daily cap of the once-per-page block (old option D, now I) does **not** help here: re-sent copies were made before any cap applies. |
| D | **New GameAnalytics game (new key) for new builds** | New game: none of the old game's queued backlog — the SDK queue is keyed by game key (`:1661`), so new builds never load the old queue; old code (if any runs) keeps writing to the old game. ≈ 1,250–1,500 on a 12-Oct-type day, either branch | History split across two games; dashboards and settings rebuilt. **The keys are public** (repo and bundle), so a third party could still use the new one; "rotating" means a new key in new builds only | Under the re-send branch it clears the backlog, not the cause: a browser with slow uploads would start re-sending its new-game events (live build only) — pair with C. |
| E | **`0226`** (fail-closed `DEPLOY_ENV`) | 0 for these spikes (not determinable that any came through it, §11 H2) | — | **Not mere hygiene with a public repo:** it is the lever that stops *future* third-party production builds of new commits writing to our analytics. Every old commit stays fail-open regardless. |
| F | **Register the custom dimensions** (`configureAvailableCustomDimensions01/02` before `initialize`) — the gap [`0212`](../../tasks/backlog/0212-investigate-tutorial-abandonment-by-platform-segment/brief.md) found | 0 | Nothing | Not a volume fix: restores the mobile/desktop and yandex/web splits, which this investigation could not use, and **unblocks `0212`'s segmentation question**. |
| G | **Cap Error events per message per page** | 0 known today | Repeats of the same error beyond the cap | Guards against the four unproven storm shapes (§6). Error category not read, so value unknown. |
| H | **Drop duplicate / repeated events:** fold `Platform:*` into `Device:*` (the SDK already attaches OS and platform to every event — `GameAnalytics.node.js:2021-2025`, `:2062-2065`); send `Player:DaysPlayed` once a day, not every load (`DaysPlayedAnalytics.ts:34-38`) | Old builds: 0. Normal day **~6 (~5 %)**; ~2 of ~11 per re-sent or extra load on new builds | OS as a separate Design event (still in the SDK's own fields; whether the GA UI splits by it was not checked). Note: `Platform` is the page-load proxy this investigation used — `Device` would carry it instead | Small, safe. |
| I | **Cap the session block once per browser per day** (`localStorage`) in new builds | Re-sends: 0 (copies are made before the cap). Old copies: 0. Live-build extra loads: some, if from a few browsers (unknown). Normal day: ~(3.6 − 1) × ~8.5 ≈ **~22 (~19 %)** | Per-page-load counts of `Session:Start`, `Device`, `Platform`, `Player`, `Experiment` become per-day; any report counting them per load changes meaning | Mostly a headroom cut now, not a spike fix. |
| J | **"Am I current?" gate** in new builds: stop sending when `/api/version` ≠ own build | 0 today; re-send branch: 0 (the sender *is* current); old-copy branch: protects builds from the first one carrying it, once superseded — **only if** the copies can reach our `/api/version` (unknown) | The session block runs before the version is known; it would have to wait or buffer. Players mid-deploy lose a few events | Medium effort for a future-only, branch-dependent gain. |
| K | **Do nothing** | 0 | Spike-day averages and per-category means stay wrong on those days; banner roughly weekly | GameAnalytics: no penalty, no data loss (docs, worded for cardinality; the docs say the 500 limit only alerts). |

**Headroom target.** The plan's proposed target (normal day ≤ ~250, so a heavy player plus `0451` and `0299` stays
under 500 on average) is **already met at ~114**. The breaches are spike days, so a headroom cut (H, I) does not
prevent them.

**Coder's suggestion — a suggestion only; nothing is decided, the decision is the owner's:** A first (read-only; the
Uptrace and GA-sessions-by-build checks decide the branch) and B as a habit. **If A confirms re-sends:** C1 (one line,
cheap) plus C3 or C2 to stop the loop, with D only if a clean break in the numbers is wanted. **If A shows old copies
running:** D is the only lever on the old builds' writes, and E stops future third-party builds. Either way, E, F, H
(+ G) are cheap follow-ups; I is a judgment call on the analytics meaning lost.

## 13. Not verification, and owner notes

- ⛔ **A green banner or a day under 500 proves nothing.** The metric drops back by itself between spikes: 5 Sep at
  162.79, 13 Oct at 121.49, with no code change.
- **What would count:** for a stopped or found source (A, C, D) — no `Platform` burst without a matching rise in
  sessions over several weeks, against today's roughly weekly rhythm (the `Platform` ÷ sessions ratio is the cheap daily
  check); for D — old-build strings absent from the new game; for H/I — the categories they touch measurably lower per
  page load on normal days (not just a lower total). That check is a separate verify task after any deploy, placed by
  the owner.
- **Gaps that remain** (from the sitting): timezone; Demo-mode text; Error category; SDK `user`/`session_end` counts;
  sessions by build; per-user distribution; per-event-name breakdown; browser/OS and Custom 01 splits; caveat 2;
  GameAnalytics' duplicate handling and event dating; the `0.0.154`+ per-load Design count (taken from the reviewer's
  estimate, not re-derived).
- ⚠️ **Outside this task's scope, for the owner — the no-ID rule is already broken in three tracked files.** The review
  found the **numeric GameAnalytics game ID** in `ai-agents/sprints/backlog.md`, in
  `ai-agents/tasks/backlog/0212-investigate-tutorial-abandonment-by-platform-segment/brief.md` (line 58) and in
  `ai-agents/tasks/backlog/0439-verify-0437-live-exit-confirm-popup-inside-yandex-games/brief.md` (line 9). The value is
  not repeated here. **The repo is public**, so it is already published. These files were not edited.
