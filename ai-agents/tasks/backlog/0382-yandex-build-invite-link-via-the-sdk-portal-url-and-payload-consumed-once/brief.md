# Yandex build: the invite copies the game's own Yandex Games link (from the SDK) with the lobby code as `payload`, opened once by the friend

## ID
0382

## Sprint
Backlog

## Priority
Unscheduled

> 📌 No sprint was named, so this is on the Backlog board. Placing it in a sprint is the owner's call.

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**OWNER RULING, relayed by `fkit-lead`; ⛔ not producer precedent.** Filed 2026-10-04 by a spawned `fkit-producer`
with no owner channel (ADR-021/037), on an owner ruling given live via `AskUserQuestion` in the `fkit lead` session.
Question: *"The test passed. What should we build for private-lobby invites?"* The owner picked **"Yandex link +
code"**, verbatim:

> *"Invite button copies a proper Yandex Games link (via the SDK, works on every portal) AND the code is still shown.
> ~150–250 lines + the code part. Fixes the rule problem; easiest for friends."*

**This task is the link** — option A of the
[architect's evaluation](../../../knowledge-base/reports/2026-10-03-eval-yandex-invite-links.md) §4. It builds on
[`0380`](../0380-yandex-build-invites-copy-the-lobby-code-and-stop-honouring-join-links/brief.md) (the code part:
SDK copy, code shown, `#join=` off on Yandex). **ADR: [ADR-119](../../../knowledge-base/decisions/adr-119-yandex-invites-sdk-portal-link-plus-code.md)** *(accepted — "Accept as written", OWNER RULING 2026-10-04, given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`; ⛔ not producer precedent)*. *(Was: "ADR pending (architect, 2026-10-04)".)*

### What the owner's live probe proved (2026-10-04)

OWNER-REPORTED, relayed by `fkit-lead`; `fkit-lead` saw the console output for P1–P6. Full record, URL shapes only:
[`0199/worklog.md`](../../done/0199-yandex-invite-link-leaves-portal-iframe/worklog.md). Result per report §5: **YES**.

| Fact | What it means for the build |
|---|---|
| **P1** `environment.payload` returns the `?payload=` value, on `yandex.ru` **and** `yandex.com`; round trip in a fresh incognito window works | The payload reaches our iframe game. The link works. |
| **P3/P4** `environment.app.id` is a string; `GamesAPI.getGameByID(app.id)` returns `isAvailable: true` and this game's URL **on the current portal** (`yandex.ru/games/app/<id>`, `yandex.com/games/app/<id>`) | **Nothing is hardcoded** — no app id, no domain. `getAllGames()` (P5) does **not** include this game; do not use it. |
| **P2** the payload is **also** in our iframe's own `location.search` | ⚠️ **Never strip or rewrite `location.search`** — Yandex's loader reads its SDK address from the `sdk` query parameter there (the `0331`/`0337` trap). |
| **P6/P7** `ysdk.clipboard.writeText` fails outside a user click (*"Document is not focused"*), works inside a real click | The copy must run inside the click. ⇒ The game URL must already be **fetched before the click** — awaiting `getGameByID` inside the handler risks losing the click's focus. *(Producer's reading of P6/P7 + report §4's "memoized once per page"; the coder confirms in the plan.)* |
| **P8** after a match and return to menu, **the payload comes back** | **Consume-once is MANDATORY**, or the friend is pulled back into the join window after every match. |
| **Not tested:** mobile; domains other than `.ru`/`.com`; native clipboard | `0383` covers what it can; the rest stays a known gap. |

**Rules.** Yandex rule **8.4.1** allows links built through the SDK that lead to our own games in the catalog — this
fits. ~~⚠️ **Moderation's view of a self-link with `payload`, shared by clipboard, is undocumented** (report §2.2 item 9);
only Yandex support or a moderation pass can confirm. Not a blocker; a known risk.~~
✅ **Settled — OWNER RULING 2026-10-04, given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`; ⛔ not producer precedent.** Owner's words: *"we don't need their approval, we're not violating anything with it"*. Asked *"Drop the 'ask Yandex support about the self-link' step?"*, the
owner picked **"Yes, drop it"**: the owner judges the SDK link + `payload` within 8.4.1. The grey area (8.4.1 is
worded for *other* games) is **accepted**. No support question, no release step. ⚠️ An **actual** Yandex
moderation/support rejection of a payload self-link would still reopen it, per ADR-119's *Re-raise only if*.

## What to build

1. **Get this game's portal URL from the SDK.** `GamesAPI.getGameByID(Number(environment.app.id))`, **memoized once per
   page**, fetched **before** the host taps invite (e.g. when the SDK is ready or the host window opens — the plan
   picks). If it returns `isAvailable: false`, errors, or the SDK is not there: **copy the code only** (`0380`'s path).
   **Never** a `geoconflict.ru` URL, and **never** a self-built `yandex.<tld>/games/app/<id>` (the hardcoded shape the
   owner ruled out).
2. **Build the invite link with the `URL` API**: the SDK's game URL with `payload=<lobby id>` set as a search
   parameter. Never string concatenation — the SDK URL may already carry a query.
3. **The host's invite button copies that link** through `0380`'s copy wrapper, inside the click. **The code stays
   shown** next to it, as `0380` left it.
4. **Read the payload on the friend's side.** After platform init, read `environment.payload`; if it is a valid lobby
   id (the `ID` schema), open the join window — the same `joinModal.open(id)` path `#join=` used. ✅ **This happens
   whatever the private-lobby flags say** — a friend who cannot see the lobby buttons (not a tester) still gets the
   Join window *(question (a), "Yes, link always lets them in", OWNER RULING 2026-10-04, given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`; ⛔ not producer precedent)*. Read it **at startup
   and again on late SDK recovery** (a boot that missed the 5 s deadline and recovered later — `FlashistFacade`'s
   late-recovery path), or a friend on a slow boot silently lands on the menu.
5. **Consume once.** Record the consumed payload in `sessionStorage` and skip it if seen again, so the post-match
   reload does not re-open the join window (P8). A **different** payload (a new invite) must still open. **Do not**
   touch `location.search` to clear it.
6. **Small, testable seams** (report §4 A suggests): `FlashistFacade` wrappers (`getPortalGameUrl()`,
   `getInvitePayload()`), and a small `src/client/InvitePayload.ts` for parse + validate + consume-once.
7. **Localization:** any new string in both `en.json` and `ru.json`.
8. **Tests:** link built with the URL API on a URL with and without an existing query; `isAvailable: false` / error /
   no SDK → code only, never a URL; payload read at startup and on late recovery; consume-once (same payload ignored
   on second read, different payload opens); an invalid payload is ignored; a valid payload opens the Join window
   with the private-lobby flags **off** for this player (ruling (a)).

**Do not:** strip or rewrite `location.search`; hardcode an app id or a domain; use `getAllGames()`; change the code
format.

**Size (report §4 A):** ~150–250 lines + tests, on top of `0380`.

## Verification steps

1. Unit tests for every case in *What to build* step 8 pass.
2. `git diff` shows no app id, no `yandex.<tld>` literal used to build a link, and no write to `location.search` or
   `history` that changes the query string.
3. `en.json` and `ru.json` both carry every new key.
4. `npm test`, `npm run lint`, `npx tsc --noEmit` green.
5. **Live check in production is a separate task:**
   [`0383`](../0383-verify-0382-in-production-a-yandex-invite-link-opens-the-join-window-once-on-the-friends-portal/brief.md)
   (build/verify split, owner rule 2026-09-29). Do not hold this task open for it.

## Notes

- **Depends on:** [`0380`](../0380-yandex-build-invites-copy-the-lobby-code-and-stop-honouring-join-links/brief.md)
- **Blocks:** [`0383`](../0383-verify-0382-in-production-a-yandex-invite-link-opens-the-join-window-once-on-the-friends-portal/brief.md)
- 🚦 **Release gate:** with `0380`, this meets item 6 in
  [`0354`'s *Release gate*](../0354-show-private-lobbies-to-testers-by-default-and-add-an-everyone-flag/brief.md).
- **Open owner questions — the coder puts these in the plan; do not decide them:**
  - ✅ **(a) Flag cohort — RULED: "Yes, link always lets them in"** (OWNER RULING 2026-10-04, given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`; ⛔ not producer precedent). An invite link opens the Join
    window for a friend who is **not** in the private-lobby flag cohort (cannot see the lobby buttons, not a tester).
    Built in *What to build* step 4; needs a test.
    ~~Should an invite link open the Join window for a friend who is **not** in the private-lobby flag cohort? …
    **Must be ruled before this task's plan is approved**.~~
  - **(b) Code friendliness** — see `0380`. Not this task's to change.
- **Plan question for the coder (not an owner ruling):** P2 showed the payload also sits in `location.search`. Reading
  it from there (read-only) could cover a degraded boot with no SDK — but that is **undocumented**, desktop-only
  evidence. `environment.payload` stays the primary source; the plan says whether to use the other as a fallback and
  why.
- ~~**Known risk:** moderation's view of a clipboard self-link (see *Context*). **Owner action before release: ask
  Yandex support** (relayed by `fkit-lead` 2026-10-04 as still open; recorded, not yet asked). Not a build blocker.~~
  ✅ **Dropped 2026-10-04 — "Yes, drop it"** (OWNER RULING relayed by `fkit-lead`; ⛔ not producer precedent; see
  *Context* → *Rules*). Accepted grey area, not an open risk.
- **Related:** [`0199`](../../done/0199-yandex-invite-link-leaves-portal-iframe/brief.md) (decision task, probe in its
  worklog), [`0331`](../../done/0331-keep-the-query-string-on-match-exit/brief.md) /
  [`0337`](../0337-verify-0331-in-production-the-sdk-query-parameter-survives-a-match-exit/brief.md) (the `sdk` query
  parameter), [`0376`](../0376-verify-private-lobbies-in-production-a-citizen-hosts-inside-yandex-and-a-friend-joins/brief.md).
- **Privacy:** no app id, catalog URL, player id, host or secret in any artifact, test fixture included (use a fake
  id).
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
