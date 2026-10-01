# Block names made of invisible characters, and warn the moderator about look-alike names

## ID
0365

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**Filed 2026-10-01 by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER RULING given live in
the `fkit lead` session via `AskUserQuestion` on 2026-10-01, relayed by `fkit-lead`.** ⛔ Not producer precedent.
Verbatim choice: **"New task for the 2 safety parts (Recommended)"** — option text: *"Producer files one small backlog
task: block invisible-character names + warn the moderator about look-alike names. The nice-to-have parts are dropped.
Architect fixes ADR-115's 'revisited in 0308' line."* **Not urgent.** Filed on the Backlog board, unranked.

**Where it came from.** Cancelled task
[`0308`](../../cancelled/0308-player-name-loses-its-space-find-where-and-decide-which-characters-a-name-may-contain/brief.md)
(the "lost space" report — not reproduced, cancelled 2026-10-01). Its approved plan carried two **safety** items that
have nothing to do with the lost space, and that no other task covers now:

- **(a) Names made of invisible characters.** From the `0307` security review
  ([report](../../../knowledge-base/reports/2026-09-26-0307-player-name-path-security-review.md), findings rows **9**
  and **15**; [`0307` task](../../done/0307-security-review-of-every-player-name-path-injection-and-validation/brief.md)).
  Both were handed to `0308`.
- **(b) Look-alike names.** Owner ruling **R2, 2026-09-29** — *"Warn the moderator (Recommended)"* — the answer to
  `0317`'s question **D6** (*"Keep accepting, revisit in 0308"*;
  [`0317` report](../../../knowledge-base/reports/2026-09-27-0317-approved-name-in-matches.md),
  [ADR-115](../../../knowledge-base/decisions/adr-115-approved-name-in-matches-runs-at-adr-103-trust-level.md) D6).
  R2 is recorded verbatim in `0308`'s brief (*Addendum 2026-09-29, later*) and `plan.md` (*Owner rulings 2026-09-29*).
  Since `0322`, an approved name is shown to **other players in matches**, which is exactly the "re-raise" condition
  `0307` attached to its look-alike residual (Q2).

⚠️ **`0308`'s plan and its owner rulings are prior analysis only — their approval does NOT carry over.** `0308`'s
rulings Q1–Q4 / R1 / R3 / R4 were given for `0308`'s scope, which is cancelled. **R2 is the one ruling this task
builds on**, because the owner's 2026-10-01 ruling names it ("warn the moderator about look-alike names"). Anything
else this task needs is re-asked.

### What is true today — checked 2026-10-01 against the working tree (HEAD `05c3cfa`), by reading the code and running the rule with `tsx`

**(a) Invisible names.** The shared rule `validUsernamePattern` (`src/core/validations/usernameRules.ts:27`,
`^[\p{L}\p{N}_[\]\s]+$`) admits two kinds of invisible character:

- The four **Hangul filler letters** U+115F, U+1160, U+3164, U+FFA0 — Unicode files them as letters (`\p{L}`), but
  they draw as nothing.
- **U+FEFF** (zero-width no-break space), because JavaScript's `\s` includes it.

Measured with the real code:

| Name (shape) | Rule | Join check (`JoinUsernameSchema`) | `sanitizeUsernameForJoin` output |
|---|---|---|---|
| three × U+3164 (looks blank) | passes | **accepted** | unchanged — still blank |
| three × U+FFA0 / three × U+115F | passes | **accepted** | unchanged — still blank |
| `A` + two × U+3164 (looks like `A`) | passes | **accepted** | unchanged |
| three × U+FEFF | passes | refused (`trim` removes it → too short) | `xxx` |
| three × NBSP / three × U+3000 | passes | refused (`trim` → too short) | `xxx` |
| three × U+200B (zero-width space) | refused (`invalid_chars`) | refused | `xxx` |

So a **fully blank-looking name passes the join check and the name-change request check today**, and the in-match
cleaner (`sanitizeUsername`, run on every name by `PlayerImpl.ts:118`) keeps it. A U+FEFF **inside** a visible name
(e.g. between two letters) also passes, because `trim` only removes it at the edges. The moderator already **sees**
all of these as `⟨U+…⟩` codes with a warning line (`0307` F3 + review R1, `PLAIN_NAME_CHARACTER`,
`src/profile-server/NameChangeRepository.ts:763-764`) — that is a display fix only; nothing refuses them.

**(b) Look-alikes.** A name-change request is refused only if `lower(name)` equals another player's approved name
(`NAME_TAKEN_SQL`, `NameChangeRepository.ts:144-148`). A name using a Cyrillic `а` for a Latin `a`, full-width
letters, or a mix of alphabets passes and reaches the moderator with **no hint** that it copies someone. Pinned by
`tests/integration/NameChange.it.test.ts:496` ("pins today's uniqueness: a Cyrillic look-alike of a held name is
accepted") — that test **stays green** under this task: part (b) only warns, it never refuses.

### ⚠️ HAZARD for part (a) — the rule file is shared (same hazard as `0360`)

`src/core/validations/usernameRules.ts` is used by:

- the **join check** — `JoinUsernameSchema`, `src/core/Schemas.ts:255-260` (game server);
- the **name input** — `UsernameInput.ts:147`, `:344`, and `sanitizeUsernameForJoin` at `:85`, `:401` (client);
- the **name-change request** — `NameChangeRepository.requestNameChange`, `:313` (profile server);
- the **in-match cleaner** — `sanitizeUsername`, `PlayerImpl.ts:118` (every client);
- since `0322`, the game server's **approved-name re-check** (`GameServer.checkedApprovedName` /
  `matchDisplayName`, via `JoinUsernameSchema`), and since `0321` the client's `UsernameInput.applyApprovedName`.

**Contract the plan must keep:** `sanitizeUsername` and `sanitizeUsernameForJoin` must **always** output a name that
passes the rule (and, for the join variant, equals its own trim) — for every input, including invisible-only input.
Generated names (`Anon####`), nation names and bot names must still pass. `tests/UsernameHostileInputs.test.ts`'s
property tests pin this; they must keep passing, and grow.

### What the owner DROPPED on 2026-10-01 — do not re-add silently

These were in `0308`'s approved plan. The owner's ruling drops them (*"The nice-to-have parts are dropped"*). **Do not
build them under this task.** If the build seems to need one, stop and ask.

- **Odd-space normalization** — turning tab, newline, NBSP, U+2028/U+2029, U+3000 and similar into a plain space,
  and collapsing double spaces (`0308` plan step 3.1, ruling Q2). These **stay allowed exactly as today** inside a
  name; the moderator keeps seeing them as `⟨U+…⟩` codes.
- **Replace-instead-of-delete** — the cleaner turning a refused visible character (emoji, `!`, `@`…) into a space
  instead of deleting it (`0308` ruling Q3). The cleaner keeps **deleting** refused characters, as today.
- **Card cleaning of the Yandex name** — cleaning the raw Yandex `getName()` before the citizenship card shows it
  (`0308` ruling Q4, `PlayerProfileView.ts`). The card keeps showing it raw.
- Also not here (other tasks own them): allowing `-` `'` `’` `.` (`0364`); refusing "Anon + digits" names (`0360`);
  Unicode NFC joining of split accents (`0308` step 3.1 — not a safety item, dropped with it); a stored
  "look-alike key" column / auto-refusal (`0308` option **B**, not chosen in R2).

## What to build

Two parts. Each can be built, tested and deployed **on its own** — (a) touches the shared rule (game + profile
server), (b) touches only the profile server's Telegram text. Build either first; ship them as separate commits so one
can go out without the other.

**Plan step first:** settle the open questions below with the owner at the plan gate, then build.

### Part (a) — refuse names made of invisible characters

1. **The rule refuses invisible characters.** "Invisible" = Unicode `Default_Ignorable_Code_Point` — today that covers
   the four Hangul fillers, U+FEFF, the zero-width characters and the soft hyphen. This is the same set
   `PLAIN_NAME_CHARACTER` already treats as hidden (`0307` R1), so the moderator view and the rule agree. Applies
   wherever the shared rule applies: **join** and **name-change request** (and the name input, which uses it).
   Whether an invisible character **inside** an otherwise visible name is also refused, or only names with no visible
   character at all, is open question 1.
2. **The cleaners delete invisible characters.** `sanitizeUsername` / `sanitizeUsernameForJoin` keep their contract:
   an invisible-only name cleans to the usual padded fallback (`xxx`-style), never to a blank-looking name. Deleting
   is what the cleaner already does with any refused character — no new "replace" behaviour (dropped above).
3. **Error text.** A refused name reuses the existing `username.invalid_chars` message unless the plan shows that is
   misleading; if any text changes, **`en.json` and `ru.json` together**.
4. **Existing stored names (read-only check).** Before shipping, one read-only query on the profile box printing
   **counts only, never names**: how many **approved** names and **pending** requests contain an invisible character.
   Zero ⇒ nothing more. Non-zero ⇒ stop and ask the owner (an approved name that fails the new rule would fall back to
   the typed name in matches via `0322`'s re-check, and would no longer lock on the start screen via `0321`).
5. **Deploy-window risk, stated in the plan.** An old cached client whose stored name is invisible-only could be
   refused at join by a new server until the page reloads. The plan states whether that is acceptable (`0307` accepted
   the same kind of short window) or how it is avoided. Deploy order of the two images (profile server / game) is the
   plan's call, with the reason.

### Part (b) — warn the moderator about look-alike names (owner ruling R2: warn only)

1. **A look-alike comparison key**, used only for comparing, never stored and never shown: NFKC + lowercase + a small
   Latin / Cyrillic / Greek look-alike map (e.g. Cyrillic `а`→`a`, `о`→`o`, `е`→`e`, `р`→`p`, `с`→`c`; Greek `ο`→`o`)
   — and it ignores invisible characters, so (b) works even if (a) has not shipped. A pure function in a shared,
   dependency-free place; the plan picks the file (not inside the rule itself).
2. **Two warning lines**, in the same style as the existing `⚠️` lines (`requestedNameLines`,
   `NameChangeRepository.ts:824-840`):
   - **"looks like an approved name"** — when the requested name's key equals the key of **another** player's
     approved name (the requester's own approved name excluded, as `NAME_TAKEN_SQL` does) but the names are not
     identical. Says which approved name it resembles, shown through `describeRequestedNameForModerator` (escaped,
     hidden characters made visible).
   - **"mixes alphabets"** — when the name's letters come from more than one of Latin / Cyrillic / Greek.
3. **Where:** the per-request Telegram notification (`buildOperatorNotificationText`) **and** the daily digest list
   (`formatPendingNameChangeList`, `src/profile-server/NameChangeDigest.ts`) — a short marker there, counted inside the
   list's length budget, like the existing `⚠️ hidden characters` / `⚠️ rude-name filter` markers.
4. **Never changes:** the stored name, the request outcome (no automatic refusal), the database schema (no migration,
   no new column), and the decide command lines (`decideCommandLines` / `buildDecideCommandBody`, whose
   `expectedName` binding must stay byte-identical).
5. The "looks like" check needs the approved names, which the pure message builders do not have today — the plan
   decides how (a read at notify / digest time; the approved set is small). A failed read must not fail the request or
   the digest — the message goes out without the line.

## Verification steps

**Part (a)**
1. **Before/after tests in `src/core/`** (core changes must be tested), failing on today's code: `checkUsernameRules`
   refuses three × U+3164, three × U+FFA0, three × U+115F and `A` + two × U+3164 with `invalid_chars`;
   `JoinUsernameSchema` refuses the same inputs. Per open question 1, a U+FEFF between two letters is refused (or
   pinned as still accepted).
2. **Cleaner contract:** `sanitizeUsername` and `sanitizeUsernameForJoin` on every input above output a name that
   passes the rule and contains no invisible character; the existing property tests in
   `tests/UsernameHostileInputs.test.ts` still pass, with invisible characters added to their generators.
3. **Nothing else moved:** `Anon####`, a plain Cyrillic name, a plain Latin name, `[TAG] Name`, and names with
   tab / NBSP / U+3000 inside (dropped normalization) give **the same** result as before. The characterization tests
   that pin today's whitespace behaviour stay green except where a case is invisible.
4. **Profile server:** `tests/profile-server/NameChangeRepository.test.ts` — a request for an invisible-only name
   returns `invalid` / `invalid_chars` and writes no row.
5. **Legacy count** (step 4 of the build) recorded in `worklog.md` as numbers only.

**Part (b)**
6. **Key tests:** Cyrillic-`а` vs Latin-`a` versions of one name get the same key; full-width letters fold;
   a plain Russian name and a plain English name do **not** get the "mixes alphabets" line; a mixed one does.
7. **Message tests:** the per-request text shows "looks like an approved name" when another player holds a look-alike
   approved name, and **not** for the requester's own approved name or for no match; the digest shows its marker and
   still respects its length budget; the existing size / HTML-validity tests (`0312`) pass; the decide command lines
   are byte-identical to before (test).
8. **No database change:** the diff adds no migration file.

**Both**
9. `npm test`, `npx tsc --noEmit`, `npm run lint` pass. If the profile-server suites hit the known `supertest` flake
   (CLAUDE.md), re-run and say so. `npm run test:integration` if `NameChange.it.test.ts` is touched (say so if the
   local Postgres container was not up).
10. **Live check (after the weekend deploy):** a test name request with a look-alike name produces the warning line in
    the Name Changes Telegram topic; a blank-looking name is refused on the card. Per the build-vs-verify rule, close
    the build and file a separate verify task at the top of the next sprint if this needs the owner.

## Open questions — for the owner, at the plan step (producer's recommendation marked)

1. **(a) An invisible character inside a normal-looking name** (e.g. a zero-width character between two letters, so
   the name looks like an existing one):
   - **Refuse it too. Recommended** — the same one-line rule covers both cases, and a hidden character inside a name is
     exactly how a copy of another player's name is made to look identical. A real player never types one.
   - Refuse only names with no visible character at all — narrower; hidden-inside names keep passing (the moderator
     still sees them as `⟨U+…⟩` codes).
   - Explain more, then ask again.
2. **(b) Also compare against other players' *pending* requests, not just approved names?**
   - **Approved names only. Recommended** — that is what R2 asked for, and pending requests already all pass through
     the moderator's own eyes in the digest.
   - Approved and pending.
   - Explain more, then ask again.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing
- **Prior analysis (approval does not carry over):** cancelled
  [`0308`](../../cancelled/0308-player-name-loses-its-space-find-where-and-decide-which-characters-a-name-may-contain/brief.md)
  — its [`plan.md`](../../cancelled/0308-player-name-loses-its-space-find-where-and-decide-which-characters-a-name-may-contain/plan.md)
  (step 3, the *Refresh 2026-09-29* section, the look-alike conflict section) and
  [`worklog.md`](../../cancelled/0308-player-name-loses-its-space-find-where-and-decide-which-characters-a-name-may-contain/worklog.md);
  the [`0307` report](../../../knowledge-base/reports/2026-09-26-0307-player-name-path-security-review.md) (rows 9, 10,
  15; residual Q2); the [`0317` report](../../../knowledge-base/reports/2026-09-27-0317-approved-name-in-matches.md)
  (D6).
- **Soft relations (sequence, not dependencies):**
  - `0360` (refuse "Anon + digits" requests) — same request path and the same shared-rule hazard; its check must not
    go in `usernameRules.ts`. Whichever lands second re-checks the other's tests.
  - `0364` (hyphens and apostrophes in matches) — if it widens the shared rule (its option B), the cleaner contract and
    the "mixes alphabets" test set here must be re-run against the new characters.
  - `0361` (Telegram confirmation when a name change is decided) — same Name Changes Telegram surface as part (b);
    keep message styles consistent, and whichever lands second rebases onto the other's message tests.
- **ADR-115** says look-alikes are *"Revisited in `0308`"* (D1/D6 consequence). Per the owner's 2026-10-01 ruling,
  `fkit-architect` corrects that line to point here — not this task's job.
- No real player names are recorded here; every example is a character shape.
- Size: small — two independent parts; (a) one rule change plus tests, (b) one pure key function, two message lines
  and a read of approved names.
