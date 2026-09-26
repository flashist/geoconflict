# 0296 — worklog

Brief: [`brief.md`](./brief.md)

**Provenance.** Every check below was executed or observed by the **owner** in production on
2026-09-26 (game `0.0.154`, profile box), with output and screenshots relayed into the `fkit lead`
session; **(lead)** marks a read-only check `fkit-lead` ran itself. Written by a spawned
`fkit-producer` with no owner channel (ADR-021), at the close ruled by the owner 2026-09-26
(*"Close it (Recommended)"*). ⛔ Relayed evidence — not producer-verified.

**No secrets.** No token value, hash, DSN, endpoint secret, IP address, personal name or Yandex ID
appears here. The test account is named only by its short id prefix `053a6ee4`.

## Section A — after the weekend deploy slot

### A1–A5 — recorded earlier

A1–A5 were recorded on 2026-09-26 in the brief's `## Status` note
(*📌 2026-09-26 deploy window — results*), with the full table in
[`weekend-deploy-slot-runbook.md`](../../../knowledge-base/weekend-deploy-slot-runbook.md)
§ *2026-09-26 — THE WINDOW RAN*. That note is the record for them; it is kept as written. In short:

| Check | Verdict |
|---|---|
| A1 token match | ✅ `MATCH` |
| A2 non-empty in container | ✅ both halves — container `NONEMPTY`; source value non-empty at deploy time |
| A3 end to end | ✅ `credited` > 0 in the worker log; credit rows in the profile DB |
| A4 no warning, no leak | ✅ warning count 0; token string in logs 0; none in deploy output |
| A5 real XP accrual | ✅ 9 players with xp > 0 (0 before) |

⚠️ **A3 watch item carried, not closed here:** two `players/resolve` timeouts (recovered on retry).
The W15 check (`failed after retries` in the game container log must still be 0) stays in the runbook
(item F-B). No W15 reading is recorded in this worklog.

### A6 — live grant — ✅ PASS (2026-09-26)

- **Test account:** the owner's main account, prefix `053a6ee4`. Identified by exclusion: the owner's
  match deaths lined up with credits at 12:01:12 and 12:09:30 UTC. The lead's first guess (a different
  account) was wrong and was corrected **before any write**.
- **Seed (owner-run, guarded transaction):** added a labelled ledger row, game_id `seed-0296-a6`,
  xp_awarded 46 (ledger 53 → 99), plus `players.xp += 46`. Why this method: `player_xp_grants` only
  allows kind `'tenure'` (primary key `player_id, kind`), and a ledger row is what the real credit path
  (`CREDIT_SQL`) writes — so `xp` stays equal to the ledger sum. Seeded **one award (1 XP) below the
  live threshold of 100**, per the brief's warning to use the figures live at the time.
  - 📌 **The seed row stays as the audit record.** Any count of credited matches that could include it
    must filter `game_id NOT LIKE 'seed-%'`.
- **The match:** the owner then played a real multiplayer match — credit for game `JjPdU8QB`, 1 XP at
  12:15:19 UTC.
- **Result (lead, read-only DB check afterwards):** `xp` = 100, `is_citizen` = true,
  `citizenship_earned_at` = 12:15:19.111 UTC (the same instant as the credit), `is_paid_citizen` =
  false, ledger sum = 100, `citizenship_earned` inbox messages = 1.
- ⚠️ **Accepted side effect:** one real `Citizenship:Earned:XP` analytics event was sent from the
  owner's own test account. It cannot be undone.

## Section B — after the citizenship flip (`0065` §6)

### B1 — card State 3 in the live iframe — ✅ PASS

Owner screenshots, 15:15 MSK: the card shows ГРАЖДАНИН, 100/100, and the buy button is replaced by
"Сменить имя". Per the owner, the card updated right after the match **without a reload**. The
name-change form opens (not submitted).

### B2 — the inbox message — ✅ PASS, one sub-check not observed

- The Personal tab "Личные" shows "Вы получили гражданство Geoconflict!" marked НОВОЕ. The bell dot
  was present before opening (owner). DB: `read_at` set at 12:15:38 UTC.
- **Second device** (owner's phone, 15:18 MSK): the message shows **without** the НОВОЕ tag ⇒ read
  state persisted server-side across devices.
- The phone also showed a bell dot. That is explained by the bell's other source: the last-seen id for
  general announcements is kept per device in localStorage (`src/client/components/NewsButton.ts:79`,
  `src/client/Announcements.ts`). Expected — not a defect.
- ⚠️ **Not observed:** that the bell dot **cleared** after the tab was opened (on either device — the
  evidence covers the dot being present before opening, not its clearing). The brief's B2 text asks
  for this; it is recorded as not checked, not as passed.

### B3 — citizen gating — ✅ PASS

Before earning (owner screenshot, 14:56 MSK), for the same then-non-citizen account, the bell showed
only "Объявления" general content — **no Personal tab**. Checked after the flip, against prod data, as
the brief requires. One account observed.

## Other observation

- 104 tenure grants were recorded on 2026-09-26 by ~12:00 UTC — real players claiming.

## Verification steps

1. Every A and B box has a result above (A1–A5 via the brief's Status note). B2's dot-clearing
   sub-check is recorded as not observed.
2. A2 has both halves (see the brief's Status note).
3. No token value, hash, DSN, endpoint secret or IP address in this worklog.
4. No failure found ⇒ no new task filed.
