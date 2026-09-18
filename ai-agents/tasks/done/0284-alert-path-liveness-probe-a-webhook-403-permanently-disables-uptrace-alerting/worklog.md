# Worklog — `0284` alert-path liveness probe

Build worker, spawned by `fkit-sprint-ship-loop` on 2026-09-18 under the declared-approval marker.
Implemented steps 1–7 of `plan.md` (verified `git hash-object` = `d596cf3d78d9bbb4147d28c5b5df7964702a0b53`,
`wc -c` = `25396`, both matching the pasted plan before any edit). ⛔ `plan.md` untouched.

Nothing committed, nothing pushed. No task file moved.

---

## What the guard is, end to end

```
monitoring box host cron (hourly, :17)
  → POST {"payload":{"secret":…,"probe":"liveness"}}
       same public HTTPS name · same nginx `~* ^/internal/` allowlist · same route · same shared secret
    → relay: parse → secret check → PROBE branch → marker written, NOTHING sent, 200
       → profile-checks.sh (daily 08:00 UTC) reads the marker's age
          → stale/missing ⇒ FAIL ⇒ POST $PROFILE_CHECKS_PING_URL/fail
             → EXTERNAL dead-man's switch pages the owner (touches neither Uptrace nor Telegram)
```

---

## Change surface

| File | What changed |
| --- | --- |
| `src/profile-server/AlertRelay.ts` | `ALERT_PROBE_MARKER_PATH`, `ALERT_PROBE_KEY`, atomic `writeMarkerFileAtomically`, `payload.probe` in the schema, `markerPath` / `writeMarkerFile` test seams, the `probe` decision kind + its `decide()` branch (after the secret check), `writeProbeMarker()`, the handler's 200 branch |
| `src/profile-server/Telemetry.ts` | `"probe"` added to `AlertRelayResult`; series-count comment `6 × 2 = 12` → `7 × 2 = 14` |
| `setup-profile.sh` | `mkdir -p $PROFILE_DIR/alerts` + `chmod 700`; `profile-api` gains `volumes: - ./alerts:/var/lib/profile/alerts`; one deploy print line |
| `profile-checks.sh` | `PROBE_MARKER`, `MAX_ALERT_PROBE_AGE_HOURS` (default 3) registered in `int_or_default`, `check_alert_probe()` as check 11, added to the call list, header comment block |
| `setup-telemetry.sh` | new section: `persist_or_reuse_probe_value` (no generate mode at all), `alert-probe.env` (0600), `alert-probe.sh` (0700), the hourly cron line after the certbot line, the configured/NOT-configured final print, header docs |
| `build-deploy-telemetry.sh` | two `export` lines in the 0600 staged-env heredoc + the comment explaining the hop |
| `example.env.telemetry` | documents both variables, where the secret belongs, and the no-`"`/no-`\` constraint |
| `tests/profile-server/AlertRoutes.test.ts` | `build()` gains a per-harness `mkdtemp` marker dir; 12 new probe tests |
| `tests/profile-checks.sh` | `write_probe_marker()`, fresh marker in `reset_fixture()`, case `C22` (13 assertions), **5 re-baselined count assertions** |
| `tests/scripts/profile-deploy-hardening.test.sh` | 7 new structural assertions (modes, stdin-body, no `set -x`, cron line, both deploy exports, never-generate, marker-path drift guard) |
| `ai-agents/knowledge-base/alert-delivery-runbook.md` | the guard, the diagram, the component table, a bring-up step 6, the "what it does NOT prove" list, two surprise modes, a when-it-fails procedure; the `0274` §7.6 bound updated |

⛔ No hostname, IP address, chat id, topic id or secret was written into any of these.

---

## Verification — every gate, actually run

| Gate | Result |
| --- | --- |
| `npx tsc --noEmit` | clean, exit 0 |
| `npm run lint` | clean, no output |
| `npx prettier --write tests/profile-server/AlertRoutes.test.ts` | applied |
| `npm test` | **137 suites / 1846 tests, all passed**, 77.6 s |
| `npm test -- tests/profile-server/AlertRoutes.test.ts` | 67 passed (12 of them new) |
| `bash tests/profile-checks.sh` | `RESULT: 110 passed, 0 failed` |
| `bash tests/scripts/profile-deploy-hardening.test.sh` | `ALL PASS` |
| `npm run check:config-parity` | clean — `REQUIRED 0` on every pipeline, shape unchanged (no new app env var) |
| `bash -n` over all 6 changed shell files | all OK |

No supertest flake and no `SIGSEGV` occurred; nothing needed a re-run.

**Cost, measured on this host (macOS, Docker up).** Under jest, the four harnesses were
docker-boundary 6.5 s · hardening 64.1 s · backup-redeploy 1.4 s · profile-checks 13.9 s. The docker
boundary harness **ran** (it did not skip).

Baseline vs current, measured directly by running the `HEAD` copy of each harness:

| Harness | HEAD | with 0284 |
| --- | --- | --- |
| `tests/profile-checks.sh` | 11.5 s | 12.8 s (+9 `env -i bash` spawns) |
| `tests/scripts/profile-deploy-hardening.test.sh` | 50.5 s | 32.0 s |

⚠️ The hardening figures are **noise, not a speed-up** — that harness sits at 9–13 % CPU waiting on
subprocesses, so a single run tells you nothing about a delta this small. What the pair does establish
is that 0284's seven greps are not a measurable cost.

⚠️ **`CLAUDE.md`'s testing section is now stale on two numbers and I did not change it** (out of the
approved plan): it documents *113 suites / 1185 tests* and *~22–25 s* for `npm test`, and *~16 s* /
*~5 s* for the hardening and profile-checks harnesses. The measured values above are far higher, and
the `HEAD` baselines show that drift is **pre-existing**, not something 0284 introduced.

### Beyond the plan's gates — the generated probe script, actually exercised

`setup-telemetry.sh` writes `alert-probe.sh` from a heredoc, so nothing in `npm test` runs the
resulting file. I rendered it and drove it with a stub `curl`:

- valid JSON body on **stdin**: `{"payload":{"secret":"…","probe":"liveness"}}` — parsed back with `node`
- the secret appears **nowhere** in the curl argv
- happy path exit 0 · curl-fails path exit 1 · unconfigured path exit 1
- `bash -n` clean

🚩 **Observed, accepted, not fixed:** run as a **non-root** user the script prints
`/var/log/uptrace-alert-probe.log: Permission denied` to stderr and loses its log line; the exit code
is still correct. On the box it runs as root (cron `root`, and the hand-run is root), so this is
cosmetic. Left alone deliberately — see decision 6.

---

## 🚨 What this does NOT cover — unchanged from the plan, restated so it is not lost

- ⛔ **It cannot see an ALREADY-disabled channel.** A transient 403 yesterday + a correct address today
  = green probe, dead alerting. It catches the **CAUSE** within ~24 h, never the **STATE**. Owner ruled
  this a **separate follow-up task** (D4) — **that task has not been filed.** See *What's next*.
- ⛔ **It does not check the secret Uptrace's own channel config holds** — a second, separate copy.
- ⛔ **It proves nothing about Telegram delivery** (marker on receipt, before any send) and nothing
  about a message reaching a human.
- ⛔ **It does not prove a monitor is attached to the channel.**
- ⛔ **It does not discharge `0274` amendment A1**; and an hourly probe may **mask** an idle-path defect
  on that hop by keeping NAT/conntrack warm.
- ⚠️ **The SNAT assumption is unproved** — that Uptrace's container egress and a host-run curl leave
  from the same address. **The drill is what verifies it.**
- ⚠️ **`check:config-parity` does not reach telemetry variables**; the hardening harness is the only gate.
- ⚠️ **One host, no CI.**

---

## What the owner must do

**Deploy — order matters, one window:**

1. `./build-deploy-profile.sh` — relay marker-write + bind mount + check 11 land together.
   🚩 **`alert-path-probe` FAILS until the first probe arrives.** Do not stop here.
2. `./build-deploy-telemetry.sh` with `TELEMETRY_ALERT_PROBE_URL` and `PROFILE_ALERT_WEBHOOK_TOKEN`
   set in the gitignored telemetry env files (the token in `.env.telemetry.secret`).
3. Run `/opt/uptrace/alert-probe.sh` once by hand on the monitoring box (exit 0 = accepted), then
   confirm the marker exists on the profile box and `/opt/profile/checks.sh` reports
   `alert-path-probe … OK`. **Finish this before the next 08:00 UTC** or that run pages for nothing.

**The drill — owner ruled (D3) to run it RIGHT AFTER the deploy, at the console:**

4. Remove the monitoring box's egress address from `PROFILE_INTERNAL_ALLOW_IPS`, redeploy the profile
   box, confirm the probe now fails and the marker stops advancing.
5. Force `profile-checks.sh` to run; confirm the dead-man's switch pages with the `alert-path-probe` reason.
6. Fire a real alert (runbook §7.6 drill) so Uptrace's own attempt is refused ⇒ confirm the channel is
   now **DISABLED**. This also proves probe and alert share one egress address.
7. Restore the address, redeploy, confirm the probe recovers and the check is OK again.
8. 🚨 **Re-enable the notification channel in the Uptrace UI and confirm alerting is live.**
   ⛔ **Fixing the address does not undo the disable.** Anyone who runs 4–6 and walks away has turned
   alerting off.
9. Regression: confirm a real alert still reaches Telegram, and that the probe never produces one.

⚠️ **Step 6 deliberately leaves live alerting disabled until step 8 completes.**

---

## Decision log — every judgement call made while unattended

Per ADR-019's audit obligation. All of these are mechanical/localized and inside the approved plan;
none is a frontier-move, a scope change or a behaviour change beyond it. **No fix was applied to any
review finding (no review has run yet), and no obvious-winner call was made against a plan option.**

1. **`fs` seam shape: `writeMarkerFile(path, contents)`, with atomicity inside the default.**
   The plan named a `writeMarkerFile?` seam and an atomic temp+rename, without fixing the signature.
   Chose a single-function seam so the **real** atomic write runs in tests (tests pass `markerPath`
   only; the seam is used solely to simulate a write failure). A seam that replaced the atomicity
   would have left the shape untested — and the shape is the contract with the shell reader.

2. **Marker file mode `0600`.** Not specified. The container and the checker both run as root, and the
   marker holds nothing secret, so this costs nothing and matches every other file this stack writes.

3. **Probe detection reads `data.alert !== undefined || data.id !== undefined`** for "carries real
   alert fields" (plan: "no `alert` object and no top-level `id`"). Direct transcription. An unknown
   `probe` VALUE also falls through to delivery — the same fail-toward-delivery direction, and it is
   tested.

4. **`persist_or_reuse_probe_value` is a NEW function in `setup-telemetry.sh`, not a copy of
   `setup-profile.sh`'s `persist_or_reuse_secret`.** The two scripts share no library, and the profile
   version carries a `generate` mode the plan forbids here. Writing it without a generate branch at all
   makes "never generated" structurally true rather than a convention — and the harness asserts the
   branch is absent, not merely unused.

5. **Harness assertions scoped to extracted blocks, and comment-stripped.** My probe script *comments*
   name `set -x` and `ALERT_PROBE_SECRET` (that is the warning to the next editor), so a naive
   file-wide grep would have gone red on its own documentation. Used the existing house pattern
   (`grep -v '^[[:space:]]*#'`, awk-extracted heredoc), same as the 0060/0219/0276 blocks.

6. **Left the probe's non-root `Permission denied` on the log write alone.** Silencing it with
   `2>/dev/null` would also hide a genuine "cannot write the log" condition, and nothing reads that
   log's history anyway. Not in the plan; the box runs it as root. Recorded, not fixed.

7. **Did not run Prettier over `alert-delivery-runbook.md`.** It was **already** not
   Prettier-clean at `HEAD` (verified against the `HEAD` blob), so formatting it would have produced a
   large diff unrelated to this task. Formatted only `tests/profile-server/AlertRoutes.test.ts`, which
   is gated.

8. **Added a bring-up step 6 to the runbook's existing "Bringing it up, in order" list**, alongside
   the extension plan step 7 named. Same file, same section family, no second runbook — it is where a
   reader deploying this will look, and it carries the "do it before 08:00 UTC" warning.

9. **Did not update `CLAUDE.md`'s stale test counts/timings.** Outside the approved plan, and the
   drift is pre-existing (proved by the `HEAD` baselines above). Surfaced instead of silently fixed.

---

# Round 1 review — response, fixes, and the gates re-run (2026-09-18)

A spawned `fkit-reviewer` ran a stateful review (its own pass + a Codex adversarial pass, **full
coverage, no degradation**) and wrote five findings into `review.md`. My verdicts and evidence are in
that file's *Coder response* section. **All five were verified CORRECT and all five are now fixed.**

Two were applied under the sprint-ship-loop's standing approval (R1, R4: verified, mechanical,
inside the approved plan). Three were **owner rulings** relayed live through the driver session (R2,
R3, R5) — recorded below as rulings, not as calls I made.

## Change surface — Round 1 additions

| File | What changed |
| --- | --- |
| `src/profile-server/AlertRelay.ts` | **R1:** `payload.probe` retyped `z.string()` → `z.unknown()`, narrowed with `typeof` at its single read site; the "probe key present" warning now fires for a non-string value too. **R3:** new exported constant `ALERT_PROBE_RESPONSE_STATUS = "probe-accepted"`, returned by the probe branch instead of `accepted` |
| `setup-telemetry.sh` | **R2:** `assert_probe_token_json_safe()` + its two call sites, in the top validation block — aborts the deploy before anything on the box is touched, for a deploy-supplied **or** already-persisted token. **R3:** the probe script captures curl's body and exits 0 **only** on the relay's probe status; a 2xx carrying the drop body now exits 1 and says why |
| `profile-checks.sh` | **R5:** negative-age (future-dated marker) branch added to `check_alert_probe` **and** to the pre-existing `check_daily_marker` — both its main path and its deploy-smoke fallback |
| `tests/profile-server/AlertRoutes.test.ts` | +7 tests: 5 `it.each` non-string `probe` kinds still DELIVER (R1), the probe-shaped non-string case, and probe-vs-drop body distinguishability (R3) |
| `tests/profile-checks.sh` | +5 assertions: future-dated daily marker, future-dated smoke marker, future-dated probe marker (+ its clock-skew wording + its count line) |
| `tests/scripts/profile-deploy-hardening.test.sh` | **R4:** the curl-argv guard now joins backslash continuations before grepping, plus a non-vacuity assertion that the join worked. New sections 8–10: the token guard run **behaviourally** (quote/backslash rejected, plain hex accepted, both call sites present, value never echoed), the `ALERT_PROBE_RESPONSE_STATUS` drift guard, and the generated probe script **executed** against a stub curl across five outcomes |
| `ai-agents/knowledge-base/alert-delivery-runbook.md` | surprise mode 2 now says the constraint is enforced; new surprise mode 3 (future-dated marker); "when it fails" step 3 rewritten so a bare 2xx is not read as success; bring-up step 6 and the config table aligned |
| `example.env.telemetry` | the no-`"`/no-`\` line now says it is enforced at deploy |

⛔ Still no hostname, IP address, chat id, topic id or secret in any of them.

## Gates re-run after the fixes — real numbers

| Gate | Result |
| --- | --- |
| `npx tsc --noEmit` | clean, exit 0 |
| `npm run lint` | clean, no output |
| `npm test` | **137 suites / 1853 tests, all passed** — run twice (Prettier reformatted one test
file after the first run): **84.6 s** then **70.3 s**. ⚠️ The spread is subprocess-wait noise in the
shell harnesses, not a change in work done; neither figure is a stable benchmark on this host. |
| `npx jest tests/profile-server/AlertRoutes.test.ts` | **74 passed** (67 before this round) |
| `bash tests/profile-checks.sh` | `RESULT: 115 passed, 0 failed` (110 before) |
| `bash tests/scripts/profile-deploy-hardening.test.sh` | `ALL PASS` |
| `npm run check:config-parity` | `REQUIRED 0` on every pipeline, shape unchanged |

No supertest flake and no `SIGSEGV` occurred; **nothing needed a re-run.** The reviewer's own
re-measurement (137 / 1846 / 83.6 s) plus this round's 7 new jest tests accounts for 1853 exactly.

**Both fixes were mutation-verified, not just asserted:**

- **R1** — reverting the single schema line back to `z.string().optional()` fails **6** of the new
  tests. So the defect was real and the new tests are not vacuous. ⚠️ Slightly **worse than the
  finding stated**: `probe: null` also fails the whole-body parse under the old typing, and `null` is
  what a templating gap produces — not only a hand-pasted non-string.
- **R4** — re-planted the reviewer's exact regression (`--data "{\"secret\":\"$ALERT_PROBE_SECRET\"}"`
  on the **continuation** line). The old guard passed; the fixed guard prints
  `❌ probe: ALERT_PROBE_SECRET appears on a curl command line` and the harness exits non-zero.
- **R3** — the generated probe script was run against a stub curl: curl-failure ⇒ exit 1;
  2xx + `{"status":"accepted"}` (the drop body) ⇒ **exit 1** naming the likely secret mismatch;
  2xx + `{"status":"probe-accepted"}` ⇒ exit 0; the same with JSON spacing ⇒ exit 0; empty
  URL/secret ⇒ exit 1 `NOT CONFIGURED`. All five are now permanent assertions in the harness.

## Decision log, continued — Round 1 (per ADR-032's transfer of ADR-019's audit obligation)

10. **R1 applied without asking.** Answers finding R1. Changed: `probe: z.unknown().optional()` +
    `typeof` narrowing in `decide()`. Qualified: verified CORRECT by mutation test (above),
    one-line-plus-narrowing localized change, and **inside the approved plan** — the plan's own
    step-1 invariant is "🚨 Fail toward delivery"; a typed field that drops a real alert violates the
    thing the plan built. No behaviour change for any body that parsed before.
11. **R4 applied without asking.** Answers finding R4. Changed: continuations joined (awk) before the
    argv grep; added an assertion that the join actually happened, so the guard cannot go vacuous
    silently. Qualified: verified CORRECT against the reviewer's own planted regression, confined to
    one harness block, and **inside the approved plan** — it is plan step 5's assertion 2, repaired
    rather than extended.
12. **R2 — OWNER RULING, not my call:** *enforce* the token constraint (offered enforce /
    leave-documented / JSON-escape; owner chose enforce — *"loud-in-a-month is still worse than
    loud-now"*). ⛔ The JSON-escaping alternative was **not** chosen and was not substituted.
    Implementation judgements I did make inside the ruling: **(a)** the check sits in the top
    validation block so the abort happens **before any box state changes** — aborting inside the probe
    section would have skipped the backup-cron setup that follows it; **(b)** it also checks an
    **already-persisted** token, because a box provisioned before this guard existed can be holding a
    bad one; **(c)** it names the variable only, never the value; **(d)** gated behaviourally (the real
    function is extracted and run) rather than by grep, so the pattern itself is tested.
13. **R3 — OWNER RULING, not my call:** give the probe a *distinguishable reply* (offered
    distinct-reply / accept-the-misleading-log; owner chose distinct reply). Implemented as a **fixed
    constant** `probe-accepted` that **echoes nothing from the request** — the 100-byte response
    persistence constraint (`0277`) is preserved and asserted — and the status code stays **200**,
    never 401/403/404. The probe matches it loosely (no JSON-spacing assumptions) so an upstream
    formatter change cannot cause a false page; a drift guard pins the shell string to the TypeScript
    constant, and a second assertion fails if that constant is ever set back to `accepted`.
14. **R5 — OWNER-RULED SCOPE EXTENSION, not scope creep I chose:** *fix both* (offered fix-both /
    fix-only-the-new-one / fix-neither; owner chose both, reasoning that the backup check is the
    *"nobody noticed for three weeks"* class and that two sibling checks behaving differently reads as
    deliberate to the next reader). Fixed `check_alert_probe` **and** `check_daily_marker` — the
    latter in **both** its paths, the main marker and the deploy-smoke fallback, which had the same
    hole. Each FAIL names the skew as the cause to look for.
15. 🚩 **Did NOT widen R5 to the other two age computations, and am surfacing them instead.**
    `check_weekly_object` (`profile-checks.sh:230`, age from the rclone listing's `ModTime`) and
    `check_renew_attempted` (`:257`, age from a file mtime) have the **same negative-age shape** — a
    future-dated source reads green. They were **not** in the owner's ruling, their inputs are not
    marker JSON written by our own code, and widening scope unasked is the one thing the loop forbids.
    Recorded here and in `review.md` for the owner rather than fixed or forgotten.
16. **Added behavioural execution of the generated `alert-probe.sh` to the hardening harness**, beyond
    the plan's seven greps. Judged in-scope as *the test for R3's fix*: the owner's ruling is that the
    probe's exit code must mean something, and a grep proves only that a string is mentioned — the fix
    hinges on capturing curl's `$?` **through a command substitution**, which is exactly where a
    silent "any 2xx ⇒ exit 0" regression would hide. It lives in an already-registered harness (so
    `CLAUDE.md`'s "add your new harness to that file" residual is not touched) and follows that file's
    own stated charter and its T12 extract-and-run idiom. Cost: five stubbed runs.
17. **Loosened two new assertions from `50h` to `(49|50)h`.** The checker's clock runs a second or two
    past the harness's `NOW_EPOCH` and the age is integer-divided, so a `+50h` stamp reads as 49h.
    Caught by an actual red run, not guessed. The **sign** is the property under test; the digit is
    not. Same house pattern as the existing `= 12[45][0-9][0-9]/24h` assertion.
18. **Aligned the runbook and `example.env.telemetry` with R2/R3/R5.** Both documented the token
    constraint as a rule the operator must remember and told the operator `exit 0 = accepted`; after
    these fixes the first is enforced and the second would have been actively misleading, since a bare
    2xx is not success on this route. Docs that contradict enforced behaviour are worse than none.
19. **No fix was applied to a finding I judged wrong, because there was none** — all five findings
    verified CORRECT. No obvious-winner call was made against a plan option this round.

## Round 1b — the negative-age sweep (owner ruling, 2026-09-18)

After I surfaced two more checks with R5's shape (decision 15), the owner ruled — offered
fix-them-too / leave-them-unruled / file-as-a-separate-task — **"Fix them too."** Stated reasoning:
the same one-line guard, two more places, while the context is fresh and the tests are right there —
and **the cert-renewal one matters**, because a check that reports OK when it cannot know is how a
certificate expires silently, *which already happened on the telemetry box in September*.
⛔ **Not precedent** — one ruling, these two checks.

### The sweep asked for: EVERY age computation in `profile-checks.sh`

Six, and they are now all accounted for. **These two were the last of this shape — there is no
seventh.**

| # | Where | Source of the timestamp | Status |
| --- | --- | --- | --- |
| 1 | `check_daily_marker`, main path (`:174`) | marker JSON `finished_at` | fixed, R5 |
| 2 | `check_daily_marker`, deploy-smoke fallback (`:164`) | smoke marker `finished_at` | fixed, R5 — **found by me, not in the finding** |
| 3 | `check_weekly_object` (`:239`) | the object NAME's date, else its `ModTime` | **fixed now** |
| 4 | `check_renewal_attempt` (`:266`) | newest non-empty `letsencrypt.log*` **mtime** | **fixed now** |
| 5 | `check_alert_probe` (`:436`) | probe marker `finished_at` | fixed, R5 |
| 6 | `check_players_growth` (`:391`) | its own persisted baseline epoch | **already guarded** — a future baseline FAILs loudly *and* resets the baseline so it self-heals. Pre-existing, from an earlier review round. Left exactly as it is |

⚠️ **Naming correction for the record:** the coordinator's message called check 4
`check_renew_attempted`; the function is **`check_renewal_attempt`**. Same check, and the line number
given (`:257`) was the pre-edit one.

**Not of this shape, checked and deliberately not changed:**

- `check_cert_expiry` (`:304`) computes **no age of its own** — `openssl x509 -checkend N` does the
  comparison internally, so there is no negative-age branch to add. 🚩 It is still **clock-trusting**
  in a related way: a box clock running *behind* makes a certificate look fresher than it is. That is
  a different defect class (trusting the local clock, not mis-reading a negative number) and it is
  **not** fixed here — recorded so it is neither assumed handled nor silently inherited.
- `check_renew_log_growth` (`:285`, `prev -gt size`) compares **byte offsets**, not time, and already
  resets to 0 when the log shrinks (rotation).

### Both new guards mutation-verified

Weakening each new branch (`-lt 0` → `-lt -99999`) makes the corresponding case report **`rc=0`** —
the whole run exits **green** on a future-dated source, which is exactly the failure the owner named.
Restored, and the three new assertions pass.

| Gate | Result |
| --- | --- |
| `bash -n profile-checks.sh tests/profile-checks.sh` | OK |
| `npx tsc --noEmit` | clean, exit 0 |
| `npm run lint` | clean, no output |
| `npm test` | **137 suites / 1853 tests, all passed**, 61.7 s |
| `npx jest tests/profile-server/AlertRoutes.test.ts` | 74 passed |
| `bash tests/profile-checks.sh` | **`RESULT: 118 passed, 0 failed`** (115 before this sub-round) |
| `bash tests/scripts/profile-deploy-hardening.test.sh` | `ALL PASS` |
| `npm run check:config-parity` | `REQUIRED 0` on all three pipelines |

No supertest flake, no `SIGSEGV`, nothing re-run. The TypeScript side is untouched by this sub-round,
which is why `npm test`'s total is unchanged at 1853 while the shell harness gained 3.

### Decision log, continued

20. **R5 extended to `check_weekly_object` and `check_renewal_attempt` — OWNER RULING, not my call.**
    Answers the item I surfaced in decision 15. Changed: the same `-lt 0` branch and the same message
    shape as the three already fixed, so a reader cannot tell which were done when (the ruling asked
    for exactly that). Each FAIL names the likely cause: for the weekly copy, skew on *whatever wrote
    it* — this box's clock need not be wrong, since the date comes off the object name; for certbot, a
    log restored or copied with its timestamp, and the message says what it costs (*"which is how a
    certificate expires silently"*).
21. **Swept all six age computations rather than fixing only the two named.** Asked for, and it is the
    same instinct that found the deploy-smoke fallback in R5. Result table above: two fixed now, three
    already fixed, one already guarded, **and no seventh**. Two near-misses recorded as *not* this
    shape (`openssl -checkend`, the byte-offset comparison) so the next reader does not have to
    re-derive that they were considered.
22. **Left `check_players_growth` untouched.** It already FAILs loudly on a future baseline *and*
    rewrites the baseline so the next run recovers — a strictly better shape than mine, and changing
    it for symmetry would have been a behaviour change nobody asked for.
23. **Recorded `check_cert_expiry`'s clock-trust property without fixing it.** It is a different defect
    class from the one ruled on, outside this ruling, and fixing it would need a decision about what a
    check should do when it cannot trust its own clock. Surfaced, not silently inherited.
24. **One test regex was wrong on the first run and I fixed the test, not the check.** My assertion
    looked for `is [45]d in the FUTURE` while the message reads `is **dated** 4d in the FUTURE`. Caught
    by a red run. Worth logging because the tempting move — loosening the assertion until it passes —
    is how a test stops testing anything; the check's wording was correct and stayed.

---

## 🚨 Still open — this task is NOT closing in this run

**Owner ruling, 2026-09-18: the egress drill is a HARD gate.** The reviewer's words, which the owner
accepted: this ships as *"a guard not yet known to guard."* The premise that a **host-run** curl leaves
from the same egress address as the **containerised** monitoring stack cannot be established by any
code or test. ⇒ `0284` stays **open** pending the owner's drill (plan step 5, items 4–8). No `✅ Done`
status was written and no task mover was invoked.

⚠️ Two items routed elsewhere, deliberately not done here: **`CLAUDE.md`'s stale test counts** (now
*137 suites / 1853 tests / ~85 s* against its documented *113 / 1185 / ~22–25 s*) — pre-existing,
producer-owned doc task; and the **D4 follow-up** (reading the monitoring stack's own channel state, to
catch an *already-disabled* channel) — still **unfiled**, producer work.
