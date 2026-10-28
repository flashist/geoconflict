# Worklog — 0234

## 2026-10-28 — Process-review, round 1 (spawned `fkit-coder`)

Spawned by `fkit-lead` running `/fkit-sprint-ship-loop` on Sprint 9, role **Process-review**, under the
declared-approval marker (ADR-055). Approved scope: `plan.md` (blob `e1afce41…`, checked with `git hash-object`
before starting). Owner approval quoted in it: *"Yes, fix the doc (Recommended)"* and *"Include AI now"*,
AskUserQuestion, `fkit-lead` session, 2026-10-28.

Files written: the findings doc
(`ai-agents/knowledge-base/reports/2026-10-28-0234-leaderboard-core-system-findings.md`), `review.md` (Coder response
+ Accepted residuals only), this file. No source code, no brief change, no mover, no wiki write, no commit.

Each finding was verified against the code before any edit (`review.md` § Coder response gives the `file:line`).
All 12 verified `CORRECT`; none disproven.

## Decision log

Every fix below was applied **without a per-fix owner ask**, under the standing approval above. Each qualified as
verified `CORRECT` + mechanical/localized (doc wording only) + inside the approved scope ("fixes what's correct in the
findings doc"), unless marked **obvious-winner**.

| Finding | What changed (findings doc) | Why it qualified |
|---|---|---|
| R1 | **Obvious-winner call.** "majority" → "at least half — not a strict majority" in § 0, § 3.2 Winner row, § 4.3 B2 row, § 10 design note; B2 "Protects" now excludes 2-IP / half-held matches; new `witness_half` tag (§ 4.5 "Weakly witnessed", § 7 columns, runbook, `rank_results` labels). | Verified `GameServer.ts:1454`. Of the reviewer's two fixes, "class half-held matches as weakly witnessed" is true under **either** threshold, so it decides nothing and only makes an owner-required analytics class countable; the B2 row already named "≥ half the IPs" as open, so it widens no owner-seen residual. The threshold itself (≥ half vs > half) is a design choice with trade-offs → **not applied**; left open in § 12 and returned to the lead as NEEDS-DECISION. |
| R2 | § 1.5 note: bots/nations are on the default list ("Players Only" off by default); § 1.5a reasons 2–3 corrected, S5 note on #k vs rank-value place; § 3.1. | Verified `Leaderboard.ts:64, 94, 96-101, 125`. Factual correction; v1 choice unchanged. |
| R3 | § 0, § 4.3 B2: witnesses report deaths of every counted player (human or `AiPlayer`); § 3.1 stale "excludes them" removed. | Verified `GameRunner.ts:70-77, 149-154`. Aligns stale text with the doc's own § 1.5a / § 10. |
| R4 | (a) § 4.2 limited to witnessed matches, pointing at the § 4.5 exception. (b), (c) **not decided**: named as open in § 4.3, § 4.5, § 7, and listed in § 12 items 2–3 for the S0 ADR. | (a) mechanical contradiction fix. (b)/(c) are design choices → routed, not made (part of the NEEDS-DECISION). |
| R5 | § 4.5 private-lobby self-play farm bullet; § 13 step 3; `lobby_type` on the § 7 result row, runbook, `rank_results` and `composition` labels. No cap added. Residual recorded in `review.md`. | Verified `GameServer.ts:298-308, 312-328, 698, 1065-1091`. Lead's instruction + owner's "no cap" ruling: state the farm and its analytics gap, add no cap. Not verified end to end (no match run) — said so in the doc. |
| R6 | "~11" → "10" (§ 0, § 1.5a, § 4.5, § 13 step 3); config citation → `GameServer.ts:719-744`, `DefaultConfig.ts:251-263` (`enabled: false`), `ProdConfig.ts:12-17`. | Verified the AI-fill arithmetic. Number + citation fix. |
| R7 | § 1.5a formula: spawned humans (server-observed) + rostered `AiPlayer`s (spawn not server-visible); § 4.1, § 4.2, § 12. | Verified `GameServer.ts:666-669, 880-888`, `GameRunner.ts:149-154`. Wording fix. |
| R8 | § 10: S2 and S3 "deploy as one unit"; brief-writing note; § 13 step 5. | Contradiction fix; carries the existing "S3 ships with S2" intent. |
| R9 | § 1.6 Ties: the three points the S0 ADR must pin; § 12 pointer. No default picked. | Mechanical: names what is unspecified, decides nothing. |
| R10 | § 8.1 "Query cost — why the projection", labelled coder reasoning, not measured; § 13 steps 2 and 6 re-cited. | The round-1 write-up is unrecoverable (untracked file). Rationale derived from the doc's own design (§ 8.1) and labelled as such. |
| R11 | § 1.6 citation → `Leaderboard.ts:125` + `PlayerImpl.ts:342-344`. | Verified. Citation fix. |
| R12 | § 1.5a retitled "DECIDED (owner)" with the verbatim question, pick, date and channel; header banner, provenance line, § 0, § 1.1, § 1.5, § 8.3, § 9, § 11 aligned; residual recorded in `review.md`. | Owner ruling *"Include AI now"* carried in the marker; recording it is mechanical. |

Obvious-winner calls: **R1** (above) — the only one.

### Follow-up, same day — two owner rulings relayed by `fkit-lead` (same scope, `plan.md` blob `e1afce41…`)

Owner, typed in reply to `AskUserQuestion`, `fkit-lead` session, 2026-10-28 (verbatim in the findings doc).

| Ruling | What changed (findings doc) | Why it qualified |
|---|---|---|
| Vote rule: *"I chose option 1 "Decide in S0 ADR (Recommended)""* | § 12: ruling quoted under "Vote-design choices open for the S0 ADR". No other change. | Recording an owner ruling; the relay said "no other change". |
| Rank population = the "Players only" filter's set | § 1.5a: new "Then defined by the 'Players only' filter → DECIDED (owner)" block with the quote; states it equals humans + `AiPlayer` and agrees with "Include AI now"; who-counts (filter) vs how-many (spawned, incl. eliminated) distinction. | Verified `Leaderboard.ts:96-101` (`Human` or `AiPlayer`), `:205-212`, `:125`. Same set as the earlier ruling → no gap, so no NEEDS-DECISION (per the relay's instruction). |
| R2 S5 note | § 1.5a reason 2 rewritten: "Players only" position = rank place at match end (territory sort) and at elimination; differs by redraw/vote lag (`:75-77`, ≤ ~0.67 s, order unchanged), gold/troops re-sort (`:80-114`), and ties (arbitrary list order vs shared value). | Fact check the relay asked for; wording only. |

Obvious-winner calls in this follow-up: **none**.

### Round 2 — R13–R15 + owner death-order ruling (same scope, `plan.md` blob `e1afce41…`, re-checked)

Approval relayed by `fkit-lead`: *"Yes, fix and close (Recommended)"* and *"Yes, death order (Recommended)"*,
AskUserQuestion, `fkit-lead` session, 2026-10-28.

| Finding | What changed (findings doc) | Why it qualified |
|---|---|---|
| R13 | § 1.5a Note for S5: "Elimination — they differ" (territory rank before death vs death-order place); the S5 promise limited to match end + "Players only" ticked + territory sort. § 1.6: death order → DECIDED (owner) with question, pick, description, date, channel; no longer an S0 item. | Verified `Leaderboard.ts:117-118, 125`, `AttackExecution.ts:343-345`. Corrects the coder's own wrong follow-up claim; records an owner ruling. Wording only. |
| R14 | § 4.5 `witness_half` conditional on the S0 threshold, computed from the final confirmation count; § 7 row, runbook, metric labels, § 12 item 1 aligned. | Verified `GameServer.ts:1454-1459` (first-pass fix). Makes the label match the open S0 choice; picks no threshold. |
| R15 | § 13 step 2 attribution: architect for store/costs, coder reasoning for query cost. | Mechanical; matches § 8.1's own label. |
| (relay) | § 11 round-2 history line. | Asked for by the relay. |

Header `Status:` set to `closed-out`: R1–R15 all dispositioned `✅ done`; nothing blocking (the three vote-design
choices are open for S0 **by owner ruling**, not a blocker). Obvious-winner calls in round 2: **none**.
