# Worklog — 0253 tenure XP grant (research → rule → build)

## Gate record

- **2026-09-14 — step 1 research run**, spawned by `/fkit-sprint-ship-loop` (fkit-lead, Sprint 4) on an
  owner ruling given via `AskUserQuestion` in the lead session the same day: *start step 1 now; step 3
  stays gated on the owner's ruling on A–F; do not plan or write source/test/script/migration.*
- **No source, test, script or migration file was changed.** The only file written by this run is this
  worklog. No wiki write, no commit, no task-file move.
- **Step-2 owner ruling: NOT YET GIVEN.** Build (step 3) has not started and must not start until the
  ruling is recorded below with date and channel.
- ⚠️ **Output location differs from the brief.** The brief's step 1 names
  `ai-agents/knowledge-base/reports/YYYY-MM-DD-0253-tenure-xp-grant-findings.md`; the spawn instruction
  said to write findings to this worklog. This run followed the spawn instruction. Whether the findings
  must also be copied to the named report path (brief verification step 1) is **open** — see the
  step-2 draft, question G.

Code citations below are at HEAD `a953271`. The working tree carries other agents' uncommitted edits;
none is a source file cited here, and none was made by this run.

---

## Step 1 — findings

### 1.1 Signal reliability

All five signals are written by the one bundle both templates load; the Yandex template
(`src/client/yandex-games_iframe.html`) is a standard `HtmlWebpackPlugin` target with default chunks
(`webpack.config.js:295-309`), unlike the test-only parent page which gets `chunks: []` (`:310-316`).
So **every signal below is written on the shipped Yandex path.**

| Signal | Written where / when | What it actually counts | Pruned? |
|---|---|---|---|
| `geoconflict.player.firstSeen` | `FlashistFacade.ts:462-466`, in `initializeImmediate()` (`:386`) — **every app boot**, before any match | Timestamp of the first boot on this device/partition. Never read back. | Never removed. |
| `geoconflict.player.daysPlayed` (+ `lastPlayedDate`) | `DaysPlayedAnalytics.ts:20-43`, called at boot (`FlashistFacade.ts:476`) | **Distinct local calendar days with an app boot** — a lobby visit with **no match counts as a day**. Device-local timezone (`localDateString`, `:9-11`). Also fires `Player:DaysPlayed` to GameAnalytics with the running count (`:34-38`). | Never removed. |
| `gamesPlayed` | `Utils.ts:242-248`, called from the **game-started** callback in `Main.handleJoinLobby` (`Main.ts:772`) — not at join | Games that **started** on this device: multiplayer, **singleplayer and tutorial** (all route through `handleJoinLobby`, `Main.ts:673-713`). A reconnect that starts again **increments again**. No dates. | Never removed. |
| `game-records` | `LocalPersistantStats.startGame` (`:31-40`), called at the **top of `joinLobby`** (`ClientGameRunner.ts:124`) before the socket connects; `endGame` (`:47-61`) adds `gameRecord` on a win update (`ClientGameRunner.ts:486`) | One key per **gameID joined** — includes joins that never started, singleplayer/tutorial, and replays. A reconnect **overwrites** the key (`stats[id] = { lobby, startTime }`), resetting `startTime` and dropping any `gameRecord`. Distinguishable: multiplayer joins store `lobby: {}` (MP has no `gameStartInfo` at join, `ClientGameRunner.ts:94-95,124`); SP/replay store a config. | **No pruning, no cap.** Only writer `LocalPersistantStats.ts:21-25`; only other reader `FeedbackModal.ts:246-258` (top 3 by `startTime`). A write that hits the storage quota throws inside a `setTimeout` (`:22-25`) and is silently lost — records then stop growing. |

- **`gamesPlayed` ≠ `game-records`.** `game-records` ⊇ joins (incl. never-started); `gamesPlayed` = starts
  (incl. reconnect re-starts). Neither is "finished" nor "qualifying" (XP qualification is
  multiplayer-only, server-side: `MatchQualification.ts:66-68`, `:98-125`).
- **Quota hits: 0 observed** — Uptrace query for `quota` in client spans/error/warn logs,
  2026-09-01 → 09-04 (the only window with data; retention does not reach 2026-08-20). ⚠️ Query shape
  not validated against a known positive; read as "no evidence of quota loss", not proof.
- **Record size per entry: not measured.** A multiplayer join entry is ~tens of bytes; a finished-game
  entry carries one `PlayerRecord` with stats (`ClientGameRunner.ts:457-470`). Unknown whether any
  heavy player is near quota.

**A sixth signal the brief's table missed — the Yandex leaderboard score.** `LeaderboardReporter.ts:108-127`
adds `participation: 1` per match the local human spawned in (`ClientGameRunner.ts:606-621`, any game type
except replays) and `10/5/2` for a top-3 finish (`:489-535`; values `FlashistGameSettings.ts:10-15`,
unchanged since `75b63a9` 2025-12-09). Written via `ysdk.leaderboards.setScore` as read-then-add
(`FlashistFacade.ts:1432-1458`).
- **Account-bound, not device-bound**: held by Yandex, per authorized account — survives cleared storage
  and a new device, and binds to exactly the identity that can receive the grant.
- Weaknesses: mixes match count with placement points; client-writable via the SDK (forgeable, but the
  forged score is publicly visible on the leaderboard); if `getPlayerEntry` throws, the code adds to `0`
  (`:1439-1453`) — whether Yandex keeps the max or overwrites is **unknown**, so a transient read failure
  may have reset some scores. Whether a server can read it is **unknown** (no server-side use in repo).

### 1.2 Storage survival in the real context

**Not observed. localStorage survival inside the Yandex iframe across days could not be measured from
here.** Reasons: no GameAnalytics API key is available locally (the `Player:New` / `Player:DaysPlayed`
events that would measure it go only to GameAnalytics — `FlashistFacade.ts:198-221`); the Yandex app URL
is not in the repo and a web search did not find it; and a single browser session cannot observe
multi-day survival anyway. The tab-persistence feature (`StartScreenTabStorage.ts`) is not
instrumented, so it is no probe. → owner steps O1, O2, O6.

What is established:
- Production is `geoconflict.ru/yandex-games_iframe.html` framed by Yandex Games
  (`ai-agents/knowledge-base/architecture.md:230`, `PROJECT.md:69`) — a **cross-site iframe**, so its
  storage is a **third-party, partitioned** store keyed by the top-level Yandex site.
- Caveats from browser behaviour (general platform knowledge, **not verified here**): Chromium (incl.
  Yandex Browser) partitions third-party iframe storage by top-level site — stable across visits, but a
  player who enters via a different Yandex domain (e.g. `.ru` vs `.com`/`.kz`) sees a **different, empty**
  store; Safari/iOS applies partitioning plus ITP storage deletion rules that can wipe it; the Yandex
  Games Android app is a WebView with its own store; "clear browsing data" wipes all of it.

**Side observation, cookie not localStorage (do not read as localStorage survival):** prod server join
logs (Uptrace, `client (re)joining game`, `openfront_environment = Prod`):

| Window | first joins | distinct `persistentID` | games |
|---|---|---|---|
| 2026-09-03 (24 h) | 10,175 | 5,970 | 685 |
| 2026-09-01 → 09-04 (72 h) | 30,017 | 17,572 | 2,054 |

72 h distinct (17,572) is 98 % of 3 × the 24 h distinct (17,910) — **distinct IDs add up almost linearly
across days, i.e. almost no ID is seen on two days** (proxy: one day's count stands in for each day). The
`persistentID` is the `player_persistent_id` cookie set `SameSite=Strict` (`Main.ts:1051-1073`), which a
cross-site iframe generally cannot keep. Consistent with that cookie **regenerating per page load** —
*likely, not proven* (a genuinely non-returning population would look the same). Consequences: the
cookie is **useless as tenure evidence**, and the `persistentId` that `upsertProfile` stores as the
"cross-device key" (`GameServer.ts:1274-1280`) is probably per-load noise — **flag for `0217`**, out of
this task's scope.

**Share of old-timers who will have evidence: unknown.** Needs O1 (GameAnalytics `Player:DaysPlayed`
distribution) and O2 (`Player:New` vs Yandex new users).

### 1.3 Evidence horizon — first deployed date

Method: first commit whose message is a prod-deploy label and which contains the introducing commit
(`git merge-base --is-ancestor`). ⚠️ Standardised `DEPLOY prod: bump version` markers only start
**2026-04-10 (`22313a6`, 0.0.121)**; earlier labels are informal ("Prod deploy", "Deploy: prod",
"Prod update") — they are the best evidence in the repo, not verified deploys.

| Signal | Introduced | First prod-labelled commit containing it | Confidence |
|---|---|---|---|
| `game-records`, `gamesPlayed` | `feea527` 2025-11-04 (fork's first commit; call sites never removed since — `git log -S` shows only `feea527`) | `774772a` **2025-11-08** "Porting game (prod server, yandex games)" | Low — a porting commit, not a clear deploy; the **real public-launch date on Yandex is not in the repo** (O4). Horizon = public launch. |
| Yandex leaderboard score | `9149956` 2025-12-08 | `3bc3c55` **2026-01-02** "Prod update" (`409cf2e` 2025-12-08 "Published new version" suggests earlier; unlabelled) | Low–medium |
| `firstSeen` | `d0eb05f` 2026-02-28 | `8789cb0` **2026-03-03** "Prod deploy" | Medium |
| `daysPlayed`, `lastPlayedDate` | `2a15fc5` 2026-05-02 | `425be22` **2026-05-03** `DEPLOY prod: bump version to 0.0.131` | High |

So on 2026-09-14: `daysPlayed` can reach at most **~134 days**; `firstSeen` ~195 days; `game-records`
~310 days (if public since 2025-11-08). Any change of the iframe origin/URL since launch would reset all
local signals — **unknown** (O4).

### 1.4 Identity binding — claim routes

The grant is per `yandex_player_id`; only authorized Yandex players have one
(`FlashistFacade.getYandexUniqueId`, `:1214-1232` → `null` for guests). **No route today verifies
identity**: `GameServer.getCreditableYandexId()` returns the client-asserted value (`GameServer.ts:1260-1262`;
ADR-103 accepts this for earned XP).

| Route | Identity the server can trust | Ack back to client | Profile row present? | Prerequisite |
|---|---|---|---|---|
| **(a)** client → game server (WS) → `ProfileApiClient` → `/internal/v1/credit` | Client-asserted id through the one funnel (`:1260`) — same as match XP | **None today** — crediting is fire-and-forget (`ProfileApiClient.creditMatch`, `:124-…`); a new server→client ack message would be needed | Yes, if claimed in a session: upsert-at-join (`GameServer.ts:1274-1291`) | New WS message pair; `CreditItem` has no `reason` (`CreditContract.ts:20-24`); only reachable while in a game connection; live only after `0217` deploys |
| **(b)** client → profile server directly (new public route) | Client-asserted id — **same trust level as existing public writes** `POST /v1/profile/name-change-request` (`Routes.ts:739-…`) and `POST /v1/payments/yandex/intent` (`:405-423`, comment cites ADR-103) | Synchronous HTTP response — natural ack | **Not until the player's first authenticated MP join after `0217`**; before that a claim gets `no_profile` and must retry | None for raw-id trust. **`0250` is a prerequisite only if the owner wants a *verified* identity** — no signed/authenticated write route exists anywhere. New public surface (CORS + rate limiter precedent: `Routes.ts:225-229`, `profileReadLimiter`) |

Guest who logs in later: reachable on the same device — `openYandexAuthDialog` (`FlashistFacade.ts:1177-1191`)
re-fetches the player, the id becomes available, and the device's local evidence is untouched. A guest on a
new device, or who cleared storage, has nothing to claim.

### 1.5 Abuse surface

- **What a forger gains:** cap × 1 per Yandex id. Because ids are client-asserted, a forger can also
  **claim on behalf of other ids** (gift the cap to any id whose profile exists) — the same bounded risk
  ADR-103 accepted for match XP (ADR-103:60). Worst case at cap 50: many accounts get half-way to free
  citizenship, which **also sells** (paid citizenship, `is_paid_citizen` — `001_player_profiles.sql:25`) — a revenue tradeoff,
  owner's call.
- **Cheap server-side checks, worth it vs a ≤ 50 XP prize:**
  1. **Server computes and clamps the amount** from the claimed evidence — never accept a client amount. *(essential)*
  2. **One grant per `yandex_player_id` for life**, enforced by a unique key. *(essential; free with either recording option)*
  3. **Claim window** by server clock (e.g. N days after go-live). *(cheap)*
  4. **Timestamp sanity:** claimed first-play date ≥ public launch and ≤ go-live; claimed days ≤ days in that span. *(cheap; stops sloppy forgery only)*
  5. **Count only pre-go-live days** — post-go-live play earns real XP. *(cheap)*
  6. **Require ≥ 1 real credited match on the profile** before a claim. *(cheap; blocks gifting to ids that never played post-launch and pure scripting of fresh accounts)*
- **Not worth it:** anything cross-checking device evidence against server data — the server holds no
  pre-launch history (profile table empty until `0217`), and the join cookie is per-load noise (1.2).

### 1.6 Loss surface (ADR-101)

- Today's crediting is fail-soft with bounded retry and **no durable queue** (ADR-101); a failed credit
  is lost. On route (a) the client has no ack at all, so "claimed" could only be set blind → **a lost
  grant is lost forever.**
- **Required sequence (either route):** client reads evidence → sends claim → **only on a server response
  of `granted` or `duplicate`** writes the local `claimed` marker → shows the popup once (separate
  `popupShown` marker). On timeout / network error / 5xx / `no_profile` / window-not-open: **no marker,
  retry on the next load.** The server must be idempotent (one-per-id key) and should return the granted
  amount on `duplicate`, so an ack lost after the server committed still produces the popup next load.
- Route (b) gives this for free (synchronous response); route (a) needs a new ack message.

### 1.7 Recording shape — options and costs (no choice made)

| Option | Idempotency | Migration | Honest ledger? | Wire change | Cost |
|---|---|---|---|---|---|
| **(i)** synthetic `game_id` (e.g. a fixed non-match token) in `player_match_xp_credits` | Free via PK `(game_id, yandex_player_id)` (`001_player_profiles.sql:49-56`) | None | **No** — "match credits" gains a non-match row; any future matches-played count is off by one per grantee | None if relayed by the game server as a normal credit | Lowest; reuses `CREDIT_SQL` + `GRANT_CITIZENSHIP_SQL` (`PlayerProfileRepository.ts:80-118`) |
| **(ii)** new `player_xp_grants (yandex_player_id, kind, xp_awarded, evidence, granted_at)`, unique `(yandex_player_id, kind)` — migration `005` (001–004 exist) | Unique key | Yes | **Yes**; stores the claimed evidence for abuse audit; `xp = Σ match credits + Σ grants` stays checkable (verification step 8) | Route (a): `reason`/`kind` needed; route (b): none | More: sibling of `creditMatchXp` in the same transaction incl. threshold check |
| **(iii)** `source` column on `player_match_xp_credits` (default `match`) | PK unchanged | Yes | Partly — `game_id` still bent | Route (a): `reason` | Middle |

Precedent for a per-grant source: `player_cosmetic_ownership.source` (`001_player_profiles.sql:75`).
No bonus/grant concept exists anywhere today.

### 1.8 Other facts the rule depends on

- **The inbox is citizen-only.** `GET /v1/messages` returns 403 `not_citizen` for non-citizens
  (`Routes.ts:593-600`). A tenure grantee at ≤ 50 XP is not a citizen → **an inbox message would never be
  seen.** Only a modal works without changing the inbox gate.
- Kill switch exists and is **off**: `CITIZENSHIP_CARD_ENABLED: false` (`FlashistFacade.ts:184`), checked
  at `CitizenshipCard.ts:76`; remote flag `citizenship_ui` (`:174`).
- Copy test `CitizenshipCopy.test.ts:35-52` only reads `inbox.templates.citizenship_earned.body` — new copy
  under a new section does not interact with it; using a `{threshold}` placeholder instead of a literal
  `100` keeps it that way. `translateText` is `IntlMessageFormat`-backed (`Utils.ts:1,149`), so
  placeholders and ICU plurals work (no `plural` exists in `ru.json` yet).
- **Scale indicator (prod, Uptrace, 2026-09-01 → 09-04, 72 h, build 0.0.140 pre-`0211`):** 1,038
  `crediting N player(s) match XP` log lines = **1,572 credit items** (≈ 524/day) — authorized players who
  qualified at a match end — against 12,093 `sending start message` lines (≈ 4,030/day). ⇒ ≥ ~13 % of
  started seats were authorized-and-qualifying at match end; a lower bound on the authorized share (early
  leavers are excluded). Distinct accounts: **unknown** (ids are not logged). These credits are no-ops on
  prod today (game server not wired — `0217`; `ProfileApiClient.creditMatch` returns early when
  unconfigured, `:126-129`) — consistent with, not a re-verification of, the empty profile table.
- Profile DB row count: **not re-queried** this run (0 rows per `0211`/`0215`; nothing credits until `0217`).
- Telemetry caveat: telemetry has been dark since the TLS certificate expired 2026-09-04 (see `0032`
  worklog); all Uptrace figures above come from the last window with data.

### Unknowns (explicit)

1. Share of active players with any local evidence, and its distribution (≥ 7 / 30 / 50 days).
2. localStorage survival rate in the Yandex iframe across days, per platform (desktop Chromium, iOS, Yandex app).
3. Real public-launch date on Yandex, and whether the iframe origin/URL ever changed.
4. Share of players who are Yandex-authorized (only a lower bound: ≥ ~13 % of started seats).
5. Yandex leaderboard semantics (keep-max vs overwrite) and whether a server can read it.
6. Whether `persistentID` truly regenerates per page load (side finding for `0217`).
7. Size of `game-records` on heavy devices; whether any device is near quota.

### Owner steps (need a console; numbers not guessed)

- **O1 — GameAnalytics:** distribution of the `Player:DaysPlayed` design-event value over the last 7 and
  30 days (share of sessions/users at ≥ 7, ≥ 30, ≥ 50). Answers unknown 1 and how many would hit the cap.
- **O2 — GameAnalytics vs Yandex console:** daily `Player:New` count vs Yandex's daily new players.
  `Player:New` ≫ Yandex new ⇒ local evidence is being lost (unknown 2).
- **O3 — GameAnalytics:** ratio of `Player:YandexLoggedIn` : `Player:YandexGuest` : `Player:YandexUnknown`
  (unknown 4 — who can receive a grant at all).
- **O4 — Yandex console:** date the game first went public; whether the iframe URL/origin ever changed;
  platform split (browser vs Yandex app, iOS share).
- **O5 — Yandex console / game page:** the `default` leaderboard's score distribution — decides whether
  the leaderboard is usable as an account-bound signal (unknown 5).
- **O6 — Observed probe on real devices** (brief verification step 2): open the game in Yandex Games on
  desktop Chrome, iOS Safari and the Yandex app; in devtools note `geoconflict.player.daysPlayed` /
  `firstSeen`; reopen on a later day and confirm they persisted.
- **O7 — Revenue judgment:** how much free XP is acceptable next to paid citizenship.

---

## Step 2 — draft decision (options; the owner rules)

Proposed rule in one line: **one grant per Yandex account, 1 XP per pre-launch day played on this device
(days = max of `daysPlayed` and distinct days in `game-records`), minimum 7 days, cap 50, server-clamped,
claimable for 90 days after go-live via a direct profile-server route with a synchronous ack, recorded in
a new `player_xp_grants` table, announced by a one-time modal.** Main tradeoff: it rewards device
evidence that is forgeable and partly lost, so some honest old-timers get nothing and a forger gets 50 —
accepted because the prize is capped, one-per-account, and goodwill is the point.

**Ruling: open — not yet given.**

### A. Evidence signal
- Options: (1) `daysPlayed` only — owner's framing, horizon 2026-05-03, counts lobby-only days;
  (2) distinct calendar days in `game-records` `startTime` — horizon = public launch, counts join days;
  (3) **max(1, 2)**; (4) `gamesPlayed` (no dates, counts SP and reconnects); (5) Yandex leaderboard score —
  account-bound, survives device change, but mixed points and unknown semantics.
- **Rec: (3)**, with (5) re-evaluated after O5 as a fallback for accounts with no local evidence.
- Why: (2) reaches ~6 months further back than (1) (1.3); max() never gives less than the owner's framing;
  both are equally forgeable, so combining costs no security.

### B. Rate and cap
- Options: (1) 1 XP/day, cap 50 (owner's example = 50 qualifying matches = half of 100); (2) 1 XP/day,
  cap 25; (3) 1 XP per 2 days, cap 50.
- **Rec: (1)**, as constants beside `XP_PER_MATCH` in `src/core/profile/Citizenship.ts`, applied
  server-side only.
- Why: goodwill is the goal and the grant is one-time; a 50-day player already sits at the cap on
  `game-records` evidence. ⚠️ Revisit if O7 says free XP hurts paid citizenship — ADR-111's
  "start low, only move up" favours (2) if in doubt.

### C. Eligibility and window
- Minimum tenure — options 3 / **7 (Rec)** / 14 days. Why: filters one-week tourists; the cliff is small at 1 XP/day.
- One grant per `yandex_player_id` for life — **Rec: yes**, unique key. Why: essential abuse bound (1.5).
- Count only days **before go-live** — **Rec: yes.** Why: later days earn real XP.
- Claim window — options open-ended / **90 days after go-live (Rec)** / 30 days. Why: bounds the abuse
  surface in time while leaving room for late logins and infrequent players.
- Guests who log in later — **Rec: allowed within the window** (same device). Why: reachable (1.4) and fair.
- Device claims once regardless of account (local marker) — **Rec: yes.** Why: cheap; stops a shared
  device granting every account (forgeable, but so is everything local).
- Require ≥ 1 real credited match before claim — **Rec: yes.** Why: cheap block on scripted gifting (1.5);
  also guarantees the profile row exists.
- Players with no evidence (cleared storage / new device) — **Rec: accept silently** (no popup can reach
  someone with nothing to claim). Why: unfixable client-side; saying it in public copy invites support load.

### D. Recording and route
- Recording: (i) synthetic `game_id` / **(ii) `player_xp_grants`, migration `005` (Rec)** / (iii) `source` column.
  Why: a one-time, non-rerunnable grant deserves an honest ledger with the claimed evidence for audit;
  keeps "matches credited" meaning matches.
- Route: (a) via game server WS / **(b) direct profile-server route (Rec)**. Why: (b) has a synchronous ack
  (1.6), needs no wire `reason`, and matches the trust level of existing public writes; (a) needs a new
  ack message and only works inside a game connection. Needs no `0250` unless the owner wants verified
  identity — if so, this brief goes `🚧 Blocked — 0250`.
- Optional: an `fkit-architect` consult on the table shape before the step-3 plan.

### E. The popup
- Modal vs inbox — **Rec: modal**, shown once on the start screen after a `granted` (or first-seen
  `duplicate`) response, behind the citizenship kill switch. Why: the inbox is citizen-only (1.8), so a
  sub-100 grantee would never see an inbox message.
- Draft copy, section `citizenship_tenure_grant` (both languages ship together):

  **en**
  - `title`: "Thanks for being with us!"
  - `body`: "You've played Geoconflict on {days} days before citizenship arrived. As a thank-you, we've added {xp} XP to your progress — you now have {total} / {threshold} XP."
  - `cta`: "Great!"

  **ru**
  - `title`: "Спасибо, что вы с нами!"
  - `body`: "Дней в игре до появления гражданства: {days}. В благодарность мы начислили вам {xp} XP — теперь у вас {total} / {threshold} XP."
  - `cta`: "Отлично!"

  `{threshold}` is a placeholder, not a literal `100` (keeps `CitizenshipCopy.test.ts` untouched).

### F. Analytics
- **Rec: yes, measure it.** Events in `Category:Action` form via `flashistConstants.analyticEvents`, with
  the reference doc updated: `Citizenship:TenureGrant:Claimed` (value = XP), `Citizenship:TenureGrant:Rejected:<Reason>`
  (window / no evidence / below minimum / no profile / duplicate), `Citizenship:TenureGrant:ClaimFailed`
  (network — retried). Why: the grant is one-time and cannot be re-run; without events there is no way to
  know how many old-timers it reached or how much was abuse.

### G. Process (not in the brief's A–F)
- Where the findings live: **copy this step-1 section to the brief's named report path (Rec)** / keep in
  worklog only. Why: brief verification step 1 names the report path.
- Owner steps O1–O3 before ruling on B/C — **Rec: yes if cheap**, because the cap and minimum are best set
  against the real `Player:DaysPlayed` distribution; otherwise rule now on the recommendations.
- ADR: **Rec: architect records a free-grant-policy ADR** after the ruling, against ADR-111's accepted
  free-grant precedent (brief step 2).

### Owner input — 2026-09-14 (lead session, relayed by the `fkit-sprint-ship-loop` coordinator)

1. **Question:** could flashist appframework's `AppModuleState.appDaysLaunchesCount` (Yandex cloud-save
   backed) be the signal? **Lead verified:** Geoconflict does not use appframework — no
   `@flashist/appframework` dependency, no `AppModuleState`, and no Yandex cloud-save
   (`player.setData`/`getData`) anywhere in the repo; that counter lives in the separate `libs/appframework`
   used by other games. Geoconflict's analogue is `geoconflict.player.daysPlayed` (localStorage only,
   since 0.0.131).
2. **Owner ruling, verbatim:** *"Then it's also fine, even if it lives only on the localStorage of a user."*
   → **localStorage-only evidence is ACCEPTED as the signal source** (bears on decision A). **Still open:**
   the specific signal choice — `daysPlayed` alone vs max(`daysPlayed`, distinct `game-records` days) — and
   B–G.
