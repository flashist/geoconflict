# Worklog — `0282` `setup-profile.sh` compose heredoc executes comment backticks as root

**Build step** — executed 2026-09-18 by `fkit-coder`, spawned by `fkit-sprint-ship-loop` under the
owner's plan approval (`AskUserQuestion`, live lead session, *"Approve — build it"*).
Plan: `plan.md` in this folder. Nothing committed, nothing pushed, no task file moved.

---

## 1. The defect, reproduced before it was fixed

The HEAD render (§7(a), stubbed `PATH`, `< /dev/null`) shows the four unescaped backticks being
**eaten** — the words are simply gone from the generated file, because the shell ran them as
commands and substituted their (empty) output:

```
5:    # only systemd's reboot path covered it — without fighting a deliberate
6:    # the way  does. Same intent as the game box's --restart=always (update.sh).
39:    # zombies. Together with Dockerfile.profile's exec-form  CMD this is what lets
40:    #  reach the graceful-shutdown handler (8 s drain < the 10 s stop grace).
59:    # named volume, not `docker exec`) is what makes the file visible to checks.sh on
```

Line 59 is the fifth site, which the brief did not know about: it was **escaped** (`` \`docker exec\` ``)
and therefore correct today. It still had to change, because a quoted delimiter would render the two
backslashes literally.

The four eaten words correspond to `docker compose stop`, `always`, `node` and `docker stop` — each
executed **as root** on the profile box at deploy time.

---

## 2. Change surface

| File | Change |
|---|---|
| `setup-profile.sh` | +30 / −6. Delimiter quoted (`<< 'EOF'`, line 992), a six-line ⛔ comment above it saying why, five comment lines de-backticked, and after the terminator: four literal `${var//…}` substitutions, a leftover-`${` guard that `exit 1`s, and `unset compose_rendered` — all before the existing `chmod 600`. |
| `tests/scripts/profile-deploy-hardening.test.sh` | +31 / −2. Both `COMPOSE_BLOCK` extraction anchors (0219 section and 0221 section) now stop at `<< ` instead of naming `EOF`; assertions N1–N4 added to the 0219 section. |

No other file touched. No source under `src/`. No box command run.

> ⚠️ **This table is the BUILD round only and is no longer the final state.** The process-review round
> (§8) changed the same two files again: the guard was widened and harness assertion **N5** was added.
> §8.1 has the current change surface.

### Substitution enumeration — the four variables, and that all four are guaranteed set

| Variable | Sites in the template | Guaranteed non-empty before line 992 |
|---|---|---|
| `POSTGRES_USER` | postgres healthcheck | `:-` default at line 106 |
| `POSTGRES_DB` | postgres healthcheck | `:-` default at line 107 |
| `PROFILE_IMAGE` | `profile-api.image` | hard-validated 150–156 (must be `@sha256:`-pinned or the script exits) |
| `PROFILE_PORT` | a comment, the `ports:` mapping (×2), the api healthcheck | `:-` default at line 101 |

No `$( … )` anywhere in the block; no remaining backslash whose meaning changes under a quoted
delimiter (proved empirically — a changed backslash would have shown in the render diff below, and
did not).

**The downstream consumer still works.** The rollback path (`sed -i "s|image: ${PROFILE_IMAGE}|…"`,
now at line ~1165) matches only if `PROFILE_IMAGE` reached the file **expanded**. The fixed render
shows `image: example/profile@sha256:0000…` — expanded. This is why quoting the delimiter alone
would not have been enough.

---

## 3. Acceptance criterion — the generated-file diff, verbatim

`diff -u head-compose.yml fixed-compose.yml`, both rendered from the same extracted region with
`POSTGRES_USER=profile POSTGRES_DB=profile PROFILE_PORT=8080
PROFILE_IMAGE=example/profile@sha256:<64 zeros>`:

```diff
--- head-compose.yml
+++ fixed-compose.yml
@@ -2,8 +2,8 @@
   postgres:
     image: postgres:16-alpine
     # unless-stopped (0221, G7): comes back after a Docker DAEMON restart — on-failure did not;
-    # only systemd's reboot path covered it — without fighting a deliberate
-    # the way  does. Same intent as the game box's --restart=always (update.sh).
+    # only systemd's reboot path covered it — without fighting a deliberate 'docker compose stop'
+    # the way 'always' does. Same intent as the game box's --restart=always (update.sh).
     restart: unless-stopped
     # Conservative memory caps for a low-RAM box (no auto-sizing). The swapfile above
     # is the host-level cushion; these keep Postgres itself bounded (the OOM lesson).
@@ -36,8 +36,8 @@
     image: example/profile@sha256:0000000000000000000000000000000000000000000000000000000000000000
     restart: unless-stopped
     # init: true (0221, G8): PID 1 is a real init that forwards SIGTERM to node and reaps
-    # zombies. Together with Dockerfile.profile's exec-form  CMD this is what lets
-    #  reach the graceful-shutdown handler (8 s drain < the 10 s stop grace).
+    # zombies. Together with Dockerfile.profile's exec-form 'node' CMD this is what lets
+    # 'docker stop' reach the graceful-shutdown handler (8 s drain < the 10 s stop grace).
     init: true
     # DATABASE_URL + PROFILE_INTERNAL_TOKEN + PROFILE_PORT come from the 0600 profile.env.
     env_file:
@@ -56,7 +56,7 @@
     # Task 0284: the alert-path liveness probe's marker. The container path MUST equal
     # ALERT_PROBE_MARKER_PATH's directory in src/profile-server/AlertRelay.ts — two files
     # agreeing on one string, which the hardening harness asserts. A bind mount (not a
-    # named volume, not `docker exec`) is what makes the file visible to checks.sh on
+    # named volume, not 'docker exec') is what makes the file visible to checks.sh on
     # the host. ⛔ Never mount ./backups here.
     volumes:
       - ./alerts:/var/lib/profile/alerts
```

**Result: exactly five changed comment lines, ten diff lines total, and zero lines under
`services:` / `image:` / `environment:` / `healthcheck:` / `ports:` / `volumes:` / `logging:` /
`restart:`.** This is the owner-confirmed criterion (five lines, single quotes) met exactly.

### A stronger statement of the same thing

`docker compose config` output — the *parsed* configuration, which discards comments — is
**byte-identical** between the HEAD render and the fixed render when both are parsed from the same
directory. The change cannot alter any service's config hash, so it cannot on its own cause a
container recreate.

*(Pre-existing behaviour, not caused by this task: the next `setup-profile.sh` run recreates
`profile-api` regardless, via its unconditional `up -d --force-recreate --no-deps profile-api`.)*

---

## 4. Verification — what was run, and what was observed

| § | Check | Result |
|---|---|---|
| 8.1 | `"${x//'${NAME}'/$VALUE}"` quoting form, scratch shell | **PASS** for the pattern side (a `${NAME}` in the PATTERN stays literal), and the `ph=` fallback was **not needed**. ⚠️ **CORRECTED 2026-09-18 after review finding R1.** This row originally called bash 3.2.57 *"the stricter case"* and reported `&` staying literal in the **replacement**. For this construct bash 3.2 is the **lenient** case, not the strict one: bash ≥ 5.2 turns on `patsub_replacement` by default, so an unquoted `&` in the replacement expands to the matched text. Re-measured this round: bash 3.2.57 → `x a&b y`; bash 5.2.15 (`debian:12`) → `x a${V}b y`. **The box runs the 5.x line, so the build-time check the plan mandated was run on the only platform that could not fail.** Corrected in the shipped code comment too — see §8. |
| 7(a) | HEAD render, then fixed render, then diff | **PASS** — five comment lines, verbatim above. |
| 7(b) | Fixed render produces no log output, **run without stubs** | **PASS.** Exit 0, stdout empty, stderr empty. No `command not found`, no compose/docker complaint. The HEAD render needed the `docker`/`node`/`always` stubs and `< /dev/null`; the fixed one needed neither. |
| 7(c) | `docker compose config` on the generated file | **PASS, actually run** — Docker CLI present and daemon up. Exit 0, empty stderr, and the healthcheck resolved to `pg_isready -U profile -d profile`. (The weaker `python3 -c 'import yaml'` fallback was **unavailable** — no `yaml` module on this host — but it was not needed.) |
| 7(d) | Backtick probe: `# probe \`whoami\`` inside the block | **PASS.** The generated file contains `` # probe `whoami` `` **verbatim**; the invoking user's name appears **0 times** in the file — nothing executed. N2 went **red** on the probe, which is the direct demonstration that the new guard catches the original defect. Probe then **removed**, file restored (`diff -q` clean), and the render re-taken: **byte-identical to the pre-probe fixed render**, diff back to five lines. |
| 7(e) | N1–N4 proved **red** before being trusted green | **PASS.** Against the unmodified HEAD script with the new harness: N1 ❌, N2 ❌, N4 ❌×4 (all four variables). N3 ✅ on both — expected and stated in the plan: there are zero `$( )` today, so N3 covers the other half of the hazard class rather than today's instance. Separately, an **isolated** probe that unquoted the delimiter *only*: N1 ❌ alone, everything else ✅. |
| 7(f) | `bash tests/scripts/profile-deploy-hardening.test.sh` | **`ALL PASS`** |
| 7(f) | `npm test` | **PASS — 137 suites / 1853 tests.** No failures. No supertest flake this run, so no re-run was needed and no `0197` triage applied. `ShellHarnesses.test.ts` did **not** skip the Docker-probed harness (daemon was up). ⚠️ **Wall-clock figure dropped 2026-09-18 after review finding R6.** This row originally read *"60.2 s"*; an independent verifier measured **87.5 s** and the process-review round measured **58.0 s**, all three with identical 137/1853 green. The number is host-load noise and does not reproduce — **do not treat any of the three as a baseline.** What is durable: the suite is green, and the shell harnesses dominate the run. |
| 7(f) | `npm run lint` | **PASS**, clean (no output). |
| — | `bash -n` on both changed shell files | **PASS.** |

### Recorded NOT RUN

- **`shellcheck`** — **NOT RUN: not installed on this host.** It is not part of the project's gate
  (`npm run lint` is eslint over TS) so this is a missed bonus, not a skipped requirement.
- **§7(g) box verification** — **NOT RUN by design: owner-executed.** Nothing here is evidence about
  the deployed box. The fix takes effect only when `setup-profile.sh` next runs there, riding
  `0217`'s already-mandatory redeploy; until then the box's compose file and behaviour are unchanged,
  and nothing is broken today.
- **`python3` YAML fallback** — not run; unnecessary, since the stronger `docker compose config`
  check ran and passed. Noted only so the plan's contingency is visibly accounted for.

### One process note, stated because it could have produced a false green

The first attempt at the unquote-only probe used `perl -0pi -e` and **silently did not modify the
file**. The harness was then run against an unmodified (fixed) script and, unsurprisingly, printed
all-green — which would have been read as "N1 does not fire". Caught by checking the mutation landed
before reading the result. The probe was redone with `sed -i ''` plus an explicit mutation assertion,
and N1 then went red as expected. **Every probe in this worklog verifies its own mutation before its
result is believed.**

---

## 5. Harness changes — why each is stronger, not looser

| Harness site | Change | Why it is not a weakening |
|---|---|---|
| Line ~395 and ~1007, `COMPOSE_BLOCK=$(awk …)` | Extraction anchor stops at `<< ` instead of matching the literal `<< EOF` | The old anchor would **silently fail to match** a quoted delimiter, making `COMPOSE_BLOCK` empty and every derived assertion (service count, per-service `logging:`, `max-size`/`max-file`, `restart: unless-stopped`, `init: true`) vacuous or falsely red. The new anchor matches either form; the delimiter itself is now asserted **explicitly** by N1. Net: one silent-vacuum path removed, one explicit lock added. Confirmed empirically — the extraction worked against both the HEAD (unquoted) and fixed (quoted) scripts in the runs above. |
| N1 | `grep -qF` for the exact quoted-delimiter line | Fixed-string match on one line the script must contain. False red possible (someone reflows that exact line), false green not. |
| N2 | No backtick anywhere in the block | Zero occurrences after the fix; a backtick has no meaning in this YAML or its comments. Deliberately catches **escaped** backticks too — a rule that had to distinguish `` ` `` from `` \` `` is the brittle one. **This is the assertion that would have caught the original defect.** |
| N3 | No `$( ` in the block | Covers the half of the hazard class N2 does not. Zero occurrences today. |
| N4 | Every `${NAME}` in the template has a matching `compose_rendered//'${NAME}'` line | Gates the **fix's own** new failure mode: someone adds a placeholder and forgets the substitution, and the box silently gets it interpolated from the environment or to empty. Coupled to the spelling of the substitution lines — a false red if the mechanism changes, never a false green. Same accepted residual class the 0219 section already declares. |

**No existing assertion was loosened to make the build pass.** Exactly two lines changed, both
extraction anchors.

---

## 6. Brief item 4 — the same pattern elsewhere (REPORT ONLY; owner ruled "fix none")

Owner ruling at the plan gate: *"Other unquoted heredocs: report only, fix none. Do not edit
`setup-telemetry.sh`, `build-deploy-telemetry.sh` or `setup.sh`."* No such edit was made.

Every unquoted `<< DELIM` heredoc in the six named scripts, and whether its body can execute:

| File | Heredoc | Backticks in body? | Verdict |
|---|---|---|---|
| `setup-profile.sh` | fail2ban jail | none | Fine. `${SSH_PORTS_CSV}` is the point of the unquoted delimiter. |
| `setup-profile.sh` | `profile.env` | none | Fine. Every line is `NAME=${NAME}` — expansion is the entire purpose. Left unquoted. |
| `setup-profile.sh` | **compose block** | **5 sites, 4 unescaped** | **The defect. Fixed by this task.** |
| `setup-profile.sh` | `NGINXEOF` | none | Fine, and instructive: every nginx runtime variable is correctly escaped (`\$host`, `\$remote_addr`, `\$proxy_add_x_forwarded_for`, `\$scheme`) while the intended values expand on purpose. |
| `setup-profile.sh` | cron header | one — **escaped** (`` \`date\` ``) | Fine, correct as written. |
| `setup-profile.sh` | cron append (×3) | none | Fine. |
| `build-deploy-profile.sh` | none unquoted | — | Nothing to report. |
| `setup-telemetry.sh` | nine unquoted heredocs incl. `NGINXEOF` | none in any body | Same latent shape, **no live instance**. Report-only. |
| `build-deploy-telemetry.sh` | `EOFCFG` + one more | none | Report-only. |
| `setup.sh` | one | none | Report-only. |
| `update.sh` | none unquoted | — | Nothing to report. |

**Exactly one live instance existed, and it is the one this task fixed.** The author escaped
correctly in the cron and nginx heredocs and missed only the compose block — which is the argument
for a gate (N1–N4) rather than for trusting care.

---

## 7. Decision log (unattended work, ADR-019 audit obligation)

Build worker under the sprint loop's standing approval. Every change made is inside the approved
plan; no out-of-plan change, no obvious-winner call, no loosened assertion, no scope widening.

| # | Decision | Why it qualified |
|---|---|---|
| 1 | Used the primary `"${x//'${NAME}'/$VALUE}"` form rather than the `ph=` fallback | Plan §2 makes this conditional on a scratch-shell check; the check passed on bash 3.2. Mechanical, in-plan. |
| 2 | Added two extra confirmations the plan did not require: parsed-`config` byte-comparison HEAD vs fixed, and re-rendering after probe removal to prove byte-identity | Verification only. Adds evidence; changes no source. |

**No `NEEDS-DECISION` was reached.** Nothing in the plan turned out not to work.

---

## 8. Process-review round 1 — 2026-09-18

**Process-review step** — executed by `fkit-coder`, spawned by `fkit-sprint-ship-loop` under the
owner's standing plan approval **plus five explicit owner dispositions** relayed by the driver
(`AskUserQuestion`, live lead session, 2026-09-18). Ledger: `review.md` in this folder.
Nothing committed, nothing pushed, no task file moved, `plan.md` left **byte-unchanged**
(`git hash-object` → `66c6209be6553ba23ca11893432dbff0cb3caa0a`, 25098 bytes, matching the blob the
driver carried).

**Every finding was independently reproduced on this host before anything was written.** None was
taken on the reviewer's word; none was refuted.

### 8.1 Change surface this round

| File | Change |
|---|---|
| `setup-profile.sh` | The pre-substitution comment (was ~1066-1068) **replaced** — the false "cannot inject anything" claim is gone (R1), and the R3 residual is named in the code. The post-condition guard **widened** (R2): `$$` pairs are stripped into `compose_dollar_scan`, then the braced `${` check runs as before *and* a new unbraced `\$[A-Za-z_]` check fails closed with its own message. `unset` now clears both variables. |
| `tests/scripts/profile-deploy-hardening.test.sh` | **N5 added** (R2): the compose template may not contain an unbraced `$NAME` at all. `$$` pairs stripped before the scan. |
| this `worklog.md` | §4 row 8.1 corrected (R1), §4 row 7(f) figure dropped (R6), this section added. |
| `review.md` | *Coder response* + *Accepted residuals* sections written. The reviewer's section untouched. |

**No code change for R3, R4 or R5** — owner ruled accept/file. **N4 was not altered**: it still gates
the braced form, and N5 covers the unbraced form by banning it outright. Banning is the honest gate
here, because the substitution mechanism only handles `${NAME}` — asserting "an unbraced `$PORT` has a
substitution line" would be asserting something untrue.

### 8.2 False-positive check on the widened guard (owner asked for this explicitly)

The worry is a widened guard that hard-fails a legitimate deploy. What was checked:

- **`$$` is Compose's escape for a literal dollar and is NOT interpolated** — measured with
  `docker compose config`: `echo $$HOME && echo $${NOT_A_PLACEHOLDER}` passes through verbatim, no
  warning. A future `$$HOME` in a `CMD-SHELL` healthcheck is therefore legitimate, so **`$$` pairs are
  stripped before both the runtime scan and N5.** Proved green: a template mutated to
  `... /health || echo $$HOME` renders with **exit 0, empty stdout/stderr**, and N5's exact pipeline
  stays green on it.
- **A lone `$` before a letter is a TRUE positive, not a false alarm.** Compose interpolates the
  unbraced form: measured `docker compose config` on `"127.0.0.1:$PROFILE_PORT:$PROFILE_PORT"` →
  three `variable is not set. Defaulting to a blank string` warnings and then `invalid proto:`. So a
  value that legitimately contained `$name` would already be broken on the box; failing at deploy
  time is strictly better than shipping it.
- **The four values cannot trip it today.** `POSTGRES_USER` / `POSTGRES_DB` / `PROFILE_PORT` are
  `:-` defaults (lines 101/106/107) and `PROFILE_IMAGE` is `@sha256`-validated (line 154) — an image
  reference cannot contain `$`. Confirmed by the real render: exit 0, empty output.
- **The template itself has exactly five `$` occurrences, all braced** — `${POSTGRES_USER}`,
  `${POSTGRES_DB}`, `${PROFILE_IMAGE}`, `${PROFILE_PORT}` ×3 (one in a comment, two in `ports:`, one
  in the api healthcheck). Zero unbraced today, so N5 starts green rather than grandfathering a
  violation.

### 8.3 Red-proof — mutation asserted BEFORE the result was read

The build round nearly produced a false green when a `perl -0pi -e` edit silently did nothing. Every
probe this round asserts its own mutation first and **refuses to read the harness result** if the
assert fails. It fired twice for real (a shell-expanded grep pattern, then a `sed` delimiter clashing
with `||`) and both times the run was abandoned rather than believed.

The working tree was **never** mutated. A scratchpad **mirror** of the repo was built from symlinks,
with only `setup-profile.sh` as a real (mutable) copy; because the harness derives `REPO_ROOT` from
`dirname "$0"`, invoking the mirrored path points it at the mirror. `git show HEAD:setup-profile.sh`
was used for the HEAD render — no `git stash` at any point.

| Probe | Mutation assert | Result |
|---|---|---|
| Mirror, unmutated | — | `ALL PASS`, N5 **green** |
| Mirror, `ports:` → unbraced `$PROFILE_PORT` | `braced-before=1 unbraced-after=1` ✅ | harness **exit 1**, N5 ❌. N1–N4 all stayed **green** — which is precisely R2: N4's braced-only regex is blind to it. |
| Same mutated script, rendered | as above | widened guard **exit 1**, message `contains an unsubstituted $NAME placeholder (unbraced form)` |
| **The old braced-only guard on that same rendered file** | — | **QUIET.** This is the proof the widening is load-bearing, not decoration. |
| Template with a legitimate `$$HOME` | `target-before=1 dollardollar-after=1` ✅ | render **exit 0**, output empty; N5 **green** |

### 8.4 Re-verification after the change

| Check | Result |
|---|---|
| `bash -n` on both changed files | **PASS** |
| Plan §7(a) five-line rendered diff, `git show HEAD:setup-profile.sh` vs working tree | **PASS — still exactly 5 changed comment lines, 5 `-` and 5 `+`.** Zero lines under `services:` / `image:` / `environment:` / `healthcheck:` / `ports:` / `volumes:` / `logging:` / `restart:`. **The R2 widening changed nothing in the generated compose file.** |
| Fixed render **without** stubs | **PASS** — exit 0, stdout and stderr both empty |
| `docker compose config` on the fixed render | **PASS, actually run** — exit 0, empty stderr (Docker daemon up) |
| `bash tests/scripts/profile-deploy-hardening.test.sh` | **`ALL PASS`** (8 `0282` assertions green, N5 among them) |
| `npm test` | **PASS — 137 suites / 1853 tests, all green.** No supertest failure this run, so no `0197` triage and no re-run was needed. (Wall clock 58.0 s; per R6 that number is host-load noise — recorded, not offered as a baseline.) |
| `npm run lint` | **PASS**, exit 0, no output |

### 8.5 Decision log — unattended work this round (ADR-019 audit obligation)

Process-review worker under the sprint loop's standing approval. Everything below is inside the
approved plan **plus** the five relayed owner dispositions. **No `NEEDS-DECISION` was reached.**

| # | Fix applied without asking | Which finding | What changed | Why it qualified |
|---|---|---|---|---|
| 1 | Rewrote the pre-substitution comment in `setup-profile.sh` | **R1** | Deleted the false "pattern and replacement are both literal, so … cannot inject anything" claim; replaced it with the measured `patsub_replacement` behaviour, the reason there is no portable inline fix, and the accurate reason the code is safe today (defaulted/validated values + the fail-closed guard). | Owner disposition: *"correct all three places … the code stays as it is; the claim is what changes."* Comment-only, localized, verified `CORRECT` by re-measuring on bash 3.2.57 and 5.2.15. |
| 2 | Corrected §4 row 8.1 in this worklog | **R1** | Same correction, marked as a correction rather than silently rewritten, so the wrong reasoning is findable. | Same disposition, second of the three named places. (The third, `plan.md`, is ⛔ the driver's — left byte-unchanged.) |
| 3 | Widened the runtime post-condition guard | **R2** | Strip `$$`, then check braced `${` (unchanged message) **and** unbraced `\$[A-Za-z_]` (new message), fail closed on either. | Owner disposition: *"close it now … widen both the runtime guard and the N4 harness assertion."* Verified `CORRECT` (Compose interpolates the unbraced form — measured), mechanical, in-plan. False-positive risk checked in §8.2 and red-proved in §8.3. |
| 4 | Added N5 to the hardening harness | **R2** | Bans an unbraced `$NAME` in the compose template outright; `$$` stripped first. | Same disposition. **Shape choice made autonomously:** the owner said "widen N4"; N4 asserts *"this placeholder has a substitution line"*, which cannot be true of an unbraced name (only `${NAME}` is substituted). Banning the form is the only assertion that is actually true, gates the same gap, and matches N2/N3's existing ban-outright style. **Obvious winner within the disposition's intent** — same gap closed, no alternative that is not a false assertion. |
| 5 | Dropped the `60.2 s` figure from §4 row 7(f) | **R6** | Replaced with "green, 137/1853" plus all three measured wall clocks and an explicit *not a baseline*. | Owner disposition: *"soften or drop the number."* Worklog-only. |
| 6 | Recorded R3, R5 as accepted residuals; R4 as out-of-scope-and-filed | **R3 · R4 · R5** | Ledger *Accepted residuals* section + §8.6 below. Plus one in-code line naming the R3 residual at the substitution block. | Owner ruled accept / file-as-its-own-task. The one-line code comment is the only code touched for these three, and it adds no behaviour — it puts the known limitation where the next editor will read it. |

**Nothing was applied outside the approved plan or the five dispositions. No assertion was loosened.
No finding was refuted** — all six reproduced exactly as the reviewer stated them.

### 8.6 Accepted residuals recorded this round

- **R3 — sequential re-scan.** The four substitutions run over one accumulating string, so an earlier
  value's bytes are re-scanned by later passes. Reproduced on **both** bash 3.2.57 and 5.2.15:
  `POSTGRES_USER='app${POSTGRES_DB}' POSTGRES_DB=db` renders `pg_isready -U appdb -d db` and the guard
  stays **quiet**. The post-condition proves *"no placeholder survived"*, not *"values were inserted
  literally"*. Owner ruled **accept**; no code change. Named in the code comment so the next editor
  sees it.
- **R5 — the 0644 window.** The file is written twice and sits at the umask default until `chmod 600`.
  Observed `-rw-r--r--` after a guard trip in this round's own probe. Pre-existing (HEAD also did
  `cat >` then `chmod 600`, lines 986/1060), and the file holds no secret — credentials live in the
  separate 0600 `profile.env`. Owner ruled **accept**; no code change.
- **R4 — multi-line `PROFILE_IMAGE`.** Out of scope, **filed as its own task** by the driver's
  producer spawn. Independently reproduced here on both bash versions: a value ending in
  `@sha256:<64 hex>` with embedded newlines **passes** the validation at `setup-profile.sh:154`,
  because bash `=~` anchors `$` at end of **string**, not end of line. **Pre-existing** — identical
  through HEAD's unquoted heredoc. Severity is **disputed and both views must reach the brief**:
  Codex rated it `HIGH`, this project's reviewer downgraded it to `LOW` (operator-supplied input to a
  root-run deploy script is inside the trust boundary, so it is not a privilege crossing).

---

## 9. State left behind

- Both edits are in the **working tree, uncommitted**. Nothing staged, nothing pushed.
- The task brief has **not** been moved (producer-only, ADR-033).
- No wiki write.
- No secret in this worklog: the renderer used only `example/profile@sha256:<64 zeros>` and
  `127.0.0.1`; no host, IP, domain, token or connection string appears anywhere in the change.
- Scratchpad artifacts (renderer, stubs, both renders, diffs) are outside the repo; the repo root is
  clean of temporary files.
