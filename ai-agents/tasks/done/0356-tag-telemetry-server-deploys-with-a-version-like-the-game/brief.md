# Tag telemetry-server deploys with a version, the way the game server is tagged

## ID
0356

## Sprint
Sprint 7

## Priority
29 — append rank. ⚠️ **NOT the owner-ruled placement: by OWNER RULING (2026-09-30) this task is at the TOP of
Sprint 7, worked after [`0355`](../../done/0355-tag-profile-server-deploys-with-a-version-like-the-game/brief.md)**, whatever
this number says. Rank 1 is out of reach because closed rows sit below it (ADR-035 — never renumbered, even under an
owner ruling). See the Sprint 7 addendum dated 2026-09-30 for `0355`/`0356`.

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder

## Context

**Filed 2026-09-30 by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER REQUEST given live in
the `fkit lead` session on 2026-09-30, relayed by `fkit-lead`.** ⛔ Not producer precedent. The owner's words,
verbatim:

> *"we need to do tagging of profile and telemetry servers, similarly to the way we currently tag our game server. We
> can use the same package.json version for that, but with different postfixes (e.g. 1.2.3-profile). My idea is not
> final, I am open for discussion and better solutions. Brief a task and put it to the top of the current sprint."*

This is the **telemetry** half. The profile half, **how the game server is tagged today (with `file:line`)**, the
owner's starting proposal, the alternatives table and the open questions all live in
[`0355`](../../done/0355-tag-profile-server-deploys-with-a-version-like-the-game/brief.md). **The naming scheme is ruled once,
at `0355`'s plan step; this task reuses it.** Why two tasks: different deploy units, tested and shipped apart, and —
see below — the telemetry box is a genuinely different kind of thing.

### How the telemetry server identifies itself today (read from the code, 2026-09-30)

- ⚠️ **There is no image of ours to tag.** The telemetry box runs only **third-party images, each pinned to a fixed
  version** in `setup-telemetry.sh` — ClickHouse (`:508`), Postgres (`:531`), Redis (`:547`), Uptrace `2.0.2`
  (`:556`), the OTEL collector (`:574`). What **we** ship is the **configuration**: `build-deploy-telemetry.sh`
  uploads `setup-telemetry.sh` and a secrets file and runs it (`build-deploy-telemetry.sh:323-330` onward); the script
  writes the compose file and configs under the box's install directory (`setup-telemetry.sh:33`, `:54`).
- So "the telemetry version" can only mean **"which commit of our telemetry setup is deployed"**.
- **Nothing records it today.** `build-deploy-telemetry.sh` never reads git or `package.json`, writes no deploy record
  (unlike the profile deploy's local record), and leaves no version marker on the box.

### Dependencies, conflicts and hazards

- ⚠️ **Deploy scripts are touched, so `npm test` can go red.** `tests/scripts/profile-deploy-hardening.test.sh` carries
  grep-level structural assertions over **`build-deploy-telemetry.sh` and `setup-telemetry.sh`** (e.g. `:393-396`;
  CLAUDE.md § *Shell harnesses*). One of them ties the compose image tag to a pinned line (`setup-telemetry.sh:1053`
  comment) — do not disturb it.
- **Uptrace is not rebuilt by this**, so the Uptrace UI will not show our version. The visible version lives in a
  marker on the box and in the deploy record (per the ruling on `0355` Q5).
- **Weekend deploy slot rule** (owner ruling 2026-09-29): ships in a weekend slot.
- **Build / verify split** (owner ruling 2026-09-29): the proof needs a real deploy and an owner check, so when this
  build task closes, a **verify task is filed at the top of Sprint 8**. It must not block this sprint's deploy.

## What to build

Apply the scheme ruled at `0355`'s plan step (starting proposal, **not final**: `0.0.155-telemetry`, or whatever the
owner rules — see `0355`'s table and Q1–Q6) to the telemetry deploy. Guidance, not a recipe:
- `build-deploy-telemetry.sh` computes the ruled version name for the commit being deployed, and — per the `0355`
  rulings on timing (Q6), uncommitted files (Q4) and clashes (Q1) — creates and pushes the git tag. Never overwrite a
  tag.
- Leave a **version marker on the box** (a small file written by `setup-telemetry.sh` next to its configs, holding the
  version and commit — no secrets, no hosts), so "what is deployed there?" is answerable on the box.
- Add a **local deploy record** like the profile deploy's (`build-deploy-profile.sh:340-350`): timestamp, version,
  commit, result. No host, no secret.
- Do **not** write a suffixed version into `package.json` (`scripts/bump-version.js` throws on it — see `0355`).
- Extend `tests/scripts/profile-deploy-hardening.test.sh` with assertions for the new behaviour; keep every existing
  assertion green.

### Out of scope
- The profile server (→ `0355`); the game server; changing any third-party image version.

## Verification steps

Local (this task):
1. `npm test` is green, including `tests/scripts/ShellHarnesses.test.ts`; the hardening harness prints its success
   marker with the new assertions counted.
2. The harness (or a stubbed dry run) shows the ruled tag name for a clean tree, the ruled behaviour for a dirty tree
   and for "tag already exists", and that `setup-telemetry.sh` writes the marker file with version + commit and
   nothing else.
3. `git diff` of `setup-telemetry.sh` shows no third-party image version changed.
4. `package.json` `version` is unchanged by a telemetry deploy run.

After deploy (the verify task filed at close, top of Sprint 8 — owner-run, weekend slot):
5. The git tag exists on the remote at the deployed commit; the marker on the box and the local deploy record show the
   same version; Uptrace still answers (no regression).

## Notes

- **Depends on:** [`0355`](../../done/0355-tag-profile-server-deploys-with-a-version-like-the-game/brief.md) — soft: the
  naming scheme is ruled at `0355`'s plan step. If the owner rules the scheme earlier, this can start in parallel.
- **Blocks:** nothing
- **Plan-time consult:** `fkit-architect`, only if the `0355` ruling leaves a telemetry-specific question (e.g. where
  the marker lives).
- **Open question specific to telemetry (plain words):** *Is a version tag worth it when the box runs only other
  people's software?* Recommended: **yes** — our setup script and its configs change (e.g. alert probes, memory caps),
  and "which version of our setup is live?" is exactly the question the tag answers. Alternative: tag only the profile
  server and drop this task (the owner asked for both, so this is not the default).

### Owner rulings on `0355` that set this task's shape — 2026-09-30 (append-only; nothing above is edited)

**Authority:** OWNER RULINGS given live 2026-09-30 in the `fkit lead` session via `AskUserQuestion`, relayed by
`fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037). ⛔ Not producer precedent. Recorded here
by that producer; this task's status and rank are unchanged.

- **Split kept.** The owner confirmed keeping
  [`0355`](../../done/0355-tag-profile-server-deploys-with-a-version-like-the-game/brief.md) (profile) and this task
  (telemetry) as two tasks. The "drop this task" alternative in the open question above is therefore **not** taken.
- **Name format:** `0355`'s plan was approved 2026-09-30 with the format ruled as **`<base>-profile.<N>`** (e.g.
  `0.0.155-profile.3`; the architect's `profile-<base>.<N>` was declined). So **this task uses
  `<base>-telemetry.<N>`** (e.g. `0.0.155-telemetry.1`) — replacing the unnumbered `0.0.155-telemetry` starting
  proposal in *What to build* above.
- **Uncommitted shipped files → refuse to deploy** was ruled for `0355`. **Expected default here: the same rule**
  (the telemetry deploy stops before doing anything if a shipped file has uncommitted changes). ⚠️ Not yet ruled for
  this task — **confirm at this task's plan gate.**
- **Reuse, don't rebuild:** the shared helper `scripts/deploy-version-tag.sh` (being built in `0355`) is what this
  task reuses for the tag name, the counter and the git-tag step.
- **Pending follow-up (the owner has NOT been asked yet):** the architect recommends an **ADR** for the naming
  convention once ruled. If it lands before this task's plan, cite it.
