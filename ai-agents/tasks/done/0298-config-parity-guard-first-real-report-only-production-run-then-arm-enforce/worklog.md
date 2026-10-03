# 0298 — worklog

> Names and verdicts only. No value, host, address, id or length appears in this file.

## Part A — the first real report-only production run (`0064` verification step 8)

**Sources.** (1) The W12 relay recorded in the brief's *2026-09-26 deploy window — results* box and in
`weekend-deploy-slot-runbook.md` § *2026-09-26 — THE WINDOW RAN* (owner-executed, relayed by `fkit-lead`,
"as relayed"). (2) A reproduction run by the Build worker on 2026-09-28: the checker from each deployed tag
was run over that tag's own tracked files (`git archive <tag>` into a scratch folder outside the repo,
`--pipeline=all --report-only`). ~~The reproduction is exact because the name guard reads git-tracked files
only.~~

> **Correction (2026-09-28, review round 1, finding R2).** The struck sentence is wrong. The name guard
> walks `src/` on disk (`walkTypeScript` in `scripts/check-config-parity.mjs`), so an untracked or
> uncommitted `src/` file on the deploying machine is scanned too. A `git archive` reproduction shows what
> the **tagged tree** produces, not what the deploy **run** printed. So:
> - **`0.0.152` (W12):** confirmed — the relay and the reproduction agree.
> - **`0.0.153` / `0.0.154`:** reproduced from the tag only; their run output was never relayed. They carry
>   the same **"if the tree was clean then"** caveat as W3/W7 below. ⚠️ Not confirmed.

### A1. Name guard (parity) — REPRODUCED on all three prod deploys of 2026-09-26

| Tag | game | profile | client | INERT | SKIP / PARSE-FAILURE / DYNAMIC-READ | last line |
|---|---|---|---|---|---|---|
| `0.0.152` (W12) | REQUIRED 0 · INFO 6 · ALLOWED 4 | REQUIRED 0 · INFO 0 · ALLOWED 0 | REQUIRED 0 · INFO 1 · ALLOWED 15 | 11 | none | `report-only — exit 0` |
| `0.0.153` | same | same | same | 11 | none | same |
| `0.0.154` | same | same | same | 11 | none | same |

- Identical to the W12 relay.
- ⚠️ *(Correction 2026-09-28, R2 — see Sources.)* Only the `0.0.152` row is confirmed against a real run.
  The `0.0.153` / `0.0.154` rows are the tagged tree's output, exact for the deploy run only if the tree was
  clean then.
- ⇒ **`0064`'s prediction of zero required gaps HELD** — measured on three real deploys, not hand-counted.
- **W3 / W7 (profile deploys): INFERRED, not captured.** Their output was never relayed. The code they ran
  differs from `0.0.152` only in the version bump, so they ran the same checker over the same tracked
  files — **if the tree was clean then**, which was not recorded. ⚠️ Flagged as inferred.

### A2. Every INFO line, understood (INFO can never block: it is outside `failsClosed`)

| Name | Pipeline | Verdict |
|---|---|---|
| `DOCKER_TOKEN` | game | Appears only in `deploy.sh`; nothing on the box reads it. Explained in `0064/plan.md`; hygiene is `0045`/`0047`. |
| `OTEL_USERNAME`, `OTEL_PASSWORD`, `OTEL_ENDPOINT` | game | Only in `deploy.sh`; nothing reads them. Dead config. |
| `BASIC_AUTH_USER`, `BASIC_AUTH_PASS` | game | Only in `deploy.sh`; nothing on the box reads them. ⚠️ **Side note, NOT fixed here:** `--enable_basic_auth` therefore protects nothing on the game box. A producer brief is suggested; not filed. |
| `WEBSOCKET_URL` | client | Substituted by webpack, read by nothing (`0064` review R2). |

### A3. Value guard (W12, prod) — as relayed

- REQUIRED **1** = `OTEL_AUTH_HEADER — forwarded but EMPTY`. **Explained:** the game server adds the
  header only when the value is set (`src/server/Logger.ts:23`, `src/server/OtelTracing.ts:14`,
  `src/server/WorkerMetrics.ts:33`) and still creates its exporters without it; the telemetry side needs no
  auth (`setup-telemetry.sh:886-887`, `:452-477`). Resolved by owner ruling Q1 (below) + allowlist entry
  (Part B, B6) — not by a quiet entry.
- OPTIONAL 5, OK 18, UNCHECKED 6, last line `report-only — exit 0`.
- `PROFILE_INTERNAL_TOKEN` was **not** REQUIRED at W12 (present).
- ⚠️ **Not relayed:** the value guard's output for `0.0.153` / `0.0.154`. It cannot be reproduced without
  the prod settings file. W12 is the run the brief requires, so this does not block.

### A4. No value leaked

The relayed W12 lines carry names only, and the relay found no `PROFILE_INTERNAL_TOKEN=` string in the
deploy log (as relayed). The reproduction above printed names only.

### A5. Verification-step verdicts (Part A)

| Step | Verdict |
|---|---|
| 1 — W12 (and W3/W7) output, names only | ✅ W12 (relayed + reproduced) · ⚠️ W3/W7 inferred, not captured · ⚠️ `0.0.153`/`0.0.154` tag-reproduced only, not confirmed against their runs (correction 2026-09-28, R2) |
| 2 — every REQUIRED / PARSE-FAILURE / DYNAMIC-READ line explained | ✅ one REQUIRED line, explained; zero PARSE-FAILURE / DYNAMIC-READ / SKIP (reproduced) · prediction HELD |

## Owner rulings (2026-09-28, live via `AskUserQuestion` in the `fkit lead` session, relayed by fkit-lead)

- **Q1:** "Arm both; password may be blank (Recommended)" ⇒ B3 + B6.
- **Q2:** "No override (Recommended)".
- **Q3:** "Yes, check names first (Recommended)" ⇒ B5.
- **Assumption accepted with approval:** a missing `node` stops the deploy, the same as a missing guard script.
- **Plan approval:** "Approve (Recommended)".

## Part B — arming (Build worker, 2026-09-28, spawned by `fkit-sprint-ship-loop`)

### Change list

| Item | File | What |
|---|---|---|
| B1 | `scripts/check-config-parity.mjs` | New `--block-on=<pipelines>`: needs `--enforce`; each name must be a known pipeline that `--pipeline` selects; otherwise exit 2. `failsClosed` now counts only blocking findings: REQUIRED in a `--block-on` pipeline, plus a PARSE-FAILURE / DYNAMIC-READ / SKIP tagged `global` or overlapping `--block-on`. Without `--block-on`, unchanged (fails on everything). Footer: `enforce (blocking: …) — failing on the findings above` / `— no blocking findings; N finding(s) for other deploys printed above, not blocking` / `— no required findings`. JSON gains `blockOn`. Header EXIT CONTRACT rewritten. |
| B2 | `deploy.sh` | Name guard: missing checker → exit 1; missing `node` → exit 1; `--pipeline=all --enforce --block-on=game,client`, non-zero → exit 1 with the fix path. Placement unchanged (before the first env load). |
| B3 | `deploy.sh` | `run_config_value_guard` returns non-zero on: missing checker, missing `node`, failed `--list-sources`, empty source list, and the checker's own `--enforce` exit status (explicit `return`, no reliance on `set -e`). Call site: `run_config_value_guard \|\| { echo …; exit 1; }`. Placement unchanged (after the `update.sh` copy, before the ssh). |
| B4 | `build-deploy-profile.sh` | Same shape as B2 with `--block-on=profile`; the "`-f` guard keeps this silent inside the harness" comment replaced by a note on the harness stub. On-box value report (`setup-profile.sh`, task `0220`) untouched — still report-only. |
| B5 | `build-deploy.sh` | Early name check before STEP 0 (same flags and stops as B2). |
| B6 | `scripts/config-parity-allowlist.json` | `OTEL_AUTH_HEADER` · `game` · `optional` · `phase: 2`, reason citing the three code sites and the collector evidence. Parity INERT 11 → 12. |
| check-values header | `scripts/check-config-values.mjs` | EXIT CONTRACT comment only: armed, what stops. No code change. |
| Tests | `tests/scripts/ConfigParity.test.ts` | New describe *0298 — per-deploy blocking*: 15 rows (each ruled edge, both deploys), clean fixture, footer count, no-`--block-on` unchanged, JSON `blockOn`, 6 usage errors, a mutation check (tag filter off ⇒ R14 row goes red), real tree armed ⇒ exit 0. Inert list + 2 comments updated. |
| Tests | `tests/scripts/ConfigParityCallSites.test.ts` (new) | Real `deploy.sh` / `build-deploy.sh` / `build-deploy-profile.sh` + real checkers + a copy of `src/` in a scratch tree, stub ssh/scp/docker/git/sshpass. Seeded game gap stops the game deploys with zero stub calls; clean tree deploys (`scp`, `ssh`); profile-only finding prints, doesn't block the game deploy (and vice versa); missing checker / no `node` stop all three; prod value problem stops `deploy.sh` after the `scp`, before the `ssh`. |
| Tests | `tests/scripts/ConfigValues.test.ts` | Deliberate updates to the report-only pins: `CLEAN_PROD.OTEL_AUTH_HEADER` blank (as prod); `SHIPPED_OPTIONAL` + `OTEL_AUTH_HEADER` ("six"); D: OK 19 → 18; H prod test: `(enforce)` header, `OPTIONAL  6`, failing footer, `guard-exit=1`; "absent → skips, 0" became "absent → stops, 1"; new: clean prod → 0, failing `--list-sources` → stop, empty list → stop, checker exit status passed through, no `node` → stop; call-site pin is the new `\|\| { …; exit 1; }` line and forbids `\|\| true`. |
| Tests | `tests/scripts/profile-deploy-hardening.test.sh` | On top of `0285`'s uncommitted lines (untouched): `run_deploy` writes a stub checker (records argv, exits `STUB_PARITY_RC`, omitted with `PARITY_STUB=absent`); new T19: passing stub ⇒ deploy proceeds and argv is exactly `--pipeline=all --enforce --block-on=profile`; exit-1 stub ⇒ fails closed, no docker/SCP/record/lock; missing checker ⇒ fails closed; grep: armed flags, no `\|\| true` / `--report-only`, guard above the first `load_env_file`. Success marker unchanged. |
| Docs | `CLAUDE.md` | The one `check:config-parity` line: notes the deploys now enforce. |
| Docs | `ai-agents/knowledge-base/weekend-deploy-slot-runbook.md` | Dated W12 pointer: the checkboxes describe the window as it ran; later deploys are armed. |

### Decision log (unattended calls — ADR-019 audit obligation)

Fixes applied under a review: **none** (this is the build step; no review has run).
*(Build-step record, unchanged. The review round 1 record is in "Decision log — review round 1" below.)*

Obvious-winner / in-plan calls made without asking:

1. **`--block-on` must name pipelines `--pipeline` selects (else exit 2).** Not in the plan's wording.
   *Why it qualified:* in-plan intent (B1 "loud usage error" + "call sites keep `--pipeline=all`"); a
   non-selected pipeline is never analysed, so its REQUIRED count would read 0 and the run would pass
   silently — a false green. Refusing is the only safe reading. Call sites are unaffected (`all`).
2. **Footer when blocking on a subset and there are zero findings anywhere:** `enforce (blocking: …) — no
   required findings`. The plan gave two footer forms; this third, zero-findings case mirrors the existing
   `enforce — no required findings`. Mechanical.
3. **`CLEAN_PROD.OTEL_AUTH_HEADER` set to blank** in `ConfigValues.test.ts` instead of keeping `"x"`.
   *Why:* the plan's "OPTIONAL 5 → 6" only holds with the header blank, and blank is the real prod shape.
   Consequence recorded in the test: D's OK count 19 → 18.
4. **Call-site end-to-end tests live in a new file** (`ConfigParityCallSites.test.ts`), not inside
   `ConfigParity.test.ts`. The plan named no file for them; the parity file tests the checker only.
5. **Added one extra row, "a REQUIRED finding in game"**, to the per-deploy table (the plan listed the
   profile mirror only). Pure test addition.
6. **Two extra value-guard tests** beyond the plan's list: "empty source list → stop" and "checker exit
   status passed through". Both pin behaviour B3 specifies.

### Decision log — review round 1 (Process-review worker, 2026-09-28, spawned by `fkit-sprint-ship-loop`)

Fixes applied without per-fix owner approval, under the approved plan's standing approval (ADR-032/ADR-019):

1. **R1 — the T19 "no `|| true` / no `--report-only`" grep could never fire.** *What changed:* in
   `tests/scripts/profile-deploy-hardening.test.sh` (T19), the pattern now matches any **non-comment** line
   naming the checker by its variable **or** its filename (`PARITY_CHECKER|check-config-parity.mjs`) that
   carries `|| true` or `--report-only`; the old one needed the filename, which the call line no longer
   spells. *Mutation proof:* two realistic swallows of the call line (`if ! { node … || true; }; then` and
   `--report-only` in place of `--enforce --block-on=profile`) each make this check go red in a mirrored
   harness run; the old pattern missed both; the unmutated harness is green. *Why it qualified:* verified
   `CORRECT`, a one-line test change, inside plan item "Grep: the call site has no `|| true`". Success
   marker unchanged.
2. **R2 — "the reproduction is exact because the name guard reads git-tracked files only" was wrong.**
   *What changed:* the Part A sentence is struck, not deleted, with a dated correction under it and a note
   under the A1 table; step-1 verdict in A5 annotated. Header wording in `scripts/check-config-parity.mjs`
   (the *WHAT IT DOES* paragraph, and the same looseness in the *Inputs* comment) now says it reads files on
   disk and the `src/` walk picks up untracked files. Comment-only; no behaviour change. *Why it
   qualified:* verified `CORRECT` (the `src/` walk is a filesystem walk), doc-only, inside the plan's
   Part A record.

Obvious-winner calls: **one** — the *Inputs* comment in the checker had the same "git-tracked" looseness
as the header the finding named; fixed with it (same wording defect, comment-only, within R2's intent).

## Verification steps (Part B) — state at build

| Step | Verdict |
|---|---|
| 3 — both call sites `--enforce`; seeded gap stops the script; clean tree exits 0 | ✅ `ConfigParityCallSites.test.ts` (real scripts, real checker) |
| 4 — each `0203` ruled edge, one test per edge | ✅ *0298 — per-deploy blocking* describe |
| 5 — no Phase 2 check armed without one real report-only deploy | ✅ the value guard saw W12 (`0.0.152`) report-only before arming; its one finding is resolved by Q1 + B6 |
| 6 — `npm test`, `npm run lint` | see the Build worker's hand-back (run results) |
| 7 — no value printed | unchanged guarantees; all new messages are fixed text or names; tests use fake values |

## Owner steps (not done here — no deploy, no SSH, no box access by the Build worker)

1. **Before the first armed PROD deploy (Q1):** in Uptrace, confirm prod game-server logs or metrics arrived
   after 2026-09-26 (`0.0.152`+ run with the header blank). UI check only.
2. **Review, then commit on the owner's word.**
3. **First armed deploys, in order:** profile (`npm run deploy:profile`; the guard runs before build and lock)
   → game dev if a dev box is in use → game prod (`./build-deploy.sh prod`; name problems now stop before the
   version bump; value problems still cost a version number). Record each first armed run's guard output here
   (names only) — closes verification step 5's record.

   > 📌 **2026-09-29 — for the next slot the owner ruled GAME BEFORE PROFILE** (OWNER RULING live in the
   > `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer`, ADR-021; ⛔
   > not producer precedent). Owner's answer: **"Game first, record it (Recommended)"**, option text *"Keeps 0250's
   > client-first rule. Cost: a few minutes where the new login check isn't counted yet, and the rarely used name
   > 'Hide' button shows an error until profile is deployed. Nothing breaks or is lost. ADR-116 and 0339 get a
   > dated note."* **Why:** "profile first" above was chosen **for cost only** (`plan.md` § *Deploy order*: the
   > profile guard runs before build and lock, so a block there costs nothing). This slot's profile build also
   > carries `0250` S1's server half, and `0250`'s rule is **client first** — that outranks a cost preference.
   > The slot's order is **telemetry → game prod → profile**. What it costs this task: the first armed name guard
   > now runs in `build-deploy.sh` (before the version bump, so a name block still costs nothing); a **value**
   > block on the game deploy still costs a version number. No dev-box step is planned in that slot. The
   > pre-flight `node scripts/check-config-parity.mjs --pipeline=all --enforce --block-on=game,client,profile`
   > (exit 0 when `fkit-architect` ran it on 2026-09-29) lowers that risk. Full step list:
   > [weekend-deploy-slot runbook](../../../knowledge-base/weekend-deploy-slot-runbook.md) § *Next window — plan
   > (written 2026-09-29)* (owner step 1 = its N0.4). The order above is kept as history.
4. **Rollback if a false block appears:** add an allowlist entry WITH a reason, or restore
   `--report-only || true` on the one call-site line (and `run_config_value_guard || true`), commit, redeploy.
   No override flag exists (Q2).

## 📌 2026-09-29 — owner step 1 done; first armed deploys ran (appended; nothing above edited, ADR-035)

**Provenance.** Written by a spawned `fkit-producer` (no owner channel, ADR-021) on an OWNER RULING given live in
the `fkit lead` session via `AskUserQuestion` on 2026-09-29, relayed by `fkit-lead`: **"Yes, do all three
(Recommended)"** — item 3 (*record tonight's deploy*). ⛔ Not producer precedent. Facts are `fkit-lead`'s own checks
and the owner's live reports; the producer verified none. The task stays closed as it was; no status changed.

- **Owner step 1 (Q1) — done 2026-09-29, before the deploys**, by `fkit-lead` through the owner's Chrome, in
  Uptrace: service `openfront` (game server) logs arriving on 2026-09-29, ~165 info lines/min, 1 host. ⚠️ **Logs
  only, not metrics; the environment label was not seen.** (Runbook N0.4.)
- **Owner step 3 — the first armed deploys ran on 2026-09-29**, in the order **telemetry → game prod → profile**
  (the order in the dated note above). Pre-flight `--enforce` over all pipelines: exit 0, REQUIRED 0. **The guards
  did not stop any deploy** (owner reported no failure). ⚠️ **The guards' own output (names) was NOT captured**, so
  the record this step asks for — *"Record each first armed run's guard output here (names only)"* — does not
  exist for these runs. Game tag / version: not recorded.
- **Related rule, now filled:** the runbook's *"after this slot, keep an S2-or-later profile image"* (S3a's future
  rollback target) is now profile image `sha256:75fd196a18223e546122b031239596b92f2987fc9bd1626a0bb71e5e8eee28e0`.
- Full record: [runbook](../../../knowledge-base/weekend-deploy-slot-runbook.md) § *What happened 2026-09-29*.

## 📌 2026-10-03 — owner step 3 record: armed guard output captured (appended; nothing above edited, ADR-035)

**Provenance.** Written by a spawned `fkit-producer` (no owner channel, ADR-021) on an **OWNER RULING given live in
the `fkit lead` session via `AskUserQuestion` on 2026-10-03, relayed by `fkit-lead`: "Yes, record it
(Recommended)"**. ⛔ Not producer precedent. The task stays closed as it was; **no status changed, no file moved.**
Facts: the deploy output as the owner relayed it, read by `fkit-lead`. Names only.

This is the record owner step 3 asked for (*"Record each first armed run's guard output here (names only)"*), which
did not exist for the 2026-09-29 runs. Window order: telemetry → dev → game prod → profile.

- **Game prod (0.0.156, commit `f712263`) — name guard:** REQUIRED **0** on game / profile / client. **Value guard**
  (deploy env prod): REQUIRED **0**, OPTIONAL **6** — `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`,
  `STORAGE_BUCKET`, `OTEL_AUTH_HEADER`, `FEEDBACK_WEBHOOK_URL` (blank by recorded decision) — OK **18**, UNCHECKED
  **6**. Docker secret boundary + per-layer byte scan: passed. **No block.**
- **Profile (`0.0.156-profile.1`, commit `f712263`) — name guard:** REQUIRED **0** (blocking: profile). **No block.**
  ⚠️ The on-box value check (`report_config_values`) output was **not captured**.
- **Dev (`0.0.155-dev.1`):** guard output **not captured**.
- **Telemetry:** has no config-parity guard — nothing to record.
- Pre-flight `--enforce` over all pipelines: exit 0, REQUIRED 0 on game / profile / client (lead).

Full window record: [runbook](../../../knowledge-base/weekend-deploy-slot-runbook.md) § *What happened 2026-10-03 —
weekend window ran*.

## 📌 2026-10-03, later — profile on-box value check captured (appended; nothing above edited, ADR-035)

Same OWNER RULING (**"Yes, record it (Recommended)"**, relayed by `fkit-lead`; ⛔ not producer precedent). Source:
**owner-pasted** profile deploy output. The on-box **CONFIG VALUE PARITY** (report-only, `setup-profile.sh`
`report_config_values`) printed **13 OK**: `PROFILE_DOMAIN`, `FEEDBACK_TELEGRAM_TOKEN` + `FEEDBACK_TELEGRAM_CHAT_ID`,
`TELEGRAM_PROXY_URL`, `PROFILE_ALERT_WEBHOOK_TOKEN`, `TELEGRAM_TOPIC_ALERTS`, `TELEGRAM_TOPIC_NAME_CHANGES`,
`YANDEX_PAYMENTS_SECRET`, `PROFILE_INTERNAL_TOKEN` (source: environment), `PROFILE_SESSION_SECRET`,
`PROFILE_CHECKS_PING_URL`, `PROFILE_BACKUP_S3_ENDPOINT`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `PROFILE_LOGIN_CREATE_ENABLED`
(login creation ENABLED — normal). *"Value parity: 0 finding(s), 0 optional, 13 ok"*; *"OTLP ingest reachable (HTTP
200)"*. Names only. ⇒ The *"on-box value check … not captured"* line above is **now resolved** (left as written). Still
not captured: dev's guard output.
