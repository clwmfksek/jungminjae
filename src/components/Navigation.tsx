import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navigation.css';
import UserInfo from './UserInfo';

interface NavigationProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const Navigation = ({ theme, toggleTheme }: NavigationProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserInfoOpen, setIsUserInfoOpen] = useState(false);
  const location = useLocation();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleUserInfo = () => {
    setIsUserInfoOpen(!isUserInfoOpen);
  };

  return (
    <nav className="navigation">
      <div className="nav-content">
        <Link to="/" className="nav-logo">
          날먹 앱
        </Link>
        
        <ul className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
          <li>
            <Link 
              to="/" 
              className={location.pathname === '/' ? 'active' : ''}
              onClick={() => setIsMenuOpen(false)}
            >
              날먹 카운터
            </Link>
          </li>
          <li>
            <Link 
              to="/chat" 
              className={location.pathname === '/chat' ? 'active' : ''}
              onClick={() => setIsMenuOpen(false)}
            >
              실시간 채팅
            </Link>
          </li>
          <li>
            <Link 
              to="/game" 
              className={location.pathname === '/game' ? 'active' : ''}
              onClick={() => setIsMenuOpen(false)}
            >
              반응속도 게임
            </Link>
          </li>
        </ul>

        <div className="nav-controls">
          <button 
            className="nav-button info-button"
            onClick={toggleUserInfo}
            title="컴퓨터 정보"
          >
            💻
          </button>
          <button 
            className="nav-button theme-button"
            onClick={toggleTheme}
            title="테마 변경"
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button className="menu-toggle" onClick={toggleMenu}>
            <span className="menu-icon"></span>
          </button>
        </div>

        {isUserInfoOpen && (
          <div className="user-info-popup">
            <UserInfo />
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation; 