-- ============================================================================
-- JUEGOS ARGENTINOS — Realtime publication (Fase 1)
--
-- Supabase Realtime transmite cambios de Postgres a través de la publicación
-- `supabase_realtime`. Agregamos solo las tablas que el cliente necesita
-- escuchar en vivo (lobby, partidas, notificaciones). player_stats/
-- leaderboards se refrescan por polling/revalidation, no necesitan realtime.
-- ============================================================================

alter publication supabase_realtime add table game_rooms;
alter publication supabase_realtime add table game_room_players;
alter publication supabase_realtime add table game_matches;
alter publication supabase_realtime add table game_events;
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table profiles;

-- game_events se usa en modo INSERT-only (append log), full replica identity
-- no es necesaria; pero game_matches/game_rooms cambian de estado (UPDATE) y
-- para que el payload de UPDATE incluya todas las columnas (no solo la PK)
-- conviene REPLICA IDENTITY FULL.

alter table game_rooms replica identity full;
alter table game_room_players replica identity full;
alter table game_matches replica identity full;
alter table profiles replica identity full;
