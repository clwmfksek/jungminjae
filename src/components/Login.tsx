import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { initializeKakao, loginWithKakao, logoutKakao } from '../lib/kakao';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const Login = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { state, login, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        initializeKakao();
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize Kakao:', error);
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      await loginWithKakao();
      // 리다이렉트되므로 더 이상의 코드는 실행되지 않습니다.
    } catch (error) {
      console.error('Login failed:', error);
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await logoutKakao();
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
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
        {state.user ? (
          <button onClick={handleLogout} className="logout-button">
            로그아웃
          </button>
        ) : (
          <button onClick={handleLogin} className="kakao-login-button">
            <img 
              src="/kakao_login_medium_narrow.png" 
              alt="카카오 로그인"
              className="kakao-login-image"
            />
          </button>
        )}
      </div>
    </div>
  );
};

export default Login; 