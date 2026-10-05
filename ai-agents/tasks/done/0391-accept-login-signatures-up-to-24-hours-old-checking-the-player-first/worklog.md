# Worklog — 0391 Accept login signatures up to 24 hours old, checking the player first

## 2026-10-05 — Build (spawned `fkit-coder`, Build worker of `fkit-sprint-ship-loop`)

Written at `2026-10-05T17:07Z` (from `date -u`), on `dev` at `fba431a`, working tree. **Nothing committed or pushed.**

**Authority.** Spawned by `fkit-sprint-ship-loop` (driven by `fkit-lead`) under its declared-approval marker: the
approved plan is [`plan.md`](plan.md) (blob `45523d3fe39bc840f4fdb528f0d089ac2d4a7ee4`, 19,961 bytes — hash re-checked
with `git hash-object` before any edit; it matched). The owner approved it via `AskUserQuestion` in the `fkit lead`
session on 2026-10-05 ("Approve (Recommended)"), with the rulings recorded at the end of `plan.md`. `plan.md` was not
edited. Built to ADR-121.

### Change surface

**Server (profile server) — behaviour change:**
- `src/profile-server/PlayerSignature.ts` — `LOGIN_SIGNATURE_MAX_AGE_SECONDS` 900 → `86_400`
  (`LOGIN_SIGNATURE_MAX_FUTURE_SECONDS` stays 300). The `stale` result now carries `platformUserId` (the signed
  `data.uniqueID`, validated by the same checks as `ok`). Bracket edges: removed the five sub-24 h past edges, added
  `STALE_PAST_48H_SECONDS = 172_800` / `STALE_PAST_7D_SECONDS = 604_800`; `staleSignatureAgeBracket` past side now
  `past_24h_48h` / `past_48h_7d` / `past_over_7d`, future side unchanged. Header comments: credential lifetime
  (ADR-121 R1), and "the signed id on a stale result is only for the caller's compare — never logged, a label, or
  returned".
- `src/profile-server/LoginVerification.ts` — id first, then age (ADR-121 Decision 2), exactly the plan's §1b code.
  `LoginVerification` interface unchanged (no id field). Header comment added.
- `src/profile-server/Telemetry.ts` — `LoginVerificationOutcome` doc reordered to the real check order, `stale` =
  "right player, outside 86 400 s old / 300 s ahead". `StaleSignatureAgeBracket` → five values
  (`future_5m_15m`, `future_over_15m`, `past_24h_48h`, `past_48h_7d`, `past_over_7d`); doc records the retirement of
  `0366`'s sub-24 h brackets and that the three new past brackets sum to the old `past_over_24h`. Counter name, label
  key `bracket`, and descriptions unchanged; `outcome` counter values unchanged.
- `src/profile-server/Routes.ts` — one comment (ADR-121: 24 h window, id checked first). No logic change.

**Client (game) — comments only, no behaviour change, no game deploy needed:**
- `src/client/flashist/FlashistFacade.ts` — the `SIGNED_PLAYER_HELD_MAX_AGE_MS` doc comment (B4 kept; see below).
- `src/client/SignatureAgeAnalytics.ts` — comments only: edges frozen on `0366`'s; `Fresh` is the pre-ADR-121
  15-min window and no longer equals the server's `ok`; `SIGNATURE_AGE_TO_SERVER_BRACKET` is historical (name kept).
  Labels, edges and event strings unchanged.

**Tests:**
- `tests/profile-server/PlayerSignature.test.ts` — window constants `86_400`/`300`; freshness table (901 s → ok,
  23 h 59 m → ok, 86 400 → ok, 86 401 → stale, 3 d → stale, 300 s ahead → ok, 301 s ahead → stale, far future,
  ms-`issuedAt`); stale results expect `{ status, platformUserId, ageBracket }`; bracket table re-cut; edge sweep at
  172 800 / 604 800 (+1 ms) plus the kept 900 s future edge; new: stale result carries only those three keys (no
  name/avatar); new: an age sweep showing only the five fixed values ever come back.
- `tests/profile-server/LoginVerification.test.ts` — stale row → `NOW − 86 401` / `past_24h_48h`; 23 h 59 m right
  player → `ok`/`verified: true`; the old age-first test replaced by id-first rows (another id at 1 min, 3 d, 10 min
  ahead → `id_mismatch`, no `staleAgeBracket` key); new: for every outcome, the result's keys ⊆
  `{outcome, verified, staleAgeBracket}` and the other player's id never appears.
- `tests/profile-server/LoginVerificationRoutes.test.ts` — `STALE_AGE_BRACKETS` → five values; "a stale signature"
  row −3600 s → −3 d (and now asserts the exact bracket `past_48h_7d`); new row: 3-day-old valid signature for
  `OTHER_PLATFORM_USER_ID` → 200, `id_mismatch`, no bracket, `vfy:false`, same body shape; bracket rows → 30 h
  (`past_24h_48h`), 3 d (`past_48h_7d`), 10 min ahead (kept); stale-age-throws test −45 min → −3 d; no-leak test
  rebuilt over four notes (right player fresh / 3 d; other player fresh / 3 d), each through a failing and an ok repo,
  asserting neither the other id nor any part of any signature appears in log lines, repository calls, recorded
  metric values (`verifications` + `staleAges`) or response bodies.
- `tests/profile-server/Telemetry.test.ts` — bracket test eight → five values; `past_over_24h` → `past_over_7d`.
- `tests/client/SignatureAgeAnalytics.test.ts` — server-parity test narrowed to the future side; the server max-age
  import dropped (comment points to ADR-121). Per-edge label table and the "eight `0366` brackets" literal test kept.
- `tests/client/SignedPlayerFacade.test.ts` — unchanged (B4's 300 000 ms is kept).

**Docs (not the wiki):**
- `ai-agents/knowledge-base/analytics-event-reference.md` §A1 — server column renamed "Server bracket under `0366`
  (retired by ADR-121 for ages < 24 h)"; `Fresh` row → "the pre-ADR-121 15-min window, not the server's `ok`"; the
  "a test sweeps every edge against the server's function" claim replaced (only the future side is still checked);
  the device-clock caveat's "compare with the server's ~32 %" scoped to pre-`0391` data (see decision log). Event
  strings and enum keys unchanged. Only that block was re-formatted — the file was not Prettier-clean before this task
  and the unrelated parts were left as they were.
- No wiki writes.

### `openAuthDialog` → a fresh profile login already follows (plan §2a) — evidence

Re-traced in code this turn (`dev`, 2026-10-05):
1. `CitizenshipCard.onLoginCtaTap` (`src/client/CitizenshipCard.ts:383`) → `FlashistFacade.openYandexAuthDialog()`
   (`FlashistFacade.ts:2053`) re-fetches the plain player after the dialog → on success dispatches
   `CITIZENSHIP_LOGIN_SUCCEEDED_EVENT` with `fallback: () => refreshProfile()`.
2. `Main.ts:333` → `requestGameRestart` (`GameRestart.ts:52`):
   - **Reload path:** a fresh boot → a fresh signed prefetch (`initPlayer` starts one only when logged in,
     `FlashistFacade.ts:~1830`) → a fresh boot login.
   - **Fallback path** (match live, latch already set, or no storage): `refreshProfile` → `loadPlayerProfileView` →
     `profileFetch` → `ensureSession` → `resolveSession` (`ProfileSession.ts:131`). On a guest boot `resolveSession`
     returned at `isYandexAuthorized()` — no login was attempted, so `loginFailed` (the D3 latch) is not set and
     `session` is null. Now authorised, it reaches `login()` → `takeSignature` → `takeYandexPlayerSignature`; the
     prefetch is `undefined` (a guest boot never started one), so it makes a **fresh** signed call.
3. **No login loop:** the restart latch caps reloads at one per page load; the login button is guest-only.

**Conclusion: no change needed.** (Code not exercised live in this task — this is a static trace.)

### `ACCOUNT_SELECTION_DIALOG_CLOSED` handler (ADR-121 Decision 3) — DEFERRED by owner ruling

Not built in `0391`. Owner, verbatim (plan gate, 2026-10-05, `AskUserQuestion` in the `fkit lead` session, relayed by
`fkit-sprint-ship-loop`):

> *"I am not sure if we can control this user scenario or if Yandex Games sends us enough events/data about it. I
> suggest moving this part into a different task and move it to backlog, because this scenario is a rare one and it
> can be easily fixed by the user if the page is reloaded"*

- Filed as a separate task on the **Backlog** board.
- **follow-up id: `0394`** — [`ai-agents/tasks/backlog/0394-re-login-when-a-player-switches-yandex-accounts/brief.md`](../../backlog/0394-re-login-when-a-player-switches-yandex-accounts/brief.md), on the **Backlog** board. Not a gate on `0340` — whether it should be is an open owner question.
- The owner did **not** rule it a gate on `0340`. (The plan had recommended "must block `0340`"; that line is
  superseded by this ruling unless the owner says otherwise.)
- Consequence, stated plainly: ADR-121 Decision 3 records this re-login as *decided*; it stays **unbuilt** until the
  follow-up ships. Today every session is `vfy:false` (until `0340`), so a switched account riding an old session
  cannot yet yield a verified session.

### B4 held-signature refetch + `0372` A2 diagnostic (brief step 8) — decision

Owner ruling Q3: **"Keep both for now (Recommended)"**.
- **B4** (`SIGNED_PLAYER_HELD_MAX_AGE_MS = 300_000`): kept, behaviour unchanged. Comment now says it was kept after
  ADR-121 widened the window to 24 h and is no longer needed for freshness. Effect on `0372` events: none.
- **A2** (`Profile:Login:Signature:Refetch:*`): kept unchanged. It still triggers on the client's frozen > 900 s
  `Past*` labels. Its question is answered (`Same` ≈ 99 %); removing it is a candidate for a future client task.
- No GameAnalytics event added, removed or renamed. No game deploy needed for this task.

### Verification

Commands run this turn, all on the working tree:

| Check | Result |
|---|---|
| `npx tsc --noEmit` (covers `src/**` and `tests/**`) | exit 0, no output |
| `npm run lint` (eslint) | exit 0 |
| `npx prettier --check` on the 11 touched `.ts` files | all clean |
| Targeted jest: `PlayerSignature`, `LoginVerification`, `LoginVerificationRoutes`, `Telemetry` (profile-server), `SignatureAgeAnalytics`, `SignedPlayerFacade` (client) | **6/6 suites, 245/245 tests passed** |
| Mutation check: put the old age-first order back in `LoginVerification.ts` | **4 tests failed** (2 unit id-first rows, the 3-day other-id route row, the no-leak outcome sequence) → file restored, re-diffed |
| Full `npm test` | **194/194 suites, 3585/3585 tests passed**, ~42 s, exit 0. No supertest timeout flake, no `0197` SIGSEGV, no skipped suite (the Docker-probed harness ran). First run — no re-run was needed |

Brief verification mapping: 1 ✅ (23 h 59 m → `ok`, unit); 2 ✅ (86 400/86 401, 300/301 s, unit); 3 ✅ (another id at
1 min and 3 d → `id_mismatch`, unit + route); 4 ✅ (no-leak route test extended); 5 ✅ (edge sweep + fixed-value
sweep); 6 ✅ (parametrised fail-open route test, rows updated, `no_secret` + classifier-throws tests kept); 7 — deferred
by owner ruling, follow-up `0394` (above); 8 ✅; 9 — TODO below; 10 ✅ (synthetic `zz0325-…` fixtures only).

### Deploy — TODO (owner, weekend slot)

- **Profile deploy only** (no game deploy: client changes are comments only). Planned for the 10/11 Oct weekend slot,
  owner-run.
- Deploy date: **TODO**
- First post-deploy UTC time (start of `0392`'s 7-day window): **TODO**
- ⚠️ The profile deploy restarts the server counters — **never compare cumulative values across it.**
- Rollback note: rolling back to the previous profile build only narrows classification back to 900 s; every
  session stays `vfy:false` either way, so it is safe.
- Expected after deploy: `ok` ≈ 97 %, `stale` ≈ 2.5 %; `id_mismatch` may tick up slightly (wrong-player notes that
  were previously hidden under `stale`) — ADR-121's point, not a regression. Old bracket series stop at deploy.

### Decision log (autonomous judgment calls in this build)

1. **Analytics doc, device-clock caveat scoped to pre-`0391` data.** The plan listed three doc edits; the caveat
   sentence "check that the client's non-`Fresh` share is close to the server's ~32 %" becomes false after deploy
   (server `stale` drops to ~2.5 % while the client's frozen labels do not move). Added "for data before the `0391`
   deploy only" plus why. Qualifies as obvious-winner within the plan's intent (§4: make the doc stop claiming client
   and server windows match); doc-only, no behaviour.
2. **Route test "a stale signature" row now asserts the exact bracket `past_48h_7d`** (was "any fixed value", because
   the old −3600 s row sat on an edge). At −3 d the row is ~1 day from any edge, so the exact assertion is safe.
   Mechanical, in-plan (§3 route tests).
3. **Two small test additions beyond the plan's letter, inside its §3/§7 intent:** (a) `PlayerSignature.test.ts`:
   stale result has only `{status, platformUserId, ageBracket}` keys (no name/avatar) — mirrors the existing `ok`
   key test; (b) a sweep showing only the five fixed bracket values ever come back (verification step 5's "a test
   asserting only the fixed values ever appear as labels"). Mechanical.
4. **Renamed a test-local variable** `pastHours` → `pastDays` in `Telemetry.test.ts` to match the new bracket it
   reads. Cosmetic.
5. **Prettier on the analytics doc:** the file was already not Prettier-clean at `fba431a`; a full `--write` touched
   unrelated sections, so that was reverted and only the edited A1 block was spliced in from the formatted copy.
   Keeps the diff to this task's lines.

No review findings were processed in this build (no review has run yet), so no review fixes were applied.

## 2026-10-05 — Process review, round 1 (spawned `fkit-coder`, Process-review worker of `fkit-sprint-ship-loop`)

**Authority.** Same declared-approval marker as the build (approved [`plan.md`](plan.md), blob
`45523d3fe39bc840f4fdb528f0d089ac2d4a7ee4` — re-checked with `git hash-object`, matched; not edited). Method:
`fkit-process-stateful-review`, all steps, with the loop's standing plan approval in place of the per-round gate.
Ledger: [`review.md`](review.md) — 3 low findings (R1–R3), all verified CORRECT, all comment/doc-only, none matched
an accepted residual or ADR-121's re-raise list; no regression or oscillation (first round). Ledger set `closed-out`.
Follow-up id filled in above (`0394`).

### Verification (after the fixes)

| Check | Result |
|---|---|
| `npx prettier --check` on the three touched `.ts` files | clean |
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | exit 0 |
| Full `npm test` | **194/194 suites, 3585/3585 tests passed**, ~42 s, exit 0. No supertest flake, no `0197` SIGSEGV, nothing skipped. First run — no re-run |

### Decision log (fixes applied without asking)

1. **R1** (`FlashistFacade.ts`, B4 branch inline comment). Changed the stale "held too long to arrive fresh at the
   server" reason to "held past B4's limit … not needed for freshness since ADR-121". Qualified: verified CORRECT
   (the server window is 24 h, so the stated reason was false); mechanical, one comment; in plan §2c (B4 comment-only
   update).
2. **R2** (`analytics-event-reference.md` §A1). Scoped the two "~1 in 3 / ~32 % `stale`" statements to before the
   `0391` deploy (plus the expected ≈ 2.5 % after), and marked the `past_over_24h` row as "split by ADR-121 into
   three". Kept the plan's column header verbatim and fixed the implication in the row instead, to stay on the
   approved text. Qualified: verified CORRECT; doc-only, localized to §A1; in plan §4 (doc must stop presenting
   pre-ADR-121 server numbers as current).
3. **R3** (`Telemetry.ts` `StaleSignatureAgeBracket` doc; `SignatureAgeAnalytics.ts` mapping doc). "six" → "five"
   (counted: `past_15m_20m`, `past_20m_30m`, `past_30m_1h`, `past_1h_6h`, `past_6h_24h`), and the "add up to the old
   `past_over_24h`" claim narrowed to right-player notes (the old check order was age-first, so wrong-player notes
   over 24 h used to land there; they are now `id_mismatch`). Qualified: verified CORRECT; comment-only; in plan §1c /
   §2e (comments).

No obvious-winner calls beyond these. Nothing committed or pushed.
