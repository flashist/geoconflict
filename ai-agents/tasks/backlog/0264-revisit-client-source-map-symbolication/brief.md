# Revisit client source-map symbolication (Uptrace upgrade or private map download)

## ID
0264

> ℹ️ **ID allocation, checked 2026-09-14 before filing.** Highest ID across `backlog/`, `done/`,
> `cancelled/` was `0263` (folder prefixes and `## ID` fields agree). `0264` has no folder;
> duplicate-prefix check (`uniq -d`) empty.

## Sprint
Backlog

## Priority
Unscheduled

**Producer's rank, if pulled into a sprint: Low–Medium** — not owner-ruled. The owner accepted "no
symbolication for now" on 2026-09-14. Minified client stacks still carry class/method names (`0032`
triaged on them), so there is a workaround; but every client investigation pays for it, and `0032`
itself warned *"it will not always be so"*.

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**Filed 2026-09-14 by a spawned `fkit-producer` on an OWNER RULING given live in the lead session
(`AskUserQuestion`) and relayed by `fkit-sprint-ship-loop` — `0260` review ruling R3:** *file the
revisit brief in the same step as closing `0260`*, so the docs that say "a revisit task is pending"
are true. **The ruling covers filing it on the Backlog board only.** It picks no option below.

**Source:** [`0260`](../../done/0260-verify-client-source-map-upload-runs-for-prod-builds/brief.md) —
its `worklog.md` (probes 3–6, "Hand-off — revisit Backlog brief text") and `review.md`.

### What `0260` proved
- The deployed `uptrace/uptrace:2.0.2` has **no source-map upload API**. `POST /api/v1/sourcemaps`
  returns `405`, identical to a route that does not exist, while a registered POST route returns `400`
  through the same nginx. A real upload of 6 maps went `0 uploaded, 6 failed`.
- Uptrace 2.0.x instead **fetches** maps over HTTP (it follows a `sourceMappingURL` comment or a
  `SourceMap` response header). `0164` closed that path on purpose: `hidden-source-map` (no comment),
  maps deleted from the image, and `Master.ts` 404s `.map`.
- ⇒ **No build since `0164` was ever symbolicated.** Owner ruled *"Accept none for now"*; `0260`
  removed the dead upload (script, Dockerfile step, `build.sh` secret arg, `PUBLIC_ORIGIN`).
- Kept on purpose (accepted residual): webpack still emits hidden maps and the Dockerfile still deletes
  them — so a restore stays cheap.

### ⚠️ Unknowns — this is an investigation first, not an implementation
- **Which Uptrace release (if any) ships the upload API is unverified.** Uptrace's docs describe
  `POST /api/v1/sourcemaps` and an `upload_disabled` option but name no version or edition. No public
  tag's dist config (`v2.0.2`, `v2.0.3`, `v2.1.0-beta*`, `master`) has it, and the public repo is
  evidently not the whole product — so "not in any public tag" is **not** proof it is absent.
- **It may be an edition gate, not a version gate** (producer inference, not tested). `0259` found
  `featflag.Premium` / licence code in the 2.0.2 binary and inferred (did not read) that it gates
  retention — `0263` tests that. Sourcemap upload could sit behind a similar gate.
- **Whether 2.0.2 honours a `SourceMap` response header** on a hidden map is unverified.

## What to build

**Phase 1 — investigate and put the choice to the owner (this brief).**

1. **Option 1 — upgrade Uptrace** to a release that accepts uploads. Find the release (and edition)
   that does; prove it on a **throwaway local container**, not the telemetry box: one upload returns
   success and a matching minified frame resolves. Record the upgrade's cost on the telemetry box:
   it is **low-RAM with an OOM history** (see wiki `systems/telemetry`); note config/migration changes
   and whether it changes `0263`'s retention picture. Keeps `0164`'s "maps never public".
2. **Option 2 — use 2.0.2's fetch path, restricted:** maps served **only to the telemetry box** (e.g. a
   `SourceMap` header pointing at a path allowlisted to that box). No upgrade, but maps must stay in
   the image — **partly reverses `0164`**. Prove on a local 2.0.2 container that Uptrace honours the
   header for a hidden map, and list the nginx + `Master.ts` changes it would need.
3. Return a short findings report with a recommendation; the **owner picks** (or keeps "none").
   **Do not change the telemetry box or any deploy script in this phase.**

**Phase 2 — implement the chosen option (a separate brief, filed after the owner picks).** Whichever
option, it carries:
- **Restore list.** The removed pieces are visible at `0164`'s commit `6d4e574`:
  `scripts/upload-sourcemaps.js`, the Dockerfile upload step, the `build.sh` DSN secret arg and
  `PUBLIC_ORIGIN` resolution. ⚠️ **Restore the pieces, not whole files** — `Dockerfile` and `build.sh`
  both have later commits since `6d4e574`, so checking those files out wholesale would revert
  unrelated work. (The most recent pre-removal state is the parent of whichever commit lands `0260`.)
- **Re-add `0260`'s Step C:** one loud build status line — *skipped / failed / succeeded with N maps* —
  because the old failure printed 6 WARNING lines nobody read.
- **Fix the stale comment** in `setup-telemetry.sh` (the `client_max_body_size` "Source map uploads"
  note). ⚠️ The deploy hardening harness greps that file — run `npm test`.

### 🚫 Not in scope
- **Making an upload failure fail the build** — `0164`'s deliberate choice.
- Serving maps publicly (`0260` worklog's option 3) — reverses `0164` outright; not offered by the
  owner's revisit ruling. Raise it only as a finding if phase 1 argues for it.
- Buying an Uptrace licence (an owner/business call — report the need if found, do not act).

## Verification steps

1. Findings report in `ai-agents/knowledge-base/reports/` names, for option 1, the exact Uptrace
   release/edition with the upload API — **or states it could not be found** — with the evidence (a
   throwaway-container upload returning success and one resolved frame, or the probe that failed).
2. For option 2, the report shows a local 2.0.2 container resolving a frame via the `SourceMap` header
   (or failing to), plus the exact list of nginx/`Master.ts` changes needed.
3. Each option carries cost and risk for the telemetry box (RAM, upgrade/migration, data exposure).
4. The owner's choice is recorded in this brief; if an option is chosen, a phase-2 brief exists with
   the restore list and Step C above.
5. 🔒 No DSN, token, host or endpoint appears in any artifact.

## Notes

- **Depends on:** nothing — `0260`'s findings are the input and already exist.
- **Blocks:** nothing filed. Unblocks a future phase-2 implementation brief (not filed until the owner
  picks), and any client investigation that needs resolved frames (e.g.
  [`0261`](../0261-null-error-remainder-lit-burst-split-null-alliance-request-recipient/brief.md)
  benefits, but does not wait on it).
- **Why one brief, not two:** both options are desk research + a local container on the same question,
  and the owner chooses between them; the implementation's shape depends entirely on that choice, so
  it cannot be briefed yet (investigation-first). Phase 2 becomes its own brief.
- **Effort: ~1 day** for phase 1. **Risk: low** — local containers only, nothing on the box.
- **Related:** [`0263`](../0263-confirm-uptrace-ce-14-day-retention-hard-cap-or-configurable/brief.md)
  (same Uptrace edition/licence question; an upgrade could change retention),
  [`0164`](../../done/0164-enable-client-source-maps/brief.md) (the original enablement and its
  "maps never public" choice), `0032` (why class/method names survive).
- **Wiki gap:** `systems/telemetry` still documents the removed upload as current — routed to
  `fkit-wiki` at `0260`'s close; do not write the vault.
- **Do not invoke the mover skills.** Producer-only since ADR-033.
