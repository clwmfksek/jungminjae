import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { FaSpinner, FaExclamationCircle } from 'react-icons/fa';
import './GameStats.css';

interface GameRecord {
  id: string;
  user_id: string;
  reaction_time: number;
  created_at: string;
  user: {
    id: string;
    properties: {
      nickname: string;
      profile_image: string;
    };
  };
}

const GameStats = () => {
  const { state } = useAuth();
  const [records, setRecords] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const { data, error } = await supabase
          .from('game_records')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;
        setRecords(data || []);
      } catch (err) {
        setError('기록을 불러오는데 실패했습니다.');
        console.error('Error fetching records:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, []);

  const calculateStats = () => {
    if (records.length === 0) return null;

    const userRecords = records.filter(record => record.user_id === state.user?.id);
    const bestRecord = Math.min(...records.map(record => record.reaction_time));
    const averageTime = records.reduce((acc, record) => acc + record.reaction_time, 0) / records.length;
    const totalGames = records.length;

    return {
      bestRecord,
      averageTime,
      totalGames,
      userBestRecord: userRecords.length > 0 ? Math.min(...userRecords.map(record => record.reaction_time)) : null,
      userAverageTime: userRecords.length > 0 ? userRecords.reduce((acc, record) => acc + record.reaction_time, 0) / userRecords.length : null,
      userTotalGames: userRecords.length
    };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="stats-container">
        <div className="loading">
          <div className="loading-spinner" />
          <p>통계를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="stats-container">
        <div className="error">
          <FaExclamationCircle className="error-icon" />
          <p>통계를 불러오는 중 오류가 발생했습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="stats-container">
      <h1>게임 통계</h1>
      
      <div className="stats-grid">
        <div className="stat-card">
          <h3>전체 최고 기록</h3>
          <p className="stat-value">{stats?.bestRecord.toFixed(3)}</p>
          <span className="stat-unit">초</span>
        </div>
        
        <div className="stat-card">
          <h3>전체 평균</h3>
          <p className="stat-value">{stats?.averageTime.toFixed(3)}</p>
          <span className="stat-unit">초</span>
        </div>
        
        <div className="stat-card">
          <h3>총 게임 수</h3>
          <p className="stat-value">{stats?.totalGames}</p>
          <span className="stat-unit">회</span>
        </div>
      </div>

      {state.user && (
        <>
          <h2 className="user-stats-title">나의 통계</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <h3>나의 최고 기록</h3>
              <p className="stat-value">{stats?.userBestRecord ? stats.userBestRecord.toFixed(3) : '-'}</p>
              <span className="stat-unit">초</span>
            </div>
            
            <div className="stat-card">
              <h3>나의 평균</h3>
              <p className="stat-value">{stats?.userAverageTime ? stats.userAverageTime.toFixed(3) : '-'}</p>
              <span className="stat-unit">초</span>
            </div>
            
            <div className="stat-card">
              <h3>나의 게임 수</h3>
              <p className="stat-value">{stats?.userTotalGames || 0}</p>
              <span className="stat-unit">회</span>
            </div>
          </div>
        </>
      )}

      <div className="recent-records">
        <h2>최근 기록</h2>
        <div className="records-list">
          {records.map(record => (
            <div key={record.id} className="record-item">
              <div className="record-info">
                <span className="record-time">{record.reaction_time.toFixed(3)}초</span>
                <div className="record-user">
                  <img src={record.user?.properties?.profile_image} alt="프로필" />
                  <span>{record.user?.properties?.nickname}</span>
                </div>
              </div>
              <span className="record-date">
                {new Date(record.created_at).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GameStats; 