# Client Diagnostics for Stale Login Signatures — Age by Boot Kind, a Second-Call Check, Held Time (task 0372)

**Source**: `ai-agents/tasks/done/0372-client-diagnostics-for-stale-login-signatures/brief.md` (what was built and proven: its Sprint 7 board row in `ai-agents/sprints/plan-sprint-7.md`; the events: `ai-agents/knowledge-base/analytics-event-reference.md` § *Profile Login Signature Age Events*)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 7, rank 35 (append rank — ⚠️ **not** a merit rank; owner ruling *"Leave the number, start now (Recommended)"*) / task `0372`

> 📌 **2026-10-06 sync — read, and now frozen.** `0373` read these events (with the server brackets): ≈ 87–88 % of
> stale logins were after-match reloads; the refetch returned the same data ≈ 99 % of the time
> ([[tasks/stale-login-fix-decision]]). Since `0391` (deployed 2026-10-06) the server window is 24 h, but **these client
> labels stay frozen on `0366`'s 900 s edges** — `Fresh` no longer equals the server's `ok`, and only the future side is
> still parity-tested. The refetch and its diagnostic were **kept** (owner: *"Keep both for now (Recommended)"*). See
> [[tasks/login-signature-24h-window]].
>
> ✅ Done (agent-closed — not owner-verified), 2026-10-02, on owner ruling *"Close it (Recommended)"* (live
> `AskUserQuestion`, relayed by `fkit-lead`; ⛔ not producer precedent). The code is in commit `0c9a620`
> ("Sprint push", 2026-10-02 — checked with `git show --stat`: `src/client/SignatureAgeAnalytics.ts`,
> `src/client/flashist/FlashistFacade.ts` and two test files). 🚨 **NOT deployed.** It targets the **2026-10-03/04
> game deploy**; if it misses, it rides 2026-10-10/11 and `0373`'s earliest read slides a week. The board row says
> *"Not committed"* — true when the producer closed it, now stale (the code is in `0c9a620`). 📌 *2026-10-02: the row
> is now corrected — "committed in `0c9a620`; not deployed" (owner request, relayed by `fkit-lead`); the deploy is
> still pending.* **No event has been
> seen arriving yet**; that, and reading the data, is task `0373`. No separate verify task was filed.

## Goal

The profile server's shadow-mode login check ([[tasks/verified-login-shadow-mode]], `0325` S2) calls about
**1 login in 3 `stale`** — the `issuedAt` inside Yandex's signed player data is more than 900 s old or more than
300 s ahead. [[tasks/verified-login-live-check]] (`0339`) ruled the S2 exit not met, which blocks `0340` (turn the
check on) and, behind it, `0332`, `0323`, `0250` S3b, `0248` and `0301`. A read-only check on **2026-10-02** (exact
ClickHouse sums, by a spawned coder, as recorded in the brief) found the share **flat at ~32–33 %** over ~20 k logins
since 2026-09-29 20:05 UTC, with a strong time-of-day pattern: **~21–26 % at 02–06 UTC, ~40–43 % at 20–23 UTC**.

[[tasks/stale-login-signature-age]] (`0366`) adds a server counter of **how old** stale signatures are, but an
architect consult (2026-10-02, read-only, as recorded in the brief) found that it **cannot pick the fix on its own**:

- **Our client cannot be holding a signature older than ~5 min** — it logs in once per page load, fetches the signed
  data at startup, drops a held copy over 300 s (`SIGNED_PLAYER_HELD_MAX_AGE_MS` in
  `src/client/flashist/FlashistFacade.ts`) and always refetches on a re-login after a 401. So ages of 20 min and
  more come from **Yandex**, not our hold. `past_15m_20m` stays ambiguous.
- **Leading hypothesis — inferred, UNPROVEN:** every match exit reloads the game in the same tab (the launch query
  string is kept, per [[tasks/match-exit-keeps-query-string]]). Each reload is a new boot and a new login. If Yandex
  returns the **same** signed data for the whole visit, every reload more than 15 min into the visit is stale — which
  fits ~1 in 3 and the evening peak.
- **What `0366` cannot tell:** which Yandex mechanism; **whether a second Yandex call returns a newer `issuedAt`**
  (this decides the fix); first boot vs after-match reload; device split; a few heavy players vs everyone.

This task adds the client-side readings that answer those questions. **Client only, analytics only — login sends
exactly what it sent before, at the same moment.** Filed 2026-10-02 by a spawned `fkit-producer` on owner rulings
given live in the `fkit lead` session (filing both a build task and a "read the data and decide" task; the deploy
slot *"This week deploy slot"*; which signature login sends — *"The original (Recommended)"*).

## Key Changes

Pure helpers in the new `src/client/SignatureAgeAnalytics.ts` (`readSignatureIssuedAtSeconds`,
`signatureAgeLabel`, `isPastStale`, `compareIssuedAt`, and the client-to-server label map
`SIGNATURE_AGE_TO_SERVER_BRACKET`); fired from `takeYandexPlayerSignature()` in
`src/client/flashist/FlashistFacade.ts`. Event strings live in the enum, as the project rule requires. Full event
tables: [[systems/analytics]] § *Profile Login Signature Age Events*.

- **A1 — the signature's age, by boot kind.** `Profile:Login:SignatureAge:<FirstBoot|AfterMatch>:<Label>` — **20
  event strings**. Fires once on every take that returns a signature (the `Ready` and `Waited` paths — the boot login
  **and every relogin**, to stay comparable with the server's share, which counts relogins too). Boot kind comes from
  `bootFollowsMatchExit` (the flag from [[tasks/platform-degraded-analytics-event]], `0328`). The label brackets
  *device now − `issuedAt`* with **exactly `0366`'s server edges** — `Fresh` (the server's `ok` window, both limits
  inclusive), the eight `0366` brackets respelled in PascalCase (`past_15m_20m` → `Past15m20m`, …), plus a
  client-only `Unreadable`. A test sweeps every edge against the server's function so the two cannot drift. Five
  colon parts — GameAnalytics' maximum. No value.
- **A2 — does a second Yandex call return a newer `issuedAt`?** `Profile:Login:Signature:Refetch:<Newer|Same|Older|Failed>`
  — 4 strings. Only when A1's label is one of the six `Past*` (more than 900 s old), only on the **page load's first
  take** (never a relogin), **at most one extra `getPlayer({ signed: true })` per page load, never retried**, 60 s
  net. **Not awaited** — login sends the **original** signature (owner ruling) and is not held up; the second
  signature is used only for the comparison and dropped. Both `issuedAt` values come from Yandex, so **no clock is
  involved**. `Older` is its own label (owner ruling Q1), never folded into another. **No cross-load cap** (owner
  ruling Q2).
- **A3 — held time.** The existing `Profile:Login:Signature:Ready` now carries a **value**: ms held
  (`askedAt − fetchedAt` of the boot pre-fetch, 0–300 000). Name and firing unchanged; `Waited` / `Timeout` /
  `Failed` unchanged.
- **Privacy (hard limits):** events carry brackets, fixed labels and A3's one number only — **never** the raw
  `issuedAt`, the payload (it holds the player's public name and avatar — 152-ФЗ), the signature, a player id or a
  token. The decoder reads only `issuedAt`, never throws, and drops the rest at once.
- **Not in scope:** A4 (a server-side boot-kind label — skipped), any profile-server change, any fix, any retune of
  the 900 s / 300 s window, any change to which signature login sends, and reading the data.

## Outcome

- **Proof (from the board row; not re-run here):** targeted tests 256/256, then 173/173 after review fixes; mutation
  checks caught 6/6; full `npm test` 188/188 suites, 3458/3458, green on the first run; lint and `tsc` clean. New
  `tests/client/SignatureAgeAnalytics.test.ts` (with the server-parity sweep against `0366`) and an extended
  `tests/client/SignedPlayerFacade.test.ts`. Stateful review round 1: changes requested — R1, R2 (both low,
  wording-only) → done; ledger closed out, **no residuals**.
- ⚠️ **Device-clock caveat:** A1 uses the device clock. A wrong clock shows up in the far `Future*` / `Past*` labels
  and can label as stale a signature the server finds fresh. So `0373` first checks that the client's non-`Fresh`
  share is close to the server's ~32 %. A2's sample can include such loads, and A2 does not carry A1's label.
- ⚠️ **`Same` cannot tell** Yandex's servers reusing the signed data from the Yandex SDK caching it inside the page —
  either way a same-page refetch would not fix it, which is the question the fix turns on.
- ⚠️ **Yandex call limit:** Yandex documents 20 player calls per 5 minutes; whether a plain `getPlayer()` counts is
  unclear. A2 adds at most one call per page load; if the limit bites, the extra call counts `Failed`, or a later
  load's own call may fail instead — handled paths, but **bounded, not zero**.
- ⚠️ **Caveat carried for `0373`:** on the server, `stale` is decided **before** the id check
  (`src/profile-server/LoginVerification.ts`), so "the right player" is not proven for stale logins.
- **Deploy line:** the brief requires the worklog to record which game deploy carried it; at close that line was
  **still a placeholder**.
- **Next:** task **`0373`** — *read the stale-login data and choose the fix* — filed 2026-10-02 on
  [[decisions/sprint-8]] and **owner-placed at rank 2** (*"Move to rank 2 (Recommended)"*). It cannot start until
  this task and `0366` are deployed and 5–7 days of data, including a weekend evening (UTC 20–23), exist — earliest
  useful read after the evening of 2026-10-10 (UTC) if both land on 2026-10-03/04. The owner chooses the fix and sets
  the S2-exit threshold there (*"Decide it with the data (Recommended)"*). Chain after it, not filed: the chosen fix →
  an S2-exit re-check with the owner → `0340`, whose dependency line now points at `0373`.

## Related

- [[tasks/stale-login-signature-age]] — task `0366`, the server age brackets these client labels mirror one-to-one
- [[tasks/verified-login-live-check]] — task `0339`, the failed live check that started this chain
- [[tasks/verified-login-shadow-mode]] — task `0325`, the S2 shadow-mode check and the signed pre-fetch this measures
- [[decisions/adr-116-verified-login]] — the verified-login decision; `0340` (S3a) waits on `0373`
- [[systems/analytics]] — the 24 new events and `Ready`'s new value
- [[systems/flashist-init]] — the facade whose `takeYandexPlayerSignature()` fires them
- [[tasks/platform-degraded-analytics-event]] — task `0328`, source of `bootFollowsMatchExit`
- [[tasks/match-exit-keeps-query-string]] — task `0331`, the same-tab reload behind the leading hypothesis
- [[decisions/sprint-7]] — the board (rank 35); `0373`, the reading task, moved here at rank 36 on 2026-10-04
- [[decisions/sprint-8]] — where `0373`, the reading task, sat at rank 2 until 2026-10-04 (moved to Sprint 7, rank 36)
- [[tasks/stale-login-fix-decision]] — task `0373`, which read these events
- [[tasks/login-signature-24h-window]] — task `0391`, after which these labels no longer match the server
- [[decisions/adr-121-login-signature-24h-window]] — the 24 h window; these labels stay frozen on the old edges
