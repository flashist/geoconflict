# Remove the game name ("Geoconflict" / "Геоконфликт") from player-facing texts

## ID
0311

## Sprint
Sprint 6

## Priority
14

✅ **14 — OWNER-RULED later on 2026-09-26** (fourth re-rank, live via `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer`, ADR-021; ADR-037 §3): Q *"0311 … sits at rank 32, with 0316 … tied under it. Move both up?"* → **"Move up after 0318 (Recommended)"** (*"Small text-only changes on the same citizenship screens; can ship in the same release as the popup."*). Directly below `0318`, with `0316` directly below this task. **This answers the merit flag below.** See the *RE-RANK 2026-09-26, FOURTH* addendum on the Sprint 6 board. *Earlier value, kept:* ~~32~~ —

📌 ~~**32**~~ *(superseded by the line above; kept as the record)* — shifted down six later on 2026-09-26 by a third OWNER RULING (R2/R3, live via `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer`, ADR-021; ADR-037 §3): six appended rows moved above it. The same ruling put [`0316`](../0316-approve-inbox-message-must-not-promise-the-new-name-is-active-everywhere/brief.md) (honest approve-message wording — same lang files, ship together) **directly below this task**. ⚠️ **This task itself was NOT moved** — the ruling covered only `0312`–`0318` — so the merit flag below (*"directly below `0303`"*) is **still unanswered**. See the *RE-RANK 2026-09-26, THIRD* addendum on the Sprint 6 board. *Earlier value, kept:* ~~26~~ —

⚠️ **26 is append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs
directly below `0303`**, because it is a copy-only change on the same citizenship surfaces (inbox, tenure
popup) and can ride the shared `0302`/`0301` release; it sits below them because nothing breaks without it.

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**Filed 2026-09-26 by a spawned `fkit-producer` with no owner channel (ADR-021), on an owner request and
two OWNER RULINGS given live in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead`.**
⛔ Not producer precedent.

**The owner's words, verbatim:**
> *"I've noticed one thing. The internal name of the project is GeoConflict, but I would like not to
> mention the name of the game at all. To make texts without the actual name of the game. Is it
> possible?"*

Triggered by the inbox message title *"Вы получили гражданство Geoconflict!"*.

**Owner rulings, 2026-09-26, verbatim:**
- Q *"File a small task to remove the game name from player-facing texts … Where should it go?"* →
  **"Sprint 6"**.
- Q *"The inbox messages already sent … keep the old text with 'Geoconflict'. Update them too?"* →
  **"Leave them (Recommended)"** — no DB edit of already-sent messages.

### 🚨 The "Leave them" ruling rests on a premise the code does not bear out — read before building

The question assumed each inbox message stores its own title/body text at send time. **For the
citizenship message it does not.** `player_messages` holds EITHER a `template_key` (+ params) OR literal
`title`/`body` (`migrations/003_player_messages.sql`, `chk_message_content`). `citizenship_earned` is a
**template** message: the client renders it at view time from `inbox.templates.citizenship_earned.{title,body}`
in the player's language (`src/core/profile/InboxContract.ts`). So:
- **Editing the lang files changes the text of every citizenship message ever sent**, old ones included —
  with **no DB edit**. The ruling's substance (no DB edit) holds; its stated outcome (old messages keep the
  name) does **not**.
- Only **literal** messages (manual/admin sends via `POST /internal/v1/messages/send`) keep whatever text
  they were sent with. Whether any such message contains the name is unknown (not checked).
- Keeping old template messages on the old wording would need a new template key — cost with no player
  benefit. **Open question 1** below asks the owner to confirm the retroactive change is fine.

### Where the name appears today (grep, 2026-09-26, `dev` at `5b3e6ec`)

**In-game texts (in scope, both `en.json` and `ru.json`):**

| Key | ru today | en today |
|---|---|---|
| `inbox.templates.citizenship_earned.title` | *Вы получили гражданство Geoconflict!* | *You've earned Geoconflict Citizenship!* |
| `citizenship_tenure_grant.body` | *Спасибо, что играете в Geoconflict! В благодарность …* | *Thank you for playing Geoconflict! As a thank-you …* |

These two keys exist **only** in en/ru; other languages fall back to en (`src/client/Utils.ts` ≈:131–143),
so fixing en covers them.

**Page title / install name (scope decided by the owner — open question 2):**
- `main.title` — ru *Геоконфликт*, en *Geoconflict (ALPHA)*, and *"Geoconflict (ALPHA/ALFA/АЛФА…)"* in
  **26 other** lang files. It is set as the page title (`LangSelector.ts` ≈:249) and as the header text
  `#game-version` (`Main.ts` ≈:195 — present in `index.html` only; commented out in the Yandex iframe
  template).
- `<title>` in `src/client/index.html` (*Geoconflict*) and `src/client/yandex-games_iframe.html`
  (*Геоконфликт*) — overwritten by `main.title` once the language loads.
- `resources/manifest.json` `name` / `short_name` (*Geoconflict*) — the "install app" name.
- ⚠️ Inside the Yandex Games iframe the player sees Yandex's page title, not ours; the standalone site
  shows ours in the browser tab.

**Out of scope (lead's list — code and operator-facing, not seen by players):** internal Telegram alerts
(`AlertRelay.ts`), metric/service names (`geoconflict.*`, `geoconflict-client`), `localStorage` keys, the
favicon filename, the canonical domain `geoconflict.ru`, code identifiers, logs, design mock-ups under
`resources/claude-design-files/`, built output under `static/`. ⚠️ The domain itself *is* the name and a
player can see it in the address bar on the standalone site — not changeable here; noted only.

## What to build

**Step 0 — Owner approves the wording (and the page-title scope) before any edit.** Put the proposal
below to the owner; record the answer verbatim in this brief or `worklog.md`.

Proposed replacements (producer's draft — the owner decides):

| Key | ru proposed | en proposed |
|---|---|---|
| `inbox.templates.citizenship_earned.title` | *Вы получили гражданство!* | *You've earned citizenship!* |
| `citizenship_tenure_grant.body` | *Спасибо, что играете! В благодарность за то, что вы с нами так давно, мы дарим вам {xp} XP. Теперь у вас {total} / {threshold} XP.* | *Thank you for playing! As a thank-you for being with us for so long, we're giving you {xp} free XP. You now have {total} / {threshold} XP.* |
| `main.title` *(only if owner says yes to Q2)* | *Онлайн-стратегия* | *Online strategy* |

Placeholders `{xp}`, `{total}`, `{threshold}` stay exactly as they are.

**Step 1 — Edit the in-game texts** in `resources/lang/en.json` and `ru.json` together (project rule:
the two stay in sync).

**Step 2 — Only if the owner includes the page title (Q2):** set `main.title` in **all** lang files (not
just en/ru — otherwise the name survives for those players; this is a deliberate exception to the "other
languages need not be updated" rule), both HTML `<title>` tags, and `manifest.json` `name`/`short_name`.

**Step 3 — Tests.** `tests/client/TenureGrantLang.test.ts` asserts the tenure copy verbatim
("the owner-approved copy, verbatim") — update it to the newly approved copy. Add a guard test: no value
in `en.json`/`ru.json` (and, if step 2 ran, no `main.title` in any lang file) contains `geoconflict` or
`геоконфликт`, case-insensitive — so the name does not creep back.

**Step 4 — Confirm by eye** in a local run: the inbox shows the new citizenship title for an **already
existing** `citizenship_earned` message (proves the retroactive behaviour described above), and the
tenure popup shows the new body.

## Verification steps

1. The owner's approved wording (ru + en) and the Q1/Q2 answers are recorded verbatim before any edit.
2. `grep -i 'geoconflict\|геоконфликт'` over `resources/lang/en.json` and `ru.json` returns nothing.
   If step 2 ran: the same grep over all `resources/lang/*.json`, both HTML templates' `<title>`, and
   `resources/manifest.json` `name`/`short_name` returns nothing (the canonical link and favicon filename
   are expected to remain).
3. The new guard test fails on today's lang files and passes after the edit.
4. `tests/client/TenureGrantLang.test.ts` passes with the new copy; en/ru placeholders still match.
5. `npm test` green (re-run and say so if the known `supertest` flake appears).
6. Local run: an existing `citizenship_earned` inbox message shows the new title in both ru and en.

## Notes

- **Depends on:** nothing
- **Related:** [`0012`](../../done/0012-personal-inbox/brief.md) (personal inbox — the template model) ·
  [`0253`](../../done/0253-tenure-xp-grant-for-existing-players-at-citizenship-launch-research-and-rule/brief.md)
  (tenure popup copy, owner-approved — this task changes it) ·
  [`0268`](../0268-remove-tenure-xp-claim-logic-after-60-days/brief.md) (will remove the tenure popup
  later; fix the copy anyway, it is live now) ·
  [`0301`](../0301-citizenship-explainer-popup-and-purchase-funnel/brief.md) (the explainer's new copy
  must follow the same rule — no game name).
- **Standing rule from here on (proposed, owner to confirm):** new player-facing copy does not name the
  game. `0301` and any future inbox template should follow it.
- **Privacy/secrets:** none involved.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.

### Open questions for the owner
1. **Already-sent citizenship messages will change too** (they are drawn from the lang file each time they
   are shown) — no DB edit. OK? *Recommended: yes* — keeping the old wording would need a second template,
   for no player benefit.
2. **Page title and install name** (`main.title`, both `<title>` tags, `manifest.json`): remove the name
   there too? *Recommended: yes*, with a neutral title — the owner asked for *"not … at all"*, and the cost
   is one key across the lang files.
3. **Wording:** approve the ru/en drafts in step 0, or give your own.
