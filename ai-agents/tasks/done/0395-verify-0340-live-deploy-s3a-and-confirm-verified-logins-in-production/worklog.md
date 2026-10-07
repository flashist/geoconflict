# Worklog — 0395 Verify 0340 live — deploy S3a and confirm verified logins in production

## 2026-10-07 — gates, delta check, deploy, watch, owner's live check (Verification steps 1–5, 7, 8)

Recorded by a spawned `fkit-producer` with no owner channel (ADR-021/037), on facts and OWNER RULINGS given live
2026-10-07 in the `fkit lead` session (via `AskUserQuestion` unless noted), relayed by `fkit-lead`; ⛔ not producer
precedent. Every reading below was taken by `fkit-lead` or the owner, read-only; this producer copied them as relayed
and queried no server. **Verification step 6 (the ADR-113 note) is not covered here** — it is with `fkit-architect`
at the time of writing; this task stays open until it lands.

### 1. Gates (Verification step 1)

| § 1 gate | State |
|---|---|
| 1. `0391` live in production | ✅ **MET** — live since **2026-10-06T08:09:49Z** (profile `0.0.156-profile.2`, commit `0aef613`). Record: [`0391` worklog](../../done/0391-accept-login-signatures-up-to-24-hours-old-checking-the-player-first/worklog.md) § *Deploy*. |
| 2. The owner's call on the post-`0391` numbers (via [`0392`](../../done/0392-read-the-post-0391-login-numbers-before-the-0340-deploy/brief.md)) | ✅ Given — owner, verbatim: **"Yes to both"** (2026-10-07, `AskUserQuestion` in the `fkit lead` session). Numbers: stale share 3.25 % (241 / 7,426) over ≈22.75 h, weekday-only — [`0392` worklog](../../done/0392-read-the-post-0391-login-numbers-before-the-0340-deploy/worklog.md). |
| 3. The owner's separate, explicit approval to enforce (ADR-116, kept by ADR-122) | ✅ Given — the same answer, **"Yes to both"**, to the question *"… and do you approve verified logins (vfy:true) being on in production?"* (2026-10-07, `AskUserQuestion` in the `fkit lead` session). |

⚠️ **NOT MET as to timing.** Verification step 1 requires all three *"present before the deploy entry's time"*.
Gates 2 and 3 were given **after** the deploy (deploy record 2026-10-07T07:10:45Z): the owner deployed after seeing
the `0392` numbers, before `fkit-lead` put the question. The content of both gates is now on record; the ordering the
brief asked for did not happen.

**Mid-week deploy — an exception to the weekend-slot rule.** The brief's § 2 slot was *"the 10/11 Oct weekend at the
earliest"*. Owner, verbatim: *"I can deploy the profile server now, if needed, wihout waiting for the weekend slot"*.
Same kind of exception as `0391`'s Tue 6 Oct deploy (ADR-122).

### 2. Delta check (Verification step 2)

Run by `fkit-lead` **before** the deploy, read-only git.

- **`0aef613` (the `0391` deploy) → `71efd10`: exactly one commit, `71efd10` (`0340` only).** Shipped profile paths
  changed in it:
  - `src/core/profile/{Inbox,Login,NameChange,Payments}Contract.ts`, `src/core/profile/PlayerProfile.ts`
  - `src/profile-server/{LoginVerification,PublicProjection,Routes,SessionToken,Telemetry}.ts`
- **Deliberately excluded:** `dev` HEAD carries `0250` S3b profile code (commit `6f4ab77`: `PublicProjection.ts`,
  `Routes.ts`, `LoginContract.ts`, `PlayerProfile.ts`). Deploying from `71efd10` kept it out (the brief's § 2
  *"Alone. Not together with `0250` S3b"*).
- `package.json` (0.0.156), deploy tooling, Dockerfile and migrations are unchanged between `71efd10` and HEAD.
- **Nothing unexpected was in the delta.** The deploy was not stopped.

### 3. Deploy (Verification step 3)

| Field | Value |
|---|---|
| Who / what | **Owner-run**, profile server only, **alone** (no game deploy, no `0250` S3b) |
| Date / UTC time | Deploy record **2026-10-07T07:10:45Z**; container started 07:11:13Z |
| Backup window | Outside 02:00–03:15 UTC ✅ |
| Version | **`0.0.156-profile.3`** |
| Commit | `71efd10` (git tag `0.0.156-profile.3` pushed on it) |
| Image digest | `sha256:ea35fe69b4721a8ddabb148218eb4b00ecd0f3ea4801bca0790bfd72a2883114` |
| Working tree after | The owner returned to `dev` with a clean tree |
| **Rollback target** | **`0.0.156-profile.2`** — the `0391` image (commit `0aef613`). ⚠️ Its image digest is not recorded in this repo (the `0391` worklog names the version and commit only). |
| **Rollback target — digest** *(added 2026-10-07, later)* | `0.0.156-profile.2` = commit `0aef613641e410a6228c0f5244f19d5545267bad`, image `sha256:4972040c50956cd3a17c4fab71e1f2ec28393fbd82e3280abc89443667b812be`, deployed 2026-10-06T08:09:49Z. Read by `fkit-lead`, read-only, from the owner's local profile deploy record. `fkit-lead` also confirmed, read-only on the profile box (2026-10-07), that this image is **still present there**, next to the new `ea35fe69…` image. Answers the ⚠️ in the row above. |

**⛔ Rollback rule — one-way (brief § 6, written out in full):**
- **S3a → S2 is safe:** any image built after the 2026-09-29 S2 deploy parses a `vfy:true` token.
- **Never roll S3a back to a pre-S2 build.** A pre-S2 server only accepts `vfy:false`, so every live verified token
  turns invalid and every client logs in again once — survivable but noisy.
- **Preferred rollback target: the `0391` image** (`0.0.156-profile.2`). It keeps the 24 h window. An older S2 image
  (e.g. `0.0.156-profile.1`) is token-safe, but brings back the 900 s window and its ~32 % stale share.

### 4. Watch (Verification step 4)

Read by `fkit-lead` at about **07:13–07:14Z**, read-only.

| Check | Reading |
|---|---|
| `/health` version tag | ok — `0.0.156-profile.3`, commit `71efd10` |
| `/ready` | 200 |
| `profile-api` container | healthy, 0 restarts, 0 error lines (two routine Node startup notices only) |
| `postgres` container | untouched, up 3 days |
| Login verification on `.3`, first ~3 min | `ok` 14 · `stale` 1 · `id_mismatch` 0 (≈93 % `ok`; ≈96 % before — the `0392` window read 96.70 %) |
| `/v1/login` responses | 2xx only — about 6/min after vs 7.2/min before. **No 4xx, no 5xx** (so login `error` / `bad_request` flat at zero) |
| `sessionRejected` | none in 06:40–07:14Z, before or after the deploy (so no `invalid` spike) |
| `/v1/messages` 4xx | about 6/min both before and after — **pre-dates this deploy**, not caused by it |

⚠️ **Only about 3 minutes of post-deploy data.** 15 logins is far too few to compare the `ok` share; it shows nothing
broke at start, not that the share held. Expected, not a fault: existing `vfy:false` tokens stay valid, so the
verified share grows over the first ~24 h as players log in again.

### 5. Owner's live check (Verification step 5)

**`vfy: true`** — 2026-10-07. The token's `iat` (issued-at) decodes to **07:14:31Z**, after the deploy, so it was
minted by `.3`. ⇒ Verified logins are live in production. ⇒ The ADR-113 note (step 6) is triggered and is being
routed to `fkit-architect`.

⚠️ **Handling note (no token content recorded).** The brief's § 4 said the token is never pasted anywhere. The owner
pasted the full session token into `fkit-lead`'s chat. It was not put into any artifact or tool. Owner ruling,
verbatim: *"Let it expire (Recommended)"*. It expires **2026-10-08 07:14 UTC**. There is no per-token revoke, and
rotating the session secret would log out every player.

### 6. ADR-113 note (Verification step 6)

~~**Open** — being done by `fkit-architect` at the time of writing. To be named here by file and date when it lands.~~

✅ **Done 2026-10-07 by `fkit-architect`** (relayed by `fkit-lead`):
- [`adr-113-profile-internal-player-id-and-platform-identities.md`](../../../knowledge-base/decisions/adr-113-profile-internal-player-id-and-platform-identities.md)
  — dated 2026-10-07 note, append-only: point 5, point 9, the re-raise item and the key-rotation note; quotes the
  owner's *"Yes to both"* with its question text.
- [`adr-116-first-verified-identity-yandex-signed-player-data-at-login.md`](../../../knowledge-base/decisions/adr-116-first-verified-identity-yandex-signed-player-data-at-login.md)
  — § *Status* note (the ADR-113 close condition moved from `0340` to this task); the ADR-113 subsection marked
  ✅ APPLIED 2026-10-07, plus two ✅ pointers.

### 7. Runbook rollback-target note (Verification step 7)

Appended to [`weekend-deploy-slot-runbook.md`](../../../knowledge-base/weekend-deploy-slot-runbook.md) as the dated
section *"📌 2026-10-07 — profile deploy `0340` (S3a, mid-week, owner ruling): rollback target"* at the end of the file.
It names `0.0.156-profile.2` (the `0391` image) as `0340`'s rollback target and writes out the never-pre-S2 rule.
Append-only: the § *Never roll back to* line (*"keep an S2-or-later profile image as S3a's … future rollback
target"*) and the 2026-10-03 § *Rollback targets after this window* entry are left as written.

### 8. No secret leaks (Verification step 8)

This entry carries counts, shares, dates, version tags, short commit ids, an image digest and file paths only — no
token, signature, session, player id, key, host, IP or full URL. The token's `iat` time is recorded; nothing of the
token itself is.

### Status

`🔲 Backlog` → **`🔄 In progress`** (brief and Sprint 7 row). **Not closed** — step 6 is open.

*(2026-10-07, later — superseded:)* step 6 is done (above), and the rollback digest is recorded (step 3). Closed via
`/fkit-task-done` as `✅ Done (agent-closed — not owner-verified)`, on the owner's choice of an option whose text read
*"0395 gets its record and closes"* (relayed by `fkit-lead`). ⚠️ **Gate-timing deviation stands:** the owner's call on
the numbers and the approval to enforce (*"Yes to both"*) were given **after** the deploy (07:10:45Z), not before it as
Verification step 1 required.
