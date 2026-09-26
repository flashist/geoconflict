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
