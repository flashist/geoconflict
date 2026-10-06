# Plan — 0301 "What is citizenship?" explainer popup and purchase funnel

**Status of this plan:** planning only. No source or file was written while making it. Built from the brief, the `0302` / `0248` / `0303` / `0354` / `0311` records, and a read of the working tree on 2026-10-06 (`dev`, tree contains `0248` from commit `91eb99a`; prod is `0.0.156`).

## Summary
- **New popup `<citizenship-explainer-modal>`:** says what citizenship is, what it gives, and how to get it free (the numbers come from code constants), then shows a Buy button.
- **The card stays the only owner of purchase state.** The popup asks the card *"what may I offer?"* and *"buy for me"*, so the buy rule exists once and cannot drift. Buying from the popup is the card's own buy path, so the card ends up in the same state either way.
- **Three ways in:** a text link on the citizenship card, a *Citizenship* section in Instructions, and a tap on the locked Create Lobby button (this replaces `0302`'s interim popup).
- **`0302`'s interim popup is deleted:** the code, its test, its `citizens_only_modal.*` keys and its element in both templates. `0302`'s locked look (`locked_feature.citizens_only`) stays.
- **Funnel analytics:** one *opened* event per source, plus separate tap events for Buy and Login inside the popup.
- **The copy draft (en + ru) is in §3, for owner approval at this gate (brief Step 0.3).** Five owner questions are in §9.

## 1. Step 0 — benefit table, re-checked against the code (2026-10-06)

| Benefit | In code today | Evidence | Proposed in copy |
|---|---|---|---|
| ★ citizen badge | Yes (`0068`) | `CitizenBadge.ts`; called from `Leaderboard.ts`, `PlayerPanel.ts`, `HostLobbyModal.ts`, `JoinPrivateLobbyModal.ts` | **Yes** |
| Name change (moderated) | Yes (`0067`, plus `0314` / `0321` / `0322`) | `CitizenshipCard.renderNameChange()`; the server refuses non-citizens | **Yes** |
| Personal inbox | Yes (`0012`) | `Inbox.ts` | **No** — weak as a selling point (Q4) |
| Private lobbies (creating one) | **Built** (`0302`, live since 0.0.155), but **hidden for everyone except testers** until the owner sets the `private_lobbies_all` flag (`0354`) | `PrivateLobbyAccess.start()` | **Only when the player can see the button** (Q3) |
| No full-screen ads (paid only) | **Built** (`0248`, committed in `91eb99a`, **not deployed**). All six placements, on entering and on leaving a match, gated inside `showInterstitial()` | `FlashistFacade.ts` ~`:2197` | **Yes**, worded as built: full-screen only, before and after matches, bought citizenship only |
| Full emoji set | No (`0249` in backlog) | — | **No** |
| Match archive, nickname styling, map voting, replays, custom flags | No | — | **No** |

**How this differs from the brief's snapshot table.** Two rows changed: private lobbies and ad-free are now built. Both changes were expected by the brief's 2026-09-26 note ("each of them that has shipped becomes a claimable line"). How to word them is put to the owner here (Q1, Q3). That satisfies Step 0.2's "stop and route" at this plan gate.

**What the coder cannot check: Step 0.1's *production* half.** Seeing the ★ badge and name change working for a real citizen in the live game needs a citizen account inside Yandex. The coder has neither. See Q5. The result goes into `worklog.md` either way.

**Two release facts the owner should know:**
- `0248` is already in `dev`. Any deploy of `0301` therefore also deploys `0248`, and `0248`'s own deploy conditions (`0396` passed, `0397` live) bind this deploy too. So the ad-free line can never go live without the ad-free feature.
- `0354`'s release gate item 5 ("the citizenship popup has shipped") is met only when `0301` is **deployed**, not when it is built.

## 2. Design

### 2.1 One owner of purchase state: the card
`CitizenshipCard` already holds the profile, `paidGrantConfirmed`, the purchase in-flight latch and the error state. It is also the page's only profile reader; a second reader could fire `Citizenship:Earned:XP` twice. So the popup never reads the profile and never calls `runCitizenshipPurchase()` itself.

**New pure module `src/client/CitizenshipOffer.ts`:**
```ts
export type CitizenshipOffer =
  | { kind: "checking" }                       // no read applied yet, re-read in flight, or card not yet revealed
  | { kind: "guest"; canLogIn: boolean }      // canLogIn = yaGamesAvailable && !isYandexDegraded()
  | { kind: "citizen" }                       // profile.isCitizen || paidGrantConfirmed (the card's own rule)
  | { kind: "read_failed" }                   // !profile.isAuthoritative
  | { kind: "no_product"; xp: number }        // authoritative non-citizen, catalog has no citizenship product
  | { kind: "buy"; price: string; xp: number };
export function deriveCitizenshipOffer(input: {...}): CitizenshipOffer
```
- The order of checks copies today's card exactly: checking → guest → citizen → not authoritative → product null → buy.
- This is the brief's double-charge guard (`0018` review R1), written once.

**Changes to `CitizenshipCard.ts`:**
- **`public getCitizenshipOffer(): CitizenshipOffer`** — `deriveCitizenshipOffer` over the card's own state. If the card has not been revealed (`!isEnabled`), it returns `checking`.
- **The card's own rendering uses the same value:**
  - The buy CTA renders only when `offer.kind === "buy"`.
  - The guest login button renders only when `offer.canLogIn`.
  - Behaviour does not change. The card's ~180 existing tests are the regression net and must pass unedited.
- **`public buyCitizenship(tapElementId: string): Promise<CitizenshipPurchaseResult | "busy">`** — today's `onBuyCtaTap` body with the tap id as a parameter.
  - The card's button passes `uiElementIds.purchaseCitizenship`; the popup passes `uiElementIds.purchaseCitizenshipExplainer`.
  - The in-flight latch is shared, so a tap on the card and a tap in the popup can never start two purchases. The second one returns `"busy"`.
  - `paidGrantConfirmed`, the status publish and the profile re-read stay exactly as they are. That is what makes "buying from the popup leaves the card in the same state" true by construction.
- **`public logIn(tapElementId: string): Promise<void>`** — today's `onLoginCtaTap` with the tap id as a parameter.
  - The card passes `citizenshipLoginToEarn`; the popup passes `citizenshipLoginExplainer`.
  - The bubbling `CITIZENSHIP_LOGIN_*` events, which `Main.ts` listens for on `document`, are unchanged.
- **`updated()` dispatches `CITIZENSHIP_OFFER_CHANGED_EVENT` on `window`.** The open popup re-renders on it, for example when the profile lands or the catalog settles while the popup is open.
- **The "What is citizenship?" text link** (`<button>` styled as a link, id `citizenship-explainer-link`) at the bottom of the card. Which states show it is Q2; the Rec is every state except "checking". On click it calls `openCitizenshipExplainer({ source: "CardLink" })`.

### 2.2 The popup — `src/client/CitizenshipExplainerModal.ts`
- **Pattern:** follows `GameStartingModal` / `CitizenshipRestartModal`: `@customElement`, `@state() isVisible`, shadow-DOM `static styles`.
- **Size and stacking:** overlay `z-index: 10000`, so it sits above the Instructions `o-modal` (9999), which stays open underneath. Box `max-height: 90vh; overflow-y: auto` for small phones.
- **`async show(source)`:**
  - Does nothing while `isCitizenshipSurfacesEnabled()` is false (the kill switch).
  - Reads `isPrivateLobbyRowEnabled()` (see §2.4) for the private-lobby line.
  - Becomes visible and fires `Citizenship:Explainer:Opened:<source>`, only after the kill-switch check passes.
- **`close()`** hides it. The `close` name lets `closePreStartModals()` close it when a match starts.
- **Content, top to bottom:**
  1. Title and intro.
  2. "What citizens get" list: badge, name change, private lobbies (conditional), no full-screen ads (paid).
  3. "Get it for free": `{xpPerMatch}` from `XP_PER_MATCH` and `{threshold}` from `CITIZENSHIP_XP_THRESHOLD` (`src/core/profile/Citizenship.ts`) — never hard-coded. Plus "You have {xp} of {threshold} XP" when the offer carries `xp`.
  4. The action area, driven by `card.getCitizenshipOffer()`:
     - `buy` → "Or buy it now" + button `citizenship_paid.buy_cta — {price}`. On tap: `card.buyCitizenship(purchaseCitizenshipExplainer)`. An `"error"` result shows `citizenship_paid.purchase_error` under the popup's own button, for its own tap only, so a stale card error never appears in a freshly opened popup.
     - `guest` → login hint, plus `citizenship_card.login_cta` when `canLogIn`. On tap: `card.logIn(citizenshipLoginExplainer)`.
     - `citizen` → "You are already a citizen." No buy button.
     - `read_failed` → reuses `citizenship_status.read_failed`. No buy button.
     - `no_product` → nothing (the same as the card).
     - `checking`, or no card found → reuses `citizenship_status.checking`.
  5. A Close button.
- **Listeners while connected:**
  - `CITIZENSHIP_OFFER_CHANGED_EVENT` → `requestUpdate()`.
  - `CITIZENSHIP_GRANTED_MID_SESSION_EVENT` → `close()`. A successful purchase dispatches this inside `runCitizenshipPurchase()` before the card's re-read, so the popup gets out of the way of `0303`'s "restart to apply" popup at once.

### 2.3 Opener and sources — `src/client/CitizenshipExplainer.ts`
- `openCitizenshipExplainer(source)` does a `document.querySelector` for `<citizenship-explainer-modal>`, followed by `show(source)`. It uses `import type` only, the same idiom as `LockedFeature.ts`.
- `source` is `{ source: "CardLink" } | { source: "Instructions" } | { source: "LockedFeature"; featureId: string }`.
- **`LockedFeature.ts` → `onLockedFeatureTap(featureId)`:** still fires `LockedFeature:Tap:{id}` first, then opens the explainer with `{ source: "LockedFeature", featureId }`. Its header comment is updated.

### 2.4 Private-lobby line follows the button's own visibility rule
- `PrivateLobbyAccess.start()`'s visibility test moves, unchanged, into an exported `isPrivateLobbyRowEnabled(): Promise<boolean>`: surfaces on AND (tester marker OR `private_lobbies_all`).
- `start()` calls it, and the popup calls the same function. One rule, two readers.
- In dev builds every flag reads true, so the line shows locally.

### 2.5 Instructions entry point
- New small light-DOM element `<citizenship-help-section>` (`src/client/CitizenshipHelpSection.ts`), rendered at the **top** of `HelpModal`'s content with an `<hr>` after it.
- **Kept out of `HelpModal` for testability:** a `HelpModal` test would have to load the Maps / Difficulties components.
- **Hidden by default** (fail closed). After `flashist_waitGameInitComplete()`, `isCitizenshipSurfacesEnabled()` decides.
- **Content:** title, one-line description, and a link that calls `openCitizenshipExplainer({ source: "Instructions" })`.
- **Closing:** the popup opens above Instructions, and closing it returns the player to Instructions.

### 2.6 Analytics (Step 4)

| Constant | Event string | When |
|---|---|---|
| `analyticEvents.CITIZENSHIP_EXPLAINER_OPENED_FIRST_PART` + `citizenshipExplainerSources.cardLink` | `Citizenship:Explainer:Opened:CardLink` | Popup actually shown from the card link |
| … + `.instructions` | `Citizenship:Explainer:Opened:Instructions` | Shown from Instructions |
| … + `.lockedFeature` + `:` + `lockedFeatureIds.privateLobby` | `Citizenship:Explainer:Opened:LockedFeature:PrivateLobby` | Shown from a locked-perk tap. Five colon parts — the GameAnalytics maximum, already used by `Profile:Login:SignatureAge:*`. Later perks add their own id |
| `uiElementIds.purchaseCitizenshipExplainer` | `UI:Tap:PurchaseCitizenshipExplainer` | Buy tapped **in the popup**. The existing `Purchase:Started/Completed/Abandoned:Citizenship` events follow, unchanged |
| `uiElementIds.citizenshipLoginExplainer` | `UI:Tap:CitizenshipLoginExplainer` | Login tapped in the popup |

- Fired through a new `FlashistFacade.logCitizenshipExplainerOpenedEvent(sourceSuffix)` (mirrors `logLockedFeatureTapEvent`) and the existing `logUiTapEvent`. No inline strings.
- **`analytics-event-reference.md` updates:**
  - A new *Citizenship Explainer Events* table.
  - Two new `UI:Tap` rows.
  - The `LockedFeature:Tap:PrivateLobby` row: "citizens only popup" → "citizenship explainer".
  - The convention note's "belongs to task 0301" line.
  - The *obsolete `UI:Tap:CitizenshipLearnMore`* note gets a dated addendum: the Learn-more surface now exists, and its signal is `Citizenship:Explainer:Opened:CardLink`. The dropped string is **not** re-added. The "no researched-but-didn't-buy signal" cost is now closed.

## 3. Proposed copy — en + ru (owner approval needed, Step 0.3)

Rules followed: no game name (`0311` guard test `NoGameNameInPlayerText.test.ts` checks it); numbers only as parameters; nothing that is not built; ru is the primary audience.

**New section `citizenship_explainer`:**

| Key | en | ru |
|---|---|---|
| `link` | What is citizenship? | Что такое гражданство? |
| `title` | What is citizenship? | Что такое гражданство? |
| `intro` | Citizenship is a special player status. Citizens get extra features in the game. | Гражданство — особый статус игрока. Граждане получают дополнительные возможности в игре. |
| `benefits_title` | What citizens get | Что получают граждане |
| `benefit_badge` | A ★ citizen badge next to your name in matches | Значок ★ гражданина рядом с вашим именем в матчах |
| `benefit_name_change` | Change your display name (a moderator checks each new name) | Смена имени (каждое новое имя проверяет модератор) |
| `benefit_private_lobby` *(conditional, Q3)* | Create private lobbies to play with friends (anyone can join them) | Создание приватных лобби для игры с друзьями (присоединиться может любой) |
| `benefit_no_ads` | No full-screen ads before and after matches — for bought citizenship only | Без полноэкранной рекламы перед матчами и после них — только для купленного гражданства |
| `free_title` | Get it for free | Как получить бесплатно |
| `free_body` | Play multiplayer matches: each match you play gives {xpPerMatch} XP. Reach {threshold} XP and citizenship is yours for free. | Играйте в мультиплеере: каждый сыгранный матч даёт {xpPerMatch} XP. Наберите {threshold} XP — и гражданство ваше бесплатно. |
| `your_xp` | You have {xp} of {threshold} XP. | Сейчас у вас {xp} из {threshold} XP. |
| `buy_title` | Or buy it now | Или купите сразу |
| `login_hint` | Log in with Yandex to earn XP or buy citizenship. | Войдите в Яндекс, чтобы копить XP или купить гражданство. |
| `already_citizen` | You are already a citizen. | Вы уже гражданин. |
| `close` | Close | Закрыть |

**Added to `help_modal`:**

| Key | en | ru |
|---|---|---|
| `citizenship_title` | Citizenship | Гражданство |
| `citizenship_desc` | A special player status with extra features. You can earn it for free by playing matches, or buy it. | Особый статус игрока с дополнительными возможностями. Его можно получить бесплатно, играя в матчах, или купить. |

The Instructions link text reuses `citizenship_explainer.link`.

**Reused unchanged:**
- `citizenship_paid.buy_cta` (+ " — {catalog price}", exactly as on the card)
- `citizenship_paid.purchase_error`
- `citizenship_card.login_cta`
- `citizenship_status.checking`
- `citizenship_status.read_failed`

**Removed:** `citizens_only_modal.title` / `.body` / `.close` (en + ru).

**Notes on the wording:**
- **"Multiplayer" / «мультиплеер»:** XP is credited only by the game server at the end of a match; singleplayer runs locally and earns nothing. «Мультиплеер» is the name of the start-screen tab.
- **"each match you play":** the server's qualification rule is "spawned, and alive or eliminated". "Played" is the plain-language version of that.
- **Ad line:** says "full-screen", because the sticky banner is not covered. Says "before and after matches", because those are the six built placements (four on entering, two on leaving), and `0248`'s residual is that an ad Yandex shows on its own cannot be stopped. Says "bought only", because earned citizens still see ads.
- **"You are already a citizen."** is deliberately not "all of these are yours": an earned citizen does not get the ad-free line.

## 4. Removing `0302`'s interim popup
- **Delete:** `src/client/CitizensOnlyModal.ts`, `tests/client/CitizensOnlyModal.test.ts`.
- **`Main.ts`:** remove `import "./CitizensOnlyModal"`; add `import "./CitizenshipExplainerModal"` and `import "./CitizenshipHelpSection"`.
- **`src/client/index.html` and `src/client/yandex-games_iframe.html`:** replace `<citizens-only-modal>` with `<citizenship-explainer-modal>` (iframe ~`:455`, index ~`:325`).
- **`LangSelector.ts`** re-render list: `citizens-only-modal` → `citizenship-explainer-modal`, and add `citizenship-help-section`.
- **`PreStartModals.ts`:** add `citizenship-explainer-modal`.
- **Lang files:** remove `citizens_only_modal` from en + ru.
- **Kept:** `locked_feature.citizens_only` and `Button.ts`'s locked look (brief verification 11: "locked look unchanged").
- **Exit check:** `grep -rn "citizens-only\|CitizensOnly\|citizens_only_modal" src tests resources` returns nothing.

## 5. Files

**New:**
- `src/client/CitizenshipOffer.ts`
- `src/client/CitizenshipExplainer.ts`
- `src/client/CitizenshipExplainerModal.ts`
- `src/client/CitizenshipHelpSection.ts`
- the tests in §6

**Edited:**
- `src/client/CitizenshipCard.ts`
- `src/client/LockedFeature.ts`
- `src/client/PrivateLobbyAccess.ts` (extract the predicate only)
- `src/client/HelpModal.ts` (one element plus `<hr>`)
- `src/client/Main.ts` (imports)
- `src/client/PreStartModals.ts`
- `src/client/LangSelector.ts`
- `src/client/flashist/FlashistFacade.ts` (enum, ids, sources, log method)
- `src/client/index.html`
- `src/client/yandex-games_iframe.html`
- `resources/lang/en.json`
- `resources/lang/ru.json`
- `ai-agents/knowledge-base/analytics-event-reference.md`

**Deleted:**
- `src/client/CitizensOnlyModal.ts`
- `tests/client/CitizensOnlyModal.test.ts`

Nothing under `src/core/` changes; the constants are only imported. No server or profile-server change, no migration.

## 6. Order of work and tests
1. **`CitizenshipOffer.ts`** + `tests/client/CitizenshipOffer.test.ts`: one case per kind, plus precedence (citizen beats read_failed through `paidGrantConfirmed`; not authoritative beats product).
2. **Card refactor** (`getCitizenshipOffer`, `buyCitizenship`, `logIn`, offer-changed event).
   - Run the existing `CitizenshipCard.test.ts` **unedited first**. It must stay green: proof that behaviour did not change.
   - Then add tests:
     - `buyCitizenship(explainer id)` logs `UI:Tap:PurchaseCitizenshipExplainer` and leaves the same state as a card tap (citizen state, status published, grant event fired).
     - One shared latch: card tap in flight plus popup tap → exactly one `runCitizenshipPurchase` call, the second returns `"busy"`.
     - `logIn` passes its tap id.
     - The offer-changed event fires on update.
     - The link shows in the states Q2 decides and opens the explainer with `CardLink`.
3. **Analytics constants and facade method** + a `FlashistFacade.test.ts` case for the event strings.
4. **Explainer modal and opener** + `tests/client/CitizenshipExplainerModal.test.ts`:
   - registered tag;
   - kill switch off → stays hidden, no event;
   - one *opened* event per show, carrying the source;
   - every benefit key renders; the private-lobby line only when `isPrivateLobbyRowEnabled()` is true;
   - the free route uses parameters `{ xpPerMatch: XP_PER_MATCH, threshold: CITIZENSHIP_XP_THRESHOLD }`;
   - per offer kind: buy button only for `buy`, with the price; error line on `"error"`; no-op on `"busy"`; login only for `guest` with `canLogIn`; citizen line; read_failed / no_product / checking show no buy;
   - the grant event closes it; the offer-changed event re-renders; `close()` works.
5. **`LockedFeature` re-point and `isPrivateLobbyRowEnabled` extract.** Update `PrivateLobbyAccess.test.ts`: it mounts `<citizenship-explainer-modal>`, and a locked tap fires `LockedFeature:Tap:PrivateLobby` and then opens the explainer with `{ LockedFeature, PrivateLobby }`, never the host modal. Add tests for the extracted predicate.
6. **Help section** + `tests/client/CitizenshipHelpSection.test.ts`: hidden by default; shown only when surfaces are on; the link opens the explainer with `Instructions`.
7. **Delete the interim popup** (§4). Update `PrivateLobbyLang.test.ts` (drop the `citizens_only_modal` keys, keep `locked_feature`), `LangSelectorRerender.test.ts` and `PreStartModals.test.ts`.
8. **Lang files** (after owner approval of §3) + `tests/client/CitizenshipExplainerLang.test.ts`: every new key in en and ru; matching `{placeholders}`; removed keys absent. `NoGameNameInPlayerText.test.ts` runs unchanged.
9. **Both HTML templates**, `Main.ts` imports, analytics reference doc.
10. **Gates:** targeted suites; then `npx tsc --noEmit`, `npm run lint`, prettier check, full `npm test`. If a known `supertest` flake shape appears, re-run and say so; never retry silently.
11. **Local look in dev** (`npm run dev`, where all flags read true): link → popup → Close; Instructions → section → link → popup above Instructions; ru and en with no raw keys showing.
    - ⚠️ **The locked-tap path cannot be reached in dev:** `isCreateLocked()` returns false there. It is covered by unit tests only.
    - ⚠️ **No real purchase is possible locally** (no Yandex catalog).

## 7. Edge cases covered
- **Popup open while the profile is still loading** → "checking" line; it updates live when the read lands (offer-changed event).
- **Read failed, or catalog without the product** → no working Buy, the same as the card (the double-charge guard, one rule).
- **Purchase already running from the card** → the popup's tap returns `"busy"`; no second charge.
- **Successful purchase** → the popup closes on the grant event, so `0303`'s restart popup is not covered. The card shows the citizen state without a reload (its existing path).
- **Purchase error** → the error line under the popup's button, for its own tap only.
- **Degraded or non-Yandex boot, guest** → no dead login button (the same `canLogIn` rule as the card).
- **Match starts while the popup is open** → closed by `closePreStartModals()`. A purchase in flight keeps running and the card applies the result (unchanged behaviour).
- **Kill switch off** → the card is hidden, so no link; the help section stays hidden; the locked row is hidden; `show()` refuses anyway.
- **Late flag recovery** (`0329`) → the card's link appears with the card; the help section stays hidden for that load (fail closed — accepted, as for the private-lobby row).
- **Esc** → `HelpModal`'s window-level Esc also closes Instructions underneath. Accepted, not handled.

## 8. Verification (brief steps, mapped)
- **1:** `worklog.md` gets the §1 table with date and version, plus the owner's copy approval.
- **2–7:** unit tests (§6) plus the local dev look. ⚠️ **What needs a deploy and a live check:**
  - a real purchase from the popup, with the card updating without a reload;
  - the guest login inside Yandex;
  - the popup inside the real Yandex iframe;
  - the locked-tap path for a tester.

  Under the owner's standing rule (2026-09-29) these go to a **separate verify task at the top of the next sprint**. The producer files it; they are not claimed by this build.
- **8:** the lang tests, plus the local ru/en check.
- **9:** grep the new copy for ads / emoji / private lobbies / archive.
  - "Private lobbies" and "full-screen ads" are expected, per §1.
  - Emoji, archive, replays, map voting, flags and "coming soon" must not appear.
- **10:** `npm test` and `npm run lint` green.
- **11:** §4's grep is empty; the locked tap opens the explainer (unit test); the locked look is unchanged.

## 9. Open questions (owner) — answers bind the build
- **Q1** — Copy approval (§3, en + ru).
- **Q2** — Who sees the card's "What is citizenship?" link.
- **Q3** — Show the private-lobby line only to players who can see the Create Lobby button.
- **Q4** — Built perks only: no inbox line, no "coming soon" lines.
- **Q5** — When the ★ badge and name change get confirmed in production.

**Defaults if the owner takes the recommendations:** copy as drafted; link in every card state except "checking"; private-lobby line conditional; built perks only; production check by the owner before close.

## 10. Not in scope
- Store-description copy.
- `PROJECT.md`.
- The wiki (after close, ask `fkit-wiki` to ingest this task).
- Emoji (`0249`), archive (`0030`), the `0343` perks — the brief's suggested standing rule is "a perk adds its explainer line in the task that ships it".
- Committing or deploying.
