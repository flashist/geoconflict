# Private Lobbies Are Silently Broken on Yandex Games — the Start Game URL Misses the Worker Route Entirely (and Blocks Local Testing Too)

## ID
0198

## Sprint
Sprint 4

## Priority
**High.** Live, player-facing, silent failure in production on the primary distribution channel.

🚨 **ESCALATED FROM MEDIUM 2026-08-28 — the producer's own escalation condition FIRED.** This brief was
filed the same day at **Medium**, carrying an explicit conditional: *"if the production page's
`window.location.pathname` is anything other than exactly `/`, this is ALSO a production defect and the
rank becomes High."* It was then measured — see *Deployed environments* in Context — and the pathname is
**`/yandex-games_iframe.html`**. The condition fired.

**The owner CONFIRMED the escalation on 2026-08-28**, via `AskUserQuestion` in the lead session, relayed
to the producer through the lead. What the owner confirmed is the **fact that decides the rank** — that
the Yandex Games embed loads that path — which is the one thing neither the browser measurement nor the
repository could establish. ✅ **This is the owner confirming the producer's escalation rule, NOT
overriding the producer's rank.** The Medium rank was correct on the evidence available when it was set;
the evidence changed.

**What is broken for players today:** on **Yandex Games — the primary distribution channel — starting a
private lobby silently fails, and the host's map, difficulty, bot count and game mode never reach the
worker.** Neither fetch checks `response.ok`, so **nothing surfaces to the player**: the lobby is
created, the joined-player list keeps refreshing, the modal closes on Start, and then nothing happens.
Public games are unaffected.

✅ **RANK AND SPRINT POSITION OWNER-RULED 2026-08-28** — ruled by the owner that day via `AskUserQuestion`
in the lead session, relayed to the producer through the lead. **This is not producer precedent for
re-ranking.** The producer proposed the merit position and flagged it; the owner accepted it.

> **`0198` sits at the TOP of Sprint 4's open work, above the whole config track.**
> **Execution order is therefore `0198` → `0063` → `0062` → `0195` → `0064` → `0060`**, superseding the
> order recorded in `0195`'s addendum and further down the sprint plan (both of which omit `0198`). The
> config track's internal order is otherwise unchanged.

**The owner's reasoning, recorded so it is not re-litigated** — the producer's recommendation accepted on
its own grounds:

- The config track's defects are **real but not yet player-visible** — `0054`'s client flag is OFF and
  `0018` has not gone live, so `0062`/`0063`/`0195` block a *launch*. This one is **failing for players
  right now**, in shipped functionality, on Yandex Games.
- It has **no sequencing hazard**. `0064` must land after `0062`/`0063`/`0195` or it correctly fails the
  very deploy that carries their fixes. This task depends on nothing and can ship alone.
- It is **client-only and small**, so it costs the config track almost nothing to let it go first.

**The earlier "producer's recommendation only — not a ruling, and not acted on" marker is CLOSED. Sprint
placement is no longer an open question on this brief.**

### 🚢 Deploy coupling — OWNER-RULED 2026-08-28

Same ruling session, same channel. **`0198` is fixed FIRST and ships in the SAME production deploy as
`0062` and `0063`.**

The owner chose this over *deploy now, fix later*. **Reasoning on the record:** it is a small client-only
change, and one deploy then clears **`0062`, `0063` and `0198`** instead of two — shipping a deploy
without it would knowingly leave a live player-facing defect out of a release that was right there.

**What this means in practice, for whoever runs the deploy:**

- The next production deploy is **expected to carry `0198`'s fix**. Do not ship `0062`/`0063` without it.
- ~~**`0198`'s own step 8 production check rides that same deploy** — so that one deploy is also what
  lets `0198` move off `🚧 Blocked — awaiting deploy proof`.~~ ✅ **The deploy happened (`362a2f9`), and
  step 8 is now WAIVED by owner ruling 2026-08-30** — it was never satisfiable, because the Yandex
  build's private-lobby buttons are hidden by the owner's own choice. See verification step 8.
- This is a **deploy coupling, not a dependency**. `0198` is still independently buildable and its
  `**Depends on:**` line still reads *nothing*. Nothing about `0062` or `0063`'s status changes.

⚠️ **The row was appended at the end of the status table, and that encodes no rank — the ruled position
above lives in prose only, exactly as `0195`'s does.** That board is unranked (every Priority cell reads
`—`), so row order carries no meaning there. The row was **not physically moved, and that is
deliberate**: moving it would mean inserting above the `✅ Done` rows, which fkit's **ADR-035** (*a
mid-board insertion is not the owner-ruled re-rank exception*) bars outright — closed rows are never
renumbered, and insertion is not the owner-ruled exception's to grant. Same treatment `0195`, `0196` and
`0197` document for themselves.

> 📎 **ADR-035 is cited by name, not linked, on purpose.** It is one of **fkit's own upstream ADRs** (the
> `adr-0XX` series, which lives in the fkit install share). This project's
> `ai-agents/knowledge-base/decisions/` holds only the `adr-1XX` series, so a relative link into it would
> not resolve.

## Status
✅ Done (agent-closed — not owner-verified) *(closed 2026-08-30 by a spawned producer on the owner's R8 ruling — `AskUserQuestion`, live lead session. Review Round 1/2 closed out ✅ Ready to merge, zero code defects; the sole remaining gate was verification step 8's production proof, which the owner **WAIVED** the same day as unsatisfiable — see step 8.*

⚠️ **This task closes on LOCAL PROOF ONLY, and that is a real weakness — do not read past it.** There is **no production evidence for this fix, and there never can be** for the Yandex path: the `host-lobby-button` and `join-private-lobby-button` sit inside a `display: none` row in `src/client/yandex-games_iframe.html`, by the owner's deliberate choice to disable private lobbies on Yandex Games, so the failing path has no route to being exercised in production. The fix **did ship** — production commit `362a2f9`, with the three `src/client/HostLobbyModal.ts` sites now building root-absolute worker paths instead of concatenating onto `windowOrigin` — **but its correctness in production is INFERRED FROM THE CODE, NOT OBSERVED.** No human has checked this work either.

📌 **Status drift at the moment of closing, recorded rather than hidden:** the Sprint 4 board row read `🔲 Backlog` while `worklog.md` recorded the terminal state as `🚧 Blocked — awaiting deploy proof`. The two disagreed. The owner ruled the drift **moot** — this close overwrites both.*

## Owner
fkit-coder

## Context

**This is a production defect that also affects local dev.** It was *found* in local dev — 2026-08-28, by
`0068`'s coder running that task's mandatory live multi-client desync check; the private lobby's **Start
Game** button appeared to do nothing, with no error anywhere, and the coder had to work around it to
finish `0068`. It was **filed** as a local-dev bug on that framing. Measurement the same day showed the
framing was wrong: the same defect breaks private lobbies **in production on Yandex Games**, by a
slightly different mechanism. Both mechanisms are below; the production one is the one that matters.

### What was actually verified in the code (2026-08-28)

**The base value carries a trailing path segment.** `src/client/flashist/FlashistFacade.ts` (~line 343):

```
windowOrigin = window.location.origin + window.location.pathname
```

This is a **Flashist Adaptation**. Upstream OpenFront used `window.location.origin` alone, and the
original line is still present, commented out, directly above each call site. The adaptation exists so
the client can be served from a non-root document path — its sibling field `rootPathname` (same file) is
read by `Main.ts`, `WinModal.ts`, `SettingsModal.ts`, `TutorialLayer.ts` and `GameRightSidebar.ts` to
navigate "back to the start screen" **without leaving the current document**. So the pathname is
deliberate; the bug is the *join*, not the intent.

**Three call sites in `src/client/HostLobbyModal.ts` concatenate a second `/` onto it:**

| ~Line | Method | URL built |
|---|---|---|
| 739 | `putGameConfig()` | `${windowOrigin}/${config.workerPath(id)}/api/game/${id}` (PUT) |
| 811 | `startGame()` | `${windowOrigin}/${config.workerPath(id)}/api/start_game/${id}` (POST) |
| 829 | `copyToClipboard()` | `${windowOrigin}/#join=${id}` |

📌 **Line numbers are approximate on purpose.** They were read from the **working tree**, which carried
`0068`'s uncommitted changes to this same file when the brief was written. At `HEAD` the three sites sit
two lines earlier (737 / 809 / 827). **The defect is present at `HEAD` — it is committed code and was
not introduced by `0068`'s in-flight work.** `FlashistFacade.ts`, `webpack.config.js`, `nginx.conf` and
`Master.ts` were all clean when this was verified, so every other finding here is against committed code.

**Two other call sites in the same file use a bare relative path and are NOT affected** — `pollPlayers()`
(~842, GET `/api/game/...`) and the module-level `createLobby()` (~873, POST `/api/create_game/...`).
Both start with a single `/`. **This is why the lobby looks healthy:** the lobby is created, and the
joined-player list keeps refreshing correctly, while the two requests that matter fail.

**In local dev the result is a literal double slash.** At `http://localhost:9000/`, `pathname` is `/`, so
`windowOrigin` already ends in `/` and the template's own `/` produces:

```
http://localhost:9000//w1/api/start_game/<id>
```

Browsers do **not** collapse this — `new URL(...)` keeps `//w1/...` as the pathname and sends it as-is.

**And the dev proxy matches on a literal prefix, so nothing routes.** `createLocalProxyConfig()` in
`webpack.config.js` registers proxy contexts `/w0`, `/w1`, `/w2` (targets `localhost:3001`–`3003`).
`//w1/...` does not begin with `/w1`, so the request is never proxied to a worker. `historyApiFallback:
true` rescues only GET/HTML navigations, and these are PUT and POST — so webpack-dev-server answers
**404**.

### 🔧 Two corrections to how this was reported

1. **It is not only the Start Game button — the lobby settings are silently lost too.** `putGameConfig()`
   is the method that pushes the host's map, difficulty, bot count, game mode, disabled units and timer
   to the worker. It runs on **every** settings change in the lobby **and** is `await`ed at the top of
   `startGame()`. Both go through the broken URL. So in local dev, even a private lobby started via a
   workaround runs on the **default** config, not the one the host picked. Anyone chasing "why did my
   local test run with the wrong settings" is chasing the same defect.

2. **The modal does close.** `startGame()` calls `this.close()` *before* the fetch. What "does nothing"
   is that the game never starts after the modal closes — which reads as an even less diagnosable
   symptom than a dead button.

### Why nothing surfaces

Neither `putGameConfig()` nor `startGame()` checks `response.ok`. Both simply `return response`, and no
caller inspects the returned value. A 404 is therefore indistinguishable from success at every layer
above the fetch. That silence is the expensive half of this defect — the URL bug alone would cost
minutes; the silence is what cost `0068` real time.

### 🚨 Deployed environments — RESOLVED 2026-08-28: PRODUCTION IS AFFECTED

**Measured, not inferred. This is recorded evidence — it is settled, and nobody should go re-establish
it.** Two entry points on the production host behave differently, and that difference is the whole story.

| Production URL | `location.pathname` | Computed worker URL | Result |
|---|---|---|---|
| `https://geoconflict.ru/` | `"/"` | `https://geoconflict.ru//w1/api/start_game/<id>` | ✅ **Works.** Double slash, normalized away by nginx |
| `https://geoconflict.ru/yandex-games_iframe.html` | `"/yandex-games_iframe.html"` | `https://geoconflict.ru/yandex-games_iframe.html/w1/api/start_game/<id>` | ❌ **404s** |

**How it was established:**

- **Measured by the lead in Chrome against live production, 2026-08-28.** Both pathnames read directly
  from the running pages. `https://geoconflict.ru/yandex-games_iframe.html` is **served — HTTP 200, the
  real application** (title `Геоконфликт`, ~96 KB body, script tags present), not a stray build artifact.
- **Confirmed by the owner, 2026-08-28**, via `AskUserQuestion` in the lead session: **the Yandex Games
  embed loads that path.** This was the one fact the browser could not supply — that the file is served
  is observable; that Yandex points at it is not.

**🔑 The production failure is NOT the double-slash bug.** That distinction matters for the fix and for
anyone re-reading this later:

- At the **root** URL the base ends in `/`, the template adds another, and you get `//w1/…` — which
  nginx's `merge_slashes` (on by default; the repo's container `nginx.conf` never disables it) collapses
  back to `/w1/…`. It matches `location ~* ^/w(\d+)(/.*)?$` and works.
- At the **Yandex** URL there is **no double slash anywhere in the URL** — so `merge_slashes` is
  irrelevant and cannot help. It is a **path-prefix failure**: the path begins
  `/yandex-games_iframe.html/w1/…`, which never matches the `^/w(\d+)` worker location, falls through to
  `location /` → the game server on :3000, whose only catch-all is `app.get("*")` (the SPA fallback in
  `src/server/Master.ts`). A PUT or POST therefore **404s**.

**One root cause, three surfaces:** `windowOrigin` carries a path segment it should not carry into a URL
join. Root URL → harmless double slash. Yandex URL → broken prefix. Local dev (no nginx) → broken double
slash. Fixing the join fixes all three.

### ⚠️ Derived, NOT measured — a likely second production symptom

Not part of the measurement above; **reasoned from `nginx.conf` and `Master.ts`, and never observed
live.** Labelled as such deliberately — do not repeat it as fact.

The copy-invite link builds `${windowOrigin}/#join=<id>`, which on the Yandex path is
`https://geoconflict.ru/yandex-games_iframe.html/#join=<id>` — path `/yandex-games_iframe.html/`, with a
trailing slash. That does not match `location ~* \.html$` (the path no longer *ends* in `.html`), so it
falls to `location /` → `app.get("*")` → **`static/index.html`**, i.e. the standalone template rather
than the Yandex one. **If true, an invite link shared from the Yandex build lands the recipient on the
wrong entry point.** Verify it before acting on it; it is cheap to check and it is covered by the fix
either way.

Also worth knowing, and out of scope here: in production the two payload consumers of `windowOrigin` —
`Cosmetics.ts` (`hostname`) and `AccountModal.ts` (`redirectDomain`) — are now known to be sending
`https://geoconflict.ru/yandex-games_iframe.html`. Whether that is what those endpoints expect is
`0069`/`0070` territory, not this task's.

### Related but distinct — the other local-dev multiplayer trap

Project memory records a **different** cause with a **similar symptom** ("local multiplayer mysteriously
doesn't work"): anything squatting **port 3001** silently kills dev worker 0 (the `EADDRINUSE` is
swallowed in `src/server/Worker.ts`), so the master never schedules public lobbies and
`/api/public_lobbies` comes back empty. Known real-world culprit: Remotion tutorial renders.

**Telling them apart takes one look:**

| Symptom | Cause |
|---|---|
| **Public** lobby list is empty; private lobby works | Port 3001 squatted → worker 0 dead |
| **Private** lobby Start Game does nothing; public lobbies fine | **This task** — doubled-slash URL |

Cross-referencing them is part of this task's deliverable (step 5), so the next person diagnoses in
seconds rather than hours. **Note this table covers local dev only** — in production the symptom is the
Yandex path-prefix failure described above, not a doubled slash.

## What to build

> ✅ **The blast-radius question is ANSWERED — it is not work.** An earlier revision of this brief opened
> with *"settle whether deployed environments are affected, before writing any fix."* That was done on
> 2026-08-28 and the answer is **production is affected** — measurements, method and owner confirmation
> are recorded in *Deployed environments* in Context. **Do not go re-establish it.** Read it, build on
> it, and treat production as in scope from the first line of your plan.

### 1. Fix the join

Make the three URLs in `src/client/HostLobbyModal.ts` (~739, ~811, ~829) join the base to the next
segment correctly **for a base that carries a path** — which is the real production case
(`https://geoconflict.ru/yandex-games_iframe.html`), not just a base with a trailing slash.

**This is the point the earlier framing got wrong, so be precise about it:** collapsing a double slash is
**not sufficient**. On the Yandex path there is no double slash to collapse; the path segment
`/yandex-games_iframe.html` must not end up in front of `/w<N>/api/...` at all. A fix that only
de-duplicates slashes will pass in local dev and **still leave production broken**.

**Do not "fix" it by reverting to `window.location.origin`.** That is the upstream line sitting commented
out above each call site, and reverting drops the fork's non-root-path support that `rootPathname` shows
is intentional. **But note the tension and resolve it explicitly in your plan:** the worker API is
mounted at the **host root** (nginx `location ~* ^/w(\d+)(/.*)?$`), so the API base and the document base
are genuinely different things. Whatever you build must serve both — document-relative navigation keeps
the pathname, API calls must not.

### 2. Decide where the fix lands, and justify it in the plan

`windowOrigin` has **two other consumers**, and they do not concatenate — they send it as a payload
value:

- `src/client/Cosmetics.ts` (~49) — as the `hostname` field of a purchase request
- `src/client/AccountModal.ts` (~253) — as the `redirectDomain` field of a magic-link request

**Changing the value of `windowOrigin` itself changes what those two send.** Prefer fixing at the join
site, or adding a separate normalized accessor, unless you can show with evidence that both consumers
are unaffected. **State the choice and the reasoning in your plan** — this is the one real design
decision in the task.

Whether those two fields are *semantically* right (a field named `hostname` receiving origin-plus-path)
is **out of scope**. They are upstream account/cosmetics plumbing, and auth strategy is `0069`/`0070`'s
territory. Note anything you notice; do not fix it here.

### 3. Make the failure audible

Add a non-OK response check to `putGameConfig()` and `startGame()` so a failed config push or a failed
start is logged rather than swallowed. **Keep it minimal — a console error is enough; no new UI, no new
translation keys, no retry logic** unless the owner asks for them.

> ⚠️ **This step is the producer's judgement call, not an owner ruling** — but the case for it got
> **stronger** with the escalation, not weaker. When this looked local-only, the silence cost developers
> diagnosis time. Now that it is known to fail in production, the silence is why **no player report, no
> log line and no alert ever surfaced it** — it was found by accident, by a coder testing something else.
> Still trimmable if the owner wants the minimal join fix only; say so in the worklog if it is dropped.

### 4. Fix the invite link too

Line ~829 builds `${windowOrigin}/#join=<id>`. In local dev that is `http://localhost:9000//#join=<id>`;
in production on the Yandex path it is `https://geoconflict.ru/yandex-games_iframe.html/#join=<id>`,
which is **likely** serving the wrong entry point — see the *derived, not measured* note in Context.
**Check it against the live site before and after your fix** and record what you observed. Same root
cause, and the fix should cover it.

### 5. Write both traps down where the next person will find it

Two things to record, in whatever place this project already documents gotchas — **find the existing home
rather than creating a new file** (project rule: search before creating):

1. **The local-dev distinction** from the **port-3001 / dead-worker-0** trap (see Context) — the two
   produce a similar "local multiplayer is broken" impression from opposite directions.
2. **The production one, which is the more valuable note:** `windowOrigin` carries the document path, the
   game is served at `/yandex-games_iframe.html` on Yandex Games, and therefore **anything built by
   concatenating onto `windowOrigin` is suspect in production**. That generalization is what stops the
   next instance of this class, and it was invisible to everyone until 2026-08-28.

**Do not write to `ai-agents/wiki-vault/`** — that is `fkit-wiki`'s exclusive surface. If a vault page
should carry this, route it to the wiki role as a `/fkit-wiki-sync`.

### 6. ~~Prove it in production — this does not close on a local pass~~ 🛑 WAIVED 2026-08-30

~~The defect's whole significance is that it fails **in production**, on a path local testing never
exercises. Plan for a post-deploy check on the Yandex Games build and record it. **The task is not
finished when it works locally.** If the deploy has not happened when the work is otherwise complete, the
task is `🚧 Blocked — awaiting deploy proof`, the same honest marker `0062` and `0063` carry — not `Done`.~~

🛑 **WAIVED by owner ruling 2026-08-30 — the task may close on the local proof.** The private-lobby
buttons are inside a `display: none` row in `src/client/yandex-games_iframe.html` (the owner's own
deliberate choice to disable private lobbies on Yandex Games), so the production path this step asks
for **cannot be reached at all** — the check is unsatisfiable, not merely unrun. **Full reasoning is
recorded on verification step 8; read it there rather than re-deriving it.** The fix itself did ship,
in production commit `362a2f9`.

🚢 *Historical, superseded by the waiver:* owner-ruled 2026-08-28, that deploy was the SAME one
carrying `0062` and `0063`; the fix was built to go out with theirs, and it did. See `## Priority` →
*Deploy coupling*.

## Verification steps

1. **Reproduce the bug first, on the unfixed code**, and record it: `npm run dev`, open the client,
   create a private lobby, click Start Game. Confirm in DevTools **Network** that a POST goes to a path
   beginning `//w` and returns **404**. A fix with no recorded reproduction proves nothing.
2. **After the fix**, in the same flow: the `start_game` request path begins with a **single** `/`,
   reads `/w<N>/api/start_game/<id>`, and returns **200**.
3. **The config push works too**: change map, difficulty and bot count in the lobby, then confirm the
   PUT to `/w<N>/api/game/<id>` returns 200 — and that the game that starts uses **those** settings, not
   the defaults. This is the half that was silently lost; verify it explicitly.
4. **The live multi-client run that `0068` could not do**: a second browser client joins via the copied
   link, both clients enter the same game, and the game runs with no desync. This is the capability the
   task exists to restore — it is the acceptance test, not an extra.
5. **🚨 The production case — simulate the Yandex path locally, and do NOT skip this.** Load the client
   at a URL whose pathname ends in a filename (the `yandex-games_iframe.html` entry, or any non-root
   path) and repeat steps 2–4. **A pass at the root URL proves nothing about production** — the root case
   already worked before the fix. This is the step that distinguishes a real fix from a slash-collapsing
   one that leaves production broken. If the local setup cannot reproduce a non-root path, say so
   explicitly and treat step 8 as the only proof. ⚠️ **Step 8 is now WAIVED (owner ruling 2026-08-30),
   so this local non-root simulation is the ONLY proof there is.** That raises this step's weight — it
   is no longer a rehearsal for a production check that will follow.
6. **Invite link**: the copied link resolves to the correct entry point — checked at the root path **and**
   at the Yandex-style path. Record what it produced before and after; this is the *derived, not
   measured* symptom in Context, so your observation is the first real evidence either way.
7. **Other consumers unchanged**: if you did **not** change `windowOrigin` itself, say so. If you
   **did**, state exactly what `Cosmetics.ts` and `AccountModal.ts` now send in production and why that
   is correct — their production value is now known to be
   `https://geoconflict.ru/yandex-games_iframe.html`.
8. ~~**🚨 Post-deploy production check — the actual acceptance test.** On the deployed Yandex Games
   build: create a private lobby, change map/difficulty/bots, start it, and confirm the game starts
   **with those settings**. Confirm the `start_game` request returns 200. **Until this is done the task
   is `🚧 Blocked — awaiting deploy proof`, not `Done`** (the marker `0062` and `0063` already carry).~~

   🛑 **WAIVED — OWNER RULING 2026-08-30**, via `AskUserQuestion` in the live lead session. **The task
   may close on the local proof.** The step is kept, struck through rather than deleted, because the
   *reason* it was waived is worth more than a missing step.

   **Why it was waived — it is UNSATISFIABLE AS WRITTEN, not merely unrun.** The `host-lobby-button`
   and `join-private-lobby-button` sit inside a `style="display: none;"` row in
   `src/client/yandex-games_iframe.html`. So the failing path this step asks you to exercise — *a
   private lobby started from the Yandex embed* — **has no route to being reached in production at
   all.** There is no button to click. This is not a deploy that has not happened yet and not a check
   nobody got around to; it is a check that cannot be performed, ever, in the current product.

   That hidden row is **the owner's own deliberate choice to disable private lobbies on Yandex
   Games.** It is not a defect, it is not an oversight, and it is not something to wait out or file a
   follow-up against.

   **The fix nevertheless shipped.** It went to production in commit `362a2f9`, and the three
   `src/client/HostLobbyModal.ts` sites now build **root-absolute** worker paths
   (`/${config.workerPath(id)}/api/...`) instead of concatenating onto `windowOrigin` — which is the
   correct fix for the real root cause, and which also covers the root-URL and local-dev surfaces that
   *are* reachable.

   ⚠️ **Do not reinstate this step.** If private lobbies are ever re-enabled on the Yandex build, that
   re-enablement is the task that owes a production check here — not this one.

   📌 **Numbering note, so nobody hunts for the wrong step:** the owner's ruling and `worklog.md` both
   refer to this as **"step 9"**, which is `plan.md`'s numbering. In *this brief* it is **step 8**.
   Brief step 9 below (`npm test` / lint / `tsc`) is **not** waived and still applies.
9. `npm test`, `npm run lint`, and a clean `tsc` — all green, with the counts recorded.

> ⚠️ Expect the known random Jest-worker `SIGSEGV` flake while running step 9 — that is `0197`'s
> territory, not a regression from this change. Re-run and record both results rather than treating a
> segfault as a failure of this task.

## Notes

- **Depends on:** nothing. Independently shippable today. ~~Its **production proof** (step 8) waits on
  the next production deploy — which is a verification gate, not a dependency on other work.~~
  🛑 **That gate is WAIVED (owner ruling 2026-08-30) — nothing is waiting on a deploy any more.** The
  fix shipped in `362a2f9`, and the production check is unsatisfiable because the Yandex build's
  private-lobby buttons are in a `display: none` row by the owner's own choice. See verification
  step 8.
- **Blocks:** nothing formally. Two practical notes: it is **failing for players on Yandex Games right
  now**, and it taxes **every** task whose verification includes a live multi-client private-lobby run —
  `0068` paid that tax on 2026-08-28, which is how it was found.
- **Related:** the **port-3001 / dead-worker-0** local-dev trap (different cause, similar symptom —
  see Context; cross-referencing them is step 5). `0062` / `0063` — both **built and awaiting a
  production deploy**, so this fix should ride the same one. `0197` (test-suite reliability) — the
  precedent behind the *original* Sprint 4 placement, back when this was thought to be a
  developer-velocity defect only. `0069` / `0070` (auth strategy) — where the `redirectDomain` question
  belongs, not here.
- **✅ ALL THREE of this brief's original open questions are now RULED — none remain.** All owner
  decisions, all 2026-08-28, all via `AskUserQuestion` in the lead session, relayed through the lead.
  - **Priority — High.** Filed Medium with an explicit escalation condition; the condition **fired** on
    measurement, and the owner confirmed the deciding fact (the Yandex embed loads
    `/yandex-games_iframe.html`). The owner **confirmed the producer's escalation rule rather than
    overriding the rank**. Full record in `## Priority`.
  - **Sprint position — top of Sprint 4's open work, above the whole config track.** Execution order
    `0198` → `0063` → `0062` → `0195` → `0064` → `0060`. The producer's recommendation, accepted on its
    stated grounds. **The earlier "recommendation only, not acted on" marker is CLOSED.** Full record and
    reasoning in `## Priority`.
  - **Deploy coupling — fixed first, ships in the SAME deploy as `0062` and `0063`.** Chosen over
    *deploy now, fix later*. Full record in `## Priority` → *Deploy coupling*.
- **🚢 Deploy coupling (owner-ruled 2026-08-28) — read this before running a production deploy.** The
  next production deploy is expected to carry **`0062`, `0063` and `0198`** together; do not ship it
  without this fix. ~~`0198`'s step 8 production check rides that same deploy.~~ **This is a coupling,
  not a dependency** — `**Depends on:**` above still reads *nothing*, and **no status on `0062` or
  `0063` changes**.
  - ✅ **Resolved:** that deploy happened — production commit `362a2f9` carries this fix, and the three
    `HostLobbyModal.ts` sites now build root-absolute worker paths. **Step 8 itself is WAIVED (owner
    ruling 2026-08-30)**, so it no longer rides anything; see verification step 8 for why it is
    unsatisfiable rather than pending.
- **⚠️ One open question remains, and it is minor:** **step 3 (make the failure audible) is
  producer-added scope**, trimmable if the owner wants the minimal join fix only — though the escalation
  strengthened the case for keeping it. Not ruled; the coder should raise it at plan approval rather than
  deciding silently.
- **⚠️ The working tree carried uncommitted work when this was filed (2026-08-28)** — `0067`'s and
  `0068`'s source changes, plus an in-flight review of `0068`. Do not disturb them. **Do not commit or
  push** anything for this task unless the owner explicitly asks.
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer,
  which writes the `(agent-closed — not owner-verified)` marker when the owner is not present.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- **No secrets in any artifact.** This task names files, routes and variables only — never a value.
