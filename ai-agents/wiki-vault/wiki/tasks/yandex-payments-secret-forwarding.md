# `YANDEX_PAYMENTS_SECRET` Never Forwarded to the Profile Box

**Source**: `ai-agents/tasks/done/0195-forward-yandex-payments-secret-in-profile-deploy/brief.md`
**Status**: done
**Sprint/Tag**: Sprint 4 — config-parity track (`0063` → `0062` → `0195` → `0064` → `0060`)

> ✅ **Closed 2026-09-01 by a spawned producer — agent-closed, not owner-verified.**
>
> 🚨 **This does NOT mean production is fixed.** The task shipped as **built + Deferred Live Tail** (owner ruling R3, 2026-09-01). Its live-tail items **D1–D3 are unchecked**, gated on **`0014`** (Yandex has not issued the per-game key) **and** the pending profile deploy. **A profile deploy carried out today lands the variable EMPTY, and every `/v1/payments/*` route correctly keeps returning `503 {"error":"payments_unavailable"}`.**
>
> This is `0062`'s trap arriving on schedule: **a shipped diff is not a fixed production.**

## Goal

`build-deploy-profile.sh` stages the profile deploy environment by writing `printf "export <VAR>=%q\n"` lines into a 0600 temp file, SCPing it to the box and sourcing it. **`YANDEX_PAYMENTS_SECRET` was not one of those lines.** Downstream, `setup-profile.sh` writes `YANDEX_PAYMENTS_SECRET=${YANDEX_PAYMENTS_SECRET:-}` into the container's `profile.env` — so the `:-` default fired and the line was written **empty**.

The application then failed closed, exactly as designed: `src/profile-server/Server.ts` reads the variable and logs a startup `warn` when empty, and `src/profile-server/Routes.ts` installs a `paymentsEnabled` middleware that answers **503** on `/yandex/intent`, `/yandex/complete` and `/yandex/reconcile` alike. **True on the real box since `0019` shipped.**

A second gap sat in the operator-facing template: `example.env.profile` did not mention the variable anywhere, so an operator doing everything right had no way to learn it is a deploy input. The fix was therefore **two edits, not one**.

Found 2026-08-28 during `0067`'s build, and owner-approved the same day as **its own task** rather than a one-line fix folded into `0067`'s review round — the stated reason being that this is a live money path deserving its own verification. Rank owner-confirmed 2026-08-28: directly below `0062` on the config track.

## Key Changes

**Scope: the profile deploy pipeline and its config template. No application code** — `Server.ts` and `Routes.ts` already behaved correctly, and the fail-closed semantics were deliberately not weakened.

| File | Change |
|---|---|
| `build-deploy-profile.sh` | The variable joins the staged-env `printf "export …=%q\n"` block, matching the pattern the three Telegram variables established during `0067`, including the `:-` default |
| `example.env.profile` | The variable is documented in the commented *"Secrets — put these in `.env.profile.secret`"* list, naming `0014` as where the value comes from and stating that **blank is a supported state** |

**Log loudness was considered and deliberately left alone.** `0062`'s lesson was that a `debug`-level miss is invisible; this one is already at `warn`, a level better — but it fires once at startup and never again, so a deploy that quietly loses the value looks identical to one that never had it. The recommendation of record is to leave the level alone and let `0064` be the mechanism that catches it.

**One fact was handed to `0064` rather than built here.** `YANDEX_PAYMENTS_SECRET` must go on `0064`'s allowlist **as explicitly optional, with the reason recorded, until `0014` issues the key**, and be flipped to required afterwards. Getting it backwards in either direction is harmful — marked required today, the guard fails every profile deploy on a variable nobody can yet supply; left unlisted forever, the guard never catches the defect it was built for. **No guard was implemented in this task.**

## Outcome

- **The plumbing is fixed in the repository. Production is not fixed.** The value still does not exist to forward, because `0014` has not issued it.
- ⚠️ **Verification steps 3–5 are the Deferred Live Tail and are unchecked.** They require a real profile deploy *with a value configured*, and the brief's own gate is deliberately sharp: confirm the on-box value is **non-empty, not merely present** — a variable that is forwarded but unset locally still lands empty, **which is this exact bug with the fix applied**. Check the value's *length*, never its content.
- ⚠️ **The end-to-end payments check is owner-gated and was not run.** `/yandex/intent` creates DB rows without checking a signature, so driving it with a throwaway value would write junk intents into the production profile DB. Full end-to-end verification with a *real* signed payload belongs to `0065`, not here.
- **Fail-closed must keep working.** The point of the task is to make the value *reach* the box, never to weaken the guard that fires when it has not.
- **`0065`'s gate count did NOT drop.** `0195` is a gate now **satisfied, not removed** — `0065`'s board row still states **three** conditions (`0014`, `0062`, **and** `0195`), owner-ruled, and the routes still 503 today because `0014` has not issued the key.
- 🔒 **This task is *about* a credential.** Only the variable **name** appears in its record — never a value, not even truncated, not even "starts with".

## Related

- [[decisions/config-parity-failure-class]] — the recurring class this is the **third** instance of, and the first outside `deploy.sh`
- [[tasks/prod-api-env-https-apex]] — task `0063`, the one instance of the class fixed, deployed and evidenced
- [[tasks/yandex-payments-implementation]] — task `0019`, which introduced the variable and the fail-closed 503
- [[tasks/citizenship-name-change]] — task `0067`, during whose build this gap was found and whose Telegram variables supplied the forwarding pattern
- [[systems/player-profile-store]] — the profile service whose payments routes this gap 503s
- [[systems/configuration]] — deploy-environment plumbing and runtime config
- [[decisions/sprint-4]] — the sprint board carrying the config track
- [[decisions/sprint-backlog]] — where `0064`, the guard that must land after this, is tracked
- [[tasks/dependency-declaration-sweep]] — task `0196`, which used this brief's explicit `Depends on: nothing.` as wording to copy
- [[tasks/container-log-retention]] — task `0060`, the last item on the same owner-ruled config-track execution order
