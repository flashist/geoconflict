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
  Backups **encrypt and upload — proven**; that a backup **RESTORES is UNPROVEN**, ~~and the old
  bucket's objects are permanently unreadable for exactly that reason.~~ 🚨 **THAT SUPPORTING EXAMPLE
  IS RETRACTED 2026-09-10 — the old bucket was EMPTY; there were no objects** (owner, verbatim:
  *"I've already deleted the old bucket, it was empty, we never had anything there."*). ⛔ **The
  CONCLUSION IS UNCHANGED AND `0218` STILL LEADS:** restore is still unproven, and losing the
  illustration does not make it proven. ✅ **Cheapest to prove NOW, while every table has ZERO rows.**
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

📅 **GO-LIVE CONDITION OWNER-RULED 2026-09-14, given live in the lead session (`AskUserQuestion`) and
relayed by `fkit-lead` during `/fkit-sprint-ship-loop`.** Asked whether the game server is wired to the
profile box at the regular weekend deploy slot, the owner answered, verbatim:
*"It depends. If we're ready to do all the planned tasks for full-scale citizenship and profile deploy, then yes. Basically, if everything that is left in the Sprint 4 is done, then yes."*

⇒ **A condition, not a date:**
- ✅ **Every remaining Sprint 4 task done by the weekend deploy slot** ⇒ this phase runs at that slot —
  the game server gets a non-empty `PROFILE_INTERNAL_TOKEN` that matches the box's.
- ⛔ **Anything still open** ⇒ `PROFILE_INTERNAL_TOKEN` **stays blank for that deploy**, exactly as the
  standing blank-token ruling says, and this phase waits for a later owner-chosen window.
- ~~🚩 **The condition's edges were NOT ruled — do not settle them between agents.** Read literally it
  cannot be met: several open Sprint 4 rows sit **downstream of this very wiring** — `0062`'s
  verification, the `0017` / `0012` Deferred Live Tails, `0065` — and `0014` waits on Yandex, not on
  us. Which rows count as *"left"* is the owner's call; put it to the owner before the slot.~~
  *(struck 2026-09-14, kept not deleted — the owner ruled the edges; see the next bullet.)*
- ✅ **EDGES OWNER-RULED 2026-09-14, given live in the lead session (`AskUserQuestion`) and relayed by
  `fkit-lead`.** Asked what *"everything left in Sprint 4"* means, the owner answered, verbatim:
  *"Everything that CAN finish before"*. ⇒ Tasks that can only finish **after** XP is wired, or that
  **wait on Yandex**, do **not** count. **Every other open Sprint 4 task must be done by the weekend
  deploy** for `PROFILE_INTERNAL_TOKEN` to be set. Not producer precedent.
  **Buckets — the producer's sort of the board as read 2026-09-14. The rule is the owner's; the sort
  is not. Re-read the board before the slot.**
  - ⛔ **Excluded — can only finish after the wiring:** `0062` (live verification), `0017` and `0012`
    (Deferred Live Tails), `0065` (also waits on `0014`) — all four named in the question put to the
    owner. **Derived, not named — ⚠️ PRODUCER INFERENCE, NOT owner-confirmed (still so after the 2026-09-14 `0032`/`0064` ruling below):** `0018` (open pending `0065`), `0020` (needs citizenship tiers
    live — `0017`/`0018`), `0030` (hard-blocked on `0017`/`0018`), `0213` (the epic; this task is one
    of its children).
  - ⛔ **Excluded — waits on Yandex:** `0014`.
  - ✅ **Counts — must be done by the weekend deploy:** ~~`0203`,~~ *(struck 2026-09-14, kept — owner
    ruled it off the list; see the `0203` bullet below)* `0253`, `0259`, `0260`
    (🔄 In progress); `0219`, `0220`, `0221` (🚧 Blocked — owner-side live tails); `0238` (🔲 Backlog —
    needs a staging or prod build and the Yandex console, not Yandex approval).
  - ~~🚩 **Not settled by the ruling — owner's call before the slot:** `0032` and `0064`. Neither waits
    on the wiring or on Yandex, but each one's remaining step **is** the weekend game deploy itself —
    `0032` step 5 (owner-ruled to wait for that slot), `0064` verification step 8 (the report-only
    production run); `0064`'s `--enforce` wiring also waits on `0203`. They can finish *at* that
    deploy, not *before* it.~~
    *(struck 2026-09-14, kept not deleted — the owner ruled it; see the next bullet.)*
  - ✅ **`0032` / `0064` OWNER-RULED 2026-09-14, given live in the lead session (`AskUserQuestion`)
    and relayed by `fkit-lead`.** The owner, verbatim: *"Don't count them"* — their last step **is**
    the weekend deploy itself, so they cannot gate it. ⇒ **`0032` and `0064` are EXCLUDED** from the
    go-live list. Not producer precedent. Resolves the producer's earlier flag above.
  - 📌 **Board update, 2026-09-14:** `0259` in the *Counts* bucket is now **`✅ Done (agent-closed — not
    owner-verified)`** — findings delivered, owner accepted the ~14-day retention; follow-up
    [`0263`](../0263-confirm-uptrace-ce-14-day-retention-hard-cap-or-configurable/brief.md) is on the
    Backlog board, not Sprint 4, so it does not count.
  - 📌 **Board update, 2026-09-14:** `0260` in the *Counts* bucket is now **`✅ Done (agent-closed — not
    owner-verified)`** — owner accepted no client symbolication for now and the dead upload was removed;
    follow-up [`0264`](../0264-revisit-client-source-map-symbolication/brief.md) is on the Backlog
    board, not Sprint 4, so it does not count.
  - ✅ **`0203` OWNER-RULED OFF THE GO-LIVE LIST 2026-09-14, given live in the lead session
    (`AskUserQuestion`) and relayed by `fkit-lead`.** Asked whether `0203` should stay on the *"must be
    done before XP goes live"* list — its remaining six items only matter once the guard starts
    blocking deploys (`0064`'s arming), and none makes the weekend deploy safer — the owner answered,
    verbatim: *"Take it off the list"*. ⇒ **`0203` is EXCLUDED; XP go-live does not wait on it.**
    `0203` stays open and must be finished **before `0064` wires `--enforce`** instead. Grounding
    relayed with the question (coder decision pack, 2026-09-14): both deploy call sites run the guard
    `--report-only || true`, nothing passes `--enforce`, and the real tree shows 0 parse failures / 0
    dynamic reads / 0 skips. Not producer precedent.
  - ⚠️ **Risk, flagged not settled:** several counting tasks still need the owner before the slot —
    ~~`0203`'s current run covers only its no-decision items (R4, R13, R14, R19, R21 each need an owner
    decision);~~ *(struck 2026-09-14, kept — `0203` no longer counts, see above)* `0253` waits on the owner's O1–O3 numbers, then a ruling, then a build; `0260` is
    stopped pending owner direction; `0219`/`0220`/`0221` wait on owner-run live tails.
- 📌 **GO-LIVE LIST UPDATE 2026-09-15 — OWNER RULINGS given live in a design discussion in the lead
  session and relayed by `fkit-lead` to a spawned `fkit-producer`. Not producer precedent.**
  - **`0253` now depends on [`0266`](../0266-profile-identity-internal-player-id-platform-logins-login-endpoint/brief.md)**
    (profile identity: internal player id, platform logins, a login endpoint). `0253` is `🚧 Blocked`
    pending `0266`'s design; its tenure-grant flow was redesigned the same day (see `0253`).
  - ✅ **`0266` COUNTS** — filed in Sprint 4 with the owner's scheduling *"before XP go-live"*. It
    neither waits on the wiring nor on Yandex, so under the 2026-09-14 edges ruling it must be done
    for `PROFILE_INTERNAL_TOKEN` to be set.
  - 📅 **XP go-live may slip past this weekend** — owner: *"it's ok"*; it may even skip the next weekend
    slot. **The game deploy still happens, with `PROFILE_INTERNAL_TOKEN` blank** (the standing
    blank-token ruling applies unchanged).
  - ⚠️ The *Risk* bullet above (`0253` waits on O1–O3 numbers) is **superseded as to `0253`**: it now
    waits on `0266`'s design, then a rework of its uncommitted build.
- 📌 **GO-LIVE LIST UPDATE 2026-09-15 (later) — OWNER RULINGS via `AskUserQuestion` in the lead session,
  relayed by `fkit-lead` to a spawned `fkit-producer`: design approved with the login token in v1
  (*"Token now, not later"*), ADR-113 accepted, build *"Split into 4"* (+ monitoring as a 5th slice under
  *"monitoring before go-live"*), alerts by email. Not producer precedent.**
  - `0266` is now an **epic**; the counting work is its five slices. ✅ **All five COUNT** — none waits on
    the wiring or on Yandex: [`0270`](../../done/0270-profile-identity-s1-database-and-rekeying/brief.md) (S1), [`0271`](../../done/0271-profile-identity-s2-login-endpoint-and-session-token/brief.md) (S2), [`0272`](../0272-profile-identity-s3-game-server-resolve-and-credit-by-player-id/brief.md) (S3), [`0273`](../0273-profile-identity-s4-client-login-session-and-bearer-token/brief.md) (S4), [`0274`](../../done/0274-profile-identity-s5-monitoring-and-creation-switch/brief.md) (S5).
  - **This task now depends on all five** (see `## Depends on`). Per design §7: **all of S1–S5 land and
    deploy before `PROFILE_INTERNAL_TOKEN` is set.**
  - ✅ **`0253` still counts**, but its rework now waits on `0273` (S4), not on `0266`'s design.
  - ⚠️ The earlier 2026-09-15 bullet (*"`0253` now depends on `0266`"*, *"`0266` COUNTS"*) is superseded
    as to the gate: read `0266` as the epic of `0270`–`0274`.
  - 🚩 **Post-go-live items from `0274` (S5), flagged for the owner, not ruled:** arm alert A2 on day 8
    after go-live; re-baseline alerts A1–A6 after 14 days.
- 📌 **GO-LIVE LIST UPDATE 2026-09-15 (later still) — OWNER RULING via `AskUserQuestion` in the lead session,
  relayed by `fkit-lead` to a spawned `fkit-producer`: *"New task, before XP go-live"*. Not producer precedent.**
  - ✅ **[`0275`](../../done/0275-profile-backup-restore-reproof-on-006-schema/brief.md) COUNTS** — re-prove the
    backup restore on the `006` schema (update `tests/profile-backup-dryrun.sh`, re-run `0218`'s drill).
    `0218`'s restore proof was made on the pre-`006` tables; it does not carry over. Needs only `0270`
    (done), so it does not wait on the wiring or on Yandex.
  - **This task now depends on `0275`** (see `## Depends on`).
- 📌 **GO-LIVE LIST UPDATE 2026-09-15 (latest) — OWNER RULING via `AskUserQuestion` in the lead session,
  relayed by `fkit-lead` to a spawned `fkit-producer`: *"Small fix; lands before real traffic hits the
  profile server. Built after S3"*. Not producer precedent.**
  - ✅ **[`0276`](../../done/0276-profile-internal-path-case-variants-bypass-nginx-allowlist/brief.md) COUNTS** — close
    the case-variant `/internal/` bypass of the nginx IP allowlist (pre-existing, found by the `0271`
    review; the token still gates the routes). Built after `0272` (S3); does not wait on Yandex.
  - **This task now depends on `0276`** (see `## Depends on`).
- ⚠️ **`## Status` below is UNCHANGED.** A conditional go-live slot is not a start.

## Status
🔲 Backlog

## Owner
fkit-coder / operator

## Depends on
[`0215`](../../done/0215-profile-p1-stand-up-the-box/brief.md) (P1) — a box must exist, be healthy, and hold
a **known** `PROFILE_INTERNAL_TOKEN`.
Plus, added 2026-09-15 on owner rulings relayed by `fkit-lead`: [`0270`](../../done/0270-profile-identity-s1-database-and-rekeying/brief.md) (S1), [`0271`](../../done/0271-profile-identity-s2-login-endpoint-and-session-token/brief.md) (S2), [`0272`](../0272-profile-identity-s3-game-server-resolve-and-credit-by-player-id/brief.md) (S3), [`0273`](../0273-profile-identity-s4-client-login-session-and-bearer-token/brief.md) (S4), [`0274`](../../done/0274-profile-identity-s5-monitoring-and-creation-switch/brief.md) (S5) — the five profile-identity slices of epic `0266`; **all five deployed and verified before `PROFILE_INTERNAL_TOKEN` is set** (design §7).
Plus, added 2026-09-15 (later) on an owner ruling relayed by `fkit-lead`: [`0275`](../../done/0275-profile-backup-restore-reproof-on-006-schema/brief.md) — backup restore re-proven on the `006` schema, **before `PROFILE_INTERNAL_TOKEN` is set**.
Plus, added 2026-09-15 (latest) on an owner ruling relayed by `fkit-lead`: [`0276`](../../done/0276-profile-internal-path-case-variants-bypass-nginx-allowlist/brief.md) — case-variant `/internal/` paths no longer skip the nginx IP allowlist, **before real traffic reaches the profile box**.

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
[`0182/brief.md:185`](../../done/0182-profile-04i-server-bring-up-runbook/brief.md) — that line holds
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
   closes the `0067` question above without needing to answer it first. ~~**Confirm `004` is present in
   `schema_migrations` afterwards.**~~ 📌 **Corrected 2026-09-15 (architect, design §7):** confirm
   `schema_migrations` lists **`001`–`004` and `006_player_identity.sql`** (S1, `0270`) — and **no
   `005`** (deleted, never deployed).
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

### 📌 The `/internal/` boundary now has re-runnable box evidence — inherit it, 2026-09-17

Before wiring the game server, **re-run the probe set `0276` left behind** rather than rediscovering it.
On the deployed box: **eleven read-only probes from a non-allowed host** (three case variants, four edge
forms, all four internal routes) → **403 on every one**, **plus one read-only probe from the allowed game
box** → **401**.

That 401 is the one that matters here. It proves the lowercase internal path from the game box passes the
nginx allowlist and reaches `internalAuth` — so a 403 seen during this task is **not** the allowlist, and
a 401 is the token, not the network. That distinction is exactly the "two silent barriers" problem above:
without this baseline, 401 and 403 are indistinguishable from "working" at the game server. All probes are
plain `curl`s and change nothing. Recorded in
[`0276`](../../done/0276-profile-internal-path-case-variants-bypass-nginx-allowlist/brief.md)'s closing
record. ⚠️ Deployed nginx is **1.28.3**.

## Verification steps

1. **D3 — an actual authenticated profile call succeeds end to end in production.** 🚨 **This is the
   acceptance criterion of this task.** Not "the variable is present"; not "the deploy printed a
   warning-free line" — **a real call, working.** ⚠️ **It is the only check that catches either
   silent barrier.**
2. **D2 (container env read) shows a NON-EMPTY token** on this deploy. ⚠️ **`D2` converts inference
   into fact ONLY on a deploy whose source value was non-empty** — that is what makes this deploy
   different from the 2026-08-29 one.
3. ~~**A profile row is actually created**, and **XP is actually credited**, for a real match in
   production.~~ 📌 **Corrected 2026-09-15 (architect, design §7):** for a real match in production,
   **a `players` row + a `player_identities` row are created, and a `(game_id, player_id)` credit
   lands** — keyed by the internal player id, not the Yandex id. ⚠️ `isConfigured()` being true is not the same as `upsertProfile()` and
   `creditMatch()` succeeding.
4. **D4 — the partial-config warning fires when it should and does NOT fire when both variables are
   set.**
5. **D5 — nothing regressed for the unset case.** With `PROFILE_API_URL` unset (local dev), the
   client still no-ops cleanly and nothing crashes.
6. **The token is not printed anywhere** — not by the warning, not by any log line, not in deploy
   output. Check `deploy.sh` does not echo the heredoc it writes.
7. **The allow-list was measured, not assumed** — the worklog states how the current egress IP was
   determined. 🔒 **Record the METHOD, never the address.**
8. 🆕 ~~**`schema_migrations` contains `004_name_change.sql`** after step 0.~~ 📌 **Corrected 2026-09-15:**
   **`schema_migrations` contains `006_player_identity.sql`** (and `001`–`004`) after step 0. The `004`
   half of the question below was answered read-only by `fkit-lead` on 2026-09-15 (box applied
   `001`–`004`), recorded in the design report's box facts. ⚠️ **Record whether it was
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
