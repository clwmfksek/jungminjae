declare global {
  interface Window {
    Kakao: any;
  }
}

export interface KakaoUser {
  id: number;
  properties: {
    nickname: string;
    profile_image: string;
  };
}

// 카카오 SDK 초기화
export const initializeKakao = () => {
  if (!window.Kakao.isInitialized()) {
    window.Kakao.init(import.meta.env.VITE_KAKAO_CLIENT_ID);
  }
};

// 카카오 로그인
export const loginWithKakao = (): Promise<KakaoUser> => {
  return new Promise((resolve, reject) => {
    window.Kakao.Auth.login({
      redirectUri: `${window.location.origin}/auth/callback/kakao`,
      success: () => {
        window.Kakao.API.request({
          url: '/v2/user/me',
          success: (res: KakaoUser) => resolve(res),
          fail: (error: any) => reject(error),
        });
      },
      fail: (error: any) => reject(error),
    });
  });
};

// 카카오 로그아웃
export const logoutKakao = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!window.Kakao.Auth.getAccessToken()) {
      resolve();
      return;
    }

    window.Kakao.Auth.logout(() => {
      resolve();
    });
  });
};

// 현재 로그인 상태 확인
export const checkKakaoLogin = (): Promise<KakaoUser | null> => {
  return new Promise((resolve) => {
    if (!window.Kakao.Auth.getAccessToken()) {
      resolve(null);
      return;
    }

    window.Kakao.API.request({
      url: '/v2/user/me',
      success: (res: KakaoUser) => resolve(res),
      fail: () => resolve(null),
    });
  });
}; 