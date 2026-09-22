# Sprint 5 — Full F2P Loop & Social Features

**Date**: 2026-04-16
**Status**: proposed

> # ➡️ FIVE REAL TASKS WERE MOVED ONTO THIS BOARD ON 2026-09-22
>
> **The board is 12 rows now, was 7. Every row still reads `🔲 Backlog` and this board is still NOT the
> active sprint** — moving work here **schedules** it, it does not start it.
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
- [[decisions/sprint-6]] — next planned sprint, focused on map content after monetization foundations
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
