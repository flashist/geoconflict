# Evaluation — private-lobby invites on Yandex Games: portal invite link vs code-only (task 0199)

**Date:** 2026-10-03 · **Author:** fkit-architect (spawned consult, no owner channel) · **Task:** `0199`
**Status:** analysis + recommendation. **Nothing is decided here.** The owner has ruled only that the
current invite link must not reach players (2026-10-03, relayed by `fkit-lead`; recorded in `0376`'s brief).

> ⚠️ **Owner priorities were NOT asked** (consult mode — no owner channel). This evaluation assumes:
> **(1) Yandex rules compliance, (2) small and reversible, (3) reach (friends joining easily).** If the
> owner weights reach above simplicity, the recommendation's order changes (build A sooner), not its shape.

---

## 1. The problem in one paragraph

`HostLobbyModal.copyToClipboard()` copies `` `${FlashistFacade.instance.windowOrigin}#join=${lobbyId}` ``
(`src/client/HostLobbyModal.ts:990-1006`). `windowOrigin` is `location.origin + location.pathname`
(`src/client/flashist/FlashistFacade.ts:647-648`), so inside the Yandex iframe the copied link is
`https://geoconflict.ru/yandex-games_iframe.html#join=<id>` — our own site, outside the portal. Yandex
requirement **8.4.2** forbids exactly this: links must not lead to *"сайт создателя, самой игры"* (the
creator's or the game's own site), and **8.4.4** forbids redirecting players outside Yandex Games. The
inbound handler `Main.handleHash()` still honours `#join=` regardless of flags (`src/client/Main.ts:725-731`,
called at `:574` and on `hashchange`/`popstate` `:576-588`).

## 2. What Yandex documents (sourced) vs what needs a live test

### 2.1 Documented — read 2026-10-03

| Fact | Source |
|---|---|
| `ysdk.environment.payload` — *"Значение параметра payload из адреса игры. Необязательный параметр."* Example: for `https://yandex.ru/games/app/123?payload=test`, `ysdk.environment.payload` is `"test"`. Type `string`, optional. | [sdk-environment](https://yandex.ru/dev/games/doc/ru/sdk/sdk-environment) |
| `ysdk.environment.app.id` — *"Идентификатор игры"*, `string`. Available at runtime; we need no hardcoded id. | same page |
| `ysdk.features.GamesAPI.getGameByID(appID: number)` → `{ isAvailable: boolean, game?: IGame }`; `getAllGames()` → `{ games: IGame[], developerURL }`. `IGame = { appID, title, url, coverURL, iconURL }`. Purpose: links *"доступны на текущих платформе и домене"* (correct for the player's current platform **and** domain). | [sdk-other-games](https://yandex.ru/dev/games/doc/ru/sdk/sdk-other-games) |
| `ysdk.clipboard.writeText(text)` — SDK clipboard write. (No SDK *read*.) | [sdk-params](https://yandex.ru/dev/games/doc/ru/sdk/sdk-params) |
| **8.4.1**: links in texts/media are *"встроены через SDK и ведут на ваши игры в каталоге Яндекс Игр"*. **8.4.2**: no links to external resources incl. the game's own site. **8.4.4**: no redirect outside Yandex Games. | [requirements](https://yandex.ru/dev/games/doc/ru/concepts/requirements), [8.4.1](https://yandex.ru/dev/games/doc/ru/requirements/8/4/1.md) |
| Games run on **17 `yandex.<tld>/games` domains** (ru, com, com.tr, kz, by, uz, …) — the reason a hardcoded URL is wrong. | [languages-and-domains](https://yandex.ru/dev/games/doc/ru/concepts/languages-and-domains) |
| The catalog game URL shape is `https://yandex.<tld>/games/app/<id>` (used in the docs' own examples, e.g. `?payload=`, `?debug-mode=16`, promo deeplinks). | sdk-environment, 8.4.1 |

### 2.2 NOT documented — needs a LIVE test (do not build on these)

1. **Does `payload` reach an *iframe-hosted* game?** We are hosted on our own domain via iframe (Yandex
   support-approved mode, [draft docs](https://yandex.ru/dev/games/doc/ru/console/add-new-game/draft.md)).
   The payload doc does not distinguish archive-hosted from iframe-hosted games. **The owner's core doubt — open.**
2. **Does it work on every domain and platform** (other `yandex.<tld>`, mobile web, the Yandex app)? Undocumented.
3. **Size and character limits of `payload`** — none documented. Keep it short and alphanumeric.
4. **Does `getGameByID(<our own id>)` (or `getAllGames()`) return *this* game?** The page is titled
   *"Ссылки на другие игры"* (links to **other** games). Whether the current game is included is undocumented.
5. **Does `payload` survive our match-exit reload?** After a match the iframe navigates to its root path
   (`FlashistFacade.changeHref`, `FlashistFacade.ts:1076-1092`) and the SDK re-inits. The portal page's URL
   probably still carries `?payload=`, so the join would **fire again** after every match unless consumed once.
6. **Does `payload` also appear in the iframe's own `location.search`** (next to the platform's `sdk`
   parameter, task `0331`)? Unknown — matters for the `sdk`-parameter trap below.
7. **Clipboard inside our iframe:** does `navigator.clipboard.writeText` work there, or does the parent
   frame withhold the `clipboard-write` permission? Today's copy **swallows the error** (`HostLobbyModal.ts:1003-1005`
   — no success tick, only a `console.error`), so it may already silently fail in production. Unverified.
8. **GamesAPI auth / rate limits** — none documented.
9. **Moderation's view of a link to the same game** shared via clipboard — 8.4.1 speaks of links to *your
   games in the catalog*; a self-link with `payload` plausibly fits, but this is not stated. Only Yandex
   support or a moderation pass can confirm.

⚠️ A web search returned third-party summaries describing `payload` as *"commonly used for invitation
links"* — that is a search engine's paraphrase, **not** Yandex documentation. Not relied on.

## 3. What our codebase has today

- **SDK loader:** unversioned `https://sdk.games.s3.yandex.net/sdk.js`, async, in the Yandex template only
  (`src/client/yandex-games_iframe.html:24`). Always the latest SDK v2 — no pinned version.
- **Init:** `YaGames.init()` once per page (`FlashistFacade.ts:1238`), stored as `yandexGamesSDK: any`
  (`:685`). Bounded 5 s deadline with degraded mode and late recovery (`:1230-1300`).
- **What we read from `environment`:** only `i18n.lang` (`FlashistFacade.ts:2138-2143`). Nothing reads
  `payload`, `app.id`, `GamesAPI` or `clipboard`. No app id lives in the repo (none needed — it comes from
  the SDK at runtime).
- **Reachable?** Yes — `environment.payload`, `environment.app.id`, `features.GamesAPI` and `clipboard` are
  all on the object we already hold. **No SDK change, no new script.**
- **Already exposed in production for a console probe:** `window.FlashistFacade = FlashistFacade`
  (`FlashistFacade.ts:2328`, since 2025-11) and the full SDK object is `console.log`ged at init (`:1239`).
  Both are in the live 0.0.156 build. ⇒ **the feasibility test needs no deploy** (§5).
- **Code-only joining already exists:** `JoinPrivateLobbyModal` has a lobby-id field
  (`src/client/JoinPrivateLobbyModal.ts:60-75`), a paste button using `navigator.clipboard.readText`
  (`:207-213`), and accepts pasted URLs too (`extractLobbyIdFromUrl`, `:183-195`). The lobby id is the code:
  8 characters, `[a-zA-Z0-9]`, **case-sensitive** (`src/core/Schemas.ts:228-231`). The host modal shows it
  masked `••••••••` until toggled (`HostLobbyModal.ts:166-168`).
- **Visibility:** the Join and Create buttons sit in the private-lobby row, hidden unless `private_lobbies`
  and the citizenship surfaces are on (`Main.ts:530-532`, `PrivateLobbyAccess.ts`). The inbound `#join=`
  path ignores those flags.

## 4. Candidate approaches

### A — Yandex-portal invite link via SDK + `payload` (code join kept alongside)

**How it works.**
1. Host taps "copy invite link": the client asks `GamesAPI.getGameByID(Number(environment.app.id))` (memoized
   once per page) for this game's URL **on the host's current portal/domain**, sets `payload=<lobby id>` with
   the `URL` API (never string concatenation — `game.url` may already carry a query), and copies it with
   `ysdk.clipboard.writeText` (fallback `navigator.clipboard`).
2. Friend opens it → Yandex portal → our iframe → after SDK init, read `environment.payload`; if it is a valid
   lobby id (`ID` schema), open the join window — the same path `#join=` uses today (`joinModal.open(id)`).
3. Consume once: remember the consumed payload in `sessionStorage` so the post-match reload does not re-join.
4. Fallback ladder if `getGameByID(self)` does not return this game: try `getAllGames()` and match `appID`;
   if still nothing, **copy the code only** (never a `geoconflict.ru` URL). A self-built
   `<portal origin>/games/app/<app.id>` from `location.ancestorOrigins`/`document.referrer` is a possible last
   rung **only if** the probe shows it is correct — it is the "hardcoded shape" the owner wants to avoid.

**Files.** `FlashistFacade.ts` (wrappers: `getPortalGameUrl()`, `getInvitePayload()`, `copyText()`); a new
small `src/client/InvitePayload.ts` (parse + validate + consume-once); `Main.ts` (read payload after platform
init **and** on late SDK recovery; gate `#join=` to non-Yandex builds); `HostLobbyModal.ts` (link + code
buttons); `resources/lang/en.json` + `ru.json`; tests. **Size:** ~150–250 lines + tests, on top of B.

**Pros.** One tap for the friend; lands inside the portal on the friend's correct domain; matches 8.4.1's
"via SDK, to your game in the catalog"; a friend not on Yandex Games at all still lands on Yandex (guest play).
**Cons.** Several undocumented behaviours (§2.2 items 1, 2, 4, 5, 9); more moving parts (late-SDK path,
consume-once); needs a deploy + a separate verify task.
**Reversible:** yes — remove the link button; code join stays.

**Risks.**
- **`sdk` query-parameter trap (`0331`/`0337`).** Yandex's loader reads its SDK address from the iframe's
  `sdk` query parameter. **Never rewrite or strip `location.search`** to "clean up" a payload — dedupe in
  `sessionStorage` instead. Today's `strip()` keeps `location.search` (`Main.ts:651-658`); keep it that way.
- **Re-join loop** after match exit if consume-once is missing (§2.2 item 5).
- **Degraded boot:** if the SDK misses the 5 s deadline, the payload is unreadable at startup; the read must
  also run from the late-recovery path (`FlashistFacade.ts:1238` onward), or the friend silently lands on
  the menu.
- **Flag cohort difference:** a payload join (like `#join=` today) opens the join window even for a friend
  whose Join button is hidden. That is a product behaviour, not a bug — see open question Q3.
- **Moderation** might read a clipboard self-link differently from 8.4.1's "More Games" buttons (§2.2 item 9).

### B — Links removed, code-only joining

**How it works.** The host's copy button copies the **8-character code**, not a URL (via
`ysdk.clipboard.writeText` on Yandex, `navigator.clipboard` elsewhere), with a one-line hint "send this code
to a friend". The friend taps Join and types or pastes it — the existing `JoinPrivateLobbyModal`. On the Yandex
build, `handleHash()` stops honouring `#join=` (gate on `flashist_isYandexPlatform`), so old links cannot pull
anyone into an off-portal Yandex-mode session; the standalone build keeps it.

**Files.** `HostLobbyModal.ts` (`copyToClipboard`), `FlashistFacade.ts` (one `copyText()` wrapper),
`Main.ts` (`#join=` gate), `en.json` + `ru.json`, tests. **Size:** ~40–80 lines + tests. Small, one deploy.

**Pros.** Removes the violation with certainty; no undocumented platform behaviour; reuses an existing UI;
the owner wants codes anyway. **Cons.** Friction: the friend must find the Join button and type a
**case-sensitive** 8-character code (hard to dictate: `0/O`, `l/I/1`); the paste button may not work in the
iframe (no SDK clipboard *read*; unverified); the code is masked by default; the friend must be in the flag
cohort to see Join until the everyone-flag ships (`0354`, `0376`).
**Reversible:** trivially.

**Risks.** Low. A friendlier code (shorter, case-insensitive, no look-alike letters) would touch lobby-id
generation in `src/core/` (`generateID`, `Util.ts:249`) and the server — **out of scope**, a separate decision.

## 5. The smallest live test — zero code, zero deploy

The live 0.0.156 build already exposes everything needed (§3). So the test is a **5-minute owner console
probe in production**, not a build. No build task, no verify task, no weekend slot.

**Setup.** Desktop Chrome, signed in or not. Take the game's public catalog URL (the
`https://yandex.ru/games/app/<id>` address the browser shows on the game page) and add `?payload=probe1234`
(use `&payload=` if the URL already has a `?`). Open it. In DevTools → Console → the context dropdown, pick
**the game iframe** (the `geoconflict.ru` frame), **not `top`**.

**Run, after the main menu shows** (read-only; `S` = `FlashistFacade.instance.yandexGamesSDK`):

| # | Command | Answers |
|---|---|---|
| P1 | `S = FlashistFacade.instance.yandexGamesSDK; S?.environment?.payload` | §2.2 item 1 — **the key one** |
| P2 | `location.search.includes("payload")` and `location.hash` | item 6 (does it also land in our own URL?) |
| P3 | `typeof S?.environment?.app?.id` (just "string" — do not paste the id anywhere) | app id reachable |
| P4 | `await S.features.GamesAPI.getGameByID(Number(S.environment.app.id))` | item 4 — `isAvailable` and `game.url` |
| P5 | `(await S.features.GamesAPI.getAllGames()).games.map(g => g.url)` | item 4 fallback |
| P6 | `[...(location.ancestorOrigins ?? [])]` and `document.referrer` | the last-rung fallback |
| P7 | `await S.clipboard.writeText("probe-sdk")` then paste anywhere; then `await navigator.clipboard.writeText("probe-native")` and paste | item 7 (and whether today's copy already fails silently) |
| P8 | Play any match, exit it, re-select the iframe context, re-run P1 | item 5 — re-join loop risk |

**Round trip.** Take `game.url` from P4, add `payload=probe5678` with the URL API, open it in a fresh
incognito window, repeat P1. **Portals:** `yandex.ru` first; then **one other domain** (e.g. swap the host to
`yandex.com` or `yandex.kz` on the same path). Mobile has no easy console — skip unless desktop says yes.

**Reading the result.**
- **YES (build A is viable):** P1 = `"probe1234"` on yandex.ru **and** the second domain, **and** P4 or P5
  returns this game with a `yandex.<tld>/games/...` URL whose round trip also gives P1. P8 tells us whether
  consume-once is mandatory (assume it is regardless).
- **NO for links:** P1 is `undefined` on yandex.ru (payload does not reach iframe games) → links are not
  doable through the documented path; B is the end state. Ask Yandex support before giving up entirely.
- **PARTIAL:** P1 works but P4/P5 do not return this game → links need the self-built fallback (P6) —
  that is the "hardcoded shape" the owner objected to; owner call.

**Who runs it.** The owner (needs the catalog URL and a desktop DevTools session). An agent with the browser
tool could run it read-only **if given the catalog URL** — but it would be a real production session from
the agent's network, so the owner should choose.

**If a console probe is impossible** (e.g. mobile only): fall back to a coded tester-only probe — log
`payload` presence (a fixed label, never the value) plus `getGameByID` availability as an analytics event.
That **is** a build: build task this sprint, ship in a weekend slot, verify task at the top of the next sprint.

## 6. Comparison

| | Rules compliance | Size | Undocumented dependencies | Friend's effort | Needs deploy + verify split |
|---|---|---|---|---|---|
| **A** link + payload (+ code) | Likely OK (8.4.1 "via SDK"); moderation view unconfirmed | ~150–250 lines on top of B | 5 (§2.2 items 1, 2, 4, 5, 9) | One tap | Yes |
| **B** code only | Certain | ~40–80 lines | 0 (paste button: 1, minor) | Find Join, type 8 case-sensitive chars | Yes, but trivial to verify |

## 7. Recommendation

**Ship B now and run the zero-deploy probe now; decide A from the probe's result.**

- B is needed in **every** end state (the owner wants codes regardless, and A keeps the code as its
  fallback), it removes the rule violation with certainty, and it is ~40–80 lines.
- The probe costs nothing, needs no deploy, and answers the owner's exact doubt ("does Yandex pass the
  parameter to iframe games") before a line of A is written.
- If the probe says YES, file A as an **additive** build task (B's code copying stays) with its verify task
  at the top of the following sprint.

**Main tradeoff accepted:** until A ships (if ever), friends join by typing a case-sensitive 8-character code
— real friction, and the Join button is only visible to the flag cohort. We accept friction over a rules
violation or an undocumented dependency.

**De-risk before committing to A:** probe P1/P4/P8 on two domains; optionally ask Yandex support whether a
clipboard link to the same game with `payload` is acceptable under 8.4.1.

## 8. Open questions

- **Q1 (owner):** approve "B now + probe now, A after"? (see the NEEDS-DECISION in the consult reply).
- **Q2 (owner):** who runs the probe — the owner, or an agent with the browser tool given the catalog URL?
- **Q3 (owner, only if A is built):** should a portal invite link open the join window for a friend who is
  **not** in the private-lobby flag cohort? Today's `#join=` does (`Main.ts:725-731` ignores flags); `0376`'s
  brief reads "joining by invite is free and works whatever the flags say".
- **Q4 (owner):** keep the 8-character case-sensitive code, or file a separate decision on friendlier codes
  (touches `src/core` + server)?
- **Q5 (technical, from the probe):** §2.2 items 1–8.

## 9. Follow-ups

- If the owner rules, record it with `fkit-record-decision` as an ADR (task 0199 step 5), including the
  "B now, A conditional" shape so it is not re-litigated.
- The wiki page `wiki/decisions/yandex-invite-portal-boundary.md` is stale against the 2026-10-03 ruling;
  `fkit-wiki` should ingest this report (and the ADR once written). The architect does not write the wiki.
- No source code was written, nothing committed.
