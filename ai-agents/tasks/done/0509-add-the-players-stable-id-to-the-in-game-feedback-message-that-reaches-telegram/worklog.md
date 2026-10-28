# 0509 — worklog

## 2026-10-28 — Build (spawned `fkit-coder`, Build worker)

**Provenance.** Built by a spawned `fkit-coder` under the ADR-055 declared-approval marker, from
`fkit-lead` driving `/fkit-sprint-ship-loop` on Sprint 9. The approved plan is this folder's
[`plan.md`](plan.md) (blob `7b7af3781e2e8a6100261d946bb080ed9e92aab8`), carried verbatim in the spawn.
Nothing committed or pushed.

### The choice of id, and the owner's rulings

**Chosen: the player's raw Yandex id** (`getUniqueID()`), sent by the client and shown on one labelled
line, *"client-reported, unverified"*. Not the fingerprint, not a server-side lookup.

Both rulings were given via `AskUserQuestion` in the `fkit-lead` Claude Code session on **2026-10-28** and
relayed in the spawn prompt, quoted here as relayed:

1. The id choice. Selected option, verbatim: **"Raw Yandex id"**, with the description the owner saw:
   *"The id itself in Telegram. Simplest lookup; a real platform id sits in a third-party chat. Plan gets
   re-done."*
2. The revised plan (question: *"0509: approve the revised plan (raw Yandex id in Telegram, logs
   id-free)?"*). Selected option, verbatim: **"Approve plan (Recommended)"**, with the description
   *"Coder builds exactly this plan → tests → review → close; architect adds the ADR-113 note at close. No
   commit."*

### ADR-113 §3 reasoning

- §3 says the **internal** player id is never sent to or accepted from a client, and no public route
  accepts a (internal) player id. This change does neither: the internal id is not involved anywhere.
- What the client sends is the **platform** id it already holds. A platform id on a public route is
  already normal: `POST /v1/login` takes `platformUserId`.
- So §3 is untouched. ADR-113 needs no amendment or superseding ADR. A short dated clarification note
  is recommended in the plan (step 6). **Not written here:** the lead routes it to `fkit-architect` at
  close.

### The trade-off, plainly

A real Yandex id now sits in a third-party chat (Telegram), and in the webhook too if
`FEEDBACK_WEBHOOK_URL` is ever set. That is **not** the least that would still identify the player; a
fingerprint would have been. It runs against ADR-113's Consequences bullet *"Yandex ids leave request
URLs, logs and Telegram operator commands"*. The owner accepted this on 2026-10-28 (ruling 1 above).
The id is client-reported and can be forged: a lead, not proof (the `0424` "never an automatic merge"
rule).

### Where the raw id can reach, in production

| Place | Reached? |
|---|---|
| Telegram feedback chat | **Yes**, by design (owner-accepted). |
| Webhook | **Only if `FEEDBACK_WEBHOOK_URL` is ever set**; blank in production today (`0064` / `0298`). If set, the id goes into that third party too. |
| Game-server request body | Yes, in transit over HTTPS. Nginx access logs record the request line, not the body. |
| Stdout fallback → Docker stdout + Uptrace | **No:** the fallback writes only the reference's `kind` (`"yandex"`, `"guest"`, `"unavailable"`, `"not sent"`). |
| Error / delivery-failure logs | No. They log status or bounded codes, never the body. |
| Analytics | No. The client helper imports no analytics function; no event changed. |
| Dev machines | The fallback likewise writes `kind` only. |

### Read-only lookup (placeholders only)

Run at a `psql` prompt on the profile database, read-only. The owner pastes the id from the Telegram
message at the prompt (`\set yandex_id '<paste>'`), **never into any tracked file**:

```sql
SELECT player_id FROM player_identities
WHERE platform = 'yandex_games' AND platform_user_id = :'yandex_id';
```

### What was built

- `src/core/FeedbackPlayerReference.ts` (new): `FEEDBACK_YANDEX_ID_PATTERN` (printable ASCII, no
  space/control, 1–128) and the `FeedbackPlayerReferenceSchema` discriminated union
  (`yandex` / `guest` / `unavailable`).
- `src/client/FeedbackPlayerReference.ts` (new): `resolveFeedbackPlayerReference(source)`; never
  rejects; an id off the pattern becomes `unavailable`, so a real client never gets a 400.
- `src/client/FeedbackModal.ts`: resolves the reference from `FlashistFacade.instance` and adds
  `playerReference` to the payload. No header change, no reformatting.
- `src/server/Master.ts` (`/api/feedback` only): optional `playerReference` in the schema; a new
  `<b>Player:</b>` Telegram line (id in `<code>`, escaped) and a `Player` webhook field; the stdout
  fallback writes the kind only.
- Tests: a new `describe` in `tests/server/MasterFeedbackRoutes.test.ts` (existing cases untouched) and
  the new `tests/client/FeedbackPlayerReference.test.ts`. All ids and tokens synthetic.

### Checks run

- Targeted: `npm test -- tests/server/MasterFeedbackRoutes.test.ts tests/client/FeedbackPlayerReference.test.ts`
  → 2 suites, 50 tests, all passed (first run, no re-run).
- `npm run lint` → exit 0, no output.
- `npx tsc --noEmit -p tsconfig.json` → exit 0; baseline before the change was also exit 0 with no
  output.
- Plan 4c greps → no hits on all three.
- **Not run here:** full `npm test` (the separate Verify step runs it, per the spawn), integration,
  docker harnesses, webpack build, and the live check (owner, after deploy; a separate verify task).

### Decision log (choices made unattended)

none

## 2026-10-28 — Process-review round 1 (spawned `fkit-coder`, Process-review worker)

Under the ADR-055 declared-approval marker (`fkit-lead` driving `/fkit-sprint-ship-loop`, plan blob
`7b7af3781e2e8a6100261d946bb080ed9e92aab8` re-checked with `git hash-object`). Nothing committed or pushed.

### Decision log (choices made unattended)

- **R1 fix applied without asking.** Answers `review.md` finding R1 (a non-string id from the untyped
  SDK passes `RegExp.test` by coercion, so the client sends a value the route 400s). Changed
  `src/client/FeedbackPlayerReference.ts`: the guard is now `typeof yandexId !== "string" ||
  !FEEDBACK_YANDEX_ID_PATTERN.test(yandexId)` (was `yandexId === null || …`), plus a one-line why-comment;
  added a resolver case in `tests/client/FeedbackPlayerReference.test.ts` (`undefined`, `12345` →
  `unavailable`). Qualified as: verified `CORRECT` (node: the pattern returns `true` for `undefined` and
  `12345`), mechanical/localized (one condition, one test), and in-plan (plan step 2: an id that fails
  the check → `unavailable`, so a real client never 400s).
- **Reviewer's optional nit not applied** (exhaustive `never` check in `describePlayerReference`,
  `Master.ts`). Not in the plan and not an obvious winner: the `default` branch is the intended
  older-client path for `undefined`, so a `never` check needs a restructure for a style gain only.

### Checks run

- Targeted `npm test -- tests/server/MasterFeedbackRoutes.test.ts tests/client/FeedbackPlayerReference.test.ts`
  → 2 suites, 52 tests, all passed (first run).
- `npm run lint` → exit 0. `npx tsc --noEmit -p tsconfig.json` → exit 0. Prettier check on both
  touched files → clean.
- **Not run:** full `npm test` (the lead re-verifies after this fix, per the spawn).
