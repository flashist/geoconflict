# Worklog — 0238: verify the citizenship UI kill switch at launch

Recorded 2026-09-26 by a spawned `fkit-producer` with **no owner channel** (ADR-021, ADR-033 §5).
Every observation below is the **owner's own**, given live in the `fkit lead` session on 2026-09-26
and relayed verbatim by `fkit-lead`. This producer observed nothing itself.

---

## The run — production, 2026-09-26

**Build under test (item 1):** the **production** game, version **`0.0.154`**, image
**`20260926-143311`** (both as relayed from the owner). In the repo, `0.0.154` is the version bump
commit `5b3e6ec` (*"DEPLOY prod: bump version to 0.0.154"*), where `CITIZENSHIP_CARD_ENABLED` reads
`true` (go-live landed in `3386b90`, `0065` §6). ⚠️ The image-to-commit link is inferred from the
version number, not checked against the deployed image.
**Not a dev build:** the `GAME_ENV === "dev"` bypass in `checkExperimentFlag()` returns `true`
unconditionally, so on a dev build the surfaces could not have disappeared. They did — see below.

### Flip 1 — flag OFF

The owner set the Yandex console flag `citizenship_ui` to a value other than `enabled`, then
refreshed the page (a new page load). Owner, verbatim:

> *"I've changed the flag to false, refreshed the page and the UI is gone. It happened pretty much
> immediately."*

### Flip 2 — flag back ON

The owner set `citizenship_ui` back to `enabled`, then refreshed. Owner, verbatim:

> *"It's back on, the card and buy button are visible"*

---

## What each surface showed (item 2)

| Surface | Flag OFF | Flag ON |
|---|---|---|
| Citizenship card + buy button | **gone** (owner-observed) | **visible** (owner-observed) |
| ★ citizen badge | ⚠️ **UNVERIFIED** — not separately checked in the off state | not separately checked |
| Inbox | ⚠️ **UNVERIFIED** — not separately checked in the off state | not separately checked |
| Payments-reconciliation POST | ⚠️ **UNVERIFIED** — not observable from the UI; not checked | not checked |

## Flag name and value (item 1a)

**Confirmed in effect.** The card appears only when the flag reads exactly `enabled` under the name
`citizenship_ui`; it disappeared when the owner changed that console entry and came back when the
owner set it to `enabled` again. A wrong name or value would have left the card hidden in both
states. So the console entry the owner edited is the one the code reads.

## Propagation delay (item 3 — dropped by the 2026-09-21 ruling, recorded anyway)

**"Pretty much immediately"** after a page refresh — owner-observed, **not timed**. No number exists.

---

## Verdict (item 5)

✅ **The remote kill switch is PROVEN to work in production for the citizenship card and its buy
button:** turning `citizenship_ui` off hides them on the next page load, and turning it back to
`enabled` restores them, with near-immediate propagation (owner-observed, not timed).

## Caveats — stated, not softened

- **One session only** — the owner's own. Not checked on other accounts, devices or regions.
- **★ badge, inbox and the payments-reconciliation POST were not separately checked** in the off
  state. They share the same flag read in source (`0236` / `0291`), but **in production they are
  UNVERIFIED.**
- **Open tabs were not tested.** Flags are fetched once per page load and memoized by design, so a
  flip is expected **not** to reach a tab already open — a player must reload. This is expected
  behaviour, not a defect, but it was **not observed** either way.
- **The delay was not measured** — "pretty much immediately" is the owner's impression.
- **This switch hides UI only.** It does not stop the server crediting XP (unchanged — see the brief).

## Close

Closed 2026-09-26 on an **OWNER RULING** given live in the `fkit lead` session via
`AskUserQuestion` — Q *"Close task 0238 (kill-switch test) now?"* → **"Close it (Recommended)"** —
relayed by `fkit-lead` to a spawned `fkit-producer`. Marker:
`✅ Done (agent-closed — not owner-verified)` (ADR-033 §5).
