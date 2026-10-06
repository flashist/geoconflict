# Paid Citizenship — Owner-Run Test-Buy Sequence (task 0297)

**Source**: `ai-agents/tasks/done/0297-paid-citizenship-owner-run-test-buy-sequence/brief.md` (readings and the close record in the same folder's `worklog.md`)
**Status**: done (agent-closed — not owner-verified) — **three of its checks WAIVED by the owner, NOT verified**
**Sprint/Tag**: Sprint 7, rank 21 (append rank) — filed on Sprint 5 / task `0297`

> ✅ Done (agent-closed — not owner-verified), closed 2026-10-05 (brief moved `backlog/` → `done/`).
>
> ⛔ **What the close does NOT prove.** §2's first box, both §4 boxes and §5 were **waived by the owner, not
> verified** — OWNER RULING given 2026-10-05 in the `fkit lead` session (the owner's own typed message), relayed by
> `fkit-lead`; ⛔ not producer precedent. Verbatim: *"I think we're fine to close the tasks, the user scenarios that
> described as still need to be verified, are rather rare cases. The interrupted case should be ok already, if somebody
> in the future reports a problem about it, I will get back to it. The 5th poin sounds weird and unclear to me."*

## Goal

The live half of paid citizenship, moved out of `0065` ([[tasks/citizenship-go-live]]) by owner ruling on
2026-09-23, so `0065` could be the go-live alone. Run by the owner: prove a real purchase goes through the `0018` buy
flow ([[tasks/citizenship-paid]]), find out which of the two HMAC constructions Yandex really uses, prove the payments
secret on the box is the right value (the old `0195` condition), and check reconciliation of an interrupted buy.

## Key Changes

Nothing built here — an owner-run checklist. Result per section:

| Section | Result |
|---|---|
| **§1** real signed payload → `/complete` 200 | ✅ 2026-09-26 — two real 200s. **This settles the `0195` value question**: the secret on the box is right. |
| **§1** which HMAC construction matched | ✅ 2026-10-04 — **`decoded_json`**, via `/complete`, read from `0309`'s log line by `fkit-lead` (read-only SSH). ⚠️ **n = 1, a real player's purchase; `/reconcile` never observed.** See [[tasks/hmac-construction-log-label]]. |
| **§1** follow-up to drop the unused construction | Filed as `0309` + `0310`; `0310` **cancelled** 2026-10-04, superseded by **`0379`** (wait for more samples, then re-ask keep-or-drop) — open on the Backlog board. |
| **§2** catalog status `'ready'` / product present | ⛔ **WAIVED, not verified** — only *inferred* (the Buy button showed 249 Yan on 2026-09-26). |
| **§2** price comes from the real catalog | ✅ 249 Yan shown. |
| **§3** real test purchase end to end | ✅ 2026-09-26 — `is_paid_citizen` set, purchase consumed (observed indirectly), card moved to State 3 at once, funnel events seen. |
| **§4** interrupted purchase → `/reconcile` grants | ⛔ **WAIVED, not verified.** Zero `/reconcile` calls seen as of 2026-09-29 (not re-checked since). |
| **§4** second restart makes no network call | ⛔ **WAIVED, not verified** (follows the box above). |
| **§5** does the product ever vanish from `getCatalog()` | ⛔ **WAIVED, not verified** — waived *as unclear*; ⚠️ the owner did **not** rule on the question itself. |

## Outcome

- **Close conditions:** every box checked or owner-waived · the §1 follow-up filed (now `0379`) · the `0195` value
  recorded (proven by the real 200s).
- **Revisit condition (§4), the owner's words:** *"if somebody in the future reports a problem about it, I will get
  back to it."* A player report of a paid-but-not-granted purchase reopens the reconciliation question. **No scheduled
  watch remains**; the suggested ~2026-10-10 hand-test fallback was dropped with the waiver.
- `0379` still re-reads the profile container log for `signature verified` lines; a `(reconcile)` line there would be
  the first live evidence for §4 — it does not reopen this task.
- ⚠️ **Standing practice from §1:** `docker logs` is lost when the profile container is recreated — read the log line
  before every profile redeploy ([[systems/weekend-deploy-window]]).
- **Board effect:** Sprint 7 rank 21 → `✅ Done`; every `0297` link under `ai-agents/` repointed to `tasks/done/`.

## Related

- [[tasks/citizenship-go-live]] — task `0065`, the go-live this was split from
- [[tasks/citizenship-paid]] — task `0018`, the buy flow exercised in §3
- [[tasks/hmac-construction-log-label]] — task `0309`, the log line that answered §1
- [[tasks/yandex-payments-implementation]] — task `0019`, the payments routes and the two HMAC constructions
- [[decisions/cancelled-tasks]] — `0310`, superseded by `0379`
- [[systems/player-profile-store]] — the profile box and its payments routes
- [[systems/weekend-deploy-window]] — the profile freeze lifted once §1 read the line
- [[decisions/sprint-7]] — the board (rank 21)
