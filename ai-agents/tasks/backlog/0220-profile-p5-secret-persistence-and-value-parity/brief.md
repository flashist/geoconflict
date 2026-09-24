# P5 — On-box secret persistence for four more variables, and value-level config parity

## ID
0220

## Parent / Epic
[`0213-profile-backend-clean-slate-rebuild`](../0213-profile-backend-clean-slate-rebuild/brief.md)

## Sprint

Sprint 5

📌 **Moved from Sprint 4 to Sprint 5 on 2026-09-23** — Sprint 4 rescope, an OWNER RULING given live in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021); ⛔ not producer precedent. Everything left in this task needs a deploy, the live box or production; Sprint 4 keeps only locally buildable work. `## Status` and `## Priority` were NOT changed; the folder did not move. Record: the *Sprint 4 rescope* addendum in [`plan-sprint-4.md`](../../../sprints/plan-sprint-4.md).

## Priority
**Medium-High** — it closes a silent-overwrite class that has already bitten this project three
times under a different name.

⚠️ **The rank is the producer's**; the owner ruled scheduling, not rank.

## Status
🚧 Blocked — built + reviewed 2026-09-13 (persist-or-reuse for the four secrets + on-box report-only value parity + harness T12–T15; stateful review round 1 closed out, R1–R6 applied, Codex coverage full; `npm test` 120/1253 green); open pending the OWNER-side live tail — plan §8 ~~steps 1–3~~ **steps 1–2 ONLY**: deploy with the four set (600-root files), then deploy with them BLANK (`Reusing persisted <NAME>` ×4 — THE proof)~~, then one rotation~~. 🚩 **CORRECTED 2026-09-22, SAME DAY — the struck clause was accurate when written and was overtaken hours later: §8 STEP 3 (the rotation) WAS REMOVED FROM THIS WINDOW BY OWNER RULING and is DELIBERATELY NOT RUN here; the overwrite proof is carried by [`0294`](../0294-prove-a-rotated-value-overwrites-the-persisted-one-on-the-live-profile-box/brief.md).** ⚠️ **ONE STEP DELIBERATELY DEFERRED — ⛔ NOT "unverified":** steps 1–2 still run in this window, and the rotation path does have local **stubbed** coverage (harness **T13**, `tests/scripts/profile-deploy-hardening.test.sh:613-638`, gated by `npm test`) — ⛔ **that is not live-box evidence and must not be presented as it.** Same hold-open posture the owner ruled for `0219`. Driven by `/fkit-sprint-ship-loop`

## Owner
fkit-coder

## Depends on
[`0215`](../../done/0215-profile-p1-stand-up-the-box/brief.md) (P1) — a box to persist secrets on.

## Context

### 🔴 `0195`'s finding is BROADER than `0195` recorded

`0195` established that **`YANDEX_PAYMENTS_SECRET` has no on-box persistence** — so a deploy from a
machine that lacks the value **silently overwrites a working value with an empty one**. That was
recorded as owner ruling R4 on `0195`.

⚠️ **The architect verified on 2026-09-04 that the SAME is true of three more variables:**

- `FEEDBACK_TELEGRAM_TOKEN`
- `FEEDBACK_TELEGRAM_CHAT_ID`
- `TELEGRAM_PROXY_URL`

All three are handled at `setup-profile.sh:392-395` and **do not follow the persist-or-reuse
pattern** that exists at `setup-profile.sh:357-368`.

✅ **`POSTGRES_PASSWORD` is EXEMPT** — it is required and **fails closed**, so a missing value stops
the deploy rather than silently blanking a working one. **Do not "fix" it into the persist-or-reuse
pattern**; failing closed is the stronger behaviour and it is deliberate.

🚨 **State this plainly in the worklog: `0195`'s recorded scope was one variable; the real scope is
four.** `0195`'s fix stands and is not being reopened — its **finding** was narrower than the defect.

### Why silent overwrite is the dangerous shape

The failure is not "the deploy breaks". The failure is **the deploy succeeds** and the feature stops
working, with no error, because a variable that was correct on the box is now empty. That is the same
family as `0062`, `0063` and `0195` — **a variable that never reaches production, or reaches it
empty** — and it has now appeared four times.

### Value parity — `0064` Phase 2

`0064`'s config-parity guard is **name-only and report-only** today. It compares which variable
**names** a deploy forwards against which the app reads; it says nothing about whether a forwarded
value is **usable**. `--enforce` is built and **wired to nothing**, blind spot R1 is unfixed, and the
ten pre-arming items live in [`0203`](../0203-config-parity-guard-pre-arming-gate/brief.md).

**`0064` Phase 2 is the VALUES half** — public-facing URL values must be `https` and hostname-based
(the `0063` class); tokens must be non-empty (the `0062` class).

⛔ **This task does NOT arm the guard.** Arming is `0064`'s, after all ten of `0203`'s items land.
**Hard sequencing — do not shortcut it.** Everything here is report-only or persistence-side.

## What to build

1. **Extend the persist-or-reuse pattern** at `setup-profile.sh:357-368` to cover
   `YANDEX_PAYMENTS_SECRET`, `FEEDBACK_TELEGRAM_TOKEN`, `FEEDBACK_TELEGRAM_CHAT_ID` and
   `TELEGRAM_PROXY_URL` (currently `setup-profile.sh:392-395`).
   ⚠️ **Persist-or-reuse means: if the incoming value is empty and a persisted one exists, KEEP the
   persisted one — and say so in the deploy output.** A silent reuse is only marginally better than a
   silent overwrite; the operator must be able to see which happened.
   ⛔ **Leave `POSTGRES_PASSWORD` alone** — it fails closed by design.
2. **Implement `0064` Phase 2 — value checks, not name checks.** Public URL values `https` and
   hostname-based; tokens non-empty. **Report-only.**
3. **Make sure the four newly persisted variables are covered by the parity report**, and that any
   deliberately-optional one is marked **EXPLICITLY OPTIONAL with the reason recorded** — the
   precedent `0064` already sets for `YANDEX_PAYMENTS_SECRET` pending `0014`.
4. **Extend the deploy harness** (`tests/scripts/profile-deploy-hardening.test.sh`) to cover the new
   persistence behaviour. 🚨 **This harness is the only local proof that is not diff-reading — and
   diff-reading is how this class hid three times.** ⚠️ It only helps if something runs it; that is
   [`0201`](../../done/0201-gate-the-shell-test-harnesses-so-they-cannot-rot-unrun/brief.md) (P7), which is
   startable today and independent of this task.

### 🚫 Not in this phase

- ⛔ **Wiring `--enforce`.** That is `0064`, after `0203`'s ten items. **Arming this guard early
  correctly fails every deploy on known gaps.**
- Fixing `0064`'s blind spot R1 — it is one of `0203`'s ten items.
- Anything about `POSTGRES_PASSWORD`'s fail-closed behaviour.

## Verification steps

1. **A deploy from a machine WITHOUT each of the four values leaves the box's existing values
   intact** — demonstrated per variable, not argued in general. 🚨 **This is the defect; prove the
   fix against it, one variable at a time.**
2. **The deploy output says which values were reused from the box** — visible, not silent. 🔒 **Names
   only; never a value and never a length.**
3. **A deploy WITH a new value overwrites the persisted one.** ⚠️ Persistence must not become a trap
   where a rotated secret cannot be applied.

   > ## 🚨 STEP 3 IS A KNOWN, DELIBERATE GAP — OWNER RULING 2026-09-22. **SAY SO AT CLOSE.**
   >
   > **AUTHORITY.** An **OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on
   > 2026-09-22**, relayed by `fkit-lead` to a spawned `fkit-producer` holding **no owner channel**
   > (ADR-021). ⛔ **Not producer precedent.** Shown that the weekend deploy window's third profile
   > deploy existed **only** for this step, and that no brief said **which** of the four values to
   > rotate, the owner chose **"Skip it now, file it separately"** — so that *"`0220` closes with a
   > recorded, deliberate gap rather than an unnoticed one."*
   >
   > ⇒ 📌 **FILED AS [`0294`](../0294-prove-a-rotated-value-overwrites-the-persisted-one-on-the-live-profile-box/brief.md)**
   > on the **Backlog** board. ⚠️ **The board is the producer's filing default, not an owner ruling.**
   >
   > ⛔ **This task's `## Status` was NOT touched and no mover skill was invoked.**
   >
   > 🚨 **WHAT THIS MEANS FOR THIS TASK'S CLOSE, stated plainly and NOT to be rounded up.**
   > `plan.md` §8 says *"Steps 2–3 are the ones that prove the defect is closed."* **Only step 2 runs in
   > the weekend window.** ⇒ **`0220` cannot claim its verification step 3, and the close must state
   > that the rotation half has NO LIVE-BOX EVIDENCE.**
   >
   > ⚠️ **What IS proven, so nobody overstates the gap either:**
   > `tests/scripts/profile-deploy-hardening.test.sh:613-638` (**T13 — rotation**) drives the real
   > `persist_or_reuse_secret()` against **stubs** and asserts the overwrite, the reuse of the **new**
   > value, the other three files byte-unchanged, and no value leaking into output. It is gated by
   > `npm test` (task `0201`). ⇒ **Local coverage: yes. Live-box evidence: none.**
   >
   > 🚨 **WHY THE STEP EXISTS — record it, because it nearly did not survive.** The owner's **first**
   > instinct was *"rotate nothing, we don't know why the step exists"*, and they **revised it once
   > shown the reason.** **The failure this step guards:** if persist-or-reuse always prefers the box's
   > stored value, then **the day a key leaks and a new one is deployed, the box silently keeps the old
   > one** — the operator believes a compromised credential was replaced when it was **not**, and
   > **nothing says otherwise.** ⛔ **Never write this step up as redundant.**
   >
   > 📌 **Full record:**
   > [`weekend-deploy-slot-runbook.md`](../../../knowledge-base/weekend-deploy-slot-runbook.md) §
   > *Conflicts* → **C2**, and the **W8** tombstone in its sequence.
   >
   > ---
   >
   > ## 🚨 RUNBOOK-G, 2026-09-22 — THIS TASK MAY CLOSE WITH THE GAP RECORDED. **THIS IS THE WORDING.**
   >
   > 📛 *Renamed 2026-09-22 from a bare `RULING G`; ⛔ **label change only** — content, authority and
   > outcome unchanged. A **separate** 2026-09-22 sequence on the sprint plans uses the same bare
   > letters; cause and full mapping: the namespacing note at the top of
   > [`weekend-deploy-slot-runbook.md`](../../../knowledge-base/weekend-deploy-slot-runbook.md).*
   >
   > **AUTHORITY.** An **OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on
   > 2026-09-22**, relayed by `fkit-lead` to a spawned `fkit-producer` holding **no owner channel**
   > (ADR-021). ⛔ **Not producer precedent.** Asked whether `0220` may close carrying this gap, the
   > owner chose **"Yes — record the gap."**
   >
   > ⛔ **THIS RULING AUTHORIZES THE WORDING THAT WILL ACCOMPANY A FUTURE CLOSE. IT IS NOT A CLOSE, AND
   > IT IS NOT PERMISSION TO CLOSE.** ⛔ **No mover was invoked and this task's `## Status` token was
   > NOT changed — it stays `🚧 Blocked`.** Whoever closes this task later **is bound by the sentence
   > below.**
   >
   > ### ⚠️ THE SENTENCE. Carry it into the close verbatim.
   >
   > > **`0220` closes with verification step 3 DELIBERATELY NOT RUN.** The overwrite path — *a deploy
   > > with a new value replaces the persisted one* — has **NO LIVE-BOX EVIDENCE**, by owner ruling of
   > > 2026-09-22, not by oversight.
   > > [`0294`](../0294-prove-a-rotated-value-overwrites-the-persisted-one-on-the-live-profile-box/brief.md)
   > > is where that evidence would come from, and it has not been run.
   > > 🚨 **THIS TASK IS THEREFORE NOT FULLY VERIFIED. ⛔ Do not report it as such.** `plan.md` §8 states
   > > *"Steps 2–3 are the ones that prove the defect is closed"* — **only step 2 ran.** ⚠️ The rotation
   > > property has **local, stubbed** coverage only
   > > (`tests/scripts/profile-deploy-hardening.test.sh:613-638`, **T13**, gated by `npm test`); **that
   > > is not live-box evidence and must not be presented as it.**
   >
   > ⛔ **Do not compress, soften, or summarize that sentence at close.** ⚠️ **Its entire purpose is to
   > stop a later reader concluding `0220` was fully verified** — a `✅ Done` on this task without it
   > would assert exactly the thing that was never proven.
4. **`POSTGRES_PASSWORD` still fails closed** — unchanged behaviour, explicitly re-verified.
5. **The value-parity checks catch a bad value** — a non-`https` public URL and an empty token each
   produce a report entry. **Observe them firing**, do not assert them.
6. **The parity check still exits ZERO** — report-only. ⚠️ **A non-zero exit here fails a deploy and
   is out of scope.**
7. **The harness's new assertions FAIL against the unfixed script** — a negative control. ⚠️ **An
   assertion never seen red is not a verified assertion**, the standard `0195` set with its T10.
8. **`npm test` still passes** with suite/test counts unchanged unless a change was deliberate and
   explained.
9. 🔒 **No credential values anywhere** — script, harness, worklog, log line or deploy output.

## Notes

- **Effort: 0.5–1 day. Risk: Medium.**
- **Open question this task owns:** **Q8** — should this persistence work be its own brief at all, or
  folded into P1's deploy? **Filed separately** because it is behaviour change to
  `setup-profile.sh`, not configuration, and because it carries a harness change. **The owner may
  fold it into `0215`; that is a legitimate call and the producer would not argue.**
- **Related:** [`0064`](../0064-deploy-time-config-parity-guard/brief.md) (the guard; Phase 2 is
  here, arming is not), [`0203`](../0203-config-parity-guard-pre-arming-gate/brief.md) (the ten
  pre-arming items), [`0195`](../../done/0195-forward-yandex-payments-secret-in-profile-deploy/brief.md)
  (whose R4 finding this widens — **its fix stands; only its recorded scope was narrow**), and
  [`0201`](../../done/0201-gate-the-shell-test-harnesses-so-they-cannot-rot-unrun/brief.md) (nothing runs the
  harness this task extends).
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- 🔒 **No secrets in any artifact** — variable names and file names only.
</content>
