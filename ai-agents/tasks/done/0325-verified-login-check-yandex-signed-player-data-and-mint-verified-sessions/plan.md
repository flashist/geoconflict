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

---

## S0-informed amendment (2026-09-29)

- **Who / what:** written by `fkit-coder`, a plan-only unit spawned by `fkit-lead` after the owner chose
  *"Build 0325 (Recommended)"* (2026-09-29, live via `AskUserQuestion`). No source, no tests, nothing
  committed.
- **The approved text above is unchanged** (blob `deb67836680bd77c779c5c1038db8f801798b7a7`). This section
  is appended beneath it.
- **Precedence:** where this section differs from the text above, this section governs **once the owner
  approves it**. Items marked ⏳ wait for an owner ruling (**D1–D3**, listed at the end).
- **S0 facts used** (`worklog.md` § *2026-09-29 — S0 result*): decoded-JSON construction only; id at
  `data.id` and `data.uniqueID` (both equal `getUniqueID()`); top-level `algorithm` (string), `issuedAt`
  (number, seconds), `requestPayload` (string), `data`; signature length 733; one signed-call sample of
  6852 ms with a `net::ERR_SOCKET_NOT_CONNECTED` logged (retry likely, inferred), on a connection that was
  slow that session (a 5517 ms loader fetch).

### A. The payload-dependent values (plan § *Gating*), resolved

**A1. `SIGNATURE_MAX = 2932`** — the approved formula: `max(4 × 733, 2048) = 2932`, under the `8192` cap.
- **New, plan gap found: the client must also drop an over-long signature.** The server answers an
  over-bound `signature` with **400**. `ProfileSession.postLogin` treats any non-OK status as `error`
  (`ProfileSession.ts:221-222`), and `login()` then latches D3 (`:162-170`): **no profile session for the
  rest of the page load.** That would break the plan's fail rule (*failure ⇒ an unverified session, never
  a refused login*).
- **Fix, inside the plan's intent:** `takeYandexPlayerSignature()` returns `null` for a signature longer
  than `SIGNATURE_MAX`, imported from `src/core/profile/LoginContract.ts`. An over-long signature then
  just reads as `absent`.
- **Rule for later:** never lower `SIGNATURE_MAX` on the server ahead of the client.
- **Tests (added):** client, over-bound signature → `null` and the body has no `signature` key.

**A2. The id field: `verifySignedPlayer` reads `data.uniqueID` only.**
- It must be a non-empty string; otherwise `bad_payload`.
- `data.id` is not read, and `data.id === data.uniqueID` is **not** required.
- **Why `uniqueID`:**
  - it is the field the SDK's `getUniqueID()` is named after;
  - `getUniqueID()` is exactly what the client asserts today (`getYandexUniqueId`,
    `FlashistFacade.ts:1664`) and what `player_identities` stores;
  - so the `id_mismatch` check compares like with like.
- **Why not require equality:** both fields sit inside the same HMAC-covered payload, so a forger can set
  neither. Requiring them equal adds no security. It only adds a way to fail: if Yandex ever made `id`
  differ (for example a per-app id), every login would turn `bad_payload`.
- **No fallback to `data.id`** when `uniqueID` is missing. A silent fallback would hide the very *"Yandex
  changed the payload"* signal that `bad_payload` exists to show.

**A3. `issuedAt`: top level, in seconds, and now REQUIRED.**
- Missing, not a number, or not finite → `bad_payload`.
- **This replaces** *"Freshness is checked only if `issuedAt` exists (per S0)"* (step 5). S0 proved the
  field exists. Owner ruling Q3 (*"Don't hand out verified sessions on data that can be replayed
  forever"*) means a payload without it must not verify.
- The `ok` result's `issuedAtMs` becomes required: `issuedAt × 1000`.

**A4. The freshness window, as approved: 900 s old / 300 s future.**
- `stale` if `nowSec − issuedAt > 900`, or if `issuedAt − nowSec > 300`.
- Exactly 900 s old, or exactly 300 s ahead, counts as fresh.
- **Tests (added):** 900 / 901 s old; 300 / 301 s ahead; `issuedAt` missing, a string, `NaN`.

**A5. The HMAC construction: unchanged.** Both constructions are still accepted (step 4, ADR residual 10).
Yandex's public purchase docs HMAC the decoded JSON in their Node example, which matches S0. Dropping the
base64 construction stays with `0309`/`0310`.

### B. The client's wait for the signed call — ⏳ D1 (and D2)

**B1. Traced flow on today's tree** (`572d134`):
1. Platform-init stage 2 calls `initPlayer()` (`FlashistFacade.ts:746` → `:1587`). The plain
   `getPlayer()` is at `:1595`. **The plan's pre-fetch starts here**, after that call resolves and the
   player is authorized. It is not awaited.
2. Platform init then finishes: flags, payments, language and name. After that, `Bootstrap` downloads
   the `app` chunk (`Bootstrap.ts:27-37,54`) and calls `startClient()`.
3. `startClient()` fires `void startProfileSession()` (`Main.ts:1102`). That is fire-and-forget: menus,
   matchmaking and play never wait on it.
4. `ensureSession` → `isYandexAuthorized` / `getYandexUniqueId` (instant by now) → `resolveApiBase`
   (the `/api/env` fetch, `ConfigLoader.ts:33`, cached after the first call) → `login()` →
   **[new: take the signature]** → `postLogin` (its own 5 s fetch timeout, `ProfileSession.ts:39,208`).

- **The head start:** the signed call runs during step 2 plus the `/api/env` fetch. **Not measured.**
  Plausibly under a second on a fast connection, and several seconds on a slow one.
- **Who waits on the login:** every `profileFetch` caller joins the login in flight (`ensureSession`,
  `ProfileSession.ts:104-116`). That covers:
  - the citizenship card's first profile read (`CitizenshipCard.ts:237` → `PlayerProfileView.ts:79,182`);
  - the inbox;
  - the tenure claim;
  - name change;
  - the payments intent.
- `profileFetch`'s `timeoutMs` bounds only the request made after the session exists, **not** the wait
  for the login itself.

**B2. What a logged-in player sees while the login waits** (true today, and made longer by any signature
wait):
- `CitizenshipCard` renders `profile === null` as the **guest** card (`CitizenshipCard.ts:417-420`): a
  "log in" button, no XP, no citizen status, and the approved-name lock (0321) not yet applied. This lasts
  until the first read lands.
- Tapping that false "log in" button opens the auth dialog and asks for a full restart
  (`CitizenshipCard.ts:364-410`).
- Today this is bounded by about 5 s of login plus 5 s of read. Fixing it is **not** in scope; it is noted
  as a possible task.

**B3. The options, from the player's side.** For a player whose signed call finishes before login asks,
all three options behave the same.

| Option | Worst-case extra wait | Worst case for the card (login ask → card filled) | Cost |
|---|---|---|---|
| (a) Plan formula, `max(2000, 3 × 6852)` ≈ **20.5 s** | ≈ 20.5 s of the false guest card | ≈ 30 s | Fewest unverified sessions |
| **(b) Fixed 5 s wait (Rec)** | ≤ 5 s | ≈ 15 s (vs ≈ 10 s today) | A player whose signed call takes longer than *head start + 5 s* is unverified for that page load |
| (c) No wait: use it only if it is already there | 0 | ≈ 10 s (unchanged) | The unverified share is unknown, and likely highest on slow connections |

- **What "unverified" costs:**
  - **In S2: nothing a player can see.** S2 is shadow only.
  - **After S3a + `0250` S3b:** the player sees the unverified card (an earned citizen reads 100 / 100,
    `0250` Q-A) until the next page load.
- **Why 5 s:** it matches the codebase's existing bounded waits: `LOGIN_TIMEOUT_MS`,
  `PROFILE_FETCH_TIMEOUT_MS` and `PLATFORM_INIT_DEADLINE_MS` are all 5000.
- **Not guaranteed:** the total budget is the head start plus 5 s. That covers S0's single 6852 ms sample
  only if the head start is at least about 1.9 s.

**B4. The recommended design** (option b), replacing step 10's timeout bullet:
- **`SIGNED_PLAYER_WAIT_MS = 5000`:** the longest `takeYandexPlayerSignature()` waits, counted from the
  moment login asks. The same cap applies whether it is waiting on the pending pre-fetch or on a fresh
  call.
- **The pre-fetch has no timeout of its own.** If it misses the wait, it is abandoned: its result is
  thrown away when it lands, never held for the next take.
- **Held-signature age limit:** a pre-fetched signature held longer than **300 s** (timed from when it was
  fetched) is discarded, and a fresh call is made.
  - This covers a login that could not start at boot (for example `/api/env` failed, so `resolveApiBase`
    returned null) and runs minutes later from a `profileFetch`. Without the limit, that signature would
    arrive `stale`.
  - 300 s is well inside the 900 s window.
- **Relogin (a 401):** a fresh call, with the same 5 s cap (unchanged from step 10).
- **Degraded-boot recovery** (`FlashistFacade.ts:1099-1118` fetches the player late) has no pre-fetch.
  The first take makes a fresh call, capped at 5 s.
- **Retune before S3a** from D2's data, if D2 is approved.
- **Tests (added to `FlashistFacade.test.ts`):**
  - a pending pre-fetch that settles inside the wait → used;
  - one that settles after the wait → `null`, and the late value is **not** returned by the next take;
  - a held signature older than 300 s → a fresh call;
  - the recovery path with no pre-fetch → a fresh call;
  - over-bound → `null` (A1).

**B5. ⏳ D2 — measure the signed call (optional; reverses step 12's "no new client events").**
- **Four client analytics events, at most one per take**, carrying nothing but their name:
  - `Profile:Login:Signature:Ready`: the pre-fetch was done before login asked;
  - `Profile:Login:Signature:Waited`: it arrived inside the wait;
  - `Profile:Login:Signature:Timeout`;
  - `Profile:Login:Signature:Failed`: the call threw, returned no string, or was over bound.
- **Guests fire none.**
- **Where they are added:** the `flashistConstants.analyticEvents` enum and
  `analytics-event-reference.md`, next to `Profile:Login:*`.
- **Without them:** the server's `absent` count mixes timeouts, failures and old bundles, so nothing tells
  us whether 5 s is right before S3a.

### C. `algorithm` — ⏳ D3

**Recommendation: ignore it.** It is never read and never pinned.
- **Pinning adds no security.** Our check hardcodes HMAC-SHA256. The field sits inside the signed payload
  and cannot choose the algorithm (unlike JWT's `alg` header).
- **It adds only change detection, which we already get.** A real algorithm change at Yandex would break
  our HMAC check, and that shows as a `bad_signature` spike.
- **It adds a risk.** A label-only change (casing, say) would turn every login `bad_payload`. In S2 that
  is a false alarm; after S3a, everyone becomes unverified.
- **The value is unconfirmed.** S0 recorded only the type. Yandex's purchase docs show `"HMAC-SHA256"`.
- **Alternative:** confirm the value with one extra line in a re-run of Step A (`json.algorithm` is not
  personal data), then pin it.

### D. `requestPayload` — stays accepted residual 8; not in S2 or S3a

- **The docs:** Yandex's `getPlayer` docs (fetched 2026-09-29) list only `{ signed: true }`: no payload or
  nonce option. The only documented `requestPayload` is in the purchase-signature example.
- **The repo cannot answer it.** `src/client/yandexGamesSdk_test.js` is the SDK **loader** only (6.9 KB:
  `YaGames.init` and script loading). It contains no `getPlayer` code.
- **Even if a nonce existed**, it would need a server-issued challenge: another round trip plus server
  state. That is a design change, beyond this plan.
- **The verifier never reads `requestPayload`.** Residual 8 (replay within 15 min, plus 5 min of skew) is
  unchanged.
- **Re-raise** if Yandex documents a `getPlayer` payload option.

### E. Line-reference drift against HEAD `572d134`

`68303d5` (0250 S1 and others) and `572d134` both landed after this plan was grounded.

| Plan cites | Today | Note |
|---|---|---|
| `FlashistFacade.ts:450,1631` (the SDK field, the `window` exposure) | `:516`, `:1949` | moved |
| `FlashistFacade.ts:1269-1284` `initPlayer`, pre-fetch hook `:1277` | `:1587-1603`, plain `getPlayer()` at `:1595` | moved |
| `FlashistFacade.ts:1339-1357` `getYandexUniqueId` | `:1656-1675` | moved |
| *(not in the plan)* | `FlashistFacade.ts:1099-1118`, the late-SDK player recovery | new path; see B4 |
| `Telemetry.ts:135-148` interface; `:234-398` counters | `:135-157`; `:234-396` | small |
| `Server.ts:170-190` | `createApp` at `:170-193`. The secret goes in the **last** options object, beside `metrics`. | small |
| `Routes.ts:444-449` (the `resolveCaller` doc) | the *"drops in HERE"* line is `:442` | −2 |
| `PublicProjection.ts:3,16,44-54` | `:3`, `:16-17`, `:45`, `:54` | small |
| `tests/client/ProfileSession.test.ts:9-13` | `:9-15` | small |
| Unchanged: `SessionToken.ts` (`:36`, `:54`, `:86`; `signSessionToken` at `:71`), `YandexSignature.ts:105-153`, `LoginContract.ts:5-28`, `Routes.ts` `:193`, `:299`, `:418`, `:475-497`, `:640-736`, `ProfileSession.ts:162-270`, and the three `ProfileMetrics` mocks | — | — |

**Other corrections:**
- **Step 12:** `analytics-event-reference.md` does not cover server metrics, so there is **no doc change
  for the new metric**. The doc changes only if D2 is approved.
- **The ADR:** the plan's *"115 today"* is stale. ADR-115 was taken in `68303d5`. **ADR-116** now exists
  as an untracked, *proposed* draft by `fkit-architect` (2026-09-29). Its § *Points NOT decided here* is
  settled by A2 and D1–D3. After the rulings, that text needs a follow-up edit by the architect, not the
  coder.

### F. Deploy order — unchanged and confirmed

- S2 may be **built** now.
- **Deploy precondition (unchanged):** `0250` S1 fully deployed, client first, then profile server. S1 is
  committed but **not deployed** (weekend slot). Every profile-server build from this tree carries S1's
  server half.
- **Then:** profile server S2 → game client S2 → the owner's observation window → the owner's S3a gate →
  profile server S3a.
- The client S2 bundle also carries S1's client. It ships after S1 by this order anyway.
- Rollback rules are unchanged (never S3a → pre-S2).

### Owner decisions this amendment needs
- **D1:** the client's wait for the signed call. Rec: (b) 5 s, with the B4 design.
- **D2:** add the four `Profile:Login:Signature:*` events. Rec: yes.
- **D3:** `algorithm`. Rec: ignore it (never read, never pin).
- **Carried for approval with this amendment (not separate questions):**
  - A1's client over-bound guard;
  - A2 (`data.uniqueID` only);
  - A3 (`issuedAt` required);
  - B4's 300 s held-signature limit;
  - D (`requestPayload` stays residual 8).

## Owner rulings on the amendment (2026-09-29)

Given live via `AskUserQuestion` in the `fkit lead` session, relayed by fkit-lead to the S2 Build worker
(`fkit-coder`). Recorded verbatim. Where these differ from the amendment above, **these govern**.

- **Amendment approval:** "Approve and build (Recommended)". The amendment's carried items are approved
  with it: A1 client over-bound guard, A2 `data.uniqueID` only, A3 `issuedAt` required, B4's 300 s
  held-signature limit, D `requestPayload` stays residual 8.
- **D1 (the client's wait for the signed call):** the owner REJECTED all three offered options and
  answered: *"I think we should not have any limit, and the only case of the "fallback/fail" state is
  when the request is actually failed."* Follow-up question: "What if Yandex's request hangs and never
  answers?" Answer: *"#1, but add the analytic event that we can then analyse to find out how big the
  problem is."* Option #1 was: *"60 s safety net for hangs (Recommended) — Wait for the answer as you
  asked; only a request still silent after 60 s counts as failed and the player logs in unverified.
  Normal slow requests (like our 7 s) are never cut off."*
  - ⇒ **This replaces B4's 5 s cap:** `SIGNED_PLAYER_HANG_MS = 60000`, a hang safety net only, counted
    from when login asks for the signature. A real failure (throw / non-string / over-bound) falls back
    immediately. A pending pre-fetch is awaited up to the hang net. The rest of B4's design stays
    (take-once, the 300 s held-signature age limit, abandoned late results never reused, a fresh call on
    relogin and on the degraded-recovery path), with the hang net in place of 5 s.
- **D2:** "Yes, add them (Recommended)": the four events `Profile:Login:Signature:Ready` / `Waited` /
  `Timeout` / `Failed`, at most one per take, guests fire none, added to the
  `flashistConstants.analyticEvents` enum and `ai-agents/knowledge-base/analytics-event-reference.md`.
  Under D1, **`Timeout` now means the 60 s hang net fired**. It is the event the owner asked for, to size
  the hang problem. If the analytics facade already supports a numeric value on an event, the elapsed
  wait in ms MAY be attached to `Waited` and `Timeout`.
- **D2 follow-up — the ms value (2026-09-29, live via `AskUserQuestion` in the `fkit lead` session, relayed
  by fkit-lead):** question *"The 'Waited' and 'Timeout' analytics events also carry the wait time in
  milliseconds (no ids or personal data). That was my addition, not your words. OK to keep?"* Answer:
  **"Keep it (Recommended)"** — option text *"Lets you see not just how often the signed call is slow,
  but how slow (e.g. 3 s vs 40 s). Already built and tested."*
  - ⇒ The ms value on `Waited` / `Timeout` is now a first-hand owner ruling, not only the lead's
    allowance above. No build change.
- **D3:** "Ignore it (Recommended)": `algorithm` is never read and never pinned.
- **Scope of this build:** S2 steps 1–12 as amended, plus their tests. **S3a (steps 13–15) is not built**;
  it keeps its own later owner gate. No `vfy:true` is minted anywhere.
