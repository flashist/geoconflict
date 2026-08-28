# Worklog — Task 0198: Private-Lobby Start URL Misses the Worker Route

**Coder:** `fkit-coder`, spawned as the Build worker by `/fkit-sprint-ship-loop` (fkit-lead driver).
**Date:** 2026-08-28
**Standing approval:** the owner approved `plan.md` on 2026-08-28 via `AskUserQuestion` in the driver
session. Plan blob verified at spawn: `git hash-object plan.md` → `aa4493d054e3644bf842a21c501a4b21e774646d`,
matching the hash in the spawn prompt.

**Terminal state: `🚧 Blocked — awaiting deploy proof`.** Plan step 9 (production check) is not runnable
locally; it needs the deploy that also carries `0062`/`0063`. **No production pass is claimed.**

---

## Pre-flight

- `lsof -i :3001 -i :3002` → clear. Dev server came up with worker 0 alive and scheduling public
  lobbies, which independently rules out the sibling port-3001 trap for this whole run.
- Working tree carries `0067`'s and `0068`'s uncommitted changes. `0068`'s hunks in
  `src/client/HostLobbyModal.ts` are at lines **26** and **543** (`renderCitizenBadge` import + the
  `client.isCitizen` badge in the player list). My surface is **734–847**. Verified by hunk header
  before editing and again in the final diff. Neither task's work was touched, reverted or reformatted.

---

## Step 1 — Reproduction BEFORE any edit

### Production (re-measured independently, not taken from the plan)

Four `curl -L` requests, comparing status / byte size / md5, and grepping each body for
`flashist_isYandexPlatform`:

| URL | Status | Size | md5 | Yandex flag |
|---|---|---|---|---|
| `https://geoconflict.ru/` | 200 | 10795 | `c254986753f2625de6c274611b6f4254` | no |
| `https://geoconflict.ru/index.html` | 200 | 10795 | `c254986753f2625de6c274611b6f4254` | no |
| `https://geoconflict.ru/yandex-games_iframe.html` | 200 | 8359 | `2e38023be59536735d6160bbac77ce9b` | **yes** |
| `https://geoconflict.ru/yandex-games_iframe.html/` | 200 | 10795 | `c254986753f2625de6c274611b6f4254` | no |

Byte-identical to the plan's §3 table. The trailing-slash URL serves the **standalone** template, so a
Yandex-build invite does land recipients on the wrong entry point. **Second symptom confirmed, again.**

### Local — both harnesses, live browser (Playwright), real UI actions

| Harness | `pathname` | Call | Observed request | Status |
|---|---|---|---|---|
| `http://localhost:9000/` | `/` | `putGameConfig()` PUT | `http://localhost:9000//w1/api/game/GaU1ViA9` | **404** |
| `http://localhost:9000/` | `/` | invite | `http://localhost:9000//#join=GaU1ViA9` | double slash |
| `http://localhost:9000/index.html` | `/index.html` | `putGameConfig()` PUT | `http://localhost:9000/index.html/w1/api/game/hLt4JhPC` | **404** |
| `http://localhost:9000/index.html` | `/index.html` | `startGame()` POST | `http://localhost:9000/index.html/w1/api/start_game/hLt4JhPC` | **404** |
| `http://localhost:9000/index.html` | `/index.html` | invite | `http://localhost:9000/index.html/#join=hLt4JhPC` | stray `/` |

Sibling call sites in the same file, unchanged and working throughout:
`POST /w1/api/create_game/hLt4JhPC` → **200**, `GET /w1/api/game/hLt4JhPC` → **200**.

**The two shapes are genuinely different.** At `/` the defect is a double slash; at `/index.html` —
and in production — there is **no double slash at all**, just the document path prefixed onto the
worker route. A slash-de-duplicating fix would pass at `/` and leave production broken. This is why
steps 2–4 were run at the non-root harness.

---

## Change surface — one source file

`src/client/HostLobbyModal.ts` only. Five hunks, all inside 734–847:

| Location | Change |
|---|---|
| `putGameConfig()` | URL base → root-absolute `` `/${config.workerPath(id)}/api/game/${id}` ``; stale upstream comment replaced with the reason |
| `putGameConfig()` | §4d: `if (!response.ok) console.error(...)` before `return response` |
| `startGame()` | URL base → root-absolute `` `/${config.workerPath(id)}/api/start_game/${id}` `` |
| `startGame()` | §4d: `if (!response.ok) console.error(...)` before `return response` |
| `copyToClipboard()` | separator `/` deleted → `` `${windowOrigin}#join=${id}` ``; `windowOrigin` **kept** |

`FlashistFacade.windowOrigin` itself is **unchanged**, so `Cosmetics.ts:49` (`hostname`) and
`AccountModal.ts:253` (`redirectDomain`) send exactly what they sent before — **brief step 7 satisfied
by construction, not by testing two payload contracts this repo cannot observe.** `rootPathname` and
its five `changeHref` consumers are untouched. No server file, no `nginx.conf`, no `webpack.config.js`,
no new user-visible string (so no `en.json`/`ru.json` change — correct per §4d).

---

## Steps 2–5 — AFTER the fix

### Step 2 — worker route hit, at all three document paths

| Harness | `pathname` | Request | Status |
|---|---|---|---|
| `/index.html` | `/index.html` | `PUT /w1/api/game/HmHtT86J` (×3) | **200** |
| `/index.html` | `/index.html` | `POST /w1/api/start_game/HmHtT86J` | **200** |
| `/` | `/` | `PUT /w0/api/game/rQQqr7xj` | **200** |
| `/yandex-games_iframe.html` | `/yandex-games_iframe.html` | `PUT /w1/api/game/g2fk6ngz` | **200** |

The Yandex template **did** run locally — `window.flashist_isYandexPlatform === true`, and
`Bootstrap.ts`'s bounded 5 s deadline degraded past the unreachable SDK rather than hanging, exactly as
the plan hoped. So the platform-faithful variant is a real result here, not a skipped one.

### Step 3 — config push, verified end to end at the non-root harness

Set via the real UI on `/index.html`: map **Africa**, difficulty **Impossible**, bots **77**.
Read back from the worker (`GET /w1/api/game/HmHtT86J`):

```json
{"gameMap": "Africa", "difficulty": "Impossible", "bots": 77, "gameMode": "Free For All"}
```

The started game then visibly ran on the Africa map (screenshot taken during the spawn phase), i.e.
**the settings took effect, not the defaults**. Before the fix this PUT 404'd, so the server held
defaults — that is the player-visible half of the bug.

### Step 4 — live two-client run, at the non-root harness

Second browser client opened **the exact copied invite string**
(`http://localhost:9000/index.html#join=HmHtT86J`) → "Joined successfully", lobby showed **2 Players**.
Host clicked Start Game → both clients entered the same game. Second client's leaderboard showed
"Players only (2)" with the game running at ~44 s alongside the 77 bots.
**No desync:** zero matches for `desync` / `hash mismatch` in any client console log or in the server
log; 0 console errors on the joining client.

This is the acceptance test `0068` could not perform.

### Step 5 — invite link, before → after

| Harness | Before | After |
|---|---|---|
| `/index.html` | `http://localhost:9000/index.html/#join=hLt4JhPC` | `http://localhost:9000/index.html#join=HmHtT86J` |
| `/` | `http://localhost:9000//#join=GaU1ViA9` | `http://localhost:9000/#join=rQQqr7xj` |
| `/yandex-games_iframe.html` | (not captured pre-fix) | `http://localhost:9000/yandex-games_iframe.html#join=g2fk6ngz` |

The after-shape's path ends in `.html`, which the production table above proves serves the **Yandex**
template (8359 B, md5 `2e38023b…`, flag present).

### Step 6 — `windowOrigin` unchanged

Stated plainly: `Cosmetics.ts` and `AccountModal.ts` are untouched and their production payloads are
unchanged. Only two URL joins and one separator moved.

### §4d — error visibility, actually exercised

Forced a non-OK response (bogus lobby id) at the Yandex harness:
`putGameConfig()` returned **400** and logged `Failed to push lobby config: 400 Bad Request`. Confirmed
firing.

**Honest limitation:** the sibling `startGame()` branch was **not executed**. The probe that would have
run it hung, because `startGame()` first awaits `FlashistFacade.instance.showInterstitial()`, which
never resolves without the Yandex ad SDK. That is an artifact of the probe, not of the fix. The
`startGame()` logging is the same three-line shape as the verified one and is covered by typecheck and
lint, but it is **verified by symmetry, not executed** — recorded rather than glossed.

---

## Step 7 — unit test: ATTEMPTED AND KEPT

`tests/client/HostLobbyModalUrl.test.ts` (new). The plan's time-box was "drop it if mock scaffolding
exceeds roughly 60 lines"; it came in at **~30 lines / 9 `jest.mock` calls**, comparable to the
`WinModal.test.ts` precedent. Inside the box, so kept.

Three cases, all asserting at a **non-root** `windowOrigin`
(`https://geoconflict.ru/yandex-games_iframe.html`) — the production shape, not the root-path one:

1. `putGameConfig()` fetches `/w1/api/game/TESTLOBBY`
2. `startGame()` fetches `/w1/api/start_game/TESTLOBBY`
3. the invite is `…/yandex-games_iframe.html#join=TESTLOBBY` with no `.html/#join=`

**Proved it is a real regression guard, not decoration.** Temporarily reverted the three URL
expressions to their pre-fix form and re-ran: **all 3 failed**, with exactly the production strings —

```
Expected: "/w1/api/game/TESTLOBBY"
Received: "https://geoconflict.ru/yandex-games_iframe.html/w1/api/game/TESTLOBBY"
Expected: "https://geoconflict.ru/yandex-games_iframe.html#join=TESTLOBBY"
Received: "https://geoconflict.ru/yandex-games_iframe.html/#join=TESTLOBBY"
```

— then restored the fixed source and re-verified the diff. Note the failing URL has **no double
slash**: the test discriminates the real defect, not a slash-collapsing lookalike.

Per the plan, this unit test is **not** presented as the proof of the fix; the browser run is. It is a
guard against reintroduction.

---

## Step 8 — suite, lint, types

| Check | Command | Result |
|---|---|---|
| Unit suite | `npm test` | **107 suites passed / 107; 1075 tests passed / 1075** |
| Lint | `npm run lint` | exit **0**, no output |
| Types | `npx tsc --noEmit` | exit **0** |

Run twice; both full runs agreed at 107/1075. `npx jest --listTests` returns 107 paths and includes
`HostLobbyModalUrl.test.ts`, confirming the new file is actually executed rather than silently skipped.

**The `0197` jest-worker `SIGSEGV` did not occur in either run** — zero matches for `SIGSEGV` /
`Segmentation` in the output. Reporting that as "did not hit this time", not as evidence the flake is
fixed.

Integration tests (`tests/integration/*.it.test.ts`) are excluded from `npm test` by design and were
**not** run — they need a live Postgres. Unchanged by this task either way.

---

## §4e — documentation

Two additions to `ai-agents/knowledge-base/architecture.md` (the existing home; **no new file**, and
**nothing written under `ai-agents/wiki-vault/`**):

1. **§5, The Flashist / Yandex layer** — a blockquote establishing that `windowOrigin` is a *document*
   base, not a URL-join base; that the worker API is host-root in all three environments (with the
   nginx / webpack / dev:remote evidence); the root-absolute rule for host-root APIs; why the invite
   link is the one correct `windowOrigin` use and must take no separator; and the instruction to test
   any such fix at a non-root pathname.
2. **§9, Build, run, test** — a discrimination table for the two lookalike lobby traps (empty public
   list = port 3001 squatted / worker 0 dead, vs. private Start Game silently dead = this defect), plus
   the non-root-harness testing note.

**Follow-up owed:** route `/fkit-wiki-sync` to `@fkit-wiki` so the vault picks this up. Not done here —
the vault is that role's exclusive write surface.

---

## Decision log — actions taken under standing approval

Per ADR-019's audit obligation, carried onto the sprint-ship-loop path by ADR-032.

| # | What | Why it qualified |
|---|---|---|
| 1 | Applied §4a/§4b/§4c/§4d verbatim as approved | Directly in the approved plan; no judgment exercised |
| 2 | Kept the step-7 unit test instead of dropping it | The plan sanctioned both branches and set the criterion (mock scaffolding ≤ ~60 lines). Measured ~30 lines → keep. Mechanical application of the plan's own rule, not a new call |
| 3 | Additionally proved the unit test fails on pre-fix source (temporary local revert, then restored) | Verification only, no net source change; the plan's "do not overstate a unit test" warning is better served by evidence than by assertion |
| 4 | Deleted browser-test artifacts I created in the repo root (`.playwright-mcp/`, two `.png`, two `.yml`) | Cleanup of my own scratch output; no project file touched |

**Obvious-winner calls made: none.** Nothing required choosing between competing options.
**Judgment calls escalated: none arose** — no finding fell outside the plan and its three amendments.

---

## Residuals — recorded, not fixed

1. **Production proof outstanding.** Step 9 cannot run locally. The fix must ride the deploy carrying
   `0062`/`0063` (amendment 3). Until then the production symptom is unverified-as-fixed.
2. **`startGame()`'s `console.error` branch not executed** (see §4d above) — verified by symmetry only.
3. **Yandex portal invite semantics — product question, untouched.** On Yandex Games players sit inside
   the portal iframe, so a `geoconflict.ru` invite takes the recipient *outside* the portal entirely.
   The fix makes the link serve the right template; whether the Yandex build should instead emit a
   portal-relative invite is a product decision, flagged in the plan (§3) and not decided here.
4. **`copyToClipboard()` drops `location.search`,** unlike `AccountModal.viewGame` which uses
   `path + search + hash`. Noted in the plan, deliberately not changed.
5. **Wiki sync owed** to `@fkit-wiki` for the architecture.md delta.
6. **Not committed, not pushed, task file not moved** — per standing rules.

---

## R1 fix (2026-08-28) — docs-only, owner-ruled

**Finding (review R1, low, docs-only).** The §5 note added to
`ai-agents/knowledge-base/architecture.md` said a worker route concatenated onto `windowOrigin`
"misses the worker route and 404s". True for this task's calls (PUT/POST), wrong as the general rule.

**Verified against code before writing.** `src/server/Master.ts:689-691` is an unconditional SPA
fallback — `app.get("*")` → `res.sendFile(static/index.html)`, no status set, so **200**. In
production the mis-built path matches none of `nginx.conf`'s specific locations (`\.html$` needs the
path to *end* in `.html`; `^/w\d+` needs start-of-path), so it falls to `location /` (`nginx.conf:289`)
and is proxied to the master. End-to-end: an unmatched **GET** returns **200 with SPA HTML**, and the
consumer fails on a JSON parse, not a network error — the harder failure to spot. Non-GET verbs still
404 (no matching route, no `app.all`/`app.post` catch-all).

**Change.** One sentence in `architecture.md` §5 split into two: non-GET → 404; GET → 200 with
`static/index.html`, cited to `Master.ts:689-691`. **Scope: that one file.** No source, no tests, no
`ai-agents/wiki-vault/` (the vault ingested the imprecise sentence; re-sync routed to `@fkit-wiki`).

**Decision log for this round.** Fix applied without a per-fix ask under the sprint-ship-loop's
standing approval — the owner ruled "fix it now" via `AskUserQuestion` in the fkit-lead session, and
the change is verified-`CORRECT`, mechanical, and confined to the single file the ruling named.
**Obvious-winner calls: none.** **Judgment calls escalated: none arose.** Not committed, not pushed,
task file not moved.
