# Task — Streamer Program: Verified Streamer Status & In-Game Customization

## ID
0023

## Sprint
Unscheduled — parking lot. Return to this when citizenship + name rendering (Task 8) are live.

## Priority
Low. No immediate player impact. Origin: one streamer reached out directly and asked for recognition. Worth building eventually if the streamer channel grows, but not urgent.

## Status
🔲 Backlog

## Owner
fkit-producer

---

## Context

A Twitch streamer contacted Mark directly, provided proof of streaming the game, and asked for some kind of in-game customization in return (e.g. a golden or distinct nickname). Mark declined for now but wants to capture the idea for future consideration.

The proposed model:
- Streamers reach out (channel TBD — direct contact, email, in-game form?)
- They provide a link as proof of streaming the game
- Mark (or a manual reviewer) verifies the proof against unstated eligibility requirements
- If approved: a boolean flag is set on the player's profile in the database
- The flag unlocks a visible in-game customization (golden nickname is the working example)

---

## Open Questions (must be answered before this can be scoped)

**Eligibility:**
- What are the minimum requirements? (Follower count? Average concurrent viewers? Minimum stream frequency? Must be actively streaming — not historical?)
- Is there a minimum proof standard? (VOD link showing the game? Recent stream? Screenshot is not enough?)
- Does eligibility expire? (Streamer stops streaming — do they lose the status?)

**Process:**
- How do streamers apply? (Direct message to Mark? A dedicated email? An in-game "apply" button?)
- Who reviews applications? (Mark only, or delegatable?)
- What is the expected volume? (One-off now, or a recurring queue?)

**Customization:**
- What exactly does the streamer get? (Golden nickname color is the working idea — is that sufficient, or should there be a badge/icon too?)
- Does streamer status imply citizenship, or is it independent? (A streamer who hasn't earned 100 matches — do they get citizenship benefits as well, or only the visual marker?)
- Is the customization visible everywhere (lobbies, match player list, leaderboard) or only in specific surfaces?

**Technical:**
- The boolean flag lives in the player profile database (established by Sprint 4 player profile store work). Does `isStreamer` sit alongside `isCitizen`, or is it a role/tag system to avoid one-off boolean proliferation?
- Name rendering customization must go through the centralized name rendering component from Task 8 (Sprint 5 dependency). Do not build ad-hoc rendering for streamer nicknames.

---

## Dependencies

- **Player Profile Store** (`0013-player-profile-store-impl`) — must be live before any database flag can be set
- **Centralized name rendering component** (Task 8, Sprint 4/5) — golden nickname must render through this, not ad-hoc
- **Citizenship system** — whether streamers auto-receive citizenship is an open question; answer it before implementation to avoid a separate entitlement code path

---

## What to Build

Not yet defined. Return to this once the open questions above are answered with Mark. The implementation is likely simple (one database field, one rendering variant in the name component, a manual admin path to set the flag) — but the product questions need to be resolved first.

---

## Notes

- **Depends on:** flattened from the brief's `## Dependencies` section above (left unedited): the
  Player Profile Store (`0013-player-profile-store-impl`) must be live before any database flag can be
  set; the centralized name rendering component must exist, because the golden nickname has to render
  through it rather than ad-hoc — the brief calls this component `Task 8` (Sprint 4/5), a label that
  does not resolve to a current task id, and `0196` transcribed the label rather than guessing an id;
  and the citizenship system, where whether streamers auto-receive citizenship is an open question the
  brief says must be answered before implementation to avoid a separate entitlement code path. The
  Sprint field adds that this is a parking lot, to be returned to when citizenship plus name rendering
  (Task 8) are live, and the brief's `## Open Questions` section must be answered with the owner before
  this can be scoped at all. Full prose above; this bullet is the machine-readable form beside it.
- Do not over-engineer for volume. This is a manual, relationship-driven program at this stage. An in-game application flow is not needed for V1.
- The streamer who reached out could be a useful test case for the first iteration — confirm the process works end-to-end with one real user before generalizing.
- If the Twitch streamer is going to be told "we'll add this" — set expectations that it is on the roadmap, not imminent. Citizenship ships first.
