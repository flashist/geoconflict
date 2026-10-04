# Yandex build: the invite copies the lobby code through the SDK clipboard, and `#join=` links stop working there

## ID
0380

> ℹ️ **ID allocation, checked 2026-10-04 before filing.** Highest task folder across `backlog/`, `done/` and
> `cancelled/`: `0379`. `0380`–`0383` allocated in this run, in dependency order.

## Sprint
Sprint 7

> 📌 **2026-10-04 — was ~~Backlog~~; moved to [Sprint 7](../../../sprints/plan-sprint-7.md).** OWNER RULING given
> live 2026-10-04 via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned
> `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Owner's choice, verbatim: *"Yes: all 5
> ready ones"* — option text: *"0354, 0377, 0380 plus the two small fixes 0353 (error every second) and 0374 (joining
> mark). More work this week."* The [Backlog board](../../../sprints/backlog.md) row is kept as `➡️ Moved`. Status unchanged
> (`🔲 Backlog`); no folder moved, no mover run.

## Priority
38

> 📌 **2026-10-04 — was ~~Unscheduled~~; rank 38 on the Sprint 7 board is the PRODUCER's order, NOT owner-ruled.**
> The owner named the five tasks, not ranks. Appended after that board's highest (36, `0373`), never inserted
> (ADR-035). Order `0354` → `0380` → `0377` → `0353` → `0374`; open for owner confirmation.

> ~~📌 No sprint was named, so this is on the Backlog board. Placing it in a sprint is the owner's call.~~
> ✅ **Resolved 2026-10-04** — the owner placed it on Sprint 7 (ruling *"Yes: all 5 ready ones"*, see `## Sprint`).

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

**This task is "the code part"** — option B of the
[architect's evaluation](../../../knowledge-base/reports/2026-10-03-eval-yandex-invite-links.md) §4. The link part is
[`0382`](../0382-yandex-build-invite-link-via-the-sdk-portal-url-and-payload-consumed-once/brief.md), which builds on
this one. **ADR: [ADR-119](../../../knowledge-base/decisions/adr-119-yandex-invites-sdk-portal-link-plus-code.md)** *(accepted — "Accept as written", OWNER RULING 2026-10-04, given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`; ⛔ not producer precedent)*. *(Was: "ADR pending (architect, 2026-10-04)".)*

**Why it is split from the link.** This piece ships and is checked alone, and it removes the rules problem by itself:
after it, nothing on the Yandex build copies or honours a link to our own site. The link (`0382`) is additive and
carries every undocumented platform behaviour. If `0382` stalls, this is still a correct, compliant end state.

**The problem.** On the Yandex build the host's invite copies
`https://geoconflict.ru/yandex-games_iframe.html#join=<lobby id>` — our own site, outside the Yandex portal
(`HostLobbyModal.copyToClipboard()`, ~line 990). Yandex rules **8.4.2** and **8.4.4** forbid links and redirects off
Yandex Games. The owner ruled on 2026-10-03 that this must not reach players (`0199` *Context*). And `Main.handleHash()`
(~line 725) still opens the join window for any `#join=` link, whatever the flags say.

**Facts from the owner's live probe, 2026-10-04** (OWNER-REPORTED, relayed by `fkit-lead`; full record in
[`0199/worklog.md`](../../done/0199-yandex-invite-link-leaves-portal-iframe/worklog.md)):

- `ysdk.clipboard.writeText` **fails from the console** with *"Document is not focused"*, and **works from a real click
  handler** (pasted fine). ⇒ **The copy must run inside the user's click.**
- `navigator.clipboard.writeText` (native) inside the iframe was **not tested**. Today's copy uses it and **swallows the
  error** (only a `console.error`, no message to the host) — so it may already fail silently in production. Unknown.

**Today's code entry already exists.** `JoinPrivateLobbyModal` has a lobby-id field, a paste button, and accepts a
pasted URL (report §3). The lobby id **is** the code: 8 characters, `[a-zA-Z0-9]`, case-sensitive
(`src/core/Schemas.ts`). The host modal shows it masked (`••••••••`) until toggled.

**Exposure today:** private lobbies are hidden in production (OWNER-ATTESTED 2026-10-03, not agent-verified). Nobody
can copy today's link, so this is not an outage fix.

## What to build

1. **On the Yandex build, the invite copies the lobby code, not a URL.** Copy through `ysdk.clipboard.writeText`,
   called **directly inside the click handler** (no network wait before it). Fall back to `navigator.clipboard` if the
   SDK is not there (degraded boot) — and if both fail, tell the host plainly that the copy failed and show the code to
   copy by hand. **Never** fall back to a `geoconflict.ru` URL on the Yandex build. A small copy wrapper in
   `FlashistFacade` (report §4 B: `copyText()`) is the suggested seam; `0382` reuses it.
2. **The code stays available** to the host, with a short hint along the lines of "send this code to a friend; they
   enter it under Join". ✅ **It stays MASKED (`••••••••`) with today's show toggle** — and **copying works without
   revealing it** (the copy does not require or trigger the toggle). *("Keep hidden + show button", OWNER RULING 2026-10-04, given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`; ⛔ not producer precedent. See
   question (c) below.)*
3. **On the Yandex build, `#join=` stops opening the join window.** Gate the `#join=` branch of `Main.handleHash()` on
   the Yandex platform flag. **The standalone build keeps the link and `#join=` exactly as today** — Yandex rules do
   not apply there.
4. **Success and failure feedback.** The host sees the existing "copied" tick on success and a visible message on
   failure — not just a `console.error`.
5. **Localization:** every new string in both `resources/lang/en.json` and `ru.json`.
6. **Tests:** the Yandex/standalone split of the copy text; `#join=` ignored on Yandex and honoured on standalone; the
   failure path shows a message.

**Do not:**
- Touch `location.search`, or `handleHash()`'s `strip()` behaviour for other hashes (the `sdk` query parameter trap,
  `0331`/`0337`).
- Change the code format (length, case, alphabet) — that touches `src/core` and the server; see open question (b).
- Build the portal link — that is `0382`.

**Size (report §4 B):** ~40–80 lines + tests.

## Verification steps

1. Unit tests: on the Yandex build the copied text is the bare code, and copying leaves the code masked (ruling (c)); on standalone it is the current link form
   (unchanged). The SDK clipboard is called first on Yandex; native is the fallback; a double failure shows a message.
2. Unit test: `#join=<valid id>` opens the join window on standalone and does **not** on the Yandex build.
3. `git diff` shows no change to how `location.search` is handled, and no `src/core/` or `src/server/` change.
4. `en.json` and `ru.json` both carry every new key.
5. `npm test`, `npm run lint`, `npx tsc --noEmit` green.
6. **Live check in production is a separate task:**
   [`0381`](../0381-verify-0380-in-production-the-yandex-invite-copies-the-code-and-old-join-links-are-ignored/brief.md)
   (build/verify split, owner rule 2026-09-29). Do not hold this task open for it.

## Notes

- **Depends on:** nothing
- **Blocks:** [`0381`](../0381-verify-0380-in-production-the-yandex-invite-copies-the-code-and-old-join-links-are-ignored/brief.md), [`0382`](../0382-yandex-build-invite-link-via-the-sdk-portal-url-and-payload-consumed-once/brief.md)
- 🚦 **Release gate:** half of item 6 in
  [`0354`'s *Release gate*](../0354-show-private-lobbies-to-testers-by-default-and-add-an-everyone-flag/brief.md) —
  the item is met by the link + code build (`0380` + `0382`).
- **Open owner questions — the coder puts these in the plan; do not decide them:**
  - **(b) Code friendliness.** The code is 8 characters, case-sensitive, and easy to misread when dictated (`0/O`,
    `l/I/1`). Keep it as is, or make it friendlier (shorter, one case, no look-alike letters)? Changing it touches
    `src/core` (`generateID`) and the server, so it would be **its own task**, not this one. This task ships the
    current format either way.
  - ~~**(c) producer-raised:** should the code show **unmasked by default** on the host window, or keep today's
    `••••••••` with a toggle? The owner's option says *"the code is still shown"*; the mask may exist for streamers.~~
    ✅ **RULED (c): "Keep hidden + show button"** — OWNER RULING 2026-10-04, given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`; ⛔ not producer precedent. The code stays masked with the show toggle;
    copying works without revealing it. Built in *What to build* step 2.
- **Producer's note, not checked:** the Join window's paste button uses `navigator.clipboard.readText`, which may not
  work inside the iframe (the SDK has no clipboard read). Typing the code still works. `0381` records what happens.
- **Related:** [`0199`](../../done/0199-yandex-invite-link-leaves-portal-iframe/brief.md) (decision task; probe in its
  worklog), [`0198`](../../done/0198-private-lobby-start-url-double-slash/brief.md) (fixed the path on the same line),
  [`0376`](../0376-verify-private-lobbies-in-production-a-citizen-hosts-inside-yandex-and-a-friend-joins/brief.md)
  (the production lobby test — joins by code inside Yandex).
- **Privacy:** no app id, catalog URL, player id, host or secret in any artifact.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
