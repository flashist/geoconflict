# 0508 — draft message to Yandex Games support

Drafted 2026-10-26 by `fkit-producer` (spawned by `fkit-lead`, Sprint 9), on the owner's words: *"Draft the message
now"*. Scope per the owner's 2026-10-26 direction: questions about **this player and why his situation happened**;
no question about our implementation. Q2 kept by owner ruling; the stable-id and general-refund questions dropped.

> ⚠️ **This file holds placeholders only.** Fill them in **only in the copy you send** (in Yandex's support form or
> your mail client). **Never save the filled-in message into the repo**, a task file, a worklog or a chat with an
> agent. In `worklog.md` record only: the date sent, the channel by name, and later the answers (words, dates,
> yes/no — no IDs or tokens).

Placeholders: `<GAME_ID / APP ID>` · `<NEW_PLAYER_YANDEX_ID>` · `<CANDIDATE_OLD_PLAYER_YANDEX_ID>` ·
`<CANDIDATE_RECEIPT_PURCHASE_TOKEN or ORDER ID>` · `<FEEDBACK_SENT_AT>`.

---

## Message — Russian (this is the one to send)

**Тема:** Игрок появился у нас под новым ID и потерял купленное «Гражданство» — просим проверить его аккаунт
(игра `<GAME_ID / APP ID>`)

Здравствуйте!

Мы — разработчики игры с ID приложения `<GAME_ID / APP ID>`. Просим помочь разобраться с ситуацией одного
игрока. Связаться с ним напрямую мы не можем, поэтому обращаемся к вам.

**Что произошло**

- 25.10.2026 (`<FEEDBACK_SENT_AT>`) игрок написал нам через форму обратной связи в игре: в первый день игры он
  купил внутриигровой товар «Гражданство» (ID товара `citizenship`) и установил одобренный никнейм, а теперь
  и то и другое пропало.
- Его последние матчи у нас записаны на профиль игрока с ID `<NEW_PLAYER_YANDEX_ID>` (значение
  `getUniqueID()`). Этот профиль впервые появился у нас 25.10.2026 в 11:08 UTC (14:08 МСК). Покупок
  «Гражданства» на нём нет, никнейма нет. При этом данные игры в его браузере на момент первого входа уже
  показывали около 77 дней игры — то есть это давний игрок, который пришёл к нам под новым ID.
- Никнейм, который он называет, у нас не встречается ни в одном профиле — ни сейчас, ни в истории
  смены имён.
- Возможно, его прежний профиль — игрок с ID `<CANDIDATE_OLD_PLAYER_YANDEX_ID>`. Этот профиль появился
  у нас 28.09.2026, в тот же день купил «Гражданство» (покупка `<CANDIDATE_RECEIPT_PURCHASE_TOKEN or ORDER ID>`),
  последний раз заходил 24.10.2026 в 11:41 UTC (14:41 МСК) и при первом входе тоже имел долгую историю игры
  в браузере. Но никнейм у этого профиля другой, поэтому мы **не уверены**, что это один и тот же человек.

**Наши вопросы — только про этого игрока**

1. Покупал ли аккаунт, стоящий за ID `<NEW_PLAYER_YANDEX_ID>`, товар `citizenship` в нашей игре? Если да —
   когда?
2. Менялся ли ID игрока у этого аккаунта: это один и тот же аккаунт Яндекса — `<NEW_PLAYER_YANDEX_ID>` и
   `<CANDIDATE_OLD_PLAYER_YANDEX_ID>`? Если ID сменился — когда и по какой причине (например, смена пароля,
   восстановление доступа, повторный вход, сбой на стороне платформы)?
3. Оплачена ли покупка `<CANDIDATE_RECEIPT_PURCHASE_TOKEN or ORDER ID>` тем же аккаунтом?
4. Был ли по какой-либо покупке этого игрока в нашей игре возврат средств или отмена платежа (chargeback)?
5. Общий вопрос, чтобы понять такие случаи: покупки игрока (то, что возвращает `getPurchases()`) привязаны
   к аккаунту Яндекса или к ID игрока в конкретной игре? Если у игрока сменился ID, будут ли его прежние
   покупки видны под новым ID?
6. Есть ли на вашей стороне что-то ещё, что объясняет, почему он теперь виден нам как другой игрок —
   например, второй или объединённый аккаунт, восстановление аккаунта или сбой на платформе в эти даты?

Если вы можете подтвердить, сменился ли ID его аккаунта и числится ли за ним эта покупка, — это очень
поможет нам корректно восстановить игроку то, что ему принадлежит.

Если для проверки нужны дополнительные данные — напишите, пришлём.

Спасибо!

С уважением,
команда разработчиков игры `<GAME_ID / APP ID>`

---

## Message — English (owner's copy, not sent)

**Subject:** A player came back to us under a new ID and lost his purchased "Citizenship" — please check his
account (game `<GAME_ID / APP ID>`)

Hello!

We are the developers of the game with app ID `<GAME_ID / APP ID>`. We'd like your help with one player's
situation. We cannot contact him directly, so we are writing to you.

**What happened**

- On 2026-10-25 (`<FEEDBACK_SENT_AT>`) the player wrote to us through the in-game feedback form: on his first day
  he bought the in-game product "Citizenship" (product ID `citizenship`) and set an approved nickname, and now
  both are gone.
- His recent matches are credited, on our side, to the player profile with ID `<NEW_PLAYER_YANDEX_ID>` (the
  `getUniqueID()` value). That profile first appeared to us on 2026-10-25 at 11:08 UTC (14:08 Moscow). It has no
  Citizenship purchase and no nickname. Yet at its first login the game data in his browser already showed about
  77 days of play — i.e. a long-time player who reached us under a new ID.
- The nickname he names does not appear in any of our profiles — neither current nor in name-change history.
- His earlier profile may be the player with ID `<CANDIDATE_OLD_PLAYER_YANDEX_ID>`. That profile first appeared
  on 2026-09-28, bought Citizenship the same day (purchase `<CANDIDATE_RECEIPT_PURCHASE_TOKEN or ORDER ID>`), last
  logged in on 2026-10-24 at 11:41 UTC (14:41 Moscow), and also had a long browser play history at its first
  login. But it carries a different nickname, so we are **not sure** it is the same person.

**Our questions — about this player only**

1. Did the account behind ID `<NEW_PLAYER_YANDEX_ID>` ever buy the product `citizenship` in our game? If so,
   when?
2. Did this account's player ID change — are `<NEW_PLAYER_YANDEX_ID>` and `<CANDIDATE_OLD_PLAYER_YANDEX_ID>` the
   same Yandex account? If the ID changed, when and why (for example a password change, account recovery,
   re-login, or a platform incident)?
3. Was purchase `<CANDIDATE_RECEIPT_PURCHASE_TOKEN or ORDER ID>` paid by that same account?
4. Was any purchase this player made in our game refunded or charged back?
5. A general question, to understand cases like this: are a player's purchases (what `getPurchases()` returns)
   tied to the Yandex account, or to the per-game player ID? If a player's ID changes, will his earlier purchases
   be visible under the new ID?
6. Is there anything else on your side that explains why he now appears to us as a different player — for
   example a second or merged account, an account recovery, or a platform incident around these dates?

If you can confirm whether his account's ID changed and whether this purchase is on record for him, it would
help us a lot to restore correctly what belongs to the player.

If you need more data to check, let us know and we'll send it.

Thank you!

Best regards,
the developers of game `<GAME_ID / APP ID>`

---

## Message question → brief label

| # in message | Brief label | Lead's list |
|---|---|---|
| 1 | help request ("confirm his purchase is on record") | (1) |
| 2 | **Q1** (narrowed to this player) | (2) |
| 3 | help request | (3) |
| 4 | **Q4** (this player only) | (4) |
| 5 | **Q2** (kept, owner ruling 2026-10-26) | (5) |
| 6 | **Q5** | (6) |

Not in the message, by owner direction: old **Q3** (moderation / rule 1.13.1), the stable-identifier question, the
general refund question, anything about how we handle purchases.

---

## Owner checklist — where each placeholder comes from (read-only)

All dates below are UTC. Open psql on the profile box **read-only**, exactly as in `0502`'s worklog (section
"How to open psql, read-only, on the profile box": `SET TIME ZONE 'UTC'; BEGIN TRANSACTION READ ONLY;`, and
`ROLLBACK;` at the end). Table and column names checked against `migrations/006_player_identity.sql` on 2026-10-26.

Set the two internal profile ids you already found in `0502` (the new profile = the one his recent matches were
credited to; the candidate = the paid-citizen profile created 2026-09-28):

```sql
\set new_id '<NEW_PROFILE_INTERNAL_ID>'
\set cand_id '<CANDIDATE_PROFILE_INTERNAL_ID>'
```

| Placeholder | Where it comes from |
|---|---|
| `<NEW_PLAYER_YANDEX_ID>` | `SELECT platform, platform_user_id, created_at FROM player_identities WHERE player_id = :'new_id'::uuid;` — the `platform_user_id` value. Expect one row (`yandex_games`); if there are more, stop and tell the lead (words only). |
| `<CANDIDATE_OLD_PLAYER_YANDEX_ID>` | Same query with `:'cand_id'`. |
| `<CANDIDATE_RECEIPT_PURCHASE_TOKEN or ORDER ID>` | `SELECT purchase_token, product_id, processed_at FROM processed_purchases WHERE player_id = :'cand_id'::uuid AND product_id = 'citizenship';` — the `purchase_token` value. **Never select `raw_payload`** (no `SELECT *`). Our records hold only Yandex's `purchaseToken`; there is no separate order-ID column — if the developer console shows an order number for this purchase, you may add it next to the token. If the query returns more than one row, stop and tell the lead (count only). |
| `<GAME_ID / APP ID>` | Not in our database: the game's app ID from the Yandex Games developer console (also in the game's page address). |
| `<FEEDBACK_SENT_AT>` | Not in our database: the time of the feedback message in Telegram (the 2026-10-25 "Bug" report). Write it with its time zone (e.g. "14:30 МСК"). If you cannot find it, delete the bracket and keep just the date. |

**After you send:**

- Do **not** save the filled-in message anywhere in the repo. Delete any scratch copy with the real values.
- Tell the lead (or record in this task's `worklog.md`): date sent, channel by name (e.g. "Yandex Games developer
  console support form") — no URLs, no ticket numbers that identify the player.
- When Yandex answers: record the answers question by question in words (yes / no / dates) — no IDs or tokens.
  The producer then relays them to `0505` and `0424` (brief, verification step 5).
