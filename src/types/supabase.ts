export interface Database {
  public: {
    Tables: {
      messages: {
        Row: {
          id: string
          content: string
          user_name: string
          user_id: string
          profile_image: string | null
          created_at: string
        }
        Insert: {
          id?: string
          content: string
          user_name: string
          user_id: string
          profile_image?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          content?: string
          user_name?: string
          user_id?: string
          profile_image?: string | null
          created_at?: string
        }
      }
      users: {
        Row: {
          id: string
          kakao_id: string
          nickname: string
          profile_image: string
          last_login: string
          created_at?: string
          updated_at?: string
        }
        Insert: {
          id?: string
          kakao_id: string
          nickname: string
          profile_image: string
          last_login: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          kakao_id?: string
          nickname?: string
          profile_image?: string
          last_login?: string
          created_at?: string
          updated_at?: string
        }
      }
      game_records: {
        Row: {
          id: string
          user_id: string
          reaction_time: number
          is_high_score: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          reaction_time: number
          is_high_score: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          reaction_time?: number
          is_high_score?: boolean
          created_at?: string
        }
      }
    }
  }
}
