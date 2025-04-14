import React from 'react';
import { useAuth } from '../context/AuthContext';
import './Profile.css';

const Profile = () => {
  const { state } = useAuth();
  const user = state.user;

  if (!user) {
    return (
      <div className="profile-container">
        <div className="profile-card">
          <h2>로그인이 필요합니다</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-header">
          <img 
            src={user.properties.profile_image} 
            alt="프로필 이미지" 
            className="profile-image"
          />
          <h2>{user.properties.nickname}</h2>
        </div>
        
        <div className="profile-info">
          <div className="info-item">
            <label>닉네임</label>
            <span>{user.properties.nickname}</span>
          </div>
          <div className="info-item">
            <label>가입일</label>
            <span>{new Date().toLocaleDateString()}</span>
          </div>
        </div>

        <div className="profile-stats">
          <div className="stats-item">
            <h3>게임 기록</h3>
            <div className="stats-grid">
              <div className="stat">
                <label>최고 반응 속도</label>
                <span>0.000초</span>
              </div>
              <div className="stat">
                <label>평균 반응 속도</label>
                <span>0.000초</span>
              </div>
              <div className="stat">
                <label>총 게임 수</label>
                <span>0회</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile; 