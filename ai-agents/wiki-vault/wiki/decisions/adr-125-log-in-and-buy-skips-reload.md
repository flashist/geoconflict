# ADR-125: "Log In and Buy" Skips the Login Reload; Every Completed Purchase Ends in a Restart Prompt

**Date**: 2026-10-24
**Status**: accepted

> Source: `ai-agents/knowledge-base/decisions/adr-125-log-in-and-buy-skips-the-login-reload-every-purchase-ends-in-a-restart-prompt.md`
> (recorded by `fkit-architect` during task `0484`; owner ruling **OD-1**, 2026-10-24, live via `AskUserQuestion` in the
> lead session, relayed verbatim by `fkit-lead`). Design behind it:
> `ai-agents/knowledge-base/reports/2026-10-24-design-shared-purchase-flow.md` (REVISION 2, approved 2026-10-24).
>
> 🏗️ **2026-10-26 sync (`4e9160a`) — built, committed, NOT deployed.** The client side is task `0495` (B3,
> [[tasks/guest-log-in-and-buy]]), committed in `4e9160a`; `git tag --contains` → none. The live proof is `0498` (B5,
> Sprint 9, `🔲 Backlog`). Nothing in this ADR has been seen working inside Yandex yet.

## Context

- **D3** — owner ruling of task `0273` (2026-09-16), widened by `0397` Q3 (2026-10-06); see
  [[tasks/profile-identity-s4-client-login-session]] and [[tasks/session-verified-status-line]]. After a successful
  Yandex login from the citizenship card, the game **reloads the page once** (`requestGameRestart`,
  `src/client/GameRestart.ts`), so the start sequence re-runs logged in — the owner's stated goal is *"to be sure the
  start sequence is done the right way"*. D3's other half: a **failed** profile login is final for the page load
  (`src/client/ProfileSession.ts`). D3 has no ADR of its own; it lives in those two files' comments.
- **The problem:** the owner's purchase rule 4 ([[decisions/paid-items-purchase-rules]]) asks that a guest who logs
  in to buy goes **straight into the purchase**, with no extra popup or tap, *"if possible"*. Today's reload drops the
  purchase: the guest lands on a new page and has to find Buy again (spec §1b — verified by code trace and tests,
  **not live**). Guests were 58.2 % of match starts, 2026-10-08 → 2026-10-10 (`0405`).
- **Why it is a real decision:** skipping the reload leaves a guest who buys on a page that **booted as a guest** — the
  name box, inbox dot and tenure gift act as for a guest until the next load. Matches and XP are correct (identity is
  read on every join).
- The Yandex docs neither require a reload after login nor forbid a purchase straight after it — **documented only**.

## Decision

The owner's words (OD-1, verbatim, typos kept): *"I think we can skip it, but after buying we would need to show
something like "reload to start using the new features" or something like that. … The point is that we're trying not
to interrupt the buy-flow of the user, but as soon as the purchase is done we're find to force/guide them through
restart."*

1. **"Log in and buy" skips D3's reload.** After a successful Yandex login from that button the game stays on the
   same page: profile login → reconcile → profile read → payment window (spec §4.3 steps 3–10).
2. **Only that path.** The plain card **Log in** button keeps D3's immediate reload, unchanged.
3. **A non-grant end hands back to D3.** If the flow logged the player in but ended without a grant (already owned,
   can't verify, error or cancelled payment, or `needs_tap` then the surface closed), the end message shows first,
   then the existing login-restart event fires and D3's reload runs as today. `profile_unavailable` keeps the
   player's own **Restart game** button (`0397`); no automatic reload.
4. **Every completed purchase ends in a restart prompt** — every product, every buyer, guest path or not: the existing
   `0303` "restart to apply" popup ([[tasks/citizenship-restart-prompt]]), worded for what was bought. Its rules stay:
   once per page, behind the citizenship kill switch, held until the start screen if a lobby is open, never mid-match.
5. **D3's failed-login half is untouched.**

**RP-1 (ruled the same day): Guide, keep "Later".** Asked *"After a purchase, how strongly should the game push the
restart?"*, the owner picked **"Guide: keep 'Later' (Recommended)"** — the popup keeps both **Restart now** and
**Later**; no forced restart.

## Consequences

- **Positive:** a guest buys with one tap from the game plus Yandex's own windows; only a short status line sits
  between login and payment. The post-purchase restart restores D3's goal at a moment that interrupts nothing.
- **Costs:** D3 is no longer "every successful login reloads at once" — it has this one exception. A guest who logged
  in but did not buy reloads a few seconds later than today. Every buyer — a paid citizen buying an item included —
  sees one more popup after paying. With "Later" kept, a guest-booted page can stay partly guest-like until the next
  match or open.
- **Options rejected:** keep D3's reload and resume the purchase after it (a reload mid-buy, a payment window that
  opens by itself after a page load, a sessionStorage dependency); keep today's behaviour (fails rule 4); show the
  prompt only when the buyer *became* paid (superseded by the owner's "after buying").
- **Re-raise only if:** live evidence (B5, `0498`, or later) shows that staying on a guest-booted page **after a grant**
  breaks more than the cosmetic items above (wrong account credited, wrong grant, broken match join), or Yandex
  moderation objects. If B5 shows the payment window needs a fresh tap, the designed fallback is
  `AUTO_CONTINUE_DEADLINE_MS = 0` (one extra tap) — **not** a reason to reopen this ADR.
  ⚠️ `0495`'s own worklog adds a caution: a tap after `needs_tap` still awaits a re-read before `purchase()`, so if
  Yandex needs a synchronous gesture, the `0` fallback alone may not be enough. Flagged there, not changed.
- **Review traps, pre-answered:** "D3 says every login reloads" is closeout, not a defect — this ADR is the exception;
  a restart popup shown to a buyer who was already paid is intended.
- **Since the build (`0495` review R3, owner ruling 2026-10-26 "Fix it"):** `requestGameRestart` also refuses to
  reload while a join is being set up (`!isOnStartScreen()`), not only while a match runs; it re-reads the profile
  instead. This covers the hand-off timer and the plain login alike.

## Related

- [[systems/shared-purchase-flow]] — the flow this ADR shapes
- [[decisions/paid-items-purchase-rules]] — rule 4, which this ADR serves
- [[tasks/shared-purchase-flow-design]] — task `0484`, the design that recorded this ADR
- [[tasks/guest-log-in-and-buy]] — task `0495` (B3), the client build of points 1–3
- [[tasks/purchase-core-client]] — task `0494` (B2), the single restart-offer dispatch after every grant (point 4)
- [[tasks/citizenship-restart-prompt]] — task `0303`, the popup point 4 reuses
- [[tasks/profile-identity-s4-client-login-session]] — task `0273`, where D3 was ruled
- [[tasks/session-verified-status-line]] — task `0397`, the **Restart game** button `profile_unavailable` keeps
- [[decisions/adr-116-verified-login]] — Decision 4 (paid status private), unchanged; OD-2 ruled ownership private too
- [[decisions/sprint-9]] — the board carrying `0484`, `0495` and the live check `0498`
- [[decisions/adr-126-permanent-purchases-not-consumed]] — 2026-10-26: permanent purchases are no longer consumed; the guest flow gains a `held_elsewhere` end that hands back to D3 like `already_owned`
- [[tasks/guest-log-in-and-buy-live-check]] — task `0498` (cancelled 2026-10-28): after login the payment window opened with no second tap, live
