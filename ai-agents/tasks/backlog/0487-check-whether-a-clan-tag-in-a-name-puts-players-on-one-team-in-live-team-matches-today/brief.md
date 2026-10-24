# Check: does a `[ABC]` clan tag in a name really put players on one team in live team matches today — and is a clan's overflow player silently dropped?

## ID
0487

> ℹ️ **ID allocation, checked 2026-10-24 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/`
> (folder names and `## ID` fields agree, base-10 arithmetic) was `0486`. `0487`: no task folder and no reference in
> `ai-agents/tasks/`, `ai-agents/sprints/` or `.claude/`.

## Sprint
Backlog

> 📌 **Filed on OWNER RULINGS of 2026-10-24**, given live via `AskUserQuestion` in the lead's Claude Code session,
> relayed by `fkit-lead` (driving `/fkit-sprint-ship-loop` on Sprint 9) to a spawned `fkit-producer` with no owner
> channel (ADR-021/037); ⛔ not producer precedent. In the clans talk (`0479`), asked *"The code suggests [ABC] tags
> already group players in team matches today. What should we do?"*, the owner typed, verbatim: *"Check first, then
> decide. But if this logic is already there, we might reuse it in the future, when the current tags system is replaced
> with the new tags system."* `fkit-lead` asked for a small read-only check on the Backlog board. No sprint named →
> Backlog board, unscheduled.

## Priority
Unscheduled

(Backlog board, unranked by design — the Priority cell stays `—`.)

## Status
🔲 Backlog

## Owner
fkit-coder

This is a **read-only check, not a build.** Its output is findings for the owner. **No code change ships from this
task.**

## Context

**In plain terms.** A player can type a short tag in square brackets into their name — for example `[ABC]Mark`. The
code reads that tag and, in team matches, tries to put everyone with the same tag on the same team. Nobody has checked
whether this **actually happens in live games today**: the name may be cleaned up or replaced somewhere between the
player typing it and the match starting (name rules, the approved name), and the brackets may never reach the team
code. The owner wants to know before deciding anything.

**Why it matters now.** The clans talk [`0479`](../../done/0479-discussion-clans-what-is-free-what-is-sold-prices-and-outcome/brief.md)
ended in **Park** on 2026-10-24 ([worklog](../../done/0479-discussion-clans-what-is-free-what-is-sold-prices-and-outcome/worklog.md),
batch 2). The owner's direction for clans when they return: tags belong to the future clan system, and **only a clan's
owner can change its tag**. Owner, verbatim: *"I don't think we will enable tags anytime soon. The main purpose of them
is to "identify" yourself with a clan, but when we have clans, we will pland and design and use  the tags system there.
I don't think we will allow users to change the tags (only the owner of a clan will be able to do so)"*. So a tag any
player can type today does not fit that plan — **if** it works today. This check finds out; the owner then decides
whether to turn today's tags off or leave them.

> ⚠️ **Keep the logic reusable.** Owner, verbatim: *"if this logic is already there, we might reuse it in the future,
> when the current tags system is replaced with the new tags system."* This check changes nothing. Any later task that
> turns tags off must keep the grouping logic reusable for the future clan system — not delete it.

**What is known — start here, do not re-derive (each still to be confirmed against today's code):**

- **Tag reading:** `getClanTag` in `src/core/Util.ts` (~line 329) — `[` + 2–5 letters or digits + `]`, anywhere in
  the name, upper-cased. Called from the `PlayerInfo` constructor (`src/core/game/Game.ts`, ~line 421).
- **Team grouping:** `assignTeams` in `src/core/game/TeamAssignment.ts`, called only in Team mode from
  `GameImpl.addPlayers` (`src/core/game/GameImpl.ts`). Covered by `tests/TeamAssignment.test.ts`.
- **Overflow:** if a tag group is bigger than one team's size, the extra players get `"kicked"`, and
  `GameImpl.addPlayers` only does `console.warn(... was kicked from team)` and skips them (~line 173). The wiki
  (`ai-agents/wiki-vault/wiki/systems/clans.md`) calls this a silent drop with no message to the player — **an
  unverified wiki claim**.
- **Name rules:** the client's allowed-name pattern (`src/core/validations/usernameRules.ts`) appears to allow `[` and
  `]`. Other places that touch a name before the match: `src/core/validations/username.ts`, `src/client/UsernameInput.ts`,
  `src/server/Client.ts`, `src/server/GameServer.ts`, the approved name in matches
  ([ADR-115](../../../knowledge-base/decisions/adr-115-approved-name-in-matches-runs-at-adr-103-trust-level.md)) and
  name-change moderation ([`0350`](../../done/0350-name-change-moderation-without-copy-and-paste/brief.md)). Past name
  work: [`0307`](../../done/0307-security-review-of-every-player-name-path-injection-and-validation/brief.md) (security
  review of every name path) and [`0308`](../../cancelled/0308-player-name-loses-its-space-find-where-and-decide-which-characters-a-name-may-contain/brief.md)
  (cancelled — which characters a name may contain).
- **The tag is recorded per match:** `clanTag` is written to the game record (`src/server/GameServer.ts`, ~line 1296;
  `src/client/LocalServer.ts` for single player) — possible evidence of real use, if those records can be read.
- Earlier investigation: [`0152`](../../done/0152-investigate-clans-system/brief.md).

## What to build

**Nothing is built.** Answer each question with code references (`src/...:line`) and say what was checked and what was
not.

1. **Does the tag survive to the team code?** Follow a name from where the player types it (or where it comes from for
   a logged-in player — profile name, approved name) through the client, the server and into `PlayerInfo`. At each
   step: is the name changed, cleaned, cut or replaced, and do `[` `]` and the 2–5 characters survive? Cover a **guest**
   and a **logged-in player with an approved name** separately — they may take different paths. **Verdict:** tags reach
   team assignment / they do not / only for some players (say which).
2. **Does grouping happen in live team matches?** Which modes run `assignTeams` (Duos, Trios, Quads, any other team
   mode), and do private lobbies and public lobbies both go through it? If cheap, confirm with a local dev team match
   (two or more clients with the same tag). If live evidence is wanted — for example, counting recent team matches
   where two or more players share a `clanTag` in the game records — say where the data lives and give the read-only
   commands; if your session cannot reach it, hand them to the owner to run. **Verdict:** live today / not live / not
   provable from here (say why).
3. **The overflow drop.** When can a tag group be larger than one team (for example, three friends with the same tag
   in a Duos match)? Is that reachable with today's lobby sizes and team counts? What does the dropped player actually
   see — a message, a spectator view, a match that never starts, nothing? Does the drop interact with nations or bots
   in Team mode (see [`0476`](../0476-investigate-team-game-lost-at-start-because-bot-team-won/brief.md), a team-match
   complaint, as context only)? **Verdict:** the wiki claim holds / does not hold / partly.
4. **Options for the owner (no decision).** In plain words, list what the owner could do next: leave tags as they are,
   turn them off, or fix the overflow only — each with its rough size and **how it keeps the grouping logic reusable**
   (owner's note above). Do not recommend removing code.

## Verification steps

1. A findings report exists at `ai-agents/knowledge-base/reports/<date>-0487-<slug>.md`, and this folder's `worklog.md`
   links it.
2. Question 1 traces the name path for a guest and for a logged-in player with an approved name, each step with a
   `src/...` reference, and states one verdict.
3. Question 2 states one verdict and says plainly what was checked (code / local run / live data) and what was not.
4. Question 3 states one verdict on the wiki's "silently dropped" claim, with the code checked and, if it is reachable,
   the smallest example (team mode, lobby size, how many same-tag players).
5. Question 4 lists the options, each keeping the grouping logic reusable.
6. The findings are returned to the owner, and the owner's decision (turn tags off, leave them, or other) is recorded,
   dated, in this folder's `worklog.md` — or the worklog says it is still pending.
7. No source code changed (`git diff --stat -- src/` shows nothing from this task).

## Notes

- **Depends on:** nothing
- **Blocks:** nothing
- **From:** [`0479`](../../done/0479-discussion-clans-what-is-free-what-is-sold-prices-and-outcome/brief.md) (clans talk,
  outcome Park, 2026-10-24) — its conflict 1 (the free tag) sent today's live behaviour to this check.
- **Carried from `0479`, to-discuss 5 — for the future clan design, not answered here:** clan names and tags need the
  same safety rules as player names (`0307`, `0308`) and possibly moderation. The owner answered part of it (only the
  clan owner changes a tag). This check's trace of today's name rules is the evidence that design will need; record
  anything relevant to it in the findings.
- **Related:** [`0476`](../0476-investigate-team-game-lost-at-start-because-bot-team-won/brief.md) (team-match
  complaint), wiki `systems/clans.md`.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
