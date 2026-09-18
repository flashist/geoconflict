# Profile deploy: `setup-profile.sh` writes the compose file from an UNQUOTED here-document, so backticks inside its comments are executed as root on every deploy

## ID
0282

## Sprint
Sprint 4

*(Board and rank are the **producer's**, filed 2026-09-17 by a spawned `fkit-producer` on the
`fkit-sprint-ship-loop` driver's report. ⚠️ **NOT an owner ruling** — the producer had no owner channel.
The owner has not been asked about this task at all: not the finding, not the board, not the rank.)*

## Priority
High *(producer's rank — NOT owner-ruled)*

⚠️ Priority High is append rank, NOT a merit ranking — flagged for owner confirmation.
**On merit this belongs directly below `0276`**, because it is the same file and the same class of
defect (a deploy-time layer that is weaker than it reads), and because it should land **before** the
next `setup-profile.sh` run on the box — which [`0217`](../../backlog/0217-profile-p2-wire-game-server-to-profile-box/brief.md)
mandates in order to update `PROFILE_INTERNAL_ALLOW_IPS`. Appended at the bottom (ADR-035), not
inserted.

### Why Sprint 4 and not Backlog — the producer's reasoning, stated so the owner can overturn it in one edit

**For Sprint 4:** `0217` requires another `setup-profile.sh` run on the profile box before XP go-live.
That run is a **fresh** execution of the defect, as root, and it is the run where the one thing that
makes the defect harmless today — an empty working directory — is least certain to still hold. The fix
also **rides `0217`'s already-mandatory redeploy at zero marginal deploy cost**; shipped later it needs
a profile deploy of its own.

**Against Sprint 4, and it is a real argument:** the defect is **harmless today** (it corrupts comments
and nothing else), while the *fix* carries its own risk — quoting the here-document delimiter stops
**all** expansion, and several `${...}` in that block are expanded on purpose and must keep working.
Getting that wrong breaks the box's compose file. Shipping a script change into the deploy path right
before go-live is not free.

⇒ **Producer's call: Sprint 4**, on the free-deploy argument. ⚠️ **If the owner would rather not touch
the deploy script before go-live, move this to the Backlog board — that is a reasonable ruling and this
brief does not argue against it.** Nothing in Sprint 4 depends on it.

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder

## Context

**Found by `fkit-lead` in the deploy output of the owner-executed profile-box deploy, 2026-09-17.**
**Pre-existing.** It was introduced by **none** of the Sprint 4 tasks — not `0271`, `0272`, `0273`,
`0274` or `0276` — and it has been happening on **every profile deploy**, silently, for as long as the
block has carried backticks.

### What the defect is

`setup-profile.sh` writes the container compose file using a here-document whose **delimiter is not
quoted**. In an unquoted here-document the shell performs expansion on the body — including
**command substitution on backticks**. The compose block's comments contain backtick-quoted words
(the ordinary Markdown-ish habit of writing `` `always` `` or `` `node` `` to mean "the literal token
`always`"). The shell does not read them as quoting. It **runs them**, as **root**, at deploy time,
and substitutes their output — which for a failed command is the empty string.

### The evidence, from the 2026-09-17 deploy log

Four consequences, in order, each one a command the box actually executed:

```
no configuration file provided: not found            ← ran `docker compose stop`
line 948: always: command not found                  ← ran `always`
line 948: node: command not found                    ← ran `node`
docker: 'docker stop' requires at least 1 argument   ← ran `docker stop`
```

**Lead-verified on the box afterwards (read-only):** the generated compose file carries those four
comment lines with the backticked words **missing** — replaced by the empty output of the commands that
ran. The intended `${VAR}` expansions in the same block are **correct and deliberate**, and both
containers are healthy; `docker compose config` validates.

### Why this is NOT a cosmetic bug, and must not be filed as one

Two reasons, and the first is the serious one:

1. **One of the substitutions was `` `docker compose stop` ``.** It failed for exactly one reason: the
   working directory at that moment happened to hold **no** compose file. **In a directory that did, that
   comment would have stopped the production stack mid-deploy** — a self-inflicted outage produced by a
   comment. ⚠️ The deploy log is evidence that the directory is empty *today*; it is **not** evidence that
   it will be on the next run, and confirming which directory the here-document is expanded in, and what
   is in it at that moment, is part of this task.
2. **Any future edit that adds a backtick to that block executes arbitrary commands as root on the box,
   silently, with no error unless the command happens to fail noisily.** A contributor writing a perfectly
   ordinary comment is the attack surface. Nothing in the repo warns them, and nothing catches it.

The correct severity framing for a reviewer: this is **a latent root-command-execution channel in the
deploy path that currently only corrupts comments** — not an exploited hole, and not a cosmetic typo.

## What to build

1. **Quote the here-document delimiter** for the compose-file block in `setup-profile.sh`, so the body is
   written literally and no expansion of any kind happens.
2. **Re-supply, deliberately, every expansion the file genuinely needs at write time.** Quoting the
   delimiter stops **all** expansion, not just the dangerous kind. Several `${...}` in that block are
   expanded on purpose — the healthcheck's database user and database name, and the port are named in the
   lead's report as examples, and **the list in this brief is not authoritative: derive it from the file.**
   Each one must keep working, by substituting the value into the heredoc explicitly or by whatever
   mechanism the plan chooses.
3. **Normalise the comments** so a future backtick cannot reintroduce the hazard, and leave a short
   in-file note saying the delimiter is quoted deliberately and why.
4. **Check whether the same unquoted-delimiter pattern appears anywhere else** in `setup-profile.sh`,
   `build-deploy-profile.sh`, `setup-telemetry.sh`, `build-deploy-telemetry.sh`, `setup.sh` and
   `update.sh`. Report what you find. Fixing another occurrence is in scope only if it is the same defect
   in the same shape; anything else gets **reported, not fixed**.
5. **⚠️ `setup-profile.sh` is grep-asserted by `tests/scripts/profile-deploy-hardening.test.sh`, an
   unconditional `npm test` gate** (CLAUDE.md, consequence 1). Editing this block can turn `npm test` red
   for people not touching test code. Check which assertions match inside this block and update the
   harness where the change is genuine. **Do not weaken an assertion to make it pass.**
6. **Add a structural assertion to that harness** locking the delimiter quoted, so a future edit that
   unquotes it fails `npm test`. Without this, the fix has no gate and the defect returns.

## Verification steps

1. 🚨 **Diff the GENERATED compose file before and after — this is the acceptance criterion, not a nicety.**
   Generate the compose file from the script at HEAD and from the script after the fix, with the same
   inputs, and diff them. The **only** differences may be the four comment lines regaining their
   backticked words. **Any change to a `services:`, `image:`, `environment:`, `healthcheck:`, `ports:`,
   `volumes:`, `logging:` or `restart:` value is a REGRESSION** and means an intended expansion was lost.
   Record the diff in the worklog.
2. Running the fixed script produces **none** of the four log lines quoted in *Context* — no
   `command not found`, no `no configuration file provided`, no `docker: 'docker stop' requires…`.
3. `docker compose config` validates the generated file (locally is fine — this does not require the box).
4. A deliberately added backtick in a comment inside the block appears **verbatim** in the generated
   file and executes nothing. Remove the probe afterwards.
5. `npm test` green, and `bash tests/scripts/profile-deploy-hardening.test.sh` prints `ALL PASS` —
   including the new delimiter assertion, which must be seen **failing** against the unfixed script
   before it is trusted.
6. The new harness assertion fails if the delimiter is unquoted again (prove it by unquoting, running,
   re-quoting).
7. **On the box, after the owner's next `setup-profile.sh` run:** the deploy output is free of the four
   lines, and the deployed compose file's comments are intact. ⚠️ **Owner step — the owner runs every box
   command.** This task does **not** need a deploy of its own: it can ride `0217`'s mandatory profile
   redeploy.
8. No secrets, hosts, IPs, domains or tokens in the brief, plan, worklog, review, or in any value written
   into `setup-profile.sh`. Write "the game server IP", never an address.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing. ⚠️ **It is not a blocker and must not be reported as one** — [`0217`](../../backlog/0217-profile-p2-wire-game-server-to-profile-box/brief.md)
  can proceed without it. The Sprint 4 placement is about **riding `0217`'s deploy**, not about gating it.
- **Sequencing (soft — merge-conflict avoidance, not a dependency):** [`0280`](../../backlog/0280-correct-stale-test-figures-in-claude-md-and-stale-profile-route-table-in-architecture-md/brief.md)
  item 3 also edits `setup-profile.sh` (moving one summary line inside the `PROFILE_DOMAIN` guard) and
  also touches the hardening harness. They are in different parts of the file, but whoever goes second
  should expect a rebase.
- **Pre-existing, stated once more because it will be asked:** introduced by no Sprint 4 task, present at
  HEAD before Sprint 4 began, and executed on every profile deploy since.
- **Effort:** small — the edit is small. The **verification** is the work: the before/after diff of the
  generated compose file is what makes this safe, and it is not optional.
- **Related:** [`0276`](../0276-profile-internal-path-case-variants-bypass-nginx-allowlist/brief.md)
  (same file, same class of defect: a deploy-time layer weaker than it reads),
  [`0254`](../../backlog/0254-profile-non-root-deploy-user/brief.md) (the deploy runs as root at all — this defect
  is one concrete reason that matters).
- 🔒 No secrets, hosts, IPs or tokens in any artifact.
- **Do not invoke the mover skills** — producer-only (ADR-033). No wiki writes.
