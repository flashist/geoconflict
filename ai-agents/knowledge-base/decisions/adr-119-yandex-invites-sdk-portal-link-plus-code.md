# ADR-119: Private-lobby invites on Yandex Games are an SDK-built Yandex Games link plus the code — never a link to our own domain

- **Status:** accepted (owner sign-off 2026-10-04, relayed by fkit-lead). Promoted `proposed` → `accepted`
  in place, per `decisions/README.md` § *Immutability starts at `accepted`*.
  - **The ruling:** live via `AskUserQuestion` in the `fkit lead` session, 2026-10-04, relayed by
    `fkit-lead` — asked *"ADR-119 (Yandex link + code, rules for the build): accept it as written?"*, the
    owner chose **"Accept as written"**. In the same session the owner also answered two of the open
    questions below (flag cohort; host code display); those answers were folded in with this promotion,
    before immutability began.
  - *History, kept visible:* until 2026-10-04 this line read *"proposed — **the decision itself is
    owner-ruled** (2026-10-03 and 2026-10-04, see *Deciders*); what is pending is the owner's sign-off on
    **this text**. Promote to `accepted` in place, per `decisions/README.md` § *Immutability starts at
    `accepted`*. Left `proposed` because the owner has not read these words, and a `proposed` body can still
    be corrected without a superseding ADR."*
- **Date:** 2026-10-04
- **Deciders:** Owner (Mark Dolbyrev). Two rulings, both given live via `AskUserQuestion` in the `fkit lead`
  session and relayed by `fkit-lead`:
  - **2026-10-03:** an invite link that takes a player off Yandex Games (to our own domain) violates Yandex
    rules (requirement 8.4.2) and must never reach players. Invite codes are kept in every case. Test first,
    then decide.
  - **2026-10-04:** *"Yandex link + code"* — the invite copies a Yandex Games link built via the SDK
    (portal-correct, never hardcoded), and the code is still shown.

  Drafted by `fkit-architect` (spawned by `fkit-lead`, task `0199` step 5). The architect heard neither ruling
  first-hand, and did not run the live probe below — both arrived by relay.

## Context

Task [`0199`](../../tasks/done/0199-yandex-invite-link-leaves-portal-iframe/brief.md). The host's
"copy invite" button copies `` `${FlashistFacade.instance.windowOrigin}#join=${this.lobbyId}` ``
(`src/client/HostLobbyModal.ts`, `copyToClipboard()`). `windowOrigin` is our page's own origin + path
(`src/client/flashist/FlashistFacade.ts`, `public windowOrigin`), so inside the Yandex iframe the copied link
points at our own domain, outside the portal. Yandex requirement **8.4.2** forbids links to the creator's or
the game's own site; **8.4.4** forbids redirecting players outside Yandex Games; **8.4.1** allows links that
are *"built in via the SDK and lead to your games in the Yandex Games catalog"*. Games run on many
`yandex.<tld>/games` domains, so any hardcoded catalog URL is wrong for some players.

The inbound side: `Main.handleHash()` honours `#join=<id>` regardless of flags (`src/client/Main.ts`,
`decodedHash.startsWith("#join=")`). The lobby id is the code: 8 characters, `[a-zA-Z0-9]`, case-sensitive
(`src/core/Schemas.ts`, `export const ID`). Code-only joining already exists in `JoinPrivateLobbyModal`.

The options and the probe plan come from the evaluation
[`reports/2026-10-03-eval-yandex-invite-links.md`](../reports/2026-10-03-eval-yandex-invite-links.md)
(recommendation there: ship codes now, probe, decide the link from the probe).

**Live probe — owner-run in production, 2026-10-04, desktop Chrome** (relayed by `fkit-lead`; results as
relayed, not re-run by the architect):

| Question (eval §2.2) | Result |
|---|---|
| Does `?payload=` reach our iframe-hosted game? | **Yes** — `environment.payload` held the value on **yandex.ru** and **yandex.com**. |
| Does it also land in our own URL? | **Yes** — forwarded into the iframe's `location.search`. |
| Does `getGameByID(environment.app.id)` return *this* game? | **Yes** — `isAvailable: true`, and a portal-correct `url` (yandex.ru on .ru, yandex.com on .com). |
| Does `getAllGames()` include this game? | **No** — it lists only **other** games. Not a usable fallback. |
| Round trip (built link → fresh incognito window → payload read) | **Worked.** |
| `ysdk.clipboard.writeText` | Works **only inside a user click**; outside one it fails with *"Document is not focused"*. |
| Does the payload survive a match exit? | **Yes, it comes back** after a match ⇒ consume-once is **mandatory**. |
| **Not tested** | mobile; domains other than .ru/.com; native `navigator.clipboard` in the iframe. |

## Decision

On the **Yandex build**, a private-lobby invite is **a Yandex Games link to this game, built by the SDK,
plus the lobby code** — and nothing that leads to our own domain.

1. **Outbound link.** The link is `game.url` from
   `ysdk.features.GamesAPI.getGameByID(Number(ysdk.environment.app.id))`, with `payload=<lobby id>` set
   through the `URL` API (never string concatenation). No catalog URL, app id, or domain is hardcoded, and no
   URL is assembled from `location.ancestorOrigins`/`document.referrer`.
2. **The code is always shown** and copyable, in every case — with or without a working link.
3. **If the SDK cannot give a link** (`isAvailable` false, no `url`, call fails, SDK unavailable), the
   invite falls back to **code only**. It never falls back to an own-domain URL or a self-built one.
4. **Inbound.** After the SDK is ready, read `ysdk.environment.payload`; if it is a valid lobby id (the `ID`
   schema), open the join window through the same path `#join=` uses today.
5. **`#join=` is no longer honoured on the Yandex build** (gate on the platform flag,
   `flashist_isYandexPlatform`). The standalone build keeps it.

## Options considered

- **SDK-built Yandex Games link + code (chosen).** One tap for the friend; lands inside the portal on the
  friend's own correct domain; matches 8.4.1's "via SDK, to your game in the catalog"; the probe confirmed
  the load-bearing undocumented behaviours on two domains. The code covers every case the link does not.
- **Own-domain link (today's `windowOrigin#join=`)** — **rejected by owner ruling 2026-10-03:** violates
  8.4.2 (and 8.4.4); must never reach players.
- **Codes only** — **rejected as the end state** for friction: the friend must find the Join button and type
  a case-sensitive 8-character code (`0/O`, `l/I/1` look-alikes). Codes remain part of the chosen design.
- **Self-built URL from `location.ancestorOrigins` / `document.referrer`** (`<portal origin>/games/app/<app id>`)
  — **rejected by owner ruling 2026-10-04:** it is the hardcoded URL shape the owner ruled out; the SDK gives
  a portal-correct URL instead. Not even a last-rung fallback — code-only is the fallback.
- *(`getAllGames()` as a fallback — dropped on evidence, not on preference: the probe showed it lists only
  other games.)*

## Consequences

- **Positive:** removes the rules violation; a friend joins in one tap, on their own Yandex domain, even as a
  guest; no app id, domain or catalog URL lives in the repo; codes keep working whatever the link does.
- **Negative / costs — binding constraints on the build:**
  - **Consume-once via `sessionStorage`.** The payload comes back after every match exit (probe), so the
    consumed value is remembered in `sessionStorage` and not re-joined. Without this the player is pulled
    back into the same lobby after each match.
  - **Never strip or rewrite `location.search`** to "clean up" the payload, even though it is forwarded
    there. Yandex's loader reads its SDK address from the iframe's `sdk` query parameter — the trap tasks
    `0331`/`0337` exist for. Dedupe in `sessionStorage`; leave the URL alone. `handleHash()`'s `strip()`
    already keeps `window.location.search`; keep it that way.
  - **Read the payload on late SDK recovery too**, not only after the normal platform init. If the SDK misses
    the 5 s boot deadline (degraded mode), the payload is unreadable at startup; the late-recovery path in
    `FlashistFacade.yandexSdkInit` must also trigger the read, or the friend silently lands on the menu.
  - **Copy only inside the user's click.** `ysdk.clipboard.writeText` fails outside a user gesture. ⚠️
    Not probed: whether an `await` (e.g. the `getGameByID` call) *before* the write, inside the same click,
    loses the gesture. Safest: resolve and memoize the link **before** the click (e.g. when the host window
    opens), so the click handler does the write directly. Today's copy swallows errors
    (`copyToClipboard()`'s `catch` only logs) — a failed copy must not look like success; the visible code is
    the fallback.
  - **`#join=` stops working on the Yandex build.** Any old own-domain invite already sent stops pulling
    people into an off-portal Yandex-mode session. Intended.
  - More moving parts than codes-only (late-SDK path, consume-once, link fallback), and a deploy plus a
    separate verify task (owner rule: build and verify are split).
- **Residual risks:**
  - **Untested:** mobile web / the Yandex app; domains other than yandex.ru and yandex.com; native
    `navigator.clipboard` in the iframe. Code-only is the designed fallback if the link cannot be built; a
    payload that does not arrive on some platform degrades to "friend lands on the menu", and the code still
    works. The verify task should cover at least one mobile session.
  - **Moderation** may read a clipboard self-link differently from 8.4.1's "more games" links — see open
    questions.
- **Re-raise only if:** Yandex moderation or support rejects a payload self-link; Yandex changes or removes
  `environment.payload` or `GamesAPI.getGameByID` for the current game; or verification shows the payload does
  not reach the game on a platform that matters. **Not** a reason to re-raise: a review asking for an
  own-domain link (owner-ruled out, 8.4.2), a self-built URL from `ancestorOrigins` (owner-ruled out), or
  `getAllGames()` as a fallback (shown not to contain this game). Those findings are closeout, not defects.

## Owner answers to the draft's open questions (2026-10-04)

Both are OWNER RULINGS given live via `AskUserQuestion` in the `fkit lead` session on 2026-10-04, relayed by
`fkit-lead`, and folded in with the promotion to `accepted`.

- **Flag cohort for link joins — ✅ "Yes, link always lets them in".** A friend who opens an invite link can
  join even if they cannot see the private-lobby buttons (not a tester, not in the flag cohort). This matches
  "joining is free" (`0376`'s brief: *"joining by invite is free and works whatever the flags say"*). The
  payload join therefore ignores the private-lobby flags, as today's `#join=` does.
  - *Draft question, kept visible:* *"Should a payload link open the join window for a friend who is **not**
    in the private-lobby flag cohort (Join button hidden)? Today's `#join=` does, ignoring flags; `0376`'s
    brief reads 'joining by invite is free and works whatever the flags say'. Plain terms: if a tester sends a
    link to someone who can't normally see private lobbies, does the link let them in anyway?"*
- **Host code display — ✅ "Keep hidden + show button".** Today's masked code (`••••••••`) with its show
  toggle stays; copying works without revealing it. "The code is still shown" (Decision §2) is satisfied by
  the show toggle — the code is available to the host, masked by default.
  - *Draft text, kept visible (was the last sentence of the "Code friendliness" question):* *"Related:
    the host window masks the code by default; the build brief should say whether 'the code is still shown'
    means unmasked."*

## Open questions (owner — not decided here)

- **Code friendliness.** Keep the 8-character, case-sensitive code, or file a separate decision on a
  friendlier one (shorter, case-insensitive, no look-alike letters)? That touches lobby-id generation in
  `src/core/` and the server — out of this ADR's scope.
- **Moderation's view of self-links.** 8.4.1 speaks of links to your games in the catalog; a clipboard link
  to the same game with `payload` plausibly fits, but this is not stated. Only Yandex support or a moderation
  pass can confirm. Optionally ask support before or alongside the release.
  > ✅ **Answered 2026-10-04 — OWNER RULING after acceptance**, given live in the `fkit lead` session and
  > relayed by `fkit-lead`. Recorded under `decisions/README.md` § *Immutability starts at `accepted`* as an
  > owner follow-up ruling on a question this ADR itself listed — it changes no decision, option or
  > consequence above. The question text above is left byte-identical.
  > - Owner's words: *"we don't need their approval, we're not violating anything with it"*. Then, via
  >   `AskUserQuestion`: *"Drop the 'ask Yandex support about the self-link' step?"* → **"Yes, drop it"**.
  > - **Meaning:** the owner judges the SDK-built link + `payload` to be within rule 8.4.1, and knowingly
  >   accepts the small grey area (8.4.1 is worded for links to *other* games). **There is no step to ask
  >   Yandex support** — the "optionally ask support" suggestion above is withdrawn. The question is closed;
  >   only **code friendliness** stays open.
  > - **Unchanged:** the Consequences residual-risk bullet on moderation still describes a real, accepted
  >   risk, and *Re-raise only if* still lists "Yandex moderation or support rejects a payload self-link" — an
  >   actual rejection reopens this; the absence of prior approval does not.

## Related

- Evaluation: [`reports/2026-10-03-eval-yandex-invite-links.md`](../reports/2026-10-03-eval-yandex-invite-links.md)
- Task [`0199`](../../tasks/done/0199-yandex-invite-link-leaves-portal-iframe/brief.md) (this ADR is its
  step 5; the implementation brief is filed from it).
- The `sdk` query-parameter trap: [`0331`](../../tasks/done/0331-keep-the-query-string-on-match-exit/brief.md),
  [`0337`](../../tasks/done/0337-verify-0331-in-production-the-sdk-query-parameter-survives-a-match-exit/brief.md).
- Flag cohort: [`0354`](../../tasks/backlog/0354-show-private-lobbies-to-testers-by-default-and-add-an-everyone-flag/brief.md),
  [`0376`](../../tasks/backlog/0376-verify-private-lobbies-in-production-a-citizen-hosts-inside-yandex-and-a-friend-joins/brief.md).
- Code: `src/client/HostLobbyModal.ts` (`copyToClipboard()`), `src/client/Main.ts` (`handleHash()`),
  `src/client/flashist/FlashistFacade.ts` (`windowOrigin`, `yandexSdkInit` late recovery),
  `src/client/JoinPrivateLobbyModal.ts`, `src/core/Schemas.ts` (`ID`).
- ⚠️ **Wiki staleness, for `fkit-wiki`:** `ai-agents/wiki-vault/wiki/decisions/yandex-invite-portal-boundary.md`
  still reads *"Nothing here is decided … A legitimate outcome is 'leave the invite exactly as it is'"* — stale
  against both rulings. `fkit-wiki` should ingest this ADR and the evaluation report. The architect does not
  write the wiki.
