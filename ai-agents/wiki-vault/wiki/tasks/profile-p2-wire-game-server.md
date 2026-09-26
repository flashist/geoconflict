# P2 — Wire the Game Server to the Profile Box, and Prove a Credit Call Lands

**Source**: `ai-agents/tasks/done/0217-profile-p2-wire-game-server-to-profile-box/brief.md`
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 5 (moved from Sprint 4 on 2026-09-23) · task `0217` · phase P2 of epic `0213`

> 🚨 **READ THIS FIRST — XP CREDITING IS LIVE IN PRODUCTION, AND NO HUMAN VERIFIED THIS CLOSE.**
> Closed **2026-09-26** by a spawned `fkit-producer` on an **owner ruling** given live in the
> `fkit lead` session (*"Which tasks should the producer close now?"* — the owner picked `0273`, `0217`,
> `0272` and `0220` together, with the residuals below shown to them). No owner channel in the spawn
> (ADR-021, ADR-033 §5) ⇒ **`(agent-closed — not owner-verified)`**.

## Goal

Turn a running profile box into a working feature: point the game server at the box, give it the
**same** `PROFILE_INTERNAL_TOKEN` the box holds, make sure the box's `/internal/` allowlist admits the
game server's current egress address, deploy the game server, and **prove a real credit call lands end
to end**. That last check (`0062`'s D3) is the acceptance criterion.

**Why the check had to be a real call:** two independent barriers sit on this path, and each fails
quietly and **destroys XP rather than queueing it** ([[decisions/adr-101-fail-soft-xp-crediting]]):

| Barrier | Failure | What the game server sees |
|---|---|---|
| **1 — the shared token** | `internalAuth` is a constant-time compare on a **shared** secret; a mismatch is a **401** on every credit call | two WARN lines per failed batch — logged, but nothing reads that log (`0219`) |
| **2 — the IP allowlist** | nginx `allow …; deny all;` on `/internal/`; a stale address is a **403** on every credit call | the same two WARN lines |

⇒ A 401 or 403 looks like "working" from the game server. Only an authenticated call succeeding end to
end catches either. *(An earlier claim that these were "silently swallowed at debug" was refuted
against the source on 2026-09-10 — they log at WARN; the XP-loss half stands.)*

## Key Changes

This task was **operator work plus verification**, not new code:

- **Step 0 — run the migrations** (idempotent: each file applied once, recorded in `schema_migrations`).
  This also settled whether `0067`'s name-change migration `004` had ever been deployed (Q9).
- **Steps 1–2 — set `PROFILE_API_URL` and `PROFILE_INTERNAL_TOKEN`** in the game's production env.
  "Matching is the whole point": not "set", not "non-empty" — the same value on both sides.
- **Step 3 — the allowlist**, measured by task `0295` (see [[tasks/game-prod-egress-ip-allowlist]]).
- **Step 4 — deploy the game server** at the owner-chosen window.
- **Depends on** the five identity slices of [[tasks/profile-identity-epic]] (`0270`–`0274`), on the
  `006` restore re-proof ([[tasks/profile-backup-restore-reproof-006]]) and on the `/internal/`
  case-variant fix ([[tasks/internal-path-case-variant-allowlist-bypass]]) — all before the token was
  set.

**The blank-token history, kept because it explains old records.** 2026-09-04: the owner kept the token
deliberately blank for game deploys (citizenship not ready) and declined any guard (*"Neither — I'll
just remember."*). 2026-09-19: the owner ruled the token is set **at** the weekend slot, against the
recommendation to prove S3/S4 live first — the tradeoff was stated and accepted. 2026-09-24: the
blank-by-hand rule was **retired** (*"Retire it"*) — the token is always set in prod now, and a blank
one is `REQUIRED`-missing in the prod value check. See [[tasks/forward-profile-internal-token]].

## Outcome

✅ **Acceptance criterion met 2026-09-26 (runbook W14).** Owner-executed on the boxes; output read by
`fkit-lead`; recorded by a spawned producer. Counts and verdicts only:

| Verification step | Verdict |
|---|---|
| 1 — a real call end to end (D3) | ✅ `player_match_xp_credits` **13 rows, 5 games, 13 XP** (1 XP per credit, [[decisions/adr-111-xp-economy-rescale]]); **9 players** with XP > 0; game log repeatedly `match credit results: 1 credited, 0 duplicate, 0 no_profile, 0 error`; **0** error-level profile lines on either side |
| 2 — token non-empty in the container (D2) | ✅ `NONEMPTY`, and the source was non-empty and **equal** to the box's (A1 `MATCH`) |
| 3 — `players` + `player_identities` + `(game_id, player_id)` credit | ✅ **41 players / 41 identities** (0 before) and the 13 credit rows |
| 4 — partial-config warning (D4) | ⚠️ **half.** Does not fire with both set ✅; "fires when it should" is shown **by tests only** |
| 5 — unset case (D5) | ✅ passed locally 2026-09-23 |
| 6 — token never printed | ✅ 0 in game logs; ⚠️ the deploy log was checked for the assignment string, not the bare value |
| 7 — allowlist measured, method recorded | ✅ via `0295` — the address was already listed, so nothing was edited |
| 8 — `schema_migrations` | ✅ `001`–`004` and `006` "already applied", no `005` ⇒ **Q9 answered: `004` was already deployed before 2026-09-26** |
| 9 — name-change routes not 404 | ✅ request → 400, cancel → 401 (a made-up control route → 404); internal `decide` → 401 on the box |
| 10 — no values in any artifact | ✅ |

🚩 **Watch item F-B — two slow `resolve` calls.** Two `players/resolve request failed (attempt 1/3):
TimeoutError` warnings, about ten minutes apart, each a stall past the **10 s** per-attempt timeout; a
retry succeeded both times. **No cause is known and none is asserted.** A one-off resource snapshot on the
profile box a few minutes later showed no starvation (it rules out a sustained squeeze, not a brief one).
👁️ **W15 counts** two strings in the game container log: `players/resolve request failed` (slow,
retried) and `failed after retries` — **the latter must stay 0**, because its credit-batch form drops
awards, which is **lost XP**. The watch stays in the runbook. See [[systems/weekend-deploy-window]].

## Related

- [[systems/player-profile-store]] — the backend this task connected to players
- [[tasks/profile-identity-epic]] — epic `0266`, whose five slices had to be live first
- [[tasks/profile-identity-s3-game-server-resolve-and-credit]] — task `0272`, whose live proof is this task's V1/V3
- [[tasks/profile-identity-s4-client-login-session]] — task `0273`, deployed in the same game deploy
- [[tasks/forward-profile-internal-token]] — task `0062`, whose D1–D5 checks ran here (as `0296` A1–A4)
- [[tasks/game-prod-egress-ip-allowlist]] — task `0295`, this task's Q4 (the egress address)
- [[tasks/profile-box-adopt-and-reprovision]] — task `0215` (P1), the box this wires to
- [[tasks/profile-match-end-crediting]] — the crediting path this switched on
- [[tasks/citizenship-name-change]] — task `0067`, whose migration `004` status (Q9) this settled
- [[decisions/adr-101-fail-soft-xp-crediting]] — why a dropped credit is lost, not queued
- [[systems/weekend-deploy-window]] — the 2026-09-26 window that executed this task
- [[decisions/sprint-5]] — the board that tracked its close
- [[systems/project-brief]] — product ground truth; its "game server is not wired" bullets are history since this task
- [[tasks/profile-secret-persistence-value-parity]] — task `0220`, closed in the same owner ruling
- [[tasks/credit-participation-xp-elimination-or-match-end]] — task `0211`, the crediting rule these real credits follow
- [[tasks/profile-backup-restore-reproof-006]] — task `0275`, a precondition before the token was set
- [[decisions/adr-111-xp-economy-rescale]] — the 1 XP per credit recorded at W14
- [[tasks/after-deploy-production-checks]] — task `0296`, the production checks moved out of `0062`/`0017`/`0012` — all passed 2026-09-26
