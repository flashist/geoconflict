## 0321 — Prefill and lock the start-screen name to a citizen's approved name

**Summary**
- **The main finding is not in the brief.** On the Yandex page (`src/client/yandex-games_iframe.html:287`), the row holding the name box is `style="display: none;"`, and has been since the Yandex port (`18bb3e3`). Real players never see the name box. So on Yandex the D4 lock and its hint cannot be seen. Only the prefill has an effect: the approved name becomes the name sent at join. The lock and hint are visible only on the standalone page (`src/client/index.html:188`). Owner question Q3.
- **Source of the approved name: the citizenship card publishes it, and the name box listens.** A copy of the 0302 `CitizenshipStatus` pattern. No second profile read is added, so the rule "the card is the only profile reader" (`CitizenshipCard.ts:192`, `CitizenshipStatus.ts:4-7`) holds.
- **0250 S1 checked.** `toPublicProfile` still returns `display_name` to unverified callers (`src/profile-server/PublicProjection.ts:65-73`: `...rest` keeps it; only xp, earned_at and updated_at are made equal for paid and earned citizens). So the client already receives it. **No server change, no contract change, deploy is client-only.**
- **0326 (stale profile read) does not block this and is not made worse.** Details in section 6.
- **Steps 6 and 7 of the brief's checks need the owner** (a citizen with an approved name, on a Yandex draft). They cannot run locally: the standalone dev page has no Yandex identity (`PrivateLobbyAccess.ts:37-41`).

### 1. How things work today (evidence; line numbers are from the uncommitted tree)

| What | Where |
|---|---|
| Name box fills on mount: Yandex `getCurPlayerName()`, then `localStorage["username"]`, then `sanitizeUsernameForJoin`, then `Anon####`; the result is written back to storage | `src/client/UsernameInput.ts:59-69`, `:133-170`, `:172-176` |
| Every join reads `getCurrentUsername()`, which returns the last name that passed the rule | `UsernameInput.ts:51-55`; callers `Main.ts:768` (multiplayer), `Main.ts:878`, `Main.ts:953`, `SinglePlayerModal.ts:543`, `FeedbackModal.ts:273` |
| Play buttons are gated on `isValid()` | `Main.ts:363,384,528,548`; `UsernameInput.ts:202` |
| The card view computes `displayName: profile.display_name ?? platform name`, `isAuthoritative: true`. The raw `display_name` is **not** kept on the view | `src/client/PlayerProfileView.ts:108-116`; zero-state `:80-86` |
| The card's only read path: `refreshProfile()` = `loadPlayerProfileView()` → publish status → re-render. No ordering guard (this is 0326) | `CitizenshipCard.ts:163-167` |
| The card reads its profile only after platform init, the `CITIZENSHIP_CARD_ENABLED` switch, the `citizenship_ui` flag, and a first render | `CitizenshipCard.ts:103-147` |
| Existing single-writer publisher to copy | `src/client/CitizenshipStatus.ts:32-64`; consumer `PrivateLobbyAccess.ts:53-75` |
| Server join check = trim, then `checkUsernameRules` | `src/core/Schemas.ts:255-260`; `src/core/validations/usernameRules.ts:44-60`, `:103-105` |
| An approved name was trimmed and rule-checked when it was requested | `NameChangeRepository.ts:310-314` (per the 0317 report §2) |
| `display_name` is returned on the caller's own `GET /v1/profile` | `PublicProjection.ts:61-77` |
| Clearing a name (0314) is an operator command → `display_name` becomes `NULL` | 0314 `plan.md:178` (owner ruling Q2) |
| The name row is hidden on Yandex; the card is visible | `yandex-games_iframe.html:287` (row), `:294` (box), `:301` (card); `index.html:181-191` (visible) |

**Timing, from reading the code (not measured).** The box fills as soon as `Main.ts` loads; it awaits a cached SDK call. The card then waits for init, then the flag, then a render, then a login plus `GET /v1/profile`, with a timeout of up to 5 s (`PlayerProfileView.ts:41`). So the profile read will **almost always land after the box has filled**. The late switch is the normal path, not a rare race.

### 2. Design

**2a. New publisher `src/client/ApprovedName.ts`** (copies `CitizenshipStatus.ts`):
- State: `{ kind: "unknown" } | { kind: "none" } | { kind: "approved"; name: string }`.
- Functions: `publishApprovedName(state)` (no-op if unchanged), `getApprovedName()`, `subscribeApprovedName(listener) → unsubscribe`, `resetApprovedNameForTests()`.
- **The card is the only writer.** Comment says so, as `CitizenshipStatus.ts` does.

**2b. `PlayerProfileView` gains `approvedName: string | null`** (`PlayerProfileView.ts:17-37`):
- On a successful read: `profile.display_name`.
- On the zero-state: `null`.
- `displayName` is unchanged.

**2c. The card publishes.** `CitizenshipCard.refreshProfile` gets a new `publishApprovedName()` call next to `publishCitizenshipStatus()` (`:165`):
- `profile !== null && profile.isAuthoritative`: publish `approved` or `none` from `approvedName`. What counts as "approved" depends on Q1.
- **Anything else publishes nothing:** a guest, the zero-state, a failed read, a timeout. The last authoritative answer stays.
- Effect: a failed read never locks (brief item 5). A failed read after a successful one never unlocks mid-load.

**2d. `UsernameInput` changes** (`src/client/UsernameInput.ts`):
1. **Subscribe first.** In `connectedCallback`, subscribe **before** the `await getStoredUsername()` (`:65`). After the await, apply `getApprovedName()`. This stops the stored-name fill overwriting a lock that arrived during the await. Add a `disconnectedCallback` that unsubscribes.
2. **The join check on the approved name.** `candidate = name.trim()`. It is used **only if** `checkUsernameRules(candidate) === null`. That is exactly the check `JoinUsernameSchema` runs, so the server accepts it. If it fails (e.g. `0308` later changes the rule):
   - no lock and no prefill; the normal order runs;
   - a DEBUG `flashist_logErrorToAnalytics` records it, **without the name**.
   - It is **not** cleaned into a different string and locked, because nobody approved that string.
3. **Lock on `approved`** (new `@state() isLocked`, `@state() approvedName`):
   - `username = lastValidUsername = candidate`;
   - clear `validationError`; `_isValid = true`;
   - `storeUsername(candidate)`, plus a marker `localStorage["approved_username"] = candidate` (brief item 3);
   - dispatch `username-change`.
   - `getCurrentUsername()` returns the approved name while locked.
4. **Mid-edit rule (brief item 4).** If the approved name arrives while the box has focus (`isEditing`), the visible text is not swapped under the player's fingers. The switch waits until `handleBlur` (`:110`). Pressing Play blurs the box first, so the swap happens before the click handler reads the name. As a safety net, `getCurrentUsername()` already returns the approved name while a switch is pending.
   - On Yandex the box is hidden, so this case cannot occur there.
5. **Unlock on `none`** (the name was cleared, brief item 6):
   - `isLocked = false`.
   - If `localStorage["username"] === localStorage["approved_username"]`, remove both. If the box is showing that stale name, re-run the normal order without storage: Yandex name, else a fresh `Anon####`.
   - **Why:** a cleared name is usually one an operator removed. Without this, a player whose Yandex name is empty would keep playing under it from storage. A name the player typed themselves is left alone, because it does not match the marker.
6. **Render when locked** (`:71-101`):
   - `<input readonly aria-readonly="true">` with a muted style and a small lock icon (inline SVG, `aria-hidden`);
   - `title` = the lock hint;
   - on focus or tap, the existing hint slot shows the new text `username.locked_hint` **instead of** the rules hint.
   - `handleChange` returns early when locked (a guard; readonly already blocks typing).
7. **Degraded load (Q2 default).** No publish means `unknown`, so the box behaves exactly as today. If storage holds the approved name, it shows **unlocked**.

**2e. Texts:** new key `username.locked_hint` in **both** `resources/lang/en.json` and `ru.json` (drafts in Q4). No game name (0311). The card's own title is used as the pointer: en "Citizenship", ru «Гражданство». `LangSelector.ts:236` already re-renders `username-input` when the language changes.

**2f. HTML entry points:** **no change.** The element and its markup stay the same; the lock renders inside the component. Both templates already contain `<username-input>` and `<citizenship-card>`. If the owner picks the Q3 option "show the box on Yandex", that is `yandex-games_iframe.html:287`, and a separate task is recommended for it.

### 3. Why the card publishes, rather than the box reading the profile itself
- **A second `loadPlayerProfileView()` caller** would break the single-reader rule (`CitizenshipCard.ts:192`, `CitizenshipStatus.ts:4-7`). Once S3b switches `Citizenship:Earned:XP` back on inside that function (`PlayerProfileView.ts:102-106`), the event would fire twice. It would also add a second login and request on every load.
- **The hint points at the card.** When the card is switched off (`CITIZENSHIP_CARD_ENABLED` or the `citizenship_ui` flag), the box never locks, so the hint never points at something missing.
  - **Consequence to note:** prefill and lock only work where the card is enabled. With the card off, the name box behaves exactly as it does today.

### 4. The join path
- Every join already goes through `getCurrentUsername()` (section 1). No join code changes.
- A locked name has passed the same `checkUsernameRules` check (2d.2), so the server's `JoinUsernameSchema` accepts it (a test pins this).
- Unchanged, noted only:
  - single-player's `LocalServer.ts:277/286` still runs `getClanTag` on the name, so an approved name containing `[TAG]` would produce a clan tag, as a typed one does today;
  - the in-match `sanitize()` and `fixProfaneUsername` cleaners are untouched. They belong to 0322 / 0308.

### 5. Files
- **New:** `src/client/ApprovedName.ts`.
- **Edit:**
  - `src/client/PlayerProfileView.ts`: the field and its doc;
  - `src/client/CitizenshipCard.ts`: one publish call plus a small helper;
  - `src/client/UsernameInput.ts`: subscribe, lock, marker, render, unsubscribe;
  - `resources/lang/en.json` and `ru.json`: one key each.
- **No change:** `src/core/` (so the `src/core` test rule is not triggered), the server, the contract, migrations, HTML.

### 6. Interactions with other uncommitted or planned work
- **0326 (stale read in `refreshProfile`):** the name is published from the same unguarded read, but it avoids the harmful cases.
  - A failed read landing after a good one: ignored (2c). **Immune.**
  - A good read landing late: the lock applies late. That is correct.
  - An old good read landing after a new good one: harmful only if `display_name` changed within the load. It changes only through an operator decision, which is seen on the next load or a card re-read. So it is negligible, and fully fixed once 0326's counter wraps both publish calls.
  - **Merge note:** 0321 and 0326 both edit the same 3-line method. Whichever lands second keeps `publishApprovedName()` **inside** 0326's newest-read-only block. 0329 (the second concurrent read) is covered by 0326, as its brief says.
- **0303:** the card already re-reads on `PURCHASES_RECONCILED_EVENT` (`:126`), so the approved name republishes with it. A purchase never creates a name. The restart popup is untouched.
- **0314:** a cleared name reads as authoritative `display_name: null`, which gives `none`, which unlocks and cleans storage (2d.5).
- **0311:** the hint contains no game name. A test asserts this.
- **0308 (parked):** the check at lock time (2d.2) handles any future rule change. The existing test `UsernameLang.test.ts` "en and ru carry exactly the same username keys" automatically covers the new key in both files.
- **0316:** the approve inbox message is not touched, per the brief note.
- **0319 / 0325 (forged login):** someone who forges a login already sees the victim's `display_name` on the card today. With 0321 it also fills that forger's own box. **Not a new exposure:** same data, same session, and D1 already accepts that anyone can type the string.
  - ⚠️ **Watch item:** if S3b or 0325 ever hides `display_name` from unverified reads, the lock would silently stop. A test on the card pins that the lock follows `display_name`.

### 7. Edge cases covered
- Approved name arrives before or during the box's own await → lock is kept (2d.1).
- Approved name arrives while the player is editing → switch deferred to blur (2d.4).
- An invalid draft is on screen when the lock applies → error cleared, `isValid()` true, Play is not blocked.
- Approved name fails the current rule → no lock, normal order, DEBUG log with no name.
- Name cleared → unlocked, stale stored copy removed (2d.5).
- Guest → nothing published; unchanged.
- Card disabled → unchanged.
- Degraded load → unlocked (per Q2).
- Language switch → the hint re-translates.
- `localStorage` unavailable → current behaviour (the existing `storeUsername` does not catch errors either; not widened here).

### 8. Tests (all client, jsdom)
- **`tests/client/ApprovedName.test.ts` (new):** publishes only on change; subscribe and unsubscribe; reset.
- **`tests/client/UsernameInput.test.ts`, extended, using the existing `mount`, `type` and `flushLit` helpers:**
  1. `approved` published before mount → box shows it, is readOnly, `getCurrentUsername()` returns it, storage and marker are written, and `JoinUsernameSchema.safeParse` succeeds.
  2. Published **after** mount (the race) → the Yandex name switches to the approved one and locks.
  3. Published while focused with a typed draft → no swap until blur, then swapped and locked; `isValid()` true.
  4. `unknown` or `none` → Yandex, then `localStorage`, then `Anon####`, editable, as today.
  5. The Yandex read throws (degraded), storage holds the approved name, nothing published → shown **unlocked**.
  6. An approved name that fails the rule (too short, an emoji, a `-`) → not locked, normal order.
  7. `none` after a stored approved name → storage entry and marker removed; the box falls back. A name the player typed that does not match the marker is kept.
  8. A locked box on focus shows `locked_hint`, not the rules hint.
  9. Unsubscribe on disconnect.
  10. Guest → no lock.
- **`tests/client/PlayerProfileView.test.ts`:**
  - `approvedName` equals `display_name` on success;
  - `null` when `display_name` is null, and `null` on every zero-state path;
  - `displayName` fallback unchanged.
  - Existing `toEqual` assertions get the new field.
- **`tests/client/CitizenshipCard.test.ts`:**
  - an authoritative read publishes `approved` / `none`;
  - a zero-state read publishes nothing;
  - a failed re-read after a good one leaves `approved`;
  - `loadPlayerProfileView` call count is unchanged (still a single reader).
  - Profile fixtures gain `approvedName: null`.
- **`tests/client/CitizenshipStatus.test.ts`:** fixture gains the field; no behaviour change.
- **`tests/client/UsernameLang.test.ts`:** `locked_hint` exists in en and ru; no `/geoconflict|геоконфликт/i`.
- **Run:**
  - the suites above;
  - `npm run lint`;
  - full `npm test`, following the CLAUDE.md procedure for the known supertest flake (re-run and say so);
  - `npx tsc --noEmit` if the project's lint does not type-check.
- **Owner-run on a Yandex draft (the worker cannot run these):**
  - brief step 6: single-player and a multiplayer lobby show the approved name. On Yandex the box itself is hidden (Q3). The standalone page check has no Yandex identity.
  - brief step 7: measure box-fill versus profile-read timing. Add a **temporary** `console.debug` with `performance.now()` at the two points, have the owner read it on the draft, record the result in the worklog, and remove the log before review. **Alternative if the owner prefers:** record only the code-order reasoning from section 1 and mark it "not measured".

### 9. Order of work
1. `ApprovedName.ts` and its test.
2. `PlayerProfileView` field and tests.
3. The card's publish call and tests.
4. `UsernameInput` lock and tests.
5. Texts (en and ru) and the lang test.
6. Lint, then the full suite.
7. Stateful review (reviewer).
8. Owner checks on the Yandex draft (steps 6 and 7).

### 10. Deploy order
- **Client bundle only.** The profile server already returns `display_name` on the caller's own profile read. No server, contract or migration change, so there is no ordering constraint.
- Ships with the next client build. Rollback = revert the client.
- **0322 comes after** (its brief recommends that). 0321 does not depend on it.

### 11. Assumptions and residuals, stated
- D1's accepted residual is unchanged: anyone can type the same string (standalone page, or a modified client).
- The lock is a UI rule, not a security control. The server binding is 0322.
- Approved names containing `[ ]` produce clan tags, as typed names do.

### Owner questions put with the plan
- **Q1** what turns the lock on (fresh read shows an approved name — Rec; or approved name AND citizen now).
- **Q2** degraded load (show, don't lock — Rec; or lock from the saved copy).
- **Q3** the name box is hidden on Yandex (build as ruled, hint seen only outside Yandex — Rec; prefill only; or also show the box on Yandex as its own task).
- **Q4** hint wording — Rec: en "This is your approved name. You can change it on the Citizenship card." / ru «Это ваше одобренное имя. Сменить его можно в карточке «Гражданство».»; shorter alternative: en "Approved name. Change it on the Citizenship card." / ru «Одобренное имя. Сменить можно в карточке «Гражданство».»

## Owner rulings (2026-09-28, live via `AskUserQuestion` in the `fkit lead` session, relayed by fkit-lead) — record verbatim
- **Q1 (what turns the lock on):** owner's own words: "There is no way somebody loses their citizenship. If I understand you correctly, it means #1." — the lead confirmed that reading ⇒ **option 1**: lock whenever a fresh, authoritative profile read shows an approved name (`display_name` non-null), regardless of citizen status.
- **Q2 (degraded load):** "Show it, don't lock (Recommended)" — Locking needs a fresh answer from the server, so a cleared name or another account's name on the same browser never locks.
- **Q3 (box hidden on Yandex):** "Build as ruled anyway (Recommended)" — On Yandex citizens play under their approved name; the lock/hint shows only on the standalone page, and is ready if the box is ever shown on Yandex.
- **Q4 (hint text):** "Full sentence (Recommended)" — en `This is your approved name. You can change it on the Citizenship card.` / ru `Это ваше одобренное имя. Сменить его можно в карточке «Гражданство».`
- **Plan approval:** "Approve (Recommended)" — 2026-09-28.
