# Weekend deploy-slot runbook — one window, eleven tasks, four deploys

> 📌 **AMENDED 2026-09-22, later the same day — four owner rulings landed.** C1, C2, C3 and G1 are
> **settled** (see those sections). Two steps left the window: **`0065` step 3** (C1) and **`0220` §8
> step 3 / W8** (C2). ⇒ **The window is now TWO profile deploys + one telemetry deploy + one game
> deploy.** ⚠️ **The title's "four deploys" was WRONG when written — it was five — and is now correct
> by accident of the cut, not by edit.** Two new tasks carry the removed work:
> [`0294`](../tasks/backlog/0294-prove-a-rotated-value-overwrites-the-persisted-one-on-the-live-profile-box/brief.md)
> (Backlog) and
> [`0295`](../tasks/backlog/0295-measure-the-game-prod-egress-ip-and-append-it-to-the-profile-internal-allowlist/brief.md)
> (Sprint 5). ⛔ **No task's `## Status` was touched and no mover skill was invoked.**

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
| **2** | **The game deploy runs in the SAME window** as the profile-box work — `0272`, `0273`, `0032` step 5, `0064` step 8. | Both sides must agree on `PROFILE_INTERNAL_TOKEN`, and `0062`'s D1/D3–D5 need a deployed game server. |
| **3** | **`0203`'s six pending decisions are deferred until after the deploy.** | Not surfaced here. |

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
- ⚠️ **`./build-deploy.sh prod` commits, tags and pushes** before it builds (`build-deploy.sh:50-53`,
  then `./deploy.sh prod <tag>` at `:70`). The working tree at that moment is what ships. ⛔ **Only the
  owner runs it.**

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
   > **RULING E, an OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on
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

- [ ] **`0062`-D1 — token-match pre-check.** Run the verdict-only script from `0062/worklog.md`
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

One command carries `0272` (S3 game server), `0273` (S4 client), `0032` step 5's build, `0064` step 8's
observation, and — because `PROFILE_INTERNAL_TOKEN` is now non-blank — `0217` step 4 and the
`0062` deploy it has been waiting for.

It bumps, commits, tags and pushes (`build-deploy.sh:50-53`), builds, then calls
`./deploy.sh prod <tag>` (`:70`).

- [ ] **`0064` step 8 — the parity guard runs clean, report-only.** `deploy.sh:60-61` invokes
      `check-config-parity.mjs --pipeline=all --report-only || true`. ⛔ **Report-only. A non-zero exit
      here would fail a deploy and is out of scope** (`0064` verification step 6). Arming is `0064`'s
      own, after all ten of `0203`'s items — **and `0203` is deferred by ruling 3.**
- [ ] ⚠️ **Parity cannot catch the thing you are doing here.** It compares **names**, and
      `PROFILE_INTERNAL_TOKEN` *is* forwarded correctly (`deploy.sh:312`). A present-when-it-should-be-
      blank value is a Phase 2 concern that does not exist yet (`0064` § *What to build* 5).
      **W11's D1 is the only guard.**

---

### W13 — 🚨 Watch it. Immediately. · `0273`, `0062`-D2/D4

**Constraint that put these first among the post-deploy checks:** they fire on a **page load**, so they
are observable within seconds — before any match has to finish. And per the live-risk section, a human
watching is the entire mitigation.

- [ ] **`0273`'s live check** (plan §4.6 step 4), in the browser network tab: exactly **one**
      `POST /v1/login` per logged-in load, and **zero** on a guest load. ⚠️ With the card off there are
      no other profile calls to inspect, so Bearer on the other five callers rests on the client tests
      plus the earlier on-box check — **not on production**.
- [ ] **`0062`-D2 — the token reaches the container non-empty.**
      `docker exec <container> sh -c 'test -n "$PROFILE_INTERNAL_TOKEN" && echo NONEMPTY || echo EMPTY'`
      🚨 **This is the deploy that finally makes D2 mean something.** D2 was run 2026-09-04 and came back
      **INCONCLUSIVE** because the owner had deliberately blanked the value — *"forwarding an empty value
      and never forwarding at all are indistinguishable at the container"* (`0062` § *Status*).
      ⛔ **Do not read an empty result as a failure of the fix without checking the source value first.**
- [ ] **`0062`-D4 — the partial-config warning does NOT fire** with both variables set
      (`ProfileApiClient.ts:69`, `:73`), and no token value appears in any log line or deploy output
      (`0217` verification step 6 — check `deploy.sh` does not echo the heredoc it writes).
- [ ] **Read the profile-server error log.** The baseline to beat is the one `fkit-lead` established at
      the 2026-09-17 profile deploy: **zero error-level lines since boot** (`0272` § *Status*).

---

### W14 — `0062`-D3 / `0217` V3 / `0272` live · **the acceptance criterion of the window**

🚨 **`0217`'s own words: this is the acceptance criterion. Not "the variable is present"; not "the
deploy printed a warning-free line" — a real call, working. It is the only check that catches either
silent barrier.**

- [ ] **`0062`-D3:** observe a production match. The worker log shows
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
- [ ] **`0062`-D5** — local-dev unset case still clean: with `PROFILE_API_URL` unset the client no-ops
      and nothing crashes. Covered by test N2; optional `npm run dev` smoke.
- ⛔ ~~**`0065` step 3 — the real test purchase.**~~ **REMOVED FROM THIS WINDOW by the C1 owner ruling of
  2026-09-22** — *"Drop `0065` step 3 from the window."* The owner's reasoning, recorded: flipping
  `CITIZENSHIP_CARD_ENABLED` is **a source change plus a second full game deploy**, which is **a
  decision about launching citizenship, not a verification step**, and **it should not ride in on a
  deploy slot.** Full record, including the circularity in `0065`'s own steps 3-vs-6 and the
  re-verified source gate: ***Conflicts*, C1**.
  ⚠️ **The owner's 2026-09-22 confirmation that they WILL perform step 3 still stands** — it is not
  withdrawn, it is **not scheduled here**. ⛔ **`0065` stays `🚧 Blocked`; its `## Status` was not
  touched and no mover skill was invoked.**

---

## ⛔ What does NOT happen in this window

| Task / item | Why not |
|---|---|
| `0219` **closes** | ⛔ It does not. G3/G4 deferred; the 2026-09-13 hold-open ruling stands. The slot lands B4/B5/B6 only. |
| `0219`-B2, `0219`-B3, `0219`-B7…B10 | Deferred with `0285` and `0289`, owner ruling 2026-09-19. |
| `0203`'s six pending decisions | **Ruling 3** — deferred until after the deploy. |
| Arming `--enforce` on the parity guard | `0064`'s, after all ten `0203` items. *"Arming this guard early correctly fails every deploy on known gaps."* |
| `0221`'s non-root deploy user | Split out by owner ruling Q8. This window lands `PermitRootLogin prohibit-password`, not `no`. |
| `0054` — flipping `CITIZENSHIP_CARD_ENABLED` | ✅ **RULED OUT 2026-09-22** (C1). It is a source change **plus a second game deploy** — *a decision about launching citizenship, not a verification step*, and it must not ride in on a deploy slot. |
| `0065` **step 3** — the real test purchase | ✅ **RULED OUT 2026-09-22** (C1) — it cannot happen without the flip above. ⛔ `0065` stays `🚧 Blocked`. |
| `0220` **§8 step 3** — the rotation proof (**W8**) | ✅ **RULED OUT 2026-09-22** (C2) — filed as [`0294`](../tasks/backlog/0294-prove-a-rotated-value-overwrites-the-persisted-one-on-the-live-profile-box/brief.md). ⚠️ **`0220` closes with a recorded, deliberate gap** — say so at its close. |
| A written **abort / rollback procedure** | ✅ **RULED OUT 2026-09-22** (G1) — *"Skip it — I know the boxes."* 🚨 **W12 therefore has zero prior production evidence AND no written way back.** |

🚨 **And the accepted cost of the `0219` split, restated because it is a date, not an adjective:** the
**TLS-certificate fuse stays UNWATCHED**. The live certificate's `notAfter` is reported as **2026-11-20**
with twice-daily renewal attempts from around **2026-10-21**, failing **silently** until TLS stops
serving. ⚠️ **PROVENANCE: those two dates come from a previous producer's report relayed through
`fkit-lead` and were never verified — record them as reported, not established.** What *is*
repo-verified is the twice-daily cron itself. **Weeks away, not this weekend — that is the whole of why
the deferral is affordable.**

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

⛔ **Do not report `0065` as unblocked by this window regardless.** Its own status: **two** conditions
remain — `0062` (which W14 addresses) and `0195` (whose value is owner-attested but **not shown
correct**; only a real signed payload settles it). *"None alone unblocks."*

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
| `YANDEX_PAYMENTS_SECRET` | ⛔ **Would replace the real Yandex key the owner set**, which `0065`'s open `0195` condition rests on (owner-attested 2026-09-20). Would break `0065` steps 1–4. |
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

**G3 — Nothing defines the shape of the crediting observation at W13–W14.** The briefs define *what* to
check; none defines **for how long, by whom, or what threshold ends the watch.** With `0219`'s G3/G4
deferred, **a person is the only watcher** — and the window turns crediting on with zero prior
production evidence. A "watch for N minutes, then stop" step would be an invention, so it is recorded
here as a gap instead.

**G4 — No brief covers the interaction between multiple same-day profile deploys and the daily backup
object.** `0219/worklog.md` R9 notes each deploy's smoke backup **overwrites today's daily object**;
nothing says whether **two** overwrites in one day (⚠️ **was three before W8 was removed**) matter for
the freshness marker `0219`-G4 will
eventually read. G4 is deferred, so nothing depends on the answer **today**.

---

## Cross-references

| Document | What it carries |
|---|---|
| `ai-agents/knowledge-base/alert-delivery-runbook.md` | The 403-permanently-disables-the-channel trap, and `PROFILE_INTERNAL_ALLOW_IPS`'s second caller |
| `ai-agents/knowledge-base/profile-backup-restore-runbook.md` | The backup/restore path a deploy's smoke backup touches |
| `ai-agents/knowledge-base/container-log-retention.md` | What `0219`-G1 changes, and the `:5-6` disclaimer `0219` corrects |
| `0219/worklog.md` § *Part B*, `0220/plan.md` §8, `0221/worklog.md` § *Part B*, `0286/plan.md` § *3*, `0062/worklog.md` § *Deploy-pending*, `0273/plan.md` §4.6, `0032/worklog.md` § *Step 5* | The step text every checkbox above is drawn from — **check any line against its source** |
