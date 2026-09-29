# Worklog — 0325: verified login (Yandex signed player data → `vfy:true` sessions)

## 2026-09-28 — S0 Step B.1: the HMAC helper (fkit-coder, spawned by `fkit-sprint-ship-loop` as its Build worker)

**S0 status: helper written, awaiting owner run.** Nothing else is built (owner ruling Q2, "Test first,
then build"). No `src/` or `tests/` change. Nothing committed. `plan.md` and the task status untouched.

Building from the approved `plan.md` (blob `deb67836680bd77c779c5c1038db8f801798b7a7`, checked with
`git hash-object` before starting). Scope of this spawn: plan § *S0 → Step B*, item 1 only.

### Owner rulings — recorded verbatim (from `plan.md`, given 2026-09-28 live via `AskUserQuestion` in the `fkit lead` session, relayed by fkit-lead)
- **Q1:** "You run the 45-min test (Recommended)"
- **Q2:** "Test first, then build (Recommended)"
- **Q3:** "Stop and come back to me (Recommended)"
- **Plan approval:** "Approve (Recommended)"

### What changed
| File | Change |
|---|---|
| `s0-hmac-check.mjs` (this folder) | **new**, throwaway, never deployed, Node built-ins only. Reads one signed string from stdin and writes a small Node program to stdout. That program embeds the string as a `JSON.stringify` literal on its own line, reads `YANDEX_PAYMENTS_SECRET` inside the container, runs the same HMAC check as `src/profile-server/YandexSignature.ts` (`verifySignedPayload`, `:109-140`) once per construction, and prints only the three lines. |
| `worklog.md` | **new**: this file. |

### Decision log (choices made inside the plan's intent; none widens scope)
- **The HMAC check is copied from `verifySignedPayload`, step for step:**
  - split at the first `.`, and reject when the dot is at index 0 or at the end;
  - base64-decode the signature, and reject when it is empty;
  - decode the payload to UTF-8, and reject when it is empty;
  - HMAC-SHA256 keyed by the secret;
  - compare with `timingSafeEqual` on equal-length buffers only;
  - an empty secret never matches.
  - Only difference: the helper reports each construction separately instead of `.some(...)`, because S0 has to know which construction matched.
- **The payload is never parsed as JSON.** S0 asks only whether the HMAC passes. The field layout comes from Step A. So `HMAC over decoded JSON: MATCH` means only that the HMAC over the decoded text matched.
- **Trailing CR/LF is stripped from the input**, in case the clipboard adds a line break. Base64 never contains CR/LF, so this changes nothing in a real signature.
- **Refuses to run when stdout or stdin is a terminal** (exits 2 with a one-line message). The generated program contains the signature, so it must go into the pipe and never onto the screen. Not in the plan's text; it is a safety rail inside the plan's "never printed" intent.
- **The generated program works in CommonJS and in ES-module mode.** It uses `require` when available, otherwise `process.getBuiltinModule`. The container's `package.json` has `"type": "module"`. Piped stdin is read as CommonJS unless ESM syntax is detected, and both paths were tested.
- **The error output is exactly `error: <error name>`** (the plan: "prints only the error's name"). The three verdict lines are printed together at the very end, so a run prints either all three or only the error line, never part of each.

### Self-test evidence (2026-09-28, local Node v24.13.0, synthetic data only)
- **The synthetic keys were random 32-byte values held in memory by the test script.** They were never written to a file. The throwaway test scripts (a harness, a parity check and an error-forcing preload) lived in the session scratchpad and **were deleted after the run**. None of them contained a key.
- **Harness: `RESULT: 40 passed, 0 failed`.** That is 20 cases, each run once with the repo root as working directory (`"type": "module"`) and once from a plain directory. The pipe was `helper → node` with the synthetic key in env. Every run had to print exactly the expected lines and nothing on stderr.

  | Case | Output |
  |---|---|
  | signed over the base64 payload | `yes` / `MATCH` / `no` |
  | signed over the decoded JSON | `yes` / `no` / `MATCH` |
  | same, input with a trailing newline | `yes` / `MATCH` / `no` |
  | signed with a different key | `yes` / `no` / `no` |
  | payload tampered after signing | `yes` / `no` / `no` |
  | secret unset · secret empty | `NO` / `no` / `no` |
  | **dry run `AAAA.e30=`**, key set | **`yes` / `no` / `no`** (as the plan expects) |
  | dry run `AAAA.e30=`, no key | `NO` / `no` / `no` |
  | 8 junk inputs: empty, no dot, leading dot, trailing dot, non-base64, `a.b.c`, U+2028/U+2029, and a string of JS quotes plus `process.exit(9)` (checks that `JSON.stringify` escapes it) | `yes` / `no` / `no` |
  | **error path:** `createHmac` forced to throw a `TypeError` whose *message contains the secret* | **`error: TypeError`** only |
  | ESM mode (`--input-type=module`), normal run + error path | `yes`/`no`/`MATCH` · `error: TypeError` |

- **Leak check on every one of the 40 runs.** The helper's stderr plus the program's stdout and stderr were searched for 26 strings, and none appeared:
  - both keys;
  - the decoded JSON and the base64 payload;
  - both full signatures;
  - the synthetic id and name, and the key names `uniqueID` / `publicName`;
  - each relevant HMAC digest in hex and base64, plus the first 8 characters of each (the partial-digest check).
- **Parity with the real verifier: `PARITY: all agree`.** The same synthetic inputs (with a purchase-shaped payload, so `verifySignedPayload` can accept them) were given to the real `src/profile-server/YandexSignature.ts#verifySignedPayload`. For base64-construction, JSON-construction, wrong-key and URL-safe-alphabet inputs, the helper's MATCH/no verdict equals the real function's accept/reject.
- **Refusal rails:**
  - stdin and stdout both terminals → exit 2 and the refusal message;
  - stdin piped, stdout a pseudo-terminal → exit 2, **zero bytes written to stdout**, the refusal message on stderr.
- **Not verified:** the run inside the real container over `ssh`/`docker exec`. That is the owner's Step B run, and the dry run is its first check. The container's Node is `node:24-slim` (`Dockerfile.profile:14`), and the same major was tested locally.

### Owner runbook — S0 (Steps A and B)

Placeholders only: `<ssh-alias>` is your SSH alias for the profile box, and `<container>` is the profile-api container name.

**Step A — in the browser (about 10 min).** It prints only key names, types, lengths and yes/no.
1. Open the game on Yandex Games, **logged in** to your Yandex account. Wait for the start screen.
2. Open DevTools → Console. In the **context dropdown** (top-left, shows `top`), pick the **game's iframe**: the frame that serves our game, not `yandex.ru`.
3. Pause any clipboard manager (Raycast, Alfred, Paste…) until Step B is finished.
4. Paste and run:

```js
(async () => {
  const sdk = window.FlashistFacade?.instance?.yandexGamesSDK;
  if (!sdk) { console.log("S0: no SDK in this frame - pick the game iframe in the context dropdown"); return; }
  const plain = await sdk.getPlayer();
  const out = { authorized: !!plain.isAuthorized() };
  const t0 = performance.now();
  let signed;
  try { signed = await sdk.getPlayer({ signed: true }); }
  catch (e) { out.signedCall = "FAILED:" + (e && e.name); console.table(out); return; }
  out.signedCallMs = Math.round(performance.now() - t0);
  const sig = signed.signature;
  out.signatureIsString = typeof sig === "string";
  if (typeof sig !== "string") { console.table(out); return; }
  out.totalLength = sig.length;
  out.dotCount = sig.split(".").length - 1;
  const part = sig.slice(sig.indexOf(".") + 1);
  out.payloadHasUrlSafeChars = /[-_]/.test(part);
  let json;
  try {
    const bin = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    json = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0))));
  } catch { out.payloadDecodes = false; console.table(out); return; }
  out.payloadDecodes = true;
  const shape = o => JSON.stringify(Object.fromEntries(Object.entries(o).map(([k, v]) =>
    [k, Array.isArray(v) ? "array" : v === null ? "null" : typeof v])));
  out.topLevelKeys = shape(json);
  if (json.data && typeof json.data === "object") out.dataKeys = shape(json.data);
  const uid = plain.getUniqueID();
  const hits = [];
  const walk = (o, p) => { for (const [k, v] of Object.entries(o)) {
    if (v === uid) hits.push(p + k); else if (v && typeof v === "object") walk(v, p + k + "."); } };
  walk(json, "");
  out.fieldsEqualToGetUniqueID = hits.join(",") || "NONE";
  out.signedObjectSameUniqueID = signed.getUniqueID() === uid;
  if (typeof json.issuedAt === "number") {
    out.issuedAtAgeIfSeconds = Math.round(Date.now() / 1000 - json.issuedAt);
  }
  console.table(out);
})();
```

5. **Paste back in chat only the table's rows.** `issuedAtAgeIfSeconds`: a small number means the field is in seconds; a huge negative number means milliseconds. If it prints "no SDK in this frame" even with the game iframe picked, stop and tell us. That triggers the fallback S0a, and you should not continue to Step B.

**Step B — the key check (about 15 min).** The signature goes to the box one way, through the pipe. It is never printed, never saved to a file, and never put in shell history. The key never leaves the box.
1. **Read `s0-hmac-check.mjs` in the task folder first.** It is short, and its header comment says what it prints and what it never prints.
2. **Dry run** (no real signature), from the repo root:
   ```sh
   printf 'AAAA.e30=' | node ai-agents/tasks/backlog/0325-verified-login-check-yandex-signed-player-data-and-mint-verified-sessions/s0-hmac-check.mjs | ssh <ssh-alias> 'docker exec -i <container> node'
   ```
   (Put `sudo` before `docker` if that is how you normally run it.) Expect exactly:
   `secret present: yes` · `HMAC over base64 payload: no` · `HMAC over decoded JSON: no`.
   If you see `secret present: NO`, stop: the container is not the one that holds the key.
3. **Real run:**
   - In the same iframe console, run these two lines, one at a time:
     ```js
     var s0p = await FlashistFacade.instance.yandexGamesSDK.getPlayer({ signed: true });
     ```
     ```js
     copy(s0p.signature); s0p = undefined;
     ```
   - In the terminal, from the repo root:
     ```sh
     pbpaste | node ai-agents/tasks/backlog/0325-verified-login-check-yandex-signed-player-data-and-mint-verified-sessions/s0-hmac-check.mjs | ssh <ssh-alias> 'docker exec -i <container> node'
     ```
   - Then clear the clipboard and **close the game tab**:
     ```sh
     pbcopy < /dev/null
     ```
4. **Paste back in chat only the three output lines.** (If the only line is `error: <name>`, paste that.)

### S0 exit — to be filled in after the owner's run (names and yes/no only)
Filled 2026-09-29 from the owner's live run. Evidence and caveats: § *2026-09-29 — S0 result* below.
- Key verifies? Which construction: base64 payload / decoded JSON / both? — **Yes, decoded JSON only.** Base64 payload: no. (Step B attempt 2, the valid run.)
- Id field path — **`data.id` and `data.uniqueID`**. Both equal `getUniqueID()`.
- `issuedAt` present? Unit? — **Yes, top level, a number, in seconds** (`issuedAtAgeIfSeconds` = 0).
- Signed id equals `getUniqueID()`? — **Yes** (`signedObjectSameUniqueID` true).
- Signature length / signed-call latency — **733 characters / 6852 ms.** One sample only. A socket error was logged on the signed request, so a retry is likely (inferred, not proven). See the build risk below.

## 2026-09-29 — S0 result (owner-run, relayed by fkit-lead)

The owner ran Steps A and B live in the `fkit lead` session. fkit-lead relayed each step and saw the
output. Recorded by fkit-coder (a bounded spawn from fkit-lead). No source written, nothing committed,
task status untouched. Field names and yes/no only: no id, name, signature text, secret, host or IP.

**S0 verdict: the key verifies, via the decoded-JSON construction only.**

### Step A — browser, game iframe, logged in
| Row | Value |
|---|---|
| `authorized` | true |
| `signedCallMs` | 6852 |
| `signatureIsString` | true |
| `totalLength` | 733 |
| `dotCount` | 1 |
| `payloadHasUrlSafeChars` | false |
| `payloadDecodes` | true |
| `topLevelKeys` | `{"algorithm":"string","issuedAt":"number","requestPayload":"string","data":"object"}` |
| `dataKeys` | `{"id":"string","uniqueID":"string","lang":"string","publicName":"string","avatarIdHash":"string","scopePermissions":"object","payingStatus":"string","hasPremium":"boolean"}` |
| `fieldsEqualToGetUniqueID` | `data.id,data.uniqueID` |
| `signedObjectSameUniqueID` | true |
| `issuedAtAgeIfSeconds` | 0, so `issuedAt` is in **seconds** |

- **Build risk: the signed call can be slow.** The console showed a red `net::ERR_SOCKET_NOT_CONNECTED`
  on the SDK's `player-signed` request, just above the table. The signed call still succeeded, in
  6852 ms, so the SDK likely retried (inferred, not proven). If login waits on the signed call, logins
  can be this slow. **One sample only**, so this is neither a typical figure nor a worst case.

### Step B — the key check, on the profile box
| Run | Output | Status |
|---|---|---|
| Dry run (`AAAA.e30=`) | `secret present: yes` / `HMAC over base64 payload: no` / `HMAC over decoded JSON: no` | as expected |
| Real run, attempt 1 | `yes` / `no` / `no` | **INVALID — not a failed key check** |
| Real run, attempt 2 | `secret present: yes` / `HMAC over base64 payload: no` / **`HMAC over decoded JSON: MATCH`** | **VALID** |

- **Why attempt 1 is invalid.** Both B3 console lines were pasted together. `copy()` threw
  `ReferenceError: copy is not defined`: DevTools' Command Line API is unavailable when a paste contains
  top-level `await`. The pipe was then run anyway. The clipboard was not measured, so what was checked
  is unknown.
- **Why attempt 2 is valid.** Before the run, `pbpaste | wc -c` gave 733 and the dot count was 1, both
  matching Step A. The clipboard was cleared afterwards.

### Open items for the build (noted, not decided)
- **`algorithm` is in the signed payload**, so the server can pin the expected value.
- **`requestPayload` is in the signed payload.** It may allow a caller-supplied nonce for freshness.
  Check the Yandex docs before relying on it.
- **`payingStatus` and `hasPremium` are in the signed `data`.** Out of scope for login; only noted.

### Runbook friction (for the next owner run)
- **Long lines break when copied.** The long line 31 of the Step A snippet got truncated in the copy. A
  version with short lines worked.
- **Angle-bracket placeholders were pasted literally.** zsh read `<` as a redirect. Write placeholders
  in words, with no angle brackets.
- **No container name is needed.** This form works:
  `ssh USER@PROFILE_HOST 'docker compose -f /opt/profile/docker-compose.yml exec -T profile-api node'`
  (USER and PROFILE_HOST are placeholders).
- **The two B3 console lines MUST be run separately.** Pasted together, `copy()` is unavailable (see
  attempt 1).
- **Pre-check the clipboard before the real run:** `pbpaste | wc -c` and the dot count must match
  Step A's `totalLength` and `dotCount`. That would have caught attempt 1.

## 2026-09-29 — `s0-hmac-check.mjs` excluded from lint (fkit-coder, spawned by fkit-lead)
- **Why:** `npm run lint` failed on HEAD with one error — this helper is "not found by the project
  service" (no tsconfig includes it) since it was committed in `68303d5`.
- **Owner ruling (2026-09-29, live via `AskUserQuestion` in the fkit-lead session):** "Exclude it from
  lint (Recommended)" — *"A coder adds that one file to the linter's ignore list. The helper stays as
  evidence in case S0 needs re-running."*
- **Change:** the file's exact path added to the top-level `ignores` list in `eslint.config.js`. Exact
  path, not a glob, so no other file can be hidden. The helper itself is untouched and stays in place.
- **Follow-up (same day, same ruling, fkit-lead judged in scope):** the exact path was widened to `ai-agents/tasks/*/0325-*/s0-hmac-check.mjs` — the exact path named `backlog/`, so the ignore would break when 0325 moves to `done/` or `cancelled/`; the wildcard status folder still matches only this one tracked file (checked with `git ls-files`), superseding "exact path, not a glob" above.

## 2026-09-29 — S0-informed plan amendment (fkit-coder, plan-only unit spawned by fkit-lead)
- Appended `## S0-informed amendment (2026-09-29)` to `plan.md`, beneath the unchanged approved text (blob `deb6783…`; the diff is additions only). No source, no tests, nothing committed, task status untouched. Resolved: `SIGNATURE_MAX` 2932 plus a new client over-bound guard (an over-bound 400 would otherwise latch D3), the `data.uniqueID` id path, `issuedAt` required and in seconds, the 900 s / 300 s window. Awaiting owner: **D1** (client signed-call wait; Rec 5 s), **D2** (four `Profile:Login:Signature:*` events; Rec yes), **D3** (`algorithm`; Rec ignore). `requestPayload` stays residual 8. Also records line drift against `572d134`, and notes that the untracked ADR-116 draft needs an architect follow-up after the rulings.

## 2026-09-29 — Owner rulings on the amendment (recorded by fkit-coder, S2 Build worker spawned by fkit-lead)
Given live via `AskUserQuestion` in the `fkit lead` session; relayed verbatim by fkit-lead. Also recorded
in `plan.md` § *Owner rulings on the amendment (2026-09-29)*. `plan.md` blob before this append:
`247197a9c56e22a8a41dd578daf3cc836d9e2e03` (checked with `git hash-object`, matched).
- **Amendment approval:** "Approve and build (Recommended)". Carried items approved with it: A1 client
  over-bound guard, A2 `data.uniqueID` only, A3 `issuedAt` required, B4's 300 s held-signature limit,
  D `requestPayload` stays residual 8.
- **D1:** all three offered options REJECTED. Owner: *"I think we should not have any limit, and the only
  case of the "fallback/fail" state is when the request is actually failed."* Follow-up "What if Yandex's
  request hangs and never answers?" → *"#1, but add the analytic event that we can then analyse to find
  out how big the problem is."* (#1 = *"60 s safety net for hangs (Recommended) — Wait for the answer as
  you asked; only a request still silent after 60 s counts as failed and the player logs in unverified.
  Normal slow requests (like our 7 s) are never cut off."*) ⇒ `SIGNED_PLAYER_HANG_MS = 60000` replaces
  B4's 5 s cap; the rest of B4 stays.
- **D2:** "Yes, add them (Recommended)" — `Profile:Login:Signature:Ready` / `Waited` / `Timeout` /
  `Failed`; `Timeout` = the 60 s hang net fired.
- **D3:** "Ignore it (Recommended)" — `algorithm` never read, never pinned.

## 2026-09-29 — ADR-116 accepted; ADR-103 note applied; ADR-113 note waits for S3a (fkit-architect, spawned by fkit-lead)
- **Owner ruling (2026-09-29, live via `AskUserQuestion` in the fkit-lead session, relayed by fkit-lead):** asked "Accept ADR-116 (the verified-login design, with today's decisions)?" → **"Accept as written (Recommended)"** — *"Status becomes accepted. The architect then adds the dated notes to ADR-103 now, and to ADR-113 once S3a ships. 0325 can close once built."*
- ADR-116 status → accepted (promoted in place). ADR-103: dated, append-only note under its key-issued re-raise bullet, plus a `## Related` line; nothing already written changed.
- ⛔ **REMINDER FOR WHOEVER SHIPS S3a:** once S3a ships (the profile server mints `vfy:true`), add the ADR-113 dated note — its content is in ADR-116 § *Amendments to older ADRs* → *ADR-113* (point 5, point 9, the re-raise list, key rotation). Append-only, dated, attributed; keep every earlier wording visible; then mark that ADR-116 subsection applied. Do **not** apply it before S3a ships. Wiki writes are fkit-wiki's; ADR edits are the architect's.

## 2026-09-29 — S2 Build: shadow mode (fkit-coder, Build worker spawned by `fkit-sprint-ship-loop` via fkit-lead)

**S2 steps 1–12 are built, as amended and as ruled above. S3a (steps 13–15) is NOT built.** Nothing mints
`vfy:true`: the one `signSessionToken` call (`Routes.ts` login) is unchanged and passes no `verified`.
Nothing committed. Task status and file locations untouched. No `ai-agents/wiki-vault/` write. No
user-visible text changed, so there is no en/ru change.

Plan blob checked before starting: `247197a9c56e22a8a41dd578daf3cc836d9e2e03` (matched).

### What changed
| File | Change |
|---|---|
| `src/core/profile/LoginContract.ts` | `SIGNATURE_MAX = 2932` (exported); `signature: z.string().min(1).max(SIGNATURE_MAX).optional()`; header comment (step 1–2, A1). |
| `src/profile-server/SessionToken.ts` | `vfy: boolean` in the interface and the zod schema; `signSessionToken(..., { ..., verified?: boolean })` mints `vfy: subject.verified === true`; header on the widening, the rollback rule, and key rotation dropping verified sessions (step 3). |
| `src/profile-server/YandexSignature.ts` | `verifyHmacEnvelope(signed, secret)` extracted unchanged from `verifySignedPayload`, which now calls it (step 4). |
| `src/profile-server/PlayerSignature.ts` | **new**. `verifySignedPlayer(signed, secret, nowMs)` → `ok {platformUserId, issuedAtMs}` / `no_secret` / `bad_signature` / `bad_payload` / `stale`. Reads `data.uniqueID` only (A2) and `issuedAt` in seconds, required (A3); window 900 s old / 300 s ahead, both limits inclusive (A4); `algorithm` never read (D3). Never throws. ⛔ credential header (step 5). |
| `src/profile-server/LoginVerification.ts` | **new**. `classifyLoginSignature(signature?, assertedId, secret, nowMs)` → `{ outcome, verified }`; 7 outcomes; `verified` only for `ok` (step 6). |
| `src/profile-server/Telemetry.ts` | `LoginVerificationOutcome` (7 values); `loginVerification(outcome)` on `ProfileMetrics`, the no-op set, and counter `geoconflict.profile.login.verification`, label `outcome` only (step 7). |
| `src/profile-server/Routes.ts` | `AppOptions.playerSignatureSecret?`; the login route classifies right after `platformLabel`, in its own try/catch (a throw counts `bad_signature`), records the metric, and uses the result for nothing else; route comment and `TODO(0267)` comment updated (step 8). |
| `src/profile-server/Server.ts` | passes `playerSignatureSecret: yandexPaymentsSecret`, with a comment that one key serves both (step 9). |
| `src/client/flashist/FlashistFacade.ts` | `SIGNED_PLAYER_HANG_MS = 60000` (D1), `SIGNED_PLAYER_HELD_MAX_AGE_MS = 300000` (B4); pre-fetch started from `initPlayer` after the plain `getPlayer()` for an authorized player, not awaited; `takeYandexPlayerSignature()` take-once, over-bound guard (A1), never rejects, never touches `yandexSdkPlayerObject`; the four `PROFILE_LOGIN_SIGNATURE_*` enum entries (D2) (step 10). |
| `src/client/ProfileSession.ts` | `login()` takes the signature once and sends `...(signature ? { signature } : {})`; a local 65 s backstop around the take; header updated (step 11). |
| `ai-agents/knowledge-base/analytics-event-reference.md` | new § *Profile Login Signature Events* (D2). There is no server-metric doc change: that doc does not cover server metrics (amendment E, step 12). |
| Tests | `tests/core/LoginContract.test.ts`, `tests/profile-server/{SessionToken,YandexSignature,Telemetry}.test.ts` extended; the three hand-built `ProfileMetrics` mocks (`InternalPathCase`, `RouteMetrics`, `AlertRoutes`) gained `loginVerification`; `tests/client/ProfileSession.test.ts` extended; **new** `tests/profile-server/{PlayerSignature,LoginVerification,LoginVerificationRoutes}.test.ts` and `tests/client/SignedPlayerFacade.test.ts`. |

### D2's numeric value — done
`flashist_logEventAnalytics(event, value?)` already passes a number through to GameAnalytics (existing
users: `Build:StaleDetected`, `Game:Start`, `Match:Duration`). **`Waited` and `Timeout` carry the ms waited,
counted from when login asked.** `Timeout`'s value is ≈ 60000 by construction; its count is what sizes the
hang problem. `Ready` and `Failed` carry no value.

### Results (real numbers)
- Targeted suites: all pass (`LoginContract` + `SessionToken` 50; `YandexSignature` 20; `PlayerSignature` +
  `LoginVerification` + `Telemetry` 74; the route suites 184 incl. the new 11; `ProfileSession` 44;
  `SignedPlayerFacade` 28).
- `YandexSignature.test.ts`: `git diff` removes only the import line (widened to also import
  `verifyHmacEnvelope`). **No existing case was modified.**
- Mutation checks (run, then reverted):
  - logging the signature in the login route's error line → the no-leak test failed;
  - facade hang net set to 5 s → 4 facade tests failed;
  - take-once clear removed → 2 failed;
  - pre-fetch awaited in `initPlayer` → the "does not wait" test failed.
- `npx tsc --noEmit -p .`: clean.
- `npm run lint`: clean. It first flagged 3 unused `_dropped` destructures in my new tests, which I fixed.
- **`npm test`: run 3 times.**
  - **Run 1:** 1 failed / 3220 passed. `LoginRoutes.test.ts` › "a created player is pending without
    querying grants": `socket hang up`. That is the supertest flake family's untraced shape. There was no
    `SIGSEGV` and no crash report. The suite then passed 5/5 alone.
  - **Run 2:** 2 suites failed.
    - `GameImpl.test.ts`: a jest worker died with `signal=SIGSEGV`. The crash report
      `node-2026-09-29-135451.ips` starts at `ClearStaleLeftTrimmedPointerVisitor`, so this is `0197`'s V8
      segfault.
    - `AlertRoutes.test.ts`: `Exceeded timeout of 5000 ms`, the confirmed supertest flake shape.
    - Both suites then passed 3/3 alone.
  - **Run 3: green.** 179/179 suites, 3221/3221 tests. `ShellHarnesses` PASS, nothing skipped.
- **Not verified:** no browser or live run. The real SDK's `getPlayer({ signed: true })` timing and
  behaviour inside the pre-fetch, and GameAnalytics actually receiving the four events, are exercised only
  against mocks. The profile-server metric reaching Uptrace is unverified. No deploy: the order stays
  `0250` S1 first, then profile server S2, then client S2 (plan § F).

### Decision log — calls made without asking, inside the approved plan's intent
Each entry: the finding or need it answers, what changed, and why it qualified.
1. **`tests/profile-server/SessionToken.test.ts`: the existing case "validly signed vfy:true → invalid" was
   replaced** by `vfy:"true"`, `vfy:1` and a missing `vfy` (all → invalid).
   - *Why:* step 3's approved widening makes a genuine `vfy:true` valid by design. The plan's own test list
     names the replacements ("`vfy: "true"` or `1` → invalid"). This was the only existing test assertion I
     changed. Mechanical, in-plan.
2. **The S2 route tests are in a new sibling file, `LoginVerificationRoutes.test.ts`**, not
   `LoginRoutes.test.ts`.
   - *Why:* the no-leak test must `jest.mock` the Logger, and the throw test must wrap the classifier
     module. Both are module-wide and would have changed the behaviour of all 30 existing `LoginRoutes`
     tests. Same harness, same assertions as the plan lists. Obvious winner, within intent.
3. **The facade tests are in a new `tests/client/SignedPlayerFacade.test.ts`**, not `FlashistFacade.test.ts`.
   - *Why:* asserting the D2 events needs `jest.mock("gameanalytics")` plus `DEPLOY_ENV=prod`. That is the
     existing per-feature pattern (`PlatformDegradedFacade.test.ts`, `SdkLoaderRetryFacade.test.ts`) and
     would have altered the older file's environment. Obvious winner.
4. **`ProfileSession` gained a 65 s backstop (`SIGNATURE_TAKE_BACKSTOP_MS`) around the take.**
   - *Why:* the plan's ProfileSession test "the facade rejects **or hangs** → login is still sent without
     it", and step 11's "a timeout means the body goes without it", need a ProfileSession-level bound.
   - It sits above the facade's 60 s net and never fires normally, so it does not change D1's behaviour.
   - It is a literal because the tests mock the facade module wholesale. `SignedPlayerFacade.test.ts` pins
     it above `SIGNED_PLAYER_HANG_MS` so the two cannot drift.
   - Belt-and-braces within intent.
5. **`ProfileSession` repeats the non-empty and `≤ SIGNATURE_MAX` check** on whatever the facade returns.
   - *Why:* A1's reason (an over-bound 400 latches D3) applies at the point the body is built. It is cheap
     and cannot change a valid signature. Within A1's intent.
6. **A pre-fetch that already FAILED is reported as `Failed` at take, with no second call.**
   - *Why:* B4 and D1 say "a real failure falls back immediately". Retrying would be a new behaviour the
     plan does not describe. Take-once still gives the next login (relogin) a fresh call.
7. **The throw test uses `jest.mock` + `jest.requireActual` wrapping**, not `jest.spyOn`.
   - *Why:* same assertion the plan names ("classifier forced to throw → 200, `bad_signature`"). Only the
     mechanism differs: module wrapping works reliably under SWC's CommonJS output.
8. **`verifySignedPlayer` returns `bad_signature` from an outer catch.**
   - *Why:* this is the "never throws" rule for non-string input (e.g. `undefined`). Fail closed, as the
     route's own catch does.

### Flagged, not mine
- **`ai-agents/knowledge-base/decisions/adr-103-…md` is modified in the working tree by `fkit-architect`.**
  It adds a dated note that ADR-116 was accepted, which happened concurrently with this build. I did not
  touch it. ADR-116 is now `accepted`, and I checked it against this build: A1–A3, D1 60 s, D2, D3 all
  match.
- `analytics-event-reference.md` was already not Prettier-clean on HEAD. I did not reformat it.

## 2026-09-29 — S2 review round 1: coder response (fkit-coder, Process-review worker spawned by `fkit-sprint-ship-loop` via fkit-lead)

Standing approval: the owner approved the plan and amendment on 2026-09-29. Ran `fkit-process-stateful-review`
steps 0–7 on `review.md` round 1 (R1–R3, all low, all documentation). Loop check: no accepted residuals yet;
no ADR's "Re-raise only if" covers these. All three verified `CORRECT`; no regression or oscillation (no prior
coder rows).

### What changed
- `src/client/ProfileSession.ts` — the `SIGNATURE_TAKE_BACKSTOP_MS` JSDoc now names
  `SignedPlayerFacade.test.ts` (was `FlashistFacade.test.ts`). Comment only.
- `ai-agents/knowledge-base/analytics-event-reference.md` § *Profile Login Signature Events* — `Ready` and
  `Failed` "When Fired" cells reworded to match the code.
- `review.md` — three *Coder response* rows. Header `Status:` left `in-review` (see R1 below).

### Decision log — fixes applied without asking
1. **R2** — answers R2 (wrong test file named). Changed the one word in the comment.
   - *Qualified because:* verified `CORRECT` (the pin is `SignedPlayerFacade.test.ts:139-140`; `FlashistFacade.test.ts`
     does not mention the constant), mechanical, one line, in-plan (it corrects this build's own comment).
2. **R3** — answers R3 (a) and (b). `Ready`: "under 300 s old" → "at most 300 s old (held exactly 300 s still
   counts)". `Failed`: "Fires as soon as the failure is known" → "If the boot pre-fetch had already failed, fires
   when login asks; otherwise fires when the failed answer comes back while login waits".
   - *Qualified because:* verified `CORRECT` against `takeYandexPlayerSignature` (the `held.signature === null`
     branch fires at take time) and the `> SIGNED_PLAYER_HELD_MAX_AGE_MS` check; wording-only, localized to two
     cells; in-plan (this build's own D2 doc section).
- **Obvious-winner calls:** none.

### R1 — routed, not fixed
- Verified `CORRECT` both halves (D2 "nothing but their name" vs the ms value on `Waited`/`Timeout`; Decision 4
  "malformed" → 200 vs `LoginRequestSchema`'s 400 on an empty / over-long / non-string signature).
- An accepted ADR is the architect's to edit. The lead spawned fkit-architect in parallel for the dated note.
  I did not touch ADR-116.
- Status cell set to `blocked` (the skill's vocabulary has no "routed" value; `✅ done` would claim an edit
  nobody has made yet). So the ledger stays `in-review`: the close-out condition needs every finding
  dispositioned, and R1's fix is not landed. Flip R1 to `✅ done` and the header to `closed-out` once the
  architect's note is in.

### Checks
- `npx jest tests/client/ProfileSession.test.ts tests/client/SignedPlayerFacade.test.ts` → 2 suites, 72 tests, all pass.
- `npx eslint src/client/ProfileSession.ts` → clean.
- `npx prettier --check` → `ProfileSession.ts` clean; `analytics-event-reference.md` reports style issues, but it
  already did before this edit and on HEAD (checked both copies). Not reformatted (unrelated churn).

## 2026-09-29 — S2 review round 1: R1 closed; owner ruling on the ms value (fkit-coder, same Process-review worker, follow-up from fkit-lead)

### Owner ruling — recorded verbatim (2026-09-29, live via `AskUserQuestion` in the `fkit lead` session, relayed by fkit-lead)
- **Question:** *"The 'Waited' and 'Timeout' analytics events also carry the wait time in milliseconds (no ids
  or personal data). That was my addition, not your words. OK to keep?"*
- **Answer:** **"Keep it (Recommended)"** — option text *"Lets you see not just how often the signed call is
  slow, but how slow (e.g. 3 s vs 40 s). Already built and tested."*
- ⇒ The ms value on `Waited` / `Timeout` is a first-hand owner ruling now, not only the lead's allowance.
  Also recorded in `plan.md` § *Owner rulings on the amendment (2026-09-29)* (a "D2 follow-up" bullet). No
  build change.

### What changed
- `review.md` — R1 row: Action "fixed by fkit-architect's dated clarification notes in ADR-116, 2026-09-29",
  Status `✅ done`. Header `Status: in-review` → `closed-out`.
- `plan.md` — the ruling above, added under D2.

### Decision log
1. **R1 → `✅ done`** — answers R1 (a) and (b). I re-checked ADR-116 myself: the note "what \"malformed\" means
   here" sits after § *Decision* point 4 and matches `LoginRequestSchema` (400 on a contract break, 200 +
   `vfy:false` on a verification failure). The note "the events carry one number: the wait in ms" sits after
   the D2 paragraph and matches `awaitSignedPlayer`. Neither note changes a decision.
2. **Header → `closed-out`** — close-out condition met: R1–R3 all `✅ done`, nothing blocked, no open
   residual.
- Fixes applied without asking this step: none (docs bookkeeping only; no source touched). Obvious-winner calls: none.

## 2026-09-29 — Closed as the S2 build, `(agent-closed — not owner-verified)` (fkit-producer, spawned by fkit-lead)

- **Owner ruling (2026-09-29, live via `AskUserQuestion` in the `fkit lead` session, relayed by fkit-lead):**
  asked *"0325's S2 is built and reviewed; S3a (turn verification on) waits on deploy + a watch period + your
  approval. How should we track what's left?"* → **"Split it (Recommended)"** — *"Close 0325 as the S2 build
  (agent-closed). File a 'verify S2 live' task (deploy check + watch the ok-rate) at the top of Sprint 7, and a
  separate 'S3a enforce' build task after it. ADR-116 gets a note that S3a moved to that task."*
- **Evidence the close rests on (all recorded above in this worklog, not re-run by the producer):** S0 passed
  (owner-run, 2026-09-29); plan approved 2026-09-28 and the S0-informed amendment approved 2026-09-29 with
  rulings D1–D3; S2 built — full `npm test` green on run 3 (179 suites / 3221 tests; run 1's failure attributed
  to the supertest flake family, run 2's to `0197`'s V8 segfault plus the supertest timeout shape); lint and
  `tsc --noEmit` clean; stateful review round 1: 3 low doc findings (R1–R3), all fixed, ledger `closed-out`;
  ADR-116 accepted.
- ⚠️ **Not committed, not deployed.** No browser or live run was done; the real SDK, the metric reaching
  Uptrace and the events reaching GameAnalytics are unverified (see *Not verified* above).
- **What moved out of this task:**
  - **S3a (plan steps 13–15 and their tests) →
    [`0340`](../../backlog/0340-0325-s3a-enforce-mint-verified-sessions/brief.md)** (Sprint 7, rank 3). Gate:
    `0339`'s S2 exit plus an explicit owner approval to enforce. Carries the rollback rule and the ⛔ ADR-113
    reminder above.
  - **The live verification (deploy order check, the metric's outcomes, the four client events, the owner's S2
    exit call) → [`0339`](../../backlog/0339-verify-0325-s2-live-the-login-signature-check-in-production/brief.md)**
    (Sprint 7, rank 2). Owner-run. Does not block Sprint 6's deploy.
  - Brief verification steps 4–6 (S3a) and 8 (the deploy order) now live in those two tasks.
- **Dependencies repointed to `0340`:** `0250` (slice S3b), `0319`, `0332`, `0323`; pointer note in `0248`.
- ADR-116 not edited by the producer (the architect adds the "S3a moved" note). Nothing committed. No
  `ai-agents/wiki-vault/` write.
