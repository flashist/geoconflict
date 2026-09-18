# Review — 0284

Task: `ai-agents/tasks/done/0284-alert-path-liveness-probe-a-webhook-403-permanently-disables-uptrace-alerting/brief.md`
File(s) under review: the uncommitted working tree (`git diff HEAD` against `54158c5`) — 13 files
Status: in-review — Round 1 findings all answered; task stays OPEN pending the owner's egress drill

Reviewers run (Round 1): **fkit-reviewer own pass** + **Codex adversarial pass** (`codex exec
--sandbox read-only`, exit 0, full coverage — no degradation).

Gates re-run by the reviewer, not taken on trust:
`npx tsc --noEmit` clean · `bash tests/profile-checks.sh` → `RESULT: 110 passed, 0 failed` ·
`bash tests/scripts/profile-deploy-hardening.test.sh` → `ALL PASS` (the new probe block printed
**real extracted values on both sides** — `/var/lib/profile/alerts/last-alert-probe.json` and the
compose mount `/var/lib/profile/alerts` — so the drift guard is **not** vacuous) ·
`npx jest tests/profile-server/AlertRoutes.test.ts` → 67/67 ·
`npm test` → **137 suites / 1846 tests passed, 83.6 s**, exit 0, no flake, nothing re-run — the
coder's reported counts reproduce exactly.

## Reviewer findings

| #  | Round | Sev  | file:line | Claim |
|----|-------|------|-----------|-------|
| R1 | 1     | low  | `src/profile-server/AlertRelay.ts:162` | `probe: z.string().optional()` makes a real alert whose custom payload carries a **non-string** `probe` value fail the whole-body parse → `malformed` → dropped with 200 and never sent. At `HEAD` the same body parsed (unknown key stripped) and the alert was delivered. Proven both ways; a second door past the stated fail-toward-delivery invariant. Loud, not silent (the `malformed` arm raises the out-of-band alarm), and requires an operator to have pasted a non-string `probe`. |
| R2 | 1     | low  | `setup-telemetry.sh:1027-1032` (generated `alert-probe.sh` body heredoc) | The probe token is interpolated into JSON with no escaping. A token containing `"` or `\` emits invalid JSON → the relay answers `malformed` → **no marker is ever written** → the profile box pages every day while the relay's own secret is fine. The constraint ("no `"`, no `\`, hex only") is documented in `example.env.telemetry` and in the script's comment, but nothing enforces it at deploy or run time. ⚠️ Compounds with R3: the probe's local log still says `accepted`. **Disproven sub-claim:** no command substitution — an unquoted heredoc does not re-expand the *value*, so `$(…)`/backticks in the token are emitted literally (verified). |
| R3 | 1     | low  | `setup-telemetry.sh:1025-1039` (generated `alert-probe.sh`) | The probe logs `accepted` and exits 0 for **any** 2xx, including the relay's deliberate `200` on `rejected`/`malformed`. The probe branch and the drop branch return byte-identical bodies (`{"status":"accepted"}`), so the probe has **zero** local signal about whether a marker was written. Misleading exactly during bring-up and incident triage — the one moment an operator runs it by hand. (The hourly out-of-band nag on a secret mismatch is separately owner-accepted, D1/Q3; this row is about the probe's own log/exit, not about detection.) |
| R4 | 1     | low  | `tests/scripts/profile-deploy-hardening.test.sh:1499-1501` | The "secret never appears on a curl argv" guard is **line-oriented**, while the real `curl` invocation spans three continued lines. Proven with a synthetic regression that puts `--data "{\"secret\":\"$ALERT_PROBE_SECRET\"}"` on the **continuation** line: the guard reports PASS. It is the only structural gate for the exact ps/`/proc/<pid>/cmdline` leak it was written to stop. |
| R5 | 1     | low  | `profile-checks.sh:433-441` (`check_alert_probe`) | A **future-dated** `finished_at` (container clock skew, or a marker stamped by a box running ahead) yields a negative age and takes the **OK** branch — verified: a `+50h` marker computes `age_h = -50` and reads green. The guard then stays green for as long as the skew lasts after probes stop arriving. ⚠️ The pre-existing `check_backup_marker` has the identical shape, so a fix here without one there leaves the file inconsistent — an owner call, not a mechanical fix. |

### Negative results (attacked and failed to break — recorded so they are not re-attacked)

- **Defeating the probe predicate with a real alert** — both reviewers failed. The predicate requires
  `payload.probe === "liveness"` **and** `alert === undefined` **and** `id === undefined`; the verified
  2.0.2 body always carries top-level `id` and `alert`, the custom payload is merged (never replaces),
  and `""` for `id` still satisfies `!== undefined`. A pasted `probe` alongside alert fields relays as
  an alert **and** warns. Covered by four tests.
- **Advancing the marker without the secret** — impossible: the probe branch sits strictly after the
  `tokensMatch` return (`AlertRelay.ts:530-541`), asserted by two `it.each` cases that check the file
  does **not** exist.
- **Breaking the TypeScript→shell marker contract** — the emitted bytes parse under the real
  `json_field` sed and `iso_to_epoch`; the coupling test is a genuine constraint (it transcribes the
  sed, asserts exactly one matching line, and asserts the `Z`-suffixed seconds shape), not vacuous.
- **The drift guard passing on two empty values** — it cannot: each side has its own `-n` gate that
  `fail`s first, and the comparison itself re-checks `-n "$RELAY_DIR"`. Observed printing real values.
- **The relay emitting 401/403/404** — no new path can. The probe branch returns 200; every drop
  branch still returns 200; the only non-2xx remains the pre-existing 500.
- **`persist_or_reuse_probe_value` minting a token** — there is no generate branch at all (three
  separate harness assertions, all non-vacuous).
- **Container cannot write the bind mount** — `Dockerfile.profile` sets no `USER`, so the container
  runs as root and can write the root-owned `0700` host directory; `profile-checks.sh` reads it as root.
- **Shipping the new image without the mount** — `build-deploy-profile.sh` always uploads and runs the
  idempotent `setup-profile.sh`, so the compose mount cannot lag the image on a real deploy.
- **Count re-baselines honest** — `profile-checks.sh` now runs exactly 11 checks; all five changed
  `RESULT:` assertions match, and the new check is always-OK in `reset_fixture`, which is why the other
  cases needed re-baselining at all. The new C22 block exercises all three branches plus both override
  seams.

### Not a finding, but the close gate

The guard's core premise — that a **host-run** `curl` leaves from the same egress address as the
**containerised** monitoring stack — is **explicitly stated as unproved** in `setup-telemetry.sh` and
assigned to the task's own drill. Nothing in code or tests can establish it. Until that drill runs
(remove the address from the allowlist ⇒ the probe must fail **and** the channel must disable), this
ships as a guard that is not yet known to guard.

## Coder response

<!-- CODER-OWNED — the reviewer never writes this section. -->

Round 1, 2026-09-18. Every finding was re-verified against the code by me before any edit; two were
mutation-tested (below). **All five are CORRECT and all five are fixed.** R1 and R4 were applied under
the sprint-ship-loop's standing approval (verified, mechanical/localized, inside the approved plan).
R2, R3 and R5 were **owner rulings**, each put with alternatives and a marked recommendation live in the
driver session — recorded here as rulings, not as calls I made. ⛔ Not precedent for anything.

| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R1 | CORRECT — and slightly worse than stated | **Defect**, introduced by this task | `payload.probe` retyped `z.string()` → `z.unknown()`, narrowed with `typeof` at its one read site; warning now fires for a non-string value too. +6 tests | **fixed** (standing approval) |
| R2 | CORRECT | **Defect** (deploy-time foot-gun, not a code path) | **Owner ruling: ENFORCE.** `assert_probe_token_json_safe()` in `setup-telemetry.sh`'s top validation block aborts the deploy before any box state changes, for a deploy-supplied *or* already-persisted token. Gated behaviourally | **fixed** (owner ruling) |
| R3 | CORRECT | **Defect** (the probe's own signal was uninformative) | **Owner ruling: DISTINCT REPLY.** New `ALERT_PROBE_RESPONSE_STATUS = "probe-accepted"`; the probe exits 0 only on it. Fixed constant, echoes nothing, still 200 | **fixed** (owner ruling) |
| R4 | CORRECT | **Defect** in the gate itself | Continuations joined before the argv grep, plus a non-vacuity assertion that the join happened. Re-planted the reviewer's regression to confirm | **fixed** (standing approval) |
| R5 | CORRECT | **Defect**, one new + three pre-existing | **Owner ruling: FIX BOTH**, then a **second ruling: fix the two siblings too.** Negative-age branch in `check_alert_probe`, `check_daily_marker` (main path *and* deploy-smoke fallback), `check_weekly_object` and `check_renewal_attempt` — every age computation in the file bar one that was already guarded. +8 assertions | **fixed** (owner-ruled scope extension, ×2) |

### R1 — verified by mutation, not by reading

Reverting the single schema line to `z.string().optional()` makes **6** of the new tests fail, so the
defect was real and the new tests are not vacuous. ⚠️ **One thing the finding understates:**
`probe: null` also fails the whole-body parse under the old typing. `null` is what a templating gap
emits, not only what a human pastes — so the trigger is a little broader than "an operator pasted a
non-string". Fix direction is the plan's own: a value that cannot match is **delivered as an alert**,
never swallowed. The "a `probe` key is in the channel payload" warning now also fires for a non-string
value, so the operator signal is not lost with the parse error.

### R2 — enforced; the JSON-escaping alternative was NOT substituted

The owner was offered enforce / leave-it-documented / escape-the-JSON-instead and chose **enforce**
(*"loud-in-a-month is still worse than loud-now"*). Judgements made inside that ruling:

- The check sits in the **top validation block**, not in the probe section. Aborting at the probe
  section would skip the backup-cron setup that follows it; at the top, nothing on the box has been
  touched yet.
- It also validates an **already-persisted** token — a box provisioned before this guard existed can be
  holding a bad one, and the persist path would otherwise bypass the check entirely.
- It names the variable, never the value (asserted).
- It is gated **behaviourally**: the harness extracts the real function and runs it — a quote and a
  backslash are rejected, a plain hex token still passes (so the guard is not a blanket refusal).

### R3 — distinct reply, with the `0277` constraint preserved

`{"status":"probe-accepted"}` on **200**. It is a **fixed constant that echoes nothing from the
request** — the monitoring stack persists the first 100 bytes of every response (`0277`), and a test
asserts neither the secret nor the probe key can appear in it. The status code stays 200: never
401/403/404, and the existing regression table passes untouched.

The probe matches the string **loosely** (no quoting or spacing assumptions) so an upstream JSON
formatting change cannot turn this into a false daily page; a drift guard pins the shell string to the
TypeScript constant, and a further assertion fails if that constant is ever set back to `accepted`.

Verified by **running** the generated script against a stub curl — five outcomes, now permanent harness
assertions: curl failure ⇒ exit 1; 2xx carrying the **drop** body ⇒ **exit 1** naming the likely secret
mismatch (this is the case that used to log `accepted` and exit 0); 2xx carrying the probe body ⇒ exit
0; the same with JSON spacing ⇒ exit 0; empty URL/secret ⇒ exit 1 `NOT CONFIGURED`. The fix hinges on
capturing curl's `$?` **through a command substitution**, which a grep cannot check — hence the
executed test rather than a seventh structural one.

### R4 — the reviewer's own regression, re-planted

Re-planted `--data "{\"secret\":\"$ALERT_PROBE_SECRET\"}"` on the **continuation** line. Old guard:
PASS. Fixed guard: `❌ probe: ALERT_PROBE_SECRET appears on a curl command line`, harness exits
non-zero. Continuations are joined with awk before the grep, and a new assertion proves the join
happened (three fragments that live on three separate physical lines must appear on one joined line) —
so the guard cannot silently go vacuous again, which is the failure mode that produced this finding.

### R5 — both fixed; and the two siblings I did NOT touch

Fixed in `check_alert_probe` and in the pre-existing `check_daily_marker`, the latter in **both** paths
— the main marker and the deploy-smoke fallback, which had the same hole and which the finding did not
separate out. Each FAIL names clock skew as the cause to look for.

✅ **The two siblings I surfaced are now FIXED TOO — second owner ruling, same day.** I recorded them
here as unruled rather than widening scope on my own; the owner then ruled (offered fix-them-too /
leave-them-unruled / file-as-a-separate-task) **"Fix them too"** — same one-line guard, two more
places, while the context is fresh, *and* because the cert-renewal one is what stands between a dead
renew cron and a certificate that expires silently, which already happened once on the telemetry box.
⛔ Not precedent — one ruling, these two checks.

- `check_weekly_object` — age from the object **name's** date (`ModTime` only as a fallback), so the
  skewed clock can be on whatever *wrote* the copy, not on this box.
- `check_renewal_attempt` — age from a file **mtime**. (Its name is `check_renewal_attempt`, not
  `check_renew_attempted`.)

Both carry the same branch and the same message shape as the three fixed under R5, so a reader cannot
tell which were done when. Both **mutation-verified**: weakening either branch makes that case report
**`rc=0`** — the whole run goes green on a future-dated source.

**The sweep the owner asked for — every age computation in `profile-checks.sh`, all six:** `check_daily_marker`
main path *and* its deploy-smoke fallback, `check_alert_probe` (all three fixed under R5);
`check_weekly_object` and `check_renewal_attempt` (fixed under this ruling); and `check_players_growth`,
which was **already guarded** — a future baseline FAILs loudly *and* self-heals, a strictly better
shape than mine, left untouched. **These two were the last of this shape; there is no seventh.**

🚩 **One near-miss recorded rather than silently inherited:** `check_cert_expiry` computes no age of its
own (`openssl x509 -checkend` does the comparison), so there is no negative-age branch to add — but it
is **clock-trusting** in a related way: a box clock running *behind* makes a certificate look fresher
than it is. Different defect class, outside this ruling, **not fixed**.

### Gates re-run after the fixes

`npx tsc --noEmit` clean · `npm run lint` clean · **`npm test` 137 suites / 1853 tests passed**, run
three times across the two sub-rounds (84.6 s / 70.3 s / 61.7 s — the spread is subprocess-wait noise in
the shell harnesses, not a change in work done; no figure here is a stable benchmark on this host)
· `npx jest tests/profile-server/AlertRoutes.test.ts` **74 passed** (was 67) ·
`bash tests/profile-checks.sh` **`RESULT: 118 passed, 0 failed`** (was 110) ·
`bash tests/scripts/profile-deploy-hardening.test.sh` **`ALL PASS`** ·
`npm run check:config-parity` `REQUIRED 0`, shape unchanged.

**No supertest flake and no `SIGSEGV` occurred; nothing needed a re-run.** 1846 + this round's 7 new
jest tests = 1853 exactly.

### The close gate, and two items routed elsewhere

- **Owner ruling: the egress drill is a HARD gate.** `0284` does **not** close in this run. The
  reviewer's "not a finding, but the close gate" section stands as written and the owner accepted its
  wording: this ships as *a guard not yet known to guard*. No `✅ Done` status was written and no task
  mover was invoked.
- **`CLAUDE.md`'s stale test counts** (documents 113 suites / 1185 tests / ~22–25 s; measured
  137 / 1853 / ~85 s) — I proved this drift is **pre-existing** by running the `HEAD` copies, the
  reviewer agrees, and it is **not this task's to fix**. Routed to a separate producer-owned doc task.
- **The D4 follow-up** (reading the monitoring stack's own channel state, to catch an *already
  disabled* channel) is **still unfiled** — producer work, outside my surface. Noted, not filed.

## Accepted residuals (shared, do-not-re-litigate)

Carried in from the approved plan's owner decisions D1–D4 (2026-09-18). Re-raise **only** on the
stated condition.

- **Cause, not state** — What: the probe detects the *cause* of a channel disable, never an
  already-disabled channel. Why (structural): reading channel state needs an authenticated call into
  the monitoring stack, i.e. the very thing being guarded against. Owner ruling D4; a separate
  follow-up to be filed. Re-raise only if: a state read becomes available on a path independent of the
  monitoring stack.
- **No end-to-end delivery proof** — What: the marker is stamped on receipt, before any send, so the
  probe proves reachability only — not Telegram delivery, not that a human saw anything, not the
  secret the monitoring stack's own channel config holds, not that a monitor is attached. Why
  (structural): sending on every hourly probe would page a human hourly. Re-raise only if: a silent
  delivery-verification path exists.
- **~3–27 h detection latency** — What: bounded by the daily `checks.sh` run, not the hourly probe.
  Why (structural): owner ruling D2 — the channel disable is permanent either way, so a faster page
  only shortens the blind window; it does not change the repair. Re-raise only if: the repair becomes
  time-sensitive.
- **Hourly out-of-band nag on a secret mismatch** — What: accepted noise. Owner ruling D1/Q3.
  Re-raise only if: the nag rate changes or it reaches a channel it should not.
- **Marker path is a compiled-in constant** — What: `ALERT_PROBE_MARKER_PATH`, not an env var. Why
  (structural): owner ruling D1/Q5 — a new `process.env` read would pull the config-parity two-hop
  chain in for a value that never varies; the drift guard covers the coupling instead. Re-raise only
  if: the path must differ per environment.
- **`check:config-parity` does not reach telemetry variables** — What: the hardening harness is the
  only gate over the `TELEMETRY_*` hop. Pre-existing, recorded by task `0277`. Re-raise only if:
  config-parity gains telemetry coverage.
- **Harness assertions coupled to formatting** — What: the grep-level structural lints red on a
  reformat. Why (structural): false RED, never false green. Pre-existing residual of this harness.
  Re-raise only if: one is shown to be able to pass falsely (R4 is exactly that case and is a row
  above, not a suppression).
</content>
</invoke>
