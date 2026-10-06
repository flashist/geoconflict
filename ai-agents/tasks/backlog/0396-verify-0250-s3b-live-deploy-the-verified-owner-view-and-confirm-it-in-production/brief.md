# Verify 0250 S3b live — deploy the verified owner view and confirm it in production

## ID
0396

> ℹ️ **ID allocation, checked 2026-10-06 before filing** (method:
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md)). Highest on all three boards
> before this run: `0395` (folder names and `## ID` fields agree). `0396`: no task folder, no `## ID` hit, no `.claude/`
> hit; no repo-wide prose hit outside SVG files.

## Sprint
Sprint 8

## Priority
10

> ⚠️ **Priority 10 is append rank, NOT a merit ranking — flagged for owner confirmation.**
> **On merit this belongs directly below `0370`**, because the owner's standing build/verify-split rule (2026-09-29)
> puts a verify task *"on top of the next sprint"* and `0370` holds rank 1 by an earlier ruling.
>
> **"Top" conflicts with ADR-035, stated plainly.** On the [Sprint 8 board](../../../sprints/plan-sprint-8.md), ranks
> 2–4 are closed rows (`0373` ➡️ Moved, `0363` ✅ Done, `0358` ✅ Done). Putting this task at rank 1 or 2 would
> renumber them, which ADR-035 forbids *"not even under an owner ruling"*; a new row always appends, and a spawned
> producer never re-ranks. Same branch as `0390`, `0392` and `0395`. **Read it as top group, whatever the number says.**
>
> ⚠️ **Sprint placement is an open question to the owner** — see *Notes*.

## Status
🔲 Backlog

## Owner
fkit-producer — ⚠️ **PARTLY EXECUTED BY THE OWNER (human).** The gate calls, the deploys and the DevTools check are
the owner's. The read-only delta check and post-deploy watch can be run by an agent session with the owner's
read-only SSH approval (confirm it still covers this task first).

*(The field names the accountable fkit seat, because the owner vocabulary admits no person — the same form as
[`0395`](../0395-verify-0340-live-deploy-s3a-and-confirm-verified-logins-in-production/brief.md).)*

## Context

**Filed 2026-10-06 by a spawned `fkit-producer` with no owner channel (ADR-021/037), at `0250`'s close, relayed by
`fkit-lead` driving `/fkit-sprint-ship-loop`.** ⛔ Not producer precedent. Authority: the owner's standing
build/verify-split rule (2026-09-29) — *close the build task on build + review; file a verify task at the top of the
NEXT sprint; it must not block the current sprint's deploy* — applied exactly as `0250`'s approved S3b plan
(`plan-s3b.md` § 6, owner-approved 2026-10-06) says it would be.

**What this is, in plain terms.** [`0250`](../../done/0250-authenticated-profile-read-for-paid-entitlement/brief.md)
slice S3b lets a player whose login was **verified** by Yandex's signature (`vfy:true`) see their **own** true data,
including whether they paid (`is_paid_citizen`). Everyone else still gets the S1 "equalized" view, where a paid and an
earned citizen look the same. S3b is built and reviewed, and `0250` is closed on that. **This task is everything after
that:** passing the gates, deploying it, and proving in production that a verified paid player sees
`is_paid_citizen: true` while an unverified session still sees the S1 view.

**State at filing (2026-10-06).** S1 is live since the 2026-09-29 deploy (commit `68303d5`). **S3b is built but not
committed and not deployed** — `0250` was closed with its code in the working tree. Review round 3 on S3b: *Ready to
merge* (validation-gated), 0 defects.

**Source.** The content below is moved from `0250`'s approved
[`plan-s3b.md`](../../done/0250-authenticated-profile-read-for-paid-entitlement/plan-s3b.md) § *6. Deploy notes*.
Read that section before starting; where this brief and the plan disagree, the plan's text is the approved one and
the owner's rulings at its end win over both.

**Decisions that bear on it:**
- [ADR-116](../../../knowledge-base/decisions/adr-116-first-verified-identity-yandex-signed-player-data-at-login.md)
  — verified identity at login; Decision 4 (unverified reads still served); the *never roll back past S2* rule.
- [ADR-122](../../../knowledge-base/decisions/adr-122-stale-login-gate-is-owner-judgment-no-fixed-window-or-threshold.md)
  — no fixed window or threshold; the owner judges the post-`0391` login numbers by eye before the deploy.
- Design report:
  [`2026-09-27-0250-authenticated-profile-read-design.md`](../../../knowledge-base/reports/2026-09-27-0250-authenticated-profile-read-design.md).

## What to build

Nothing in source. This is a deploy-and-check task, in order.

### 1. The gates — all four, in this order, before deploying
1. **`0340` is deployed in its own, EARLIER slot** (architect advice 2026-10-05; ADR-122 *Consequences*). **Never in
   the same slot as `0340`** — a minting bug plus S3b would hand raw paid facts to the wrong session.
2. **[`0395`](../0395-verify-0340-live-deploy-s3a-and-confirm-verified-logins-in-production/brief.md) has confirmed
   `vfy: true` live** in production (owner ruling 2026-10-05, *"Note only (Recommended)"*). Until then no player is
   verified, and S3b changes nothing anyone can see.
3. **The owner has looked at the post-`0391` login numbers** that exist at the time — stale share, `ok`,
   `id_mismatch`, `bad_payload`, read from the first point after the latest profile deploy (counters restart at each
   profile deploy, so never compare across one) — and decided to deploy or wait (ADR-122). Record the window, the
   numbers and the owner's call, in the owner's words, in this task's `worklog.md`.
4. **A weekend slot** (owner's standing rule, 2026-09-29). Earliest realistic: the slot **after** 10/11 Oct, and only
   if `0395` is done by then.

Also needed, not a gate: the S3b code is **committed** — only on the owner's explicit ask.

### 2. The deploy — profile server + game client
- **What ships:** the **profile server** (`build-deploy-profile.sh` — the projection and routes; the part that
  matters for privacy) and the **game client** (`build-deploy.sh` — `isPaidCitizen` and the `Citizenship:Earned:XP`
  detection).
- **Order: either is safe.** Server first: today's live client strips the new keys and does not run the detector.
  Client first: the new client against the `0340` server sees no owner keys → `isPaidCitizen: false`, no detection —
  same as today. The runbook's usual game → profile order is fine.
- **Not between 02:00 and 03:15 UTC** on the profile side — the backup window.
- **Delta check before deploying:** list every change under the profile server, `src/core/profile` and `migrations`
  between the commit the `0340` deploy (`0395`) ran from and the commit being deployed. Name everything that would
  ride along with S3b. **Stop if anything unexpected is in it.**

### 3. Watch after deploy (read-only)
- `GET /v1/profile` and login error / `bad_request` counts stay flat; `sessionRejected` `invalid` shows no spike.
- `/health` reports the new version tag.
- **Expected, not a fault:** a player whose login was not verified (stale or failed signature) keeps the S1 view and
  `isPaidCitizen: false` (ADR-116 Decision 4).

### 4. The owner's live check — DevTools
1. With a **verified paid test account**: log in to the game in production, and in DevTools read the
   `GET /v1/profile` response. Report **only**: `is_paid_citizen: true` — yes or no.
2. With a **`vfy:false` session**: the same response shows the **S1 view** — no `is_paid_citizen` key at all. Report
   **only**: S1 view — yes or no.
- ⛔ **Never paste a token, a response body, a player id or a URL** — not in chat, a worklog, a brief, or any tool.
  Only the true/false answers.

### 5. Worklog deploy entry
In this task folder's `worklog.md`: date, UTC time, order, image digest(s), **rollback target (the `0340` image)**,
and the ⛔ rollback rule below written out in full.

### 6. ⛔ Rollback
- **Server S3b → `0340` is safe:** verified callers fall back to the S1 view, and the client fails closed.
- **Client rollback is safe:** the old client strips the new keys.
- **Never roll back past S2** — ADR-116's rule, unchanged.

## Verification steps

1. **Gates recorded** in `worklog.md` before the deploy entry's time: the `0340` deploy date (an earlier slot); `0395`'s
   `vfy: true` result and date; the owner's call on the post-`0391` numbers, in the owner's words; the weekend slot.
2. **Delta check recorded:** what rode along with S3b, and a line saying nothing unexpected was in it (or the deploy
   was stopped).
3. **Deploy recorded:** date, UTC time, order, image digest(s), outside 02:00–03:15 UTC on the profile side, rollback
   target = the `0340` image, and the rollback rules written out.
4. **Watch recorded:** the counts above and the `/health` version tag, each with the time read.
5. **Owner's live check recorded** as two true/false answers with the date: verified paid account →
   `is_paid_citizen: true`; `vfy:false` session → S1 view. **If either is wrong:** file a new task with the readings
   (a defect or an investigation) — do not reopen `0250` silently. This task still closes, with its result recorded
   as a failed verification pointing at that task.
6. **No secret leaks:** no token, signature, session, response body, player id, key, host, IP or full URL in any
   artifact. Counts, dates, the version tag and the true/false answers only.

## Notes

- **Depends on:** [`0250`](../../done/0250-authenticated-profile-read-for-paid-entitlement/brief.md) (hard — the S3b
  build, built and reviewed), [`0395`](../0395-verify-0340-live-deploy-s3a-and-confirm-verified-logins-in-production/brief.md)
  (hard — `0340` deployed and `vfy: true` confirmed live)
- **Also needed, not a task:** the owner's ADR-122 look at the post-`0391` numbers; S3b committed (owner's explicit
  ask only); a weekend slot.
- ⚠️ **No `Blocks:` line, on purpose.** `fkit-lead`'s instruction for this filing (2026-10-06): add no dependency from
  a Sprint 7 task onto this one. Instead, [`0248`](../../done/0248-suppress-interstitial-ads-for-paid-citizens/brief.md) (which
  waits on `0250` and now shows as unblocked) carries a dated **note** — *deploy only after this task confirms the
  owner view live* — applying the owner's precedent ruling for the identical `0395` case (2026-10-05, *"Note only
  (Recommended)"*). `0248` reads `is_paid_citizen` through `isPaidCitizen`, so its deploy only means something after
  this one; its build does not need this task.
- **Placement:** Sprint 8 per the owner's 2026-09-29 rule (*verify task on top of the next sprint; it must not block
  the current sprint's deploy*). ⚠️ **Open question:** its earliest deploy is the slot after 10/11 Oct, which may
  still fall inside Sprint 7 — the same reasoning that moved `0392` and `0395` to Sprint 7 on 2026-10-05.
- ⚠️ **Open question — the two test sessions.** Does the owner have a **paid** test account that can log in
  verified? And how is a **`vfy:false`** session obtained once `0340` is live (an older token minted before `0340`'s
  deploy, if still valid; otherwise none may be at hand)? If no `vfy:false` session can be had, record that half as
  *not checked live — covered by the integration suite* rather than inventing a check.
- **Does not block Sprint 7's deploy** (owner rule, 2026-09-29).
- **Related:** `0250` (the build) · `0340` (verified sessions) · `0395` (its live check) · `0392` (the post-`0391`
  numbers) · `0248` (ad-free, the first reader of `isPaidCitizen`) · ADR-116 · ADR-122.
- **Privacy:** true/false answers, counts and dates only. Never paste a token, body, id, host or URL.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
