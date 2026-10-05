# Review — 0389

Task: ai-agents/tasks/done/0389-make-the-private-lobby-code-easier-to-read-and-type/brief.md
File(s) under review: src/core/PrivateLobbyCode.ts (new), src/core/Schemas.ts (`PrivateLobbyCodeSchema`), src/server/GameManager.ts (`createGameIfAbsent`), src/server/Worker.ts (`create_game` id check + 409), src/client/HostLobbyModal.ts (generator, grouped display, copy), src/client/JoinPrivateLobbyModal.ts (`joinLobby` clean + schema check), src/client/PrivateLobbyInvite.ts (`lobbyIdFromJoinHash`), tests named in worklog.md — 0389 hunks only (the tree also holds closed 0354/0380/0377/0353/0374 changes)
Status: closed-out
Coverage: reasoning-only second opinion — Codex ran (codex-cli 0.157.1, exit 0, `model_reasoning_effort=medium`) and returned "no significant issues found", running only read-only source inspection (`rg`, `sed`, `nl`, `git status`), no tests; the reviewer's own leg measured: 7 jest suites (PrivateLobbyCode, GameManagerCreate, PrivateLobbyInvite, JoinPrivateLobbyModalLeave, HostLobbyOpen, HostLobbyModalUrl, ClientJoinMessageSchema) 162/162 passed, `npx tsc --noEmit` exit 0.

## Reviewer findings
| #  | Round | Sev  | Location | Claim |
|----|-------|------|----------|-------|

Round 1 (2026-10-05): **no confirmed defects — no rows.** Checked and cleared, so the coder need not chase them:
- 409 race: `createGameIfAbsent` is synchronous and `Worker.ts` has no `await` between it and the create (the settle wait sits before it) — two identical creates cannot both pass.
- Public creates: master posts with `gameType: Public` + admin token → `ID` check (unchanged); bodyless browser create → `PrivateLobbyCodeSchema`. No other `create_game` caller exists (`Master.ts:670`, `HostLobbyModal.ts` `createLobby` only). Worker-side `generateGameIdForWorker` path uses `createGame` directly, untouched.
- Routing: Join and `#join=` clean before `workerPath` (ADR-109 respected; `generateID`/`simpleHash`/`workerIndex`/`ID` unchanged — `git diff src/core/Util.ts src/core/configuration` empty). Test pins that a lowercase code would route elsewhere if uncleaned.
- Worklog's corrected figures verified: `(52/58)^8 ≈ 0.417`, `(30/58)^8 ≈ 1/195`.
- Dismissed nit: `toUpperCase()` expands a few Unicode letters (`ß` → `SS`), so odd input can turn into a different *valid* code — harmless, it can only find a live lobby with that code or say "not found".
- Validation gate (not a defect): browser checks (host shows `XXXX XXXX`; friend types lowercase with a space and joins) were not run — port 9000 held by another project. Covered by jsdom tests and the builder's server-side local run only.

## Coder response
| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|

Round 1 (2026-10-05, `fkit-coder` process-review worker spawned by `fkit-sprint-ship-loop` / `fkit-lead`): **no rows** — the reviewer recorded no findings, so there is nothing to give a verdict on. No code changed in this step.
- The reviewer's validation gate (browser checks not run) is now met: they ran and passed on 2026-10-05 (`worklog.md` § *Browser check — 2026-10-05*: host showed `ZPMV P2H2`; a friend typed `zpmv p2h2` and joined; a pasted link joined; 7/7 garbage inputs → `not_found` with no game request).
- That browser check surfaced one new item, which is not a reviewer finding: a hand-typed `#join=` link with a space is ignored on the website build. The owner ruled **"Accept and note it"** (2026-10-05, live `AskUserQuestion` in the `fkit lead` session, relayed to this worker). It is recorded below as an accepted residual. No code change.
- ADR-109 checked: the residual does not touch routing (`workerIndex`, `generateID`, `simpleHash`), so none of its re-raise conditions is met.

## Accepted residuals (shared, do-not-re-litigate)
- **Hand-typed grouped `#join=` link ignored on the website build** — What: on the standalone (website) build, a `#join=` link typed by hand with a space in the code (e.g. `#join=abcd%202345`) opens nothing — no join window, no request. Links without a space (`#join=abcd2345`, `#join=ABCD-2345`) work. No fix; a known, small limit. · Why (structural): the upstream `getToken()` in `src/client/jwt.ts` (the `URLSearchParams` hash rebuild, "Clean the URL" `history.replaceState`), which `0389` does not change, runs at startup and re-serialises the hash, so the encoded space comes back as `+` (`#join=abcd+2345`). `cleanLobbyCode` (`src/core/PrivateLobbyCode.ts`, "no spaces or dashes, upper case") strips only whitespace and `-`, so `+` fails `PrivateLobbyCodeSchema` and `lobbyIdFromJoinHash` returns null. Real reach is small: the game's own copied links are never grouped (`HostLobbyModal` copies the ungrouped code), and the Yandex build ignores `#join=` entirely (`0380`). Alternatives not taken: also stripping `+` in `cleanLobbyCode`, or changing `getToken()`'s rebuild — both rejected by the owner ruling **"Accept and note it"** (2026-10-05, live `AskUserQuestion` in the `fkit lead` session during `fkit-sprint-ship-loop`). Found by the browser check (`worklog.md` § *Browser check — 2026-10-05*, "Address-bar `#join=` with a space is ignored"); the unit test passes a literal space straight to `lobbyIdFromJoinHash`, so it does not see the `+`. · Re-raise only if: a player reports a hand-typed grouped `#join=` link failing, **or** the website build starts copying or showing grouped `#join=` links (e.g. an invite that carries `formatLobbyCodeForDisplay` output), **or** `getToken()`'s hash rebuild changes.
