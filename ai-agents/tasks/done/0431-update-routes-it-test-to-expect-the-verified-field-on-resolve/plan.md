# Plan — 0431: `Routes.it.test.ts` expects the `verified` field on resolve

Planned 2026-10-10 by `fkit-coder` (plan-only spawn from `fkit-sprint-ship-loop`, driver `fkit-lead`). Read-only so
far: no source or test file touched, integration suite not run.

## 1. Cause — confirmed read-only, and it is NOT `0340`

⚠️ **The brief's "likely cause" (`0340`, commit `71efd10`) is wrong.** Corrected evidence:

- `git blame` on the line `verified: vouch === "verified",` in the resolve route
  (`src/profile-server/Routes.ts:888`) → commit **`077c9e3`** ("Sprint push", 2026-10-07).
- `git log -S'verified: vouch === "verified"' -- src/profile-server/Routes.ts` → only `077c9e3`.
- That commit's `Routes.ts` hunk is the **task `0332` (ADR-124) session vouch**: it adds `vouchForSession(...)` and the
  `verified` key to the `POST /internal/v1/players/resolve` reply (comment at `Routes.ts:846-853`). It also adds
  `verified: z.boolean().optional().catch(undefined)` to `PlayerResolveResponseSchema`
  (`src/core/profile/CreditContract.ts:103-118`).
- `71efd10` (`0340`) does not touch the resolve route: its `Routes.ts` diff has no `players/resolve`, `vouch` or
  `PlayerResolveResponse` line. `0340` added `verified` to the **caller** (`resolveCaller`, session token) — a different
  thing with the same name, which is likely how the brief's trace landed on it.
- `tests/integration/Routes.it.test.ts` was last changed in `68303d5` (Sprint 6, task `0322`, which added
  `displayName`) — before `077c9e3`. So the test went stale on 2026-10-07 and nobody updated it.

**Exact value these test callers get: `verified: false`.** The helper `resolveOverHttp` (`Routes.it.test.ts:126-131`)
sends only `{ platform, platformUserId }` — no `sessionToken`. In `vouchForSession`
(`src/profile-server/SessionVouch.ts:58-60`) `token === undefined` returns `"absent"` first, before any secret check, so
the reply is `verified: "absent" === "verified"` → `false`. Deterministic; does not depend on the test app's session
secret.

## 2. Test edits — `tests/integration/Routes.it.test.ts` only

Keep `toEqual` (exact match) in both — the tests exist to catch leaked fields.

**Edit A — test "resolve -> credit -> read produces xp 10, no leaked fields", `toEqual` at `:317-321`:**

```ts
expect(created.body).toEqual({
  playerId,
  isCitizen: false,
  displayName: null,
  verified: false,
});
```

Plus the comment just above it (`:312-314`, "carries the internal id …, the citizen flag and — since task 0322 — the
approved display name"): add one clause naming `verified` (task `0332`, ADR-124; `false` here — no session token sent),
so the comment matches the body. Comment-only, same sentence style.

**Edit B — test "resolve returns the approved display name, and null for a player with none", `toEqual` at `:366-370`:**

```ts
expect(withName.body).toEqual({
  playerId,
  isCitizen: false,
  displayName: "Approved_Name",
  verified: false,
});
```

**Not changed:** `src/profile-server/Routes.ts`, `SessionVouch.ts`, `CreditContract.ts`, any other test. No new test: a
`verified: true` resolve is already covered by the unit suite (`tests/profile-server/Routes.test.ts:713-740`); adding
one here is out of scope.

## 3. Sweep of the other integration suites for the same stale shape

Grepped `tests/integration/**` for `players/resolve`, `isCitizen`, and every `.body).toEqual(`:

- **`Routes.it.test.ts`** — only the two sites above compare a resolve body exactly. Other resolve calls in the file
  (`:145`, `:213`, `:273`, the find-or-create test) read single fields (`.playerId`, `.status`) — not affected.
- **`Login.it.test.ts:277`** — calls resolve but checks only `res.status` and row counts — not affected.
- **`GameServerProfileCredit.it.test.ts`** — goes through the game server's `ProfileApiClient`, whose schema already
  accepts `verified` as optional — not affected.
- All other `.body).toEqual(` sites (`PaidStateEqualization`, `TenureGrant`, `Routes` `:155/:234/:249`) are tenure,
  inbox, profile and error bodies — not the resolve route.

**Nothing else found.** This matches `0425`'s evidence (176/178, exactly these 2 red).

## 4. Verification (build step)

One test run at a time; no dev server, no browser.

1. `docker ps -a` shows `gc-0012-it-pg` **Exited (255)**, port `5433`. Build step: `docker start gc-0012-it-pg`, then
   wait for it with `docker exec gc-0012-it-pg pg_isready` (bounded, not an open poll). That container only — the run
   DROPs and recreates its `public` schema. If it will not start → return BLOCKED, don't improvise another database.
2. Export `.env.test` into the shell (`set -a; . ./.env.test; set +a`) — the value is never printed, logged or written
   anywhere.
3. `npm run test:integration` — the npm script only (project lock + `--runInBand`), never `npx jest`. Must be
   **fully green** (expected 178/178). A `supertest`-shaped failure is judged by the `CLAUDE.md` known-flake rule (rule
   out `SIGSEGV` first), re-run once, and the re-run is reported.
4. `npm run lint` — green.
5. Worklog (`worklog.md` in this folder): names `077c9e3` / task `0332` as the change that added `verified`, how it was
   confirmed (blame + `log -S` + the `71efd10` diff check above), test counts before/after, and that the brief's `0340`
   attribution was corrected.

No commit, no task move, no wiki write.

## 5. Risks

- Very low: two literal additions to expected objects, test-only. If the full run shows any red test besides these two,
  that is a new finding — reported, not fixed in this task.
- Container exit code 255 usually means Docker was restarted under it; if it fails to come up healthy, that is the
  BLOCKED case above.

## Open questions

None.
