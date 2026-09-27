# Investigate: single-player accepts a max timer of 0 — does the game end at once, and should anything be fixed?

## ID
0320

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**Filed 2026-09-27 by a spawned `fkit-producer` with no owner channel (ADR-021), on an OWNER RULING given
live in the `fkit lead` session via `AskUserQuestion` and relayed by `fkit-lead` (ADR-021/037).** ⛔ Not
producer precedent.

- Question put to the owner: *"Single-player accepts a max timer of 0, and the game likely ends immediately
  (older bug, not 0302). What should happen?"*
- Owner's answer, verbatim: **"If it's already the current behaviour in prod, then we're not fixing it right
  now, brief a task for first investigation, and then for deciding if anything should be fixed. Put the task
  into the backlog sprint"**.

**Where this came from.** The `0302` round-3 review (Codex finding F4) noticed it while checking the private
host modal. `0302` fixed the **private lobby** side (review R6: the host modal's timer field now takes only
1–120, matching the server schema). The **single-player** side was left alone, because it is an older
behaviour, not something `0302` introduced.

**Leads — UNVERIFIED, from that reviewer; the producer only glanced at them. Confirm each before relying on it:**
1. `src/client/SinglePlayerModal.ts` (~line 365 and ~468): the timer number field has `min="0"`, and its
   change handler rejects only values below 0 or above 120 — so **0 is accepted**. `git log -S` puts that
   `min="0"` in the fork's first commit (upstream behaviour, not ours).
2. `src/core/execution/WinCheckExecution.ts` (~lines 115–125): the timer counts from the **end of the spawn
   phase**, and "timer met" is `elapsed − maxTimerValue × 60 ≥ 0`. With 0 that is true on the first check
   after spawn. So "ends immediately" probably means **"ends the moment the spawn phase is over"** — confirm.
3. `src/core/Schemas.ts` (~line 189): `maxTimerValue` is `min(1).max(120)`. That guards private lobbies,
   which go through the server. **Single-player reportedly never reaches that check** — confirm whether any
   client-side parse of the game config applies it.
4. `src/client/HostLobbyModal.ts` (~line 737): the `0302` R6 fix, for comparison.

**Why investigation first.** The owner's ruling makes the fix **conditional on facts nobody has checked**:
is this really what production does today, and what does the player actually see? Until that is known,
there is nothing to decide.

**Related history — read before recommending a fix.** Timer-expiry winners already have a messy past:
`0022` (clientless-leader guard), `0206` (built, then **reverted, never deployed** — read the STOP box at the
top of its brief), `0208`, and the wiki page `wiki/decisions/clientless-leader-win-policy.md`. Who "wins" when
a 0-minute timer fires in single-player may run into that policy.

## What to build (the investigation)

1. **Confirm production today.** Establish what version of `SinglePlayerModal.ts` / `WinCheckExecution.ts`
   is live (deployed build vs. `dev`), and reproduce: single-player, max timer on, value 0. If you cannot
   check production itself, reproduce on the same code locally and **say plainly that prod was not checked
   directly**.
2. **Report what actually happens**, step by step: can 0 be typed and saved; does the value reach the game
   config (or is 0 dropped/treated as "no timer" somewhere); when does the game end; who is declared winner
   (human, bot, nation, nobody); what the win/lose screen shows; any analytics or XP/crediting side effects.
   Also note neighbouring edge cases met along the way (empty field with the box ticked, leading zeros,
   values above 120) — list them, don't fix them.
3. **Bring the owner a decision**: is anything worth fixing, and if so how. Offer 2–3 options with
   trade-offs — at least: (a) leave as is; (b) match the private lobby — field takes 1–120 only;
   (c) treat 0 as "no timer". Recommend one.
4. Save findings to `ai-agents/knowledge-base/reports/` (never the wiki). **No code change** — no fix before
   the owner rules.

## Verification steps

1. A findings report exists and says, with evidence (build/commit checked, steps run, what was observed),
   whether production behaves this way today — or states explicitly that prod could not be checked and why.
2. The report answers each of the four leads above as confirmed, wrong, or partly right, with file references.
3. It records exactly when the game ends with a 0 timer and who is declared winner.
4. It ends with a decision question for the owner with options and one recommendation.
5. `git diff` shows no change under `src/` from this task.
6. The owner's ruling on "fix or not, and how" is recorded verbatim before any fix brief is filed.

## Notes

- **Depends on:** nothing
- **Blocks:** any fix brief for the single-player timer (filed only after the owner rules on this investigation's findings).
- **Related:** [`0302`](../../done/0302-private-lobby-as-a-locked-citizen-perk/brief.md) (review R6 — the private-lobby
  fix, and the Codex F4 finding that raised this) ·
  [`0206`](../../done/0206-ffa-timer-expiry-award-to-top-client-player/brief.md) (timer-expiry award — reverted,
  never deployed) · [`0208`](../../done/0208-measure-clientless-leader-at-win-condition-in-production/brief.md).
- **Owner choice:** `fkit-coder` — this is a bug reproduction against running code, like `0032` / `0039`, not a
  design question. If the fix options turn into a real design choice, the coder may consult `fkit-architect`.
- **Priority:** unranked (Backlog board). Producer's view if pulled into a sprint: **Low** — single-player
  only, needs a player to deliberately set 0, and the owner has already said it is not for now. Not owner-ruled.
- **Secrets/privacy:** no endpoints, credentials or player ids in the report.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
