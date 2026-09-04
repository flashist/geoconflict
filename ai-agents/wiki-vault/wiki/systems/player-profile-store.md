# Player Profile Store

**Layer**: server
**Key files**: `src/core/profile/PlayerProfile.ts`, `src/profile-server/`, `migrations/001_player_profiles.sql`, `deploy.sh`, `build-deploy-profile.sh`, `setup-profile.sh`

## Summary

> 🔴 **READ FIRST — HARDWARE EXISTS; ITS STATE IS UNKNOWN (owner-ruled 2026-09-04).**
> ⚠️ **This banner SUPERSEDES an earlier same-day annotation on this page that read "THERE IS NO
> PROFILE HOST". That wording overstated the owner's position and has been withdrawn.** Two owner
> rulings, both given live in session on 2026-09-04, are **both true and neither is discarded**:
> first *"We don't have ANY profile-related VPS yet, we would need to have a full-scale setup for it
> (whatever is needed)"*; then, on a direct follow-up, *"We don't need to cancel any billings, the VPS
> and S3 I created will be reused."* The reconciliation that stands, and the wording to reuse:
>
> 🔴 **A profile VPS and an S3 bucket PHYSICALLY EXIST and are REUSED IN PLACE. What is on them —
> provisioning state, what runs, what the bucket holds — is UNKNOWN AND UNVERIFIED. Hardware
> existence and provisioning state are two different facts, and only the first one is known.**
>
> ⛔ **The backend WAS built** — the service code, the Docker image, `setup-profile.sh` (~1,025 lines,
> provisions a bare box *and* deploys the stack; **idempotent and safe to re-run**),
> `build-deploy-profile.sh`, the backup script with a scripted restore path, and a complete operator
> runbook **all exist and are sound**. ⚠️ **Every "on the real box", "200/TLS verified", "503s in
> production" statement on this page and on every page it links to is UNVERIFIED — not disproven, and
> no longer claimable.** 🔴 **"Clean slate" now means WIPE AND REBUILD ONTO THE EXISTING RESOURCES,
> not procure new ones** — tasks **`0213` (epic) through `0222`, plus `0201`**, all on Sprint 4, with
> `0215` inspecting the existing box before anything else. The owner's own *"I think I am completely
> lost here about what was done and what wasn't"* **is** the honest state of the provisioning, and
> **that uncertainty is itself the fact recorded here** — not a claim in either direction. Grounding:
> `ai-agents/knowledge-base/reports/2026-09-04-profile-backend-clean-slate-survey.md` (§0 the
> reconciliation, §5 the UNKNOWN-state table, §13 the correction to the corrections).
> ⚠️ **Stated as inference, not fact:** match-end XP crediting has **almost certainly never worked in
> production** — `0062` exists precisely because `PROFILE_INTERNAL_TOKEN` never reached the production
> game server. Nobody measured it; do not upgrade it to a measurement.

The player profile store is the Sprint 4 backend foundation for persistent XP, citizenship state, display names, and future paid entitlements. ~~It runs as a dedicated profile API and Postgres stack on a reg.ru VPS at `api.geoconflict.ru`~~ 🔴 **CORRECTED 2026-09-04 — whether that stack is running is UNVERIFIED; see the banner above.** The VPS and the DNS record exist and are being reused; what is provisioned on the box is unknown until `0215` inspects it. ⚠️ **A DNS record resolving proves NOTHING about a server running** — DNS resolution is not a health check. The system is **designed and scripted** to run as a dedicated profile API and Postgres stack on a reg.ru VPS, and the wipe-and-rebuild stands exactly that shape up again **on the existing box**; game servers call the API instead of connecting to Postgres directly.

🔴 **The `api.` subdomain is architecturally required, not incidental (owner, 2026-09-04):** Yandex Games permits only **ONE main domain** for an iframe game, so everything must route through subdomains of that domain. The profile API is therefore **structurally required** to live on a subdomain of the game's domain. The owner has ruled to **reuse the existing hostname** rather than cut a new one; this is not a convenience choice and should not be re-opened as one.

Sources: `ai-agents/knowledge-base/s4-preexisting-infra-impact-2026-06-24.md`, `ai-agents/tasks/done/0185-profile-05-backend-db-api/brief.md`, `ai-agents/tasks/done/0188-profile-06-match-end-crediting/brief.md`, `ai-agents/tasks/done/0189-postgres-backup-routine/brief.md`, `ai-agents/knowledge-base/profile-backup-restore-runbook.md`, `ai-agents/tasks/done/0191-citizenship-xp-progress-ui/brief.md`

## Architecture

- **Shared contract**: [[tasks/profile-schema-contract]] defines `PlayerProfile` v1 and `migrateProfile()` in `src/core/profile/PlayerProfile.ts`.
- **Dedicated host**: T4 slices built the profile-service liveness endpoint, public API URL config, Docker image, VPS provisioning, digest-based deploy, on-box compose lifecycle, secret scan, deploy hardening, game-server env propagation, and operator bring-up. 🔴 **2026-09-04: all of that MACHINERY exists and is sound; whether any of it is currently STOOD UP on the host is UNVERIFIED.** The host exists and is reused in place; its provisioning state is unknown until `0215` inspects it. The scripts are the asset the wipe-and-rebuild reuses — see the banner in *Summary*.
- **DB/API**: T5 adds Postgres migrations, a `PlayerProfileRepository`, client `GET /v1/profile`, internal `POST /internal/v1/credit`, and DB-backed `GET /ready`.
- **Match-end crediting**: [[tasks/profile-match-end-crediting]] adds the game-server T6 path that accepts client participation summaries, applies server-side qualification, and calls the internal profile credit endpoint fail-soft.
- **Backups**: [[tasks/postgres-backup-routine]] adds the T8 daily `pg_dump -Fc` path, age encryption, verified off-box S3 upload, restore command, retention, and machine-readable backup marker.
- **Profile read UI**: [[tasks/citizenship-xp-progress-ui]] reads the public `GET /v1/profile` projection from the client citizenship card and maps it to the XP/citizenship view model.
- **Storage strategy**: [[decisions/profile-storage-strategy]] chose typed Postgres columns plus `extra jsonb`, with `xp bigint`, `persistent_id text`, DB-level paid/citizenship invariants, and future-aware tables for names/cosmetics.
- **Payments endpoints**: [[tasks/yandex-payments-implementation]] (0019) added `POST /v1/payments/yandex/{intent,complete,reconcile}` to the profile server, with migration 002 (`purchase_intents`, `processed_purchases`), HMAC signature verification, and the sole-authority rule that only a verified purchase token can set `is_paid_citizen` — `upsertProfile` and `/internal/v1/credit` never touch paid state. Fail-closed 503 until `YANDEX_PAYMENTS_SECRET` is provisioned (secret issuance blocked on Yandex catalog approval, task 0014).
- **Personal inbox (task `0012`, built 2026-08-26 — not launched)**: migration `003_player_messages.sql` adds `player_messages` (`id bigserial` PK, FK `yandex_player_id` → `player_profiles` `ON DELETE CASCADE`; `template_key` + `template_params jsonb` for system sends rendered client-side from `inbox.templates.<key>`, or literal `title` / `body` for admin sends; `sent_at`, `read_at`; check constraints `chk_message_content` — template **or** title+body — and `chk_read_after_sent`). Routes: `GET /v1/messages?yandexPlayerId=` and `PATCH /v1/messages/read` (both unauthenticated, on the ADR-103 client-asserted-ID funnel, sharing the 60 req/min limiter; **`403 not_citizen`** for non-citizens **and** missing profiles, gated in SQL) plus internal `POST /internal/v1/messages/send`. **`InboxRepository.ts` is the only reader and writer of that table**, and both post-commit citizenship seams — `PlayerProfileRepository.afterCitizenshipEarned` and `PaymentsRepository.afterPaidPurchaseGranted` — send through its `InboxSender` interface, which **contractually never throws**, so an inbox failure cannot break a grant. See [[features/announcements]].
- **Name change (task `0067`, built 2026-08-28; code deployed 2026-08-29 in release `362a2f9`, but nothing about it has run — the UI has still never been seen in a browser, `CITIZENSHIP_CARD_ENABLED` is `false`, and `PROFILE_INTERNAL_TOKEN` was deliberately left blank so the game server's profile calls no-op)**: migration `004_name_change.sql` adds `rejection_reason` + `decided_at` to `player_name_history`, a **partial unique index** enforcing one pending request per player, and a latest-request index. Routes: `POST /v1/profile/name-change-request` and `POST /v1/profile/name-change-cancel` (player, citizen-gated **in SQL**, 30/min per IP) plus internal `POST /internal/v1/name-change/decide` (`internalAuth`, no CORS). `NameChangeRepository.ts` is the data layer; `src/core/validations/usernameRules.ts` is the dependency-free extraction that lets the profile server share the in-game validator; `src/core/notifications/TelegramNotifier.ts` is the shared operator-notification helper. `PublicPlayerProfileSchema` gains an optional `name_change` projection, and `GET /v1/profile` **degrades rather than 500s** if that lookup fails, because it drives the whole citizenship card. See [[tasks/citizenship-name-change]].
- **Citizen flag on the game path (task `0068`, built 2026-08-28; code deployed 2026-08-29 in `362a2f9` — no profile writes reach the DB in production yet, so no player is a citizen there to flag)**: `upsertProfile` on the game server now returns the profile row's `is_citizen`, which `GameServer` attaches to `Client` and freezes onto the match roster at `start()` and onto the 1 Hz lobby-poll payload at `gameInfo()`. **The profile server's SQL is the sole authority for that flag** — never a value read back off a game record. See [[tasks/citizen-verified-icon]].
- **Runtime boundary**: game servers should credit via the profile API using service auth and IP allowlisting; they should not hold direct profile DB credentials.
- **Guest path**: the T2/T7 guest-first flow is cancelled. Profile XP is authenticated-only through the T6 server-side crediting path.

## Gotchas / Known Issues

- The Yandex ID carried through match join is still an unsigned client-provided value. Earned-XP crediting must either accept that risk for non-monetary XP or add signed identity plumbing; paid state relies on Yandex Payments HMAC verification, implemented in 0019 but not yet live-verified (no secret key until catalog approval).
- `PROFILE_API_URL` has to be present in the game-server deploy environment or `/api/env.profileApiUrl` stays empty. T4h is the completed fix for that deploy gap.
- Profile outages must not stop active matches. T6 keeps match-end crediting fail-soft: after bounded retries, credits may be dropped rather than blocking winner handling or cleanup.
- The duplicate backup-task conflict is resolved as of 2026-06-29 and canonical T8 is now done. Off-box backup activation is fail-closed: missing or partial `PROFILE_BACKUP_*` config keeps first deploys on local weekly dumps, but an already off-box-configured box refuses a silent downgrade unless `PROFILE_BACKUP_DISABLE_OFFBOX=1` is explicit.
- The first restore drill used an empty production DB. Restore mechanics were verified, but a non-empty data round-trip should be rerun once real profiles/entitlements exist. 🔴 **2026-09-04: WHETHER ANY BACKUP IS RUNNING IS UNKNOWN.** ⚠️ *(This corrects an earlier same-day annotation here that asserted "NO BACKUPS ARE RUNNING — there is no box to run them on"; the box exists, so that assertion was an overstatement.)* The box and the bucket exist and are reused in place; whether a backup has ever completed, and when, is one of the UNKNOWN fields `0215` must read (`last-backup.json`), as is what objects the bucket holds. The drill's own command line no longer works (it predates the restore path's default-deny guard). The survey also records that **nothing reads the backup-freshness marker and no monitoring or alerting of any kind exists**, so a backup that stops would be invisible while retention keeps pruning. The durability phase (`0218`) owns proving restore against non-empty data, and Q3 — **who holds the new `age` private key, where it lives, and where the second copy is** — must be answered **before the first backup runs**.

  🔴 **The `age`-key question is RE-OPENED as a live owner decision (2026-09-04).** ⚠️ *(It had been recorded on this page's first same-day pass as closed by the clean-slate ruling — that was premature and is corrected here rather than quietly dropped.)* **Because the bucket is reused rather than replaced, any pre-existing encrypted objects are still sitting in it.** Those objects were encrypted to an `age` recipient whose private identity **has no recorded home** — every reference in the repo is policy: no vault, no entry, no custodian, no second copy, no readability check — and **when asked on 2026-09-04 what the `age` key was, the owner did not know.** ⇒ **Without that private identity those objects are permanently unreadable**, and they are dead weight in a bucket that is being paid for. The open decision — **purge them, or keep them pending a search for the old key?** — is tracked in **`0222`**. Everything about the **new** key stays with `0218`.
- 152-ФЗ compliance is unresolved after the hash-based avoidance plan was cancelled. See [[decisions/personal-data-152fz-compliance]].
- 🚨 ~~**Every payments route returns 503 on the real box (verified 2026-08-28, task `0195`)**~~ 🔴 **REFRAMED 2026-09-04 — "verified on the real box" is UNVERIFIED: nobody has confirmed what is running on that box.** ⚠️ *(This corrects an earlier same-day annotation here that said "there is no real box" — the box exists; what is on it is unknown.)* ⛔ **`0195`'s CODE FIX STANDS and is NOT under question**; what is corrected is only its *production narrative*. The route behaviour below is what the code does with an empty variable, and it holds wherever a box carries an empty value. Original text, kept:
  **Every payments route returns 503 (verified 2026-08-28, task `0195`)**: `build-deploy-profile.sh`'s staged-export block omits `YANDEX_PAYMENTS_SECRET`, so `setup-profile.sh`'s `${YANDEX_PAYMENTS_SECRET:-}` writes it **empty** into `profile.env` and the `paymentsEnabled` middleware 503s `/v1/payments/*` wholesale — true since `0019` shipped. `example.env.profile` does not document the variable at all, so an operator has no way to learn it is a deploy input. **Third instance of the config-parity class and the first outside `deploy.sh`** — see [[decisions/config-parity-failure-class]]. Blocks `0065`. 🔧 **Updated 2026-09-02 — the DEPLOY SCRIPT is fixed; the ROUTES STILL 503.** `0195` shipped 2026-09-01 (the variable joins the staged-export block; `example.env.profile` now documents it) and closed as **built + Deferred Live Tail, agent-closed and not owner-verified**. **`0014` has not issued the per-game key**, so the value lands **empty** on the box and `/v1/payments/*` correctly keeps failing closed. **A profile deploy carried out today changes nothing observable here.** See [[tasks/yandex-payments-secret-forwarding]].
- 🚨 **The pending, unmoderated requested name is publicly readable (task `0067`, UNMITIGATED)**: `GET /v1/profile` is unauthenticated and enumerable by a non-secret player id, and `toPublicProfile` returns `name_change.requested_name` — whatever was submitted, before any operator sees it. **This passes no gate at all.** The moderation gate reviews a name before it is APPLIED, never before it is PUBLISHED. Owner-ruled to keep the field so a player can see their own request. Do not describe it as mitigated or bounded.
- ⚠️ **`is_citizen` is served on the unauthenticated lobby-poll endpoint `GET /api/game/:id` (task `0068`, residual R3)** — accepted **only while the flag stays purely cosmetic, and VOID the moment anything of value is gated on it**, at which point the exposure must be re-decided.
- ✅ **Double-crediting is ALREADY IMPOSSIBLE at the database layer — VERIFIED against the real schema 2026-09-04**, not against a doc comment. `player_match_xp_credits` carries
  **`primary key (game_id, yandex_player_id)`**; the insert is `ON CONFLICT … DO NOTHING`, and — the load-bearing part — **the XP increment is gated on the insert having happened**, in **one statement**, so there is no window between them. A duplicate is not merely "not inserted": **it does not increment XP.** ✅ **Proven by integration test against real Postgres, including the CONCURRENT case.**
  ⚠️ **Three conditions ride with it:** (1) 🔴 **both crediting paths must use the SAME `gameId`** — a derived key like `${gameId}:elim` would defeat the primary key entirely, and it is **the single easiest way to get this wrong**; (2) it is a **correctness** guard, not an efficiency one — an in-memory latch is still worth having, but ⛔ **must not be described as the double-credit fix**; (3) it does **not** protect against a **changed Yandex id** — a late `update_identity` between two credits yields two different keys and **both succeed.** Narrow, but real.
- 🔴 **The server does not know when a player is eliminated — there is NO channel for it.** Elimination is computed **client-side**; the server is a **turn relay, never a simulator**. It is a *state transition*, not an event: there is **no `PlayerDied` update**, and death is observable only via `PlayerUpdate.isAlive` — where `isAlive()` is literally *"owns ≥ 1 tile"*. ⚠️ **This is the central design problem for [[tasks/credit-participation-xp-elimination-or-match-end]] (`0211`)**, not a detail to route around. 📌 An eliminated player **stays fully connected** (the death modal offers "spectate"), which is why they still pass the not-disconnected gate at the moment of death.
- 🔴 **`creditMatchXp` has exactly ONE call site, inside `handleWinner` (`src/server/GameServer.ts:1199`).** ⇒ **No winner ⇒ no crediting, ever.** ⚠️ **Decoupling it is the substance of `0211`.**
  ⛔ **`GameServer.end()` is the WRONG seam for that** — `phase()` requires `noActive`, and `selectMatchCredits` excludes anyone absent from `activeClients`, so crediting hooked there **would award ZERO in every match that ends the normal way.** *"It would look implemented and do nothing."* **Structural, not a preference.**
- 🚨 **The whole crediting path is a no-op in production (verified 2026-08-23, task `0062`)**: `deploy.sh` never forwards `PROFILE_INTERNAL_TOKEN`, so `ProfileApiClient.isConfigured()` is false and both `upsertProfile()` and `creditMatch()` silently no-op (the miss is logged at `debug`, invisible in prod logs); the profile server independently fails **closed** on the empty token. Net effect: **no profile row is ever created and no XP is ever credited in production** — this blocks earned (`0017`) and paid (`0018`) citizenship. The fix is one line in `deploy.sh`. Found by the 2026-08-22 outage config-drift sweep; see [[decisions/incident-2026-08-22-public-lobbies-outage]].

## Related

- [[systems/player-infrastructure]] — pre-S4 identity/customization substrate
- [[systems/configuration]] — `/api/env` and `PROFILE_API_URL` runtime/deploy configuration
- [[tasks/profile-schema-contract]]
- [[tasks/player-profile-store-investigation]]
- [[tasks/profile-api-url-config]]
- [[tasks/profile-deploy-hardening]]
- [[tasks/profile-game-server-deploy-env]]
- [[tasks/profile-backend-db-api]]
- [[tasks/profile-match-end-crediting]]
- [[tasks/postgres-backup-routine]]
- [[tasks/citizenship-xp-progress-ui]]
- [[tasks/yandex-payments-implementation]] — the 0019 payments endpoints and paid-flag grant path hosted here
- [[tasks/yandex-payments-secret-forwarding]] — task `0195`, the deploy gap that 503s those payments routes; fixed in the repo 2026-09-01, not in production
- [[tasks/supertest-profile-server-flake]] — task `0200`, the flake in this service's route test suites; confirmed as a host-level socket-accept loss, not a repository defect
- [[decisions/profile-storage-strategy]]
- [[decisions/profile-deploy-hardening-review-loop]]
- [[decisions/sprint-4]]
- [[features/announcements]] — the popup surface the task-0012 personal inbox attaches to
- [[decisions/adr-103-identity-trust-seam]] — the client-asserted-ID funnel the inbox read routes share
- [[decisions/sprint-backlog]]
- [[decisions/cancelled-tasks]]
- [[tasks/personal-data-compliance-investigation]]
- [[systems/project-brief]] — citizenship as the product's supporter tier
- [[systems/glossary]] — the three player IDs this store depends on: XP participation is keyed by **`clientID`**, not the PII `persistentID`
- [[systems/architecture-overview]] — the profile backend tier in the wider survey
- [[decisions/adr-101-fail-soft-xp-crediting]] — why crediting drops XP rather than blocking a match
- [[decisions/adr-103-identity-trust-seam]] — the single unverified-identity funnel this store is keyed on
- [[decisions/incident-2026-08-22-public-lobbies-outage]] — the sweep that exposed the `0062` token-forwarding gap making crediting a prod no-op
- [[tasks/citizenship-name-change]] — 0067's name-change endpoints, migration 004, and the unmitigated pending-name exposure
- [[tasks/citizen-verified-icon]] — 0068's `is_citizen` propagation from `upsertProfile` onto the frozen roster and lobby poll
- [[decisions/config-parity-failure-class]] — the class behind both `0062` and `0195`, the two gaps that keep this store inert in production
- [[decisions/clientless-leader-win-policy]] — a **third**, independent way this store gets no data: an FFA match led by a bot or a Nation sends no `winner` message, so `creditMatchXp` is never called at all. **Live, unfixed** (🔴 **`0206` was reverted 2026-09-04**), and **not** the `0062` config gap. 🔴 **MEASURED 2026-09-04** — a Nation at 100.0 % of the map, the match never ending, `archiveGame` with no `winner` attribute and no player stats. **Team mode has the same defect**
- [[tasks/win-check-clientless-leader-guard]] — task 0022, which found and traced that path
- [[decisions/adr-110-ai-winner-allowed]] — an AI winner is **credited nothing** here (it fails three independent gates in `selectMatchCredits`); what the award does is **unblock crediting for every real player** ⚠️ **CARRY THE QUALIFIER: only where a LIVING CLIENTFUL player exists to award to.** Where every clientful player is already eliminated, `players()` filters to `isAlive()`, no winner can be named and nothing is unblocked. 🔴 **Dropping this qualifier is exactly how ADR-110's false Consequences bullet came to be written — see [[decisions/adr-110-ai-winner-allowed]].** ⚠️ Its reasoning is contingent on crediting never becoming winner-dependent, and it **carries a known expiry**
- [[tasks/teams-bot-team-win-stall]] — task `0205`, the Team-mode form of the same missed-crediting path
- [[tasks/winmodal-participation-comment-correction]] — task `0207`; the participation list is harmless for AI players **only** because of this store's frozen-start-roster gate
- [[tasks/ffa-clientless-leader-fallback-award]] — task `0206`, the award built to let `creditMatchXp` run in a clientless-leader FFA match. 🔴 **REVERTED 2026-09-04, never deployed — and it was a NO-OP in the case that actually loses the XP**
- [[tasks/credit-participation-xp-elimination-or-match-end]] — task `0211`, **the replacement**: credit at **elimination or match end**, independent of any winner. **Its ship is ordered behind `0208`**
- [[tasks/measure-clientless-leader-and-solo-awards]] — task `0208`, which must be deployed and collecting data **before** `0211` ships, or the pre-fix denominator is destroyed
