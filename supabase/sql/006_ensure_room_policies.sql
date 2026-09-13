-- ============================================================================
-- Reset forzado e idempotente de TODAS las policies de game_rooms y
-- game_room_players. Corré esto entero si "No se pudo crear la sala:
-- new row violates row-level security policy" persiste después de
-- 005_fix_rls_recursion.sql — cubre el caso de que un CREATE POLICY
-- anterior haya fallado a mitad de script (ej. "ya existe") y haya
-- cortado silenciosamente la ejecución del resto, dejando alguna policy
-- sin crear (como rooms_insert_own, que es justo la que bloquea el
-- insert si falta).
--
-- Seguro de correr las veces que haga falta: cada policy se dropea antes
-- de recrearse.
-- ============================================================================

alter table game_rooms enable row level security;
alter table game_room_players enable row level security;

create or replace function is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.is_admin from profiles p where p.id = uid), false);
$$;

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

drop policy if exists "rooms_select_visible" on game_rooms;
create policy "rooms_select_visible"
  on game_rooms for select
  using (can_view_room(id, auth.uid()));

drop policy if exists "rooms_insert_own" on game_rooms;
create policy "rooms_insert_own"
  on game_rooms for insert
  with check (host_id = auth.uid());

drop policy if exists "rooms_update_host_while_waiting" on game_rooms;
create policy "rooms_update_host_while_waiting"
  on game_rooms for update
  using (host_id = auth.uid() and status = 'waiting')
  with check (host_id = auth.uid());

drop policy if exists "rooms_delete_host_while_waiting" on game_rooms;
create policy "rooms_delete_host_while_waiting"
  on game_rooms for delete
  using (host_id = auth.uid() and status = 'waiting');

drop policy if exists "room_players_select_if_room_visible" on game_room_players;
create policy "room_players_select_if_room_visible"
  on game_room_players for select
  using (can_view_room(room_id, auth.uid()));

drop policy if exists "room_players_insert_self" on game_room_players;
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

drop policy if exists "room_players_insert_bot_by_host" on game_room_players;
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

drop policy if exists "room_players_update_own" on game_room_players;
create policy "room_players_update_own"
  on game_room_players for update
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

drop policy if exists "room_players_update_bots_by_host" on game_room_players;
create policy "room_players_update_bots_by_host"
  on game_room_players for update
  using (
    is_bot = true
    and exists (select 1 from game_rooms r where r.id = room_id and r.host_id = auth.uid())
  );

drop policy if exists "room_players_delete_own_or_host" on game_room_players;
create policy "room_players_delete_own_or_host"
  on game_room_players for delete
  using (
    profile_id = auth.uid()
    or exists (select 1 from game_rooms r where r.id = room_id and r.host_id = auth.uid())
  );

-- Verificación rápida: esto debería listar 4 filas para game_rooms y 6
-- para game_room_players. Si ves menos, algo en el bloque de arriba
-- todavía está fallando — fijate el mensaje de error de esa línea puntual.
select tablename, policyname, cmd
from pg_policies
where tablename in ('game_rooms', 'game_room_players')
order by tablename, policyname;
