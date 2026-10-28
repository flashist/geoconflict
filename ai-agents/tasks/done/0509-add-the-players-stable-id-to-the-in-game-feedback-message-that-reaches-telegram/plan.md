# Plan — 0509 (revised for the raw Yandex id): add the player's stable id to the in-game feedback message (Telegram + webhook)

Planning only. No source or files written; `plan.md` is the lead's to write. This is the full revised plan and replaces the fingerprint plan. Plan review: off. It needs a **fresh** owner approval: the earlier "Approve plan" was tied to the fingerprint answer and does not carry over.

## Summary
- **What is sent:** the player's **raw Yandex id** (`getUniqueID()`), sent by the client and shown on one labelled line, *"client-reported, unverified"*, wrapped in `<code>` so it can be tapped to copy. Shown in the Telegram message, and in the webhook if one is ever configured.
- **The trade-off the owner accepted (2026-10-28, raw-id answer):** a real Yandex id now sits in a third-party chat (Telegram). This is **not** the least that would still identify the player; a fingerprint would have been. That runs against ADR-113's Consequences bullet *"Yandex ids leave request URLs, logs and Telegram operator commands"*.
- **ADR-113 needs no amendment and no superseding ADR.** §3 (internal id) is untouched, and the bullet describes a result, not a rule. Recommended anyway: a short dated **clarification note** in ADR-113, written by `fkit-architect` (step 6). It is routine, so it is not an owner question.
- **Logs stay id-free (my addition, in this plan for approval):** the stdout fallback line prints the reference's *kind* only, never the id.
- **Lookup:** a direct primary-key query on `player_identities`.
- **Guests and failures:** three plain states (guest, unavailable, older client).
- **Size:** 4 source files (2 new, one of them a small `src/core` schema), 1 test file extended, 1 new test file. No HTML, no visible text, no analytics, no env var, no profile-server or DB change.

## Ground truth used
- `src/client/FeedbackModal.ts` `onSubmit()` builds the payload and does a plain `fetch("/api/feedback")` with only `Content-Type`.
- `src/server/Master.ts` (~221–375): `FeedbackSchema` is a plain `z.object`, so unknown keys are stripped. It feeds the webhook embed, the Telegram `lines[]` sent through `sendTelegramMessage`, and the stdout fallback `log.info([feedback] ${JSON.stringify(d)})`, which runs only when **both** `FEEDBACK_WEBHOOK_URL` and `FEEDBACK_TELEGRAM_TOKEN` are unset.
- **Yandex id shape, as the repo records it:** the repo has **no** confirmed charset. `src/core/profile/LoginContract.ts` says *"Design §8 Q4 default: 1–128 characters until real Yandex ids are sampled"* (`platformUserId: z.string().min(1).max(128)`), and `CreditContract.ts` matches it. The DB column is `check (char_length(platform_user_id) between 1 and 128)` (migration `006`). The join schema allows 256 (`src/core/Schemas.ts:665`). Test fixtures use synthetic values like `"yandex-unique-id-123"`. The design report's open item 4 is *"sample real ids before tightening validation beyond 1–128"*. I used no real values.
- `FlashistFacade.getYandexUniqueId()` returns `null` unless the player is authorized, and `isYandexAuthorized()` exists. Both wait on a promise that platform init always resolves, so submitting adds no hang.
- ADR-113 §3: the internal id is never sent to or accepted from a client, and no public route accepts a (internal) player id. A platform id on a public route is already normal: `POST /v1/login` takes `platformUserId`.
- **Production log sinks** (`src/server/Logger.ts`): winston Console (container stdout, kept by Docker on the game box) plus `OpenTelemetryTransportV3` → OTLP → Uptrace on the telemetry VPS. No HTTP auto-instrumentation in `src/server`, so request bodies are not traced. `TelegramNotifier` logs bounded cause codes only, never the text. The 400 path logs nothing.
- `FEEDBACK_WEBHOOK_URL` is **blank in production by a recorded decision** (`0064` / `0298`; forwarded by `deploy.sh:518`), so the webhook leg is dormant today.
- `tests/server/MasterFeedbackRoutes.test.ts` is a characterization suite whose existing cases must pass **unchanged**. New cases go in a new `describe`.

## Where the raw id can reach, in production
| Place | Reached? |
|---|---|
| Telegram feedback chat | **Yes**, by design (owner-accepted). |
| Webhook | **Only if `FEEDBACK_WEBHOOK_URL` is ever set**; blank today. If set, the id goes into that third party too. |
| Game-server request body | Yes, in transit over HTTPS. Nginx access logs record the request line, not the body. |
| Stdout fallback → Docker stdout + Uptrace | **No, with this plan:** the fallback prints only `kind`. (Without step 3c it would print the raw id, but only in the misconfigured case where both webhook and Telegram token are unset; Telegram is configured in production.) |
| Error / delivery-failure logs | No. They log status or bounded codes, never the body. |
| Analytics | No. The helper imports no analytics function; events are unchanged. |
| Dev machines | The fallback likewise prints `kind` only. |

## Steps

### 1. Shared schema: new `src/core/FeedbackPlayerReference.ts`
- `export const FEEDBACK_YANDEX_ID_PATTERN = /^[\x21-\x7E]{1,128}$/;` meaning printable ASCII, no space or control characters, 1–128 long.
  - **Length:** 128 is the length every profile record already enforces (LoginContract, DB check), so any id that has a record fits.
  - **Charset:** chosen because the real charset is not recorded in the repo. It admits base64, base64url, hex and UUID forms. It forbids newlines and control characters, so a client cannot inject extra lines or fake a label into the message. `<`, `>` and `&` are allowed and HTML-escaped at output.
- `export const FeedbackPlayerReferenceSchema = z.discriminatedUnion("kind", [z.object({ kind: z.literal("yandex"), yandexId: z.string().regex(FEEDBACK_YANDEX_ID_PATTERN) }), z.object({ kind: z.literal("guest") }), z.object({ kind: z.literal("unavailable") })]);` plus `export type FeedbackPlayerReference = z.infer<…>`.
- Why core: the client must apply **the same** check before sending, so a real player's feedback can never 400 on this field. One definition means no drift. (`src/core` changes must be tested; see 4b.)

### 2. New client helper: `src/client/FeedbackPlayerReference.ts`
- `export async function resolveFeedbackPlayerReference(source: { isYandexAuthorized(): Promise<boolean>; getYandexUniqueId(): Promise<string | null> }): Promise<FeedbackPlayerReference>`:
  - not authorized → `{ kind: "guest" }`;
  - authorized with id `null` **or failing `FEEDBACK_YANDEX_ID_PATTERN`** → `{ kind: "unavailable" }`;
  - otherwise → `{ kind: "yandex", yandexId }`.
  - The whole function is in try/catch and **never rejects**, so feedback is always sent.
- Passing the source in keeps the test free of FlashistFacade. No analytics import and no logging, so the id cannot reach an event or the console.

### 3. `src/server/Master.ts` (the `/api/feedback` route only)
- **a) Schema:** `playerReference: FeedbackPlayerReferenceSchema.optional()`. Optional, so an older client still posts. A value off the pattern → 400, like any other malformed field. Only a forged or broken client can trigger it, because a real client sends `unavailable` instead (step 2).
- **b) Output:** one local `describePlayerReference(ref)` used by both legs:
  - yandex → `Yandex id <id> (client-reported, unverified)`
  - guest → `none — not logged in (guest)`
  - unavailable → `none — logged in, but the id could not be read`
  - absent → `none — not sent (older game client)`

  Telegram gets a new line of its own after the Username/Yandex line: `<b>Player:</b> Yandex id <code>${esc(id)}</code> (client-reported, unverified)`, with the markers verbatim. The webhook gets a new embed field `{ name: "Player", value: …, inline: false }`, with the id escaped like the other webhook strings.
- **c) Stdout fallback:** log `JSON.stringify({ ...d, playerReference: d.playerReference?.kind ?? "not sent" })`, so logs stay free of the Yandex id. Why-comment (≤2 lines): Telegram carries the id by owner ruling; logs stay id-free (ADR-113 Consequences).
- The route never reads `req.headers.authorization`. That is already true and stays true.
- Deploy order is free: an old server strips the unknown field, and a new server accepts it missing.

### 4. Tests (all ids synthetic, e.g. `"test-yandex-id-AbC+/="`, and an obviously fake Bearer string)
**a) `tests/server/MasterFeedbackRoutes.test.ts`:** a **new** `describe("POST /api/feedback — player reference (task 0509)")`. Existing cases are untouched.
1. A logged-in post → the Telegram text contains `<b>Player:</b> Yandex id <code>…</code> (client-reported, unverified)`, and the webhook body has the `Player` field with the id (both legs configured).
2. An id containing `<`, `&` or `>` → HTML-escaped inside `<code>`.
3. Guest → the `not logged in (guest)` line in both legs.
4. `unavailable` → its marker line.
5. An old-format post (no field) → 200 and `not sent (older game client)`.
6. Malformed ids are rejected with 400 and nothing sent: 129 characters, a newline, a space, an empty string.
7. Boundaries are accepted: 1 and 128 characters.
8. **The session token is never echoed:** with header `Authorization: Bearer <synthetic>`, the token is absent from the Telegram body, the webhook body and every log line.
9. **The fallback stays id-free:** nothing configured → the info log contains `"yandex"` as the kind, and does **not** contain the synthetic id.

**b) New file `tests/client/FeedbackPlayerReference.test.ts`** (named here so the approval covers it). It covers the core schema and the client resolver:
- schema: the pattern accepts and rejects at the boundaries above;
- resolver: not authorized → guest; authorized with `null` → unavailable; an id off the pattern (e.g. 200 characters, or one with a newline) → unavailable; a valid id → yandex with that id; a source that rejects → unavailable, and the function does not reject.

**c) Grep checks** (brief verification step 2 and the no-analytics rule):
- `grep -nE "uthorization|ProfileSession|profileFetch|getSessionToken" src/client/FeedbackModal.ts src/client/FeedbackPlayerReference.ts` → no hits.
- In the route block of `src/server/Master.ts`, `grep -n "authorization"` → no hits.
- `grep -nE "logEventAnalytics|logErrorToAnalytics|console\." src/client/FeedbackPlayerReference.ts` → no hits.

### 5. `src/client/FeedbackModal.ts` (minimal diff)
- Import the `FlashistFacade` class and the helper. In `onSubmit()`: `const playerReference = await resolveFeedbackPlayerReference(FlashistFacade.instance);` then add `playerReference` to `payload`.
- No other change: same headers, no `Authorization`, no reformatting (the file isn't Prettier-clean today, and reformatting it is out of scope).

### 6. Record the decision (at build time)
- **`worklog.md`** (Build worker, required by brief verification 3):
  - the choice (raw Yandex id) and the owner's ruling quoted with date and channel, including the description he saw: *"The id itself in Telegram. Simplest lookup; a real platform id sits in a third-party chat. Plan gets re-done."*;
  - the ADR-113 §3 reasoning: no internal id from a client; a platform id on a public route already exists (`/v1/login`);
  - the trade-off, stated plainly;
  - the sink table above;
  - the read-only lookup, with placeholders only: `SELECT player_id FROM player_identities WHERE platform = 'yandex_games' AND platform_user_id = :'yandex_id';` The owner pastes the id at the psql prompt, never into any tracked file;
  - the decision log (`none` if empty).
- **ADR-113 clarification note (recommended, not an owner question):** a dated note under `decisions/README.md`'s clarification carve-out, written by **`fkit-architect`** (coders don't write ADRs). It says: the Consequences gain *"Yandex ids leave … Telegram operator commands"* does not cover in-game **feedback** messages, which carry the raw Yandex id by owner ruling 2026-10-28 (task `0509`); logs stay id-free; §3 is unchanged. This is a clarification, not a reversal, so no superseding ADR. **Who:** the lead routes it to the architect at close, or the Build worker consults the architect at hop 2. The lead's choice; it changes no code.
- No real ids, tokens or hosts go in the task folder. A grep of the folder for Yandex-id or UUID shapes should find only the synthetic test values, and those live in `tests/`, not the folder.

## Touchpoints checklist
- **Analytics:** none. No event added or changed; `analytics-event-reference.md` untouched; the helper imports no analytics function.
- **Localization:** none. No visible text change; `en.json` / `ru.json` untouched.
- **HTML:** none. `index.html` and `yandex-games_iframe.html` untouched.
- **Secrets / personal data:**
  - the session token is never read, sent or logged (test 4a.8 and the grep);
  - the internal player id is not involved anywhere;
  - the raw Yandex id goes **only** to Telegram (and the webhook if ever configured), as accepted by the owner;
  - kept out of logs (4a.9) and analytics;
  - tests use synthetic values only;
  - no new env var.

## Checks I will run
| Check | Why |
|---|---|
| `npm test -- tests/server/MasterFeedbackRoutes.test.ts tests/client/FeedbackPlayerReference.test.ts` | Targeted: the route, the schema and the resolver. A single `Exceeded timeout of 5000 ms` / `socket hang up` in the supertest file is judged by the known-flake rule: rule out `0197`, re-run, and say that I re-ran. |
| `npm run lint` | Code style (eqeqeq, `??`). |
| `npx tsc --noEmit -p tsconfig.json` | Type check. If errors already exist, I compare against a baseline from before the change and report only new errors; I don't claim it green. |
| Full `npm test` (npm script, project lock, ~5 min at 1 worker) | Brief verification step 4; it also covers the `src/core` rule. |
| The three greps in 4c | Brief verification step 2 and the no-analytics rule. |

**Skipped, with reasons:**
- `npm run test:integration`: no profile-server or DB code.
- `npm run test:scripts:docker`: no deploy or backup scripts.
- A webpack build: no config change; tsc covers the types.
- The live check (brief step 5): owner-only after deploy, as a separate verify task at close. It also settles the charset: if real ids fail the pattern, every logged-in report will read "id could not be read", and the first live check will show it.

## Edge cases and failure modes
- **Unknown real charset:** a real id outside printable ASCII or over 128 characters would show as `unavailable`. That is a visible fallback, not a silent loss, and not a 400. Tightening or widening the pattern later is a one-line change.
- **Message injection:** newlines and control characters are rejected; `<`, `>` and `&` are escaped; the id sits inside `<code>`.
- **Forgery:** anyone can send any id string. The line says *client-reported, unverified*; it is a lead, not proof (0424 rule: never an automatic merge).
- **0424 case (new id for the same account):** the id points to the record the player's login reaches **now**. An old record is still found the 0502 way.
- **Stale-build feedback:** the field is absent → `not sent (older game client)`. Correct.
- **SDK missing or degraded at boot:** shows as guest. The existing `Yandex:` line still tells "no SDK" apart from "SDK, not logged in".
- **Characterization suite:** no existing case is edited. If one goes red, the change is wrong.
- **Webhook turned on later:** the raw id flows there too. This is noted in the worklog and the ADR note, so turning it on is a known choice.

## Not decided by this plan (noted, not blocking the build)
- **Ship path:** the brief's deploy-hold conflict. Any game deploy from `dev` also ships the held `0488`/`0494`/`0495` code. That is a deploy-time owner choice. Commit and deploy only on the owner's ask; weekend slot.

## Open questions
- Fresh owner approval of this revised plan, which also covers: the new test file `tests/client/FeedbackPlayerReference.test.ts`, the new `src/core/FeedbackPlayerReference.ts`, and the id-free stdout fallback (3c).
- Nothing else needs the owner. The ADR-113 note is a routine clarification routed to the architect (step 6).
