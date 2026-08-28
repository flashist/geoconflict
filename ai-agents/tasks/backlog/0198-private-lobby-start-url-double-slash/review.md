# Review — 0198

Task: `ai-agents/tasks/backlog/0198-private-lobby-start-url-double-slash/brief.md`
Plan: `ai-agents/tasks/backlog/0198-private-lobby-start-url-double-slash/plan.md` (incl. Owner amendments 1–3, 2026-08-28)
File(s) under review:
- `src/client/HostLobbyModal.ts` — lines 734–847 only (`putGameConfig`, `startGame`, `copyToClipboard`)
- `tests/client/HostLobbyModalUrl.test.ts` (new)
- `ai-agents/knowledge-base/architecture.md` §5 (lines 256–273) and §9 (lines 704–718)
- `ai-agents/tasks/backlog/0198-.../worklog.md` (new)

Base: `c99110f`. Scope: working tree.
**Out of scope, verified excluded:** `HostLobbyModal.ts:26` (`import { renderCitizenBadge }`) and
`:546` (`${client.isCitizen ? renderCitizenBadge() : ""}`) belong to task `0068`; every other modified
or untracked file in the tree belongs to `0067`/`0068`, both closed. Boundary confirmed by
`git diff c99110f -- src/client/HostLobbyModal.ts` and `-- ai-agents/knowledge-base/architecture.md`
(both architecture.md hunks are 0198's; no 0067/0068 content in that file).

Round 1 verdict: **✅ Ready to merge (validation-gated — production proof outstanding by design).**

**Close-out verdict (round 2, 2026-08-28): ✅ Review closed — R1 fixed and re-verified, all six
residuals owner-confirmed, the open product question re-homed to task `0199`. Terminal state is
`🚧 Blocked — awaiting deploy proof`, NOT Done — the production symptom is still unverified-as-fixed.**

Status: **review closed / task blocked on deploy proof**

## Reviewer findings

| #  | Round | Sev | file:line | Claim |
|----|-------|-----|-----------|-------|
| R1 | 1     | low | `ai-agents/knowledge-base/architecture.md:263` | Docs completeness: "…`/yandex-games_iframe.html/w1/api/…`, which misses the worker route and **404s**" is true only for non-GET verbs. `Master.ts:689` (`app.get("*")` → `sendFile(static/index.html)`) means a **GET** built the same wrong way returns **200 with the SPA HTML**, not a 404 — a harder-to-spot failure (a JSON parse error, not a network error). The two calls this task fixed are PUT and POST, so the sentence is correct for them; the general rule stated two lines later ("Anything built by concatenating onto `windowOrigin` is suspect") would mislead a future reader applying it to a GET. Docs-only, non-blocking. |

No other findings. Neither reviewer produced a code defect.

**Disproven / not raised (recorded so the coder is not asked to chase them):**
- *Test leaks globals into other suites* — considered and rejected. `global.fetch` and
  `Object.assign(navigator, {clipboard})` are per-file in Jest's jsdom environment; no cross-suite reach.
- *Root-absolute path breaks a split client/API origin* — no such deployment exists.
  `Transport.ts:317-320` already hard-codes `window.location.host` for the worker WebSocket; a split
  origin would already have broken multiplayer. `nginx.conf:301` mounts `^/w(\d+)(/.*)?$` at the host
  root, `webpack.config.js:103-115` proxies `context: ["/w<N>"]`, `webpack.config.js:58` matches
  `/^\/w\d+(\/|$)/` for `dev:remote`.
- *Invite link could double a hash or swallow a query* — `windowOrigin` is
  `origin + pathname` (`FlashistFacade.ts:343-344`), which excludes both hash and search **by
  construction**, so `${windowOrigin}#join=` cannot produce a double hash at any base shape.
  (The dropped `location.search` is a recorded residual, below.)
- *`console.error` leaks sensitive data* — logs `response.status` + `response.statusText` only. No
  lobby id, token, username, or body. The adjacent pre-existing `pollPlayers` log
  (`HostLobbyModal.ts:866`) already dumps the full `GameInfo` JSON including usernames, so the new
  lines add no exposure.
- *ADR-109 conflict* — none. The change keeps `config.workerPath(id)` client-computed and introduces
  no registry, remap, or published placement. ADR-109's re-raise conditions are not met.

**Observation, no action required:** `response.statusText` is an empty string over HTTP/2 in browsers.
If the host TLS terminator serves HTTP/2, the production log reads `Failed to push lobby config: 404 `.
The status code — the load-bearing part — still lands. Not worth a change.

## Coder response

_(coder-owned — do not write here)_

| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R1 |         |                   |        |        |

## Accepted residuals (shared, do-not-re-litigate)

**Owner disposition, 2026-08-28 (via `AskUserQuestion` in the lead session, relayed by
`fkit-sprint-ship-loop`): all six CONFIRMED as recorded, wording unamended.** The owner noted
explicitly that each residual carrying a **re-raise condition** is what makes these *dispositions*
rather than silent write-offs — the conditions below are binding and survive this close-out.

- **Production proof outstanding** — What: the task ends at `🚧 Blocked — awaiting deploy proof`; step 9
  needs the deploy that also carries `0062`/`0063` · Why (structural): owner amendment 3, 2026-08-28 —
  one deploy clears three rows · Re-raise only if: the deploy ships and the production check fails, or
  the fix is proposed for a deploy that `0062`/`0063` are not in.
- **Console-only error visibility, no analytics event** — What: two `console.error` lines on non-OK; no
  abort, no UI, no translation keys, no retry, no analytics · Why (structural): owner amendment 2 —
  an analytics event would need a new `flashistConstants.analyticEvents` key plus an update to
  `analytics-event-reference.md`, scope creep against the small-and-low-risk ruling for a fix riding a
  shared deploy; the option was offered and declined · Re-raise only if: the failure is observed in
  production and console logs prove insufficient to diagnose it.
- **`copyToClipboard()` drops `location.search`** — What: the invite link carries origin + pathname +
  hash, never the query string · Why (structural): recorded in the plan, deliberately unchanged; the
  join flow reads only `#join=`; widening the invite's surface is not this fix's job · Re-raise only if:
  a query parameter becomes load-bearing for a joining client.
- **`startGame()` error branch verified by symmetry, not execution** — What: the `putGameConfig()`
  `!response.ok` branch was driven live with a forced 400; `startGame()`'s twin was not, because its
  probe hung on `showInterstitial()` · Why (structural): the two branches are character-identical apart
  from the message string, over standard `Response.ok`/`status`/`statusText` fields; forcing it would
  have meant stubbing the ad interstitial · Re-raise only if: the two branches diverge in shape.
- **Worker placement / dead-worker routing** — What: untouched (ADR-109) · Why (structural): recorded,
  owner-accepted tradeoffs · Re-raise only if: a diff changes routing, readiness, or publishes
  placement to the client.
- **Jest-worker `SIGSEGV`** — What: environmental flake tracked as `0197` · Why (structural): hit five
  distinct suites today, unrelated to this surface · Re-raise only if: it reproduces deterministically
  on this task's suites.

**Re-homed — no longer an open question in this ledger (owner ruling, 2026-08-28):**
- **Yandex portal invite semantics** — a `geoconflict.ru` invite link takes a recipient outside the
  portal iframe. Raised during `0198`, and **not** a defect in this diff; the link shape is now correct
  for whatever the answer turns out to be. The owner ruled it must not stay as an undecided note inside
  a closing task's ledger, where it would be lost, and had it filed as its own product question:
  **`ai-agents/tasks/backlog/0199-yandex-invite-link-leaves-portal-iframe/brief.md`** — *"should the
  Yandex build produce a portal-relative invite?"*, cross-referenced back to `0198` as its source.
  Brief confirmed present on disk at close-out; it explicitly separates itself from `0198` (a fixed bug)
  and is filed on the **Backlog** board at producer rank, **not** an owner-ruled priority.
  **Nothing about `0199` is open work for `0198`.**

## Verification record — round 1

Both reviewers ran. **No degradation; coverage is complete.**

| Reviewer | Outcome |
|---|---|
| fkit-reviewer (own pass, Claude) | 1 finding (R1, low, docs) |
| Codex adversarial (`codex-cli 0.145.0`, `codex exec --sandbox read-only`) | **Findings: none**, with explicit per-category coverage of URL shape, environment risk, invite link, `console.error`, the unit-test guard, and architecture prose |

**Gates re-run by the reviewer (not taken on trust):**

| Gate | Result |
|---|---|
| `npm test` | **107 suites / 1075 tests passed**, exit 0 — matches the coder's report exactly |
| `SIGSEGV` occurrences this run | **0** |
| `npm run lint` | exit 0, no output |
| `npx tsc --noEmit` | exit 0, no output |
| `npx jest tests/client/HostLobbyModalUrl.test.ts` (post-fix) | 3/3 pass |

**Pre-fix-failure claim — independently verified.** `git archive c99110f | tar -x` into a scratch
directory (the working tree was never touched, nothing was reverted in place), `node_modules`
symlinked, the new test copied in, run against the **pre-fix** source
(`${FlashistFacade.instance.windowOrigin}/${config.workerPath(id)}/api/...`):
**3 of 3 tests failed.** The received values were
`https://geoconflict.ru/yandex-games_iframe.html/w1/api/game/TESTLOBBY`,
`…/w1/api/start_game/TESTLOBBY`, and `…/yandex-games_iframe.html/#join=TESTLOBBY`.
The test is a real guard, and it fails on the **document-path-prefix** shape — **not** on a double
slash. Claim holds.

**The fix addresses the path-prefix miss, not the slash — confirmed.** The two URLs are now bare
root-absolute (`/${config.workerPath(id)}/api/…`), identical in idiom to the five sibling call sites
that already work in production: `HostLobbyModal.ts:858` (`pollPlayers`), `:889` (`createLobby`),
`JoinPrivateLobbyModal.ts:211,314`, `Matchmaking.ts:110`, `LocalServer.ts:316`. They no longer
reference `windowOrigin` at all, so no slash-collapsing behavior is involved anywhere in the fix.

**Blast-radius checks from the plan — all confirmed:**
- `windowOrigin`'s **value is unchanged** (`FlashistFacade.ts:343-344` untouched); `Cosmetics.ts:49`
  and `AccountModal.ts:253` are not in the diff at all. Brief step 7 holds by construction.
- `rootPathname` (`FlashistFacade.ts:345`) and all **5** `changeHref` consumers untouched:
  `Main.ts:662`, `WinModal.ts:345`, `TutorialLayer.ts:318`, `GameRightSidebar.ts:136`,
  `SettingsModal.ts:160`. Non-root support does not regress.
- Invite fix correct at every base shape: `https://h/` → `https://h/#join=X`;
  `https://h/index.html` → `https://h/index.html#join=X`; `https://h/dir/` → `https://h/dir/#join=X`.
- `console.error` additions (`:778-782`, `:829-833`) fire only on `!response.ok`, do not throw or
  abort (the function still returns `response`), add no UI and no translation keys, and log only
  status + statusText.
- `architecture.md` §5/§9 claims checked against source: `nginx.conf:301` (`^/w(\d+)(/.*)?$`),
  `nginx.conf:234` (`\.html$`), `webpack.config.js:58,103-115`, `Master.ts:689` (SPA fallback →
  `static/index.html`, which is why the trailing-slash invite silently served the standalone template),
  `Worker.ts:541` + `:561` (`server.listen` with no `error` listener; `process.on("uncaughtException")`
  logs without exiting, so an `EADDRINUSE` on 3001 leaves the worker alive but never `WORKER_READY`),
  `FlashistFacade.ts:343-344`, ADR-109 exists at
  `ai-agents/knowledge-base/decisions/adr-109-worker-index-fixed-placement-contract-move-the-id.md`.
  All accurate; R1 is the single completeness gap.

## Convergence

Round 1, first pass on this surface. One low-severity documentation finding, zero code defects, both
reviewers run, all automated gates re-run green, and the pre-fix-failure claim independently
reproduced. Nothing here re-litigates a settled residual. **Recommend proceeding to deploy**; R1 is a
one-sentence docs improvement that need not gate it.

---

## Round 2 — owner dispositions recorded, close-out (2026-08-28)

Phase 2 of the stateful review. **No new review passes were run** and none were warranted: the only
change since round 1 is a documentation edit. No new findings were raised, and no round-1 finding was
re-litigated.

### Owner dispositions

| Q | Question put to the owner (round 1) | Owner ruling | Recorded outcome |
|---|---|---|---|
| 1 | R1 — the GET-vs-404 docs nuance | **Fix now** | Fix applied by a coder and **independently re-verified by the reviewer** (below). R1 → **fixed**. |
| 2 | The six accepted residuals | **Confirmed as recorded, wording unamended** | Recorded in *Accepted residuals*; re-raise conditions remain binding. |
| 3 | Yandex portal invite semantics | **File as its own brief; do not leave it dangling here** | Re-homed to `0199`; the ledger entry now points at that brief. |

### R1 — verification of the amended text

Amended clause (`ai-agents/knowledge-base/architecture.md`, §5 `windowOrigin` note):

> A **non-GET** call (this task's are PUT/POST) 404s; a **GET** is worse — nginx's catch-all
> `location /` proxies it to the master, whose SPA fallback `app.get("*")` (`Master.ts:689-691`)
> returns **200 with `static/index.html`**, so the caller fails on a JSON parse rather than a network
> error.

Every clause re-checked against source at close-out — **accurate, and it does not overclaim in a new
way**:

| Claim in the amended text | Verified against | Result |
|---|---|---|
| The mis-built path matches no specific nginx location | `nginx.conf` locations `= /`, `= /api/public_lobbies`, `= /api/env`, `= /commit.txt`, `~* \.(jpg\|…)$`, `~* ^/maps/.+\.json$`, `~* \.(bin\|…)$`, `~* \.js$`, `~* \.css$`, `~* \.html$` (`:234`), `~* ^/w(\d+)(/.*)?$` (`:301`) | ✅ `\.html$` is anchored to end-of-path and the path ends in the lobby id; `^/w(\d+)` is anchored to start-of-path and the path starts `/yandex-games_iframe.html`. Neither matches. |
| Falls through to catch-all `location /`, proxied to the master | `nginx.conf:289-298` → `proxy_pass http://127.0.0.1:3000`; `ServerEndpoints.ts:1` `MASTER_HTTP_PORT = 3000` | ✅ |
| GET hits the SPA fallback and returns 200 with `static/index.html` | `Master.ts:689-691` — `app.get("*", (req,res) => res.sendFile(.../static/index.html))`, **no status set** (Express defaults to 200); `express.static` (`Master.ts:82-83`) finds no such file, so it falls through | ✅ |
| No `app.all` / `app.post` catch-all, so **non-GET still 404s** | Full route sweep of `src/server/Master.ts`: the only catch-all is `app.get("*")`; every `app.post` is a fixed path (`/api/feedback:228`, `/api/subscribe:339`, `/api/kick_player/:gameID/:clientID:393`); `express.static` serves GET/HEAD only | ✅ Express's default handler 404s the PUT/POST. |
| "the caller fails on a JSON parse" | `HostLobbyModal.pollPlayers()` (`:857-865`) is a real GET on this exact route shape and does `.then((response) => response.json())` with no `!response.ok` guard — a 200 HTML body rejects in `json()` | ✅ Concretely borne out by a caller in the same file. |

**Nit, recorded not raised — the fix did not introduce it and it does not gate anything.** "…rather
than a network error" is loose: a 404 is not a network error either; `fetch` resolves in both cases,
which is precisely why the `!response.ok` guard the task added works at all. The load-bearing contrast
the sentence draws — *detectable failure* vs *silent 200* — is correct, and the surrounding paragraph
shows the resolved-response idiom, so a reader is not led anywhere false. **Not a finding.**

**Pre-existing looseness in a neighbouring sentence, also recorded not raised.** The invite sentence
("a trailing `/` makes the path stop matching nginx's `\.html$` rule and silently serves the standalone
`index.html`") attributes the file substitution to the wrong layer. The first half is true — a trailing
slash does stop matching `~* \.html$` — but **both** that location and `location /` `proxy_pass` to the
same master on `:3000` (`nginx.conf:235` and `:290`), so nginx never picks the file. The substitution
happens in Express: `/yandex-games_iframe.html` hits a real file via `express.static`, while
`/yandex-games_iframe.html/` misses it and falls to the SPA fallback. **The stated consequence is
correct**; only the named mechanism is off by one layer. This sentence predates the amendment and was
not what the owner ruled on. Flagged here so it is on the record, deliberately **not** reopened —
reopening a correct-outcome docs sentence at close-out would be exactly the review-loop churn the
residual discipline exists to stop. Fold it into the next architecture-doc pass if convenient.

Rest of the §5 / §9 additions re-confirmed unchanged and still accurate (round-1 evidence stands;
`Master.ts` and `nginx.conf` are both untouched since — `Master.ts` 2026-08-27 22:47, `nginx.conf`
2026-07-15).

### Tree-delta check — nothing else moved

Files modified **after** the round-1 ledger write (`review.md`, 2026-08-28 20:12), by mtime sweep over
the repo excluding `node_modules/`, `.git/`, `static/`:

| File | Owner | In scope? |
|---|---|---|
| `ai-agents/knowledge-base/architecture.md` (20:26) | the R1 fix | ✅ expected |
| `ai-agents/tasks/backlog/0198-…/worklog.md` (20:26) | `0198` worklog note | ✅ expected |
| 15 files under `ai-agents/wiki-vault/` | `@fkit-wiki` — separate routed vault correction for the same GET/404 nuance | ✅ **not this review's scope**, and not written by the coder |

**No source file, no test file, and none of `0067`/`0068`/`0198`'s uncommitted source changed.**
`src/client/HostLobbyModal.ts` (20:01) and `tests/client/HostLobbyModalUrl.test.ts` (20:00) both
predate the round-1 ledger write, i.e. they are the exact files the round-1 gates ran against. Evidence
is mtime-based, not a byte-level diff against a stored round-1 snapshot — stated plainly rather than
overclaimed.

### Gates — deliberately NOT re-run, with the reason

| Gate | Round-1 result | Round-2 action |
|---|---|---|
| `npm test` | 107 suites / 1075 tests passed, exit 0 | **not re-run** |
| `npm run lint` | exit 0 | **not re-run** |
| `npx tsc --noEmit` | exit 0 | **not re-run** |

Judgment, per the caller's "only if you judge it necessary": the round-2 delta is **documentation-only**
and the source and test files are unchanged since the green round-1 run, so the gates cannot have moved.
Against that, `0197`'s jest-worker `SIGSEGV` hit five distinct suites today, so a re-run carries a real
chance of a **false** red that would muddy a close-out it cannot legitimately inform. **The 107 / 1075 /
exit-0 numbers therefore stand on the round-1 run, not on a round-2 re-run** — recorded so no reader
mistakes this for a fresh green.

### Coder response section — left empty by design

The *Coder response* table above still has no verdict row for R1. The coder applied the fix directly
under the owner's "fix now" ruling without round-tripping the section, and that section is coder-owned —
**the reviewer must not write into it.** Recorded here instead: R1 is **fixed and reviewer-verified**;
the empty row is a bookkeeping gap, not an outstanding action.

### Terminal state — NOT Done

**`0198`'s correct terminal state is `🚧 Blocked — awaiting deploy proof`.** The review is closed; the
task is not finished. Step 9 (the production check) still needs the deploy that also carries `0062` /
`0063`, which the owner ruled ships as one release. **The production symptom — private-lobby Start Game
doing nothing — remains unverified-as-fixed in production.** Nothing in this close-out asserts
otherwise.

The task file must **not** move to `done/`. Any close routes through a spawned `@fkit-producer`, and in
this case cannot happen at all until production proof exists.

### Convergence

**Converged — close.** Two rounds, one low-severity documentation finding raised and fixed, zero code
defects across both reviewers, six residuals owner-confirmed with their re-raise conditions intact, and
the one genuinely open product question moved out to `0199` rather than left dangling. Round 2 surfaced
no new defect and re-litigated nothing. **Further review rounds on this surface would produce churn, not
findings** — the only information that can still change this task's disposition is the production check
after deploy, which is not a review activity. Ledger closed.
