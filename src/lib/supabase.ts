import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/supabase";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Check your .env file."
  );
}

// 싱글톤 인스턴스
let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;

// 싱글톤 패턴으로 Supabase 클라이언트 생성
export const getSupabase = () => {
  if (!supabaseInstance) {
    supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        storageKey: "minjae-chat-auth",
        storage: window.localStorage,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }
  return supabaseInstance;
};

// 기존 export를 싱글톤 인스턴스로 변경
export const supabase = getSupabase();

// 서비스 클라이언트 (인증을 우회해야 하는 작업에 사용)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// users 테이블 인터페이스 정의
export interface User {
  id: string;
  kakao_id: string;
  nickname: string;
  profile_image: string;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
  refresh_token_expires_at?: string;
  last_login: string;
  created_at?: string;
  updated_at?: string;
}

export interface CounterRecord {
  id?: number;
  name: string;
  count: number;
  created_at?: string;
  updated_at?: string;
}
