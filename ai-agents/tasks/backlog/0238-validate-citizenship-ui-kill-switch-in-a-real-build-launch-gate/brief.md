# Verify the citizenship UI kill switch AT LAUNCH — flip it, watch the surfaces go

> 🔴 **TITLE CORRECTED 2026-09-21.** Struck, not deleted:
> ~~*"🚨 LAUNCH GATE — validate the citizenship kill switch's REMOTE half in a staging or prod build,
> before the flag flips"*~~ — **it is no longer a pre-launch gate.** See *"RE-SCOPED 2026-09-21"*
> immediately below, and read it before anything else in this file.

## ID
0238

## Sprint
Sprint 4

⚠️ **The field above is the bare token `Sprint 4` on purpose** — `dashboard.sh`'s drift rule compares
it against the board's identity, and a decorated value is reported as drift. **Do not decorate it.**

## 🔴 RE-SCOPED 2026-09-21 — THE GATE IS DROPPED. VERIFY AT LAUNCH.

**AUTHORITY.** An **OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on
2026-09-21**, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel. ⛔ **Not
producer precedent.** ⛔ **No mover skill invoked; the `## Status` token, the board and the rank are
unchanged.** The owner, verbatim:

> *"Tbh, it looks like we are overfocused on the enable/disable flags, while we only need it to quickly
> switch the feature on/off, it should be a boolean thing, that's it. Are you sure we need to continue
> all those checks?"*

**The ruling.** The kill switch is **a boolean whose job is hiding a broken UI.** It gets verified
**at launch** — flip it, watch the surfaces go. ⛔ **No pre-launch gate. No three-way split. No further
probes.**

**🚨 THREE THINGS ARE STRUCK BY THIS RULING — struck, not deleted, and named so the record shows which
ruling replaced which:**

1. ~~**The GATE framing** (owner ruling 2026-09-10, recorded throughout this file): *"This is a GATE.
   Its entire value is that it must be CLOSED before `CITIZENSHIP_CARD_ENABLED` is flipped to `true`.
   ⛔ Do not read the `—` in its Priority cell as 'can be skipped', and do not flip the launch flag
   while this is open."*~~ → **REPLACED BY the 2026-09-21 ruling above.** The launch flag may be
   flipped with this task open; this task is *how the flip is observed*, not a precondition of it.
2. ~~**The 2026-09-20 ruling to split `0238` three ways.**~~ → **REPLACED BY the 2026-09-21 ruling
   above.** ⚠️ That split was ruled in session and never landed in this repository, so there is no
   struck text here to point at — it is recorded as struck for the record.
3. ~~**The `fkit-architect`'s recommendation to split this task.**~~ → **REPLACED BY the 2026-09-21
   ruling above.** Same: a session artefact, recorded as struck.

⚠️ **Everything below this section is KEPT AS HISTORY.** Its code findings are still individually true
(the `&&` short-circuit, the dev-`GAME_ENV` bypass, the absent Yandex draft). ⛔ **But its `What to
build` and `Verification steps` are superseded** — see the two supersede notes in those sections.

### What this task is now

At the citizenship launch, when `flashistConstants.features.CITIZENSHIP_CARD_ENABLED` is flipped to
`true` in a production build:

1. Flip the `citizenship_ui` Yandex console flag **off**.
2. Start a **fresh** session and confirm the surfaces are gone.
3. Write the result in `worklog.md`. That is the whole task.

⚠️ **Flags are fetched once per page load and memoized by design — a flip never reaches a live
session.** Use a new session; that is not a defect.

### What the switch covers — one sentence, so nobody over-trusts it in an incident

**The `citizenship_ui` flag hides four client surfaces — the citizenship card, the ★ citizen badge,
the inbox, and the payments-reconciliation POST — except the card under a degraded Yandex SDK (see
[`0291`](../../done/0291-make-the-citizenship-card-fail-closed-when-the-yandex-sdk-is-degraded/brief.md)), and
it does NOT stop the server crediting XP.**

⛔ **It is therefore NOT a legal or moderation takedown mechanism.** On the owner's ruled scope — *hide
a broken UI* — what exists is **adequate**.

### One source change was split out, and it is NOT part of this task

🚩 [`0291`](../../done/0291-make-the-citizenship-card-fail-closed-when-the-yandex-sdk-is-degraded/brief.md) —
**make `CitizenshipCard.ts` fail CLOSED before launch**, matching the other three surfaces. Owner-ruled
2026-09-21. ⛔ **Do not do it here; this task writes no source.**

### What the 2026-09-21 devtools probe established — kept short

Two owner-run devtools readings against the **live production bundle inside the Yandex Games shell**,
2026-09-21:

- ✅ The facade is reachable on `window`; `isCitizenshipUiEnabled()` is publicly callable and does
  **not** pass through layer 1 (`CITIZENSHIP_CARD_ENABLED`).
- ✅ **The `GAME_ENV === "dev"` bypass did not fire** — it returned `false`, and the bypass returns
  `true` unconditionally. **Self-verifying: this was a genuine prod bundle.**
- ⛔ **Flag delivery was NOT established.** `yandexExperimentFlags` was `undefined` and all four flags
  (`citizenship_ui`, `email_subscribe_button`, `telegram_link`, `vk_link`) read `false`, on a session
  that was **degraded**. ⚠️ The reading was taken **before** an `await` that may itself have re-fetched,
  so it is **inconclusive, not a negative result.** ⛔ **Do not record flag delivery as broken.**
- ⚠️ Owner-attested environment: signed in, page needed one reload, VPN status unstated.

➡️ **PROMOTED FROM THE BACKLOG BOARD TO SPRINT 4 on 2026-09-10, on an OWNER RULING given live in
session and relayed through the spawning session.** **Authority before outcome: this is an OWNER
RULING, not a producer re-rank, and it is NOT producer precedent for moving anything else between
boards.** The owner accepted the producer's recorded recommendation **on its own reasoning** — *a gate
invisible on the sprint board is how a gate gets skipped, and this one gates Sprint 4's own
citizenship launch.*

⚠️ **THE OWNER RULED THE BOARD, NOT THE RANK.** ⛔ **Moving boards does not make this ranked.** Its
Sprint 4 Priority cell is `—`, and a spawned producer does not rank the owner's board.

🔒 **ADR-035: the row was APPENDED at the bottom of
[`plan-sprint-4.md`](../../../sprints/plan-sprint-4.md)** — no row moved, nothing was renumbered, and
no closed row was touched. **Bottom-of-board means *"added last"*, and nothing more.** The original
[`backlog.md`](../../../sprints/backlog.md) row is **kept, not deleted**, and now reads
`➡️ Moved to [Sprint 4](plan-sprint-4.md) — priority: unranked`.

📎 *ADR-035 is cited by name and never linked, on purpose — it is one of fkit's own upstream `adr-0XX`
decisions, not a file in this repository's `ai-agents/knowledge-base/decisions/` (which numbers from
`adr-101`). There is nothing here to link to.*

## Priority
**Unranked** — scheduled onto Sprint 4 by owner ruling (2026-09-10), but **no rank was ruled**, and a
spawned producer does not rank the owner's board. The Sprint 4 Priority cell reads `—` to match.
⚠️ **Unranked ≠ low. See the gate banner above.**

## Status
🔲 Backlog

## Owner
fkit-coder

## Depends on

> 🔴 **CORRECTED 2026-09-20 — THIS SECTION SAID *"NOTHING in this repository"* AND THAT WAS WRONG IN A
> WAY THAT WOULD HAVE MADE THE WHOLE TEST VACUOUS.** Struck, not deleted, so the error is visible:
> ~~*"✅ **NOTHING in this repository.** It needs **a staging or production build and access to the
> Yandex console** — not code, not the profile box."*~~
>
> **AUTHORITY.** An **OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on
> 2026-09-20** — *prep `0238` so that when I run it, it actually tests something* — relayed by
> `fkit-lead` to a spawned `fkit-producer` with no owner channel of its own. ⛔ **Not producer
> precedent.** ⛔ **The `## Status` token, the board and the rank are UNCHANGED. This makes the gate
> testable; it does NOT schedule it.**

**1. 🚨 A ONE-LINE LOCAL BUILD CHANGE IS MANDATORY — without it this task tests NOTHING.** The build
under test must have
**`flashistConstants.features.CITIZENSHIP_CARD_ENABLED` flipped to `true`** (`src/client/flashist/FlashistFacade.ts`,
in the `features` block — find it by name, not by line). **See *"The vacuous-pass trap"* below for
why.** ⛔ **Staging build only. NEVER committed. NEVER in a production build.** It is a throwaway edit
in the working tree of the machine that builds the staging image, reverted after.

**2. [`0014`](../0014-yandex-catalog-registration/brief.md)'s console work precedes this.** You cannot
flip a flag that does not exist, and the **`citizenship_ui` experiment flag must be created in the
Yandex console** first. `0014`'s open verification item 3 was **NOT DONE** as of the owner's answer of
**2026-09-12**. ⚠️ **Check its current state before scheduling this** — ⛔ *this task did not edit
`0014`.*
✅ **UPDATE 2026-09-21 — SATISFIED as far as this gate is concerned: the owner has created the
`citizenship_ui` flag in the Yandex console and set it to `enabled`. See item 3d below for the
authority and its limits (owner-attested, not repo-verifiable).**

**3. 🔴 CORRECTED 2026-09-21 — THERE IS NO YANDEX DRAFT / DEV VERSION, AND NONE CAN BE MADE. THE
STAGING PATH THE 2026-09-20 ENTRY ASSUMED DOES NOT EXIST.**

⛔ **Struck, not deleted, so the wrong record stays visible:**
~~*"✅ **ANSWERED 2026-09-20 — A YANDEX GAMES DRAFT / DEV VERSION WILL SERVE THE STAGING BUILD.** …
The owner chose **option A**: a draft / dev version **exists, or they will create one.** … ✅ **`0238`
is RUNNABLE** on a `./deploy.sh staging` (or `dev`) box served through that draft, off the production
game deploy's critical path."*~~

**AUTHORITY FOR THE CORRECTION.** An **OWNER CORRECTION given live in the `fkit lead` session on
2026-09-21**, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel of its own.
⛔ **Not producer precedent.** The owner, verbatim:

> *"We can't use Yandex drafts, because our game is embedded via iframe, and it doesn't have drafts.
> We also can't do deploy of the game server. The best thing we can do is to test it locally, I think,
> or on the dev server. If we want to emulate the flag `citizenship_ui`, then we probably need to
> hardcode that it's enabled, and it's good (I will take care of real life testing during the next
> deploy)."*

🚩 **ROOT CAUSE — THE QUESTION WAS MALFORMED, NOT THE ANSWER.** ⛔ **Do not read this as the owner
changing their mind.** On 2026-09-20 `fkit-lead` offered three options — *a draft exists / no draft /
run against live* — and **none of them described the true state of the world**: Yandex Games drafts do
**not exist at all** for an **iframe-embedded** game, so *"or I'll make one"* was never an available
action. The owner answered **in good faith against options that did not fit reality**, and the
producer recorded that answer faithfully. **The defect was in the question.**

**The real constraint, as it now stands:**
- ⛔ **No Yandex Games draft / dev version exists for this game, and none can be created** — iframe
  embedding, owner-attested 2026-09-21. This is a **platform fact**, not a scheduling problem.
- ⛔ **No game-server deploy is available for this purpose** (owner, same correction).
- ⇒ 🔴 **The `./deploy.sh staging` → served-through-a-draft path recorded on 2026-09-20 is not
  available.** The `Dockerfile` / `build-prod` / `GAME_ENV` findings below are **still individually
  true** — a staging image really does build with `GAME_ENV === "prod"` — but **being a prod-mode
  bundle is not sufficient**: the bundle must **also** be served **inside the Yandex Games shell** for
  the SDK to deliver any flags, and there is now **no shell to serve it through** short of the live
  version.
- ⛔ **The 2026-09-20 rejection of "run against live" is UNCHANGED and is not reopened here** — it
  would mean a production deploy carrying the staging-only local flip, i.e. *shipping the launch to
  prove the kill switch.*

**Why the shell matters, kept because the reasoning is still live:** experiment flags come from the
**Yandex SDK**, which serves them to a game **inside the Yandex Games shell**. A build sitting on our
own VPS, opened directly, gets **no flags at all** — and "no flags" is indistinguishable from
"flag OFF", a **second way this gate can pass for the wrong reason**. Verification step **1c** exists
for exactly this and is **deliberately left intact**; ⚠️ it matters **more** now, not less.

**3a. 🚨 THE CRUX — VERIFIED IN CODE 2026-09-21, AND I DO NOT BELIEVE IT WAS WRITTEN DOWN ANYWHERE
BEFORE.** In `src/client/flashist/FlashistFacade.ts` (find by symbol, not line):

- `isCitizenshipSurfacesEnabled()` returns
  `flashistConstants.features.CITIZENSHIP_CARD_ENABLED && (await this.isCitizenshipUiEnabled())`.
- `flashistConstants.features.CITIZENSHIP_CARD_ENABLED` is **`false`** at `HEAD`.
- `&&` **short-circuits**.

⇒ 🔴 **While layer 1 is `false`, the remote `citizenship_ui` flag is NEVER READ — on ANY build,
PRODUCTION INCLUDED.** This is not a staging quirk. It means **the gate cannot be discharged at the
next production deploy either**, unless that deploy ships `CITIZENSHIP_CARD_ENABLED = true` —
**and that flip IS the launch**, which is the exact thing this gate exists to precede.

⛔ **Stated as the constraint it is. No fix is proposed here** — what, if anything, can discharge this
gate is **not settled in this brief**; an `fkit-architect` consult was running on that question as this
correction was written, and the ruling is the **owner's**.

**3b. 📌 THE OWNER'S STATED PLAN — RECORDED AS A PLAN, NOT AS THE GATE BEING SATISFIED.** The owner
said *"I will take care of real life testing during the next deploy."* ⚠️ **That is their intent, and
it is recorded as such.** ⛔ **It does not close this gate, does not make it satisfied, and does not
count as evidence** — see **3a** for why a production deploy does not by itself exercise the remote
flag, and verification step **5** for what a closing verdict must contain.

**3c. ⚠️ A LOCAL HARDCODED-FLAG RUN DOES NOT DISCHARGE THIS GATE.** The owner suggested hardcoding
`citizenship_ui` as enabled and testing locally or on the dev server. **Two independent reasons that
is not `0238` evidence:**
1. **`checkExperimentFlag()` returns `true` UNCONDITIONALLY when `process.env.GAME_ENV === "dev"`**
   (verified in code 2026-09-21). A local run therefore **never exercises the remote path at all** —
   the flag is hard-wired ON before any SDK call happens.
2. **Hardcoding the flag tests our own hardcode, not Yandex's delivery.** The thing under test is
   whether **a real console flip reaches a real player**. A constant cannot stand in for that.

✅ **The owner has been told both of these and accepted them.** They asked for such a run to be
recorded as **surface evidence for [`0236`](../../done/0236-client-kill-switch-for-citizenship-surfaces/brief.md)**
— i.e. that the surfaces render and hide correctly — ⛔ **explicitly NOT as `0238` evidence.**

**3d. ✅ ONE PRECONDITION GENUINELY SATISFIED — the `citizenship_ui` flag now EXISTS.** Owner,
2026-09-21: the **`citizenship_ui` experiment flag has been created in the Yandex console and set to
`enabled`.** That was `0014`'s open verification item 3 **as it bears on this gate**, and item **2**
above is satisfied to that extent. ⚠️ **OWNER-ATTESTED, NOT REPO-VERIFIABLE** — it is a console fact,
and nothing in this repository can confirm it. ⛔ **Recorded here ONLY as far as it concerns `0238`;
this task did NOT edit `0014`** — another agent's corrections are live in that file and any `0014`
update is routed separately.

**4. Still true, and worth keeping:** it needs **no profile box**, **no citizen rows**, and — per the
finding below — **no production game deploy**.

🔴 **EXPLICITLY INDEPENDENT OF [`0217`](../0217-profile-p2-wire-game-server-to-profile-box/brief.md)
AND OF CITIZEN ROWS EXISTING.** ⛔ **Do NOT fold this into `0217` as a sub-step.** It is a **different
blocker with a different cause**: `0217` is about the game server being wired to the profile box;
this is about **a dev-build bypass that makes the remote flag untestable locally**. The coder who
shipped [`0236`](../../done/0236-client-kill-switch-for-citizenship-surfaces/brief.md) specifically
flagged keeping the two distinct. **Neither `0236` nor `0217` discharges this task.**

---

## Context

### What this is a gate on

[`0236`](../../done/0236-client-kill-switch-for-citizenship-surfaces/brief.md) shipped a **client-side
kill switch for the citizenship surfaces**, built on **two layers**:

| Layer | What it is | State today |
|---|---|---|
| **1 — local, compile-time** | `flashistConstants.features.CITIZENSHIP_CARD_ENABLED` | **`false`.** 🔴 **Flipping it to `true` IS the launch.** |
| **2 — remote, runtime** | the `"citizenship_ui"` Yandex experiment flag | Wired. **This is the fast kill switch — flippable from the Yandex console with NO deploy.** |

**Layer 2 is the half that matters in an incident**, because it is the only one that does not need a
deploy. **It has never been exercised for real.**

### 🚨 Why it CANNOT be done earlier, or anywhere else — say this before someone tries

**`checkExperimentFlag()` returns `true` unconditionally when the client bundle's `GAME_ENV` is
`"dev"`.** And the client's `GAME_ENV` comes from the **webpack mode**, ✅ verified at `HEAD` =
`4c981e5`:

- `webpack.config.js:334` — `"process.env.GAME_ENV": JSON.stringify(isProduction ? "prod" : "dev")`.
- ⚠️ **NOT** from the `cross-env GAME_ENV=dev` in the npm scripts — **that only sets it for the Node
  server**, not for the browser bundle.

⇒ 🔴 **`npm run dev` can NEVER exercise the remote half of this switch. Layer 2 is hard-wired ON in
every dev build.** A **`build-prod` / staging build is the ONLY place this is testable**, and **no
automated test substitutes** — the unit tests prove composition and wiring, not that a real console
flip reaches a real player.

⚠️ *Line numbers are anchors at `4c981e5`, not addresses — re-derive by content, per*
[`conventions/file-line-citations.md`](../../../knowledge-base/conventions/file-line-citations.md).

### ~~✅ STAGING IS SUFFICIENT — this gate is NOT on the production deploy's critical path~~ 🔴 CONCLUSION WITHDRAWN 2026-09-21

> 🔴 **THE HEADING ABOVE IS STRUCK. Its four bullets are STILL INDIVIDUALLY TRUE and are kept for
> that reason — but the conclusion they were used to reach is NOT.** A staging image really does build
> a bundle whose `GAME_ENV` is `"prod"`, so the dev bypass really does not fire there. ⛔ **That is
> necessary and NOT sufficient:** the bundle must **also** be served **inside the Yandex Games shell**
> for the SDK to deliver any flags, and per the owner's correction of **2026-09-21** there is **no
> draft / dev version to serve it through, and none can be created** (iframe embedding). 🚨 **And per
> `## Depends on` item 3a, `&&` short-circuiting means the remote flag is never read on ANY build
> while `CITIZENSHIP_CARD_ENABLED` is `false` — so "which build" was never the only obstacle.**
> **Read `## Depends on` item 3 before acting on anything in this section.**

**Added 2026-09-20; every step verified in the tree that day.** This brief argued a *"prod or staging"*
build is required but never said the useful half — **staging alone is enough**:

- `Dockerfile` runs **`npm run build-prod` unconditionally** — the image build does not read the
  deploy target.
- `build-prod` is **`webpack --config webpack.config.js --mode production`** (`package.json`).
- `webpack.config.js` defines the **browser bundle's** `process.env.GAME_ENV` as
  `isProduction ? "prod" : "dev"`.
- `deploy.sh` accepts **`dev | staging | prod`** as its environment argument.

⇒ 🔴 **A `./deploy.sh staging` (or even `dev`) box already serves a bundle whose `GAME_ENV` is
`"prod"`, so `checkExperimentFlag()`'s dev bypass does NOT fire there.** ~~**No production game deploy
is needed to discharge this gate**, and it therefore does not have to sit on a production-deploy
window.~~ 🔴 **THAT SECOND SENTENCE IS WITHDRAWN 2026-09-21 — struck, not deleted.** The dev-bypass
fact stands; the "therefore runnable on staging" inference does not, because there is no Yandex Games
shell to serve the staging bundle through (owner correction, `## Depends on` item 3), and because the
remote flag is not read at all while layer 1 is `false` (item 3a). ⛔ **Nor does it follow that a
production deploy WOULD discharge the gate — per item 3a it would not, unless it shipped
`CITIZENSHIP_CARD_ENABLED = true`, which is the launch.**

⚠️ *Read this as "which build", not "which environment is safe to break": a staging box is still a
real deploy — coordinate it like one.*

### 🚨 The vacuous-pass trap — the reason this brief was amended

**`CITIZENSHIP_CARD_ENABLED` is `false` at HEAD, and `&&` short-circuits.** In
`src/client/flashist/FlashistFacade.ts`:

`isCitizenshipSurfacesEnabled()` returns
`flashistConstants.features.CITIZENSHIP_CARD_ENABLED && (await this.isCitizenshipUiEnabled())` — and
its own comment says so: *"while the local launch flag is false this never reads the remote flag at
all."*

⇒ **On a stock build the `citizenship_ui` flag is NEVER READ.** Consequences, and they are the whole
point:

| `0238` item | What actually happens on a stock build |
|---|---|
| **1 — flag ON ⇒ all three surfaces behave normally** | 🔴 **UNACHIEVABLE.** Layer 1 is `false`, so nothing renders regardless of the console. |
| **2 — flag OFF ⇒ nothing renders** | 🔴 **PASSES FOR THE WRONG REASON** — nothing renders because of the *local* flag, and the remote half is never exercised. |
| **3 — propagation delay** | 🔴 **UNMEASURABLE** — there is no observable change to time. |

**This is exactly the trap this brief already names for the ★ badge — it just applies to ALL THREE
SURFACES, not only the badge.** ⛔ **A run that records "flag OFF, nothing rendered ✅" without the
local flag flipped is not evidence of anything, and must not close this gate.**

**Where each surface reads the gate** (verified 2026-09-20 — find by symbol, not line):

| Surface | Call | Note |
|---|---|---|
| ★ citizen badge | `isCitizenshipSurfacesEnabledSync()` | sync snapshot of the same combined read; **still UNVERIFIED for the separate `isCitizen` reason below** |
| Inbox (`src/client/Inbox.ts`) | `await …isCitizenshipSurfacesEnabled()` | **becomes observable once layer 1 is flipped** |
| Payments reconciliation (`src/client/PaymentsReconciliation.ts`) | `await …isCitizenshipSurfacesEnabled()` | observable as **fired vs not fired** — ⚠️ so the profile box's payments state does **not** block this observation |
| Citizenship card (`src/client/CitizenshipCard.ts`) | checks `CITIZENSHIP_CARD_ENABLED` **first and absolutely**, then `isCitizenshipUiEnabled()` (with the ruled-on degraded-SDK fail-open) | a fourth surface, gated the same way — **also invisible until layer 1 is flipped** |

⚠️ **The ★ badge half stays UNVERIFIED even after the flip**, for the unrelated reason this brief
already records: `isCitizen` comes from game state and there are **zero citizen rows**, so it cannot
be `true` in either state. **That limitation is unchanged by this amendment** — the flip fixes the
*flag* problem, not the *data* problem.

### 🚨 What goes wrong if this is skipped — the whole reason it is a gate

**The first time anyone discovers the remote kill switch does not work is the moment they need it:
during a live incident, with a feature they cannot turn off.**

That is **the entire reason the kill switch was built.** A switch nobody has ever thrown is not a
safety mechanism; it is a belief about one. Skipping this gate does not save the work — it moves the
work to the worst possible moment and adds an outage to it.

### The owner's attestation, and exactly what it does and does not settle

📌 **Owner-attested, 2026-09-10:** Yandex experiment flags **support 100 % rollout and work** — based
on the owner's experience with **other games**.

⚠️ **THAT IS OWNER-ATTESTED, NOT REPO-VERIFIED, AND IT DOES NOT DISCHARGE THIS TASK.** It makes the
**mechanism plausible**; it does not make **this project's wiring proven**. ⛔ Do not restate it as a
confirmed platform capability, and do not use it to argue the gate away.

---

## What to build

> 🔴 **SUPERSEDED 2026-09-21 by the owner ruling at the top of this file — kept as history, struck as
> instructions.** ⛔ **The staging-build procedure, the throwaway `CITIZENSHIP_CARD_ENABLED` flip and
> the three-item probe below are NOT to be performed.** Do *"What this task is now"* instead: at
> launch, flip the console flag off, open a fresh session, confirm the surfaces are gone, write it down.

**Nothing to ship. This is a verification task, not an implementation task.** ⛔ **If it starts
changing source beyond the one throwaway line below, stop — that is a different task.** The
deliverable is **observed evidence, written down.**

> 🚨 **PRECONDITION — ONE THROWAWAY LINE, AND THE TEST IS MEANINGLESS WITHOUT IT (added 2026-09-20).**
> In the **staging build's working tree only**, set
> **`flashistConstants.features.CITIZENSHIP_CARD_ENABLED = true`** in
> `src/client/flashist/FlashistFacade.ts`, build, deploy to staging, and **revert the line afterwards.**
> ⛔ **NEVER commit it. NEVER build production with it.** Flipping it in a *production* build **is the
> citizenship launch** — which is the very thing this gate exists to precede.
> **Why:** `&&` short-circuits, so with the flag `false` the remote `citizenship_ui` flag is **never
> read** and all three items below pass or fail for the wrong reason. See *"The vacuous-pass trap"*
> above.
> ⚠️ **Record in the worklog that the flip was applied, and that it was reverted** — an unreverted
> flip on a shared machine is a launch nobody decided to make.

Then perform all three, in a **staging or production build** (⛔ **not `npm run dev`**; ~~**staging is
sufficient**~~ 🔴 **that clause is WITHDRAWN 2026-09-21 — a prod-mode bundle is necessary but NOT
sufficient; read `## Depends on` item 3 and 3a before attempting any of this. HOW this gate can be
discharged at all is currently UNSETTLED and is the owner's ruling to make** — see the finding above):

1. **Flag ON.** With the `citizenship_ui` flag on: the **four ★ badge call sites**, the **inbox**, and
   the **payments reconciliation POST** all behave normally.
2. **Flag OFF**, flipped **in the Yandex console**: the **★ renders NOWHERE**, the **inbox is
   unavailable**, and the **reconcile POST does not fire**.
3. **Propagation delay OBSERVED AND WRITTEN DOWN** — the actual time between the console flip and a
   fresh session seeing it. ⚠️ **This is the item that turns the owner's attestation into a measured
   fact**, and it is the one most likely to be skipped because it is the least satisfying.

⚠️ **Known and NOT a finding: a flag flip NEVER reaches a live session.** Flags are fetched once per
page load and memoized **by design** — **next launch only**. Measure the delay for a **new** session;
do not report the memoization as a defect.

⚠️ **The ★ badge may be unobservable when you run this, and that is a REAL limitation, not a pass.**
Its `isCitizen` comes from **game state**, so with **zero citizen rows** it cannot be `true` and the
badge **cannot be made to render in either state**. If that is still true on the day: **say so
explicitly and mark item 1's badge half UNVERIFIED.** ⛔ **Do not record "the badge did not render" as
evidence the switch hid it** — it did not render because it could not.

---

## Verification steps

> 🔴 **SUPERSEDED 2026-09-21 by the owner ruling at the top of this file — kept as history, struck as
> instructions.** **What closes this task now:** the console flag was flipped off at launch, a fresh
> session was opened, and `worklog.md` records **what was actually observed** on each surface (any
> surface that could not be observed marked **UNVERIFIED with its reason**). ⛔ **Steps 1b, 1c and 3
> (the staging flip, the Yandex-draft requirement and the measured propagation delay) are NOT required
> — the owner dropped them.**

1. **The build used is named** — which build, which mode, and evidence it was **not** a dev build
   (e.g. that `GAME_ENV` resolved to `prod`).
1b. 🚨 **The local-flag flip is recorded** (added 2026-09-20): evidence that
   `CITIZENSHIP_CARD_ENABLED` was **`true` in the build under test**, and that the change was
   **reverted and never committed**. ⛔ **Without this, items 1–3 below carry no information and this
   task does NOT close** — see *"The vacuous-pass trap"*.
1c. **The flag source is named**: that the build was served **through a Yandex Games draft / dev
   version** (so the SDK actually delivered flags), or, if it was not, ⛔ **the run is INVALID, not a
   pass** — "no flags served" looks identical to "flag OFF".
2. **Both states are recorded for each of the three surfaces**, ON and OFF, with **what was actually
   observed** — not "as expected". Any surface that could not be observed is marked **UNVERIFIED with
   its reason** (see the ★ caveat above).
3. **The propagation delay is written down as a number with the method used to obtain it.**
4. **The findings land in a durable record** — this task's `worklog.md`, and a
   `ai-agents/knowledge-base/reports/` entry if the result is surprising. ⛔ **A verbal "it worked"
   does not close this task.**
5. 🚨 **THE CLOSING VERDICT IS EXPLICIT, and it is the point of the whole task:** either
   **"the remote kill switch is PROVEN to work, and here is the delay"**, or **"it is NOT proven, and
   here is what blocked it."**
   ⛔ **If the validation cannot be performed, this task does NOT close as done. Say plainly that the
   switch is NOT KNOWN TO WORK and must not be relied on as the launch's safety mechanism — rather
   than launching behind an unverified switch.**

---

## Notes

- **Depends on:** ~~nothing~~ 🔴 **CORRECTED 2026-09-20 — see the `## Depends on` section above.** In
  short: a **one-line staging-only flip of `CITIZENSHIP_CARD_ENABLED`** (mandatory, never committed),
  **`0014`'s Yandex-console work** (the `citizenship_ui` flag must exist — ✅ **created and set to
  `enabled` by the owner 2026-09-21**, owner-attested), and ~~an **unresolved question for the owner**
  — whether a Yandex Games draft/dev version exists to serve the staging build~~
  ~~✅ **ANSWERED 2026-09-20 (owner, option A): a draft / dev version exists or will be created — so
  this gate is RUNNABLE, but ⚠️ the undertaking is prospective, so whoever runs it CONFIRMS the draft
  first (verification step 1c).**~~
  🔴 **CORRECTED 2026-09-21 — THAT ANSWER IS FALSE AND IS WITHDRAWN. There is NO Yandex draft / dev
  version for this game and none can be created (iframe embedding), and no game-server deploy is
  available for this purpose. The staging path the 2026-09-20 entry assumed DOES NOT EXIST.** 🚩 **The
  root cause was the QUESTION, not the owner's answer** — the three options offered on 2026-09-20 did
  not include the true state of the world, so *"or I'll make one"* was never available. 🚨 **And the
  crux (verified in code 2026-09-21): `&&` short-circuits, so while `CITIZENSHIP_CARD_ENABLED` is
  `false` the remote flag is never read on ANY build, production included — so the next production
  deploy does not discharge this gate either.** **Full record and authority: `## Depends on` item 3,
  3a–3d above.** ✅ Still **no profile box and no citizen rows**.
- **Blocks:** ~~the flip of `CITIZENSHIP_CARD_ENABLED` to `true` **in a production build** — i.e. **the
  citizenship launch**. ⚠️ **Not the same thing as the throwaway staging flip this task requires**;
  confusing the two is how this gate gets skipped *or* tripped.~~
  🔴 **STRUCK 2026-09-21 — this blocks NOTHING.** Per the owner ruling at the top of this file, the
  launch flip goes ahead and this task observes it. ✅ **One thing does still precede the launch, and it
  is a different task:**
  [`0291`](../../done/0291-make-the-citizenship-card-fail-closed-when-the-yandex-sdk-is-degraded/brief.md).
- **Source:** [`0236`'s brief §3](../../done/0236-client-kill-switch-for-citizenship-surfaces/brief.md),
  an **owner ruling of 2026-09-10** made from review finding **R5**. This task exists because the owner
  ruled on 2026-09-10 that the precondition **needs an owner, not a note in three places**.
- **Related, and NOT a substitute:**
  [`0237`](../0237-close-routed-out-test-residuals-from-0236-citizenship-switch/brief.md) closes
  `0236`'s routed-out **test-quality** residuals. ⛔ **`0237` does not discharge this gate**, and
  neither does any unit test — the gate is about a **real console flip**, which no test can stand in
  for.
- ~~**Known accepted limitation of the thing being validated, owner-ruled 2026-09-10 and NOT a defect:**
  `CitizenshipCard.ts`'s fail-open carve-out means the **card's** gate is bypassed when the Yandex SDK
  is degraded ⇒ **the badge fails CLOSED, the card fails OPEN.** The owner was shown this inconsistency
  and kept it. **If the card appears with the flag OFF while the SDK is degraded, that is the ruled-on
  behaviour — record it, do not file it as a failure of this gate.**~~
  🔴 **STRUCK 2026-09-21 — the acceptance is WITHDRAWN by owner ruling. The card must fail CLOSED
  before launch.** The 2026-09-10 acceptance was made **while layer 1 was `false` and the code was
  inert**; flipping layer 1 makes it live. **Now tracked as
  [`0291`](../../done/0291-make-the-citizenship-card-fail-closed-when-the-yandex-sdk-is-degraded/brief.md) —
  a source change, and not part of this task.**
- ⚠️ **This switch hides UI only. It does NOT stop server-side crediting** — deliberate, and out of
  scope here.
