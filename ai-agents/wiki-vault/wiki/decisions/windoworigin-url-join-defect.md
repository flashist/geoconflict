# `windowOrigin` Is a Document Base, Not a URL-Join Base

**Date**: 2026-08-28
**Status**: accepted

> 🔧 **UPDATED 2026-08-30 — THE FIX IS NOW DEPLOYED, AND THE TASK IS STILL NOT DONE.**
>
> This banner previously read: *"This is a LIVE production defect on the primary distribution channel. The fix is BUILT but NOT DEPLOYED. Task `0198`'s production proof (step 9) rides the same deploy that carries `0062` and `0063`, and that deploy has not happened."* **The deploy happened** — release `362a2f9`, carrying the fix commit `d442ac2`; the three `HostLobbyModal` call sites now build bare root-absolute `` `/${config.workerPath(id)}/api/…` `` paths in the shipped code, and the invite link appends `#join=` with no separator. Deploy evidence: [[tasks/prod-api-env-https-apex]].
>
> 🚫 **But step 9's production proof is UNREACHABLE, not merely unrun.** The private-lobby entry points are inside a `style="display: none;"` row in `src/client/yandex-games_iframe.html` — `host-lobby-button` and `join-private-lobby-button` are both hidden on the production Yandex template. **A player cannot open the failing path, so the original symptom cannot be reproduced there to confirm the fix.** The task's status is the producer's to set; what this page records is that the evidence step it is waiting on has no route to being satisfied as written.
>
> **Consequence for the reader: the production defect narrative below is now HISTORY, not current state** — but "fixed" rests on reading the deployed source, not on observing the repaired behaviour. Everything about the mechanism, the rule and the testing requirement stands unchanged and is the durable part of this page.
>
> **Review closed 2026-08-28; the task is NOT Done.** Its terminal state is `🚧 Blocked — awaiting deploy proof`. Two rounds, one low-severity documentation finding (R1, the GET/404 verb nuance — fixed and reviewer-re-verified), **zero code defects** across both reviewers (fkit-reviewer's own pass plus a Codex adversarial pass, no degradation), and **six accepted residuals, all owner-confirmed with wording unamended and their re-raise conditions binding**. Round-2 gates were deliberately **not** re-run — the 107 suites / 1075 tests / exit-0 figures stand on the **round-1** run, not a fresh green. **The production symptom — private-lobby Start Game doing nothing — remains unverified-as-fixed.**

## Context

`FlashistFacade.windowOrigin` is `window.location.origin + window.location.pathname` (`src/client/flashist/FlashistFacade.ts`). This is a **`// Flashist Adaptation`** — upstream OpenFront used `window.location.origin` alone, and the original line is still commented out directly above each call site. The adaptation is deliberate: its sibling field `rootPathname` is read by `Main.ts`, `WinModal.ts`, `SettingsModal.ts`, `TutorialLayer.ts` and `GameRightSidebar.ts` to navigate "back to the start screen" **without leaving the current document**. The pathname is intentional; the bug is the *join*.

**The worker API is mounted at the host root in every environment** — nginx `location ~* ^/w(\d+)(/.*)?$`, webpack's local proxy `context: ["/w<N>"]`, and `dev:remote`'s `/^\/w\d+(\/|$)/`. So the API base and the document base are genuinely different things, and three `src/client/HostLobbyModal.ts` sites concatenated a worker route onto the document base: `putGameConfig()` (PUT the host's lobby settings), `startGame()` (POST the start), and `copyToClipboard()` (the invite link).

**Measured in Chrome against live production, 2026-08-28** — recorded evidence, not inference:

| Production URL | `location.pathname` | Computed worker URL | Result |
|---|---|---|---|
| `https://geoconflict.ru/` | `/` | `…//w1/api/start_game/<id>` | ✅ Works — double slash, collapsed by nginx `merge_slashes` |
| `https://geoconflict.ru/yandex-games_iframe.html` | `/yandex-games_iframe.html` | `…/yandex-games_iframe.html/w1/api/start_game/<id>` | ❌ **404 — the measured call is a non-GET; the outcome is verb-dependent, see the note below** |

**The outcome depends on the HTTP verb.** A wrongly-joined URL never matches the worker route either way, but what comes back is not the same:

- **non-GET (PUT/POST — the two calls this defect breaks): 404.**
- **GET: 200, with `static/index.html` as the body.** The path matches none of nginx's specific locations (`\.html$` needs the path to *end* in `.html`; `^/w(\d+)` needs start-of-path), so it falls through to the catch-all `location /`, is proxied to the master, and hits the SPA fallback `app.get("*")` in `src/server/Master.ts` (lines 689-691), which sets no status. A GET caller therefore fails on a **JSON parse error, not a network error** — a harder failure to spot than the 404.

Recorded in `ai-agents/knowledge-base/architecture.md` §5 as verified end-to-end through the nginx location set and `Master.ts` (task `0198` review finding R1, corrected 2026-08-28). The Chrome measurement in the table above exercised the **non-GET** path only.

`https://geoconflict.ru/yandex-games_iframe.html` is **served — HTTP 200, the real application**, not a stray build artifact. The owner confirmed the same day (lead session, `AskUserQuestion`) that **the Yandex Games embed loads that path** — the one fact the browser measurement could not supply.

**The production failure is NOT the double-slash bug.** At the Yandex URL there is no double slash anywhere, so `merge_slashes` is irrelevant and cannot help. It is a **path-prefix miss**: the path begins `/yandex-games_iframe.html/w1/…`, never matches `^/w(\d+)`, falls through to `location /` → the game server, whose only catch-all is `app.get("*")` (the SPA fallback in `src/server/Master.ts`). A PUT or POST therefore 404s; per the verb note above, a GET would instead be answered by that fallback with a 200.

**One root cause, three surfaces:** root URL → harmless double slash; Yandex URL → broken prefix; local dev (no nginx) → broken double slash that webpack-dev-server's literal-prefix proxy never routes.

**Why nothing surfaced.** Neither `putGameConfig()` nor `startGame()` checks `response.ok`; both return the response and no caller inspects it. A 404 is indistinguishable from success at every layer above the fetch — and on the GET path the silence is worse still, since a 200 carrying an HTML body is even more convincingly success-shaped. That silence is why the defect was found by accident, by `0068`'s coder testing something else — no player report, no log line, no alert ever surfaced it.

## Decision

**Rule (recorded in `ai-agents/knowledge-base/architecture.md` §5): host-root APIs take a bare root-absolute path** — `` `/${config.workerPath(id)}/api/…` `` — which is what `pollPlayers()`, `createLobby()`, `JoinPrivateLobbyModal` and `Matchmaking` already do, and why the lobby *looks* healthy while the two requests that matter fail.

Keep `windowOrigin` only where the intent really is "stay in this document" — notably the private-lobby invite link, which must append the hash with **no** separator (`` `${windowOrigin}#join=${id}` ``): a trailing `/` makes the request silently serve the standalone `index.html` instead of the Yandex template, so the invited player never gets Yandex platform mode.

> 📐 **The mechanism, stated correctly — nginx does not pick the file.** A trailing `/` does stop the path matching nginx's `~* \.html$` location, but **both** that location and the catch-all `location /` `proxy_pass` to the same master on port 3000, so nginx never chooses between files. **The substitution is Express's**: `/yandex-games_iframe.html` hits a real file through `express.static`, while `/yandex-games_iframe.html/` misses it and falls through to the SPA fallback `app.get("*")` → `static/index.html`. The **consequence** above is correct; only the layer matters, and this is the corrected layer. ✅ **`ai-agents/knowledge-base/architecture.md` §5 now carries this corrected wording** — the flag raised here for "the next architecture-doc pass" was discharged before release `362a2f9`, and the doc's own invite-link note names the `express.static` miss and the `Master.ts` SPA fallback explicitly, adding that **nginx never picks the file** because both the `~* \.html$` location and the catch-all `location /` proxy to the same master on port 3000.

**Anything built by concatenating onto `windowOrigin` is suspect in production.** Do not "fix" it by reverting to `window.location.origin` — that drops the fork's non-root-path support.

**Testing rule.** A URL-shape fix must be exercised at a **non-root** pathname; `http://localhost:9000/index.html` is the clean harness. At `/` the defect shows as a double slash that a slash-collapsing change would appear to fix, while production's real failure has no double slash at all. **Only the non-root harness discriminates the two** — a root-path pass proves nothing about production.

**Owner rulings, 2026-08-28** (all via `AskUserQuestion` in the lead session):

- **Priority High.** Filed Medium with an explicit escalation condition; the condition fired on measurement and the owner confirmed the deciding fact. This was the owner confirming the producer's escalation rule, not overriding a rank.
- **Sprint position** — top of Sprint 4's open work, above the whole config track. Execution order **`0198` → `0063` → `0062` → `0195` → `0064` → `0060`**. Grounds: a live player-facing failure outranks defects that block a launch not yet live; it has no sequencing hazard; it is client-only and small.
- **Deploy coupling** — `0198` is fixed **first** and ships in the **same** production deploy as `0062` and `0063`, chosen over *deploy now, fix later*. This is a coupling, not a dependency: `0198` depends on nothing and no status on `0062`/`0063` changes.

## Consequences

- ~~**Players on Yandex Games cannot start a private lobby today, and it fails silently.**~~ 🔧 **Struck 2026-08-30, not deleted — this was the state before release `362a2f9`.** The failure shape was: the lobby is created, the joined-player list keeps refreshing, the modal closes on Start, and then nothing happens. Public games were unaffected. **The fixed code is now deployed.** ⚠️ **And it was never reachable by an ordinary player on that template anyway** — the `host-lobby-button` / `join-private-lobby-button` row is `display: none` in `yandex-games_iframe.html`. That does not make the defect less real (anything reaching those code paths hit it, which is how `0068`'s coder found it in local dev), but it does mean the production player-impact framing this page opened with was **wider than the reachable surface**, and no page should repeat it as current.
- **The host's settings are silently lost too**, which is the half that was first missed. `putGameConfig()` pushes map, difficulty, bot count, game mode, disabled units and timer, runs on **every** settings change, and is `await`ed at the top of `startGame()`. Anyone chasing "why did my test run with the wrong settings" is chasing this defect.
- **⚠️ Derived, NOT measured — a likely second symptom of the *deployed* (pre-fix) build.** In production today the copy-invite link on the Yandex path is `…/yandex-games_iframe.html/#join=<id>`; that trailing slash misses the real file in `express.static` and should therefore be answered by the SPA fallback with the standalone template (see the mechanism note above). **If true, an invite shared from the Yandex build lands the recipient on the wrong entry point.** Reasoned from `nginx.conf` and `Master.ts`, never observed live. Do not repeat it as fact. **The built-but-undeployed fix removes the separator**, so the invite becomes `…/yandex-games_iframe.html#join=<id>` — the right entry point. **Which host that entry point should live on at all is a separate, unruled product question:** see [[decisions/yandex-invite-portal-boundary]].
- **A binding residual on this same line: `copyToClipboard()` drops `location.search`.** The invite carries origin + pathname + hash, never the query string — deliberately unchanged, because the join flow reads only `#join=`. **Re-raise only if a query parameter becomes load-bearing for a joining client**, which is exactly what task `0199` is scoped to determine. `src/client/AccountModal.ts` → `viewGame()` uses the opposite convention (`` `${path}${search}${hash}` ``), so the codebase holds both and they disagree.
- **Two other `windowOrigin` consumers send it as a payload value, not a concatenation** — `Cosmetics.ts` (`hostname`) and `AccountModal.ts` (`redirectDomain`). In production they are now known to be sending `https://geoconflict.ru/yandex-games_iframe.html`. Whether that is what those endpoints expect is `0069`/`0070` territory.
- **Two local-dev lobby traps now look alike, and §9 of the architecture doc discriminates them:** *public lobby list empty, private lobby works* → something squatting port 3001 killed worker 0 (`EADDRINUSE` swallowed in `Worker.ts`); *private Start Game does nothing, public list fine* → this defect. In production the symptom is the path-prefix failure, not a doubled slash.

## Related

- [[decisions/yandex-invite-portal-boundary]] — task `0199`, the **host** question this defect's **path** fix deliberately left open
- [[tasks/citizen-verified-icon]] — task `0068`, whose live multi-client check hit this and routed it out rather than absorbing it
- [[systems/architecture-overview]] — the §5 client-tier rule and the §9 trap table this page records
- [[systems/networking]] — the worker route the join misses, and the `app.get("*")` fallback that answers instead
- [[systems/flashist-init]] — `FlashistFacade`, which owns `windowOrigin` and `rootPathname`
- [[decisions/adr-109-worker-index-placement-contract]] — the `/w<N>/` placement contract the API base depends on
- [[decisions/config-parity-failure-class]] — `0062`/`0063`, which rode the same deploy (`0063` fixed and shipped; `0062` deliberately left blank)
- [[tasks/prod-api-env-https-apex]] — task `0063`, whose close-out carries the `362a2f9` production-deploy evidence
- [[decisions/sprint-4]] — the sprint board carrying task `0198`
- [[tasks/test-suite-reliability-investigation]] — task `0197`, the jest `SIGSEGV` this task carried as an accepted residual; it closed with an upstream V8 cause
