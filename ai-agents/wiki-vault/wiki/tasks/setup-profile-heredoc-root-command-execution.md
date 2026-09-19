# `setup-profile.sh`'s Unquoted Here-Document Ran Comment Text as Root

**Source**: `ai-agents/tasks/done/0282-setup-profile-unquoted-heredoc-executes-compose-comments-as-root/brief.md`
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 4 / task `0282`

> ⛔ **No hostnames, IPs, ports, tokens or addresses on this page** — the source brief is written under
> that rule (*"write 'the game server IP', never an address"*) and the vault honours it.

## Goal

**Stop the profile deploy from executing its own comments as root.**

`setup-profile.sh` wrote the container compose file from a here-document whose **delimiter was not
quoted**. In an unquoted here-document the shell expands the body — including **command substitution on
backticks**. The compose block's comments used the ordinary habit of backtick-quoting a literal token
(`` `always` ``, `` `node` ``). The shell did not read those as quoting. **It ran them, as root, on every
profile deploy**, and substituted their output — the empty string for a command that failed.

**Found by `fkit-lead`** in the output of the owner-executed profile deploy, **2026-09-17**.
🚨 **Pre-existing — introduced by NO Sprint 4 task** (not `0271`, `0272`, `0273`, `0274` or `0276`), and
happening silently on every profile deploy for as long as that block carried backticks.

### The evidence, from the deploy log

Four lines, each one a command the box actually ran:

```
no configuration file provided: not found            ← ran `docker compose stop`
line 948: always: command not found                  ← ran `always`
line 948: node: command not found                    ← ran `node`
docker: 'docker stop' requires at least 1 argument   ← ran `docker stop`
```

Lead-verified on the box afterwards, read-only: the generated compose file carried those four comment
lines with the backticked words **missing**. The intended `${VAR}` expansions in the same block were
correct, both containers healthy, `docker compose config` valid.

### 🚨 Why this is NOT a cosmetic bug — the framing that must survive

**Functionally harmless today: it corrupted comments and nothing else.** That is not the same as
harmless.

1. **One of the substitutions was `` `docker compose stop` ``.** It failed for exactly one reason — the
   working directory at that moment happened to hold **no** compose file. ⛔ **In a directory that did,
   that comment would have stopped the production stack mid-deploy** — a self-inflicted outage produced
   by a comment. The log proves the directory was empty *that day*; it is **no evidence about the next
   run**.
2. **Any future edit adding a backtick to that block runs arbitrary commands as root, silently**, with
   no error unless the command happens to fail noisily. **A contributor writing an ordinary comment was
   the attack surface**, and nothing in the repo warned them.

⇒ The correct severity, and the one a reviewer should carry: **a latent root-command-execution channel
in the deploy path that today only corrupts comments.** Not an exploited hole. Not a typo.

## Key Changes

- **The here-document delimiter is quoted**, so the body is written literally and nothing expands.
- **The four values that genuinely needed expanding were re-supplied explicitly**, behind a
  **fail-closed guard** — because quoting the delimiter stops *all* expansion, not only the dangerous
  kind, and several `${...}` in that block (the healthcheck's database user and name, the port) are
  deliberate and had to keep working.
- **Five comment lines were de-backticked** so a future backtick cannot reintroduce the hazard, with an
  in-file note saying the delimiter is quoted on purpose.
- **Five new structural assertions** in `tests/scripts/profile-deploy-hardening.test.sh` (8 `0282`
  assertions green in total at close), locking the delimiter quoted. ⚠️ **Without that gate the fix has
  no guard and the defect returns** — and the harness is an unconditional `npm test` gate, so an edit to
  this block can turn `npm test` red for someone not touching test code. That is the gate working.

## Outcome

✅ **Closed 2026-09-18 by a spawned `fkit-producer` on the ship-loop driver's report.** Verification
**green, not degraded**:

| Gate | Result |
|---|---|
| `bash tests/scripts/profile-deploy-hardening.test.sh` | `ALL PASS`, 8 `0282` assertions green |
| `npm test` | **137 suites / 1853 tests / 0 failures** |
| `npm run lint` | clean |
| **The acceptance criterion** — rendered-compose diff before vs after | **exactly 5 lines, all YAML comments**; comment-stripped renders **identical** |
| Codex adversarial second opinion | **RAN** (`codex exec --sandbox read-only`, exit 0) — **full model-diverse coverage, no degradation** |

🚩 **The diff *is* the acceptance criterion, not a nicety.** Any change to a `services:`, `image:`,
`environment:`, `healthcheck:`, `ports:`, `volumes:`, `logging:` or `restart:` value would have been a
regression meaning an intended expansion was silently lost. None occurred.

⚠️ **Not verified on a box.** This task needs no deploy of its own — it rides `0217`'s mandatory profile
redeploy. The brief's step 7 (the deploy output free of the four lines, comments intact in the deployed
file) is an **owner step and remains outstanding**.

### Four residuals, owner-accepted 2026-09-18 — recorded, not unfinished work

1. **R1** — no portable inline fix for the replacement-side `&` on bash ≥ 5.2. The substitution form
   stands; ⚠️ **the false safety claim about it was corrected** in the code comment, the worklog and a
   `plan.md` amendment. Safety rests on validated/defaulted values plus the fail-closed guard.
2. **R3** — the four substitutions re-scan each other's output, so the guard proves *"no placeholder
   survived"*, **not** *"values were inserted literally"*. No current value can trigger it.
3. **R5** — the compose file sits at umask mode between being written and `chmod 600`'d.
   **Pre-existing, on every run**, and the file holds no credential.
4. **Harness formatting coupling** — pre-existing and already declared in the harness. A reformat gives
   a false **red**, never a false green.

### ⚠️ A separate pre-existing finding was split out, not fixed here

Review finding **R4**: `PROFILE_IMAGE`'s digest-pin check uses bash's `=~` regex test, whose `$` anchor matches
**end-of-line, not end-of-string**, so a **newline-bearing value passes validation and injects arbitrary
compose keys**. **Owner-ruled into its own task (`0287`, Backlog board) — not a fix here and not a
residual of this one.** ⛔ The owner ruled *only* that it gets its own task; the board and rank are the
producer's.

📌 **The same unquoted-delimiter pattern was swept for** across `setup-profile.sh`,
`build-deploy-profile.sh`, `setup-telemetry.sh`, `build-deploy-telemetry.sh`, `setup.sh` and `update.sh`
— per the brief, anything that was not the same defect in the same shape was to be **reported, not
fixed**.

## Related

- [[tasks/internal-path-case-variant-allowlist-bypass]] — task `0276`: **same file, same class of defect** — a deploy-time layer weaker than it reads
- [[tasks/profile-deploy-hardening]] — the harness this extends, and the `npm test` gate that now locks the delimiter
- [[systems/player-profile-store]] — the box this deploy script provisions
- [[tasks/name-change-daily-digest]] — task `0283`, closed alongside it in the same sprint run, and the other change to this deploy script's cron block
- [[systems/alert-delivery]] — the relay `setup-profile.sh` also configures on this box
- [[decisions/sprint-4]] — the sprint that owns it
