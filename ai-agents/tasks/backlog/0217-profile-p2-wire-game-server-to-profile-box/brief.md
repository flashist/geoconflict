# P2 — Wire the game server to the new profile box, and prove a credit call actually lands

## ID
0217

## Parent / Epic
[`0213-profile-backend-clean-slate-rebuild`](../0213-profile-backend-clean-slate-rebuild/brief.md)

## Sprint
Sprint 4

## Priority
**High** — this is the phase that converts a running box into a working feature. Until it lands, the
profile box exists and does nothing for players.

⚠️ **The rank is the producer's**; the owner ruled scheduling, not rank.

## Status
🔲 Backlog

## Owner
fkit-coder / operator

## Depends on
[`0215`](../0215-profile-p1-stand-up-the-box/brief.md) (P1) — a box must exist, be healthy, and hold
a **known** `PROFILE_INTERNAL_TOKEN`.

## Context

### 🔴 TWO INDEPENDENT SILENT BARRIERS SIT ON THIS EXACT PATH

Both fail **quietly**. Both destroy XP rather than queueing it. **This task is where they are caught
or where they start.**

**Barrier 1 — the shared token.**
`internalAuth` is a `timingSafeEqual` over a **shared** secret
(`src/profile-server/InternalAuth.ts:14-19`, `:26`). If the game server's `PROFILE_INTERNAL_TOKEN`
does not **match** the box's, every credit call gets a **401**. The client is fail-soft with **no
durable queue** (ADR-101) ⇒ **the XP is LOST, not queued**, and **nothing logs above `debug`**.
⚠️ `0182/brief.md:136-137` still reads *"leave blank; the box auto-generates"* — annotated 2026-09-04,
but **anyone reading the runbook cold will do the wrong thing**.

**Barrier 2 — the IP allow-list.**
`PROFILE_INTERNAL_ALLOW_IPS` in `example.env.profile:33` is pinned to a **June** game-prod egress IP.
nginx enforces `allow …; deny all;` at `/internal/` (`setup-profile.sh:719-720`). A stale value ⇒
**403 on every credit call** — also silently swallowed.

🚨 **A 401 and a 403 are indistinguishable from "working" at the game server, because the client
never surfaces either.** `0062`'s **D3** — an actual authenticated call succeeding end to end — is
the **only** check that catches either barrier. **Do not substitute a config read for it.**

### The owner's blank-token ruling — what it does and does not mean

⚠️ **Owner ruling 2026-09-04:** `PROFILE_INTERNAL_TOKEN` **stays deliberately blank for the upcoming
game deploy**, because citizenship is not ready. Owner, verbatim: *"I probably will keep it blank
again, because the citizenship is not fully ready to be deployed yet and we need to do some
additional work in terms of the profile VPS setup."*

**Consequence for this task:** this phase runs at a **deploy window the owner chooses**, with the
value **deliberately non-empty**. It is not a ride-along on whatever game deploy happens next.
⚠️ **Deploy-time forget-risk, already recorded on `0062`:** blanking (or un-blanking) the local
`.env.prod` value is a **manual step with no automated guard**, and `npm run check:config-parity`
does **not** catch it — that check compares **names**, and `deploy.sh:312` forwards this one
correctly. **A populated file at deploy time silently enables profile upsert and XP crediting in
production.**

> 🔴 **DECIDED — NO GUARD TASK. Owner ruling 2026-09-04, verbatim: *"Neither — I'll just
> remember."*** They will blank `PROFILE_INTERNAL_TOKEN` by hand at each deploy.
>
> ⛔ **This is a DECISION, not an oversight. Do not file a task for it, and do not re-recommend one.**
> Two options were put to the owner (an automated guard, or a deploy checklist item) and **both were
> declined.**
>
> ⚠️ **The risk is accepted, not removed — and it is recorded HERE, where a deployer will actually
> see it**, rather than in a report nobody opens at deploy time.

### What is already fixed and should not be re-fixed

`0062`'s forwarding line is **in the tree** at `deploy.sh:312`. The fix is not missing. What has
never happened is **exercising it with a real value** — `D2` was run 2026-09-04 and returned an empty
token, but the owner had **deliberately blanked** it before that deploy, so the result is
**INCONCLUSIVE: neither a confirmation nor a refutation.** ⚠️ **Do not re-run `D2` and read an empty
result as a failure of the fix.**

### 🆕 🚨 THIS TASK MAY BE CARRYING A MIGRATION NOBODY HAS APPLIED

**Owner-approved investigation, 2026-09-04.** `0067` (Name Change, Citizens Only) shipped a **client**
half and a **profile-server** half. **They ship in different images.**

**Determined from the repository ✅:**

| Finding | Evidence |
|---|---|
| Migration `004_name_change.sql` **exists** and is merged | `migrations/004_name_change.sql`, added in `d442ac2` |
| Three name-change routes **exist** and are merged | `src/profile-server/Routes.ts:739` (`POST /v1/profile/name-change-request`), `:784` (`POST /v1/profile/name-change-cancel`), `:~850` (`POST /internal/v1/name-change/decide`) |
| Migrations run **at deploy time**, not at boot | `src/profile-server/Server.ts:11` — *"DB migrations run at deploy time via `npm run migrate`"* |
| ✅ **Re-running migrations is SAFE** | `migrate.ts:5-6` — applies `migrations/*.sql` once in lexical order in a transaction, records each filename in `schema_migrations`, **so re-runs are no-ops** |
| The game deploy `362a2f9` is **NOT** a profile deploy | `git show --stat 362a2f9` touches only `package.json` / `package-lock.json` — a version bump |
| A profile deploy leaves **no record in git** | It runs through `build-deploy-profile.sh` against the box; nothing is written back to the repo |

⛔ **NOT determinable from the repository — and this is the honest answer, not a gap to fill by
guessing:**

> **Whether `0067`'s profile-server half was ever deployed CANNOT be answered from this repository.**
> There is no artifact in git that records a profile-image deploy.

**Two checks on the box settle it**, both in `0215`'s inspection table (field B8):

1. **Does `schema_migrations` contain `004_name_change.sql`?**
2. **Does the running image serve the three name-change routes?**

🚨 **Consequence: if `004` was never applied, the name-change routes fail against a schema that lacks
their tables — and `0067` is already closed as `✅ Done (agent-closed — not owner-verified)`, so
nothing else is watching for this.**

✅ **The mitigation is cheap and already built: `migrate.ts` is idempotent, so running it is safe
whether or not `004` is applied. RUN IT, rather than investigating first.**

## What to build

0. **Run the migrations against the profile DB** (`npm run migrate`) — ✅ safe either way, and it
   closes the `0067` question above without needing to answer it first. **Confirm `004` is present in
   `schema_migrations` afterwards.**
1. **Set `PROFILE_API_URL`** in the game's production env to the profile host.
2. **Set `PROFILE_INTERNAL_TOKEN`** in the game's production env to **exactly** the value `0215`
   generated for the box. 🚨 **Matching is the whole point.** Not "set", not "non-empty" — **the
   same value on both sides.**
3. **Update `PROFILE_INTERNAL_ALLOW_IPS` to the CURRENT game-prod egress IP** and **redeploy the
   profile box**. ⚠️ **The current egress IP must be measured, not assumed** — the pinned value is
   from June and there is no guarantee it still holds. This is an **open question for the owner**
   (Q4) if it cannot be measured directly.
4. **Deploy the game server** at the owner-chosen window.
5. **Run `0062`'s deploy-pending checks D1 and D3–D5** (worklog *Deploy-pending* section; `D2` is the
   container-env read and is already understood). In `0062`'s brief these correspond to verification
   steps 2–6.

### 🚫 Not in this phase

- Backups, the restore drill, `age`-key custody (P3 / `0218`).
- Monitoring and alerting (P4 / `0219`).
- Arming the config-parity guard — that is `0064` + `0203`, and it is gated on ten items.

## Verification steps

1. **D3 — an actual authenticated profile call succeeds end to end in production.** 🚨 **This is the
   acceptance criterion of this task.** Not "the variable is present"; not "the deploy printed a
   warning-free line" — **a real call, working.** ⚠️ **It is the only check that catches either
   silent barrier.**
2. **D2 (container env read) shows a NON-EMPTY token** on this deploy. ⚠️ **`D2` converts inference
   into fact ONLY on a deploy whose source value was non-empty** — that is what makes this deploy
   different from the 2026-08-29 one.
3. **A profile row is actually created**, and **XP is actually credited**, for a real match in
   production. ⚠️ `isConfigured()` being true is not the same as `upsertProfile()` and
   `creditMatch()` succeeding.
4. **D4 — the partial-config warning fires when it should and does NOT fire when both variables are
   set.**
5. **D5 — nothing regressed for the unset case.** With `PROFILE_API_URL` unset (local dev), the
   client still no-ops cleanly and nothing crashes.
6. **The token is not printed anywhere** — not by the warning, not by any log line, not in deploy
   output. Check `deploy.sh` does not echo the heredoc it writes.
7. **The allow-list was measured, not assumed** — the worklog states how the current egress IP was
   determined. 🔒 **Record the METHOD, never the address.**
8. 🆕 **`schema_migrations` contains `004_name_change.sql`** after step 0. ⚠️ **Record whether it was
   ALREADY there or was applied by this task** — that is the answer to the `0067` question, and it is
   worth writing down since nothing else can establish it.
9. 🆕 **The three name-change routes respond** on the deployed image (`Routes.ts:739`, `:784`, and the
   internal decide route) — not 404. ⚠️ A migration applied against an image that does not serve the
   routes is half the fix.
10. 🔒 **No values anywhere** — no token, no IP, no hostname, no length.

## Notes

- **Blocks:** `0062`'s live verification, `0017`'s Deferred Live Tail, `0012`'s Deferred Live Tail,
  and **one of `0065`'s three conditions**.
  ⚠️ **This task does NOT unblock `0065`.** `0065` needs `0014` (the per-game key) and the payments
  forwarding as well; those are untouched here. **Do not report `0065` as unblocked.**
- **Open questions this task owns:** **Q4** — what is the current game-prod egress IP for
  `PROFILE_INTERNAL_ALLOW_IPS`? · 🆕 **Q9** — was `0067`'s profile-server half ever deployed, i.e. is
  migration `004` applied? ⛔ **Not answerable from the repo**; `0215`'s field B8 or this task's step 0
  settles it.
- 🔴 **`0062` STAYS IN SPRINT 4** — owner-ruled 2026-09-04, **over the producer's recommendation to
  move it to the Backlog board.** Recorded; **not re-argued.** This task is the work that finally
  discharges it.
- **Related:** [`0062`](../0062-forward-profile-internal-token-in-deploy/brief.md) — read its `D2`
  section before running anything, so an empty reading is not misread as a defect.
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- 🔒 **No secrets in any artifact** — variable names, file names and ports only.
</content>
