# 🚨 LAUNCH GATE — validate the citizenship kill switch's REMOTE half in a staging or prod build, before the flag flips

## ID
0238

## Sprint
Sprint 4

⚠️ **The field above is the bare token `Sprint 4` on purpose** — `dashboard.sh`'s drift rule compares
it against the board's identity, and a decorated value is reported as drift. **Do not decorate it.**

> 🚨 **UNRANKED IS NOT OPTIONAL, AND THE BOARD CANNOT SAY THAT FOR ME, SO THE BRIEF DOES.**
> **This is a GATE.** Its entire value is that it must be **CLOSED before `CITIZENSHIP_CARD_ENABLED`
> is flipped to `true`.**
> ⛔ **Do not read the `—` in its Priority cell as "can be skipped", and do not flip the launch flag
> while this is open.**

➡️ **PROMOTED FROM THE BACKLOG BOARD TO SPRINT 4 on 2026-09-10, on an OWNER RULING given live in
session and relayed through the spawning session.** **Authority before outcome: this is an OWNER
RULING, not a producer re-rank, and it is NOT producer precedent for moving anything else between
boards.** The owner accepted the producer's recorded recommendation **on its own reasoning** — *a gate
invisible on the sprint board is how a gate gets skipped, and this one gates Sprint 4's own
citizenship launch.*

⚠️ **THE OWNER RULED THE BOARD, NOT THE RANK.** ⛔ **Moving boards does not make this ranked.** Its
Sprint 4 Priority cell is `—`, and a spawned producer does not rank the owner's board.

🔒 **ADR-035: the row was APPENDED at the bottom of
[`plan-sprint-4.md`](../../../sprints/plan-sprint-4.md)** — no row moved, nothing was renumbered, and
no closed row was touched. **Bottom-of-board means *"added last"*, and nothing more.** The original
[`backlog.md`](../../../sprints/backlog.md) row is **kept, not deleted**, and now reads
`➡️ Moved to [Sprint 4](plan-sprint-4.md) — priority: unranked`.

📎 *ADR-035 is cited by name and never linked, on purpose — it is one of fkit's own upstream `adr-0XX`
decisions, not a file in this repository's `ai-agents/knowledge-base/decisions/` (which numbers from
`adr-101`). There is nothing here to link to.*

## Priority
**Unranked** — scheduled onto Sprint 4 by owner ruling (2026-09-10), but **no rank was ruled**, and a
spawned producer does not rank the owner's board. The Sprint 4 Priority cell reads `—` to match.
⚠️ **Unranked ≠ low. See the gate banner above.**

## Status
🔲 Backlog

## Owner
fkit-coder

## Depends on
✅ **NOTHING in this repository.** It needs **a staging or production build and access to the Yandex
console** — not code, not the profile box.

🔴 **EXPLICITLY INDEPENDENT OF [`0217`](../0217-profile-p2-wire-game-server-to-profile-box/brief.md)
AND OF CITIZEN ROWS EXISTING.** ⛔ **Do NOT fold this into `0217` as a sub-step.** It is a **different
blocker with a different cause**: `0217` is about the game server being wired to the profile box;
this is about **a dev-build bypass that makes the remote flag untestable locally**. The coder who
shipped [`0236`](../../done/0236-client-kill-switch-for-citizenship-surfaces/brief.md) specifically
flagged keeping the two distinct. **Neither `0236` nor `0217` discharges this task.**

---

## Context

### What this is a gate on

[`0236`](../../done/0236-client-kill-switch-for-citizenship-surfaces/brief.md) shipped a **client-side
kill switch for the citizenship surfaces**, built on **two layers**:

| Layer | What it is | State today |
|---|---|---|
| **1 — local, compile-time** | `flashistConstants.features.CITIZENSHIP_CARD_ENABLED` | **`false`.** 🔴 **Flipping it to `true` IS the launch.** |
| **2 — remote, runtime** | the `"citizenship_ui"` Yandex experiment flag | Wired. **This is the fast kill switch — flippable from the Yandex console with NO deploy.** |

**Layer 2 is the half that matters in an incident**, because it is the only one that does not need a
deploy. **It has never been exercised for real.**

### 🚨 Why it CANNOT be done earlier, or anywhere else — say this before someone tries

**`checkExperimentFlag()` returns `true` unconditionally when the client bundle's `GAME_ENV` is
`"dev"`.** And the client's `GAME_ENV` comes from the **webpack mode**, ✅ verified at `HEAD` =
`4c981e5`:

- `webpack.config.js:334` — `"process.env.GAME_ENV": JSON.stringify(isProduction ? "prod" : "dev")`.
- ⚠️ **NOT** from the `cross-env GAME_ENV=dev` in the npm scripts — **that only sets it for the Node
  server**, not for the browser bundle.

⇒ 🔴 **`npm run dev` can NEVER exercise the remote half of this switch. Layer 2 is hard-wired ON in
every dev build.** A **`build-prod` / staging build is the ONLY place this is testable**, and **no
automated test substitutes** — the unit tests prove composition and wiring, not that a real console
flip reaches a real player.

⚠️ *Line numbers are anchors at `4c981e5`, not addresses — re-derive by content, per*
[`conventions/file-line-citations.md`](../../../knowledge-base/conventions/file-line-citations.md).

### 🚨 What goes wrong if this is skipped — the whole reason it is a gate

**The first time anyone discovers the remote kill switch does not work is the moment they need it:
during a live incident, with a feature they cannot turn off.**

That is **the entire reason the kill switch was built.** A switch nobody has ever thrown is not a
safety mechanism; it is a belief about one. Skipping this gate does not save the work — it moves the
work to the worst possible moment and adds an outage to it.

### The owner's attestation, and exactly what it does and does not settle

📌 **Owner-attested, 2026-09-10:** Yandex experiment flags **support 100 % rollout and work** — based
on the owner's experience with **other games**.

⚠️ **THAT IS OWNER-ATTESTED, NOT REPO-VERIFIED, AND IT DOES NOT DISCHARGE THIS TASK.** It makes the
**mechanism plausible**; it does not make **this project's wiring proven**. ⛔ Do not restate it as a
confirmed platform capability, and do not use it to argue the gate away.

---

## What to build

**Nothing. This is a verification task, not an implementation task.** ⛔ **If it starts changing
source, stop — that is a different task.** The deliverable is **observed evidence, written down.**

Perform all three, in a **staging or production build** (⛔ **not `npm run dev`**):

1. **Flag ON.** With the `citizenship_ui` flag on: the **four ★ badge call sites**, the **inbox**, and
   the **payments reconciliation POST** all behave normally.
2. **Flag OFF**, flipped **in the Yandex console**: the **★ renders NOWHERE**, the **inbox is
   unavailable**, and the **reconcile POST does not fire**.
3. **Propagation delay OBSERVED AND WRITTEN DOWN** — the actual time between the console flip and a
   fresh session seeing it. ⚠️ **This is the item that turns the owner's attestation into a measured
   fact**, and it is the one most likely to be skipped because it is the least satisfying.

⚠️ **Known and NOT a finding: a flag flip NEVER reaches a live session.** Flags are fetched once per
page load and memoized **by design** — **next launch only**. Measure the delay for a **new** session;
do not report the memoization as a defect.

⚠️ **The ★ badge may be unobservable when you run this, and that is a REAL limitation, not a pass.**
Its `isCitizen` comes from **game state**, so with **zero citizen rows** it cannot be `true` and the
badge **cannot be made to render in either state**. If that is still true on the day: **say so
explicitly and mark item 1's badge half UNVERIFIED.** ⛔ **Do not record "the badge did not render" as
evidence the switch hid it** — it did not render because it could not.

---

## Verification steps

1. **The build used is named** — which build, which mode, and evidence it was **not** a dev build
   (e.g. that `GAME_ENV` resolved to `prod`).
2. **Both states are recorded for each of the three surfaces**, ON and OFF, with **what was actually
   observed** — not "as expected". Any surface that could not be observed is marked **UNVERIFIED with
   its reason** (see the ★ caveat above).
3. **The propagation delay is written down as a number with the method used to obtain it.**
4. **The findings land in a durable record** — this task's `worklog.md`, and a
   `ai-agents/knowledge-base/reports/` entry if the result is surprising. ⛔ **A verbal "it worked"
   does not close this task.**
5. 🚨 **THE CLOSING VERDICT IS EXPLICIT, and it is the point of the whole task:** either
   **"the remote kill switch is PROVEN to work, and here is the delay"**, or **"it is NOT proven, and
   here is what blocked it."**
   ⛔ **If the validation cannot be performed, this task does NOT close as done. Say plainly that the
   switch is NOT KNOWN TO WORK and must not be relied on as the launch's safety mechanism — rather
   than launching behind an unverified switch.**

---

## Notes

- **Depends on:** nothing
- **Blocks:** the flip of `CITIZENSHIP_CARD_ENABLED` to `true` — i.e. **the citizenship launch**
- **Source:** [`0236`'s brief §3](../../done/0236-client-kill-switch-for-citizenship-surfaces/brief.md),
  an **owner ruling of 2026-09-10** made from review finding **R5**. This task exists because the owner
  ruled on 2026-09-10 that the precondition **needs an owner, not a note in three places**.
- **Related, and NOT a substitute:**
  [`0237`](../0237-close-routed-out-test-residuals-from-0236-citizenship-switch/brief.md) closes
  `0236`'s routed-out **test-quality** residuals. ⛔ **`0237` does not discharge this gate**, and
  neither does any unit test — the gate is about a **real console flip**, which no test can stand in
  for.
- **Known accepted limitation of the thing being validated, owner-ruled 2026-09-10 and NOT a defect:**
  `CitizenshipCard.ts`'s fail-open carve-out means the **card's** gate is bypassed when the Yandex SDK
  is degraded ⇒ **the badge fails CLOSED, the card fails OPEN.** The owner was shown this inconsistency
  and kept it. **If the card appears with the flag OFF while the SDK is degraded, that is the ruled-on
  behaviour — record it, do not file it as a failure of this gate.**
- ⚠️ **This switch hides UI only. It does NOT stop server-side crediting** — deliberate, and out of
  scope here.
