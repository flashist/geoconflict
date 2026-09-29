# Plan — 0331 Keep the query string on match exit

**Status:** awaiting owner approval. Planning-only: no source or test file has been touched.
**Author:** `fkit-coder`, spawned plan-only by `fkit-lead` (2026-09-29). Step 0 (owner probe P1) is done and
confirmed trigger B — see `worklog.md`.

## 1. The change in one line

When a match exit calls `changeHref(rootPathname)`, navigate to `rootPathname + window.location.search`
(the query string the page has **right now**) instead of `rootPathname` alone. The hash is still dropped.
Nothing else changes: the five exit sites, `reloadApp()`, and the Stripe checkout path stay as they are.

## 2. Verified facts (line numbers drifted since the brief — current ones below)

| Claim | Where, today | Verified |
|---|---|---|
| `rootPathname = window.location.pathname`, read once when the facade is built | `src/client/flashist/FlashistFacade.ts:481` (brief said ~453) | yes |
| `changeHref(value)`: writes the 0328 after-match marker when `value === this.rootPathname`, then `window.location.href = value` | `FlashistFacade.ts:909-919` (brief said 785-788) | yes |
| `reloadApp()` = `window.location.reload()`; its doc comment says `changeHref(rootPathname)` "drops the query and the hash" | `FlashistFacade.ts:921-929` (brief said 790-798) | yes |
| The five match-exit call sites, all `changeHref(FlashistFacade.instance.rootPathname)` | `WinModal.ts:346`, `GameRightSidebar.ts:136`, `SettingsModal.ts:160`, `TutorialLayer.ts:318`, `Main.ts:735` (brief said `:728`) | yes |
| **A sixth caller, NOT a match exit:** `Cosmetics.ts:74` passes a Stripe checkout URL to `changeHref` | `src/client/Cosmetics.ts:74` | yes — **this is why the change must sit inside the `value === rootPathname` branch only** |
| Yandex's loader reads `sdk` from `location.search`; if missing it asks the parent frame with a 500 ms timeout | vendored copy `src/client/yandexGamesSdk_test.js:170-180, 222-240`; report `0318` §2.3 | yes (copy read; live script per report) |
| No code of ours reads `location.search` at boot | grep of `src/client` + `src/core`: the only readers are the vendored SDK copy | yes |
| Every URL rewrite of ours **keeps** the query | `Main.ts:647-651` (`strip`), `jwt.ts:138-144`, `AccountModal.ts:98-104` all rebuild `pathname + search (+ hash)` | yes |
| Every join / login / purchase signal lives in the **hash**, not the query | `Main.ts:653-737` (`#purchase-completed`, `#token-login`, `#join=`, `#affiliate=`, `#refresh`), `jwt.ts:128-145` (`#token=`), `JoinPrivateLobbyModal.ts:185` | yes |
| No ADR in `ai-agents/knowledge-base/decisions/` covers this navigation | grep for `changeHref` / `rootPathname` / "query string" — no hits | yes |
| Wiki rule: test URL-shape changes at a **non-root** pathname (production is `/yandex-games_iframe.html`) | wiki `decisions/windoworigin-url-join-defect.md` § Testing rule | yes — tests below follow it |

## 3. What changes, where

### 3.1 `src/client/flashist/FlashistFacade.ts` — `changeHref` (the only behaviour change)

```ts
  // Single place for working with URLS
  public changeHref(value) {
    let href = value;
    // Only the match exits navigate to the root path (the Stripe checkout URL
    // does not): mark the next boot as "follows a match exit" (task 0328).
    // markMatchExit never throws, so navigation always happens.
    if (value === this.rootPathname) {
      markMatchExit();
      // Flashist Adaptation (task 0331): keep the query string the platform
      // gave this iframe — Yandex's loader reads its SDK address from `sdk`.
      // Read now, not at construction. The hash is still dropped, so a
      // #join= / #refresh / #token-login is never replayed.
      href = value + window.location.search;
    }
    // window.location.href = value;
    window.location.href = href;
  }
```

- The marker check still compares the **raw** `value` to `rootPathname`, before anything is appended — so 0328's
  after-match analytics keep working exactly as now.
- `window.location.search` is `""` or starts with `?`, and is already percent-encoded, so plain concatenation is
  correct. A bare trailing `?` reads as `""` (checked in jsdom 26.1.0).
- The old commented-out line stays (minimal diff; the file keeps the upstream-trail comments).

### 3.2 Same file — `reloadApp()` doc comment only (no code change)

Its comment says `changeHref(this.rootPathname)` "drops the query and the hash". After this change that is half
wrong. Reword to: it drops the **hash** (and dropped the query too before task 0331), and a reload is still the
right primitive here because it keeps the whole URL, hash included. `window.location.reload()` stays byte-identical.

### 3.3 Not touched

- The five exit sites (their `// Flashist Adaptation` markers stay as they are).
- `Cosmetics.ts` / Stripe checkout — gets no query appended (branch guard).
- `HostLobbyModal.copyToClipboard()` and invite links — `0199`'s scope.
- No UI text (no `en.json` / `ru.json`), no analytics event (no `analytics-event-reference.md` change), no HTML
  template change.

## 4. Edge cases and how each is handled

1. **Which `location` is read, and when.** `rootPathname` is read at construction (unchanged); `search` is read
   **at navigation time**, inside `changeHref`. The pathname never changes during a session (every
   `pushState`/`replaceState` of ours reuses `location.pathname`), so the two cannot disagree.
2. **Current query vs first-load query.** Plan keeps the **current** query, as the brief says. Why this is safe:
   nothing of ours ever changes the query (every rewrite in §2 carries `search` through), so current = first-load
   in practice; the owner's P1 first-load reading (`has("sdk")` true, length 120) was taken after boot, so the SDK
   evidently does not strip `sdk` by then; and "current" is exactly what `reloadApp()` and a browser refresh use.
   The alternative (snapshot the query at construction next to `rootPathname`) would only matter if some
   third-party script rewrote the query mid-session — no evidence of that. Post-release P1 repeat (verification 4)
   is the check. **Not a decision point** — see §8.
3. **Could keeping the query re-trigger a join or anything else?** No. Every join/login/purchase/refresh signal is
   in the hash (§2), and the hash is still dropped. `#refresh` (`Main.ts:732-736`) calls `changeHref(rootPathname)`
   — the new URL has no hash, so no loop. No code of ours reads the query at boot.
4. **Standalone `index.html` (non-Yandex).** Usually no query → `href === rootPathname`, **byte-identical to
   today**. If a standalone URL carries a query (e.g. marketing params), it now survives a match exit — harmless,
   nothing reads it.
5. **Target equals the current URL.** When the page has no hash, the new target (`pathname + search`) is the same
   URL as now. Browsers still do a **full load** for that (only a hash-only difference is an in-page jump). One
   small side effect: per the HTML spec a same-URL navigation **replaces** the history entry instead of adding
   one, so repeated match exits no longer stack extra history entries. Not a regression; if anything tidier.
6. **Stripe / any non-root URL.** Unchanged — no query appended, no marker written (branch guard + test).
7. **Is the `sdk` value reusable?** It is the loader's SDK address, which the platform hands the frame. It is
   already reused today by `reloadApp()` (0303's restart path) and by any browser refresh of the frame. Low risk.

## 5. Tests — `tests/client/PlatformDegradedFacade.test.ts`

New `describe("match exit keeps the query string (task 0331)")`, next to the existing "the after-match marker"
block (same `makeFacade` helper, bare prototype instance). Each test sets the page URL with
`window.history.replaceState(null, "", …)` at a **non-root** path (`/yandex-games_iframe.html`, per the wiki
testing rule), and an `afterEach` resets it to `"/"` so the existing `#root-exit-N` tests are unaffected.
Fake parameter values only (e.g. `sdk=fake`), never real ones.

| # | Test | Discriminates the fix? |
|---|---|---|
| 1 | URL `/yandex-games_iframe.html?sdk=fake&lang=ru#join=abc`, `changeHref(rootPathname)` → `pathname + search + hash` is `/yandex-games_iframe.html?sdk=fake&lang=ru` (query kept, hash gone), marker written | **yes** — today's code leaves the URL unchanged, hash `#join=abc` still there |
| 2 | Query changed after the facade was built (`replaceState` to `?sdk=later#x`) → navigates with `?sdk=later` | yes — proves "read at navigation time" |
| 3 | Empty query: URL `/yandex-games_iframe.html#frag` → bare `/yandex-games_iframe.html` | regression guard (passes today too) |
| 4 | Non-root URL: URL `…?sdk=fake`, `changeHref("#checkout")` → hash is exactly `#checkout`, marker not written | yes — an unguarded append would give `#checkout?sdk=fake` |
| 5 | `reloadApp()` with URL `…?sdk=fake#frag` → does not call `changeHref`, writes no marker, URL unchanged | partial — see limit below |

Existing tests stay green unchanged (they use hash-only `rootPathname` values with an empty query, so
`href` is identical to today).

**How the navigation is observed — and the limit.** jsdom's `location` cannot be stubbed (`href` is
non-configurable: "Cannot redefine property: href", checked on jsdom 26.1.0), and jsdom does not perform real
navigations. But jsdom 26.1.0 treats a target that equals the current URL **minus its hash** as an in-page jump,
and updates `location` — which is exactly the shape of a correct match exit. Checked in a scratch Node run:
`/p?sdk=abc#frag` → `/p?sdk=abc` updates; `/p?sdk=abc#frag` → `/p` (today's behaviour) logs
`Not implemented: navigation` and leaves the URL alone. Tests 1–3 also assert that `console.error` (where
jest-environment-jsdom forwards that jsdom error) was **not** called with `Not implemented: navigation`, so if a
future jsdom stops doing this, the tests **fail loudly instead of passing falsely**. No production test seam is
needed. `reloadApp()` cannot be observed in jsdom at all (reload is not implemented), so test 5 only proves it
does not route through `changeHref` and does not mark; its one-line body is unchanged by construction.

## 6. Verification

1. `npm test -- tests/client/PlatformDegradedFacade.test.ts` (plus `WinModal.test.ts`, `Cosmetics.test.ts`, which
   mock `changeHref`).
2. `npm run lint` clean.
3. Full `npm test`. Known `supertest` flake → CLAUDE.md procedure; if re-run, say so.
4. **Owner, after release (brief step 4):** repeat P1 after a match exit → `has("sdk")` now `true`. Informational:
   M2 `Session:PlatformInitTimeout` and `0328`'s `Session:PlatformDegraded:InitTimeout` after-match share, before
   vs after (GameAnalytics, 7 days, dimension 02 = `yandex`). Numbers only.
5. Not verifiable locally: real Yandex behaviour (the local dev frame has no platform `sdk` parameter). Only step 4
   proves the production effect.

## 7. Risks

- **Low.** One branch, one concatenation. Worst plausible case: a Yandex query value that should not be reused
  — but `reloadApp()` and browser refresh already reuse it.
- Tests lean on a jsdom 26.1.0 behaviour (guarded as above, fails loudly if it changes).
- Wiki `systems/flashist-init.md` still says the exit "drops the URL query string" — stale after this ships;
  the wiki role updates it at close (coder does not write the wiki).
- `0199` is untouched; its dated 2026-09-29 note already records that `sdk` is load-bearing.

## 8. Decisions

**None needed.** Scope, current-vs-first-load query, and hash handling are all fixed by the brief and the
evidence in §4. The owner may still choose to cancel (standing ruling is `0318` D-2, "B4 if confirmed", and P1
confirmed).

## 9. Size

XS: ~10 lines of source (one branch + one comment reword), ~5 tests.
