# Citizen Verified Icon

## ID
0068

## Sprint
Sprint 4

## Priority
Medium-low — visibility/status benefit; makes citizenship socially legible in lobbies and matches. Worthless to players before live citizenship exists.

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

Citizenship benefit (plan-sprint-4.md, Phase 2): a citizen icon visible in lobbies and the match player list, distinguishing citizens from non-citizens. Visual design was left "to be decided" by the plan — see the open question in Notes.

The hard part is not the icon but **propagating other players' citizenship status**: the client only knows its own profile. The game server already learns a joining player's Yandex ID (`0013` Part A, shipped) and can reach the profile API (`ProfileApiClient`, `0013` Part E, shipped). `src/core/` player-visible state is desync-sensitive — any flag entering shared game state must reach all clients identically (via the join/intent path, never a per-client fetch).

Scoped 2026-08-24 by owner ruling (relayed via the lead session), replacing the plan's TBD row.

## What to build

Smallest shippable unit: server-sourced `isCitizen` flag + icon rendering in the two named surfaces.

1. **Server:** at join, for clients with a Yandex ID, look up `is_citizen` via `ProfileApiClient` — **fail-soft** (lookup failure = not a citizen; never blocks or delays the join), same posture as XP crediting. Attach the flag to the player info the server already distributes for lobby/game display.
2. **Schema:** carry the flag in the relevant message/player-info schema in `src/core/Schemas.ts` (optional boolean, default false) so all clients see the same value.
3. **Client:** render the citizen icon next to the player's name in (a) the lobby player list and (b) the in-match player list/panel. Placeholder glyph until the owner rules the design; no country/flag imagery (Yandex constraint).
4. Localization for any new tooltip/label text, en + ru.

Out of scope: on-map name labels (`NameLayer.ts`) — clutter risk, separate task if wanted; icon design production; any non-citizen upsell UI.

## Verification steps

1. Local stack: a profile row with `is_citizen = true` → that player shows the icon in the lobby list and the in-match player list on **another** client's screen, not just their own.
2. Non-citizen and guest players show no icon.
3. Profile API down / lookup timeout → join proceeds normally, no icon, no error surfaced to players (fail-soft proven).
4. Multiplayer desync check: full local multi-client match with mixed citizen/non-citizen players — no desync (state-hash majority intact).
5. `src/core/` changes covered by tests (project rule); en/ru keys present in both files.

## Notes

- **Depends on:** 0017 — its Deferred Live Tail (live citizenship in production) gates the player-facing ship; build + local verification proceed against the local profile stack.
- **Blocks:** nothing on the board.
- Independent of 0067 (name change) and 0012 (inbox) — no ordering between the three benefits.
- **Open question for the owner:** the icon's visual design ("to be decided" in the plan). Recommended: ship with a neutral placeholder glyph and file the proper design as a follow-up, mirroring the 0066 favicon precedent.
