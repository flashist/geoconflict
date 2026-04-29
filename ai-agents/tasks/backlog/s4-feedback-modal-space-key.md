# Task — Fix Space Key Blocked in Feedback Modal During Match

## Sprint
Sprint 4

## Priority
Medium — affects the only in-match feedback path. Players who try to write a sentence and find spaces don't work are likely to abandon the form.

---

## Context

When the feedback modal (`FeedbackModal.ts`) is open during a match, pressing Space does nothing in the textarea or contact input. The character does not appear.

**Root cause:** `InputHandler.ts` registers a `window` keydown listener (line 275) that calls `e.preventDefault()` unconditionally whenever `e.code === this.keybinds.toggleView` — which defaults to `"Space"`. This fires before the browser can deliver the keypress to the focused input element. As a result, no space character is ever inserted.

The same handler also fires on `keyup` (line 316) with another `e.preventDefault()` for Space. Both must be guarded.

**Shadow DOM complication:** `FeedbackModal` is a LitElement with a shadow root. When focus is inside the modal's textarea, `document.activeElement` returns the `<feedback-modal>` custom element, not the textarea itself. Any guard must pierce the shadow root to detect the actual focused element.

**Broader scope:** other hotkeys (WASD, Q, E, digit keys, etc.) do not call `preventDefault` on `keydown`, so their characters do reach the textarea. However, they also add themselves to `activeKeys` and trigger camera movement or other game actions while the user is typing. That secondary issue is in scope for this task — the guard should suppress all hotkey handling while a text input is focused, not just Space.

---

## What to Build

### 1. Add a `isTextInputActive()` helper in `InputHandler.ts`

Add a private method (or module-level helper) that returns `true` when the currently focused element is a text input — either directly or inside a shadow root:

```typescript
private isTextInputActive(): boolean {
  const active = document.activeElement;
  if (!active) return false;
  const tag = active.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || (active as HTMLElement).isContentEditable) return true;
  // Pierce one level of shadow DOM (covers LitElement custom elements like FeedbackModal)
  if (active.shadowRoot) {
    const shadowActive = active.shadowRoot.activeElement;
    if (!shadowActive) return false;
    const shadowTag = shadowActive.tagName.toLowerCase();
    return shadowTag === "input" || shadowTag === "textarea" || (shadowActive as HTMLElement).isContentEditable;
  }
  return false;
}
```

### 2. Guard the `keydown` listener

At the top of the `window.addEventListener("keydown", ...)` callback (line 275 in `InputHandler.ts`), add an early return:

```typescript
window.addEventListener("keydown", (e) => {
  if (this.isTextInputActive()) return;
  // ... existing handler unchanged
});
```

This prevents `e.preventDefault()` on Space and prevents other keys from being added to `activeKeys` while a text input has focus.

### 3. Guard the `keyup` listener

Apply the same guard at the top of `window.addEventListener("keyup", ...)` (line 316):

```typescript
window.addEventListener("keyup", (e) => {
  if (this.isTextInputActive()) return;
  // ... existing handler unchanged
});
```

This prevents all `preventDefault()` calls and all `activeKeys.delete()` calls while a text input is focused.

**Note:** `activeKeys` entries added just before the modal opened (e.g., a key held while clicking the feedback button) will remain in the set until `keyup` is processed after the modal closes. This is a pre-existing edge case and is acceptable — do not try to clear `activeKeys` on modal open.

---

## What Not to Change

- Do not modify `FeedbackModal.ts` — the fix belongs entirely in `InputHandler.ts`.
- Do not add a keydown listener to `FeedbackModal` to re-implement character input — that is the wrong layer.
- Do not guard Escape separately — if the user has focus inside a text input and presses Escape, the game's `CloseViewEvent` will not fire (because the early return covers all keys). This is correct: Escape while typing should not trigger game actions.

---

## Verification

1. **Space works in feedback textarea:** open the feedback modal mid-match, click into the textarea, type a sentence with spaces. All characters including spaces appear correctly.
2. **Space works in contact input:** same test for the single-line contact field.
3. **No camera movement while typing:** with the modal open and textarea focused, hold W/A/S/D — the camera must not move.
4. **Hotkeys resume after closing:** close the modal, press Space — `toggleView` (alternate view) activates correctly. Press WASD — camera moves.
5. **Hotkeys work normally without modal:** open no modal, play normally — all existing hotkeys behave as before.
6. **Escape behavior:** pressing Escape while typing in the feedback modal does not fire `CloseViewEvent`. The modal itself does not close on Escape (it has no Escape handler — this is existing behavior, not a regression).

---

## Notes

- The one-level shadow root pierce covers all current LitElement modals in the codebase. If nested shadow roots are ever introduced, this helper would need to recurse — not a concern now.
- The `ChatModal` player-search input (`src/client/graphics/layers/ChatModal.ts`) has its own in-element keydown handling and does not appear to suffer the same bug, but it will benefit from the same guard if its textarea ever gains focus outside the chat modal's own key handling.
