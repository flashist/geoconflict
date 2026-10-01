# Security Review of Every Player-Name Path (task 0307)

**Source**: `ai-agents/tasks/done/0307-security-review-of-every-player-name-path-injection-and-validation/brief.md`
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 6, rank 1 (owner-ruled *"Top of Sprint 6"*) / task `0307`

> ✅ Done (agent-closed — not owner-verified). Code committed in `390c4b4`. **Nothing here was tested in
> production.** Findings report (the evidence of record):
> `ai-agents/knowledge-base/reports/2026-09-26-0307-player-name-path-security-review.md`.
>
> ⛔ No player ids, names, tokens, hosts or IPs on this page — the report is written under that rule.

## Goal

Answer the owner's question, asked the day citizenship went live (voice-dictated, verbatim): *"is it
possible that somebody can inject a code into our database or something like that via their request of
changing their name. Or when the name is approved."* Map every hop a player name travels — the citizen's
requested/approved `display_name` ([[tasks/citizenship-name-change]], task `0067`) **and** the in-game
username every player has — run an independent adversarial pass, fix what is a defect, and route the rest.

## Key Changes

**The answer, from the report's first paragraph:** **no — not through the name.** Every database query a
name touches passes it as a placeholder value, never as SQL text, and the server refuses quotes, `;`, `-`,
`<`, `>`, `$` and backticks in a requested name. **Proven over a real Postgres**, not only read: an
SQL-injection rejection reason is stored byte-for-byte and every table survives.

**Before `0307`, one rule held several doors shut.** `checkUsernameRules` (`src/core/validations/usernameRules.ts`)
was the *only* thing keeping `'` out of the moderator's pasted shell line and `<` out of `NameLayer`'s
`innerHTML`. The five fixes make each path safe on its own, so task `0308` may change the character set
without opening them:

| Fix | What |
|---|---|
| **F1** | `NameLayer` writes names with `textContent`, not `innerHTML` (`src/client/graphics/layers/NameLayer.ts`) |
| **F2** | The operator's decide command carries the name as **pure printable ASCII** — every other character, and `'`, becomes `\uXXXX` (`buildDecideCommandBody` in `src/profile-server/NameChangeRepository.ts`). Safe for **any** name; proven in a real `bash` |
| **F3** | The moderator's Telegram message shows every character other than letter/digit/`_`/`[`/`]`/plain space as a `⟨U+XXXX⟩` code plus a warning line (`describeRequestedNameForModerator`). Review R1 widened it to the four invisible Hangul filler letters, which `\p{L}` admits |
| **F4** | The game server now **enforces** the name rule on the join: new `JoinUsernameSchema` (trim, then `checkUsernameRules`) on `ClientJoinMessageSchema.username` only (`src/core/Schemas.ts`). Before, the join accepted up to 1000 chars, quotes and U+202E. Plus: `sanitizeUsername` cuts at whole letters; the name input only hands out the **last accepted** name; a new `username.rules_hint` (en + ru) explains the rule up front; the card has `maxlength=27` |
| **F5** | The feedback Telegram message escapes `platform` and `yandexStatus` (`src/server/Master.ts`) |

## Outcome

**Dispositions (every finding has one):**
- **Handed to `0308`:** `\s` admits newline/tab/no-break space/U+2028/U+3000/U+FEFF; Hangul fillers being
  *allowed* in names. Characterization tests (`tests/UsernameHostileInputs.test.ts`) pin today's behaviour
  and are meant to flip there. ⚠️ `0308` was **parked** 2026-09-27 (see [[decisions/sprint-6]]). 📌 **2026-10-01:
  `0308` was cancelled** (not reproduced — [[tasks/player-name-lost-space]]). Refusing invisible-only names (rows 9 /
  15, incl. the Hangul fillers) moved to **`0365`**; **odd-space normalization** (newline, tab, no-break space,
  U+2028, U+3000 → a plain space) was **dropped by the owner**.
- **Owner-accepted residuals, with the owner's words:** look-alike / full-width / invisible-space names beat
  the `lower(display_name)` uniqueness check (**Q2**, *"Accept for now"*; re-raise if approved names are shown
  to other players — ⚠️ **that condition was met by `0322`**, and the owner re-ruled it in `0317` D6 — see
  [[decisions/adr-115-approved-name-in-matches]]); Discord webhook fields are not markdown-escaped (**N1**,
  *"Accept while unused"*); the Yandex display name goes into OTEL `enduser.id` (**N2**, *"Accept as is"*).
- 🔴 **Still open — `0067` residual (b):** the old "publicly readable" wording is out of date (`GET /v1/profile`
  now answers only the Bearer caller, task `0273`), **but** the session is minted `vfy:false`, so anyone who
  knows a player's Yandex id can mint a token as that player and read the pending, unmoderated name. The
  report hands it to signed identity (`0014`). Since then `0319` (Backlog board, filed 2026-09-27) tracks
  closing this hole once identity is verified, and `0325` (verified login) is the filed mechanism.

**Evidence:** `npm test` 151 suites / 2300 tests after review (one earlier run hit the known `supertest`
timeout flake and was re-run — said so); `npm run test:integration` 11 suites / 134 tests; the Codex
adversarial pass **ran** (not a Claude fallback), with the gaps it left covered by the coder and marked.

**Not verified:** anything in production; the Telegram message in a real client; the 1002 join refusal over
a live WebSocket (schema level only). **Deploy-window risk:** an old cached client with a half-typed invalid
name joining through an unguarded path is refused with 1002.

## Related

- [[tasks/citizenship-name-change]] — task `0067`, the name-change feature and its residuals (a)/(b)
- [[tasks/name-change-operator-decide-command]] — task `0312`, built on F2's escape; "whichever lands second re-checks the other"
- [[tasks/name-change-digest-pending-list]] — task `0315`, reuses F3's display in the digest list
- [[tasks/approved-name-in-matches-investigation]] — task `0317`, which found the look-alike residual's re-raise condition met
- [[tasks/approved-name-in-multiplayer-matches]] — task `0322`, whose swap re-checks with F4's `JoinUsernameSchema`
- [[decisions/adr-115-approved-name-in-matches]] — look-alikes kept as an accepted risk (D6)
- [[decisions/adr-103-identity-trust-seam]] — the `vfy:false` identity behind residual (b)
- [[tasks/name-change-daily-digest]] — task `0283`; its heartbeat text carries no name, deliberately unescaped
- [[systems/localization]] — `username.rules_hint` and the corrected Russian `invalid_chars` text
- [[decisions/sprint-6]] — the board carrying this task
- [[decisions/sprint-backlog]] — the Backlog board, where `0319` (close residual (b) once identity is verified) was filed from this review
- [[systems/player-profile-store]] — the profile store, updated 2026-09-28 with this task's change
- [[tasks/start-screen-approved-name-lock]] — task `0321` (2026-09-28): the start-screen name box prefills and locks to a citizen's approved name
- [[tasks/player-name-lost-space]] — task `0308`, which took this review's hand-offs; cancelled 2026-10-01, safety parts → `0365`
