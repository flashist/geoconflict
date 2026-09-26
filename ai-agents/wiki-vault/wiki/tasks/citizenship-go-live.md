# Paid Citizenship — Live Verification & Go-Live (the Citizenship Launch)

**Source**: `ai-agents/tasks/done/0065-citizenship-paid-live-verification/brief.md` (plus `plan.md`, `worklog.md`, `review.md` in the same folder)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 5 (was Sprint 4 until the 2026-09-23 rescope) · task `0065` · the citizenship go-live

> # ✅ CITIZENSHIP IS LIVE IN PRODUCTION SINCE 2026-09-26 — release `0.0.154`
>
> `CITIZENSHIP_CARD_ENABLED` was flipped to `true` in commit `3386b90` (verified in `HEAD` this sync:
> `src/client/flashist/FlashistFacade.ts` — the `features` block reads `CITIZENSHIP_CARD_ENABLED: true`),
> and the second game deploy put it live at about **14:38 Moscow time**. **Both the earned and the paid
> path are live** — the flip owns both since 2026-09-23.
>
> Closed **2026-09-26** by a spawned `fkit-producer` on the owner ruling *"Close 0065 (citizenship
> go-live) and 0018 (the buy flow) now?"* → **"Close both (Recommended)"** ⇒
> **`(agent-closed — not owner-verified)`** (ADR-021, ADR-033 §5). Every production observation below is
> the **owner's** (screenshots and words relayed by `fkit-lead`); the producer observed none of it.
>
> 🚨 **The accepted tradeoff is now live:** paid citizenship went to real players **before any real
> purchase had been proven** (owner ruling 2026-09-23, *Correction 7*). As it turned out, the first real
> purchases the same day both succeeded — see *Outcome*. The remaining proof items live in `0297`.

## Goal

Everything in paid citizenship that needed something real from Yandex or production. Originally this
task held the live verification (§1 real signed payload / HMAC construction, §2 live catalog fetch, §3
real test purchase, §4 live reconciliation, §5 catalog moderation behaviour) **and** the go-live flip (§6).

**How it narrowed to the go-live only — a chain of owner rulings (the brief keeps seven dated
corrections, struck, not deleted):**

| Date | Ruling | Effect on the gate |
|---|---|---|
| 2026-09-19 | *"we don't need to wait for their approval anymore"* | Yandex catalog **approval** gate void (wording only; count stayed 3) |
| 2026-09-19 | read-only box check | the *"every payments route returns 503"* claim was **false** — the secret was present (length only, never read) |
| 2026-09-20 | owner: *"that's the real Yandex key, I set it"* | provenance owner-attested; owner **kept** the `0195` condition open on correctness |
| 2026-09-22 | `0014` closed, test login confirmed | 3 → **2** conditions |
| 2026-09-23 | `0062` closed, its checks moved to `0296` | condition re-pointed; **§6 becomes the ONLY owner of the flip** (removed from `0017`) |
| 2026-09-23 | *"Keep it in Sprint 5, but the task shouldn't block Sprint 4"* | `0296` no longer gates ⇒ **1** |
| 2026-09-23 | *"Launch, and leave the test task for the Sprint 5. The test-buy sequence will be run by me (human)"* | §1–§5 and `0195` moved to `0297` ⇒ **0 task conditions**; only the owner's timing held it |
| 2026-09-26 | *"As soon as possible, it's ok for me if some of the re-measures happen after it."* | launch timing called |

⛔ The 2026-09-26 timing ruling does **not** name which re-measures may come after — read it as
*"re-measures are not a go-live gate"*, not as a list.

**Prerequisites that stood until the flip:** the tenure grant ([[tasks/tenure-xp-grant]], `0253`) had to be
live first — claim route on the profile box (runbook W3), then its client code (W12, release `0.0.152`),
then the flip; and the licensing prerequisite (`0066`, satisfied 2026-08-30). The flip was ruled a
**launch decision, not a deploy-slot item** (`RUNBOOK-A`, 2026-09-22).

## Key Changes

- **The flip, commit `3386b90`** (built by a `fkit-coder` as a ship-loop worker on an owner-approved plan;
  the owner ruled *"Coder commits it"*): the constant set to `true`, its comment rewritten (the remote
  `citizenship_ui` flag is the runtime kill switch; setting the constant back to `false` is the code-level
  rollback; still **no `GAME_ENV` bypass**). The test that pinned *"ships defaulted OFF"* now pins
  *"ships ON"*, guarding against an accidental revert. Full `npm test` 147 suites / 2101 tests green, first
  run; review clean.
- **Between tags `0.0.152` and `0.0.154` the flip is the only change under `src/` or `resources/`**
  (checked by git diff at the time).

**The second game deploy, 2026-09-26 — two attempts:**

| Attempt | Release | What happened |
|---|---|---|
| 1 | `0.0.153` | Built and pushed, then **failed** at the SSH update-script step with *"Permission denied"* seconds after the copy step **succeeded with the same credentials**. The update script never ran ⇒ **`0.0.153` was never served.** Cause unknown, not investigated — runbook finding **F-F**. |
| 2 | `0.0.154` | Full re-run (bumped again) — **live** ~14:38 Moscow. Owner check: container up on the new image, assets served with `?v=0.0.154`, players connecting. |

**Owner-observed in the live Yandex Games iframe:** the citizenship card with XP bar **51 / 100**; the buy
button **"Купить гражданство — 249 YAN"**; the tenure popup granting 50 XP; footer `0.0.154`; the console
flag `citizenship_ui` = `enabled`.

## Outcome

✅ **Close condition (restated 2026-09-23) met, all owner-observed:** flag `true` in the deployed build ·
second game deploy run · card visible in the live iframe · the kill-switch check
([[tasks/citizenship-kill-switch-launch-check]], `0238`) closed.

**First real money through the flow (relayed; full detail belongs to `0297`):** a real player purchase and
the owner's test purchase both returned **200**; the card switched to ГРАЖДАНИН without a reload; after a
reload still a citizen and no reconcile call ⇒ the purchase was consumed. ⇒ **The secret value on the box
is correct** — the `0195` value question is settled. ⚠️ **Which HMAC construction matched is still
unknown** — backlog follow-ups `0309` → `0310`. A snapshot at about 14:47 UTC, a minute after the test purchase:
105 purchase intents from 97 distinct players, 2 used; 3 citizens (2 paid, 1 earned).

🚩 **Residuals and consequences:**
- **Rollback pair:** previous live = `0.0.152`. ⚠️ **Whether its image is still on the game box was not
  checked** — the `0.0.152` deploy deleted *its* own predecessor (runbook F-D). A rollback may need a rebuild.
- **Version numbers can skip:** a failed attempt still bumps the version and pushes a tag and image
  (`0.0.153` exists in git and the registry but was never served). The W15 re-measure for `0032` must
  filter to **`0.0.152` and `0.0.154`**.
- **The tenure-claim ~60-day clock started 2026-09-26** — task `0268` removes the claim logic after it.
- **Not yet checked:** funnel analytics seen live (next day); live reconciliation (owner decision pending
  in `0297`).
- **Paid state is derivable from the public profile** until `0250` ships ([[decisions/sprint-6]], rank 9) —
  a must-fix by owner ruling, never a launch gate.
- ⛔ The H1 still reads *"Live Verification & Go-Live Tail"* — the folder name is permanent (ADR-029) and the
  ruling did not rename it; the verification half lives in `0297`.

## Related

- [[tasks/citizenship-paid]] — `0018`, the buy flow this task put live; closed on the same ruling
- [[tasks/citizenship-kill-switch-launch-check]] — `0238`, the kill switch flipped off and on in the live build
- [[tasks/after-deploy-production-checks]] — `0296`, whose section B ran after this flip
- [[tasks/hide-citizenship-card-flag]] — `0054`, the compile-time flag this task flipped
- [[tasks/citizenship-earned]] — `0017`, whose flip was moved here 2026-09-23
- [[tasks/yandex-catalog-registration]] — `0014`, the catalog condition satisfied 2026-09-22
- [[tasks/yandex-payments-secret-forwarding]] — `0195`, the secret condition, moved to `0297` and settled by the first purchases
- [[tasks/forward-profile-internal-token]] — `0062`, the token condition, moved to `0296`
- [[tasks/tenure-xp-grant]] — `0253`, which had to be live before this flip
- [[tasks/citizenship-card-fail-closed-degraded-sdk]] — `0291`, the last code precondition before the flip
- [[tasks/licensing-remediation]] — `0066`, the licensing prerequisite for going live
- [[systems/weekend-deploy-window]] — the same day's first deploy, and the appended *Second game deploy* record with finding F-F
- [[systems/player-profile-store]] — where the live purchases and citizens are recorded
- [[decisions/sprint-5]] — the launch sprint this task closed on
- [[decisions/sprint-backlog]] — the Backlog board — holds the HMAC follow-ups `0309` → `0310` and the per-device-state epic `0304`
- [[decisions/sprint-4]] — the board this work started on, before the 2026-09-23 rescope moved it to Sprint 5
- [[decisions/product-strategy]] — sprint ordering — Sprint 5 re-scoped around this launch on 2026-09-26
- [[tasks/citizenship-kill-switch-coverage]] — task `0236`, the shared gate the kill switch hides; badge/inbox/POST still unverified in production
- [[tasks/personal-inbox]] — task `0012`, the Personal tab — launched with this flip
- [[features/announcements]] — the bell popup whose Personal tab went live with the launch
- [[tasks/yandex-payments-implementation]] — task `0019`, the payments server side the first real purchases went through
- [[decisions/adr-112-free-xp-grants]] — ADR-112 — the tenure grant went live with this flip; `0268`'s clock started
- [[systems/analytics]] — the citizenship and inbox events, now able to fire in production
- [[tasks/analytics-p1-citizenship-funnel]] — task `0021`, the funnel events — paid funnel not yet checked live
- [[tasks/citizenship-name-change]] — task `0067`, the name-change UI — first seen live after the launch
- [[tasks/citizenship-xp-progress-ui]] — task `0191`, the card — first seen in a browser at the launch
- [[systems/project-brief]] — product ground truth — the go-live-before-proof tradeoff, now live
