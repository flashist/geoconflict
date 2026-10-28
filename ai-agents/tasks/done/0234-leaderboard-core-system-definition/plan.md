# 0234 — approved scope for the Process-review step

Approved by the owner via AskUserQuestion in the fkit-lead session, 2026-10-28, during `/fkit-sprint-ship-loop` on Sprint 9.
0234 is an investigation (deliverable = a findings document), so no coder plan step ran; this file records the exact approved scope.

Question put to the owner (verbatim):
"OK for a coder to verify the 12 review findings and fix the 0234 doc (report file only, no source code)?"

Option the owner selected (verbatim):
"Yes, fix the doc (Recommended)" — description: "Coder checks each finding against the code, fixes what's correct in the findings doc, records why, returns any real judgment call to you."

Second question, same exchange (verbatim):
"Count AI lobby fillers in v1, knowing a 1-human unconfirmable match can then be worth up to 10?"
Owner selected (verbatim): "Include AI now" — description: "Lock it: AI fillers count. Matches what players see; a lone cheater can claim up to 10/match."

Approved scope:
- Run the fkit-process-stateful-review method over `review.md` R1–R12 (Round 1).
- Write only: `ai-agents/knowledge-base/reports/2026-10-28-0234-leaderboard-core-system-findings.md`, this folder's `review.md` (Coder response + Accepted residuals sections) and `worklog.md`.
- No source code, no brief status change, no implementation brief, no mover, no wiki write, no commit.
