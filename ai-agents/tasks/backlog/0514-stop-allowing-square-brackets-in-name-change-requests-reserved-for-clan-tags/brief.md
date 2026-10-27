# Stop allowing square brackets `[ ]` in name-change requests — they are reserved for future clan tags

## ID
0514

> ℹ️ **ID allocation, checked 2026-10-27 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/`
> (folder names and `## ID` fields agree, base-10 arithmetic) was `0513`. `0514`: no task folder and no reference in
> `ai-agents/tasks/`, `ai-agents/sprints/` or `.claude/`.

## Sprint
Backlog

> 📌 **Filed on an OWNER REQUEST of 2026-10-27**, typed in the `fkit-lead` Claude Code session (with a screenshot of
> the name-change hint «От 3 до 27 символов: буквы, цифры, пробелы, _ и [ ].»), relayed by `fkit-lead` to a spawned
> `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Owner, verbatim: *"small side note -
> brief a task to the backlog - we need to remove the mentions of [] brackets from the text and we need to NOT ALLOW
> them now for any name change requests: the reason is that in the future when we start working on clans, this [XXX]
> system will be used for the clans, and we need to be sure users can't mess with it."* No sprint named → Backlog
> board, unscheduled.

## Priority
Unscheduled

(Backlog board, unranked by design — the Priority cell stays `—`.)

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**In plain terms.** Today a citizen can ask for a new name that contains square brackets, for example `[ABC]Mark`,
and the name-change hint even says brackets are allowed. When clans arrive, a tag in brackets (`[XXX]`) will mean
"member of clan XXX", and only a clan's owner will set it (owner, clans talk `0479`). So players must not be able to
put brackets into their name through a name change now — otherwise they could fake a clan tag later. The hint text
must stop advertising brackets too.

**Where the rule lives today (to confirm against the code):**

- **The shared name rule:** `validUsernamePattern` in `src/core/validations/usernameRules.ts` (letters, digits, `_`,
  `[`, `]`, whitespace), used through `checkUsernameRules` and `sanitizeUsername`. It is **shared by many paths**, not
  only name change:
  - the profile server's name-change request — `NameChangeRepository.requestNameChange`
    (`src/profile-server/NameChangeRepository.ts`, ~line 313);
  - the citizenship card's name-change form (`src/client/CitizenshipCard.ts` — hint ~line 993, error ~line 1266);
  - the in-game name box `username-input` (`src/client/UsernameInput.ts` — check ~lines 147, 343; hint ~line 307;
    `sanitizeUsernameForJoin` ~lines 85, 400), used for matches and feedback;
  - the server's **join check** `JoinUsernameSchema` (`src/core/Schemas.ts`, ~line 268) — a name that fails the rule
    is refused at join with a 1002 close;
  - `sanitizeUsername` on **every in-game name** in `PlayerImpl` (`src/core/game/PlayerImpl.ts`, ~line 118).
- **The texts:** `username.rules_hint` and `username.invalid_chars` in `resources/lang/en.json` and `ru.json` (en
  ~lines 393–394, ru ~397–398) — **both** mention brackets. The hint is built by `usernameRulesHint()` in
  `src/core/validations/username.ts` and is shown on **both** the card and the in-game name box.
- **Today's clan-tag reading:** `getClanTag` in `src/core/Util.ts` (~line 329: `[` + 2–5 letters/digits + `]`) feeds
  `PlayerInfo.clan` (`src/core/game/Game.ts`, ~line 421) → team grouping in `src/core/game/TeamAssignment.ts`, and is
  written to the game record as `clanTag` (`src/server/GameServer.ts` ~line 1296, `src/client/LocalServer.ts`
  ~line 286). Whether this works live today is the open check [`0487`](../0487-check-whether-a-clan-tag-in-a-name-puts-players-on-one-team-in-live-team-matches-today/brief.md).
- No other doc in `ai-agents/knowledge-base/` describes the allowed character set (searched 2026-10-27); the wiki
  pages `wiki/tasks/clans-talk.md` and `wiki/systems/clans.md` mention brackets only as the clan-tag mechanism.

> ⚠️ **Conflict 1 — changing the shared rule decides `0487` without the owner.** If brackets are removed from
> `validUsernamePattern` itself, `sanitizeUsername` strips them from **every** in-game name, so today's `[ABC]` team
> grouping stops working everywhere. On `0487` the owner ruled *"Check first, then decide. But if this logic is
> already there, we might reuse it in the future"* — that check has not run. The plan must say which way it goes and
> the owner rules on it at plan approval (open question 1).
>
> ⚠️ **Conflict 2 — a name-change-only rule departs from task `0067`'s owner ruling (c)**: *"reuse the existing
> validator, do not re-implement it"* (see the header of `usernameRules.ts` and the comment at `CitizenshipCard.ts`
> ~line 1262, *"no bespoke rules"*). The Backlog task [`0360`](../0360-refuse-name-change-requests-that-look-like-the-default-guest-name/brief.md)
> already plans a name-change-only rule for the same reason (the shared rule would break the game's own `Anon####`
> names at join). Either option breaks one earlier decision — the owner picks which (open question 1).
>
> ⚠️ **Join-check hazard if the shared rule changes.** `JoinUsernameSchema` would start refusing any join whose name
> holds a bracket — for example a player whose stored or typed name is `[ABC]Mark`, or an old cached client. The
> plan must show this cannot lock anyone out of matches (or keep the join check as it is).

**Two deploy units.** The refusal lives on the **profile server** (own image, own box); the card, the in-game box and
the texts ship with the **game client**. They deploy separately. The plan must work in either deploy order and must
say what an old client shows when the new server refuses a bracket name (today the card maps `invalid` →
`usernameRuleErrorMessage(violation)`, whose `invalid_chars` text currently says brackets **are** allowed).

## What to build

The plan decides *how*; the owner rules on the open questions below at plan approval.

1. **Refuse brackets in new name-change requests, on the server.** The profile server's name-change request refuses
   any requested name containing `[` or `]` — this is the real protection, because a request can be sent without the
   card. Decide (open question 1) whether this is a change to the shared rule or a name-change-only rule.
2. **Refuse them on the card too**, before sending, with a clear message — the same rule as the server, so the two
   cannot disagree.
3. **Remove brackets from the texts** — `username.rules_hint` and `username.invalid_chars` in **both** `en.json` and
   `ru.json` (other languages not needed, per project rule). If the in-game name box still allows brackets (open
   question 2), the plan says which text each place shows so no text is false.
4. **Tests** — `src/core` changes MUST be tested. Cover at least: a bracket name refused by the name-change request
   (server), accepted-before/refused-now examples (`[ABC]Mark`, `Mark]`, `[`), names without brackets still accepted,
   and `tests/UsernameHostileInputs.test.ts`'s guarantees still holding (`sanitizeUsername` output always passes the
   rule it is paired with).
5. **Keep the clan-tag logic reusable.** Do not delete or rewrite `getClanTag` / `TeamAssignment` — owner on `0487`:
   *"we might reuse it in the future"*.

### Open questions — for the owner at plan approval (the plan lists them; it does not decide them)

1. **Where does the ban live?** (a) **Name-change path only** — the shared rule stays; departs from `0067` ruling (c),
   like `0360`; today's in-game `[ABC]` tags keep working until `0487` reports. (b) **The shared rule** — brackets
   gone everywhere at once; decides `0487` before its check; join-check hazard above; existing in-game names lose
   their brackets.
2. **The in-game name box (`username-input`).** Guest and Yandex-supplied names, and `Anon####`, go through it for
   matches and feedback. Should it also refuse brackets now, or keep them until `0487` and the clan design decide?
   Note: a player could otherwise still *show* `[XXX]` in matches by typing it there — the owner's "users can't mess
   with it" may or may not cover this.
3. **Names that already contain brackets:**
   - **Approved names** (`players.display_name`) — leave them, or clean them / ask those players to rename?
   - **Pending requests** (`player_name_history`, `moderation_status = 'pending'`) — reject them, leave them for the
     moderator to decide by hand, or have `name-change:review` / `name-change:decide` refuse to approve them?
   - Does the approve step re-check the rule at all today (`src/profile-server/decideNameChange.ts`,
     `src/profile-server/reviewNameChanges.ts`)? The plan should find out.
4. **How many are affected?** The plan hands the owner a **read-only, counts-only** query to run on the profile
   database: how many `players.display_name` and how many pending `player_name_history.new_display_name` contain `[`
   or `]`. Counts only — no names, no IDs, no connection string in any file. The owner runs it (agent SSH to the
   boxes was denied by the permission classifier on 2026-10-13).
5. **Message wording** for a refused bracket name (en + ru) — reuse `invalid_chars` without brackets, or a separate
   message that says brackets are reserved for clans?

## Verification steps

1. `npm test -- tests/UsernameHostileInputs.test.ts` and the name-change repository / route suites under
   `tests/profile-server/` pass, with new cases: `[ABC]Mark`, `Mark]` and `[` are **refused** by the name-change
   request; `Mark_1`, `Марк 2` are **accepted**.
2. Full `npm test` is green (through the npm script, per CLAUDE.md; judge a single `Exceeded timeout of 5000 ms` by the
   supertest-flake rule).
3. `resources/lang/en.json` and `ru.json`: neither `username.rules_hint` nor `username.invalid_chars` mentions
   brackets (`grep -n "\[ \]\|square brackets\|квадратные скобки" resources/lang/en.json resources/lang/ru.json`
   finds nothing in those two keys).
4. Local run (`npm run dev` with a local profile server): on the citizenship card, typing `[ABC]Mark` shows the
   refusal before sending; the hint line no longer lists `[ ]`. A request sent straight to the name-change route with
   `[ABC]Mark` (bypassing the card) is refused by the server and **no** row is added to `player_name_history`.
5. Whatever open question 1 and 2 decided, shown by a test or a local run: if the shared rule did **not** change, a
   guest named `[ABC]Mark` can still join a match; if it **did** change, the plan's join-check answer is shown to hold
   (no lockout).
6. `getClanTag` and `src/core/game/TeamAssignment.ts` are unchanged unless the owner ruled otherwise
   (`git diff --stat -- src/core/Util.ts src/core/game/TeamAssignment.ts`).
7. The owner's answers to open questions 1–5 and the count query's result (counts only) are recorded, dated, in this
   folder's `worklog.md`.
8. Build vs verify: the live check after the deploy (game client + profile server) is a separate verify task at the
   top of the next sprint (standing owner rule).

## Notes

- **Depends on:** nothing
- **Blocks:** nothing
- **Related — clans:** [`0479`](../../done/0479-discussion-clans-what-is-free-what-is-sold-prices-and-outcome/brief.md)
  (clans talk, outcome Park, 2026-10-24 — tags belong to the clan system, only the clan owner changes a tag);
  [`0487`](../0487-check-whether-a-clan-tag-in-a-name-puts-players-on-one-team-in-live-team-matches-today/brief.md)
  (read-only check: does today's `[ABC]` tag group players live — open conflict 1 above);
  [`0152`](../../done/0152-investigate-clans-system/brief.md) (earlier clans investigation); wiki
  `wiki/tasks/clans-talk.md`, `wiki/systems/clans.md`.
- **Related — name rules and name change:** [`0067`](../../done/0067-name-change-citizens-only/brief.md) (name change,
  ruling (c) — shared validator); [`0307`](../../done/0307-security-review-of-every-player-name-path-injection-and-validation/brief.md)
  (security review of every name path, owner of the hint text); [`0308`](../../cancelled/0308-player-name-loses-its-space-find-where-and-decide-which-characters-a-name-may-contain/brief.md)
  (cancelled — which characters a name may contain); [`0350`](../../done/0350-name-change-moderation-without-copy-and-paste/brief.md)
  (moderation — `name-change:review` / `name-change:decide`).
- **Soft overlap — same files, not dependencies:** [`0360`](../0360-refuse-name-change-requests-that-look-like-the-default-guest-name/brief.md)
  (name-change-only refusal of `Anon` + digits — a natural place to share one name-change-only check),
  [`0364`](../0364-names-lose-hyphens-and-apostrophes-in-matches/brief.md) (which characters survive in matches),
  [`0365`](../0365-block-invisible-character-names-and-warn-the-moderator-about-look-alike-names/brief.md) (invisible
  names on join and name change). Whichever ships first, the next re-reads `usernameRules.ts`.
- **Why one brief, not a split:** the server refusal and the card/text change are two deploy units, but shipping the
  refusal alone would show players an error whose text still says brackets are allowed, and shipping the card alone
  leaves the bypass open. They are one user-visible behaviour; the plan sequences the two deploys.
- **No secrets:** the count query goes in the worklog as a query and its counts — never a connection string, host or
  credential.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
