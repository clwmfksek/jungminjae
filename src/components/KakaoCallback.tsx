import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './KakaoCallback.css';

const KakaoCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const processedRef = useRef(false);

  useEffect(() => {
    const handleCallback = async () => {
      // 이미 처리된 경우 중복 실행 방지
      if (processedRef.current) {
        return;
      }
      processedRef.current = true;

      try {
        const code = searchParams.get('code');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (error) {
          console.error('카카오 로그인 에러:', error, errorDescription);
          throw new Error(errorDescription || '카카오 로그인 중 오류가 발생했습니다.');
        }

        if (!code) {
          throw new Error('인증 코드를 찾을 수 없습니다.');
        }

        console.log('인증 코드 수신:', code);
        await login(code);
        navigate('/', { replace: true });
      } catch (err) {
        console.error('로그인 처리 중 에러:', err);
        navigate('/login', { 
          state: { 
            error: err instanceof Error ? err.message : '로그인 처리 중 오류가 발생했습니다.' 
          },
          replace: true
        });
      }
    };

    handleCallback();
  }, [login, navigate, searchParams]);

  return (
    <div className="loading-container">
      <div className="loading-spinner" />
      <p>로그인 처리 중입니다...</p>
      <p className="loading-subtext">잠시만 기다려주세요</p>
    </div>
  );
};

export default KakaoCallback; 