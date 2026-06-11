# Feedback Modal Space-Key Guard

**Source**: `ai-agents/tasks/done/s4-feedback-modal-space-key.md`
**Status**: done
**Sprint/Tag**: Sprint 4

## Goal

Restore normal text entry in the in-match feedback modal. Space was blocked in the textarea and contact input because the global `InputHandler` Space hotkey called `preventDefault()` before the focused form control could receive the key event.

## Key Changes

- `src/client/InputHandler.ts` now checks whether a text input is focused before processing global `keydown` and `keyup` hotkeys.
- The focus guard handles direct `input` / `textarea` / `contenteditable` focus and one level of shadow DOM, which covers LitElement modals such as `FeedbackModal`.
- While a text field is focused, game hotkeys are suppressed instead of adding movement or action keys to `activeKeys`.

## Outcome

Players can type spaces in both feedback fields during a match, and movement/action hotkeys no longer fire while they are writing feedback. Hotkeys resume after the modal is closed or focus leaves the text input.

## Related

- [[features/feedback-button]] — UI surface affected by the bug
- [[decisions/sprint-4]] — sprint that tracked the fix
