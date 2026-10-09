# Mark a server-confirmed approved name in matches

## ID
0323

## Sprint
Sprint 7

## Priority
8

> 📌 **2026-09-29 — rank 6 → 8.** Shifted down two by an OWNER-RULED placement that put `0339` + `0340` directly below `0337` on the [Sprint 7 board](../../../sprints/done/plan-sprint-7.md) (relayed by `fkit-lead`; see that board's 2026-09-29 `0339`/`0340` addendum). Not a merit change for this task.

> 📌 **2026-09-29 — rank 5 → 6.** Shifted down one by an OWNER-RULED re-rank that put `0337` on top of the [Sprint 7 board](../../../sprints/done/plan-sprint-7.md) (relayed by `fkit-lead`; see that board's 2026-09-29 addendum). Not a merit change for this task.

✅ **5 — placement OWNER-RULED 2026-09-27** (D5: *"…add it to the end of the end of the next sprint"*, live in
the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer`, ADR-021/037). Append rank: this
board's highest was 4 (`0221`). No row was renumbered (ADR-035). ⚠️ Sprint 7's ranks 1–4 are **positions**,
not merit; this one is an append. On merit it simply follows `0322`, which it needs.

## Status
⛔ Cancelled (agent-closed — not owner-verified) (2026-10-07) — Owner ruling 2026-10-07: players don't care whether a name is server-confirmed; only developers/admins need to know who is really who, and `0332`'s counters (`geoconflict.server.match.identity`, per match start) cover the admin need. A per-player admin view can be filed later if wanted. ADR-115 residual 1 stays open by owner ruling Q5 (2026-10-07).

## Owner
fkit-coder

## Context

**Filed 2026-09-27 by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an owner ruling on
`0317` given live in the `fkit lead` session and relayed by `fkit-lead`.** ⛔ Not producer precedent. This is
brief **B3** of the `0317` findings report.

**Owner ruling (D5, "a mark showing the real approved name"), the owner's own words, verbatim:**
> *"Not now, but create a brief for this task and add it to the end of the end of the next sprint."*

"Not now" is read as: do not build it in Sprint 6; it waits on Sprint 7 and on `0322`.

**Why it exists.** After `0322`, the server swaps in a citizen's approved name, but anyone can still **type**
the same string or a look-alike (owner-accepted, D1 and D6). The citizen ★ does not tell them apart: it is
not drawn on map labels, and a citizen who types another citizen's name gets ★ too
([`0317` report](../../../knowledge-base/reports/2026-09-27-0317-approved-name-in-matches.md) §5(a), §7). A
mark that the **server** sets only when it swapped in the approved name tells a confirmed name from a typed
copy on every surface — because it is tied to the account, not to the string.

**⚠️ Same trust level as `0322`.** Until `0267` ships verified identity, someone who sends another citizen's
Yandex id gets the mark too (the accepted risk recorded by `0322`'s ADR, D3).

## What to build

1. A server-set flag per player meaning "this name is the approved name the server swapped in" — set only
   where `0322` swaps, false everywhere else. It must default to false and tolerate an old server that does
   not send it (the same pattern as the citizen flag in the player schema).
2. Draw the mark where ★ is drawn today (leaderboard, player panel, private-lobby lists) **and on map
   labels**. The look of the mark is an **owner decision at the plan gate** (the producer does not pick it).
3. A short explanation where players can learn what the mark means (en **and** ru), if the plan finds a
   natural place; otherwise ask the owner.
4. Tests: flag set only on a real swap; absent flag parses as false; each surface draws the mark.

## Verification steps

1. Tests pass for step 4. `npm test` green (re-run and say so if the known `supertest` flake appears).
2. Local run, two browsers: player A is a citizen whose approved name was swapped in; player B types the same
   string. A shows the mark on every listed surface, B shows none.
3. When `0322`'s swap falls back to the typed name (lookup slow, or re-check failed), no mark is shown.
4. Any new text exists in both `en.json` and `ru.json`.

## Notes

- **Depends on:** `0322` (hard — the swap) · [`0340`](../../done/0340-0325-s3a-enforce-mint-verified-sessions/brief.md) (hard — verified sessions; `0325`'s slice S3a, split into its own task 2026-09-29) *(repointed 2026-09-29, kept as written: ~~[`0325`](../../done/0325-verified-login-check-yandex-signed-player-data-and-mint-verified-sessions/brief.md) (hard — verified login)~~)* · ~~the **join-token step, NOT YET FILED**~~ [`0332`](../../done/0332-join-token-game-server-has-the-profile-server-vouch-for-a-verified-session/brief.md) — the join-token step, filed 2026-09-28 (hard — the client sends its verified session token in the WebSocket join and the game server asks the profile server to vouch for it; [`0250` design report](../../../knowledge-base/reports/2026-09-27-0250-authenticated-profile-read-design.md) §6). *(Changed 2026-09-28 by owner ruling — see the dated note below.)*
- ~~**Depends on:** `0322`~~ *(superseded 2026-09-28 — owner ruling below)*
- ~~**Soft dependencies (not blocking):** `0267` (makes the mark identity-verified with no change here).~~ *(superseded 2026-09-28 — verified identity is now a hard dependency, via `0325` plus the join-token step)*
- **Related:** [`0317`](../../done/0317-investigate-show-a-citizens-approved-name-in-matches/brief.md) (source) ·
  [`0322`](../../done/0322-game-server-shows-a-citizens-approved-name-in-multiplayer-matches/brief.md) (the swap) ·
  [`0068`](../../done/0068-citizen-verified-icon/brief.md) (citizen ★ — the pattern) · the Sprint 6
  *Nickname Styling System* row (also draws names).
- **Privacy/secrets:** no player ids or names in tests, worklog or report.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
- 📌 **Routing note from [`0303`](../../done/0303-the-whole-game-reflects-a-purchase-without-a-reload/brief.md) (2026-09-28, `0303` plan step 11; added by a spawned `fkit-producer` at `fkit-lead`'s request):**
  *"after a purchase the popup offers a restart and a match end reloads anyway, so a perk may read status at load time. A grant made by session-start reconciliation applies from the next load unless the perk listens to `PURCHASES_RECONCILED_EVENT`."*
- 📌 **2026-09-28 — OWNER RULING: wait for verified login (append-only; added by a spawned `fkit-producer` at
  `fkit-lead`'s request, ruling given live via `AskUserQuestion` in the `fkit lead` session, ADR-021/037).**
  Answer, verbatim: **"Wait for verified login (Recommended)"** — *"0323 depends on 0325 and the join-token
  step, so the mark really means 'confirmed'."*
  **Reason.** Under [ADR-115](../../../knowledge-base/decisions/adr-115-approved-name-in-matches-runs-at-adr-103-trust-level.md),
  approved names in matches run at ADR-103 trust level: someone who sends another citizen's Yandex id gets
  that citizen's approved name. A mark shown at that level would falsely claim the server confirmed the name.
  The mark is only honest once the game server can itself check who the player is.
  **Effect.** `0325` and the join-token step are now **hard** dependencies (above). The old soft dependency on
  `0267` and the Context paragraph *"⚠️ Same trust level as `0322`"* are **superseded**: this task no longer
  ships at ADR-103 trust level.
  ~~⚠️ **The join-token step has no task yet** (`0250` design report §6). It now blocks this task, and it is also
  what closes `0322`'s forged-id residual. Filing it is left to the owner; **not filed here.**~~ *(struck
  2026-09-28 — filed; see the note below)*
- 📌 **2026-09-28 — the join-token step is filed as [`0332`](../../done/0332-join-token-game-server-has-the-profile-server-vouch-for-a-verified-session/brief.md)** (append-only; added by a spawned
  `fkit-producer` at `fkit-lead`'s request). Owner ruling given 2026-09-28 live via `AskUserQuestion` in the
  `fkit lead` session, relayed by `fkit-lead` (ADR-021/037); answer, verbatim: **"File it, end of Sprint 7
  (Recommended)"** — *"Sits right after 0323's dependencies; it can't start before 0325 is done anyway."* `0332`
  sits at the end of Sprint 7 (rank 6, directly after this task's row), depends on `0325`, and **blocks this
  task**. The *Depends on* line above now links it.

- 📌 **2026-09-29 — dependency repointed from `0325` to `0340` (append-only; the notes above are kept as written).** Added by a spawned `fkit-producer` at `fkit-lead`'s request, on an OWNER RULING given 2026-09-29 live via `AskUserQuestion` in the `fkit lead` session (ADR-021/037): **"Split it (Recommended)"** — *"Close 0325 as the S2 build (agent-closed). File a 'verify S2 live' task … at the top of Sprint 7, and a separate 'S3a enforce' build task after it."* `0325` closed as the S2 build (it checks the signature but still mints only `vfy:false`). Verified sessions now come from [`0340`](../../done/0340-0325-s3a-enforce-mint-verified-sessions/brief.md), ~~which waits on [`0339`](../../done/0339-verify-0325-s2-live-the-login-signature-check-in-production/brief.md) (verify S2 live) and an explicit owner approval~~ *(stale — struck 2026-10-05: `0340` no longer waits on any task; it may start now and only its deploy is gated, ADR-122 — see the 2026-10-05 note at the end)*. Where the notes above say *"`0325`"* as the verified-login dependency, read `0340`. `0332` (the join token) is unchanged and now also depends on `0340`.

### Open questions for the owner
1. What should the mark look like, and should it replace ★ for these players or sit next to it? (Asked at the
   plan gate.)

## 📌 2026-10-05 — deploy step: the owner looks at the post-`0391` login numbers first (appended; the stale *"`0340` waits on `0339`"* wording above is struck, not deleted, ADR-035)

**Provenance.** OWNER RULING given 2026-10-05 live via `AskUserQuestion` in the `fkit lead` session, relayed by
`fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Verbatim:
*"Yes, add the note (Recommended)"*. Design record: [ADR-122](../../../knowledge-base/decisions/adr-122-stale-login-gate-is-owner-judgment-no-fixed-window-or-threshold.md) (accepted 2026-10-05; supersedes ADR-121 Decision 4).

- **Before this task's deploy (the confirmed-name mark reads `verified`):** the owner looks at the post-`0391` login-signature numbers that exist at the time (stale share,
  `ok`, `id_mismatch`, `bad_payload`, read from the first post-`0391`-deploy point) and decides whether to deploy or
  wait longer. No fixed window, no fixed bar. Record the window, the numbers and the owner's call in this task's
  worklog. The read is read-only, done the same way as [`0392`](../../done/0392-read-the-post-0391-login-numbers-before-the-0340-deploy/brief.md) (which covers only `0340`'s deploy and closes after it).
- **Unchanged:** this task still depends on [`0340`](../../done/0340-0325-s3a-enforce-mint-verified-sessions/brief.md) (verified
  sessions). `0340` itself no longer waits on any task — it may start now (`🔄 In progress` 2026-10-05); its own deploy
  needs the owner's look plus a separate, explicit owner approval to enforce. The owner's look here is **not** an
  approval of anything beyond this task's deploy.
- No status, sprint or rank changed by this note. No mover run.

## 📌 2026-10-05 — deploy only after `0395` confirms `vfy: true` live (appended; nothing above edited, ADR-035)

**Provenance.** OWNER RULING given 2026-10-05 live via `AskUserQuestion` in the `fkit lead` session, relayed by
`fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Verbatim:
*"Note only (Recommended)"*.

- **Deploy this task only after [`0395`](../../done/0395-verify-0340-live-deploy-s3a-and-confirm-verified-logins-in-production/brief.md) confirms `vfy: true` live** in production. `0340` now closes once built
  and reviewed (owner ruling, 2026-10-05); verified sessions are live only after `0395`'s deploy and the owner's
  DevTools check. Until then no player is verified, so a route that reads `verified` would see none.
- **This is a note, not a dependency.** The `Depends on` line is unchanged (it names `0340`, which covers the
  **build**); no link to `0395` was added, by the owner's ruling. When `0340` closes, the board will stop showing this
  task as waiting — that is about building, not deploying.
- No status, sprint or rank changed by this note. No mover run.

## 📌 2026-10-07 — OWNER RULING: the post-`0391` login numbers are no longer a gate for this deploy (appended; nothing above edited, ADR-035)

**Provenance.** OWNER RULING given live by the owner in a session on 2026-10-07, relayed to a spawned `fkit-producer`
with no owner channel (ADR-021/037); ⛔ not producer precedent. Owner, verbatim: *"I made a decision that we no longer
wait for those numbers. Monitor them as planned and after a few days we will check them again to make better decisions
but they no longer block us so the point is that we already improved this tail numbers drastically and we can move
forward"*. Plain reading: `0391` already cut the stale-login tail a lot, so no deploy that reads `verified` waits on
the numbers any more.

- **Removed:** the *"Before this task's deploy: the owner looks at the post-`0391` login-signature numbers …"* step in
  the 2026-10-05 note above (ADR-122's owner-judgment look). This deploy no longer waits on it, and the worklog no
  longer needs to record a window, numbers and an owner's call on them.
- **Still happens, non-blocking:** the numbers are monitored, and the owner re-reads them in a few days to inform later
  decisions — task [`0402`](../../done/0402-re-read-the-post-0340-login-verification-numbers-in-a-few-days/brief.md). Nothing here
  waits on it.
- **Unchanged:** the `Depends on` line; the 2026-10-05 *"deploy only after `0395` confirms `vfy: true` live"* note
  (`0395` confirmed `vfy: true` live 2026-10-07); the weekend-slot and commit-on-ask rules. This ruling removes only the
  numbers look — it is not, by itself, an approval to deploy.
- ADR-122 is being updated separately (by `fkit-architect`); this note does not edit it. No status, sprint or rank
  changed. No mover run.

## 📌 2026-10-07 — OWNER RULING (`0332` Q5): approved names are NOT limited to verified players, so this mark needs its own verified check (appended; nothing above edited, ADR-035)

**Provenance.** OWNER RULING given 2026-10-07 live via `AskUserQuestion` in the `fkit lead` session, on the `0332`
design ([report](../../../knowledge-base/reports/2026-10-07-0332-join-token-design.md) §15 Q5), relayed verbatim by
`fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Verbatim:
*"Keep for unconfirmed"* — **not** the design's recommendation (*verified only*).

- **What it means.** The game server keeps swapping in a citizen's approved name for players whose session is **not**
  verified. [ADR-115](../../../knowledge-base/decisions/adr-115-approved-name-in-matches-runs-at-adr-103-trust-level.md)
  residual 1 (a forged Yandex id shows a citizen's approved name) **stays open by owner ruling**.
- **Consequence for this task.** "The server swapped in the approved name" is therefore **not** enough to set the mark —
  a forged id still gets the swap. The mark must also check that the player is **verified**, using the `verified` bit
  that [`0332`](../../done/0332-join-token-game-server-has-the-profile-server-vouch-for-a-verified-session/brief.md) adds to the
  identity funnel (`GameServer.getCreditableYandexId` returns the Yandex id together with whether it is verified). In
  plain terms: mark = approved name swapped in **and** verified. What step 1 of *What to build* says ("set only where
  `0322` swaps") is to be read with that extra condition; the plan works out the details. (The report §15 Q5 states
  the same: *"`0323`'s mark would need its own check."*)
- **Unchanged:** the dependency on `0332` (hard — it now supplies exactly the bit this mark needs); status, sprint and
  rank; the mark's look is still an owner decision at the plan gate. No mover run.
