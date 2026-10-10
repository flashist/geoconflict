# Yandex Build: the Invite Copies the Lobby Code Through the SDK Clipboard, and `#join=` Links Stop Working There (task 0380)

**Source**: `ai-agents/tasks/done/0380-yandex-build-invites-copy-the-lobby-code-and-stop-honouring-join-links/brief.md` (`plan.md`, `worklog.md`, `review.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 7, rank 38 (append rank; moved in from the Backlog board 2026-10-04) / task `0380`

> 🆕 **2026-10-10 sync — this task's live check `0381` is CLOSED** ([[tasks/yandex-invite-copies-code-live]]),
> `(agent-closed — not owner-verified)`: the code is shown to the host (pass); **steps 3, 4, 5 not run** by owner rulings.
> ⚠️ So the Yandex build **ignoring an old `#join=` link is unproven live**, and a code join inside Yandex is carried by
> `0428` step 4b.

> 🆕 **2026-10-08 sync — now deployed; the link half moved onto Sprint 7.** `8d74090` is in game **`0.0.157`**
> (deployed 2026-10-08; checked with `git tag --contains`). The owner, live-testing private lobbies on `0.0.157`, saw no
> invite link in the host window — this task is the code half; the link half `0382` and its check `0383` were moved onto
> [[decisions/sprint-7]] (ranks 60, 61) by owner ruling *"Move 0382 and 0383 into the Sprint 7"*. `0381` (this task's
> live check) is not recorded as run in this window. `0414`, which would have moved the error window's copy button onto
> `copyText`, was merged into `0413` ([[decisions/cancelled-tasks]]). The *"Not deployed"* line below was true when written.
>
> ✅ Done (agent-closed — not owner-verified), closed 2026-10-05; committed in `8d74090` (2026-10-05). ⚠️ **Not
> deployed** (no game deploy since `0.0.156`). ⚠️ **Not verified in the Yandex iframe:** whether the SDK clipboard or
> the native fallback actually copies there is for the live check **`0381`** (Backlog board).
>
> 📌 *2026-10-09 sync: `0381` **moved to [[decisions/sprint-8]] (rank 29, append rank)** with the other open release-gate items, by owner ruling. Its brief now marks steps 1 and 6 superseded by `0382`; the main step left is step 4 — the old `#join=` link is ignored. It blocks the everyone-flip `0428`.*

## Goal

"The code part" of [[decisions/adr-119-yandex-invite-sdk-link-plus-code]] (option B of the architect's evaluation).
On the Yandex build the host's invite copied a link to our own site — outside the Yandex portal, which Yandex rules
8.4.2 and 8.4.4 forbid — and `Main.handleHash()` opened the join window for any `#join=` link. This task alone makes
the Yandex build compliant; the SDK-built Yandex Games link (`0382`) is additive. Facts from the owner's live probe
(2026-10-04): `ysdk.clipboard.writeText` fails from the console (*"Document is not focused"*) and **works from a real
click handler** — so the copy must run inside the click.

## Key Changes

**Owner rulings at plan approval (2026-10-04):** Q1 *"Keep today"* — code shown by default; players with "Hidden lobby
IDs" on see dots; copying never reveals a hidden code · Q2 *"Point to eye button"* — on a total copy failure, tell the
host to show the code with the eye button and copy it by hand; never reveal automatically · Q3 *"File a task"* — a
friendlier code became `0389` ([[tasks/private-lobby-code-format]]).

- New `src/client/PrivateLobbyInvite.ts` — `inviteCopyText()` (Yandex: the bare code; standalone: today's link,
  unchanged) and `lobbyIdFromJoinHash()` (Yandex: always `null`).
- `FlashistFacade.copyText()` — SDK clipboard first, called before the first `await`; falls back to
  `navigator.clipboard`; returns `false` if both fail; never throws.
- `HostLobbyModal` — the copy is its first action; a ✓ on success, a red failure line otherwise; a Yandex-only hint
  under the code box. New strings in both `en.json` and `ru.json` (RU wording smoothed by the coder on owner ruling).
- `Main.handleHash()` — on the Yandex build `#join=` no longer opens the join window; the standalone build is unchanged.
- **Review fixes:** R1 — a copy settling after close/reopen no longer paints the next opening (`openGeneration`
  guard); R2 — a source-text guard test on the `#join=` wiring (it guards the text, not runtime behaviour).
- ⚠️ **Accepted residual R3 (owner: *"Accept for now"*):** on Yandex, a friend who is **not** a tester (and with
  `private_lobbies_all` off) has no Join button and now no `#join=` path either, while the hint tells them to enter the
  code under "Join Lobby". Lasts until `0382`'s payload join ships or the everyone-flag goes on.

## Outcome

- 📌 *2026-10-08 (later) sync:* the link half `0382` is **built** (closed 2026-10-08, committed `a555111`, not
  deployed; [[tasks/yandex-invite-sdk-link]]) — `inviteCopyText()` gained the portal-URL argument, and a payload opens
  the Join window for a non-tester friend, which ends residual R3 once live. Part B of `0413`
  ([[tasks/join-modal-paste-hint]]) moved the error window's copy onto this task's `copyText`.

- Release-gate item 6 is half built: `0380` ✅; `0382` (the link) and both production checks `0381` / `0383` remain
  on the Backlog board ([[tasks/private-lobby-citizen-perk]]).
- **Not unit-tested:** `Main.handleHash()` itself (its `Client` class is not exported) — the logic it delegates to is.

## Related

- [[decisions/adr-119-yandex-invite-sdk-link-plus-code]] — the decision this builds (the code half)
- [[tasks/yandex-invite-link-decision]] — task `0199`, the owner's live probe and ruling
- [[tasks/private-lobby-tester-default]] — task `0354`, built before this one
- [[tasks/private-lobby-code-format]] — task `0389`, filed from this task's Q3
- [[tasks/private-lobby-citizen-perk]] — the six-item release gate
- [[decisions/sprint-8]] — where `0381`, this task's live check, sits since 2026-10-09 (rank 29)
- [[systems/flashist-init]] — the facade's SDK access
- [[decisions/sprint-7]] — the board (rank 38)
- [[decisions/cancelled-tasks]] — `0414` (cancelled 2026-10-08, merged into `0413` Part B): moves the error window's copy button onto this task's `copyText`
- [[systems/yandex-games-platform-rules]] — Rule 3, applied here to private-lobby invites
- [[tasks/yandex-invite-sdk-link]] — task `0382`, the link half built on top of this (closed 2026-10-08)
- [[tasks/join-modal-paste-hint]] — task `0413`, whose Part B reuses `copyText` for the error window
- [[tasks/yandex-invite-sdk-link-live]] — task `0383`, the live check of `0382`’s invite link — passed 2026-10-09
- [[tasks/yandex-invite-copies-code-live]] — task `0381`, this task's live check (closed 2026-10-10)
- [[decisions/windoworigin-url-join-defect]] — the standalone `windowOrigin` invite this build leaves unchanged off Yandex
