# Verify 0380 in production — the Yandex invite copies the code, and old `#join=` links are ignored

## ID
0381

## Sprint
Backlog

## Priority
Unscheduled

> 📌 **Placement note.** No sprint was named, so this is on the Backlog board for now. The owner's standing
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

## What to build

Nothing is built. Owner-run live check, desktop first.

**Preconditions:** `0380` is committed and deployed to production (weekend slot). Record the version. The host can see
the private-lobby row (record how).

**Steps:**
1. **Copy.** Inside the Yandex Games page, open Create. Tap the invite / copy control. The host sees a "copied"
   confirmation. Paste into another app: the pasted text is the **code only** — no URL, no `geoconflict.ru`.
2. **Code shown.** The code is visible to the host (masked or not, per `0380`'s ruled answer to question (c)).
3. **Code join.** A friend, inside the Yandex Games page, opens Join and enters the code (try the paste button too,
   and record whether it works). The host's window lists the friend.
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
6. **Mobile** (Yandex app or mobile web), if the owner can: repeat step 1. *Not run* is acceptable — say so.

## Verification steps

1. `worklog.md` records the date, the version, how the host saw the row, and each step **pass**, **fail** or
   **not run**, in the owner's words. A step not run is never written as passed.
2. Step 1 passes: the pasted text is the code alone, and the copy confirmation showed.
3. Step 4 passes: no join window from an old `#join=` link on the Yandex build.
4. Whether the Join window's paste button works inside the iframe is recorded (either answer is a finding).
5. **If any step fails:** a new task is filed for the failure. This task closes with the failure recorded, or stays
   open until a re-test passes — the owner decides.
6. No player id, Yandex id, app id, full URL, host, IP, token or credential in any artifact.

## Notes

- **Depends on:** [`0380`](../../done/0380-yandex-build-invites-copy-the-lobby-code-and-stop-honouring-join-links/brief.md) (done and deployed to production)
- **Blocks:** nothing
- 🚦 Bears on release-gate item 6 in
  [`0354`](../../done/0354-show-private-lobbies-to-testers-by-default-and-add-an-everyone-flag/brief.md). ✅ Item 6 is met only when this check has **passed** in production, not just when the build ships
  ("Prod checks must pass too", OWNER RULING 2026-10-04, given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`; ⛔ not producer precedent).
- **Related:** [`0199`](../../done/0199-yandex-invite-link-leaves-portal-iframe/brief.md),
  [`0383`](../../done/0383-verify-0382-in-production-a-yandex-invite-link-opens-the-join-window-once-on-the-friends-portal/brief.md)
  (the link's verify task), `0376`.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
