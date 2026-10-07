# 0396 — worklog

## 2026-10-07 — rehearsal of the owner's live check (§4), BEFORE the S3b deploy

**Not the verification.** S3b is not live: production profile is `0.0.156-profile.3` (commit `71efd10`, `0340`
only; S3b deliberately excluded — `0395` worklog). Every session gets the S1 view today, so these results prove only
that the steps work, not S3b's behaviour.

Steps: [`snippets.md`](snippets.md) (written in-session from the code — login contract, routes, projection; first run
was this rehearsal).

| Check | Run by | Result today | Meaning |
|---|---|---|---|
| 1 — verified paid account, Network → `v1/profile` → Preview | owner | no `is_paid_citizen` key | expected pre-S3b; steps work |
| 2 — Console snippet, unverified session | owner | `is_paid_citizen key present: false` | expected pre-S3b; snippet works in the game iframe on production |

- Side effect: one no-signature (`absent`) login added to the profile server's login counters on 2026-10-07, inside
  `0402`'s window.
- No token, id, response body or URL recorded here.

## Gates — state on 2026-10-07

1. `0340` deployed in an earlier slot — ✅ 2026-10-07T07:10:45Z (`0395`).
2. `0395` confirmed `vfy: true` live — ✅ 2026-10-07.
3. Owner's look at the post-`0391` numbers — **removed** by OWNER RULING 2026-10-07 (ADR-123); re-read for
   information only in `0402`.
4. Weekend slot — open.
