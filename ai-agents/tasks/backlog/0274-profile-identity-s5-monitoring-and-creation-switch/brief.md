# Profile identity S5 — Monitoring before go-live: profile-server metrics to Uptrace, email alerts, a creation switch, cleanup runbook

## ID
0274

## Parent / Epic
[`0266-profile-identity-internal-player-id-platform-logins-login-endpoint`](../0266-profile-identity-internal-player-id-platform-logins-login-endpoint/brief.md)

## Sprint
Sprint 4

## Priority
High *(producer's rank — NOT owner-ruled)*

⚠️ Priority High is append rank, NOT a merit ranking — flagged for owner confirmation.
**On merit this belongs directly below `0273`**, the last of the five slices; the S1–S5 run as a whole
belongs directly below `0217`. Appended at the bottom (ADR-035).

## Status
🔲 Backlog

## Owner
fkit-coder

⚠️ Plus **owner steps** (Uptrace UI + a live drill) — the task cannot close on code alone.

## Context

**Filed 2026-09-15 on OWNER RULINGS (`AskUserQuestion`, lead session, relayed by `fkit-lead`):**
monitoring **"Yes, before go-live"**; alerts by **"Email"**; no per-IP rate limit on login (monitoring
replaces it; junk profile rows are the owner-accepted, monitored risk). The architect placed monitoring
as its own 5th slice (delegated).

**Source of truth:** [`2026-09-15-profile-identity-design.md`](../../../knowledge-base/reports/2026-09-15-profile-identity-design.md)
§6 (baseline, junk risk, metric list, alerts A1–A6, switch, cleanup, daily backstop), §9 row **S5**;
[ADR-113](../../../knowledge-base/decisions/adr-113-profile-internal-player-id-and-platform-identities.md).

**Why before go-live:** a scripted 100 req/s writes ~3–4 GB/day; the box has 48 G free ⇒ ~12–16 days of
runway. Detection must take minutes, not days.

**Today the profile server has no OTEL** (`Logger.ts` note) — only the daily `profile-checks.sh`
dead-man's switch (`0219`).

## What to build

Per design §9 S5:

1. **`src/profile-server/Telemetry.ts`** — OTEL metrics exporter reading `OTEL_*` env directly (its own
   minimal setup — never `src/server/Logger.ts`), with the `geoconflict.profile.*` metrics in §6:
   login requests by outcome, players created by source, HTTP duration, session rejections (incl.
   `legacy_fallback_used`), tenure claims, pool waiting, players total (5-min estimate), process
   CPU/memory. ⛔ **Never** a platform user id, player id or token in an attribute or log line.
2. **Deploy wiring** — OTLP endpoint + Uptrace DSN as a **secret** in the 0600 env file via
   `setup-profile.sh`; config parity allowlist; shell-harness assertions.
3. **`PROFILE_LOGIN_CREATE_ENABLED`** (default on). Off → existing players log in normally; unknown
   identities get `503 creation_paused`; game-server resolve **still creates**. Flip = env edit +
   container restart.
4. **Cleanup query as a runbook section** under `ai-agents/knowledge-base/` (not scheduled): delete
   junk players per the §6 definition (identity created inside the incident window; no credits,
   grants, intents, messages, name history or display name; not a citizen). Covered by an integration
   test.
5. **`profile-checks.sh` backstop:** fail the ping if disk > 80 % or `players` grew by > 20K in 24 h;
   cases added to `tests/profile-checks.sh`.

### Owner steps
1. **Profile-box deploy** with the new secrets populated (owner runs it).
2. **Uptrace dashboard** for the §6 metrics.
3. **Six email alert rules A1–A6** at the §6 initial thresholds. ⚠️ **A2** (created ÷ logins > 60 %) is
   **armed from day 8 after go-live** — create it now, arm it later (see *Notes*).
4. **Drill:** force one alert and **watch the email arrive** (`0219` precedent). An alert that has
   never been seen to arrive does not count.

## Verification steps

1. **Metrics visible in Uptrace from the box** — proves the network path from the profile box to the
   telemetry VPS (design §8 Q5 — not assumed).
2. Switch off → an existing player logs in; an unknown identity gets `503 creation_paused`; a
   game-server resolve still creates (integration tests).
3. The cleanup query deletes **only** rows matching the junk definition (integration test with a mix of
   junk and real-looking rows).
4. `profile-checks.sh` fails the ping on a forced disk breach and a forced growth breach
   (`tests/profile-checks.sh`, part of `npm test`).
5. No ids or tokens in any metric attribute (test over the recorded attributes).
6. **An alert email actually arrives** in the owner's inbox (drill; worklog records date, rule, arrival
   — no addresses).
7. `npm test` (incl. shell harnesses) green; `npx tsc --noEmit`, `npm run lint`,
   `npm run check:config-parity` clean.

## Notes

- **Depends on:** [`0271`](../0271-profile-identity-s2-login-endpoint-and-session-token/brief.md) (S2 — the metrics hook into login)
- **Blocks:** [`0217`](../0217-profile-p2-wire-game-server-to-profile-box/brief.md) (XP go-live)
- **Can run in parallel with** `0272` (S3) and `0273` (S4).
- **Effort (design §9):** 2–2.5 days + owner UI time.
- 🚩 **Two post-go-live steps this slice cannot finish — flagged for the owner, not ruled:** arming A2
  on day 8 after go-live, and re-baselining A1–A6 after 14 days (Uptrace keeps ~14 days, `0263`; design
  §8 Q3 — loads per player). Recommendation: add both as dated items to `0217`'s post-go-live steps
  rather than a new task.
- 🔒 No secrets, DSNs, endpoints, hosts or email addresses in any artifact — variable names only.
- **Do not invoke the mover skills** — producer-only (ADR-033). No wiki writes.
