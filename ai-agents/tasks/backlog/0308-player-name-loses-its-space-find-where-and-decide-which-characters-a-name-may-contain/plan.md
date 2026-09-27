# Plan — 0308: player name loses its space; decide which characters a name may contain

**Planning only. No source, no `plan.md`, no file written.** Every claim below was checked by reading the working tree (which still holds the uncommitted work from 0307, 0302, 0312, 0313 and 0315).

## Summary
- **No line in our code removes a plain space** (U+0020). This confirms the lead finding. The Yandex fallback name on the citizenship card is shown exactly as received: `PlayerProfileView.ts:69-71` → `CitizenshipCard.ts:398`. The in-game cleaner keeps whitespace (`usernameRules.ts:27,78-90`). A search for code that strips whitespace from names found nothing.
- **Step 0 needs you at the keyboard** on the main account. Only the real code points of `getName()` can settle the cause. The most likely results are "Yandex returns it with no space" (nothing to fix on our side) or "the separator is an invisible character". In the second case our cleaner deletes it in game, and it draws as nothing on the card.
- **New finding that 0307's path map missed:** `GameRunner.ts:53,54,64` runs a **second, separate cleaner**, `sanitize()` (`src/core/Util.ts:172-176`), on every human and AI name **before** `PlayerImpl` runs `sanitizeUsername`. That cleaner deletes `-`, `'` and `.`. So widening only `usernameRules.ts` would **not** fix *Анна-Мария* in a match: the hyphen would still be removed there. The plan puts both on one cleaner.
- 0307's hand-offs (a)–(f) are all covered below. The look-alike / full-width residual is **not** reopened: NFC only joins letters with their accents and does not fold look-alikes.
- Four owner decisions are needed (step 2), plus how to run step 0. See Open questions.

## Where the name goes today (verified)
| Screen | Path | Clean-up |
|---|---|---|
| Citizenship card, no approved name | `getCurPlayerName()` → Yandex `getName()` (`FlashistFacade.ts:1317-1336`) → `loadPlayerProfileView` (`PlayerProfileView.ts:69`) → card (`CitizenshipCard.ts:398`) | **none** (raw) |
| Card, approved name | `profile.display_name ?? displayName` (`PlayerProfileView.ts:95`) | server-checked at request time |
| Name input on the main screen | `UsernameInput.getStoredUsername` (`:133-170`): `getName()`, else `localStorage` → `sanitizeUsernameForJoin` | clean + trim |
| Join message → server | `JoinUsernameSchema` (`Schemas.ts:255-260`): trim, then `checkUsernameRules` | refuses |
| Name in a match (above the territory, events, chat) | `GameRunner.ts:53/64` `sanitize()` → `fixProfaneUsername` → `PlayerImpl.ts:118` `sanitizeUsername` | **two different cleaners** |
| Nation names | `GameRunner.ts:90` `${n.name} ${label}` → `PlayerImpl` `sanitizeUsername` | one cleaner |

Side effect of the current behaviour: 7 nation names in the map manifests and 2 bot names (`BotNames.ts`) are hyphenated, e.g. `Morti-Stele`. Today they show in game as `MortiStele`. Any widening that allows `-` fixes them too.

## Step 0 — find the exact characters (you at the keyboard)
1. Open the game on Yandex with the **main** account. Open DevTools and switch the console context to the **game iframe**. `window.FlashistFacade` is exposed there (`FlashistFacade.ts:1631`).
2. Run a snippet that prints only the **shape** of the name, so the real name never reaches any artifact. Letters and digits print as `L`; every other character prints as `U+XXXX`:
   ```js
   const shape = s => [...s].map(c => /[\p{L}\p{N}]/u.test(c) && !/\p{Default_Ignorable_Code_Point}/u.test(c) ? "L" : "U+" + c.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")).join(" ");
   const n = await FlashistFacade.instance.getCurPlayerName();
   console.log("yandex:", n.length, shape(n)); console.log("stored:", shape(localStorage.getItem("username") ?? ""));
   ```
3. Look at the same name on the card, in the name input, above your territory in a match, and on your Yandex account / Yandex Games profile page. Say for each screen whether a space shows.
4. Record the shapes and the per-screen table in `worklog.md`, **as shapes only** (the privacy rule).

## Step 1 — name the cause, then branch
- **`L L L … L` with no separator** → Yandex returns the name without a space. Record it as "on Yandex's side", with the shape as evidence, and tell you plainly: nothing to fix in our code. The second account simply has a different name set.
- **An invisible separator** (e.g. `U+200B`, `U+2060`, `U+FEFF`) → it draws as nothing on the card, and in game our cleaner deletes it (or keeps it invisible, for `U+FEFF`). This **is** in our code's hands. The recommended step-3 rule deletes invisible characters, which would still give `FirstLast`. So if this is what Step 0 finds, **I stop and return `NEEDS-DECISION`**: should zero-width *word separators* become a space instead? I do not guess.
- **A plain `U+0020`, yet the card shows no space** → unexplained. I investigate the rendering and report. No speculative fix.
- If the cause is in our code: add a test that fails on the old code and passes on the fix, using a **placeholder** of the same shape (e.g. `"First​Last"`).

## Step 2 — your ruling (recorded verbatim in the brief before step 3)
See the Open questions below. The ruling goes into the brief (appended by the driver's producer, ADR-035 append-only) and is copied into `worklog.md`.

## Step 3 — build the ruling (written for the recommended answers; the variants are noted)

**One rule, one pipeline, in `src/core/validations/usernameRules.ts`.** It stays dependency-free and shared by the client, the game server and the profile server.
1. **New `normalizeUsername(raw)`.** It keeps every visible character and removes nothing a player meant to type:
   - applies Unicode NFC, so `e` + U+0301 becomes one letter `é`;
   - deletes invisible characters (`\p{Default_Ignorable_Code_Point}`: zero-width chars, U+FEFF, soft hyphen, the Hangul fillers U+115F/U+1160/U+3164/U+FFA0);
   - turns every other whitespace (tab, newline, NBSP, U+2028/2029, U+3000, …) into a plain space;
   - collapses runs of spaces into one;
   - trims.
2. **The rule (`validUsernamePattern`)** becomes: letters and digits (excluding default-ignorable ones), `_`, `[`, `]`, **plain space U+0020 only**, and, per Q1, `-`, `'`, `’` (U+2019, which iOS "smart punctuation" types instead of `'`) and `.`. Still 3–27 UTF-16 units. `checkUsernameRules` itself stays a pure check, and its order and message keys are unchanged.
3. **`sanitizeUsername(raw)`** (per Q3): `normalizeUsername`; then a leftover combining mark → **deleted**; any other refused character (emoji, `!`, `@`, `=`, `<`, …) → **a space**; then collapse and trim; cut to 27 at a whole character (0307's rule, unchanged); trim again (a cut can leave a trailing space); pad with `x`. Its output always passes the rule **and** equals its own trim.
   - This fixes **(d)**: it trims *before* cutting, so 30 leading spaces + `Bob` gives `Bob`, not `xxx`.
   - `sanitizeUsernameForJoin` becomes a thin alias of `sanitizeUsername`, kept so its importers do not change.
   - *Variant Q3 = "delete":* the same pipeline, with deletion in place of the space.
4. **Every entry point prepares with `normalizeUsername` instead of a bare `.trim()`:**
   - `UsernameInput.handleChange` (`:117`);
   - `CitizenshipCard` submit (`:660`);
   - `NameChangeRepository.requestNameChange` (`:251`);
   - `JoinUsernameSchema`: `z.string().transform(normalizeUsername).refine(...)` (zod 4.0.5).

   Why this matters: 0307's ruling that an unmodified client is never locked out is kept. An old cached client's name holding an inner NBSP or tab is **turned into a space by the server, not refused**. The server keeps and relays the normalized name, as it does the trimmed one today.
5. **`GameRunner.ts:53,54,64`:** `sanitize(p.username)` → `sanitizeUsername(p.username)`. `Util.ts`'s `sanitize()` then has no callers (checked: `src/` only, no tests) and is removed. `PlayerImpl` keeps `sanitizeUsername`, which is idempotent, so running it twice is harmless; a test pins that.
6. **Card (Q4 = yes):** `PlayerProfileView.ts:69` cleans a **non-empty** Yandex name with `sanitizeUsernameForJoin`. An empty one stays `""`, exactly as today, so the card never shows `xxx`.
7. **Moderator view (0307 F3):** add `-`, `'`, `’`, `.` to `PLAIN_NAME_CHARACTER` (`NameChangeRepository.ts:599-600`). Otherwise every allowed *O'Neil* would raise a false "hidden characters" warning. The default-ignorable guard stays.
8. **Texts (f), en + ru together:**
   - `username.invalid_chars` / `username.rules_hint` gain `-`, `'` and `.`. Proposed en: `"{min}–{max} characters: letters, numbers, spaces, - ' . _ and [ ]."`. The ru text follows the same pattern.
   - ⚠️ `'` is ICU MessageFormat's escape character (`Utils.ts:149` uses `IntlMessageFormat`). I write it as `''` if needed, and a test asserts the rendered text shows exactly one `'`.
   - *Variant Q1 = narrower:* the texts list only what was allowed.

## Tests (the old expectations flip on purpose — (e))
- `tests/UsernameHostileInputs.test.ts`: the "accepted today" whitespace cases → `invalid_chars` for the raw rule, with new `normalizeUsername` cases (tab/NBSP/U+3000 → space, U+FEFF/U+200B/fillers → removed). Fillers are refused by the rule (c). The `sanitizeUsername` expectations are rewritten per the ruling, e.g. `Cat🐈User` → `Cat User`, `$(rm -rf)` → `rm -rf`. The property tests stay and grow (output always passes the rule **and** the trimmed join check), plus a new **idempotence** property and the 27-leading-spaces case.
- `tests/core/UsernameRules.test.ts`, `tests/Censor.test.ts`: new allowed characters (the shapes *Анна-Мария*, *O'Neil*, *O’Neil*, *Jr.*, decomposed `é`); `Invalid!Name` and emoji are still refused.
- `JoinUsernameSchema`: an inner NBSP → accepted as a plain space (no lockout); `<`, `$` and backtick still refused.
- `tests/client/UsernameInput.test.ts`: a Yandex name of shape `First Last` → `First Last`; `First-Last` kept.
- `tests/client/PlayerProfileView.test.ts`: the card cleans a non-empty Yandex name and leaves `""` alone (Q4).
- `GameRunner`: a hyphenated human name and a hyphenated nation name reach `PlayerImpl.name()` intact (new test; `Util.sanitize` had none).
- `tests/profile-server/NameChangeRepository.test.ts`: `Анна-Мария` shape accepted; tab → stored as a space; moderator view shows `O'Neil` with no warning. The existing bash curl test already covers `O'Brien` (`:1251`), and I add `’` and `-`.
- Integration: `tests/integration/NameChange.it.test.ts` has cases where "odd spaces go in and come back unchanged". Those flip under normalization and are updated. Run with `npm run test:integration`; it needs the local Postgres container, and if that is not up I will say so rather than claim it.

## Security re-check of every hop (verification 6), with the new characters `-` `'` `’` `.`
Written as a dated **0308 addendum to the 0307 report** plus the `worklog.md` entry:
- **SQL:** placeholders only → safe.
- **Curl line:** F2 writes `'` as `'` and every non-ASCII character as `\uXXXX` → safe, proven by the bash test.
- **Telegram:** `&` `<` `>` escaped → `'` is inert.
- **`NameLayer`:** `textContent` → safe.
- **Lit screens:** safe.
- **Events and chat:** `unsafeHTML(onlyImages())` with DOMPurify (`EventsDisplay.ts:676,688`) → a name still cannot carry `<`, so it cannot open a tag.
- **ICU:** names are *values*, not patterns → safe.
- **Clan tag:** ASCII-only regex → unaffected.
- **Profanity matcher:** skips non-letters → unaffected.
- **Discord N1 / OTEL N2:** stay as the accepted residuals.

## Risks and edge cases
- **Deploy order:** deploy the **profile server first**. A new client with the wider rule talking to an old profile server would get `invalid_chars` on *Анна-Мария*. The profile server is deployed separately from the game image.
- **Old cached client, deploy window:** a Yandex name made only of Hangul fillers (e.g. three U+3164) normalizes to `""` → the new server refuses it with 1002 until the page reloads. This is the same kind of short-lived risk 0307 already accepted, and it needs a deliberately invisible name.
- **Determinism:** the name is not in `PlayerImpl.hash()` (`:1138-1142`), and every client in a match cleans the same way → no desync.
- **Nation labels:** a 26-character nation name plus ` H` still gets its label cut at 27. This exists today and stays out of scope; noted only.
- **Out of scope, noted:** combining marks with no precomposed form (Hindi/Thai vowel signs, "Zalgo" text) are still removed. Allowing them is a separate decision.

## Verification
`npm test` (re-run and report if the known `supertest` flake shape appears), `npm run test:integration`, `npx tsc --noEmit`, `npm run lint`, Prettier on touched files. Before/after: the new tests fail with the source changes reverted. Nothing is committed.

## Files likely touched
- `src/core/validations/usernameRules.ts`, `src/core/validations/username.ts` (re-export only)
- `src/core/Schemas.ts`, `src/core/GameRunner.ts`, `src/core/Util.ts`
- `src/client/UsernameInput.ts`, `src/client/CitizenshipCard.ts`, `src/client/PlayerProfileView.ts`
- `src/profile-server/NameChangeRepository.ts`
- `resources/lang/en.json`, `resources/lang/ru.json`
- the tests listed above
- `worklog.md`, and the 0307 report addendum

## Owner rulings (2026-09-27, live via `AskUserQuestion` in the `fkit lead` session, relayed by fkit-lead) — record verbatim
- **Q1 (characters):** "Hyphen, apostrophe, dot (Recommended)" — allow `-`, `'` (and the curly `’`) and `.`, and join split accents into one letter; emoji and other symbols stay out.
- **Q2 (spaces / invisible):** "Normal space only, quietly (Recommended)" — other spaces quietly become a normal space, double spaces become one, invisible characters are removed, everywhere including the server, so nobody is refused for them.
- **Q3 (disallowed characters when cleaning):** "Visible ones become a space (Recommended)" — emoji, `!`, `@` and other symbols become a space; invisible characters and leftover accent marks are deleted.
- **Q4 (card name):** "Yes, same name (Recommended)" — the card cleans the Yandex name the same way; an empty name stays empty.
- **Q0 (Step 0 method):** "Drive my Chrome" — the name shape is read by driving the owner's Chrome via the browser extension (owner logged in and watching); only the shape is recorded.
