# Citizen Verified Icon

**Source**: `ai-agents/tasks/done/0068-citizen-verified-icon/brief.md`
**Status**: done
**Sprint/Tag**: Sprint 4 — Phase 2 citizenship benefits — task `0068`

> ✅ Done (agent-closed 2026-08-28 — **not owner-verified**). Closed by a producer spawned by the sprint ship-loop; no owner channel existed at close, so **no human verified this work**.
>
> 🚨 **Nothing here is verified in production**, exactly as with `0067`. Everything below is local or local-stack evidence.
>
> 🔧 **UPDATED 2026-08-30 — the code IS now deployed; its behaviour is still unchecked.** A production release landed as commit `362a2f9`, and this task's `isCitizen` work is in it (it landed in `d442ac2`, an ancestor of that release). **That is a statement about bytes on the box, not about the feature working**: `CITIZENSHIP_CARD_ENABLED` is still `false`, and `PROFILE_INTERNAL_TOKEN` was deliberately left blank for this release, so the game server's profile calls no-op (task `0062`, still open) and no player is a citizen in production to badge. ⚠️ **R3's exposure ships with it, though:** `isCitizen` is now being served on the unauthenticated lobby poll in production. That remains acceptable only while the flag is purely cosmetic — the condition below is unchanged and unsoftened. See [[tasks/prod-api-env-https-apex]] for the deploy evidence.

## Goal

Make citizenship socially legible: a server-authored `isCitizen` flag that reaches every client identically, rendered as an icon beside the player's name in the lobby player list and the in-match player list/panel.

The hard part was never the icon — it is **propagating other players' citizenship**, since a client only knows its own profile. Any flag entering `src/core/` player-visible state is desync-sensitive, so it must travel the join/roster path and never a per-client fetch.

Scoped 2026-08-24 by owner ruling; the icon-design open question was ruled 2026-08-28 — **ship a neutral placeholder glyph now, file the real design as a follow-up**, mirroring the `0066` favicon precedent. No country or flag imagery either way (Yandex constraint).

## Key Changes

- **`src/core/Schemas.ts`** — `PlayerSchema` gains `isCitizen: z.boolean().default(false).catch(false)`; `ClientInfo` gains optional `isCitizen`.
- **`src/server/ProfileApiClient.ts`** — `upsertProfile` now returns `Promise<boolean>`, parsing the response the endpoint already returns with `PublicPlayerProfileSchema` and yielding `is_citizen`. **Every** failure path returns `false` (unconfigured, transport error, 4xx incl. 409, 5xx after retries, unparseable body) and it never throws.
- **`src/server/Client.ts`** — `public isCitizen = false`, commented as display-only and explicitly not an entitlement gate.
- **`src/server/GameServer.ts`** — the upsert result is attached fire-and-forget (set **true only**); the reconnect branch carries the previous value; `start()` puts the flag on the **frozen roster** (single freeze point); `gameInfo()` puts it on the 1 Hz lobby-poll payload; `archiveGame()` carries it from the frozen roster.
- **`src/core/game/GameView.ts`** — exported pure `citizenClientIDs(humans)`; `PlayerView` gains a fifth ctor arg and an `isCitizen()` accessor. Nations and bots have no `clientID`, so they are `false` by construction.
- **`src/client/CitizenBadge.ts`** (new) — one `renderCitizenBadge()`, placeholder `★` as a text span with `role="img"`, `aria-label` and `title`, both strings via `translateText`. No SVG, no asset, no custom element (so neither HTML template needed updating), no flag imagery.
- **Four UI surfaces**: `HostLobbyModal`, `JoinPrivateLobbyModal` (state widened `string[]` → `ClientInfo[]`), `Leaderboard`, `PlayerPanel`. New `citizen_badge` section in **both** `en.json` and `ru.json`.

**Divergence from the plan, recorded.** `.default(false)` makes the field **required in the parsed output type**, so nine hand-built literals stopped compiling — `ClientGameRunner.ts`, `LocalServer.ts`, `Main.ts` (×2), `SinglePlayerModal.ts`, `GameServer.ts` (×2), and a test. Each got the flag from the truthful source. The change surface is larger than the plan estimated: 12 source files plus 1 test file touched, 3 new test files.

**Review R1 was a comment-only fix with real teeth behind it.** The `isCitizen` docstring claimed "no client-supplied path exists", which the coder traced and found **false**: `PlayerRecordSchema` → `GameEndInfoSchema.players` → `PartialAnalyticsRecordSchema.info` → `PartialGameRecordSchema`, which `POST /api/archive_singleplayer_game` `safeParse`s off a client-POSTed body. Both mitigations were confirmed too — no reader of `isCitizen` off a record exists anywhere in `src/`, and `archive()` no-ops behind `config.archiveEnabled()` ([[decisions/adr-104-archiving-disabled]]) — so the comment really was the whole defect. The replacement scopes the guarantee to the live game path and states the durable rule: **never trust a record's value, never gate anything of value on this flag, the profile server's SQL is the sole authority.** The schema line itself is byte-unchanged.

## Outcome

**The mandatory live multi-client desync check actually ran** — 3 real browser clients driven with Playwright against a real local stack (throwaway migrated Postgres, real profile server on 8081, real dev game server), with a mixed citizen / non-citizen / guest roster:

- **Step 1 — the icon appears on ANOTHER client's screen: PASS.** Exactly 1 `.citizen-badge` in client C's leaderboard, on the citizen, with `aria-label="Citizen player"`.
- **Step 2 — non-citizens and guests show no icon: PASS**, on every surface, on every client.
- **Step 3 — fail-soft exercised for real, not reasoned about: PASS.** The profile server was killed; the join completed immediately, no badge appeared, retries logged at `warn`, and there were **zero `"level":"error"` lines** for the whole session.
- **Step 4 — desync: PASS. 280 state-hash windows compared across turns 650–3440 on all three clients simultaneously — 0 mismatches**, with the server independently logging 0 desync messages. This is stronger than "no desync was reported": the per-turn hashes were compared directly.

⚠️ **One temporary patch was needed and was reverted.** Local dev has no Yandex SDK, so every local client is a guest and a mixed roster is otherwise unreachable; `Main.ts` temporarily read a `?devYandexId=` query param. **The id source was simulated** — everything downstream of it (the upsert HTTP call, the profile row, the frozen roster, the broadcast, all four UI surfaces) was the real code path.

Green at close: `tsc`, `lint`, `prettier --check`, `npm test` **106 suites / 1072 tests**, integration **5 suites / 70 tests**. Stateful review Round 1, all three findings dispositioned, reviewer re-verified in a phase-2 pass and found nothing new.

**Nine accepted residuals. Two carry conditions that must not be softened.**

1. 🚨 **R3 — `isCitizen` is served on the UNAUTHENTICATED lobby-poll endpoint `GET /api/game/:id`.** Verified unauthenticated: the middleware ahead of the route is worker-path routing, compression, json, static and a rate limiter, with no auth. Accepted **only while the flag stays purely cosmetic. This disposition is VOID the moment anything of value is gated on `isCitizen`** — an entitlement, a purchase, a permission — **at which point the payload exposure must be re-decided.**
2. **R2 — the `GameView` wiring line and `PlayerView.isCitizen()` are untested.** Recorded as a **coverage GAP — never as coverage.** Only the extracted pure `citizenClientIDs()` is covered; the nation/bot `?? ""` collapse is reasoned about, not exercised.

The other seven: no pre-match icon in public quick-play (there is no public-lobby player list to put one in — owner-accepted, amendment 2); the placeholder `★` pending the design follow-up; the [[decisions/adr-103-identity-trust-seam]] trust level (a forged id can mint a **cosmetic** icon — it gates nothing); freshness bounded by the last join, so becoming a citizen mid-lobby shows no icon until the next join; singleplayer shows no icon; a late roster-freeze race for a player who joins in the last moment while the profile API is slow; and a late `update_identity` refresh that updates the lobby list but not the already-frozen match roster.

**Two defects were routed OUT rather than absorbed, so the routing stays traceable.**

- **`0198`** — the private-lobby Start Game URL. Found here, filed separately, and later measured to be a **live production defect** on Yandex Games. See [[decisions/windoworigin-url-join-defect]].
- **`0197`** — test-suite reliability. Strengthened with this task's evidence: a jest-worker `SIGSEGV` on `tests/UnitGrid.test.ts`, a file this task never touches, plus a one-off failure in `0067`'s `NameChangeRoutes.test.ts` that then passed four consecutive full runs. Neither was hidden or silently retried.

  > 🔧 **Follow-through, 2026-08-30 — `0197` closed, and it corrected one thing this page fed it.** The segfault is an **upstream V8 garbage-collector bug, not repository-fixable** (five byte-identical `ClearStaleLeftTrimmedPointerVisitor` stacks, ~1 in 170 runs); no mitigation was bought, so **a red run stays ambiguous** by owner ruling. ⚠️ **This task's own `review.md` (line 153) rolled the `NameChangeRoutes` assertion failure into its segfault list, making the count five when it is four.** That file is finished output and was **not** edited; the correction of record lives in `0197`'s brief and findings report. The `NameChangeRoutes` failure is a real, separate, ten-times-more-frequent flake, now task `0200`. See [[tasks/test-suite-reliability-investigation]].

## Related

- [[tasks/citizenship-name-change]] — task `0067`, the other Phase 2 citizenship benefit, built the same day and independent of this one
- [[systems/player-profile-store]] — the `is_citizen` column and the `upsertProfile` response this flag reads
- [[systems/networking]] — the lobby-poll payload and the frozen-roster broadcast the flag rides
- [[systems/game-loop]] — the state-hash desync check this task had to satisfy
- [[decisions/adr-103-identity-trust-seam]] — the client-asserted-id trust level behind the forged-icon residual
- [[decisions/adr-104-archiving-disabled]] — why the client-POSTed singleplayer archive path is inert
- [[decisions/windoworigin-url-join-defect]] — task `0198`, found while running this task's live check
- [[tasks/test-suite-reliability-investigation]] — task `0197`, the other defect routed out of this one; it found the upstream V8 cause and corrected this task's five-vs-four segfault count
- [[tasks/prod-api-env-https-apex]] — task `0063`, whose close-out carries the `362a2f9` production-deploy evidence this page now cites
- [[decisions/yandex-invite-portal-boundary]] — task `0199`, the product question `0198` surfaced and left open
- [[tasks/hide-citizenship-card-flag]] — task `0054`, the flag hiding the wider citizenship surface
- [[decisions/sprint-4]] — the sprint board carrying this task
