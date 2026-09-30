# Name-change moderation without copy-and-paste — approve or reject a request in one step

## ID
0350

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**Filed 2026-09-29 by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER REQUEST given live
in the `fkit lead` session on 2026-09-29, relayed by `fkit-lead`.** ⛔ Not producer precedent. The owner's words,
verbatim:

> *"I also think that we need to improve the way the moderation happens: ideally it should be done in the
> interactive questions mode or the telegram messages should have 2 buttons/links that I can click to
> approve/reject. It also can be a part of the terminal commands, that I can run (either from my local computer or
> from the profile server). No need to overcomplicate the solution, the point is to avoid the copy-n-paste solution
> that we have right now. Put the task to the backlog."*

**Today's flow** (runbook: `ai-agents/knowledge-base/name-change-digest-runbook.md`):
- Each new request sends a Telegram message with **two ready-to-paste lines**, Approve and Reject
  ([`0312`](../../done/0312-name-change-a-working-documented-operator-decide-command-approve-and-reject/brief.md);
  `NameChangeRepository.ts` ~`876-935`, `decideNameChange.ts`, `NameChangeDecideCommand.ts`). The owner SSHes to the
  profile box, then pastes one line; it runs `name-change:decide` inside the `profile-api` container.
- The daily digest's **list** message
  ([`0283`](../../done/0283-daily-digest-of-pending-name-change-reviews/brief.md) /
  [`0315`](../../done/0315-name-change-daily-digest-lists-the-pending-requests-not-just-the-count/brief.md);
  `NameChangeDigest.ts`, up to 20 requests) shows ids and names but **no** Approve/Reject lines — **an owner ruling**
  (runbook § *The second message: the list*). A request that never got its own message
  ([`0313`](../../done/0313-name-change-a-new-request-after-a-decision-or-withdraw-must-reach-the-operator/brief.md)'s
  10-minute limit) appears **only** there.
- **What went wrong on 2026-09-29 (relayed by the lead):** the owner had to hand-build 4 Approve lines from the list;
  Cyrillic names had to be typed as `\uXXXX` codes for `expectedName`.

**No existing brief covers this.** Checked 2026-09-29: no open brief under `tasks/backlog/` names the decide command
or moderation UX (the three `moderation` hits are citizenship briefs about other things). The closed tasks above are
what this one builds on.

## The three shapes the owner named — NOT chosen (owner's call)

> ✅ **2026-09-29 — A1 chosen by owner ruling Q3** (see *Notes*). B and C not chosen; A2 and a laptop wrapper are later additions, not v1. The table below is kept as written.

| | Shape | What it would change |
|---|---|---|
| **A** | **Interactive questions** — go through the waiting requests one at a time and answer approve / reject / skip. ⚠️ Ambiguous: this could mean (A1) a **terminal command** on the profile box that asks per request, or (A2) **Claude** asking via its question popup (`AskUserQuestion`) and then running the decision for the owner. | A1: one new command, no new network surface. A2: A1 plus a Claude skill that drives it over SSH. |
| **B** | **Telegram buttons or links** — each request message carries Approve / Reject you tap. | New inbound path into the profile box (today it only **sends** to Telegram). |
| **C** | **A terminal command** runnable from the owner's laptop or on the box — e.g. `approve <id>` without typing the name. | Laptop: must go over SSH to the box (see constraints). On the box: close to A1. |

## Constraints found (each must hold whatever shape is picked)

- **The internal token is never typed, printed, or sent** — not in Telegram, not in a link, not on a laptop. Today the
  command reads it from the container's own environment; keep that.
- **Keep the `expectedName` safety check** (owner ruling `0067` option A): a decision is bound to the exact name the
  owner saw, so a name changed in between cannot be approved by mistake. A new shape may fill it in **for** the
  owner (read from the database at the moment of asking) — it must not drop it.
- **`/internal/` is reachable only from the game and monitoring boxes** (nginx allowlist,
  [`0276`](../../done/0276-profile-internal-path-case-variants-bypass-nginx-allowlist/brief.md)). A laptop command
  must run **on the box over SSH**, not call the route from the laptop; do not widen the allowlist.
- **Telegram buttons (B)** need the bot to *receive* the tap. Either (i) a **webhook**: a new public HTTPS route on
  the box, reachable from Telegram, checking Telegram's secret header — a new internet-facing surface; or (ii)
  **polling** Telegram from the box (outbound only, no new route) — but only one poller per bot, so check nothing
  else (e.g. the alert bot) already reads updates for the same bot. Either way, the tap must be accepted **only from
  the owner's own Telegram account**.
- **Links (B)** — a plain link that approves on open is unsafe: Telegram **opens links by itself to build previews**,
  which could approve a request nobody tapped, and a leaked link would approve too. A link would need a single-use,
  expiring token **and** a confirm step after opening.
- **The digest list's "no Approve/Reject lines" rule is an owner ruling.** Any shape that adds actions to the list
  message changes that ruling — the owner decides it explicitly; do not change it quietly.
- **No secrets in any artifact** — no host names, tokens, chat ids or bot tokens in the brief, report, runbook or code
  comments.
- Deploy: a profile-box change → weekend deploy slot (owner ruling 2026-09-29); proof needs the deploy, so the owner's
  build-vs-verify rule applies (close the build, verify task at the top of the next sprint).

## What to build

**Step 0 — the owner picks the shape** (open question below). Then, for the picked shape only:
- The owner can decide **every** waiting request — including ones only in the digest list — **without copying,
  pasting or typing a name or an id**.
- The existing `name-change:decide` command and its route stay the single place a decision is made; the new shape
  calls it, it does not duplicate it.
- Update the runbook's *Deciding a request* section to the new way; keep the old paste lines working until the new
  way is proven.
- Keep it small — the owner: *"No need to overcomplicate the solution."*

## Verification steps

1. With 3+ waiting requests, including one with a Cyrillic name and one with a hidden character, the owner decides
   all of them through the new shape with no copy-paste and no hand-typed `\uXXXX`.
2. A request whose name changed after it was shown is **refused** (the `expectedName` check still bites).
3. The internal token appears nowhere the owner sees or types (terminal output, Telegram, link).
4. Shape B only: a tap from any other Telegram account is refused; opening a link without the confirm step changes
   nothing.
5. Tests cover the new command / handler; `npm test` and `npm run lint` pass; the shell harnesses still pass if
   `setup-profile.sh` is touched.

## Notes

- **Depends on: nothing.**
- **Blocks:** nothing.
- ⚠️ **Open owner question (Step 0) — plain words.** Today you SSH to the profile box and paste a long line per
  request; for requests only in the daily list you build that line by hand. Which should replace it?
  - **A1 — one command on the profile box that walks you through the waiting requests** and asks approve / reject /
    skip for each (**producer's recommendation**: smallest, no new way into the box, fills in the exact name for you;
    and it can later be driven by Claude's question popup — A2 — or wrapped by a one-word laptop command over SSH —
    C — without redoing it).
  - **B — Approve / Reject buttons in Telegram:** most convenient on a phone, but it opens a new way into the profile
    box and needs the most care (owner-only taps, the preview-bot trap for links).
  - **C — a short command, e.g. `approve <id>`:** simple, but you still need the id from the message.
  - *Explain more, then ask again.*
- ✅ **ANSWERED 2026-09-29 — Step 0 is settled: shape A1.** OWNER RULING given live 2026-09-29 in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. **Q3** (moderation shape) → **"One interactive command (Recommended)"** — *"Run one command on the profile box. It shows each waiting request and asks approve / reject / skip, and fills in the exact name for you. Smallest and safest. Later it can run from a one-word laptop command, or through Claude's question popup."* **What that means for scope:** v1 is **A1 only** — one interactive command on the profile box. **Not chosen:** B (Telegram buttons / links) and C (a per-id command such as `approve <id>`). **Later additions, NOT v1:** the one-word laptop wrapper over SSH, and Claude's question popup driving it (A2). The open question above and the *"NOT chosen"* heading of the shapes table are kept as written. `## Sprint` / `## Priority` / `## Status` unchanged (still on the Backlog board, unscheduled).
