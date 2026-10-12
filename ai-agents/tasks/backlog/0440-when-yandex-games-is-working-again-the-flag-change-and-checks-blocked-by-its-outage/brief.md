# When Yandex Games is working again: the flag change and checks blocked by its outage

## ID
0440

> ℹ️ **ID allocation, checked 2026-10-12 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/`
> (folder names and `## ID` fields agree, base-10 arithmetic) is `0439`, so this is `0440`. No `0440` string anywhere
> under `ai-agents/tasks`, `ai-agents/sprints` or `.claude`, and no `tasks/*/0440*` path in any branch's history.

## Sprint
Sprint 8

> 📌 **OWNER REQUEST, 2026-10-12, typed by the owner in the `fkit lead` session** (the owner's own message), relayed by
> `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Verbatim:
> *"Yandex.Games still have problems with their services and infrastructure, so I can't do all the needed checks and
> changes of flags. Can you brief a task for that and add it to the current sprint, to make sure we don't forget about
> all the needed checks?"*

## Priority
37

⚠️ **Priority 37 is append rank, NOT a merit ranking — flagged for owner confirmation.** ADR-035 append position after
[Sprint 8](../../../sprints/plan-sprint-8.md)'s highest (36, `0436`); the owner named the sprint, not a rank.
**On merit this belongs directly above `0428`**, because its first check (is Yandex back?) gates `0428`'s console flip,
and `0428` in turn feeds `0426`'s text gate. Rank barely matters in practice: this is a reminder list, and what starts
it is Yandex recovering, not its number.

## Status
🔲 Backlog

> ⚠️ **Waiting on Yandex Games, not on us.** Outage noticed 2026-10-11, still ongoing 2026-10-12: console flag changes
> do not take effect, other Yandex services are unreliable. Nothing in this list can start until item 1 passes. (Any
> session may set this to `🚧 Blocked — Yandex Games outage`; it is filed as `🔲 Backlog`, the only status a new brief
> may carry.)

## Owner
fkit-producer — ⚠️ **EXECUTED BY THE OWNER (human).** Only the owner can read or change the Yandex Games console and
play the live game inside the Yandex Games page. `fkit-lead` runs the read-only server-log counts (item 5), **only with
the owner's OK given in-session** (standing rule: read-only checks are run, not handed over).

*(The field names the accountable fkit seat, because the owner vocabulary admits no person — same form as `0428`.)*

## Context

**What this is, in plain terms.** A checklist, so nothing is forgotten while Yandex Games is broken. Several pieces of
Sprint 8 work need the Yandex Games console (where the game's remote flags are set) or the live game inside the Yandex
Games page, and both are unreliable since 2026-10-11. This task does not do that work itself — **it points to the task
that owns each piece.** The steps live in those tasks only, so they cannot drift apart. When Yandex works again, the
owner walks down this list.

**State on filing (2026-10-12), from the task records and the lead's relay:**
- `0428`'s preconditions are all met (its last dependency, `0433`, closed 2026-10-11). **Nothing has been changed in
  the console yet.**
- `0426` has a draft (`draft.md` in its task folder) with two conditional lines and flag values taken from the owner's
  console screenshot of 2026-10-10 (`citizenship_ui` on for everyone, `private_lobbies_all` off). Its approval gate is
  still open.
- `0437` (exit confirm popup) closed 2026-10-11 as **built, not deployed**; its live check `0439` sits on the Backlog
  board, marked for the top of the next sprint.
- Sprint 8's board banner still reads `🔲 Backlog` (the sprint was never started); this is the board the owner calls
  the current sprint.

**Not in this list, checked and left out:** the other open Sprint 8 rows (`0342`, `0343`, `0418`, `0219`, `0213`) do
not need the Yandex console or the live Yandex page.

## What to build

Nothing is built and nothing is deployed by this task. Walk the items in order; record each in this task's
`worklog.md`.

### 1. First — is Yandex back? (owner)

Do this before anything else. If it fails, stop and try again later; nothing below is worth doing on a broken
platform.

a. **The console works.** The Yandex Games console opens and shows the game's current flag values.
b. **The game reads the flags.** Open the game inside the Yandex Games page, open the browser DevTools console, switch
   the console's context dropdown from **"top"** to the **geoconflict iframe**, and paste the read-only check below. It
   changes nothing — it only asks Yandex which flag values this page receives and prints them.

   ```js
   (async () => {
     const sdk = await YaGames.init();
     const tester = localStorage.getItem("geoconflict_tester") === "1";
     const flags = await (tester
       ? sdk.getFlags({ clientFeatures: [{ name: "tester", value: "1" }] })
       : sdk.getFlags());
     console.log("tester marker:", tester);
     console.table(flags);
     for (const name of ["citizenship_ui", "private_lobbies_all", "private_lobbies"]) {
       console.log(name, "=", flags[name] ?? "(not set)");
     }
   })();
   ```

   **Pass:** it prints a table without an error or a long hang, and the values match what the console shows for that
   kind of player (tester marker on or off — a tester-only condition in the console shows only when the marker is on).
   Check it on a page **without** the tester marker too, since that is what regular players get.
c. **A console change really takes effect.** This is proven by the first real change — `0428`'s flip (item 2): after
   the flip, a fresh page load and the same check must show `private_lobbies_all = enabled` on a non-tester page. If it
   does not, Yandex is not back yet — follow `0428`'s rollback step and wait.
d. **Quick look at the rest of Yandex:** the game page loads, login works, an ad shows when one is due. Note anything
   still broken.

Record in the worklog: the date Yandex was judged back, and the flag values printed (names and values only).

### 2. `0428` — turn private lobbies on for everyone (owner)

[`0428`](../0428-turn-private-lobbies-on-for-everyone-in-the-yandex-games-console/brief.md): set `private_lobbies_all`
= `enabled` for everyone in the console, with its before/after console values, its live checks **4a–4d**, and its
rollback. ⚠️ Check **4b** also carries the **lowercase code join** (`0389`'s check (b) and `0381` step 3), which is still
unproven live. Follow `0428`'s own steps and record there; this list only notes that it ran. The check snippet from
item 1 is a convenient way to confirm the reload picked up the flag before check 4a.

### 3. `0426` — the news window's flag gate (owner, at `0426`'s approval gate)

[`0426`](../0426-update-the-news-window-tell-players-everything-shipped-since-2026-06-06/brief.md): its approval gate
needs the **real** flag values at deploy time — `citizenship_ui` and `private_lobbies_all` — not the 2026-10-10
screenshot. Its `draft.md` has two conditional lines: the **Private tab** line (kept only if `0428` has turned the flag
on before the deploy) and the **exit-confirm** line (kept only if `0437` ships in the same deploy). Give `0426` the
values after item 2 has run (or not run) and record them there.

### 4. `0439` — the exit popup's live check (owner)

[`0439`](../0439-verify-0437-live-exit-confirm-popup-inside-yandex-games/brief.md) needs **two** things: Yandex
working (item 1, including a real ad), **and** the deploy that carries `0437` (built, not deployed when it closed). It
is not merged into this list — it stays its own task, on the Backlog board, for the top of the next sprint. This item
is only a reminder that the outage also holds it up.

### 5. Optional — is anything broken for our players? (`fkit-lead`, read-only, with the owner's OK in-session)

After Yandex is back, a short read-only look at the game server's logs, counts only, against a normal day before
2026-10-11: game-log errors, failed-after-retries lines, and match credits. The point is to catch damage the outage
left behind. No log line, player id, code or host is copied anywhere — counts and dates only. The owner may skip this.

### 6. Watch items found while filing — record, don't run

- **`0435`** (Backlog board, re-check the 1-minute lobby numbers): its step 4 must know whether and **when**
  `private_lobbies_all` went on for everyone, because private-lobby entries then join the GameAnalytics count. `0428`
  already records the flip time; make sure it does.
- **`0411`** (Backlog board, citizenship card: suggest a reload when the flags fetch timed out): its evidence is flag
  fetches that time out. The outage will produce many of those that say nothing about normal days. Record the outage
  window (start 2026-10-11, end = the date item 1 passes) here, so whoever reads timeout numbers can leave it out.
- **`0424`** (Backlog board, deferred: Yandex gave the same account a different player id — *pick up only if it
  happens again*): its notes link a past Yandex infrastructure incident to that id change. If, after recovery, the
  owner or any player reports a lost profile or lost progress, that is `0424`'s trigger — tell the owner.
- **`0394`** (Backlog board, unscheduled): its Phase 0 step 2 also needs a live account switch inside Yandex. Not
  tracked here; noted only so it is not mistaken for unaffected.

## Verification steps

1. The worklog records the date Yandex was judged back, items 1a–1d each **pass**, **fail** or **not run**, and the
   flag values the check printed (names and values only).
2. Items 2, 3 and 4 each read one of: **done in its own task** (link to that task's worklog or close), **still open,
   with the reason**, or **re-planned by the owner** (the owner's words and the date).
3. Item 5 recorded as counts only, or as **skipped by the owner**, or **not run** with the reason.
4. Item 6: the outage window (start and end dates) is recorded; anything seen for `0424` is reported to the owner.
5. No item is written as passed when it did not run.
6. No player id, Yandex id, app id, lobby code, full URL, host, IP, token or credential in any artifact.

**Done when:** each pointed-to item is either done in its own task or explicitly re-planned by the owner. Then this
tracker closes (by the producer, via `/fkit-task-done`).

## Notes

- **Depends on: nothing.** No task blocks it — it waits on Yandex Games recovering (outside our control; see *Status*).
- **Blocks:** nothing by dependency. It points to `0428`, `0426` and `0439`; it does not block them, and they keep
  their own dependencies.
- **Related:** `0428`, `0426`, `0439`, `0437`, `0389`, `0381`, `0435`, `0411`, `0424`, `0394`.
- **Why the check snippet is in this brief:** it is a read-only check for the owner to paste into the browser, not
  implementation code; it was supplied with the owner's request. The flag names and the tester marker in it match
  `src/client/flashist/FlashistFacade.ts` (checked 2026-10-12).
- **Console changes are not deploys**, so the weekend-deploy rule does not bind items 1–2; `0426` and `0437` ride
  game deploys and follow it.
- **Privacy:** describe accounts by role only (tester or not, citizen or not, device).
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
- Filed 2026-10-12 by a spawned `fkit-producer` on the owner request above. ⛔ Not producer precedent.
