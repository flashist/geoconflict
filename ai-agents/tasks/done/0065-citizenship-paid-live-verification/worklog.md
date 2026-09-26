# 0065 — worklog

## 2026-09-26 — §6 go-live flip (build + verify), fkit-coder as `fkit-sprint-ship-loop` Build worker

Approved plan: `plan.md` in this folder (blob `c97a8343e5256bbe4c02d7b694ce6597ff5b94ec`, re-hashed
this turn and matched). The owner approved it 2026-09-26 via `AskUserQuestion` in the lead session
("Approve (Recommended)"), and ruled "Coder commits it (Recommended)" for the commit. Built plan steps
1–5 only. Deploy, remote-flag contract, rollback and later steps are owner/lead actions.

### Progress

1. **Source:** `src/client/flashist/FlashistFacade.ts`, `features` block —
   `CITIZENSHIP_CARD_ENABLED: false` → `true`. Comment rewritten: ON since the citizenship launch
   (0065 §6, owner ruling 2026-09-26); the remote `citizenship_ui` flag is the runtime kill switch;
   setting the constant back to `false` is the code-level rollback. The "no GAME_ENV bypass" sentence
   is kept. The constant itself is kept (removing it is out of scope).
2. **Test:** `tests/client/CitizenshipCard.test.ts` — `"ships with the real flag defaulted OFF"` renamed
   to `"ships with the real flag ON (citizenship launched — 0065 §6)"`, asserts `toBe(true)`, comment
   now says it guards against an accidental revert to OFF.
3. **Watched suites** (`SubscribeFeatureFlag.test.ts`, `InterstitialAnalytics.test.ts`, which load the
   real module): both green with the flag ON (2 suites, 23 tests). No suite-pinning fix was needed.

### Verify

- Targeted: `npm test -- tests/client/CitizenshipCard.test.ts tests/client/FlashistFacade.test.ts
  tests/client/Inbox.test.ts tests/client/CitizenBadge.test.ts` → 4/4 suites, 127/127 tests.
- Full `npm test` → 147/147 suites, 2101/2101 tests, exit 0, first run (no re-run). The summary line
  shows no skipped tests, so the Docker-probed harness ran rather than skipping.
- `npx tsc --noEmit` → exit 0.
- `npm run lint` → exit 0.

### Decision log

- Unattended fixes applied: **none**.
- Obvious-winner calls: **none**.

## 2026-09-26 — Deploy (owner-run), recorded by a spawned `fkit-producer`

**Provenance:** owner's screenshots and words in the `fkit lead` session, relayed by `fkit-lead` to a
spawned `fkit-producer` with no owner channel (ADR-021). Relayed evidence, not an owner ruling; the
producer observed none of it. `## Status` not changed, no mover invoked.

### Attempt 1 — 0.0.153: built and pushed, NEVER went live

- `./build-deploy.sh prod` → commit `917e571` (version bump), tag `0.0.153`, image tag
  `20260926-142458`, image pushed.
- Failed at the SSH *"EXECUTING UPDATE SCRIPT ON SERVER"* step: `Permission denied (publickey,password)`
  — right after the scp copy step had **succeeded with the same credentials**.
- **Cause unknown.** Not investigated. Per the relayed log the update script never ran, so the live
  container was not switched; the copy step's files did land on the box (not inspected). One retry
  (attempt 2) succeeded. Recorded as runbook finding **F-F**.

### Attempt 2 — 0.0.154: live

- Owner re-ran the full `build-deploy.sh` (bumped again) → commit `5b3e6ec`, tag `0.0.154`, image tag
  `20260926-143311`. Succeeded; owner: *"The deploy is complete"*, about **14:38 Moscow time**.
- **Content check (git, this turn):** `0.0.152..0.0.154` changes only `src/client/flashist/FlashistFacade.ts`
  under `src/`/`resources/` — the `3386b90` flip. `0.0.153` and `0.0.154` differ only in
  `package.json`/`package-lock.json` (version bump).
- **Owner check on the game box (~14:40 Moscow):** live container on image `20260926-143311` (= 0.0.154),
  status Up, assets served with `?v=0.0.154`, players connecting.
- **Owner-observed in the live Yandex Games iframe:** citizenship card, XP bar `51 / 100`; buy button
  `Купить гражданство — 249 YAN`; tenure popup *"Спасибо, что вы с нами! … мы дарим вам 50 XP. Теперь у
  вас 51 / 100 XP."*; footer `0.0.154`. Yandex console flag `citizenship_ui` = `enabled`.
- **Rollback pair:** previous live = 0.0.152, image tag `20260926-114942`. ⚠️ Not checked whether that
  image is still on the game box (the 0.0.152 deploy deleted its own predecessor — runbook F-D).

### Consequences recorded elsewhere

- `0268`: ~60-day clock starts 2026-09-26 (release date written into its brief).
- `0032` W15 re-measure: filter to `0.0.152` **and** `0.0.154` (0.0.153 never served).

## 2026-09-26 — First real purchases after go-live, recorded by a spawned `fkit-producer`

⛔ **Provenance.** Relayed by `fkit-lead` (ADR-021, no owner channel): the lead's **read-only** nginx and
DB checks on the profile box, plus the owner's screenshots. The producer observed none of it. Accounts are
named by an 8-character profile-id prefix only. Full detail lives in
[`0297`'s worklog](../../backlog/0297-paid-citizenship-owner-run-test-buy-sequence/worklog.md) — this task does
not own those checks; this entry only records that the go-live carried real money successfully.

- **Real player purchase** (account `2de1ba8c`): `POST /v1/payments/yandex/complete` → **200** at
  **13:52:34 UTC**.
- **Owner test purchase** (account `e2ade02f`): → **200** at **14:46:24 UTC**. On the box:
  `is_paid_citizen = t`, `citizenship_purchased_at` 14:46:24.448 UTC, `is_citizen = t`,
  `citizenship_earned_at` NULL; `processed_purchases` row with intent; intent `used_at` set. Card switched
  to ГРАЖДАНИН without a reload; after reload still a citizen and no `/reconcile` call ⇒ purchase consumed.
- ⇒ The secret value on the box is correct (the `0195` condition, now tracked in `0297`, is settled).
  ⚠️ Which HMAC construction matched is **still unknown** — follow-ups `0309` / `0310` (Backlog).
- Price shown: test account **"249 RUB"**, main account **"249 YAN"** — amount matches, currency is
  per-account from Yandex's catalog.
- Not checked yet: funnel analytics (next day); §4-style reconciliation (owner decision pending, `0297`).
- Snapshot ~14:47 UTC: 105 purchase intents / 97 distinct players, 2 used; 3 citizens (2 paid, 1 earned).

## 2026-09-26 — Close

Closed by a spawned `fkit-producer` via `/fkit-task-done` on an **OWNER RULING given live in the
`fkit lead` session via `AskUserQuestion` on 2026-09-26** (relayed by `fkit-lead`): *"Close 0065
(citizenship go-live) and 0018 (the buy flow) now?"* → **"Close both (Recommended)"**. Marker
`✅ Done (agent-closed — not owner-verified)` (ADR-033 §5). Close condition (flip `3386b90` · second game
deploy 0.0.154, image `20260926-143311` · card visible in the live iframe · `0238` kill switch closed) —
all owner-observed, recorded above. The live proof items stay open in `0297`.
