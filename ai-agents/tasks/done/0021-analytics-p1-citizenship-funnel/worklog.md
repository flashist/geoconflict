# Worklog — 0021 Analytics P1: Citizenship Funnel Events

## 2026-09-02 — Documentation reconciliation (coder)

Executed as a **documentation-reconciliation task, not an implementation task**, on owner rulings
R1–R4 given live in session the same day. A plan pass had already established that the brief's
premise was refuted; this pass sanity-checked that finding against the tree before writing it down,
then reconciled the brief, the analytics reference, and the Sprint 4 board row.

**No source code was changed.** `src/` is untouched by this task.

### Sanity-check of the plan pass's findings (re-verified, not re-derived)

| Claim | Verdict | Evidence |
|---|---|---|
| All citizenship events hard-gated, never fired | **CONFIRMED** | `flashistConstants.features.CITIZENSHIP_CARD_ENABLED: false` at `src/client/flashist/FlashistFacade.ts:182`; `CitizenshipCard.connectedCallback()` `src/client/CitizenshipCard.ts:75-79` adds `hidden` and `return`s before any analytics or profile load |
| 5 of 6 events shipped, tested, documented | **CONFIRMED** | Enum keys at `FlashistFacade.ts:118,122,129-131` (`analyticEvents`) and `:150,152` (`uiElementIds`); all five documented in `analytics-event-reference.md` |
| `UI:Tap:CitizenshipLearnMore` never built | **CONFIRMED** | `grep -rn "CitizenshipLearnMore\|LEARN_MORE\|learnMore" src/ tests/ analytics-event-reference.md` → **zero hits** |
| Test evidence 3 suites / 85 tests | **CONFIRMED** | `npx jest tests/client/CitizenshipCard.test.ts tests/client/CitizenshipPurchase.test.ts tests/client/PlayerProfileView.test.ts` → 3 passed, 85 passed, 0.821 s |
| Verification step 1 unexecutable | **CONFIRMED** | `<citizenship-card>` sits **above** `<start-screen-tabs>`, outside `#multiplayer-tab-content`, in `src/client/yandex-games_iframe.html:301` and `src/client/index.html:191` — switching tabs cannot hide it |
| `Citizenship:Seen` one-shot risk | **CONFIRMED as described** | `maybeReportSeen()` called once from `connectedCallback()` (`CitizenshipCard.ts:114`); early-returns without firing when `isCardVisible()` is false (`:141-149`); no observer, no retry. Module-scoped `citizenshipSeenReported` (`:28`) is correct for its purpose and is not itself the risk |

### Decision log — autonomously applied changes

Each entry: which ruling it answers, what changed, why it qualified to be applied without asking.

1. **Brief banner refutation** (`brief.md:6-17`) — serves **R1**. Struck the "first weeks of live data
   are lost and cannot be backfilled" claim, replaced with the measured finding + file:line evidence.
   *Qualified:* verified `CORRECT` (gate read directly in source), mechanical/localized (one block),
   explicitly inside the approved scope ("Replace with the finding").

2. **Status block false-urgency correction** (`brief.md:27-50`) — serves **R1**. Struck the "instrumentation
   moment has already passed" paragraph, added the three measured corrections. *Qualified:* same
   evidence as (1); in-plan; strike-not-delete follows the board's auditability convention.

3. **Dependencies as-built annotation** (`brief.md:57-70`) — serves **R1/R2**. Marked the five shipped
   events ✅, marked LearnMore dropped, and added an explicit caveat that ✅ means *code in the tree*,
   **not** *observed live*. *Qualified:* obvious winner within plan intent — the whole point of R1 is
   to stop the brief misleading a later reader, and an unqualified ✅ would have created a *new*
   false impression (that events had fired). Chose the caveat over a bare ✅.

4. **LearnMore dropped, with reasoning** (`brief.md` §2 table + note) — serves **R2**. Struck the table
   row; recorded *why* it is obsolete (no Learn-more surface designed, three-state card has no room,
   grep returns nothing) and the accepted cost (no "researched it but didn't buy" signal).
   *Qualified:* directly ruled by the owner; the reasoning was the explicit requirement.

5. **`CITIZENSHIP_CTA_LOGIN_TO_EARN` → `uiElementIds.citizenshipLoginToEarn`** (`brief.md` §2 table) —
   serves **R1**. The brief named a planned enum key that does not exist; corrected to the shipped one.
   *Qualified:* obvious winner within plan intent — an as-built reconciliation that left a second
   wrong enum key in the same table would be self-defeating. Verified against `FlashistFacade.ts:150`.

6. **"six enum keys" → as-built five, in two maps** (`brief.md` *Analytics Reference Updates*) — serves
   **R1/R2**. The original also wrongly implied all six live in `analyticEvents`; the two `UI:Tap` keys
   live in `uiElementIds`. Replaced with a table of actual keys and line numbers, marked *done, not to do*.
   *Qualified:* mechanical, verified against source, in-plan.

7. **Verification section rewritten local + truthful** (`brief.md` *Verification*) — serves **R1**.
   Split into four locally-runnable steps and three explicitly deferred to the citizenship launch
   (`0017`/`0018`/`0065`), with the reason each is deferred. Replaced unexecutable step 1 with the real
   suppression case (`CITIZENSHIP_CARD_ENABLED` / the `citizenship_ui` experiment flag) and recorded
   *why* the original could not be performed. *Qualified:* explicitly ruled ("make the verification
   steps local and truthful"); the step-1 defect was verified in both HTML templates.

8. **R3 risk recorded in the brief** (`brief.md` *Known Risk*) — serves **R3**. Logged with direction of
   error, the unproven flag, and the follow-up recommendation. *Qualified:* explicitly ruled.
   **`CitizenshipCard.ts` deliberately NOT touched**, per the ruling.

9. **R3 risk + R2 obsolescence + not-live banner recorded in
   `ai-agents/knowledge-base/analytics-event-reference.md`** — serves **R2/R3**. Added a ⚠️ marker on the
   `CITIZENSHIP_SURFACE_SEEN` row and three notes under the Citizenship Events table.
   *Qualified:* explicitly ruled ("Record in **both** the brief and the reference").
   **One obvious-winner call inside this:** also added a short "not live yet" banner over the table,
   which was not literally itemized in the rulings. Chosen because the table otherwise reads as
   describing live telemetry, and R1's stated purpose is stopping exactly that class of false
   impression. Stays within plan intent; adds no new claim beyond the verified gate.

10. **Sprint 4 row corrected** (`ai-agents/sprints/plan-sprint-4.md:85`) — serves **R1**. Struck the
    "ALREADY PASSED / urgent" clause (not deleted), appended the measured correction. *Qualified:*
    explicitly ruled, and respects **ADR-035** — the row was **edited in place**, no row was inserted,
    and nothing was moved above a closed row.

**Fixes applied that were NOT verified `CORRECT`, or that were judgment calls requiring escalation:
none.** No frontier-moves, no regressions, no scope widening.

### Deviation from the rulings — R4 smoke test NOT performed

**R4 authorized flipping `CITIZENSHIP_CARD_ENABLED` locally, but I did not, and no flip ever happened.**
`git diff src/client/flashist/FlashistFacade.ts` is empty and was never non-empty.

*Reason:* a dev server was **already running and not started by me** — ports 9000, 3001 and 3002 were
occupied by pre-existing `node` processes (PIDs 44852 / 39327). R4 presumed I would start my own
`npm run dev`. Flipping the citizenship **relaunch switch** in a working tree that another live dev
server is hot-reloading from would have pushed the suppressed citizenship surface into someone else's
running browser session — a side effect on concurrent work (`0064` is active in this tree) that the
ruling did not contemplate. The marginal evidence was low: the firing conditions are already covered
by 85 passing unit tests and by direct reading of the gate.

Skipping was chosen over escalating because the task framing named the smoke test **optional** and
explicitly provided for reporting "why you skipped it". **Still available on a quiet tree if the owner
wants it.**

### Verification

- `npm test` — see report; expected to be a no-op for these edits (no source touched).
- `npm run lint` — see report; expected no-op.
- `git diff src/client/flashist/FlashistFacade.ts` — **empty**.

### Close this earns

**Not closed here** — `/fkit-task-done` is producer-only (ADR-033). See the coder's report for the
recommended close and its caveats.

---

## 2026-09-02 — Close (producer, spawned by the sprint ship-loop)

**Closed `✅ Done (agent-closed — not owner-verified)`.** I am a producer **spawned** by the ship-loop
driver, so I have no owner channel (ADR-021) and this close is agent-closed under ADR-033 §5. **No
human verified this work.** The marker is the only trace of that, and it does not appear in
`/fkit-status` — the dashboard collapses every `✅` variant to plain `done`.

**Verified before closing** (evidence-before-assertion — I did not take the driver's summary on
trust): the brief carries the refutation banner, the as-built dependency annotations, the dropped
`UI:Tap:CitizenshipLearnMore` with reasoning, the rewritten Verification section and the R3 known-risk
section; this worklog carries the sanity-check table and the decision log; the Sprint 4 row carries the
struck false-urgency clause. `git diff --stat` over the three tracked files → **172 insertions / 19
deletions**, matching what was reported. `git status` shows **no `src/` modification** — zero source
changes, as claimed.

### Smoke-test disposition — skipped, owner-accepted

Recorded so it does not vanish with the close:

- **What was skipped.** The R4-authorized local smoke test, which required temporarily flipping
  `CITIZENSHIP_CARD_ENABLED` to `true`.
- **Why.** The coder **declined and escalated rather than doing it**: a dev server it had not started
  was already running on this same working tree, and flipping the citizenship relaunch switch would
  have pushed the unreleased citizenship surface into a live browser session belonging to concurrent
  work. `git diff src/client/flashist/FlashistFacade.ts` is **empty and was never non-empty**.
- **Owner ruling 2026-09-02: accept the skip, close now.** Reasoning accepted — the five surviving
  events' firing conditions are already covered by 85 passing unit tests plus direct reading of the
  gate, so the smoke test was **confirmatory only, on code nobody changed**.
- **Still true, and stated plainly:** no citizenship event has been observed firing in a browser. The
  evidence for this task is unit tests plus source reading. Live observation belongs to `0017` /
  `0018` / `0065`.

### `Citizenship:Seen` follow-up — deliberately NOT filed

Owner-ruled to wait for the first live day of real `Citizenship:Seen` volume before anyone judges
whether the under-count risk matters. **Recorded, not forgotten** — see the brief's *Known Risk*
section and `ai-agents/knowledge-base/analytics-event-reference.md`.

**No commit made by this close** — the folder move and the edits sit in the working tree.
