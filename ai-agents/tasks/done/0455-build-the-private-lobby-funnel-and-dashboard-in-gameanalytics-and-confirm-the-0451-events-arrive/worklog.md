# Worklog — 0455

## 2026-10-20 — events read, by the agent in the owner's Chrome

Owner OK given live 2026-10-20 (`AskUserQuestion`, *"Browser checks (Recommended)"*; and in the owner's message the
same day: *"you can … create new funnels, maybe create new dashboards"*). The owner logged in to GameAnalytics himself.
Read ~09:00–09:30Z. **No GameAnalytics id, session, token or URL recorded.**

**Timing gate:** `0451` shipped in game **0.0.165**, live 2026-10-16 ~12:17Z (mid-week deploy, owner ruling). Full days
since: 2026-10-17, 10-18, 10-19 (today, 10-20, **excluded**). 10-16 is shown too but is a **partial** day (from ~12:17Z).
Three full days — the brief asks for "several"; read now on the owner's ask. ⚠️ Today's counts would include the
agent's own `0461` test (two `JoinFailed:NotFound`) — today is excluded, so they are not in the table.

**Settings:** Explore · Design · Count · filter Event id 01 = `PrivateLobby` · split by Event id 02, then by Event id 03,
then id 03 again with Event id 02 = `MatchStarted` and = `Joined` (to separate the shared part-3 names) · by day.
**"Demo mode" banner: shown.**

### All 16 events, per day (count)

| Event | 16 Oct (partial) | 17 Oct | 18 Oct | 19 Oct | Seen? |
|---|---|---|---|---|---|
| `Created` | 8 | 15 | 3 | 15 | ✅ |
| `CreateFailed` | 0 | 0 | 0 | 0 | — not seen |
| `InviteCopied:Link` | 3 | 3 | 1 | 2 | ✅ |
| `InviteCopied:Code` | 0 | 0 | 0 | 0 | — not seen |
| `InviteCopyFailed` | 0 | 0 | 0 | 0 | — not seen |
| `Joined:Link` | 4 | 0 | 0 | 5 | ✅ |
| `Joined:Code` | 2 | 16 | 0 | 13 | ✅ |
| `JoinFailed:NotFound` | 0 | 4 | 1 | 2 | ✅ |
| `JoinFailed:Error` | 0 | 0 | 0 | 0 | — not seen |
| `Start:Tapped` | 5 | 8 | 0 | 6 | ✅ |
| `Start:Failed` | 0 | 0 | 0 | 0 | — not seen |
| `MatchStarted:Host` | 5 | 8 | 0 | 6 | ✅ |
| `MatchStarted:Guest` | 6 | 17 | 0 | 16 | ✅ |
| `MatchEnded` | 2 | 6 | 0 | 2 | ✅ |
| `Left:Host` | 4 | 7 | 3 | 9 | ✅ |
| `Left:Guest` | 0 | 0 | 0 | 1 | ✅ |

Cross-checks (all hold): part-2 totals = sums of their part-3 rows; `Created` + `MatchEnded` = the part-3 "null" row.
`InviteCopied:Code` = 0 is derived (part-3 `Code` total minus `Joined:Code` = 0 every day).

**One-line result: 11 of 16 seen.** Not seen: `CreateFailed`, `InviteCopied:Code`, `InviteCopyFailed`,
`JoinFailed:Error`, `Start:Failed` — all failure/fallback paths (`InviteCopied:Code` only fires before the Yandex
portal link is known). Zero is plausible, not proof they work.

### Sanity check (step 3) — flags for the owner, not investigated

- `MatchStarted:Host` = `Start:Tapped` every day ✓; `MatchEnded` ≤ `MatchStarted:Host` + `:Guest` ✓.
- ⚠️ **18 Oct** (Sunday): lobbies created (3) but no join, no start, no match — every host left (3). Low day or a
  problem — not told apart.
- ⚠️ **`Joined:Link` on 17 Oct is 0** while `Joined:Code` is 16; on 16 and 19 Oct links work (4, 5). Mix, not a gap.
- ⚠️ **`MatchEnded` is low vs matches started** (e.g. 17 Oct: 6 ended vs 8 host + 17 guest starts) — players who close
  the tab mid-match never fire it; expected shape, not checked.
- `UI:Tap:PrivateTab` (funnel step 1) not read yet.

### Value check (step 4)

Sum of value split by Event id 03: only the two-part group (`Created` / `MatchEnded`) carries values — 983, 6,650, —,
426 on 16–19 Oct; 18 Oct (only `Created` happened) carries none ⇒ the values are `MatchEnded`'s, in seconds (mean
≈ 8 min, ≈ 18 min, ≈ 3.5 min). Every three-part event carries **no** value. **No id-like value or name seen**; all
event names are the 16 expected ones. `Start:Failed` values: not seen (no events).

### What GameAnalytics offers (step 5)

- **Funnels page:** "Standard funnel", steps can be Design (and Progression, Resource) events; **per player** — *"a user
  counts as converting when they completed all of the previous steps in any order"*. The project already has several
  (e.g. New Player Conversion, Session Quality, Reconnection Flow).
- ⇒ The host and the friend are **different players**, so a single funnel with "friend joined" in the middle would
  show ~0 % at that step. Put to the owner: two funnels (host / guest). Nothing saved yet.

### Owner's ruling on the funnel shape (step 6)

Live `AskUserQuestion` 2026-10-20: *"How should I build the private-lobby funnel in GameAnalytics?"* → verbatim
**"Two funnels + dashboard (Recommended)"**. (Option text: *Save "Private lobby: host" and "Private lobby: guest" as
funnels, and a small dashboard of daily step counts.*) This answer is the owner's yes to each save below; the owner's
earlier message the same day also said *"you can … create new funnels, maybe create new dashboards"*.

### What was built (steps 6–8) — names as shown in GameAnalytics

1. **Funnel "Private lobby: host"** (Standard funnel, saved ✅ "Funnel saved successfully"). Steps:
   1 `UI:Tap:PrivateTab` · 2 `PrivateLobby:Created` · 3 `PrivateLobby:InviteCopied` (link or code) ·
   4 `PrivateLobby:Start:Tapped` · 5 `PrivateLobby:MatchStarted:Host` · 6 `PrivateLobby:MatchEnded`.
   Description names task 0455 and points at the guest funnel.
   First read (GameAnalytics default range 12–19 Oct): 6,440 players at step 1; step completion 0.23 % → 20 % →
   66.67 % → 100 % → 50 %; total conversion 0.02 %. The biggest drop is step 2 (Create) — expected, since only
   citizens can create; non-citizens leave at `LockedFeature:Tap:PrivateLobby` (not in this funnel).
2. **Funnel "Private lobby: guest"** (saved ✅). Steps: 1 `PrivateLobby:Joined` (link or code) ·
   2 `PrivateLobby:MatchStarted:Guest` · 3 `PrivateLobby:MatchEnded`. First read (12–19 Oct): 13 players; 100 % →
   100 % → 30.77 %.
3. **Dashboard "Private lobbies"** (saved ✅; access **Private**, **single game** — the same as the existing custom
   dashboards). Description names task 0455 and both funnels. Widgets (default range: past 7 days):
   - *"Private lobby events per day (by step)"* — Design · Count · Event id 01 = `PrivateLobby`, split by Event id 02;
   - *"Private tab taps per day"* — Design · Count · `UI:Tap:PrivateTab` (≈ 1,200–2,400 a day, 13–19 Oct).
   - Not added: `Start:Failed` split by value — no such events yet (nothing to show).

Why two funnels: GameAnalytics funnels are per player, and the host and the friend are different players (see step 5).
Funnels are not a dashboard widget type here as far as seen; the dashboard links them by name in its description.

**Verification 6 — owner has seen them: ⏳ not yet** (the owner made the call; a look at the saved funnels/dashboard is
owed). Nothing else was saved, shared or exported; the agent's page zoom (a view-only change in the browser) was reset.

## 2026-10-28 — verification 6 met: the owner has seen them; closed (spawned `fkit-producer`, agent-closed — not owner-verified)

The `fkit-lead` session relayed the producer's status line *"0455: the private-lobby funnels and dashboard are saved. The only step left is you looking at them."* The owner typed in reply, verbatim, on **2026-10-28**, in the **`fkit-lead` Claude Code session** (relayed to a spawned `fkit-producer` with no owner channel, ADR-021/037):

> **"I looked at them, we're good here"**

That is the owner's verification of step 6 (*"the owner has seen them"*): ✅ **met**. With it, every verification step is recorded. Closed via `/fkit-task-done` with the marker `✅ Done (agent-closed — not owner-verified)`: the skill gives the plain `✅ Done` only to an owner-present producer session (ADR-033 §5); a spawned producer is an agent even when it relays the owner's own words. The owner's look is recorded here; the owner can upgrade the marker by running `/fkit-task-done` himself.
