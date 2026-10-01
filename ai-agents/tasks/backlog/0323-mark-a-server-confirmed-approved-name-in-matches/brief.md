# Mark a server-confirmed approved name in matches

## ID
0323

## Sprint
Sprint 7

## Priority
8

> 📌 **2026-09-29 — rank 6 → 8.** Shifted down two by an OWNER-RULED placement that put `0339` + `0340` directly below `0337` on the [Sprint 7 board](../../../sprints/plan-sprint-7.md) (relayed by `fkit-lead`; see that board's 2026-09-29 `0339`/`0340` addendum). Not a merit change for this task.

> 📌 **2026-09-29 — rank 5 → 6.** Shifted down one by an OWNER-RULED re-rank that put `0337` on top of the [Sprint 7 board](../../../sprints/plan-sprint-7.md) (relayed by `fkit-lead`; see that board's 2026-09-29 addendum). Not a merit change for this task.

✅ **5 — placement OWNER-RULED 2026-09-27** (D5: *"…add it to the end of the end of the next sprint"*, live in
the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer`, ADR-021/037). Append rank: this
board's highest was 4 (`0221`). No row was renumbered (ADR-035). ⚠️ Sprint 7's ranks 1–4 are **positions**,
not merit; this one is an append. On merit it simply follows `0322`, which it needs.

## Status
🔲 Backlog

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

- **Depends on:** `0322` (hard — the swap) · [`0340`](../0340-0325-s3a-enforce-mint-verified-sessions/brief.md) (hard — verified sessions; `0325`'s slice S3a, split into its own task 2026-09-29) *(repointed 2026-09-29, kept as written: ~~[`0325`](../../done/0325-verified-login-check-yandex-signed-player-data-and-mint-verified-sessions/brief.md) (hard — verified login)~~)* · ~~the **join-token step, NOT YET FILED**~~ [`0332`](../0332-join-token-game-server-has-the-profile-server-vouch-for-a-verified-session/brief.md) — the join-token step, filed 2026-09-28 (hard — the client sends its verified session token in the WebSocket join and the game server asks the profile server to vouch for it; [`0250` design report](../../../knowledge-base/reports/2026-09-27-0250-authenticated-profile-read-design.md) §6). *(Changed 2026-09-28 by owner ruling — see the dated note below.)*
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
- 📌 **2026-09-28 — the join-token step is filed as [`0332`](../0332-join-token-game-server-has-the-profile-server-vouch-for-a-verified-session/brief.md)** (append-only; added by a spawned
  `fkit-producer` at `fkit-lead`'s request). Owner ruling given 2026-09-28 live via `AskUserQuestion` in the
  `fkit lead` session, relayed by `fkit-lead` (ADR-021/037); answer, verbatim: **"File it, end of Sprint 7
  (Recommended)"** — *"Sits right after 0323's dependencies; it can't start before 0325 is done anyway."* `0332`
  sits at the end of Sprint 7 (rank 6, directly after this task's row), depends on `0325`, and **blocks this
  task**. The *Depends on* line above now links it.

- 📌 **2026-09-29 — dependency repointed from `0325` to `0340` (append-only; the notes above are kept as written).** Added by a spawned `fkit-producer` at `fkit-lead`'s request, on an OWNER RULING given 2026-09-29 live via `AskUserQuestion` in the `fkit lead` session (ADR-021/037): **"Split it (Recommended)"** — *"Close 0325 as the S2 build (agent-closed). File a 'verify S2 live' task … at the top of Sprint 7, and a separate 'S3a enforce' build task after it."* `0325` closed as the S2 build (it checks the signature but still mints only `vfy:false`). Verified sessions now come from [`0340`](../0340-0325-s3a-enforce-mint-verified-sessions/brief.md), which waits on [`0339`](../../done/0339-verify-0325-s2-live-the-login-signature-check-in-production/brief.md) (verify S2 live) and an explicit owner approval. Where the notes above say *"`0325`"* as the verified-login dependency, read `0340`. `0332` (the join token) is unchanged and now also depends on `0340`.

### Open questions for the owner
1. What should the mark look like, and should it replace ★ for these players or sit next to it? (Asked at the
   plan gate.)
