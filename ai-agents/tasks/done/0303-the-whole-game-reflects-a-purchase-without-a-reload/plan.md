## 0303 — the whole game reflects a purchase: option (B), "restart to apply" popup (round 2)

### Owner rulings — 2026-09-28, given live via AskUserQuestion in the `fkit lead` session, relayed by fkit-lead (verbatim)
- **Q1** (how the game catches up): **"'Restart to apply' popup"**. Option text: *"After paying, a popup offers a restart. Covers everything, but an extra tap + up to ~5 s reload in Yandex; needs new text, a popup, 3 analytics events."* This was **not** the recommended option. The owner chose (B), **not** "Both".
- **Q2** (the free tenure-gift citizenship): **"Yes, same signal (Recommended)"**. Option text: *"~10 extra lines + tests. Free and paid citizens behave the same — which the privacy fix also needs."* ⚠️ This was asked under the (A) framing, so its meaning under (B) is unclear. It goes back to the owner as **NEEDS-DECISION Q-A**. It is not guessed here.
- **Q3:** **"Accept, ★ from next match (Recommended)"**.
- **Q4:** **"Tests + next real purchase (Recommended)"**.

### Step 0 inventory
Unchanged from round 1: the table read 2026-09-28 on game version 0.0.154. It is copied into `worklog.md` at build time, with the rulings above quoted. The rows that drive (B):
- A purchase is made only from the card's buy button, through `runCitizenshipPurchase()` (`CitizenshipPurchase.ts:27-88`). 0301's popup will reuse the same function.
- It **is** possible to buy while waiting in a public lobby (the start screen stays usable). It is **not** possible during a match.
- **Leaving a match always reloads the page** (`WinModal.ts:346`, `GameRightSidebar.ts:136`, `SettingsModal.ts:160`, `Main.ts:700`).
- These already update live after a purchase: the card (citizen state, buy button gone) and the private-lobby Create lock (0302).
- The bell dot does **not** update (confirmed live in 0.0.154). The name-change control and the XP figure need a successful re-read.
- The tenure gift is 3–50 XP. It can make a player a citizen only if they already have 50+ XP (`PlayerProfileRepository.ts:280-283`). The server's answer does not say whether the gift made them a citizen, because every citizen is shown XP = 100 (`Routes.ts:1523-1527`). The client can only tell by comparing the card's status before and after its re-read.

### What the restart actually changes today (stated honestly)
After a reload:
- the bell dot lights, because the inbox is read fresh at start-up;
- the name-change control and XP figure appear even if the re-read after purchase had failed;
- the ★ comes from the next lobby join (Q3).

**Under 0250 S1 a reload reveals no paid state.** The client learns only "citizen", so paid-only perks (0248 ad-free) wait for S3b whichever option is chosen. Once S3b exists, the restart covers them too.

### Build (client only)

1. **New `src/client/CitizenshipRestartOffer.ts`.** A small module with the logic, testable without a browser, in the style of `GameRestart.ts`. It holds:
   - the constant `CITIZENSHIP_GRANTED_MID_SESSION_EVENT` and the helper `dispatchCitizenshipGrantedMidSession(source: "purchase" | "tenure")`, which fires on `window`. `"tenure"` exists only if Q-A = option 1 or 2.
   - `createCitizenshipRestartOffer(deps)`. Its inputs:
     - `isAwayFromStartScreen: () => boolean` — Main passes `gameStop !== null`, which is already true in a lobby;
     - `isSurfacesEnabled: () => Promise<boolean>` — the kill switch;
     - `showPrompt: () => void`;
     - `reload: () => void`.
   - It returns:
     - `onGranted()`: if the kill switch is off, do nothing. If the player is away from the start screen, set **pending**. Otherwise show. The popup shows **at most once per page load** (an in-memory flag).
     - `onBackOnStartScreen()`: if pending, clear it and show.
     - `onMatchStarting()`: clear pending. The page reloads after the match anyway, so the popup is not needed.
     - `restart()`: re-checks for a live match. A match live means no reload, just hide (should be impossible, because the overlay covers the screen). Otherwise log `Restart` and call `reload`.
2. **`CitizenshipPurchase.ts:76-88`.** Call `dispatchCitizenshipGrantedMidSession("purchase")` right before `return "granted"`, and on no other path (error, abandoned, failed completion). Putting it inside the purchase function means 0301's popup gets the restart offer for free.
3. **New `src/client/CitizenshipRestartModal.ts`, the `<citizenship-restart-modal>` element.**
   - Follows the `GameStartingModal` pattern: `@customElement`, `@state() isVisible`, `show()` / `hide()`, the same overlay and box CSS, and a two-button row.
   - Title, body, **Restart now** and **Later**, all through `translateText()`.
   - Nothing closes it by clicking outside or pressing Esc, so "dismissed" and "Later" are the same thing.
   - `show()` logs `Shown`. **Later** logs `Later` and hides. **Restart now** calls the controller's `restart()`.
   - A `close()` alias hides it without logging, so the pre-start close list in `Main.ts` can shut it.
4. **`Main.ts`.**
   - Import `./CitizenshipRestartModal`.
   - Build the controller with `isAwayFromStartScreen: () => this.gameStop !== null`, `reload: () => FlashistFacade.instance.reloadApp()`, and `isSurfacesEnabled: () => FlashistFacade.instance.isCitizenshipSurfacesEnabled()`.
   - Add a `window` listener for the new event, next to the login-restart listener at `:298-312`.
   - Call `onBackOnStartScreen()` at the end of `handleLeaveLobby` (`:980-993`, after `setStartScreenControlsHidden(false)`). This covers leaving a public lobby (`PublicLobby.ts:346`), closing a private lobby (`JoinPrivateLobbyModal.ts:138`) and a hash change (`:537`).
   - Call `onMatchStarting()` in the pre-start step, and add `"citizenship-restart-modal"` to the close list at `:756-771`.
5. **Both HTML entry points.** Add `<citizenship-restart-modal></citizenship-restart-modal>` next to `<tenure-grant-modal>` in `src/client/index.html:323` **and** `src/client/yandex-games_iframe.html:453`.
6. **`LangSelector.ts:245-247`.** Add the tag to the list of elements redrawn on a language change.
7. **Analytics.** Three enum keys in `flashistConstants.analyticEvents` (`FlashistFacade.ts`, next to the `CITIZENSHIP_*` keys):
   - `CITIZENSHIP_RESTART_PROMPT_SHOWN: "Citizenship:RestartPrompt:Shown"` — fires when the popup actually appears, not when it is only pending;
   - `CITIZENSHIP_RESTART_PROMPT_RESTART: "Citizenship:RestartPrompt:Restart"` — fires right before the reload;
   - `CITIZENSHIP_RESTART_PROMPT_LATER: "Citizenship:RestartPrompt:Later"` — the dismiss.

   Why these names:
   - They are in the "Citizenship" category, not "Purchase", because the gift may also trigger the popup (Q-A).
   - Paid and gift popups are not split into separate events. The gift count can be worked out as `Shown` minus `Purchase:Completed:Citizenship`.
   - `Purchase:*:Citizenship` is unchanged.

   The rows go into `analytics-event-reference.md` § *Citizenship Events* in the same change.
8. **Localization.** Four keys under `citizenship_restart_modal`, in **both** `en.json` and `ru.json`. The text drafts are in NEEDS-DECISION Q-B and contain **no game name** (0311).
9. **Tenure (only if Q-A = 1 or 2).** In `CitizenshipCard.startTenureClaim` (`:187-205`):
   - read `wasCitizen` before the claim;
   - after `refreshProfile()`, if the status went from not-citizen to citizen, dispatch `"tenure"`. For option 1, dispatch only once the thank-you popup has been closed: `TenureGrantModal.show()` gets an optional `onClosed` callback, called from its CTA.
   - A failed re-read means no offer; the next load catches up. An existing citizen who gets the gift sees no offer.
10. **Worklog (at build time, not now).** The Step 0 table, the rulings quoted, and a decision log: the naming change, why `requestGameRestart` is not reused, no popup on reconciliation, and what was dropped from (A).
11. **Routing only.**
    - After closing: ask `fkit-wiki` to ingest.
    - Producer: add a note to the open perk briefs (0248, 0301, 0030, 0321, 0322, 0323): *"after a purchase the popup offers a restart and a match end reloads anyway, so a perk may read status at load time. A grant made by session-start reconciliation applies from the next load unless the perk listens to `PURCHASES_RECONCILED_EVENT`."*

**Not touched:** `GameRestart.ts`, `PaymentsReconciliation.ts`, `NewsButton.ts`, `Inbox.ts`, and the card's post-purchase branch. That branch stays as it is, because it is what a "Later" player and the screen behind the popup rely on.

### Why `requestGameRestart` is not reused (a change from the round-1 notes)
- Its events are the **login** restart funnel (`Profile:Login:Restart:*`). A purchase restart would be counted as a login restart in 0274's monitoring.
- It **refuses to reload** when sessionStorage is missing or throws (`GameRestart.ts:70-90`). That is right for an automatic reload, wrong for a button the player taps: in private mode the button would silently do nothing.
- Its latch exists to stop an **automatic** reload loop. This reload happens only on the player's own tap, and the popup cannot come back after the reload: a purchase grant does not recur, and reconciliation does not show it.

What is reused: `reloadApp()`, the same primitive as 0273, `StaleBuildModal` and the Bootstrap recovery reload, plus the same `gameStop !== null` match check.

### (A) pieces: kept or dropped under (B)
| Piece | Decision | Why |
|---|---|---|
| Stale-read guard in `refreshProfile` | **Dropped** (optional, Q-C) | The popup does not need it. The race it covers (first read against the post-reconcile read) exists today and does not come from 0303. Suggest a separate small task. |
| "Show threshold, not 0" on a failed re-read | **Dropped** (optional, Q-C) | The restart fixes it. It shows only when the re-read fails **and** the player taps Later. About 3 lines. |
| Rename `PURCHASES_RECONCILED_EVENT` | **Dropped** | (B) needs a new purchase signal, not a rename. The rename would buy nothing and would force a wiki fix. |
| Retry of the failed re-read | **Dropped** | The restart replaces it. |
| Live bell refresh after purchase | **Dropped** | That was (A). Under (B) the dot comes with the restart. |

### "Later" path
- The popup closes. It is not offered again this page load.
- The card still shows the citizen state, with no buy button, and the private-lobby lock is open. Both already worked live.
- The **bell dot stays dark until the next reload.** If the player opens the news popup, the Personal tab appears after a short delay (the existing refresh on open).
- The name-change control and XP figure are right if the re-read worked. If it failed, the name-change control is hidden and the XP reads "0 / 100" until the reload.
- Everything catches up **by itself at the next match end**, which reloads the page, or at the next launch.

### Reconciliation at session start: no popup (decided)
- The page is freshly loaded, but the grant lands after the init gate.
- The only surfaces read before that point already listen to `PURCHASES_RECONCILED_EVENT`: the card re-reads, the bell refreshes, and the private-lobby lock follows the card. The ★ is looked up fresh at the next join.
- A popup there would risk a chain: a player who taps Restart quickly can leave the consume unfinished, the next load's reconciliation re-grants, and the player gets a second popup right after restarting.
- The player also did not just act, so a "restart" popup at start-up would confuse them.
- **Remaining gaps:**
  - The bell refresh on reconciliation can still miss the message, because the server writes it after answering (the same race as before).
  - A future perk that reads status once at start-up is stale for that one session. This is rare: it needs a purchase whose completion failed.

### Tests
- `tests/client/CitizenshipRestartOffer.test.ts` (new):
  - On the start screen, the popup shows.
  - In a lobby, it is pending, then shows on return to the start screen.
  - When a match starts it stays pending with nothing shown, and it is cleared.
  - It shows at most once per load.
  - Kill switch off: never shown.
  - `restart()` reloads when no match is live, and does not when one is live.
  - The event fires with its source.
- `tests/client/CitizenshipPurchase.test.ts`: the event fires on `"granted"`; **not** on no-intent, frame rejected, missing signature, or failed completion.
- `tests/client/CitizenshipRestartModal.test.ts` (new, like `TenureGrantModal.test.ts`):
  - It renders the keys.
  - `show` logs `Shown`.
  - Restart calls `restart()` and logs `Restart`.
  - Later logs `Later` and hides.
  - `close()` hides and logs nothing.
- `tests/client/CitizenshipRestartLang.test.ts` (new, in the style of `PrivateLobbyLang.test.ts`): all four keys are present and non-empty in en and ru; en and ru have the same key set; the text contains neither "Geoconflict" nor "Геоконфликт".
- `tests/client/LangSelectorRerender.test.ts`: add the new tag.
- `PaymentsReconciliation.test.ts`: assert that reconciliation does **not** fire the new event.
- If Q-A = 1 or 2: in `CitizenshipCard.test.ts`, a gift that makes a citizen fires `"tenure"` (after the popup closes, for option 1); an existing citizen, or a failed re-read, fires nothing. `TenureGrantModal.test.ts`: `onClosed` fires from the CTA.
- The `Main.ts` wiring (three small hooks) has **no unit test**, because no `Main.ts` test setup exists. It is covered by the owner's live check (Q4).
- Then run `npm test` and `npm run lint`. A supertest failure is treated as the known flake only if it matches the CLAUDE.md signature; I re-run and say so.

### Verification mapping
- **Step 1:** the worklog.
- **Step 2:** under (B), "no reload" becomes "the popup appears; after Restart the dot, tab and name-change control are there". The "Later" behaviour is recorded as accepted.
- **Step 3:** the existing `paidGrantConfirmed` keeps the buy button away; the name-change control comes after the restart.
- **Step 4:** the existing listeners; no popup, by decision.
- **Step 5:** existing behaviour (Q3).
- **Step 6:** unit tests, plus the owner's live check at the next real purchase (Q4): the popup appears, Restart reloads inside the Yandex iframe, after the reload the bell dot is lit, and the 3 events arrive.
- **Step 7:** the kill-switch test.
- **Step 8:** the purchase path. The reconciliation path deliberately keeps its existing signal only.
- **Step 9:** `npm test` / `npm run lint`.

### Deploy order
- **Client only.** It ships in any client release. There is no profile-server, game-server or database change, and it works with or without S1 on the profile server.
- The lang keys, enum and analytics reference doc ship in the same change.
- S1's own order (client first, then profile server) is unchanged.

### Risks
- **Not checked:** whether Yandex shows its own ad when the game reloads. If it does, a player who just paid sees an ad right after tapping Restart. There is no interstitial in our own start-up code; ads show only at lobby join and exit.
- If a join dies without `handleLeaveLobby` (the game-died callback leaves `gameStop` set, `Main.ts:828`), the pending popup never shows. It is harmless: the card is already right, and the next load catches up.
- 0318 (the card vanishes after a match) stays out of scope.

**Effort:** about 0.5–1 day. With Q-A option 1 or 2, add about 0.25 day.

**Popup text drafts (Q-B), no game name (0311):**

| Key | en | ru |
|---|---|---|
| `citizenship_restart_modal.title` | Citizenship is active! | Гражданство активно! |
| `citizenship_restart_modal.body` | Restart the game to finish applying it. If you tap "Later", it will apply after your next match or the next time you open the game. | Перезапустите игру, чтобы завершить применение. Если нажмёте «Позже», гражданство применится после следующего матча или при следующем запуске игры. |
| `citizenship_restart_modal.restart` | Restart now | Перезапустить |
| `citizenship_restart_modal.later` | Later | Позже |

**Decided without asking** (owner can overrule):
- no popup on start-up reconciliation;
- `requestGameRestart` not reused;
- the element, keys and events named "citizenship restart" rather than "purchase restart";
- event names `Citizenship:RestartPrompt:{Shown,Restart,Later}`.

## Owner rulings, round 2 (2026-09-28, live via `AskUserQuestion` in the `fkit lead` session, relayed by fkit-lead) — record verbatim
- **Q-A (the free tenure gift under the popup):** "Same restart popup after (Recommended)" — After they close the thank-you popup, the same restart popup appears — only for players the gift made citizens. ~15 lines + tests. Two popups in a row, once ever. ⇒ Build step 9 applies, option 1 (`TenureGrantModal.show()` gets `onClosed`).
- **Q-B (popup text):** "Approve as written (Recommended)" — the table above, en + ru, exactly.
- **Q-C (optional extras):** "Leave both out; file (ii) (Recommended)" — 0303 stays exactly as ruled; the producer files (ii) (the stale-read race) as its own small task.
- **Plan approval:** "Approve (Recommended)" — with the Q-A to Q-C answers built in and the four "Decided without asking" items as described.
