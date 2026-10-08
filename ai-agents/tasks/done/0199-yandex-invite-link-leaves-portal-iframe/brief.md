# Product decision: a private-lobby invite shared from the Yandex Games build takes the recipient OUTSIDE the portal — decide portal-relative vs standalone invite

## ID
0199

## Sprint
Backlog

## Priority
Unscheduled

⚠️ **This is the producer's rank, NOT an owner ruling.** The owner approved *filing this brief* on
2026-08-28 (via `AskUserQuestion` in the lead session, relayed through `fkit-sprint-ship-loop`). They
have **not** ruled on its priority or its board.

**On merit the producer ranks this Medium, and files it on the Backlog board rather than Sprint 4**, for
three reasons — stated so the owner can overrule in one edit:

1. **Nothing is broken for players today.** Invite links work; they land the recipient somewhere the
   owner may not want them. That is a business-model question, not an outage. It does not compete with
   Sprint 4's live-defect and launch-blocking work.
2. **The shape of the fix is unknown**, and the answer may be *"leave it as it is."* Sprinting an
   implementation task before the findings exist is exactly the investigation-first rule this project
   holds. A follow-up implementation brief should be filed **from the findings**, not now.
3. **A Sprint 4 row could only be appended at the bottom of that board**, which would read as *lowest
   rank in the sprint* — a false signal in the other direction. fkit's **ADR-035** (*a mid-board
   insertion is not the owner-ruled re-rank exception*) bars inserting a new row above the board's
   closed rows, and a spawned producer has no owner channel to be granted a re-rank anyway. The honest
   placement is the unranked Backlog board, with the merit statement recorded here.

📎 **ADR-035 is cited by name, never linked, on purpose.** It is one of **fkit's own upstream ADRs**
(the `adr-0XX` series, which lives in the fkit install share). This project's
`ai-agents/knowledge-base/decisions/` holds only the `adr-1XX` series, so a relative link into it would
not resolve.

📌 *2026-10-03, OWNER RULING relayed by `fkit-lead` (⛔ not producer precedent; see* Context*): reasons 1 and 2 are
overtaken. The owner calls this "a big one" and a Yandex rules violation, and "leave it as it is" is ruled out. The
owner did **not** rule a rank or sprint, so the board and `Unscheduled` stay as they are until they do.*

**If the owner disagrees on any of the three points above, the rank moves.** Point 1 is the load-bearing
one: if the owner judges that invited players skipping the monetised portal is costing money *now*, this
is a Sprint 4 candidate and the producer would not argue.

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-producer

## Context

### ✅ OWNER RULING 2026-10-03 — an invite that leaves Yandex Games is a rules violation and must NOT reach regular players

**OWNER RULING, relayed by `fkit-lead`; ⛔ not producer precedent.** Given 2026-10-03 in the owner's own words in the
`fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037). Verbatim:

> *"this is a big one, we need to make sure it doesn't work like that in prod (yandex.games doesn't allow it, it's a
> violation of their rules). Ideally, we should generate an URL that leads to the Yandex.Games game, but we can't use a
> hardcoded URL for that, because Yandex.Games consists of multiple different web-portals and URL can be different for
> each of them. There is a chance that this can be correctly implemented by using one of their SDK methods:
> https://yandex.ru/dev/games/doc/ru/sdk/sdk-other-games . The only problem I see is that we don't know if
> yandex.Games passes GET parameters to the game and, especially, to iframe-games, we need to test it first, before
> implementing all the things with their SDK. If there is no way we can make the invite-URLs work correctly, we will
> have to remove it and do joining of private lobbies by invite codes. Actually, invite codes might be good thing to
> have even if invite-URLs work properly."*

**What this settles:**
- **"Leave it" is ruled out.** An invite link that takes a player off Yandex Games breaks Yandex's rules. It must not
  reach regular players in production.
- **Direction, in order:**
  1. **Test first** whether Yandex Games passes a URL parameter through to our iframe game. No SDK invite work is
     built before this answer exists.
  2. **If yes:** invite links point at the game's Yandex Games page **on the player's own portal**, built through the
     SDK (the owner names the "other games" SDK page above as the likely route). **Never a hardcoded URL**, because
     Yandex Games runs on several portals with different addresses.
  3. **If no:** remove invite links. Players join private lobbies **by code only**.
- **Invite codes — ✅ KEPT IN EVERY CASE.** OWNER RULING 2026-10-03, given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`; ⛔ not producer precedent: asked *"keep them in every case, even if Yandex invite
  links end up working?"*, the owner chose **"Yes, always keep codes"**. *Superseded, kept:* ~~`fkit-lead`'s relay
  reads this as *"invite codes stay in every case"*. ⚠️ The owner's own words are softer: *"invite codes might be good
  thing to have even if invite-URLs work properly"*. Treat codes as kept unless the owner says otherwise, and confirm
  when the follow-up briefs are scoped.~~ *Fact, checked 2026-10-03:* the
  Join window already accepts a pasted lobby id (`JoinPrivateLobbyModal.ts`, `lobbyIdInput`), so code entry exists
  today. Whether that is a good enough "invite code" for players (length, readability) is **still not decided**.
- **Exposure today:** ✅ private lobbies are **CONFIRMED HIDDEN — OWNER-ATTESTED 2026-10-03, not agent-verified**
  (owner's words, relayed by `fkit-lead`: *"the lobbies are switched off, nobody can use them"*). So no one in
  production can create a lobby or copy today's off-Yandex invite link.
- **Release gate.** This is item 6 of the private-lobby release gate in
  [`0354`'s *Release gate*](../0354-show-private-lobbies-to-testers-by-default-and-add-an-everyone-flag/brief.md):
  the everyone-flag stays off until invite links either point at Yandex Games correctly or are removed.
- **Not settled:** this task's rank and sprint (*"a big one"* is not a placement), and how the work splits into
  briefs. `fkit-architect` is researching the Yandex SDK side in parallel (2026-10-03); briefs are filed from its
  findings, not before. 📌 *Later 2026-10-03: the findings are in ([architect's evaluation](../../../knowledge-base/reports/2026-10-03-eval-yandex-invite-links.md)), and the owner ruled
  "test first, then decide" — see* What to build*, step 0.*

**What this changes below.** The text below is kept as written (true when written, 2026-08-28). Read it against this
ruling: the *"leave it exactly as it is"* outcome and the *"Leave it"* option in step 4 are now **ruled out**, and
step 1's research question is now the owner's step 1 above.

### 🚦 This is a PRODUCT question first and an implementation task second

**Do not open this task by writing a fix.** The first deliverable is *what Yandex actually supports* and
*what the owner wants*. The producer does not know the answer and is not presuming one. It is entirely
possible the ruling is **"leave the invite exactly as it is"** — that is a legitimate outcome of this
task, not a failure of it.

### 🔑 This is NOT task `0198`, and the two must never be conflated

Both touch **the same line** of `src/client/HostLobbyModal.ts` — `copyToClipboard()`. They are different
defects at different layers, and confusing them will produce a wrong fix.

| | `0198` (a bug, fixed) | `0199` (this task — a product question, open) |
|---|---|---|
| **What is wrong** | The **path** — a stray `/` between base and hash | The **host** — the link points at `geoconflict.ru` at all |
| **Symptom** | `…/yandex-games_iframe.html/#join=<id>` stopped matching nginx's `\.html$` rule and silently served the **standalone** `index.html` — the wrong entry point | The recipient loads the **right** entry point, but at the standalone site, **outside the Yandex portal iframe** |
| **Kind** | Production bug, mechanical, owner-ruled High | Product / business-model decision, **unruled** |
| **State** | ✅ Fixed in the working tree · 🚧 **built but NOT deployed** | 🔲 Not started |

**`0198` fixed the path. It did not, and was not meant to, change the host.** Anyone reading only
`0198`'s diff will see the invite line touched and may assume the invite question is settled. It is not.

### ✅ What the invite string is RIGHT NOW — verified in the working tree, 2026-08-28

Read directly from `src/client/HostLobbyModal.ts` → `copyToClipboard()` (~line 845), **in the working
tree carrying `0198`'s uncommitted fix**:

```
`${FlashistFacade.instance.windowOrigin}#join=${this.lobbyId}`
```

**No separator between the base and the `#`** — that absence is `0198`'s fix, and it is deliberate. The
comment block directly above the line records why, and the commented-out upstream original
(`${location.origin}/#join=…`) is still there for contrast.

`windowOrigin` is `window.location.origin + window.location.pathname`
(`src/client/flashist/FlashistFacade.ts`, ~line 343 — a `// Flashist Adaptation`). So on the Yandex
build the copied invite is:

```
https://geoconflict.ru/yandex-games_iframe.html#join=<lobby-id>
```

That is **correct for what `0198` set out to do**: the path still ends in `.html`, so nginx serves the
**Yandex** template, and the invited player gets the same build the host is on.

### ⚠️ The consequence that is NOT settled

The recipient opens that link **in a normal browser tab at `geoconflict.ru`** — not inside the Yandex
Games portal iframe. Two things follow, and both were confirmed against the code (not assumed):

1. **The build claims to be on the Yandex platform while not being in the portal.**
   `src/client/yandex-games_iframe.html` (~line 19) unconditionally sets
   `window.flashist_isYandexPlatform = true` before the async SDK tag. `FlashistFacade`'s constructor
   (~line 359) reads exactly that flag to set `yaGamesAvailable`. So a recipient outside the portal
   still enters **Yandex platform mode** — SDK init, ads, auth, payments and leaderboards all take the
   Yandex code path, from a page the portal never framed.
   **⚠️ What that path actually *does* outside the portal is NOT established and must not be guessed.**
   The SDK may init, degrade, or fail; the bounded-deadline degraded-mode machinery in `FlashistFacade`
   may or may not absorb it. **Measuring this is step 1 of the work**, not background.
2. **Yandex's own metrics never see that session,** and the portal's ad/monetisation context is not
   there to be monetised. Both statements are inference from *"the session is not in the portal"* — they
   are **not** measured. Treat them as the hypothesis this task tests.

### 📌 Where this came from, and why it was left open

Found during `0198`'s work and **deliberately left undecided there.** `0198`'s review ledger
(`ai-agents/tasks/done/0198-private-lobby-start-url-double-slash/review.md`) records it verbatim,
filed apart from the accepted residuals precisely so nobody mistakes it for a settled tradeoff:

> **Open, deliberately undecided (NOT a residual — the owner has not ruled):**
> **Yandex portal invite semantics** — a `geoconflict.ru` invite link takes a recipient outside the
> portal iframe. Product question, flagged and left open by the coder. Not a defect in this diff; the
> link shape is now correct for whatever the answer turns out to be.

The routing was right: `0198` is a narrow production bug-fix riding a shared deploy with `0062` and
`0063`, ruled small-and-low-risk. A business-model question does not belong in that diff.

### 🔍 The smaller sibling defect, also flagged in `0198` and deliberately not fixed there

From the same review ledger's accepted residuals:

> **`copyToClipboard()` drops `location.search`** — the invite link carries origin + pathname + hash,
> never the query string · Why (structural): recorded in the plan, deliberately unchanged; the join flow
> reads only `#join=`; widening the invite's surface is not this fix's job · **Re-raise only if: a query
> parameter becomes load-bearing for a joining client.**

**This task is where that re-raise condition gets tested.** `src/client/AccountModal.ts` →
`viewGame()` (~lines 96–105) builds its join URL the other way, preserving all three parts:

```
`${path}${search}${hash}`
```

So the codebase already contains both conventions, and they disagree. Whether that matters depends
entirely on **whether any query parameter is load-bearing on the Yandex path** — which is a question
this task's platform research has to answer anyway. That is why it is folded in here rather than
filed separately: it is a sub-question of the same investigation, not an independently decidable one.

> 📌 **Dated note — 2026-09-29 (producer's edit, per [`0331`](../../done/0331-keep-the-query-string-on-match-exit/brief.md)'s
> *Coordinate with `0199`*).** Recorded by a spawned `fkit-producer` with no owner channel (ADR-021), from an
> owner-run production probe relayed by `fkit-lead`. `0331`'s probe **P1**, run in the Yandex **game frame's**
> console, found that the **first-load URL carries an `sdk` query parameter** (query length **120**), and that it
> is **dropped after a match exit** (length **0**). ⇒ **At least one query parameter IS load-bearing on the Yandex
> path**: Yandex's loader reads its SDK address from it (report `0318` §2.3). Detail: `0331/worklog.md`.
> - **What this settles:** the yes/no half of step 3 — the answer is *yes*, and the parameter is named.
> - **What it does NOT settle:** whether that parameter matters **for a joining client** — the `copyToClipboard()`
>   re-raise condition above. An off-portal invite recipient is not loaded by the platform, so would not get
>   its query in any case (producer's inference, not checked) — this is still this task's question. `0331` fixes only the match-exit navigation and does **not** touch
>   `copyToClipboard()` or invite links.

### ⚠️ Working-tree state when this brief was written (2026-08-28)

Uncommitted source from `0067`, `0068` and `0198`, plus an in-flight docs edit on
`ai-agents/knowledge-base/architecture.md`. **This brief touched none of it and neither should you.**
`0198`'s fix is **built and awaiting the production deploy** that also carries `0062` and `0063`.

## What to build

### 0. ✅ DONE 2026-10-04 — the owner ran the live console probe, then decided (OWNER RULINGS 2026-10-03, 2026-10-04)
*(Heading was: "▶ NEXT STEP — the owner runs the live console probe, then decides (OWNER RULINGS 2026-10-03)".)*

> 📌 **2026-10-04 — PROBE RESULT: YES, and the owner ruled the build. OWNER-REPORTED / OWNER RULING, relayed by
> `fkit-lead`; ⛔ not producer precedent.** Recorded by a spawned `fkit-producer` with no owner channel (ADR-021/037).
>
> - **Probe** (owner-run in production, 2026-10-04, desktop Chrome; `fkit-lead` saw the console output for P1–P6; full
>   record, URL shapes only, in [`worklog.md`](worklog.md)): P1 payload arrives on `yandex.ru` **and** `yandex.com`;
>   P4 `getGameByID(app.id)` returns this game's URL **on the current portal** (`yandex.<tld>/games/app/<id>`) — nothing
>   needs hardcoding; the round trip gives P1. P2: the payload is **also** in our iframe's `location.search` — never
>   strip or rewrite it (`0331`/`0337` trap). P6/P7: the SDK copy works only inside a real click. **P8: the payload
>   comes back after a match — consume-once is mandatory.** P5 (`getAllGames`) lists only the developer's other games —
>   irrelevant. **Not tested:** mobile, other domains, native clipboard.
> - **Decision table outcome: YES → Build A** (portal link via the SDK + `payload`) **plus the code.**
> - **OWNER RULING 2026-10-04**, live via `AskUserQuestion` in the `fkit lead` session. Asked *"The test passed. What
>   should we build for private-lobby invites?"*, the owner picked **"Yandex link + code"**: *"Invite button copies a
>   proper Yandex Games link (via the SDK, works on every portal) AND the code is still shown. ~150–250 lines + the code
>   part. Fixes the rule problem; easiest for friends."*
> - **Filed (Backlog board, unscheduled):** [`0380`](../0380-yandex-build-invites-copy-the-lobby-code-and-stop-honouring-join-links/brief.md)
>   (code part) → [`0382`](../../done/0382-yandex-build-invite-link-via-the-sdk-portal-url-and-payload-consumed-once/brief.md)
>   (link part), each with an owner-run production verify task —
>   [`0381`](../../backlog/0381-verify-0380-in-production-the-yandex-invite-copies-the-code-and-old-join-links-are-ignored/brief.md),
>   [`0383`](../../backlog/0383-verify-0382-in-production-a-yandex-invite-link-opens-the-join-window-once-on-the-friends-portal/brief.md).
> - **ADR: [ADR-119](../../../knowledge-base/decisions/adr-119-yandex-invites-sdk-portal-link-plus-code.md)** — step 5. ✅ *(accepted — "Accept as written", OWNER RULING 2026-10-04, given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`; ⛔ not producer precedent)*. Written and promoted by `fkit-architect`, not the producer.
>   *(Was: "ADR pending (architect, 2026-10-04)".)*
> - ✅ **Q3 (flag cohort) RULED 2026-10-04: "Yes, link always lets them in"** — recorded in `0382` (a) and `0383`.
> - **Still open:** Q4 (code friendliness), carried in `0380` as (b).
> - ✅ **Moderation / self-link — SETTLED, no support question.** ~~Moderation's view of a self-link is undocumented;
>   rule 8.4.1 allows SDK-built links to our games — **owner action: ask Yandex support before release** (relayed
>   by `fkit-lead` 2026-10-04, recorded, not yet done).~~
>   OWNER RULING 2026-10-04, given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`; ⛔ not producer precedent: *"we don't need their approval, we're not violating anything with it"* — asked *"Drop the 'ask Yandex support about the self-link' step?"*, the owner picked **"Yes, drop
>   it"**. The owner judges the SDK link + `payload` within rule 8.4.1; the grey area (8.4.1 is worded for *other*
>   games) is accepted. ⚠️ An **actual** Yandex moderation/support rejection of a payload self-link would still
>   reopen this, per ADR-119's *Re-raise only if* — the absence of prior approval does not.

*The text below is kept as written on 2026-10-03.*


**OWNER RULING 2026-10-03, given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`; ⛔ not producer precedent.** Two rulings, both put after the [architect's evaluation](../../../knowledge-base/reports/2026-10-03-eval-yandex-invite-links.md) was read:

- **How to handle invites** — asked *"How should we handle private-lobby invites on Yandex Games?"*, the owner picked
  **"Test first, then decide"**: *"Change nothing yet. Run the test, then build the link (if it works) or codes (if
  not). Lobbies stay hidden meanwhile, so no risk."* ⚠️ The architect recommended **"codes now + test now"** (ship
  code-only B at once). **The owner did NOT pick that.** So **no build task is filed yet** — neither code-only nor
  link.
- **Who runs the test** — asked *"Who runs the 5-minute read-only test on the live game?"*, the owner picked **"You run
  it yourself"**, i.e. **the OWNER runs it, not an agent.**

**The probe.** The report's §5: a read-only DevTools console probe in the live game, in the game-iframe context —
**P1–P8**, then the **round trip** (open the URL from P4 with a new `payload`, fresh incognito window, repeat P1).
Portals: **`yandex.ru` first, then one other domain** (e.g. `yandex.com` or `yandex.kz`, same path). The key line is
P1 — does `payload` reach our iframe game at all? P8 needs one match played and exited.

- **No deploy.** The live `0.0.156` build already exposes everything the probe reads (report §3). So the weekend
  deploy slot and the build/verify split **do not apply** to this step.
- **Why a step here and not a new task:** it is this task's own research question (step 1 below) answered live, with
  no build, no deploy and no source change. No project convention requires a separate task for it.
- **Privacy:** record results as yes/no, `undefined`/`"probe1234"`, `isAvailable` true/false and the URL **shape**
  (`yandex.<tld>/games/app/…`). Do not paste the app id, a full catalog URL with ids, or anything personal into any
  artifact (report P3 says the same for the id).
- **Record** the results in this folder's `worklog.md`: date, build version, each P1–P8 result per domain, the round
  trip, and anything that could not be run (written as *not run*, never guessed).

**After the result, the owner decides** (the report's §5 *Reading the result*):

| Result | Meaning | Then |
|---|---|---|
| **YES** | P1 gives the payload on `yandex.ru` **and** the second domain, **and** P4 or P5 returns this game with a `yandex.<tld>/games/…` URL whose round trip also gives P1 | **Build A** — portal invite link via the SDK + `payload`, **plus** the code |
| **NO** | P1 is `undefined` on `yandex.ru` | **Build B** — links removed, code-only joining (the report also suggests asking Yandex support before giving links up entirely) *(moot — the result was YES, 2026-10-04; and no Yandex support question is asked, OWNER RULING 2026-10-04 "Yes, drop it", see step 0)* |
| **PARTIAL** | P1 works but P4/P5 do not return this game (links would need the self-built fallback the owner objected to) | **Owner call** |

- **Codes are kept in every case** (owner ruling, recorded in *Context*), so **B's code work is part of either path**:
  A is additive on top of B.
- Only after the owner's decision: the ADR (step 5) and the build brief(s), each with its own verify task per the
  build/verify rule, since **those** builds do need a deploy.
- ⛔ **Still open, not ruled** (report §8): **Q3** — if A is built, should a portal invite open the join window for
  a friend outside the private-lobby flag cohort? **Q4** — keep the 8-character, case-sensitive code, or decide
  separately on friendlier codes (touches `src/core` + the server)? *(Code friendliness was already recorded as
  undecided.)*

**How steps 1–4 below now read.** Kept as written (2026-08-28). Step 1's research is done in the report (§2.1
documented, §2.2 needs the live test). Step 2's off-portal measurement is no longer needed to decide (the off-portal
link is ruled out either way). Step 3 is partly answered by probe P2 and the report's `sdk`-parameter note. Step 4 is
answered by the rulings above.

### 1. Establish what Yandex actually supports — research, before any opinion

**No fix is scoped until this is answered.** The question is: *can a Yandex Games title hand a player a
link that opens that game inside the portal, with a payload the game can read?*

Find out and record, with sources:

- Whether the portal offers a **deep-link / launch-payload mechanism** at all — a portal URL form that
  opens the framed game and carries an application-defined parameter through to the running client.
- If it exists: how the client **reads** that parameter, and whether the SDK surface this project
  already wires (`src/client/flashist/FlashistFacade.ts`) exposes it.
- Whether it survives the cases that matter: a **cold** open by someone who has never played, a player
  who is **not logged in**, and **mobile / the Yandex app** as well as desktop web.
- Whether the portal permits sharing a link **out** of the portal at all, and any platform rules about
  driving players to an off-portal copy of the same game.

⚠️ **Record what you could not establish, as plainly as what you could.** A confident wrong answer here
produces a fix that ships and then quietly does not work for invited players — which is the exact
failure mode `0198` just cost the project a diagnosis for. *"Yandex appears not to support this"* is a
perfectly good finding; *"probably it works like X"* is not.

### 2. Measure what actually happens today

Open the current invite URL form (`https://geoconflict.ru/yandex-games_iframe.html#join=<id>`) in a
plain browser tab, outside the portal, and record what the client does:

- Does the join actually work end to end — does the recipient reach the host's lobby?
- What does the Yandex SDK do when `flashist_isYandexPlatform` is `true` but the page is not framed by
  the portal? Does it init, degrade, or fail? Does anything block or throw?
- What happens on the surfaces that assume the platform — ads, auth, citizenship / payments,
  leaderboards, XP crediting?

**This is the half that decides how much the question is worth.** If the off-portal session is fully
functional, this is a revenue/metrics question. If it is broken or degraded, it is also a player-facing
defect and the rank changes.

### 3. Answer the `location.search` sub-question with evidence

Determine whether **any** query parameter is load-bearing for a client joining on the Yandex path —
anything the portal appends, anything the build reads, anything `Bootstrap.ts` or `FlashistFacade`
consumes from the query string. Then say plainly whether `copyToClipboard()` dropping `location.search`
is a real defect or correctly harmless, and note the disagreement with `AccountModal.viewGame()` either
way. **Do not change either call site in this task** — record the finding; the fix rides whatever
implementation brief step 5 produces.

### 4. Put the decision to the owner

Present the options that the research actually supports — **not a menu invented in advance.** Likely
shapes, subject to what step 1 finds:

- ~~**Leave it.** Off-portal invites are acceptable; the reach is worth more than the portal context.~~ ⛔ *Ruled out
  2026-10-03 by OWNER RULING (relayed by `fkit-lead`; not producer precedent): it breaks Yandex's rules. See* Context.
- **Portal-relative invite on the Yandex build.** The Yandex build copies a portal link carrying the
  lobby id; the standalone build keeps the current form. Costs a build-conditional invite path.
- **Something narrower** — e.g. keep the current link but make the off-portal session behave correctly.

Give **one recommendation with its main tradeoff**, and state clearly what is still unknown.

### 5. Record the ruling, and file the implementation task from it

> ✅ **Done 2026-10-04.** ADR: [ADR-119](../../../knowledge-base/decisions/adr-119-yandex-invites-sdk-portal-link-plus-code.md), accepted — "Accept as written" (OWNER RULING 2026-10-04, given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`; ⛔ not producer precedent). Briefs filed: `0380`–`0383`.
> ⚠️ The `/fkit-wiki-sync` routing in the last bullet below is **not done yet** — it is `fkit-wiki`'s to run.
> 📌 *2026-10-04, at close: a wiki ingest/sync is being routed to `fkit-wiki` by `fkit-lead` right after this close —
> a **follow-up, not a blocker** to closing `0199`.*


- Write the decision up as an **ADR** in `ai-agents/knowledge-base/decisions/` (the project's `adr-1XX`
  series) via `/fkit-record-decision` — including if the ruling is *"leave it as it is"*, which is the
  outcome most likely to be silently re-litigated later.
- **Then** file the implementation brief(s) via `/fkit-task-brief`, scoped to the ruling. Not before.
- **Do not write to `ai-agents/wiki-vault/`** — that is `fkit-wiki`'s exclusive surface. Route it as a
  `/fkit-wiki-sync` once the ADR exists. Note that the vault already carries a closely related page,
  `wiki/decisions/windoworigin-url-join-defect.md`, which records `0198` and will want this outcome.

## Verification steps

1. **The platform findings exist and are sourced.** A written answer to step 1 naming what Yandex
   supports, where that was established, and — explicitly listed — what could not be established.
   📌 *2026-10-04: met (producer's reading) — the [architect's evaluation](../../../knowledge-base/reports/2026-10-03-eval-yandex-invite-links.md)
   (§2.1 documented, §2.2 unknowns listed) plus the live probe in `worklog.md`, whose "Not tested" list names what
   could not be established.*
2. **The off-portal measurement is recorded**, covering: join success, SDK behaviour with
   `flashist_isYandexPlatform === true` outside the portal, and the ads / auth / payments / leaderboard
   surfaces. Observations, with what was actually run — not inference.
   ⛔ **WAIVED 2026-10-04 — never run.** OWNER RULING 2026-10-04, given live via `AskUserQuestion` in the `fkit lead`
   session, relayed by `fkit-lead`; ⛔ not producer precedent. Asked *"0199: skip the never-run test of the OLD
   invite link opened outside Yandex (it's being removed anyway), so 0199 can be closed?"*, the owner picked
   **"Yes, skip it and close 0199"**. Why it is moot: the off-portal link is ruled out (2026-10-03) and is being
   replaced on the Yandex build by `0380`/`0382`. **What stays unknown:** how the Yandex build behaves when opened
   outside the portal (SDK init, ads, auth, payments, leaderboards) — never measured.
3. **The `location.search` question is answered with evidence** — a named parameter that matters, or a
   statement that none does and how that was checked. The `AccountModal.viewGame()` disagreement is
   noted either way.
   📌 *2026-10-04: met (producer's reading) — named parameters that matter: `sdk` (`0331` probe P1, see* Context*)
   and `payload` (probe P2, `worklog.md`); the `AccountModal.viewGame()` disagreement is noted in* Context*. The
   `copyToClipboard()` re-raise is superseded on the Yandex build: the invite there is no longer built from
   `windowOrigin` (`0380`/`0382`).*
4. **The owner has ruled**, and the ruling is recorded with its date and the channel it came through.
5. **An ADR exists** in `ai-agents/knowledge-base/decisions/` capturing the ruling, its reasoning, and
   the options rejected — including for a *"leave it"* ruling.
   📌 *2026-10-04: met — [ADR-119](../../../knowledge-base/decisions/adr-119-yandex-invites-sdk-portal-link-plus-code.md), accepted (OWNER RULING 2026-10-04, given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`; ⛔ not producer precedent).*
6. **The follow-up implementation brief exists** (or the ADR states explicitly that no implementation
   work follows), with a board row so it is not board-invisible.
   📌 *2026-10-04: met — `0380`, `0382` (+ verify `0381`, `0383`), all on the Backlog board.*
7. **No source file was changed by this task.** This is a decision task; a diff in `src/` means the
   scope was exceeded.
   📌 *2026-10-04: no source change is recorded for `0199` (probe was read-only console, no deploy). Not
   independently proven — this task's commits are bulk "Sprint push" commits shared with other tasks.*
8. *(Added 2026-10-03, step 0.)* **The owner-run probe is recorded** in `worklog.md` — P1–P8 and the round trip, on
   `yandex.ru` and one other domain, with anything not run stated as such — **and the owner's YES / NO / PARTIAL
   decision** (A, B, or the owner's call) is recorded with its date.
   📌 *2026-10-04: met — probe and ruling ("Yandex link + code") recorded in `worklog.md`.*

## Notes

- **Depends on:** nothing.
- **Blocks:** nothing today. *(2026-10-04: the build it gated is now filed — `0380` → `0382`; see step 0.)* It **gates** any change to the invite-link host — nobody should alter
  `copyToClipboard()`'s host or its `location.search` handling until this is ruled.
- 🚦 *2026-10-03, OWNER RULING relayed by `fkit-lead`; ⛔ not producer precedent:* direction ruled (see *Context*).
  It is now **item 6 of the private-lobby release gate** in
  [`0354`](../0354-show-private-lobbies-to-testers-by-default-and-add-an-everyone-flag/brief.md): the everyone-flag
  is not set until this is resolved per the ruling.
- **Related:** `0198` — the source, and the task that fixed the **path** on this same line; **built but
  not yet deployed**, riding the deploy that also carries `0062` and `0063`. Its
  `review.md` holds the verbatim open-question and the `location.search` residual quoted above.
  `0069` / `0070` — the auth-strategy pair, the closest precedent on this board for *a product decision
  surfaced by a shipped task and filed unsprinted*; they also own the question of what `redirectDomain`
  and `hostname` should carry in production, which is adjacent to this one and **not** this task's.
- **This is an investigation-and-decision task, not an implementation task.** One brief, not several, and
  that is deliberate: the implementation cannot be decomposed until step 1's findings say what the
  implementation *is*. The `location.search` sub-question is folded in rather than split out because it
  is answered by the same research and cannot be decided independently of it. **Expect this task to
  produce further briefs.**
- **Priority and board are the producer's rank, flagged as such** — see `## Priority`. The owner approved
  filing this brief on 2026-08-28; they did not rank it.
- **Do not invoke the mover skills.** Producer-only since fkit's ADR-033 — route any close to the
  producer, which writes the `(agent-closed — not owner-verified)` marker when the owner is not present.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- **No secrets in any artifact.** This brief names public hostnames, files and variables only — never a
  token, key or credential.
- **Do not commit or push** anything for this task unless the owner explicitly asks.
</content>
