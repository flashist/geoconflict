# Show the player whether their session is verified — so a paid citizen who still sees ads knows why

## ID
0397

> ℹ️ **ID allocation, checked 2026-10-06 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/`
> (folder names and `## ID` fields agree) is `0396`, so this is `0397`. `grep -rn 0397 ai-agents .claude`: no hits
> before this filing other than the `0248` note written in the same run, which links here.

## Sprint
Sprint 7

📌 **Filed 2026-10-06 on an OWNER RULING (R2)** given live via `AskUserQuestion` in the `fkit lead` session, relayed by
`fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021; ADR-037 §3). ⛔ Not producer precedent.
Placement, verbatim: *"Sprint 7, now (Recommended)"*.

## Priority
46

⚠️ Priority 46 is append rank, NOT a merit ranking — flagged for owner confirmation. The owner gave no rank, so it is
appended after the board's highest (45, `0395`), per ADR-035. **On merit this belongs directly below `0250`** (just above
`0248`), because `0248` may not deploy until this display is live (owner ruling R3, 2026-10-06), so it has to be ready
first.

## Status
🔄 In progress

## Owner
fkit-producer

⚠️ **`fkit-producer` first, by owner ruling.** Step 1 is product planning that the owner asked the producer to do
(*"producers should make product decisions where and how we should show this information"*). It re-assigns to
`fkit-coder` once Step 1's spec is approved by the owner.

## Context

### Why this exists — the owner's words

Owner, 2026-10-06, verbatim excerpt: *"we should make it visible for a user that the current session is verified and
has all the benefits of the paid citizen … Maybe this needs another task, maybe it needs a proper product planning
first, meaning producers should make product decisions where and how we should show this information. But we need to be
explicit about the state with the users to avoid situations when they are confused."*

[`0248`](../../done/0248-suppress-interstitial-ads-for-paid-citizens/brief.md) turns interstitial ads off for **paid citizens**
(owner ruling R1, 2026-10-06: all six placements). It reads `0250` S3b's `isPaidCitizen`, which is **true only on a
verified session** and **false on every unknown** — so ads show (fail open to ads, on purpose). A good-faith paid
citizen will therefore still see ads when:

- **their session is not verified this load** — a `vfy:false` session: Yandex's signed player data was stale,
  missing or failed (for example during a Yandex outage). Login never fails for this reason; it quietly falls back
  to unverified (`src/client/ProfileSession.ts`, header comment).
- **the profile read has not returned yet** — every match exit reloads the page, and an ad can fire before the card's
  read comes back (Step 1 report §1).
- the profile read failed or timed out.

Without a visible state, that player just sees an ad they paid not to see. **This task makes the state visible.**

### What the client can and cannot know today — code read 2026-10-06, `dev` at `d2aeb80`

| Fact | Evidence |
|---|---|
| The client can tell a **verified** session from an unverified one, but only once the profile read returns: the server sends the paid fields **only** in the verified owner view, so their presence is the marker. | `src/client/PlayerProfileView.ts` (`isOwnerView = profile.is_paid_citizen !== undefined`) |
| On a verified session the client knows **paid / not paid** (`isPaidCitizen`). | `PlayerProfileView.ts`, `isPaidCitizen` |
| 🚨 **On an unverified session the client CANNOT know whether the player paid.** The unverified view is the same for everyone and carries no paid fields — on purpose, so a guessed id cannot reveal who paid (`0250` S1; ADR-116 Decision 4). | `src/core/profile/PlayerProfile.ts` (public schema omits the paid fields); `0250` brief |
| The Yandex SDK does not help: citizenship purchases are **consumed** by reconciliation, so `getPurchases()` stops listing them. | `src/client/PaymentsReconciliation.ts` header |
| Only the citizenship card reads the profile, and it must stay the only caller (a second caller can double-fire `Citizenship:Earned:XP`). Page-wide state is published from the card — precedent `src/client/CitizenshipStatus.ts` (`0302`). | `CitizenshipStatus.ts`; `src/client/Inbox.ts` comment |
| A failed login is final for the page load; the only recovery is a full restart, and only from the player's own press of the card's login button (ruling D3, 2026-09-16). | `ProfileSession.ts` header; `src/client/GameRestart.ts` |
| The card is behind the kill switch `CITIZENSHIP_CARD_ENABLED` and the remote `citizenship_ui` flag. | `src/client/CitizenshipCard.ts` |

⇒ **The state the owner named first — "paid, but not verified this session" — cannot be shown from what the server
sends today without undoing a privacy decision.** Step 1 must decide what to show instead, or how to learn it safely.
⛔ The coder must not decide this.

### Dependencies and conflicts, flagged

- **One place for "is this a paid user?"** (owner ruling R1 on `0248`, 2026-10-06): this display must read the **same**
  page-wide paid state that `0248`'s Step 2 uses to switch ads off. Whichever task is built first creates it; the other
  reuses it. ⛔ Never a second paid-status source, never a second profile read.
- **Before `0395` and `0396` are live, every session is unverified.** S3a (`0340`, verified sessions) and S3b (`0250`,
  owner view) are built but not deployed; their live checks are
  [`0395`](../0395-verify-0340-live-deploy-s3a-and-confirm-verified-logins-in-production/brief.md) and
  [`0396`](../0396-verify-0250-s3b-live-deploy-the-verified-owner-view-and-confirm-it-in-production/brief.md). Shipped
  earlier, this display would tell **every** player "not verified". See the deploy note in *Notes*.
- **`0332` will widen what "unverified" costs.**
  [`0332`](../0332-join-token-game-server-has-the-profile-server-vouch-for-a-verified-session/brief.md) has the owner
  rule, per perk, what an unverified player loses in matches: **XP crediting, the ★ badge, the private-lobby gate, the
  approved name**. Those rulings are not made yet. The wording chosen here must be able to grow to cover them without
  promising something they later take away.
- **ADR-116 Decision 4** (an unverified read never grants a paid benefit) is locked. This task explains it to the
  player; it does not soften it.

## What to build

### Step 1 — product planning (producer, with the owner). ⛔ Nothing in Step 2 is planned or built until this is approved.

Write a short spec, put it to the owner, record the rulings in this brief. It must settle:

1. **The states to show.** At least: **verified paid citizen** · **paid but not verified this session** (see the
   🚨 fact above — decide whether this state is shown, replaced by a neutral "session not verified" state shown to
   every logged-in unverified player, or learned some other way) · **checking** (profile read in flight) · **not a paid
   citizen**. Also decide what a guest (not logged in to Yandex), a failed read and an earned-only citizen see — or
   that they see nothing new.
   - If a way to learn "paid but unverified" is wanted (for example the device remembering the last verified paid
     answer for this player), **consult `fkit-architect`** on its privacy and trust cost first, and put that cost to
     the owner. ⛔ It must never grant a benefit — ADR-116 D4 stands — only change what the player is told.
2. **Where on screen.** The owner's hint: near the citizenship card. Decide the exact spot, and whether anything shows
   during a match or only on the start screen.
3. **Wording, EN and RU.** ⛔ **Never blame the player** — an unverified session is usually Yandex's side or timing,
   not theirs. Plain words; no "error" tone for the normal "checking" moment. ⚠️ Do not promise "no ads" outright:
   whether Yandex itself shows a fullscreen ad our code never asked for is unverified (`0248` Step 1 report §1).
4. **What the player can do.** Retry / reload: say exactly which action, reusing the existing restart path (the
   player's own press only; no automatic loops, ruling D3). Say what happens if it still fails.
5. **The link to `0332`.** How the wording covers what "unverified" costs today (ads) and later (whatever `0332`'s
   owner rulings add for XP, ★, private lobby, approved name) — and who updates it when those rulings land.
6. **Analytics (decide yes/no).** Whether showing the unverified state is logged, so the owner can see how many paid
   players hit it. If yes: follow `analytics-event-reference.md` and the `flashistConstants.analyticEvents` enum, never
   an inline string.

### Step 2 — build (fkit-coder, after Step 1 is approved)

- Render the approved states in the approved place with the approved wording.
- Read the **one** page-wide paid/verified state (see *Dependencies*). The card stays the only profile reader.
- **All user-visible text via `translateText(key)`; add every key to both `resources/lang/en.json` and
  `resources/lang/ru.json`.**
- **Respect the kill switch:** with `CITIZENSHIP_CARD_ENABLED` false or the `citizenship_ui` flag off, nothing new shows.
- A state change after a purchase (`PURCHASES_RECONCILED_EVENT`) or after the read returns must update the display
  without a reload.

## Verification steps

1. **Step 1 spec written and owner-approved** — states, place, EN + RU wording, player action, `0332` link, analytics
   decision — each with the owner's ruling recorded in this brief, verbatim.
2. **Each approved state renders correctly**, checked on a real build: a verified paid account; a verified non-paid
   account; an unverified session (forced, for example by sending no signature); the moment before the read returns
   (throttled network); a guest. For each, the shown text matches the approved wording in both EN and RU.
3. **The verified-paid state appears only when `isPaidCitizen` is true**, and never on an unverified session. Unit
   tests cover the state derivation for every input combination, including unknown.
4. **One source:** the display and `0248`'s ad gate read the same page-wide state; `loadPlayerProfileView()` still has
   exactly one caller. Shown by code search, stated in the worklog.
5. **Kill switch:** with `CITIZENSHIP_CARD_ENABLED` false, nothing new shows. ⚠️ The remote `citizenship_ui` half cannot
   be exercised in `npm run dev` (`0238`); record it as unverified rather than claiming it.
6. **Translations:** every new key exists in both `en.json` and `ru.json`; no hard-coded strings (code search).
7. **The retry action** does what the spec says and only on the player's press.
8. **No blaming wording** — the owner reads the final EN and RU text and approves it.

## Notes

- **Depends on:** nothing
- Why nothing: the paid/verified values the display needs already exist in code (`0250` S3b, done). Only the **deploy**
  waits — see the deploy note below.
- **Blocks:** nothing
- 📌 Not a link, but binding: by owner ruling R3 (2026-10-06), [`0248`](../../done/0248-suppress-interstitial-ads-for-paid-citizens/brief.md)
  **deploys only together with, or after, this task is live** — recorded on `0248` as a deploy note, not a `Depends on`
  link; `0248`'s build is not blocked.
- 📌 **Deploy note (producer's reading, flagged for owner confirmation):** deploy this only with or after `0395`
  (verified sessions live) and `0396` (owner view live). Before both, every session reads as unverified, so the display
  would tell every player "not verified". This follows from the facts above; the owner has not ruled it as such.
- **Shared seam with `0248`:** whichever of the two is built first creates the one page-wide paid state; the brief of
  the second must not add another (owner ruling R1, recorded on `0248`).
- **Effort:** unknown until Step 1 closes. If the states are the four the client can already tell apart, Step 2 is
  small (~0.5–1 day). A "remember the paid answer on this device" option would add an architect consult and more.
- No source code, no commit. Sensitive values (tokens, signatures, ids) must never appear in the UI, logs or analytics.
