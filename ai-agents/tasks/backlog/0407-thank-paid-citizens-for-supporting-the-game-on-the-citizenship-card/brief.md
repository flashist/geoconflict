# Show paid citizens a "thank you for supporting the game" text, so paid citizenship reads differently from earned

## ID
0407

> ℹ️ **ID allocation, checked 2026-10-08 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/` (folder
> names and `## ID` fields agree) is `0406`, so this is `0407`. `grep -rn 0407 ai-agents/tasks ai-agents/sprints .claude`:
> no hits before this filing.

## Sprint
Sprint 7

> 📌 **2026-10-08 — was ~~Backlog~~; moved to [Sprint 7](../../../sprints/plan-sprint-7.md).** OWNER RULING typed directly by the owner in the `fkit lead` session on 2026-10-08 (the owner's own message, not an `AskUserQuestion` answer), relayed verbatim by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent.
> Verbatim: *"0407, 0408, 0409 - shoud be moved into the Sprint 7 (current sprint), we might need to do them today and deliver a new deploy update"*. The [Backlog board](../../../sprints/backlog.md) row is kept as `➡️ Moved`. Status unchanged
> (`🔲 Backlog`); no folder moved, no mover run. Deploy timing: see the dated *Deploy* note under *Notes*.

## Priority
54

> 📌 **2026-10-08 — was ~~Unscheduled~~; 54 is ADR-035 append position on [Sprint 7](../../../sprints/plan-sprint-7.md), NOT a merit rank.**
> The owner named the three tasks (`0407`, `0408`, `0409`, in that order), not ranks. Appended after that board's
> highest (53, `0404`); open for owner confirmation. The paragraph below describes the Backlog board and is history.

⚠️ The owner gave no rank. Filed on the unranked [Backlog board](../../../sprints/backlog.md) as an appended row (ADR-035)
— its place on that board is append order, **not** a merit ranking. Needing a rank is the signal to pull it into a sprint.

## Status
🔲 Backlog

## Owner
fkit-producer

⚠️ **`fkit-producer` first, because Step 1 is a design discussion with the owner.** Re-assign to `fkit-coder` only after
the owner's design approval is recorded in this brief (see Step 1).

## Context

### Why this exists — the owner's words

Owner, 2026-10-08, typed live in the `fkit lead` session and relayed by `fkit-lead` to a spawned `fkit-producer` (no
owner channel; ADR-021/037). Verbatim:

> *"Hey, I've just figured out that it's kind of hard to understand whether my account is very paid or earned
> citizenship. That's why I think that it's worth adding something. For paid users. But I think it shouldn't be another
> like check mark or verification mark we can add something as simple as text saying thank you for supporting the game
> it can sit next to the citizenship card or maybe in the citizenship card boundaries something like that add this task
> to backlog and we will need to discuss the design and I will need to approve the design before we implement it."*

⚠️ **"very paid" is most likely speech-to-text for "verified paid" or "a paid".** That reading is a guess — not
confirmed with the owner. It does not change the goal below.

**Goal:** a paid citizen can tell that their citizenship is **paid**, not earned through XP. Shown as **plain text** —
for example *"Thank you for supporting the game"* — next to the citizenship card or inside its border.

**Owner constraint:** **not** another check mark or verification badge. Text only.

### ⚠️ Overlap flagged — `0397` already added a paid line inside the card (owner-approved, not yet live)

[`0397`](../../done/0397-show-players-whether-their-session-is-verified/brief.md) (✅ Done, agent-closed — not
owner-verified) added a status line **inside the citizenship card, start screen only**, shown to a **verified paid
citizen**. Its owner-approved wording (2026-10-06):

| EN | RU |
|---|---|
| ✓ Verified — your paid citizenship benefits are on | ✓ Подтверждено — преимущества платного гражданства включены |

(`citizenship_status.verified_paid` in `resources/lang/en.json` / `ru.json`; rendered by `src/client/CitizenshipCard.ts`.)

Two things follow, and the design discussion must settle them first:

- **It may already answer part of the request** — it is a paid-only line inside the card. But it is **not live yet**:
  `0397` ships in the same deploy slot as `0250` S3b, whose live check is
  [`0396`](../../done/0396-verify-0250-s3b-live-deploy-the-verified-owner-view-and-confirm-it-in-production/brief.md) (still
  open). So the owner may not have seen it on the live game.
- **It starts with a ✓ check mark** — the kind of mark the owner said this task should *not* add. Whether the thank-you
  **replaces** that line, is **added next to** it, or the `0397` line is **reworded**, is the owner's call. ⛔ The `0397`
  wording is owner-approved; it is not changed without a new owner ruling.

### What the client can know — and what it cannot

- Since [`0250`](../../done/0250-authenticated-profile-read-for-paid-entitlement/brief.md) S3b, the client gets
  `isPaidCitizen`. It is **`true` only on a verified session** (`vfy:true`, the server's owner view).
- On an **unverified** session the player gets the S1 "equalized" view: paid and earned citizens look **the same**,
  on purpose, so a guessed id cannot reveal who paid
  ([ADR-116](../../../knowledge-base/decisions/adr-116-first-verified-identity-yandex-signed-player-data-at-login.md)
  Decision 4 — locked). ⇒ **A paid player whose login was not verified this visit would NOT see the thank-you.** That
  player sees `0397`'s neutral *"We couldn't confirm your account this time…"* message instead.
- The card (and everything inside it) is hidden by the `CITIZENSHIP_CARD_ENABLED` kill switch and the remote
  `citizenship_ui` Yandex flag.

### Dependencies and conflicts

- **`0250`** (S3b, gives `isPaidCitizen`) — built and closed. Its deploy is in progress via `0396`. This task's live
  check means something only **after `0396` confirms the owner view live**; before that, every session is unverified
  and nobody would see the text.
- **One source for "is this a paid user?"** (owner ruling R1 on `0248`, 2026-10-06): read the same page-wide paid state
  the card already publishes (`src/client/CitizenshipStatus.ts`). ⛔ Never a second paid-status source, never a second
  profile read (the card must stay the only caller of the profile read).
- **ADR-116 Decision 4** stands: the text must never appear on an unverified read.

## What to build

### Step 1 — design discussion and owner approval (producer, with the owner). ⛔ GATE

⛔ **Owner ruling, 2026-10-08: the design must be discussed with the owner and approved by the owner before any
implementation.** No plan, code or string is written for Step 2 until the approval is recorded at the end of this
brief as: **who** approved, **when** (date), **the channel**, and **the owner's words verbatim**. A relayed summary is
not an approval.

Put a short design to the owner covering these open questions. **They are listed here, not answered** — answering them
is the owner's call:

1. **Relation to `0397`'s paid line** (see the overlap above): replace it, sit beside it, or reword it — and whether
   the ✓ stays, given the "no check mark" constraint. Show the owner what `0397`'s line looks like first, since it may
   not be live where they looked.
2. **Exact wording, EN and RU.** The owner's example: *"Thank you for supporting the game"*.
3. **Placement:** inside the card's border, or next to the card. Start screen only, or anywhere else?
4. **What an unverified paid player sees.** Under ADR-116 D4 the client cannot tell them apart from an earned citizen,
   so by default they see no thank-you (and get `0397`'s neutral message). Confirm that is acceptable, or say what
   should change — any change that learns "paid" on an unverified session is a privacy/trust question for
   `fkit-architect` first.
5. **Interaction with `0397`'s session-status line**, already in the card — how the two read together, and whether
   both can show at once.
6. **The `citizenship_ui` flag / kill switch:** when the card is hidden, does the thank-you hide with it (default
   assumption: yes, if it lives inside the card)?
7. **A player who both paid and earned the XP threshold:** thank-you shown or not (paid is a fact either way).
8. **Analytics:** yes or no. If yes, follow `analytics-event-reference.md` and the `flashistConstants.analyticEvents`
   enum.

### Step 2 — build (fkit-coder, only after Step 1's approval is recorded)

- Show the approved text to a **verified paid citizen** (`isPaidCitizen === true`), in the approved spot.
- Read the paid state from the existing single source; no new profile read.
- Text through `translateText()`, with keys in **both** `resources/lang/en.json` and `resources/lang/ru.json`.
- Respect the kill switch and `citizenship_ui` as Step 1 decided.
- Apply whatever Step 1 rules about `0397`'s line — and nothing else about it.

## Verification steps

1. **Gate:** the end of this brief holds the owner's design approval (who, date, channel, verbatim words). Without it,
   Step 2 is not started.
2. Unit tests: verified paid citizen → text shown; earned-only citizen → not shown; unverified session (paid or
   earned) → not shown; guest → not shown; kill switch off or `citizenship_ui` off → behaves as Step 1 ruled.
3. Both `en.json` and `ru.json` carry the new key(s) with the approved wording; no hardcoded user-visible string.
4. If Step 1 ruled on `0397`'s line: the result matches that ruling exactly (replaced / beside / reworded).
5. **Live check — only after `0396` confirms the S3b owner view live:** on the live game, the owner (a paid citizen)
   sees the approved text in the approved spot on a verified session; an earned-only account does not. Per the
   owner's build/verify split rule (2026-09-29), if this needs a deploy plus an owner check, it is filed as its own
   verify task rather than holding this one open.

## Notes

- **Depends on:** `0250` (S3b `isPaidCitizen` — built, closed)
- **Blocks:** nothing
- **Live-check timing (not a build dependency):** verification step 5 means nothing until `0396` confirms the S3b owner
  view live. Step 1 and Step 2 do not wait on `0396`; only the live check does. Step 2 also waits on Step 1's recorded
  owner approval (the gate above).
- 📌 **Deploy, 2026-10-08 — owner ruling (verbatim under *Sprint*):** this task may be built and shipped **today, in a
  new deploy** — owner's words *"we might need to do them today and deliver a new deploy update"*. The weekend-slot
  rule (2026-09-29) is set aside for `0407`, `0408`, `0409` only; *"might"* is not a commitment to ship today. Committed
  is still not deployed; commit and deploy stay the owner's call.
  ⚠️ Unchanged by this ruling: the Step 1 design gate (no build before the owner approves the design) and the
  live-check timing above — a same-day ship needs the design approval first.
- Related: `0397` (the existing paid line in the card — overlap flagged above), `0248` (paid = no ads; same paid
  source), ADR-116 D4.
- No ids, hosts or secrets belong in this brief or its follow-ups.
- Filed 2026-10-08 by a spawned `fkit-producer` on an owner request relayed by `fkit-lead`. ⛔ Not producer precedent.
