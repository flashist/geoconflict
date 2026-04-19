# Email Subscription Modal

## Context

Players can currently submit bug reports and feedback via an in-game form that posts messages to a Telegram bot. This task adds a new message type to that same pipeline: email subscription opt-ins. The goal is to build a simple, low-friction way to collect player emails for future direct communication.

## What to Build

**1. "Subscribe to updates" modal**
- Single input field: email address
- Submit button and a close/dismiss button
- Basic client-side validation: non-empty, valid email format
- On submit: send the email to the Telegram bot using the existing feedback/bug-report pipeline as a new message type (e.g. `subscription` or similar — specialist to decide naming consistent with existing types)
- On success: show a brief confirmation, close the modal
- On failure: show an error, allow retry

**2. Entry point buttons**
- Add a "Subscribe to updates" button to the **match start modal**
- Add a "Subscribe to updates" button to the **match end modal**
- Tapping the button opens the subscription modal

## Out of Scope (v1)

- Frequency capping (no "already shown this session" logic)
- Duplicate submission checks (no "already subscribed" check)
- Storing emails server-side
- Lite-mode filtering (show to all players regardless of auth status)

## Verification

- Submitting a valid email from the match start modal posts a message to the Telegram bot with the email and correct message type
- Submitting a valid email from the match end modal does the same
- Submitting an invalid email shows a validation error and does not submit
- Dismissing the modal without submitting does nothing
