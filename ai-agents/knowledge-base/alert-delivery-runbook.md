# Alert delivery runbook — monitoring → operator Telegram topic

Task `0277`. Covers the alert relay on the profile/admin box, the forum-topic routing it shares with
the name-change notifications, and the traps that make alerting fail **silently**.

⛔ **No hostnames, IP addresses, chat ids, topic ids or secrets appear in this file, deliberately.**
Every one of them lives in the gitignored deploy env files, or on the box.

---

## What it is

The monitoring stack cannot post into a Telegram **forum topic** by itself, so alerts go through a
small relay on the profile box:

```
monitoring alert → webhook channel → POST /internal/v1/alerts/webhook → Telegram (Alerts topic)
```

- The path is **all lowercase**. A capitalised variant is **404** by design (task `0276`).
- It is mounted under `/internal/` **solely** to inherit nginx's existing IP allowlist. ⚠️ Read the
  403 trap below before treating that as pure upside.
- The shared secret travels **in the JSON body**, not in a header: the monitoring stack's webhook
  sends exactly two headers (`User-Agent`, `Content-Type`) and cannot be given a custom one.

---

## 🚨 The trap that makes alerting die silently

**A `401`, `403` or `404` response permanently disables the notification channel.** Verified from the
shipped binary: all three mark the channel disabled, and it then refuses to send at all. **Every later
alert is dropped at source, forever, with no retry, and nothing tells you.**

Two consequences you must hold on to:

1. **The relay never returns 401/403/404.** A wrong, missing or unparseable secret answers **2xx**,
   drops the message, counts it, and raises a separate notice. This looks wrong at a glance — it is
   deliberate, and it is the whole reason the route is shaped the way it is. Do not "fix" it into a 401.
2. 🚨 **The nginx allowlist answers 403 on a source-IP miss.** **If the monitoring box's egress
   address ever changes, the first alert after that change disables the channel permanently** — and
   the symptom is silence, not an error.

   ⇒ **When the monitoring box's IP changes, migrates, or is rebuilt: update
   `PROFILE_INTERNAL_ALLOW_IPS`, redeploy the profile box, and then re-enable the webhook channel in
   the monitoring UI.** Re-enabling is a separate step; fixing the IP alone does not undo the disable.
   If you cannot re-enable it in the UI, use the
   [SQL fallback](#re-enabling-a-disabled-channel--sql-fallback).
   _(Owner ruling B, 2026-09-17 — risk accepted, documented here.)_

   The deploy prints the allowlist every run, and now warns loudly when it is **empty** (empty renders
   a bare `deny all`, i.e. 403 for everyone).

### What does NOT catch this — do not rely on any of it

- **`profile-checks.sh` cannot.** The only value it could compare the deployed allowlist against is the
  one the same deploy just wrote — a value compared with itself. It would report `OK` while the real
  address had moved.
- **The daily name-change digest (`0283`) cannot, and is actively misleading.** It is produced on this
  box and sent straight to Telegram: it never touches the monitoring stack, never crosses nginx, and
  never arrives from the monitoring box's address. **You would get a daily "the bot works" message
  while every alert was dead.**
- The evidence does exist and nothing reads it: the monitoring stack stores every attempt's response
  status, so a run of 403s sits there unread. Same shape as `0219`.

### The guard that DOES catch it — the alert-path liveness probe (task `0284`)

A cron **on the monitoring box** POSTs a probe to this same route every hour: the same URL, the same
nginx allowlist, the same shared secret, from the same egress address a real alert leaves from. The
relay checks the secret, writes a freshness marker, and **sends nothing**. `profile-checks.sh` reads
that marker's age in its existing **daily 08:00 UTC** run and, when it is stale or missing, fails to
the **external dead-man's switch** — a path that touches neither the monitoring stack nor Telegram,
which is exactly why it works where everything in the list above does not.

```
monitoring box host cron (hourly, :17)
  → POST {"payload":{"secret":…,"probe":"liveness"}} → the real webhook, through the real allowlist
     → relay: secret check → marker written, NOTHING sent
        → profile-checks.sh (daily) reads the marker age → stale ⇒ FAIL ⇒ POST $PING_URL/fail
           → external dead-man's switch pages the operator
```

| Piece | Where |
| --- | --- |
| Probe script + its hourly cron | `setup-telemetry.sh` → `/opt/uptrace/alert-probe.sh`, `/opt/uptrace/alert-probe.env` (both root-only) |
| Its two deploy variables | `TELEMETRY_ALERT_PROBE_URL`, `PROFILE_ALERT_WEBHOOK_TOKEN` — forwarded by `build-deploy-telemetry.sh`, persist-or-reuse on the box |
| Marker write | `src/profile-server/AlertRelay.ts` (`ALERT_PROBE_MARKER_PATH`), bind-mounted out by `setup-profile.sh` |
| The check | `profile-checks.sh` check 11, `alert-path-probe` |
| The channel's own state (task `0285`) | the same probe script reads it; the relay copies it into the same marker as `channel_state`; `profile-checks.sh` check 13, `alert-channel-state`, reads it |

**Detection latency: roughly 3 hours best case, ~27 hours worst**, plus the dead-man's switch's own
grace. It is bounded by the **daily** read, not the hourly probe — making the probe more frequent
does not shorten it. Accepted deliberately (owner ruling, 2026-09-18): the disable is permanent either
way, so faster detection only shortens how long you were blind; it does not change the repair.

#### 🚨 What the probe does NOT prove — read this before trusting a green line

- ✅ **A channel that is ALREADY disabled is now caught — by check 13, not by the probe's reachability
  test (task `0285`).** Before it, a transient 403 that disabled the channel yesterday left the probe
  green today and alerting dead. Now the same hourly probe also reads the channel's own record and
  carries it in the same POST; see *The channel's own state* below. ~~⚠️ **Not yet seen to trip on the
  real box** — the owner's drill is still to run (see below).~~ *(True until 2026-10-01.)* It has since
  tripped once on the real box (`0341`, 2026-10-01) — the bounds are under *The channel's own state*
  below.
- ⛔ **It does not check the secret the monitoring stack's channel config holds.** The probe proves the
  copy **the cron** holds matches the relay. Those are two separate copies; the channel's could be
  wrong and every alert dropped while the probe stays green.
- ⛔ **It proves nothing about Telegram delivery** — the marker is written on receipt, before any send —
  and nothing about a message reaching a human. `0283`'s daily beat is the other half; neither covers
  the other.
- ⛔ **It does not prove a monitor is attached to the channel.** A monitor that never ticked the channel
  delivers nothing, and no probe can see that.
- ⛔ **It does not discharge `0274` amendment A1** (delivery after an idle period). Different hop — and
  worth flagging the reverse: an hourly probe keeps NAT/conntrack state on the monitoring→profile hop
  warm, so it could **mask** an idle-path defect on that hop that a rare real alert would hit.
- ⚠️ **One assumption, not proved:** the monitoring stack's container egress is SNAT'd to the host's
  primary address, so a host-run curl leaves from the same address. True for a single-public-address
  box with default Docker networking — this box's shape. **The drill verifies it**: removing the
  address from `PROFILE_INTERNAL_ALLOW_IPS` must fail the probe **and** disable the channel. If the
  probe fails while the channel survives, the two egresses differ and **this guard is not guarding**.
- ⚠️ **`npm run check:config-parity` does not reach telemetry variables.** The hardening harness
  (`tests/scripts/profile-deploy-hardening.test.sh`) is the only gate that those two deploy variables
  are forwarded at all — the same residual `0277` recorded.

#### The channel's own state — check 13, `alert-channel-state` (task `0285`)

The probe catches the **cause** (the monitoring box cannot reach the webhook). Check 13 catches the
**state**: the monitoring stack refuses to send unless the channel's status is `delivering`, so a
channel disabled by a failure that has since healed drops every alert while the probe stays green.

```
monitoring box, the same hourly probe
  1. read-only SELECT of every channel's status + url from the monitoring stack's own Postgres
     (read-only transaction; 20 s client timeout + SIGKILL grace, 15 s statement_timeout); keep the channel(s) whose url equals the probe's own URL
  2. the SAME POST, one extra field: {"payload":{…,"probe":"liveness","channel_state":"<state>"}}
     → relay (after the secret check) copies a sanitised value into the SAME marker
        → check 13 (daily 08:00 UTC): anything but `delivering` ⇒ FAIL ⇒ dead-man's switch
```

**Verified schema** (the `uptrace/uptrace:2.0.2` binary, then confirmed read-only on the box on
2026-09-28 — names and counts only): the state is in the monitoring stack's **Postgres**, table
`notif_channels`, column `status`, an enum with four values `draft` / `delivering` / `paused` /
`disabled` (default `delivering`). The vendor's own disable writes `status = 'disabled'` — a state
change, not an error field or a timestamp. A webhook channel's `params` holds two keys, `url` and
`payload`; the probe selects only `url` and **never** `payload` (that is where the shared secret lives).

| What check 13 reports | Meaning |
| --- | --- |
| **OK** `delivering, Nh ago` | the stack's **own record** says it sends. Not proof a message arrives. |
| **FAIL** `DISABLED` | every alert is dropped at source — see the steps below |
| **FAIL** `PAUSED` / `DRAFT` | someone paused it, or never finished saving it |
| **FAIL** no channel's URL equals `TELEMETRY_ALERT_PROBE_URL` | the channel was deleted, **or** the probe tests a different URL than alerts use — a real finding either way |
| **FAIL** could not read the channel state | the stack's Postgres is down, or its schema changed. Read `/var/log/uptrace-alert-probe.log` on the monitoring box |
| **FAIL** no `channel_state` | the probe script or the relay predates `0285` — redeploy both |
| **FAIL** state UNKNOWN (stale / future / missing marker) | no fresh probe arrived; `alert-path-probe` fails with it — start there |

- **Several channels with the probe's URL:** the worst state wins (`disabled` > `paused` > `draft` >
  anything else > `delivering`). A deliberately paused duplicate would page — delete it.
- **Unreadable ⇒ FAIL on every run** (owner ruling, 2026-09-28). A version upgrade cannot cause nightly
  pages by surprise: the image is pinned, and the hardening harness fails `npm test` if the compose tag
  stops matching the probe script's `Schema verified against:` line. **To upgrade the monitoring
  image:** re-run the read-only schema check on the new version first, then bump both lines together.
- **Deploy order:** profile box first (`./build-deploy-profile.sh`), then the monitoring box
  (`./build-deploy-telemetry.sh`), in one window before 08:00 UTC. ⚠️ Check 13 FAILs ("no
  `channel_state`") from the profile deploy until the first probe carrying a state arrives, so run
  `/opt/uptrace/alert-probe.sh` by hand straight after. The reverse order is harmless (an older relay
  ignores the new field). Rolling the relay back makes check 13 FAIL with its "predates `0285`" text —
  intended.
- **Detection latency:** the same as the probe, ~3–27 h, bounded by the daily run.

⛔ **What a green check 13 does NOT prove:**
- It reads the stack's **own record**. If the vendor ever dropped alerts without updating `status`,
  this would not see it.
- Not the **secret held in the channel's own config** (still unchecked — a candidate follow-up).
- Not that any **monitor is attached** to the channel.
- Not **Telegram delivery**, nor a message reaching a human; not `0274` A1 (delivery after idle).
- It **detects only** — nothing re-enables a channel automatically.
- ~~⚠️ **Not yet seen to trip on the real box.** Until the owner's drill (put the channel into a real
  `disabled` state, watch the dead-man's switch page with `alert-channel-state`, re-enable, watch it
  go OK) has run, this guard is proven by tests only. One host, no CI.~~ *(True until 2026-10-01.)*
- ✅ **Seen to trip on the real box once, 2026-10-01 (`0341`).** An SQL update set the channel to
  `disabled`; the probe then read `disabled`, a **hand-run** `checks.sh` failed `alert-channel-state`
  with `DISABLED`, and the dead-man's switch paged the owner. The channel was re-enabled **by SQL, not
  in the UI** (see [SQL fallback](#re-enabling-a-disabled-channel--sql-fallback)), and the next probe
  and `checks.sh` read OK. ⚠️ **Bounds:** one host, no CI · the disable was written by SQL, not caused
  by a real vendor-side failure · the daily 08:00 UTC cron run was **not** the run that tripped · whether
  the dead-man's switch incident closes itself on the next success ping was **not observed** (it was
  closed by hand).

#### Three ways it will surprise you

1. 🚩 **A rolled-back profile image predating `0284` never writes the marker.** The daily check then
   fails with `alert-path-probe`, which *looks* exactly like an allowlist fault. Check the running
   image before you go hunting for a moved IP. (The FAIL text names this case.)
2. 🚩 **The shared secret must contain no `"` and no `\`.** It is embedded in the probe's JSON body, so
   a quote or backslash breaks the request and the probe fails forever while alerting is fine. Keep it
   hex or plain alphanumeric — which is what it is today. ✅ **This is now enforced, not just
   documented** (owner ruling, 2026-09-18): `setup-telemetry.sh` aborts the deploy — before it touches
   anything on the box — if the token holds either character, naming the variable and never the value.
   It checks the value the deploy supplies **and** one already persisted on the box.
3. 🚩 **A future-dated marker used to read GREEN.** A clock skew between the relay's container and the
   profile box gave a *negative* age, which the check read as fresh. It now FAILS and names the skew
   (same fix applied to the daily-backup marker check, which had the identical hole).

#### When `alert-path-probe` fails

1. Check the running profile image is not a rollback predating `0284` (surprise 1 above).
2. Check the monitoring box's egress address against `PROFILE_INTERNAL_ALLOW_IPS`; fix and redeploy
   the profile box if it moved.
3. Run `/opt/uptrace/alert-probe.sh` by hand on the monitoring box and read its one-line log at
   `/var/log/uptrace-alert-probe.log`. **Exit 0 means the relay actually recorded the probe**, because
   the relay answers a probe with its own distinct status string. Any other outcome is a real failure
   and the log says which: `FAILED to reach …` (curl could not get through — the allowlist case), or
   `REACHED … but it did NOT record a probe` (it answered the deliberate 200 it uses for a DROPPED
   call, so the secret this box holds almost certainly differs from the profile box's).
   ⚠️ A bare 2xx is *not* success on this route — every drop is a 200 as well, by design.
4. 🚨 **Then re-enable the notification channel in the monitoring UI and confirm alerting is live.**
   If a real alert hit the same failure, the channel is already disabled. **Fixing the address does
   not undo the disable** — see the rule above, it is the same rule. If you cannot re-enable it in the
   UI, use the [SQL fallback](#re-enabling-a-disabled-channel--sql-fallback) below.

#### When `alert-channel-state` fails

1. If `alert-path-probe` failed too, fix that first — check 13's state is UNKNOWN without a fresh probe.
2. `DISABLED`: **re-enable the channel in the monitoring UI**, then find what disabled it — usually a
   401/403/404 from the relay (check `PROFILE_INTERNAL_ALLOW_IPS`; the channel's own copy of the secret).
   Fixing the cause does **not** undo the disable, and re-enabling does not fix the cause: do both.
   If you cannot re-enable it in the UI, use the
   [SQL fallback](#re-enabling-a-disabled-channel--sql-fallback) below.
3. `PAUSED` / `DRAFT`: set the channel back to delivering (or finish saving it) in the monitoring UI.
4. `no channel's URL equals TELEMETRY_ALERT_PROBE_URL`: compare the channel's URL in the monitoring UI
   with `TELEMETRY_ALERT_PROBE_URL`. They must be identical — a trailing slash counts.
5. `could not read the channel state`: read `/var/log/uptrace-alert-probe.log` on the monitoring box.
   It holds the latest hourly run only, and ends `channel state: unreadable (<cause>)`:
   - `exec or psql failed, rc=1` — **the query failed**: the schema changed (missing table or column —
     was the monitoring image upgraded? re-verify the schema, task `0285` step 0), the query hit its
     server-side `statement_timeout=15s` (Postgres overloaded — this box has had OOM freezes, check
     memory first), or the Postgres service is not running (`docker compose ps` in the monitoring
     stack's directory). Real psql prints nothing on stdout in any of these; the log cannot tell them
     apart, so check the service first, then the image tag.
   - `exec or psql failed, rc=2` — **psql cannot connect**: Postgres is down, refusing connections, or
     did not accept within `PGCONNECT_TIMEOUT`. Check the container is up and its memory.
   - `timed out` / `killed, rc=137` — **the docker client itself hung** and `timeout -k 5 20` stopped
     it. Both Postgres-side bounds (connect 10 s, statement 15 s) sit under the client's 20 s, so a slow
     Postgres normally shows as rc 1 or rc 2 instead; this points at docker (the daemon, or the box
     frozen). `killed` can also be the OOM killer.
   - `unexpected output` — psql **succeeded** (rc 0), but the rows are not the shape the verified
     schema produces — e.g. a column changed type. Re-verify the schema (task `0285` step 0).
   The cause is a fixed word and an exit code — the log never carries psql's own output, the URL or the
   secret.
6. After any fix, run `/opt/uptrace/alert-probe.sh` by hand (its log ends `channel state: …`), then
   `/opt/profile/checks.sh` on the profile box, and confirm `alert-channel-state … OK`.

#### Re-enabling a DISABLED channel — SQL fallback

**A fallback, not the first choice.** Re-enable in the monitoring UI first. Use this only if you cannot
do it there. It is the reverse of the SQL update `0341`'s drill used, and the one place this method is
written down (task `0368`).

**Where it runs:** as root on the monitoring box (the probe's env file is root-only), inside the
monitoring stack's directory, through the same `postgres` compose service the probe's state read uses
(`setup-telemetry.sh`, `read_channel_state`). Unlike that read, this **writes**, so there is no
read-only transaction.

```bash
( set -eu
  . /opt/uptrace/alert-probe.env
  [ -n "${ALERT_PROBE_URL:-}" ] || { echo "ALERT_PROBE_URL is empty in alert-probe.env — stop." >&2; exit 1; }
  export ALERT_PROBE_URL
  cd /opt/uptrace
  docker compose exec -T -e ALERT_PROBE_URL postgres \
    psql -X -v ON_ERROR_STOP=1 -U uptrace -d uptrace <<'SQL'
\getenv probe_url ALERT_PROBE_URL
UPDATE notif_channels SET status = 'delivering'
 WHERE params->>'url' = $1
   AND status = 'disabled'
   AND (SELECT count(*) FROM notif_channels WHERE params->>'url' = $1) = 1
\bind :probe_url \g
SQL
)
```

- **How the URL travels:** it is read from `ALERT_PROBE_URL` in `/opt/uptrace/alert-probe.env`, inside
  a subshell, so the env file's values do not stay in your shell. It reaches psql through the
  environment (`-e ALERT_PROBE_URL` names the variable, never its value) and goes to Postgres as a bound
  parameter (`$1`), not as SQL text — so it is not on any command line, not in psql's output, and not
  in Postgres's own log **even if the statement fails** (tested locally, see `0368`'s worklog). ⛔ Never
  paste the URL into the SQL, and never add `set -x`.
- ⛔ **Never `SELECT` or print `params`.** Its `payload` key holds the shared secret.
- **The last two conditions are guards:** the update changes a row only when that channel is
  `disabled` (it never overrides a deliberate pause or turns on a half-saved draft — those are step 3
  above, in the UI), and only when **exactly one** channel has the probe's URL. With one disabled match
  the write is the same one `0341` proved.
- **Expect `UPDATE 1`.** Anything else → **stop**:
  - `UPDATE 0` — nothing was changed. Look at the channels in the monitoring UI to tell which cause:
    - no channel has the probe's URL, or several do (the guard refused to touch any) — see *Several
      channels with the probe's URL* above;
    - the one matching channel is not `disabled` — `delivering` needs nothing; `paused` / `draft` is
      step 3 above;
    - exactly one matching channel and it **is** `disabled` — then the URL did not reach psql (the
      `-e ALERT_PROBE_URL` hand-off into the container failed), so the update compared against the
      wrong text. Re-enable in the UI instead; do not work around it by pasting the URL into the SQL.
  - `ALERT_PROBE_URL is empty …` — the probe is not configured on this box; see *Configuration*.
  - an `ERROR:` line (exit code 3) — the schema is not what this was checked against (was the monitoring
    image upgraded?). Re-verify the schema (task `0285` step 0) before trying anything else.
- **Then:** step 6 above — hand-run `/opt/uptrace/alert-probe.sh` (its log ends
  `channel state: delivering`), then `/opt/profile/checks.sh` on the profile box
  (`alert-channel-state … OK`). Then confirm a message actually reaches Telegram. In `0341` the
  channel's *Test channel* button did that; ⚠️ it has since failed silently 3 times (`0369`), so **no
  arrival from it does not prove the channel is dead**. The reliable proof is the throwaway-monitor
  drill (*The working drill procedure* below).

⚠️ **Caveats, in plain words:**

1. **Proven once, on one host, on 2026-10-01** (`0341`) — the unguarded form of the same update. The
   command above (guards, bound parameter) was tested only locally, against a stand-in table on
   `postgres:17-alpine`, not on the box.
2. 🚩 **A real, monitor-fired alert after an SQL re-enable is unproven.** The update writes the vendor's
   table directly, behind the app's back; if the running app keeps channel state in memory, it might
   not notice until it restarts. `0341`'s only delivery check was a *Test channel* press, which may not
   look at the stored status at all. `0289` closed without its drill, so no evidence will come from
   there; and `0369`'s real alert came after a **UI** re-enable, so it does not count here either.
3. **It writes the vendor's internal table** and was checked against the pinned images only
   (`uptrace/uptrace:2.0.2`, `postgres:17-alpine`; `\bind` needs psql 16 or newer). The same upgrade
   rule as check 13 applies: re-verify the schema before bumping either image.

---

## Configuration

| Variable                      | Where       | Notes                                      |
| ----------------------------- | ----------- | ------------------------------------------ |
| `PROFILE_ALERT_WEBHOOK_TOKEN` | profile box | Shared secret. 🚨 **Never box-generated.** |
| `TELEGRAM_TOPIC_ALERTS`       | profile box | Blank ⇒ General                            |
| `TELEGRAM_TOPIC_NAME_CHANGES` | profile box | Blank ⇒ General                            |
| `PROFILE_ALERT_WEBHOOK_TOKEN` | monitoring box | The **same** secret, second copy (task `0284`). 🚨 **Never box-generated.** ⚠️ No `"` or `\` — it is embedded in JSON, and `setup-telemetry.sh` refuses to deploy a token containing either. |
| `TELEMETRY_ALERT_PROBE_URL`   | monitoring box | The full lowercase webhook URL — **copy** the string already in the channel config, do not rebuild it. Blank ⇒ probe off. |

All three are persist-or-reuse: blank on a redeploy **reuses** the value already on the box. To clear
one, remove its persist file on the box and redeploy.

🚨 **`PROFILE_ALERT_WEBHOOK_TOKEN` must never be minted by the box.** A secret only the box knows is a
secret the sender does not, so every alert fails its check and is dropped — silently, forever. This is
the `PROFILE_INTERNAL_TOKEN` trap (`0182`) exactly. A harness assertion now fails the build if it is
ever put into `generate` mode.

⛔ **There is deliberately no feedback topic on this pipeline.** Player feedback is sent by the **game**
server; a feedback topic here would be config nothing reads, and its presence would read as evidence
that the feedback-topic move had already shipped. It has not.

**Blank topic ⇒ General**, which is exactly the pre-`0277` behaviour. An unset topic degrades to
"works, in the wrong room" — never to "fails". ⚠️ But a **wrong** topic id makes Telegram reject the
message and the notification is **lost**, not mis-filed. Never use `0` or a space as a placeholder.

---

## Bringing it up, in order

1. Set the three variables in the gitignored deploy env files.
2. Deploy the profile box (`build-deploy-profile.sh`).
3. Create the webhook channel in the monitoring UI: the exact **lowercase** URL, plus a payload
   carrying the secret (and, optionally, static display strings — see below). ⛔ Not placeholders.
   Leave `Optional Condition` **empty** — see below.
4. Create each monitor (alert rule) and **tick the shared channel in the monitor's own
   `Notification channels` picker** — see *Creating a monitor* below. A channel alone delivers nothing.
5. Force an alert and confirm it arrives in the Alerts topic. **Use the drill procedure below** — it
   proves the ✅ recovery half too, which a force-and-delete does not.
6. Task `0284`'s liveness probe, **after** step 3 (it needs the exact channel URL to copy): set
   `TELEMETRY_ALERT_PROBE_URL` and `PROFILE_ALERT_WEBHOOK_TOKEN` in the gitignored telemetry env
   files, run `build-deploy-telemetry.sh`, then run `/opt/uptrace/alert-probe.sh` once by hand
   (exit 0 = the relay recorded it; see *When `alert-path-probe` fails* for what the other outcomes
   mean) and confirm the profile box's `checks.sh` reports `alert-path-probe … OK`.
   🚩 **Do this before the next 08:00 UTC run**, or that run pages about a marker nothing has written
   yet. From the profile box's deploy until the first probe lands, that check FAILS by design.

⚠️ **Between steps 2 and 3 a fired alert reaches nobody.** That gap is expected, not a defect.

🚨 **Owner ruling, 2026-09-17: ONE SHARED CHANNEL for every monitor, and NO numbers in the message.**
The alternative offered was one channel per rule carrying per-rule `threshold`/`window` strings; the
owner chose shared. **Consequence: the message carries no `Threshold:` line at all, so the monitor
NAME is the only place a number can ever appear.** ⇒ **Name every monitor so its heading alone is
actionable** — e.g. `profile · DB pool saturated (>0 waiting, 5 min)`. This was previously only a
recommendation (design report §2); it is now an owner ruling.

### The payload template

The custom payload is **merged** into the body, nested under a top-level `payload` key — it does not
replace it. The relay reads the rule name, status, timestamp and **link** from the sender's own
top-level fields.

🚩 **The payload is passed through VERBATIM and is never templated.** Confirmed by the first real
production call, 2026-09-17. The sender stores it without inspecting it, so it never substitutes
anything into it either: a value of `{{ .value }}` is delivered as those literal characters, and the
operator's message reads `Value: {{ .value }}`. ⛔ **Do not paste placeholder syntax into the payload —
there is no syntax that works.** (The relay now filters such values out rather than showing them, but
the right fix is not to write them.)

⇒ **The measured value, its threshold and its window are NOT OBTAINABLE.** The sender's own top-level
fields carry none of them, and the payload cannot compute them. **This is why the message carries a
link instead**: one tap lands on the chart, where the numbers are.

| Key         | Required? | Purpose                                                             |
| ----------- | --------- | ------------------------------------------------------------------- |
| `secret`    | **yes**   | must equal `PROFILE_ALERT_WEBHOOK_TOKEN`                            |
| `threshold` | no        | a **static** string you hardcode for that one monitor, e.g. `"300"` |
| `window`    | no        | a **static** string, e.g. `"10 min"`                                |
| `value`     | no        | only useful if you have a static string for it — usually you do not |

A static string is the one thing that does survive verbatim passthrough, because nothing has to
substitute it. Every display key is optional: a missing one degrades the message, it never drops the
alert. A key still containing `{{` or a `PASTE_…` literal is dropped from the rendered message.

⚠️ **With the shared-channel ruling above, `threshold` / `window` / `value` are not used** — one shared
payload cannot carry per-rule numbers. Keep the monitor name carrying the number instead.

📝 **Open to-do — for the OWNER, not an agent (observed 2026-09-17).** The live channel's stored JSON
payload **still contains `{{ .value }}`, `{{ .window }}` and `{{ .threshold }}`**. They are harmless
today (the relay filters them out, so the operator never sees them), but they are misleading to anyone
reading the channel config — they look like working templating and are not. **They should be deleted.**
⛔ **The owner must do this, not an agent: the same payload field holds the shared secret**, so opening
and editing it means handling the secret.

### The channel's `Optional Condition` field — leave it EMPTY

**Observed live 2026-09-17: ours is empty, and that is correct. Keep it empty.** The field is a
**filter** on which alert events reach the channel; empty filters nothing, so every event — including
the recovery one — gets through.

Its function vocabulary, from the **current public vendor docs**: `monitorName()`, `alertName()`,
`alertType()` (returns `"error"` or `"metric"`), `attr(key)`, `hasAttr(key)`. **There is no status
function** — you cannot filter on firing-vs-resolved here even if you wanted to.

⚠️ **Caveat, stated plainly: that vocabulary is the current published vendor documentation, and this
deployment runs 2.0.2 — it may differ.** It was not read off the running form.

⇒ This closes one worry: a condition that covered only the "created" event would have silently killed
the ✅ recovery message. An **empty** condition cannot do that.

✅ **And the second worry is now closed too, by the drill of 2026-09-17** (next section): a recovered
alert arrives with **`alert.status` = `closed`**, which the relay already matches, so the recovery
renders as ✅. This paragraph previously said that was unverified. It no longer is.

### Creating a monitor (observed live, 2026-09-17)

**1. The metric name in the picker is the PREFIXED, UNDERSCORED form.** Settled — the picker offers,
verbatim:

| Name in the picker | Type |
| --- | --- |
| `geoconflict_profile_alert_relay` | counter |
| `geoconflict_profile_db_pool_waiting` | gauge |
| `geoconflict_profile_http_duration` | histogram, milliseconds |
| `geoconflict_profile_login_create_enabled` | gauge |
| `geoconflict_profile_process_cpu_usage` | gauge, `1` |
| `geoconflict_profile_process_memory_heap_used` | gauge, bytes |
| `geoconflict_profile_process_memory_rss` | gauge, bytes |

⇒ **`0274/plan.md:192`'s prediction was right** (dots → underscores, prefix kept).
`0274/brief.md:20`'s un-prefixed list was an **abbreviation**, not what the UI shows. Recorded here so
nobody re-litigates it. **The advice stands regardless: pick from the autocomplete, never hand-type.**

**2. 🚨 Three metrics are ABSENT from the picker: `login_requests`, `players_created`,
`session_rejected`.** All three are counters that have **never been incremented** — no real player has
ever logged in, so no series exists and the picker does not offer the name.

⇒ **You cannot write a rule against a name the picker does not offer.** Concretely: **the A1
creation-spike rule CANNOT BE BUILT until the first player is created.** This is the "a rule pointed at
a name that does not exist sits there silent forever" failure — **observed live, not predicted.** It
also means the recommended drill fixture's metric (`session_rejected`) does not exist yet — though the
first junk-token request would create it.

> ✅ **That last clause is now VERIFIED, 2026-09-17** — it was a prediction when written. The first
> junk-token request **does** create `geoconflict_profile_session_rejected`, and it then appears in the
> picker. ⇒ **Fire the traffic first, create the monitor second.** See the drill section below.

**3. The notification channel is chosen ON THE MONITOR FORM.** The monitor form carries its own
`Notification channels` picker. **Each monitor opts in individually.** A channel cannot be picked up by
a monitor that did not select it. (This is what makes the default-error-monitor rule below safe **by
construction**, not by memory.)

**4. 🚨 The UI trap: the Create button fails with "at least one metric is required" unless the metric
row is COMMITTED by clicking its green tick.** A selected-but-uncommitted metric row looks complete and
is not. The first create attempt on 2026-09-17 silently did nothing and was only caught by re-reading
the monitor list afterwards. ⇒ **After creating any monitor, re-read the list and confirm it is there.**

#### The one rule that exists today

`profile · DB pool saturated (>0 waiting, 5 min)` — monitor id 9, status active, attached to the
`alerts-to-telegram` channel.

| Field | Value as built |
| --- | --- |
| Metric | `geoconflict_profile_db_pool_waiting` |
| Aggregation | **`avg`** (the UI default) |
| Grouping interval | 1 minute |
| Check | the last 5 points (5 minutes) |
| Max allowed | 0 |

⚠️ **Caveat on the aggregation.** The design specified `max`; the UI default `avg` was kept. On a
**non-negative gauge with a `>0` threshold the two are equivalent** — any non-zero sample lifts the
average above 0. **They are NOT equivalent if the threshold ever moves off 0.** If you raise the
threshold, switch the aggregation to `max` first, or the rule quietly means something else.

The gauge read flat 0 across the preceding hour, so the rule is armed against a genuinely quiet series.

### 🚨 Operator rule: never wire this channel to the default error monitors

**Eight default `Notify on all errors` monitors (ids 1–8) are active, holding over 500,000 open alerts
between them** (136722, 136876, 120943, 101346, 81284, 64614, 11536, 1185 — observed 2026-09-17).
**None is attached to the Telegram channel.**

⛔ **OWNER RULING, 2026-09-17: leave them in place, and NEVER wire the Telegram channel to them.** The
owner was offered leave-them / investigate-first / pause-or-delete-them, and chose to leave them, on the
reasoning that they harm nothing while unattached and that the rule belongs written down where the next
person will look. ⛔ **Not precedent** — one ruling, this case.

Why this is safe rather than fragile: per point 3 above, **a monitor must opt into a channel**. These
eight cannot pick the Telegram channel up by accident. The rule is therefore structural; it only breaks
if someone actively ticks the channel on one of them. **Don't.**

⚠️ **What those 500 K open alerts actually are was not investigated** — that is unknown, deliberately
left so by the same ruling.

### What the operator actually receives

```
🚨 Geoconflict · profile · Player creation spike
Status: firing
Since: 2026-09-17 16:56 UTC
→ open the alert          ← a link to the chart
```

A recovered alert uses `✅ … — resolved` and `Status: resolved`. The link is omitted entirely if the
sender supplies no usable URL — the message still sends.

⚠️ **A naming detail, observed 2026-09-17:** the alert name the monitoring stack generates **appends
the aggregation alias** to the monitor name. A monitor named
`DRILL — delete me — rejected sessions (>0 / 1 min)` produced the heading
`DRILL — delete me — rejected sessions (>0 / 1 min): rejected`. ⇒ **The monitor name is not quite the
whole heading.** Name monitors expecting that suffix.

---

## ✅ PROVEN END TO END — the recovery drill, 2026-09-17

**Both halves of the alert path are now confirmed live: a 🚨 firing message and a ✅ resolved message
both arrived in the Alerts topic.** The owner watched the topic and confirmed both.

### The fact that closes the long-standing residual

🚩 **`alert.status` = `closed`.** **CONFIRMED by observation, not designed.** The relay
(`src/profile-server/AlertRelay.ts:141`) matches `closed` / `resolved` and therefore renders the
recovery correctly — but it was written to match those two values **without anyone knowing which value
Uptrace 2.0.2 actually emits**. It happened to be right. ⇒ **The residual "a resolved alert may render
as still firing" is CLOSED.**

Also observed in the same drill:

| Field | Observed value |
| --- | --- |
| `alert.status`, recovered | `closed` |
| `alert.status`, firing | `open` |
| `alert.type` | `metric` |

### The working drill procedure — reusable, run it again whenever you need to

1. Send ~20 requests to the **public, read-only** `GET /v1/profile` with a junk Bearer token. Each
   answers **401** and increments `session_rejected` with `reason = invalid`. **No writes, no rows, no
   restart**, repeatable in seconds.
2. 🚩 **That first request CREATES the metric in the monitoring stack.**
   `geoconflict_profile_session_rejected` does **not** appear in the metric picker until it has been
   incremented once. ⇒ **Fire the traffic BEFORE trying to create the monitor.** *(This ordering was
   recorded as **unverified** in the earlier pass of this runbook. It is now **verified** — it works.)*
3. Create a throwaway monitor on that metric: `perMin(sum(...))`, grouping interval **1 minute**, check
   **the last 1 point (1 minute)**, **max allowed 0**, attached to the alerts channel. **The short
   window is what makes it clear quickly.**
4. Send a second burst → **it fires**.
5. **Stop sending → it closes by itself.** No deletion, no restart — a **real recovery event**.
6. Delete the throwaway monitor. *(Verified: the other monitors were unaffected.)*

### 🚨 A defect the drill found — the fixture written into `0274`'s plan cannot pass

`0274`'s plan specifies the drill fixture as an **always-true rule** (`process.memory.rss > 1`).
⛔ **That fixture cannot pass a recovery drill.** An always-true rule **never clears**, and **deleting a
monitor is not a recovery event**, so **no ✅ is ever generated**. Run as written, the drill would have
reported green while proving only the **firing** half.

⇒ **Use the fixture above instead.** **The generalisable lesson, not a one-off:** a recovery drill needs
a rule whose **data** returns below threshold on its own. A rule that cannot go false, or one you
"clear" by deleting it, proves half the path and looks like it proved all of it.

### ⚠️ Bounds — what this PASS does NOT cover

- ⛔ **It does NOT discharge `0274` amendment A1**, which requires proving delivery **after an idle
  period** (the stale-connection defect). **Both bursts here were minutes apart on a warm connection.**
  A1 stands. (2026-10-01: A1 was since closed on observed evidence, bounded to 4 h 36 min — see
  *What is still unproven*.)
- ⛔ **It does not prove SUSTAINED delivery.** `0283`'s daily digest remains the only non-circular proof
  of that. Unchanged.
- ⛔ **It says nothing about the 403 channel-disable trap.** `0284`'s liveness probe (above) now guards
  the **cause** of that trap; the **already-disabled state** is still uncovered and is a separate
  follow-up.

### 📝 A naming alias, so nobody hunts for a section that does not exist

This drill is **`0274` plan §7.6**. It has been referred to as **"§8"** in several places, including
`0277`'s review ledger. **Same thing — there is no §8 drill.**

---

## Behaviour worth knowing before it surprises you

- **Several messages per one alert is correct.** Dedupe is keyed on the alert-**event** id, and
  `created` / `status-changed` / `recurring` are separate events with separate ids. A recurrence must
  not be suppressed.
- **An unresolved alert NAGS — it does not go quiet.** The monitor form's `Notification repeat interval`
  (Repeat strategy: **Default**) states: the interval starts at **15 minutes** and **doubles every 3
  notifications**, capped at **24 hours** — so 15m, 15m, 15m, 30m, 30m, 30m, 1h, … (observed on the form,
  2026-09-17). ⇒ A firing alert you leave alone keeps messaging you, with the gaps widening. Expect it
  before it surprises you.
- **Dedupe is in-process.** A restart between an attempt and its retry delivers a **duplicate**. That
  is the correct way round — a duplicate alert beats a lost one.
- **The retry budget is ~26 hours** (32 attempts, 60 s → 1 h backoff). Only a 2xx stops it. The relay's
  dedupe window is deliberately longer than that.
- **The relay answers before it sends.** A Telegram failure therefore happens _after_ the response and
  can never be reported back through the status code. The one retry inside the send helper and the
  `alert.relay` counters are the entire answer to that.

## Security

- 🚨 **The secret is recoverable from the monitoring stack's own stored notification history**, not
  just its config screen: it persists the full outbound JSON per attempt. **Rotating the secret is not
  erasure** — the old value survives in that history until it ages out.
- The relay's response body is a fixed constant and echoes nothing from the request, because the first
  100 bytes of every response are persisted in that same history.
- Anyone with access to the monitoring stack's channel config can read the secret. It is separate from
  `PROFILE_INTERNAL_TOKEN` precisely so that exposure is bounded.

## What is still unproven

✅ **What is no longer on this list:** the **recovery message form**. Proven live 2026-09-17 — see the
drill section above. `alert.status` = `closed`, the relay matches it, the ✅ arrived.

~~⚠️ **Delivery after an IDLE period is unproven** (`0274` amendment A1). The drill's two bursts were
minutes apart on a warm connection, so the stale-connection defect `0061` describes was never
exercised. Fire once, wait 30–60 min, fire again — that second firing is the test.~~ *(True until
2026-10-01.)*

✅ **Delivery after an IDLE period — observed once, bounded to 4 h 36 min** (`0274` amendment A1,
closed by task `0289`). On 2026-10-01 a Telegram send from the profile box's long-running process
**arrived after 4 h 36 min of silence** (08:12 → 12:48 UTC). It came from the name-change notifier,
which shares the alert relay's sender, connection pool and egress proxy in the same process (code
reading, `0289`'s plan). An **owner ruling** accepted this observed gap in place of the ≥ 8 h drill —
**the drill was not run.** Evidence: `ai-agents/tasks/done/0289-prove-a-telegram-alert-arrives-after-an-idle-period-0274-amendment-a1/worklog.md`.

⛔ **What it does NOT cover — each bound stands:**
- **An overnight (≥ 8 h) gap is still unproven.** The longest gap seen is 4 h 36 min; do not round it up.
- **Whether the send needed a retry is not determined.** The name-change notifier is not counted by
  `geoconflict_profile_alert_relay`.
- **The monitoring → relay hop after quiet is not covered.** This send never crossed it; in production
  the hourly `0284` probe keeps that hop warm.
- **The Alerts topic itself** was proven on 2026-09-17 on a warm connection only, not after quiet.
- **Quiet at the egress proxy is unknown.** If the game server shares that proxy, its sends could have
  kept it warm.
- **`0061`'s stale-connection mechanism is neither confirmed nor ruled out.** The HTTP client (undici)
  closes unused pooled connections within 10 min at most (code reading only), so the 12:48 send most
  likely opened a fresh connection.

✅ **Sustained Telegram delivery IS observed, from 2026-09-19 — `0283`'s digest arrived on the real
box.** The owner deployed the profile box on the evening of **2026-09-18** and read the topic the next
morning: **two real messages**, the first non-mocked sends this feature has ever produced.

| Message | Body timestamp | Delivered (MSK) | What it is |
|---|---|---|---|
| 1 | `2026-09-18 18:33 UTC` | 21:34 | the **deploy-time send** (`setup-profile.sh` runs the digest once at deploy) |
| 2 | `2026-09-19 04:00 UTC` | 07:00 | **cron**, `0 4 * * *` UTC — the owner's chosen hour, to the minute (Moscow is UTC+3 year-round) |

Both read exactly `Waiting for review: 0`, and **the owner confirmed live that both landed in the Name
Changes topic** — not Alerts, not the player-feedback chat. So the 2026-09-17 ruling *send even on zero,
because the daily arrival is the heartbeat and its absence is the signal* is now verified **in
production**, not only in a unit test. **Two messages inside 24 h is EXPECTED** — deploy-time seed plus
cron — the documented, owner-accepted cost of that deploy-time send; it is not a double-send.
Evidence: `ai-agents/tasks/done/0283-daily-digest-of-pending-name-change-reviews/worklog.md`
§ *OWNER-OBSERVED LIVE DELIVERY — 2026-09-19*. Mechanics:
`ai-agents/knowledge-base/name-change-digest-runbook.md`.

⛔ **What those two messages do NOT prove — read this before treating the heartbeat as alert coverage:**

1. **Nothing about Uptrace alert delivery.** The digest never touches the monitoring stack, never
   crosses nginx's `/internal/` allowlist, and never arrives from the monitoring box's egress address.
   **A 403 could have permanently disabled the alert channel while both of those messages arrived
   perfectly.** `0284`'s probe guards that path; this does not — see the warning near the top of this
   document, which observed delivery makes **more** important, not less.
2. **Delivery after an IDLE period is still unproven** (`0274` amendment A1, above). The gap here was
   ~9.5 h — closer to a cold connection than the drill's minutes-apart bursts, so it is **weak evidence
   toward A1, not the test A1 asks for.** ⚠️ **Do not record A1 as discharged by this.** *(2026-10-01:
   A1 was since closed on separate observed evidence, bounded to 4 h 36 min — see the IDLE paragraph
   above.)*
3. **The second day's single message is NOT yet observed.** One scheduled firing is not a schedule; the
   proof is the **2026-09-20** 07:00 MSK message arriving, and arriving **once** (`0283` brief
   verification step 4, still open).
4. **`profile-checks.sh` check 12's first-ever run was unobserved** as of the owner's report
   (~07:38 UTC; that cron fires at 08:00 UTC). **Do not assert it passed.**
5. **A non-zero count has never been rendered.** Both observed messages reported `0`; the non-zero path
   is unit-tested only.

The counters here catch an
_intermittent_
failure (the next alert gets through carrying the news) and a _sustained_ one **not at all** — a rule
on "the alert path failed" would travel the alert path. The only non-circular proof is a message that
sends unconditionally on a schedule, which is `0283`'s daily digest (ruled to send even at zero count
precisely so it doubles as a heartbeat). ⚠️ And note the limit above: that digest proves **Telegram**
works, never that the **monitoring → relay** hop does.
