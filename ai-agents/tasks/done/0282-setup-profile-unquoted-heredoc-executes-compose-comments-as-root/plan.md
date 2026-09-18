# Plan — task `0282`: `setup-profile.sh` compose heredoc executes comment backticks as root

### 0. Ground truth established while planning (read-only; nothing written)

- The compose heredoc is **`setup-profile.sh:986`** (`cat > "$PROFILE_DIR/docker-compose.yml" << EOF`), body **987–1057**, terminator `EOF` at **1058**, `chmod 600` at **1060**.
- The script is `#!/bin/bash` (line 1) and already uses bash-only constructs (`[[ … =~ … ]]`, 18 sites), so bash parameter substitution is available.
- `set -e` is on (line 86); `set -u` is **not**.
- **The cwd at expansion time is the script's inherited cwd** — the only `cd` in the whole file is `cd "$PROFILE_DIR"` at **line 1066**, i.e. *after* the heredoc. So `` `docker compose stop` `` runs in whatever directory the deploy's SSH session landed in, not in `/opt/profile`. That answers the brief's open question in *Context* item 1: today it is the root SSH home, which holds no compose file; nothing in the script guarantees that, and nothing would warn if it changed.

---

### 1. Enumeration of every expansion in the heredoc body (lines 987–1057)

This is the load-bearing part. Twelve expansion sites, listed individually, none summarised.

| # | Line | Text | Kind | Classification |
|---|---|---|---|---|
| 1 | 991 | `` `docker compose stop` `` (in a comment) | backtick command substitution | **ACCIDENTAL** — runs `docker compose stop` as root |
| 2 | 992 | `` `always` `` (in a comment) | backtick command substitution | **ACCIDENTAL** — runs `always` |
| 3 | 1006 | `${POSTGRES_USER}` in `test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER} …']` | parameter expansion | **INTENTIONAL — must survive** |
| 4 | 1006 | `${POSTGRES_DB}` in the same healthcheck | parameter expansion | **INTENTIONAL — must survive** |
| 5 | 1022 | `image: ${PROFILE_IMAGE}` | parameter expansion | **INTENTIONAL — must survive** |
| 6 | 1025 | `` `node` `` (in a comment) | backtick command substitution | **ACCIDENTAL** — runs `node` |
| 7 | 1026 | `` `docker stop` `` (in a comment) | backtick command substitution | **ACCIDENTAL** — runs `docker stop` |
| 8 | 1031 | `${PROFILE_PORT}` **inside a comment** (`host nginx proxies 443 -> 127.0.0.1:${PROFILE_PORT}.`) | parameter expansion | **INTENTIONAL** — it renders the real port into the generated comment today. Easy to miss because it is in a comment. |
| 9 | 1033 | `${PROFILE_PORT}` ×2 in `- "127.0.0.1:${PROFILE_PORT}:${PROFILE_PORT}"` | parameter expansion (two occurrences) | **INTENTIONAL — must survive** |
| 10 | 1038 | `${PROFILE_PORT}` in `test: ['CMD-SHELL', 'curl -fsS http://localhost:${PROFILE_PORT}/health …']` | parameter expansion | **INTENTIONAL — must survive** |
| 11 | 1045 | `` \`docker exec\` `` (in a comment) | **escaped** backticks | **Neither** — today it correctly produces literal backticks. Under a quoted delimiter the two backslashes would become literal too, so this line **also changes** and must be edited. This is the site the brief did not know about. |
| 12 | — | *(no `$( … )` anywhere in the block; no other `$`; no other backslash)* | — | verified by scanning every `$`, `` ` `` and `\` in 987–1057 |

**Distinct variables needing substitution: exactly four** — `POSTGRES_USER`, `POSTGRES_DB`, `PROFILE_IMAGE`, `PROFILE_PORT`. All four are guaranteed non-empty before line 986: `PROFILE_PORT` (101), `POSTGRES_USER` (106) and `POSTGRES_DB` (107) have `:-` defaults; `PROFILE_IMAGE` is hard-validated at 150–156 (must be `@sha256:`-pinned or the script exits). So no new empty-value guard is needed, and that is a checked fact, not an assumption.

**A downstream consumer that depends on substitution #5 still happening:** the rollback path at **line 1146** runs `sed -i "s|image: ${PROFILE_IMAGE}|image: ${PREV_PROFILE_IMAGE}|"` against the generated file. If `${PROFILE_IMAGE}` ever reached the file unexpanded, rollback would silently match nothing and leave the bad image in place. This is the concrete reason the fix must not merely quote the delimiter.

---

### 2. Approach chosen, and what the alternatives cost

**Chosen: quote the delimiter (`<< 'EOF'`), then substitute the four values back with literal bash pattern substitution, then assert no placeholder survived.**

```bash
# ⛔ The delimiter is QUOTED ('EOF') DELIBERATELY — task 0282. With an unquoted
# delimiter the shell expands this body, so a backtick in a COMMENT becomes a command
# substitution that runs AS ROOT at deploy time (one of them was 'docker compose stop').
# Nothing in this block expands. The four values the file needs are substituted
# explicitly below. Do not write a backtick in here, even escaped: the hardening
# harness rejects it.
cat > "$PROFILE_DIR/docker-compose.yml" << 'EOF'
…body unchanged except the five comment lines…
EOF

# ── Substitute the four intended values, literally (task 0282) ────────────────
# Bash pattern substitution, not sed: pattern and replacement are both literal, so a
# value containing | & / or a newline cannot inject anything into the result.
compose_rendered=$(cat "$PROFILE_DIR/docker-compose.yml")
compose_rendered="${compose_rendered//'${POSTGRES_USER}'/$POSTGRES_USER}"
compose_rendered="${compose_rendered//'${POSTGRES_DB}'/$POSTGRES_DB}"
compose_rendered="${compose_rendered//'${PROFILE_IMAGE}'/$PROFILE_IMAGE}"
compose_rendered="${compose_rendered//'${PROFILE_PORT}'/$PROFILE_PORT}"
printf '%s\n' "$compose_rendered" > "$PROFILE_DIR/docker-compose.yml"
# Post-condition: no placeholder may survive. Compose would interpolate a leftover
# ${…} from the box environment (or to empty) and the port/healthcheck would be
# silently wrong — worse than failing here.
if printf '%s' "$compose_rendered" | grep -q '\${'; then
    echo "Error: docker-compose.yml still contains an unsubstituted \${...} placeholder (task 0282)."
    exit 1
fi
unset compose_rendered

chmod 600 "$PROFILE_DIR/docker-compose.yml"
```

**Why this shape:**

- **`${var//pat/rep}` over `sed`.** `sed` would need a delimiter that cannot appear in the value; `PROFILE_IMAGE` contains `/`, `:` and `@`, and `&` in a `sed` replacement means "the whole match". Bash substitution has no such hazard on the replacement side, and single-quoting the pattern keeps `${POSTGRES_USER}` from expanding *inside the substitution itself*. **Build-time check required:** the quoting form `"${x//'${NAME}'/$VALUE}"` is subtle; verify it in a scratch shell before committing to it, and if it misbehaves fall back to `ph='${POSTGRES_USER}'; x="${x//"$ph"/$POSTGRES_USER}"`, which is unambiguous.
- **Write-then-rewrite in place, rather than a `compose_template=$(cat <<'EOF' …)` variable.** Both work. The in-place form keeps the opener line reading `cat > "$PROFILE_DIR/docker-compose.yml" << 'EOF'`, so the harness's two `awk` extractions keep their filename anchor and need only a one-token change; the template-variable form deletes the filename from that line and forces a larger harness rewrite. Cost of the chosen form: the file is written twice, and for a few milliseconds holds the un-substituted template. That template contains **no secret** (all credentials live in the 0600 `profile.env`, never in compose), and the file is already written-then-`chmod 600`'d today, so this changes nothing about exposure.

**Rejected alternatives, with their cost:**

| Alternative | Cost / why rejected |
|---|---|
| **De-backtick the comments, leave the delimiter unquoted** | Cheapest diff, and it fixes today's symptom. But it does **not** close the hazard class — the next `$something` or backtick in a comment executes again. The brief's *What to build* item 1 asks for the delimiter to be quoted, and the whole severity framing is "a latent root-command-execution channel", not "four broken comments". Rejected. |
| **Split heredoc** (quoted chunks for literal text, unquoted chunks for value lines) | The five value sites are scattered across lines 1006, 1022, 1031, 1033, 1038, so it needs six-plus `cat >>` chunks. It shreds a 70-line readable YAML block, and it breaks every `awk`-scoped harness assertion that treats the block as one region. Highest churn, worst readability. Rejected. |
| **`envsubst`** | Adds a dependency on `gettext-base` on a box we deliberately keep minimal, and substitutes *every* `${…}` including ones we may later want literal. Rejected. |
| **Placeholder tokens (`@@PROFILE_PORT@@`) + substitution** | Works, but invents a syntax, makes the in-repo block less readable than the file it generates, and loses the "no `${` may survive" post-condition (a leftover `@@…@@` is not detectable by a generic rule). Rejected in favour of keeping `${NAME}` as its own placeholder. |

**Comment normalisation (brief item 3).** All five backtick sites become single quotes, because the harness guard below bans backticks outright — a guard that has to distinguish escaped from unescaped backticks is exactly the brittleness worth avoiding:

| Line | Before | After |
|---|---|---|
| 991 | `` `docker compose stop` `` | `'docker compose stop'` |
| 992 | `` `always` `` | `'always'` |
| 1025 | `` `node` `` | `'node'` |
| 1026 | `` `docker stop` `` | `'docker stop'` |
| 1045 | `` \`docker exec\` `` | `'docker exec'` |

⚠️ **Deliberate deviation from the brief's acceptance criterion, stated up front.** The brief says the generated-file diff may show "only the four comment lines regaining their backticked words". This plan produces **five** changed comment lines, and the words come back in **single quotes, not backticks**. Line 1045 is the fifth (the brief did not know about its escaped backticks), and single quotes are what makes the new guard non-brittle. Everything else about the criterion holds unchanged: **any** difference in a `services:`, `image:`, `environment:`, `healthcheck:`, `ports:`, `volumes:`, `logging:` or `restart:` value is still a regression that fails the task. Listed in *Open questions* for the owner to confirm.

**Note on the `${PROFILE_PORT}` in the comment at line 1031** (enumeration #8): it is kept as a substitution, so the generated comment still shows the real port, exactly as today. Dropping it would be a silent content change on a sixth line.

---

### 3. Brief item 4 — the same pattern elsewhere (surveyed during planning; **report-only**, no edits proposed)

Every `<< DELIM` (unquoted) heredoc in the six named scripts, and whether its body can execute anything:

| File | Heredoc | Backticks in body? | Verdict |
|---|---|---|---|
| `setup-profile.sh` | 454–468 (fail2ban jail) | none | Fine. `${SSH_PORTS_CSV}` is the point of the unquoted delimiter. |
| `setup-profile.sh` | 775–792 (`profile.env`) | none | Fine. Every line is `NAME=${NAME}` — expansion is the entire purpose. Leave unquoted. |
| `setup-profile.sh` | **986–1058 (compose)** | **5 sites, 4 unescaped** | **The defect. This task.** |
| `setup-profile.sh` | 1323–1370 (`NGINXEOF`) | none | Fine, and instructive: every nginx runtime variable is correctly escaped (`\$host`, `\$remote_addr`, `\$proxy_add_x_forwarded_for`, `\$scheme`) while `${PROFILE_DOMAIN}` / `${PROFILE_PORT}` / `${ALLOW_DIRECTIVES}` expand on purpose. |
| `setup-profile.sh` | 1654–1670 (cron) | one, at 1660 — **escaped** (`` \`date\` ``) | Fine, correct as written. Report-only. |
| `setup-profile.sh` | 1675–1679, 1682–1689, 1701–1705 (cron append) | none | Fine. |
| `build-deploy-profile.sh` | none unquoted | — | Nothing to report. |
| `setup-telemetry.sh` | 261, 363, 398, 410, 416, 436, 494, 854 (`NGINXEOF`), 1098 | none in any body | Same latent shape, no live instance. Report-only — not the same defect, so not in scope to "fix". |
| `build-deploy-telemetry.sh` | 94 (`EOFCFG`), 350 | none | Report-only. |
| `setup.sh` | 78–113 | none | Report-only. |
| `update.sh` | none unquoted | — | Nothing to report. |

**Conclusion: exactly one live instance, and it is this one.** The author escaped correctly in the cron and nginx heredocs and missed only the compose block — which is itself the argument for a gate rather than for trusting care.

---

### 4. The already-deployed box

- **A redeploy is required for the fix to take effect.** The change is entirely in the deploy script; the compose file on the box is unchanged until `setup-profile.sh` next runs there. Until then, nothing about the box's behaviour changes — and nothing is broken today, so there is no urgency beyond riding the next run.
- **Does the fix change the generated compose file's content?** Yes — five comment lines. **No semantic value changes**, which is the acceptance criterion.
- **Will that restart containers?** Not because of this change. Docker Compose derives a service's config hash from the *parsed* configuration; YAML comments are discarded by the parser and cannot trigger a recreate. So `docker compose up -d postgres` would not recreate postgres on account of the comment edit.
- **But the next run recreates `profile-api` regardless of this task.** Line ~1088 is an unconditional `docker compose up -d --force-recreate --no-deps profile-api`. That is pre-existing behaviour of every `setup-profile.sh` run and is **not** caused by this fix — stated so nobody attributes the restart to `0282`.
- **This task needs no deploy of its own.** It rides `0217`'s already-mandatory profile redeploy at zero marginal cost, exactly as the brief argues.

---

### 5. Existing harness assertions this change touches

`tests/scripts/profile-deploy-hardening.test.sh` is an unconditional `npm test` gate (CLAUDE.md, consequence 1). Assertions that break, and why the update is genuine rather than a weakening:

| Harness line | What it does | Effect of the fix | Action |
|---|---|---|---|
| **395** | `COMPOSE_BLOCK=$(awk '/cat > "\$PROFILE_DIR\/docker-compose.yml" << EOF/{b=1; next} …')` | The start pattern contains the literal `<< EOF` and will **not** match `<< 'EOF'`. `COMPOSE_BLOCK` becomes empty → line 396 fails, and every derived assertion (399–422: service count, per-service `logging:`, `max-size`, `max-file`) fails or goes vacuous. | **Must update.** Change the anchor to `/cat > "\$PROFILE_DIR\/docker-compose.yml" << /` — drop the delimiter name from the *extraction* anchor so it matches either form, and let the new N1 assertion below carry the delimiter lock instead. This is strictly stronger, not weaker: the extraction stops silently going vacuous, and the delimiter is asserted explicitly. |
| **978** | The identical `awk` extraction, re-run for the 0221 section | Same breakage → `restart: unless-stopped` count, `on-failure` absence, and `init: true` all fail | **Must update**, identically. |
| 399–422 | Service count, `logging:` per service, `max-size`/`max-file` values | Block text for these lines is **byte-unchanged** by the fix | Pass again once the anchor is fixed. No edit. |
| 979–990 | `restart: unless-stopped` ×2, no `on-failure`, `init: true` under `profile-api` | Block text unchanged | Pass once the anchor is fixed. No edit. |
| 428–435 | Image-prune keep-list (`PROFILE_IMAGE` / `PREV_PROFILE_IMAGE`) | Reads a different region of the script | Unaffected. No edit. |
| 444 | Cron-header heredoc extraction | Different heredoc, left unquoted | Unaffected. No edit. |
| 922 / 945 / 949 | `profile.env` heredoc extraction and per-variable lines | That heredoc stays unquoted | Unaffected. No edit. |
| 1559–1563 | `- ./alerts:<container path>` bind mount vs `ALERT_PROBE_MARKER_PATH` | `sed` over the whole file, and that line is unchanged | Unaffected. No edit. |

**No assertion is loosened to make the build pass.** Exactly two lines change, both extraction anchors, and both become *less* able to go silently vacuous.

---

### 6. New assertions (brief item 6) — what they grep for, and why each is not brittle

Added to the 0219 structural section immediately after the `COMPOSE_BLOCK` extraction, so they share the scoped variable and sit with the other compose lints.

**N1 — the delimiter is quoted (the lock).**
```bash
grep -qF "cat > \"\$PROFILE_DIR/docker-compose.yml\" << 'EOF'" "$P" \
  && pass "compose heredoc: delimiter is quoted ('EOF') — the body cannot expand (0282)" \
  || fail "compose heredoc: delimiter is NOT quoted — a backtick or \$( ) in a COMMENT executes as root at deploy time (task 0282)"
```
*Not brittle:* a fixed-string (`-F`) match on one line the script must contain. The only innocent way to break it is to reflow or rename that exact line — a deliberate act on the very line being protected — and it fails loud-red with the reason and the task id. It can produce a false red, never a false green, which is the residual the section already declares at harness line 389.

**N2 — no backtick anywhere in the block.**
```bash
printf '%s\n' "$COMPOSE_BLOCK" | grep -q '`' \
  && fail "compose heredoc: a backtick appears in the block — use single quotes in comments (0282)" \
  || pass "compose heredoc: no backticks (0282)"
```
*Not brittle:* after the fix there are zero backticks, and a backtick has no legitimate meaning in this YAML or in its comments. It catches escaped backticks too — deliberately, because a rule that has to tell `` ` `` from `` \` `` is the brittle one. **This is the assertion that would have caught the original defect.**

**N3 — no `$( … )` command substitution in the block.**
```bash
printf '%s\n' "$COMPOSE_BLOCK" | grep -qF '$(' \
  && fail "compose heredoc: a \$( ) command substitution appears in the block (0282)" \
  || pass "compose heredoc: no \$( ) command substitution (0282)"
```
*Not brittle:* zero occurrences today; `$(` has no YAML meaning here. Covers the other half of the hazard, which N2 alone does not.

**N4 — every placeholder left in the template is actually substituted.**
```bash
for v in $(printf '%s\n' "$COMPOSE_BLOCK" \
            | grep -oE '\$\{[A-Za-z_][A-Za-z0-9_]*\}' | tr -d '${}' | sort -u); do
  grep -qF "compose_rendered//'\${$v}'" "$P" \
    && pass "compose heredoc: \${$v} has an explicit substitution line (0282)" \
    || fail "compose heredoc: \${$v} is in the template but never substituted — it would reach the box unexpanded (0282)"
done
```
*Why it matters:* N1–N3 stop the hazard returning; N4 stops the *fix's own* failure mode — someone adds a new `${SOMETHING}` to the template and forgets the substitution line, and the box gets a compose file where Docker interpolates it from the environment or to empty. That is the one silent regression this change introduces, so it gets its own gate.
*Not brittle, with a stated residual:* it is coupled to the spelling of the substitution lines, matched as a fixed string on the distinctive `compose_rendered//'${NAME}'` fragment. Changing the substitution mechanism forces an update here — a false red, never a false green. Same accepted residual class as the rest of the section.

---

### 7. Verification — exact commands

**a) Render the compose file locally, HEAD vs fixed, and diff it. This is the acceptance criterion.**

A renderer in the scratchpad extracts the region from the opener through `chmod 600` and executes just that region with the four variables set and `PROFILE_DIR` pointed at a temp dir:

```bash
SP=/Users/mark.dolbyrev/Workspace/geoconflict/setup-profile.sh
awk '/^cat > "\$PROFILE_DIR\/docker-compose\.yml" <</{b=1}
     b{print}
     b && /^chmod 600 "\$PROFILE_DIR\/docker-compose\.yml"$/{exit}' "$SP" > "$W/block.sh"

mkdir -p "$W/out"
( PROFILE_DIR="$W/out" \
  POSTGRES_USER=profile POSTGRES_DB=profile PROFILE_PORT=8080 \
  PROFILE_IMAGE="example/profile@sha256:$(printf '0%.0s' $(seq 64))" \
  PATH="$W/stubbin:$PATH" \
  bash "$W/block.sh" < /dev/null )
```

🚨 **Safety note that is part of the plan, not an aside.** Running the **HEAD** version of that block *executes the four backticks on the developer machine*. `docker compose stop` and `docker stop` are noisy-but-harmless in an empty cwd — but **`node` exists on this Mac**, and `` `node` `` with an inherited stdin would open a REPL and swallow the script's input. So the HEAD render **must** run with (i) `$W/stubbin` prepended to `PATH`, containing no-op stubs for `docker`, `node` and `always` that print nothing and exit 0 (the same stub idiom `make_stubs()` already uses in the harness), and (ii) `< /dev/null`. The fixed render needs neither, which is itself a demonstration of the fix.

Then, from the repo:

```bash
git stash push -- setup-profile.sh     # render HEAD
# …render as above → head-compose.yml
git stash pop                          # render fixed
# …render as above → fixed-compose.yml
diff -u head-compose.yml fixed-compose.yml
```

**Expected diff: exactly five comment lines** (991, 992, 1025, 1026, 1045 in source terms), each regaining its word in single quotes. **Zero** lines under `services:`, `image:`, `environment:`, `healthcheck:`, `ports:`, `volumes:`, `logging:`, `restart:`. Any other difference = regression = stop. The diff goes into the worklog verbatim.

**b) No log lines from the four executed commands.** The fixed render's stdout/stderr must be empty — no `command not found`, no `no configuration file provided`, no `docker: 'docker stop' requires at least 1 argument`. (Run this one **without** the stubs: with them, silence would prove nothing.)

**c) Compose validates.**
```bash
: > "$W/out/profile.env"                 # env_file must exist for `config` to parse
docker compose -f "$W/out/docker-compose.yml" config >/dev/null && echo VALID
```
Does not need the Docker daemon, only the CLI. Per project memory, Docker Desktop cannot be started headlessly — **if the CLI is unavailable, record this check as NOT RUN and say so; do not report it as passed**, and fall back to a YAML-parser syntax check (`python3 -c 'import yaml,sys; yaml.safe_load(open(sys.argv[1]))'`) while stating that it is weaker.

**d) Backtick probe (brief verification step 4).** Temporarily add `` # probe `whoami` `` inside the block, render, confirm the generated file contains `` `whoami` `` **verbatim** and that nothing executed. **Remove the probe, and re-run (a) to confirm the diff is back to five lines** so the probe cannot ship.

**e) The new assertions are seen failing before they are trusted.**
```bash
git stash push -- setup-profile.sh          # harness change kept, script back to HEAD
bash tests/scripts/profile-deploy-hardening.test.sh | grep -E 'N1|0282'   # expect ❌ on N1 and N2
git stash pop
bash tests/scripts/profile-deploy-hardening.test.sh                        # expect ALL PASS
```
Then brief step 6: unquote the delimiter only, run, see N1 red, re-quote, run, green.

**f) Full gate.**
```bash
bash tests/scripts/profile-deploy-hardening.test.sh    # must print ALL PASS
npm test                                                # must be green (~22–25 s; Docker-probed harness may report ○ skipped — that is expected, not a pass)
npm run lint
```

**g) Box verification is the owner's, and is not this task's gate.** After the owner's next `setup-profile.sh` run (riding `0217`), the deploy output carries none of the four lines and the deployed file's comments are intact. Owner-executed; recorded, not claimed.

---

### 8. Step sequence

1. Verify the `"${x//'${NAME}'/$VALUE}"` quoting form in a scratch bash shell. If it misbehaves, switch to the `ph=` fallback before touching the script.
2. Build the local renderer + stubs in the scratchpad; capture the **HEAD** render first, while the script is still unmodified.
3. Edit `setup-profile.sh`: quote the delimiter, add the deliberate-quoting comment, de-backtick the five comment sites, add the four substitution lines + the leftover-`${` guard before `chmod 600`.
4. Capture the fixed render; diff against HEAD's; stop if anything outside the five comment lines moved.
5. `docker compose config` (or record NOT RUN with the reason).
6. Edit the harness: two extraction anchors; add N1–N4.
7. Prove N1/N2 red against HEAD's script, then green against the fix.
8. Backtick probe, then remove it and re-diff.
9. `bash tests/scripts/profile-deploy-hardening.test.sh` → `ALL PASS`; `npm test`; `npm run lint`.
10. Worklog: the full before/after diff, the other-heredocs survey table from §3, the substitution enumeration, and anything recorded as NOT RUN.

**Not in scope:** committing or pushing (owner-only), moving the task file (producer-only, ADR-033), any wiki write, any change to the other scripts' heredocs beyond the report in §3, and any box command.

**Merge note:** `0280` item 3 edits `setup-profile.sh` near line 1198 (the `PROFILE_DOMAIN` guard) and also touches this harness. Different regions of both files; expect a rebase, not a conflict, for whoever goes second.

**Effort:** the script edit is ~15 lines. The verification in §7 is the bulk of the work and is not optional.

**Secrets:** no value written into `setup-profile.sh` by this change; the plan, worklog and review name no host, IP, domain, token or connection string. The renderer uses `example/profile@sha256:<64 zeros>` and `127.0.0.1` only.

---

## ⛔ AMENDMENT — appended by the `fkit-sprint-ship-loop` driver, 2026-09-18, AFTER the plan was approved and built

**Everything above this line is the plan as the owner approved it. Nothing above has been edited.** This
section is appended, not merged, so the approved bytes stay readable as approved. It exists because the
plan above contains a **factually false safety claim**, found in review, and a plan is what a future task
copies a pattern from.

**Authority:** owner ruling given live in the lead session via `AskUserQuestion` on 2026-09-18, finding
`R1`, selection *"Correct all three"* — plan, shipped code comment, and worklog.

### What is wrong, and where

§2's code comment and its "Why this shape" bullet both claim:

> *"pattern and replacement are both literal, so a value containing `|` `&` `/` or a newline cannot inject
> anything into the result"*

**That claim is false on the bash the profile box runs.** bash ≥ 5.2 enables the `patsub_replacement`
shell option **by default**, under which an unquoted `&` in the replacement of `${var//pat/rep}` expands
to **the text that was matched**. Measured by two independent reviewers and again by the process-review
worker:

| bash | `V='${V}'; x='x aPLACEHOLDERb y'` → substitute `&` | result |
|---|---|---|
| 3.2.57 (this Mac, `/bin/bash`) | — | `x a&b y` — literal, as the plan claims |
| 5.2.15 (`debian:12`) | `shopt -p patsub_replacement` confirms **on** | `x a${V}b y` — **the `&` expanded** |
| 5.3.9 | same | `x a${V}b y` |

### The second, worse error — the one a future reader must not repeat

§2 mandates a **build-time check** of the quoting form and §8 step 1 schedules it. The worklog then called
bash 3.2 *"the stricter case"*.

**For this construct, bash 3.2 is the LENIENT case.** So the check the plan required ran on the only
platform that could not fail. **A check that cannot fail is not a check.** If you copy this substitution
pattern, verify it on **bash 5.2 or newer**, which is what the box runs — not on macOS's bash 3.2.

The *"a newline cannot inject"* clause is a separate, category error: the **substitution** is literal, but
the **result** is YAML, and a newline in a value inserts new YAML lines. That is finding `R4`, which is
**pre-existing** — it behaves identically through the old unquoted heredoc — and which the owner ruled
gets its own task.

### What is actually true, and why the shipped code is nonetheless safe

**There is no portable inline fix.** Quoting the replacement inserts literal `"` characters on bash 3.2
(measured). So the substitution **form** in §2 stands unchanged; only the **claim** about why it is safe
changes. The accurate statement, now carried in `setup-profile.sh` and `worklog.md`:

> The compose substitution is safe **because the four values are validated or defaulted before use, and
> because the post-condition guard fails closed** — **not** because `${var//pat/rep}` is injection-proof.
> On bash ≥ 5.2 an unquoted `&` in the replacement expands to the matched text.

**Revisit this if a value that could contain `&` is ever substituted here.** Today none can.

### The rest of the review's dispositions, for a reader of this plan

- **`R2` (owner: close it now).** The plan's guard `grep -q '\${'` and assertion `N4` saw only the
  **braced** form, so a future bare `$PROFILE_PORT` would have reached the box unsubstituted, past both.
  Closed: the runtime guard was widened and a new harness assertion **`N5`** bans the unbraced form.
  **Implementation note — a deliberate departure from the wording of the disposition:** the ruling said
  *"widen N4"*, but `N4` asserts *"this placeholder has a substitution line"*, which can never be true of
  an unbraced name — only `${NAME}` is ever substituted. Widening `N4` would have made it assert
  something false. `N5` **bans** the unbraced form instead, matching `N2`/`N3`'s existing style. Same gap
  closed; `N4` untouched.
- **`R3` (owner: accept as residual).** The four substitutions run sequentially over one accumulating
  string, so an earlier value's bytes are re-scanned by later passes. The post-condition proves *"no
  `${` survived"*, **not** *"values were inserted literally"*. No code change. **Revisit if a fifth
  substituted value is added.**
- **`R5` (owner: accept as residual).** The compose file sits at umask mode (observed `-rw-r--r--`)
  between being written and being `chmod 600`'d. **Pre-existing** — the old code did the same
  `cat >` then `chmod` — and present on **every** run, not only on a guard trip. The file holds no
  credential; those live in the separate 0600 `profile.env`. No code change.
- **`R6`.** §7(f)'s `~22–25 s` estimate and the worklog's `60.2 s` do not reproduce. Three measurements
  this task: **60.2 s**, **87.5 s**, **58.0 s** — all with identical `137 suites / 1853 tests` green.
  Host-load artifact. **Treat none of them as a baseline.**

### Codex coverage

The review ran its Codex second opinion successfully (`codex exec --sandbox read-only`, exit 0). **No
degradation.** `R1` and `R2` were raised **independently by both reviewers**; `R3` and `R4` originated
with Codex and were verified against the code by the Claude-side reviewer.
