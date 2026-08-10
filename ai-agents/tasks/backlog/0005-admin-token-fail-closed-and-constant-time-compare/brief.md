# `ADMIN_TOKEN`: fail closed on a missing secret, and compare in constant time

## ID
0005

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

`ADMIN_TOKEN` is the server's operator credential, sent as the `x-admin-key` header. It gates:

| What | Where |
|---|---|
| Kick any player from any game | `src/server/Master.ts:379`, `src/server/Worker.ts:284` |
| Create a **public** lobby (private/singleplayer are ungated) | `src/server/Worker.ts:140` |
| Master → worker internal calls (game info, public-lobby scheduling) | `src/server/Master.ts:399, 423, 504` |

**Two defects, one of which is the real one.**

1. **The failure mode is a published password.** `DefaultConfig.ts:234` reads
   `process.env.ADMIN_TOKEN ?? "dummy-admin-token"`. A missing or empty `ADMIN_TOKEN` does not crash
   the process or refuse to serve — it silently falls back to a literal string that is committed to
   a **public** GitHub repo. Nobody has to guess it. A secret whose absence degrades to a known
   public value is worse than no secret, because the system reports itself as protected.
2. **`!==` is a non-constant-time comparison** at all five check sites. A timing-attack surface.
   Minor next to defect 1, but there is no reason to keep it.

**There is a correct pattern already in this repo.** The profile server's `InternalAuth` does both
things right — fail-closed, and `crypto.timingSafeEqual`. Copy it rather than inventing a second
approach.

## ✅ Production verified 2026-08-10 — NOT an incident

The owner checked the live prod box. Results:

| Check | Result |
|---|---|
| `ADMIN_TOKEN` in the running `geoconflict-prod` container | **Set to a custom 64-character value** — not the default, not empty |
| `POST /api/kick_player/...` (master, via `https://geoconflict.ru`) | `401` |
| `POST /w0/api/kick_player/...` (worker fan-out) | `401` |

**Read this correctly.** The endpoints **are** reachable from the public internet — `nginx.conf:289`
(`location /` catch-all → master) and `nginx.conf:301` (`^/w(\d+)` → workers) both route them, and no
rule blocks the admin paths at either nginx layer. They are gated **by the token alone**, and today
that token is a real secret. So the gate is holding — but it is the *only* thing holding.

**This makes the task ordinary hardening, not an emergency.** Priority: the security lane, alongside
sec10–sec13. It is still worth doing, for one reason that the verification above does **not** remove:

> ⚠️ **The failure mode is unchanged and silent.** A future deploy that drops `ADMIN_TOKEN` from the
> env file puts prod straight back to the published default — **with no error, no crash, and no
> alert.** Today's good state is a fact about the current env file, not a property of the system.
> That is exactly what this task fixes.

**Unverified, and deliberately not assumed:** preprod. Neither `PreprodConfig.ts` nor `ProdConfig.ts`
overrides `adminToken()` — both inherit `DefaultServerConfig`'s `?? "dummy-admin-token"` fallback — so
preprod depends on the same env var being set, and nobody has checked it. Dev is unaffected
(`DevConfig.ts:9` has its own override).

**Do not restate the prod token value in this brief or any artifact** — record only "set" / "not set".

`DevConfig.ts:9` overrides the token with `WARNING_DEV_ADMIN_KEY_DO_NOT_USE_IN_PRODUCTION`, so dev is
not affected by defect 1.

## What to build

1. **Remove the insecure default.** `adminToken()` must not fall back to a hardcoded string. On a
   missing or empty `ADMIN_TOKEN` in any non-dev environment, the server must **fail closed** —
   refuse to start, with a clear log line naming the missing variable. A silent degraded start is
   the exact behaviour being removed; do not replace it with a warning-and-continue.
   - `DevConfig`'s explicit override stays as-is. Dev must keep working with no env file.
   - Decide and state whether preprod follows prod or dev; do not leave it implicit.

2. **Replace all five `!==` checks with a constant-time comparison** (`crypto.timingSafeEqual`,
   length-guarded). Put it in **one** shared helper — five call sites drifting apart is how one of
   them ends up reverted later. Sites: `Master.ts:379`, `Worker.ts:140`, `Worker.ts:284`, and the
   two outbound header uses in `Master.ts` are sends, not compares — leave those.

3. **Do not change the header name, the token's semantics, or which endpoints are gated.** This task
   hardens an existing gate; widening or narrowing it is a separate decision.

4. **Rider — one comment fix in the same file, five lines away.** `DefaultConfig.ts:239` reads
   `// Flashist Adaptation: experimenting with game speed`. The owner confirmed on 2026-08-09 that
   the 1.5× coefficient is **settled production behaviour**, not an open experiment, and it is now
   recorded in `adr-107`. Reword the comment to say so and point at the ADR.
   ⚠️ **Do not change the value `1.5`.** This is a comment-only edit; the coefficient was chosen by
   playtesting and is load-bearing for match pacing. Carried here rather than as its own brief purely
   because it is adjacent to the lines this task already edits — it is unrelated to `ADMIN_TOKEN`,
   and if it complicates review, split it out rather than bundling it.

5. **Confirm the deploy path sets the variable** before this ships — a fail-closed server with no
   `ADMIN_TOKEN` in its env file will refuse to start. Check `update.sh`'s `--env-file` wiring and
   the `.env.secret` overlay. **This is the one way this task can cause an outage; verify it first.**

## Verification steps

1. Unit test: `adminToken()` (non-dev config) with `ADMIN_TOKEN` unset **throws or exits** — it never
   returns `"dummy-admin-token"`. A test asserting the old fallback, if one exists, must be deleted,
   not adjusted.
2. Unit test: with `ADMIN_TOKEN` set, `adminToken()` returns it unchanged.
3. `grep -rn "dummy-admin-token" src/` returns **zero** hits.
4. Unit test on the shared compare helper: equal strings pass; unequal-same-length fail;
   different-length fail without throwing.
5. `grep -n "adminHeader()" src/server/` shows every **comparison** site routed through the helper
   and no surviving `!==` compare.
6. Integration: `POST /api/kick_player/...` with no header → 401; with a wrong header → 401; with the
   correct header → succeeds. Same three for public-game creation at `Worker.ts:140`.
7. Boot test: a non-dev config with no `ADMIN_TOKEN` fails to start and logs the variable name.
8. `npm run dev` still starts with no env file present (DevConfig path unaffected).
9. Full suite green: `npm test`.
10. Rider: `grep -n "experimenting with game speed" src/` returns zero hits, and
    `grep -n "flashist_gameSpeedCoef = 1.5" src/core/configuration/DefaultConfig.ts` **still matches**
    — the comment changed, the value did not.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing

- **Priority settled 2026-08-10:** prod verified clean, so this is **normal-priority hardening** in
  the security lane alongside sec10–sec13 — not an incident, and it does not jump the Sprint 4 lane.
- Sequence with sec10–sec13 — same area, likely same reviewer.
- **Add preprod to the scope check** when this is picked up: its config inherits the same silent
  fallback and has not been verified.
- **No secrets in any artifact**: never paste a real token value into a brief, worklog, review, or
  commit message.
