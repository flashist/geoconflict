# Standardize the npm build/deploy script names on colon namespacing — and make the names say that they BUILD, not just deploy

## ID
0235

## Sprint
Backlog — unscheduled

⚠️ **This is an APPEND POSITION, NOT A MERIT RANKING.** The owner has **not** ruled a rank for this
task. fkit's **ADR-035** bars a producer from inserting a new row above a board's existing/closed
rows, so the row was **appended at the bottom** of [`backlog.md`](../../../sprints/backlog.md).
Bottom-of-board here means *"filed last"*, and nothing more.

**Why the Backlog board and not Sprint 4:** the board convention does not make Sprint 4 automatic.
Every Sprint 4 row carries a rank in its Priority column (`High *(producer's rank)*` and similar);
the Backlog board is unranked by design — *"The **Priority** column reads `—` for every row: this
board is unranked by design. Needing a rank is the signal to pull the task into a sprint"*
([`backlog.md`](../../../sprints/backlog.md), lines 14-15). With no owner rank, in doubt, it goes to
the Backlog board. **Promoting it is an owner call, not a producer one.**

## Priority
Unranked — **not ruled by the owner, and deliberately not ranked by the producer either.**

## Status
🔲 Backlog

## Owner
fkit-coder

## Depends on
🔴 **[`0215` — P1: stand up the profile box](../../done/0215-profile-p1-stand-up-the-box/brief.md) must
complete first. This is an OWNER RULING, given live in session 2026-09-10.** Do not start this task
before `0215` closes.

**Why the dependency is real and not merely a courtesy:** `0215`'s own brief and plan both invoke
`npm run deploy:profile` by name — [`brief.md:181`](../../done/0215-profile-p1-stand-up-the-box/brief.md)
(*"Re-run the deploy in place: `npm run deploy:profile`"*) and `plan.md:797`. Renaming the script
mid-deploy would break the exact command the owner is following off the page, during the one
operation in the repo that provisions a live box. **The owner was mid-deploy on `0215` when this
task was filed.**

---

## Context

### The motivating incident (concrete, 2026-09-10)

The owner **nearly ran `./build-deploy.sh profile`** — reaching for the profile deploy and landing on
the *game* deploy script with `profile` as its argument. The names do not distinguish the three
deploy targets clearly enough to survive a hurried moment.

🔴 **ONE PART OF THE FILING FRAMING DID NOT SURVIVE VERIFICATION, AND IS CORRECTED HERE RATHER THAN
QUIETLY DROPPED.** The filing said a newcomer typing `./build-deploy.sh profile` *"would run the GAME
deploy with a stray argument."* **That is not what happens at HEAD.** `build-deploy.sh` validates its
one positional argument against an allow-list **before** it does anything destructive:

- `build-deploy.sh:28-32` — exits 1 unless exactly one positional arg is given.
- `build-deploy.sh:36-39` — exits 1 unless that arg is one of `dev`, `staging`, `prod`.
- The version bump, the `git commit`, the `git tag` and the **`git push origin HEAD`** all live at
  `build-deploy.sh:44-52`, i.e. **after** both guards.

So `./build-deploy.sh profile` **fails closed** with `Error: Environment must be one of dev,
staging, or prod` and touches nothing. ✅ **The guard works.**

⛔ **This correction does NOT weaken the task, and must not be used to argue it away.** The incident
is real, the confusion is real, and it is exactly the near-miss a naming convention exists to
prevent. What changed is the *stated consequence*: the risk today is **wasted time and a moment of
"did I just deploy the wrong thing?"**, not a wrong deploy. A future reader should have the accurate
version.

### The owner's original framing — this is the point of the task

**Owner, 2026-09-10:** scripts that **BUILD** as well as **DEPLOY** should say so in the name.
`deploy:profile` **understates** what `./build-deploy-profile.sh` actually does — it cross-builds a
`linux/amd64` image, pushes it to a registry, resolves an immutable `@sha256` digest, *then*
provisions the box over SSH. Someone reading `deploy:profile` in a hurry may reasonably assume it
ships an already-built artifact.

**Preserve that intent. It is the point of the task, not a side benefit.** A rename that merely
tidies punctuation and leaves `deploy:` on a build-and-deploy script has failed this brief.

### The convention — RULED

**Owner ruling, 2026-09-10: COLON NAMESPACING.** The owner chose it over camelCase **after being
shown** that the repo already contains two styles and that camelCase would add a **third**.

Verified at HEAD in `package.json`:

| Style | Scripts using it |
|---|---|
| **kebab-case** | `generate-map-nation-counts`, `prebuild-dev`, `build-dev`, `prebuild-prod`, `build-prod`, `gen-maps` |
| **colon-namespaced** | `start:client`, `start:server`, `start:server-dev`, `start:profile-server`, `prestart:client`, `dev:staging`, `dev:prod`, `dev:remote`, `test:integration`, `test:scripts:docker`, `test:coverage`, `lint:fix`, `check:docker-secret-boundary`, `check:config-parity`, `deploy:telemetry`, `deploy:profile`, `telemetry:tunnel` |

Colon is already the clear majority. camelCase appears **nowhere**. The ruling picks the incumbent
majority — it does not invent anything.

### Current state, verified at HEAD

`package.json` lines 8-13, 23, 24, 37-38:

```
 8    "generate-map-nation-counts": "node scripts/generate-map-nation-counts.js",
 9    "prebuild-dev": "npm run generate-map-nation-counts",
10    "build-dev": "webpack --config webpack.config.js --mode development",
11    "prebuild-prod": "npm run generate-map-nation-counts",
12    "build-prod": "webpack --config webpack.config.js --mode production",
13    "prestart:client": "npm run generate-map-nation-counts",
23    "tunnel": "npm run build-prod && npm run start:server",
24    "pretest": "npm run generate-map-nation-counts",
37    "deploy:telemetry": "./build-deploy-telemetry.sh",
38    "deploy:profile": "./build-deploy-profile.sh",
```

### The deploy scripts at the repo root — and an asymmetry nobody has recorded

There is **no subcommand dispatcher**. Three deploy entry points exist as separate files:

| Script | Target | Reachable via npm? |
|---|---|---|
| `build-deploy.sh` | the **GAME** server (dev/staging/prod) | ❌ **NO npm script exists for it at all** |
| `build-deploy-telemetry.sh` | the telemetry VPS | ✅ `deploy:telemetry` |
| `build-deploy-profile.sh` | the profile VPS | ✅ `deploy:profile` |

📌 **The asymmetry is itself part of the confusion and should be recorded even if it is not fixed
here:** two of the three deploys are `npm run …`, the third is a bare `./script.sh env`. That is
plausibly *why* the owner reached for `./build-deploy.sh` at all — muscle memory has no `npm run`
entry to reach for. **Whether to add a game-deploy npm script is a NEEDS-DECISION below, not a
decision this brief makes.**

Also present at the root (context, not scope): `build.sh` and `deploy.sh` are **helpers invoked by**
`build-deploy.sh` (`build-deploy.sh:66` and `:70`), not independent entry points. Leave them alone.

### Reference inventory, counted at HEAD

**Narrow set** — `deploy:profile` | `deploy:telemetry` | `npm run deploy`: **22 references across 14
files.** ✅ The filing's figure is confirmed exactly.

**If the rename also touches `build-dev` / `build-prod` / `prebuild-*`**, the set grows to **43
references across 24 files.** Scoping that half in or out is a NEEDS-DECISION below.

---

## 🚨 SCOPE BOUNDARIES — read these before touching anything

### 1. `ai-agents/wiki-vault/` is OUT OF SCOPE for the implementing coder

**ADR-005 makes `fkit-wiki` the exclusive writer of `ai-agents/wiki-vault/`.** Four vault files carry
references:

- `ai-agents/wiki-vault/wiki/systems/architecture-overview.md`
- `ai-agents/wiki-vault/wiki/tasks/profile-build-push-digest.md`
- `ai-agents/wiki-vault/wiki/tasks/profile-deploy-wiring.md`
- `ai-agents/wiki-vault/wiki/tasks/profile-server-bring-up-runbook.md`

⛔ **Do not edit them. Do not "just fix the one line."** Route them to the `fkit-wiki` agent as a
`/fkit-wiki-sync` (or a targeted `/fkit-wiki-ingest`) **AFTER the rename has landed** — so the sync
reads the new truth rather than a half-applied one.

### 2. 🔴 HISTORICAL RECORDS MUST NOT BE REWRITTEN

References inside `ai-agents/tasks/done/*` briefs and `ai-agents/reviews/*` record **the command as
it was at the time**. Rewriting them makes the record **lie about the past**.

**Leave these alone — every one of them:**

| File | Refs |
|---|---|
| `ai-agents/tasks/done/0177-profile-04e1-build-push-digest/brief.md` | 4 |
| `ai-agents/tasks/done/0182-profile-04i-server-bring-up-runbook/brief.md` | 3 |
| `ai-agents/tasks/done/0180-profile-04e3-deploy-wiring-milestone/brief.md` | 2 |
| `ai-agents/tasks/done/0178-profile-04e-deploy-mechanics/brief.md` | 1 |
| `ai-agents/tasks/done/0179-profile-04e2-onbox-stack-gate/brief.md` | 1 |
| `ai-agents/tasks/done/0066-licensing-remediation-proprietary-purge/{brief,plan,worklog}.md` | 5 |
| `ai-agents/reviews/s4-profile-04e1.md` | 1 |
| `ai-agents/reviews/s4-profile-04e3-coder-handoff.md` | 1 |

✅ **Update LIVE references only** — things that are *current instructions* to a reader:
`package.json` itself, knowledge-base docs that instruct, `CLAUDE.md` where it names them, and any
live runbook.

📌 **If a `done/` brief would genuinely mislead a future reader, the fix is an ANNOTATION, not a
silent rewrite** — e.g. a dated one-line note *"⚠️ renamed to `<new>` by `0235` on YYYY-MM-DD; the
command below is the one that existed at the time."* Keep the original text.

⚠️ **`0182`'s brief is the awkward case and deserves a judgement call, not a reflex.** It is a `done/`
brief **and** the profile bring-up runbook people actually follow (`0182:225` is a literal command
block). It has already been corrected in place once (2026-09-04, the `PROFILE_INTERNAL_TOKEN` trap).
**Recommendation: annotate, do not rewrite** — and surface it to the owner rather than deciding
alone.

### 3. 🚨 HIGHEST-RISK ITEM IN THE WHOLE TASK — the npm pre-hooks

`prebuild-dev` and `prebuild-prod` are **npm lifecycle hooks**. npm runs `pre<name>` automatically
before `<name>`. **If `build-dev` is renamed and its pre-hook is not renamed in lockstep, the hook
silently stops running** — `generate-map-nation-counts` would no longer run before a build, and
**nothing fails loudly**. You get a build against stale generated data.

✅ **I VERIFIED THE MECHANISM MYSELF rather than trusting the filing.** In an isolated throwaway
package (npm **11.6.2**, this host), with scripts `prebuild-dev`/`build-dev` and
`predeploy:profile`/`deploy:profile`:

- `npm run build-dev` printed `PRE_RAN` then `MAIN_RAN`.
- `npm run deploy:profile` printed `PRE_COLON_RAN` then `MAIN_COLON_RAN`.

**Two conclusions, both load-bearing:**

1. ✅ The hazard is **real** — the pre-hook fires purely by name-matching, so a rename desyncs it.
2. ✅ **Colon-namespaced names DO get pre-hooks.** The chosen convention does not break the
   mechanism. The repo already proves this in production: `prestart:client` (line 13) is a live
   pre-hook on `start:client`.

**Three pre-hooks exist in `package.json` at HEAD:** `prebuild-dev` (→ `build-dev`), `prebuild-prod`
(→ `build-prod`), `prestart:client` (→ `start:client`), plus `pretest` (→ `test`). **Any rename of a
hooked script must rename its hook in the same edit.**

### 4. 🚨 A LOAD-BEARING REFERENCE OUTSIDE `package.json` — the production Dockerfile

**`Dockerfile:45` — `RUN npm run build-prod`.** This is the production image build. Renaming
`build-prod` without updating this line **breaks the game image build**, and it will not show up in
`npm test`.

**A second internal reference:** `package.json:23` — `"tunnel": "npm run build-prod && npm run
start:server"`. Same lockstep requirement.

⛔ **These two, plus the pre-hooks, are why `build-dev`/`build-prod` are a materially riskier rename
than `deploy:*`.** See NEEDS-DECISION Q2.

### 5. Backward-compatibility aliases — AN OPTION, NOT A DECISION

Consider keeping the OLD names as thin aliases pointing at the new ones (e.g. `"deploy:profile":
"npm run build-deploy:profile"`), so muscle memory and any external/undiscovered doc keep working.

**Presented as an option. NOT decided here.** See NEEDS-DECISION Q3. ⚠️ If aliases are added, note
that an alias named `build-dev` would **still attract the `prebuild-dev` hook** — which is either
convenient or a double-run, depending on where the hook is attached. Whoever implements must reason
that through, not assume.

---

## What to build

**Do NOT start until `0215` is closed** (owner ruling — see Depends on).

1. **Settle the NEEDS-DECISION items with the owner first.** Q1 (final names), Q2 (scope: deploy
   scripts only, or build scripts too), Q3 (aliases yes/no), Q4 (game-deploy npm script). **Do not
   pick names unilaterally** — the naming *is* the deliverable.

2. **Rename the agreed scripts in `package.json`**, colon-namespaced, with names that state that
   they build *and* deploy. Illustrative only, pending Q1:
   - `deploy:profile` → something that says build+deploy, e.g. `build-deploy:profile`
   - `deploy:telemetry` → likewise
   - (if Q2 says yes) `build-dev` → `build:dev`, `prebuild-dev` → `prebuild:dev`,
     `build-prod` → `build:prod`, `prebuild-prod` → `prebuild:prod`

3. **Rename every pre-hook in the same edit as its script.** Non-negotiable — see boundary 3.

4. **Update the internal `package.json` references**: `tunnel` (line 23) if `build-prod` moves.

5. **Update `Dockerfile:45`** if `build-prod` moves.

6. **Update LIVE docs only:**
   - `ai-agents/knowledge-base/architecture.md` (4 refs, incl. lines 722-723 which list the two
     deploy commands)
   - `ai-agents/knowledge-base/app-bootstrap-single-entry-point-findings-and-plan.md` (1 ref) —
     **check whether this is a live doc or a historical findings record before touching it.** If it
     reads as a dated findings snapshot, treat it under boundary 2.
   - `ai-agents/knowledge-base/reports/s4-licensing-asset-audit-findings.md` (2 refs) — **almost
     certainly a historical report; default to leaving it alone.**
   - `CLAUDE.md` — **see the findings section: it does NOT currently name any of these four
     scripts.** If Q4 adds a game-deploy script, that is the moment to consider listing the deploy
     commands there.
   - `ai-agents/tasks/backlog/0226-deploy-env-fails-open-to-prod-analytics/brief.md` (2 refs) and
     `ai-agents/tasks/backlog/0012-personal-inbox/worklog.md` (1 ref) — **open backlog tasks, so
     live-ish.** Update the command names; do not restructure the briefs.
   - `ai-agents/sprints/backlog.md` (1 ref) — check what it says before editing.

7. **Do NOT touch** `ai-agents/wiki-vault/**` (boundary 1), `ai-agents/tasks/done/**`,
   `ai-agents/reviews/**` (boundary 2), or `ai-agents/tasks/backlog/0215-*` unless `0215` is closed
   and the owner says so.

8. **After the rename lands**, route a `/fkit-wiki-sync` to the `fkit-wiki` agent to bring the four
   vault pages current.

---

## Verification steps

1. **`npm run <new build script>` still triggers its pre-hook.** Prove it, don't assume — run it and
   confirm `generate-map-nation-counts` actually executed (check the console output, or the mtime of
   the file it writes). ⚠️ **This is the check that catches the silent failure. Do not skip it
   because the build succeeded** — the build succeeds either way; that is the whole hazard.
2. **`npm test` passes.** Note it now takes ~22-25 s because the shell harnesses run (`0201`).
3. 🚨 **`docker build` of the game image succeeds** — this is the only thing that proves `Dockerfile:45`
   was updated correctly. `npm test` does **not** cover it. If Docker Desktop is not up, **say so and
   mark this step unverified** rather than reporting a green.
4. **`npm run tunnel` resolves** (it need not complete a full deploy — confirm it does not die on
   `npm ERR! Missing script`).
5. **`npm run <new deploy script> --help`-equivalent smoke:** confirm npm resolves the script name.
   ⛔ **DO NOT run a real profile or telemetry deploy as a verification step.** Those provision live
   boxes.
6. **`grep -rn` the old names across the repo** (excluding `node_modules`, `.git`, `wiki-vault/`,
   `tasks/done/`, `reviews/`) and confirm the only remaining hits are the deliberate historical ones
   and any deliberate aliases.
7. **Confirm nothing was rewritten in `tasks/done/` or `reviews/`** — `git diff --stat` should show
   zero files from those paths.

---

## Notes

### What the producer verified at HEAD (2026-09-10) vs took on trust

**Verified — first-hand, this session:**

- `package.json` lines 8-13, 23, 24, 37-38 as quoted. ✅
- Two conventions coexist; camelCase appears nowhere. ✅
- 22 refs across 14 files for `deploy:profile`|`deploy:telemetry`|`npm run deploy`. ✅ Exactly as filed.
- Broadened to include `build-dev`/`build-prod`/`prebuild-*`: **43 refs across 24 files.**
- Three deploy entry points at the root, no dispatcher. ✅
- 🔴 **`./build-deploy.sh profile` FAILS CLOSED, contrary to the filing framing** — corrected in
  Context above. `build-deploy.sh:28-39` guards before `build-deploy.sh:44-52` commits/tags/pushes.
- **npm pre-hook mechanism, tested empirically** on npm 11.6.2 in an isolated scratch package: fires
  for kebab names **and** for colon names.
- **`Dockerfile:45` = `RUN npm run build-prod`** — a live, load-bearing reference the filing did not
  mention.
- **`package.json:23` `tunnel` → `npm run build-prod`** — a second internal reference.
- `build.sh` / `deploy.sh` are helpers called from `build-deploy.sh:66,70`, not entry points.

**Taken on trust:** nothing material. The filing's line numbers were re-derived rather than reused.

### Answers to the three "record what you find, do not fix it" questions

**Q: Does `CLAUDE.md`'s Development Commands section name any of these?**
❌ **No.** `CLAUDE.md:89-105` lists `dev`, `dev:staging`, `dev:prod`, `dev:remote`, `start:client`,
`start:server-dev`, `test`, `lint`, `lint:fix`, `format`, `gen-maps`, `perf`, `check:config-parity`.
**None of `build-dev`, `build-prod`, `deploy:profile`, `deploy:telemetry` appears.** Elsewhere in the
file `test:scripts:docker` (`:193`), `test:coverage` (`:175`, `:201`) and `test:integration` (`:272`)
are named. 📌 **Consequence: the rename does not require a `CLAUDE.md` edit for correctness — but the
absence is itself a finding.** The two deploy commands that provision live infrastructure are
documented **nowhere** in the file a new agent reads first.

**Q: Do the husky hooks reference them?**
❌ **No — because there are no husky hooks.** `.husky/` contains **only** the `_/` internals
directory (husky's own generated shims). There is **no `pre-commit`, no `pre-push`, no hook file of
any kind** at the `.husky/` level. This independently confirms `CLAUDE.md`'s statement that *"the
husky pre-commit hook is inert (tracked separately as `0223`)"*. `package.json` still declares
`"prepare": "husky"` and a `lint-staged` block — both currently reach nothing.

**Q: Do the jest config or CI reference them?**
❌ **jest: no.** `jest.config.ts` contains no `build` or `deploy` reference.
❌ **CI: no CI exists.** `.github/workflows/` **does not exist.** Consistent with the 2026-09-02 owner
ruling recorded on `0201` — *"CI explicitly — the owner is not introducing a CI platform for this."*

📌 **Net: the blast radius outside `package.json` is exactly ONE executable file — `Dockerfile:45`.**
Everything else is documentation. That is smaller than it looks, and it is also the single thing most
likely to be missed, because nothing in `npm test` catches it.

### 🚩 NEEDS-DECISION — four open questions for the owner

**Q1. The actual new names.** The convention is ruled (colon) and the intent is ruled (say
"build"). The **strings themselves are not.** `build-deploy:profile`? `deploy:profile:full`?
`ship:profile`? ⚠️ Note `build-deploy:profile` mirrors the script filename `build-deploy-profile.sh`
exactly, which is an argument for it — but it is longer to type than what the owner types today.
**Producer recommendation: `build-deploy:profile` / `build-deploy:telemetry`**, because filename ↔
script-name symmetry is what makes the near-miss impossible to repeat. **Owner's call.**

**Q2. Scope — deploy scripts only, or the build scripts too?** Renaming only `deploy:*` is 22 refs,
14 files, and **zero** executable blast radius. Adding `build-dev`/`build-prod`/`prebuild-*` takes it
to 43 refs across 24 files **and pulls in `Dockerfile:45`, `package.json:23` and both pre-hooks** —
the risk section of this brief exists almost entirely because of that half.
**Producer recommendation: do BOTH, in one pass, but treat the build half as the part that needs the
Docker build verification (step 3).** The tradeoff: doing only `deploy:*` leaves the repo with the
same two-convention split the owner was shown and chose to end — a partial fix that arguably makes
the inconsistency *more* confusing, not less. **Owner's call.**

**Q3. Keep the old names as aliases?**
- **For:** muscle memory survives; `0215`'s runbook lines keep working; any doc or note we did not
  find keeps working; near-zero cost.
- **Against:** the repo then has *both* names live, so the old name never actually dies and nobody is
  forced to learn the new one — which defeats the point. Also adds an alias-vs-pre-hook wrinkle
  (boundary 5).
**Explicitly NOT decided. Owner's call.**

**Q4. Should the GAME deploy get an npm script too?** Today it is the only one of the three without
one, and that asymmetry is a plausible contributor to the near-miss. ⚠️ **This is a scope EXPANSION
beyond what the owner asked for**, and it carries a real hazard the other two do not:
`build-deploy.sh` **commits, tags and `git push origin HEAD`** at `build-deploy.sh:44-52`. Making
that one keystroke closer deserves a deliberate yes, not a drive-by addition. **Producer
recommendation: raise it, do not bundle it — file separately if the owner wants it.** **Owner's
call.**

### Constraints observed while filing

- Nothing under `ai-agents/tasks/backlog/0215-*` was read for edit or modified. Two lines were read
  for the dependency citation only.
- No `.env*` file and no repo-root deploy script was modified.
- `package.json` was **read only** — not modified.
- Nothing was committed.
- No secrets, hostnames-with-credentials, DSNs or tokens appear in this brief.
