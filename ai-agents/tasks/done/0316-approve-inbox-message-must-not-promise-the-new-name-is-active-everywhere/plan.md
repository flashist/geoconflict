**Task 0316: the name-change approved inbox message must not promise the name is active everywhere**

**Grounding (checked this turn):**
- The message text lives only in `resources/lang/en.json` (~line 120) and `ru.json` (~line 124). No other lang file defines `name_change_approved`, so other languages fall back to en.
- Nothing in `src/` or `tests/` pins today's text. `tests/client/Inbox.test.ts:602-609` mocks `translateText` and checks only the key. I found no knowledge-base doc or runbook that quotes the text.
- en uses ICU escaping: `''{name}''` renders as `'Name'`. Using a single `'` would turn `{name}` into a literal and the player would see the raw `{name}`. The new text must keep `''`.
- The 0311 guard (`tests/client/NoGameNameInPlayerText.test.ts`) checks every en/ru string. None of the candidate wordings contains the game name.
- On screen, the card's heading is `citizenship_card.title` = "Citizenship" / "Гражданство". The player never sees the words "citizen card". That is why option A below names the card by its heading.
- **It is retroactive, as the brief intends. Confirmed in the code.** The server stores only the template key plus `{name}` (`src/profile-server/NameChangeRepository.ts` → `sendTemplate`). The client renders the text at view time (`src/client/Inbox.ts` `renderInboxMessage`). So every approval already sent shows the new text once the player loads the new client. A player whose browser still has the old client cached sees the old text until they reload.
- **A finding that corrects the 0322/0317-report note.** It is `0321`, not `0322`, that first puts the approved name into matches. `0321` locks the start-screen name box to the approved name, and the client sends that name when joining. So other players already see it (not yet confirmed by the server). Any wording like "for now only on your card" becomes false when `0321` ships, which would force two rewordings.

**Current and proposed text (for owner approval):**

| Key | Lang | Current | Proposed: A (Rec) | Option B (producer draft, verbatim) | Option C (short) |
|---|---|---|---|---|---|
| `inbox.templates.name_change_approved.title` | en | Your name change was approved | *unchanged* | *unchanged* | *unchanged* |
| same | ru | Смена имени одобрена | *unchanged* | *unchanged* | *unchanged* |
| `inbox.templates.name_change_approved.body` | en | Your new display name ''{name}'' is now active. | Your new display name ''{name}'' has been approved. It is shown on your Citizenship card. | Your new display name ''{name}'' has been approved. It is shown on your citizen card. | Your new display name ''{name}'' has been approved. |
| same | ru | Ваше новое имя «{name}» теперь активно. | Ваше новое имя «{name}» одобрено. Оно показывается в карточке «Гражданство». | Ваше новое имя «{name}» одобрено. Оно показывается в карточке гражданина. | Ваше новое имя «{name}» одобрено. |

(en is shown as it is stored in JSON. It renders with single quotes, e.g. 'Name'.)

**Does each option stay true through the name follow-ups?**
- Today (card only): A, B and C are all true.
- After `0321` (start screen locked to the approved name, so the name is also in matches as typed): A, B and C stay true. A and B undersell a little: they do not mention matches, but they do not deny it either.
- After `0322` (server swaps the name in, multiplayer): the same. Adding "and in matches from your next game" then becomes an optional improvement, not a fix for a false statement.
- Rejected on purpose: "for now only on your card". It is the most honest today, but it becomes false when `0321` ships and would need rewording twice.
- Small caveat for A and B: a message about a name that is later cleared (0314) or replaced still says "it is shown". The inbox is a dated history, and the clear sends its own "Your display name was removed" message after it, so the history corrects itself. Option C avoids this caveat, but it does not tell the player where the name appears. Today's "is now active" has the same caveat.

**Steps (after approval):**
1. Record the owner's approved wording word for word in the task folder's `worklog.md` before editing (brief verification 1).
2. Edit `resources/lang/en.json` and `resources/lang/ru.json` together, changing only the `body` line of `name_change_approved`. Keep `''{name}''` in en and `«{name}»` in ru. Leave all nearby uncommitted work from 0311/0314/0250/0303 in these files as it is: small edits, no reformatting.
3. Tests, in `tests/client/NameChangeLang.test.ts`. This is the name-change lang test; it already holds the 0314 additions. I chose it so the 0250 S1 file stays untouched.
   - (a) Pin the owner-approved en and ru title and body word for word, in the same style as the `citizenship_granted` pin.
   - (b) Assert that en's body does not contain "is now active" and ru's does not contain "теперь активно" (brief verification 2, kept as a test).
   - (c) Rendered output: `new IntlMessageFormat(body, lang).format({ name: "Test" })` equals the exact expected sentence. For en that includes the straight quotes around Test. This catches the ICU apostrophe trap and is the closest automated stand-in for brief verification 4.
   - No change to `InboxTemplateLang.test.ts`. It already enforces en/ru `{name}` parity and valid ICU formatting for this key (brief step 2).
4. Run the targeted tests: `npm test -- tests/client/NameChangeLang.test.ts tests/client/InboxTemplateLang.test.ts tests/client/NoGameNameInPlayerText.test.ts tests/client/Inbox.test.ts`. Then run the full `npm test` and `npm run lint`. If the known `supertest` flake appears, check first that it is not the 0197 SIGSEGV, re-run, and say that I re-ran.
5. Grep check (verification 2): `grep -n "is now active\|теперь активно" resources/lang/en.json resources/lang/ru.json` returns nothing.
6. Local run (verification 4): if a local profile server and dev DB are available, open the inbox with an existing `name_change_approved` message in ru and in en and confirm the new text. **If that is not possible (Docker needs an interactive start), I will say so and mark the check unverified.** Step 3(c) is the fallback evidence, not an equivalent.
7. Worklog: record what changed, the test results, and whether the local run was done.

**Deploy order:**
- Client only. The lang JSON is bundled into the client (`src/client/LangSelector.ts` imports it), so it goes out with the normal game-client build and deploy.
- No profile-server deploy, no migration, no DB edit. Independent of any profile-server version.
- It ships in the same client build as the other uncommitted en/ru edits (0311, 0314, 0250 S1, 0303). The owner decides the commit grouping; nothing is committed without the owner's ask.
- Rollback: revert the two lines. Because the text is rendered at view time, a rollback is also retroactive.

**Risks / edge cases:**
- ICU apostrophes in en: covered by 3(c).
- Players with the old client cached see the old text until they reload. This is acceptable, and there is no server fix for it.
- The follow-up briefs must not reword this text on their own; the owner approves any wording (Q2).
- `0322`'s brief (verification step 8) says 0316's wording "must be updated" when 0322 ships. With A, B or C that update becomes optional (Q2). Editing the briefs of 0321/0322 is the producer's job; I do not edit briefs.

**Files:**
- `resources/lang/en.json`
- `resources/lang/ru.json`
- `tests/client/NameChangeLang.test.ts`
- `ai-agents/tasks/backlog/0316-approve-inbox-message-must-not-promise-the-new-name-is-active-everywhere/worklog.md` (process record)

## Owner rulings (2026-09-28, live via `AskUserQuestion` in the `fkit lead` session, relayed by fkit-lead) — record verbatim
- **Q1 (wording):** "C: short" — Never goes stale, but doesn't say where the name shows. ⇒ use **Option C** exactly: en body `Your new display name ''{name}'' has been approved.` / ru body `Ваше новое имя «{name}» одобрено.` Title unchanged. (Not the recommended option A.)
- **Q2 (reword later?):** "Once, when 0322 ships (Recommended)" — 0322's note becomes 'may reword, owner approves the text'; 0321 gets 'doesn't touch this message'. One rewording, when the name fully shows in matches. ⇒ the producer updates the 0321/0322 notes (routing, not part of this build).
- **Plan approval:** "Approve (Recommended)" — 2026-09-28.
