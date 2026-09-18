# `setup-profile.sh`: the `PROFILE_IMAGE` digest-pin check is not anchored, so a value containing newlines passes validation and injects arbitrary keys into the generated compose file

## ID
0287

## Sprint
Backlog

*(Board is the **producer's**, filed 2026-09-18 by a spawned `fkit-producer` on the
`fkit-sprint-ship-loop` driver's report. ⚠️ **NOT an owner ruling.** The owner ruled only **that this
finding gets its own task** — not which board, not the rank, and **not the severity**, which is the
open question this brief exists to put to them. See *Board choice* below for how to overturn it in one
edit.)*

## Priority
— *(the Backlog board is unranked by design; needing a rank is the signal to pull this into a sprint)*

### Board choice — the producer's reasoning, stated so the owner can overturn it

**For the Backlog board (chosen):** the two reviewers disagree on whether this is a `HIGH` or a `LOW`,
and **the severity has not been ruled**. Ranking a finding into an actively-shipping sprint before its
severity is settled bakes in the higher reading by default. The trigger is also **not accidental**: it
needs an operator to hand the deploy script a `PROFILE_IMAGE` containing newlines, which no build path
in this repo produces. Nothing today sets such a value.

**Against, and it is a real argument:** [`0217`](../0217-profile-p2-wire-game-server-to-profile-box/brief.md)
mandates another `setup-profile.sh` run on the profile box before XP go-live. A fix here would **ride
that already-mandatory redeploy at zero marginal deploy cost**, exactly as
[`0282`](../../done/0282-setup-profile-unquoted-heredoc-executes-compose-comments-as-root/brief.md)
did. Shipped later, it needs a profile deploy of its own.

⇒ **Producer's call: Backlog**, on the unsettled-severity argument. ⚠️ **If the owner rules this `HIGH`,
the right move is Sprint 4 (appended, ADR-035) so it rides `0217`'s deploy** — that is a reasonable
ruling and this brief does not argue against it.

## Status
🔲 Backlog

## Owner
Unassigned

## Context

**Found by the `fkit-reviewer` Codex pass and independently reproduced by this project's reviewer
during the review of [`0282`](../../done/0282-setup-profile-unquoted-heredoc-executes-compose-comments-as-root/brief.md),
2026-09-18.** Recorded there as finding **`R4`**.

🚨 **PRE-EXISTING, AND NOT CAUSED BY `0282`.** Measured identical through `0282`'s old unquoted
here-document and through the fixed quoted one. `0282` neither introduced it nor worsened it. It has
been present in `setup-profile.sh` since the digest-pin validation was written. **Anyone reading this
brief must not conclude the heredoc fix caused it.**

### What the defect is

`setup-profile.sh` refuses to deploy a mutable image tag: before using `PROFILE_IMAGE` it asserts the
value is immutably digest-pinned (`setup-profile.sh:154`, inside the `── Validate ──` block that
begins around line 140). The check is a bash `[[ … =~ … ]]` test whose pattern ends in `$`.

**In bash's `=~`, `$` anchors at the end of the *string*, not the end of a *line*.** There is also no
`^` anchor at the front. So a `PROFILE_IMAGE` whose **last line** ends in a valid `@sha256:<64 hex>`
**passes the check no matter what the earlier lines contain** — and those earlier lines are carried
straight into the generated compose file, where they become YAML keys under the profile service.

Shape of a passing value (illustrative — line 2 is the injected key):

```
repo/name
    privileged: true
    # @sha256:<64 hex>
```

The value is substituted into the compose template at `setup-profile.sh:1072`. **`0282`'s
leftover-placeholder guard stays quiet**, correctly — nothing was left unsubstituted; the injected text
arrived *inside* a substituted value.

**Reproduced.** Both reviewers measured it on bash 3.2.57 and bash 5.2.15, and the producer
re-confirmed the bypass on bash 3.2.57 while filing this brief: the value above returns **true** from
the current test.

### ⚠️ Severity: the two reviewers DISAGREE, and the disagreement is the point

**Both views are recorded here verbatim in substance. Do not treat either as settled — this is for the
owner to rule.**

| Who | Rating | Their reasoning |
|---|---|---|
| **Codex** (the adversarial second-opinion reviewer) | **`HIGH`** | It is a **validation bypass that injects container configuration**. A check written specifically to fail closed on an untrusted image reference can be walked past, and what gets through lands as arbitrary keys under the running service. |
| **This project's `fkit-reviewer` (Claude side)** | **`LOW`** *(downgraded from Codex's HIGH)* | `PROFILE_IMAGE` is **operator-supplied input to a script that already runs as root**. It therefore sits **inside** the trust boundary — someone who can set that variable can already do anything the script can. **This is not a privilege escalation.** |

Neither reviewer disputes the *mechanism*; they dispute what it is worth. **This brief deliberately
does not pick one.** ⛔ Do not resolve the disagreement while implementing — if the owner has not ruled
the severity by the time this is picked up, ask before scoping effort to it.

### Why it is worth fixing even at `LOW`

Recorded as the weakest sufficient argument, not as a severity claim: the check exists to **fail
closed** on an image reference that is not immutably pinned (`setup-profile.sh:146-150` explains why —
a mutable tag could be re-pointed between the scan and the pull). A check that can be walked past
**reads stronger than it is**, which is the same class of defect as `0282` and `0276`: a deploy-time
layer weaker than it looks.

## What to build

1. **Confirm the fix shape before writing it — do NOT assume it is a one-character change.**
   The finding was handed over with the belief that adding one anchor character settles it.
   ⚠️ **The producer checked, and that belief is wrong as stated:** the current pattern has **no `^`
   either**, so simply prepending `^` to `@sha256:…` would require the whole value to *begin* with
   `@sha256:` and would reject every legitimate `repo/name@sha256:<hex>` input. The fix needs a leading
   anchor **plus** a subpattern for the repository part, or an explicit rejection of any value
   containing a newline — **derive the exact form from the file, and verify both directions.**

   *(Measured while filing, bash 3.2.57, as a starting point and **not** as a prescription:
   `^[^[:space:]]+@sha256:[0-9a-f]{64}$` rejects the injecting value and accepts a normal
   `repo/name@sha256:<64 hex>`. Confirm it against the real values the deploy path produces —
   registry references can carry a port and a path, e.g. `host:5000/team/name`.)*

2. **Decide and record whether a newline should be rejected explicitly, separately from the anchor.**
   An anchored pattern already excludes a newline-bearing value here, but an explicit rejection fails
   with a *message that names the real reason*, which the anchor alone does not. Pick one, say why.

3. **Check the same unanchored-`$` pattern elsewhere.** Sweep every `[[ … =~ … ]]` in
   `setup-profile.sh`, `build-deploy-profile.sh`, `setup-telemetry.sh`, `build-deploy-telemetry.sh`,
   `setup.sh` and `update.sh` for a pattern that ends in `$` with no `^`. **Report what you find.**
   Fixing another occurrence is in scope only if it is the same defect in the same shape; anything else
   gets **reported, not fixed**.

4. **⚠️ `setup-profile.sh` is grep-asserted by `tests/scripts/profile-deploy-hardening.test.sh`, an
   unconditional `npm test` gate** (CLAUDE.md, consequence 1). Check which assertions cover the
   validation block and update the harness where the change is genuine. **Do not weaken an assertion to
   make it pass.**

5. **Add a harness assertion that locks the validation anchored**, so a future edit that drops the
   anchor fails `npm test`. Without a gate the defect returns. Follow the `N1`–`N5` assertions `0282`
   added to that same harness as the pattern.

## Verification steps

1. **Prove the bypass first, against the UNFIXED script**, and record the exact value used in the
   worklog (synthetic digest, no real image reference). A fix whose failing case was never observed is
   not trusted.
2. **Prove the fix rejects it**, with the script's own fail-closed message and a non-zero exit.
3. 🚨 **Prove the fix does NOT reject a legitimate value.** Test at minimum: a plain
   `repo/name@sha256:<64 hex>`, a registry host with a port, and a multi-segment path. **A regression
   here breaks every profile deploy** — this is the acceptance criterion, not a nicety.
4. **Diff the generated compose file before and after with a legitimate `PROFILE_IMAGE`.** It must be
   **byte-identical** — this task changes validation, not rendering. Any difference is a regression.
5. `npm test` green, and `bash tests/scripts/profile-deploy-hardening.test.sh` prints `ALL PASS` —
   including the new assertion, which must be seen **failing** against the unfixed script before it is
   trusted.
6. `npm run lint` clean; `bash -n` on every changed shell file.
7. **On the box:** nothing required. This is a validation change with no rendering effect, so it needs
   no deploy of its own and can ride whatever profile redeploy comes next. ⚠️ **The owner runs every
   box command** — do not propose running one.
8. No secrets, hosts, IPs, domains or tokens in the brief, plan, worklog, review, or in any value
   written into a script or a test. Use a synthetic 64-hex digest and a placeholder repository name.

## Notes

- **Evidence:** finding **`R4`** in
  [`ai-agents/tasks/done/0282-setup-profile-unquoted-heredoc-executes-compose-comments-as-root/review.md`](../../done/0282-setup-profile-unquoted-heredoc-executes-compose-comments-as-root/review.md)
  — the reviewer row, the disposition row, and the reproduction on both bash versions.
- **Depends on:** nothing. `0282` shipped; this does not need it, and it does not undo it.
- **Blocks:** nothing. ⚠️ **It does not gate [`0217`](../0217-profile-p2-wire-game-server-to-profile-box/brief.md)**
  and must not be reported as a blocker.
- **Sequencing (soft — merge-conflict avoidance, not a dependency):** touches `setup-profile.sh` and
  the same hardening harness as
  [`0280`](../0280-correct-stale-test-figures-in-claude-md-and-stale-profile-route-table-in-architecture-md/brief.md)
  item 3 and [`0286`](../0286-deploy-scripts-run-apt-with-no-debian-frontend-noninteractive-a-deploy-blocks-on-a-dialog/brief.md).
  Different parts of the file; whoever goes second should expect a rebase.
- **Related:** [`0282`](../../done/0282-setup-profile-unquoted-heredoc-executes-compose-comments-as-root/brief.md)
  (where this was found — **it is not a regression from it**),
  [`0276`](../../done/0276-profile-internal-path-case-variants-bypass-nginx-allowlist/brief.md) and
  [`0254`](../0254-profile-non-root-deploy-user/brief.md) (same class: a deploy-time layer weaker than
  it reads, on a script that runs as root).
- **Effort:** small — the edit is a few characters; the **verification is the work**, specifically
  step 3, because over-tightening the pattern breaks every deploy.
- 🔒 No secrets, hosts, IPs or tokens in any artifact.
- **Do not invoke the mover skills** — producer-only (ADR-033). No wiki writes.

## Open question for the owner

**What severity is this?** Codex says `HIGH` (a validation bypass that injects container config); this
project's reviewer says `LOW` (operator input to a root-run script, inside the trust boundary, no
privilege crossing). The answer decides whether this stays on the unranked Backlog board or is appended
to Sprint 4 to ride `0217`'s mandatory redeploy. ~~**Not ruled as of 2026-09-18.**~~

### ✅ RULED 2026-09-18 — `LOW`. Stays on the Backlog board.

**Authority:** the **owner**, live in the `fkit lead` session via `AskUserQuestion`, relayed by the
`fkit-sprint-ship-loop` driver. Recorded here by that driver because it is the only actor that heard
the ruling; the text above is struck through, not deleted, so the disagreement stays readable.

**The ruling takes this project's `fkit-reviewer`'s reading over Codex's.** `PROFILE_IMAGE` is
**operator-supplied input to a script that already runs as root**, so injecting compose keys gains an
attacker nothing they did not already have — the finding sits **inside** the trust boundary, not across
it. No build path in this repository produces a newline-bearing value.

⚠️ **`LOW` is a severity ruling, not a dismissal.** The defect is real and reproduced: the check accepts
a value it was written to reject. It stays filed, it stays fixable, and the ✅ acceptance criterion in
the verification section is unchanged.

⚠️ **Codex's `HIGH` reading is NOT erased and must not be quietly dropped by a later reader.** It stands
as recorded above. What the owner ruled is which reading governs the **board placement**, not that the
other was wrong on its face.

**Consequence for scheduling:** this does **not** get appended to Sprint 4, so it does **not** ride
`0217`'s already-mandatory `setup-profile.sh` redeploy. 📌 **Whoever picks this up should expect to need
a profile deploy of its own** — that cost was accepted knowingly when the severity was ruled `LOW`.
