# Private lobbies as a citizen perk — shown LOCKED to non-citizens, tap opens the citizenship explainer

## ID
0302

## Sprint
Sprint 6

## Priority
2

**Board rank on [Sprint 6](../../../sprints/plan-sprint-6.md), OWNER-RULED 2026-09-26** — see *Owner
ruling* below. ~~20~~ was the append rank until then.

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**Filed 2026-09-26 by a spawned `fkit-producer` with no owner channel (ADR-021), on an owner request
given in the `fkit lead` session and relayed by `fkit-lead`.** Split out of the same request as
[`0301`](../0301-citizenship-explainer-popup-and-purchase-funnel/brief.md) (the explainer popup). ⚠️ The
owner asked for the work; they did **not** rule that private lobbies become a citizen perk, how it is
enforced, or this split. ⛔ Not producer precedent. *(Kept as written; answered below.)*

### ✅ OWNER RULING, 2026-09-26 — the perk is APPROVED as proposed, and ranked 2nd in Sprint 6

Given live in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead` to a spawned
`fkit-producer` with no owner channel (ADR-021; the relay named the ruling, ADR-037 §3); ⛔ not producer
precedent. The question, as put: *"0302: make private lobbies a citizen perk? … citizens can create them;
non-citizens see a locked button that opens the citizenship popup; joining a friend's lobby by invite
stays free."* The owner's own words: *"Yes, and it should be the 2nd priority for the Sprint 6, because
the "funnel/explanation" of the perks would depend on it."*

- **Settled:** private lobbies become a citizen perk (open question 1 — **yes**). **Creating** a lobby is
  the perk; **joining** a friend's lobby by invite **stays free** (open question 2 — **yes**, as
  recommended).
- **Rank:** 2 on Sprint 6 — **above** [`0301`](../0301-citizenship-explainer-popup-and-purchase-funnel/brief.md).
  The dependency is therefore **reversed**: `0301` now depends on this task (it lists this perk), and this
  task **no longer depends on `0301`**. See *Dependencies* and open question 5.
- ⚠️ **Reading, open to owner correction:** *"citizens"* is read as **`is_citizen` — earned (XP) OR
  paid**, the owner's word and `plan-index.md` item 8b's (*"citizens only"*). That needs no paid-state read,
  so [`0250`](../0250-authenticated-profile-read-for-paid-entitlement/brief.md) is **not** a prerequisite.
  If the owner meant **paid** citizens only, `0250` becomes a hard prerequisite, exactly as for `0248`.
- ⛔ **Not settled by the ruling:** open questions 3 and 4 (server-side gate; what shows when citizenship
  is off or the profile read fails), the new open question 5 (what the locked tap opens before `0301`
  ships), and the `0068` trust condition below. 📌 *Questions 5, 6 and the trust condition were answered
  later the same day — next section.*

### ✅ OWNER RULINGS, 2026-09-26 (second set) — interim popup, same deploy, earned-or-paid, risk accepted

Given live in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead` to a spawned
`fkit-producer` with no owner channel (ADR-021; the relay named each ruling, ADR-037 §3); ⛔ not producer
precedent. Verbatim:

- **What the locked button opens before `0301` exists** (open question 5) → the owner's own words: *"We
  will ship the 2 features in the same deploy. As a "temporary" solution, we can show a simple popup with
  information that this feature is only for citizens, without the "buy" button, but later when we do the
  better "what is citizenship + buy it" popu, this simple solution will be removed."*
  - **Build:** a **simple "citizens only" info popup — NO buy button.** It is **temporary**:
    [`0301`](../0301-citizenship-explainer-popup-and-purchase-funnel/brief.md) **removes** it and points the
    locked tap at the full explainer.
  - 🚢 **This task and `0301` ship in the SAME deploy.** Build this first (it ranks above `0301`), but do
    **not** release it on its own. ⚠️ `0301` waits on `0248`, which waits on `0250`, so the shared release
    waits on both. *(Note: the owner chose neither of the producer's options — the recommendation was the
    existing citizenship card.)*
- **Who may create private lobbies** (open question 6) → **"Earned or paid (Recommended)"**. The gate is
  `is_citizen` (earned via XP **or** paid). ⇒ **No dependency on
  [`0250`](../0250-authenticated-profile-read-for-paid-entitlement/brief.md).** The *"Reading, open to owner
  correction"* bullet above is confirmed.
- **The forged-id risk** (the `0068` trust condition, folded into open question 3) → **"Accept for now
  (Recommended)"**. Recorded as an accepted residual below.

**The owner's words (voice-dictated, lightly garbled):**
> *"I'm right now checking the single play tab on the main screen we don't have their private lobby we
> don't have it either on the multiplayer tab … if it's hidden right now for [non-]citizens we might
> actually show it for all non-citizens but we should show it as it's locked and if a non-citizen clicks
> on that we need to show them the same … pop-up explaining what the citizenship is, what are the
> benefits of it and the option to buy citizenship"*

### 🚨 The owner's premise does not match the code — read this first

The owner assumed the private-lobby button is **hidden for non-citizens** (so citizens already have it).
**It is hidden for everyone, and nothing gates it on citizenship.** Producer read of the code,
2026-09-26:

- The *Create Lobby* (`#host-lobby-button`) / *Join Lobby* (`#join-private-lobby-button`) row in
  `src/client/yandex-games_iframe.html` (~line 314, a `Flashist Adaptation` block) carries
  `style="display: none;"`. It has since the Yandex port (commit `18bb3e3`, 2025-11-07). Production serves
  this template. The standalone `src/client/index.html` still shows the row.
- The click handlers in `src/client/Main.ts` (~lines 482–513) check only that the username is valid. No
  citizenship check. The server's `POST /api/create_game/:id` (`src/server/Worker.ts:182`) has none
  either.
- The flow itself works on Yandex: `0198` (Sprint 4) fixed its broken start URL.
- *"Private lobbies — citizens only"* is a planned item (`ai-agents/sprints/plan-index.md`, item 8b,
  *"Directly requested by players; creates friend-invite conversion loop"*). It was never briefed or built.

**So this task is not "add a lock to a citizen feature". It is "make private lobbies a citizen
feature"** — show the row again, let citizens use it, and show it locked to everyone else. That is a
product decision (open question 1). Showing a locked button that stays locked after purchase would be a
false promise on a paid product.

### Dependencies and conflicts
- ~~**Needs [`0301`](../0301-citizenship-explainer-popup-and-purchase-funnel/brief.md)'s popup** — the
  locked tap opens it.~~ 📌 **Reversed 2026-09-26 by owner ruling:** this task now ranks **above** `0301`
  and `0301` depends on it. Until `0301` ships there is no popup for the locked tap to open — **open
  question 5**. Producer recommendation: the tap opens the **existing citizenship card** (it already has
  the buy button), and `0301` re-points it to the popup when it ships. ✅ **Owner-ruled 2026-09-26
  (second set) — differently:** a simple *"citizens only"* info popup with **no** buy button, removed by
  `0301`; both ship in the **same deploy**.
- 🚨 **Trust — a condition an earlier review attached to the citizen flag ends here.** `0068`'s accepted
  residuals (`ai-agents/tasks/done/0068-citizen-verified-icon/review.md`, *Accepted residuals*) hold
  **only while the citizen flag stays purely cosmetic**: R3 (`isCitizen` is readable on the
  unauthenticated `GET /api/game/:id` lobby poll) and the ADR-103 residual (a forged, client-asserted id
  can make a player look like a citizen). **A private-lobby gate is a permission, so both are VOID for
  this path and must be re-decided in step 0** — by the owner, with `fkit-architect` if needed. The
  concrete risk: a non-citizen who asserts a citizen's id can create private lobbies. Related:
  [`0267`](../0267-investigate-verifying-platform-player-identity/brief.md) (verifying the platform
  identity — the real fix, on the Backlog board). Folded into open question 3. ✅ **Owner-ruled
  2026-09-26: accepted for now** — see *Accepted residual* below.

### Accepted residual — forged citizen identity can unlock private lobbies (OWNER RULING 2026-09-26)

- **What:** the game trusts the player id the client sends (ADR-103). A cheater who asserts a citizen's
  id can pass the citizen check and create private lobbies. `isCitizen` is also readable on the
  unauthenticated `GET /api/game/:id` lobby poll (`0068` R3), which helps a cheater find a citizen's id.
- **Ruling:** asked *"Once private lobbies are a citizen perk, a cheater who pretends to be a citizen's
  account could create lobbies … Accept that for now?"*, the owner chose **"Accept for now
  (Recommended)"**. ⚠️ *Producer reading:* this covers the `0068` R3 exposure too, for this path, because
  its only harm here is helping that same cheat. Re-raise if the owner reads it otherwise.
- **Why acceptable now:** the perk is a convenience (hosting a lobby), not money or data; joining stays
  free for everyone; it matches the owner's 2026-09-15 view that trusting the id is OK for now.
- **The real fix:** [`0267`](../0267-investigate-verifying-platform-player-identity/brief.md) — verify the
  platform identity (Backlog board).
- **Re-raise if:** private lobbies gain value beyond convenience (e.g. rewards, ranked play, anything paid
  or scarce), **or** abuse is seen (non-citizens hosting private lobbies).
- ⛔ This does **not** decide open question 3's other half — whether the server also refuses a
  non-citizen's `create_game`. That is still a step-0 plan choice; the ruling only says the forged-id
  bypass is tolerated either way.
- **Kill switch** (`0236`/`0238`): when citizenship surfaces are off, the row goes back to **exactly
  today's state** (hidden). It must never fall back to *unlocked for everyone*.
- **Why it was hidden in 2025 is not recorded** here. Step 0 checks the git history and the Yandex
  moderation notes before un-hiding it.
- **Joining vs hosting.** A friend who receives an invite link joins through the URL hash, not the
  button. Should joining stay free (only *hosting* is the perk)? Producer recommendation: yes — gating
  the join side would break the friend-invite loop that is the whole reason for 8b. Open question 2.
  ✅ **Owner-ruled 2026-09-26: joining by invite stays free.**

## What to build

**Step 0 — decisions and design, before code.**
1. Owner decision recorded in `worklog.md`: private lobbies become a citizen perk (open question 1), and
   what exactly is gated (open question 2). ✅ **Both answered 2026-09-26** (see *Owner ruling*) — copy
   them into `worklog.md`; do not re-ask.
2. Find out why the row was hidden in the Yandex port. If the reason still holds (e.g. a moderation
   condition), **stop and route it to the producer**.
3. Decide **where the gate is enforced**: client only (hide/lock the button), or also on the server
   (refuse `create_game` from a non-citizen — the game server already resolves each client's citizen flag
   for the badge, `GameServer.ts`, `0068`/`0217`). Put this in `plan.md` and consult `fkit-architect` if
   it is not obvious. The owner decides how much bypass risk is acceptable for a cosmetic-grade perk
   (open question 3). ⚠️ This decision must also re-decide `0068`'s cosmetic-only residuals (see
   *Dependencies* — they are void once the flag gates a permission).

**Step 1 — show the row again, in three states,** in `yandex-games_iframe.html` (and keep `index.html`
consistent):
- **Citizen** (authoritative profile): the buttons work as they do in `index.html` today.
- **Non-citizen, or guest:** the buttons are visible with a clear *locked* look (a lock icon plus a
  *"Citizens only"* hint). A tap does **not** open the lobby modal. It opens the `0301` explainer with the
  locked-feature source. 📌 **2026-09-26:** `0301` now ships **after** this task, so what the tap opens in
  the meantime is **open question 5** — build whichever the owner picks. ✅ **Owner-ruled (second set):
  a simple "citizens only" info popup, NO buy button** (en + ru via `translateText()`; obeys the kill
  switch). `0301` removes it. Both tasks go out in the **same deploy**.
- **Citizenship surfaces off, or the profile read failed:** follow the answer to open question 4.
  Producer recommendation: *off* → hidden (today's state); *profile read failed* → locked, never
  unlocked.

**Step 2 — build the locked state so later perks can reuse it.** A small shared *locked-feature* look and
behaviour, so the emoji set (`0249`), the archive (`0030`) and the Sprint 6 perks can lock their own entry
points the same way. Only apply it to private lobbies in this task.

~~**Step 3 — add the perk to the explainer.** Add the *private lobbies* line to `0301`'s benefit list
(en + ru), now that it is real.~~ 📌 **Moved to `0301` on 2026-09-26:** this task now ships first, so there
is no explainer to edit yet. `0301` lists private lobbies itself.

**Step 4 — analytics.** Add a locked-feature tap event (the feature is part of the event name, e.g. the
private lobby), plus the explainer-opened event with the locked-feature source whose shape `0301`
reserved. Add both to `flashistConstants.analyticEvents` and
`ai-agents/knowledge-base/analytics-event-reference.md`. PascalCase, colon-separated, no underscores.

**Rules that apply throughout.** All text via `translateText()` in both `en.json` and `ru.json`; any new
element in both HTML templates; Yandex rules (no real-country flags or names, no claims the product
doesn't back).

## Verification steps

1. `worklog.md` records the owner's answers to open questions 1–4 and the history finding from step 0.
2. **Citizen** on the Yandex build: the Create Lobby button opens the host modal; a private match starts
   and a friend joins through the invite link.
3. **Non-citizen:** the buttons show as locked; a tap opens the `0301` explainer (not the lobby modal)
   and fires the locked-feature event plus the explainer-opened event with the locked-feature source.
   📌 *2026-09-26:* until `0301` ships, the tap opens whatever open question 5 settles, and the
   explainer-opened event is `0301`'s to add. ✅ *Settled:* the tap opens the simple "citizens only" info
   popup, which has **no** buy button. Verify both in this task's own test, and again in the combined
   release with `0301` (where the tap must open the full explainer and the interim popup must be gone).
4. **Non-citizen buys from that explainer:** the buttons unlock without a reload.
5. **Guest** and **profile read failed:** locked, never usable.
6. **Kill switch off:** the row is hidden, exactly as today.
7. If a server-side gate was chosen: a non-citizen's direct `create_game` call is refused, with a test.
   Any change under `src/core/` is tested.
8. The invite join path still works for a non-citizen friend (if open question 2 goes the recommended way).
9. ~~The explainer now lists private lobbies in both languages.~~ *(moved to `0301`, 2026-09-26)*
10. `npm test` and `npm run lint` pass.

## Notes

- **Depends on:** nothing.
- 🚢 **Release coupling (owner ruling 2026-09-26):** ships in the **same deploy** as
  [`0301`](../0301-citizenship-explainer-popup-and-purchase-funnel/brief.md). Not a build dependency —
  this task is built first — but it must not be released alone.
- *History of the line above — updated 2026-09-26 by owner ruling, kept in its own bullet so no tool reads
  the old link as a live dependency:* it read *"`0301` (the popup and its analytics source shape); an
  owner decision (open question 1)"*. The owner decision is taken, and this task now ranks above `0301`.
- **Blocks:** [`0301`](../0301-citizenship-explainer-popup-and-purchase-funnel/brief.md) — it lists this perk
  (owner ruling 2026-09-26). Otherwise nothing directly. Its shared locked-feature state is meant for reuse by
  [`0249`](../0249-citizen-gated-full-emoji-set/brief.md), [`0030`](../0030-archive-s3-backed-citizen-gated/brief.md)
  and Sprint 6's perk rows (Nickname Styling, Map Voting, Replay Access, Custom Flags). Linked, not merged.
- Related: `0198` (private-lobby start URL, fixed); `0166` (start-screen redesign reserved space for a
  private-lobby entry in the Multiplayer tab); `0068` (citizen badge — the server-side citizen flag);
  `plan-index.md` item 8b.
- ⚠️ **Priority 20 is append rank, NOT a merit ranking — flagged for owner confirmation.**
  **On merit this belongs directly below [`0301`](../0301-citizenship-explainer-popup-and-purchase-funnel/brief.md)**,
  because it needs that popup, and it turns *"we have almost no perks"* into one real, visible one.
  ✅ **Answered 2026-09-26 by owner ruling — the other way:** rank 2, **above** `0301`.
- **Open questions for the owner** (also in the producer's hand-off):
  1. ✅ **ANSWERED 2026-09-26 — yes.** ~~Make private lobbies a citizens-only perk? (Today they are
     switched off for everyone.) Producer recommendation: yes — it is the cheapest real perk to add,
     because the feature already exists.~~
  2. ✅ **ANSWERED 2026-09-26 — yes, joining by invite stays free.** ~~Gate only *creating* a lobby, and
     keep *joining* by invite free? Producer recommendation: yes.~~
  3. *(Forged-id half ✅ ANSWERED 2026-09-26 — accepted for now; see* Accepted residual*. The
     server-side half below is still a step-0 plan choice.)* Is a client-side lock enough, or must the server refuse too? Producer recommendation: server-side
     too, if step 0 shows it is cheap (the citizen flag is already resolved there); otherwise client
     only, and accept the bypass risk. ⚠️ *Added 2026-09-26:* either way, the owner must also accept or
     reject that a forged id can unlock the perk — `0068`'s cosmetic-only residuals end here (see
     *Dependencies*).
  4. What non-citizens see when citizenship is switched off, or the profile read fails. Producer
     recommendation: switched off → hidden; profile read failed → locked.
  5. ✅ **ANSWERED 2026-09-26 — a simple "citizens only" info popup, no buy button; removed by `0301`;
     both ship in the same deploy.** *Question as asked, kept:* *(New, 2026-09-26.)* **This task now ships before the explainer popup (`0301`). What should the
     locked button open until then?** (a) the existing citizenship card, which already has the buy
     button; `0301` later re-points the tap to the popup; or (b) ship the locked look now, and add the tap
     behaviour inside `0301`. Producer recommendation: **(a)** — a locked button that does nothing on tap
     is a dead end, and (a) reuses a screen that already exists, so almost nothing is thrown away.
  6. ✅ **ANSWERED 2026-09-26 — "Earned or paid (Recommended)".** No dependency on `0250`. *Question as
     asked, kept:* *(New, 2026-09-26.)* **"Citizens" means earned OR paid** — confirm? Producer reading: yes (see
     *Owner ruling*). If paid-only was meant, this task waits on `0250`.
