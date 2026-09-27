## Plan (revised after owner rulings): 0315, the daily digest also lists the pending requests

**Summary**
- **Owner rulings built in (2026-09-27, relayed by fkit-lead):**
  - Q1: *"(a) List only, up to 20"*, with no Approve/Reject lines.
  - Q2, verbatim: *"Always send the short message as it works today. And the next message with more text"*.
- **Two messages.**
  1. **The heartbeat:** today's short count message, always sent first. It is **byte-identical** to today and still the only thing that decides the marker, check 12 and the exit code.
  2. **The list:** a separate second message. It is sent **only when at least one request is pending**, decided by the length of the list, never by comparing the count.
- A failed list message **never** affects the heartbeat, the marker or the exit code. It is logged with bounded fields only (fixed codes such as the result and HTTP status, never message text). ⚠️ That also means **a failed list pages nothing**: it shows only in the digest log.
- Up to 20 requests, oldest first. A length budget keeps the message under Telegram's 4096 limit, and whatever is left over becomes "…and M more waiting".
- The runbook gains a section on **acting on a listed request that never got its own message** (owner requirement).
- The old Step 4 fallback is dropped. `0307`/`0312`/`0313` code is unedited. Nothing written yet, no commit.

### Grounding (unchanged facts)
- **`src/profile-server/NameChangeDigest.ts`:**
  - `:45-49` `PENDING_COUNT_SQL`
  - `:103-109` `formatNameChangeDigest(count, at)`, which stays **untouched**
  - `:133-170` `runNameChangeDigest`: count → send → marker only if the send succeeded (`:150`, `:167`)
- **`src/profile-server/NameChangeRepository.ts:618-633`:** `describeRequestedNameForModerator` (`0307`), which gives HTML-escaped text with hidden characters as `⟨U+XXXX⟩`, plus `hasHiddenCharacters`.
- **`migrations/006_player_identity.sql:131-146`:**
  - Columns: `player_id` (internal uuid), `new_display_name`, `changed_at`.
  - Only one pending row per player.
  - `changed_at` is the request time: the insert at `NameChangeRepository.ts:139-144` leaves it at its default, and nothing updates it on a pending row.
- **Harness `tests/scripts/profile-deploy-hardening.test.sh`:**
  - `:1837` fails on any `count <op> 0|1` in the comment-stripped `NameChangeDigest.ts`.
  - `:1830` requires `countPendingNameChanges` to still be present.
  - `:1815-1822` forbid `Server`/`Routes`/`Telemetry` in the entry file.
  - Nothing there counts messages per run, so a second message trips nothing.
- **`tests/profile-server/NameChangeDigest.test.ts:8-11`** fakes `escapeTelegramHtml` so the text passes through unchanged. Escaping tests would prove nothing under that fake, so it must switch to the real function (`jest.requireActual`).

### Steps

**1. List query, in `NameChangeDigest.ts`.**
```sql
SELECT player_id, new_display_name, changed_at
FROM player_name_history
WHERE moderation_status = 'pending'
ORDER BY changed_at, id
LIMIT $1
```
- `listPendingNameChanges(pool, limit)` returns `{ playerId, requestedName, requestedAt }[]`. `limit` is `PENDING_LIST_CAP = 20`.
- No `DISTINCT` or `GROUP BY`, for the same reason as `:38-43`. No join to `players`, so a Yandex id can never be selected.

**2. The list message: a new pure function `formatPendingNameChangeList(count, at, entries)`.**
- It reads:
  ```
  <b>[Name change] Waiting for review — list</b>
  1. <code>{escaped playerId}</code> · {describeRequestedNameForModerator(name).html} · waiting 2 d 5 h
  …
  …and M more waiting (oldest shown first)
  {YYYY-MM-DD HH:MM} UTC
  ```
- ` ⚠️ hidden characters` is appended to a line when `hasHiddenCharacters` is set.
- **Wait-time text:** `N min` under 1 hour, `N h M min` under 1 day, `N d M h` after that. A negative age (clock skew) becomes `0 min`. Measured from the run's start time.
- **Length budget:** requests are added in order while the raw text, with room kept for the "more" line, stays at or under about 4000 characters.
  - Raw markup length is at least what Telegram counts, so this is conservative (the same reasoning as the `0312` test at `NameChangeRepository.test.ts:1433`).
  - It matters even within the name rule: 20 names of 27 hidden characters each would be about 6,600 characters.
- `M = Math.max(0, count - shown)`, where `count` comes from the heartbeat's count query in the same run. If a request arrives between the two queries, M can never go negative. The "more" line appears only when `M` is positive; the variable is named `remaining`, never anything that ends in `count`.

**3. `runNameChangeDigest` flow.** Heartbeat steps are unchanged in order and code:
1. count
2. `formatNameChangeDigest`
3. send
4. on failure, log and return `failed`
5. on success, write the marker (so `finished_at` is still the moment the heartbeat send completed, review R8)
6. the existing info log

Then, **only after the heartbeat succeeded**, a new `sendPendingList(...)`, wrapped in `try/catch`, runs:
- It runs the list query. **If the list is empty, it returns** without sending: `entries.length`, no comparison on `count`.
- Otherwise it formats and sends the list.
- A result other than `sent` or `sent_after_retry` logs `name-change digest list NOT sent: result=… status=… code=…`, the same bounded fields as `:154-158`.
- A query error logs `formatError(error)`, the same practice as `sendNameChangeDigest.ts:59`.
- It **cannot change the return value**. `runNameChangeDigest` still returns the heartbeat's result, so the exit code in `sendNameChangeDigest.ts:49` is unchanged.

Why only after the heartbeat succeeded:
- If the heartbeat failed, Telegram is most likely unreachable anyway.
- A list that arrived while the heartbeat did not would show a working Telegram at the very moment check 12 pages for a broken one. That is misleading.

**4. Imports and comments.**
- Import `describeRequestedNameForModerator` from `./NameChangeRepository`, with no edit to `0307`'s code.
- Cost: the cron command-line tool also loads `NameChangeRepository`, `InboxRepository`, `usernameRules`, `NameChangeDecideCommand` and `zod`. None of those reach `Server`, `Routes` or `Telemetry` (checked). `decideNameChange.ts` already loads `zod` on the same box.
- Update the comments at `:1-5`, `:70-76` and `:93-102`. The heartbeat's "no escaping needed" note stays true for the heartbeat; the list's escaping gets its own note.
- `sendNameChangeDigest.ts` is unchanged.

**5. Unit tests, `tests/profile-server/NameChangeDigest.test.ts`.**
- Switch the escaping fake to the real function.
- `fakePool` answers the list query with `[]` by default, so every existing heartbeat test passes unchanged, including `formatNameChangeDigest(3, AT)` producing exactly three lines.
- New cases:
  - **0 pending:** exactly **1** send, and it is today's text.
  - **1 pending:** **2** sends in order. The first is byte-identical to the heartbeat; the second holds the id, name and age.
  - **3 pending:** listed oldest first, with no "more" line.
  - **More than the cap:** count 25 with 20 rows gives 20 lines plus "…and 5 more".
  - **Race:** a count lower than the number of rows gives no negative M.
  - **Length budget:** 20 worst-case hostile names (128-unit, the shape of the `0312` test) keep the list under 4096, and M includes the dropped ones.
  - **Hostile names** (`<b>x</b>&`, a newline, U+00A0, U+202E, a Hangul filler): no raw tag survives; a newline shows as `⟨U+000A⟩`, so a name cannot fake a line; the warning marker is present.
  - **List send fails** (`http_error`, `network_error`): the result is still `sent`, the marker is written once, and the log line is bounded and contains no token, chat, topic or proxy value.
  - **List query throws:** the result is still `sent`, the marker is written, and the error is logged.
  - **Heartbeat fails:** the list is not attempted (1 send), the result is `failed`, and no marker is written.
  - **Order:** the marker is written **before** the list send.
  - **List query shape:** the three columns, pending only, oldest first, `$1 = 20`, no `DISTINCT`/`GROUP BY`/`yandex`.
  - **Wait-time text:** minutes, hours, days, and negative skew.
  - **Module hygiene:** still no timers at import.

**6. Integration test, `tests/integration/NameChange.it.test.ts`.** Next to the existing digest block at `:630-674`: two submitted requests plus decided history rows list exactly the two pending ones, oldest first, with internal uuids. It needs the local `gc-0012-it-pg` Postgres and `.env.test`. If that database is not available I will report it as not run, not as passed.

**7. Runbook, `ai-agents/knowledge-base/name-change-digest-runbook.md`.**
- **"What it is":** the heartbeat is unchanged and still daily, even at 0. A second list message follows only on days with pending requests, with up to 20 listed oldest first, "…and M more", and `⟨U+…⟩` codes. Example with placeholders only. States plainly that **the heartbeat, not the list, is the liveness proof**.
- **New section, "Acting on a request you only see in the list":**
  - Build the Approve or Reject line from the shapes already in the runbook: `playerId` is the id in `<code>`, and `expectedName` is the name as shown.
  - Replace every `⟨U+XXXX⟩` with `\uXXXX`. The display maps each character one to one, and `"`, `\`, `'` and control characters always show as codes, so this rule gives the exact name.
  - A mistake is safe: a wrong name gets `409 name_mismatch` and nothing changes.
  - SSH in first, as the existing section says.
- **"Running it by hand" / exit codes:** exit 0 still means the heartbeat arrived. A failed list does not change the exit code.
- **"When it stops arriving":** a new line for "heartbeat arrived, list did not" means grep the log for `list NOT sent`. Nothing pages for this.
- **Owner verification:** "one, not two" is reworded to *exactly one heartbeat per day, plus one list message on days with pending requests*. Add "a day with pending requests shows both, the heartbeat first".
- **Fix stale wording:** the `0313` paragraph and the `409 name_mismatch` row say "the daily digest's count", which becomes "the daily digest's list".

**8. Verification.**
- `npm test -- tests/profile-server/NameChangeDigest.test.ts tests/profile-server/NameChangeRepository.test.ts`
- `bash tests/scripts/profile-deploy-hardening.test.sh`: the zero-count guard and the `countPendingNameChanges` presence check must say pass
- `npm run test:integration`, if the database is available
- `npm run lint`, then the full `npm test`

**Owner-run, live:** deploy with `./build-deploy-profile.sh`. Its deploy-time run sends the heartbeat, plus a list if anything is pending. Then make one pending test request: the next digest sends the heartbeat and then a list naming it. A zero day still sends only the heartbeat.

### Not changed
`formatNameChangeDigest`, `PENDING_COUNT_SQL`, the marker path, shape and timing, check 12, the cron line, the deploy-time run, `setup-profile.sh`, `profile-checks.sh`, the harness, `package.json`, `NameChangeRepository.ts`, `NameChangeDecideCommand.ts` and `sendNameChangeDigest.ts`.

No new environment variable. No Yandex ids. No analytics or localization (the message is for the operator, in English).

### Decided by me, flagged so the owner can overrule
- **No list message on zero days.** It would repeat the heartbeat's "0" and add noise. Sending only when the list is non-empty follows the ruling's "next message with more text".
- **The list is sent only after a successful heartbeat** (reason in Step 3).
