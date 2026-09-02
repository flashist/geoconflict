# Task — Hint Videos: Content Production (Social Media + In-Game Assets)

## ID
0028

## Sprint
Backlog — content production task (Mark), no engineering dependency. Can start any time.

## Priority
Medium — feeds the in-game hint display task (`0029-hint-videos-in-game`). Social media versions can be posted independently as they are produced.

## Status
🔲 Backlog

## Owner
fkit-producer

---

## Production decisions — owner rulings, 2026-09-02

Given live in session (Ruling D). The task was **board-invisible until this date** — it appeared in no
sprint file; a row was appended to [`backlog.md`](../../../sprints/backlog.md) in the same pass.

🔴 **This work is LIVE this week, but the Status above deliberately stays `🔲 Backlog`, not
`🔄 In progress`** — this is content production the owner still owns entirely for Version A, running
alongside an agent-assisted capture track. An in-progress marker would misreport who is doing what.

| # | Ruling |
|---|---|
| **D1 — Format is MP4, not GIF** | Closes the open "decide during production" choice below. **GIF cannot meet both the 1000px width and the under-2MB budget — measured.** Applies to Version B; the file-naming examples under **Output** are superseded accordingly. |
| **D2 — The HUD stays in frame** | Do not crop or hide the game HUD during capture. |
| **D3 — First batch is topics #2, #3, #4, #5** | Conquering territories · empty territory · bots vs nations vs players · terrain types. |
| **D4 — Topics #1, #7, #8 are DEFERRED to their own spike** | Boats · trade routes · capturing enemy trading ships. **Deferred, not dropped** — they need a separate spike. |

✅ A feasibility spike confirmed **unattended agent capture works**.

⚠️ **Topic #6** (construction price progression) carries **no ruling either way** — it is in neither
the first batch nor the deferred set.

---

## Context

Players regularly discover game mechanics late or not at all. Short educational clips covering one mechanic each serve two purposes simultaneously:
- Posted to Telegram and VK with Russian captions and voice-over — community growth and retention
- Served in-game on the game-starting modal and win screen as silent random hints — in-game education

Both use the same underlying recording. The social media version adds captions and voice-over; the clean version is saved separately for in-game use.

---

## What to Produce

### For each topic, create two versions

**Version A — Social media (Telegram, VK)**
- Russian captions baked into the video
- AI-generated Russian voice-over
- Duration: 15–30 seconds

**Version B — In-game (clean)**
- No captions, no voice-over, no watermarks
- Same visual content as Version A
- Format: **MP4** — ~~GIF or short MP4 (decide during production — GIF is simpler to serve; MP4 is smaller at the same quality)~~. **Ruled 2026-09-02 (D1), struck not deleted so the change is auditable: GIF cannot meet both the 1000px width and the under-2MB budget — measured.** Keep it consistent across all clips in V1.
- Resolution: match the game canvas size (1000px width or proportional)
- File size target: under 2 MB per clip (served from game server, not a streaming platform)

### Topics (suggested order — adjust based on what's quickest to record)

| # | Topic | Batch (ruled 2026-09-02) |
|---|---|---|
| 1 | Boats — what they are and how to send them | ⏸️ Deferred to its own spike (D4) |
| 2 | Conquering territories — basic mechanics | ✅ First batch (D3) |
| 3 | Empty territory — what it is and why it matters | ✅ First batch (D3) |
| 4 | Bots vs Nations vs Players — the differences | ✅ First batch (D3) |
| 5 | Different terrain types and how they affect gameplay | ✅ First batch (D3) |
| 6 | Construction price progression — how costs scale by type | ⚠️ No ruling either way |
| 7 | Trade routes — how they work | ⏸️ Deferred to its own spike (D4) |
| 8 | Capturing enemy trading ships — how to do it and why it pays | ⏸️ Deferred to its own spike (D4) |

Add more topics as they come up. The list is not exhaustive.

---

## Output

- One clean Version B file per topic, named consistently: `hint-boats.mp4`, `hint-trade-routes.mp4`, etc. *(~~`.gif`~~ — superseded by ruling **D1**, 2026-09-02: the format is MP4.)*
- Collected in a single folder ready for the engineering task to serve as static assets.
- Social media versions posted to Telegram and VK as they are ready — no need to wait for all topics to be done.

---

## Notes

- **Depends on:** nothing. The Sprint field asserts it directly — a content production task for the
  owner, no engineering dependency, can start any time. Its relationship to
  `0029-hint-videos-in-game` runs the other way: this task feeds `0029`, which cannot begin until 3 to
  4 clean assets exist here. That is a Blocks fact, not a Depends on fact. Full prose above; this
  bullet is the machine-readable form beside it.
- Clean versions (Version B) do not need to be perfect — they loop silently next to a short text caption in-game. Smooth gameplay capture with clear visual action is enough.
- Post social media versions one at a time as they are produced. No need to batch.
- When the first 3–4 clean versions are ready, the engineering task (`0029-hint-videos-in-game`) can begin independently.
