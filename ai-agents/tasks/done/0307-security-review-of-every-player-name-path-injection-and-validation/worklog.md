# 0307 — worklog

Brief: [`brief.md`](./brief.md) · Plan: [`plan.md`](./plan.md) (owner-approved 2026-09-26) · Report:
[`2026-09-26-0307-player-name-path-security-review.md`](../../../knowledge-base/reports/2026-09-26-0307-player-name-path-security-review.md)

**Provenance.** Build step of `fkit-sprint-ship-loop` (driver: `fkit-lead`), run by a spawned
`fkit-coder` under the loop's declared-approval marker: the owner approved the plan live via
`AskUserQuestion` in the `fkit lead` session on 2026-09-26 (*"Approve (Recommended)"*). Plan Steps 1–4
only; Step 5 (the stateful review) is the driver's. Nothing committed. No secrets, hostnames or real
player names here.

## What changed

**Step 1 — findings report:** `ai-agents/knowledge-base/reports/2026-09-26-0307-player-name-path-security-review.md`.

**Step 2 — adversarial pass:** `fkit-adversarial-reviewer` at hop 2 (chain lead → coder →
adversarial-reviewer), scoped to the committed code at HEAD `b72fad8` (read via `git show`, because this
working tree was being edited in parallel). **Codex ran** — not a fallback. Findings X1–X8 are merged
into the report's §4 table. Codex left part of the hostile list uncovered; the coder checked those
parts and marked them **(coder)** in the report.

**Step 3 — fixes:**

| Fix | Files |
|---|---|
| F1 `NameLayer` `innerHTML` → `textContent` | `src/client/graphics/layers/NameLayer.ts` |
| F2 ASCII-only curl body (Q4) | `src/profile-server/NameChangeRepository.ts` (`buildDecideCommandBody`, `decideCommandLines` — now exported, pure) |
| F3 hidden characters shown to the moderator (Q1) | `src/profile-server/NameChangeRepository.ts` (`describeRequestedNameForModerator`, `requestedNameLines`) |
| F4.1 join schema enforces the rule | `src/core/Schemas.ts` (`JoinUsernameSchema`, on `ClientJoinMessageSchema.username` only) |
| F4.2 whole-letter `sanitizeUsername` | `src/core/validations/usernameRules.ts` (moved here), `src/core/validations/username.ts` (re-export) |
| F4.3 join with last accepted name (Q-B) | `src/client/UsernameInput.ts` |
| F4.4 rule explained while editing + in errors (Q-C) | `src/client/UsernameInput.ts`, `src/client/CitizenshipCard.ts`, `src/core/validations/username.ts` (`usernameViolationMessage`, `usernameRulesHint`, `usernameRuleErrorMessage`), `resources/lang/en.json`, `resources/lang/ru.json` |
| F4.5 card `{max}` fix + `maxlength=27` | `src/client/CitizenshipCard.ts` |
| F5 feedback Telegram escaping | `src/server/Master.ts` |

Texts: **new** `username.rules_hint` (en + ru, exactly the plan's wording); **fixed** ru
`username.invalid_chars` (dropped "латинские"). No other key changed. en and ru key sets equal.

**Step 4 — tests:**

- **new** `tests/UsernameHostileInputs.test.ts` — the brief's full hostile list over
  `checkUsernameRules` and `sanitizeUsername`; the "output always passes the rule" property (fails on
  the HEAD sanitizer: 14 astral letters → 27 units, refused); characterization cases for `0308`.
- `tests/ClientJoinMessageSchema.test.ts` — join refuses `<`, `'`, U+202E, zero-width, 28 chars, "ab",
  "", emoji, non-string; accepts Cyrillic, `Name_1 [TAG]`, 27 chars, `Anon1234`; `GameStartInfo` still
  accepts bot/nation names the join refuses.
- `tests/profile-server/NameChangeRepository.test.ts` — hostile names refused with the named rule and
  no insert; F2 builder (ASCII, no `'`, `JSON.parse` round-trip, a real `bash` `printf '%s'` round-trip,
  no file created); F3 codes + warning line; the real name still in the insert and the command.
- `tests/profile-server/NameChangeRoutes.test.ts` — through the **real** repository: `<script>` and
  `' OR 1=1 --` → 400 `invalid_chars`; `""` → 400 `bad_request`; all-space → `too_short`.
- `tests/integration/NameChange.it.test.ts` — SQL-injection reason stored byte-identical, tables and
  rows intact; no-break-space and look-alike names stored and read back byte-identical (request, GET
  profile, approve); look-alike uniqueness pinned (accepted residual); the F2 ASCII body approves the
  exact name through the real route.
- **new** `tests/client/graphics/NameLayer.test.ts` — `<img onerror>` makes no element; `textContent`
  equals the input, on create and on refresh. Both fail against the HEAD `NameLayer.ts`.
- **new** `tests/client/UsernameInput.test.ts` — hint on focus, gone on blur; errors carry the problem
  and the full rule, no raw `{`; last accepted name handed out; never an invalid name; valid before load;
  14-astral stored name cleaned; hostile stored name cleaned, not refused.
- `tests/client/CitizenshipCard.test.ts` — too-long error shows 27 and the full rule, no `{max}`; hint
  and `maxlength=27` in the editor.
- **new** `tests/client/UsernameLang.test.ts` — `rules_hint` in en and ru with `{min}`/`{max}`; equal
  key sets; ru `invalid_chars` no longer says Latin-only.
- `tests/server/MasterFeedbackRoutes.test.ts` — **new** describe (characterization cases untouched):
  `<b>` / `<a href>` in `platform` / `yandexStatus` escaped. Plan named `Master.test.ts`; see decision
  log.

## Test results

| Check | Result |
|---|---|
| `npm test` (1st run) | **1 failed**, 2256 passed — `MasterFeedbackRoutes.test.ts` › *posts to the bot's sendMessage endpoint…*: `Exceeded timeout of 5000 ms`. An **unchanged** characterization test; the known `supertest` flake shape. No `SIGSEGV` in the log, no `node-*.ips` crash report. The suite then passed 3/3 alone. |
| `npm test` (**re-run**) | **151 suites / 2257 tests passed**, exit 0. No `○ skipped` (the Docker-probed harness ran). |
| `npm run test:integration` | **11 suites / 134 tests passed**, exit 0 (local Postgres via `.env.test`). |
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` (eslint) | exit 0 |
| prettier `--check` on touched files | clean (4 test files were re-formatted with `--write` after editing; all were clean at HEAD) |

**Not covered:** the 1002 refusal over a live WebSocket — `tests/server/Worker.test.ts` does not reach
the join path. Covered at the schema level only.

**One-off manual check (not committed):** the F2 body for 10 hostile names inside `'…'` in `zsh -f` and
interactive `zsh -i`: body came back exactly, `!!`/`!$` not expanded, no file created. ⚠️ Side effect:
the interactive `zsh -i` runs loaded the owner's normal zsh session scripts, which printed
"Restored session / Saving session… truncating history files" on exit — the same thing any interactive
zsh exit does on this machine. Nothing else was touched.

## Decision log (unattended calls — ADR-019 / ADR-032 A4)

No review-fix was applied (this is the Build step; no review has run). Obvious-winner calls made while
building, each within the approved plan's intent:

1. **`getCurrentUsername()` before the stored name has loaded** returns `sanitizeUsername(draft)`
   (`"xxx"` for empty). *Answers:* plan F4.1 + Q-B left the pre-load window open — there is no "last
   accepted name" yet, and the empty string the old code sent would now be refused by F4.1 (1002).
   *Why it qualified:* it is the only choice that keeps F4.1 from creating a new failure, and it
   reproduces exactly what players already saw (`PlayerImpl` turned the empty name into `"xxx"`).
2. **The full-rule error is composed in the UI, `validateUsername`'s return value is unchanged.**
   `usernameRuleErrorMessage` = the specific message + `rules_hint`; `validateUsername` delegates to the
   shared `usernameViolationMessage` and returns byte-identical text. *Why:* keeps 0067's parity tests
   (`tests/core/UsernameRules.test.ts`) valid unchanged while meeting "every error states the full rule".
3. **Hint and error never show together.** The hint box is hidden while an error is showing, since the
   error already contains the rule. *Why:* same content twice is noise; Q-C's "while editing + in errors"
   is met either way.
4. **`requestUpdate()` added to `UsernameInput`'s focus/blur/change handlers.** *Why:* the codebase
   convention (`CitizenshipCard`: "the decorator transform does not reliably schedule updates under the
   test build"); without it the hint/error could not be tested. No effect on production rendering.
5. **F5 test placed in `tests/server/MasterFeedbackRoutes.test.ts`, not `Master.test.ts`.** *Why:* the
   feedback route's tests live there (it re-loads `Master.ts` per environment); added as a new describe,
   the characterization cases are untouched.
6. **F3 warning text** (*"⚠️ This name contains hidden or unusual characters (shown above as ⟨U+…⟩
   codes). Check it carefully before approving."*) — plan said "add a warning line", not its wording.
   Operator-only English, matching the rest of that message.
7. **F2 escapes by UTF-16 unit.** An astral character becomes a `\uD8xx\uDCxx` pair — valid JSON,
   decoded back exactly (tested).

## Process-review round 1 (review.md R1, R2) — 2026-09-27

**Provenance.** Process-review step of `fkit-sprint-ship-loop` (driver: `fkit-lead`), run by a spawned
`fkit-coder` under the loop's declared-approval marker (plan blob `722bec1…` verified with
`git hash-object`). Owner rulings 2026-09-27, live via `AskUserQuestion` in the `fkit lead` session,
relayed by fkit-lead: **R1** "Fix in 0307 (Recommended)"; **R2** "Fix in 0307 (Recommended)";
**N1** "Accept while unused (Recommended)"; **N2** "Accept as is". Nothing committed.

### Decision log (fixes applied without per-fix owner approval — ADR-019 / ADR-032 A4)

1. **R1 — F3 misses the Hangul filler letters.** *Changed:* `PLAIN_NAME_CHARACTER` in
   `src/profile-server/NameChangeRepository.ts` gains a `(?!\p{Default_Ignorable_Code_Point})`
   lookahead, so U+115F, U+1160, U+3164, U+FFA0 are shown as `⟨U+…⟩` codes and trigger the warning
   line. Name rule untouched. Tests in `tests/profile-server/NameChangeRepository.test.ts`; report
   § 1 / § 2 / § 4 row 15 / § 5 corrected. *Why it qualified:* verified `CORRECT` (reproduced with
   `tsx`), mechanical and localized (one regex, display only), and the owner ruled the exact scope
   (flag these four, correct the report, add tests, don't touch the rule).
   **Obvious-winner call inside it:** the Unicode property instead of listing the four code points.
   Enumerating every code point in node 24 shows the property matches **exactly** those four among the
   characters F3 treats as plain, so today's behaviour is identical to the literal list; the property
   also catches any invisible letter a later Unicode version adds. Within the ruling's intent (F3
   must not pass an invisible letter as clean).
2. **R2 — the join check doesn't trim.** *Changed:* `JoinUsernameSchema` (`src/core/Schemas.ts`) =
   `z.string().trim().refine(rule)` — **trim-then-check**, and the trimmed name is what the server
   keeps and relays. *Why it qualified:* verified `CORRECT` (reproduced: `"   "` → `success: true`);
   the owner ruled "fix in 0307" and delegated the form to "the minimal correct" of refuse vs
   trim-then-check. Trim-then-check is the form that refuses **fewer** names an old cached client
   sends (`" Bob"` still joins, as `"Bob"`) and exactly mirrors the profile server
   (`NameChangeRepository.requestNameChange` trims then checks and stores the trimmed name).
3. **R2 — client load path trims too (`sanitizeUsernameForJoin`).** *Changed:* new
   `sanitizeUsernameForJoin` in `src/core/validations/usernameRules.ts` (clean → trim → clean again to
   re-pad), used by `UsernameInput.getStoredUsername` and the pre-load fallback of
   `getCurrentUsername`. `sanitizeUsername` and `PlayerImpl` are unchanged. *Answers:* a gap the fix in
   item 2 would otherwise open — verified in `tsx`: `sanitizeUsername` keeps edge spaces (`"★ A ★"` →
   `" A "`, `"😀 😀 😀"` → `"  x"`), which the trimmed join check would refuse, so an **unmodified**
   client with such a Yandex/stored name would be locked out with 1002. *Why it qualified:* it keeps
   the approved plan's own invariant (plan F4.2 / Schemas comment: "an unmodified client never sends a
   name that fails this"; "nobody is locked out"); localized to the one load path; narrows what the
   client sends (trims), never widens it; leaves the cleaner's character handling (0308's) alone.
4. **N1 / N2** — no code. Recorded as owner-accepted residuals in the report (§ 4 rows 13–14 and two
   What / Why / Re-raise-only-if blocks) and in `review.md` *Accepted residuals*, per the rulings.

**Test results (round 1 fixes):**

| Check | Result |
|---|---|
| touched suites (`ClientJoinMessageSchema`, `UsernameHostileInputs`, `client/UsernameInput`, `profile-server/NameChangeRepository`, `profile-server/NameChangeRoutes`, `core/UsernameRules`) | 6 suites / 289 tests passed |
| `npm test` | **151 suites / 2300 tests passed**, exit 0, first run — no flake, no `○ skipped` |
| `npm run test:integration` | **11 suites / 134 tests passed**, exit 0 (local Postgres via `.env.test`) |
| `npx tsc --noEmit` / `npm run lint` | exit 0 / exit 0 |
| prettier `--check` on touched code/test files | clean (the report `.md` is not prettier-formatted, same as other reports) |

**Negative control:** with the three source changes temporarily reverted (restored from scratch
copies right after), the four touched suites failed **20** tests; with them in place all 240 pass.

## Hand-offs (for the driver to route to `fkit-producer`)

- `\s` narrowing + delete-vs-replace in `sanitizeUsername` → **0308**.
- Residual (b) (+ the act-as half of Codex X4) → **0014**.
- Look-alikes → accepted residual, not filed.
- Hangul filler letters being **allowed** in names (review R1's second half) → **0308**.

## Owner dispositions (formerly "open")

- **N1** Discord webhook markdown → **owner-accepted residual** 2026-09-27 ("Accept while unused");
  re-raise only if the webhook is enabled in production.
- **N2** Yandex display name as OTEL `enduser.id` → **owner-accepted residual** 2026-09-27 ("Accept
  as is"). Both recorded in the report § 4 and in `review.md`.
