import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaHome, FaGamepad, FaComments, FaUser, FaSun, FaMoon } from 'react-icons/fa';
import './Navigation.css';

export default function Navigation() {
  const location = useLocation();
  const { state, logout } = useAuth();
  const { user } = state;
  const [theme, setTheme] = React.useState<'light' | 'dark'>(
    () => (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  );

  const isActive = (path: string) => location.pathname === path;

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  return (
    <nav className="navigation">
      <div className="nav-container">
        <div className="nav-links">
          <Link to="/" className={`nav-item ${isActive('/') ? 'active' : ''}`}>
            <FaHome className="nav-icon" />
            <span>홈</span>
          </Link>
          
          {user && (
            <>
              <Link to="/game" className={`nav-item ${isActive('/game') ? 'active' : ''}`}>
                <FaGamepad className="nav-icon" />
                <span>게임</span>
              </Link>
              
              <Link to="/chat" className={`nav-item ${isActive('/chat') ? 'active' : ''}`}>
                <FaComments className="nav-icon" />
                <span>채팅</span>
              </Link>
            </>
          )}
        </div>

        <div className="user-section">
          <button onClick={toggleTheme} className="theme-toggle" aria-label="테마 변경">
            {theme === 'light' ? <FaMoon className="nav-icon" /> : <FaSun className="nav-icon" />}
          </button>
          {user ? (
            <div className="user-info">
              <img 
                src={user.properties.profile_image} 
                alt="프로필" 
                className="user-profile-image"
              />
              <span className="user-name">{user.properties.nickname}</span>
              <button onClick={handleLogout} className="logout-button">
                로그아웃
              </button>
            </div>
          ) : (
            <Link 
              to="/login" 
              className={`nav-item ${isActive('/login') ? 'active' : ''}`}
            >
              <FaUser className="nav-icon" />
              <span>로그인</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
} 