# Turn private lobbies on for everyone — set the `private_lobbies_all` everyone-flag in the Yandex Games console

## ID
0428

> ℹ️ **ID allocation, checked 2026-10-09 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/`
> (folder names and `## ID` fields agree, base-10 arithmetic) is `0427`, so this is `0428`.

## Sprint
Sprint 8

> 📌 **OWNER RULING, 2026-10-09, typed by the owner in the coordinating Claude Code session** (the owner's own
> message), relayed to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent.
> Verbatim: *"1. Yes move to the Sprint 8 and brief a dedicated task for the Sprint 8 to turn the private lobbies on for
> everybody."* The question it answered: *"are private lobbies ready to be enabled for all users via feature flag?"* —
> answered with the release gate in `0354`'s brief (three items still open).

## Priority
30

⚠️ **Priority 30 is append rank, NOT a merit ranking — flagged for owner confirmation.** ADR-035 append position after
[Sprint 8](../../../sprints/plan-sprint-8.md)'s highest, directly after the three gate tasks moved in by the same
ruling (`0376` at 27, `0228` at 28, `0381` at 29). The owner named the sprint, not a rank.
**On merit this belongs directly below `0381`**, because it is the last step of the release chain and cannot start
before the three gate tasks above it finish. 30 already sits there.

## Status
🔲 Backlog

## Owner
fkit-producer — ⚠️ **EXECUTED BY THE OWNER (human).** The flag lives in the Yandex Games console, which only the owner
can read or change. The live check needs a non-tester player account in the Yandex Games page. Any read-only check an
agent can do (the game server's log counts, with the owner's OK in-session) may be run by an agent session
(standing rule: read-only checks are run, not handed over).

*(The field names the accountable fkit seat, because the owner vocabulary admits no person — same form as `0376` and
`0381`.)*

## Context

**What this task is.** Private lobbies (a citizen perk, `0302`) are live but hidden from regular players. Since `0354`,
the private-lobby controls — today the **Приватная** tab on the start screen (`0412`) — show only to **testers** (a
browser marker) **or** to everyone when the Yandex remote flag `private_lobbies_all` = `enabled` is set. That flag is
unset. This task sets it, checks the result live, and keeps a rollback ready. **Nothing is built and nothing is
deployed** — it is one console change plus checks.

**Where the flag is defined.** `src/client/flashist/FlashistFacade.ts`, `experiments.PRIVATE_LOBBIES_ALL_FLAG_NAME`
(`private_lobbies_all`) and `PRIVATE_LOBBIES_ALL_ENABLED_VALUE` (`enabled`). The code comment there: the flag is
**visibility only** — the server never sees Yandex flags, so the real lock is the server's citizens-only start check,
which runs whether the flag is on or off. The old `private_lobbies` flag is no longer read.

**Two facts that decide whether the flip works** (from `0354` and `0412`, recorded in the wiki pages for those tasks):
- **The tab also needs the citizenship surfaces on.** The rule is *citizenship surfaces on* (`citizenship_ui` =
  `enabled`) **AND** (tester marker **OR** `private_lobbies_all`). If `citizenship_ui` is off for some players, the
  everyone-flag does nothing for them. Last owner-stated value (2026-10-05, not checked in the console by anyone):
  `citizenship_ui` = `enabled`. Re-read it on the day.
- **Flags are read once per page load.** A player sees the change only after their next page load — both when turning
  it on and when rolling back.

**The release gate — why this task waits.** OWNER RULING 2026-10-03 (relayed by `fkit-lead`; ⛔ not producer
precedent): the everyone-flag stays unset until all six items in
[`0354`'s *Release gate*](../../done/0354-show-private-lobbies-to-testers-by-default-and-add-an-everyone-flag/brief.md)
are true. State on 2026-10-09, checked by the producer from the task records:

| # | Gate item | Task | State 2026-10-09 |
|---|---|---|---|
| 1 | Testers see it by default + everyone-flag exists, unset | `0354` | ✅ Done (agent-closed — not owner-verified). Live evidence: on game `0.0.161` a tester sees three tabs, a flag-off non-tester sees two (`0420` worklog, item 6). |
| 2 | Production test: a citizen hosts inside Yandex, a friend joins, the match starts **and ends** | `0376` | 🔲 Open — most of it passed live 2026-10-09; the match end, the `0353` host-window check and the console values are still to do (see `0376`'s 2026-10-09 note). |
| 3 | Join race investigated; fixed only if actually reproduced, otherwise it drops off the gate | `0228` | 🔲 Open — not started. |
| 4 | Abandoned unstarted private lobbies no longer sit on the server for 3 hours | `0377` **+ its live check `0390`** | ✅ `0377` Done (agent-closed — not owner-verified) — **built only**. `0390` still `🔲 Backlog`. 📌 *2026-10-09 ruling (open question 1): `0390` must pass first — now a dependency.* |
| 5 | The citizenship popup has shipped | `0301` | ✅ Done (agent-closed — not owner-verified). Live evidence: the popup was checked on `0.0.161` (`0420` worklog, item 2 — with `0421`'s shorter text). |
| 6 | Invite links resolved: the Yandex link + code build, **and its production checks passed** | `0380` + `0382`; checks `0381` + `0383` | `0380`, `0382`, `0383` ✅ Done (`0383` passed live 2026-10-09). `0381` 🔲 Open — its remaining step is the old `#join=` link check (see `0381`'s 2026-10-09 note). |

**Known accepted risk, not reopened here.** OWNER RULING on `0332`'s Q4 (2026-10-07, *"Keep it open (Recommended)"*,
as recorded in the wiki page for `0302`): the private-lobby gate stays open to unverified citizens, so a forged citizen
id can still host. Today only testers see the Create button; after this flip every player does. The owner accepted
that risk; this task only records it so the flip is made knowingly.

**News window (`0426`).** `0426` writes the catch-up news entry and may mention private lobbies **only if this flag is
on for everyone at its deploy** (its rule 2: flag-gated features count only if their flag is on for all players).
The owner gives `0426` the flag value at its text-approval gate. See *Notes*.

## What to build

Nothing is built. The owner makes one console change and runs the checks below; an agent runs the read-only log
count if the owner allows it in-session.

**Preconditions (check all, record each in `worklog.md`):**
1. `0376`, `0228`, `0381`, `0390` and `0433` are closed *(`0390` added 2026-10-09, `0433` added 2026-10-10, owner rulings — see Notes)* with their gate item recorded as passed — or, for `0228`, recorded as *not
   reproduced* (so it drops off the gate by the 2026-10-03 rulings), or reproduced **and** fixed **and** deployed. *(2026-10-10: `0228` was reproduced and fixed; it still needs its commit and deploy, and a passed live check `0433`.)*
2. Gate items 1, 4 and 5 are still true (`0354`, `0377`, `0301` closed; nothing reverted). Record the state of `0390`
   (the live check of item 4) and the owner's answer to open question 1.
3. Record the game version live in production.
4. A **non-tester** player account (no tester marker), ideally also a **non-citizen**, is ready inside the Yandex
   Games page. A second device or browser for a citizen host is useful for check 3 but not required.

**Steps:**
1. **Before — record the console values.** In the Yandex Games console, write down exactly what is set today for
   `private_lobbies_all`, `citizenship_ui` and the old `private_lobbies` (expected: `private_lobbies_all` unset,
   `citizenship_ui` = `enabled` for everyone, `private_lobbies` unset — but record what is actually there). Note any
   condition attached (for example a tester-only condition).
2. **Flip.** Add `private_lobbies_all` = `enabled`, **with no condition** (for everyone). Record the time. If
   `citizenship_ui` is not `enabled` for everyone, **stop** — the flip would do nothing for those players; ask the
   owner before changing `citizenship_ui`, which also controls every other citizenship surface.
3. **After — record the console values again**, same three flags.
4. **Live check, right after** (reload the page first — flags are read once per load):
   a. **Non-tester sees the tab.** The non-tester account, inside the Yandex Games page, sees three tabs
      *Мультиплеер | Одиночная | Приватная*. Phone width if possible.
   b. **A non-citizen can join.** The non-citizen account opens the Приватная tab, opens Join and joins a lobby hosted
      by a citizen — by typing the code (the route this flag opens up), and, if convenient, by the Yandex invite link.
      The host's window lists them.
   c. **Create stays citizen-only.** The non-citizen account taps Create: the citizenship explainer opens, no host
      window and no lobby. (The server's refusal of a non-citizen start is independent of this flag — the server never
      sees it — and is not re-tested here by forcing a start.)
   d. **Server log, read-only, with the owner's OK in-session.** Count, for the check window: private create lines,
      how many carry the creator, and "creator not a citizen" refusals. Counts only — no log line, id or code is
      copied anywhere.
5. **Rollback — keep it ready, use it only if needed.** If any of check 4 fails, or players report a problem the owner
   judges serious: **delete `private_lobbies_all` in the console** (unset it). Players lose the tab on their next page
   load; already-open pages keep it until reload. Invite links keep working either way (joining by link was never
   gated by this flag), and lobbies already running are not stopped. Record the time and the reason, file a task for
   the failure, and the gate is open again until that task is resolved.
6. **Tell `0426`.** Record in this worklog, and in `0426`'s worklog if it has one by then, whether the flag is on for
   everyone and since when.

## Verification steps

1. `worklog.md` records preconditions 1–4: each gate task's closing state, `0390`'s state, and the version.
2. The console values **before** and **after** the flip are recorded for `private_lobbies_all`, `citizenship_ui` and
   `private_lobbies`, with any condition, plus the time of the flip.
3. Checks 4a–4c each recorded **pass**, **fail** or **not run**, in the owner's words, with the account described by
   role only (tester or not, citizen or not, device). A check not run is never written as passed.
4. Check 4d recorded as counts only, or as *not run* with the reason.
5. **If any check fails:** the rollback (step 5) is done and recorded, a new task is filed for the failure, and this
   task stays open or closes with the failure recorded — the owner decides which.
6. The owner states in the worklog that private lobbies are **on for everyone** (or **rolled back**), and the date.
7. No player id, Yandex id, app id, lobby code, full URL, host, IP, token or credential in any artifact.

## Notes

- **Depends on:** `0376`, `0228`, `0381`, `0390`, `0433`
- 📌 *2026-10-10: `0433` added to Depends on — OWNER RULING 2026-10-10, given live via `AskUserQuestion` in the `fkit lead` session (at `0228`'s close, `/fkit-sprint-ship-loop` on Sprint 8), relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Verbatim **"File it, before 0428 (Recommended)"** — option text: "Owner-run live check, at the bottom of Sprint 8, and 0428 waits for it, since 0228 is a private-lobby gate item." State of gate item 3 on 2026-10-10: [`0228`](../../done/0228-handlejoinlobby-stale-gamestop-race/brief.md) REPRODUCED (9/9, slowed network, real clicks) and FIXED in code — closed `✅ Done (agent-closed — not owner-verified)`; **not committed, not deployed.** Item 3 is met only when `0228` is committed and deployed **and** its live check [`0433`](../0433-verify-0228-live-quick-leave-double-join-and-close-during-a-lobby-join/brief.md) has passed. The gate table above (state 2026-10-09) is kept as written.*
- 📌 *2026-10-09: `0390` added to Depends on — OWNER RULING 2026-10-09, given live via `AskUserQuestion` in the coordinating Claude Code session, relayed to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Asked "Must 0390 pass before private lobbies go on for everyone?", the owner chose **"Yes, 0390 must pass first (Recommended)"** (option text: "0428 also waits for 0390. Cheap: create a lobby, leave, and check 30+ minutes later that it's gone."). Gate item 4 now needs `0390`'s live pass, not just `0377` built.*
- **Blocks:** nothing by dependency. `0426`'s text may name private lobbies only if this task has run before `0426`'s
  deploy (see below).
- **For `0426` (the news window):** its text approval needs to know whether `private_lobbies_all` is on for everyone at
  the deploy that ships the news. If this task runs **before** that deploy, the news may mention private lobbies for
  everyone; if **after**, it must not (it would promise something players cannot see yet). This is not a dependency
  in either direction — the owner picks the order. A one-line pointer to this task is added to `0426`'s Notes.
- **Gate items 1, 4 and 5** are not listed as dependencies because their tasks are already closed; precondition 2
  re-checks them on the day.
- **Timing — 📌 RULED 2026-10-09:** OWNER RULING 2026-10-09, given live via `AskUserQuestion` in the coordinating Claude Code session, relayed to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Asked "Turn private lobbies on before or after the final Sprint 8 deploy?", the owner chose **"Before the final deploy (Recommended)"** (option text: "Flip as soon as the gate is clear. The news update can then announce it in the same release."). So: **flip as soon as the gate is clear, before the final Sprint 8 deploy**, so `0426` can announce it in that release. *(Earlier text, kept:)* This is a console change, not a deploy, so the weekend-slot rule for deploys does not bind it by its
  wording — the owner picks the time. *Producer's suggestion, owner's call:* flip at a time the owner can watch for an
  hour or so and roll back if needed.
- **Related:** `0302` (the perk), `0354` (the flag and the gate), `0412` (the Приватная tab), `0377` / `0390` (idle
  lobbies and their live check), `0380` / `0382` / `0383` (invites), `0332` (the accepted forged-id risk), `0426`.
- **Privacy:** describe accounts by role only. Never paste an id, code, host, IP, URL, token or credential.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.

## Open questions for the owner

1. ✅ **ANSWERED 2026-10-09 — "Yes, 0390 must pass first (Recommended)"** (OWNER RULING 2026-10-09, given live via `AskUserQuestion` in the coordinating Claude Code session, relayed to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent); `0390` is now in *Depends on*. *(Question as filed:)* **Must `0390` (the live check that abandoned private lobbies end after 30 minutes) pass before the flip?** The gate
   lists item 4 as `0377`, which is built and closed, but its live check has not run. For item 6 the owner ruled that
   production checks must pass too (2026-10-04); for item 4 there is no such ruling. *Producer's recommendation:* yes —
   it is a cheap owner check, and the flip shows Create to every citizen instead of only testers, so more hosts means
   more chances of an abandoned lobby. Not added as a dependency until the owner rules.
2. ✅ **ANSWERED 2026-10-09 — "Before the final deploy (Recommended)"** (OWNER RULING 2026-10-09, given live via `AskUserQuestion` in the coordinating Claude Code session, relayed to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent); see *Timing* in Notes. *(Question as filed:)* **When to flip, relative to the final Sprint 8 deploy** — this decides whether `0426`'s news may mention it.
