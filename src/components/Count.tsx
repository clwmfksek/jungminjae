import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { FaSpinner, FaExclamationCircle } from "react-icons/fa";
import "./Count.css";

interface RawGameRecord {
  id: string;
  user_id: string;
  reaction_time: string; // API에서는 문자열로 반환됨
  created_at: string;
  user_nickname: string;
  user_profile_image: string;
}

interface GameRecord {
  id: string;
  user_id: string;
  reaction_time: number; // 파싱 후에는 숫자
  created_at: string;
  user_nickname: string;
  user_profile_image: string;
}

const Count = () => {
  const { state } = useAuth();
  const [records, setRecords] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const { data, error } = await supabase.rpc(
          "get_game_records_with_users"
        );

        if (error) throw error;

        // 데이터 파싱
        const parsedRecords = (data || []).map(
          (record: RawGameRecord): GameRecord => ({
            ...record,
            reaction_time: Number(record.reaction_time),
          })
        );

        setRecords(parsedRecords);
      } catch (err) {
        setError("기록을 불러오는데 실패했습니다.");
        console.error("Error fetching records:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, []);

  const calculateStats = () => {
    if (records.length === 0) return null;

    const userRecords = records.filter(
      (record) => record.user_id === state.user?.supabaseId
    );
    const bestRecord = Math.min(
      ...records.map((record) => record.reaction_time)
    );
    const averageTime =
      records.reduce((acc, record) => acc + record.reaction_time, 0) /
      records.length;
    const totalGames = records.length;

    return {
      bestRecord,
      averageTime,
      totalGames,
      userBestRecord:
        userRecords.length > 0
          ? Math.min(...userRecords.map((record) => record.reaction_time))
          : null,
      userAverageTime:
        userRecords.length > 0
          ? userRecords.reduce((acc, record) => acc + record.reaction_time, 0) /
            userRecords.length
          : null,
      userTotalGames: userRecords.length,
    };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="loading">
        <FaSpinner className="loading-spinner" />
        <p>기록을 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error">
        <FaExclamationCircle className="error-icon" />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="count-container">
      <h1>게임 통계</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>전체 최고 기록</h3>
          <p className="stat-value">{stats?.bestRecord.toFixed(2)}ms</p>
        </div>

        <div className="stat-card">
          <h3>전체 평균</h3>
          <p className="stat-value">{stats?.averageTime.toFixed(2)}ms</p>
        </div>

        <div className="stat-card">
          <h3>총 게임 수</h3>
          <p className="stat-value">{stats?.totalGames}</p>
        </div>
      </div>

      {state.user && (
        <>
          <h2 className="user-stats-title">나의 통계</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <h3>나의 최고 기록</h3>
              <p className="stat-value">
                {stats?.userBestRecord
                  ? `${stats.userBestRecord.toFixed(2)}ms`
                  : "-"}
              </p>
            </div>

            <div className="stat-card">
              <h3>나의 평균</h3>
              <p className="stat-value">
                {stats?.userAverageTime
                  ? `${stats.userAverageTime.toFixed(2)}ms`
                  : "-"}
              </p>
            </div>

            <div className="stat-card">
              <h3>나의 게임 수</h3>
              <p className="stat-value">{stats?.userTotalGames || 0}</p>
            </div>
          </div>
        </>
      )}

      <div className="recent-records">
        <h2>최근 기록</h2>
        <div className="records-list">
          {records.map((record) => (
            <div key={record.id} className="record-item">
              <div className="record-info">
                <span className="record-time">
                  {record.reaction_time.toFixed(2)}ms
                </span>
                <div className="record-user">
                  <img src={record.user_profile_image} alt="프로필" />
                  <span>{record.user_nickname}</span>
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

export default Count;
