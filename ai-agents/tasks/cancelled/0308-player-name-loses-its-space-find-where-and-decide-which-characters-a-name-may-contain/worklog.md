# Worklog — Task 0308: player name loses its space

Written 2026-10-01 by a spawned `@fkit-coder`, caller `fkit-lead` (live session). Scope: record the
plan's **Step 0** result and the owner's ruling. Investigation only — **no source, no tests, nothing
committed.** `HEAD` at time of writing: `05c3cfa`.

**Privacy rule:** the real name appears nowhere here. Shapes only — a letter or digit prints as `L`,
every other character as `U+XXXX` (plan Step 0 snippet).

---

## Step 0 — method

- **First tried: the browser-extension route** (owner ruling Q0, *"Drive my Chrome"*). **Blocked**:
  the tool could not reach the owner's tab (no Claude tab group), and it cannot reach the
  cross-origin game iframe from the top frame anyway.
- **Then: the owner ran the plan's Step 0 snippet in DevTools**, console context set to the game
  iframe, on the **main account**, logged in, on Yandex Games — 2026-10-01 14:16.

## Step 0 — output (verbatim)

```
yandex: 13 L L L L U+0020 L L L L L L L L
stored: L L L L U+0020 L L L L L L L L U+0020 L L L L L L
```

## Reading

- **Yandex `getName()` returns a plain `U+0020` (ordinary space) between the two words.** No
  invisible or unusual separator (no `U+200B` / `U+2060` / `U+FEFF` etc.).
- `stored` is the account's **approved** name (it has three words; the Yandex name has two — they
  are different strings). Owner screenshots, 2026-10-01, show it **with its spaces** on the
  citizenship card and above the territory in a match.
- **Plan Step 1 branch:** the third branch — a plain `U+0020`. Its precondition *"yet the card shows
  no space"* does **not** hold on this account: the spaces do show. So the "lost space" is
  **not reproduced** on this account.
- Code check, consistent with that: the in-match cleaner `sanitize()` keeps whitespace (`\s` is in
  its allow-list), so a `U+0020` survives it.
- **Most likely origin of the original report:** a different account whose Yandex name has no space.
  **Not checked** — the owner declined checking the second account. This is a guess, not a finding.
- Plan Step 0 item 3 (per-screen "does a space show" table) was **not done in full**: only the card
  and the in-match label were seen (via the owner's screenshots). The name input and the Yandex
  profile page were not checked.

## Owner ruling — 2026-10-01

Live via `AskUserQuestion`, relayed by `fkit-lead`: **"Cancel it, file hyphen task (Recommended)"**.

- **0308 is to be cancelled** by the producer as *not reproduced*. (This worklog does not move or
  close anything — the move is producer-only via `/fkit-task-cancelled`.)
- **A separate small backlog task is to be filed** for the in-match cleaner `sanitize()`, which
  deletes `-` and `'` (e.g. a hyphenated nation/bot name shows as `MortiStele`). Refs checked
  against current code (`HEAD` `05c3cfa`):
  - `sanitize()` — `src/core/Util.ts:173` (body `:173–177`). The regex allow-list is letters,
    digits, whitespace, emoji, `[`, `]`, `_`; everything else, including `-` and `'`, is removed.
  - Callers — `src/core/GameRunner.ts:62` and `:63` (human players: own name, and others' names
    via `fixProfaneUsername`), `src/core/GameRunner.ts:73` (AI players). Imported at
    `src/core/GameRunner.ts:36`.
  - Note: the earlier refs (`Util.ts ~:172–176`, `GameRunner.ts ~:53/:64`) were off by a few
    lines and missed the AI-player call at `:73`.

## Decision log

none (investigation only — no fix applied, no obvious-winner call made).
