# Verify 0301 Live — the Citizenship Explainer Popup Works in Production (task 0401)

**Source**: `ai-agents/tasks/done/0401-verify-0301-live-the-citizenship-explainer-popup-works-in-production/brief.md` (the record: the same folder's `worklog.md`; the owner's Console snippets: the same folder's `snippets.md`)
**Status**: done (agent-closed — not owner-verified) — ⚠️ **§1 local look never done**
**Sprint/Tag**: Sprint 7, rank 48 (append rank, not a merit rank; moved in from Sprint 8 rank 13 on 2026-10-06) / task `0401`

> ✅ Done (agent-closed — not owner-verified), closed **2026-10-08** by a spawned `fkit-producer` via `/fkit-task-done`,
> on the owner's ruling given live in the `fkit lead` session, verbatim *"Close them"*. The owner ran the live checks;
> the close itself is agent-run, hence the marker.
>
> 🟢 **The popup is live** in game **`0.0.157`** (container started 2026-10-08T06:56:17Z) — `0301` rode with `0248` and
> `0397`. All four live checks passed. ⚠️ **Done out of the brief's order, said plainly:** the popup was already live
> before checking began, so the **§1 local look (agent first, then owner) was never done**, and the § 1a Console snippets
> were written and tested only after the first live checks.

## Goal

Prove in the real game what `0301` built ([[tasks/citizenship-explainer-popup]]): a real purchase from the popup, the
guest login from the popup inside Yandex, the popup inside the real Yandex iframe, and the locked Create Lobby tap for a
tester — none of which the build could show. Filed 2026-10-06 at `0301`'s close under the build/verify-split rule.
Nothing in source.

## Key Changes

Nothing in source. Owner's checks on production, 2026-10-08:

| # | Check | Result |
|---|---|---|
| 1 | Test purchase from the popup (Snippet A fakes "not a citizen" on the paid test account) | ✅ purchase completed (Yandex test payment); `Purchase:Completed:Citizenship` fired ~10:56Z — **the real proof**; the popup gave way to the post-purchase restart dialog. ⚠️ *Card turned citizen without reload* is **weaker proof** — the account was already paid |
| 2 | Guest: login button (not Buy); tap opens the Yandex login | ✅ |
| 3 | Real iframe: opens, RU renders, closes, nothing clipped | ✅ all four (desktop) |
| 4 | Locked tap as a tester (Snippet B) | ✅ owner: *"Regarding Snippet B - everything looked fine."* **First live test of the locked look and the locked tap.** ⚠️ One summary answer, not three separate yes/no |

- **§ 1a — the two Console snippets** were written and tested by `fkit-coder` on a local `npm run dev` at `c12cd8e`. They
  touch only the `<citizenship-card>` element's own properties and its `publishCitizenshipStatus()` method, so no debug
  hook was added. Snippet A: tested **yes** (including its two refusal guards). Snippet B: tested **in part**, by the
  owner's earlier ruling *"Accept the half test"* — `isCreateLocked()` is always false on a dev build, so the locked look
  and tap could only be proven live (check 4). ⚠️ That minification keeps the names used was checked on an older local
  bundle, not on the live `0.0.157` bundle. In the Yandex iframe the Console must be switched to the game iframe's context
  (a first attempt on the host page was refused safely by the snippet).
- **Analytics read ~11:39Z 2026-10-08** (partial day, *"Demo mode"* banner): `UI:Tap:CitizenshipLoginExplainer` 6 ·
  `Citizenship:Explainer:Opened:CardLink` 142 · `UI:Tap:PurchaseCitizenshipExplainer` 3 · `Purchase:Started:*` 27 ·
  `Purchase:Completed:*` 2 (one is the owner's test) · `Purchase:Abandoned:*` 24 · `LockedFeature:Tap:*` 1 and
  `Citizenship:Explainer:Opened:LockedFeature:*` 1 (both the owner's check-4 tap — the first ever on production) ·
  `Citizenship:Explainer:Opened:Instructions` 2 · `Citizenship:RestartPrompt:Shown` 2.
- **Privacy:** the owner's check-1 screenshot held a purchase token and analytics ids; none is recorded anywhere.

## Outcome

- **Follow-ups filed during the checks** (all on Sprint 7):
  - **`0417`** (rank 63) — the popup stays phone-narrow on desktop; use more width on larger screens (light scrollbar track
    recorded there as an observation). Weekend slot.
  - **`0408`** (rank 55) — the ad-free line reads as a perk of every citizen; owner ruling: its own *paid citizenship only*
    sub-heading.
  - **`0409`** (rank 56) — no Buy button for an earned citizen who has not paid (verified sessions only).
  `0408` and `0409`, with `0407`, were moved in from the Backlog board with the owner's same-day deploy exception.
- **`0354`'s release gate item 5 is met** — `0301` is deployed ([[tasks/private-lobby-citizen-perk]]).

## Related

- [[tasks/citizenship-explainer-popup]] — task `0301`, the build this verifies
- [[tasks/authenticated-profile-read-live]] — task `0396`, the hard dependency
- [[tasks/paid-citizen-ad-free-live]] — task `0398`, same deploy (`0301` ships with `0248`)
- [[tasks/session-verified-status-line-live]] — task `0400`, same deploy
- [[tasks/private-lobby-citizen-perk]] — task `0302`, the locked Create Lobby tap; release-gate item 5
- [[tasks/private-lobby-tester-default]] — task `0354`, the tester marker the snippet sets and the six-item gate
- [[tasks/citizenship-paid]] — task `0018`, the purchase path the popup's Buy reuses
- [[tasks/citizenship-restart-prompt]] — task `0303`, the post-purchase restart dialog seen in check 1
- [[systems/analytics]] — the explainer, locked-feature and purchase events read here
- [[decisions/sprint-7]] — the board (rank 48) and the follow-ups `0407`–`0409`, `0417`
- [[decisions/sprint-8]] — filed there (rank 13) before moving to Sprint 7
