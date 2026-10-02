# Worklog — 0339

**Written 2026-10-01 by a spawned `fkit-producer` (no owner channel, ADR-021/037), on an OWNER RULING given
live in the `fkit lead` session on 2026-10-01 and relayed by `fkit-lead`.** ⛔ Not producer precedent.
**Every reading below was taken by `fkit-lead` on 2026-10-01 through the owner's logged-in Chrome, read-only**
(Uptrace and GameAnalytics), plus the owner's own in-game screenshot for the game version. **The producer
verified none of it.** Counts and durations only — no player id, signature, token, session, host, IP or URL
(verification step 8).

## Result

**VERIFICATION FAILED — S2 exit NOT MET.** Follow-up filed as
[`0366`](../0366-measure-how-old-stale-login-signatures-are/brief.md) (measure how old the `stale` login
signatures are). Per this brief's verification step 6: `0325` is **not** reopened, `0340` is **not** started,
and this task closes with this failed result recorded.

## Step 1 — the deploy record

- Date: **2026-09-29** (a Tuesday).
- Order: **telemetry → game → profile**, as owner-ruled 2026-09-29 (see the brief's *Context*).
- Profile server with S2 up: **20:04:48 UTC**.
- Game version: **0.0.155** — from the owner's in-game screenshot footer, 2026-10-01. *(The 2026-09-29
  addendum in the brief recorded the version as "not recorded"; this fills that gap.)*
- Full deploy record: [weekend-deploy-slot runbook](../../../knowledge-base/weekend-deploy-slot-runbook.md)
  § *What happened 2026-09-29*.

## Step 2 — the server metric (Uptrace)

- **The counter exists** — as `geoconflict_profile_login_verification`. ✅
- **Window:** 2026-09-29 20:06 UTC → 2026-10-01 12:09 UTC (≈40 h, ≈2,400 min). This is the window the lead
  read and the owner accepted with the recommendation (see Step 4); **the owner did not name a window in
  their own words.**
- **Method:** `perMin(sum)` averages by `outcome`, multiplied by the minutes in the window. ⚠️ **Totals are
  approximate** (rounded averages × minutes), not exact counts.

| `outcome` | Avg / min | ≈ Total over window | Share of all |
|---|---|---|---|
| `ok` | 3.4 | ≈ 8,200 | ≈ 68 % |
| `stale` | 1.6 | ≈ 3,800 | ≈ 32 % |
| `absent` | 0.011 | ≈ 26 | ≈ 0.2 % |
| `id_mismatch` | 0.0034 | ≈ 8 | < 0.1 % |
| `bad_signature` | — | **0** (never appeared) | 0 |
| `bad_payload` | — | **0** (never appeared) | 0 |
| `no_secret` | — | **0** (never appeared) | 0 |

- The metric had **exactly 4 timeseries** over the window (`ok`, `stale`, `absent`, `id_mismatch`) — the
  three zero rows are "no series at all", not a small number.
- **`ok` share:** ≈ **68 %** of all logins, and ≈ **68 %** of logins **with** a signature (`absent` is too
  small to move it).
- **Last hour** (≈ 11:10–12:10 UTC, 2026-10-01): `ok` 6.8/min, `stale` 3.7/min — ≈ **35 % stale. Not
  falling.**
- **`absent` over the window:** tiny throughout (≈ 26 in 40 h). It never had a share to fall from — see the
  side finding below.
- **`bad_payload` / `id_mismatch` / `no_secret` "more than a trickle"?** No. `bad_payload` and `no_secret`
  are zero; `id_mismatch` ≈ 8 in 40 h is a trickle. Not a trigger for step 6 on its own — the trigger is the
  owner's "not met".

## Step 3 — the client events (GameAnalytics)

Design events `Profile:Login:Signature:*`, days **2026-09-29 and 2026-09-30** (2026-10-01 not yet in
GameAnalytics when read).

| Event | 09-29 | 09-30 | Total | Share |
|---|---|---|---|---|
| `Ready` | 712 | 7,680 | ≈ **8,390** | ≈ 99.5 % |
| `Waited` | 5 | 41 | **46** | ≈ 0.5 % |
| `Timeout` | 0 | 0 | **0** | 0 |
| `Failed` | 0 | 0 | **0** | 0 |

- **`Waited` ms:** mean **575 ms** (09-29) and **810.85 ms** (09-30). ⚠️ **Mean only** — GameAnalytics offered
  no median or percentile, so the spread the brief asks for is **not available**.
- **`Timeout`:** **0.** The 60 s safety net never fired.
- **Plain reading:** the signed call is almost always ready before login asks for it, and never hung. Slowness
  and hangs are **not** the problem.
- ⚠️ GameAnalytics showed a *"You're viewing data in Demo mode"* banner. The data contains this project's own
  custom events, so it reads as real — but it is noted, not proven.
- These days do not line up with Step 2's window (GA stops at the end of 09-30; Uptrace runs to 10-01 12:09),
  so the two sources are **not** compared count-for-count.

## Step 4 — the owner's S2 exit call

- **Answer: S2 exit NOT MET.**
- **Owner's words, verbatim: "Agree"** — 2026-10-01, typed in prose in the live `fkit lead` session, relayed by
  `fkit-lead` to this spawned producer. It answered the lead's recommendation: *"`0339` Step 4: **not met for
  now**, plus a small task to **measure how old the `stale` tickets are**, aiming for Saturday's profile deploy
  if it's ready in time."*
- **Window:** the one in Step 2 (the lead's reading window; the owner accepted it with the recommendation).
- **Threshold: none stated as a number.** The owner accepted the lead's reading that ≈ 68 % `ok` is not a
  "large majority": once routes require `verified` (`0250` S3b, `0319`, `0323` / `0332`), about **1 in 3 real
  logins** would be treated as unverified.
- Context, not a reason for the call: `0340` itself is fail-open — a `stale` login gets `vfy:false` and is
  never refused (`0340` brief § *Fail behaviour*; `src/profile-server/Routes.ts` ~:685). The cost of enforcing
  today is in the routes that will later read `verified`, not in `0340`.

## Step 7 — the `stale` record, for `0340`'s window decision

- `stale` ≈ **3,800** over ≈ 40 h, ≈ **32 %** of all logins, ≈ 35 % in the last hour — **steady, not
  shrinking.**
- **Cause: UNKNOWN.** What is ruled out, and why:
  - **Our server clock** — NTP-synced, matches real time (checked 2026-09-29).
  - **The game reusing an old signature** — the client throws away a pre-fetched signature older than 300 s
    and fetches a fresh one (`SIGNED_PLAYER_HELD_MAX_AGE_MS = 300_000`,
    `src/client/flashist/FlashistFacade.ts` ~:479).
  - **Old game versions** — a pre-0.0.155 client sends no signature, so it is counted `absent`, not `stale`
    (every no-signature login is classified — `src/profile-server/Routes.ts` ~:719–730), and `absent` ≈ 26.
    Also: the old-version share of daily players fell from ≈ 30 % (09-30) to ≈ 14 % (10-01, partial day) per
    the owner's GameAnalytics screenshots, while `stale` stayed ≈ 1/3.
- **Leading suspect — UNVERIFIED:** the `issuedAt` inside Yandex's signed data is sometimes far from "now",
  even on a fresh `getPlayer({signed:true})` call. The server calls a signature `stale` when `issuedAt` is more
  than 900 s old or more than 300 s ahead (`src/profile-server/PlayerSignature.ts` ~:82–94).
- **Why the 900 s / 300 s window is NOT simply retuned now:** the counter does not say *how* far off `issuedAt`
  is. Just past 900 s means retune the window; hours or days means Yandex hands back an old `issuedAt` and a
  wider window would accept old signatures (a different fix); ahead of now means a clock problem. That is what
  [`0366`](../0366-measure-how-old-stale-login-signatures-are/brief.md) measures.

## Side finding — open, not a defect yet

- GameAnalytics shows ≈ 14–30 % of daily players still on pre-0.0.155 builds, yet the server saw almost no
  signature-less logins (`absent` ≈ 26).
- Uptrace `geoconflict_profile_login_requests` by `outcome`, same window: `existing` 4.6/min, `created`
  0.39/min, `bad_request` 0.0022/min (≈ 5). **No failure outcomes** — old-build logins are not failing *at the
  server*; they mostly do not arrive.
- **Not determined:** harmless (tabs opened before the deploy, so no new login) vs. old cached builds not
  reaching the server. A GameAnalytics split of `Profile:Login:*` events by build would tell; the lead's
  attempt was abandoned (the GA UI misbehaved). Carried into `0366` as an **optional** sub-check.

## Verification steps — where each stands

| # | Step | Result |
|---|---|---|
| 1 | Deploys named, dated, ordered | ✅ Step 1 |
| 2 | Metric present in Uptrace | ✅ present |
| 3 | All seven outcomes, window, two `ok` shares | ✅ Step 2 (totals approximate) |
| 4 | Four event counts, `Waited` spread, `Timeout` count | ⚠️ counts ✅, `Timeout` ✅ 0; `Waited` **mean only** — no spread available |
| 5 | Owner's window, threshold, answer in own words | ⚠️ answer ✅ verbatim; window = the lead's, accepted; **no numeric threshold given** |
| 6 | "Not met" ⇒ new task, `0325` not reopened, `0340` not started, this closes failed | ✅ `0366` filed; `0325` untouched; `0340` not started |
| 7 | `stale` recorded | ✅ Step 7 |
| 8 | No id / signature / token / session / host / IP / URL | ✅ counts and durations only |

## 📌 2026-10-02 — CORRECTION: `absent` and `id_mismatch` counts (appended after close; nothing above edited)

**Provenance.** A read-only check on 2026-10-02 by a spawned coder (exact ClickHouse sums over the same metric),
relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037). The producer did not run
the query. This note corrects two numbers only; the task's result and close are unchanged.

- **`absent` (no signature): exact count = 1 across all of S2**, not ≈ 26. The ≈ 26 above was a **method
  artifact**: Step 2 multiplied a per-minute average by the window length, but the `absent` series existed only
  briefly, so the average over its short life was spread across the whole 40 h.
- **`id_mismatch`: 6 in this task's window**, not ≈ 8 (same method artifact, smaller effect).
- **`ok` / `stale` shares are not affected** — the exact read gives 31.9 % `stale` for this window, matching the
  ≈ 32 % above.
- **What still holds:** old builds are still ruled out as a cause of `stale` (Step 7) — more strongly, since almost
  no signature-less logins arrive at all. The side finding (old builds mostly do not reach the server) is, if
  anything, sharper.
- Follow-ups: [`0372`](../0372-client-diagnostics-for-stale-login-signatures/brief.md) and
  [`0373`](../../backlog/0373-read-the-stale-login-data-and-choose-the-fix/brief.md) (filed 2026-10-02).
