# Review — 0060

Task: [`brief.md`](brief.md) · Plan: [`plan.md`](plan.md) · Build: [`worklog.md`](worklog.md)
File(s) under review:
- `nginx.conf` (lever C)
- `update.sh` (lever A)
- `tests/scripts/profile-deploy-hardening.test.sh` — **only** the trailing
  `== Structural: container log retention (0060) ==` section (`:262-294`) and the header scope note
  (`:10-14`). The 5 deletions in that file's `git diff` are task `0195`'s uncommitted `env -i` work
  and are **not** attributed here.
- `ai-agents/knowledge-base/container-log-retention.md` (new)
- `worklog.md` (new)

Status: in-review

> **Finding ids use an `F` prefix, deliberately.** `plan.md` already owns `R1`–`R5` as **owner ruling**
> ids. Numbering findings `R1…` would collide with them in every later discussion. `F1`–`F8` below are
> findings; `R1`–`R5` anywhere in this task's artifacts remain the owner's rulings.

**Reviewers run (Round 1):** fkit-reviewer's own pass **+** Codex adversarial pass
(`codex-cli 0.152.0`, `codex exec --sandbox read-only`) — **both completed. Coverage is full; no
reviewer was skipped or degraded.**

**No production server was contacted.** No SSH, no `deploy.sh` / `build-deploy.sh`, no `docker`
against a live box. No source file was edited — this ledger is the only file this review wrote.

---

## Reviewer findings

| #  | Round | Sev    | file:line | Claim |
|----|-------|--------|-----------|-------|
| F1 | 1 | medium | `nginx.conf:121-122` · `ai-agents/knowledge-base/container-log-retention.md:57-58` | Of the three fallback-visibility mechanisms named as justification for `access_log off;`, **one is false and one is vacuous**. "OTEL server metrics": `initWorkerMetrics` is called only at `src/server/Worker.ts:136` under `config.otelEnabled()`; `src/server/Master.ts` — which serves this endpoint at `:194` — references **no metric at all**, and no OTEL HTTP/express auto-instrumentation package exists in `package.json`. So the master process emits **zero** metrics; there is no route metric and no process metric covering `/api/public_lobbies`. "The node-side handler (`src/server/Master.ts`)" is `res.send(publicLobbiesJsonStr)` with no logging and no counter (no `morgan`/`express-winston` anywhere in `src/server/`) — naming it as *visibility* is vacuous. Only "`X-Cache-Status` hit ratio" survives, and only partially: the header still reaches a manual `curl`, but no **ratio** is observable server-side — the default `combined` format never carried `$upstream_cache_status`, and with `access_log off` nginx now records nothing for this location. Raised by both reviewers. |
| F2 | 1 | medium | `tests/scripts/profile-deploy-hardening.test.sh:279,281` | The `--log-opt` assertions match flag **presence**, never **value** — the regexes end at `=`. **Verified empirically on isolated copies (the real files were never modified):** `--log-opt max-size=1m --log-opt max-file=1` passes **green**, yet it is valid Docker that deploys cleanly and reinstates a **1 MB** ring — far worse than the pre-change state this task exists to fix. That silent-but-valid case is the one that matters; `max-size=` (empty) and `max-file=banana` also pass green but at least fail loudly at `docker run`. Raised by both reviewers (Codex cited only the loud-failure cases; the silent value regression is this pass's addition, hence severity above Codex's Low). |
| F3 | 1 | medium | `tests/scripts/profile-deploy-hardening.test.sh:293` | The "server-level `access_log` still goes to stdout" assertion is a **file-wide `grep`**, directly contradicting the section's own claim at `:270` that the checks are "Scoped with awk so they cannot pass on a stray match elsewhere in the file". **Verified empirically:** set the server-level directive to `access_log off;` (site-wide logging silenced — the exact catastrophic direction this assertion exists to catch) and leave any `access_log /dev/stdout;` inside any `location` block, and the assertion **passes green**. This is the single guard against the worst plausible mis-"fix", and it is the same false-green class task `0202` was filed about. Raised by both reviewers. |
| F4 | 1 | low | `worklog.md:117` | "**Mutation test — proof the new assertions are not false-green**" overclaims. The mutation performed was **deletion only**; it proves the deletion class and nothing more. F2 (value regressions) and F3 (scope hole) both pass green under the shipped assertions. Ruling **R4** made honest scoping of this lint explicit and load-bearing, which raises the cost of the overclaim. The deletion mutation itself **reproduces correctly** — independently re-run this review; that part of the claim is sound. |
| F5 | 1 | low | `tests/scripts/profile-deploy-hardening.test.sh:276,279-285` | `RUN_BLOCK` extraction is coupled to line **formatting**, not to the command. **Verified empirically:** collapsing the `docker run` onto one line — every flag present, deploy behaviour byte-identical — turns three assertions **red**. Same class: the `^docker run -d` anchor means indenting that line (e.g. wrapping it in an `if`) fires the guard and reds the section. This is the **benign** direction (fails loud, never silent), so severity is low — but it makes an ordinary reformat look like a regression. |
| F6 | 1 | low | `ai-agents/knowledge-base/container-log-retention.md` (whole file) | The note is the designated "where does this live" record, and it **omits that lever C requires an image rebuild**. `nginx.conf` is baked into the image (`Dockerfile:87`), so a plain `deploy.sh` run ships lever A but **not** `access_log off;`. `worklog.md:195-197` (D-L4) states this plainly; `plan.md:114` states it; the knowledge-base note — the artifact a future operator will actually find — does not, and its "it ships on every ordinary deploy" (`:13`) is true of lever A only. |
| F7 | 1 | low | `worklog.md:246-249` (risk note) · `worklog.md:274-279` (D2) | Decision **D2** deliberately applied the flags to **every** environment `update.sh` deploys — `deploy.sh:3,39` accepts `dev\|staging\|prod`, all of which run `update.sh` — so the 1 GB worst case now applies on **three** boxes. The carried-forward risk note and the `D-L3` headroom gate are written for **one** box ("the disk", singular). D2 is a defensible call; the gap is that it widened the blast radius without widening the gate, and dev/staging headroom is named nowhere. |
| F8 | 1 | low | `tests/scripts/profile-deploy-hardening.test.sh:10-14` | The added scope note claims the file is "this repo's home for grep-level structural assertions over **ALL** the deploy scripts". It is not: `deploy.sh`, `build.sh` and `build-deploy.sh` have no structural assertions here, and `nginx.conf` is not a deploy script. Wording nit — the parenthetical that follows does enumerate the real coverage — but the sentence asserts a completeness that does not hold. Codex-raised; verified. |

---

## Coder response

_(coder-owned — `fkit-process-stateful-review` writes this section; the reviewer does not)_

**Round 1 processed 2026-09-01** by fkit-coder (Process-review worker of `/fkit-sprint-ship-loop`),
under the owner's dispositions relayed from the fkit-lead session.

**Every finding was verified against the files before any change. All eight reproduce.** F2, F3 and F5
were re-proven empirically on isolated copies before fixing; F1's three visibility claims were checked
against `src/` and `package.json` directly rather than accepted from the ledger.

| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| F1 | **Correct** — verified independently: `initWorkerMetrics` only at `Worker.ts:136`, zero metric refs in `Master.ts`, no OTEL HTTP auto-instrumentation in `package.json`, no `morgan`/`express-winston`, no `log_format` so built-in `combined` never carried `$upstream_cache_status` | Defect (false claim in the artifact meant to prevent a bad "fix") | Corrected the claim in **both** carriers — `nginx.conf` comment and `container-log-retention.md` — to state the real remaining visibility: `X-Cache-Status` header only (no server-side ratio), `error_log` genuine, handler and OTEL **not** fallbacks. **Lever C unchanged** per owner ruling. **No follow-up brief filed** — that option was declined. | **fixed** |
| F2 | **Correct** — reproduced: `max-size=1m max-file=1` passed green | Defect (silent regression, worse than pre-change) | Assertions now parse and check **values**. `EXPECTED_MAX_SIZE`/`EXPECTED_MAX_FILE` declared once; plus shape checks (`<digits><unit>`, and `max-file` integer **≥ 2**) that survive a deliberate re-tune. Now reds on 3 assertions. | **fixed** |
| F3 | **Correct** — reproduced: site-wide `access_log off;` + stray `/dev/stdout` in a location block passed green | Defect (false-green on the catastrophic direction) | Replaced the file-wide grep with a brace-depth-scoped extraction of **server-level directives only**. Added a direct "not off at server level" assertion and a matching `error_log` check. Now reds on 2 assertions. | **fixed** |
| F4 | **Correct** — the Round 1 mutation was deletion-only | Defect (overclaim; R4 makes honest scoping load-bearing) | `worklog.md` wording corrected in place to "catch the DELETION class", with a pointer to the Round 2 two-direction test that replaces it. | **fixed** |
| F5 | **Correct** — reproduced: one-line reformat reds 3 assertions | Frontier (benign direction — fails loud, never silent) | **Not fixed, per owner ruling.** Recorded as an accepted residual in the section's own comment so the next person recognises a false red rather than hunting a regression. | **accepted residual** |
| F6 | **Correct** — verified: the note had no mention of rebuild/`build-deploy.sh`/`Dockerfile`, and its `:13` "ships on every ordinary deploy" is true of lever A only | Defect (the artifact an operator actually finds omits the deploy path for half the task) | Added an explicit two-row table to `container-log-retention.md`: `update.sh` ships via `deploy.sh`; `nginx.conf` **needs `build-deploy.sh`** because it is baked into the image (`Dockerfile:87`). ⚠️ **No owner disposition was relayed for F6** — applied as an obvious winner and flagged; see worklog decision **D6**. | **fixed (disposition gap flagged)** |
| F7 | **Correct** — verified `deploy.sh:3,39` accepts `dev\|staging\|prod`, all running `update.sh` | Defect (D2 widened the blast radius without widening the gate) | Risk note and **D-L3** rewritten for **three** boxes, naming that dev/staging headroom is recorded nowhere. No disk total stated as fact, per R5. | **fixed** |
| F8 | **Correct** — verified: no assertions for `deploy.sh`, `build.sh`, `build-deploy.sh` | Defect (wording asserts completeness that does not hold) | Header now says it covers the deploy-related files that **have** assertions, and names the three that do not. | **fixed** |

**Levers C and A were not re-opened** — cleared by both reviewers, and nothing in my verification
contradicted that. **`nginx -t` remains deferred to D-L4 per R5.** **No production server was
contacted** in processing this round.

**Re-verification after fixes:** `bash -n` clean on both scripts; the whole harness **`ALL PASS`**
(12 assertions in this section, up from 7); two-direction mutation test — deletion **and** corruption —
both fail correctly, with both files restored **byte-identical by SHA-256**; `npm run lint` clean.
`npm test` reported in the worklog with the `0200` flake attribution, **not** as clean.

---

## Re-litigates settled decisions (suppressed) — Round 1

**Nothing was suppressed this round.** Recorded so the dedup is auditable: the following were primed
into the Codex prompt as settled, and **neither reviewer raised any of them**. None of F1–F8 touches
them.

- **1 GB / `100m × 10` is unmeasured** — settled by ruling **R3** (accepted as explicitly provisional).
  *Re-raise only if:* an artifact states 1 GB, or the circulating pre-change baseline, as a **sized
  fact**. Checked this round across all three required carriers — `update.sh:79-82`,
  `container-log-retention.md:36-45`, `worklog.md:223-227` — **the provisional marker is intact in all
  three, and neither number is stated as fact anywhere.** No defect.
- **The new assertions are a lint, not a gate; this repo has no CI** — settled by ruling **R4**.
  Stated in `worklog.md:229-233` and `container-log-retention.md:68-70`. *Re-raise only if:* an
  artifact implies automatic coverage. (F4 is **not** this — it is a narrower overclaim about the
  mutation test's reach, not about gating.)
- **Shipping logs off-box (option D)** — the acknowledged real fix, ruled **out of scope** by **R1**.
- **Separating the nginx access log back into its own file (option B)** — ruled **REJECTED** by **R1**
  (the 2026-07-15 32 GB failure mode; no `logrotate` in the image). Must not be reintroduced.
- **`nginx -t` was not run** — disclosed at `worklog.md:167-170` and folded into D-L4. Both reviewers
  independently validated the directive statically instead; see the cleared list below.

---

## Cleared by both reviewers — no finding

Recorded because these were the review's highest-priority questions and both passes cleared them
independently.

- **Lever C is correct and safely scoped.** `access_log` is valid in a `location` context; `off`
  cancels only the directives at that level, so it silences that one location and nothing else. It
  landed in the correct block — `location = /api/public_lobbies`, an **exact** match, which is what
  `src/client/PublicLobby.ts:137` actually fetches. **The server-level `access_log /dev/stdout;`
  (`nginx.conf:72`) is intact**, so every other location still logs. `error_log /dev/stderr;` is
  untouched, so nginx-level upstream failures on this endpoint are still recorded. **Lever C does not
  blind production.** (Static validation only — `nginx -t` remains D-L4, per R5.)
- **Lever A does what the plan claims.** Per-container `--log-opt` overrides the daemon default;
  `update.sh:43-61` does `stop` + `rm` of both running and stopped containers and `:86` is the single
  `docker run -d` in the file, so the flags are on the right invocation and a redeploy applies them.
  `max-size=100m` + `max-file=10` is valid syntax. **No drift path found:** `setup.sh:123,137` start
  only `node-exporter` and `otel-collector` (correctly declared out of scope), there are no compose
  files, and no other place starts the game container.
- **The Deferred Live Tail is honest.** All seven items (`worklog.md:182-208`) are unchecked `- [ ]`,
  each carries an explicit **Gate:**, and `worklog.md:7-11` + `:178-180` state plainly that no
  production server was touched and that every item is the owner's to run. **Nothing in any artifact
  implies production was verified.**
- **The `npm test` attribution holds.** The failure — `payments routes › POST
  /v1/payments/yandex/reconcile`, `thrown: "Exceeded timeout of 5000 ms"` — is
  `tests/profile-server/PaymentsRoutes.test.ts`, one of the four suites named in `CLAUDE.md`'s
  `### ⚠️ Known flake` section, in its **confirmed** timeout sub-shape, at a rate consistent with the
  documented 4–7 %/run. The task changed no TypeScript. `CLAUDE.md` requires ruling out `0197`'s
  `SIGSEGV` first — a per-test timeout message excludes a worker-killing signal by shape — and requires
  "re-run, and say that you re-ran", which `worklog.md:155-161` does (3 × 23/23). The worklog reports
  it as **not green** rather than clean, which is the correct posture. **No finding.**

---

## Convergence call — Round 1

This is a **genuinely additive first round**: eight novel findings, **zero re-litigation** of the five
settled positions, and the two changes that carry all the production risk (levers C and A) were
**cleared independently by both reviewers**.

**No fix recommended here carries regression risk.** F1/F6/F7/F8 are documentation corrections;
F2/F3/F5 strengthen a lint that gates nothing. None of them touches `nginx.conf`'s or `update.sh`'s
runtime behaviour, so acting on this round cannot destabilise what was cleared. Acting is cheap;
this is **not** a round to close out.

The natural grouping: **F1 is the one that matters** — it is a false claim written into the exact
comment whose job is to stop a future incident responder restoring the log line. **F2 + F3 together**
are the difference between a lint that catches the regression it was commissioned for and one that
does not. **F4 through F8** are honesty and completeness trims.

Recommended verdict: **⚠️ Changes requested — 8 defects, none blocking.**
