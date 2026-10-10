# Re-read the Post-0340 Login-Verification Numbers in a Few Days (task 0402)

**Source**: `ai-agents/tasks/done/0402-re-read-the-post-0340-login-verification-numbers-in-a-few-days/brief.md` (the readings: the same folder's `worklog.md`)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 7, rank 52 (ADR-035 append rank) / task `0402`

> ✅ Done (agent-closed — not owner-verified), closed 2026-10-09 on the owner's ruling *"Close now (Recommended)"* —
> *"The numbers are fine … and the weekend goes unchecked."* A reading task — no code. ⚠️ **The weekend evenings were
> never read**; closed on the owner's judgment without them.

## Goal

Under [[decisions/adr-123-login-numbers-monitored-not-gate]] (owner, 2026-10-07: *"they no longer block us"*) the
post-`0391` login numbers are watched, not a deploy gate. This is the owner's planned re-read *"after a few days"*, to
inform later decisions — the same method as `0392` ([[tasks/post-24h-window-login-read]]): the outcome counter
`geoconflict_profile_login_verification` by `outcome`, stale share = stale ÷ all outcomes, per day / per hour (UTC),
stale-age brackets, and `id_mismatch` against the ~0.04 % baseline. **No pass bar** — the owner judges by eye
([[decisions/adr-122-stale-login-gate-owner-judgment]]). Counters restart at every profile deploy, so the window comes
in pieces and **no cumulative value is compared across a restart**.

## Key Changes

None in source. Three read-only reads, each with the owner's approval in session:

- **Piece 1, interim (2026-10-07)** and **piece 1, full (2026-10-08)** — profile version `0.0.156-profile.3` (`0340`'s
  deploy) up to just before the `0396` profile deploy; read by `fkit-lead` over read-only SSH to the telemetry box,
  `clickhouse-client --readonly=1`, `SELECT` only. The full read supersedes the interim one.
- **Piece 2 (2026-10-09)** — profile version `0.0.156-profile.4` (`0396`'s deploy) to about 2026-10-09T12:40Z; read by
  the coordinating session in the **Uptrace web UI** (Metric explorer, nothing saved), in the owner's own signed-in
  browser, because the session's own SSH logins to the telemetry box were refused. ⚠️ **Less exact:** the UI gives
  rounded per-hour averages, so the whole-window share is approximate; the evening hours were read point by point and
  are exact.

## Outcome

| Window | Length | Stale share | Notes |
|---|---|---|---|
| Before `0391` (`0373`) | — | 33.8 % | evenings 20–23 UTC at 42–52 % |
| `0392` (post-`0391`) | ≈22.75 h | 3.25 % | weekday only |
| Piece 1 full, `.3` (Wed → Thu) | ≈23.3 h | **2.96 %** (237 / 7,998) | `id_mismatch` 0; `absent` 1; Wed evening 20–23 UTC **1.5 %** (7 / 481) |
| Piece 2, `.4` (Thu → Fri) | ≈1.3 days | **≈2.6 %** (from rounded averages) | Thu evening 20–23 UTC **3.5 %** (20 / 578, exact) |

- **Stale-age brackets (piece 1 full):** `past_24h_48h` 130 · `past_48h_7d` 84 · `past_over_7d` 23 · under 24 h 0 —
  sum 237 = `stale`. ⚠️ `past_over_7d` (9.7 %) and the one `absent` login are **new** versus `0392`'s window — noted,
  **not explained**. Brackets were **not read** in piece 2.
- `id_mismatch`: 0 in piece 1; in piece 2 a handful at most (hourly max 1), 0 in the four evening hours.
- **Owner's take (2026-10-09):** *"Close now (Recommended)"*, put to the owner as ≈2.6 % whole window, 3.5 % Thursday
  evening, vs 42–52 % before `0391`, no weekend data.
- ⚠️ **Not covered:** no weekend evening (Sat 10 / Sun 11 Oct) was in any piece, so the post-`0391` share has still
  **never been seen against the weekend-evening window** that was worst before. The paid-citizen slice of the stale tail
  is a separate task (`0393`, backlog).

## Related

- [[tasks/post-24h-window-login-read]] — task `0392`, the first post-`0391` read and the method
- [[tasks/stale-login-fix-decision]] — task `0373`, the baseline and the weekend-evening hours
- [[tasks/stale-login-signature-age]] — task `0366`, the stale-age brackets
- [[decisions/adr-121-login-signature-24h-window]] — the 24 h window (`0391`) these numbers measure
- [[decisions/adr-122-stale-login-gate-owner-judgment]] — owner judges by eye, no threshold
- [[decisions/adr-123-login-numbers-monitored-not-gate]] — the ruling that made this re-read non-blocking
- [[tasks/authenticated-profile-read-live]] — task `0396`, whose profile deploy split the window into two pieces
- [[systems/weekend-deploy-window]] — the runbook that pointed at this re-read before the `0396` deploy
- [[decisions/sprint-7]] — the board (rank 52)
- [[tasks/join-token-identity-vouch-live]] — task `0405`, which read login outcomes the same way
