# Sprint 5 — Full F2P Loop & Social Features

**Date**: planned (after Sprint 4 ships and retention metrics are positive)
**Status**: proposed

## Context

Goal: long-term engagement and monetization systems. Only start once retention metrics from Sprints 1–3 are moving positively.

Source: `ai-agents/sprints/plan-sprint-5.md`

## Planned Work

| Task | Effort | A/B? | Description |
|---|---|---|---|
| 10 — Leaderboard rewards | 3–5 days | ✅ Test | Top-10 badges, collectible monthly top-3 badges kept permanently |
| 8a — Nickname styling | 1–2 weeks | ✅ Test | Background color, border, text color — upsell for nickname buyers |
| 11 — Coin economy | 3–4 weeks | ❌ All users | Post-match coin rewards, rewarded ads (double coins), spend on cosmetics |
| 12 — Clans | 3–4 weeks | ✅ Test | Free clan tag + auto-team placement; paid: banner, stats, match history |
| 14 — Map voting | 1–2 weeks | ✅ Test | Verified players vote during random maps; random↔voted alternation |
| 13 — Replay access | 3–5 days | ❌ All users | Free: last 3 matches; premium: last 20+, shareable links |
| 15 — Custom flags/patterns | 2–3 weeks | ❌ All users | Paid citizens only; moderation required before match appearance |

## Key Decisions

**Coin economy constraints:** leaderboard badges and verified nicknames must NOT be purchasable with coins — earned/purchased achievements must stay distinct from the coin economy.

**Clan gate:** only build when analytics shows lobbies consistently filling. Auto-team placement only works if clan members can find each other in matches.

**Map voting mechanics:**
- Pattern: random → voted → random → voted (repeating)
- Voting opens during the preceding map
- Tiebreaker: random among all tied maps (even zero-vote case is a tie resolved randomly)
- Cooldown: recently played maps excluded from vote pool (developer to propose N)
- Non-verified players can see voting panel but cannot vote

**Custom uploads (Task 15):** V1 flags only (simpler than patterns). Manual review for V1. Uploaded images do not appear until approved. Refund policy required before launch.

**8a (Nickname styling) dependency:** requires centralized name rendering component from Task 8 (Sprint 4). All badge/icon display goes through that component — no ad-hoc solutions.

## Consequences

- Tasks 13 and 15 depend on Task 11 tier/pricing system
- Tasks 8a and 14 depend on Task 8 (Sprint 4) citizenship/verification infrastructure
- Rewarded ads (deferred from Sprint 4) ship as part of Task 11 coin economy

## Related

- [[decisions/product-strategy]] — sprint ordering
- [[decisions/sprint-4]] — previous sprint, provides citizenship infrastructure this sprint builds on
