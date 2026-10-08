# Worklog — 0199 (Yandex invite link leaves the portal iframe)

## 2026-10-04 — Step 0: the owner's live console probe, and the owner's build ruling

**OWNER-REPORTED, relayed by `fkit-lead`; ⛔ not producer precedent.** Recorded by a spawned `fkit-producer` with no
owner channel (ADR-021/037). The owner ran the probe himself in production on 2026-10-04, as ruled on 2026-10-03
("You run it yourself"), and reported the results to `fkit-lead`. **`fkit-lead` saw the console output for P1–P6.**
P7, P8, the round trip and the `yandex.com` result are the owner's own report to `fkit-lead`.

**Probe:** the architect's report §5
([`2026-10-03-eval-yandex-invite-links.md`](../../../knowledge-base/reports/2026-10-03-eval-yandex-invite-links.md)).
Read-only DevTools console, game-iframe context. **No deploy, no source change.**

- **Where:** production, desktop Chrome.
- **Build version:** *not stated in the relay.* The last production deploy in git history is `0.0.156`; that it was
  the build probed is the producer's inference, **not confirmed**.
- **Privacy:** URLs below are recorded as **shapes only**. The app id and full catalog URLs are deliberately not
  written anywhere.

### Results

| # | What was checked | `yandex.ru` | `yandex.com` |
|---|---|---|---|
| P1 | `environment.payload`, page opened with `?payload=probe1234` | ✅ `'probe1234'` | ✅ payload received |
| P2 | `location.search.includes("payload")` | `true` — ⚠️ see below | *not reported* |
| P3 | `typeof environment.app.id` | ✅ `'string'` | *not reported* |
| P4 | `GamesAPI.getGameByID(app.id)` | ✅ `isAvailable: true`, url shaped `https://yandex.ru/games/app/<id>` | ✅ url shaped `https://yandex.com/games/app/<id>` |
| P5 | `GamesAPI.getAllGames()` | Returns only the developer's **2 other** games, not this one. Expected; irrelevant because P4 works. | *not reported* |
| P6/P7 | `ysdk.clipboard.writeText` | From the console: ❌ `"Document is not focused"`. From a real click handler (a one-time document click listener): ✅ `"SDK copy OK"`, and the owner pasted `"probe-sdk"` successfully. | *not reported* |
| P7b | `navigator.clipboard.writeText` (native) | ⚪ **not run** | ⚪ **not run** |
| P8 | Play a match, return to the menu, re-run P1 | ⚠️ **The payload value came back.** | *not reported* |
| Round trip | P4's url + `?payload=probe5678`, opened in a fresh incognito window, then P1 | ✅ `'probe5678'` | *not reported* |

### What the results mean

- **P4 — the SDK gives the right link for each portal.** It returns this game's own catalog URL on the portal the
  player is on (`yandex.ru` → `yandex.ru/games/app/<id>`, `yandex.com` → `yandex.com/games/app/<id>`). **Nothing needs
  hardcoding** — the owner's main worry is answered. `getAllGames()` (P5) is not needed.
- **P2 — the payload ALSO lands in our iframe's own query string.** So the build must **never strip or rewrite
  `location.search`** to "clean up" the payload. Yandex's loader reads its SDK address from the iframe's `sdk` query
  parameter (the `0331`/`0337` trap). Dedupe somewhere else (`sessionStorage`).
- **P6/P7 — copy only works inside a real click.** `ysdk.clipboard.writeText` fails with "Document is not focused"
  unless it runs inside a user click. The copy must run in the click handler.
- **P8 — consume-once is MANDATORY.** After a match the payload comes back, so without consume-once the friend is
  pulled back into the join window after every match.

### Not tested

- **Mobile** (web and the Yandex app) — not run.
- **Domains other than `yandex.ru` and `yandex.com`** — not run.
- **Native clipboard** (`navigator.clipboard.writeText`) inside the iframe — not run. Whether today's copy already
  fails silently in production is therefore still unknown.
- **`yandex.com`:** only P1 and P4 were reported; P2, P3, P5, P7, P8 and the round trip were not.
- **Moderation's view** of a self-link with `payload` — not testable by a console probe. Undocumented; rule 8.4.1
  allows links built through the SDK that lead to our own games in the catalog.
  ✅ *Settled 2026-10-04 by owner judgement, not by test: the owner rules the SDK link + `payload` within 8.4.1 — see
  the "self-link" ruling below.*

### Result per the report's §5: **YES**

P1 gives the payload on `yandex.ru` **and** a second domain (`yandex.com`); P4 returns this game with a
`yandex.<tld>/games/app/<id>` URL; the round trip gives P1. ⇒ **Build A (portal invite link via the SDK + `payload`) is
viable**, with the code kept alongside (owner ruling 2026-10-03, *"Yes, always keep codes"*).

## 2026-10-04 — OWNER RULING: build the Yandex link + the code

**OWNER RULING, relayed by `fkit-lead`; ⛔ not producer precedent.** Given live on 2026-10-04 via `AskUserQuestion`
in the `fkit lead` session. Question as asked: *"The test passed. What should we build for private-lobby invites?"*
The owner picked **"Yandex link + code"**, whose option text was, verbatim:

> *"Invite button copies a proper Yandex Games link (via the SDK, works on every portal) AND the code is still
> shown. ~150–250 lines + the code part. Fixes the rule problem; easiest for friends."*

**Filed from this ruling (2026-10-04, Backlog board, unscheduled):**

| Task | What | Kind |
|---|---|---|
| [`0380`](../0380-yandex-build-invites-copy-the-lobby-code-and-stop-honouring-join-links/brief.md) | Code path: on the Yandex build the invite copies the lobby code through the SDK clipboard; `#join=` stops working there | build |
| [`0381`](../../backlog/0381-verify-0380-in-production-the-yandex-invite-copies-the-code-and-old-join-links-are-ignored/brief.md) | Owner checks `0380` in production | verify |
| [`0382`](../../done/0382-yandex-build-invite-link-via-the-sdk-portal-url-and-payload-consumed-once/brief.md) | Yandex link: `getGameByID` + `payload`, read at startup and on late SDK recovery, consumed once | build |
| [`0383`](../../backlog/0383-verify-0382-in-production-a-yandex-invite-link-opens-the-join-window-once-on-the-friends-portal/brief.md) | Owner checks `0382` in production | verify |

**ADR:** [ADR-119](../../../knowledge-base/decisions/adr-119-yandex-invites-sdk-portal-link-plus-code.md) — ✅ accepted, "Accept as written" (OWNER RULING 2026-10-04, given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`; ⛔ not producer precedent). *(Was: "pending (architect, 2026-10-04)".)*

## 2026-10-04 — further OWNER RULINGS on the build questions

**OWNER RULING 2026-10-04, given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`; ⛔ not producer precedent.**

- **(a) "Yes, link always lets them in"** — an invite link lets a friend join even if they cannot see the lobby
  buttons (not a tester). Recorded in `0382` and `0383`.
- **(c) "Keep hidden + show button"** — the host's code stays masked with the show toggle; copying works without
  revealing it. Recorded in `0380`.
- **"Prod checks must pass too"** — release-gate item 6 is met only when `0380` + `0382` are built **and** `0381` +
  `0383` have passed in production. Recorded in `0354`.
- **Still open, recorded, not yet asked:** (b) code friendliness (plan time; its own task if wanted); how the host
  sees the lobby buttons in production for `0381`/`0383` (likely by deploying `0354` first); ~~moderation's view of a
  self-link — **owner action: ask Yandex support before release.**~~ *(dropped — see below)*

## 2026-10-04 — OWNER RULING: no Yandex support question about the self-link

**OWNER RULING 2026-10-04, given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`; ⛔ not producer precedent.** Owner's words first: *"we don't need their approval, we're not violating anything with it"*. Asked *"Drop the 'ask Yandex support about the self-link' step?"*, the owner
picked **"Yes, drop it"**.

- **Meaning:** the owner judges the SDK-built link + `payload` to be within rule **8.4.1**. No support question is
  needed, before release or otherwise.
- **Accepted grey area:** 8.4.1 is worded for links to *other* games; a link to this same game is not named. The owner
  accepts that.
- Recorded (struck/annotated, not deleted) in `0199` and `0382`. `0380`, `0383` and `0354` never mentioned it.
- ⚠️ **Still a reopen trigger:** an **actual** Yandex moderation/support rejection of a payload self-link would reopen
  this, per ADR-119's *Re-raise only if*. The absence of prior approval does not.
- *Re-checked 2026-10-04 at close:* `0380`, `0381`, `0383` and `0354` carry no "ask Yandex support" step and no
  moderation open question; `0382` and `0199` are struck/annotated.

## 2026-10-04 — OWNER RULING: verification step 2 waived; close

**OWNER RULING 2026-10-04, given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`; ⛔ not
producer precedent.** Asked *"0199: skip the never-run test of the OLD invite link opened outside Yandex (it's being
removed anyway), so 0199 can be closed?"*, the owner picked **"Yes, skip it and close 0199"**.

- **Verification step 2 (off-portal measurement) — WAIVED, never run.** Moot: the off-portal link is ruled out and is
  being replaced on the Yandex build (`0380`/`0382`). **Unknown, and stays unknown:** what the Yandex build does when
  opened outside the portal.
- **Step 5's wiki update** — a wiki ingest/sync is routed to `fkit-wiki` by `fkit-lead` right after this close.
  **Follow-up, not a blocker.**
- Steps 1, 3, 4, 5 (ADR), 6, 8 met — see the brief's *Verification steps* annotations. Step 7: no source change
  recorded; not independently proven (shared bulk commits).
- Closed via `/fkit-task-done` by a **spawned** `fkit-producer` — `✅ Done (agent-closed — not owner-verified)`.
