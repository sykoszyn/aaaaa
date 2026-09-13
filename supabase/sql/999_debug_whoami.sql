-- ============================================================================
-- DIAGNÓSTICO TEMPORAL — no es parte del esquema permanente.
--
-- Corré esto en el SQL Editor de Supabase, probá crear una sala de nuevo,
-- y una vez que tengamos la respuesta borrá esta función:
--   drop function debug_whoami();
--
-- SECURITY INVOKER (el default — a propósito NO se pone security definer
-- acá) para que refleje el rol/JWT de quien LLAMA a la función, no el
-- owner — es la única forma de ver qué auth.uid() ve Postgres en el mismo
-- request que hace el insert en game_rooms.
-- ============================================================================

create or replace function debug_whoami()
returns uuid
language sql
stable
as $$
  select auth.uid();
$$;

grant execute on function debug_whoami() to authenticated, anon;
