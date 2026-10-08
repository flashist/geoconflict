
# 0407 — Thank paid citizens on the citizenship card: implementation plan

**Status:** plan only. Nothing is built. ⛔ **Design gate (brief Step 1):** no code or text is written until the owner approves the design below and the approval is recorded at the end of the brief (who, date, channel, owner's exact words).

## 1. Summary

- **Goal:** a paid citizen can see on the start-screen citizenship card that their citizenship is **paid** (not earned through XP). Shown as **text**, not another check mark or badge.
- **Key finding:** the card already has a line that appears in **exactly** the right case. `0397`'s paid line ("✓ Подтверждено — преимущества платного гражданства включены") shows only when the session is **verified** and the player is a **paid citizen**. That is the same rule the brief asks for. So the thank-you needs **no new logic and no new data source**. The only choice is how it looks next to (or instead of) that line.
- **Recommended design (needs owner approval):** turn the `0397` paid line into the thank-you, as **one line** in the same spot (the small grey box under the XP bar), **without the ✓**:
  - EN: *Thank you for supporting the game! Your paid citizenship benefits are on.*
  - RU: *Спасибо, что поддерживаете игру! Преимущества платного гражданства включены.*
- **Size if the recommendation is approved:** a text-only change. Two strings (EN + RU), one test with the approved wording, a comment refresh, plus tests that pin who sees the line. No change to how paid status is worked out.
- **Status of `0397` and `0396`:** `0396` is closed (agent-closed — not owner-verified). Its worklog records the owner's live check on 2026-10-08: a verified paid account got `is_paid_citizen: true`, and the `vfy:false` (unverified) half also passed. The `0397` client shipped in that deploy. So the ✓ line is very likely live now, and the brief's note that "verification waits on `0396`" is out of date: that wait is over.

## 2. What the code does today (checked in the tree, 2026-10-08)

- `src/client/CitizenshipCard.ts` → `renderStatusNotice()`: when the notice is `verified_paid`, it draws `renderStatusLine("citizenship_status.verified_paid")`. That is a small grey box (`mt-2 p-2 rounded-lg bg-white/[0.06]`, 11px grey text) under the XP bar, start screen only.
- `src/client/CitizenshipNotice.ts` → `deriveCitizenshipNotice()`: returns `verified_paid` **only** when the verification status is `verified` **and** `isPaidCitizen` is true. Guest, unverified, failed read and checking never get it.
- The paid value comes from `isCurrentPlayerPaidCitizen()` in `src/client/CitizenshipStatus.ts`. That is the single source (owner ruling R1 on `0248`), also used by the ad gate, and it is true only for the verified owner view (ADR-116 Decision 4). The card is its only writer. ⇒ The rule "never a second paid source, never a second profile read" is already met.
- Kill switch (`CITIZENSHIP_CARD_ENABLED`) or the `citizenship_ui` flag off → `render()` returns nothing, so anything inside the card is hidden too.
- `tests/client/CitizenshipStatusLang.test.ts` pins the `0397` wording **exactly** and says that changing it is an owner decision. The owner's approval at this gate is that decision.
- Files already changed and uncommitted in the tree: `0408`/`0409` (`CitizenshipCard.ts` buy-offer inputs, `en.json`/`ru.json` explainer keys, card tests). `0417` is being built now in `CitizenshipExplainerModal.ts` (styles only). This plan **does not touch `CitizenshipExplainerModal.ts`**. The build goes on top of the `0408`/`0409` changes. Those are in other parts of the same files, so no clash is expected.

## 3. Build steps (after approval), by design option

### Option A — one combined line (recommended)
1. `resources/lang/en.json` and `resources/lang/ru.json`: replace the value of `citizenship_status.verified_paid` with the approved wording, in **both** files. Keep the key name, so the logic, the notice type and the existing tests that look for the key stay as they are.
2. `tests/client/CitizenshipStatusLang.test.ts`: update the `APPROVED.verified_paid` EN/RU text. Note in the comment that the `0407` owner ruling (date) replaced the `0397` wording.
3. `src/client/CitizenshipCard.ts`: refresh the class doc comment ("verified, paid benefits on" → thank-you line) and the comment above `renderStatusNotice()`. No logic change.
4. `src/client/CitizenshipNotice.ts`: refresh the doc comment for `verified_paid` only. No logic change.

### Option B — a separate thank-you line, `0397` line kept as it is
1. Add a new key `citizenship_status.paid_thanks` to both language files.
2. `CitizenshipCard.ts` → `renderStatusNotice()`: when the notice is `verified_paid`, draw the `0397` line and then the thank-you line, both in the same box. The DOM id `citizenship-status-notice` must stay unique (it is used in tests), so the thank-you gets its own id, e.g. `citizenship-paid-thanks`.
3. `CitizenshipStatusLang.test.ts`: add `paid_thanks` to `APPROVED`. The test's "only the approved keys" check means it must be added there.

### Option C — thank-you in the card's top part, under the player's name
1. New key `citizenship_card.paid_thanks` in both files.
2. `CitizenshipCard.ts` → `renderLoggedIn()`: under the name, show a small text line when `this.currentNotice() === "verified_paid"`, so the rule stays identical. The `0397` line stays, or loses its ✓ (a separate ruling).
3. Risk: the top row is tight (flag, CITIZEN tag, name, XP column). The Russian text will wrap or need cutting off on narrow phones. Needs a visual check at about 360px wide.

### For every option
- All text goes through `translateText()`. EN and RU always change together.
- No analytics event, unless the owner asks for one (default: none, see question 4). If one is wanted: add it to the `flashistConstants.analyticEvents` enum and `analytics-event-reference.md`, and fire it at most once per page load, like the `0397` events.
- No change to `CitizenshipStatus.ts`, the profile read, the ad gate or the explainer popup.

## 4. Tests (brief verification step 2)

In `tests/client/CitizenshipCard.test.ts`, using the fixtures that already exist (`VERIFIED_PAID`, `VERIFIED_EARNED`, `UNVERIFIED_CITIZEN`, `FAILED_READ`, guest):
- Verified paid citizen → thank-you text shown (A: the `verified_paid` key; B/C: the new key / id).
- Verified paid **and** reached the XP threshold → shown (paid is a fact either way).
- Verified earned-only → not shown.
- Unverified earned → not shown. Unverified **claiming paid** (`isPaidCitizen: true` on an unverified read) → not shown (ADR-116 D4; this test already exists for the key, keep it).
- Failed read → not shown. Guest → not shown. Still checking → not shown.
- Kill switch off / `citizenship_ui` off → card renders nothing, so no thank-you (existing tests cover "nothing renders". Add an assertion that the text is absent).
- The purchases-reconciled re-read case (already there): failed read → verified paid re-read → thank-you appears without a reload.
- Option B only: both lines show together, and each id appears once.
- Language test: EN and RU carry the exact approved text, RU is not a copy of EN, and the key sets match.
- `tests/client/CitizenshipNotice.test.ts`: no logic change under A/B/C. Run it unchanged as a guard.

**Commands:**
- `npm test -- tests/client/CitizenshipStatusLang.test.ts tests/client/CitizenshipCard.test.ts tests/client/CitizenshipNotice.test.ts tests/client/LangSelectorRerender.test.ts`
- `npx tsc --noEmit`, `npm run lint`
- full `npm test` (the known supertest flake and the shell-harness timeouts are judged by CLAUDE.md's rules; any re-run is reported as a re-run)

## 5. Edge cases checked

- **Right after a purchase:** the card shows "citizen" straight away, but the paid value only turns true after the follow-up profile re-read. If that read is verified, the thank-you appears then. If not, the player sees `0397`'s "couldn't confirm" line. Same behaviour as `0397` today, not a new gap.
- **Paid player whose session is not verified:** sees no thank-you (the client cannot tell them from an earned citizen, by design, ADR-116 D4). They see `0397`'s neutral "couldn't confirm your account" message. Changing this would be a privacy question for the architect first. Not proposed.
- **Language switch:** `LangSelector` already re-renders the card, so the line follows the chosen language.
- **Narrow phones:** the status box is full width and wraps text, so A and B are safe. C needs a visual check (see above).
- **Other languages** (de, fr, …): fall back as they do today for `citizenship_status` keys. Only en/ru are kept in sync (project rule).
- **Card hidden** (kill switch / flag off): the thank-you hides with it, because it lives inside the card.
- **No new "is paid" source:** the plan reads only `currentNotice()`, which reads `isCurrentPlayerPaidCitizen()`.

## 6. Live check (brief verification step 5)

- The live check is possible now: `0396` recorded the verified owner view working in production on 2026-10-08 (owner's DevTools check, both halves passed).
- Live check: on a verified session, the owner's paid account sees the approved text in the approved spot. An earned-only account does not. This needs a deploy plus an owner check, so under the owner's build/verify split rule (2026-09-29) it becomes its **own verify task** and does not hold this build task open. The owner's 2026-10-08 ruling allows `0407` to ship in a same-day deploy. Commit and deploy stay the owner's call.

## 7. Paperwork, not code (for the producer / lead)

- Record the owner's design approval at the end of the brief (who, date, channel, exact words) before any build. Then re-assign the brief's Owner to `fkit-coder`.
- If Option A is chosen, that approval is also the new owner ruling that replaces `0397`'s approved wording (the brief says that wording only changes with one). Record it as such.
- The brief's line saying `0396` is "still open" is out of date (it is in `done/`, live check passed 2026-10-08). The producer may want to note that.

