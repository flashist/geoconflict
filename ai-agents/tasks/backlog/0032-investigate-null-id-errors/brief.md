# Task — Investigate & Fix Client Null-ID/Null-Object Errors

## ID
0032

## Sprint
Sprint 4 — In-App Monetization & Citizenship (carried in as a stabilization follow-up).
This is the triage + fix half of the null-id investigation split (2026-06-03). It is
scheduled for Sprint 4 because both its prerequisites land at the Sprint 4c→4 boundary:
source maps (`0164-enable-client-source-maps`) and a deployed archive fix that quiets
the telemetry stream.

## Priority
Medium — ~1.8 errors/min. Real client-side state errors. Not urgent relative to the
citizenship/payments track, but cheap to triage once the prerequisites are in place.

## Status
🚧 Blocked — built + reviewed 2026-09-14 (top-2 clusters ≈99 % of the actionable null-id family fixed at the origin: `TerrainMapLoader` cached a built map with mutable tile ownership → second game on the same map in one page started with stale owners; `Leaderboard` dereferenced a legitimately-null `myPlayer`; regression tests fail on HEAD; stateful review round 1 closed out, R2–R4 applied, R1 accepted residual, Codex coverage full; `npm test` 122/1269 green); open pending the OWNER-side step 5 — game deploy via `build-deploy.sh`, then the Uptrace re-query filtered to the new `service.version` — ~~which is itself BLOCKED on `0257` (telemetry cert expired 2026-09-04, ingest dark)~~ **⛔ STRUCK 2026-09-22 — STALE, SEE CORRECTION 2 BELOW; the cert is LIVE, not expired.** Measurements are from build 0.0.140 (last real window); the traced files are byte-unchanged since. Same hold-open posture the owner ruled for `0219`. Driven by `/fkit-sprint-ship-loop` · 📅 **2026-09-14 — OWNER RULING, given live in the lead session and relayed by `fkit-lead`: step 5 (game deploy + Uptrace re-measure) WAITS FOR THE REGULAR WEEKEND DEPLOY SLOT (~6 days out); no earlier game deploy.** The wait covers the GAME server only (the profile box may deploy this week). Status token unchanged. · ✅ **CORRECTION 2026-09-14 — the *"BLOCKED on `0257`"* clause above is STALE:** `0257` closed 2026-09-14 (agent-closed — not owner-verified) and telemetry ingest was measured resumed at that close. **The one remaining gate is the weekend deploy slot** (the owner ruling above). Status token unchanged. · ✅ **CORRECTION 2 — 2026-09-22: the cert-expiry blocker is GONE, MEASURED.** The telemetry box's certificate is **live**, not expired (see the block below). 🚨 **⛔ THAT IS NOT PROOF INGEST IS ARRIVING** — read the block below before acting on it. **Status token unchanged — this task stays `🚧 Blocked`.**

> ### ✅ CORRECTION 2 — 2026-09-22: the *"telemetry cert expired, ingest dark"* blocker is STALE. **The cert is LIVE.**
>
> ⛔ **The `## Status` marker was NOT changed and NO mover was invoked — this task stays `🚧 Blocked`.**
> ⛔ **`0257` was not edited; it is closed.** Only the stale **reason text** above is corrected, **struck,
> not deleted.**
>
> **WHAT WAS MEASURED, and by whom.** `fkit-lead` measured the **live telemetry box** read-only on
> **2026-09-22** and reported: the box answers **HTTP 200 over HTTPS** ⇒ the **TLS handshake validates**;
> the certificate is **Let's Encrypt**, **issued 2026-09-14**, **expires 2026-12-13**.
> 📌 **Recorded as a lead measurement with its date** — ⛔ this repository cannot see a live certificate.
>
> ✅ **INDEPENDENTLY CORROBORATED IN THIS REPO** (checked 2026-09-22, not taken on trust) — two
> repo sources record the *same* certificate, and both match the lead's figures exactly:
>
> | Repo source | What it records |
> |---|---|
> | [`0257`](../../done/0257-telemetry-cert-expired-renew-now-and-fix-renewal-cron/worklog.md) § lines 14, 26 | `notBefore=Sep 14 08:18:41 2026 GMT` · `notAfter=Dec 13 08:18:40 2026 GMT`; nginx active on :80/:443 |
> | [`0260`](../../done/0260-verify-client-source-map-upload-runs-for-prod-builds/worklog.md):27 | strict `curl` (**no `-k`**): `http=200 ssl_verify=0` · `notAfter=Dec 13 08:18:40 2026 GMT` |
>
> ⇒ **The `0257` blocker is discharged on the evidence.** `0257` is `✅ Done (agent-closed — not
> owner-verified)`, and the cert it renewed is still valid.
>
> ## 🚨 THE BOUNDARY — READ IT BEFORE YOU UPGRADE THIS INTO GOOD NEWS
>
> ⛔ **A VALID CERTIFICATE AND AN HTTP 200 ARE *NOT* PROOF THAT OTEL DATA IS ARRIVING.**
>
> - A 200 over valid TLS proves **the box answers and the handshake validates**. That is **transport**.
> - **Step 5 needs *DATA*** — client spans and logs, ingested, queryable, **filtered to the new
>   `service.version`**. ⛔ **A handshake is not a datapoint.**
> - ⚠️ **W15's re-query MAY STILL FIND NOTHING, and that would NOT contradict this measurement.** Ingest
>   can be dark for reasons that have nothing to do with the cert: the client never exporting, the
>   collector rejecting, retention, a project/service-name mismatch, or simply **no traffic on the new
>   version yet** (`0032/worklog.md` already warns the old version's residue keeps appearing until
>   clients refresh — **filter by version, do not misread it as a failed fix**).
>
> ⇒ 🚨 **"Cert valid" ⇒ *the known blocker is gone*. ⛔ It does NOT ⇒ *ingest is live*.** **Ingest is
> unproven either way until the W15 re-query actually returns rows for the new version.**
>
> **WHAT ACTUALLY GATES THIS TASK NOW:** the **weekend deploy slot** (the 2026-09-14 owner ruling above)
> and then the ≥24 h re-measure at **W15**. ⛔ **`0032` cannot close at the slot** — the deploy is in the
> window, the measurement is not.

## Owner
fkit-coder

---

## Dependencies (both must be live before triage)
1. **Source maps available in Uptrace** — `0164-enable-client-source-maps` (Sprint 4c).
   With resolved stack traces this task may collapse to a direct, targeted fix.
2. **Archive telemetry-noise fix deployed** — `0159-reduce-archive-telemetry-noise`
   (Sprint 4c). The null-id cluster (~1.8/min) is ~15× quieter than the archive family
   (~26.6/min); reliable co-occurrence/pattern analysis needs that noise gone **in
   production**, not just merged.

> ✅ **BOTH SATISFIED 2026-09-12 — OWNER RULING, given live in session and relayed through the lead
> session:** the owner confirmed `0164` and `0159` are **deployed in production**. ⚠️ **Owner-attested,
> NOT repo-verified** — a deploy leaves no artifact in git, so this repository cannot confirm it either
> way. ⇒ **This task is now STARTABLE.** Status marker unchanged (`🔲 Backlog` — startable is not
> started).

---

## Context

A cluster of null-access errors is visible in Uptrace, present across Chrome, Safari, and
Firefox — suggesting a real runtime state issue, not a browser-specific quirk. Error
groups observed (2026-05-07 window):

| Error | Rate |
|---|---|
| `TypeError: e is null` (multiple groups) | ~1.02/min |
| `TypeError: null is not an object (evaluating 'a.id')` (multiple groups) | ~0.40/min |
| `TypeError: Cannot read properties of null (reading 'id')` (multiple groups) | ~0.36/min |
| `Unhandled rejection: null is not an object (evaluating 'a.id')` | 0.15/min |
| `null has no properties` (multiple groups) | ~0.16/min |

Source: `ai-agents/knowledge-base/telemetry-error-priorities-2026-05-07.md`

---

## Investigation

Investigation-first. **Do not write defensive null guards speculatively** — identify the
actual source first.

### Step 1 — Resolve via source maps (preferred path)
With `0164-enable-client-source-maps` live, use the minified column/line numbers in the
Uptrace stack traces to identify the original file and function. Document them. If this
pinpoints the location, skip to the fix — the steps below are the fallback.

### Step 2 — If source maps still don't resolve the location
- The `a.id` / `.id` null-access pattern suggests a player/unit/game-object lookup that
  returns null where a live object is expected. Common sources: `PlayerView`, `UnitView`,
  player-ID lookups in the radial menu or chat, and Yandex/profile identity flows.
- Add **structured logging** (not generic guards) around the highest-risk flows: the radial
  menu's player-selection path, `PlayerPanel`, `ChatModal` player reference, and any
  leaderboard/profile lookup that uses `.id` after an async fetch.

### Step 3 — Confirm the triggering user flow
- Correlate with events: match start, player elimination, alliance formation, chat send.
  Check Uptrace for surrounding trace context or co-occurring events (now reliable, with
  the archive noise gone).

---

## What to Build

Conditional on findings:
- **Source maps expose the location:** fix the specific null-access with a targeted guard
  or null check at the identified site.
- **Flow identified without a precise line:** add structured error context (`console.warn`
  with player/match state) at the risky path so the next observation pinpoints the cause.
  Do not add speculative null guards across the codebase.

---

## Verification

1. Either: the specific null-access location is identified and fixed, and the error group
   disappears from Uptrace.
2. Or: structured logging is added at the identified risky flow, giving the next Uptrace
   observation enough context to pinpoint the cause.

---

## Notes
- **Depends on:** both must be live before triage, flattened from the
  `## Dependencies (both must be live before triage)` numbered list above (left unedited): (1) source
  maps available in Uptrace — `0164-enable-client-source-maps` (Sprint 4c); and (2) the archive
  telemetry-noise fix deployed in production, not merely merged — `0159-reduce-archive-telemetry-noise`
  (Sprint 4c). Full prose above; this bullet is the machine-readable form beside it. ✅ **Both satisfied
  2026-09-12 per owner attestation (owner ruling, given live in session and relayed through the lead session) —
  owner-attested, not repo-verified; the task is startable.**
- The `a.id` minified pattern is a strong hint but not conclusive — `.id` is used on many
  object types. Do not over-scope the guard.
- If source maps (Task `0164-enable-client-source-maps`) fully resolve the traces, this
  task likely collapses to a small targeted fix and the Step 2/3 fallback is unnecessary.
