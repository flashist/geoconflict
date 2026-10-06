# Verify 0248 live — paid citizens see no interstitial ads in production

## ID
0398

> ℹ️ **ID allocation, checked 2026-10-06 before filing** (method:
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md)). Highest on all three boards
> before this run: `0397` (folder names and `## ID` fields agree). `0398`: no task folder, no `## ID` hit, no `.claude/`
> hit; repo-wide only SVG path coordinates.

## Sprint
Sprint 7

*(Earlier value, kept as history — true on 2026-10-06 until the move:)* ~~Sprint 8~~ — moved by
OWNER RULING *"Move both to Sprint 7 (Recommended)"* (2026-10-06, live `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer`; ⛔ not producer precedent), together with `0396`. Reason: `0401` (on Sprint 7) is checked in the same deploy as this task, because
`0301` ships with `0248`. See the 2026-10-06 placement note at the end.

## Priority
50

> 📌 **2026-10-06 — 50 is ADR-035 append rank on [Sprint 7](../../../sprints/plan-sprint-7.md), not a merit rank.**
> Appended after that board's highest (49, `0396`). ⚠️ Flagged for owner confirmation: on merit it is worked directly
> after `0396` and in the same slot as `0401` — appending already lands it directly below `0396`. The note below about
> rank 11 describes the Sprint 8 board and is history.
>
> *(Earlier value, kept as history — on Sprint 8:)* ~~11~~

> ⚠️ **Priority 11 is append rank, NOT a merit ranking — flagged for owner confirmation.**
> **On merit this belongs directly below `0396`**, because it cannot start until `0396` has confirmed the verified
> owner view live, and the owner's standing build/verify-split rule (2026-09-29) puts a verify task *"on top of the next
> sprint"*. Appending happens to land it directly below `0396` already. ADR-035: appended, nothing renumbered; a spawned
> producer never re-ranks. Same branch as `0390`, `0392`, `0395` and `0396`.
>
> ~~⚠️ **Sprint placement is an open question to the owner** — see *Notes*.~~ ✅ Answered 2026-10-06 — Sprint 7 (see
> above).

## Status
🔲 Backlog

## Owner
fkit-producer — ⚠️ **PARTLY EXECUTED BY THE OWNER (human).** The deploy, the Yandex console flip and the live checks
with real test accounts are the owner's. Reading counts afterwards can be done by an agent session where the owner has
approved that access.

*(The field names the accountable fkit seat, because the owner vocabulary admits no person — the same form as
[`0396`](../0396-verify-0250-s3b-live-deploy-the-verified-owner-view-and-confirm-it-in-production/brief.md).)*

## Context

**Filed 2026-10-06 by a spawned `fkit-producer` with no owner channel (ADR-021/037), at `0248`'s close, relayed by
`fkit-lead` driving `/fkit-sprint-ship-loop`.** ⛔ Not producer precedent. Authority: the owner's standing
build/verify-split rule (2026-09-29) — *close the build task on build + review; file a verify task at the top of the
NEXT sprint; it must not block the current sprint's deploy*. `0248`'s approved `plan.md` names this check as belonging
to a verify task after `0396`.

**What this is, in plain terms.**
[`0248`](../../done/0248-suppress-interstitial-ads-for-paid-citizens/brief.md) turns off full-screen (interstitial) ads
for **paid citizens**, at all six places the game shows one (owner ruling R1, 2026-10-06). It does this in one place:
`showInterstitial()` asks *"is this player a paid citizen?"* and, if yes, skips the ad and sends the analytics event
`Ad:InterstitialSuppressed:PaidCitizen`. The answer comes from `0250` S3b's verified owner view, so it is **yes only
for a verified, paid session**; anything unknown means the ad shows. `0248` is built, reviewed and closed on that
(`(agent-closed — not owner-verified)`). **This task is the proof in production:** a paid player really sees no ad,
and everyone else really still does.

**State at filing (2026-10-06).** `0248`'s code is in the working tree — **not committed and not deployed**. Unit tests
prove the gate at its one seam (`npm test` 196/196 suites, 3719/3719 tests). Two things the build **could not** prove,
which this task exists for:
1. The live behaviour on Yandex, at each of the six placements, with the real SDK and a real verified paid account.
2. The **remote half of the kill switch** — the `citizenship_ui` Yandex experiment flag. It cannot be exercised in
   `npm run dev` (`checkExperimentFlag()` returns `true` there unconditionally — see
   [`0238`](../../done/0238-validate-citizenship-ui-kill-switch-in-a-real-build-launch-gate/brief.md)).

**The six placements** (from the [Step 1 report](../../../knowledge-base/reports/2026-10-06-0248-step1-decision-gate.md)):
four fire on **entering** a game — public lobby join, Mission, solo start, private-lobby host start — and two on
**leaving** one — end-of-match exit, in-game quit. None fire during active play.

**Decisions that bear on it:**
- `0248` owner rulings R1 (all six off, one place) and R3 (*"Yes, deploy together (Recommended)"* — deploy with or
  after [`0397`](../../done/0397-show-players-whether-their-session-is-verified/brief.md)), both 2026-10-06 — recorded at the
  end of the `0248` brief.
- [ADR-116](../../../knowledge-base/decisions/adr-116-first-verified-identity-yandex-signed-player-data-at-login.md)
  Decision 4 — an unverified session still gets served, just without paid facts. So an unverified paid player
  **still sees ads**. That is expected, not a fault — it is why `0397` exists.

## What to build

Nothing in source. This is a deploy-and-check task, in order.

### 1. Gates — before deploying
1. **[`0396`](../0396-verify-0250-s3b-live-deploy-the-verified-owner-view-and-confirm-it-in-production/brief.md) has
   passed** — a verified paid account's `GET /v1/profile` shows `is_paid_citizen: true` in production. Until then no
   live client learns its player paid, and ad-free reaches no one (`0248` deploy note, 2026-10-06).
2. **[`0397`](../../done/0397-show-players-whether-their-session-is-verified/brief.md) is live, or ships in the same deploy**
   (owner ruling R3, 2026-10-06).
3. **`0248`'s code is committed** — only on the owner's explicit ask.
4. **A weekend slot** (owner's standing rule, 2026-09-29).

### 2. The deploy — game client
- `0248` is client-only: the **game client** (`build-deploy.sh`). No profile-server change rides with it.
- Record in this folder's `worklog.md`: date, UTC time, version tag, and the rollback target (the previous client).

### 3. The owner's live checks — production, inside the Yandex Games shell
For each check, use a **fresh page load**. Open DevTools → Console. The game logs one line per ad request:
`showInterstitial __ suppressed for a paid citizen` when the gate skips it, `showFullscreenAdv __ BEFORE` when the ad is
requested.

1. **Verified paid account → no ad, at all six placements.** Walk each of the six. At each: no ad appears, and the
   console shows the *suppressed* line. Record six yes/no answers.
2. **The event fires.** `Ad:InterstitialSuppressed:PaidCitizen` appears in GameAnalytics after check 1. It has **no
   placement field** (owner default, 2026-10-06), so expect a count, not a per-placement split. Record the count seen
   and the date. ⚠️ It counts ad **requests**, so it overstates ads actually given up.
3. **Non-paid account → ads still requested.** Same six placements: the console shows `showFullscreenAdv __ BEFORE`
   at each. ⚠️ Yandex has its own frequency cap and may decline to show an ad even when the game asks — so judge by the
   *request* line, not only by whether an ad appeared on screen.
4. **Earned-only citizen (citizen by XP, not paid) → ads still requested.** Same as check 3. Fewer placements is
   acceptable if time is short — record which ones were walked.
5. **Kill switch → ads return.** Flip the `citizenship_ui` flag **off** in the Yandex console. Then, with the
   **verified paid** account on a **fresh session** (flags are read once per page load — a flip never reaches an open
   page), walk at least one placement: the console shows `showFullscreenAdv __ BEFORE`, not the suppressed line.
   **Flip the flag back on** and record both times (UTC).
- ⛔ **Never paste a token, a response body, a player id or a URL** — not in chat, a worklog, a brief, or any tool.
  Yes/no answers, counts, dates and times only.

### 4. ⛔ Rollback
- **Client rollback is safe:** the previous client simply shows ads to everyone, as before `0248`.
- If a non-paid player stops seeing ads (check 3 fails), **roll back first** — ads are the game's main revenue today.

## Verification steps

1. **Gates recorded** in `worklog.md` before the deploy entry: `0396`'s pass and date; `0397` live or in the same
   deploy; the weekend slot.
2. **Deploy recorded:** date, UTC time, version tag, rollback target.
3. **Check 1 recorded** as six yes/no answers, one per placement, with the date.
4. **Check 2 recorded:** the event was seen (yes/no), the count, the date.
5. **Checks 3 and 4 recorded** as yes/no per placement walked, naming which placements were walked.
6. **Check 5 recorded:** flag-off time, fresh-session result (ad requested: yes/no), flag-on time. If the owner chose
   not to flip the production flag (see *Notes*), record that the remote kill switch is **still unverified** — do not
   mark it done.
7. **If any check fails:** file a new task with the readings (a defect or an investigation) — do not reopen `0248`
   silently. This task still closes, with its result recorded as a failed verification pointing at that task.
8. **No secret leaks:** no token, session, response body, player id, key, host, IP or full URL in any artifact.

## Notes

- **Depends on:** [`0248`](../../done/0248-suppress-interstitial-ads-for-paid-citizens/brief.md) (hard — the build,
  built and reviewed), [`0396`](../0396-verify-0250-s3b-live-deploy-the-verified-owner-view-and-confirm-it-in-production/brief.md)
  (hard — the verified owner view live), [`0397`](../../done/0397-show-players-whether-their-session-is-verified/brief.md)
  (hard — deploy together or after, owner ruling R3 2026-10-06)
- **Does not block Sprint 7's deploy** (owner rule, 2026-09-29).
- **Placement:** ~~Sprint 8 per the owner's 2026-09-29 rule. ⚠️ **Open question:** like `0396`, its deploy could fall
  inside Sprint 7's time window — the reasoning that moved `0392` and `0395` to Sprint 7 on 2026-10-05.~~
  ✅ **Answered 2026-10-06 — OWNER RULING *"Move both to Sprint 7 (Recommended)"* (2026-10-06, live `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer`; ⛔ not producer precedent):** moved to [Sprint 7](../../../sprints/plan-sprint-7.md), rank 50 (append
  rank). See the placement note at the end.
- ⚠️ **Open question — the test accounts.** Does the owner have (a) a **paid** account that logs in **verified**,
  (b) a **non-paid** account, and (c) an **earned-only** citizen account? If (c) is missing, record check 4 as *not
  checked live — covered by unit tests* rather than inventing a check.
- ⚠️ **Open question — flipping `citizenship_ui` in production.** Turning the flag off hides citizenship for **every
  player the flag reaches**, not just the test account, for as long as it is off. The owner decides whether a short
  flip is acceptable, and when (a quiet hour). If not, check 5 stays unverified and says so.
- **Not in scope:** rewarded video (`0248` Step 3). Also a known residual from the Step 1 report §1, unverified: if
  Yandex shows a full-screen ad the game did not request, the gate cannot stop it — note it if seen, do not chase it here.
- **Related:** `0248` (the build) · `0250` (S3b, the paid answer) · `0396` (its live check) · `0397` (verified-status
  display) · `0238` (the kill switch) · `0299` (tiered ad analytics).
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.

> 📌 **2026-10-06 — placement answered: moved to Sprint 7.** OWNER RULING *"Move both to Sprint 7 (Recommended)"* (2026-10-06, live `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer`; ⛔ not producer precedent). Option text, verbatim: *"The whole
> citizenship deploy-and-check chain sits on one board. Sprint 7 gets bigger, and some of it may still run past the
> sprint's end."* Reasons put to the owner: [`0401`](../0401-verify-0301-live-the-citizenship-explainer-popup-works-in-production/brief.md)
> (Sprint 7) hard-depends on [`0396`](../0396-verify-0250-s3b-live-deploy-the-verified-owner-view-and-confirm-it-in-production/brief.md)
> (moved with this one), and `0401` is checked in the same deploy as this task, because `0301` ships with `0248`.
> - `## Sprint` and `## Priority` above updated (old values struck); the placement question in *Notes* marked answered.
> - ⚠️ **Still open:** the test accounts and the production `citizenship_ui` flip (*Notes*). And
>   [`0400`](../0400-verify-0397-live-the-session-status-line-shows-the-right-state-in-production/brief.md), run in the
>   same sitting as this task, ~~was **not** in the ruling and stays on Sprint 8.~~ ✅ Moved to Sprint 7 later the same day, rank 51 —
>   OWNER RULING *"Move it to Sprint 7 (Recommended)"*.
> - Not rewritten, now read differently: *"Does not block Sprint 7's deploy"* (in *Notes*) was written while this task
>   sat on Sprint 8; it is now itself a Sprint 7 task.
> Nothing else above this note was edited (ADR-035); status unchanged (`🔲 Backlog`).
