# Worklog — 0449

No host, address, token, chat id or secret value recorded here (step 10). Variable **names** only.

## 2026-10-15 — profile, telemetry and game dev deployed and checked; game prod, digests and 24 h window still open

Recorded by a spawned `fkit-producer` (no owner channel, ADR-021/037) from results relayed by `fkit-lead` (main
session, owner present). The producer did not see the deploy output, the boxes or the Telegram messages itself.
Box steps were run by the owner; the read-only checks and the game dev tests in steps 4, 6 and 7 were run by
`fkit-lead` over SSH **with the owner's in-session OK**, as the brief's *Owner* field allows.

**Gate check.** The telemetry and game dev deploys wait for `0452`'s pre-checks P1–P4 (*Notes*, *Why `0452`*). `0452`'s
worklog records P1–P4 **passed 2026-10-15**, before these deploys.

### Step 1 — owner set-up: done (owner), checked by name only (`fkit-lead`)

- `PROFILE_SSH_ALERT_TOKEN` added once to `.env.secret`, `.env.profile.secret` and `.env.telemetry.secret` — 64 hex
  characters, one line in each file, the **same value** in all three.
- `PROFILE_INTERNAL_ALLOW_IPS` in `.env.profile` now has **3 entries** (game dev added); every entry is IPv4-shaped, no
  duplicates.
- `PROFILE_API_URL` added to `.env.dev` — copied from `.env.prod`, identical.
  - 📌 **OWNER RULING 2026-10-15**, live `AskUserQuestion` in the main session, relayed by `fkit-lead` to a spawned
    `fkit-producer` with no owner channel (ADR-021/037); ⛔ **not producer precedent.** Verbatim selection:
    **"Set it (Recommended)"** — set `PROFILE_API_URL` for game dev. **Accepted side effect:** dev-game clients now use
    the real profile server. Game dev has no `PROFILE_INTERNAL_TOKEN`, so the dev game server's own profile calls do
    nothing.

### Step 2 — commit: done before today

`0443`'s code is commit **`779ddc2`** (2026-10-12, *"Sprint 8: SSH key login (0441) + SSH security alerts to Telegram
(0443)"*) — committed together with `0441`'s, as the brief expected.

### Step 3 — deploys (owner ran them), 2026-10-15

| Box | Command | Version / tag | Result |
|---|---|---|---|
| Profile | `npm run deploy:profile` | `0.0.164-profile.1` | Exit 0. `✅ SSH alert agent installed/up to date for this box.` `/health` returned `status: ok`, `version: 0.0.164-profile.1` (checked by `fkit-lead`). |
| Telemetry | `npm run deploy:telemetry` | `0.0.164-telemetry.2` | `✅ SSH alert agent installed/up to date for this box.` sshd password-off lines still ✅. Exit code not stated in the relay. |
| Game dev | `./deploy.sh dev 20261003-122424` (same-version redeploy) | image `20261003-122424` | Exit 0. `✅ GAME HOST SETUP OK`; `ssh-alerts — agent installed for game-dev`; sshd password off; env file removed. |
| Game prod | — | — | **NOT deployed.** Waits for the weekend slot, with `0452`. |

- 📌 **OWNER RULING 2026-10-15**, live `AskUserQuestion` in the main session, relayed by `fkit-lead` to a spawned
  `fkit-producer` with no owner channel (ADR-021/037); ⛔ **not producer precedent.** Verbatim selection: **"Deploy now,
  ship both (Recommended)"** — deploy the profile server today even though it also ships `0350`'s name-review command
  early, instead of `0350`'s own weekend profile deploy (Sprint 8 board, 2026-10-15 ruling 3). Recorded on `0463`.
- **Notices, not failures:**
  - Profile: *"image tag … resolves to 'nothing'"* — the image was deployed by digest.
  - Profile: the tag push uploaded commit `739fc0e`, which was **not yet on any remote branch** at that time.
  - Telemetry: deprecation warnings for `TELEMETRY_VPS_PASSWORD` / `TELEMETRY_VPS_LOGIN` (leftover settings).

### Step 4 — per-box sanity: passed on profile, telemetry, game dev (`fkit-lead`, ~12:41 UTC)

| Check | Profile | Telemetry | Game dev | Game prod |
|---|---|---|---|---|
| `geoconflict-ssh-alerts test` | `OK: test event delivered (HTTP 202)` | same | same | not done |
| `🧪 SSH alerts test` message arrived | yes | yes | yes | not done |
| `geoconflict-ssh-alerts` service | `active` | `active` | `active` | not done |
| `logrotate` installed, config accepted | yes (see nuance) | yes (see nuance) | yes (see nuance) | not done |
| `flock` present | yes | yes | yes | not done |
| Overlapping 5-minute ticks in the agent's log | 0 | 0 | 0 | not done |

**logrotate nuance — not a defect.** Run **on its own**, `logrotate -d /etc/logrotate.d/geoconflict-ssh-alerts` reports
`error: skipping … parent directory has insecure permissions`, because `/var/log` is `root:syslog 775`. The **real**
run, `logrotate -d /etc/logrotate.conf`, carries the global `su root adm` line and accepts the file (*"log does not need
rotating"*). Checked the real-run way on all three boxes.

### Step 5 — login alert: passed on profile, telemetry, game dev (owner screenshots)

- One `🔑 SSH login · <box>` message per box **within a minute** of the test login: `root · by key`, UTC time.
- Source shown **masked** — only the first two parts of the address, the rest as `*.*` — with provider hint
  `(unknown)`: the lookup found no provider and said so in words, which the brief allows.
- Repeat logins were grouped as *"+N more SSH logins … within 2 min"*.
- Game prod: not done.

### Step 6 — "Telegram unreachable", game dev: passed (`fkit-lead`, owner's OK)

- Backed up `/etc/geoconflict-ssh-alerts/ssh-alerts.env`; pointed `SSH_ALERTS_URL` at a black-hole address at
  **12:46:31 UTC**.
- Login time **0.69 s** vs a **0.73 s** baseline — not slowed.
- **2 alerts** held in the spool.
- Restored at **12:46:50 UTC** — byte-identical to the backup; backup deleted; file mode `600`, owner root.
- Held alerts arrived at **12:50 and 12:51 UTC** (spool at 0 by 12:51:10) — within about 5 minutes of the restore, as
  the brief expects.

### Step 7 — fail2ban down/back, game dev: passed (`fkit-lead`, owner's OK)

- Stopped **12:47:06 UTC**. First down check 12:50 (streak 1). `🚨 fail2ban DOWN · game-dev` (*"State: not running …
  Since 12:50 UTC"*) arrived **12:55 UTC** — about 8 minutes after the stop, inside the 10-minute limit.
- Started **12:55:22 UTC** (sshd jail up). `✅ fail2ban back · game-dev` arrived **13:00 UTC** — inside the 5-minute
  limit.

### Step 10 — tracked-file check (`fkit-lead`): PARTIAL

- `PROFILE_SSH_ALERT_TOKEN`'s value: in **0** tracked files.
- **Box IP addresses ARE present in 12 older tracked files** — knowledge-base reports, old task briefs/plans, reviews,
  and `example.env.profile`. All of them predate `0443`; `0443`'s commit `779ddc2` added none (its
  `example.env.profile` change adds no address). ⚠️ **Flagged for the owner** — a pre-existing condition, not this
  task's defect, and not fixed here.
- **The chat id was not checked.**
- Nothing written for this task (this worklog included) holds an address, host, token or chat id.

### Verification steps — where they stand

| # | Step | State |
|---|---|---|
| 1 | Step 1 recorded (names only) + commit id | **Met** — see Step 1; commit `779ddc2` |
| 2 | Four deploys recorded | **3 of 4** — game prod not deployed |
| 3 | Step 4 per box | **3 of 4** — game prod not done |
| 4 | `🔑` within a minute, masked, per box | **3 of 4** — game prod not done |
| 5 | Game dev "Telegram unreachable" | **Met** |
| 6 | fail2ban `DOWN` then `back` on one box | **Met** — game dev |
| 7 | Two consecutive daily digests, all four boxes, Moscow-time window correct | **Open** — first chance 2026-10-16 08:10 UTC. ⚠️ All four boxes can only appear once game prod is deployed; until then it shows as `NO REPORT` |
| 8 | 24 h window with zero per-guess messages | **Open** |
| 9 | Step 10 grep clean | **Partial** — token clean; 12 older tracked files hold box addresses (pre-existing, flagged); chat id not checked |

### Still open

- Game prod: deploy (weekend slot, with `0452`), then its steps 4 and 5.
- Step 8: two consecutive daily digests (08:10 UTC, from 2026-10-16), including the check that each Moscow-time box's
  window is the 24 h before 08:00 **UTC**.
- Step 9: a 24 h window with zero per-guess messages.
- Step 10: chat id check; the owner's call on the 12 pre-existing tracked files with addresses.

### Status

Unchanged: `🔲 Backlog` — the spawn instruction said not to change any status.

## 2026-10-15 (later) — Step 10 update: chat id checked; the 12 older files handed to `0464`

Recorded by a spawned `fkit-producer` (no owner channel, ADR-021/037) from results relayed by `fkit-lead`. The producer
did not run the searches itself.

- **Telegram chat id (`FEEDBACK_TELEGRAM_CHAT_ID`)'s value:** in **0** tracked files (`fkit-lead`, `git grep -lF`).
- **SSH alert token (`PROFILE_SSH_ALERT_TOKEN`)'s value:** in **0** tracked files (as recorded above).
- **The 12 older tracked files with box addresses** are now covered by a new cleanup task,
  [`0464`](../0464-replace-real-server-ip-addresses-in-tracked-files-with-placeholders/brief.md) (Backlog board,
  `🔲 Backlog`, owner `fkit-coder`).
  - 📌 **OWNER RULING 2026-10-15**, live `AskUserQuestion` in the main session, relayed by `fkit-lead` to a spawned
    `fkit-producer` with no owner channel (ADR-021/037); ⛔ **not producer precedent.** Question: *"12 older files
    tracked in git contain server IP addresses … What should we do about them?"* Verbatim selection: **"File a
    cleanup task (Recommended)"**.
  - Not searched here: the wiki vault (handed to `fkit-wiki` inside `0464`) and git history (out of scope unless the
    owner rules otherwise).
- **So step 10 is met for this task's own writing:** nothing written for `0449` holds an address, host, token or chat
  id; the pre-existing addresses are `0464`'s to remove. Verification step 9 moves from **Partial** to **Met for this
  task's scope** (the 12 pre-existing files handed to `0464`).

### Still open (updated)

- Game prod: deploy (weekend slot, with `0452`), then its steps 4 and 5.
- Two consecutive daily digests (08:10 UTC, from 2026-10-16), including the Moscow-time window check.
- A 24 h window with zero per-guess messages.

Status unchanged: `🔲 Backlog`.

## 2026-10-15 (later) — commits in the deploys, a second game dev redeploy, game prod

Recorded by a spawned `fkit-producer` (no owner channel, ADR-021/037) from facts relayed by `fkit-lead`. The producer did
not see the boxes or the deploy output itself.

- 📌 **OWNER RULING 2026-10-15**, live `AskUserQuestion` in the main session, relayed by `fkit-lead`; ⛔ **not producer
  precedent.** Verbatim selection: **"Add the short note (Recommended)"** — append these lines; nothing above is touched.
- **Commits in the deploys.** `0442`'s code is commit **`daa1bcc`** (2026-10-14). All three deploy tags —
  `0.0.164-telemetry.1`, `0.0.164-profile.1`, `0.0.164-telemetry.2` — contain both `779ddc2` (`0443`) and `daa1bcc`
  (`0442`); checked by `fkit-lead` with `git merge-base --is-ancestor`.
- **`0.0.164-telemetry.1` (12:13 MSK) does not count for this task.** It ran before `PROFILE_SSH_ALERT_TOKEN` was added
  (its output warned the token was empty — `0452`'s worklog). The telemetry deploy that counts is `0.0.164-telemetry.2`
  (Step 3 above).
- **Second game dev redeploy, after 16:23 MSK.** Owner ran `./deploy.sh dev 20261003-122424` (same image, no game
  change); output pasted to and read by `fkit-lead`. Key lines:
  - `OK  preconditions — root, GAME_ENV=dev, role marker 'game'`
  - `ssh-alerts: agent v1 unchanged and running — not restarted` — the agent was **already installed** before this
    deploy (by the earlier deploy in Step 3).
  - `ssh-alerts: installed for box 'game-dev' (token: stdin; fail2ban jail: sshd)` · `OK  ssh-alerts — agent installed
    for game-dev`
  - sshd checks all ✅, `OK  sshd — password login off, root key-only`
  - `GAME HOST SETUP: OK`, final banner `✅ GAME HOST SETUP OK (root step: SSH security alerts + sshd hardening up to
    date)`
  - ⚠️ **Exit code not printed.** "Exit 0" is an **inference**: the OK banner prints only on success (a failed setup
    exits 3 with a "HOST SETUP NOT DONE" banner).
- **Game prod: still unconfirmed from git.** There is no game deploy tag today; the last game tag is `0.0.164`
  (2026-10-13). A same-version `./deploy.sh prod` leaves no git trace, so git can neither confirm nor rule out a deploy
  today. This matches Step 3's **NOT deployed**. Game prod stays in the weekend slot, with `0452`.

Nothing above changes "Still open (updated)". Status unchanged: `🔲 Backlog`.
