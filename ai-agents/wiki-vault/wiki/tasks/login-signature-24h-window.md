# Accept Login Signatures up to 24 Hours Old, Checking the Player First (task 0391)

**Source**: `ai-agents/tasks/done/0391-accept-login-signatures-up-to-24-hours-old-checking-the-player-first/brief.md` (what was built and deployed: the same folder's `worklog.md`; `ai-agents/knowledge-base/weekend-deploy-slot-runbook.md` § *2026-10-06 — profile deploy `0391`*)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 7, rank 43 (append rank — on merit directly below `0373`) / task `0391`

> 🆕 **2026-10-07 sync — PROVEN IN USE, on under a day of data.** `0392` read the post-deploy login numbers:
> **stale 3.25 %** (was 33.8 %), `id_mismatch` 0.054 %, and **0** stale notes in any under-24 h bracket — the window
> works as built. ⚠️ ≈ 22.75 h, weekday-only, no weekend evening; night hours ran higher on tiny counts. See
> [[tasks/post-24h-window-login-read]]. The next profile deploy (`0340`, `0.0.156-profile.3`) followed on 2026-10-07 —
> [[tasks/verified-login-enforce-live]] — and **this task's image `0.0.156-profile.2` is now its rollback target**
> (still on the profile box). The *"whether `stale` really fell"* caveat below is answered.
>
> ✅ Done (agent-closed — not owner-verified). Built 2026-10-05 to the owner-approved plan and
> [[decisions/adr-121-login-signature-24h-window]]; committed in `6eef01f`. ✅ **DEPLOYED 2026-10-06** (owner-run
> profile deploy, Tuesday — a mid-week exception by owner ruling, ADR-122): version **`0.0.156-profile.2`**, commit
> `0aef613` (code = `6eef01f`, **`0391` only — `0340` is NOT in it**). ⚠️ **Deployed and healthy, not yet proven in
> use** — whether `stale` really fell toward ≈ 2.5 % is task `0392`'s read.

## Goal

Make the login signature check stop calling ~1 in 3 logins `stale`. [[tasks/stale-login-fix-decision]] (`0373`) showed
Yandex returns the same signed player data for a whole visit, so every reload more than 15 minutes in looked stale.
The owner chose *"24 hours (Recommended)"*. **Still shadow mode:** this changes only how logins are classified and
counted; every session stays `vfy:false` until `0340`.

## Key Changes

**Profile server (behaviour change):**
- `src/profile-server/PlayerSignature.ts` — `LOGIN_SIGNATURE_MAX_AGE_SECONDS` 900 → `86_400`; the 300 s future limit
  is unchanged. The `stale` result now carries the signed player id (only for the caller's compare — never logged,
  never a counter label, never returned).
- `src/profile-server/LoginVerification.ts` — **id first, then age** (ADR-121 Decision 2). A genuine note for another
  player is `id_mismatch` at any age; `stale` now means "right player, too old".
- **Stale-age brackets re-cut** (`src/profile-server/Telemetry.ts`): `0366`'s five sub-24 h past brackets are retired;
  the past side is now `past_24h_48h` / `past_48h_7d` / `past_over_7d`; the future side is unchanged (five values in
  all). Counter name, label key and the `outcome` counter's values are **unchanged**, so `0392` reads the same series.
- **Client: comments only — no game deploy needed.** The B4 300 s client refetch and the `0372` refetch diagnostic are
  **kept unchanged** (owner Q3: *"Keep both for now (Recommended)"*). The client's `Profile:Login:SignatureAge:*`
  labels stay frozen on `0366`'s edges, so they **no longer match** the server's `ok`/`stale` — see [[systems/analytics]].
- **`openAuthDialog`:** a fresh profile login already follows (static code trace — not exercised live). No change.
- ⚠️ **`ACCOUNT_SELECTION_DIALOG_CLOSED` handler: NOT BUILT — deferred by the owner** to task **`0394`** (Backlog
  board): *"I am not sure if we can control this user scenario or if Yandex Games sends us enough events/data about it.
  I suggest moving this part into a different task and move it to backlog, because this scenario is a rare one and it
  can be easily fixed by the user if the page is reloaded"*. ADR-121 Decision 3 is therefore decided but only partly
  built.
- **Tests:** freshness table and edges (86,400 / 86,401 s; 300 / 301 s ahead), id-first rows (another player's note at
  1 min and at 3 days → `id_mismatch`), a rebuilt no-leak route test, bracket sweeps. A mutation check (old age-first
  order put back) turned 4 tests red. Full `npm test` 194/194 suites green on the first run, twice (build and review).
- **Review:** one round, three low comment/doc findings (R1–R3), all fixed; ledger closed out.

## Outcome

**Deploy, 2026-10-06** (facts checked read-only by `fkit-lead`, relayed by a producer):
- Deploy record **08:09:49Z**; `/health` ok with `0.0.156-profile.2`, `/ready` 200; `profile-api` recreated and
  healthy, `postgres` untouched; 0 `warn`, 0 `error` in the first ~12 minutes.
- **Rollback target:** `0.0.156-profile.1` (commit `f712263`) — safe (no migration, all sessions `vfy:false`) but
  brings back the 900 s window.
- ⚠️ **Counters restarted at deploy — never compare cumulative values across it.** 08:09:49Z is the start of `0392`'s
  reading window.
- **Early login sample (~5 minutes only):** `ok` 45, `stale` 1 (~2 %, in the new `past_48h_7d` bracket), `id_mismatch`
  0. ⚠️ **Far too little data to judge** — an early sign only.
- **Game server:** credits kept flowing; one `player resolve failed after retries` warn during the restart (the
  retried-later kind, not a dropped-credit line) ⇒ a restart blip, **no XP lost**.
- ⚠️ The daily `profile-checks` run of 2026-10-06 08:00Z ran ~9 min **before** the deploy; the first run and the first
  backup on the new version were still to come (2026-10-07).
- **Follow-ups:** `0392` (read the post-`0391` numbers before `0340`'s deploy — Sprint 7), `0393` (watch paid citizens
  with data over 24 h old — Backlog), `0394` (re-login on account switch — Backlog, gates nothing).

## Related

- [[decisions/adr-121-login-signature-24h-window]] — the decision this builds
- [[decisions/adr-122-stale-login-gate-owner-judgment]] — the ruling that moved this deploy to a Tuesday
- [[tasks/stale-login-fix-decision]] — task `0373`, the readings and the owner's choice
- [[tasks/verified-login-enforce]] — task `0340`, the next profile deploy (rollback target `0.0.156-profile.2`)
- [[tasks/stale-login-signature-age]] — task `0366`, whose sub-24 h brackets this retires
- [[tasks/stale-login-client-diagnostics]] — task `0372`, whose client labels stay frozen
- [[decisions/adr-116-verified-login]] — superseded in part (the 900 s window)
- [[systems/player-profile-store]] — the profile server and its login route
- [[systems/analytics]] — the analytics reference's §A1 rewrite
- [[systems/weekend-deploy-window]] — the 2026-10-06 mid-week deploy record
- [[decisions/sprint-7]] — the board (rank 43)
- [[decisions/sprint-backlog]] — `0393` and `0394`, the two follow-ups filed there
- [[tasks/verified-login-live-check]] — task `0339`, the failed S2 check this answers
- [[tasks/verified-login-shadow-mode]] — task `0325`, which shipped the 900 s window
- [[tasks/post-24h-window-login-read]] — task `0392`, the post-deploy read (stale 3.25 %)
- [[tasks/verified-login-enforce-live]] — task `0395`, the next profile deploy; this image is its rollback target
