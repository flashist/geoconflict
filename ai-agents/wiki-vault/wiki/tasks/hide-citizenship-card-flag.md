# Hide Citizenship Card Behind Client Flag

**Source**: `ai-agents/tasks/done/0054-hide-citizenship-card-behind-client-flag/brief.md` (plus `plan.md`, `worklog.md`, `review.md` in the same folder)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 4 / task 0054 / interim citizenship-launch gate

## Goal

Remove a live production UX defect: after the 0049 degraded-mode treatment shipped, the top element of every player's start screen was a dead-end citizenship card in its "Не удалось подключиться" state — citizenship has not launched (0017/0018 are backlog) and the profile backend integration is off in production, so the card could only disappoint. Owner ruling 2026-08-21: hide the whole card behind a **client config flag, default OFF**, and ship immediately. Relaunch at citizenship launch is a one-line flip. Rejected alternatives: hard-hide in code; show-only-when-backend-up.

## Key Changes

- New local boolean flag `flashistConstants.features.CITIZENSHIP_CARD_ENABLED` in `src/client/flashist/FlashistFacade.ts`, default `false`. This is a **local compile-time flag**, deliberately distinct from the remote Yandex `citizenship_ui` experiment flag.
- `src/client/CitizenshipCard.ts` checks the flag **first and absolutely**. Flag OFF: the card renders nothing, the host element collapses via the existing `hidden` class (no start-screen layout gap), no `CITIZENSHIP_SURFACE_SEEN` analytics fires, and no profile load is attempted. Flag-off wins over **both** the 0049 degraded-mode carve-out and the `GAME_ENV === "dev"` experiment-flag override — hidden in dev too; developers on 0017/0018 flip the constant locally.
- Flag ON: behavior is exactly the pre-0054 state — experiment gate, degraded carve-out, guest CTA, XP display all unchanged. The 0049 treatment stays in the code untouched, reachable only once the flag is ON.
- Both HTML templates (`src/client/index.html`, `src/client/yandex-games_iframe.html`) keep their static `<citizenship-card>` element; the component collapses itself at runtime, so no template edit was needed.
- Tests updated in `tests/client/CitizenshipCard.test.ts`: flag-off renders nothing and reports no seen-event.

## Outcome

The start screen no longer leads with a dead-end card. **Flip-ON coupling:** shipping **0017 (Citizenship Earned)** and/or **0018 (Citizenship Paid)** MUST include flipping this flag ON — that is the entire relaunch mechanism. The reciprocal note was added to the 0017/0018 briefs by producer follow-up (commit `e4f01e6`). Agent-closed 2026-08-21, not owner-verified.

## Related

- [[tasks/degraded-mode-ux-treatment]] — the 0049 state that made the card visible in production and is now gated behind this flag
- [[tasks/citizenship-xp-progress-ui]] — the live card content this flag hides until launch
- [[tasks/citizenship-card-guest-cta-no-sdk]] — earlier guest-state fix on the same card
- [[systems/flashist-init]] — home of `flashistConstants` and the platform-init gate the card sits behind
- [[decisions/sprint-4]] — the sprint that owns the citizenship track and the flip-ON launch coupling
- [[systems/analytics]] — flag-off suppresses all citizenship surface events until launch
