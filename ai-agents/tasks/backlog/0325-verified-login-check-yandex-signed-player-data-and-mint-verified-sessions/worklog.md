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
