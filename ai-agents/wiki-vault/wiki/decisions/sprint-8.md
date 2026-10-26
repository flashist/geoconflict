# Sprint 8 — Paid Citizenship Perks and More Content

**Date**: 2026-09-29
**Status**: accepted *(✅ **closed 2026-10-16** by `/fkit-sprint-done`, agent-closed — not owner-verified; ~~🔄 in progress since 2026-10-12~~ (started by owner ruling *"Mark it started (Recommended)"*); ~~`🔲 Backlog — 2026-09-29` — created, NOT started~~; was `proposed` while open)*

> 📝 **2026-10-26 sync (`4e9160a`) — a Sprint 8 retro report exists:**
> `ai-agents/knowledge-base/reports/2026-10-16-sprint-8-retro-fkit-feedback.md` (owner-led, 2026-10-16; **proposals only
> for the fkit framework — nothing in this project was changed because of it**). Owner's picks: board rows too long and
> stale (1,872 lines at close, 1,500 of them notes; a stale status cell misled an agent about `0219`); a long tail of
> time-gated verify tasks (25 of 55 rows); no sprint goal. Proposals P1–P4: short rows, one home for status (the brief),
> a sprint goal before starting, an "earliest finish" time on time-gated tasks. Of the seven Sprint 8 rows now on Sprint 9
> (`0385`, `0219`, `0213`, `0452`, `0449`, `0343`, `0455`), all are closed except `0455` ([[decisions/sprint-9]]).

> Source: `ai-agents/sprints/done/plan-sprint-8.md` *(moved there at the close, 2026-10-16; was ~~`ai-agents/sprints/plan-sprint-8.md`~~ — that path no longer exists)*.
>
> # 🆕 2026-10-16 (latest, `29811f0`) — ✅ SPRINT 8 CLOSED 2026-10-16: 55 ROWS, 39 DONE, 15 MOVED, 1 CANCELLED, 0 OPEN
>
> **Re-counted by me at `29811f0`, by each row's leading status glyph** (was 55 / 7 open). Line-3 banner: `✅ Done —
> 2026-10-16. Closed by /fkit-sprint-done (agent-closed — not owner-verified). Superseded by Sprint 9 — its five open rows
> moved there.` Closed by a spawned `fkit-producer` on OWNER RULINGS given 2026-10-16 in a Claude Code session, relayed by
> it (⛔ not producer precedent): typed *"Can we move all the tasks tha require wait for certain time to Sprint 9?"*; then
> live `AskUserQuestion` — **"Move all + close Sprint 8 (Recommended)"** and **"At the top (Recommended)"**.
> - **Moved to [[decisions/sprint-9]] before the close** (owner rulings, typed): `0343` (*"Move the task 0343 to the next
>   sprint"*) and `0455` (*"… it requires few days of analytics after deploy."*).
> - **Moved at the close, to the top of Sprint 9 in the owner's order:** `0385` 1 → `0219` 2 → `0213` 3 → `0452` 4 →
>   `0449` 5 (then `0469` 6, `0343` 7, `0455` 8). Each Sprint 8 row stays as a `➡️ Moved` pointer at its old rank.
> - 🚀 **Final deploys were MID-WEEK, Fri 2026-10-16, not the weekend slot** — owner ruling *"Now, I'll run them"*:
>   profile **`0.0.164-profile.2`** (~12:10–12:15Z, carries `0384`'s digest lock) and game prod **`0.0.165`** (~12:17Z,
>   carries `0426`'s news, `0451`'s events, `0454`'s fix, and the root step that installs `0449`'s alerts and `0452`'s
>   password-off on game prod). Tag contents checked by me with `git tag --contains`; box results come from the owner-run
>   batches in `0385`/`0449`/`0452`'s worklogs — **not re-verified by me**. See [[systems/weekend-deploy-window]].
> - ⚠️ Sprint 8 **never had a goal** (owner's call); the name (ruling D) is not a goal.
> - Every note below is history, true when written.
>
> 🆕 **2026-10-16 sync, second run (`5a12b73`): 55 rows — 39 `✅ Done` · 4 `🔲 Backlog` · 3 `🔄 In progress` ·
> 8 `➡️ Moved` · 1 `⛔ Cancelled`; 7 OPEN** (was 55 / 9), counted by me by each row's leading status glyph. Banner
> unchanged (`🔄 In progress — 2026-10-12`). All three changes on owner rulings relayed to spawned `fkit-producer`s
> (⛔ not producer precedent):
> - **17 `0418` closed `✅ Done (agent-closed — not owner-verified)`** — the GameAnalytics re-read (2026-10-08..15):
>   `Unverified` 57, `Restart` 1 (08 Oct only), `ReadFailed` 1,716; owner *"Accept and close"*. Whether `Restart`
>   presses are lost before the reload stays **unanswered**. [[tasks/citizenship-status-events-recheck]]
> - **23 `0426` closed `✅ Done (agent-closed — not owner-verified)`** — two news entries dated 2026-10-17; review R1
>   accepted (owner *"Keep text + file a fix task (Recommended)"*) → `0468` on the Backlog board. The row says *"Built,
>   NOT committed"* — ⚠️ **stale: committed in `8c448a9`**; not deployed (no tag contains it). Ships in the Saturday
>   2026-10-17 game prod deploy. Live check `0469` → [[decisions/sprint-9]] (new board, rank 1).
>   [[tasks/news-catch-up-2026-10-17]]
> - **42 `0449` → `🔄 In progress`** (owner *"Mark it In progress (Recommended)"*). Steps 1–7 and 10 done for profile,
>   telemetry, game dev; daily digest 1 of 2 arrived 2026-10-16. Left: game prod (weekend slot, with `0452`), digest 2
>   (2026-10-17 08:10 UTC), the 24 h no-per-guess window, the per-box report-window check. [[tasks/ssh-security-alerts]]
> - **Still open:** `0343`, `0213`, `0455`, `0385` (Backlog); `0219`, `0449`, `0452` (In progress).
>
> 📌 **2026-10-16 sync (`32dd5cf`) — board unchanged, `0219`'s brief moved.** `plan-sprint-8.md` has no change in this
> window (still 55 rows, 9 open, banner `🔄 In progress — 2026-10-12`). From `0219`'s brief and worklog (backlog working
> artifacts, read as evidence; owner-run steps relayed by `fkit-lead`, **not re-verified by me**): **every alarm drill is
> done** — B7 (failed renewal and cert-expiry alerts; **B7(b) owner-skipped, not passed**), B8 (service stop → both
> uptime monitors' down and recovery emails), B9 (stale weekly copy, stale daily marker, missing-ping alerts), B10
> (destinations: the owner's email only). All were **seen arriving in the owner's inbox** (owner-confirmed). ⇒ The
> 2026-09-13 hold-open ruling ("no close until the alerts have been watched arriving") is **satisfied**. B2's Telegram
> part was **waived** by owner ruling 2026-10-15 (email-only accepted; upgrade → `0466`, Backlog board). ⛔ **`0219` is
> still `🔄 In progress` and does not close yet:** it waits on B6/V2 via `0385` (after the `0384` profile deploy), then
> the close-time V8 cross-refs and V9 secret grep (producer). See [[systems/player-profile-store]],
> [[decisions/sprint-backlog]].
>
> 🆕 **2026-10-15 sync, third run (`930048b`): 55 rows — 37 `✅ Done` · 6 `🔲 Backlog` · 3 `🔄 In progress` ·
> 8 `➡️ Moved` · 1 `⛔ Cancelled`; 9 OPEN** (was 53 / 8), counted by me by each row's leading status glyph. Banner
> unchanged (`🔄 In progress — 2026-10-12`).
> - **Moved in from the Backlog board, appended at 54 / 55** — four OWNER RULINGS 2026-10-15 (live `AskUserQuestion` in
>   the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer`; ⛔ not producer precedent): **A** *"Build
>   it as 0384 (Recommended)"* — `0219`'s B6/V2 fix (*"Pin by digest"*) is built under `0384`, checked by `0385`;
>   **B** *"Yes, add the check (Recommended)"* — a test fails if the four copies of the Postgres reference stop matching;
>   **C** *"Keep in Sprint 8 (Recommended)"* — `0385` stays here, bending the build/verify-split rule for this case only;
>   **D** *"Yes: 0219, then 0384, then 0385 (Recommended)"* — merit order confirmed, row numbers unchanged (ADR-035).
> - **54 `0384` closed `✅ Done (agent-closed — not owner-verified)`** the same day by a spawned `fkit-producer` at the
>   ship-loop's close step (owner ruling *"Restart the ship-loop for 0384 (Recommended)"*): Postgres pinned by digest in
>   `setup-profile.sh`, the restore drill and the dry-run; full `npm test` 228/228 suites green; dry-run 55/0. Committed
>   `d6458d9` after the close; **not deployed** (no tag contains it). [[tasks/profile-postgres-digest-lock]],
>   [[decisions/adr-120-third-party-images-digest-pinned]]
> - **55 `0385`** — `🔲 Backlog`; the on-box check after the weekend profile deploy; when it passes, `0219`'s B6/V2 item
>   (Status item 4) is met. A formal `Depends on` from `0219` to `0385` was **not** added (lead's cheapest-to-reverse call,
>   not an owner ruling).
> - **Still open:** `0343`, `0418`, `0213`, `0449`, `0455`, `0385` (Backlog); `0219`, `0426`, `0452` (In progress).
>   `0219` stays held open until its alerts are watched arriving (2026-09-13 ruling).

> 🆕 **2026-10-15 sync, second run (`aa0973b`): 53 rows — 36 `✅ Done` · 5 `🔲 Backlog` · 3 `🔄 In progress` ·
> 8 `➡️ Moved` · 1 `⛔ Cancelled`; 8 OPEN** (was 53 / 11), counted by me by each row's leading status glyph. Banner
> unchanged (`🔄 In progress — 2026-10-12`). **Three rows closed, all `✅ Done (agent-closed — not owner-verified)`**, each
> by a spawned `fkit-producer` via `/fkit-task-done` (no owner channel, ADR-021/037/033):
> - **52 `0350`** — the name-change walk-through command `npm run -s name-change:review`, repo work + tests (full
>   `npm test` 228/228 suites green); verify task **`0463`** filed on the Backlog board for the top of Sprint 9. Then
>   **deployed early** in `0449`'s profile deploy (`0.0.164-profile.1`, owner ruling *"Deploy now, ship both
>   (Recommended)"*) — not yet run on the box. [[tasks/name-change-review-walkthrough]]
> - **44 `0450`** — leftover deploy env files: F1 listed 21 on game dev / 0 on prod, F2 deleted the 21, a dev deploy left
>   0, and a deliberately failed dev deploy left the game up and 0 files. [[tasks/game-deploy-env-file-cleanup-verified]]
> - **53 `0462`** — fail2ban re-check (`0452`'s V5) passed on telemetry, and on game dev with a note by owner ruling (a
>   fail2ban restart from `0449`'s test reset the counter). [[tasks/fail2ban-recheck-after-password-off]]
> - ℹ️ The board carries a close addendum for `0350` only; `0450`'s and `0462`'s rows changed status with no addendum —
>   their evidence is in their worklogs.
> - **Still open:** `0343`, `0418`, `0213`, `0449`, `0455` (Backlog); `0219`, `0426`, `0452` (In progress). `0449`
>   progressed (profile, telemetry, game dev deployed with SSH alerts live — [[tasks/ssh-security-alerts]]); game prod
>   and the two-day watch remain.

> 🆕 **2026-10-15 sync (newest, `48c4285`): 53 rows — 33 `✅ Done` · 8 `🔲 Backlog` · 3 `🔄 In progress` · 8 `➡️ Moved` ·
> 1 `⛔ Cancelled`; 11 OPEN** (was 51 / 9), counted by me by each row's leading status glyph. Banner unchanged
> (`🔄 In progress — 2026-10-12`). **No row closed in this window.**
> - **Four OWNER RULINGS, 2026-10-15** (live `AskUserQuestion` in the main session after a `/fkit-status` briefing,
>   relayed by the main session to a spawned `fkit-producer` with no owner channel — ADR-021/037; ⛔ not producer
>   precedent):
>   1. *"Both (Recommended)"* — **46 `0452`** and **23 `0426`** → `🔄 In progress`. `0452`: pre-checks P1–P4 passed;
>      **SSH password login is OFF on telemetry and game dev** (V2–V4 passed on both); left: V5 on those two boxes
>      (`0462`), game prod in the weekend slot, the Q3 switch removal ([[tasks/ssh-password-login-off]]). `0426`: the news
>      text was drafted 2026-10-11 and owner-approved 2026-10-12; `resources/announcements.json` is **not edited yet** —
>      that happens in the final Sprint 8 deploy.
>   2. *"Copy it into 0450 now (Recommended)"* — the 2026-10-15 game dev deploy's env-file removal is copied into a new
>      `0450` worklog. ⚠️ **Partial evidence toward step 4 only — it satisfies no verification step**; `0450` stays
>      `🔲 Backlog` ([[tasks/game-deploy-env-file-cleanup]]).
>   3. *"Ship 0350 on its own (Recommended)"* — `0350` is a tool only the owner uses, not player-facing, so it does
>      **not** hold back the final Sprint 8 deploy or `0426`; it goes out in its own weekend profile-server deploy.
>   4. *"Confirm that order (Recommended)"* — owner-confirmed merit order: **`0452` → `0462` → `0449`/`0450` near the
>      top, and `0219` near the top for its deadline.** Row numbers unchanged (ADR-035). ⚠️ The ruling does not order
>      `0219` against the `0452` chain beyond "near the top". `0426`'s and `0350`'s append-rank flags were not part of it.
> - **New rows (ADR-035 append ranks, not merit):** **52 `0350`** — name-change moderation without copy-and-paste,
>   **moved in from the Backlog board** (owner, verbatim *"Move the task to the current sprint"*); still `🔲 Backlog`, scope
>   unchanged (shape A1, ruled 2026-09-29); off this sprint's theme — recorded, not a blocker ([[decisions/sprint-backlog]]).
>   **53 `0462`** — re-check fail2ban on telemetry and game dev a few hours after password login went off (owner, verbatim
>   *"I think we need to create a task to the current sprint, to keep track of it."*). It **is** `0452`'s V5 for those
>   two boxes, not an extra check; run by the owner (agent SSH to the boxes was denied in `0445`). Open briefs — no vault
>   page.
> - **Deploys, 2026-10-15** (from `0452`'s worklog): telemetry `0.0.164-telemetry.1` (tag on `c42aded`); game dev a
>   same-version redeploy of image `20261003-122424` — see [[systems/weekend-deploy-window]].
> - **Still open on this board:** `0343`, `0418`, `0213`, `0449`, `0450`, `0455`, `0350`, `0462` (Backlog); `0219`,
>   `0426`, `0452` (In progress).
>
> 🆕 **2026-10-14 sync (newest, `2d2ab4a`): 51 rows — 33 `✅ Done` · 8 `🔲 Backlog` · 1 `🔄 In progress` · 8 `➡️ Moved` ·
> 1 `⛔ Cancelled`; 9 OPEN** (was 44 / 9), counted by me by each row's leading status glyph. Banner unchanged
> (`🔄 In progress — 2026-10-12`).
> - **Closed in this window, all `✅ Done (agent-closed — not owner-verified)`, each on an owner ruling relayed by
>   `fkit-lead` to a spawned `fkit-producer` (⛔ not producer precedent):**
>   - **41 `0445`** — keys installed, key-only login proven, game dev / game prod / telemetry deployed over the key; game
>     prod as the real release **`0.0.164`** (2026-10-13, *"Real release now"*) ([[tasks/ssh-key-login-live]]).
>   - **39 `0442`** — SSH password login off: built, **repo work only** (`daa1bcc`) ([[tasks/ssh-password-login-off]]).
>   - **45 `0451`** — 16 `PrivateLobby:*` funnel events; `daa1bcc`, not deployed ([[tasks/private-lobby-funnel-events]]).
>   - **47 `0453`** — the profile deploy's key path refuses a password prompt; `2d2ab4a`
>     ([[tasks/profile-deploy-key-only]]).
>   - **48 `0454`** — a wrong private-lobby code shows "not found"; `2d2ab4a`, not deployed; backlog `0292` cancelled as
>     absorbed ([[tasks/private-lobby-wrong-code-not-found]]).
>   - **50 `0456`** — GameAnalytics 500-per-user limit investigation; **no code fix** by owner ruling
>     ([[tasks/gameanalytics-event-limit-recurring-spikes]]).
>   - **51 `0459`** — GameAnalytics game ID removed from three task files ([[tasks/gameanalytics-game-id-removed]]).
> - **New open rows (ADR-035 append ranks, not merit):** **46 `0452`** — verify `0442` on the boxes: pre-checks, then
>   password off on game dev and telemetry now, game prod in the weekend slot (🚨 on merit the first open work);
>   **49 `0455`** — build the private-lobby funnel in GameAnalytics and confirm `0451`'s events arrive (time-gated on the
>   deploy; owner's Chrome). Open briefs — no vault page.
> - **Filed on the Backlog board in the same window:** `0457`, `0458`, `0460`, `0461` ([[decisions/sprint-backlog]]);
>   `0460` and `0461` are flagged for the top of Sprint 9 (no Sprint 9 board yet).
> - 🚨 With `0442` committed, the next game or telemetry key deploy turns password login off — `0452`'s pre-checks come
>   first, including for `0449` / `0450` deploys ([[systems/weekend-deploy-window]]).
> - **Still open on this board:** `0343`, `0418`, `0426`, `0213`, `0449`, `0450`, `0452`, `0455` (Backlog), `0219`
>   (In progress).
>
> 🆕 **2026-10-13 sync (newest, `dd9a8fd`): 44 rows — 26 `✅ Done` · 8 `🔲 Backlog` · 1 `🔄 In progress` · 8 `➡️ Moved` ·
> 1 `⛔ Cancelled`; 9 OPEN** (was 40 / 10), counted by me by each row's leading status glyph. Banner unchanged
> (`🔄 In progress — 2026-10-12`).
> - **Closed in this window, all `✅ Done (agent-closed — not owner-verified)`, each on an owner ruling relayed by
>   `fkit-lead` to a spawned `fkit-producer` (⛔ not producer precedent):**
>   - 🚦 **30 `0428`** — **private lobbies ON FOR EVERYONE since about 17:09–17:12 MSK, 2026-10-13** (game `0.0.163`);
>     checks 4a–4c pass per owner statement "all good", not itemised; 4d not run
>     ([[tasks/private-lobbies-everyone-flag-flip]]).
>   - **37 `0440`** — Yandex judged back 2026-10-13 (outage window 2026-10-11 → 2026-10-13); item 4 re-planned:
>     *"Close; 0439 stands alone (Recommended)"* ([[tasks/yandex-outage-recovery-checklist]]).
>   - **38 `0441`** — SSH key login for game + telemetry deploys, **repo work only** (`779ddc2`)
>     ([[tasks/deploy-ssh-key-login]]). **40 `0443`** — SSH security alerts, **repo work only** (`779ddc2`)
>     ([[tasks/ssh-security-alerts]]). **43 `0447`** — `update.sh` always removes its env file, **repo work only**
>     (`910bc14`); moved in from the Backlog board 2026-10-12 ([[tasks/game-deploy-env-file-cleanup]]). All three:
>     ⚠️ **nothing run on any box, `git tag --contains` → none — not deployed.**
> - **Three verify tasks appended (ADR-035 append ranks):** **41 `0445`** (install the keys, prove key-only login, deploy
>   game dev, game prod and telemetry over the key — 🚨 *first open work on the board* by owner ruling), **42 `0449`**
>   (deploy the SSH alerts, add game dev to `PROFILE_INTERNAL_ALLOW_IPS`, two days of digests), **44 `0450`** (list and
>   delete the leftover env files on game dev; a dev deploy leaves none). ⚠️ **All three bend the standing 2026-09-29
>   "verify task at the top of the NEXT sprint" rule, for these cases only** — the owner plans to deploy this week
>   (mid-week is fine). `0442` (passwords off) is re-pointed to depend on **`0445`**. Open briefs — no vault page.
> - 🚨 **Deploy consequence:** once `779ddc2` is deployed, every game deploy runs a root step that **exits 3** ("GAME IS
>   DEPLOYED — HOST SETUP NOT DONE") until `0445` installs the root key — see [[tasks/ssh-security-alerts]].
> - **Still open on this board:** `0343`, `0418`, `0426`, `0213`, `0442`, `0445`, `0449`, `0450` (Backlog), `0219`
>   (In progress).
> - Checked: the 2026-10-12 "uncommitted closes" the caller mentioned (`0428`, `0440`) are in commit `dd9a8fd`; the tree
>   was clean at this sync's start.
>
> 🆕 **2026-10-12 (`5449571`): SPRINT 8 STARTED. 40 rows — 21 `✅ Done` · 9 `🔲 Backlog` · 1 `🔄 In progress` ·
> 8 `➡️ Moved` · 1 `⛔ Cancelled`; 10 OPEN** (was 34 / 10), counted by me by each row's leading status glyph.
> - **Line-3 banner flipped to `🔄 In progress — 2026-10-12`** — owner ruling *"Mark it started (Recommended)"* (live
>   `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer`; ⛔ not producer
>   precedent). Only the label changed; the board tools now see Sprint 8 as the one active sprint
>   ([[decisions/adr-108-active-sprint-pointer]]). Before that, `0437` and `0436` were briefly `🔄 In progress` on a board
>   still marked not started — flagged on the board, now moot.
> - **Closed in this window, all `✅ Done (agent-closed — not owner-verified)`, each on an owner ruling relayed by
>   `fkit-lead`:** **18 `0420`** — the one Sprint 7 live checklist; every required item passed, the earned-account items
>   on 2026-10-11 after `0430`; item 7 (B) **not checked live** by ruling ([[tasks/sprint-7-fixes-live-checklist]]) ·
>   **31 `0429`** — no native tooltips + dark scrollbar, one overall pass on `0.0.163` ([[tasks/no-native-tooltips-live]])
>   · **32 `0430`** — profile deploy of `0425` and the first `apply` / `restore` pass; the backup dry-run could not run and
>   went to `0436` ([[tasks/tester-roles-live]]) · **34 `0433`** — ⚠️ **partial**: no regression on the main paths, not
>   proof under the targeted conditions ([[tasks/join-lobby-race-fix-live]]) · **35 `0437`** — exit confirmation popup,
>   built, committed `5449571`, **no tag — not deployed**; live check `0439` on the Backlog board
>   ([[tasks/exit-confirm-popup]]) · **36 `0436`** — backup dry-run harness fixed and green, 11 tables `IDENTICAL`
>   ([[tasks/backup-dryrun-minio-image]]). `0437` and `0436` were moved in from the Backlog board on 2026-10-11 (owner:
>   work to do while waiting on Yandex infrastructure).
> - **Deploys, 2026-10-10:** the profile box (mid-week, `0425`) and game `0.0.163` (carrying `0228`,
>   `0415`, `0423`, `0431`'s commit `bcc9bf0`; `0.0.162` was built but never deployed — its run failed at the copy step) — the "NOT deployed" line in the 2026-10-10 entry below is history
>   ([[systems/weekend-deploy-window]]).
> - **Appended 2026-10-12 (ADR-035 append ranks, not merit ranks):** **37 `0440`** — owner-run checklist for when
>   Yandex Games works again (outage noticed 2026-10-11): `0428`'s flag flip, `0426`'s flag gate, `0439`; on merit
>   directly above `0428` · **38 `0441`** and **39 `0442`** — 🚨 **top priority by owner ruling** (*"File it to the current
>   sprint, and it should be our top priority to work on."*): install an SSH key and switch the game **and telemetry**
>   boxes' deploys to key login, then turn password login off only after key login is proven (telemetry added by
>   *"Yes, add telemetry (Recommended)"*) · **40 `0443`** — SSH security alerts to Telegram on all three boxes (successful
>   logins, fail2ban down, daily counts; never one alert per failed guess) — *"All three (Recommended)"*; real place right
>   after `0441`/`0442`. All four briefs are open, so they have no vault page; summary from the board.
> - 🚦 **`0428`** is **unblocked** (all five dependencies closed) — status unchanged; the flip waits on the owner and on
>   Yandex Games recovering (`0440`).
> - **Still open on this board:** `0343`, `0418`, `0426`, `0213`, `0428`, `0440`, `0441`, `0442`, `0443` (Backlog),
>   `0219` (In progress).
>
> 🆕 **2026-10-10 (latest, `4fb073a`): 34 rows — 15 `✅ Done` · 9 `🔲 Backlog` · 1 `🔄 In progress` · 8 `➡️ Moved` ·
> 1 `⛔ Cancelled`; 10 OPEN** (was 30 / 18), counted by me by each row's leading status glyph. Line-3 banner **still
> `🔲 Backlog — 2026-09-29`** — never flipped, though the ship loop ran on this board. Twelve rows closed
> `✅ Done (agent-closed — not owner-verified)`, each on an owner ruling relayed by `fkit-lead` to a spawned
> `fkit-producer` (⛔ not producer precedent); four rows appended (ADR-035 append ranks, flagged for owner confirmation):
> - **Built (code committed `bcc9bf0`; `git tag --contains` → none — NOT deployed):** **20 `0415`** no native tooltips
>   ([[tasks/no-native-tooltips]]) · **21 `0423`** dark modal scrollbar ([[tasks/dark-modal-scrollbar]]) · **22 `0425`**
>   SSH-only tester roles, nothing run on the box ([[tasks/tester-roles-command]]) · **28 `0228`** join race
>   **reproduced 9/9 and fixed** ([[tasks/join-lobby-race-fix]]) · **33 `0431`** stale integration test, test-only
>   ([[tasks/routes-it-test-verified-field]]).
> - **Verify tasks closed on live reads:** **1 `0370`** — owner **kept 1-minute lobbies, overriding the 15 % line**; day-7
>   read not run ([[tasks/public-lobby-one-minute-live]]) · **5 `0351`** — dev-box pass; the worker's own requests not
>   observed ([[tasks/worker-reuses-page-map-live]]) · **7 `0390`** — idle end passed on cases 1 and 3
>   ([[tasks/private-lobby-idle-end-live]]) · **15 `0405`** — vouch live, ADR-124 trigger 2 not hit, 0 token hits
>   ([[tasks/join-token-identity-vouch-live]]) · **16 `0406`** — popup fires; **main question unanswered, no data**
>   ([[tasks/long-session-refresh-popup-live]]) · **27 `0376`** — **gate item 2 passed**
>   ([[tasks/private-lobby-production-test]]) · **29 `0381`** — code shown; steps 3–5 not run by owner rulings
>   ([[tasks/yandex-invite-copies-code-live]]).
> - **Appended:** **31 `0429`** — owner-run hover check of `0415` inside the Yandex iframe, plus `0423`'s scrollbar
>   (*"Bottom of Sprint 8"*) · **32 `0430`** — owner-run deploy of `0425` (mid-week, *"Urgent: after review passes"*) and the
>   first `apply earned-citizen` + `restore`; on merit the top group · **33 `0431`** — done the next day · **34 `0433`** —
>   owner-run live check of `0228` after its deploy; on merit directly above `0428`, which now depends on it.
> - 🚦 **`0428`** (the everyone-flag) now waits **only on `0433`**. Its step 4b also carries the lowercase code-typing
>   check and a code join inside Yandex (owner: *"skip tester"*). ⛔ `private_lobbies_all` still unset.
> - Follow-ups filed on the Backlog board: `0432`, `0434`, `0435` ([[decisions/sprint-backlog]]).
> - **Still open on this board:** `0343`, `0418`, `0420`, `0426`, `0213` (Backlog), `0219` (In progress), `0428`, `0429`,
>   `0430`, `0433`.
>
> 🆕 **2026-10-09 (latest, `9dd117a`): 30 rows — 3 `✅ Done` · 17 `🔲 Backlog` · 1 `🔄 In progress` · 8 `➡️ Moved` ·
> 1 `⛔ Cancelled`; 18 OPEN** (was 25 / 14), counted by me by each row's leading status glyph. Line-3 banner **still
> `🔲 Backlog` — not started.** Five rows appended (ADR-035 append ranks — positions, not merit ranks; each flagged for
> owner confirmation on the board), all on owner requests or rulings typed in the coordinating session and relayed to a
> spawned `fkit-producer` with no owner channel (⛔ not producer precedent):
> - **26 `0427`** — one full jest run at a time project-wide, plus `--detectOpenHandles --forceExit` on the unit run
>   ([[tasks/jest-full-run-lock]]). Filed on the owner's *"implement this fix for JEST the first thing"*; on merit the
>   board puts it at the top, beside `0370`. **✅ Done the same day (agent-closed — not owner-verified)**, committed
>   `1926f4c`; the owner's two-terminal check was not run.
> - **27 `0376`, 28 `0228`, 29 `0381` — moved in from the Backlog board** ([[decisions/sprint-backlog]]): the three open
>   items (2, 3, 6) of the private-lobby release gate ([[tasks/private-lobby-citizen-perk]]). Owner, verbatim: *"1. Yes
>   move to the Sprint 8 and brief a dedicated task for the Sprint 8 to turn the private lobbies on for everybody."*
>   Status `🔲 Backlog` carried unchanged. On merit the board puts `0376` and `0381` in the top group and `0228` near the
>   top (its outcome is the one nobody can predict). `0376`'s brief now records 2026-10-09's live evidence (match end,
>   the `0353` host-window check and the console values still to do); `0381`'s marks steps 1 and 6 superseded by `0382`,
>   step 4 (the old `#join=` link) the main one left.
> - **30 `0428`** (new) — **turn private lobbies on for everyone**: set `private_lobbies_all` = `enabled` in the Yandex
>   Games console, check live as a non-tester, keep the rollback (unset the flag) ready. **Nothing built or deployed;
>   executed by the owner.** Depends on `0376`, `0228`, `0381`, `0390`.
> - 📌 **Three owner rulings, later 2026-10-09** (live `AskUserQuestion`): (1) **`0390` must pass first** — *"Yes, 0390
>   must pass first (Recommended)"*, so gate item 4 now needs `0390`'s live pass, not just `0377` built
>   ([[tasks/private-lobby-idle-end]]); (2) flip **before the final Sprint 8 deploy** — *"Before the final deploy
>   (Recommended)"*, so `0426`'s news may announce it, provided `0428` has actually run by `0426`'s text gate; (3)
>   **`0389`'s two code checks stay in `0376`** — *"Keep them in 0376 (Recommended)"*.
> - ⚠️ **Board's flag:** gate items 1, 4, 5 are closed, but all **agent-closed, not owner-verified**; item 4 (`0377`) is
>   built only until `0390` runs. Accepted risk carried in `0428`: the private-lobby gate stays open to unverified
>   citizens (`0332` Q4), and after the flip every player sees Create, not just testers.
>
> 🆕 **2026-10-09 (latest, `78f9c7b`): 25 rows — 2 `✅ Done` · 13 `🔲 Backlog` · 1 `🔄 In progress` · 8 `➡️ Moved` ·
> 1 `⛔ Cancelled`; 14 OPEN** (was 18 / 8), counted by me by each row's leading status glyph. Line-3 banner **still
> `🔲 Backlog` — not started.** ⚠️ With [[decisions/sprint-7]] **closed 2026-10-09**, **no sprint is `🔄 In progress`**;
> starting this one is the owner's call. Seven rows appended (ADR-035 append ranks — positions, not merit ranks; each
> flagged for owner confirmation on the board), all on owner rulings or requests relayed to a spawned `fkit-producer`:
> - **19 `0422`** — `0421`'s live check ([[tasks/explainer-popup-shorter-text]]), filed at `0421`'s close, then
>   **cancelled** the same day — *"Fold into 0420 (Recommended)"*: its checks are `0420` **item 8**
>   ([[decisions/cancelled-tasks]]). `0420` items 2 and 5 were also updated to `0421`'s popup.
> - **20 `0415`** — no native browser tooltips anywhere in the UI, **pulled in from the Backlog board** (*"Move 0415 into
>   Sprint 8 (Recommended)"*) after the owner saw tooltips on `0.0.161` while running `0420` (the join window's
>   "Присоединиться к лобби" and the single-player "Начать игру"). Rule 1 of [[systems/yandex-games-platform-rules]].
> - **21 `0423`** — dark thin scrollbar in every game window, fixed once in the shared `o-modal` (*"Brief a small task,
>   Sprint 8 (Recommended)"*); reference look `0417` ([[tasks/explainer-popup-wider]]); `0419`'s popups stay in `0419`
>   (*"Keep them in 0419 (Recommended)"*). `0415` and `0423` both edit `Modal.ts` — whichever lands second rebases.
> - **22 `0425`** — SSH-only tester roles: one operator command on the profile box applies a fixed test role
>   (non-citizen, 99 XP, earned, paid flag only — **no fake purchase record**, brand-new) to one allowlisted tester and
>   restores it exactly. Why: since the 2026-10-08 incident (`0424`, Backlog board) there is **no earned-citizen test
>   account**, which blocks `0420`'s earned items. Owner kept rank 22 (*"Leave it at 22"*); on merit, top group. Each
>   production run is a production write and needs the owner's OK in session. ⚠️ Its "tester" is a server-side allowlist
>   — **not** the client flag of `0302` / `0354`.
> - **23 `0426`** — a catch-up news-window entry (en + ru) for everything shipped since `2026-06-06` (`0.0.136`): 25
>   production deploys (`0.0.137`–`0.0.161`) told players nothing. Starts after the last Sprint 8 build, ships in the
>   final Sprint 8 deploy; the owner approves the exact text first.
> - **24 `0219`** — profile-box operability, **moved in from Sprint 7**, `🔄 In progress`; its **G3/G4 deferral is
>   LIFTED** (*"Yes, un-pause in Sprint 8 (Recommended)"*): switch on and test the server-down and backups-stopped
>   alarms. The code for all four parts was deployed 2026-09-26; what is left is owner-side setup and live drills. 🚨
>   **Timing risk (board's flag):** certificate renewal attempts start ~2026-10-21 (cert expires 2026-11-20) — if this
>   sprint does not start before then, a failed renewal is still silent ([[systems/weekend-deploy-window]]).
> - **25 `0213`** — the profile-backend epic, moved in with `0219` (*"Move it to the Sprint 8"*), `🔲 Backlog`; closes
>   when `0219` closes.
> - ℹ️ `0420` run 1 (2026-10-09, `0.0.161`) is recorded in its worklog — most items pass; earned-account items blocked;
>   the error-window copy stays "not checked live". `0420` is open, so it has no vault page.
>
> 🆕 **2026-10-08 (latest, `a555111`): 18 rows — 2 `✅ Done` · 8 `🔲 Backlog` · 8 `➡️ Moved`; 8 OPEN** (was 17 / 7),
> counted by me by each row's leading status glyph. **`0420` appended at 18** — **one live-check checklist** for the
> Sprint 7 builds `0416` ([[tasks/worker-route-query-string]]), `0408` ([[tasks/explainer-paid-only-subheading]]),
> `0409` ([[tasks/explainer-buy-for-earned-citizens]]), `0407` ([[tasks/paid-citizen-thank-you-line]]), `0417`
> ([[tasks/explainer-popup-wider]]), `0412` ([[tasks/start-screen-private-tab]]) and `0413`
> ([[tasks/join-modal-paste-hint]]); `0382` is not in it (its check is `0383` on [[decisions/sprint-7]]). Owner ruling
> 2026-10-08: one verify task *"at the top of Sprint 8"* under the build/verify-split rule; ADR-035 forbids renumbering
> closed rows, so it was appended — then **"Keep rank 18"** (owner, same day): read it as the top group. Also ruled:
> `0413`'s error-window copy is **"not checked live"** (no safe way to raise the window in production). Deploy timing on
> the brief: `0416`, `0407`–`0409` cleared same-day; `0412`, `0413`, `0417` weekend slot — so the checklist may run in
> two passes. ⚠️ None of the seven is deployed yet (`git tag --contains a555111` → none). Line-3 banner unchanged
> (`🔲 Backlog`). `0420`'s brief is open, so it has no vault page; summary from the board's addendum.
>
> 🆕 **2026-10-08 (`6f1d737`): 17 rows — 2 `✅ Done` · 7 `🔲 Backlog` · 8 `➡️ Moved`; 7 OPEN** (was 16 / 6),
> counted by me by each row's leading status glyph. **`0418` appended at 17** — re-read `Citizenship:Status:Unverified`
> and `Citizenship:Status:Restart` in GameAnalytics over several days, because `0400`'s check 8 did not see them
> ([[tasks/session-verified-status-line-live]]); owner, verbatim: *"No need for the investigation, brief a task to the
> Sprint 8 to recheck the numbers in GameAnalytics."* Append rank, not merit; it blocks nothing and is time-gated. The
> rest of the diff is `backlog/` → `done/` link repoints for `0396`, `0398`, `0400`, `0401` (all closed 2026-10-08 on
> Sprint 7). Line-3 banner unchanged (`🔲 Backlog`).
>
> 🆕 **2026-10-07 (latest, `077c9e3`): 16 rows — 2 `✅ Done` · 6 `🔲 Backlog` · 8 `➡️ Moved`; 6 OPEN** (was 13 / 4).
> Counted by me this run. Line-3 banner (`🔲 Backlog — 2026-09-29`, not started) unchanged.
> - ➕ **14** `0404` (refresh popup after ~24 h) — filed here on the owner's free-text answer to `0332`'s review R2
>   (*"… brief it to the next sprint. The popup shouldn't break active matches, probably should be shown only on the
>   main screen."*), then **moved to [[decisions/sprint-7]] at 53** the same day (*"Move the refresh popup task to the
>   Sprint 7"*); this row is now `➡️ Moved`, rank 14 kept. Done there — [[tasks/long-session-refresh-popup]].
> - ➕ **15** `0405` — verify `0332` live: read the two identity counters and confirm no session token reaches the logs
>   ([[tasks/join-token-identity-vouch]]). Filed at `0332`'s close on the owner's *"Close it (Recommended)"*.
> - ➕ **16** `0406` — verify `0404` live: read the long-session refresh events and the after-refresh login split. Filed
>   at `0404`'s close under the owner's standing build/verify rule (no new ruling).
> - ⚠️ **15 and 16 are ADR-035 append ranks, flagged for owner confirmation:** on merit both belong with the other verify
>   tasks at the top, but ranks 2–4 and 8–14 are closed rows that may not be renumbered.
>
> 📌 **2026-10-07 (latest, `03d027b`): 13 rows — 2 `✅ Done` · 4 `🔲 Backlog` · 7 `➡️ Moved`; 4 OPEN — unchanged.**
> Counted by me this run. Only link repoints (`backlog/` → `done/`) for `0392` and `0395`, whose ➡️ Moved rows here
> (ranks 8 and 9) point at Sprint 7, where both **closed 2026-10-07** — [[tasks/post-24h-window-login-read]],
> [[tasks/verified-login-enforce-live]]. `df36b95` struck the stale *"New open question (e)"* in this board's `0401`
> move addendum (answered 2026-10-06, *"Accept the half test"*). Line-3 banner unchanged.
>
> 🆕 **2026-10-06 (latest, `31bfb06`): 13 rows — 2 `✅ Done` · 4 `🔲 Backlog` · 7 `➡️ Moved`; 4 OPEN** (was 12 / 7). ⚠️
> Counted by me this run. Line-3 banner (`🔲 Backlog — 2026-09-29`, not started) unchanged.
> - ➕ **13** `0401` — verify `0301` live ([[tasks/citizenship-explainer-popup]]), filed here at `0301`'s close (append
>   rank), then ➡️ **moved to [[decisions/sprint-7]] (48)** the same day.
> - ➡️ **10** `0396`, **11** `0398` moved to Sprint 7 (49, 50) — owner *"Move both to Sprint 7 (Recommended)"*; **12**
>   `0400` followed (51) — owner *"Move it to Sprint 7 (Recommended)"*. The placement question on each is answered;
>   the ranks here are kept, not renumbered (ADR-035).
> - **Still open here:** `0370` (1), `0351` (5), `0343` (6), `0390` (7). `0343`'s brief changed in this window only by
>   two `0301` link repoints (`backlog/` → `done/`).
>
> 🆕 **2026-10-06 (latest, `036a5c8`): 12 rows — 2 `✅ Done` · 7 `🔲 Backlog` · 3 `➡️ Moved`; 7 OPEN** (was 10 / 5). ⚠️
> Counted by me this run. Line-3 banner (`🔲 Backlog — 2026-09-29`, not started) unchanged. Two verify rows appended on
> the build/verify-split rule (2026-09-29), each ⚠️ an append rank flagged for owner confirmation (ranks 2–4 are closed
> rows, so "top of the next sprint" could not be honoured):
> - **11** `0398` — verify `0248` live: paid citizens see no interstitial ads ([[tasks/paid-citizen-ad-free]]). Gates:
>   `0396` passed → `0397` live or in the same deploy → `0248` committed (✔️ it is, `91eb99a`) → a weekend slot.
> - **12** `0400` — verify `0397` live: the session-status line shows the right state
>   ([[tasks/session-verified-status-line]]). Gates: `0395` passed → `0396` passed or same slot, S3b server first → a
>   weekend slot.
> - ⚠️ Open to the owner on both: whether they belong on Sprint 7; which paid / earned-only / non-citizen test accounts
>   exist; whether a short `citizenship_ui` flip-off in production is acceptable (one flip can serve both); how to get an
>   unverified session once `0395` is live.
>
> 🆕 **2026-10-06 (latest, `6f4ab77`): 10 rows — 2 `✅ Done` · 5 `🔲 Backlog` · 3 `➡️ Moved`; 5 OPEN** (was 6 / 3). ⚠️
> Counted by me this run. Line-3 banner (`🔲 Backlog — 2026-09-29`, not started) unchanged. Four verify rows appended
> (ADR-035: ranks 2–4 are closed rows, so none could go to the top as the 2026-09-29 build/verify rule says — every
> append rank is ⚠️ flagged for owner confirmation; on merit each belongs directly below `0370`):
> - **7** `0390` — verify `0377` live: an abandoned private lobby ends after 30 minutes, an occupied one does not
>   ([[tasks/private-lobby-idle-end]]).
> - **8** `0392` — filed as the 7-day ≤ 5 % re-check, re-scoped the same day by ADR-122 (no fixed bar), renamed *"Read the
>   post-0391 login numbers before the 0340 deploy"*, then ➡️ **moved to Sprint 7 (44)**.
> - **9** `0395` — verify `0340` live; ➡️ **moved to Sprint 7 (45)** the same day.
> - **10** `0396` — verify `0250` S3b live ([[tasks/authenticated-profile-read]]). Gates, in order: `0340` in its own
>   earlier slot (never the same one) → `0395` confirms `vfy: true` → the owner's look at the login numbers → a weekend
>   slot. ⚠️ Open to the owner: whether it belongs on Sprint 7, and which paid / `vfy:false` test sessions exist. `0248`
>   carries a dated note: deploy only after `0396`.
>
> 🆕 **2026-10-04 (latest, `b99c1f1`): 6 rows — 2 `✅ Done` · 3 `🔲 Backlog` · 1 `➡️ Moved`; 3 OPEN** (was 6 / 4). ⚠️
> Counted by me this run. Line-3 banner (`🔲 Backlog — 2026-09-29`, not started) unchanged.
>
> - ➡️ **`0373` (rank 2) MOVED OUT TO [[decisions/sprint-7]]** — row now reads `➡️ Moved to Sprint 7 — priority 36`.
>   OWNER RULING given live 2026-10-04 via `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer` (⛔ not
>   producer precedent), verbatim: *"Pull into Sprint 7 (Recommended)"*. **No row renumbered here** (ADR-035): open
>   rows stay at 1 (`0370`), 5 (`0351`), 6 (`0343`); closed / moved rows at 2, 3, 4. ⚠️ Sprint 7's rank 36 is the
>   producer's append placement, **not owner-ruled** — on merit it is worked before `0340`. The ⏳ data clock below is
>   unchanged: earliest useful read after the evening of Saturday 2026-10-10 (UTC).
> - 📌 `0351`'s brief: one link repoint (`0337` → `tasks/done/`); nothing else.
>
> 🆕 **2026-10-04 (`7324c1b`): 6 rows — 2 `✅ Done` · 4 `🔲 Backlog`; 4 OPEN (unchanged).** ⚠️ Counted by me
> this run. Ranks and the line-3 banner (`🔲 Backlog — 2026-09-29`, not started) unchanged.
>
> - ⛔ **`0343` (parked paid-citizenship features) — items A and D ON HOLD, postponed indefinitely** (2026-10-03):
>   *paid campaign map packs* (A) and *premium replay access* (D), because new maps and match archiving are both
>   postponed (see [[decisions/sprint-7]]). OWNER RULING, live via `AskUserQuestion`, relayed by `fkit-lead` (⛔ not
>   producer precedent): *"Keep it, mark A and D on hold"*. `0343` **stays on this board**; its row, rank and status are
>   unchanged; the other items are not affected.
> - 📌 **`0373` (read the stale-login data, choose the fix) — both code preconditions confirmed by ancestry**
>   (`fkit-lead`, read-only git, 2026-10-03): `0372`'s client code is in the `0.0.156` tag and `0366`'s profile code is in
>   `0.0.156-profile.1`, both deployed 2026-10-03 (game ~09:32 UTC, profile ~10:02 UTC). So the data window counts from
>   **2026-10-03 for both**; earliest useful read **after the evening of Saturday 2026-10-10 (UTC)**. ⚠️ **Code in a tag
>   does not prove the events are arriving** — the first reads confirm arrival. See [[tasks/stale-login-client-diagnostics]],
>   [[tasks/stale-login-signature-age]].
>
> > 🆕 **2026-10-03 (latest, `bc39b82`): 6 rows — 2 `✅ Done (agent-closed — not owner-verified)` · 4 `🔲 Backlog`;
> 4 OPEN.** ⚠️ Counted by me this run. **Ranks unchanged:** `0370` 1 · `0373` 2 · `0363` 3 ✅ · `0358` 4 ✅ · `0351` 5 ·
> `0343` 6. ⚠️ **The line-3 banner still reads `🔲 Backlog — 2026-09-29` (NOT started)** although two of its rows are
> now closed — recorded as the board states it, not changed here; whether to start the sprint is the owner's call.
>
> - ✅ **`0363` and `0358` closed 2026-10-03** by `/fkit-task-done`, `(agent-closed — not owner-verified)`, on the
>   OWNER RULING *"Yes, close both (Recommended)"* (relayed by `fkit-lead`). Both verify tasks passed every step after
>   the 2026-10-03 window: telemetry **`0.0.155-telemetry.1`** at `204f931`
>   ([[tasks/telemetry-deploy-version-tags-production-check]]); profile **`0.0.156-profile.1`** at `f712263`
>   ([[tasks/profile-deploy-version-tags-production-check]]). Their files moved `backlog/` → `done/`; the board's links
>   were repointed.
> - 🔄 **`0370` (rank 1) — Steps 1–3 done on deploy day, still `🔲 Backlog`:** `0367`'s 1-minute lobby went live in
>   game release `0.0.156` (~09:32 UTC). **Before baseline** (2026-09-26 → 10-03, deploy day excluded): lone-real-player
>   share **11.8 %** (545 / 4 636; single days 7.6–13.6 %), ≈ 662 public matches with a real player per day;
>   GameAnalytics `Game:Mode:Multiplayer` **4.57K entries/day** (entries, **not** matches; read by the lead through the
>   owner's login — the brief says owner-read; a hidden "demo mode" element on the page means real data was judged,
>   **not proven**). **OWNER RULING — "noticeably worse" = 7-day after share above 15 %** (*"Above 15 %
>   (Recommended)"*), set before any after-data; crossing it puts a revert **on the table**, it is **not** an automatic
>   revert. Day-4 snapshot due 2026-10-08; after window 2026-10-04 → 10-10. See [[tasks/public-lobby-one-minute]].
> - **`0351` (rank 5) is now runnable** — the dev box got the new code in the same window.
> - ⏳ **`0373` (rank 2) — its data clock has probably started, not confirmed.** ✔️ *Wiki check: `0372`'s commit
>   (`0c9a620`) and `0366`'s (`e581824`) are both ancestors of `f712263`, the commit both the game
>   (`0.0.156`) and profile (`0.0.156-profile.1`) deploys ran from.* ⚠️ The runbook does **not** mention `0366`,
>   `0372` or `0373`, and nobody recorded seeing their events or brackets arrive — so "deployed" is by ancestry only,
>   not observed. If it holds, the earliest useful read is after a weekend evening with 5–7 days of data
>   (≈ 2026-10-10/11 UTC).
> - Window record: [[systems/weekend-deploy-window]].
>
> *History —* **2026-10-02 (`0c9a620`): 6 rows — 6 `🔲 Backlog`; 6 OPEN; still NOT started.** ⚠️ Counted by me this
> run. Task **`0373` — read the stale-login data and choose the fix** — was filed 2026-10-02 by a spawned
> `fkit-producer` on owner rulings (filing *"a 'read the data and decide' task for the top of the next sprint"*; the
> S2-exit threshold — *"Decide it with the data (Recommended)"*), appended at rank 6, then **moved to rank 2 by OWNER
> RULING**, verbatim *"Move to rank 2 (Recommended)"* (relayed by `fkit-lead`; ⛔ not producer precedent). **New order:
> `0370` 1 · `0373` 2 · `0363` 3 · `0358` 4 · `0351` 5 · `0343` 6** — all open, so no closed row was renumbered
> (ADR-035). Owner `fkit-producer`; ⚠️ **the decision is the owner's** (the owner chooses the fix and sets the
> threshold; GameAnalytics numbers are owner-read).
>
> - ⏳ **Rank 2 does not let it start early.** Preconditions: `0372` deployed in a game deploy and `0366` in a profile
>   deploy (both target 2026-10-03/04), then **5–7 days of data including a weekend evening (UTC 20–23)** — earliest
>   useful read after the evening of 2026-10-10 (UTC) if both land on time.
> - **What it reads:** `0366`'s server age brackets ([[tasks/stale-login-signature-age]]) and `0372`'s client events
>   ([[tasks/stale-login-client-diagnostics]]), after freezing a prediction table **before** the first query. Possible
>   outcomes: a second Yandex call gives fresh data (→ a small client refetch task); Yandex returns the same signed data
>   for the whole visit (→ the owner chooses a fix); the 900 s window is simply too tight (→ a retune); a clock problem;
>   or *"not determined"*.
> - It is the next step on the chain that blocks `0340` (S3a, [[decisions/adr-116-verified-login]]) and, behind it,
>   `0332`, `0323`, `0250` S3b, `0248` and `0301`.
> - The line-3 banner (`🔲 Backlog`) was not touched.
>
> *History —* **`2247699` (2026-10-02): 5 rows — 5 `🔲 Backlog`; 5 OPEN; still NOT started.** ⚠️ Counted by me this
> run. Verify task **`0370`** — for [[tasks/public-lobby-one-minute]] (`0367`, the 1-minute public lobby test) — was
> filed 2026-10-02 at `0367`'s close (owner ruling *"Close + file both tasks (Recommended)"* plus the standing
> build/verify-split rule) and placed at **rank 1** (appended at 5, then moved up; no closed row exists here, so none
> was renumbered). Read-only: compare the 7 days after the game-server deploy with the 7 days before, on the owner-ruled
> rule — keep 1 minute if multiplayer matches per day hold or rise **and** the lone-real-player share does not jump
> noticeably. **Owner rulings 2026-10-02:** the deploy day is left out of both windows; Step 1 (re-run the "before"
> query) is done **at the weekend deploy (2026-10-03/04), when the owner asks** — whether or not this sprint has started.
> ⚠️ Rank 1 is **placement, not merit** — but it is the only row with a fixed date. **Order then: `0370` 1 · `0363` 2 ·
> `0358` 3 · `0351` 4 · `0343` 5.** The line-3 banner was not touched.
>
> *History —* **`4f9f857` (2026-10-01): 4 rows — 4 `🔲 Backlog`; 4 OPEN; still NOT started.** ⚠️ Counted by me this
> run. Verify task **`0363`** — for [[tasks/telemetry-deploy-version-tags]] (`0356`) — was filed 2026-10-01 and placed
> at **rank 1** by `fkit-lead` at `0356`'s close, on the owner's standing build/verify-split rule (appended at 4, then
> moved up; no closed row exists here, so none was renumbered). Owner-run after the weekend telemetry deploy: the
> deploy printed a `<base>-telemetry.<N>` name and succeeded; the annotated git tag is on origin at the deployed
> commit; the box marker and the local deploy record show the same version and commit; Uptrace still answers.
> ⚠️ Preconditions: `0356` **committed** and deployed. Does not block Sprint 7's deploy. **Order then: `0363` 1 ·
> `0358` 2 · `0351` 3 · `0343` 4.** ⚠️ `0363` above `0358` is **placement, not merit** — two short owner checks on
> different boxes, runnable in either order. The line-3 banner was not touched.
>
> *History — `49a419d`:* **3 rows — 3 `🔲 Backlog`; 3 OPEN; still NOT started.** ⚠️ Counted by me
> this run, by each row's leading status glyph. Two **verify tasks** were filed on 2026-09-30 and placed at the top,
> on the owner's standing build/verify-split rule (*"verify task on top of the next sprint"*; it must not block
> Sprint 7's deploy):
>
> | Rank | Task | Status |
> |---|---|---|
> | 1 | **`0358`** — verify [[tasks/profile-deploy-version-tags]] (`0355`) in production: after the weekend profile deploy (next slot 2026-10-03/04), the deploy printed a `<base>-profile.<N>` name and succeeded, `/health` reports it, the annotated git tag is on origin at the deployed commit, the registry holds the name, and telemetry shows it *if observable*. Placed by `fkit-lead` at `0355`'s close (standing rule, not a fresh owner ruling) | Backlog |
> | 2 | **`0351`** — verify [[tasks/worker-reuses-page-map]] (`0035`) on the dev box: a public match starts and each map file downloads once. Owner ruling *"File a verify task for Sprint 8"* | Backlog |
> | 3 | `0343` discussion: eight parked features (was rank 1, then 2) | Backlog |
>
> ⚠️ `0358` above `0351` is **placement, not merit** — both are short owner-run checks on different boxes. The line-3
> banner was not touched.
>
> *History:* at `b434732` the board had 1 row (`0343`), 1 open.

## Context

The board was **created on 2026-09-29** by a spawned `fkit-producer`, on an owner ruling given live in the
`fkit lead` session and relayed by `fkit-lead` (ADR-021/037; ⛔ not producer precedent). The ruling: split
[[decisions/sprint-6]]'s **11 brief-less rows** into discussion briefs — *"each brief should have a list of the
things that should be discussed (not implemented, but discussed)"* — and *"is the task related to the paid
citizenship? If yes, put this brief into Sprint 8. If no — put it into Backlog."* The owner **delegated that
test to the producer**.

- **Named 2026-09-29 — owner ruling D**, exact wording: *"Paid Citizenship Perks and More Content"*.
- ⚠️ **No goal set.** The producer did not invent one; the name is not a goal. *(Sprint 7's goal was set 2026-10-02 — see [[decisions/sprint-7]]; this board's was not.)*
- **Not started** — the owner did not start this sprint.

## Decision

| Rank | Task | Status |
|---|---|---|
| ~~1~~ ~~3~~ **6** *(first row of a new board — a position, not a merit rank; moved down by the verify tasks and `0373` above — 2026-09-30, 2026-10-01, 2026-10-02)* | `0343` **Discussion: eight parked features** — paid-citizenship perks and more | Backlog |

**What `0343` holds:**

- **Five placed by the producer's "tied to paid citizenship" test** (the owner may overrule):
  - Paid Campaign Map Packs — *borderline: a separate product, but a pack purchase grants citizenship*;
  - Nickname Styling System;
  - Map Voting for Verified Players — *borderline: "verified" = citizens, earned vs paid not stated*;
  - Replay Access as Premium Feature — *borderline: "premium tier" read as citizenship*;
  - Custom Uploaded Flags & Patterns — Paid Citizens Only.
- **Three moved in by owner ruling C**, verbatim *"Leaderboard Rewards, Coin Economy, Clans → Backlog — move that
  to the Sprint 8."*: Leaderboard — Rewards Layer, Coin Economy + Rewarded Ads, Clans. This **overrules** the
  producer's borderline "no" calls on them; they had first gone to `0342`. `0343` was retitled; its folder was
  not renamed.

The other brief, `0342` (**three** items NOT tied to paid citizenship: server restart UX, mobile warning, free
historical maps), sits on the Backlog board — see [[decisions/sprint-backlog]].

## Consequences

- Every item here is a **discussion**, not a build: nothing is scoped for implementation yet.
- Most items were Sprint 5 plan tasks carried to Sprint 6 on 2026-09-26; the Sprint 5 plan's task prose stays
  where it is, with a pointer to `0343` (see [[decisions/sprint-5]]).

## Related

- [[tasks/profile-postgres-digest-lock]] — task `0384`, rank 54, closed 2026-10-15 (not deployed); `0385` at 55
- [[decisions/adr-120-third-party-images-digest-pinned]] — ADR-120 (proposed), the decision `0384`/`0385` implement for the profile box
- [[decisions/sprint-6]] — the closed board whose brief-less rows became `0342` / `0343`
- [[decisions/sprint-7]] — ~~the active sprint~~ 📌 *2026-10-09: closed; `0219` / `0213` moved here before the close*
- [[decisions/sprint-5]] — the original home of most of these items; its prose now points at `0343`
- [[decisions/sprint-backlog]] — `0342`, the "not tied to paid citizenship" discussion brief
- [[decisions/product-strategy]] — `plan-index.md` lists this board and repoints the priority table to `0342` / `0343`
- [[tasks/profile-deploy-version-tags]] — task `0355`, verified by `0358` (rank 1)
- [[tasks/worker-reuses-page-map]] — task `0035`, verified by `0351` (rank 2)
- [[tasks/telemetry-deploy-version-tags]] — task `0356`, verified by `0363` (rank 1)
- [[tasks/public-lobby-one-minute]] — task `0367`, verified by `0370` (rank 1, filed 2026-10-02)
- [[tasks/stale-login-client-diagnostics]] — task `0372`, the client events `0373` (rank 2 here until 2026-10-04; now Sprint 7, rank 36) reads
- [[tasks/stale-login-signature-age]] — task `0366`, the server brackets `0373` (rank 2 here until 2026-10-04; now Sprint 7, rank 36) reads
- [[tasks/verified-login-live-check]] — task `0339`, the failed live check that started the `0373` chain
- [[decisions/adr-116-verified-login]] — the verified-login decision; `0340` (S3a) waits on `0373`
- [[systems/analytics]] — the `0372` events `0373` (rank 2 here until 2026-10-04; now Sprint 7, rank 36) reads
- [[tasks/telemetry-deploy-version-tags-production-check]] — task `0363` (rank 3): verify passed, closed 2026-10-03
- [[tasks/profile-deploy-version-tags-production-check]] — task `0358` (rank 4): verify passed, closed 2026-10-03
- [[systems/weekend-deploy-window]] — the 2026-10-03 window in which `0363`, `0358` and `0370`'s Steps 1–3 ran
- [[tasks/private-lobby-idle-end]] — task `0377`, verified by `0390` (rank 7)
- [[tasks/authenticated-profile-read]] — task `0250`, S3b verified by `0396` (rank 10)
- [[tasks/verified-login-enforce]] — task `0340`, verified by `0395` (filed here at 9, moved to Sprint 7)
- [[decisions/adr-122-stale-login-gate-owner-judgment]] — why `0392` was re-scoped and moved
- [[tasks/stale-login-fix-decision]] — task `0373`, filed here (rank 2), moved to Sprint 7 on 2026-10-04
- [[tasks/paid-citizen-ad-free]] — task `0248`, verified by `0398` (rank 11)
- [[tasks/session-verified-status-line]] — task `0397`, verified by `0400` (rank 12)
- [[tasks/citizenship-explainer-popup]] — task `0301`, whose verify `0401` was filed here (rank 13) and moved to Sprint 7 (48) the same day
- [[tasks/post-24h-window-login-read]] — task `0392`, filed here (rank 8), moved to Sprint 7, closed 2026-10-07
- [[tasks/verified-login-enforce-live]] — task `0395`, filed here (rank 9), moved to Sprint 7, closed 2026-10-07
- [[tasks/join-token-identity-vouch]] — task `0332`, whose verify-live task `0405` sits here at 15
- [[tasks/long-session-refresh-popup]] — task `0404`, filed here at 14 and moved to Sprint 7; its verify `0406` sits here at 16
- [[decisions/adr-124-join-token]] — ADR-124, the design `0405` checks live
- [[tasks/session-verified-status-line-live]] — task `0400` (filed here at 12, closed on Sprint 7 2026-10-08): its failed check 8 became `0418` (rank 17)
- [[tasks/authenticated-profile-read-live]] — task `0396` (filed here at 10; closed on Sprint 7 2026-10-08)
- [[tasks/paid-citizen-ad-free-live]] — task `0398` (filed here at 11; closed on Sprint 7 2026-10-08)
- [[tasks/citizenship-explainer-popup-live]] — task `0401` (filed here at 13; closed on Sprint 7 2026-10-08)
- [[tasks/worker-route-query-string]] — task `0416`, live check on `0420` (rank 18)
- [[tasks/explainer-paid-only-subheading]] — task `0408`, live check on `0420`
- [[tasks/explainer-buy-for-earned-citizens]] — task `0409`, live check on `0420`
- [[tasks/paid-citizen-thank-you-line]] — task `0407`, live check on `0420`
- [[tasks/explainer-popup-wider]] — task `0417`, live check on `0420`
- [[tasks/start-screen-private-tab]] — task `0412`, live check on `0420`
- [[tasks/join-modal-paste-hint]] — task `0413`, live check on `0420` (error-window copy: not checked live, by ruling)
- [[tasks/explainer-popup-shorter-text]] — task `0421` (Sprint 7); its live check `0422` (19) folded into `0420` item 8
- [[tasks/yandex-invite-sdk-link-live]] — task `0383` (Sprint 7), run in the same sitting as `0420` item 1
- [[decisions/cancelled-tasks]] — `0422`, cancelled into `0420`
- [[systems/yandex-games-platform-rules]] — Rule 1, which `0415` (20) makes true app-wide
- [[systems/weekend-deploy-window]] — the unwatched certificate fuse `0219` (24) closes
- [[decisions/adr-108-active-sprint-pointer]] — the active-sprint rule; with Sprint 7 closed 2026-10-09 and this banner still `🔲 Backlog`, no sprint is in progress 📌 *2026-10-12 sync: history — this board was started 2026-10-12 and is now the active sprint.*
- [[systems/player-profile-store]] — the profile box whose operability `0219` (24) and epic `0213` (25) finish
- [[tasks/jest-full-run-lock]] — task `0427` (26): one full jest run at a time; done 2026-10-09
- [[tasks/private-lobby-citizen-perk]] — the six-item release gate whose open items `0376` (27), `0228` (28), `0381` (29) moved here; the flip is `0428` (30)
- [[tasks/yandex-invite-copies-code]] — task `0380`, verified by `0381` (29)
- [[tasks/public-lobby-one-minute-live]] — task `0370` (1): keep 1 minute, by owner ruling 2026-10-10
- [[tasks/worker-reuses-page-map-live]] — task `0351` (5): dev-box pass 2026-10-10
- [[tasks/private-lobby-idle-end-live]] — task `0390` (7): passed live 2026-10-10
- [[tasks/join-token-identity-vouch-live]] — task `0405` (15): closed 2026-10-10
- [[tasks/long-session-refresh-popup-live]] — task `0406` (16): closed as is 2026-10-10
- [[tasks/no-native-tooltips]] — task `0415` (20): built; 📌 *2026-10-12: deployed in `0.0.163`*; live check `0429` (31)
- [[tasks/dark-modal-scrollbar]] — task `0423` (21): built; 📌 *2026-10-12: deployed in `0.0.163`*
- [[tasks/tester-roles-command]] — task `0425` (22): built; deploy and first run `0430` (32)
- [[systems/profile-tester-roles]] — `0425`'s runbook
- [[tasks/private-lobby-production-test]] — task `0376` (27): gate item 2 passed
- [[tasks/join-lobby-race-fix]] — task `0228` (28): reproduced and fixed; live check `0433` (34)
- [[tasks/yandex-invite-copies-code-live]] — task `0381` (29): closed, steps 3–5 not run
- [[tasks/routes-it-test-verified-field]] — task `0431` (33): test-only fix
- [[tasks/sprint-7-fixes-live-checklist]] — task `0420` (18): the Sprint 7 live checklist, closed 2026-10-11
- [[tasks/no-native-tooltips-live]] — task `0429` (31): passed live
- [[tasks/tester-roles-live]] — task `0430` (32): profile deploy + first tester-role run
- [[tasks/join-lobby-race-fix-live]] — task `0433` (34): partial live check, `0428` unblocked
- [[tasks/exit-confirm-popup]] — task `0437` (35): exit confirmation popup, not deployed
- [[tasks/backup-dryrun-minio-image]] — task `0436` (36): backup dry-run green on 11 tables
- [[tasks/private-lobbies-everyone-flag-flip]] — task `0428` (30): private lobbies on for everyone, 2026-10-13
- [[tasks/yandex-outage-recovery-checklist]] — task `0440` (37): the Yandex outage tracker, closed 2026-10-13
- [[tasks/deploy-ssh-key-login]] — task `0441` (38): SSH key login, repo only; verify `0445` (41), then `0442` (39)
- [[tasks/ssh-security-alerts]] — task `0443` (40): SSH security alerts, repo only; verify `0449` (42)
- [[tasks/game-deploy-env-file-cleanup]] — task `0447` (43): env file always removed, repo only; verify `0450` (44)
- [[tasks/ssh-key-login-live]] — task `0445` (41): keys installed, key-only login proven, `0.0.164` deployed over the key
- [[tasks/ssh-password-login-off]] — task `0442` (39): SSH password login off — repo work only; verify `0452` (46)
- [[tasks/private-lobby-funnel-events]] — task `0451` (45): 16 private-lobby funnel events; GameAnalytics funnel `0455` (49)
- [[tasks/profile-deploy-key-only]] — task `0453` (47): profile deploy key path refuses a password prompt
- [[tasks/private-lobby-wrong-code-not-found]] — task `0454` (48): wrong lobby code shows "not found"; `0292` absorbed
- [[tasks/gameanalytics-event-limit-recurring-spikes]] — task `0456` (50): the 500-per-user limit investigation, no code fix
- [[tasks/gameanalytics-game-id-removed]] — task `0459` (51): game ID removed from three task files
- [[tasks/name-change-review-walkthrough]] — task `0350` (52), closed 2026-10-15; verify `0463` parked for Sprint 9
- [[tasks/game-deploy-env-file-cleanup-verified]] — task `0450` (44), closed 2026-10-15
- [[tasks/fail2ban-recheck-after-password-off]] — task `0462` (53), `0452`'s V5 for two boxes, closed 2026-10-15
- [[tasks/citizenship-status-events-recheck]] — task `0418` (17), the GameAnalytics re-read for `0400` check 8, closed 2026-10-16
- [[tasks/news-catch-up-2026-10-17]] — task `0426` (23), the news catch-up, closed 2026-10-16; verify `0469` on Sprint 9
- [[decisions/sprint-9]] — the next board, created 2026-10-16 (not started) to hold `0469`
- [[tasks/parked-paid-features-discussion]] — task `0343`, carried from this board to Sprint 9 and closed there 2026-10-24
- [[tasks/profile-p4-operability]] — task `0219` (rank 24 here), closed on Sprint 9 2026-10-20
