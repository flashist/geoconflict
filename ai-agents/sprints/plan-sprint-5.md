# Geoconflict — Sprint 5 — Full F2P Loop & Social Features

> # ⛔ THIS IS NOT THE ACTIVE SPRINT — it is PRE-SCOPED, not in work
>
> **Owner ruling 2026-09-07, verbatim:** *"The active sprint is the Sprint 4!"* →
> [`plan-sprint-4.md`](plan-sprint-4.md).
>
> ⚠️ **This board is legitimately open and nothing here is being archived.** Pre-scoping future
> sprints is the intended workflow. See
> [ADR-108](../knowledge-base/decisions/adr-108-owner-set-active-sprint-pointer.md) for why the
> tooling cannot currently be told which sprint is active; ask for status by name:
> `/fkit-status Sprint 4`.

> See [plan-index.md](plan-index.md) for strategic logic, experiments policy, and full priority table.

---

## Sprint 5 — Full F2P Loop & Social Features

**Goal:** Build long-term engagement and monetization systems. These are higher effort and should only be started once retention metrics from Sprints 1–3 are moving positively.

---

## Status

> Authored 2026-08-14 — this plan had no status table (owner ruled 2026-08-10 that it gets one; task
> `0004` scope). Every row is derived from this document's own task sections: no work has started on
> any of them and no briefs exist yet (brief writing is deferred by design), so every row reads
> `🔲 Backlog` with brief `TBD`. The Priority column carries the plan's own task numbers (the
> `plan-index.md` priority numbering), in this document's order. Three backlog briefs name Sprint 5/6
> in their `## Sprint` field but are not part of this plan's scope statement (`0026`, `0029`; `0027`
> for Sprint 6) — flagged to the owner in the 2026-08-14 reconciliation hand-off, not added here.
>
> 🚨 **SUPERSEDED 2026-09-08 as to `0026` and `0029` — owner ruling given live in session and relayed
> through the spawning session.** The paragraph above is **kept deliberately** as the record of *why*
> those two were parked; it is no longer the current state. A board-visibility sweep found both were
> **board-invisible** — in no sprint file's table at all, so nothing rendered them and no status run
> could see them. The owner ruled they get rows on
> [`sprint-backlog.md`](sprint-backlog.md) (status `⬜ No sprint`), matching how `0027` was handled for
> Sprint 6. **This overturns the 2026-08-14 decision not to add them.** Their status, priority and
> dependencies were not changed, and **neither task was added to this plan** — Sprint 5's scope
> statement still excludes both, which is exactly why `sprint-backlog.md` is their home and this board
> is not. `0027` is unaffected: its Sprint 6 row already existed.
>
> 🚨 **ALSO SUPERSEDED, 2026-09-22 — the paragraph above no longer describes this table, in two ways.**
> It is kept as the record of how the board started. What changed: **four real, already-briefed tasks
> were moved onto this board from [Sprint 4](plan-sprint-4.md) by an owner ruling** — `0238`, `0285`,
> `0289` and `0061` — so (1) **not every row is derived from this document's own task sections**, and
> (2) **not every Brief cell reads `TBD`**; those four link real briefs under
> `ai-agents/tasks/backlog/`. **Every row still reads `🔲 Backlog`.** Full authority, the owner's
> verbatim words, and the limits: the note directly **below the table**, and **RULING D** in
> [`plan-sprint-4.md`](plan-sprint-4.md)'s `## Status` preamble.
>
> 📌 **AMENDED LATER THE SAME DAY, 2026-09-22 — the count is now FIVE, not four.** A **FIFTH** task,
> [`0030`](../tasks/backlog/0030-archive-s3-backed-citizen-gated/brief.md), was moved onto this board
> from [Sprint 4](plan-sprint-4.md) by a **SEPARATE owner ruling** — **RULING E**, ⛔ **not RULING D**
> and ⛔ **not a checkup**. The paragraph above is kept as written; read "four" as the RULING D group
> specifically. **`0030` still reads `🔲 Backlog`** like every other row.

| Status | Priority | Task | Brief |
|---|---|---|---|
| 🔲 Backlog | 10 | Leaderboard — Rewards Layer | TBD |
| 🔲 Backlog | 8a | Nickname Styling System *(depends on Task 8 — verified nickname purchase + centralized name rendering)* | TBD |
| 🔲 Backlog | 11 | Coin Economy + Rewarded Ads Full Version | TBD |
| 🔲 Backlog | 12 | Clans *(gated on lobby health)* | TBD |
| 🔲 Backlog | 14 | Map Voting for Verified Players *(depends on Task 8)* | TBD |
| 🔲 Backlog | 13 | Replay Access as Premium Feature *(depends on Task 11 tier/pricing)* | TBD |
| 🔲 Backlog | 15 | Custom Uploaded Flags & Patterns — Paid Citizens Only *(depends on Tasks 9/9a and Task 8)* | TBD |
| 🔲 Backlog | — *(unranked — the Sprint 4 Priority cell read `—` and no rank was ever ruled; ⚠️ **unranked ≠ low**)* | 🔴 **Verify the citizenship UI kill switch AT LAUNCH — flip the `citizenship_ui` console flag off, open a fresh session, confirm the surfaces are gone, write it down.** *(**➡️ MOVED IN FROM [SPRINT 4](plan-sprint-4.md) ON 2026-09-22, on an OWNER RULING** given live in the `fkit lead` session and relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021) — RULING D on the Sprint 4 board. Owner, verbatim: *"You can move the tasks connected to checkings to the next sprint, so we do final checkups and figure out what's wrong with them after deploy."* **Status meaning carried across honestly and unchanged: it was `🔲 Backlog` on Sprint 4 and it is `🔲 Backlog` here.** ⛔ **This row BLOCKS NOTHING** — the 2026-09-21 re-scope dropped the gate; the launch flip goes ahead and this task observes it. ⛔ **The task folder did NOT move and no mover skill was invoked.** ⚠️ **If the validation still cannot be performed, this does NOT close as done** — say plainly the switch is **NOT KNOWN TO WORK**. ✅ **The switchability property the owner named as the thing that matters is now VERIFIED IN SOURCE 2026-09-22** and recorded in the brief's `## Context`; 🚨 ⛔ **NOT verified in production — no deployed build has been observed doing it — and it holds on prod builds only, since `checkExperimentFlag()` returns `true` unconditionally when `GAME_ENV === "dev"`.**)* | [`0238-validate-citizenship-ui-kill-switch-in-a-real-build-launch-gate`](../tasks/backlog/0238-validate-citizenship-ui-kill-switch-in-a-real-build-launch-gate/brief.md) |
| 🔲 Backlog | 🔴 **Low — OWNER-RULED 2026-09-22** *(ratified on the [Sprint 4](plan-sprint-4.md) board earlier the same day; was `Medium`, the producer's unratified append rank. ⚠️ **RANK AND BOARD ARE TWO SEPARATE 2026-09-22 RULINGS — the move did not touch the rank.**)* | **Detect an ALREADY-DISABLED Uptrace notification channel — read the monitoring stack's own channel state** *(**➡️ MOVED IN FROM [SPRINT 4](plan-sprint-4.md) ON 2026-09-22**, RULING D — same owner ruling as `0238` above. **Status meaning carried across honestly and unchanged: `🔲 Backlog` on Sprint 4, `🔲 Backlog` here.** ✅ **Consistent with, and not a re-decision of, the 2026-09-19 ruling** that already deferred this together with `0289` and `0219` G3/G4 as one monitoring bucket. ⛔ **The task folder did NOT move and no mover skill was invoked.** **Merit note, carried over:** on merit this belongs directly below [`0284`](../tasks/done/0284-alert-path-liveness-probe-a-webhook-403-permanently-disables-uptrace-alerting/brief.md) — it closes the hole `0284` leaves open and reuses its marker path.)* | [`0285-detect-an-already-disabled-uptrace-notification-channel-read-its-own-channel-state`](../tasks/backlog/0285-detect-an-already-disabled-uptrace-notification-channel-read-its-own-channel-state/brief.md) |
| 🔲 Backlog | 🔴 **Low — OWNER-RULED 2026-09-22** *(ratified on the [Sprint 4](plan-sprint-4.md) board earlier the same day; was `High`, the producer's unratified append rank. ⚠️ **RANK AND BOARD ARE TWO SEPARATE 2026-09-22 RULINGS.**)* | **Prove a Telegram alert still arrives after an IDLE period — `0274` amendment A1** *(⛔ **NOT alert rule A1** — the brief's own "READ FIRST" section explains the two different things called A1. **➡️ MOVED IN FROM [SPRINT 4](plan-sprint-4.md) ON 2026-09-22**, RULING D — same owner ruling as `0238` above. **Status meaning carried across honestly and unchanged: `🔲 Backlog` on Sprint 4, `🔲 Backlog` here.** ✅ **Consistent with the 2026-09-19 ruling** that deferred this with `0285` and `0219` G3/G4 as one monitoring bucket. ⛔ **The task folder did NOT move and no mover skill was invoked.** **Merit note, carried over:** on merit this belongs directly below `0284` — it verifies the last unproven hop of the alert path `0284` guards and `0277` built.)* | [`0289-prove-a-telegram-alert-arrives-after-an-idle-period-0274-amendment-a1`](../tasks/backlog/0289-prove-a-telegram-alert-arrives-after-an-idle-period-0274-amendment-a1/brief.md) |
| 🔲 Backlog | High *(producer's append rank — ⚠️ **NOT owner-ruled**, and append rank is not a merit ranking; still flagged for owner confirmation. ⛔ **The 2026-09-22 move ruling did NOT rank this row.**)* | **Investigation: prod Telegram feedback delivery fails with `TypeError: fetch failed`** *(**➡️ MOVED IN FROM [SPRINT 4](plan-sprint-4.md) ON 2026-09-22**, RULING D — same owner ruling as `0238` above. **Status meaning carried across honestly and unchanged: `🔲 Backlog` on Sprint 4, `🔲 Backlog` here.** ✅ **Coherent with this task's own close condition and NOT a change to it:** the owner ruled 2026-09-17 that it **closes on [`0273`](../tasks/backlog/0273-profile-identity-s4-client-login-session-and-bearer-token/brief.md)'s GAME DEPLOY, once feedback delivery is observed working** — Sprint 5 is where that observation now lives. ⚠️ **THE FIX IS ALREADY IN THE TREE** (shipped inside [`0277`](../tasks/done/0277-uptrace-alert-delivery-to-telegram/brief.md)'s ND-2 scope); the profile-server half is live since 2026-09-17, the `Master.ts` player-feedback half is **UNSHIPPED** until that deploy. ⚠️ **THE INVESTIGATION WAS NEVER RUN** — the cause is a **hypothesis reproduced behaviourally and never confirmed in code**, and the record must say so at close. ⛔ **The task folder did NOT move and no mover skill was invoked.**)* | [`0061-investigate-prod-telegram-feedback-delivery-failure`](../tasks/backlog/0061-investigate-prod-telegram-feedback-delivery-failure/brief.md) |
| 🔲 Backlog | — *(unranked — the Sprint 4 Priority cell read `—` and no rank was ever ruled; ⚠️ **unranked ≠ low**. ⛔ **The 2026-09-22 move ruling did NOT rank this row.**)* | **S3-Backed Match Archival (Citizen-Gated)** *(**➡️ MOVED IN FROM [SPRINT 4](plan-sprint-4.md) ON 2026-09-22**, on an **OWNER RULING** given live in the `fkit lead` session and relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021) — **RULING E** on the Sprint 4 board. ⛔ **NOT RULING D and NOT a checkup** — a separate ruling, a separate question; it did not move with the four above it. Owner, verbatim: *"Move this task and anything that depends on it to the Sprint 5"*. ✅ **"Anything that depends on it" resolved to NOTHING — swept and verified, so this task moved ALONE.** **Status meaning carried across honestly and unchanged: it was `🔲 Backlog` on Sprint 4 and it is `🔲 Backlog` here.** ⛔ **The task folder did NOT move and no mover skill was invoked.** 🚨 **STILL HARD-BLOCKED, and the blockers did NOT come with it:** (1) the citizenship feature must exist, and (2) an S3 bucket + credentials must be provisioned. ⚠️ **Both citizenship blockers — [`0017`](../tasks/backlog/0017-citizenship-earned/brief.md) and [`0018`](../tasks/backlog/0018-citizenship-paid/brief.md) — REMAIN ON [SPRINT 4](plan-sprint-4.md)**, so this row sits a board *behind* its own prerequisites. **Coherent, not drift** — ⛔ do not "fix" it by dragging them here. 📐 **Blocker 2 is measured, not assumed (working tree, 2026-09-22):** the four config slots are **plumbed end to end** (`DefaultConfig.ts:214-224`, forwarded by `deploy.sh:315-318`) but **empty**, and `archiveEnabled()` is a hard `false` with no override ⇒ **the plumbing is done; only the bucket is missing.** ⚠️ **Ceiling: read from the repository, NOT from a deployed host.** ✅ **RESOLVED 2026-09-22, LATER THE SAME DAY — STRUCK, NOT DELETED.** ~~🚩 **UNRESOLVED, OWNER'S CALL:** [`0009`](../tasks/backlog/0009-self-host-upstream-openfront-api-dependency/brief.md) declares it **BLOCKS** this task, which this task's own two-item blocker list does not name — a third blocker nobody recorded, or a stale claim. **Flagged in the brief, not settled; `0009` was not edited.**~~ ⇒ ✅ **VERDICT — `0009`'s "Blocks `0030`" claim is STALE; this task does NOT depend on `0009`; THE BLOCKER COUNT STAYS TWO** (the two above, unchanged). **Authority:** a spawned `fkit-architect` verdict, **accepted by the owner live via `AskUserQuestion`** in the `fkit lead` session on **2026-09-22**, relayed by `fkit-lead` under **ADR-021**. ⛔ **Not producer precedent.** **Why:** the claim traces to `ai-agents/knowledge-base/architecture.md:898-902` §13 Q1, phrased **conditionally** (*"This determines whether…"*) and flattened into "Blocks" — the determination was never run; `0009` **is** right about current code (`src/server/Archive.ts:32` POSTs to `config.jwtIssuer()`) **but this task REPLACES that with an S3 write**, removing the archive leg from `0009`'s scope; and the **discriminator** is that citizen-gating reads `is_citizen` from the **profile server** (`src/server/GameServer.ts:1336-1337`), not from upstream flares. ⚠️ **Confidence, unrounded — accepted, not proven: ~90% technical, ~70% on intent** — code cannot establish what "Blocks" meant to its author on 2026-08-09. 🚨 **DELIBERATELY NOT DONE, a LIVE RE-DERIVATION RISK: the owner was offered the chance to also correct `architecture.md:898-902` and DECLINED** — the conditional sentence that seeded this is still in the source by choice and can be re-read the same wrong way. 📌 **`0009` WAS edited after all** (owner chose *"Downgrade to Related"*; Blocks line struck → *Related / touches*), ⛔ **its scope, `## Status` and `## Priority` were NOT changed.** **Full record:** [`0030`'s brief](../tasks/backlog/0030-archive-s3-backed-citizen-gated/brief.md) § *"✅ RESOLVED 2026-09-22"*.)* | [`0030-archive-s3-backed-citizen-gated`](../tasks/backlog/0030-archive-s3-backed-citizen-gated/brief.md) |
| 🔲 Backlog | — *(unranked — ⚠️ **the owner ruled the BOARD, not a rank**; **unranked ≠ low**)* | **Measure the game-prod egress IP and APPEND it to `PROFILE_INTERNAL_ALLOW_IPS` — `0217` Q4** *(**🆕 FILED 2026-09-22 ONTO THIS BOARD** by a spawned `fkit-producer` with **no owner channel** (ADR-021), on an **OWNER RULING given live in the `fkit lead` session via `AskUserQuestion`** and relayed by `fkit-lead`. ⛔ **THIS IS A NEW TASK, NOT A MOVE** — it is ⛔ **not RULING D** and ⛔ **not RULING E**; no row left [Sprint 4](plan-sprint-4.md) for it. Owner, verbatim: *"Record as a task, add it to the Sprint 5, not the current Sprint 4."* ⛔ **Sprint 5 explicitly — not Sprint 4, not the Backlog board.** ⚠️ **The owner ruled the ACTION and the BOARD. They did NOT rule the rank, the owner field, or the METHOD.** ⛔ Not producer precedent.)* ⚠️ **THIS BOARD IS STILL NOT THE ACTIVE SPRINT** — filing here **schedules** the work, it does not start it. **Appended, not inserted**; nothing above it moved and nothing was renumbered (ADR-035), and **append position is not a priority signal.** ⚠️ **It does NOT belong to this plan's original scope statement** (*"Full F2P Loop & Social Features"*) — deliberate, not drift: the owner put it here by name. **WHAT IT IS:** [`0217`](../tasks/backlog/0217-profile-p2-wire-game-server-to-profile-box/brief.md) § *What to build* 3 requires the **CURRENT** game-prod egress address and says it *"must be measured, not assumed"*; the value pinned at `example.env.profile:33` is from **JUNE**. 🚩 **`fkit-lead` COULD NOT MEASURE IT on 2026-09-22 — the prod host is not in any readable env file.** ⚠️ **CONTEXT, RECORDED EXPLICITLY AS *NOT* A VERIFIED CURRENT FACT:** a measurement earlier the same day **reportedly matched** the live allowlist, but it was **NOT re-verified** and was **NEVER written into any brief** — which is exactly why this was still an open conflict (C3) when the weekend runbook was written. ⛔ **Do not close this task by citing it.** **TWO DELIVERABLES, the second as load-bearing as the first:** (1) **MEASURE** the egress IP by a **named, repeatable method**; (2) 🔒 **RECORD THE METHOD — NEVER THE ADDRESS** (`0217` verification step 7) — the address goes only into the gitignored profile env file and onto the box, ⛔ never a brief, worklog, report, knowledge-base page, wiki page or commit. 🚨 **THE TRAP THIS TASK CARRIES, verified in the repo:** `PROFILE_INTERNAL_ALLOW_IPS` is **one comma list serving TWO unrelated callers** — the **game server** (`/internal/v1/players/resolve`, `/internal/v1/credit`) and the **monitoring box**, whose alert relay is mounted under `/internal/` **SOLELY** to inherit this allowlist (`alert-delivery-runbook.md:21`). **A source-IP miss answers 403** (`:39`), and a 403 **PERMANENTLY AND SILENTLY DISABLES the notification channel** — every later alert dropped at source, forever, no retry, nothing tells you; **fixing the address afterwards does not undo it** (re-enable by hand in the monitoring UI). 🚩 **Second half: the variable has NO on-box persistence** — `setup-profile.sh:122` defaults it to empty and an empty value renders a bare `deny all`, **403 for everyone**; the deploy's loud warning is **the only guard**. ⇒ 🚨 **APPEND. NEVER REPLACE.** **COST OF A WRONG ANSWER:** 403 on every credit call, ⚠️ **indistinguishable from "working" at the game server** (*"the client never surfaces either"* — `0217` § *Barrier 2*), and **XP is LOST, not queued.** **Depends on:** nothing in code — ⚠️ **it needs access the agents do not have.** **Blocks:** `0217` step 3's *"redeploy the profile box"* cannot honestly be called done while the pinned value is June's; ⚠️ **it does NOT block crediting being switched on — it blocks KNOWING whether it will work.** **Answers** `0217`'s **Q4** and closes the weekend runbook's **C3** and **G2**. 📌 **If it and [`0294`](../tasks/backlog/0294-prove-a-rotated-value-overwrites-the-persisted-one-on-the-live-profile-box/brief.md) are both run, run them on ONE deploy, not two.** | [`0295-measure-the-game-prod-egress-ip-and-append-it-to-the-profile-internal-allowlist`](../tasks/backlog/0295-measure-the-game-prod-egress-ip-and-append-it-to-the-profile-internal-allowlist/brief.md) |

> 🆕 **A SIXTH ROW APPENDED 2026-09-22 — AND IT IS THE ONLY ONE THAT IS *NOT* A MOVE.**
>
> ⛔ **`0295` is a NEWLY FILED task, not a row moved off [Sprint 4](plan-sprint-4.md).** It is
> ⛔ **not RULING D** and ⛔ **not RULING E** — **no row left Sprint 4 for it**, and nothing on Sprint 4
> reads `➡️ Moved` on its account. ⚠️ **Do not fold it into the move notes below when reading this
> board's history.**
>
> **AUTHORITY.** An **OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on
> 2026-09-22**, relayed by `fkit-lead` to a spawned `fkit-producer` holding **no owner channel**
> (ADR-021). ⛔ **Not producer precedent.** The owner, verbatim:
>
> > *"Record as a task, add it to the Sprint 5, not the current Sprint 4."*
>
> ⚠️ **The owner ruled the ACTION and the BOARD. They ruled NO rank, NO owner field and NO method** —
> those are the producer's and are overturnable in one edit.
>
> **What it is:** the unanswered `0217` **Q4** — measure the current game-prod egress IP and **append**
> it to `PROFILE_INTERNAL_ALLOW_IPS`, **recording the METHOD and never the address**. It was
> **C3** in [`weekend-deploy-slot-runbook.md`](../knowledge-base/weekend-deploy-slot-runbook.md),
> which could not run its own first step without it.
>
> ⚠️ **SAME LIMITS AS EVERY ROW ON THIS BOARD:** Sprint 5 **is not the active sprint** — this
> **schedules** the work, it does not start it. The row is **appended, not inserted**; nothing above it
> moved and nothing was renumbered (ADR-035). It does **not** belong to this plan's original scope
> statement, which is deliberate: the owner put it here by name.
>
> ⛔ **WHAT DID NOT HAPPEN.** No mover skill was invoked; no other task's `## Status` or `## Priority`
> was touched; nothing under `ai-agents/wiki-vault/` was touched; nothing was committed or pushed.

> ➡️ **FOUR ROWS APPENDED 2026-09-22 — POST-DEPLOY CHECKUPS MOVED OFF [SPRINT 4](plan-sprint-4.md).**
>
> **AUTHORITY.** An **OWNER RULING given live in the `fkit lead` session on 2026-09-22**, relayed by
> `fkit-lead` to a spawned `fkit-producer` holding **no owner channel** (ADR-021). ⛔ **Not producer
> precedent.** The owner, verbatim:
>
> > *"Let's skip this type of chekups, I will take care of them after deploy. The only thing we should
> > care about is to make sure the feature is switcheable (e.g. if the flag is not enabled or doesn't
> > exist, the feature is not enabled), and that's it. You can move the tasks connected to checkings to
> > the next sprint, so we do final checkups and figure out what's wrong with them after deploy."*
>
> The owner was shown a proposed list of four and chose **"Move all four."** The matching Sprint 4 rows
> read **`➡️ Moved to [Sprint 5](plan-sprint-5.md)`** and name this board as the target; the full ruling
> is **RULING D** in [`plan-sprint-4.md`](plan-sprint-4.md)'s `## Status` preamble.
>
> ⚠️ **THIS BOARD IS STILL NOT THE ACTIVE SPRINT** — see the banner at the top of this file. Moving work
> here **schedules** it; it does **not** start it.
>
> ⚠️ **THESE FOUR DO NOT BELONG TO THIS PLAN'S ORIGINAL SCOPE STATEMENT** (*"Full F2P Loop & Social
> Features"*), and that is deliberate, not drift: the owner put them on this board by name. They are
> **appended, not inserted** — nothing above them moved and nothing was renumbered (ADR-035), and
> **append position is not a priority signal.**
>
> ⛔ **WHAT DID NOT HAPPEN.** No task folder moved (all four briefs are still under
> `ai-agents/tasks/backlog/`); **no mover skill was invoked** — `/fkit-task-done` and
> `/fkit-task-cancelled` are for done and cancelled and neither applies to a board move; no `## Status`
> token and no `## Priority` was touched; nothing under `ai-agents/wiki-vault/` was touched; nothing was
> committed or pushed.
>
> 🚩 **THREE ROWS WERE OFFERED AND THE OWNER DECLINED EACH — they stay on Sprint 4.**
> [`0065`](../tasks/backlog/0065-citizenship-paid-live-verification/brief.md) (the go-live close for paid
> citizenship — **not a checkup**),
> [`0064`](../tasks/backlog/0064-deploy-time-config-parity-guard/brief.md) (Sprint 4's only
> `🔄 In progress` task) and
> [`0203`](../tasks/backlog/0203-config-parity-guard-pre-arming-gate/brief.md). ⛔ **Do not move them on
> this ruling's authority.**

> ➡️ **A FIFTH ROW APPENDED 2026-09-22 — `0030` MOVED OFF [SPRINT 4](plan-sprint-4.md).**
> ⚠️ **A SEPARATE RULING FROM THE FOUR ABOVE — do NOT merge the two.** ⛔ **This is RULING E, not
> RULING D**, and ⛔ **`0030` is NOT a post-deploy checkup** — it did not move on RULING D's authority
> or for RULING D's reason.
>
> **AUTHORITY.** An **OWNER RULING given live in the `fkit lead` session on 2026-09-22**, relayed by
> `fkit-lead` to a spawned `fkit-producer` holding **no owner channel** (ADR-021). ⛔ **Not producer
> precedent.** Asked what `0030`'s two hard blockers were, the owner ruled verbatim:
>
> > *"Move this task and anything that depends on it to the Sprint 5"*
>
> ✅ **"Anything that depends on it" RESOLVED TO NOTHING — swept across `ai-agents/tasks/` and
> `ai-agents/sprints/` and verified, not assumed. `0030` moved ALONE.** Full working in **RULING E** in
> [`plan-sprint-4.md`](plan-sprint-4.md)'s `## Status` preamble and in the brief's `## Sprint` section.
>
> ⚠️ **SAME LIMITS AS THE FOUR ABOVE, and they are not boilerplate:** this board **is still not the
> active sprint** — moving work here **schedules** it, it does not start it. The row is **appended, not
> inserted**; nothing above it moved and nothing was renumbered (ADR-035), and **append position is not
> a priority signal.** It does **not** belong to this plan's original scope statement (*"Full F2P Loop &
> Social Features"*), which is deliberate: the owner put it here by name.
>
> ⛔ **WHAT DID NOT HAPPEN.** The task folder did not move (the brief is still under
> `ai-agents/tasks/backlog/`); **no mover skill was invoked**; no `## Status` token and no
> `## Priority` was touched; **neither hard blocker was discharged or re-sequenced**; nothing under
> `ai-agents/wiki-vault/` was touched; nothing was committed or pushed.
>
> 🚨 **THE BLOCKERS DID NOT COME WITH IT.** `0017` and `0018` **stay on Sprint 4**, so this row sits a
> board behind its own prerequisites — **coherent, not drift.** ⛔ Do not drag them here to "fix" it.
>
> ✅ **RESOLVED 2026-09-22, LATER THE SAME DAY — THE FLAG BELOW IS SUPERSEDED. STRUCK, NOT DELETED.**
>
> ~~🚩 **ONE CONTRADICTION IS FLAGGED AND NOT SETTLED — the owner's call:** `0009` declares it
> **blocks** `0030`, which `0030`'s own blocker list does not name. **`0009` was not edited.**~~
>
> ⇒ ✅ **VERDICT — `0009`'s "Blocks `0030`" claim is STALE. `0030` does NOT depend on `0009`. THE
> BLOCKER COUNT STAYS TWO.**
>
> - **AUTHORITY.** A spawned `fkit-architect` verdict, **accepted by the owner live via
>   `AskUserQuestion`** in the `fkit lead` session on **2026-09-22**, relayed by `fkit-lead` to a
>   spawned `fkit-producer` with no owner channel of its own (**ADR-021**). ⛔ **NOT producer
>   precedent.**
> - **WHY, so it is not re-derived.** The claim traces to
>   [`architecture.md:898-902`](../knowledge-base/architecture.md) §13 open question 1, phrased
>   **CONDITIONALLY** (*"This determines whether R2 and the archive task are blocked on an external
>   party"*) and flattened into "Blocks" — ⛔ **the determination was never run.** `0009` **is** right
>   about current code (`src/server/Archive.ts:32` POSTs to `config.jwtIssuer()`), **but `0030`
>   REPLACES that with an S3 write**, so it *removes* the archive leg from `0009`'s scope rather than
>   waiting on it. **The discriminator:** citizen-gating reads `is_citizen` from the **profile server**
>   (`src/server/GameServer.ts:1336-1337`), **not** from upstream flares.
> - ⚠️ **CONFIDENCE, UNROUNDED — ACCEPTED, NOT PROVEN: ~90% on the technical verdict, ~70% on intent.**
>   **Code cannot establish what "Blocks" meant to its author on 2026-08-09.**
> - 🚨 **DELIBERATELY NOT DONE — A LIVE RE-DERIVATION RISK.** The owner was offered the chance to also
>   correct `ai-agents/knowledge-base/architecture.md:898-902` and **DECLINED.** The conditional
>   sentence that seeded this false dependency **is still in the source, by choice**, and can be
>   re-read the same wrong way. ⛔ **Do not "fix" it there.**
> - 📌 **`0009` WAS edited after all** — the same ruling chose *"Downgrade to Related"*, so its
>   `## Notes` Blocks line was struck and replaced with a *Related / touches* note. ⛔ **Its scope,
>   `## Status` and `## Priority` were NOT changed.**
> - 📌 **FULL RECORD:** [`0030`'s brief](../tasks/backlog/0030-archive-s3-backed-citizen-gated/brief.md),
>   section *"✅ RESOLVED 2026-09-22 — THE BLOCKER COUNT STAYS **TWO**"*.

---

### 10. Leaderboard — Rewards Layer
**Effort:** 3–5 days
**Experiments:** ✅ Test via Yandex experiments API — badges and rank icons are additive display elements. Players not in the experiment group see the leaderboard without badges. Success metric: return visit rate and match frequency for top-ranked players in the experiment group vs control.

Once the core leaderboard system (Task 7) is live and players are engaging with it, add a reward layer that gives top finishers visible recognition.

**Top 10 badge:** players ranked in the top 10 on either the global or monthly leaderboard get a visible icon next to their nickname in every match they play. This is social proof — other players see the badge mid-game, which signals that the leaderboard is real and worth competing for.

**Collectible period rewards:** players who finish in the top 3 of a monthly leaderboard receive a special badge for that month (e.g. "June 2025 — Top 3") that they keep permanently, even after the monthly reset. This creates collectible prestige — veterans accumulate badges from multiple months, which is a visible signal of long-term dedication. Critically, the reward does not disappear when the player loses the rank — it marks the achievement forever.

**Reward tiers (suggested):**
- Global top 3: permanent special icon, distinct from monthly rewards
- Monthly top 3: collectible monthly badge, kept permanently
- Global / monthly top 4–10: smaller icon, refreshed based on current rank

The exact visual design of badges and icons is a separate design task. The developer should implement the data model and display logic; assets can be placeholders initially.

**Architectural note:** all badge and icon display must go through the centralized name rendering component introduced in Task 8. Do not implement badge display as a separate ad-hoc solution.

---

### 8a. Nickname Styling System
**Effort:** 1–2 weeks
**Experiments:** ✅ Test via Yandex experiments API — styling options are purely additive and only visible to players who have already purchased a verified nickname. Players not in the experiment group simply don't see the styling purchase options. Success metric: upsell conversion rate among verified nickname owners.

**Depends on:** Task 8 (verified nickname purchase and centralized name rendering component must exist first)

Once players can purchase a verified nickname (Task 8), offer additional purchasable visual styles for how their nickname is displayed. This gives players who are already bought in a natural upgrade path and increases ARPU from motivated buyers.

**V1 styling options (recommended scope):**
- **Nickname background color:** a colored fill behind the nickname text
- **Nickname border:** a decorative border around the nickname display area
- **Nickname text color:** a custom color applied to the nickname letters themselves

**Pricing model:** style options are sold separately from the nickname purchase, either individually (49–99 rubles each) or as a bundled "nickname style pack" (149–199 rubles). A player who has not purchased a verified nickname (Task 8) cannot purchase styles — styles are an upsell, not a standalone product.

**Display scope:** styled nicknames must render correctly in all the same places as the verification mark — in-match above territory, on the leaderboard, in the post-match summary, and in the diplomacy UI. This is why the centralized name rendering component from Task 8 is a hard prerequisite.

**Important constraints:**
- Readability is a hard requirement. Any style option that makes the nickname difficult to read during a match must be rejected, regardless of how visually interesting it is. The game map is a busy background and nicknames must remain legible at a glance.
- The verification mark introduced in Task 8 must remain visible and unobscured by any styling option.
- Leaderboard badge icons from Task 10 must also remain visible alongside styled nicknames.

**Explicitly out of scope for V1:**
- Custom fonts: technically complex in a Pixi.js canvas renderer and introduce font loading overhead. Revisit only after V1 styling is validated.
- Text pattern fills (gradient or texture on letter shapes): high readability risk and significant rendering complexity. Not recommended until simpler options are proven to sell.

---

### 11. Coin Economy + Rewarded Ads Full Version
**Effort:** 3–4 weeks
**Experiments:** ❌ Excluded — running two parallel economic models creates player fairness issues (players in different groups earn and spend at different rates) and significant support complexity. Ship to all users simultaneously.

Once rewarded ads are validated in Sprint 4, build the proper economy layer using real engagement data to set earn and spend rates.

Design:
- Some cosmetics earnable via coins (flags, basic colors), others money-only (premium patterns, special effects)
- Post-match coin reward based on performance
- Rewarded ad: double post-match coins, or a daily "watch once for X coins" grant
- Coin earn and spend rates must be carefully balanced — once players have expectations about the economy, it is very difficult to change without backlash

**Important constraint:** leaderboard badges and rank icons (Task 10) and verified nickname marks (Task 8) are earned or purchased features — they must not be purchasable with coins. The coin economy should be scoped to cosmetic items only, keeping earned achievements clearly distinct.

---

### 12. Clans
**Effort:** 3–4 weeks
**Experiments:** ✅ Test via Yandex experiments API — clan creation, clan tags, and auto-team placement are additive. Players not in the experiment group see no clan-related UI. Success metric: session frequency and match completion rate for clan members vs non-clan players.

The highest long-term retention upside, but requires healthy lobby fill to feel meaningful. If the auto-team placement mechanic rarely triggers because clan members can't find each other in matches, the feature will feel broken.

Design:
- Free clan creation (tag only) + auto-team placement in Team mode matches as the core mechanic
- Paid clan features: clan banner (custom territory color/pattern in team matches), clan stats page, match history together
- Small clan founding fee (99–149 rubles) to filter throwaway clans

Gate this on lobby health: only build clans when analytics shows lobbies are consistently filling and match completion rates are strong.

---

### 14. Map Voting for Verified Players
**Effort:** 1–2 weeks
**Experiments:** ✅ Test via Yandex experiments API — map voting UI is additive and only visible to verified players. Non-verified players and the control group see no change. Success metric: voting participation rate among verified players, and whether sessions containing a voted map show higher match completion rates than sessions with random maps only.

**Depends on:** Task 8 (Verified Player tier must exist — voting is gated to verified players only)

**The mechanic:**

Maps alternate in a fixed sequence: **random map → voted map → random map → voted map**, repeating indefinitely. While a random map is being played, verified players can cast their vote for what the next voted map will be. By the time the random map ends, the vote is settled and the winning map plays immediately after. Then while the voted map runs, the next random map is already queued, and voting opens again for the one after.

This means:
- There is always an active vote in progress
- Voting happens during dead time — players are in a match, not staring at a vote screen
- Half of all maps are always random, regardless of votes — the game never feels fully controlled by a small verified group
- Verified players always know their vote will be acted on

**Winner selection rules:**
- The map with the most votes wins
- On any tie — including the case where every eligible map has zero votes — the winner is chosen randomly among all tied maps
- This means even a single vote is decisive if no other map matches it. A verified player's vote always matters. There is no fallback to "fully random" — zero votes across all maps is simply a tie among all of them, resolved randomly

**Map eligibility and cooldown:**
- All maps are eligible for voting by default
- Any map played in the last N cycles (random or voted) is placed on cooldown and excluded from the vote pool until the cooldown expires. The developer should propose a sensible N based on the total number of available maps — the goal is to prevent the same popular maps from dominating every vote while still allowing them to recur over a reasonable time window

**Where voting appears:**
- A small voting panel visible to verified players during the spawn phase and early match phase of random maps
- Shows the eligible maps with current vote counts
- Non-verified players can see the vote panel and current standings but cannot cast a vote — this makes the verified tier visibly meaningful to players who haven't purchased it yet

**What "done" looks like:**
- The random/voted alternation sequence is running in production
- Verified players can cast one vote per voting cycle
- Vote results are correctly determining the next voted map
- Tiebreaking is random among tied maps
- Recently played maps are excluded from the pool via cooldown
- Non-verified players can see the vote panel but the vote button is disabled with a clear explanation

**Architectural note:** the voting system needs to know which players are verified. This relies on the verified player status introduced in Task 8. Coordinate with Task 8's data model to ensure verified status is queryable server-side at the time votes are cast.

---

### 13. Replay Access as Premium Feature
**Effort:** 3–5 days
**Experiments:** ❌ Excluded — depends on Task 11's tier and pricing system. Introducing two parallel pricing models during an experiment creates fairness and support issues. Ship alongside or after Task 11.

The replay system is fully built. Extended replay history is a natural premium feature for competitive players.

Design:
- Free tier: last 3 matches
- Premium tier: last 20+ matches, shareable replay links
- Requires the premium account / tier concept from Task 11 to be defined first

---

### 15. Custom Uploaded Flags & Patterns — Paid Citizens Only
**Effort:** 2–3 weeks
**Experiments:** ❌ Excluded — paid feature with moderation overhead; running two parallel pricing models creates fairness and support complexity.

**Depends on:** Tasks 9 and 9a (existing flags and patterns must be live first to establish cosmetic purchase baseline), Task 8 (citizenship and payment infrastructure)

Paid citizens can upload their own custom flag or territory pattern, making their in-match appearance completely unique. This is the highest tier of visual customization — no other player can have the same look.

**Why paid-citizen only:** custom uploads require manual moderation before appearing in matches. The moderation cost per submission only makes sense for players who have already demonstrated financial commitment. Earned citizens are not eligible.

**Moderation is the critical design decision — choose one approach before implementation begins:**

- **Manual review** (same queue as nickname changes): safe, no third-party dependency, but creates operational burden at scale. Acceptable for V1 at current player counts.
- **Automated content screening API** (e.g. AWS Rekognition, Google Vision SafeSearch): scales better, adds cost (~$1–2 per 1,000 images) and integration work. Recommended if upload volume grows.

Either way: uploaded images must not appear in any match until they have passed review. A player submits their image, sees a "pending review" status, and receives a personal inbox notification (Task 8d) when it is approved or rejected.

**Yandex platform rules:** images must comply with Yandex Games content policies. Rejection reasons must be communicated clearly. Refund policy for rejected uploads must be defined before launch.

**Pricing:** 199–399 rubles per custom upload. Higher price than standard cosmetics — signals exclusivity and offsets moderation cost. The price also naturally limits submission volume, which keeps the manual review queue manageable.

**Technical scope:**
- Image upload endpoint with file size and format validation (PNG/JPG, max dimensions, reasonable file size cap)
- S3 storage for uploaded images
- Admin moderation queue (approve/reject with reason, automatic player notification via Task 8d inbox)
- Integration with existing cosmetics rendering — uploaded patterns need to fit within the existing `PatternDecoder` pipeline or a new rendering path
- The uploaded image must tile or fit correctly as a territory pattern — provide clear upload guidelines to players (recommended dimensions, aspect ratio, how it will appear on territory)

**Scope for V1:** custom flags only, or custom patterns only — do not attempt both simultaneously. Flags are simpler (small icon, less rendering complexity). Patterns are more visually impactful but more technically involved. Recommend starting with flags.

---