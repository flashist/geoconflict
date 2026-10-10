# Worklog — 0431

## 2026-10-10 — build (`fkit-coder`, Build worker spawned by `fkit-sprint-ship-loop`, driver `fkit-lead`)

Built against the owner-approved `plan.md` (blob `bb54c338182e23959803772ef082b33b12feaefd`, re-checked with
`git hash-object` before starting).

### Cause — corrected attribution

The brief's "likely cause" (`0340`, commit `71efd10`) is **wrong**. The `verified` key in the
`POST /internal/v1/players/resolve` reply was added by commit **`077c9e3`** ("Sprint push", 2026-10-07) — task **`0332`**
(ADR-124) session vouch. Confirmed (at plan time, read-only):

- `git blame` on `verified: vouch === "verified",` in `src/profile-server/Routes.ts` → `077c9e3`.
- `git log -S'verified: vouch === "verified"' -- src/profile-server/Routes.ts` → only `077c9e3`.
- `71efd10`'s `Routes.ts` diff has no `players/resolve`, `vouch` or `PlayerResolveResponse` line; `0340` added
  `verified` to the *caller* (`resolveCaller`), a different field with the same name.
- `Routes.it.test.ts` was last changed in `68303d5` (task `0322`), before `077c9e3` — the test went stale on 2026-10-07.

Value these callers get: `verified: false` — `resolveOverHttp` sends no `sessionToken`, and `vouchForSession` returns
`"absent"` for an undefined token before any secret check. Deterministic.

### Change

`tests/integration/Routes.it.test.ts` only:
- Test "resolve -> credit -> read produces xp 10, no leaked fields": added `verified: false` to the exact `toEqual`, and
  one clause to the comment above it naming `verified` (task `0332`, ADR-124; false — no session token).
- Test "resolve returns the approved display name, and null for a player with none": added `verified: false` to the
  exact `toEqual`.

`toEqual` kept (exact match). No source file touched. Sweep of the other integration suites (see `plan.md` §3): no other
site has this stale shape.

### Verification

- `gc-0012-it-pg` was `Exited (255)`; `docker start`, `pg_isready` → accepting connections.
- `npm run test:integration` (npm script; `.env.test` exported, value never printed): **13/13 suites, 178/178 tests
  passed, 0 failed, 0 skipped**, 10.1 s, exit 0. One run, no re-run needed.
  - Before: **176/178** (the 2 tests above red) — per `0425`'s worklog, 2026-10-09; **not re-measured here**.
  - The 178 total includes `0425`'s uncommitted `TesterRole.it.test.ts` suite (present in the working tree).
- `npm run lint` → exit 0. `prettier --check` on the edited file → clean.

### Decision log (unattended fixes / obvious-winner calls)

none — Build worker; no review fixes applied and no obvious-winner calls made. Everything done was inside the approved
plan.
