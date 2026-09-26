# "What is citizenship?" explainer popup — a funnel from information to purchase

## ID
0301

## Sprint
Sprint 6

## Priority
11

📌 **Shifted 6 → 11 later on 2026-09-26** by a third OWNER RULING (R2/R3, live via `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer`, ADR-021; ADR-037 §3): five appended name-change rows were placed above it. Order relative to `0302`, `0248` and `0303` unchanged. ⛔ Not a merit re-rank of this task. See the *RE-RANK 2026-09-26, THIRD* addendum on the Sprint 6 board. *Earlier value, kept:* ~~6~~ —

📌 **Shifted 5 → 6 later on 2026-09-26** by a second OWNER RULING (relayed the same way): the owner moved
[`0250`](../0250-authenticated-profile-read-for-paid-entitlement/brief.md) into Sprint 6 directly above
`0248`. Order relative to `0302`, `0248` and `0303` unchanged. *Earlier value, kept:* ~~5~~ —

**Board rank on [Sprint 6](../../../sprints/plan-sprint-6.md), OWNER-RULED 2026-09-26** — see *Owner
rulings* below. ~~19~~ was the append rank until then.

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**Filed 2026-09-26 by a spawned `fkit-producer` with no owner channel (ADR-021), on an owner request
given in the `fkit lead` session and relayed by `fkit-lead`.** The owner asked for *"a task"* for the
next sprint and called it *"important — we need to create some incentives for users to actually buy
citizenship"*. ⚠️ The owner asked for the work; they did **not** rule the benefit list, the copy, the
rank, or the split into two briefs (this one + [`0302`](../0302-private-lobby-as-a-locked-citizen-perk/brief.md)).
Those are open questions below. ⛔ Not producer precedent.

### 📌 OWNER RULINGS, 2026-09-26 — rank and order (read before *Dependencies*)

Given live in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead` to a spawned
`fkit-producer` with no owner channel (ADR-021; the relay named each ruling, ADR-037 §3); ⛔ not producer
precedent. Full record: the *RE-RANK 2026-09-26* addendum on the [Sprint 6 board](../../../sprints/plan-sprint-6.md).
- **This task is rank 5**, after [`0307`](../0307-security-review-of-every-player-name-path-injection-and-validation/brief.md),
  [`0302`](../0302-private-lobby-as-a-locked-citizen-perk/brief.md), [`0308`](../0308-player-name-loses-its-space-find-where-and-decide-which-characters-a-name-may-contain/brief.md)
  and [`0248`](../0248-suppress-interstitial-ads-for-paid-citizens/brief.md).
- **It now DEPENDS ON `0302` and `0248`** — the popup describes their perks. On `0302`, the owner:
  *"it should be the 2nd priority for the Sprint 6, because the "funnel/explanation" of the perks would
  depend on it."* On `0248` (ad-free for paid citizens): *"place it BEFORE the citizenship popup,
  because it will add something else we could tell about in the citizenship/"*.
- ⇒ **Open question 1 below is answered:** the owner chose to pull real perks forward **before** the
  explainer, not to ship the explainer with the thin list first.
- 🚨 **Consequence to know:** `0248` is hard-blocked on
  [`0250`](../0250-authenticated-profile-read-for-paid-entitlement/brief.md), which is **not** in Sprint 6.
  Until the owner decides whether `0250` joins the sprint, this popup waits on an unscheduled task.
  ✅ *Answered later the same day:* `0250` is now in Sprint 6 (rank 4), directly above `0248`. This popup
  still waits on it, through `0248`.

### 📌 OWNER RULING, 2026-09-26 (second set) — replace `0302`'s interim popup, and ship together

Given live in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead` to a spawned
`fkit-producer` with no owner channel (ADR-021; ADR-037 §3); ⛔ not producer precedent. Asked what
`0302`'s locked button should open before this popup exists, the owner said, verbatim: *"We will ship the
2 features in the same deploy. As a "temporary" solution, we can show a simple popup with information that
this feature is only for citizens, without the "buy" button, but later when we do the better "what is
citizenship + buy it" popu, this simple solution will be removed."*
- **This task REMOVES [`0302`](../0302-private-lobby-as-a-locked-citizen-perk/brief.md)'s interim "citizens
  only" popup** (code, translation keys in `en.json` + `ru.json`, and its element in both HTML templates if
  it has one) **and points the locked private-lobby tap at this explainer**, with the locked-feature
  source in the *opened* event.
- 🚢 **This task and `0302` ship in the SAME deploy.** `0302` is built first but not released alone; this
  task is the other half of that release.
- ⛔ The owner did **not** rule the copy, the entry points or open questions 2–3.

**The owner's words (voice-dictated, lightly garbled), the parts this brief covers:**
> *"we don't explain well what the citizenship is. And what are the benefits of it … maybe we need to
> add … some link like text below the buy citizenship button with the text on it 'what is citizenship'
> and if a person clicks on it they are shown a pop-up with the explanation … we also need to add
> something about it into the instructions and this pop-up … should also have a button like buy
> citizenship … we should create a funnel of driving users through information and to buying
> citizenship"*

The locked-feature half of the same request (*"show it as locked … if a non-citizen clicks on that …
show them the same pop-up"*) is [`0302`](../0302-private-lobby-as-a-locked-citizen-perk/brief.md). It
reuses the popup this task builds.

### What is live today (citizenship went live 2026-09-26, game 0.0.154)

Start-screen citizenship card: XP bar (1 XP per qualifying match, 100 XP to earn — ADR-111), the buy
button *"Купить гражданство — 249 YAN"*, the tenure-gift popup, the ★ citizen badge, and the
citizen-only *Personal* inbox tab. **Nothing on screen tells a player what citizenship gives them.** The
card's copy (`citizenship_card.*` in `resources/lang/*.json`) has a title, an XP label and a buy button
— no benefit text at all. The inbox's grant messages say *"You now have access to citizen benefits"*
without naming one.

### ⚠️ Benefit inventory — what a citizen ACTUALLY gets today (producer read of the code, 2026-09-26)

The owner said: *"I'm actually not sure if we have any of them right now."* This is what the code says.
**Step 0 below re-verifies it before any copy is written — treat this table as a lead, not as settled.**

| Benefit | In the code today? | Evidence | May the explainer claim it? |
|---|---|---|---|
| ★ Citizen badge next to your name (leaderboard, player panel, lobby lists) | **Yes** — `0068` ✅ Done | `src/client/CitizenBadge.ts`; `Leaderboard.ts`, `PlayerPanel.ts`, `HostLobbyModal.ts`, `JoinPrivateLobbyModal.ts`; server resolves the flag in `GameServer.ts` (wired by `0217`, closed 2026-09-26) | Yes, once step 0 sees it in prod |
| Change your display name (moderated request) | **Yes** — `0067` ✅ Done | `CitizenshipCard.ts` `renderNameChange()` — rendered only for an authoritative citizen; server refuses non-citizens (`citizenship_name_change.error_not_citizen`) | Yes, once step 0 sees it in prod |
| Personal inbox (system messages) | **Yes** — `0012` ✅ Done | `src/client/Inbox.ts` — server 403s non-citizens | Weak as a *selling* point (it mostly delivers the name-change result) — owner call |
| **No interstitial ads** (paid citizens) | ❌ **NO** | No citizen check anywhere in the ad path — see [`0248`](../0248-suppress-interstitial-ads-for-paid-citizens/brief.md) | ⛔ **NO** — owner condition, below |
| **Full emoji set** | ❌ **NO** | One flat emoji table for everyone — see [`0249`](../0249-citizen-gated-full-emoji-set/brief.md) | ⛔ **NO** — owner condition, below |
| **Private lobbies** | ❌ **NO** — not gated, and **hidden for everyone** on Yandex | See below | ⛔ **NO** until [`0302`](../0302-private-lobby-as-a-locked-citizen-perk/brief.md) ships |
| Match history / archive | ❌ **NO** — archiving is a no-op | `src/server/Archive.ts:18-19`; [`0030`](../0030-archive-s3-backed-citizen-gated/brief.md) | ⛔ **NO** |
| Nickname styling, map voting, replay access, custom flags | ❌ **NO** — not built | Sprint 6 rows *Nickname Styling System*, *Map Voting for Verified Players*, *Replay Access as Premium Feature*, *Custom Uploaded Flags & Patterns* (no briefs yet) | ⛔ **NO** |

**Why no private-lobby button is visible (the owner's direct question).** It is **not** hidden for
non-citizens — it is hidden for **everyone**, and nothing gates it on citizenship. The *Create Lobby* /
*Join Lobby* row in `src/client/yandex-games_iframe.html` (~line 314, a `Flashist Adaptation` block) is
wrapped in `style="display: none;"`, and has been since the Yandex port (commit `18bb3e3`,
2025-11-07). The standalone `src/client/index.html` still shows it. The underlying flow works on Yandex —
`0198` fixed its broken start URL in Sprint 4. *"Private lobbies — citizens only"* is planned
(`plan-index.md`, item 8b) but was never briefed or built.

🔒 **Locked constraint — do NOT claim ad-free or the emoji set.** On 2026-09-12 the owner ruled, for
both [`0248`](../0248-suppress-interstitial-ads-for-paid-citizens/brief.md) and
[`0249`](../0249-citizen-gated-full-emoji-set/brief.md): *build the benefit*, but **the claim comes out of
the store copy until it ships.** This explainer is store copy in everything but name. `PROJECT.md:36`
still lists those benefits — that is the *intended* product, not the live one; do not copy from it.

📌 **2026-09-26 — the table above is a snapshot, and the order has changed.** `0302` (private lobbies)
and `0248` (no interstitial ads, **paid citizens only**) now ship **before** this task. When step 0 runs,
each of them that has shipped becomes a claimable line — worded exactly as built (ad-free says *paid*
citizens; private lobbies says *creating* a lobby — joining by invite is free for everyone). The
*"do NOT claim"* rule below still holds for anything that has **not** shipped.

**Result, stated plainly:** today the honest list is **the ★ badge and name change** (plus the inbox, if
the owner wants it listed). That is thin for a 249 YAN purchase — which is the owner's instinct, and the
first open question below.

### Dependencies and conflicts
- **Kill switch.** Every citizenship surface obeys the `citizenship_ui` remote flag plus the
  `CITIZENSHIP_CARD_ENABLED` compile-time gate, read through
  `FlashistFacade.isCitizenshipSurfacesEnabled()` (`0236`; validated by `0238`). The explainer and all
  its entry points must obey it too.
- **Double-charge guard.** The card never shows a working buy button to a citizen, to a player whose
  profile read failed (`isAuthoritative === false`), or when the Yandex catalog has no product (task
  `0018`, review R1 — see the comment in `CitizenshipCard.ts` around `renderBuyCta()`). The explainer's
  buy button must follow **exactly the same rule**, not a second copy of it that can drift.
- No conflict with a locked ADR found. ADR-111 (100 XP, 1 XP per match) is the XP rule to state.

## What to build

**Step 0 — confirm the benefit list (do this first; it decides the copy).**
1. Re-verify every row of the benefit table above against the code at the time you start, and confirm
   in production (game ≥ 0.0.154) that the ★ badge and name change actually work for a citizen. Record
   the result in `worklog.md`.
2. If anything differs from the table, **stop and route it to the producer** — the benefit list is an
   owner decision (open question 1), not a coder decision.
3. The final copy (en + ru) needs **owner approval before merge**. Draft it; don't ship unapproved copy.

**Step 1 — the explainer popup.** A new modal following the project's modal pattern
(`GameStartingModal.ts` — a LitElement `@customElement` with `show()`/`hide()`), which says:
- **What citizenship is** — one or two short sentences.
- **What it gives you** — only the benefits confirmed in step 0 and approved by the owner. 📌
  *2026-09-26:* this now includes the *private lobbies* line (moved here from `0302`'s step 3, since
  `0302` ships first) and the *ad-free for paid citizens* line once `0248` has shipped — en + ru.
- **How to get it for free** — play matches, earn XP, reach the threshold. Read the numbers from the
  existing constants (`CITIZENSHIP_XP_THRESHOLD`; the per-match XP) and pass them into the translation as
  parameters — never hard-code *100* or *1* in copy. If the player is logged in, showing their current
  XP here is welcome but optional.
- **A "Buy citizenship" button** — the funnel's end. It must reuse the card's buy path
  (`runCitizenshipPurchase()` in `CitizenshipPurchase.ts`) and **the card's exact visibility rule**
  (see *Dependencies*); price comes from the catalog product, never hard-coded. A guest sees the login
  path the card already offers instead of a buy button. A citizen opening the popup sees no buy button
  (a short *"You are a citizen"* line is fine).
- Buying from the popup must leave the card in the same state as buying from the card (the card listens
  for the grant; confirm it updates without a reload).

**Step 2 — entry point A: a "What is citizenship?" text link under the buy button** on the start-screen
citizenship card. Shown wherever the buy button is shown. Owner question 2 asks whether guests and
citizens should see it too.

**Step 3 — entry point B: the Instructions screen.** Add a short *Citizenship* section to the
Instructions modal (`src/client/HelpModal.ts`, opened by `#help-button`) with a link that opens the same
popup.

**Step 4 — funnel analytics.** Add events to `flashistConstants.analyticEvents` in
`src/client/flashist/FlashistFacade.ts` **and** document them in
`ai-agents/knowledge-base/analytics-event-reference.md`. PascalCase, colon-separated, no underscores;
never an inline string. At minimum:
- the popup was opened, **with its source** as part of the event name (buy-button link / Instructions /
  locked feature — the last one is fired by `0302`, but reserve the shape here);
- *Buy* tapped **from the popup** — distinguishable from a tap on the card's own buy button (e.g. its own
  `uiElementIds` entry), so a purchase can be credited to the explainer. The existing
  `Purchase:Started|Completed|Abandoned:Citizenship` events stay as they are.

**Rules that apply throughout.**
- All visible text via `translateText()`; every new key in **both** `resources/lang/en.json` and
  `resources/lang/ru.json`. Russian is the primary audience — the ru copy is the one that matters.
- A new custom element goes in **both** `src/client/index.html` and `src/client/yandex-games_iframe.html`.
- Hidden entirely (popup, link and Instructions section) when `isCitizenshipSurfacesEnabled()` is false.
- Yandex rules: no real-country flags or country names in any imagery; nothing the store copy can't back.

## Verification steps

1. `worklog.md` holds the step-0 benefit table as verified, with the date and game version, and the
   owner's approval of the final en + ru copy.
2. **Non-citizen, logged in:** the link is visible under the buy button → tap → popup opens; it lists
   only approved benefits and the XP route with the right numbers; *Buy* runs the real purchase flow;
   after a (sandbox or owner-run) purchase the card shows the citizen state without a reload.
3. **Citizen:** the popup (from Instructions) shows no buy button. **Profile read failed / catalog has no
   product:** the popup shows no working buy button — same as the card.
4. **Guest:** the popup offers the login path, not a buy button.
5. **Kill switch off** (`citizenship_ui` not `enabled`, or `CITIZENSHIP_CARD_ENABLED` false): no link, no
   Instructions section, popup unreachable.
6. Instructions → *Citizenship* section → link → same popup.
7. Analytics: each source fires its own *opened* event; a buy tap from the popup fires its own event
   plus the existing `Purchase:*:Citizenship` events. Every new event is in the enum and in
   `analytics-event-reference.md`.
8. ru and en both render with no missing-key fallbacks; the Yandex iframe template shows the popup (it is
   the template production serves).
9. `grep` the new copy: **no** mention of ads, emoji, private lobbies, archive/history, or any other
   benefit that step 0 did not confirm. 📌 *2026-09-26:* private lobbies and ad-free are **expected** in
   the copy if `0302` / `0248` have shipped and step 0 confirmed them — the rule is "only what is real",
   not a fixed word list.
10. `npm test` and `npm run lint` pass.
11. *(Added 2026-09-26.)* **`0302`'s interim popup is gone:** a non-citizen's tap on the locked
    private-lobby button opens **this** explainer (with the locked-feature source event), `grep` finds no
    code or translation keys left from the interim popup, and `0302`'s locked look is unchanged.

## Notes

- **Depends on:** [`0302`](../0302-private-lobby-as-a-locked-citizen-perk/brief.md) and
  [`0248`](../0248-suppress-interstitial-ads-for-paid-citizens/brief.md) — OWNER RULINGS 2026-09-26 (see
  *Owner rulings* above): the popup describes their perks. ⚠️ Through `0248`, this also waits on
  [`0250`](../0250-authenticated-profile-read-for-paid-entitlement/brief.md). *Struck, not deleted — true
  until 2026-09-26:* ~~nothing — can start now.~~ (Step 0's owner copy approval is still a gate *inside*
  the task.)
- 🚢 **Release coupling (owner ruling 2026-09-26):** ships in the **same deploy** as `0302` — see *Owner
  ruling (second set)* above. Removing `0302`'s interim popup is part of this task.
- **Blocks:** nothing. ~~[`0302`](../0302-private-lobby-as-a-locked-citizen-perk/brief.md) — it reuses this
  popup and its analytics source shape.~~ *Reversed 2026-09-26:* `0302` now ships first. When this task
  ships, it re-points `0302`'s locked-button tap to this popup and adds the locked-feature *opened* event
  source (whatever `0302` open question 5 settles for the interim). ✅ *Settled 2026-09-26:* the interim
  is a simple "citizens only" popup with no buy button; this task deletes it.
- **Related, linked not merged:** [`0248`](../0248-suppress-interstitial-ads-for-paid-citizens/brief.md)
  (ad-free) and [`0249`](../0249-citizen-gated-full-emoji-set/brief.md) (emoji set) — when either ships,
  add its line to the explainer in that task, not here. [`0250`](../0250-authenticated-profile-read-for-paid-entitlement/brief.md)
  (the client cannot tell *paid* from *earned*) — only matters if a paid-only benefit is ever listed.
  [`0030`](../0030-archive-s3-backed-citizen-gated/brief.md) (match archive). Sprint 6's un-briefed perk
  rows — Nickname Styling, Map Voting, Replay Access, Custom Flags — each should add its explainer line
  when it ships. Kill switch: `0236` / `0238`. Paid flow: `0018`, `0065`.
- **Suggested standing rule for the owner to confirm:** *"a perk is added to the explainer by the task
  that ships it."* That keeps the popup honest without a separate copy task each time.
- ⚠️ **Priority 19 is append rank, NOT a merit ranking — flagged for owner confirmation.**
  **On merit this belongs at the top of the board, above the *Historical Multiplayer Maps* row** (Sprint 6
  plan Task 1, no folder ID yet), because it acts on the feature that just launched and is the cheapest
  lever on its first purchases, while the map tasks are deferred until after the launch by the owner's
  2026-09-26 ruling. Every row above it is open, so an owner-ruled move is possible (ADR-035).
  ✅ **Answered 2026-09-26 by owner ruling** — rank 5 (see *Owner rulings*).
- **Open questions for the owner** (also in the producer's hand-off):
  1. ✅ **ANSWERED 2026-09-26 — pull the perks forward first** (`0302` and `0248` now rank above this
     task). ~~**The benefit list is thin today** (★ badge + name change, maybe inbox). Ship the explainer with
     that honest list now, or pull a real perk forward first (`0248` ad-free is the strongest; `0302`
     private lobbies is close)? Producer recommendation: ship the explainer now, and pull `0248` forward
     beside it.~~
  2. Who sees the "What is citizenship?" link — only players who also see the buy button, or also
     guests and citizens?
  3. "Coming soon" lines for planned perks — allowed or not? Producer recommendation: **no** — the
     2026-09-12 store-copy ruling points that way, and a paid page promising unbuilt features invites
     complaints and Yandex moderation trouble.
