# 0307 plan (revised with the owner's rulings): security review of every path a player name travels

**Where this was checked:** working tree on `dev` at `b72fad8`. Every claim comes from reading the code, and the character-rule claims were also tested in node.

**Owner rulings already applied (2026-09-26):**
- Q1: the whitespace rule goes to 0308. 0307 keeps F3, which makes hidden characters visible to the moderator.
- Q2: look-alike names are an **accepted residual**, and no brief is filed.
- Q3: a clear, enforced name limit, explained to players.
- Q4: the curl command writes every non-English character as a code.

## 1. What the code shows today

### A. The citizen's requested / approved name (`display_name`, task 0067)

| Hop | Checked by | Relies on | First verdict |
|---|---|---|---|
| Card input → `POST /v1/profile/name-change-request` | Client trims (`CitizenshipCard.ts:632`). Zod allows 1–128 characters. Bearer session (`Routes.ts:1202-1216`). | Server re-check | OK |
| Server validation | Trim, then `checkUsernameRules` (`NameChangeRepository.ts:222-226`): 3–27 UTF-16 units, plus the character rule | The rule | Refuses `' " < > ; - \ $ \``, emoji and combining marks. **Accepts newline, tab, CR, no-break space, U+2028/2029, U+3000 and the invisible U+FEFF inside a name**, plus look-alike and full-width letters. |
| SQL (every name query) | Placeholders only (`:98-172`). The one `${}` is the constant `LIST_LIMIT` (`InboxRepository.ts:61,79`). | pg driver | **Safe** |
| Uniqueness | `lower(display_name)`, index `players_display_name_uq` (`006_player_identity.sql:90-92`). No normalization. | — | Beaten by U+FEFF, no-break space, look-alikes, full-width letters. **Accepted residual (Q2).** |
| Operator Telegram message | `escapeTelegramHtml` (`:536-537`) | Escaping of `& < >` | HTML-safe. A newline can fake a line, and hidden characters are invisible to the moderator. Fixed by F3. |
| Curl command the operator pastes | `JSON.stringify` inside `'…'` (`:509-516`) | **Only** the rule refusing `'` | Fixed by F2 |
| `/internal/v1/name-change/decide` | `internalAuth`, uuid `playerId`, exact `expectedName` (`:325`) | The shared token | OK. The free-text `reason` (≤500 characters, no character rule) goes into SQL via `$2`. It is parameterized, and an integration test will prove it. |
| Approve → inbox | jsonb param, then `translateText`, then Lit text (`Inbox.ts:272`, `NewsModal.ts:297,309`) | Lit | Safe |
| Read-back `GET /v1/profile` | Bearer, caller only (`Routes.ts:636-651`) | — | Residual (b), below |
| Screens | Card only (`CitizenshipCard.ts:380,490,513`), Lit. **No other player sees a `display_name` today.** | Lit | Safe |
| Daily digest (0283) | Count only (`NameChangeDigest.ts:45-49,103-108`) | — | No name travels on it |
| Logs | `log.warn` with the name (`:394`). Winston `format.json()` | JSON escaping | A newline can't forge a log line |

**0067 residual (b): still open, harder to exploit.** `GET /v1/profile` now answers only for the Bearer caller. But the token is `vfy:false`, meaning the Yandex signature is not checked yet. Anyone who knows a player's Yandex id can mint a token at `POST /v1/login` and read the pending name. It costs one extra call, has the same root as residual (a), and closes with 0014.

### B. The in-game username (every player)

| Hop | Checked by | First verdict |
|---|---|---|
| Name input (`UsernameInput.ts`) | Trim + `validateUsername` on each keystroke (`:70-81`). `maxlength=27` (`:56`). A red error appears **only after** the rule is broken. **No up-front explanation.** | The Russian `invalid_chars` text says "Latin letters only", which is wrong (`ru.json:334`). |
| Stored / Yandex name on load | `getStoredUsername`: Yandex `getName()`, else `localStorage`, then `sanitizeUsername`, else `Anon####` (`:85-119`) | Nobody is locked out: the name is cleaned, never refused. **Exception:** `sanitizeUsername` cuts by UTF-16 unit (`username.ts:96-101`). A name of ≥14 "astral" letters (each stored as two units) ends in half a character, which the rule then refuses (checked in node). |
| Paths into a game | Mission, single-player, host and join-private **buttons** are gated by `isValid()` (`Main.ts:333,354,492,511`). **`handleJoinLobby` (public lobby, matchmaking, reconnect, private join) is not gated** (`Main.ts:695-731`, `PublicLobby.ts:307`, `Matchmaking.ts:135`). | An invalid half-typed name is sent as-is today |
| WebSocket join | `UsernameSchema = SafeString` (`Schemas.ts:203-234`, `:641`): up to 1000 characters. Allows `' " \ & $ ; { }` and U+2000–U+3300 (RTL override U+202E, zero-width characters). | **The server does not enforce the name rule.** A refusal reaches the client as 1002, which shows up as a generic "reconnect failed" (`Worker.ts:399-412`, `Transport.ts:366-372`). |
| Server → every client | Raw name in `gameInfo()`/`GameStartInfo` (`GameServer.ts:539,985`). Lobby lists show it through Lit (`HostLobbyModal.ts:547,556`, `JoinPrivateLobbyModal.ts:92`). | Not injection. But other players see long or direction-flipped names. |
| Simulation → NameLayer | `PlayerImpl` runs `sanitizeUsername` (`PlayerImpl.ts:118`), then `innerHTML` (`NameLayer.ts:265,377`) | Safe **only** because of the sanitizer. Fixed by F1. |
| Events / chat | `unsafeHTML(onlyImages(...))`, DOMPurify (`Util.ts:179`) | Safe |
| Feedback → Telegram / Discord | Username escaped (`Master.ts:277,320`) | **`platform` and `yandexStatus` are not escaped** on the same line. Fixed by F5. |
| Archive / logs / OTEL | `archive()` does nothing. Winston JSON. Client OTEL `enduser.id` (`OtelBrowserInit.ts:26`). | No injection |
| Citizenship card name form | Reuses the `username.*` texts, but without params (`CitizenshipCard.ts:662`) | Shows the raw text `{min}` / `{max}` in the too-short / too-long errors. No `maxlength` and no hint. |

## 2. How Q3 splits with 0308

- **0307 owns:**
  - enforcing the rule on the server
  - making sure the client never sends a name that breaks it
  - explaining the rule to players
  - the length number and how length is counted
- **0308 owns which characters are allowed.** 0307 does **not** change the character set.
- The server check and the explanation texts both read from the one shared `checkUsernameRules` and its constants. When 0308 changes the characters, it edits that rule plus the texts `username.rules_hint` and `username.invalid_chars`, and nothing else.

## 3. Steps

**Step 1: findings report.** `ai-agents/knowledge-base/reports/2026-09-DD-0307-player-name-path-security-review.md`:
- First paragraph: the owner's question answered in plain words, with what was proven and what was not.
- The hop tables above, grown to cover every hop.
- Residual (b) re-stated as **still open**.
- **Owner-accepted residual (Q2), in What / Why / Re-raise-only-if form:**
  - *What:* look-alike or full-width letters, and names that differ only by an invisible or odd space, pass the uniqueness check.
  - *Why accepted:* no other player sees an approved name today. Owner ruling 2026-09-26: "Accept for now".
  - *Re-raise only if:* approved names start being shown to other players (in game, on the leaderboard, or via the nickname-styling work).
- No hostnames, no secrets, no real player names.

**Step 2: independent hostile pass.** `fkit-adversarial-reviewer` (hop 2; chain lead → coder → adversarial-reviewer), scoped to the §1 files as existing code, with the brief's hostile list as its focus. Merge its findings into the report without duplicates. If Codex is unavailable, flag the fallback loudly at the top.

**Step 3: fixes in this task.**
- **F1 NameLayer.** `innerHTML` → `textContent` (`:265`, `:377`). Looks the same today, and no longer depends on the rule.
- **F2 The curl command (Q4).** Move `decideCommandLines` into an exported pure builder. The JSON body becomes pure ASCII: every character outside `\x20-\x7E`, plus `'`, becomes `\uXXXX`. It stays valid JSON, and Express turns it back into the exact name. The shell line is safe for any name, and the clipboard can't mangle it. The readable name stays on the `Requested:` line.
- **F3 Moderator sees hidden characters (Q1).** On the `Requested:` line, show any character that is not a letter, digit, `_`, `[`, `]` or plain space as a visible code (for example `⟨U+00A0⟩`). Add a warning line when the name has one. This only changes how the Telegram message looks.
- **F4 An enforced, explained name limit (Q3).** Nobody is locked out:
  1. **Server enforcement.** New `JoinUsernameSchema` = string passing `checkUsernameRules`, used **only** by `ClientJoinMessageSchema.username` (`Schemas.ts:641`).
     - `PlayerSchema` / `AiPlayerSchema` / `GameStartInfo` are unchanged, so bot, nation and archived names can't break a game start.
     - A failing join gets the existing 1002 refusal. Only a modified client can reach it (see 3 below).
     - This also closes the long / RTL-override lobby-name issue, because U+202E and names over 27 characters are refused.
  2. **Existing stored / Yandex names.** They are still cleaned on load, never refused. Fix the half-character cut: move `sanitizeUsername` into the dependency-free `usernameRules.ts`, re-exported from `username.ts` so current imports keep working. Cut by whole character while staying ≤27 units. Then a cleaned name **always** passes the rule, and a test pins that.
  3. **A half-typed invalid name** in the four unguarded join paths (`handleJoinLobby`): see Q-B.
     - Recommended: send the player's **last accepted name**. The red error stays visible and explains the rule.
     - The four buttons keep their current block.
  4. **Explain the rule before it is broken.**
     - New text `username.rules_hint`, with `{min}`/`{max}`, shown under the in-game name input and the citizenship card name input.
     - Every error message states the full rule.
     - Where the hint sits: see Q-C.
  5. **Card form.** Pass `{min}`/`{max}` through one shared violation-message helper, so the raw `{max}` text goes away. Give the card input `maxlength` = 27.
  6. **Length (Q-A):** stays **27, counted as today**, in UTF-16 units, matching the browser's `maxlength`. The minimum stays 3. The owner makes the call.
- **F5 Feedback Telegram.** Escape `platform` and `yandexStatus` (`Master.ts:320`). *The owner confirms scope at approval.*

**Texts that change (en.json and ru.json together):**
- **new** `username.rules_hint`:
  - en "{min}–{max} characters: letters, numbers, spaces, _ and [ ]."
  - ru "От {min} до {max} символов: буквы, цифры, пробелы, _ и [ ]."
- **fix** ru `username.invalid_chars`: drop "латинские" (the rule allows any alphabet). en is already correct.
- No other keys change. 0308 will re-edit `rules_hint` and `invalid_chars` if it changes the characters.

**Hand to other tasks** (via `fkit-producer`; no new briefs):
- narrowing `\s`, and delete-vs-replace in the sanitizer → 0308
- residual (b) → 0014
- look-alikes → accepted residual, not filed

**Step 4: tests.** Each test checks the actual outcome.
- New `tests/UsernameHostileInputs.test.ts`: `checkUsernameRules` and `sanitizeUsername` over the brief's full hostile list:
  - SQL: `'`, `"`, `;`, `--`, `' OR 1=1 --`, `\`
  - HTML: `<script>`, `<img onerror>`, `&lt;`, `<b>`, `<a href>`
  - Shell: `$(…)`, backticks
  - Invisible and direction characters: ZWSP, ZWJ, U+FEFF, U+202E, isolates
  - Whitespace: newline, tab, CR, U+2028, no-break space
  - Look-alikes, emoji, combining marks
  - Length: 27, 28, 27 astral letters
  - Empty and all-space
  - **Property:** the output of `sanitizeUsername` always passes `checkUsernameRules`, including the 14-astral case (fails on the old code).
  - Characters the rule accepts today are pinned as characterization tests pointing to 0308.
- `tests/ClientJoinMessageSchema.test.ts`:
  - join username refuses `<`, `'`, U+202E, 28 characters, and "ab"
  - accepts Cyrillic, `Name_1 [TAG]`, and exactly 27
  - `GameStartInfo` still accepts a bot name
- `tests/server/Worker.test.ts`: an invalid join gets 1002, if the harness reaches the join path. Otherwise I'll say it wasn't covered.
- Client (jsdom):
  - `UsernameInput` shows the hint; an invalid draft shows the full-rule error; the join name is the last accepted one (per Q-B)
  - `CitizenshipCard` too-long error shows "27", not "{max}"
- Lang: `rules_hint` exists in en and ru; the ru `invalid_chars` no longer says Latin-only.
- `tests/profile-server/NameChangeRepository.test.ts`:
  - hostile names refused with the named violation, with no insert
  - F2 builder: `'`, `$(…)`, backticks, no-break space and U+FEFF give an ASCII body with no `'`; `JSON.parse` gives back the exact name; a `bash` `printf '%s'` round-trip shows nothing expands
  - F3: hidden characters are shown as visible codes
- `tests/profile-server/NameChangeRoutes.test.ts`: `<script>` and `' OR 1=1 --` get 400 `invalid_chars`. `""` gets 400 `bad_request`. All-space gets `too_short`.
- `tests/integration/NameChange.it.test.ts`:
  - reason `'); DROP TABLE players; --` stored byte-identical, tables intact
  - no-break-space and look-alike names stored and read back byte-identical
  - look-alike uniqueness pinned as today (the accepted residual)
- NameLayer (jsdom): `<img onerror>` produces no `img`, and `textContent` equals the input.
- `Master.test.ts`: `<b>` in `platform` is escaped.
- Run `npm test` and `npm run test:integration`. A supertest flake gets re-run, and I'll say so.

**Step 5: review.** `fkit-reviewer` stateful review of the fix diff, through the driver's review step.

## 4. Risks
- **Deploy window:** an old cached client sending a half-typed invalid name to a new server gets a generic "reconnect failed". It's rare and short-lived, and the report will record it.
- **F4 keeps `sanitizeUsername` in `PlayerImpl`.** Single-player and local games (`LocalServer.ts:277`) skip the server, so it must stay.
- **The half-character fix changes cleaned names only for ≥14 astral letters.** Every client in a match runs the same version, so the game stays deterministic.
- **Characterization tests flip in 0308 on purpose.** Their comments say so.
- **F2 changes only the command text, not the decide route.**
- **Only the join schema is narrowed**, never `PlayerSchema`, so a game start can't fail over a name.

## 5. Owner rulings on the remaining questions (2026-09-26, live via `AskUserQuestion` in the `fkit lead` session, relayed by fkit-lead)
- **Q-A (length):** "Keep 3 to 27 (Recommended)" — 3–27, counted in UTF-16 units as today.
- **Q-B (broken half-typed name on an unguarded join):** "Join with last good name (Recommended)".
- **Q-C (where the rule hint shows):** "While editing + in errors (Recommended)".
- **F5 scope:** "Include in 0307 (Recommended)".
