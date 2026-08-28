# Plan — Task 0198: Private-Lobby Start URL Misses the Worker Route

## Approval record

**Approved by the owner on 2026-08-28**, via `AskUserQuestion` in the fkit-lead session, driven by
`/fkit-sprint-ship-loop`. The plan below is the text returned by the planning `fkit-coder` worker,
reproduced verbatim, **followed by the owner amendments at the end of this file.** Where an amendment
and the plan body disagree, **the amendment wins.**

⚠️ **Honesty note on this gate (ADR-031 / ADR-032 D7).** On the orchestrated sprint-ship-loop path,
"no source before the owner approves the plan" is enforced by a **prompt instruction to the spawned
worker, not by plan mode's structural write-wall** — that wall cannot run in a spawned worker, which has
no owner channel (ADR-021). The owner was told this plainly. Do not later rewrite this into a claim of a
structural guarantee.

---

## Summary

- **Second production symptom CONFIRMED, not refuted.** Measured live 2026-08-28:
  `https://geoconflict.ru/yandex-games_iframe.html/` returns HTTP 200 serving the **standalone
  `index.html`** (10795 B, md5 `c2549867…` — byte-identical to `/` and `/index.html`), *not* the Yandex
  template (8359 B, md5 `2e38023b…`, the only one containing `flashist_isYandexPlatform`). So invites
  copied from the Yandex build **do** land recipients on the wrong entry point. The producer's derived
  claim was right; confirmed impact is wider than the brief's measured set.
- **Root cause and fix location settled with in-repo evidence.** The worker API is mounted at **host
  root** in all three environments; `windowOrigin` carries the *document* path. Fix goes **at the three
  join sites in `HostLobbyModal.ts`**; `windowOrigin` itself is **not touched**, so `Cosmetics.ts` and
  `AccountModal.ts` are untouched (blast radius = 0 beyond one file).
- **The two API URLs become bare root-absolute paths** — byte-for-byte the idiom already used by **5
  sibling call sites**, two of them 30 lines below in the same file, which work in production today.
  This is smaller than a helper and not a refactor.
- **The invite URL is fixed by deleting one `/`** (hash appends directly to a URL). It keeps
  `windowOrigin` — that call site is the one place the fork's adaptation is *correct*.
- **A clean, SDK-free local non-root harness exists: `http://localhost:9000/index.html`** — pathname
  `/index.html` reproduces the exact production failure shape with no Yandex SDK dependency. This is the
  test that proves the non-root case.
- **No collision with in-flight work.** `0068`'s diff to `HostLobbyModal.ts` is 2 added lines at 26 and
  546; this change surface is 734–838. Verified by hunk headers, not assumed.
- **Cannot be closed by this work.** Step 8 (post-deploy production check) is not runnable locally; the
  task ends at `🚧 Blocked — awaiting deploy proof`.

---

## 1. Root cause — restated precisely

`src/client/flashist/FlashistFacade.ts:343-345`:

```ts
public windowOrigin: string =
  window.location.origin + window.location.pathname;
public rootPathname: string = window.location.pathname;
```

`windowOrigin` is a **document base**. It is correct for "stay in this document" purposes and wrong as a
**URL join base**, because the worker API is mounted at the **host root**, not under the document.

Evidence the worker API is host-root, from three independent parties:

| Party | Evidence |
|---|---|
| Production nginx | `nginx.conf`: `location ~* ^/w(\d+)(/.*)?$` — anchored at path start |
| Local dev | `webpack.config.js` `createLocalProxyConfig()`: `context: ["/w0"|"/w1"|"/w2"]` — literal prefix |
| `dev:remote` | `webpack.config.js` `createRemoteProxyConfig()`: `isWorkerPath = /^\/w\d+(\/|$)/` — anchored regex |
| Client itself | `src/client/Transport.ts:315-320` builds the WebSocket URL as `window.location.host` + `/${workerPath}` — root-absolute, and it works on Yandex today |
| Recorded decision | `ai-agents/wiki-vault/wiki/decisions/adr-109-worker-index-placement-contract.md` records the `/w<N>/` path prefix as a fixed placement contract shared by client, worker, nginx and master |

So `windowOrigin` must never appear in front of `/w<N>/…`. Three surfaces, one cause.

**Why the adaptation over-applied.** `windowOrigin` looks like a blanket substitution for upstream's
`window.location.origin` (the original line survives commented out above every call site). It is right
for the 2 payload consumers and the invite hash, wrong for the 2 API joins.

---

## 2. Blast radius — full enumeration

`windowOrigin` has exactly **5 read sites** (`grep -rn "windowOrigin" src/`):

| Site | Use | Correct today? | Touched by this plan |
|---|---|---|---|
| `HostLobbyModal.ts:739` `putGameConfig()` | PUT `…/w<N>/api/game/<id>` | ❌ broken | ✅ replaced with root-absolute path |
| `HostLobbyModal.ts:811` `startGame()` | POST `…/w<N>/api/start_game/<id>` | ❌ broken | ✅ replaced with root-absolute path |
| `HostLobbyModal.ts:829` `copyToClipboard()` | invite `…/#join=<id>` | ❌ broken (verified §3) | ✅ separator `/` deleted, `windowOrigin` kept |
| `Cosmetics.ts:49` | `hostname` payload field | out of scope | ❌ untouched |
| `AccountModal.ts:253` | `redirectDomain` payload field | out of scope (`0069`/`0070`) | ❌ untouched |

`rootPathname` has **5 read sites** (`Main.ts:662`, `WinModal.ts:345`, `TutorialLayer.ts:318`,
`GameRightSidebar.ts:136`, `SettingsModal.ts:160`) — all `changeHref(rootPathname)` "back to start
screen". **All untouched.**

**Because `windowOrigin`'s value does not change, brief verification step 7 is answered trivially:
`Cosmetics.ts` and `AccountModal.ts` send exactly what they send today.** That is the reason to fix at
the join rather than at the definition — the alternative would require proving two payload contracts
that cannot be observed from this repo.

A sweep for every other `location.origin` / `location.pathname` / `location.href` use in
`src/client/` found nothing else building a worker-API URL. `AccountModal.ts:98-101` (`viewGame`)
already does the right thing — `path + search + hash` — which is precedent for the invite fix shape.

---

## 3. Invite link — **VERIFIED live, not refuted**

Method: four `curl -L` requests against production, comparing body size and md5, and grepping each body
for `flashist_isYandexPlatform`.

| URL | Status | Size | md5 | Yandex flag present |
|---|---|---|---|---|
| `https://geoconflict.ru/` | 200 | 10795 | `c254986753f2625de6c274611b6f4254` | no |
| `https://geoconflict.ru/index.html` | 200 | 10795 | `c254986753f2625de6c274611b6f4254` | no |
| `https://geoconflict.ru/yandex-games_iframe.html` | 200 | 8359 | `2e38023be59536735d6160bbac77ce9b` | **yes** |
| `https://geoconflict.ru/yandex-games_iframe.html/` | 200 | 10795 | `c254986753f2625de6c274611b6f4254` | no |

The trailing-slash URL serves the **standalone** template — exactly as the producer reasoned from
`nginx.conf` (path no longer ends `.html` → falls to `location /` → `app.get("*")` at
`Master.ts:689-691` → `static/index.html`). The mechanism and the outcome both check out.

**Player consequence:** a recipient of a Yandex-build invite gets the standalone document, so
`window.flashist_isYandexPlatform` is never set (`yandex-games_iframe.html:19`). `FlashistFacade`'s
constructor then falls back to the `YaGames` global check, which is also absent — the invited player
runs in non-Yandex mode. Join itself still functions (`Main.ts:645` and
`JoinPrivateLobbyModal.ts:146-159` read only the hash, path-agnostic), so this is a **platform-mode**
defect, not a join failure.

Covered by the same fix: `windowOrigin + "#join=" + id` yields `…/yandex-games_iframe.html#join=<id>`,
whose path **does** end in `.html` — the row above proves that path serves the Yandex template.

*Noted, not fixed:* on Yandex Games players sit inside the portal iframe, so a `geoconflict.ru` invite
link takes a recipient outside the portal entirely. That is a product question (does the Yandex build
want a portal-relative invite?), not this task's. `copyToClipboard` also drops `location.search`, unlike
`AccountModal.viewGame`. Both recorded, neither changed.

---

## 4. Change surface

### 4a. `src/client/HostLobbyModal.ts` — `putGameConfig()` (~734-776)

Replace the base and the stale upstream comment:

```ts
// Flashist Adaptation: root-absolute, NOT `FlashistFacade.instance.windowOrigin`.
// windowOrigin is origin + document pathname, but the worker API is mounted at
// the host root (nginx `^/w(\d+)`, webpack proxy context `/w<N>`), so joining
// onto it prefixes the document path and misses the worker route entirely.
`/${config.workerPath(this.lobbyId)}/api/game/${this.lobbyId}`,
```

### 4b. `src/client/HostLobbyModal.ts` — `startGame()` (~794-821)

Same treatment:

```ts
`/${config.workerPath(this.lobbyId)}/api/start_game/${this.lobbyId}`,
```

Both now match `pollPlayers()` (`:842`) and `createLobby()` (`:873`) in this same file, plus
`JoinPrivateLobbyModal.ts:211,314`, `Matchmaking.ts:110`, `LocalServer.ts:316`.

### 4c. `src/client/HostLobbyModal.ts` — `copyToClipboard()` (~823-838)

```ts
// Flashist Adaptation: windowOrigin is correct here — the invite should keep the
// current document (…/yandex-games_iframe.html). No separator: a trailing "/"
// makes the path stop matching nginx's `\.html$` and serves index.html instead.
`${FlashistFacade.instance.windowOrigin}#join=${this.lobbyId}`,
```

Correct at every base shape: `…/` → `…/#join=`; `…/x.html` → `…/x.html#join=`; `…/dir/` →
`…/dir/#join=`.

### 4d. Error visibility (brief step 3) — **KEEP** (owner-ruled; see amendment 2)

Minimal, in both `putGameConfig()` and `startGame()`, before `return response`:

```ts
if (!response.ok) {
  console.error(
    `Failed to push lobby config: ${response.status} ${response.statusText}`,
  );
}
```

Deliberate scope boundaries — **and what is deliberately NOT done**:

- **No abort on failure.** `startGame()` awaits `putGameConfig()`; making a failed config push block the
  start would be a behavior change that turns "starts with default settings" into "does not start". Log
  only.
- **No new UI, no translation keys** (would require `en.json` + `ru.json` sync).
- **No retry.**
- **No analytics event** — that would mean a new `flashistConstants.analyticEvents` enum key plus an
  update to `analytics-event-reference.md`, which is scope creep against the owner's small-and-low-risk
  ruling. **Owner considered and declined this; see amendment 2.**

**Not touched:** `FlashistFacade.ts`, `nginx.conf`, `webpack.config.js`, `Master.ts`, any server file.
**One source file changes.**

### 4e. Documentation (brief step 5) — existing home, no new file

The port-3001 / dead-worker-0 trap lives **only in the owner's Claude memory, outside the repo**. The
repo's existing home for this material is `ai-agents/knowledge-base/architecture.md`. Two small
additions:

1. **§5 "The Flashist / Yandex layer"** — the generalizable one: *`windowOrigin` = origin + document
   pathname; the game is served at `/yandex-games_iframe.html` on Yandex Games; therefore anything built
   by concatenating onto `windowOrigin` is suspect in production. Root-absolute paths for host-root
   APIs.*
2. **§9 "Build, run, test"** — the two-trap discrimination table: *public lobby list empty + private
   lobby works → port 3001 squatted, worker 0 dead; private Start Game does nothing + public fine →
   this defect.*

Then route a `/fkit-wiki-sync` to `@fkit-wiki` for the vault. **Write nothing under
`ai-agents/wiki-vault/`.**

---

## 5. Test plan — the non-root case is the load-bearing one

**Pre-flight:** `lsof -i :3001 -i :3002` must be clear (the sibling trap would silently invalidate the
whole run).

### Step 1 — reproduce on unfixed code, at **both** paths
`npm run dev`, create a private lobby, click Start Game, watch DevTools Network:

| Harness URL | `pathname` | Expected POST path | Expected |
|---|---|---|---|
| `http://localhost:9000/` | `/` | `//w<N>/api/start_game/<id>` | 404 — double-slash shape |
| `http://localhost:9000/index.html` | `/index.html` | `/index.html/w<N>/api/start_game/<id>` | 404 — **the production shape** |

`http://localhost:9000/index.html` is the key harness: standalone template, **no Yandex SDK**, non-root
pathname. It reproduces the production failure exactly without depending on a CDN.
`historyApiFallback: true` cannot rescue either, since these are PUT/POST.

Also run `http://localhost:9000/yandex-games_iframe.html` as the platform-faithful variant. **Known
risk:** that template sets `flashist_isYandexPlatform = true` and loads
`sdk.games.s3.yandex.net/sdk.js`, which will fail locally; `Bootstrap.ts`'s bounded 5 s deadline should
degrade rather than hang. If it does not load, `/index.html` remains the proof — **say so explicitly
rather than claim a pass.**

### Step 2 — after the fix, at both paths
POST path reads `/w<N>/api/start_game/<id>` (single leading slash) → **200**, from `/`, `/index.html`
and `/yandex-games_iframe.html` alike.

### Step 3 — config push, explicitly
Change map, difficulty and bot count; PUT to `/w<N>/api/game/<id>` → 200; **and the started game visibly
runs those settings**, not defaults. Verified at the non-root harness, since that is the production
case.

### Step 4 — live two-client run (the acceptance test `0068` could not do)
Second browser client joins via the copied link; both enter the same game; runs with no desync.
Performed at the **non-root** harness.

### Step 5 — invite link, before and after, both paths
Record the copied string and which document it serves. Production side is already measured (§3 table);
local side records the same before/after.

### Step 6 — `windowOrigin` unchanged
State plainly that `Cosmetics.ts` and `AccountModal.ts` are untouched and their production payload is
unchanged. Brief step 7 satisfied by construction.

### Step 7 — unit test, **time-boxed and honestly reported**
Attempt a `@jest-environment jsdom` test for `HostLobbyModal` that stubs `window.location.pathname` to a
non-root value, mocks `getServerConfigFromClient` and `global.fetch`, and asserts the fetch URL starts
with `/w`. Precedent exists (`tests/client/WinModal.test.ts`), **but that file needs ~10 `jest.mock`
calls**, and `HostLobbyModal`'s import graph is comparable or larger. **If the mock scaffolding exceeds
roughly 60 lines, drop it and record why in the worklog rather than ship a brittle test.** This is a
URL/proxy-routing defect whose real proof is the browser run; do not overstate a unit test as the proof.

### Step 8 — suite, lint, types
`npm test`, `npm run lint`, `npx tsc --noEmit`. Counts recorded. Per the brief, a Jest-worker `SIGSEGV`
is `0197`'s known flake — re-run and record **both** results rather than call it a regression.

### Step 9 — production check: **cannot be run locally**
Requires the deploy that also carries `0062`/`0063`. Task ends at **`🚧 Blocked — awaiting deploy
proof`**, not Done. **Do not claim a production pass that was not run.**

---

## 6. Risks and edge cases

| Risk | Assessment |
|---|---|
| Relative path changes the request origin | No. `windowOrigin`'s origin is already the page origin; both resolve to the same host. No CORS change. |
| A deployment where client origin ≠ worker-API origin | None found. `Transport.ts` already hard-codes `window.location.host` for the WebSocket to the same workers; if such a split existed, multiplayer would already be broken everywhere. `API_DOMAIN` / `getApiBase()` (`jwt.ts`) governs the separate account API, untouched here. |
| Breaking the fork's non-root support | Cannot: `rootPathname` and its 5 `changeHref` consumers are untouched, and `windowOrigin`'s value is unchanged. Only two URL *joins* and one separator move. |
| Collision with `0068`'s work | Verified none: `0068`'s hunks are `+26` and `+546`; this surface is 734–838. Do not reformat, revert or touch anything belonging to `0067` or `0068`. |
| Local repro can't reach a non-root path | Mitigated by `/index.html`, which needs no SDK. If even that fails, say so and treat step 9 as the only proof. |
| `merge_slashes` masking a regression at the root path | The root path works today and will keep working; the non-root harness is what discriminates a real fix from a slash-collapsing one, which is why it is mandatory in steps 2–4. |
| Silent-failure logging noise | Bounded: two `console.error` lines, only on non-OK. |

---

## 7. Sequencing

1. Reproduce (step 1, both paths) and record — before any edit.
2. Apply 4a–4c (the join fix).
3. Re-verify (steps 2–5).
4. Apply 4d (error visibility — **owner approved, keep**); re-run step 2.
5. Attempt 4e docs + step 7 test.
6. Step 8 suite/lint/types.
7. Write `worklog.md` in the task folder; hand to `@fkit-reviewer`.
8. Hand off at `🚧 Blocked — awaiting deploy proof`; route the close to `@fkit-producer` only after
   production proof exists.

**No commit, no push, no task-file move.**

---

# Owner amendments — 2026-08-28

Given by the owner via `AskUserQuestion` at the plan gate. **They are part of the approved plan.**

## Amendment 1 — the plan is APPROVED as written

Including the invite-link fix (§4c). The owner explicitly considered shipping only the Start Game /
config-push fix and **rejected that**: the invite defect is confirmed live, and it is a one-character fix
in the same file, so splitting it would cost more than it saves.

## Amendment 2 — error visibility: **KEEP, minimal form** (§4d)

The owner ruled to keep the two `console.error` lines — no abort, no UI, no translations, no retry.
Reasoning on the record: **the silence is precisely why a live, player-facing failure survived
undetected until a coder tripped over it while testing something else.** Removing the silence costs
about six lines and no behavior change.

**The analytics-event option was offered and declined.** It would have given production telemetry on how
often this fires, but at the cost of a new `flashistConstants.analyticEvents` enum key plus an update to
`ai-agents/knowledge-base/analytics-event-reference.md` — scope creep against the small-and-low-risk
ruling for a fix riding a shared deploy. Console-only stands.

## Amendment 3 — carried from the escalation rulings, 2026-08-28

- `0198` is ranked **top of Sprint 4's open work**, above the config track:
  `0198` → `0063` → `0062` → `0195` → `0064` → `0060`.
- `0198`'s fix **ships in the same production deploy as `0062`/`0063`** — one deploy clears three rows
  instead of two, rather than knowingly leaving a live defect out of a release that was right there.
- The task therefore comes back at **`🚧 Blocked — awaiting deploy proof`**, not Done. That is the
  expected terminal state for this run.
