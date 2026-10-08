# Worklog — 0400 Verify 0397 live: the session-status line shows the right state in production

## 2026-10-08 — gates, deploy, owner's live checks (in progress)

Recorded by `fkit-lead` in the owner's session. Checks run by the owner on production; readings are the owner's
screenshots, compared by the lead against the approved RU text in `resources/lang/ru.json` (`citizenship_status.*`,
the `0397` *Approved wording*). No token, id, response body or URL recorded.

### 1. Gates (verification step 1)
1. `0395` passed — ✅ `vfy: true` live 2026-10-07.
2. `0396` — **same slot, server first** (owner ruling Q4): S3b profile server `0.0.156-profile.4` deployed
   06:41:41Z, owner's DevTools check passed, **then** the game client. Full record:
   [`0396` worklog](../../done/0396-verify-0250-s3b-live-deploy-the-verified-owner-view-and-confirm-it-in-production/worklog.md).
3. `0397` committed — ✅ (on `dev`, in the deployed game image).
4. Weekend slot — **mid-week exception, owner's call** (Thu 2026-10-08).

### 2. Deploy (verification step 2)
- Game client **`0.0.157`**, commit `c12cd8e` (tag pushed), image `20261008-095100`, container started
  **2026-10-08T06:56:17Z**.
- **Rollback target:** `20261003-123251` (`0.0.156`) — registry only (pruned from the box, runbook F-D).
- **Chosen rollback for the Q4 pairing:** if the client must go back while the S3b server stays, **switch
  `citizenship_ui` off** (the fastest safe path — the old image needs a re-pull). If the S3b server is rolled back,
  also switch `citizenship_ui` off or roll the client back. Written out in full in `0396`'s worklog § *Rollback rules*.

### 3. Owner's live checks — 2026-10-08, ~07:30–07:35Z, game in **Russian**

| # | Check | Result |
|---|---|---|
| 1 | **Checking** — throttled (owner used a slow preset, then 3G) on the paid account | ✅ **yes.** During load the card area showed only *"Проверяем ваш аккаунт…"* (exact approved RU), then the verified paid card. No guest card and no login button in the sequence (three screenshots). |
| 2 | **Verified paid citizen** | ✅ **yes.** *"✓ Подтверждено — преимущества платного гражданства включены"* — exact approved RU. |
| 3 | Unverified citizen | **not checked live — covered by unit tests** (both owner test accounts log in verified). |
| 4 | Unverified non-citizen | **not checked live — covered by unit tests** (same reason). |
| 5a | **Couldn't load** (owner blocked the profile request in DevTools) | ✅ **yes.** *"Сейчас не удалось загрузить ваш профиль. Ничего не потеряно — обычно помогает перезапуск."* + **"Перезапустить"** button — both exact approved RU. |
| 5b | Restart reloads on the start screen | ✅ **yes** (owner: *"yes, the game reloads"*). |
| 5c | Reloaded page with the block on shows *"Всё ещё не получается…"* | ✅ **yes.** *"Всё ещё не получается. Попробуйте чуть позже — ничего не потеряно."* + **"Перезапустить"** — exact approved RU (owner screenshot). |
| 5d | Restart does nothing in a lobby / join / match (or cannot be reached there) | ✅ **yes.** With the profile request blocked, the owner joined a public lobby: the card and "Перезапустить" stayed **visible**, and pressing it did **nothing** (no reload, stayed in the lobby). Matches the `isOnStartScreen` guard (`CitizenshipCard.ts:830-838`). ⚠️ UX note: the press gives no feedback at all — by design per `0397`, recorded only. |
| 5e | Block removed → normal load | ✅ **yes** (owner: *"the game loads as expected (correctly)"*). |
| 6 | **RU text** | ✅ States read in RU so far: checking (1), verified paid (2), couldn't load + button (5a), still failing (5c). |
| 7 | Kill switch (`citizenship_ui` off → fresh session → nothing from `0397` shows → back on) | ✅ **yes** — owner, 2026-10-08, flag off → on within ~5 min ending ≈09:48Z (owner gave no exact times: *"The changes in the flags are done almost immediately, so I can't tell you exact timestamps, but it's just happened (the whole process took 5 min or less)"*). Owner, verbatim: *"everything worked as expected (no card, interstitials are shown - when the flag was disabled)"*. One flip served both `0400` and `0398`. ⚠️ Exact off/on times not recorded (approximate window only). |
| 8 | Analytics (`Citizenship:Status:*`) | _pending — read later in GameAnalytics_ |

### Observation (not a check in this brief)
- In the **couldn't load** state the card shows **"0 / 100" XP with an empty bar** and the Yandex display name
  instead of the game name. The text says nothing is lost, but "0 / 100" can read as lost XP. Not a failed check —
  recorded for the owner; a small follow-up task may be worth filing.

### 2026-10-08, later — earned account (extra reading, not a numbered check)
- Owner's **earned** test account (verified login): card shows the citizen badge, the game name, **116 / 100** XP, a full
  bar, **no status line**, "Сменить имя" and the explainer link. **Expected:** `0397` shows a status line only for a
  verified **paid** citizen, an unverified citizen, a read in flight, or a failed read — a verified **earned** citizen
  gets none (`CitizenshipCard.ts:786-797`; `0397` brief state list). ✅ consistent.

### Check 8 — analytics (verification step 6)
- Source: GameAnalytics Explore through the owner's Chrome (owner logged in himself), **read-only, nothing saved**; Design events, aggregation Count, "Past 7 days" + **current day included**, read about 11:39Z on 2026-10-08. ⚠️ GA showed its **"Demo mode" banner** on every page (as on 2026-09-29 and 2026-10-05). Today's numbers are a **partial day**; the owner's 10:56Z test purchase already appears, so data was near-current.
- `Citizenship:Status:ReadFailed` — **seen ✅, 95** on 2026-10-08 (partial day; a few are the owner's own blocked-request tests, the rest real players).
- `Citizenship:Status:Unverified` — ⚠️ **not seen** (no such event id in GA for 2026-10-08).
- `Citizenship:Status:Restart` — ⚠️ **not seen**, although the owner pressed "Перезапустить" on the start screen at least once (check 5b, reload confirmed).
- Not a diagnosis, recorded as observed: `Restart` fires right before a page reload, so it may be lost before GameAnalytics sends its queue; `Unverified` needs an unverified citizen session (~3 % of logins are stale) — absence may be real or a reporting gap. **Needs investigation by a coder — not concluded here.** Per verification step 7, a failed check gets its own task (owner's call).

## 2026-10-08 — close

Closed `✅ Done (agent-closed — not owner-verified)` by a spawned `fkit-producer` (no owner channel, ADR-021/037) via `/fkit-task-done`, on the OWNER RULING typed live 2026-10-08 in the `fkit lead` session, relayed by `fkit-lead`, verbatim *"Close it, pointing at the Sprint 8 re-check"* (then, via `AskUserQuestion`, *"New producer, my ruling in (Recommended)"*). The owner ran the live checks; the close itself is agent-run, hence the marker.
- ⚠️ **Check 8 (analytics) is NOT passed.** `Citizenship:Status:Unverified` and `Citizenship:Status:Restart` were not seen in the 2026-10-08 GameAnalytics read; `ReadFailed` = 95 was seen. Carried by [`0418`](../../backlog/0418-recheck-in-gameanalytics-the-two-0397-status-events-missing-from-the-2026-10-08-read/brief.md) (Sprint 8).
- Checks 3 and 4: **not checked live — covered by unit tests.**
- Verification step 7 (a failed check points at a new task) is met by pointing at `0418`, by the owner ruling above.
- Carried as recorded above, not resolved: check 7's flag off/on times are approximate (~5 min ending ≈09:48Z), not exact.
