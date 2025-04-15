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
    thumbnail_image: string;
  };
  token?: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    refresh_token_expires_in: number;
  };
}

// 카카오 SDK 초기화
export const initializeKakao = () => {
  if (!window.Kakao.isInitialized()) {
    window.Kakao.init(import.meta.env.VITE_KAKAO_CLIENT_ID);
    console.log('카카오 SDK 초기화 완료');
  }
};

// 카카오 로그인
export const loginWithKakao = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!window.Kakao) {
      reject(new Error('카카오 SDK가 로드되지 않았습니다.'));
      return;
    }

    const redirectUri = import.meta.env.VITE_KAKAO_REDIRECT_URI;
    if (!redirectUri) {
      reject(new Error('리다이렉트 URI가 설정되지 않았습니다.'));
      return;
    }

    window.Kakao.Auth.authorize({
      redirectUri: redirectUri,
      scope: 'profile_nickname'
    });
  });
};

// 카카오 로그아웃
export const logoutKakao = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!window.Kakao) {
      reject(new Error('카카오 SDK가 로드되지 않았습니다.'));
      return;
    }

    if (!window.Kakao.Auth.getAccessToken()) {
      console.log('이미 로그아웃된 상태입니다.');
      resolve();
      return;
    }

    window.Kakao.Auth.logout(() => {
      console.log('카카오 로그아웃 성공');
      resolve();
    });
  });
};

// 현재 로그인 상태 확인
export const checkKakaoLogin = (): Promise<KakaoUser | null> => {
  return new Promise((resolve, reject) => {
    if (!window.Kakao) {
      reject(new Error('카카오 SDK가 로드되지 않았습니다.'));
      return;
    }

    if (!window.Kakao.Auth.getAccessToken()) {
      resolve(null);
      return;
    }

    window.Kakao.API.request({
      url: '/v2/user/me',
      success: (res: KakaoUser) => {
        console.log('카카오 사용자 정보 확인 성공:', res);
        resolve(res);
      },
      fail: (error: any) => {
        console.error('카카오 사용자 정보 확인 실패:', error);
        resolve(null);
      },
    });
  });
}; 