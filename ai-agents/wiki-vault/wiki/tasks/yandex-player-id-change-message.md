# Draft the Message to Yandex Games — Player-ID Changes, Purchase Scope (task 0508)

**Source**: `ai-agents/tasks/done/0508-draft-the-message-to-yandex-games-player-id-changes-purchase-scope-and-unconsumed-purchases/brief.md` (`draft-message-to-yandex.md` and `worklog.md` in the same folder)
**Status**: done (agent-closed — not owner-verified) — sent 2026-10-27; **answer pending**
**Sprint/Tag**: Sprint 9 — live player incident (rank 35, append rank flagged)

## Goal

The owner's words (2026-10-26, verbatim): *"After that I think I would need to get in touch with Yandex.Games to share
the details with them and to try to figure out the solution for them."* A short, ready-to-send draft in Russian (with
an English copy) that the **owner** sends through Yandex Games' own channel. Hub:
[[decisions/incident-2026-10-25-lost-citizenship-player-id-change]].

## Key Changes

- **Scope narrowed by owner direction** (verbatim, typo kept): *"We're not asking Yandex.Games about how to implement
  it. … what we can and should ask about is something about the user and why this situation happened."* The old Q3
  (moderation of an unconsumed purchase) was **removed**; labels were not renumbered because ADR-126 and the spec cite
  them.
- **Questions in the draft:** **Q1** can `getUniqueID()` change for the same Yandex account, and did it for this player;
  **Q2** is `getPurchases()` scoped to the Yandex account or the per-game id (kept by *"Keep Q2, drop others
  (Recommended)"*); **Q4** was this player's purchase refunded or charged back; **Q5** anything on Yandex's side that
  explains why he appears as a different player. Plus a request to help this one player.
- **Dropped:** a stable-identifier question (too close to asking how to implement) and the general refund question
  (our own shadow `status` counts cover it).
- **Privacy:** the tracked draft holds placeholders only; real values were filled in **outside the repo**, in the sent
  copy only. A grep of the draft for UUID, long-number and token shapes found none (2026-10-27).

## Outcome

- **Sent 2026-10-27** to Yandex Games support — owner: *"I sent the message exactly as you showed it to me."* ⚠️ That
  copy included the **wrong candidate profile** (from `0502`'s first, wrong-name search). A **correction** naming the
  right three-profile chain and the old profile's citizenship receipt was sent the same day; both are tracked on
  `0504` (owner ruling *"Note on 0504 (Recommended)"*).
- **Answers: pending.** When they arrive they are recorded in `0502` (is the old record his), `0424` (if un-parked) and
  `0505` (Q2). `0504`'s restore waits on the answer; **ADR-126's build waits on nothing** (D2).

## Related

- [[decisions/incident-2026-10-25-lost-citizenship-player-id-change]]
- [[tasks/lost-citizenship-cause-checks]] — task `0502`, the evidence paragraph
- [[decisions/adr-126-permanent-purchases-not-consumed]] — Q2 and the "do not ask about our implementation" direction
- [[tasks/stop-consuming-design]] — task `0505`, which uses Q2's answer when it comes
- [[tasks/yandex-outage-recovery-checklist]] — an earlier Yandex-side incident page
- [[decisions/sprint-9]]
