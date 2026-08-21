# Worklog — 0046: Feedback Popup, Remove Email/Contact Field (152-ФЗ)

Build worker spawn under `/fkit-sprint-ship-loop` (declared-approval marker; owner approved the
plan via AskUserQuestion in the lead session, 2026-08-14). Implemented `plan.md`
(blob `e8a27200e79f6a8dc9ee7e966e288cc101382fc9` — hash re-verified before build) exactly as
approved. No commit made (build only).

## Changes

### src/client/FeedbackModal.ts
- Removed `@state() contact = "";`.
- Removed both `this.contact = "";` resets (in `show()` and `hide()`).
- Removed `contact: this.contact || undefined,` from the POST payload.
- Removed the contact `<input type="text">` render block.
- CSS cleanup (in scope per owner ruling): deleted the `input[type="text"]` rule and the
  `input::placeholder` selector (kept `textarea::placeholder`). Component now contains no `<input>`.
- Post-edit grep for `contact` in the file: **zero hits**.

### src/server/Master.ts
- Removed `contact: z.string().max(200).optional(),` from `FeedbackSchema` — Zod v4 `z.object`
  strips unknown keys by default, so stale clients still sending `contact` have the value silently
  dropped at parse.
- Removed the `{ name: "Contact", ... }` field from the webhook embed.
- Telegram line: removed only the Contact half — now
  `` `<b>Match:</b> ${d.matchId ? esc(d.matchId) : "n/a"}` `` (Match kept).
- Log fallback untouched (logs `parsed.data`, post-strip — as planned).

### resources/lang/en.json + ru.json (kept in sync)
- Removed `"contact_placeholder"` from the `feedback_modal` block in both files.
- `stale_build.contact_link`, `contact_admin`, and "contact support" error strings untouched.
- Other language files untouched per project rule (stale keys there are dead — nothing references
  the key).

### HTML templates
- No edits needed: both `index.html` and `yandex-games_iframe.html` contain only the
  `<feedback-modal>` tag; the field lived entirely in the Lit component's shadow DOM. The
  both-templates rule is satisfied by a verified no-op.

## Verification evidence (all run 2026-08-14 on this working tree)

| Check | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | exit 0 |
| Lint | `npm run lint` | exit 0 |
| Full test suite | `npm test` | **87 suites / 691 tests passed**, 0 failed, exit 0 |
| JSON validity | `node -e "JSON.parse(...)"` on en.json + ru.json | both valid |
| Grep `contact` in FeedbackModal.ts | `grep -in contact` | zero hits |
| Grep `d.contact` / `contact:` in Master.ts | `grep -n` | zero hits |
| Grep `contact_placeholder` in src/ + en/ru json | `grep -rn` | zero hits |

- No new test added — per the owner's gate ruling ("test coverage accepted as planned — no
  Master.ts handler extraction"). No `/api/feedback` server test existed before this change either.
- No `src/core/` changes → mandatory-core-test rule not triggered; no desync surface.
- Live verification (UI on start/battle/stale-build, Telegram delivery without Contact line,
  FEEDBACK_SUBMITTED analytics, optional curl with a `contact` key) is post-deploy,
  owner/driver-side per the plan — **not performed here**.

## Change surface
Exactly four files: `src/client/FeedbackModal.ts`, `src/server/Master.ts`,
`resources/lang/en.json`, `resources/lang/ru.json` — pure removals plus the two prescribed line
rewrites. Pre-existing unrelated working-tree changes (0019 payments, 0049, sprint plans, etc.)
untouched.

## Decision log (fixes applied without asking / obvious-winner calls)
none — every edit was a prescribed step of the approved plan; no judgment calls arose.

## Residuals / follow-ups (not this task's code)
- Wiki page `ai-agents/wiki-vault/wiki/features/feedback-button.md` still mentions the contact
  field — needs a post-close fkit-wiki ingest (coder must not write the vault).
- Historical contact values already delivered to Telegram/webhook history: owner-ruled to the
  152-ФЗ compliance track, not this task.
- Stale `contact_placeholder` keys remain in non-en/ru language files — dead, unreferenced,
  intentionally left per project localization rule.
