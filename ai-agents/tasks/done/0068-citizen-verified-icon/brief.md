# Citizen Verified Icon

## ID
0068

## Sprint
Sprint 4

## Priority
Medium-low — visibility/status benefit; makes citizenship socially legible in lobbies and matches. Worthless to players before live citizenship exists.

## Status
✅ Done (agent-closed — not owner-verified)

## Close-out — 2026-08-28

Closed by a **spawned producer** driven by the sprint ship-loop from the lead session. No owner channel
existed at close time, so **no human verified this work** — that is what the marker above says, and it
is not a formality.

### What IS proven

- **The mandatory live multi-client desync check ACTUALLY RAN.** 3 real browser clients, mixed
  citizen / non-citizen / guest roster. **280 state-hash windows compared across turns 650–3440 on all
  three clients simultaneously — 0 mismatches**, and the server logged **0** desync messages
  independently. Verification step 4 is genuinely satisfied, not deferred.
- **Fail-soft was exercised for real, not reasoned about.** The profile server was killed; the join
  completed, no badge appeared, retries logged at warn level, and there were **zero error lines**.
- **The determinism argument was verified structurally by the reviewer — all four legs.**
- Green at close: `tsc`, `lint`, `npm test` **106 suites / 1072 tests**, integration
  **5 suites / 70 tests**, `prettier --check` clean.
- Review: stateful Round 1, all three findings dispositioned; reviewer re-verified independently in a
  phase-2 pass and found nothing new. `review.md` `Status: closed`.
- Plan owner-approved with three amendments (`plan.md`); build record in `worklog.md`.

### What is NOT proven — deployment posture

**Nothing here is verified in production**, exactly as with `0067`. Everything above is local /
local-stack evidence.

### Nine accepted residuals carried forward

Full text and re-raise conditions live in `review.md` → *Accepted residuals*. Two carry conditions that
must not be softened:

1. **R3 — `isCitizen` on the unauthenticated lobby-poll endpoint (`GET /api/game/:id`).** Accepted
   **only while the flag stays purely cosmetic. This disposition is VOID the moment anything of value
   is gated on `isCitizen`** — an entitlement, a purchase, a permission — **at which point the payload
   exposure must be re-decided.**
2. **R2 — the `GameView` wiring line (`GameView.ts:551`) and `PlayerView.isCitizen()` are untested.**
   Recorded as a **coverage GAP — never as coverage.** Only the extracted pure `citizenClientIDs()` is
   covered; the nation/bot `?? ""` collapse is reasoned about, not exercised.

The other seven: public-lobby gap (plan amendment 2 — no pre-match icon in public quick-play);
placeholder `★` glyph pending the design follow-up (plan amendment 3); ADR-103 client-asserted-id trust
level (a forged id can mint a **cosmetic** icon — it gates nothing); citizenship freshness bounded by
last join; singleplayer shows no icon; pre-existing local-dev `HostLobbyModal` Start-Game URL bug (not
0068's, being filed separately); `tests/profile-server/NameChangeRoutes.test.ts` flake (environmental,
0067's file, tracked under `0197`).

### Defects routed OUT rather than absorbed

Two defects found during 0068 were deliberately **not** folded into this task, so the routing stays
traceable:

- **`0198`** — production defect, filed separately.
- **`0197`** — test-suite reliability (jest-worker `SIGSEGV` + integration hang), filed separately;
  strengthened with 0068's evidence on 2026-08-28.

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
- **~~Open question for the owner:~~ RESOLVED 2026-08-28** (owner ruling, lead session via `AskUserQuestion`): the icon's visual design was "to be decided" in the plan. **Ruled: ship with a neutral placeholder glyph now; file the proper icon design as a follow-up task**, mirroring the `0066` favicon precedent. No country or flag imagery either way (Yandex constraint). This question no longer blocks the task.
