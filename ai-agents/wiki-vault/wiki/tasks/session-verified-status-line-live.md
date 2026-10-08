# Verify 0397 Live — the Session-Status Line Shows the Right State in Production (task 0400)

**Source**: `ai-agents/tasks/done/0400-verify-0397-live-the-session-status-line-shows-the-right-state-in-production/brief.md` (the record: the same folder's `worklog.md`)
**Status**: done (agent-closed — not owner-verified) — ⚠️ **check 8 (analytics) NOT passed; carried by `0418`**
**Sprint/Tag**: Sprint 7, rank 51 (append rank, not a merit rank; moved in from Sprint 8 rank 12 on 2026-10-06) / task `0400`

> ✅ Done (agent-closed — not owner-verified), closed **2026-10-08** by a spawned `fkit-producer` via `/fkit-task-done`,
> on the owner's rulings given live in the `fkit lead` session: typed, *"Close it, pointing at the Sprint 8 re-check"*;
> then, via `AskUserQuestion`, **"New producer, my ruling in (Recommended)"**.
>
> 🟢 **The status line is live** in game **`0.0.157`** (container started 2026-10-08T06:56:17Z), deployed in the same
> slot as the S3b server, **server first** (owner ruling Q4) — see [[tasks/authenticated-profile-read-live]].
>
> ⚠️ **Not a clean pass, said plainly:** two of the three `Citizenship:Status:*` events were **not seen** in
> GameAnalytics, and checks 3 and 4 were **not checked live**. Verification step 7 (a failed check points at a new task)
> is met by pointing at **`0418`**, by owner ruling; `0397` was not reopened.

## Goal

Prove in production what `0397` built ([[tasks/session-verified-status-line]]): the start-screen status line inside the
citizenship card shows the right state — checking, verified paid, not confirmed, couldn't load with its Restart button —
in the approved RU and EN text, and the `citizenship_ui` kill switch hides it. Filed 2026-10-06 at `0397`'s close under
the build/verify-split rule. Nothing in source.

## Key Changes

Nothing in source. Owner's checks, 2026-10-08 ~07:30–07:35Z, game in **Russian**, compared by `fkit-lead` against the
approved RU text in `resources/lang/ru.json` (`citizenship_status.*`):

| # | Check | Result |
|---|---|---|
| 1 | Checking (network throttled) | ✅ only the *checking* text, then the verified card — never the guest card or a login button |
| 2 | Verified paid citizen | ✅ exact approved RU |
| 3 | Unverified citizen | **not checked live — covered by unit tests** (both owner accounts log in verified) |
| 4 | Unverified non-citizen | **not checked live — covered by unit tests** (same reason) |
| 5a–e | Couldn't load (profile request blocked) → text + Restart; Restart reloads on the start screen; reload with the block on shows *still failing*; Restart in a lobby does nothing; block removed → normal load | ✅ all five parts |
| 6 | RU text | ✅ read in RU: checking, verified paid, couldn't load + button, still failing |
| 7 | Kill switch | ✅ flag off → no card; back on — within ~5 min ending ≈09:48Z; ⚠️ exact times not recorded. One flip served `0398` too |
| 8 | Analytics | ⚠️ **NOT passed** — see Outcome |

- **Gates:** `0395` passed (2026-10-07) · `0396` same slot, server first · `0397` committed and in the image · weekend
  slot — mid-week exception, owner's call.
- **Chosen rollback for the Q4 pairing:** if the client must go back while S3b stays, **switch `citizenship_ui` off**
  (fastest safe path — the old image needs a re-pull). Full rules in `0396`'s worklog.

## Outcome

- **Check 8, GameAnalytics read ~11:39Z 2026-10-08 (partial day, *"Demo mode"* banner shown):**
  `Citizenship:Status:ReadFailed` **seen, 95** (a few are the owner's own blocked-request tests) ·
  `Citizenship:Status:Unverified` **not seen** · `Citizenship:Status:Restart` **not seen**, although the owner pressed
  Restart at least once. Recorded as observed, **not a diagnosis**: `Restart` fires just before a page reload and may be
  lost before GameAnalytics sends; `Unverified` needs an unverified citizen session (~3 % of logins are stale), so its
  absence may be real or a reporting gap. Owner ruling: no investigation — **`0418`** (Sprint 8, rank 17) re-reads both
  events over several days.
- **Observation, not a check:** in the *couldn't load* state the card shows **"0 / 100" XP with an empty bar** and the
  Yandex display name — it can read as lost XP. Filed as **`0410`** (Backlog board).
- **Extra reading:** a verified **earned** citizen gets **no** status line — expected; `0397` shows one only for a
  verified paid citizen, an unverified citizen, a read in flight, or a failed read.
- **UX note, by design:** pressing Restart in a lobby gives no feedback at all (`0397` guards it to the start screen).

## Related

- [[tasks/session-verified-status-line]] — task `0397`, the build this verifies
- [[tasks/authenticated-profile-read-live]] — task `0396`, same slot, server first (Q4)
- [[tasks/paid-citizen-ad-free-live]] — task `0398`, same sitting, same kill-switch flip
- [[tasks/citizenship-explainer-popup-live]] — task `0401`, same deploy
- [[tasks/verified-login-enforce-live]] — task `0395`, gate 1
- [[decisions/adr-116-verified-login]] — Decision 4, why the not-confirmed state exists
- [[systems/analytics]] — the three `Citizenship:Status:*` events and check 8's reading
- [[decisions/sprint-7]] — the board (rank 51)
- [[decisions/sprint-8]] — filed there (rank 12) before moving; `0418` appended there at 17
- [[decisions/sprint-backlog]] — where `0410` was filed
