# Client Source-Map Upload — it never worked, because Uptrace 2.0.2 has no upload endpoint

**Source**: `ai-agents/tasks/done/0260-verify-client-source-map-upload-runs-for-prod-builds/brief.md`
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 4 / task `0260`

## Goal

Find out why stack frames for the deployed prod build were **raw minified** in Uptrace, when the upload
code from `0164` was demonstrably in that build.

🚩 **The trap this task existed to disarm, stated in the brief before anyone looked:** the upload is
**best-effort by design** — `node scripts/upload-sourcemaps.js || true`, with the secret mounted only if
its DSN variable is set and a warn-and-skip if the public origin does not resolve. **A missing DSN, a
rejected upload, or a crash never fails the build** and leaves only a build-log line. ⇒ ⛔ **"The build
was green" is not evidence the upload ran.**

## Key Changes

**No code was written.** The task **STOPPED at the plan's "anything bigger" gate** — the approved plan's
stop row was *"Uptrace 2.0.2 can't do uploads … needs a version upgrade"*, and that is what the evidence
showed. The planned build-status line (*"skipped / failed / succeeded with N maps"*) was therefore **not
built**, because the spawn rule for that branch says stop and write no code.

## Outcome

### **The deployed Uptrace 2.0.2 has no source-map upload endpoint. Every upload the script has ever sent
was answered `405 Method Not Allowed`** — the same answer Uptrace gives for a path that does not exist.

| # | Hypothesis | Verdict |
|---|---|---|
| 1 | DSN missing locally | **Refuted** on this machine — the real upload loaded it and sent it |
| 2 | Public origin unresolved at build time | **Refuted** |
| 3 | Upload rejected | **HELD — but the cause is "endpoint absent", not a DSN or payload problem** |
| 3a | Header lacks a project id | **Refuted / moot** — 2.0.2 resolves the project from the token, and the request never reaches a handler anyway |
| 3b | TLS on the expired certificate | **Moot now** (it was real for builds between 09-04 and 09-12). **Even with TLS fine, every upload is 405** |
| 4 | Uploaded but not matched | **Refuted as the cause — nothing is ever stored.** ⚠️ The `minified_url` shape is nonetheless **correct**, and the reported `service_version` is the full 40-char SHA, which is what the build passes |

🚩 **The probe that makes this conclusive, and the technique is worth copying:** a POST to the source-map
path and a POST to a **deliberately nonexistent** path returned **identical empty `405`s**, while a POST
to a route Uptrace 2.0.2 **does** register returned a real `400` JSON error through the same nginx. ⇒ **the
405 is Uptrace's own router, not nginx** — and the source-map route simply is not registered. Listing
routes were probed too: **every candidate returned the dashboard's SPA HTML shell — no listing route
exists either.**

### Consequences that outlived the task

- **The dead upload was removed** and the architecture doc corrected: client stack traces are **not
  symbolicated**. Source maps are still generated as `hidden-source-map` and **deleted from the image**,
  and the master still **404s `.map` requests as defence in depth** — that part is unchanged and
  deliberate.
- **Revisit is filed as `0264`** on the Backlog board (an Uptrace upgrade, or a private map download).
- ⚠️ **The end-to-end verification step this task carried — a resolved frame after the next prod deploy —
  is moot**, not passed. **Nothing resolves frames today.**

## Related

- [[tasks/s4c-enable-client-source-maps]] — task `0164`, the upload this refutes
- [[systems/telemetry]] — the stack, and where the symbolication claim had to be corrected
- [[systems/architecture-overview]] — its source-map paragraph was corrected by this finding
- [[tasks/telemetry-cert-expired-renewal-cron]] — task `0257`, the sibling this depended on for its (now moot) end-to-end step
- [[tasks/uptrace-retention-not-applied]] — task `0259`, the third sibling from the same finding
- [[decisions/sprint-4]] — the sprint that owns it
- [[decisions/sprint-backlog]] — the board it was filed on, and where its revisit `0264` now sits
