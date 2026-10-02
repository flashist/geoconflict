# Approved plan — 0372

> **Provenance (written by `fkit-lead`, `fkit-sprint-ship-loop`, 2026-10-02).** Approved by the owner via
> `AskUserQuestion` in the live `fkit lead` session on 2026-10-02 (answer: *"Approve (Recommended)"*).
> ⚠️ **Honest note:** the owner was shown a plain-language rendering of this plan in the session, not these exact
> bytes. The text below the line is the plan the spawned `fkit-coder` returned, **transcribed by `fkit-lead` from
> that worker's message — not a byte copy** (every file:line, change, test, risk and sequencing item kept). This
> is the `carried-not-approved` residual the skill names — approval leaves no artifact (ADR-021).
>
> **Owner rulings on the plan's open questions (same `AskUserQuestion`, 2026-10-02):**
> - **Q1 (`Older` label):** *"Own label 'Older' (Recommended)"* — A2 has FOUR outcomes:
>   `Newer` · `Same` · `Older` · `Failed`. `compareIssuedAt` returns `Older` as its own value (not folded).
> - **Q2 (cross-load throttle):** *"Once per page load only (Recommended)"* — **NO sessionStorage throttle.**
>   Every "Q2 = yes only" item below (the `refetchAllowedAcrossLoads()` throttle and test 15) is **OUT of scope**.
> - Earlier rulings carried in the brief: A2 sends the **original** signature; target deploy is the
>   **2026-10-03/04 game deploy**.

---

# Plan — 0372 client diagnostics for stale login signatures

## Summary
- Client-only, analytics-only. Login sends exactly what it sends today — same signature, same moment.
- 1 new pure module + `FlashistFacade.ts` edits + 1 new test file + extended existing test + analytics reference doc. No profile-server change; no `ProfileSession.ts` change.
- GameAnalytics limit verified in `node_modules/gameanalytics`: ≤ 5 parts, each 1–64 chars of `[A-Za-z0-9 -_.()!?]`. A1's 5-part name is exactly at the limit — allowed; the repo already ships 5-part events (`Profile:Login:Restart:Suppressed:InMatch`).
- Effort ≈ half a day build + review rounds. Fits the 2026-10-03/04 slot only if review converges in 1–2 rounds and the owner commits before deploy.

## Grounding (verified in code)
- `takeYandexPlayerSignature()` `FlashistFacade.ts:1704-1739`. Signature-returning paths: held `Ready` (`:1732-1736`) and `awaitSignedPlayer` → `Waited` (`:1742-1770`; covers boot pre-fetch still pending, held > 300 s → fresh, relogin → fresh, degraded-boot first take).
- Today a throwing take is caught (`:1737`) → null. **Trap:** diagnostics inside that try would turn a valid signature into null and change what login sends — so diagnostics get their own try/catch, outside the return decision.
- Server reference `PlayerSignature.ts:38-50`, `:72-98`, `:131-139`: fresh ⇔ `ageMs ≤ 900 000` AND `−ageMs ≤ 300 000` (inclusive). Brackets open-below/closed-above: 900 / 1 200 / 1 800 / 3 600 / 21 600 / 86 400 s past; 300 < ahead ≤ 900 s / > 900 s ahead. `issuedAt` in seconds, finite number.
- Server decodes base64 with `Buffer.from(…, "base64")` (`YandexSignature.ts`) — lenient: URL-safe alphabet and missing padding accepted.
- `bootFollowsMatchExit` set at `:596`; test facades are `Object.create` → undefined fields → FirstBoot.
- Existing `SignedPlayerFacade.test.ts` filters on prefix `Profile:Login:Signature:`; A1's `Profile:Login:SignatureAge:…` doesn't match, so existing exact-event assertions stay valid. Existing synthetic signatures carry no `issuedAt` → Unreadable → no refetch (matters: `makeSdk` throws on an unexpected extra signed call), so those tests stay green.

## Changes

### 1. New `src/client/SignatureAgeAnalytics.ts` (pure; no facade import; beside `PlatformDegradedAnalytics.ts` precedent)
- `readSignatureIssuedAtSeconds(signed: unknown): number | null` — never throws (whole body in try/catch → null).
  - Not a string, or longer than `SIGNATURE_MAX` (from `core/profile/LoginContract`) → null.
  - Server's dot rule: `dot <= 0 || dot === len-1` → null; payload half only.
  - Map `-`→`+`, `_`→`/` (URL-safe, as the server tolerates), then `atob` (accepts missing padding); bad base64 → null.
  - `JSON.parse` on the binary string directly — safe: UTF-8 multibyte bytes are all ≥ 0x80, never `"` or `\`, so the JSON structure is identical; avoids `TextDecoder` (often missing under jest-jsdom).
  - Must be a plain object; `issuedAt` must be `typeof number && Number.isFinite`, else null.
  - Returns only the number; decoded text/object stay local and are dropped (public name/avatar, 152-ФЗ, never leave the function).
- `type SignatureAgeLabel = Fresh | Future5m15m | FutureOver15m | Past15m20m | Past20m30m | Past30m1h | Past1h6h | Past6h24h | PastOver24h | Unreadable`; constants copy 0366's numbers.
- `signatureAgeLabel(issuedAtSeconds: number | null, nowMs: number)` — same comparisons as the server, in ms.
- `isPastStale(label)` — true for the six `Past*`.
- `compareIssuedAt(first, second)` → `Newer` | `Same` | `Older` (Q1: `Older` is its own value).
- Exported `SIGNATURE_AGE_TO_SERVER_BRACKET` (parity test + doc):

| Client | 0366 server |
|---|---|
| `Future5m15m` | `future_5m_15m` |
| `FutureOver15m` | `future_over_15m` |
| `Past15m20m` | `past_15m_20m` |
| `Past20m30m` | `past_20m_30m` |
| `Past30m1h` | `past_30m_1h` |
| `Past1h6h` | `past_1h_6h` |
| `Past6h24h` | `past_6h_24h` |
| `PastOver24h` | `past_over_24h` |
| `Fresh` | server `ok` |
| `Unreadable` | client-only |

### 2. `src/client/flashist/FlashistFacade.ts`
- **Enum (after `:221`):** 20 explicit A1 entries, each the full string (e.g. `PROFILE_LOGIN_SIGNATURE_AGE_FIRST_BOOT_FRESH: "Profile:Login:SignatureAge:FirstBoot:Fresh"` … `…_AFTER_MATCH_UNREADABLE`) + 4 A2 entries (`…_REFETCH_NEWER` / `_SAME` / `_OLDER` / `_FAILED`, e.g. `"Profile:Login:Signature:Refetch:Newer"`). Every string in the enum, none built inline (chosen over the `SESSION_PLATFORM_DEGRADED_FIRST_PART` prefix+suffix precedent because brief step 8 says the enum must hold every string).
- **Typed lookups:** `Record<"FirstBoot"|"AfterMatch", Record<SignatureAgeLabel, string>>` and `Record<RefetchResult, string>` referencing enum keys — compiler forces completeness.
- **A3 (`:1732-1734`):** `flashist_logEventAnalytics(PROFILE_LOGIN_SIGNATURE_READY, askedAtMs - held.fetchedAtMs)`. Name and firing rule unchanged.
- **Take restructure (minimal):** at entry `const isFirstTake = this.hasTakenLoginSignature !== true; this.hasTakenLoginSignature = true;` (optional `?` field, as for `Object.create` facades). Set on every take, guests included, so any later take (relogin-after-401) is never first. Existing branches unchanged; each non-null-returning path passes through `this.recordSignatureDiagnostics(signature, isFirstTake)` before returning (Ready branch + the two `awaitSignedPlayer` returns are the only non-null exits).
- **`private recordSignatureDiagnostics(signature, isFirstTake): void`** — synchronous, own try/catch swallowing everything: read `issuedAt`, label with `Date.now()`, fire `SignatureAge:<bootKind>:<label>` (no value). If `isFirstTake && isPastStale(label)`, start `void this.compareSignatureRefetch(firstIssuedAt).catch(() => {})` — not awaited; the take returns the ORIGINAL signature immediately. Decode costs microseconds, no network.
- **`private async compareSignatureRefetch(firstIssuedAtSeconds): Promise<void>`** — never rejects: race `this.fetchSignedPlayer()` (reused; already never rejects, caps length, never touches `yandexSdkPlayerObject` / `signedPlayerPrefetch`) against a `SIGNED_PLAYER_HANG_MS` (60 s) timer, cleared after. Hang / null signature / Unreadable → `Failed`; else `compareIssuedAt`. One Refetch event, no value. Second signature lives only in a local — never returned, stored, logged or assigned. Never retried; never on a non-first take.
- **Doc comments:** the take's comment at `:1702` becomes: at most one of the four take events + at most one A1 + at most one Refetch (first take only). Short ⛔ note at the new methods.
- ~~Q2 = yes only (throttle): `refetchAllowedAcrossLoads()` sessionStorage throttle~~ — **OUT of scope by owner ruling Q2.**

### 3. `ai-agents/knowledge-base/analytics-event-reference.md`
- New subsection "Profile Login Signature Age Events" beside "Profile Login Signature Events" (`:457`): all 20 A1 rows + the mapping table; clock caveat; fires on every take that returns a signature, relogins included (so 0373 can compare with the server's ~32 %, which also counts relogins).
- Refetch rows incl. `Older`, with the guards; A2 needs no clock.
- `Ready` row: "Value: ms held (askedAt − fetchedAt), 0–300 000".
- Update the "at most one per take" bullet.
- Reading notes for 0373: `Same` from a same-page second call can also mean the Yandex SDK caches inside its own instance (see risks); it still answers whether a same-page refetch would fix it.
- No ids, signatures or payloads anywhere.

## Tests
**New `tests/client/SignatureAgeAnalytics.test.ts`** (node env; synthetic envelopes via `Buffer.from(JSON.stringify({issuedAt, data:{…synthetic}})).toString("base64")`):
1. Decoder well-formed: returns `issuedAt`, incl. fractional and URL-safe/unpadded forms the server accepts.
2. Decoder malformed → null, never throws: no dot, leading dot, trailing dot, bad base64, not JSON, JSON array/null, `issuedAt` missing/string/`NaN`/`Infinity` (e.g. `1e999`)/nested only under `data`, over `SIGNATURE_MAX`, non-string input (`undefined`, number, object).
3. Returns nothing but the number (payload rich in synthetic name/avatar).
4. Bracket edges: exactly 900 s old and exactly 300 s ahead → `Fresh`; +1 ms past each → `Past15m20m` / `Future5m15m`; one value inside each bracket; each upper edge exact and +1 ms; far past → `PastOver24h`; null → `Unreadable`.
5. **Server parity:** import `staleSignatureAgeBracket`, `LOGIN_SIGNATURE_MAX_AGE_SECONDS`, `LOGIN_SIGNATURE_MAX_FUTURE_SECONDS` from `src/profile-server/PlayerSignature`; sweep every edge ±1 ms plus interior points; client label equals the mapped server bracket (or Fresh ⇔ inside the server window). If 0366's edges move, red.
6. `compareIssuedAt`: Newer / Same / Older.

**Extend `tests/client/SignedPlayerFacade.test.ts`** (jsdom; fake timers; `makeSdk`):
7. A1 boot kind: `bootFollowsMatchExit: true` → `…:AfterMatch:<label>`; false/unset → `…:FirstBoot:<label>`. Fires on Ready and Waited paths; not on Failed / Timeout / guest / no-SDK.
8. A2 only on past-stale: Fresh, Future*, Unreadable → no extra signed call (`signedCalls` count).
9. A2 results: `Newer`, `Same`, `Older`; `Failed` for rejected call, synchronous throw, `signature: null` or over-long, Unreadable second signature, hang (advance 60 s → Failed; a late answer fires nothing more).
10. **Not delayed, original sent:** second call pending forever → `take` resolves to the ORIGINAL signature with no timer advance. With existing `ProfileSession.test.ts` coverage (body sends exactly what `take` returns) this proves login carries the original and is not held up. Also `yandexSdkPlayerObject` unchanged; second signature never returned.
11. At most once per page load, never on relogin: take #1 past-stale → refetch; take #2 (relogin, fresh call, also past-stale) fires A1 but no refetch. Also take #1 Fresh, take #2 past-stale → no refetch.
12. A3: existing Ready assertions change from `undefined` to held ms (`:181` → 0; "held exactly 300 s" → 300 000). `Waited` / `Timeout` / `Failed` unchanged.
13. Fail-safe: `jest.spyOn(FlashistFacade.prototype as any, "recordSignatureDiagnostics")` throwing → take still resolves to the signature, no rejection. `GameAnalytics.addDesignEvent` throwing → take unaffected (already caught at `:347`).
14. No leak: extend the test at `:410` — across A1 and A2 runs, no `addDesignEvent` arg or `console.*` line contains the signature, either half, the raw `issuedAt` (as string), or a synthetic player id/name. Event values only `undefined` or the A3 number.
15. ~~Q2 throttle tests~~ — **OUT of scope by owner ruling Q2.**

## Verification
- Iterate: `npm test -- tests/client/SignatureAgeAnalytics.test.ts tests/client/SignedPlayerFacade.test.ts tests/client/ProfileSession.test.ts`.
- Then full `npm test` (slow; shell harnesses), `npm run lint`, `npx tsc --noEmit`. Supertest flake or `0197` SIGSEGV → follow CLAUDE.md, re-run, say so.
- Optional dev sanity (not a gate): in dev `flashist_logEventAnalytics` only `console.log`s name + value, so a local boot shows the A1 name and nothing sensitive.
- Worklog: decision log + which game deploy carried it, or that it missed 2026-10-03/04 and why.

## Risks
- **Yandex 20 player-calls / 5 min (unclear whether plain/signed `getPlayer` counts):** today a load makes 2 such calls (plain + signed pre-fetch); a third only if login asks > 300 s after boot (practically never). With A2 a past-stale first take makes 3. Worst cases: reload every 60 s → 10/5 min today, 15 with A2; reload every 30 s → 20 today (already at the limit), 30 with A2. If the limit exists and bites, which call fails is unknown: the A2 call → `Failed` (harmless); the next load's signed pre-fetch → that login unsigned, `absent` on the server (harmless in shadow mode); worst, the next load's plain `getPlayer` → that one load boots `NoPlayer` degraded (guest-like, no profile login that load; existing handled path). Bounded by construction (one call per load, first take only, no retry), not zero. *(Owner ruling Q2: accepted — no cross-load throttle.)*
- **Device-clock noise:** A1 uses the device clock; skew shows in far `Future*`/`Past*` and can start A2 for a signature the server sees as fresh. A2's own answer needs no clock, but its sample includes some clock-skew loads, and A2 does not carry A1's bracket (no room in 5 parts; brief allows no extra number). 0373 should first check the client's non-Fresh share ≈ server ~32 % (brief already says so).
- **Interpreting `Same`:** cannot tell server-side reuse from the SDK caching inside the page; either way it says whether a same-page refetch would fix it — the fix candidate.
- **Lost A2 events:** player leaves within the 60 s hang window → Refetch event lost (counted as nothing, not Failed). Rare; noted in the doc.
- **Event volume:** ≈ one A1 per login + ≈ one A2 per stale first login → ~7 k + 2 k design events/day. No GA concern known.
- **Deadline:** review rounds and the slow full `npm test`. Miss 03/04 → rides 10/11, 0373 slides a week (brief allows).

## Sequencing
1. `SignatureAgeAnalytics.ts` + tests incl. server parity.
2. Facade enum + lookups + A3.
3. Take wiring + A1.
4. A2 (incl. `Older`; no throttle).
5. Extend facade tests.
6. Analytics doc.
7. lint / tsc / full npm test.
8. Worklog.
9. Hand to the reviewer.
