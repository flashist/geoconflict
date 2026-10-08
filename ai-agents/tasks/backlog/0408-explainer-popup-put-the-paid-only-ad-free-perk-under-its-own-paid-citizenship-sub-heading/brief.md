# Citizenship explainer popup: put the paid-only ad-free perk under its own "Только для платного гражданства:" sub-heading

## ID
0408

> ℹ️ **ID allocation, checked 2026-10-08 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/` (folder
> names and `## ID` fields agree) is `0407`, so this is `0408`.

## Sprint
Sprint 7

> 📌 **2026-10-08 — was ~~Backlog~~; moved to [Sprint 7](../../../sprints/plan-sprint-7.md).** OWNER RULING typed directly by the owner in the `fkit lead` session on 2026-10-08 (the owner's own message, not an `AskUserQuestion` answer), relayed verbatim by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent.
> Verbatim: *"0407, 0408, 0409 - shoud be moved into the Sprint 7 (current sprint), we might need to do them today and deliver a new deploy update"*. The [Backlog board](../../../sprints/backlog.md) row is kept as `➡️ Moved`. Status unchanged
> (`🔲 Backlog`); no folder moved, no mover run. Deploy timing: see the dated *Deploy* note under *Notes*.

## Priority
55

> 📌 **2026-10-08 — was ~~Unscheduled~~; 55 is ADR-035 append position on [Sprint 7](../../../sprints/plan-sprint-7.md), NOT a merit rank.**
> The owner named the three tasks (`0407`, `0408`, `0409`, in that order), not ranks. Appended after that board's
> highest (54, `0407`); open for owner confirmation. The paragraph below describes the Backlog board and is history.

⚠️ The owner gave no rank. Filed on the unranked [Backlog board](../../../sprints/backlog.md) as an appended row (ADR-035)
— its place on that board is **append order, not a merit ranking**. Needing a rank is the signal to pull it into a sprint.

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

### The problem — the owner's words

Owner, 2026-10-08, typed live in the `fkit lead` session (with a screenshot of the line), relayed by `fkit-lead` to a
spawned `fkit-producer` (no owner channel; ADR-021/037). Verbatim:

> *"I have question about this line: I think it's wrong, the text shows about ALL citizenship types, but some persk are
> only for the PAID citizenship"*

The popup is the citizenship explainer from
[`0301`](../../done/0301-citizenship-explainer-popup-and-purchase-funnel/brief.md), live since the 2026-10-08 game
deploy `0.0.157`. Its benefit list sits under one heading, `citizenship_explainer.benefits_title`:

| Key | RU (today) | Who gets it |
|---|---|---|
| `benefits_title` | Что получают граждане | heading — reads as "every citizen" |
| `benefit_badge` | Значок ★ гражданина рядом с вашим именем в матчах | every citizen |
| `benefit_name_change` | Смена имени (каждое новое имя проверяет модератор) | every citizen |
| `benefit_private_lobby` *(shown only when the Create Lobby row is enabled)* | Создание приватных лобби для игры с друзьями (присоединиться может любой) | every citizen |
| `benefit_no_ads` | Без полноэкранной рекламы перед матчами и после них — только для купленного гражданства | **paid citizens only** ([`0248`](../../done/0248-suppress-interstitial-ads-for-paid-citizens/brief.md)) |

The ad-free line sits under an "all citizens" heading, so it reads as a perk every citizen gets; the trailing
"— только для купленного гражданства" suffix is easy to miss. The wording came from `0301`'s owner-approved plan
(`ai-agents/tasks/done/0301-citizenship-explainer-popup-and-purchase-funnel/plan.md`, the `citizenship_explainer`
string table) — so this is an owner-requested change to approved text, not a bug fix.

### OWNER RULING — 2026-10-08, live, typed by the owner in the `fkit lead` session (relayed by `fkit-lead`)

Options the lead put to the owner: (1) move the line under the "Или купите сразу" section; (2) *"Give paid-only perks
their own small heading in the list, e.g. "Только для купленного гражданства:", with the ad line under it"*; (3) keep
the layout, use a stronger prefix.

Owner, verbatim:

> *"we chose 2nd option, and the subtitle should be "Только для платного гражданства:""*

So: **option 2**, and the RU sub-heading text is **exactly** `Только для платного гражданства:` (owner-given — do not
reword it). Options 1 and 3 were weighed and rejected by this ruling; do not reopen them.

### Dependencies and conflicts

- None blocking. `0301` (the popup) and `0248` (the ad-free perk) are both built and closed.
- [`0401`](../../done/0401-verify-0301-live-the-citizenship-explainer-popup-works-in-production/brief.md) (live check of the
  popup) — its check 3 reads the popup **in RU**. If `0401` runs before this ships, it checks today's text; that is
  fine, `0401` is not changed by this task.
- [`0407`](../0407-thank-paid-citizens-for-supporting-the-game-on-the-citizenship-card/brief.md) (thank paid citizens
  on the **card**) — separate, design-gated. This task does **not** wait on it and does not touch the card.

## What to build

A small, client-only text + layout change in `src/client/CitizenshipExplainerModal.ts` and the two language files.

1. **Keep** `benefit_badge`, `benefit_name_change` and (when shown) `benefit_private_lobby` under
   **"Что получают граждане"**, unchanged.
2. **Add a small sub-heading** under that list: RU **`Только для платного гражданства:`** (owner's exact text), from a
   **new** key in the `citizenship_explainer` section (coder names it, e.g. a `paid_only_title`-style key).
3. **Move the ad-free line** (`benefit_no_ads`) under that new sub-heading, as its own short list.
4. It should read as a **sub-section of the benefits**, visually smaller than the section headings
   ("Что получают граждане", "Как получить бесплатно", "Или купите сразу") — not a new top-level section.
5. Text only through `translateText(key)`; the new key and any changed value land in **both**
   `resources/lang/en.json` and `resources/lang/ru.json`. No hardcoded user-visible string.
6. Update the existing tests that list the popup's keys (`tests/client/CitizenshipExplainerLang.test.ts`,
   `tests/client/CitizenshipExplainerModal.test.ts`) for the new key, and add a check that the ad-free line renders
   under the paid-only sub-heading, not inside the all-citizens list.

### Open wording points — the owner confirms these at the coder's plan gate (NOT decided here)

The producer recommends; the owner decides. Put these to the owner in the plan, in plain words, before writing strings.

1. **EN sub-heading.** The owner gave only the RU text. **Recommendation:** `Paid citizenship only:` — a straight
   match for "Только для платного гражданства:".
2. **Drop the now-redundant suffix from `benefit_no_ads`?** Once the line sits under "Paid citizenship only:", its
   trailing "— for bought citizenship only" says the same thing twice. **Recommendation: yes, drop it** →
   RU `Без полноэкранной рекламы перед матчами и после них`, EN `No full-screen ads before and after matches`.
   Tradeoff: if a future layout ever showed the line outside its sub-heading, the suffix would be missed — no such
   case exists today.
3. **"купленного" vs "платного" — context only, no change.** The owner chose "платного" for the sub-heading. Dropping
   the suffix (point 2) removes the popup's only "купленного". `0397`'s card line
   `✓ Подтверждено — преимущества платного гражданства включены` already says "платного", so the two will match.
   ⛔ `0397`'s line is owner-approved and is **not** touched by this task.

## Verification steps

1. **Plan gate:** the coder's plan records the owner's answers to open wording points 1 and 2 (who, date, channel,
   words) before any string is written.
2. `ru.json`: the new sub-heading key reads exactly `Только для платного гражданства:`. `en.json` carries the
   owner-confirmed EN text. Both files have the same keys (the language-parity test passes).
3. In the rendered popup, the "Что получают граждане" list holds badge, name change and (when enabled) private lobby —
   **and not** the ad-free line. The ad-free line renders under the new sub-heading. Covered by a unit test.
4. The private-lobby line keeps its existing rule (shown only when the Create Lobby row is enabled) — its existing test
   still passes.
5. `npm test` green for the touched suites; `npm run lint` clean.
6. **Visual check, local dev**, in both `ru` and `en`, at desktop width and at **phone width** (about 360 px): the
   sub-heading and ad-free line are fully visible, not clipped, not overlapping; the popup still scrolls/fits as before.
   Screenshots (or a written yes/no per case) in the worklog.
7. **Live check** happens after a later game deploy. Per the owner's build/verify split rule (2026-09-29): this task
   closes on the local evidence above; the live look-over is folded into the next popup live check or filed as its own
   verify task at the top of the next sprint — it does not hold this task open.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing
- Related: `0301` (the popup and its approved wording), `0248` (the paid-only ad-free perk), `0401` (popup live check;
  check 3 reads the popup in RU — unchanged by this task), `0407` (thank paid citizens on the card — separate,
  design-gated, not waited on), `0397` (its "платного" line — context only, not touched).
- ~~**Deploy:** ships in a later game deploy, in the owner's weekend slot (ruling 2026-09-29) unless the owner says
  otherwise. Committed is not deployed.~~ *(history — true until the 2026-10-08 ruling below)*
- 📌 **Deploy, 2026-10-08 — owner ruling (verbatim under *Sprint*):** this task may be built and shipped **today, in a
  new deploy** — owner's words *"we might need to do them today and deliver a new deploy update"*. The weekend-slot
  rule (2026-09-29) is set aside for `0407`, `0408`, `0409` only; *"might"* is not a commitment to ship today. Committed
  is still not deployed; commit and deploy stay the owner's call.
- No ids, hosts or secrets belong in this brief or its follow-ups.
- Filed 2026-10-08 by a spawned `fkit-producer` on an owner ruling relayed by `fkit-lead` (ADR-021/037). ⛔ Not producer
  precedent.
