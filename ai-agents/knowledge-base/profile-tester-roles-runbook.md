# Tester roles on the profile box — runbook (task `0425`)

> ⛔ **READ THIS FIRST.**
>
> - **Every `apply` and `restore` on the live box is a PRODUCTION WRITE.** Each run needs the owner's
>   OK in-session. Agents may run `show` (read-only) only with the owner's OK too.
> - **SSH-only.** The command runs inside the `profile-api` container on the profile box. There is no
>   HTTP route and no endpoint for it; nothing outside an SSH session can reach it.
> - **Fixed roles only.** A role is a fixed set of values in the code
>   (`src/profile-server/TesterRoles.ts`). The command takes a tester id and a role id, never a value.
>   Adding or changing a role is a code change plus review.
> - **One tester list, kept by hand on the box.** Every subcommand, `show` included, refuses a player
>   who is not on it.
> - **Honest limit:** the list protects against **mistakes** (a wrong id, an agent-driven run aimed at
>   a real player). Anyone with root on the box can edit the list or run `psql` directly. It does
>   **not** protect against root.
> - **`restore` discards any XP earned while a role was on.**

---

## What it is

| Subcommand | What it does |
|---|---|
| `apply <tester-internal-id> <role-id>` | Writes the role's values onto the tester's `players` row. Before the **first** apply it saves the tester's current values (and their tenure gift row) in the `tester_role_snapshots` table, in the same transaction. A later apply **keeps** that first snapshot. |
| `restore <tester-internal-id>` | Puts the saved values back **exactly** (`updated_at` included), puts the tenure gift row back as it was (or removes one, if there was none), and clears the snapshot. Refuses if no snapshot is held. |
| `show <tester-internal-id>` | Read-only. Role applied, XP, citizen/paid flags and their dates, tenure gift row, snapshot held. Prints **no ids at all**. |

The tester is named by the **internal player id** (a UUID), never a Yandex id. A Yandex id typed by
mistake is refused as "not a UUID" and is never written to the run log.

## The roles

`T` is the citizenship threshold (`CITIZENSHIP_XP_THRESHOLD`, 100 today). Dates marked `now` are the
time of the run.

| Role id | XP | Citizen | Paid | Earned at | Purchased at | Tenure gift row | Matches |
|---|---|---|---|---|---|---|---|
| `non-citizen` | 10 | no | no | cleared | cleared | kept | A player with some matches, not a citizen yet |
| `almost-citizen` | `T − XP_PER_MATCH` (99) | no | no | cleared | cleared | kept | One match short: the next match credit makes them an earned citizen, the normal way |
| `earned-citizen` | `T` (100) | yes | no | `now` | cleared | kept | What the first threshold crossing leaves |
| `paid-citizen` | 10 | yes | yes | cleared | `now` | kept | A buyer who never earned. **Flags only — no purchase record** (no `processed_purchases`, no `purchase_intents` row) |
| `brand-new` | 0 | no | no | cleared | cleared | **deleted** | A fresh player whose tenure gift check has not run yet |

A role never touches: the name, `created_at`, `last_login_at`, `extra`, the Yandex identity rows, the
match-credit ledger, the inbox, the name history, or any purchase table. So:

- `brand-new` is **not** byte-identical to a real new player: name, inbox and credit ledger are kept.
- A citizen made by a role gets **no** "citizenship earned/paid" inbox message: a role does not fire
  the inbox hooks the real paths fire.

## One-time setup

1. **A profile deploy that includes task `0425`** (new image, migration `008`, and the new
   `tester-roles/` mount — `setup-profile.sh` creates the directory 0700 and rewrites the compose
   file). Until then the command does not exist on the box.
2. **Find the tester's internal id.** Recommended way (no shell, no Yandex id, no database read):
   1. On the tester's device, open the game and the browser's developer tools → **Network**.
   2. Find the profile API's `POST /v1/login` request (it runs on every page load). In its
      **response**, find `session.token`. It looks like `v1.<payload>.<signature>`.
   3. Copy **only the middle part** (`<payload>`, between the two dots). On its own it is not a
      credential: without the signature it cannot log anyone in.
      ⛔ **Never copy or paste the whole token anywhere** — the whole token *is* a credential for 24 h.
   4. In the developer tools **Console** of the same page, decode it:
      `JSON.parse(atob("<payload>".replace(/-/g, "+").replace(/_/g, "/"))).pid`
      The printed UUID is the internal player id.

   Why this way: it reads the id of **the exact record this browser logs into right now** — which
   matters since `0424`, when the same Yandex account started reaching a different record. It needs
   no SSH, types no Yandex id into any shell, and reads nothing from the production database.

   *Fallback (not recommended):* a read-only `player_identities` lookup by the tester's Yandex id,
   run by the owner with `psql` on the box after an in-session OK. It types a Yandex id into a shell
   (which the brief wants to avoid), and the Yandex id has to be found in the developer tools anyway.
3. **Create the allowlist on the box** (as root) — **only if it does not exist yet**. To add a
   tester later, just edit the existing file; never re-create it (re-creating it empties it, and the
   command then refuses everything with `allowlist_empty`):

   ```bash
   [ -e /opt/profile/tester-roles/allowlist ] \
     || install -m 600 -o root -g root /dev/null /opt/profile/tester-roles/allowlist
   nano /opt/profile/tester-roles/allowlist
   ```

   Format:
   - UTF-8 text, **one internal player id per line**.
   - Blank lines and lines starting with `#` are ignored. Put comments **on their own line** — an
     id followed by `# note` on the same line counts as a malformed line.
   - Spaces, Windows line endings, a BOM and upper case are all tolerated.
   - **Fail closed:** if the file is missing, unreadable, holds no ids, or has **any** line that is
     not a UUID, **every** subcommand is refused (and the refusal says why, naming a bad line by its
     number only).

   The file survives every redeploy: `setup-profile.sh` creates the directory and never creates,
   writes or overwrites the file (the hardening harness asserts it). In the container it is at
   `/var/lib/profile/tester-roles/allowlist`.
4. **Check with `show`** (read-only, owner's OK) that the id is the right record.

## The commands

Run as root on the profile box. Placeholders only — never paste a real id into a ticket, a chat
message, a report or the repo.

```bash
docker compose -f /opt/profile/docker-compose.yml exec -T \
  -e TESTER_ROLE_OPERATOR="$(logname 2>/dev/null || whoami)" \
  profile-api npm run -s tester-role -- show <tester-internal-id>

docker compose -f /opt/profile/docker-compose.yml exec -T \
  -e TESTER_ROLE_OPERATOR="$(logname 2>/dev/null || whoami)" \
  profile-api npm run -s tester-role -- apply <tester-internal-id> earned-citizen

docker compose -f /opt/profile/docker-compose.yml exec -T \
  -e TESTER_ROLE_OPERATOR="$(logname 2>/dev/null || whoami)" \
  profile-api npm run -s tester-role -- restore <tester-internal-id>
```

`TESTER_ROLE_OPERATOR` is **self-reported** (the container cannot see who is logged in over SSH). If it
is left out, the log records `"unknown"`.

### Exit codes

| Code | Meaning |
|---|---|
| `0` | Done (`applied`, `restored` or `shown`). |
| `1` | Refused — not on the allowlist, allowlist missing/unreadable/empty/malformed, no such player, no snapshot, or a database error. **Nothing was written.** (After a database error, run `show` before retrying: only a failure at the very commit could leave the outcome unknown.) |
| `2` | Bad input — wrong number of arguments, not a UUID, unknown subcommand or unknown role. **Nothing was written.** |
| `3` | The run **succeeded** (an `apply`/`restore` IS committed) but its line could not be appended to the run log. The output says `APPLIED BUT NOT LOGGED` / `RESTORED BUT NOT LOGGED`. Record that run by hand. |

### `show` output

```text
role applied: earned-citizen (applied at 2026-10-09T12:00:00.000Z)   ← or "none"
xp: 100
is_citizen: true
is_paid_citizen: false
citizenship_earned_at: 2026-10-09T12:00:00.000Z                     ← or "null"
citizenship_purchased_at: null
tenure grant: present, xp_awarded=12, granted_at=…                   ← or "absent"
snapshot held: yes, saved_at=…                                       ← or "no"
```

`snapshot held: yes` means a role is applied and `restore` will return to the values from before the
**first** apply.

## The run log

`/opt/profile/tester-roles/runs.log` on the host (0600). One JSON line per run, refusals included:

```json
{"at":"…","operator":"…","subcommand":"apply","role":"earned-citizen","tester":"<uuid>","outcome":"applied","reason":null}
```

- `outcome`: `applied` · `restored` · `shown` · `refused` · `error`.
- `reason` (on a refusal or error): `not_allowlisted`, `allowlist_missing`, `allowlist_unreadable`,
  `allowlist_empty`, `allowlist_malformed`, `unknown_role`, `bad_arguments`, `no_such_player`,
  `no_snapshot`, `db_error`.
- `tester` is logged only if it is a UUID, otherwise `"<not-a-uuid>"`; an unknown role is logged as
  `"<unknown-role>"`. No database URL, no token, no database error text (only `db_error`; the full
  message goes to the terminal).
- **The command refuses to run if it cannot open this log.** It stays on the box; it never goes to
  telemetry, Telegram or the repo.

Read it: `tail -n 20 /opt/profile/tester-roles/runs.log`.

## After a run — what the tester does

- **A full page reload is enough.** The client logs in on every page load, keeps the session only in
  memory, and the profile read is never cached (`Cache-Control: no-store`).
- **Apply between matches, outside a lobby.** The game server takes citizen status when a player
  joins (and only ever turns it **on** during a game), so a change made while in a lobby or match
  shows only from the next one.
- **What the tester sees depends on whether the login is verified** (signed Yandex player data,
  `vfy:true`):
  - verified: the true values — XP, earned date, paid flag;
  - **unverified: any citizen shows XP pinned at 100 and no earned date, and a paid citizen shows as
    a plain citizen** (the unverified view never shows paid state).
- **`brand-new` and the "Спасибо, что вы с нами!" gift popup.** After the role, login answers
  `grantChecks.tenure: "pending"`. The popup then shows only if **all** of these hold:
  1. the citizenship surfaces are switched on for that device (the card's gate);
  2. **that browser's own local play history** reaches the minimum (`TENURE_MIN_DAYS`, 3 days);
  3. the claim is granted with XP > 0.
  The gift **amount comes from that browser's local history** (1 XP per day, capped at 50). The claim
  runs **once per page load**. ⚠️ A browser with fewer than 3 days of history records a final
  0-XP check and shows **no** popup — that uses up the reset; apply `brand-new` again to retry.

## `restore`

- Discards **any XP earned while a role was on** (and any tenure gift claimed during `brand-new`).
- Leaves inbox messages and the match-credit ledger as they are.
- A second `apply` keeps the **first** snapshot, so `restore` always returns to the values from before
  the first apply.
- ⚠️ **No real purchase while a role is applied.** A real purchase writes a receipt and sets the paid
  flag; `restore` would then put back the pre-role "not paid" value while the receipt stays — a buyer
  shown as not paid. If it happens anyway, do **not** restore; re-plan with the owner.

## Statistics and analytics

- **Ad-hoc counts** of paid players, or "paid without a purchase" consistency reads (the `0402`/`0424`
  style), will count a `paid-citizen` tester as one paid player with **no** purchase record. Exclude
  held testers: `… AND p.id NOT IN (SELECT player_id FROM tester_role_snapshots)`.
- `profile-checks.sh` counts `players` rows only; a role never creates or deletes one. No metric or
  alert reads the paid flag.
- **Client analytics events are real events.** A role change can make the tester's device send
  them: `Citizenship:Earned:XP` (a verified read that first sees an earned date after having seen
  none — e.g. `non-citizen` → `earned-citizen`) and the tenure-gift claim events after `brand-new`.
  One tester, a handful of events; keep role changes on the tester account few.

## Recovery

- **Image rolled back** after migration `008`: the table stays and old code ignores it. `restore`
  works again after rolling forward.
- **The tester's Yandex id changes again** (`0424`): the role and snapshot stay on the **old**
  record. `show` on the old id reveals it; find the new internal id again (setup step 2).
- **The tester's player row is deleted:** the snapshot is deleted with it (`on delete cascade`);
  `restore` then refuses (`no_such_player`).
- **Allowlist broken** (`allowlist_*` refusals): fix the file; it is read fresh on every run.
