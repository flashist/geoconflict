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

⚠️ **The `High` label is the producer's.** 🔴 **The POSITION/ORDER is OWNER-RULED — see directly below.**

---

🔴 **WORK ORDER OWNER-RULED 2026-09-10, given live in session and relayed through the spawning
session: `0218` (P3) → `0219` (P4) → `0217` (P2).**

🚨 **THIS RUNS P2 *AFTER* P3 AND P4 — the epic's own P-number sequence is DELIBERATELY INVERTED.
⛔ DO NOT "FIX" IT BACK.** The P-numbers record the order the phases were **written** in on
2026-09-04, not the order they are to be **worked** in.

⚠️ **The owner ruled RANK/ORDER, NOT schedule** — ⛔ **`## Status` below is UNCHANGED, no mover skill
was invoked, and this brief stays under `ai-agents/tasks/backlog/`. SCHEDULED IS NOT STARTED.**
⚠️ **The `High` LABEL above is still the producer's** — the owner ruled position, not label.

**The reasoning, recorded because the order is not the obvious one:**

- **`0218` leads** — the restore path is the **only claim in this epic still resting on faith**.
  Backups **encrypt and upload — proven**; that a backup **RESTORES is UNPROVEN**, and the old
  bucket's objects are permanently unreadable for exactly that reason. ✅ **Cheapest to prove NOW,
  while every table has ZERO rows.**
- **`0219` second** — it owns the monitoring gap for **both** unread signals on that box: the
  **certificate renewal log** and **`/opt/profile/backups/last-backup.json`**. **Capability is proven
  for both; nobody is watching either.** **Dated fuse: the certificate's `notAfter` is 2026-11-20 and
  `setup-profile.sh:983`'s twice-daily `certbot renew` starts attempting from ~2026-10-21.**
- **`0217` last** — it is the step that **ENDS THE FREE WINDOW**: once the game server is wired and
  **real citizen rows exist**, the restore drill and any Postgres work **stop being free**.
  ⛔ **LAST IS NOT DEPRIORITIZED — deliberate sequencing, rank unchanged.**

⚠️ **The `Depends on` relationships are UNCHANGED.** The ruling set the order these are worked in; it
did **not** create or remove a technical dependency. 🔒 **ADR-035: the repositioning lift was granted
for THESE MOVES ONLY — not a standing licence, not precedent.**

📌 **`0220` (P5), `0221` (P6) and `0222` (Cleanup) were NOT ruled** — they keep their existing
positions and the producer's ranks.

## Status
🔲 Backlog

## Owner
fkit-coder / operator

## Depends on
[`0215`](../../done/0215-profile-p1-stand-up-the-box/brief.md) (P1) — a box must exist, be healthy, and hold
a **known** `PROFILE_INTERNAL_TOKEN`.

## Context

> 📌 **Citation frame.** Every `file:line` here was re-derived by opening the file, against commit `589249c` **plus the 2026-09-10 citation sweep**. ⚠️ That sweep ADDED lines to `0182`'s brief, so `0182` numbers here are POST-sweep — they will not match a bare `589249c` checkout. Re-derive by matching the described content, never by shifting the number. See [`conventions/file-line-citations.md`](../../../knowledge-base/conventions/file-line-citations.md).

### 🔴 TWO INDEPENDENT SILENT BARRIERS SIT ON THIS EXACT PATH

Both fail **quietly**. Both destroy XP rather than queueing it. **This task is where they are caught
or where they start.**

**Barrier 1 — the shared token.**
`internalAuth` is a `timingSafeEqual` over a **shared** secret
(`src/profile-server/InternalAuth.ts:14-19`, `:26`). If the game server's `PROFILE_INTERNAL_TOKEN`
does not **match** the box's, every credit call gets a **401**. The client is fail-soft with **no
durable queue** (ADR-101) ⇒ **the XP is LOST, not queued**, and ~~**nothing logs above `debug`**~~.
🚨 **CORRECTED 2026-09-10 — the *"nothing logs above `debug`" / "silently swallowed"* half is REFUTED against the source.** A 401 (and a 403) is a non-5xx, non-429 4xx, so `postWithRetry` stops immediately and logs at **WARN — twice per failed batch**: `src/server/ProfileApiClient.ts:265-267` (`` `profile ${path} returned ${response.status}; not retrying` ``, inside the `status < 500 && status !== 429` guard at `src/server/ProfileApiClient.ts:264`) and `src/server/ProfileApiClient.ts:146-149` (`` `credit batch failed after retries; N award(s) dropped …` ``). **Frame `589249c` — `ProfileApiClient.ts` is clean at that commit, so these two numbers are stable.** ⛔ **THE XP-LOSS HALF IS UNTOUCHED AND STANDS IN FULL — the awards are DROPPED, never queued.** 🔴 It still goes unnoticed, because **nothing on that box reads the logs** (`0219`, **OPEN**) — **a warning nobody reads fails as quietly as no warning at all.**

⚠️ **The runbook's original *"leave blank; the box auto-generates"* line is now STRUCK and annotated**
(2026-09-04). **Read against `589249c` + the 2026-09-10 citation sweep (that sweep moved `0182`'s lines down):** the struck sentence is at
[`0182/brief.md:185`](../0182-profile-04i-server-bring-up-runbook/brief.md) — that line holds
`~~*"Optional — leave blank; the box auto-generates and persists it."*~~` — and the same sentence is
quoted inside the `.env.profile.secret` code block at `0182/brief.md:241`; the correction banner runs
`0182/brief.md:182-231` and the corrected value line is `0182/brief.md:248`.
📌 **Citation corrected 2026-09-10 — this brief previously cited `0182/brief.md:136-137`, which is
WRONG:** at `589249c` those two lines are the section header `## 3. Confirm SSH access to the box` and
a blank line. **Re-derive by content, never by shifting the number** —
[`conventions/file-line-citations.md`](../../../knowledge-base/conventions/file-line-citations.md).
🔴 **The LIVE operator trap is now `example.env.profile:92-93`, NOT `0182`** — at `589249c` those lines
read `# PROFILE_INTERNAL_TOKEN= # service token shared with the game server (T6);` /
`#   auto-generated on the box if left blank`, **unstruck and uncorrected**. Anyone copying the example
env file cold will still do the wrong thing.

**Barrier 2 — the IP allow-list.**
`PROFILE_INTERNAL_ALLOW_IPS` in `example.env.profile:33` is pinned to a **June** game-prod egress IP.
nginx enforces `allow …; deny all;` at `/internal/` (`setup-profile.sh:719-720`). A stale value ⇒
**403 on every credit call** — ~~also silently swallowed~~. 🚨 *Corrected 2026-09-10: a 403 is also a non-5xx, non-429 4xx, so it takes the SAME two-WARN path as the 401 (`src/server/ProfileApiClient.ts:265-267`, `:146-149`, frame `589249c`). **Not swallowed — logged and unread** (`0219`, open). The barrier itself is unchanged.*

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
