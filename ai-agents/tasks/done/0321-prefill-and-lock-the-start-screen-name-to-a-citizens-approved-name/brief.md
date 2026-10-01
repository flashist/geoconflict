# Prefill and lock the start-screen name to a citizen's approved name

## ID
0321

## Sprint
Sprint 6

## Priority
36

✅ **36 — placement OWNER-RULED 2026-09-27** (*"End of Sprint 6 (Recommended)"*, live via `AskUserQuestion`
in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer`, ADR-021/037). Append rank:
this board's highest was 35 (`0308`). No row was renumbered (ADR-035). **On merit it sits directly below
`0317`** (the investigation it comes from) and **directly above `0322`**, which it softens.

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder

## Context

**Filed 2026-09-27 by a spawned `fkit-producer` with no owner channel (ADR-021/037), on owner rulings on
`0317` given live via `AskUserQuestion` in the `fkit lead` session and relayed by `fkit-lead`.** ⛔ Not
producer precedent. This is brief **B1** of the `0317` findings report.

**Owner rulings this brief carries out (verbatim):**
- **D1** (prefill the start-screen name with the approved name first): **"Yes, prefill first
  (Recommended)"** — *"Honest citizens play under their approved name right away. Accept that anyone can
  still type the same name."*
- **D4** (can a citizen play under another name): **"No, approved name locked (Recommended)"** — *"The name
  box shows the approved name, locked, with a hint to change it on the citizenship card. One clear rule."*

**The problem.** A citizen's approved name (`display_name`) shows only on the citizenship card. The
start-screen name box fills from the Yandex name first, then `localStorage`, then `Anon####`
(`src/client/UsernameInput.ts`, `getStoredUsername()`). So a citizen who paid for a moderated name still
plays under their Yandex name, in multiplayer and single-player.

**⚠️ This is not a security control, and the owner accepted that (D1).** Anyone can still type the same
string in their own name box. The lock only means *the holder* always plays under their approved name. The
server-side swap that ties the name to the account is `0322`. Look-alike names stay accepted (D6 — revisit
in `0308`).

**What the report found** ([`0317` report](../../../knowledge-base/reports/2026-09-27-0317-approved-name-in-matches.md),
§4 and §5(c)):
- `PlayerProfileView` already computes `display_name ?? platform name` for the card
  (`src/client/PlayerProfileView.ts`).
- **Timing race (not measured):** the name box loads in `connectedCallback`, and the profile read may land
  later. The box may first show the Yandex name and must then switch.
- Guests cannot hold an approved name (no Yandex id). Their box is unchanged.

## What to build

1. **Order of sources in the name box:** approved name (from an authoritative profile read) → Yandex name →
   `localStorage` → `Anon####`. Pass the approved name through the same join-name cleaning the box already
   applies, so the box never shows a name the server's join check would refuse.
2. **Lock (D4).** When an authoritative profile read shows an approved name, the name box shows it
   **read-only**, with a short hint that the name is changed on the citizenship card. en **and** ru texts
   (project rule: both files together).
3. **Write the approved name to `localStorage`**, so a later degraded load (no SDK, failed profile read)
   still starts with it.
4. **Handle the timing race.** If the profile read lands after the box has filled, switch to the approved
   name and lock it. A player who has already typed must not lose a name silently mid-edit — the plan
   decides how (for example, switch only if the box is not being edited).
5. **Fail-soft.** A failed or slow profile read never blocks the start screen and never locks the box. The
   box then behaves as today.
6. **Cleared name (`0314`).** When an approved name is cleared or rejected, the next load unlocks the box and
   falls back to the normal order.
7. **Tests** for each source order, the lock, the race, fail-soft and the cleared name.

**Producer defaults the plan must confirm with the owner at the plan gate** (not owner-ruled):
- The lock keys on **"an authoritative profile read shows a non-null approved name"**, not on
  citizenship. If a citizen loses citizenship but keeps a `display_name`, the box stays locked. Owner's call.
- On a degraded load the box is **not** locked, even though `localStorage` may hold the approved name.
  The lock needs a fresh profile read.

## Verification steps

1. Unit tests: with an approved name, the box shows it and is read-only; without one, the order is Yandex
   → `localStorage` → `Anon####`, editable, as today.
2. Unit test: profile read lands after the box has filled → box switches to the approved name and locks.
3. Unit test: profile read fails or times out → box unlocked, today's behaviour, no error shown.
4. Unit test: approved name cleared → next load unlocked.
5. The hint text exists in `resources/lang/en.json` **and** `ru.json`, with the same key.
6. Local run as a citizen with an approved name: the box shows it locked; a single-player game and a
   multiplayer lobby both show that name.
7. **Measure** the real order of `connectedCallback` versus the profile read on a Yandex load and record it
   in the worklog (the report left it unmeasured, §10).
8. `npm test` green (re-run and say so if the known `supertest` flake appears).

## Notes

- **Depends on:** nothing
- **Blocks:** nothing hard. `0322` is recommended after this one: with the box already holding the approved
  name, a slow server lookup in `0322` shows the right name anyway.
- **Related:** [`0317`](../../done/0317-investigate-show-a-citizens-approved-name-in-matches/brief.md) (source
  investigation and rulings) ·
  [`0322`](../0322-game-server-shows-a-citizens-approved-name-in-multiplayer-matches/brief.md) (server-side
  swap) · [`0308`](../../cancelled/0308-player-name-loses-its-space-find-where-and-decide-which-characters-a-name-may-contain/brief.md)
  (the name rule the box enforces; soft) · [`0314`](../../done/0314-name-change-rejected-state-sticks-on-the-card-and-no-way-to-clear-a-name-decide-and-fix/brief.md)
  (clear a name) · [`0318`](../../done/0318-investigate-citizenship-card-vanishes-after-a-match-on-a-shaky-connection/brief.md)
  (degraded sessions).
- **Privacy/secrets:** no real player names or ids in tests, worklog or report.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
- 📌 **Routing note from [`0303`](../../done/0303-the-whole-game-reflects-a-purchase-without-a-reload/brief.md) (2026-09-28, `0303` plan step 11; added by a spawned `fkit-producer` at `fkit-lead`'s request):**
  *"after a purchase the popup offers a restart and a match end reloads anyway, so a perk may read status at load time. A grant made by session-start reconciliation applies from the next load unless the perk listens to `PURCHASES_RECONCILED_EVENT`."*
- 📌 **2026-09-28 — does not touch the name-approved inbox message (append-only; added by a spawned
  `fkit-producer` at `fkit-lead`'s request; OWNER RULING on `0316` Q2, given live via `AskUserQuestion` in the
  `fkit lead` session, ADR-021/037).** Answer, verbatim: **"Once, when 0322 ships (Recommended)"** — *"0322's
  note becomes 'may reword, owner approves the text'; 0321 gets 'doesn't touch this message'. One rewording,
  when the name fully shows in matches."* **This task does not change the approve inbox message.** Background
  from [`0316`](../../done/0316-approve-inbox-message-must-not-promise-the-new-name-is-active-everywhere/brief.md)'s
  `plan.md`: this task, not `0322`, is the **first** to put the approved name into matches — the locked box
  sends it as the typed name at join (not yet confirmed by the server). `0316`'s short wording (owner ruling
  Q1 "C: short": en *"Your new display name '{name}' has been approved."* / ru *«Ваше новое имя «{name}»
  одобрено.»*) stays true after this task ships, so no rewording is needed here.
