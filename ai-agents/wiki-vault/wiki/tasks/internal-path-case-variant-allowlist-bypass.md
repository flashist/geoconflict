# Case-Variant `/internal/` Paths Skipped the nginx IP Allowlist

**Source**: `ai-agents/tasks/done/0276-profile-internal-path-case-variants-bypass-nginx-allowlist/brief.md`
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 4 / task `0276`

## Goal

**Restore the network layer on the profile box's internal routes.**

The internal (service-to-service) routes have two layers: the **nginx source-IP allowlist** written by
`setup-profile.sh`, and **`internalAuth`**, a shared-token Bearer check. **nginx prefix `location`
matching is case-sensitive; Express 4 routing is case-insensitive by default.** So a request to
`/INTERNAL/v1/credit` (or any mix of case) **did not match the location block, fell through to `/`, was
proxied to the app, and Express still routed it to the internal handler** — the reviewer's probe got a
**401 from `internalAuth`**, meaning the route was reached.

**Severity: a lost layer, not an open door.** The token is still required and fails closed. But the
allowlist exists so that *"a misconfigured allowlist or an attacker already on an allowed host still needs
the shared token"* — **the reverse also holds**: the allowlist is supposed to keep the whole internet from
reaching the token check at all. **Today anyone could reach it, and could try tokens against it.**

**Found by** the `0271` reviewer's probe, recorded there as out of scope. **Pre-existing — not caused by
`0271`.**

## Key Changes

**Both layers were fixed**, and the pairing is the point:

- **nginx:** the block became `location ~* ^/internal/` — a case-insensitive regex, so every case variant
  hits the allowlist. Shipped via `setup-profile.sh`, with **seven new structural assertions** in the
  hardening harness (which `npm test` gates), including one guarding the `allow`-before-`deny all` order —
  **the reverse order would have locked the game server out.**
- **Express:** `app.set("case sensitive routing", true)`, so a mis-cased path 404s in the app.

⛔ **Two findings worth keeping after the ledger is filed away:**

1. **The app-side fix only works ABOVE the timing middleware.** `app.set("case sensitive routing", true)`
   must stay **before the first `app.use`**. Moving it below fails **16 tests, byte-for-byte identically to
   deleting it** — **Express 4 builds its router lazily on the first route registration and reads app
   settings at that moment**, so a late `app.set` is **silently ignored**. ⛔ **Do not reorder those lines.**
2. **`src/profile-server/` has no sub-routers** — every route is registered directly on `app`, so the
   app-wide setting genuinely covers all four internal routes. ⚠️ **Adding an `express.Router()` later
   reopens this hole**: a Router carries its **own** `caseSensitive` option and does **not** inherit the
   app's.

📌 **This task also added the deploy-time allowlist print** that `setup-profile.sh` emits in its completion
report — free, correct, and **explicitly not a guard between deploys** (see
[[tasks/alert-path-liveness-probe]]).

## Outcome

✅ **Deployed and proven on the box 2026-09-17; all seven verification steps met.** The **owner** ran the
profile deploy and the probe from the game box; the **lead** ran the read-only probes from a non-allowed
host and inspected the deployed nginx config read-only. **No agent changed anything on either box.**

| Step | Result |
|---|---|
| Tests | `tsc` clean · `npm test` **135 suites / 1724 tests** · hardening harness `ALL PASS` incl. all 7 new assertions |
| Three case variants → 403/404, **never 401** | ✅ 3 of 3 on the box, all **403** |
| Edge probes (percent-encoded, double-slash, dot-segment, trailing slash) | ✅ all **403** |
| Lowercase control from a non-allowed host | ✅ **403** |
| **Allowed path still reaches `internalAuth`** | ✅ owner-run from the game box → **401** |
| Public routes unaffected | ✅ `/health` 200 · `/ready` 200 · profile GET without Bearer → 401 |
| No secrets or addresses in any artifact | ✅ |

🚩 **The `allow` half is what had held this task open.** A **401, not 403**, from the game box proves the
request passed the allowlist and reached the app. **That is the one probe that would have caught a
rewritten location silently no longer allowing the game server — a failure that would otherwise have
surfaced only as a permanent 403 at `0217`.**

**Beyond the list:** all four internal routes were probed from the non-allowed host → **403 on all four**.
**Eleven probes in total from the non-allowed host, plus the one from the allowed host. No 401 from a
non-allowed host anywhere.**

⚠️ **Two evidence bases on two different nginx versions — do not present them as one.** The box runs nginx
**1.28.3**; the coder's build-time container probe ran on **1.31.5**. **The box probes are what prove the
deployed behaviour**; the container run is corroboration on a different version.

**Residual, standing:** **a bare `/internal` with no trailing slash is not matched by `~* ^/internal/`.**
Latent, no action taken — **no route is registered at that exact path today.** A separate finding (stale
figures in `CLAUDE.md` and a stale profile route table in `architecture.md`) was routed to `0280`.

📌 **Re-runnable box evidence for `0279` and `0217` to inherit** — the whole set is plain `curl`s, changes
nothing, and is cheap to re-run. **Re-run it rather than rediscover it.**

## Related

- [[tasks/profile-identity-s2-login-and-session-token]] — task `0271`, whose reviewer found this; shipped in the same deploy
- [[tasks/alert-path-liveness-probe]] — task `0284`, which relies on this allowlist and guards its 403 trap
- [[systems/alert-delivery]] — the relay mounted behind this boundary; its route is **all lowercase by design**
- [[decisions/adr-114-admin-server-alert-relay]] — cites the case-insensitive allowlist as already-solved
- [[systems/player-profile-store]] — the box these routes serve
- [[tasks/profile-deploy-hardening]] — the harness this extends
- [[tasks/setup-profile-heredoc-root-command-execution]] — task `0282`: **the same file and the same class of defect** — a deploy-time layer weaker than it reads; this page's *"same class"* framing is quoted in its brief
- [[decisions/sprint-4]] — the sprint that owns it
