# Telegram and VK links in the feedback popup — so players who want a reply can get one

> **Retitled 2026-10-07** after owner ruling 3 (below) took the thank-you screen out of scope. Former title:
> ~~*Telegram and VK links in the feedback popup and its thank-you screen — so players who want a reply can
> get one*~~. **The folder name and ID `0403` are deliberately unchanged** — the folder still says
> `…-and-its-thank-you-screen`; renaming a task folder is a move, which only the mover skills do, and it
> would break existing links. Read the folder name as historical.

## ID
0403

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**Filed 2026-10-07 by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER REQUEST
typed directly in the `fkit lead` session and relayed by `fkit-lead`.** ⛔ Not producer precedent. The
start of the owner's message was lost; the owner then said its opening was *"something like 'Add a task
to the backlog sprint...'"*. The rest, verbatim:

> "about showing links to our social media platforms like Telegram and VK. When we show the thank you for
> the feedback pop-up, and also in the feedback pop-up itself we need to like the idea here is that we
> better have people commenting in our telegram and vk rather than sending us feedback i see that many
> people try to talk to me via the feedback interface but I can't reply to them back so like I would like
> them to communicate with me via social media platforms where I can communicate to them back"

**The goal, in plain words:** players use the feedback form to *talk* to the owner, but the form is
one-way — the owner cannot answer them. Point those players to Telegram and VK, where the owner can reply.

### Owner rulings — 2026-10-07

**Authority:** the owner, live via `AskUserQuestion` in the `fkit lead` session, 2026-10-07; relayed verbatim
by `fkit-lead` to a spawned `fkit-producer` (no owner channel, ADR-021/037), which recorded them here. Each
entry is the chosen option label + its option text, verbatim.

1. **Where the links point — "Same links (Recommended)"** — *"Use the existing Telegram + VK links. Pick
   this if players can already comment or message there."* → reuse `TELEGRAM_CHANNEL_URL` /
   `VK_CHANNEL_URL`.
2. **On/off switch — "Same switches (Recommended)"** — *"One switch per channel controls every place that
   link shows. If Yandex objects, you turn it off once, from the console, with no deploy."* → gate on the
   existing `telegram_link` / `vk_link` flags.
3. **Thank-you screen — "Keep 2-second close"** — *"Links show only in the main feedback popup, not on the
   thank-you screen."* ⚠️ **Not the producer's recommendation** (which was to show links there and drop the
   auto-close). **Scope narrows:** links in the feedback popup only. The sent / thank-you state is
   **unchanged** — today's 2 s auto-close, no links. The thank-you parts of this brief are struck below,
   not deleted.
4. **`0267` — "Keep open (Recommended)"** — no change to `0267`.
5. **Step 0 (Yandex-support check) — REMOVED.** **Authority:** the owner, 2026-10-07, typed directly in the
   `fkit lead` session — the owner's own message, **not** an `AskUserQuestion` answer — in reply to the
   driver's next step *"Ask Yandex support whether a Telegram/VK link inside the feedback popup is allowed,
   and whether VK counts too. 0403 can't start until you have their answer."*; relayed verbatim by
   `fkit-lead` to a spawned `fkit-producer` (no owner channel, ADR-021/037), which recorded it here.
   Verbatim: **"1. No need to, we already show the links."**
   → **The owner's reason:** the Telegram and VK links are already shown live in the game today. Step 0 is
   struck (not deleted) below; **the build is no longer blocked by it.**

**Still open — NOT answered by the owner** (see *Open questions for the owner* at the end): ~~step 0
Yandex-support check (blocks the build)~~ *(removed — ruling 5)*; the Russian wording; why the footer
Telegram link was removed in April 2026; whether the lost start of the owner's message held anything beyond
"add a task to the backlog". **None of these blocks the build** — see the producer's recommendation under
*Open questions for the owner*.

**Driver's reading — NOT an owner ruling** *(as filed; placement (2) is struck by ruling 3)*: the feedback form **stays**. Add Telegram + VK links, with a
short line such as *"Want a reply? Talk to us here"*, to (1) the feedback popup ~~and (2) the thank-you
screen shown after sending~~ *(struck — ruling 3)*. ~~The owner ruled only that the task be filed on the
Backlog board; placement details, wording and gating below are recommendations until the owner confirms
them.~~ *(Superseded — URLs, gating and placement are now ruled above; the wording is still open.)*

### ⚠️ Correction to the spawn prompt: the links and URLs already exist

The relay said *no player-facing Telegram/VK links exist in the client today*. **That is wrong**
(checked 2026-10-07 against the working tree):

- `src/client/flashist/FlashistFacade.ts:35-36` already defines `TELEGRAM_CHANNEL_URL` and `VK_CHANNEL_URL`
  (the game's own channels).
- Done tasks [`0141`](../../done/0141-telegram-link/brief.md) and
  [`0145`](../../done/0145-vk-link/brief.md) put "Join our Telegram" / "Join our VK" links on the start
  modal (`src/client/GameStartingModal.ts`) and the game-end modal
  (`src/client/graphics/layers/WinModal.ts`), each behind its own Yandex experiment flag
  (`telegram_link`, `vk_link`, checked via `isTelegramLinkEnabled()` / `isVkLinkEnabled()`).
- Their clicks log `UI:Tap:TelegramLink*` / `UI:Tap:VkLink*` through `logUiTapEvent()` with
  `flashistConstants.uiElementIds`.
- Locale keys `telegram_link.cta_text` and `vk_link.cta_text` exist in both `en.json` and `ru.json`.
- A footer Telegram link was **removed by the owner** on 2026-04-24 (commit `31b12e6`, *"Removing the
  footer telegram link"*). The reason is not recorded.

So this task **reuses** existing URLs, flag checks and the tap-event pattern. It does not invent new ones.
**Whether the two experiment flags are switched on in production today is unknown** — that lives in the
Yandex Games console, which no agent can read. *(The owner said on 2026-10-07, ruling 5, "we already show
the links" — that reads as the existing links being live; no agent has verified the flag state.)*

### ⚠️ Yandex Games moderation — partly answered, not settled

- **Against:** Yandex Games requirement **8.4.2** forbids links to external resources, including the game's
  own site, and **8.4.4** forbids sending players outside Yandex Games (cited in
  `ai-agents/knowledge-base/reports/2026-10-03-eval-yandex-invite-links.md`).
- **For:** `0141`'s brief records that *"Yandex.Games support confirmed that links to the game's own
  Telegram channel are permitted as long as they do not link to external third-party resources."* That
  confirmation is **undated in the repo, names Telegram only (not VK), and was about the start / game-end
  placements**.
- So it is unverified whether the confirmation covers **VK** and a **new placement inside the feedback
  popup**. ~~Step 0 below settles it before code.~~ *(Struck — ruling 5.)*
- **Owner-accepted risk (ruling 5, 2026-10-07):** the owner removed the Yandex-support check because the
  links are already shown live in the game; the remaining moderation risk for VK and the feedback-popup
  placement is accepted by the owner on that basis.

### The thank-you screen closes itself after 2 seconds — stays that way (ruling 3)

The "thank you" view is not a separate popup. It is the `submitted` state of the same
`src/client/FeedbackModal.ts` (text `feedback_modal.success`, *"Thank you, we read every message"*), and
it **auto-closes after 2000 ms** (`FeedbackModal.ts:304`). ~~Links there would vanish before most players
could tap them. The auto-close must change when links are shown (see *What to build* step 3).~~
**Per ruling 3 this state is out of scope and must not change** — no links, auto-close kept.

### Where the feedback popup appears

One component, three openers: start screen (`Main.ts:517`), in-battle sidebar (`GameRightSidebar.ts:148`
→ `Main.ts:519-521`), and the stale-build modal (`StaleBuildModal.ts:99`). All three get the links (in the form view only — ruling 3). No new
HTML element is needed: `<feedback-modal>` is already in both `index.html:314` and
`yandex-games_iframe.html:444`.

### Related: `0300` (feedback delivery failure)

[`0300`](../0300-feedback-delivery-failure-player-still-told-sent/brief.md) (Backlog, open) decides what the
player sees when delivery fails. **Same file, same submit/success flow.** No logical conflict: this task
adds links, `0300` changes the failure path. Two touch points to keep in mind: if `0300` picks option A,
the error view may also be a good place for the links (out of scope here unless the owner adds it). ~~If
`0300` picks B or C, the success text may change to "will be sent", and this task's thank-you line must
still read correctly next to it.~~ *(Moot — ruling 3: this task adds nothing to the thank-you state.)* Neither task has to wait for the other — whichever lands second rebases.

## What to build

**Step 0 — ⛔ REMOVED 2026-10-07 (ruling 5: "No need to, we already show the links").** No Yandex-support
check; the build is not blocked by it. Build both channels (Telegram and VK) as below.
~~**Step 0 — moderation check, BEFORE any code (owner action; no agent can contact Yandex support).**
The owner confirms with Yandex Games support (or from the original confirmation, if it is on record):~~

~~1. Does the earlier "own Telegram channel is allowed" answer still hold, and does it cover **VK**?~~
~~2. Is a link **inside the feedback popup** treated the same as the start / game-end placements?~~

~~⚠️ **Still open (owner, not answered 2026-10-07). This step blocks the build.**~~

~~Record the answer and date in this brief. Then: if both are allowed, build as below. If only Telegram is
allowed, build Telegram only. If neither, stop and close this task through the producer with the reason.
⚠️ Today's links stay behind experiment flags, so the build can ship dark and be switched on later.~~

The new links still sit behind the existing per-channel flags (ruling 2), so either channel can be
switched off from the console with no deploy if Yandex objects later.

**Step 1 — gating — ✅ RULED 2026-10-07 (ruling 2).** The new links go behind the **existing**
`telegram_link` / `vk_link` flags (`isTelegramLinkEnabled()` / `isVkLinkEnabled()`): one on/off switch per
channel, covering every place that link shows. No new flag, no always-on. ~~Recommended: put the new links
behind the **existing** `telegram_link` / `vk_link` flags, so each channel has one on/off switch everywhere
and moderation risk is controlled in one place. Alternative: show them always, or a new flag just for the
feedback placements. ⛔ Do not pick silently — confirm at the plan gate.~~

**Step 2 — links in the feedback form.** Below the Send button (or under the title — coder's call, checked
in a browser), add one short line plus the two links, e.g. *"Want a reply? Write to us on Telegram or VK"*.
Reuse `TELEGRAM_CHANNEL_URL` / `VK_CHANNEL_URL` (ruling 1) — never repeat the URL strings. Open in a new tab with
`rel="noopener"`, matching `0141`/`0145`. Must read well at phone width and must not crowd the textarea or
Send button.

**Step 3 — ⛔ STRUCK 2026-10-07 (ruling 3: "Keep 2-second close").** Do **not** touch the thank-you /
`submitted` state: no links there, 2 s auto-close unchanged.
~~**Step 3 — links in the thank-you screen.** Under `feedback_modal.success`, the same line and links. When
links are shown, **do not auto-close after 2 s** — recommended: stay open until the player closes it (✕ or
overlay click), which already works. If no link is shown (flags off / moderation says no), keep today's 2 s
auto-close unchanged.~~

**Step 4 — text.** New keys in the existing `feedback_modal` section of **both** `resources/lang/en.json` and
`resources/lang/ru.json`, through `translateText` only — never hardcoded. Reuse `telegram_link.cta_text` /
`vk_link.cta_text` only if the wording fits; a "want a reply?" line is a new key. Russian copy is the one
most players see; the owner may want to word it — ⚠️ **still open, not answered 2026-10-07** (see open
questions).

**Step 5 — analytics.** One tap event per channel (one placement, after ruling 3), through the existing path:
`flashistConstants.uiElementIds` + `FlashistFacade.logUiTapEvent()`, which produces `UI:Tap:<ElementId>`.
Suggested IDs: `TelegramLinkFeedbackForm`, `VkLinkFeedbackForm`. ~~`TelegramLinkFeedbackThanks`,
`VkLinkFeedbackThanks`~~ *(removed — ruling 3, no thank-you placement)*. Never write event strings inline.
Add both rows ~~all four rows~~ to the `UI:Tap` table in
`ai-agents/knowledge-base/analytics-event-reference.md`. (The relay mentioned the `analyticEvents` enum;
the established pattern for link taps is `uiElementIds` + `logUiTapEvent()`, which itself goes through
`analyticEvents.UI_TAP_FIRST_PART`.)

**Out of scope:** the thank-you / `submitted` state, including its 2 s auto-close (ruling 3); changing what feedback collects (the contact field stays removed — `0046`, 152-ФЗ);
changing the start / game-end links; the `0300` failure behaviour.

## Verification steps

1. ~~**Step 0 recorded** in this brief: the moderation answer, its date, and which channels it covers.~~
   *(Struck — ruling 5 removed step 0; the ruling itself is recorded under Owner rulings.)*
2. **Gating ruling recorded** (step 1 — done, ruling 2), and the build matches it: with the flag(s) off, the
   feedback form and thank-you screen look exactly as today, including the 2 s auto-close.
3. **Form, flags on:** open the feedback popup from all three openers (start screen, in-battle sidebar,
   stale-build modal). The line and both links appear; each opens the right channel in a new tab.
4. ~~**Thank-you, flags on:** send a test message. The thank-you screen shows the line and both links and
   **stays open past 2 s**; ✕ and an overlay click close it.~~ *(Struck — ruling 3.)* **Replaced by:**
   **Thank-you, flags on:** send a test message. The thank-you screen shows **no** links and still
   **auto-closes after 2 s**, exactly as today.
5. **Analytics:** each of the two links fires its own `UI:Tap:*` event exactly once per click; the
   reference doc lists both. ~~each of the four links … lists all four~~ *(ruling 3)*. `Feedback:Submitted` and `Feedback:ButtonOpened` are unchanged.
6. **Text:** every new string goes through `translateText`; `en.json` and `ru.json` have the same new
   keys; the game shown in Russian shows Russian text.
7. **Layout:** checked in a browser at phone width and desktop, inside the Yandex iframe template —
   nothing overlaps, the Send button stays reachable.
8. **No regression:** start / game-end Telegram and VK links behave as before; `npm test` and
   `npm run lint` pass (any `FeedbackModal` tests updated, not deleted).

## Notes

- **Depends on:** nothing.
- **Gate:** none. ~~step 0 (Yandex moderation answer, owner-obtained) must come before the build.~~
  *(removed — ruling 5)* ~~and the step 1 gating ruling~~ *(ruled 2026-10-07)*. The Russian wording is
  settled at build time (see open question 2), not before.
- **Blocks:** nothing.
- **Related:** [`0300`](../0300-feedback-delivery-failure-player-still-told-sent/brief.md) (same component,
  see *Context*); [`0141`](../../done/0141-telegram-link/brief.md) and
  [`0145`](../../done/0145-vk-link/brief.md) (the existing links and flags this reuses);
  [`0046`](../../done/0046-feedback-remove-contact-field/brief.md) (removed the contact field, and already
  noted *"players who want a reply can reach the Telegram/VK channels"* — this task makes that true inside
  the form).
- ~~**Why one brief, not two:** the two placements live in one 366-line component, share the same URLs, flag
  checks, text and tap-event pattern, and the owner asked for them together. Split, they would be two
  hour-sized tasks editing the same `render()` back to back.~~ *(Moot — ruling 3 leaves one placement.)* ~~The
  real gate (step 0) is an owner action, not a coder deliverable, so it is not its own task.~~ *(Moot —
  ruling 5 removed step 0.)*
- **Producer's priority read — a recommendation, NOT an owner ruling:** low effort (hours), real value
  (players who want a conversation get one; the owner stops receiving messages he cannot answer). Worth
  pulling into a sprint soon ~~after step 0 is answered~~ — nothing gates it now (ruling 5). Backlog board
  rows are unranked (`—`).
- Effort: small, client-only. No `src/core/`, no server, no schema change. Weekend-slot deploy.

## Open questions for the owner (still open as of 2026-10-07)

**Producer's recommendation — NOT an owner ruling: none of the open items below blocks the build.**
Item 2 is answered at build time: the coder drafts the Russian line and shows it to the owner at the plan
gate (or before merge) for approval. Items 3 and 4 are context questions; the links ship behind the existing
per-channel flags (ruling 2), so if item 3's answer turns out to matter, the owner switches the link off in
the console with no deploy.

1. ~~**Step 0 — Yandex support check. Blocks the build.** Does the earlier "own Telegram channel is allowed"
   answer still hold, does it cover VK, and does it cover a link inside the feedback popup? Only the owner
   can ask Yandex support.~~ *(Closed — ruling 5, 2026-10-07: "No need to, we already show the links.")*
2. **Russian wording** of the "want a reply?" line — the owner may want to write it; most players see the
   Russian text.
3. **Why was the footer Telegram link removed in April 2026** (commit `31b12e6`, *"Removing the footer
   telegram link"*)? If it was a moderation or player-complaint reason, it may apply here too.
4. **The lost start of the owner's message** — did it hold anything beyond "add a task to the backlog"?
