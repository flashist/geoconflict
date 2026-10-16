# Worklog — 0440: When Yandex Games is working again: the flag change and checks blocked by its outage

## 2026-10-13 — Yandex judged back; items 1–3 done; item 4 still open; item 5 not run

**Recorded by** a spawned `fkit-coder` (no owner channel, ADR-021), from the owner's results relayed by `fkit-lead`
(`fkit lead` session, `/fkit-sprint-ship-loop` on Sprint 8). Not closed; status unchanged.

No player id, Yandex id, app id, lobby code, URL, host, IP, token or credential is recorded here.

**Owner's words (verbatim, 2026-10-13):** *"I checked Part 1 and Part 2 - all good. The version in the prod is
0.0.163"*. "Part 1" = items 1a, 1b, 1d here; "Part 2" = `0428` steps 1–4. ⚠️ **"all good" is the owner's summary, not
itemised by the owner** — each item below is recorded **pass, per owner statement "all good"**.

### Item 1 — is Yandex back?

**Yandex judged back: 2026-10-13.** Game version live in production: **`0.0.163`** (owner).

| Item | Result | Notes |
|---|---|---|
| 1a — console works and shows flag values | ✅ **pass, per owner statement "all good"** | |
| 1b — snippet run, flags printed, on a **tester** and a **non-tester** page | ✅ **pass, per owner statement "all good"** | The printed values were not read out by the owner. What they should show, per the console values the owner confirmed (*"Yes, exactly as expected"*): before the flip `citizenship_ui` = `enabled`, `private_lobbies_all` (not set), `private_lobbies` (not set). |
| 1c — a console change really takes effect | ✅ **pass, proven by `0428`'s flip** | Non-tester page shows `private_lobbies_all` = `enabled` after reload — covered by the owner's "all good" over `0428` check 4a. |
| 1d — game page loads, login works, an ad shows when due | ✅ **pass, per owner statement "all good"** | Nothing still broken was reported. |

### Item 2 — `0428`

**Done in its own task** — see [`0428`'s worklog](../../done/0428-turn-private-lobbies-on-for-everyone-in-the-yandex-games-console/worklog.md).
`private_lobbies_all` = `enabled`, no condition, flipped **about 17:09–17:12 MSK, 2026-10-13** (owner at 17:14 MSK:
*"2-3 min ago (maybe 5 max)"*). Checks 4a–4c pass per owner statement "all good" (4b including the lowercase code
join); 4d not run (see item 5's reason — same refusal). Rollback not used. `0428` itself is not closed yet.

### Item 3 — `0426`'s flag gate

Real values recorded, 2026-10-13: **`citizenship_ui` = `enabled` for everyone** (no condition); **`private_lobbies_all`
= `enabled` for everyone since about 17:09–17:12 MSK, 2026-10-13**. The same fact is added to
[`0426`'s worklog](../0426-update-the-news-window-tell-players-everything-shipped-since-2026-06-06/worklog.md). So
`0426`'s **Private tab** line may stay, provided the flag is still on at `0426`'s deploy (the owner confirms at
`0426`'s approval gate). The **exit-confirm** line still turns on whether `0437` ships in the same deploy — not decided
here.

### Item 4 — `0439`

**Still open.** Its Yandex part is now unblocked (Yandex back, item 1). It still waits on the game deploy that carries
`0437` (built, not deployed when it closed).

### Item 5 — server-log counts

**Not run.** The owner OK'd it in-session (verbatim *"Yes, run them (Recommended)"*). The recording agent (a spawned
`fkit-coder`) tried one read-only SSH read of the game container's log on the production game box; **Claude Code's
permission filter refused it ("Production Reads") before it ran** — no login attempted, nothing read. Same refusal
`0390`'s spawned coder hit. **Not worked around.** It can be run from the owner-present `fkit lead` session. Counts
wanted: game-log errors (`"level":"error"`), `failed after retries` lines, and match credits (`match credit results:`
lines and credited totals) — since recovery (2026-10-13) against a normal day before 2026-10-11. ⚠️ The container log
keeps at most 10 × 100 MB and is lost when a deploy recreates the container, so a day before 2026-10-11 may no longer
be in it; that was not checked.

### Item 6 — watch items

- **Outage window, for `0411` and `0435` readers: start 2026-10-11, end 2026-10-13** (the date item 1 passed). Flag
  fetch timeouts in this window say nothing about normal days — leave them out.
- **`0435`:** `private_lobbies_all` went on for everyone **about 17:09–17:12 MSK, 2026-10-13** — recorded in `0428`'s
  worklog as its step 4 needs.
- **`0424`:** asked live via `AskUserQuestion` whether any lost profile or lost progress has been reported since
  recovery: *"No reports"*. Trigger not fired.
- **`0394`:** not tracked here (its Phase 0 step 2 needs a live account switch inside Yandex); unchanged.

### Verification status (this task)

1. Date judged back + 1a–1d — yes (1a, 1b, 1d per "all good"; 1c via `0428`). Printed flag values: **not read out by
   the owner** — only the console values were confirmed. *📌 Superseded 2026-10-13 — see "Owner answers, later" below:
   the owner has since confirmed the printed values.*
2. Items 2–4 — 2 done in `0428`; 3 recorded here and in `0426`; 4 still open, reason recorded.
3. Item 5 — **not run**, reason recorded.
4. Outage window recorded; `0424` answer recorded (no reports).
5. Nothing written as passed that the owner did not cover.
6. No id, code, URL, host, IP, token or credential in this file — checked by the recording agent.

## 2026-10-13, later — owner answers (live `AskUserQuestion`, `fkit lead` session, relayed by `fkit-lead`)

- **Item 1b — printed values.** Owner, verbatim: *"Yes, both enabled"*. On the **non-tester** page, after the flip,
  the snippet printed `citizenship_ui = enabled` and `private_lobbies_all = enabled`. Verification 1 is now **met**
  for the non-tester page (values printed after the flip). The before-flip printout and the tester-page printout were
  not read out.
- **Item 5 — server-log counts: not run — skipped by the owner** after the permission filter blocked the read-only
  SSH read; no login attempted. Owner, verbatim: *"Skip, record 'not run'"*. Can be re-done once key login (`0445`)
  works. A read-only counting script was drafted; it was not run.

## 2026-10-13, at close — item 4 re-planned by the owner; tracker closed

**Recorded by** a spawned `fkit-producer` (no owner channel, ADR-021/037), from the OWNER RULING given live via
`AskUserQuestion` in the `fkit lead` session driving `fkit-sprint-ship-loop`, relayed by `fkit-lead`. ⛔ Not producer
precedent. Verbatim: *"Close; 0439 stands alone (Recommended)"*.

- **Item 4 (`0439`) — re-planned by the owner, 2026-10-13:** `0439` carries the exit-popup live check on its own (it
  still waits on the game deploy that carries `0437`). This tracker no longer waits for it. Verification 2 is met:
  item 2 done in `0428`, item 3 recorded here and in `0426`, item 4 re-planned by the owner.
- Closed `✅ Done (agent-closed — not owner-verified)` via `/fkit-task-done`. Known gaps kept as recorded above: the
  snippet values before the flip and on a tester page were not read out; item 5 not run (skipped by the owner).

## Decision log

- none (recording only; no source written, no fix applied, no obvious-winner call).
