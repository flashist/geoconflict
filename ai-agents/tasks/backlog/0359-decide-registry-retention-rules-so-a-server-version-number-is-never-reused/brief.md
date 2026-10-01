# Decide registry clean-up (retention) rules for server version tags, so a version number can never be reused

## ID
0359

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-architect

## Context

**Filed 2026-09-30 by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER RULING given live
2026-09-30 via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`:** *"File a task for it"*.
⛔ Not producer precedent.

### The problem, in plain words

[ADR-117](../../../knowledge-base/decisions/adr-117-server-deploy-version-names-base-server-n.md) names each server
deploy `<base>-<server>.<N>` (e.g. `0.0.155-profile.3`). Its promise is that **one name always means one image** —
a number is never handed out twice.

For the profile server:
- The version name is the image's **only** registry tag, and it is pushed **before** the deploy runs (ADR-117
  decision 4). So a registry name means "built and pushed as attempt N", not "deployed".
- The counter picks `N` = 1 + the highest `N` found in **local git tags, the remote's git tags, and the local deploy
  record**, then steps upward past any name the **registry** already holds (ADR-117 decision 1).
- A git tag is created **only after a successful deploy** (decision 5), and the deploy record lives on one
  operator's laptop.

So a **pushed-but-never-deployed attempt** (ADR-117's accepted *Limit 2*) that holds the **highest `N` for its base**
has its number remembered in exactly one shared place: **the registry**. Its record line exists only on the laptop
that ran it, and there is no git tag.

`docs/security/registry-image-policy.md` § *Retention Policy* says superseded tags should be removed quickly (keep the
current and previous known-good). **If a future clean-up deletes that registry name, the next deploy — say from
another machine — no longer sees the number and hands it out again.** Result: one name on two different images over
time, which is exactly what ADR-117 exists to prevent. ADR-117 § *Open points recorded, not decided here* names this
and leaves it as "Owner's call when retention is built".

### Why now, and why nothing is broken yet

- ⚠️ **No clean-up of profile version tags in the registry exists today** (checked 2026-09-30: nothing in the deploy
  scripts deletes registry tags). So nothing breaks yet. This task decides the rule **before** a clean-up is built,
  so the clean-up is built right the first time.
- Not to be confused with the **box-side** image prune (`setup-profile.sh` § *Image prune (0219, G2)*): that removes
  old images from the profile box's own disk, not names from the registry, and the counter never reads the box. It
  does not cause this problem.

### Scope across servers

- **Profile server (`0355`, done):** affected — the case above.
- **Telemetry (`0356`):** the telemetry box runs **only third-party images** and pushes nothing of ours to the
  registry (ADR-117 § *How other servers apply this*: decision 4 does not apply). Its numbers live only in git tags
  and the deploy record. **So registry retention does not affect it**; the decision should still say so explicitly,
  and should say whether the same "durable high-water mark" idea is wanted there for a failed telemetry attempt
  (whose number today lives only in the laptop record).
- **Game server:** not affected — it keeps its own bump-before-build tags (ADR-117; `0357` changes only its reported
  version).
- **Any future server that ships its own image:** affected the same way as the profile server.

### Dependencies and conflicts

- ~~⚠️ **Status discrepancy to resolve before citing ADR-117:** the relay describes ADR-117 as **accepted 2026-09-30**,
  but the file's own `Status:` line (read 2026-09-30) still says **`proposed`**, pending the owner's sign-off on the
  text. This matters for the output: if ADR-117 is `accepted`, it is immutable and the retention rule must be a
  **new ADR** that amends/extends it; if still `proposed`, the rule could be folded into ADR-117's text instead. Check
  the status at plan time; do not edit ADR-117 as part of this task without the owner's say.~~
  ⚠️ **CORRECTED 2026-09-30 — no discrepancy: ADR-117 is `accepted`.** The `proposed` read was a race with the
  architect's in-progress edit. See *Correction 2026-09-30* at the end of this brief. The retention rule is recorded
  as a **new ADR**; ADR-117's text is not edited.
- Relates to ADR-117's accepted residuals **Limit 1** (push race), **Limit 2** (pushed-but-never-deployed keeps its
  name) and **Limit 3** (offline remote-tag read only warns). Any option chosen here should state whether it also
  narrows Limit 2 or Limit 3, or leaves them as they are.
- Relates to `0045` (registry credential hygiene) only if an option needs a registry token with **delete** rights —
  flag it if so; do not widen any credential as part of this task.

## What to build

A **decision, not code.** Produce a short options comparison (the `fkit-evaluate-approach` shape, saved under
`ai-agents/knowledge-base/reports/`) and, once the owner rules, record it as an ADR (`fkit-record-decision`).

Options to put to the owner — **do not decide on the owner's behalf**; a recommendation is expected:
1. **Never prune the newest name per `<base>-<server>`** — any retention job keeps the highest-`N` name for every
   base, even if that image was never deployed. Cheapest; the rule lives only in the future clean-up job.
2. **Record every attempt's name somewhere durable and shared** — e.g. push a git tag or ref for every pushed
   attempt, including failed ones (distinct from the "deployed OK" tag, so decision 5's meaning is kept). Changes
   `scripts/deploy-version-tag.sh` / `build-deploy-profile.sh`.
3. **Make the counter read a durable high-water mark** — one shared, durable record of the highest `N` issued per
   base, read before the registry probe. Needs a home that is not one laptop.
4. **Accept and document** — pruning may reuse a never-deployed number; documented as a known limit, with a re-raise
   trigger.

For each option, say in plain words: what changes, what it costs, whether it also closes/narrows Limit 2 or 3,
whether it needs registry delete rights, and whether telemetry needs anything. Cover also: does keeping one extra
image per base conflict with `registry-image-policy.md`'s "remove quickly" rule, and should that policy doc gain a
sentence either way.

**Implementation is out of scope.** If the owner picks an option that needs code (option 2 or 3), or when a registry
clean-up job is actually scheduled, file that as its own build task at the time.

## Verification steps

1. A report exists under `ai-agents/knowledge-base/reports/` comparing at least the four options above, each with:
   what changes, cost, effect on ADR-117 Limits 1–3, registry-permission needs, and telemetry impact — with one
   clear recommendation.
2. The report states explicitly that telemetry (`0356`) is or is not affected, and why.
3. ~~The owner's ruling is recorded as an ADR (new, or ADR-117 amended only if it is still `proposed` and the owner
   agrees), naming the rule any future registry clean-up must follow.~~ **CORRECTED 2026-09-30:** The owner's ruling
   is recorded as a **new ADR** (ADR-117 is `accepted`, so immutable), naming the rule any future registry clean-up
   must follow. If it changes ADR-117's meaning, the new ADR says so and supersedes/amends ADR-117 through its own
   process; ADR-117's text is not edited.
4. If the ruling changes a policy, `docs/security/registry-image-policy.md` § *Retention Policy* is updated to match
   (or a follow-up task is filed for it), so the policy and ADR do not contradict each other.
5. If the ruling needs code, a follow-up build task exists on a board, with this task as its dependency.
6. No host, IP, registry path, repository name or credential appears in any artifact.

## Notes

- **Depends on:** nothing (`0355` is done; ~~the ADR-117 status check above is a plan-time step, not a blocker~~
  **CORRECTED 2026-09-30:** no status check is needed — ADR-117 is `accepted`, so the output is a new ADR).
- **Blocks:** any future task that builds a registry clean-up (retention) job for server images.
- **Owner role:** `fkit-architect` — this is a design decision over the counter, the registry and the policy doc;
  a `fkit-coder` task follows only if the ruling needs code.
- **Size:** small — one report and one ADR.
- **Open question for the owner (plain words), to answer at plan time:** *When we eventually clean old images out of
  the registry, how do we make sure a version number that was used once — even by a deploy that never finished — is
  never handed out again?* Options above; recommendation to come from the architect's report.

## Correction 2026-09-30

**Appended 2026-09-30 by a spawned `fkit-producer` on a correction relayed by `fkit-lead`** (append-only; stale text
above is struck through, not deleted).

- **What was wrong:** this brief said ADR-117's `Status:` line read `proposed`. That read raced the architect's
  in-progress edit. `fkit-lead` re-read the file 2026-09-30 and it reads **`accepted (owner sign-off 2026-09-30,
  relayed by fkit-lead)`**. The owner ruled **"Accept it"** live via `AskUserQuestion` on 2026-09-30.
- **What changes:** per `ai-agents/knowledge-base/decisions/README.md` § *Immutability starts at `accepted`*, ADR-117
  is now immutable. The retention rule this task decides must be recorded as a **new ADR** (via
  `fkit-record-decision`). If that rule changes what ADR-117 says, the new ADR supersedes or amends ADR-117 through
  its own process. **Do not edit ADR-117's text.**
- **Plan-time step replaced:** the old "check ADR-117's status at plan time" step is gone. Its replacement is simply:
  the output is a new ADR.
- **Unchanged:** Status (`🔲 Backlog`), Sprint (Backlog), Priority (Unscheduled), Owner, options, scope.
