# `YANDEX_PAYMENTS_SECRET` Never Forwarded to the Profile Box

**Source**: `ai-agents/tasks/done/0195-forward-yandex-payments-secret-in-profile-deploy/brief.md`
**Status**: done
**Sprint/Tag**: Sprint 4 — config-parity track (`0063` → `0062` → `0195` → `0064` → `0060`)

> 🆕 **2026-09-26 — the open value-correctness question is SETTLED.** Two real purchases returned 200 from
> the complete route in production release `0.0.154` ⇒ the `YANDEX_PAYMENTS_SECRET` value on the box is
> the right one ([[tasks/citizenship-go-live]], [[tasks/citizenship-paid]]). ⚠️ Which HMAC construction it
> matched is still unknown (backlog `0309` → `0310`).

> ✅ **Closed 2026-09-01 by a spawned producer — agent-closed, not owner-verified.**
>
> 📌 **UPDATED 2026-09-23 — THIS TASK NO LONGER GATES `0065`, AND ITS OPEN QUESTION MOVED, NOT CLOSED.**
> Owner ruling (`0065` Correction 7), verbatim: *"Launch, and leave the test task for the Sprint 5. The
> test-buy sequence will be run by me (human)"*. `0065` is now **the go-live only** (§6: flip + second
> game deploy), with **no task condition**; its §1–§5 and **this task's open value-correctness
> condition moved to `0297` §1** (Sprint 5, run by the owner after go-live). ⛔ **The correctness
> question is NOT answered** — HMAC construction unconfirmed, secret value unconfirmed, reconciliation
> unexercised. 🚨 **Owner-accepted tradeoff: real players' first purchases may be the first real test.**
> Every *"`0065`'s gate count"* statement below is superseded as to the count. See
> [[decisions/sprint-5]].
>
> 🚨 **This does NOT mean production is fixed.** The task shipped as **built + Deferred Live Tail** (owner ruling R3, 2026-09-01). Its live-tail items **D1–D3 are unchecked**, gated on **`0014`** (Yandex has not issued the per-game key) **and** the pending profile deploy. ~~**A profile deploy carried out today lands the variable EMPTY, and every `/v1/payments/*` route correctly keeps returning `503 {"error":"payments_unavailable"}`.**~~ 🔴 **STRUCK 2026-09-19 — FALSE OF THE BOX AS IT STANDS; see the correction block below.**
>
> This is `0062`'s trap arriving on schedule: **a shipped diff is not a fixed production.**
>
> 🔴 **CORRECTED 2026-09-19 — THE PAYMENTS ROUTES ARE NOT 503ING, AND THE VALUE ON THE BOX IS NOT
> EMPTY.** Verified **read-only on the box** by `fkit-lead`, on an owner ruling given the same day.
> Three observations: a `POST` to a deliberately **non-existent sub-path** under `/v1/payments/` on the
> box's **loopback** answered **404, not 503** — so the `paymentsEnabled` middleware, which is mounted
> across the whole prefix ahead of every handler, **passed**; `YANDEX_PAYMENTS_SECRET` is **present in
> the running container, length 32** (⛔ **length only — the value was never read into any log, file or
> transcript**); and the startup warning `payments endpoints disabled` appears **0 times** in that
> container's logs.
>
> 🚨 **STATE THE LIMIT OF THIS EVIDENCE EXACTLY. It settles ONE question — "is a non-empty value
> there" — and NOTHING MORE.** It does **NOT** show the value is *correct*, and **no real purchase was
> exercised**. ⛔ **A page that now reads "payments work" would be as wrong as the one that read "they
> 503".**
>
> ~~⚠️ **The value's PROVENANCE IS UNVERIFIED.** Nothing observed shows `0014` issued a per-game key; a
> 32-character placeholder would present identically. **Do not read this as `0014` shipping.**~~
> 📌 **STRUCK 2026-09-20 — ANSWERED, not deleted. True when written; the placeholder worry was the right
> question and it was put to the owner.**
>
> ✅ **PROVENANCE ANSWERED 2026-09-20 — OWNER-ATTESTED: the owner set the real Yandex per-game key
> themselves.** The owner's answer, in substance: *"that's the real Yandex key, I set it."* ⇒ the
> per-game key **was issued** and the owner **deployed the profile box with it populated**. Authority: an
> **owner answer given live in the `fkit lead` session via `AskUserQuestion` on 2026-09-20**, relayed to
> a spawned producer holding no owner channel. 🔒 **Length only, still — the value has never been read
> into any log, file or transcript.**
>
> 🚨 **OWNER-ATTESTED, *NOT* REPO-VERIFIED — the two are different grades of evidence and must stay
> apart.** **A deploy leaves no artifact in git**, so nothing in this repository can confirm it. This
> carries **exactly the same standing as the 2026-09-12 key-issuance ruling: recorded as attested, never
> as repo-established.**
>
> ⛔ **IT STILL DOES NOT SHOW THE VALUE IS *CORRECT*, AND IT CLEARS NOTHING.** Provenance makes
> correctness **more likely**; it does not establish it. **No real signed payload and no real purchase
> has ever been exercised against this box.** ⛔ **A page saying "payments work" would be as wrong as one
> saying they 503.** Only `0065`'s **step 1** (a first real signed payload returning 200) and **step 3**
> (a real test purchase) settle correctness.
>
> ⛔ **THE FAIL-CLOSED CODE IS UNTOUCHED AND STILL CORRECT** — an empty secret still 503s the whole
> prefix, and `verifySignedPayload()` still returns null on an empty secret. What is corrected is only
> the claim that **this box** carries an empty one. `POSTGRES_PASSWORD`'s required / fail-closed
> behaviour is likewise unaffected.
>
> 🔴 **CORRECTED 2026-09-04 — THIS TASK'S PRODUCTION NARRATIVE IS UNVERIFIED.** ⚠️ **This supersedes an
> earlier same-day annotation here reading "DESCRIBED A BOX THAT NO LONGER STANDS"; that overstated the
> owner's position and is withdrawn.** Owner rulings, both given live in session 2026-09-04 and **both
> standing**: *"We don't have ANY profile-related VPS yet, we would need to have a full-scale setup for
> it (whatever is needed)"*, then *"We don't need to cancel any billings, the VPS and S3 I created will
> be reused."* 🔴 **Reconciled: the box exists and is reused in place; what runs on it is UNKNOWN AND
> UNVERIFIED.** Wherever this page says *"the real box"*, read it as **unverified — not disproven, and
> not claimable**: nobody has confirmed what that box serves.
> ⛔ **THE CODE FIX STANDS AND IS NOT UNDER QUESTION — do not read this correction as a finding against
> `0195`.** The fix was right; only its production narrative is corrected. The 503 behaviour it
> describes is what the code does with an empty variable, and it holds wherever a box carries an empty
> value. Wipe-and-rebuild onto the existing resources: `0213`–`0222` plus `0201`, all on Sprint 4. Grounding:
> `ai-agents/knowledge-base/reports/2026-09-04-profile-backend-clean-slate-survey.md`.
> ⚠️ **One finding of `0195`'s is BROADER than `0195` recorded:** the architect verified 2026-09-04 that
> `FEEDBACK_TELEGRAM_TOKEN`, `FEEDBACK_TELEGRAM_CHAT_ID` and `TELEGRAM_PROXY_URL` have **the same
> missing on-box persistence** — they do not follow `setup-profile.sh`'s persist-or-reuse pattern.
> `POSTGRES_PASSWORD` is **exempt**: it is required and fails closed.

## Goal

`build-deploy-profile.sh` stages the profile deploy environment by writing `printf "export <VAR>=%q\n"` lines into a 0600 temp file, SCPing it to the box and sourcing it. **`YANDEX_PAYMENTS_SECRET` was not one of those lines.** Downstream, `setup-profile.sh` writes `YANDEX_PAYMENTS_SECRET=${YANDEX_PAYMENTS_SECRET:-}` into the container's `profile.env` — so the `:-` default fired and the line was written **empty**.

The application then failed closed, exactly as designed: `src/profile-server/Server.ts` reads the variable and logs a startup `warn` when empty, and `src/profile-server/Routes.ts` installs a `paymentsEnabled` middleware that answers **503** on `/yandex/intent`, `/yandex/complete` and `/yandex/reconcile` alike. ~~**True on the real box since `0019` shipped.**~~ 🔴 **CORRECTED 2026-09-04: there is no real box — see the banner above.** True of the deployed configuration since `0019` shipped, on the box that then stood. 🔴 **UPDATED 2026-09-19 — that sentence describes the CODE with an empty variable, which is still exactly right, and it no longer describes THIS box:** a **non-empty** value (length 32, content never read) is present in the running container and the prefix answers **404, not 503**, on a missing sub-path. See the correction block at the top.

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

- **The plumbing is fixed in the repository.** ~~Production is not fixed. The value still does not exist to forward, because `0014` has not issued it.~~ 🔴 **STRUCK 2026-09-20 — the second half is FALSE: the key WAS issued and the owner deployed the box with it populated (owner-attested, see the correction block above).** ⚠️ **But "production is not fixed" survives for a DIFFERENT reason, and it must not be dropped along with the stale rationale: the value's CORRECTNESS is unproven and no real signed payload or purchase has ever been exercised.** ⛔ **Do not upgrade this bullet to "production is fixed".**
- ⚠️ **Verification steps 3–5 are the Deferred Live Tail and are unchecked.** They require a real profile deploy *with a value configured*, and the brief's own gate is deliberately sharp: confirm the on-box value is **non-empty, not merely present** — a variable that is forwarded but unset locally still lands empty, **which is this exact bug with the fix applied**. Check the value's *length*, never its content. 🔴 **UPDATED 2026-09-19 — that exact check HAS now been made: the on-box value is non-empty, length 32.** ⛔ **That is NOT D1–D3 discharged.** It settles the *presence* half only; the tail still needs the value to be the **right** one and a real signed payload to verify, and **neither was exercised**. ⛔ **Only the producer / owner may mark D1–D3 — the wiki flags, it does not close.** ✅ **AND THE OWNER HAS NOW RULED ON EXACTLY THAT, 2026-09-20: LEAVE D1 AND D2 UNTICKED.** The question put to the owner was whether the 2026-09-19 observation covers D1 (non-empty on the box) and D2 (the startup warn gone) *in substance* — it does — and the accepted reasoning for leaving them unticked is that **the correction text already records what was observed** and **the probe was INDIRECT: it proved the `paymentsEnabled` middleware passes, not that a signed payload works.** **D3 is unaffected and stays owner-gated.** ⛔ **So no box is ticked, and none should be by an agent.**
- ⚠️ **The end-to-end payments check is owner-gated and was not run.** `/yandex/intent` creates DB rows without checking a signature, so driving it with a throwaway value would write junk intents into the production profile DB. Full end-to-end verification with a *real* signed payload belongs to `0065`, not here.
- **Fail-closed must keep working.** The point of the task is to make the value *reach* the box, never to weaken the guard that fires when it has not.
- **`0065`'s gate count did NOT drop.** `0195` is a gate now **satisfied, not removed** — `0065`'s board row still states **three** conditions (`0014`, `0062`, **and** `0195`), owner-ruled. ⛔ **The count is owner-ruled and is NOT changed here — the wiki does not edit a board (ADR-033).** 🔴 **But its STATED REASON went stale on 2026-09-19:** ~~the routes still 503 today because `0014` has not issued the key~~ — a non-empty value **is** present on the box and the prefix answers **404, not 503**, on a missing sub-path. ~~🚩 **FLAGGED FOR THE PRODUCER AND THE OWNER: the three-gate count may still be correct for other reasons** — the value's *correctness* is unproven and no real purchase was exercised — **but this particular rationale can no longer carry it.**~~ ✅ **ANSWERED 2026-09-20 AND THE FLAG IS DISCHARGED — struck, not deleted.** The question went to the owner **with the alternative (clear it, two blockers) explicitly offered**, and the owner **confirmed the conservative reading: *"Stay open on correctness — 3 blockers."*** ⛔ **NOTHING ABOUT THE COUNT CHANGED — it was already three.** ✅ **What changed is its STANDING: three is now an OWNER-CONFIRMED position, not a producer's conservative choice** — a different fact, and the reason it is recorded. ⛔ **Do not re-litigate it.** 🔄 **LATER HISTORY, recorded so the count is read at the right date:** 2026-09-22 — `0014` closed and its condition was ruled **satisfied**, so the owner-ruled count went **three → two** (`0062`, `0195`); 2026-09-23 — `0062` closed `(agent-closed — not owner-verified)` and **its condition was re-pointed to `0296` A2–A3**, same substance. **Two conditions stand: `0296` and `0195`; `0065` stays `🚧 Blocked`.** See [[tasks/forward-profile-internal-token]].
- 🔒 **This task is *about* a credential.** Only the variable **name** appears in its record — never a value, not even truncated, not even "starts with".

## Related

- [[decisions/config-parity-failure-class]] — the recurring class this is the **third** instance of, and the first outside `deploy.sh`
- [[tasks/prod-api-env-https-apex]] — task `0063`, the one instance of the class fixed, deployed and evidenced
- [[tasks/yandex-payments-implementation]] — task `0019`, which introduced the variable and the fail-closed 503
- [[tasks/citizenship-name-change]] — task `0067`, during whose build this gap was found and whose Telegram variables supplied the forwarding pattern
- [[systems/player-profile-store]] — the profile service whose payments routes this gap 503s ~~today~~ (🔴 **2026-09-19: not any more on the box** — a non-empty secret is present; the code's fail-closed 503 is unchanged)
- [[systems/configuration]] — deploy-environment plumbing and runtime config
- [[decisions/sprint-4]] — the sprint board carrying the config track
- [[decisions/sprint-backlog]] — where `0064`, the guard that must land after this, is tracked
- [[tasks/dependency-declaration-sweep]] — task `0196`, which used this brief's explicit `Depends on: nothing.` as wording to copy
- [[tasks/container-log-retention]] — task `0060`, the last item on the same owner-ruled config-track execution order
- [[tasks/profile-box-adopt-and-reprovision]] — task `0215`, which re-provisioned the box this task's on-box verification step was waiting on; ⚠️ **that step is now runnable but has NOT been run**, and it stays owner-gated
- [[tasks/yandex-catalog-registration]] — task `0014`, the upstream fact for this one: it issued the per-game key, and its close answered the provenance question this page carried
- [[tasks/forward-profile-internal-token]] — task `0062`, the same class on the game pipeline; `0065`'s condition on it now points at `0296`
- [[tasks/deploy-time-config-parity-guard]] — task `0064`, whose B2 check catches this task's shape
- [[tasks/config-parity-guard-pre-arming-gate]] — task `0203`, whose R12 fix stopped the guard silently dropping this task's shape
- [[tasks/profile-secret-persistence-value-parity]] — task `0220`, which widened this task's persistence finding from one variable to four and fixed all four
