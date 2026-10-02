# Keep the Query String on Match Exit (task 0331)

**Source**: `ai-agents/tasks/done/0331-keep-the-query-string-on-match-exit/brief.md`
**Status**: done (agent-closed — not owner-verified) — **the build task only**
**Sprint/Tag**: Sprint 6, rank 44 (append rank) / task `0331` (brief B4 of the `0318` report)

> ✅ **Closed 2026-09-29** `(agent-closed — not owner-verified)` on verification items 1–3. The owner's
> post-release check (repeat probe P1 after a match exit) was **split out by owner ruling into `0337`**,
> rank 1 on [[decisions/sprint-7]]. If P1 still reads `false` after deploy, `0337` files a new defect;
> `0331` is not reopened silently.
>
> 🆕 **Shipped in the 2026-09-29 game deploy** (listed in the runbook's "ships in this deploy" set; see
> [[systems/weekend-deploy-window]]). ⚠️ **The owner's `0337` check had not been reported** as of the
> sources read this sync.

## Goal

Leaving a match navigates to `rootPathname` via `changeHref`, which **dropped the query string and hash**.
Yandex's loader reads the real SDK address from the `sdk` query parameter; without it the loader asks the
parent frame, waits 500 ms, and on timeout `init()` never settles — so the boot goes degraded. This was
trigger B in the `0318` investigation, **inferred, not verified**. The owner ruled on `0318`: *"B1+B2+B3, B4 if
confirmed (Recommended)"* — this task is B4, and it shipped **only because the probe confirmed it**.

## Key Changes

- **Owner probe P1, production, 2026-09-29** (yes/no and numbers only): fresh first load `has("sdk")` **true**,
  query length **120**; after a match exit **false / 0**, twice. ⇒ **trigger B confirmed** — the platform's
  iframe address does carry `sdk`, and the match exit dropped it.
  - ⚠️ Ruling trail, recorded honestly: on an earlier, misread sample the owner answered *"Cancel it"*; the lead
    treated that as **void** and nothing was cancelled.
- **P1b (informational):** the post-match loader entry took **5517 ms — longer than the whole 5 s boot
  deadline**. Whether it came from cache is **not determined** (a cross-origin entry reports size 0 whatever
  happened). One sample; a slow network is a live alternative explanation.
- **The change** (`src/client/flashist/FlashistFacade.ts`, a `// Flashist Adaptation (task 0331)`):
  `changeHref` appends `window.location.search` **only when the target is `rootPathname`**, i.e. on a match
  exit. The hash is still dropped, so no hash-carried join/refresh signal is replayed. A sixth caller that is
  not a match exit (the Stripe checkout in `Cosmetics.ts`) is untouched. `reloadApp()` behaviour is
  unchanged (it already kept the whole URL).
- **Tests** (`tests/client/PlatformDegradedFacade.test.ts`): five new tests; against the pre-change source,
  the two that matter fail — the discrimination the plan predicted.

## Outcome

- **Evidence:** targeted suites 3 / 55 passed; full `npm test` 175 suites / 3102 tests, first run; review
  round 1 *"Ready to merge (validation-gated)"* with **zero findings** (Codex reasoning-only — its test run hit
  a sandbox error).
- ⚠️ `npm run lint` was **red at build** on one error in a file this task did not touch (`0325`'s helper
  script); both changed files linted clean. The 2026-09-29 pre-deploy lint was exit 0.
- **Not verified locally:** real Yandex behaviour — the local frame has no platform `sdk` parameter. Only
  `0337`'s post-release P1 repeat proves the production effect.
- **Coordinated with `0199`:** at least one query parameter **is** load-bearing on the Yandex path; `0199`'s
  brief got a dated note. Invite links and `copyToClipboard()` were not touched.

## Related

- [[tasks/citizenship-card-vanishes-investigation]] — task `0318`, trigger B and ruling D-2
- [[systems/flashist-init]] — the 5 s boot deadline and the match-exit reload this changes
- [[tasks/sdk-loader-download-retry]] — task `0330`, B3 of the same report
- [[tasks/platform-degraded-analytics-event]] — task `0328`, whose `InitTimeout` share measures the effect
- [[tasks/citizenship-card-late-recovery-recheck]] — task `0329`, B2 of the same report
- [[systems/weekend-deploy-window]] — the 2026-09-29 deploy that shipped it
- [[decisions/sprint-6]] — the board that closed it
- [[decisions/sprint-7]] — where `0337`, the verify task, sits
- [[tasks/stale-login-client-diagnostics]] — task `0372`: the same-tab reload on match exit is its leading (unproven) cause of `stale` logins
