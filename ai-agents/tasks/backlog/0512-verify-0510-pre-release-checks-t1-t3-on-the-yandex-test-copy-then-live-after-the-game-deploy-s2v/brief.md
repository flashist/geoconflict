# Verify 0510: pre-release checks T1–T3 on the Yandex test copy (T3 blocks the release), then live after the game deploy (S2v)

## ID
0512

> ℹ️ **ID allocation, checked 2026-10-26 before filing.** See `0510`.

## Sprint
Sprint 9

> 📌 **Filed 2026-10-26 on OWNER RULINGS**, given via `AskUserQuestion` in the `fkit-lead` session and relayed to a
> spawned `fkit-producer` (no owner channel; ADR-021/037). ⛔ Not producer precedent.
> - **"Approve (Recommended)"** — option text: *"ADR-126 becomes accepted; producer splits 0506 into profile-server and
>   game build tasks, then planning starts."* Spec §12 row **S2v**.
> - Asked *"Where can you run the T1–T3 checks inside Yandex before the game goes live?"* → **"Test copy on the dev
>   server"** — option text: *"There's a Yandex-side test version that loads our dev box."*
>
> ✅ **Sprint 9 — OWNER RULING, 2026-10-26** (via `AskUserQuestion` in the `fkit-lead` session, relayed to a spawned
> `fkit-producer`; ADR-021/037; ⛔ not producer precedent). Asked *"Keep the check tasks 0511/0512 on Sprint 9, or move
> them to the top of the next sprint?"* → **"Keep on Sprint 9 (Recommended)"** — option text: *"Like the rest of this
> purchase work. Knock-on: none (checked) — nothing waits on them."*
> Part (a) has to run **before** the game deploy anyway, so it cannot sit in a later sprint than the deploy.
>
> ~~⚠️ Sprint 9, not the next sprint — the lead's instruction, NOT an owner ruling on this task … open owner
> question.~~ (Superseded by the ruling above.)

## Priority
39

> ⚠️ Priority 39 is append rank, NOT a merit ranking — flagged for owner confirmation.
> **On merit this belongs directly below `0510`**, because part (a) gates the held game deploy. Appended after the
> board's highest rank (38), never inserted (ADR-035); no row renumbered.

## Status
🔲 Backlog

## Owner
fkit-producer

## Context

Spec [`2026-10-26-0505-design-stop-consuming-permanent-purchases.md`](../../../knowledge-base/reports/2026-10-26-0505-design-stop-consuming-permanent-purchases.md)
§10.3 and §12 row **S2v**. Owner-run, two parts. These are **our own** pre-release checks — there is no Yandex
moderation gate (owner, 2026-10-26: iframe updates skip per-update moderation; D3 withdrawn).

- **Where (part a):** the Yandex-side **test version** of the game, which loads our **dev game box** (owner ruling
  above), with the owner's test accounts and Yandex **test purchases**.
- ~~⚠️ Still to settle (spec §14 item 1, remainder): which profile box the dev box talks to …~~ ✅ **Settled
  2026-10-26:** there is **no dev profile box**; part (a) runs against the **live** profile box. S1 (`0506`) is deployed
  there **first** — safe alone, old clients behave as today (spec §7 row 12; §9 step 1) — then `0511` (S1v), then
  part (a), then the live game deploy.

> 📌 **2026-10-26 — there is NO dev profile box. OWNER'S OWN WORDS**, typed in answer to *"Which profile server does
> the dev game box use?"* via `AskUserQuestion` in the `fkit-lead` session, relayed to a spawned `fkit-producer`
> (ADR-021/037); ⛔ not producer precedent. Verbatim (typo kept): *"We don't have the dev profile server, so if we need
> to it test, we better test it on our prod profile server"*. Order that follows: S1 (`0506`) deploys to the **live**
> profile box first → `0511` (S1v) right after that deploy → `0512` part (a), the owner's T1–T3 on the Yandex test copy
> against the live profile box → the live game deploy (`0510`).
- **Entry gates:** (a) `0510` built and running on the dev box via the Yandex test copy, against the **live** profile
  box with S1 deployed (and `0511` run);
  (b) `0510` deployed to the live game.

## What to build

Nothing. Owner-run checks, recorded in this folder's `worklog.md` with the owner's words.

## Verification steps

**Part (a) — before the game deploy, on the Yandex test copy (spec §10.3):**

1. **T1 (permanent stays):** buy citizenship (test purchase). It is granted and the restart prompt shows. Reload 3×:
   the reconcile POST is still made on each load (network tab); the card shows owned with no flicker or "checking";
   the inbox gets no second welcome; no restart prompt on reload.
2. **T2 (interrupted purchase):** pay, then close the tab before `/complete` lands. Reopen: granted by reconcile, the
   card refreshes once. Reload: quiet.
3. **T3 (scope across accounts) — RELEASE BLOCKER.** In the **same browser**, switch to a second Yandex account the
   owner controls and load the game. The first account's purchase must **not** appear: no "held elsewhere" line, and no
   reconcile POST if that account bought nothing. **If it appears: stop. The game half of the held bundle does not
   ship as is; report to the architect.**
4. **T4 (held elsewhere), only if** the owner can produce two profiles for one account (for example with `0503`'s tool
   on test data). Otherwise record that this live path stays unproven (covered by `0510`'s tests only).
5. T1 or T2 failing is a defect in this change, fixed before release. The safety switch is **not** exercised live (one-way
   per token, spec §4.3).

**Part (b) — after the game deploy, on live:**

6. A test purchase stays listed in Yandex's purchase list and reloads are quiet (T1 repeated on live).
7. The server counters move (as `0511` step 4).
8. The worklog records dates, deployed versions, each result and the owner's words; no connection strings, endpoints,
   keys or player ids.

## Notes

- **Depends on:** 0510, 0506
- **Blocks:** nothing by `Depends on:` — but **the game deploy of `0510` (and the held `0494`/`0495`/`0488`) waits for
  part (a)**. That is a release gate, not a task dependency: `0497`, `0498`, `0499` check the game deploy, which only
  happens after part (a) passes.
- **Why `0506` too:** part (a) needs a profile box running S1.
- **Related:** `0511` (S1v), `0493`, `0498` (both also use Yandex test purchases — the owner may batch the sessions).
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
- **No secrets, no personal data** in this folder; test account names stay out of git.
