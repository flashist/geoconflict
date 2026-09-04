# `WinModal.buildPlayerParticipation`: the doc comment says AI players are skipped — they are not

## ID
0207

> ℹ️ **ID allocation, checked 2026-09-03 before filing.** `0207` is free. **The check that was run, in
> full, because this project has been bitten by an invisible reservation once already:**
> 1. `grep -rn "0207" .claude/ ai-agents/` → **zero hits.** `grep -rn "0208" .claude/ ai-agents/` →
>    **zero hits.**
> 2. **Repo-wide** `grep -rn "0207" .` (excluding `node_modules/`, `.git/`, `static/`) → only
>    `LICENSING.md:11` and `:20`, which are a **substring of a git SHA**
>    (`25d5cc370207fd39e0c3bcaa69873b8fc6c60e68`), **not** a task ID.
> 3. All boards scanned: [`backlog.md`](../../../sprints/backlog.md),
>    [`sprint-backlog.md`](../../../sprints/sprint-backlog.md),
>    [`plan-sprint-4.md`](../../../sprints/plan-sprint-4.md) / `-5` / `-6`.
> 4. All task folders scanned: `ai-agents/tasks/{backlog,done,cancelled}/`. **Highest ID in use
>    anywhere is `0206`.**
>
> ⛔ **`0204` is NOT free and was NOT considered.** It is reserved **invisibly** by the plan-carry-check
> hook task, which exists only as prose in `.claude/skills/fkit-sprint-ship-loop/SKILL.md` (nine
> references there, enumerating load-bearing honesty markers that task must delete when the hook
> lands) and was **never filed as a brief**, so no board can see it. That reservation is why
> [`0205`](../0205-teams-bot-team-win-stall-resolution-policy/brief.md) was renumbered `0204` → `0205`.
> **Do not allocate `0204` to anything else, and do not edit those skill-file references.**
> ⚠️ **Step 1 alone would not have caught that.** Grepping beyond the boards — into `.claude/` — is the
> part of this check that matters.

## Sprint
Backlog — unscheduled. Filed on [`backlog.md`](../../../sprints/backlog.md).

**Board chosen honestly:** the owner's ruling was *"File a small brief"* — that authorises the brief, it
does not schedule a sprint. Filing it on [`plan-sprint-4.md`](../../../sprints/plan-sprint-4.md) would
assert a commitment nobody made. Same reasoning as `0203` and `0205`.
**Row appended, not inserted** (ADR-035).

## Priority
**Low — the producer's rank, not an owner ruling.** This board is unranked, so its Priority column reads
`—` and the rank lives here.

- **Zero user impact today.** The comment is wrong; the **code is right**, and the mismatch is
  invisible at runtime (see *Why it is harmless today* — verified).
- **But it is a live trap, not dead paper.** It describes the exact predicate
  [`0206`](../../done/0206-ffa-timer-expiry-award-to-top-client-player/brief.md) is about to change, and the
  exact predicate **ADR-110** just ruled on. Someone planning `0206` will read this comment and be told
  the opposite of what the code does.
- **Cost is minutes.** Comment-only, no behaviour change, no test change.

## Status
🔲 Backlog

~~**Nothing gates it. Nobody is building it.** It does **not** depend on `0206` and does not block it —
but it is **worth doing before** `0206` is planned, because that is the reader it protects.~~

📌 **UPDATED 2026-09-04 — struck, not deleted; spent, not wrong.** **Nothing gates it. Nobody is
building it.** ⚠️ **The *"before `0206` is planned"* framing is now stale in BOTH halves:** `0206` was
planned, built and closed on 2026-09-03, **and then REVERTED on 2026-09-04** (owner ruling given live
in session) — **its behaviour is not in the game and was never deployed.** ⛔ **This brief never
claimed `0206` had shipped, and nothing in it needs correcting on that count** — this note is here for
accuracy, not because a wrong claim was found.

✅ **The reason this task exists is UNCHANGED and, if anything, stronger.** The comment at
`WinModal.ts:487-492` is still wrong, the code is still right, and the **reader it protects still
exists** — the trap now sits in front of whoever plans
[`0211`](../0211-credit-participation-xp-at-elimination-or-match-end/brief.md) (the replacement for
`0206`: credit participation XP at elimination or match end) and
[`0205`](../0205-teams-bot-team-win-stall-resolution-policy/brief.md). ⚠️ **ADR-110 is untouched by
the revert** — it is a product policy about the winner predicate, and it still stands; only `0206`'s
FFA *implementation* of it was reverted. 📎 Full record: the STOP box at the top of
[`0206`'s brief](../../done/0206-ffa-timer-expiry-award-to-top-client-player/brief.md).

## Owner
fkit-coder

---

## Context

`src/client/graphics/layers/WinModal.ts:487-492` documents `buildPlayerParticipation` like this:

> *"Keyed by clientID — only human players have one (AI players return null and are skipped)."*

**That is wrong.** The skip is on `clientID === null` (`:498-499`):

```ts
const clientID = player.clientID();
if (clientID === null) continue;
```

`PlayerType.AiPlayer` players **have a real `clientID`**. So the filter excludes **Bots** and **Nations**
(`PlayerType.FakeHuman`) — both clientless — and **includes** AI players. The comment names the wrong
category and asserts the opposite of the behaviour for AI players specifically.

✅ **Producer-verified 2026-09-03** against the working tree: the comment at `:487-492`, the predicate at
`:498-499`.
⚠️ **Locate by symbol, not by line** — these numbers drift.

### Why it is harmless today — ✅ verified end to end, not assumed

An AI player's participation entry **is** built and **is** sent, but the server discards it:

1. `GameServer.ts:1276-1278` builds `eligibleRoster` from **`this.gameStartInfo.players`**.
2. `gameStartInfo.players` is `this.activeClients.map(...)` (`GameServer.ts:480-487`) — **real
   connections only**. AI players are carried in a **separate** `aiPlayers` field (`:488-491`) and are
   **not** in `players`.
3. `selectMatchCredits` skips any entry not in that roster:
   `src/core/profile/MatchQualification.ts:83` — `if (!eligibleRoster.has(p.clientID)) continue;`

**So an AI player cannot be credited XP today, and this comment's error changes nothing at runtime.**
✅ All three steps verified this turn. ⛔ **This is why the task is comment-only** — and also why nobody
should "fix" it by adding an AI filter to `buildPlayerParticipation`.

### Why it matters anyway

📌 **ADR-110 was accepted 2026-09-03** (`ai-agents/knowledge-base/decisions/adr-110-ai-player-may-be-declared-winner.md`):
an AI player **may** be declared the winner, as **one policy across FFA and Team**. Both
[`0205`](../0205-teams-bot-team-win-stall-resolution-policy/brief.md) and
[`0206`](../../done/0206-ffa-timer-expiry-award-to-top-client-player/brief.md) now record that the winner
predicate is **`clientID() !== null` with no `PlayerType.AiPlayer` exclusion**.

**This comment tells a reader the codebase already excludes AI players there.** It does not. A planner
trusting it could either (a) conclude ADR-110 needs no code change where it does, or (b) "restore
consistency" by adding the exclusion the ADR forbids.

## What to Build

**A comment correction. Nothing else.**

- Rewrite the doc comment at `WinModal.ts:487-492` so it describes the **actual** predicate: entries are
  keyed by `clientID` and the loop **skips players with no `clientID`** — **Bots and Nations
  (`PlayerType.FakeHuman`)**. **AI players (`PlayerType.AiPlayer`) have a `clientID` and are
  included.**
- Worth adding, since it is the non-obvious half: **AI-player entries are harmless because the server
  bounds crediting to the frozen start roster** (`GameServer.ts:1276-1278` → `gameStartInfo.players`,
  which is `activeClients`; filtered at `MatchQualification.ts:83`). Keep it short — a pointer, not a
  transcript.
- ⛔ **Do NOT change `buildPlayerParticipation`'s behaviour.** Do not add a `PlayerType.AiPlayer` filter.
  **ADR-110 rules that AI players may win**, and the server roster gate already bounds crediting. Adding
  a filter here would be a silent behaviour change contradicting an accepted ADR.
- ⛔ **Do not touch `WinCheckExecution`.** The win predicate itself belongs to `0205` / `0206`.
- **`src/client/` only.** No `src/core/` change, so the "all `src/core/` changes must be tested" rule
  does not bite — and a comment change needs no new test.

## Verification

1. **The new comment matches the code.** Read `buildPlayerParticipation` and confirm the comment
   describes `clientID === null` as the skip condition, names **Bots and Nations** as what is skipped,
   and states that **AI players are included**.
2. **The diff is comment-only.** No executable line changed. Confirm with `git diff` — if any non-comment
   line moved, the scope was exceeded.
3. `npm run lint` clean and `npm test` green.
   ⚠️ If a `supertest` suite fails, check CLAUDE.md's known-flake signature before treating it as a
   regression, **rule out `0197`'s `SIGSEGV` first**, and say that you re-ran.

## Notes

- **Origin:** owner ruling *"File a small brief"*, given live in session **2026-09-03**. The defect was
  spotted while recording ADR-110's Teams-parity ruling onto `0205` and `0206`.
- **Related, not blocking:** [`0206`](../../done/0206-ffa-timer-expiry-award-to-top-client-player/brief.md)
  touches this exact predicate; [`0205`](../0205-teams-bot-team-win-stall-resolution-policy/brief.md) is
  its Team-mode sibling. **Neither depends on this task and this task depends on neither** — but doing it
  first removes a trap from `0206`'s planning path.
- **ADR-110 is cited, not authored or edited here** — it lives in the knowledge-base and carries a
  pre-committed revisit trigger. Read it there.
- ⚠️ **The "harmless today" claim is verified against today's code and is NOT permanent.** It rests on
  the server's frozen-start-roster gate. **If that gate ever changes, the AI-player entries this
  function emits stop being inert** — which is a second reason the comment should say what is actually
  true rather than what is currently harmless.
