# Citizenship card: suggest a reload when the experiment-flags fetch timed out

## ID
0411

> ℹ️ **ID allocation, checked 2026-10-08 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/`
> (folder names and `## ID` fields agree) is `0410`, so this is `0411`. `grep -rn 0411 ai-agents/tasks
> ai-agents/sprints`: one unrelated hit (inside a hash digest in `0218`'s worklog), no task reference.

## Sprint
Backlog

## Priority
Unscheduled

⚠️ The owner gave no rank. Filed on the unranked [Backlog board](../../../sprints/backlog.md) as an appended row
(ADR-035) — its place on that board is **append order, not a merit ranking**. Needing a rank is the signal to pull it
into a sprint.

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

### What was seen (2026-10-08, production, game `0.0.157`)

The owner's own session, network throttling **off**. The start screen showed **no citizenship card at all**. The
browser console had, verbatim:

- `Error: [SDK] too long resolve for method 'get_flags/fetch'` — from the Yandex SDK script.
- `flashist_logErrorToAnalytics __ errorText: ERROR! FlashistFacade | loadExperimentFlags __ error: Error: getFlags timed out | severity: Debug`

**In plain words:** at startup the game asks Yandex for its remote settings ("experiment flags"). One of them,
`citizenship_ui`, is the remote on/off switch for everything citizenship-related. That request took longer than our
5-second limit, so the game gave up and behaved as if the switch were **off** — for the whole session.

### What that does to the player

- **No citizenship card** on the start screen.
- **No ★ citizen badge.**
- 🔴 **A paid citizen sees interstitial ads** — the ads they paid to remove. The paid ad-free perk (`0248`) reads the
  same switch, and when the switch is unknown it is treated as off, which for ads means **ads show**.

All of it lasts until a reload that happens to get the flags in time. Nothing on screen tells the player anything is
wrong.

### How often — not measured

Unknown. The failure is already sent to GameAnalytics as a `Debug` error event (text above), so it can be counted later.
`fkit-lead` offered the owner to count it; that count is **not** part of this task and does not gate it.

### What the code does today (checked by `fkit-lead`, re-read by the producer 2026-10-08)

- `src/client/flashist/FlashistFacade.ts` `fetchExperimentFlags()` (~L1534-1565): **one** `getFlags()` call, raced
  against `PLATFORM_INIT_DEADLINE_MS` (5 s). On timeout or error the flags stay **unset** (`undefined`); on success
  they are an object (an empty one if the SDK returned nothing). The result is memoized
  (`yandexInitExperimentsPromise`) and **never refetched** — the comment says so. The error is logged with
  `flashist_logErrorToAnalytics` (~L580) at `Debug` severity.
- `checkExperimentFlag()` (~L1591-1609): returns `false` when the flags are unset — **the same answer as "flags loaded,
  `citizenship_ui` is not `enabled`"**. Today nothing downstream can tell the two apart. (In `GAME_ENV === "dev"` it
  always returns `true`, so this never shows in local dev — tests must not run in that mode.)
- `isCitizenshipUiEnabled()` (~L1640) → `citizenship_ui` (`CITIZENSHIP_UI_FLAG_NAME`), value `enabled`.
- The sync snapshot `citizenshipSurfacesSnapshot` (~L1665-1690) is **default `false` on purpose** (task `0236`: the
  kill switch fails closed). It feeds the ★ badge and `isInterstitialSuppressedForPaidCitizen()` (~L2341, task `0248`).
  The code comment already warns: for the badge `false` hides it, **for the ad gate `false` means ads show**.
- `src/client/CitizenshipCard.ts` `connectedCallback()` (~L143-172): when `isCitizenshipUiEnabled()` is false the card
  gets `hidden` and only `recheckWhenPlatformRecovers()` (~L276, task `0329`) is armed. That waits for a **late SDK
  recovery** — it does not fire for a flags fetch that timed out with the SDK present — so the card stays hidden all
  session.
- The Restart button to reuse (task `0397`): `src/client/ProfileReadRestart.ts` `restartAfterProfileReadFailure()`
  (reloads **only on the start screen**; refused in a lobby, a join or a match; writes the sessionStorage marker
  `PROFILE_READ_RESTART_MARKER_KEY`; fires `Citizenship:Status:Restart` right before the reload) and
  `wasRestartedAfterProfileReadFailure()` (reads and removes the marker once per page, so the next load can say "still
  not working"). Texts: `citizenship_status.read_failed`, `.restart`, `.still_failing` in `resources/lang/en.json` /
  `ru.json`.

### OWNER RULING — verbatim (2026-10-08)

Given live via `AskUserQuestion` in the `fkit lead` session (a custom answer), relayed by `fkit-lead` to a spawned
`fkit-producer` with no owner channel (ADR-021/037). ⛔ Not producer precedent.

> *"Task on Backlog, and I am not sure we can do much here, probably, the best thing we can do is to suggest a reload,
> similarly to the way we do it if a profile information is not received (not a forced popup), I think we can reuse
> the same citizenship-reload related button."*

### ⚠️ Decisions this touches — read before planning

- **Ruling D3** (task `0273`: no in-page retry, restart instead), **widened on 2026-10-06 by exactly one button** —
  the `0397` Restart button, *"on load-fail only"*. This task puts that **same button** on a **second** kind of
  failure. The owner's ruling above asks for exactly that, so it is owner-authorised — but it is a further widening of
  D3, and closing this task should record it next to the 2026-10-06 note on `0273`'s brief.
- **"Kill means kill"** (task `0291`, which withdrew the card's degraded-SDK fail-open). When the flags timed out we
  **do not know** whether the owner has the switch on or off. Showing the reload line in that case means a session
  where the owner had turned citizenship off **can** still see a "couldn't load — restart" line, if its flags fetch
  also timed out. See open point 2 — this is the owner's call, not the coder's.

### Related work

- [`0397`](../../done/0397-show-players-whether-their-session-is-verified/brief.md) — the Restart button and the
  `read_failed` / `still_failing` line. Built and live.
- [`0248`](../../done/0248-suppress-interstitial-ads-for-paid-citizens/brief.md) — paid ad-free; reads the switch.
- [`0236`](../../done/0236-client-kill-switch-for-citizenship-surfaces/brief.md) — kill switch fails closed.
- [`0329`](../../done/0329-citizenship-card-re-checks-its-gate-when-the-platform-recovers-late/brief.md) — the
  late-platform-recovery re-check.
- [`0410`](../0410-citizenship-card-do-not-show-zero-xp-and-an-empty-bar-when-the-profile-could-not-load/brief.md) —
  same card, the read-failed header. ⚠️ **Sequence with it:** both change how the card looks in a "couldn't load"
  state. Build one after the other, and make the flags-timeout shell agree with whatever `0410`'s owner ruling picks
  (no "0 / 100", no empty bar).
- [`0407`](../../done/0407-thank-paid-citizens-for-supporting-the-game-on-the-citizenship-card/brief.md),
  [`0408`](../../done/0408-explainer-popup-put-the-paid-only-ad-free-perk-under-its-own-paid-citizenship-sub-heading/brief.md),
  [`0409`](../../done/0409-explainer-popup-offer-a-buy-button-to-earned-citizens-who-have-not-paid-verified-sessions-only/brief.md)
  — Sprint 7, same card / popup area. **This task does not wait on them**; expect merge conflicts in
  `CitizenshipCard.ts` and its tests if in flight together.

## What to build

### Goal (the owner's ruling)

When the flags fetch **timed out or failed**, show a **non-forced** suggestion to reload where the card would be,
**reusing the existing `0397` Restart button** (its start-screen-only guard and its "already restarted once" marker).
⛔ **Not a forced popup, never an automatic reload** — the reload only ever follows the player's own press.

### ⛔ Load-bearing constraint — the kill switch must keep working

When the flags **loaded** and `citizenship_ui` is **not** `enabled` (the owner turned it off in the Yandex console),
**nothing** citizenship-related may show — exactly as today. So the code must tell apart:

| State | Today | After this task |
|---|---|---|
| Flags loaded, `citizenship_ui` = `enabled` | card shows | unchanged |
| Flags loaded, `citizenship_ui` not `enabled` (**kill switch off**) | card hidden | **unchanged — hidden, no reload line** |
| Flags fetch **timed out / failed** (SDK present) | card hidden all session | **reload suggestion** |
| Local gate `CITIZENSHIP_CARD_ENABLED` false | card absent | **unchanged — beats everything** |
| No SDK at all (degraded boot, `0291`/`0329`) | card hidden, re-check on late recovery | unchanged unless the owner rules otherwise (open point 5) |

Only the "timed out / failed" row gets the reload suggestion. ⛔ No second flags request and no second "did it fail?"
check that could disagree with the first — one recorded outcome of the one fetch, read by the card.

### Open points — the owner confirms at the coder's plan gate

**Listed with recommendations, NOT decided.** The coder's plan puts these to the owner; nothing is built on a guess.

1. **Wording.**
   - **(a) Reuse `citizenship_status.read_failed` / `still_failing` as they are.** ← `fkit-lead`'s suggestion, if the
     meaning fits: *"We couldn't load your profile right now. Nothing is lost — a restart usually helps."* It fits in
     substance (something didn't load; a restart helps; nothing lost) and needs no new text.
   - (b) A short new line (RU + EN, owner approves wording) if "your profile" reads wrong — strictly, the profile was
     never requested; the remote settings were.
   - The producer leans (a): the player cannot see the difference and the promise ("nothing is lost, restart") is the
     same.
2. **What the suggestion looks like when the card is hidden — and the kill-switch tension.**
   - **(a) A minimal card shell: only the notice line and the Restart button** — no name, no XP, no bar, no buy button,
     no badge. ← `fkit-lead`'s suggestion.
   - (b) Something else the owner names.
   - ⚠️ **Whatever is picked, the owner should confirm this, explicitly:** on a timed-out fetch we cannot know the
     switch's real value, so a session where citizenship is **switched off** can still see this line when its flags
     fetch also times out. The producer's read is that (a) is acceptable — the line shows no citizenship content and a
     reload that gets the flags applies the real switch — but **after `0291`'s "kill means kill" this is the owner's
     call**, not the coder's.
3. **Optional — mention only, not the goal: apply flags that arrive late.** The SDK promise may still resolve after
   our 5 s. Keeping it and applying a late result (showing the card, re-priming the badge / ad snapshot, and the other
   flag-gated features) could fix the session **without** any reload. The owner was unsure much can be done here; it is
   recorded as an option. If the owner wants it, it is a **separate** brief — it touches every flag reader, not just
   the card.
4. **Optional — mention only, out of scope unless the owner says so: ads for a server-verified paid citizen when the
   switch is unknown.** Today a paid citizen sees ads on such a load. Letting a server-verified paid status suppress
   ads even when the switch is unknown would change what the kill switch means (`0236` / `0248`). **Owner's call** —
   if wanted, a separate brief.
5. **Scope of "failed".** Recommended: only **SDK present, `getFlags()` timed out or threw**. A degraded boot with no
   SDK at all stays as it is today (`0291` fail-closed + `0329` late-recovery re-check). Owner confirms.
6. **The restart marker and analytics event.** Reusing `0397`'s marker means a press here and a failure on the next
   load (flags **or** profile) shows `still_failing`. Reusing `Citizenship:Status:Restart` means restarts for a
   flags timeout and for a profile read failure can't be told apart in GameAnalytics. Recommended: **reuse the
   marker** (the "still not working" text is right either way), and ask the owner whether the event needs a
   distinguishing variant. If an event is added or changed, follow `analytics-event-reference.md` and the
   `flashistConstants.analyticEvents` enum.

### Build (after the plan gate)

- Client-only. Record the outcome of the one flags fetch (loaded vs timed out / failed) in `FlashistFacade.ts` without
  changing what `checkExperimentFlag()` returns to its other callers.
- In `CitizenshipCard.ts`, the "flag not enabled" branch shows the reload suggestion **only** for the timed-out /
  failed outcome; the kill-switch branch stays exactly as today.
- Reuse `restartAfterProfileReadFailure()` / `wasRestartedAfterProfileReadFailure()` as they are — the start-screen-only
  guard and the once-per-page marker read are owner-approved (`0397`) and are not changed.
- ⛔ No forced popup, no automatic reload, no in-page refetch (D3).
- The kill-switch snapshot default stays `false` (`0236`). Badge and ad behaviour on such a load are unchanged by this
  task (open points 3 and 4 are separate).
- Any new user-visible text goes through `translateText()`, with keys in **both** `resources/lang/en.json` and
  `resources/lang/ru.json`. Option 1(a) needs no new text.
- Both HTML entry points load the same card; no template change is expected — if the plan adds an element, update
  `index.html` **and** `yandex-games_iframe.html`.

## Verification steps

1. **Plan gate:** the owner's answers to open points 1, 2, 5 and 6 (and a yes/no on 3 and 4) are recorded in this
   task's worklog — who, date, channel, words verbatim — before the build starts.
2. **Separate named unit tests** (not in `GAME_ENV === "dev"`, which forces every flag true):
   - *flags fetch timed out* → the card shows the approved reload suggestion with `#citizenship-status-restart` (or the
     approved equivalent); no name / XP / bar / buy button / badge unless the owner approved them.
   - *flags fetch threw* → same as timed out.
   - *flags loaded, `citizenship_ui` off (kill switch)* → **nothing** shows: card hidden, no reload line, no Restart
     button. This is the load-bearing test — it must fail if the two states are ever merged again.
   - *flags loaded, `citizenship_ui` = `enabled`* → card renders exactly as before.
   - *local gate `CITIZENSHIP_CARD_ENABLED` false* → nothing shows, even with a timed-out fetch.
   - *no SDK (degraded)* → matches the owner's ruling on open point 5.
   - *Restart pressed on the start screen* → reloads and writes the marker; *pressed in a lobby / match* → refused, no
     reload, no marker (reuse `0397`'s existing coverage pattern).
   - *Next load after a press, still failing* → the `still_failing` text.
3. Facade test: a timed-out fetch and a "flag off" fetch both make `checkExperimentFlag()` return `false` as today, while
   the recorded outcome differs — so no other flag reader changes behaviour.
4. If any text was added: both `en.json` and `ru.json` carry it; no hardcoded user-visible string.
5. `npm test` green (judge a lone `Exceeded timeout of 5000 ms` by the supertest-flake rule in `CLAUDE.md`, and say if
   you re-ran).
6. **Live check (separate, per the owner's build/verify split rule, 2026-09-29):** on the live game, make the flags
   request slow or blocked (e.g. DevTools request blocking) and confirm the reload suggestion appears and the Restart
   button works; then confirm a normal load still shows the card. This needs a deploy and an owner check, so it is filed
   as its own verify task when this one closes — it does not hold this task open. ⚠️ The kill-switch-off case cannot be
   checked live without turning citizenship off for real players; the unit test in step 2 is its gate unless the owner
   chooses otherwise.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing
- Related: `0397` (Restart button — reused, not changed), `0248` (paid ad-free, reads the switch), `0236` (kill switch
  fails closed), `0291` (card fails closed when degraded — "kill means kill"), `0329` (late platform recovery re-check),
  `0410` (same card, read-failed header — sequence with it), `0407` / `0408` / `0409` (Sprint 7, same area; not waited
  on), `0273` (ruling D3 — widened again by this task, owner-authorised).
- 🔴 **The paid-citizen-sees-ads consequence is NOT fixed by this task.** The reload suggestion gives the player a way
  out; ads on the timed-out load itself stay as they are unless the owner rules on open point 4.
- Frequency is unmeasured; the GameAnalytics `Debug` error event can be counted separately (offered by `fkit-lead`).
- No ids, hosts, URLs, real names or secrets belong in this brief or its follow-ups.
- Filed 2026-10-08 by a spawned `fkit-producer` on an owner ruling relayed by `fkit-lead`. ⛔ Not producer precedent.
