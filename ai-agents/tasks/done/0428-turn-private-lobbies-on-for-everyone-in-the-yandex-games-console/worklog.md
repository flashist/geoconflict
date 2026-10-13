# Worklog — 0428: Turn private lobbies on for everyone — set the `private_lobbies_all` everyone-flag in the Yandex Games console

## 2026-10-13 — flag flipped by the owner; checks 4a–4c pass by owner statement; 4d not run

**Recorded by** a spawned `fkit-coder` (no owner channel, ADR-021), from the owner's results relayed by `fkit-lead`
(`fkit lead` session, `/fkit-sprint-ship-loop` on Sprint 8). Nothing here was observed by the recording agent except
where it says so (the precondition file checks and the 4d attempt). Not closed; status unchanged.

No player id, Yandex id, app id, lobby code, URL, host, IP, token or credential is recorded here.

### Owner's words (verbatim, `fkit lead` session, 2026-10-13)

- Results: *"I checked Part 1 and Part 2 - all good. The version in the prod is 0.0.163"*. "Part 2" = this task's
  steps 1–4 (before values, flip, after values, live checks 4a, 4b including the lowercase code join, 4c). "Part 1" =
  `0440` items 1a, 1b, 1d.
- Console values, asked live via `AskUserQuestion`: *"Yes, exactly as expected"*.
- Flip time, answered at **17:14 MSK**: *"2-3 min ago (maybe 5 max)"*.
- ⚠️ **"all good" is the owner's summary, not itemised by the owner.** Each check below is recorded **pass, per owner
  statement "all good"**. The owner did not describe each check, the accounts' roles, or the device separately.

### Preconditions

| # | Precondition | State |
|---|---|---|
| 1 | `0376`, `0228`, `0381`, `0390`, `0433` closed with their gate item passed | All five are in `done/` (checked by the recording agent 2026-10-13). `0376` gate item 2 passed (owner, 2026-10-10). `0381` closed by owner ruling 2026-10-10 (step 4, the old `#join=` link, not run). `0390` passed cases 1 and 3 + no collateral (2026-10-10). `0228` reproduced and fixed, deployed in game `0.0.163`; its live check `0433` closed 2026-10-11 (main paths only — (c) phone join-close not run). All `✅ Done (agent-closed — not owner-verified)`. |
| 2 | Gate items 1, 4, 5 still true; `0390` state; answer to open question 1 | `0354`, `0377`, `0301` are in `done/`; no commit with "revert" in its message since 2026-09-25 (recording agent's `git log` check — a revert under another name would not show). `0390`: passed and closed 2026-10-10. Open question 1: answered 2026-10-09, *"Yes, 0390 must pass first (Recommended)"*. |
| 3 | Game version live in production | **`0.0.163`** (owner statement). |
| 4 | A non-tester account (ideally also non-citizen) ready inside the Yandex Games page | Not stated separately by the owner. Covered only by the owner's "all good" over checks 4a–4c, which need a non-tester and a non-citizen account. Account roles and device: **not stated**. |

### Steps 1–3 — console values and flip

| Flag | Before | After |
|---|---|---|
| `private_lobbies_all` | not set | **`enabled`, no condition** (everyone) |
| `citizenship_ui` | `enabled`, everyone, no condition | `enabled`, everyone, no condition (unchanged) |
| `private_lobbies` (old, not read by the game) | not set | not set (unchanged) |

Owner confirmed both columns live: *"Yes, exactly as expected"*. `citizenship_ui` was on for everyone, so step 2's stop
condition did not apply.

**Flip time: about 17:09–17:12 MSK, 2026-10-13** (owner, at 17:14 MSK: *"2-3 min ago (maybe 5 max)"*). That is about
14:09–14:12 UTC. 📌 **For `0435`:** private-lobby entries can join the GameAnalytics count from this time on.

### Step 4 — live checks

| Check | Result | Notes |
|---|---|---|
| 4a — non-tester sees three tabs | ✅ **pass, per owner statement "all good"** | Account role / device / phone width not stated by the owner. |
| 4b — non-citizen joins a citizen's lobby by typing the code | ✅ **pass, per owner statement "all good"** | Includes the **lowercase code join** (`0389` check (b), `0381` step 3) — the relay names it as covered; the owner did not itemise it. Invite-link join: not stated. |
| 4c — Create stays citizen-only (explainer, no host window) | ✅ **pass, per owner statement "all good"** | Account role not stated. |
| 4d — server log counts (read-only) | ⏭️ **not run** | See below. |

**4d — not run, reason.** The owner OK'd the read-only counts in-session (verbatim *"Yes, run them (Recommended)"*). The
recording agent (a spawned `fkit-coder`) tried one read-only SSH read of the game container's log on the production
game box; **Claude Code's permission filter refused it ("Production Reads") before it ran** — no login was attempted,
nothing was read. Same refusal as `0390`'s spawned coder. **Not worked around** (no other route, no Uptrace query —
same production read). It can be run from the owner-present `fkit lead` session, as `0390`'s was. Counts wanted, for the
window from the flip (~14:09 UTC) to the time of the read: private create lines (`creating Private`), how many carry
the creator (`, creator: `), and `creator not a citizen` refusals.

### Step 5 — rollback

**Not used.** No check failed; no player problem reported to the recording agent.

### Step 6 / verification 6 — on for everyone

**Private lobbies are ON FOR EVERYONE since about 17:09–17:12 MSK, 2026-10-13** — owner, by "all good" after the flip
plus the console answer *"Yes, exactly as expected"* (after: `private_lobbies_all` = `enabled`, no condition;
`citizenship_ui` = `enabled` for everyone). Same fact added to `0426`'s worklog the same day.

### Watch item for `0424`

Asked live via `AskUserQuestion` whether any lost profile or lost progress has been reported since recovery: *"No
reports"*. `0424`'s trigger has not fired.

### Verification status (this task)

1. Preconditions 1–4 recorded — yes (4 only via "all good", roles not stated).
2. Before/after values + flip time — yes.
3. 4a–4c — pass per owner statement "all good", not itemised.
4. 4d — **not run**, reason recorded.
5. No failure, so no rollback and no new task.
6. Owner statement: on for everyone, 2026-10-13 — yes.
7. No id, code, URL, host, IP, token or credential in this file — checked by the recording agent.

## 2026-10-13, later — owner answers (live `AskUserQuestion`, `fkit lead` session, relayed by `fkit-lead`)

- **Check 4d: not run — skipped by the owner** after the permission filter blocked the read-only SSH read; no login
  attempted. Owner, verbatim: *"Skip, record 'not run'"*. Can be re-done once key login (`0445`) works. A read-only
  counting script was drafted; it was not run. Verification 4 stands as **not run**, reason recorded.
- **Flag on a non-tester page after the flip** (via `0440` item 1b): owner, verbatim *"Yes, both enabled"* — the
  snippet printed `citizenship_ui = enabled` and `private_lobbies_all = enabled`.

## Decision log

- none (recording only; no source written, no fix applied, no obvious-winner call).
