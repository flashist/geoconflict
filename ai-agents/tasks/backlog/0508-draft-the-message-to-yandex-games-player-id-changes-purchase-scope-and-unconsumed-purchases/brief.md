# Draft the message to Yandex Games: player-id changes, purchase scope, and unconsumed purchases

## ID
0508

## Sprint
Sprint 9

> 📌 **Filed on the OWNER's own words of 2026-10-26**, typed to the lead and relayed by `fkit-lead` to a spawned
> `fkit-producer` (no owner channel; ADR-021/037). ⛔ Not producer precedent. Verbatim: *"After that I think I would need
> to get in touch with Yandex.Games to share the details with them and to try to figure out the solution for them."*

> 📌 **2026-10-26 — OWNER DIRECTION, scope of the questions** (typed in the `fkit-lead` session, relayed to a spawned
> `fkit-producer`; ⛔ not producer precedent). Verbatim: *"We're not asking Yandex.Games about how to implement it.
> We're not doing anything wrong here, we're just not consuming the purchases that already happened. So we should not
> even ASK about our iplementation them, what we can and should ask about is something about the user and why this
> situation happened."* Applied below: the question about our implementation (old **Q3**, rule 1.13.1 moderation) is
> **removed**; the message centres on the affected player and why it happened. Platform-behaviour questions that are
> not clearly about our implementation are **parked for the owner to keep or drop**, not deleted. Question labels are
> kept stable (`Q1`, `Q2`, `Q4` keep their labels, Q1 and Q4 now narrowed to this player; `Q3` is retired and not reused; `Q5` is new) because ADR-126 and the
> `0505` design report cite them by number. The title and folder name are unchanged (links); "purchase scope and
> unconsumed purchases" in them is the original scope, superseded by this note.

## Priority
35

> ⚠️ Priority 35 is append rank, NOT a merit ranking — flagged for owner confirmation.
> **On merit this belongs directly below `0502`**, because the answers shape `0505`'s design and whether `0424` matters
> beyond one player. Appended after the board's highest rank, never inserted (ADR-035); no row renumbered.

## Status
🔲 Backlog

## Owner
fkit-producer

> The producer drafts; **the owner sends** it through Yandex Games' own channel (developer console / support) and
> records the reply. Only the owner has that access.

## Context

- 2026-10-25: **the affected player** reports his paid citizenship and approved nickname are gone. Suspected: Yandex
  gave his login a different `getUniqueID()` (or he is on another Yandex account), so our server made him a fresh
  record (`0502` confirms or refutes). The same happened to the owner's test account on 2026-10-08 (`0424`), after a
  password change and around a Yandex data-centre incident — both the owner's report, unverified.
- We consume every purchase after granting it (`0505` plans to stop for permanent ones), so Yandex no longer lists his
  purchase. *(Background for us only. Per the 2026-10-26 owner direction the message does **not** ask Yandex about,
  or seek approval for, how we handle purchases.)*

## What to build

A ready-to-send draft, **in Russian** (with an English copy for the owner), saved in this task's folder as
`draft-message-to-yandex.md`, short and specific. It is about **the affected player and why his situation happened**
— not about our implementation. It asks:

- **Q1 — Can `getUniqueID()` change for the same Yandex account, and did it for this player?** When can it change
  (password change, security events, re-authorization, platform incidents, anything else)? For this player: the
  evidence from `0502` (counts and dates only — see the evidence paragraph) and a request to check his account on
  their side.
- **Q2 — Is `getPurchases()` scoped to the Yandex account, or to the per-game player id?** If a player's id changes,
  does he still see his unconsumed permanent purchases? *(Back in the draft 2026-10-26 — owner ruling below. `0505`'s
  design and ADR-126 do not wait on the answer (D2); it tells us whether not-consuming helps the id-change case at
  all.)*
- **Q4 — Was this player's purchase refunded or charged back?** (Narrowed 2026-10-26 to this player; the general
  "do refunds leave `getPurchases()`" part is dropped — see below.)
- **Q5 — Is there anything on Yandex's side that explains why he now appears to us as a different player?** For
  example a second or merged Yandex account, an account recovery, or a platform incident around the dates in the
  evidence.

Plus a request: can Yandex help this one player — confirm whether his account's id changed, confirm his purchase is on
record, or restore it from their side.

*(~~`Q2` and old `Q3` are not in the draft~~ Old `Q3` is not in the draft; `Q2` is back in (2026-10-26). Labels are not
renumbered.)*

### Removed — old Q3 (2026-10-26, owner direction)

~~Does moderation accept an unconsumed permanent purchase (paid citizenship) under rule 1.13.1?~~ — a question about
our implementation; the owner ruled we do not ask Yandex about it. Not in the draft.

### ✅ DECIDED 2026-10-26 — the set-aside questions: Q2 kept, the others dropped

> 📌 **OWNER RULING** given via `AskUserQuestion` in the `fkit-lead` session, relayed to a spawned `fkit-producer`
> (ADR-021/037); ⛔ not producer precedent. Asked *"Yandex message (0508): which set-aside questions go back in?"* → **"Keep
> Q2, drop others (Recommended)"** — option text: *"Ask only 'per account or per game ID?' besides the player
> questions."*

~~These ask how Yandex's platform works rather than about this player. The owner's direction does not clearly cover
them either way, so they are parked here, not deleted:~~

- **Q2 — purchase-list scope: KEPT**, moved up into the draft's question list above.
- ~~**From old Q1:** "Is there a stable identifier we should use instead of `getUniqueID()`?" — close to asking how to
  implement, so parked rather than kept.~~ **Dropped** (ruling above). Not in the draft.
- ~~**From old Q4:** "Do refunds or chargebacks remove a purchase from `getPurchases()`? Is there any other signal we
  receive?" — general platform behaviour; only the player-specific part stays in the draft (Q4 above).~~ **Dropped**
  (ruling above). Not in the draft; the player-specific **Q4** stays. Our own shadow `status` counts (`0505` spec §4.7)
  cover the general case.

**Evidence paragraph:** what happened, in counts and dates only — from `0502`'s findings (and the 2026-10-08 case in
`0424`). **No player ids, Yandex ids, names, tokens, purchase tokens or payloads in the draft committed to git.** If
Yandex needs identifiers to investigate, the draft says *"identifiers available on request through your support
channel"* and the owner adds them only in the sent copy, outside git.

## Verification steps

1. `draft-message-to-yandex.md` exists in this folder, Russian + English, with Q1, **Q2**, Q4 and Q5 and the help
   request above, each one answerable on its own — ~~plus Q2 and the other parked items **only if the owner said
   keep**~~ (owner 2026-10-26: Q2 kept, the stable-identifier and general refund questions dropped). It contains no
   question about our implementation (no moderation / rule 1.13.1 question, no "may we not consume", no "which
   identifier should we use").
2. The evidence paragraph uses `0502`'s recorded findings (or, if `0502` is not done yet, a marked placeholder the
   owner fills before sending).
3. A `grep` of the draft for UUID, Yandex-id and token shapes finds nothing.
4. The owner sends it; `worklog.md` records the date sent, the channel (by name, no URLs or ticket ids that identify
   the player), and later the answers, question by question.
5. The answers are relayed to `0505` (design) and `0424` (parked investigation) — a dated line in each folder's
   worklog, written by the producer when the answer arrives.

## Notes

- **Depends on:** 0502 — soft, not hard

- **Why soft:** the draft can be written now; only the evidence paragraph waits on `0502`'s findings.
- **Blocks:** nothing (`0505` uses the answers but does not wait on them; see `0505`).
- **Related:** `0424` — this covers its item 2 ("Ask Yandex support"). `0505`, `0506`.
- **2026-10-26 — knock-on of the owner direction:** ADR-126 and the `0505` design report
  (`ai-agents/knowledge-base/reports/2026-10-26-0505-design-stop-consuming-permanent-purchases.md` §10.2) list `0508`
  Q3 (1.13.1 moderation) as asked of Yandex; it no longer is, so that unknown is settled only by moderation itself at
  submission (the design's D3 fallback). Their Q2 assumes it is asked; it is now owner-to-confirm. Not edited here —
  those documents belong to `0505`. *(Superseded the same day: D3 was withdrawn — no per-update moderation applies —
  and Q2 is kept by owner ruling, so ADR-126's "Q2 asked" is true again.)*
- **Close:** when the message is sent and recorded. Waiting for Yandex's answer is not part of this task; the answers
  land in `0505` / `0424`. If the owner wants to track the reply as its own task, file one then.
- **No secrets, no personal data** in any tracked file.
