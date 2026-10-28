# Incident 2026-10-25 — a paying player's citizenship and nickname "disappeared" (his Yandex player ID changed twice)

**Date**: 2026-10-25
**Status**: accepted *(page-type field; the incident is **not closed** — the restore `0504` waits on Yandex's answer)*

> 🚀 **2026-10-28 sync (`7a2ef92`) — the fixes are LIVE.** Profile box **`0.0.165-profile.1`** and live game **`0.0.167`**
> deployed 2026-10-27: S1 `0506`, S2 `0510`, the merge tool `0503`, the popup `0507` and the held purchase-flow code are
> all out. **S1v `0511` ✅ closed** ([[tasks/stop-consuming-profile-box-live-check]]); **S2v `0512` ⛔ cancelled**
> ([[tasks/stop-consuming-client-live-check]]) — the pre-release T3 gate was skipped by the owner; T3 passed on live
> afterwards. Hand-run purchase checks replaced by the GameAnalytics read `0516` (on or after 2026-11-03). New: `0517`
> (the profile box served requests before its migrations finished). Still open: `0504` restore, `0509`, `0513`.

> Hub page for the Sprint 9 incident work, written by the 2026-10-27 sync (`5f93b96`). Sources: the briefs of `0502`,
> `0503`, `0505`, `0506`, `0507`, `0508`, `0510` (all in `ai-agents/tasks/done/`), `0502`'s worklog (evidence and
> check-7 counts), ADR-126, ADR-127, ADR-128, the `0505` design spec, and the Sprint 9 board's addenda.
>
> 🔒 **Privacy rule for this page and every page it links:** the player is **"the affected player"** only. No player
> id, Yandex id, nickname, match id, purchase token or name appears anywhere in the vault. The real values live only
> in the owner's own SSH session and the copy he sent to Yandex, never in git.

## Context

- **The report.** 2026-10-25, in-game feedback (category Bug), Yandex platform, game `0.0.165`: the affected player
  says the paid citizenship he bought on his first day, and the nickname he set, are both gone. A second message on
  2026-10-26 (category Other) asks for the citizenship back. The feedback reaches us only through Telegram, carrying
  his **current display name** and nothing else — so there was no way to write back
  ([[features/feedback-button]]).
- **Why it can happen.** Citizenship (`players.is_paid_citizen`) and nickname (`players.display_name`) live on one
  `players` row, and no code path removes both. Logins reach that row through `player_identities`
  ([[decisions/adr-113-internal-player-id]]). If Yandex hands the same person a new `getUniqueID()`, our server makes a
  **fresh empty record** and the old one becomes unreachable. The same had happened to the owner's own test account on
  2026-10-08 (task `0424`, parked on the Backlog board).
- **Why the purchase could not be found from Yandex's side.** The client **consumed** every purchase right after our
  server recorded it, and Yandex deletes a consumed purchase for good. So our database was the only proof he paid.

## What was found (`0502`, owner-run read-only checks, 2026-10-27)

Outcome **(A), on a three-profile chain** — owner ruling *"A now, merge after Yandex (Recommended)"*
([[tasks/lost-citizenship-cause-checks]]):

| Profile (by role) | Created | Paid | Nickname | Browser history at creation (daysPlayed / gameRecordDays) |
|---|---|---|---|---|
| old paid profile | 2026-09-29 (citizenship bought the same minute; 1 receipt) | yes | his approved nickname | 54 / 64 |
| intermediate profile | 2026-10-22, 48 min after the old one's last login | no | none | 75 / 86 |
| current profile | 2026-10-25, ~3.5 h after the intermediate one's last login | no | none | 77 / 88 |

- **Reading:** one browser, one player; **his player ID changed twice** (2026-10-22 and 2026-10-25). Each newer
  profile got its own tenure gift.
- **A first search used the wrong name** (the display name from the feedback, not the nickname he had set) and found
  nothing; a different player's profile was briefly taken as the candidate. The first message to Yandex named that
  wrong candidate; a correction was sent the same day (see below).
- **Are others hit?** Unknown in number. A simplified check 7 (tenure gifts per day to new profiles with 30+ days of
  browser history) shows a steady ~5–15 a day since about 2026-10-06 and **no spike** on his two ID-change days. Each
  such row is either a long-time guest logging in or an ID change like his — **the data cannot tell them apart.**
  The reading is `fkit-lead`'s, relayed, not verified by the wiki.

## Decision — the response (owner rulings, 2026-10-26 → 2026-10-27, all relayed by `fkit-lead`)

The owner's first call, asked *"Given that not consuming can't recover this player's purchase, what do we do
first?"*: **"Merge tool + stop consuming"**. The work split into Sprint 9 tasks `0502`–`0513`:

| Task | What | State (2026-10-27) | Vault |
|---|---|---|---|
| `0502` | owner-run read-only checks: confirm the cause | ✅ Done — outcome (A) | [[tasks/lost-citizenship-cause-checks]] |
| `0503` | owner-run profile merge tool (SSH-only, dry run first, audited) | ✅ Done — committed `962f427`, **not deployed** | [[tasks/profile-merge-tool]] |
| `0504` | run the merge for the affected player | 🔲 Backlog — **waits on Yandex's answer** | — (backlog) |
| `0505` | design + ADR: stop consuming permanent purchases | ✅ Done — spec + ADR-126 approved | [[tasks/stop-consuming-design]] |
| `0506` | S1, profile box: server-owned consume policy, "held elsewhere", sightings | ✅ Done — committed `baaf2f8`, **not deployed** | [[tasks/stop-consuming-profile-box-s1]] |
| `0507` | one-player message popup (contact links), targeted by a Yandex flag | ✅ Done — committed `baaf2f8`, **not deployed** | [[tasks/one-player-message-popup]] |
| `0508` | draft the message to Yandex Games | ✅ Done — sent 2026-10-27; answer pending | [[tasks/yandex-player-id-change-message]] |
| `0509` | put the player's stable id in the feedback message | 🔲 Backlog | — (backlog) |
| `0510` | S2, client: consume only what the server lists; "held elsewhere" offer | ✅ Done — committed `f7ce268`, **not deployed** | [[tasks/stop-consuming-client-s2]] |
| `0511` / `0512` / `0513` | live checks of `0506` / `0510` (T1–T3 pre-release) / `0507` | 🔲 Backlog | — (backlog) |

Three ADRs came out of it:
- [[decisions/adr-126-permanent-purchases-not-consumed]] — citizenship and durable items are never consumed; a
  purchase seen on another profile is blocked and recorded, never moved by itself.
- [[decisions/adr-127-consume-switch-source-setting]] — the safety switch is a committed constant; S1 goes to the live
  profile box first (there is no dev profile box).
- [[decisions/adr-128-owner-run-profile-merge]] — one owner-run merge command; paid state moves only through
  `transferPurchase`; every real merge is audited in `player_merges`. Supersedes ADR-113 in part.

**Standing rule kept throughout:** **never an automatic merge** (`0424`): the only link between two records is a
person's claim, and an automatic merge would let anyone claim someone else's progress.

## Consequences

- **The restore is not done.** `0504` (KEEP = the old paid profile; both newer profiles as sources in one run; a
  required follow-up dry run 24 h later) runs **only after Yandex confirms** the account and purchase link, and only
  after a profile-box deploy carries migration `012`.
- **Yandex correspondence** (tracked on `0504` by owner ruling *"Note on 0504 (Recommended)"*): first message sent
  2026-10-27 *"exactly as you showed it to me"* — it included the wrong candidate profile; the correction naming the
  right three-profile chain was sent 2026-10-27 (owner: *"I already have sent the message to Yandex as soon as you
  sent it to me"*). **Answer pending.**
- **Nothing is live.** `git tag --contains` → **none** for `baaf2f8`, `f7ce268`, `cc52296`, `962f427`, `5f93b96`
  (checked 2026-10-27; newest tags game `0.0.165`, profile `0.0.164-profile.2`). The held purchase-flow deploy
  (`0491`/`0492`/`0494`/`0495`/`0496`/`0488`) now ships **with** S1 and S2 (owner: *"Hold it"*).
- **What stopping consumption does not fix:** the affected player and the ~21 earlier buyers (already consumed), and
  the ID-change case entirely **if `getPurchases()` is scoped per game id rather than per Yandex account** (unknown;
  asked of Yandex as Q2, nothing waits on it).
- **Root cause stays open:** `0424` is kept parked until Yandex answers.

## Related

- [[tasks/lost-citizenship-cause-checks]] · [[tasks/profile-merge-tool]] · [[tasks/stop-consuming-design]] ·
  [[tasks/stop-consuming-profile-box-s1]] · [[tasks/stop-consuming-client-s2]] · [[tasks/one-player-message-popup]] ·
  [[tasks/yandex-player-id-change-message]]
- [[decisions/adr-126-permanent-purchases-not-consumed]] · [[decisions/adr-127-consume-switch-source-setting]] ·
  [[decisions/adr-128-owner-run-profile-merge]] · [[decisions/adr-113-internal-player-id]]
- [[systems/player-profile-store]] — the backend holding the records
- [[systems/shared-purchase-flow]] — the purchase flow the consume change edits
- [[decisions/sprint-9]] — the sprint the work sits on
- [[features/feedback-button]] — the only channel the report came through
- [[systems/analytics]] — the incident's new events (`PlayerMessage:*`, held-on-another-profile)
- [[decisions/incident-2026-08-22-public-lobbies-outage]] — the vault's earlier incident page
