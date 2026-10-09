# Worklog — 0383 Verify 0382 in production: a Yandex invite link opens the join window once

## Run 1 — 2026-10-09 (reported ~12:00Z), run together with `0420` item 1

- **Version:** game `0.0.161`.
- **Who ran it:** the owner. Results relayed by the coordinating Claude Code session.
- **Host:** paid account (tester) on the computer, Chrome, Yandex Games on `yandex.ru`; it sees the lobby buttons under
  the Приватная tab.
- **Friend:** the owner's non-citizen login on the owner's **phone**, **not a tester** (no tester marker on the phone).

| Step | Result | Evidence |
|---|---|---|
| 1 — copy the link on `yandex.ru`: shape `https://yandex.ru/games/app/<id>?payload=<code>` | **pass** | owner, verbatim: *"Part B: all good"* (the step given included checking this shape) |
| 2 — host on `yandex.com`: the link starts `https://yandex.com/games/app/` | **pass** (2026-10-09, ~12:15Z) | owner checked the copied link's shape: `https://yandex.com/games/app/<id>?payload=<code>`; owner, verbatim: *"the link is correct and is for the yandex.com domain"* (shape only — the actual link is not recorded) |
| 3 — a non-tester friend opens the link, lands inside Yandex Games, the Join window opens with the code; the host lists the friend | **pass** — friend on a phone | same |
| 4 — friend leaves the match, returns to the menu: Join does **not** reopen | **pass** | same |
| 5 — a new lobby + new link opens Join again in the same friend tab | **not recorded** — this was given as optional, and "all good" did not say whether it was run | — |
| 6 — optional: mobile | **partly run** — friend side on a phone (browser or Yandex app not recorded); host side on the computer | — |
| 6 — optional: third domain, slow boot | **not run** | — |

ℹ️ Seen by the owner: opening the **same** link again after leaving the running match put the friend **back into that
match**, with a fast-forward replay to catch up. Owner, verbatim: *"the player joins the private lobby again and sees
the "fast forward" history of the match, to catch up with the host"*. Recorded as an observation, not a fail.

### Result against the verification steps
- Steps 1, 3 and 4 **pass**, step 3 with a friend who is **not a tester** (verification step 2).
- Step 2 **passes** (verification step 3).
- Mobile **partly run** (friend side on a phone); third domain and slow boot **not run** (verification step 4).
- Step 5 (new invite, same friend tab) **not recorded** — not in the verification steps' required list.
- No failures, so no new task (verification step 5). No id, app id, full link, host or credential recorded here
  (verification step 6).
