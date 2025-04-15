import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Home.css';

const Home = () => {
  const { state } = useAuth();
  const user = state.user;

  return (
    <div className="home-container">
      <div className="welcome-section">
        <h1>환영합니다, {user?.properties.nickname}님!</h1>
        <p>다양한 기능을 즐겨보세요</p>
      </div>

      <div className="features-grid">
        <Link to="/game" className="feature-card">
          <div className="feature-icon game">
            <span>🎮</span>
          </div>
          <h3>반응속도 테스트</h3>
          <p>당신의 반응속도를 측정해보세요</p>
        </Link>

        <Link to="/chat" className="feature-card">
          <div className="feature-icon chat">
            <span>💬</span>
          </div>
          <h3>실시간 채팅</h3>
          <p>다른 사용자와 대화를 나눠보세요</p>
        </Link>

        <Link to="/count" className="feature-card">
          <div className="feature-icon count">
            <span>📊</span>
          </div>
          <h3>카운트</h3>
          <p>다양한 통계를 확인해보세요</p>
        </Link>
      </div>
    </div>
  );
};

export default Home; 