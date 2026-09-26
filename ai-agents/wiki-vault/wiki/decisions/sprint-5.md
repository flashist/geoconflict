# Sprint 5 — Citizenship Launch *(renamed 2026-09-26; was ~~Full F2P Loop & Social Features~~)*

**Date**: 2026-04-16
**Status**: accepted *(🔄 in progress since 2026-09-26 — was `proposed` while pre-scoped)*

> # 🆕 2026-09-26 (later) — SPRINT 5 IS THE ACTIVE SPRINT, IS NOW THE CITIZENSHIP LAUNCH, AND THE LAUNCH SHIPPED
>
> **Re-counted at `HEAD` = `2177ea6`, by each row's leading status glyph: 28 rows — 11 `✅ Done` · 16
> `➡️ Moved` (to [[decisions/sprint-6]]) · 1 `🔲 Backlog`; 1 OPEN — `0297`** (was 21 open at `8f1f76b`).
> ⚠️ Counted by me this run. **Line-3 banner: `🔄 In progress — 2026-09-26`** — the sprint is started, and
> `dashboard.sh select-active` reads it.
>
> **AUTHORITY:** owner rulings given live in the `fkit lead` session via `AskUserQuestion` on 2026-09-26,
> relayed by `fkit-lead` to spawned `fkit-producer`s with no owner channel (ADR-021). ⛔ Not producer
> precedent. The owner's goal, verbatim: *"make another release today/tomorrow to finally ship the
> profile/citizenship feature to users ... move everything from the Sprint 5, that is not related to that
> goal, to the next sprint (Sprint 6)."*
>
> - **16 rows moved to Sprint 6** (*"Append to Sprint 6 (Recommended)"*), appended there at ranks 3–18
>   in this board's order: the seven brief-less plan items (Tasks 10, 8a, 11, 12, 14, 13, 15) and
>   `0285`, `0289`, `0030`, `0032`, `0213`, `0219`, `0221`, `0286`, `0298`. Each row here now reads
>   `➡️ Moved to Sprint 6 — priority M`; nothing deleted or renumbered (ADR-035). The seven brief-less
>   items keep their prose on this board (the *Decision* table below is that prose, kept as history).
> - **The launch-day checks stayed** (*"Yes, keep them"*): `0238`, `0296`, `0297`.
> - **Started** (*"Yes, after the move"*) — the line-3 banner is the carrier.
> - **Renamed** (*"Rename it, but use the current name for the Sprint 6"*): the H1 now reads
>   **Citizenship Launch**. ⚠️ **Those words are the producer's, not the owner's** — the owner ruled *that*
>   it is renamed; open to correction. The old title moved to Sprint 6. Sprint identity is unchanged.
> - **Launch timing:** *"As soon as possible, it's ok for me if some of the re-measures happen after it."*
>
> **✅ THE LAUNCH SHIPPED — release `0.0.154`, 2026-09-26, about 14:38 Moscow.** Four closes the same
> day, all `(agent-closed — not owner-verified)` on owner rulings:
>
> | Task | Closed on | Carries |
> |---|---|---|
> | `0065` — [[tasks/citizenship-go-live]] | the flip (`3386b90`) + second game deploy + card seen in the live iframe | ⚠️ `0.0.153` never served (SSH failure, **F-F**, cause unknown); rollback image not checked (F-D) |
> | `0018` — [[tasks/citizenship-paid]] | closes on `0065` alone (owner ruling 2026-09-23) | first real purchases returned 200; the proof items stay in `0297` |
> | `0238` — [[tasks/citizenship-kill-switch-launch-check]] | the remote flag flipped off and on in production | badge, inbox and reconciliation POST **unverified** in the off state; one session |
> | `0296` — [[tasks/after-deploy-production-checks]] | A1–A6 and B1–B3 all pass | ⚠️ B2's bell-dot **clearing** not observed |
>
> **Still open here (1):** `0297` — the owner-run test-buy sequence. The first real purchases already
> settled the secret-value question; still open in it: live reconciliation (§4, owner decision pending),
> funnel analytics seen live, and which HMAC construction matched (backlog follow-ups `0309` → `0310`).
>
> ---
>
> # 🆕 2026-09-26 — SEVEN ROWS CLOSED AFTER THE WEEKEND WINDOW; ⛔ THE SPRINT IS STILL NOT STARTED *(superseded later the same day — see the block above)*
>
> **Re-counted at `HEAD` = `8f1f76b`, by each row's leading status glyph: 28 rows — 7 `✅ Done` · 15
> `🔲 Backlog` · 6 `🚧 Blocked`; 21 OPEN** (was 28 open — 19 Backlog · 9 Blocked — at `6eeceeb`).
> ⚠️ Counted by me this run. **Line-3 banner unchanged: `🔲 Backlog — 2026-09-23`** — the owner starts
> Sprint 5 himself; nothing has started it. [[decisions/sprint-4]] closed the same day with 0 open rows,
> so **no row rolled in**. ⇒ **No sprint is active right now.**
>
> **The seven closes, all `(agent-closed — not owner-verified)`, all by spawned producers on owner
> rulings relayed by `fkit-lead` (ADR-021, ADR-033 §5)** — status cells rewritten at close, each keeping
> its earlier value in the brief's history chain:
>
> | Task | Closed on | Carries |
> |---|---|---|
> | `0217` — [[tasks/profile-p2-wire-game-server]] | V1/V3 met at W14 — real credits landed | step 4 half (test-only); watch item **F-B** |
> | `0272` — [[tasks/profile-identity-s3-game-server-resolve-and-credit]] | live proof = `0217`'s V1/V3 | **F-B** |
> | `0273` — [[tasks/profile-identity-s4-client-login-session]] | owner's browser check: 1 login per logged-in load, 0 for guests | Bearer on other callers test-only; **AR-2** until the card flip; one observation each |
> | `0220` — [[tasks/profile-secret-persistence-value-parity]] | §8 steps 1–2 live | 🚩 **step 3 deliberately NOT run** (`0294`); **F-E** wording finding |
> | `0266` — [[tasks/profile-identity-epic]] | all five slices closed (*"Close it"*) | the slices' residuals, not discharged |
> | `0295` — [[tasks/game-prod-egress-ip-allowlist]] | *"on today's evidence"* — address already listed | step 5 on **indirect** evidence only |
> | `0061` — [[tasks/feedback-telegram-delivery-failure]] | two live feedback sends arrived | cause **never confirmed in code**; "works now", not "fixed"; follow-up `0300` on the Backlog board |
>
> **Still open here (21):** `0297` (row 1), `0238`, `0285`, `0289`, `0030`, `0296`, `0018`, `0065`,
> `0032`, `0213`, `0219`, `0221`, `0286`, `0298`, and the seven original feature rows (TBD briefs). Full
> window record: [[systems/weekend-deploy-window]].
>
> ---
>
> # 🆕 2026-09-23 (later) — 28 ROWS: TWELVE MOVED IN FROM SPRINT 4, PLUS TWO NEW TASKS `0297` AND `0298`
>
> **Re-counted 2026-09-24 at `HEAD` = `6eeceeb`, by each row's leading status glyph: 28 rows — 19
> `🔲 Backlog` · 9 `🚧 Blocked`; all 28 OPEN** (was 14 at `b3ee5de`). ⚠️ Counted by me this run.
> **Line-3 banner: `🔲 Backlog — 2026-09-23`** — ⛔ **the sprint is NOT started.** By owner ruling the
> owner starts it himself **after the deploy**, so during the Saturday 2026-09-26 window the tasks being
> executed sit on a `🔲 Backlog` board: ask for them with `/fkit-status Sprint 5`. The old *"ask for
> Sprint 4 by name"* note is struck, superseded by the banners.
>
> **AUTHORITY for everything below:** owner rulings given live in the `fkit lead` session via
> `AskUserQuestion` on 2026-09-23, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner
> channel (ADR-021). ⛔ Not producer precedent. Full rescope record: [[decisions/sprint-4]].
>
> - **Twelve rows appended from Sprint 4 (the rescope):** `0018`, `0065`, `0032`, `0213`, `0219`,
>   `0217`, `0266`, `0272`, `0273`, `0220`, `0221`, `0286` — each needs a deploy, the live box or
>   production. **Status, Priority and Task cells copied verbatim**, so any *"above"* / *"addendum
>   below"* inside them refers to the **Sprint 4** board. Appended, never inserted (ADR-035).
> - **`0298` — config-parity guard: first real report-only production run, then arm `--enforce`.**
>   Split out of `0064` (rescope Q2 = (a)). Position owner-confirmed directly below `0286`. ⚠️ **Every
>   `0203` item lands before `--enforce` is wired** — now satisfied, `0203` closed 2026-09-24. See
>   [[tasks/deploy-time-config-parity-guard]] and [[tasks/config-parity-guard-pre-arming-gate]].
> - **`0297` — the paid-citizenship test-buy sequence, run by the owner (human) after go-live.** Takes
>   `0065` §1–§5 and `0195`'s open value-correctness condition (owner: *"Launch, and leave the test task
>   for the Sprint 5. The test-buy sequence will be run by me (human)"*). **Placed at ROW 1 — the very
>   top — by owner ruling lifting ADR-035's append-only rule for this one row**; an intermediate
>   *"directly above `0296`"* placement was the lead's wording error, not the owner's intent. §5
>   narrowed to *"does the citizenship product ever disappear from `getCatalog()`"*. Its `## Owner`
>   (`fkit-producer`, *"executed by the owner (human)"*) is owner-confirmed.
> - **`0065` is now the go-live only (§6), with NO task condition** — `0296` no longer gates it, and
>   `0195` moved to `0297`. 🚨 **Accepted, owner-ruled tradeoff: paid citizenship goes live to real
>   players before any real purchase is proven** (HMAC construction, secret value and reconciliation all
>   unconfirmed). `0018` closes on `0065` alone; `0297` does **not** gate it.
> - **`0296` no longer blocks any Sprint 4 task or `0065`** (owner: *"Keep it in Sprint 5, but the task
>   shouldn't block Sprint 4"*). 🚩 Its top box now records the **blank-by-hand token rule as RETIRED**
>   (2026-09-24, *"Retire it"*).
>
> ---
>
> # 🆕 2026-09-23 — A SEVENTH ROW: `0296`, A NEW TASK THAT **RECEIVES CHECKS** — ⛔ NOT A MOVE
>
> **The board is 14 rows now, was 13** (counted at `HEAD` = `b3ee5de`; all 14 read `🔲 Backlog`).
> Appended, not inserted (ADR-035); nothing above it moved or was renumbered.
>
> **AUTHORITY.** An **owner ruling given live in the `fkit lead` session via `AskUserQuestion` on
> 2026-09-23**, relayed by `fkit-lead` to a spawned `fkit-producer` holding **no owner channel**
> (ADR-021). ⛔ **Not producer precedent.** The owner named **Sprint 5** for it. ⚠️ **No rank was ruled**
> — the row reads *unranked*, flagged for owner confirmation, with the producer's note that **on merit it
> belongs directly below `0295`** (`0295` must be done for the deploy window to credit at all, and
> section A observes that window). ⛔ **Unranked ≠ low.**
>
> ⛔ **`0296` is NOT a row moved off Sprint 4.** `0062`, `0017` and `0012` were **CLOSED** on
> [[decisions/sprint-4]] — `✅ Done (agent-closed — not owner-verified)` — and **only their unrun
> production checks came here.** Closing them does **not** mean any of it works in production.
> Task records: [[tasks/forward-profile-internal-token]], [[tasks/citizenship-earned]],
> [[tasks/personal-inbox]].
>
> **`0296` — after-deploy production checks: profile token, earned citizenship, personal inbox.**
> *Nothing is built; it runs and records checks.* A failure found here becomes its **own** task.
>
> | Section | Runs when | Checks (and where each came from) |
> |---|---|---|
> | **A** | **after the deploy window** in which `PROFILE_INTERNAL_TOKEN` is deployed **non-empty** (owner ruling 2026-09-19) — depends on `0217` | **A1** token-match pre-check, verdict-only (ex-`0062` D1) · **A2** token reaches the container non-empty (ex-`0062` D2) · **A3** a real authenticated credit end to end (ex-`0062` D3; A2–A3 also absorb `0017`'s and `0012`'s live item 1) · **A4** no partial-config warning and no token in any log or deploy output (ex-`0062` D4 + step 6) · **A5** real XP accrual (ex-`0017` item 2) · **A6** live grant, server side (ex-`0017` item 3) |
> | **B** | **after the citizenship flip**, owned **only** by `0065` §6 | **B1** card State 3 in the live iframe (ex-`0017` item 3) · **B2** the inbox message in the Personal tab, read state across two devices, bell dot clears (ex-`0012` item 2; **also covers the WAIVED local browser checks**) · **B3** a non-citizen sees no Personal tab (ex-`0012` item 3) |
>
> **Traps it carries, the ones a summary drops:**
> - 🚨 **A2 must record BOTH halves** — what the container shows **and** whether the source value was
>   non-empty at deploy time. *Empty + blank source* is **inconclusive** (what happened 2026-09-04);
>   *empty + non-empty source* is a **real failure**. An empty reading without the second half is not a
>   result.
> - ⚠️ **A6 must seed against the XP figures actually live in production at the time** — the repository
>   carries the `0211` rescale (100 threshold, 1 XP per match); production, until `0211` deploys, does
>   not. Seeding against the wrong threshold makes the step pass without testing anything.
> - ⛔ **B3 proves NOTHING while `CITIZENSHIP_CARD_ENABLED` is off** — the tab is hidden for everyone.
> - ⛔ **On an A1 `MISMATCH`: fix local `.env.prod` from the box's persisted token — NEVER regenerate
>   the box's token.**
> - **The deploy-time forget-risk sits at the top of the brief:** a production deploy with a non-empty
>   local token turns crediting ON; blanking it is **manual**, `check:config-parity` cannot see values,
>   and 🔴 **NO GUARD WILL BE BUILT** (owner, 2026-09-04: *"Neither — I'll just remember."*) — ⛔ do not
>   file or re-recommend one.
> - **Blocks `0065`** (its former `0062` condition). 📌 **`0065`'s own ordering problem is NOT solved
>   here** — its step 3 needs the flip, its §6 flips only after 1–4 pass.
> - **The task closes only when both sections are done or owner-waived** — A can be recorded long before
>   B is runnable.
>
> ⚠️ **This board has no wiki page of its own for `0296`** — it is a backlog task, and the sync
> procedure does not page backlog briefs. Its substance is recorded **here, from the board and its
> brief**, until it closes.
>
> ---
>
> # 🆕 A SIXTH ROW WAS APPENDED LATER ON 2026-09-22 — AND IT IS THE ONLY ONE THAT IS **NOT** A MOVE
>
> **The board is 13 rows now, was 12** (counted at `HEAD` = `0d39e4d`; all 13 read `🔲 Backlog`).
>
> ⛔ **`0295` is a NEWLY FILED task, not a row moved off Sprint 4.** It is ⛔ **not RULING D** and
> ⛔ **not RULING E** — **no row left Sprint 4 for it**, and nothing on Sprint 4 reads `➡️ Moved` on its
> account. ⚠️ **Do not fold it into the move notes below when reading this board's history.**
>
> **AUTHORITY.** An **owner ruling given live in the `fkit lead` session via `AskUserQuestion` on
> 2026-09-22**, relayed by `fkit-lead` to a spawned `fkit-producer` holding **no owner channel**
> (ADR-021). ⛔ **Not producer precedent.** The owner, verbatim: *"Record as a task, add it to the
> Sprint 5, not the current Sprint 4."* ⛔ **Sprint 5 explicitly — not Sprint 4, not the Backlog board.**
> ⚠️ **They ruled the ACTION and the BOARD. They ruled NO rank, NO owner field and NO method.**
>
> **`0295` — measure the game-prod egress IP and APPEND it to `PROFILE_INTERNAL_ALLOW_IPS` (`0217`
> Q4).** `0217` requires the **CURRENT** address and says it *"must be measured, not assumed"*; the
> pinned value in `example.env.profile` dates from **JUNE**. 🚩 **`fkit-lead` COULD NOT measure it on
> 2026-09-22 — the prod host is not in any readable env file.**
>
> **TWO deliverables, the second as load-bearing as the first:** (1) **MEASURE** the egress IP by a
> **named, repeatable method**; (2) 🔒 **RECORD THE METHOD — ⛔ NEVER THE ADDRESS.** The address goes
> only into the gitignored profile env file and onto the box — ⛔ never a brief, worklog, report,
> knowledge-base page, wiki page or commit.
>
> 🚨 **THE TRAP IT CARRIES, and it is the half a summary drops:** `PROFILE_INTERNAL_ALLOW_IPS` is **one
> comma list serving TWO unrelated callers** — the **game server** (`/internal/v1/players/resolve`,
> `/internal/v1/credit`) and the **monitoring box**, whose alert relay is mounted under `/internal/`
> **SOLELY** to inherit this allowlist. **A source-IP miss answers 403, and a 403 PERMANENTLY AND
> SILENTLY DISABLES the notification channel** — every later alert dropped at source, forever, no
> retry, nothing tells you; **fixing the address afterwards does not undo it** (re-enable by hand in
> the monitoring UI). 🚩 **Second half: the variable has NO on-box persistence** — `setup-profile.sh`
> defaults it to empty and an empty value renders a bare `deny all`, **403 for everyone**; the deploy's
> loud warning is **the only guard.** ⇒ 🚨 **APPEND. NEVER REPLACE.** See [[systems/alert-delivery]].
>
> **COST OF A WRONG ANSWER:** 403 on every credit call, ⚠️ **indistinguishable from "working" at the
> game server**, and **XP is LOST, not queued.**
>
> 🚨 **BEING ON SPRINT 5 DOES *NOT* DEFER THE MEASUREMENT.** A separate owner ruling (**RULING E** in
> the runbook) split it: **the MEASUREMENT happens at W0 of the weekend window — the OWNER runs it, the
> day before** — while **the TASK, choosing and RECORDING the method, stays on Sprint 5.** ⛔ **Do not
> move `0295` off Sprint 5, and do not read *"it's on Sprint 5"* as *"skip it this weekend"*** — that
> misreading would leave the window's first profile deploy running on a **JUNE-DATED allowlist**.
>
> ⚠️ **CONTEXT RECORDED EXPLICITLY AS *NOT* A VERIFIED CURRENT FACT:** a measurement earlier the same
> day **reportedly matched** the live allowlist, but it was **NOT re-verified** and was **NEVER written
> into any brief** — which is exactly why this was still an open conflict when the runbook was written.
> ⛔ **Do not close `0295` by citing it.**
>
> **Depends on:** nothing in code — ⚠️ **it needs access the agents do not have.** **Blocks:** `0217`
> step 3's *"redeploy the profile box"* cannot honestly be called done while the pinned value is
> June's; ⚠️ **it does NOT block crediting being switched on — it blocks KNOWING whether it will work.**
> 📌 **If it and `0294` are both run, run them on ONE deploy, not two.** Full ordering:
> [[systems/weekend-deploy-window]].
>
> ⚠️ **Same limits as every row on this board:** Sprint 5 **is not the active sprint** — filing here
> **schedules** the work, it does not start it. The row is **appended, not inserted**; nothing above it
> moved and nothing was renumbered (ADR-035), and **append position is not a priority signal.** It does
> **not** belong to this plan's scope statement (*"Full F2P Loop & Social Features"*) — deliberate, not
> drift: the owner put it here by name. ⛔ **No mover skill was invoked; no other task's `## Status` or
> `## Priority` was touched; nothing was committed or pushed.**
>
> ---
>
> # ➡️ FIVE REAL TASKS WERE MOVED ONTO THIS BOARD ON 2026-09-22
>
> **The board was 12 rows after this move, was 7 before it** *(13 as of the `0295` append above)*.
> **Every row still reads `🔲 Backlog` and this board is still NOT the active sprint** — moving work
> here **schedules** it, it does not start it.
>
> ⚠️ **Two things about this plan that used to be true are no longer true, and they matter when reading
> the table below:** (1) **not every row is derived from this document's own task sections**, and
> (2) **not every Brief cell reads `TBD`** — the five moved rows link real briefs that still live under
> `ai-agents/tasks/backlog/`.
>
> ⚠️ **None of the five belongs to this plan's original scope statement (*"Full F2P Loop & Social
> Features"*), and that is deliberate, not drift — the owner put them on this board by name.** They are
> **appended, not inserted**: nothing above them moved and nothing was renumbered (ADR-035), and
> **append position is not a priority signal.**
>
> ## 🚨 TWO SEPARATE OWNER RULINGS, NOT ONE — do not merge them
>
> Both given live in the `fkit lead` session on 2026-09-22 and relayed by `fkit-lead` to a spawned
> `fkit-producer` holding **no owner channel** (ADR-021). ⛔ **Not producer precedent.**
>
> **RULING D — four POST-DEPLOY CHECKUPS: `0238`, `0285`, `0289`, `0061`.** Owner, verbatim:
> *"Let's skip this type of chekups, I will take care of them after deploy. The only thing we should care
> about is to make sure the feature is switcheable (e.g. if the flag is not enabled or doesn't exist, the
> feature is not enabled), and that's it. You can move the tasks connected to checkings to the next
> sprint, so we do final checkups and figure out what's wrong with them after deploy."* Shown a proposed
> list of four, the owner chose **"Move all four."** **Reason: the final checkups happen AFTER the deploy,
> when production can actually be observed.**
>
> **RULING E — `0030` (S3-backed, citizen-gated match archival), a SEPARATE ruling for a SEPARATE
> reason.** ⛔ **`0030` is NOT a post-deploy checkup and did NOT move on RULING D's authority.** Asked
> what `0030`'s two hard blockers were, the owner ruled verbatim: *"Move this task and anything that
> depends on it to the Sprint 5"*. ✅ **"Anything that depends on it" resolved to NOTHING** — swept across
> `ai-agents/tasks/` and `ai-agents/sprints/` and **verified, not assumed** — so **`0030` moved ALONE.**
>
> | Task | What it is | Rank as it arrives |
> |---|---|---|
> | `0238` | validate the citizenship UI kill switch's **remote half** (`citizenship_ui`) at launch | **unranked** — the Sprint 4 Priority cell read `—` and no rank was ever ruled. ⚠️ **unranked ≠ low** |
> | `0285` | detect an **already-disabled** Uptrace notification channel | 🔴 **`Low`, owner-ruled 2026-09-22** (was `Medium`, the producer's unratified append rank) |
> | `0289` | prove a Telegram alert still arrives after an **idle period** (`0274` amendment A1 — ⛔ **not** alert rule A1) | 🔴 **`Low`, owner-ruled 2026-09-22** (was `High`) |
> | `0061` | investigate prod Telegram **feedback** delivery failing with `TypeError: fetch failed` | `High` — **producer's append rank, NOT owner-ruled**; ⛔ the move ruling did not rank it |
> | `0030` | S3-backed match archival, citizen-gated | **unranked**; ⛔ the move ruling did not rank it |
>
> ⚠️ **RANK AND BOARD WERE TWO SEPARATE RULINGS for `0285` and `0289` — the move did not touch the rank**,
> and the ratification happened earlier the same day on the Sprint 4 board.
>
> ⛔ **WHAT DID NOT HAPPEN, for all five.** No task **folder** moved — every brief is still under
> `ai-agents/tasks/backlog/`. **No mover skill was invoked** (`/fkit-task-done` and
> `/fkit-task-cancelled` are for done and cancelled; neither applies to a board move). **No `## Status`
> token and no `## Priority` was touched.** Nothing was committed or pushed.
>
> 🚩 **THREE ROWS WERE OFFERED UNDER RULING D AND THE OWNER DECLINED EACH — they stay on Sprint 4:**
> `0065` (the go-live close for paid citizenship — **not a checkup**), `0064` (Sprint 4's only
> `🔄 In progress` task) and `0203` (the config-parity pre-arming gate). ⛔ **Do not move them on RULING
> D's authority.**
>
> 🚨 **`0030` ARRIVES STILL HARD-BLOCKED, AND ITS BLOCKERS DID NOT COME WITH IT.** Both — `0017`
> (citizenship earned) and `0018` (citizenship paid) — **REMAIN ON SPRINT 4**, so this row sits a board
> *behind* its own prerequisites. **Coherent, not drift** — ⛔ do not "fix" it by dragging them here.
> ⛔ **Neither blocker was discharged or re-sequenced.**
> 🔄 **2026-09-23: `0017` is now CLOSED** (`agent-closed — not owner-verified`, as built + reviewed; production checks → `0296`); **`0018` is still open.** `0030`'s brief records that **whether its blocker 1 (*"citizenship feature must exist"*) means built or live was NOT re-ruled** — and citizenship goes live only at the flip owned by `0065` §6. ⛔ Not resolved here.
> 📐 **Blocker 2 is now measured, not assumed (working tree, 2026-09-22):** the four S3 config slots are
> **plumbed end to end** but **EMPTY**, and `archiveEnabled()` is a hard `false` with no override ⇒
> **the plumbing is done; only the bucket is missing.** ⚠️ **Ceiling: read from the repository, NOT from
> a deployed host.** 🔒 Key names and emptiness only — no value was read or recorded.
> ✅ **RESOLVED 2026-09-22 — `0009` does NOT block `0030`, and the blocker count STAYS TWO.**
> ~~🚩 UNRESOLVED, THE OWNER'S CALL: `0009` declares it **BLOCKS** `0030`, which `0030`'s own two-item
> blocker list does not name. Either a third blocker nobody recorded, or a stale claim.~~
> ⇒ **It was the stale claim.** A spawned `fkit-architect` investigated and returned **NO — `0009`'s
> "Blocks" claim is stale**; the owner **accepted that verdict** live in the `fkit lead` session
> (⛔ not producer precedent). **The short version:** the claim traces to a **conditional** sentence in
> `architecture.md` §13 Q1 that got **flattened into "Blocks"**, and **the determination was never run**;
> `0009` is right about **current** code, but 🔄 **`0030`'s job is to REPLACE the archive POST with an S3
> write, so it removes that leg from `0009`'s scope rather than waiting on it — the arrow points the
> other way.** **The discriminator:** citizen-gating reads `is_citizen` from the **profile server**, not
> from upstream flares — **had it keyed off the latter, the dependency would be real.**
> ⚠️ **ACCEPTED, NOT PROVEN — do not round the confidence up: ~90 % on the technical verdict, ~70 % on
> intent**, because ⛔ code cannot establish what *"Blocks"* meant to its author.
> **`0009` was edited only to downgrade the claim to *Related*** — ⛔ its scope, status and priority were
> not touched. 🚩 **And `architecture.md` §13 Q1 was deliberately NOT corrected — the owner was offered
> that and DECLINED — so the sentence that seeded this can be re-read the same wrong way.** Full record:
> [[decisions/sprint-4]].
> 📌 **`0030` also inherits an archive defect ADR-104 never covered:** the **client archive read**
> (`src/client/JoinPrivateLobbyModal.ts`) is **not** behind `archiveEnabled()` and still fires in
> production. It is the only client read there is, so `0030`'s verification item 2 — *"replays / history
> read back correctly"* — cannot be satisfied without repointing it. Tracked as `0292`; see
> [[decisions/adr-104-archiving-disabled]].
>
> ✅ **On `0238`, what the owner said DOES matter is now a CHECKED CLAIM:** the switchability property
> — *flag absent, flag set to a wrong value, or the Yandex SDK never loaded ⇒ every citizenship surface
> is OFF* — is **VERIFIED IN SOURCE 2026-09-22** and recorded in `0238`'s brief.
> 🚨 ⛔ **NOT verified in production — no deployed build has been observed doing it — and it holds on
> production builds ONLY**, because `checkExperimentFlag()` returns `true` **unconditionally** when
> `GAME_ENV === "dev"`. ⛔ **A local "the card appeared" reading proves nothing.** ⛔ **`0238` blocks
> nothing** — the 2026-09-21 re-scope dropped its gate; the launch flip goes ahead and `0238` observes
> it. ⚠️ **If the validation still cannot be performed, `0238` does NOT close as done** — the record must
> say plainly that the switch is **NOT KNOWN TO WORK**.
>
> ✅ **On `0061`, this is COHERENT WITH its own close condition and not a change to it:** the owner ruled
> 2026-09-17 that it closes on `0273`'s **game deploy**, once feedback delivery is observed working —
> Sprint 5 is simply where that observation now lives. ⚠️ **The fix is already in the tree** (shipped
> inside `0277`'s ND-2 scope); the profile-server half has been live since 2026-09-17, the `Master.ts`
> player-feedback half is **UNSHIPPED** until that deploy. ⚠️ **The investigation was NEVER RUN** — the
> cause is a hypothesis reproduced behaviourally and never confirmed in code, and **the record must say
> so at close.**

## Context

Goal: long-term engagement and monetization systems. Only start once retention metrics from Sprints 1–3 are moving positively.

Sprint 4b now sits between Sprint 4 and Sprint 5 as a short interim public-match variety update; it does not replace the citizenship/payment prerequisites that Sprint 5 depends on.

Source: `ai-agents/sprints/plan-sprint-5.md`

## Decision

| Task | Effort | A/B? | Description |
|---|---|---|---|
| 10 — Leaderboard rewards | 3–5 days | ✅ Test | Top-10 badges, collectible monthly top-3 badges kept permanently |
| 8a — Nickname styling | 1–2 weeks | ✅ Test | Background color, border, text color — upsell for nickname buyers |
| 11 — Coin economy | 3–4 weeks | ❌ All users | Post-match coin rewards, rewarded ads (double coins), spend on cosmetics |
| 12 — Clans | 3–4 weeks | ✅ Test | Free clan tag + auto-team placement; paid: banner, stats, match history |
| 14 — Map voting | 1–2 weeks | ✅ Test | Verified players vote during random maps; random↔voted alternation |
| 13 — Replay access | 3–5 days | ❌ All users | Free: last 3 matches; premium: last 20+, shareable links |
| 15 — Custom flags/patterns | 2–3 weeks | ❌ All users | Paid citizens only; moderation required before match appearance |

## Key Decisions

**Coin economy constraints:** leaderboard badges and verified nicknames must NOT be purchasable with coins — earned/purchased achievements must stay distinct from the coin economy.

**Clan gate:** only build when analytics shows lobbies consistently filling. Auto-team placement only works if clan members can find each other in matches.

**Map voting mechanics:**
- Pattern: random → voted → random → voted (repeating)
- Voting opens during the preceding map
- Tiebreaker: random among all tied maps (even zero-vote case is a tie resolved randomly)
- Cooldown: recently played maps excluded from vote pool (developer to propose N)
- Non-verified players can see voting panel but cannot vote

**Custom uploads (Task 15):** V1 flags only (simpler than patterns). Manual review for V1. Uploaded images do not appear until approved. Refund policy required before launch.

**8a (Nickname styling) dependency:** requires centralized name rendering component from Task 8 (Sprint 4). All badge/icon display goes through that component — no ad-hoc solutions.

> ## 📌 UPDATED 2026-09-08 — this plan's 2026-08-14 reconciliation note is SUPERSEDED as to `0026` and `0029`
>
> The plan carried a note recording that three backlog briefs name Sprint 5/6 in their `## Sprint` field but sit **outside this plan's scope statement**, and were therefore **deliberately not added** — flagged to the owner in the 2026-08-14 reconciliation hand-off instead. ⛔ **That paragraph is KEPT, not deleted:** it is the record of *why* those tasks were parked, and it is no longer the current state.
>
> **Owner ruling 2026-09-08, given live in session:** `0026` (fix compact-map shore generation) and `0029` (in-game hint display) get rows on **`sprint-backlog.md`**, status `⬜ No sprint` — the same handling `0027` already had for Sprint 6. **This overturns the 2026-08-14 decision not to add them.** The trigger: a board-visibility sweep found both were **board-invisible** — in **no sprint file's table at all**, so nothing rendered them and no status run could see them.
>
> ⛔ **NEITHER TASK WAS ADDED TO THIS PLAN, and Sprint 5's scope statement still excludes both** — which is precisely why `sprint-backlog.md` is their home and this board is not. **Status, priority and dependencies were not changed; this is visibility only.** `0027` is unaffected — its Sprint 6 row already existed. See [[decisions/sprint-backlog]].

## Consequences

- Tasks 13 and 15 depend on Task 11 tier/pricing system
- Tasks 8a and 14 depend on Task 8 (Sprint 4) citizenship/verification infrastructure
- Rewarded ads (deferred from Sprint 4) ship as part of Task 11 coin economy

## Related

- [[decisions/product-strategy]] — sprint ordering
- [[decisions/sprint-4]] — previous sprint, provides citizenship infrastructure this sprint builds on
- [[decisions/sprint-4b]] — interim variety sprint between Sprint 4 and Sprint 5
- [[decisions/sprint-6]] — next planned sprint; ~~focused on map content after monetization foundations~~ since 2026-09-26 it carries this board's 16 non-launch rows and this sprint's former title
- [[systems/clans]] — Existing clan tag + team assignment implementation (foundation for Task 12)
- [[tasks/investigate-clans-system]] — Investigation findings: what is implemented, what is broken, and recommended next steps for Task 12
- [[decisions/adr-105-compact-maps-out-of-rotation]] — the map-regeneration fix scheduled here is that ADR's expected exit
- [[decisions/adr-102-privilege-refresher-fails-open]] — Task 11's **earn-only** coin design is what downgraded that ADR's "coin chain" residual; if coins ever become purchasable with money, its trigger must be re-ruled first
- [[decisions/sprint-backlog]] — tasks `0010` / `0011` (flags, territory patterns), which Task 8a and Task 15 both depend on and which are not scheduled in any sprint plan
- [[decisions/adr-108-active-sprint-pointer]] — this plan being legitimately open alongside 4 and 6 is the condition that makes an unnamed status request return the wrong board
- [[decisions/adr-104-archiving-disabled]] — the ADR `0030` is the expected exit from, and the client archive read (`0292`) its verification depends on
- [[decisions/archive-archival-strategy]] — the phase split that made `0030` the "later, with citizenship" half now scheduled here
- [[tasks/citizenship-card-fail-closed-degraded-sdk]] — task `0291`, which handed `0238`'s live/browser observation onward to this board
- [[tasks/citizenship-kill-switch-coverage]] — task `0236`, which built the two kill-switch layers `0238` validates
- [[tasks/yandex-catalog-registration]] — task `0014`, which set the **remote** half (`citizenship_ui`) `0238` must observe, and left its name/value unconfirmed
- [[systems/alert-delivery]] — the alert path `0285` and `0289` check
- [[systems/match-logging]] — what a match records today, and what `0030` would make retrievable
- [[tasks/yandex-catalog-registration]] — task `0014`, which set the remote `citizenship_ui` flag `0238` must observe here
- [[systems/weekend-deploy-window]] — the deploy window that filed `0295` onto this board, and the **W0** step whose measurement `0295` must record the method for
- [[decisions/sprint-backlog]] — where `0294`, the window's other removed step, was filed instead
- [[tasks/forward-profile-internal-token]] — task `0062`, whose production checks became `0296` section A
- [[tasks/citizenship-earned]] — task `0017`, whose live tail became `0296` A2–A3, A5, A6 and B1
- [[tasks/personal-inbox]] — task `0012`, whose live tail became `0296` A2–A3, B2 and B3
- [[tasks/deploy-time-config-parity-guard]] — task `0064`, split 2026-09-23 — its step 8 and arming are this board's `0298`
- [[tasks/config-parity-guard-pre-arming-gate]] — task `0203`, whose tags and rulings `0298` consumes when arming
- [[tasks/yandex-payments-secret-forwarding]] — task `0195`, whose open value-correctness question moved to this board's `0297` §1 on 2026-09-23
- [[systems/project-brief]] — product ground truth — records the 2026-09-23 `0065` go-live-before-proof tradeoff
- [[tasks/profile-p2-wire-game-server]] — task `0217`, moved in from Sprint 4 and closed here 2026-09-26 (XP go-live)
- [[tasks/profile-identity-s3-game-server-resolve-and-credit]] — task `0272` (S3), moved in and closed here 2026-09-26
- [[tasks/profile-identity-s4-client-login-session]] — task `0273` (S4), moved in and closed here 2026-09-26
- [[tasks/profile-identity-epic]] — epic `0266`, moved in and closed here 2026-09-26
- [[tasks/profile-secret-persistence-value-parity]] — task `0220`, moved in and closed here 2026-09-26 with step 3 deliberately not run
- [[tasks/game-prod-egress-ip-allowlist]] — task `0295`, filed on this board 2026-09-22 and closed here 2026-09-26
- [[tasks/feedback-telegram-delivery-failure]] — task `0061`, moved here 2026-09-22 and closed 2026-09-26
- [[tasks/citizenship-go-live]] — task `0065`, the go-live, closed here 2026-09-26 (release `0.0.154`)
- [[tasks/citizenship-paid]] — task `0018`, the buy flow, closed here 2026-09-26 on `0065`
- [[tasks/citizenship-kill-switch-launch-check]] — task `0238`, the kill switch flipped in production, closed here 2026-09-26
- [[tasks/after-deploy-production-checks]] — task `0296`, the production checks of `0062`/`0017`/`0012`, closed here 2026-09-26
