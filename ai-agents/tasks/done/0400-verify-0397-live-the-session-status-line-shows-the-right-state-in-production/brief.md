# Verify 0397 live: the session-status line shows the right state in production

## ID
0400

> ℹ️ **ID allocation, checked 2026-10-06 before filing** (method:
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md)). Highest on all three boards
> before this run: `0399` (folder names and `## ID` fields agree). `0400`: no task folder, no `## ID` hit, no hit under
> `ai-agents/` or `.claude/`.

## Sprint
Sprint 7

*(Earlier value, kept as history — true on 2026-10-06 until the move:)* ~~Sprint 8~~ — moved by
OWNER RULING *"Move it to Sprint 7 (Recommended)"* (2026-10-06, live `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer`; ⛔ not producer precedent), after `0396` and `0398` moved the same day. Option text: *"The whole chain really is on one board."* See the
2026-10-06 placement note at the end.

## Priority
51

> 📌 **2026-10-06 — 51 is ADR-035 append rank on [Sprint 7](../../../sprints/plan-sprint-7.md), not a merit rank.**
> Appended after that board's highest (50, `0398`). ⚠️ Flagged for owner confirmation: on merit it is worked in the
> same sitting as `0398`, after `0396` — appending already lands it directly below `0398`. The note below about rank 12
> describes the Sprint 8 board and is history.
>
> *(Earlier value, kept as history — on Sprint 8:)* ~~12~~

> ⚠️ **Priority 12 is append rank, NOT a merit ranking — flagged for owner confirmation.**
> **On merit this belongs directly below `0396`** (beside `0398`), because it cannot start until `0396` has confirmed
> the verified owner view live, and the owner's standing build/verify-split rule (2026-09-29) puts a verify task *"on
> top of the next sprint"*. "Top" conflicts with ADR-035: ranks 2–4 are closed rows (`0373` ➡️ Moved, `0363` ✅ Done,
> `0358` ✅ Done), and a new row always appends. ~~Appending lands it directly below `0398`, which already sits directly
> below `0396` — so it is in the right group.~~ *(📌 2026-10-06, later: `0396` and `0398` moved to Sprint 7 (49, 50),
> and this task followed at 51, directly below `0398` there.)* Nothing renumbered; a spawned producer never re-ranks. Same branch as
> `0390`, `0392`, `0395`, `0396` and `0398`.
>
> ~~⚠️ **Sprint placement is an open question to the owner** — see *Notes*.~~ ✅ Answered 2026-10-06 — Sprint 7 (see
> above).

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-producer — ⚠️ **PARTLY EXECUTED BY THE OWNER (human).** The deploy, the Yandex console flip and the live checks
with real test accounts are the owner's. Reading GameAnalytics counts afterwards can be done by an agent session where
the owner has approved that access.

*(The field names the accountable fkit seat, because the owner vocabulary admits no person — the same form as
[`0398`](../../done/0398-verify-0248-live-paid-citizens-see-no-interstitial-ads-in-production/brief.md).)*

## Context

**Filed 2026-10-06 by a spawned `fkit-producer` with no owner channel (ADR-021/037), at `0397`'s close, relayed by
`fkit-lead` driving `/fkit-sprint-ship-loop`.** ⛔ Not producer precedent. Authority: the owner's standing
build/verify-split rule (2026-09-29) — *close the build task on build + review; file a verify task at the top of the
NEXT sprint; it must not block the current sprint's deploy*.

**What this is, in plain terms.**
[`0397`](../../done/0397-show-players-whether-their-session-is-verified/brief.md) adds a short **status line inside the
citizenship card**, on the start screen only (never in a match). It tells a logged-in player whether the game could
confirm their account this visit, so a paid citizen who still sees ads knows why. It also folded in
[`0278`](../../cancelled/0278-missing-session-surface-on-the-logged-in-citizenship-card/brief.md): a logged-in player
no longer briefly sees the guest card with a login button, and a profile that fails to load gets a message and a
**Restart game** button. `0397` is built, reviewed and closed `(agent-closed — not owner-verified)`. **This task is the
proof in production.**

**State at filing (2026-10-06).** `0397`'s code is in the working tree — **not committed and not deployed**. Unit tests
cover every state (`npm test -- --maxWorkers=4`: 199/199 suites, 3863 passed, 1 skipped — the Docker-gated harness,
skipped not passed). On a local build only **guest**, **checking** and **couldn't load** were seen, and those two were
stubbed by hand in DevTools. **Never seen on a real build:** RU text, the verified state, the not-confirmed state, the
real restart path, and the remote half of the kill switch (`citizenship_ui` cannot be exercised in `npm run dev` —
[`0238`](../../done/0238-validate-citizenship-ui-kill-switch-in-a-real-build-launch-gate/brief.md)).

**The approved states and wording** are in `0397`'s brief, section *Step 1 — CLOSED 2026-10-06*, table *Approved
wording*. Use that table as the answer key; this brief does not copy it, so there is one source.

**Decisions that bear on it:**
- `0397` owner ruling **Q4** (2026-10-06, *"Confirm + rollback rule (Recommended)"*): the S3b profile server never goes
  live while a production client without `0397` runs. `0397` may ship in the **same slot as `0396`**: S3b server
  first, then the owner's `0396` DevTools check, then the client. A server rollback also rolls the client back or
  switches `citizenship_ui` off.
- `0248` owner ruling **R3** (2026-10-06): `0248` deploys together with `0397`, or after it.
- [ADR-116](../../../knowledge-base/decisions/adr-116-first-verified-identity-yandex-signed-player-data-at-login.md)
  Decision 4 — an unverified session is still served, just without paid facts. That is why the not-confirmed state
  exists.
- Before `0395` and `0396` are live, **every** logged-in citizen would see "not confirmed" (`0397` worklog). This is why
  both are hard dependencies here.

## What to build

Nothing in source. This is a deploy-and-check task, in order.

### 1. Gates — before deploying
1. **[`0395`](../../done/0395-verify-0340-live-deploy-s3a-and-confirm-verified-logins-in-production/brief.md) has passed** —
   verified logins (`vfy: true`) are live.
2. **[`0396`](../../done/0396-verify-0250-s3b-live-deploy-the-verified-owner-view-and-confirm-it-in-production/brief.md) has
   passed, or runs in the same slot, server first** (owner ruling Q4).
3. **`0397`'s code is committed** — only on the owner's explicit ask.
4. **A weekend slot** (owner's standing rule, 2026-09-29).

### 2. The deploy — game client
- `0397` is client-only: the **game client** (`build-deploy.sh`). It is natural to ship it in the same deploy as
  `0248` and run this task's checks in the same sitting as
  [`0398`](../../done/0398-verify-0248-live-paid-citizens-see-no-interstitial-ads-in-production/brief.md).
- Record in this folder's `worklog.md`: date, UTC time, version tag, and the rollback target (the previous client).

### 3. The owner's live checks — production, inside the Yandex Games shell
Use a **fresh page load** for each check. Compare every shown text with the *Approved wording* table in `0397`'s brief.

1. **Checking.** With the network throttled (DevTools → Network → a slow preset), a logged-in player sees
   "Checking your account…" briefly, and **never** the guest card or a login button. Record yes/no.
2. **Verified paid citizen.** Sees "✓ Verified — your paid citizenship benefits are on". Record yes/no.
3. **Unverified citizen.** Sees the neutral "We couldn't confirm your account this time…" text, with **no button**.
   Record yes/no, or *not checked live* (see the open question in *Notes* on how to get such a session).
4. **Unverified non-citizen.** Sees **nothing new** in the card. Record yes/no, or *not checked live*.
5. **Couldn't load, and its Restart button.** Force the profile read to fail on the owner's own device (for example
   DevTools → Network → block that one request; never paste the URL anywhere). Check, in order:
   - the card shows "We couldn't load your profile right now…" and a **Restart game** button;
   - pressing it on the start screen **reloads** the game;
   - with the block still on, the reloaded page shows "Still not working. Please try again a bit later…";
   - if the button can be reached while a lobby, a join, or a match is open, pressing it there does **nothing**.
     If it cannot be reached there, record that instead.
   Then remove the block and confirm a normal load. Record each as yes/no.
6. **RU text.** With the game in Russian, repeat whichever of checks 1–5 can be reached; each text matches the RU
   column exactly. Record which states were read in RU.
7. **Kill switch.** Flip `citizenship_ui` **off** in the Yandex console. On a **fresh session** (flags are read once per
   page load), nothing from `0397` shows — no status line, no button. **Flip it back on** and record both times (UTC).
   If `0398` runs in the same sitting, **one flip can serve both tasks** — see *Notes*.
8. **Analytics.** In GameAnalytics, after the checks above, look for `Citizenship:Status:Unverified`,
   `Citizenship:Status:ReadFailed` and `Citizenship:Status:Restart`. Record for each: seen yes/no, the count, the date.
   ⚠️ `Unverified` counts earned and paid citizens together, on purpose — it cannot count paid ones alone.
- ⛔ **Never paste a token, a response body, a player id or a URL** — not in chat, a worklog, a brief, or any tool.
  Yes/no answers, counts, dates and times only.

### 4. ⛔ Rollback
- **Client rollback:** the previous client shows no status line and returns the old guest-card flash. Safe on its own.
- ⚠️ **But Q4 binds the pair:** if the S3b server is live, the client without `0397` must not run against it — so a
  client rollback also means switching `citizenship_ui` off, or rolling S3b back too. Decide which before the deploy,
  and write it in `worklog.md`.

## Verification steps

1. **Gates recorded** in `worklog.md` before the deploy entry: `0395`'s pass and date; `0396` passed or same slot,
   server first; the weekend slot.
2. **Deploy recorded:** date, UTC time, version tag, rollback target, and the chosen rollback for the Q4 pairing.
3. **Checks 1–5 recorded** as yes/no each (check 5 as its four parts). A state that could not be reached reads *not
   checked live — covered by unit tests*, never a guessed yes.
4. **Check 6 recorded**, naming which states were read in RU.
5. **Check 7 recorded:** flag-off time, fresh-session result (nothing shown: yes/no), flag-on time. If the owner chose
   not to flip the production flag, record that the remote kill switch is **still unverified** — do not mark it done.
6. **Check 8 recorded:** each of the three events seen yes/no, with count and date.
7. **If any check fails:** file a new task with the readings (a defect or an investigation) — do not reopen `0397`
   silently. This task still closes, with its result recorded as a failed verification pointing at that task.
8. **No secret leaks:** no token, session, response body, player id, key, host, IP or full URL in any artifact.

## Notes

- **Depends on:** [`0397`](../../done/0397-show-players-whether-their-session-is-verified/brief.md) (hard — the build,
  built and reviewed), [`0395`](../../done/0395-verify-0340-live-deploy-s3a-and-confirm-verified-logins-in-production/brief.md)
  (hard — verified logins live), [`0396`](../../done/0396-verify-0250-s3b-live-deploy-the-verified-owner-view-and-confirm-it-in-production/brief.md)
  (hard — the S3b owner view live, or the same slot server-first per owner ruling Q4)
- **Blocks:** nothing
- **Does not block Sprint 7's deploy** (owner rule, 2026-09-29).
- **Run together with `0398`.** Same client deploy (`0248` ships with `0397`, ruling R3), same test accounts, and one
  `citizenship_ui` flip can cover both kill-switch checks. Two tasks still, because each closes on its own result.
- **Placement:** ~~Sprint 8 per the owner's 2026-09-29 rule. ⚠️ **Open question:** like `0396` and `0398`, its deploy
  could fall inside Sprint 7's time window — the reasoning that moved `0392` and `0395` to Sprint 7 on 2026-10-05.~~
  ✅ **Answered 2026-10-06 — OWNER RULING *"Move it to Sprint 7 (Recommended)"* (2026-10-06, live `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer`; ⛔ not producer precedent):** moved to [Sprint 7](../../../sprints/plan-sprint-7.md), rank 51 (append
  rank), with `0396` (49) and `0398` (50) already moved there. See the placement note at the end.
- ⚠️ **Open question — the test accounts.** Does the owner have (a) a **paid** citizen account that logs in
  **verified**, (b) an **earned-only** citizen, and (c) a **non-citizen** logged-in account? The same accounts serve
  `0398`.
- ⚠️ **Open question — how to get an unverified session in production.** Checks 3 and 4 need a logged-in session the
  server does not verify. Once `0395` is live, most real sessions **are** verified, and there may be no simple way for
  the owner to force one. If none is found, record checks 3 and 4 as *not checked live — covered by unit tests*
  rather than inventing a check. An agent may not invent a production trick for this; ask the owner or `fkit-architect`.
- ⚠️ **Open question — flipping `citizenship_ui` in production.** Turning the flag off hides citizenship for **every
  player the flag reaches**, not just the test account, for as long as it is off. The owner decides whether a short
  flip is acceptable, and when (a quiet hour). If not, check 7 stays unverified and says so.
- **Known, not in scope:** `Citizenship:Status:Unverified` / `ReadFailed` fire whether or not the card is on screen
  (`0397` worklog, reviewer observation 7) — a possible follow-up, not a failure of this check. The small re-render
  window after a late Yandex login is untested (`0397` worklog) — note it if seen, do not chase it here.
- **Related:** `0397` (the build) · `0278` (folded into `0397`) · `0395` · `0396` · `0398` · `0248` · `0238` (the kill
  switch) · `0332` (will change the not-confirmed wording when its rulings land).
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.

> 📌 **2026-10-06 — placement answered: moved to Sprint 7.** OWNER RULING *"Move it to Sprint 7 (Recommended)"* (2026-10-06, live `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer`; ⛔ not producer precedent). Option text, verbatim: *"The whole chain
> really is on one board. It goes to the end of Sprint 7, at rank 51."* Earlier the same day `0396` and `0398` moved to
> Sprint 7 (OWNER RULING *"Move both to Sprint 7 (Recommended)"*); this task hard-depends on `0396` and runs with `0398`.
> - `## Sprint` and `## Priority` above updated (old values struck); the placement question in *Notes* marked answered;
>   the priority note's *"directly below `0398` … below `0396`"* sentence struck and corrected (it described Sprint 8).
> - ⚠️ **Still open:** the test accounts, how to get an unverified session in production, and the production
>   `citizenship_ui` flip (*Notes*).
> - Not rewritten, now read differently: *"Does not block Sprint 7's deploy"* (in *Notes*) was written while this task
>   sat on Sprint 8; it is now itself a Sprint 7 task.
> Nothing else above this note was edited (ADR-035); status unchanged (`🔲 Backlog`).

> ✅ **2026-10-08 — CLOSED `✅ Done (agent-closed — not owner-verified)`** by a spawned `fkit-producer` (no owner
> channel, ADR-021/037) via `/fkit-task-done`, on OWNER RULINGS given live 2026-10-08 in the `fkit lead` session,
> relayed by `fkit-lead`; ⛔ not producer precedent. Typed by the owner, answering *"Close 0400 too, or leave it open?"*:
> *"Close it, pointing at the Sprint 8 re-check"*; then, via `AskUserQuestion`, **"New producer, my ruling in
> (Recommended)"**. Results in [`worklog.md`](worklog.md), game `0.0.157`.
> - ⚠️ **Check 8 (analytics) is NOT passed.** `Citizenship:Status:Unverified` and `Citizenship:Status:Restart` were
>   **not seen** in the 2026-10-08 GameAnalytics read; `Citizenship:Status:ReadFailed` was seen (95, partial day).
>   Carried by [`0418`](../../backlog/0418-recheck-in-gameanalytics-the-two-0397-status-events-missing-from-the-2026-10-08-read/brief.md)
>   (Sprint 8 — *Recheck in GameAnalytics the two 0397 status events missing from the 2026-10-08 read*).
> - **Checks 3 and 4: not checked live — covered by unit tests** (both owner test accounts log in verified).
> - **Verification step 7** (a failed check points at a new task) is met by pointing at `0418`, by the owner ruling
>   above. `0397` not reopened.
> - Passed live: checks 1, 2, 5 (all four parts, plus the normal reload), 6 (RU: checking, verified paid, couldn't
>   load, still failing), 7 (kill switch — off/on times approximate only, ~5 min ending ≈09:48Z).
> Nothing above this note was edited except the `## Status` line (was `🔲 Backlog`).
