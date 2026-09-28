# Worklog — 0316: approve inbox message must not promise the new name is active everywhere

## 2026-09-28 — Build (fkit-coder, spawned by `fkit-sprint-ship-loop` / fkit-lead)

Declared-approval marker: caller `fkit-sprint-ship-loop`; approved plan `plan.md` (blob
`b63928af35c1b936d92cf3f727ce53b84215ea89`, 8595 bytes — re-hashed this turn, matches); owner approved
live via `AskUserQuestion` in the `fkit lead` session, 2026-09-28.

### Owner rulings — recorded verbatim BEFORE the edit (brief verification 1)

As relayed by fkit-lead, copied from the end of the approved plan:

- **Q1 (wording):** "C: short" — Never goes stale, but doesn't say where the name shows. ⇒ use **Option C**
  exactly: en body `Your new display name ''{name}'' has been approved.` / ru body
  `Ваше новое имя «{name}» одобрено.` Title unchanged. (Not the recommended option A.)
- **Q2 (reword later?):** "Once, when 0322 ships (Recommended)" — 0322's note becomes 'may reword, owner
  approves the text'; 0321 gets 'doesn't touch this message'. One rewording, when the name fully shows in
  matches. ⇒ the producer updates the 0321/0322 notes (routing, not part of this build).
- **Plan approval:** "Approve (Recommended)" — 2026-09-28.

Approved text (en shown as stored in JSON; `''` is ICU escaping and renders as a single `'`):

| Key | Lang | Before | After |
|---|---|---|---|
| `inbox.templates.name_change_approved.title` | en | Your name change was approved | *unchanged* |
| same | ru | Смена имени одобрена | *unchanged* |
| `inbox.templates.name_change_approved.body` | en | Your new display name ''{name}'' is now active. | Your new display name ''{name}'' has been approved. |
| same | ru | Ваше новое имя «{name}» теперь активно. | Ваше новое имя «{name}» одобрено. |

### Decision log

Unattended fixes / obvious-winner calls (ADR-019 audit, ADR-032 A4): **none**. This was a Build step:
every edit below is plan step 2 or 3 applied as written, under the Q1 ruling. No review findings were
processed.

Build-time choices inside the plan (recorded so they can be found later):
- **Test file:** extended `tests/client/NameChangeLang.test.ts` as plan step 3 specifies. Added
  `import IntlMessageFormat from "intl-messageformat"` (same import `InboxTemplateLang.test.ts` uses) and
  one `describe` block. `InboxTemplateLang.test.ts` untouched, as the plan says.
- **Rendered check uses the client's own call.** `src/client/Utils.ts` `translateText` renders with
  `new IntlMessageFormat(message, locale).format(params)`. Test 3(c) makes the same call with `"en"` / `"ru"`.
- **Edit method:** exact-string replace of each `body` line (asserting exactly one match). The
  `git diff` before and after was compared: the only change in each file is that one line. The uncommitted
  0311/0314/0250/0303 hunks in en.json/ru.json are unchanged.

### What changed
- `resources/lang/en.json`: `inbox.templates.name_change_approved.body` →
  `Your new display name ''{name}'' has been approved.`
- `resources/lang/ru.json`: same key → `Ваше новое имя «{name}» одобрено.`
- `tests/client/NameChangeLang.test.ts`: new block *"the name_change_approved note (task 0316)"*:
  (a) verbatim pin of en + ru title and body; (b) en body lacks "is now active", ru body lacks
  «теперь активно»; (c) rendered with `name: "Test"`, en = `Your new display name 'Test' has been approved.`,
  ru = `Ваше новое имя «Test» одобрено.`

### Evidence
- Targeted: `npm test -- tests/client/NameChangeLang.test.ts tests/client/InboxTemplateLang.test.ts
  tests/client/NoGameNameInPlayerText.test.ts tests/client/Inbox.test.ts` → 4 suites, 96 tests passed.
- **The new tests catch the errors they target (mutation check; en.json restored afterwards and
  byte-compared):**
  - With en body changed to single `'{name}'`: the pin and "en renders the exact sentence" fail. The
    output was `Your new display name {name} has been approved.`, which shows the ICU trap.
  - With the old "is now active." text put back: the pin, "no longer says the name is active" and the en
    render test fail.
- Grep (verification 2): `grep -n "is now active\|теперь активно" resources/lang/en.json resources/lang/ru.json`
  → no matches (exit 1).
- Full `npm test`, **run 1: 1 failed.** The failure was `tests/profile-server/SessionRoutes.test.ts` ›
  *"an empty Bearer → 401 session_invalid, readable cross-origin"* with `socket hang up` (a supertest
  suite; this code change does not touch it). 0197 was ruled out: there is no `SIGSEGV` in the output and
  no `node-*.ips` crash report from the last 30 min. This matches the known supertest flake family, but
  its `socket hang up` form has **never been traced**. The suite passed alone (117/117). **Re-ran the full
  `npm test` → 163/163 suites, 2761/2761 tests, exit 0**, shell harnesses included (none skipped).
- `npx tsc --noEmit` → exit 0.
- `npx eslint tests/client/NameChangeLang.test.ts` → clean. `prettier --check` on the three touched files → clean.
- `npm run lint` (whole repo) → **red, and this change did not cause it**: 1 parsing error in the
  untracked 0325 helper `ai-agents/tasks/backlog/0325-…/s0-hmac-check.mjs` ("not found by the project
  service"). It was already known and was not fixed, per the spawn instruction.

### Not verified
- **Local by-eye run (verification 4): NOT done.** No local profile server is running. The only Postgres
  here is the integration test container, which every integration run drops, so it holds no dev inbox
  data. Seeing an existing `name_change_approved` message would need a profile server, a seeded dev DB, a
  session and a browser. That is more setup than this spawn has, and it has no owner channel to ask for
  it. Test 3(c) is the fallback evidence. It is **not equivalent**: it proves what `translateText` would
  render, not what the inbox panel shows.
- The claim that the change is retroactive comes from reading the code (plan grounding). It was not seen
  running.

## 2026-09-28 — Owner ruling: no reword when `0322` ships (recorded by a spawned `fkit-producer`)

Append-only note, added at `fkit-lead`'s request during `fkit-sprint-ship-loop`. The ruling was given live in the
`fkit lead` session via `AskUserQuestion` and relayed by `fkit-lead` (ADR-021/037).

- **Question:** *"0316 reword: 0322 is done in code (not yet deployed). Today's approve message is en: "Your new
  display name '{name}' has been approved." / ru: "Ваше новое имя «{name}» одобрено." What now?"*
- **Owner's answer, verbatim:** **"Keep the short text"** — option text: *"No reword. The current text is true and
  never goes stale."*
- **Effect:** supersedes the earlier Q2 ruling *"Once, when 0322 ships"*. The approve message stays as shipped
  above. No reword task is filed. `0322`'s brief and the Sprint 6 board carry matching dated notes.
