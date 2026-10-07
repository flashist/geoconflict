# Worklog — 0392 Read the post-0391 login numbers before the 0340 deploy

## 2026-10-07 — read attempt: BLOCKED, no numbers read

Recorded by a spawned `fkit-producer` with no owner channel (ADR-021/037), on the OWNER RULING given live 2026-10-07
in the `fkit lead` session, relayed by `fkit-lead` (⛔ not producer precedent). Lead: *"Late this week, do `0392`."*
Owner, verbatim: *"0392 - do it yoursel"*.

- **What happened.** Network route to the telemetry box was direct (not through a VPN). Read-only SSH connected.
  Two read-only checks ran: the ClickHouse version, and the column list of `uptrace.datapoints` /
  `uptrace.timeseries`. The first query on the login metric (`geoconflict_profile_login_verification`) was then
  **refused by the Claude Code permission system** (auto-mode classifier, category "Production Reads").
- **No login numbers were read.** The window below is planned, not read.
- **Planned window:** 2026-10-06T08:09:49Z (the `0391` deploy, profile `0.0.156-profile.2`) → time of the read.
- **Nothing was written on any server.** Only `SELECT` with `--readonly=1`.
- **To unblock:** the owner allows read-only production reads for the session that does the read, or runs the read
  themselves (method: `0373` worklog, *INTERIM Step 1 (server)*).
- **Owner's call on `0340`:** _blank — pending owner (no reading yet)._
