# Verify Sprint 7's Popup, Start-Screen and Private-Lobby Fixes Live — One Checklist (task 0420)

**Source**: `ai-agents/tasks/done/0420-verify-sprint-7-popup-start-screen-and-private-lobby-fixes-live-one-checklist/brief.md` (`worklog.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 8, rank 18 (ADR-035 append rank; owner ruled *"Keep rank 18"*, read as the top group) / task `0420`

> ✅ Done (agent-closed — not owner-verified), closed 2026-10-11 on the owner ruling *"Close it (Recommended)"* (live
> `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`). Every required item passed live, owner-run, on
> game `0.0.161` (2026-10-09) and `0.0.163` (2026-10-11). **Not checked live:** item 7(B), the error-window copy (by
> owner ruling, never recorded as passed); item 7(A) on a phone (optional, not run).

## Goal

One owner-run live checklist for eight Sprint 7 builds that closed on local evidence only (owner ruling 2026-10-08,
the build/verify-split rule of 2026-09-29): `0416`, `0408`, `0409`, `0407`, `0417`, `0412`, `0413`, and — folded in on
2026-10-09 as item 8 (owner ruling *"Fold into 0420"*, which cancelled `0422`, see [[decisions/cancelled-tasks]]) —
`0421`. Every check was copied from the build task's own brief, plan or worklog. ⛔ No real purchase anywhere: the Buy
button on the earned test account is look-only. `0382`'s live check is separate (`0383`,
[[tasks/yandex-invite-sdk-link-live]]).

## Key Changes

Nothing built. The owner ran the checklist inside the Yandex Games page; the coordinating session recorded each bullet
in the worklog, accounts described by role only.

## Outcome

| Item | Build task | Result |
|---|---|---|
| 1 — a private lobby starts, no 403 | `0416` [[tasks/worker-route-query-string]] | **pass** (2026-10-09): computer host (paid tester) + phone friend joined by invite link; match started for both, no 403, no "Не удалось начать игру" window; read-only server-log **counts** (1 private create line, 1 of 1 with the creator suffix, 0 "creator not a citizen" refusals) — the owner ran the count command, the session's own SSH login was refused |
| 2 — paid-only perk under its own sub-heading (with `0421`'s text) | `0408` [[tasks/explainer-paid-only-subheading]] | **pass** (paid account, computer) |
| 3 — Buy for earned citizens who have not paid | `0409` [[tasks/explainer-buy-for-earned-citizens]] | (b) paid: no Buy — **pass** (2026-10-09). (a) earned: **blocked** on 2026-10-09 (no working earned test account, see below), then **pass** on 2026-10-11, game `0.0.163`, Buy **not tapped** |
| 4 — thank-you line for paid citizens | `0407` [[tasks/paid-citizen-thank-you-line]] | paid: **pass** (2026-10-09); earned-only: line not shown — **pass** (2026-10-11) |
| 5 — the popup uses more width; dark thin scrollbar | `0417` [[tasks/explainer-popup-wider]] | desktop and phone width **pass**; scrollbar dark and thin — **pass** |
| 6 — the Приватная tab | `0412` [[tasks/start-screen-private-tab]] | three tabs in order (tester, computer) **pass**; two tabs for a non-tester on a real phone **pass**; no hover tooltip on Create / Join **pass**; tester tabs at phone width **pass** — ⚠️ in DevTools phone view, not a real phone; the ~360-wide preset and a late third tab **not recorded** |
| 7(A) — join window without a paste button | `0413` [[tasks/join-modal-paste-hint]] | **pass** on the computer: no paste button, the hint shown, no `NotAllowedError` in the console. On a phone: **not run** (optional) |
| 7(B) — error-window copy via the Yandex SDK | `0413` | **not checked live**, by owner ruling 2026-10-08 — no safe way to raise the window in production; the SDK copy path stays **unproven** |
| 8 — the shorter popup on a real phone | `0421` [[tasks/explainer-popup-shorter-text]] | (a) non-citizen, phone portrait: Buy visible without scrolling, text matches — **pass** (2026-10-09). (b) earned, iPhone 16e: **pass** (2026-10-11), Buy not tapped; browser / app not recorded. (c) paid: **pass**. Landscape: Buy and Close need a scroll — **accepted by the owner** (no size target, owner ruling 2026-10-08) |

- **The earned-account items were blocked for two days.** On 2026-10-08 the earned test login opened a **new,
  non-citizen** record (Yandex returned a different user id — owner accepted the incident; investigation deferred as
  `0424`). Private/incognito windows do not work with Yandex Games login (owner). The items were unblocked on
  2026-10-11 by `0430` ([[tasks/tester-roles-live]]), which put the `earned-citizen` test role on that new record; the
  role was removed again with `restore` afterwards.
- "Приватные лобби" did not show on the non-tester phone — correct by design (the line shows only where private lobbies
  are enabled).
- **Side findings, recorded, not fails:** (1) the join window's "Присоединиться к лобби" button still showed a native
  browser tooltip on `0.0.161` → filed on Sprint 8 as `0415` ([[tasks/no-native-tooltips]]). (2) Opening the **same**
  invite link again after leaving a running private match put the friend **back into that match**, with a fast-forward
  replay to catch up — an observation only.
- Owner's observation on item 8: plenty of spare height on the iPhone 16e — an inference from one phone, not a
  measurement on a shorter one.

## Related

- [[decisions/sprint-8]] — the board (rank 18)
- [[decisions/sprint-7]] — where the eight build tasks closed
- [[decisions/cancelled-tasks]] — `0422`, folded into item 8
- [[tasks/worker-route-query-string]] — `0416`, item 1
- [[tasks/explainer-paid-only-subheading]] — `0408`, item 2
- [[tasks/explainer-buy-for-earned-citizens]] — `0409`, item 3
- [[tasks/paid-citizen-thank-you-line]] — `0407`, item 4
- [[tasks/explainer-popup-wider]] — `0417`, item 5
- [[tasks/start-screen-private-tab]] — `0412`, item 6
- [[tasks/join-modal-paste-hint]] — `0413`, item 7
- [[tasks/explainer-popup-shorter-text]] — `0421`, item 8
- [[tasks/tester-roles-live]] — `0430`, which unblocked the earned-account items
- [[tasks/no-native-tooltips]] — `0415`, filed from a side finding of this run
- [[tasks/yandex-invite-sdk-link-live]] — `0383`, run in the same sitting as item 1
- [[tasks/no-native-tooltips-live]] — task `0429`, the live check of the tooltip fix this run triggered
