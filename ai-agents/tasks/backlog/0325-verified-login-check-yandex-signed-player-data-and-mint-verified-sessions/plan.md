# 0325 — Verified login: implementation plan (plan-only; nothing written)

## Summary
- **S0 needs no code shipped and no deploy.** It is two owner-run steps: (1) a snippet pasted into the browser console, inside the game's own iframe (the SDK is reachable there through the already-exposed `window.FlashistFacade.instance.yandexGamesSDK`, `FlashistFacade.ts:450,1631`), and (2) a pipe from the clipboard to the profile box that runs the HMAC check with the box's key. The only file needed is a throwaway local helper (`s0-hmac-check.mjs`) in the task folder. It holds no secret and the owner reviews it before running it. About 30–45 min of owner time.
- An alternative, **S0a**, needs no clipboard but has a real cost. The key check is folded into S2's shadow metric, so ~1.5–2 days of S2 are built before we know the key works (Q1).
- **S2 is shadow only.** `signature` becomes optional in the login body. The claim `vfy` widens to boolean, but the server still mints only `false`. A new bounded metric, `geoconflict.profile.login.verification`, is added. The client makes one `getPlayer({signed:true})` call per login, never blocks on it, and never stores it.
- **S3a** mints `vfy:true` only for `ok` + signed id === asserted id + fresh. `resolveCaller` returns `{playerId, verified}`. Every failure falls back to today's `vfy:false`. No response changes.
- **New deploy dependency found:** a profile-server build from this tree carries `0250` S1's server half, which requires S1's client to deploy first. So **0325's server S2 deploys only after 0250 S1 has fully deployed.**
- Two small deviations from the brief, stated so the owner approves them knowingly:
  - the metric gets a 7th bounded value, `bad_payload`: the HMAC passed but no id field was found. This is exactly the "Yandex changed the payload" signal (report §9.3);
  - `verifySignedPlayer` returns a reason, not "id or nothing", because the metric needs the reason.

---

## 0. Grounding (checked in the tree, 2026-09-28)

- `SessionToken.ts:31-37,49-55`: `vfy: false` in both the interface and the zod literal. A `vfy:true` token is `invalid` today. `signSessionToken` hardcodes `vfy:false` (`:86`).
- `YandexSignature.ts:105-153`: `verifySignedPayload` does, in order: envelope split (`:112-126`), the check against both HMAC constructions (`:128-140`), JSON parse (`:142-147`), then `normalizePurchases` (`:148`). It fails closed on an empty secret (`:109`) and never throws.
- `LoginContract.ts:25-28`: `LoginRequestSchema` is `z.object` (not strict), so an old server silently strips an unknown `signature`.
- `Routes.ts`:
  - `CallerResolution` is at `:299`.
  - `resolveCaller` is at `:475-497` (ok branch `:493`); its doc (`:444-449`) reserves this spot for the check.
  - The login route is at `:658-736`: parse `:673`, `platformLabel` `:686`, resolve `:688-697`, `signSessionToken` `:719`, `no-store` `:726`.
  - `AppOptions` is at `:193`; `createApp` is at `:418`.
  - It already imports S1's `PublicProjection`.
- `Server.ts:118-123`: `YANDEX_PAYMENTS_SECRET` is read once and passed only into `PaymentsConfig` (`:170-175`). Login needs the same value, so there is **no new env var** and config parity is unchanged.
- `Telemetry.ts:135-148,182-189,234-398`: the `ProfileMetrics` interface, the no-op set and the counters. Three tests build full `ProfileMetrics` objects by hand (`InternalPathCase.test.ts:169`, `RouteMetrics.test.ts:45`, `AlertRoutes.test.ts:120`) and must gain the new method.
- Client:
  - `ProfileSession.ts:162-233` does `login()`/`postLogin()`, with the body at `:213`.
  - `relogin` is at `:247-270`.
  - `FlashistFacade.ts:1269-1284` is `initPlayer` (plain `getPlayer()`), and `:1339-1357` is `getYandexUniqueId`.
  - `tests/client/ProfileSession.test.ts:9-13` mocks the facade by method name.

---

## S0 — Spike: what the signed player data really looks like (owner-run, no deploy)

**Does S0 need code shipped first? No.**
- Step A uses the production bundle as it is: `window.FlashistFacade` is already exposed, and its `yandexGamesSDK` field is public. Webpack's default Terser does not rename object properties, so the name survives minification. I did not check this in the built bundle; if the snippet prints "no SDK in this frame", that is the fallback trigger (see "If Step A cannot reach the SDK" below).
- Step B needs one local helper file. It is not deployed, not in `src/`, and holds no secret.

### Step A — in the browser (answers unknowns 3 and 4, plus the length bound and latency)
1. Open the game on Yandex Games, **logged in** to your Yandex account, and wait for the start screen.
2. Open DevTools → Console. In the console's **context dropdown** (top-left, reads `top` by default), pick the **game's iframe** (the frame that serves our game, not `yandex.ru`).
3. Pause any clipboard manager (Raycast, Alfred, Paste…) for the length of Step B.
4. Paste and run this snippet. It prints only key names, types, lengths and yes/no. It never prints the id, name, avatar or signature.

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

5. **Report back in chat only the table's rows.** They are key names, types, numbers and yes/no. They contain no id, name, avatar or signature. `issuedAtAgeIfSeconds` is only there to tell seconds from milliseconds: a small number means seconds, a huge negative number means milliseconds.

### Step B — the key check (answers unknowns 1 and 2)
The key lives only on the profile box, so the signature has to travel to the box, one way, by pipe. It is never printed, never saved to a file, and never put in shell history.

1. After approval, the coder writes `ai-agents/tasks/backlog/0325-…/s0-hmac-check.mjs` (a throwaway, never deployed; the owner reads it before running it):
   - It reads one signed string from stdin.
   - It writes a small Node program to stdout. That program embeds the string as a `JSON.stringify` literal on its own line, wraps all its work in `try/catch` that prints only the error's name, reads `process.env.YANDEX_PAYMENTS_SECRET` inside the container, and prints only:
     - `secret present: yes|NO`
     - `HMAC over base64 payload: MATCH|no`
     - `HMAC over decoded JSON: MATCH|no`
2. **Dry run first**, to prove the pipe with no real signature. From the repo root:
   `printf 'AAAA.e30=' | node <task-folder>/s0-hmac-check.mjs | ssh <your-ssh-alias-for-the-profile-box> 'docker exec -i <profile-api-container> node'`
   (add `sudo` before `docker` if that is how you normally run it). Expect `secret present: yes`, `no`, `no`.
3. **Real run.**
   - In the same iframe console, run on two separate lines:
     - `var s0p = await FlashistFacade.instance.yandexGamesSDK.getPlayer({ signed: true });`
     - `copy(s0p.signature); s0p = undefined;`
   - In the terminal, run the same pipe with `pbpaste |` in place of `printf …`.
   - Then run `pbcopy < /dev/null` to clear the clipboard, and **close the game tab**.
4. Report back only the three output lines.

**Why this is acceptable:**
- The signature is the owner's **own**.
- Today **no server accepts it** for anything.
- It moves clipboard → pipe → container memory, and touches no disk and no history.
- The key never leaves the box.

**If Step A cannot reach the SDK** (e.g. `FlashistFacade` is not on `window` in prod), fall back to S0a (Q1 option 2). Do not ship a debug endpoint.

### S0 exit — the coder writes it into `worklog.md` (names and yes/no only)
- Does the key verify? Which construction matched: base64 payload, decoded JSON, or both?
- The id field path (e.g. `data.uniqueID` — whatever Step A prints).
- Is `issuedAt` present, and in which unit?
- Does the signed id equal `getUniqueID()`?
- Signature length (sets the zod bound) and signed-call latency (sets the client timeout).

### If S0 fails — stop and return to the owner; nothing is enforced
| S0 finding | Consequence |
|---|---|
| key verifies neither construction | **Blocked.** The approach is dead as designed. Return to the owner. `0250` S3b and `0319` stay blocked. |
| signed id ≠ `getUniqueID()` (no field equal) | **Blocked.** We cannot map a verified id to a stored identity. Return to the owner. |
| signed call fails / no `signature` | **Blocked** for this account. Re-check with a second account before ruling. |
| no `issuedAt` | **Stop and ask** (Q3). Without it, one captured signature is a permanent verified login. |
| all good | Proceed to S2. The ADR's architect spawn can start (it needs S0's facts). |

---

## S2 — Shadow mode (verify at login, change nothing else)

### Core contract
1. `src/core/profile/LoginContract.ts:25-28`: add `signature: z.string().min(1).max(SIGNATURE_MAX).optional()`, and export `SIGNATURE_MAX` from the same file.
   - Proposed bound: `max(4 × S0's observed length, 2048)`, capped at `8192`. It is well under Express's 100 kb JSON limit.
   - An old client (no field) still parses.
   - An empty string is rejected with 400. That is safe because the new client omits the field rather than sending `""`.
2. Update the header comment (`:5-22`): after S3a, a `vfy:true` session is the proven owner.

### Server
3. `src/profile-server/SessionToken.ts`:
   - `SessionClaims.vfy: boolean` (`:36`); `SessionClaimsSchema.vfy: z.boolean()` (`:54`).
   - `signSessionToken(secret, subject: { playerId; platform; verified?: boolean })`, minting `vfy: subject.verified === true` (`:73-87`). **No caller passes `true` in S2.**
   - Update the header (`:4-19`), including the note that key rotation now also drops verified sessions (for the ADR).
4. `src/profile-server/YandexSignature.ts`:
   - Extract `verifyHmacEnvelope(signed, secret): { decodedJson: string } | null` from `:109-140`, unchanged in behaviour. `verifySignedPayload` becomes `envelope → JSON.parse → normalizePurchases`.
   - **All existing `YandexSignature.test.ts` cases must pass unmodified** (proof of a pure refactor).
5. New `src/profile-server/PlayerSignature.ts`, with `verifySignedPlayer(signed, secret, nowMs)` returning one of:
   - `{ status: "ok", platformUserId, issuedAtMs? }`
   - `{ status: "no_secret" }`
   - `{ status: "bad_signature" }` (structure, base64 or HMAC)
   - `{ status: "bad_payload" }` (HMAC ok but not JSON, or no string id at S0's path)
   - `{ status: "stale" }`

   Rules:
   - It reads **only** the id field and `issuedAt`. The name, avatar and every other field are dropped and never returned.
   - Freshness is checked only if `issuedAt` exists (per S0): stale if older than `LOGIN_SIGNATURE_MAX_AGE_SECONDS = 900` (15 min) or more than `300` s in the future.
   - It never throws.
   - ⛔ Header comment: *the signature is a credential — never log, never persist* (unlike a purchase's `rawPayload`).
6. New `src/profile-server/LoginVerification.ts`, with `classifyLoginSignature(signature | undefined, assertedId, secret, nowMs)`:
   - Returns `{ outcome: LoginVerificationOutcome; verified: boolean }`.
   - Outcomes, in order: `absent | no_secret | bad_signature | bad_payload | stale | id_mismatch | ok`.
   - `verified = outcome === "ok"` (and `ok` requires signed id === asserted id).
   - A pure function, unit-tested alone. The route only calls it.
7. `src/profile-server/Telemetry.ts`:
   - Add `export type LoginVerificationOutcome` with the 7 values.
   - Add `loginVerification(outcome)` to `ProfileMetrics`, the no-op set, and a counter `geoconflict.profile.login.verification` with the single label `outcome` (7 series, same discipline as `sessionRejected`).
8. `src/profile-server/Routes.ts`:
   - Add `AppOptions.playerSignatureSecret?: string` (absent ⇒ `no_secret`).
   - In the login route, right after `platformLabel` (`:686`):
     - call `classifyLoginSignature(parsed.data.signature, parsed.data.platformUserId, secret, Date.now())` inside its own `try/catch`; a throw counts as `bad_signature`, and the login continues;
     - record `metrics.loginVerification(outcome)`;
     - **use the result for nothing else in S2.** The resolve, the body and `signSessionToken` (`:719`) stay unchanged.
   - Update the route comment (`:640-657`) and the `TODO(0267)` at the profile read.
9. `src/profile-server/Server.ts:170-190`: pass `playerSignatureSecret: yandexPaymentsSecret`. Add a comment that the one key now serves both purposes.

### Client
10. `src/client/flashist/FlashistFacade.ts`, new method `takeYandexPlayerSignature(): Promise<string | null>`:
    - **Take-once:** the first call returns the pre-fetched signature and clears it; later calls (relogin) make a fresh call. This means a relogin 24 h later never sends a stale one.
    - Each fetch: `getPlayer({ signed: true })`, raced against `SIGNED_PLAYER_TIMEOUT_MS` (≈ max(2000, 3 × S0's latency)); try/catch.
    - Returns `typeof p.signature === "string" && length > 0 ? p.signature : null`; null for a guest or when there is no SDK. Never rejects.
    - **Never assigned to `yandexSdkPlayerObject`**, so the boot path is untouched.
    - The pre-fetch starts from `initPlayer` (`:1277`) after the plain call succeeds and the player is authorized, **not awaited**, so it never extends the platform-init deadline.
    - ⛔ Never logged. Not added to analytics.
11. `src/client/ProfileSession.ts`:
    - In `login()`/`postLogin()` (`:162-213`), get `await FlashistFacade.instance.takeYandexPlayerSignature()` and build the body as `{ platform, platformUserId, ...(signature ? { signature } : {}) }`.
    - A null signature, a thrown error or a timeout means the body goes without it. The D3 latch and the analytics are unchanged.
    - Update the header (`:5-9`): the signature lives in memory only, like the token.
12. Docs: add a new-metric note to `ai-agents/knowledge-base/analytics-event-reference.md` **only if** that doc covers server metrics. No new client events are planned: after client rollout, the server's `absent` count ≈ signed-call failures plus old bundles.

**S2 exit:** the owner picks a window, and `ok` is the large majority of real logins. `stale` / `bad_payload` / `id_mismatch` counts justify or tune the 900 s / 300 s window **before** anything is enforced. The owner approves moving to S3a (a later gate, not decided now).

---

## S3a — Enforce: mint verified sessions (server only)

13. `Routes.ts` login:
    - `verified = classification.verified`.
    - Resolve by the **signed** id when verified (equal to the asserted id by construction, so it is the same call), else by the asserted id exactly as today.
    - `signSessionToken(..., { playerId, platform, verified })`.
    - The creation switch path (`resolveExistingPlayer`) is unchanged.
    - The response shape and status are unchanged.
14. `Routes.ts:299`: `CallerResolution` ok becomes `{ status: "ok"; playerId: string; verified: boolean }`.
    - Extract a pure exported `callerFromSession(verification)` used at `:493`, so it can be unit-tested.
    - Update the ⚠️ doc at `:290-298`: `ok` alone is not the proven owner, `verified: true` is.
    - No route reads `verified` yet (that is `0250` S3b and `0319`).
15. Update the comments that say "no verification yet": `PublicProjection.ts:3,16,44-54`, `SessionToken.ts:6-9`, `LoginContract.ts:10-13`, `ProfileSession.ts:5-7`. Comments only.

---

## Deploy order and rollback

0. **Precondition:** `0250` S1 fully deployed (client, then profile server). A profile-server build from this tree includes S1's server half.
1. **Profile server S2.** The widened claim goes live, still minting `false`, and the metric starts. Clients send nothing yet, so the metric shows `absent`.
2. **Game client S2.** Now signatures arrive. Either order would be safe for the body (an old server strips the field); server first means the metric is live on day one.
3. Observe for the owner's window, then the owner approves.
4. **Profile server S3a.** Client unchanged.

**Rollback:**
- S3a → S2: live `vfy:true` tokens still parse (boolean) ✓.
- S2 → pre-S2 before S3a ever shipped: all tokens are `false` ✓, and the S2 client's field is stripped ✓.
- ⛔ **Never roll S3a straight back to a pre-S2 build.** Every live verified token turns `invalid`, and each client re-logs in once. That is survivable but noisy.
- Record the order actually followed in `worklog.md` (verification step 8).

---

## Tests (all synthetic keys and ids; nothing real in fixtures)

- **`tests/core/LoginContract.test.ts`:** signature absent ✓; valid ✓; `""` → fail; over-bound → fail; an old body parses; an unknown extra key is still stripped.
- **`tests/profile-server/SessionToken.test.ts`:**
  - a hand-built old-shape `vfy:false` token (synthetic key) verifies under the new code;
  - an S2-minted token parses under a test-local copy of the **old** `z.literal(false)` schema;
  - a `verified:true` mint gives `claims.vfy === true`;
  - `vfy: "true"` or `1` → invalid;
  - flipping `vfy` false→true in the payload without the key → invalid (MAC);
  - a `vfy:true` token fails the old-schema copy (this documents why the order matters).
- **`YandexSignature.test.ts`:** existing cases unchanged; `verifyHmacEnvelope` under both constructions.
- **New `PlayerSignature.test.ts`:**
  - ok under each construction;
  - a **forged** signature (wrong key) → `bad_signature`;
  - a tampered payload → `bad_signature`;
  - no dot / empty parts / non-base64 → `bad_signature`;
  - HMAC ok but no id → `bad_payload`;
  - non-JSON → `bad_payload`;
  - **old `issuedAt`** → `stale`; far-future → `stale`; boundary values;
  - **empty secret** → `no_secret`;
  - garbage input never throws;
  - the result object carries no name or avatar.
- **New `LoginVerification.test.ts`:** the full outcome table, including a **valid signature for A + asserted B** → `id_mismatch`, `verified:false`.
- **`LoginRoutes.test.ts`:**
  - S2: valid / invalid / missing signature → identical status and body shape, token `vfy:false`, each metric outcome recorded exactly once;
  - no secret configured → 200, `no_secret`;
  - the classifier forced to throw (jest spy) → 200, `bad_signature`;
  - **no leak:** capture every logger write and assert the signature string never appears; assert it appears in no argument of any repository mock call (JSON of all `mock.calls`).
  - S3a: valid + match → `vfy:true`; A-signature + B-id → `vfy:false` and the token's `pid` is never A's; tampered → `false`; stale → `false`; creation-switch-off plus a valid signature → unchanged find-only behaviour.
- **`callerFromSession` unit test:** `verified` follows `claims.vfy`.
- **`Telemetry.test.ts`:** the new counter name and label; 7 bounded values.
- **Three hand-built `ProfileMetrics` mocks** gain `loginVerification`.
- **`tests/client/ProfileSession.test.ts`** (facade mock gains `takeYandexPlayerSignature`):
  - a signature is sent when present, and the key is absent when the value is null;
  - the facade rejects or hangs → login is still sent without it;
  - a relogin calls take again (a fresh fetch).
- **`tests/client/FlashistFacade.test.ts`:** take-once; timeout → null; non-string → null; guest → null; never rejects; `yandexSdkPlayerObject` untouched.
- **Optional:** one `Login.it.test.ts` case (real Postgres), synthetic key → `vfy:true` (S3a).
- **Gate:** `npm test` green. If a known supertest flake appears, re-run and say so.

---

## The ADR (the architect writes it; owner sign-off pending)

- **When:** spawn `fkit-architect` after S0's result (it needs the facts) and before S3a ships. The file is `ai-agents/knowledge-base/decisions/adr-<next free>-…` (115 today; re-check at write time). Status: **proposed — owner sign-off pending**. The task does not close without that sign-off or an owner ruling that it may.
- **Title:** "The first verified identity: Yandex signed player data, checked once at login, carried as `vfy:true`."
- **Context:** today every login is asserted; report §2.1/§2.6; S0 facts (field names, construction, `issuedAt`, id equality — no values).
- **Decision:**
  - the mechanism;
  - the one seam (`POST /v1/login` + `resolveCaller`);
  - `vfy:true` iff ok + same id + fresh (window value);
  - fail behaviour: **failure ⇒ an unverified session, never a refused login, never a read error**;
  - the claims widening shipped before the first mint (the deploy order);
  - the one key serves payments and identity.
- **Options rejected:** per-read signature (1b); client SDK purchase state (dead); refusing unverified sessions; hash of the id (ADR-103 already says do not re-propose).
- **Accepted residuals (all that the brief lists, plus two found in planning):**
  1. A verified session is a 24 h bearer credential with no revocation. Key rotation drops all sessions; revisit a key id / dual key (`SessionToken.ts:18`).
  2. A Yandex payload change silently makes everyone unverified. The S2 metric (`ok` ratio, `bad_payload`) makes it visible; an alert is a later task.
  3. The signed data carries the public name and avatar: they transit the server and are **never stored or logged** (152-ФЗ, `0048`).
  4. **L5** polling inference (`0250` D4).
  5. **`0250` S1 rollback caveat:** after S1, a profile-server rollback can let old bundles that stored `""` under the old analytics prefix fire a false `Citizenship:Earned:XP`. New clients use `_v2`.
  6. **Accepted cost (`0250` Q-A):** an earned citizen's own card reads 100 / 100 until verified reads ship (this task + `0250` S3b). History note: Q3 items 1–2 were closed by Q-A.
  7. ADR-103 / `0322`'s forged id stays open until the unfiled join-token step.
  8. *(new)* Replay within the freshness window: a captured signature logs in as the victim for up to that window. The same class as a stolen token.
  9. *(new)* **Wider blast radius of `YANDEX_PAYMENTS_SECRET`:** a leak now forges identity as well as purchases.
  10. Both HMAC constructions are accepted (parity with purchases); S0's finding feeds `0309`/`0310`.
- **Updates:**
  - **ADR-103**'s "re-raise only if — the key is issued": the key is issued, and the profile login now verifies. The **game-server** seam (`getCreditableYandexId`) is still asserted. ADR-103 is **amended, not superseded**.
  - **ADR-113** points 5/9 and the re-raise list: `vfy:true` is now issued; `resolveCaller` carries `verified`.

---

## Gating — what can be built before S0's result

| Work | Depends on S0? |
|---|---|
| Claims widening + `verified` mint param, HMAC-envelope extraction, metric plumbing, `AppOptions` secret wiring, client take-once fetch + body plumbing, `callerFromSession` | **No** — payload-independent |
| `verifySignedPlayer` id path, `issuedAt` unit/freshness, `SIGNATURE_MAX`, client timeout value, the ADR text | **Yes** |
| Any `vfy:true` mint (S3a) | **Yes**, plus the S2 exit gate |

- **Recommendation:** run S0 first. It is under an hour of owner time and removes all rework risk.
- If the owner cannot run it soon, the payload-independent rows may be built first (Q2).
- If S0 then fails, that plumbing is harmless (it mints only `false`), but it is dead code to remove or park, which is the owner's call.

## Effort (estimate, not measured)
- S0: owner ~45 min + coder ~0.25 d
- S2: server ~1.5 d, client ~0.5 d
- S3a: ~0.5 d
- ADR: architect ~0.25 d

**Carried for approval with the plan (not separate questions):**
- The freshness window is 15 min old / 5 min future, measured through S2's `stale` count before S3a enforces anything.
- The metric has a 7th value, `bad_payload`.
- `0325`'s server S2 deploys only after `0250` S1 has fully deployed.
- The S2 exit window (how long, and what counts as "the large majority") is the owner's call at the S2 gate, not now.

## Owner rulings (2026-09-28, live via `AskUserQuestion` in the `fkit lead` session, relayed by fkit-lead) — record verbatim
- **Q1 (how S0's key check is run):** "You run the 45-min test (Recommended)" — Browser snippet + copy your own signed data through a pipe to the server (no disk, no chat). Zero production change; we know the answer before building.
- **Q2 (build before S0's answer?):** "Test first, then build (Recommended)" — No wasted work; waits for your ~45 minutes.
- **Q3 (if S0 finds no timestamp):** "Stop and come back to me (Recommended)" — Don't hand out verified sessions on data that can be replayed forever; look for another design.
- **Plan approval:** "Approve (Recommended)" — 2026-09-28. The "Carried for approval with the plan" items above are approved with it.
