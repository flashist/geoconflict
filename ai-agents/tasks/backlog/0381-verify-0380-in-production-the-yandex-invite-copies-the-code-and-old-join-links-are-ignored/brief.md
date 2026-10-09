# Verify 0380 in production — the Yandex invite copies the code, and old `#join=` links are ignored

## ID
0381

## Sprint
Sprint 8

> ➡️ **2026-10-09 — MOVED from the Backlog board to [Sprint 8](../../../sprints/plan-sprint-8.md).** OWNER RULING typed
> by the owner in the coordinating Claude Code session (the owner's own message), relayed to a spawned `fkit-producer`
> with no owner channel (ADR-021/037); ⛔ not producer precedent. Verbatim: *"1. Yes move to the Sprint 8 and brief a
> dedicated task for the Sprint 8 to turn the private lobbies on for everybody."* Was ~~Backlog~~. The flip itself is
> task `0428`, which depends on this one.

## Priority
29

⚠️ **Priority 29 is append rank, NOT a merit ranking — flagged for owner confirmation.** ADR-035 append position, after
`0376` (27) and `0228` (28), moved by the same ruling. **On merit this belongs directly below `0376`, in the top group
with `0370`**, because it is a short owner live check (the build/verify rule puts those at the top of the next sprint)
and its remaining steps can run in the same session as `0376`'s leftovers. Not inserted there: closed rows sit below
the top, and ADR-035 never renumbers them. Was ~~Unscheduled~~.

> 📌 **Placement note.** *(History — superseded 2026-10-09 by the move above.)* No sprint was named, so this is on the Backlog board for now. The owner's standing
> build/verify rule (2026-09-29) puts a verify task **at the top of the next sprint after its build ships**, and it
> must not block the build's own sprint deploy. When
> [`0380`](../../done/0380-yandex-build-invites-copy-the-lobby-code-and-stop-honouring-join-links/brief.md) closes, that
> placement is the producer's to propose and the owner's to confirm — it is **not** made here.

## Status
🔲 Backlog

## Owner
fkit-producer — ⚠️ **EXECUTED BY THE OWNER (human).** It needs the live Yandex Games page with a host who can open
Create, a paste into another app, and the owner's eyes on the result. Any read-only check an agent can do (e.g.
reading the served bundle for the gate) may be run by an agent session (standing rule: read-only checks are run, not
handed over).

*(The field names the accountable fkit seat, because the owner vocabulary admits no person — same form as `0376`.)*

## Context

**OWNER RULING, relayed by `fkit-lead`; ⛔ not producer precedent.** Filed 2026-10-04 by a spawned `fkit-producer`
with no owner channel (ADR-021/037), on the owner's ruling **"Yandex link + code"** (live `AskUserQuestion`, `fkit
lead` session; full text in [`0199/worklog.md`](../../done/0199-yandex-invite-link-leaves-portal-iframe/worklog.md)) and the
owner's build/verify split rule (2026-09-29).

**This is the production check for `0380`** (the code part). It proves three things only a live Yandex page can:
the SDK clipboard copy works from the real invite button inside the portal iframe, the code is shown, and an old
off-Yandex `#join=` link no longer pulls anyone into a join window on the Yandex build.

**Precondition the producer cannot settle:** the host must be able to see the private-lobby row in production. Today
lobbies are hidden (OWNER-ATTESTED 2026-10-03). That needs either
[`0354`](../../done/0354-show-private-lobbies-to-testers-by-default-and-add-an-everyone-flag/brief.md) deployed (testers see
the row by default) or the owner's own console setup for a tester. **Not declared as a dependency** because the owner
may have the second route; say which was used.

**Can share a session with** [`0376`](../0376-verify-private-lobbies-in-production-a-citizen-hosts-inside-yandex-and-a-friend-joins/brief.md)
(the production lobby test), which already joins by code inside Yandex. Producer's suggestion, owner's call.

### 📌 2026-10-09 — what changed since this brief was written: which steps are superseded, which remain

*Added 2026-10-09 by a spawned `fkit-producer` (no owner channel), on the coordinating session's relay. Sources:
`ai-agents/tasks/done/0383-…/worklog.md` (run 1) and `ai-agents/tasks/backlog/0420-…/worklog.md` (items 1 and 7). The
old text below is **kept and struck**, not deleted. The folder name and title ("copies the code") are history.*

**Why.** After this brief was written, [`0382`](../../done/0382-yandex-build-invite-link-via-the-sdk-portal-url-and-payload-consumed-once/brief.md)
changed the Yandex build's invite: it now copies a **Yandex Games link built through the SDK** (the lobby code rides
in the link's payload), not the bare code. `0383` proved that live on 2026-10-09, game `0.0.161`, on both `yandex.ru`
and `yandex.com`: a **non-tester** friend on a phone opened the link, landed inside Yandex Games with the Join window
open, and the host listed them; after leaving, Join did not reopen. Invite **codes are still kept** in every case
(OWNER RULING 2026-10-03, *"Yes, always keep codes"*).

| Step | Status 2026-10-09 |
|---|---|
| Step 1 — copy; pasted text is the code only | ⛔ **Superseded by `0382`** — the invite now copies a Yandex Games link, and `0383` steps 1–2 proved that copy live. Do not run. |
| Step 2 — the code is shown to the host | ✅ **Still applies** — codes are kept. Not checked live yet. Can share a run with `0376`'s `0389` check (a). |
| Step 3 — friend joins by **entering the code** inside Yandex | ✅ **Still applies** — the code route is kept; the link route is `0383`'s and passed. Not checked live yet. The tester-friend note still holds **for this code route**: `0382` removed the need only for the link route, and a non-tester cannot see the Join button until `0428` turns the everyone-flag on — so the friend here is a tester (or the check runs after `0428`). The paste-button part is **answered**: the join window has no paste button any more (`0420` item 7 (A), pass 2026-10-09). Can share a run with `0376`'s `0389` check (b). |
| Step 4 — an old `#join=` link in a plain tab does **not** open the join window | ✅ **Still applies — the main remaining check.** Not run yet. |
| Step 5 — standalone build unchanged | ✅ **Still applies**, if the standalone build is reachable; *not run* is acceptable — say so. |
| Step 6 — mobile repeat of step 1 | ⛔ **Superseded with step 1.** Mobile for the link copy belongs to `0383` (its step 6, partly run). |

**Verification steps:** step 2 is superseded with step 1; step 4 (paste button) is answered by `0420`; steps 1, 3, 5
and 6 still apply. Release-gate item 6 in `0354` is met when **this** check passes — `0383` already passed.

## What to build

Nothing is built. Owner-run live check, desktop first.

**Preconditions:** `0380` is committed and deployed to production (weekend slot). Record the version. The host can see
the private-lobby row (record how).

**Steps:**
1. ⛔ *(Superseded 2026-10-09 by `0382` — see the 2026-10-09 note above. Do not run.)* ~~**Copy.** Inside the Yandex Games page, open Create. Tap the invite / copy control. The host sees a "copied"
   confirmation. Paste into another app: the pasted text is the **code only** — no URL, no `geoconflict.ru`.~~
2. **Code shown.** The code is visible to the host (masked or not, per `0380`'s ruled answer to question (c)).
3. **Code join.** A friend, inside the Yandex Games page, opens Join and enters the code ~~(try the paste button too,
   and record whether it works)~~ *(2026-10-09: no paste button exists any more — `0420` item 7 (A))*. The host's window lists the friend.
   📌 *2026-10-09: `0382` has shipped, which lifts the note below only for joins **by link**. For this **code** join
   the friend still has to see the Join button, so the friend is a tester until `private_lobbies_all` is on (`0428`).*
   ⚠️ *(Added 2026-10-04.)* **The friend must be a tester too.** Before this step, the friend runs
   `localStorage.setItem("geoconflict_tester","1")` in the **game iframe** context (not the outer Yandex page) and
   reloads — otherwise they do not see the Join Lobby button and cannot enter the code. **Interim limit, accepted —
   OWNER RULING 2026-10-04**, given live via `AskUserQuestion` in the `fkit lead` session during `0380` review
   (finding R3), relayed by `fkit-lead`; ⛔ not producer precedent. Lifted when
   [`0382`](../../done/0382-yandex-build-invite-link-via-the-sdk-portal-url-and-payload-consumed-once/brief.md) ships or the
   `private_lobbies_all` console flag is turned on.
4. **Old link ignored.** Open an old-form link (`…/yandex-games_iframe.html#join=<code>`) in a plain browser tab. The
   join window does **not** open.
5. **Standalone unchanged** (if the standalone build is reachable): its invite still copies a link, and `#join=` still
   opens the join window there.
6. ⛔ *(Superseded 2026-10-09 with step 1.)* ~~**Mobile** (Yandex app or mobile web), if the owner can: repeat step 1. *Not run* is acceptable — say so.~~

## Verification steps

1. `worklog.md` records the date, the version, how the host saw the row, and each step **pass**, **fail** or
   **not run**, in the owner's words. A step not run is never written as passed.
2. ⛔ *(Superseded 2026-10-09 with step 1 — the link copy is `0383`'s, passed.)* ~~Step 1 passes: the pasted text is the code alone, and the copy confirmation showed.~~
3. Step 4 passes: no join window from an old `#join=` link on the Yandex build.
4. ✅ *(Answered 2026-10-09: the Join window has no paste button — `0420` item 7 (A), pass.)* ~~Whether the Join window's paste button works inside the iframe is recorded (either answer is a finding).~~
5. **If any step fails:** a new task is filed for the failure. This task closes with the failure recorded, or stays
   open until a re-test passes — the owner decides.
6. No player id, Yandex id, app id, full URL, host, IP, token or credential in any artifact.

## Notes

- **Depends on:** [`0380`](../../done/0380-yandex-build-invites-copy-the-lobby-code-and-stop-honouring-join-links/brief.md) (done and deployed to production)
- **Blocks:** `0428` (turning the everyone-flag on — filed 2026-10-09). ~~nothing~~
- 🚦 Bears on release-gate item 6 in
  [`0354`](../../done/0354-show-private-lobbies-to-testers-by-default-and-add-an-everyone-flag/brief.md). ✅ Item 6 is met only when this check has **passed** in production, not just when the build ships
  ("Prod checks must pass too", OWNER RULING 2026-10-04, given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`; ⛔ not producer precedent).
- **Related:** [`0199`](../../done/0199-yandex-invite-link-leaves-portal-iframe/brief.md),
  [`0383`](../../done/0383-verify-0382-in-production-a-yandex-invite-link-opens-the-join-window-once-on-the-friends-portal/brief.md)
  (the link's verify task), `0376`.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
