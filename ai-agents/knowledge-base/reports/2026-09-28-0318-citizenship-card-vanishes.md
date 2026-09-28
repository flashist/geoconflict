# 0318 — Citizenship card (and buy button) vanishes after a match on a shaky connection — findings

- **Task:** [`0318`](../../tasks/done/0318-investigate-citizenship-card-vanishes-after-a-match-on-a-shaky-connection/brief.md)
- **Author:** fkit-architect (spawned by fkit-lead in `/fkit-sprint-ship-loop`, Sprint 6). No owner channel; every
  owner call is returned as a decision, none is taken here.
- **Date:** 2026-09-28. Tree read as-is on `dev`, including uncommitted work from `0303`, `0250` S1, `0302`.
- **Scope kept:** no source, no wiki, no commit, no task-status change. No production system was touched: the
  only network reads were two `curl -I`/`curl` fetches of Yandex's **public** SDK script (§2.3), which write nothing.

---

## 0. Answer in one screen

1. **Root cause: the card decides whether to show once, when the page boots, and never checks again.**
   `CitizenshipCard.connectedCallback` reads the `citizenship_ui` flag once after the init gate
   (`src/client/CitizenshipCard.ts:112-120`). On a boot where the Yandex SDK is missing or late, the flags are
   missing (`src/client/flashist/FlashistFacade.ts:905-912`), so the read returns `false`
   (`FlashistFacade.ts:984-994`) and the card is hidden **for the rest of that page**. If the SDK later arrives,
   the facade recovers flags, payments, player and the badge (`FlashistFacade.ts:824-866`), **but the card never
   re-checks.** Hiding the card is correct (`0291`, fail-closed). Hiding it **permanently** is the defect.
2. **Triggers, ranked.** Any of these makes the flags missing at the moment the card checks:
   - **A.** **Seen in the owner's session.** The SDK loader script fails to download. There is no retry
     (`src/client/yandex-games_iframe.html:24-26`, `FlashistFacade.ts:814-817`).
   - **B.** **Only after a match. Inferred, not verified.** Leaving a match navigates to `rootPathname`, which
     **drops the URL query string** (`FlashistFacade.ts:453`, `:785-788`). Yandex's loader reads its SDK address
     from `?sdk=` in the query. Without it, the loader asks the parent frame and waits **500 ms**. If that times
     out, `YaGames.init()` **never settles**, and the 5 s deadline makes the boot degraded (§2.3). Whether the
     query really carries `?sdk=` is unknown. A read-only probe settles it (§5, P1).
   - **C.** The inner SDK file fails even after the loader's own 3 immediate retries, so `init()` rejects.
   - **D.** The SDK is healthy but `getFlags()` fails or times out. The card is hidden even though the session
     is not "degraded" (`FlashistFacade.ts:919-950`).
   - **Multiplier.** Every match exit is a full page reload (`WinModal.ts:346`, `GameRightSidebar.ts:136`,
     `SettingsModal.ts:160`, `TutorialLayer.ts:318`, `Main.ts:728`). Each one is a fresh boot and a fresh
     chance to hit A–D.
3. **Measured rate: not measurable yet.** The current events cannot separate "script failed" from the other
   causes, and cannot tell a boot after a match from any other boot (§3). The only existing number is an
   **upper bound**. In the week 2026-09-07 to 09-13, `Player:YandexUnknown` reached **0.8–1.2K unique
   users/day**, against **3.58–4.79K daily players** (relayed in `reports/2026-09-14-0253-…:324`). It also
   counts healthy sessions whose `init()` took more than 1 s, so it overstates. It is still large enough that
   `0049`'s assumption that this case is rare has never been checked. One new event, `Session:PlatformDegraded:{Cause}`
   (value = 1 after a match), makes it measurable (§3.3).
4. **Would retrying a failed script fetch succeed? Likely, but unmeasured.** The same boot loaded the rest of
   the page, so the device was online. `ERR_SOCKET_NOT_CONNECTED` points to one dead connection, not a dead
   network. Yandex's own loader retries its inner file 3 times, and our bootstrap already retries its app chunk
   once (`Bootstrap.ts:26-37`). `0049`'s "low odds" reasoning was about a **rejected init**. It does not carry
   over to a **failed download**. Caveat: the loader is cached for 30 days, so for real players a download
   failure after a match needs a cache miss. The owner's DevTools "Disable cache" setting may have inflated
   what the owner saw (§2.4).
5. **Recommendation, one package:**
   - **(1)** Measure with the new event.
   - **(2)** Make the card re-check when the platform recovers late. This fixes the permanence, reverses nothing,
     and meets `0049`'s own "revisit" trigger.
   - **(3)** Retry a **failed loader download**, with backoff inside the 5 s deadline, then in the background
     after it. This needs the owner to reverse `0049`'s "no retry" **for downloads only**.
   - **(4)** Keep the query string on match exit, if probe P1 confirms trigger B.
   - **Not now:** (ii) returning to the menu without a reload. It is large, it is blocked by `0252`, and it
     only helps boots after a match.
   - **Not now:** (iii) a "retry" state on the card. A card-shaped version brings back the fail-open that
     `0291` withdrew.

---

## 1. What the player sees, and the exact code path

```
match exit ──► FlashistFacade.changeHref(rootPathname)      FlashistFacade.ts:785-788  (full navigation,
                 (query + hash dropped — rootPathname = pathname only, :453)            upstream pattern)
    │
    ▼  fresh boot
iframe <head>: async loader script; onload AND onerror resolve the same promise   yandex-games_iframe.html:20-26
    │
    ▼
Bootstrap.ts:41-42  initializePlatform()   — ONE 5 s deadline (PLATFORM_INIT_DEADLINE_MS, FlashistFacade.ts:422)
    ├─ yandexSdkInit(): YaGames undefined ⇒ return (script failed)             FlashistFacade.ts:812-817
    │                   init() rejects   ⇒ error event, return                  :867-872
    │                   init() hangs     ⇒ deadline wins                         :638-644
    ├─ loadExperimentFlags(): no SDK ⇒ return, flags stay undefined (not memoized) :905-912
    └─ gate resolves; Main.ts loads
    │
    ▼
<citizenship-card>.connectedCallback                                          CitizenshipCard.ts:103-147
    await flashist_waitGameInitComplete()
    enabled = await isCitizenshipUiEnabled()   → checkExperimentFlag → flags undefined → false   FlashistFacade.ts:976-995
    if (!enabled) { classList.add("hidden"); return; }      ◄── ONE-SHOT. No listener for late recovery.
    │
    ▼ (maybe seconds later) SDK arrives late → yandexSdkInit late-recovery branch       FlashistFacade.ts:824-866
        re-fetches flags ✔  re-primes badge snapshot ✔  inits payments ✔  gets player ✔
        card: ✘ never told — stays hidden until the next page load
```

Knock-on effects on the same page, all fail-closed and all as designed. They show what a degraded boot costs:

- **Buy button.** Needs a catalog in state `ready` (`CitizenshipCard.ts:612-616`). A degraded boot leaves the
  catalog `idle` (`FlashistFacade.ts:1132-1140`).
- **Private-lobby perk (`0302`).** A hidden card never publishes a status, so the status stays `unknown`
  (`CitizenshipStatus.ts:34`), and every perk treats `unknown` as locked (`CitizenshipStatus.ts:14-15`). Also
  `isPrivateLobbiesEnabled()` is false with no flags (`FlashistFacade.ts:1018-1023`; test
  `tests/client/FlashistFacade.test.ts:555`). **A paying citizen loses the perk for that page.**
- **Ads, login status, language.** Degraded, as `0049` designed (`FlashistFacade.ts:588-591`).

**Where `0049`'s "Couldn't connect" subtitle still shows.** It is still live, but only for **SDK present, player
missing** (flags arrived, `getPlayer()` failed): `CitizenshipCard.ts:320-379`. When the SDK itself is missing,
the flag read hides the whole card first. That is `0291`'s ruling (`0291/brief.md` *Accepted cost*) and is
unit-covered (`tests/client/CitizenshipCard.test.ts:174`, `:228`).

---

## 2. Evidence per trigger

### 2.1 A — the loader download fails (seen live)

- **What the owner saw.** The browser console on the 2026-09-26 18:21 MSK session showed:
  - the SDK script request failing with `net::ERR_SOCKET_NOT_CONNECTED`;
  - then `getLanguageCode __ ERROR! No yandexGamesSDK`. This is only the console line from
    `FlashistFacade.ts:1476` on the no-SDK path, not a separate failure;
  - then `Player:YandexUnknown`.
- **What the code does.** `onerror` resolves the same ready promise as `onload` (`yandex-games_iframe.html:24-26`).
  `yandexSdkInit` then sees no `YaGames` and returns (`FlashistFacade.ts:814-817`). Nothing ever fetches the
  script again. The late-recovery branch only runs when `YaGames` exists and `init()` settles late, so **a failed
  download never recovers**.
- **Analytics footprint.** `Player:YandexUnknown` fires (`FlashistFacade.ts:660-666`). There is **no**
  `Session:PlatformInitTimeout`: no SDK makes player, flags and payments return at once, so the deadline never
  wins. There is **no** error event either. So this path cannot be told apart from the others (§3).

### 2.2 D — flags fail while the SDK is healthy

`fetchExperimentFlags` catches a `getFlags()` error or its 5 s timeout, logs a **Debug** error event, and leaves
`yandexExperimentFlags` undefined (`FlashistFacade.ts:919-950`). Retrying is ruled out by the comment at
`:926-927`. **The card is hidden, but `isYandexDegraded()` is false.** So any "degraded-boot rate" undercounts
card loss. The new event must cover this case (`NoFlags`, §3.3).

### 2.3 B and C — how Yandex's loader behaves (read from the live public script, 2026-09-28)

**What was fetched.** A `curl -I` and a `curl` of the loader named at `yandex-games_iframe.html:24`, read-only,
Yandex's public CDN. **Fetch results:**

| Fact | Value | Bearing |
|---|---|---|
| Loader size and caching | 3,731 bytes; `cache-control: public, max-age=2592000` (30 days) | On a normal reload the loader comes **from cache**. A network failure of the loader needs a cache miss (§2.4). |
| What it is | A **loader**: it defines a `window.YaGames` stub, then loads the real SDK file | `YaGames` is undefined **only** when the loader itself failed, **or** the page is not inside a frame (the loader does nothing at top level). |
| Where the real SDK address comes from | `new URLSearchParams(location.search).get("sdk")`. **If absent:** a `postMessage` to the parent (`GET_IFRAME_ORIGIN_SRC`) with a **500 ms** timeout | Trigger **B** |
| When the parent lookup times out | Logs `SDK initialization failed` and **never rejects or resolves** the pending `init()` | `init()` hangs, the 5 s deadline makes the boot degraded, `Session:PlatformInitTimeout` fires |
| Inner SDK file download | **3 immediate retries**, then `init()` rejects with `load sdk file error`, and further `init()` calls keep rejecting | Trigger **C**. It surfaces as our error event `yandexSdkInit __ error: load sdk file error` (`FlashistFacade.ts:867-872`). **It cannot be retried from our side** without resetting the loader's globals (`sdkLoaderWasInited`, `YaGames`). That would reach into Yandex internals, so it is not recommended. |
| A candidate inner file | A guessed `…/sdk/_/v2.js` returned 200, 109,190 bytes, 30-day cache | ⚠️ Whether production loads that exact file is **unverified**. The address comes from the platform. |

**Our code on B.** `rootPathname` is `window.location.pathname` captured at construction
(`FlashistFacade.ts:453`). Every match exit navigates to it (§0 item 2). `0273`'s plan already flagged this:
*"production already drops the query after every match exit and evidently works. But SDK health after that
navigation was not verified"* (`0273/plan.md:151`). For that reason `reloadApp()` keeps the query
(`FlashistFacade.ts:790-798`).

**Why B is inferred, not proven.**
- It holds only if the iframe URL the platform gives us actually contains `?sdk=`. If it does not, first loads
  also use the parent lookup, and B adds nothing specific to leaving a match.
- The 500 ms parent reply is a local `postMessage` and needs no network. It would fail only when the parent page
  is busy, for example a low-end phone during an ad. **Unknown.**

**Local stand-in, predicted and not run.**
- Setup: the dev harness `yandex-games_iframe-parent.html` frames the game with **no** query
  (`src/client/yandex-games_iframe-parent.html:10`), and its parent does not answer `GET_IFRAME_ORIGIN_SRC`.
- Expected on `npm run dev`: the console shows `SDK initialization failed … Get external iframe timeout`, then the
  5 s deadline. This matches `0049`'s worklog row *"normal iframe (localhost) → degraded"*
  (`0049/worklog.md:32`).

### 2.4 Does retrying a failed download help?

| For | Against / unknown |
|---|---|
| The same boot loaded our HTML, bundle and (per the brief) profile reads, so the device was online. The failure was **one host, one socket**. | No measurement of retry success exists anywhere. |
| `ERR_SOCKET_NOT_CONNECTED` is Chromium's "socket not connected" error. It is typical of a dropped pooled connection after a network change or VPN reconnect; a new request opens a new socket. *(General Chromium behaviour; not verified against this session.)* | If the connection is truly down for many seconds, retries inside 5 s fail too. Only the background retry (after the deadline) helps then. |
| Yandex's loader retries its own inner file (§2.3). `Bootstrap.ts:26-37` already retries a failed app chunk after 1 s. So retrying a script is a pattern both Yandex and this codebase use. | The loader is cached for 30 days. For a real player, a download failure **after a match** needs a cache miss: eviction, first visit, private mode. **The owner's session may have had DevTools "Disable cache" on**, which refetches on every navigation. That would make the owner's experience **worse than players'**. → question for the owner (§6 D-3 / P2). |
| `0049`'s *"low odds of succeeding on re-attempt"* was about a **rejected or timed-out `init()`**, which is mostly deterministic (bad address, wrong frame). A download failure is transient by nature. **So the reasoning does not carry over.** | — |

**Verdict:** retrying a **failed loader download** is *likely* to succeed on a flaky connection. Evidence:
circumstantial and by analogy, not measured. Retrying a **rejected `init()`** (trigger C) is **not** feasible
cleanly, and `0049`'s reasoning still holds for it.

---

## 3. Measurement

### 3.1 What the current events can and cannot tell

| Degraded-boot cause | Events it produces today (prod only; `flashist_logErrorToAnalytics` no-ops outside prod, `FlashistFacade.ts:358-360`) | Separable? |
|---|---|---|
| A. Loader script failed | `Player:YandexUnknown` only | ❌ looks identical to a failed `getPlayer()` or a slow `init()` |
| B/other. `init()` hung past 5 s | `Session:PlatformInitTimeout` + `Player:YandexUnknown` | ✅ as "deadline hit". ❌ cannot tell B from a slow network |
| C. `init()` rejected | Error event `…yandexSdkInit __ error: <msg>` + `Player:YandexUnknown` | ✅ by error message |
| Player missing | Debug error `…initPlayer __ error` (on reject) or the timeout event (on hang) | partly |
| D. Flags failed, SDK fine | Debug error `…loadExperimentFlags __ error` | ✅ by error message, but no link to card loss |
| `init()` slower than 1 s but **healthy** | `Player:YandexUnknown` (the 1 s window, `FlashistFacade.ts:629-636`, `:651-659`) | ❌ this is the **false positive** that makes `YandexUnknown` an upper bound |
| Boot follows a match exit | nothing | ❌ `Session:MatchesPlayed` (`SessionMatchAnalytics.ts`) fires on any boot that finds a pending entry, including next-day loads |

Minor doc drift, noted and not fixed here: the reference says `Session:PlatformInitTimeout` *"can fire at most
once per stage"* (`analytics-event-reference.md:30`). The code latches it **once per boot**
(`FlashistFacade.ts:619-626`).

### 3.2 What the owner can pull today

**Pull settings:** GameAnalytics, free tier, last 7 days, filter custom dimension 02 = `yandex`. That dimension is
set at `FlashistFacade.ts:513`.

| # | Pull | Gives |
|---|---|---|
| M1 | `Session:Start` count | Denominator: Yandex **page loads**. Every match exit is one. |
| M2 | `Session:PlatformInitTimeout` count | Boots degraded by the deadline (hang cases, incl. B) |
| M3 | `Player:YandexUnknown` count | Upper bound on all degraded boots. Includes slow-but-healthy boots. |
| M4 | Error events whose message contains `yandexSdkInit __ error`, split by `load sdk file error` / `url sdk not valid` / other | Trigger C |
| M5 | Error events containing `initPlayer __ error` and `loadExperimentFlags __ error` (severity Debug) | Player failures; trigger D |
| M6 | Sum of `Experiment:<flag>:<any value>` for **one flag served to every player** | Page loads where flags **ever** arrived. **M1 − M6 ≈ page loads with no flags ≈ card hidden.** The cleanest proxy for the symptom available today. ⚠️ Needs a flag served to all players. Whether `citizenship_ui` is at 100% is an owner fact. |
| M7 | `Citizenship:Seen` count | Page loads where the card was actually visible. Fires at most once per page load (`CitizenshipCard.ts:238-246`). Compare with M1. |

**Caveats:**
- GameAnalytics error events may be deduplicated or capped per session by their SDK (unverified). Read M4 and M5
  as lower bounds.
- None of M1–M7 gives the **share that follows a match**.

### 3.3 The smallest new event that makes it measurable

**`Session:PlatformDegraded:{Cause}`**, enum key `SESSION_PLATFORM_DEGRADED`.
- **Format.** Three PascalCase segments, per `analytics-event-reference.md:572-580`.
- **When.** Fired **once per page load**, at gate time, when the card-relevant platform state is missing.
- **Cause**, first match wins:
  - `ScriptFailed`: the loader's `onerror` ran. Needs one flag in the template's `onerror`.
  - `InitFailed`: `init()` rejected.
  - `InitTimeout`: the deadline hit before `init()` settled.
  - `NoPlayer`: SDK present, no player object.
  - `NoFlags`: SDK present, flags missing.
- **Value.** `1` when this boot follows a match exit, `0` otherwise. Count = degraded boots, sum = after-match
  degraded boots.
  - The after-match marker is a `sessionStorage` key written right before the match-exit navigation and consumed
    at boot. `sessionStorage` survives same-tab navigation.
  - Wrap every access in try/catch, as `Bootstrap.ts:61-65` does.
- **Optional companion, to size the recovery half of the fix:** `Session:PlatformRecovered`, fired when a degraded
  boot's SDK arrives late (`FlashistFacade.ts:824` branch, only when stage 2 already ran).

---

## 4. Options

"Saves" means boots that end with a visible card that would otherwise be hidden. Percentages are unavailable
until §3.3 ships, so this column is qualitative on purpose.

| Option | What it is | Saves | Cost | Risk | Locked decision touched |
|---|---|---|---|---|---|
| **(R) Re-check on late recovery.** Not in the brief's list, and the structural fix. | Facade exposes a "platform recovered" signal (a promise or event), fired from the late-recovery branch after flags re-fetch (`FlashistFacade.ts:836`). The card, when hidden **only because flags were missing**, subscribes, re-reads the flag, and reveals itself through the normal path (profile read, `whenPaymentsCatalogSettled` re-render). | Every boot where the SDK or flags arrive **late**: B, slow networks, part of D. **Not** A (nothing ever arrives) unless paired with (i). | **S–M**, ~1 day incl. tests | Low. **Fail-closed kept:** reveal only on a real flag value `enabled`. Adds a second profile read on the page, so **`0326`'s stale-read guard must land first or together.** | `0049` *"late-recovery UI refresh deferred … revisit if `Session:PlatformInitTimeout` volume proves non-trivial"*. The M2/M3 numbers are exactly that trigger. **Not a reversal**, a scheduled revisit. `0291`: compatible. |
| **(i) Retry the loader download.** | On `onerror`, re-insert the loader script with backoff (for example +0.5 s, +1.5 s) **inside the 5 s deadline**; after the deadline, keep retrying in the background (for example 5 s / 15 s / 45 s, capped) and let the existing late-recovery branch take over. Put the logic in TS inside the facade (unit-testable); the template only records "failed". **Download only.** Do **not** retry `init()` (see §2.3, C). | Trigger A. With (R), also shows the card again when a background retry succeeds. **Without (R), a post-deadline success still leaves the card hidden.** | **S–M**, ~1 day | Low–medium. The first attempt fails fast, so the in-deadline retries fit the budget. A retried loader must never run twice: only retry after `onerror`, when nothing executed. The late path is the lightly exercised part. | **Reverses `0049`'s "no active SDK retry"** for downloads only. **Owner call.** The 5 s deadline is kept: in-deadline retries fit inside it; later ones are recovery, as the brief requires. |
| **(iv) Keep the query on match exit.** Not in the brief's list. | `changeHref` navigates to `rootPathname + location.search` (the hash is still dropped). One place, the facade. The 5 upstream exit sites are untouched. | Trigger B, **if** P1 shows `?sdk=` is in the iframe URL. Otherwise nothing, and harmless. | **XS**, about an hour + test | Low. `reloadApp()` already reloads **with** the query in prod (`0273`/`0303` restarts). Overlaps `0199`'s open question on whether query params matter. | None. `changeHref` is already a Flashist adaptation. |
| **(ii) Return to the menu without a reload.** | Make the in-page leave a supported route. | Only boots after a match. First loads unchanged. | **L**, multi-day. **Blocked:** `0252` found the in-page leave *"an unsupported route today, not merely a leaky one"* (renderer, canvas, rAF loop, Transport listeners, lobby poll all outlive it: `0252/brief.md:111-130`). | High. Touches all 5 exit sites + `ClientGameRunner` teardown. Also changes `0303`'s "restart to apply" premise. | **Upstream divergence**: OpenFront's reload-to-menu pattern, ongoing merge cost. |
| **(iii) A visible "couldn't load — retry" state.** | Show something instead of silently hiding. | None directly. It explains the loss. A "retry" that reloads the page is **another boot**; one that re-runs the download needs (i) anyway. | S–M | **A card-shaped placeholder shown when flags are unknown would appear to players whose `citizenship_ui` flag may be OFF.** That is the fail-open `0291` withdrew, in a weaker form (no buy button, still a citizenship surface). Only a **generic, non-citizenship** "couldn't connect to Yandex" banner avoids that. | `0291`: conflicts if card-shaped. `0049`: its subtitle **still exists** for SDK-up/player-missing (§1). `0291` removed it only for the no-flags case. |

### Recommendation

**(1) the §3.3 event + (R) + (i) for downloads, plus (iv) if probe P1 confirms. Not (ii), not (iii) now.**

**Main trade-off.** (i) reverses a locked `0049` decision. The owner must rule on that. The reversal is narrow: a
failed **download** only, never a rejected `init()`, and the 5 s deadline is kept.

**Order.**
1. The event ships first or with the fixes, so the effect is measurable.
2. (R) is worth doing even if (i) is declined. It is the only piece that fixes the "gone for the whole page"
   part, and it reverses nothing.
3. (i) without (R) is half a fix. A success after the deadline would still leave the card hidden.

---

## 5. Reproduction

**Local, unit (strongest, cheapest).** `tests/client/CitizenshipCard.test.ts` already proves "flags false ⇒
hidden" in degraded mode (`:174`, `:228`). The gap is reproduced by a **new** test:
1. Facade with no SDK and a non-dev env.
2. The card connects and hides.
3. Simulate late recovery: flags now `enabled`.
4. Assert the card **stays hidden**. That is today's behaviour, and the (R) brief flips the assertion.

⚠️ `GAME_ENV === "dev"` makes every flag check return `true` (`FlashistFacade.ts:980-982`), so **`npm run dev`
cannot show the hidden card.** It shows the degraded guest subtitle instead.

**Local, browser.**
- Build with `npm run build-prod` (`GAME_ENV` = `prod` via `webpack.config.js:335`) and serve `static/`.
- **Trigger A:** DevTools → Network → *Block request URL* for the loader named at `yandex-games_iframe.html:24`
  → the card is absent.
- **Trigger B mechanism:** open `yandex-games_iframe-parent.html`. It frames the game without a query, and the
  harness parent does not answer the loader, so expect a hang, then the 5 s deadline, then degraded.
- *Not run in this investigation.*

**Live (owner, read-only DevTools probes in the game frame, production).** I did not run these: they need the
owner's Yandex session, and loading the production game sends analytics. **Do not paste values into any
artifact.** They can contain ids; report only yes/no and numbers.
- **P1.** On a first load, and again after exiting a match, in the game frame's console:
  `new URLSearchParams(location.search).has("sdk")` and `location.search.length`.
  → `true` then `false` confirms trigger B.
- **P1b.** On the post-match load:
  `performance.getEntriesByType("resource").filter(e => e.name.includes("sdk")).map(e => ({ path: new URL(e.name).pathname, transferSize: e.transferSize, ms: Math.round(e.duration) }))`
  → `transferSize: 0` means served from cache. This shows whether the loader and inner file were re-downloaded.
- **P2.** Recall: was DevTools "Disable cache" ticked during the 2026-09-26 session? Was a VPN or network switch
  involved?
- **P3.** The GameAnalytics pulls M1–M7 (§3.2).

---

## 6. Implementation briefs this splits into (NOT filed; the producer files them after the owner rules)

| # | Brief | Depends on | Size |
|---|---|---|---|
| **B1** | **Analytics: `Session:PlatformDegraded:{Cause}` (value = after-match) + optional `Session:PlatformRecovered`.** Template `onerror` flag; match-exit `sessionStorage` marker in `changeHref`; enum keys; `analytics-event-reference.md` rows (en only, no UI text). | none | S, ~0.5 d |
| **B2** | **Citizenship card re-checks its gate when the platform recovers late (R).** Facade "platform recovered" signal from the late-recovery branch; the card subscribes only when it hid for missing flags, re-reads the flag and runs the normal reveal. Fail-closed preserved. Tests: late recovery with `enabled` → shown; with the flag off → stays hidden; never recovers → stays hidden. | **`0326`** (stale-read guard: B2 adds a concurrent profile read) | S–M, ~1 d |
| **B3** | **Retry a failed Yandex SDK loader download (i).** Backoff inside the 5 s deadline, then capped background retries feeding the existing late-recovery branch. Download only, never `init()`. | **Owner ruling D-1**; **B2** (otherwise a post-deadline success does not show the card); B1 recommended first | S–M, ~1 d |
| **B4** | **Keep the query string on match exit (iv).** `changeHref(rootPathname)` → pathname + search, hash dropped. | **Probe P1** confirms `?sdk=` is in the iframe URL; coordinate with `0199` | XS |

**Not proposed:**
- **(ii)**: blocked by `0252`, upstream divergence, only helps boots after a match.
- **(iii)**: conflicts with `0291` if card-shaped. A generic connection banner is possible later if B1 shows many
  degraded boots that never recover.

**Relation to the tasks named in the spawn:**
- **`0326`: related, not the cause.** A hidden card never reads the profile, so `0326`'s race cannot hide the
  card. It becomes a **prerequisite for B2**, which adds a second concurrent read. Both share the underlying
  pattern: state decided once, not refreshed on a late signal.
- **`0303`: related.** Its restart popup uses `reloadApp()`, which keeps the query, so it is exposed to A and C
  but not B. Each restart is one more boot. (ii) would change `0303`'s premise.
- **`0302`: affected.** A degraded boot locks a paying citizen's private-lobby perk for that page (§1). B2 fixes
  that too, because the card then publishes.
- **`0250` S1: unrelated.** The card hides before any profile read.
- **`0327`: unrelated.** It concerns an in-lobby window, not a reload or SDK init.
- **`0252`**: the reason (ii) is large.
- **`0199`**: shares the "does any query param matter?" question with B4.

---

## 7. Open questions (plain-language versions are in the hand-back's NEEDS-DECISION block)

1. **D-1:** reverse `0049`'s "no SDK retry" for a failed **download** only?
2. **D-2:** approve the recommended package: B1 + B2 + B3, and B4 if P1 confirms?
3. **D-3 / P2:** was DevTools "Disable cache" on during the 2026-09-26 session? This tells us whether the owner's
   experience overstates what players see.
4. **Owner fact:** is `citizenship_ui` served to 100% of Yandex players? It decides whether M6 is a clean proxy.
5. **Unverified here:** whether the platform's iframe URL carries `?sdk=` (P1); GameAnalytics error-event
   capping; the actual inner SDK address in production.

**Wiki:** once the owner rules, fkit-wiki should ingest this report (`/fkit-wiki-ingest` this path). It updates
`systems/flashist-init` (loader behaviour, the query-string finding) and the degraded-mode pages.
