# Remove Inert Upstream HTML Leftovers

## ID
0073

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

Hygiene item **H3** from the `0025` licensing asset audit (`ai-agents/knowledge-base/reports/s4-licensing-asset-audit-findings.md` §H3), owner-approved for briefing in the open-questions interview (2026-08-24). All dead code — "delete at leisure":

- Commented-out `og:url https://openfront.io` meta fragments in the HTML templates
- Commented-out googletag `page_url "http://openfront.io"`
- Commented-out Publift/Fuse CDN script
- Steam wishlist link (`WinModal.ts:277-289` — returns empty)

None of it executes; the cleanup removes stale upstream-brand strings from the shipped markup/source. The active remediation items from the same audit (V1 music, A1 favicon, JWT fallbacks) shipped separately as `0066` — this task is only the inert leftovers.

## What to build

Delete the four dead fragments listed above. Check **both** HTML templates (`src/client/index.html` and `src/client/yandex-games_iframe.html` — elements must stay in sync) plus `WinModal.ts`. Nothing else — this is a deletion-only change.

## Verification steps

1. Grep the templates and `src/client/` for `openfront.io`, `publift`/`fuse`, and the Steam fragment → the four H3 items are gone; any remaining upstream mentions are ones other records deliberately keep (see `0066`'s Notes ruling on the standalone footer).
2. Both templates diffed — same removals in each where the fragment existed in both.
3. Client builds and lints clean; game loads normally in local dev (no missing-element errors from the removed comments).

## Notes

- **Depends on:** nothing.
- **Blocks:** nothing.
- Do not touch the standalone template footer's upstream mentions — owner-ruled KEPT (2026-08-24, recorded in `0066`'s brief Notes).
