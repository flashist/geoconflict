# Refuse name-change requests that look like the default guest name ("Anon" + digits)

## ID
0360

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**Filed 2026-10-01 by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER REQUEST given live
in the `fkit lead` session on 2026-10-01, relayed by `fkit-lead`.** ⛔ Not producer precedent. Asked *"Tell me if you
want 'Anon + digits' names blocked automatically. Without that rule, they can ask for the same name again."*, the
owner answered, verbatim:

> *"yes, but it's not an urgent thing, brief the task for it and put it to the backlog sprint"*

**Not urgent — owner's words.** Filed on the Backlog board, unranked.

**What happened (2026-10-01).** A real citizen asked to change their name to `"Anon 2745"` (with a space) about a
minute after earning citizenship. The owner rejected it by hand with a bilingual reason through the operator's
`name-change:decide` command, and the `name_change_rejected` inbox message reached the player. A database check
showed this was the only name-change request ever starting with "anon". Nothing stops the player from asking for
the same name again, and each time it lands on the human moderator.

**Why "Anon" + digits matters.** It is the game's own default guest name. When Yandex gives no player name, the
client makes one as `"Anon"` + four digits, no space, range 1000–9999 (`src/client/UsernameInput.ts:429-438`,
`generateNewUsername` / `uuidToFourDigits`). A citizen's custom display name that looks like a guest name defeats
the point of the citizen name, and can be confused with real guests.

**Where name-change requests are checked today.**
- `src/profile-server/NameChangeRepository.ts:299-319` — `requestNameChange` checks citizenship, **trims**, runs
  `checkUsernameRules` (length 3–27 and charset `^[\p{L}\p{N}_[\]\s]+$`), returns
  `{ status: "invalid", violation }` on a broken rule, then checks the name is not taken.
- `src/core/profile/NameChangeContract.ts` — the wire shapes; `NameChangeRequestResponseSchema` has
  `status: ok | invalid | name_taken | pending_exists` and `violation: not_string | too_short | too_long |
  invalid_chars`.
- `src/client/NameChangeRequest.ts:83-121` — the client maps the server's error code; an unknown `violation` falls
  back to `invalid_chars` (version-skew guard), an unknown error code becomes a generic `error`.
- `src/client/CitizenshipCard.ts:848-867` — `nameErrorMessage` turns the outcome into the text on the card.

> ⚠️ **HAZARD — do NOT put this rule in `src/core/validations/usernameRules.ts`.** That file is **shared** with the
> in-game username path: `src/core/Schemas.ts:258` refines the join name on `checkUsernameRules`, the in-game input
> (`UsernameInput.ts:147`, `:344`) uses it, and `sanitizeUsername` / `sanitizeUsernameForJoin` must always output a
> name that passes it. Adding the Anon rule there would make the game's **own** generated `Anon####` names invalid
> at join. The new rule applies to the **name-change request path only**.

**Soft conflict — sequence around, not a dependency: `0308`** (*player name loses its space — decide which
characters a name may contain*, Sprint 7, `🔄 In progress`, waiting on the owner's Step 0 snippet). `0308` may
change which characters a name may contain — including spaces, underscores and brackets, the very separators this
rule has to see through. This task does not need `0308` to ship, but if `0308` changes the charset, the matching
rule here must be re-checked against the new one. Prefer to plan this task after `0308` lands.

**Related, not overlapping:** `0350` (one-step approve/reject for the moderator) and `0319` (close the forged-login
name-change hole) touch the same feature but not this check.

**This is a convenience filter, not a security control.** Every other name still goes through the human
moderator, exactly as today. The trust residuals recorded in `NameChangeContract.ts` are unchanged.

## What to build

1. **One "looks like a guest name" check, defined in one place** that both the profile server and (optionally) the
   client can import — a new dependency-free module under `src/core/` (for example next to
   `NameChangeContract.ts`), **not** `usernameRules.ts`. It answers yes/no for a trimmed name. Its exact matching
   rules are the open questions below; the plan step must settle them with the owner before building.
2. **Profile server refuses it.** In `requestNameChange`, after the existing trim and rule check, a name that looks
   like a guest name is refused with a **specific** outcome (an `invalid`-style result the card can tell apart from
   the length/charset ones). It never reaches the moderator, the digest, or the database as a pending row.
3. **Wire contract.** Extend `NameChangeRequestResponseSchema` (new `violation` value or new status — the plan
   decides). ⚠️ The client and the profile server **deploy separately**: the plan must say what an **old** client
   shows when a **new** server refuses an Anon name (today: an unknown `violation` shows the charset message; an
   unknown status shows the generic error). Either is acceptable if stated; a blank or broken card is not.
4. **Card message.** `CitizenshipCard.ts` `nameErrorMessage` shows a clear, specific message, for example *"This
   looks like a guest name. Please choose a different name."* — final wording is open question 7. New text goes in
   **both** `resources/lang/en.json` and `resources/lang/ru.json` under `citizenship_name_change`, via
   `translateText`.
5. **Optional, plan's call:** the card may run the same check before sending, for instant feedback. The server stays
   the authority either way.
6. **Out of scope:** the in-game username input and join path (they must keep accepting `Anon####`); the operator's
   approve/reject/clear commands; any change to already-approved names.

## Verification steps

1. **Unit tests for the check** (`src/core/` changes must be tested): every case the owner rules "blocked" returns
   yes, every case ruled "allowed" returns no. At minimum `Anon2745`, `Anon 2745`, plus the rest of the ruled list
   from the open questions; and ordinary names (`Anna`, `Anonymous` if ruled allowed, `Canon 12`, `Mark 2745`) return
   no.
2. **Generator pin:** a test proves every name the client's guest generator can produce (`"Anon"` + 1000–9999) is
   caught by the check — so the check and the generator cannot drift apart.
3. **Join path untouched:** a test proves `checkUsernameRules("Anon2745")` is still `null` and
   `sanitizeUsernameForJoin` still returns `Anon####` names unchanged.
4. **Profile-server route test** (`tests/profile-server/NameChangeRoutes.test.ts` and/or
   `NameChangeRepository.test.ts`): `POST /v1/profile/name-change-request` with `"Anon 2745"` from a citizen returns
   the new specific refusal; **no pending row is written** and no moderator notification fires; a normal name still
   creates a pending request.
5. **Client mapping test:** the new outcome maps to the new message; an unrecognized value still shows a sensible
   message (version skew).
6. `en.json` and `ru.json` both carry the new key; `npm test` and `npm run lint` pass.
7. **Live check (after a deploy — weekend slot):** on the citizenship card, request `Anon 2745` → the new message
   shows and the request never appears for moderation. Per the build-vs-verify rule, if this needs a deploy plus an
   owner check, close the build and file a separate verify task at the top of the next sprint.

## Open questions — for the owner, at the plan step (producer's recommendation marked)

The charset allows any letter in any script, spaces, underscores and square brackets — so "looks like Anon" needs
exact rules. Each question below changes what gets blocked:

1. **Upper/lower case?** `anon2745`, `ANON2745`. — **Recommend: ignore case** (block all).
2. **Separators between "Anon" and the digits?** `Anon 2745`, `Anon_2745`, `[Anon]2745`, `Anon [2745]`. —
   **Recommend: ignore spaces, underscores and brackets anywhere** (block all). The trigger case had a space.
3. **How many digits?** Only exactly 4 (what the game generates), or any number (`Anon7`, `Anon27450`)? —
   **Recommend: any number, 1 or more.** Four-only would let `Anon27450` through and the player straight back to
   the moderator. `Anon` with **no** digits is not blocked (left to the moderator).
4. **Look-alike letters from other alphabets?** e.g. `Аnon2745` written with a Cyrillic "А", which looks the same.
   — **Recommend: yes, for the obvious look-alikes of a / n / o** (Cyrillic and Greek), and count any script's
   digits as digits. Otherwise the rule is beaten by one swapped letter. Keep it to a short fixed list, not a full
   look-alike library.
5. **"Anonymous", "Аноним", "Anon" alone?** — **Recommend: no**, not blocked. They are not the default guest name;
   the moderator still sees them. Widening later is cheap.
6. **Names already approved that look like this?** None exist today (owner's DB check, 2026-10-01). —
   **Recommend: no handling** — the rule applies to new requests only; the operator's existing `clear` command
   covers a future one.
7. **Card message wording.** — **Recommend:** EN *"This looks like a guest name. Please choose a different name."* /
   RU *"Это похоже на гостевое имя. Выберите другое имя."* — or let the coder propose at the plan gate.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing
- **Soft conflict (sequence, not a dependency):** `0308` — may change the name charset; re-check this rule's
  separator handling against whatever `0308` rules. Prefer planning after `0308` lands.
- **Related:** `0350` (moderation in one step), `0319` (forged-login name-change hole), `0067` (the name-change
  feature).
- No player id, host or IP is recorded here on purpose.
- Size: small — one new pure check, one branch in the repository, one wire value, one card message, two lang keys,
  tests.
