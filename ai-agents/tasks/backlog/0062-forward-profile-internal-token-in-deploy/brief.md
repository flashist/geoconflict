# `PROFILE_INTERNAL_TOKEN` is never forwarded to production — the profile client silently no-ops

## ID
0062

## Sprint
Sprint 4

## Priority
⚠️ **Confirmed Sprint 4 blocker.** Second only to `0063` on the config track — `0063` breaks something
for users *now*, this blocks `0017`/`0018` from ever working. Cheapest high-value item in the sprint:
the fix itself is one line.

## Status
🚧 Blocked — built + reviewed 2026-08-24 (Ready to merge, validation-gated); **deployed 2026-08-29 in `362a2f9` — INFERRED from commit ancestry, NOT verified**; ~~verification D1–D5 not yet run~~ **D2 WAS RUN 2026-09-04 and returned an EMPTY token — the result is INCONCLUSIVE, neither confirming nor refuting the fix, because the owner deliberately blanked the value before the 2026-08-29 deploy** (correction 2026-09-04); D1 and D3–D5 not yet run. **The blocker is citizenship readiness + outstanding profile VPS setup work — NOT an unrun command.**

⚠️ **Why the word "inferred" is load-bearing here.** The fix commit `680fb2d` (2026-08-24) **is** an
ancestor of the production deploy commit `362a2f9` ("DEPLOY prod: bump version to 0.0.140",
2026-08-29) — `git merge-base --is-ancestor 680fb2d 362a2f9` returns true — and
`git show 362a2f9:deploy.sh` carries the forwarding line at `:292`. **None of that is proof the fix
is live.** `deploy.sh` runs from the owner's **local working tree** at deploy time, not from a
committed tree, and what that tree contained on 2026-08-29 is **not recoverable from git**.
~~**`D2` is the step that turns this inference into fact** — reading the running container's
environment for a non-empty `PROFILE_INTERNAL_TOKEN` (worklog, Deploy-pending section). Until D2
runs, "live in production" is an inference and must be written as one.~~

📌 **CORRECTED 2026-09-04 — the sentence above was true only under a condition it never stated.**
`D2` turns the inference into fact **ONLY on a deploy whose source value was non-empty.** Reading an
empty variable out of the container proves nothing: **forwarding an empty value and never forwarding
at all are indistinguishable at the container** — both produce an empty variable. So the correct
reading of `D2` is:

| What `D2` reads in the container | What it proves |
|---|---|
| **non-empty** `PROFILE_INTERNAL_TOKEN` | The fix is live. Inference → fact. |
| **empty**, and the source `.env.prod` value was non-empty at deploy time | The fix did **not** work. A real refutation. |
| **empty**, and the source value was **blank** at deploy time | **Nothing. Inconclusive.** ← this is what happened on 2026-09-04 |

"Live in production" stays an inference and must still be written as one.

### 🚩 D2 was run 2026-09-04 — the result is INCONCLUSIVE, not a refutation and not a confirmation

**Do not re-run `D2` and read an empty result as a failure of the fix.** What was established on
2026-09-04, against the live production container:

1. The prod `geoconflict-prod` container reports `PROFILE_INTERNAL_TOKEN` as **empty**.
2. The container has been up ~6 days — consistent with the 2026-08-29 deploy of `362a2f9`.
3. **The owner deliberately blanked the value before that release**, to keep the citizenship logic
   switched off. The empty variable is an intended state, not a deploy defect.
4. `deploy.sh:312` carries `PROFILE_INTERNAL_TOKEN=${PROFILE_INTERNAL_TOKEN}` — **this task's fix is
   present in the script** (it sat at `:292` in `362a2f9`; the shift is `0064`'s guard, nothing
   token-related).
5. The local `.env.prod` now holds a **non-empty** value for that key again, restored since that
   deploy.

**Therefore:** the 2026-08-29 deploy exercised this fix with an empty input, so it could not test the
fix in either direction. **The code path has never been exercised with a real value.** The earlier
"deployed 2026-08-29, INFERRED from commit ancestry" claim is **not refuted** — the fix was genuinely
in the deployed tree — it remains **unverified**, and we now know *why* it cannot be verified yet.

### 🚧 The real blocker is structural, not a missing command

This task cannot be verified while the owner deliberately keeps the token blank. **Owner, 2026-09-04,
verbatim:** *"I probably will keep it blank again, because the citizenship is not fully ready to be
deployed yet and we need to do some additional work in terms of the profile VPS setup."*

So the blocker on `0062` is **citizenship readiness + the outstanding profile VPS setup work** — not
"nobody has run `D2` yet". Any task blocked on `0062` inherits that reason: `0017` and `0012` (their
Deferred Live Tails) and `0065` (one of its three conditions).

### ⚠️ Deploy-time forget-risk — READ BEFORE THE NEXT PRODUCTION DEPLOY

The local `.env.prod` holds a **non-empty** value for `PROFILE_INTERNAL_TOKEN` today.
`deploy.sh:312` forwards whatever the local shell has — **correctly**. So a production deploy run
right now would forward a real token and **silently re-enable profile upsert and match-XP crediting
in production**, before citizenship is ready to go live.

- **Blanking the value is a MANUAL step with no automated guard.** Nothing in the repo checks it.
- **`npm run check:config-parity` does NOT catch this.** It compares environment variable
  **names only** — `scripts/check-config-parity.mjs` states it "never opens a `.env` file, never
  reads the process environment". It reports variables the app reads that a deploy never forwards;
  here the deploy forwards this one correctly, so there is nothing for it to report. A *value* being
  intentionally blank is outside what that tool can see, by design.
- `0054`'s client flag (default OFF) still hides the citizenship **card**, but it does not stop
  server-side upsert or XP crediting.

**Before the next prod deploy: decide deliberately whether this value should be blank, and do it by
hand.** Recorded 2026-09-04.

> 🔴 **RULED 2026-09-04 — NO GUARD WILL BE BUILT. Owner, verbatim: *"Neither — I'll just
> remember."***
>
> Two options were put to the owner — an **automated guard** at deploy time, or a **deploy checklist
> item** — and **both were declined.** They will blank `PROFILE_INTERNAL_TOKEN` by hand at each
> deploy.
>
> ⛔ **This is a DECISION, not an oversight. Do NOT file a task for it, and do NOT re-recommend one.**
>
> ⚠️ **The risk above is ACCEPTED, not removed.** It stays written here, at the top of the task a
> deployer opens, because that is the only place it can do any good. **The manual step is the
> control.**

> 🔴 **THIS TASK STAYS IN SPRINT 4 — owner ruling 2026-09-04, given live in session, OVER the
> producer's recommendation to move it to the Backlog board.** The producer's argument was that the
> task is structurally blocked on profile-VPS work and would sit unworkable in the sprint; **the owner
> chose to keep it here.** ⛔ **Recorded, not re-argued.** The work that discharges it is
> [`0217`](../0217-profile-p2-wire-game-server-to-profile-box/brief.md) (P2).

*(Marker set by the lead 2026-08-24 per producer recommendation. **Reworded 2026-09-04 on an owner
ruling given live in session**: the previous wording — `awaiting deploy proof (D1–D3)` — was stale in
one direction, sending a reader to wait for a weekend deploy that has probably already happened.
Asserting "deployed" flatly would be the opposite overclaim, so both halves are kept. Status token
unchanged: still `🚧 Blocked`.)*

*(Filed to the Backlog board 2026-08-23 with the blocking claim marked **unverified**. Verified the
same day — it holds — and promoted into Sprint 4. The promotion follows the dependency, exactly as
`0057`'s did.)*

## Owner
fkit-coder

## Context

From §9 of the 2026-08-22 incident record (loose ends, unrelated to that outage):
[`ai-agents/knowledge-base/incidents/2026-08-22-prod-public-lobbies-empty-outage.md`](../../../knowledge-base/incidents/2026-08-22-prod-public-lobbies-empty-outage.md)

`.env.prod` defines `PROFILE_INTERNAL_TOKEN`, but **`deploy.sh` never sends it to the server.** The
remote env heredoc (`deploy.sh:279-308`) writes the production `.env` file, and it passes
`PROFILE_API_URL` (`deploy.sh:291`) — but there is no `PROFILE_INTERNAL_TOKEN` line anywhere in it.

**Verified 2026-08-23:** `grep -n "PROFILE_API_URL\|PROFILE_INTERNAL_TOKEN" deploy.sh` returns exactly
one hit, line 291, for `PROFILE_API_URL`. The token is genuinely absent.

The profile-backend client is **fail-soft by design** — `ProfileApiClient` is documented in
`src/server/Worker.ts` as a "no-op when `PROFILE_API_URL` / `PROFILE_INTERNAL_TOKEN` are unset". So
nothing crashes, nothing errors, and nothing logs. **The profile integration is simply switched off in
production and has been silently.**

### 🚨 VERIFIED 2026-08-23 — this blocks `0017` and `0018`. It is not a config nit.

This was filed as a *plausible* blocker with the tracing left as step 1. **The tracing was done and
the claim holds.** The full chain, each link with evidence:

1. `ProfileApiClient.isConfigured()` (`src/server/ProfileApiClient.ts:131-133`) requires **both**
   `baseUrl().length > 0` **and** `token().length > 0`.
2. `token()` (`:127`) reads `process.env.PROFILE_INTERNAL_TOKEN ?? ""` — and `deploy.sh` never
   forwards it, so it is `""` in production.
3. Therefore `isConfigured()` is **false in production**, and **every** profile call returns early:
   `upsertProfile()` (`:60-63`) and `creditMatch()` (`:86-89`).
4. Those are called on the live paths — `GameServer.ts:1217` (upsert at client join, via
   `upsertProfileForClient`, reached from `:274` and `:374`) and `GameServer.ts:1281` (credit at match
   end, via `creditMatchXp` from `:1189`).
5. The miss is logged at **`debug`** level (`logDisabledOnce`, `:140`) — effectively invisible in
   production.
6. **Independently, the profile server fails CLOSED on an empty token** (`src/profile-server/InternalAuth.ts:26`).
   So even if the game server did send, every request would be rejected. Two independent barriers.

**Net effect in production today: no profile row is ever created, and no XP is ever credited.**

**What that blocks:**

- **`0017` — Earned Citizenship.** Its brief requires the profile store live (`:19`) and fires
  citizenship server-side at match end as a side effect of `creditMatchXp()` (`:26`). No XP is
  credited, so **the 1,000 XP path can never trigger.**
- **`0018` — Paid Citizenship.** Needs a profile row, which `upsertProfile()` never creates.

**Why this is a blocker but not a live player-facing bug.** No player currently sees a broken XP
counter, because `0054` (Done) hides the citizenship card behind a client config flag defaulting
**OFF**. So the damage is entirely to *future* work — which is why `0063` outranks this one, and why
this still cannot wait until after `0017`/`0018` start.

### Same shape as `0061`

`0061` is also an env var not reaching production. Two independent instances suggest the real defect
may be in **how `.env.prod` and the deploy heredoc are kept in sync** — nothing checks that a variable
the application needs is actually forwarded. Worth considering a general guard, not just this one
variable. See step 4.

## What to build

1. ~~**Establish the blast radius first.**~~ **DONE 2026-08-23 — see the verified chain above.** The
   answer: `isConfigured()` is false in prod, `upsertProfile()` and `creditMatch()` both no-op, and
   `0017`/`0018` are both blocked. **Do not re-run this trace.** Two things are still worth confirming
   as you implement: whether any *other* caller depends on `ProfileApiClient`, and whether the
   `debug`-level miss log (`:140`) should be part of the step-3 change.

2. **Forward the variable.** Add `PROFILE_INTERNAL_TOKEN=${PROFILE_INTERNAL_TOKEN}` to the remote env
   heredoc in `deploy.sh`, alongside `PROFILE_API_URL` at `:291`. Match the surrounding style exactly.

3. **Make the silent no-op audible.** A fail-soft client that logs nothing is what let this go
   unnoticed. At startup, when `PROFILE_API_URL` is set but `PROFILE_INTERNAL_TOKEN` is not, log at
   **`warn`** that the profile integration is running unauthenticated and will no-op. Fail-soft is
   the right behavior; **silent** fail-soft is not.

4. ~~**Consider a general guard, and recommend rather than build.**~~ **MOVED OUT 2026-08-23 by owner
   ruling — it is now task [`0064-deploy-time-config-parity-guard`](../0064-deploy-time-config-parity-guard/brief.md).**
   The reasoning moved there in full. **Do not redo the evaluation, and do not build a deploy-time
   guard under this brief.** `0064` is deliberately sequenced to land *after* this task: a guard that
   enforces before this fix ships would correctly fail the deploy and block the fix itself.
   One thing that would genuinely help `0064`: while you are in `deploy.sh`, note any **other**
   variable the app reads that is absent from the heredoc. **Report what you see; do not fix it here.**
   Each is either `0064`'s input or its own brief.

## Verification steps

1. ~~The blast-radius answer is written down.~~ **Already satisfied** by the verified chain in Context.
2. **The variable reaches the server.** After a deploy, the production `.env` file contains
   `PROFILE_INTERNAL_TOKEN` with a non-empty value. ⚠️ **Confirm it is non-empty** — the heredoc
   substitutes whatever the local shell has, so a variable that is forwarded but unset locally still
   arrives empty. That is exactly the failure mode suspected in `0061`.
3. **The application sees it.** A profile call that requires authentication succeeds in production.
   Not "the variable is present" — an actual authenticated call working end to end.
4. **The new warning fires when it should**, and does **not** fire when both variables are set.
5. **Nothing regressed for the unset case.** With `PROFILE_API_URL` unset (e.g. local dev), the client
   still no-ops cleanly and nothing crashes.
6. **The token is not printed anywhere** — not by the new warning, not by any log line, not in deploy
   output. Check `deploy.sh` does not echo the heredoc it writes.

## Notes

- **Depends on:** nothing. Ready to start now.
- **Blocks:** **`0017`** (Earned Citizenship) and **`0018`** (Paid Citizenship) — **verified
  2026-08-23, not speculative.** Both are marked `🚧 Blocked` on this task in `plan-sprint-4.md`.
  Neither can work in production until this ships.
- **Related:** `0061` (same shape: an env var not reaching prod), `0013` (profile store epic — its
  slices are complete, but the integration they feed is switched off in prod), `0060`, `0063`.

- **Placement.** Filed to Backlog 2026-08-23 with the blocking claim explicitly flagged unverified,
  then **verified the same day and promoted into Sprint 4.** The promotion follows the dependency:
  a confirmed blocker on two sprint tasks does not belong on an unranked, explicitly-unscheduled
  board. Same reasoning that moved `0057`.
- **Sequencing against `0063`.** Do `0063` first. Both are production config defects from the same
  sweep, but `0063` is broken for **users right now** while this blocks *future* work — `0054`'s flag
  (default OFF) hides the citizenship card, so no player currently sees a symptom of this one.
- **Do not modify the incident record.** Reference it.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **No secrets in any artifact.** `PROFILE_INTERNAL_TOKEN` is a credential. It must never appear in a
  brief, worklog, finding, log line, commit, or deploy output — this task is *about* a credential, so
  the risk of pasting one while working on it is unusually high. `.env*` is gitignored; keep it that
  way.
