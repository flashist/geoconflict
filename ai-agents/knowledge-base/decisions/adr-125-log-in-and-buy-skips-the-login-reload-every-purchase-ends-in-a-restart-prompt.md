# ADR-125: "Log in and buy" skips the login reload; every completed purchase ends in a restart prompt

- **Status:** accepted
- **Date:** 2026-10-24
- **Deciders:** the owner (ruling OD-1, 2026-10-24); recorded by fkit-architect (spawned by `fkit-lead`, Sprint 9
  ship loop, task `0484`).
- **Ruling channel:** live via `AskUserQuestion` in the lead's Claude Code session, relayed verbatim by `fkit-lead`.
- **Amends:** owner ruling **D3** (task `0273`, 2026-09-16; widened by `0397` Q3, 2026-10-06). D3 has no ADR of its
  own; it lives in `src/client/ProfileSession.ts` (comment block "[D3, owner ruling 2026-09-16]") and
  `src/client/GameRestart.ts` (header comment).

## Context

- **D3 today:** after a successful Yandex login from the citizenship card, the game reloads the page once
  (`requestGameRestart`, `src/client/GameRestart.ts`), so that the start sequence re-runs logged in — the owner's
  stated goal, quoted in that file: *"to be sure the start sequence is done the right way"*. D3's other half: a
  **failed** profile login is final for the page load (`ProfileSession.ts`, "A login that FAILS is final").
- **The problem:** the owner's purchase rule 4 (`0477` batch 1 answer 2; `0343` Q2): after a guest logs in to buy,
  they go **straight into the purchase**, no extra popup or tap, *"if possible"*. Today's reload drops the purchase:
  the guest lands on a new page and must find Buy again (spec `reports/2026-10-24-design-shared-purchase-flow.md`
  §1b, verified by code trace and tests, not live). Guests are 58.2 % of match starts (`0405`).
- **What makes it a real decision:** skipping the reload means a guest who buys keeps playing on a page that **booted
  as a guest** — the name box, inbox dot and tenure gift act as for a guest until the next load (spec §8 A). Matches
  and XP are correct (identity is read on every join).
- The Yandex docs neither require a reload after login nor forbid a purchase straight after it (spec §1a,
  documented-only; proven live only in B5).

## Decision

The owner's ruling, verbatim (OD-1, 2026-10-24, typos kept):

> *"I think we can skip it, but after buying we would need to show something like "reload to start using the new
> features" or something like that. I even think we might already have something like that in the game. The point is
> that we're trying not to interrupt the buy-flow of the user, but as soon as the purchase is done we're find to
> force/guide them through restart."*

Stated plainly:

1. **"Log in and buy" skips D3's reload.** When a guest taps "Log in and buy" and the Yandex login succeeds, the game
   stays on the same page: it logs in to the profile server, reconciles, reads the profile and opens the payment
   window (spec §4.3 steps 3–10).
2. **Only that path.** The plain card **Log in** button (not a purchase) keeps D3's immediate reload, unchanged.
3. **A non-grant end hands back to D3.** If that flow logged the player in but ended without a grant (already owned,
   can't verify, error or cancelled payment, or `needs_tap` then the surface closed), the game shows the end message
   first, then dispatches the existing login-restart event, so D3's reload runs as today (spec §4.3 step 12).
   `profile_unavailable` keeps the player's own **Restart game** button (`0397`); no automatic reload.
4. **Every completed purchase ends in a restart prompt.** After **any** granted purchase — every product, every buyer,
   guest path or not — the game shows the existing `0303` "restart to apply" popup
   (`CitizenshipRestartOffer.ts`, `CitizenshipRestartModal.ts`), worded for what was bought. Its existing rules stay:
   once per page, behind the citizenship kill switch (`0236`), held until the start screen if a lobby is open, never
   mid-match. The buy is never interrupted; the restart comes after it.
5. **D3's failed-login half is untouched.** A failed profile login is still final for the page load.

**Not decided here — RP-1 (open, owner to rule):** *"force/guide"* leaves open how strong the prompt is: keep today's
dismissible popup ("Restart now" / "Later") — the architect's recommendation — or a required restart ("Restart now"
only). Until RP-1 is ruled, the popup's current form stands. Whichever is chosen, points 1–5 hold.

> **Note, 2026-10-24 — RP-1 ruled: Guide (keep "Later").** Asked live via `AskUserQuestion` in the lead's Claude Code
> session, relayed verbatim by `fkit-lead`. Question: *"After a purchase, how strongly should the game push the
> restart?"* → **"Guide: keep 'Later' (Recommended)"**. Option text: *"Today's popup: Restart now / Later. Later loses
> nothing; it applies after the next match or reopen."* So point 4's popup **keeps both buttons, "Restart now" and
> "Later"**; no required restart. The same day the owner approved the design spec (REVISION 2). Points 1–5 unchanged.

## Options considered

- **Option 1 — continue on the same page; D3 reload only on a non-grant end (chosen), plus the post-purchase restart
  prompt.** Meets rule 4 with paths that already ship: `requestGameRestart`'s fallback already logs a guest in on the
  same page. The owner's refinement closes the "booted as a guest" gap by guiding a restart once the purchase is done.
- **Option 2 — keep D3's reload, then resume the purchase after it** (sessionStorage intent, payment window opened
  after boot). Rejected: a full reload in the middle of the buy (seconds, unmeasured), a payment window that opens by
  itself after a page load (moderation and trust risk), and a dependence on sessionStorage, missing in the very
  population D3's no-storage branch exists for (spec §8 B).
- **Option 3 — keep today's behaviour** (reload, the player finds Buy again). Rejected: fails rule 4 and loses guests
  (spec §8 C).
- **Restart prompt only when the purchase made the buyer paid, or the item opts in** (spec R1). Superseded by the
  owner's words *"after buying we would need to show…"*: the prompt follows every purchase.

## Consequences

- **Positive:** a guest buys with one tap from the game plus Yandex's own windows; nothing of ours sits between login
  and payment except a short status line. The post-purchase restart restores D3's goal (a clean, logged-in start
  sequence) at a moment that interrupts nothing. One rule for the popup (every purchase), no per-item flag.
- **Negative / costs:** D3 is no longer "every successful login reloads at once" — it has one exception. A guest who
  logged in but didn't buy reloads a few seconds later than today. Every buyer, paid citizens buying an item included,
  sees one more popup after paying. If RP-1 keeps "Later", a guest-booted page can stay partly guest-like until the
  next match or open.
- **Residual risks / "re-raise only if":**
  - B5 (live, inside Yandex) shows the payment window will **not** open without a fresh tap → set the auto-continue
    deadline to 0 (one extra tap, spec §7). That is the designed fallback, **not** a reason to reopen this ADR.
  - Re-raise only if B5 or later live evidence shows that staying on a guest-booted page **after a grant** breaks
    something beyond the cosmetic items above (wrong account credited, wrong grant, a broken match join), or Yandex
    moderation objects to the in-page flow or to the post-purchase prompt.
  - A review finding that "D3 says every login reloads" is **closeout, not a defect**: this ADR is the exception.
  - A finding that the restart popup shows for a buyer who was already paid is **intended**, not a defect.

## Related

- Design spec: `ai-agents/knowledge-base/reports/2026-10-24-design-shared-purchase-flow.md` (REVISION 2; §4.3 steps
  11–12, §8, §9.1 OD-1 and RP-1).
- `src/client/GameRestart.ts` (D3 reload, match guard, fallback); `src/client/ProfileSession.ts` (D3 failed-login
  latch); `src/client/CitizenshipRestartOffer.ts`, `src/client/CitizenshipRestartModal.ts` (`0303` popup).
- Tasks: `0273` (D3), `0397` (Q3, the Restart game button), `0303` (the restart popup, Q1 2026-09-28), `0484` (this
  design); build tasks B2, B3, B5 (spec §11).
- ADR-116 Decision 4 (paid status private) — unchanged; OD-2 was ruled private.
