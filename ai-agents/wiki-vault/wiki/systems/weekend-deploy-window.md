# Weekend Deploy Window — one slot, eleven tasks, TWO profile deploys

**Layer**: shared (game box + profile/admin box + telemetry box)
**Key files**: `setup-profile.sh`, `build-deploy-profile.sh`, `build-deploy.sh`, `deploy.sh`,
`setup-telemetry.sh`, `src/client/flashist/FlashistFacade.ts`, `src/client/CitizenshipCard.ts`,
`src/client/ProfileApiClient.ts`, `tests/scripts/profile-deploy-hardening.test.sh`

> 🆕 **Added 2026-09-22 by the sync that ingested
> `ai-agents/knowledge-base/weekend-deploy-slot-runbook.md`.** Before this page the vault had **no
> entry of any kind** for the deploy window that orders eleven Sprint 4 tasks against each other.
> Ground truth is that runbook — the operator's file, and the one to read before touching a box. This
> page records its **shape, its rulings and its traps**, not its checkboxes.
>
> ⛔ **No hostnames, IP addresses, ports, tokens, chat ids, bucket names or credentials appear on this
> page, deliberately** — the runbook opens with that rule and the vault honours it. **Variable names,
> file paths, status codes and step letters only.**
>
> ## 📌 TYPED AS A **SYSTEM** PAGE DELIBERATELY — ⛔ SETTLED, DO NOT RE-TYPE IT
>
> **Ruled 2026-09-22 by `fkit-lead`** when the wiki role raised the question at the end of the ingest
> that created this page. ⛔ **Do not re-open it**; the objection below was considered and answered.
>
> - **The objection raised:** this is *"a one-time ordered window rather than a standing system"*, so a
>   **Decision** page was arguable.
> - **Why it does not land:** the part with a life beyond this weekend is the **sequencing logic**, and
>   that is most of the document — telemetry first because nothing rides on it; the sshd check from a
>   **new** session after hardening; the reboot **before** the game deploy, not after;
>   **append-never-replace** on the allowlist. **None of that is specific to this particular weekend,
>   and the next deploy window inherits all of it.**
> - **Why not a Decision page:** a Decision page would be right if the durable content were *"the owner
>   ruled X"* — but **the rulings are already recorded on the sprint boards and in the briefs, and this
>   page CITES them rather than BEING them.** What the vault gains here is the **operational shape**,
>   which is what a System page is for.
> - **What settles it:** the `ai-agents/knowledge-base/alert-delivery-runbook.md` →
>   [[systems/alert-delivery]] precedent points the same way. **Consistency with an existing precedent
>   beats a marginal taxonomy improvement**, and re-typing this would leave **two operator runbooks
>   classified differently for no reader benefit.**
>
> 📌 **On the source runbook's title, recorded so it is not chased:** it reads *"four deploys"* and is
> **accurate today**. ⚠️ **What this page preserves is that it was WRONG when written — five, not
> four — and is right only by accident of the W8 cut.** ⛔ **Leave both as they are:** a silently
> corrected number would hide that **this count has already drifted once.** The knowledge-base file is
> outside the vault's write boundary in any case (ADR-005).

## Summary

A `/fkit-status Sprint 4` run on **2026-09-22** found that **five tasks each demand a profile-box
deploy in the same window, under different and partly opposing input conditions, and no document
ordered them against each other.** The runbook is the ordering: steps **W0–W15**, each with the
constraint that put it where it is.

**The window collapses into FOUR deploy commands, not eleven:**

| Step | What | Command |
|---|---|---|
| **W2** | Telemetry deploy | `npm run deploy:telemetry` |
| **W3** | Profile deploy 1 — the four persisted secrets **SET** | `npm run deploy:profile` |
| **W7** | Profile deploy 2 — the four persisted secrets **BLANK** | `npm run deploy:profile` |
| ~~W8~~ | ~~Profile deploy 3 — one value **rotated**~~ | ⛔ **REMOVED from the window** 2026-09-22 → task `0294` |
| **W12** | Game deploy | `./build-deploy.sh prod` |

`npm run deploy:profile` **is** `./build-deploy-profile.sh`, which is why four tasks
(`0219`-B4, `0220` §8 step 1, `0221`-B1, `0286` step 8's profile half) ride **one** invocation at W3.

⚠️ **The runbook's own title says "four deploys" and it was WRONG when written — it was five.** It is
correct today **by accident of the W8 cut**, not by edit. ⇒ **Two profile deploys, not three**, so the
same daily backup object is overwritten **twice** in the window, not three times (expected, not a
fault).

## Architecture

### The three rulings that set the spine (owner, 2026-09-22, via `AskUserQuestion`, relayed by `fkit-lead`)

1. **`0286` step 8 runs FIRST.** `0219` B4, `0220` §8, `0221` B1 and `0286` itself all need
   `npm run deploy:profile` to complete, and **`0286` is the fix for the defect that hangs exactly
   that command.** Prove it first and the rest of the slot is safe.
2. **The game deploy runs in the SAME window** as the profile-box work (`0272`, `0273`, `0032` step 5,
   `0064` step 8) — both sides must agree on `PROFILE_INTERNAL_TOKEN`, and `0062`'s D1/D3–D5 need a
   deployed game server. ⚠️ `0273/plan.md` §4.6 had staged these as **two** deploys with XP go-live
   separate and later; **this ruling collapses them into one.**
3. **`0203`'s six pending decisions are deferred** until after the deploy.

### The ordering constraints, in one list

- **W0 (read-only, before the window)** — measure the game-prod egress IP and **append** it to the
  allowlist; take `0286` step 8's *"before"* capture on each box (a before/after capture has no value
  if the "before" is taken after the deploy); confirm the four `0220` variables do not collide with
  `0217`'s token; **open an SSH session and leave it open** — it must survive W3.
- **W4 — the strongest ordering constraint in the window.** W3 is the deploy that hardens sshd. **If
  it locked you out, every remaining step is dead.** Verify key login from a *new* session and only
  then close W0's session. ⛔ Never verify this by closing your only session.
- **W5** reads the prune result **after one deploy**, so a prune that breaks rollback is caught before
  more images stack on it.
- **W7** is `0220`'s proof — *"step 1 alone proves nothing about reuse."*
- **W9** deliberately triggers a fail2ban ban, so it runs **after the last profile deploy**. The jail
  is **port-scoped to SSH**, so it cannot cut the crediting path.
- **W10** must follow the last profile deploy (a later deploy recreates both containers, so earlier
  evidence would be about containers that no longer exist) and **precede** the game deploy (the reboot
  takes the box down; you want to know it comes back **before** crediting is switched on).
- **W11** is the last cheap chance to catch a silent barrier: the token-match pre-check, and re-running
  `0276`'s eleven read-only probes so that afterwards **a 403 is the allowlist and a 401 is the token**.
- **W13–W15** are placed immediately after the deploy so a failure is **seen**, not discovered later.

### Where the deferred work went

| Removed from the window | Ruling | Now lives in |
|---|---|---|
| `0220` §8 step 3 — the rotation proof (W8) | **C2**, 2026-09-22 — *"Skip it now, file it separately"* | task **`0294`**, Backlog board |
| `0217` step 3's egress-IP measurement + method | **C3**, 2026-09-22 — *"Record as a task, add it to the Sprint 5"* | task **`0295`**, Sprint 5 |
| `0065` step 3 — the real test purchase | **C1**, 2026-09-22 — *"Drop `0065` step 3 from the window"* | unscheduled; `0065` stays `🚧 Blocked` |
| A written abort / rollback procedure | **G1**, 2026-09-22 — *"Skip it — I know the boxes"* | ⛔ **nowhere, by decision** |

⛔ **No task's `## Status` was touched and no mover skill was invoked for any of these.**

## Gotchas / Known Issues

### 🚨 `PROFILE_INTERNAL_ALLOW_IPS` serves TWO callers — APPEND, NEVER REPLACE

This is the single fact on this page that a summarising pass is most likely to flatten, and flattening
it costs the alert channel.

| Caller | Why it is in the list |
|---|---|
| The **game server** | `/internal/v1/players/resolve` and `/internal/v1/credit` (`0217` § *Barrier 2*) |
| The **monitoring box** | the alert webhook and `0284`'s hourly liveness probe — the relay route is mounted under `/internal/` **solely** to inherit this allowlist (`ai-agents/knowledge-base/alert-delivery-runbook.md` — search for *"solely to inherit"*) |

⛔ **Replace the value and you drop the monitoring box. The first alert after that gets a 403, and a
403 PERMANENTLY AND SILENTLY DISABLES the notification channel** — no retry, no error, and **fixing the
address afterwards does not undo the disable**; the channel must be re-enabled by hand in the
monitoring UI. See [[systems/alert-delivery]].

🚩 **Second half of the same trap: the variable has NO on-box persistence.** `setup-profile.sh`
defaults it to empty (search for `PROFILE_INTERNAL_ALLOW_IPS="${PROFILE_INTERNAL_ALLOW_IPS:-}"`,
verified in the tree 2026-09-22), and an empty value renders a bare `deny all` — **403 for everyone**.
The deploy warns loudly when it is empty, and **the warning is the only guard.** ⇒ **Every profile
deploy in the window must carry the full list**, including **W7**, where four *other* variables are
deliberately blanked.

⚠️ **A wrong entry is 403 on every credit call, indistinguishable from "working" at the game server —
and XP is LOST, not queued.** Nothing would tell you. See [[decisions/adr-101-fail-soft-xp-crediting]].

### 🚨 Most of the runbook rests on a prediction — `0286` step 8 has never run

`0286` fixes the defect that **hangs** `npm run deploy:profile` on an invisible dialog — a hang, not a
failure: `set -e` never fires, nothing errors, the apt lock is held, and an unattended run waits
forever. Its own brief is blunt that **every claim about debconf defaults, `needrestart` and the boxes'
distro is a PREDICTION until step 8 runs.**

⇒ **If W2 or W3 stops on a prompt, every step after it is in question**, because every remaining
profile-box task rides the same command.

⚠️ **Even a clean W2/W3 must never be written up as "the deploy can no longer hang."** It can no longer
hang on a **debconf** prompt. A **dpkg conffile** prompt is not covered by `DEBIAN_FRONTEND=noninteractive`
at all — a live residual under owner ruling D3.

### 🚨 W12 has zero prior production evidence AND no written way back

Both halves, together, or the record is wrong:

- `0272`: the game server is **not deployed** — *"S3's end-to-end behaviour has zero production
  evidence."* `0273`: *"the login flow, the session store, the Bearer-token call path and the analytics
  events have zero production evidence."*
- **G1 is a DECISION, not an omission.** A rollback procedure was raised and the owner **declined** it
  — *"Skip it — I know the boxes."* ⛔ **Do not author one on your own initiative, and do not re-argue
  it.** The honest consequence stays attached: **the window's one step with zero prior production
  evidence has no written way back**, and **the whole of the mitigation is a human watching at
  W13–W15**. `0219`'s G3/G4 — the only things that would have watched automatically — are deferred.

### ⚠️ `0220` closes with ONE STEP DEFERRED — not "unverified"

⛔ **Do not report the rotation property as unproven in general, and do not report it as fully proven.**

- **Steps 1 and 2 still run**, at W3 and W7, in that order. The §8 order was **not** re-ordered by the
  cut.
- `tests/scripts/profile-deploy-hardening.test.sh` (**T13 — rotation**, verified present 2026-09-22)
  drives the real `persist_or_reuse_secret()` and asserts the overwrite — **against stubs**, gated by
  `npm test`. ⛔ **Stubbed coverage is explicitly NOT live-box evidence.**
- **What is missing is live-box evidence, and only that** — task `0294`.
- ⚠️ `0220`'s own §8 says steps 2–3 **together** are what prove the defect closed. **Only step 2 runs
  here, so the close must say so and must not round it up.**

**Why the step exists, recorded because it nearly did not survive:** the owner's *first* instinct was
*"rotate nothing, we don't know why the step exists"*, and they **revised it once shown the reason.**
If persist-or-reuse always prefers the box's stored value, then **the day a key leaks and a new one is
deployed, the box silently keeps the old one** — the operator believes a compromised credential was
replaced when it was not, and nothing says otherwise. ⛔ **Never write it up as "a redundant third
deploy."**

📌 Rotating `TELEGRAM_PROXY_URL` (a URL, not a secret) was **offered and NOT taken** — recorded in
`0294` as *one* viable approach, not the chosen method. ✅ It does establish that the task needs **no
real credential**.

### ⚠️ `0065` step 3 is out of the window because the button does not exist in a shipped build

**Verified in the tree 2026-09-22, independently and twice — and re-verified by this ingest:**

- `src/client/CitizenshipCard.ts` — the `CITIZENSHIP_CARD_ENABLED` check adds `hidden` and **returns
  before anything else in `connectedCallback()`**. An **absolute** gate.
- `src/client/flashist/FlashistFacade.ts` — `CITIZENSHIP_CARD_ENABLED: false`, a **compile-time
  constant**, carrying the source comment *"no `GAME_ENV` bypass — owner-ruled 2026-08-21."*
- The same file's `&&` short-circuits, so the remote `citizenship_ui` experiment flag **is never read**
  while the local flag is false.
- A grep of **`src/` and `webpack.config.js`** finds **exactly three** mentions of the name and
  **NO env override and NO remote override anywhere.**

⇒ **Making the button appear requires editing source and running `./build-deploy.sh prod` a SECOND
time.** The owner ruled that is **a decision about launching citizenship, not a verification step**,
and it must not ride in on a deploy slot.

⚠️ **The owner's confirmation that they WILL perform step 3 still stands** — it is not withdrawn, it is
**not scheduled here**. 🚨 **And `0065`'s own step 6 says flip the flag *"only after 1–4 pass"* — while
step 3 is one of 1–4 and is the step that needs the flip first. `0065` cannot satisfy its own ordering
as written**; whoever takes the flip decision must resolve that, not route around it.

### Scheduling and hygiene constraints

- ⛔ **No profile deploy between 02:00 and 03:15 UTC**, and none overlapping a backup/restore drill — a
  deploy's smoke backup writes the same daily object.
- ⚠️ **Each profile deploy recreates BOTH containers** (postgres included) and **overwrites today's
  daily backup object.** Two deploys ⇒ two overwrites of the same key. Expected, not a fault.
- ⚠️ **`./build-deploy.sh prod` commits, tags and pushes BEFORE it builds.** The working tree at that
  moment is what ships. ⛔ **Only the owner runs it.**
- 🚩 **Step letters collide.** `0219` and `0221` each have hand-off steps named **B1–B6** and they are
  different steps (`0219`-B5 is container log rotation; `0221`-B5 is a daemon restart and a reboot).
  **Always write `0219-B5` / `0221-B5`.**
- 🚩 **Expect `alerting: no` at W3, not the hand-off's predicted `alerting: yes`** — `0219`-B2 is
  deferred, so there is no ping URL. ⛔ **That is the ruling working, not a deploy failure; do not
  "fix" it by inventing a ping URL.**
- ⚠️ **W8's number is left deliberately VACANT rather than renumbered**, so W9–W15 keep the identities
  any worklog already refers to (ADR-035 — appended, never renumbered).

### Gaps the runbook flags and deliberately does NOT author

⛔ **Flagged, not invented — writing a step nobody agreed to is how a runbook starts lying.**

| # | Gap | State |
|---|---|---|
| **G1** | no abort / rollback procedure | ✅ **RULED deliberate** — see above. Owned and accepted, not unknown |
| **G2** | no brief defines **how** to measure the game-prod egress IP | ✅ **Owned by `0295`** — ⚠️ **an owner is not an answer; still a gap until it runs** |
| **G3** | nothing defines the **shape** of the crediting observation at W13–W14 — for how long, by whom, what threshold ends the watch | ⛔ **open**; a "watch for N minutes" step would be an invention |
| **G4** | nothing covers multiple same-day profile deploys vs the daily backup object | ⛔ **open**, but `0219`-G4 is deferred, so nothing depends on it today |

🚨 **The accepted cost of the `0219` split, restated because it is a date and not an adjective: the
TLS-certificate fuse stays UNWATCHED.** The live certificate's `notAfter` is reported as **2026-11-20**
with twice-daily renewal attempts from around **2026-10-21**, failing **silently** until TLS stops
serving. ⚠️ **PROVENANCE: those two dates come from a previous producer's report relayed through
`fkit-lead` and were NEVER VERIFIED — record them as reported, not established.** What *is*
repo-verified is the twice-daily cron itself. **Weeks away, not this weekend — that is the whole of why
the deferral is affordable.**

## Related

- [[systems/alert-delivery]] — the second caller on `PROFILE_INTERNAL_ALLOW_IPS`, and the 403
  channel-disable trap in full
- [[systems/player-profile-store]] — the profile/admin box every W-step on this page deploys to
- [[systems/telemetry]] — the telemetry box W2 deploys, and the certificate fuse left unwatched
- [[systems/project-operations]] — the operational handbook this window sits inside
- [[decisions/sprint-4]] — the board that owns all eleven tasks, and the deploy-slot hold the owner
  ruled for `0032` step 5
- [[decisions/sprint-5]] — where `0295` (the egress-IP measurement and method) was filed
- [[decisions/sprint-backlog]] — where `0294` (the live-box rotation proof) was filed
- [[decisions/adr-101-fail-soft-xp-crediting]] — why a dropped credit is **lost, not queued**, which is
  what makes a 401/403 indistinguishable from "working"
- [[decisions/adr-113-internal-player-id]] — the identity work `0272`/`0273` deploy at W12
- [[decisions/config-parity-failure-class]] — `0064`'s parity guard, which runs **report-only** at W12
  and ⚠️ **cannot catch the thing the window is doing** (it compares names, not values)
- [[tasks/profile-server-bring-up-runbook]] — task `0182`, the bring-up runbook this window's profile
  steps build on
- [[tasks/internal-path-case-variant-allowlist-bypass]] — task `0276`, whose eleven probes are re-run
  at W11 to establish the 403-vs-401 baseline
- [[tasks/alert-path-liveness-probe]] — task `0284`, the second caller's hourly probe
