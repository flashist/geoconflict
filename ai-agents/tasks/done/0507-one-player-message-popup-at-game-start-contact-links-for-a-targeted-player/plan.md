## 0507: revised plan, with Yandex Games flags as the target source (plan only, nothing written)

- **Plan only.** I wrote no source and no files. There was no declared-approval marker, and there was no plan-review switch line, so I ran no plan review.
- **Something the lead must know, found in the code:** `FlashistFacade.logExperimentEvents()` sends **every** Yandex flag to GameAnalytics as `Experiment:{name}:{value}` (FlashistFacade.ts ~L1700–1710, L2296). A `player_message_targets` flag would therefore put the target player names into analytics on every client. That breaks brief item 6 ("never the target value in an event"). The plan excludes this flag from those events, and a test pins it.
- **Server side dropped completely:** no route, no config file on the game box, no `update.sh` mount, no `Master.ts` change, no webpack proxy entry. I found no reason to keep any of it. Side benefit: `update.sh` is no longer touched, so the shell-harness grep gate is not involved.
- **Answers to the five points:**
  1. The flag value reaches every client in the getFlags response. This is an owner-acceptance point (Q1).
  2. "Baked into the client code" fallback: I recommend **no** (Q2).
  3. Commas in names need no handling. The name rule (`validUsernamePattern`) allows only letters, digits, `_`, `[ ]` and whitespace, and `getCurrentUsername()` always returns a name that passes it.
  4. Flag value length limits are not documented anywhere in the repo. The SDK has no typings: it is `any`, loaded from Yandex. One name is at most 27 characters.
  5. Local dev with no SDK means the feature is off.
- **Case-sensitive exact match**, after trimming each entry from the flag.
- **The brief now disagrees with the ruling.** Brief items 3 and 7 and verification step 2 say "the target name never reaches any client", and its "DECIDED: option (a)" section is out of date. The producer should record the 2026-10-26 ruling in the brief before the build. I did not edit it.
- I did not see the earlier approved plan's text: there is no `plan.md` in the task folder. The "what changed" list below is measured against the lead's description of that plan.

---

## The plan

### How it works
1. The Yandex flag **`player_message_targets`** holds a string of names separated by commas, for example `Name One, Name Two`. If it is unset, empty, or not a string, the feature is off.
2. The client reads the flag through the existing getFlags fetch. That fetch is memoized, has a 5 s timeout (`PLATFORM_INIT_DEADLINE_MS`) and runs once per page load, so the feature makes **no new network request**.
3. The client splits on `,`, trims each entry and drops empty ones. It then compares the list to `username-input.getCurrentUsername()`, which is the same value the feedback form sends to Telegram.
4. On a match, it waits until the player is on the start screen (`whenOnStartScreen`) and no Yandex payment or login dialog is open (`whenNoPlatformDialogOpen`). Both helpers already exist and are used by the 0404 long-session popup. Then it shows the popup **at most once per page load**.
5. To switch it off, the owner clears the flag in the Yandex console. That takes effect on the next page load, with no deploy and no SSH.

### Files and steps
1. **`src/client/flashist/FlashistFacade.ts`**
   - In `experiments`, add `PLAYER_MESSAGE_TARGETS_FLAG_NAME: "player_message_targets"` with a short WHY comment: names a player list, so it is never logged.
   - Add `public async getPlayerMessageTargetsFlagValue(): Promise<string | undefined>`. It awaits `initExperimentFlags()` and returns the raw value only when `typeof === "string"`. It deliberately does **not** go through `checkExperimentFlag`, whose `GAME_ENV === "dev"` → `true` shortcut makes no sense for a list.
   - In `logExperimentEvents()`, skip flag names in a small exclusion set that holds only this flag.
   - In `analyticEvents`, add:
     - `PLAYER_MESSAGE_SHOWN: "PlayerMessage:Shown"`
     - `PLAYER_MESSAGE_CLOSED: "PlayerMessage:Closed"`
     - `PLAYER_MESSAGE_CLICK_TELEGRAM: "PlayerMessage:ClickTelegram"`
     - `PLAYER_MESSAGE_CLICK_VK: "PlayerMessage:ClickVk"`
   - None of these events carries a name.
2. **New `src/client/PlayerMessage.ts`**, written in the `LongSessionRefresh.ts` style: pure functions plus dependencies that can be swapped in tests.
   - `parsePlayerMessageTargets(raw: unknown): string[]`
   - `isPlayerMessageTarget(name: string, targets: readonly string[]): boolean`, which is `targets.includes(name.trim())` and case-sensitive.
   - `startPlayerMessage(deps = defaultDeps())`:
     - Reads the targets. If the list is empty it returns, with no listener and no timer.
     - Otherwise it checks now, and again on each `username-change` event, until the popup has been shown once. This covers the race where the username box fills after `startClient` runs, and an approved name that arrives late.
     - On a match: loop {wait for start screen → wait for no platform dialog} until both hold at the same moment. Then show the popup, log Shown and set the latch.
     - The whole thing is wrapped so that a missing element never breaks the page.
3. **New `src/client/PlayerMessageModal.ts`**: a LitElement `@customElement("player-message-modal")`. It copies the `TenureGrantModal` / `GameStartingModal` pattern: `@state() isVisible`, `show()`, `hide()`, and `close()` (which `closePreStartModals` calls).
   - Body: `translateText("player_message.contact_us_text")`.
   - Two link buttons: `TELEGRAM_CHANNEL_URL` and `VK_CHANNEL_URL`, with `target="_blank" rel="noopener"`. This is the same markup `GameStartingModal` already ships inside Yandex, so the external-link precedent exists.
   - A Close button. Every tap logs its event.
4. **`src/client/Main.ts`**: `import "./PlayerMessageModal"`, then `void startPlayerMessage()` in `startClient()` after `client.initialize()`. It must come after initialize because `initialize()` registers the start-screen source.
5. **`src/client/PreStartModals.ts`**: add `"player-message-modal"`, so that a match start closes the popup.
6. **Both templates:** add `<player-message-modal></player-message-modal>` after `<tenure-grant-modal>` in `src/client/index.html` and in `src/client/yandex-games_iframe.html`.
7. **`resources/lang/en.json` and `ru.json`:** add a `player_message` block.
   - `contact_us_text` uses the ruled en/ru text, verbatim.
   - `telegram_button` / `vk_button`: "Write to us on Telegram" / "Write to us on VK", with ru equivalents. These are my draft. I am not reusing the existing `telegram_link.cta_text`, because that text says "Subscribe", which is the wrong action here.
   - Close: reuse an existing shared close key if one exists under a common namespace; otherwise add `player_message.close`.
8. **`ai-agents/knowledge-base/analytics-event-reference.md`:**
   - Add rows for the 4 events.
   - In the Experiment Events section, add a note: `player_message_targets` is deliberately **excluded** from the automatic `Experiment:*` events, because its value is player names.

### Tests (all new files are named here, so approval covers them)
- **New `tests/client/PlayerMessage.test.ts`** (pure functions and the flow with fake dependencies):
  - Parsing: unset, empty, `" , "`, a non-string value, a single name, several names, padded entries.
  - Matching: exact match shows; a different case does not; a substring does not.
  - Flow:
    - An empty target list never shows the popup and adds no listener.
    - A non-matching name never shows it.
    - A matching name shows it once, even when it matches again on a later `username-change`.
    - A name that only starts matching after `username-change` shows it.
    - It waits while away from the start screen and while a platform dialog is open.
    - The Shown event is logged with no name in it.
- **New `tests/client/PlayerMessageModal.test.ts`** (jsdom, the `TenureGrantModal.test.ts` style):
  - The element is registered.
  - It is hidden until `show()`.
  - The text key is rendered.
  - Both links have the right href, with `target=_blank`.
  - Close hides the popup and logs Closed; a link tap logs its event.
- **Extend `tests/client/FlashistFacade.test.ts`:**
  - `getPlayerMessageTargetsFlagValue` returns a string value, and returns `undefined` for no flags, no SDK, or a non-string value.
  - `logExperimentEvents` with `{player_message_targets: "X", citizenship_ui: "enabled"}` logs only the citizenship event, and "X" appears in no logged string.
- **Update `tests/client/PreStartModals.test.ts`** only if it pins the tag list.
- `src/core/` is not touched, so the core-must-be-tested rule does not apply.

### Checks
- Targeted runs of the 4 test files above (no lock needed).
- `npm run lint`.
- A typecheck: `npx tsc --noEmit` against the project tsconfig. If the tsconfig does not support that, `npm run build-dev` instead.
- Then the full `npm test` through the npm script, which takes the project lock.
- `grep player-message-modal` in both templates.
- **Skipped:** `test:integration` (no database code) and any live check. With no SDK locally the feature is always off, so the real proof is the owner's verify task after deploy.

### Edge cases and how each fails
- **Fails closed whenever flags are missing:** no SDK, a degraded boot, a getFlags timeout or error. A degraded boot that recovers late is **not** re-checked, so the popup is off for that load. I accept that; tell me if you don't.
- **Local dev:** no SDK, so no flags, so off. Nothing can be tested by hand locally without the SDK.
- **The player's name may change before he loads again.** If 0504 restores his approved nickname first, his current name becomes that nickname and stops matching the feedback name. Mitigation: list both names, comma-separated. That is the multi-value case the owner described.
- **Namesakes see the popup too.** The same-name risk was already accepted. Case-sensitive matching keeps the set smaller.
- **Exact text is required:** look-alike letters (Latin "a" vs Cyrillic "а") and unusual spaces. The owner should copy and paste the name from the Telegram feedback message rather than type it. There is no Unicode normalization.
- **Popup stacking:** it could stack with the tenure-gift, restart or stale-build popups (all z-index 9999). For a one-player emergency message the chance is small, and I accept it.
- **How fast a console change reaches players is not documented in the repo.** "Read once per page load" is confirmed (wiki 0428). The verify task should measure the time-to-off.
- **Telegram link caveat:** `TELEGRAM_CHANNEL_URL` (`t.me/gameworldwar`) is a **channel**. A channel does not normally accept direct messages, so the "write to us on Telegram" text may not match what the link allows. VK communities can accept messages if that setting is on. This was ruled already; I am flagging it, not reopening it (Q4).

### What changed vs the approved plan (as the lead described it)
| Approved | Now |
|---|---|
| Server route that answers show / don't show | **Dropped.** The client matches the name itself |
| Target name in a config file on the game box | **Dropped.** Yandex flag `player_message_targets` |
| `update.sh` mount, `Master.ts` change, webpack proxy entry, server tests | **Dropped** |
| Target name never reaches any client | **No longer true.** It is in every getFlags response (Q1) |
| Switch off = SSH and edit a config | Switch off = clear the flag in the console, effective next load |
| — | **New:** flag excluded from `Experiment:*` analytics events |
| Modal, keys, both templates, events, start-screen timing, once per load | Unchanged |
| Ship route: wait for 0506, build on `dev` | Unchanged |

---

## Open questions

**NEEDS-DECISION 1**
- **question:** Accept that the target names are visible to anyone who inspects the game's network traffic?
- **options:**
  - (a) Accept. The names are in-game display names that every opponent in a match already sees, and the content of the popup is public links. **(Rec)**
  - (b) Narrow it: send the player's name to Yandex as a "client feature" and add a console condition, so only the matching client receives the flag. This is more work, changes the getFlags call that every other flag shares, sends every player's name to Yandex, and it is unverified that the console can express the condition.
  - (c) Go back to the approved server-side plan, where the name is never sent to any client.
- **recommendation:** (a)
- **context:** Yandex flags are delivered to each player's browser. Anyone who opens the browser's developer tools can read the flag value, which means the names listed in it. A name is not a secret: it shows in every match. The analytics leak is fixed separately in the plan either way.

**NEEDS-DECISION 2**
- **question:** Also support the "baked into the client code" fallback?
- **options:**
  - (a) No, flags only. **(Rec)**
  - (b) Add an empty name list in code, filled only if the flags fail during testing.
  - (c) Bake the affected player's name in now.
- **recommendation:** (a)
- **context:**
  - Baking puts a player's name into git history and into the public game bundle permanently.
  - Removing a baked name needs a new deploy, while a flag changes with no deploy.
  - Baking also buys no speed, because this whole feature ships only with 0506 anyway.
  - (b) costs almost nothing, but has value only if flags turn out not to work.

**NEEDS-DECISION 3**
- **question:** Fix the popup to one message now, or let a second flag choose which message to show (brief item 2)?
- **options:**
  - (a) One fixed message now ("contact us"). The next use needs a new text key and a one-line code change. **(Rec)**
  - (b) A second flag, `player_message_id`, picks the message from a small table in code. The next use needs only a new text key.
- **recommendation:** (a)
- **context:** You asked for "naive and fast". Option (a) meets brief item 2 only partly: the next message is a new key plus a one-line code change, rather than "no new code". Option (b) is roughly one more flag read and a lookup table.

**NEEDS-DECISION 4**
- **question:** Do both links lead somewhere the player can actually write to us?
- **options:**
  - (a) Keep the ruled links, and you confirm that the Telegram channel and the VK community both accept messages. **(Rec)**
  - (b) Give me a direct contact link instead, for example a Telegram account or bot (a public URL), and I use it for this popup only.
- **recommendation:** (a), if confirmed.
- **context:** `TELEGRAM_CHANNEL_URL` points to a Telegram channel. Channels usually cannot receive direct messages, so the text "write to us on Telegram" may not match what the link allows. VK communities can receive messages if that setting is on.

**Note:** for the later verify task, the owner can test safely by setting the flag to his own test name, optionally limited by a console condition on the existing `tester=1` client feature.
