-- ============================================================================
-- JUEGOS ARGENTINOS — Row Level Security (Fase 1)
--
-- Principio general:
--   - Todo lo que afecta el resultado de una partida (matches, match_players,
--     events, stats, leaderboards) se escribe SOLO server-side, con el
--     cliente Supabase que usa SUPABASE_SERVICE_ROLE_KEY (que ignora RLS).
--     Por eso estas tablas no tienen policies de INSERT/UPDATE para
--     'authenticated' ni 'anon': cualquier intento de escritura desde el
--     navegador es rechazado por RLS.
--   - Lo que es "social"/lobby (perfil propio, salas, amigos, notificaciones)
--     sí permite escritura directa del cliente, siempre acotada a auth.uid().
-- ============================================================================

alter table profiles enable row level security;
alter table games enable row level security;
alter table game_rooms enable row level security;
alter table game_room_players enable row level security;
alter table game_matches enable row level security;
alter table game_match_players enable row level security;
alter table game_events enable row level security;
alter table player_stats enable row level security;
alter table leaderboards enable row level security;
alter table friends enable row level security;
alter table friend_requests enable row level security;
alter table notifications enable row level security;
alter table achievements enable row level security;
alter table player_achievements enable row level security;
alter table match_analytics enable row level security;

-- ----------------------------------------------------------------------------
-- Helper: ¿el usuario autenticado es admin?
-- ----------------------------------------------------------------------------

create or replace function is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.is_admin from profiles p where p.id = uid), false);
$$;

-- ----------------------------------------------------------------------------
-- Guard: impide que un usuario se auto-otorgue admin/xp/stats vía UPDATE
-- directo a su propio profile. Solo el service_role (server) puede tocar
-- estas columnas; el resto de columnas (username, display_name, avatar_url,
-- bio, favorite_game) sí se pueden auto-editar.
-- ----------------------------------------------------------------------------

create or replace function guard_profile_protected_fields()
returns trigger
language plpgsql
as $$
begin
  if auth.role() <> 'service_role' then
    new.is_admin := old.is_admin;
    new.is_banned := old.is_banned;
    new.xp := old.xp;
    new.level := old.level;
    new.matches_played := old.matches_played;
    new.matches_won := old.matches_won;
    new.matches_lost := old.matches_lost;
  end if;
  return new;
end;
$$;

create trigger trg_guard_profile_protected_fields
  before update on profiles
  for each row execute function guard_profile_protected_fields();

-- ----------------------------------------------------------------------------
-- PROFILES
-- ----------------------------------------------------------------------------

create policy "profiles_select_all"
  on profiles for select
  using (true);

create policy "profiles_update_own"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- INSERT solo vía trigger handle_new_user() (security definer) — no hay
-- policy de INSERT para 'authenticated'/'anon', así que un insert directo
-- desde el cliente es rechazado.

-- ----------------------------------------------------------------------------
-- GAMES (catálogo público, de solo lectura para el cliente)
-- ----------------------------------------------------------------------------

create policy "games_select_all"
  on games for select
  using (true);

-- ----------------------------------------------------------------------------
-- GAME ROOMS
-- ----------------------------------------------------------------------------

create policy "rooms_select_visible"
  on game_rooms for select
  using (
    visibility = 'public'
    or host_id = auth.uid()
    or is_admin(auth.uid())
    or exists (
      select 1 from game_room_players rp
      where rp.room_id = game_rooms.id and rp.profile_id = auth.uid()
    )
  );

create policy "rooms_insert_own"
  on game_rooms for insert
  with check (host_id = auth.uid());

create policy "rooms_update_host_while_waiting"
  on game_rooms for update
  using (host_id = auth.uid() and status = 'waiting')
  with check (host_id = auth.uid());

create policy "rooms_delete_host_while_waiting"
  on game_rooms for delete
  using (host_id = auth.uid() and status = 'waiting');

-- ----------------------------------------------------------------------------
-- GAME ROOM PLAYERS
-- ----------------------------------------------------------------------------

create policy "room_players_select_if_room_visible"
  on game_room_players for select
  using (
    exists (
      select 1 from game_rooms r
      where r.id = game_room_players.room_id
        and (
          r.visibility = 'public'
          or r.host_id = auth.uid()
          or is_admin(auth.uid())
          or exists (
            select 1 from game_room_players self
            where self.room_id = r.id and self.profile_id = auth.uid()
          )
        )
    )
  );

create policy "room_players_insert_self"
  on game_room_players for insert
  with check (
    is_bot = false
    and profile_id = auth.uid()
    and exists (
      select 1 from game_rooms r
      where r.id = room_id and r.status = 'waiting'
    )
  );

create policy "room_players_insert_bot_by_host"
  on game_room_players for insert
  with check (
    is_bot = true
    and profile_id is null
    and exists (
      select 1 from game_rooms r
      where r.id = room_id and r.host_id = auth.uid() and r.status = 'waiting' and r.allow_bots = true
    )
  );

create policy "room_players_update_own"
  on game_room_players for update
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy "room_players_update_bots_by_host"
  on game_room_players for update
  using (
    is_bot = true
    and exists (select 1 from game_rooms r where r.id = room_id and r.host_id = auth.uid())
  );

create policy "room_players_delete_own_or_host"
  on game_room_players for delete
  using (
    profile_id = auth.uid()
    or exists (select 1 from game_rooms r where r.id = room_id and r.host_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- GAME MATCHES / MATCH PLAYERS / EVENTS
-- Solo lectura para participantes; toda escritura pasa por el server
-- (service_role), que valida cada movimiento antes de persistirlo.
-- ----------------------------------------------------------------------------

create policy "matches_select_participant"
  on game_matches for select
  using (
    is_admin(auth.uid())
    or exists (
      select 1 from game_match_players mp
      where mp.match_id = game_matches.id and mp.profile_id = auth.uid()
    )
  );

create policy "match_players_select_participant"
  on game_match_players for select
  using (
    is_admin(auth.uid())
    or exists (
      select 1 from game_match_players self
      where self.match_id = game_match_players.match_id and self.profile_id = auth.uid()
    )
  );

create policy "match_events_select_participant"
  on game_events for select
  using (
    is_admin(auth.uid())
    or exists (
      select 1 from game_match_players mp
      where mp.match_id = game_events.match_id and mp.profile_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- PLAYER STATS / LEADERBOARDS (públicos, de solo lectura)
-- ----------------------------------------------------------------------------

create policy "player_stats_select_all"
  on player_stats for select
  using (true);

create policy "leaderboards_select_all"
  on leaderboards for select
  using (true);

-- ----------------------------------------------------------------------------
-- FRIENDS / FRIEND REQUESTS
-- ----------------------------------------------------------------------------

create policy "friends_select_own"
  on friends for select
  using (auth.uid() = profile_id_a or auth.uid() = profile_id_b);

create policy "friends_delete_own"
  on friends for delete
  using (auth.uid() = profile_id_a or auth.uid() = profile_id_b);

-- INSERT de friends solo vía trigger handle_friend_request_accepted().

create policy "friend_requests_select_own"
  on friend_requests for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "friend_requests_insert_own"
  on friend_requests for insert
  with check (auth.uid() = sender_id);

create policy "friend_requests_update_participant"
  on friend_requests for update
  using (auth.uid() = sender_id or auth.uid() = receiver_id)
  with check (auth.uid() = sender_id or auth.uid() = receiver_id);

-- ----------------------------------------------------------------------------
-- NOTIFICATIONS
-- ----------------------------------------------------------------------------

create policy "notifications_select_own"
  on notifications for select
  using (auth.uid() = profile_id);

create policy "notifications_update_own"
  on notifications for update
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

create policy "notifications_delete_own"
  on notifications for delete
  using (auth.uid() = profile_id);

-- INSERT solo vía triggers (notify_friend_request, etc.) o service_role.

-- ----------------------------------------------------------------------------
-- ACHIEVEMENTS (catálogo público) / PLAYER ACHIEVEMENTS (lectura pública,
-- útil para mostrar insignias en el perfil de cualquier usuario)
-- ----------------------------------------------------------------------------

create policy "achievements_select_all"
  on achievements for select
  using (true);

create policy "player_achievements_select_all"
  on player_achievements for select
  using (true);

-- ----------------------------------------------------------------------------
-- MATCH ANALYTICS (solo admins)
-- ----------------------------------------------------------------------------

create policy "match_analytics_select_admin"
  on match_analytics for select
  using (is_admin(auth.uid()));
