import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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

interface KakaoUser {
  id: string;
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
  error: null
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function authReducer(state: AuthState, action: any) {
  switch (action.type) {
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        loading: false,
        error: null
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        loading: false
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        loading: false,
        error: null
      };
    default:
      return state;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const initializeAuth = () => {
      const savedUser = localStorage.getItem('kakao_user');
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          dispatch({ type: 'SET_USER', payload: parsedUser });
        } catch (error) {
          localStorage.removeItem('kakao_user');
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initializeAuth();
  }, []);

  const login = async (code: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // 카카오 토큰 요청
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: import.meta.env.VITE_KAKAO_CLIENT_ID,
        redirect_uri: import.meta.env.VITE_KAKAO_REDIRECT_URI,
        code: code,
        client_secret: import.meta.env.VITE_KAKAO_CLIENT_SECRET
      });

      const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: params.toString(),
      });

      if (!tokenResponse.ok) {
        const tokenData = await tokenResponse.json();
        throw new Error(tokenData.error_description || '토큰 받기 실패');
      }

      const tokenData = await tokenResponse.json();

      // 카카오 사용자 정보 요청
      const userResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        },
      });

      if (!userResponse.ok) {
        throw new Error('사용자 정보 가져오기 실패');
      }

      const userData = await userResponse.json();
      const defaultProfileImage = `https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y`;
      
      const user: KakaoUser = {
        id: userData.id.toString(),
        properties: {
          nickname: userData.properties.nickname || '사용자',
          profile_image: userData.properties.profile_image || defaultProfileImage,
          thumbnail_image: userData.properties.thumbnail_image || defaultProfileImage
        },
        token: {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_in: tokenData.expires_in,
          refresh_token_expires_in: tokenData.refresh_token_expires_in
        }
      };

      // Supabase에 사용자 정보 저장
      const { error: upsertError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          kakao_id: user.id,
          nickname: user.properties.nickname,
          profile_image: user.properties.profile_image,
          last_login: new Date().toISOString()
        }, {
          onConflict: 'kakao_id'
        });

      if (upsertError) throw upsertError;

      localStorage.setItem('kakao_user', JSON.stringify(user));
      dispatch({ type: 'SET_USER', payload: user });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : '로그인 실패' });
      throw error;
    }
  };

  const logout = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      localStorage.removeItem('kakao_user');
      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : '로그아웃 실패' });
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
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 