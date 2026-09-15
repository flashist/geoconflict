# Verify `0164`'s source-map upload actually runs for prod builds — symbolication is absent in Uptrace for `0.0.140`

## ID
0260

## Sprint
Sprint 4

⚠️ **The field above is the bare token `Sprint 4` on purpose** — `dashboard.sh`'s drift rule compares it
against the `➡️ Moved` row's target on the Backlog board; any decoration breaks the match.

🔴 **PULLED INTO SPRINT 4 on 2026-09-14, on an OWNER RULING given live in the lead session
(`AskUserQuestion`) and relayed by `fkit-lead`.** Filed on the Backlog board earlier the same day by a
spawned producer. ⚠️ **The owner ruled the BOARD, NOT the rank** — the rank below stays the producer's.
The Backlog-board row now reads `➡️ Moved` and is kept, not deleted.

~~Backlog~~ *(struck 2026-09-14, kept not deleted)*

## Priority
**Medium — producer's rank, NOT owner-ruled** (the owner ruled the board on 2026-09-14, not the rank). ~~Unscheduled~~

**Producer's rank, if pulled into a sprint: Medium.** Not owner-ruled. `0164` was filed as "the
high-leverage half" of the null-id work because it unblocks triage of **every** minified client error
cluster; if the upload silently does nothing, that leverage was never delivered and every future
client investigation pays the cost `0032` just paid (it got by on surviving class names — its own
words: *"it will not always be so"*). Not High because there is a workaround today and nothing is
lost that a re-upload cannot restore.

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder

## Context

**Filed 2026-09-14 by a spawned `fkit-producer` on the ship-loop driver's instruction** (`0032`
follow-up item 4). **Not an owner ruling.** Investigation-first: cause unknown.

### What was observed (`0032`, 2026-09-14)
Stack frames for build `362a2f9` (`0.0.140`, deployed 2026-08-29) are **raw minified** in Uptrace.
`telemetry_sdk_language` is `webjs` (correct) and `error_filename` origin is `https://geoconflict.ru`.
`362a2f9` is a descendant of `0164`'s commit `6d4e574`, so the upload code was in the build.

### How the upload is wired (verified 2026-09-14)
- `build.sh:59-64` loads `.env`, `.env.secret`, `.env.<env>`, `.env.<env>.secret`; `:104-106` mounts
  the BuildKit secret **only if `UPTRACE_SOURCEMAP_DSN` is set**; `:96-99` **warns and skips** if
  `PUBLIC_ORIGIN` did not resolve.
- `Dockerfile:51-54` runs `node scripts/upload-sourcemaps.js || true` — **best-effort by design**: a
  missing DSN, a rejected upload, or a crash **never fails the build** and leaves only a build-log line.
- `scripts/upload-sourcemaps.js` keys maps by `service_name` (`geoconflict-client`, hardcoded),
  `service_version` = `GIT_COMMIT`, and `minified_url` = `PUBLIC_ORIGIN` + path. The client reports
  `service.version` = `GIT_COMMIT` (`src/client/OtelBrowserInit.ts:41`).
- Wiki `systems/telemetry`: *"A successful build with missing upload configuration still deploys, but
  minified client stacks stay unresolved."* — this is the designed failure mode, so **"the build was
  green" is not evidence the upload ran.**

### Hypotheses — cheapest first
1. `UPTRACE_SOURCEMAP_DSN` is not present in the owner's local env files → secret never mounted →
   upload skipped cleanly. (Check presence only. **Never print the value.**)
2. `PUBLIC_ORIGIN` did not resolve at build time → skipped with the warning at `build.sh:99`.
3. Upload ran but was **rejected** (DSN scheme, project mismatch, payload) — visible only in the
   build log (`[upload-sourcemaps] WARNING …`).
4. Upload succeeded but Uptrace did not match — `minified_url` mismatch (e.g. a `/js/` prefix or
   query string the browser reports differently), or Uptrace symbolicates only at ingest time so old
   data never resolves.

### 🚫 Not in scope
- Making the upload a hard build failure — that was a deliberate `0164` choice; propose a change as a
  follow-up if the findings argue for it, do not make it here.

## What to build

1. **Investigate** hypotheses 1–4 with evidence: the last prod build's log lines for
   `[upload-sourcemaps]` (re-run `build.sh` for `prod` **without deploying** if no log survives — a
   build alone publishes nothing; confirm that reading `build.sh` before relying on it), the Uptrace
   project's source-map listing, and one matched `minified_url`.
2. **Fix the confirmed cause** if it is a config/env gap or a `minified_url` mismatch (small); if the
   cause is larger, stop and return a follow-up brief text.
3. **Add the one thing that makes this visible next time**: `build.sh` (or the deploy summary) prints a
   single loud line saying whether the upload was **skipped / failed / succeeded with N maps**, so a
   silent no-op cannot recur unnoticed. Match the existing print style; no new script.

## Verification steps

1. Findings recorded in the worklog: which hypothesis held, with the log line or query that proves it.
2. A prod build's log shows the new upload-status line reporting **succeeded with N maps** (N > 0).
3. **End to end** (needs `0257`): after the next prod deploy, a client error in Uptrace for the
   **new** `service.version` shows **resolved** file/function/line, not minified names. Paste one
   frame before and after.
4. 🔒 The DSN never appears in any artifact; the status line prints counts, never the DSN.

## Notes

- **Depends on:** [`0257`](../../done/0257-telemetry-cert-expired-renew-now-and-fix-renewal-cron/brief.md)
  — for verification step 3 only; steps 1–2 and the build-side investigation can start now.
- **Blocks:** nothing.
- **Effort: ~0.5 day.** **Risk: Low** — a build without a deploy changes nothing in prod.
- **Source:** `ai-agents/tasks/backlog/0032-investigate-null-id-errors/worklog.md` (Findings bullet 2;
  "Follow-up brief text" item 4; Residuals). Parent enablement:
  [`0164`](../../done/0164-enable-client-source-maps/brief.md).
- **Do not invoke the mover skills.** Producer-only since ADR-033.
- **Never touch `ai-agents/wiki-vault/`.**
