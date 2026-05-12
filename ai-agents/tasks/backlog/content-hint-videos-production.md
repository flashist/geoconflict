# Task — Hint Videos: Content Production (Social Media + In-Game Assets)

## Sprint
Backlog — content production task (Mark), no engineering dependency. Can start any time.

## Priority
Medium — feeds the in-game hint display task (`s5-hint-videos-in-game.md`). Social media versions can be posted independently as they are produced.

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
- Format: GIF or short MP4 (decide during production — GIF is simpler to serve; MP4 is smaller at the same quality). Keep it consistent across all clips in V1.
- Resolution: match the game canvas size (1000px width or proportional)
- File size target: under 2 MB per clip (served from game server, not a streaming platform)

### Topics (suggested order — adjust based on what's quickest to record)

| # | Topic |
|---|---|
| 1 | Boats — what they are and how to send them |
| 2 | Conquering territories — basic mechanics |
| 3 | Empty territory — what it is and why it matters |
| 4 | Bots vs Nations vs Players — the differences |
| 5 | Different terrain types and how they affect gameplay |
| 6 | Construction price progression — how costs scale by type |
| 7 | Trade routes — how they work |
| 8 | Capturing enemy trading ships — how to do it and why it pays |

Add more topics as they come up. The list is not exhaustive.

---

## Output

- One clean Version B file per topic, named consistently: `hint-boats.gif`, `hint-trade-routes.gif`, etc.
- Collected in a single folder ready for the engineering task to serve as static assets.
- Social media versions posted to Telegram and VK as they are ready — no need to wait for all topics to be done.

---

## Notes

- Clean versions (Version B) do not need to be perfect — they loop silently next to a short text caption in-game. Smooth gameplay capture with clear visual action is enough.
- Post social media versions one at a time as they are produced. No need to batch.
- When the first 3–4 clean versions are ready, the engineering task (`s5-hint-videos-in-game.md`) can begin independently.
