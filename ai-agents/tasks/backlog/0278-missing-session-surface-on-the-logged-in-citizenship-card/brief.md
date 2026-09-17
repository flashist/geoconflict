# Missing-session surface on the logged-in citizenship card — "couldn't load your progress, tap to restart"

## ID
0278

> ℹ️ **ID allocation, checked 2026-09-16 before filing** (same run as `0277`). `0278`: no folder under
> `ai-agents/tasks/{backlog,done,cancelled}/`, no `## ID` hit, no repo-wide hit.

## Sprint
Backlog

## Priority
Unscheduled

**Producer's rank, if pulled into a sprint: Medium** — not owner-ruled. It is a real dead end for the
affected player, but **invisible to every player until `CITIZENSHIP_CARD_ENABLED` flips**, which is why
the owner sequenced it with the card launch rather than into Sprint 4.

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**Filed 2026-09-16 by a spawned `fkit-producer` on an OWNER RULING given live in the lead session and
relayed by `fkit-sprint-ship-loop`.** It is the consequence of ruling **D3** on
[`0273`](../0273-profile-identity-s4-client-login-session-and-bearer-token/brief.md) (S4) — the ruling
that there is **no on-demand retry** after a failed boot login, and that the guest card's login button
instead restarts the game from scratch.

### Situation B — the case D3 leaves with no way out

The player **is** logged into Yandex, but the game's startup login to the profile server **failed** —
a network blip, a timeout, a `503`. Under D3, today's consequence is:

- the citizenship card renders its **logged-in zero-state — 0 XP**;
- there is **no login button**, because the player *is* logged in;
- and **no retry is allowed**, by ruling.

⇒ **There is nothing the player can do for the whole page load.** The card silently misreports their
progress as zero, and offers no action. That is the gap this task closes.

**A second path into the same state:** the late-SDK recovery path in
`src/client/flashist/FlashistFacade.ts` (around lines 736-741) can turn a degraded boot into an
authorized one **after** `startProfileSession()` has already skipped. The result is the same — an
authorized player with no session and no call to action.

⚠️ **This is a product gap created by an accepted ruling, not a defect in `0273`.** D3 was chosen
deliberately (a retry button invites a retry loop); the restart path is the sanctioned escape, and this
task is what makes it reachable in situation B.

## What to build

1. **A visible missing-session surface on the logged-in zero-state citizenship card** — wording to the
   effect of *"couldn't load your progress — tap to restart"*. It appears **only** when the player is
   authorized **and** there is no profile session; the normal logged-in card is unchanged.
2. **Tapping it performs the same guarded full restart `0273` builds** — ⛔ **reuse S4's restart path,
   do not write a second one.** The guards carry over unchanged: never during a match, at most once per
   page load.
3. **Cover the late-SDK recovery path** (`FlashistFacade.ts` around lines 736-741): a boot authorized
   after `startProfileSession()` skipped must reach the same surface, not a silent 0 XP card.
4. **One new localized string pair** — added to **both** `resources/lang/en.json` **and** `ru.json`, and
   rendered through `translateText` (never an inline string). Copy to be approved by the owner before it
   ships.

## Verification steps

1. Authorized player, profile login forced to fail (server stopped or a stubbed `503`) → the card shows
   the missing-session surface, **not** a bare 0 XP zero-state (client test + one manual run).
2. Authorized player with a **successful** login → the surface never appears and the card is unchanged
   (client test — no regression on the normal path).
3. Guest (not Yandex-authorized) → unchanged guest card with its login button; the new surface does not
   appear (client test).
4. Tapping the surface reloads the page **once**; a second tap in the same page load does nothing; it
   never fires during a match (client tests).
5. **Late-SDK recovery path:** a boot authorized after `startProfileSession()` skipped reaches the
   surface (client test driving that path).
6. The new key exists in **both** `en.json` and `ru.json`, and no string is inline (grep + test).
7. With `CITIZENSHIP_CARD_ENABLED` off, nothing about this is visible anywhere (manual check — it is the
   reason this task waits on `0054`).
8. `npm test` green; `npx tsc --noEmit` and `npm run lint` exit 0.

## Notes

- **Depends on:** [`0273`](../0273-profile-identity-s4-client-login-session-and-bearer-token/brief.md)
  (S4 — it builds the session and the guarded restart path this surface triggers),
  [`0054`](../../done/0054-hide-citizenship-card-behind-client-flag/brief.md) (the citizenship-card
  launch — **owner-ruled sequencing**, see below)
- **Blocks:** nothing
- **Effort:** ~0.75–1 day.
- 📌 **OWNER RULING 2026-09-16 (lead session, relayed by `fkit-sprint-ship-loop`; not producer
  precedent):** this is **out of `0273`** and is **sequenced with the citizenship-card launch
  (`0054`)** — **nothing here is visible to any player until `CITIZENSHIP_CARD_ENABLED` flips**, so it
  ships with that launch rather than inside the S4 slice.
- ⚠️ **Do not implement this as a login retry.** Ruling D3 on `0273` rejected on-demand retry; the only
  sanctioned recovery is the guarded full restart. A retry button here would re-open a decision the
  owner has already made.
- 🔒 No secrets, hosts or player ids in any artifact.
- **Do not invoke the mover skills** — producer-only (ADR-033). No wiki writes.
