# Worklog — 0405 Verify 0332 live: identity counters, and no session token in the logs

Append-only. Never rewrite earlier entries.

## 2026-10-10 — the read: both counters, the login comparison, the `expired` share, and the log search

Run by: `fkit-coder`, spawned by `fkit-lead` on the OWNER's live instruction in the `fkit lead` session today
(*"it looks like you can do all the checks yourself, can't you? Just make the checks, tell me the numbers and ask the
question"*) — the owner's OK for these read-only production reads. Read-only on every server: `SELECT`s and log greps
only; nothing restarted, changed or written on any box. No source code written, nothing committed, no file moved,
`## Status` untouched. Queries ran 2026-10-10 ~08:30–08:45 UTC.

### Deploy facts (from git and the `0396` worklog — not re-measured)

| | Profile server | Game image |
|---|---|---|
| Version / commit | `0.0.156-profile.4` / `55598f2` | `0.0.157` / `c12cd8e` |
| Went live (UTC) | deploy record 2026-10-08T06:41:41Z; container started 06:42:15Z (re-confirmed today on the box) | container started 2026-10-08T06:56:17Z (`0396` worklog) |
| Carries | `0332` profile side (`077c9e3` is an ancestor — checked with `git merge-base`) | `0332` game + client side **and** `0404` — both in the same commit `077c9e3`, ancestor of `c12cd8e` |

Order was as `0332` plan §6 requires: profile first, game ~14 min later.

Later game deploys inside the window (version-bump commit times; go-live from the metric series restarts):
`0.0.158`–`0.0.160` committed 2026-10-08 19:49–19:55 UTC — the game counter shows **one** restart, at ~20:10 UTC;
`0.0.161` committed 2026-10-09 07:31 UTC — restart ~07:40 UTC (current game container started 07:41:18Z). The profile
server did not restart in the window.

### Window

**2026-10-08 06:56:30 → 2026-10-10 08:00:00 UTC** (~49.1 h; Thu morning → Sat morning). Start = first metric point after
the game container started. ⚠️ **No weekend evening in it.**

### Step 1 (retro) — between the two deploys

2026-10-08 06:42:30 → 06:56:30 UTC (profile new, game old): **78 resolves, all `absent`** — as expected (the old game
server sends no token).

### Verification 1 — `geoconflict.profile.resolve.vouch{outcome}` (per resolve, NOT per player)

| outcome | count | share of all resolves |
|---|---|---|
| `verified` | 13,517 | 94.75 % |
| `absent` | 505 | 3.54 % |
| `unverified_session` | 244 | 1.71 % |
| `invalid` | 0 | 0 |
| `expired` | 0 | 0 |
| `other_player` | 0 | 0 |
| `other_platform` | 0 | 0 — ✅ (should be 0) |
| `no_secret` | 0 | 0 — ✅ (non-zero would be a defect) |
| **all resolves** | **14,266** | |

- `verified` non-zero ✅. Among resolves that **carried a token**: 13,517 / 13,761 = **98.2 %** verified.
- One series per outcome, one instance (no profile restart). The outcomes never seen do not exist as series, i.e. 0.
- Cross-check: cumulative to 07:00 UTC on 10-08 reads `verified` 41, `absent` 84 — `0396`'s live watch read 43 / 84 at
  "~07:00Z". Matches within read-time slack.

By day (UTC): 10-08 (from 06:56) 6,220 resolves (`verified` 5,887 · `absent` 225 · `unverified_session` 108) ·
10-09 7,140 (6,753 · 255 · 132) · 10-10 to 08:00: 906 (the rest).

### Verification 2 — `geoconflict.server.match.identity{state}` (per player per match, at match start)

| state | count | share |
|---|---|---|
| `verified` | 5,676 | |
| `unverified` | 263 | |
| `unresolved` | 19 | |
| `guest` | 8,289 | 58.2 % of all |
| **all** | **14,247** | |

- `verified` non-zero ✅.
- **Verified share among players with a Yandex id = 5,676 / (5,676 + 263 + 19) = 5,676 / 5,958 = 95.3 %.**
  Not verified: 4.7 % (`unverified` 4.4 %, `unresolved` 0.3 %).
- By day: 10-08 95.4 % · 10-09 95.1 % · 10-10 (to 08:00) 96.2 %.
- 20 workers × 3 container lifetimes (one per game deploy above); every worker shows the same picture (verified
  227–341 each). No negative deltas.
- ⚠️ Possible small undercount at the two game restarts (the last ≤ 30 s export interval before a restart, and the first
  point of a new series, can be lost). Late joiners are not counted, by design.

### Verification 3 — login side, same window (ADR-124 re-raise trigger 2)

`geoconflict.profile.login.verification{outcome}`, version `0.0.156-profile.4`, same window, same method as `0402`
pieces 1/1-full:

| outcome | count |
|---|---|
| `ok` (mints a `vfy:true` session) | 18,704 |
| `stale` | 465 |
| `id_mismatch` | 3 |
| `absent` | 2 |
| **all logins** | **19,174** |

- **Verified share at login: 97.55 %** (not verified 2.45 %).
- **Match start: 95.3 %** (not verified 4.7 %).
- **Compared:** match start is **2.3 points lower**; the not-verified share is **~1.9× the login one** (4.7 % vs 2.45 %).
  ⚠️ Not like for like: login counts each login (players who never play included); match start counts each player
  once **per match** (frequent players weigh more), and `unverified` there also takes in any player whose resolve
  carried no token. Whether this is *"much larger"* in ADR-124's sense is the **owner's call** — flagged, no task filed.

### Verification 4 — `expired` share (also serves `0406`)

**`expired` = 0 of 14,266 resolves (0.00 %)** over the whole window. Split:

| period (UTC) | resolves | carried a token | `expired` |
|---|---|---|---|
| A: profile deploy → game deploy (10-08 06:42–06:56) | 78 | 0 | 0 |
| B: game deploy → +24 h (10-08 06:56 → 10-09 07:00) | 6,911 | 6,620 | 0 |
| C: +24 h → end (10-09 07:00 → 10-10 08:00) | 7,355 | 7,141 | 0 |

- The client keeps the token in memory only (`src/client/ProfileSession.ts`), so a reload mints a fresh one: no page
  loaded after the game deploy could hold a > 24 h token before ~07:00 on 10-09 (period B). Period C is where `expired`
  could first appear; it did not.
- ⚠️ **Confounded:** the game deploys at ~20:10 (10-08) and ~07:40 (10-09) push the stale-build popup, which reloads
  open pages — so pages rarely reached 24 h in this window whatever `0404` does. A page loaded right after the 07:40
  deploy turns 24 h old only in the window's last ~20 min. Read `expired` = 0 as **"no sign of R2"**, not as proof that
  `0404` closes it.

### Verification 5 — no token in any log

Patterns: token shape strict `v1\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{43}` (the MAC part is always 43 characters,
`SessionToken.ts`), token shape loose `v1\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}`, and the field names
`profileSession` / `sessionToken` (case-insensitive). Both regexes were checked to match a synthetic, made-up string
first. **Only counts were printed — no line content was ever output.**

| source | covers | lines | token strict | token loose | `profileSession` | `sessionToken` | expected info *"…received post-join"* | expected warn *"…too many…"* |
|---|---|---|---|---|---|---|---|---|
| Uptrace logs (`uptrace.logs_data`, all services: game server + client) | whole window | 411,067 | **0** | **0** | **0** | **0** | 24 | 0 |
| Game container `docker logs` (current container) | 10-09 07:41 → now only | 1,541,014 | **0** | **0** | **0** | **0** | 12 | 0 |
| Game box `otel-collector` container | whole window (up since August) | 1,091,870 | **0** | **0** | **0** | **0** | 0 | 0 |
| Profile API container `docker logs` | whole window (up since 10-08 06:42) | 1,281 | **0** | **0** | **0** | **0** | 0 | 0 |

- **Result: zero hits carrying a token value, and zero field-name hits, in every source.** ✅ No defect.
- The game containers from before 10-09 07:41 were replaced on deploy, so their `docker logs` are gone; the game server's
  logs for that part of the window are covered by Uptrace (the game server ships its logs there). The profile server
  does **not** ship logs to Uptrace (console logger only) — its container log covers the whole window.
- Side read, profile API log: 0 `error`, 0 `warn`, 0 *"session vouch threw"*.
- Not searched: the host-level nginx logs on either box (only container logs were in scope).

### Verification 6 — no player-visible change

**Not done here** — the owner's call on what to look at. (Side signals only: profile API 0 errors / 0 warnings in the
window; every perk stays open to unverified players by design.)

### Method (no credentials, hosts or endpoints)

- Telemetry box: SSH with the project's password-file fallback (`.env.telemetry.secret`; password passed to
  `sshpass -f` through a 0600 temp file removed on exit; host redacted from output); `clickhouse-client --readonly=1`
  inside the `clickhouse` compose service, credentials from that container's own environment; `SELECT`s only. Network
  route to the box was direct (no VPN).
- Counters: `uptrace.datapoints` joined to `uptrace.timeseries` by fingerprint; counter deltas summed from `sum`
  (as `0373`/`0392`/`0402`). Metric names `geoconflict_profile_resolve_vouch` (label `outcome`),
  `geoconflict_server_match_identity` (label `state`), `geoconflict_profile_login_verification` (label `outcome`).
- Log search on the boxes: profile box over its SSH key (`IdentitiesOnly`), game box over the password-file fallback;
  `docker logs <container>` into a 0600 temp file on the box, `grep -c` counts only, file removed.

### Reading (plain language)

- Both counters are live and sane. The new identity check works: **95 % of players with a Yandex id start a match
  verified**; per resolve, 98 % of the passes sent are accepted.
- No warning outcomes at all: no `no_secret` (the box has its secret), no `other_platform`, no `invalid`, no
  `other_player`, no `expired`.
- **No session token in any log searched.**
- One thing for the owner: unverified at match start (4.7 %) is about twice the login figure (2.45 %) — small in
  absolute terms (2.3 points), but ADR-124 trigger 2 asks whether it is "much larger". Owner's call.

### Decision log

none — read-only reading only; no fix applied, no judgment call made.

## 2026-10-10 — owner rulings and close (agent-closed — not owner-verified)

Written by: a spawned `fkit-producer` (no owner channel, ADR-021/037), on **OWNER RULINGS given live via
`AskUserQuestion` in the `fkit lead` session on 2026-10-10**, relayed by `fkit-lead`. ⛔ Not producer precedent.
Nothing re-measured here; the numbers are the entry above.

- **ADR-124 re-raise trigger 2 (verification 3).** Put to the owner: match-start not-verified 4.7 % vs login 2.45 %
  (~2×, 2.3 points, counted differently — see the entry above). Ruling, verbatim: **"Not 'much worse', leave it
  (Recommended)"** — option text *"Record that trigger 2 was not hit; no task."* → **Trigger 2 recorded as NOT hit, by
  owner ruling.** No task filed; ADR-124 Decision 4 not revisited.
- **Verification 6 (no player-visible change).** Ruling, verbatim: **"No complaints, close it (Recommended)"** — option
  text *"Producer closes 0405 as Done (agent-closed — not owner-verified) with these numbers."* → the owner reports no
  new complaints or error spike tied to joins.
- **Outcome.** Verifications 1–6 answered: both counters live and sane (`no_secret` 0, `other_platform` 0, `expired` 0;
  `verified` 94.75 % of 14,266 resolves); match-start verified share 95.3 % (5,676 / 5,958) vs login 97.55 %; **0 token
  hits in ~3.0M log lines searched**. No fix task filed (no step failed).
- **Coverage limits, kept:** game container logs only from 2026-10-09 07:41 UTC (earlier part of the window via Uptrace
  only); host-level nginx logs on either box not searched; the window (2026-10-08 06:56:30 → 2026-10-10 08:00 UTC) held
  no weekend evening.
- Closed `✅ Done (agent-closed — not owner-verified)` via `/fkit-task-done`. Nothing committed; no wiki write.
