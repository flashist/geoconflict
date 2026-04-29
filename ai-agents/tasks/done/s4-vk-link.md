# Task — VK Channel Link Button

## Sprint
Sprint 4

## Priority
Low — independent of all other Sprint 4 tasks. Implement after the Telegram link is confirmed live.

---

## Context

A "Join our Telegram" link is already live in both the game-starting modal (`GameStartingModal.ts`) and the win modal (`WinModal.ts`). It is gated by its own Yandex experiment flag (`telegram_link`) and fires `UI:Tap:TelegramLinkStartScreen` / `UI:Tap:TelegramLinkGameEnd` analytics events on click.

This task adds an identical "Join our VK" link directly below the Telegram link in both modals. The VK link is gated by a separate experiment flag so it can be toggled independently.

---

## What to Build

### 1. Add constants and experiment flag in `FlashistFacade.ts`

Follow the exact pattern used for the Telegram link.

**URL constant** (top of file, alongside `TELEGRAM_CHANNEL_URL`):
```
VK_CHANNEL_URL = "PLACEHOLDER_VK_URL"
```
Replace `PLACEHOLDER_VK_URL` with the real VK community URL before shipping.

**UI element IDs** — add to `flashistConstants.uiElementIds`:
```
vkLinkStartScreen: "VkLinkStartScreen",
vkLinkGameEnd:     "VkLinkGameEnd",
```

**Experiment flag** — add to `flashistConstants.experiments`:
```
VK_LINK_FLAG_NAME:    "vk_link",
VK_LINK_ENABLED_VALUE: "enabled",
```

**Feature check method** — add alongside `isTelegramLinkEnabled()`:
```typescript
public async isVkLinkEnabled(): Promise<boolean>
```
Same implementation pattern: read the `vk_link` flag and compare against `"enabled"`.

---

### 2. Update `GameStartingModal.ts`

Add an `isVkLinkVisible` state field (same as `isTelegramLinkVisible`).

In the `show()` / init method, fetch both flags in the same `Promise.all` call — add `FlashistFacade.instance.isVkLinkEnabled()` alongside the existing Telegram call.

In the template, render the VK link **immediately after** the Telegram link block:
```
${this.isVkLinkVisible
  ? html`<a href=${VK_CHANNEL_URL} target="_blank" rel="noopener"
             class="vk-link"
             @click=${this.onVkLinkClick}>
           ${translateText("vk_link.cta_text")}
         </a>`
  : nothing}
```

Add a click handler `onVkLinkClick()` that calls `FlashistFacade.instance.logUiTapEvent(flashistConstants.uiElementIds.vkLinkStartScreen)`.

**CSS** — add `.modal-box .vk-link` with the same styles as `.modal-box .telegram-link` (same color, font size, underline, hover transition). Keep `margin-top: 8px` so the spacing between the two consecutive links is tighter than the spacing above the Telegram link.

---

### 3. Update `WinModal.ts`

Same changes as above, following the Tailwind class pattern already used there for the Telegram link.

Render the VK link block immediately after the Telegram link block. Add `isVkLinkVisible` state, fetch the flag in the same `Promise.all`, and add `onVkLinkClick()` logging `flashistConstants.uiElementIds.vkLinkGameEnd`.

---

### 4. Localization

Add to `en.json` and `ru.json` (both files must stay in sync):
```json
"vk_link": {
  "cta_text": "Join our VK"
}
```
Provide the Russian translation for `ru.json`.

---

### 5. Update the analytics reference

Add two rows to the `UI:Tap events` table in `ai-agents/knowledge-base/analytics-event-reference.md`:

| Enum key | Event string | Description |
|---|---|---|
| `uiElementIds.vkLinkStartScreen` | `UI:Tap:VkLinkStartScreen` | Player clicks the VK link on the start screen |
| `uiElementIds.vkLinkGameEnd` | `UI:Tap:VkLinkGameEnd` | Player clicks the VK link on the game-end screen |

---

## Verification

1. **Experiment flag off (default):** neither modal shows the VK link. Telegram link is unaffected.
2. **Experiment flag on:** VK link appears below the Telegram link in both modals.
3. **Click analytics:** clicking the VK link on the start screen fires `UI:Tap:VkLinkStartScreen`; on the win screen fires `UI:Tap:VkLinkGameEnd`. Verify in GameAnalytics.
4. **Navigation:** clicking opens the VK URL in a new tab. Telegram link continues to open the Telegram URL.
5. **No regression:** Telegram link visibility, analytics, and URL are unchanged.

---

## Notes

- Replace `PLACEHOLDER_VK_URL` with the real VK community URL before enabling the experiment flag.
- The VK experiment flag (`vk_link`) is independent of the Telegram flag (`telegram_link`) — either can be enabled without the other.
- Both links can be shown simultaneously; the VK link always renders below the Telegram link.
