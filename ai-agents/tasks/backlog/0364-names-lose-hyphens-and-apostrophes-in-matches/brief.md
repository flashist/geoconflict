# Names lose hyphens and apostrophes in matches (a nation "Morti-Stele" shows as "MortiStele")

## ID
0364

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
Verbatim choice: **"Cancel it, file hyphen task (Recommended)"** — option text: *"Producer cancels 0308 as 'not
reproduced — Yandex sends a normal space', and files a small backlog task for the in-match cleaner that deletes '-'
and apostrophes. The finding is saved in 0308's worklog first."* **Not urgent.** Filed on the Backlog board, unranked.

**Where it came from.** Cancelled task
[`0308`](../../cancelled/0308-player-name-loses-its-space-find-where-and-decide-which-characters-a-name-may-contain/brief.md)
(the "lost space" report — not reproduced). While planning it, the coder found that names in a match lose `-` and
`'`. Its [`plan.md`](../../cancelled/0308-player-name-loses-its-space-find-where-and-decide-which-characters-a-name-may-contain/plan.md)
is **prior analysis** for this task: the "second, separate cleaner" finding, its step 3 single-pipeline proposal, and
owner question Q1 (allow `-`, `'`, `’`, `.`). ⚠️ **That plan's approval, and its owner rulings Q1–Q4 / R1–R4, do NOT
carry over** — they were given for `0308`'s scope, which is cancelled. Re-ask anything this task needs.

### ⚠️ Correction to the relayed framing — the cause is the shared name rule, not only `sanitize()`

The request named the in-match cleaner `sanitize()` (`src/core/Util.ts:173`, body `:173–177`). The producer re-checked
against the working tree on 2026-10-01 (HEAD `05c3cfa`) by **reading the code and running both cleaners with `tsx`**:

| Input | `sanitize()` | `sanitizeUsername()` | Name rule (`checkUsernameRules`) |
|---|---|---|---|
| `Morti-Stele H` | `MortiStele H` | `MortiStele H` | refused (`invalid_chars`) |
| `O'Neil` | `ONeil` | `ONeil` | refused (`invalid_chars`) |

- **Two cleaners delete `-` and `'`, not one.** `sanitize()` does, and so does `sanitizeUsername()`
  (`src/core/validations/usernameRules.ts:78`), because the shared name rule `validUsernamePattern`
  (`usernameRules.ts:27`, letters, digits, `_`, `[`, `]`, whitespace) does not allow them.
  `PlayerImpl` runs `sanitizeUsername` on **every** in-game name (`src/core/game/PlayerImpl.ts:118`).
- **So fixing or removing `sanitize()` alone changes nothing visible.** `sanitize()` removes nothing that
  `sanitizeUsername` would keep — it is redundant, not the cause.
- **Who is actually hit, by path:**
  - **Nations** (map manifests, `PlayerType.FakeHuman`): built at `src/core/GameRunner.ts` (the nations block below
    `:76`, `` `${n.name} ${difficultyLabel}` ``) — they do **not** pass `sanitize()`, only `PlayerImpl`'s
    `sanitizeUsername`. Producer count: **6** hyphenated nation-name entries across 4 map manifests (oceania,
    montreal, gatewaytotheatlantic, giantworldmap); the relayed count was 7 — the plan recounts. No apostrophes
    found in nation names.
  - **Bots** (`BotSpawner.ts:55–57`, from `src/core/execution/utils/BotNames.ts`, 2 hyphenated entries:
    `Nemka-Rnubo`, `Gloan-Xonsa`): `PlayerImpl`'s `sanitizeUsername` only → hyphen deleted in match.
    ⚠️ The same `BotNames.ts` list also feeds `createRandomName` (`src/core/Util.ts:279`) for the **"anonymous
    names" setting** (`src/core/game/GameView.ts:205`), which goes through **neither** cleaner — so that display
    very likely keeps the hyphen. Read, not run.
  - **Human players** (`GameRunner.ts:62` own name, `:63` others via `fixProfaneUsername`): both cleaners. But a
    human **cannot reach a match with `-` or `'` today** — the join check (`JoinUsernameSchema`, `src/core/Schemas.ts`)
    refuses them, and the name input cleans them out first. So for players this is a **rule** question, not a
    cleaner bug.
  - **AI players** (`GameRunner.ts:73`): both cleaners; source of their names not traced here.
- **Callers of `sanitize()`:** `GameRunner.ts:62`, `:63`, `:73` (import `:36`). Also imported by the test
  `tests/core/ApprovedNameInvariants.test.ts` (from `0322`), and named in a comment in
  `src/profile-server/NameChangeRepository.ts` — any removal must update both.

### Why the player-name side is not small

`usernameRules.ts` is **shared** by the client, the game server and the profile server. Allowing `-` / `'` for
**players** means: the profile server's name-change check, the join check and the name input all change; the
`0307` security review's hops must be re-checked for the new characters (e.g. its findings row 1, "Operator's
curl line is shell-safe only because the rule refuses `'`" — fixed by F2, but to be re-proved; report
`ai-agents/knowledge-base/reports/2026-09-26-0307-player-name-path-security-review.md`); en + ru rule texts change (and `'`
is ICU MessageFormat's escape character); and the **profile server must deploy before the game** or new clients get
refusals. `0308`'s plan covers all of this in detail. That is why this task recommends the nation/bot-only route
first — see the open question.

**Soft relation:** [`0360`](../0360-refuse-name-change-requests-that-look-like-the-default-guest-name/brief.md)
(refuse "Anon + digits" names) touches the same rules area and must not put its check in `usernameRules.ts`. If this
task widens the player-name rule, `0360`'s separator matching must be re-checked against it.

## What to build

**Plan step first: settle the open question below with the owner. Then build only the chosen option.**

- **Option A (recommended) — names the game itself supplies keep their hyphen; player names unchanged.**
  Nation names (from our own map files) and bot names (from `BotNames.ts`) are trusted, fixed strings. Give them an
  in-match path that keeps `-` (and `'`, for future map data), while **player** names still go through today's rule
  exactly as now. The plan decides the mechanism (e.g. by player type at the point the name is cleaned), keeping the
  output safe for every place a name is shown (`NameLayer` uses `textContent`; events/chat go through DOMPurify).
  Remove or keep the redundant `sanitize()` — plan's call; if removed, update `ApprovedNameInvariants.test.ts` and the
  `NameChangeRepository.ts` comment.
- **Option B — widen the shared rule to allow `-` and `'` (and possibly `’`, `.`) for everyone.** Follows `0308`
  plan step 3. If the owner picks this, **stop and hand back to the producer to re-scope before building** — it is a
  multi-part change (shared rule, profile server, client texts, security re-check, deploy order) that should be split
  into separately shippable briefs, not built under this one.

**Out of scope:** the "lost space" question (cancelled with `0308`); whitespace normalization, invisible characters,
Hangul filler letters, the look-alike moderator warning (all were `0308` scope; with `0308` cancelled they have no
task — raised to the owner as an open question on 2026-10-01, not decided here); any change to already-approved names.

## Verification steps

1. **Before/after test in `src/core/`** (core changes must be tested): a game started with a hyphenated nation name
   (shape of `Morti-Stele`) and a hyphenated bot name shows them **with** the hyphen in `PlayerImpl.name()`; the test
   fails on today's code.
2. **Player names unchanged (Option A):** a test proves a human player's `-` / `'` is still removed in match, and
   `checkUsernameRules("Ab-Cd")` still returns `invalid_chars` — the rule did not move.
3. **No unsafe character gets through:** a nation/bot name carrying `<`, `>`, `"` or a backtick is still cleaned
   (test), so the new path is not an injection door if map data is ever wrong.
4. **Determinism:** every client derives the same in-match name (the name is not part of `PlayerImpl.hash()`; the
   plan confirms that is still true).
5. `npm test`, `npx tsc --noEmit`, `npm run lint` pass.
6. **Live check (after the weekend deploy):** on a map with a hyphenated nation (e.g. the Oceania map), the nation's
   name above its territory shows the hyphen. Per the build-vs-verify rule, close the build and file a separate
   verify task at the top of the next sprint if this needs the owner.

## Open questions — for the owner, at the plan step (producer's recommendation marked)

1. **Who gets to keep `-` and `'`?**
   - **A — only names the game supplies (nations and bots). Recommended.** Small, touches only the game, needs no
     profile-server deploy and no security re-review, and fixes every case actually seen (all are nation/bot names —
     no player can have `-` today). Players stay as they are.
   - **B — everyone, players included** (what the owner chose for `0308` on 2026-09-27, Q1 "Hyphen, apostrophe, dot").
     Bigger: shared rule, profile server first, en/ru texts, security re-check. Would be re-scoped and split before
     building.
   - Explain more, then ask again.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing
- **Prior analysis (approval does not carry over):** cancelled
  [`0308`](../../cancelled/0308-player-name-loses-its-space-find-where-and-decide-which-characters-a-name-may-contain/brief.md)
  — its `plan.md` and `worklog.md`.
- **Soft relation:** `0360` (same rules area; re-check if the player-name rule widens).
- **Related, done:** `0307` (security review of every name path — its hop list is what Option B must re-prove),
  `0322` (approved name in matches; owns `ApprovedNameInvariants.test.ts`).
- No real player names are recorded here; the examples are nation/bot names from the game's own data.
- Size: small under Option A.

**Addendum 2026-10-01 (append-only, spawned `fkit-producer` on an owner ruling relayed by `fkit-lead`; ⛔ not producer precedent):** the *Out of scope* line above saying invisible characters, Hangul filler letters and the look-alike moderator warning *"have no task"* is **stale** — [`0365`](../0365-block-invisible-character-names-and-warn-the-moderator-about-look-alike-names/brief.md) (filed 2026-10-01 on the owner's ruling *"New task for the 2 safety parts"*) now covers both; whitespace normalization stays dropped by the owner. They remain out of scope here.
