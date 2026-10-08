# Worklog — 0401 Verify 0301 live: the citizenship explainer popup works in production

## 2026-10-08 — partial live checks (in progress)

Recorded by `fkit-lead` in the owner's session. Readings are the owner's reports and screenshots on production (game
`0.0.157`, inside Yandex Games). No token, id, response body or URL recorded.

### ⚠️ Done out of the brief's order — said plainly
- **§1 local look (agent first, then owner): NOT done.** The popup was already live before this check started.
- **§1a snippets A and B: NOT written or tested.** So checks **1** (test purchase) and **4** (locked tap) cannot run yet.
- **§2 gates:** `0396` passed 2026-10-08 (see its worklog); `0397` in the same deploy (game `0.0.157`); `0301` committed
  and live. Weekend slot: mid-week exception, owner's call.

### Deploy (verification step 3)
- Game client `0.0.157`, commit `c12cd8e`, image `20261008-095100`, started 2026-10-08T06:56:17Z. Rollback target
  `20261003-123251` (`0.0.156`), registry only. A client rollback also rolls back `0248` and `0397` — see `0396`'s
  worklog § *Rollback rules*.

### Owner's live checks

| # | Check | Result |
|---|---|---|
| 1 | Test purchase from the popup (Snippet A), on the **currently-paid** test account | ✅ Snippet A applied right before the tap (yes) · purchase completed (yes — Yandex test payment; console showed the SDK `consumePurchase` and the GameAnalytics event **`Purchase:Completed:Citizenship`** at ~10:56:09Z) · card switched to the citizen look **without a reload** (yes — citizen badge + paid status line visible behind the post-purchase dialog; ⚠️ **weaker proof**: the account was already paid, so this could come from the card's own re-read — `Purchase:Completed:Citizenship` is the real proof) · explainer popup closed (yes — replaced by the expected post-purchase **"Гражданство активно!"** restart dialog, event `Citizenship:RestartPrompt:Shown`). Other events (`Citizenship:Explainer:Opened:CardLink`, `UI:Tap:PurchaseCitizenshipExplainer`, `Purchase:Started:Citizenship`): _pending — read later in GameAnalytics_. Owner screenshot 2026-10-08. |
| 2 | Guest: popup shows a login button, not Buy; tap → Yandex login runs; `UI:Tap:CitizenshipLoginExplainer` | ✅ login button shown and **tapping it opens the Yandex login dialog** (owner, 2026-10-08). Event: _pending — read later in GameAnalytics_. |
| 3 | In the real iframe: opens, reads correctly in RU, closes, nothing cut off | ✅ **all four** — opens, RU text renders (owner screenshot, desktop), closes, nothing clipped by the frame (owner: *"Yes"*, 2026-10-08). |
| 4 | Locked tap as a tester (Snippet B) | ✅ owner, verbatim: *"Regarding Snippet B - everything looked fine."* — read as: Snippet B printed ✅ (locked), Create Lobby showed the locked look, the tap opened this popup; Buy not tapped. **First live test of the locked look and locked tap** (dev cannot show them — `0401` § 1a). Run in the game iframe's Console context after a first attempt on `top` (wrong context, snippet refused safely). Events `LockedFeature:Tap:PrivateLobby` → `Citizenship:Explainer:Opened:LockedFeature:PrivateLobby`: _pending — GameAnalytics_. ⚠️ The owner gave one summary answer, not three separate yes/no. |

### Found during these checks (filed, not fixed here)
- The popup stays phone-narrow on desktop → **`0417`** (Sprint 7).
- The ad-free line reads as a perk of every citizen → **`0408`** (Sprint 7, owner ruling: own sub-heading "Только для платного гражданства:").
- No Buy button for an earned citizen → **`0409`** (Sprint 7).
- Light scrollbar track on the dark popup → recorded as an observation in `0417`.

## 2026-10-08 — § 1a: both Console snippets written and tested on the local dev build

Recorded by `fkit-coder`, spawned by `fkit-lead` (owner ask, 2026-10-08: *"Yes, walk me through them."*). No source
change. Change surface: `snippets.md` (new) and this entry. Nothing committed. No token, id, URL or response body
recorded.

**Build:** local `npm run dev` at commit `c12cd8e` (game `0.0.157`, the deployed client), driven in a real Chrome
(Claude in Chrome). Dev server stopped afterwards; ports 3000/3001/3002/9000 free before and after. Test tester marker
removed from the dev page's localStorage afterwards.

**How the snippets work, and why no debug hook was needed.** The published status is a module variable, but its one
writer is the `<citizenship-card>` element, which is in the DOM. The snippets set the card's own `profile` (with
`isCitizen: false`) and `paidGrantConfirmed`, then call the card's own `publishCitizenshipStatus()` — the card
publishes `not_citizen` through the normal path, and the Create Lobby lock listener reacts. Only element property and
method names are used. Production minification keeps those: webpack's default Terser renames local variables, not
properties; checked in a local minified bundle (Oct 6) where `this.profile`, `this.paidGrantConfirmed` and
`publishCitizenshipStatus(){…}` appear by name. ⚠️ That bundle predates `0301`, so `getCitizenshipOffer` was not seen
minified — it is kept by the same rule, not by observation. The live `0.0.157` bundle was not inspected.

**Dev has no Yandex login**, so the card is a guest there. To test, a **test-only harness** (not part of either
snippet) used webpack's module registry to make the dev page look like the owner's paid-citizen session: a verified,
authoritative, paid citizen profile on the card; verification status `verified`; paid `true`; a fake catalog product
so a Buy price exists. Then each snippet was pasted **exactly as it is in `snippets.md`** (checked byte-identical).

### Snippet A — "not a citizen" for check 1: tested **yes**
| What | Result |
|---|---|
| Before: offer `citizen`, status `citizen`, no Buy | yes |
| Run → prints `✅ Snippet A applied` | yes |
| Status reads `not_citizen`; offer `buy` | yes |
| Real click on the card's link → popup shows `citizenship-explainer-buy` (Buy) | yes (screenshot seen) |
| Network calls during the run: only the background `/api/public_lobbies` poll — no profile, payment or other call | yes |
| Guard: earned-citizen profile (not paid) → prints `⛔ STOP`, nothing changed | yes |
| Guard: guest (real dev state, no profile) → prints `❌ … no loaded profile`, nothing changed | yes |

**Not proven locally:** tapping Buy, the Yandex purchase, the card turning citizen without reload, the four events
(no Yandex payments on dev); the snippet inside the real Yandex iframe; the live minified bundle. **Seen and expected:**
after Snippet A the card's status line still reads "verified — paid benefits on" (the snippet does not touch it);
`snippets.md` tells the owner this is not a fault.

### Snippet B — "non-citizen tester" for check 4: tested **in part** (owner ruling *"Accept the half test"*)
| What | Result |
|---|---|
| First run, marker missing → sets `geoconflict_tester` = `1`, prints `ℹ️ … RELOAD` | yes |
| After reload: `isTesterMarkerSet()` true | yes |
| Row visible with the marker | yes — ⚠️ **but proves nothing about the marker:** on dev every flag reads true, so `private_lobbies_all` shows the row even without the marker (seen: row visible on the first load, marker unset) |
| Second run: published status `citizen` → `not_citizen` | yes |
| Network calls during the run: only the background lobby poll | yes |
| Create Lobby `locked` | **false**, as expected on dev — `isCreateLocked()` returns false whenever `GAME_ENV` is `dev`. The snippet therefore printed its `⚠️ … NOT locked` line on dev; live it should print `✅` |

**Not tested locally — said plainly:** the **locked look** and the **locked tap** (tap → this popup, the two events),
and whether the lock listener re-applies the lock live. **Owner's live check 4 is the first full test of both**
(owner ruling *"Accept the half test"*, 2026-10-06).

### Privacy note
- The owner's check-1 console screenshot contained a Yandex purchase token and analytics user/session ids. None of them is recorded here or anywhere else.

### Analytics (checks 1, 2, 4)
- Source: GameAnalytics Explore through the owner's Chrome (owner logged in himself), **read-only, nothing saved**; Design events, aggregation Count, "Past 7 days" + **current day included**, read about 11:39Z on 2026-10-08. ⚠️ GA showed its **"Demo mode" banner** on every page (as on 2026-09-29 and 2026-10-05). Today's numbers are a **partial day**; the owner's 10:56Z test purchase already appears, so data was near-current.
- Check 2: `UI:Tap:CitizenshipLoginExplainer` — **seen ✅, 6** (2026-10-08).
- Check 1: `Citizenship:Explainer:Opened:CardLink` — **seen ✅, 142** · `UI:Tap:PurchaseCitizenshipExplainer` — **seen ✅, 3** · `Purchase:Started:*` — **27** · `Purchase:Completed:*` — **seen ✅, 2** (one is the owner's 10:56Z test purchase) · `Purchase:Abandoned:*` — 24. (Purchase events split by event id 02 only; product id not split — citizenship is the only product.)
- Check 4: `LockedFeature:Tap:*` — **seen ✅, 1** · `Citizenship:Explainer:Opened:LockedFeature:*` — **seen ✅, 1** — both the owner's check-4 tap (first ever on production).
- Also: `Citizenship:Explainer:Opened:Instructions` 2, `Citizenship:RestartPrompt:Shown` 2.

## 2026-10-08 — close

Closed `✅ Done (agent-closed — not owner-verified)` by a spawned `fkit-producer` (no owner channel, ADR-021/037) via `/fkit-task-done`, on the OWNER RULING given live 2026-10-08 in the `fkit lead` session, relayed by `fkit-lead`, verbatim *"Close them"*. The owner ran the live checks; the close itself is agent-run, hence the marker.
- Carried as recorded above, not resolved: **§1 local look (verification step 1, agent first, then owner) was never done**; check 4 is recorded from the owner's one-line summary, not three separate yes/no; check 1's *"card switched without reload"* is weaker proof (the account was already paid) — `Purchase:Completed:Citizenship` is the real proof.
- The *"§1a snippets A and B: NOT written or tested"* line near the top was true when written; the later § 1a entry supersedes it.
- Follow-ups filed during the checks: `0417`, `0408`, `0409`.
