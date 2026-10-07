# Verify 0250 S3b live — deploy the verified owner view and confirm it in production

## ID
0396

> ℹ️ **ID allocation, checked 2026-10-06 before filing** (method:
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md)). Highest on all three boards
> before this run: `0395` (folder names and `## ID` fields agree). `0396`: no task folder, no `## ID` hit, no `.claude/`
> hit; no repo-wide prose hit outside SVG files.

## Sprint
Sprint 7

*(Earlier value, kept as history — true on 2026-10-06 until the move:)* ~~Sprint 8~~ — moved by
OWNER RULING *"Move both to Sprint 7 (Recommended)"* (2026-10-06, live `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer`; ⛔ not producer precedent), together with `0398`. Reason: `0401` (on Sprint 7) hard-depends on this task. See the 2026-10-06 placement
note at the end.

## Priority
49

> 📌 **2026-10-06 — 49 is ADR-035 append rank on [Sprint 7](../../../sprints/plan-sprint-7.md), not a merit rank.**
> Appended after that board's highest (48, `0401`). ⚠️ Flagged for owner confirmation: **on merit it is worked right
> after `0395`** (Sprint 7 rank 45), because it cannot deploy until `0395` confirms `vfy: true` live, and `0398`, `0400`
> and `0401` all wait on it. The note below about rank 10 describes the Sprint 8 board and is history.
>
> *(Earlier value, kept as history — on Sprint 8:)* ~~10~~

> ⚠️ **Priority 10 is append rank, NOT a merit ranking — flagged for owner confirmation.**
> **On merit this belongs directly below `0370`**, because the owner's standing build/verify-split rule (2026-09-29)
> puts a verify task *"on top of the next sprint"* and `0370` holds rank 1 by an earlier ruling.
>
> **"Top" conflicts with ADR-035, stated plainly.** On the [Sprint 8 board](../../../sprints/plan-sprint-8.md), ranks
> 2–4 are closed rows (`0373` ➡️ Moved, `0363` ✅ Done, `0358` ✅ Done). Putting this task at rank 1 or 2 would
> renumber them, which ADR-035 forbids *"not even under an owner ruling"*; a new row always appends, and a spawned
> producer never re-ranks. Same branch as `0390`, `0392` and `0395`. **Read it as top group, whatever the number says.**
>
> ~~⚠️ **Sprint placement is an open question to the owner** — see *Notes*.~~ ✅ Answered 2026-10-06 — Sprint 7 (see
> above).

## Status
🔲 Backlog

## Owner
fkit-producer — ⚠️ **PARTLY EXECUTED BY THE OWNER (human).** The gate calls, the deploys and the DevTools check are
the owner's. The read-only delta check and post-deploy watch can be run by an agent session with the owner's
read-only SSH approval (confirm it still covers this task first).

*(The field names the accountable fkit seat, because the owner vocabulary admits no person — the same form as
[`0395`](../../done/0395-verify-0340-live-deploy-s3a-and-confirm-verified-logins-in-production/brief.md).)*

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
2. **[`0395`](../../done/0395-verify-0340-live-deploy-s3a-and-confirm-verified-logins-in-production/brief.md) has confirmed
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
  build, built and reviewed), [`0395`](../../done/0395-verify-0340-live-deploy-s3a-and-confirm-verified-logins-in-production/brief.md)
  (hard — `0340` deployed and `vfy: true` confirmed live)
- **Also needed, not a task:** the owner's ADR-122 look at the post-`0391` numbers; S3b committed (owner's explicit
  ask only); a weekend slot.
- ⚠️ **No `Blocks:` line, on purpose.** `fkit-lead`'s instruction for this filing (2026-10-06): add no dependency from
  a Sprint 7 task onto this one. Instead, [`0248`](../../done/0248-suppress-interstitial-ads-for-paid-citizens/brief.md) (which
  waits on `0250` and now shows as unblocked) carries a dated **note** — *deploy only after this task confirms the
  owner view live* — applying the owner's precedent ruling for the identical `0395` case (2026-10-05, *"Note only
  (Recommended)"*). `0248` reads `is_paid_citizen` through `isPaidCitizen`, so its deploy only means something after
  this one; its build does not need this task.
- **Placement:** ~~Sprint 8 per the owner's 2026-09-29 rule (*verify task on top of the next sprint; it must not block
  the current sprint's deploy*). ⚠️ **Open question:** its earliest deploy is the slot after 10/11 Oct, which may
  still fall inside Sprint 7 — the same reasoning that moved `0392` and `0395` to Sprint 7 on 2026-10-05.~~
  ✅ **Answered 2026-10-06 — OWNER RULING *"Move both to Sprint 7 (Recommended)"* (2026-10-06, live `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer`; ⛔ not producer precedent):** moved to [Sprint 7](../../../sprints/plan-sprint-7.md), rank 49 (append
  rank). See the placement note at the end.
- ⚠️ **Open question — the two test sessions.** Does the owner have a **paid** test account that can log in
  verified? And how is a **`vfy:false`** session obtained once `0340` is live (an older token minted before `0340`'s
  deploy, if still valid; otherwise none may be at hand)? If no `vfy:false` session can be had, record that half as
  *not checked live — covered by the integration suite* rather than inventing a check.
- **Does not block Sprint 7's deploy** (owner rule, 2026-09-29).
- **Related:** `0250` (the build) · `0340` (verified sessions) · `0395` (its live check) · `0392` (the post-`0391`
  numbers) · `0248` (ad-free, the first reader of `isPaidCitizen`) · ADR-116 · ADR-122.
- **Privacy:** true/false answers, counts and dates only. Never paste a token, body, id, host or URL.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.

> 📌 **2026-10-06 — deploy and rollback rule added by OWNER RULING on `0397` (Q4).** Given live via `AskUserQuestion` in
> the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer` (ADR-021/037); ⛔ not producer precedent.
> Owner, verbatim: *"Confirm + rollback rule (Recommended)"*. What it adds to this task:
> - **The S3b profile server never goes live while a production game client without
>   [`0397`](../../done/0397-show-players-whether-their-session-is-verified/brief.md) is running.** Reason: `0248`'s ad gate is
>   already committed on `dev` and switches on by itself once the S3b server sends the owner view; owner ruling R3 says
>   `0248` reaches players only with or after `0397`.
> - **`0397` may ship in the same slot as this task:** the S3b **server first**, then the owner's DevTools check (§4),
>   then the game client carrying `0397`. ⚠️ So §2's *"Order: either is safe"* **no longer holds** once `0397` rides in
>   the same deploy — server first is now required.
> - **Rollback:** if the S3b server is rolled back (to the `0340` server), **also roll the game client back, or switch
>   the `citizenship_ui` flag off** (hides the citizenship card). Otherwise every logged-in citizen is shown *"We
>   couldn't confirm your account this time…"*.
> Details: [`2026-10-06-0397-step1-product-spec.md`](../../../knowledge-base/reports/2026-10-06-0397-step1-product-spec.md) §11.
> Nothing above this note was edited (ADR-035); no status, rank or sprint changed.

> 📌 **2026-10-06 — placement answered: moved to Sprint 7.** OWNER RULING *"Move both to Sprint 7 (Recommended)"* (2026-10-06, live `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer`; ⛔ not producer precedent). Option text, verbatim: *"The whole
> citizenship deploy-and-check chain sits on one board. Sprint 7 gets bigger, and some of it may still run past the
> sprint's end."* Reasons put to the owner: [`0401`](../0401-verify-0301-live-the-citizenship-explainer-popup-works-in-production/brief.md)
> (Sprint 7) hard-depends on this task; `0401` is checked in the same deploy as
> [`0398`](../0398-verify-0248-live-paid-citizens-see-no-interstitial-ads-in-production/brief.md) (moved with this one),
> because `0301` ships with `0248`.
> - `## Sprint` and `## Priority` above updated (old values struck); the placement question in *Notes* marked answered.
> - ⚠️ **Still open:** the two test sessions (*Notes*). And
>   [`0400`](../0400-verify-0397-live-the-session-status-line-shows-the-right-state-in-production/brief.md), which also
>   hard-depends on this task, ~~was **not** in the ruling and stays on Sprint 8.~~ ✅ Moved to Sprint 7 later the same day, rank 51 —
>   OWNER RULING *"Move it to Sprint 7 (Recommended)"*.
> - Not rewritten, now read differently: *"Does not block Sprint 7's deploy"* and the *"no dependency from a Sprint 7
>   task onto this one"* instruction (in *Notes*) were written while this task sat on Sprint 8. This task is now itself on
>   Sprint 7, and so are `0398` and `0401`, which depend on it.
> Nothing else above this note was edited (ADR-035); status unchanged (`🔲 Backlog`).

> 📌 **2026-10-07 — OWNER RULING: the post-`0391` login numbers are no longer a gate (gate 3 removed).** Given live by
> the owner in a session on 2026-10-07, relayed to a spawned `fkit-producer` holding no owner channel (ADR-021/037);
> ⛔ not producer precedent. Owner, verbatim: *"I made a decision that we no longer wait for those numbers. Monitor them
> as planned and after a few days we will check them again to make better decisions but they no longer block us so the
> point is that we already improved this tail numbers drastically and we can move forward"*. Plain reading: `0391`
> already cut the stale-login tail a lot, so nothing waits on the numbers any more; they are still watched and re-read
> in a few days, to inform later decisions only.
> - **§1 gate 3 is removed.** The owner's look at the post-`0391` numbers (stale share, `ok`, `id_mismatch`,
>   `bad_payload`) before this deploy is no longer needed. **Verification step 1's** *"the owner's call on the
>   post-`0391` numbers, in the owner's words"* is likewise no longer required; record this ruling's date in its place.
>   The *Notes* line *"Also needed, not a task: the owner's ADR-122 look …"* and the ADR-122 bullet in *Context* are
>   superseded on that point. The numbers re-read is now [`0402`](../0402-re-read-the-post-0340-login-verification-numbers-in-a-few-days/brief.md)
>   — non-blocking.
> - **Gates that remain:** 1 — `0340` deployed in its own, earlier slot: ✅ **met 2026-10-07** (deploy record
>   2026-10-07T07:10:45Z, [`0395`](../../done/0395-verify-0340-live-deploy-s3a-and-confirm-verified-logins-in-production/worklog.md)); 2 — `0395` confirmed
>   `vfy: true` live: ✅ **met 2026-10-07**; 4 — a weekend slot (still open). Not a gate, unchanged: S3b committed only on
>   the owner's explicit ask. Every other rule in this brief (delta check, server-first order with `0397`, rollback,
>   no-secrets) is unchanged.
> - ⚠️ **This session's reading, NOT an owner ruling:** §1 gate 4's *"Earliest realistic: the slot after 10/11 Oct"*
>   assumed `0340` would deploy **on** 10/11 Oct, so gate 1 (*"never the same slot as `0340`"*) pushed this task one
>   slot later. `0340` actually deployed **2026-10-07, a weekday**. So the 10/11 Oct weekend is already a later,
>   separate slot, and gate 1 is met by it — 10/11 Oct is a possible slot for this task, not ruled out by gate 1.
> - ADR-122 itself is being updated separately (by `fkit-architect`); this note does not edit it. Nothing above this
>   note was edited (ADR-035); no status, rank or sprint changed.
