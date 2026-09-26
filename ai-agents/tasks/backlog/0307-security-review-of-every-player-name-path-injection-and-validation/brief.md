# Security review of every player-name path — can a name inject code (SQL, HTML, Telegram, shell, logs)?

## ID
0307

## Sprint
Sprint 6

## Priority
1

**Board rank on [Sprint 6](../../../sprints/plan-sprint-6.md), OWNER-RULED 2026-09-26** — an OWNER RULING given live in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021; ADR-037 §3); ⛔ not producer precedent. Full record: the *RE-RANK 2026-09-26* addendum on the Sprint 6 board. Owner, Q1: *"Top of Sprint 6 (Recommended)"*. ~~22~~ was the append rank until then.

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**Filed 2026-09-26 by a spawned `fkit-producer` with no owner channel (ADR-021), on an owner request made
in the `fkit lead` session on 2026-09-26 (voice-dictated) and relayed by `fkit-lead`.** The owner asked
for the work and for Sprint 6, and called it *"important"*. ⚠️ They did **not** rule the rank, or the
split of their request into two briefs (this one and `0308`). ⛔ Not producer precedent.

**The owner's words, verbatim:**
> *"I'm also a bit afraid of injections like I have a question to you is it possible that somebody can
> inject a code into our database or something like that via their request of changing their name. Or
> when the name is approved. I think this task requires also additional separate brief and it should be
> added to the sprint 6 because it's important."*

**Why now.** Citizenship went live on 2026-09-26 (`3386b90`, `CITIZENSHIP_CARD_ENABLED: true`). The
name-change request (`0067`) is therefore a **live, player-typed input** that reaches our database, the
operator's Telegram, a shell command the operator pastes, and (once approved) other screens. It has been
reviewed as a feature (`0067`'s stateful review), never as a dedicated security pass over **every** path
a name travels.

**The sibling task.** `0308` (the space vanishing from the owner's name) may **change which characters a
name may contain**. That decision is coupled to this review — see *"The one rule holding several doors
shut"* below.

### Producer's first read of the code — 2026-09-26, working tree on `dev` at `5b3e6ec`. A LEAD, not a review.

Line numbers are in that frame; re-anchor on the code, not the number.

- **SQL.** A grep of `src/profile-server/` and `src/server/` found **no** query built by pasting text into
  the SQL string; the name-change queries seen use placeholders (`$1`, `$2`) —
  `src/profile-server/NameChangeRepository.ts` (the `NAME_TAKEN_SQL`, `INSERT_REQUEST_SQL` and approve
  statements). ⚠️ A grep is not a proof: every query on every name path must be read.
- **Server-side check of a requested name.** `NameChangeRepository.requestNameChange` trims, then runs
  the shared rule `checkUsernameRules` (`src/core/validations/usernameRules.ts`): length 3–27, and only
  letters, digits, `_`, `[`, `]` and **whitespace** (`/^[\p{L}\p{N}_[\]\s]+$/u`). So `'`, `"`, `<`, `>`,
  `;`, `-` are already refused **on the server**, not just in the browser. Gaps worth judging:
  - `\s` is wider than "space": it admits **tab, newline, carriage return, no-break space, U+2028/2029
    line separators, U+3000, U+FEFF** and other Unicode spaces. A name can be multi-line, or differ from
    another name only by an invisible character — which also defeats the uniqueness check
    (`lower(display_name) = lower($1)`) and cannot be seen by the operator in Telegram.
  - **No Unicode normalization and no confusable check** — Latin `a` vs Cyrillic `а` lets a name imitate
    another player (or an "admin"-style name) exactly.
  - **Length is counted in UTF-16 units**, so some letters count as 2.
- **The operator's paste-into-terminal command.** The Telegram notification includes a ready-made
  `curl … -d '<JSON with expectedName>'` command (`NameChangeRepository.decideCommandLines`). The requested
  name sits **inside single shell quotes**. That is safe **only because the charset refuses `'`**. The
  Telegram text itself is escaped (`escapeTelegramHtml`).
- **Screens.** `src/client/graphics/layers/NameLayer.ts` (≈:265 and ≈:377) writes `player.name()` with
  `innerHTML` — safe today only because `PlayerImpl` runs `sanitizeUsername` on every in-game name. An
  approved `display_name` is shown today only on the citizenship card, through Lit (escapes by default).
  `EventsDisplay` / `ChatDisplay` use `unsafeHTML` behind DOMPurify.
- **The in-game name is a second, wider path — for every player, not just citizens.** The game server's
  join schema `UsernameSchema = SafeString` (`src/core/Schemas.ts` ≈:203–234) allows quotes, `\`, and
  the whole `U+2000–U+3300` block — which contains the **right-to-left override (U+202E)** and zero-width
  characters. Each client then sanitizes it in `PlayerImpl`. The server itself does not narrow it.
- **The open residuals from `0067`** (its brief § *Open residuals*): (a) forged-id offensive submission,
  mitigated by moderation, closes on `0014`; (b) *"the pending, unmoderated name is PUBLICLY READABLE via
  the unauthenticated profile endpoint — UNMITIGATED"*. ⚠️ (b) **may be stale**: since `0273` the
  `GET /v1/profile` route reads the caller from a Bearer session (`src/profile-server/Routes.ts` ≈:636–647).
  Re-verify; do not assume either way.

**Preliminary answer to the owner's question — to be confirmed by this task, not replaced by it:** no
path for a name to reach the database as code was found on a first read; queries use placeholders and
the server refuses quote/angle/semicolon characters. That is a first read, not a review.

## What to build

**Step 1 — Map every path a player name travels.** Both names: the **requested/approved `display_name`**
(citizens, `0067`) and the **in-game username** (every player). For each hop, record what checks it, what
could break it, and what it relies on. Hops at minimum: client input → HTTP route → server validation →
SQL → Telegram (operator notification and daily digest `0283`) → the operator's pasted `curl` →
`/internal/v1/name-change/decide` (auth: `PROFILE_INTERNAL_TOKEN`, the `expectedName` binding) → approve
write → read-back (`GET /v1/profile`, the lookup route) → every screen (Lit, `innerHTML`, canvas,
`unsafeHTML`) → logs (server logger, OTEL — a newline in a name can forge a log line) → analytics.
Write it as a findings report in `ai-agents/knowledge-base/reports/` (no secrets, no hostnames).

**Step 2 — An independent hostile pass.** Spawn `fkit-adversarial-reviewer` scoped to the name paths from
step 1 (existing code, not a diff), with this brief's hostile-input list as its focus. Record its
findings in the report next to yours, deduplicated.

**Step 3 — Fix what is a defect; file what is not in scope.** Each finding gets one of: fixed here · filed
as its own brief (route to `fkit-producer`) · accepted residual (the **owner's** call, recorded with
their words). Likely candidates, **to be decided by the evidence, not assumed**:
- Narrow `\s` to a plain space on the name paths (and probably refuse leading/trailing and repeated
  spaces). ⚠️ This overlaps `0308` — **agree the rule with `0308` before shipping either**.
- Unicode normalization (NFC/NFKC) before the uniqueness check; a decision on confusables.
- Stop the operator command relying on the charset: build it so any name is safe inside it, or drop
  the name from the shell line.
- Narrow the game server's join `UsernameSchema` for the username field.
- Replace `innerHTML` with `textContent` in `NameLayer` if nothing needs HTML there.

**Step 4 — Tests for hostile inputs** (unit where possible, and the integration suite for the SQL paths),
each on **both** the name-change request and the in-game username where the path exists:
SQL metacharacters (`'`, `"`, `;`, `--`, `' OR 1=1 --`, `\`) · `<script>`, `<img onerror>`, `&lt;`
entities · Telegram HTML (`<b>`, `<a href>`) · shell (`'`, `$(…)`, backticks) · zero-width space/joiner,
U+FEFF · right-to-left override U+202E and isolates · newline, tab, CR, U+2028 · no-break space ·
Latin/Cyrillic look-alikes of an existing name · emoji · combining marks · exactly 27 and 28 characters,
and 27 astral letters · empty and all-space. Each test asserts the **outcome** (refused with which
violation, or stored and rendered as inert text), not just "no crash".

**Step 5 — Review the fixes.** `fkit-reviewer` in stateful mode over the fix diff (its own pass plus the
Codex adversarial second opinion).

**If an error message changes or a new one is added,** update `resources/lang/en.json` **and**
`ru.json` together (the `username.*` / `citizenship_name_change.*` keys).

## Verification steps

1. The findings report exists in `ai-agents/knowledge-base/reports/`, lists **every** hop from step 1,
   and for each says: checked by what, relies on what, verdict. No secret or hostname in it.
2. The adversarial pass ran and its findings are in the report. If Codex was unavailable and it fell
   back to Claude, the report says so **loudly**, at the top.
3. Every finding has a disposition (fixed / filed with a task ID / accepted residual with the owner's
   words). No finding is left without one.
4. The hostile-input tests from step 4 exist and pass; `npm test` is green; the SQL-path cases pass under
   `npm run test:integration`.
5. The `0067` residual (b) is re-stated as either **closed** (with the evidence) or **still open**.
6. The owner's question — *"can somebody inject code into our database via a name change, or when it is
   approved?"* — is answered in plain words in the report's first paragraph, with what was proven and
   what was not.
7. `fkit-reviewer`'s stateful review of the fix diff is closed out.

## Notes

- **Depends on: nothing.** It can start at once.
- **Blocks:** `0308` — softly. Only `0308`'s *character-rule change* waits for step 1's list of the places
  that rely on the rule; `0308`'s investigation does not.
- **The one rule holding several doors shut.** Today `checkUsernameRules` is what keeps `'` out of the
  operator's shell command, `<` out of `innerHTML`, and quotes out of SQL text. It is the only guard on
  the shell line. **If `0308` widens the rule (for example to allow `'`, `-` or `.`), those doors open
  unless this task has already made each path safe on its own.** Do not ship a widening before that.
- **Related:** `0067` (name change, moderation flow, open residuals) · `0283` (daily digest — its text is
  deliberately unescaped because it carries no name; keep it that way) · `0068` (citizen verified icon —
  another place a name is drawn) · `0296` (after-deploy production checks) · `0014` (closes `0067`
  residual (a)) · `0273` (Bearer session on profile routes).
- **Not in scope:** profanity auto-reject (owner-ruled in `0067`: the human moderation step is the gate).
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
