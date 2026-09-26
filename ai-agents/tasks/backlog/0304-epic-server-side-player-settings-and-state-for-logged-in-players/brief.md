# Epic — Keep logged-in players' settings and progress on our server, not on the device

## ID
0304

## Sprint
Backlog

## Priority
Unscheduled

Owner-placed on the Backlog board, **not** the next sprint (owner, 2026-09-26: *"Added not to the next
sprint but probably to the backlog because I'm afraid it's rather a big task and we need to be careful
about what we do with databases and migrations"*). Needing a rank is the signal to pull it into a sprint.

## Status
🔲 Backlog

## Owner
fkit-producer (epic) — child tasks carry their own owners.

## Context

**Filed 2026-09-26 by a spawned `fkit-producer` with no owner channel (ADR-021)**, on an owner request
given in the `fkit lead` session and relayed by `fkit-lead`. The owner asked for the work to exist and to
sit on the Backlog board. ⚠️ **The owner did not rule scope, design, which keys move, or merge rules** —
those are the open questions in `0305` and `0306`.

**The owner's words (voice-dictated), verbatim:**
> *"Regarding the dot on the bell, icon and the tutorial, I think we need to stop using cloud saves and
> local storage saves and because right now we have proper proper profiles of users on our server. We
> need to use proper like storage for settings for user on our side. I think it's possible only for the
> users who are logged in and for whom we created profiles on our server. So there probably should be
> some migration for the users who just logged in. And I think it's worth creating a separate task for
> that. And the task should be... Added not to the next sprint but probably to the backlog because I'm
> afraid it's rather a big task and we need to be careful about what we do with databases and
> migrations etc etc"*

**The trigger — `0296`, 2026-09-26.** During the after-deploy production checks the owner opened the game
on a second device (a phone) with the **same Yandex account**. XP, citizenship, the inbox and the
personal-message read state followed him — they are server-side. But the phone **offered the Tutorial
again** and **lit the bell dot for general announcements**, because both are remembered only on the
device:

- Tutorial completion — `localStorage["tutorialCompleted"]` (`src/client/TutorialStorage.ts`), read at
  boot in `startClient()` (`src/client/Main.ts`, the *"Tutorial: auto-launch for first-time players"*
  block) and written by `TutorialLayer.ts` / `WinModal.ts`.
- Announcements last-seen — `localStorage["geoconflict.announcements.lastSeenId"]`
  (`src/client/Announcements.ts`), read by the bell (`src/client/components/NewsButton.ts`, the
  `hasUnreadAnnouncements(…, readLastSeenAnnouncementId())` call).

### "Cloud saves" — checked: the game does not use them

The owner mentions *"cloud saves"*. **Geoconflict uses no Yandex cloud save** (`player.setData` /
`getData` / `setStats`). Evidence: a fresh `grep` of `src/client` and `src/core` on 2026-09-26 (by this
producer) found no call; ADR-112 already records *"No Yandex cloud save is used"*; `0253`'s findings
record that the cloud-save-backed counter the owner may remember lives in the separate
`libs/appframework` used by **other** games, not this one. So the only thing to replace here is
**device storage** (`localStorage`, `sessionStorage`, one cookie). `0305` re-verifies this.

### Why this is an epic, and how the owner's "a separate task" was honoured

The owner asked for *"a separate task"*. The brief-writing skill's rule is to split work into the
smallest independently shippable pieces, and to **investigate before scoping implementation** when real
unknowns exist. Both hold here: the list of what to move is not known, the design touches a **live
database with real players**, and the owner asked for care.

**What was done:** one umbrella (this epic — the "separate task" the owner asked for, and the one row to
track) plus two first-step children that can be finished and reviewed on their own:

| Child | What | Owner |
|---|---|---|
| [`0305`](../0305-inventory-and-classify-per-player-state-kept-on-the-device/brief.md) | Step 0 — list every piece of per-player state kept on the device; owner classifies each (move to server / keep on device / delete) | fkit-producer |
| [`0306`](../0306-design-server-side-player-state-store-schema-api-migration-and-rollout/brief.md) | Design, with `fkit-architect`, before any code: table + migration, API routes, merge rules, first-login migration, flag, fail-soft, boot timing | fkit-architect |

**Implementation children are deliberately NOT filed yet.** Their shape depends on `0305`'s rulings
(two booleans is a very different job from a keybind blob) and on `0306`'s design. Once `0306` is
reviewed with the owner, the producer files them. **Provisional shape — a guess, not a plan:**

1. Server: new table + migration `007_…` + authenticated read/write routes + limits (profile image deploy).
2. Client: a player-state adapter — server copy for logged-in players, device storage for guests,
   fail-soft back to device storage when the profile server is down; behind a flag / kill switch.
3. First-login merge of existing device values into the server copy.
4. Per-key cutovers — tutorial first, then announcements last-seen, then whatever `0305` adds.

### Constraints every child inherits

- **The profile database is LIVE with real players since 2026-09-26** (the deploy window; `0296`).
  A migration mistake now damages real data.
- **Migrations are forward-only and tracked by filename.** The runner (`src/profile-server/Migrations.ts`)
  skips any filename already applied; `006_player_identity.sql` is **deliberately not idempotent**.
  So: a **new** file (next free name is `007_…` — `005` is intentionally absent), never an edit to an
  applied one. Migrations run at profile-server start (deploy time).
- **Backups and restore were proven on the `006` schema** (`0275`, result `IDENTICAL`, 2026-09-16). A new
  table is outside what that drill compared — `0306` decides whether the drill is re-run or extended.
- **Auth is the Bearer profile session** (`0273`, ADR-113; `src/client/ProfileSession.ts`). ⚠️ It adds no
  proof of identity today (`vfy:false`); any logged-in id can get a token. Fine for tutorial / last-seen
  flags (nothing of value); **not fine for anything worth money or XP.**
- **No extra blocking at boot.** Boot has a shared 5 s platform deadline (`Bootstrap.ts` /
  `FlashistFacade.ts`) and the profile login is fire-and-forget (`startClient()`), so today **the
  tutorial decision is made before the server has answered.** `0306` must solve this without making the
  game slower to start.
- **152-ФЗ residency is already satisfied** (the profile box is in Russia). Still store the minimum:
  no free-form player text, no device fingerprints.
- **Guests keep device storage.** Only players who are logged in and have a profile row get a server copy.

## What to build

Nothing directly — this is a tracking epic. Drive the children in order: `0305` → owner rulings →
`0306` → owner review → producer files the implementation children → they ship in dependency order.

## Verification steps

The epic is done when **all** of these hold, each shown by a child's own evidence:

1. On two devices logged in to the same Yandex account, completing the Tutorial on one means the other
   **does not** auto-offer it (after the other device has fetched the server copy).
2. Opening the announcements on one device clears the general-announcement bell dot on the other.
3. A guest (not logged in) behaves exactly as today — device storage only, no profile call.
4. With the profile server unreachable, a logged-in player gets today's device-storage behaviour — no
   error, no extra wait at boot.
5. Existing players' device values were merged into the server copy on their first login after the
   change, with no device value deleted before the server confirmed its copy.
6. The migration was reviewed before deploy, and backup/restore coverage of the new table was decided
   (drill re-run, or explicitly waived by the owner).
7. Every key `0305` classified has been handled per its ruling.

## Notes

- **Depends on:** nothing. (`0305` can begin now.)
- **Blocks:** nothing known.
- **Related:** `0296` (trigger), `0273` (Bearer session), `0275` (restore drill on `006`), `0270`
  (migration `006`, the destructive integration-test reset), `0012` (inbox — personal-message read state
  is already server-side; this epic covers the **general-announcement** half of the bell dot), `0253` /
  ADR-112 and `0268` (tenure grant — see the open question in `0305`), `0303` (whole-game refresh after a
  purchase — a similar "state goes stale on the client" theme; no dependency either way).
- **Tenure grant — flagged, not decided.** The tenure grant's evidence (`geoconflict.player.daysPlayed`,
  `game-records`) is device-local **by owner ruling** (0253, 2026-09-14: *"it's also fine, even if it
  lives only on the localStorage of a user"*), and `0268` removes the claim logic ~60 days after release.
  Producer's recommendation: **this epic does not touch it.** Owner question recorded in `0305`.
