# Design the server-side player-state store — table, migration, API, first-login merge, rollout

## ID
0306

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-architect

## Context

**Filed 2026-09-26 by a spawned `fkit-producer` with no owner channel (ADR-021)** as the second child of
epic [`0304`](../0304-epic-server-side-player-settings-and-state-for-logged-in-players/brief.md) — read
the epic for the owner's words, the trigger and the constraints.

**Design only — no code, no migration file, no deploy.** The owner stressed care with *"databases and
migrations"*; this task is where that care is spent, **before** implementation briefs exist. Output: a
design spec (`/fkit-design-spec`) in `ai-agents/knowledge-base/reports/`, an ADR if a lasting decision is
made (`/fkit-record-decision`), and a proposed split into implementation tasks for the producer to file.

**The key the design has to get right — boot timing.** Today `startClient()` (`src/client/Main.ts`)
starts the profile login **fire-and-forget** and then decides straight away, from `localStorage`, whether
to auto-launch the Tutorial. So the server's answer arrives **after** the decision. A naive "read the
server copy" either blocks boot (ruled out) or launches the Tutorial on a device where it was already
done (the exact bug). The design must pick an answer — for example a bounded wait only when the device
says "not done" and the player is logged in, or a device-side copy of the last server value — and say
what the player sees in each case.

## What to build

A design spec that answers each of these, grounded in the code:

1. **Scope** — the keys `0305`'s owner rulings put in "move to server", and the value shape of each.
2. **Storage** — a new table (or a column set) keyed by the internal `player_id` (ADR-113), not the
   Yandex id. Typed columns vs a small JSON document with a schema; per-key version or timestamp if a
   merge needs it. Size and key-count limits. Personal-data minimization: nothing free-form, nothing that
   identifies a device.
3. **Migration** — a **new** file (`007_…`; `005` is intentionally absent). Forward-only and safe on the
   **live** database: additive only, no rewrite of existing tables, no long lock. Remember the runner
   skips by filename and `006` is deliberately not idempotent — say how a failed `007` is recovered.
   State how it is tested (`npm run test:integration` rebuilds the test schema through the real runner).
4. **Backup / restore** — confirm the nightly backup covers the new table, and recommend whether `0275`'s
   restore drill is re-run or extended to compare it (owner decides).
5. **API** — read and write routes behind the Bearer profile session (`0273`, `resolveCaller` in
   `src/profile-server/Routes.ts`), CORS as the existing player routes, rate limits, body-size limit,
   validation (Zod, as the rest of the profile API). Writes are **merges**, not blind overwrites, so two
   devices cannot undo each other. ⚠️ The session has `vfy:false` — anyone asserting an id gets a token —
   so nothing stored here may be worth money or XP; say so in the design.
6. **Merge rules** — per key, from `0305` (e.g. tutorial: done on any device = done; announcements
   last-seen: the newer by position in `resources/announcements.json`; decide what happens with an id the
   running build does not know). Prefer rules that give the same result however often they run, so the
   first-login merge can simply run on every login.
7. **First-login migration of device values** — on the first login after the change (on **each** device,
   not once per account), merge the device's values up. Idempotent. **Never delete or overwrite device
   values until the server has confirmed its copy.** Say what happens when two Yandex accounts share one
   device (account A's device values must not leak into account B — decide the rule).
8. **Guests** — no server call; device storage exactly as today. What happens on log-in and log-out.
9. **Fail-soft** — profile server down, slow, or 401/429: fall back to device storage, no error shown, no
   retry storm; writes that fail are not lost from the device.
10. **Boot** — the Tutorial timing problem above. No extra blocking against the 5 s platform deadline
    (`Bootstrap.ts` / `FlashistFacade.ts`).
11. **Rollout** — a flag / kill switch that returns every client to device-only behaviour without a
    deploy (follow the existing citizenship kill-switch pattern); the order of server deploy vs client
    release; how to turn it off if it misbehaves.
12. **Split** — the proposed implementation tasks, each independently shippable and testable, with
    dependencies (the epic lists a provisional guess).

## Verification steps

1. The design spec exists in `ai-agents/knowledge-base/reports/` and answers all twelve points above; any
   point it cannot answer is listed as an open question for the owner, not skipped.
2. It cites the code it relies on (`file` + function) for boot, session, migrations and routes.
3. The migration section states: additive only, new filename, lock impact on the live database, and the
   recovery path for a failed apply.
4. The owner has reviewed it (recorded in this brief with date and channel) before any implementation
   brief is filed.

## Notes

- **Depends on:** `0305` (the owner's classification of which keys move).
- **Blocks:** the implementation children of `0304` (not yet filed).
- Parent epic: `0304`.
- Related: `0273` (session), `0275` (restore drill), `0270` (migration `006` and the destructive test
  reset), ADR-113 (internal player id), `0012` (inbox read state — already server-side; a model for
  per-player read state), `0268` / `0253` (tenure — out of scope unless the owner rules otherwise in
  `0305`).

## Addendum — 2026-09-29: mission progress is the first key, with owner-ruled merge rules

**Recorded 2026-09-29 by a spawned `fkit-producer` with no owner channel (ADR-021)**, on owner rulings
given live 2026-09-29 in the `fkit lead` session via `AskUserQuestion` and relayed by `fkit-lead`.
⛔ Not producer precedent. **Append-only** — nothing above was edited, renumbered or reordered.

- **Mission progress (`geoconflict.sp.nextMissionLevel`) is the first key to design for** (OWNER RULING
  Q4, verbatim *"Yes, missions first (Recommended)"*). Its rules are owner-ruled, verbatim and in full in
  [`0345`](../0345-keep-single-player-mission-progress-on-the-server-for-logged-in-players/brief.md):
  Q1 *"The higher level wins (Recommended)"*; Q2 *"Into any account (Recommended)"*; Q3 *"The device's own
  level (Recommended)"*; Q5 *"Wait for 0340"* (the mission-progress slice ships only after verified
  logins). "Higher wins" already has the run-it-any-number-of-times property item 6 asks for.
- ⚠️ **NEEDS-DECISION — not settled here.** Item 7 above (producer-written, not an owner ruling) says a
  device shared by two Yandex accounts must not leak account A's values into account B. For mission
  progress, the owner's Q1–Q3 mean the device keeps **one** level that merges up into whichever account
  logs in next — so a level account A reached on that device can flow into account B. Raised to the lead
  2026-09-29; the design must present it, not resolve it silently.
- Related new task: [`0344`](../0344-investigate-why-single-player-mission-progress-resets-to-level-1/brief.md)
  (why the reset happens — may change what the design must guard against).

## Addendum — 2026-09-29 (later): the shared-device NEEDS-DECISION is ruled

**Recorded 2026-09-29 by a spawned `fkit-producer` with no owner channel (ADR-021).** OWNER RULING given
live 2026-09-29 in the `fkit lead` session via `AskUserQuestion` (free-text answer), relayed by
`fkit-lead`. ⛔ Not producer precedent. **Append-only** — nothing above was edited; where this narrows an
earlier line, that line stays as history and this section wins.

The owner, verbatim:
> *"No, it shouldn't reach the level of another account. I think what should be done is that we should
> implement the behaviour as simple as possible, but guaranteeing saving progress to not logged in users.
> Let's focus on the naive simple but robust solution first and then do any additions later."*

**The lead's reading — recorded as `fkit-lead`'s interpretation, NOT owner text.** The owner has been
told this reading and may correct it:

1. **One account's level must NOT flow into another account** (A at 80 must not lift B). This keeps
   `0306` item 7's no-leak rule and **narrows Q2**: only **true guest progress** (played while not logged
   in) carries into the account that logs in; progress earned while logged in as account A does not
   carry into account B.
2. ~~**Saving guest (not-logged-in) progress must be guaranteed and robust.** Guests keep device-only
   progress, so this also raises the weight of `0344` (the reset investigation).~~ ⛔ **SUPERSEDED
   2026-09-29 by the owner's typo correction below** — the guarantee is for **logged-in** players; guests
   losing data in some cases is acceptable.
3. **Scope discipline:** v1 is the naive, simple, robust version. Extras (cross-device niceties,
   edge-case polish, analytics, …) are later additions, not v1. The `0306` design proposes the simplest
   mechanism that satisfies 1 + 2 and lists what it defers.

Q1–Q5 stand as recorded (the higher level wins; missions first; wait for `0340`; …).

- The ⚠️ **NEEDS-DECISION** in the addendum above is **answered**: item 7's no-leak rule **stands** for
  mission progress.
- **Ask of this design (from reading 3):** propose the simplest mechanism that (a) never lets one
  account's level lift another's, (b) carries true guest progress into the account that logs in, and
  (c) keeps guest saving robust — and **list what v1 defers**.
- One point the design must answer, because the device today does not tell guest progress apart from
  logged-in progress: what counts as "guest progress" for the value **already on a device** the first time
  a player logs in after this ships (it may have been earned partly while logged in).

## Addendum — 2026-09-29 (latest): owner correction — the save guarantee is for LOGGED-IN players

**Recorded 2026-09-29 by a spawned `fkit-producer` with no owner channel (ADR-021).** OWNER CORRECTION
given live 2026-09-29 in the `fkit lead` session, relayed by `fkit-lead`. ⛔ Not producer precedent.
**Append-only** — superseded text above is struck or overridden here, never deleted.

The owner, verbatim:
> *"Regarding this: there was a typo, what I meant to say is that we should guarantee saves to LOGGED IN
> users, and if there are cases when NOT LOGGED IN users can lose their data, it's acceptable"*

- It corrects the phrase *"guaranteeing saving progress to not logged in users"* in the ruling above:
  **the guarantee is for LOGGED-IN players. Guests (not logged in) losing their data in some cases is
  acceptable.**
- The lead's reading **point 2 is SUPERSEDED** (struck above). **Points 1 and 3 stand:** one account's
  level never flows into another account; v1 is the naive, simple, robust version, extras later.
- **Q1–Q5 stand, including Q2** — true guest progress (played while not logged in) still carries into
  the account that logs in. The owner did not withdraw it.
- The *"Ask of this design"* in the addendum above changes at **(c)**: not *"keep guest saving robust"*
  but **"guarantee a logged-in player's progress reaches and stays in the server copy"** — including a
  win made while the profile server was unreachable (no durable queue today, so the next launch/login
  pushes the device's higher level up). Guest saving stays best-effort device storage. (a), (b), the
  deferred-extras list and the first-login question about the value already on a device all stand.
