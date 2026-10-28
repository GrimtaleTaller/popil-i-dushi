-- Гра: гравці, стан гри, журнал нарахувань.
-- Клієнти (anon/authenticated) не мають прямого доступу: усе йде через edge function game (service role).

create table if not exists public.players (
  tg_id        bigint primary key,
  username     text,
  first_name   text,
  lang         text,
  is_premium   boolean default false,
  ref_by       bigint references public.players(tg_id),
  created_at   timestamptz not null default now(),
  last_seen    timestamptz not null default now(),
  banned       boolean not null default false
);

create table if not exists public.game_state (
  player_id    bigint primary key references public.players(tg_id) on delete cascade,
  version      integer not null default 0,
  state        jsonb   not null,
  updated_at   timestamptz not null default now()
);

create table if not exists public.ledger (
  id           bigint generated always as identity primary key,
  player_id    bigint not null references public.players(tg_id) on delete cascade,
  reason       text   not null,
  delta        jsonb  not null,
  created_at   timestamptz not null default now()
);
create index if not exists ledger_player_idx on public.ledger(player_id, created_at desc);
create index if not exists players_ref_idx on public.players(ref_by);

alter table public.players    enable row level security;
alter table public.game_state enable row level security;
alter table public.ledger     enable row level security;

revoke all on public.players, public.game_state, public.ledger from anon, authenticated;
