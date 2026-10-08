# Review — 0412

Task: ai-agents/tasks/done/0412-start-screen-private-tab-with-restyled-private-lobby-buttons/brief.md
File(s) under review: src/client/StartScreenTabs.ts, src/client/StartScreenTabStorage.ts, src/client/PrivateLobbyAccess.ts, src/client/yandex-games_iframe.html, src/client/index.html, src/client/flashist/FlashistFacade.ts (`uiElementIds.privateTab` only), resources/lang/en.json + ru.json (`main.tab_private`, `main.create_lobby_subtitle`, `main.join_lobby_subtitle` only), ai-agents/knowledge-base/analytics-event-reference.md (`UI:Tap:PrivateTab` row only), tests/client/StartScreenTabs.test.ts, StartScreenTabStorage.test.ts, PrivateLobbyAccess.test.ts, PrivateLobbyLang.test.ts
Status: closed-out
Coverage: reasoning-only second opinion — Round 1: Codex (`codex-cli 0.157.1`, exit 0) returned an explicit "no significant issues found in Task 0412 scope" after reading the diff and related files; its attempts to run jest failed on sandbox EPERM before any test ran, so it measured nothing. Execution evidence is the reviewer's: the four 0412 suites run (91/91 pass) and a headless-Chromium fit replica of the tab strip.

## Reviewer findings
| #  | Round | Sev | Location | Claim |
|----|-------|-----|----------|-------|
| R1 | 1 | low | src/client/PrivateLobbyAccess.ts:89 | The Private-tab hand-off is duck-typed: `document.querySelector("start-screen-tabs") as (Element & { enablePrivateTab?: () => void })` then `tabs?.enablePrivateTab?.()`. A future rename or signature change of `StartScreenTabs.enablePrivateTab` (StartScreenTabs.ts:67) passes `tsc` (optional member on a loose type) and passes every test (PrivateLobbyAccess.test.ts `mountPage()` stubs the method by name; StartScreenTabs.test.ts calls the new name directly), and fails silently at runtime: the row is revealed inside a `#private-tab-content` that no tab can ever show, so Create/Join become unreachable for every flag-on player with no warning. Latent, not wrong today. Direction: type the lookup against the real class (e.g. `import type { StartScreenTabs }` + a typed cast or an `HTMLElementTagNameMap` entry, dropping the `?.` on the method) so a rename is a compile error; the null-element fail-closed path can stay. |

## Coder response
| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R1 | CORRECT | Defect (latent; severity low — nothing broken today, but a coherent rename would silently hide Create/Join from every flag-on player) | Added `import type { StartScreenTabs } from "./StartScreenTabs"` to `src/client/PrivateLobbyAccess.ts` and cast the `querySelector("start-screen-tabs")` result to `StartScreenTabs \| null`. Kept `tabs?.enablePrivateTab?.()` unchanged, so runtime behaviour (missing / not-yet-upgraded element ⇒ no tab, fails closed, plan §4) is identical; dropping the method's `?.` as suggested would turn the not-yet-upgraded case into a caught throw, so it was not done. Type-only import is erased: no runtime import cycle. Proven: a temporary rename of the method made `npx tsc --noEmit` fail with TS2339 at `PrivateLobbyAccess.ts(95,13)`; restored byte-identically. Then tsc exit 0, lint exit 0, `PrivateLobbyAccess` + `StartScreenTabs` suites 67/67 pass. | ✅ done |

## Accepted residuals (shared, do-not-re-litigate)
