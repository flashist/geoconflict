# Verify 0382 in production — a Yandex invite link opens the Join window once, on the friend's own portal

## ID
0383

## Sprint
Backlog

## Priority
Unscheduled

> 📌 **Placement note.** No sprint was named, so this is on the Backlog board for now. The owner's standing
> build/verify rule (2026-09-29) puts a verify task **at the top of the next sprint after its build ships**, and it
> must not block the build's own sprint deploy. When
> [`0382`](../0382-yandex-build-invite-link-via-the-sdk-portal-url-and-payload-consumed-once/brief.md) closes, that
> placement is the producer's to propose and the owner's to confirm — it is **not** made here.

## Status
🔲 Backlog

## Owner
fkit-producer — ⚠️ **EXECUTED BY THE OWNER (human) and a second person or a second browser profile.** It needs the
live Yandex Games page, a host who can open Create, and a friend opening the copied link. No agent can do those parts.
Read-only checks an agent can do may be run by an agent session (standing rule).

*(The field names the accountable fkit seat, because the owner vocabulary admits no person — same form as `0376`.)*

## Context

**OWNER RULING, relayed by `fkit-lead`; ⛔ not producer precedent.** Filed 2026-10-04 by a spawned `fkit-producer`
with no owner channel (ADR-021/037), on the owner's ruling **"Yandex link + code"** (live `AskUserQuestion`, `fkit
lead` session; full text in [`0199/worklog.md`](../../done/0199-yandex-invite-link-leaves-portal-iframe/worklog.md)) and the
owner's build/verify split rule (2026-09-29).

**This is the production check for `0382`.** The 2026-10-04 console probe proved the platform parts by hand
(payload arrives, the SDK gives the right per-portal URL, copy works in a click). This proves **our build** does it
end to end — and covers what the probe left untested where it can: mobile, a third domain.

**Precondition the producer cannot settle:** as in
[`0381`](../0381-verify-0380-in-production-the-yandex-invite-copies-the-code-and-old-join-links-are-ignored/brief.md),
the host must be able to see the private-lobby row in production (`0354` deployed, or the owner's console setup).
✅ **The friend is a NON-TESTER** (cannot see the lobby buttons): question (a) in `0382` is ruled **"Yes, link always
lets them in"** (OWNER RULING 2026-10-04, given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`; ⛔ not producer precedent). Step 3 proves it. *(Was: "depends on owner question (a) … run step 3 with a friend
matching the ruled answer".)*

## What to build

Nothing is built. Owner-run live check.

**Preconditions:** `0382` (and `0380`) committed and deployed to production (weekend slot). Record the version and
how the host saw the row.

**Steps:**
1. **Copy the link (`yandex.ru`).** Inside the Yandex Games page on `yandex.ru`, open Create and tap invite. Paste:
   the link has the shape `https://yandex.ru/games/app/<id>?payload=<code>` (record the **shape** only). The code is
   still shown on the host window.
2. **Portal follows the host (`yandex.com`).** Repeat step 1 with the host on `yandex.com`: the link starts
   `https://yandex.com/games/app/`.
3. **A non-tester friend joins.** The friend is **not** a tester and cannot see the lobby buttons (ruling (a)). They
   open the copied link in a fresh window (incognito is fine), land **inside the Yandex Games page**, and the Join
   window opens with the code. The host's window lists the friend.
4. **Once only.** The friend plays a match (or leaves one) and returns to the menu. The Join window does **not**
   reopen.
5. **A new invite still works.** The host makes a new lobby and sends a new link; in the same friend tab/session it
   opens Join again.
6. **Optional, record *not run* if skipped:** a third domain (e.g. `yandex.kz`); mobile web or the Yandex app (copy on
   the host side, open on the friend side); a slow-boot case if one can be produced.

## Verification steps

1. `worklog.md` records the date, the version, and each step **pass**, **fail** or **not run**, in the owner's words.
   URLs as shapes only.
2. Steps 1, 3 and 4 pass — step 3 with a friend recorded as **not a tester**. Step 4 is the one that guards against the friend being re-joined after every match.
3. Step 2 passes, or is recorded *not run* with the reason.
4. Mobile and a third domain are recorded as run or *not run* — never assumed.
5. **If any step fails:** a new task is filed for the failure. This task closes with the failure recorded, or stays
   open until a re-test passes — the owner decides.
6. No player id, Yandex id, app id, full catalog URL, host, IP, token or credential in any artifact.

## Notes

- **Depends on:** [`0382`](../0382-yandex-build-invite-link-via-the-sdk-portal-url-and-payload-consumed-once/brief.md) (done and deployed to production)
- **Blocks:** nothing
- 🚦 Bears on release-gate item 6 in
  [`0354`](../0354-show-private-lobbies-to-testers-by-default-and-add-an-everyone-flag/brief.md). ✅ Item 6 is met only when this check has **passed** in production, not just when the build ships
  ("Prod checks must pass too", OWNER RULING 2026-10-04, given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`; ⛔ not producer precedent).
- **Can share a session with** [`0381`](../0381-verify-0380-in-production-the-yandex-invite-copies-the-code-and-old-join-links-are-ignored/brief.md)
  and [`0376`](../0376-verify-private-lobbies-in-production-a-citizen-hosts-inside-yandex-and-a-friend-joins/brief.md)
  if the builds ship together. Producer's suggestion, owner's call.
- **Related:** [`0199`](../../done/0199-yandex-invite-link-leaves-portal-iframe/brief.md).
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
