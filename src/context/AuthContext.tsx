import React, { createContext, useContext, useReducer, useEffect } from "react";
import { supabase } from "../lib/supabase";

interface KakaoAPIUser {
  id: number;
  properties: {
    nickname: string;
    profile_image?: string;
    thumbnail_image?: string;
  };
  kakao_account?: {
    profile?: {
      profile_image_url?: string;
    };
  };
}

interface SupabaseUser {
  id: string;
  kakao_id: string;
  nickname: string;
  profile_image: string;
  last_login: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  refresh_token_expires_at: string;
}

interface KakaoUser {
  id: string;
  kakaoId: number; // 카카오 원본 ID를 별도로 저장
  supabaseId: string;
  properties: {
    nickname: string;
    profile_image: string;
    thumbnail_image: string;
  };
  token?: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    refresh_token_expires_in: number;
    issued_at: number; // 토큰 발급 시간 추가
  };
}

interface AuthState {
  user: KakaoUser | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextType {
  state: AuthState;
  login: (code: string) => Promise<void>;
  logout: () => Promise<void>;
}

const initialState: AuthState = {
  user: null,
  loading: true,
  error: null,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function authReducer(state: AuthState, action: any) {
  switch (action.type) {
    case "SET_USER":
      return {
        ...state,
        user: action.payload,
        loading: false,
        error: null,
      };
    case "SET_LOADING":
      return {
        ...state,
        loading: action.payload,
      };
    case "SET_ERROR":
      return {
        ...state,
        error: action.payload,
        loading: false,
      };
    case "LOGOUT":
      return {
        ...state,
        user: null,
        loading: false,
        error: null,
      };
    default:
      return state;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const initializeAuth = () => {
      const savedUser = localStorage.getItem("kakao_user");
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          // 토큰이 있는지 확인
          if (parsedUser.token && parsedUser.token.access_token) {
            dispatch({ type: "SET_USER", payload: parsedUser });
          } else {
            localStorage.removeItem("kakao_user");
            dispatch({ type: "SET_LOADING", payload: false });
          }
        } catch (error) {
          console.error("사용자 정보 파싱 실패:", error);
          localStorage.removeItem("kakao_user");
          dispatch({ type: "SET_LOADING", payload: false });
        }
      } else {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    };

    initializeAuth();
  }, []);

  const login = async (code: string) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });

      // 카카오 토큰 요청
      const tokenResponse = await fetch("https://kauth.kakao.com/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: import.meta.env.VITE_KAKAO_CLIENT_ID,
          redirect_uri: import.meta.env.VITE_KAKAO_REDIRECT_URI,
          code: code,
          client_secret: import.meta.env.VITE_KAKAO_CLIENT_SECRET,
        }).toString(),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(
          errorData.error_description || "카카오 로그인에 실패했습니다."
        );
      }

      const tokenData = await tokenResponse.json();

      // 카카오 사용자 정보 요청
      const userResponse = await fetch("https://kapi.kakao.com/v2/user/me", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
        },
      });

      if (!userResponse.ok) {
        throw new Error("카카오 사용자 정보를 가져오는데 실패했습니다.");
      }

      const kakaoUserData: KakaoAPIUser = await userResponse.json();
      const defaultProfileImage = `https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y`;

      // Supabase를 통해 사용자 정보 저장
      const { data, error: upsertError } = await supabase
        .rpc("upsert_user", {
          p_kakao_id: kakaoUserData.id.toString(),
          p_nickname: kakaoUserData.properties.nickname || "사용자",
          p_profile_image:
            kakaoUserData.properties.profile_image || defaultProfileImage,
          p_access_token: tokenData.access_token,
          p_refresh_token: tokenData.refresh_token,
          p_token_expires_at: new Date(
            Date.now() + tokenData.expires_in * 1000
          ).toISOString(),
          p_refresh_token_expires_at: new Date(
            Date.now() + tokenData.refresh_token_expires_in * 1000
          ).toISOString(),
        })
        .single();

      if (upsertError) {
        console.error("Supabase 사용자 정보 저장 실패:", upsertError);
        throw new Error("사용자 정보 저장에 실패했습니다.");
      }

      const userData = data as SupabaseUser;

      if (!userData) {
        throw new Error("사용자 정보를 찾을 수 없습니다.");
      }

      // Supabase 세션 설정
      const { data: sessionData, error: sessionError } =
        await supabase.auth.signInWithPassword({
          email: `${userData.id}@kakao.user`,
          password: userData.kakao_id,
        });

      if (sessionError) {
        // 세션 생성 실패 시 회원가입 시도
        const { data: signUpData, error: signUpError } =
          await supabase.auth.signUp({
            email: `${userData.id}@kakao.user`,
            password: userData.kakao_id,
          });

        if (signUpError) {
          console.error("Supabase 인증 실패:", signUpError);
          throw new Error("인증에 실패했습니다.");
        }
      }

      const user: KakaoUser = {
        id: userData.id,
        kakaoId: kakaoUserData.id,
        supabaseId: userData.id,
        properties: {
          nickname: kakaoUserData.properties.nickname || "사용자",
          profile_image:
            kakaoUserData.properties.profile_image || defaultProfileImage,
          thumbnail_image:
            kakaoUserData.properties.thumbnail_image || defaultProfileImage,
        },
        token: {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_in: tokenData.expires_in,
          refresh_token_expires_in: tokenData.refresh_token_expires_in,
          issued_at: Date.now(),
        },
      };

      // 사용자 정보를 localStorage에 저장 (토큰 제외)
      const userForStorage = { ...user };
      delete userForStorage.token;
      localStorage.setItem("kakao_user", JSON.stringify(userForStorage));

      // 토큰은 별도로 저장
      sessionStorage.setItem("kakao_token", JSON.stringify(user.token));

      dispatch({ type: "SET_USER", payload: user });
      dispatch({ type: "SET_LOADING", payload: false });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "로그인 중 오류가 발생했습니다.";
      console.error("로그인 처리 중 에러:", error);
      dispatch({ type: "SET_ERROR", payload: errorMessage });
      throw error;
    }
  };

  const logout = async () => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });

      // Supabase 로그아웃
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        console.error("Supabase 로그아웃 실패:", signOutError);
      }

      localStorage.removeItem("kakao_user");
      sessionStorage.removeItem("kakao_token");
      dispatch({ type: "LOGOUT" });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "로그아웃 중 오류가 발생했습니다.";
      dispatch({ type: "SET_ERROR", payload: errorMessage });
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
