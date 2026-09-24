# Weekend deploy-slot runbook — one window, eleven tasks, four deploys

> ## 🚨 THE WINDOW HAS NOT HAPPENED. **THE SLOT SLIPPED — OWNER CONFIRMATION, 2026-09-22.**
>
> **AUTHORITY.** An **OWNER CONFIRMATION given live in the `fkit lead` session via `AskUserQuestion` on
> 2026-09-22**, relayed by `fkit-lead` to a spawned `fkit-producer` holding **no owner channel**
> (ADR-021). ⛔ **Not producer precedent.**
>
> **WHAT WAS SETTLED.** The 2026-09-14 owner ruling pointed at a weekend slot roughly six days out. The
> record showed **no slot having been run**, which left two readings — *it slipped*, or *it ran and
> nothing was written down*. A `/fkit-status` run correctly **declined to settle that from git**.
> ⇒ ✅ **THE OWNER SETTLED IT: IT SLIPPED. THE WINDOW HAS NOT HAPPENED.**
>
> 📌 **Recorded as an OWNER CONFIRMATION, ⛔ NOT as an inference from this repository** — a deploy leaves
> no artifact in git, so no document here could ever have settled it on its own.
>
> ### ⇒ THE CONSEQUENCE, STATED PLAINLY
>
> 🚨 **EVERY STEP IN THIS RUNBOOK IS GENUINELY UNDONE — W0 PREP INCLUDED.** ⛔ **Nothing in it has been
> partially executed, so NO step may be treated as already satisfied.** In particular, do **not** assume
> that W0.1's egress-IP measurement, W0.2's `0286` "before" capture, or W0.4's first SSH session were
> ever taken. **Start at W0.**
>
> ### ~~⛔ NO REPLACEMENT DATE — THIS WINDOW IS UNDATED~~ ✅ DATED 2026-09-23: THE WINDOW IS SATURDAY 2026-09-26
>
> 📌 **DATED 2026-09-23** (owner, verbatim: *"This Saturday, September 26"*) — OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on 2026-09-23, relayed by `fkit-lead` to a spawned `fkit-producer` (ADR-021); ⛔ not producer precedent. ⛔ **The
> undated text below is kept, not deleted — it was true when written on 2026-09-22 and is superseded only
> as to the date.** Nothing else in this runbook changed with this note.
>
> **The owner confirmed the OLD slot slipped. They did NOT name a new one.** ⛔ **Do not write a date
> into this runbook, do not infer one, and do not describe the window as *"this weekend"*.**
>
> ⚠️ **One pre-existing *"not this weekend"* phrase survives in § *What does NOT happen in this window*
> (the profile-cert fuse being weeks away).** It is a **comparison about the fuse**, ⛔ **not a claim
> about when this window runs** — do not read it as dating the slot.

> 📌 **AMENDED 2026-09-22, later the same day — four owner rulings landed.** C1, C2, C3 and G1 are
> **settled** (see those sections). Two steps left the window: **`0065` step 3** (C1) and **`0220` §8
> step 3 / W8** (C2). ⇒ **The window is now TWO profile deploys + one telemetry deploy + one game
> deploy.** ⚠️ **The title's "four deploys" was WRONG when written — it was five — and is now correct
> by accident of the cut, not by edit.** Two new tasks carry the removed work:
> [`0294`](../tasks/backlog/0294-prove-a-rotated-value-overwrites-the-persisted-one-on-the-live-profile-box/brief.md)
> (Backlog) and
> [`0295`](../tasks/backlog/0295-measure-the-game-prod-egress-ip-and-append-it-to-the-profile-internal-allowlist/brief.md)
> (Sprint 5). ⛔ **No task's `## Status` was touched and no mover skill was invoked.**

> ## 📛 RULING LETTERS IN THIS RUNBOOK ARE NAMESPACED `RUNBOOK-…` — 2026-09-22
>
> **Read this before you resolve any bare "Ruling <letter>" you meet in a git history.**
>
> **What happened.** On 2026-09-22 **two independent ruling sequences were issued, both lettered A–G,
> both dated the same day**: one governing the **sprint plans**
> ([`plan-sprint-4.md`](../sprints/plan-sprint-4.md) / [`plan-sprint-5.md`](../sprints/plan-sprint-5.md)),
> one governing **this runbook** and the briefs it drives. A document citing *"Ruling E"* therefore meant
> **one of two different things depending on which file you were standing in** —
> [`0295`](../tasks/backlog/0295-measure-the-game-prod-egress-ip-and-append-it-to-the-profile-internal-allowlist/brief.md)
> cites both sets, which is where it actually bit.
>
> ⚠️ **CAUSE, recorded so it is not mis-assigned: `fkit-lead` issued both sets, in separate spawns,
> without a shared namespace.** ⛔ **Not a producer error, and not any one document's error.**
>
> **THE FIX, ruled by the owner 2026-09-22 (*"Namespace the runbook's set"*), given live in the
> `fkit lead` session via `AskUserQuestion` and relayed by `fkit-lead` (ADR-021). ⛔ Not producer
> precedent.**
>
> | Set | Letters | Status |
> |---|---|---|
> | **Sprint plans** | bare `RULING A` … `RULING G` | ⛔ **UNCHANGED.** Nothing was renumbered or renamed. |
> | **This runbook + the briefs it drives** | **`RUNBOOK-A` … `RUNBOOK-G`** | ✅ Renamed 2026-09-22. |
>
> ⛔ **A LABEL CHANGE ONLY — not one ruling's content, authority, date or outcome was altered.**
>
> **Resolving an OLD bare citation you meet in git history. ✅ ALL SEVEN LETTERS ARE MAPPED — this table
> carries no hole.** The mapping was supplied authoritatively by **`fkit-lead`, who issued the sequence
> and is the only holder of it**, on 2026-09-22.
>
> | Old bare citation | Now | Recorded in this file as | The ruling |
> |---|---|---|---|
> | `Ruling A` *(runbook context)* | **`RUNBOOK-A`** | ***Conflicts*, C1** | `0065` step 3 is **OUT** of this window |
> | `Ruling B` *(runbook context)* | **`RUNBOOK-B`** | ***Conflicts*, C2** | 🚨 **TWO PARTS — write both.** **(1)** `0220` §8 step 3 (the rotation / **W8**) is **OUT** of this window, **AND (2)** it is **filed separately** ⇒ [`0294`](../tasks/backlog/0294-prove-a-rotated-value-overwrites-the-persisted-one-on-the-live-profile-box/brief.md). ⚠️ **Citing it for the removal alone loses WHY `0294` exists** — the owner's point was *"`0220` closes with a recorded, deliberate gap rather than an unnoticed one."* |
> | `Ruling C` *(runbook context)* | **`RUNBOOK-C`** | ***Gaps*, G1** | **No rollback / abort section will be written** — *"Skip it — I know the boxes."* |
> | `Ruling D` *(runbook context)* | **`RUNBOOK-D`** | ***Conflicts*, C3** | the egress-IP work becomes a task on **Sprint 5** ⇒ [`0295`](../tasks/backlog/0295-measure-the-game-prod-egress-ip-and-append-it-to-the-profile-internal-allowlist/brief.md) |
> | `Ruling E` *(runbook context)* | **`RUNBOOK-E`** | W0.1, and `0295`'s brief | **measure the egress IP at W0 anyway** — ⛔ Sprint 5 placement is not permission to skip it |
> | `Ruling F` *(runbook context)* | **`RUNBOOK-F`** | `0294`'s brief | `0294` **stays on the Backlog board** |
> | `Ruling G` *(runbook context)* | **`RUNBOOK-G`** | `0220`'s brief | `0220` **may close with the gap recorded** — ⛔ authorizes the *wording*, not a close |
>
> ⚠️ **`RUNBOOK-B` and `RUNBOOK-C` were never cited by letter in any document** — this runbook recorded
> them as **C2** and **G1** from the start. They are mapped above for completeness; **cite C2 and G1 when
> writing new text.**
>
> 📌 **This runbook's own section labels — `C1`, `C2`, `C3`, `G1`…`G4` — are section-scoped
> (*Conflicts*, *Gaps*) and were NEVER part of either A–G sequence.** They are untouched and are still
> the right way to cite those items from inside this file.
>
> ## ✅ FOUR SEQUENCES SHARE LETTERS, NOT TWO. **RULED 2026-09-22 — SETTLED, NOT OUTSTANDING.**
>
> ⚠️ **The collision is real and is described here on purpose. What was ruled is that it is ACCEPTED —
> ⛔ not that it does not exist.** 🚨 **Do not re-open this as a defect to fix.**
>
> **The four sequences, all sharing bare letters:**
>
> | Sequence | Letters | Where it lives | Outcome |
> |---|---|---|---|
> | **2026-09-02** | `Ruling A`…`Ruling D` | [`backlog.md`](../sprints/backlog.md), `0021`/`0024`/`0028` briefs, and [`plan-sprint-4.md`](../sprints/plan-sprint-4.md)'s Backlog-board rows | ⛔ **LEFT AS IS** |
> | **2026-09-17** | `Ruling A`/`Ruling B` | ADR-114 | ⛔ **LEFT AS IS** |
> | **2026-09-22 — sprint plans** | `RULING A`…`RULING G` | [`plan-sprint-4.md`](../sprints/plan-sprint-4.md), [`plan-sprint-5.md`](../sprints/plan-sprint-5.md) | ⛔ **LEFT AS IS** |
> | **2026-09-22 — this runbook** | `RULING A`…`RULING G` | this file + the briefs it drives | ✅ **NAMESPACED → `RUNBOOK-A`…`RUNBOOK-G`** |
>
> **AUTHORITY.** An **OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on
> 2026-09-22**, relayed by `fkit-lead` to a spawned `fkit-producer` holding **no owner channel**
> (ADR-021). ⛔ **Not producer precedent.** Shown all four sequences, the owner chose
> **"Leave them, disambiguate by date."**
>
> **Their recorded reasoning:** the two older sets are **settled history that nothing new cites**, so
> renaming them **churns closed files for readability nobody needs.**
>
> ## 🚨 THE TEST THAT MAKES THESE TWO DECISIONS COHERENT — read it before you call this inconsistent
>
> **One collision was fixed and three were left. That is deliberate, and this is the rule behind it:**
>
> ### ⇒ **The test is "IS IT BEING CITED NOW", ⛔ NOT "is it ambiguous in principle."**
>
> - **The runbook set was namespaced because a LIVE document cited two meanings of one letter** —
>   [`0295`](../tasks/backlog/0295-measure-the-game-prod-egress-ip-and-append-it-to-the-profile-internal-allowlist/brief.md)
>   cites **both** 2026-09-22 sets, and its `RULING E` meant two different rulings depending on which
>   file you stood in. **That is an active document giving a reader a wrong answer.**
> - **The older sets have no such problem.** Nothing active cites them; they are closed files describing
>   decisions already taken. **Ambiguity nobody is reading costs nothing.**
>
> ⚠️ **Without this paragraph a later reader sees one collision fixed and three ignored, and reasonably
> concludes someone lost interest.** ⛔ **They did not. Renaming was scoped to where the ambiguity was
> actually being read.**
>
> ⇒ **Disambiguate the other three by DATE** — every citation above carries one.

Written 2026-09-22 because a `/fkit-status Sprint 4` run found that **five tasks each demand a
profile-box deploy in the same window, under different and partly opposing input conditions, and no
document ordered them against each other.** Improvising that window costs the whole thing: a
mid-slot hang, a deploy that blanks a working value, or a lock-out.

⛔ **No hostnames, IP addresses, ports, tokens, chat ids, bucket names or credentials appear in this
file, deliberately.** Variables are referred to **by name only**. Every value lives in the gitignored
deploy env files or on the box. **This file is tracked in git.**

---

## 🚨 READ THIS FIRST — most of this runbook rests on a prediction

**`0286` step 8 has never run.** Its own brief and plan are blunt about what that means:

> ⛔ *"Nothing verified here is evidence that a real deploy is prompt-free — every claim about
> debconf defaults, `needrestart` and the boxes' distro is a PREDICTION until step 8 runs."*
> — `0286` brief § *Status*; the same statement is `0286/plan.md` § *4* edge case 6.

`0286` is the fix for the defect that **hangs `npm run deploy:profile` on an invisible dialog** — a
hang, not a failure: `set -e` never fires, nothing errors, the apt lock is held, and an unattended
run waits forever (`0286` brief § *Why this is more than a nuisance*).

⇒ **If W2 or W3 below stops on a prompt, every step after it in this runbook is in question**, because
every remaining profile-box task rides the same command.

**What to do about that — stated honestly:** ⛔ **no brief defines an abort or rollback procedure for
this window, and this runbook does not author one — now by OWNER RULING, not by omission** (2026-09-22:
*"Skip it — I know the boxes"*; full record at *Gaps*, **G1**). What it can tell you is the
decision shape: a prompt at W2/W3 means the fix did not cover that call site, the window's remaining
profile-box work is unsafe to run unattended, and the question *"answer the prompt by hand and carry
on, or stop the window"* is **the owner's**, not an agent's.

⚠️ **And even a clean W2/W3 must never be written up as "the deploy can no longer hang."** It can no
longer hang on a **debconf** prompt. A **dpkg conffile** prompt is not covered by
`DEBIAN_FRONTEND=noninteractive` at all — recorded as a live residual under owner ruling D3
(`0286/plan.md` § *4* edge case 3).

---

## The three owner rulings that set the spine

Given live in the `fkit lead` session on **2026-09-22** via `AskUserQuestion`, relayed by `fkit-lead`.
⛔ **Settled. Do not re-open them.**

| # | Ruling | Reason the owner accepted |
|---|---|---|
| **1** | **`0286` step 8 runs FIRST.** | `0219` B4, `0220` §8, `0221` B1 and `0286` itself all need `npm run deploy:profile` to complete, and `0286` is the fix for the defect that hangs exactly that command. Prove it first and the rest of the slot is safe. |
| **2** | **The game deploy runs in the SAME window** as the profile-box work — `0272`, `0273`, `0032` step 5, `0064` step 8. | Both sides must agree on `PROFILE_INTERNAL_TOKEN`, and `0296`'s A1/A3–A4 (ex-`0062`-D1/D3/D4) need a deployed game server; ex-`0062`-D5 passed locally 2026-09-23. 📌 **2026-09-23, later (Sprint 4 rescope, Q2 = (a); OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on 2026-09-23, relayed by `fkit-lead` to a spawned `fkit-producer` (ADR-021); ⛔ not producer precedent):** `0064` step 8 now lives in [`0298`](../tasks/backlog/0298-config-parity-guard-first-real-report-only-production-run-then-arm-enforce/brief.md), split out of `0064`. The ruling's text above is kept as written. |
| **3** | **`0203`'s six pending decisions are deferred until after the deploy.** ✅ **RE-CONFIRMED BY THE OWNER 2026-09-22** (live in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead`; ⛔ not producer precedent). 🚨 **The deferral SURVIVES the slipped slot** — it is *"after the window"*, **not** *"after 2026-09-20"*, so it still holds now that the window is undated. ⛔ **`0203`'s `## Status` marker was NOT touched and no mover was invoked.** 🔓 **LIFTED FOR `0203`, LATER ON 2026-09-23 — Sprint 4 rescope, Q3 = (b), AGAINST the producer's recommendation; OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on 2026-09-23, relayed by `fkit-lead` to a spawned `fkit-producer` (ADR-021); ⛔ not producer precedent.** `0203` stays in Sprint 4, and **its six decisions are taken NOW, before this window.** The row is kept as written: it was true until the lift. `0203`'s consumer (`--enforce` wiring) is now [`0298`](../tasks/backlog/0298-config-parity-guard-first-real-report-only-production-run-then-arm-enforce/brief.md). | ~~Not surfaced here.~~ ✅ **RECORDED 2026-09-22 — the owner's reasoning, same as before:** the **deploy unblocks eight rows and had a date**; **`0203` unblocks one task's `--enforce` wiring** (`0064`'s) **and has no deadline.** ⇒ the deploy goes first. |

---

## 🚨 The live risk this window takes, recorded not softened

**The owner's 2026-09-19 ruling turns crediting on in the same minute `0272`'s and `0273`'s code first
executes in production, with ZERO prior production evidence. They took that knowingly.**

The evidence state, from the tasks' own status fields:

- `0272`: *"the game server is NOT deployed — none of S3's game-side code is running anywhere … No box
  probe has touched `/internal/v1/players/resolve` or `/internal/v1/credit` with a valid token, so
  **S3's end-to-end behaviour has zero production evidence**."*
- `0273`: *"None of S4's **client** code is deployed, so the login flow, the session store, the
  Bearer-token call path and the analytics events have **zero production evidence**."*
- `0273` also: *"nothing has proven a Bearer token is accepted"* — the box's 401-without-a-token proof
  is one-sided.

`0273/plan.md` §4.6 had staged this differently: a game deploy at its step 4 with the card off and the
token still blank, and `0217`'s XP go-live as a **separate later** step 5. **Ruling 2 collapses those
two into one deploy.** ⛔ That is the ruling; it is recorded here, not re-argued.

⇒ **The whole of the mitigation is that a human is watching at W13–W15 below.** `0219`'s G3/G4 — the
only things that would have watched automatically — are **deferred** by the 2026-09-19 split ruling.
The observation steps are placed immediately after the deploy for exactly this reason: so a failure is
**seen**, not discovered later.

---

## 🚨 The allowlist trap — read before you touch `PROFILE_INTERNAL_ALLOW_IPS`

`0217` step 3 tells you to **update `PROFILE_INTERNAL_ALLOW_IPS` to the current game-prod egress IP.**

📌 **That work is now a task:
[`0295`](../tasks/backlog/0295-measure-the-game-prod-egress-ip-and-append-it-to-the-profile-internal-allowlist/brief.md)
on [Sprint 5](../sprints/plan-sprint-5.md)** (C3 ruling, 2026-09-22), and **the whole of this trap is
carried into that brief.** ⚠️ **The measurement is still UNDONE** — read on.

🚨 **That variable is a comma list serving TWO unrelated callers, and it is NOT persist-or-reuse.**

| Caller | Why it is in the list |
|---|---|
| The **game server**, for `/internal/v1/players/resolve` and `/internal/v1/credit` | `0217` § *Barrier 2* |
| The **monitoring box**, for the alert webhook and `0284`'s hourly liveness probe | `alert-delivery-runbook.md` § *What it is* — the route is under `/internal/` **solely** to inherit this allowlist |

⛔ **REPLACE the value and you drop the monitoring box. The first alert after that gets a 403, and a
403 PERMANENTLY DISABLES the notification channel** — silently, with no retry, forever
(`alert-delivery-runbook.md` § *The trap that makes alerting die silently*). **Fixing the address
afterwards does not undo the disable; the channel must be re-enabled by hand in the monitoring UI.**

⇒ **APPEND. Never replace.**

🚩 **Second half of the same trap: the variable has no on-box persistence.** `setup-profile.sh:122`
defaults it to empty, and an empty value renders a bare `deny all` — 403 for everyone. The deploy
warns loudly when it is empty (`setup-profile.sh:1873`), but the warning is the only guard. ⇒ **Every
profile deploy in this window must carry the full list**, including **W3 and W7** below, where you are
deliberately blanking *other* variables. *(⚠️ **Corrected 2026-09-22** — this line read "W3 and W4",
which was a mis-numbering from the day it was written: **W4 is the sshd check, not a deploy.** The
blanking deploy is **W7**.)*

---

## 🚩 Step letters collide — always say which task

**`0219` and `0221` each have hand-off steps named B1–B6, and they are different steps.** `0219` B5 is
container log rotation; `0221` B5 is a daemon restart and a reboot. Every reference below is written
`0219-B5` / `0221-B5`. **Do the same in the worklogs.**

---

## Scheduling constraints that bound the whole window

- ⛔ **No profile deploy between 02:00 and 03:15 UTC**, and none overlapping a backup/restore drill — a
  deploy's smoke backup writes the same daily object (`0273/plan.md` §4.6 step 1; `0219/worklog.md`
  residual R9).
- ⚠️ **Each profile deploy recreates BOTH containers** (including postgres) and **overwrites today's
  daily backup object** (`0219/worklog.md` R9). **TWO** profile deploys in this window means **two**
  overwrites of the same key. Expected, not a fault. *(⚠️ **Was three** until W8 was removed by the
  2026-09-22 C2 ruling.)*
  🚨 **⇒ W7 THEREFORE ERASES W3's BACKUP, AND WITH IT THE PRE-WINDOW STATE. That is why W0 item 5 takes
  a MANUAL SNAPSHOT first** — owner ruling 2026-09-22, closing *Gaps*, **G4**. ⛔ **The overwrite
  behaviour is unchanged; the snapshot works around it.** ⛔ **And it is not a rollback — G1 stays
  declined.**
- ⚠️ **`./build-deploy.sh prod` commits, tags and pushes** before it builds (`build-deploy.sh:50-53`,
  then `./deploy.sh prod <tag>` at `:70`). The working tree at that moment is what ships. ⛔ **Only the
  owner runs it.**
  🚨 **2026-09-23 (Sprint 4 rescope; OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on 2026-09-23, relayed by `fkit-lead` to a spawned `fkit-producer` (ADR-021); ⛔ not producer precedent): Sprint 4 now holds only local work that is still being built:
  `0064` Phase 2, `0253`, `0020`, `0203`.** **Any of it in progress must sit on a BRANCH, out of the working tree, at
  W12**, and before W3/W7, which build from the local tree too. Otherwise it ships. See the W12 checkbox.

---

## THE SEQUENCE

Five tasks demand a profile-box deploy. **`npm run deploy:profile` is literally
`./build-deploy-profile.sh`** (`package.json:39`) — so they are not five deploys. They collapse into
**TWO profile deploys plus one telemetry deploy plus one game deploy**, because `0220` is the only task
that genuinely needs more than one, and **two of its three input conditions now run here.**

| # | What | Command |
|---|---|---|
| W2 | Telemetry deploy | `npm run deploy:telemetry` |
| W3 | Profile deploy 1 — the four secrets **SET** | `npm run deploy:profile` |
| W7 | Profile deploy 2 — the four secrets **BLANK** | `npm run deploy:profile` |
| ~~W8~~ | ~~Profile deploy 3 — one value **rotated**~~ | ⛔ **REMOVED from this window** — C2 ruling, 2026-09-22 → [`0294`](../tasks/backlog/0294-prove-a-rotated-value-overwrites-the-persisted-one-on-the-live-profile-box/brief.md) |
| W12 | Game deploy | `./build-deploy.sh prod` |

⚠️ **TWO CORRECTIONS IN THAT TABLE, both 2026-09-22, and they are different things:**

1. **W8 was REMOVED** by the C2 owner ruling. The step is not deferred inside this document — it is
   **out of this window** and lives in `0294`.
2. **The W-numbers in this table were WRONG from the day it was written** — it listed the blanking
   deploy as `W4` and the rotation deploy as `W5`, but **W4 is `0221`-B2's sshd check and W5 is
   `0219`-B5/B6**. The deploy sections have always been **W7** and **W8**. ⛔ **This was a
   table-versus-sections disagreement, not a re-ordering** — no step moved, and the section numbering is
   unchanged.

---

### W0 — Before the window (read-only; nothing is deployed)

**Why here:** every item is a read that something later depends on, and each one is cheaper to get
wrong now than mid-slot.

1. **Measure the current game-prod egress IP** and **append** it to `PROFILE_INTERNAL_ALLOW_IPS` in the
   gitignored profile env file — *appending*, per the allowlist trap above.
   *Source:* `0217` § *What to build* 3 — *"The current egress IP must be measured, not assumed"*; the
   pinned value is from June. *Record the METHOD, never the address* (`0217` verification step 7).
   ✅ **THIS NOW HAS AN OWNER: [`0295`](../tasks/backlog/0295-measure-the-game-prod-egress-ip-and-append-it-to-the-profile-internal-allowlist/brief.md)
   on [Sprint 5](../sprints/plan-sprint-5.md)**, by the C3 owner ruling of 2026-09-22 — *"Record as a
   task, add it to the Sprint 5, not the current Sprint 4."*

   > 🚨 **`0295` BEING ON SPRINT 5 DOES *NOT* DEFER THIS STEP. THE MEASUREMENT HAPPENS HERE, AT W0.**
   >
   > **RUNBOOK-E** *(renamed 2026-09-22 from a bare `RULING E` — see the namespacing note at the top of
   > this file; ⛔ label change only)*, **an OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on
   > 2026-09-22**, relayed by `fkit-lead` (ADR-021). ⛔ **Not producer precedent.** Shown that the
   > board and the need were in tension, the owner chose **"You measure it at W0 anyway."**
   >
   > **The split, stated once so neither half can be lost:**
   > - **The MEASUREMENT is W0 PREP — 🚨 the OWNER runs it, the day before the window.** The window
   >   depends on it.
   > - **The TASK — choosing and RECORDING the METHOD — stays on Sprint 5** and records what they
   >   found. ⛔ **Do not move `0295` off Sprint 5.**
   >
   > 🚨 **THE MISREADING THIS NOTE EXISTS TO STOP:** reading *"it's on Sprint 5"* as *"skip it this
   > weekend"* — which would leave **W3 running on a JUNE-DATED allowlist**. ⚠️ **A wrong entry is 403
   > on every credit call, indistinguishable from "working", and XP is LOST, not queued. Nothing would
   > tell you.**

   ⚠️ **AN OWNER IS NOT AN ANSWER: `0217`'s Q4 is still UNMEASURED as of 2026-09-22**, and `fkit-lead`
   could not measure it — the prod host is not in any readable env file. ⛔ **Do not run W3 believing
   this is settled.** See *Conflicts*, C3.
   **Constraint that put it here:** doing this before W3 means `0217` step 3's "redeploy the profile
   box" **rides W3** instead of adding a fourth profile deploy.
2. **`0286` step 8's "before" capture**, on each box: `debconf-show keyboard-configuration
   console-setup`, `cat /etc/default/keyboard /etc/default/console-setup`, `dpkg -l needrestart`,
   `cat /etc/os-release`. All read-only.
   *Source:* `0286/plan.md` § *3* Step 8. **A before/after capture has no value if the "before" is taken
   after the deploy.**
   📌 **Partly pre-answered for the profile box, not for telemetry:** `0221/worklog.md` § *B0* recorded
   the profile box as **Ubuntu 26.04.1 LTS**, and its residual notes `needrestart` is an Ubuntu default
   that *"may restart services after an unattended upgrade — including `docker.service`."* ⚠️ **The
   telemetry box's distro is recorded nowhere in this repository.**
3. **Confirm the four `0220` variables do not collide with `0217`'s token.** ✅ **Verified in the tree
   on 2026-09-22, not taken on trust:** `setup-profile.sh:754-757` persists exactly
   `YANDEX_PAYMENTS_SECRET`, `FEEDBACK_TELEGRAM_TOKEN`, `FEEDBACK_TELEGRAM_CHAT_ID`,
   `TELEGRAM_PROXY_URL`. **`PROFILE_INTERNAL_TOKEN` is NOT among them** — it has its own separate
   reuse/persist/generate branch at `setup-profile.sh:673-689`. ⇒ **`0220` and `0217` cannot collide.**
4. **Open the first SSH session to the profile box and leave it open.** It must survive W3.
   *Source:* `0221` § *What to build* 3 — *"Do not lock yourself out. Verify the new config from a
   second, already-open session before closing the first."*
5. 🚨 **TAKE A MANUAL SNAPSHOT OF THE CURRENT BACKUP OBJECT — copy it aside under a distinct name,
   BEFORE anything in this window runs.** ✅ **OWNER RULING 2026-09-22**, given live in the `fkit lead`
   session via `AskUserQuestion` and relayed by `fkit-lead` (ADR-021). ⛔ **Not producer precedent.**
   **This closes *Gaps*, G4.**

   > **WHY, as the owner was shown it.** This window runs **TWO** profile deploys (**W3** and **W7**).
   > Each takes a **smoke backup**, both land on the **same UTC day**, and the backup is a **daily
   > object keyed by date** — so **W7 OVERWRITES W3's, and the pre-window state is gone.** Normally
   > that is tolerable because you would roll back instead — but **a rollback procedure was declined
   > (G1).** Neither fact alone worried the owner; **both in one window did.**
   >
   > **Their stated reason for this fix:** one command in prep, it preserves what W7 would erase, and
   > it **does not reopen G1 or change the deploy sequence.**

   **⛔ THE LIMIT — READ IT BEFORE YOU RELY ON THIS.** 🚨 **This preserves a STARTING POINT. It is NOT
   a rollback procedure and it does NOT make the window recoverable.** It gives you an encrypted copy
   of the database as it was before the window; it tells you **nothing** about how to unwind a half-run
   window, who decides, or how far back to go. ⛔ **G1 stays declined and open.**

   **THE MECHANISM — established from the repo, not invented.** The "copy an object aside" operation
   already exists and is proven: `profile-backup.sh:174-176` does exactly this every Sunday (a
   **server-side `rclone copyto`** from the verified daily object to a second key in the same bucket),
   and task [`0241`](../tasks/done/0241-profile-verify-first-weekly-backup-copy/brief.md) verified that
   copy live. The snapshot is the same call with a different destination prefix.

   ⚠️ **BUT IT IS NOT A SUBCOMMAND — DO NOT GO LOOKING FOR ONE.** `profile-backup.sh`'s dispatch
   (`:264-269`) accepts **only** `backup`, `restore` and `help`. There is **no** `snapshot` / `copy`
   command. This is an `rclone` call run **with the script's own environment loaded**, because rclone
   is configured *entirely* from `RCLONE_CONFIG_PROFILES_*` in `backup.env` — there is deliberately no
   `rclone.conf` (`:39-43`).

   **Run as root on the profile box.** Values come from the environment; ⛔ **nothing below is a
   credential, a bucket name or a key — those stay in the 0600 `backup.env`, which is where they
   belong.**

   ```bash
   set -a; . /opt/profile/backup.env; set +a      # same load the script does (load_env)
   export RCLONE_CONFIG=/dev/null                 # deliberate — profile-backup.sh:43
   PREFIX="${PROFILE_BACKUP_S3_PREFIX:-profiles}" # default per profile-backup.sh:96
   DAY="$(date -u +%Y-%m-%d)"                     # keys are UTC-dated — profile-backup.sh:134-136
   SRC="profiles:${PROFILE_BACKUP_S3_BUCKET}/${PREFIX}/daily/profile-${DAY}.dump.age"
   DST="profiles:${PROFILE_BACKUP_S3_BUCKET}/${PREFIX}/pre-window/profile-${DAY}.dump.age"

   rclone lsf "profiles:${PROFILE_BACKUP_S3_BUCKET}/${PREFIX}/daily/"   # 0) SEE WHAT ACTUALLY EXISTS
   rclone size --json "$SRC"      # 1) CONFIRM IT EXISTS and note the byte count
   rclone copyto "$SRC" "$DST"    # 2) server-side copy — same call shape as the Sunday weekly copy
   rclone size --json "$DST"      # 3) sizes MUST match before you call this done
   ```

   *(`rclone size --json` is the repo's own existence/size check — `remote_size()`, `:104-105`. The
   `profiles:` prefix is the rclone **remote name**, hardcoded in the script; it is not a hostname.)*

   🚨 **TODAY'S OBJECT CAN LEGITIMATELY BE ABSENT, AND THAT IS NOT A FAILURE — HANDLE IT, DO NOT SKIP
   THE STEP.** The daily object for *today* only exists once **today's nightly cron has already run**.
   If W0 happens before it fires, `profile-${DAY}` is simply **not there**. ⇒ **That is what step 0's
   listing is for: snapshot THE NEWEST OBJECT THAT ACTUALLY EXISTS, and set `DAY` to match it.**
   ⛔ **Do not copy a non-existent key and record a success.**

   > 📌 **A CORRECTION TO THIS RUNBOOK'S OWN EARLIER DRAFT, recorded so the refusal is not re-derived.**
   > An earlier version of this step avoided `rclone lsf` on the stated grounds that it *"appears
   > nowhere in this repo"*, and told you to walk the date backwards with `rclone size --json` instead.
   > ⛔ **THAT GROUND WAS FALSE — it was asserted without a full-repo check.** `rclone lsf` **is**
   > established here: [`profile-backup-restore-runbook.md`](profile-backup-restore-runbook.md):80
   > lists this very `daily/` prefix with the same `backup.env` load, and `tests/profile-backup-dryrun.sh`
   > uses it four times (`:205`, `:316`, `:375`, `:389`). ✅ **Listing is now the instruction**, because
   > it shows you what is really there instead of guessing dates. ⚠️ **The refusal RULE was right and
   > still stands — do not put an unproven call in a prep step; this particular call just turned out to
   > be proven.**

   ⚠️ **FOUR RESIDUALS, RECORDED NOT SOFTENED:**
   - ⛔ **The snapshot is ENCRYPTED and the box CANNOT decrypt it.** The box holds only the age
     *recipient* (public) key; the private identity is deliberately off-box (`profile-backup.sh:17-18`).
     **Without the off-box age identity this file is unreadable** — see
     [`0281`](../tasks/backlog/0281-profile-backup-age-identity-custody-move-to-the-owners-password-manager/brief.md).
   - **Nothing ever deletes it.** The prune touches `daily/` and `weekly/` only (`:183-184`), so a third
     prefix is **not** swept. That is the point — but it means **you must remove it by hand** when the
     window is done and its state is no longer wanted.
   - ⚠️ **"Our script does not prune it" is NOT "the bucket keeps it forever."** ⛔ **This repository
     cannot see a bucket-side lifecycle rule** and does not claim there is none.
   - 📌 **This confirms G4's premise rather than removing it.** The deploy smoke check overrides only
     the *marker* file (`last-smokecheck.json`, `:35-36`); **the backup OBJECT still lands on the same
     daily key.** Two same-day deploys still mean two overwrites of it.

   ⛔ **This step must COMPLETE before W3.** After W3 the pre-window object is already gone.

---

### W1 — `0286`'s local gates are already green; do not re-run them to feel safe

`0286` steps 1–7 are complete and the gates were re-run independently by `fkit-lead`: `bash -n` exit 0,
hardening harness `ALL PASS`, `npm test` 138 suites / 1870 tests, `npm run lint` exit 0, and the three
scripts show **+44 / −0** — zero deletions, so no `apt` line was touched (`0286` § *Status*).

The export is in the tree: `setup-profile.sh:88-97`, above the `flock` block, as its comment requires.

⇒ **Nothing local remains. W2 is the first real act of the window.**

---

### W2 — `0286` step 8, telemetry half · `npm run deploy:telemetry`

**Ruling 1. Telemetry before profile, for a reason beyond the ruling:** this is the box where the
defect was **observed** on 2026-09-18 (three prompts: `keyboard-configuration` country,
`console-setup` encoding, `console-setup` character set — `0286` § *Context*), and it is the box with
**no dependent task riding it**. If the fix does not work, you learn it where nothing else breaks.

- [ ] Deploy runs **start to finish with no prompt** — `0286` verification step 1.
- [ ] "After" capture of the four reads from W0.2. **Expected: byte-identical**, because both packages
      are already configured, so the noninteractive frontend returns the box's stored answer rather than
      a fresh template default. ⚠️ **That is a prediction, stated as one** (`0286/plan.md` Step 8).
      **If the files changed, the fix silently altered box state and must be reconsidered.**
- [ ] Record the date and the package names in `0286`'s worklog. ⛔ **No IP, no hostname, no token.**

---

### W3 — Profile deploy 1 · `npm run deploy:profile` · **four tasks ride this one command**

**Why one deploy:** `0219`-B4, `0220` §8 step 1, `0221`-B1 and `0286` step 8's profile half all call
`./build-deploy-profile.sh` (`package.json:39`). Their preconditions do not conflict — `0221`-B1 only
adds *"run it from a second terminal while the first SSH session stays open"* — so **one invocation
produces all four sets of evidence.**

📌 **2026-09-24 — `0253` RIDES THIS COMMAND TOO** (owner ruling 2026-09-24, *"Yes, ship it Saturday"*, live in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021); ⛔ not producer precedent). `./build-deploy-profile.sh` builds from the
working tree, and [`0253`](../tasks/done/0253-tenure-xp-grant-for-existing-players-at-citizenship-launch-research-and-rule/brief.md)'s
server code (closed 2026-09-24, uncommitted) sits there. The heading's *"four tasks"* is kept as written; this is the fifth.
- **The tenure claim route, `POST /v1/profile/tenure-grant`, goes live on the profile box at W3, if the window runs.**
  It is wired in `src/profile-server/Server.ts`, so it answers at once. It does not wait for the flag.
- 🚨 **The owner-accepted claim-on-behalf risk (ADR-112, amended) opens at W3, not at `0065`'s flip.**
  The `CITIZENSHIP_CARD_ENABLED` flag hides only the client popup, not the server route. [`0268`](../tasks/backlog/0268-remove-tenure-xp-claim-logic-after-60-days/brief.md)
  is the task that closes the risk.
- **W12's game deploy carries `0253`'s client code.** It stays inert while `CITIZENSHIP_CARD_ENABLED` is `false`.
- The owner has said he will postpone the release if `dev` is not ready. If the window does not run, none of
  the above happens on 2026-09-26.

**Run it from a second terminal. W0.4's session stays open.**

Watch for, in one pass:

| Observation | Source |
|---|---|
| **No prompt, start to finish** | `0286` verification step 2 — *"the script with the larger surface"* |
| Four `Using … from environment` lines, plus the value-parity block | `0220/plan.md` §8 step 1 |
| `600 root` on the four persist files (⚠️ `stat -c '%a %U'`, **not** `ls -l` — a size is a length) | `0220/plan.md` §8 step 1 |
| `PRUNING UNUSED IMAGES` lists kept IDs, removes ~9 images | `0219/worklog.md` Part B — B4 |
| `INSTALLING OPERABILITY CHECKS`, cron rewritten with the `checks.sh` line, smoke backup runs | `0219/worklog.md` B4 |
| `Effective Unattended-Upgrade::Allowed-Origins` + the dry-run allowed-origins line; `fail2ban-client status sshd`; the four `✅ sshd: …` lines | `0221/worklog.md` Part B — B1 |
| Both containers recreated, health gate passes, migrations no-op | `0219/worklog.md` B4 |

🚩 **EXPECT `alerting: no`, NOT the hand-off's predicted `alerting: yes`.** `0219`-B2 is deferred by the
2026-09-19 split ruling, so there is no `PROFILE_CHECKS_PING_URL`. ⛔ **That is the ruling working, not
a deploy failure — do not "fix" it by inventing a ping URL** (`0219` § *Consequence of that mapping*).

✅ **One worry that cancels itself, so nobody chases it:** `0221/worklog.md` records *"First `checks.sh`
run after B1 pages on `reboot-required` … until B5's reboot."* With `0219`-B2 deferred there is no ping
URL, so **nothing can page.** The on-box checker still installs and still runs; nothing is listening.
That is precisely the cost the owner accepted.

---

### W4 — `0221`-B2 · sshd, from a NEW session · **before anything else, and before you close W0.4**

**Constraint that put it here, and it is the strongest ordering constraint in the window:** W3 is the
deploy that hardens sshd. **If it locked you out, every remaining step in this window is dead.** The
check costs seconds and the first session is still open to recover from.

- [ ] From a **new** session: key login works.
- [ ] Password auth is refused (`Permission denied (publickey)`).
- [ ] **Only then close the first session.**

*Source:* `0221/worklog.md` Part B — B2; `0221` verification step 3 — *"Never verify this by closing
your only session."*

---

### W5 — `0219`-B5 and `0219`-B6 · rotation and prune observed

**Constraint that put it here:** `0219`-B6 proves the prune **kept the rollback image**. *"A prune that
breaks rollback is worse than no prune"* (`0219` verification step 2). Reading it **now, after one
deploy**, means a prune defect is caught before two more image builds are stacked on it.

- [ ] **`0219`-B6:** `docker images --digests` = current + previous profile digests + `postgres` only;
      `docker image inspect "<previous digest>"` succeeds ⇒ **rollback image survived.**
- [ ] **`0219`-B5:** both containers report `json-file` with `max-size=100m,max-file=10`; observed
      rotation via one throwaway container at `max-size=1m --log-opt max-file=2` writing ~3 MB until
      `*-json.log.1` appears, then `docker rm` it.

*Source:* `0219/worklog.md` Part B — B5, B6. ⚠️ **Configuration alone does not satisfy `0219`
verification step 1** — an observed rotation is required.

---

### W6 — `0217` step 0 and its two read-only confirmations

**Constraint that put it here:** W3 already ran migrations. `migrate.ts` is idempotent
(`0217` § *This task may be carrying a migration nobody has applied*), so this is a **run-and-confirm**,
and it must settle before rows start appearing at W12.

- [ ] `npm run migrate` against the profile DB (safe either way).
- [ ] `schema_migrations` lists **`001`–`004` and `006_player_identity.sql`**, and **no `005`**
      (deleted, never deployed) — `0217` § *What to build* 0, corrected 2026-09-15.
- [ ] ⚠️ **Record whether `004` was ALREADY there or was applied now.** That is the answer to `0217`'s
      Q9 — whether `0067`'s profile-server half was ever deployed — and **nothing else can establish
      it** (`0217` verification step 8). *Expect "already there":* `fkit-lead` read the box on
      2026-09-15 and recorded `001`–`004` applied.
- [ ] The three name-change routes respond, **not 404**, on the deployed image (`Routes.ts:739`, `:784`,
      and the internal decide route) — `0217` verification step 9. *"A migration applied against an
      image that does not serve the routes is half the fix."*

---

### W7 — Profile deploy 2 · the four secrets **BLANK** · **this is `0220`'s proof**

**Constraint that put it here:** `0220/plan.md` §8 fixes its own internal order — set, then blank, then
rotated — and says plainly *"step 1 alone proves nothing about reuse."* This deploy is the one that
proves the silent-overwrite class is closed.

⚠️ **THIS IS NOW THE WINDOW'S LAST PROFILE DEPLOY.** The third (*rotated*) is **out** by the C2 ruling
of 2026-09-22 → [`0294`](../tasks/backlog/0294-prove-a-rotated-value-overwrites-the-persisted-one-on-the-live-profile-box/brief.md).
⛔ **The §8 order is NOT re-ordered by that** — steps 1 and 2 still run here, in this order; step 3
simply does not run in this window. ⚠️ **`0220`'s §8 says steps 2–3 together are what prove the defect
closed. Only step 2 runs here** — so the close must say so, not round it up.

🚨 **Blank EXACTLY the four, and nothing else.** Not the whole environment.

- ⛔ **`PROFILE_INTERNAL_ALLOW_IPS` must still carry the full list** — it has no persistence
  (`setup-profile.sh:122`), and an empty one renders `deny all`: 403 on every credit call **and** a
  permanently disabled alert channel. See the allowlist trap above.
- ⚠️ **If `PROFILE_INTERNAL_TOKEN` is also blank in that shell it is harmless but noisy:** the box
  reuses its persisted value (`setup-profile.sh:673-689`), and the deploy's parity block then prints a
  **FINDING** line because its source is `persisted`, not `environment` (`setup-profile.sh:900-903`).
  Report-only. Expect it; do not act on it.

Observe:

- [ ] `Reusing persisted <NAME>` ×4 in the deploy output — `0220` verification step 2, *names only,
      never a value and never a length*.
- [ ] `grep -c '^NAME=.\+$' /opt/profile/profile.env` → **1 per variable** (a content-free non-empty
      proof).
- [ ] The container startup log **no longer prints the four `not set` warnings**.

*Source:* `0220/plan.md` §8 step 2.

---

### ~~W8 — Profile deploy 3 · one value **rotated**~~ — ⛔ **REMOVED FROM THIS WINDOW, 2026-09-22**

🚨 **THIS STEP DOES NOT HAPPEN IN THIS WINDOW.** ⛔ **The number W8 is left deliberately VACANT rather
than renumbered**, so W9–W15 keep the identities any worklog or hand-off already refers to (ADR-035 —
appended, never renumbered). **There is no third profile deploy. W7 is the last one.**

**AUTHORITY.** The **C2 owner ruling of 2026-09-22** — *"Skip it now, file it separately"* — given live
in the `fkit lead` session via `AskUserQuestion` and relayed by `fkit-lead`. Full record and the reason
the step exists at all: ***Conflicts*, C2** below. ⛔ **Read it before concluding the step was
unnecessary — it is NOT.**

⇒ 📌 **The work lives in [`0294`](../tasks/backlog/0294-prove-a-rotated-value-overwrites-the-persisted-one-on-the-live-profile-box/brief.md)**
(Backlog board). ⚠️ **`0220` therefore closes with a KNOWN, DELIBERATE gap in its verification step 3 —
recorded in its brief, and it must be restated at its close.**

⚠️ **WHAT THIS DOES NOT MEAN.** The rotation property is **not** unproven in general:
`tests/scripts/profile-deploy-hardening.test.sh:613-638` (**T13**) proves it against stubs and is gated
by `npm test`. **What is missing is live-box evidence, and only that.** ⛔ Do not report it as fully
proven, and do not report it as entirely unproven.

---

### W9 — `0221`-B3 and `0221`-B4 · fail2ban and unattended-upgrades

**Constraint that put it here:** B3 deliberately triggers a ban. Running it **after** the last profile
deploy means no remaining deploy in this window depends on the SSH path it could disturb. Its 1-hour
expiry is then a background tail that still lands inside the window.

✅ **It cannot cut the crediting path, and here is the evidence rather than the reassurance:** the jail
is **port-scoped** to the SSH ports (`setup-profile.sh:479`, `port = ${SSH_PORTS_CSV}`; the banaction
is the distro default — nftables on Ubuntu 26.04 — per the comment at `setup-profile.sh:462`). A ban
does not touch HTTPS.

- [ ] **`0221`-B3:** 5+ failed auths from a **throwaway** source — ⛔ *never the operator's only path* —
      → `fail2ban-client status sshd` shows the ban and the `Ban` line is in the log; then the 1 h
      expiry observed, **or** an explicit unban after recording it. **Say which.**
- [ ] **`0221`-B4:** read `/var/log/unattended-upgrades/unattended-upgrades.log` after the first timer
      run, or cite W3's dry-run allowed-origins line. ⚠️ *"The package is installed"* is not evidence
      (`0221` verification step 1).

*Source:* `0221/worklog.md` Part B — B3, B4.

---

### W10 — `0221`-B6 then `0221`-B5 · SIGTERM drain, then daemon restart and reboot

**Constraint that put these here, and why B6 comes before B5:**

1. **They must follow the last profile deploy.** `0221`-B5 proves `unless-stopped` survives a **Docker
   daemon restart** — the specific hole `on-failure` left (`0221` verification step 5). A later deploy
   recreates both containers, so evidence gathered before **W7** would be about containers that no
   longer exist. *(⚠️ **Updated 2026-09-22** — this read "before W8". **W8 is removed**, so **W7 is now
   the last profile deploy** and the constraint anchors there. ✅ **The constraint itself is UNCHANGED
   and still binding** — it was never about W8 specifically, it was about *the last profile deploy*.)*
2. **They must precede the game deploy.** The reboot takes the box down. If it does not come back
   cleanly, **you want to know that before crediting is switched on**, not while chasing a lost credit.
3. **B6 before B5** so the window's last act on this box leaves it in the proven-up state. B6 stops a
   container; B5 ends with both up after a reboot.

- [ ] **`0221`-B6:** `docker compose stop profile-api` with a `curl /ready` loop running → logs show
      `SIGTERM received — draining`, `http server closed — in-flight requests drained`, `pg pool
      closed`; `docker inspect --format '{{.State.ExitCode}}'` → **0** (today 1/143); stop < 10 s.
      **Then start it again.**
- [ ] **`0221`-B5:** record `systemctl is-active profile`; `systemctl restart docker` → `docker compose
      ps` shows **both up**. Then **`reboot`** → both up; `reboot-required` gone; the next `checks.sh`
      run green on that check.

*Source:* `0221/worklog.md` Part B — B5, B6.

⚠️ **`needrestart` is the reason B5 is not academic.** It is an Ubuntu default and may restart
`docker.service` after an unattended upgrade — *"exactly the G7 case `unless-stopped` now covers"*
(`0221/worklog.md` residuals).

---

### W11 — Pre-flight for the game deploy · **the last cheap chance to catch a silent barrier**

**Constraint that put it here:** both checks read the **final** profile-box state, so they must follow
W10 — and both catch, for free, failures that are **indistinguishable from "working"** once the game
server is live.

🚨 *"A 401 and a 403 are indistinguishable from 'working' at the game server, because the client never
surfaces either"* (`0217` § *Barrier 2*). A dropped credit is **lost, not queued**.

- [ ] **`0296`-A1 (ex-`0062`-D1) — token-match pre-check.** Run the verdict-only script from `0062/worklog.md`
      § *Deploy-pending*: it prints **only** `MATCH` / `MISMATCH` / `LOCAL-ABSENT` / `REMOTE-ABSENT` —
      never a value, never a hash.
      ⛔ **On `MISMATCH`: fix local `.env.prod` from the VPS-persisted token. NEVER regenerate the VPS
      token** (stability contract). ⚠️ **Do not "simplify" the sourcing form back into a `grep`/`cut`** —
      that form was *wrong when written* and produced false `MISMATCH`, aiming the reader straight at
      the riskiest action (correction of 2026-09-04, same section).
- [ ] **Re-run `0276`'s probe set** — eleven read-only probes from a non-allowed host (three case
      variants, four edge forms, all four internal routes) → **403 on every one**; plus one from the
      allowed game box → **401**.
      **That 401 is the one that matters.** It proves the lowercase internal path passes the nginx
      allowlist and reaches `internalAuth`, so afterwards **a 403 is the allowlist and a 401 is the
      token** — the distinction that makes W13 diagnosable at all. All probes are plain `curl`s and
      change nothing.
      *Source:* `0217` § *The `/internal/` boundary now has re-runnable box evidence — inherit it*.
- [ ] Set `PROFILE_API_URL` and `PROFILE_INTERNAL_TOKEN` in the game's production env
      (`0217` § *What to build* 1–2). 🚨 **"Matching" is the whole point — not "set", not "non-empty":
      the same value on both sides.**

---

### W12 — Game deploy · `./build-deploy.sh prod` · **ruling 2**

One command carries `0272` (S3 game server), `0273` (S4 client), `0032` step 5's build, ~~`0064`~~ [`0298`](../tasks/backlog/0298-config-parity-guard-first-real-report-only-production-run-then-arm-enforce/brief.md) step 8's
observation *(split out of `0064` on 2026-09-23, rescope Q2 = (a))*, and — because `PROFILE_INTERNAL_TOKEN` is now non-blank — `0217` step 4 and the
deploy that `0296` section A (ex-`0062` D1–D4) has been waiting for.

It bumps, commits, tags and pushes (`build-deploy.sh:50-53`), builds, then calls
`./deploy.sh prod <tag>` (`:70`).

- [ ] 🚨 **BEFORE you run it: no Sprint 4 work in progress is in the working tree.** `./build-deploy.sh prod`
      commits and ships the tree **as it stands** (`build-deploy.sh:50-53`). Any unfinished `0064` Phase 2 /
      `0253` / `0020` / `0203` change must sit **on a branch, out of the working tree**. Check with `git status` first.
      *(Added 2026-09-23 with the Sprint 4 rescope. The profile deploys at W3 and W7 also build from the local tree, so the
      same check applies before them.)*
- [ ] **[`0298`](../tasks/backlog/0298-config-parity-guard-first-real-report-only-production-run-then-arm-enforce/brief.md) (ex-`0064` step 8) — the parity guard runs clean, report-only.** Capture its full output into `0298`'s worklog (names and verdicts only). `deploy.sh:60-61` invokes
      `check-config-parity.mjs --pipeline=all --report-only || true`. ⛔ **Report-only. A non-zero exit
      here would fail a deploy and is out of scope** (`0064` verification step 6). Arming is ~~`0064`'s
      own~~ `0298`'s, after all ten of `0203`'s items. ~~**and `0203` is deferred by ruling 3.**~~ *(2026-09-23: ruling 3 is
      lifted for `0203`, whose decisions are taken before this window. Arming still does **not** happen in it.)*
- [ ] **The config VALUE guard, report-only** *(added 2026-09-24: `0064` Phase 2, closed that day)*. `deploy.sh:332`
      runs `run_config_value_guard || true` (the function is at `deploy.sh:82-98`). It prints its own block
      **after** the parity guard's, headed `── config value guard (report-only) · deploy env: prod`. It checks
      the **values** this deploy is about to send, not just the names, and it prints names and verdicts only,
      never a value. Capture this block into `0298`'s worklog too: this is Phase 2's first real run.
      What its lines mean, in plain terms:
      - **`REQUIRED N`**: values that break a rule, one name per line after it. **`forwarded but EMPTY`**
        means the value is blank. The other wording is a format rule: `PUBLIC_PROTOCOL` must be `https`,
        and `API_BASE_URL`, `JWT_ISSUER` and `PROFILE_API_URL` must be `https` URLs whose host is not a
        bare IP. Report-only: it does **not** stop the deploy today. Once `0298` arms `--enforce`, any
        REQUIRED line blocks the deploy.
      - **`OPTIONAL N`**: blank, but allowed by a recorded decision in `scripts/config-parity-allowlist.json`.
      - **`OK N`**: values that pass.
      - **`UNCHECKED N`**: sent to the server, but nothing reads them, so they are not judged.
      - **`NOT JUDGED N`**: appears **only on a non-prod deploy**, because the value rules apply to prod
        only. **You should not see it here.** If you do, this deploy is not running as `prod`: stop and check.
      - `VALUE-UNKNOWN`, `PARSE-FAILURE`, `SKIP`, `NOTE` and `INFO` lines are about the guard itself, not about
        a config value. `VALUE-UNKNOWN` means a source variable never reached the checker (a wiring fault).
        Record each one in `0298`.
      - The last line should read `report-only — exit 0, this cannot fail a deploy`.
      🚨 **Expected if `.env.prod` lacks the token:** a `REQUIRED` line naming
      `PROFILE_INTERNAL_TOKEN — forwarded but EMPTY`. **The token should now always be set**: the
      blank-by-hand rule was **retired** on 2026-09-24 (owner, verbatim: *"Retire it"*; see `0296`'s top
      box), and this slot needs it set and matching anyway (W11). If you see that line, the token is
      missing. Treat it as a missed precondition, not as noise.
- [ ] ⚠️ **Parity cannot catch the thing you are doing here.** It compares **names**, and
      `PROFILE_INTERNAL_TOKEN` *is* forwarded correctly (`deploy.sh:350`; *was cited as `:312`, re-verified
      2026-09-24*). ~~A present-when-it-should-be-
      blank value is a Phase 2 concern that does not exist yet (`0064` § *What to build* 5).~~ *(Struck
      2026-09-24. Phase 2 exists now: the value guard above flags a **blank** token. "Present when it should
      be blank" no longer arises, because the blank-by-hand rule was retired that day.)*
      **W11's A1 (ex-`0062`-D1) is the only guard** that the value **matches** the box's. The value guard
      sees only whether it is blank.

---

### W13 — 🚨 Watch it. Immediately. · `0273`, `0296`-A2/A4 (ex-`0062`-D2/D4)

**Constraint that put these first among the post-deploy checks:** they fire on a **page load**, so they
are observable within seconds — before any match has to finish. And per the live-risk section, a human
watching is the entire mitigation.

- [ ] **`0273`'s live check** (plan §4.6 step 4), in the browser network tab: exactly **one**
      `POST /v1/login` per logged-in load, and **zero** on a guest load. ⚠️ With the card off there are
      no other profile calls to inspect, so Bearer on the other five callers rests on the client tests
      plus the earlier on-box check — **not on production**.
- [ ] **`0296`-A2 (ex-`0062`-D2) — the token reaches the container non-empty.**
      `docker exec <container> sh -c 'test -n "$PROFILE_INTERNAL_TOKEN" && echo NONEMPTY || echo EMPTY'`
      🚨 **This is the deploy that finally makes D2 mean something.** D2 was run 2026-09-04 and came back
      **INCONCLUSIVE** because the owner had deliberately blanked the value — *"forwarding an empty value
      and never forwarding at all are indistinguishable at the container"* (`0062` § *Status*; now `0296` A2).
      ⛔ **Do not read an empty result as a failure of the fix without checking the source value first.**
- [ ] **`0296`-A4 (ex-`0062`-D4) — the partial-config warning does NOT fire** with both variables set
      (`ProfileApiClient.ts:69`, `:73`), and no token value appears in any log line or deploy output
      (`0217` verification step 6 — check `deploy.sh` does not echo the heredoc it writes).
- [ ] **Read the profile-server error log.** The baseline to beat is the one `fkit-lead` established at
      the 2026-09-17 profile deploy: **zero error-level lines since boot** (`0272` § *Status*).

---

### W14 — `0296`-A3 (ex-`0062`-D3) / `0217` V3 / `0272` live · **the acceptance criterion of the window**

🚨 **`0217`'s own words: this is the acceptance criterion. Not "the variable is present"; not "the
deploy printed a warning-free line" — a real call, working. It is the only check that catches either
silent barrier.**

> ## ⏱️ THE WATCH — WHO RUNS IT, HOW LONG, AND WHAT ENDS IT. ✅ DEFINED BY THE OWNER 2026-09-22.
>
> **AUTHORITY.** The **owner defined this themselves**, given live in the `fkit lead` session via
> `AskUserQuestion` on **2026-09-22**, relayed by `fkit-lead` to a spawned `fkit-producer` holding **no
> owner channel** (ADR-021). ⛔ **Not a producer proposal and not a draft they approved — their own
> definition.** ⛔ **Not producer precedent, and ⛔ NOT licence to invent any other gap's content.**
>
> 📌 **This closes gap G3**, which this runbook had refused to author. See *Gaps*, **G3**.
>
> **WHY IT MATTERS, stated before the rule:** **W12 has ZERO prior production evidence**, and with
> `0219`'s **G3/G4 deferred**, ⚠️ **a person watching is the ENTIRE mitigation.** There is no automated
> watcher and nothing else will tell you.
>
> | | The definition |
> |---|---|
> | **Watcher** | 🚨 **The OWNER.** They run the window; there is no other candidate, and this runbook says so rather than leaving it to *"someone"*. |
> | **Duration** | **Until the first credit lands.** ⚠️ **EVENT-BASED, NOT CLOCK-BASED.** |
> | **Stop condition** | 🚨 **BOTH of the two below — ⛔ NOT either.** |
>
> **⚠️ WHY EVENT-BASED, recorded because the alternative was offered and declined:** the owner was shown
> a **15-minute time-box** and chose this instead. **A time-box can expire having proven nothing** — if
> no match completed inside it, the clock ran out and the thing under test never happened. **The watch
> ends when the thing being tested actually happens.**
>
> **STOP CONDITION — BOTH, not either:**
>
> 1. ✅ **A row appears in the profile database with XP credited.** The **direct** proof the whole chain
>    worked: game server called, token accepted, write landed.
> 2. ✅ **ZERO error-level lines in the container log since the deploy.** ⚠️ **This is the half that
>    catches the SILENT failures.** A **401 on the credit call surfaces here and NOWHERE a player could
>    ever see it.**
>
> ## 🚨 SILENCE IS A **FAILURE**, NOT A PASS.
>
> **If no credit lands within the watch, INVESTIGATE BEFORE ENDING THE WINDOW.** ⛔ **Do not record
> *"nothing observed"* and move on.**
>
> **The owner's reason, recorded because it is the whole point:** ⚠️ **silence is exactly what a 401
> looks like from outside** — the client is **fail-soft**, no error is raised, and **XP is LOST, not
> queued.** A quiet log and an empty table are indistinguishable from "it worked and nobody played".
>
> ⛔ **THIS DEFINES W14 ONLY. W13 IS UNCHANGED.** The owner did **not** select W13's page-load / console
> check as part of this stop condition, and it does not need to be: **W13 is the fast, seconds-long
> check that fires on a page load; W14 is the match-level one.** **Two checks, two steps — ⛔ do not
> merge them.**

- [ ] **`0296`-A3 (ex-`0062`-D3):** observe a production match. The worker log shows
      `match credit results: … credited …` with **credited > 0** (`ProfileApiClient.ts:229`).
- [ ] **`0217` V3 / `0272`'s live evidence:** for that real match, a **`players` row**, a
      **`player_identities` row**, and a **`(game_id, player_id)` credit row** — keyed by the internal
      player id, not the Yandex id (corrected 2026-09-15). ⚠️ *"`isConfigured()` being true is not the
      same as `upsertProfile()` and `creditMatch()` succeeding."*
      📌 **Before this step the DB holds 0 players and 0 identities** (`0272` § *Status*), so the first
      non-zero row IS the proof.
- [ ] If it fails: **401 ⇒ the token; 403 ⇒ the allowlist.** W11's probe baseline is what lets you say
      which.

---

### W15 — Tail (starts in the window, finishes outside it)

- [ ] **`0032` step 5 — the re-measure.** ≥24 h after W12, re-run the Uptrace queries **filtered to the
      new `service.version`**: zero `reading 'id'` / `a.id` from `TerritoryLayer.paintTerritory`, zero
      `reading 'smallID'` / `'territoryColor'`, zero `reading 'data'` from `isOnSameTeam`, **for the new
      version only**. ⚠️ **The old version's residue keeps appearing until clients refresh — filter by
      version, do not misread it as a failed fix.** Sanity: `MATCH_PRELOAD_HIT_LOADED` /
      `HIT_NOT_LOADED` unchanged in proportion. *Source:* `0032/worklog.md` § *Step 5 — owner side*.
      ⇒ **The deploy is in this window; the measurement is not.** `0032` cannot close at the slot.
- [x] **`0062`-D5** — local-dev unset case still clean: with `PROFILE_API_URL` unset the client no-ops
      and nothing crashes. Covered by test N2; optional `npm run dev` smoke.
      ✅ **PASSED LOCALLY 2026-09-23** — `0062/worklog.md` § *D5 result — 2026-09-23* (tests + a live
      server-only run with both variables unset). Not a production check; not moved to `0296`.
- ⛔ ~~**`0065` step 3 — the real test purchase.**~~ **REMOVED FROM THIS WINDOW by the C1 owner ruling of
  2026-09-22** — *"Drop `0065` step 3 from the window."* The owner's reasoning, recorded: flipping
  `CITIZENSHIP_CARD_ENABLED` is **a source change plus a second full game deploy**, which is **a
  decision about launching citizenship, not a verification step**, and **it should not ride in on a
  deploy slot.** Full record, including the circularity in `0065`'s own steps 3-vs-6 and the
  re-verified source gate: ***Conflicts*, C1**.
  ⚠️ **The owner's 2026-09-22 confirmation that they WILL perform step 3 still stands** — it is not
  withdrawn, it is **not scheduled here**. ⛔ **`0065` stays `🚧 Blocked`; its `## Status` was not
  touched and no mover skill was invoked.**
  📌 **2026-09-23 — C1's circularity RESOLVED by owner ruling** (see ***Conflicts*, C1**): step 3 and
  the rest of the test-buy sequence moved to
  [`0297`](../tasks/backlog/0297-paid-citizenship-owner-run-test-buy-sequence/brief.md) (Sprint 5, run by
  the owner after go-live). Still **not in this window** — nothing about the window changed.
- [ ] 🚨 **DELETE THE W0 PRE-WINDOW SNAPSHOT — BY HAND, AND *ONLY ONCE THE OWNER JUDGES THE WINDOW
      GOOD*.** ✅ **OWNER RULING 2026-09-22** (live in the `fkit lead` session via `AskUserQuestion`,
      relayed by `fkit-lead`, ADR-021). ⛔ **Not producer precedent.** The owner chose to put the
      cleanup here rather than anywhere else, reasoning: **ownership stays inside the document that
      created the object, so it cannot be orphaned.**

      > ## ⛔ THE PRECONDITION IS THE STEP. READ IT BEFORE THE COMMAND.
      >
      > 🚨 **THIS IS NOT END-OF-SEQUENCE TIDY-UP, AND IT IS NOT DONE JUST BECAUSE YOU REACHED W15.**
      > The snapshot is **the ONLY pre-window state that exists** — W7 already overwrote W3's backup
      > (*Scheduling constraints*; *Gaps*, **G4**), and **there is no rollback procedure (G1)**.
      > ⛔ **Deleting it while ANYTHING is still unresolved throws away the one thing it was taken for.**
      >
      > ⇒ **It is deleted when the OWNER is satisfied the window SUCCEEDED — which may well be AFTER
      > W15 itself finishes.** ⛔ **If you are not certain, DO NOT DELETE. Leaving it costs storage;
      > deleting it early costs the only copy.**

      **THE DELETE CALL — established from the repo, not invented.** `rclone deletefile` on a single
      object is proven on **this** remote: `0215/plan.md:715` prescribes the `copyto` → `size --json`
      → `deletefile` round-trip, and `0215/worklog.md:170` records **all three passing live against the
      new bucket using the box's exact configuration**. Run as root on the profile box, same env load
      as W0 item 5:

      ```bash
      set -a; . /opt/profile/backup.env; set +a
      export RCLONE_CONFIG=/dev/null
      PREFIX="${PROFILE_BACKUP_S3_PREFIX:-profiles}"

      # 1) SEE WHAT IS THERE before deleting anything — never delete a key you have not listed.
      rclone lsf "profiles:${PROFILE_BACKUP_S3_BUCKET}/${PREFIX}/pre-window/"

      # 2) Delete the ONE object you took at W0 (substitute the exact name listed above).
      rclone deletefile "profiles:${PROFILE_BACKUP_S3_BUCKET}/${PREFIX}/pre-window/profile-<DAY>.dump.age"
      ```

      ⚠️ **Success for `deletefile` is SILENCE** (`0215/plan.md:720`). ⛔ **Use `deletefile`, not
      `delete`** — `delete` in this repo is only ever used with `--min-age` over a **directory**
      (`profile-backup.sh:183-184`), and pointing it at the wrong path would sweep more than you meant.

      ⚠️ **THREE RESIDUALS CARRIED FORWARD FROM W0 ITEM 5 — they are why this step exists at all:**
      - ⛔ **The object is ENCRYPTED and the box CANNOT decrypt it.** The private age identity is
        deliberately off-box (`profile-backup.sh:17-18`); see
        [`0281`](../tasks/backlog/0281-profile-backup-age-identity-custody-move-to-the-owners-password-manager/brief.md).
        ⇒ **Before deleting, be sure whoever would need it can actually READ it** — an unreadable
        snapshot you kept and a deleted one are worth the same.
      - **Nothing prunes it automatically.** The script's prune covers `daily/` and `weekly/` only
        (`profile-backup.sh:183-184`), so a third prefix is never swept. **That is why this is a manual
        step** — with no cleanup here the object accumulates indefinitely.
      - ⛔ **"Our script does not prune it" is NOT "the bucket keeps it forever."** 🚨 **This repository
        cannot see a bucket-side lifecycle rule and does not claim there is none.** ⇒ **Do not treat the
        snapshot as durable archival storage**, and do not assume it is still there later without
        listing it.

---

### W16 — Close Sprint 4, then start Sprint 5 · **the last step of the window** · Sprint 4 rescope Q7

📌 **Added 2026-09-23 — OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on 2026-09-23, relayed by `fkit-lead` to a spawned `fkit-producer` (ADR-021); ⛔ not producer precedent.** Rescope **Q7 = (b), AGAINST the producer's recommendation** (which was to keep
Sprint 4 open alongside Sprint 5): ***Sprint 4 closes AT THE DEPLOY.***

- [ ] **The producer closes Sprint 4 with `/fkit-sprint-done`** on deploy day, once W12–W14 are done. Only the producer may
      run it (ADR-033). Run from a session without the owner present, the close carries the
      `(agent-closed — not owner-verified)` marker. It rolls every still-open Sprint 4 row to Sprint 5.
- [ ] **Then the owner starts Sprint 5** himself (owner ruling, 2026-09-23: *no* Sprint 5 banner change before that).
      Until then the window's tasks, which moved to Sprint 5 in the rescope, sit on a `🔲 Backlog` board.
      Ask for them with `/fkit-status Sprint 5`.

🚨 **Plain consequence, recorded not softened:** whatever of `0064` Phase 2, `0253`, `0020` and `0203` is **not finished
by then rolls to Sprint 5.** For `0203` that means `0298`'s arming keeps waiting. For `0253` the deadline that
matters is **before `0065`'s flip** (rescope Q1 = (a)), not this window.

---

## ⛔ What does NOT happen in this window

| Task / item | Why not |
|---|---|
| `0219` **closes** | ⛔ It does not. G3/G4 deferred; the 2026-09-13 hold-open ruling stands. The slot lands B4/B5/B6 only. |
| `0219`-B2, `0219`-B3, `0219`-B7…B10 | Deferred with `0285` and `0289`, owner ruling 2026-09-19. |
| ~~`0203`'s six pending decisions~~ | 🔓 **LIFTED 2026-09-23 (Sprint 4 rescope, Q3 = (b)): they are taken BEFORE this window now**, so this row no longer holds. Kept as written: ~~**Ruling 3** — deferred until after the deploy. ✅ **RE-CONFIRMED BY THE OWNER 2026-09-22**, same reasoning (the deploy unblocks eight rows and had a date; `0203` unblocks one task's `--enforce` wiring and has no deadline). 🚨 **Still deferred even though the slot SLIPPED** — *"after the window"*, not *"after a date"*. Full record: *The three owner rulings that set the spine*, ruling 3.~~ |
| Arming `--enforce` on the parity guard | ~~`0064`'s~~ [`0298`](../tasks/backlog/0298-config-parity-guard-first-real-report-only-production-run-then-arm-enforce/brief.md)'s (split 2026-09-23), after all ten `0203` items. *"Arming this guard early correctly fails every deploy on known gaps."* |
| `0221`'s non-root deploy user | Split out by owner ruling Q8. This window lands `PermitRootLogin prohibit-password`, not `no`. |
| `0054` — flipping `CITIZENSHIP_CARD_ENABLED` | ✅ **RULED OUT 2026-09-22** (C1). It is a source change **plus a second game deploy** — *a decision about launching citizenship, not a verification step*, and it must not ride in on a deploy slot. |
| `0065` **step 3** — the real test purchase | ✅ **RULED OUT 2026-09-22** (C1) — it cannot happen without the flip above. ⛔ `0065` stays `🚧 Blocked`. 📌 *2026-09-23: moved to [`0297`](../tasks/backlog/0297-paid-citizenship-owner-run-test-buy-sequence/brief.md) §3 by owner ruling (C1 addendum); still out of this window.* |
| `0220` **§8 step 3** — the rotation proof (**W8**) | ✅ **RULED OUT 2026-09-22** (C2) — filed as [`0294`](../tasks/backlog/0294-prove-a-rotated-value-overwrites-the-persisted-one-on-the-live-profile-box/brief.md). ⚠️ **`0220` closes with a recorded, deliberate gap** — say so at its close. |
| A written **abort / rollback procedure** | ✅ **RULED OUT 2026-09-22** (G1) — *"Skip it — I know the boxes."* 🚨 **W12 therefore has zero prior production evidence AND no written way back.** |

🚨 **And the accepted cost of the `0219` split, restated because it is a date, not an adjective:** the
**TLS-certificate fuse stays UNWATCHED**. The live certificate's `notAfter` is reported as **2026-11-20**
with twice-daily renewal attempts from around **2026-10-21**, failing **silently** until TLS stops
serving. ⚠️ **PROVENANCE: those two dates come from a previous producer's report relayed through
`fkit-lead` and were never verified — record them as reported, not established.** What *is*
repo-verified is the twice-daily cron itself. **Weeks away, not this weekend — that is the whole of why
the deferral is affordable.**

> ### ✅ 2026-09-22 — BOTH CERTIFICATES MEASURED LIVE. **TWO BOXES, TWO CERTIFICATES, TWO DIFFERENT DATES.**
>
> ⛔ **THIS FUSE IS THE *PROFILE* BOX'S CERTIFICATE. IT IS NOT THE TELEMETRY BOX'S.**
>
> 🔴 **THE PROVENANCE LINE ABOVE IS NOW SUPERSEDED — AND THIS IS AN UPGRADE, NOT A CORRECTION. THE FUSE
> DATE DID NOT CHANGE.** It said the two profile-box dates *"were never verified — record them as
> reported, not established."* ✅ **They are now established, from a LIVE reading.**
>
> **MEASURED 2026-09-22, read-only (`curl -sv` against each box's own domain), by `fkit-lead`.** ⛔ **A
> live reading, not a repo recollection** — nothing in this repository can see a certificate.
>
> | Box | Certificate expires — **live, 2026-09-22** | Repo sources recording the same cert |
> |---|---|---|
> | 🔴 **PROFILE box** — ***this fuse*** | **`Nov 20 11:01:42 2026 GMT`** ⇒ **2026-11-20** ✅ **CONFIRMED CORRECT** | `0216/worklog.md:19` (`certbot certificates`, on-box, 2026-09-10) · `0219/worklog.md:100` (2026-09-13) · `0219/brief.md:25`. Cron: `setup-profile.sh` |
> | **TELEMETRY box** — ⛔ ***a different cert, NOT this fuse*** | **`Dec 13 08:18:40 2026 GMT`** ⇒ **2026-12-13** | `0257/worklog.md:14,26` (renewed by `0257`, issued 2026-09-14) · `0260/worklog.md:27`. Cron: `setup-telemetry.sh` |
>
> ⇒ ✅ **`2026-11-20` IS THE PROFILE CERT, IT IS CORRECT, AND IT IS NOT STALE. `~2026-10-21` STANDS
> UNCHANGED.** ⛔ **No fuse-date correction is owed. Leave both dates exactly as they are.**
>
> ### 🚨 THE NEAR-MISS, recorded because it is the useful part for the next reader
>
> On **2026-09-22** a rewrite of this fuse from **`2026-11-20` → `2026-12-13`** was **proposed and
> relayed as a correction**. ⛔ **It was WRONG, and it was REFUSED before it was applied.** The proposal
> compared a **telemetry-box** measurement against the **profile-box** fuse — **two different boxes, two
> different certificates**. ⚠️ **Had it been applied, this fuse would now read THREE WEEKS LATER THAN IT
> IS, and the affordability of `0219`'s G3/G4 deferral rests on this date.** It was then **settled by
> measuring BOTH boxes live**, which is how the table above exists.
>
> ⇒ 🚨 **THE LESSON: never move a date between these two boxes.** They have separate certificates,
> separate crons (`setup-profile.sh` vs `setup-telemetry.sh`), separate unread renewal logs, and
> separate expiry dates. **Always name the box before quoting a cert date.**
>
> ### ⚠️ ONE BOUNDARY — AN EXPIRY DATE IS NOT A RENEWAL TEST
>
> ⛔ **Both certificates being valid TODAY says NOTHING about whether either renewal cron will fire.**
> A live reading proves the cert on the box right now; it does **not** exercise `certbot renew`, the
> HTTP-01 challenge, or the port-80 bind. 🚨 **The *"twice-daily renewal attempts from ~2026-10-21,
> failing SILENTLY until TLS stops serving"* concern is UNTOUCHED by this measurement and stays exactly
> as written above.**
>
> ⚠️ **And the telemetry cert being healthy does NOT watch the profile cert.** Different box, different
> cron, different unread log. **The profile fuse is still UNWATCHED** — that is what `0219`'s G3/G4
> deferral bought, and this measurement does not buy it back.

---

## ✅ CONFLICTS — ALL THREE RULED 2026-09-22. Settled; do not re-open.

**AUTHORITY for C1, C2 and C3 below.** An **OWNER RULING given live in the `fkit lead` session via
`AskUserQuestion` on 2026-09-22**, relayed by `fkit-lead` to a spawned `fkit-producer` holding **no
owner channel** (ADR-021). ⛔ **Not producer precedent.** The conflicts are kept in full below —
**struck through where superseded, never deleted** — because the reasoning is what stops each one being
re-derived.

### ✅ C1 — RULED: `0065` step 3 is **OUT of this window.**

> **The owner chose: "Drop `0065` step 3 from the window."**
>
> **Their recorded reasoning:** flipping `CITIZENSHIP_CARD_ENABLED` is **a source change plus a second
> full game deploy**. That is **a decision about launching citizenship, not a verification step**, and
> **it should not ride in on a deploy slot.**

⛔ **`0065`'s `## Status` was NOT touched and no mover skill was invoked.** It stays **`🚧 Blocked`**.
⚠️ **This does not defer `0065`'s step 3 forever** — it says the flip is its own decision, taken on its
own merits, not a line item inside a deploy window.

📌 **Recorded in [`0065`'s brief](../tasks/backlog/0065-citizenship-paid-live-verification/brief.md)**
under its step 3, so a reader of the brief alone learns the same thing.

🚨 **THE CIRCULARITY, recorded so nobody tries to "just do it" anyway.** `0065`'s **own step 6** says
flip the flag *"only after 1–4 pass"* — and **step 3 is one of 1–4, and it is the step that needs the
flip first.** ⇒ **`0065` cannot satisfy its own ordering as written.** Whoever takes the flip decision
must resolve that, not route around it.

> ✅ **C1 ADDENDUM — THE CIRCULARITY IS RESOLVED, 2026-09-23. Read the authority before the outcome.**
>
> **AUTHORITY.** An **OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on
> 2026-09-23**, relayed by `fkit-lead` to a spawned `fkit-producer` holding **no owner channel**
> (ADR-021). ⛔ **Not producer precedent.** **Owner, verbatim:** *"Launch, and leave the test task for
> the Sprint 5. The test-buy sequence will be run by me (human)"*. Shown: the button is off in every
> prod build; options were test-only exposure via the remote `citizenship_ui` switch, *"launch, then
> test fast"* (risk stated), a draft build, or an architect check.
>
> **OUTCOME.** `0065` is now **the go-live only** (§6: flip + second game deploy); §6 no longer waits
> on §1–§4. `0065` §1–§5 and `0195`'s open value-correctness condition moved to
> [`0297`](../tasks/backlog/0297-paid-citizenship-owner-run-test-buy-sequence/brief.md) (Sprint 5), run
> by the owner by hand after go-live. **`RUNBOOK-A` above still stands** — the flip does **not** ride
> this or any deploy slot. **Launch timing is the owner's call**; this runbook does not schedule it.
>
> 🚨 **Accepted, owner-ruled tradeoff: paid citizenship goes live to real players before any real
> purchase has been proven: HMAC construction unconfirmed, secret value unconfirmed, reconciliation
> unexercised. Real players' first purchases may be the first real test.**
>
> The circularity paragraph directly above is kept — it was true until this ruling.

✅ **THE GATE WAS RE-VERIFIED IN THE TREE ON 2026-09-22, independently, twice** (by `fkit-lead` and again
by the producer writing this line — not taken on trust):

- `src/client/CitizenshipCard.ts:95` — `if (!flashistConstants.features.CITIZENSHIP_CARD_ENABLED)` →
  adds `hidden` and **returns before anything else in `connectedCallback()`**. An **absolute** gate.
- `src/client/flashist/FlashistFacade.ts:216` — `CITIZENSHIP_CARD_ENABLED: false`, a **compile-time
  constant**, with the source comment *"no `GAME_ENV` bypass — owner-ruled 2026-08-21."*
- `src/client/flashist/FlashistFacade.ts:955` — `&&` short-circuits, so the remote `citizenship_ui`
  experiment flag **is never read** while the local flag is false.
- A grep of **`src/` and `webpack.config.js`** finds **exactly three** mentions of the name — the two
  above plus the gate — and **NO env override and NO remote override anywhere.**

⇒ **Making the button appear requires editing source and running `./build-deploy.sh prod` a second
time.** That is the deploy the owner ruled out of this window.

<details>
<summary>~~The original C1 as flagged, kept for the record~~</summary>

~~**The conflict, verified in the source on 2026-09-22:**~~

- `0065` step 3 says: *"Under the test-purchase login, complete the flow end to end **via the real
  button**."*
- The button lives behind `CITIZENSHIP_CARD_ENABLED`, which is **`false`** at
  `src/client/flashist/FlashistFacade.ts:216` — a **compile-time constant**.
- It is checked **absolutely**, first, with **no remote override and no dev bypass**:
  `CitizenshipCard.ts:95` returns early and hides the card; `FlashistFacade.ts:955` short-circuits so
  the remote `citizenship_ui` experiment flag *"is never read at all"* while the local flag is false.
- ⇒ **Making the button appear requires editing source and running `./build-deploy.sh prod` a second
  time.** No brief defines that step for this window.
- And `0065`'s **own step 6** says flip the flag *"only after 1–4 pass"* — **which is circular**, since
  step 3 is what needs it.
- Meanwhile `0273/plan.md` §4.6 makes the flag's staying `false` a **deploy-safety requirement** until
  the S4 client is live. W12 satisfies that precondition — but satisfying it is not the same as ruling
  that the flip happens here.
- ⚠️ `0238` (*validate the citizenship UI kill-switch in a real build*) sits on the Backlog board as a
  launch gate and is not in the ruled scope of this window.

~~**The question for the owner:** does this window include a **second game deploy carrying
`CITIZENSHIP_CARD_ENABLED: true`** (on prod, or on a draft build), or is `0065` step 3 **deferred past
the slot**?~~ → **ANSWERED: deferred past the slot.**

</details>

~~⛔ **Do not report `0065` as unblocked by this window regardless.** Its own status: **two** conditions
remain — `0296` (ex-`0062`, re-pointed 2026-09-23; W14 addresses it) and `0195` (whose value is owner-attested but **not shown
correct**; only a real signed payload settles it). *"None alone unblocks."*~~
📌 **Superseded 2026-09-23 (owner rulings, `0065` Corrections 6 and 7):** `0065` now has **no** task
condition — `0296` no longer gates it, and `0195` moved to `0297` §1 (still open). It is the go-live,
timed by the owner, and **this window still does not run it** (`RUNBOOK-A`).

### ✅ C2 — RULED: `0220` §8 step 3 is **OUT of this window, and gets its own task.**

> **The owner chose: "Skip it now, file it separately"** — so that *"`0220` closes with a recorded,
> deliberate gap rather than an unnoticed one."*

⇒ 📌 **FILED AS [`0294`](../tasks/backlog/0294-prove-a-rotated-value-overwrites-the-persisted-one-on-the-live-profile-box/brief.md)**,
on the **Backlog** board ([`backlog.md`](../sprints/backlog.md)) — fkit's filing default, since the
owner named no board. ⚠️ **The board is the producer's call, not the owner's**, and is overturnable in
one edit.

⇒ ⛔ **W8 IS REMOVED FROM THIS WINDOW.** The window now needs **TWO** profile deploys, not three. See the
W8 tombstone in the sequence above.

⛔ **`0220`'s `## Status` was NOT touched and no mover skill was invoked.** The gap is recorded in
[`0220`'s brief](../tasks/backlog/0220-profile-p5-secret-persistence-and-value-parity/brief.md).

🚨 **RECORD THE REASON THE STEP EXISTS — this is the whole point of the follow-up task, and it nearly
did not survive.** The owner's **first** instinct was *"rotate nothing, we don't know why the step
exists"*, and they **revised it once shown the reason.** `0220`'s verification step 3 reads:

> *"A deploy WITH a new value overwrites the persisted one. ⚠️ Persistence must not become a trap where
> a rotated secret cannot be applied."*

**The failure it guards:** if persist-or-reuse always prefers the box's value, then **the day a key
leaks and a new one is deployed, the box silently keeps the old one.** The operator believes a
compromised credential was replaced when it was **not**, and **nothing says otherwise.**
⇒ ⛔ **Never write this up as "a redundant third deploy."**

📌 **It needs NO real credential.** The owner was offered rotating **`TELEGRAM_PROXY_URL`** — a URL, not
a secret — to a different valid https value and back, which exercises the same code path and **rotates
nothing**. ⛔ **That is NOT the chosen method — it was offered and NOT taken.** It is recorded in `0294`
as *one* viable approach for whoever picks the task up; the method is still theirs to choose and the
owner's to rule.

<details>
<summary>~~The original C2 as flagged, kept for the record~~</summary>

~~`0220/plan.md` §8 step 3 reads only *"Deploy with one rotated value."* The four candidates:~~

| Variable | What rotating it actually does |
|---|---|
| `YANDEX_PAYMENTS_SECRET` | ⛔ **Would replace the real Yandex key the owner set**, which ~~`0065`'s~~ the open `0195` condition rests on (owner-attested 2026-09-20). Would break ~~`0065` steps 1–4~~ the test-buy sequence (📌 since 2026-09-23: `0297` §1–§4) — ⚠️ and, after go-live, real players' purchases. |
| `FEEDBACK_TELEGRAM_TOKEN` | Live player-feedback delivery. |
| `FEEDBACK_TELEGRAM_CHAT_ID` | Would misroute feedback to a different room. |
| `TELEGRAM_PROXY_URL` | Live delivery path for the same. |

~~**The question for the owner:** which variable is rotated, and is it rotated back afterwards?~~
→ **ANSWERED: neither, not here. The step moves to `0294`, where the choice is still open and still
the owner's.**

</details>

### ✅ C3 — RULED: the egress-IP work is **a task on SPRINT 5.**

> **The owner's words, verbatim:** *"Record as a task, add it to the Sprint 5, not the current
> Sprint 4."*

⇒ 📌 **FILED AS [`0295`](../tasks/backlog/0295-measure-the-game-prod-egress-ip-and-append-it-to-the-profile-internal-allowlist/brief.md)**
on **[Sprint 5](../sprints/plan-sprint-5.md)**. ⛔ **Sprint 5 explicitly — not Sprint 4, not the Backlog
board.** ⚠️ **Sprint 5 is not the active sprint: this SCHEDULES the work, it does not start it.**

**Two things `0295` carries, both load-bearing:**

1. **MEASURING** the game-prod egress IP — `0217`'s **Q4**; the pinned value in `example.env.profile:33`
   dates from **June**. 🚩 **`fkit-lead` could not measure it: the prod host is not in any readable env
   file.**
2. **RECORDING THE METHOD — ⛔ NEVER THE ADDRESS** (`0217` verification step 7).

⚠️ **Context, recorded explicitly as NOT a verified current fact:** a measurement earlier on 2026-09-22
**reportedly matched** the live allowlist — but it was **not re-verified** and was **never written into
any brief**, which is precisely why C3 was still open when this runbook was written. ⛔ **Do not close
`0295` by citing it.**

🚨 **`0295` carries the allowlist trap in full** — `alert-delivery-runbook.md:21` (the relay is mounted
under `/internal/` **solely** to inherit this allowlist) and `:39` (a source-IP miss answers **403**,
which **permanently and silently disables the notification channel**), plus `setup-profile.sh:122`
(**no on-box persistence**). ⇒ **APPEND, NEVER REPLACE.**

⇒ **W0.1 is unchanged in substance but is now `0295`'s work, not an unowned line in this runbook.**

---

## 🕳️ GAPS — the sequence needs these, and no brief defines them

⛔ **These are flagged, not authored.** Writing a step nobody has agreed to is how a runbook starts
lying.

**G1 — There is no abort or rollback procedure for this window. ✅ RULED 2026-09-22 — THIS IS
DELIBERATE, NOT AN OVERSIGHT.**

> **The owner chose: "Skip it — I know the boxes."**

⛔ **NO ROLLBACK SECTION WILL BE WRITTEN**, and this record exists so a future reader does **not** read
the missing section as something nobody thought of. It was raised, and it was declined.

🚨 **What that means, stated plainly and NOT softened.** The window's one step with **ZERO prior
production evidence** — **W12**, where crediting switches on under the owner's 2026-09-19 ruling — has
**no written way back.** `0272` and `0273` both record *"zero production evidence"* in their own status
fields. **The mitigation is the owner's own familiarity with the boxes.** That is the whole of it: not a
procedure, not a script, not a second pair of eyes.

⛔ **Do not re-argue this and do not author a rollback section on your own initiative.** The gap is now
**accepted, recorded, and owned** rather than unknown. The factual shape below is unchanged: `0286` says
what step 8 proves; no brief says what to do when it fails, how far back a half-run window unwinds, or
who decides. The sequence has **one hard natural abort point (W2/W3, on a prompt)** and, after W12,
**none that any document describes.**

**G2 — No brief defines HOW to measure the game-prod egress IP.** `0217` requires the *method* to be
recorded and the address never to be; it does not say what the method is.
✅ **NOW OWNED:** this is [`0295`](../tasks/backlog/0295-measure-the-game-prod-egress-ip-and-append-it-to-the-profile-internal-allowlist/brief.md)'s
to settle — the task explicitly owns choosing a method and writing it down. See C3. ⚠️ **Still a gap
until `0295` runs; it has an owner now, not an answer.**

**G3 — ✅ CLOSED 2026-09-22 — the owner defined the watch themselves.** ⛔ **The entry is kept, not
deleted**, so a reader sees a gap that got **answered**, and by **whom**.

~~**Nothing defines the shape of the crediting observation at W13–W14.** The briefs define *what* to
check; none defines **for how long, by whom, or what threshold ends the watch.** With `0219`'s G3/G4
deferred, **a person is the only watcher** — and the window turns crediting on with zero prior
production evidence. A "watch for N minutes, then stop" step would be an invention, so it is recorded
here as a gap instead.~~

✅ **ANSWERED BY THE OWNER, 2026-09-22**, given live in the `fkit lead` session via `AskUserQuestion` and
relayed by `fkit-lead` (ADR-021). ⛔ **Their own definition — not a producer draft they approved.** In
short: **watcher = the owner; duration = until the first credit lands (event-based, ⛔ not clock-based);
stop = BOTH a credited row in the profile DB AND zero error-level container-log lines since the deploy;
🚨 silence is a FAILURE, investigate before ending the window.**

📌 **The full wording, and the reasons, are the W14 acceptance criterion above — cite that, not this
summary.** ⛔ **It defines W14 only; W13 is untouched.**

⚠️ **The underlying risk did NOT go away — it is now owned rather than unowned.** `0219`'s **G3/G4 stay
deferred**, so **a person is still the only watcher** and **W12 still has zero prior production
evidence.** ⛔ **This is a defined procedure, not an automated one.**

⛔ **G3 was the only gap that moved WHEN THIS PARAGRAPH WAS WRITTEN.** ~~and **G4** stays open.~~
✅ **SUPERSEDED LATER THE SAME DAY — 2026-09-22: G4 IS NOW CLOSED TOO, by a second owner ruling. See
G4 below.** **G1** (no rollback procedure) stays **ruled-and-accepted** and **G2** stays
**open-with-an-owner**. ⛔ **Do not read EITHER closure as covering EITHER of those two.**

**G4 — ✅ CLOSED 2026-09-22 — the owner ruled a fix: take a manual snapshot at W0.** ⛔ **The entry is
kept, not deleted**, so a reader sees a gap that got **answered**, and by **whom** — the same treatment
G3 got.

🚩 **NAME COLLISION, flag it before you read further: this runbook's `G4` is NOT `0219`'s `G4`.** They
are different items in different documents and the original text below references both in one sentence.
**This closure is about THIS document's G4 only.**

~~**No brief covers the interaction between multiple same-day profile deploys and the daily backup
object.** `0219/worklog.md` R9 notes each deploy's smoke backup **overwrites today's daily object**;
nothing says whether **two** overwrites in one day (⚠️ **was three before W8 was removed**) matter for
the freshness marker `0219`-G4 will
eventually read. G4 is deferred, so nothing depends on the answer **today**.~~

✅ **ANSWERED BY THE OWNER, 2026-09-22**, given live in the `fkit lead` session via `AskUserQuestion`
and relayed by `fkit-lead` (ADR-021). ⛔ **Not producer precedent.** Shown that **W7 overwrites W3's
same-day backup object** *and* that **G1 left no rollback procedure** — neither of which alone worried
them, but the pair of which did — the owner ruled: **take a manual snapshot at W0, copying the current
backup object aside under a distinct name, before anything runs.**

📌 **The step, its exact mechanism and its four residuals are W0 item 5 above — cite that, not this
summary.** The mechanism was **established from the repo, not authored**: it is the same server-side
`rclone copyto` the script already performs every Sunday (`profile-backup.sh:174-176`), verified live by
[`0241`](../tasks/done/0241-profile-verify-first-weekly-backup-copy/brief.md).

### ⚠️ WHAT THIS CLOSURE DOES **NOT** COVER — read it before you call the backup question settled

- ⛔ **IT IS NOT A ROLLBACK PROCEDURE.** It preserves a **starting point**, nothing more. **G1 stays
  declined and open**, and **W12 still has zero prior production evidence and no written way back.**
- ⛔ **THE SECOND HALF OF THE ORIGINAL GAP IS STILL UNANSWERED.** The struck text asked **two** things:
  *(a)* is the pre-window state lost to same-day overwrites, and *(b)* do two overwrites in one day
  **matter for the freshness marker `0219`-G4 will eventually read**. 🚨 **The ruling answers (a). It
  does NOT answer (b)** — no one has said what a multi-overwrite day does to that marker.
  **`0219`-G4 remains deferred**, so nothing depends on the answer **today**; ⛔ **but do not record
  (b) as settled.**
- 📌 **The overwrite behaviour itself is UNCHANGED.** The snapshot copies an object aside; it does not
  stop W3's and W7's smoke backups landing on the same daily key.

---

## Cross-references

| Document | What it carries |
|---|---|
| `ai-agents/knowledge-base/alert-delivery-runbook.md` | The 403-permanently-disables-the-channel trap, and `PROFILE_INTERNAL_ALLOW_IPS`'s second caller |
| `ai-agents/knowledge-base/profile-backup-restore-runbook.md` | The backup/restore path a deploy's smoke backup touches |
| `ai-agents/knowledge-base/container-log-retention.md` | What `0219`-G1 changes, and the `:5-6` disclaimer `0219` corrects |
| `0219/worklog.md` § *Part B*, `0220/plan.md` §8, `0221/worklog.md` § *Part B*, `0286/plan.md` § *3*, `0062/worklog.md` § *Deploy-pending* (now `tasks/done/`; results go to `0296`), `0273/plan.md` §4.6, `0032/worklog.md` § *Step 5* | The step text every checkbox above is drawn from — **check any line against its source** |
