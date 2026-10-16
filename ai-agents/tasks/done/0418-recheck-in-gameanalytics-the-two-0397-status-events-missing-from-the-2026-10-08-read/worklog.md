# Worklog — 0418

## 2026-10-16 — the re-read

**Who / how.** Agent session (Claude Code), driving the owner's Chrome; the owner was present and logged in to
GameAnalytics himself and said yes to the read via `AskUserQuestion` (*"Yes, I'm logged in (Recommended)"*).
**Read-only:** nothing saved in GameAnalytics (the filter dialog's "Save" only applies the filter to the chart; the
page's own "Save" button was never pressed). No id, token, session or URL copied anywhere.

**Read time:** about 11:00–11:20Z on 2026-10-16.

**Window:** 2026-10-08 to 2026-10-15, both included — 8 full days. Current day (2026-10-16) **excluded**
("Include current day" off). Day boundaries: GameAnalytics' own; assumed UTC, **not checked**.

**Settings:** Explore · Event category **Design** · Aggregation **Count** · Event filter Event id 01 = `Citizenship`,
Event id 02 = `Status` · Split by event dimension **Event id 03** · Granularity Day. (Same as the 2026-10-08 read,
except the window and the current day left out.)

**"Demo mode" banner:** **shown** — the page carried GameAnalytics' "You're viewing data in Demo mode" banner, as on
2026-09-29, 2026-10-05 and 2026-10-08.

**Before reading, checked in the repo:** the three events' code (`src/client/CitizenshipNotice.ts`,
`src/client/ProfileReadRestart.ts`, the enum in `src/client/flashist/FlashistFacade.ts`) has not changed in a way
that touches them since 2026-10-08 — the only edit to those files in the window is a comment (`a555111`) and new,
unrelated enum entries (`daa1bcc`).

**Game client deploys inside the window** (times of the `DEPLOY prod: bump version` commits, converted to UTC — commit
time, not container start time):

| Version | Deploy commit (UTC) |
|---|---|
| `0.0.158`–`0.0.160` | 2026-10-08 ~19:50–19:56Z |
| `0.0.161` | 2026-10-09 ~07:31Z |
| `0.0.162`, `0.0.163` | 2026-10-10 ~17:53Z and ~18:21Z |
| `0.0.164` | 2026-10-13 ~17:06Z |

### Per-day table

GameAnalytics shows "N/A" for a day with no events; written here as **no / 0**.

| Day (2026) | `Unverified` | `Restart` | `ReadFailed` (control) |
|---|---|---|---|
| 08 Oct | no · 0 | **yes · 1** | yes · 208 |
| 09 Oct | yes · 6 | no · 0 | yes · 324 |
| 10 Oct | yes · 6 | no · 0 | yes · 161 |
| 11 Oct | yes · 1 | no · 0 | yes · 162 |
| 12 Oct | yes · 8 | no · 0 | yes · 204 |
| 13 Oct | yes · 11 | no · 0 | yes · 183 |
| 14 Oct | yes · 16 | no · 0 | yes · 242 |
| 15 Oct | yes · 9 | no · 0 | yes · 232 |
| **Total** | **57** | **1** | **1,716** |

GameAnalytics' total for the query: 1.77K (= 57 + 1 + 1,716 = 1,774). ✔

### Result

**Both seen.** `Unverified` on 7 of 8 days (57 in all). `Restart` **once only, on 2026-10-08**, and on no other day.

Notes, recorded as observed — **not a diagnosis:**
- 2026-10-08's `ReadFailed` is now 208 (full day) vs 95 at the 11:39Z read that day (partial day) — consistent.
- `Restart` = 1 on 2026-10-08 was **not** seen at the 11:39Z read that day. The owner pressed Перезапустить on the start
  screen ~07:30–07:35Z that day (`0400` check 5b), so this one may be the owner's own press arriving late, or a
  later press by anyone — **not told apart:** the hour view is greyed out in GameAnalytics, even for a one-day range.
- From 2026-10-09 to 2026-10-15: **0** `Restart` against **1,508** `ReadFailed`. Each `ReadFailed` is a "couldn't
  load" line with the Restart button shown (`ReadFailed` also covers the "still failing" state). Whether nobody pressed
  it, or presses are lost before GameAnalytics sends them (the `0400` idea), is **not checked** — this task does not
  investigate (owner ruling, brief).

### Next step

Per brief step 5, both events appeared, so the `0400` check-8 gap reads as closed for `Unverified`. For `Restart`,
only one event in 8 days, and none after the first day, so whether the gap is closed is the owner's call — put to the
owner in this session (answer recorded below).

### Owner's answer (2026-10-16, live `AskUserQuestion` in this session)

Question: *"Restart showed up only once in 8 days. What do we do about it?"* — owner's choice, verbatim: **"Accept and
close"**. So the `0400` check-8 gap counts as **closed** for both events. Whether `Restart` presses are lost before the
reload stays **unanswered** (accepted knowingly by this choice). No investigation started.

**Close:** not done here — only the producer may close a task (`/fkit-task-done`, with the
`(agent-closed — not owner-verified)` marker). Brief status left at `🔲 Backlog` for the producer to change.
