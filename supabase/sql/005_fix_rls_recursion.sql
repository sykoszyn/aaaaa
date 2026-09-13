-- ============================================================================
-- JUEGOS ARGENTINOS — Fix: recursión infinita en RLS de salas y partidas
--
-- Bug: la policy de SELECT de game_rooms consultaba game_room_players, y la
-- de game_room_players consultaba game_rooms de vuelta (además de
-- auto-referenciarse a sí misma) — Postgres detecta ese ciclo entre
-- policies de tablas distintas (y también una tabla que se referencia a sí
-- misma) como recursión infinita y rechaza la consulta.
--
-- game_matches / game_match_players / game_events tenían el mismo patrón
-- (auto-referencia de game_match_players en su propia policy), agregado acá
-- de forma preventiva aunque todavía no se haya disparado en producción.
--
-- Fix: mover la lógica a funciones SECURITY DEFINER (mismo patrón que
-- is_admin(), ya usado en 003_rls.sql) — como corren con los privilegios
-- del owner de la función (el rol de la migración, dueño de las tablas),
-- sus consultas internas NO vuelven a disparar RLS, así que no hay ciclo
-- posible.
--
-- Ejecutar este archivo en el SQL Editor de Supabase sobre un proyecto que
-- ya corrió 003_rls.sql. Si estás armando un proyecto nuevo desde cero,
-- no hace falta: 003_rls.sql ya viene con el fix incorporado.
-- ============================================================================

create or replace function can_view_room(p_room_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from game_rooms r
    where r.id = p_room_id
      and (
        r.visibility = 'public'
        or r.host_id = p_user_id
        or is_admin(p_user_id)
        or exists (
          select 1 from game_room_players rp
          where rp.room_id = r.id and rp.profile_id = p_user_id
        )
      )
  );
$$;

create or replace function is_match_participant(p_match_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from game_match_players
    where match_id = p_match_id and profile_id = p_user_id
  );
$$;

drop policy if exists "rooms_select_visible" on game_rooms;
create policy "rooms_select_visible"
  on game_rooms for select
  using (can_view_room(id, auth.uid()));

drop policy if exists "room_players_select_if_room_visible" on game_room_players;
create policy "room_players_select_if_room_visible"
  on game_room_players for select
  using (can_view_room(room_id, auth.uid()));

drop policy if exists "matches_select_participant" on game_matches;
create policy "matches_select_participant"
  on game_matches for select
  using (is_admin(auth.uid()) or is_match_participant(id, auth.uid()));

drop policy if exists "match_players_select_participant" on game_match_players;
create policy "match_players_select_participant"
  on game_match_players for select
  using (is_admin(auth.uid()) or is_match_participant(match_id, auth.uid()));

drop policy if exists "match_events_select_participant" on game_events;
create policy "match_events_select_participant"
  on game_events for select
  using (is_admin(auth.uid()) or is_match_participant(match_id, auth.uid()));
