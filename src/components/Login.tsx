import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { initializeKakao, loginWithKakao, checkKakaoLogin, KakaoUser } from '../lib/kakao';
import { supabase } from '../lib/supabase';
import './Login.css';

const Login = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<KakaoUser | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    initializeKakao();
    checkKakaoLogin()
      .then(async (userData) => {
        if (userData) {
          setUser(userData);
          // Supabase에 사용자 정보 저장
          await saveUserToSupabase(userData);
          // 로그인 성공 시 이전 페이지로 이동
          navigate(-1);
        }
      })
      .finally(() => setIsLoading(false));
  }, [navigate]);

  const saveUserToSupabase = async (userData: KakaoUser) => {
    try {
      const { error } = await supabase
        .from('users')
        .upsert({
          kakao_id: userData.id,
          nickname: userData.properties.nickname,
          profile_image: userData.properties.profile_image,
          last_login: new Date().toISOString(),
        });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to save user:', error);
    }
  };

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      const userData = await loginWithKakao();
      setUser(userData);
      await saveUserToSupabase(userData);
      navigate(-1);
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="login-container">
        <div className="loading">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>로그인</h1>
        <p className="login-description">
          게임 기록을 저장하고 다른 사용자들과 경쟁해보세요!
        </p>
        <button onClick={handleLogin} className="kakao-login-button">
          <img 
            src="/kakao_login_medium_narrow.png" 
            alt="카카오 로그인"
            className="kakao-login-image"
          />
        </button>
      </div>
    </div>
  );
};

export default Login; 