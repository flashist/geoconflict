# Citizenship card re-checks its gate when the Yandex platform recovers late

## ID
0329

## Sprint
Sprint 6

## Priority
42

> **42 is the append rank** — the bottom of the [Sprint 6 board](../../../sprints/done/plan-sprint-6.md), appended
> after `0328`, never inserted (ADR-035). **Placement OWNER-RULED 2026-09-28:** *"End of Sprint 6
> (Recommended)"*. ⚠️ Not a merit rank. **On merit this belongs directly below `0326`**, because it depends on
> `0326` and it is the one piece that fixes the "card gone for the whole page" defect; that is exactly where the
> owner's order puts it, bar `0328`.

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder

## Context

**Filed 2026-09-28 by a spawned `fkit-producer` with no owner channel (ADR-021), on OWNER RULINGS on `0318`
given live via `AskUserQuestion` in the `fkit lead` session and relayed by `fkit-lead` (ADR-021/037).** ⛔ Not
producer precedent.
- **D-2**, verbatim: **"B1+B2+B3, B4 if confirmed (Recommended)"** — option text: *"Measure, re-check late,
  retry the download, and fix the match-exit address if the check confirms it."* This task is **B2**.
- **Placement**, verbatim: **"End of Sprint 6 (Recommended)"**. **`0326` pulled into Sprint 6**, verbatim
  **"Yes, into Sprint 6 (Recommended)"** — option text: *"Placed just before the new B1–B4 rows so B2 can follow
  it."*

**Source:** [`0318` findings report](../../../knowledge-base/reports/2026-09-28-0318-citizenship-card-vanishes.md)
§0 item 1, §1, §4 option (R), §5, §6 row B2.

**Root cause (report §0/§1).** `CitizenshipCard.connectedCallback` reads the `citizenship_ui` flag **once**,
after the init gate (`src/client/CitizenshipCard.ts:112-120`). On a boot where the SDK is missing or late, flags
are undefined (`FlashistFacade.ts:905-912`), the read returns `false` (`FlashistFacade.ts:984-994`) and the card
hides. If the SDK then arrives late, the facade's late-recovery branch re-fetches flags, re-primes the badge,
inits payments and gets the player (`FlashistFacade.ts:824-866`) — **but nothing tells the card**, so it stays
hidden until the next page load. Hiding is correct (`0291`); hiding **permanently** is the defect.

**Knock-on it also fixes (report §1).** A hidden card never publishes a citizenship status, so the status stays
`unknown` (`CitizenshipStatus.ts:34`) and every perk treats `unknown` as locked (`CitizenshipStatus.ts:14-15`) —
**a paying citizen loses the private-lobby perk (`0302`) for that page.** Once the card reveals and publishes,
that clears too.

### Locked decisions this touches

- **`0291` — fail-closed, KEEP.** The card must never show on unknown flags. Reveal **only** on a real flag value
  `enabled` after recovery. Flag off, or flags still missing → stays hidden.
- **`0049` — "late-recovery UI refresh deferred … revisit if `Session:PlatformInitTimeout` volume proves
  non-trivial".** This task is that **scheduled revisit, not a reversal** (report §4). The `YandexUnknown` upper
  bound — 0.8–1.2K unique users/day against 3.58–4.79K daily players in the week 2026-09-07 to 09-13 (report §0
  item 3) — is the trigger `0049` named.
- **5 s shared deadline** (`PLATFORM_INIT_DEADLINE_MS`, `FlashistFacade.ts:422`) — untouched; this runs after it.

## What to build

1. **A "platform recovered" signal on the facade** (a promise or event — the plan decides), fired from the
   late-recovery branch **after** the flags re-fetch completes (around `FlashistFacade.ts:836`). It fires only when
   recovery happens after the gate already resolved.
2. **The card subscribes only when it hid because flags were missing** — not when the flag was genuinely off.
   On the signal it re-reads `isCitizenshipUiEnabled()`; if `true`, it runs the **normal** reveal path (profile
   read via `refreshProfile()`, `whenPaymentsCatalogSettled` re-render). No second code path for showing the card.
3. **Keep the single-read-path rule** (`startTenureClaim` doc block): the re-read goes through `refreshProfile()`,
   never a new `loadPlayerProfileView()` caller, so `Citizenship:Earned:XP` cannot double-fire.
4. **Once only.** A second recovery signal, or a card already shown, does nothing. Unsubscribe on disconnect.
5. **Tests** in `tests/client/CitizenshipCard.test.ts` (report §5 describes the reproduction):
   - facade with no SDK, non-dev env → card hides; simulate late recovery with the flag `enabled` → card **shown**
     (this test **fails on today's code** — today it stays hidden);
   - late recovery with the flag **off** → stays hidden;
   - never recovers → stays hidden;
   - after reveal, citizenship status is published (perk no longer `unknown`);
   - existing fail-closed tests (`:174`, `:228`) still pass.

**Out of scope:** any retry of the SDK download (`0330`); a visible "couldn't load / retry" state (report option
(iii) — **not proposed**: card-shaped it re-opens the fail-open `0291` withdrew); returning to the menu without a
reload (option (ii) — blocked by `0252`).

## Verification steps

1. The new "late recovery → shown" test fails on today's code and passes after. Record both runs in the worklog.
2. `npm test -- tests/client/CitizenshipCard.test.ts` plus the other citizenship suites (`CitizenshipStatus`,
   `CitizenshipPurchase`, `CitizenBadge`, `CitizensOnlyModal`) pass.
3. A test shows `Citizenship:Earned:XP` still fires at most once per page load across a recovery.
4. **Local browser check** (report §5): `npm run build-prod`, serve `static/`, open
   `src/client/yandex-games_iframe-parent.html` (frames the game with no query; its parent never answers the
   loader) → expect hang → 5 s deadline → card hidden. ⚠️ That harness never recovers, so recovery itself is
   proven by the unit tests; say so in the worklog rather than claiming a live reveal. `npm run dev` cannot show
   the hidden card (`FlashistFacade.ts:980-982`).
5. `npm run lint` clean; full `npm test` (known `supertest` flake → CLAUDE.md procedure, say you re-ran).
6. **Owner, after release (informational):** with `0328` live, compare **M6** (page loads with the flag) and
   **M7** `Citizenship:Seen` against **M1** `Session:Start` before and after (report §3.2; GameAnalytics, 7 days,
   dimension 02 = `yandex`) and the `Session:PlatformRecovered` count. **Report numbers only.**

## Notes

- **Depends on:** 0326 (stale-read guard — this task adds a second concurrent profile read, so `0326` must land
  first).
  *(2026-09-28: `0326` closed `✅ Done (agent-closed — not owner-verified)` — this dependency is met. **Binding
  merge note** from [`0326` plan § 6](../../done/0326-citizenship-card-applies-only-the-newest-profile-read/plan.md):
  the late-recovery reveal reads **only** through `refreshProfile()`; nothing else may assign `this.profile` or
  call `publishCitizenshipStatus()` / `publishApprovedName()` from a read result — a second apply site must
  reuse one extracted helper, never a copy. A read landing after disconnect still applies; if this task's
  subscribe/unsubscribe makes that matter, see the `disconnectedCallback` option in that § 6.)*
- **Blocks:** 0330 (without this, a retry that succeeds after the deadline still leaves the card hidden).
- **Related:** `0318`, `0328` (measures it), `0291`, `0049`, `0302`, `0303`.
- **Privacy:** no player ids, tokens or hosts in any artifact.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
