# Sprint 9 *(no theme name yet)*

**Date**: 2026-10-16
**Status**: proposed *(page-type field, kept while the sprint is open; the board is **`🔄 In progress — 2026-10-16`** — started by owner ruling *"Start it now (Recommended)"*; was ~~`🔲 Backlog — 2026-10-16` — created, NOT started~~)*

> 🆕 **2026-10-28, second sync (`2aa3cefb`) — 44 ROWS — 31 `✅ Done` · 4 `⛔ Cancelled` · 6 `🔲 Backlog` · 3 `➡️ Moved`;
> 6 OPEN** (`0497`, `0504`, `0513`, `0516`, `0518`, `0519`; counted by me by each row's leading status glyph; was 42 / 7).
> Every close is **agent-closed — not owner-verified**, by a spawned `fkit-producer` at the CLOSE step of
> `/fkit-sprint-ship-loop` (driven by `fkit-lead`). Still **no theme name and no goal**.
>
> | Rank | Task | Status (2026-10-28) | Vault |
> |---|---|---|---|
> | 19 | `0234` Leaderboard Core System — definition investigation | ✅ findings FINAL; S0–S6 not briefed | [[tasks/leaderboard-core-system-definition]] |
> | 36 | `0509` player's Yandex id in the feedback message | ✅ committed `2aa3cefb`, **not deployed** | [[tasks/feedback-message-player-yandex-id]] |
> | 41 | `0515` Humans Vs Nations out of the public rotation | ✅ committed `2aa3cefb`, **not deployed** | [[tasks/disable-humans-vs-nations-public]] |
> | 43 | `0518` verify `0509` live | 🔲 Backlog — 🆕 filed 2026-10-28 | — (backlog brief, not ingested) |
> | 44 | `0519` verify `0515` live | 🔲 Backlog — 🆕 filed 2026-10-28 | — (backlog brief, not ingested) |
>
> - `0518`/`0519` placed on Sprint 9 by OWNER RULING **"Sprint 9, at the end (Recommended)"** (relayed; ⛔ not producer
>   precedent) — overrides the next-sprint verify rule for them, as with `0513`. Knock-on: **Sprint 9 cannot close until
>   the next game deploy happens or they move on.** Ranks 43/44 are append rank, flagged.
> - ⚠️ **Stated by the producer, not resolved:** both carry a held-deploy caveat (a game deploy from `dev` also ships held
>   `0488`/`0494`/`0495` client code). The 2026-10-27 deploys (below) already carried those, so the caveat **may be out
>   of date** — not checked by the producer, and not re-checked by this sync beyond the 2026-10-28 tag read below.
> - `git tag --contains 2aa3cefb` → **none** (newest tags `0.0.167`, `0.0.166`): `0509` and `0515` are committed, not
>   deployed.

> 🆕 **2026-10-28 sync (`7a2ef92`) — 42 ROWS — 28 `✅ Done` · 4 `⛔ Cancelled` · 7 `🔲 Backlog` · 3 `➡️ Moved`; 7 OPEN**
> (`0234`, `0497`, `0504`, `0509`, `0513`, `0515`, `0516`; counted by me by each row's leading status glyph; was 40 / 11).
> Every close and cancel is **agent-closed — not owner-verified**, by a spawned `fkit-producer` on rulings relayed by
> `fkit-lead`. Still **no theme name and no goal**.
>
> | Rank | Task | Status (2026-10-28) | Vault |
> |---|---|---|---|
> | 8 | `0455` private-lobby funnels + dashboard in GameAnalytics | ✅ 2026-10-28 — owner: *"I looked at them, we're good here"* | [[tasks/private-lobby-gameanalytics-funnel]] |
> | 22 | `0493` B1v verify `0492` live | ⛔ 2026-10-28 — replaced by `0516` | [[tasks/purchase-grant-registry-live-check]] |
> | 27 | `0498` B5 verify `0495` live | ⛔ 2026-10-28 — replaced by `0516` (payment opened with no second tap) | [[tasks/guest-log-in-and-buy-live-check]] |
> | 28 | `0499` verify `0491` + `0488` live | ⛔ 2026-10-28 — replaced by `0516` (offer showed, XP doubled) | [[tasks/rewarded-video-live-check]] |
> | 38 | `0511` S1v verify `0506` live | ✅ 2026-10-28 — *"Close, accept 2 as unproven (Recommended)"* | [[tasks/stop-consuming-profile-box-live-check]] |
> | 39 | `0512` S2v | ⛔ 2026-10-28 — replaced by `0516`; pre-release T3 gate skipped, T3 passed live | [[tasks/stop-consuming-client-live-check]] |
> | 41 | `0515` disable the "Humans Vs Nations" team mode | 🔲 Backlog — 🆕 filed 2026-10-27 (owner request) | — (backlog brief, not ingested) |
> | 42 | `0516` verify the 2026-10-27 deploys through GameAnalytics metrics | 🔲 Backlog — 🆕 filed 2026-10-28; ⏳ **not workable before 2026-11-03** | — (backlog brief, not ingested) |
>
> - 🚀 **Deploys 2026-10-27** (owner-run; versions read 2026-10-28 by `0511`): profile box **`0.0.165-profile.1`**, then
>   live game **`0.0.167`** (a `0.0.166` bump came minutes before). `git tag --contains` includes `a3c32b4`, `4e9160a`,
>   `e3950e6`, `baaf2f8`, `f7ce268`, `cc52296`, `962f427`, `5f93b96` ⇒ every "committed, **not deployed**" row in the
>   notes below (`0470`, `0488`, `0491`, `0492`, `0494`, `0495`, `0496`, `0503`, `0506`, `0507`, `0510`) is now
>   **deployed**; those cells are history.
> - **Owner rulings 2026-10-28** (relayed): *"cancel the verification by hand task, brief a task to verify it by metrics
>   after some amount of time (e.g. by checking the GameAnalytics metrics)"* → **"The 4 purchase ones (Recommended)"**
>   (cancel `0493`, `0498`, `0499`, `0512`; their server-side read-only steps → `0511` steps 8–12), **"1 week, ~3 Nov"**,
>   **"Sprint 9 (Recommended)"** — knock-on: **Sprint 9 cannot close until `0516`'s read date.**
> - ⚠️ **Ranks 41 and 42 are append rank, flagged** for owner confirmation (ADR-035): on merit `0515` belongs directly below
>   `0509`, `0516` directly below `0511`. ⚠️ `0516` carries an **open owner question**: what happens when a check has too
>   little data.
> - `0517` (the profile box served requests before its migrations finished) went to the **Backlog board**, not here —
>   [[decisions/sprint-backlog]].
> - `0515` touches open Backlog work: `0205` (its fix covers every Team config, HvN included) and `0476` (hypothesis H4 is
>   an HvN loss) — its plan must state the effect on each.

> 🚨 **2026-10-27 sync (`5f93b96`) — 40 ROWS — 26 `✅ Done` · 1 `🔄 In progress` · 10 `🔲 Backlog` · 3 `➡️ Moved`; 11
> OPEN** (counted by me by each row's leading status glyph; was 28 / 6). Twelve rows (ranks 29–40, `0502`–`0513`) were
> added **out of band** on 2026-10-26/27 for a **live player incident** —
> [[decisions/incident-2026-10-25-lost-citizenship-player-id-change]] — on the owner's ruling **"Merge tool + stop
> consuming"** (relayed by `fkit-lead`). Every rank is **append rank, flagged** for owner confirmation (ADR-035). Every
> close is **agent-closed — not owner-verified**. Still **no theme name and no goal**.
>
> | Rank | Task | Status (2026-10-27) | Vault |
> |---|---|---|---|
> | 29 | `0502` read-only checks: the two-record cause | ✅ 2026-10-27 — outcome **(A)**, three profiles | [[tasks/lost-citizenship-cause-checks]] |
> | 30 | `0503` owner-run profile merge tool | ✅ 2026-10-27 — committed `962f427`, **not deployed** | [[tasks/profile-merge-tool]] |
> | 31 | `0504` restore the affected player with the merge tool | 🔲 Backlog — waits on Yandex's answer | [[decisions/incident-2026-10-25-lost-citizenship-player-id-change]] |
> | 32 | `0505` design + ADR: stop consuming | ✅ 2026-10-26 — ADR-126 accepted | [[tasks/stop-consuming-design]] |
> | 33 | `0506` S1 profile box | ✅ 2026-10-26 — committed `baaf2f8`, **not deployed** | [[tasks/stop-consuming-profile-box-s1]] |
> | 34 | `0507` one-player message popup | ✅ 2026-10-26 — committed `baaf2f8`, **not deployed** | [[tasks/one-player-message-popup]] |
> | 35 | `0508` message to Yandex Games | ✅ 2026-10-27 — sent; answer pending | [[tasks/yandex-player-id-change-message]] |
> | 36 | `0509` stable player id in feedback | 🔲 Backlog | [[decisions/incident-2026-10-25-lost-citizenship-player-id-change]] |
> | 37 | `0510` S2 client | ✅ 2026-10-26 — committed `f7ce268`, **not deployed** | [[tasks/stop-consuming-client-s2]] |
> | 38 | `0511` S1v verify `0506` live | 🔲 Backlog | [[tasks/stop-consuming-profile-box-s1]] |
> | 39 | `0512` S2v: T1–T3 on the Yandex test copy (T3 blocks the game deploy), then live | 🔲 Backlog | [[tasks/stop-consuming-client-s2]] |
> | 40 | `0513` verify `0507` live | 🔲 Backlog | [[tasks/one-player-message-popup]] |
>
> - **Unchanged since the previous sync:** `0455` 🔄; `0234`, `0493`, `0497`, `0498`, `0499` 🔲. **Deploy hold** (owner,
>   *"Hold it"*, 2026-10-26): the committed purchase-flow code (`0491`/`0492`/`0494`/`0495`/`0496`/`0488`) now ships
>   **with** S1/S2; `0493`, `0497`, `0498`, `0499` gained `0506` (and the last three `0510`) as dependencies.
> - **Deploy order** ([[decisions/adr-127-consume-switch-source-setting]]): profile box (held code + `0506` + `0503`,
>   migrations `009`–`012`) to the **live** box first → `0511` → `0512` part (a) → the game deploy (`0510`, `0507`, held
>   client code). `git tag --contains` → **none** for `baaf2f8`, `f7ce268`, `cc52296`, `962f427`, `5f93b96` (checked
>   2026-10-27; newest tags game `0.0.165`, profile `0.0.164-profile.2`).
> - ⚠️ `0502` closed with checks 3 and 6 in substance only and check 8 skipped, on `fkit-lead`'s instruction — not an
>   owner ruling. Its check 7 was run after the close (counts only).

> 🆕 **2026-10-26 (latest, `4e9160a`) — 28 ROWS — 19 `✅ Done` · 1 `🔄 In progress` · 5 `🔲 Backlog` · 3 `➡️ Moved`; 6
> OPEN** (counted by me by each row's leading status glyph; was 9 / 9). Every close is **agent-closed — not
> owner-verified**. Still the only sprint in progress; **still no theme name and no goal** (the owner's to set). The
> ship loop (`/fkit-sprint-ship-loop`, driven by `fkit-lead`) ran most of this.
>
> | Rank | Task | Status (2026-10-26) | Vault |
> |---|---|---|---|
> | 1 | `0385` verify `0384` on the profile box | ✅ 2026-10-20 | [[tasks/profile-postgres-digest-lock]] |
> | 2 | `0219` P4 operability on the profile box | ✅ 2026-10-20 | [[tasks/profile-p4-operability]] |
> | 3 | `0213` profile clean-slate epic | ✅ 2026-10-20 | [[tasks/profile-clean-slate-rebuild-epic]] |
> | 4 | `0452` verify `0442` (password login off) | ✅ 2026-10-24 | [[tasks/ssh-password-login-off]] |
> | 5 | `0449` verify `0443` (SSH alerts) | ✅ 2026-10-24 | [[tasks/ssh-security-alerts]] |
> | 6 | `0469` verify `0426` live (news in Yandex) | ✅ 2026-10-24 | [[tasks/news-catch-up-2026-10-17]] |
> | 7 | `0343` discussion: eight parked paid features | ✅ 2026-10-24 | [[tasks/parked-paid-features-discussion]] |
> | 8 | `0455` private-lobby funnel in GameAnalytics | 🔄 In progress (since 2026-10-24) | [[tasks/private-lobby-funnel-events]] |
> | 9 | `0470` news dates 17 Oct → 16 Oct | ✅ 2026-10-22 — committed `e3950e6`, **not deployed** | [[tasks/news-catch-up-2026-10-17]] |
> | 10 | `0475` rename the news skill | ✅ 2026-10-22 — committed `e3950e6` | [[tasks/update-announcements-skill-rename]] |
> | 11 | `0477` talk: nickname styling | ✅ 2026-10-24 — **File** | [[tasks/nickname-styling-talk]] |
> | 12 | `0478` talk: map voting | ➡️ Backlog board, **on hold** | [[decisions/sprint-backlog]] |
> | 13 | `0479` talk: clans | ✅ 2026-10-24 — **Park** | [[tasks/clans-talk]] |
> | 14 | `0480` talk: coins + rewarded ads | ➡️ Backlog board, **on hold** (rewarded ad split out as `0488`) | [[decisions/sprint-backlog]] |
> | 15 | `0481` talk: uploaded flags/patterns | ➡️ Backlog board, waits on `0010`/`0011` | [[decisions/sprint-backlog]] |
> | 16 | `0482` talk: leaderboard badges | ✅ 2026-10-24 — **Park** | [[tasks/leaderboard-badges-talk]] |
> | 17 | `0484` design the shared purchase flow | ✅ 2026-10-24 | [[tasks/shared-purchase-flow-design]] |
> | 18 | `0488` rewarded video (client) | ✅ 2026-10-25 — committed `a3c32b4`, **not deployed** | [[tasks/rewarded-video-double-match-xp]] |
> | 19 | `0234` investigation: leaderboard core system | 🔲 Backlog (moved in 2026-10-24) | [[tasks/leaderboard-badges-talk]] |
> | 20 | `0491` rewarded-ad XP route (profile box) | ✅ 2026-10-24 — committed `a3c32b4`, **not deployed** | [[tasks/rewarded-match-xp-grant-route]] |
> | 21 | `0492` B1 grant registry (profile box) | ✅ 2026-10-24 — committed `a3c32b4`, **not deployed** | [[tasks/purchase-grant-registry]] |
> | 22 | `0493` B1v verify `0492` live | 🔲 Backlog | [[tasks/purchase-grant-registry]] |
> | 23 | `0494` B2 client purchase core | ✅ 2026-10-25 — committed `a3c32b4`, **not deployed** | [[tasks/purchase-core-client]] |
> | 24 | `0495` B3 guest "Log in and buy" | ✅ 2026-10-26 — committed `4e9160a`, **not deployed** | [[tasks/guest-log-in-and-buy]] |
> | 25 | `0496` B4 durable items / entitlements | ✅ 2026-10-26 — committed `a3c32b4`, **not deployed** | [[tasks/durable-items-entitlements]] |
> | 26 | `0497` B4v verify `0496` live | 🔲 Backlog | [[tasks/durable-items-entitlements]] |
> | 27 | `0498` B5 verify `0495` live inside Yandex | 🔲 Backlog | [[tasks/guest-log-in-and-buy]] |
> | 28 | `0499` verify `0491` + `0488` live | 🔲 Backlog | [[tasks/rewarded-video-double-match-xp]] |
>
> - **What is left is mostly waiting on deploys.** `0493`, `0497`, `0498`, `0499` can only close after the profile-box
>   and game deploys of the builds above (weekend slots unless urgent; deploy order `0491` → B1/B4 on the profile box,
>   then the clients). **Owner ruling OD-4** put B1–B5 and their verify tasks on this sprint, overriding the usual
>   "verify at the top of the next sprint" rule **for these tasks only**. `git tag --contains` → **none** for `a3c32b4`,
>   `4e9160a` and `e3950e6` (checked by me) — the newest tags are game `0.0.165`, profile `0.0.164-profile.2`.
> - **Owner decisions taken on this board (2026-10-24):** one rule set for every purchase
>   ([[decisions/paid-items-purchase-rules]]); the shared purchase flow and **ADR-125**
>   ([[systems/shared-purchase-flow]], [[decisions/adr-125-log-in-and-buy-skips-reload]]); the rewarded ad (double match
>   XP, no cap, non-citizens and guests only) and the **ADR-112 amendment** ([[decisions/adr-112-free-xp-grants]]).
> - Rows 11–28 were added out of band 2026-10-22 … 25 at **append rank** (ADR-035), each flagged in its brief for owner
>   confirmation of rank. The older *Context* / *Decision* sections and the 2026-10-16 note below are history.

> 🆕 **2026-10-16 (latest, `29811f0`) — SPRINT 9 STARTED; 9 rows — 6 `🔲 Backlog` · 3 `🔄 In progress`; 9 OPEN**
> (counted by me by each row's leading status glyph; was 1 / 1). Owner rulings given live 2026-10-16 in a Claude Code
> session, relayed to spawned `fkit-producer`s (⛔ not producer precedent). **Now the only sprint in progress** —
> [[decisions/sprint-8]] closed the same day.
>
> | Rank | Task | Status | From | Vault |
> |---|---|---|---|---|
> | 1 | `0385` verify `0384` on the profile box | 🔲 Backlog — steps 1, 2, 3, 6 pass; only step 5 (next nightly backup marker, ~02:30Z 2026-10-17) left | Sprint 8 close | [[tasks/profile-postgres-digest-lock]] |
> | 2 | `0219` P4 operability on the profile box | 🔄 In progress — waits on `0385`, then the close-time V8/V9 | Sprint 8 close | [[systems/player-profile-store]] |
> | 3 | `0213` profile clean-slate rebuild epic | 🔲 Backlog | Sprint 8 close | [[systems/player-profile-store]] |
> | 4 | `0452` verify `0442` (password login off) | 🔄 In progress — game prod V2–V4 pass; V5 and the Q3 switch removal left | Sprint 8 close | [[tasks/ssh-password-login-off]] |
> | 5 | `0449` verify `0443` (SSH alerts) | 🔄 In progress — steps 4–5 pass on all four boxes; digest 2 of 2 and two windows left | Sprint 8 close | [[tasks/ssh-security-alerts]] |
> | 6 | `0469` verify `0426` live (news in Yandex, Russian) | 🔲 Backlog (was rank 1) | Backlog board | [[tasks/news-catch-up-2026-10-17]] |
> | 7 | `0343` discussion: parked paid-citizenship features | 🔲 Backlog (appended at 2, owner-confirmed *"Keep slot 2"*) | Sprint 8 | — |
> | 8 | `0455` private-lobby funnel in GameAnalytics | 🔲 Backlog (appended at 3, owner-confirmed *"Keep slot 3"*); needs several days of data after `0451`'s deploy | Sprint 8 | [[tasks/private-lobby-funnel-events]] |
> | 9 | `0470` fix the two newest news dates 17 Oct → 16 Oct | 🔲 Backlog (new; owner-confirmed *"Keep slot 9"*) | new | [[tasks/news-catch-up-2026-10-17]] |
>
> - **`0470`** (new open brief — summary only, no task page): the 2026-10-16 mid-week deploy put the news live a day
>   early, so both entries show 17 Oct. Change only the two `date` fields to `2026-10-16`; **keep the ids** — owner
>   ruling *"Keep the ids (Recommended)"* (renaming them would make the news show as unread again to everyone who opened
>   it). Owner: *"no need to be hurry with it"*; ships with the next game deploy.
> - ⚠️ Ranks 6–8 were renumbered (1→6, 2→7, 3→8) by the owner-ruled *"At the top"* order — recorded on the board as a
>   placement, not a merit change.
> - ⚠️ **Still no theme name, no goal, no scope** — the owner's to set. The *Context* / *Decision* sections below
>   describe the board as created (1 row, not started) and are history.

> Source: `ai-agents/sprints/plan-sprint-9.md` (and its row in `ai-agents/sprints/plan-index.md`).

## Context

On 2026-10-16 `0426`'s live check, **`0469`**, was filed on the Backlog board because no Sprint 9 board existed. The
owner's standing build/verify-split rule (2026-09-29) puts a verify task at the top of the **next** sprint. Asked where
it should go — noting that the check itself runs on Saturday 2026-10-17, inside Sprint 8 — the owner answered in free
text, verbatim: ***"Create Sprint 9 board and move the task there"*** (relayed by `fkit-lead` to a spawned
`fkit-producer`; ⛔ not producer precedent).

## Decision

- The Sprint 9 board was created, **not started** (line-3 banner `🔲 Backlog — 2026-10-16`).
  [[decisions/sprint-8]] stays the only `🔄 In progress` sprint.
- **1 row, 1 open:** `0469` — *Verify `0426` live: the 2026-10-17 news entries show in Yandex (Russian) after the
  weekend game prod deploy* — `🔲 Backlog`, rank 1. Moved in from [[decisions/sprint-backlog]] (that row is kept as
  `➡️ Moved`). Owner executes inside Yandex Games, a producer records; includes a check that the release tag contains the
  `0426` commit. See [[tasks/news-catch-up-2026-10-17]].
- ⚠️ **No theme name, no goal, no scope** — all the owner's to set; the producer invented none.

## Consequences

- ⚠️ **Timing oddity, stated by the board, not resolved:** `0469` runs on deploy day while Sprint 8 is still active.
  The owner chose this knowing it; doing it before Sprint 9 starts is not drift.
- Other verify tasks already flagged "top of Sprint 9" — `0460`, `0461`, `0463` — are **still on the Backlog board**;
  the owner's ruling moved only `0469`. Whether they follow is not recorded.

## Related

- [[decisions/sprint-8]] — the active sprint, whose final deploy `0469` checks
- [[decisions/sprint-backlog]] — where `0469` was filed, and where `0460`/`0461`/`0463` still wait
- [[tasks/news-catch-up-2026-10-17]] — task `0426`, the build `0469` verifies
- [[decisions/product-strategy]] — `plan-index.md`, which lists this board
- [[decisions/adr-108-active-sprint-pointer]] — the active-sprint rule; this board is not active
- [[systems/weekend-deploy-window]] — the game prod deploy `0469` checks (went out mid-week, 2026-10-16, `0.0.165`)
- [[tasks/profile-postgres-digest-lock]] — task `0384`, verified by `0385` (rank 1)
- [[systems/player-profile-store]] — `0219` (2) and epic `0213` (3)
- [[tasks/ssh-password-login-off]] — task `0442`, verified by `0452` (4)
- [[tasks/ssh-security-alerts]] — task `0443`, verified by `0449` (5)
- [[tasks/private-lobby-funnel-events]] — task `0451`, whose funnel `0455` (8) builds
- [[tasks/profile-p4-operability]] — `0219` (rank 2), closed 2026-10-20
- [[tasks/profile-clean-slate-rebuild-epic]] — `0213` (rank 3), closed 2026-10-20
- [[tasks/parked-paid-features-discussion]] — `0343` (rank 7)
- [[tasks/update-announcements-skill-rename]] — `0475` (rank 10)
- [[tasks/nickname-styling-talk]] — `0477` (rank 11)
- [[tasks/clans-talk]] — `0479` (rank 13)
- [[tasks/leaderboard-badges-talk]] — `0482` (rank 16); moved `0234` in at 19
- [[tasks/shared-purchase-flow-design]] — `0484` (rank 17)
- [[tasks/rewarded-video-double-match-xp]] — `0488` (rank 18); live check `0499` (28)
- [[tasks/rewarded-match-xp-grant-route]] — `0491` (rank 20)
- [[tasks/purchase-grant-registry]] — `0492` B1 (rank 21); `0493` B1v (22)
- [[tasks/purchase-core-client]] — `0494` B2 (rank 23)
- [[tasks/guest-log-in-and-buy]] — `0495` B3 (rank 24); `0498` B5 (27)
- [[tasks/durable-items-entitlements]] — `0496` B4 (rank 25); `0497` B4v (26)
- [[systems/shared-purchase-flow]] — what B1–B5 build
- [[decisions/adr-125-log-in-and-buy-skips-reload]] — recorded during `0484`
- [[decisions/paid-items-purchase-rules]] — ruled during the `0343` / `0477` talks
- [[decisions/adr-112-free-xp-grants]] — amended 2026-10-24 for the rewarded-ad bonus
- [[decisions/incident-2026-10-25-lost-citizenship-player-id-change]] — 2026-10-27: the live player incident behind ranks 29–40
- [[decisions/adr-126-permanent-purchases-not-consumed]] · [[decisions/adr-127-consume-switch-source-setting]] · [[decisions/adr-128-owner-run-profile-merge]] — the three ADRs recorded inside this sprint (2026-10-26/27)
- [[tasks/lost-citizenship-cause-checks]] · [[tasks/profile-merge-tool]] · [[tasks/stop-consuming-design]] · [[tasks/stop-consuming-profile-box-s1]] · [[tasks/one-player-message-popup]] · [[tasks/yandex-player-id-change-message]] · [[tasks/stop-consuming-client-s2]] — tasks `0502`, `0503`, `0505`, `0506`, `0507`, `0508`, `0510`
- [[tasks/leaderboard-core-system-definition]] — `0234` (rank 19), closed 2026-10-28: findings FINAL, slices S0–S6 not briefed
- [[tasks/feedback-message-player-yandex-id]] — `0509` (rank 36), closed 2026-10-28; live check `0518` (43)
- [[tasks/disable-humans-vs-nations-public]] — `0515` (rank 41), closed 2026-10-28; live check `0519` (44)
