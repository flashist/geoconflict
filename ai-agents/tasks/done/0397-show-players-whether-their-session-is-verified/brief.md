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
✅ Done (agent-closed — not owner-verified)

## Owner
~~fkit-producer~~ fkit-coder

📌 **2026-10-06 — re-assigned to `fkit-coder` for Step 2.** Step 1 closed on the owner's rulings (see *Step 1 — CLOSED*
at the end of this brief), relayed by `fkit-lead` to a spawned `fkit-producer` (ADR-021/037). Earlier value kept above,
struck.

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
  [`0395`](../../done/0395-verify-0340-live-deploy-s3a-and-confirm-verified-logins-in-production/brief.md) and
  [`0396`](../../backlog/0396-verify-0250-s3b-live-deploy-the-verified-owner-view-and-confirm-it-in-production/brief.md). Shipped
  earlier, this display would tell **every** player "not verified". See the deploy note in *Notes*.
- **`0332` will widen what "unverified" costs.**
  [`0332`](../../backlog/0332-join-token-game-server-has-the-profile-server-vouch-for-a-verified-session/brief.md) has the owner
  rule, per perk, what an unverified player loses in matches: **XP crediting, the ★ badge, the private-lobby gate, the
  approved name**. Those rulings are not made yet. The wording chosen here must be able to grow to cover them without
  promising something they later take away.
- **ADR-116 Decision 4** (an unverified read never grants a paid benefit) is locked. This task explains it to the
  player; it does not soften it.

## What to build

### Step 1 — product planning (producer, with the owner). ⛔ Nothing in Step 2 is planned or built until this is approved. ✅ **CLOSED 2026-10-06 — owner rulings at the end of this brief.**

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

> 📌 **2026-10-06 — Step 1 spec DRAFTED, not yet owner-approved.** Spawned `fkit-producer` (no owner channel, ADR-021),
> at `fkit-lead`'s request during `/fkit-sprint-ship-loop`; `fkit-architect` consulted (hop 1). Draft:
> [`2026-10-06-0397-step1-product-spec.md`](../../../knowledge-base/reports/2026-10-06-0397-step1-product-spec.md).
> Key facts it adds: (1) an unverified **non-citizen** is certainly not paid (DB constraint `not is_paid_citizen or
> is_citizen`), so the notice only needs to reach unverified **citizens**; (2) a page reload does **not** usually fix an
> unverified session (ADR-121: same signed data for the whole visit) — the advice is "close and reopen the game";
> (3) today the card shows the **guest** card (with a working login button) until the first read returns;
> (4) 🚨 `0248`'s gate is already committed on `dev`, so the S3b profile server must not go live while a production
> client without `0397` is running. Four owner questions pending; rulings get recorded here verbatim. Nothing above
> this note was edited (ADR-035).

## Step 1 — CLOSED 2026-10-06 (owner rulings, verbatim)

**Authority.** OWNER RULINGS given **2026-10-06, live via `AskUserQuestion` in the `fkit lead` session**, relayed by
`fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037). ⛔ Not producer precedent. The options
were drafted in [`2026-10-06-0397-step1-product-spec.md`](../../../knowledge-base/reports/2026-10-06-0397-step1-product-spec.md)
(`fkit-architect` consulted at hop 1). **That spec is Step 2's design input; where it and these rulings differ, the
rulings win.**

| # | Question | Owner's answer, verbatim | What it means for Step 2 |
|---|---|---|---|
| Q1 | What to tell an unverified citizen ("paid but not verified") | *"A. One neutral message (Recommended)"* | One neutral message for **every unverified citizen**, paid or earned. **No device memory** of a past paid answer. Unverified non-citizens see nothing new (they cannot have paid — DB constraint `not is_paid_citizen or is_citizen`). |
| Q2 | Which states, where, wording, analytics | *"Full set + analytics (Recommended)"* | All states in spec §2, **inside the citizenship card, start screen only, nothing in matches**, with the approved text below and the three events below. |
| Q3 | What the player can do | *"Button on load-fail only (Recommended)"* | **One** player-pressed **"Restart game"** button, on the *couldn't load profile* state only, **never during a lobby or match**. *Not confirmed* gets **text advice only** (a reload does not usually fix it — ADR-121: same signed data for the whole visit). ⚠️ This **widens ruling D3** (2026-09-16, `0273`) by exactly this one button — recorded on `0273`. |
| Q4 | Deploy rule | *"Confirm + rollback rule (Recommended)"* | The **S3b profile server never goes live while a production client without `0397` is running.** `0397` may ship in the **same slot as `0396`**: S3b server first, then the owner's `0396` DevTools check, then the client. A server rollback also rolls the client back or switches `citizenship_ui` off — recorded on `0396`. |

### Approved wording (owner-approved 2026-10-06 — use exactly; keys are the spec's suggestions, the coder may rename them)

| State | EN | RU |
|---|---|---|
| Checking (no read applied yet — replaces today's wrong guest-card flash) | Checking your account… | Проверяем ваш аккаунт… |
| Confirmed paid citizen (verified owner view, paid) | ✓ Verified — your paid citizenship benefits are on | ✓ Подтверждено — преимущества платного гражданства включены |
| Not confirmed — citizen (authoritative read, `isCitizen`, no owner view) — **text only** | We couldn't confirm your account this time. If you bought citizenship, it's safe — you may just see ads until it's confirmed. Closing and reopening the game usually helps. | Не удалось подтвердить ваш аккаунт в этот раз. Если вы купили гражданство, оно сохранено — просто до подтверждения может показываться реклама. Обычно помогает закрыть игру и открыть её снова. |
| Couldn't load profile (`isAuthoritative === false`) | We couldn't load your profile right now. Nothing is lost — a restart usually helps. | Сейчас не удалось загрузить ваш профиль. Ничего не потеряно — обычно помогает перезапуск. |
| …its button | Restart game | Перезапустить |
| After a restart that didn't help | Still not working. Please try again a bit later — nothing is lost. | Всё ещё не получается. Попробуйте чуть позже — ничего не потеряно. |

Guests, verified non-paid players and unverified non-citizens: **nothing new**. Kill switch off: nothing new.
⛔ Every string via `translateText()`, in **both** `resources/lang/en.json` and `resources/lang/ru.json`.

### Approved analytics

- `Citizenship:Status:Unverified` — the *not confirmed* message shown, **at most once per page load**.
- `Citizenship:Status:ReadFailed` — the *couldn't load* message shown, **at most once per page load**.
- `Citizenship:Status:Restart` — the player pressed **Restart game**.
- No ids, no paid flag, no value. Enum keys in `flashistConstants.analyticEvents`; rows in
  `analytics-event-reference.md`. ⚠️ `Unverified` **also counts earned citizens** — it cannot count paid ones alone
  (that is the privacy point).

### Binding notes for Step 2 (from the spec and the architect consult — not new rulings)

- **One source (R1):** add `isVerifiedRead` to `PlayerProfileView`; add a **new, separate** published value (with
  subscribe) in `src/client/CitizenshipStatus.ts`, written only by the card in `refreshProfile()`. ⛔ Do not change
  the three-value `CitizenshipStatus`, nor `derivePaidCitizenship` / `publishPaidCitizenship` /
  `isCurrentPlayerPaidCitizen` (the `0248` ad gate), nor the superseded-read guard. `loadPlayerProfileView()` keeps
  exactly one caller.
- **Checking state** needs a new "not read yet" flag; it must hide the guest login button.
- **Restart button:** architect advice is a sibling of `0303`'s player-tapped reload (`CitizenshipRestartOffer.ts`),
  with its own event, **not** `requestGameRestart()` (whose `Profile:Login:Restart:*` events, sessionStorage need and
  cross-reload latch would make the button pollute `0274`'s funnel, do nothing in private mode, or look dead after a
  failed login). ⚠️ See the `0278` overlap note below — that brief says the opposite.
- **Source comments that cite D3** (`src/client/ProfileSession.ts` header, `src/client/GameRestart.ts` header) should
  name this second sanctioned trigger.
- **`0332` link:** when a `0332` ruling takes a perk from unverified players, that ruling's task rewrites the
  *not confirmed* text, and — if non-citizens lose something too (e.g. XP crediting) — switches on a message for
  unverified non-citizens. Pointer recorded on `0332`.

### ⚠️ Overlap flagged — [`0278`](../../cancelled/0278-missing-session-surface-on-the-logged-in-citizenship-card/brief.md) (Backlog)

`0278` (filed 2026-09-16 on an owner ruling, sequenced with the card launch) asks for a *"couldn't load your progress
— tap to restart"* surface on the logged-in zero-state card — **the same state** as this task's *couldn't load
profile* message and button. Two differences: `0278` also names the **late-SDK recovery path**
(`FlashistFacade.ts` ~736-741: a boot authorized after `startProfileSession()` skipped), and it says to **reuse
`0273`'s restart path**, where the architect advises a separate helper. **Not resolved here** — returned to
`fkit-lead` as an owner question (fold `0278` into this task, or keep both). Until ruled, Step 2 must not build a
second surface for the same state.

Nothing above this section was edited except the `## Owner` field (struck, not deleted). `## Status`, rank, sprint,
folder and board row unchanged; no mover run.


## ✅ 0278 overlap RESOLVED — folded into this task (owner ruling, 2026-10-06)

**Authority.** OWNER RULING given **2026-10-06, live via `AskUserQuestion` in the `fkit lead` session**, relayed by
`fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037). ⛔ Not producer precedent. Owner,
verbatim: *"Fold into 0397 (Recommended)"*. The option chosen said: `0397` also covers the slow-start (late-SDK
recovery) path, about +0.25 day; the restart button is its own separate helper, as the architect advised (not
`0273`'s login restart); `0278` is cancelled as "superseded by 0397" by the producer, marked agent-closed.

**Done in the same run:** [`0278`](../../cancelled/0278-missing-session-surface-on-the-logged-in-citizenship-card/brief.md)
cancelled via `/fkit-task-cancelled` — `⛔ Cancelled (agent-closed — not owner-verified) (2026-10-06) — superseded by
0397 — owner ruling 2026-10-06 (Fold into 0397)`. The *"⚠️ Overlap flagged"* section above is now settled by this
ruling (left as written, ADR-035).

### Step 2 scope added — the slow-start (late-SDK recovery) path

Where `0278` describes it (read these before planning):
- `0278` brief, **"### Situation B — the case D3 leaves with no way out"** (the logged-in, failed-login,
  0 XP, no-button card), and the paragraph directly below it starting **"A second path into the same state: the
  late-SDK recovery path"**.
- `0278` brief, **"## What to build" item 3** ("Cover the late-SDK recovery path … a boot authorized after
  `startProfileSession()` skipped must reach the same surface, not a silent 0 XP card") and **"## Verification
  steps" item 5** (a client test driving that path).

⚠️ **`0278`'s line pointer is stale.** It says `FlashistFacade.ts` "around lines 736-741"; on `dev` at `91eb99a` the
player-recovery code is the *"Player recovery, same pattern"* block in `src/client/flashist/FlashistFacade.ts`
(≈ `:1287-1300`, the late `getPlayer()` fill), signalled by `whenPlatformRecoveredLate()` (≈ `:1599`), which the
card already uses to re-check its flag gate (`CitizenshipCard.recheckWhenPlatformRecovers()`, task `0329`). The
boot login is started once in `startClient()` (`src/client/Main.ts` ≈ `:1101`, `void startProfileSession()`).

⚠️ **Verify the premise first — it may have changed since `0278` was written (2026-09-16).** On today's code
`ensureSession()` does **not** latch for an unauthorized boot (only a *failed* login latches, `ProfileSession.ts`
`loginFailed`), and `profileFetch()` re-runs it on every read, so a card read issued after the late recovery may
already log in normally. The coder's plan must say which is true, with evidence:
- **If the path still ends in a logged-in card with no session** → it must reach this task's approved *couldn't load
  profile* message and **Restart game** button (same wording, same separate restart helper), and a client test must
  drive that path (`0278` verification item 5).
- **If it already recovers** → no new code; a client test proving the late-recovered player gets a real read
  (or the *not confirmed* / *checking* states) is enough, and the worklog says so. The +0.25 day then shrinks.

**Verification step added (Step 2):** a boot that becomes authorized only through the late-SDK recovery path never
shows a bare 0 XP card with no action — it shows a real read, *checking*, *not confirmed*, or *couldn't load profile*
with its button (client test).

**Restart helper, now owner-ruled:** a **separate** helper with its own `Citizenship:Status:Restart` event (a sibling of
`0303`'s player-tapped reload) — ⛔ **not** `requestGameRestart()` / the `Profile:Login:Restart:*` funnel.
`0278`'s *"reuse S4's restart path, do not write a second one"* is superseded by this ruling.

Nothing above this section was edited. `## Status` (`🔄 In progress`), rank, sprint, folder and board row unchanged.
