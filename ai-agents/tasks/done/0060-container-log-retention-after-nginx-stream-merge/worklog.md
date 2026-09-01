# Worklog — 0060: Container log retention after the nginx stream merge

**Built by:** fkit-coder, spawned as the **Build worker** of `/fkit-sprint-ship-loop` (fkit-lead driver), 2026-09-01.
**Plan:** [`plan.md`](plan.md) — approved by the owner via `AskUserQuestion` in the driver session, 2026-09-01, with rulings **R1–R5**. Blob `0fa40af196d2bf8870b437530d1542bdd2013f3c`, 19243 bytes — **verified on disk against the driver's pointer before any work.**
**Brief:** [`brief.md`](brief.md)

> **No production server was touched** (ruling R5). No SSH, no `deploy.sh`, no `build-deploy.sh`, no
> `docker` command against a live box, no host file. Every live check is deferred below, unchecked.
>
> **No secrets, no PII, no hostnames.** Nothing was read from a container log.

---

## Headline

- **The brief's central premise was refuted at plan time, and the build confirms it: this IS a
  commit.** Retention belongs in `update.sh`, which is version-controlled and already ships on every
  ordinary deploy. It was never a server-only change.
- **Four files changed. Two levers shipped (C + A per R1), one knowledge-base note, one lint.**
- ⚠️ **`npm test` finished with 1 failing test out of 1075** — the known, owner-ruled `0200` flake, not
  a regression. Evidence and re-runs below; read it rather than taking my word.
- ⚠️ **Nothing is verified in production.** Seven live checks are deferred and unchecked. The value
  shipped is **provisional and unmeasured**.

---

## Changes — four files

### 1. `nginx.conf` — lever (C), stop the dominant log source

`access_log off;` added inside the **existing** `location = /api/public_lobbies` block, with a comment
explaining why so the next reader does not "restore" it as an oversight.

The diff is **purely additive** — 13 inserted lines, zero deletions. (An initial edit incidentally
stripped two trailing-whitespace-only lines; that was reverted so the diff carries nothing unrelated.)

**Why this endpoint:** every client sitting on the main menu polls it once per second
(`src/client/PublicLobby.ts:68` `setInterval(..., 1000)` → `:138` `fetch("/api/public_lobbies")` —
both line references re-verified against the file this session), and nginx logs cache hits as well as
misses. The 1-second `proxy_cache` saves the upstream call, not the log line.

⚠️ **The volume figure in that comment is labelled as an estimate from code, NOT a measurement** —
`~270 bytes/line`, so ~50 concurrent menu-sitters ≈ 1 GB/day from this endpoint alone. It is written
into the comment with that caveat attached, deliberately, so it cannot later be quoted as measured.

**Deploy cost differs from the other changes:** `nginx.conf` is baked into the image
(`Dockerfile:87`), so this one needs an **image rebuild via `build-deploy.sh`**, not just a
`deploy.sh` run.

### 2. `update.sh` — lever (A), move the setting into the repo

Added to the `docker run -d` invocation:

```
--log-driver json-file \
--log-opt max-size=100m \
--log-opt max-file=10 \
```

Plus a comment recording that these **override** the host `daemon.json`, that this script does
`docker rm` + `docker run` on every deploy (so a redeploy is all that is needed to change them), that
the values are **provisional**, and that this bounds the log without making it a durable evidence
store.

**Applies to every environment this script deploys, not just prod.** `update.sh` is invoked for dev
deployments too, and both inherited the same invisible host default. See decision **D2**.

### 3. `ai-agents/knowledge-base/container-log-retention.md` — new, the "where does this live" record

Per plan §5 step 3 and the brief's own *"record what was changed and where"* requirement. Knowledge-base,
**not** the wiki (`ai-agents/wiki-vault/` is `fkit-wiki`'s exclusive surface and was not touched).

Carries the unverified-baseline flag, the provisional-value flag, the four explicit **"what this does
NOT do"** points, and the other bounded destinations in the container.

### 4. `tests/scripts/profile-deploy-hardening.test.sh` — the R4 lint

Seven assertions appended as a new **`== Structural: container log retention (0060) ==`** section. See
decision **D1** for why this file rather than a new one, and **D3** for how they were made
non-vacuous.

---

## Local verification evidence

Concrete output, not claims.

**`bash -n update.sh`** — syntax valid:

```
bash -n update.sh: OK (syntax valid)
```

**`bash -n tests/scripts/profile-deploy-hardening.test.sh`** — syntax valid:

```
bash -n harness: OK
```

**The harness, full run — `ALL PASS`, exit 0.** New section:

```
== Structural: container log retention (0060) ==
  ✅ update.sh: located the docker run invocation
  ✅ update.sh: docker run carries --log-opt max-size
  ✅ update.sh: docker run carries --log-opt max-file
  ✅ update.sh: docker run pins --log-driver json-file
  ✅ nginx.conf: located the /api/public_lobbies block
  ✅ nginx.conf: /api/public_lobbies has access_log off
  ✅ nginx.conf: server-level access_log still goes to stdout

ALL PASS
```

All 10 pre-existing tests (T1–T10) and the pre-existing structural checks still pass unchanged.

**Mutation test — proof the new assertions catch the DELETION class.** ⚠️ **Corrected in Round 2
(finding F4): the original wording here claimed "proof the new assertions are not false-green", which
overclaimed. This mutation removed lines; it proves deletion and nothing more.** As shipped in Round 1
the assertions still passed green on two value/scope regressions — see **F2** and **F3** in the Round 2
section below, where a two-direction mutation test replaces this one. The deletion result below is
sound and was independently re-run by the reviewer; it is kept as the Round 1 record.

The flags were removed from `update.sh` and `access_log off;` from `nginx.conf`, the harness re-run,
then both files restored and confirmed **byte-identical by SHA-256**:

```
--- harness under mutation ---
  ❌ update.sh: docker run lost --log-opt max-size
  ❌ update.sh: docker run lost --log-opt max-file
  ❌ update.sh: docker run lost --log-driver json-file
  ❌ nginx.conf: /api/public_lobbies lost access_log off
SOME FAILED
RESTORED update.sh  byte-identical (95851f0c4628471c96e30e9cd260f4ad7d8f13dee0afb3a6748e5fa3041bbf0e)
RESTORED nginx.conf byte-identical (be04ee936faa367474ef12011112d8181b80a4d9f4ef5412e64f2216bdcd627f)
```

The two "located the ... block" assertions are guards: if the awk extraction ever finds nothing, they
fail loudly rather than letting the checks below them pass on an empty string. This is the false-green
class `0202` was filed about, addressed here rather than reproduced.

**`npm run lint`** — clean, no output, exit 0.

**`npm test`** — ⚠️ **1 failed, 1074 passed, 1075 total; 1 suite failed of 107.**

```
● payments routes › POST /v1/payments/yandex/reconcile › grants unprocessed mapped
  purchases and echoes already-processed tokens

    thrown: "Exceeded timeout of 5000 ms for a test."
```

**This is NOT a regression from this task, and here is why rather than an assertion that it isn't:**

1. This task changed `nginx.conf`, `update.sh`, a bash harness and a markdown file. **No TypeScript,
   no jest config, nothing jest reads.** There is no mechanism by which it could affect this suite.
2. It is the exact documented shape of task `0200` — see
   `ai-agents/knowledge-base/reports/2026-09-01-0200-supertest-flake-findings.md`: a ~0.22 %
   per-request loss of the TCP accept on 127.0.0.1, **timeout sub-shape**, confirmed at socket level,
   **owner-ruled "recognition note only, no code change"** on 2026-09-01.
3. Re-ran that suite in isolation three times — **23/23 passed on each run:**

```
Test Suites: 1 passed, 1 total Tests: 23 passed, 23 total   <- run 1
Test Suites: 1 passed, 1 total Tests: 23 passed, 23 total   <- run 2
Test Suites: 1 passed, 1 total Tests: 23 passed, 23 total   <- run 3
```

**Stated plainly: the suite is not green, and I am reporting it as not green.** I judge it
pre-existing on the evidence above, not clean.

### What is NOT verified locally

- **No nginx config-syntax check was run.** `nginx -t` needs nginx (not installed on this dev host)
  or a container build. `access_log off;` is a standard directive valid in a `location` context, but
  **that is reasoning, not a check.** It is folded into the deploy item below.
- **Nothing about actual log behaviour.** Volume, retention window, eviction, disk headroom — all
  off-box, all deferred.

---

## Deferred Live Tail — unchecked, gated

`0060` ships as **built + Deferred Live Tail**. These are **not** satisfied by this task and must not
be presented as such. ⛔ **Every one requires a production shell and is the owner's to run and
authorize** (ruling R5).

- [ ] **D-L1 — Confirm the current effective config.**
      `docker inspect --format '{{json .HostConfig.LogConfig}}'` on the prod container.
      **Gate: settles whether the circulating pre-change budget figure is real.** It is single-source
      and in no repo artifact. If it comes back materially different, the volume arithmetic and the
      shipped values must be re-derived **before** deploying.
- [ ] **D-L2 — Measure real daily log volume,** split app-output vs nginx access lines, scoped to one
      boot via `docker logs --since "$(docker inspect --format '{{.State.StartedAt}}' "$CID")" "$CID"`.
      **Gate: converts the provisional `100m × 10` into a sized figure.**
      🚨 **Output contains `persistentID` values (JWT `sub`, PII) — filter before any excerpt reaches
      a worklog, review, report or commit.**
- [ ] **D-L3 — Confirm disk headroom:** `df -h /` for current use **and total size** — ⚠️ **on each of
      the three boxes this ships to, not just prod.** Corrected in Round 2 (finding **F7**): decision
      **D2** applied the flags to every environment `update.sh` deploys, and `deploy.sh:3,39` accepts
      `dev|staging|prod`, so the 1 GB worst case now lands on **three** boxes. Dev and staging headroom
      is named nowhere and may well be tighter than prod's.
      **Gate: the worst case cannot be closed without the total, per box.** No total is established
      anywhere in the repo — see the risk note below.
- [ ] **D-L4 — Deploy.** ⚠️ **Image rebuild (`build-deploy.sh`) is required**, because `nginx.conf` is
      baked into the image; that path also re-runs `update.sh` for the log flags. A plain `deploy.sh`
      run would ship lever A but **not** lever C.
      **Gate: D-L1 and D-L3 first.** This is also the first real check of the nginx config syntax.
- [ ] **D-L5 — Re-inspect after the container recreate** (brief verification step 1). The recreate is
      inherent to `update.sh`, but **confirm it rather than assume it.**
      **Gate: D-L4.**
- [ ] **D-L6 — Verify a real window survives** (brief verification step 2). Read the **oldest line
      actually present** and check its timestamp against the intended window.
      **Gate: D-L4, plus enough elapsed time to fill the ring. Do NOT infer this from config values** —
      that inference is what made the setting invisible in the first place.
- [ ] **D-L7 — Confirm boot-scoped reads still work** (brief verification step 5) — the technique the
      next investigation depends on.
      **Gate: D-L4.**

**Nothing here is dischargeable without a deploy.** D-L1, D-L2 and D-L3 are readable today on a
production shell; the rest wait on D-L4.

---

## Rulings this build carries, restated so the close cannot soften them

**R2 — proceed-before-measure is an OWNER-RULED DEVIATION FROM THE BRIEF, not the brief being
followed.** The brief's step 2 says *measure before changing*. This task changed first and defers the
measurement. The owner ruled that way knowingly, on the grounds that measurement needs a production
shell, that both changes are safe in either direction (C strictly reduces volume, A strictly increases
retention), and that the worst case is bounded and computable in advance. **Record it as a deviation.**

**R3 — 1 GB is PROVISIONAL, and its baseline is UNVERIFIED.** `100m × 10` was **not** sized from a
measurement. The pre-change budget it was chosen against appears in no repo artifact and has never
been read off the live container. **Nobody may cite 1 GB as a sized figure**, and no "we increased
retention by N×" claim is available until D-L1 lands. The word *provisional* is carried in the
`update.sh` comment and the knowledge-base note as well as here, on purpose.

**R4 — the new assertion is a LINT, and it creates no automatic gate.** It greps structure; it proves
nothing about behaviour, which is observable only on the box. And **this repo has no CI** — task
`0201` established the day before that its one existing shell harness sat broken for roughly two
months precisely because nothing runs it. **This assertion raises the local ceiling only.** It catches
a dropped flag *if a human runs the harness*. It will not stop a regression on its own.

**R1 — scope, and what was declined.** Both levers shipped. **Budget-only (A alone) was offered and
DECLINED.** **Option B (separating the streams back into a dedicated nginx access-log file) stays
REJECTED** and must not be reintroduced — it is the exact 2026-07-15 disk-full failure mode, and there
is no `logrotate` in the image. **Option D (shipping logs off-box) is the acknowledged real fix and is
OUT OF SCOPE here** — C+A buys days of window for hours of work; **it does not make the container log
a durable evidence store, and nobody may later read it as having done so.**

---

## Risk note carried forward, not closed

- ⚠️ **The disk-headroom conclusion is OPEN — on three boxes, not one.** The new worst-case footprint
  is 1 GB **per box**, and decision **D2** applied the flags to every environment `update.sh` deploys
  (`deploy.sh:3,39` accepts `dev|staging|prod`). Whether that is comfortable depends on each disk's
  total size, and **no total is established anywhere in the repo** for any of the three — the figure
  in circulation for prod is operator memory, and dev/staging headroom is named nowhere at all.
  D-L3 gates it, per box. Per ruling R5 no total is stated as fact in any artifact this task produced,
  and none is stated here.
  *(Corrected in Round 2, finding **F7**: the original note was written for a single box and did not
  widen the gate to match D2's widened blast radius.)*
- **The other containers on the host are untouched and still inherit the host default.**
  `node-exporter` and `otel-collector` (created by `setup.sh`) carry no `--log-opt`. Out of scope;
  worth a follow-up brief.
- **No unbounded log destination was created** (brief constraint §5, plan §2). Verified by reading the
  change back: `json-file` with both `max-size` and `max-file` set is bounded, and `access_log off;`
  removes lines rather than redirecting them to a file.

---

## Decision log — judgment calls made under the standing approval

Recorded per ADR-019's audit obligation, which transfers with the permission. Each entry names what
changed, and why it qualified as in-plan-`CORRECT`-mechanical or obvious-winner-within-intent.

**D1 — Put the R4 assertion in the existing `tests/scripts/profile-deploy-hardening.test.sh` rather
than a new harness file.** *Obvious winner within the plan's intent.* The plan's wording —
*"extend the existing `…profile-deploy-hardening.test.sh`-style shell assertion pattern"* — is
ambiguous between *in that file* and *in that style*. That file already ends with a
**"Structural parity checks"** section asserting over `setup-profile.sh`, `setup-telemetry.sh` and
`build-deploy-telemetry.sh` — i.e. it is already the repo's home for grep-level structural checks over
deploy scripts other than its namesake. A new file would have created a **second harness nothing
runs**, which is precisely `0201`'s finding. I also updated the file's header comment to disclose the
widened scope rather than let the name quietly lie. **Not escalated** — it stays inside the plan's
intent and reverses cheaply (move the block).

**D2 — Applied the log flags to every environment `update.sh` deploys, not prod only.** *Obvious
winner within intent.* `update.sh` serves dev deployments too (it branches on `ENVIRONMENT_NAME` only
for the `--restart` policy), and both inherited the same invisible host default. Scoping to prod would
have added a conditional for no stated benefit and left dev on the untracked default the task exists to
eliminate. **Reversible** with one `if`.

**D3 — Made the assertions awk-scoped and added two "located the block" guards, beyond the plan's
literal "grep-level check".** *Mechanical and in-plan.* The plan asked for a grep that the flags are
present. A bare file-wide grep would pass on a stray match in a comment — including the very comment I
added — and would pass **vacuously** if the `docker run` block were renamed away. `0202` is an open
brief about exactly that false-green class in this harness. Scoping to the extracted block, adding
presence guards, and adding the "server-level `access_log` still goes to stdout" check (so nobody
"fixes" this by silencing logging site-wide) is strictly more faithful to what the plan wanted.
Verified by the mutation test above. **Not escalated** — it strengthens the approved item without
widening scope.

**D4 — Reverted my own incidental whitespace-only deletions in `nginx.conf`.** *Mechanical.* The first
edit stripped two trailing-whitespace-only lines as a side effect, one of them outside the changed
block. Restored so the diff is purely additive, per the minimal-diff rule.

**D5 — Did not run `nginx -t`.** *Not a judgment call about scope; a stated limitation.* nginx is not
installed on this host and validating it would require building the image — adjacent to the deploy
path R5 forbids. Recorded as unverified above and folded into D-L4 rather than silently skipped.

**Nothing was escalated as `NEEDS-DECISION`.** No frontier-move, regression, disputed severity, or
out-of-plan change arose.

---

## Round 2 — stateful review processed

**Ledger:** [`review.md`](review.md). **Verdict: ⚠️ Changes requested — 8 findings (F1–F8), none
blocking. Codex coverage FULL** (`codex-cli 0.152.0`, exit 0) — not degraded. Owner dispositions ruled
2026-09-01 via `AskUserQuestion` in the fkit-lead session.

**Every finding was verified against the files before anything changed. All eight reproduce.** Seven
fixed, one accepted as a residual. The reviewer's section was not touched.

### The finding that mattered most — F1

The plan's justification for lever C named three fallback visibility mechanisms. **Two of them do not
exist**, and I verified that myself rather than take the reviewer's word:

- `initWorkerMetrics` is called only from `src/server/Worker.ts:136`. `src/server/Master.ts`, which
  serves this route, contains **zero** metric references (`grep` returns nothing), and `package.json`
  has no OTEL HTTP/express auto-instrumentation. The master process emits no metrics at all.
- The handler is `res.send(publicLobbiesJsonStr)` — no logging, no counter. No `morgan` or
  `express-winston` anywhere in `src/server/`.
- `nginx.conf` defines no `log_format`, so the built-in `combined` format applies — it never carried
  `$upstream_cache_status`. So there is **no server-side hit ratio**, only the response header.

⚠️ **That false justification was carried into the `nginx.conf` comment and the knowledge-base note —
the two artifacts whose entire job is to stop a future incident responder restoring the log line. A
comment cannot do that job while asserting things that are not there.** The owner ruled the decision
**stands** (the endpoint returns a precomputed static string, so per-request logging genuinely has low
diagnostic value, and `error_log` still catches upstream failures) **but the claim must be corrected**.
Both artifacts now state what actually remains, including the explicit "do not assume this endpoint is
covered somewhere else — it is not." **No follow-up brief was filed: that option was offered to the
owner and declined.**

### What changed, by finding

| # | Verdict | Action |
|---|---|---|
| F1 | Correct — defect | `nginx.conf` comment and the knowledge-base note rewritten to state the real, reduced visibility. Lever C itself unchanged. |
| F2 | Correct — defect | Assertions now check **values**, not flag presence. |
| F3 | Correct — defect | Server-level `access_log` check now brace-depth-scoped, not a file-wide grep. |
| F4 | Correct — defect | The overclaimed mutation-test wording above is corrected in place. |
| F5 | Correct — **accepted residual** | Not fixed, deliberately. Recorded below. |
| F6 | Correct — defect | Knowledge-base note now carries the image-rebuild requirement. |
| F7 | Correct — defect | Risk note and D-L3 widened from one box to three. |
| F8 | Correct — defect | Harness header no longer claims coverage of "ALL the deploy scripts". |

### F5 — accepted residual, not a fix

A semantically identical reformat of the `docker run` invocation (collapsing it to one line, or
indenting it inside an `if`) turns three assertions **red** even though every flag is present and
deploy behaviour is byte-identical. **Owner ruling: record, do not fix — it fails LOUD, which is the
safe direction for a lint to be wrong in.** It is now written into the section's own comment so the
next person to hit it recognises a false red instead of hunting a regression.

### Two-direction mutation test (deletion **and** corruption)

The Round 1 mutation covered deletion only — F4's point. Both directions now fail correctly; full
output is in the Round 2 evidence returned to the driver. The two cases that previously passed
**green** are the important ones:

- **F2's silent case** — `max-size=1m max-file=1`, valid Docker that deploys cleanly and reinstates a
  1 MB ring — now reds on three assertions.
- **F3's catastrophic case** — site-wide `access_log off;` plus a stray `access_log /dev/stdout;` left
  in a location block — now reds on two.

Both files were restored afterwards and confirmed **byte-identical by SHA-256**, and the harness is
green again.

---

## Decision log — Round 2

**D6 — Fixed F6 although the relayed dispositions did not cover it.** ⚠️ **Flagged rather than done
quietly: the owner ruled on F1–F5, F7 and F8; F6 carried no disposition.** I verified it independently
and it holds — the knowledge-base note, which is the artifact a future operator actually finds, said
retention "ships on every ordinary deploy" and never mentioned that `nginx.conf` is baked into the
image (`Dockerfile:87`), so a plain `deploy.sh` run ships lever A and **silently not** lever C. I
applied it as an **obvious winner**: it is a documentation-accuracy fix, in the same file and the same
class as F1 which I was ordered to correct, inside plan §5 step 3's artifact, and it reverses by
deleting one table. **Taking the cheapest-to-reverse branch rather than stalling the round on a
low-severity wording fix — but the missing disposition is surfaced, not absorbed.** If the owner meant
to decline F6, revert that table.

**D7 — F2 fixed with exact expected values plus shape checks, not an invented size floor.**
*Judgment call, in-plan.* A floor ("total ceiling must be ≥ N MB") would tolerate the owner's mandated
re-tune, but **any N I picked would be a number I invented**, and R5 forbids anchoring on the
unverified pre-change baseline — the only reference point available. Instead: `EXPECTED_MAX_SIZE` /
`EXPECTED_MAX_FILE` are declared once at the top of the section, so a re-tune must update them
**deliberately** and the failure message says exactly that. Two shape checks (`max-size` matches
`<digits><unit>`; `max-file` is an integer **≥ 2**) sit alongside and stay valid across any re-tune —
`max-file=1` means no rotation at all and is caught on its own merits, independent of the expected
value. **The coupling is the feature: a change to the retention budget should not be able to pass
silently.**

**D8 — Added two assertions beyond F3's literal ask.** *Mechanical, same invariant.* F3 asked that the
server-level `access_log` check be properly scoped. Fixing the scope alone would still have left the
guard half-blind, so alongside it: an explicit check that `access_log off;` is **not** present at
server level (the catastrophic direction, asserted directly rather than inferred), and the matching
`error_log /dev/stderr;` check. **Not a scope widening** — same directive family, same failure mode,
same block of the same file. Both proven to fire by the mutation test.

**D9 — Did not re-open levers C or A.** Both were cleared independently by both reviewers and the
driver instructed they stay closed. Nothing in my verification contradicted that: `access_log` is
valid in a `location` context, the server-level `access_log /dev/stdout;` at `nginx.conf:72` and
`error_log /dev/stderr;` at `:73` are intact, and `update.sh`'s `docker run` is still the file's only
one. **`nginx -t` remains deferred to D-L4 per R5** — unchanged, still unverified.

**Nothing was escalated as `NEEDS-DECISION` in Round 2.** Every finding survived verification; no
regression, oscillation, or out-of-plan change arose. The one gap — F6's missing disposition — is
recorded above as **D6** rather than silently resolved.

---

## Not done, deliberately

- **Nothing committed or pushed.** All four changes sit in the working tree.
- **`brief.md` not edited.** Status left `🔄 In progress` — the driver owns it.
- **`/fkit-task-done` not invoked** (and since ADR-033 it is producer-only anyway).
- **`ai-agents/wiki-vault/` not touched.**
- **`plan.md` not re-authored, re-rendered or edited.**
- **No other worker's uncommitted files touched.** The tree carries in-flight work from several other
  tasks; a clean-diff check is not a valid signal here, so each of my four files was verified by
  reading it back individually.
