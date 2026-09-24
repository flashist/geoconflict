# Deploy-time config parity guard — catch a variable that never reaches production

## ID
0064

## Sprint
Sprint 4

## Priority
Fourth on the config track: **`0063` → `0062` → `0064` → `0060`**. It is prevention, so it ranks
behind the two live defects — and it **must** follow them (see the hazard below). `0060` is
independent of all three and can run in parallel with any of them.

## Status
🔄 In progress

🔄 **Started 2026-09-02**, driven from the lead session.

✅ **OWNER RULING 2026-09-02, given live in session — the "must land first" constraint binds the
ENFORCING SWITCH, not the build.** `0062`/`0063` landing gates when this guard **arms**; it does not
gate building Phase 1. **Phase 1 report-only is startable now.** Two grounds the owner accepted:

1. This brief's own most precise formulation already says so — *"`0195` must land before this guard
   **arms**"* — in the Notes, in the bullet headed *"🔁 A THIRD instance landed 2026-08-28"*, sub-point
   **(ii)**. (Cited by quote, not by line number: this Status block shifted the line numbers below it.)
2. **Report-only exits zero, so it cannot fail a deploy** — requirement 2 in *What to build*, and
   verification step 6.

Grounding checked at the ruling: `0063` is deployed and live; `0062`'s line is in the tree at
`deploy.sh:292`.

🚫 ~~**This task CANNOT be closed this week.**~~ ⛔ **STRUCK 2026-09-22 — AN EXPIRING TIME-INDEX ONLY,
NOT DELETED: it was TRUE when written on 2026-09-02.** ⇒ ✅ **RE-STATED SO IT CANNOT GO STALE: this task
CANNOT be closed until the deploy window runs.** Verification step 8 and the Phase 2 prod-shaped checks
stay deploy-gated. Starting it is not the same as being able to finish it — do not read `In progress`
as a path to `Done` on the current deploy state.

⛔ **THE CONSTRAINT IS UNCHANGED IN FORCE — ONLY ITS DATE IS GONE. 🚨 THIS IS NOT A STATEMENT THAT
`0064` IS NOW CLOSABLE.** It remains deploy-gated exactly as before, and the window it waits on
**SLIPPED** — owner confirmation 2026-09-22, relayed by `fkit-lead` (ADR-021): **the window has NOT
happened and NO replacement date was named.** ⇒ **the gate is if anything further away, not nearer.**
De-dating ruled by the owner on **2026-09-22**, given live in the `fkit lead` session via
`AskUserQuestion` and relayed by `fkit-lead`. ⛔ **Not producer precedent.** ⛔ **`## Status` untouched;
no mover skill invoked.**

📌 **WINDOW DATED 2026-09-23 — the deploy window is Saturday 2026-09-26** (owner, verbatim: *"This
Saturday, September 26"*). OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on 2026-09-23, relayed by `fkit-lead` to a spawned `fkit-producer` (ADR-021); ⛔ not producer precedent. The 2026-09-22 *"NO replacement date"* text above is kept, not
edited — it was true when written. ⛔ **Still NOT closable before the window runs;** verification step 8
and the Phase 2 prod-shaped checks stay deploy-gated. `## Status` untouched; no mover invoked.
📌 **2026-09-23, later — SUPERSEDED as to this task by the split below (owner ruling, Sprint 4 rescope Q2 = (a)):** verification step 8 now lives in [`0298`](../0298-config-parity-guard-first-real-report-only-production-run-then-arm-enforce/brief.md), and Phase 2 is built and proved **locally** here. So this task no longer waits on the window: it closes when Phase 2 is done. The paragraph above is kept, not edited.

📌 **ARMING IS GATED ELSEWHERE — owner ruling 2026-09-02, given live in session.** The pre-arming
gate is now its own task: **[`0203-config-parity-guard-pre-arming-gate`](../0203-config-parity-guard-pre-arming-gate/brief.md)**.
The two-round stateful review CONVERGED in round 2 with the verdict *ship report-only*, and its
reportable outcome was **scheduling, not correctness**: arming `--enforce` is now **10 gate items,
not 2** (R1, R4, and the eight new round-2 findings R12–R21 — see
[`review.md`](review.md), *Carried into the pre-arming pass*). Filed as its own brief because the gate
is bigger than this task's remaining scope implies and keeping it here would turn a shippable unit
into a long-running container.

~~**What that leaves in this task:** the weekend **report-only** production run (verification step 8),
this task's own **Phase 2** scope (verification steps 2 and 3), and — **only after `0203` lands** —
**wiring `--enforce`** at the call sites (ruling R3's second half). ⚠️ **All ten of `0203`'s items land
before `--enforce` is wired. Hard sequencing.** `0203` does **not** arm the guard; this task does.~~
*(Struck 2026-09-23, not deleted. It was true until the split below.)*

✂️ **SPLIT 2026-09-23, OWNER RULINGS (Sprint 4 rescope, Q2 = (a) and Q5).** Given live in the
`fkit lead` session via `AskUserQuestion` and relayed by `fkit-lead` to a spawned `fkit-producer` with
no owner channel (ADR-021). ⛔ **Not producer precedent.** The owner's rule for the rescope: Sprint 4
keeps only locally buildable work, and a mixed task is split.

- **What this task holds now: Phase 2 only (items 5–7), in Sprint 4.** Phase 2 can be built and tested
  locally. That means verification steps 2 and 3, the non-empty half of step 1, and the enforcing half
  of step 6 shown on fixtures (steps 4, 5 and 7 stay regression checks).
- **Moved to a new Sprint 5 task,
  [`0298`](../0298-config-parity-guard-first-real-report-only-production-run-then-arm-enforce/brief.md):**
  verification step 8 (the first real report-only production run, runbook W12) and **arming `--enforce`**
  at both call sites.
- 🚩 **This supersedes ruling R3's 2026-09-02 wording** in [`plan.md`](plan.md): *"wiring enforcing is a
  follow-up step **within this same task** — not a new task"*. The rest of R3 still stands in `0298`:
  build first, arm only after a real report-only run has been read.
  ⚠️ **All of `0203`'s items still land before `--enforce` is wired. Hard sequencing, now owned by
  `0298`.**
- ✅ **Q5, the Phase 2 format list, is APPROVED AS PROPOSED:** item 6's list is **exactly**
  `PUBLIC_PROTOCOL`, `API_BASE_URL`, `JWT_ISSUER`, `PROFILE_API_URL`, which must be `https` and must not
  be a bare IP, in the prod environment. **Nothing else.** This settles item 6's *"to be confirmed with
  the owner"*.
- 🚩 **If Phase 2 lands after the Saturday 2026-09-26 window,** its checks are not in step 8's run, and
  they need one more report-only real deploy before `0298` enforces them.
- 🚨 **Sprint 4 closes AT THE DEPLOY** (owner ruling, Q7 = (b)). Whatever of Phase 2 is unfinished then
  rolls to Sprint 5 via `/fkit-sprint-done`. **Phase 2 work in progress must sit on a branch, out of
  the working tree, at runbook W12**, because `./build-deploy.sh prod` commits and ships the tree as it
  stands.

## Owner
fkit-coder

## Context

The 2026-08-22 outage sweep turned up four loose ends (§9 of the incident record). Three of them —
`0061`, `0062`, `0063` — turned out to be **the same defect class**:

> **Production configuration does not match what the application needs, and nothing says so.**

Each failed silently, in a different way:

| Task | The gap | How it stayed hidden |
|---|---|---|
| `0062` | `PROFILE_INTERNAL_TOKEN` defined in `.env.prod`, **never forwarded** by `deploy.sh`'s remote heredoc | Fail-soft no-op; the miss logged at **`debug`** (`ProfileApiClient.ts:140`) |
| `0061` | `TELEGRAM_PROXY_URL` *is* forwarded (`deploy.sh:308`), but delivery still fails — a forwarded-but-empty value is the leading suspect | Error caught, logged, request returns success to the player |
| `0063` | `PUBLIC_PROTOCOL` / `API_BASE_URL` / `JWT_ISSUER` forwarded, but carrying **`http` on a raw IP** on an `https` site | The user-facing error is **commented out** (`TokenLoginModal.ts:73`); only `console.error` |

`0062` **switched off an entire subsystem** — no profile row created, no XP credited — for an unknown
length of time, and blocks both `0017` and `0018`. Nobody noticed until an unrelated outage
investigation went looking.

**Nothing in the deploy checks that a variable the application reads is actually forwarded, or that
its value is usable.** That is the gap this task closes. The owner ruled on 2026-08-23 that it becomes
its own task rather than a recommendation buried inside `0062`.

---

## 🚨 HAZARD — a guard that fails a deploy can block ALL deploys. Read before scoping.

This is the same shape as `0056`'s fork-loop risk: the fix arms a mechanism that has never run before,
and the first thing it will find is a pile of pre-existing problems.

- **If this lands before `0062` and `0063` are fixed, it will fail the very next deploy** — correctly,
  on gaps we already know about. That is a hard blocker on shipping anything, including the fixes.
- **There are almost certainly gaps we have not found.** Three were found by accident in one sweep;
  assume more. A guard that goes straight to enforcing will surface them all at once, at the worst
  possible moment — mid-deploy.

**Therefore, two requirements, both mandatory:**

1. **This task ships only after `0062` and `0063` have landed.** Hard sequencing, recorded in Notes.
2. **Warn first, enforce second.** The guard must land in a **report-only mode** that prints findings
   and exits zero, run against at least one real deploy, and only be switched to failing the deploy
   once its output is clean and understood. **Do not ship straight to enforcing.** If you believe the
   two can land together, say why and get agreement first — do not decide it alone mid-implementation.

---

## What to build

**Scope: `deploy.sh` and whatever small checker it calls. No application code.**

Two phases with a deliberate seam. **Phase 1 is independently shippable and needs no decision from
anyone.** Phase 2 needs an owner-approved list. If Phase 2 stalls, Phase 1 still ships and still
catches `0062`'s exact defect.

### Phase 1 — Parity: every variable the app reads is actually forwarded

The mechanical core, and the highest value per line.

1. **Enumerate what the application reads.** Every `process.env.X` across `src/`. This is a grep, and
   it should be generated, not hand-maintained — a hand-written list is the same class of thing that
   drifted in the first place.
2. **Enumerate what the deploy forwards** — the keys in `deploy.sh`'s remote env heredoc
   (`deploy.sh:279-308`).
3. **Report the difference, both directions.** Read-but-not-forwarded is the `0062` defect. Also report
   forwarded-but-never-read: it is harmless at runtime but is dead config that misleads the next
   reader.
4. **Handle the legitimately-optional case.** Not every variable is required in every environment —
   `TELEGRAM_PROXY_URL` may be genuinely absent, and dev is not prod. The guard needs a way to mark a
   variable optional **explicitly and visibly**, so that "optional" is a recorded decision rather than
   an unnoticed gap. An in-repo allowlist with a one-line reason per entry is the obvious shape;
   whatever you choose, an unlisted variable must be treated as **required**, not ignored.

### Phase 2 — Presence and shape of the values

Requires an owner-approved list. **Keep it bounded and enumerated — this must not become a general
config-schema framework.** That is the failure mode to avoid: a validation layer nobody maintains,
which drifts, and which is then the thing lying to us.

5. **Non-empty check for required variables.** The heredoc substitutes whatever the deploying shell
   has, so a variable that *is* forwarded but unset locally arrives as an empty string. That is the
   leading suspect in `0061` and would not be caught by Phase 1 at all.

   ⚠️ **A DELIBERATELY-BLANK value exists today, and a naive non-empty check would fight it — recorded
   2026-09-04, a design input for this item, not a defect report.** `PROFILE_INTERNAL_TOKEN` is
   forwarded correctly (`deploy.sh:312`, `0062`'s fix), but **the owner intentionally blanks its value
   before a prod release** to keep the citizenship logic switched off until citizenship is ready and
   the outstanding profile VPS setup work is done. So "forwarded but empty" is, for that one variable,
   an *intended* state right now. **Whatever list this item ends up enforcing must distinguish
   "required non-empty" from "deliberately blank for now", or it will fail exactly the deploys the
   owner means to make.** See `0062`'s brief for the full record.

   🚩 **The mirror risk, and it is the more dangerous one — for whoever runs the next production
   deploy.** The local `.env.prod` currently holds a **non-empty** value for `PROFILE_INTERNAL_TOKEN`
   (restored since the 2026-08-29 deploy). The heredoc forwards whatever the deploying shell has, so a
   deploy run as things stand would push a real token and **silently re-enable profile upsert and
   match-XP crediting in production**, ahead of citizenship go-live. **Blanking it is a manual step
   with no automated guard.** ⚠️ **`npm run check:config-parity` does NOT catch this** — Phase 1
   compares variable **names only** (`scripts/check-config-parity.mjs`: it "never opens a `.env` file,
   never reads the process environment"), and this variable *is* forwarded correctly, so there is
   nothing for it to report. Catching a value that is present when it should be blank is a **Phase 2**
   concern and does not exist yet. `0054`'s client flag hides the citizenship *card*, not the
   server-side crediting.
6. **A small, explicit list of format assertions** — not general well-formedness. Proposed starting
   set, to be confirmed with the owner, deliberately narrow:
   - URL-shaped variables (`PUBLIC_PROTOCOL`, `API_BASE_URL`, `JWT_ISSUER`, `PROFILE_API_URL`) in the
     **prod** environment must be `https` and must not be a bare IP address. **This is exactly
     `0063`** — a value that is present, forwarded, and well-formed as a string, but wrong.
   - Nothing beyond that list without the owner adding it.
   - ✅ **APPROVED AS PROPOSED 2026-09-23 — OWNER RULING (Sprint 4 rescope, Q5)**, given live in the `fkit lead` session via `AskUserQuestion` and relayed by `fkit-lead`; ⛔ not producer precedent. The list is **exactly** the four URL variables above, which must be `https` with no bare IP. Nothing else.

   ⚠️ **Scope judgment, stated so it can be overruled:** the producer scoped Phase 2 to this narrow
   list rather than general value validation. General validation is where this task would balloon and
   where the maintenance burden would eventually make it useless. If the owner wants broader
   validation, that is a separate, larger task with a real design phase — not an expansion of this one.

7. **Secrets discipline in the output.** The guard reads an environment full of credentials. It must
   report **variable names and verdicts only — never values**, not even truncated, not even "starts
   with". A checker that prints a token into deploy output is a worse defect than the one it catches.

## Verification steps

1. **`0062`'s exact defect is caught.** Re-create it — remove `PROFILE_INTERNAL_TOKEN` from the
   heredoc — and confirm the guard reports it by name. **This is the acceptance test**: if it does not
   catch the defect that motivated it, nothing else matters.

   ⚠️ **A presence check alone does NOT discharge this — assert NON-EMPTY.** (Raised 2026-08-30 by the
   wiki lint; it is a real defect in a not-yet-built guard, caught before anything was written.) A
   naive *is it there?* test on `PROFILE_INTERNAL_TOKEN` **passes on a blank variable that is doing
   nothing at all** — the heredoc substitutes whatever the deploying shell has, so an unset local
   variable arrives as a forwarded, present, empty string. That is a live silent misconfiguration
   wearing a green check. **Prove both halves: the variable removed → caught, AND the variable
   forwarded but empty → caught.** See also step 3 and Phase 2 item 5, which state the general rule;
   this note pins it to the acceptance test itself, which is Phase 1's.
2. **`0063`'s exact defect is caught** (Phase 2). With `JWT_ISSUER` set to `http://<some-ip>` in a
   prod-shaped run, the guard reports it.
3. **A forwarded-but-empty variable is caught** (Phase 2) — the `0061` suspect. **Run this against
   `PROFILE_INTERNAL_TOKEN` specifically as well**, not only a generic stand-in: it is the variable the
   acceptance test in step 1 uses, and a blank one is exactly the case a presence check waves through.
4. **A clean configuration passes silently.** No false positives on a correct prod config; a guard that
   cries wolf gets disabled, and then we are worse off than having none.
5. **Optional variables do not fire**, and an unlisted variable **does** — prove both halves. A guard
   that treats unknown as optional is a guard that catches nothing.
6. **Report-only mode exits zero** and does not block a deploy, and enforcing mode exits non-zero.
   Demonstrate the transition deliberately, not as a side effect.
7. **No value is ever printed.** Inspect the guard's full output against a config containing
   credentials. Check deploy logs too — `deploy.sh` must not echo the heredoc it writes.
8. **A real deploy runs clean end to end** with the guard in report-only mode before enforcing is
   switched on.

## Notes

- **Depends on:** **~~`0062` and~~ `0063` must land first** — hard sequencing, not a preference. See the
  hazard section: this guard will correctly fail the deploy on their gaps, blocking the very fixes it
  is waiting for. 📌 **`0062` REMOVED 2026-09-23 (owner ruling, relayed by `fkit-lead`), citing the
  OWNER RULING OF 2026-09-02 in `## Status`:** `0062` gates only **switching the guard on** (arming),
  **not building it**. `0062` is now closed; its production checks moved to `0296`. ~~⛔ This task's own
  deploy-gated steps (verification step 8, the Phase 2 prod-shaped checks) are **unchanged**.~~ 📌 **2026-09-23, later (owner ruling, Sprint 4 rescope Q2 = (a)): verification step 8 moved to [`0298`](../0298-config-parity-guard-first-real-report-only-production-run-then-arm-enforce/brief.md). Phase 2 is built and proved locally here, and nothing in this task waits on a deploy any more.**
- **Blocks:** [`0298`](../0298-config-parity-guard-first-real-report-only-production-run-then-arm-enforce/brief.md), for the arming of Phase 2's checks only (Phase 1 can be armed without Phase 2). *(Was "nothing" until the 2026-09-23 split.)*
- ~~**Arming depends on [`0203`](../0203-config-parity-guard-pre-arming-gate/brief.md)** *(added
  2026-09-02, owner-ruled)*. All ten pre-arming items live there and must land before `--enforce` is
  wired here. The report-only run and Phase 2 are unaffected and proceed regardless.~~
  📌 **2026-09-23 (owner ruling, rescope Q2 = (a)): arming moved to [`0298`](../0298-config-parity-guard-first-real-report-only-production-run-then-arm-enforce/brief.md)**, and so did the report-only production run. The `0203` → arming sequence is unchanged and is now `0298`'s. Struck, not deleted.
- **Split into [`0298`](../0298-config-parity-guard-first-real-report-only-production-run-then-arm-enforce/brief.md) on 2026-09-23.** This task keeps Phase 2 (Sprint 4). `0298` holds verification step 8 and arming `--enforce` (Sprint 5). See `## Status`.
- **Related:** `0061`, `0062`, `0063` (the three instances that motivated it), `0060` (independent —
  parallelizable with any of these).

- **Ranking, and why it is not first.** It is prevention, and the class it prevents has already bitten
  three times — which argues for urgency. But `0063` is broken for users *now*, `0062` blocks this
  sprint's headline feature, and this task **cannot safely precede either**. So: fourth on the config
  track, immediately after the repairs, because the moment they land is the moment to lock the door.
  `0060` is genuinely independent and can be picked up by anyone at any point.
- **`0062` step 4 now points here.** It previously asked its implementer to evaluate and recommend a
  general guard. That thinking has moved into this brief; `0062`'s implementer should not redo it.
- **Owner-ruled 2026-08-24 (relayed via the lead session): this task's scope inherits two
  mechanism-level residuals accepted on `0062`'s review** (its ledger,
  `ai-agents/tasks/done/0062-forward-profile-internal-token-in-deploy/review.md`, findings R1/R2
  and the accepted-residuals section): **(R1)** all 8 secrets in `deploy.sh`'s remote-env heredoc are
  forwarded by local expansion into the single ssh argv — transiently visible in local/remote process
  tables (and traced by any `bash -x` invocation of the script); **(R2)** theoretical
  heredoc-delimiter injection if any secret ever stops being hex-only (a value containing
  newline+`EOL` could terminate the remote heredoc early) — unreachable today because the token is
  `openssl rand -hex 32`, but the guard rail is convention, not mechanism. Both were accepted as
  residuals on `0062` because they are properties of the deploy **mechanism**, shared by every
  neighbor var — and this task is where mechanism hardening would land if the owner wants it.
  `0062`'s ledger carries the re-raise conditions.
- **Merged from `0072` (owner-ruled 2026-08-24).** A duplicate guard brief
  (`0072-deploy-time-config-guard`, filed 2026-08-24 while this task was board-invisible) was
  cancelled in favor of this one; two of its specifics are folded in as scope, attributed here:
  **(a) the profile-deploy pipeline is covered too** — the guard applies to both pipelines that have
  already bitten (game-server `deploy.sh` and the profile deploy, `build-deploy-profile.sh` /
  `setup-profile.sh`), not the game-server script alone; **(b) well-formedness checks are typed, not
  just presence checks** — public-facing URL values must be `https` and hostname-based (no raw IPs;
  the `0063` class), tokens non-empty (the `0062` class). Everything else in `0072` was already here.
- **🔁 A THIRD instance landed 2026-08-28 — and it is the first in the profile pipeline.**
  [`0195-forward-yandex-payments-secret-in-profile-deploy`](../../done/0195-forward-yandex-payments-secret-in-profile-deploy/brief.md):
  `YANDEX_PAYMENTS_SECRET` is absent from `build-deploy-profile.sh`'s staged-export block, so
  `setup-profile.sh` writes it **empty** into `profile.env` and every `/v1/payments/*` route ~~fails
  closed with 503 on the real box~~ **would fail closed with 503 on a real box** — since `0019`
  shipped.
  🔴 **CORRECTED 2026-09-04 — "on the real box" was never an OBSERVATION.** A profile VPS does exist
  (owner ruling, superseding an earlier "no VPS" statement the same day — both recorded), **but its
  running state is UNKNOWN AND UNVERIFIED**, and nobody has ever watched a `/v1/payments/*` request
  503 there. ✅ **The DEFECT and the FIX are unaffected** — the staged-export omission was real and
  `0195` fixed it; what was wrong was the phrase presenting a deduction as a sighting.
  ⚠️ **Read every "on the real box" in this brief as "on a box whose state nobody has checked."**
  Inspection + rebuild: epic [`0213`](../0213-profile-backend-clean-slate-rebuild/brief.md),
  phases P0–P7.
  Three consequences for this task:
  **(i)** the class table above should be read as four rows, not three, and this one confirms the
  merged-`0072` point (a) was right that both pipelines need covering — it is no longer hypothetical;
  **(ii)** the hazard section applies unchanged — **`0195` must land before this guard arms**, or the
  guard correctly fails the very profile deploy that ships the fix, exactly as with `0062`/`0063`;
  **(iii)** ⚠️ **`YANDEX_PAYMENTS_SECRET` needs an entry in the Phase 1 step 4 allowlist, and it must
  be marked EXPLICITLY OPTIONAL with the reason recorded, until `0014` issues the per-game secret
  key** — then flipped to required. Both errors are harmful: required-today fails every profile deploy
  on a value nobody can yet supply; unlisted-forever means the guard never catches the defect that
  motivated this note. `0195` does not build any part of this guard and does not edit this brief; the
  cross-reference was recorded by the producer at filing.
- **This is a guard, not a fix.** It does not correct any configuration. If it finds gaps beyond the
  known three, each is a new brief — do not let this task grow into fixing whatever it discovers.
- **Do not modify the incident record** — it is maintained by the investigating coder. Flag anything
  you find in it rather than editing it.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **No secrets in any artifact.** This task is *about* an environment full of credentials, so the risk
  of one landing in a worklog, a test fixture, a log line, or deploy output is unusually high.
  `.env*` is gitignored; keep it that way.
