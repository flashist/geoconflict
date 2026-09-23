# Plan — 0062: Forward `PROFILE_INTERNAL_TOKEN` in deploy.sh

**Status:** awaiting owner approval (ADR-031 plan gate). No source/config edits made.
**Planned by:** fkit-coder (spawned by fkit-sprint-ship-loop), 2026-08-24.
**Brief:** [`brief.md`](brief.md)

> Secret hygiene: this plan and all verification steps use presence/absence checks and
> variable names only. No token value appears in any artifact, log, or command output —
> match checks compare and print only `MATCH`/`MISMATCH`.

## Root cause — re-verified against the code (2026-08-24)

Every link of the brief's chain holds:

1. `deploy.sh` writes the remote env file via a heredoc inside a double-quoted SSH command
   (`deploy.sh:278-311`). `PROFILE_API_URL=${PROFILE_API_URL}` is there (`:291`);
   **`PROFILE_INTERNAL_TOKEN` is absent** — the only two mentions of these names in the
   whole script are that one line. (The `<< 'EOL'` quoting is irrelevant: expansion happens
   locally inside the outer double-quoted SSH string, which is how every other var gets in.)
2. `update.sh` passes that file to the container verbatim: `docker run --env-file "$ENV_FILE"`
   (`update.sh:73`), then deletes it (`:90`). Workers inherit env from the master via cluster
   fork — so one heredoc line is genuinely the whole game-server-side fix.
3. `ProfileApiClient.token()` reads `process.env.PROFILE_INTERNAL_TOKEN ?? ""`
   (`src/server/ProfileApiClient.ts:127`); `isConfigured()` (`:131-133`) requires both URL
   and token non-empty → false in prod → `upsertProfile()` (`:60-63`) and `creditMatch()`
   (`:86-89`) return early.
4. The miss logs at `debug` (`:140`) and the server logger's level is `info`
   (`src/server/Logger.ts:53`) — the miss is invisible in prod, exactly as the brief says.
5. The profile server independently fails closed on an empty/mismatched token
   (`src/profile-server/InternalAuth.ts` — `tokensMatch` rejects when `expected.length === 0`).
6. Local presence checks (names only, no values): `.env.prod` has `PROFILE_INTERNAL_TOKEN`
   **non-empty** and `PROFILE_API_URL` **non-empty**; deploy.sh sources `.env.prod` with
   allexport (`deploy.sh:66-75`). So the forwarded value will be non-empty — the 0061-style
   "forwarded but locally unset" failure mode is already ruled out for this var (re-check at
   deploy anyway, verification step D2).

Only callers of `ProfileApiClient`: `Worker.ts:65` (constructs it), `GameManager.ts` /
`GameServer.ts` (receive it; call sites `GameServer.ts:1217` upsert-at-join, `:1281`
credit-at-match-end). No other consumer — brief's remaining step-1 question answered.

## The change

### 1. `deploy.sh` — forward the variable (the one-line fix)

Add to the remote env heredoc, directly after `PROFILE_API_URL=${PROFILE_API_URL}` (`:291`),
matching surrounding style exactly:

```
PROFILE_INTERNAL_TOKEN=${PROFILE_INTERNAL_TOKEN}
```

No other deploy.sh change. The script never echoes the heredoc content (verified — it prints
headers and status lines only), so the token does not appear in deploy output.

### 2. `src/server/ProfileApiClient.ts` — make the silent no-op audible (brief step 3)

In the constructor, when the client is **partially configured**, log at `warn` (visible at the
prod `info` level):

- `PROFILE_API_URL` set, `PROFILE_INTERNAL_TOKEN` empty → warn: profile integration is
  unauthenticated and will no-op (this exact defect's signature).
- Token set, URL empty → warn: token present but no URL; integration off. *(Symmetric case —
  minor extension beyond the brief's literal wording; trim if unwanted.)*

Neither-set (local dev) stays silent; both-set logs nothing. Warn text names the variables
only — never values. The per-op `debug` miss log (`:140`) **stays at debug**: the constructor
warn is the once-per-worker audible signal; promoting the per-op log too would be redundant
noise. (Answers the brief's step-1 open question about `:140`.)

Constructor placement (vs Worker.ts) keeps the check next to `isConfigured()` and makes it
unit-testable; one warn per worker process is acceptable volume.

## Token match between game and profile servers — how it is assured

- **Profile side (authoritative):** `setup-profile.sh:345-362` — env value wins, else the
  VPS-persisted `$PROFILE_DIR/.internal_token` is reused, else one is generated and persisted.
  The comment mandates the token stay stable across redeploys. `build-deploy-profile.sh:498`
  forwards the local `PROFILE_INTERNAL_TOKEN` env if set — but the local
  `.env.profile.secret` does **not** carry the key (checked: absent/empty), so the live
  profile-server token is the **VPS-persisted file**.
- **Game side:** `.env.prod` carries a non-empty `PROFILE_INTERNAL_TOKEN` — per
  `build-deploy-profile.sh:540`'s documented convention ("Share PROFILE_INTERNAL_TOKEN with
  the game server's `.env.prod`"), it should be a copy of the VPS token.
- **The gap:** the match is a manual convention, not machine-checked, and **cannot be proven
  from the local repo** (the authoritative copy lives only on the profile VPS). The proof is
  verification step D3 (end-to-end authenticated call). Optional pre-check at deploy time:
  compare `sha256` of the VPS `.internal_token` against `sha256` of the `.env.prod` value,
  printing only `MATCH`/`MISMATCH` — never a value, and never the hashes into any artifact.
- **If mismatched:** fix `.env.prod` from the VPS-persisted token — never regenerate the VPS
  token (stability contract above; nginx IP-allowlist + `InternalAuth` remain the two
  independent barriers either way).
- A durable parity check is **0064's** territory — not built here.

## Verification — now vs. weekend deploy (0063 precedent)

### Now (this task, pre-merge)

- **N1.** Unit tests in `tests/server/ProfileApiClient.test.ts` (exists — extend):
  warn fires with URL-set/token-empty; fires for token-set/URL-empty; does **not** fire
  both-set or neither-set; fires once per construction. Assert the warn message contains no
  token value.
- **N2.** Regression: unconfigured client still no-ops cleanly (existing tests cover this —
  keep green). `upsertProfile`/`creditMatch` behavior otherwise untouched.
- **N3.** `bash -n deploy.sh` (syntax), plus a grep assertion that the heredoc now contains
  exactly one `PROFILE_INTERNAL_TOKEN=` line and that deploy.sh still never echoes the env
  file's content.
- **N4.** `npm run lint` + full `npm test`.

### At the weekend deploy (live proof — recorded then, not claimed now)

- **D1.** Optional pre-check: token `MATCH` between `.env.prod` and the profile VPS's
  persisted token (hash comparison, MATCH/MISMATCH output only).
- **D2.** On the game server: remote `.env` (container env) contains `PROFILE_INTERNAL_TOKEN`
  **non-empty** — presence check only (`grep -c '^PROFILE_INTERNAL_TOKEN=..*'`), never `cat`.
  Note: `update.sh:90` deletes the env file post-start, so check container env
  (`docker exec … sh -c 'test -n "$PROFILE_INTERNAL_TOKEN" && echo NONEMPTY'`) if the file is
  already gone.
- **D3.** End-to-end: play/observe a prod match; worker logs show `match credit results: …`
  (`ProfileApiClient.ts:164`) with credited > 0, and a profile row exists / XP increments on
  the profile side. This — not variable presence — is the brief's step-3 bar.
- **D4.** The new warn does **not** appear in prod logs (both vars set), and no token value
  appears in any log or deploy output.
- **D5.** Local dev unset case still clean (covered by N2 + a quick `npm run dev` smoke).

## Files to change

| File | Change |
|---|---|
| `deploy.sh` | +1 heredoc line after `:291` |
| `src/server/ProfileApiClient.ts` | constructor partial-config `warn` |
| `tests/server/ProfileApiClient.test.ts` | new warn tests + keep no-op regression green |

No profile-server code changes. No `0064` guard built here.

## Report-only observations for 0064 (not fixed here, per brief step 4)

App-read env vars absent from the deploy heredoc (from a sweep of `process.env.*` in
`src/server` + `src/core`):

- **`MASTER_INTERNAL_ORIGIN`** (`src/server/ServerEndpoints.ts:6`) — has a `??` fallback;
  works single-box, but silently unforwardable today. Real 0064 input.
- **`STRIPE_PUBLISHABLE_KEY`** (`DefaultConfig.ts:77,331`) — upstream leftover, likely dead
  in this fork; 0064 should classify rather than forward.
- Not defects: `GIT_COMMIT` (baked into image, `Dockerfile:21-22`), `HOSTNAME` (Docker),
  `WORKER_ID` (set by master at fork), `DEPLOYMENT_ID` (already in heredoc).
- Deploy-side-only keys in `.env.prod` (`DOCKER_REPO`, `VPS_*`, `PUBLIC_ORIGIN`) correctly
  never enter the heredoc.

## Edge cases and failure modes considered

- **Forwarded-but-empty (0061's mode):** ruled out for now by the local non-empty presence
  check; re-verified at deploy (D2) since `.env.prod` can change between now and then.
- **Token mismatch between sides:** profile server 401s every call; client logs
  `profile … returned 401; not retrying` at warn (`:224-228`) — audible post-fix, and D1/D3
  catch it. Remediation direction fixed above (copy from VPS, never rotate VPS token).
- **Warn noise:** once per worker construction, not per call — bounded.
- **Secret leakage:** warn text and tests reference variable names only; deploy.sh does not
  echo the env file; D-steps use presence/hash-compare patterns only.
- **`0064` interaction:** deliberately sequenced after this task; nothing here adds a guard
  that could block this very fix's deploy.

## NEEDS-DECISION (for the driver to relay)

1. **Symmetric warn** (token-set/URL-empty case) — minor extension beyond the brief's literal
   step 3. Include (recommended — same defect family, ~3 lines) or trim to the literal case?
2. **D1 pre-check** (SSH hash comparison against the profile VPS) — run it at the weekend
   deploy, or rely solely on the end-to-end proof D3? Recommended: run it; it turns a
   possible deploy-night debugging session into a 30-second precheck.
