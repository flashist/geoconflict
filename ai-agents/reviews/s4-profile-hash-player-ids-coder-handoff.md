# Coder handoff — s4-profile-hash-player-ids (PR #127)

> **Spec, not an applied fix.** This file *describes* recommended changes for a separate
> implementer. It changes no code itself. Each finding was verified against the code by a
> stateful review (Claude `code-reviewer` + Codex adversarial); severities below are the
> **post-verification** assessment, which in one case is lower than the reviewer's raw claim.

## Context — what the code is

This branch implements **152-ФЗ pseudonymization** for the player profile store: the raw
Yandex player ID must never be persisted or logged **at rest**. A server-side keyed hash
(`hashYandexId` = HMAC-SHA256 over the raw ID with a secret pepper, in
`src/profile-server/YandexIdHash.ts`) becomes the profile key everywhere. The raw ID is
hashed at the profile-server route boundary and discarded; only the hash is stored. A DB
migration (`migrations/002_hash_yandex_player_id.sql`) renames the identity column to
`yandex_player_id_hash`.

The core implementation is **correct and was verified** — keyed (not bare sha256),
fail-closed on a missing/short pepper, raw ID never reaches the repo/DB, public profile
strips the hash column, migration is transaction-wrapped + idempotent, 47/47 tests pass.
The items below are **operational safety + test polish**, not core-logic bugs.

### In scope for this handoff
The three confirmed Open findings: **F1** (migration safety rail), **F4** (test clarity),
**F6** (test coverage gap).

### Out of scope
Everything classified as an **accepted residual** in
`ai-agents/reviews/s4-profile-hash-player-ids.md` — do **not** touch these (they are settled
tradeoffs; changing them re-introduces churn):
- The credit response echoing the raw `yandexPlayerId` (transit-only, TLS-OK, documented).
- Pepper backup automation — **deferred to T8** by design (the cron is a labelled skeleton).
- `__resetPepperCacheForTests` being exported, and the unchecked `dotenv.config()` return.

## Changes to make

| Severity | Required? | Location | Summary |
|----------|-----------|----------|---------|
| medium | recommended pre-apply | `migrations/002_hash_yandex_player_id.sql` and/or `migrate-profile.sh` | Add a fail-closed guard + loud warning so the destructive truncate cannot silently destroy real profile data. |
| low | nice-to-have | `tests/profile-server/Routes.test.ts:204` | Use a hash-shaped value in the `PersistentIdConflictError` mock. |
| low | nice-to-have | `tests/profile-server/Routes.test.ts` | Add a `GET /v1/profile` 500-path test. |

---

### F1 — migration `002` truncates with no row-count guard (medium)

**Location:** `migrations/002_hash_yandex_player_id.sql:30` (the `truncate table player_profiles
cascade;`) and `migrate-profile.sh:301-314` (the only confirmation prompt).

**Problem (verified).** The migration runs `TRUNCATE player_profiles CASCADE` **unconditionally**
whenever the old `yandex_player_id` column exists — it never checks row count. `CASCADE` also
clears `player_match_xp_credits`, `player_name_history`, and `player_cosmetic_ownership`. The
interactive `migrate-profile.sh` prompt ("Apply the above pending migrations?") is generic and
does **not** mention data loss, and `./migrate-profile.sh apply -y` (or any CI invocation) skips
it entirely. So if the "DB is effectively empty" assumption is ever false at apply time — real
players register before the migration runs, or it's applied to an env that accumulated data —
profiles, XP ledger, citizenship, and cosmetic ownership are destroyed irreversibly with no warning.

**Honest impact / why medium, not critical.** Codex rated this **critical / no-ship**; the
verified severity is **medium**. The truncate *itself is correct* — you cannot rename raw→hash
in-place (hashing needs the secret pepper, and putting the pepper in SQL would itself leak it),
so purging the throwaway raw-ID rows is the right compliance move. The brief mandates doing this
**now while the table is empty**, and the live DB currently holds little/no real data, and the
non-`-y` operator path **does** prompt. So the impact is severe but the probability is currently
low. The gap is the **missing safety rail**, not the truncate.

**Recommended fix (pick one; the SQL guard is the stronger one).**
- *In SQL:* before truncating, count affected rows; if `> 0`, `RAISE EXCEPTION` unless an explicit
  opt-in is present (e.g. a `SET LOCAL myapp.allow_profile_purge = 'on'` the operator must set, or
  a guard table/row). This makes the destructive path impossible to hit by accident even via
  `-y`/CI, while keeping the intended empty-DB apply a no-friction success.
- *In `migrate-profile.sh`:* before applying, query `SELECT count(*) FROM player_profiles`; if
  `> 0`, print a loud `WARNING: migration 002 will TRUNCATE all profile data (N rows)` and require
  a distinct `--confirm-data-loss` flag in addition to `-y`. This protects the operator path but
  not a direct `npm run migrate` inside the container, so prefer combining it with the SQL guard.

Keep the truncate behavior for the genuinely-empty case — only add the guard.

---

### F4 — test uses a raw-looking value where production passes a hash (low)

**Location:** `tests/profile-server/Routes.test.ts:204`.

**Problem (verified).** The mock is
`upsertProfile: jest.fn().mockRejectedValue(new PersistentIdConflictError("yandex-2", "pid-1"))`.
In production the repository layer only ever receives the **hash**, so `PersistentIdConflictError`'s
first arg is always a hash, never a raw ID. `"yandex-2"` reads like a raw Yandex ID and misleads a
future reader into thinking the error type carries raw IDs. (Compare `PlayerProfileRepository.test.ts:282`,
which correctly uses a `"...-hash"` value.)

**Impact.** Cosmetic/clarity only — the test passes and asserts correct behavior. No functional bug.

**Recommended fix.** Change the error mock to a hash-shaped value, e.g.
`new PersistentIdConflictError("yandex-2-hash", "pid-1")`. **Leave** the request body
`.send({ yandexPlayerId: "yandex-2", persistentId: "pid-1" })` unchanged — the route legitimately
receives a raw ID there and hashes it.

---

### F6 — no 500-path test for `GET /v1/profile` (low)

**Location:** `tests/profile-server/Routes.test.ts` (the `/v1/profile` GET block — currently has
200, 404, and 400 cases; the upsert route has a matching 500 test).

**Problem (verified).** There is no test for the read endpoint returning 500 when the repository
throws, so a regression in that error path would go uncaught. A 152-ФЗ-relevant extra: the test
should also assert the error body does not leak the hash column.

**Impact.** Coverage completeness; no current bug.

**Recommended fix.** Add a test mirroring the existing upsert 500 test:

```ts
test("GET /v1/profile is 500 when the repo throws", async () => {
  const repo = mockRepo({
    getProfile: jest.fn().mockRejectedValue(new Error("db down")),
  });
  const res = await request(createApp(repo))
    .get("/v1/profile")
    .set("X-Yandex-Player-Id", "yandex-1");
  expect(res.status).toBe(500);
  expect(res.body).not.toHaveProperty("yandex_player_id_hash");
});
```

(Confirm the exact header/route shape against the existing 200/404 tests in the same file.)

## Do NOT change (accepted residuals — see the ledger)
- Credit response echoing the raw `yandexPlayerId` — deliberate, documented, transit-only.
- Pepper backup automation — deferred to T8 (its carry-forward note: fail closed on a fresh-host
  restore when the DB has rows but no `.id_pepper`).
- `__resetPepperCacheForTests` export; unchecked `dotenv.config()` return.

## Validation + acceptance criteria
- `npx jest tests/profile-server/ tests/core/profile/` stays green (47+ tests; the suite emits
  intentional `console.log` error lines from error-path tests — that's expected, not a failure).
- F1: with rows present, the migration/script **aborts** rather than truncating; with zero rows it
  applies cleanly. Re-running after apply remains an idempotent no-op (`schema_migrations` + the
  old-column guard).
- F4/F6: new/edited tests pass; F6 asserts no hash leak in the 500 body.
- Test-harness caveat: the migration runner reads migrations **baked into the deployed image**, not
  the local repo — a guard added locally only takes effect on the box after `npm run deploy:profile`.
- The brief's go-live gate is unchanged and still required: on-box, dump the profile DB + grep
  server/profile logs for any raw-ID pattern after a real login+match → expect **zero**.
