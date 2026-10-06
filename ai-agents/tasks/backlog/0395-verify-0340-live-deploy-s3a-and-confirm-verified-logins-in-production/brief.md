# Verify 0340 live — deploy S3a and confirm verified logins in production

## ID
0395

> ℹ️ **ID allocation, checked 2026-10-05 before filing** (method:
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md)). Highest on all three boards
> before this run: `0394`. `0395`: no task folder, no `## ID` hit, no `.claude/` hit; repo-wide only SVG-coordinate
> false positives.

## Sprint
Sprint 7

*(Earlier value, kept as history — true on 2026-10-05 until the move:)* ~~Sprint 8~~ — moved by OWNER RULING
*"Move to Sprint 7 (Recommended)"* (2026-10-05, live `AskUserQuestion` in the `fkit lead` session, relayed by
`fkit-lead`; ⛔ not producer precedent). See the 2026-10-05 **move** note at the end.

## Priority
45

> 📌 **2026-10-05 — 45 is ADR-035 append rank on [Sprint 7](../../../sprints/plan-sprint-7.md), not a merit rank.**
> Appended after that board's highest (44, `0392`). On merit: worked at the 10/11 Oct profile slot, after `0340` is
> built and reviewed and after the owner's look via `0392`. The note below about rank 9 describes the Sprint 8 board and
> is history.
>
> *(Earlier value, kept as history — on Sprint 8:)* ~~9~~

> ⚠️ **Priority 9 is append rank, NOT a merit ranking — flagged for owner confirmation.**
> **On merit this belongs directly below `0370`**, because the owner's standing build/verify-split rule (2026-09-29)
> puts a verify task *"on top of the next sprint"*, `0370` holds rank 1 by an earlier ruling, and this task has a
> **fixed date** (the 10/11 Oct profile slot at the earliest) with four tasks' deploys waiting behind it (`0250` S3b,
> `0319`, `0332`, `0323`).
>
> **"Top" conflicts with ADR-035, stated plainly.** On the [Sprint 8 board](../../../sprints/plan-sprint-8.md), ranks
> 2–4 are closed rows (`0373` ➡️ Moved, `0363` ✅ Done, `0358` ✅ Done). Putting this task at rank 1 or 2 would
> renumber them, which ADR-035 forbids *"not even under an owner ruling"*; a new row always appends, and a spawned
> producer never re-ranks. Same branch as `0390` and `0392`. **Read it as top group, whatever the number says.**
>
> ⚠️ **Sprint placement is an open question to the owner.** Its deploy is the 10/11 Oct slot, which Sprint 7 (the
> active sprint) is working toward, while Sprint 8 is not started. See *Notes*.

## Status
🔲 Backlog

## Owner
fkit-producer — ⚠️ **PARTLY EXECUTED BY THE OWNER (human).** The deploy (`npm run deploy:profile`), the explicit
approval to enforce, and the ~2-minute DevTools `vfy` check are the owner's. The read-only post-deploy watch can be
run by an agent session with the owner's read-only SSH approval (confirm it still covers this task first). The
ADR-113 note is `fkit-architect`'s; routing it is the producer's or lead's.

*(The field names the accountable fkit seat, because the owner vocabulary admits no person — the same form as
[`0339`](../../done/0339-verify-0325-s2-live-the-login-signature-check-in-production/brief.md) and
[`0392`](../0392-read-the-post-0391-login-numbers-before-the-0340-deploy/brief.md).)*

## Context

**Filed 2026-10-05 by a spawned `fkit-producer` with no owner channel (ADR-021/037), on OWNER RULINGS given
2026-10-05 live via `AskUserQuestion` in the `fkit lead` session at `0340`'s plan gate, relayed by `fkit-lead`
(driving `/fkit-sprint-ship-loop`).** ⛔ Not producer precedent. Verbatim:
- **Q1 — when is `0340` done:** **"Split it (Recommended)"** — option text: *"Close 0340 once it's built and reviewed.
  A new task 'verify 0340 live' covers the deploy, the live check and the ADR-113 note. Matches your rule."* (the
  owner's 2026-09-29 build/verify rule).
- **Q2 — live proof:** **"I'll check once (Rec)"** — option text: *"About 2 minutes at the deploy. Direct proof, and
  nothing secret leaves your browser."*

**What this is, in plain terms.** [`0340`](../../done/0340-0325-s3a-enforce-mint-verified-sessions/brief.md) builds the
change that makes the profile server hand a **verified** session (`vfy:true`) to a player whose Yandex-signed login
data checks out. `0340` now closes once it is built and reviewed. **This task is everything after that:** deciding
it is OK to turn on, deploying it, proving in production that real logins come back verified, and then recording
the consequence in ADR-113. Nothing a player sees changes.

**Source.** The content below is moved from `0340`'s approved
[`plan.md`](../../done/0340-0325-s3a-enforce-mint-verified-sessions/plan.md) — § *4. Deploy notes* and the rollback bullets
of § *3. Edge cases* — plus the Q2 ruling. Read those two sections before starting; where this brief and the plan
disagree, the plan's text is the approved one and the owner's rulings at its end win over both.

**Decisions that bear on it:**
- [ADR-116](../../../knowledge-base/decisions/adr-116-first-verified-identity-yandex-signed-player-data-at-login.md)
  — the design; § *Amendments to older ADRs* → *ADR-113* holds the note this task triggers.
- [ADR-121](../../../knowledge-base/decisions/adr-121-login-signature-freshness-window-24h-id-checked-first.md) — 24 h
  signature window, id checked first (built in `0391`).
- [ADR-122](../../../knowledge-base/decisions/adr-122-stale-login-gate-is-owner-judgment-no-fixed-window-or-threshold.md)
  — no fixed window or threshold; the owner judges the post-`0391` numbers by eye before this deploy.

## What to build

Nothing in source. This is a deploy-and-check task, in order:

### 1. The gate — all three before deploying
1. **`0391` is live in production** (planned Tue 6 Oct). ⚠️ **If `0391` has not deployed by the slot, do not deploy
   `0340`:** a `0340` build would carry `0391` too, and no post-`0391` data would exist to look at.
2. **The owner has looked at whatever post-`0391` login data exists** — read by
   [`0392`](../0392-read-the-post-0391-login-numbers-before-the-0340-deploy/brief.md): stale share, `ok`,
   `id_mismatch`, `bad_payload`. Counters restarted at the `0391` deploy, so never compare across it; it is
   weekday-only data. The owner judges by eye whether to deploy or wait longer — no fixed bar (ADR-122).
3. **A separate, explicit owner approval to enforce.** Looking at the numbers is **not** that approval (ADR-116,
   kept by ADR-122). Record it in the owner's words, with the date and channel.

### 2. The deploy — profile server only
- **Slot:** the 10/11 Oct weekend at the earliest, via `npm run deploy:profile`.
- **Alone.** Not together with `0250` S3b (architect advice, 2026-10-05; also, S3b is not built).
- **Not between 02:00 and 03:15 UTC** — the backup window. The deploy recreates both containers, overwrites that day's
  backup object, and restarts the counters.
- **Delta check before deploying:** list every change under the profile server, `src/core/profile` and `migrations`
  between the commit `0391` deployed from and the commit being deployed. Name everything that would ride along with
  `0340`. **Stop if anything unexpected is in it.**

### 3. Watch after deploy (read-only)
- The login metric's `ok` share is about the same as before the deploy — S3a does not change classification.
- Login `error` and `bad_request` stay flat.
- `sessionRejected` `invalid` shows no spike.
- `/health` reports the new version tag.
- **Expected, not a fault:** existing `vfy:false` tokens stay valid, so players become verified at their **next**
  login. The verified share grows gradually over the first ~24 h.
- **When reading counts:** a paused-creation 503 or a DB 500 after a successful check mints no token, but the metric
  still counts `ok` — so `ok` is at least the number of verified tokens actually minted, not equal to it.

### 4. The owner's live check — about 2 minutes (Q2 ruling)
At the slot, after the deploy, the owner logs in to the game in production, finds their own login (session) token in
DevTools, decodes **its payload** locally in the browser, and reports **only** `vfy: true` or `vfy: false`.
- ⛔ **The token itself is never pasted anywhere** — not in chat, a worklog, a brief, or any tool. Only the one word.
- `vfy: true` ⇒ verified logins are live. `vfy: false` ⇒ see *Verification steps* 5.

### 5. Worklog deploy entry
In this task folder's `worklog.md`: date, UTC time, order, image digest, **rollback target (the `0391` image)**, and
the ⛔ rollback rule below written out in full.

### 6. ⛔ Rollback — one-way
- **S3a → S2 is safe:** any image built after the 2026-09-29 S2 deploy parses a `vfy:true` token.
- **Never roll S3a back to a pre-S2 build.** A pre-S2 server only accepts `vfy:false`, so every live verified token
  turns invalid and every client logs in again once — survivable but noisy.
- **Preferred rollback target: the `0391` image** recorded at its Tue 6 Oct deploy. It keeps the 24 h window. An older
  S2 image is token-safe, but brings back the 900 s window and its ~32 % stale share.

### 7. After a confirmed deploy — the ADR-113 note (route, don't write)
The trigger is the profile server minting `vfy:true` **in production** — i.e. step 4 says `true`. Then the producer or
lead spawns **`fkit-architect`** (ADR edits are the architect's, never the producer's or coder's), who:
- appends to ADR-113 the note whose content is in ADR-116 § *Amendments to older ADRs* → *ADR-113* (point 5, point 9,
  the re-raise list, the key-rotation note — including that a session-key rotation now drops verified sessions too,
  and the client's relogin re-verifies with a fresh signed call), dated, attributed, append-only, every earlier
  wording kept visible;
- marks that ADR-116 subsection applied;
- ⚠️ also notes, in ADR-116, that its wording making the ADR-113 note *"a close condition for `0340`"* moved to this
  task on the 2026-10-05 Q1 ruling (ADR-116 § *Status*, around its *"ADR-113 trigger is unchanged"* bullet).

### 8. Update the runbook's rollback-target line
In [`weekend-deploy-slot-runbook.md`](../../../knowledge-base/weekend-deploy-slot-runbook.md), the lines that say to
keep *"an S2-or-later profile image as `0340`'s future rollback target"* (§ *Never roll back to*, and § *Rollback
targets after this window* of the 2026-10-03 entry) — append a dated note at deploy time naming **the `0391` image**
as `0340`'s rollback target, and the never-pre-S2 rule. Append-only; do not rewrite the earlier text.

## Verification steps

1. **Gate recorded:** `0391`'s deploy date; the owner's call on the post-`0391` numbers (from `0392`), in the owner's
   words; and the owner's separate approval to enforce, in the owner's words, with date and channel. All three
   present before the deploy entry's time.
2. **Delta check recorded:** the list of changes riding along with `0340`, and a line saying nothing unexpected was in
   it (or the deploy was stopped).
3. **Deploy recorded** in `worklog.md`: date, UTC time, order (profile alone), image digest, outside 02:00–03:15 UTC,
   rollback target = the `0391` image, and the ⛔ never-pre-S2 rule written out.
4. **Watch recorded:** `ok` share before vs after (counts and shares only), login `error` / `bad_request`,
   `sessionRejected` `invalid`, and the `/health` version tag — each with the time read.
5. **Owner's live check recorded** as the single word `vfy: true` or `vfy: false`, with the date. **If `false`:** do
   **not** route the ADR-113 note; file a new task with the readings (a defect or an investigation) — do not reopen
   `0340` silently. This task still closes, with its result recorded as a failed verification pointing at that task.
6. **ADR-113 note applied** by `fkit-architect` (or an owner ruling defers it), and ADR-116's subsection marked
   applied — named by file and date in the worklog.
7. **Runbook rollback-target note appended** and named in the worklog.
8. **No secret leaks:** no token, signature, session, player id, key, host, IP or full URL appears in any artifact.
   Counts, shares, dates, the version tag and the one word `true`/`false` only.

## Notes

- **Depends on:** [`0340`](../../done/0340-0325-s3a-enforce-mint-verified-sessions/brief.md) (hard — the S3a build, built and
  reviewed), [`0392`](../0392-read-the-post-0391-login-numbers-before-the-0340-deploy/brief.md) (hard — the owner's
  look at the post-`0391` numbers, ADR-122)
- **Also needed, not a task:** `0391` live in production (Tue 6 Oct planned;
  [`0391`](../../done/0391-accept-login-signatures-up-to-24-hours-old-checking-the-player-first/brief.md) is built), and
  the owner's separate explicit approval to enforce.
- ⚠️ **No `Blocks:` line, on purpose.** The fkit-lead instruction for this filing (2026-10-05) was: add no dependency
  from a Sprint 7 task onto this one. In reality `0250` S3b, `0319`, `0332` and `0323` read `verified`, so their
  **deploys** only make sense after this task's deploy — and `0319` in particular would refuse every name change if it
  deployed before verified sessions exist. Whether to record that as a dependency is an **open question to the
  owner**, because it would make Sprint 7 tasks wait on a Sprint 8 task. Their builds do not need this task.
- **Placement:** Sprint 8 per the owner's 2026-09-29 rule (*verify task on top of the next sprint; it must not block
  the current sprint's deploy*). ⚠️ Open question: its deploy is the 10/11 Oct slot, during Sprint 7, so Sprint 7 may
  fit better — the same reasoning that moved `0392` to Sprint 7 on 2026-10-05.
- **Does not block Sprint 7's deploy** (owner rule, 2026-09-29).
- **Related:** `0340` (the build) · `0392` (the numbers) · `0391` (the 24 h window, the rollback target) · ADR-116 ·
  ADR-121 · ADR-122 · ADR-113 (the note) · `0394` (re-login on a Yandex account switch — backlog, gates nothing here).
- **Privacy:** counts, shares and dates only. Never paste a token, signature, id, host or URL.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.

## 📌 2026-10-05 — moved to Sprint 7; deploy-after notes on the four `verified` readers (appended; edits above are struck, not deleted, ADR-035)

**Provenance.** OWNER RULINGS given 2026-10-05 live via `AskUserQuestion` in the `fkit lead` session, relayed by
`fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Verbatim:
placement *"Move to Sprint 7 (Recommended)"*; on `0250` S3b / `0319` / `0332` / `0323`, *"Note only (Recommended)"*.

- **Placement answered:** this task is on [Sprint 7](../../../sprints/plan-sprint-7.md), appended at 45; its
  [Sprint 8](../../../sprints/plan-sprint-8.md) row reads `➡️ Moved to Sprint 7 — priority 45` (rank 9 kept). The
  *Sprint placement is an open question* lines above are answered by this; kept as written.
- **The four `verified` readers answered:** `0250` (S3b), `0319`, `0332` and `0323` each carry a dated note — *deploy
  only after this task confirms `vfy: true` live*. **No `Depends on` link to this task was added**, by the owner's
  ruling; the *No `Blocks:` line, on purpose* note above stands.
- **`## Status` unchanged (`🔲 Backlog`). No folder moved, no mover run.**

## 📌 2026-10-06 — how `0340` deploys, and its rollback target (appended; nothing above edited, ADR-035)

**Provenance.** Facts checked read-only by `fkit-lead` on 2026-10-06, relayed to a spawned `fkit-producer` (no owner
channel, ADR-021/037).

- `0391` is live since 2026-10-06T08:09:49Z as profile `0.0.156-profile.2` (commit `0aef613`) — that deploy did
  **not** include `0340`.
- **The `0340` deploy will be from commit `71efd10`**: check that commit out, deploy the profile server from it, then
  return the working tree to where it was.
- **Rollback target: `0.0.156-profile.2`** (the `0391` image) — not `0.0.156-profile.1`, which would also lose the
  24 h window.
- Still gated as above: `0392`'s read and the owner's separate explicit OK to enforce (ADR-116, ADR-122).
- **`## Status` unchanged (`🔲 Backlog`). No mover run.**

## 📌 2026-10-06 — gate 1 MET; gates 2 and 3 still open (appended; nothing above edited, ADR-035)

**Provenance.** Facts checked read-only by `fkit-lead` on 2026-10-06, relayed to a spawned `fkit-producer` (no owner
channel, ADR-021/037).

| § 1 gate | State |
|---|---|
| 1. `0391` is live in production | ✅ **MET 2026-10-06T08:09:49Z** — profile `0.0.156-profile.2`, commit `0aef613`; healthy at the 08:22Z re-check. Record: [`0391` worklog](../../done/0391-accept-login-signatures-up-to-24-hours-old-checking-the-player-first/worklog.md) § *Deploy* |
| 2. The owner has looked at the post-`0391` login data (via [`0392`](../0392-read-the-post-0391-login-numbers-before-the-0340-deploy/brief.md)) | 🔲 **Open.** Only an early ~5-minute sample exists (`ok` 45, `stale` 1, `id_mismatch` 0), read by `fkit-lead` — **not** `0392`'s reading and **not** the owner's look |
| 3. The owner's separate, explicit approval to enforce (ADR-116, ADR-122) | 🔲 **Open** |

- The § 2 slot rule is unchanged: the 10/11 Oct weekend at the earliest, profile only, alone, not 02:00–03:15 UTC.
- **`## Status` unchanged (`🔲 Backlog`). No mover run.**
