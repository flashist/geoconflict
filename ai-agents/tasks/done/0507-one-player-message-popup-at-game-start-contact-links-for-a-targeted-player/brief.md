# One-player message popup at game start (this time: our VK/Telegram contact links for one targeted player)

## ID
0507

## Sprint
Sprint 9

> 📌 **Filed on the OWNER's own words of 2026-10-26**, typed to the lead and relayed by `fkit-lead` to a spawned
> `fkit-producer` (no owner channel; ADR-021/037). ⛔ Not producer precedent. Verbatim: *"In parrallel with that, I think
> we need to do something, that allows us to send some messages to specific users even if they don't have the "inbox"
> logic yet. I can be as simple as the popup that is shown to the once a game starts, if their nickname matches the
> value that we're looking forward. We will use it this time for showing a message to the single user only to show them
> the links to VK/Telegram to get in touch with us."*

## Priority
34

> ⚠️ Priority 34 is append rank, NOT a merit ranking — flagged for owner confirmation.
> **On merit this belongs directly below `0502`**, because it is the only way to reach the affected player and it waits
> on nothing. Appended after the board's highest rank, never inserted (ADR-035); no row renumbered.

## Status
✅ Done (agent-closed — not owner-verified)

> 2026-10-26 — started by `fkit-lead` (relayed to a spawned `fkit-producer`).
> 2026-10-26, later — revised plan **APPROVED** (owner rulings below, under *Context*); **build running** (`fkit-coder`,
> on `dev`). Ships with `0506`.

## Owner
fkit-coder

## Context

- **The affected player** (2026-10-25 report: paid citizenship and approved nickname gone) reached us only through the
  in-game feedback form, which posts to Telegram with his **current in-game name** (`username-input`'s value) and
  nothing else. We have no way to write back.
- The in-game inbox cannot reach him: `GET /v1/messages` is **403 for non-citizens**, and his login now probably lands
  on a fresh, non-citizen record (`0502`).
- The owner wants a minimal, reusable way to show **one** player **one** message when the game starts. This time the
  message is our VK and Telegram contact links, so he can get in touch.

### ✅ DECIDED 2026-10-26 — targeting by the Yandex Games flag `player_message_targets` (revised plan approved)

> ✅ **2026-10-26 — revised plan APPROVED. OWNER RULINGS** (live via `AskUserQuestion` in the `fkit-lead` session,
> relayed verbatim to a spawned `fkit-producer`; ADR-021/037; ⛔ not producer precedent):
> - *"Approve the revised 0507 popup plan (Yandex setting with names, flags only, one fixed message)?"* →
>   **"Approve (Recommended)"** — option text: *"Coder builds it on dev; ships with 0506."*
> - *"OK that the target names in the Yandex setting reach every player's browser (readable via F12)?"* →
>   **"Accept, build it (Recommended)"** — option text: *"Coder builds the approved flag plan on dev now; ships with
>   0506."*
> - *"Can players actually write to you via the Telegram and VK links?"* → **"Yes, both work"** — option text: *"Keep
>   both links as they are."*
>
> The approved plan is this task's [`plan.md`](plan.md). Settled by it: target names come from the Yandex flag
> `player_message_targets` (comma-separated; each entry trimmed; **case-sensitive exact match** against the current
> name); unset / empty / non-string flag → nothing shown and **no extra request** (the existing flags fetch is reused);
> **flags only** — no name baked into the client code; **one fixed message** (the contact-links text; no
> message-choosing setting); shown on the **start screen**, with no Yandex payment/login dialog open, **at most once per
> page load**. The names **reach every player's browser** (readable via F12) — **accepted** by the owner. They are
> **never** in analytics (the flag is excluded from the automatic `Experiment:*` events) and **never** in git or code
> (they live in the Yandex console only).

#### Re-decision as it was recorded (history)

> 📌 **OWNER'S OWN WORDS, typed 2026-10-26** in the `fkit-lead` session, relayed to a spawned `fkit-producer`
> (ADR-021/037); ⛔ not producer precedent. Verbatim (typos kept): *"We can bake it into the client-side code
> TEMPORARILY! It's an emergency situation and we can do the naive and fast implementation of that. Also we can pass
> value or values via Yandex.Games flags (which probably is a better way to do it, because as soon as the player reaches
> us back we need to disable it, and in Yandex.Games, we can set a parameter as a string with comma-separated names, if
> we ever need to do it for few players."*
>
> **Revised plan (~~being re-planned, NOT yet approved~~ — APPROVED 2026-10-26, rulings above):** the target name(s) come from a **Yandex Games remote flag
> `player_message_targets`** — a string of comma-separated names, set and cleared by the owner in the Yandex console;
> the client compares its current name against it. That is close to option (c) below (the names reach every client,
> via the flag rather than git), which the owner now accepts as a temporary emergency measure. ~~**The revised plan
> awaits owner approval.** Until then **items 3 and 7 of *What to build* and verification step 2 are under
> re-decision** — marked pending below, not rewritten.~~ (Approved; items 3, 7 and verification step 2 resolved
> below.) Open for the plan (each now settled by the approved plan — see the rulings above): empty / missing flag → nothing shown and no
> extra request; how names are trimmed and matched (case); what happens outside Yandex (no flags); whether "bake it into
> the client" is also wanted or the flag alone; and that the names sit in the Yandex console, not in git.

#### ~~✅ DECIDED 2026-10-26 — how the popup finds the player: by current name, decided on the server (option (a))~~ — SUPERSEDED (see above)

> ~~📌 **OWNER RULING** given via `AskUserQuestion` in the `fkit-lead` session, relayed to a spawned `fkit-producer`
> (ADR-021/037); ⛔ not producer precedent. The owner picked **"By current name, server-side (Recommended)"** — option
> text: *"Fastest, game deploy only. A same-named player would also see it. Knock-on: none (checked)."* Build option
> (a) below. **The same-name risk stands and is accepted:** any player showing the same name also sees the popup. Options
> (b) and (c) are kept below as the record of what was weighed.~~
>
> Superseded 2026-10-26 by the owner's typed words above (re-planning to a Yandex flag). Kept as history. The same-name
> risk still applies to any name match, including the flag.

#### The question as it was put

The owner, verbatim: *"I am not sure we can find a player's ID, becuse the only thing that is currently sent to us via
telegram is their Username. Btw, we might change that too and add the user id value to the feedback message too."*
(Adding an id to feedback is **not** part of this task — the lead is asking the owner separately.)

Facts that bear on it:

- **A name is not unique.** Approved nicknames are unique (`players_display_name_uq`), but the affected player's
  approved nickname is on his **old** record. What he shows now is most likely his Yandex name or a chosen guest name,
  which other players can share. A name match can show the popup to someone else. The content (public contact links)
  makes that low-harm, but the plan should say so.
- **Where the target value lives.** If the client compares names itself, the target name must reach **every** client
  (in the bundle, or in a config every client fetches) — a player's name in git and in public code. Better: the server
  holds the value and answers "show / don't show" to each client.
- **ADR-113 §3:** the internal player id is never sent to a client and **no public route accepts a player id.** A
  player-id target must therefore be decided **server-side**, from the caller's session.

Options for the plan (each states its knock-on):

- **(a) Name match, decided on the server.** The owner sets a target name in server config (no redeploy if the plan can
  manage it); the client asks once at start with its current name; the server says yes/no. Ships with a **game**
  deploy only. Can hit a namesake. Needs the name he shows **now** — from the feedback, which we have.
- **(b) Profile-record match.** The owner marks one player record on the profile box (SSH); the profile server returns
  the message only to that caller's session. Exact; nothing reaches other clients. Needs `0502` to find his **new**
  record, and a **profile-box deploy** — which today also ships the committed-but-undeployed `0491`/`0492`/`0496` code
  (checks `0499`, `0493`, `0497`); the deploy-hold question in `0505` touches that deploy too. Logged-in Yandex players
  only.
- **(c) Name match, decided on the client** — the owner's literal idea; cheapest; but puts the target name in front of
  every client and in git. Producer advises against it for that reason alone.

The producer leaned **(a)**; ~~**the owner chose (a)** (ruling above)~~ the owner first chose (a), then, the same day,
asked for a Yandex-flag target instead — ~~(re-plan above, awaiting approval)~~ **approved 2026-10-26** (rulings above).

### Second, smaller question for the plan

**"Once a game starts"** — when the player reaches the start screen after load, or when a match begins? The plan
proposes one and when it re-shows (each load until dismissed, or once), and the owner confirms at plan approval.
✅ **Settled at plan approval (2026-10-26):** the **start screen**, with no Yandex payment/login dialog open, **at most
once per page load**.

## What to build

1. A popup (LitElement modal, the project's `show()` / `hide()` pattern) that shows a configured message to the
   targeted player at the start point the owner confirms, with a close button.
2. The message text and links are translation keys — `translateText`, in **both** `resources/lang/en.json` and
   `ru.json`. ~~The config chooses **which** message key to show, so the next use needs a new key, not new code.~~
   **One fixed message** (owner-approved plan, 2026-10-26): the contact-links text; no message-choosing setting. The
   VK and Telegram links stay as they are (owner: *"Yes, both work"*).
3. ✅ **DECIDED 2026-10-26** (owner rulings above). Targeting by the **Yandex Games flag `player_message_targets`**: a
   comma-separated list of names, set and cleared by the owner in the Yandex console. The client splits it, trims each
   entry, drops empty ones, and shows the popup on a **case-sensitive exact match** with its current name. The names
   **do reach every player's browser** (readable via F12) — **accepted** by the owner. Unset, empty or non-string flag →
   nothing shown and **no extra request** (the existing flags fetch is reused). **Flags only** — no name baked into the
   client code.
   ~~As filed: Targeting by **current name, decided on the server** (owner ruling above): the server holds the target
   name, the client sends its current name once at the start point, the server answers show / don't show. The target
   name never reaches any client. With no target configured, nothing is shown and nothing extra is requested beyond
   what the ruling needs.~~
4. The config can be **turned off** without a code change (for this player, once he has written in).
5. Any new HTML element goes into **both** templates: `src/client/index.html` and `src/client/yandex-games_iframe.html`.
6. Analytics: a shown event and a closed event (and a link-tapped event if cheap), as enum entries in
   `FlashistFacade.ts` and rows in `ai-agents/knowledge-base/analytics-event-reference.md`. Never the target value in an
   event — and `player_message_targets` is **excluded** from the automatic `Experiment:*` flag events, which would
   otherwise log the names on every client.
7. ✅ **DECIDED 2026-10-26** (owner rulings above). **No secrets and no personal data in git or code.** VK and Telegram
   links are public. The target names live **only in the Yandex console** (flag `player_message_targets`), set and
   cleared by the owner — never in git, never in code, never in analytics. They do reach every client (accepted).
   ~~As filed: The target value is set on the box by the owner, never committed.~~

## Verification steps

1. Tests: targeted → the popup shows once at the ruled start point; not targeted → it never shows; no target
   configured → it never shows and no request is made.
2. ✅ **DECIDED 2026-10-26** (owner rulings above). Tests for the approved targeting: an exact match shows; a
   different case does not; a substring does not; entries are trimmed and empty ones dropped; a non-matching name never
   shows; and with `player_message_targets` set, the automatic `Experiment:*` events log **no** event for that flag and
   its value appears in **no** logged string. ("Never reaches any client" is dropped: the names reach every client, and
   the owner accepted that.)
   ~~As filed: Tests for the ruled targeting: the target name never appears in any response, to any client; a name
   match is case-handling as the plan states; a non-matching name gets "don't show".~~
3. Turning the config off stops the popup on the next load, with no code change.
4. Both `en.json` and `ru.json` carry the new keys; the links open in a new tab (inside Yandex: whatever the Yandex
   rules allow for external links — the plan checks).
5. Both HTML templates updated if a new element was added (grep shows the element in both).
6. The analytics reference lists the new events; event strings follow `Category:Action[:Value]`.
7. `npm test` green (full run through the npm script — project lock).
8. Live (owner, after deploy): with the target set to the owner's own test player, the popup shows to him and not to a
   second test player; then the target is set to the affected player. Split this into a verify task at close, per the
   build-vs-verify rule.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing (it helps `0504` step 6, telling the player, but `0504` does not wait on it).
- **Input:** the target name comes from the affected player's feedback (his current in-game name). Not a dependency.
- **Related:** the citizen-only inbox (`GET /v1/messages`), ADR-113, `0502`.
- ⚠️ **Ship-path conflict with the deploy hold (2026-10-26, owner ruled "Hold it" for `0506`).** The held client code
  (`0494`, `0495`, `0488`) is already committed on `dev` (commit "Rewarded-ad XP and shared purchase core", checked
  2026-10-26), so **any game deploy from `dev` ships it**. Shipping this popup before `0506` needs an owner choice: deploy
  from a branch without that code, switch the held features off in that build, or wait for `0506`. ~~Not decided; the
  option text for the targeting ruling ("game deploy only … Knock-on: none") did not cover this.~~ ✅ **Decided
  2026-10-26:** built on `dev`, **ships with `0506`** (option text of both approval rulings above). Not a code
  dependency — no `Depends on:` line added; it is a release-timing tie, and `0506` is on Sprint 9 too.
- **Ships by:** a game deploy — weekend slot unless urgent (owner rule); together with `0506` (owner, 2026-10-26);
  committed is not deployed.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
- **No personal data:** "the affected player" in every tracked file.
