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

**If the owner disagrees on any of the three points above, the rank moves.** Point 1 is the load-bearing
one: if the owner judges that invited players skipping the monetised portal is costing money *now*, this
is a Sprint 4 candidate and the producer would not argue.

## Status
🔲 Backlog

## Owner
fkit-producer

## Context

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
(`ai-agents/tasks/backlog/0198-private-lobby-start-url-double-slash/review.md`) records it verbatim,
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

### ⚠️ Working-tree state when this brief was written (2026-08-28)

Uncommitted source from `0067`, `0068` and `0198`, plus an in-flight docs edit on
`ai-agents/knowledge-base/architecture.md`. **This brief touched none of it and neither should you.**
`0198`'s fix is **built and awaiting the production deploy** that also carries `0062` and `0063`.

## What to build

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

- **Leave it.** Off-portal invites are acceptable; the reach is worth more than the portal context.
- **Portal-relative invite on the Yandex build.** The Yandex build copies a portal link carrying the
  lobby id; the standalone build keeps the current form. Costs a build-conditional invite path.
- **Something narrower** — e.g. keep the current link but make the off-portal session behave correctly.

Give **one recommendation with its main tradeoff**, and state clearly what is still unknown.

### 5. Record the ruling, and file the implementation task from it

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
2. **The off-portal measurement is recorded**, covering: join success, SDK behaviour with
   `flashist_isYandexPlatform === true` outside the portal, and the ads / auth / payments / leaderboard
   surfaces. Observations, with what was actually run — not inference.
3. **The `location.search` question is answered with evidence** — a named parameter that matters, or a
   statement that none does and how that was checked. The `AccountModal.viewGame()` disagreement is
   noted either way.
4. **The owner has ruled**, and the ruling is recorded with its date and the channel it came through.
5. **An ADR exists** in `ai-agents/knowledge-base/decisions/` capturing the ruling, its reasoning, and
   the options rejected — including for a *"leave it"* ruling.
6. **The follow-up implementation brief exists** (or the ADR states explicitly that no implementation
   work follows), with a board row so it is not board-invisible.
7. **No source file was changed by this task.** This is a decision task; a diff in `src/` means the
   scope was exceeded.

## Notes

- **Depends on:** nothing.
- **Blocks:** nothing today. It **gates** any change to the invite-link host — nobody should alter
  `copyToClipboard()`'s host or its `location.search` handling until this is ruled.
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
