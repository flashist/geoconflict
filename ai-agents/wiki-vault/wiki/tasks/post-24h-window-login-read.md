# Read the Post-0391 Login Numbers Before the 0340 Deploy (task 0392)

**Source**: `ai-agents/tasks/done/0392-read-the-post-0391-login-numbers-before-the-0340-deploy/brief.md` (the readings: the same folder's `worklog.md`, § *2026-10-07 — the read*)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 7, rank 44 (append rank, not a merit rank; moved in from Sprint 8 rank 8 on 2026-10-05) / task `0392`

> ✅ Done (agent-closed — not owner-verified), closed **2026-10-07** by a spawned `fkit-producer` via `/fkit-task-done`,
> on owner rulings relayed by `fkit-lead`. A reading task — no code. The read was run read-only by `fkit-lead` in the
> owner's session, on the owner's *"You run it here, I OK it (Recommended)"*.
>
> 🟢 **Stale share after `0391`: 3.25 %** (241 / 7,426) — **was 33.8 %** before it ([[tasks/stale-login-fix-decision]]),
> against a predicted ~2.5 %. `id_mismatch` 0.054 % (baseline ~0.04 %).
>
> ⚠️ **The owner's call came AFTER the deploy it was meant to inform.** Owner, verbatim, *"Yes to both"* (deploy `0340`;
> approve `vfy:true` in production) — given after the owner had already deployed `0340` at 2026-10-07T07:10:45Z. The
> content is on record; the order this task was scoped for did not happen.

## Goal

Give the owner real numbers on how many logins still read `stale` after [[tasks/login-signature-24h-window]] (`0391`,
24 h window, id checked first) went live on 2026-10-06 — so the owner can judge, by eye, whether to deploy `0340`
(S3a, [[tasks/verified-login-enforce]]). Under [[decisions/adr-122-stale-login-gate-owner-judgment]] there is no fixed
window and no pass bar: the task reads whatever data exists and records the owner's one-line call.

**How the scope changed** (all owner rulings, 2026-10-05, kept struck in the brief): first filed as *"stale share at
most 5 % over 7 days"* (the S2-exit re-check, ADR-121 Decision 4) → re-scoped to *"read whatever data exists when
needed, no bar"* (ADR-122) → narrowed to **one look before `0340`'s deploy, then close** (*"After the first look
(Rec)"*). Moved Sprint 8 → Sprint 7 (*"Move to Sprint 7 (Recommended)"*); folder renamed by `git mv`. The later
`verified` readers (`0250` S3b, `0319`, `0332`, `0323`) each carry their **own** owner-look step — they are no longer
this task's.
⛔ **2026-10-07 — those later owner-look steps are no longer gates** ([[decisions/adr-123-login-numbers-monitored-not-gate]],
owner ruling): the numbers are monitored, and the owner re-reads them *"after a few days"* in task `0402` (Sprint 7,
non-blocking, same method as this task). ⚠️ This task's ≈ 22.75 h sample is weekday-only; the weekend-evening window is
not yet measured after `0391`.
📌 *2026-10-09 sync: `0402` closed* — pieces read 2026-10-07/08/09: ≈2.96 % and ≈2.6 % stale, weekday evenings 1.5 % and
3.5 %; the weekend-evening window is **still not measured** — closed by the owner without it
([[tasks/post-0340-login-reread]]).

## Key Changes

Nothing in source. The read, same method as `0373`'s server step (ClickHouse `SELECT` only, `--readonly=1`):

- **First attempt, 2026-10-07 — BLOCKED, no numbers read.** SSH connected and two read-only schema queries ran; the
  first query on the login metric was refused by the Claude Code permission system (auto-mode *"Production Reads"*
  category). The task sat `🚧 Blocked` until the owner chose to have the read run in their own session.
- **The read.** Window **2026-10-06T08:10:30Z → 2026-10-07T06:55Z (≈22.75 h)**, version `0.0.156-profile.2` only, one
  instance, no restart inside it. ⚠️ **Weekday-only, under one day, no weekend evening** — the brief expected ≈3–4 days.

| Outcome | Count | Share |
|---|---|---|
| `ok` | 7,181 | 96.70 % |
| `stale` | 241 | **3.25 %** |
| `id_mismatch` | 4 | 0.054 % |
| `bad_payload` / `absent` | 0 | — |
| **All** | **7,426** | |

- **Stale-age brackets:** `past_24h_48h` 137 · `past_48h_7d` 106 · every bracket under 24 h **0** (the 24 h window
  works as built).
- **By day (UTC):** 6 Oct 2.8 % · 7 Oct (00:00–06:55) 6.0 %. **Night hours stand out** — 6 Oct 22:00 13.7 %, 7 Oct
  00:00 12.2 %, 01:00 **26.1 %** — on tiny counts (34–73 logins an hour). Before `0391` the 20–23 h evenings ran 45–52 %.
- ⚠️ **Unexplained 2-and-2 gap:** the brackets and the per-day / per-hour tables sum to `stale` 243 / `ok` 7,183,
  against 241 / 7,181 in the total — most likely a window-edge difference between queries, **not checked**. It moves the
  share by under 0.03 points.

## Outcome

- **Owner's call (one line), verbatim:** *"Yes to both"* — to *"were the post-0391 login numbers … good enough to deploy
  0340, and do you approve verified logins (vfy:true) being on in production?"* ⚠️ Given **after** the `0340` deploy.
- The second half of that answer is the **separate approval to enforce** (ADR-116, kept by ADR-122); it is recorded in
  `0395`, which owns that gate — this task's look is not itself the approval. See [[tasks/verified-login-enforce-live]].
- **Closed** per the 2026-10-05 *"After the first look (Rec)"* ruling.
- ⚠️ **Not proven by this read:** behaviour over a weekend evening (the data had none); the 2-and-2 gap above.

## Related

- [[tasks/login-signature-24h-window]] — task `0391`, the change whose effect this measures
- [[tasks/stale-login-fix-decision]] — task `0373`, the 33.8 % baseline and the ~2.5 % prediction
- [[tasks/verified-login-enforce]] — task `0340`, the deploy this read was meant to inform
- [[tasks/verified-login-enforce-live]] — task `0395`, which carries the approval-to-enforce half of *"Yes to both"*
- [[decisions/adr-122-stale-login-gate-owner-judgment]] — no fixed window, no fixed bar; the owner judges by eye
- [[decisions/adr-121-login-signature-24h-window]] — the 24 h window; its Decision 4 (≤ 5 % over 7 days) is superseded
- [[tasks/stale-login-signature-age]] — task `0366`, the bracket counter (re-cut by `0391`)
- [[decisions/sprint-7]] — the board (rank 44)
- [[decisions/sprint-8]] — filed there (rank 8) before moving to Sprint 7
- [[systems/player-profile-store]] — the login verification counter
- [[decisions/adr-116-verified-login]] — the verified-login design whose S3a deploy this read preceded
- [[systems/weekend-deploy-window]] — the 2026-10-07 mid-week profile deploy record
- [[tasks/verified-login-live-check]] — task `0339`, the failed S2 check (~32 % stale) this chain answered
- [[tasks/verified-login-shadow-mode]] — task `0325`, the S2 shadow mode whose counter this reads
- [[decisions/adr-123-login-numbers-monitored-not-gate]] — 2026-10-07: the numbers this task read are no longer a deploy gate; `0402` re-reads them non-blocking
- [[tasks/post-0340-login-reread]] — task `0402`, the post-`0340` login-numbers re-read (closed 2026-10-09, ≈2.6 % stale, no weekend read)
