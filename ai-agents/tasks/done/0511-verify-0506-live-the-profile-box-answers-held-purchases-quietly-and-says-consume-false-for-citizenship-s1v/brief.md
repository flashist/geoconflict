# Verify 0506 live: the profile box answers held purchases quietly and says consume:false for citizenship (S1v)

## ID
0511

> ℹ️ **ID allocation, checked 2026-10-26 before filing.** See `0510`.

## Sprint
Sprint 9

> 📌 **Filed 2026-10-26 on an OWNER RULING**, given via `AskUserQuestion` in the `fkit-lead` session and relayed to a
> spawned `fkit-producer` (no owner channel; ADR-021/037). ⛔ Not producer precedent. **"Approve (Recommended)"** —
> option text: *"ADR-126 becomes accepted; producer splits 0506 into profile-server and game build tasks, then planning
> starts."* Spec §12 row **S1v**.
>
> ✅ **Sprint 9 — OWNER RULING, 2026-10-26** (via `AskUserQuestion` in the `fkit-lead` session, relayed to a spawned
> `fkit-producer`; ADR-021/037; ⛔ not producer precedent). Asked *"Keep the check tasks 0511/0512 on Sprint 9, or move
> them to the top of the next sprint?"* → **"Keep on Sprint 9 (Recommended)"** — option text: *"Like the rest of this
> purchase work. Knock-on: none (checked) — nothing waits on them."*
> This overrides the standing next-sprint verify rule (2026-09-29) for this task. If `0506`'s deploy misses Sprint 9,
> this task cannot close in Sprint 9.
>
> ~~⚠️ Sprint 9, not the next sprint — the lead's instruction, NOT an owner ruling on this task … open owner
> question.~~ (Superseded by the ruling above.)

## Priority
38

> ⚠️ Priority 38 is append rank, NOT a merit ranking — flagged for owner confirmation.
> **On merit this belongs directly below `0506`**, because it checks that build's deploy and runs alongside `0493`.
> Appended after the board's highest rank (37), never inserted (ADR-035); no row renumbered.

## Status
✅ Done (agent-closed — not owner-verified)

> 2026-10-27 — live checks partly run by the owner (relayed by `fkit-lead`; recorded by a spawned `fkit-producer`). Results and what is still open: [`worklog.md`](worklog.md). Not closed: verification steps not all met.

## Owner
fkit-producer

## Context

Live check **S1v** of the approved spec
[`2026-10-26-0505-design-stop-consuming-permanent-purchases.md`](../../../knowledge-base/reports/2026-10-26-0505-design-stop-consuming-permanent-purchases.md)
§12. `0506` changes `/complete` and `/reconcile` on the profile box and adds migration `011`. It ships in one
profile-box deploy with the held `0491`/`0492`/`0496`.

- **Entry gate:** `0506` deployed to the **live** profile box — there is no dev profile box (owner, below).
- **When:** right after the S1 live deploy, **before** `0512` part (a) (T1–T3 run against the same live box).

> 📌 **2026-10-26 — there is NO dev profile box. OWNER'S OWN WORDS**, typed in answer to *"Which profile server does
> the dev game box use?"* via `AskUserQuestion` in the `fkit-lead` session, relayed to a spawned `fkit-producer`
> (ADR-021/037); ⛔ not producer precedent. Verbatim (typo kept): *"We don't have the dev profile server, so if we need
> to it test, we better test it on our prod profile server"*. Order that follows: S1 (`0506`) deploys to the **live**
> profile box first → `0511` (S1v) right after that deploy → `0512` part (a), the owner's T1–T3 on the Yandex test copy
> against the live profile box → the live game deploy (`0510`).
- **Runs alongside `0493`** (B1v; its step 1 now reads "granted, **not** consumed"). Spec §12 allows folding `0493`'s
  updated wording in here or checking them side by side; this filing keeps them separate and checked together. One test
  purchase can serve both, if the owner wishes.
- **Who does what:** owned by the producer; **the owner runs the live steps** (box reads, a test purchase). An agent
  may run read-only checks only where the owner allows it.

## What to build

Nothing. A live check, recorded in this folder's `worklog.md`.

## Verification steps

1. ~~Migration `011` (purchase holder sightings; the number actually used at build time) is applied on the profile box —
   the migration runner's record shows it after `010`.~~
   ✏️ 2026-10-26 (from `0506`'s plan, *After the S1 live deploy*): the deploy log's migration step applies **`009`,
   `010` and `011`** on the **live** profile box with no error (`009`/`010` are the held `0491`/`0496` migrations,
   `011` is `0506`'s `purchase_holder_sightings`). Read-only: the `purchase_holder_sightings` table exists and reads
   **0 rows — expected until S2 (`0510`) ships**: today's client sends no login token with reconcile, so no sighting can
   be recorded before the game deploy. 0 is not a failure.
2. `/complete` answers `consume:false` for a citizenship test purchase (Yandex test purchase list).
3. A reconcile that carries an already-held token answers quietly: no grant, not in `grantedTokens`, not in
   `consumeTokens`.
4. The new server counters move (reconcile outcome labels; `issuedAt` presence/age bracket; entry `status` labels).
   Record whether the live payload carries `issuedAt` at all (spec §14 item 2).
5. The profile box logs after the deploy contain **no** token, payload, player id or signature in the new lines
   (labels and counts only).
6. ~~`PAYMENTS_CONSUME_PERMANENT` is **off** on the box (read the setting; do **not** turn it on — it is one-way per token,
   spec §4.3).~~
   ✏️ 2026-10-26 — the switch is a **source setting**, not an env var (OWNER DIRECTION, verbatim in `0506` item 4;
   relayed by `fkit-lead`; ⛔ not producer precedent). Check: the profile box **boot log reads
   `payments consume-permanent: OFF (ConsumePermanentSetting.ts)`**. There is no env var and no value-report line to
   read. Do **not** turn it on — it is one-way per token (spec §4.3); flipping it would be a source edit plus a redeploy,
   never a box setting.
7. The worklog records the date, the deployed version, and each result; no connection strings, endpoints or keys.

> ➕ **2026-10-28 — steps 8–12 folded in from cancelled tasks, OWNER RULING** given via `AskUserQuestion` in the
> `fkit-lead` session, relayed to a spawned `fkit-producer` (ADR-021/037); ⛔ not producer precedent. Asked *"Which
> hand-run check tasks should the producer cancel?"* → **"The 4 purchase ones (Recommended)"** — option text: *"Cancel
> 0493, 0498, 0499, 0512. Keep 0511 (server checks, no purchase); their server-side steps move into 0511. Knock-on: none
> (checked)."* Only **server-side, read-only, no-purchase** steps came here. The client side went to
> [`0516`](../../backlog/0516-verify-the-2026-10-27-purchase-and-rewarded-ad-deploys-through-gameanalytics-metrics-read-on-or-after-2026-11-03/brief.md)
> (GameAnalytics read, on or after 2026-11-03). Nothing that needs a paid purchase was added. Steps already here that
> the cancelled tasks also asked for are not repeated: server counters (`0512` step 7 = step 4 above), profile box
> version (`0493` step 5, `0512` step 8 = step 7 above).

8. **No reconcile 500s, and no `reconcile entry failed` lines** in the profile box logs since the 2026-10-27 deploy —
   or their count, if any. *(From
   [`0493`](../../cancelled/0493-verify-0492-live-citizenship-purchases-still-grant-after-the-b1-profile-box-deploy/brief.md)
   step 4 and its knock-on note from `0492`'s plan: after B1 a failing entry no longer gives a 500, so the grep is the
   real check. Each such line carries the token's first 8 characters only; do not copy them into the worklog.)*
9. **Which game client version is live** (`0.0.166` or `0.0.167` — both version-bump commits are dated 2026-10-27;
   unconfirmed), read on the game box, read-only. *(From `0493` step 5,
   [`0498`](../../cancelled/0498-verify-0495-live-inside-yandex-guest-log-in-and-buy-opens-the-payment-window-with-no-second-tap/brief.md)
   step 7, [`0499`](../../cancelled/0499-verify-0491-and-0488-live-the-rewarded-ad-doubles-match-xp-inside-yandex-after-both-deploys/brief.md)
   step 1, [`0512`](../../cancelled/0512-verify-0510-pre-release-checks-t1-t3-on-the-yandex-test-copy-then-live-after-the-game-deploy-s2v/brief.md)
   step 8.)*
10. **`purchase_holder_sightings` re-read** at the time of this read: the count only, no ids. Since S2 shipped a
    non-zero count is possible; it is expected only for players with two profiles on one Yandex login. *(From `0512`
    step 3 — the T3 evidence was this count staying 0.)*
11. **Passive evidence that reconcile still grants a stray purchase:** if the reconcile outcome counters (step 4) show
    any grant outcome since the deploy, record it. If none, this stays unproven — no purchase is made for it. *(From
    `0493` step 3, which needed a never-completed purchase on a non-citizen account.)*
12. The worklog says, for each of steps 8–11, which cancelled task it came from.

## Notes

- **Depends on:** 0506
- **Blocks:** nothing
- **Related:** `0493` (run together — ⛔ cancelled 2026-10-28), `0512` (S2v — ⛔ cancelled 2026-10-28), `0516` (the
  GameAnalytics read that replaces them), `0502` (its read-only checks could also count payloads with
  `issuedAt`, spec §14 item 2).
- **Ships by:** nothing ships; it follows the profile-box deploy (weekend slot unless urgent).
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
- **No secrets, no personal data** in this folder.
