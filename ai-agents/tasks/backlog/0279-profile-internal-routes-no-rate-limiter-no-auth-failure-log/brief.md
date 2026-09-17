# Profile box: the four `/internal/*` routes have no rate limiter, and `internalAuth` logs nothing when it rejects

## ID
0279

## Sprint
Backlog

## Priority
Unscheduled

⚠️ **Producer's rank if this is ever pulled into a sprint: Medium — NOT owner-ruled.** Placement on the
Backlog board rather than Sprint 4 is also the **producer's** call, not the owner's: this is hardening,
nothing is broken today, and Sprint 4 is already long.

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**Found by:** the [`0276`](../../done/0276-profile-internal-path-case-variants-bypass-nginx-allowlist/brief.md)
planner, and **explicitly ruled out of `0276`'s scope**. Filed 2026-09-16 by a spawned `fkit-producer`
from the ship-loop driver's instruction — **not an owner ruling**; the producer had no owner channel.

**The gap, in two parts.**

1. **No rate limiter on `/internal/*`.** `src/profile-server/Routes.ts` mounts three rate limiters —
   `profileReadLimiter`, `paymentsLimiter` and `nameChangeLimiter` — and every one of them is
   **per-route**, on player-facing paths. **None** is mounted on `/internal/*`. All four internal routes
   are therefore unthrottled:
   - `POST /internal/v1/players/resolve`
   - `POST /internal/v1/credit`
   - `POST /internal/v1/messages/send`
   - `POST /internal/v1/name-change/decide`
2. **No signal when internal auth rejects.** `internalAuth`
   (`src/profile-server/InternalAuth.ts:21`) answers `401 {"error":"unauthorized"}` and **logs
   nothing** — no counter, no warning, no line anywhere. A rejected internal call is invisible.

**Why it matters — and the honest severity.** Combined with `0276`'s case-variant bypass (which lets any
host on the internet reach these routes past the nginx IP allowlist), the two gaps together make an
**unbounded, unthrottled and completely silent guessing oracle** against `PROFILE_INTERNAL_TOKEN`.

⛔ **Do not inflate this.** `PROFILE_INTERNAL_TOKEN` is a high-entropy shared secret, and `internalAuth`
fails **closed** (an empty or unset expected token rejects every request, and the comparison is a
`timingSafeEqual` on equal lengths). **It is not exploitable by guessing in practice.** What is actually
missing is **the throttle and the signal** — not the authentication.

**Division of labour with `0276`, so neither task is mistaken for the other:**

| Task | Restores |
|---|---|
| [`0276`](../../done/0276-profile-internal-path-case-variants-bypass-nginx-allowlist/brief.md) | the **network layer** — case-variant `/internal/` paths stop reaching the app at all |
| **this task** | the **rate limit** and the **failure log** on the app layer |

⚠️ **`0274` (S5) does NOT cover this.** S5 adds a `session.rejected` counter for **sessions** — the
player-facing login path — **not** for `internalAuth`. So internal-auth failures stay invisible to
monitoring **even after S5 is live**. Anyone reading the S5 dashboard and assuming internal-auth
rejections would show up there is wrong; that is exactly the assumption this brief exists to correct.

**Not in scope — and deliberately so:** `POST /v1/login`'s missing rate limiter. That one is
**owner-accepted** and recorded in place in `Routes.ts` (S5's monitoring replaces it; junk profile rows
are the accepted, monitored risk). Do not "fix" it here.

### 📌 Box-side evidence for the `/internal/` boundary already exists — inherit it, 2026-09-17

`0276` left a concrete, **re-runnable** evidence set for the internal surface on the deployed box:
**eleven read-only probes from a non-allowed host** — three case variants (`/INTERNAL/`, `/Internal/`,
`/iNtErNaL/`), four edge forms (`/%49NTERNAL/`, `//internal/`, `/./internal/`, trailing slash) and all
four internal routes (`credit`, `players/resolve`, `messages/send`, `name-change/decide`), **403 on every
one** — **plus one read-only probe from the allowed game box**, which returned **401**, proving the
allowlist still lets the game server reach `internalAuth`.

All are plain `curl`s; **none changes anything on either box**. They are the baseline this task's limiter
and failure log must not break: after this task, a non-allowed host must still get **403** (nginx answers
first, so no limiter or log line should fire at all), and the allowed host must still reach
`internalAuth`. **Re-run the set rather than rediscover it.** Recorded in
[`0276`](../../done/0276-profile-internal-path-case-variants-bypass-nginx-allowlist/brief.md)'s closing
record. ⚠️ Deployed nginx is **1.28.3** — build-time container probes on 1.31.5 are corroboration, not
the same evidence.

## What to build

Restore the two missing controls on the internal surface. **Scope suggestion below is the producer's,
not owner-ruled** — the plan may argue a different shape, but it must cover both parts:

1. **A rate limiter covering `/internal/*`** — mounted so it applies to all four internal routes at once
   (and to any internal route added later), rather than per-route where a new route can be forgotten.
   Pick a budget generous enough that the game server's real credit/resolve traffic never trips it
   (the plan must state the expected legitimate rate and show the budget clears it with margin) and
   tight enough to make token guessing pointless.
2. **A rate-limited warning on `internalAuth` failure**, carrying:
   - ⛔ **no token material** — not the provided token, not a prefix, not a length, not a hash;
   - ⛔ **no request body** and no player/platform ids;
   - the route path and a coarse outcome are enough. The **log line itself must be rate-limited or
     counted-and-summarized**, or the missing-signal fix becomes its own log-flood amplifier on the same
     unthrottled surface.
3. Decide and state in the plan whether the failure signal should also be a **metric/counter** (so
   monitoring can alert on it) or a log line only. Producer's input: a counter is what makes it
   *observable*; a log line alone repeats the `0219` pattern where a thing works and nothing would ever
   tell you it stopped.
4. **Interaction with the order of middleware:** `Routes.ts`'s top-of-`createApp` region is contended —
   `0274` adds timing middleware there and `0276` adds `app.set(...)` above it. Read both before
   choosing where the limiter mounts, and say in the plan where it sits relative to them and why.

## Verification steps

1. **Limiter applies:** a test drives one internal route past the configured budget and gets `429`;
   the same test at the budget still gets the route's normal answer (`401` without a token, or `200`
   with one).
2. **All four routes covered:** a test asserts the limiter is in effect for `players/resolve`, `credit`,
   `messages/send` **and** `name-change/decide` — not just the one that was easiest to test.
3. **Legitimate traffic unaffected:** a test at the stated expected game-server rate never hits `429`.
4. **Failure log fires:** a request with a wrong/absent token produces exactly one warning (or one
   counter increment) per the chosen design.
5. **Nothing sensitive in the log:** a test asserts the emitted line contains **no** part of the
   provided token, **no** request body, and **no** ids. Grep the test's captured output, do not eyeball
   it.
6. **The log cannot flood:** a burst of failed calls produces a bounded number of lines (or one summary),
   not one line per request.
7. **Public routes unchanged:** `/health`, `/ready`, `/v1/profile` and `/v1/login` answer exactly as
   before — in particular `/v1/login` gains **no** limiter (see Context).
8. `npm test` green (including the unconditional shell-harness gate), `npx tsc --noEmit` and
   `npm run lint` both exit 0.
9. No secrets, hosts, IPs or tokens in the brief, plan, worklog, review or any test fixture.

## Notes

- **Depends on:** nothing
- **Related:** [`0276`](../../done/0276-profile-internal-path-case-variants-bypass-nginx-allowlist/brief.md)
  (same defect family — `0276` restores the network layer, this restores the rate limit and the log;
  neither is a substitute for the other), [`0217`](../0217-profile-p2-wire-game-server-to-profile-box/brief.md)
  (sets `PROFILE_INTERNAL_TOKEN` on both sides and is the task that first puts real traffic on these
  routes), [`0274`](../0274-profile-identity-s5-monitoring-and-creation-switch/brief.md) (its
  `session.rejected` counter does **not** cover `internalAuth` — see Context)
- **Sequencing (soft — merge-conflict avoidance, not a dependency):** `0274` and `0276` both edit the
  top of `createApp` in `src/profile-server/Routes.ts`. Build this after both land.
- **Effort estimate:** producer's guess, half a day or less. Not validated by the architect or a plan.
- 🔒 No secrets, hosts, IPs, player ids or token material in any artifact.
- **Do not invoke the mover skills** — producer-only (ADR-033).
