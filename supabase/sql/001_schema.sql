-- ============================================================================
-- JUEGOS ARGENTINOS — Schema base (Fase 1)
-- Ejecutar en el SQL Editor de Supabase, en orden: 001, 002, 003.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------

create type game_slug as enum ('uno', 'truco', 'pool', 'bowling', 'ludo');
create type game_type as enum ('card', 'board', 'physics', 'trivia');
create type room_visibility as enum ('public', 'private');
create type room_status as enum ('waiting', 'starting', 'in_progress', 'finished', 'closed');
create type match_status as enum ('in_progress', 'finished', 'abandoned');
create type player_connection_status as enum ('connected', 'disconnected', 'left');
create type bot_difficulty as enum ('easy', 'normal', 'hard');
create type match_result as enum ('win', 'loss', 'draw', 'abandoned');
create type friend_request_status as enum ('pending', 'accepted', 'declined', 'cancelled');
create type notification_type as enum (
  'friend_request', 'friend_accepted', 'room_invite',
  'match_found', 'achievement_unlocked', 'level_up', 'system'
);
create type leaderboard_period as enum ('all_time', 'monthly', 'weekly');
create type match_ended_reason as enum ('completed', 'abandoned', 'error');

-- ----------------------------------------------------------------------------
-- PROFILES (1:1 con auth.users)
-- ----------------------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null,
  avatar_url text,
  bio text,
  level integer not null default 1,
  xp integer not null default 0,
  matches_played integer not null default 0,
  matches_won integer not null default 0,
  matches_lost integer not null default 0,
  favorite_game game_slug,
  is_online boolean not null default false,
  last_seen_at timestamptz not null default now(),
  is_admin boolean not null default false,
  is_banned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint username_format check (username ~ '^[a-zA-Z0-9_]{3,20}$'),
  constraint xp_non_negative check (xp >= 0),
  constraint level_positive check (level >= 1)
);

create index idx_profiles_username on profiles (username);
create index idx_profiles_is_online on profiles (is_online) where is_online = true;
create index idx_profiles_xp on profiles (xp desc);

-- ----------------------------------------------------------------------------
-- GAMES (catálogo de juegos)
-- ----------------------------------------------------------------------------

create table games (
  id uuid primary key default gen_random_uuid(),
  slug game_slug not null unique,
  name text not null,
  description text not null default '',
  game_type game_type not null,
  min_players integer not null,
  max_players integer not null,
  supports_bots boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),

  constraint players_range check (min_players >= 1 and max_players >= min_players)
);

create index idx_games_slug on games (slug);
create index idx_games_is_active on games (is_active) where is_active = true;

-- ----------------------------------------------------------------------------
-- GAME ROOMS
-- ----------------------------------------------------------------------------

create table game_rooms (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete restrict,
  host_id uuid not null references profiles(id) on delete cascade,
  code text not null unique,
  visibility room_visibility not null default 'public',
  status room_status not null default 'waiting',
  max_players integer not null,
  allow_bots boolean not null default true,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint code_format check (code ~ '^[A-Z0-9]{6}$'),
  constraint max_players_positive check (max_players >= 1)
);

create index idx_game_rooms_status on game_rooms (status);
create index idx_game_rooms_visibility_status on game_rooms (visibility, status)
  where visibility = 'public' and status = 'waiting';
create index idx_game_rooms_game_id on game_rooms (game_id);
create index idx_game_rooms_code on game_rooms (code);

-- ----------------------------------------------------------------------------
-- GAME ROOM PLAYERS (lobby, antes de que exista un match)
-- ----------------------------------------------------------------------------

create table game_room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references game_rooms(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  is_bot boolean not null default false,
  bot_difficulty bot_difficulty,
  seat integer not null,
  is_ready boolean not null default false,
  connection_status player_connection_status not null default 'connected',
  joined_at timestamptz not null default now(),

  constraint seat_non_negative check (seat >= 0),
  constraint bot_or_profile check (
    (is_bot = true and profile_id is null) or
    (is_bot = false and profile_id is not null)
  ),
  unique (room_id, seat),
  unique (room_id, profile_id)
);

create index idx_room_players_room_id on game_room_players (room_id);
create index idx_room_players_profile_id on game_room_players (profile_id);

-- ----------------------------------------------------------------------------
-- GAME MATCHES (una partida en curso o finalizada)
-- ----------------------------------------------------------------------------

create table game_matches (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references game_rooms(id) on delete cascade,
  game_id uuid not null references games(id) on delete restrict,
  status match_status not null default 'in_progress',
  state jsonb not null default '{}'::jsonb,
  result jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index idx_game_matches_room_id on game_matches (room_id);
create index idx_game_matches_status on game_matches (status);
create index idx_game_matches_game_id_status on game_matches (game_id, status);

-- ----------------------------------------------------------------------------
-- GAME MATCH PLAYERS (snapshot de participantes + resultado)
-- ----------------------------------------------------------------------------

create table game_match_players (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references game_matches(id) on delete cascade,
  profile_id uuid references profiles(id) on delete set null,
  is_bot boolean not null default false,
  bot_difficulty bot_difficulty,
  seat integer not null,
  result match_result,
  score integer not null default 0,
  xp_earned integer not null default 0,

  constraint seat_non_negative check (seat >= 0),
  unique (match_id, seat)
);

create index idx_match_players_match_id on game_match_players (match_id);
create index idx_match_players_profile_id on game_match_players (profile_id);

-- ----------------------------------------------------------------------------
-- GAME EVENTS (log de acciones/eventos de una partida — auditable y replayable)
-- ----------------------------------------------------------------------------

create table game_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references game_matches(id) on delete cascade,
  profile_id uuid references profiles(id) on delete set null,
  seq integer not null,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  unique (match_id, seq)
);

create index idx_game_events_match_id_seq on game_events (match_id, seq);

-- ----------------------------------------------------------------------------
-- PLAYER STATS (agregado por jugador + juego)
-- ----------------------------------------------------------------------------

create table player_stats (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  game_id uuid not null references games(id) on delete cascade,
  matches_played integer not null default 0,
  matches_won integer not null default 0,
  matches_lost integer not null default 0,
  best_score integer not null default 0,
  rating integer not null default 1000,
  updated_at timestamptz not null default now(),

  unique (profile_id, game_id)
);

create index idx_player_stats_game_rating on player_stats (game_id, rating desc);
create index idx_player_stats_profile_id on player_stats (profile_id);

-- ----------------------------------------------------------------------------
-- LEADERBOARDS (materializado/actualizado por trigger o job)
-- ----------------------------------------------------------------------------

create table leaderboards (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references games(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  rating integer not null default 1000,
  rank integer,
  period leaderboard_period not null default 'all_time',
  updated_at timestamptz not null default now(),

  unique (game_id, profile_id, period)
);

create index idx_leaderboards_game_period_rating on leaderboards (game_id, period, rating desc);

-- ----------------------------------------------------------------------------
-- FRIENDS / FRIEND REQUESTS
-- ----------------------------------------------------------------------------

create table friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references profiles(id) on delete cascade,
  receiver_id uuid not null references profiles(id) on delete cascade,
  status friend_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint no_self_request check (sender_id <> receiver_id),
  unique (sender_id, receiver_id)
);

create index idx_friend_requests_receiver on friend_requests (receiver_id, status);
create index idx_friend_requests_sender on friend_requests (sender_id, status);

create table friends (
  id uuid primary key default gen_random_uuid(),
  profile_id_a uuid not null references profiles(id) on delete cascade,
  profile_id_b uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),

  constraint no_self_friend check (profile_id_a <> profile_id_b),
  constraint ordered_pair check (profile_id_a < profile_id_b),
  unique (profile_id_a, profile_id_b)
);

create index idx_friends_a on friends (profile_id_a);
create index idx_friends_b on friends (profile_id_b);

-- ----------------------------------------------------------------------------
-- NOTIFICATIONS
-- ----------------------------------------------------------------------------

create table notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  type notification_type not null,
  payload jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_notifications_profile_unread on notifications (profile_id, is_read, created_at desc);

-- ----------------------------------------------------------------------------
-- ACHIEVEMENTS
-- ----------------------------------------------------------------------------

create table achievements (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  game_id uuid references games(id) on delete cascade,
  icon text,
  xp_reward integer not null default 0
);

create table player_achievements (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  achievement_id uuid not null references achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(),

  unique (profile_id, achievement_id)
);

create index idx_player_achievements_profile on player_achievements (profile_id);

-- ----------------------------------------------------------------------------
-- MATCH ANALYTICS (registro liviano para métricas futuras)
-- ----------------------------------------------------------------------------

create table match_analytics (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references game_matches(id) on delete cascade,
  game_id uuid not null references games(id) on delete cascade,
  player_count integer not null,
  duration_seconds integer,
  ended_reason match_ended_reason not null,
  created_at timestamptz not null default now()
);

create index idx_match_analytics_game_id on match_analytics (game_id, created_at desc);

-- ----------------------------------------------------------------------------
-- SEED: catálogo de juegos inicial
-- ----------------------------------------------------------------------------

insert into games (slug, name, description, game_type, min_players, max_players, supports_bots) values
  ('uno', 'UNO', 'El clásico juego de cartas de colores y combos.', 'card', 2, 6, true),
  ('truco', 'Truco Argentino', 'Truco con reglas argentinas: envido, flor y mucho bluff.', 'card', 2, 4, true),
  ('pool', 'Pool', 'Billar 2D con física realista.', 'physics', 2, 2, true),
  ('bowling', 'Bowling', 'Diez pinos, diez frames, toda la puntería.', 'physics', 1, 4, true),
  ('ludo', 'Ludo', 'El clásico juego de tablero de dados y fichas.', 'board', 2, 4, true)
on conflict (slug) do nothing;
