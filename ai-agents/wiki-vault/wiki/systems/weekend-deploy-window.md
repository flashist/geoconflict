# Weekend Deploy Window — one slot, eleven tasks, TWO profile deploys

**Layer**: shared (game box + profile/admin box + telemetry box)
**Key files**: `setup-profile.sh`, `build-deploy-profile.sh`, `build-deploy.sh`, `deploy.sh`,
`setup-telemetry.sh`, `src/client/flashist/FlashistFacade.ts`, `src/client/CitizenshipCard.ts`,
`src/client/ProfileApiClient.ts`, `tests/scripts/profile-deploy-hardening.test.sh`

> # ✅ 2026-09-26 — THE WINDOW RAN (W0–W14; W14's acceptance criterion MET). W15 is still running.
>
> **Provenance:** every step was **executed by the OWNER on the boxes on 2026-09-26**; output pasted into
> the `fkit lead` session and read and checked by `fkit-lead` (some read-only checks the lead ran itself
> from a non-allowed host); recorded in the runbook by a spawned `fkit-producer` (ADR-021). ⛔ Relayed
> evidence — not an owner ruling. ⛔ **Everything below this block was written BEFORE the window** — read
> it as the plan and its reasoning, not as what happened. Ground truth: the runbook's appended section
> *"2026-09-26 — THE WINDOW RAN"* (the runbook's checkboxes are left as written).
>
> **What happened, step by step (verdicts and counts only):**
>
> | Step | Result |
> |---|---|
> | **W0.1** | Egress measured from the game box (method only, see [[tasks/game-prod-egress-ip-allowlist]]); IPv4-only; the address was **already** in the allowlist ⇒ nothing edited (2 entries, count only) |
> | **W0.2** | `0286` "before" captured on both boxes — the telemetry box's distro recorded for the first time anywhere |
> | **W0.4 / W0.5** | SSH session held through W3/W4 ✅; pre-window snapshot copied, sizes match ✅ (still encrypted, the box cannot decrypt it, and nothing deletes it automatically — remove by hand at W15) |
> | **W2** | Telemetry deploy, **no prompt**; the "after" capture byte-identical to "before" ⇒ the noninteractive fix changed no box state ✅ |
> | **W3** | 🚩 First attempt **failed locally at image build** (finding **F-A**); re-run succeeded. No debconf prompt; value parity **0 findings / 13 ok**; prune removed **2** images (not the ~9 predicted); daily checks installed; security-only unattended upgrades; fail2ban up; sshd hardened; migrations `001`–`004` + `006` already applied, no `005`; `alerting: yes` (as expected since the 2026-09-25 ruling, below). 🚨 **The `0253` tenure-grant route is LIVE** ⇒ **the ADR-112 claim-on-behalf risk is OPEN from W3, 2026-09-26**; `0268` closes it ([[tasks/tenure-xp-grant]]) |
> | **W4** | New key session works; the **5** persist files `600 root`; password login refused ✅ |
> | **W5** | Rollback profile image survived ✅; **container log rotation observed** ✅ (cleanup of an unneeded test image owed — removal not confirmed); ⚠️ the in-use postgres image was **untagged** — see F-C |
> | **W6** | `0217` Q9 answered — `004` was **already** deployed before 2026-09-26; name-change routes not 404 ✅ |
> | **W7** | `0220` step 2: `Reusing persisted <NAME>` ×4 ✅; ⛔ step 3 (rotation) not run, by the C2 ruling → `0294` |
> | **W9** | fail2ban ban observed and explicitly unbanned ✅ (expiry seen only on a real attacker's ban); unattended-upgrades real-run evidence ⚠️ partial |
> | **W10** | Graceful stop: clean drain log + exit 0 ✅, but ⚠️ no in-flight request observed completing; daemon restart: containers came back **recreated by the systemd unit**, not restarted ⇒ ⚠️ outcome shown, mechanism not; reboot → `/ready` back in ~20 s ✅; manual daily check **12 ok / 0 failed** ✅. 🚨 **Unplanned Postgres minor upgrade — F-C** |
> | **W11** | Token-match A1 **`MATCH`**; `0276` probes **11/11 → 403** from a non-allowed host, **401** from the game box ✅ |
> | **W12** | `./build-deploy.sh prod` → release **`0.0.152`**; parity guard **REQUIRED 0** on game / profile / client; value guard **REQUIRED 1** = the expected `OTEL_AUTH_HEADER` line (`0298`), last line `report-only — exit 0` ✅. 🚩 Previous game image deleted — F-D |
> | **W13** | Token `NONEMPTY` in the container; 0 partial-config warnings; 0 token strings in logs; 0 profile error lines; **41 players / 41 identities** (0 before); owner's browser check: **one** `POST /v1/login` per logged-in load, **zero** for guests ✅ |
> | **W14** | ✅ **ACCEPTANCE CRITERION MET — both halves of the owner's stop condition:** `player_match_xp_credits` **13 rows, 5 games, 13 XP** (1 XP per credit); **9 players** with XP > 0; 0 profile error lines. See F-B |
> | **W16** | Sprint 4 closed by `/fkit-sprint-done` (0 open rows ⇒ nothing rolled to Sprint 5). ⛔ Sprint 5 **not started** — the owner starts it himself |
>
> **Findings — recorded, ⛔ no fix decided for any:**
> - **F-A — the profile image build is fragile.** `canvas`'s prebuilt-binary download can time out, and
>   its `node-gyp` fallback needs Python, which `node:24-slim` lacks — a network blip fails the build.
>   Failed locally, before anything reached the box. 🚩 **No owning task.**
> - **F-B — two slow `resolve` calls under real login traffic** (watch item, not a failure): two
>   `players/resolve … (attempt 1/3): TimeoutError` warnings ~10 min apart, each a stall past the **10 s**
>   per-attempt timeout; a retry succeeded both times. ⛔ **No cause known, none asserted.** One resource
>   snapshot a few minutes later showed no starvation (rules out a sustained squeeze, not a brief one).
> - **F-C — prune + compose re-pull caused an UNPLANNED Postgres minor upgrade.** The running DB used an
>   untagged older image; W3's prune kept it by ID but **deleted the tagged `postgres:16-alpine`**; W10's
>   daemon restart made the systemd unit's compose-up **re-pull the tag and recreate the DB container** on
>   **PostgreSQL 16.15**. **Data intact** (`schema_migrations` count 5, `/ready` OK). Filed on `0219` as a
>   finding only; candidate directions (keep-list by tag/reference, or pin compose by digest) **not
>   decided**.
> - **F-D — the game deploy deleted the previous game image** from the game box. A rollback now needs a
>   re-pull from the registry. ⚠️ Matters because **G1 (no rollback procedure) stays declined.** 🚩 **No
>   owning task.**
> - **F-E — misleading deploy-log wording:** `PROFILE_LOGIN_CREATE_ENABLED … written EMPTY (feature stays
>   off)` while parity said `login creation ENABLED (normal)`; in code blank ⇒ **enabled**. Wording, not
>   behaviour. 🚩 **No owning task.**
>
> **Still owed from the window:** `0286`'s worklog note (not written); **W15** — `0032` step 5's Uptrace
> re-measure (≥ 24 h after W12, so not before about 2026-09-27 09:00 UTC) and the two F-B counts
> (`failed after retries` **must stay 0** — above 0 can mean lost XP); deleting the pre-window snapshot
> once the owner judges the window good; the leftover `postgres:16` image (removal not confirmed); the
> Better Stack `profile-daily-checks` incident closing (not confirmed in its UI); `0294` (live rotation
> proof); `0296`-A6, all of section B, and `0298` Part B.
>
> **Tasks this window let close (all agent-closed — not owner-verified):** `0217`
> ([[tasks/profile-p2-wire-game-server]]), `0272`
> ([[tasks/profile-identity-s3-game-server-resolve-and-credit]]), `0273`
> ([[tasks/profile-identity-s4-client-login-session]]), `0220`
> ([[tasks/profile-secret-persistence-value-parity]] — ⚠️ **with step 3 deliberately not run**), `0295`,
> `0061` ([[tasks/feedback-telegram-delivery-failure]]) and epic `0266` ([[tasks/profile-identity-epic]]).
>
> ---
>
> # 📌 2026-09-25 — OWNER REVERSED THE SAME DAY: **KEEP** `PROFILE_CHECKS_PING_URL`
>
> A first 2026-09-25 ruling said to blank the ping URL before W3 (W0 item 6). **Later that day the owner
> reversed it** (*"Keep it — don't blank"*): at 08:00 UTC a Better Stack email for the
> `profile-daily-checks` heartbeat had reported *"Reported failure"* with `reboot-required` ⇒ **alerting
> was already live on the box**, and blanking would have switched working monitoring off. ⇒ W0 item 6
> has no action; W3 expected `alerting: yes`; the open `reboot-required` incident was expected until
> W10's reboot. ⇒ **The *"Expect `alerting: no`"* bullet under *Scheduling and hygiene* below is
> superseded** (kept as written).
>
> ---
>
> # 📅 DATED 2026-09-23: THE WINDOW IS SATURDAY 2026-09-26 — plus the Sprint 4 rescope (updated 2026-09-24)
>
> **Owner, verbatim (2026-09-23, live via `AskUserQuestion`, relayed by `fkit-lead`; ⛔ not producer
> precedent): *"This Saturday, September 26"*.** The *"undated"* block below is **superseded as to the
> date only** and kept as history. ⚠️ **It has not happened yet** (today's sync is 2026-09-24), and the
> owner has said he will **postpone the release if `dev` is not ready** — so read *"at W3"* etc. below as
> *"if the window runs"*.
>
> **What changed in the runbook this sync window:**
> - **`0064` step 8 is now `0298`'s** (split 2026-09-23, rescope Q2 = (a)). W12 captures **two**
>   report-only blocks into `0298`'s worklog: the **parity** guard (names) and the **new value guard**
>   (`0064` Phase 2, closed 2026-09-24), headed `── config value guard (report-only) · deploy env: prod`.
>   The runbook glosses every line type; the two to know: **`NOT JUDGED` must never appear on a prod
>   deploy** (it means the deploy is not running as `prod` — stop and check), and a **`REQUIRED …
>   PROFILE_INTERNAL_TOKEN — forwarded but EMPTY`** line means a **missed precondition**, not noise —
>   the blank-by-hand rule was **retired** 2026-09-24 (*"Retire it"*). ⚠️ The value guard sees only
>   blank/malformed; **W11's A1 is still the only check that the token MATCHES the box's.** ⛔ Arming
>   `--enforce` does **not** happen in this window. See [[tasks/deploy-time-config-parity-guard]].
> - **Ruling 3 is LIFTED for `0203`** (rescope Q3 = (b), against the producer's recommendation): its
>   decisions were taken before the window, and `0203` closed 2026-09-24. See
>   [[tasks/config-parity-guard-pre-arming-gate]].
> - 🚨 **`0253` rides W3 — a fifth task on the profile deploy** (owner, 2026-09-24, *"Yes, ship it
>   Saturday"*). **`POST /v1/profile/tenure-grant` goes live on the box at W3** and answers at once — it
>   does **not** wait for the card flag. ⇒ 🚨 **The owner-accepted claim-on-behalf risk (ADR-112, amended)
>   opens at W3, not at `0065`'s flip**; `0268` closes it. W12's game deploy carries `0253`'s client code,
>   inert while `CITIZENSHIP_CARD_ENABLED` is `false`. See [[tasks/tenure-xp-grant]]. 📌 ~~The runbook
>   describes that server code as *"uncommitted"*~~ ✅ **The runbook itself was corrected 2026-09-24
>   (commit `2df6bbf`): *"committed in `6eeceeb`"*, and 📌 lines under the rescope's working-tree warning and at the W12 pre-check now say all
>   four Sprint 4 tasks (`0064`, `0253`, `0020`, `0203`) are closed and committed, so none is in
>   progress. The `git status` check still stands for anything new.**
> - **New W12 pre-check:** before `./build-deploy.sh prod` (and before W3/W7), **no unfinished Sprint 4
>   work may sit in the working tree** — the scripts commit and ship the tree as it stands.
> - **New W16 — the window's last step:** the producer closes Sprint 4 with `/fkit-sprint-done` (Q7 =
>   (b)), then the owner starts Sprint 5. 📌 *As counted this sync, Sprint 4 has **zero open rows**, so the
>   close would roll nothing.*
> - **C1 RESOLVED (2026-09-23):** `0065` is the go-live only; the test-buy moved to `0297` (Sprint 5), run
>   by the owner after go-live, **still not in this window**; `RUNBOOK-A` still stands. `0065` has **no
>   task condition**. 🚨 Accepted tradeoff: real players' first purchases may be the first real test.
>   The `YANDEX_PAYMENTS_SECRET` "do not overwrite" row now names `0297` §1–§4 **and real players'
>   purchases after go-live** as what an overwrite would break.
>
> ---
>
> # ⏸️ THE WINDOW HAS NOT HAPPENED — IT SLIPPED, AND IT IS UNDATED (owner confirmation, 2026-09-22)
>
> The 2026-09-14 ruling pointed at a weekend slot about six days out; the record showed no slot run,
> which left two readings — *slipped*, or *ran and nobody wrote it down*. A `/fkit-status` run correctly
> **declined to settle that from git**, and the **owner settled it: it SLIPPED.** Recorded as an **owner
> confirmation**, ⛔ **not** an inference — a deploy leaves no artifact in git.
>
> - 🚨 **Every step is genuinely undone — W0 included.** Do **not** assume W0.1's egress-IP
>   measurement, W0.2's `0286` "before" capture or W0.4's SSH session were ever taken. **Start at W0.**
> - ⛔ **No replacement date was named. Do not write one, infer one, or call it "this weekend".** The
>   page title's *"weekend"* names the kind of slot, not a date.
> - Consequence for the tasks it drives: everything gated on the window (`0064` step 8, `0032` step 5,
>   `0217`, `0272`, `0273`, `0296` section A …) is **further away, not nearer.**
>
> ## 🔄 UPDATED 2026-09-23 — `0062`'s steps are now `0296`'s
>
> `0062` was **closed** `(agent-closed — not owner-verified)` on an owner ruling and its production checks
> moved to task **`0296`** (Sprint 5). In this window: **W11 `0296`-A1** (ex-`0062`-D1), **W13 `0296`-A2 /
> A4** (ex-D2 / D4), **W14 `0296`-A3** (ex-D3). **Ex-`0062`-D5 passed LOCALLY 2026-09-23** and is checked
> off in the runbook — it is **not** a production check and did **not** move to `0296`. Results are
> recorded in `0296`, not in `0062`'s folder. See [[tasks/forward-profile-internal-token]].
>
> ---
>
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
   `0064` step 8) — both sides must agree on `PROFILE_INTERNAL_TOKEN`, and ~~`0062`'s D1/D3–D5~~
   **`0296`'s A1/A3–A4 (ex-`0062`-D1/D3/D4)** need a deployed game server; ex-D5 passed locally
   2026-09-23. ⚠️ `0273/plan.md` §4.6 had staged these as **two** deploys with XP go-live
   separate and later; **this ruling collapses them into one.**
3. **`0203`'s six pending decisions are deferred** until after the deploy. ✅ **Re-confirmed by the
   owner 2026-09-22**, with the reasoning now recorded: the deploy **unblocks eight rows and had a
   date**; `0203` **unblocks one task's `--enforce` wiring** (`0064`'s) **and has no deadline**.
   🚨 **The deferral SURVIVES the slip** — it is *"after the window"*, **not** *"after a date"*.

### The ordering constraints, in one list

- **W0 (read-only, before the window)** — measure the game-prod egress IP and **append** it to the
  allowlist; take `0286` step 8's *"before"* capture on each box (a before/after capture has no value
  if the "before" is taken after the deploy); confirm the four `0220` variables do not collide with
  `0217`'s token; **open an SSH session and leave it open** — it must survive W3; and 🆕 **(item 5)
  take a MANUAL SNAPSHOT of the newest existing backup object** — see *The W0 pre-window snapshot*
  below. ⛔ **It must complete before W3.**
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
- **W11** is the last cheap chance to catch a silent barrier: the token-match pre-check (now `0296`-A1), and re-running
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

> 📌 **2026-09-26: the first half is now history — W12 ran and W13/W14 produced the evidence** (real
> logins and real credits; see the top of this page). **The second half still holds and got worse:**
> G1 stays declined, and finding **F-D** — the deploy's cleanup deleted the previous game image — means
> a rollback now also needs a re-pull from the registry.

Both halves, together, or the record is wrong:

- `0272`: the game server is **not deployed** — *"S3's end-to-end behaviour has zero production
  evidence."* `0273`: *"the login flow, the session store, the Bearer-token call path and the analytics
  events have zero production evidence."*
- **G1 is a DECISION, not an omission.** A rollback procedure was raised and the owner **declined** it
  — *"Skip it — I know the boxes."* ⛔ **Do not author one on your own initiative, and do not re-argue
  it.** The honest consequence stays attached: **the window's one step with zero prior production
  evidence has no written way back**, and **the whole of the mitigation is a human watching at
  W13–W15**. `0219`'s G3/G4 — the only things that would have watched automatically — are deferred.
- 🆕 **That watch is now DEFINED — by the owner, 2026-09-22 (closes this runbook's G3).** See *The W14
  watch* below. ⚠️ **The risk is now owned, not removed** — still a person, still no automation.

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
  🚨 **⇒ W7 ERASES W3's backup, and with it the pre-window state** — which is why W0 item 5 now takes a
  manual snapshot first (G4, below). ⛔ The overwrite behaviour is unchanged; the snapshot works around
  it, and ⛔ **it is not a rollback** — G1 stays declined.
- ⚠️ **`./build-deploy.sh prod` commits, tags and pushes BEFORE it builds.** The working tree at that
  moment is what ships. ⛔ **Only the owner runs it.**
- 🚩 **Step letters collide.** `0219` and `0221` each have hand-off steps named **B1–B6** and they are
  different steps (`0219`-B5 is container log rotation; `0221`-B5 is a daemon restart and a reboot).
  **Always write `0219-B5` / `0221-B5`.**
- 🚩 **Expect `alerting: no` at W3, not the hand-off's predicted `alerting: yes`** — `0219`-B2 is
  deferred, so there is no ping URL. ⛔ **That is the ruling working, not a deploy failure; do not
  "fix" it by inventing a ping URL.** 📌 *Superseded 2026-09-25 (owner reversal, see the top of this
  page): a ping URL **was** set on the box and alerting was already live; W3 printed `alerting: yes` on
  2026-09-26, as then expected. Kept as written.*
- ⚠️ **W8's number is left deliberately VACANT rather than renumbered**, so W9–W15 keep the identities
  any worklog already refers to (ADR-035 — appended, never renumbered).

### Gaps the runbook flags and deliberately does NOT author

⛔ **Flagged, not invented — writing a step nobody agreed to is how a runbook starts lying.**

| # | Gap | State |
|---|---|---|
| **G1** | no abort / rollback procedure | ✅ **RULED deliberate** — see above. Owned and accepted, not unknown |
| **G2** | no brief defines **how** to measure the game-prod egress IP | ✅ **Owned by `0295`** — ⚠️ **an owner is not an answer; still a gap until it runs** |
| **G3** | ~~nothing defines the **shape** of the crediting observation at W13–W14~~ | ✅ **CLOSED 2026-09-22 — the owner defined the watch themselves** (not a producer draft they approved). See *The W14 watch*. Defines **W14 only**; W13 unchanged |
| **G4** | ~~nothing covers multiple same-day profile deploys vs the daily backup object~~ | ✅ **CLOSED 2026-09-22 by owner ruling — the W0 manual snapshot.** ⚠️ **Only HALF answered** — see below |

🚩 **Name collision: this runbook's `G3`/`G4` are NOT `0219`'s `G3`/`G4`** (the automated watchers
`0219` deferred). Always say which document's gap you mean. ⛔ **Neither closure covers G1 (still
ruled-and-declined) or G2 (still open-with-an-owner).**

### ⏱️ The W14 watch — who, how long, what ends it (owner-defined, 2026-09-22)

| | |
|---|---|
| **Watcher** | 🚨 **the OWNER** — they run the window; the runbook names them rather than *"someone"* |
| **Duration** | **until the first credit lands** — ⚠️ **event-based, not clock-based.** A **15-minute time-box was offered and declined**: a clock can expire having proven nothing if no match completed inside it |
| **Stop condition** | 🚨 **BOTH, not either:** (1) a row in the profile database **with XP credited**, **and** (2) **zero error-level lines** in the container log since the deploy — the half that catches the **silent** failures (a 401 on the credit call shows up there and nowhere a player could see) |

🚨 **SILENCE IS A FAILURE, NOT A PASS.** If no credit lands within the watch, **investigate before
ending the window** — ⛔ never record *"nothing observed"* and move on. **Silence is exactly what a 401
looks like from outside**: the client is fail-soft, nothing is raised, and **XP is lost, not queued**
([[decisions/adr-101-fail-soft-xp-crediting]]). A quiet log and an empty table are indistinguishable
from *"it worked and nobody played."* ⛔ **W13 (the seconds-long page-load check) and W14 (the
match-level check) stay two steps — do not merge them.**

### 💾 The W0 pre-window snapshot — and its matching cleanup at W15 (owner rulings, 2026-09-22)

**Why:** two profile deploys (W3, W7) each take a smoke backup; both land on the **same UTC day** on a
**date-keyed daily object**, so **W7 overwrites W3's and the pre-window state is gone.** Normally a
rollback would cover that — but **G1 declined a rollback procedure.** Neither fact alone worried the
owner; **both together did.**

- **Mechanism — established from the repo, not invented:** the same **server-side `rclone copyto`** the
  backup script already performs every Sunday for the weekly copy (verified live by `0241` —
  [[tasks/profile-weekly-backup-copy-verified]]), with a distinct destination prefix, run as root with
  the backup script's own environment loaded. ⚠️ **It is NOT a subcommand** — the backup script's
  dispatch accepts only `backup`, `restore` and `help`.
- 🚨 **Today's object can legitimately be ABSENT** (the nightly job may not have run yet). **List first
  and snapshot the newest object that actually exists** — ⛔ never "copy" a key that is not there and
  record a success. Sizes must match before it counts as done.
- 📌 **A self-correction the runbook records:** an earlier draft avoided `rclone lsf` on the claim that
  it *"appears nowhere in this repo"* — ⛔ **false, asserted without a full-repo check** (the restore
  runbook and the backup dry-run harness both use it). The *rule* (no unproven call in a prep step)
  stood; this call just turned out to be proven.
- **Cleanup — the last step of W15, and ⛔ the precondition IS the step:** delete the snapshot **by
  hand, only once the OWNER judges the window good** — which may be **after** W15 finishes. It is the
  **only** pre-window state that exists. ⛔ **If not certain, do not delete** — keeping it costs storage;
  deleting early costs the only copy. Use **`deletefile` on the one listed object**, never `delete`
  (which in this repo only ever sweeps a directory by age). Success for `deletefile` is **silence**.
  The owner put the cleanup in the runbook so that **ownership stays inside the document that created
  the object and it cannot be orphaned.**

**Residuals, recorded not softened:**
- ⛔ **The snapshot is ENCRYPTED and the box CANNOT decrypt it** — the private `age` identity is
  deliberately off-box (custody: `0281`). ⇒ before deleting, be sure whoever would need it can **read**
  it; an unreadable snapshot kept and one deleted are worth the same.
- **Nothing prunes it** — the script's prune covers `daily/` and `weekly/` only. ⚠️ **"Our script does
  not prune it" ≠ "the bucket keeps it forever"** — this repository cannot see a bucket-side lifecycle
  rule and does not claim there is none.
- ⛔ **It is NOT a rollback procedure** — it preserves a starting point; it says nothing about how to
  unwind a half-run window. **G1 stays declined; W12 still has no written way back.**
- 🚨 **G4 is only HALF answered.** The original gap asked **two** things: (a) is the pre-window state
  lost to same-day overwrites — **answered**; (b) do two overwrites in one day **matter for the
  freshness marker `0219`-G4 will eventually read** — ⛔ **NOT answered by anyone.** `0219`-G4 is
  deferred, so nothing depends on it today; **do not record (b) as settled.**

### 🔥 The unwatched profile-certificate fuse

🚨 **The accepted cost of the `0219` split, restated because it is a date and not an adjective: the
TLS-certificate fuse stays UNWATCHED.** The live certificate's `notAfter` is ~~reported as~~ **2026-11-20**
with twice-daily renewal attempts from around **2026-10-21**, failing **silently** until TLS stops
serving. ~~⚠️ **PROVENANCE: those two dates come from a previous producer's report relayed through
`fkit-lead` and were NEVER VERIFIED — record them as reported, not established.**~~ What *is*
repo-verified is the twice-daily cron itself. **Weeks away, not this weekend — that is the whole of why
the deferral is affordable.** *(The runbook notes this "not this weekend" is a comparison about the fuse,
⛔ not a claim about when the window runs.)*

✅ **UPGRADED 2026-09-22 — BOTH CERTIFICATES MEASURED LIVE (read-only, by `fkit-lead`). Two boxes, two
certificates, two dates. The fuse date did NOT change; it is now ESTABLISHED rather than reported.**

| Box | Certificate expires (live reading, 2026-09-22) | Renewal cron |
|---|---|---|
| 🔴 **PROFILE box — this fuse** | **2026-11-20** ✅ confirmed correct; renewal attempts from **~2026-10-21** stand | `setup-profile.sh` |
| **TELEMETRY box — a different certificate, NOT this fuse** | **2026-12-13** (renewed by `0257`, issued 2026-09-14) | `setup-telemetry.sh` |

🚨 **The near-miss, and the useful part:** on 2026-09-22 a rewrite of this fuse **2026-11-20 →
2026-12-13** was proposed and relayed as a correction. ⛔ **It was WRONG and was REFUSED before it was
applied** — it compared the telemetry measurement against the profile fuse. Applied, the fuse would read
**three weeks later than it is**, and the affordability of `0219`'s G3/G4 deferral rests on this date.
⇒ **Never move a date between these two boxes. Always name the box before quoting a cert date.**

⚠️ **An expiry date is not a renewal test.** Both certificates being valid **today** says nothing about
whether either renewal will fire — it does not exercise `certbot renew`, the HTTP challenge or the
port-80 bind. **The silent-failure-from-~2026-10-21 concern is untouched**, and **the telemetry cert
being healthy does not watch the profile cert** — the profile fuse is **still UNWATCHED**. See
[[tasks/profile-le-certificate-renewal-proof]] and [[tasks/telemetry-cert-expired-renewal-cron]].

### 📛 Ruling letters in the runbook are namespaced `RUNBOOK-A` … `RUNBOOK-G` (owner ruling, 2026-09-22)

On 2026-09-22 **two independent A–G ruling sequences were issued the same day** — one on the sprint
plans, one on this runbook — so a bare *"Ruling E"* meant two different things depending on the file.
It bit in `0295`'s brief, which cites **both**. ⚠️ **Cause: `fkit-lead` issued both sets in separate
spawns without a shared namespace** — not a producer error, not any one document's. **Fix, owner-ruled
(*"Namespace the runbook's set"*): the runbook set is renamed; the sprint-plan set is untouched.**
⛔ **Label change only** — no ruling's content, authority, date or outcome changed.

| Old bare citation (runbook context) | Now | Recorded in the runbook as | The ruling |
|---|---|---|---|
| Ruling A | **RUNBOOK-A** | Conflicts **C1** | `0065` step 3 is OUT of the window |
| Ruling B | **RUNBOOK-B** | Conflicts **C2** | 🚨 two parts: the rotation (W8) is OUT **and** filed separately as `0294` — citing it for the removal alone loses why `0294` exists |
| Ruling C | **RUNBOOK-C** | Gaps **G1** | no rollback / abort section — *"Skip it — I know the boxes."* |
| Ruling D | **RUNBOOK-D** | Conflicts **C3** | the egress-IP work becomes `0295` on Sprint 5 |
| Ruling E | **RUNBOOK-E** | W0.1 and `0295`'s brief | measure the egress IP at W0 anyway |
| Ruling F | **RUNBOOK-F** | `0294`'s brief | `0294` stays on the Backlog board |
| Ruling G | **RUNBOOK-G** | `0220`'s brief | `0220` may close with the gap recorded — authorizes the wording, not a close |

**Four sequences share bare letters, and the owner ruled the collision ACCEPTED** (*"Leave them,
disambiguate by date"*): 2026-09-02 (`Ruling A`–`D`, Backlog board and a few briefs), 2026-09-17
(`Ruling A`/`B`, ADR-114), 2026-09-22 sprint plans (`RULING A`–`G`), and 2026-09-22 runbook (now
`RUNBOOK-A`–`G`). 🚨 **The test that makes this coherent: "is it being cited NOW", not "is it ambiguous
in principle."** Only the runbook set had a **live** document giving a reader a wrong answer; nothing
active cites the older sets. ⛔ **Do not re-open the other three as defects** — disambiguate them by
date. 📌 The runbook's own section labels (`C1`–`C3`, `G1`–`G4`) were never part of either sequence.

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
- [[tasks/forward-profile-internal-token]] — task `0062`, whose D1–D4 now run here as `0296` A1–A4 (W11, W13, W14)
- [[tasks/citizenship-earned]] — task `0017`, whose production tail (`0296` A5–A6) follows this window
- [[tasks/profile-match-end-crediting]] — the crediting path W14's watch observes; its acceptance check is `0296`-A3
- [[tasks/profile-le-certificate-renewal-proof]] — task `0216`, the PROFILE box certificate (2026-11-20) this page's fuse is about
- [[tasks/telemetry-cert-expired-renewal-cron]] — task `0257`, the TELEMETRY box certificate (2026-12-13) — a different box; never move a date between them
- [[tasks/profile-weekly-backup-copy-verified]] — task `0241`, the live-verified `copyto` the W0 snapshot reuses
- [[tasks/deploy-time-config-parity-guard]] — task `0064` — the parity and value guards that run report-only at W12
- [[tasks/config-parity-guard-pre-arming-gate]] — task `0203` — ruling 3, lifted for it 2026-09-23
- [[tasks/tenure-xp-grant]] — task `0253` — the tenure claim route that rides W3 (live from W3, 2026-09-26)
- [[tasks/profile-p2-wire-game-server]] — task `0217` — the XP go-live whose acceptance criterion W14 met
- [[tasks/profile-identity-s3-game-server-resolve-and-credit]] — task `0272` — the game-server resolve/credit path W12 shipped; watch item F-B
- [[tasks/profile-identity-s4-client-login-session]] — task `0273` — the client login W12 shipped and W13 checked
- [[tasks/profile-identity-epic]] — epic `0266`, closed once W12 put its last slices live
- [[tasks/profile-secret-persistence-value-parity]] — task `0220` — W3/W7's persist-or-reuse proof (step 3 cut to `0294`)
- [[tasks/game-prod-egress-ip-allowlist]] — task `0295` — W0.1's egress measurement (method only)
- [[tasks/feedback-telegram-delivery-failure]] — task `0061` — closed on W12's game deploy
- [[decisions/adr-112-free-xp-grants]] — the claim-on-behalf risk that opened at W3, 2026-09-26, when the tenure-grant route went live
