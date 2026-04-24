# Task — Telegram Channel Link

## Sprint
Sprint 4

## Priority
Low — independent of all other Sprint 4 tasks. Can ship any time.

## Context

Yandex.Games support confirmed that links to the game's own Telegram channel are permitted as long as they do not link to external third-party resources. This task adds a plain hyperlink to the Telegram channel in three places: the footer, the start screen (near the subscribe button), and the game-end screen (near the subscribe button). The feature is gated behind a single experiment flag so it can be turned on or off instantly without a deploy. Whether the Telegram link and the subscribe button are shown simultaneously or exclusively is determined by whoever configures the flags — no extra code conditions are needed.

---

## What to Build

### 1. Experiment flag — FlashistFacade

**File:** `src/client/flashist/FlashistFacade.ts`

Add constants to `flashistConstants.experiments`:

```ts
TELEGRAM_LINK_FLAG_NAME: "telegram_link",
TELEGRAM_LINK_ENABLED_VALUE: "enabled",
```

Add the element IDs to `flashistConstants.uiElementIds`:

```ts
telegramLinkFooter: "TelegramLinkFooter",
telegramLinkStartScreen: "TelegramLinkStartScreen",
telegramLinkGameEnd: "TelegramLinkGameEnd",
```

Add a new public method to the `FlashistFacade` class, following the exact same pattern as `isEmailSubscribeButtonEnabled()`:

```ts
public async isTelegramLinkEnabled(): Promise<boolean> {
  return this.checkExperimentFlag(
    flashistConstants.experiments.TELEGRAM_LINK_FLAG_NAME,
    flashistConstants.experiments.TELEGRAM_LINK_ENABLED_VALUE,
  );
}
```

---

### 2. Telegram URL constant

Define the Telegram channel URL as a single constant in one place (e.g., at the top of `FlashistFacade.ts` or in a shared constants file). Leave a placeholder value so Mark can replace it before shipping:

```ts
const TELEGRAM_CHANNEL_URL = "https://t.me/PLACEHOLDER";
```

Do not duplicate the URL string across files.

---

### 3. Footer link

**Files:** `src/client/yandex-games_iframe.html`, `src/client/index.html`, `src/client/Main.ts`

Add a hidden anchor element in the footer of **both** HTML templates, immediately after the `license-credits` div:

```html
<a id="telegram-link-footer" href="https://t.me/PLACEHOLDER" target="_blank" rel="noopener" style="display:none;" class="text-xs text-center t-link">
  <!-- text injected by Main.ts -->
</a>
```

In `Main.ts`, after the `license-credits` initialization block, add:

```ts
const telegramLinkFooter = document.getElementById("telegram-link-footer") as HTMLAnchorElement;
if (telegramLinkFooter) {
  FlashistFacade.instance.isTelegramLinkEnabled().then((enabled) => {
    if (enabled) {
      telegramLinkFooter.style.display = "";
      telegramLinkFooter.innerText = translateText("telegram_link.footer_text");
      telegramLinkFooter.addEventListener("click", () => {
        FlashistFacade.instance.logUiTapEvent(
          flashistConstants.uiElementIds.telegramLinkFooter,
        );
      });
    }
  });
}
```

---

### 4. Start screen link

**File:** `src/client/GameStartingModal.ts`

Follow the exact same pattern used for the subscribe button (`isEmailSubscribeButtonEnabled()`). In the `render()` method, add a conditional block near the subscribe button:

```ts
${this.isTelegramLinkVisible
  ? html`<a
      href="${TELEGRAM_CHANNEL_URL}"
      target="_blank"
      rel="noopener"
      class="telegram-link"
      @click="${this.onTelegramLinkClick}"
    >${translateText("telegram_link.cta_text")}</a>`
  : nothing}
```

Add a `@state() isTelegramLinkVisible = false` property and populate it in `connectedCallback` or the existing async init block:

```ts
this.isTelegramLinkVisible = await FlashistFacade.instance.isTelegramLinkEnabled();
```

Add the click handler:

```ts
private onTelegramLinkClick() {
  FlashistFacade.instance.logUiTapEvent(
    flashistConstants.uiElementIds.telegramLinkStartScreen,
  );
}
```

---

### 5. Game-end screen link

**File:** `src/client/graphics/layers/WinModal.ts`

Same pattern as the start screen. Add the same conditional render block near the subscribe button, using `flashistConstants.uiElementIds.telegramLinkGameEnd` for the analytics event.

---

## Analytics

Three new events, all using the existing `logUiTapEvent()` mechanism which prepends `UI:Tap:`:

| Event string | Trigger |
|---|---|
| `UI:Tap:TelegramLinkFooter` | Player clicks the footer Telegram link |
| `UI:Tap:TelegramLinkStartScreen` | Player clicks the Telegram link on the start screen |
| `UI:Tap:TelegramLinkGameEnd` | Player clicks the Telegram link on the game-end screen |

Add all three to `ai-agents/knowledge-base/analytics-event-reference.md`.

Do not write event strings inline — always route through `logUiTapEvent()` with the `uiElementIds` constant.

---

## Localization

Add the following keys to **both** `resources/lang/en.json` and `resources/lang/ru.json` under a new `"telegram_link"` section:

| Key | English | Russian |
|---|---|---|
| `telegram_link.cta_text` | `Join our Telegram` | `Наш Telegram` |
| `telegram_link.footer_text` | `Join our Telegram` | `Наш Telegram` |

(Two keys are listed separately to allow them to diverge in copy if needed later.)

---

## Verification

1. **Flag off (default):** with no Yandex experiment flag set, confirm the Telegram link does not appear in any of the three locations.
2. **Flag on:** enable the `telegram_link = enabled` flag in the Yandex Games dashboard (or simulate via local override). Confirm the link appears in all three locations.
3. **Footer:** link is visible next to the version text; tapping it opens the Telegram channel in a new tab.
4. **Start screen:** link appears near the subscribe button area; tapping it opens Telegram in a new tab.
5. **Game-end screen:** link appears near the subscribe button area; tapping it opens Telegram in a new tab.
6. **Analytics:** confirm `UI:Tap:TelegramLinkFooter`, `UI:Tap:TelegramLinkStartScreen`, and `UI:Tap:TelegramLinkGameEnd` each fire exactly once on a click in the respective location.
7. **Both HTML templates:** footer link appears correctly when loaded from both `index.html` and `yandex-games_iframe.html`.
8. **No regression:** subscribe button behaviour is unchanged; flag coexistence is handled by flag configuration, not code.

---

## Notes

- The Telegram URL is left as `https://t.me/PLACEHOLDER` — Mark will replace it with the real channel URL before the flag is enabled.
- Showing the Telegram link and the subscribe button simultaneously (or exclusively) is handled by how the experiment flags are configured in the Yandex dashboard. No extra logic needed in code.
- `rel="noopener"` is required on all `target="_blank"` links for security.
