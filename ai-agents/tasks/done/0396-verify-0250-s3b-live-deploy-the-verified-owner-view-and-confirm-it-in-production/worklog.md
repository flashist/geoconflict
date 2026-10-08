# 0396 — worklog

## 2026-10-07 — rehearsal of the owner's live check (§4), BEFORE the S3b deploy

**Not the verification.** S3b is not live: production profile is `0.0.156-profile.3` (commit `71efd10`, `0340`
only; S3b deliberately excluded — `0395` worklog). Every session gets the S1 view today, so these results prove only
that the steps work, not S3b's behaviour.

Steps: [`snippets.md`](snippets.md) (written in-session from the code — login contract, routes, projection; first run
was this rehearsal).

| Check | Run by | Result today | Meaning |
|---|---|---|---|
| 1 — verified paid account, Network → `v1/profile` → Preview | owner | no `is_paid_citizen` key | expected pre-S3b; steps work |
| 2 — Console snippet, unverified session | owner | `is_paid_citizen key present: false` | expected pre-S3b; snippet works in the game iframe on production |

- Side effect: one no-signature (`absent`) login added to the profile server's login counters on 2026-10-07, inside
  `0402`'s window.
- No token, id, response body or URL recorded here.

## Gates — state on 2026-10-07

1. `0340` deployed in an earlier slot — ✅ 2026-10-07T07:10:45Z (`0395`).
2. `0395` confirmed `vfy: true` live — ✅ 2026-10-07.
3. Owner's look at the post-`0391` numbers — **removed** by OWNER RULING 2026-10-07 (ADR-123); re-read for
   information only in `0402`.
4. Weekend slot — open.

## 2026-10-08 — gates, delta check, deploy, owner's live check, watch (Verification steps 1–6)

Recorded by `fkit-lead` in the owner's session. Owner-run deploys; read-only checks by `fkit-lead` under the owner's
approval given live via `AskUserQuestion` on 2026-10-08: *"Yes, read-only (Recommended)"* (read-only production
reads — game box, profile box, telemetry — for the rest of the session). Nothing was written on any server by the
lead.

### 1. Gates (all recorded before the deploy entry below)
1. `0340` in an earlier, separate slot — ✅ 2026-10-07T07:10:45Z (`0395`).
2. `0395` confirmed `vfy: true` live — ✅ 2026-10-07.
3. Owner's look at the post-`0391` numbers — **removed** by OWNER RULING 2026-10-07 (see the gate list above).
   For information, `0402`'s pre-deploy read was taken at ~06:29Z: stale **2.96 %** (237 / 7,998) over 23.3 h.
4. Weekend slot — **mid-week exception, owner's call** (Thu 2026-10-08; same kind as `0391` and `0340`). The owner
   asked for the walkthrough (*"I am ready for making the release. Walk me through the steps"*).
- S3b committed — ✅ `6f4ab77` (owner's commit), on `dev`.

### 2. Delta check (before the deploy, read-only git)
- **Profile paths** (`src/profile-server`, `src/core/profile`, `migrations`, `Dockerfile.profile`,
  `build-deploy-profile.sh`, `package.json`) from `71efd10` (the `0340` deploy) to the deployed commit: **two commits**
  — `6f4ab77` (`0250` S3b: `PublicProjection.ts`, `Routes.ts`, `LoginContract.ts`, `PlayerProfile.ts`) and `077c9e3`
  (`0332` join-token vouch: `SessionVouch.ts`, `Routes.ts`, `CreditContract.ts`, `Telemetry.ts`). Deployed commit
  `55598f2` adds only `0402`'s worklog on top. **No migrations changed.**
- **Rode along with S3b:** `0332`'s profile side (expected — its own verify task `0405`; same order rule, profile
  first). **Nothing unexpected.** The deploy was not stopped.
- Game image: 36 commits since `0.0.156` (`f712263`), including `0397`, `0248`, `0332` (game side), `0404`.
- Pre-flight: config parity `--enforce` exit 0 (REQUIRED 0 game/client/profile) · `npm run lint` exit 0 ·
  `npm test` 4190/4191 — 1 fail, `tests/profile-server/Routes.test.ts` *"GET /v1/profile resolves the caller from the
  token and strips paid fields"*, `socket hang up` (supertest flake family; no `SIGSEGV`, no new crash report); **that
  file re-ran 64/64.** Re-run stated, not hidden. `test:integration` not run.

### 3. Deploy

| | Profile server | Game client |
|---|---|---|
| Order | **1st** | **2nd**, after the owner's DevTools check (server-first, as the `0397` Q4 ruling requires) |
| Time (UTC) | deploy record **2026-10-08T06:41:41Z**; container started 06:42:15Z | container started **06:56:17Z** |
| Version / commit | `0.0.156-profile.4` / `55598f2` (tag pushed) | `0.0.157` / `c12cd8e` (*"DEPLOY prod: bump version to 0.0.157"*, tag pushed) |
| Image | digest `sha256:5a3b3c703b327ee0cf35548ffd47b4594e3aac3fc876fc30c5f8a094afa756d5` | tag `20261008-095100`, digest `sha256:42289f504150bbe931213c8da37fb1477ae2f127650f112364f993e05b4bc3bf` |
| Backup window | outside 02:00–03:15 UTC ✅ | n/a |
| **Rollback target** | **`0.0.156-profile.3`** (the `0340` image) — `sha256:ea35fe69b4721a8ddabb148218eb4b00ecd0f3ea4801bca0790bfd72a2883114`, **still on the box** (checked 2026-10-08) | **`20261003-123251`** (`0.0.156`) — **registry only**, the deploy pruned it from the box (runbook F-D); a rollback re-pulls it |

### ⛔ Rollback rules (written out in full)
- **Server S3b → `0340` (`0.0.156-profile.3`) is safe:** verified callers fall back to the S1 view, and the client
  fails closed.
- **But since the `0397` client is now live:** if the S3b server is rolled back, **also roll the game client back, or
  switch the `citizenship_ui` flag off** — otherwise every logged-in citizen sees *"We couldn't confirm your account
  this time…"* (OWNER RULING on `0397` Q4, 2026-10-06).
- **Client rollback is safe** for the server: the old client strips the new keys. ⚠️ It rolls back **every** task in
  the game image (`0397`, `0248`, `0332` game side, `0404`, …), and `0248`'s ad gate rule (`0397` R3) means the S3b
  server must not stay live with a client lacking `0397` — so a client rollback also needs `citizenship_ui` off or a
  server rollback.
- **Never roll back past S2** (ADR-116) — never to a pre-S2 profile image.

### 4. Owner's live check (DevTools) — 2026-10-08, between the two deploys
- **Verified paid account → `is_paid_citizen: true`** — ✅ **yes** (owner, screenshot of the field only).
- Verified earned account → `is_paid_citizen: false` — ✅ (extra check by the owner: paid and earned are now told apart).
- **`vfy:false` session → S1 view (no `is_paid_citizen` key)** — ⚠️ **not checked live yet.** Both owner accounts
  were verified. [`snippets.md`](snippets.md) Check 2 can produce an unverified session; if not run, record this half
  as *not checked live — covered by the integration suite*.
- No token, id, response body or URL recorded.

### 5. Watch (read-only), read ~07:00Z
- **Profile:** `/health` → `0.0.156-profile.4` / `55598f2` · `/ready` 200 (0.15 s) · `profile-api` healthy, restarts 0,
  postgres untouched (up 4 days) · log since start: 11 lines, **0 `error`, 0 `warn`**.
- **Logins on `.4`** (06:42:30–07:00Z, ~18 min): `ok` 196, `stale` 11 (5.3 % — tiny sample), no `id_mismatch`, no
  `bad_*`. Login requests: existing 205, created 4. Counters restarted at 06:41:41Z — `0402`'s piece 2 starts here.
- **`0332` vouch counter** (`resolve_vouch`, since the profile deploy): `verified` 43, `absent` 84 (no token — old
  client before 06:56Z, and guests); **no rejected/invalid outcome.** Early sign only — the real read is `0405`.
- **Game:** container Up on `20261008-095100`, restarts 0 · `failed after retries` **0** · `dropped` **0** · level
  `error` **0** · 43 `warn`: 41 *"Invalid message before join: intent"* and 2 *"players/resolve request failed
  (attempt 1/3): TimeoutError"*, **all at 06:57Z** — the restart minute (clients reconnecting); none after · nginx
  `connect() failed (111)` lines only at 06:56–06:57Z (workers starting) · a public lobby with players is up.
- ⚠️ **`credited` lines: 0 so far** — only ~4 min since the game restart, so no match had ended yet. **Re-check later**
  for at least one `match credit results: … credited` line.

### Still open
- The `vfy:false` half of the live check (above).
- The `credited` re-check.

### 5b. Watch re-check ~07:02Z (read-only)
- **`credited`: first line at 07:02:06Z** — `… credited, 0 duplicate, 0 no_profile, 0 error`. Credits flow on the new
  game image. `failed after retries` **0**, `dropped` **0**.
- 5 more `warn` after the restart minute, all *"Invalid message before join: hash"* (07:00–07:01Z). **Pre-existing,
  not new:** Uptrace logs show *"Invalid message before join"* every day before the deploy (≈6,300–23,600 a day,
  2–7 Oct). `0332` changed the line to log the message type only, which is why the `: hash` / `: intent` suffix is new.
- ✅ "Still open" above: the `credited` re-check is **done**. Left open: the `vfy:false` half of the live check.

### 6. Owner's live check, part B — `vfy:false` session → S1 view (2026-10-08)
- Run by the owner with [`snippets.md`](snippets.md) Check 2, in the game iframe's Console, on production (game
  `0.0.157`, profile `0.0.156-profile.4`).
- **Result: `is_paid_citizen key present: false`** — ✅ **pass** (an unverified session gets the S1 view). Run at about
  07:28:29Z.
- ⚠️ **Side effect of a first attempt (07:27:11Z):** the owner ran the snippet without replacing the placeholder, so
  it logged in with the literal placeholder text `PASTE_ID_HERE` as the player id. The server **created a new, empty
  player row** under that placeholder (the snippet's own guard caught it and printed its *"WRONG ID"* warning). Not a
  real player's id; 0 XP, no citizenship. **Left in place — no production write was made to remove it** (deleting it
  would be a DB write and is the owner's call). It adds +1 to the profile server's player count.
- Both runs added one no-signature (`absent`) login each to the login counters (inside `0402`'s piece 2).
- No token, id, response body or URL recorded.

### Verification steps — state after this entry
1 gates ✅ · 2 delta check ✅ · 3 deploy ✅ · 4 watch ✅ (incl. the `credited` re-check) · 5 owner's live check ✅ both
halves (paid verified → `true`; `vfy:false` → no key) · 6 no secret leaks ✅. **Ready to close.**

## 2026-10-08 — close

Closed `✅ Done (agent-closed — not owner-verified)` by a spawned `fkit-producer` (no owner channel, ADR-021/037) via `/fkit-task-done`, on the OWNER RULING given live 2026-10-08 in the `fkit lead` session, relayed by `fkit-lead`, verbatim *"Close them"*. The owner ran the live checks; the close itself is agent-run, hence the marker.
- Nothing in this worklog contradicts the close: verification steps 1–6 are recorded above.
- Carried, not resolved: the empty player row created under the snippet's placeholder id (§6) is still in the production DB — removing it is a DB write and the owner's call.
