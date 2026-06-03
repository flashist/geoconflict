# Task — Enable Production Client Source Maps in Uptrace

## Sprint
Sprint 4c — Stabilization

## Priority
Medium — independent of telemetry noise, doable immediately. This is the high-leverage
half of the null-id investigation split (2026-06-03): it unblocks triage for **every**
minified client error cluster in Uptrace, not just the null-id errors. The triage + fix
half is `s4-investigate-null-id-errors.md` (Sprint 4) and depends on this.

---

## Context

A large share of client errors in Uptrace are unresolvable because the production client
bundle is minified and stack traces have no source mapping — e.g. `TypeError: e is null`,
`null is not an object (evaluating 'a.id')`. Without source maps these cannot be traced to
a file/function, so any minified cluster (the null-id family and others) is effectively
un-triageable.

This task is the enablement step that was Step 1 of the original null-id investigation,
split out on 2026-06-03 (the triage + fix half is now `s4-investigate-null-id-errors.md`).
It has no dependency on telemetry noise levels and can proceed in parallel with the rest of
Sprint 4c.

Source: `ai-agents/knowledge-base/telemetry-error-priorities-2026-05-07.md`

---

## What to Build

1. **Determine current state.** Check whether the webpack **production** build generates
   client source maps, and whether they are uploaded to Uptrace (or otherwise available
   for stack-trace correlation). Document what exists today.

2. **Enable source map generation** in the production webpack build if it is not already
   producing them.

3. **Wire source maps to Uptrace.** Add source-map upload to the deploy pipeline (or
   configure Uptrace/the error reporter to resolve them), so minified production stack
   traces map back to original file, function, and line. Use the existing deploy pipeline —
   do not create a parallel script (see the telemetry deploy pipeline already at repo root).

4. **Do not serve source maps publicly if avoidable** — prefer uploading them to Uptrace
   rather than shipping `.map` files to end users. (Note: this repo's source is public under
   AGPL, so exposed source maps are not an IP leak — but uploading to Uptrace is still the
   cleaner path and avoids extra bytes on the client.)

---

## Verification

1. A newly-occurring minified client error in Uptrace shows a resolved stack trace with
   original file/function/line names (not `e is null` at an anonymous minified location).
2. Source-map upload is part of the standard deploy pipeline, so it keeps working on every
   future deploy without manual steps.
3. The build number / version of uploaded source maps matches the deployed bundle, so
   traces resolve against the correct build.

---

## Notes
- This unblocks `s4-investigate-null-id-errors.md` — with traces resolved, the null-id
  cluster may be fixable directly from the stack trace, without the noisier
  co-occurrence/pattern analysis that depends on clean telemetry.
- Keep the upload keyed to build number so old builds' traces still resolve (relevant given
  prior stale-build issues).
