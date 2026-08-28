# `windowOrigin` Is a Document Base, Not a URL-Join Base

**Date**: 2026-08-28
**Status**: accepted

> 🚨 **This is a LIVE production defect on the primary distribution channel. The fix is BUILT but NOT DEPLOYED.**
> Task `0198` is `🔲 Backlog` / in progress at the time of writing; its production proof (step 8) rides the same deploy that carries `0062` and `0063`, and that deploy has not happened. **Nothing below is verified as fixed in production.**

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

Keep `windowOrigin` only where the intent really is "stay in this document" — notably the private-lobby invite link, which must append the hash with **no** separator (`` `${windowOrigin}#join=${id}` ``): a trailing `/` makes the path stop matching nginx's `\.html$` rule and silently serves the standalone `index.html` instead of the Yandex template, so the invited player never gets Yandex platform mode.

**Anything built by concatenating onto `windowOrigin` is suspect in production.** Do not "fix" it by reverting to `window.location.origin` — that drops the fork's non-root-path support.

**Testing rule.** A URL-shape fix must be exercised at a **non-root** pathname; `http://localhost:9000/index.html` is the clean harness. At `/` the defect shows as a double slash that a slash-collapsing change would appear to fix, while production's real failure has no double slash at all. **Only the non-root harness discriminates the two** — a root-path pass proves nothing about production.

**Owner rulings, 2026-08-28** (all via `AskUserQuestion` in the lead session):

- **Priority High.** Filed Medium with an explicit escalation condition; the condition fired on measurement and the owner confirmed the deciding fact. This was the owner confirming the producer's escalation rule, not overriding a rank.
- **Sprint position** — top of Sprint 4's open work, above the whole config track. Execution order **`0198` → `0063` → `0062` → `0195` → `0064` → `0060`**. Grounds: a live player-facing failure outranks defects that block a launch not yet live; it has no sequencing hazard; it is client-only and small.
- **Deploy coupling** — `0198` is fixed **first** and ships in the **same** production deploy as `0062` and `0063`, chosen over *deploy now, fix later*. This is a coupling, not a dependency: `0198` depends on nothing and no status on `0062`/`0063` changes.

## Consequences

- **Players on Yandex Games cannot start a private lobby today, and it fails silently.** The lobby is created, the joined-player list keeps refreshing, the modal closes on Start, and then nothing happens. Public games are unaffected.
- **The host's settings are silently lost too**, which is the half that was first missed. `putGameConfig()` pushes map, difficulty, bot count, game mode, disabled units and timer, runs on **every** settings change, and is `await`ed at the top of `startGame()`. Anyone chasing "why did my test run with the wrong settings" is chasing this defect.
- **⚠️ Derived, NOT measured — a likely second production symptom.** The copy-invite link on the Yandex path is `…/yandex-games_iframe.html/#join=<id>`, whose trailing slash stops matching `location ~* \.html$` and should therefore serve the standalone template. **If true, an invite shared from the Yandex build lands the recipient on the wrong entry point.** Reasoned from `nginx.conf` and `Master.ts`, never observed live. Do not repeat it as fact.
- **Two other `windowOrigin` consumers send it as a payload value, not a concatenation** — `Cosmetics.ts` (`hostname`) and `AccountModal.ts` (`redirectDomain`). In production they are now known to be sending `https://geoconflict.ru/yandex-games_iframe.html`. Whether that is what those endpoints expect is `0069`/`0070` territory.
- **Two local-dev lobby traps now look alike, and §9 of the architecture doc discriminates them:** *public lobby list empty, private lobby works* → something squatting port 3001 killed worker 0 (`EADDRINUSE` swallowed in `Worker.ts`); *private Start Game does nothing, public list fine* → this defect. In production the symptom is the path-prefix failure, not a doubled slash.

## Related

- [[tasks/citizen-verified-icon]] — task `0068`, whose live multi-client check hit this and routed it out rather than absorbing it
- [[systems/architecture-overview]] — the §5 client-tier rule and the §9 trap table this page records
- [[systems/networking]] — the worker route the join misses, and the `app.get("*")` fallback that answers instead
- [[systems/flashist-init]] — `FlashistFacade`, which owns `windowOrigin` and `rootPathname`
- [[decisions/adr-109-worker-index-placement-contract]] — the `/w<N>/` placement contract the API base depends on
- [[decisions/config-parity-failure-class]] — `0062`/`0063`, which ride the same pending deploy
- [[decisions/sprint-4]] — the sprint board carrying task `0198`
