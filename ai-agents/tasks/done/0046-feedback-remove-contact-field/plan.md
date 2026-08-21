# Approved Plan — 0046 Feedback Popup: Remove Email/Contact Field (152-ФЗ)

> Approved by the owner via AskUserQuestion in the fkit-lead session, 2026-08-14, during a
> `/fkit-sprint-ship-loop` run. Owner rulings at the gate: (1) plan approved including the two
> recommendations — already-delivered contact values in Telegram/webhook history stay with the
> 152-ФЗ compliance track (not this task), and the dead input CSS cleanup is in scope; (2) test
> coverage **accepted as planned** — no Master.ts handler extraction; verification via
> tsc + lint + full suite + grep + post-deploy live check.
> Plan body below is the coder plan-worker's returned text, copied verbatim by the driver.

# Implementation Plan — 0046: Feedback Popup, Remove Email/Contact Field (152-ФЗ)

## Grounding (verified against current working tree, 2026-08-14)
- Client field lives entirely inside the Lit component `src/client/FeedbackModal.ts` (shadow DOM) —
  the two HTML templates contain only the `<feedback-modal>` tag (index.html:311,
  yandex-games_iframe.html:442), so NO template edits are needed; the both-templates rule is
  satisfied by a no-op.
- Server: `src/server/Master.ts` — `FeedbackSchema` line 203, webhook embed line 254, Telegram line
  284, `JSON.stringify(d)` fallback line 315 logs `parsed.data` (post-strip), as the brief claims.
- Zod is v4 (`package.json`: `"zod": "^4.0.5"`); `z.object` strips unknown keys by default, so
  removing `contact` from the schema silently drops the value from stale clients that still send it.
  Brief's key server claim is CONFIRMED.
- Localization: `contact_placeholder` is the only contact key in the `feedback_modal` block —
  en.json:318, ru.json:322. `stale_build.contact_link` and the "...contact support" error strings
  are unrelated and stay.
- Tests: NO `/api/feedback` server test exists (checked `tests/server/`; only
  `tests/client/StartScreenControls.test.ts` touches feedback, button-visibility only — no contact
  reference). The brief's test step is conditional ("if a test exists") — it does not.

## Steps (sequenced; ~30 min total)

### 1. Client — src/client/FeedbackModal.ts
- Remove `@state() contact = "";` (line 34).
- Remove both `this.contact = "";` resets (lines 193 in show(), 212 in hide()).
- Remove `contact: this.contact || undefined,` from the payload (line 297).
- Remove the contact `<input>` render block (lines 367–376).
- CSS cleanup (part of full removal — the component then has no <input> at all): delete the
  `input[type="text"]` rule (lines 139–150) and the `input::placeholder` selector from the shared
  placeholder rule (lines 134–137, keep `textarea::placeholder`).
- Grep the file for `contact` afterward — must be zero hits.

### 2. Server — src/server/Master.ts
- Remove `contact: z.string().max(200).optional(),` from FeedbackSchema (line 203).
- Remove the `{ name: "Contact", ... }` field from the webhook embed (line 254).
- Line 284 Telegram: remove only the Contact half — becomes
  `` `<b>Match:</b> ${d.matchId ? esc(d.matchId) : "n/a"}` `` (Match stays).
- No change to the log fallback (line 315) — it logs parsed data, contact is stripped by the schema.

### 3. Localization — both files in sync
- Remove `"contact_placeholder"` from the `feedback_modal` block in BOTH
  resources/lang/en.json (line 318) and resources/lang/ru.json (line 322).
- Do NOT touch `stale_build.contact_link`, `contact_admin`, or "contact support" error strings.
- Other language files (de/fr/...): untouched per project rule (only en+ru maintained). Stale
  `contact_placeholder` keys left in them are dead — nothing references the key.

### 4. Verify
- `npx tsc --noEmit` (or the project's typecheck path), `npm run lint`, `npm test` (full suite —
  confirms no regression; StartScreenControls.test.ts unaffected).
- Grep repo for `contact_placeholder` and `d.contact` — zero hits expected.
- No new test added (decision, flagged below).

## Edge cases accounted for
- Stale cached clients still POSTing `contact`: value stripped at Zod parse, never forwarded,
  never logged — verified against Zod v4 default strip behavior and the line-315 fallback.
- StaleBuildModal reuses FeedbackModal → loses the field too. Expected per brief.
- Analytics: FEEDBACK_SUBMITTED/OPENED untouched; no new event (brief explicitly says none).
- No src/core changes → no desync surface, mandatory-core-test rule not triggered.
- "Already-stored values": feedback is fire-and-forward (webhook/Telegram), nothing is stored in
  our DBs — no server-side purge needed. Historical Telegram/webhook messages containing contacts
  live in those channels; out of code scope (owner-ruled: stays with the 152-ФЗ compliance track).

## Live verification (post-deploy, owner/driver-side per brief)
UI shows no contact input on start/battle/stale-build; a test submission delivers to Telegram with
no Contact line; FEEDBACK_SUBMITTED still fires; optionally a curl with a `contact` key still
returns ok with the value dropped.

## Follow-up (not this task's code)
Wiki page `ai-agents/wiki-vault/wiki/features/feedback-button.md` mentions the contact field
(lines 14, 27) — needs a post-close fkit-wiki ingest to update. Coder must not write the vault.
