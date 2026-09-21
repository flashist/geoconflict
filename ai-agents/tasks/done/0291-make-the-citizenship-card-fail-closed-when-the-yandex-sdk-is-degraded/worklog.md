# Worklog — 0291: make the citizenship card fail CLOSED when the Yandex SDK is degraded

Built by `fkit-coder`, spawned as the **Build worker** of `fkit-sprint-ship-loop`, 2026-09-21.
Standing approval: the owner approved `plan.md` live in the `fkit lead` session (**D1** *"Approve —
build it"*), plus ruling **D2** (collapse the two degraded/flag-off tests to one).

Implemented the approved plan as written. No scope added, no scope dropped.

---

## What changed

### `src/client/CitizenshipCard.ts`

The degraded-mode carve-out in `connectedCallback` is gone. The gate was:

```ts
const enabled =
  FlashistFacade.instance.isYandexDegraded() ||
  (await FlashistFacade.instance.isCitizenshipUiEnabled());
```

and is now the single flag read:

```ts
const enabled = await FlashistFacade.instance.isCitizenshipUiEnabled();
```

The 4-line comment above it (*"show the honest 'couldn't connect' state instead of a silently
missing surface"*) described the carve-out and was deleted with it.

The layer-1 absolute gate comment lost the phrase **"this beats the degraded-mode carve-out and"** —
there is no longer a carve-out to beat. The gate itself is untouched: `CITIZENSHIP_CARD_ENABLED`
stays an early return, and stays `false`.

`renderGuest()`'s own `isYandexDegraded()` read is **untouched** — it only runs once the card has
already passed the gate and rendered, which is the flag-on + degraded path.

### `src/client/flashist/FlashistFacade.ts`

One doc-comment line on `citizenshipSurfacesSnapshot` was false after the change —
*"Note this is the OPPOSITE of the card's fail-OPEN carve-out in CitizenshipCard.ts; both are owner
rulings, each implemented where ruled."* Replaced with a line recording that all four surfaces now
fail closed and that the card's carve-out was withdrawn in `0291`. No code change in this file.

### `tests/client/CitizenshipCard.test.ts`

**D2 applied — one test, not two.** Rather than adding a new negative test alongside the old
fail-open one, the existing fail-open test was rewritten in place into the negative check. It lives
in the `citizenship_ui experiment flag` describe, where the old one was:

- was: `"shows the degraded card even when the flag cannot be read (degraded mode)"` — asserted
  `hidden === false` + the degraded subtitle.
- now: `"stays hidden in degraded mode, where the flag cannot be read (task 0291)"` — flag `false` +
  `isYandexDegraded` `true` ⇒ empty text, `hidden` class present, **no** `Citizenship:Seen`, **no**
  `loadProfile` call.

⚠️ **The collapse did not weaken the negative check.** It was run red before the source change and
green after — actual output in *Evidence* below.

One title-only rename: `"stays hidden when off even in degraded mode (beats the 0049 carve-out)"` →
`"stays hidden when off even in degraded mode"`. The parenthetical named a carve-out that no longer
exists. Its assertions are unchanged and it still passes.

**Deliberately left alone:**

- `"shows the degraded subtitle and no CTA when the Yandex SDK is degraded"` (in `guest state`) —
  flag on + degraded ⇒ card renders with the degraded subtitle. This is the *normal path unchanged*
  proof and the thing that keeps `guest_subtitle_degraded` a live key. Still green.
- `tests/client/FlashistFacade.test.ts` — no change needed, as the plan predicted. Its
  `isYandexDegraded` suite tests the predicate; its citizenship suite tests
  `isCitizenshipSurfacesEnabled` and the sync snapshot. Neither reads the card's gate. Ran it
  anyway: green.

### Localization — nothing to change, checked not assumed

`citizenship_card.guest_subtitle_degraded` is **not** orphaned: `renderGuest()` still reads it, on
flag-on + degraded. Present in both files and left as-is — `resources/lang/en.json:59`,
`resources/lang/ru.json:63`. No `en.json`/`ru.json` edit, so no sync obligation.

---

## Evidence

### The negative check, RED before the source change

`npm test -- tests/client/CitizenshipCard.test.ts -t "stays hidden in degraded mode"`, with the test
rewritten but `CitizenshipCard.ts` still carrying the carve-out:

```
  ● CitizenshipCard › citizenship_ui experiment flag › stays hidden in degraded mode, where the flag cannot be read (task 0291)

    expect(received).toBe(expected) // Object.is equality

    Expected: ""
    Received: "citizenship_card.title······················
                citizenship_card.guest_subtitle_degraded"

      215 |       const card = await appendCard({ visible: true });
      216 |
    > 217 |       expect(card.textContent!.trim()).toBe("");
          |                                        ^
      218 |       expect(card.classList.contains("hidden")).toBe(true);
      219 |       expect(logEventAnalytics).not.toHaveBeenCalled();
      220 |       expect(loadProfile).not.toHaveBeenCalled();

      at Object.toBe (tests/client/CitizenshipCard.test.ts:217:40)

Test Suites: 1 failed, 1 total
Tests:       1 failed, 57 skipped, 58 total
```

Red **for the right reason** — the card rendered the degraded guest state instead of hiding, which is
exactly the fail-open this task removes. Not a red from a typo or a missing mock.

### The negative check, GREEN after

Same command, after the three source/comment edits:

```
Test Suites: 1 passed, 1 total
Tests:       57 skipped, 1 passed, 58 total
Time:        0.394 s
```

### Both target suites

`npm test -- tests/client/CitizenshipCard.test.ts tests/client/FlashistFacade.test.ts`

```
PASS tests/client/CitizenshipCard.test.ts

Test Suites: 2 passed, 2 total
Tests:       81 passed, 81 total
Time:        0.569 s
```

(`FlashistFacade.test.ts` prints an expected `console.log` from its own SDK-init path; the suite
passes.)

### Typecheck, lint, format

```
npx tsc --noEmit            → exit 0, no output
npx eslint <the 3 files>    → exit 0
npx prettier --check <same> → All matched files use Prettier code style!
```

### Full gate — `npm test`

```
Test Suites: 138 passed, 138 total
Tests:       1870 passed, 1870 total
Snapshots:   0 total
Time:        59.713 s
```

All four shell harnesses really ran — **none skipped**, so Docker was up and the secret-boundary
harness was not silently passed over:

```
✓ docker secret boundary harness passes (scripts/test-check-docker-secret-boundary.sh) (3357 ms)
✓ profile deploy hardening harness passes (tests/scripts/profile-deploy-hardening.test.sh) (31681 ms)
✓ profile backup redeploy harness passes (tests/profile-backup-redeploy.sh) (1471 ms)
✓ profile operability checks harness passes (tests/profile-checks.sh) (14966 ms)
```

⚠️ **Side observation, not caused by this task:** `npm test` measured **59.7 s** wall, against
`CLAUDE.md`'s documented *~22–25 s (112 suites / 1182 tests → 113 / 1185)*. The tree is now 138
suites / 1870 tests, and `profile-deploy-hardening` alone took 31.7 s against its documented ~16 s.
The doc figure is stale by growth. **Not investigated and not in scope here** — flagging it so it is
not mistaken for a regression from this change. Nothing in this task touches a harness or a
`setup*.sh`.

---

## Not verified — stated plainly

- **No live/browser check.** The change is a gate expression covered by jsdom unit tests; the
  behaviour it removes (fail-open in degraded mode) is exercised only in a real Yandex frame. The
  owner's 2026-09-21 devtools probe on a signed-in production session (`isYandexDegraded: true`) is
  what makes this path real, and that evidence is **pre-existing, not re-run by me**. Confirming the
  card is absent in a real degraded production session is `0238`'s launch-gate work, not this task's.
- **No commit, no push.** Working tree only.

## Flagged, not touched

- `0238`'s brief records the card's fail-open as an accepted residual. That line is **now stale** —
  this task withdraws the fail-open. `0238` was fenced off in my spawn and the driver is routing it.
  I did not edit it.
- I did not touch `0291`'s `## Status`, its Sprint 4 row, `0286`, `0290`, or any `setup*.sh`.

## Decision log — fixes/calls made unattended

**`none`.** The plan was implemented exactly as approved under D1 + D2. No fix was applied outside
the approved plan, and no obvious-winner call was made. The one judgment inside the plan's own text
— the planner's *"or is deleted as a duplicate … I'll keep one, whichever reads better in place"* —
was settled by owner ruling **D2** (collapse to one) before this spawn, so it was executed, not
decided here.

---

# Review round 1 — processed 2026-09-21 by `fkit-coder`

Spawned by `fkit-sprint-ship-loop` as its **Process-review worker**, under the driver's
declared-approval marker (owner approved this plan live via `AskUserQuestion`, 2026-09-21, rulings
D1/D2). One finding, `R1`, already owner-ruled *fix the wording* before the spawn.

## What changed this round

### `tests/client/CitizenshipCard.test.ts` — title + comment only
- Title: `shows the degraded card even when the flag cannot be read (degraded mode)` had already been
  rewritten in the Build round to `stays hidden in degraded mode, where the flag cannot be read
  (task 0291)`; that title **carried the same false premise forward**. Now
  `stays hidden in degraded mode when the flag reads false (task 0291)`.
- Comment: replaced the 3-line body with a 6-line one naming the predicate and **both** degraded
  shapes — SDK never loaded (flag genuinely unreadable) and SDK loaded with `getPlayer()` failed
  (`getFlags()` works, so a false flag is a real switch-off) — then states the gate fails CLOSED
  either way.

⛔ **Nothing else moved.** The four assertions, both mocks, every other test, and all of `src/` are
untouched this round. No behaviour change.

## Why R1 was verified CORRECT, not taken on trust

`src/client/flashist/FlashistFacade.ts:1166-1171` — `return this.yaGamesAvailable &&
!this.yandexSdkPlayerObject;`. Nothing in that predicate requires the SDK object to be absent, so it
is satisfied in the SDK-present / `getPlayer()`-failed case where `getFlags()` runs normally. The old
wording's "cannot be read" is therefore false as a general claim. The owner's 2026-09-21 devtools
probe on a signed-in production session returned exactly that shape, so it is live, not theoretical.

## Evidence

- `npx jest tests/client/CitizenshipCard.test.ts tests/client/FlashistFacade.test.ts` →
  **2 suites passed, 81/81 tests passed**, 0.877 s. The driver measured **81/81 before** the edit;
  a comment change must not move that, and it did not.
- `npx prettier --check tests/client/CitizenshipCard.test.ts` → clean.
- Full `npm test` **not re-run this round.** Reason: this round changed a comment and a test title in
  one already-passing suite — zero executable change — and the Build round's full gate is recorded
  above. Stated so it is not read as a silent pass.

## Not verified — stated plainly

- **No live/browser check this round either**, and none possible for a comment. Unchanged from the
  Build round's note above.
- **No commit, no push.** Working tree only.
- I did not touch `0291`'s `## Status`, its Sprint 4 row, `0286`, `0238` (including its stale
  line 497 — owner ruled *leave it*), `0290`, any `setup*.sh`, or `CLAUDE.md`.

## Decision log — fixes/calls made unattended (review round 1)

| Fix | Finding it answers | What changed | Why it qualified |
|---|---|---|---|
| Test title + comment rewording | **R1** (low, documentation defect: the title/comment claimed degraded mode means the flag "cannot be read", false for the SDK-present / `getPlayer()`-failed shape) | `tests/client/CitizenshipCard.test.ts` — one title line and one comment block in the `citizenship_ui experiment flag` describe | Verified **CORRECT** against `FlashistFacade.ts:1166-1171` myself; **mechanical and localized** (comment + title text in one test, no executable line touched); **inside the approved plan**, whose test section owns this exact test — and the owner had already ruled *fix the wording* for this finding before the spawn |

**Obvious-winner calls: `none`.** The scope (title and comment only, assertions frozen) and the
disposition (fix, not accept) were both owner-ruled before this spawn; I chose the wording, which the
ruling directed, not the shape of the change.
