/**
 * Database types for the Classic Games Hub Postgres schema.
 *
 * Hand-authored to mirror the migrations in `database/migrations`. Kept in sync
 * with the schema by hand (a `supabase gen types` run can regenerate this file
 * verbatim if the CLI is wired up in CI).
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = "user" | "moderator" | "admin";
export type GameStatus = "published" | "draft" | "archived" | "coming_soon";
export type Difficulty = "easy" | "normal" | "hard";
export type Rarity = "common" | "rare" | "epic" | "legendary";
export type ShopKind =
  | "avatar_frame"
  | "profile_theme"
  | "badge"
  | "effect"
  | "banner"
  | "nameplate"
  | "collectible"
  | "xp_boost"
  | "credit_boost";
export type FriendStatus = "pending" | "accepted" | "declined";
export type AllowDms = "everyone" | "friends" | "none";
export type PresenceStatus = "auto" | "online" | "away" | "dnd" | "sleep" | "invisible";
export type PresenceVisibility = "everyone" | "friends" | "nobody";
export type FriendsVisibility = "private" | "friends" | "followers" | "public";
export type ReportStatus = "open" | "resolved" | "dismissed";
export type AnnouncementLevel = "info" | "update" | "event" | "alert";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          banner_url: string | null;
          bio: string | null;
          level: number;
          xp: number;
          credits: number;
          role: UserRole;
          equipped: Record<string, string>;
          is_banned: boolean;
          needs_username: boolean;
          discord_linked: boolean;
          pronouns: string | null;
          status_text: string | null;
          favourite_game_slug: string | null;
          featured_achievement: string | null;
          showcase: Json;
          profile_flags: Json;
          last_seen_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string; username: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      user_settings: {
        Row: {
          user_id: string;
          ads_enabled: boolean;
          theme: "system" | "light" | "dark";
          reduced_motion: boolean;
          show_online_status: boolean;
          allow_friend_requests: boolean;
          allow_dms: AllowDms;
          email_notifications: boolean;
          presence_status: PresenceStatus;
          presence_visibility: PresenceVisibility;
          friends_visibility: FriendsVisibility;
          updated_at: string;
        };
        Insert: { user_id: string } & Partial<Database["public"]["Tables"]["user_settings"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["user_settings"]["Row"]>;
        Relationships: [];
      };
      credit_transactions: {
        Row: {
          id: number;
          user_id: string;
          amount: number;
          balance_after: number;
          reason: string;
          ref_type: string | null;
          ref_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: number;
          user_id: string;
          type: string;
          title: string;
          body: string | null;
          data: Json;
          read_at: string | null;
          created_at: string;
        };
        Insert: never;
        Update: { read_at?: string | null };
        Relationships: [];
      };
      games: {
        Row: {
          id: string;
          slug: string;
          title: string;
          tagline: string | null;
          description: string | null;
          how_to_play: string | null;
          category: string;
          tags: string[];
          controls: { keys: string; action: string }[];
          thumbnail_url: string | null;
          banner_url: string | null;
          engine_id: string;
          status: GameStatus;
          featured: boolean;
          sort_weight: number;
          difficulty: Difficulty;
          play_count: number;
          rating_sum: number;
          rating_count: number;
          max_score: number | null;
          credit_divisor: number;
          max_credits_per_session: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["games"]["Row"]> & {
          slug: string;
          title: string;
          category: string;
          engine_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["games"]["Row"]>;
        Relationships: [];
      };
      game_ratings: {
        Row: {
          id: number;
          game_id: string;
          user_id: string;
          rating: number;
          review: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: { game_id: string; user_id: string; rating: number; review?: string | null };
        Update: { rating?: number; review?: string | null };
        Relationships: [];
      };
      game_favorites: {
        Row: { user_id: string; game_id: string; created_at: string };
        Insert: { user_id: string; game_id: string };
        Update: never;
        Relationships: [];
      };
      play_sessions: {
        Row: {
          id: number;
          user_id: string;
          game_id: string;
          score: number;
          duration_seconds: number;
          xp_earned: number;
          credits_earned: number;
          ads_doubled: boolean;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      leaderboard_scores: {
        Row: {
          game_id: string;
          user_id: string;
          best_score: number;
          plays: number;
          achieved_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      activity_events: {
        Row: { id: number; user_id: string; type: string; data: Json; created_at: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      friendships: {
        Row: {
          id: number;
          requester_id: string;
          addressee_id: string;
          status: FriendStatus;
          created_at: string;
          responded_at: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      user_blocks: {
        Row: { blocker_id: string; blocked_id: string; created_at: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      follows: {
        Row: { follower_id: string; following_id: string; created_at: string };
        Insert: { follower_id: string; following_id: string };
        Update: never;
        Relationships: [];
      };
      user_notes: {
        Row: {
          author_id: string;
          target_id: string;
          nickname: string | null;
          note: string | null;
          updated_at: string;
        };
        Insert: {
          author_id: string;
          target_id: string;
          nickname?: string | null;
          note?: string | null;
          updated_at?: string;
        };
        Update: { nickname?: string | null; note?: string | null; updated_at?: string };
        Relationships: [];
      };
      wishlist_items: {
        Row: { user_id: string; item_id: string; created_at: string };
        Insert: { user_id: string; item_id: string };
        Update: never;
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          created_at: string;
          last_message_at: string;
          is_group: boolean;
          name: string | null;
          invite_code: string | null;
          owner_id: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      conversation_members: {
        Row: { conversation_id: string; user_id: string; joined_at: string; last_read_at: string; role: string };
        Insert: never;
        Update: { last_read_at?: string };
        Relationships: [];
      };
      messages: {
        Row: {
          id: number;
          conversation_id: string;
          sender_id: string;
          content: string;
          created_at: string;
          edited_at: string | null;
          deleted_at: string | null;
        };
        Insert: { conversation_id: string; sender_id: string; content: string };
        Update: { content?: string; edited_at?: string | null; deleted_at?: string | null };
        Relationships: [];
      };
      message_reactions: {
        Row: { message_id: number; user_id: string; emoji: string; created_at: string };
        Insert: { message_id: number; user_id: string; emoji: string };
        Update: never;
        Relationships: [];
      };
      stories: {
        Row: {
          id: number;
          user_id: string;
          kind: "text" | "achievement";
          content: string | null;
          data: Json;
          created_at: string;
          expires_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      shop_items: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          kind: ShopKind;
          price: number;
          rarity: Rarity;
          preview: { colors?: string[]; icon?: string };
          seasonal: boolean;
          available: boolean;
          sort_weight: number;
          staff_only: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["shop_items"]["Row"]> & {
          slug: string;
          name: string;
          kind: ShopKind;
          price: number;
        };
        Update: Partial<Database["public"]["Tables"]["shop_items"]["Row"]>;
        Relationships: [];
      };
      inventory_items: {
        Row: { id: number; user_id: string; item_id: string; acquired_at: string; expires_at: string | null };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      achievements: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string;
          icon: string;
          category: string;
          xp_reward: number;
          credits_reward: number;
          secret: boolean;
          requirement: Json;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["achievements"]["Row"]> & {
          slug: string;
          name: string;
          description: string;
          requirement: Json;
        };
        Update: Partial<Database["public"]["Tables"]["achievements"]["Row"]>;
        Relationships: [];
      };
      user_achievements: {
        Row: { user_id: string; achievement_id: string; unlocked_at: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      daily_reward_claims: {
        Row: { user_id: string; claim_date: string; streak: number; credits_awarded: number; created_at: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      challenges: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string;
          kind: "daily" | "weekly" | "event";
          requirement: Json;
          credits_reward: number;
          xp_reward: number;
          starts_at: string;
          ends_at: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["challenges"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["challenges"]["Row"]>;
        Relationships: [];
      };
      challenge_progress: {
        Row: {
          user_id: string;
          challenge_id: string;
          progress: number;
          completed_at: string | null;
          claimed_at: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          banner_url: string | null;
          starts_at: string;
          ends_at: string;
          data: Json;
          published: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["events"]["Row"]> & {
          slug: string;
          name: string;
          starts_at: string;
          ends_at: string;
        };
        Update: Partial<Database["public"]["Tables"]["events"]["Row"]>;
        Relationships: [];
      };
      reports: {
        Row: {
          id: number;
          reporter_id: string;
          target_type: "user" | "message" | "review";
          target_user_id: string | null;
          target_id: string | null;
          reason: string;
          details: string | null;
          status: ReportStatus;
          resolved_by: string | null;
          resolved_at: string | null;
          created_at: string;
        };
        Insert: {
          reporter_id: string;
          target_type: "user" | "message" | "review";
          target_user_id?: string | null;
          target_id?: string | null;
          reason: string;
          details?: string | null;
        };
        Update: { status?: ReportStatus; resolved_by?: string | null; resolved_at?: string | null };
        Relationships: [];
      };
      announcements: {
        Row: {
          id: string;
          author_id: string | null;
          title: string;
          body: string;
          level: AnnouncementLevel;
          published: boolean;
          published_at: string | null;
          link_label: string | null;
          link_href: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["announcements"]["Row"]> & { title: string; body: string };
        Update: Partial<Database["public"]["Tables"]["announcements"]["Row"]>;
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: number;
          actor_id: string | null;
          action: string;
          target_type: string | null;
          target_id: string | null;
          details: Json;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      feature_flags: {
        Row: { key: string; enabled: boolean; description: string | null; payload: Json; updated_at: string };
        Insert: { key: string; enabled?: boolean; description?: string | null; payload?: Json };
        Update: { enabled?: boolean; description?: string | null; payload?: Json };
        Relationships: [];
      };
      discord_links: {
        Row: {
          user_id: string;
          discord_id: string;
          discord_username: string | null;
          via: "code" | "oauth";
          linked_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      discord_levels: {
        Row: {
          discord_id: string;
          user_id: string | null;
          discord_username: string | null;
          xp: number;
          level: number;
          messages: number;
          last_xp_at: string | null;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      submit_score: {
        Args: { p_slug: string; p_score: number; p_duration?: number };
        Returns: Json;
      };
      claim_daily_reward: { Args: Record<string, never>; Returns: Json };
      claim_challenge: { Args: { p_challenge: string }; Returns: Json };
      purchase_shop_item: { Args: { p_slug: string }; Returns: Json };
      equip_item: { Args: { p_slug: string }; Returns: Json };
      unequip_item: { Args: { p_kind: string }; Returns: undefined };
      change_username: { Args: { p_new: string }; Returns: Json };
      set_username: { Args: { p_new: string }; Returns: Json };
      admin_set_username: { Args: { p_user: string; p_new: string }; Returns: Json };
      send_friend_request: { Args: { p_username: string }; Returns: Json };
      respond_friend_request: { Args: { p_id: number; p_accept: boolean }; Returns: Json };
      remove_friend: { Args: { p_user: string }; Returns: undefined };
      block_user: { Args: { p_user: string }; Returns: undefined };
      unblock_user: { Args: { p_user: string }; Returns: undefined };
      follow_user: { Args: { p_user: string }; Returns: Json };
      unfollow_user: { Args: { p_user: string }; Returns: undefined };
      profile_social: { Args: { p_target: string }; Returns: Json };
      gift_item: { Args: { p_slug: string; p_to: string }; Returns: Json };
      get_or_create_dm: { Args: { p_user: string }; Returns: string };
      mark_conversation_read: { Args: { p_conversation: string }; Returns: undefined };
      heartbeat: { Args: Record<string, never>; Returns: undefined };
      friendship_status: { Args: { p_user: string }; Returns: string };
      search_players: {
        Args: { p_query: string };
        Returns: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          level: number;
          equipped: Record<string, string>;
          relation: string;
        }[];
      };
      profile_stats: { Args: { p_user: string }; Returns: Json };
      admin_adjust_credits: { Args: { p_user: string; p_amount: number; p_reason: string }; Returns: undefined };
      admin_set_role: { Args: { p_user: string; p_role: string }; Returns: undefined };
      admin_set_banned: { Args: { p_user: string; p_banned: boolean }; Returns: undefined };
      admin_set_level_xp: { Args: { p_user: string; p_level: number; p_xp: number }; Returns: Json };
      game_leaderboard: {
        Args: { p_slug: string; p_limit?: number };
        Returns: {
          rank: number;
          user_id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          level: number;
          best_score: number;
          plays: number;
          achieved_at: string;
        }[];
      };
      global_leaderboard: {
        Args: { p_limit?: number };
        Returns: {
          rank: number;
          user_id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          level: number;
          xp: number;
          equipped: Record<string, string>;
        }[];
      };
      list_friends: {
        Args: Record<string, never>;
        Returns: {
          user_id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          level: number;
          last_seen_at: string | null;
          equipped: Record<string, string>;
          is_online: boolean;
        }[];
      };
      list_friend_requests: {
        Args: Record<string, never>;
        Returns: {
          request_id: number;
          user_id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          level: number;
          created_at: string;
        }[];
      };
      list_conversations: {
        Args: Record<string, never>;
        Returns: {
          conversation_id: string;
          last_message_at: string;
          is_group: boolean;
          title: string;
          other_user_id: string | null;
          other_username: string | null;
          other_avatar_url: string | null;
          other_last_seen: string | null;
          member_count: number;
          last_message: string | null;
          last_message_sender: string | null;
          unread: number;
        }[];
      };
      create_group: { Args: { p_name: string }; Returns: Json };
      join_group: { Args: { p_code: string }; Returns: Json };
      leave_conversation: { Args: { p_id: string }; Returns: undefined };
      post_story: { Args: { p_kind: string; p_content: string; p_data?: Json }; Returns: Json };
      broadcast_announcement: {
        Args: {
          p_title: string;
          p_body: string;
          p_level: string;
          p_link_label: string;
          p_link_href: string;
          p_publish: boolean;
          p_notify: boolean;
        };
        Returns: Json;
      };
      // ── Discord integration (0033) ──
      claim_discord_link: { Args: { p_code: string }; Returns: Json };
      unlink_discord: { Args: Record<string, never>; Returns: Json };
      my_discord_connection: { Args: Record<string, never>; Returns: Json };
      admin_get_bot_config: { Args: Record<string, never>; Returns: Json };
      admin_set_bot_config: { Args: { p_key: string; p_value: Json }; Returns: Json };
      // service_role-only bot RPCs (called with the admin client)
      bot_profile: { Args: { p_discord: string }; Returns: Json };
      bot_claim_daily: { Args: { p_discord: string }; Returns: Json };
      bot_pay: { Args: { p_from: string; p_to: string; p_amount: number }; Returns: Json };
      bot_top_players: { Args: { p_limit?: number }; Returns: Json };
      bot_log_mod: {
        Args: { p_actor_discord: string; p_target_discord: string; p_action: string; p_reason: string };
        Returns: Json;
      };
      bot_create_link_code: { Args: { p_discord: string; p_username: string }; Returns: Json };
      bot_link_status: { Args: { p_discord: string }; Returns: Json };
      bot_unlink: { Args: { p_discord: string }; Returns: Json };
      bot_award_discord_xp: { Args: { p_discord: string; p_username?: string | null }; Returns: Json };
      bot_discord_rank: { Args: { p_discord: string }; Returns: Json };
      bot_discord_leaderboard: { Args: { p_limit?: number }; Returns: Json };
      bot_role_state: { Args: { p_discord: string }; Returns: Json };
      bot_all_linked: { Args: Record<string, never>; Returns: Json };
      bot_get_config: { Args: { p_key: string }; Returns: Json };
      bot_discord_id: { Args: { p_user: string }; Returns: string | null };
      bot_purge_link_codes: { Args: Record<string, never>; Returns: undefined };
      bot_server_stats: { Args: Record<string, never>; Returns: Json };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type Enums = Database["public"]["Enums"];
