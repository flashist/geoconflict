# Plan — `0284` alert-path liveness probe

> **Provenance.** Produced by a plan-only `fkit-coder` spawn on 2026-09-18, driven by
> `fkit-sprint-ship-loop` from the lead session. **Approved by the owner via `AskUserQuestion`,
> 2026-09-18.** Written to this file by the driver, copied verbatim from the approved text — not
> re-rendered, not summarised. The owner's answers to the open questions are recorded in the
> **addendum at the foot of this file**; the plan body above it is the text as approved.

## Grounding (what I verified, not assumed)

| Fact | Where I checked it |
|---|---|
| Relay route + 401/403/404 contract as shipped | `src/profile-server/AlertRelay.ts` (whole file) |
| Route mounted with limiter, **not** `internalAuth` | `src/profile-server/Routes.ts:795-805` |
| Secret wiring, blank ⇒ relay delivers nothing | `src/profile-server/Server.ts:152-192` |
| `tokensMatch` fails closed on an empty expected secret | `src/profile-server/InternalAuth.ts:22-38` |
| The marker reader (`json_field`) needs **one key per line, key at line start** | `profile-checks.sh:96-98` |
| `iso_to_epoch` tolerates fractional seconds and requires a trailing `Z` | `profile-checks.sh:90-94` |
| 🚩 **`profile-api` has NO bind mount today** — a container-written file is invisible to `profile-checks.sh` | `setup-profile.sh:1016-1046` |
| The container runs as **root** (no `USER`) ⇒ no ownership problem writing to a root-owned host dir | `Dockerfile.profile` |
| `/internal/` location has no method or body restriction; `deny all` after the allow list | `setup-profile.sh:1336-1344` |
| 🚨 **The probe must be `POST`** — `HEAD`/`GET` on that path are 404, `OPTIONS` is 200 | `ai-agents/tasks/done/0277-…/worklog.md:375-382` |
| A **third party's** refused request cannot disable the channel — the disable happens inside the sender when *its own* attempt is refused | same worklog section |
| Telemetry box has a cron file and an env-forward channel to hang the probe on | `setup-telemetry.sh:917-955`, `build-deploy-telemetry.sh:333-368` |
| Config-parity covers `game`/`profile`/`client` only, and enforces a **two-hop** rule for profile env vars | `scripts/check-config-parity.mjs:1-70` |
| Wiki vault has **no** `0277`/`0284`/alert-relay page | vault grep finds nothing |

Wiki note: ground truth for this task is `ai-agents/knowledge-base/alert-delivery-runbook.md` + `0277`'s
artifacts. The vault is behind — an ingest gap for `fkit-wiki`, not something this task touches.

---

## The design, as carried (not re-designed)

```
telemetry box host cron (hourly)
   └─ POST {"payload":{"secret":…,"probe":"liveness"}}
        → same public HTTPS host, same nginx `~* ^/internal/` allowlist,
          same route, same shared secret a real alert uses
             → relay: parse → secret check → PROBE branch
                  → write marker (host-visible), respond 2xx, SEND NOTHING
                       → profile-checks.sh (daily 08:00 UTC) reads marker age
                            → stale/missing ⇒ FAIL ⇒ POST $PING_URL/fail
                                 → EXTERNAL dead-man's switch pages the owner
                                      (path touches neither Uptrace nor Telegram)
```

---

## Work items, in order

### Step 1 — the relay writes a probe marker (`src/profile-server/AlertRelay.ts`)

**New exports / constants**

- `ALERT_PROBE_MARKER_PATH = "/var/lib/profile/alerts/last-alert-probe.json"` — the **in-container** path.
- `ALERT_PROBE_KEY = "liveness"` — the non-secret discriminator, matched on `payload.probe`, trimmed + lowercased.
- `AlertRelayConfig` gains `markerPath?: string` (defaults to the constant) and `writeMarkerFile?` (fs seam) —
  **test seams only, no new environment variable.** Deliberate: a new `process.env` read in
  `src/profile-server/**` would drag in the config-parity two-hop chain (`setup-profile.sh` profile.env ∪
  `build-deploy-profile.sh` export) for a value that never varies.

**Schema** — `payload` gains `probe: z.string().optional()`. The object is non-strict, so nothing else changes.

**`decide()` — the probe branch, placed AFTER the secret check and BEFORE dedupe/render:**

1. Secret check first, unchanged. A probe with a wrong/missing secret is `rejected` exactly like an alert.
   **This is load-bearing: it means the marker only advances when the secret matches.**
2. 🚨 **Fail toward delivery:** treat the call as a probe **only if** `payload.probe === "liveness"` **and**
   the body carries no `alert` object **and** no top-level `id`. If `probe` arrives alongside real alert
   fields, deliver it as an alert and `log.warn` that a `probe` key is present in the channel payload.
   Reason: if someone ever pastes `probe` into the Uptrace channel payload, the naive rule would silently
   swallow **every real alert** behind a 2xx — a worse failure than the one this task fixes.
3. New decision kind `{ kind: "probe" }`.

**Handler** — on `probe`: write the marker, `metrics.alertRelay("probe", "unkeyed")`, respond
`200 {status:"accepted"}`. No Telegram send, no dedupe entry, no alarm. (200 rather than 202 because
nothing was queued; only curl reads it.)

**The marker write itself** (~15 lines, not the architect's ~10 — the extra is atomicity):

```json
{
  "schema": 1,
  "finished_at": "2026-09-18T09:17:03Z",
  "source": "alert-webhook-probe"
}
```

- `JSON.stringify(obj, null, 2)` → one key per line, which is **exactly what `json_field`'s sed requires**.
  `finished_at` is `toISOString()` sliced to seconds + `Z`.
- **Atomic:** write `…json.tmp` in the same directory, then `renameSync`. A torn write would give an
  unparseable `finished_at` → FAIL (safe direction, but a false page).
- ⛔ Never the caller's address, the secret, or any of the body.
- Wrapped in try/catch: a write failure is `log.error` + still 2xx. The marker going stale is the signal;
  a 5xx to curl would be read by nobody.

**`src/profile-server/Telemetry.ts`** — add `"probe"` to `AlertRelayResult`; update the comment at `:111`
(`6 × 2 = 12 series` → `7 × 2 = 14`). No test asserts the count, only that comment.

### Step 2 — make the marker host-visible (`setup-profile.sh`)

- `mkdir -p "$PROFILE_DIR/alerts"` + `chmod 700`, near the other stack-dir setup.
- `profile-api` service gains:
  ```yaml
      volumes:
        - ./alerts:/var/lib/profile/alerts
  ```
- ⛔ **Not** a mount of `$PROFILE_DIR/backups` — that would expose the backup dumps to the app container.
- Harness safety: the hardening harness counts services with `^  [a-z][a-z0-9-]*:$` up to the top-level
  `^volumes:` and counts `^    logging:$` blocks (`tests/scripts/profile-deploy-hardening.test.sh:395-419`).
  A 4-space `    volumes:` key under `profile-api` breaks neither count. Re-run the harness rather than
  trust that reading.
- Deploy print: one line saying the alert-probe marker dir is mounted. No hosts, no addresses.

### Step 3 — the marker-age check (`profile-checks.sh`, check 11)

```
MAX_ALERT_PROBE_AGE_HOURS="${PROFILE_CHECKS_MAX_ALERT_PROBE_AGE_HOURS:-3}"
PROBE_MARKER="${PROFILE_CHECKS_ALERT_PROBE_MARKER_FILE:-$PROFILE_DIR/alerts/last-alert-probe.json}"
```

- Registered in `int_or_default` (junk override ⇒ FAIL + default, never a silent OK — the existing `R1` contract).
- `check_alert_probe()`, same shape as `check_daily_marker`: missing ⇒ FAIL; `finished_at` unparseable ⇒ FAIL;
  age > threshold ⇒ FAIL; else OK naming the age.
- The FAIL text is the operator instruction and must reach the `/fail` ping body:
  > `alert-path-probe: no probe received for 27h (> 3h) — the monitoring box cannot reach the alert webhook.
  > Check PROFILE_INTERNAL_ALLOW_IPS and the probe cron. ⚠️ If a real alert hit the same failure the
  > notification channel is now DISABLED and must be re-enabled by hand.`
- ⛔ Variable names only — no host, no address, no token.
- Appended to the call list at the bottom, and the file-header comment block updated.

### Step 4 — the probe on the telemetry box (`setup-telemetry.sh`, `build-deploy-telemetry.sh`, `example.env.telemetry`)

Two new deploy variables, **no new secret** (it is the same shared secret; the box already holds it inside
Uptrace's own channel config):

| Variable | Purpose |
|---|---|
| `TELEMETRY_ALERT_PROBE_URL` | the **full lowercase webhook URL** — the same string already pasted into the channel config, so it is copied, not reconstructed |
| `PROFILE_ALERT_WEBHOOK_TOKEN` | the shared secret, same name as the profile side |

- `build-deploy-telemetry.sh`: two `export` lines in the `LOCAL_TMPENV` heredoc (`:333-357`). The secret
  already travels this exact way (SCP'd 0600 temp file, never in argv).
- `setup-telemetry.sh`:
  1. **Persist-or-reuse** both values in 0600 files under `$UPTRACE_DIR` (mirrors `setup-profile.sh:691`'s
     `persist_or_reuse_secret`). 🚨 **Never generate the token** — a box-minted token fails every probe and
     pages daily. This is `0182`/`0195`'s defect in a new place.
  2. Write `$UPTRACE_DIR/alert-probe.env` (0600) and `$UPTRACE_DIR/alert-probe.sh` (0700). Both written
     inline by the setup script — no new repo file, no change to the deploy's SCP list.
  3. One cron line appended to the existing `/etc/cron.d/uptrace-backups` heredoc, **after** the certbot
     line (the harness asserts the certbot line's relative position at `:1206`).
  4. Final print: "alert probe configured" / "NOT configured". ⛔ Never the URL — it is a host.

Probe script shape (the mechanics that matter):

```bash
set -uo pipefail                      # no `set -x`, ever — it would echo the secret
. "$DIR/alert-probe.env"
[ -n "${ALERT_PROBE_URL:-}" ] && [ -n "${ALERT_PROBE_SECRET:-}" ] || { … exit 1; }
curl -fsS -m 10 --retry 2 -o /dev/null -X POST \
     -H 'Content-Type: application/json' --data-binary @- "$ALERT_PROBE_URL" <<JSON
{"payload":{"secret":"${ALERT_PROBE_SECRET}","probe":"liveness"}}
JSON
```

- **Body on stdin, never in argv** — `--data '{"secret":…}'` would put the secret in `ps`.
- ⚠️ The token must contain no `"` or `\` (it is JSON-embedded). It is owner-supplied hex today; the
  runbook line will say so.
- Log: **one line, truncating** (`>`), carrying the last outcome. `>>` on a box with a disk-full history is
  how you get a third incident; nothing reads the history anyway — the marker is the signal.

Cadence: `17 * * * *` (hourly, off the top of the hour so it does not pile onto the other crons).

### Step 5 — harness assertions (`tests/scripts/profile-deploy-hardening.test.sh`)

This harness is the **only** gate over the telemetry scripts (config-parity does not reach them). Seven additions:

1. `setup-telemetry.sh` writes `alert-probe.env` 0600 and `alert-probe.sh` 0700.
2. The probe block uses `--data-binary @-` and never puts the secret token variable on a curl argv.
3. No `set -x` in the probe script block.
4. A cron line invoking the probe script exists in the cron heredoc.
5. `build-deploy-telemetry.sh` exports **both** new variables (the hop-2 parity nothing else can see for telemetry).
6. The probe token is persist-or-reuse and **never** in generate mode.
7. **Drift guard:** the compose bind mount's container path in `setup-profile.sh` equals
   `ALERT_PROBE_MARKER_PATH` in `src/profile-server/AlertRelay.ts`. Two files must agree on one string;
   nothing else would catch them diverging.

⚠️ Per `CLAUDE.md`, these make `npm test` red for anyone editing those scripts. That is the gate working.

### Step 6 — tests

**`tests/profile-server/AlertRoutes.test.ts`** (existing `build()` harness gains `markerPath` pointing at an
`mkdtemp` dir):

- probe body ⇒ 2xx, **zero Telegram sends** (`h.alerts` and `h.alarms` both empty), marker file exists.
- marker content: exact keys, and `finished_at` matches a regex **equivalent to `json_field`'s sed**
  (`^\s*"finished_at":\s*"…"`). This is the guard against the relay writing a shape the shell reader cannot
  parse — the two halves live in different languages and nothing else couples them.
- probe with a **wrong/missing secret** ⇒ 2xx, **no marker written** (the write must sit behind the secret check).
- 🚨 probe key **plus** real alert fields ⇒ delivered as an alert, marker **not** written.
- probe does not create a dedupe entry (a following real alert with the same `id` still delivers).
- regression: the existing "never 401/403/404" table still passes untouched.

**`tests/profile-checks.sh`** — new case `C22` (fresh ⇒ OK, stale ⇒ FAIL naming the age, missing ⇒ FAIL,
junk threshold ⇒ FAIL + default, env override honoured), plus:

- `reset_fixture()` writes a **fresh probe marker**, otherwise every existing case fails.
- 🚩 **Five existing count assertions must be re-baselined** (`10 ok` → `11 ok`, `9 ok, 1 failed` →
  `10 ok, 1 failed`, `9 ok, 2 failed` → `10 ok, 2 failed`): lines `185`, `242`, `280`, `303`, `317`. This is
  mechanical but easy to miss and would read as an unrelated regression.
- No new harness file ⇒ **no change to `tests/scripts/ShellHarnesses.test.ts`**. Its success marker regex is
  count-agnostic (`:243`).

### Step 7 — the docs half of the owner's acceptance

**Extend** the existing section in `ai-agents/knowledge-base/alert-delivery-runbook.md` (the "*A real guard is
a follow-up task*" paragraph and the "What does NOT catch this" list). ⛔ No second runbook file — the brief is
explicit. Content: the guard exists; what it covers and what it does not; the IP-change rule already there;
**and the re-enable step** (fixing the address alone does not undo the disable); plus the two surprise modes
(a rolled-back image, and a token containing a quote).

### Step 8 — verification

```
npx tsc --noEmit
npm run lint
npm test                     # includes the 3 unconditional shell harnesses (~22–25 s)
npm test -- tests/profile-server/AlertRoutes.test.ts
bash tests/profile-checks.sh
bash tests/scripts/profile-deploy-hardening.test.sh
npm run check:config-parity  # expect clean; no new app env var is added
```
⚠️ If a `supertest` suite goes red, check the known-flake signature and the `0197` `SIGSEGV` signature
**before** diagnosing — never one root cause for both.

---

## The six things the driver asked me to be explicit about

**1. What writes the marker, and exactly when.**
The relay, inside `decide()`/handler, **on receipt** — after the secret check, **before any send**, and for a
probe there is no send at all. ⇒ **This proves the monitoring box can REACH the relay. It says nothing about
Telegram delivery, and nothing about whether a message reached a human.** That boundary is the whole reason
`0283`'s daily beat is a complement and not a duplicate.

**2. What reads it, how often, what it does when stale.**
`profile-checks.sh`, in its existing daily 08:00 UTC cron run. Stale or missing ⇒ `fail()` ⇒ the summary posts
to `$PROFILE_CHECKS_PING_URL/fail` on the **external dead-man's switch**, which also alerts on a *missing* ping
— so the checker's own death pages too. **That path touches neither Uptrace nor Telegram**, which is the second
reason this works where the rejected alternatives do not.

**3. Where the probe runs from, and why that origin is the one that matters.**
The telemetry box's **host cron**, over the public HTTPS name, so it crosses the same allowlist, the same
`~* ^/internal/` location, the same route and the same shared secret. A probe from anywhere else is worthless —
that is precisely why `profile-checks.sh` cannot assert the allowlist (it would compare the deployed value
against the value the same deploy just wrote).

⚠️ **One assumption, stated rather than buried:** Uptrace runs in Docker and its egress is SNAT'd to the host's
primary address; a host-run curl uses the same one. On a box with a single public address and default Docker
networking these are the same, which is this box's configuration — but I have not proved it, and a second
public address or a policy route would make the probe blind. 🚩 **The drill verifies it**: removing the address
from the allowlist must fail the probe **and** disable the channel. If the probe fails and the channel
survives, the two egresses differ and this guard is not guarding.

**4. Detection latency, and what bounds it.**
Bounded by the **daily** read, not by the probe interval: hourly probe + 3 h threshold + one daily run ⇒
roughly **3 h best case, ~27 h worst case**, plus the dead-man's switch's own grace. Making the probe more
frequent does **not** shorten this. Accepting it is defensible because the disable is permanent either way: a
faster page shortens how long you were blind, it does not change the repair.

**5. What the owner must do.**

*Deploy, in one window — order matters:*
1. `./build-deploy-profile.sh` — relay marker-write + bind mount + the new check land together. **The check
   will FAIL until the first probe arrives**, so do not stop here.
2. `./build-deploy-telemetry.sh` with both new variables set in the gitignored telemetry env files.
3. Run the probe once by hand on the telemetry box (`/opt/uptrace/alert-probe.sh`; exit 0 = accepted), then
   confirm the marker exists on the profile box and `/opt/profile/checks.sh` reports `alert-path-probe … OK`.
   Finishing this before the next 08:00 UTC is what avoids a false page.

*The drill — this step is the task:*
4. Remove the telemetry box's egress address from `PROFILE_INTERNAL_ALLOW_IPS`, redeploy the profile box,
   confirm the probe now fails and the marker stops advancing.
5. Force `profile-checks.sh` to run and confirm the **dead-man's switch pages** with the `alert-path-probe` reason.
6. Fire a real alert (the runbook's `session_rejected` drill, §7.6) so Uptrace's own attempt is refused ⇒
   confirm the channel is now **DISABLED**. This is the defect working as documented, and it is also what
   proves probe and alert share one egress address.
7. Restore the address, redeploy, confirm the probe recovers and the check is OK again.
8. 🚨 **Re-enable the notification channel in the Uptrace UI, and confirm alerting is live** (the runbook's
   drill proves both the firing and the ✅ recovery halves). ⛔ **Fixing the address does not undo the disable.**
   Anyone who runs steps 4–6 and walks away has turned alerting off.
9. Regression: confirm a real alert still reaches Telegram, and that the probe never produces a Telegram message.

⚠️ Step 6 deliberately disables live alerting until step 8.

**6. What this does NOT cover — plainly.**

- 🚨 **It cannot detect an already-disabled channel.** If a transient 403 disabled the channel yesterday and the
  address is fine today, the probe is green and alerting is still dead. **The guard catches the CAUSE within
  ~24 h, not the STATE.**
- 🚨 **It does not check the secret Uptrace's channel config holds.** The probe proves the secret *the cron*
  holds matches the relay. Those are two separate copies; the channel's copy could be wrong and every alert
  dropped while the probe stays green.
- **It proves nothing about Telegram delivery** (marker on receipt, before any send) and nothing about a message
  reaching a human. `0283`'s beat is the other half; neither covers the other.
- **It does not prove any monitor is attached to the channel.** A monitor that never ticked the channel delivers
  nothing, and no probe can see that.
- **It does not discharge `0274` amendment A1** (delivery after an idle period). Different hop. ⚠️ And the
  reverse deserves flagging: an hourly probe keeps NAT/conntrack state on the telemetry→profile hop warm, so it
  could **mask** an idle-path defect on that specific hop that a rare real alert would hit.
- **`npm run check:config-parity` does not reach telemetry variables** — the hardening harness is the only guard
  there, the same residual `0277` records.
- **One host, no CI.** Every "verified" above is one box.

---

## Edge cases and non-obvious failure modes designed against

| # | Mode | Handling |
|---|---|---|
| 1 | `probe` pasted into the Uptrace channel payload ⇒ every real alert silently swallowed behind a 2xx | probe branch requires no `alert` and no top-level `id`; otherwise deliver + warn |
| 2 | Marker written before the secret check ⇒ guard green while alerts are dropped | write strictly after `tokensMatch` |
| 3 | Torn marker write ⇒ unparseable `finished_at` | temp file + `renameSync` |
| 4 | Container-written marker invisible to the host checker | bind mount, not a named volume or `docker exec` |
| 5 | **A rolled-back profile image** (predating this change) never writes the marker ⇒ a daily page that *looks* like an allowlist fault | named in the runbook line |
| 6 | Blank token on a telemetry redeploy wipes the probe ⇒ false daily page | persist-or-reuse, never generate (`0195`'s defect) |
| 7 | Secret containing `"` or `\` breaks the JSON body | runbook constraint: hex/alphanumeric only |
| 8 | Secret in `ps` via curl argv | body on stdin |
| 9 | Unbounded probe log on a box with a disk-full history | single-line truncating log |
| 10 | Adding an 11th check silently breaks 5 count assertions | re-baselined explicitly, listed by line |
| 11 | Relay constant and compose mount path drift | harness assertion 7 |
| 12 | Probe `403`s during an outage — does that itself disable anything? | **No.** The disable happens inside the sender when *its own* attempt is refused (`0277` worklog, a Codex finding that was disproven). Probing frequently is safe. |
| 13 | Local dev run tries to write `/var/lib/profile/alerts` | caught, logged, no crash; probes are not sent locally |
| 14 | 🚩 **New noise mode:** with an hourly probe, a secret mismatch makes the relay's out-of-band Telegram alarm fire **once an hour indefinitely** (it was bounded to Uptrace's ~26 h retry budget) | accepted — see addendum |

---

## Estimate, honestly

Larger than the brief's "~10 lines in the relay, ~15 in `checks.sh`, one test case, one cron line":

| Area | Real size |
|---|---|
| `AlertRelay.ts` + `Telemetry.ts` | ~45 lines (atomicity + the fail-toward-delivery guard) |
| `setup-profile.sh` | ~8 lines |
| `profile-checks.sh` | ~20 lines |
| `setup-telemetry.sh` + `build-deploy-telemetry.sh` + `example.env.telemetry` | ~70 lines (persist-or-reuse is most of it) |
| `tests/profile-server/AlertRoutes.test.ts` | ~80 lines |
| `tests/profile-checks.sh` | ~25 lines + 5 re-baselined assertions |
| hardening harness | ~7 assertions |
| runbook | ~15 lines |

Still small; the drill is still the expensive part. The overrun is concentrated in the telemetry-side
persist-or-reuse and the marker-shape coupling test — both guard failure modes that would otherwise show up as
a silently dead guard.

---

# ⬇️ ADDENDUM — OWNER DECISIONS AT APPROVAL, 2026-09-18

**Appended by the driver at the moment of approval. The plan body above is the approved text and is not
edited.** All four answers were given live in the lead session via `AskUserQuestion`; each question was put
with its alternatives and the recommendation marked. ⛔ **Not precedent for anything.**

**D1 — Plan APPROVED, with the planner's recommendations on the minor open questions.**
Concretely, this settles the planner's open questions 3 and 5:
- **Q5 — marker path:** a **compiled-in constant plus a test seam**. No new application environment variable,
  so the config-parity two-hop chain is not dragged in for a value that never varies.
- **Q3 — the new noise mode (edge case 14):** **accepted.** During a secret mismatch the relay's out-of-band
  Telegram alarm will nag hourly instead of stopping after Uptrace's ~26 h retry budget. Proportionate — if it
  is firing, alerting is dead. ⛔ **Do NOT suppress it by reading `probe` before the secret check** — that
  would let an unauthenticated caller silence the alarm.

**D2 — Detection latency: ACCEPT ~3–27 hours** (planner's Q1/Q2). The channel disable is permanent either
way, so faster detection shortens how long you were blind; it does not change the repair. **No second cron and
no second dead-man's-switch URL.** Cadence stays hourly with a 3 h staleness threshold, read by the existing
daily 08:00 UTC run.

**D3 — Drill timing: run it RIGHT AFTER THE DEPLOY, at the console** (planner's Q6). Deploy and drill in one
sitting so that **re-enabling the notification channel is not a separate trip.** 🚨 Owner steps 4–8 above leave
live alerting **disabled** until step 8 completes — that window is minutes, and deliberately supervised.

**D4 — The "channel already disabled" hole: SEPARATE FOLLOW-UP, not folded into this task** (planner's Q4).
Reading Uptrace's own channel state would close the case where the probe is green but alerting is already
dead. It is **not** in this task's scope: the 2.0.2 table and column names are **unverified**, and folding it
in unasked would substitute a new design for the architect's. ⇒ **A follow-up task is to be filed for it**, and
until it lands **the hole stands: this guard catches the CAUSE, not the STATE.**

**Not asked, not ruled — carried forward as the planner recorded it:** `example.env.profile:44` already ships
a literal IP address in git (pre-existing, the game server's). Out of scope here; flagged only so nobody reads
it as licence to add a second.
