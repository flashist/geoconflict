# `setup.sh` calls `apt` where the other two deploy scripts call `apt-get` — `apt` has no stable CLI for scripts

## ID
0290

> ℹ️ **ID allocation, checked 2026-09-20 before filing — recorded so it is not re-checked.** `0290`:
> **no folder** named `0290*` under `ai-agents/tasks/{backlog,done,cancelled}/`, and **no `## ID`
> field** anywhere under `ai-agents/tasks/` holds the value. **Highest existing task id was `0289`.**
> **This brief is the allocation.** Nothing was renumbered (ADR-035).

## Sprint
Backlog

## Priority
— *(the Backlog board is unranked by design; needing a rank is the signal to pull this into a sprint)*

⚠️ **Producer's rank if this is ever pulled into a sprint: Low — NOT owner-ruled.**

## Status
🔲 Backlog

## Owner
fkit-coder

---

### ⚠️ AUTHORITY — READ THIS BEFORE TREATING THE BOARD OR THE RANK AS AN OWNER RULING

**What the owner ruled (2026-09-20, live in the `fkit lead` session via `AskUserQuestion`, relayed by
`fkit-lead` to a spawned `fkit-producer` with no owner channel):** that this residual **be filed as its
own task**. **That is all.** The owner did **not** rule which board it sits on, and did **not** rule its
priority. Both the [`0286`](../0286-deploy-scripts-run-apt-with-no-debian-frontend-noninteractive-a-deploy-blocks-on-a-dialog/brief.md)
reviewer and `fkit-lead` recommended filing; the owner agreed. ⛔ **Not producer precedent — one ruling,
one task.**

**⇒ The BOARD and the RANK below are the PRODUCER'S call and are overturnable in one edit.**

### Board choice — the producer's reasoning, stated so the owner can overturn it

**For the Backlog board (chosen):**

1. **The owner's stated focus this week is core citizenship/profile functionality — explicitly *not*
   monitoring or tooling.** This is deploy-script hygiene. Putting it on Sprint 4 would spend sprint
   attention against that instruction.
2. **`0286`'s Sprint 4 argument does NOT transfer, and that is the deciding point.** `0286` was ranked
   into Sprint 4 because *"the cost recurs inside this sprint"* — Sprint 4 keeps deploying to those
   boxes, so the owner pays the prompt toll on each deploy. **Nothing in Sprint 4 pays any toll here:**
   `setup.sh` is **one-time manual game-box provisioning** and **no deploy script invokes it**. Nothing
   re-runs it.
3. **No observed failure.** Unlike `0286`, which was filed off three live prompts the owner answered by
   hand, this is a **latent** unsafety: `apt`'s output and behaviour are not contractually stable across
   Debian releases. Nothing has broken.
4. **Sprint 4 already carries 24+ open rows**, and `0286` itself — the *higher*-severity parent, ranked
   **Low** — is still open pending an owner-executed box run.

**The tradeoff, stated honestly.** The Backlog board has a **demonstrated hold-forever failure mode**:
[`0061`](../../done/0061-investigate-prod-telegram-feedback-delivery-failure/brief.md) sat there from
2026-08-23 to 2026-09-17 because nothing forced a re-look. This row may well do the same. **Accepted
knowingly** — a latent scripting-contract issue in a script nothing automatically runs is the exact
shape of work that *should* wait, and the alternative (a Sprint 4 row) spends attention the owner has
said they want elsewhere. **If the owner disagrees, promoting it is one edit.**

## Context

**Source: [`0286`](../0286-deploy-scripts-run-apt-with-no-debian-frontend-noninteractive-a-deploy-blocks-on-a-dialog/brief.md)'s
worklog residual R3 and its review ledger's *Accepted residuals*.** ⛔ `0286` is **not edited by this
filing** — its `## Status`, its Sprint 4 row, `plan.md`, `worklog.md` and `review.md` are all untouched.

`setup.sh` (the game box) runs, verbatim:

```
apt update && apt upgrade -y
```

The other two deploy scripts — `setup-telemetry.sh` and `setup-profile.sh` — use **`apt-get`** for the
equivalent call. `setup.sh` itself is **internally inconsistent**: its later nginx install already uses
`apt-get install -y nginx >/dev/null`. So this is one line out of step with both its siblings and with
the rest of its own file.

⚠️ **Cite that line by CONTENT, not by line number.** `0286` recorded it as `setup.sh:32`; it now sits
lower in the file because `0286` added the `DEBIAN_FRONTEND` export block above it. Line numbers in this
project are an aid, never the citation
(`ai-agents/knowledge-base/conventions/file-line-citations.md`).

### Why it is worth fixing

**`apt` has no stable CLI for scripts — Debian's own man page says so.** `apt` is the interactive,
human-facing front end: its output format, progress rendering and warning text are explicitly allowed to
change between releases (it prints *"WARNING: apt does not have a stable CLI interface"* when its output
is not a terminal). `apt-get` is the interface with the stability guarantee, which is why every scripted
package call should use it. Parsing or relying on `apt`'s output or behaviour across releases is unsafe
by design.

### 🚨 WHY THIS NEEDED ITS OWN GATE RATHER THAN A DRIVE-BY FIX INSIDE `0286`

**The line sits on one of the three `apt upgrade` sites protected by OWNER RULING D2 (2026-09-19)** —
the owner was asked whether `apt-get upgrade -y` belongs in a deploy at all and ruled **"keep as-is"**,
after being told the `DEBIAN_FRONTEND` fix makes an unattended full upgrade *quieter, not safer*. The
other two protected sites are `setup-telemetry.sh`'s and `setup-profile.sh`'s upgrade lines.

Editing a D2-protected line inside `0286` would have been **a scope change smuggled into a hang fix** —
which `0286`'s own brief warns against. That is why the reviewer left it as residual R3 and the owner
was asked separately.

🚩 **RAISE, DO NOT SETTLE — an open question for the plan gate.** D2 ruled on **whether the full upgrade
stays**, not on **which binary runs it**. Swapping `apt`→`apt-get` keeps the full upgrade intact, so the
producer's *read* is that D2 is not disturbed. ⛔ **That is a read, not a ruling.** The plan must put it
to the owner before editing the line, and must not assume the answer.

## What to build

**One-line change, plus the checks below.** In `setup.sh`, change the update/upgrade call from `apt` to
`apt-get`, so it matches `setup-telemetry.sh`, `setup-profile.sh`, and `setup.sh`'s own nginx install.

⛔ **Do NOT change what the line does.** Not the `-y`, not the `upgrade`, not the `&&` chaining, not the
ordering relative to the `DEBIAN_FRONTEND` export above it. **This is a binary-name swap, nothing else.**
Removing or narrowing the upgrade is **owner ruling D2's** territory and is not this task's to revisit.

⛔ **Do not touch the other two scripts.** Their calls are already `apt-get`. There is nothing to change
there and widening into them re-opens D2.

### ✅ One thing that is already checked, so the plan does not re-derive it

`setup.sh` is grep-asserted by `tests/scripts/profile-deploy-hardening.test.sh` — an **unconditional
`npm test` gate** (`CLAUDE.md`). The relevant assertion is the `FRONTEND_ORDER` awk program, which
matches `apt(-get)?`. **It matches both spellings, so the swap does not break it and the harness needs
no edit for this change.** ⚠️ Verify that is still true at the time the task runs rather than trusting
this sentence — the harness has been edited since.

## Verification steps

1. `grep -n 'apt ' setup.sh` returns **no** package-manager invocation — every `apt`-family call in the
   file is `apt-get`.
2. The line's behaviour is byte-for-byte equivalent apart from the binary name: `git diff setup.sh`
   shows **one changed line**, and the change is `apt` → `apt-get` (twice on that line).
3. `bash -n setup.sh` exits 0.
4. `npm test` stays green — specifically `tests/scripts/profile-deploy-hardening.test.sh` prints
   `ALL PASS`. ⚠️ If it goes red, the harness assertion did change; fix the harness, do not weaken the
   change.
5. `npm run lint` exits 0 (trivially — no TypeScript changed; run it to prove nothing was touched by
   accident).
6. The worklog records the owner's answer to the D2 question raised above, **before** the edit was made.
7. No secrets, hosts, IPs, ports or tokens introduced into `setup.sh` or any artifact.

⚠️ **There is no runtime verification step, and the brief does not pretend otherwise.** `setup.sh` is
one-time manual game-box provisioning; nothing re-runs it, and re-running it on a live box to prove a
binary swap would cost far more than the change is worth. **This ships on static verification.** Do not
write it up as *"proven on a box"*.

## Notes

- **Depends on:** nothing. ⚠️ **Soft sequencing only:**
  [`0286`](../0286-deploy-scripts-run-apt-with-no-debian-frontend-noninteractive-a-deploy-blocks-on-a-dialog/brief.md)
  touches the lines immediately above this one in `setup.sh`. If `0286` is still open, expect a trivial
  rebase. **Neither task blocks the other** — this is not `🚧 Blocked`.
- **Blocks:** nothing.
- **Effort:** minutes for the edit; the gates (`npm test`) dominate the wall clock.
- **Severity: low, stated plainly.** No failure has been observed, `setup.sh` is not run by any deploy
  script, and the harm is a future Debian release changing `apt`'s behaviour under a script nobody is
  watching. **This is correctness hygiene, not an incident.** ⛔ Do not write it up as fixing an observed
  hang — that was `0286`, and even there only `debconf` prompts are covered (a **dpkg conffile** prompt
  is still open as `0286`'s residual R1, owner-ruled D3 to record rather than close).
- **Related:**
  [`0286`](../0286-deploy-scripts-run-apt-with-no-debian-frontend-noninteractive-a-deploy-blocks-on-a-dialog/brief.md)
  — the parent; this is its worklog residual **R3**, filed on the owner's 2026-09-20 ruling.
- 🔒 No secrets, hosts, IPs or tokens in any artifact.
- **Do not invoke the mover skills** — producer-only (ADR-033). No wiki writes.
