# Verify 0443 on the boxes — deploy the SSH security alerts and watch them for two days

## ID
0449

> ℹ️ **ID allocation, checked 2026-10-12 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/` (folder
> names and `## ID` fields agree, base-10 arithmetic) was `0448`. `0449`: no task folder, no reference in
> `ai-agents/tasks/`, `ai-agents/sprints/` or `.claude/`, and no `tasks/*/0449*` path in any branch's history.

## Sprint
Sprint 8

> 📌 **OWNER RULING, 2026-10-12, given live via `AskUserQuestion` in the `fkit lead` session** (driver of
> `fkit-sprint-ship-loop`), relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037);
> ⛔ **not producer precedent.** Verbatim selection: **"Close; verify task in Sprint 8 (Recommended)"** — option text:
> *"Same as 0441: 0443 closes now (agent-closed, not owner-verified); a producer files one verify task on Sprint 8 with your
> deploy + 2-day observation steps. Mid-week deploys fine."*
>
> ⚠️ **This explicitly bends, for this case only, the standing build/verify-split rule (owner ruling 2026-09-29)** that a
> verify task goes to the top of the **next** sprint — as the same ruling did for `0441` → `0445`. Not a change to the
> standing rule.

## Priority
42

⚠️ **Priority 42 is append rank, NOT a merit ranking** — ~~flagged for owner confirmation~~. ✅ **Merit order OWNER-CONFIRMED 2026-10-15** (live `AskUserQuestion` in the main session, relayed by the main session to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent; verbatim *"Confirm that order (Recommended)"*): **`0452` → `0462` → `0449`/`0450` near the top, and `0219` near the top for its deadline.** Rank number unchanged (ADR-035). See the 2026-10-15 four-rulings addendum on the [Sprint 8 board](../../../sprints/plan-sprint-8.md).
**On merit this belongs directly below `0445`**, because its game-box steps cannot pass until `0445` has installed the
game key for `root` (see *Context*). ADR-035 forbids inserting a new row above closed rows, so it appends after the
highest (41, `0445`). Its profile and telemetry steps do not wait on `0445`.

## Status
🔄 In progress — 2026-10-16, OWNER RULING (live `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent); verbatim *"Mark it In progress (Recommended)"* to *"0449 (SSH alerts: deploy, then watch them for two days) is mostly done, but its status still says "Backlog". Should a producer mark it "In progress" on the board and in its brief?"*. Work started 2026-10-15: steps 1–7 and 10 done for profile, telemetry and game dev. Left: game prod deploy in the weekend slot (with `0452`), then its steps 4–5; daily digest 2 of 2 (2026-10-17 08:10 UTC); the 24 h no-per-guess window; the per-box report-window check. Details: `worklog.md`.

*(Status until 2026-10-16, kept as history:)* ~~🔲 Backlog~~

## Owner
fkit-producer — ⚠️ **EXECUTED BY THE OWNER (human).** Creating the token, the allow-list change, the commit, every
deploy, the test logins, the fail2ban stop/start and the "Telegram unreachable" test are the owner's hands. **Read-only**
checks (`command -v`, `systemctl is-active`, `logrotate -d`, reading the agent's own log, the tracked-file grep) may be
run by an agent session **with the owner's OK given in-session** (standing rule: read-only checks are run, not handed
over).

*(The field names the accountable fkit seat, because the owner vocabulary admits no person — same form as `0445`.)*

## Context

**In plain terms.** `0443` built SSH security alerts in the repo: every successful SSH login, fail2ban stopping, and a
daily count of guesses and bans, for all four boxes (game prod, game dev, profile, telemetry), delivered to the Alerts
topic of the operator Telegram group through the profile box. It closed **without anything run on any box** — no deploy,
no commit. This task deploys it and watches it work for two days.

**The build:** [`0443`](../../done/0443-ssh-security-alerts-to-telegram-on-all-three-boxes-logins-fail2ban-down-daily-counts/brief.md)
— its `plan.md` §(b) steps 1–6 and the owner decisions appended to it are the source of this brief; `worklog.md` holds the
box inventory, build, decision logs and checks; `review.md` (closed-out) holds the accepted residual. The runbook is
`docs/vps-deployment-guide.md` **§8 *SSH Security Alerts*** (what each message means, how to test, the off switches).

**How it reaches each box** (no hand-made files on any box):
- **Profile** — `npm run deploy:profile` installs the agent, the route that receives events, and the 08:10 UTC digest.
- **Telemetry** — `npm run deploy:telemetry` installs the agent; its relay address is derived from
  `TELEMETRY_ALERT_PROBE_URL`. A value of any other shape **skips** the install with a warning, and the deploy still
  succeeds — so read the deploy output, don't assume.
- **Game prod / game dev** — every game deploy runs a new **root step** (`setup-game-host.sh`) over one root login by
  key, **after** the game container is up.

🚨 **Read before the first game deploy — owner ruling Q-A1 (2026-10-12): any game deploy whose root step is not OK exits
with code 3.** The game IS live by then; the banner says **"GAME IS DEPLOYED — HOST SETUP NOT DONE"** with the reason.
"Not OK" includes SKIPPED. So, once `0443` is committed:
- **Until [`0445`](../../done/0445-verify-0441-on-the-boxes-install-the-ssh-keys-prove-key-only-login-and-deploy-over-the-key/brief.md)
  installs the game key for `root` on a game box, every deploy to that box exits 3.** There is no skip switch (owner ruling
  Q-A2, *"No switch"*). The password path never logs in as root, so it always reads SKIPPED → exit 3.
- A blank `PROFILE_SSH_ALERT_TOKEN` or a blank `PROFILE_API_URL` also exits 3. **Game dev's `PROFILE_API_URL` value is
  unknown** (`0443` worklog, *Not verified*) — check it is set before the first dev deploy, or every dev deploy exits 3.
- `build-deploy.sh` has already bumped, committed, tagged and pushed by the time `deploy.sh` runs, so an exit 3 there means
  "this release is live, host setup is not done" — **not** a release that failed. Fix the cause and deploy again.
- ⚠️ **Interaction with `0445`.** `0445` step 7 commits `0441`'s changes before its proof deploys, and `0443`'s changes sit
  in the same working tree (they share `deploy.sh`). If both are committed together, `0445`'s game proof deploys will also
  run this root step: with the root key installed (`0445` step 4, before its step 8) and the token + `PROFILE_API_URL` set,
  they read OK; otherwise they exit 3 after the game is live. The owner decides the order; doing this task's step 1 before
  `0445`'s proof deploys avoids the surprise.

**What this task does not need:** no new bot, topic, or Telegram-proxy allow-list change — only the profile box talks to
Telegram, and it is already allowed (telemetry is not on the proxy list and does not need to be).

**Accepted residuals — known, not defects:**
- **Fake login alerts are possible; a hidden login is not** (review R6, owner ruling 2026-10-12 *"Accept as known limit
  (Recommended)"*). The watcher trusts the journal's `SYSLOG_IDENTIFIER`, which any local account can set. A fake alert
  from a local account is noise; a real login always alerts. Re-raise only per `0443` `review.md` *Accepted residuals*.
- **Nothing pages if the daily digest stops arriving.** The digest writes a marker on success, but no check reads it yet —
  owner ruling Q8 *"Marker now, check later"*: a follow-up after `0219`. Until then, a missing digest is noticed only by
  a person noticing it.
- The game root step runs only on a deploy: a rebuilt or restored game box is uncovered until its next deploy (the digest
  shows it as `NO REPORT`).

## What to build

*(Nothing in the repo. Every step is a check or an owner action. A defect found here is filed as its own task.)*

1. **Owner set-up (`0443` plan §(b) 1–2).**
   - Create the token once (`openssl rand -hex 32` — hex only, so it can never contain the `'` the telemetry deploy
     refuses). Put the **same value** in the gitignored `.env.secret` (game), `.env.profile.secret` and
     `.env.telemetry.secret`. Never anywhere tracked.
   - Add game dev's outbound address to `PROFILE_INTERNAL_ALLOW_IPS` (the inventory saw game dev get **403** on the
     profile box's `/internal/` path). It takes effect with the next profile deploy.
   - Make sure game dev's `PROFILE_API_URL` is set (see *Context*).
2. **Commit** `0443`'s changes (with `0441`'s, per `0445`) — the owner's commit; no agent commits unprompted.
3. **Deploy in this order** (mid-week is fine by ruling): profile → telemetry → game dev → game prod.
   - Profile and telemetry: the output shows the SSH alerts section **installed**, not skipped.
   - Each game deploy: the final banner reads **`GAME HOST SETUP OK`** and the deploy exits 0. (Before `0445` it will
     read SKIPPED and exit 3 — expected, see *Context*.)
   - A game box deployed before the profile route existed still delivers: its events wait in its spool and arrive once
     the route is up (within 24 h).
4. **Per-box sanity, read-only, all four boxes** (one ssh session per box): `geoconflict-ssh-alerts test` prints
   `OK: test event delivered` and a `🧪` message arrives (any HTTP code instead — read runbook §8 *Test it on purpose*);
   the `geoconflict-ssh-alerts` service is active; `logrotate` is installed and `logrotate -d` accepts
   `/etc/logrotate.d/geoconflict-ssh-alerts` (review fix R8 **assumes** logrotate is present — the inventory did not check);
   the real `flock` is present and the agent's log shows no overlapping 5-minute ticks (review fix R5 relies on it).
5. **Login alert** — one test login per box (owner), from a fresh terminal: one `🔑` message within a minute, showing box,
   user, `by key`/`by PASSWORD`, UTC time, and the source **masked to the first two parts of the address plus a provider
   hint** — never the full address.
6. **"Telegram unreachable" test, game dev only** (owner; runbook §8): point the URL stored in
   `/etc/geoconflict-ssh-alerts/ssh-alerts.env` at nothing, log in, **time the login**, restore the URL. The login must
   not be slowed; the held alert should then arrive within about 5 minutes of the restore.
7. **fail2ban down/back** — on game dev or the profile box (owner): `systemctl stop fail2ban`, wait up to 10 minutes for
   `🚨 fail2ban DOWN`, start it, wait up to 5 minutes for `✅ fail2ban back`.
8. **Two days of digests** (`🛡 SSH security · daily`, 08:10 UTC). Each day: one line per box with real numbers (or a
   spelled-out `UNREADABLE` / `partial` / `first-day`, never a silent 0). Three boxes run on Moscow time and the profile
   box on UTC — check every box's report window is the 24 h before **08:00 UTC**, not 08:00 local. On a normal day there is
   **no** `⚠️ N SSH alert message(s) could not be sent` line and **no** `⚠️ OLD numbers` flag; if either appears, record
   why (that is the line doing its job, not a failure of this check).
9. **24 hours with no per-guess messages** — the boxes take thousands of failed guesses a day; none of them may produce a
   message.
10. **Tracked-file check** — nothing written for this task, and no tracked file, holds an address, host, token or chat id.

**Out of scope:** installing the root key (`0445`); password login off (`0442`); moving game secrets off the ssh command
line (`0444`); fail2ban/sshd from scripts on the game boxes (`0446`); the digest-stopped page (Q8 follow-up after `0219`);
the R6 stricter journal filter (accepted residual).

## Verification steps

1. Worklog records step 1 done (variable **names** only, no values) and the commit id from step 2.
2. Each of the four deploys recorded (date, version/tag): profile and telemetry show the agent installed; both game
   deploys show `GAME HOST SETUP OK` and exit 0.
3. Step 4 recorded per box: test event delivered; service active; `logrotate` present and the config accepted; `flock`
   present and no overlapping ticks seen.
4. Each of the four boxes produced its `🔑` message within a minute of a test login, source masked as ruled (quote with the
   masked part only, or a screenshot with nothing more than that visible).
5. The game dev "Telegram unreachable" login took no visible extra time (time recorded), and the held alert arrived after
   the restore.
6. fail2ban `DOWN` then `back` messages seen on at least one box (which one recorded).
7. Two consecutive daily digests recorded, all four boxes present, window correct on the Moscow-time boxes; any
   failed-sends or OLD line explained.
8. A 24 h window recorded with **zero** per-guess messages.
9. Step 10 grep clean.

## Notes
- **Depends on:** 0443, 0445, 0452 (its pre-checks P1–P4 only, and only for this task's game and telemetry deploys — the profile-box steps may run first; not its close)
- **Why `0452` (added 2026-10-13; narrowed 2026-10-13 — profile-box steps carved out, see the next bullet):** once
  `0442`'s code is committed, any key deploy of a game box or the telemetry box turns SSH password login off — this
  task's game and telemetry deploys included. So those deploys wait for [`0452`](../0452-verify-0442-on-the-boxes-pre-checks-then-turn-password-login-off-on-game-dev-and-telemetry-now-game-prod-in-the-weekend-slot/brief.md)'s
  **pre-checks P1–P4** (web-console root login proven on all three boxes; keys + passphrases and root passwords in the
  password manager; the read-only sshd/fail2ban check). It does **not** wait for `0452` to close — `0452`'s game prod
  half waits for the weekend slot, and this task must not be stuck behind it. Once P1–P4 have passed and `0452`'s
  terminal A (its step 1) is kept open for that box, a deploy made for this task **may count as `0452`'s deploy for
  that box** (`0452` *Context*). OWNER RULING 2026-10-13, live `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned
  `fkit-producer` (no owner channel); ⛔ not producer precedent. Verbatim: *"Yes, make them wait (Recommended)"* —
  option text: *"Add 0452 to 0449's and 0450's 'Depends on'. Tiny edit, easy to undo. Their deploys can still count
  as 0452's deploy for that box once the checks pass."*
- **Profile-box carve-out (2026-10-13):** this task's **profile-box steps** — the profile deploy in step 3 (first in the
  deploy order) and the profile box's own checks in steps 4, 5 and 7 — **may run before `0452`'s pre-checks P1–P4**.
  `0442`'s password-off change never touches the profile box (`setup-profile.sh` is untouched; the profile box's own
  hardening is `0221`'s). **The telemetry, game dev and game prod deploys — and every check on those boxes — still
  wait for P1–P4.** OWNER RULING 2026-10-13, live `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`
  to a spawned `fkit-producer` (no owner channel); ⛔ not producer precedent. Question: *"0449's first step only deploys
  the profile server, which 0442's password-off change never touches. Should that one step be allowed to go ahead
  before 0452's safety checks, or should all of 0449 wait?"* Verbatim selection: *"Let the profile step go first
  (Recommended)"* — option text: *"Only 0449's profile-box step may run before 0452's checks; its game and telemetry
  deploys still wait. Small brief edit."*
- **Blocks:** nothing.
- `0445` is needed only for the game boxes (root key). Steps 1–4 for profile and telemetry, and their login/digest checks,
  can run before `0445` is done. ⚠️ **Since 2026-10-13 the telemetry deploy (and every game deploy) also waits for `0452`'s
  pre-checks P1–P4** — see the *Why `0452`* bullet above. The profile box is not touched by `0442`, so its steps do
  **not** wait for P1–P4 (profile-box carve-out bullet above, owner ruling 2026-10-13).
- Covers `0443`'s verification steps 2–6 and 8, which `0443` closed without (`✅ Done (agent-closed — not
  owner-verified)`); its steps 1 (inventory) and 7 (`npm test` green, harness registered) were met at close.
- If a deploy, the test event, or the login alert fails on a box, **stop that box**: read the HTTP code meanings in
  runbook §8, fix forward as a new task or ask the owner. Emergency off: runbook §8 *Switch it off*.
- Sources: `0443` `brief.md`, `plan.md` (§(b), owner decisions, Q-A1/Q-A2/Q8, inventory findings), `worklog.md` (Step 1,
  *build-deploy.sh … exits non-zero*, *Not verified*, review-round notes), `review.md`; `docs/vps-deployment-guide.md` §8;
  `0445` `brief.md` — all read 2026-10-12.
