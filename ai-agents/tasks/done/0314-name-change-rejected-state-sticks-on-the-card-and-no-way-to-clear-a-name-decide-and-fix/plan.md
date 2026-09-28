# Plan: task 0314. The "declined" notice sticks on the card, and there is no way to clear a name

**Summary**
- **Both gaps are confirmed in the code** (the producer's brief had not checked them line by line):
  - Gap 1: the card shows the player's **newest** request. Withdraw deletes only a *pending* request. So a declined notice stays until another name is approved.
  - Gap 2: exactly **one** line of code ever writes `players.display_name`, and it is the approve path. Nothing can set it back to empty.
- **Step 0 needs two owner decisions** (questions below). This plan is written for the **recommended** pair: a Hide button remembered by the server, and an operator "clear" command. For each alternative there is a short section saying what changes.
- The recommended pair needs **one small migration (`007`)**: a new `dismissed_at` column, plus a new history status `cleared` for the audit row.
- **Reuses 0312's command. No new command shape.** Clearing is a third decision, `"decision":"clear"`, on the same `npm run -s name-change:decide` and the same decide route, with the same `expectedName` binding (bound to the player's **current** name) and the same reason handling.
- Builds on the uncommitted 0307/0302/0312/0313/0315 work in the tree and undoes none of it. Does not absorb 0308, 0303 or 0317.
- Nothing will be committed.

## Evidence for the two gaps (code as it stands in the tree, including the uncommitted work)
- `src/profile-server/NameChangeRepository.ts:189-197` `LATEST_SQL`: newest `player_name_history` row, no other filter. `getLatestState` (`:457-468`) maps it straight onto the profile's `name_change` field.
- `src/client/CitizenshipCard.ts:441-464` `renderNameChange`: `rejected` → `renderNameRejected` (`:532-552`), which has only "Try another name". Cancelling the editor (`:646-650`) goes back to the rejected notice.
- `NameChangeRepository.ts:153-156` `CANCEL_SQL`: deletes only `moderation_status = 'pending'`. A decided row can never be removed, by design.
- `NameChangeRepository.ts:172-175` `APPLY_NAME_SQL` is the **only** writer of `display_name` in `src/profile-server` and `src/core` (git grep). It is reached only from `approveInTransaction` (`:412-439`).
- `migrations/006_player_identity.sql:131-150`:
  - `new_display_name text not null`
  - the inline CHECK allows only `pending`/`approved`/`rejected`
  - `moderation_status` defaults to `'approved'`. That is the known trap, and it is kept.
- `players_display_name_uq` is a partial unique index `where display_name is not null` (`006:90-92`). **Setting the name to NULL frees it automatically.**
- `src/client/PlayerProfileView.ts:100`: `displayName: profile.display_name ?? <platform name>`. A NULL name already shows the default name on the card, with no client change.
- Today an approved name is shown **only on the player's own card**. No game-server or match code reads `display_name` (task 0317 is investigating that). The harm from an offensive approved name is small today and grows if 0317 ships.

## Design (recommended pair)

### Gap 1: a "Hide" button on the declined notice, remembered by the server
- **Migration `007`:** `alter table player_name_history add column dismissed_at timestamptz;`
- **Repository** `dismissRejection(playerId)`:
  - Citizen check in SQL, like every player call (`isCitizen`, `:470-473`).
  - Then: `UPDATE player_name_history SET dismissed_at = now() WHERE id = (SELECT id … WHERE player_id = $1 ORDER BY id DESC LIMIT 1) AND moderation_status = 'rejected' AND dismissed_at IS NULL`.
  - It only ever touches the newest row, and only if that row is a decline. A pending or approved row can never be hidden.
  - Calling it twice is safe; the second call does nothing and still counts as success.
  - Returns `not_citizen | ok`.
- **Projection** (`getLatestState`): newest row is `rejected` with `dismissed_at` set → return `null`, so the card shows its normal idle state. `LATEST_SQL` also selects `dismissed_at`.
  - The wire contract (`NameChangeStateSchema`, `NameChangeContract.ts:138-142`) is **unchanged**, so no client version skew.
- **Route** `POST /v1/profile/name-change-dismiss`, next to cancel (`Routes.ts:1252-1281`):
  - Body schema `z.object({})`.
  - Answers 200 `{status:"ok"}` · 400 · 401/503 (`sendCallerFailure`) · 403 `not_citizen` · 500.
  - Added to the CORS, rate-limit and enabled loop at `Routes.ts:1190-1195`.
  - Added to the `NameChangeRepo` interface (`:259-272`).
  - Profile nginx needs no change: the catch-all `location /` already serves it (`setup-profile.sh:1441`).
- **Client**, `src/client/NameChangeRequest.ts`: `dismissNameChangeRejection()`, the same never-throw `postJson` pattern as cancel.
- **Card**, `renderNameRejected`:
  - Add a Hide button, `#citizenship-name-change-dismiss`, next to "Try another name".
  - Tap → the shared in-flight guard → call → `refreshProfile()`. The server stays the source of truth: nothing is stored on the device, following the card's own rule at `:92-93`.
  - On error, show the `error_generic` line and keep the notice.
- **Text:** `citizenship_name_change.dismiss`, en "Hide" / ru "Скрыть" (drafts; change them at approval if you like). Both files, no game name (0311).
- No new HTML element in `index.html` or `yandex-games_iframe.html`: the button lives inside the existing `<citizenship-card>`.

### Gap 2: an operator "clear name" command on the 0312 surface
- **Migration `007`, same file:**
  - `alter column new_display_name drop not null`
  - drop the auto-named CHECK `player_name_history_moderation_status_check`, with **no** `if exists`, so a wrong name fails loudly inside the migration's transaction
  - add a named CHECK allowing `pending/approved/rejected/cleared`
  - add a CHECK `(moderation_status = 'cleared') = (new_display_name is null)`
  - The default `'approved'` trap is left exactly as it is.
- **Contract** (`NameChangeContract.ts:74-104`):
  - `decision` enum gains `"clear"`.
  - The existing refine for a non-blank reason now covers `reject` **and** `clear`.
  - New refine: `clear` **requires** `expectedName`. Approve and reject keep it optional on the wire, so the contract the owner ruled on in 0067 is untouched.
  - `NameChangeDecisionResponseSchema` gains `no_custom_name`.
  - The wire `NameChangeStatus` stays three values, because `cleared` is never sent to the client.
- **Repository** `clearDisplayName(playerId, expectedName, reason)`, all in one transaction:
  1. `LOCK_PROFILE_SQL` (`:166-170`).
  2. No player row, or `display_name` already NULL → `no_custom_name`.
  3. `expectedName.trim() !== display_name` → `name_mismatch` carrying `currentName`.
  4. Otherwise: `UPDATE players SET display_name = NULL, updated_at = now()`, then `INSERT player_name_history (player_id, old_display_name, new_display_name, moderation_status, rejection_reason, decided_at) VALUES ($1, <removed name>, NULL, 'cleared', <reason>, now())`. The reason goes in the existing `rejection_reason` column, documented in a comment.
  5. COMMIT.
  - After the commit: an inbox message using a new template `name_change_cleared` with `{name, reason}`, sent through the same never-throw hook (`afterNameChangeDecided`, `:481-496`, with its key type widened).
  - One `log.info` line naming the history row id only. No name and no player id (brief privacy note).
  - A pending request, if one exists, is **left alone**. The operator decides it separately, and the runbook says so.
- **Projection:** newest row `cleared` → `null` (idle). The card then shows the default name through `PlayerProfileView.ts:100`.
- **Route** (`Routes.ts:1313-1362`):
  - `decision === "clear"` calls `clearDisplayName`.
  - It answers 200 · 404 `no_custom_name` · 409 `name_mismatch` with `current_name` · plus the same 400/401/503/500 as today.
  - The comment block is extended with the clear request and response.
- **Command** (`NameChangeDecideCommand.ts`):
  - `parseDecideInput` (`:54-133`) treats `clear` like `reject`: the reason is required, the `REPLACE-WITH-REASON` placeholder is refused, and the 500-character limit applies. `expectedName` is already required for every decision.
  - `describeDecideResponse` (`:157-232`) gets clear-specific wording for 200, 404 `no_custom_name` and 409 `name_mismatch`. On a 409 it prints `current_name` through `escapeForTerminal`.
  - No change to token handling, the entry file or `package.json`.
- **Inbox** (`src/core/profile/InboxContract.ts:25-58`): add `name_change_cleared` to `INBOX_TEMPLATE_KEYS`, and `["name","reason"]` to the required params.
  - Draft text, en: title "Your display name was removed"; body "Your display name ''{name}'' was removed by a moderator — {reason}. You can request a new name at any time."
  - Draft text, ru: title "Ваше имя удалено"; body "Ваше имя «{name}» удалено модератором — {reason}. Вы можете запросить новое имя в любое время."
- **The Telegram per-request message is unchanged.** Clear acts on an approved name, not a pending request. It is documented in the runbook only.
- **Runbook** (`ai-agents/knowledge-base/name-change-digest-runbook.md`): new subsection *Removing an approved name (task 0314)* after *Rejecting*. It covers:
  - the command shape with placeholders and `"decision":"clear"`, and where to run it (same rules as 0312)
  - a read-only lookup of a player's id and current name
  - a note that a pending request is not touched
  - new rows in the outcomes table
  - a read-only check (`moderation_status = 'cleared'` on the newest row, and `display_name is null`)
  - Variable names only. No host, IP, token, id or name.

## Steps (in order)
1. `migrations/007_name_change_dismiss_and_clear.sql` (both parts above).
2. Contract changes (`NameChangeContract.ts`, `InboxContract.ts`).
3. Repository: `dismissRejection`, `clearDisplayName`, the `getLatestState` / `LATEST_SQL` projection rules, and the doc comments. Keep the "the only component that touches `player_name_history`" rule (`:1-3`).
4. Routes: the dismiss route and CORS loop entry, `clear` dispatch in decide, the `NameChangeRepo` interface, comments.
5. Command: parse and describe changes.
6. Client: `NameChangeRequest.ts` dismiss call, and the card button.
7. Lang: `en.json` + `ru.json` get `citizenship_name_change.dismiss` and `inbox.templates.name_change_cleared.{title,body}`.
8. Runbook section.
9. Tests (below), then run the checks.

## Tests
- **`tests/profile-server/NameChangeRepository.test.ts`** (mocked pool):
  - `dismissRejection`: the citizen gate, and SQL limited to the newest row + `rejected`.
  - `getLatestState`: rejected+dismissed → null; rejected not dismissed → rejected; cleared → null (never the string `"null"`).
  - `clearDisplayName`: ok (query order, NULL update, `cleared` audit row with the old name and reason, inbox sent after the commit); `no_custom_name`; `name_mismatch` carrying the current name; rollback on error; `expectedName` trimmed.
- **`tests/profile-server/NameChangeRoutes.test.ts`** (supertest):
  - dismiss: 200 / 400 / 401 / 403 / 503, and the CORS header on the new path
  - decide `clear`: 200 / 404 `no_custom_name` / 409 with `current_name` / 400 without a reason or without `expectedName`
  - approve and reject answers unchanged
- **`tests/profile-server/NameChangeDecideCommand.test.ts`:**
  - clear refused with exit 2 when the reason is missing, blank or the placeholder
  - posted body exact
  - clear-specific 200/404/409 wording
  - an ESC / U+202E `current_name` is printed escaped
- **`tests/client/CitizenshipCard.test.ts`:**
  - the rejected state shows the Hide button
  - tap → dismiss called → refresh → idle CTA
  - on error the notice stays and the error line shows
  - after hiding, CTA → editor → submit still reaches pending
- **Client dismiss mapping test.** Extend **`tests/client/NameChangeLang.test.ts`** for the new keys in both languages.
- **`tests/integration/NameChange.it.test.ts`** (real Postgres):
  1. Reject → dismiss route → `GET /v1/profile` has no `name_change` → a new request works (pending).
  2. Approve a name → decide `clear` → `players.display_name` is NULL, the profile's `display_name` is null, a history row has status `cleared` with `old_display_name` set, a `name_change_cleared` inbox row exists, and **a second player can then be approved onto the freed name**.
  3. `clear` with a wrong `expectedName` → 409, nothing changed.
  4. The migration's CHECKs: a `cleared` row with a name is refused; a non-`cleared` row with NULL is refused.
- ⚠️ **`tests/integration/Migration006.it.test.ts:150`** expects that exactly `["006_player_identity.sql"]` is applied after 001–004. With `007` present, that assertion **will fail**. It will be changed to expect `006` then `007`. The meaning is unchanged: 006 is still the file under test.
- **Run:** `npm test`, `npm run test:integration` (needs the `gc-0012-it-pg` container; if Docker is down I will say so and not claim a pass), `npx tsc --noEmit`, `npm run lint`. The known supertest flake gets one re-run, and I will say that I re-ran.

## Edge cases and failure modes
- **Hiding a pending or approved row:** impossible, because the SQL is limited to the newest row being `rejected`.
- **Hiding, then a new request:** the new row is newest, so it shows as pending. The hidden flag only affects its own row.
- **Clear racing an approve for the same player:** both lock the player row `FOR UPDATE` (`LOCK_PROFILE_SQL`), so they run one after the other. If clear runs second, `expectedName` checks against the name as it is by then.
- **Clear on a name the operator did not mean:** blocked by the `expectedName` binding → 409, nothing changed.
- **An offensive name echoed in the inbox message:** the player sees their own chosen name once, the same as the approve and decline messages do. Flagged here as a choice you can reverse.
- **Deploy order:** the profile server and the game client deploy separately.
  - An old client on a new server: the new inbox template is hidden until the client updates (the client filters unknown keys, `src/client/Inbox*.ts:196-197`).
  - A new client on an old server: dismiss gets a 404 → generic error. Recommend deploying the profile server first.
- **Migration on the live box:** runs inside the deploy's `npm run migrate` (`setup-profile.sh:1270`), one transaction per file, and a failure aborts the deploy before the switch-over. The table is tiny, so the ALTER's lock is brief.
- **Restore-drill fixtures (`tests/testdata/profile-restore-drill/*`):** these compare the backup against the restored copy of the same database, so a new column does not break them (not re-run here; the drill is owner-run).
- **Forged-login residual (0319):** someone faking a player's login could hide that player's declined notice. Harmless, because the reason stays in the inbox. Clearing is operator-only, so it adds no new griefing path.

## If you pick an alternative instead
- **Gap 1, "remembered on this device only":**
  - No `dismissed_at` column, no route, no server test.
  - The card stores the hidden decline's `decided_at` in `localStorage` (inside try/catch) and hides the notice when it matches.
  - Client tests only.
  - The notice comes back on another device, or after browser storage is cleared.
- **Gap 1, "hide automatically after N days":**
  - No button, no route, no column.
  - `getLatestState` returns null for a decline older than N days (a constant; suggest 7).
  - Repository and integration tests only.
- **Gap 2, "also a player button":**
  - Adds `POST /v1/profile/name-reset` (citizen-gated, same CORS/limiter loop).
  - The idle card gets a "Use my default name" button with a confirm step.
  - It reuses `clearDisplayName`'s transaction with no reason and **no inbox message**, and writes the same `cleared` audit row.
  - ⚠️ Until 0319 closes the forged-login hole, anyone faking a player's login could strip that player's approved name.
- **Gap 2, "SQL in the runbook only":**
  - No code, no `cleared` status.
  - A runbook section with a hand-written transaction (NULL the name, then insert an audit row that must fit today's CHECKs).
  - No inbox message unless one is sent by hand.
  - If Gap 1 also avoids the server, **no migration at all**.

## Not in scope
Which characters a name may hold (0308) · a purchase showing without a reload (0303) · showing names in matches (0317) · the forged-login hole (0319) · internal-route rate limiting (0279) · the digest or Telegram message contents · analytics events (none exist for name change today, and none are added).

## Left for the owner (brief verification)
1. Your two Step 0 answers, recorded word for word before building.
2. **A local run in ru and en may not be possible for me:** it needs a local profile server plus a logged-in citizen session. If I cannot run it, I will say so; the card tests cover both languages' keys, and this becomes owner-run.
3. After deploying (`./build-deploy-profile.sh`, then the client), on a test account: decline → Hide → card idle; approve a name → run the clear command on the box → 200, the card shows the default name, the inbox note arrives, the token is never printed.

## Owner rulings (2026-09-27, live via `AskUserQuestion` in the `fkit lead` session, relayed by fkit-lead) — record verbatim
- **Q1 (declined notice):** "Hide button, server (Recommended)" — a 'Hide' button; hidden on every device; one small database change and one new call.
- **Q2 (removing an approved name):** "Operator command (Recommended)" — a third choice 'clear' on the existing approve/reject command: needs a reason, player gets an inbox note, history keeps a record, the name becomes free.
- **Q3 (inbox note repeats the removed name):** "Yes, like the others (Recommended)" — consistent with the approve/decline notes.
- **Draft texts** ("Hide" / "Скрыть"; the inbox note drafts above) approved with the plan.
