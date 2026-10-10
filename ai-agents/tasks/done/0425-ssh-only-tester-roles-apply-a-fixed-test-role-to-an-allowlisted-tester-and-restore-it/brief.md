# SSH-only tester roles: apply a fixed test role (non-citizen, earned, paid, …) to an allowlisted tester record, and restore it

## ID
0425

> ℹ️ **ID allocation, checked 2026-10-09 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/`
> (folder names and `## ID` fields agree, base-10 arithmetic) is `0424`, so this is `0425`.
> `grep -rn 0425 ai-agents/tasks ai-agents/sprints`: no hits before this filing.

## Sprint
Sprint 8

> 📌 **OWNER REQUEST, 2026-10-09, typed by the owner in the coordinating Claude Code session** (the owner's own
> message), relayed to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent.
> Verbatim: *"Brief it to the Sprint 8, ideally to be done as one of the first things because it unblocks other
> things."* (Full request and rulings in *Context*.)

## Priority
22

⚠️ **Priority 22 is append rank, NOT a merit ranking — flagged for owner confirmation.** ADR-035 append position after
[Sprint 8](../../../sprints/plan-sprint-8.md)'s highest (21, `0423`); the owner named the sprint, not a rank.
**On merit this belongs at the very top of this board, directly beside `0420`**, because it unblocks live checks that
cannot run today (`0420`'s earned-account items, possibly `0376`) and the owner asked for it *"as one of the first
things"*. Not inserted there: closed rows sit below the top (`0373`, `0363`, `0358`, `0392`–`0404`, `0422`), and
ADR-035 never renumbers them — a new row always appends. **An owner re-rank can lift it only as far as 20** (the top of
the contiguous open run `0415`, `0423` directly above it; `0422`'s cancelled row at 19 is a wall). **Read it as the
top group regardless of the number.**

✅ **CONFIRMED 2026-10-09 — OWNER RULING *"Leave it at 22"*** (the owner's own selection, live via `AskUserQuestion` in the coordinating Claude Code session, relayed to a spawned `fkit-producer`; ⛔ not producer precedent). Question: *"Move 0425 up to rank 20?"* Option text: *"Number stays; the board notes already say to treat it as part of the top group."* Rank 22 stands; no row moved.

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder

> **Architect consult suggested at the plan step** (the coder decides; not a gate): identity/trust (who may run it,
> how the allowlist is read, fail-closed) and database invariants (the flags/timestamps a role sets must agree with
> what the login and match-credit code would produce, and restore must be exact).

## Context

### Why now — there is no earned-citizen test account (2026-10-08 incident, task `0424`)

Since the 2026-10-08 incident recorded in
[`0424`](../../backlog/0424-investigate-yandex-returning-a-different-player-id-for-the-same-account-if-it-recurs/brief.md), the
owner's earned test account logs in as a **new, non-citizen record** (tenure gift, 50 XP; the old earned record is
intact but no longer reached). So every live check that needs an **earned citizen** is blocked:
[`0420`](../../backlog/0420-verify-sprint-7-popup-start-screen-and-private-lobby-fixes-live-one-checklist/brief.md) items 3a,
8b and the earned part of item 4, and possibly
[`0376`](../0376-verify-private-lobbies-in-production-a-citizen-hosts-inside-yandex-and-a-friend-joins/brief.md)
(its host may be *"earned or paid"*, so it may not strictly need earned — the owner decides).

### How the request took shape (coordinating session, 2026-10-09)

The owner first floated a **console snippet to log in as other users**. The coordinating session explained that a
client-side switch is unsafe (anyone can run console code; a secret id is not authorization) and that a server-checked
login-as is medium-large. The owner then proposed, verbatim:

> *"instead of logging in as other users, we can have some server side logic (that can be accessed only via ssh), that
> allows us to "apply" different "roles" aka synthetic user data, to a tester acc. In theory, this will allow us to
> change the roles of testers on the fly when needed (e.g. testing non-citizen, earned citizen, paid citizen, or even
> testing some other real users, by applying their data (except id), to the tester acc."*

The owner's request to brief, verbatim:

> *"Brief it to the Sprint 8, ideally to be done as one of the first things because it unblocks other things. I also
> think that for this task we need to make sure the commands can run only for a specific set of users (testers), and
> the list of their ids will be managed manually by me (for now we will only have 1 user in the list). I also thin
> that this command ALWAYS should be a deterministic command, meaning, that if we want to introduce a new "test role",
> we configure it (e.g. set up a config of the properties that should be applied to a user), and this set of
> properties never changes by LLM, only if we change the code. And when the command runs, it should apply user id and
> the id of the role. Ask me any questions if needed."*

### Owner rulings — live `AskUserQuestion` in the coordinating Claude Code session, 2026-10-09

The owner's own selections, relayed to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer
precedent.

1. **Copy-from-real-player mode:** **"Leave it out (Recommended)"** — only fixed roles from code; fully deterministic;
   no reads of real players. A copy mode can be its own task later.
2. **First roles (multi-select, all chosen):**
   - **"non-citizen / earned / paid"** — non-citizen with low XP; earned citizen (100+ XP, not paid); paid citizen
     (the purchase flag only — **NO fake purchase record**).
   - **"almost a citizen (99 XP)"** — one match away from earning.
   - **"brand-new player"** — 0 XP and the one-time tenure XP gift reset, so the "Спасибо, что вы с нами!" gift popup
     can be tested again.
3. **Restore:** **"Yes, save and restore (Recommended)"** — before the first role is applied, the tester's current
   data is saved on the server next to the data; one `restore` command puts it back exactly.

### What exists already (checked by the producer in code, 2026-10-09 — the coder confirms)

- **Precedent for an operator command on the profile box:** `0312`'s `name-change:decide`
  (`src/profile-server/decideNameChange.ts` + `NameChangeDecideCommand.ts`), run over SSH as a one-shot `docker compose
  exec` in the profile container; inputs as runtime-only env values allowlisted in
  `scripts/config-parity-allowlist.json`; its import surface deliberately excludes `Server`/`Routes`/`Telemetry` so it
  never binds a port. Reuse that shape rather than inventing a parallel tool. `profile-checks.sh` is the other box-side
  precedent (host script, cron).
- **Schema** (`migrations/006_player_identity.sql`): `players` carries `xp`, `is_citizen`, `is_paid_citizen`,
  `citizenship_earned_at`, `citizenship_purchased_at`, `updated_at`, `last_login_at`; the one-time tenure gift is a
  `player_xp_grants` row with `kind = 'tenure'`. Highest migration today is `007`.
- **Earned citizenship is also set by code paths** (`PlayerProfileRepository.ts`, `CITIZENSHIP_XP_THRESHOLD` from
  `src/core/profile/Citizenship.ts`): reaching the threshold flips `is_citizen` / `citizenship_earned_at`. A role must
  leave the record in a state those paths agree with (e.g. "almost a citizen" must earn normally after one match).
- **A different "tester" already exists — do not confuse the two.** `0302`/`0354`'s tester marker is a **client-side**
  browser flag (`localStorage` `geoconflict_tester` → feature `tester=1` for remote flags). It is not authorization and
  this task must **not** read or rely on it. The new allowlist is a **server-side, box-only** list.

### Scope

**In:** one operator command on the profile box with `apply <tester> <role>`, `restore <tester>`, `show <tester>`;
the box-only tester allowlist; the fixed role definitions in code; the save-before-first-apply snapshot; a run log on
the box; tests; a runbook entry.

**Out:**
- **Copy-from-a-real-player mode** — owner ruling 1; a later task if wanted.
- Any client-side switch, console snippet, or "log in as" — rejected in the coordinating session as unsafe.
- Fake `processed_purchases` rows, real purchases, or anything that touches Yandex payments.
- Running it in production inside this task — see *What to build* §7.
- Recovering the old earned record from `0424` — that is `0424`'s question, not this task's.

## What to build

1. **One command, SSH-only.** Runs on the profile box only (a one-shot in the profile container, `0312` shape, or a
   host script calling it — the coder's plan picks and says why). No HTTP route, no internal endpoint, nothing
   reachable from the game server, the client or the internet. Subcommands:
   - `apply <tester> <role>` — exactly two inputs: the tester's **internal player id** and a **role id**. No other
     values, no free-form properties.
   - `restore <tester>` — puts back the snapshot saved before the first apply, exactly, then clears it.
   - `show <tester>` — read-only: current role (if any), XP, citizen/paid flags and their timestamps, whether a tenure
     grant row exists, whether a snapshot is held. Prints **no ids beyond what the operator typed**.
2. **Tester allowlist — box only, owner-managed.** A file (or env value) that lives **only on the box, never in the
   repo**, edited by hand by the owner; starts with **one** entry. Every subcommand (including `show`) **refuses** a
   player not on it, with a loud error and **no write**. **Fail closed:** a missing, unreadable or empty list refuses
   everything. The plan says where it lives, its format, its permissions, and how it survives a redeploy (if it touches
   `setup-profile.sh` or the compose file, the hardening harness asserts over those — keep it green).
3. **Roles — fixed, in code, deterministic.** Each role is a fixed property set in the repo. Adding or changing one is
   a code change + review; the command never takes property values at run time. First set (owner ruling 2):

   | Role id (coder names them) | What it sets |
   |---|---|
   | non-citizen | low XP (fixed value), not citizen, not paid, citizenship timestamps cleared |
   | almost a citizen | XP = threshold − 1 (99 today, derived from `CITIZENSHIP_XP_THRESHOLD`, not a copied literal), not citizen, not paid |
   | earned citizen | XP ≥ threshold, citizen, earned timestamp set, **not paid** |
   | paid citizen | paid flag + purchased timestamp set (and whatever citizen flag paid status implies today), **no `processed_purchases` row** |
   | brand-new player | 0 XP, not citizen, not paid, the tester's tenure grant row removed so the gift popup can show again |

   The plan states the exact values per role and checks each against what the real code paths would produce.
4. **Writes touch only that tester.** Only the tester's `players` row fields needed for the role (plus `updated_at`)
   and, for "brand-new", its tenure grant row. Never another player's rows; never `processed_purchases`; never identity
   rows. One transaction per run.
5. **Save and restore (owner ruling 3).** Before the **first** apply, save the tester's current values (every field a
   role can change, the tenure grant row as it was) on the server, next to the data (the plan picks the place — e.g. a
   small table via a new migration — and says why). A second apply while a snapshot is held **does not overwrite it**.
   `restore` puts the saved values back exactly and clears the snapshot; `restore` with no snapshot refuses with no
   write. Say plainly in the runbook: XP earned while a role was applied is discarded by `restore`.
6. **Every run is logged on the box** — when, who (as the box sees it), subcommand, role, tester, and the outcome
   (applied / refused + why). The log stays on the box; it never goes to telemetry, Telegram or the repo.
7. **Things to check, not assume** (findings in the worklog):
   - **Does paid status shown in the client depend on anything beyond the profile DB?** The coordinating session found
     `getPurchases` used only for purchase reconciliation (`src/client/PaymentsReconciliation.ts`), not for showing
     paid status — verify, and say whether reconciliation could undo or fight a role-set paid flag.
   - **Statistics:** which existing reads count players or payments (e.g. `profile-checks.sh` player growth, the
     paid-player / purchase counts used in `0402`/`0424`-style reads, any "paid without a purchase" consistency check)
     and whether the tester must be excluded or flagged so it does not skew them or raise a false alarm. If exclusion
     is needed and non-trivial, propose it as a follow-up brief rather than growing this task.
   - **Client caches:** after `apply`, does a page reload show the new role, or does something cached (client, session
     token, server memory) hold the old state? Document the exact steps the tester takes after a run.
   - **"Brand-new":** what the tenure gift's eligibility actually reads (grant row only, or also creation time / login
     history / the browser's local play history), so removing the row really brings the popup back — and note the gift
     amount will come from that browser's local history.
8. **Runbook.** A short section (in the profile runbook the coder finds most fitting) with the exact commands, what
   each output means, the allowlist edit, and the rule below. No ids, hosts or secrets.
9. **Production use is not part of this task.** Running `apply`/`restore` on the live box is a **production write**:
   each run needs the owner's OK in-session (standing rule). The first planned run — apply "earned citizen" to the
   owner's tester record, which unblocks `0420` items 3a/8b/4-earned and possibly `0376` — goes to the **verify step
   filed at close** (owner's build/verify-split rule, 2026-09-29).

## Verification steps

1. **Guard tests** (jest, or a shell harness — if a new `.sh` harness, it is registered in
   `tests/scripts/ShellHarnesses.test.ts` with its success marker, per `CLAUDE.md`), each asserting **no write**
   happened on refusal:
   - a player not on the allowlist is refused (for `apply`, `restore` and `show`);
   - an unknown role id is refused;
   - a missing list, an empty list and an unreadable list each refuse everything (fail closed);
   - extra or missing arguments are refused (exactly two inputs for `apply`).
2. **Role tests against a real Postgres** (`npm run test:integration`): each role produces exactly its table's values;
   no other player's rows change (a second, non-tester player is byte-identical before and after); no
   `processed_purchases` row is ever created; "almost a citizen" becomes an earned citizen after one normal match
   credit; "brand-new" removes only the tester's tenure row.
3. **Restore round-trip test:** snapshot → apply two different roles in a row → restore → the tester's row and tenure
   grant state equal the original exactly; a second apply did not overwrite the snapshot; restore with no snapshot
   refuses.
4. **`show` prints no ids** beyond the one typed (asserted by a test on its output).
5. **The run log** gets one line per run, including refusals, with the fields in §6 and no secrets.
6. **Worklog findings** for each item in *What to build* §7, each with evidence (file/line or test) or an explicit
   "unknown".
7. `npm test`, `npm run test:integration`, `npm run lint`, and `npm run check:config-parity` pass (any new runtime-only
   input allowlisted the `0312` way).
8. **Live use — not filed now.** The first production run is a verify step **filed at close**, owner-run, with the
   owner's in-session OK per run.

## Notes

- **Depends on:** nothing.
- **Blocks:** [`0420`](../../backlog/0420-verify-sprint-7-popup-start-screen-and-private-lobby-fixes-live-one-checklist/brief.md)
  (items 3a, 8b and the earned part of item 4);
  [`0376`](../0376-verify-private-lobbies-in-production-a-citizen-hosts-inside-yandex-and-a-friend-joins/brief.md)
  (only if its host must be an earned citizen — its brief allows *"earned or paid"*).
- **Related:**
  - [`0424`](../../backlog/0424-investigate-yandex-returning-a-different-player-id-for-the-same-account-if-it-recurs/brief.md) —
    the incident that removed the earned test account.
  - [`0253`](../../done/0253-tenure-xp-grant-for-existing-players-at-citizenship-launch-research-and-rule/brief.md) —
    the one-time tenure gift the "brand-new" role resets.
  - [`0401`](../../done/0401-verify-0301-live-the-citizenship-explainer-popup-works-in-production/brief.md) — earlier
    live check of the citizenship popup with the test accounts.
  - [`0312`](../../done/0312-name-change-a-working-documented-operator-decide-command-approve-and-reject/brief.md) —
    the operator-command precedent to reuse.
  - `0302` / [`0354`](../../done/0354-show-private-lobbies-to-testers-by-default-and-add-an-everyone-flag/brief.md) —
    the unrelated client-side tester marker (see *Context*).
- **No secrets:** this brief records no player ids, Yandex ids, hashes, hosts or connection strings. The allowlist and
  the run log stay on the box.
- **Assumption, flagged:** the tester is named by the **internal** player id (not a Yandex id), so a Yandex id is never
  typed into a shell. The owner finds his tester's internal id with a read-only query he approves in-session.
