# Verify the Login Signature Check Live — Shadow Mode in Production (task 0339)

**Source**: `ai-agents/tasks/done/0339-verify-0325-s2-live-the-login-signature-check-in-production/brief.md` (readings from the same folder's `worklog.md`)
**Status**: done (agent-closed — not owner-verified) — **closed as a FAILED verification**
**Sprint/Tag**: Sprint 7, rank 25 (append rank; owner-ruled first of the three rows moved from Sprint 6) / task `0339`

> ✅ Done (agent-closed — not owner-verified), 2026-10-01 — 🚨 **VERIFICATION FAILED: the S2 exit was NOT met.**
> About **68 % `ok`, 32 % `stale`, and the `stale` share is not falling.** The owner agreed (*"Agree"*, live
> `fkit lead` session, relayed by `fkit-lead`). Per the brief's own step 6: `0325` is **not** reopened, `0340`
> (S3a — mint verified sessions) is **not** started, and a follow-up, **`0366`** (measure how old the `stale`
> signatures are), was filed and moved onto [[decisions/sprint-7]]. `0340` now waits on `0366`.

## Goal

[[tasks/verified-login-shadow-mode]] (`0325`) built **S2, shadow mode**: at login the profile server checks
Yandex's signed player data and **only records the result** — every session is still `vfy:false`. It was proven in
tests only. This owner-run, **read-only** task is the live half: do real logins pass (`ok`), how often do they fail
and why, and is `ok` *"the large majority"* — the S2 exit set in `0325`'s plan — so that S3a may be considered.

It was filed 2026-09-29 on owner ruling *"Split it (Recommended)"* (close `0325` as the build, verify live here,
S3a as `0340`), and follows the owner's standing build/verify-split rule. It was moved Sprint 7 → Sprint 6 → back
to Sprint 7 the same day by owner rulings; it never blocked a deploy.

What it read: the server counter `geoconflict.profile.login.verification` (one label, `outcome`, seven values —
`ok`, `absent`, `bad_signature`, `bad_payload`, `stale`, `id_mismatch`, `no_secret`) and the four
`Profile:Login:Signature:*` client events ([[systems/analytics]]).

## Key Changes

Nothing was built. The readings, taken by `fkit-lead` on 2026-10-01 through the owner's logged-in browser,
read-only; **the producer that recorded them verified none.** Counts and durations only.

- **Step 1 — deploy:** 2026-09-29 (a Tuesday), order **telemetry → game → profile** as owner-ruled; game version
  `0.0.155` (from the owner's in-game screenshot — this fills the "not recorded" gap). Full record:
  [[systems/weekend-deploy-window]].
- **Step 2 — server metric** (the counter exists, as `geoconflict_profile_login_verification`). Window
  2026-09-29 20:06 → 2026-10-01 12:09 UTC (≈ 40 h). ⚠️ **Totals are approximate** (per-minute averages × minutes):

  | `outcome` | ≈ total | share |
  |---|---|---|
  | `ok` | ≈ 8,200 | ≈ 68 % |
  | `stale` | ≈ 3,800 | ≈ 32 % (≈ 35 % in the last hour — **not falling**) |
  | `absent` | ≈ 26 | ≈ 0.2 % |
  | `id_mismatch` | ≈ 8 | < 0.1 % |
  | `bad_signature`, `bad_payload`, `no_secret` | **0** — no series at all | 0 |

- **Step 3 — client events** (GameAnalytics, 2026-09-29 and 09-30): `Ready` ≈ 8,390 (≈ 99.5 %), `Waited` 46
  (mean 575 / ≈ 811 ms — ⚠️ **mean only**, no percentile was available), `Timeout` **0**, `Failed` **0**. Plain
  reading: the signed call is almost always ready and never hung — **slowness and hangs are not the problem.**
  ⚠️ GameAnalytics showed a *"Demo mode"* banner; the data has this project's own events, so it reads as real —
  noted, not proven. The two sources cover different days and were not compared count-for-count.
- **Step 4 — the owner's call:** **S2 exit NOT met.** **No numeric threshold was stated**; the window is the
  lead's reading, which the owner accepted with the recommendation. The reasoning accepted: once routes require
  `verified` (`0250` S3b, `0319`, `0323` / `0332`), about **1 real login in 3** would be treated as unverified.
  (`0340` itself is fail-open — a `stale` login just gets `vfy:false` — so the cost lands in those later routes.)

## Outcome

- 🚨 **The cause of `stale` is UNKNOWN.** Ruled out: the profile box clock (NTP-synced); the game reusing an old
  signature (the client drops a pre-fetched one older than 300 s and fetches fresh — `SIGNED_PLAYER_HELD_MAX_AGE_MS`
  in `src/client/flashist/FlashistFacade.ts`); old game builds (they send no signature, so they count as `absent`,
  not `stale`).
- **Leading suspect — UNVERIFIED:** the `issuedAt` inside Yandex's signed data is sometimes far from "now", even on
  a fresh call. The server calls a signature `stale` when `issuedAt` is more than 900 s old or more than 300 s ahead
  (`src/profile-server/PlayerSignature.ts`).
- **Why the 900 s / 300 s window was NOT simply widened:** the counter does not say *how far off* `issuedAt` is.
  Just past 900 s → retune the window; hours or days → Yandex hands back an old `issuedAt`, and a wider window would
  accept old signatures (a different fix); ahead of now → a clock problem. **`0366` measures exactly that** — a
  past/future age bracket on `stale` only, no ids or signatures, profile server only. Owner rulings 2026-10-01: Q1
  *"Move to Sprint 7 (Recommended)"*, Q2 *"Fold into the re-check (Recommended)"* (no separate verify task — reading
  the brackets is part of the S2-exit re-check before `0340`; an exception to the build/verify-split rule for `0366`
  only), Q3 *"Stale only (Recommended)"*. It aims at Saturday's (2026-10-03/04) profile deploy, or waits until `0297`
  §1 has read `0309`'s log line ([[tasks/hmac-construction-log-label]]).
- **Side finding, open, not a defect yet:** GameAnalytics shows ≈ 14–30 % of daily players still on pre-`0.0.155`
  builds, yet the server saw almost no signature-less logins, and the login-request counter shows no failure
  outcomes — old-build logins mostly **do not arrive**. Harmless (tabs opened before the deploy) vs. old cached
  builds not reaching the server is **not determined**; carried into `0366` as an optional sub-check.
- **Verification steps:** 1–3, 6–8 met; **4 partial** (`Waited` mean only, no spread); **5 partial** (answer
  verbatim, but no numeric threshold and the window was the lead's).

## Related

- [[tasks/verified-login-shadow-mode]] — task `0325`, the S2 build this verified (not reopened)
- [[decisions/adr-116-verified-login]] — the decision; S3a (`0340`) starts only after the S2 exit is met **and** the owner approves
- [[decisions/sprint-7]] — the board; `0366` and `0340` sit here
- [[decisions/sprint-backlog]] — where `0366` was filed before it moved to Sprint 7
- [[systems/analytics]] — the four `Profile:Login:Signature:*` events read here
- [[systems/player-profile-store]] — the profile login and its verification counter
- [[systems/weekend-deploy-window]] — the 2026-09-29 deploy this read
- [[tasks/hmac-construction-log-label]] — task `0309`, whose log line must be read before a second profile deploy
