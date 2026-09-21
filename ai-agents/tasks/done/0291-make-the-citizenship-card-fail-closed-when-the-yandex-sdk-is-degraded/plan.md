# Plan — 0291: make the citizenship card fail CLOSED when the Yandex SDK is degraded

> **Written by `fkit-sprint-ship-loop` (the driver) at plan approval, 2026-09-21, BEFORE the Build
> spawn.** Copied from the planning worker's returned plan — not re-rendered, not summarised.
>
> ⚠️ **One declared transformation:** the worker's reply reached the driver with `&` escaped as `&amp;`
> in code. Un-escaped when writing this file. **No other change to the worker's text.**

## Owner decisions at this plan gate — 2026-09-21, live in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead`

⛔ **Not coder precedent — two rulings, one task.**

| # | Question put | Owner ruled |
|---|---|---|
| **D1** | Approve this plan? | **Approve — build it.** |
| **D2** | The planner's open question: keep both degraded/flag-off tests, or collapse to one? | **Collapse to one** — taking the planner's own recommendation. ⛔ This does **not** weaken the negative check: still red before the change, green after. |

⚠️ **Standing owner instruction on SCOPE AND CEREMONY, relayed into the plan step and repeated here.**
The owner's words on the parent effort, verbatim: *"Tbh, it looks like we are overfocused on the
enable/disable flags, while we only need it to quickly switch the feature on/off, it should be a
boolean thing, that's it."* ⛔ **It binds scope and ceremony only. It is NOT licence to skip
verification, skip the review, or soften a finding.**

---

## The approved plan, as returned by the planning worker

Read the code. Brief's description of the gate is accurate.

**Verified current state** (`src/client/CitizenshipCard.ts:105-107`, in `connectedCallback`):
```ts
const enabled =
  FlashistFacade.instance.isYandexDegraded() ||
  (await FlashistFacade.instance.isCitizenshipUiEnabled());
```
`CITIZENSHIP_CARD_ENABLED` is already an absolute early return at `:95`. The other three surfaces go
through `FlashistFacade.isCitizenshipSurfacesEnabled()` / its fail-closed sync snapshot
(`FlashistFacade.ts:951-978`) — confirmed fail-closed.

### The change (1 expression + 3 comments)
1. `CitizenshipCard.ts:105-107` → `const enabled = await FlashistFacade.instance.isCitizenshipUiEnabled();`
2. Delete the now-wrong 4-line comment above it (`:101-104`, "show the honest 'couldn't connect' state instead").
3. `CitizenshipCard.ts:93` — drop "this beats the degraded-mode carve-out" from the layer-1 comment (nothing left to beat).
4. `FlashistFacade.ts:977-978` — "Note this is the OPPOSITE of the card's fail-OPEN carve-out in CitizenshipCard.ts" is now false. Replace with a one-liner noting all four surfaces fail closed (`0291`).

### Tests (`tests/client/CitizenshipCard.test.ts`)
- **Negative check, new test** — in the `citizenship_ui experiment flag` describe: flag `false` +
  `isYandexDegraded` `true` ⇒ `hidden`, no `Citizenship:Seen`, no `loadProfile`. **Run it before the
  change → must be red** (today the card renders). That's the guard seen red.
- **Rewrite the one test asserting the fail-open** — `:207` *"shows the degraded card even when the
  flag cannot be read (degraded mode)"*. It will correctly fail; it becomes the fail-closed case (or is
  deleted as a duplicate of the new one — I'll keep one, whichever reads better in place).
- **Unchanged and must stay green** — `:252` *"shows the degraded subtitle and no CTA when the Yandex
  SDK is degraded"* (flag on + degraded ⇒ card renders, degraded subtitle). This is the "normal path
  unchanged" proof and keeps `guest_subtitle_degraded` live.
- `:155` *"beats the 0049 carve-out"* — still passes; rename its title only if the phrase reads stale.

### Answers to your checks
- **Localization: no key is orphaned.** `guest_subtitle_degraded` is used in `renderGuest()` (`:285`)
  and is still reachable on **flag-on + degraded**, which is exactly the path `:252` tests.
  `en.json:59` / `ru.json:63` stay as-is. Nothing to remove, nothing to sync.
- **Other `isYandexDegraded()` readers:** only one other, `CitizenshipCard.ts:243` in `renderGuest()`
  (degraded subtitle + hide dead login button). **Untouched** — it only runs once the card already renders.
- **`tests/client/FlashistFacade.test.ts`:** needs **no change**. Its `isYandexDegraded` suite
  (`:56-101`) tests the predicate itself; its citizenship suite (`:320-410`) tests
  `isCitizenshipSurfacesEnabled` / the snapshot. Neither touches the card's gate.

### Verify
`npm test -- tests/client/CitizenshipCard.test.ts tests/client/FlashistFacade.test.ts`, then full
`npm test` (~22-25 s, shell harnesses).

### Not doing
- `0238`'s brief line 497 records this fail-open as accepted — now stale. **Flagged, not edited** (you
  fenced `0238` off). Someone should strike it.
- No `flashistConstants` change; `CITIZENSHIP_CARD_ENABLED` stays `false`.

### Open question (one, low stakes)
Keep both degraded flag-off tests (new one + rewritten `:207`) or collapse to one? They'd assert nearly
the same thing. **Recommendation: collapse to one**, in the experiment-flag describe — proportionate,
per your standing instruction. I'll do that unless told otherwise; it doesn't change the negative check
(still red before, green after).

> ⇒ **RULED D2: collapse to one.**

---

## Context the driver carries into Build — not part of the planner's text

**Why this change exists.** The 2026-09-10 ruling that accepted the card's fail-open is **withdrawn**:
it was made while `CITIZENSHIP_CARD_ENABLED` was `false` and the carve-out was inert. Flipping layer 1
at launch would make it live behaviour.

**Accepted cost, already ruled:** degraded-SDK players lose the card entirely rather than seeing the
lock + *"couldn't connect"* state. That was the fail-open's original purpose.

**Live evidence it matters, not a theoretical edge case:** an owner-run devtools probe inside the
Yandex game frame, on a **signed-in** production session, 2026-09-21, returned `isYandexDegraded: true`.

⚠️ **Line numbers above were true at planning time on an actively-edited tree — re-derive by content**
(`ai-agents/knowledge-base/conventions/file-line-citations.md`).
