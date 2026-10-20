# Verify 0454: on the live game a wrong private-lobby code shows "Lobby not found" (EN + RU), and no archive `/game/<code>` request is made

## ID
0461

> ℹ️ **ID allocation, checked 2026-10-14 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/`
> (working tree) was `0460`. `0461`: no task folder, no reference in `ai-agents/tasks/`, `ai-agents/sprints/` or
> `.claude/`, and no `tasks/*/0461*` path in any branch's history.

## Sprint
Backlog

> 📌 **Goes to the TOP of Sprint 9 when Sprint 9 is planned.** This is the standing build/verify-split rule (OWNER
> RULING 2026-09-29: if proof needs a deploy + an owner check, close the build task and file a verify task at the top
> of the NEXT sprint; it must not block the current sprint's deploy), applied as written. It is also recorded in
> `0454`'s `plan.md` § *Owner decisions* (2026-10-14, live `AskUserQuestion` in the `fkit lead` session, relayed by
> `fkit-lead` to a spawned `fkit-producer` with no owner channel, ADR-021/037); ⛔ **not producer precedent.**
>
> It sits on the Backlog board only because **no Sprint 9 board exists yet**; the producer did not create one — same
> placement as `0460`. Whoever plans Sprint 9 must pull this task in near its top, next to `0460`.

## Priority
—

(Backlog board, unranked by design. On the rule above, it goes to the top of Sprint 9.)

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-producer — ⚠️ **EXECUTED BY THE OWNER (human).** It needs a deploy of `0454`'s code and a check in the owner's
own browser on the live game.

## Context

**In plain terms.** Before `0454`, a player who typed a lobby code that does not exist saw a generic "An error
occurred" message in production. The cause: after the game server said "no such lobby", the client also asked a
games archive that is switched off, got the site's HTML page back, failed to read it, and showed the error. `0454`
makes the client skip that archive lookup while archiving is off (`archiveEnabled()`, a hard `false`), so the
player sees the existing "Lobby not found" text instead.

`0454` is proven by tests and by a **local** browser check only (Russian and English text shown; for the made-up code
the only request was the game server's `/exists` check — no archive `/game/<code>`, no `/commit.txt`; a live code
still joined). It has **not** been seen on the live game. This task is that one check.

See [`0454`](../../done/0454-private-lobbies-show-lobby-not-found-when-a-player-enters-a-wrong-code/brief.md) and its
`worklog.md` / `review.md`.

**Prerequisite:** `0454`'s change is deployed to the live game. Committed ≠ deployed (owner deploys in weekend slots).

## What to build

Nothing. Verification only.

1. **Open the live game** in the owner's browser, with the browser's developer tools open on the **Network** tab.
2. **Russian (default):** open "join private lobby", type a made-up code in a valid format (one that is not a real
   lobby), join.
3. **English:** switch the game language to English and repeat step 2.
4. **Optional — the owner's call:** join a real private lobby by its code once, to confirm normal joining still works.
5. **Record** the result in this task's `worklog.md`: date, game version, pass/fail per check, and the message text
   seen. ⛔ **No hosts, URLs, domains or lobby codes written** — describe requests by their path shape only
   (e.g. "`/w<N>/api/game/<code>/exists`").

## Verification steps

1. **Pass (RU):** the message reads *"Лобби не найдено. Пожалуйста, проверьте правильность ID и попробуйте ещё раз."*
   — not *"Произошла ошибка…"*.
2. **Pass (EN):** the message reads *"Lobby not found. Please check the ID and try again."* — not *"An error
   occurred…"*.
3. **Pass (network):** for the made-up code there is **no** archive request of the shape `<api base>/game/<code>`
   and **no** `/commit.txt` request.
   ⚠️ **Expected, not a failure:** one request to the game server's `/w<N>/api/game/<code>/exists` — that is the
   normal "does this lobby exist?" check and it stays.
4. **If step 4 was run:** the real lobby joins normally.
5. Nothing written names a host, URL, domain or lobby code.

**If a check fails:** record what was seen (message text, request path shapes) and route it to the producer — a
generic error or an archive request on the live game means `0454` is not working there (or the deployed build is
older than `0454`; check the version first).

## Notes
- **Depends on:** `0454` (done, agent-closed — not owner-verified) — and a deploy of it.
- **Blocks:** nothing.
- **Related:** `0451` / `0455` — the `PrivateLobby:JoinFailed:NotFound` event a wrong code now sends together with the
  message (counting it in GameAnalytics is `0455`'s job, not this one's). `0292` — cancelled 2026-10-14 as absorbed by
  `0454`. `0030` — turns archiving back on someday; this check is valid only while `archiveEnabled()` is `false`.
- Sources: `0454` `brief.md`, `plan.md`, `worklog.md`, `review.md`; `resources/lang/en.json` / `ru.json`
  (`private_lobby.not_found` / `private_lobby.error`) — read 2026-10-14.
