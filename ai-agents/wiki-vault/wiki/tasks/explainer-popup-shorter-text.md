# Citizenship Explainer Popup: Shorter Text So the Buy Button Shows Without Scrolling on Phones (task 0421)

**Source**: `ai-agents/tasks/done/0421-citizenship-explainer-popup-shorter-text-so-the-buy-button-shows-without-scrolling-on-phones/brief.md` (`worklog.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 7, rank 64 (ADR-035 append rank; on merit directly below `0417`) / task `0421`

> ✅ Done (agent-closed — not owner-verified), closed 2026-10-09. Committed as `a0b2485` (owner: *"Popups look good,
> commit"*); **deployed to production in game `0.0.161`** (tag `0.0.161`, 2026-10-09, owner: *"deploy is done"*). The
> coordinating session confirmed read-only that the live bundle carries `0.0.161` — that proves the build is out, not the
> popup on screen. The live check on a real phone was first filed as `0422`, then **folded into `0420` as item 8** (owner
> ruling *"Fold into 0420 (Recommended)"*; `0422` cancelled — [[decisions/cancelled-tasks]]).

## Goal

Owner, 2026-10-08, verbatim: *"we need to make the amount of text for the "What is cizineship" popup smaller. Right now
on mobile it takes too much space and scroll is shown, the "buy" button is not visible "on the 1st screen"."* The popup
is [[tasks/citizenship-explainer-popup]] (`0301`), as changed by `0408` ([[tasks/explainer-paid-only-subheading]]),
`0409` ([[tasks/explainer-buy-for-earned-citizens]]) and `0417` ([[tasks/explainer-popup-wider]]), all in game
`0.0.160`.

**Hard gate:** no code before the owner approved the new text as an old-vs-new comparison, en and ru — met 2026-10-08,
*"Approve as shown (Recommended)"*.

**Owner rulings at the open points (2026-10-08):** *"Don't expect any size, we're just trying to make the text as small
as possible, while preserving the meaning."* — **no pass/fail phone-size target**; *"For now, text is ok."* — **text
only, no spacing or font change**; `0420` updated after the build.

## Key Changes

- **Removed elements** (template change in `src/client/CitizenshipExplainerModal.ts`; keys deleted from both
  `resources/lang/en.json` and `ru.json`): the intro paragraph (`intro`), the "Get it for free" heading (`free_title`),
  the "Or buy it now" heading (`buy_title`), and — owner change 2026-10-09, *"Remove the title "Граждане получают:""* —
  the benefits heading (`benefits_title`).
- **Final text (ru / en):** `benefit_badge` "Значок ★ рядом с именем в матчах" / "A ★ badge next to your name in
  matches" · `benefit_name_change` "Смена имени" / "Name changes" · `benefit_private_lobby` "Приватные лобби" /
  "Private lobbies" · `paid_only_title` "Только с платным гражданством:" / "Paid citizenship only:" (en unchanged) ·
  `benefit_no_ads` "Без рекламы между уровнями" / "No ads between levels" · `free_body` "Получите бесплатно за
  {threshold} XP" / "Get it free for {threshold} XP" · `your_xp` "У вас {xp} / {threshold} XP." / "You have {xp} /
  {threshold} XP.". Title, `login_hint`, `already_citizen`, `citizen_buy_*`, `close` and the Buy button text unchanged.
- **Four further owner changes on 2026-10-09**, each the owner's own typed message, each applied to ru as named and to
  en to keep the two files in sync (project rule — the owner named only the ru line): the private-lobby line, the
  ad-free line, the free-route line, and the `Смену` → `Смена` grammar fix after the heading went (owner: *"Use "Смена
  имени" (Recommended)"*).
- **Free-route line:** the number stays the `{threshold}` placeholder (filled from `CITIZENSHIP_XP_THRESHOLD`, never
  typed into copy). The per-match number is no longer shown, so the popup stops passing `xpPerMatch` and stops
  importing `XP_PER_MATCH`. ⚠️ Told the owner: the popup **no longer says how XP is earned** (multiplayer matches) —
  owner's call.
- **Free-route line hidden for citizens** — owner, *"do it"*, after an earned citizen saw "Получите бесплатно за 100 XP"
  right above "Вы уже гражданин.": not drawn for the `citizen` and `citizen_buy` offers; still drawn for `checking`,
  `guest`, `read_failed`, `no_product` and `buy`.
- **Owner-pinned wording superseded:** `0408`'s `paid_only_title` (ru) and `benefit_no_ads` pins in
  `tests/client/CitizenshipExplainerLang.test.ts` now carry `0421`'s text. ⚠️ The brief missed the `benefit_no_ads`
  pin; the coder updated it and told the owner.
- Tests: removed keys out of the required list; new pins for the approved text; "removed keys are gone" checks; in
  `tests/client/CitizenshipExplainerModal.test.ts`, a per-state check that the removed lines are absent and a per-state
  check of where the free-route line shows (8 cases).

## Outcome

- **Final local checks (2026-10-09):** `tsc` exit 0; `npm run lint` exit 0; `npm test` (1 worker) **215 / 215 suites,
  4,386 / 4,386 tests, green on the first run**. An earlier full run had one `supertest` timeout in
  `AlertRoutes.test.ts` (the known flake, no `SIGSEGV`); the file re-ran 94 / 94.
- **Local phone-size look (information only — no size target):** popup forced open, local client, no game server,
  Yandex SDK not loaded, private-lobby line shown, ⛔ Buy never tapped. On the Yandex template
  (`yandex-games_iframe.html`, served locally) at 390 × 844 and 360 × 640, ru and en, non-citizen Buy and earned
  citizen's Buy: **no scroll, Buy and Close visible** in all 8 shots, re-taken after the last text change.
- **Live, from the open checklist `0420`'s worklog (2026-10-09, owner on a real phone inside Yandex Games, `0.0.161`):**
  non-citizen — Buy visible without scrolling, text as approved (the private-lobby line correctly absent for a
  non-tester); landscape works but Buy and Close need a scroll there, accepted by the owner. ⚠️ The **earned-citizen**
  live checks are **blocked** — there is no working earned test account since the 2026-10-08 id incident (`0424`,
  backlog; `0425` would provide one). `0420` is still open.
- **Not checked:** the earned-account popup live; anything beyond what `0420` records.

## Related

- [[tasks/citizenship-explainer-popup]] — task `0301`, the popup
- [[tasks/citizenship-explainer-popup-live]] — task `0401`, its first live check
- [[tasks/explainer-paid-only-subheading]] — task `0408`, whose pinned ru sub-heading and ad-free line this supersedes
- [[tasks/explainer-buy-for-earned-citizens]] — task `0409`, the `citizen_buy` case kept working here
- [[tasks/explainer-popup-wider]] — task `0417`, the width this builds on
- [[systems/localization]] — the en/ru sync rule applied to every owner change
- [[decisions/cancelled-tasks]] — `0422`, this task's first verify task, folded into `0420`
- [[decisions/sprint-7]] — the board (rank 64)
- [[decisions/sprint-8]] — `0420` item 8, the live check
