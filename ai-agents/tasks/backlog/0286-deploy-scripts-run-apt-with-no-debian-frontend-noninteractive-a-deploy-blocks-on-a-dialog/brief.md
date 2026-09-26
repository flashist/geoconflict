# Deploy scripts run `apt` with no `DEBIAN_FRONTEND=noninteractive` — a deploy blocks indefinitely on an interactive dialog

## ID
0286

> ℹ️ **ID allocation, checked 2026-09-18 before filing — recorded so it is not re-checked.** `0286`: **no
> folder** named `0286*` under `ai-agents/tasks/{backlog,done,cancelled}/`, and **no `## ID` field**
> anywhere under `ai-agents/tasks/` holds the value. **Highest existing task id was `0285`.** `0286` was
> also pre-flagged as free in [`0285`](../0285-detect-an-already-disabled-uptrace-notification-channel-read-its-own-channel-state/brief.md)'s
> own ID note; **this brief is the allocation.** Nothing was renumbered (ADR-035).

## Sprint

Sprint 5

📌 **Moved from Sprint 4 to Sprint 5 on 2026-09-23** — Sprint 4 rescope, an OWNER RULING given live in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021); ⛔ not producer precedent. Everything left in this task needs a deploy, the live box or production; Sprint 4 keeps only locally buildable work. `## Status` and `## Priority` were NOT changed; the folder did not move. Record: the *Sprint 4 rescope* addendum in [`plan-sprint-4.md`](../../../sprints/done/plan-sprint-4.md).

## Priority
🔴 **Low — OWNER-RULED 2026-09-22** *(ratified; the rank VALUE is UNCHANGED — `Low` was already the
producer's call and is now the owner's)*

⚠️ **AUTHORITY BEFORE FACTS.** **OWNER RULING given live in the `fkit lead` session on 2026-09-22**,
relayed by `fkit-lead` to a spawned `fkit-producer` holding **no owner channel**: **"Rank them Low,
ratified."** Owner's stated reason: **it matches the priority they already set — the
monitoring/messaging track is deprioritized — and it clears the unratified flag so it stops appearing
as noise on every status read.** ⛔ **Not producer precedent — one ruling, three rows (`0285`, `0286`,
`0289`).**

⚠️ **RANK ONLY.** ⛔ **No `## Status` token was touched, no task file was moved between `backlog/`,
`done/` and `cancelled/`, and no mover skill was invoked.** A ratified rank is not a started task.

⛔ **This row is `🚧 Blocked` and STAYS blocked.** Its `## Status` token and its pending
**OWNER-executed** plan step 8 were **not** touched by this ruling.

~~⚠️ **Append rank, NOT a merit ranking.**~~ ✅ **Flag cleared 2026-09-22 by the ruling above.**

### ⚠️ The BOARD is the PRODUCER'S call — ~~and so is the RANK~~ 🔴 **the RANK is OWNER-RULED as of 2026-09-22 (above)**. Read this before treating the board placement as an owner ruling

**What the owner ruled (2026-09-18):** that today's interruptions were **worth filing as a task**. **That is
all.** The owner did **not** rule which board this sits on, and did **not** rule its priority. ⛔ Not producer
precedent — one ruling, one task. 📌 **Amended 2026-09-22: the PRIORITY is now owner-ruled (`Low`, above) — the
BOARD placement is still the producer's.**

**Producer's call: Sprint 4, appended, Low** — 🔴 **`Low` since ratified by the owner (2026-09-22).** Reasoning,
kept as the record of how it was ranked at filing time:

1. **The cost recurs inside this sprint, not after it.** Sprint 4 is still actively deploying to these boxes —
   [`0283`](../../done/0283-daily-digest-of-pending-name-change-reviews/brief.md) and
   [`0285`](../0285-detect-an-already-disabled-uptrace-notification-channel-read-its-own-channel-state/brief.md)
   both end in a deploy — so the owner pays this toll again on each one.
2. **The fix is minutes, not a day.** See *Effort*.
3. **The Backlog board has a demonstrated hold-forever failure mode** —
   [`0061`](../../done/0061-investigate-prod-telegram-feedback-delivery-failure/brief.md) sat there from 2026-08-23 to
   2026-09-17 because nothing forced a re-look.

**The tradeoff, stated honestly.** This adds a row to a board that already carries **24+ open rows**, for a
defect that **blocks nothing and is blocked by nothing**. **The alternative placement was the Backlog board**,
and it is a defensible one: nothing today runs these scripts unattended, so the live harm is owner time plus a
risk that only materialises if someone automates. **Low** rather than Medium is the producer's way of saying
*real, cheap, and genuinely not urgent* — it should not displace a single existing Sprint 4 row.

## Status
🚧 Blocked — **built + reviewed 2026-09-20; open pending the OWNER-executed plan step 8.** Steps 1–7 complete. Stateful review round 1 closed out, **Codex coverage FULL** (`codex-cli 0.152.0`, read-only sandbox, exit 0) — verdict *Ready to merge (validation-gated)*; findings R1 + R2 applied on owner rulings, R3 left as a residual and routed to the producer to file separately. ⚠️ **No code work remains.** Gates re-run by `fkit-lead` INDEPENDENTLY of both workers: `bash -n` exit 0 · hardening harness `ALL PASS` · `npm test` **138 suites / 1870 tests** · `npm run lint` exit 0 · the three scripts show **+44 / -0** (zero deletions, so no `apt` line was touched — ruling D2 held by construction). 🚨 **Step 8 is the only remaining gate and it is the owner's**: `npm run deploy:telemetry` and `npm run deploy:profile` each running start to finish with **no prompt**, plus a read-only before/after `debconf-show` capture. ⛔ **Nothing verified here is evidence that a real deploy is prompt-free** — every claim about debconf defaults, `needrestart` and the boxes' distro is a PREDICTION until step 8 runs. ⚠️ And it must never be written up as *“the deploy can no longer hang”*: it can no longer hang on a **debconf** prompt; a **dpkg conffile** prompt is NOT covered (residual R1 in the worklog, owner-ruled D3 to record rather than close).

· earlier: 🔄 In progress — driven from the `fkit lead` session by `/fkit-sprint-ship-loop`, started 2026-09-19 (plan step). **Started on an OWNER RULING given live via `AskUserQuestion` and relayed by `fkit-lead`: drive it now, ahead of the three owner-side profile-box live tails, because this is the defect that hangs such a deploy on an invisible dialog.** ⛔ The brief's *raise-do-not-settle* question — whether `apt-get upgrade -y` belongs in a deploy at all — is **NOT settled by that ruling** and goes to the owner at the plan gate.

> ### 📌 2026-09-26 deploy window — results
>
> **PROVENANCE.** Executed by the **OWNER on the boxes on 2026-09-26**; output pasted into the `fkit lead`
> session and read/checked by `fkit-lead` (**(lead)** = a read-only check `fkit-lead` ran itself from a
> non-allowed host). Recorded by a spawned `fkit-producer` with no owner channel (ADR-021). ⛔ Relayed
> evidence — not an owner ruling, not producer precedent. ⛔ **`## Status` NOT changed; no mover invoked.**
> Full table: [`weekend-deploy-slot-runbook.md`](../../../knowledge-base/weekend-deploy-slot-runbook.md) § *2026-09-26 — THE WINDOW RAN*.
>
> **Plan step 8 ran.** Before (W0.2): profile box Ubuntu **26.04.1 LTS**, `console-setup`
> `CODESET="Uni2"`, `needrestart` **3.11-1ubuntu2**; telemetry box Ubuntu **24.04.5 LTS** (first time this
> box's distro is recorded anywhere), `CODESET="guess"`, `needrestart` **3.6-7ubuntu4.5**.
>
> | Verification step | Verdict |
> |---|---|
> | 1 — telemetry deploy, no prompt | ✅ W2: completed; **owner reported no prompt**. "After" capture **byte-identical** to "before" (**(lead)** compared all 34 debconf lines order-insensitively + both `/etc/default` files + `needrestart` + `os-release`) ⇒ the prediction held: the fix changed **no box state** on the box where the defect was seen. |
> | 2 — profile deploy, no prompt | ✅ W3: **no debconf/whiptail prompt** in the full log (lead read it). ⚠️ No profile-box "after" capture was reported. ⚠️ W3's **first** attempt failed **locally** at image build (`canvas` download timeout → `node-gyp` needs Python, absent in `node:24-slim`) — **unrelated to this task**, nothing reached the box. |
> | 3–5 | Local; green before the window (W1). Not re-run. |
>
> ⚠️ **Still true, not softened:** a clean run proves no **debconf** prompt. A **dpkg conffile** prompt is
> still not covered (residual R1, ruling D3).
> 🚩 **Still owed:** the worklog note — date + package names (runbook W2; *What to build* 4). **Not written
> by this note.**

## Owner
fkit-coder

## Context

**Observed live on 2026-09-18**, during the owner's `npm run deploy:telemetry` — which was being run for
[`0284`](../../done/0284-alert-path-liveness-probe-a-webhook-403-permanently-disables-uptrace-alerting/brief.md),
not because of it. **The deploy stopped three times on `debconf` prompts** and the owner had to answer each by
hand:

1. `keyboard-configuration` — country
2. `console-setup` — encoding
3. `console-setup` — character set

**✅ Pre-existing, NOT caused by `0284` — lead-verified:** `0284`'s diff to `setup-telemetry.sh` adds no package
install and does not touch the `apt` lines.

### Why this is more than a nuisance

A deploy that **can block on a dialog cannot be run unattended** — and an unattended run would **hang silently
rather than fail**, holding the apt lock, with `set -e` never firing because nothing has errored. A hang is the
worst of the three possible outcomes: not success, not a loud failure, but an indefinite wait nobody is watching.

### The exposure, verified by reading the scripts (2026-09-18)

🚩 **`DEBIAN_FRONTEND` appears NOWHERE in any of the three deploy scripts, and neither does `debconf`.** Every
`apt` call below runs on the default interactive frontend.

| Script | `apt` calls | Notes |
|---|---|---|
| `setup-telemetry.sh` | `:168` `apt-get update -y && apt-get upgrade -y` · `:242` `docker-compose-plugin` · `:827` `nginx certbot` | **Where it was observed.** The `upgrade` is the widest surface. |
| `setup-profile.sh` | `:199` `util-linux` · `:221` `apt-get update -y && apt-get upgrade -y` · `:343` `docker-compose-plugin` · `:355` `ufw` · `:397` `unattended-upgrades` · `:451` `fail2ban python3-systemd` · `:1235` `nginx certbot` · `:1515` `age rclone` | 🚩 **ANSWERING THE BRIEF'S QUESTION: YES — `setup-profile.sh` has the SAME exposure, across MORE calls.** Eight, including its own `apt-get upgrade -y`. It has simply not been hit yet. |
| `setup.sh` (game box) | `:177` `apt-get install -y nginx >/dev/null` | Smallest surface — but ⚠️ **output is suppressed**, so a prompt here would hang with **nothing printed at all**. |

### 🚨 A constraint the implementer MUST know before touching `setup-profile.sh:221`

**The hardening harness anchors that exact line as a literal string.**
`tests/scripts/profile-deploy-hardening.test.sh:299` asserts the ordering:

```
awk '/flock -n 9/{f=NR} /apt-get update -y && apt-get upgrade -y/{u=NR} END{exit !(f>0 && f<u)}' "$P"
```

⇒ **Prefixing or rewriting that line turns `npm test` RED** until the harness is updated in the same change.
That is the gate working, not a broken test (`CLAUDE.md`, *Shell harnesses are part of `npm test`*). The script
itself already says so in a comment at `setup-profile.sh:393-395` — *"that line is harness-anchored and not
changed here"*.

⚠️ **Adjacent but DIFFERENT — do not conflate them.** That same comment records a **known, accepted residual**:
`apt-daily-upgrade` can hold the apt lock while a deploy's `apt-get upgrade` runs. **That one fails LOUD under
`set -e` and is simply re-run.** This task is about the opposite failure — a **silent indefinite wait**. Fixing
one does not fix the other, and neither should be described as fixing both.

## What to build

1. **Export `DEBIAN_FRONTEND=noninteractive` for the package operations in `setup-telemetry.sh`,
   `setup-profile.sh` and `setup.sh`.** Prefer **one export near the top** of each script over prefixing eight
   call sites — fewer places for the next `apt-get install` to be added without it. ⚠️ Whether the export should
   be scoped to the apt calls or set script-wide is the implementer's call; say which was chosen and why.
2. **Update `tests/scripts/profile-deploy-hardening.test.sh:299`** in the same change if the anchored literal at
   `setup-profile.sh:221` moves — and refresh the `setup-profile.sh:393-395` comment if its
   *"not changed here"* clause stops being true.
3. 🚩 **RAISE, DO NOT SETTLE: does `apt-get upgrade -y` belong in a deploy at all?**
   An unattended **full** upgrade on a single-box service can **restart or break things mid-deploy** — a
   `dockerd` restart mid-deploy is precisely the scenario `setup-profile.sh`'s compose restart policy exists to
   survive, which the script's own comment names as *"the G7 scenario"*. ⛔ **This is a judgement call for the
   owner, not for the coder or the producer to settle silently.** Options worth putting to them: keep it as-is ·
   narrow it to security updates only (the box already runs `unattended-upgrades` scoped to the `-security`
   pocket) · drop it from the deploy entirely. **Put this to the owner before implementing it either way; a
   `DEBIAN_FRONTEND` fix that silently also removes the upgrade is a scope change, not a fix.**
4. ⚠️ **`DEBIAN_FRONTEND=noninteractive` is not a universal muzzle** — it suppresses the *prompt*, accepting the
   package's default answer. A package whose default is wrong for this box now gets that default with nobody
   told. Say in the worklog which packages this actually affects (the three observed are `keyboard-configuration`
   and `console-setup`, whose defaults are harmless on a headless box — **verify, do not assume**).

## Verification steps

1. **A telemetry deploy runs start to finish with no prompt.** Owner-observed on the box; worklog records the
   date. ⛔ **No IP, no hostname, no token.**
2. **A profile deploy likewise** — the script with the larger surface.
3. **`npm test` green, including the shell harnesses** — specifically `tests/scripts/profile-deploy-hardening.test.sh`
   (**ALL PASS**) after the `:299` anchor is reconciled. ⚠️ Expect this to be the step that catches a careless edit.
4. **`npm run lint` exits 0**; `npm run check:config-parity` unaffected. ⚠️ Parity does **not** reach telemetry
   variables — the hardening harness is the only guard there, the same residual `0277` and `0284` both record.
5. **State plainly whether step 3 of *What to build* was put to the owner and what they ruled** — or that it was
   not, and the `apt-get upgrade` line is unchanged.

## Notes

- **Depends on:** nothing.
- **Blocks:** nothing.
- **Effort: small.** One export per script plus one harness-anchor reconciliation. ⚠️ **The `apt-get upgrade`
  question in *What to build* 3 is NOT part of that estimate** — it is an owner decision that could change the
  shape of the change.
- **Related:**
  - [`0284`](../../done/0284-alert-path-liveness-probe-a-webhook-403-permanently-disables-uptrace-alerting/brief.md)
    — the deploy during which this was observed. ⚠️ **Observed during, NOT caused by** — lead-verified.
  - [`0282`](../../done/0282-setup-profile-unquoted-heredoc-executes-compose-comments-as-root/brief.md) — another
    `setup-profile.sh` defect; if both are taken together, one harness run covers both.
  - [`0219`](../0219-profile-p4-operability-log-rotation-prune-uptime-backup-freshness/brief.md) — the source of
    the daily-checks and harness shape these scripts are anchored to.
- 🔒 **No secrets in any artifact** — no IP, hostname, port, token or DSN in this brief, the plan, the worklog or
  a test fixture. Package names, file paths, line numbers and variable names only. **This file is tracked in git.**
- **Do not invoke the mover skills** — producer-only since ADR-033. Route the close to the producer.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
