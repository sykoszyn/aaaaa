-- ============================================================================
-- JUEGOS ARGENTINOS — Funciones y triggers (Fase 1)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- updated_at genérico
-- ----------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

create trigger trg_game_rooms_updated_at
  before update on game_rooms
  for each row execute function set_updated_at();

create trigger trg_friend_requests_updated_at
  before update on friend_requests
  for each row execute function set_updated_at();

create trigger trg_player_stats_updated_at
  before update on player_stats
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Auto-crear profile al registrarse (auth.users -> profiles)
-- Username por defecto derivado del email; el usuario lo puede cambiar luego.
-- ----------------------------------------------------------------------------

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  final_username text;
  suffix int := 0;
begin
  base_username := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-zA-Z0-9_]', '_', 'g'));
  base_username := substr(base_username, 1, 15);
  if base_username = '' or base_username is null then
    base_username := 'player';
  end if;

  final_username := base_username;

  while exists (select 1 from profiles where username = final_username) loop
    suffix := suffix + 1;
    final_username := base_username || suffix::text;
  end loop;

  insert into public.profiles (id, username, display_name)
  values (new.id, final_username, coalesce(new.raw_user_meta_data->>'display_name', final_username));

  return new;
end;
$$;

create trigger trg_handle_new_user
  after insert on auth.users
  for each row execute function handle_new_user();

-- ----------------------------------------------------------------------------
-- Generación de código de sala único (6 chars alfanuméricos, sin ambiguos)
-- ----------------------------------------------------------------------------

create or replace function generate_room_code()
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- sin O/0, I/1 para legibilidad
  result text := '';
  i int;
  candidate text;
begin
  loop
    result := '';
    for i in 1..6 loop
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    end loop;
    candidate := result;
    if not exists (select 1 from game_rooms where code = candidate) then
      return candidate;
    end if;
  end loop;
end;
$$;

alter table game_rooms alter column code set default generate_room_code();

-- ----------------------------------------------------------------------------
-- Al aceptar un friend_request, crear la fila en friends (par ordenado)
-- ----------------------------------------------------------------------------

create or replace function handle_friend_request_accepted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'accepted' and old.status <> 'accepted' then
    insert into friends (profile_id_a, profile_id_b)
    values (
      least(new.sender_id, new.receiver_id),
      greatest(new.sender_id, new.receiver_id)
    )
    on conflict do nothing;

    insert into notifications (profile_id, type, payload)
    values (new.sender_id, 'friend_accepted', jsonb_build_object('by', new.receiver_id));
  end if;
  return new;
end;
$$;

create trigger trg_friend_request_accepted
  after update on friend_requests
  for each row execute function handle_friend_request_accepted();

-- ----------------------------------------------------------------------------
-- Al insertar un friend_request, notificar al receptor
-- ----------------------------------------------------------------------------

create or replace function notify_friend_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into notifications (profile_id, type, payload)
  values (new.receiver_id, 'friend_request', jsonb_build_object('from', new.sender_id, 'request_id', new.id));
  return new;
end;
$$;

create trigger trg_notify_friend_request
  after insert on friend_requests
  for each row execute function notify_friend_request();

-- ----------------------------------------------------------------------------
-- Al finalizar un match (finished), actualizar player_stats, profiles y
-- leaderboards.all_time. Se dispara desde el server (Route Handler / Server
-- Action) al hacer el update de game_matches.status -> 'finished'.
-- ----------------------------------------------------------------------------

create or replace function apply_match_result()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  mp record;
begin
  if new.status = 'finished' and old.status <> 'finished' then
    for mp in
      select * from game_match_players where match_id = new.id and is_bot = false and profile_id is not null
    loop
      insert into player_stats (profile_id, game_id, matches_played, matches_won, matches_lost, best_score, rating)
      values (
        mp.profile_id,
        new.game_id,
        1,
        case when mp.result = 'win' then 1 else 0 end,
        case when mp.result = 'loss' then 1 else 0 end,
        mp.score,
        1000
      )
      on conflict (profile_id, game_id) do update set
        matches_played = player_stats.matches_played + 1,
        matches_won = player_stats.matches_won + (case when mp.result = 'win' then 1 else 0 end),
        matches_lost = player_stats.matches_lost + (case when mp.result = 'loss' then 1 else 0 end),
        best_score = greatest(player_stats.best_score, mp.score),
        rating = player_stats.rating + (case
          when mp.result = 'win' then 25
          when mp.result = 'loss' then -15
          else 0
        end),
        updated_at = now();

      update profiles set
        matches_played = matches_played + 1,
        matches_won = matches_won + (case when mp.result = 'win' then 1 else 0 end),
        matches_lost = matches_lost + (case when mp.result = 'loss' then 1 else 0 end),
        xp = xp + mp.xp_earned
      where id = mp.profile_id;

      insert into leaderboards (game_id, profile_id, rating, period)
      select new.game_id, mp.profile_id, ps.rating, 'all_time'
      from player_stats ps
      where ps.profile_id = mp.profile_id and ps.game_id = new.game_id
      on conflict (game_id, profile_id, period) do update set
        rating = excluded.rating,
        updated_at = now();
    end loop;

    insert into match_analytics (match_id, game_id, player_count, duration_seconds, ended_reason)
    select
      new.id,
      new.game_id,
      (select count(*) from game_match_players where match_id = new.id),
      extract(epoch from (coalesce(new.finished_at, now()) - new.started_at))::int,
      'completed';
  end if;

  return new;
end;
$$;

create trigger trg_apply_match_result
  after update on game_matches
  for each row execute function apply_match_result();

-- ----------------------------------------------------------------------------
-- Recalcular xp -> level (regla simple: level = floor(sqrt(xp / 100)) + 1)
-- ----------------------------------------------------------------------------

create or replace function recalculate_level()
returns trigger
language plpgsql
as $$
begin
  new.level := floor(sqrt(new.xp / 100.0))::int + 1;
  return new;
end;
$$;

create trigger trg_recalculate_level
  before update of xp on profiles
  for each row execute function recalculate_level();
