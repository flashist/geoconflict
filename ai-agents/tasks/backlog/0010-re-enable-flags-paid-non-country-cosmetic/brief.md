# Re-enable flags as a paid, non-country cosmetic (Task 9)

## ID
0010

## Sprint
Backlog

## Priority
Unscheduled

## Status
🚧 Blocked — `0009` findings + payment infra + owner decision on the design set

📌 **RECONCILED UP FROM THE [Backlog board](../../../sprints/backlog.md) ON 2026-09-07, on an owner
ruling given live in session and relayed through the spawning session.** This brief read
`🔲 Backlog` while the board row read the `🚧 Blocked` value above; the two disagreed, and the owner
ruled that the **board is the live record** — it carries specific, dated reasons, while the brief
looked stale.

🚨 **HOW THIS STATUS WAS ESTABLISHED, STATED PLAINLY SO A LATER READER CAN WEIGH IT: it was COPIED
FROM THE BOARD, NOT VERIFIED AGAINST THE WORLD.** ⛔ **Nobody checked this turn whether
[`0009`](../0009-self-host-upstream-openfront-api-dependency/brief.md)'s findings are still
outstanding, whether payment infrastructure now exists, or whether the owner has since ruled on the
design set.** The owner's reasoning is **evidence, not proof**, and it was recorded as such at the
time it was given.

✅ **What does corroborate it, and is the reason no concrete blocker had to be invented:** all three
named blockers are concrete and already appear in this brief's own text — this is the root of the
cosmetics monetization chain, and the **non-country design set is an owner decision that has not been
made** (Yandex bars real-country flags and names). The board's reason and the brief's own content
agree; only the status marker had drifted.

## Owner
fkit-coder

## Context

Flags are the **root of the cosmetics monetization chain** and, until now, the only task in that
chain with no brief. `plan-index.md:87` assigns Task 9 to Sprint 4, but it appears in **no** sprint
plan document — it has been sitting on `sprint-backlog.md` as unsprinted work with the note *"No
brief written."* Meanwhile:

- **Sprint 5 Task 8a** (nickname styling) and **Task 15** (custom uploaded flags/patterns) both
  depend on this shipping first (`sprint-backlog.md:79`).
- **Sprint 6** paid map packs depend on a purchase flow that this establishes.

So two sprints of monetization planning have rested on a task that did not exist as an artifact.
This brief closes that gap.

**Current state of the feature — the 404 is deliberate.** Flags are **interim-suppressed, not
deleted**. `adr-106` records the mechanism: real-country flags are parsed and then dropped at four
marked sites, and the asset directory was renamed `/flags` → `flags_source`, which is why
`/flags/*.svg` returns 404 **by design**. `CitizenshipCard` shows the 🏳️ fallback as a result.
⚠️ **Do not "fix" the 404 by restoring the legacy country flags.** That would reintroduce exactly
what the suppression exists to prevent.

**The hard platform constraint.** Yandex Games **bans real-country flags and names**. Whatever ships
must be **non-country designs only** — abstract, thematic, or original artwork. This is not a
preference; it is a platform rule and a store-rejection risk.

## ⚠️ Two blockers that are not obvious from the plans

1. **Entitlements do not come from Geoconflict.** `Worker.ts:377` reads
   `flares = result.player.flares`, sourced from the **upstream OpenFront user API**
   (`ApiSchemas.ts:53`). A flag sold through Yandex IAP needs its entitlement to originate from
   *your* infrastructure. **Task `0009` determines whether that is true today and what moving it
   costs.** Do not scope the purchase path before those findings are in.
2. **Payment infrastructure must be live** — the Sprint 4 Yandex payments work and catalog
   registration (externally blocked on Yandex approval).

**This brief is deliberately scoped to the cosmetic itself, not the purchase flow.** Splitting them
is what makes the non-paid part shippable while payments and `0009` are still blocked — see Notes.

## What to build

1. **Decide and document what the non-country flag set is.** Content design as much as engineering:
   how many designs, what themes, who produces the art. **This is the owner's call, not the coder's**
   — surface it rather than inventing a set.
2. **Restore the flag rendering and selection path** for the new non-country set. The plumbing exists
   (`CosmeticSchemas.ts` models `flag.layers` and `flag.color`; `PrivilegeChecker.isAllowed()` already
   gates flags). Re-point it at the new assets rather than rebuilding it.
3. **Keep the four suppression sites from `adr-106` intact for real-country flags.** Re-enabling the
   *feature* must not re-enable *country* flags. Read `adr-106` before touching those sites.
4. **Wire the picker UI back in**, currently hidden. Both HTML templates —
   `src/client/index.html` **and** `src/client/yandex-games_iframe.html` — must be updated; the
   Yandex one is what production serves.
5. **All user-visible strings via `translateText()`**, with keys added to **both** `en.json` and
   `ru.json`.
6. **Do not build the purchase flow here.** Ship the cosmetic behind whatever entitlement mechanism
   `0009` establishes; the IAP itself is a separate task.

## Verification steps

1. A player with the entitlement can select a non-country flag and it renders in-match, visible to
   other players.
2. A player **without** the entitlement cannot select a gated flag — verified server-side through
   `PrivilegeChecker`, not only hidden in the UI.
3. **No real-country flag is selectable or renderable** by any player, entitled or not. The four
   `adr-106` suppression sites still drop country values — assert with a test.
4. `/flags/*.svg` still 404s (the legacy path stays dead); new assets are served from their own path.
5. The picker appears in **both** rendered HTML templates — grep the webpack output in `static/`, not
   just the source templates.
6. Every new string resolves in both `en` and `ru`; no hardcoded literals (grep the diff).
7. Renders correctly at the **360×430** minimum Yandex viewport.
8. `npm test` green; `npm run lint` clean.
9. Manual check in the Yandex iframe context, not only standalone — the two differ.

## Notes

- **Depends on:** 0009 (entitlement origin), Sprint 4 payment infrastructure, and an owner decision
  on the flag design set
- **Blocks:** Sprint 5 Task 8a (nickname styling), Sprint 5 Task 15 (custom uploaded flags), and the
  Sprint 6 paid map-pack purchase surface

- **Consider splitting further when scoping.** If the non-country flag set can ship as a *free*
  cosmetic first, it becomes independently shippable while payments and `0009` are still blocked —
  and it validates the rendering path before money is involved. Recommend that split to the owner
  rather than assuming it.
- Effort from `plan-index`: ~1 week. That estimate predates the `0009` discovery and should be
  treated as a floor.
- Related: `adr-106` (suppression mechanism), `adr-102` (the entitlement checker), `0009`.
