# Worklog — 0331 Keep the query string on match exit

## 2026-09-29 — Step 0: owner probe P1 (and P1b) — trigger B CONFIRMED

⛔ **Provenance.** Recorded by a spawned `fkit-producer` with **no owner channel** (ADR-021), from probe
results and rulings the **owner** gave live in the `fkit lead` session on 2026-09-29, relayed by
`fkit-lead`. The producer observed none of it directly. The owner ran the probes **in production**, in the
**game frame's** DevTools console (not the portal page). Yes/no and numbers only — no query-string value,
id, host or IP is recorded here.

### P1 — does the `sdk` query parameter survive a match exit?

| Reading | `has("sdk")` | `location.search.length` |
|---|---|---|
| Fresh first load | **true** | **120** |
| After exiting a match — reading 1 | **false** | **0** |
| After exiting a match — reading 2 | **false** | **0** |

- ⚠️ **How the readings came in:** the owner first took **both** readings on post-match pages by mistake
  (false/0 twice), then supplied the real fresh-load reading (true/120). The table above is the corrected set.
- ⇒ **Trigger B CONFIRMED.** Report `0318` §5: *"`true` then `false` confirms trigger B."* The iframe URL the
  platform gives us **does** carry `sdk`, and the match-exit navigation drops it. This answers the brief's
  one unknown (*"whether the iframe URL the platform gives us actually carries that parameter"*): it does.

### P1b — the loader on the post-match load (informational)

- **One** resource entry matched: path `/sdk.js`, `transferSize` **0**, duration **5517 ms**.
- ⚠️ **Cache vs download is NOT determined.** The loader is cross-origin (a Yandex host,
  `src/client/yandex-games_iframe.html:24`). Without a `Timing-Allow-Origin` header the browser reports
  `transferSize` 0 **whatever happened**, so report `0318` §5's reading (*"`transferSize: 0` means served from
  cache"*) does not hold for this entry.
- ⚠️ **5517 ms exceeds the 5 s shared boot deadline** — on this load the loader alone took longer than the whole
  budget.
- **One sample only.** The owner's connection also showed a ~6.9 s signed call with a socket error earlier the
  same session, so a slow network is a live alternative explanation for the duration.
- **Unknown:** whether the citizenship card showed on that page (asked, not answered).

### Ruling trail — recorded honestly

1. Based on the **mistaken** reading (false/0 on both), the lead asked the owner whether to cancel `0331`; the
   owner chose **"Cancel it (Recommended)"**.
2. The owner then supplied the real fresh-load reading (true/120).
3. The lead treated the cancel answer as **void** — it was premised on a misread sample — and **stopped the
   cancel before anything changed.** A producer spawn that had been told to cancel was halted; `0331` was
   verified still in `backlog/` and untouched.
4. **The standing ruling is `0318` D-2, "B1+B2+B3, B4 if confirmed (Recommended)"**, and P1 has now confirmed it.
5. The owner was told all of this and **may still ask to cancel.** No mover has been run.

### Outcome

- **Verification step 1 is done** (P1 recorded, dated, yes/no + numbers only).
- **Step 0 is done; the task is ready for Step 1 (build).** Nobody is building it yet.
- `## Status` moved from `🚧 Blocked — waiting on owner probe P1` to `🔲 Backlog` (brief and the Sprint 6 row).
- `0199` got a dated note: at least one query parameter **is** load-bearing on the Yandex path (brief
  *Coordinate with `0199`*).

## 2026-09-29 — plan written (fkit-coder, spawned plan-only by fkit-lead)

- `plan.md` written; **no source or test touched**. Awaiting owner approval.
- Found a sixth `changeHref` caller that is not a match exit (`Cosmetics.ts:74`, Stripe checkout) — so the query is
  appended only inside the `value === rootPathname` branch. Brief line numbers have drifted (facade `:481`,
  `:909-929`; `Main.ts:735`) — current ones are in the plan.
- No decision points raised; hash still dropped, so no `#join=`/`#refresh` replay (all such signals are hash-only).

## 2026-09-29 — Build (fkit-coder, Build worker spawned by fkit-sprint-ship-loop)

- **Authority:** owner approved `plan.md` on 2026-09-29, live in the fkit-lead session (AskUserQuestion,
  "Approve (Recommended)"). Plan blob checked before starting: `git hash-object plan.md` =
  `0a88083b1b4c636192d3dc9d46b7eba4f91117b0`, matches the approved one.
- **Built exactly plan §3 and §5.** Nothing committed. No status change, no file moved.

### Files changed

- `src/client/flashist/FlashistFacade.ts` (+11 / −4):
  - `changeHref`: new `let href = value`; inside the existing `value === this.rootPathname` branch, after
    `markMatchExit()`, `href = value + window.location.search` with a `// Flashist Adaptation (task 0331)`
    comment; navigates to `href`. Marker check still compares the raw `value`. Stripe path untouched.
  - `reloadApp()`: doc comment reworded only (`changeHref(rootPathname)` drops the hash; dropped the query too
    before 0331; a reload keeps the whole URL). Body `window.location.reload()` unchanged.
- `tests/client/PlatformDegradedFacade.test.ts` (+83): new `describe("match exit keeps the query string (task
  0331)")` with the 5 planned tests, at `/yandex-games_iframe.html`, fake values only (`sdk=fake`, `lang=ru`,
  `sdk=later`), `afterEach` resets the URL to `/`, and the `console.error` "Not implemented: navigation" guard on
  tests 1–3.

### Verification (plan §6 steps 1–3)

| Step | Command | Result |
|---|---|---|
| 1 | `npx jest tests/client/PlatformDegradedFacade.test.ts tests/client/WinModal.test.ts tests/client/Cosmetics.test.ts` | **3 suites, 55 tests passed** |
| 1b | Same new tests run against the **pre-change** source (HEAD copy swapped in, then restored) | tests 1 and 2 **fail**, tests 3–5 pass — exactly the plan §5 discrimination table |
| 1c | Scratch test (created, run, deleted) that the guard sees jsdom's log on a real non-hash navigation | passed — the guard does detect it |
| 2 | `npm run lint` | ⚠️ **exit 1 — 1 error, in a file this task did not touch**: `ai-agents/tasks/backlog/0325-…/s0-hmac-check.mjs` "not found by the project service". That file is tracked since commit `68303d5`, so lint is red on HEAD regardless of 0331. `npx eslint` on the two changed files: **exit 0**. `prettier --check` on both: clean. |
| 3 | `npm test` (full, once) | **175 suites / 3102 tests passed, exit 0**, 62.8 s. No supertest flake, no SIGSEGV, no re-run needed. |

- **Not verified locally (plan §6.5):** real Yandex behaviour — the local frame has no platform `sdk` parameter.
  Only the owner's post-release P1 repeat (plan §6.4) proves the production effect.
- jsdom limit (as planned): `reloadApp()` cannot be observed navigating in jsdom; test 5 only proves it does not
  go through `changeHref` and writes no marker.

### Decision log (unattended calls)

- **none.** No obvious-winner call and no deviation from the approved plan. Leaving the pre-existing lint
  error in 0325's `.mjs` alone is not a call made on 0331's behalf — it is outside this plan and flagged for the
  owner instead.

## 2026-09-29 — Review round 1 processed (fkit-coder, Process-review worker spawned by fkit-sprint-ship-loop)

- **Authority:** standing approval of `plan.md` (owner, 2026-09-29, live in the fkit-lead session).
- Ran `fkit-process-stateful-review` steps 0–7 on `review.md`. Reviewer verdict: *Ready to merge
  (validation-gated)*, **zero findings** from either pass (Codex reasoning-only — its jest run hit sandbox `EPERM`;
  all execution evidence is the Claude reviewer's and the Build worker's).
- Wrote to `review.md`: a "none" note under *Coder response* (no rows — nothing to answer); header `Status:`
  `in-review` → `closed-out`. *Reviewer findings*, `Coverage:` and *Accepted residuals* untouched (residuals stay empty).
- No source or test changed. Nothing committed. No status change, no file moved.

### Decision log (unattended calls)

- **none.** No fix applied without asking and no obvious-winner call — there were no findings to act on.

## 2026-09-29 — Closed (fkit-producer, spawned by fkit-lead) — `✅ Done (agent-closed — not owner-verified)`

- **Authority.** OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on 2026-09-29, relayed by
  `fkit-lead` to a spawned `fkit-producer` with **no owner channel** (ADR-021/037). Question: *"0331 is built, tested
  and reviewed, but only proven once deployed and you re-run P1. When should it close?"* Owner, verbatim (typed as
  "Other"): *"Split the task into 2: the one is about building the feature, another one should be about verifying it
  (the current one may stay as the "build" task). The verify task should be put on top of the next sprint (if it
  depends on the deploy, it shouldn't block the current sprint's deploy)"*.
- **Evidence for the close (build scope).** `plan.md` approved by the owner 2026-09-29; built exactly to plan (no
  deviation, per the builder's decision log); full `npm test` **175 suites / 3102 tests passed** (builder); targeted
  suites re-run by the reviewer **3 suites / 55 tests passed**; stateful review round 1 verdict *"Ready to merge
  (validation-gated)"*, **zero findings**; Codex second opinion reasoning-only (its jest run hit sandbox `EPERM`);
  `review.md` `Status: closed-out`.
- ⚠️ **Caveats carried into the close.** `npm run lint` was **red (exit 1)** on one error in a file this task did not
  touch (`0325`'s tracked `s0-hmac-check.mjs`); the two changed files lint clean. Real Yandex behaviour was **not**
  verified — the local frame has no platform `sdk` parameter.
- **Brief verification item 4 (the owner's post-release P1 repeat) was SPLIT OUT**, by the ruling above, into
  [`0337`](../0337-verify-0331-in-production-the-sdk-query-parameter-survives-a-match-exit/brief.md) —
  rank 1 on the Sprint 7 board. If P1 still reads `false` after deploy, `0337` files a new defect; `0331` is not
  reopened silently.
- ⚠️ **State at close: the change is NOT committed and NOT deployed.**
- 🚩 **Wiki flag (for `fkit-wiki`, next sync):** `systems/flashist-init.md` says a match exit "drops the URL query
  string" — stale once this change is deployed. The producer did not touch the vault.
