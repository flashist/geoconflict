# 0397 Step 2: build plan (revised). Show the player whether their session is verified, with 0278 folded in

**Planned by:** spawned `fkit-coder`, plan only (no plan mode in a spawn, so the prose contract applied). Nothing was written.
**Evidence base:** `dev` working tree, code read this turn.
**Inputs:**
- spec `ai-agents/knowledge-base/reports/2026-10-06-0397-step1-product-spec.md`;
- owner rulings Q1–Q4 (2026-10-06);
- owner rulings of 2026-10-06 on the first plan: 0278 "Fold into 0397 (Recommended)"; open question 1 "Allow the note (Recommended)"; open question 2 "Button in card, no popup (Recommended)";
- the cancelled brief `ai-agents/tasks/cancelled/0278-missing-session-surface-on-the-logged-in-citizenship-card/brief.md`, read in full.

## Summary
- **0278's premise is only partly true today, and one real gap remains.** A failed login is already covered by this plan's couldn't-load state. A late-SDK boot whose card is still hidden already recovers: the existing `0329` reveal does a fresh read, and that read logs in. **One case still breaks:** the Yandex player arrives late *after* the card is already showing. The card is then stuck on a guest card (not 0 XP, as 0278 said) with no action, and nothing re-reads. The fix is one small facade signal plus one card re-read, through the same single read path, the same message and the same button. The +0.25 day stands.
- The change is client-only and about 1.25 days. No server, schema or `src/core` changes. No new custom element and no modal, so neither HTML template changes.
- **Session state.** One new published value in `CitizenshipStatus.ts`: `ProfileVerificationStatus` = `unknown | guest | read_failed | unverified | verified`, with derive / publish / get / subscribe. The card stays the only writer, and `refreshProfile()` stays the only caller of `loadPlayerProfileView()`.
- **What the card shows.** A pure `deriveCitizenshipNotice()` picks one of six display states. The card renders them as one quiet line, plus a **Restart game** button on the couldn't-load state only. The button sits in the card; there is no popup (owner ruling).
- **"Checking your account…" replaces today's wrong guest flash** before the first read, and also shows during the late-login re-read.
- **"Still not working" uses the approved session-only marker** (owner ruling).
- **`Citizenship:Status:Restart` fires on a performed reload only, not on a refused press.** This is kept deliberately.
- The verified-paid line reads `isCurrentPlayerPaidCitizen()`, the same published value `0248`'s ad gate reads.
- ⛔ **Not touched:** `derivePaidCitizenship` / `publishPaidCitizenship` / `isCurrentPlayerPaidCitizen`, the three-value `CitizenshipStatus`, and the `0326` superseded-read guard.
- **Brief verification step 2** (each state on a real build) goes to a **verify task in the next sprint**. That is producer work.

## 0278 folded in: which case holds (verified in code this turn)

The pointers in 0278 are stale: "~736-741" is now the "Player recovery, same pattern" block (`FlashistFacade.ts` ≈`:1280-1323`), signalled by `whenPlatformRecoveredLate()` (≈`:1599`). The boot login starts at `Main.ts:1101`.

| 0278 path | What happens on today's code | Evidence | Plan |
|---|---|---|---|
| **Situation B**: authorized, boot login **failed** | The login latches (`loginFailed = true`, only inside `login()`), so every read returns the zero-state (`isAuthoritative: false`, 0 XP). There is no buy button (needs authoritative), no name change, no action. 0278's description is **confirmed**. | `ProfileSession.ts` `login()`; `PlayerProfileView.ts:98-120`; `CitizenshipCard.ts:578-593` | Already covered by this plan's `read_failed` notice + **Restart game** button. No extra code. |
| **Late SDK, card still hidden** (production: flags missing, so `isCitizenshipUiEnabled()` is false and the card hides) | `ensureSession()` does **not** latch when not authorized: `resolveSession()` returns null before `login()`. `profileFetch()` calls `ensureSession()` on every read. The `0329` reveal waits for flags + the late `getPlayer()`, then `revealCard()` → `refreshProfile()`, which logs in then. **Already recovers.** | `ProfileSession.ts` `resolveSession()` / `profileFetch()`; `FlashistFacade.ts` `checkExperimentFlag` (false with no flags), ≈`:1287-1323`; `CitizenshipCard.ts:197-225` | **No new code.** A pinning test only (see Tests). With this plan the reveal shows "checking", then a real state. |
| **Late player, card already showing.** (a) SDK in time and flags in time, but the boot `getPlayer()` resolved after the 5 s deadline; (b) the `0329` reveal's 5 s player wait ran out before the late `getPlayer()` finished; (c) dev builds, where the flag check is always true. | The card's first read ran while unauthorized and got `null`, so a **guest card**. The player then becomes authorized (`initPlayer()` or `playerRecovery` sets `yandexSdkPlayerObject`), but **nothing re-reads**. The card stays guest. While degraded it has no login button. If it happens to re-render after recovery, it shows a "Log in" button to an already-logged-in player. **Still breaks.** | `FlashistFacade.ts` `initPlayer()` `:1821-1844` (assigns late, no signal); `runPlatformInit` `:934-945` (deadline force-resolves `yandexSdkInitPlayerPromise`); `whenPlatformRecoveredLate` fires only once, from the late-SDK branch, bounded by the deadline; `CitizenshipCard.ts:443-507` | **Steps 6 and 7 below:** a once-per-page facade signal "Yandex player authorized late" → the card re-reads through `refreshProfile()` and shows "checking". The result is a real state, or `read_failed` + button if that login fails. Same message, same button, no second surface. |

⚠️ **Unmeasured:** how often case (a) or (b) happens in production. Both need Yandex to be slow at `getPlayer()` but not at init/flags. The fix is cheap, and 0278 was folded in on exactly this path.

## Spec claims re-checked against the code
| Claim | Verdict | Evidence |
|---|---|---|
| The DB forbids paid without citizen | **Confirmed** | `migrations/006_player_identity.sql:80-81` `chk_paid_implies_citizen` |
| The unverified view keeps `is_citizen` and drops only the paid keys | **Confirmed** | `src/profile-server/PublicProjection.ts:73-81`, `:104-113` |
| The guest card flashes until the first read returns | **Confirmed** | `CitizenshipCard.ts:156-177` (renders before `refreshProfile()`), `:443` (`profile === null` → guest), `:496-503` (working login button) |
| The owner-view marker is lost in `PlayerProfileView` | **Confirmed** | `PlayerProfileView.ts:126,144` |
| `PlayerProfileView` is built in one place only | **Confirmed** | `loadPlayerProfileView()` only |
| The `0248` gate reads `isCurrentPlayerPaidCitizen()` | **Confirmed** | `FlashistFacade.ts:2131-2135` |
| A login without a prefetched signature still fetches one | **Confirmed** | `takeYandexPlayerSignature()` `:1913-1919`. A late-recovered login can come back verified or unverified, both honestly shown. |
| Worst-case "checking" lasts about 70 s | **Not re-traced**; carried from the spec/architect | — |

## Derivations (pure, unit-tested)

**A. `deriveProfileVerificationStatus(profile)`** in `CitizenshipStatus.ts`:
| Input | Result |
|---|---|
| `null` | `guest` |
| `!isAuthoritative` | `read_failed` |
| `isVerifiedRead === true` | `verified` |
| else | `unverified` |

`unknown` is never derived. It means "no read applied yet, or the card's re-read after a late Yandex login is in flight". The card publishes it explicitly only in that second case (step 7).

**B. `deriveCitizenshipNotice({ verificationStatus, isCitizen, isPaidCitizen, restartedAfterReadFailure })`** in the new `CitizenshipNotice.ts`:
| verificationStatus | other inputs | Notice | Key (owner-approved text) |
|---|---|---|---|
| `unknown` | any | `checking` | `citizenship_status.checking` |
| `guest` | any | `none` | existing guest card |
| `read_failed` | not restarted | `read_failed` | `citizenship_status.read_failed` + button `citizenship_status.restart` |
| `read_failed` | restarted from this button | `still_failing` | `citizenship_status.still_failing` + the same button |
| `unverified` | `isCitizen` | `unverified` | `citizenship_status.unverified` (text only) |
| `unverified` | `!isCitizen` | `none` | — (Q1) |
| `verified` | `isPaidCitizen` | `verified_paid` | `citizenship_status.verified_paid` |
| `verified` | `!isPaidCitizen` | `none` | — |

- `isCitizen` = the card's `isCitizenNow()` (includes `paidGrantConfirmed`, so the notice is right straight after a purchase).
- `isPaidCitizen` = **`isCurrentPlayerPaidCitizen()`**, the one published paid value (brief verification step 4).

## Steps (in order)

1. **`src/client/PlayerProfileView.ts`**
   - Add `isVerifiedRead: boolean` with a doc comment: true only for the verified owner view (`0250` S3b); false for zero-states, unverified views and pre-S3b servers; display-only, never a grant (ADR-116 D4).
   - `false` in `zeroState`, `isOwnerView` in the success return. Nothing else changes.

2. **`src/client/CitizenshipStatus.ts`** (additive only)
   - Add `ProfileVerificationStatus` and `deriveProfileVerificationStatus` (with `=== true` on `isVerifiedRead`, because older test stubs omit it).
   - Add `publishProfileVerificationStatus` (deduped), `getProfileVerificationStatus`, `subscribeProfileVerificationStatus` (returns an unsubscribe function; not called on subscribe).
   - Doc comment: the card is the only writer.
   - Extend `resetCitizenshipStatusForTests()`.
   - ⛔ The existing exports stay byte-identical.

3. **New `src/client/CitizenshipNotice.ts`**
   - The `CitizenshipNotice` type and `deriveCitizenshipNotice` (table B).
   - `reportCitizenshipNoticeShown(notice)` with module-level once-per-page latches:
     - `unverified` logs `CITIZENSHIP_STATUS_UNVERIFIED`;
     - `read_failed` / `still_failing` log `CITIZENSHIP_STATUS_READ_FAILED` (one shared latch);
     - everything else logs nothing. No ids.
   - `resetCitizenshipNoticeReportedForTests()`.

4. **New `src/client/ProfileReadRestart.ts`**, a sibling of `CitizenshipRestartOffer.ts`. It is **not** `requestGameRestart()` or the `Profile:Login:Restart:*` funnel (owner ruling; this supersedes 0278's "reuse S4's restart path").
   - `restartAfterProfileReadFailure({ isOnStartScreen, reload, storage }): boolean`:
     - Not on the start screen (lobby, joining, match) → return `false`. No reload, no event, no marker.
     - Otherwise: try to write the session marker `geoconflict.profileReadRestartAttempted`. A storage error is ignored; it only loses the "still not working" text.
     - Then log `CITIZENSHIP_STATUS_RESTART` **right before** `reload()`, and return `true`. The event fires on a performed reload only, never on a refused press.
   - `wasRestartedAfterProfileReadFailure(storage)`: memoized per page. It reads the marker once and **removes it at once**, so it can never carry past the next load. Any error → `false`.
   - No loop is possible: it runs only from the player's press. This widens D3 by exactly this one button, per Q3.
   - `resetProfileReadRestartForTests()`.

5. **`src/client/StartScreenPresence.ts`:** one new export, `isOnStartScreen(): boolean` = `!isAwayOrJoining()`. It covers the lobby-join set-up window too.

6. **`src/client/flashist/FlashistFacade.ts`** (the 0278 late-player gap; additive)
   - Add `whenYandexAuthorizedLate(): Promise<void>`. Same shape as `whenPlatformRecoveredLate()`: lazily created resolvers (tests build facades via `Object.create`), fires at most once per page, resolves at once for a waiter that arrives after it fired, never resolves on a healthy boot.
   - In `runPlatformInit`, right where `yandexSdkInitPlayerPromiseResolve()` is called (≈`:945`), record `wasYandexAuthorizedAtBoot = this.isYandexLoggedIn()`. That is the boot's answer: it is what `isYandexAuthorized()`, the card's first read and `startProfileSession()` all saw.
   - Add `markYandexAuthorizedLate()`. It fires only if `wasYandexAuthorizedAtBoot === false` **and** `isYandexLoggedIn()` is now true **and** it has not fired yet.
   - Call it from two places only:
     - (a) chained on the boot `playerInitResultPromise` after that record is made (`.then(mark).catch(() => {})`). On a healthy boot this is a no-op: the boot answer was already true, or it is a real guest.
     - (b) at the end of the late-SDK `playerRecovery` chain, after its `getPlayer()` assignment.
   - **Not** called from `openYandexAuthDialog()`: a guest's own login keeps `0273`'s restart path.
   - No analytics. Nothing else in platform init changes.

7. **`src/client/CitizenshipCard.ts`**
   - **`refreshProfile()`**, inside the existing guard, after `publishPaidCitizenship(...)`:
     - `publishProfileVerificationStatus(deriveProfileVerificationStatus(profile))`;
     - then `reportCitizenshipNoticeShown(this.currentNotice())`;
     - then the existing `requestUpdate()`.
     - The guard, the paid publish and its comment are unchanged.
   - **New `currentNotice()`:** builds table B's input from `getProfileVerificationStatus()`, `isCitizenNow()`, `isCurrentPlayerPaidCitizen()` and `wasRestartedAfterProfileReadFailure(sessionStorage-or-null)`. Access goes through a try/catch helper, because `sessionStorage` can throw in an iframe.
   - **Late-login re-read (0278):** in `revealCard()`, subscribe once to `FlashistFacade.instance.whenYandexAuthorizedLate()`, guarded by `connectionGeneration` exactly like `recheckWhenPlatformRecovers()`. On fire, if the generation still matches, the card is connected and `isEnabled`:
     - `publishProfileVerificationStatus("unknown")` so the card shows "checking" and never a login button to a logged-in player;
     - `requestUpdate()`;
     - `void this.refreshProfile()`. This is the single read path, so no new `loadPlayerProfileView()` caller. The read logs in because nothing latched, and ends in a real state, or in `read_failed` + Restart if that login fails.
     - While the card is still hidden it does nothing: the `0329` reveal does its own read, so there is no double read.
   - **`render()`:**
     - `!isEnabled` → `nothing` (unchanged, so the kill switch hides all of it).
     - Notice `checking` → new `renderChecking()`: the guest card's outer box with only the quiet line (`text-[11px] text-[#98989f]`), no login button, no buy CTA, no "error" tone.
     - Otherwise the existing branches.
   - **`renderLoggedIn()`:** add `${this.renderStatusNotice()}` right under the XP bar, before the buy-CTA / name-change blocks.
     - Box style from the name-change pending note (`mt-2 p-2 rounded-lg bg-white/[0.06]`, text `text-[11px] text-[#98989f] leading-[1.4]`).
     - `verified_paid` → one line; `unverified` → text only; `read_failed` / `still_failing` → text plus `<button id="citizenship-status-restart">` (secondary `bg-white/10` style, label `citizenship_status.restart`); `none` → `nothing`.
   - **`onStatusRestartTap`:** has an in-flight guard and calls `restartAfterProfileReadFailure({ isOnStartScreen, reload: () => FlashistFacade.instance.reloadApp(), storage })`. A refused press leaves the button in place.
   - Update the class doc comment with the new states. All strings go through `translateText()`.

8. **`FlashistFacade.ts` analytics enum:** add under the `0303` block, with a comment:
   - `CITIZENSHIP_STATUS_UNVERIFIED: "Citizenship:Status:Unverified"`
   - `CITIZENSHIP_STATUS_READ_FAILED: "Citizenship:Status:ReadFailed"`
   - `CITIZENSHIP_STATUS_RESTART: "Citizenship:Status:Restart"`

9. **`resources/lang/en.json` + `ru.json`:** new section `citizenship_status`, using the owner-approved wording verbatim:
   - `checking`: "Checking your account…" / "Проверяем ваш аккаунт…"
   - `verified_paid`: "✓ Verified — your paid citizenship benefits are on" / "✓ Подтверждено — преимущества платного гражданства включены"
   - `unverified`: the Q2 EN / RU texts verbatim
   - `read_failed`: "We couldn't load your profile right now. Nothing is lost — a restart usually helps." / "Сейчас не удалось загрузить ваш профиль. Ничего не потеряно — обычно помогает перезапуск."
   - `restart`: "Restart game" / "Перезапустить"
   - `still_failing`: "Still not working. Please try again a bit later — nothing is lost." / "Всё ещё не получается. Попробуйте чуть позже — ничего не потеряно."
   - 0278's own string pair is **not** added; it is superseded by `read_failed`.

10. **`ai-agents/knowledge-base/analytics-event-reference.md`:** three rows next to `Citizenship:RestartPrompt:*`.
    - **Unverified:** once per page; counts unverified citizens, paid and earned together, and cannot be split, on purpose.
    - **ReadFailed:** once per page; includes the "still not working" variant and the late-login re-read.
    - **Restart:** fires right before the reload; **not** on a press refused in a lobby, join or match. Separate from `Profile:Login:Restart:*`.
    - All three: behind the kill switch, no ids.

## Tests
- **`tests/client/CitizenshipStatus.test.ts`** (extend):
  - table A for every input, including a stub with no `isVerifiedRead`;
  - publish dedupe / get / subscribe / unsubscribe / reset;
  - regression pins: `derivePaidCitizenship` is unchanged by `isVerifiedRead`, and the 3-value status is unchanged.
- **`tests/client/PlayerProfileView.test.ts`** (extend): `isVerifiedRead` is true only when `is_paid_citizen` is present, and false for zero-state, unverified view and fetch failure. Update any full-object `toEqual` expectations.
- **New `tests/client/CitizenshipNotice.test.ts`:**
  - the full table B, including `unknown`;
  - `verified_paid` never on `unverified` (brief step 3);
  - once-per-page latches; `none` / `checking` / `verified_paid` log nothing.
- **New `tests/client/ProfileReadRestart.test.ts`:**
  - refusal off the start screen: no reload, **no event**, no marker;
  - accepted: marker written, Restart logged once, then reload;
  - a throwing storage still reloads;
  - the marker is read once, removed and memoized; an error gives `false`.
- **`StartScreenPresence`:** `isOnStartScreen()` (away / joining / back).
- **`tests/client/FlashistFacade.test.ts`** (extend, reusing the `0329` recovery harness):
  - `whenYandexAuthorizedLate` fires once when the boot answer was not-authorized and the boot `getPlayer()` later yields an authorized player (case a);
  - it fires from the late-SDK `playerRecovery` (case b);
  - it does **not** fire on a healthy boot, for a real guest, or a second time;
  - a waiter added after the fire resolves at once.
- **`tests/client/CitizenshipCard.test.ts`** (extend; add the 3 event keys, `reloadApp` and `whenYandexAuthorizedLate` to its facade mock):
  - before the read returns: the checking line, **no** `#citizenship-login-button`, no buy button;
  - guest: unchanged;
  - failed read: notice + `#citizenship-status-restart`; a click reloads only on the start screen and does nothing (and logs nothing) in a lobby or join;
  - after a marked restart, a failed read shows `still_failing`;
  - unverified citizen: text only, no button; unverified non-citizen: nothing new;
  - verified paid: the line; verified non-paid: nothing new;
  - a `PURCHASES_RECONCILED_EVENT` re-read updates the display without a reload;
  - kill switch off: nothing renders, nothing publishes (status stays `unknown`);
  - a superseded read publishes nothing;
  - one `loadPlayerProfileView` call per refresh (existing pins).
  - **0278 path tests (brief's added verification step / 0278 verification item 5):**
    - **Situation B:** an authorized player whose read comes back non-authoritative sees the couldn't-load notice + button, never a bare 0 XP card with no action.
    - **Late player, card showing:** the first read returns `null` (guest); `whenYandexAuthorizedLate` fires; the card shows checking and issues exactly one more read through `refreshProfile`; that read resolving to a real view (and, separately, to non-authoritative) ends in that state (and, separately, in `read_failed` + button).
    - **Late SDK, card hidden (pinning, no new code):** the `0329` reveal shows checking, then the read's real state; the late-auth signal arriving while the card is hidden causes **no** extra read.
    - **Reconnect:** a stale subscription does nothing.
  - ⚠️ **Existing tests that need deliberate updates:**
    - `Citizenship:Seen` "fires exactly once" (`:497-508`): its fixture lacks `isAuthoritative`, so it would now also log `ReadFailed`. Fix the fixture, not the count.
    - Any test asserting guest UI while a read is pending now expects the checking line.
    - Each such edit gets listed in the worklog.
- **New `tests/client/CitizenshipStatusLang.test.ts`** (mirrors `CitizenshipRestartLang.test.ts`): keys present and non-empty in both files; same key set; RU not copied from EN; **EN/RU equal the owner-approved text exactly**.
- **Run:**
  - the targeted suites;
  - the full `npm test` (includes the shell harnesses; a `supertest` flake gets re-run and reported as a re-run);
  - `npx tsc --noEmit`;
  - `npm run lint`;
  - a production build.
- **Mutation check:** remove the card's late-login subscription and confirm the "late player" test goes red.

## Verification against the brief
| Brief step | How |
|---|---|
| 1 Spec approved | Done (Q1–Q4 + the 2026-10-06 plan rulings) |
| 2 Each state on a real build | **Goes to a verify task at the top of the next sprint (producer work)**, per the 2026-09-29 build/verify split. Only guest and checking can be shown locally; verified and unverified need `0395` + `0396` (+ `0391`) live. In this build: per-state render tests plus a local screenshot of checking / guest / a stubbed read_failed. |
| 3 Verified-paid only on `isPaidCitizen` | Truth-table tests |
| 4 One source | `grep -rn "loadPlayerProfileView(" src` gives one caller (`refreshProfile`); display and ad gate both read `isCurrentPlayerPaidCitizen()`. In the worklog. |
| 5 Kill switch | Card test with `CITIZENSHIP_CARD_ENABLED` false. Remote `citizenship_ui` **recorded as unverified** (`0238`). |
| 6 Translations | Lang test + grep for hard-coded strings |
| 7 Retry only on press | Restart helper + card tests; no other caller (code search) |
| 8 No blaming wording | Owner-approved text, verbatim, pinned by test |
| Added (0278) | A late-authorized boot never ends on a bare 0 XP or stuck guest card with no action: client tests above. Which 0278 case holds is stated, with evidence, in the worklog. |

## Edge cases and risks
- **Before `0395`/`0396` are live, every logged-in citizen sees "not confirmed".** This is Q4's deploy rule and not a build concern, but it is the biggest live risk.
- **Straight after a purchase on an unverified session,** the unverified notice sits next to `0303`'s popup, and ads keep showing. Intended (spec §2).
- **A confirmed purchase whose re-read failed:** citizen badge plus the couldn't-load notice and button. Honest.
- **Guests see "Checking…" briefly** until `isYandexAuthorized()` answers (no network).
- **The late-login re-read may overlap an older in-flight read.** The `0326` guard drops it if the newer one has already applied. If the older one lands first, it is applied and then replaced. At worst the guest card flickers once.
- **One small window remains:** if something re-renders the card between the late `getPlayer()` landing and the signal callback (one microtask hop), a guest card with a login button could flash. Low risk, not tested.
- **A late-recovered login has no prefetched signature.** It fetches one fresh, so it can come back verified or "not confirmed". Both are shown honestly.
- **Private mode / blocked storage:** the button still reloads; only the "still not working" variant is lost.
- **A second tap before the page unloads** is absorbed by the in-flight guard (0278's verification item 4 "a second tap does nothing", met without a latch).
- **Worst-case "checking" duration** is not re-traced (see the claims table).
- **The late-auth signal touches platform init:** one record plus two `.then` hooks, additive, never awaited, never throwing. Pinned by the facade tests above.

## Not in this task
- The `0332` pointer line and the `0396` deploy/rollback note (Q4): producer work.
- No device memory of the paid answer (Q1).
- No notice for non-citizens.
- Nothing during matches.
- No change to `0273`'s login-restart path.

## Effort
About 1.25 days: the original about 1 day, plus about 0.25 for the 0278 late-player signal and its tests. Files touched:
- 5 source files: `PlayerProfileView.ts`, `CitizenshipStatus.ts`, `StartScreenPresence.ts`, `CitizenshipCard.ts`, `FlashistFacade.ts` (signal + 3 enum keys)
- 2 new modules: `CitizenshipNotice.ts`, `ProfileReadRestart.ts`
- 2 lang files
- 1 knowledge-base doc
- about 7 test files
