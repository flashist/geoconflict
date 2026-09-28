**Plan for 0326. Planning only: no source and no files written, no plan.md.**

- **One file plus its test:** `src/client/CitizenshipCard.ts` (only `refreshProfile` and two new fields) and `tests/client/CitizenshipCard.test.ts`. The brief says `tests/CitizenshipCard.test.ts`, but the real path is `tests/client/`.
- **Q1 needs an owner call. The guard rule the brief literally asks for ("apply only if still the newest read *issued*") has a flaw.** It can drop a read that is *newer than what the card shows*, just because an even newer read is still in flight. The tenure caller then resumes against the old profile and can skip 0303's "restart to apply" popup. I recommend a slightly different rule: apply a read only if it is newer than the last read *applied*. That still fixes the race and removes this gap.
- **Q2 is a finding about the brief itself.** `Citizenship:Earned:XP` is **dormant** today (`PlayerProfileView.ts:112-116`). Nothing calls `reportEarnedCitizenshipTransition`, so the event fires **zero** times per load, not once. The verification step "fires exactly once" cannot be met as written. The plan proves the part that matters instead: one read per `refreshProfile` call, and no new reader.
- The working tree already has uncommitted 0303, 0314 and 0321 edits in these same files. The plan builds on the working tree as it stands.

---

## 1. What the code does today (checked this turn)

- `refreshProfile()` (`CitizenshipCard.ts:164-169`):
  ```ts
  this.profile = await loadPlayerProfileView();
  this.publishCitizenshipStatus();
  this.publishApprovedName();
  this.requestUpdate();
  ```
  It has no ordering. Whatever read lands last wins.
- **Callers (7):**
  - First read: `connectedCallback:142`, awaited, then `startTenureClaim()`.
  - Reconciliation listener: `:160`, `void`. It is registered at `:127`, **before** the first read starts, which is the brief's concrete race.
  - Tenure re-read: `:249`, awaited. Afterwards it checks `isCitizenNow()` to decide on the 0303 restart popup.
  - Login fallback: `:324`, `void`.
  - Purchase grant: `:682`, awaited, inside `try/finally` that resets `isPurchaseInFlight`.
  - Name submit, withdraw and dismiss: `:739`, `:786`, `:816`, awaited, inside `try/finally` that resets `isNameRequestInFlight`.
- `onBuyCtaTap:680` calls `publishCitizenshipStatus()` directly, outside `refreshProfile`. It is not a read result: it comes from the `paidGrantConfirmed` latch. **Leave it unguarded.** It must publish at once, and the latch keeps "citizen" through any later read anyway.
- The card's single read path is intact: the only `loadPlayerProfileView` caller in `src/` is `CitizenshipCard.ts:165`. `Inbox.ts:5` deliberately does not call it.

## 2. The change

Two plain private fields and a guarded `refreshProfile`. Shown with the recommended rule (Q1, option A):

```ts
// Task 0326: profile reads can overlap (first read vs reconciliation, tenure,
// purchase, name change, login fallback). Each read takes a number; a read that
// lands after a NEWER read has already been applied is dropped, so a slow stale
// answer can never overwrite a fresher one. The read itself still runs: the
// guard only decides whether its result is applied.
private profileReadsIssued = 0;
private newestAppliedProfileRead = 0;

private async refreshProfile(): Promise<void> {
  const readNumber = ++this.profileReadsIssued;
  const profile = await loadPlayerProfileView();
  if (readNumber < this.newestAppliedProfileRead) {
    return; // superseded: settle normally, apply nothing
  }
  this.newestAppliedProfileRead = readNumber;
  this.profile = profile;
  this.publishCitizenshipStatus();
  this.publishApprovedName();
  this.requestUpdate();
}
```

With option B (the brief's literal rule), the check becomes `if (readNumber !== this.profileReadsIssued) return;` and the second field is not needed.

- **Both publish calls sit inside the guarded block**, as the brief's Notes and 0321's plan §6 merge note require.
- The fields are plain, not `@state()`. They drive no rendering, and a plain field avoids an extra render.
- The counter lives on each card, not in the module, so a replaced or re-mounted card starts clean.
- **Awaiting callers still resume.** A superseded call returns normally: it does not throw and does not hang. Every `await this.refreshProfile()` continues and every `finally` still runs. The card is never half-updated, because the drop happens before any write and the four writes run together.
- **A rejected read** (not expected, since `loadPlayerProfileView` is built never to throw) passes through exactly as today. It uses up a number and applies nothing. Under A, an older read landing later can still apply; under B it would be dropped too.
- **Update the doc comments:** a short note in `startTenureClaim`'s doc block that a superseded re-read leaves `this.profile` at the newest applied read. The single-read-path sentence stays as it is.

## 3. What a superseded read still does and what it skips

| Side effect | Superseded read | Why |
|---|---|---|
| The network read and everything inside `loadPlayerProfileView`: `isYandexAuthorized`, `getCurPlayerName`, `getYandexUniqueId`, `profileFetch` (including a session login or relogin and its `Profile:Session:Relogin` event) | **Still happens** | It is already done or in flight when the result lands, and cannot be undone. The relogin is shared across callers and counted once per stale token inside `ProfileSession.relogin`, so the guard neither adds nor removes a count. |
| `Citizenship:Earned:XP` | **Unaffected** (dormant, fires 0 times) | If S3b re-enables it, the call will sit **inside** `loadPlayerProfileView`, before the guard. The guard only drops results, never adds or retries a read, so it cannot add a fire. One read per call, same as today. |
| `this.profile = …` | **Skipped** | This is the stale overwrite the task exists to stop. |
| `publishCitizenshipStatus()` (drives the 0302 private-lobby lock) | **Skipped** | Otherwise a stale "not citizen" would re-lock the perk. |
| `publishApprovedName()` (drives the 0321 name box lock) | **Skipped** | Otherwise a stale approved name would be republished. |
| `requestUpdate()` | **Skipped** | Nothing changed, so there is nothing to render. |
| Caller's follow-up: tenure's `isCitizenNow()` check and restart popup, the purchase `finally`, the name-change `finally` | **Still runs** | It lives in the caller, not in `refreshProfile`. It reads `this.profile`, which is the newest applied read. Under A, that read started at or after the caller's own read. Under B that is **not** guaranteed; see Q1. |
| `startTenureClaim()` itself | **Unaffected** | It is called by `connectedCallback` after the first read *settles*, applied or not. It still runs exactly once. |

## 4. Tests (`tests/client/CitizenshipCard.test.ts`, new `describe("stale-read guard (task 0326)")`)

The helpers already exist: `appendCard`, `flushMicrotasks`, `flushLit`, and hand-controlled promises via `loadProfile.mockReturnValueOnce(new Promise(...))`, the same pattern as the tests at `:861` and `:1063`.

1. **The race, which must fail on today's code:**
   - Setup: catalog product present, first read left pending (`NON_CITIZEN_PROFILE`, approvedName `"Old"`), `appendCard`. Then fire `PURCHASES_RECONCILED_EVENT`; its read (citizen, approvedName `"New"`) resolves first. Settle, then resolve the first read. Settle.
   - Assert:
     - citizen badge shown;
     - `buyButton(card)` is null;
     - `getCitizenshipStatus()` reads citizen;
     - `getApprovedName()` is `{kind:"approved", name:"New"}`;
     - `loadProfile` was called exactly 2 times.
   - **Run it on the unchanged working tree first and record the red run in the worklog, then green after the change.**
2. **An awaiting caller resumes when its read is superseded (tenure path):**
   - Setup: first read non-citizen at 60 XP, tenure `granted`, tenure re-read left pending. A reconciliation read (citizen) lands first, then the tenure re-read resolves with a stale non-citizen answer.
   - Assert: after the thank-you popup is closed, the `{source:"tenure"}` restart signal fires once, and the card shows citizen. This also fails on today's code, where the stale answer wins and there is no signal.
3. **An awaiting caller resumes (in-flight flag):**
   - Setup: a name submit whose re-read is superseded.
   - Assert: `isNameRequestInFlight` is cleared, so a second submit reaches `submitNameChange` a second time. No throw and no `console.warn`.
4. **Under option A only, the read that separates A from B:**
   - Setup: an older read lands while a newer one is still pending.
   - Assert: the older read **is** applied (the card moves off its previous state), then the newer read is applied.
5. **One read per call, which is the Earned:XP proxy (Q2):**
   - Assert: across tests 1 to 3, `loadProfile` calls equal `refreshProfile` triggers exactly. A dropped read is never retried.
   - The existing `"stays the single profile reader: one load, one read"` (`:1169`) and `"the purchases-reconciled refresh never claims again"` (`:1004`) stay green.
6. **All existing suites stay green unchanged,** including `"keeps the citizen presentation after a confirmed grant even when the profile re-fetch is stale"` (`:674`), which relies on the latch, not the guard.

Two things to watch in these tests:
- The first read is pending while `appendCard` returns, so `startTenureClaim` has not run yet. Settle again after resolving it; claims default to `skipped`.
- Use a settle loop like the tenure block's `settle()` (4 rounds). A single `flushMicrotasks` may not drain a chain of two reads.

## 5. Verification

- The race test fails before the change and passes after. Both runs go in the worklog.
- `npm test -- tests/client/CitizenshipCard.test.ts`, plus `CitizenshipStatus`, `CitizenshipPurchase`, `CitizenBadge`, `CitizensOnlyModal`. Because the neighbours touch the same state, also run `ApprovedName`, `CitizenshipRestartOffer` and `TenureGrantClaim`.
- `npm run lint`.
- Full `npm test`. If a `supertest` timeout, "did not exit" or `socket hang up` shows up: first rule out the `0197` crash signature (SIGSEGV, or a crash report whose stack starts at `ClearStaleLeftTrimmedPointerVisitor`), then follow CLAUDE.md, re-run, and say that I re-ran.
- A grep check: `loadPlayerProfileView` is still referenced only at the single read site in `src/`.

## 6. Merge note for 0329

- 0329's late-recovery reveal must read **only** through `this.refreshProfile()`. Then it is covered with no extra hook: its read takes a number like any other, and the guard orders it against the reconciliation, login-fallback and purchase reads.
- **Hard rule for 0329:** nothing but `refreshProfile` may assign `this.profile` or call `publishCitizenshipStatus()` / `publishApprovedName()` from a read result. If 0329 needs a second place that applies a result, it must pull the guarded block out into one private helper and use that helper, never a copy.
- 0329 registers the reconciliation listener and starts tenure on reveal. That is its own call, but whatever it registers, reads through `refreshProfile`, so they stay ordered.
- **Out of scope for 0326 and unchanged:** a read that lands after the card is disconnected still applies and publishes, exactly as today. If 0329's subscribe and unsubscribe make that matter, 0329 can bump `profileReadsIssued` in `disconnectedCallback`, which makes every in-flight read stale. Flagged here, not built here.

## 7. Out of scope (from the brief)

The "show threshold, not 0" extra; any change to reconciliation, the purchase flow or 0303's popup; 0318's card-vanishing problem. There is no `src/core/` change.

---

## Open questions

**NEEDS-DECISION Q1: which ordering rule**
- **question:** When two profile reads overlap, when should the card throw away an answer?
- **options (recommended first):**
  - **(A) Rec: drop an answer only if a newer answer has already been shown.**
    - Consequence: the card always moves forward and never back, and a caller that waited for its read always sees at least that fresh a state when it continues.
    - Cost: one extra field. The card may briefly show a middle answer before the newest one lands.
  - **(B) The brief's wording: drop an answer unless it is the newest one asked for.**
    - Consequence: it also fixes the reported race.
    - Cost: if a newer read is still loading, a perfectly good answer that is fresher than the screen is thrown away. Code that waited for it (the tenure gift) then continues with the older screen state and can skip the "restart to apply" popup for a player the gift just made a citizen. Lower risk, but real.
  - Explain more, then ask again: give me more context in simple terms, then re-ask the question.
- **recommendation:** A. It fixes everything B fixes, and does not open the tenure-popup gap.
- **context (plain words):** The citizenship card asks the server "is this player a citizen?" from several places, and the answers can come back out of order. Today the last answer to *arrive* wins, even if it is the oldest one. That is the bug. The brief says: number the questions, and keep an answer only if it belongs to the newest question asked. The catch: if a newer question is still waiting, a good answer gets thrown away even though it is fresher than what the screen shows. One piece of code, the free-XP gift, waits for its answer and then checks "did this make them a citizen?" to decide whether to offer the "restart to apply" popup. Under the brief's rule it can check against the old screen and skip the popup. Option A says: keep an answer unless something newer is *already on screen*. Both fix the bug; A also avoids the missed popup. It is a small change of wording, not of scope, but it differs from the brief's text, so it is the owner's call.

**NEEDS-DECISION Q2: the "fires exactly once" check**
- **question:** The brief asks for a test that `Citizenship:Earned:XP` fires exactly once per load, but that event is switched off today and fires zero times. What should the test prove instead?
- **options (recommended first):**
  - **(A) Rec: prove "one server read per refresh, never retried, no new reader".** Note in the worklog that the event is dormant (task 0250 S1, ruling D4). This is the part that would keep the event from double-firing once S3b switches it back on.
  - **(B) Also add a test in `PlayerProfileView.test.ts` that the event fires zero times per load today.** It is accurate, but it tests 0250's switch-off, not this task, and S3b must edit it later.
  - Explain more, then ask again: give me more context in simple terms, then re-ask the question.
- **recommendation:** A.
- **context (plain words):** The brief's worry is that the fix might make the "earned citizenship" analytics event fire twice. That event is currently switched off on purpose (an earlier owner ruling), so it fires zero times. It cannot double-fire, and the literal check "fires exactly once" would be false. What really matters is that the fix never makes an extra server read, because a future version of the event will run inside that read. The plan tests exactly that. This is not a scope change; it makes one verification line say what is true.

---

## Owner rulings (recorded by the driver, `fkit-sprint-ship-loop` / fkit-lead, 2026-09-28)

Given live in the `fkit lead` session via `AskUserQuestion` (ADR-021/037). Verbatim answers:

- **Q1 (ordering rule):** "Newer already shown (Recommended)" ⇒ build **option A**: drop a read only if a newer read has already been applied (`profileReadsIssued` + `newestAppliedProfileRead`). Test 4 (the A-vs-B case) is in scope.
- **Q2 (the "fires exactly once" check):** "One read per refresh (Recommended)" ⇒ prove one server read per refresh, never retried, no new reader; note in the worklog that `Citizenship:Earned:XP` is dormant (0250 S1, D4). No `PlayerProfileView.test.ts` zero-fire test.
- **Plan approval:** "Approve (Recommended)" — 2026-09-28.
