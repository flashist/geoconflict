-- 003_player_messages.sql — personal inbox (task 0012).
--
-- One-way system messages to citizens ("You've earned citizenship", name-change
-- verdicts, future admin notices). Content is EITHER a template (`template_key`
-- + `template_params`, rendered client-side in the player's language via
-- `inbox.templates.<key>.{title,body}` in resources/lang/*.json — the server does
-- not know the player's language) OR literal `title`/`body` text (manual /
-- admin sends through POST /internal/v1/messages/send). `chk_message_content`
-- enforces exactly-one-or-the-other (XOR) at the DB layer.
--
-- ON DELETE CASCADE: a profile erasure removes its messages (152-ФЗ record).
--
-- The migrate.ts runner wraps each file in a single transaction, so there is NO
-- explicit BEGIN/COMMIT here. Every statement is idempotent (IF NOT EXISTS).

create table if not exists player_messages (
  id               bigserial primary key,
  yandex_player_id text not null references player_profiles(yandex_player_id) on delete cascade,
  -- System sends: 'citizenship_earned' | 'citizenship_paid' |
  -- 'name_change_approved' | 'name_change_rejected' (enum lives in
  -- src/core/profile/InboxContract.ts, validated at the send boundary).
  template_key     text,
  template_params  jsonb not null default '{}'::jsonb,
  -- Literal content (admin / manual sends).
  title            text,
  body             text,
  sent_at          timestamptz not null default now(),
  read_at          timestamptz,
  -- Exactly one content shape: template (no literal text) XOR literal (both
  -- title and body, no template key). Edited in place before any non-throwaway
  -- DB had 003 applied (review R2) — a cold apply is the only supported path.
  constraint chk_message_content
    check (
      (template_key is not null and title is null and body is null)
      or (template_key is null and title is not null and body is not null)
    ),
  constraint chk_read_after_sent
    check (read_at is null or read_at >= sent_at)
);

-- Newest-first listing per player (V1 has no pagination; the repo caps the read).
create index if not exists player_messages_player_sent_idx
  on player_messages (yandex_player_id, sent_at desc, id desc);

-- Unread lookups / mark-read scans per player.
create index if not exists player_messages_unread_idx
  on player_messages (yandex_player_id) where read_at is null;
