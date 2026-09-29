# Geoconflict — Sprint 6 — Full F2P Loop & Social Features *(renamed 2026-09-26, owner ruling; was ~~More Content~~)*

> ## 🔄 In progress — 2026-09-26.

> # ~~⛔ THIS IS NOT THE ACTIVE SPRINT — it is PRE-SCOPED, not in work~~ *(struck 2026-09-26 — Sprint 6 started that day; see the 🔄 note directly below)*
>
> 🔄 **2026-09-26 — SPRINT 6 IS IN PROGRESS** (line-3 banner now `🔄 In progress — 2026-09-26`; was
> `🔲 Backlog — 2026-09-23`). **OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on
> 2026-09-26, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not
> producer precedent.** Question: *"No sprint is active. Should Sprint 6 be started so the loop can ship it?"*
> — answer: **"Start Sprint 6, then drive (Recommended)"** — *"A producer marks Sprint 6 'In progress' (dated
> today, with your ruling). Then I drive it starting at 0307: you approve each task's plan before any code is
> written."* This ruling **supersedes** an earlier same-day attempt to start Sprint 6 that the owner stopped
> before anything was written, and it supersedes the *"not started … stays `🔲 Backlog`"* notes struck below.
> Only the banner changed: no row status, rank or order was touched, no brief was edited, no mover was run.
>
> ~~**Owner ruling 2026-09-07, verbatim:** *"The active sprint is the Sprint 4!"* →
> [`plan-sprint-4.md`](done/plan-sprint-4.md).~~ *(history — Sprint 4 is closed)*
>
> ~~📌 **2026-09-26 — the active sprint is [Sprint 5](done/plan-sprint-5.md)**, started that day on an owner ruling
> (its line-3 banner reads `🔄 In progress`).~~ ~~This board stays `🔲 Backlog`.~~ *(Struck 2026-09-26, not
> deleted — true until Sprint 5 closed the same day; the trailing sentence struck later that day when
> Sprint 6 started.)*
>
> ~~📌 **2026-09-26, later — NO SPRINT IS ACTIVE.** [Sprint 5](done/plan-sprint-5.md) was closed that day by
> `/fkit-sprint-done` *(agent-closed — not owner-verified)*; its line-3 banner reads `✅ Done — 2026-09-26`.
> This board is still pre-scoped and **not started** (owner ruling) — it stays `🔲 Backlog`. Checked
> 2026-09-26: `dashboard.sh select-active` reports `active none`. *(Correction recorded 2026-09-26 at the
> owner's request, relayed by `fkit-lead` to a spawned `fkit-producer`.)*~~ *(Struck 2026-09-26, not
> deleted — true until Sprint 6 was started later the same day; see the 🔄 note above. The Sprint 5 close it
> records still stands.)*
>
> ~~🚨 **If a tool told you this board was active, the tool is wrong and this is the known reason.**
> `dashboard.sh select-active` picks the **highest** open sprint identity, and this is it — so an
> empty-argument `/fkit-status` or `/fkit-sprint-ship-loop` lands here **silently**. Recorded in
> [ADR-108](../knowledge-base/decisions/adr-108-owner-set-active-sprint-pointer.md); the interim
> workaround is to ask by name: `/fkit-status Sprint 4`.~~
>
> ⚠️ **This board is legitimately open and nothing here is being archived.** Pre-scoping future
> sprints is the intended workflow~~; it is the selector that cannot read owner intent~~.
>
> 📌 **SUPERSEDED 2026-09-23 (owner ruling) — the struck text above is no longer true.** It is
> superseded by the line-3 status banners, which the selector reads. Struck, not deleted — it was true
> when written.

> See [plan-index.md](plan-index.md) for strategic logic, experiments policy, and full priority table.

---

## Sprint 6 Goal

Expand game content with historical and thematic maps. Convert engaged free-tier players into paid users through map packs. Build on the payment infrastructure established in Sprint 4.

📌 **2026-09-26 — OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on 2026-09-26, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021); ⛔ not producer precedent: this sprint now ALSO carries the 16 rows moved out of [Sprint 5](done/plan-sprint-5.md).**
They are Sprint 5's seven brief-less F2P / social plan items (Leaderboard Rewards, Nickname Styling, Coin Economy,
Clans, Map Voting, Replay Access, Custom Uploaded Flags & Patterns) and nine briefed tasks not needed for the
profile/citizenship launch (`0285`, `0289`, `0030`, `0032`, `0213`, `0219`, `0221`, `0286`, `0298`). The map-content
goal above is unchanged; it is no longer the only thing on this board. See the 2026-09-26 addendum under the status table.

📌 **2026-09-26 — SPRINT 6 RENAMED. OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on 2026-09-26, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021); ⛔ not producer precedent.** Asked whether to rename [Sprint 5](done/plan-sprint-5.md), the owner
answered, verbatim: *"Rename it, but use the current name for the Sprint 6"*.
- **Effect:** this board's title is now **Full F2P Loop & Social Features** — Sprint 5's former title. The
  previous title, *More Content*, is kept in the H1, struck — not deleted (ADR-035).
- ⚠️ **READING, open to owner correction:** the producer read the ruling as **REPLACE** ("More Content" is
  dropped), not **COMBINE** (e.g. "More Content, Full F2P Loop & Social Features"). The owner said to *use*
  the name, not to *add* it. If COMBINE was meant, only the H1 and the `plan-index.md` row change.
- ⚠️ **The title no longer names the map work, but the map goal above is unchanged and still on this
  board** (Tasks 1 and 2, `0027`). A title change is not a scope change.
- **Sprint identity is unchanged: `Sprint 6`**, and the line-3 banner still reads `🔲 Backlog`.

**Dependencies:** Sprint 4 (payment infrastructure, citizenship) must ship first. Paid map packs require the Yandex catalog and purchase flow to be in place.

⚠️ **Corrected 2026-08-09 — this previously read "and Sprint 5 (cosmetics store)". There is no cosmetics store.** The purchasable-cosmetics foundation is **Task 9 (re-enable flags)** and **Task 9a (territory patterns)**, which `plan-index.md:87-88` assigns to Sprint 4 but which appear in **no** sprint plan document — both currently sit unsprinted on [`sprint-backlog.md`](sprint-backlog.md), blocked on payment infrastructure. Sprint 5's own cosmetics item (Task 15, Custom Uploaded Flags & Patterns) *also* depends on 9 and 9a (`plan-sprint-5.md:150`). So the real prerequisite for paid map packs is **Tasks 9/9a, which are not scheduled anywhere.**

⚠️ **A further prerequisite surfaced 2026-08-09:** cosmetic entitlements (`flares`) currently come from the **upstream OpenFront API**, not Geoconflict's own infrastructure — see task `0009` and `adr-102`. Selling anything gated by `PrivilegeChecker` likely requires that to move first.

---

## Status

> Reconciled 2026-08-14 to the canonical status vocabulary and table shape (task `0004` scope,
> owner-ruled). ⚠️ The brief files `s3-5b-task-server-restart-ux.md` and
> `s3-5c-task-mobile-warning.md` exist **nowhere in the repo** — dangling since the FKIT migration.
> Their content survives in the archived [`done/plan-sprint-3.md`](done/plan-sprint-3.md) task
> sections (5b at :100, 5c at :80) and in this plan's own sections below. Whether to author fresh
> briefs or leave the rows brief-less until Sprint 6 scoping is an open owner decision (raised in the
> 2026-08-14 reconciliation hand-off). The two map-task briefs are `TBD` **by design** — deferred
> until Sprint 5 is underway (see Notes and `0027-new-maps-community-demand`).
>
> 📌 **2026-09-29 — ANSWERED (owner ruling, relayed by `fkit-lead`).** The 11 brief-less rows — 5b, 5c, the two map tasks and the seven rows moved in from Sprint 5 — were replaced by two **discussion** briefs, [`0342`](../tasks/backlog/0342-discussion-parked-features-not-tied-to-paid-citizenship/brief.md) (Backlog board) and [`0343`](../tasks/backlog/0343-discussion-parked-features-tied-to-paid-citizenship/brief.md) ([Sprint 8](plan-sprint-8.md)), with the 5b/5c prose copied verbatim into `0342`. The text above is kept as written. See the 2026-09-29 **brief-less rows** addendum below the table.

| Status | Priority | Task | Brief |
|---|---|---|---|
| ✅ Done (agent-closed — not owner-verified) | 1 *(was ~~22~~, append rank — owner re-rank 2026-09-26)* | **Security review of every player-name path — can a name inject code (SQL, HTML, Telegram, shell, logs)?** *(🆕 **FILED 2026-09-26** by a spawned `fkit-producer` with no owner channel (ADR-021), on an owner request relayed by `fkit-lead`; the owner called it *"important"*. Maps every hop a name travels, a hostile `fkit-adversarial-reviewer` pass, fixes, hostile-input tests, `fkit-reviewer` over the fixes. ~~⚠️ Append rank, not merit — see the addendum below.~~ ✅ **Rank OWNER-RULED 2026-09-26** — see the **RE-RANK 2026-09-26** addendum below.)* | [`0307-security-review-of-every-player-name-path-injection-and-validation`](../tasks/done/0307-security-review-of-every-player-name-path-injection-and-validation/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | 2 *(was ~~20~~, append rank — owner re-rank 2026-09-26)* | **Private lobbies as a citizen perk — shown LOCKED to non-citizens, tap opens the explainer** *(🆕 **FILED 2026-09-26**, same request as `0301`, split out of it; ~~depends on `0301` and on an owner decision.~~ ✅ **Perk APPROVED by owner ruling 2026-09-26 as proposed (citizens create; non-citizens see it locked; joining a friend's lobby by invite stays free)**, and ranked ABOVE `0301` — so it no longer depends on `0301`; ~~what the locked tap opens before `0301` ships is an open owner question (re-rank addendum below).~~ ✅ **SETTLED — owner ruling 2026-09-26** (struck 2026-09-27, owner ruling relayed by `fkit-lead`): a temporary "citizens only" popup with no buy button, removed by `0301` — recorded in [`0302`'s plan](../tasks/done/0302-private-lobby-as-a-locked-citizen-perk/plan.md). ~~⚠️ Append rank, not merit — see the addendum below.~~ ✅ **Rank OWNER-RULED 2026-09-26** — see the **RE-RANK 2026-09-26** addendum below. 🚢 **Ships in the SAME deploy as `0301`** (owner ruling 2026-09-26, second re-rank addendum below).)* | [`0302-private-lobby-as-a-locked-citizen-perk`](../tasks/done/0302-private-lobby-as-a-locked-citizen-perk/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | 3 *(was ~~27~~, append rank — owner re-rank 2026-09-26, third)* | **Name change: a working, documented operator command to approve AND reject a request** *(🆕 **FILED 2026-09-26** by a spawned `fkit-producer` with no owner channel (ADR-021), on OWNER RULINGS given live in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead` (finding chosen + *"Sprint 6, bottom"*). The Telegram `curl` gets 403 from the operator's Mac (`/internal/` allowlist, `0276`) and there is no Reject command; build a profile-box command/script, token never printed, runbook entry. Coordinate with `0307` (same command, shell-injection surface). ~~⚠️ Append rank, not merit — see the addendum below.~~ ✅ **Rank OWNER-RULED 2026-09-26** — see the **RE-RANK 2026-09-26, THIRD** addendum below.)* | [`0312-name-change-a-working-documented-operator-decide-command-approve-and-reject`](../tasks/done/0312-name-change-a-working-documented-operator-decide-command-approve-and-reject/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | 4 *(was ~~28~~, append rank — owner re-rank 2026-09-26, third)* | **Name change: a genuinely new request after a decision or withdraw must still reach the operator** *(🆕 **FILED 2026-09-26** by a spawned `fkit-producer` with no owner channel (ADR-021), on OWNER RULINGS given live in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead` (finding chosen + *"Sprint 6, bottom"*). The in-memory 10-minute per-player notify cooldown swallowed a real new request after an approve (live, 2026-09-26). Owner picks the rule; recommended: a decision clears the slot, withdraw does not. ~~⚠️ Append rank, not merit — see the addendum below.~~ ✅ **Rank OWNER-RULED 2026-09-26** — see the **RE-RANK 2026-09-26, THIRD** addendum below.)* | [`0313-name-change-a-new-request-after-a-decision-or-withdraw-must-reach-the-operator`](../tasks/done/0313-name-change-a-new-request-after-a-decision-or-withdraw-must-reach-the-operator/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | 5 *(was ~~30~~, append rank — owner re-rank 2026-09-26, third)* | **Name change: the daily digest lists the pending requests, not just how many there are** *(🆕 **FILED 2026-09-26** by a spawned `fkit-producer` with no owner channel (ADR-021), on OWNER RULINGS given live in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead` (finding chosen + *"Sprint 6, bottom"*). Optional — the owner says yes/no first. Extends the `0283` digest; recommended: list id, name, age, capped at 20. ~~⚠️ Append rank, not merit — see the addendum below.~~ ✅ **Rank OWNER-RULED 2026-09-26** — see the **RE-RANK 2026-09-26, THIRD** addendum below. ~~⚠️ The rank does **not** answer whether to do it at all — that yes/no is still the owner's.~~ ✅ **DO IT — OWNER-RULED 2026-09-26:** *"Keep it"* (stays at rank 5 as extra safety) — see the **RE-RANK 2026-09-26, FOURTH** addendum below.)* | [`0315-name-change-daily-digest-lists-the-pending-requests-not-just-the-count`](../tasks/done/0315-name-change-daily-digest-lists-the-pending-requests-not-just-the-count/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | 7 *(was ~~29~~, append rank — owner re-rank 2026-09-26, third)* | **Name change: the "rejected" state sticks on the card, and a name can never be cleared — decide and fix** *(🆕 **FILED 2026-09-26** by a spawned `fkit-producer` with no owner channel (ADR-021), on OWNER RULINGS given live in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead` (finding chosen + *"Sprint 6, bottom"*). Owner decides: let the player dismiss the rejected notice; add an operator "clear name" action (today only hand SQL can reset `display_name` to none). ~~⚠️ Append rank, not merit — see the addendum below.~~ ✅ **Rank OWNER-RULED 2026-09-26** — see the **RE-RANK 2026-09-26, THIRD** addendum below.)* | [`0314-name-change-rejected-state-sticks-on-the-card-and-no-way-to-clear-a-name-decide-and-fix`](../tasks/done/0314-name-change-rejected-state-sticks-on-the-card-and-no-way-to-clear-a-name-decide-and-fix/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | 8 *(was ~~32~~, append rank — owner re-rank 2026-09-26, third)* | **Investigate: show a citizen's approved name in matches (the `0067`(b) follow-up)** *(🆕 **FILED 2026-09-26** by a spawned `fkit-producer` with no owner channel (ADR-021), on OWNER RULINGS given live in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead` (finding chosen + *"Sprint 6, bottom"*). The follow-up `0067`(b) ruled and nobody filed. Investigation first: identity/trust (impersonation via an unverified id, `0267`/`0250`), name rules (`0307`/`0308`), surfaces. Architect-owned, no code. ~~⚠️ Append rank, not merit — see the addendum below.~~ ✅ **Rank OWNER-RULED 2026-09-26** — see the **RE-RANK 2026-09-26, THIRD** addendum below.)* | [`0317-investigate-show-a-citizens-approved-name-in-matches`](../tasks/done/0317-investigate-show-a-citizens-approved-name-in-matches/brief.md) |
| 🚧 Blocked — slice S1 (leak fix) built + reviewed 2026-09-27, verdict *Ready to merge*; slice S3b waits on [`0340`](../tasks/backlog/0340-0325-s3a-enforce-mint-verified-sessions/brief.md) (verified sessions — `0325`'s slice S3a, split into its own task 2026-09-29; was ~~`0325`~~, which closed as the S2 build). Driven by `/fkit-sprint-ship-loop` (fkit-lead). **Deploy state (2026-09-29):** S1 is committed on `dev` in commit `68303d5` (2026-09-28; lead-verified — `src/profile-server/PublicProjection.ts` first appears there) and is **NOT deployed**. Per OWNER RULING 2026-09-29 (relayed by `fkit-lead`), it is queued for the **next weekend deploy slot** — deploys use weekend slots unless something urgent comes up. ⚠️ **Until S1 is deployed, the paid-state leak stays live.** | 9 *(was ~~4~~ after the second re-rank; arrived at append rank ~~25~~ — owner re-ranks of 2026-09-26)* | **Authenticated profile read — let a verified player see their own paid state, without leaking who paid** *(➡️ **MOVED IN FROM THE [Backlog board](backlog.md) ON 2026-09-26** — OWNER RULING given live in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021, ADR-037 §3); ⛔ not producer precedent. Owner, verbatim: *"Yes, above 0248 (Recommended)"*. Hard prerequisite of `0248` (paid-only ad-free). Carries the owner-ruled **MUST-FIX**: paid state can be worked out from the public profile today. Phase 1 is a design decision (`fkit-architect` consulted, owner rules the privacy posture). Status copied from the brief; nothing started.)* *(📌 **2026-09-27 — phase 1 DONE; owner ruled D1–D5** (live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer`; ADR-021/037). Owner now `fkit-coder`. Two slices: **S1** (the leak fix, all four leaks — D5) depends on nothing and ships first; **S3b** (the verified-only view, raw paid facts — D1) hard-depends on [`0325`](../tasks/done/0325-verified-login-check-yandex-signed-player-data-and-mint-verified-sessions/brief.md). Status unchanged. See the **0325 FILED 2026-09-27** addendum directly below this table.)* | [`0250-authenticated-profile-read-for-paid-entitlement`](../tasks/backlog/0250-authenticated-profile-read-for-paid-entitlement/brief.md) |
| 🔲 Backlog | 10 *(was ~~5~~ after the second re-rank; ~~4~~ after the first; arrived at append rank ~~24~~ — owner re-ranks of 2026-09-26)* | **Suppress interstitial ads for PAID citizens — deliver the benefit `PROJECT.md` already promises** *(➡️ **MOVED IN FROM THE [Backlog board](backlog.md) ON 2026-09-26** — OWNER RULING given live in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021, ADR-037 §3); ⛔ not producer precedent. Owner, verbatim: *"Add the "ad-free" for the paid citizenship status task, add it to the Sprint 6, and place it BEFORE the citizenship popup"*. 🚨 **Still HARD-BLOCKED on [`0250`](../tasks/backlog/0250-authenticated-profile-read-for-paid-entitlement/brief.md)** — the client cannot read *paid* state today — ~~and `0250` is **NOT on this board**: an open owner decision, see the re-rank addendum below.~~ ✅ **`0250` moved onto this board directly above this row** (owner ruling 2026-09-26, second re-rank addendum below). Its own Step-1 decision gate (revenue framing; all six placements or a subset) is unchanged. Status copied from the brief; nothing started.)* | [`0248-suppress-interstitial-ads-for-paid-citizens`](../tasks/backlog/0248-suppress-interstitial-ads-for-paid-citizens/brief.md) |
| 🔲 Backlog | 11 *(was ~~6~~ after the second re-rank; ~~5~~ after the first; ~~19~~ append rank before them — owner re-ranks of 2026-09-26)* | **"What is citizenship?" explainer popup — a funnel from information to purchase** *(🆕 **FILED 2026-09-26** by a spawned `fkit-producer` with no owner channel (ADR-021), on an owner request relayed by `fkit-lead`; ⛔ not producer precedent. 📌 **Now depends on `0302` and `0248`** (owner rulings 2026-09-26 — the popup describes their perks). ~~⚠️ Append rank, not merit — see the addendum below.~~ ✅ **Rank OWNER-RULED 2026-09-26** — see the **RE-RANK 2026-09-26** addendum below. 🚢 **Ships in the SAME deploy as `0302`** (owner ruling 2026-09-26, second re-rank addendum below).)* | [`0301-citizenship-explainer-popup-and-purchase-funnel`](../tasks/backlog/0301-citizenship-explainer-popup-and-purchase-funnel/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | 12 *(was ~~7~~ after the second re-rank; ~~6~~ after the first; ~~21~~ append rank before them — owner re-ranks of 2026-09-26)* | **After a purchase, the whole game reflects it at once — live update or a clear "restart to apply"** *(🆕 **FILED 2026-09-26** by a spawned `fkit-producer` with no owner channel (ADR-021), on an OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` and relayed by `fkit-lead`; ⛔ not producer precedent. Step 0 inventories what does not update after a purchase; live-update vs restart prompt is an owner decision inside the task. ~~⚠️ Append rank, not merit — see the addendum below.~~ ✅ **Rank OWNER-RULED 2026-09-26** — see the **RE-RANK 2026-09-26** addendum below.)* | [`0303-the-whole-game-reflects-a-purchase-without-a-reload`](../tasks/done/0303-the-whole-game-reflects-a-purchase-without-a-reload/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | 13 *(was ~~33~~, append rank — owner re-rank 2026-09-26, third)* | **Investigate: the citizenship card (and buy button) vanishes after a match on a shaky connection** *(🆕 **FILED 2026-09-26** by a spawned `fkit-producer` with no owner channel (ADR-021), on OWNER RULINGS given live in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead` (finding chosen + *"Sprint 6, bottom"*). Return-to-menu is a full reload; a failed `sdk.js` fetch leaves the session degraded for life and `0291` hides the card. Measure the degraded-boot rate first, then weigh SDK retry (reverses `0049`'s locked "no SDK retry" — owner's call) / no-reload return / a visible retry state. Architect-owned, no code. ~~⚠️ Append rank, not merit — see the addendum below.~~ ✅ **Rank OWNER-RULED 2026-09-26** — see the **RE-RANK 2026-09-26, THIRD** addendum below.)* | [`0318-investigate-citizenship-card-vanishes-after-a-match-on-a-shaky-connection`](../tasks/done/0318-investigate-citizenship-card-vanishes-after-a-match-on-a-shaky-connection/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | 14 *(was ~~32~~ after the third re-rank; ~~26~~ append rank before it — owner re-rank 2026-09-26, fourth)* | **Remove the game name ("Geoconflict" / "Геоконфликт") from player-facing texts** *(🆕 **FILED 2026-09-26** by a spawned `fkit-producer` with no owner channel (ADR-021), on an owner request and an OWNER RULING (*"Sprint 6"*) given live in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead`. Inbox citizenship title + tenure popup body in en/ru; page title / install name only if the owner says yes. Owner approves the ru/en wording first. ~~⚠️ Append rank, not merit — see the addendum below.~~ ✅ **Rank OWNER-RULED 2026-09-26** (*"Move up after 0318"*) — see the **RE-RANK 2026-09-26, FOURTH** addendum below.)* | [`0311-remove-the-game-name-from-player-facing-texts`](../tasks/done/0311-remove-the-game-name-from-player-facing-texts/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | 15 *(was ~~33~~ after the third re-rank; ~~31~~ append rank before it — owner re-rank 2026-09-26, fourth: still directly below `0311`)* | **Name-change approved message must not promise the new name is active everywhere (en + ru)** *(🆕 **FILED 2026-09-26** by a spawned `fkit-producer` with no owner channel (ADR-021), on OWNER RULINGS given live in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead` (finding chosen + *"Sprint 6, bottom"*). «теперь активно» over-promises: by `0067`(b) the name shows on the card only. Copy-only; template message, so the fix is retroactive. Owner approves wording. ~~⚠️ Append rank, not merit — see the addendum below.~~ ✅ **Rank OWNER-RULED 2026-09-26** (directly below `0311`, same text files, ship together) — see the **RE-RANK 2026-09-26, THIRD** addendum below; moved up with `0311` by the **FOURTH**.)* | [`0316-approve-inbox-message-must-not-promise-the-new-name-is-active-everywhere`](../tasks/done/0316-approve-inbox-message-must-not-promise-the-new-name-is-active-everywhere/brief.md) |
| ➡️ Moved to [Backlog](backlog.md) *(owner ruling 2026-09-29, relayed by `fkit-lead` — folded into the discussion brief `0342` (linked in the Brief cell; this row's prose is copied verbatim into it); the status this row carried was ~~🔲 Backlog~~; see the 2026-09-29 **brief-less rows** addendum directly below this table)* | — | 5b. Server Restart UX *(brief file lost — see note above; content in `done/plan-sprint-3.md` and the section below)* | ~~none — `s3-5b-task-server-restart-ux.md` is dangling~~ → [`0342-discussion-parked-features-not-tied-to-paid-citizenship`](../tasks/backlog/0342-discussion-parked-features-not-tied-to-paid-citizenship/brief.md) *(discussion brief, 2026-09-29)* |
| ➡️ Moved to [Backlog](backlog.md) *(owner ruling 2026-09-29, relayed by `fkit-lead` — folded into the discussion brief `0342` (linked in the Brief cell; this row's prose is copied verbatim into it); the status this row carried was ~~🔲 Backlog~~; see the 2026-09-29 **brief-less rows** addendum directly below this table)* | — | 5c. Mobile Warning Screen *(brief file lost — see note above; content in `done/plan-sprint-3.md` and the section below)* | ~~none — `s3-5c-task-mobile-warning.md` is dangling~~ → [`0342-discussion-parked-features-not-tied-to-paid-citizenship`](../tasks/backlog/0342-discussion-parked-features-not-tied-to-paid-citizenship/brief.md) *(discussion brief, 2026-09-29)* |
| ➡️ Moved to [Backlog](backlog.md) *(owner ruling 2026-09-29, relayed by `fkit-lead` — folded into the discussion brief `0342` (linked in the Brief cell; this row's prose is copied verbatim into it); the status this row carried was ~~🔲 Backlog~~; see the 2026-09-29 **brief-less rows** addendum directly below this table)* | 16 *(was ~~14~~ after the third re-rank; ~~8~~ after the second; ~~7~~ after the first; ~~1~~ before them — shifted by the owner re-ranks of 2026-09-26)* | Historical Multiplayer Maps (free, 1–2 maps) | ~~TBD *(deferred by design)*~~ → [`0342-discussion-parked-features-not-tied-to-paid-citizenship`](../tasks/backlog/0342-discussion-parked-features-not-tied-to-paid-citizenship/brief.md) *(discussion brief, 2026-09-29)* |
| ➡️ Moved to [Sprint 8](plan-sprint-8.md) — priority 1 *(owner ruling 2026-09-29, relayed by `fkit-lead` — folded into the discussion brief `0343` (linked in the Brief cell; this row's prose is copied verbatim into it); the status this row carried was ~~🔲 Backlog~~; see the 2026-09-29 **brief-less rows** addendum directly below this table)* | 17 *(was ~~15~~ after the third re-rank; ~~9~~ after the second; ~~8~~ after the first; ~~2~~ before them — shifted by the owner re-ranks of 2026-09-26)* | Paid Campaign Map Packs | ~~TBD *(deferred by design)*~~ → [`0343-discussion-parked-features-tied-to-paid-citizenship`](../tasks/backlog/0343-discussion-parked-features-tied-to-paid-citizenship/brief.md) *(discussion brief, 2026-09-29)* |
| ➡️ Moved to [Sprint 7](plan-sprint-7.md) — unranked *(owner ruling 2026-09-27 — the status this row carried was copied verbatim to Sprint 7; see the 2026-09-27 addendum directly below this table)* | — | New Maps — Community Demand *(feeder brief for Tasks 1/2 — owner-ruled 2026-08-24: linked to the board; revisit when Sprint 5 is underway)* | [`0027-new-maps-community-demand`](../tasks/backlog/0027-new-maps-community-demand/brief.md) |
| ➡️ Moved to [Sprint 8](plan-sprint-8.md) — priority 1 *(owner ruling C, 2026-09-29, relayed by `fkit-lead` — folded into the discussion brief `0343` (linked in the Brief cell; this row's prose is copied verbatim into it). Earlier the same day this row was ~~moved to the Backlog board, into `0342`~~ — repointed by the owner's ruling *"Leaderboard Rewards, Coin Economy, Clans → Backlog — move that to the Sprint 8."* The status this row carried before either move was ~~🔲 Backlog~~; see the 2026-09-29 **ruling C** addendum directly below this table)* | 18 *(was ~~16~~ after the third re-rank; ~~10~~ after the second; ~~9~~ after the first; ~~3~~ before them — shifted by the owner re-ranks of 2026-09-26)* | Leaderboard — Rewards Layer *(➡️ **MOVED IN FROM [SPRINT 5](done/plan-sprint-5.md) ON 2026-09-26** — OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on 2026-09-26, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021); ⛔ not producer precedent. Sprint 5 plan Task 10; no brief exists yet, and the task prose **stays on the Sprint 5 board**, section *10. Leaderboard — Rewards Layer*. Status and Task cells copied verbatim from the Sprint 5 row.)* | ~~TBD~~ → ~~`0342-discussion-parked-features-not-tied-to-paid-citizenship`~~ → [`0343-discussion-parked-features-tied-to-paid-citizenship`](../tasks/backlog/0343-discussion-parked-features-tied-to-paid-citizenship/brief.md) *(discussion brief, 2026-09-29; repointed the same day, owner ruling C)* |
| ➡️ Moved to [Sprint 8](plan-sprint-8.md) — priority 1 *(owner ruling 2026-09-29, relayed by `fkit-lead` — folded into the discussion brief `0343` (linked in the Brief cell; this row's prose is copied verbatim into it); the status this row carried was ~~🔲 Backlog~~; see the 2026-09-29 **brief-less rows** addendum directly below this table)* | 19 *(was ~~17~~ after the third re-rank; ~~11~~ after the second; ~~10~~ after the first; ~~4~~ before them — shifted by the owner re-ranks of 2026-09-26)* | Nickname Styling System *(depends on Task 8 — verified nickname purchase + centralized name rendering)* *(➡️ **MOVED IN FROM [SPRINT 5](done/plan-sprint-5.md) ON 2026-09-26** — OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on 2026-09-26, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021); ⛔ not producer precedent. Sprint 5 plan Task 8a; no brief exists yet, and the task prose **stays on the Sprint 5 board**, section *8a. Nickname Styling System*. Status and Task cells copied verbatim from the Sprint 5 row.)* | ~~TBD~~ → [`0343-discussion-parked-features-tied-to-paid-citizenship`](../tasks/backlog/0343-discussion-parked-features-tied-to-paid-citizenship/brief.md) *(discussion brief, 2026-09-29)* |
| ➡️ Moved to [Sprint 8](plan-sprint-8.md) — priority 1 *(owner ruling C, 2026-09-29, relayed by `fkit-lead` — folded into the discussion brief `0343` (linked in the Brief cell; this row's prose is copied verbatim into it). Earlier the same day this row was ~~moved to the Backlog board, into `0342`~~ — repointed by the owner's ruling *"Leaderboard Rewards, Coin Economy, Clans → Backlog — move that to the Sprint 8."* The status this row carried before either move was ~~🔲 Backlog~~; see the 2026-09-29 **ruling C** addendum directly below this table)* | 20 *(was ~~18~~ after the third re-rank; ~~12~~ after the second; ~~11~~ after the first; ~~5~~ before them — shifted by the owner re-ranks of 2026-09-26)* | Coin Economy + Rewarded Ads Full Version *(➡️ **MOVED IN FROM [SPRINT 5](done/plan-sprint-5.md) ON 2026-09-26** — OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on 2026-09-26, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021); ⛔ not producer precedent. Sprint 5 plan Task 11; no brief exists yet, and the task prose **stays on the Sprint 5 board**, section *11. Coin Economy + Rewarded Ads Full Version*. Status and Task cells copied verbatim from the Sprint 5 row.)* | ~~TBD~~ → ~~`0342-discussion-parked-features-not-tied-to-paid-citizenship`~~ → [`0343-discussion-parked-features-tied-to-paid-citizenship`](../tasks/backlog/0343-discussion-parked-features-tied-to-paid-citizenship/brief.md) *(discussion brief, 2026-09-29; repointed the same day, owner ruling C)* |
| ➡️ Moved to [Sprint 8](plan-sprint-8.md) — priority 1 *(owner ruling C, 2026-09-29, relayed by `fkit-lead` — folded into the discussion brief `0343` (linked in the Brief cell; this row's prose is copied verbatim into it). Earlier the same day this row was ~~moved to the Backlog board, into `0342`~~ — repointed by the owner's ruling *"Leaderboard Rewards, Coin Economy, Clans → Backlog — move that to the Sprint 8."* The status this row carried before either move was ~~🔲 Backlog~~; see the 2026-09-29 **ruling C** addendum directly below this table)* | 21 *(was ~~19~~ after the third re-rank; ~~13~~ after the second; ~~12~~ after the first; ~~6~~ before them — shifted by the owner re-ranks of 2026-09-26)* | Clans *(gated on lobby health)* *(➡️ **MOVED IN FROM [SPRINT 5](done/plan-sprint-5.md) ON 2026-09-26** — OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on 2026-09-26, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021); ⛔ not producer precedent. Sprint 5 plan Task 12; no brief exists yet, and the task prose **stays on the Sprint 5 board**, section *12. Clans*. Status and Task cells copied verbatim from the Sprint 5 row.)* | ~~TBD~~ → ~~`0342-discussion-parked-features-not-tied-to-paid-citizenship`~~ → [`0343-discussion-parked-features-tied-to-paid-citizenship`](../tasks/backlog/0343-discussion-parked-features-tied-to-paid-citizenship/brief.md) *(discussion brief, 2026-09-29; repointed the same day, owner ruling C)* |
| ➡️ Moved to [Sprint 8](plan-sprint-8.md) — priority 1 *(owner ruling 2026-09-29, relayed by `fkit-lead` — folded into the discussion brief `0343` (linked in the Brief cell; this row's prose is copied verbatim into it); the status this row carried was ~~🔲 Backlog~~; see the 2026-09-29 **brief-less rows** addendum directly below this table)* | 22 *(was ~~20~~ after the third re-rank; ~~14~~ after the second; ~~13~~ after the first; ~~7~~ before them — shifted by the owner re-ranks of 2026-09-26)* | Map Voting for Verified Players *(depends on Task 8)* *(➡️ **MOVED IN FROM [SPRINT 5](done/plan-sprint-5.md) ON 2026-09-26** — OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on 2026-09-26, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021); ⛔ not producer precedent. Sprint 5 plan Task 14; no brief exists yet, and the task prose **stays on the Sprint 5 board**, section *14. Map Voting for Verified Players*. Status and Task cells copied verbatim from the Sprint 5 row.)* | ~~TBD~~ → [`0343-discussion-parked-features-tied-to-paid-citizenship`](../tasks/backlog/0343-discussion-parked-features-tied-to-paid-citizenship/brief.md) *(discussion brief, 2026-09-29)* |
| ➡️ Moved to [Sprint 8](plan-sprint-8.md) — priority 1 *(owner ruling 2026-09-29, relayed by `fkit-lead` — folded into the discussion brief `0343` (linked in the Brief cell; this row's prose is copied verbatim into it); the status this row carried was ~~🔲 Backlog~~; see the 2026-09-29 **brief-less rows** addendum directly below this table)* | 23 *(was ~~21~~ after the third re-rank; ~~15~~ after the second; ~~14~~ after the first; ~~8~~ before them — shifted by the owner re-ranks of 2026-09-26)* | Replay Access as Premium Feature *(depends on Task 11 tier/pricing)* *(➡️ **MOVED IN FROM [SPRINT 5](done/plan-sprint-5.md) ON 2026-09-26** — OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on 2026-09-26, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021); ⛔ not producer precedent. Sprint 5 plan Task 13; no brief exists yet, and the task prose **stays on the Sprint 5 board**, section *13. Replay Access as Premium Feature*. Status and Task cells copied verbatim from the Sprint 5 row.)* | ~~TBD~~ → [`0343-discussion-parked-features-tied-to-paid-citizenship`](../tasks/backlog/0343-discussion-parked-features-tied-to-paid-citizenship/brief.md) *(discussion brief, 2026-09-29)* |
| ➡️ Moved to [Sprint 8](plan-sprint-8.md) — priority 1 *(owner ruling 2026-09-29, relayed by `fkit-lead` — folded into the discussion brief `0343` (linked in the Brief cell; this row's prose is copied verbatim into it); the status this row carried was ~~🔲 Backlog~~; see the 2026-09-29 **brief-less rows** addendum directly below this table)* | 24 *(was ~~22~~ after the third re-rank; ~~16~~ after the second; ~~15~~ after the first; ~~9~~ before them — shifted by the owner re-ranks of 2026-09-26)* | Custom Uploaded Flags & Patterns — Paid Citizens Only *(depends on Tasks 9/9a and Task 8)* *(➡️ **MOVED IN FROM [SPRINT 5](done/plan-sprint-5.md) ON 2026-09-26** — OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on 2026-09-26, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021); ⛔ not producer precedent. Sprint 5 plan Task 15; no brief exists yet, and the task prose **stays on the Sprint 5 board**, section *15. Custom Uploaded Flags & Patterns — Paid Citizens Only*. Status and Task cells copied verbatim from the Sprint 5 row.)* | ~~TBD~~ → [`0343-discussion-parked-features-tied-to-paid-citizenship`](../tasks/backlog/0343-discussion-parked-features-tied-to-paid-citizenship/brief.md) *(discussion brief, 2026-09-29)* |
| ✅ Done (agent-closed — not owner-verified) | 25 *(was ~~23~~ after the third re-rank; ~~17~~ after the second; ~~16~~ after the first; ~~10~~ before them — shifted by the owner re-ranks of 2026-09-26)* | **Detect an ALREADY-DISABLED Uptrace notification channel — read the monitoring stack's own channel state** *(**➡️ MOVED IN FROM [SPRINT 4](done/plan-sprint-4.md) ON 2026-09-22**, RULING D — same owner ruling as `0238` above. **Status meaning carried across honestly and unchanged: `🔲 Backlog` on Sprint 4, `🔲 Backlog` here.** ✅ **Consistent with, and not a re-decision of, the 2026-09-19 ruling** that already deferred this together with `0289` and `0219` G3/G4 as one monitoring bucket. ⛔ **The task folder did NOT move and no mover skill was invoked.** **Merit note, carried over:** on merit this belongs directly below [`0284`](../tasks/done/0284-alert-path-liveness-probe-a-webhook-403-permanently-disables-uptrace-alerting/brief.md) — it closes the hole `0284` leaves open and reuses its marker path.)* *(➡️ **MOVED IN FROM [SPRINT 5](done/plan-sprint-5.md) ON 2026-09-26** — OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on 2026-09-26, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021); ⛔ not producer precedent. Status and Task cells copied **verbatim** from the Sprint 5 row; any *"above"* / *"below"* / *"addendum below"* inside them refers to the Sprint 5 board (or to the Sprint 4 board, where the cell says it was carried from there).)* | [`0285-detect-an-already-disabled-uptrace-notification-channel-read-its-own-channel-state`](../tasks/done/0285-detect-an-already-disabled-uptrace-notification-channel-read-its-own-channel-state/brief.md) |
| 🚧 Blocked — plan approved 2026-09-28 (no code); waiting on [`0341`](../tasks/backlog/0341-verify-0285-in-production-deploy-it-and-run-its-disabled-channel-drill/brief.md) (verify `0285` in production: its deploy and its disabled-channel drill), then the OWNER-run drill (owner ruling Q3). Driven by `/fkit-sprint-ship-loop` (fkit-lead). *(📌 Repointed 2026-09-29 — OWNER RULING that day filed `0341` as the tracked blocker; earlier text, kept: ~~waiting on the OWNER-run drill, which runs after 0285 is deployed and its drill is done (owner ruling Q3).~~)* | 26 *(was ~~24~~ after the third re-rank; ~~18~~ after the second; ~~17~~ after the first; ~~11~~ before them — shifted by the owner re-ranks of 2026-09-26)* | **Prove a Telegram alert still arrives after an IDLE period — `0274` amendment A1** *(⛔ **NOT alert rule A1** — the brief's own "READ FIRST" section explains the two different things called A1. **➡️ MOVED IN FROM [SPRINT 4](done/plan-sprint-4.md) ON 2026-09-22**, RULING D — same owner ruling as `0238` above. **Status meaning carried across honestly and unchanged: `🔲 Backlog` on Sprint 4, `🔲 Backlog` here.** ✅ **Consistent with the 2026-09-19 ruling** that deferred this with `0285` and `0219` G3/G4 as one monitoring bucket. ⛔ **The task folder did NOT move and no mover skill was invoked.** **Merit note, carried over:** on merit this belongs directly below `0284` — it verifies the last unproven hop of the alert path `0284` guards and `0277` built.)* *(➡️ **MOVED IN FROM [SPRINT 5](done/plan-sprint-5.md) ON 2026-09-26** — OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on 2026-09-26, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021); ⛔ not producer precedent. Status and Task cells copied **verbatim** from the Sprint 5 row; any *"above"* / *"below"* / *"addendum below"* inside them refers to the Sprint 5 board (or to the Sprint 4 board, where the cell says it was carried from there).)* | [`0289-prove-a-telegram-alert-arrives-after-an-idle-period-0274-amendment-a1`](../tasks/backlog/0289-prove-a-telegram-alert-arrives-after-an-idle-period-0274-amendment-a1/brief.md) |
| ➡️ Moved to [Sprint 7](plan-sprint-7.md) — priority 1 *(owner ruling 2026-09-27 — the status this row carried was copied verbatim to Sprint 7; see the 2026-09-27 addendum directly below this table)* | 27 *(was ~~25~~ after the third re-rank; ~~19~~ after the second; ~~18~~ after the first; ~~12~~ before them — shifted by the owner re-ranks of 2026-09-26)* | **S3-Backed Match Archival (Citizen-Gated)** *(**➡️ MOVED IN FROM [SPRINT 4](done/plan-sprint-4.md) ON 2026-09-22**, on an **OWNER RULING** given live in the `fkit lead` session and relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021) — **RULING E** on the Sprint 4 board. ⛔ **NOT RULING D and NOT a checkup** — a separate ruling, a separate question; it did not move with the four above it. Owner, verbatim: *"Move this task and anything that depends on it to the Sprint 5"*. ✅ **"Anything that depends on it" resolved to NOTHING — swept and verified, so this task moved ALONE.** **Status meaning carried across honestly and unchanged: it was `🔲 Backlog` on Sprint 4 and it is `🔲 Backlog` here.** ⛔ **The task folder did NOT move and no mover skill was invoked.** 🚨 **STILL HARD-BLOCKED, and the blockers did NOT come with it:** (1) the citizenship feature must exist, and (2) an S3 bucket + credentials must be provisioned. ⚠️ **Both citizenship blockers — [`0017`](../tasks/done/0017-citizenship-earned/brief.md) and [`0018`](../tasks/done/0018-citizenship-paid/brief.md) — REMAIN ON [SPRINT 4](done/plan-sprint-4.md)**, so this row sits a board *behind* its own prerequisites. **Coherent, not drift** — ⛔ do not "fix" it by dragging them here. 📐 **Blocker 2 is measured, not assumed (working tree, 2026-09-22):** the four config slots are **plumbed end to end** (`DefaultConfig.ts:214-224`, forwarded by `deploy.sh:315-318`) but **empty**, and `archiveEnabled()` is a hard `false` with no override ⇒ **the plumbing is done; only the bucket is missing.** ⚠️ **Ceiling: read from the repository, NOT from a deployed host.** ✅ **RESOLVED 2026-09-22, LATER THE SAME DAY — STRUCK, NOT DELETED.** ~~🚩 **UNRESOLVED, OWNER'S CALL:** [`0009`](../tasks/backlog/0009-self-host-upstream-openfront-api-dependency/brief.md) declares it **BLOCKS** this task, which this task's own two-item blocker list does not name — a third blocker nobody recorded, or a stale claim. **Flagged in the brief, not settled; `0009` was not edited.**~~ ⇒ ✅ **VERDICT — `0009`'s "Blocks `0030`" claim is STALE; this task does NOT depend on `0009`; THE BLOCKER COUNT STAYS TWO** (the two above, unchanged). **Authority:** a spawned `fkit-architect` verdict, **accepted by the owner live via `AskUserQuestion`** in the `fkit lead` session on **2026-09-22**, relayed by `fkit-lead` under **ADR-021**. ⛔ **Not producer precedent.** **Why:** the claim traces to `ai-agents/knowledge-base/architecture.md:898-902` §13 Q1, phrased **conditionally** (*"This determines whether…"*) and flattened into "Blocks" — the determination was never run; `0009` **is** right about current code (`src/server/Archive.ts:32` POSTs to `config.jwtIssuer()`) **but this task REPLACES that with an S3 write**, removing the archive leg from `0009`'s scope; and the **discriminator** is that citizen-gating reads `is_citizen` from the **profile server** (`src/server/GameServer.ts:1336-1337`), not from upstream flares. ⚠️ **Confidence, unrounded — accepted, not proven: ~90% technical, ~70% on intent** — code cannot establish what "Blocks" meant to its author on 2026-08-09. 🚨 **DELIBERATELY NOT DONE, a LIVE RE-DERIVATION RISK: the owner was offered the chance to also correct `architecture.md:898-902` and DECLINED** — the conditional sentence that seeded this is still in the source by choice and can be re-read the same wrong way. 📌 **`0009` WAS edited after all** (owner chose *"Downgrade to Related"*; Blocks line struck → *Related / touches*), ⛔ **its scope, `## Status` and `## Priority` were NOT changed.** **Full record:** [`0030`'s brief](../tasks/backlog/0030-archive-s3-backed-citizen-gated/brief.md) § *"✅ RESOLVED 2026-09-22"*.)* *(➡️ **MOVED IN FROM [SPRINT 5](done/plan-sprint-5.md) ON 2026-09-26** — OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on 2026-09-26, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021); ⛔ not producer precedent. Status and Task cells copied **verbatim** from the Sprint 5 row; any *"above"* / *"below"* / *"addendum below"* inside them refers to the Sprint 5 board (or to the Sprint 4 board, where the cell says it was carried from there).)* | [`0030-archive-s3-backed-citizen-gated`](../tasks/backlog/0030-archive-s3-backed-citizen-gated/brief.md) |
| ➡️ Moved to [Sprint 7](plan-sprint-7.md) — priority 2 *(owner ruling 2026-09-27 — the status this row carried was copied verbatim to Sprint 7; see the 2026-09-27 addendum directly below this table)* | 28 *(was ~~26~~ after the third re-rank; ~~20~~ after the second; ~~19~~ after the first; ~~13~~ before them — shifted by the owner re-ranks of 2026-09-26)* | Investigate & Fix Client Null-ID Errors *(stabilization follow-up; needs source maps + deployed archive fix. ✅ **BOTH PRECONDITIONS SATISFIED 2026-09-12 — OWNER RULING, given live in session and relayed through the lead session: `0164` and `0159` are deployed in production.** ⚠️ **Owner-attested, NOT repo-verified** — a deploy leaves no artifact in git. ⇒ **STARTABLE now.** Status unchanged — startable is not started; row edited in place (ADR-035))* *(**➡️ MOVED IN FROM [SPRINT 4](done/plan-sprint-4.md) ON 2026-09-23** — Sprint 4 rescope, an OWNER RULING given live in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021); ⛔ not producer precedent. See the *Sprint 4 rescope* addendum directly below this table. ⚠️ **The Status, Priority and Task cells of this row were carried VERBATIM from the Sprint 4 row** — any *"above"*, *"below"* or *"addendum below"* inside them refers to [`plan-sprint-4.md`](done/plan-sprint-4.md), not this board. The move changed no status marker and no rank.)* *(➡️ **MOVED IN FROM [SPRINT 5](done/plan-sprint-5.md) ON 2026-09-26** — OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on 2026-09-26, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021); ⛔ not producer precedent. Status and Task cells copied **verbatim** from the Sprint 5 row; any *"above"* / *"below"* / *"addendum below"* inside them refers to the Sprint 5 board (or to the Sprint 4 board, where the cell says it was carried from there).)* | [`0032-investigate-null-id-errors`](../tasks/backlog/0032-investigate-null-id-errors/brief.md) |
| ➡️ Moved to [Sprint 7](plan-sprint-7.md) — priority 14 *(owner ruling 2026-09-29, typed directly by the owner, relayed by `fkit-lead` — the status this row carried (~~🔲 Backlog~~) was copied verbatim to Sprint 7; see the 2026-09-29 `0213` addendum directly below this table)* | 29 *(was ~~27~~ after the third re-rank; ~~21~~ after the second; ~~20~~ after the first; ~~14~~ before them — shifted by the owner re-ranks of 2026-09-26)* | **EPIC — Profile backend + S3: wipe and rebuild onto the EXISTING box and bucket (P0–P7)** *(**rows 0213–0222 below were APPENDED 2026-09-04 on an owner ruling given live in session. Appended, never inserted — no row sits above a closed row (ADR-035).** 🔴 **THESE ROWS WERE REWRITTEN LATER THE SAME DAY ON A MATERIAL REFRAME — read the reconciliation before anything else.** Two owner statements, **both recorded, neither discarded**: first *"We don't have ANY profile-related VPS yet, we would need to have a full-scale setup for it (whatever is needed)"*; then, **superseding it**, *"We don't need to cancel any billings, the VPS and S3 I created will be reused"* — confirmed on follow-up: *"Both exist — reuse them in place."* ⛔ **Do NOT read the first statement as a lie or an error.** ⇒ 🔴 ~~**A PROFILE VPS AND AN S3 BUCKET PHYSICALLY EXIST AND ARE REUSED IN PLACE.**~~ 🚨 **CORRECTED 2026-09-08 — THE S3 BUCKET IS NOT REUSED: a BRAND-NEW, CLEAN bucket is created (owner ruling, given live in session, superseding the 2026-09-04 reuse ruling AS TO THE BUCKET ONLY). ✅ The VPS half is UNCHANGED — the box is still reused in place. Row edited in place; status, priority and position unchanged — ADR-035.** ⇒ 🔴 **A PROFILE VPS PHYSICALLY EXISTS AND IS REUSED IN PLACE. WHAT IS ON IT — provisioning, what is running — IS UNKNOWN AND UNVERIFIED.** The **OLD** bucket still exists, is still unverified, and is now **fully separable**. ⚠️ **Hardware existence and provisioning state are two different facts, and only the first is known** — that gap is not a contradiction, it is the owner's standing *"I am completely lost about what was done and what wasn't"*. ⇒ **"Clean slate" now means WIPE AND REBUILD ONTO EXISTING RESOURCES, not procure new ones.** ⚠️ **Every "the profile backend is live" claim in this repo was stale; ten files were corrected — and then RE-CORRECTED the same day**, because the first pass wrote *"there is NO profile VPS"*, which **overstated** it. ⚠️ **THE WORK IS SMALLER THAN "REBUILD" SOUNDS** — `setup-profile.sh` (1,025 lines) provisions **and** deploys and is ✅ **idempotent, safe to re-run**; `build-deploy-profile.sh` (575 lines) is a hardened two-hop driver; `migrations/001`–`004` + `migrate.ts` are ✅ **idempotent** (`schema_migrations`-tracked, re-runs are no-ops); `/ready` **was** built (`Routes.ts:198-207`); a scripted restore **exists** (`profile-backup.sh:192-262`); off-box encrypted backups **exist and fail closed at deploy** (`setup-profile.sh:889-908`); and a **complete bring-up runbook already exists** at `0182` — in `done/`, which is why nobody points at it. **Shape: inspect what is there, wipe and re-run one existing idempotent command, close five gaps.** 🔴 **THREE TRAPS, all silent:** (1) **`0182`'s runbook will break `0062` if followed as written** — it said `PROFILE_INTERNAL_TOKEN` is *"Optional — leave blank; the box auto-generates"*, **TRUE at T4i, FALSE now**: 📌 **citation corrected 2026-09-10 — this row read `0182`'s `:136-137`, which is WRONG; read against `589249c` the struck sentence is `0182/brief.md:185`, quoted again at `0182/brief.md:241`, under the correction banner `0182/brief.md:182-231` (`:136` is the header `## 3. Confirm SSH access to the box`)**: `internalAuth` is a `timingSafeEqual` over a **SHARED** secret (`InternalAuth.ts:14-19`, `:26`) ⇒ 401 on every credit call, and the fail-soft client has **no durable queue** (ADR-101) so **the XP is LOST, not queued**, nothing logged above `debug` — **annotated in place in `0182`**; (2) **`PROFILE_INTERNAL_ALLOW_IPS` is pinned to a June egress IP** (`example.env.profile:33`), nginx does `allow …; deny all;` at `/internal/` (`setup-profile.sh:719-720`) ⇒ 403, also swallowed — ⚠️ **two independent silent barriers on the SAME path; `0062`'s D3 is the only check that catches either**; (3) **rotating `POSTGRES_PASSWORD` against an existing data volume breaks auth** (initdb-only) — 🚨 **MORE likely under the reframe, not less**: wiping onto an existing box is exactly where a volume survives while the password is regenerated. **Decide explicitly whether the volume goes.** ⚠️ **CAPACITY RISK, RECORDED ONCE AND NOT RE-ARGUED:** the producer recommended **P1+P2+P7 only**; ⛔ **the owner ruled ALL of P0–P7 in, explicitly, over that recommendation.** ✅ **The reframe reduces it somewhat** — no procurement wait, and both `0216` and `0201` can start today. Survey: [`2026-09-04-profile-backend-clean-slate-survey.md`](../knowledge-base/reports/2026-09-04-profile-backend-clean-slate-survey.md) — **read §0**)* *(**➡️ MOVED IN FROM [SPRINT 4](done/plan-sprint-4.md) ON 2026-09-23** — Sprint 4 rescope, an OWNER RULING given live in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021); ⛔ not producer precedent. See the *Sprint 4 rescope* addendum directly below this table. ⚠️ **The Status, Priority and Task cells of this row were carried VERBATIM from the Sprint 4 row** — any *"above"*, *"below"* or *"addendum below"* inside them refers to [`plan-sprint-4.md`](done/plan-sprint-4.md), not this board. The move changed no status marker and no rank.)* *(➡️ **MOVED IN FROM [SPRINT 5](done/plan-sprint-5.md) ON 2026-09-26** — OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on 2026-09-26, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021); ⛔ not producer precedent. Status and Task cells copied **verbatim** from the Sprint 5 row; any *"above"* / *"below"* / *"addendum below"* inside them refers to the Sprint 5 board (or to the Sprint 4 board, where the cell says it was carried from there).)* | [`0213-profile-backend-clean-slate-rebuild`](../tasks/backlog/0213-profile-backend-clean-slate-rebuild/brief.md) |
| ➡️ Moved to [Sprint 7](plan-sprint-7.md) — priority 3 *(owner ruling 2026-09-27 — the status this row carried was copied verbatim to Sprint 7; see the 2026-09-27 addendum directly below this table)* | 30 *(was ~~28~~ after the third re-rank; ~~22~~ after the second; ~~21~~ after the first; ~~15~~ before them — shifted by the owner re-ranks of 2026-09-26)* | **P4 — Operability: log rotation, image prune, an external uptime check, and a reader for `last-backup.json`** *(**~1 day. Technically LOW. By CONSEQUENCE HIGH — the "outage nobody noticed for three weeks" class.** ⚠️ **Do not let the low technical difficulty set the rank.** 🔴 **No container log rotation on the profile box** — `setup-profile.sh` never writes `daemon.json` and the compose file declares no `logging:` block ⇒ **unbounded `json-file`**; `ai-agents/knowledge-base/container-log-retention.md:5-6` says outright *"The profile and telemetry boxes are not covered here."* 🚨 **This is the exact mechanism that filled the game production disk once already.** **No image prune** ⇒ storage grows every redeploy (`0182/brief.md:361-364` — *"Docker images are not auto-pruned … Run `docker image prune -f` periodically"*, post-2026-09-10-sweep numbering — recorded it; nothing does it. 📌 *corrected 2026-09-10 from `0182:224-227`, which is the `npm run deploy:profile` code block*). 🔴 **No monitoring or alerting of ANY kind**: no OTEL **by design** (`Logger.ts:5-8` — do **not** "fix" that by adding OTEL), no external uptime check (`0182/brief.md:365-367` — *"No external monitoring on this box … add one external uptime check"*, post-2026-09-10-sweep numbering — asked for one. 📌 *corrected 2026-09-10 from `0182:228-230`, which is the deploy-steps prose*), and 🚨 **NOTHING reads `last-backup.json`** — cron mails root only with an MTA, **which nothing installs**. ⚠️ **The compound failure is the point: a backup that stops is INVISIBLE while the 14-day prune keeps deleting.** **Mirror the game box, do not invent**: log rotation `update.sh:91-92`, prune `update.sh:37`/`:102`. The `last-backup.json` consumer **is [`0034`](../tasks/backlog/0034-monitoring-alert-bot-phase2/brief.md) item 5** — coordinate with `0033`/`0034` rather than building it twice. 🚨 **Verification: STOP THE SERVICE AND WATCH THE ALERT ARRIVE** — an alert never seen firing is not a verified alert; *"it writes to a log file"* is the state this task exists to end. **Depends on `0215`, and — canonical since an OWNER RULING of 2026-09-11 — [`0241`](../tasks/done/0241-profile-verify-first-weekly-backup-copy/brief.md).** 🚨 **THE `0241` DEPENDENCY MAKES THIS ROW READ FULLY BLOCKED. IT IS NOT.** `0241` gates **only the WEEKLY-COPY half of the backup-freshness item** — log rotation, image prune, the uptime check and the **daily**-object half are **UNAFFECTED and startable today**. ⏳ `0241` becomes actionable **Sunday 2026-09-13** and is a single observation taking minutes. ✅ **`0241` CLOSED 2026-09-13 (agent-closed — not owner-verified) with GO for the weekly half of G4 — this row is NO LONGER GATED on it.** The weekly object was observed (19312 B, tied to the 02:30:01 UTC CRON record, no `WARNING`); the two facts the monitor must encode are recorded in this brief's `## Depends on` gate block. ⛔ **Do not defer this whole task on the blocked reading — the brief's `## Depends on` table is the record of what is really gated.**)* *(**➡️ MOVED IN FROM [SPRINT 4](done/plan-sprint-4.md) ON 2026-09-23** — Sprint 4 rescope, an OWNER RULING given live in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021); ⛔ not producer precedent. See the *Sprint 4 rescope* addendum directly below this table. ⚠️ **The Status, Priority and Task cells of this row were carried VERBATIM from the Sprint 4 row** — any *"above"*, *"below"* or *"addendum below"* inside them refers to [`plan-sprint-4.md`](done/plan-sprint-4.md), not this board. The move changed no status marker and no rank.)* *(➡️ **MOVED IN FROM [SPRINT 5](done/plan-sprint-5.md) ON 2026-09-26** — OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on 2026-09-26, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021); ⛔ not producer precedent. Status and Task cells copied **verbatim** from the Sprint 5 row; any *"above"* / *"below"* / *"addendum below"* inside them refers to the Sprint 5 board (or to the Sprint 4 board, where the cell says it was carried from there).)* | [`0219-profile-p4-operability-log-rotation-prune-uptime-backup-freshness`](../tasks/backlog/0219-profile-p4-operability-log-rotation-prune-uptime-backup-freshness/brief.md) |
| ➡️ Moved to [Sprint 7](plan-sprint-7.md) — priority 4 *(owner ruling 2026-09-27 — the status this row carried was copied verbatim to Sprint 7; see the 2026-09-27 addendum directly below this table)* | 31 *(was ~~29~~ after the third re-rank; ~~23~~ after the second; ~~22~~ after the first; ~~16~~ before them — shifted by the owner re-ranks of 2026-09-26)* | **P6 — OS baseline hardening, the restart-policy divergence, and graceful shutdown** *(**0.5–1 day. Risk Low-Medium — but one item can balloon.** Missing today: `unattended-upgrades`, `fail2ban`, sshd hardening, and a **non-root deploy user — the deploy runs as root by default.** ⚠️ **The non-root user touches the WHOLE deploy path** (SSH target, privileged ops, Docker group, file ownership, harness fixtures) — **scope it deliberately, and if it overruns, SPLIT IT OUT rather than absorbing the overrun**; a half-migrated deploy user is worse than none. ⚠️ **Restart-policy divergence:** profile uses `restart: on-failure` (`setup-profile.sh:405`, `:427`), the game box uses `--restart=always` (`update.sh:64`) — 🚨 **`on-failure` does NOT bring containers back after a Docker DAEMON restart**; systemd covers a reboot, not the daemon restarting under it. **Recommendation `unless-stopped`** (a recommendation, not a ruling). **Verify by restarting the DAEMON, not the box** — that is the specific hole. **No graceful shutdown** — `src/profile-server/Server.ts` installs no SIGTERM handler and never closes the pool; ✅ **severity LOW and the reason is load-bearing: the credit ledger's idempotency PK prevents double-crediting on retry — if that PK is ever removed this stops being low.** ⚠️ `unattended-upgrades` with auto-reboot on a single-box service is an **unattended outage** — surface the choice. 🚨 Verify sshd changes from a **second already-open session**. Depends on `0215`)* *(**➡️ MOVED IN FROM [SPRINT 4](done/plan-sprint-4.md) ON 2026-09-23** — Sprint 4 rescope, an OWNER RULING given live in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021); ⛔ not producer precedent. See the *Sprint 4 rescope* addendum directly below this table. ⚠️ **The Status, Priority and Task cells of this row were carried VERBATIM from the Sprint 4 row** — any *"above"*, *"below"* or *"addendum below"* inside them refers to [`plan-sprint-4.md`](done/plan-sprint-4.md), not this board. The move changed no status marker and no rank.)* *(➡️ **MOVED IN FROM [SPRINT 5](done/plan-sprint-5.md) ON 2026-09-26** — OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on 2026-09-26, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021); ⛔ not producer precedent. Status and Task cells copied **verbatim** from the Sprint 5 row; any *"above"* / *"below"* / *"addendum below"* inside them refers to the Sprint 5 board (or to the Sprint 4 board, where the cell says it was carried from there).)* | [`0221-profile-p6-os-baseline-hardening`](../tasks/backlog/0221-profile-p6-os-baseline-hardening/brief.md) |
| ✅ Done (agent-closed — not owner-verified) — **closed 2026-09-29** by a spawned `fkit-producer` (no owner channel, ADR-021) on an OWNER RULING relayed by `fkit-lead` (*"Write note, then close"*). Plan step 8 ran **2026-09-26, owner-executed**: telemetry deploy no prompt + before/after capture byte-identical; profile deploy log shows no debconf/whiptail prompt. Step-8 worklog note written 2026-09-29. ⚠️ **Two gaps, recorded, not closed:** (a) the full list of packages `apt-get upgrade` touched was **never captured** — only the in-scope `keyboard-configuration`, `console-setup`, `needrestart` are recorded; (b) **no profile-box "after" capture** — "no settings changed" is proven on the telemetry box only. ⚠️ Proves no **debconf** prompt; a **dpkg conffile** prompt is still **not covered** (residual R1, ruling D3) — never *"the deploy can no longer hang"*. · earlier: 🚧 Blocked — **built + reviewed 2026-09-20; open pending the OWNER-executed plan step 8.** Steps 1–7 done; stateful review round 1 closed out, **Codex coverage FULL** (verdict *Ready to merge, validation-gated*); R1+R2 applied on owner rulings, R3 routed to the producer to file. ⚠️ **No code work remains.** Gates re-run by `fkit-lead` independently of both workers: harness `ALL PASS` · `npm test` 138 suites / 1870 tests · lint 0 · the three scripts **+44 / -0** (zero deletions ⇒ no `apt` line touched, ruling D2 held by construction). 🚨 Step 8 is the OWNER's (two deploys running prompt-free + a read-only before/after `debconf-show`), and nothing proven locally is evidence a real deploy is prompt-free. ⚠️ Never write this up as *“the deploy can no longer hang”* — **dpkg conffile** prompts are NOT covered (owner-ruled D3: record, do not close). · earlier: 🔄 In progress — driven from the lead session by `/fkit-sprint-ship-loop`, started 2026-09-19 (plan step) on an OWNER RULING given live via `AskUserQuestion` and relayed by `fkit-lead`. ⛔ The brief's *raise-do-not-settle* question (does `apt-get upgrade -y` belong in a deploy at all?) is NOT settled by that ruling — it goes to the owner at the plan gate. · earlier: 🔲 Backlog Backlog *(⬅️ carried verbatim from the Sprint 4 row on 2026-09-23 — see the note in the Task cell.)* | 32 *(was ~~30~~ after the third re-rank; ~~24~~ after the second; ~~23~~ after the first; ~~17~~ before them — shifted by the owner re-ranks of 2026-09-26)* | **Deploy scripts run `apt` with no `DEBIAN_FRONTEND=noninteractive` — a deploy blocks indefinitely on an interactive dialog** *(➕ **FILED 2026-09-18 by a spawned `fkit-producer`.** ⛔ **Authority, stated plainly:** the owner ruled only that **today's interruptions were worth filing as a task**. The owner did **NOT** rule the board and did **NOT** rule the rank — **both are the producer's**, open to be overturned in one edit. ⛔ Not producer precedent — one ruling, one task. **🚩 OBSERVED LIVE 2026-09-18**, during the owner's `npm run deploy:telemetry`: the deploy **stopped three times on `debconf` prompts** — `keyboard-configuration` (country), `console-setup` (encoding), `console-setup` (character set) — and the **owner had to answer each by hand**. ✅ **PRE-EXISTING, NOT caused by `0284`** — lead-verified: `0284`'s diff to that script adds no package install and does not touch the `apt` lines. **Why it is more than a nuisance:** a deploy that can block on a dialog **cannot be run unattended**, and an unattended run would **HANG SILENTLY rather than fail** — holding the apt lock, with `set -e` never firing because nothing errored. **Exposure, verified by reading the scripts: 🚩 `DEBIAN_FRONTEND` appears NOWHERE in any of the three deploy scripts, and neither does `debconf`.** `setup-telemetry.sh` — `:168` `apt-get update -y && apt-get upgrade -y`, `:242`, `:827`. 🚩 **`setup-profile.sh` has the SAME exposure across MORE calls — eight, including its own `apt-get upgrade -y` at `:221`** (`:199`, `:343`, `:355`, `:397`, `:451`, `:1235`, `:1515`); it has simply not been hit yet. `setup.sh` (game box) `:177` is the smallest surface — but ⚠️ its output is **suppressed**, so a prompt there would hang with **nothing printed at all**. 🚨 **CONSTRAINT THE IMPLEMENTER MUST KNOW:** `tests/scripts/profile-deploy-hardening.test.sh:299` **anchors the literal string** `apt-get update -y && apt-get upgrade -y` in `setup-profile.sh` (asserting it follows a `flock -n 9`) ⇒ **rewriting that line turns `npm test` RED** until the harness is updated in the same change. That is the gate working, not a broken test; the script says so itself at `setup-profile.sh:393-395`. ⚠️ **Adjacent but DIFFERENT, do not conflate:** that same comment records the accepted residual that `apt-daily-upgrade` can hold the apt lock during a deploy's `apt-get upgrade` — **that one fails LOUD under `set -e` and is re-run.** This task is the opposite failure, a **silent indefinite wait.** 🚩 **RAISED, DELIBERATELY NOT SETTLED — an OWNER decision:** does `apt-get upgrade -y` belong in a deploy **at all**? An unattended full upgrade on a single-box service can **restart or break things mid-deploy** (a `dockerd` restart is the very 'G7 scenario' the compose restart policy exists to survive). Options to put to the owner: keep as-is · narrow to security updates only (the box already runs `unattended-upgrades` scoped to the `-security` pocket) · drop it from the deploy. ⛔ **A `DEBIAN_FRONTEND` fix that silently also removes the upgrade is a scope change, not a fix.** ⚠️ **And the fix is not a universal muzzle** — `noninteractive` suppresses the *prompt* by accepting the package's **default** answer, so a package whose default is wrong for this box now gets it with nobody told; verify the three observed, do not assume. **Depends on:** nothing. **Blocks:** nothing. **Effort:** small — one export per script plus the harness-anchor reconciliation; ⚠️ the `apt-get upgrade` question above is **not** in that estimate. Appended, not inserted; nothing renumbered (ADR-035).)* *(**➡️ MOVED IN FROM [SPRINT 4](done/plan-sprint-4.md) ON 2026-09-23** — Sprint 4 rescope, an OWNER RULING given live in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021); ⛔ not producer precedent. See the *Sprint 4 rescope* addendum directly below this table. ⚠️ **The Status, Priority and Task cells of this row were carried VERBATIM from the Sprint 4 row** — any *"above"*, *"below"* or *"addendum below"* inside them refers to [`plan-sprint-4.md`](done/plan-sprint-4.md), not this board. The move changed no status marker and no rank.)* *(➡️ **MOVED IN FROM [SPRINT 5](done/plan-sprint-5.md) ON 2026-09-26** — OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on 2026-09-26, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021); ⛔ not producer precedent. Status and Task cells copied **verbatim** from the Sprint 5 row; any *"above"* / *"below"* / *"addendum below"* inside them refers to the Sprint 5 board (or to the Sprint 4 board, where the cell says it was carried from there).)* | [`0286-deploy-scripts-run-apt-with-no-debian-frontend-noninteractive-a-deploy-blocks-on-a-dialog`](../tasks/done/0286-deploy-scripts-run-apt-with-no-debian-frontend-noninteractive-a-deploy-blocks-on-a-dialog/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | 33 *(was ~~31~~ after the third re-rank; ~~25~~ after the second; ~~24~~ after the first; ~~18~~ before them — shifted by the owner re-ranks of 2026-09-26)* | **Config-parity guard: first real report-only production run, then arm `--enforce`** *(**🆕 FILED 2026-09-23** by a spawned `fkit-producer` with no owner channel (ADR-021), on an **OWNER RULING given live in the `fkit lead` session via `AskUserQuestion`** (Sprint 4 rescope, Q2 = (a)); ⛔ not producer precedent. **Split out of [`0064`](../tasks/done/0064-deploy-time-config-parity-guard/brief.md)**, which keeps Phase 2 in Sprint 4. Holds `0064` verification step 8 (runbook W12) plus arming `--enforce` at both call sites — **supersedes `0064/plan.md` ruling R3's 2026-09-02 *"same task, not a new task"* wording.** Arming waits on [`0203`](../tasks/done/0203-config-parity-guard-pre-arming-gate/brief.md). 🚩 If `0064` Phase 2 lands after Saturday, its checks need one report-only real deploy before they are enforced.)* *(➡️ **MOVED IN FROM [SPRINT 5](done/plan-sprint-5.md) ON 2026-09-26** — OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on 2026-09-26, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021); ⛔ not producer precedent. Status and Task cells copied **verbatim** from the Sprint 5 row; any *"above"* / *"below"* / *"addendum below"* inside them refers to the Sprint 5 board (or to the Sprint 4 board, where the cell says it was carried from there).)* | [`0298-config-parity-guard-first-real-report-only-production-run-then-arm-enforce`](../tasks/done/0298-config-parity-guard-first-real-report-only-production-run-then-arm-enforce/brief.md) |
| 🔲 Backlog | 34 *(append position — bottom of the board, OWNER RULING 2026-09-26: *"Move it to the bottom of Sprint 6"*)* | **Paid citizenship — owner-run test-buy sequence (real purchase, HMAC construction, secret value, reconciliation — moved out of `0065`)** *(**🆕 FILED 2026-09-23** by a spawned `fkit-producer` with **no owner channel** (ADR-021), on an **OWNER RULING given live in the `fkit lead` session via `AskUserQuestion`**, relayed by `fkit-lead`: *"Launch, and leave the test task for the Sprint 5. The test-buy sequence will be run by me (human)"*. ⛔ **A NEW TASK that RECEIVES checks — not a moved row**: `0065` stays on Sprint 4 as the go-live. **Run by the owner by hand, after `0065` §6 is live.** 🚨 **Accepted, owner-ruled tradeoff: paid citizenship goes live to real players before any real purchase has been proven: HMAC construction unconfirmed, secret value unconfirmed, reconciliation unexercised. Real players' first purchases may be the first real test.** ~~⚠️ §5 (moderation) flagged as possibly moot — open question in the brief.~~ 📌 **§5 narrowed by owner ruling 2026-09-23** to *"does the product ever disappear from `getCatalog()`"*; `## Owner` wording owner-confirmed; `0018` closes on `0065` alone — `0297` does not gate it.)* *(➡️ **MOVED IN FROM [SPRINT 5](done/plan-sprint-5.md) ON 2026-09-26, later** — OWNER RULING given 2026-09-26, later — the owner's own typed message live in the `fkit lead` session (not an `AskUserQuestion` answer), relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Owner, verbatim: *"Move it to the bottom of Sprint 6"*. ⛔ **Supersedes the 2026-09-23 ruling that pinned this row to the top of Sprint 5.** Status and Task cells copied **verbatim** from the Sprint 5 row; any *"above"* / *"below"* inside them refers to the Sprint 5 board. 📌 **Watch item:** §4 (a real player's successful `/reconcile`) is still open.)* *(📌 **2026-09-29 — owner-run checks, relayed by `fkit-lead` to a spawned `fkit-producer`; status unchanged, not closed.** §3 now complete: funnel events all arrive in GameAnalytics (22–28 Sep: Tap 631 · Started 631 · Abandoned 603 · Completed 12). §4 still **zero** `/reconcile` calls (11 `/complete`, all 200). Open finding, no task filed: GA counts 2 more Completed than the server's 10 grants in that range — not lost purchases, cause unknown; owner ruled "Leave it" 2026-09-29 (keep the note in `0297`). Still open: §1 construction (`0309`), §2 first box, §4, §5.)* | [`0297-paid-citizenship-owner-run-test-buy-sequence`](../tasks/backlog/0297-paid-citizenship-owner-run-test-buy-sequence/brief.md) |
| 🔲 Backlog *(parked by owner ruling 2026-09-27; approved plan.md kept; resume from Step 0 — was ~~🔄 In progress — driven by `/fkit-sprint-ship-loop` (fkit-lead), 2026-09-27~~)* | 35 *(append rank — bottom of the board, OWNER RULING 2026-09-27: *"put it to the end of the current sprint"*; was ~~6~~ after the third re-rank; ~~3~~ after the first and second; ~~23~~ append rank before them — owner re-ranks of 2026-09-26)* | **Player name loses its space ("First Last" shows as "FirstLast") — find where, and decide which characters a name may contain** *(🆕 **FILED 2026-09-26**, same request as `0307`, split out of it; a wider character rule waits for `0307` (soft dependency). ~~⚠️ Append rank, not merit — see the addendum below.~~ ✅ **Rank OWNER-RULED 2026-09-26** — see the **RE-RANK 2026-09-26** addendum below. ⬇️ **PARKED 2026-09-27 by owner ruling** — moved from rank 6 to the bottom; see the **PARK 2026-09-27** addendum directly below this table.)* | [`0308-player-name-loses-its-space-find-where-and-decide-which-characters-a-name-may-contain`](../tasks/backlog/0308-player-name-loses-its-space-find-where-and-decide-which-characters-a-name-may-contain/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | 36 *(append rank — placement OWNER-RULED 2026-09-27: *"End of Sprint 6 (Recommended)"*)* | **Prefill and lock the start-screen name to a citizen's approved name** *(🆕 **FILED 2026-09-27** — brief B1 of the `0317` report, on OWNER RULINGS on `0317` given 2026-09-27 live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent: D1 *"Yes, prefill first (Recommended)"*, D4 *"No, approved name locked (Recommended)"*. Client only; no trust gain — anyone can still type the same name (owner-accepted). See the **B1/B2 FILED 2026-09-27** addendum directly below this table.)* | [`0321-prefill-and-lock-the-start-screen-name-to-a-citizens-approved-name`](../tasks/done/0321-prefill-and-lock-the-start-screen-name-to-a-citizens-approved-name/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | 37 *(append rank — placement OWNER-RULED 2026-09-27: *"End of Sprint 6 (Recommended)"*)* | **Game server shows a citizen's approved name in multiplayer matches** *(🆕 **FILED 2026-09-27** — brief B2 of the `0317` report, on OWNER RULINGS on `0317` given 2026-09-27 live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent: D2 *"(a) Server swaps it in (Recommended)"*, D3 *"Accept, record as ADR (Recommended)"*, rude-name filter *"Keep filter, warn me first (Recommended)"*. Includes the re-check against the current name rule, the moderator warning, and an ADR by `fkit-architect` (accepted trust level until `0267`; updates ADR-103's scope). 🚨 Accepted risk until `0267`: a forged Yandex id gets the holder's approved name. After `0321` (soft). `0316`'s wording must be updated when this ships. See the addendum directly below this table.)* | [`0322-game-server-shows-a-citizens-approved-name-in-multiplayer-matches`](../tasks/done/0322-game-server-shows-a-citizens-approved-name-in-multiplayer-matches/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | 38 *(append rank — ⚠️ **NOT the owner-ruled placement.** The owner ruled *"directly above 0250"* (D3, 2026-09-27); that rank cannot be written without renumbering the closed `➡️ Moved` rows below `0250` (ADR-035). **By owner ruling this task is worked directly after `0250`'s slice S1, ahead of every other open row, whatever this number says.** See the addendum directly below this table.)* | **Verified login — check Yandex's signed player data at login and mint verified (`vfy:true`) sessions** *(🆕 **FILED 2026-09-27** on OWNER RULING D3 on `0250` — *"New task, above 0250 (Recommended)"* — given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. The `0250` design report's slices **S0** (owner-run spike in the live iframe), **S2** (shadow mode) and **S3a** (mint `vfy:true`), plus the ADR recording the first verified identity (owner sign-off pending). Blocks `0250` (slice S3b) and `0319`. Not the WebSocket-join step `0322` / ADR-103 need — that is a second step, not filed.)* *(📌 **2026-09-29 — S0 PASSED; unblocked, ready to build.** Status moved from ~~`🚧 Blocked — waiting on the OWNER-run S0 test`~~ to `🔲 Backlog`: the owner ran S0 live 2026-09-29 and **the key verifies Yandex's signed player data, via the decoded-JSON construction only** (worklog § *2026-09-29 — S0 result*, by `fkit-coder`). Recorded by a spawned `fkit-producer` from `fkit-lead`'s relay.)* *(✅ **2026-09-29 — CLOSED AS THE S2 BUILD, agent-closed — not owner-verified**, by OWNER RULING *"Split it (Recommended)"* (live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`): S0 passed; S2 (shadow mode) built and reviewed; ADR-116 accepted. **Not committed, not deployed.** S3a moved to [`0340`](../tasks/backlog/0340-0325-s3a-enforce-mint-verified-sessions/brief.md) and the live verification to [`0339`](../tasks/backlog/0339-verify-0325-s2-live-the-login-signature-check-in-production/brief.md) (both Sprint 7 — 📌 **2026-09-29, later:** `0339` then moved to this board by owner ruling, as the last row, owner-ruled top priority; `0340` stays on Sprint 7. See the `0339` addendum below this table.); `0250` S3b and `0319` now depend on `0340`.)* | [`0325-verified-login-check-yandex-signed-player-data-and-mint-verified-sessions`](../tasks/done/0325-verified-login-check-yandex-signed-player-data-and-mint-verified-sessions/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | 39 *(append rank — placement OWNER-RULED 2026-09-28: *"End of Sprint 6 (Recommended)"*; medium priority by that ruling)* | **Closing a joined private lobby's window does not leave the lobby — confirm, then fix so closing leaves** *(➡️ **MOVED IN FROM THE [BACKLOG BOARD](backlog.md) ON 2026-09-28** on an OWNER RULING given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Filed the same day from `0303` review R1: `JoinPrivateLobbyModal.close()` sends no `leave-lobby` and `closeAndLeave()` has no caller, so `handleLeaveLobby` never runs — the player may later be pulled into the match, and `0303`'s restart popup stays pending. Host window: same shape, check it. Confirm first, then fix + tests. Depends on nothing. Related `0303`, `0302`, `0252`, `0228`. See the *0327 MOVED IN 2026-09-28* addendum directly below this table.)* | [`0327-closing-a-joined-private-lobby-window-does-not-leave-the-lobby`](../tasks/done/0327-closing-a-joined-private-lobby-window-does-not-leave-the-lobby/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | 40 *(append rank — placement OWNER-RULED 2026-09-28: *"Yes, into Sprint 6 (Recommended)"* — *"Placed just before the new B1–B4 rows so B2 can follow it."*)* | **Citizenship card: apply only the newest profile read (fix the stale-read race in `refreshProfile`)** *(➡️ **MOVED IN FROM THE [BACKLOG BOARD](backlog.md) ON 2026-09-28** on an OWNER RULINGS on `0318` given 2026-09-28 live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Filed the same day from `0303` Q-C. Request counter + race test. Now a prerequisite of `0329` (B2 adds a second concurrent profile read). Depends on nothing. See the *0318 FOLLOW-UPS 2026-09-28* addendum directly below this table.)* | [`0326-citizenship-card-applies-only-the-newest-profile-read`](../tasks/done/0326-citizenship-card-applies-only-the-newest-profile-read/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | 41 *(append rank — placement OWNER-RULED 2026-09-28: *"End of Sprint 6 (Recommended)"*)* | **Analytics: `Session:PlatformDegraded:{Cause}` — count degraded boots by cause, and which follow a match exit** *(🆕 **FILED 2026-09-28** — brief B1 of the `0318` report, on OWNER RULINGS on `0318` given 2026-09-28 live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent: D-2 *"B1+B2+B3, B4 if confirmed (Recommended)"*. Causes `ScriptFailed`/`InitFailed`/`InitTimeout`/`NoPlayer`/`NoFlags`; value 1 after a match exit; optional `Session:PlatformRecovered`; reference-doc update. `citizenship_ui` is at 100% (owner fact), so the existing-data proxy is clean. Depends on nothing.)* | [`0328-analytics-event-session-platform-degraded-by-cause`](../tasks/done/0328-analytics-event-session-platform-degraded-by-cause/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | 42 *(append rank — placement OWNER-RULED 2026-09-28: *"End of Sprint 6 (Recommended)"*)* | **Citizenship card re-checks its gate when the Yandex platform recovers late** *(🆕 **FILED 2026-09-28** — brief B2 of the `0318` report, on OWNER RULINGS on `0318` given 2026-09-28 live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent: D-2. Fixes the root cause (card checks once, never again). Fail-closed from `0291` kept; the scheduled revisit of `0049`'s deferred recovery, not a reversal. Depends on `0326`.)* | [`0329-citizenship-card-re-checks-its-gate-when-the-platform-recovers-late`](../tasks/done/0329-citizenship-card-re-checks-its-gate-when-the-platform-recovers-late/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | 43 *(append rank — placement OWNER-RULED 2026-09-28: *"End of Sprint 6 (Recommended)"*)* | **Retry a failed Yandex SDK loader download (download only — never `init()`)** *(🆕 **FILED 2026-09-28** — brief B3 of the `0318` report, on OWNER RULINGS on `0318` given 2026-09-28 live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent: D-1 *"Retry download only (Recommended)"* — **narrows `0049`'s "no SDK retry" for script downloads only**; D-2. Backoff inside the 5 s deadline, then capped background retries into the late-recovery path. Depends on `0329`; `0328` recommended first.)* | [`0330-retry-a-failed-yandex-sdk-loader-download`](../tasks/done/0330-retry-a-failed-yandex-sdk-loader-download/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | 44 *(append rank — placement OWNER-RULED 2026-09-28: *"End of Sprint 6 (Recommended)"*)* | **Keep the query string on match exit — only if the owner's probe P1 confirms it matters** *(🆕 **FILED 2026-09-28** — brief B4 of the `0318` report, on OWNER RULINGS on `0318` given 2026-09-28 live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent: D-2 *"… B4 if confirmed"*. 🚩 **Step 0 is an OWNER-run read-only probe (P1)**; if it does not confirm, the task stops and returns to the owner. Coordinate with `0199`. Depends on no task.)* *(📌 **2026-09-29 — unblocked: owner probe P1 CONFIRMED trigger B** — owner-run in production, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037): first load `has("sdk")` true / length 120; after a match exit false / 0 (twice). **Step 0 done; ready for Step 1 (build).** Earlier status: `🚧 Blocked — waiting on owner probe P1 (0318 report §5); OWNER RULING 2026-09-28 "Park it: mark 0331 Blocked (Recommended)", relayed by fkit-lead`. ⚠️ A "Cancel it" answer given on a misread sample was treated as void by the lead; nothing was cancelled; standing ruling `0318` D-2 *"B1+B2+B3, B4 if confirmed (Recommended)"*; the owner may still ask to cancel. Detail: `0331/worklog.md`.)* *(✅ **CLOSED 2026-09-29 as the BUILD task — agent-closed, not owner-verified.** Built to the owner-approved plan; stateful review round 1 *"Ready to merge (validation-gated)"*, zero findings. ⚠️ **Not committed and not deployed** at close. Its brief verification item 4 (the owner's post-release P1 repeat) was **split out by OWNER RULING 2026-09-29** into [`0337`](../tasks/backlog/0337-verify-0331-in-production-the-sdk-query-parameter-survives-a-match-exit/brief.md), rank 1 on [Sprint 7](plan-sprint-7.md); that verify task does not block this sprint's deploy.)* | [`0331-keep-the-query-string-on-match-exit`](../tasks/done/0331-keep-the-query-string-on-match-exit/brief.md) |
| 🔲 Backlog | 45 *(append rank — ⚠️ **NOT the owner-ruled placement.** The owner ruled *"to the top of priorities"* (2026-09-29). Rank 1 on this board is held by the closed `0307`, and every rank above the first open row (`0250`, rank 9) is a closed row; writing `0339` at the top would renumber closed rows, which ADR-035 forbids **even under an owner ruling** (the `0325` row above hit the same wall). So it was **appended** after the highest rank (44). **By owner ruling this task is Sprint 6's TOP priority — ahead of every other open row, whatever this number says.** Its gate is unchanged: it cannot start until `0250` S1, then profile server S2, then game client S2 are deployed. Was ~~2~~ on [Sprint 7](plan-sprint-7.md).)* | **Verify 0325 S2 live — the login signature check in production (shadow mode)** *(🆕 **FILED 2026-09-29** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER RULING given live in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead`: split `0325` into the S2 build (closed) + this verify + `0340` (S3a). Owner-run, read-only: the server metric `geoconflict.profile.login.verification` (all 7 outcomes, the `ok` share) and the 4 `Profile:Login:Signature:*` client events; numbers only; the owner picks the watch window and threshold and makes the S2-exit call. ⚠️ **Precondition: `0250` S1 fully deployed (client, then profile server) → profile server S2 → game client S2.** ⚠️ **Does NOT block Sprint 6's deploy.** See the 2026-09-29 `0339`/`0340` addendum below this table.)* *(➡️ **MOVED IN FROM [SPRINT 7](plan-sprint-7.md) ON 2026-09-29** — OWNER RULING 2026-09-29, typed directly by the owner in the `fkit lead` session (the owner's own message, not an `AskUserQuestion` answer), relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Owner, verbatim: *"Mov ethe 0339 into the Sprint 6 to the top of priorities."* (typo as typed; meaning: move `0339` into Sprint 6, at the top of its priorities). Status and Task cells copied **verbatim** from the Sprint 7 row; any *"above"* / *"below"* / *"addendum below"* inside them refers to the Sprint 7 board. ⚠️ **This overrides, for `0339` only, the owner's same-day standing rule that a post-deploy verify task goes to the top of the NEXT sprint** — the latest explicit ruling wins. It still runs after the deploy and **does not block Sprint 6's deploy**. See the 2026-09-29 `0339` addendum below this table.)* | [`0339-verify-0325-s2-live-the-login-signature-check-in-production`](../tasks/backlog/0339-verify-0325-s2-live-the-login-signature-check-in-production/brief.md) |
| 🔲 Backlog | 46 *(append rank — ⚠️ **NOT the owner-ruled placement.** The owner ruled *"right below 0339"* (2026-09-29). `0339` itself sits at the append rank 45 with an owner-ruled "top priority" note, because ADR-035 forbids renumbering closed rows **even under an owner ruling**; the only rank directly below it is the next append rank. **By owner ruling, this task is worked directly after `0339`, ahead of every other open row except `0339`, whatever this number says.**)* | **Verify 0285 in production: deploy it and run its disabled-channel drill** *(🆕 **FILED 2026-09-29** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER RULING given live in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead`: *"File it, Sprint 6 (Recommended)"* — *"Put it in Sprint 6 right below 0339. 0289 lives in Sprint 6 and waits on it, and its deploy can ride the same weekend slot."* ⛔ Not producer precedent. Owner-run: the two deploys (profile box, then monitoring box, in the weekend slot — the profile half not before `0250` S1's client), the hand-run probe, the "no write" counters, and the drill (disable the channel with one SQL update, see check 13 FAIL and the dead-man's switch page, re-enable in the UI, see OK, confirm alerting live). Numbers, times and yes/no only. `0285`'s change is committed (`68303d5`), not deployed. **Blocks `0289`:** `0289`'s quiet window must not overlap this task's deploy or drill; this task's final "alerting is live" firing can be `0289`'s warm-up. ⚠️ Does **not** block Sprint 6's deploy. See the 2026-09-29 `0341` addendum below this table.)* | [`0341-verify-0285-in-production-deploy-it-and-run-its-disabled-channel-drill`](../tasks/backlog/0341-verify-0285-in-production-deploy-it-and-run-its-disabled-channel-drill/brief.md) |
| 🔲 Backlog | 47 *(append rank — the owner named no rank, so it was appended after this board's highest (46, `0341`); ⚠️ a position, **not** a merit rank and **not** owner-ruled. **On merit this belongs directly below `0339`**, because `0339`'s S2 exit is its gate, and **above `0250`**, whose slice S3b it blocks. Was ~~3~~ on [Sprint 7](plan-sprint-7.md). ⚠️ Rank is position, not "ready" — gated, see the brief.)* | **0325 S3a — enforce: mint verified (`vfy:true`) sessions at login** *(🆕 **FILED 2026-09-29**, same ruling and filing as `0339`. Plan steps 13–15 as approved in `0325`'s plan; server only; no response change. ⚠️ **Gate: `0339`'s S2 exit AND an explicit owner approval to enforce.** ⛔ Never roll S3a straight back to a pre-S2 build. ⛔ Shipping it triggers the ADR-113 dated note (architect). `0250` S3b, `0319`, `0332` and `0323` read `verified` after it and now depend on it.)* *(➡️ **MOVED IN FROM [SPRINT 7](plan-sprint-7.md) ON 2026-09-29** — OWNER RULING given live in the `fkit lead` session on 2026-09-29, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Owner, as relayed: *"Move 0340 into Sprint 6."* **Owner intent, as relayed:** `0250` — and so `0248` and `0301`, which wait on it — cannot close until this task ships, and all three are on this board. Status and Task cells copied **verbatim** from the Sprint 7 row; any *"above"* / *"below"* inside them refers to the Sprint 7 board. See the 2026-09-29 `0340` addendum below this table.)* | [`0340-0325-s3a-enforce-mint-verified-sessions`](../tasks/backlog/0340-0325-s3a-enforce-mint-verified-sessions/brief.md) |

> ➡️ **Addendum — 2026-09-29, latest: RULING C — Leaderboard Rewards, Coin Economy and Clans moved from `0342` (Backlog board) into `0343` (Sprint 8). Read the authority before the outcome.**
>
> **AUTHORITY.** An **OWNER RULING given 2026-09-29, live in the `fkit lead` session**, relayed by `fkit-lead` to a
> spawned `fkit-producer` holding **no owner channel** (ADR-021/037). ⛔ **Not producer precedent.** Owner, verbatim:
> *"Leaderboard Rewards, Coin Economy, Clans → Backlog — move that to the Sprint 8."* This **overrules the producer's
> borderline "no" calls** on those three recorded in the **brief-less rows** addendum below.
>
> **OUTCOME.**
> - The three items — agenda entries, dependencies, "To discuss" lists and verbatim appendix prose — moved out of
>   [`0342`](../tasks/backlog/0342-discussion-parked-features-not-tied-to-paid-citizenship/brief.md) and into
>   [`0343`](../tasks/backlog/0343-discussion-parked-features-tied-to-paid-citizenship/brief.md) (now items F, G, H).
>   Nothing lost, nothing duplicated: each item lives in exactly one brief.
> - **`0342` now holds:** 5b Server Restart UX, 5c Mobile Warning Screen, Historical Multiplayer Maps.
>   **`0343` now holds:** Paid Campaign Map Packs, Nickname Styling System, Map Voting for Verified Players, Replay
>   Access as Premium Feature, Custom Uploaded Flags & Patterns, Leaderboard — Rewards Layer, Coin Economy + Rewarded
>   Ads, Clans. `0343`'s title was reworded (it is no longer citizenship-only); **no task folder was renamed** (ADR-029).
> - The three rows (was rank 18, 20, 21) now read `➡️ Moved to [Sprint 8](plan-sprint-8.md) — priority 1`; the old
>   target is struck in the Status cell and the old brief link struck in the Brief cell. Nothing renumbered or deleted.
> - Same day, **RULING D** named Sprint 8 *"Paid Citizenship Perks and More Content"* — recorded on
>   [`plan-sprint-8.md`](plan-sprint-8.md). Its status stays `🔲 Backlog`.
>
> ⛔ **WHAT DID NOT HAPPEN.** No line-3 banner was touched; no task folder moved or was renamed; no mover skill was run;
> nothing was committed or pushed; nothing under `ai-agents/wiki-vault/` was touched.

> ➡️ **Addendum — 2026-09-29, later still: task `0340` MOVED IN FROM [SPRINT 7](plan-sprint-7.md), APPENDED at rank 47. Read the authority before the outcome.**
>
> **AUTHORITY.** An **OWNER RULING given 2026-09-29, live in the `fkit lead` session**, relayed by `fkit-lead` to a
> spawned `fkit-producer` holding **no owner channel** (ADR-021/037). ⛔ **Not producer precedent.** As relayed:
> *"Move 0340 into Sprint 6."* Reason given: `0250` (and so `0248` and `0301`) on this board cannot close until
> `0340` ships.
>
> **OUTCOME.**
> - `0340` (`0325` S3a — mint verified sessions) **appended as the last row, rank 47** (this board's highest was 46,
>   `0341`). Status copied **verbatim** from Sprint 7 (`🔲 Backlog`). **No status changed; nobody started anything.**
> - ⚠️ **Priority 47 is append rank, NOT a merit ranking — flagged for owner confirmation.**
>   **On merit this belongs directly below `0339`**, because `0339`'s S2 exit is `0340`'s gate, and above `0250`,
>   whose slice S3b waits on it. The owner named no rank; nothing was re-ranked (ADR-035).
> - The Sprint 7 row now reads `➡️ Moved to [Sprint 6](plan-sprint-6.md) — priority 47`; its cells are kept as history.
>   `0340`'s brief: `## Sprint` → `Sprint 6`, `## Priority` → `47`, earlier values kept, struck, with a dated note.
> - 🚨 **Consequence the ruling did not address — flagged, not settled:** `0340`'s gate is unchanged — `0339`'s S2
>   exit (a deploy, **then a watch window of days**) **plus a separate owner approval to enforce**, then its own
>   deploy and the ADR-113 note. So with `0339` and `0340` both here, **this sprint cannot close as fully done until
>   that whole chain has run**; `/fkit-sprint-done` would otherwise relocate them again. Owner's call whether that is
>   intended.
> - Tasks on other boards that depend on `0340` — `0332` and `0323` (Sprint 7), `0319` (Backlog board) — now wait on
>   a task on an earlier sprint. No change needed to them; their links point at the task folder, which did not move.
> - **No other row was renumbered or re-ranked.**
>
> ⛔ **WHAT DID NOT HAPPEN.** No line-3 banner was touched; no task folder moved; no mover skill was run; nothing was
> committed or pushed; nothing under `ai-agents/wiki-vault/` was touched.

> ➡️ **Addendum — 2026-09-29: the 11 BRIEF-LESS ROWS replaced by TWO DISCUSSION BRIEFS (`0342` → Backlog board, `0343` → Sprint 8). Read the authority before the outcome.**
>
> **AUTHORITY.** An **OWNER RULING given 2026-09-29, live in the `fkit lead` session**, relayed by `fkit-lead` to a
> spawned `fkit-producer` holding **no owner channel** (ADR-021/037). ⛔ **Not producer precedent.** The owner's
> words, as relayed: split the rows that have no brief into separate briefs; *"each brief should have a list of the
> things that should be discussed (not implemented, but discussed)"*. The split test, **delegated to the producer
> by the owner**: *"is the task related to the paid citizenship? If yes, put this brief into Sprint 8. If no — put
> it into Backlog."* End state: exactly two briefs.
>
> **OUTCOME.**
> - **New brief [`0342`](../tasks/backlog/0342-discussion-parked-features-not-tied-to-paid-citizenship/brief.md)**
>   on the [Backlog board](backlog.md) (unranked) — the "no" items: **5b** Server Restart UX, **5c** Mobile Warning
>   Screen, **Historical Multiplayer Maps** (was rank 16), **Leaderboard — Rewards Layer** (18), **Coin Economy +
>   Rewarded Ads Full Version** (20), **Clans** (21).
> - **New brief [`0343`](../tasks/backlog/0343-discussion-parked-features-tied-to-paid-citizenship/brief.md)**
>   on the **new** [Sprint 8](plan-sprint-8.md) board (created today, `🔲 Backlog`, not started) at rank 1 — the
>   "yes" items: **Paid Campaign Map Packs** (was rank 17), **Nickname Styling System** (19), **Map Voting for
>   Verified Players** (22), **Replay Access as Premium Feature** (23), **Custom Uploaded Flags & Patterns — Paid
>   Citizens Only** (24).
> - ⚠️ **Borderline calls — the producer's, for the owner to overrule:** Paid Campaign Map Packs → *yes* (a separate
>   product, but the prose says a pack purchase grants citizenship and suggests a free pack as a citizen perk); Map
>   Voting → *yes* ("verified" = citizens; earned vs paid not stated); Replay Access → *yes* ("premium tier" read as
>   citizenship; archival `0030` is already citizen-gated); Leaderboard Rewards → *no* (badges are earned, never
>   sold); Coin Economy → *no* (earned currency, paid-adjacent but not citizenship); Clans → *no* (its paid parts are
>   its own).
>   📌 *Later on 2026-09-29, **owner ruling C** overruled the last three "no" calls: Leaderboard Rewards, Coin Economy and Clans moved to `0343` / Sprint 8 — see the **ruling C** addendum above. The lists in this addendum are kept as written.*
> - The 11 rows now read `➡️ Moved to [Backlog](backlog.md)` or `➡️ Moved to [Sprint 8](plan-sprint-8.md) — priority 1`,
>   each Brief cell's old text struck and the new brief linked after it. Priority and Task cells kept as history.
>   **No row was deleted or renumbered** (ADR-035).
> - **Nothing is lost.** Every word of each row's prose (this board's § *Task 0b*, § *Task 0c*, § *Task 1*,
>   § *Task 2*, § *Player Demand Signal*, § *Notes*; [`done/plan-sprint-3.md`](done/plan-sprint-3.md) § 5b, § 5c;
>   [`done/plan-sprint-5.md`](done/plan-sprint-5.md) § 8a, 10, 11, 12, 13, 14, 15) is copied **verbatim** into an
>   appendix of the brief it went to. The sections themselves stay where they are.
> - The open owner decision in the note above the table (*"author fresh briefs [for 5b/5c] or leave the rows
>   brief-less"*) is **answered** by this ruling.
> - **No mover was needed:** nothing is done or cancelled; these are relocations.
>
> ⛔ **WHAT DID NOT HAPPEN.** This board's line-3 banner was not touched, nor Sprint 7's; no task folder moved; no
> mover skill was run; nothing was committed or pushed; nothing under `ai-agents/wiki-vault/` was touched.

> 🆕 **Addendum — task `0341` added out of band (2026-09-29): "verify `0285` in production", owner-ruled placement directly after `0339`, APPENDED at rank 46. Read the authority before the outcome.**
>
> **AUTHORITY.** An **OWNER RULING given 2026-09-29, live in the `fkit lead` session via `AskUserQuestion`**, relayed
> by `fkit-lead` to a spawned `fkit-producer` holding **no owner channel** (ADR-021/037). ⛔ **Not producer precedent.**
> The question: *"File the missing 'verify 0285' task (deploy it + run its drill), so 0289 can move? Where should it
> go?"* The answer: **"File it, Sprint 6 (Recommended)"** — *"Put it in Sprint 6 right below 0339. 0289 lives in Sprint 6
> and waits on it, and its deploy can ride the same weekend slot."*
>
> **OUTCOME.**
> - [`0341`](../tasks/backlog/0341-verify-0285-in-production-deploy-it-and-run-its-disabled-channel-drill/brief.md)
>   **appended as the last row, rank 46** (this board's highest was 45, `0339`). Status `🔲 Backlog`.
> - 🚨 **The number is append rank, not a merit ranking.** The owner ruled *"right below 0339"*; `0339` is itself at the
>   append rank 45 carrying an owner-ruled "top priority" note, because ADR-035 forbids renumbering closed rows even under
>   an owner ruling. **By owner ruling `0341` is worked directly after `0339`, ahead of every other open row except
>   `0339`, whatever its number says.** On merit: directly below `0339`, above `0289`.
> - **Why it exists:** `0285` closed 2026-09-28 (agent-closed — not owner-verified) with its deploy, real run, drill and
>   "no write" check never done (`0285` worklog § *NOT verified here — owner steps*), and no follow-up filed — before the
>   owner's same-day rule that a build task whose proof needs a deploy gets a separate verify task. `0289` waited on
>   "`0285` deployed and its drill done", which nothing tracked.
> - **Repointed:** the `0289` row's Status cell and `0289`'s brief (`## Status` and `**Depends on:**`) now name `0341`,
>   with the earlier text kept and dated. `0285`'s closed brief got a dated pointer note only (no status change). The
>   closed `0285` row on this board was **not** touched.
> - **Order constraint:** `0289`'s quiet window must not overlap `0341`'s deploy (restarts the relay) or its drill
>   (disables the channel). `0341`'s final "alerting is live" firing can be `0289`'s warm-up (`0289` plan Q3).
> - `0285`'s change is **committed** (`68303d5`) and **not deployed** (last window 2026-09-26). Its profile half rides the
>   weekend slot's profile deploy (not before `0250` S1's client — every profile build from this tree carries S1's
>   server half); its monitoring-box half is `npm run deploy:telemetry`.
> - **No other row was renumbered or re-ranked.**
>
> ⛔ **WHAT DID NOT HAPPEN.** This board's line-3 banner was not touched; no task folder moved; no mover skill was run;
> nothing was committed or pushed; nothing under `ai-agents/wiki-vault/` was touched.

> ➡️ **Addendum — 2026-09-29, later: task `0339` MOVED IN FROM [SPRINT 7](plan-sprint-7.md) — owner-ruled TOP priority, APPENDED at rank 45. Read the authority before the outcome.**
>
> **AUTHORITY.** An **OWNER RULING given 2026-09-29, typed directly by the owner in the `fkit lead` session** (the
> owner's own message, not an `AskUserQuestion` answer), relayed by `fkit-lead` to a spawned `fkit-producer` holding
> **no owner channel** (ADR-021/037). ⛔ **Not producer precedent.** Verbatim: *"Mov ethe 0339 into the Sprint 6 to the top of priorities."* (typo as typed; meaning: move `0339` into Sprint 6, at the top of its priorities).
>
> **OUTCOME.**
> - `0339` (verify `0325` S2 live) **appended as the last row, rank 45** (this board's highest was 44, `0331`).
>   Status copied **verbatim** from Sprint 7 (`🔲 Backlog`). **No status changed.**
> - 🚨 **The number is NOT the owner-ruled placement.** The owner ruled *"to the top of priorities"*. Rank 1 is held
>   by the closed `0307`, and every row ranked 1–8 is closed (there is no rank 6; the first open row is `0250` at 9, and closed rows
>   interleave the open ones further down). Putting `0339` at the top would renumber closed rows, and ADR-035 forbids
>   that **even under an owner ruling** — the same wall the `0325` row hit on 2026-09-27. So it was appended. **By
>   owner ruling `0339` is this board's TOP priority, ahead of every other open row, whatever its number says.**
>   Recorded as a relative merit statement in the brief too (ADR-035): *on merit, above `0250`*.
> - **No other row was renumbered or re-ranked.** The closed `0325` row got a dated note that `0339` is now here.
> - **Gate unchanged.** `0339` cannot start until `0250` S1 (client, then profile server), then profile server S2, then
>   game client S2 are deployed. "Top priority" means it goes first once that gate opens. It **does not block this
>   sprint's deploy** — it runs after it.
> - ⚠️ **Overrides a same-day standing rule, for `0339` only.** Earlier on 2026-09-29 the owner ruled that a
>   post-deploy verify task goes to the top of the NEXT sprint so it does not block the current sprint's deploy. This
>   later, explicit ruling places `0339` here anyway; the latest explicit ruling wins. Not reopened.
> - ⚠️ **Consequence the ruling did not address — flagged, not settled:** `0339` needs a deploy *and then* a watch window
>   of days before its S2-exit call. While it is open on this board, **this sprint cannot close as fully done** —
>   `/fkit-sprint-done` would relocate it again. Owner's call whether that is intended.
> - `0340` (S3a) **stays on Sprint 7**, by instruction; its brief and row got dated notes.
>
> ⛔ **WHAT DID NOT HAPPEN.** This board's line-3 banner was not touched; Sprint 7's banner was not touched; no task
> folder moved; no mover skill was run; nothing was committed or pushed; nothing under `ai-agents/wiki-vault/` was
> touched.

> ➡️ **Addendum — 2026-09-29: epic `0213` MOVED OUT TO [SPRINT 7](plan-sprint-7.md). Read the authority before the outcome.**
>
> **AUTHORITY.** An **OWNER RULING given 2026-09-29, typed directly by the owner in the `fkit lead` session** (the
> owner's own message, not an `AskUserQuestion` answer), relayed by `fkit-lead` to a spawned `fkit-producer` holding
> **no owner channel** (ADR-021/037). ⛔ **Not producer precedent.** Verbatim: *"Move 0213 into Sprint 7."*
>
> **OUTCOME.**
> - The `0213` row (was rank 29, `🔲 Backlog`) now reads `➡️ Moved to [Sprint 7](plan-sprint-7.md) — priority 14`.
>   Its Priority, Task and Brief cells are kept as history. **No row was deleted or renumbered** (ADR-035). Its
>   Status cell was copied **verbatim** to the new Sprint 7 row. **No status changed; nobody started anything.**
> - **Why it fits:** `0213` is an epic; its only open child phases, `0219` (P4) and `0221` (P6), were already moved
>   to Sprint 7 on 2026-09-27. The epic now sits on the same board as its open children.
> - **Placement on Sprint 7: rank 14 — appended after that board's highest rank (13, `0336`).** The owner named no
>   placement; ⚠️ **a position, not a merit rank and not owner-ruled.** No other Sprint 7 row was re-ranked.
> - **Brief:** `## Sprint` → `Sprint 7` (old value struck, kept) with a dated moved note citing this ruling;
>   `## Priority` gets rank 14 on top with the Sprint 6 rank 29 struck beneath it. `## Status` untouched.
>   **No task folder moved; no mover skill was run.**
> - **Links repointed so the chain lands on Sprint 7:** the `0213` rows on [Sprint 5](done/plan-sprint-5.md) and
>   [Sprint 4](done/plan-sprint-4.md) (both pointed here) now point at Sprint 7, each with a dated note naming the
>   Sprint 6 hop. No Backlog-board row links `0213`.
>
> ⛔ **WHAT DID NOT HAPPEN.** This board's line-3 banner was not touched; no other row changed; Sprint 7's line-3
> banner (`🔲 Backlog`) was not touched — Sprint 7 is still not started; nothing was committed or pushed; nothing
> under `ai-agents/wiki-vault/` was touched.

> 🆕 **Addendum — 2026-09-28: `0318` follow-ups — task `0326` MOVED IN from the [Backlog board](backlog.md), and `0318`'s briefs B1–B4 FILED as `0328`–`0331`; all five APPENDED as the last rows. Read the authority before the outcome.**
>
> **AUTHORITY.** **OWNER RULINGS on `0318` given 2026-09-28 live in the `fkit lead` session via
> `AskUserQuestion`**, relayed by `fkit-lead` (inside `/fkit-sprint-ship-loop`) to a spawned `fkit-producer`
> holding **no owner channel** (ADR-021/037). ⛔ **Not producer precedent.** Verbatim answers:
> - **D-1:** *"Retry download only (Recommended)"* — option text: *"A couple of retries within the 5 s start-up
>   limit, then quiet background retries. Never retry Yandex's start-up call itself. ~1 day."* ⇒ **narrows
>   `0049`'s "no SDK retry" for script downloads only** (dated note added to `0049`'s brief).
> - **D-2:** *"B1+B2+B3, B4 if confirmed (Recommended)"* — option text: *"Measure, re-check late, retry the
>   download, and fix the match-exit address if the check confirms it."*
> - **D-3:** *"Don't remember"* — option text: *"Rely on the console check and the new event instead."*
> - **Owner fact:** `citizenship_ui` is served to 100% of Yandex players — *"Yes, 100%"*, option text
>   *"Existing data gives a clean estimate."*
> - **Placement of B1–B4:** *"End of Sprint 6 (Recommended)"* — option text: *"Like the other follow-ups today;
>   the loop reaches them after the tasks already queued."*
> - **Pull `0326` into Sprint 6:** *"Yes, into Sprint 6 (Recommended)"* — option text: *"Placed just before the
>   new B1–B4 rows so B2 can follow it."*
>
> **OUTCOME.**
> - Five rows **appended** at ranks **40–44**, in this order: `0326` (moved in), `0328` (B1), `0329` (B2),
>   `0330` (B3), `0331` (B4). This board's highest rank was 39 (`0327`). **Appended, never inserted**
>   (ADR-035); no other row moved or was renumbered. The ranks are append positions, not merit ranks; they do
>   **not** override `0325`'s ruled place ahead of every other open row.
> - Dependencies (recorded in the briefs, where the loop reads them): `0329` after `0326`; `0330` after `0329`
>   (`0328` recommended first); `0331` gated on the owner's read-only probe **P1** (its step 0) — if P1 does not
>   confirm, it stops and returns to the owner; `0328` depends on nothing.
> - The [Backlog board](backlog.md) `0326` row now reads `➡️ Moved to Sprint 6 — priority 40` (kept, not deleted).
>   The [`0326` brief](../tasks/done/0326-citizenship-card-applies-only-the-newest-profile-read/brief.md):
>   `## Sprint` now `Sprint 6` (was ~~Backlog~~), `## Priority` now `40` (was ~~Unscheduled~~), `Blocks` now
>   `0329` (was ~~nothing~~) — struck, not deleted.
> - The [`0318` brief](../tasks/done/0318-investigate-citizenship-card-vanishes-after-a-match-on-a-shaky-connection/brief.md)
>   gained an *Owner rulings (2026-09-28)* section; its `## Status` was **not** changed (the lead routes the close).
>
> ⛔ **WHAT DID NOT HAPPEN.** No existing row's status or rank changed; no task folder moved; no mover skill was
> invoked; the line-3 banner was not touched; nothing under `ai-agents/wiki-vault/` was touched; nothing was
> committed or pushed.

> ➡️ **Addendum — 2026-09-28: task `0327` MOVED IN from the [Backlog board](backlog.md) and APPENDED as the last row. Read the authority before the outcome.**
>
> **AUTHORITY.** An **OWNER RULING given 2026-09-28 live in the `fkit lead` session via `AskUserQuestion`**,
> relayed by `fkit-lead` (inside `/fkit-sprint-ship-loop`) to a spawned `fkit-producer` holding **no owner
> channel** (ADR-021/037). ⛔ **Not producer precedent.** Asked where `0327` should go. Verbatim answer:
> *"End of Sprint 6 (Recommended)"*. Option text, verbatim: *"Queued in the current sprint, medium priority; the
> loop reaches it after the tasks already queued."*
>
> **OUTCOME.**
> - One row **appended** at rank **39** (`0327`) — this board's highest rank was 38 (`0325`). **Appended, never
>   inserted** (ADR-035); no other row moved or was renumbered. The rank is the append position; the owner's
>   ruling makes it **medium** priority. It does **not** override `0325`'s ruled place ahead of every other open
>   row.
> - The [Backlog board](backlog.md) row now reads `➡️ Moved to Sprint 6 — priority 39` (kept, not deleted).
> - The [`0327` brief](../tasks/done/0327-closing-a-joined-private-lobby-window-does-not-leave-the-lobby/brief.md):
>   `## Sprint` now `Sprint 6` (was ~~Backlog~~), `## Priority` now `39` (was ~~Unscheduled~~), both struck, not
>   deleted. Its producer-only "Medium, or Low if the pull-in does not reproduce" note is superseded on the
>   *medium* part by the ruling.
> - Same ruling session, second ruling: [`0252`](../tasks/backlog/0252-in-page-leave-wider-per-game-leak-renderer-transport-lobby-poll/brief.md)'s
>   wrong route-table row (closing the private-lobby modal sends `leave-lobby`) was **struck** with a dated note.
>   `0252`'s own rank is **unchanged** — left for the owner.
>
> ⛔ **WHAT DID NOT HAPPEN.** No status changed (`0327` stays `🔲 Backlog`); no task folder moved; no mover skill
> was invoked; the line-3 banner was not touched; nothing under `ai-agents/wiki-vault/` was touched; nothing was
> committed or pushed.

> 🆕 **Addendum — 2026-09-27: task `0325` (verified login) added out of band, from `0250`'s design; placement ruled "directly above 0250" but APPENDED. Read the authority before the outcome.**
>
> **AUTHORITY.** OWNER RULINGS on `0250` given **2026-09-27 live via `AskUserQuestion` in the `fkit lead`
> session**, relayed by `fkit-lead` to a spawned `fkit-producer` holding **no owner channel** (ADR-021/037).
> ⛔ **Not producer precedent — for filing or for re-ranking.** Verbatim: D1 *"Raw facts: paid + date"* · D2
> *"Paid only (Recommended)"* · D3 *"New task, above 0250 (Recommended)"* (option text: *"Its own build task in
> Sprint 6, directly above 0250; 0250 waits on it. 0267 (the identity investigation) is closed or narrowed using
> this report."*) · D4 *"Accept all (Recommended)"* · D5 *"Fix all 4 in 0250 (Recommended)"*. Full record, with
> every option text: *Owner rulings (2026-09-27)* in the
> [`0250` brief](../tasks/backlog/0250-authenticated-profile-read-for-paid-entitlement/brief.md). Source:
> [`2026-09-27-0250-authenticated-profile-read-design.md`](../knowledge-base/reports/2026-09-27-0250-authenticated-profile-read-design.md).
>
> **OUTCOME.**
> - One row **appended** at rank **38** (`0325`) — this board's highest rank was 37 (`0322`). **Appended, never
>   inserted** (ADR-035); no other row moved or was renumbered.
> - ⚠️ **The owner's placement — "directly above 0250" — could NOT be written as a rank.** `0250` sits at rank 9,
>   the first open row under the closed top rows. Between it and the bottom of the board sit **closed `➡️ Moved`
>   rows** (`0027`, and the four rows moved to Sprint 7 at ranks 27, 28, 30, 31). Moving the new row up to
>   rank 9 would renumber them, and ADR-035's closed-row rule admits **no exception, not even under an owner
>   ruling**. The furthest an owner-ruled re-rank could reach is rank 32 (the open run 32–38), which is not
>   the ruled spot either, so nothing was re-ranked.
> - ✅ **The ruled order is carried instead by:** (1) the dependency — `0250`'s slice S3b hard-depends on
>   `0325`, so `0250` cannot finish first; and (2) this note — **`0325` is worked directly after `0250`'s slice
>   S1, ahead of every other open row on this board, whatever its rank number says.** 🚩 Flagged for owner
>   confirmation: if the owner wants the rank number itself to match, that needs a ruling on ADR-035's
>   closed-row rule, not a re-rank.
> - **`0250`** (rank 9): owner now `fkit-coder`; slices **S1** (leak fix, all four leaks, no dependency, deploy
>   the client first) then **S3b** (verified-only view with the raw paid facts, after `0325`). Status unchanged.
> - **Dependencies recorded:** `0325` depends on nothing on the boards (its spike S0 needs the owner in the live
>   iframe); blocks `0250` (S3b) and `0319`. Dated notes added to `0248` (unchanged, paid-only, waits on `0250`
>   S3b), `0299` (may use the raw `is_paid_citizen` for verified callers), `0319` (now depends on `0325`),
>   `0322` (the WebSocket-join second step, not filed) and `0267` (Yandex half answered).
> - 🚩 **Pending producer/owner step, NOT done:** close or narrow `0267` using the report (D3). 🚩 **Not filed:**
>   the WebSocket-join step that `0322` and ADR-103's exit need on top of `0325`.
>
> ⛔ **WHAT DID NOT HAPPEN.** No status changed (`0250` stays `🔄 In progress`); no task folder moved; no mover
> skill was invoked; no row was renumbered; the line-3 banner was not touched; no ADR was written (it is
> `0325`'s deliverable); nothing under `ai-agents/wiki-vault/` was touched; nothing was committed or pushed.

> 🆕 **Addendum — 2026-09-27: tasks `0321` and `0322` added out of band, from `0317`'s findings. Read the authority before the outcome.**
>
> **AUTHORITY.** OWNER RULINGS on `0317` given **2026-09-27 live via `AskUserQuestion` in the `fkit lead`
> session**, relayed by `fkit-lead` to a spawned `fkit-producer` holding **no owner channel** (ADR-021/037).
> ⛔ **Not producer precedent.** Verbatim: D1 *"Yes, prefill first (Recommended)"* · D2 *"(a) Server swaps it in
> (Recommended)"* · D3 *"Accept, record as ADR (Recommended)"* · D4 *"No, approved name locked (Recommended)"* ·
> rude-name filter *"Keep filter, warn me first (Recommended)"* · placement of B1 and B2 *"End of Sprint 6
> (Recommended)"*. Full record, with option texts, D5 and D6: the *Owner rulings* section of the
> [`0317` brief](../tasks/done/0317-investigate-show-a-citizens-approved-name-in-matches/brief.md).
>
> **OUTCOME.**
> - Two rows **appended** at ranks **36** (`0321`, B1) and **37** (`0322`, B2) — this board's highest rank was 35
>   (`0308`). **Appended, never inserted** (ADR-035); no other row moved or was renumbered.
> - ✅ **The ranks are owner-ruled placement, not a producer guess.** On merit both sit directly below `0317`, in
>   that order: `0321` softens `0322`'s failure case (a slow lookup).
> - Dependencies: `0321` none; `0322` hard on `0307` (done), soft on `0321`, `0267`, `0308`. `0322` blocks `0323`.
> - **D5** (the mark) became `0323`, filed at the end of [Sprint 7](plan-sprint-7.md) per the owner's words.
>   **D6** (look-alike names) is recorded as a note in the
>   [`0308` brief](../tasks/backlog/0308-player-name-loses-its-space-find-where-and-decide-which-characters-a-name-may-contain/brief.md).
> - 🚩 **Flagged, not settled:** `0316` (approve-message wording, still open) must be updated when `0322` ships.
>   Its brief was **not** edited here.
>   - 📌 **Settled 2026-09-28 by OWNER RULING "Keep the short text": no reword.** (Append-only; given live via
>     `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer`, ADR-021/037.)
>
> ⛔ **WHAT DID NOT HAPPEN.** `0317`'s status was not changed (the lead routes its close separately); no task
> folder moved; no mover skill was invoked; the line-3 banner was not touched; nothing was committed or pushed;
> nothing under `ai-agents/wiki-vault/` was touched.

> ⬇️ **Addendum — 2026-09-27: PARK — `0308` RESET TO `🔲 Backlog` AND MOVED TO THE BOTTOM OF THE BOARD. Read the authority before the outcome.**
>
> **AUTHORITY.** An **OWNER RULING given 2026-09-27 live in the `fkit lead` session via `AskUserQuestion`** —
> the owner's own free-text answer, not a listed option — relayed by `fkit-lead` to a spawned `fkit-producer`
> holding **no owner channel** (ADR-021/037). ⛔ **Not producer precedent for re-ranking.** Verbatim:
> *"Let's come back to this task later, decrease the priority and put it to the end of the current sprint"*
> ("this task" = `0308`).
>
> **OUTCOME.**
> - [`0308`](../tasks/backlog/0308-player-name-loses-its-space-find-where-and-decide-which-characters-a-name-may-contain/brief.md)
>   **status** `🔄 In progress` (set by `/fkit-sprint-ship-loop`, 2026-09-27) → **`🔲 Backlog`**, on the row and in the
>   brief's `## Status`. The build had **not** started; **no source file changed**.
> - **Rank 6 → 35**, the next append rank (this board's highest was `0297`, 34). The row was physically moved to
>   be the **last row**, below `0297`; its Priority cell keeps its earlier values, struck.
> - **No other row was renumbered** (ADR-035). Rank **6 is now an unused gap** on purpose: closing it would
>   renumber every row from 7 to 34, and that range holds four `➡️ Moved` rows (27, 28, 30, 31), which are never
>   renumbered, not even under an owner ruling. Rows 7 and up keep their numbers and their order.
> - The owner-approved [`plan.md`](../tasks/backlog/0308-player-name-loses-its-space-find-where-and-decide-which-characters-a-name-may-contain/plan.md)
>   (blob `f7a579d`, owner rulings Q0–Q4) is **kept** — not deleted, not re-authored. ⚠️ A later run must
>   re-present it at the plan gate before building (the ship-loop rule). Resume from Step 0.
> - The brief's `## Priority` now reads 35 (6 struck, kept), and it gained a dated addendum holding the ruling,
>   the kept-plan note, and **Step 0 partial evidence (2026-09-27)** — shapes only, no real name: the portal
>   `displayName` read was probably the owner's **second** account and its separator is a plain space (U+0020);
>   the **main** account was **not** checked.
>
> ⛔ **WHAT DID NOT HAPPEN.** No other task's status, rank or brief changed; no task folder moved; no mover skill
> was invoked; the line-3 banner was not touched; nothing was committed or pushed; nothing under
> `ai-agents/wiki-vault/` was touched.

> ➡️ **Addendum — 2026-09-27: FIVE ROWS MOVED OUT TO [SPRINT 7](plan-sprint-7.md). Read the authority before the outcome.**
>
> **AUTHORITY.** An **OWNER RULING given live in the `fkit lead` session on 2026-09-27**, typed by the owner
> (not an `AskUserQuestion` answer), relayed by `fkit-lead` to a spawned `fkit-producer` holding **no owner
> channel** (ADR-021/037). ⛔ **Not producer precedent.** Verbatim: *"Move the tasks 0027, 0030, 0032, 0219, 0221 to the Sprint 7"*.
>
> **OUTCOME.**
> - **Sprint 7 did not exist; it was created for this ruling** — [`plan-sprint-7.md`](plan-sprint-7.md), line-3
>   banner `🔲 Backlog — 2026-09-27`. ⛔ **The owner did NOT start it.** This board stays the active sprint; its
>   line-3 banner was **not** touched.
> - **Moved, in this board's order:** `0027` (unranked), `0030` (Sprint 7 rank 1), `0032` (2), `0219` (3), `0221` (4).
>   Sprint 7 ranks are **positions** (this board's order carried across), not merit, not owner-ruled.
> - **Here, each of those rows now reads `➡️ Moved to [Sprint 7](plan-sprint-7.md) — priority N`** (`unranked`
>   for `0027`). Its Priority, Task and Brief cells are kept as history. **No row was deleted or renumbered**
>   (ADR-035). The Status cell each row carried was copied **verbatim** to its Sprint 7 row — the three
>   `🚧 Blocked` rows (`0032`, `0219`, `0221`) keep their Blocked status and reasons there. **No status changed.**
> - **The five briefs:** `## Sprint` → `Sprint 7` (old value struck, kept); a one-line moved note citing this
>   ruling; for the four ranked briefs, `## Priority` gets the new position rank on top with the Sprint 6 rank struck
>   beneath it. `## Status` untouched. **No task folder moved; no mover skill was run.**
> - **Links repointed so each chain lands on Sprint 7:** the four rows on [Sprint 5](done/plan-sprint-5.md) and the
>   four on [Sprint 4](done/plan-sprint-4.md) that sent `0030`, `0032`, `0219`, `0221` onward (they pointed here)
>   now point at Sprint 7, each with a note naming the Sprint 6 hop. No Backlog-board row links any of the five.
> - ⚠️ **Two consequences the ruling did not address — flagged, not settled:**
>   - `0027` is the **feeder brief for Tasks 1 and 2** (the map work), which **stay on this board**. The feeder now
>     sits a board *behind* its consumers. Harmless while both map briefs are deferred until after the launch, but
>     worth the owner's eye.
>   - `0219` and `0221` carry the 2026-09-26 ruling *"All wait for Sprint 6 (Recommended)"* (their deploy-coupled
>     steps run in Sprint 6). **Read by the producer as superseded by this move** — those steps now wait for
>     Sprint 7. Open to owner correction.

> ➡️ **Addendum — 2026-09-26: SIXTEEN ROWS APPENDED, MOVED IN FROM [SPRINT 5](done/plan-sprint-5.md). Read the authority before the outcome.**
>
> **AUTHORITY.** An **OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on
> 2026-09-26**, relayed by `fkit-lead` to a spawned `fkit-producer` holding **no owner channel**
> (ADR-021). ⛔ **Not producer precedent.** The owner's goal, verbatim: *"make another release
> today/tomorrow to finally ship the profile/citizenship feature to users ... move everything from the
> Sprint 5, that is not related to that goal, to the next sprint (Sprint 6)."* Asked where those rows
> should go, the owner chose **"Append to Sprint 6 (Recommended)"**. Full record: the 2026-09-26
> addendum under [`plan-sprint-5.md`](done/plan-sprint-5.md)'s status table.
>
> **OUTCOME.** Appended at the bottom of this table in Sprint 5's order, ranks **3–18** (this board's
> highest rank was 2): Sprint 5 plan Tasks 10, 8a, 11, 12, 14, 13, 15 (ranks 3–9, no briefs — their prose
> stays on the Sprint 5 board), then `0285`, `0289`, `0030`, `0032`, `0213`, `0219`, `0221`, `0286`, `0298`
> (ranks 10–18).
> - **Appended, never inserted** (ADR-035). The five rows already here did not move and were not renumbered.
> - **Status cells copied verbatim** from Sprint 5 — including the `🚧 Blocked` reasons, which still
>   describe each task's real state. Task and Brief cells are verbatim too, with a moved note on each Task
>   cell.
> - **A move is not a re-rank on merit.** Ranks 3–18 are append positions; owner-ruled merit labels stay
>   in the briefs.
> - 📌 **This board is still `🔲 Backlog`.** Nothing here has started because of this move.
>
> ⛔ **WHAT DID NOT HAPPEN.** No task's `## Status` token changed; no task folder moved; no mover skill
> was invoked; nothing was committed or pushed; nothing under `ai-agents/wiki-vault/` was touched.

> 📌 **Addendum — 2026-09-26, later the same day: TWO FOLLOW-UP OWNER RULINGS. Ruling first, then effect.**
>
> **AUTHORITY (both).** An OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on 2026-09-26, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021); ⛔ not producer precedent.
>
> **RULING 1 — deploy-coupled steps WAIT for Sprint 6.** Asked *"Some tasks moved to Sprint 6 have steps that
> could happen during a deploy (0219, 0221, 0286 step 8, 0298 part A). Ride along with today's launch, or all
> wait?"*, the owner chose, verbatim: **"All wait for Sprint 6 (Recommended)"**.
> - **Effect:** the launch release (the profile/citizenship go-live on [Sprint 5](done/plan-sprint-5.md)) carries
>   **none** of the deploy-coupled steps of `0219`, `0221`, `0286` (plan step 8) or `0298` (Part A). They run
>   in Sprint 6, on a deploy of their own. Do not fold them into the launch deploy to save a trip.
> - A one-line pointer to this ruling was added under `## Sprint` in each of the four briefs, because an
>   executor reads the brief, not this board.
> - ⚠️ **Flag, not settled here:** `0286`'s brief already records *"Plan step 8 ran"* in a 2026-09-26 deploy
>   window, and `0298`'s brief records its Part A first real run at W12 (0.0.152). So this ruling governs
>   whatever deploy-coupled work is **still left** in them; it does not undo or re-open what already ran.
>   Whether either task has anything deploy-coupled left is a question for its own close, not this note.
>
> **RULING 2 — the map briefs are written AFTER the launch.** Asked *"Sprint 6 notes and task 0027 say 'write
> the map briefs once Sprint 5 is underway'. When should the producer write them?"*, the owner chose,
> verbatim: **"After the launch (Recommended)"**.
> - **Effect:** Tasks 1 and 2 (Historical Multiplayer Maps, Paid Campaign Map Packs) stay `TBD` until the
>   profile/citizenship launch has shipped. *"Sprint 5 is underway"* in the status note, the `0027` row and
>   the Notes section below is now read as **"after the launch"** — Sprint 5 started 2026-09-26, but that
>   start alone does **not** trigger the brief writing. Those lines are left as written; this note governs.
> - Recorded in [`0027`'s brief](../tasks/backlog/0027-new-maps-community-demand/brief.md) too.
>
> ⛔ **WHAT DID NOT HAPPEN.** No status token, rank, row or task folder changed; no mover skill was invoked;
> nothing was committed; nothing under `ai-agents/wiki-vault/` was touched.

> 🆕 **Addendum — tasks `0301` and `0302` added out of band (2026-09-26).**
>
> **AUTHORITY.** An **owner request** made in the `fkit lead` session on 2026-09-26 (voice-dictated) and
> relayed by `fkit-lead` to a spawned `fkit-producer` with **no owner channel** (ADR-021): brief a task
> that explains citizenship and its benefits and drives players to buy it, *"added to the next sprint"*.
> The owner called it *"important"*. ⚠️ The owner asked for the work. They did **not** rule the rank,
> the split into two briefs, the benefit list, or whether private lobbies become a citizen perk. ⛔ Not
> producer precedent.
>
> 📌 *Answered later the same day: the owner ruled the rank of both rows and approved private lobbies as a citizen perk — see the **RE-RANK 2026-09-26** addendum below. The text above is kept as written.*
>
> **OUTCOME.** Two rows **appended** at ranks **19** and **20** (this board's highest rank was 18). No
> other row moved or was renumbered (ADR-035).
> - `0301` — the explainer popup, a *"What is citizenship?"* link under the buy button, a Citizenship
>   section in Instructions, a buy button in the popup, and funnel analytics. Step 0 re-checks which
>   benefits are real. Today the code shows only the ★ badge, name change and the personal inbox. **Not**
>   ad-free (`0248`), **not** the emoji set (`0249`), **not** private lobbies, **not** the archive
>   (`0030`).
> - `0302` — private lobbies as a citizen perk: shown locked to non-citizens, and a tap opens `0301`'s
>   popup. 🚨 The private-lobby buttons are **hidden for everyone** on the Yandex build (since the
>   2025-11-07 port), **not** hidden for non-citizens as the owner assumed. So this task needs an owner
>   decision to make them a citizen perk first.
> - ⚠️ **Priority 19 is append rank, NOT a merit ranking — flagged for owner confirmation.**
>   **On merit this belongs at the top of the board, above the *Historical Multiplayer Maps* row** (plan
>   Task 1, no folder ID), because it acts on the feature that just launched, and the map tasks wait until
>   after the launch (owner ruling 2026-09-26).
>   ✅ **ANSWERED 2026-09-26 by owner ruling** — now rank **5**, below `0307`, `0302`, `0308` and `0248`. See the **RE-RANK 2026-09-26** addendum below.
> - ⚠️ **Priority 20 is append rank, NOT a merit ranking — flagged for owner confirmation.**
>   **On merit this belongs directly below `0301`**, because it needs that popup.
>   ✅ **ANSWERED 2026-09-26 by owner ruling — the OPPOSITE way:** now rank **2**, ABOVE `0301`, and the dependency is reversed (`0301` now depends on `0302`). See the **RE-RANK 2026-09-26** addendum below.
> - Every row above both is open, so an owner-ruled move up is possible without touching a closed row.
> - ⚠️ **"Next sprint" was read as Sprint 6.** Sprint 5 is the active launch sprint. Awaiting owner
>   confirmation.
>   ✅ **CONFIRMED 2026-09-26** — the owner ranked both rows at the top of Sprint 6 (re-rank addendum below).
>
> ⛔ **WHAT DID NOT HAPPEN.** No existing row, rank, status or task folder changed; no mover skill was
> invoked; nothing was committed; nothing under `ai-agents/wiki-vault/` was touched.

> 🆕 **Addendum — task `0303` added out of band (2026-09-26).**
>
> **AUTHORITY.** An **OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on
> 2026-09-26**, relayed by `fkit-lead` to a spawned `fkit-producer` with **no owner channel** (ADR-021).
> Question: *"File a task so that after any purchase the whole game reflects it right away (badge, inbox
> tab, perks, later ad-free) — either by updating each part live or by a controlled game restart?"* →
> **"Yes, Sprint 6 (Recommended)"**. ⚠️ The owner ruled the task and its sprint. They did **not** rule
> the rank, or live update vs restart (that is a gate inside the task). ⛔ Not producer precedent.
>
> **OUTCOME.** One row **appended** at rank **21** (this board's highest rank was 20). No other row moved
> or was renumbered (ADR-035).
> - `0303` — step 0 lists every citizen/paid-dependent surface and whether it updates after a purchase
>   without a reload; step 1 puts live update (recommended) vs a "restart to apply" prompt to the owner;
>   step 2 builds it. Producer's first read: the card likely updates live; the inbox unread dot likely
>   does not; the ★ badge shows from the next match, not the current one; ad-free / private lobby /
>   archive are not built yet.
> - ⚠️ **Priority 21 is append rank, NOT a merit ranking — flagged for owner confirmation.**
>   **On merit this belongs directly below `0301`**, because `0301` drives players to buy, this makes the
>   moment after buying feel right, and `0302` should plug into the mechanism it builds.
>   ✅ **ANSWERED 2026-09-26 by owner ruling** — now rank **6**, directly below `0301`. See the **RE-RANK 2026-09-26** addendum below.
> - Every row between `0301` and this one is open, so an owner-ruled move is possible without touching a
>   closed row.
>
> ⛔ **WHAT DID NOT HAPPEN.** No existing row, rank, status or task folder changed; no mover skill was
> invoked; nothing was committed; nothing under `ai-agents/wiki-vault/` was touched.

> 🆕 **Addendum — tasks `0307` and `0308` added out of band (2026-09-26).**
>
> **AUTHORITY.** An **owner request** made in the `fkit lead` session on 2026-09-26 (voice-dictated) and
> relayed by `fkit-lead` to a spawned `fkit-producer` with **no owner channel** (ADR-021): the owner's name
> lost its space, and *"is it possible that somebody can inject a code into our database … via their
> request of changing their name. Or when the name is approved"* — *"it should be added to the sprint 6
> because it's important."* ⚠️ The owner asked for the work and the sprint. They did **not** rule the rank,
> the split into two briefs, or any change to the name rules. ⛔ Not producer precedent.
>
> **OUTCOME.** Two rows **appended** at ranks **22** and **23** (this board's highest rank was 21). No
> other row moved or was renumbered (ADR-035).
> - `0307` — security review of every path a player name travels (SQL, server checks, Telegram, the
>   `curl` command the operator pastes, screens, logs), a hostile review pass, fixes and hostile-input
>   tests. First read: no SQL built from pasted text was found, and the server already refuses quotes and
>   `<`; but `\s` lets in newlines and invisible spaces, and the operator's shell command is safe only
>   because `'` is refused.
> - `0308` — the vanished space. First read: no line in our code deletes a plain space; the card shows
>   the Yandex name as-is. Step 0 reads the exact characters; step 2 puts the character rule to the owner.
> - **Split rationale:** each ships and is checked on its own. The coupling is one-way: a *wider*
>   character rule in `0308` waits for `0307`, because the rule is today the only guard on the operator's
>   shell command.
> - ⚠️ **Priority 22 is append rank, NOT a merit ranking — flagged for owner confirmation.**
>   **On merit this belongs at the top of the board, above `0301`**, because it guards a player-typed input
>   that has been live in production since the 2026-09-26 go-live, and the owner called it important.
>   ✅ **ANSWERED 2026-09-26 by owner ruling** — now rank **1**, the top of the board. See the **RE-RANK 2026-09-26** addendum below.
> - ⚠️ **Priority 23 is append rank, NOT a merit ranking — flagged for owner confirmation.**
>   **On merit this belongs directly below `0307`**, because its only risky step (widening the rule) waits
>   for it.
>   ✅ **ANSWERED 2026-09-26** — now rank **3**: below `0307` **and** `0302`. ⚠️ Slot 3 is `fkit-lead`'s reconciliation of two owner rulings, **open to owner correction** — see the **RE-RANK 2026-09-26** addendum below.
>   ✅ **Owner-ruled later the same day — rank 6.** See the **RE-RANK 2026-09-26, THIRD** addendum below.
> - Every row above both is open, so an owner-ruled move up is possible without touching a closed row.
>
> ⛔ **WHAT DID NOT HAPPEN.** No existing row, rank, status or task folder changed; no mover skill was
> invoked; nothing was committed; nothing under `ai-agents/wiki-vault/` was touched.

> 🔴 **RE-RANK 2026-09-26 — FOUR OWNER RULINGS given live in the `fkit lead` session via `AskUserQuestion` on
> 2026-09-26, relayed by `fkit-lead` to a spawned `fkit-producer` holding no owner channel (ADR-021; the
> relay names each ruling, ADR-037 §3). ⛔ Not producer precedent for re-ranking — four rulings, six rows
> placed, the rest shifted.** Ruling first, then effect.
>
> **THE RULINGS, verbatim.**
> - **Q1** — *"0307 (name security review) … Where should it go?"* → **"Top of Sprint 6 (Recommended)"**
>   (option text: *"Above everything else in Sprint 6, with 0308 right below it."*)
> - **Q2** — *"The purchase-funnel tasks: 0301 and 0303. Move them up in Sprint 6?"* → **"Right after
>   0307/0308 (Recommended)"** (option text: *"Order: 0307, 0308, 0301, 0303, 0302 at the top of Sprint 6."*)
> - **Q3** — *"0302: make private lobbies a citizen perk? … citizens can create them; non-citizens see a
>   locked button that opens the citizenship popup; joining a friend's lobby by invite stays free."* →
>   the owner's own words: *"Yes, and it should be the 2nd priority for the Sprint 6, because the
>   "funnel/explanation" of the perks would depend on it."*
> - **Q4** — *"The citizenship popup (0301) can only honestly list the ★ badge, name change and personal
>   inbox today — no ad-free yet. What should we do?"* → the owner's own words: *"Add the "ad-free" for the
>   paid citizenship status task, add it to the Sprint 6, and place it BEFORE the citizenship popup,
>   because it will add something else we could tell about in the citizenship/"*
>
> **RECONCILIATION — by `fkit-lead`, not by the owner.** Q2's option text put `0302` last; Q3's explicit
> *"2nd priority"* is more specific, so it wins. ⚠️ **`0308` at slot 3 is the lead's placement, open to
> owner correction:** it keeps Q1's *"0308 right below 0307"* except where Q3 claimed slot 2 — the owner
> never ranked `0308` against `0302` directly. `0248` goes directly above `0301` (Q4, *"BEFORE the
> citizenship popup"*); `0303` stays directly after `0301` (Q2).
>
> **OUTCOME — the top of this board, in order:**
>
> | New rank | Task | Rank before | Authority |
> |---|---|---|---|
> | 1 | [`0307`](../tasks/done/0307-security-review-of-every-player-name-path-injection-and-validation/brief.md) name-path security review | 22 *(append)* | Q1 |
> | 2 | [`0302`](../tasks/done/0302-private-lobby-as-a-locked-citizen-perk/brief.md) private lobby as a citizen perk | 20 *(append)* | Q3 |
> | 3 | [`0308`](../tasks/backlog/0308-player-name-loses-its-space-find-where-and-decide-which-characters-a-name-may-contain/brief.md) name loses its space | 23 *(append)* | Q1 + lead's reconciliation — ⚠️ open to correction |
> | 4 | [`0248`](../tasks/backlog/0248-suppress-interstitial-ads-for-paid-citizens/brief.md) ad-free for PAID citizens | — *(Backlog board, unranked)* | Q4 |
> | 5 | [`0301`](../tasks/backlog/0301-citizenship-explainer-popup-and-purchase-funnel/brief.md) citizenship explainer popup | 19 *(append)* | Q2 + Q3 + Q4 |
> | 6 | [`0303`](../tasks/done/0303-the-whole-game-reflects-a-purchase-without-a-reload/brief.md) game reflects a purchase without a reload | 21 *(append)* | Q2 |
>
> - **Every other ranked row moved down by exactly six and kept its order** (`1`→`7` … `18`→`24`). The old
>   value is struck, not deleted, in each Priority cell and in each moved-in brief's `## Priority`. The
>   three unranked rows (`—`: 5b, 5c, `0027`) are unchanged. The six rows sit physically at the top of the
>   table, above 5b/5c (Q1: *"Above everything else"*).
> - **ADR-035 check, run downward:** this board holds **no** `✅ Done`, `⛔ Cancelled` or `➡️ Moved` row, so the
>   renumbering touched no closed row.
> - **`0248` is new to this board, so it arrived by append (rank 24) and was then moved to rank 4 under
>   Q4** — two steps, because ADR-035 never lets a new row be inserted mid-board. Its
>   [Backlog board](backlog.md) row now reads `➡️ Moved to [Sprint 6](plan-sprint-6.md) — priority 4`; its
>   brief's `## Sprint` and `## Priority` were updated. The row is kept on the Backlog board as a pointer.
> - The *"append rank, NOT a merit ranking"* flags in the three addenda above are **answered** — each now
>   carries a ✅ line. Nothing was deleted.
> - ⚠️ **Position is not readiness.** `0248` still cannot be built (next section), and a rank does not
>   start a task.
>
> **DEPENDENCIES FLIPPED to match Q3 and Q4** (recorded in the briefs, where the ship loop reads them):
> - `0301` now **depends on `0302` and `0248`** — the popup describes their perks. It no longer reads
>   *"can start now"*.
> - `0302` **no longer depends on `0301`** — it now ranks above it, and a two-way dependency would stall
>   the ship loop. What its locked button does on a tap before `0301` exists is an **open owner question**
>   (below). Its *"add the perk to the explainer"* step moves to `0301`, which now ships after it.
> - `0248` now **blocks `0301`** (for the ad-free line). `0248` itself is still **hard-blocked on
>   [`0250`](../tasks/backlog/0250-authenticated-profile-read-for-paid-entitlement/brief.md)**, which is
>   **not** on this board.
>
> 🚩 **OPEN — NOT decided here; returned to the owner through `fkit-lead`:**
> 1. **`0250` is not on this board, but `0248` cannot be built without it — and through Q4, `0301` now
>    waits on `0248`.** As the board stands, the funnel popup is chained behind an unscheduled task.
>    Producer recommendation: pull `0250` into Sprint 6 directly above `0248`. ⛔ **Not moved** — no ruling
>    covers it.
>    ✅ **ANSWERED 2026-09-26 — yes, above `0248`.** Moved; see the second re-rank addendum below.
> 2. **`0302`'s locked-button tap before `0301` exists.** Either `0302` ships the lock with a simple interim
>    target, or its locked-tap behaviour lands with `0301`. Producer recommendation: the interim target is
>    the **existing citizenship card** (it already has the buy button), and `0301` re-points the tap to the
>    popup. ⛔ Not decided.
>    ✅ **ANSWERED 2026-09-26 — neither recommendation as written:** a simple *"citizens only"* info popup with
>    **no** buy button, removed by `0301`; and `0302` + `0301` ship in the **same deploy**. See the second
>    re-rank addendum below.
> 3. **Gating private lobbies on `isCitizen` ends a condition an earlier review accepted.** `0068`'s
>    accepted residual R3 (the citizen flag is readable on the unauthenticated lobby-poll endpoint) and its
>    ADR-103 residual (a forged player id can make someone look like a citizen) were accepted **only while
>    the flag stays purely cosmetic**. A private-lobby gate is a permission, so both must be re-decided
>    inside `0302`. Recorded in `0302`'s brief.
>    ✅ **ANSWERED 2026-09-26 — accept for now** (accepted residual in `0302`); and *"citizens"* means
>    **earned or paid**. See the second re-rank addendum below.
> 4. **`0308` at slot 3** — the lead's placement above; confirm or move.
>    ⏳ **Still open** after the second ruling set (no owner answer yet).
>    ✅ **ANSWERED 2026-09-26 — moved to rank 6** by owner ruling R3. See the **RE-RANK 2026-09-26, THIRD** addendum below.
>
> ⛔ **WHAT DID NOT HAPPEN.** No `## Status` token changed on any row or brief; no task folder moved; no
> mover skill was invoked; **`0250` was NOT moved**; nothing was committed; nothing under
> `ai-agents/wiki-vault/` was touched.

> 🔴 **RE-RANK 2026-09-26, SECOND — FOUR MORE OWNER RULINGS, given live in the `fkit lead` session via
> `AskUserQuestion` on 2026-09-26, relayed by `fkit-lead` to a spawned `fkit-producer` holding no owner
> channel (ADR-021; the relay names each ruling, ADR-037 §3). ⛔ Not producer precedent for re-ranking —
> one row moved in, the rows below it shifted by one.** They answer open questions 1–3 of the addendum
> directly above. Ruling first, then effect.
>
> **THE RULINGS, verbatim.**
> - **R1** — *"Pull 0250 … into Sprint 6, directly above ad-free (0248)?"* → **"Yes, above 0248 (Recommended)"**.
> - **R2** — *"Private lobbies (0302) ship before the citizenship popup (0301). What should the locked button
>   open in the meantime?"* → the owner's own words: *"We will ship the 2 features in the same deploy. As a
>   "temporary" solution, we can show a simple popup with information that this feature is only for
>   citizens, without the "buy" button, but later when we do the better "what is citizenship + buy it"
>   popu, this simple solution will be removed."*
> - **R3** — *"Who can create private lobbies: any citizen, or paid citizens only?"* → **"Earned or paid
>   (Recommended)"**.
> - **R4** — *"Once private lobbies are a citizen perk, a cheater who pretends to be a citizen's account could
>   create lobbies … Accept that for now?"* → **"Accept for now (Recommended)"**.
>
> **OUTCOME — the top of this board, in order:**
>
> | New rank | Task | Rank before this ruling |
> |---|---|---|
> | 1 | `0307` name-path security review | 1 *(unchanged)* |
> | 2 | `0302` private lobby as a citizen perk | 2 *(unchanged)* |
> | 3 | `0308` name loses its space | 3 *(unchanged — still open to owner correction)* |
> | 4 | [`0250`](../tasks/backlog/0250-authenticated-profile-read-for-paid-entitlement/brief.md) authenticated profile read (paid state) | — *(Backlog board, unranked)* |
> | 5 | `0248` ad-free for PAID citizens | 4 |
> | 6 | `0301` citizenship explainer popup | 5 |
> | 7 | `0303` game reflects a purchase without a reload | 6 |
>
> - **Every ranked row from `0248` down moved down by exactly one and kept its order** (old 4–24 → 5–25).
>   Each Priority cell keeps both earlier values, struck. The unranked rows (5b, 5c, `0027`) are unchanged.
> - **`0250` is new to this board, so it arrived by append (rank 25) and was then moved to rank 4 under R1**
>   — two steps, as ADR-035 requires. Its [Backlog board](backlog.md) row now reads
>   `➡️ Moved to [Sprint 6](plan-sprint-6.md) — priority 4`; its brief's `## Sprint` and `## Priority` were
>   updated. **ADR-035 check, run downward:** still no closed row on this board.
> - **R2 — `0302` and `0301` ship TOGETHER, in ONE deploy.** `0302` still ranks above `0301` and is built
>   first, but it is **not released on its own**. Until `0301` exists in the build, `0302`'s locked tap opens a
>   **simple "citizens only" info popup with NO buy button**; `0301` **removes** that interim popup and
>   points the locked tap at the full explainer. Recorded in both briefs and on both rows above.
>   ⚠️ **Because of R1, that shared release also waits on `0250` → `0248` → `0301`.** Private lobbies cannot
>   go out before the popup does.
> - **R3 — "citizens" means earned (XP) OR paid** (`is_citizen`). `0302` does **not** depend on `0250`.
> - **R4 — the forged-id risk on private lobbies is ACCEPTED for now**, as an accepted residual in `0302`.
>   The real fix is [`0267`](../tasks/backlog/0267-investigate-verifying-platform-player-identity/brief.md)
>   (still on the Backlog board). Re-raise if private lobbies gain value beyond convenience, or abuse is
>   seen.
> - 📌 **Noted, not edited beyond a pointer:** `0250`'s open question 3 (*is the per-game payments secret
>   key on the box?*) looks answered — `0014` item 3 and `0065` record `YANDEX_PAYMENTS_SECRET` present in
>   the running profile container since 2026-09-20. `0250`'s planner should confirm it, not assume it.
>
> 🚩 **STILL OPEN:** `0308` at rank 3 (the lead's placement — no owner answer yet).
> ✅ **ANSWERED 2026-09-26 — `0308` is now rank 6 by owner ruling R3.** See the **RE-RANK 2026-09-26, THIRD** addendum below.
>
> ⛔ **WHAT DID NOT HAPPEN.** No `## Status` token changed on any row or brief; no task folder moved; no
> mover skill was invoked; nothing was committed; nothing under `ai-agents/wiki-vault/` was touched.

> 🆕 **Addendum — task `0311` added out of band (2026-09-26).**
>
> **AUTHORITY.** An **owner request** in the `fkit lead` session on 2026-09-26 — verbatim: *"I would like
> not to mention the name of the game at all. To make texts without the actual name of the game. Is it
> possible?"* — and an **OWNER RULING given live via `AskUserQuestion`** the same day: *"File a small task
> … Where should it go?"* → **"Sprint 6"**. Relayed by `fkit-lead` to a spawned `fkit-producer` with **no
> owner channel** (ADR-021). ⚠️ The owner ruled the task and its sprint. They did **not** rule the rank,
> the wording, or whether the page title counts. ⛔ Not producer precedent.
>
> **OUTCOME.** One row **appended** at rank **26** (this board's highest rank was 25). No other row moved
> or was renumbered (ADR-035).
> - `0311` — removes the name from the inbox *"citizenship earned"* title and the tenure popup body (en +
>   ru); the page title / install name only if the owner says yes. Step 0 puts the ru/en wording to the
>   owner.
> - 🚨 **A second ruling rests on a wrong premise.** The owner chose *"Leave them (Recommended)"* for
>   already-sent inbox messages, on the belief that each message stores its own text. The citizenship
>   message is a **template**, drawn from the lang file every time it is shown — so already-sent messages
>   **will** show the new text, with no DB edit. Put back to the owner as open question 1 in the brief.
> - ⚠️ **Priority 26 is append rank, NOT a merit ranking — flagged for owner confirmation.**
>   **On merit this belongs directly below `0303`**, because it is a copy-only change on the same
>   citizenship surfaces and can ride the shared `0302`/`0301` release; nothing breaks without it.
>   ✅ **ANSWERED 2026-09-26 by owner ruling** — now rank **14**, directly below `0318` (which the third re-rank
>   had put directly below `0303`), with `0316` at 15. See the **RE-RANK 2026-09-26, FOURTH** addendum below.
> - Every row between `0303` and this one is open, so an owner-ruled move is possible without touching a
>   closed row.
>
> ⛔ **WHAT DID NOT HAPPEN.** No existing row, rank, status or task folder changed; no mover skill was
> invoked; nothing was committed; nothing under `ai-agents/wiki-vault/` was touched.

> 🆕 **Addendum — tasks `0312`–`0318` added out of band (2026-09-26).**
>
> **AUTHORITY.** Two **OWNER RULINGS given live via `AskUserQuestion`** in the `fkit lead` session on
> 2026-09-26, after the owner's live name-change test on prod `0.0.154`: Q *"Which of today's findings should
> get task briefs?"* → **"Name-change moderation gaps, In-match name + wording, Card lost after match"**; Q
> *"Where should the chosen briefs go?"* → **"Sprint 6, bottom (Recommended)"**. Relayed by `fkit-lead` to a
> spawned `fkit-producer` with **no owner channel** (ADR-021). ⚠️ The owner ruled **three findings** and their
> sprint. They did **not** rule the split, the ranks, or any design choice. ⛔ Not producer precedent.
>
> **OUTCOME.** Seven rows **appended** at ranks **27–33** (this board's highest rank was 26). No other row moved
> or was renumbered (ADR-035).
> - ⚠️ **Three findings became seven briefs — the producer's call under the decomposition rule, not the
>   owner's.** The lead asked for three. Each brief ships and is verified on its own:
>   - *Moderation gaps* → `0312` working operator command (approve + reject, runbook) · `0313` notify cooldown
>     swallows a new request after a decision · `0314` sticky rejected state + no way to clear a name ·
>     `0315` digest lists names (optional — owner says yes/no).
>   - *In-match name + wording* → `0316` honest approve wording (copy-only, retroactive) · `0317`
>     investigation of the in-match name (identity/trust first).
>   - *Card lost after match* → `0318` investigation (measure first).
>   Merging back is cheap: the producer's cancel mover folds any brief into another.
> - 🚩 **Conflicts surfaced, not settled:** `0312` changes the operator command `0307` is reviewing for shell
>   injection — land together or in sequence. `0318` option (i) would reverse `0049`'s locked *"no active SDK
>   retry"* — owner's call. `0317` must not let one player appear under another citizen's approved name while
>   identity is unverified (`0267`).
> - ⚠️ **Priorities 27–33 are append rank, NOT a merit ranking — flagged for owner confirmation.** On merit:
>   **`0312` belongs directly below `0307`** (live moderation has no working command; same command as `0307`);
>   **`0313` directly below `0312`** (a missed request leaves a paying citizen waiting unseen);
>   **`0316` directly below `0311`** (copy-only, same lang files — ship together);
>   **`0318` directly below `0303`** (same family — purchase surfaces showing the wrong state);
>   **`0314` directly below `0308`** and **`0317` directly below `0308`** (name-rule neighbours; `0317` after
>   `0307`/`0308`); **`0315` directly below `0313`** (safety net, optional).
>   ✅ **ANSWERED 2026-09-26 by owner rulings** — kept as seven tasks and moved as proposed, with `0302` kept 2nd
>   (ranks 3, 4, 5, 7, 8, 13 and 33). See the **RE-RANK 2026-09-26, THIRD** addendum below.
> - Every row from `0307` down to rank 26 is open, so owner-ruled moves are possible without touching a closed
>   row.
>
> ⛔ **WHAT DID NOT HAPPEN.** No existing row, rank, status or task folder changed; no mover skill was invoked;
> nothing was committed; nothing under `ai-agents/wiki-vault/` was touched.

> 🔴 **RE-RANK 2026-09-26, THIRD — THREE OWNER RULINGS plus an owner retry instruction, all given live in the
> `fkit lead` session via `AskUserQuestion` on 2026-09-26, relayed by `fkit-lead` to a spawned `fkit-producer`
> holding no owner channel (ADR-021; the relay names each ruling, ADR-037 §3). ⛔ Not producer precedent for
> re-ranking — seven appended rows moved up next to related work; every other ranked row kept its order.** They
> answer the *"append rank, NOT a merit ranking"* flag of the `0312`–`0318` addendum directly above, and the
> open `0308`-slot question of both earlier re-ranks. Ruling first, then effect.
>
> **THE RULINGS, verbatim.**
> - **R1** — *"Keep the 7 separate tasks (0312–0318), or merge them back into 3?"* → **"Keep 7 (Recommended)"**.
> - **R2** — *"Move them up next to related tasks? Proposal: 0312+0313 (+0315) right under 0307 (same
>   command/security review); 0314+0317 under 0308 (names); 0316 under 0311 (same text files, ship together);
>   0318 under 0303 (purchase-screen state)."* → **"Move as proposed (Recommended)"**.
> - **R3** — `fkit-lead` flagged that R2 conflicts with the earlier owner ruling that `0302` is 2nd. *"Which
>   order at the top of Sprint 6? A) 0307, 0302, 0312, 0313, 0315, 0308, 0314, 0317, 0250, 0248, 0301, 0303,
>   0318 — keeps private lobbies 2nd. B) …"* → **"A: lobbies stay 2nd (Recommended)"**.
> - **Retry instruction** — two earlier attempts to apply R1–R3 (by another spawned producer, as one bulk
>   script over this board) were denied by the permission layer; no file changed. The owner then said,
>   verbatim: *"Try again, I am present in this session and I want to see the logs"*. This addendum and the
>   edits it describes are that retry, applied as ordinary one-at-a-time file edits.
>
> **OUTCOME — the new order:**
>
> | New rank | Task | Rank before this ruling |
> |---|---|---|
> | 1 | `0307` name-path security review | 1 *(unchanged)* |
> | 2 | `0302` private lobby as a citizen perk | 2 *(unchanged)* |
> | 3 | [`0312`](../tasks/done/0312-name-change-a-working-documented-operator-decide-command-approve-and-reject/brief.md) working operator approve/reject command | 27 *(append)* |
> | 4 | [`0313`](../tasks/done/0313-name-change-a-new-request-after-a-decision-or-withdraw-must-reach-the-operator/brief.md) new request after a decision must reach the operator | 28 *(append)* |
> | 5 | [`0315`](../tasks/done/0315-name-change-daily-digest-lists-the-pending-requests-not-just-the-count/brief.md) digest lists the pending names | 30 *(append)* |
> | 6 | `0308` name loses its space | 3 |
> | 7 | [`0314`](../tasks/done/0314-name-change-rejected-state-sticks-on-the-card-and-no-way-to-clear-a-name-decide-and-fix/brief.md) sticky rejected state / clear a name | 29 *(append)* |
> | 8 | [`0317`](../tasks/done/0317-investigate-show-a-citizens-approved-name-in-matches/brief.md) investigate the approved name in matches | 32 *(append)* |
> | 9 | `0250` authenticated profile read (paid state) | 4 |
> | 10 | `0248` ad-free for PAID citizens | 5 |
> | 11 | `0301` citizenship explainer popup | 6 |
> | 12 | `0303` game reflects a purchase without a reload | 7 |
> | 13 | [`0318`](../tasks/done/0318-investigate-citizenship-card-vanishes-after-a-match-on-a-shaky-connection/brief.md) investigate card lost after a match | 33 *(append)* |
> | 14–31 | Historical Maps … `0298` — same relative order | 8–25 *(each +6)* |
> | 32 | `0311` remove the game name from texts | 26 |
> | 33 | [`0316`](../tasks/done/0316-approve-inbox-message-must-not-promise-the-new-name-is-active-everywhere/brief.md) honest approve-message wording — directly below `0311` | 31 *(append)* |
>
> - **The seven rows arrived by append (27–33) and were then moved under R2/R3** — two steps, as ADR-035
>   requires. The table rows were physically re-ordered to match; every changed Priority cell keeps its earlier
>   values, struck. The unranked rows (5b, 5c, `0027`) are unchanged and keep their places.
> - **ADR-035 check, run downward:** this board's Status table holds **no** `✅ Done`, `⛔ Cancelled` or
>   `➡️ Moved` row, so no closed row was renumbered.
> - ✅ **`0308`'s slot is now OWNER-RULED** (rank 6, R3) — the *"`fkit-lead`'s reconciliation … open to owner
>   correction"* question left open by both earlier re-ranks is closed.
> - ⚠️ **`0316` sits under `0311`, and `0311` did NOT move** — R2 moved only `0312`–`0318`. So the pair stays at
>   the bottom (32–33). `0311`'s own merit note (*"directly below `0303`"*) was not ruled on and remains open.
>   ✅ **ANSWERED later the same day — the pair moved up to 14–15, directly below `0318`.** See the **RE-RANK
>   2026-09-26, FOURTH** addendum below.
> - ⚠️ **`0315`'s rank does not answer whether to do it at all** — its brief still asks the owner yes/no.
>   ✅ **ANSWERED later the same day — *"Keep it"*.** See the **RE-RANK 2026-09-26, FOURTH** addendum below.
> - `0312` and `0307` change the same operator command; ranks 1 and 3 keep them close. The coordination note in
>   both briefs stands.
> - Each affected brief's `## Priority` was updated (new number first, this ruling named, earlier value kept
>   struck): `0308`, `0250`, `0248`, `0301`, `0303`, `0285`, `0289`, `0030`, `0032`, `0213`, `0219`, `0221`,
>   `0286`, `0298`, `0311`, `0312`–`0318`. The brief-less rows (maps, leaderboard, …) have no brief to update.
>
> ⛔ **WHAT DID NOT HAPPEN.** No task's `## Status` token changed; no task folder moved; no mover skill was
> invoked; no dependency was changed; nothing was committed or pushed; nothing under `ai-agents/wiki-vault/`
> was touched.

> 🔴 **RE-RANK 2026-09-26, FOURTH — TWO OWNER RULINGS, given live in the `fkit lead` session via
> `AskUserQuestion` on 2026-09-26, relayed by `fkit-lead` to a spawned `fkit-producer` holding no owner channel
> (ADR-021; the relay names each ruling, ADR-037 §3). ⛔ Not producer precedent for re-ranking — two rows moved
> up, the rows below them shifted by two.** They answer the two questions the third re-rank left open. Ruling
> first, then effect.
>
> **THE RULINGS, verbatim.**
> - **Q1** — *"0311 (remove the game name from texts) sits at rank 32, with 0316 (honest 'name approved' wording)
>   tied under it. Move both up?"* → **"Move up after 0318 (Recommended)"** (option text: *"Small text-only
>   changes on the same citizenship screens; can ship in the same release as the popup."*).
> - **Q2** — *"0315 … do it at all? If 0313 ships, the need mostly goes away."* → **"Keep it"** (option text:
>   *"Stays at rank 5 as extra safety."*).
>
> **OUTCOME.**
>
> | New rank | Task | Rank before this ruling |
> |---|---|---|
> | 14 | [`0311`](../tasks/done/0311-remove-the-game-name-from-player-facing-texts/brief.md) remove the game name from texts | 32 |
> | 15 | [`0316`](../tasks/done/0316-approve-inbox-message-must-not-promise-the-new-name-is-active-everywhere/brief.md) honest approve-message wording — still directly below `0311` | 33 |
> | 16–33 | Historical Maps … `0298` — same relative order | 14–31 *(each +2)* |
>
> - Ranks 1–13 are unchanged. The two rows were physically moved to sit directly below `0318`, above the
>   unranked 5b/5c rows; each changed Priority cell keeps its earlier values, struck.
> - **ADR-035 check, run downward:** still no `✅ Done`, `⛔ Cancelled` or `➡️ Moved` row on this board.
> - **Q2 — `0315` is to be done.** Rank unchanged (5). The yes/no question recorded on its row, in the third
>   re-rank and in its brief is struck and marked answered, not deleted.
> - Each affected brief's `## Priority` was updated (new number first, this ruling named, earlier value kept
>   struck): `0311`, `0316`, `0315` (answer only), `0285`, `0289`, `0030`, `0032`, `0213`, `0219`, `0221`,
>   `0286`, `0298`.
>
> ⛔ **WHAT DID NOT HAPPEN.** No task's `## Status` token changed; no task folder moved; no mover skill was
> invoked; no dependency was changed; nothing was committed or pushed; nothing under `ai-agents/wiki-vault/`
> was touched.

> ➡️ **Addendum — 2026-09-26, later: `0297` APPENDED AS THE LAST ROW, MOVED IN FROM [SPRINT 5](done/plan-sprint-5.md). Read the authority before the outcome.**
>
> **AUTHORITY.** An OWNER RULING given 2026-09-26, later — the owner's own typed message live in the `fkit lead` session (not an `AskUserQuestion` answer), relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. The owner, verbatim: *"Move it to the bottom of Sprint 6"* ("it" = `0297`),
> choosing it over keeping Sprint 5 open until `0297` finishes. Full record: the `0297` addendum under
> [`plan-sprint-5.md`](done/plan-sprint-5.md)'s status table.
>
> **OUTCOME.**
> - [`0297`](../tasks/backlog/0297-paid-citizenship-owner-run-test-buy-sequence/brief.md) appended as the **last
>   row**, rank **34** (this board's highest rank was 33). Status `🔲 Backlog` and the Task cell copied verbatim
>   from Sprint 5, with a moved note.
> - ⛔ **Supersedes the 2026-09-23 owner ruling that pinned `0297` to the top of Sprint 5.**
> - It sits here as a **watch item**: §4 (a real player's successful `/reconcile`) is still open. Read-only
>   check ~16:xx UTC 2026-09-26: 2 `/complete` 200s, 0 `/reconcile` calls.
> - **Appended, never inserted** (ADR-035). No other row moved, was renumbered, or had its rank changed.
> - 📌 **This board is still `🔲 Backlog`.**
>
> ⛔ **WHAT DID NOT HAPPEN.** No task's `## Status` token changed; no task folder moved; no mover skill was
> invoked; nothing was committed or pushed; nothing under `ai-agents/wiki-vault/` was touched.

---

## Player Demand Signal

Multiple unprompted feedback messages requesting specific maps (Russia, WW2). High-intent signal — players are asking for content they would actively seek out, not casually suggesting improvements.

---

## Task 0b — Server Restart UX

> 📌 **2026-09-29 — now a discussion item in [`0342`](../tasks/backlog/0342-discussion-parked-features-not-tied-to-paid-citizenship/brief.md) on the [Backlog board](backlog.md)** (owner ruling, relayed by `fkit-lead`); its row above reads `➡️ Moved`. This section is copied verbatim into that brief's appendix and stays here as written.

Moved from Sprint 3. Blocking modal with auto-reload when server recovers (Part B) and pre-restart broadcast notification (Part A). Deferred because the game functions correctly without it, deployment risk is non-trivial, and the weekly release cadence (deployed during low-traffic weekend hours) already minimises player impact.

See: task section 5b in [`done/plan-sprint-3.md`](done/plan-sprint-3.md) — the standalone brief file `s3-5b-task-server-restart-ux.md` is lost (dangling since the FKIT migration)

---

## Task 0c — Mobile Warning Screen

> 📌 **2026-09-29 — now a discussion item in [`0342`](../tasks/backlog/0342-discussion-parked-features-not-tied-to-paid-citizenship/brief.md) on the [Backlog board](backlog.md)** (owner ruling, relayed by `fkit-lead`); its row above reads `➡️ Moved`. This section is copied verbatim into that brief's appendix and stays here as written.

Moved from Sprint 3. A simple non-blocking screen shown to mobile players on game load informing them that Geoconflict is optimised for desktop. Includes a "Continue anyway" button. Shown once per player (localStorage flag). Not a priority at current DAU levels but worth shipping when content work begins to set honest expectations for mobile players discovering the game through new map content.

See: task section 5c in [`done/plan-sprint-3.md`](done/plan-sprint-3.md) — the standalone brief file `s3-5c-task-mobile-warning.md` is lost (dangling since the FKIT migration)

---

## Task 1 — Historical Multiplayer Maps (Free)

> 📌 **2026-09-29 — now a discussion item in [`0342`](../tasks/backlog/0342-discussion-parked-features-not-tied-to-paid-citizenship/brief.md) on the [Backlog board](backlog.md)** (owner ruling, relayed by `fkit-lead`); its row above reads `➡️ Moved`. This section is copied verbatim into that brief's appendix and stays here as written.

**Ships before paid campaign packs.**

Add 1–2 historically themed maps to the existing multiplayer rotation. These are free for all players.

**Purpose:**
- Validates player interest in historical content before investing in paid packs
- Generates word-of-mouth from players who requested these maps
- No monetization risk — pure content addition

**Balance constraint:** campaign maps are often designed with asymmetric starting positions, fixed faction sizes, or scripted timing assumptions that do not translate to free multiplayer. Map selection must be deliberate — only maps that work with standard multiplayer rules (equal starting conditions, any player count) qualify. Do not automatically port campaign maps to multiplayer.

**Selection criteria for a map to qualify as a multiplayer map:**
- Symmetric or fair starting positions for all players
- No scripted events or fixed faction requirements
- Works correctly across the full range of player counts the lobby supports
- Balance tested in multiplayer before shipping

**Likely candidates:** WW2 Europe theatre, Eastern Front — broad geographic maps where territory capture mechanics feel natural. Russia map also frequently requested.

---

## Task 2 — Paid Campaign Map Packs

> 📌 **2026-09-29 — now a discussion item in [`0343`](../tasks/backlog/0343-discussion-parked-features-tied-to-paid-citizenship/brief.md) on [Sprint 8](plan-sprint-8.md)** (owner ruling, relayed by `fkit-lead`); its row above reads `➡️ Moved`. This section is copied verbatim into that brief's appendix and stays here as written.

**Ships after Task 1 and after Sprint 4/5 payment infrastructure is live.**

Thematic map packs available for purchase. Initial pack: WW2 (most requested). Each pack includes multiple maps with historical context.

**Pricing model:**
- 1–2 maps from each pack available free (same model as citizenship earned path — give players a taste)
- Full pack purchase unlocks remaining maps
- Price TBD — likely 149–199 rubles per pack (consistent with cosmetics pricing from Sprint 4)
- Purchasing any map pack automatically grants citizenship (consistent with "any purchase = citizenship" rule)

**Citizenship integration:** paid citizens could receive one free map pack as a perk — adds tangible content value to citizenship beyond cosmetics. Worth deciding in Sprint 4 whether to promise this before Sprint 6 ships.

**Campaign vs multiplayer distinction:** campaign maps in paid packs can have asymmetric starts, scripted elements, and historical accuracy that would break multiplayer balance. These are singleplayer/co-op experiences, not additions to the multiplayer rotation. Task 1 (multiplayer maps) and Task 2 (campaign packs) are separate products.

---

## Notes

- Brief writing deferred until Sprint 5 is underway — too early to scope in detail now
  - 📌 **2026-09-26 — owner ruling: write them AFTER THE LAUNCH** (*"After the launch (Recommended)"*), not
    merely once Sprint 5 has started. See the 2026-09-26 follow-up addendum under the status table.
- Map creation is a content production task, not just engineering — timeline will depend on map design effort, not just code
- The "1–2 free maps per pack" split should be decided before any paid pack ships — sets player expectations early
- ~~Sprint 5 cosmetics store UI may be reusable for the map pack store~~ — **corrected 2026-08-09: there is no cosmetics store.** Whatever purchase UI ships with Tasks 9/9a (flags, territory patterns) is the reusable surface; flag it to the coder when Sprint 6 briefs are written
