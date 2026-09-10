# 0236 — worklog

**Implemented 2026-09-10 by fkit-coder, against commit `4c981e5`
(`4c981e557d84566ed3d6cbadac54b25fd9e5e1b3`).** Plan approved live by the owner the same day.
All line citations below were re-derived by reading the files, per
[`conventions/file-line-citations.md`](../../../knowledge-base/conventions/file-line-citations.md).
Line numbers are **pre-change** unless stated.

---

## 🔴 Step 0 — the `isCitizen` render sweep: CLEAN PASS, nothing new

**This is the pass that closes the architect's caveat.** The architect found the profile surfaces by
grepping `profileApiUrl`, which by construction cannot see a render-only affordance that makes no
network call — which is exactly how the ★ badge was missed. **Somebody has now looked.
⛔ Do not re-run this sweep; it is recorded here so nobody has to.**

### Method — three passes, deliberately wider than the architect's

1. `grep -rn -i "iscitizen" src/` — every occurrence, all four tiers.
2. `grep -rli "citizen" src/client/` — every client file touching citizenship **at all**, then read
   each one the brief does not already name.
3. `grep -rn "CitizenBadge" src/ tests/` — every importer of the badge helper.

### Result — the brief's surface list is COMPLETE. No fifth surface.

Pass 1 found exactly the four badge call sites the brief names, and no others in render position:

| Call site | What is at that line |
|---|---|
| `src/client/HostLobbyModal.ts:546` | `${client.isCitizen ? renderCitizenBadge() : ""}` |
| `src/client/JoinPrivateLobbyModal.ts:91` | `>${player.isCitizen ? renderCitizenBadge() : ""}` |
| `src/client/graphics/layers/Leaderboard.ts:312` | `${player.player.isCitizen() ? renderCitizenBadge() : null}` |
| `src/client/graphics/layers/PlayerPanel.ts:442` | `${other.isCitizen() ? renderCitizenBadge() : ""} ${other.name()}` |

`src/client/CitizenshipCard.ts:265` (`const isCitizen = profile.isCitizen || this.paidGrantConfirmed;`)
drives renders at `:270`, `:289`, `:328`, `:335` — all **inside the card**, already gated at `:76`
(layer 1, absolute) and `:87-88` (layer 2, with the fail-open). Not a new surface.

### The four `citizen`-touching client files the brief does NOT name, and why each is not a fifth surface

**This is the part that proves the sweep was real rather than perfunctory.**

| File | Verdict |
|---|---|
| `src/client/components/NewsButton.ts` | **Derived — covered by Step 1.** The unread dot at `:80` is `getInboxState().unreadCount > 0`. The **only** producer of that state is `fetchInboxState()`. The gate makes it `UNAVAILABLE` ⇒ `unreadCount 0` ⇒ no dot. |
| `src/client/NewsModal.ts` | **Derived — covered by Step 1.** The "Personal" tab exists only while the inbox is available (`:36-38` comment; state read at `:39`). Same single producer, same gate. |
| `src/client/NameChangeRequest.ts` | **Not a render surface.** Pure orchestration; its only callers are `CitizenshipCard.ts:560` and `:610`, inside the already-gated card. |
| `src/client/LangSelector.ts:245` | **Not a surface.** `"citizenship-card"` is a string in a custom-element re-render list. |

⚠️ **NewsButton and NewsModal ARE citizenship-derived render affordances** — precisely the class the
architect's method could not see. They are covered **transitively**, through the single
`fetchInboxState()` producer, not by their own gate. **If the inbox ever grows a second state
producer, these two stop being covered.** Recorded so that is a known condition, not a surprise.

---

## What changed — 4 source files, 3 test files

### 1. The one shared helper — `src/client/flashist/FlashistFacade.ts`

Added immediately after `isCitizenshipUiEnabled()` (was `:890`), following the shape of its four
neighbours. **No new module. No `State.ts` — none exists in this repo and none was created.**

- `isCitizenshipSurfacesEnabled(): Promise<boolean>` — layer 1 **AND** layer 2. `&&` short-circuits,
  so while `CITIZENSHIP_CARD_ENABLED` is `false` the remote flag is never read at all.
- `citizenshipSurfacesSnapshot` — the cached sync snapshot, **default `false`**.
- `isCitizenshipSurfacesEnabledSync(): boolean` — the sync read for the badge.
- `primeCitizenshipSurfacesSnapshot()` — resolves the snapshot once.

Primed by one line inside `initializePlatform()`, next to the existing
`void settledPromise.then(() => this.logExperimentEvents());` (was `:584`) — i.e. exactly where the
flags settle. **`void`, never awaited**, so it cannot extend the 5 s platform-init deadline (`:316`).

> ### `=== true` in `isCitizenshipSurfacesEnabledSync()` — keep it, but it is TYPE-NORMALIZING
>
> The test suites build facades via `Object.create(FlashistFacade.prototype)`
> (`tests/client/FlashistFacade.test.ts:17`, `:27`), which **skips class-field initializers** — that
> file's own `:9` comment says so. The field is therefore `undefined` in those suites, and `=== true`
> keeps the declared `boolean` return honest instead of leaking `undefined`.
>
> ⚠️ **Corrected after round-1 review (both reviewers).** An earlier version of this note and of the
> code comment called the guard *"load-bearing, do not tidy"*. **That overstated it**: removing the
> guard changes **nothing observable**, because `!undefined` is already truthy at the only call site.
> It normalizes the type; it is not behavior-critical. Both the code comment and this note now say
> that. **An overstated comment teaches the next reader something false**, which is why this was
> worth correcting rather than shrugging off.

### 2. 🚨 The badge — `src/client/CitizenBadge.ts`

Guard added at the top of `renderCitizenBadge()` (was `:25`); returns lit's `nothing` when the switch
is off. Return type widened to `TemplateResult | typeof nothing`.

**One edit, four surfaces, ZERO call-site changes** — all four call sites are inline template
ternaries, so the widened type needed nothing from them (proven by a clean `tsc --noEmit` and a clean
`build-prod`). This is deliberate: the file header already says *"THIS IS THE ONLY PLACE THE GLYPH
LIVES"*, and gating the four call sites individually would have been four chances to miss the fifth.

Owner ruling implemented here, verbatim: ***"Hide it too — kill means kill."*** (2026-09-10)

### 3. `src/client/Inbox.ts` — layer 2 added

The layer-1-only check at `:152-154` inside `fetchInboxState()` (`:149`) was **replaced** by the
shared helper — replaced, not supplemented, so verification item 4 ("the flag reads go through ONE
shared helper") is literally true. Already `async`, so no structural cost. `flashistConstants` stays
imported; still used at `:144` for `INBOX_LOAD_FAILED`.

### 4. `src/client/PaymentsReconciliation.ts` — the reconcile POST gated

Gated inside **`runPaymentsReconciliation()`**, immediately after `await flashist_waitGameInitComplete();`
(`:45`) and before `getSignedPurchases()` (`:51`) — **not** at the `FlashistFacade` call site.

**Why the function and not the call site:**
- It is the single choke point in front of the **only** profile-server call in the module
  (`reconcilePurchases`, `:55`), so **every** caller is covered; the call site covers one caller.
- It is already past the init gate ⇒ flags are settled ⇒ this is a **real `await`**, no snapshot.
- The `hasScheduled` latch (`:26`, `:38`) is untouched: still once per session, it just returns early.

**`getCatalog()` (`FlashistFacade.ts:966`) was left alone**, as ruled — a Yandex SDK call that never
touches the profile server.

---

## 🔴 The pre-resolution default: FALSE (badge hidden). Owner-approved.

**`renderCitizenBadge()` is synchronous and returns a `TemplateResult`; the layer-2 flag read is
asynchronous.** It cannot await, and making it async would change the signature at all four call
sites — the exact drift this design avoids. Hence the cached sync snapshot, and hence this decision.

**Chosen: `false` — the badge is hidden until the snapshot resolves.** Four reasons, in order of weight:

**(a) The failure modes are asymmetric, and only one of them breaks the ruling.** Default-`true`
means: on a build where the switch is OFF, the ★ paints and then vanishes — a kill switch *visibly
leaking*, the exact thing *"kill means kill"* was ruled against. Default-`false` means: on a build
where the switch is ON, a ★ may appear slightly late. **A kill switch must fail CLOSED.** A cosmetic
glyph arriving 200 ms late is not a defect; a glyph appearing on a killed build is.

**(b) The pre-resolution window is empty on the HAPPY path — the load-order proof.**

> 🔴 **CORRECTED after round-1 review (findings R1 + R2). The original version of this argument said
> "empty on every real path". THAT WAS WRONG, and the error was not cosmetic — it is the same
> assumption that produced the R1 defect.** The argument below is sound **on the happy path only**
> (the reviewer independently traced the microtask chain and concurs). It **fails** on:
> - **the deadline path** — `fetchExperimentFlags()`'s own 5 s `getFlags()` race starts *after* the
>   platform deadline timer and can outlive it, so the prime can still be unresolved when Bootstrap
>   imports `Main.ts`;
> - **the degraded path** — no SDK, so the prime resolves `false`; corrected by the R1 re-prime, but
>   only if the SDK actually recovers;
> - **an early throw** in `runPlatformInit()` before the prime line, where the prime never runs at all.
>
> On all three the snapshot can be `false` while the UI is interactive. **That is the fail-closed
> default working, not a gap** — but it is a real window, and the record must say so.

In
`src/client/Bootstrap.ts`: `:42` is `await facade.initializePlatform();` and `:54` is
`const { startClient } = await loadAppModule();` (→ `import("./Main")`). **`Main.ts` — which pulls in
every one of the four badge call sites — is not loaded until platform init has already returned**,
and the prime is kicked off inside `initializePlatform` before that return. In the normal path
`loadExperimentFlags()` has already settled in the `Promise.allSettled` at `:572-576`. So by the time
any module that *can* call the badge even exists, the snapshot is resolved. Bootstrap's own header
states this as design intent: components *"structurally cannot race platform initialization"* (`:8-11`).

**(c) The residual window is the abnormal path only, and it self-heals.** If `getFlags()` outruns the
5 s deadline (`:803-811`), init returns with the snapshot still `false`. But the four call sites are
user-driven — open the host lobby, open the join-private modal, be in a game — seconds to minutes
after boot, and Lit re-renders them on their own state changes, so a late snapshot is picked up on the
next natural render. Practical worst case: **"★ appears a moment later", not "never"**.

**(d) It agrees with the steady state.** Layer 1 is `false`, so `false` is the correct final answer today.

⚠️ **Honest caveat, not buried:** fail-closed means that if the prime never resolves truthfully (SDK
absent, `getFlags()` timed out ⇒ flags stay undefined ⇒ `checkExperimentFlag` returns `false`), the
badge stays hidden. **That is intended.** Note it is the **opposite** of the card's fail-**open** at
`CitizenshipCard.ts:87-88`. Both are owner rulings; each is implemented where it was ruled. **The
tension is recorded, not resolved.**

---

---

## Round-1 review — 5 findings, all CORRECT, all fixed

Ledger: [`review.md`](review.md) (Status: closed-out). Two reviewers, full coverage, no degradation.
**Every finding was verified against the code before any change.**

| # | What it caught | Outcome |
|---|---|---|
| **R1** | 🔴 **A real defect in my code.** `yandexSdkInit()` re-runs **four** capabilities on late-SDK recovery, each commented *"same recovery pattern"*. **My snapshot was the only one of five that skipped it.** Degraded boot ⇒ prime resolves `false` ⇒ SDK recovers ⇒ flags refetched ⇒ the **async** helper says enabled while the **sync** snapshot the badge reads stays `false` **for the whole session**. Inbox opens, payments reconcile, **badges never appear.** The helper's two halves diverge. | Fixed: re-prime at the recovery site, following the siblings' convention. Race analysis in `review.md`. |
| **R2** | The doc comment's *"pre-resolution window is empty on every real path"* was **false** on the deadline path and on an early throw — the same assumption that produced R1. | Comment corrected to name the real windows. Design unchanged. |
| **R3** | My *"fails CLOSED"* test was **byte-equivalent to the case above it** and proved nothing — it stayed green **with R1 present**. | Removed, with a comment saying why and where the real coverage went. |
| **R4** | The helper had **no test anywhere** — including the owner's 2026-08-21 layer-1-absolute ruling. | 8 real cases added; see below. |
| **R5** | *"No automated runtime verification"* was **understated**: layer 2 is hard-wired ON in dev builds. | Recorded as a **launch precondition** in the brief. |

**R4's coverage, in `tests/client/FlashistFacade.test.ts`, against real bare-prototype facades:**
layer-1 absoluteness asserted as **"the remote read never HAPPENS"** (not merely that the result is
`false` — that is what keeps layer 1 ahead of the `GAME_ENV === "dev"` bypass); the both-layers
composition; the sync getter **before** priming (the real field default) and after; the remote-off
case; R1's stale→fresh re-prime; and a **wiring test that the recovery site calls the prime**.

> ✅ **The R1 wiring test was proven to fail with the fix line removed, then pass with it restored.**
> After R3, asserting a new test is meaningful without demonstrating it would have been the same
> mistake twice.

**R5 — the launch precondition, in short:** `checkExperimentFlag()` returns `true` unconditionally
when `GAME_ENV === "dev"`, and the client's `GAME_ENV` comes from the **webpack mode**
(`webpack.config.js:334`), not the `dev` script's `cross-env`. ⇒ **the remote half of the kill switch
cannot be exercised in dev at all.** Full gate in the brief's **§3 LAUNCH PRECONDITION**. ⚠️ It is
**independent of `0217` and of citizen rows** — a different blocker from the one in the verification
section below.

---

## Round-2 review — 0236 CLOSES

Four new findings, **all LOW, none high**. **R1–R5's fixes were all verified.**

| # | Outcome |
|---|---|
| **R6** | ✅ **Fixed here.** My own doc comment opened *"Primed once during platform init"* while a later line of **the same comment** described the R1 re-prime — I introduced both in one rewrite and left them contradicting each other. Opening line now says *"Primed during platform init, and re-primed on late-SDK recovery from `yandexSdkInit()`."* One line, comment only. |
| **R7** | ⛔ **Routed out** — test-comment / mutation gap. |
| **R8** | ⛔ **Routed out** — the wiring test's ordering weakness. |
| **R9** | ⛔ **Routed out** — test-robustness item. |

> ### ⚠️ R6 was an EXCEPTION to the owner's stopping rule — the LEAD'S call, not an owner ruling
>
> Recorded here so the exception is **visible rather than silent**: the reviewer flagged the cost
> asymmetry — tracking a one-line comment fix through a follow-up task costs more than making it.
> **R7/R8/R9 were left strictly untouched** and route out with their re-raise conditions in the ledger.

### 🚨 Verification limit — round 2's green suite is SINGLE-SOURCE

**Codex could not run jest in round 2**: its read-only sandbox blocked the haste-map write (`EPERM`).
The passing result is the **Claude reviewer's single execution**. The *findings* had two-reviewer
coverage; the **test execution did not**. ⛔ **Do not record round 2 as two-reviewer test agreement.**
(My own local `npm test` runs are a third independent execution, but they are mine — the author's —
which is exactly the thing an independent reviewer's run is supposed to corroborate.)

### Two of my own arguments were replaced by better ones — worth keeping

1. **The race guarantee is the event loop, not wall-clock ordering.** My reasoning about which chain
   resolves first was correct but weak. The real guarantee: the no-SDK chain is **entirely
   microtasks**, while `yandexGamesSDK` is assigned from an **IO macrotask** (`await YaGames.init()`),
   and **a macrotask cannot interleave into an uninterrupted microtask drain**. The initial prime's
   no-SDK read and its `false` write therefore complete atomically before any SDK assignment is
   observable. **Structural, not timing-dependent.**
2. **A latch would not merely be unnecessary — it would be actively WRONG on a kill switch.** My note
   said it "would mask a future bug". Far too weak. A latch would make the snapshot **unable to return
   to `false`**, **pinning the switch permanently ON** if a future re-prime were ever added on a flag
   refresh — defeating the entire purpose of the feature. **That is the reason not to add one.**

### What round 2 confirmed about the round-1 work

- **The R3 deletion-over-repair call: VERIFIED.** The coverage genuinely was unreachable in that suite
  by construction. Both reviewers concur — **I did not delete a working test.**
- **The absoluteness test is materially stronger than a boolean assertion**, and the reviewer put the
  reason better than I did: **`&&` is commutative in its RESULT**, so a reversed
  `(await isCitizenshipUiEnabled()) && CITIZENSHIP_CARD_ENABLED` still returns `false` — a
  boolean-only test passes **while the remote read, and the dev bypass behind it, have ALREADY RUN**.
  Only `.not.toHaveBeenCalled()` catches that.
- **Brief §3 turned out SHARPER than the R5 that prompted it**: it found something the reviewer had
  not — the client bundle's `GAME_ENV` comes from **`webpack.config.js:334`** (webpack mode), **not**
  the `cross-env GAME_ENV=dev` in the npm scripts, which only sets it for the **Node server**. The
  reviewer verified both halves.

---

## ✅ Accepted residuals and known consequences — recorded, not overlooked

1. **No "snapshot resolved" re-render event was added.** Forcing the four surfaces to re-render on
   late resolution would mean 4 listeners + an event — precisely the *"growing a flag abstraction"*
   shape the brief bans — bought to fix a window that (b) and (c) above show is already empty or
   self-healing. **Accepted residual, deliberate.**
2. **🔴 Gating reconciliation also suspends CONSUMING purchases the server already granted.**
   **Owner ruled 2026-09-10: ACCEPT AND RECORD; do not reopen.** Nothing is lost — an unconsumed
   purchase resurfaces in the next session's `getPurchases()`, which is that module's own designed
   retry (`:69`) — but the Yandex-moderation-compliance rationale in its header (`:1-4`) is **dormant
   while the switch is off**. Practical exposure today is **zero**: layer 1 is `false`, so no purchase
   can be started. A comment at the code says this.
3. **NewsButton / NewsModal are covered transitively**, through the single `fetchInboxState()`
   producer — not by their own gate. A second inbox-state producer would silently uncover them.
4. **Unhandled-rejection check on the prime: verified NOT needed, no speculative code added.**
   The prime is a `.then()` with no `.catch()`, matching the adjacent `void settledPromise.then(...)`
   idiom. `yandexInitPromise` is constructed **resolve-only** (`:371`, `new Promise((resolve) => {…})`)
   so it can never reject, and `fetchExperimentFlags` swallows its own timeout internally
   (`:813-818`). Checked rather than assumed.
5. **Brief citation scope correction (not a defect):** `void import("../PaymentsReconciliation")` is
   at `FlashistFacade.ts:978` as the brief says, but it sits inside **`fetchPaymentsCatalog()`**
   (declared `:962`), which `initPayments()` calls — not directly inside `initPayments`. Every other
   line number in the brief verified **exactly**.

---

## Verification — what was run, and what could NOT be verified

### Ran, green

| Check | Result |
|---|---|
| The 3 affected suites | **3 passed, 43 tests** |
| `npm test` (full) | **113 suites / 1190 tests, all passed, 30.4 s** (was 113/1185 — **+5** new tests) |
| `eslint` on the 7 touched files | **exit 0** |
| `prettier --check` on the 7 touched files | **clean** |
| `tsc --noEmit` | **exit 0** |
| `npm run build-prod` | **exit 0**, only the 2 pre-existing bundle-size warnings; **no circular-dependency warning** |

No supertest flake occurred, so the `0197` SIGSEGV rule-out was not needed. The 30.4 s runtime is the
shell harnesses (`ShellHarnesses.test.ts`, 30.2 s of it) — expected since `0201`, **not a hang**.
`prettier` was scoped to the touched files; **repo-wide `npm run format` was NOT run**.

### Both states covered, per gate

| Gate | OFF covered | ON covered |
|---|---|---|
| ★ badge (`CitizenBadge.test.ts`) | switch off ⇒ no `.citizen-badge`; **plus a separate case for the pre-resolution default** | switch on ⇒ badge renders; **all 3 original cases kept, none deleted**, now running with the switch on |
| Inbox (`Inbox.test.ts`) | new case: remote flag off ⇒ `UNAVAILABLE`, **no fetch**, `isYandexAuthorized` never called | existing load/refresh/mark-read cases, unchanged |
| Reconcile POST (`PaymentsReconciliation.test.ts`) | new case: switch off ⇒ `getSignedPurchases`, `reconcilePurchases`, `consumePurchase` all never called, no event | existing consume/event cases, unchanged |
| Layer 1 (`Inbox.test.ts`) | existing launch-flag case **still tests layer 1 for real** | — |

**The Inbox mock deliberately mirrors the real helper** (`CITIZENSHIP_CARD_ENABLED && remoteFlag`)
instead of hard-coding a boolean — that is what keeps the pre-existing layer-1 case meaningful
instead of quietly passing against a stub.

### 🚨 What could NOT be verified, and the CORRECTED reason

**There is no meaningful local runtime verification for this task. Reasoned from code, NOT observed.**

> ⚠️ **A premise in the original plan was stale and is corrected here.** The plan said the profile box
> "does not exist". **THE BOX EXISTS** — stood up 2026-09-09/10 under task **`0215`**, now closed:
> live at the profile hostname, `/health` and `/ready` 200 over a valid cert, fresh Postgres volume,
> migrations 001-004 applied, encrypted backups landing, renewal proven by dry-run.
> **Attributed to `0215`'s close — this task did not inspect the box and must not claim to have.**

**The conclusion is unchanged; only the reason is different:**

- **The game server is NOT wired to the profile box** — that is task **`0217`**, still 🔲 Backlog. No
  credit/upsert call path is live.
- **The profile database has ZERO citizen rows.**
- ⇒ `client.isCitizen` still cannot become `true`. `GameServer.ts:1227-1243` sets it **only** on a
  positive profile-server answer and never clears it (`:1235-1236`). ⇒ **the ★ cannot render in
  either state locally**, so a live look cannot distinguish "correctly gated" from "no citizens exist".
- The **inbox** returns `UNAVAILABLE` before reaching the gate (no local Yandex auth; empty
  `profileApiUrl` short-circuits at `Inbox.ts:173-175`). The **reconcile POST** needs a real Yandex
  payments catalog to reach `"ready"`.
- **The dev bypass is real but is not the main obstacle.** `webpack.config.js:334` is
  `"process.env.GAME_ENV": JSON.stringify(isProduction ? "prod" : "dev")` — the client's `GAME_ENV`
  comes from **webpack mode**, *not* from the `cross-env GAME_ENV=dev` in the `dev` script. So
  `npm run dev` ⇒ bypass active; `build-prod` ⇒ bypass inactive. Even so, the three blockers above
  bite first.

**Forcing an ON state would take three separate fake local edits** (flip layer 1, fake `isCitizen`,
fake the catalog status) — that would be observing my own fakes, not the system. **Not done, and not
presented as verification.**

**What only the owner can verify, and only at launch:** that flipping `citizenship_ui` off in the
Yandex console actually hides all four surfaces for a real player. Needs layer 1 `true`, the Yandex
environment, and console access. **Marked reasoned, not observed.**

### Deploy

**Ships on any ordinary client deploy; no dedicated deploy, and nothing here touches the profile box.**
This change has **zero observable effect in production today** — layer 1 is `false`, and `isCitizen`
cannot become `true` until `0217` wires the server — so before and after are visually identical. Which
is also exactly why a deploy **cannot prove anything** until launch flips layer 1 to `true`.

---

## ⛔ Deliberately NOT touched

- **`src/client/CitizenshipCard.ts:87-88`** — the fail-open carve-out
  (`isYandexDegraded() || (await isCitizenshipUiEnabled())`). **UNCHANGED.** Owner ruling 2026-09-10,
  KEEP AS-IS. It is a **known, accepted limitation** of the kill switch: when the Yandex SDK is
  degraded the flag is never read, so the switch is **bypassed for the card in exactly that case**.
  Blast radius: degraded mode has no Yandex ID, so the card is a passive buttonless "couldn't connect"
  strip — **a visibility failure, not a functional one**. That is a reason not to panic, **not** a
  reason to stop calling it a limitation. The build never tempted me to change it; no NEEDS-DECISION.
- **Everything server-side.** `GameServer.ts` `creditMatch()` and `Transport.ts:407`
  `maybeRefreshYandexIdentity()` remain **ungated**. 🚨 **This is a UI kill switch. It does not stop
  crediting, and must never be described as stopping the data path.**
- **`getCatalog()`** (`FlashistFacade.ts:966`) — Yandex SDK only.
- **The dead `citizenship-login-requested` event** (`CitizenshipCard.ts:24`, dispatched `:175`, sole
  listener `tests/client/CitizenshipCard.test.ts:261`) — **noted, not removed.**
- **`src/client/index.html` / `yandex-games_iframe.html`** — no new custom element, no new HTML
  element, no new user-visible string ⇒ neither the both-templates rule nor the `en.json`/`ru.json`
  sync rule is triggered.
- **`src/core/`, `src/server/`, `src/profile-server/`** — untouched, so the *"all `src/core/` changes
  MUST be tested"* mandate does not bite.
- **No commit, no push, no deploy, no task-file move, no `ai-agents/wiki-vault/` write.**
