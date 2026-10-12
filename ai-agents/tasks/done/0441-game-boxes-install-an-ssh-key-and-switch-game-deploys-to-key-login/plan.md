# Plan — 0441: SSH key login for the game boxes (dev, prod) and the telemetry box

**Planning only. I wrote no files, edited no source, and ran nothing on any remote box.** I read the brief,
deploy.sh, build-deploy-telemetry.sh, build-deploy-profile.sh (the model), scripts/telemetry-tunnel.sh,
example.env, example.env.telemetry, docs/vps-deployment-guide.md, tests/scripts/profile-deploy-hardening.test.sh,
tests/scripts/ConfigParityCallSites.test.ts, the 0442/0015/0047 briefs, and the wiki pages
deployment-credential-hardening and hardening-harness-speedup (task 0371).

## Summary
- The repo change is small: two gaps in `deploy.sh` (`sshpass -p` → a 0600 file used with `sshpass -f` and removed
  on exit; `IdentitiesOnly=yes` on the key path), plus one gap in `build-deploy-telemetry.sh` (`IdentitiesOnly=yes`).
  The fix copies `build-deploy-profile.sh` exactly.
- **Found one more script the brief did not name:** `scripts/telemetry-tunnel.sh` (`npm run telemetry:tunnel`) logs
  into the telemetry box and has **both** gaps (`sshpass -p` at :77, no `IdentitiesOnly` at :64). Recommend including
  it (Q5).
- **There is a trap in the proof.** The key path does not turn off password prompts. If the box rejects the key, ssh
  falls back to an interactive password prompt. If the owner types the password, the deploy succeeds and the log shows
  **no** fallback line, so the brief's "no fallback line" test cannot catch it. The plan adds two proof criteria: no
  password prompt appears, and the box's auth log shows `Accepted publickey for <user>`.
- **Something that already exists outside this task (not fixed here):** `deploy.sh` puts every game secret
  (DOCKER_TOKEN, STORAGE_SECRET_KEY, PROFILE_INTERNAL_TOKEN, OTEL_PASSWORD…) on the ssh **command line**, which
  `ps` can show on the operator's Mac (the script admits this at :89). For verification step 4, the `ps` check must
  print **counts only, never lines**. Pasting `ps` output would leak secrets. Follow-up is Q8.
- Proposed split under the 2026-09-29 rule: 0441 closes on code, tests, runbook, the box inventory, the key installed
  and a key-only `ssh` login proven. None of that is a deploy. A new **verify task** holds the real deploys at the
  weekend slot (Sat–Sun 2026-10-17/18), and 0442 then depends on the verify task. Where to file the verify task is Q6.

## (a) Coder — repo work

### A1. `deploy.sh` auth block (current lines 319–340)
- Set `SSH_PASSWORD_FILE=""` before the branch. The script loads `.env*` with allexport, so a value inherited from
  those files must never reach the cleanup `rm` (same lesson as telemetry review R1 / harness T54).
- Key path: `SCP_CMD=(scp -o IdentitiesOnly=yes -i "$SSH_KEY_PATH")` and the same for `SSH_CMD`. Add a comment that
  carries over the profile script's self-ban reason (MaxAuthTries 6 + fail2ban).
- Password path (only when there is no key AND the flag is set; that gating is unchanged):
  `SSH_PASSWORD_FILE=$(mktemp); chmod 600; printf '%s\n' "$SSH_PASSWORD" > file` → `sshpass -f "$SSH_PASSWORD_FILE"`
  for scp and ssh. Then `trap 'rm -f "$SSH_PASSWORD_FILE"' EXIT` plus `trap 'exit 130' INT` and `trap 'exit 143' TERM`
  (the profile pattern, so a Ctrl-C still cleans up). deploy.sh has no other traps today, so nothing conflicts.
- Nothing else changes: key wins when both are set; password needs `ALLOW_SSH_PASSWORD_FALLBACK[_<ENV>]`; same
  messages, same "deprecated" warning.
- Considered, **not** done: adding `PasswordAuthentication=no` or `BatchMode=yes` on the key path. It would make the
  proof trap above impossible, but it changes behaviour beyond the brief and could break a current deploy that relies
  on the typed prompt. Say if you want it.

### A2. `build-deploy-telemetry.sh` key path (lines 299–301)
- `SCP_CMD+=(-o IdentitiesOnly=yes -i "$SSH_KEY_PATH")` and the same for `SSH_CMD`. Same comment. Nothing else; the
  password path is already file-based.

### A3. `scripts/telemetry-tunnel.sh` — only if Q5 = yes
- Same two fixes: `IdentitiesOnly=yes` on the key path, and `sshpass -f` with a 0600 file plus EXIT/INT/TERM traps in
  place of `sshpass -p` (the tunnel runs in the foreground until Ctrl-C, so the INT trap matters here).

### A4. Tests — in `tests/scripts/profile-deploy-hardening.test.sh`
The harness header says new deploy checks belong there, and it already has argv-recording ssh/scp/sshpass stubs and a
0600-mode probe. **Follow 0371's lesson:** use the shared stubs through `NEW`/`TNEW` and write no new executables
per test. Each executable written per test costs about 0.2–1 s on macOS and once pushed the harness past its 150 s
deadline.
- New driver `run_game_deploy` (shaped like `run_telemetry_deploy`). It copies the real `deploy.sh` into
  `$WORK/grun` and adds:
  - an empty `update.sh` (scp'd, never run);
  - a stub `scripts/check-config-parity.mjs` that exits 0;
  - a stub `scripts/check-config-values.mjs`: `--list-sources` prints one name, and `--values-stdin` reads stdin to
    the end and exits 0.
  It uses `env -i` with an allow-list: PATH, HOME, TMPDIR, `SERVER_HOST_DEV=203.0.113.30` (a documentation
  address), DOCKER_USERNAME/REPO, then `"$@"`. With no `.env*` in the run directory, none of the operator's real env
  files can load.
- T60 key path: exit 0; every ssh/scp argv line carries `-o IdentitiesOnly=yes` and `-i <key>`; sshpass never runs;
  out.log has no "password-based SSH fallback".
- T61 password path (flag set, no key): exit 0; sshpass used `-f`, never `-p`; the file was mode 600 on every use;
  `$SECRET_PW` (the harness's test password, which has spaces and special characters) is in no argv file and not in
  calls.log; the file is gone after success; the deprecation warning printed.
- T62 password path with `fail_deploy`: rc ≠ 0, and the password file was still removed.
- T63 password with no flag: rc 1, "disabled by default", no ssh/scp/sshpass call.
- T64 key and password both set (the post-0441 env shape): key path used, no sshpass.
- T65 key path with an inherited `SSH_PASSWORD_FILE` decoy: the decoy survives (mirrors T54).
- Structural checks: `deploy.sh` contains no `sshpass -p`, and its key branch has `IdentitiesOnly=yes` on both commands.
- Telemetry T55: in the default key-path `run_telemetry_deploy`, **every** ssh/scp argv line (including the preflight
  ssh) carries `IdentitiesOnly=yes`. Plus the structural key-branch count = 2 (the profile check's awk works as-is,
  because telemetry's branch is `if [ -n "$SSH_KEY_PATH" ]; then`). Already checked that T41–T54's argv parsing (e.g.
  :2897's staged-env source extraction) is not broken by the extra `-o`.
- Tunnel (if Q5): one driven run on the password path (the ssh stub exits at once), checking `-f`, mode 600, the
  file removed, and no `-p`. Plus a structural `IdentitiesOnly` check.
- Update the harness header: deploy.sh's auth block (and the tunnel) are now covered; build.sh and build-deploy.sh
  are still not.
- **Red first:** add the tests before the script fixes and record that T60, T61, T55 (and the tunnel test) fail, so
  the worklog shows the tests catch the gaps.
- `ShellHarnesses.test.ts`: no change expected (the `ALL PASS` marker is unchanged). `ConfigParityCallSites.test.ts`
  drives deploy.sh too and asserts calls `["scp","ssh"]`. The key path keeps that, so it must stay green.
- Watch the harness wall time and record it before and after (about 6–8 new driven runs, each about 2 node
  starts). The 150 s deadline is the limit.

### A5. Runbook — `docs/vps-deployment-guide.md`
This is where the game deploy is documented today (README §Deployment links to it). The telemetry deploy has no doc
beyond the comments in `example.env.telemetry`, so it goes in the same file. New section *"SSH keys for deploys
(game dev/prod, telemetry)"*:
- Create: `ssh-keygen -t ed25519 -a 100 -f ~/.ssh/geoconflict-game -C geoconflict-game-deploy`, and the same for
  `geoconflict-telemetry` (Q1). Add to the agent with `ssh-add --apple-use-keychain`. In `~/.ssh/config`, set
  `UseKeychain yes` and `AddKeysToAgent yes`; never set `IdentitiesOnly` globally. Keep the `.pub` next to the
  private key: with `IdentitiesOnly` + `-i`, ssh uses the copy in the agent only if the `.pub` is there. Otherwise it
  asks for the passphrase on every connection (2 for deploy.sh, about 4–5 for telemetry).
- Where the private half lives: the operator's Mac `~/.ssh/`, passphrase in the macOS keychain. Name the place,
  never the contents. Never in the repo, a task file or a wiki page.
- Install, once per box and user: `ssh-copy-id -i ~/.ssh/<key>.pub -o IdentitiesOnly=yes <user>@<host>` (password
  login is still on, so this works). `IdentitiesOnly` keeps it to one failed key try, not one per agent key.
- Check, from a fresh terminal: `ssh -i <key> -o IdentitiesOnly=yes -o PasswordAuthentication=no -o
  KbdInteractiveAuthentication=no <user>@<host> true`.
- Env: `SSH_KEY_DEV` / `SSH_KEY_PROD` (they beat a shared `SSH_KEY` in `.env`), and `TELEMETRY_SSH_KEY`. Keep the
  password values until 0442.
- How to tell the deploy used the key: no fallback line **and no password prompt**. If a prompt appears, the key was
  rejected: press Ctrl-C and do not type the password.
- Fall back (until 0442): comment out `SSH_KEY_<ENV>` and set `ALLOW_SSH_PASSWORD_FALLBACK_<ENV>=1`.
- Replace or rotate a key: add the new one, verify it, then remove the old line from `authorized_keys`, box by box.
- Self-ban: what a fail2ban ban looks like, and how to recover (wait out the ban time, or unban from another session
  or the provider console).
- No host, address, key contents or password anywhere in the section.
- Small related edits: `example.env.telemetry` `TELEMETRY_SSH_KEY=~/.ssh/id_rsa` → `~/.ssh/geoconflict-telemetry`;
  `example.env` already has commented `SSH_KEY_DEV/PROD`. In `CLAUDE.md`'s harness section, add `deploy.sh` (and
  the tunnel) to the list of files whose edits can turn `npm test` red.

### A6. Verify the repo work
- `bash -n` on every changed script; the targeted runs `bash tests/scripts/profile-deploy-hardening.test.sh` and
  `npm test -- tests/scripts/ShellHarnesses.test.ts tests/scripts/ConfigParityCallSites.test.ts` (no lock);
  then **one** full `npm test` (it takes the project lock, about 5 min at 1 worker; check first that no other full
  run is going).
- Then a stateful review by `@fkit-reviewer`. No commit unless the owner asks.

## (b) Owner — by hand
1. Answer Q1–Q3 and Q5–Q8.
2. Create the key(s) and load them into the agent/keychain (runbook).
3. Install the public half on each box in scope: game prod and dev for the deploy user (default `openfront`; step 1
   confirms it), plus root if Q2 = key-only root; telemetry for root (its deploy logs in as root). One
   `ssh-copy-id` per box and user. If "Permission denied" with the correct password happens again (the unexplained
   problem from 2026-10-10), wait, retry **once**, and note it in the worklog. Do not hammer the box: fail2ban.
4. Key-only login check (verification 2) for each box and user, from a fresh terminal.
5. Point the env files at the key (`SSH_KEY_DEV`, `SSH_KEY_PROD`, `TELEMETRY_SSH_KEY`). Leave the passwords in place.
6. **Commit the 0441 changes before the proof deploys.** `build-deploy-telemetry.sh` refuses to deploy if its shipped
   files are dirty, and the 0441 change edits one of them (`TELEMETRY_SHIPPED_PATHS`, :117). `./build-deploy.sh prod`
   commits and pushes the **whole** working tree, so uncommitted 0441 changes would be swept into a release commit.
7. Proof deploys (verify task, weekend slot):
   - Game dev: `./deploy.sh dev <tag running now>` re-deploys the same version, so no product change.
   - Game prod: ride the normal weekend game release if there is one; otherwise
     `./deploy.sh prod sha256:<running digest>`.
   - Telemetry: one `npm run deploy:telemetry` (it will create its normal `-telemetry.N` tag).
   - For each: no fallback line, no password prompt. Record date and version.
8. Check that the fallback still works, on dev (verification 4). Temporarily comment out `SSH_KEY_DEV`, set the flag,
   and deploy. While the remote step runs, in a second terminal run
   `ps -axww -o args= | grep '[s]shpass' | grep -c -- ' -p '` (must be 0) and the same with ` -f ` (must be ≥ 1).
   ⚠️ **Counts only — never print or paste the matching lines.** They contain the ssh command, which carries the game
   secrets (the existing problem in the Summary). Then restore `SSH_KEY_DEV`.

## (c) Agent — read-only over SSH, only with the owner's OK given in the session
- **Step 1 inventory: one ssh session per box** (fewer logins means less fail2ban risk and fewer chances of the
  intermittent denial), all commands in one batch:
  - `. /etc/os-release; echo $PRETTY_NAME`;
  - `sshd -T` filtered to permitrootlogin, passwordauthentication, kbdinteractiveauthentication,
    pubkeyauthentication, authenticationmethods, maxauthtries, maxstartups, authorizedkeysfile,
    allowusers/allowgroups/denyusers, usepam;
  - the same with `-C user=root,host=check,addr=203.0.113.1` and with `-C user=<deploy user>,…`, so a `Match` block
    shows up (⚠️ a `Match Address` for the owner's real IP would not show with the documentation address; record
    that limit);
  - `grep -n '^\s*Match' /etc/ssh/sshd_config /etc/ssh/sshd_config.d/*`;
  - for root and the deploy user: whether `authorized_keys` exists, its line count, and the mode of the home dir,
    `.ssh` and the file (`StrictModes` silently ignores a key under a group-writable home, which would look like
    "the key doesn't work");
  - `id <deploy user>`;
  - `systemctl is-active fail2ban`, and `fail2ban-client status sshd` filtered to the **count lines only** (the full
    output lists banned IPs);
  - which user and method the deploys log in with: `Accepted` lines from auth.log (or `journalctl -u ssh` where there
    is no auth.log) reduced to `method user` with `uniq -c`, so no IPs are printed.
  - Record it in the worklog: no addresses, no secrets.
  - ⚠️ Until the key is installed, the only way in is a password. If the agent session has no approved way to log in
    (the way the lead did on 10-10/10-12), the owner runs the same batch and pastes the address-free output.
- **Local inventory, names only (the owner's Mac, read-only):** `grep -ho '^[A-Z_][A-Z0-9_]*=' .env .env.secret
  .env.dev* .env.prod* .env.telemetry*` filtered to `SSH|VPS_LOGIN|VPS_PASSWORD|ALLOW_`. This prints variable
  **names**, never values, and tells us which path each deploy takes today. It matters because
  `example.env` / `example.env.telemetry` set `SSH_KEY=~/.ssh/id_rsa` / `TELEMETRY_SSH_KEY=~/.ssh/id_rsa` by default.
  The 65 "password for root" telemetry logins could be a typed prompt after a rejected key, not the fallback flag.
  It also flags the one way `IdentitiesOnly` could change today's behaviour: a dev box that accepts some *other*
  agent key would start prompting for a password.
- After each proof deploy: the same auth-log reduction, to confirm `publickey <user>` around the deploy time (over
  the key by then).

## Split under the 2026-09-29 rules (today is Mon 2026-10-12; the next weekend slot is Sat–Sun 10-17/18)
- **0441 (build) closes on:** A1–A6 done and reviewed; the step-1 inventory recorded; and, as Q6 recommends, owner
  steps (b)2–5 done, with the key-only `ssh` login proven on every box in scope. **None of that is a deploy**, so it
  can happen this week. It is also what the title promises ("key login works"). Close through `@fkit-producer` with
  the `(agent-closed — not owner-verified)` marker.
- **New verify task (the producer files it):** steps (b)6–8 plus the auth-log check (c). It records dates and
  versions, and whether the intermittent "Permission denied" came back. It runs at the 10-17/18 slot. **0442's
  dependency moves from 0441 to this verify task** (a producer edit).
- A prod deploy sooner would **not** reduce the bot risk. Password login stays on until 0442 either way, so waiting
  for the weekend slot costs no security.

## Edge cases / failure modes
- Interactive password prompt hiding a rejected key: handled by the proof criteria above.
- `StrictModes` with bad home or `.ssh` permissions: step 1 records them.
- A passphrase prompt on every connection: needs the agent/keychain and the `.pub` next to the key (runbook).
- Operator self-ban through extra key tries: the fix itself, plus `-o IdentitiesOnly=yes` on `ssh-copy-id`.
- An inherited `SSH_PASSWORD_FILE` deleted at exit: initialised to empty, and T65 tests it.
- Password file left behind on failure or Ctrl-C: EXIT/INT/TERM traps, tested by T62.
- Harness running past its 150 s deadline: shared stubs only; time recorded.
- Telemetry deploy refused on a dirty tree: commit first.
- `build-deploy.sh` sweeping uncommitted work into a release: commit first.
- A `Match Address` that `sshd -T -C` with a documentation address cannot reveal: recorded as a limit.
- Out of scope, unchanged: telemetry's `StrictHostKeyChecking=no`; deploy.sh's secrets on the ssh command line (Q8);
  removing the password code (task 0015, after 0442).

## Files (repo)
- /Users/mark.dolbyrev/Workspace/geoconflict/deploy.sh
- /Users/mark.dolbyrev/Workspace/geoconflict/build-deploy-telemetry.sh
- /Users/mark.dolbyrev/Workspace/geoconflict/scripts/telemetry-tunnel.sh (Q5)
- /Users/mark.dolbyrev/Workspace/geoconflict/tests/scripts/profile-deploy-hardening.test.sh
- /Users/mark.dolbyrev/Workspace/geoconflict/docs/vps-deployment-guide.md
- /Users/mark.dolbyrev/Workspace/geoconflict/example.env.telemetry (key-name example)
- /Users/mark.dolbyrev/Workspace/geoconflict/CLAUDE.md (one sentence in the harness section)
- Task folder `worklog.md`, written during the build (the driver writes `plan.md`).

---

## Owner decisions at approval (2026-10-12, live `AskUserQuestion`, `fkit-sprint-ship-loop` driver) — appended by the driver, not part of the plan text above

- **Plan:** *"Approve (Recommended)"*.
- **Q5 (telemetry tunnel):** *"Include it (Recommended)"* ⇒ A3 is IN scope.
- **Q6 (split):** free-text answer, verbatim: *"We probably will do deployed in the middle of the week, if ready to do so."* ⇒ the owner may deploy mid-week rather than wait for the 10-17/18 weekend slot. The close/split shape is **not yet ruled** — the driver re-asks at close time. Does not change A1–A6.
- **Q8 (game-deploy secrets on the ssh command line):** *"File backlog follow-up (Recommended)"* ⇒ out of scope for 0441; a producer files the follow-up.
- **Q1, Q2, Q3, Q7:** not yet asked; they govern owner steps (b), not the repo work A1–A6.

### Later owner decisions (2026-10-12, live `AskUserQuestion`, same driver session) — appended by the driver

- **Q1 (keys):** *"Two new keys (Recommended)"* — one new ed25519 key for the game boxes (dev + prod) and one for telemetry, each with a passphrase in the Mac keychain.
- **Q2 (root after 0442):** *"Root by key only (Recommended)"* — install the key for root on the game boxes too.
- **Q3 (game boxes):** *"Prod + dev (Recommended)"*.
- **Review R2 (no driven signal test):** *"Accept as is (Recommended)"* — record as an accepted residual: grep check + the reviewer's one-time manual signal test; re-raise only if the cleanup code changes or the harness gets a cheap way to make ssh slow.
