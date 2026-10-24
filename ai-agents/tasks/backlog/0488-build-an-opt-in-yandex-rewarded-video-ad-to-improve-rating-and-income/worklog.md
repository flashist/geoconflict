# 0488 — worklog

## 2026-10-24 — Owner answers: the reward, where it appears and how often, who sees it

**Provenance.** OWNER ANSWERS given live via `AskUserQuestion` in the lead's Claude Code session on 2026-10-24 (each
typed, not a listed option), relayed by `fkit-lead` (driving `/fkit-sprint-ship-loop` on Sprint 9) to a spawned
`fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Quoted exactly as relayed. Recorded by
a spawned `fkit-producer`. The brief's *Owner rulings — 2026-10-24* section (R1–R3) carries the same text.

### R1 — "Rewarded ad: what does the player get for watching?" (owner question 1)

> *"For now only double match XP, without daily caps (the simplest possible implementation). In the future, as an
> additional monetization channel, we might give users an option for "testing" some customizations for the rewarded
> ads."*

⇒ **Settled:** double this match's XP; **no daily cap**.
⇒ The "testing customisations" idea: recorded as a **later idea, not in scope**. No brief filed.

### R2 — "Rewarded ad: where does the button appear, and how often?" (owner questions 2 and 3)

> *"End of match, not cap, can be shown after each match that gives XP (also will be very informative for users to
> tell them more about the XP, this popup will make it clear that they are given XP after losing/winning/match end),
> if we already have any popup that is shown at this moment in the game, we can reuse it and develop on top of it. "*

⇒ **Settled:** the end-of-match moment, after every match that gives XP; no cap of our own. Reuse the existing
end-of-match popup if there is one (the producer knows of `WinModal`; the coder confirms). The popup also explains XP —
that it comes after a win, a loss or a match end.
⇒ **Producer's reading, for the owner to confirm at plan approval (not a ruling):** at most one reward per match.
⇒ Yandex's own frequency and moderation rules still apply (plan check 3).

### R3 — "Rewarded ad: who sees the offer?" (owner questions 4 and 5)

> *"This popup should be shown only to non-citizens. The idea about showing it to guests is a good thing too. Players
> who are already citizens shouldn't show this popup."*

⇒ **Settled:** non-citizens only; citizens — paid and earned — never see it. Question 4 (paid citizens) is settled by
this: they do not see the offer at all.
⇒ **Settled:** guests see it too.
⇒ ⚠️ **OPEN design point (not a ruling):** a guest has no profile and no XP. The lead's reading: a "log in to get the
reward" prompt. A plain login prompt does not need `0484`; a seamless continue would. The coder's plan proposes one;
the owner confirms at plan approval.

### What was changed (2026-10-24, by the spawned producer)

- `brief.md`: added *Owner rulings — 2026-10-24* (R1–R3, verbatim); owner questions 1–5 marked settled, with the guest
  design point left open; the trade-off note records the no-cap choice; plan checks 3 and 5 annotated; analytics,
  out-of-scope, verification steps 1, 2 and 4, and Notes updated to match. Plan-step checks 1–6 kept.
- **Not changed:** the sprint board, this task's rank (18) and status (`🔲 Backlog`). Rank is being asked of the owner
  separately by the lead.
