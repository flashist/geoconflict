# 0248 Step 1 — decision gate facts (seam, six placements, revenue data, subset option)

- **Date:** 2026-10-06
- **Task:** [`0248`](../../tasks/done/0248-suppress-interstitial-ads-for-paid-citizens/brief.md), Step 1 only. Step 2 is not planned here.
- **Written by:** a spawned `fkit-producer` with no owner channel (ADR-021), at `fkit-lead`'s request while it drives `/fkit-sprint-ship-loop`.
- **Evidence base:** the `dev` working tree at `d2aeb80`, code read this turn. Git tags were read to work out what is deployed. `fkit-architect` was **not** consulted: the seam question was answerable from the code and from `0250`'s artifacts.
- ⛔ **No numbers in this report are estimates.** Where data does not exist, the report says so.

## TL;DR

1. **Seam: built, committed, not deployed.** `0250` S3b added `PlayerProfileView.isPaidCitizen`. It is committed in `6f4ab77` (2026-10-06), which is in **no** release tag, so it is not live. Live use waits on `0396`. **One piece is still missing, and it belongs to Step 2:** a page-wide store of the paid answer that `showInterstitial()` can read at ad time. Today only the citizenship card holds the value.
2. **Six call sites, all at transitions, none during active play.** Four fire when the player **enters** a game (public lobby join, Mission, solo custom start, private-lobby host start). Two fire when the player **leaves** one (the end-of-match / death modal's exit, and the in-game quit button). Our code can show at most **two per match**: one on the way in, one on the way out. Yandex's own frequency cap can block some of them.
3. **Per-placement data: does NOT exist.** `Ad:Interstitial` (GameAnalytics, live since `0.0.152`) carries **no placement**, so the six cannot be told apart. The **total** per day is readable today in GameAnalytics, but nobody has read or recorded it. **Revenue per ad** exists only in the Yandex Games console, which only the owner can reach. Getting a per-placement split needs new code plus a deploy plus about a week of data.
4. **Subset option.** It is real and it is cheap to build either way. ⚠️ **But any subset makes `PROJECT.md:36` ("no interstitial ads for paid citizens") untrue as worded.** The owner ruled on 2026-09-12 that the claim stays. A subset therefore also needs a ruling on the wording, covering `PROJECT.md`, the store copy, and the `0301` popup.

## 1. The seam

**Status: the seam `0250` was set up to provide exists in code. It is not live.**

| Fact | Evidence |
|---|---|
| The client view carries `isPaidCitizen: boolean`. It is true **only** when the server returned the verified owner view **and** that view says `is_paid_citizen: true`. | `src/client/PlayerProfileView.ts:54`, `:126`, `:144` |
| It is false on every other path: guest, failed or timed-out read, a body that fails the schema, an unverified session, or a server older than S3b. This is "fail closed for entitlement" (ADR-116 Decision 4). **For this task that means ads show**, which is the fail-open-to-ads behaviour the brief requires. The two "fail" words point the same way. | `PlayerProfileView.ts:105`, `:144`; `0250/review.md:20` |
| S3b source is **committed** in `6f4ab77` ("Sprint push", 2026-10-06 13:25). ⚠️ The brief's 2026-10-06 note says it is "not committed". That was true when the note was written and is **stale now**. | `git show --stat 6f4ab77` lists `PlayerProfileView.ts`, `PublicProjection.ts`, `Routes.ts`, `PlayerProfile.ts`, `LoginContract.ts` |
| S3b is **not deployed.** `6f4ab77` is in no git tag. The latest profile-server deploy tag, `0.0.156-profile.2`, points at `0aef613`, which is before S3b. | `git tag --contains 6f4ab77` returns nothing |
| Going live waits on [`0396`](../../tasks/backlog/0396-verify-0250-s3b-live-deploy-the-verified-owner-view-and-confirm-it-in-production/brief.md). | brief, 2026-10-06 note |

**What is still missing. All of it is Step 2 build work, not a new seam decision:**

- **No page-wide paid state.** `loadPlayerProfileView()` has exactly one caller, `CitizenshipCard.refreshProfile()` (`src/client/CitizenshipCard.ts:241`). It must stay the only caller, because a second caller could fire `Citizenship:Earned:XP` twice (see the comment at `src/client/Inbox.ts:5-8`). `showInterstitial()` (`src/client/flashist/FlashistFacade.ts:2114`) has no way to read the value. **A precedent exists:** `src/client/CitizenshipStatus.ts` is a page-wide store with the card as its only writer, built for `0302`. Step 2 can follow the same pattern.
- **The kill switch comes almost free.** The card reads the profile only after `CITIZENSHIP_CARD_ENABLED` and the remote `citizenship_ui` flag both pass. With citizenship off, nothing would be written, so ads show. Step 2 must still prove this (brief, verification step 5).
- **Two cases where a paid player still sees ads.** Both are already accepted, and both are named here so they surprise nobody:
  - **Unverified sessions.** A paid citizen whose login signature is stale or failed gets `vfy:false`, so `isPaidCitizen` is false and ads show. This was accepted under ADR-116 D4; how big the gap is depends on the ADR-121/122 login numbers (`0392`).
  - **Early ads after each page load.** Every match exit reloads the page (`FlashistFacade.changeHref`, `:1091`). An ad that fires before the card's profile read returns will show. Example: a Mission click straight after the reload.
- ⚠️ **Unverified, and outside our code: Yandex's own ads.** Our gate can only stop ads **our code** asks for (`showFullscreenAdv`). Nothing in the repo records whether the Yandex platform shows a fullscreen ad on its own, for example at game launch. If it does, our gate cannot stop it, and the literal promise "no interstitial ads" cannot be fully kept. **Owner check:** see §3.

## 2. The six interstitial call sites

All six go through `FlashistFacade.showInterstitial()` (`src/client/flashist/FlashistFacade.ts:2114`). That function checks only that the Yandex SDK is present. The brief's line numbers date from 2026-09-12; two of them have moved, and the table below uses the current ones.

| # | Call site (current) | When it fires | Who sees it | How often |
|---|---|---|---|---|
| 1 | `src/client/PublicLobby.ts:339` | **Entering**: after the player joins a **public multiplayer lobby**, and only if at least **15 s** remain before start **and** at least **3** slots are open (`flashistConstants.ads.interstitial.join`, `FlashistFacade.ts:385-391`). The join is sent first, so the ad plays during the lobby wait. | Everyone joining public games | At most once per public-lobby join. Often skipped because of the 15 s / 3-slot rule. ⚠️ `0367` (1-minute lobbies) probably makes it skip more often, but that is unmeasured; `0370` is the check. |
| 2 | `src/client/Main.ts:945` (`startSinglePlayMission`) | **Entering**: the **Mission** button on the start screen (`Main.ts:372-383`), before the mission loads. | Solo mission players | Once per Mission click |
| 3 | `src/client/SinglePlayerModal.ts:501` (`startGame`) | **Entering**: the Start button of a **custom solo game** (`:399`). | Custom solo players | Once per custom solo start |
| 4 | `src/client/HostLobbyModal.ts:975` (`attemptStart`) | **Entering**: the **host** presses Start on a **private lobby** (`:630`). People who join a private lobby get no ad. | Hosts only. Creating a private lobby is a **citizen-only** perk: the server refuses a host who is not a citizen (`src/client/PrivateLobbyAccess.ts:32-49`). So this ad is shown **only to citizens**, earned or paid. | Once per private match started |
| 5 | `src/client/graphics/layers/WinModal.ts:326` (`hide`, via `_handleExit`, button at `:126`) | **Leaving**: the exit button on the **end-of-match / death modal**. That modal opens when the match ends and also when the player is eliminated (`:362-367`). Skipped for tutorial matches. A page reload follows. | Everyone who leaves through the result modal | At most once per match |
| 6 | `src/client/graphics/layers/GameRightSidebar.ts:130` (`onExitButtonClick`, `:191`) | **Leaving**: the in-game **quit** button, at any time during a match, including while still alive. The confirm dialog is disabled. **Not** skipped for tutorials. A page reload follows. | Everyone who quits a match from the sidebar | At most once per match |

**What this means for "how often per session":**
- **No interstitial fires during active play.** The brief's word "mid-session" maps most closely to #6, which fires when a player quits mid-match.
- Per match, our code asks for **at most 2 ads**: one entry ad (#1–#4) and one exit ad (#5 or #6). The match exit reloads the page, so in practice a "session" is one start-screen-to-exit loop.
- **The Yandex SDK can decline a request.** It reports `wasShown=false`, for example under its own frequency cap (code comment at `FlashistFacade.ts:2140-2142`). **How long that cap is has not been checked**; it is set by Yandex. So "asked for" is more than "shown", and only "shown" earns money. `Ad:Interstitial` counts **shown** only.

## 3. The revenue data

⛔ **Per-placement impression and revenue data does NOT exist anywhere we can read.** Nothing below is estimated.

| Source | What it has | What it lacks |
|---|---|---|
| **GameAnalytics** — `Ad:Interstitial` (task `0020`; first in release `0.0.152`, live since the 2026-09-26 deploy) | One event per ad **really shown**, across all six placements together. The **total per day** and **per active user** can be read today. | **No placement field**, so the six cannot be separated (also recorded in `0367`'s worklog and `0370`'s brief). No tier: guest, free, earned and paid are not split (that is `0299`, Backlog). **Nobody has read or recorded the totals yet.** `0020`'s in-Yandex check ("one event per ad actually shown") is **still owed**. |
| `ai-agents/knowledge-base/reports/` | Nothing on ad impressions or ad revenue. | — |
| Telemetry (Uptrace / ClickHouse) | Server logs only. `flashist_logEventAnalytics` sends to GameAnalytics only (`FlashistFacade.ts:428-451`). | No ad events at all. |
| **Yandex Games console (owner only)** | The only place holding **money**: ad revenue and impressions for this game. | Nothing about **our** six placements. Yandex cannot see them. |

**What the owner can read today, without any new code:**
1. **Yandex Games console**, last 7 full days: the revenue and the impression count **for fullscreen (interstitial) ads only**, kept separate from rewarded and banner if the console splits them. ⚠️ The exact menu names were not checked by us. Revenue ÷ impressions = **average money per shown interstitial**.
2. **GameAnalytics**, same 7 days: the `Ad:Interstitial` daily count and daily active users, giving **interstitials shown per active player per day**. Comparing this count with the console's impression count also partly covers `0020`'s owed check.
3. **Yandex Games console / SDK settings:** whether Yandex shows any fullscreen ad **on its own** (for example at game launch), and what the minimum gap between fullscreen ads is. Neither is recorded anywhere in the repo.

With 1 and 2, the brief's formula can be filled in for the **all-six** case: *revenue forgone per paid citizen per month ≈ interstitials shown per player per day × days played per month × money per interstitial*, set against the one-off **249 Yan**. ⚠️ **Two caveats.** It uses an average player, while paying players probably play more than average (unmeasured). And it says nothing about how the cost splits between placements.

**What a per-placement split would take (a measuring task):**
- **Build:** give each of the six call sites a placement name and send it with the impression, for example `Ad:Interstitial:{Placement}`, following `analytics-event-reference.md` and the enum. It must be decided whether the bare `Ad:Interstitial` stays alongside it (it is `0370`'s context signal). GameAnalytics' 500-events-per-user-per-day limit and its cardinality caution apply. The change is small, client-only, about half a day.
- **Ship:** one weekend deploy slot.
- **Wait:** about 7 days of production data, after which the owner reads it in GameAnalytics.
- **Timing:** `0248` cannot reach players before `0396` passes anyway, so the measuring week can run in parallel with that wait.
- **No task exists for this today.** `0299` (Backlog) is about **tiers**, not placements.

## 4. All six vs a subset — what each keeps and gives up

⛔ **No choice is made here; the brief forbids it.** All three options are equally easy to build. The gate is either one check inside `showInterstitial()`, or the same check with a placement name passed in.

| Option | A paid citizen sees (from our code) | Keeps | Gives up | Wording consequence |
|---|---|---|---|---|
| **A. All six** | No interstitials | Nothing from paid citizens | **All** interstitial revenue from paid citizens | `PROJECT.md:36` holds as written (apart from any Yandex-initiated ads, §1). Simplest gate: no placement logic. |
| **B. Exit ads off, entry ads kept** (#5 and #6 off; #1–#4 on) | At most 1 ad per match, before play | Every entry ad, including the lobby-wait ad | The 2 exit placements | ⚠️ "No interstitial ads" becomes **untrue**. Needs re-wording to something like "no ads after matches", in `PROJECT.md`, the store copy and the `0301` popup. |
| **C. Only the public-lobby join ad kept** (#1 on; #2–#6 off) | At most 1 ad, and only when joining a public game with ≥15 s left — time the player spends waiting anyway | The public-lobby join ad | Solo starts, host start, both exits | ⚠️ Same problem: "no interstitial ads" becomes untrue and needs re-wording. This is the brief's own example ("keep lobby-entry"). |

**Facts that matter for the choice:**
- **#4 is only ever shown to citizens**, because private-lobby hosting is citizen-only. Turning it off for paid citizens costs only what paid hosts were bringing in.
- **#1 is the least intrusive ad.** The player has already joined and is waiting anyway. It is also the most often skipped (the 15 s / 3-slot rule).
- **Without the per-placement split (§3), nobody can say what share of revenue B or C keeps.** The difference between A, B and C cannot be put in numbers today.
- The owner ruled on 2026-09-12 that the `PROJECT.md` claim **stays**, and this task must **not** edit `PROJECT.md`. Choosing B or C would therefore also need an explicit ruling on the claim's wording.

## Files

- Written: this report.
- Appended: a dated pointer note at the end of the `0248` brief (ADR-035, nothing above it edited).
- No source code, no status, rank, sprint or folder changed. No mover run. Nothing committed.
