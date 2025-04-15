import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import UserInfo from './UserInfo';
import PasswordModal from './PasswordModal';
import './Profile.css';

const Profile = () => {
  const { state } = useAuth();
  const user = state.user;
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const handlePasswordSubmit = (password: string) => {
    // 비밀번호 변경 로직 구현
    console.log('새 비밀번호:', password);
    setShowPasswordModal(false);
  };

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
        
        <UserInfo />
        
        <div className="profile-actions">
          <button 
            className="password-change-button"
            onClick={() => setShowPasswordModal(true)}
          >
            비밀번호 변경
          </button>
        </div>

        <PasswordModal
          isOpen={showPasswordModal}
          onClose={() => setShowPasswordModal(false)}
          onSubmit={handlePasswordSubmit}
          title="비밀번호 변경"
        />
      </div>
    </div>
  );
};

export default Profile; 