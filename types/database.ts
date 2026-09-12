/**
 * Hand-authored mirror of the Supabase schema (supabase/sql/001_schema.sql).
 * Regenerate with `supabase gen types typescript` once the project is linked;
 * kept manual for now so Phase 1 doesn't depend on a live Supabase project.
 */

export type GameSlug = "uno" | "truco" | "pool" | "bowling" | "ludo";

export type GameType = "card" | "board" | "physics" | "trivia";

export type RoomVisibility = "public" | "private";

export type RoomStatus = "waiting" | "starting" | "in_progress" | "finished" | "closed";

export type MatchStatus = "in_progress" | "finished" | "abandoned";

export type PlayerConnectionStatus = "connected" | "disconnected" | "left";

export type BotDifficulty = "easy" | "normal" | "hard";

export type FriendRequestStatus = "pending" | "accepted" | "declined" | "cancelled";

export type NotificationType =
  | "friend_request"
  | "friend_accepted"
  | "room_invite"
  | "match_found"
  | "achievement_unlocked"
  | "level_up"
  | "system";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
          bio: string | null;
          level: number;
          xp: number;
          matches_played: number;
          matches_won: number;
          matches_lost: number;
          favorite_game: GameSlug | null;
          is_online: boolean;
          last_seen_at: string;
          is_admin: boolean;
          is_banned: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
          username: string;
          display_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      games: {
        Row: {
          id: string;
          slug: GameSlug;
          name: string;
          description: string;
          game_type: GameType;
          min_players: number;
          max_players: number;
          supports_bots: boolean;
          is_active: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["games"]["Row"]> & {
          slug: GameSlug;
          name: string;
          min_players: number;
          max_players: number;
        };
        Update: Partial<Database["public"]["Tables"]["games"]["Row"]>;
        Relationships: [];
      };
      game_rooms: {
        Row: {
          id: string;
          game_id: string;
          host_id: string;
          code: string;
          visibility: RoomVisibility;
          status: RoomStatus;
          max_players: number;
          allow_bots: boolean;
          settings: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["game_rooms"]["Row"]> & {
          game_id: string;
          host_id: string;
          max_players: number;
        };
        Update: Partial<Database["public"]["Tables"]["game_rooms"]["Row"]>;
        Relationships: [
          { foreignKeyName: "game_rooms_game_id_fkey", columns: ["game_id"], isOneToOne: false, referencedRelation: "games", referencedColumns: ["id"] },
          { foreignKeyName: "game_rooms_host_id_fkey", columns: ["host_id"], isOneToOne: false, referencedRelation: "profiles", referencedColumns: ["id"] },
        ];
      };
      game_room_players: {
        Row: {
          id: string;
          room_id: string;
          profile_id: string | null;
          is_bot: boolean;
          bot_difficulty: "easy" | "normal" | "hard" | null;
          seat: number;
          is_ready: boolean;
          connection_status: PlayerConnectionStatus;
          joined_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["game_room_players"]["Row"]> & {
          room_id: string;
          seat: number;
        };
        Update: Partial<Database["public"]["Tables"]["game_room_players"]["Row"]>;
        Relationships: [
          { foreignKeyName: "game_room_players_room_id_fkey", columns: ["room_id"], isOneToOne: false, referencedRelation: "game_rooms", referencedColumns: ["id"] },
          { foreignKeyName: "game_room_players_profile_id_fkey", columns: ["profile_id"], isOneToOne: false, referencedRelation: "profiles", referencedColumns: ["id"] },
        ];
      };
      game_matches: {
        Row: {
          id: string;
          room_id: string;
          game_id: string;
          status: MatchStatus;
          state: Record<string, unknown>;
          result: Record<string, unknown> | null;
          started_at: string;
          finished_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["game_matches"]["Row"]> & {
          room_id: string;
          game_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["game_matches"]["Row"]>;
        Relationships: [
          { foreignKeyName: "game_matches_room_id_fkey", columns: ["room_id"], isOneToOne: false, referencedRelation: "game_rooms", referencedColumns: ["id"] },
          { foreignKeyName: "game_matches_game_id_fkey", columns: ["game_id"], isOneToOne: false, referencedRelation: "games", referencedColumns: ["id"] },
        ];
      };
      game_match_players: {
        Row: {
          id: string;
          match_id: string;
          profile_id: string | null;
          is_bot: boolean;
          bot_difficulty: "easy" | "normal" | "hard" | null;
          seat: number;
          result: "win" | "loss" | "draw" | "abandoned" | null;
          score: number;
          xp_earned: number;
        };
        Insert: Partial<Database["public"]["Tables"]["game_match_players"]["Row"]> & {
          match_id: string;
          seat: number;
        };
        Update: Partial<Database["public"]["Tables"]["game_match_players"]["Row"]>;
        Relationships: [
          { foreignKeyName: "game_match_players_match_id_fkey", columns: ["match_id"], isOneToOne: false, referencedRelation: "game_matches", referencedColumns: ["id"] },
          { foreignKeyName: "game_match_players_profile_id_fkey", columns: ["profile_id"], isOneToOne: false, referencedRelation: "profiles", referencedColumns: ["id"] },
        ];
      };
      game_events: {
        Row: {
          id: string;
          match_id: string;
          profile_id: string | null;
          seq: number;
          type: string;
          payload: Record<string, unknown>;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["game_events"]["Row"]> & {
          match_id: string;
          seq: number;
          type: string;
        };
        Update: Partial<Database["public"]["Tables"]["game_events"]["Row"]>;
        Relationships: [
          { foreignKeyName: "game_events_match_id_fkey", columns: ["match_id"], isOneToOne: false, referencedRelation: "game_matches", referencedColumns: ["id"] },
          { foreignKeyName: "game_events_profile_id_fkey", columns: ["profile_id"], isOneToOne: false, referencedRelation: "profiles", referencedColumns: ["id"] },
        ];
      };
      player_stats: {
        Row: {
          id: string;
          profile_id: string;
          game_id: string;
          matches_played: number;
          matches_won: number;
          matches_lost: number;
          best_score: number;
          rating: number;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["player_stats"]["Row"]> & {
          profile_id: string;
          game_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["player_stats"]["Row"]>;
        Relationships: [
          { foreignKeyName: "player_stats_profile_id_fkey", columns: ["profile_id"], isOneToOne: false, referencedRelation: "profiles", referencedColumns: ["id"] },
          { foreignKeyName: "player_stats_game_id_fkey", columns: ["game_id"], isOneToOne: false, referencedRelation: "games", referencedColumns: ["id"] },
        ];
      };
      leaderboards: {
        Row: {
          id: string;
          game_id: string | null;
          profile_id: string;
          rating: number;
          rank: number | null;
          period: "all_time" | "monthly" | "weekly";
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["leaderboards"]["Row"]> & {
          profile_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["leaderboards"]["Row"]>;
        Relationships: [
          { foreignKeyName: "leaderboards_game_id_fkey", columns: ["game_id"], isOneToOne: false, referencedRelation: "games", referencedColumns: ["id"] },
          { foreignKeyName: "leaderboards_profile_id_fkey", columns: ["profile_id"], isOneToOne: false, referencedRelation: "profiles", referencedColumns: ["id"] },
        ];
      };
      friends: {
        Row: {
          id: string;
          profile_id_a: string;
          profile_id_b: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["friends"]["Row"]> & {
          profile_id_a: string;
          profile_id_b: string;
        };
        Update: Partial<Database["public"]["Tables"]["friends"]["Row"]>;
        Relationships: [
          { foreignKeyName: "friends_profile_id_a_fkey", columns: ["profile_id_a"], isOneToOne: false, referencedRelation: "profiles", referencedColumns: ["id"] },
          { foreignKeyName: "friends_profile_id_b_fkey", columns: ["profile_id_b"], isOneToOne: false, referencedRelation: "profiles", referencedColumns: ["id"] },
        ];
      };
      friend_requests: {
        Row: {
          id: string;
          sender_id: string;
          receiver_id: string;
          status: FriendRequestStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["friend_requests"]["Row"]> & {
          sender_id: string;
          receiver_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["friend_requests"]["Row"]>;
        Relationships: [
          { foreignKeyName: "friend_requests_sender_id_fkey", columns: ["sender_id"], isOneToOne: false, referencedRelation: "profiles", referencedColumns: ["id"] },
          { foreignKeyName: "friend_requests_receiver_id_fkey", columns: ["receiver_id"], isOneToOne: false, referencedRelation: "profiles", referencedColumns: ["id"] },
        ];
      };
      notifications: {
        Row: {
          id: string;
          profile_id: string;
          type: NotificationType;
          payload: Record<string, unknown>;
          is_read: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["notifications"]["Row"]> & {
          profile_id: string;
          type: NotificationType;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Row"]>;
        Relationships: [
          { foreignKeyName: "notifications_profile_id_fkey", columns: ["profile_id"], isOneToOne: false, referencedRelation: "profiles", referencedColumns: ["id"] },
        ];
      };
      achievements: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string;
          game_id: string | null;
          icon: string | null;
          xp_reward: number;
        };
        Insert: Partial<Database["public"]["Tables"]["achievements"]["Row"]> & {
          slug: string;
          name: string;
          description: string;
        };
        Update: Partial<Database["public"]["Tables"]["achievements"]["Row"]>;
        Relationships: [
          { foreignKeyName: "achievements_game_id_fkey", columns: ["game_id"], isOneToOne: false, referencedRelation: "games", referencedColumns: ["id"] },
        ];
      };
      player_achievements: {
        Row: {
          id: string;
          profile_id: string;
          achievement_id: string;
          unlocked_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["player_achievements"]["Row"]> & {
          profile_id: string;
          achievement_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["player_achievements"]["Row"]>;
        Relationships: [
          { foreignKeyName: "player_achievements_profile_id_fkey", columns: ["profile_id"], isOneToOne: false, referencedRelation: "profiles", referencedColumns: ["id"] },
          { foreignKeyName: "player_achievements_achievement_id_fkey", columns: ["achievement_id"], isOneToOne: false, referencedRelation: "achievements", referencedColumns: ["id"] },
        ];
      };
      match_analytics: {
        Row: {
          id: string;
          match_id: string;
          game_id: string;
          player_count: number;
          duration_seconds: number | null;
          ended_reason: "completed" | "abandoned" | "error";
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["match_analytics"]["Row"]> & {
          match_id: string;
          game_id: string;
          player_count: number;
          ended_reason: "completed" | "abandoned" | "error";
        };
        Update: Partial<Database["public"]["Tables"]["match_analytics"]["Row"]>;
        Relationships: [
          { foreignKeyName: "match_analytics_match_id_fkey", columns: ["match_id"], isOneToOne: false, referencedRelation: "game_matches", referencedColumns: ["id"] },
          { foreignKeyName: "match_analytics_game_id_fkey", columns: ["game_id"], isOneToOne: false, referencedRelation: "games", referencedColumns: ["id"] },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      game_slug: GameSlug;
      game_type: GameType;
      room_visibility: RoomVisibility;
      room_status: RoomStatus;
      match_status: MatchStatus;
      player_connection_status: PlayerConnectionStatus;
      bot_difficulty: "easy" | "normal" | "hard";
      match_result: "win" | "loss" | "draw" | "abandoned";
      friend_request_status: FriendRequestStatus;
      notification_type: NotificationType;
      leaderboard_period: "all_time" | "monthly" | "weekly";
      match_ended_reason: "completed" | "abandoned" | "error";
    };
    CompositeTypes: { [_ in never]: never };
  };
}
