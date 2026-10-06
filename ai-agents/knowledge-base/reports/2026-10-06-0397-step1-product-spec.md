# 0397 Step 1 — product spec draft: showing the player whether their session is verified

- **Date:** 2026-10-06
- **Task:** [`0397`](../../tasks/done/0397-show-players-whether-their-session-is-verified/brief.md), **Step 1 only** (product
  planning). ⛔ Step 2 (the build) is not planned here beyond what Step 1 must hand it.
- **Written by:** a spawned `fkit-producer` with no owner channel (ADR-021), at `fkit-lead`'s request while it drives
  `/fkit-sprint-ship-loop` on Sprint 7. `fkit-architect` was consulted (hop 1) on the technical half — see §9.
- **Evidence base:** `dev` working tree at `91eb99a`, code read this turn. File references are to that tree.
- ⛔ **Status: DRAFT for owner approval.** Nothing below is ruled. The open questions are in §10; the owner's
  answers get recorded verbatim in the brief, not here.

## TL;DR

1. **The catch is smaller than it looked.** On an unverified session the server hides *paid*, but still tells the
   truth about *citizen* (`is_citizen`), and the database forbids "paid but not citizen"
   (`migrations/006_player_identity.sql:81`, `check (not is_paid_citizen or is_citizen)`). So an unverified
   **non-citizen** is certainly **not** paid. Only an unverified **citizen** is "maybe paid". The notice only has to
   reach that group.
2. **Recommended:** a neutral notice for every **unverified citizen** (paid or earned): *"We couldn't confirm your
   account this time. If you bought citizenship, it's safe — you may just see ads until it's confirmed. Closing and
   reopening the game usually helps."* No device memory. Nothing new for guests, non-citizens, or verified non-paid
   players.
   ⚠️ **Architect correction:** a page reload usually does **not** fix an unverified session — Yandex hands out the
   **same signed data for the whole visit** (ADR-121 Context; a re-fetch returns the same data ~99% of the time). So
   the unverified notice advises **closing and reopening the game**, not a Restart button. A **Restart game** button is
   recommended only on the separate "couldn't load your profile" notice, where a reload does help.
3. **Where:** inside the citizenship card on the start screen, as one small line under the name/XP row. **Nothing in
   matches.**
4. **One source:** Step 2 extends `src/client/CitizenshipStatus.ts` from one boolean to one published "session
   state" the display reads; `isCurrentPlayerPaidCitizen()` keeps its exact behaviour for the `0248` ad gate.
5. **Deploy:** confirmed and made exact — needs `0340`/`0395`, the S3b profile **server** (`0396`) and `0391` live.
   Before them **every** citizen would read as unverified and see the notice. 🚨 `0248`'s ad gate is already committed
   on `dev`, so the real rule is: **the S3b profile server must not go live while a production client without `0397`
   is running** (§11).

## 1. What the client can tell apart today

| Situation | What the card has (code terms) | Can we tell? |
|---|---|---|
| Citizenship UI off | `CITIZENSHIP_CARD_ENABLED` false, or `citizenship_ui` flag off → card hidden (`CitizenshipCard.ts:117`, `:124`) | yes |
| Read not back yet | `profile === null` **and** no read applied yet. ⚠️ Today the card renders this as the **guest** card (`render()`, `:443`) — a logged-in player briefly sees the "Log in with Yandex" button. | **no — needs a new "not read yet" flag** |
| Guest | read applied, `profile === null` (`loadPlayerProfileView()` returns null only for "not authorized", `PlayerProfileView.ts:100`) | yes |
| Read failed | read applied, `isAuthoritative === false` (login failed / timed out, fetch failed, bad body, no id, unconfigured API) | yes |
| Unverified, not a citizen | `isAuthoritative`, `isCitizen === false`, no owner view | ⚠️ **owner-view marker is lost**: `PlayerProfileView` folds it into `isPaidCitizen: false` (`:144`). Needs a new field. |
| Unverified, citizen (paid **or** earned — hidden on purpose) | `isAuthoritative`, `isCitizen === true`, no owner view | same — needs the new field |
| Verified, not paid (earned citizen or non-citizen) | owner view, `is_paid_citizen === false` | same — needs the new field |
| Verified, paid | owner view, `is_paid_citizen === true` → `isPaidCitizen === true` | yes |

**How long "not read yet" can last.** Usually short (the signed player data is pre-fetched at boot). Worst case the
login waits on Yandex's signed call up to its 60 s hang net (`SIGNED_PLAYER_HANG_MS`, `FlashistFacade.ts:561`), then
a 5 s login and a 5 s read. An entry ad (Mission button etc.) pressed in that window **shows** — an owner-accepted
`0248` residual ("Ad before first profile read").

## 2. The states — recommended set

| # | State | When (code terms) | Shows |
|---|---|---|---|
| S0 | Citizenship UI off | kill switch or flag off | **nothing** (card hidden — unchanged) |
| S1 | Checking | card enabled, no read applied yet | a quiet line **instead of the wrong guest flash**: "Checking your account…" |
| S2 | Guest | read applied, profile null | **nothing new** (existing guest card) |
| S3 | Couldn't load | read applied, `isAuthoritative === false` | notice + **Restart game** button (today a paid citizen here sees **0 XP and no badge** — looks like their citizenship is gone) |
| S4 | Verified paid citizen | owner view, paid | a small confirmation line: "✓ Verified — your paid citizenship benefits are on" |
| S5 | Verified, not paid | owner view, not paid | **nothing new** (verification changes nothing for them today) |
| S6 | Not confirmed, citizen | authoritative, `isCitizen`, no owner view | notice, text only — advises closing and reopening the game (the key state — see §3, §6) |
| S7 | Not confirmed, not a citizen | authoritative, `!isCitizen`, no owner view | **nothing new** — certainly not paid, loses nothing today. ⚠️ May change with `0332` (§6). |

**Earned-only citizen:** verified → S5 (nothing new); unverified → S6, which is worded so it is true for them too ("*if*
you bought citizenship…"). They also see XP `100 / 100` on unverified reads (the accepted `0250` S1 cost); S6 is an
honest partial explanation of that too.

**After an in-session purchase on an unverified session:** the card shows citizen (`paidGrantConfirmed`), the re-read
comes back unverified, so S6 appears right after buying, alongside `0303`'s "Restart to apply" popup — and ads keep
showing, because the ad gate deliberately ignores `paidGrantConfirmed` (`CitizenshipCard.ts:250-254`, ADR-116 D4).
The S6 wording ("if you bought citizenship, it's safe") is written to read correctly at exactly that moment.
Flagged so it is not a surprise.

## 3. The "paid but not verified" choice

| Option | What the player is told | Privacy / trust | Cost |
|---|---|---|---|
| **A. Neutral notice to every unverified citizen** (recommended) | "We couldn't confirm your account this time. If you bought citizenship, it's safe…" | Reveals nothing: the citizen badge already shows on that card, and verified/unverified is the player's own session. No storage. | Small — part of the ~0.5–1 day Step 2. |
| B. Device remembers the last verified "paid" answer | "You're a paid citizen, but this session isn't confirmed…" | See §9 (architect). Stores a "this account paid" fact on the device. Never grants a benefit (ADR-116 D4) — display only. | More: storage key, clearing rules, tests, architect-reviewed. |
| C. Neutral notice to **every** unverified logged-in player, citizens or not | "We couldn't confirm your account this time…" | Same as A. | Same as A. Tells non-citizens about a state that costs them nothing today — noise until `0332` gives it a cost. |

**Recommendation: A.** It says what matters to the paid player (your purchase is safe; ads may show; restart helps)
without storing anything or needing an architect-reviewed memory. B's extra sentence ("*you* paid") is the only thing
it adds, and it is the part with a privacy cost.

## 4. Where on screen

- **Inside the citizenship card**, one line under the name / XP row, in the same quiet box style the card already
  uses for the name-change "pending" note. The card is the page's only profile reader, so the line lives where the
  data is.
- **Start screen only. Nothing in matches.** No interstitial fires during active play (`0248` Step 1 report §2): the
  entry ads fire on the way into a game and the exit ads on the way out, and every match exit reloads the page back
  to the start screen, where the card shows the fresh state. The card is covered by the match canvas anyway
  (`GameRestart.ts` comment).

## 5. Wording — EN and RU drafts (for owner approval)

Rules applied: never blame the player; no "error" tone for "checking"; never promise "no ads" outright (whether
Yandex shows a fullscreen ad on its own is unverified — `0248` Step 1 report §1).

| State | Key (suggested) | EN | RU |
|---|---|---|---|
| S1 | `citizenship_status.checking` | Checking your account… | Проверяем ваш аккаунт… |
| S4 | `citizenship_status.verified_paid` | ✓ Verified — your paid citizenship benefits are on | ✓ Подтверждено — преимущества платного гражданства включены |
| S6 | `citizenship_status.unverified` | We couldn't confirm your account this time. If you bought citizenship, it's safe — you may just see ads until it's confirmed. Closing and reopening the game usually helps. | Не удалось подтвердить ваш аккаунт в этот раз. Если вы купили гражданство, оно сохранено — просто до подтверждения может показываться реклама. Обычно помогает закрыть игру и открыть её снова. |
| S3 | `citizenship_status.read_failed` | We couldn't load your profile right now. Nothing is lost — a restart usually helps. | Сейчас не удалось загрузить ваш профиль. Ничего не потеряно — обычно помогает перезапуск. |
| S3 button | `citizenship_status.restart` | Restart game | Перезапустить |
| after a refused retry | `citizenship_status.still_failing` | Still not working. Please try again a bit later — nothing is lost. | Всё ещё не получается. Попробуйте чуть позже — ничего не потеряно. |

"Перезапустить" matches the existing `citizenship_restart_modal.restart` string. ⚠️ **Step 2: every key goes into
both `resources/lang/en.json` and `resources/lang/ru.json`, via `translateText()`, never hard-coded.**

## 6. What the player can do

**Two different cases, two different actions** (architect correction, ADR-121 Context):

- **S6 (not confirmed) — text advice, no button: "close and reopen the game".**
  - A page reload is the **same Yandex visit**, and Yandex returns the **same signed data for the whole visit**
    (ADR-121: a re-fetch returns the same data ~99% of the time; ~87–88% of stale logins were after-match reloads).
    So a reload — including the automatic one after every match — does **not** fix a too-old signature. A new visit
    is what gets new signed data. ⚠️ *Inferred*, not tested: that a fresh visit gets fresh signed data follows from
    "same data for the whole visit"; no one has measured it directly.
  - A reload **would** help when the signature was missing, failed or hung. The client cannot tell these apart from
    "too old" today (the server returns no reason), so the one honest advice covering both is "close and reopen".
  - No button means no change to ruling D3 for S6.
- **S3 (couldn't load) — a "Restart game" button.**
  - Causes here are a failed login, a network failure or a timeout. A full reload re-runs the whole start sequence,
    which is the only recovery: there is no in-page re-login, and a failed login is final for the page load (D3,
    `ProfileSession.ts` header).
  - The player's own press only, never automatic, refused during a lobby or match.
  - **Build it as a sibling of `0303`'s restart (`CitizenshipRestartOffer.ts`), with its own analytics — not by reusing
    `requestGameRestart()`** (architect, §9-D): reusing it would pollute the `Profile:Login:Restart:*` funnel, do
    nothing in private mode (no sessionStorage), and after a failed login its latch refuses every later press, so the
    button would look dead.
  - **If it still fails:** the notice comes back after the reload. Nothing is lost; the player plays normally (as a
    non-citizen card until a read succeeds). Optional "Still not working…" text (§5) if the coder can detect a
    repeat cheaply; otherwise the same notice is fine.
  - ⚠️ **This widens ruling D3.** D3 (2026-09-16) names the card's **login button** as the only restart trigger. A
    second, player-pressed trigger needs the owner's approval.
- **No retry is possible without a reload today**, in either case.

## 7. The link to `0332`

- **Today** "unverified" costs a paid citizen exactly one thing: **ads** (`0248`). S6 says so and no more.
- **`0332`** will have the owner rule, per perk, what an unverified player loses in matches: XP crediting, the ★
  badge, the private-lobby gate, the approved name. None is ruled yet.
- **How the design accommodates it:** S6/S7 are separate states with separate text keys. When a `0332` ruling takes
  something away from unverified players, the task that implements that ruling (a) rewrites the S6 text to name it
  and (b) if the loss also hits non-citizens (XP crediting would), switches S7 from "nothing" to a notice. **Who:**
  the producer adds that as a line in whichever brief carries the `0332` ruling; the coder of that brief edits the
  strings. ⛔ Nothing in `0397` promises a perk survives an unverified session.
- Recommended now: one line appended to the `0332` brief pointing here (producer, append-only), once Step 1 is approved.

## 8. Analytics (recommendation: yes, minimal)

So the owner can see how many citizens hit an unconfirmed session:

- `Citizenship:Status:Unverified` — S6 shown, at most once per page load.
- `Citizenship:Status:ReadFailed` — S3 shown, at most once per page load.
- `Citizenship:Status:Restart` — the player pressed Restart game (S3).

Names follow `Category:Subcategory:Value`; enum keys in `flashistConstants.analyticEvents`; rows added to
`analytics-event-reference.md`. No ids, no paid flag, no value. ⚠️ S6 counts unverified **citizens**, paid and earned
together — it cannot count paid ones alone (that is the privacy point). The `0392` login numbers remain the real
measure of how often logins come back unverified.

## 9. Technical half — `fkit-architect` consult (hop 1, chain lead → producer → architect)

Read-only consult, `dev` at `91eb99a`. Summary, in the architect's findings order:

- **A. The neutral notice to unverified citizens has no privacy problem — confirmed.** The unverified view passes
  `is_citizen` through unchanged and only drops the paid keys and equalizes xp / earned date / updated date
  (`PublicProjection.ts:73-81`). Which view is sent depends only on the caller's own `verified` flag (`:104-113`). The
  paid ⇒ citizen constraint is real (`006_player_identity.sql:81`). Nothing new is revealed.
- **B. The one-source extension (owner ruling R1).** Minimal and safe:
  - Add `isVerifiedRead` (= the existing `isOwnerView`) to `PlayerProfileView`.
  - Add a **new, separate published value** in `src/client/CitizenshipStatus.ts` with publish / get / **subscribe**,
    e.g. `unknown | guest | read_failed | unverified | verified`. The card derives it in `refreshProfile()` next to
    the existing publishes. Paid stays its own value.
  - ⛔ **Do not change** the three-value `CitizenshipStatus` (`PrivateLobbyAccess.ts:48,72` relies on `!== "citizen"`),
    nor `derivePaidCitizenship` / `publishPaidCitizenship` / `isCurrentPlayerPaidCitizen` (the `0248` ad gate,
    `FlashistFacade.ts:2133`: false on every unknown, republished on every applied read, `paidGrantConfirmed`
    excluded), nor the superseded-read guard (`CitizenshipCard.ts:233-247`). `loadPlayerProfileView()` keeps exactly
    one caller; the earned-transition detector stays owner-view-only.
  - Limit: "no owner view" cannot tell an unverified session from a server older than S3b — which is why the deploy
    order (§11) matters.
- **C. "Checking" needs a new "not read yet" flag — confirmed.** `revealCard()` renders before the first read, and
  `render()` treats `profile === null` as guest (`CitizenshipCard.ts:158`, `:177`, `:443-445`): a logged-in player
  briefly sees a **working** login button. Worst case ~70 s (60 s hang net + 5 s login + 5 s read). The checking state
  must hide the login button. Optional: `isYandexAuthorized()` is known earlier, so guest vs. "logged in, checking"
  can split sooner.
- **D. Restart path.** Loop risk: none (player press only). Our own ad risk on reload: none — all six interstitial
  call sites are player actions, none on boot. ⚠️ Unverified: whether Yandex itself shows an ad when the iframe
  reloads. Recommends a sibling of `0303`'s helper with its own events, not `requestGameRestart()` (see §6).
  **Correction:** a reload usually does not get a fresh signature (ADR-121) — see §6.
- **E. Device memory of "last verified read said paid" (option B).** Low privacy cost, small build cost:
  - Readable by anyone using that browser profile, and by any script in the game page (Yandex SDK, ad and analytics
    scripts). Same exposure as the existing `geoconflict_citizenship_earned_at_v2:` key, which also holds the raw
    Yandex id in its name.
  - A forged id cannot write it (it would be written only on a verified read). It does **not** undo `0250` S1: S1
    stops a *remote* caller learning who paid; this exists only on a device where that player was once verified.
  - Stale-message risk is low (no refund path exists in `src/profile-server`); an operator DB edit would leave the
    device saying "paid" until the next verified read.
  - Main risk: a later coder wiring it into a gate, against ADR-116 D4 — guard with a display-only module and a
    test that the ad gate ignores it. Never covers a fresh device / private mode, so option A's wording is needed
    anyway.
  - Cost ≈ +0.5 day on top of A; record a short ADR if chosen. **Architect recommends: ship A, defer B unless
    support complaints show paid players are confused.**
- **F. Deploy dependency is more exact** — see §11.

## 10. Open questions for the owner

Put to the owner via `fkit-lead` (the producer's NEEDS-DECISION envelope); answers get recorded verbatim in the brief.

1. **"Paid but not confirmed"** — A: neutral notice to every unverified citizen (recommended) · B: device remembers the
   last verified "paid" answer · C: neutral notice to every unverified logged-in player.
2. **States, place and wording** — the §2 set, inside the card, start screen only, §5 text, with the §8 analytics
   (recommended) · a minimal set (S4 + S6 only).
3. **What the player can do** — S6 text advice + S3 Restart button (recommended; widens D3) · text advice only, no
   button anywhere (D3 untouched) · a Restart button on both.
4. **Deploy rule** — confirm §11 (S3b server never live before a client with `0397`; `0396` rollback also rolls the
   client back or switches `citizenship_ui` off) (recommended) · confirm the order only, and accept that a server
   rollback shows "not confirmed" to every citizen until the client is redeployed.

Not asked (no owner input needed now, recorded for later): the share of post-`0391` unverified logins that are
"too old" vs. "missing / failed" (readable from the `0372`/`0391` signature events in `0392`) — it would tell whether a
reload button could ever help S6; and whether Yandex itself shows an ad on an iframe reload (unverified, `0248` Step 1
§1).

## 11. Deploy order — confirmed, made more exact by the architect

What the display needs live, so that a verified player actually reads as verified:

1. **`0340` / `0395`** — sessions really minted `vfy:true`.
2. **The S3b profile *server* (`0396`)** — only it sends the owner view (`PublicProjection.ts:104-113`). A verified
   session against an older server still gets the unverified view, so the display would say "not confirmed".
3. **`0391` live** (24 h signature window). Without it ~34% of logins are stale (ADR-121 Context) and would read
   "not confirmed". `0391` is done in code; its deploy is planned for the 10/11 Oct slot — **deploy state not checked
   this turn**.

Consequences:
- Shipping `0397` in the **same game-client deploy as `0396`'s client half is fine only if the S3b server goes first
  in that slot and the owner's `0396` DevTools check passes.** `0396`'s "either order is safe" no longer holds once
  this display rides along.
- 🚨 **New finding: `0248`'s ad gate and the S3b client are already committed on `dev`** (`FlashistFacade.ts:2133`,
  `PlayerProfileView.ts` `isOwnerView`). Any game-client deploy from `dev` ships `0248`. It does nothing until the S3b
  server is live (paid needs the owner view). So owner ruling R3 ("`0248` only with or after `0397`") means in
  practice: **the S3b profile server must not go live while a production client without `0397` is running.**
- **Rollback coupling:** if the S3b server is rolled back to the `0340` server, every logged-in citizen reads "not
  confirmed". `0396`'s rollback rule should then also roll back the client or switch `citizenship_ui` off (which
  hides the card). Not yet written into `0396`.

## Files

- Written: this report.
- Appended: a dated pointer note at the end of the `0397` brief (ADR-035).
- No source code, no status, rank, sprint or folder changed. No mover run. Nothing committed.
