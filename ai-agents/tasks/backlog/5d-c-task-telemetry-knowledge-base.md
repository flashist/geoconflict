# Task 5d-C — Telemetry Knowledge Base Document

## Priority
Sprint 3. Begins after Task 5d-B is fully closed — specifically after error tracking is confirmed working (C1) and the slow turn threshold has been calibrated after the first week of data (C3).

## Context

The analytics event reference (`analytics-event-reference.md`) documents what GameAnalytics receives — player behaviour events for product decisions and funnel analysis. There is no equivalent document for Uptrace. Anyone debugging a production incident currently has to reconstruct from scratch what data is available, what metric and span names to look for, and how to interpret what they're seeing.

This task produces that companion document — a stable reference that covers everything flowing into Uptrace and how to use it for the two main workflows: investigating lag and investigating errors.

## Prerequisite Checklist

Before starting this task, confirm all of the following are true:

- [ ] 5d-A system metrics confirmed flowing in Uptrace with correct names and `worker.id` attributes
- [ ] 5d-B slow turn spans confirmed working end-to-end (artificial delay test passed)
- [ ] 5d-B error tracking confirmed — unhandled exceptions appear in Uptrace with stack traces
- [ ] Slow turn threshold value finalised after first week of production data
- [ ] Client-side error tracking status known — either confirmed working or explicitly noted as not yet implemented

If any of the above are incomplete, do not start writing — the document should reflect confirmed reality, not planned state.

---

## What the Document Should Cover

### 1. Overview

A short section explaining what Uptrace is used for in Geoconflict and what it is NOT used for:

- **Is:** server observability — lag investigation, error debugging, resource monitoring, incident correlation
- **Is not:** player behaviour analytics (that is GameAnalytics), cross-session funnels, cohort analysis, A/B test evaluation

Also note: Uptrace receives **production data only**. The dev server has `OTEL_EXPORTER_OTLP_ENDPOINT` absent and sends nothing.

---

### 2. What Flows to Uptrace

A clear table or section per data type:

**Server logs** — via Winston OTEL transport. List the key log events from the match logging investigation with the data each carries:

| Event | Source | Key data |
|---|---|---|
| Client (re)joins | `GameServer.ts:172` | `gameID`, `clientID`, `persistentID` |
| Game start sent | `GameServer.ts:466` | `clientID`, `persistentID` |
| Game ends | `GameServer.ts:717` | `gameID`, `turns.length` |
| Game archived | `GameServer.ts:911` | `gameID`, winner |
| Client disconnects | `GameServer.ts:365` | `clientID`, `persistentID` |
| Max duration exceeded | `GameServer.ts:777` | `gameID` |
| Winner determined | `GameServer.ts:1083` | `gameID`, winner, vote counts |

**System metrics** — from 5d-A. Document confirmed metric names, units, sampling interval, and `worker.id` attribute. Use the actual names as they appear in Uptrace after 5d-A ships — do not copy from the brief, verify against the live dashboard.

**Slow turn spans** — from 5d-B. Document the span structure, all attributes, and the threshold value as calibrated.

**Error tracking** — document what is captured, what attributes are attached, and whether client-side errors are included or server-side only.

---

### 3. How to Use It — Key Workflows

This is the most important section. Two primary workflows:

**Workflow A — Investigating a lag spike**

Step-by-step: how to find slow turn spans in Uptrace, how to read the child span breakdown, how to correlate with system metrics at the same timestamp, and how to interpret common patterns. Reference the correlation table from the 5d-B brief — reproduce it here so the reader doesn't need to find the brief.

**Workflow B — Investigating an error**

Step-by-step: how to find an error in Uptrace by approximate time or by gameID, how to read the stack trace, how to identify the build version from the span attributes, how to find related log events for the same match around the same time.

**Workflow C — Looking up a specific match**

Given a gameID (e.g. from a player feedback submission), how to find all Uptrace log entries for that match — join events, end event, any errors during the match.

---

### 4. What Uptrace Cannot Answer

Explicit list to prevent wasted time during incidents:

- Player intent sequences — stored in the turn archive only, not emitted to Uptrace
- Ghost player counts per match — no aggregated count exists; only raw `mark_disconnected` intents in the archive
- Tick-by-tick game state — not stored anywhere
- Cross-session player behaviour — use GameAnalytics
- Tutorial funnel analysis — use GameAnalytics
- Win condition evaluation detail — only the final result is logged

---

### 5. Retention & Data Availability

- Spans (slow turns, errors): 90-day retention in ClickHouse
- Metrics: 90-day retention
- Logs: document the actual retention configured in `uptrace.yml`
- Historical data before 5d-A/5d-B shipped: not available — note the approximate date when each data type started flowing

---

## Output

A single markdown file named `uptrace-knowledge-base.md` saved to the outputs directory alongside `analytics-event-reference.md`.

The document should be written for a reader who knows the game and the codebase but has not used Uptrace before. Avoid assumed knowledge of OTEL internals — explain what a span is if it's used, keep the focus on practical workflows.

## Notes

- **Verify against the live dashboard, not the briefs.** Metric names, span attribute names, and threshold values should be confirmed in Uptrace before being written into the document. Briefs describe intended state; the knowledge base documents actual state.
- **This document will need updating** when new instrumentation is added (e.g. if ghost player counts are eventually added as a metric, or if client-side error tracking is extended). Treat it as a living document — add a "last updated" date and a brief changelog at the top.
- **Cross-reference with analytics-event-reference.md** where relevant — e.g. the "what Uptrace cannot answer" section should note that those questions belong in GameAnalytics and point to the event reference.
