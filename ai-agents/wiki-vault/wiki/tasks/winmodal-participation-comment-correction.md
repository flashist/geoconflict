# WinModal Participation Comment — AI-player correction (task 0207)

**Source**: `ai-agents/tasks/backlog/0207-winmodal-participation-comment-ai-player-correction/brief.md`
**Status**: backlog
**Sprint/Tag**: Backlog — unscheduled, on `sprints/backlog.md`. **Nothing gates it. Nobody is building it**

## Goal

Correct one wrong doc comment. `src/client/graphics/layers/WinModal.ts:487-492` documents
`buildPlayerParticipation` as *"Keyed by clientID — only human players have one (AI players return null
and are skipped)."*

**That is wrong.** The skip is on `clientID === null` (`:498-499`), and `PlayerType.AiPlayer` players
**have a real `clientID`**. So the filter excludes **Bots** and **Nations** (`PlayerType.FakeHuman`) —
both clientless — and **includes** AI players. The comment names the wrong category and asserts the
opposite of the behaviour for AI players specifically. ✅ Producer-verified 2026-09-03 against the
working tree. ⚠️ Locate by symbol, not by line — these numbers drift.

**Zero user impact today; a live trap tomorrow.** It describes the exact predicate ~~`0206` is about to
change~~ **`0206` changed on 2026-09-03** and that **ADR-110 just ruled on**, so someone planning that
work will read this comment and be told the opposite of what the code does — and could either conclude
ADR-110 needs no code change where it does, or "restore consistency" by adding the exclusion the ADR
forbids.

📌 **UPDATED 2026-09-03 — the reader this was meant to protect has already been and gone.** `0206` was
planned, built and closed the same day, **before** this comment was corrected. It did **not** fall into
the trap: the shipped `WinCheckExecution` predicate is `clientID() !== null` with **no
`PlayerType.AiPlayer` exclusion**, exactly as ADR-110 requires (verified against the tree at this
lint). 🚩 **The trap is therefore not spent — it is now aimed at `0205`**, the Team half, which is
still unscheduled and unstarted.

## Key Changes

**Nothing built yet.** What the task authorises:

- Rewrite the comment so it describes the **actual** predicate: entries are keyed by `clientID`, the
  loop **skips players with no `clientID`** — **Bots and Nations** — and **AI players are included**.
- Add the non-obvious half: AI-player entries are harmless because the **server bounds crediting to the
  frozen start roster** (`GameServer.ts:1276-1278` → `gameStartInfo.players`, which is `activeClients`;
  filtered at `src/core/profile/MatchQualification.ts:83`). A pointer, not a transcript.
- ⛔ **Do NOT change `buildPlayerParticipation`'s behaviour, and do not add a `PlayerType.AiPlayer`
  filter** — that would be a silent behaviour change contradicting an accepted ADR.
- ⛔ **Do not touch `WinCheckExecution`.** The win predicate belongs to `0205` / `0206`.
- **`src/client/` only** — no `src/core/` change, so the "all `src/core/` changes must be tested" rule
  does not bite, and a comment change needs no new test. The diff must be comment-only.

## Outcome

Not started. Priority **Low — the producer's rank, not an owner ruling** (the board is unranked).
It does **not** depend on `0206` and does not block it, ~~**but it is worth doing before `0206` is
planned**, because that is the reader it protects.~~
📌 **That window CLOSED 2026-09-03 — `0206` was planned, built and closed before this was done, and it
did not trip on the comment.** Struck, not deleted. The remaining reader to protect is **`0205`**.

⚠️ **"Harmless today" is verified against today's code and is NOT permanent.** It rests entirely on the
server's frozen-start-roster gate. **If that gate ever changes, the AI-player entries this function
emits stop being inert** — a second reason the comment should say what is true rather than what is
currently harmless.

**Origin:** owner ruling *"File a small brief"*, given live in session 2026-09-03. The defect was
spotted while recording ADR-110's Teams-parity ruling onto `0205` and `0206`.

ℹ️ **ID allocation was checked repo-wide before filing**, including `.claude/`, because this project has
already been bitten once by an invisible reservation. ⛔ **`0204` is NOT free and was not considered** —
it is reserved by a hook task that exists only as prose in an fkit skill file.

## Related

- [[decisions/adr-110-ai-winner-allowed]] — the accepted decision this comment contradicts; **read its expiry before relying on it**
- [[tasks/teams-bot-team-win-stall]] — task `0205`, the Team-mode sibling on the same predicate
- [[decisions/clientless-leader-win-policy]] — the XP-loss defect and the both-branches award ruling behind `0205` / `0206`
- [[decisions/sprint-backlog]] — the board this task was appended to on 2026-09-03
- [[systems/glossary]] — why AI players are clientful and Bots and Nations are not
- [[features/ai-players]] — the player type the comment misdescribes
- [[systems/player-profile-store]] — the frozen-start-roster gate that makes the error harmless today
- [[tasks/win-check-clientless-leader-guard]] — task `0022`, whose guard introduced the predicate this comment misdescribes
- [[decisions/sprint-4]] — the board carrying `0206`, the task this correction was filed to protect
- [[tasks/ffa-clientless-leader-fallback-award]] — task `0206`, planned and shipped **before** this correction, and which did **not** trip on the comment
