-- 02.11.2026: світовий бос, сезони арени, нагадування від бота

-- світовий бос
create table if not exists wboss (week date primary key, lvl int not null default 1, hp numeric not null, hp_max numeric not null, kills int not null default 0);
create table if not exists wboss_hits (week date not null, player_id bigint not null, name text, clan_id bigint, dmg numeric not null default 0, hits int not null default 0, kills int not null default 0, primary key (week, player_id));
create index if not exists wboss_hits_dmg on wboss_hits (week, dmg desc);
alter table wboss enable row level security; alter table wboss_hits enable row level security;
create or replace function wboss_hpmax(l int) returns numeric language sql immutable as $$ select round(2e6 * power(1.6, l - 1)) $$;
create or replace function wboss_hit(p_week date, p_player bigint, p_name text, p_clan bigint, p_dmg numeric)
returns table(lvl int, hp numeric, hp_max numeric, killed int) language plpgsql security definer set search_path to 'public' as $f$
declare b wboss; k int := 0; rest numeric := greatest(0, p_dmg);
begin
  insert into wboss(week, hp, hp_max) values (p_week, wboss_hpmax(1), wboss_hpmax(1)) on conflict do nothing;
  select * into b from wboss where week = p_week for update;
  while rest >= b.hp and k < 50 loop rest := rest - b.hp; k := k + 1; b.lvl := b.lvl + 1; b.hp_max := wboss_hpmax(b.lvl); b.hp := b.hp_max; end loop;
  b.hp := b.hp - rest;
  update wboss set lvl = b.lvl, hp = b.hp, hp_max = b.hp_max, kills = wboss.kills + k where week = p_week;
  insert into wboss_hits(week, player_id, name, clan_id, dmg, hits, kills) values (p_week, p_player, p_name, p_clan, p_dmg, 1, k)
  on conflict (week, player_id) do update set dmg = wboss_hits.dmg + excluded.dmg, hits = wboss_hits.hits + 1, kills = wboss_hits.kills + excluded.kills, name = excluded.name, clan_id = excluded.clan_id;
  return query select b.lvl, b.hp, b.hp_max, k;
end $f$;
create or replace function wboss_place_ash(rn int) returns int language sql immutable as $$ select case when rn = 1 then 300 when rn <= 3 then 200 when rn <= 10 then 100 when rn <= 50 then 40 else 0 end $$;
revoke execute on function wboss_hit(date, bigint, text, bigint, numeric) from public, anon, authenticated;

-- сезони арени: календарний місяць
alter table stats add column if not exists s_w int not null default 0, add column if not exists s_l int not null default 0;
create table if not exists arena_seasons (month date primary key, settled_at timestamptz default now());
alter table arena_seasons enable row level security;
insert into arena_seasons(month) values (date_trunc('month', now())::date) on conflict do nothing; -- поточний місяць не підсумовувати одразу
create or replace function arena_result(p_att bigint, p_def bigint, p_win boolean, p_opp_rating integer)
 returns table(new_rating integer, delta integer) language plpgsql security definer set search_path to 'public' as $function$
declare ra int; rd int; e float8; d int;
begin
  insert into stats(player_id) values (p_att) on conflict do nothing;
  select s.rating into ra from stats s where s.player_id = p_att for update;
  if p_def is not null then select s.rating into rd from stats s where s.player_id = p_def for update; end if;
  rd := coalesce(rd, p_opp_rating, 1000);
  e := 1.0 / (1 + power(10, (rd - ra) / 400.0));
  d := round(32 * ((case when p_win then 1 else 0 end) - e));
  update stats set rating = greatest(0, stats.rating + d),
    wins = stats.wins + (case when p_win then 1 else 0 end), losses = stats.losses + (case when p_win then 0 else 1 end),
    s_w = stats.s_w + (case when p_win then 1 else 0 end), s_l = stats.s_l + (case when p_win then 0 else 1 end)
  where stats.player_id = p_att;
  if p_def is not null then update stats set rating = greatest(0, stats.rating - round(d * 0.5)::int) where stats.player_id = p_def; end if;
  return query select greatest(0, ra + d), d;
end $function$;
-- p_month — перший день нового місяця; ліги за місцем серед тих, хто провів ≥10 боїв за сезон; м'яке скидання рейтингу до 1000 наполовину
create or replace function arena_season_settle(p_month date) returns int language plpgsql security definer set search_path to 'public' as $f$
begin
  insert into arena_seasons(month) values (p_month) on conflict do nothing;
  if not found then return 0; end if;
  insert into rating_rewards(week, kind, place, player_id, name, value, ash)
  select p_month, 'season', div, player_id, name, rating,
    case div when 4 then 500 when 3 then 300 when 2 then 150 when 1 then 80 else 40 end from (
    select player_id, name, rating, case when pr <= 0.03 then 4 when pr <= 0.1 then 3 when pr <= 0.3 then 2 when pr <= 0.6 then 1 else 0 end div from (
      select player_id, name, rating, (row_number() over (order by rating desc, updated_at) - 1)::float8 / count(*) over () pr from stats where s_w + s_l >= 10) t) x;
  update players p set reward_ash = reward_ash + r.ash from rating_rewards r where r.week = p_month and r.kind = 'season' and r.player_id = p.tg_id;
  update stats set rating = 1000 + (rating - 1000) / 2, s_w = 0, s_l = 0;
  return 1;
end $f$;
revoke execute on function arena_season_settle(date) from public, anon, authenticated;

-- тижневий підсумок + світовий бос попереднього тижня
create or replace function public.rating_settle(p_week date) returns integer language plpgsql security definer set search_path to 'public' as $function$
declare k text; pw date := p_week - 7;
begin
  insert into rating_weeks(week) values (p_week) on conflict do nothing;
  if not found then return 0; end if;
  foreach k in array array['power','max_stage','rating'] loop
    execute format($q$
      insert into rating_rewards(week, kind, place, player_id, name, value, ash)
      select $1, %L, rn, player_id, name, v, rating_place_ash(rn::int) from (
        select player_id, name, %I::numeric v, row_number() over (order by %I desc, updated_at asc) rn
        from stats s where (%L <> 'rating' or wins + losses > 0)
      ) t where rn <= 50 $q$, k, k, k, k) using p_week;
  end loop;
  insert into rating_rewards(week, kind, place, clan_id, name, value, ash)
  select p_week, 'clan', rn, id, name, power, rating_clan_ash(rn::int) from (
    select id, name, power, row_number() over (order by power desc, id) rn from clan_view where members > 0) t where rn <= 10;
  -- світовий бос: місце за уроном + участь (10 Попелу + 3 за кожен рівень боса, вбитий за тиждень, до 30)
  insert into rating_rewards(week, kind, place, player_id, name, value, ash)
  select p_week, 'wboss', rn, player_id, name, dmg, wboss_place_ash(rn::int) + 10 + 3 * least(30, coalesce((select w.lvl - 1 from wboss w where w.week = pw), 0)) from (
    select player_id, name, dmg, row_number() over (order by dmg desc) rn from wboss_hits where week = pw and hits > 0) t;
  insert into rating_rewards(week, kind, place, clan_id, name, value, ash)
  select p_week, 'wbclan', rn, t.clan_id, (select c.name from clans c where c.id = t.clan_id), d, case rn when 1 then 800 when 2 then 500 else 300 end from (
    select clan_id, sum(dmg) d, row_number() over (order by sum(dmg) desc) rn from wboss_hits where week = pw and clan_id is not null group by clan_id) t where rn <= 3;
  update players p set reward_ash = reward_ash + x.a
  from (select player_id, sum(ash) a from rating_rewards where week = p_week and player_id is not null group by player_id) x where p.tg_id = x.player_id;
  update clans c set ash = c.ash + r.ash from rating_rewards r where r.week = p_week and r.kind in ('clan','wbclan') and r.clan_id = c.id;
  insert into clan_log(clan_id, kind, data) select clan_id, 'rating', jsonb_build_object('place', place, 'ash', ash, 'kind', kind) from rating_rewards where week = p_week and kind in ('clan','wbclan');
  return 1;
end $function$;

-- нагадування від бота
alter table players add column if not exists notify boolean not null default true;
create table if not exists reminders (player_id bigint not null, kind text not null, sent_at timestamptz not null default now(), primary key (player_id, kind));
alter table reminders enable row level security;
create extension if not exists pg_cron;
