-- 07.11: /give у боті — одна видача на одне повідомлення Telegram (chat:message_id)
create unique index if not exists ledger_admin_grant_msg_uq on public.ledger ((delta->>'msg')) where reason = 'admin_grant' and delta ? 'msg';
