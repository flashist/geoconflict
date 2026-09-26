# Personal Inbox (8d-B) — Direct Messages to Citizens

**Source**: `ai-agents/tasks/done/0012-personal-inbox/brief.md` (plus `plan.md`, `worklog.md` and `review.md` in the same folder)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 4 · task `0012` · 8d-B, built on the 8d-A global announcements popup

> 🆕 **2026-09-26 — THE PERSONAL TAB IS LAUNCHED AND WAS SEEN IN A BROWSER.** Release `0.0.154`
> ([[tasks/citizenship-go-live]]); `0296` section B ([[tasks/after-deploy-production-checks]]): **B2** the
> citizenship message showed as new in the Personal tab, and **read state persisted to a second device**;
> **B3** a non-citizen saw **no** Personal tab (one account). ⚠️ **Not observed: the bell dot CLEARING
> after the tab is opened.** ⚠️ After a **paid** purchase the bell dot appeared only after a reload —
> tracked in Sprint 6 task `0303` ([[tasks/citizenship-paid]]). A second device also lit the bell because
> the general-announcements "last seen" id is kept per device — the trigger for backlog epic `0304`.

> 🚨 **READ THIS FIRST — CLOSED AS BUILT + REVIEWED; NOT LAUNCHED, AND NEVER SEEN IN A BROWSER.**
> Closed **2026-09-23** on an **owner ruling** given live in the `fkit lead` session via
> `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer` holding **no owner channel**
> (ADR-021, ADR-033 §5) ⇒ **`(agent-closed — not owner-verified)`**: no human verified this work, and
> **nothing here is proven in production.** Two things were **not done** and are now owner-accepted:
> - the **browser leg** of the local verification loop was **never run — WAIVED** (covered by `0296`
>   **B1/B2**). ⚠️ **Accepted tradeoff: nobody sees the Personal tab in a browser until after launch.**
>   The client logic is unit-tested and the wire was proven by a `curl` loop; **neither is a browser
>   observation.**
> - the production-only *Deferred Live Tail* **moved to task `0296`** (Sprint 5).

## Goal

Give citizens a one-way channel for system notices — citizenship confirmations, name-change verdicts,
later administrative messages — as a **Personal** tab inside the existing announcements popup. Non-citizens
and guests see **no** tab (absent, not greyed out). Shipping it retires the no-op inbox seams carried by
`0017`, `0018` and `0019`.

## Key Changes

Built **2026-08-26** via the sprint ship-loop; plan owner-approved with rulings D1–D6. The feature-level
description lives on [[features/announcements]]; what matters for the task record:

- **New:** migration `003_player_messages.sql` (`player_messages`, template **or** literal content,
  enforced by a check constraint); `src/core/profile/InboxContract.ts` (shared wire schemas);
  `src/profile-server/InboxRepository.ts` (**sole** reader/writer; citizen gate **in SQL** on every read
  and mark-read); `src/client/Inbox.ts` (client logic).
- **Routes differ from the brief's sketch** — built as `GET /v1/messages`, `PATCH /v1/messages/read`, and
  an **internal** `POST /internal/v1/messages/send` behind the internal auth, not the brief's
  `/player/messages` / `/admin/player-message`.
- **Both citizenship seams filled** — `PlayerProfileRepository.afterCitizenshipEarned` and
  `PaymentsRepository.afterPaidPurchaseGranted` now send through an `InboxSender` that **contractually
  never throws**, **and both call sites are also wrapped** (owner ruling D4). This **discharges `0017`'s
  review residual R1** — a throwing hook can no longer misreport a durable grant as a wire error.
- **Name-change triggers (V1 rows 3–4) deferred** to the name-change task; the send mechanism makes each
  a one-call hook.
- **Client:** `NewsModal.ts` renders the tab strip **only** when the inbox is available; the bell dot is
  "unread announcements **or** unread personal messages".
- **Localization:** the old `citizenship_earned.inbox_*` / `citizenship_paid.inbox_*` keys moved under
  `inbox.templates.*`, in both `en.json` and `ru.json`.

### Verification (local, 2026-08-26)

`npm test` 96 suites / 812 tests; integration run against a throwaway Postgres 4 suites / 37 tests; the
real migration runner applied 001–003; a **17-step live `curl` loop** against a local profile server; a
dev client build. **Not run:** the browser leg (now waived, above).

### Accepted residuals (review, closed out — do not re-litigate)

- **D1 — client-asserted player id** on the player inbox routes, through the **single** `resolvePlayerId`
  funnel (ADR-103). Anyone who knows a citizen's (non-secret) Yandex id can read and mark-read that
  citizen's notices. Same trust class as the public profile read. See
  [[decisions/adr-103-identity-trust-seam]].
- **D4 — best-effort post-commit send.** A crash between the grant's commit and the inbox insert
  **loses the message** (logged only). No durable outbox.
- **Fail-soft Personal tab** — on a transient fetch failure a citizen sees **no** tab until the next
  bell open / reload; `Inbox:LoadFailed` fires once.
- **D5 — the inbox is gated behind `CITIZENSHIP_CARD_ENABLED`**: while it is `false` the fetch never runs
  and the tab never renders.

## Outcome

### Where the Deferred Live Tail went (owner ruling 2026-09-23)

| Tail item | Now |
|---|---|
| 1 — production profile integration verified on | `0296` **A2–A3** (after the deploy window) |
| 2 — a real grant produces the message; read state persists across two devices | `0296` **B2** (after the flip) |
| 3 — citizen gating against production data | `0296` **B3** (after the flip) |

⚠️ **B3 proves NOTHING while `CITIZENSHIP_CARD_ENABLED` is off** — the tab is hidden for everyone then
(residual D5). The flip is owned **only** by `0065` §6.

### 🚩 One tension flagged, not resolved (outside the vault)

Residual **D5**'s recorded re-raise condition is *"the flag is flipped without the Deferred Live Tail
having run."* Under the 2026-09-23 arrangement, **tail items 2–3 (now `0296` B2/B3) can only run AFTER
the flip**, by design. Item 1 (A2–A3) does precede it. **So D5's re-raise condition is partly met by the
plan itself** — the flip will necessarily come before B2/B3. Whether that re-raises D5 or the ruling
implicitly retired that condition is **not stated anywhere**; recorded here so it is not discovered at
launch.

## Related

- [[features/announcements]] — the popup this tab lives in, and the feature-level description of the inbox
- [[tasks/global-announcements]] — 8d-A, the global half this builds on
- [[tasks/citizenship-earned]] — task `0017`, whose inbox seam this filled; closed the same day
- [[tasks/forward-profile-internal-token]] — task `0062`, which gated this task's production tail; closed the same day
- [[tasks/yandex-payments-implementation]] — task `0019`, whose paid-grant seam this filled
- [[tasks/citizenship-name-change]] — the name-change task that owns the deferred V1 triggers 3–4
- [[decisions/adr-103-identity-trust-seam]] — the client-asserted-id funnel the player routes sit behind
- [[systems/player-profile-store]] — owns `player_messages` and the inbox routes
- [[systems/analytics]] — the four inbox events
- [[tasks/hide-citizenship-card-flag]] — the flag the whole inbox is gated behind
- [[decisions/sprint-4]] — the board this task closed on
- [[decisions/sprint-5]] — where `0296`, which received the production checks, was filed
