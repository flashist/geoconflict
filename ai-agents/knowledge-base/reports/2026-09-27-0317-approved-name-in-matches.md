# 0317 — Show a citizen's approved name in matches: findings and approaches

**Task:** [`0317`](../../tasks/done/0317-investigate-show-a-citizens-approved-name-in-matches/brief.md)
· **Written:** 2026-09-27 by `fkit-architect` (spawned by `fkit-lead` in `fkit-sprint-ship-loop`, no owner
channel) · **Code frame:** `dev` at `390c4b4` **plus the uncommitted working tree** (0307 / 0302 / 0312 /
0313 / 0315 / 0314). Line numbers are against that tree and will drift once it is committed.

> **How this was produced.** Investigation only: no source changed. The comparison follows
> `/fkit-evaluate-approach`, but that skill asks the owner for priorities first and this run has no owner
> channel. **Assumed weighting** (owner may correct it): (1) impersonation risk, (2) never delaying a join,
> (3) cost, (4) reversibility. The report path is the one the lead named, not the skill's
> `YYYY-MM-DD-eval-<slug>.md` pattern — a naming difference only.
> No player ids, names, tokens, hosts or IPs appear below; example names are placeholders.

## 0. The answer in five lines

1. **Today the in-match name is whatever the client types.** The server checks its shape (0307) and relays
   it. Nothing links it to the profile, so an approved `display_name` never reaches a match.
2. **The only identity the game server has is the client-asserted Yandex id** (ADR-103). The profile
   session token is no stronger: it is minted from that same asserted id (`vfy:false`). So **no approach
   can stop a determined forger until `0267` lands** — (b) included.
3. **Showing the approved name is one step. Stopping others from using it is a separate step.** Every
   approach except (b) leaves anyone free to *type* the same string, as they can today.
4. **Recommendation: (a) server-side substitution through the existing ADR-103 funnel, with (c) prefill
   shipped first as a cheap step if the owner accepts it.** (a) reuses the exact path the citizen icon
   (0068) already rides and gets the `0267` trust upgrade with no further change. (b) costs the most and
   adds no trust until `0267` ships anyway.
5. **Two existing rulings are triggered and need the owner:** `0307`'s look-alike residual (its "re-raise
   only if" is literally "approved names start being shown to other players — in game") and ADR-103's
   scope (it accepted the asserted id for XP. The 0068 icon and the 0302 lobby gate later extended it).

---

## 1. Unknown 1 — identity and trust

### Where the in-match name comes from, end to end

| Hop | What happens | Evidence |
|---|---|---|
| Name field | `getStoredUsername()` on every page load: **Yandex `getName()` first**, else `localStorage`, then `sanitizeUsernameForJoin`, else `Anon####`. A name the player types is saved only in `localStorage`, and the Yandex name replaces it on the next load. | `src/client/UsernameInput.ts:133-170`; typing `:115-131` |
| Hand-out | `getCurrentUsername()` returns the last name that passed the rule | `UsernameInput.ts:51-55`; callers `Main.ts:740`, `SinglePlayerModal.ts:543` |
| Join message | `username: lobbyConfig.playerName`, `yandexPlayerId` alongside | `src/client/Transport.ts:398-400` |
| Server check | `JoinUsernameSchema` = trim, then `checkUsernameRules` (0307 F4.1). `yandexPlayerId` is `string ≤256, nullable`, **unverified** | `src/core/Schemas.ts:255-260`, `:661-678` |
| Server stores | `new Client(..., clientMsg.username, ..., clientMsg.yandexPlayerId ?? null)`, and `username` is `readonly` | `src/server/Worker.ts:509-523`; `src/server/Client.ts:43-54` |
| Lobby poll | `gameInfo()` → `{username, clientID, isCitizen}` per client, served on **unauthenticated** `GET /api/game/:id` | `src/server/GameServer.ts:1034-1042`; `Worker.ts:336-342` |
| Match start | `start()` freezes `{username, clientID, cosmetics, isCitizen}` into `GameStartInfo`, sent identically to everyone | `GameServer.ts:524-551` |
| Simulation | `sanitize()` → for **other** players also `fixProfaneUsername` → `PlayerImpl` runs `sanitizeUsername` | `src/core/GameRunner.ts:49-57`; `src/core/game/PlayerImpl.ts:118-121` |

### What ties a connection to a profile today

- **One funnel:** `getCreditableYandexId(client)` returns `client.yandexPlayerId` unchanged
  (`GameServer.ts:1332-1334`; ADR-103).
- **At join** the server resolves that id through `POST /internal/v1/players/resolve`
  (`ProfileApiClient.ts:89-129` → `src/profile-server/Routes.ts:767-790`). It gets back
  `{playerId, isCitizen}` (`src/core/profile/CreditContract.ts:76-79`) and sets `client.isCitizen = true`
  (true-only) (`GameServer.ts:1368-1400`). This is how the **0068 citizen icon** reaches a match. **It is
  exactly the seam approach (a) would extend**: one more field on the same response, with no new request
  and no new trust seam.
- The id can only go null → value (late `update_identity`), never be replaced (`Client.ts`,
  `GameServer.ts:424-436`).
- A reconnect carries `isCitizen` across (`GameServer.ts:277-279`) and carries `profilePlayerId` only
  when the same asserted id comes back (`:283-289`).

### How strong is that identity?

- **Game server:** client-asserted, with no signature check (`Schemas.ts:668-676`, `Client.ts:49-51`).
- **Profile session token:** `vfy:false`, minted by `POST /v1/login` for **whatever id the client asserts**
  (`src/profile-server/SessionToken.ts:4-8`; `Routes.ts:682-745`; `resolveCaller` `:498-520`, whose doc at
  `:291-292` says *"`ok` is NOT a proven owner"*). So forwarding the token to the game server proves
  nothing the asserted id does not already claim. **This matters for approach (b).**
- **What a forger needs:** the target's Yandex id. I found **no path in this repo that shows one player's
  Yandex id to another player**. The roster and the lobby poll carry only clientID, name and the citizen
  flag (`GameServer.ts:539-545`, `:1036-1041`), and ADR-113 bars platform ids from clients.
  ⚠️ **Not verified: whether Yandex itself exposes that id anywhere.** That is `0267`'s job.
- **The key that would verify identity exists, on the profile box only.** `0065` records
  `YANDEX_PAYMENTS_SECRET` present in the running profile container since 2026-09-20. Whether signed
  *player* data uses the same key is **not established** (the `0267` brief, item 1). **`0267` is no longer
  blocked by Yandex. It is simply not started.**
- **Precedent, owner-accepted:** 0068 accepted *"a forged id can mint a cosmetic icon"* (0068 `review.md`
  *Accepted residuals*). 0302 accepted a forged citizen id passing the private-lobby gate
  (`GameServer.ts:929-932`, `Client.ts:18-24`). **Neither acceptance covers names.** A name is more
  personal than an icon, so it needs its own ruling (question D3).

## 2. Unknown 2 — name rules: which rule wins in a match?

- **Today both paths use the same rule.** A requested `display_name` is trimmed, then checked with
  `checkUsernameRules` (`src/profile-server/NameChangeRepository.ts:310-314`). The join name goes through
  `JoinUsernameSchema` = trim + the same `checkUsernameRules` (`Schemas.ts:255-260`). It is one function
  (`src/core/validations/usernameRules.ts:43-60`). **So an approved name passes the join check today.**
- **Differences that still matter:**
  1. **When the check ran.** `display_name` was checked when it was requested. If `0308` changes the rule,
     a name approved earlier may fail the new rule, or be normalized to a different string. ⇒ Any
     substitution **must re-check the approved name at the moment it substitutes it** (through
     `JoinUsernameSchema`), and fall back to the typed name if it fails. Do not trust the stored string
     blindly.
  2. **The match runs two more cleaners** (`GameRunner.ts:49-57`): `sanitize()` (`src/core/Util.ts:173`,
     which deletes `-`, `'` and `.`) and, **for other players only**, `fixProfaneUsername`
     (`src/core/validations/username.ts:44-49`). That one swaps a matched name for a **shadow name**.
     An approved name is **not** profanity-checked when it is requested (`usernameRules.ts:16-20`: the
     human moderator is the gate). ⇒ If the matcher flags an approved name, **other players see a random
     shadow name** and the holder sees their own. Design point for brief B2 (recommended: keep the filter,
     §7).
  3. **Uniqueness exists only among approved names.** It uses `lower(display_name)`
     (`migrations/006_player_identity.sql:90-92`; `NameChangeRepository.ts:142-146`), with no
     normalization. **In-game names are not unique and are not checked against approved names.** So the
     exact string of an approved name is free for anyone to type in a match.
- **`0308` (parked, plan kept)** would put both paths on one cleaner and one wider rule. Its plan replaces
  `sanitize()` in `GameRunner` with `sanitizeUsername` (0308 `plan.md` step 3.5). **Soft dependency:** the
  substitution works under today's rule or 0308's, as long as it re-checks at substitution time (point 1).
- **`0307` (done)** removed the one hard blocker. `NameLayer` now writes names with `textContent`
  (`src/client/graphics/layers/NameLayer.ts:265-268`, `:380`), so a name reaching every screen is no
  longer an injection path. Chat and events still go through DOMPurify `onlyImages`, which 0307 checked as
  safe for names.

## 3. Unknown 3 — surfaces

The finding that makes this cheap: **every in-match surface reads the name from the simulation, which
takes it from `GameStartInfo`.** Every lobby list reads `gameInfo()`. So replacing the name at those two
server points (`GameServer.ts:539`, `:1038`) reaches every multiplayer surface below **with no client
change**.

| Surface | Reads from | Covered by a server-side substitution? |
|---|---|---|
| Map labels | `NameLayer.ts:268,380` → `player.name()` | yes |
| Leaderboard (with ★) | `Leaderboard.ts:316` | yes |
| Player panel / overlay (with ★) | `PlayerPanel.ts:442`, `PlayerInfoOverlay.ts` | yes |
| Events, trade and alliance messages | `EventsDisplay.ts`; core strings e.g. `PlayerImpl.ts:668-693` | yes |
| Chat | `ChatModal.ts`, `ChatDisplay.ts:118` | yes |
| Win screen | `WinModal.ts` | yes |
| Private lobby lists (host / join, with ★) | `HostLobbyModal.ts:557`, `JoinPrivateLobbyModal.ts:92` ← `gameInfo()` | yes |
| Public lobby | `PublicLobby.ts` shows a count only, no names (0068 residual) | n/a |
| Start-screen name field | `UsernameInput.ts` (client) | **no** — needs (c) |
| Single-player | `LocalServer.ts:277` uses the typed `playerName`; only you see it | **no** — (c) covers it |
| Replays / archive | `archiveGame()` uses the roster (`GameServer.ts:1137`); `archive()` is a no-op (ADR-104) | follows the roster; not shown today |
| Local win record | `ClientGameRunner.ts:464` uses the typed `playerName` (record only) | no; not shown |
| Global leaderboard | none exists | n/a |
| Feedback / telemetry | own name, not shown to other players (0307 N2) | out of scope |

## 4. Unknown 4 — guests and degraded sessions

| Session | Name today | Under (a) | Under (c) |
|---|---|---|---|
| **Guest** (not logged in to Yandex) | `localStorage` or `Anon####` (`UsernameInput.ts:143-162`); no Yandex id, so no resolve (`FlashistFacade.ts:1338-1357`) | unchanged; cannot hold an approved name | unchanged |
| **Logged-in citizen, profile read OK** | Yandex name | approved name, substituted by the server | field prefilled with the approved name |
| **Logged-in, SDK degraded (no SDK, `0318`)** | `localStorage` name; join with `yandexPlayerId: null` | typed name. **If the SDK recovers before start**, `update_identity` triggers a resolve (`GameServer.ts:424-436`) and the substitution can still apply. After start the roster is frozen. | `localStorage` holds whatever the last good load saved. That is the approved name, **if** (c) also writes it there |
| **Profile read or resolve slow / failed** | Yandex name | typed name for that match (the same shape as 0068's *"slow lookup freezes as non-citizen"*). **Combined with (c) the typed name is already the approved string, so only a mark (if any) is missing.** | prefill falls back to the Yandex name |
| **Approved name cleared by the operator (`0314`)** | the card falls back to the platform name | typed / Yandex name from the next join; a running match keeps its frozen roster | prefill falls back from the next load |

Fail-soft in every row: a missing or failed lookup **never blocks or delays a join** (0068's constraint,
kept).

---

## 5. The approaches

### (a) Server substitutes the approved name through the ADR-103 funnel — **recommended**

**How it works.** The resolve response gains an optional `displayName: string | null`
(`CreditContract.ts:76-79`, `.optional()` so both deploy orders parse). The internal resolve route returns
`resolved.profile.display_name` (`Routes.ts:780-782`). `startProfileResolve` stores it on
`Client.approvedName` (`GameServer.ts:1380-1391`), carried across a reconnect like `isCitizen`
(`:277-279`). `gameInfo()` and `start()` send `approvedName ?? username` (`:1038`, `:539`), after
re-checking it with `JoinUsernameSchema` (see §2 point 1). No client change is needed for any multiplayer
surface (§3).

- **Impersonation risk.**
  - *String level:* **unchanged from today.** Anyone can still type a citizen's approved string, or a
    look-alike. A non-citizen who does so shows **without ★** where the ★ is drawn (leaderboard, player
    panel, lobby lists). The ★ is **not** drawn on map labels, and **a citizen typing another citizen's
    name gets ★ too**.
  - *Bound level* (the server substitutes the holder's name): only the holder, **or anyone who sends the
    holder's Yandex id in the join message**, until `0267`. When `0267` makes `getCreditableYandexId`
    verify, this closes with **no change to (a)'s code** (ADR-103 rule 2).
  - *Optional mark* (question D5): a server-set `hasApprovedName` flag, drawn next to the name. It makes
    the bound name distinguishable from a typed copy **and** from a look-alike, because it is tied to the
    identity, not the string.
- **Prerequisites.** `0307`: **hard, satisfied** (textContent, join rule). `0267`: **soft.** (a) works at
  ADR-103 trust level without it; `0267` is what stops the forged-id case. `0308`: **soft** (re-check at
  substitution). `0250`: **none.** `0250` is about paid state reaching the owner's own browser, not about
  what the game server shows others.
- **Surfaces touched.** Server and contract only: `CreditContract.ts`, `Routes.ts` (resolve),
  `ProfileApiClient.ts` (none if the schema carries it), `Client.ts`, `GameServer.ts`. The mark adds
  `Schemas.ts` `PlayerSchema`/`ClientInfo` plus Leaderboard, PlayerPanel, NameLayer and the two lobby
  modals.
- **Cost.** ~1.5–2.5 days with tests (contract skew both ways, substitution, re-check fallback,
  reconnect carry, resolve-after-start ignored). Mark: +1–2 days. **Reversible:** remove one field and one
  `??`.
- **Risks.** (1) Frozen at start: a slow resolve means the typed name for that match. (2) The profanity
  filter may shadow-rename an approved name for others (§2 point 2). (3) The approved name then travels on
  unauthenticated `GET /api/game/:id` with clientID. That is the same exposure as usernames today, but an
  approved name is a **stable, unique handle**, so it makes one citizen easier to follow across lobbies.
  0068 R3 accepted the same kind of exposure for the flag. (4) A forger and the victim in one match would
  **both** show the approved name.

### (b) Client-supplied name, reserved: allowed to equal an approved name only for a proven owner

**How it works.** The client keeps choosing its name. On every join the game server asks the profile
server whether the typed name (case-insensitive) is someone's approved name. If it is, the joiner must
prove they own it, for example by forwarding their profile Bearer token, which the profile server
confirms (the `0250`-style authenticated read). Otherwise the server refuses the name or renames the
joiner.

- **Impersonation risk.** Blocks exact (case-folded) copies by non-owners, which is **the only approach
  that stops string-level copying**. **Does not stop:** look-alikes, invisible-space variants and
  `lower()`-folding tricks (0307 residual Q2: the check is `lower()` with no normalization), and **anyone
  who mints a `vfy:false` token for the holder's id**. Until `0267` that token is exactly as forgeable as
  the asserted id in (a). **So before `0267`, (b)'s ownership proof adds zero trust over (a).**
- **Prerequisites.** `0267`: **hard** for any trust gain (or `0250`, if `0250`'s phase 1 builds a
  verified session). `0307`: hard, satisfied. `0308`: **hard in practice.** A string-matching reservation
  is only as good as the normalization, which is `0308`'s decision, and the look-alike residual would have
  to be re-decided.
- **Surfaces touched.** Everything in (a), plus: a new internal "who holds this name" endpoint, the
  Bearer token travelling client → game server (a new place a credential lives. Today it never leaves
  `ProfileSession.ts`, which is deliberately memory-only: `:9-14`), the join path (`Worker.ts`),
  refusal/rename UX, and en+ru texts.
- **Cost.** ~4–6 days plus the `0267` dependency. **A lookup on every join by every player, guests
  included,** on the path 0068 said must never be delayed. That forces a choice between fail-open
  (reservation silently off during a profile outage) and fail-closed (joins stall or rename during an
  outage). **Product side-effect:** a long-time free player whose ordinary name later gets approved for a
  citizen is renamed or refused. That squats their name.
- **Reversibility.** Medium: a join-path behaviour players will notice when it is removed.

### (c) Prefill (and optionally lock) the start-screen field with the approved name

**How it works.** `getStoredUsername()` prefers the approved name from the profile view
(`PlayerProfileView.ts:100` already computes `display_name ?? platform name`) over the Yandex name. It
writes the result to `localStorage` so a degraded load still has it. Everything downstream is unchanged:
it is just the name the client sends.

- **Impersonation risk.** **No trust gain at all.** Anyone can type anything, exactly as today. It makes
  the honest citizen's experience right ("my approved name is my name") in multiplayer and single-player.
- **Prerequisites.** None hard. `0308` soft (the rule the field shows).
- **Surfaces touched.** `UsernameInput.ts`, possibly `PlayerProfileView`/`ProfileSession` for timing
  (the field loads in `connectedCallback`, and the profile read may land later), en+ru hint text if it is
  locked.
- **Cost.** ~0.5–1 day. Fully reversible.
- **Risks.** A timing race: the field fills before the profile read returns, so the Yandex name is shown,
  then must be swapped. The lock is a product call (question D4).

## 6. Comparison

| | (a) server substitution | (b) reservation + proof | (c) prefill |
|---|---|---|---|
| Stops someone typing the same string | no (optional mark tells them apart) | **exact copies only**; not look-alikes | no |
| Stops a forged-Yandex-id impersonation | only after `0267` (no code change then) | only after `0267` | no |
| Trust gain before `0267` | the bound name is identity-tied at ADR-103 level (as the 0068 icon is) | **none over (a)** | none |
| Hard prerequisites | `0307` (done) | `0267` (or a verified `0250`), `0307`, `0308` in practice | none |
| Delays a join | never (fail-soft, like 0068) | lookup on every join; outage dilemma | never |
| Reaches every multiplayer surface | yes, from 2 server points | yes | yes (it is the sent name) |
| Covers single-player / the start field | no | no | yes |
| Cost | ~1.5–2.5 d (+1–2 d mark) | ~4–6 d + `0267` | ~0.5–1 d |
| Reversibility | high | medium | high |
| Side-effects on others | none | renames or refuses innocent name-holders | none |

## 7. Recommendation

**Ship (c) first, then (a). Do not build (b).**

- **Why (a):** it rides the exact seam 0068 already uses (one extra field on a response the server
  already fetches at join). It reaches every multiplayer surface from two lines, never delays a join, and
  when `0267` lands it becomes identity-verified with **no change to its own code**. (b) costs 2–3× as
  much, and until `0267` it proves nothing (a) does not. After `0267` its only extra is blocking exact
  copies, which look-alikes defeat anyway.
- **Why (c) alongside:** it covers what (a) cannot (the start field and single-player), and it turns
  (a)'s failure mode (slow resolve → typed name) into a near-invisible one, because the typed name already
  *is* the approved name.
- **Main tradeoff accepted:** **string-level impersonation stays possible**, and **identity-level
  impersonation stays possible until `0267`.**
- **Profanity filter (design default for B2):** keep `fixProfaneUsername` on approved names (it is
  deterministic defense in depth). Add the matcher's verdict to the moderator's Telegram message, so a
  flagged name is visible **before** approval. This is a recommendation for the brief, not an owner
  question.

### Can one player appear under another citizen's approved name? (recommended approach, plainly)

**Yes, in two ways:**

1. **By typing it.** Any player (guest, non-citizen or citizen) can type the same string, or a look-alike,
   and play under it, exactly as today. Under (a) they do **not** get the server's binding. A non-citizen
   copy shows without ★ on the leaderboard, player panel and lobby lists, but looks **identical on map
   labels**. A citizen's copy gets ★ too. Only the optional mark (D5) would tell a bound name from a
   typed copy on every surface. This lasts **indefinitely** under (a) and (c). Only (b) would block exact
   copies, and nothing proposed blocks look-alikes.
2. **By sending the holder's Yandex id** in the join message (a modified client). The server then
   substitutes the holder's approved name for them, with the mark if D5 adds one. This works **until
   `0267` ships verified identity** into `getCreditableYandexId`, and only for someone who knows the
   holder's Yandex id. No path in this repo shows it to other players. Yandex-side exposure is not
   verified.

With (c) alone, only way 1 applies. The server never binds anything.

## 8. Implementation briefs it would split into (**not filed** — the producer files them after the owner rules)

| # | Brief | Depends on | Notes |
|---|---|---|---|
| **B1** | *Prefill the start-screen name with the citizen's approved name* (c) | owner ruling D1 (+ D4 if locked) | `UsernameInput.ts` order: approved → Yandex → `localStorage` → `Anon`; write to `localStorage`; handle the profile-read timing race; tests. Optional lock + en/ru hint per D4. |
| **B2** | *Game server shows the approved name in multiplayer* (a) | owner rulings D2, D3; `0307` (done). Soft: `0308`, `0267`. **Recommended after B1** (graceful fallback), not hard-blocked by it | Optional `displayName` on `PlayerResolveResponseSchema` (both deploy orders); resolve route returns it; `Client.approvedName` + reconnect carry; substitution in `gameInfo()`/`start()` with a `JoinUsernameSchema` re-check and fallback; a resolve that finishes after start is ignored; moderator message shows the profanity-matcher verdict. **Record an ADR** (architect + owner) that approved names in matches run at ADR-103 trust level until `0267`. |
| **B3** | *Mark for a bound approved name* (optional) | D5 = yes; B2 | Server-set `hasApprovedName` on `PlayerSchema`/`ClientInfo` (`.default(false).catch(false)`, like `isCitizen` at `Schemas.ts:500`); draw it where ★ is drawn plus map labels. |
| — | Existing **`0316`** (approve-inbox wording) | B2 | No new brief. Update the wording when B2 ships ("shown in matches from your next game"). |
| — | Existing **`0267`** | — | No change to B2 when it lands. Note for `0267`: the key sits on the profile box, so verifying at the resolve call (the game server forwards the signed payload) keeps the key on one box. That is `0267`'s decision, not this report's. |

(b) is deliberately **not** listed. If the owner later wants exact-copy blocking, it can be added on top
of B2 after `0267` + `0308`.

## 9. Existing decisions this touches

- **ADR-103:** (a) adds a third consumer of the funnel (after credit/resolve and 0302's gate). It goes
  **through** `getCreditableYandexId`, so it is not a funnel bypass. But showing a player-chosen identity
  to others is new scope. ⇒ New ADR after D3.
- **0307 residual Q2 (look-alikes), re-raise condition met.** Its "re-raise only if" is *"approved names
  start being shown to other players — in game"*. B2 does exactly that ⇒ question D6.
- **0068 residuals:** "freshness bounded by last join" and "slow lookup freezes" carry over unchanged.
  R3 (lobby poll unauthenticated) widens from a flag to a stable name (§5(a) risk 3).
- **0302:** unaffected. The private-lobby gate reads `isCitizen`, not the name.
- **`0250`:** not a prerequisite for (a) or (c). It becomes relevant only if the owner picks (b).

## 10. Not verified

- Whether Yandex exposes one player's unique id to other players, and whether signed player data uses
  the payments key (both `0267`).
- Whether the profanity matcher flags any realistic Russian names (not measured).
- Timing of the profile read versus `UsernameInput.connectedCallback` on a real Yandex load (B1 must
  measure it).
- Line numbers are against an uncommitted tree.

## 11. Owner decisions needed

These go back through the lead as structured questions (full text in the hand-off). **D1** is the brief's
open question 1 and **D2** is the choice of approach. D3–D6 follow from D2 = (a).

*Wiki:* once the owner has ruled, `fkit-wiki` should ingest this report. The architect does not write the
wiki.
