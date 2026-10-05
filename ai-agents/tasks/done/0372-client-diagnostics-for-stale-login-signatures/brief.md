# Client diagnostics for stale login signatures — signature age by boot kind, a second-call check, and held time

## ID
0372

> ℹ️ **ID allocation, checked 2026-10-02 before filing** (method:
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md)). Highest task folder and
> highest `## ID` on all three boards: `0371`. No hit for `0372` / `0373` under `ai-agents/tasks/`,
> `ai-agents/sprints/` or `.claude/`. `0372` and `0373` allocated in this run, in dependency order.

## Sprint
Sprint 7

## Priority
35

> ⚠️ **Priority 35 is append rank, NOT a merit ranking — flagged for owner confirmation.** The owner ruled the
> **deploy slot** (this weekend's game deploy, 2026-10-03/04 — *"This week deploy slot"*), not a rank; this board's
> highest was 34, and writing it higher would renumber closed rows (ADR-035). **On merit this belongs directly
> below `0366`**, with the top group, because it carries a hard date (it must ride the 2026-10-03/04 game deploy)
> and `0373` → the stale-signature fix → `0340` all wait on its data.
>
> 🚨 **DEADLINE — loud on purpose.** To ride the 2026-10-03/04 game deploy this task must be **built, reviewed
> and committed (by the owner) before that deploy runs** — about one day from filing. If it misses, it rides the
> next weekend game slot (2026-10-10/11), and `0373`'s earliest read slides by a week. Missing is allowed; it only
> delays the answer.

## Status
✅ Done (agent-closed — not owner-verified)

📌 **Set 2026-10-02** by `fkit-lead` driving `fkit-sprint-ship-loop`. *(Earlier value, kept as history:)* ~~🔲 Backlog~~

## Owner
fkit-coder

## Context

**Filed 2026-10-02 by a spawned `fkit-producer` with no owner channel (ADR-021/037), on OWNER RULINGS given
2026-10-02 via `AskUserQuestion` in the live `fkit lead` session, relayed by `fkit-lead`.** ⛔ Not producer
precedent. Rulings carried here: **deploy slot** — *"This week deploy slot"* (ride the 2026-10-03/04 game deploy);
**which signature login sends when a second call is made** — *"The original (Recommended)"*. Its partner task
[`0373`](../0373-read-the-stale-login-data-and-choose-the-fix/brief.md) (read the data, choose the fix) was filed in
the same run.

**The problem, in plain terms.** At login the profile server checks Yandex's signed player data
([`0325`](../../done/0325-verified-login-check-yandex-signed-player-data-and-mint-verified-sessions/brief.md) slice
S2, shadow mode — nothing is enforced). About **1 login in 3 is `stale`**: the time stamp inside the signature
(`issuedAt`) is more than 900 s old or more than 300 s ahead. A read-only check on 2026-10-02 (exact ClickHouse
sums, by a spawned coder) found it **flat at ~32–33 %** over ~20 k logins since 2026-09-29 20:05 UTC, with a strong
time-of-day pattern (~21–26 % at 02–06 UTC, ~40–43 % at 20–23 UTC). This blocks
[`0340`](../../backlog/0340-0325-s3a-enforce-mint-verified-sessions/brief.md) (turn the check on), and through it `0332`,
`0323`, `0250` S3b, `0248` and `0301`.

**Why the server counter alone is not enough.**
[`0366`](../../done/0366-measure-how-old-stale-login-signatures-are/brief.md) (done; rides the 2026-10-03/04
**profile** deploy) adds a server counter of stale-signature **age brackets**. An architect consult (2026-10-02,
read-only) found that this cannot pick the fix by itself:

- **Our client cannot be holding a signature older than ~5 min.** It logs in once per page load at startup
  (`src/client/Main.ts:1095`); the signed data is fetched at startup (`src/client/flashist/FlashistFacade.ts:1649`);
  a held copy over 300 s is discarded and refetched (`FlashistFacade.ts:1725`); a re-login after a 401 always
  refetches (`FlashistFacade.ts:1706-1707`, `:1715`). So brackets of 20 min and more come from **Yandex**, not our
  hold. `past_15m_20m` stays ambiguous.
- **Leading hypothesis (inferred, unproven):** every match exit reloads the game in the same tab
  (`FlashistFacade.ts:950-965`; the launch query string is kept per `0331`, `:961`). Each reload is a new boot and a
  new login. If Yandex returns the **same** signed data for the whole visit, every reload more than 15 min after
  the visit started is stale — which fits ~1 in 3 and the evening peak.
- **What `0366` cannot tell:** which Yandex mechanism; **whether a second Yandex call returns a newer `issuedAt`
  (this decides the fix)**; first boot vs after-match reload; device split; a few heavy players vs everyone.

This task adds the client-side readings that answer those questions. **It changes no behaviour** — login sends
exactly what it sends today.

**Already in place, reused here:** GameAnalytics already splits every event by device (custom dimension 01,
`FlashistFacade.ts:614`) and by build (`configureBuild`, `FlashistFacade.ts:618`). Whether this boot follows a
match exit is already known as `bootFollowsMatchExit` (`FlashistFacade.ts:596`, task `0328`).

## What to build

**Client only, analytics only. No profile-server change. No change to what login sends, when, or how it reacts.**
All new event strings follow the project's `Category:Action[:…]` form (PascalCase parts, colon-separated, no
underscores), are defined through the enum in `src/client/flashist/FlashistFacade.ts` (never inline), and are
documented in [`analytics-event-reference.md`](../../../knowledge-base/analytics-event-reference.md).

### A1 — the signature's age, by boot kind
1. **Whenever login takes a signature** (every path in `takeYandexPlayerSignature()` that returns one — today the
   held `Ready` path and the `Waited` path), read `issuedAt` from the **payload half** of the `<signature>.<payload>`
   envelope: decode, parse, read the one top-level field (seconds). The server's reader
   (`src/profile-server/PlayerSignature.ts`) is the reference for the format.
2. **The decoder must never throw** and must read **only** `issuedAt`. Anything wrong (no dot, bad base64, not JSON,
   `issuedAt` missing or not a finite number, absurd length) gives an `Unreadable` result. The decoded payload also
   holds the player's public name and avatar (152-ФЗ) — it is dropped at once, never kept, logged or sent.
3. **Bracket the age** (`device now − issuedAt`) with **exactly the edges `0366` uses on the server**
   (`src/profile-server/Telemetry.ts:119-127`): `Fresh` for the ok window (at most 900 s old and at most 300 s
   ahead — both limits inclusive, as on the server), otherwise one of the eight `0366` brackets
   (`future_5m_15m` … `past_over_24h`), plus `Unreadable`. The event spelling is PascalCase without underscores
   (e.g. `past_15m_20m` → `Past15m20m`); the plan picks the exact spelling, and the reference doc must carry the
   one-to-one mapping to `0366`'s labels.
4. **Fire `Profile:Login:SignatureAge:<FirstBoot|AfterMatch>:<Bracket>`** — boot kind from `bootFollowsMatchExit`.
   No event value. ⚠️ That is five parts — the plan confirms it is inside GameAnalytics' event-id limits.
5. **Device-clock caveat.** A1 uses the device's clock, which may be wrong. That is why `0373` first checks that
   the client's own non-`Fresh` share is close to the server's ~32 %; A2 below needs no clock at all.

### A2 — does a second Yandex call return a newer `issuedAt`?
1. **When A1's age is past-stale (more than 900 s old)** — not `Fresh`, not future, not `Unreadable` — make **one**
   more `getPlayer({ signed: true })` call and compare its `issuedAt` with the first one (both from Yandex, so no
   clock is involved).
2. **Fire `Profile:Login:Signature:Refetch:<Newer|Same|Failed>`**: `Newer` = strictly later; `Same` = equal;
   `Failed` = the call threw, gave no usable signature, was `Unreadable`, or hung past the safety net. An `issuedAt`
   **earlier** than the first is not expected; the plan decides how to record it (recommended: a fourth label
   `Older`, because folding it into any of the three would mislead `0373`'s reading).
3. **OWNER RULING (2026-10-02): login sends the ORIGINAL signature regardless** (*"The original (Recommended)"*), so
   `0366`'s server readings stay clean. The second call must **not delay** the login request — login is sent with
   the original as today, and the comparison happens alongside or after it. The second signature is used **only**
   for the comparison and dropped at once: never sent, stored, logged, or assigned to `yandexSdkPlayerObject`
   (the rule at `FlashistFacade.ts:1654-1656`).
4. **Guard against Yandex's call limit.** Yandex documents a limit of **20 player calls per 5 minutes**; whether a
   plain `getPlayer()` counts toward it is unclear. The build guards by construction:
   - **at most one refetch per page load** (a page-load flag), **never** on the re-login-after-401 path, **never
     retried**;
   - so a page load makes at most one extra call, and only when the first signature was past-stale. A normal page
     load already makes the plain `getPlayer()` and the signed pre-fetch (plus a fresh call on re-login); match
     reloads are minutes apart.
   - If Yandex refuses the call for any reason, it is simply counted `Failed` — the login was already sent and is
     unaffected. The plan states the worst case (rapid manual reloads) in numbers.

### A3 — how long the boot pre-fetch was held
- Put the **held time in ms** (`askedAt − fetchedAt` of the held pre-fetch) as the **value** on the existing
  `Profile:Login:Signature:Ready` event (`FlashistFacade.ts:1733`). The event name and when it fires are unchanged;
  `Waited` / `Timeout` / `Failed` are unchanged. Update the event's row in the reference doc.

### Privacy — hard limits
- Events carry **brackets, fixed labels, and one number (A3's ms)** only. **Never** the raw `issuedAt`, the payload,
  the signature, the player id, a token, or anything else derived from the player.
- Nothing here writes a log line containing any of the above (`0325`'s no-leak rule).

### Not in scope
- **A4** (a server-side boot-kind label) — skipped by the caller's instruction.
- Any profile-server change; any fix; any retune of the 900 s / 300 s window; any change to which signature login
  sends.
- **Reading the data.** That is [`0373`](../0373-read-the-stale-login-data-and-choose-the-fix/brief.md) (owner
  standing rule 2026-09-29: build and verify are split; the reading needs a deploy and the owner).

## Verification steps

1. **Decoder unit tests:** a well-formed envelope returns `issuedAt`; each malformed shape (no dot, bad or
   URL-safe/unpadded base64 per the server's reference behaviour, not JSON, `issuedAt` missing / string / `NaN` /
   `Infinity`, over-long input) returns `Unreadable` and **never throws**. A test shows the decoder returns
   nothing but the number.
2. **Bracket edge tests:** exactly 900 s old and exactly 300 s ahead → `Fresh`; one step past each edge → the
   lowest past / future bracket; one value inside every bracket; far past → the top bracket. A test pins the client
   edges to the same numbers as `0366`'s server edges (so the two cannot drift apart silently).
3. **Boot kind:** with `bootFollowsMatchExit` true → `AfterMatch`; false → `FirstBoot`.
4. **A2 tests:** fires only on past-stale; at most once per page load; not on the re-login path; `Newer` / `Same` /
   `Failed` (and the plan's choice for older) each produced; a thrown SDK call and a hung call → `Failed`.
   **The login request carries the original signature and is not held up by the second call** (tested).
5. **A3:** `Ready` carries the held ms; `Waited` and the others unchanged (existing tests still pass).
6. **Fail-safe:** a simulated fault inside A1, A2 or A3 does not throw into login and does not change what login
   sends. Tested.
7. **No leak:** a test asserts no new event string or value contains the signature, payload, raw `issuedAt`, or a
   player id; the existing no-leak tests still pass.
8. **Docs:** every new event, the bracket mapping to `0366`'s labels, and the `Ready` value are in
   `analytics-event-reference.md`; the enum holds every string.
9. `npm test` green, `npm run lint` clean, `tsc --noEmit` clean. If a known `supertest` flake or `0197`'s segfault
   shows, re-run and say so (CLAUDE.md).
10. **Deploy recorded** in the worklog: which game deploy carried it (date and build), or that it missed the
    2026-10-03/04 slot and why. Reading the events is **not** this task's close condition — that is `0373`.
11. No secret, key, real player id, signature, token, host, IP or launch-query content in any committed artifact.

## Notes

- **Depends on:** nothing.
  *(`0325`'s S2 client code is in the tree; `0366` is not needed to build this — only to read it, in `0373`.)*
- **Blocks:** [`0373`](../0373-read-the-stale-login-data-and-choose-the-fix/brief.md) (hard — it reads this task's
  events once deployed).
- **Chain after `0373`** (not filed): the chosen fix → an S2-exit re-check with the owner →
  [`0340`](../../backlog/0340-0325-s3a-enforce-mint-verified-sessions/brief.md).
- **Caveat carried for `0373`:** on the server, `stale` is decided **before** the id check
  (`src/profile-server/LoginVerification.ts:34` runs before `:45`), so "the right player" is **not** proven for
  stale logins.
- **Related:** [`0366`](../../done/0366-measure-how-old-stale-login-signatures-are/brief.md) (server brackets) ·
  [`0339`](../../done/0339-verify-0325-s2-live-the-login-signature-check-in-production/brief.md) (the S2 readings) ·
  [`0328`](../../done/0328-analytics-event-session-platform-degraded-by-cause/brief.md) (`bootFollowsMatchExit`) ·
  [`0331`](../../done/0331-keep-the-query-string-on-match-exit/brief.md) (launch query kept on match exit) ·
  [ADR-116](../../../knowledge-base/decisions/adr-116-first-verified-identity-yandex-signed-player-data-at-login.md)
  · [ADR-113](../../../knowledge-base/decisions/adr-113-profile-internal-player-id-and-platform-identities.md)
  (privacy).
- **Effort:** small — a guess, not an estimate from a plan.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
