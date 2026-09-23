# Task — Proper S3-Backed Match Archival (Citizen-Gated)

## ID
0030

## Sprint
Sprint 5

⚠️ **The field above is the bare token `Sprint 5` on purpose** — `dashboard.sh`'s drift rule compares
it against the board's identity, and a decorated value is reported as drift. **Do not decorate it.**
📌 Side-effect worth knowing: the **old** multi-line value of this field is the exact truncation
example cited by [`0050-reconcile-sprint-field-values`](../0050-reconcile-sprint-field-values/brief.md)
(its brief quotes `0030`'s value reaching the dashboard as a mid-sentence fragment). That example is
now **stale for this brief only** — `0050` itself is untouched and still has other briefs to fix.

### ➡️ MOVED FROM SPRINT 4 TO SPRINT 5 ON 2026-09-22 — OWNER RULING

**AUTHORITY.** An **OWNER RULING given live in the `fkit lead` session on 2026-09-22**, relayed by
`fkit-lead` to a spawned `fkit-producer` with **no owner channel of its own** (ADR-021). ⛔ **Not
producer precedent.** The owner, asked what this task's two hard blockers were, ruled verbatim:

> *"Move this task and anything that depends on it to the Sprint 5"*

**"ANYTHING THAT DEPENDS ON IT" RESOLVED TO NOTHING — checked, not assumed.** A sweep of
`ai-agents/tasks/` and `ai-agents/sprints/` on 2026-09-22 found **no live dependent**, so **this task
moved alone.** What the four `0030` mentions actually are:

| Task | Mentions `0030` as | Live? |
|---|---|---|
| [`0186-personal-data-compliance-investigation`](../../done/0186-personal-data-compliance-investigation/brief.md) | a dependency (retention/deletion) | ⛔ **No — `✅ Done`** |
| [`0048-compliance-152fz-notification-consent`](../0048-compliance-152fz-notification-consent/brief.md) | *"named only as a PII surface to resolve, **not as a prerequisite**"* — its own words; its `Depends on:` bullet reads **"no task"** | Live, but **not a dependent**. Backlog board, not Sprint 4 |
| [`0217-profile-p2-wire-game-server-to-profile-box`](../0217-profile-p2-wire-game-server-to-profile-box/brief.md) | an **exclusion**-list entry on the XP go-live condition (*"`0030` (hard-blocked on `0017`/`0018`)"*) | Live, but **not a dependent** — it was already excluded, so this move changes nothing there |
| [`0050-reconcile-sprint-field-values`](../0050-reconcile-sprint-field-values/brief.md) | a worked **example** of `## Sprint`-field truncation | Live, but **not a dependent**. Backlog board |

The only `Depends on:` line naming `0030` anywhere is **this brief's own**.

~~🚩 **AND THE OPPOSITE DIRECTION EXISTS:**
[`0009-self-host-upstream-openfront-api-dependency`](../0009-self-host-upstream-openfront-api-dependency/brief.md)
declares it **BLOCKS** `0030` — see the contradiction flagged in `## Notes`. `0009` lives on the
**Backlog board**, not Sprint 4, and was **not** edited.~~
✅ **RESOLVED LATER THE SAME DAY — struck, not deleted.** `0009`'s Blocks claim was found **stale**
and downgraded to *Related* by owner ruling; **`0030`'s blocker count stays TWO**, and `0009` **was**
edited on 2026-09-22 (that last clause above is now out of date). Full verdict, reasoning and
confidence: *"✅ RESOLVED 2026-09-22"* under `## Notes`. `0009` does still live on the **Backlog
board**, not Sprint 4.

⛔ **WHAT DID NOT HAPPEN, stated so nobody has to infer it.**
- ⛔ **The task FOLDER did not move** — it stays under `ai-agents/tasks/backlog/`.
- ⛔ **NO mover skill was invoked.** `/fkit-task-done` and `/fkit-task-cancelled` are for done and
  cancelled; **neither applies to a board move.**
- ⛔ **The `## Status` token is UNCHANGED (`🔲 Backlog`)**, and so is `## Priority`. A change of board
  is not a change of state or of rank. **Scheduled is not started — nobody is building this.**
- ⛔ **Neither hard blocker was discharged, weakened, or re-sequenced by this ruling.** It moved a
  board, nothing else.

**Struck, not deleted — the original Sprint-field prose, which remains true about sequencing:**
~~*"Sprint 4 — In-App Monetization & Citizenship (Phase 2). Sequenced **after** the player profile
store and citizenship implementation land — those are hard prerequisites (see Dependencies), so this
is the tail of the citizenship track, not a blocker for it."*~~ ⚠️ Its **sequencing** claim still
holds; only its **board** is superseded. Note the consequence plainly: both hard blockers
(`0017-citizenship-earned`, `0018-citizenship-paid`) **stay on Sprint 4** — so this task now sits a
board *behind* its prerequisites, which is coherent, not drift.

## Priority
Low within Sprint 4 — no live consumer until citizenship ships. This is the "build it
properly" half of the archive task split; the noise it would otherwise generate is
silenced now by the Sprint 4c task `0159-reduce-archive-telemetry-noise`.

## Status
🔲 Backlog

## Owner
fkit-coder

---

## Context

Match archiving is *intended* to be the authoritative historical store (see
[[systems/match-logging]]): full `GameEndInfo` — map config, game mode, player list with
stats, start/end timestamps, duration, turn count, winner. The architecture already
expects S3-compatible object storage — the config slots exist but are empty:
`storageEndpoint`, `storageBucket`, `storageAccessKey`, `storageSecretKey`.

Match history is a **citizen-only** feature. Until citizenship is implemented there is no
way to know which games to archive and no user who can read the data back, which is why
the inherited archive path was disabled in `0159-reduce-archive-telemetry-noise` rather
than fixed.

Sources:
- `ai-agents/knowledge-base/report-archive-endpoint-task-split-2026-06-01.md` (Phase 2)
- `ai-agents/knowledge-base/plan-fix-archive-endpoint.md`

---

## Dependencies (hard blockers)
1. **Citizenship feature must exist** — required to gate archival to citizen games.
   See the Sprint 4 citizenship briefs (`0017-citizenship-earned`,
   `0018-citizenship-paid`).
2. **S3-compatible bucket + credentials provisioned** — populated into the existing
   config slots via the deploy config. Credentials must follow the post-incident secret
   handling rules — no secrets in git-tracked docs or briefs (see
   [[decisions/vps-credential-leak-response]]).

### 📐 MEASURED STATE OF BLOCKER 2, read 2026-09-22 — so nobody re-derives it

⚠️ **CEILING, read this first: every line below was read from the WORKING TREE on 2026-09-22 — not
from a deployed host.** It says what the repository contains. It says **nothing** about what is set in
the environment of any running game server, and a deployed box can differ. Re-check against the
deploy target before acting.

**Finding, in one line: blocker 2's PLUMBING IS DONE — only the bucket itself is missing.**

| Thing | Measured state |
|---|---|
| Config accessors | All four slots read at `src/core/configuration/DefaultConfig.ts:214-224` — `storageEndpoint()`, `storageAccessKey()`, `storageSecretKey()`, `storageBucket()`, each `process.env.<NAME> ?? ""` |
| Deploy forwarding | All four forwarded at `deploy.sh:315-318` — `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_BUCKET` |
| `.env` | All four keys **present and EMPTY** (no value after `=`) |
| `.env.prod` | All four keys **absent** |
| `.env.prod.secret` | All four keys **absent** |
| Archive switch | `archiveEnabled()` returns a hard `false` at `src/core/configuration/DefaultConfig.ts:315`, with a comment naming **this task** as the one that flips it |
| Overrides | **None.** `archiveEnabled` appears only as the `DefaultConfig.ts:315` implementation and the `Config.ts:68` interface line — `ProdConfig` / `PreprodConfig` / `DevConfig` do **not** override it, and there is **no env override** |
| Consumers of the switch | `src/server/Archive.ts:21` and `src/client/LocalServer.ts:271` — both early-return while it is `false` |

🔒 **RECORDED DELIBERATELY AS KEY NAMES AND EMPTINESS ONLY.** No endpoint, bucket name, key, or
credential value is written here, and none was read or printed while measuring — emptiness was
established by matching on the key lines alone. ⛔ **Keep it that way**: this file is git-tracked (see
[[decisions/vps-credential-leak-response]]).

⇒ **What is left in blocker 2 is the infra half only:** provision the bucket, then populate the four
existing slots through the deploy config. **No code plumbing needs writing** for the config path.

⚠️ **ADVICE, NOT A RULING — do NOT reuse the profile-backup bucket** (`0275`'s). It holds
`age`-encrypted database backups with their own key custody and a proven restore drill; this archive
is a different lifetime, a different access pattern, and a different blast radius. Stand up a
separate bucket. *(The owner has not ruled on this; it is the producer's recommendation.)*

---

## What to Build

**Infra (the bulk):**
- Provision an S3-compatible bucket and add credentials to the deployment config,
  populating `storageEndpoint` / `storageBucket` / `storageAccessKey` /
  `storageSecretKey`.

**Code:**
- Write/read game records to/from the bucket using those config slots.
- **Gate archival to citizen games only** — do not archive every game.
- Re-enable the archive path that `0159-reduce-archive-telemetry-noise` disabled
  (centralized flag → one-line change).
- Add a bounded upload size limit (do not use an unbounded limit; size against real
  compressed record sizes) and a basic retention policy.

---

## Verification

1. Citizen games produce objects in the bucket; non-citizen games are not archived.
2. Replays / history read back correctly from the bucket.
3. Oversized uploads fail cleanly with a bounded, low-severity log — not an unhandled
   rejection.
4. No archive error groups in Uptrace after re-enable.

---

## Notes
- **Depends on:** two hard blockers, flattened from the `## Dependencies (hard blockers)` numbered list
  above (left unedited): (1) the citizenship feature must exist, to gate archival to citizen games only
  — see `0017-citizenship-earned` and `0018-citizenship-paid` (📌 *2026-09-23: `0017` closed as built +
  reviewed, owner ruling — its production checks moved to `0296`; citizenship goes live only at the
  flip owned by `0065` §6; `0018` still open. Whether blocker (1) needs citizenship built or live is
  this brief's own wording and was not re-ruled*); and (2) an S3-compatible bucket plus
  credentials must be provisioned into the existing `storageEndpoint` / `storageBucket` /
  `storageAccessKey` / `storageSecretKey` config slots via the deploy config, following the
  post-incident secret-handling rules (variable names only, never values, in git-tracked files). The
  Sprint field additionally sequences this after the player profile store lands. Full prose above; this
  bullet is the machine-readable form beside it.
- Primarily infra, but the citizen-gating and re-enable code are required too — this is
  not infra-only.
- Coordinate the schedule with the citizenship rollout so archival turns on at the same
  time history becomes reachable.
- ~~Re-confirm the config-slot names against the codebase before implementation; they were
  reported empty as of 2026-06-01.~~ ✅ **DONE 2026-09-22** — names confirmed and emptiness
  re-measured; see *"📐 MEASURED STATE OF BLOCKER 2"* under `## Dependencies`. ⚠️ Read that section's
  ceiling: working tree, not a deployed host.

### ✅ RESOLVED 2026-09-22 — THE BLOCKER COUNT STAYS **TWO**. `0009` IS **NOT** A THIRD BLOCKER.

**Supersedes the 🚩 unresolved-contradiction flag recorded earlier the same day** (which asked
whether `0009` was an unrecorded third hard blocker, and deliberately picked no side). It is
answered. ⛔ **Do not reopen it on the strength of the old wording in any other file.**

**VERDICT — `0009` does not block `0030`.** A spawned `fkit-architect` investigated the one-sided
declaration and returned **NO: `0009`'s "Blocks `0030`" claim is stale; `0030` does not depend on
`0009`; this brief's two-blocker count is correct.**

- **Authority:** spawned `fkit-architect` verdict, **accepted by the owner** in a live `fkit lead`
  session on **2026-09-22** (relayed by `fkit-lead` to a spawned `fkit-producer` with no owner
  channel of its own, ADR-021). ⛔ **Not producer precedent.**
- **Action taken on the other file:** the owner chose *"Downgrade to Related"*. `0009`'s `## Notes`
  Blocks line was edited — `0030` struck from it and replaced with a *Related / touches* note — and
  its `## Context` bullet 1 (*"still depends on this"*) was corrected, struck not deleted.
  ⛔ `0009`'s **scope, status and priority were NOT changed.**

**Why, so it is not re-derived:**
- The claim traces to `ai-agents/knowledge-base/architecture.md:898-902` §13 open question 1, phrased
  **conditionally** — *"This determines whether R2 and the archive task are blocked on an external
  party"* — which got flattened into "Blocks". **The determination was never run**; `0009` is
  findings-only and unstarted.
- `0009`'s own Context says it was parked over *"not knowing where archives were meant to go. Now we
  do."* — **destination ambiguity, since discharged**, not a dependency.
- `0009` **is** right about current code — `src/server/Archive.ts:32` POSTs to `config.jwtIssuer()`,
  the shared root. **But this task's job is to replace that with an S3 write**, so `0030` *removes*
  the archive leg from `0009`'s scope rather than waiting on it. **The arrow points the other way.**
- **The discriminator:** citizen-gating reads `is_citizen` from the **profile server**
  (`src/server/GameServer.ts:1336-1337` via `ProfileApiClient.resolvePlayer`) — **not** from upstream
  flares / `PrivilegeChecker`. Had it keyed off the latter, the dependency would be real.
- **A genuine but non-blocking coupling, recorded so it is not mistaken for a blocker later:**
  `PlayerRecord.cosmetics` (`src/core/Schemas.ts:450`) is filtered by upstream-supplied entitlements.
  It changes what an archived record *contains* — never whether archival can be built, gated or
  shipped — and on the Yandex persistent-ID path `flares` is `undefined` anyway.

⚠️ **CONFIDENCE, STATED HONESTLY — this is not certain.**

| What | Confidence | Why not higher |
|---|---|---|
| The **technical** verdict (`0030` does not depend on `0009`) | **~90%** | Each step is a read line in the working tree. |
| The **intent** question (what "Blocks" meant to its author) | **~70%** | **Code cannot establish what the author meant on 2026-08-09.** The stale-flattening account is the best available reading, not a proof. |

⛔ **`ai-agents/knowledge-base/architecture.md:898-902` WAS NOT CORRECTED.** The owner was explicitly
offered that and **declined**, so the conditional phrasing that seeded this claim still stands there
**by choice** — expect to meet it again and do not "fix" it.

📌 **Possibly-inherited copies of the same claim, FLAGGED NOT ACTED ON:**
`wiki/decisions/adr-104-archiving-disabled.md`, `wiki/decisions/archive-archival-strategy.md` and
`wiki/systems/match-logging` may carry it. Those are `fkit-wiki`'s exclusively (ADR-005) and are left
for a later sync — ⛔ never edit `ai-agents/wiki-vault/` from here.

### 📌 ALSO FILED 2026-09-22 — a live client read this task must eventually repoint

Not a blocker, and **not** a change to the two-blocker count above.
[`0292-client-archive-read-bypasses-archive-enabled-flag`](../0292-client-archive-read-bypasses-archive-enabled-flag/brief.md)
covers `src/client/JoinPrivateLobbyModal.ts:245`, which fetches `${getApiBase()}/game/<lobbyId>` and
is **not** behind `archiveEnabled()` — so `0159`/ADR-104 darkened the **server** archive leg and left
this **client** read live. It is benign today (404, handled as `"not_found"`), but it is the read that
**this task's verification item 2 — *"replays / history read back correctly"* — depends on**, so
`0030` must eventually point it at the bucket. Read `0292` before building that item.
