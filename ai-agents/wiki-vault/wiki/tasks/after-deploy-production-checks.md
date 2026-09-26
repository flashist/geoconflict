# After-Deploy Production Checks — Profile Token, Earned Citizenship, Personal Inbox

**Source**: `ai-agents/tasks/done/0296-after-deploy-production-checks-profile-token-earned-citizenship-inbox/brief.md` (plus `worklog.md` in the same folder)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 5 · task `0296` · receives the production checks of the closed `0062`, `0017`, `0012`

> ✅ **Every check ran in production on 2026-09-26 and passed — with ONE sub-check not observed.** Section
> A after the weekend deploy window, section B after the citizenship flip. Closed the same day on the
> owner ruling *"Close it (Recommended)"*, recorded by a spawned `fkit-producer` with no owner channel ⇒
> **`(agent-closed — not owner-verified)`** (ADR-021, ADR-033 §5). Every check was run or observed by the
> **owner**; the lead ran some read-only checks itself; the producer observed none of it.
>
> ⚠️ **Not observed:** that the bell dot **clears** after the Personal tab is opened (B2). Recorded as not
> checked, not as passed.

## Goal

Filed **2026-09-23** on an owner ruling, so three built-and-reviewed tasks could close without waiting on
production: [[tasks/forward-profile-internal-token]] (`0062`), [[tasks/citizenship-earned]] (`0017`) and
[[tasks/personal-inbox]] (`0012`). Their production-only checks moved **here**; the local browser checks of
`0012` and `0017` were **waived** (accepted tradeoff: nobody saw the Personal tab in a browser until after
launch). The citizenship flip is **not** in this task — it belongs only to [[tasks/citizenship-go-live]]
(`0065` §6).

Two sections, run at different times:
- **Section A** — after the weekend deploy window, the first deploy with `PROFILE_INTERNAL_TOKEN`
  **non-empty** (see [[systems/weekend-deploy-window]]).
- **Section B** — after the citizenship flip, because the card and the Personal tab are hidden behind
  `CITIZENSHIP_CARD_ENABLED` until then.

**Why these could not run before:** `0062`'s check of 2026-09-04 read the token **empty** — but the owner
had blanked it on purpose, so forwarding an empty value and never forwarding looked identical. **The
"blank the token by hand" rule was retired 2026-09-24** (owner: *"Retire it"*): the token is always set in
production, and a blank one is a **REQUIRED** finding in the production value check (report-only until
`0298` arms `--enforce`, after which a blank token **blocks** a production deploy). `0296` stopped gating
`0065` on 2026-09-23 (*"Keep it in Sprint 5, but the task shouldn't block Sprint 4"*).

## Key Changes

Nothing is built; the task runs and records checks. 🔒 No token value, hash, connection string, IP
address, personal name or Yandex ID appears in its artifacts — accounts are named by a short id prefix
only, and this page names none.

| Check | Came from | Result |
|---|---|---|
| **A1** local and box tokens match | `0062` D1 | ✅ `MATCH` |
| **A2** token reaches the container non-empty | `0062` D2 (+ `0017` / `0012` item 1) | ✅ **both halves**: container `NONEMPTY`, and the source value was non-empty at deploy time |
| **A3** end to end | `0062` D3 (+ `0017` / `0012` item 1) | ✅ `credited` > 0 in the worker log; credit rows in the profile database |
| **A4** no warning, no leak | `0062` D4 | ✅ partial-config warning 0; the token string in game logs 0 (matched by file, value never printed); none in the deploy log |
| **A5** real XP accrual | `0017` | ✅ 9 players with XP > 0 (0 before) |
| **A6** seeded live grant | `0017` | ✅ **PASS** — see below |
| **B1** card State 3 in the live iframe | `0017` | ✅ ГРАЖДАНИН, 100/100; the buy button replaced by the name-change button; updated **without a reload** |
| **B2** inbox message | `0012` | ✅ message shown as new in the Personal tab; **read state persisted** to a second device; ⚠️ **dot clearing not observed** |
| **B3** citizen gating | `0012` | ✅ before earning, the same account saw **no** Personal tab (one account) |

**A6 in detail.** The owner's own main account was seeded **one award (1 XP) below the live threshold of
100** — the brief warned to use the figures actually live, since the XP rescale (ADR-111) changed them. The
seed is a **labelled ledger row** (its game id starts `seed-`), because the tenure-grant table only accepts
kind `tenure` and a ledger row is what the real credit path writes, so XP stays equal to the ledger sum. A
real multiplayer match then credited 1 XP ⇒ XP 100, `is_citizen` true, earned timestamp set at **the same
instant as the credit**, one `citizenship_earned` inbox message.
- 📌 **The seed row stays as the audit record.** Any count of credited matches that could include it must
  exclude game ids starting `seed-`.
- ⚠️ **Accepted side effect:** one real `Citizenship:Earned:XP` analytics event was sent from the owner's
  own account. It cannot be undone.

## Outcome

- **The profile token path is proven in production** — the first time since `0062` was built in August.
- **The earned-citizenship grant is proven live**, end to end, on one account.
- **Second-device finding — not a defect of this task, but it started an epic.** On the owner's phone the
  message showed as read (server-side state works), but the phone also showed a bell dot — explained by the
  general-announcements "last seen" id being kept **per device** in local storage. Together with the
  Tutorial being offered again on the same account, this triggered backlog epic **`0304`** (keep logged-in
  players' settings on the server; children `0305` → `0306`) — see [[decisions/sprint-backlog]].
- 👁️ **A3 watch item carried to the runbook, not closed here:** two `players/resolve` timeouts during the
  window, both recovered on retry (finding **F-B**). At W15 the game container log must still show 0
  `failed after retries`. No W15 reading is recorded in this task.
- **Other observation:** 104 tenure grants recorded by about 12:00 UTC on 2026-09-26 — real players
  claiming (see [[tasks/tenure-xp-grant]]).
- No failure was found ⇒ no new task filed.

## Related

- [[tasks/forward-profile-internal-token]] — `0062`, whose D1–D4 became A1–A4
- [[tasks/citizenship-earned]] — `0017`, whose live tail became A2–A3, A5, A6 and B1
- [[tasks/personal-inbox]] — `0012`, whose live tail became A2–A3, B2 and B3
- [[tasks/citizenship-go-live]] — `0065` §6, the flip section B waited for
- [[tasks/profile-p2-wire-game-server]] — `0217`, the wiring whose deploy window section A observed
- [[tasks/tenure-xp-grant]] — `0253`, the tenure claims seen the same day
- [[tasks/deploy-time-config-parity-guard]] — `0064`, the value check that now reports a blank token as REQUIRED
- [[decisions/adr-111-xp-economy-rescale]] — why A6 seeded against 100, not 1,000
- [[systems/player-profile-store]] — the ledger, the grant and the inbox rows checked here
- [[systems/weekend-deploy-window]] — the window whose W11/W13/W14 carried A1–A4
- [[decisions/sprint-5]] — the launch sprint it closed on
- [[decisions/sprint-4]] — the board this work started on, before the 2026-09-23 rescope moved it to Sprint 5
- [[features/announcements]] — the bell popup whose Personal tab went live with the launch
- [[systems/analytics]] — the citizenship and inbox events, now able to fire in production
- [[tasks/citizenship-name-change]] — task `0067`, the name-change UI — first seen live after the launch
- [[tasks/citizenship-xp-progress-ui]] — task `0191`, the card — first seen in a browser at the launch
