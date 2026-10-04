# ADR-119: Private-Lobby Invites on Yandex Games Are an SDK-Built Yandex Games Link Plus the Code

**Date**: 2026-10-04
**Status**: accepted

> Source: `ai-agents/knowledge-base/decisions/adr-119-yandex-invites-sdk-portal-link-plus-code.md`. Accepted by owner
> sign-off 2026-10-04 (asked *"ADR-119 (Yandex link + code, rules for the build): accept it as written?"* → **"Accept
> as written"**, live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`), promoted from
> `proposed` in place. Two owner answers to the draft's open questions were folded in **before** immutability began;
> a third owner answer (moderation) was recorded **after** acceptance as a follow-up ruling that changes no decision.
> Drafted by `fkit-architect` as task `0199`'s step 5; the architect heard no ruling first-hand and did not run the
> live probe — both arrived by relay.
>
> **This ADR resolves the question [[decisions/yandex-invite-portal-boundary]] recorded as open** (now marked
> superseded). Task record: [[tasks/yandex-invite-link-decision]] (`0199`, done).

## Context

On the Yandex build, the host's "copy invite" (`HostLobbyModal.copyToClipboard()`) copies
`` `${FlashistFacade.instance.windowOrigin}#join=<lobby id>` ``. `windowOrigin` is our own page's origin + path, so
inside the Yandex iframe the copied link points at **our own domain, outside the portal**. Yandex requirements:

- **8.4.2** — no links to the creator's or the game's own site. **8.4.4** — no redirecting players outside Yandex
  Games. **8.4.1** — links are allowed when *"built in via the SDK and lead to your games in the Yandex Games
  catalog"*.
- Games run on **many `yandex.<tld>/games` domains**, so any hardcoded catalog URL is wrong for some players.

The inbound side: `Main.handleHash()` honours `#join=<id>` **whatever the flags say**. The lobby id **is** the code:
8 characters, `[a-zA-Z0-9]`, **case-sensitive** (`ID` in `src/core/Schemas.ts`). Code-only joining already exists in
`JoinPrivateLobbyModal`.

Options and probe plan came from the architect's evaluation
`ai-agents/knowledge-base/reports/2026-10-03-eval-yandex-invite-links.md` (its recommendation was *ship codes now,
probe now, decide the link from the probe* — ⚠️ **the owner did NOT pick that**; he chose *"Test first, then
decide"*, changing nothing until the probe ran).

### The live probe — owner-run in production, 2026-10-04, desktop Chrome

OWNER-REPORTED, relayed by `fkit-lead` (who saw the console output for P1–P6); **not re-run by the architect**. Full
record (URL shapes only) in `0199`'s `worklog.md`.

| Question | Result |
|---|---|
| Does `?payload=` reach our iframe-hosted game? | **Yes** — `environment.payload` held the value on the **.ru and .com** portals |
| Does it also land in our own URL? | **Yes** — forwarded into the iframe's `location.search` |
| Does `getGameByID(environment.app.id)` return *this* game? | **Yes** — `isAvailable: true`, and a **portal-correct** `url` (.ru on .ru, .com on .com) |
| Does `getAllGames()` include this game? | **No** — it lists only **other** games. Not a usable fallback |
| Round trip (built link → fresh incognito window → payload read) | **Worked** |
| `ysdk.clipboard.writeText` | Works **only inside a user click**; outside one it fails (*"Document is not focused"*) |
| Does the payload survive a match exit? | **Yes, it comes back** ⇒ **consume-once is mandatory** |
| **Not tested** | mobile; domains other than .ru/.com; native `navigator.clipboard` in the iframe |

## Decision

On the **Yandex build**, a private-lobby invite is **a Yandex Games link to this game, built by the SDK, plus the
lobby code** — and nothing that leads to our own domain.

1. **Outbound link** = `game.url` from `ysdk.features.GamesAPI.getGameByID(Number(ysdk.environment.app.id))`, with
   `payload=<lobby id>` set through the `URL` API (never string concatenation). **No catalog URL, app id or domain
   is hardcoded**, and no URL is assembled from `location.ancestorOrigins` / `document.referrer`.
2. **The code is always shown** and copyable, with or without a working link.
3. **If the SDK cannot give a link** (unavailable, `isAvailable` false, no `url`, call fails) → **code only**. Never
   an own-domain URL, never a self-built one.
4. **Inbound:** after the SDK is ready, read `ysdk.environment.payload`; if it is a valid lobby id (the `ID`
   schema), open the join window through the same path `#join=` uses today.
5. **`#join=` is no longer honoured on the Yandex build** (gated on `flashist_isYandexPlatform`). The standalone
   build keeps it.

**Rejected:** the own-domain link (owner ruling 2026-10-03 — violates 8.4.2 and 8.4.4; must never reach players) ·
**codes only** as the end state (friction: find Join, type a case-sensitive 8-character code with `0/O`, `l/I/1`
look-alikes — codes remain part of the design) · a **self-built URL** from `ancestorOrigins` / `referrer` (owner
ruling 2026-10-04 — it is the hardcoded shape he ruled out; not even a last-rung fallback) · `getAllGames()` as a
fallback (dropped **on evidence** — it does not contain this game).

### Owner answers folded in (2026-10-04, live via `AskUserQuestion`, relayed by `fkit-lead`)

- **Flag cohort — "Yes, link always lets them in".** A friend who opens an invite link can join even if they cannot
  see the private-lobby buttons (not a tester, not in the flag cohort). The payload join ignores the private-lobby
  flags, as `#join=` does today — matching *"joining by invite is free"*.
- **Host code display — "Keep hidden + show button".** The masked code (`••••••••`) with its show toggle stays;
  copying works **without** revealing it. That satisfies Decision 2.
- **Moderation / self-link — after acceptance: "Yes, drop it".** Owner: *"we don't need their approval, we're not
  violating anything with it"* — the step to ask Yandex support is **withdrawn**. The owner judges the SDK link +
  `payload` within 8.4.1 and **knowingly accepts the grey area** (8.4.1 is worded for links to *other* games). ⚠️ The
  moderation residual risk and the re-raise trigger **stand unchanged** — an *actual* rejection reopens this; the
  absence of prior approval does not.

## Consequences

- **Positive:** the rules violation goes; a friend joins in one tap, on their own Yandex domain, even as a guest; no
  app id, domain or catalog URL lives in the repo; codes keep working whatever the link does.
- **Binding constraints on the build:**
  - **Consume-once via `sessionStorage`** — the payload returns after every match exit; without this the friend is
    pulled back into the same lobby after each match.
  - 🚨 **Never strip or rewrite `location.search`** to clean up the payload. Yandex's loader reads its SDK address
    from the iframe's `sdk` query parameter — the trap [[tasks/match-exit-keeps-query-string]] (`0331`/`0337`)
    exists for. Dedupe in `sessionStorage`; leave the URL alone.
  - **Read the payload on late SDK recovery too**, not only after normal platform init — a boot that misses the 5 s
    deadline would otherwise drop the friend silently on the menu ([[systems/flashist-init]]).
  - **Copy only inside the user's click.** ⚠️ **Not probed:** whether an `await` (e.g. `getGameByID`) before the
    write, inside the same click, loses the gesture. Safest: resolve and memoize the link **before** the click.
    Today's copy swallows errors (`console.error` only) — a failed copy must not look like success.
  - **`#join=` stops working on the Yandex build** — old own-domain invites stop pulling people into an
    off-portal Yandex-mode session. Intended.
  - More moving parts than codes-only, and a deploy plus separate verify tasks (owner's build/verify split rule).
- **Residual risks:** mobile web / the Yandex app, other portal domains and native clipboard are **untested**; a
  payload that does not arrive somewhere degrades to "friend lands on the menu" and the code still works. Moderation
  may read a clipboard self-link differently from 8.4.1's "more games" links (accepted, see above).
- **Re-raise only if:** Yandex moderation or support **rejects** a payload self-link; Yandex changes or removes
  `environment.payload` or `GamesAPI.getGameByID` for the current game; or verification shows the payload does not
  reach the game on a platform that matters. ⛔ **Not** a reason: a review asking for an own-domain link, a self-built
  URL from `ancestorOrigins`, or `getAllGames()` as a fallback — closeout, not defects.
- **Still open (owner, not decided here):** **code friendliness** — keep the 8-character case-sensitive code, or a
  separate decision on a friendlier one (touches lobby-id generation in `src/core/` and the server).

### The build it produced (all on the Backlog board, unscheduled, filed 2026-10-04)

| Task | What | Kind |
|---|---|---|
| `0380` | Yandex build copies the **code** via the SDK clipboard (native fallback; a visible message on double failure); `#join=` off on Yandex; code stays masked with the toggle | build (~40–80 lines) |
| `0381` | Verify `0380` in production — code copied, old `#join=` links ignored, paste-button behaviour recorded | owner-run verify |
| `0382` | Yandex build copies the **SDK link** with `payload`, memoized before the click; payload read at startup **and** on late recovery; consume-once; non-tester friend gets Join | build (~150–250 lines, on top of `0380`) |
| `0383` | Verify `0382` in production — link shape follows the host's portal, non-tester friend joins, Join does **not** reopen after a match | owner-run verify |

🚦 **Release gate item 6** for private lobbies (in `0354`'s brief) is met **only when `0380` + `0382` are built AND
`0381` + `0383` have PASSED in production** (owner ruling 2026-10-04, *"Prod checks must pass too"*). See
[[tasks/private-lobby-citizen-perk]].

## Related

- [[decisions/yandex-invite-portal-boundary]] — the open question this ADR closes (superseded)
- [[tasks/yandex-invite-link-decision]] — task `0199`: rulings, probe, waiver, close
- [[decisions/windoworigin-url-join-defect]] — task `0198`: fixed the **path** on the same invite line
- [[tasks/private-lobby-citizen-perk]] — task `0302`, the feature; release gate item 6
- [[tasks/match-exit-keeps-query-string]] — the `sdk` query-parameter trap (`0331` / `0337`)
- [[tasks/match-exit-query-string-production-check]] — `0337`: `sdk` proven to survive a match exit in production (2026-10-04)
- [[systems/flashist-init]] — `FlashistFacade`, `windowOrigin`, platform flag, late SDK recovery
- [[decisions/sprint-backlog]] — where `0380`–`0383` are filed
- [[tasks/private-lobby-start-url]] — task `0198`'s close: the path fix whose host question this ADR answers
- [[tasks/citizen-verified-icon]] — task `0068`, whose live check surfaced `0198` and, through it, `0199`
- [[systems/networking]] — the worker route and entry-point behaviour behind the invite and the join
