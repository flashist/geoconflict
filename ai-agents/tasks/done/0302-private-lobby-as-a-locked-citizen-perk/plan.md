# Plan (revised after your 2026-09-27 rulings): 0302 private lobbies as a locked citizen perk

**Planning only. No files written.** The driver writes `plan.md` after you approve.

## Summary
- **Your rulings are applied:**
  - Create Lobby is locked in the page for non-citizens.
  - The server also refuses to **start** a private match unless the lobby's creator is a citizen.
  - A refused start shows a **generic "couldn't start" error**, not the citizens-only popup.
  - Profile unreadable or still loading → shown locked.
  - Join Lobby is always free.
- **New: a remote on/off switch for the whole feature.** Name `private_lobbies`, value `enabled`. It is separate from `citizenship_ui`. When it is off, the row stays **hidden exactly as today**, whatever the player's citizenship.
- **"Only for me" is possible, but not by player id.** Yandex's documented flag conditions are language, region, platform and **"client features"** (a `name=value` pair the game sends). There is **no documented per-player targeting.** My recommendation is a **tester marker**. You set it once in your own browser; the game then tells Yandex `tester=1`; a console rule enables the flag only for requests carrying it. **No player id or personal data goes in the repo.** How to set this up is in open question 1.
- **The switch cannot secure anything, and the server cannot read it.** Yandex flags are delivered to each player's browser by the Yandex SDK; our server never sees them. The switch only decides whether the button is **visible**. Security is the server's citizens-only start check, which runs whether the switch is on or off.
- **The off-portal invite link stays task `0199`.** This task does not change the invite link. You can test the in-portal join with the switch on (steps below).
- Nothing under `src/core/`. It ships only together with `0301`, which waits on `0248` → `0250`.

## Owner rulings this plan follows (copied into `worklog.md` in step 0)
- 2026-09-26:
  - Perk approved; creating is the perk, joining stays free.
  - Rank 2.
  - Earned or paid citizens count, so no dependency on `0250`.
  - Forged-id risk accepted for now.
  - Temporary "citizens only" popup, no buy button, removed by `0301`.
  - Ships in the same deploy as `0301`.
- 2026-09-27:
  - Q1: page lock + server start gate; generic error on refusal.
  - Q2: profile unreadable → locked.
  - Q4: only Create is locked.
  - Q3: hidden in 2025 because player numbers were low (no longer a problem) and because you were unsure the copy-a-URL invite works inside the Yandex iframe. Drafts cannot test it (the game is embedded via iframe), so: a feature switch you can turn on for yourself.

## What the code does today (checked)
| Fact | Where |
|---|---|
| Row hidden on Yandex, visible in standalone | `src/client/yandex-games_iframe.html:314`; `src/client/index.html:201` |
| No citizenship check on the host or join click | `src/client/Main.ts:488-513` |
| `create_game` carries no identity; `start_game` has no auth and is the only way a private game starts | `src/server/Worker.ts:182-251, 254-269`; `src/server/GameServer.ts:942-955` |
| The server learns the creator's identity at the websocket join and resolves citizenship through the single identity funnel (earned or paid) | `src/client/Transport.ts:400`; `GameServer.ts:1279, 1320-1343`; `src/profile-server/Routes.ts:772` |
| The page learns citizenship only through the citizenship card's profile read | `src/client/CitizenshipCard.ts:154-157, 342, 598`; `src/client/PlayerProfileView.ts:57-111` |
| **Remote flags:** `getFlags()` is called **once per page load, with no parameters**, inside the platform-init deadline; the result is memoized; a timeout or failure leaves the flags absent, which reads as **off** | `src/client/flashist/FlashistFacade.ts:617-622, 849-889` |
| Flag check: `checkExperimentFlag(name, value)` is exact equality, **always true when `GAME_ENV=dev`**, false when flags are missing (degraded boot, non-Yandex page) | `FlashistFacade.ts:915-934` |
| A degraded boot that recovers re-fetches flags | `FlashistFacade.ts:778` |
| Cohort events `Experiment:{name}:{value}` fire automatically for every flag returned | `FlashistFacade.ts:891-902, 1189` |
| A console flip of `citizenship_ui` was proven to take effect in production (task `0238`) | wiki `tasks/citizenship-kill-switch-coverage.md` |
| No reusable player-facing generic error popup exists. `showErrorModal` is a private crash dialog ("paste to Discord", game id). The nearest existing text is `"Something went wrong. Please try again."` | `src/client/ClientGameRunner.ts:1236`; `resources/lang/en.json:66, 83` |

**Yandex docs, fetched 2026-09-27** (`yandex.com/dev/games/doc/en/sdk/sdk-config` and `/doc/en/config.md`):
- `getFlags` takes `defaultFlags` and `clientFeatures`.
- Console conditions: **Languages, Regions, Platforms, Client features (`param=value`)**.
- Limits: up to 100 flags, **one default value plus two conditional values** each.
- The docs recommend requesting flags once at startup.
- Player-id or percentage targeting is **not documented**.

⚠️ I cannot see our console. **You must check that a client-feature condition can be added to a flag there.**

## Step-by-step

**Step 0: records.** `worklog.md` gets:
- all the rulings above;
- the 2025 history finding (commit `18bb3e3` plus your stated reasons);
- the gate decision;
- the switch design.

**Step 1: the switch.** In `FlashistFacade.ts`:
- Add `PRIVATE_LOBBIES_FLAG_NAME: "private_lobbies"` and `PRIVATE_LOBBIES_ENABLED_VALUE: "enabled"` to `flashistConstants.experiments`, plus `isPrivateLobbiesEnabled()`, mirroring `isCitizenshipUiEnabled()` (`:957`). The flag gets the same treatment as every other remote flag:
  - fails closed on a degraded boot;
  - off in the non-Yandex standalone page;
  - on in dev;
  - read once per load, so a console change takes effect on the **next reload**.
- **Tester marker** (per open question 1, recommended option). Change the call at `fetchExperimentFlags` (`:871`) to `getFlags({ clientFeatures: [{ name: "tester", value: "1" }] })` **only** when the browser's `localStorage` key `geoconflict_tester` equals `"1"`. The read is wrapped in try/catch. Otherwise the call stays exactly `getFlags()` as today. No id is read, sent or stored.

**Step 2: citizenship status store.** New `src/client/CitizenshipStatus.ts`:
- A pure `deriveCitizenshipStatus(profile, paidGrantConfirmed)` → `"unknown" | "not_citizen" | "citizen"`.
- It returns `"citizen"` only for `profile !== null && ((isAuthoritative && isCitizen) || paidGrantConfirmed)`.
- publish / get / subscribe functions.
- `CitizenshipCard.ts` publishes in `refreshProfile()` (`:154`) and right after `paidGrantConfirmed = true` (`:598`).
- Buying unlocks without a reload. There is no second profile fetch, so `Citizenship:Earned:XP` cannot fire twice.

**Step 3: shared locked look.**
- `components/baseComponents/Button.ts`: new `locked` property. It adds a `c-button--locked` class, 🔒 and the `locked_feature.citizens_only` subtitle, and **stays clickable**. CSS goes in `styles/components/button.css`.
- New `src/client/LockedFeature.ts` with `onLockedFeatureTap(featureId)`: fires the analytics event and opens the temporary popup. `0301` re-points this one function to its explainer. Later perks (`0249`, `0030`, …) reuse it.

**Step 4: temporary "citizens only" popup** (removed by `0301`).
- New `src/client/CitizensOnlyModal.ts`, `<citizens-only-modal>`, following the `GameStartingModal.ts` pattern.
- Title, one line, Close. **No buy button.** Text via `translateText()`.
- `show()` does nothing while citizenship surfaces are off. Header comment: *"Interim (0302) — removed by 0301"*.
- Added to **both** `index.html` and `yandex-games_iframe.html`, and to the `LangSelector.ts:222` re-render list.

**Step 5: row controller.** New `src/client/PrivateLobbyAccess.ts`, started from `Main.ts`:
- Give the row the id `private-lobby-row` in both templates. It stays **hidden by default** in both (`index.html` changes from always visible; see edge cases).
- After `flashist_waitGameInitComplete()`, **show the row only if `isPrivateLobbiesEnabled() && isCitizenshipSurfacesEnabled()`.** Otherwise it stays hidden as today, whatever the citizenship.
- When shown: Create is `locked = status !== "citizen"`, updated live. Unknown, guest, non-citizen and profile-unreadable all show as locked (Q2 ruling).
- `Main.ts:490` host click: locked → `onLockedFeatureTap("PrivateLobby")`, and the host modal never opens. Unlocked → as today.
- Join button and invite-hash join (`handleHash`) are **never locked** (Q4 ruling).

**Step 6: server gate** (Q1 ruling).
- `GameServer.ts`: new `async creatorMayStartPrivateLobby(timeoutMs)`.
  - False when there is no `LobbyCreatorID`, or the creator is not connected.
  - True if `creator.isCitizen`.
  - Otherwise it waits for `resolveProfilePlayer(creator)`, **capped at about 5 s** (the resolve's own retries can take about 30 s, `ProfileApiClient.ts:22-24`), then re-reads the flag.
  - Identity is read only through `getCreditableYandexId` (ADR-103's single funnel).
- `Worker.ts:254` `start_game`: private and not allowed → `403 { error: "citizens_only" }`.
- `Client.ts:13-24`: update the comment. `isCitizen` now gates this one permission, owner-accepted (forged-id residual, re-raise conditions from the brief).
- **Does not read the `private_lobbies` switch.** The server cannot see Yandex flags. The check applies whether the switch is on or off.
- Fails closed: if the profile API is down, citizens cannot start private matches.

**Step 7: generic error on a refused start** (Q1 ruling).
- `HostLobbyModal.ts:808-832` `startGame()`: move `this.close()` to after a **successful** start response.
- On any non-OK response (the 403 or anything else), keep the host modal open and show an inline generic line, new key `host_modal.start_failed`: en *"Couldn't start the game. Please try again."*, ru *"Не удалось начать игру. Попробуйте ещё раз."*.
- The host stays in the lobby with their friends and can retry. That matters for a real citizen hit by a profile outage.
- Today these failures are silent, so this also makes every other start failure visible. No existing reusable surface fits: `showErrorModal` is a crash dialog.

**Step 8: analytics.**
- Add `LOCKED_FEATURE_TAP_FIRST_PART: "LockedFeature:Tap:"`, `lockedFeatureIds.privateLobby = "PrivateLobby"` and `logLockedFeatureTapEvent()`, mirroring `logUiTapEvent` (`FlashistFacade.ts:118, 1193`). The event is `LockedFeature:Tap:PrivateLobby`.
- The cohort event `Experiment:private_lobbies:enabled` fires automatically for sessions that get the flag.
- Document both in `ai-agents/knowledge-base/analytics-event-reference.md`.
- The explainer-opened event belongs to `0301`.

**Step 9: text.** Keys in **both** `en.json` and `ru.json`:
- `locked_feature.citizens_only`
- `citizens_only_modal.title` / `.body` / `.close`
- `host_modal.start_failed`

## Console setup for you (after deploy; nothing here goes in the repo)
1. Yandex Games console → Remote config: add flag `private_lobbies`. **Default value `disabled`.** Condition: client feature `tester=1` → value `enabled`.
2. In a **desktop** browser, open the game on Yandex, open DevTools, and in the Console switch the context dropdown to the game frame (`geoconflict.ru`). Run `localStorage.setItem("geoconflict_tester","1")`, then reload.
   - Mobile has no DevTools, so it cannot set the marker.
   - A browser that blocks storage in iframes would lose it.
3. Launch for everyone: change the flag's **default** to `enabled`.
4. Kill switch: set the default back to `disabled`. Remove the condition too if testers should lose it.

## How you can test the invite and join inside Yandex (switch on)
You need two Yandex accounts in two browsers or profiles: **A** is a citizen, **B** is any account. Both set the tester marker, because the Join button sits in the same row and is hidden for non-testers.
1. Reload both. A sees Create unlocked. B, if not a citizen, sees it locked; a tap shows the citizens-only popup. Join works for both.
2. A: Create Lobby. **Check whether "copy link" works inside the Yandex iframe.** Clipboard writes from a cross-origin iframe need a browser permission Yandex's frame may not grant; I have not verified this. The lobby ID is shown in the modal either way.
3. B: Join Lobby → paste or type the ID. A full `#join=` link also works: the join box extracts the ID (`JoinPrivateLobbyModal.ts:146`). **This path stays inside the portal.**
4. A: Start. The match should begin for both. This also pays off the production check `0198` waived: *"the re-enablement is the task that owes a production check"*.
5. Optional: open the copied link in a plain tab. You land **outside** the portal. That is task `0199`'s question: observe only, not fixed here.

## Tests
- `tests/client/CitizenshipStatus.test.ts`: every derivation case; subscribers are notified.
- `tests/client/PrivateLobbyAccess.test.ts`:
  - Hidden when the switch is off, whatever the citizenship (including citizen).
  - Hidden when surfaces are off or on a degraded boot.
  - Switch on: locked for unknown, guest and non-citizen, and a tap fires `LockedFeature:Tap:PrivateLobby`, opens the popup, never the host modal.
  - Unlocked for a citizen.
  - Unlocks live on a status change.
  - Join is never locked.
- `tests/client/FlashistFacade.test.ts`:
  - `getFlags` gets `clientFeatures: [{name:"tester",value:"1"}]` only when the marker is set.
  - Otherwise it is called with no parameters.
  - A throwing `localStorage` does not break the flag fetch.
  - `isPrivateLobbiesEnabled` is exact-match and false when flags are missing.
- `tests/client/CitizensOnlyModal.test.ts`: text renders, no buy button, does nothing while the kill switch is off.
- `tests/client/CitizenshipCard.test.ts`: the card publishes status.
- `tests/client/components/Button.test.ts`: `locked` look, still clickable.
- `tests/client/LangSelectorRerender.test.ts`: the new element is on the list.
- An en/ru parity check for the new keys, following `NameChangeLang.test.ts`.
- `HostLobbyModal`: a non-OK start keeps the modal open and shows `host_modal.start_failed`; an OK start closes it.
- `tests/server/PrivateLobbyStartGate.test.ts` (on the `CitizenFlag.test.ts` harness):
  - citizen → allowed; non-citizen → refused
  - creator absent → refused; no creator → refused
  - in-flight resolve that returns citizen within the cap → allowed; hanging resolve → refused at the cap
  - reconnect keeps the flag
- The `Worker.ts` route change is one line, not route-tested: the Worker's express app is built inline.
- Run `npm test` and `npm run lint`.

**Unverified until you run it:** every live Yandex check above, the console condition itself, clipboard inside the iframe, and a real purchase unlocking the button. The citizen path locally needs a running local profile server with a citizen row; if that isn't available, I will say so.

## Edge cases and honest limits
- **The tester marker is not secret.** Anyone who reads the shipped code can set it and see the row. They still need to be a citizen to start a match (server check), and they could already reveal a hidden button with DevTools today. The harm is limited to seeing the feature early.
- **Switch off does not mean the server refuses.** A citizen with a modified page can still create and start a private lobby. Accepted by design: the switch hides the feature, it does not secure it.
- **Changes need a reload.** Flags are fetched once per page load. A flag that times out at boot stays off for that session: the row is hidden, which is safe.
- **A citizen sees the lock for up to about 5 s** while the profile loads, and a tap in that window shows "citizens only" wrongly. Bounded by the card's read timeout; accepted as fail-closed (Q2 ruling).
- **Profile API down at start:** the citizen gets the generic error and stays in the lobby to retry. Refusal comes after the interstitial ad plays (existing order, `HostLobbyModal.ts:808`).
- **Host presses Start before their own websocket join lands:** refused with the generic error. In practice the join fires right after create.
- **Forged citizen id** still gets through the server check. Owner-accepted; the real fix is `0267`. `0068` R3 (`isCitizen` on the public lobby poll) falls under the same ruling. I recommend an ADR-103 addendum later (architect), not in this task.
- **Standalone `index.html` loses the row it shows today:** no Yandex flags there means the switch reads off.
- **Dev:** all flags are on (`GAME_ENV=dev`), so the row shows. Hosting still needs a local profile server with a citizen.

## Files
New: `src/client/CitizenshipStatus.ts`, `LockedFeature.ts`, `CitizensOnlyModal.ts`, `PrivateLobbyAccess.ts`, and the tests above.

Edited:
- `src/client/flashist/FlashistFacade.ts`, `CitizenshipCard.ts`, `Main.ts`, `HostLobbyModal.ts`, `LangSelector.ts`, `components/baseComponents/Button.ts`, `styles/components/button.css`
- `src/client/index.html`, `src/client/yandex-games_iframe.html`
- `resources/lang/en.json`, `ru.json`
- `src/server/GameServer.ts`, `Worker.ts`, `Client.ts` (comment only)
- `ai-agents/knowledge-base/analytics-event-reference.md`
- The task's `worklog.md`

No commit.

## Owner ruling on the remaining open question (2026-09-27, live via `AskUserQuestion` in the `fkit lead` session, relayed by fkit-lead)
- **"Only for me" mechanism:** "Tester marker (Recommended)" — the `localStorage` `geoconflict_tester=1` marker sends `clientFeatures: tester=1` to `getFlags`; a Yandex console condition enables `private_lobbies` only for it. The owner still has to confirm in the console that a client-feature condition can be added.
