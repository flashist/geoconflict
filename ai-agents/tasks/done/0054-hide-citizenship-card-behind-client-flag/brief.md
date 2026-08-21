# Task — Hide Citizenship Card on Start Screen Behind a Client Config Flag (Default OFF)

## ID
0054

## Sprint
Sprint 4

## Priority
High — live production UX defect: a dead-end "couldn't connect" card is the top element of the start screen for every player. Ship immediately (owner-ruled 2026-08-21). *(Sprint 4's Status board is unranked; Priority cell reads `—`.)*

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder

## Context

The production start screen currently shows the Citizenship card at the top of the layout in its degraded state ("Гражданство / Не удалось подключиться — попробуйте позже" — the 0049 degraded-mode treatment). Owner screenshot evidence, 2026-08-21. Citizenship has not shipped (0017 earned / 0018 paid are still backlog) and the profile backend is not deployed, so the card is a dead-end surface for players.

**Why it is visible (verified in code):** the gate in `src/client/CitizenshipCard.ts` (`connectedCallback`, ~lines 51–78) is:

- `enabled = FlashistFacade.instance.isYandexDegraded() || (await isCitizenshipUiEnabled())`

The degraded-mode carve-out was added deliberately by task 0049 — when the Yandex SDK is unavailable the `citizenship_ui` experiment flag is unknowable, so the card shows its honest "couldn't connect" state instead of hiding. That was correct for a live citizenship feature; it is wrong while citizenship has not launched. Additionally `checkExperimentFlag()` in `src/client/flashist/FlashistFacade.ts` returns `true` unconditionally when `GAME_ENV === "dev"`.

**Owner rulings already made (2026-08-21) — do not re-ask:**
- **Mechanism:** a client config flag, **default OFF** — the card renders only when the flag is on. Relaunch at citizenship launch is a one-line flip. Rejected alternatives: hard-hide in code; show-only-when-backend-up.
- **Timing:** ship now, through the ship loop immediately.

**Where the flag lives:** the established client config home is the `flashistConstants` object in `src/client/flashist/FlashistFacade.ts` (see the `experiments` and `ads` blocks — `CITIZENSHIP_UI_FLAG_NAME` already lives there). Add the new local flag there. Do not invent a new config system, and do not confuse this local compile-time flag with the remote Yandex `citizenship_ui` experiment flag — the local flag is a new, separate, absolute gate.

## What to Build

1. **Add a local boolean client config flag, default `false`**, to `flashistConstants` in `src/client/flashist/FlashistFacade.ts` (e.g. a `features` block with a full descriptive name like `CITIZENSHIP_CARD_ENABLED` — naming per convention, no abbreviations).
2. **Gate `CitizenshipCard` on it, checked first and absolutely.** When the flag is OFF:
   - The card renders nothing and the host element collapses (reuse the existing `this.classList.add("hidden")` collapse path so the start-screen layout keeps its rhythm — no empty gap).
   - **No citizenship analytics fire** — `CITIZENSHIP_SURFACE_SEEN` must not be reported, and no profile load is attempted.
   - The flag-off state wins over **both** the degraded-mode carve-out and the `GAME_ENV === "dev"` experiment-flag override. Default OFF means hidden in dev too; developers working on 0017/0018 flip the constant locally.
3. **When the flag is ON: behavior is exactly today's** — experiment-flag gate, degraded carve-out, guest CTA, XP display all unchanged.
4. **Both HTML templates carry a static `<citizenship-card>` element** — `src/client/index.html` (line ~191) and `src/client/yandex-games_iframe.html` (line ~301, the template actually served in production). Because the component collapses itself at runtime, **no template edit is expected — but the coder must verify both templates render with the card fully absent and no layout gap**, per the two-templates rule.

**Out of scope:** any change to citizenship features themselves, the profile API, the degraded-mode treatment's logic, or the remote `citizenship_ui` experiment flag. `en.json` / `ru.json` untouched — no strings added or removed.

## Verification Steps

1. `npm run dev` with the flag at its default (OFF): start screen shows **no** citizenship card and **no layout gap** where it was — check both entry templates (standalone `index.html` and `yandex-games_iframe.html`).
2. With flag OFF, confirm no `CITIZENSHIP_SURFACE_SEEN` analytics event fires (console analytics log in dev).
3. Flip the flag ON locally: card appears and behaves exactly as before this change (dev override shows it populated).
4. Update `tests/client/CitizenshipCard.test.ts`: flag-off renders nothing and reports no seen-event; existing flag-on cases still pass.
5. `npm test` and `npm run lint` pass.

## Notes

- **Depends on:** nothing
- **Flip-ON coupling:** shipping **0017 (Citizenship Earned)** and/or **0018 (Citizenship Paid)** MUST include flipping this flag ON as part of the launch — that is the entire relaunch mechanism. This note is recorded here only; the 0017/0018 briefs were not edited by this scoping run (outside the task-brief skill's write surface) — producer follow-up to add the reciprocal note there.
- Interim work adjacent to the Sprint 4 citizenship goal: hides the citizenship UI until 0017/0018 ship.
- The 0049 degraded-mode treatment stays in the code untouched; it simply becomes reachable only once the flag is ON.
