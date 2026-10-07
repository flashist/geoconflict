# Game Server Shows a Citizen's Approved Name in Multiplayer Matches (task 0322)

**Source**: `ai-agents/tasks/done/0322-game-server-shows-a-citizens-approved-name-in-multiplayer-matches/brief.md`
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 6, rank 37 / task `0322` (brief B2 of the `0317` report)

> ✅ Done (agent-closed — not owner-verified). Committed in `68303d5`. **Mocked-server tests only** — the
> two-browser check with a seeded approved name was not done.
>
> 🚨 **Accepted risk, owner-ruled (D3) — recorded, not solved:** the game server's only identity is the
> Yandex id the client *claims*. **Someone who sends another citizen's Yandex id gets that citizen's approved
> name.** See [[decisions/adr-115-approved-name-in-matches]].
>
> 🆕 **2026-10-07 sync:** `0340` (S3a) is **live** at the profile server (`vfy: true` confirmed,
> [[tasks/verified-login-enforce-live]]). The forged-id case here is **still open**: the game server is still
> client-asserted until `0332` (the join token — `🔲 Backlog` on Sprint 7), and `0323` (mark a server-confirmed name) is
> also still open.
>
> 📌 **2026-09-30:** `0325` (verified login) closed 2026-09-29 as its **shadow-mode** build only — it proves identity
> at the **profile** login, not on the game server ([[tasks/verified-login-shadow-mode]],
> [[decisions/adr-116-verified-login]]). This forged-id case still closes only with `0332` (the join token), which
> builds on `0340` (S3a). Both sit on [[decisions/sprint-7]].

## Goal

Carry out `0317` rulings D2 (*"(a) Server swaps it in"*), D3 (accept at ADR-103 trust, record as an ADR),
D6 (look-alikes still accepted) and the rude-name filter ruling (*"Keep filter, warn me first"*): an approved
name reaches other players in multiplayer, with no client change.

## Key Changes

- **Contract:** one optional `displayName` on the existing resolve reply (`PlayerResolveResponseSchema`,
  `src/core/profile/CreditContract.ts`) with **three states** — absent (older profile server: keep what is
  held), `null` (none, or cleared by `0314`: clear it), a string (a candidate, re-checked). A malformed value
  reads as absent, so it can never drop the XP-credit id or the ★ flag. Both deploy orders parse.
- **Profile server:** the internal resolve route returns the approved name, whatever the citizen status;
  logs no name.
- **Game server:** the name is set only inside `startProfileResolve`'s result — i.e. only through the ADR-103
  funnel (`getCreditableYandexId`). Stored **checked** (`checkedApprovedName`, via `JoinUsernameSchema`; a
  failure logs one `warn` with the clientID only), swapped **re-checked** (`matchDisplayName`; on failure the
  typed name is used). One swap point, two callers: `start()` (the frozen roster) and `gameInfo()` (the lobby
  poll). **Frozen at start** — a resolve after `start()` is ignored for the name (crediting unaffected).
  **Reconnect** carries the name only for the same creditable id. **Fail-soft** — a slow or failed resolve
  never delays a join.
- **Review R1:** after start, `gameInfo()` reads each name from the frozen start roster by clientID first, so
  the poll cannot disagree with the match.
- **Rude-name filter stays; the moderator is warned.** The match still runs its profanity filter on other
  players' names. The per-request Telegram message and the digest list now say whether that filter would hide
  the requested name — the **same matcher**, moved to `src/core/validations/profanity.ts`. Yes/no only,
  operator-only, never in the player's reply, never logged. ⚠️ **English word list only** — a Russian insult
  gets no warning; the moderator's reading is still the real check.
- **Wording:** by later owner ruling **"Keep the short text"**, `0316`'s approve message is **not** reworded.

## Outcome

- **Evidence:** `npm test` 170 suites / 2969 tests after review (first run); `test:integration` 12 / 155 at
  build; two mutation checks (drop the after-start guard; drop the swap-time re-check) each turned exactly one
  new test red; config-parity `--enforce` checks clean.
- **Not verified:** two browsers against a local profile server with an approved name; a rule-failing
  approved name falling back live; the warning in a real Telegram delivery.
- **Owner-accepted leftovers (ADR-115):** names approved **before** this shipped were never filter-checked
  (Q2, *"Accept, note in the ADR"*); the unauthenticated lobby poll now carries a **stable** approved name —
  widening `0068`'s R3.

## Related

- [[decisions/adr-115-approved-name-in-matches]] — the ADR this task carries (written by `fkit-architect`)
- [[decisions/adr-103-identity-trust-seam]] — the funnel; ADR-115 widens its scope to a third user
- [[tasks/approved-name-in-matches-investigation]] — task `0317`, the source rulings
- [[tasks/start-screen-approved-name-lock]] — task `0321`, the client-side prefill that ships first
- [[tasks/citizen-verified-icon]] — task `0068`, the same resolve seam and its R3 residual
- [[tasks/player-name-path-security-review]] — task `0307`, `JoinUsernameSchema`
- [[tasks/name-change-dismiss-and-clear]] — task `0314`, the clear the runbook points to for a hidden name
- [[tasks/name-change-digest-pending-list]] — task `0315`, where the filter mark also shows
- [[tasks/name-change-approved-message-wording]] — task `0316`, not reworded by ruling
- [[tasks/private-lobby-citizen-perk]] — task `0302`, the funnel's second user (unaffected)
- [[decisions/sprint-6]] — the board carrying this task
- [[systems/player-profile-store]] — the profile store, updated 2026-09-28 with this task's change
- [[tasks/citizenship-name-change]] — task `0067`, the name-change feature this follow-up extends
- [[tasks/name-change-operator-decide-command]] — task `0312` (2026-09-27): a working operator Approve/Reject command run on the profile box
- [[tasks/verified-login-enforce-live]] — task `0395` (2026-10-07): S3a live at the profile server; this page's forged-id case still waits on `0332`
