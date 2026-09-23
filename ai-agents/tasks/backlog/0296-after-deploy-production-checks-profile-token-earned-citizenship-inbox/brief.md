# After-deploy production checks — profile token, earned citizenship, personal inbox (moved out of `0062`, `0017`, `0012`)

> ## ⚠️ Deploy-time forget-risk — READ BEFORE THE NEXT PRODUCTION DEPLOY
>
> *Carried forward from [`0062`](../../done/0062-forward-profile-internal-token-in-deploy/brief.md)
> (recorded there 2026-09-04) so that closing `0062` does not bury it. This is the brief a deployer now
> opens.*
>
> `deploy.sh` forwards whatever value of `PROFILE_INTERNAL_TOKEN` the local shell has — **correctly**
> (`deploy.sh:312`). So a production deploy run with a **non-empty** local value **turns on profile
> upsert and match-XP crediting in production**. If that is not what you intend for this deploy, you
> must blank the value **by hand**.
>
> - **Blanking the value is a MANUAL step with no automated guard.** Nothing in the repo checks it.
> - **`npm run check:config-parity` does NOT catch this.** It compares variable **names only**
>   (`scripts/check-config-parity.mjs` "never opens a `.env` file, never reads the process
>   environment"). A value being intentionally blank is outside what it can see, by design.
> - `0054`'s client flag (`CITIZENSHIP_CARD_ENABLED`, default OFF) hides the citizenship **card**, but
>   it does **not** stop server-side upsert or XP crediting.
>
> **Before every prod deploy: decide deliberately whether this value should be blank, and do it by
> hand.**
>
> 🔴 **RULED 2026-09-04 — NO GUARD WILL BE BUILT. Owner, verbatim: *"Neither — I'll just
> remember."*** Two options were put to the owner — an automated guard at deploy time, or a deploy
> checklist item — and **both were declined.**
> ⛔ **This is a DECISION, not an oversight. Do NOT file a task for it, and do NOT re-recommend one.**
> ⚠️ **The risk is ACCEPTED, not removed. The manual step is the control.**
>
> 📌 For the **weekend deploy slot** specifically, the owner ruled on **2026-09-19** that crediting is
> turned **on** — i.e. `PROFILE_INTERNAL_TOKEN` is deployed **non-empty** in that slot
> ([`weekend-deploy-slot-runbook.md`](../../../knowledge-base/weekend-deploy-slot-runbook.md)). That is
> what makes section A below runnable at all.

## ID
0296

## Sprint
Sprint 5

## Priority
— *(unranked — ⚠️ **the owner ruled the BOARD, not a rank**; unranked ≠ low.)* ⚠️ No rank was ruled —
flagged for owner confirmation. **On merit this belongs directly below `0295`**, because `0295` (the
game-prod egress IP on the profile allowlist) must be done for the weekend deploy slot to credit at
all, and section A of this task is the observation of that slot.

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**Filed 2026-09-23 on an OWNER RULING given live in the `fkit lead` session via `AskUserQuestion`,
relayed by `fkit-lead` to a spawned `fkit-producer` holding no owner channel (ADR-021).** ⛔ Not
producer precedent. The owner's goal, in substance: *close `0062`, and move its production checks into
a separate after-deploy task, so tasks that depend on `0062` are no longer blocked.* The owner then
ruled, the same day:

1. **Close `0062`** (built + reviewed 2026-08-24; D5 passed locally 2026-09-23). Its remaining
   production checks D1–D4, plus the production half of its verification step 6, move **here**. This
   **supersedes** the 2026-09-04 ruling that kept `0062` open in Sprint 4.
2. **"Move their checks too"** — the remaining production-only checks (the *Deferred Live Tail*) of
   [`0017`](../../done/0017-citizenship-earned/brief.md) and
   [`0012`](../../done/0012-personal-inbox/brief.md) also move **here**, and both tasks close as built +
   reviewed.
3. **The local browser check is WAIVED** for `0012` (its plan §6 browser step) and `0017` (its
   verification step 3). The live checks in section B below (**B2**, ex-`0012` live item 2; **B1**,
   ex-`0017` live item 3) cover it. ⚠️ **Accepted tradeoff: nobody sees the Personal tab in a browser
   until after launch.**
4. **The citizenship flip is NOT in this task.** Setting `CITIZENSHIP_CARD_ENABLED` to `true` plus the
   second game deploy is owned **only** by
   [`0065`](../0065-citizenship-paid-live-verification/brief.md) **§6**. It was removed from `0017`'s
   live tail. (Owner ruling 2026-09-22, *RUNBOOK-A*: the flip is a launch decision, not a verification
   step, and does not ride a deploy slot.)
5. **Two sections, one task.** Section A runs **after the weekend deploy slot** where
   `PROFILE_INTERNAL_TOKEN` is set non-empty (owner ruling 2026-09-19). Section B runs **after the
   citizenship flip** (owned by `0065` §6), because the card and the Personal tab are both hidden
   behind `CITIZENSHIP_CARD_ENABLED` until then.

**Why these checks could not run before.** `0062`'s D2 was run 2026-09-04 and read **empty** — but
the owner had deliberately blanked the token before the 2026-08-29 deploy, so the result was
**inconclusive**: forwarding an empty value and never forwarding at all look identical at the
container. The forwarding code has **never been exercised with a real value**. The weekend deploy slot
is the first deploy with a non-empty value.

**Where the step text lives.** Every check below cites its source. The full original text (and, for
A1, the exact verdict-only script) stays in the closed tasks:
[`0062/worklog.md`](../../done/0062-forward-profile-internal-token-in-deploy/worklog.md) § *Deploy-pending*,
[`0017/brief.md`](../../done/0017-citizenship-earned/brief.md) § *Deferred Live Tail*,
[`0012/brief.md`](../../done/0012-personal-inbox/brief.md) § *Deferred Live Tail*. The weekend runbook
carries A1–A4 as checkboxes (W11, W13, W14).

## What to build

Nothing is built. This task **runs and records** production checks. Record each result (pass / fail /
inconclusive, with the evidence) in this folder's `worklog.md`. A failure found here becomes its own
task — not silent scope growth here.

### Section A — After the weekend deploy slot (token deployed non-empty)

- [ ] **A1 (ex-`0062`-D1) — token-match pre-check.** Run the verdict-only script from
      `0062/worklog.md` § *Deploy-pending* (the **2026-09-04 corrected** form that sources the env
      files the way `deploy.sh` does — ⛔ never the superseded `grep`/`cut` form). It prints only
      `MATCH` / `MISMATCH` / `LOCAL-ABSENT` / `REMOTE-ABSENT` — never a value, never a hash.
      ⛔ **On `MISMATCH`: fix local `.env.prod` from the VPS-persisted token. NEVER regenerate the VPS
      token** (stability contract, `setup-profile.sh`).
- [ ] **A2 (ex-`0062`-D2; also `0017` and `0012` live item 1) — the token reaches the container
      non-empty.** `update.sh` deletes the env file after start, so read the running container's
      environment for **presence only** (`NONEMPTY` / `EMPTY`). How to read the result:

      | Container reads | Source value at deploy time | Means |
      |---|---|---|
      | non-empty | — | the forwarding fix is live |
      | empty | non-empty | **the fix did not work** — a real failure |
      | empty | blank | **nothing — inconclusive** (what happened on 2026-09-04) |

- [ ] **A3 (ex-`0062`-D3 / `0062` verification step 3; also `0017` and `0012` live item 1) —
      end-to-end proof.** Observe a production match: the worker log shows the match-credit result
      with **credited > 0**, and the profile row exists / XP incremented on the profile side. An
      actual authenticated call working end to end, not "the variable is present".
- [ ] **A4 (ex-`0062`-D4 + the production half of `0062` verification step 6) — no warning, no
      leak.** With both variables set, the partial-configuration warning must **not** fire in prod
      logs; **and** the token value appears in **no** log line and **no** deploy output.
- [ ] **A5 (ex-`0017` live item 2) — real XP accrual.** A logged-in Yandex player completes a
      qualifying match and the profile row's `xp` increments (psql on the box).
- [ ] **A6 (ex-`0017` live item 3, server-side half) — live grant.** Seed a real test account in the
      prod DB **one qualifying match's award below the threshold**, play one qualifying match, and
      confirm `is_citizen` flips to `true` and `citizenship_earned_at` is set.
      ⚠️ **Use the XP figures actually live in production at the time.** `0017`'s brief marks every
      figure as *pending the `0211` rescale* (shipped behaviour there: 10 XP per match, 1,000
      threshold; after `0211`: 1 XP per match, 100 threshold). Seeding against the wrong threshold
      makes the step pass without testing anything.

### Section B — After the citizenship flip (owned by `0065` §6)

⛔ **The flip itself is NOT this task's.** It is `0065` §6 alone. These checks run once a production
build with `CITIZENSHIP_CARD_ENABLED = true` is live.

- [ ] **B1 (ex-`0017` live item 3, card half) — card State 3 in the live iframe.** For the A6
      account, the citizenship card shows State 3 (ГРАЖДАНИН) in the live Yandex iframe.
- [ ] **B2 (ex-`0012` live item 2; also covers the WAIVED local browser check of `0012` plan §6 and
      `0017` verification step 3) — the inbox message.** A real citizenship grant in prod produces the
      inbox message, visible in the Personal tab in the live Yandex iframe; read state persists across
      two devices/sessions against the prod DB. The bell dot shows for the unread message and clears
      once the tab is opened.
- [ ] **B3 (ex-`0012` live item 3) — citizen gating.** A non-citizen sees **no** Personal tab, checked
      against prod data. ⚠️ **This proves NOTHING while `CITIZENSHIP_CARD_ENABLED` is off** — the tab
      is hidden for everyone then (`0012` accepted residual D5). Run it only after the flip.

## Verification steps

1. Every A and B box above is checked, or explicitly owner-waived, with its evidence recorded in
   `worklog.md` (command or observation, result, date).
2. A2 is recorded with **both** halves of the reading: what the container showed **and** whether the
   source value was non-empty at deploy time. An empty reading without the second half is not a
   result.
3. No token value, hash of a value, DSN, endpoint secret or IP address appears in any artifact this
   task writes.
4. Any failure is filed as its own task and linked from the worklog.

## Notes

- **Depends on:** `0217` (P2 — wiring the game server to the profile box; its weekend deploy slot, with `PROFILE_INTERNAL_TOKEN` non-empty, is what section A observes) for section A; `0065` §6 (the citizenship flip, `CITIZENSHIP_CARD_ENABLED` → `true` plus a second game deploy) for section B.
- **Blocks:** ~~`0065` — its former `0062` condition ("`PROFILE_INTERNAL_TOKEN` forwarded to prod and verified end to end") now points here (A2–A3).~~ **Nothing in Sprint 4 — 2026-09-23, owner ruling, verbatim: *"Keep it in Sprint 5, but the task shouldn't block Sprint 4."*** A2–A3 still run **here**, in Sprint 5, but no longer gate `0065` (recorded as `0065` Correction 6). 🚨 **Accepted, owner-ruled tradeoff:** `0065` / paid-citizenship go-live can close without production proof that the token reaches the container and a credit call lands end to end. The **Depends on** line above (section B after `0065` §6) is unchanged.
- **Related:** `0062`, `0017`, `0012` (closed 2026-09-23, agent-closed — not owner-verified; their
  check text lives in their folders under `ai-agents/tasks/done/`); `0238` (kill-switch check at
  launch); `0211` (the XP rescale that decides A6's figures).
- **Section A and section B run at different times.** Section A can be fully recorded long before
  section B is runnable. The task closes only when both are done or owner-waived.
- ~~📌 **`0065`'s ordering problem is NOT solved here and is kept visible.** `0065` §6 says flip only
  after its steps 1–4 pass, but its step 3 (the real test purchase) needs the flip first. Whoever takes
  the launch decision resolves that — this task does not.~~ ✅ **RESOLVED 2026-09-23 by owner ruling
  (`0065` Correction 7):** *"Launch, and leave the test task for the Sprint 5. The test-buy sequence
  will be run by me (human)"*. `0065` is now the go-live (§6) only; its §1–§5 moved to
  [`0297`](../0297-paid-citizenship-owner-run-test-buy-sequence/brief.md) (Sprint 5). **Section B's
  dependency on `0065` §6 is unchanged** — it still runs after the flip, as does `0297`.
- **No secrets in any artifact.** `PROFILE_INTERNAL_TOKEN` is a credential. It must never appear in
  this brief, the worklog, a log line, a commit, or deploy output — presence/absence and verdicts only.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
