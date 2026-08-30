# The Yandex Invite Link Leaves the Portal — Open Product Question

**Date**: 2026-08-28
**Status**: proposed

> ❓ **Nothing here is decided.** Task `0199` is filed on the **Backlog** board at **Unscheduled**
> producer rank — the owner approved *filing the brief* on 2026-08-28 and explicitly confirmed that
> placement, but has **not** ruled on the question itself. A legitimate outcome is *"leave the invite
> exactly as it is."*
>
> ⚠️ **This is NOT a defect page.** Nothing is broken for players today: invite links work. The
> question is *where they land*.

## Context

### Host, not path — this is not [[decisions/windoworigin-url-join-defect]]

Both touch the **same line** of `src/client/HostLobbyModal.ts` — `copyToClipboard()`. They are
different questions at different layers, and conflating them produces a wrong fix.

| | `0198` — [[decisions/windoworigin-url-join-defect]] | `0199` — this page |
|---|---|---|
| **What is at issue** | The **path** — a stray `/` between base and hash | The **host** — the link points at `geoconflict.ru` at all |
| **Symptom** | The invite served the wrong entry point (the standalone template, not the Yandex one) | The recipient loads the **right** entry point, but at the standalone site, **outside the Yandex portal iframe** |
| **Kind** | Production bug, mechanical, owner-ruled High | Product / business-model decision, **unruled** |
| **State** | Fix built and **DEPLOYED** 2026-08-29 in `362a2f9`; its production proof is unreachable (private-lobby buttons are `display: none` on the Yandex template), so the task is still not Done | 🔲 Not started |

**`0198` fixed the path. It did not, and was not meant to, change the host.** Anyone reading only
`0198`'s diff will see the invite line touched and may assume the invite question is settled. It is not.

### What the invite string is, with `0198`'s fix in the tree

`src/client/HostLobbyModal.ts` → `copyToClipboard()` builds
`` `${FlashistFacade.instance.windowOrigin}#join=${lobbyId}` `` — **no separator** before the `#`, which
is `0198`'s fix. Since `windowOrigin` is `origin + pathname`, the Yandex build's invite is:

```
https://geoconflict.ru/yandex-games_iframe.html#join=<lobby-id>
```

That is **correct for what `0198` set out to do** — the path still ends in `.html`, so the recipient
gets the same (Yandex) build the host is on. 🔧 **UPDATED 2026-08-30 — this paragraph previously ended
"⚠️ Built, not deployed — production still carries the pre-fix shape." It is deployed**: release
`362a2f9` carries the separator-free invite line. ⚠️ **That changes nothing about the question this page
asks.** The host is still `geoconflict.ru`, the recipient still lands outside the portal iframe, and the
decision is still unruled.

### The code fact: the Yandex template claims the platform unconditionally

Verified in source, 2026-08-28:

- `src/client/yandex-games_iframe.html` (line 19) sets `window.flashist_isYandexPlatform = true`
  **unconditionally**, before the async SDK script tag. `src/client/index.html` sets nothing.
- `FlashistFacade`'s constructor (`src/client/flashist/FlashistFacade.ts`, ~line 358) sets
  `yaGamesAvailable = true` when `flashist_isYandexPlatform === true` **or** `window.YaGames` is
  defined — so the template flag **alone** is sufficient.

So a recipient who opens that invite in a plain browser tab, outside the portal, **still enters Yandex
platform mode**: SDK init, ads, auth, payments and leaderboards all take the Yandex code path from a
page the portal never framed.

> 🔬 **What that path actually DOES off-portal is NOT established, and must not be guessed.** The SDK
> may init, degrade, or fail; the bounded-deadline degraded-mode machinery in `FlashistFacade` may or
> may not absorb it. **Measuring this is step 1 of `0199`'s work**, not background. Nothing on this page
> asserts an off-portal behaviour. See [[systems/flashist-init]].

Likewise **unmeasured**: that Yandex's own metrics never see the session and that the portal's ad
context is not there to be monetised. Both are inference from *"the session is not in the portal"* —
they are the **hypothesis `0199` tests**, not findings.

### The folded-in sub-question: `location.search`

From `0198`'s accepted residuals (binding, with a re-raise condition): **`copyToClipboard()` drops
`location.search`** — the invite carries origin + pathname + hash, never the query string. Deliberately
unchanged there, because the join flow reads only `#join=`. Its re-raise condition is *"a query
parameter becomes load-bearing for a joining client"* — **and `0199` is where that condition gets
tested.**

The codebase already holds both conventions and they disagree: `src/client/AccountModal.ts` →
`viewGame()` builds `` `${path}${search}${hash}` ``, preserving all three parts. Whether that matters
depends entirely on whether any query parameter is load-bearing on the Yandex path — the same research
question, which is why it is folded in rather than filed separately.

## Decision

**None yet — that is the point of this page.** What *is* ruled:

- **Owner, 2026-08-28** (`AskUserQuestion`, lead session, relayed by the sprint ship-loop): the
  question must **not** stay as an undecided note inside `0198`'s closing ledger, where it would be
  lost. File it as its own product question — which is `0199`.
- **Owner, 2026-08-28:** the **Backlog / Unscheduled** placement is confirmed. Explicitly **not** a
  Sprint 4 item.
- **Producer's rank and reasoning** (recorded so it can be overruled in one edit): nothing is broken
  for players; the shape of the fix is unknown and may be *"leave it"*; and a Sprint 4 row could only
  be appended at the bottom of that board, reading as lowest rank — a false signal the other way.
  The load-bearing point is the first: **if the owner judges that invited players skipping the
  monetised portal costs money now, this becomes a Sprint 4 candidate.**

`0199` is an **investigation-and-decision task, not an implementation task** — its own verification
step 7 fails the task if `src/` changes. Its outputs are: platform findings (what Yandex supports for
portal deep-linking, *and explicitly what could not be established*), the off-portal measurement, the
`location.search` answer with evidence, an owner ruling, an ADR in
`ai-agents/knowledge-base/decisions/` — **including for a "leave it" ruling** — and only then the
implementation brief(s).

## Consequences

- **The invite-link host is frozen pending this ruling.** `0199` blocks nothing, but it **gates** any
  change to `copyToClipboard()`'s host or its `location.search` handling. Nobody should alter either
  until it is ruled.
- **Expect this task to produce further briefs.** The implementation cannot be decomposed until the
  research says what the implementation *is*.
- **The off-portal question has a player-facing branch.** If the off-portal session turns out to be
  fully functional, this is a revenue/metrics question. If it is degraded or broken, it is *also* a
  player-facing defect and **the rank changes**. That branch is unresolved because the measurement has
  not been taken.
- **Adjacent, and deliberately not this task's:** `0069`/`0070` own what `redirectDomain` and
  `hostname` should carry in production — the other two `windowOrigin` consumers that send the value as
  a payload field. Same field, different question.

## Related

- [[decisions/windoworigin-url-join-defect]] — task `0198`, the source: it fixed the **path** on this
  same line and deliberately left the **host** question open
- [[systems/flashist-init]] — `FlashistFacade`, `yaGamesAvailable`, and the platform-detection flag this
  question turns on
- [[systems/networking]] — the worker-route and entry-point behaviour behind the invite URL
- [[decisions/sprint-backlog]] — the unsprinted board `0199` is filed on
- [[decisions/sprint-4]] — the board `0199` is explicitly **not** on
- [[tasks/citizen-verified-icon]] — task `0068`, whose live check surfaced `0198` and, through it, this
- `schema.md`, **Standing Owner Rulings** — the 2026-08-29 owner ruling that public hostnames may stay
  in vault pages cites **this page** as the case where the hostname *is* the finding. Do not strip the
  host from this page; that question is closed.
