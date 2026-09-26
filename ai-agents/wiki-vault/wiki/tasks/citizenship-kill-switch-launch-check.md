# Verify the Citizenship UI Kill Switch at Launch

**Source**: `ai-agents/tasks/done/0238-validate-citizenship-ui-kill-switch-in-a-real-build-launch-gate/brief.md` (plus `worklog.md` in the same folder)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 5 (Backlog → Sprint 4 on 2026-09-10 → Sprint 5 on 2026-09-22) · task `0238` · citizenship launch safety

> ✅ **THE REMOTE KILL SWITCH IS PROVEN IN PRODUCTION — for the citizenship card and its buy button,
> in one owner session, 2026-09-26.** Turning the Yandex console flag `citizenship_ui` off hid them on
> the next page load; setting it back to `enabled` restored them. Owner, verbatim: *"I've changed the
> flag to false, refreshed the page and the UI is gone. It happened pretty much immediately."* and
> *"It's back on, the card and buy button are visible"*.
>
> Closed 2026-09-26 on the owner ruling *"Close task 0238 (kill-switch test) now?"* → **"Close it
> (Recommended)"**, recorded by a spawned `fkit-producer` with no owner channel ⇒
> **`(agent-closed — not owner-verified)`** (ADR-021, ADR-033 §5). Every observation is the owner's own.
>
> ⛔ **The ★ badge, the inbox and the payments-reconciliation POST were NOT separately checked** in the
> off state. They read the same flag in source ([[tasks/citizenship-kill-switch-coverage]],
> [[tasks/citizenship-card-fail-closed-degraded-sdk]]), but **in production they are UNVERIFIED.**

## Goal

The citizenship surfaces sit behind two layers: the compile-time `CITIZENSHIP_CARD_ENABLED` (see
[[tasks/hide-citizenship-card-flag]]) and the **remote** Yandex experiment flag `citizenship_ui`. The
remote half is the one that can be switched **without a deploy** — this task proves it works in a real
production build.

**How the task was reshaped — three owner rulings, none producer precedent:**

| Date | Ruling | Effect |
|---|---|---|
| 2026-09-10 | promoted from the Backlog board to Sprint 4 as a **launch gate** | *"must be closed before the flag is flipped"* |
| 2026-09-21 | *"it looks like we are overfocused on the enable/disable flags … it should be a boolean thing, that's it"* | **the gate is dropped**; verify **at** launch — flip it off, watch the surfaces go. No three-way split, no more probes. The one source change it had found split out as [[tasks/citizenship-card-fail-closed-degraded-sdk]] (`0291`). |
| 2026-09-22 | *"Let's skip this type of chekups, I will take care of them after deploy. The only thing we should care about is to make sure the feature is switcheable"* | moved to Sprint 5 with three other checkups (*"Move all four"*); the switchability property recorded as a **source-verified** finding |

**What the switch covers, in one sentence (the brief's own):** the flag hides four client surfaces — the
citizenship card, the ★ citizen badge, the inbox, and the payments-reconciliation POST — **and does NOT
stop the server crediting XP.** ⛔ It is therefore **not** a legal or moderation takedown mechanism; for
the owner's ruled scope (*hide a broken UI*) it is adequate.

## Key Changes

No source was written by this task. What it established:

- **Switchability, verified in source 2026-09-22 (production builds only):** flag absent, set to a wrong
  value (strict `===`, no trimming or case-folding), SDK never loaded, `getFlags()` throwing or timing out,
  or the sync snapshot not yet resolved ⇒ every citizenship surface is **off**. All four consumers read one
  of two shared helpers in `src/client/flashist/FlashistFacade.ts` (`isCitizenshipSurfacesEnabled()` /
  `isCitizenshipSurfacesEnabledSync()`), except the card, which combines the two layers itself — identical
  behaviour today, but a second place a future change must reach.
- 🚨 **It cannot be tested locally.** `checkExperimentFlag()` returns `true` unconditionally when
  `GAME_ENV === "dev"`, and webpack sets that for **every** non-production build (including
  `dev:staging` / `dev:prod`). A local "the card appeared" proves nothing about the remote switch — the
  *vacuous-pass trap* that made the brief be amended on 2026-09-20.
- **The 2026-09-21 devtools probe** on the live bundle confirmed it was a genuine production build (the
  dev bypass did not fire). **Flag delivery was not established** on that degraded session — recorded as
  inconclusive, never as broken.

## Outcome

**The run, 2026-09-26, production release `0.0.154`** (in the repo, the version bump `5b3e6ec` on top of
the flip `3386b90` — ⚠️ the image-to-commit link is inferred from the version number, not checked against
the deployed image). Not a dev build: on a dev build the surfaces could not have disappeared.

| Surface | Flag off | Flag on |
|---|---|---|
| Citizenship card + buy button | **gone** | **visible** |
| ★ citizen badge | ⚠️ unverified | not separately checked |
| Inbox | ⚠️ unverified | not separately checked |
| Payments-reconciliation POST | ⚠️ unverified (not visible from the UI) | not checked |

- ✅ **Flag name and value confirmed in effect.** The card appears only when the flag reads exactly
  `enabled` under the name `citizenship_ui`; a wrong console name or value would have left it hidden in
  both states. This closes the long-flagged residual from [[tasks/yandex-catalog-registration]] that the
  console entry had never been checked against the code.
- **Propagation:** *"pretty much immediately"* after a refresh — the owner's impression, **not timed**.

🚩 **Caveats, stated not softened:**
- **One session only** — the owner's. Not other accounts, devices or regions.
- **Open tabs were not tested.** Flags are fetched once per page load and memoized, so a flip is
  expected **not** to reach an already-open tab — a player must reload. Expected behaviour, but not
  observed either way.
- **The switch hides UI only** — it does not stop server-side XP crediting.

## Related

- [[tasks/citizenship-go-live]] — `0065`, the go-live whose close condition included this task
- [[tasks/citizenship-kill-switch-coverage]] — `0236`, which routed the ungated surfaces through the shared helper
- [[tasks/citizenship-card-fail-closed-degraded-sdk]] — `0291`, the card fail-closed change split out of this task
- [[tasks/hide-citizenship-card-flag]] — `0054`, the compile-time layer
- [[tasks/yandex-catalog-registration]] — `0014`, where the console flag was set and its name/value flagged unverified
- [[tasks/feedback-telegram-delivery-failure]] — `0061`, moved to Sprint 5 on the same *"Move all four"* ruling
- [[systems/flashist-init]] — the experiment-flag fetch and the dev bypass
- [[decisions/sprint-5]] — the launch sprint it closed on
- [[decisions/sprint-4]] — the board that carried it as a launch gate until 2026-09-22
- [[systems/weekend-deploy-window]] — the same day's deploy window, and the appended second game deploy (`0.0.154`)
