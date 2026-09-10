# Close the coverage gaps in the client-side citizenship kill switch — three ungated surfaces, one shared helper

## ID
0236

## Parent / Epic
None. Related to the citizenship/profile line of work but **not** a slice of
[`0213`](../../backlog/0213-profile-backend-clean-slate-rebuild/brief.md) — that epic is the **backend** rebuild;
this is **client-side UI gating only** and depends on none of it.

## Sprint
Sprint 4

> 📌 **Appended to the Sprint 4 board per ADR-035 (rows are appended, never inserted) — this is an
> APPEND POSITION, stated plainly. It sits at the bottom of the table and no row above it moved.**
> ⚠️ **Append position is not a priority signal**; the priority is in the Priority field.
>
> **Why Sprint 4 and not the unranked [Backlog board](../../../sprints/backlog.md):** the owner ruled
> **DRIVE IT NOW** (2026-09-10, live in session) and a coder is expected to pick this up **in the same
> session it was filed**. The Backlog board is for work that is **not** scheduled; work being
> implemented today belongs on the active sprint board, or the boards stop describing reality. That is
> the boards' own convention, not a judgement call about importance.

## Priority
**High** — the ★ badge gap (item 3) is the one that matters: today **neither** client flag hides it.

⚠️ **The rank is the producer's**; the owner ruled that the work happens now, not where it ranks.

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder

## Depends on
✅ **NOTHING.** Client-only. It does **not** wait on the profile box, `0217`, or any deploy.

---

> # 🚨 READ THIS FIRST — THE SHAPE OF THE TASK IS "BUILD ALMOST NOTHING"
>
> **Two gating layers ALREADY EXIST and work. This task does not design a feature-flag system, does
> not add a module, and does not add a config surface.** It closes **three coverage gaps** and
> extracts **one shared helper** — the architect's estimate is **~15 lines across four files**.
>
> ⛔ **If the implementation starts growing a new flag abstraction, a new module, or a `State.ts`,
> STOP — that is out of scope and it is the wrong shape.** 🔴 **There is NO `State.ts` in this
> repository** (verified 2026-09-10: `find src -name "State.ts"` returns nothing). **Do not create
> one.**
>
> ## The two layers that already exist
>
> | Layer | What it is | Where | State today |
> |---|---|---|---|
> | **1 — local compile-time** | `flashistConstants.features.CITIZENSHIP_CARD_ENABLED` | `src/client/flashist/FlashistFacade.ts:184` | **`false`.** Checked **first and absolutely**, including in dev — the constant's own comment says there is deliberately **no `GAME_ENV` bypass** on it (owner-ruled 2026-08-21). 🔴 **Flipping this to `true` IS the launch.** |
> | **2 — remote runtime** | the `"citizenship_ui"` Yandex experiment flag, read via `checkExperimentFlag` | flag name `FlashistFacade.ts:174`, helper `isCitizenshipUiEnabled()` at `FlashistFacade.ts:890`, generic reader at `:848` | Already wired. **This is the fast kill switch: flippable from the Yandex console with NO deploy.** |
>
> ✅ **All line numbers in this brief were re-verified at commit `4c981e5` on 2026-09-10.** ⚠️ Treat
> them as approximate anchors — **re-derive by content, not by line number**, per
> [`conventions/file-line-citations.md`](../../../knowledge-base/conventions/file-line-citations.md).

---

## Context

### The goal

**A fast kill switch for client-side profile / citizenship features** — the ability to turn the
citizenship surfaces off for players **without a deploy**, from the Yandex console.

Layer 2 already provides that. **The problem is that three surfaces do not consult either layer**, so
today "flip the flag off" would leave visible citizenship UI on screen.

### Where the assessment came from

An **architect assessment**, run 2026-09-10 at commit `4c981e5`. Its conclusion was
**BUILD ALMOST NOTHING** — the machinery exists, the gaps are coverage, not capability.

> 🚨 **THE ARCHITECT'S OWN CAVEAT, AND IT MUST NOT BE LOST — the surface list is NOT closed.**
>
> **The architect found the profile surfaces by grepping `profileApiUrl`.** ⚠️ **By construction that
> method CANNOT surface a render-only affordance** — anything that draws citizenship state without
> ever calling the profile server is invisible to it. **The ★ badge is exactly that, and it is only in
> this brief because it was caught another way.**
>
> ⇒ 🔴 **DO NOT TREAT THE FOUR ITEMS BELOW AS THE COMPLETE LIST.** A **targeted second pass over render
> templates for `isCitizen`** is **step 0 of this task** — see *What to build*. If that pass finds a
> fifth surface, **it is in scope**, and say so.

---

## What to build

### 🔴 Step 0 — the second pass, BEFORE writing any gate

**Grep the client render templates for `isCitizen` (and any other citizenship-derived render
condition) and confirm the surface list is complete.** The architect's `profileApiUrl` sweep could not
have found render-only affordances, so this pass is what closes that hole.

- **Record what you find in this task's `worklog.md`**, including "nothing new" if that is the answer.
- **Any additional surface found is IN SCOPE** — gate it the same way and report it.
- ⚠️ **A clean pass is a result worth writing down.** It converts "the architect could not have seen
  render-only surfaces" into "somebody looked."

### Step 1 — `src/client/Inbox.ts` (~`:152`) — add the remote flag

`fetchInboxState()` currently gates on **layer 1 only**:

```
if (!flashistConstants.features.CITIZENSHIP_CARD_ENABLED) {
  return UNAVAILABLE;
}
```

**Add the layer-2 check as well**, so a console flip hides the inbox too. The existing comment already
states the intent — *"while the citizenship card is hidden the inbox must not surface either — one
consistent unlaunched surface"* — this makes that true for the **remote** flag, not just the local one.

✅ This function is already `async`, so the async flag read costs nothing structurally here.

### Step 2 — the payments reconciliation POST — gated by NEITHER layer

`schedulePaymentsReconciliation()` (`src/client/PaymentsReconciliation.ts:34`) is fired from
`FlashistFacade.ts:978`, inside `initPayments`, as a fire-and-forget dynamic import. **Neither layer
gates it.** Gate it at **one** of those two places — the function itself or its call site; the
implementer picks, and says which and why.

⛔ **LEAVE THE YANDEX `getCatalog()` CALL ALONE.** It is a Yandex SDK call that **never touches the
profile server**, so it is not a profile surface and gating it would be scope creep with a real cost
(the catalog is used elsewhere).

### 🚨 Step 3 — the citizen ★ badge — THE IMPORTANT ONE

**Gated by NEITHER layer**, and it is the gap that makes a flag flip incomplete today.

| Where | Line |
|---|---|
| `src/client/CitizenBadge.ts` — `renderCitizenBadge()` | ~`:25` |
| `src/client/HostLobbyModal.ts` | ~`:546` |
| `src/client/JoinPrivateLobbyModal.ts` | ~`:91` |
| `src/client/graphics/layers/Leaderboard.ts` | ~`:312` |
| `src/client/graphics/layers/PlayerPanel.ts` | ~`:442` |

🔴 **Why both client flags miss it: its `isCitizen` comes from GAME STATE, not from the profile
fetch.** It is populated at `src/client/ClientGameRunner.ts:417` (`isCitizen: this.myPlayer.isCitizen()`)
and travels with the game's own player records — so hiding the card and the inbox leaves the ★
rendering in four places.

> **🔴 OWNER RULING 2026-09-10, live in session, verbatim: *"Hide it too — kill means kill."***

**Put the check INSIDE `renderCitizenBadge()` so it returns nothing when the switch is off.** ✅ **One
edit, and it cannot drift** — the file's own header already says *"THIS IS THE ONLY PLACE THE GLYPH
LIVES"* and that every surface routes through this one helper. Gating the four call sites individually
would be four chances to miss the fifth.

> ## ⚠️ A REAL CONSTRAINT — do not discover this cold, halfway through
>
> **`renderCitizenBadge()` is SYNCHRONOUS and returns a `TemplateResult`. The layer-2 flag read is
> ASYNCHRONOUS.** You cannot `await` inside it, and making it async would change the signature at all
> four call sites — which is exactly the drift risk this design avoids.
>
> ⇒ **It needs a cached SYNCHRONOUS SNAPSHOT of the flag, resolved once after platform init**, which
> the sync render then reads. The gate for "platform init has completed" already exists in this
> codebase — `flashist_waitGameInitComplete()`, the same gate `CitizenshipCard.ts:80` uses.
>
> ⚠️ **Decide and record the pre-resolution default** — what the badge does on the very first render if
> it happens before the snapshot resolves. **Both choices are defensible and they are not equivalent**
> (a brief flash of a ★ that then vanishes, versus a badge that never appears for a player whose
> render beat the snapshot). **State which you chose and why**; do not leave it implicit.

### Step 4 — extract ONE shared helper

Put the combined read (**layer 1 AND layer 2**) in **one** helper, **next to the existing
`isCitizenshipUiEnabled()` at `FlashistFacade.ts:890`**.

- ⛔ **NOT a new module.**
- ⛔ **NOT a `State.ts`** — none exists in this repo; do not introduce one.
- ✅ Beside the existing helper, following the shape of the ones already there
  (`isEmailSubscribeButtonEnabled`, `isTelegramLinkEnabled`, `isVkLinkEnabled`, `isCitizenshipUiEnabled`).

---

## 🔴 OWNER RULINGS — record these, do not re-litigate them

### 1. The fail-open carve-out at `CitizenshipCard.ts:86-88` — **KEEP AS-IS**

```
const enabled =
  FlashistFacade.instance.isYandexDegraded() ||
  (await FlashistFacade.instance.isCitizenshipUiEnabled());
```

🚨 **THIS IS A KNOWN, ACCEPTED LIMITATION OF THE KILL SWITCH — record it that way, NOT as an
oversight.**

**The owner was shown exactly what it means: when the Yandex SDK is degraded, the flag is never read
at all, so the kill switch is BYPASSED in precisely that case** — and chose to keep it, preserving
their **2026-08-21 ruling** that a degraded player should see an honest *"couldn't connect"* strip
rather than a silently missing surface.

> ## ⚠️ THE TENSION, RECORDED PLAINLY AND DELIBERATELY NOT RESOLVED
>
> **The owner ruled *"kill means kill"* for the ★ badge (step 3) and *"keep the fail-open"* for the
> card (here). These two rulings pull in OPPOSITE DIRECTIONS.**
>
> ⛔ **Do not resolve this tension, do not "reconcile" it, and do not quietly apply one ruling's logic
> to the other's surface.** Both are the owner's, both are recorded, and the inconsistency is the
> owner's to hold. **Implement each where it was ruled.**

**Blast radius of the fail-open case — so nobody over-reads it:** in degraded mode **there is no
Yandex ID**, so the card renders a **passive, buttonless "couldn't connect" strip** — **no profile
fetch, no purchase path, no calls to the profile server.** ⇒ **A VISIBILITY failure, not a functional
one.** ⚠️ That is a reason not to panic about it; **it is not a reason to stop calling it a
limitation.**

### 2. Yandex flag 100 %-rollout and propagation delay — **OWNER-ATTESTED, not repo-verified**

The architect flagged two things it could **not** verify, and named them as **the one unknown that
could undermine the whole recommendation**: whether the Yandex experiment flag can be rolled out to
**100 %** of players, and **how long a console change takes to propagate**.

> **The owner states they have already tested this on other games and it works.**

🚨 **Record it exactly as that: OWNER-ATTESTED, NOT REPO-VERIFIED.** It is not verifiable from this
repository, and it is not verified by this task. ⛔ **Do not restate it as a confirmed platform
capability**, and do not build a fallback against it either — the owner has ruled on the risk.

### 3. 🚨 LAUNCH PRECONDITION — layer 2 MUST be validated in a staging/prod build BEFORE launch

**Owner ruling 2026-09-10, from review finding R5. This is a GATE ON THE LAUNCH, not a nice-to-have.**

> ## ⛔ DO NOT FLIP `CITIZENSHIP_CARD_ENABLED` TO `true` UNTIL THE REMOTE HALF OF THIS KILL SWITCH HAS BEEN EXERCISED FOR REAL.

**Why this gate exists.** `checkExperimentFlag()` returns `true` **unconditionally** when
`process.env.GAME_ENV === "dev"` (`FlashistFacade.ts`, the dev bypass — re-derive by content). The
client's `GAME_ENV` comes from the **webpack mode** (`webpack.config.js`:
`JSON.stringify(isProduction ? "prod" : "dev")`), **not** from the `cross-env GAME_ENV=dev` in the
`dev` npm script. ⇒ **Layer 2 is hard-wired ON in every dev build.** The remote half of the kill
switch — the entire "flip it off from the Yandex console with no deploy" capability — **cannot be
exercised in dev at all**, and no automated test can substitute: the tests prove the composition and
the wiring, not that a real console flip reaches a real player.

⚠️ **This is independent of the profile backend.** It is **not** fixed by `0217` wiring the game
server, and **not** fixed by citizen rows existing. It is purely about the dev bypass.

**What "validated" means — all three, in a staging or prod build (NOT `npm run dev`):**

1. With the `citizenship_ui` flag **ON**: the four ★ badge call sites, the inbox, and the payments
   reconciliation POST all behave normally.
2. With the flag **flipped OFF in the Yandex console**: the ★ renders **nowhere**, the inbox is
   unavailable, and the reconcile POST does not fire.
3. The **propagation delay** of that console flip is **observed and written down** — ruling 2 above
   records it as owner-attested but **not repo-verified**, and this is the moment it stops being an
   assumption. ⚠️ Remember a flip **never reaches a live session** (boundary 2): next launch only.

**If this validation cannot be performed, the switch is not known to work and must not be relied on as
the launch's safety mechanism.** Say that plainly rather than launching behind an unverified switch.

**Every item below is a known fact recorded so nobody "discovers" it mid-implementation and widens the
task. None of them is a defect of this task.**

1. 🚨 **HIDING THE UI DOES NOT STOP SERVER-SIDE CREDITING.** `src/server/GameServer.ts:1304` calls
   `creditMatch()` **regardless**, and **nothing server-side reads a client flag.**
   - ✅ **For a UI bug that is FINE** — XP accrues invisibly and **survives**.
   - 🔴 **For bad data or a security concern it is NOT.** Stopping crediting means **emptying
     `PROFILE_API_URL`** — which is **SSH plus up to an hour of nginx cache**, and 🚨 **XP earned in
     that window is LOST, not queued** (the client is fail-soft with no durable queue).
   - ⇒ **Be honest about what this kill switch is: a UI kill switch.** Do not let it be described as
     stopping the data path.
2. **A flag flip NEVER reaches players mid-session.** Flags are fetched **once per page load and
   memoized by design**. **Next launch only.** Not a bug; do not "fix" it.
3. **`src/client/Transport.ts:407` `maybeRefreshYandexIdentity()` is UNGATED** and keeps feeding the
   server-side path. Out of scope here; recorded so it is not mistaken for a miss.
4. **The dev bypass at `FlashistFacade.ts:852`** — `checkExperimentFlag` returns `true` outright when
   `process.env.GAME_ENV === "dev"`. ⇒ 🔴 **The owner CANNOT exercise the kill switch on local
   `npm run dev`.** ⚠️ **Not a production risk:** `DefinePlugin` substitutes `GAME_ENV` from the
   webpack mode and the `Dockerfile` builds with `build-prod`. ⚠️ **But it does mean local testing of
   the OFF state needs a production-mode build** — plan verification accordingly.
   ℹ️ Note the asymmetry: **layer 1 has no dev bypass** (`FlashistFacade.ts:181-184`), only layer 2 does.
5. **Dead code found in passing, UNRELATED to this task:** the `citizenship-login-requested` event
   (`CitizenshipCard.ts:24`, dispatched `:175`) has **no production listener** — the only listener is
   in `tests/client/CitizenshipCard.test.ts:261`. **Noted. ⛔ Do not fix it here.**

---

## Verification steps

1. **Step 0's `isCitizen` render-template pass is recorded in `worklog.md`** — what was searched, what
   was found, and explicitly "nothing new" if that is the result. ⚠️ **A task that gates three surfaces
   without doing this pass has not done the thing that closes the architect's caveat.**
2. **With layer 1 `false` (today's state), the ★ badge renders NOWHERE** — verified at all four call
   sites (host lobby, join-private lobby, leaderboard, player panel).
3. **With layer 2 flipped off, the ★ badge renders nowhere**, the **inbox is unavailable**, and the
   **payments reconciliation POST does not fire**. ⚠️ Requires a **production-mode build** — the dev
   bypass (boundary 4) makes `npm run dev` unable to show the OFF state.
4. **The flag reads go through ONE shared helper** living beside `isCitizenshipUiEnabled()` in
   `FlashistFacade.ts` — **no new module, no `State.ts`.**
5. **The pre-resolution default for the badge's sync snapshot is chosen, implemented, and STATED** in
   the worklog with its reasoning.
6. **`CitizenshipCard.ts:86-88` is UNCHANGED** — the fail-open carve-out is an owner ruling. ⚠️ A diff
   that "tidies" it has broken a ruling, not fixed a bug.
7. **`getCatalog()`, `Transport.ts:407`, the server-side `creditMatch()` path and the dead
   `citizenship-login-requested` event are all UNTOUCHED.**
8. **Tests:** `tests/client/CitizenBadge.test.ts` exists and renders the badge directly — 🚨 **gating
   inside `renderCitizenBadge()` will affect it.** Update it to cover **both** states rather than
   deleting a case. ⚠️ `src/core/` is untouched by this task, so the *"all `src/core/` changes MUST be
   tested"* rule does not bite — **but the client tests that exist must stay green.**
9. **`npm test` green.** ⚠️ Budget **~22–25 s**, not ~3 s — the shell harnesses are in `npm test` since
   `0201`. A slow run is **not** a hang.

---

## Notes

- **Effort: small — the architect estimated ~15 lines across four files.** ⚠️ **The badge's
  sync-snapshot constraint is the only part with real design in it**; everything else is a check added
  to an existing guard. **Do not let the small line count set the care level** — this is a kill switch,
  and a kill switch that half-works is worse than a known-absent one.
- **The four files: `Inbox.ts`, `PaymentsReconciliation.ts` (or `FlashistFacade.ts:978`),
  `CitizenBadge.ts`, `FlashistFacade.ts`.** Plus whatever step 0 turns up.
- ⚠️ **Both HTML templates rule does NOT apply here** — this task adds **no new custom element and no
  new HTML element**; `CitizenBadge.ts` deliberately renders text into existing light-DOM components
  precisely so neither template needs updating. **Do not edit `index.html` or
  `yandex-games_iframe.html`.**
- ⚠️ **No user-visible STRINGS are added by this task** (it only removes rendering), so the
  `en.json`/`ru.json` sync rule is not triggered. **If your implementation does add a string, that rule
  applies in full.**
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- **Never commit or push unless the owner explicitly asks.** "Implement" authorizes writing code, not
  committing.
- 🔒 **No secrets in any artifact** — flag names, file names and constant names only.
