import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  FaHome,
  FaGamepad,
  FaComments,
  FaUser,
  FaSun,
  FaMoon,
  FaChartLine,
  FaTrophy,
  FaCog,
  FaSignOutAlt,
} from "react-icons/fa";
import { supabase } from "../lib/supabase";
import "./Navigation.css";

export default function Navigation() {
  const location = useLocation();
  const { state, logout } = useAuth();
  const { user } = state;
  const [theme, setTheme] = React.useState<"light" | "dark">(
    () => (localStorage.getItem("theme") as "light" | "dark") || "light"
  );
  const [bestRecord, setBestRecord] = useState<number | null>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    const fetchBestRecord = async () => {
      if (!user?.supabaseId) return;

      try {
        const { data, error } = await supabase
          .from("game_records")
          .select("reaction_time")
          .eq("user_id", user.supabaseId)
          .order("reaction_time", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("최고기록 조회 실패:", error);
          setBestRecord(null);
          return;
        }

        setBestRecord(data?.reaction_time || null);
      } catch (error) {
        console.error("최고기록 조회 실패:", error);
        setBestRecord(null);
      }
    };

    fetchBestRecord();
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("로그아웃 실패:", error);
    }
  };

  return (
    <nav className="navigation">
      <div className="nav-container">
        <div className="nav-links">
          <Link to="/" className={`nav-item ${isActive("/") ? "active" : ""}`}>
            <FaHome className="nav-icon" />
            <span>홈</span>
          </Link>

          {user && (
            <>
              <Link
                to="/game"
                className={`nav-item ${isActive("/game") ? "active" : ""}`}
              >
                <FaGamepad className="nav-icon" />
                <span>게임</span>
              </Link>

              <Link
                to="/chat"
                className={`nav-item ${isActive("/chat") ? "active" : ""}`}
              >
                <FaComments className="nav-icon" />
                <span>채팅</span>
              </Link>

              <Link
                to="/count"
                className={`nav-item ${isActive("/count") ? "active" : ""}`}
              >
                <FaChartLine className="nav-icon" />
                <span>카운트</span>
              </Link>
            </>
          )}
        </div>

        <div className="user-section">
          {user && bestRecord !== null && (
            <div className="best-record">
              <FaTrophy className="trophy-icon" />
              <span className="record-value">{bestRecord.toFixed(2)}ms</span>
            </div>
          )}

          <button
            onClick={toggleTheme}
            className="theme-toggle"
            aria-label="테마 변경"
          >
            {theme === "light" ? (
              <FaMoon className="nav-icon" />
            ) : (
              <FaSun className="nav-icon" />
            )}
          </button>

          {user ? (
            <div
              className="user-profile-dropdown"
              onMouseEnter={() => setShowProfileDropdown(true)}
              onMouseLeave={() => setShowProfileDropdown(false)}
            >
              <Link to="/profile" className="user-profile-trigger">
                <img
                  src={user.properties.profile_image}
                  alt="프로필"
                  className="user-profile-image"
                />
                <span className="user-name">{user.properties.nickname}</span>
              </Link>

              {showProfileDropdown && (
                <div className="profile-dropdown-menu">
                  <div className="profile-header">
                    <img
                      src={user.properties.profile_image}
                      alt="프로필"
                      className="dropdown-profile-image"
                    />
                    <div className="profile-info">
                      <h3>{user.properties.nickname}</h3>
                      <p className="user-id">ID: {user.id}</p>
                    </div>
                  </div>

                  <div className="profile-stats">
                    <div className="stat-item">
                      <span className="stat-label">최고 기록</span>
                      <span className="stat-value">
                        {bestRecord?.toFixed(2)}ms
                      </span>
                    </div>
                  </div>

                  <div className="dropdown-actions">
                    <Link to="/profile" className="dropdown-button">
                      <FaCog className="button-icon" />
                      <span>프로필</span>
                    </Link>
                    <button
                      className="dropdown-button logout"
                      onClick={handleLogout}
                    >
                      <FaSignOutAlt className="button-icon" />
                      <span>로그아웃</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className={`nav-item ${isActive("/login") ? "active" : ""}`}
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
