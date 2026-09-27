# 0307 — Security review of every path a player name travels

**Task:** [`0307`](../../tasks/done/0307-security-review-of-every-player-name-path-injection-and-validation/brief.md)
· **Plan (owner-approved 2026-09-26):** [`plan.md`](../../tasks/done/0307-security-review-of-every-player-name-path-injection-and-validation/plan.md)
· **Written:** 2026-09-26 by `fkit-coder` (Build worker of `fkit-sprint-ship-loop`) · **Code frame:** `dev` at
`b72fad8` for "before", the 0307 working tree for "after".

> **Adversarial pass coverage: Codex RAN** (`codex-cli 0.157.1`, read-only, against HEAD `b72fad8`). This is
> **not** a Claude fallback. Codex covered only part of the hostile list; the parts it left out were
> checked by the coder and are marked **(coder)** below. "Codex found nothing there" is never used to
> mean "clean".

## The owner's question, answered

> *"Is it possible that somebody can inject code into our database … via their request of changing their
> name, or when the name is approved?"*

**No — not through the name.** Every database query a name touches passes the name as a separate value
(a "placeholder"), never pasted into the SQL text, so the database never reads a name as a command. On
top of that, the server refuses quotes, `;`, `-`, `<`, `>`, `$` and backticks in a requested name. This
was **proven**, not just read: over a real Postgres, a rejection reason of `'); DROP TABLE players; --`
is stored byte-for-byte and every table is still there, and names with odd spaces or look-alike
letters go in and come back out unchanged.

**What was found and fixed** is next to the database, not in it: the command the moderator pastes into a
terminal was safe **only** because the name rule refuses `'`; the moderator could not see invisible
characters in a requested name; the game server did not enforce the name rule at all on the in-game
name; one screen drew names as HTML; two feedback fields reached Telegram unescaped. All five are fixed
(F1–F5 below), so no path now depends on the name rule staying narrow.

**What was not proven:** nothing here was tested in production. The Telegram message was checked as
text, not looked at in a real Telegram client. The game server's refusal of a bad join name is tested at
the message-check level, not over a live WebSocket. One older weakness is **still open** (residual (b),
below): anyone who knows a player's Yandex id can read that player's pending, not-yet-approved name.

## 1. The rule that held several doors shut

`checkUsernameRules` (`src/core/validations/usernameRules.ts`): 3–27 UTF-16 units, characters
`/^[\p{L}\p{N}_[\]\s]+$/u` — any letter or digit in any alphabet, `_`, `[`, `]`, and anything `\s`
counts as a space. Before 0307 it was the **only** thing keeping `'` out of the moderator's shell line
and `<` out of `NameLayer`'s `innerHTML`. After 0307 each of those paths is safe on its own (F1, F2), so
task `0308` may change the character set without opening them.

What `\s` lets through today (checked in node and pinned by tests): newline, tab, CR, no-break space,
U+2028/U+2029, U+3000 and the invisible U+FEFF — plus look-alike and full-width letters, which are
ordinary letters, and the four invisible Hangul "filler" letters U+115F, U+1160, U+3164 and U+FFA0
(category Lo, so `\p{L}` admits them; a name can be made of nothing else and look blank — review
round 1, R1). Which characters are allowed is **task `0308`'s** decision (owner ruling Q1).

## 2. Path A — the citizen's requested / approved name (`display_name`, task 0067)

| Hop | Checked by | Relies on | Before 0307 | After 0307 |
|---|---|---|---|---|
| Card input → `POST /v1/profile/name-change-request` | Client trims (`CitizenshipCard.ts`). Zod `requestedName` 1–128 chars (`""` → 400 `bad_request`). Bearer session. | Server re-check | OK | OK. Card now has `maxlength=27`, shows the rule while editing, and its errors show real numbers (was a raw `{max}`). |
| Server validation | Trim, then `checkUsernameRules` (`NameChangeRepository.requestNameChange`) | The rule | Refuses `' " < > ; - \ $` backticks, emoji, combining marks, zero-width chars, U+202E and isolates. Accepts `\s` characters and look-alikes. | Unchanged by design (character set = `0308`). Proven by unit + route tests through the **real** repository. |
| SQL — every name query | Placeholders only (`$1`, `$2`). The one `${}` in the area is the constant `LIST_LIMIT` (`InboxRepository.ts`). | pg driver | **Safe** | **Safe — proven** over real Postgres (integration). |
| Uniqueness | `lower(display_name)`, index `players_display_name_uq` (`006_player_identity.sql`). No normalization. | Postgres `lower()` | Beaten by U+FEFF, no-break space, look-alikes, full-width letters, and letters `lower()` folds differently from what a human expects. | **Owner-accepted residual (Q2)** — pinned by an integration test. |
| Operator Telegram message | `escapeTelegramHtml` (`& < >`) | Escaping | HTML-safe, but a newline could fake a second line and invisible characters could not be seen. | **Fixed (F3):** anything other than a visible letter/digit/`_`/`[`/`]`/plain space is shown as `⟨U+XXXX⟩`, plus a warning line. ⚠️ **Correction (review R1):** as first built, F3 counted every `\p{L}` letter as plain, so the four invisible Hangul fillers (U+115F, U+1160, U+3164, U+FFA0) reached the moderator raw with **no** warning — "Fixed" overstated it. Now fixed: they are shown as codes and trigger the warning (owner ruling 2026-09-27). The name rule still **accepts** them — that half is `0308`'s. |
| Curl command the operator pastes | `JSON.stringify` inside `'…'` | **Only** the rule refusing `'` | Safe only while the rule stays narrow. | **Fixed (F2):** the JSON body is pure printable ASCII, and `'` is written as `\u0027`. Safe for **any** name. Proven in a real `bash`; also checked once by hand in `zsh` (below). |
| `/internal/v1/name-change/decide` | `internalAuth` (shared token), uuid `playerId`, exact `expectedName` | The shared token | OK. The free-text `reason` (≤500 chars, no character rule) goes to SQL as `$2`. | OK — **proven:** an SQL-injection reason is stored byte-identical, all tables intact. The F2 ASCII body is decoded by the route back to the exact name (integration). |
| Approve → inbox | jsonb param → `translateText` param (ICU **value**, not pattern) → Lit text (`Inbox.ts`, `NewsModal.ts`) | Lit escaping | Safe | Safe |
| Read-back `GET /v1/profile` | Bearer, caller only (`Routes.ts:631`) | Session token | See residual (b) | **Still open** — residual (b) |
| Screens | Card only (`CitizenshipCard.ts`), Lit. No other player sees a `display_name` today. | Lit | Safe | Safe |
| Daily digest (task 0283) | Count only (`NameChangeDigest.ts:46`, `:103-108`) **(coder)** | — | No name on it | No name on it — keep it so (its text is deliberately unescaped) |
| Profile-server logs | `log.warn` with the name. Winston `format.json()` (`src/profile-server/Logger.ts`) **(coder)** | JSON escaping | A newline is written as `\n` inside the JSON — cannot forge a log line | Same |

### 0067 residual (b) — **STILL OPEN**

`GET /v1/profile` now answers only for the Bearer caller (task 0273), so the old "public,
unauthenticated" wording is out of date. But the session token is minted at `POST /v1/login` with
`vfy:false` — the Yandex signature is **not** checked yet. So anyone who knows a player's Yandex id can
mint a token as that player and read the pending, not-yet-approved name. Codex (X4) rated this
**medium** and added that the same token lets them act as that player on the name-change routes; that
second half is 0067 residual (a) (forged-id submission, caught by the moderator). Both have the same
root and close with **task `0014`** (signed identity). Hand-off, below.

## 3. Path B — the in-game username (every player)

| Hop | Checked by | Before 0307 | After 0307 |
|---|---|---|---|
| Name input (`UsernameInput.ts`) | Trim + rule on each keystroke; `maxlength=27` | Red error only **after** the rule broke; no up-front explanation. Russian `invalid_chars` said "Latin letters only" — wrong. | **Fixed (F4.4):** the rule shows while the input has focus; every error states the problem **and** the full rule; Russian text fixed. |
| Stored / Yandex name on load | `getStoredUsername` → `sanitizeUsername`, else `Anon####` | Never refused (good). **But** `sanitizeUsername` cut by UTF-16 unit: ≥14 "astral" letters ended in half a letter, which the rule then refused. | **Fixed (F4.2):** cut at a whole letter, still ≤27 units. Its output **always** passes the rule — pinned by a property test that fails on the old code. **Review R2:** the load path now uses `sanitizeUsernameForJoin` (clean → trim → clean again to re-pad), so a name like `"★ A ★"` becomes `"Axx"`, not `" A "`, and `"   "` becomes `"xxx"` — its output always passes the server's **trimmed** join check. `sanitizeUsername` itself (and so `PlayerImpl`) is unchanged. |
| Paths into a game | Mission, single-player, host and join-private **buttons** check `isValid()` | `handleJoinLobby` (public lobby, matchmaking, reconnect, private join, tutorial) did **not** — a half-typed invalid name was sent as-is. | **Fixed (F4.3, owner ruling Q-B):** the input only ever hands out the **last accepted** name. The four buttons still block while the draft is invalid. |
| WebSocket join | `ClientJoinMessageSchema.username` = `SafeString`: up to 1000 chars; allows `' " \ & $ ; { }` and U+2000–U+3300 (U+202E, zero-width chars) | **The server did not enforce the name rule.** | **Fixed (F4.1):** new `JoinUsernameSchema` = **trim, then** `checkUsernameRules`, on the **join only**; the server keeps and relays the trimmed name. A refusal gets the existing 1002 close. `PlayerSchema`/`AiPlayerSchema`/`GameStartInfo` unchanged, so bot/nation/archived names can never fail a game start. ⚠️ **Review R2:** as first built the check ran on the **untrimmed** name, so a modified client could join as `"   "` (a blank name other players saw). Trimming first — like the name input and the profile server — closes it (owner ruling 2026-09-27). |
| Server → every client | Raw name in `gameInfo()` / `GameStartInfo` (`GameServer.ts`); lobby lists via Lit | Not injection, but other players saw 1000-char or direction-flipped (U+202E) names. | Closed by F4.1 for human players. |
| Clan tag **(coder)** | `getClanTag` (`src/core/Util.ts:329`): `/\[([a-zA-Z0-9]{2,5})\]/`, upper-cased; grouped in a `Map` (`TeamAssignment.ts`) | Safe — ASCII-only capture, `Map` keys (no `__proto__` risk) | Same |
| Simulation → NameLayer | `PlayerImpl` runs `sanitizeUsername`, then `innerHTML` (`NameLayer.ts:265`, `:377`) | Safe **only** because of the sanitizer. | **Fixed (F1):** `textContent`. Looks the same today; no longer depends on the rule. |
| Events / chat | `unsafeHTML(onlyImages(...))`, DOMPurify (`ChatDisplay.ts`, `EventsDisplay.ts`, `src/core/Util.ts` `onlyImages`) | Safe for names: a name cannot carry `<` after `sanitizeUsername`, so it cannot add a tag. **(coder)** `onlyImages` does allow `style` on `span`/`img`, but only markup the app itself writes reaches it — not reachable through a name. | Same |
| Feedback → Telegram | `esc()` on username (`Master.ts`) | **`platform` and `yandexStatus` unescaped** on the same HTML line. | **Fixed (F5).** |
| Feedback → Discord webhook **(coder)** | JSON body; `esc()` is HTML-escaping, which does nothing for Discord markdown | Not injection into our systems. A modified client could put Discord markdown (for example a masked link) into a field the moderator reads. The production setup runs Telegram-only (per `MasterFeedbackRoutes.test.ts`). | **Not changed — owner-accepted residual (N1)**, below. |
| Server logs **(coder)** | Winston `format.json()` (`src/server/Logger.ts`); `Worker.ts` logs `z.prettifyError`, which names the rule, not the value | A newline cannot forge a log line | Same |
| OTEL **(coder)** | `enduser.id` = the Yandex player name (`OtelBrowserInit.ts`, set from `FlashistFacade`) as a structured attribute | No injection (structured attribute) | Same. **Side note, not injection (N2):** the attribute carries a real Yandex display name into telemetry — **owner-accepted residual**, below. |
| Archive **(coder)** | `POST /api/archive_singleplayer_game` parses a client record with the wide `UsernameSchema`; `archive()` is a no-op behind `archiveEnabled()` | Nothing stored or shown | Same — informational |

## 4. Findings and dispositions

Every finding, with where it came from. **C** = coder (plan §1), **X** = Codex adversarial pass.

| # | Finding | Source | Severity | Disposition |
|---|---|---|---|---|
| 1 | Operator's curl line is shell-safe only because the rule refuses `'` | C; X5 (see note) | low today, high if `0308` widened the rule | **Fixed — F2** |
| 2 | Moderator cannot see invisible / odd-space characters; a newline can fake a line in the message | C; **(coder)** covered Codex's gap | low | **Fixed — F3** |
| 3 | Game server does not enforce the name rule on the join name (1000 chars, U+202E, quotes) | C; X2 | low | **Fixed — F4.1** |
| 4 | `handleJoinLobby` sends a half-typed invalid name | C; X3 | low | **Fixed — F4.3** (owner ruling Q-B: last accepted name) |
| 5 | `sanitizeUsername` can end a name in half a letter (≥14 astral letters) | C; **(coder)** covered Codex's gap | low | **Fixed — F4.2** |
| 6 | No up-front explanation of the rule; Russian `invalid_chars` wrong; card shows raw `{max}`, no `maxlength` | C | low (UX) | **Fixed — F4.4 / F4.5** (owner rulings Q3, Q-C) |
| 7 | `NameLayer` uses `innerHTML` (safe only via the sanitizer) | C; X7 | low | **Fixed — F1** |
| 8 | Feedback Telegram leaves `platform` / `yandexStatus` unescaped | C; X6 | low | **Fixed — F5** |
| 9 | `\s` admits newline/tab/NBSP/U+2028/U+3000/U+FEFF in names | C; X1 | low | **Handed to `0308`** (owner ruling Q1) — characterization tests pin today's behaviour and are meant to flip there |
| 10 | Look-alike / full-width / invisible-space / `lower()`-folding names beat the uniqueness check | C; X1; **(coder)** `lower()` folding | low | **Owner-accepted residual (Q2)** — below |
| 11 | Pending name readable by anyone who knows the Yandex id (`vfy:false` token) | C; X4 (medium) | medium | **Still open — residual (b)**, closes with `0014` (hand-off) |
| 12 | No SQL injection, no inbox/NewsModal XSS on the name-change path | X8; C (proven by integration tests) | — | **Confirmed safe** — no action |
| 13 | Discord webhook fields are not markdown-escaped (feedback path) | **(coder)** — Codex did not cover it | low | **Owner-accepted residual — N1** (2026-09-27, "Accept while unused") |
| 14 | OTEL `enduser.id` carries the Yandex display name (privacy, not injection) | **(coder)** | informational | **Owner-accepted residual — N2** (2026-09-27, "Accept as is") |
| 15 | F3 misses the four invisible Hangul filler letters (U+115F, U+1160, U+3164, U+FFA0): shown raw, no warning | Stateful review round 1, **R1** | low | **Fixed in 0307** (owner ruling 2026-09-27). Allowing them in names at all → `0308`. |
| 16 | The join check did not trim: a modified client could join as `"   "` or with edge spaces | Stateful review round 1, **R2** (also Codex X1 in that round) | low | **Fixed in 0307** (owner ruling 2026-09-27): trim, then the rule; the client's load path trims too. |

**Note on X5.** Codex labelled X5 "REFUTES" the coder's finding, but its own text agrees with it: *"the
critical shell breaker would be a literal `'`, which the current rule rejects."* The adversarial
reviewer flagged the label as wrong after checking the code at HEAD. Treated as **confirming** finding 1.

### Owner-accepted residual (Q2) — look-alike names

- **What:** look-alike or full-width letters, names that differ only by an invisible or odd space, and
  letters Postgres `lower()` folds differently from what a person expects, all pass the uniqueness
  check (`lower(display_name)`, no normalization). Pinned by
  `tests/integration/NameChange.it.test.ts` ("a Cyrillic look-alike of a held name is accepted").
- **Why accepted:** no other player sees an approved name today — it is shown only on the player's own
  citizenship card. Owner ruling 2026-09-26: *"Accept for now"*. No brief filed.
- **Re-raise only if:** approved names start being shown to other players — in game, on a leaderboard,
  or through the nickname-styling work.

### Owner-accepted residual (N1) — Discord webhook markdown

- **What:** the feedback route's Discord embed puts client strings into fields without Discord-markdown
  escaping (`esc()` is HTML escaping, which does nothing for markdown). A modified client could make a
  moderator see a disguised (masked) link in a feedback report. It does not touch our database or
  servers.
- **Why accepted:** the Discord webhook is not used — production runs Telegram-only today, so nobody
  reads that output. Owner ruling 2026-09-27: *"Accept while unused"*. No brief filed.
- **Re-raise only if:** the Discord webhook is enabled in production.

### Owner-accepted residual (N2) — Yandex display name in OTEL

- **What:** the client sends the player's Yandex display name as the OTEL `enduser.id` attribute
  (`OtelBrowserInit.ts`, set from `FlashistFacade`). Not injection — it is a structured attribute. It is
  personal data going into telemetry (a privacy point, not a security hole).
- **Why accepted:** owner ruling 2026-09-27: *"Accept as is"*. The telemetry box is our own and
  RU-hosted, so it adds no data-residency problem today. No brief filed.
- **Re-raise only if:** telemetry data starts leaving our own RU-hosted box (shared with a third party,
  or moved abroad), a privacy / 152-ФЗ review asks for less personal data in telemetry, or `enduser.id`
  starts being joined with other personal data (for example a profile or payment id).

## 5. The fixes (F1–F5)

- **F1 — `NameLayer`:** `innerHTML` → `textContent` at both places a name is written
  (`src/client/graphics/layers/NameLayer.ts`).
- **F2 — the operator's curl command (Q4):** new exported pure builders `buildDecideCommandBody` and
  `decideCommandLines` (`src/profile-server/NameChangeRepository.ts`). Every character outside
  `\x20-\x7E`, and `'`, becomes `\uXXXX`. Still valid JSON; the route's parser turns it back into the
  exact name, so the `expectedName` binding still matches. The readable name stays on the `Requested:`
  line.
- **F3 — moderator sees hidden characters (Q1):** `describeRequestedNameForModerator` shows every
  character other than letter/digit/`_`/`[`/`]`/plain space as `⟨U+XXXX⟩` (whole code point), plus a
  warning line. Only how the Telegram message looks changes; the stored name is untouched. **Review
  R1:** a letter or digit Unicode marks *Default_Ignorable_Code_Point* no longer counts as plain — today
  that is exactly the four Hangul fillers U+115F, U+1160, U+3164, U+FFA0 (checked in node 24).
- **F4 — an enforced, explained limit (Q3; Q-A 3–27 in UTF-16 units; Q-B; Q-C):**
  1. `JoinUsernameSchema` on `ClientJoinMessageSchema.username` only (`src/core/Schemas.ts`). Trims,
     then applies the rule (review R2); the trimmed name is what the server keeps.
  2. `sanitizeUsername` moved into `usernameRules.ts` (dependency-free), re-exported from `username.ts`;
     cuts at whole letters.
  3. `UsernameInput.getCurrentUsername()` returns the last accepted name. Before the stored name loads,
     it returns the cleaned draft (`"xxx"` for empty) — what `PlayerImpl` already showed for the empty
     name this path used to send. Both that fallback and the stored/Yandex name on load go through the
     new `sanitizeUsernameForJoin` (`usernameRules.ts`; review R2), whose output always passes the
     trimmed join check.
  4. New text `username.rules_hint` (en + ru) with `{min}`/`{max}`; shown while the name input has
     focus and in the card's editor; every rule error = the specific problem + the full rule.
  5. Card: one shared helper (`usernameViolationMessage`) fills `{min}`/`{max}`; `maxlength=27`.
- **F5 — feedback Telegram:** `platform` and `yandexStatus` escaped (`src/server/Master.ts`).

## 6. Risks

- **Deploy window.** A player with an **old cached client** who has a half-typed invalid name and joins
  through an unguarded path (public lobby, matchmaking, reconnect) is refused with 1002, which the old
  client shows as a generic "reconnect failed". Rare and short-lived. New clients never send such a
  name.
  The same holds for an old client whose stored or Yandex name cleans to one with edge spaces that is
  too short once trimmed (for example `"★ A ★"` → `" A "`): the new server trims it to `"A"` and
  refuses it (review R2). Just as rare; a new client cleans it to `"Axx"` first.
- **`sanitizeUsername` stays in `PlayerImpl`:** single-player and local games (`LocalServer.ts`) never
  reach the server's join check.
- **The half-letter fix changes cleaned names only for ≥14 astral letters.** Every client in a match
  runs the same version, so the game stays deterministic.
- **Characterization tests flip in `0308` on purpose** (`tests/UsernameHostileInputs.test.ts`, "accepted
  today").

## 7. Evidence

- `npm test`: **151 suites / 2257 tests passed** on the re-run. The first run had one failure,
  `MasterFeedbackRoutes.test.ts` — *"Exceeded timeout of 5000 ms"* in an unchanged characterization
  test — the known `supertest` flake shape (no `SIGSEGV`, no crash report). The suite passed 3/3 alone
  and the full re-run was green. **Re-ran, and said so.**
- `npm run test:integration`: **11 suites / 134 tests passed** (local Postgres, `.env.test`).
- `npx tsc --noEmit`: clean. `npm run lint`: clean. Prettier: clean on touched files.
- Old-code checks: the `sanitizeUsername` property case fails on the HEAD implementation (27 units,
  refused by the rule); both `NameLayer` tests fail against the HEAD `NameLayer.ts`.
- One-off shell check (not a committed test): the F2 body for 10 hostile names, pasted inside `'…'`
  into `zsh -f` and an interactive `zsh -i` — the body came back exactly; `!!`/`!$` did not expand; no
  file was created. (The committed test uses `bash`.)
- **After the review round (R1, R2; 2026-09-27):** `npm test` **151 suites / 2300 tests passed** on
  the first run (no flake, nothing skipped); `npm run test:integration` **11 suites / 134 tests
  passed**; `tsc --noEmit` and `npm run lint` clean. With the three R1/R2 source changes temporarily
  reverted, the new tests fail (20 failures across the four touched suites).
- **Not covered by a test:** the 1002 refusal over a live WebSocket — `tests/server/Worker.test.ts`
  does not reach the join path, so it is covered at the schema level only.

## 8. Hand-offs (routed by the driver to `fkit-producer`; no new briefs)

- Narrowing `\s`, and delete-vs-replace in `sanitizeUsername` → **`0308`**.
- Residual (b) (and the act-as half of X4) → **`0014`**.
- Look-alikes → accepted residual, **not filed**.
- N1, N2 → **owner-accepted residuals** (2026-09-27), not filed.
- Hangul filler letters being **allowed** in names (review R1's second half) → **`0308`**.
