# Verify 0301 live — the citizenship explainer popup works in production

## ID
0401

> ℹ️ **ID allocation, checked 2026-10-06 before filing** (method:
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md)). Highest on all three boards
> before this run: `0400` (folder names and `## ID` fields agree). `0401`: no task folder, no hit under
> `ai-agents/tasks/`, `ai-agents/sprints/` or `.claude/`.

## Sprint
Sprint 7

*(Earlier value, kept as history — true on 2026-10-06 until the move:)* ~~Sprint 8~~ — moved by OWNER RULING
*"Move it to Sprint 7"* (2026-10-06, live `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`;
⛔ not producer precedent). Reason, as for `0396`/`0398`/`0400`: the deploy may land inside Sprint 7. See the
2026-10-06 **owner rulings** note at the end.

## Priority
48

> 📌 **2026-10-06 — 48 is ADR-035 append rank on [Sprint 7](../../../sprints/plan-sprint-7.md), not a merit rank.**
> Appended after that board's highest (47, `0399`). ⚠️ Flagged for owner confirmation: **on merit it is worked in the
> same slot as `0398`** (`0301` deploys with `0248`). The note below about rank 13 describes the Sprint 8 board and is
> history.
>
> *(Earlier value, kept as history — on Sprint 8:)* ~~13~~

> ⚠️ **Priority 13 is append rank, NOT a merit ranking — flagged for owner confirmation.**
> **On merit this belongs directly below `0398`**, because the owner's standing build/verify-split rule (2026-09-29)
> puts a verify task *"on top of the next sprint"*, and `0301` cannot be deployed without `0248` (already in `dev`),
> whose own live check is `0398` — so both are naturally checked in the same slot. "Top" conflicts with ADR-035: ranks
> 2–4 (and 8–9) are closed rows, and a new row always appends; a spawned producer never re-ranks. Appending lands it
> directly below `0400`, in the same group of verify rows. Nothing renumbered.
>
> ~~⚠️ **Sprint placement is an open question to the owner** — see *Notes*.~~ ✅ Answered 2026-10-06 — Sprint 7 (see
> above).

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-producer — ⚠️ **PARTLY EXECUTED BY THE OWNER (human).** The deploy, the test purchase and every check inside the
Yandex Games shell are the owner's. ~~The local look (check 5) can be run by an agent session with a browser, or by the
owner.~~ **2026-10-06 owner rulings:** an **agent** does the local look first, **then the owner** looks (§ 1); an
**agent** writes and tests the two DevTools Console snippets on the local dev build (§ 1a) before the owner's live checks.

*(The field names the accountable fkit seat, because the owner vocabulary admits no person — the same form as
[`0398`](../0398-verify-0248-live-paid-citizens-see-no-interstitial-ads-in-production/brief.md).)*

## Context

**Filed 2026-10-06 by a spawned `fkit-producer` with no owner channel (ADR-021/037), at `0301`'s close, relayed by
`fkit-lead` driving `/fkit-sprint-ship-loop` on Sprint 7.** ⛔ Not producer precedent. Authority: the owner's standing
build/verify-split rule (2026-09-29) — *close the build task on build + review; file a verify task at the top of the
NEXT sprint; it must not block the current sprint's deploy*. `0301`'s approved `plan.md` § 8 names these checks as
belonging to a separate verify task.

**What this is, in plain terms.**
[`0301`](../../done/0301-citizenship-explainer-popup-and-purchase-funnel/brief.md) added a *"What is citizenship?"*
popup. It says what citizenship gives and how to earn it free, and offers a Buy button (or a login button for a guest).
It opens three ways: a link on the citizenship card, a *Citizenship* section in Instructions, and a tap on the locked
Create Lobby button (this replaced `0302`'s interim "citizens only" popup). The card stays the only owner of purchase
state: the popup's Buy button runs the card's own buy path. `0301` is built, reviewed and closed on that
(`(agent-closed — not owner-verified)`). **This task is the proof in the real game.**

**State at filing (2026-10-06).** `0301`'s code is in the working tree — **not committed and not deployed**. Unit tests
cover the logic (full `npm test` green on re-run, 202/202 suites; the first run was red on two failures outside the task
— a `0197` SIGSEGV and a supertest-family failure; the Docker secret-boundary harness was **skipped, not passed**). The
owner already confirmed in production that the ★ badge and the name change work (owner ruling Q5, *"Both work — close
it"*). What the build **could not** prove, and this task exists for:
1. A **real purchase** from the popup, with the card switching to the citizen state **without a reload**.
2. The **guest login** from the popup, inside Yandex.
3. The popup inside the **real Yandex iframe** (`yandex-games_iframe.html` is the template production serves).
4. The **locked-tap path** for a tester — unreachable in dev (`isCreateLocked()` is false there), unit tests only.
5. **Nobody has looked at it by eye.** Plan § 6 step 11 (the local look in `npm run dev`: layout, ru and en, no raw
   keys) was **not done** before close.

**Release facts that bind the deploy:**
- Any deploy of `0301` also deploys [`0248`](../../done/0248-suppress-interstitial-ads-for-paid-citizens/brief.md)
  (already in `dev`, commit `91eb99a`), so `0248`'s deploy conditions apply: [`0396`](../0396-verify-0250-s3b-live-deploy-the-verified-owner-view-and-confirm-it-in-production/brief.md)
  passed, and [`0397`](../../done/0397-show-players-whether-their-session-is-verified/brief.md) live or in the same
  deploy (`0248` owner ruling R3, 2026-10-06).
- `0354`'s release gate item 5 is met only when `0301` is **deployed**.

## What to build

Nothing in source. A look, then a deploy, then live checks — in this order.

### 1. Before the deploy — the local look (check 5, the step `0301` skipped)
In `npm run dev` (all flags read true there), on a real browser:
- Card link → popup opens → Close works.
- Instructions → *Citizenship* section → link → popup opens **above** Instructions.
- Switch language ru ↔ en: every line renders, no raw `citizenship_explainer.*` keys, no clipped or overlapping text,
  usable at phone width.
- Record yes/no per item. If something looks wrong, file a defect task before deploying — do not deploy a broken look.
- **Who (OWNER RULING 2026-10-06, *"First agent, next me"*):** an agent session with a browser does this look first and
  records it; then the owner looks. Both records go in `worklog.md`, each marked with who looked.

### 1a. Before the owner's live checks — write and test the two Console snippets (added by OWNER RULING 2026-10-06)
The owner has no spare non-citizen account, so checks 1 and 4 fake the "not a citizen" state with a snippet pasted into
the browser's DevTools Console. An agent **writes both snippets and tests them on the local dev build first**, so the
owner gets snippets known to work. Put the final snippets in this folder (e.g. `snippets.md`) — they hold no secret, no
id, no URL.
- **Snippet A — "not a citizen" for the purchase (check 1):** makes the client show the account as not a citizen, so the
  popup offers Buy.
- **Snippet B — "non-citizen tester" for the locked tap (check 4):** sets the tester marker (localStorage key
  `geoconflict_tester` = `1`, read by `isTesterMarkerSet()` in `src/client/flashist/FlashistFacade.ts`) and makes the
  card's published status non-citizen (`PrivateLobbyAccess.isCreateLocked()` reads `getCitizenshipStatus() !== "citizen"`).
- **Apply right before the tap.** The card re-reads the profile on its own and may overwrite the faked state; the
  snippet must be run immediately before the tap it serves, and the instructions must say so.
- **In the Yandex iframe the Console must be switched to the game iframe's context** (DevTools context dropdown) — the
  instructions to the owner must say this, or the snippet runs on the Yandex host page and does nothing.
- ⚠️ **Limit found while filing — the locked tap cannot be proven on the local dev build.** `isCreateLocked()` returns
  `false` unconditionally when the build-time `GAME_ENV` is `"dev"` (`src/client/PrivateLobbyAccess.ts`, dev-only bypass,
  owner ruling 2026-09-27); webpack sets it to `"dev"` for every development build, including `npm run dev`. No Console
  snippet can change it. So on `npm run dev` only Snippet B's **parts** can be tested (marker set → row visible; published
  status reads non-citizen) — **not** the locked look or the locked tap. ~~See open question (e) in *Notes*.~~
  ✅ **Settled 2026-10-06 — OWNER RULING *"Accept the half test"*** (relayed by `fkit-lead`; ⛔ not producer precedent):
  **no local production-build attempt.** Snippet B is tested on `npm run dev` for the half dev can show — the tester
  marker shows the row, and the published status reads non-citizen — and nothing more. **The owner's live check 4 in
  Yandex is the first full test of the locked look and the locked tap.** Say so to the owner when handing over the
  snippet.
- ⚠️ **No source change in this task.** The citizenship status lives in a module variable, not on `window`. If a snippet
  cannot be written without adding a debug hook to the source, **stop and report** — that is a new owner decision, not
  part of this task.
- Record in `worklog.md`: each snippet tested (yes/no), on which build, what was and was not proven.

### 2. Gates — before deploying
1. Check 1 above passed (or its defects are fixed).
2. `0248`'s gates: `0396` passed; `0397` live or in the same deploy.
2a. § 1a done: both snippets written and tested, with what was and was not proven recorded (not a deploy gate for
    the deploy itself — a gate for the owner's checks 1 and 4).
3. `0301`'s code is committed — only on the owner's explicit ask.
4. A weekend slot (owner's standing rule, 2026-09-29).

### 3. The deploy — game client
- Client-only (`build-deploy.sh`). Record in this folder's `worklog.md`: date, UTC time, version tag, rollback target.

### 4. The owner's live checks — production, inside the Yandex Games shell
Fresh page load for each. Do checks 2–4 **before** check 1 on the same account, because a purchase makes that account a
citizen for good and the locked button then unlocks.
1. **Test purchase from the popup** — ~~(non-citizen, logged in)~~ **re-scoped by OWNER RULINGS 2026-10-06** (see
   below): logged in on the owner's **currently-paid citizen test account**, Snippet A applied right before the tap:
   card link → popup → Buy → complete the Yandex purchase. The card shows the citizen state **without a reload**, and the
   popup closes. In GameAnalytics: `Citizenship:Explainer:Opened:CardLink`, `UI:Tap:PurchaseCitizenshipExplainer`, then
   `Purchase:Started:Citizenship` and `Purchase:Completed:Citizenship`.
   - **Which account (OWNER RULING, verbatim, final):** *"Or maybe I need to leave it as is now, to keep the 2
     earned/paid citizenships for testing. Yes, I think I will run it with the currently "paid" citizenship acc"*. The
     owner picks the account at test time; **its id is not recorded — not now, not in the worklog** (the no-ids rule
     below).
   - ⛔ **Keep the earned account earned.** The owner keeps one **earned** and one **paid** test account on purpose, for
     future testing. This check **must not** be run on the earned account — a purchase there would make it a paid
     citizen for good (`is_paid_citizen`, ad-free included) and lose the earned test account.
   - **No real money (OWNER RULING, verbatim):** *"I don't need to pay real money again, I am in the list of testing
     accounts on Yandex.Games, I am not paying anything there"*. Earlier, verbatim: *"I don't have another spare account,
     we used 2 my test accounts. But I can run some code in Dev Tools Console to "mimick" the "not purchased" acc."*
   - **Side effects — none that matter.** Checked in code by `fkit-lead` 2026-10-06: `/v1/payments/yandex/intent`
     (`src/profile-server/Routes.ts`) does not refuse an existing citizen; a re-grant only re-sets the flags and keeps
     `citizenship_purchased_at` (`PaymentsRepository.ts`, `GRANT_FLAGS_SQL`). On an account that is already paid it sets
     flags that are already set. The only traces: **one extra ledger row** and **probably a second post-grant inbox
     message**.
   - ⚠️ **Weaker proof than on a true non-citizen — record it honestly.** The account is already a paid citizen, so the
     card switching to citizen could come from the card's own profile re-read, not from the purchase, and the grant
     changes no flag. What shows the purchase went through is `Purchase:Completed:Citizenship` arriving (and, if ever
     read, the extra ledger row — read-only, no ids copied out). Record "card switched without reload" with this caveat,
     never as stronger than it is.
   - *(Superseded the same day, kept as history — OWNER RULING relayed by `fkit-lead`, then reversed by the owner:)*
     ~~**Which account:** *"Let's test it on the "earned" citizen, I don't remember the id, but I will find it when
     needed"* — the owner's earned-citizen test account; the owner accepted that it becomes a paid citizen for good,
     ad-free included (one extra ledger row; probably a second inbox message). **Side benefit:** that account could then
     also serve `0398`'s ad-free check.~~
2. **Guest login from the popup** (logged out, inside Yandex): the popup shows a login button, not Buy. Tap it → the
   Yandex login runs; `UI:Tap:CitizenshipLoginExplainer` arrives.
3. **The popup inside the real iframe:** it opens, reads correctly in ru, closes; nothing is cut off by the frame.
4. **Locked-tap path, as a tester** (`0302`'s tester marker set, account **not** a citizen): the Create Lobby button
   shows `0302`'s locked look; a tap opens **this** popup (never the host modal, never the old "citizens only" popup).
   `LockedFeature:Tap:PrivateLobby` then `Citizenship:Explainer:Opened:LockedFeature:PrivateLobby` arrive.
   - **How (OWNER RULING 2026-10-06, verbatim):** *"Again, I think we need to "mimick" the "not-citizen" property but
     running some code on Dev Tools Console, and after that I will be able to test it"*. Snippet B (§ 1a), applied right
     before the tap, in the game iframe's Console context. No separate tester account.
- **Order with snippets:** the "checks 2–4 before check 1" rule above still holds — keep it; it costs nothing.
- ⛔ **Never paste a token, a response body, a player id, a purchase token or a URL** — not in chat, a worklog, a
  brief, or any tool. Yes/no answers, counts, dates and times only.

### 5. ⛔ Rollback
- Client rollback returns the previous client (no popup; the interim locked popup comes back). It also rolls back
  `0248` — say so if it is used.
- ~~A purchase taken in check 1 is real and stays; rollback does not undo it.~~ The test purchase from check 1 (a Yandex
  test payment, no money charged — owner ruling 2026-10-06) stays: its ledger row and inbox message remain; the account
  was already a paid citizen. Rollback does not undo it.

## Verification steps

1. **Local look recorded** (§ 1) in `worklog.md`: yes/no per item, ru and en, phone width, date — **two entries**,
   the agent's first, then the owner's (owner ruling 2026-10-06).
1a. **Snippets recorded** (§ 1a): both written and tested on `npm run dev` (yes/no each); for Snippet B, the two halves
   dev can show — row visible with the marker (yes/no), published status reads non-citizen (yes/no) — and, stated
   plainly, **locked look and locked tap not tested locally** (owner ruling *"Accept the half test"*; first full test is
   check 4 live); final snippets in this folder.
2. **Gates recorded** before the deploy entry: `0396` pass and date; `0397` live or same deploy; the weekend slot.
3. **Deploy recorded:** date, UTC time, version tag, rollback target.
4. **Check 1 recorded:** run on the currently-paid test account (yes/no — **never** the earned one); Snippet A applied
   right before the tap (yes/no); purchase completed (yes/no); card switched without reload (yes/no, with the
   weaker-proof caveat from § 4); popup closed (yes/no); the four events seen (yes/no each), date.
5. **Check 2 recorded:** login button shown instead of Buy (yes/no); login ran (yes/no); event seen (yes/no).
6. **Check 3 recorded:** opens, ru text correct, closes, nothing clipped — yes/no each.
7. **Check 4 recorded:** Snippet B applied right before the tap, in the iframe's Console context (yes/no); locked look
   unchanged (yes/no); tap opens this popup (yes/no); both events seen (yes/no).
8. **If any check fails:** file a new task with the readings — do not reopen `0301` silently. This task still closes,
   with its result recorded as a failed verification pointing at that task. If a check could not be run (no suitable
   account, owner declines a real purchase, a snippet that does not work live), record it as **not checked live**, never
   as passed.
9. **No secret leaks:** no token, session, response body, player id, key, host, IP or full URL in any artifact.

## Notes

- **Depends on:** [`0301`](../../done/0301-citizenship-explainer-popup-and-purchase-funnel/brief.md) (hard — the build,
  committed and deployed), [`0248`](../../done/0248-suppress-interstitial-ads-for-paid-citizens/brief.md) (hard — ships in
  the same deploy), [`0396`](../0396-verify-0250-s3b-live-deploy-the-verified-owner-view-and-confirm-it-in-production/brief.md)
  (hard — `0248`'s deploy gate), [`0397`](../../done/0397-show-players-whether-their-session-is-verified/brief.md) (hard —
  live or in the same deploy, `0248` owner ruling R3)
- **Does not block Sprint 7's deploy** (owner rule, 2026-09-29). Natural to run in the same slot as
  [`0398`](../0398-verify-0248-live-paid-citizens-see-no-interstitial-ads-in-production/brief.md).
- **(a) Placement:** ~~Sprint 8 per the owner's 2026-09-29 rule. ⚠️ **Open question:** like `0396`/`0398`, the deploy
  may fall inside Sprint 7's time window.~~ ✅ **Answered 2026-10-06 — OWNER RULING *"Move it to Sprint 7"*:** moved to
  [Sprint 7](../../../sprints/plan-sprint-7.md), rank 48 (append rank).
- **(b) The purchase:** ~~⚠️ **Open question — the real purchase.** Check 1 spends real money and turns the test account
  into a citizen for good. Which non-citizen account does the owner use, and is a real purchase acceptable? If not,
  check 1 is recorded as *not checked live*.~~ ✅ **Answered 2026-10-06 — OWNER RULINGS:** no real money (Yandex test-
  payment account); no spare non-citizen account, so Snippet A fakes "not a citizen"; run on the owner's
  **currently-paid** citizen test account, **never the earned one** (kept earned on purpose). An earlier same-day ruling
  for the earned account was reversed by the owner. Detail and verbatim quotes in § 4, check 1.
- **(c) The tester account for check 4:** ~~⚠️ **Open question.** It must carry the tester marker and **not** be a
  citizen.~~ ✅ **Answered 2026-10-06 — OWNER RULING:** no separate account; Snippet B sets the tester marker and fakes
  the non-citizen status (§ 1a, § 4 check 4).
- **(d) Who runs the local look (§ 1):** ~~⚠️ **Open question.** An agent session with a browser can do it before the
  deploy; otherwise the owner.~~ ✅ **Answered 2026-10-06 — OWNER RULING *"First agent, next me"*.**
- **(e) Where to prove Snippet B's locked tap before the owner's live check:** ✅ **Answered 2026-10-06 — OWNER RULING
  *"Accept the half test"*** (live `AskUserQuestion`, relayed by `fkit-lead`; ⛔ not producer precedent): option (2) —
  no local production-build attempt; half test on `npm run dev`; check 4 live is the first full test. Kept as history:
  ~~⚠️ **(e) NEW open question, raised at filing 2026-10-06 — where to prove Snippet B's locked tap before the owner's
  live check.** On `npm run dev` the locked look and tap cannot appear at all (`isCreateLocked()` is always `false` in a
  development build, by the 2026-09-27 dev-only bypass), so the owner-ruled "tested on the local dev build first" can
  only prove Snippet B's parts. Options: (1) also try it on a locally served **production-mode** build
  (`npm run build-prod` output) — no deploy, but that build may not boot fully outside Yandex; or (2) accept parts-only
  local proof, with the full locked tap first proven by the owner live. **Producer recommendation: (1), falling back to
  (2) if the production-mode build will not run locally** — record which happened. Not decided; for the owner.~~
- ⚠️ **Risk, not a question yet — a snippet may need a source hook.** Citizenship status lives in a module variable, not
  on `window`. If neither snippet can be written without a source change, the snippet-writing agent stops and reports;
  adding a debug hook is a new owner decision.
- **Related:** `0301` (the build) · `0302` (locked look, tester marker) · `0303` (card updates without reload) ·
  `0248`/`0398` (same deploy) · `0354` (release gate item 5) · `0238` (the kill switch).
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.

### 📌 2026-10-06 — owner rulings on open questions (a)–(d), relayed

**AUTHORITY.** OWNER RULINGS given live 2026-10-06 in the `fkit lead` session (via `AskUserQuestion`, plus owner
follow-ups in prose), relayed by `fkit-lead` to a spawned `fkit-producer` holding **no owner channel** (ADR-021/037).
⛔ **Not producer precedent.**

**What changed in this brief.** `## Sprint` 8 → 7 and `## Priority` 13 → 48 (old values struck, kept); `## Owner` names
the agent-then-owner local look and the snippet step; new § 1a (write and test two Console snippets on the local dev
build first; in the Yandex iframe switch the Console to the game iframe's context); § 4 checks 1 and 4 re-scoped to the
snippets; check 1 runs on the owner's **currently-paid** test account (the earlier same-day earned-account ruling is
struck, reversed by the owner); rollback, verification steps 1, 1a, 4, 7, 8 updated; open questions (a)–(d) answered,
(e) added.

**Not done.** No source change; no deploy; nothing committed or pushed; nothing under `ai-agents/wiki-vault/` touched.
