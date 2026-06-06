---
name: update-announcements
description: Draft a new player-facing entry for resources/announcements.json from all commits since the last announcement update. Reads commit subjects + descriptions (not diffs), filters out non-player-facing churn, clusters related commits into one-sentence bilingual bullets (en + ru), shows the draft for approval, then prepends it. Use before releasing a game update.
user-invocable: true
---

# Update Announcements

Prepare the in-game announcement for the next release. This skill scans everything that changed
since the last announcement, distills it into a short, high-signal, player-facing entry in both
English and Russian, and — **only after you approve it** — prepends it to
`resources/announcements.json`.

Optional argument: `$ARGUMENTS`. Supports overrides like `since=<commit|tag|date>` (override the
window start) and `date=YYYY-MM-DD` (override the entry's display date). If empty, sensible
defaults are used (see below).

---

## Non-negotiable rules (from `resources/announcements.schema.md`)

- The file is a JSON array, **newest-first**. New entry goes at the **top**.
- Each entry needs: `id`, `date`, `title.{en,ru}`, `body.{en,ru}`, `tag`.
- `id` is the unread-tracking key. It must be **unique and never reused**. A new top entry with a
  **new `id`** is the *only* thing that re-triggers the unread badge for players.
- `date` format: `YYYY-MM-DD`.
- `tag` must be one of: `new`, `upcoming`, `update`. Routine release roundups use `update`.
- **Plain text only** — no Markdown, no HTML. Bullets are literal `"- "` lines joined with `\n`.
- `en` is mandatory (it's the fallback). We always author `ru` too — this game is bilingual.
- **Never edit or reuse the `id` of an entry that already shipped.**

---

## Procedure

### Step 1 — Determine the window start

Default: the last commit that touched the announcements file (= "changes not yet announced").

```bash
git log -1 --format=%H -- resources/announcements.json
```

If `$ARGUMENTS` contains `since=<ref>`, use that ref instead. Call the resolved boundary `START`.

### Step 2 — Collect the changes (subjects + descriptions, NOT diffs)

Reading full file diffs is wasteful and noisy — work from commit messages and PR/branch names.

```bash
# Feature commits with their bodies
git log START..HEAD --no-merges --format='%h%x09%s%n%b%n----'
# Merge commits — their subject carries the PR branch name, which names the feature
git log START..HEAD --merges --format='%h%x09%s'
```

Branch names in merge subjects (e.g. `Merge pull request #103 from flashist/claude-s4c-disable-compact-public-maps`)
are strong signals. For each candidate change, if a matching brief exists in
`ai-agents/tasks/done/` (e.g. `s4c-disable-compact-public-maps.md`), read its summary and use it
for accurate, player-readable wording.

### Step 3 — Filter to player-facing only

Most commits in this repo are **not** announcement-worthy. Be aggressive.

**Exclude** (these are noise):
- Wiki / docs: `Codex: wiki *`, `*wiki sync/lint*`, anything touching only `karpathy-vault/` or `ai-agents/`
- Task/sprint bookkeeping: `Tasks update`, `sprints update`, brief moves
- Process: `review changes`, `review fix`, formatting, lint, CI, dependency bumps
- Internal-only: telemetry/observability plumbing, infra, refactors, server memory/perf fixes with
  no visible player effect, test-only changes

**Include** (player would notice or care):
- New or changed game features, modes, maps, UI
- Player-facing bug fixes (crashes, broken buttons, wrong behavior in matches)
- Things that affect motivation, retention, or feature discovery

When in doubt, follow the guide's principle: **fewer, higher-signal announcements beat many
low-value ones.** Collapse all minor/internal-but-noticeable fixes into a single trailing
`- Bugfixes.` (en) / `- Багфиксы.` (ru) line — only if such fixes actually occurred.

### Step 4 — Cluster into one-sentence bullets

Group related commits into a single bullet each (~one sentence), phrased for players, not engineers.
Example: three commits about compact maps → one bullet "Compact maps are no longer in public
matchmaking." Don't list commit hashes or internal task names.

### Step 5 — Draft the entry (en + ru)

Defaults (override from `$ARGUMENTS` or at approval):
- `date` = today (the release date). `id` = `<date>-game-update`. If that `id` already exists
  (same-day re-run), append `-2`, `-3`, … so it stays unique.
- `tag` = `update`; `title.en` = "Game update"; `title.ru` = "Обновление игры".
- Use `new` for a single headline feature, `upcoming` for a teaser — only if it clearly fits.

Match the tone of existing entries (read the current `resources/announcements.json` first):
- **en**: concise, friendly, present tense. Each line a `"- "` bullet. A short lead sentence before
  the bullets is optional (some entries use one).
- **ru**: natural, fluent Russian mirroring the en meaning — **not** a literal word-for-word
  translation. Reuse established phrasings from prior entries (e.g. "Багфиксы.", "уже доступно",
  "в публичную ротацию").

### Step 6 — Show the draft for approval (do NOT write yet)

This copy ships to **every player**, so confirm before writing. Present:
1. The proposed JSON entry (full, both languages).
2. A short rationale: which changes were included, which were filtered out, and how they clustered.

Then **stop and wait** for Mark to approve or edit. He refines the `ru` wording here. Do not write
the file until he confirms.

### Step 7 — On approval, prepend to the file

Insert the approved entry as the first array element in `resources/announcements.json`, preserving
the existing 2-space indentation and formatting. Re-read the file immediately before editing (its
top entry may have changed), and insert right after the opening `[`.

### Step 8 — Post-write reminders (state these to Mark)

- **Not published yet.** The JSON is bundled into the client build — players see it only after a
  **client deploy**. (Deploys default to a low-traffic weekend window.)
- The new top `id` is what will light up the unread badge for returning players.
- **Nothing is committed** — per project workflow, do not commit unless Mark explicitly asks.
- If the list is getting long, mention it — the system is a short bulletin, not an archive — but
  let Mark decide whether to trim the oldest entries. Don't auto-delete.

---

## Do not

- Do not read or summarize file diffs — work from commit messages, PR/branch names, and matching
  `ai-agents/tasks/done/` briefs.
- Do not touch `resources/lang/*.json` — announcement content is self-contained inline `en`/`ru`;
  the surrounding UI strings are separate and already handled.
- Do not write the entry before approval, reuse an old `id`, use Markdown/HTML in the body, or
  invent a `tag` outside `new` / `upcoming` / `update`.
- Do not commit or deploy.

---

## References

- `resources/announcements.json` — source of truth (read it before drafting, to match tone)
- `resources/announcements.schema.md` — authoring rules and field contract
- `ai-agents/knowledge-base/announcements-system-guide.md` — full system guide, good/bad-use checklist
- `karpathy-vault/wiki/features/announcements.md` — feature overview and gotchas
- `ai-agents/tasks/done/` — completed briefs for player-readable wording of shipped changes
