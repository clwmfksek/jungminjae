import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { GameRecord } from "../types/game";
import { useAuth } from "../context/AuthContext";
import { FaSpinner, FaExclamationCircle } from "react-icons/fa";
import "./GameStats.css";

interface Stats {
  bestRecord: number | null;
  averageTime: number | null;
  totalGames: number;
}

interface DatabaseRecord {
  id: string;
  reaction_time: number;
  is_high_score: boolean;
  created_at: string;
  user_id: string;
}

export default function GameStats() {
  const { state } = useAuth();
  const [records, setRecords] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({
    bestRecord: null,
    averageTime: null,
    totalGames: 0,
  });

  const fetchRecords = async () => {
    try {
      if (!state.user?.supabaseId) return;

      const { data, error } = await supabase
        .from("game_records")
        .select("id, reaction_time, is_high_score, created_at, user_id")
        .eq("user_id", state.user.supabaseId)
        .order("reaction_time", { ascending: true });

      if (error) throw error;

      const formattedRecords: GameRecord[] = (data as DatabaseRecord[]).map(
        (record) => ({
          id: record.id,
          reactionTime: record.reaction_time,
          isHighScore: record.is_high_score,
          createdAt: new Date(record.created_at),
          nickname: state.user?.properties.nickname || "Unknown",
          profileImage:
            state.user?.properties.profile_image || "/default-profile.png",
        })
      );

      setRecords(formattedRecords);
      setLoading(false);
      setError(null);

      // Calculate stats
      if (formattedRecords.length > 0) {
        const bestRecord = formattedRecords[0].reactionTime;
        const totalTime = formattedRecords.reduce(
          (sum, record) => sum + record.reactionTime,
          0
        );
        const averageTime = totalTime / formattedRecords.length;

        setStats({
          bestRecord,
          averageTime,
          totalGames: formattedRecords.length,
        });
      }
    } catch (error) {
      console.error("Error fetching records:", error);
      setLoading(false);
      setError("게임 기록을 불러오는데 실패했습니다.");
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [state.user?.supabaseId]);

  if (loading) {
    return (
      <div className="loading-container">
        <FaSpinner className="spinner" />
        <p>게임 기록을 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <FaExclamationCircle className="error-icon" />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="stats-container">
      <h2 className="stats-title">전체 통계</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <h3>전체 최고 기록</h3>
          <p className="stat-value">
            {stats.bestRecord
              ? `${stats.bestRecord.toFixed(2)}ms`
              : "기록 없음"}
          </p>
        </div>

        <div className="stat-card">
          <h3>전체 평균</h3>
          <p className="stat-value">
            {stats.averageTime
              ? `${stats.averageTime.toFixed(2)}ms`
              : "기록 없음"}
          </p>
        </div>

        <div className="stat-card">
          <h3>총 게임 수</h3>
          <p className="stat-value">{stats.totalGames}</p>
        </div>
      </div>

      {state.user && (
        <>
          <h2 className="user-stats-title">나의 통계</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <h3>나의 최고 기록</h3>
              <p className="stat-value">
                {stats.bestRecord
                  ? `${stats.bestRecord.toFixed(2)}ms`
                  : "기록 없음"}
              </p>
            </div>

            <div className="stat-card">
              <h3>나의 평균</h3>
              <p className="stat-value">
                {stats.averageTime
                  ? `${stats.averageTime.toFixed(2)}ms`
                  : "기록 없음"}
              </p>
            </div>

            <div className="stat-card">
              <h3>나의 게임 수</h3>
              <p className="stat-value">{stats.totalGames}</p>
            </div>
          </div>
        </>
      )}

      <div className="records-list">
        <h2>최근 기록</h2>
        {records.map((record) => (
          <div key={record.id} className="record-item">
            <div className="record-info">
              <span className="record-time">
                {record.reactionTime.toFixed(2)}ms
              </span>
              <div className="record-user">
                <img
                  src={record.profileImage}
                  alt={`${record.nickname}의 프로필`}
                  className="profile-image"
                />
                <span>{record.nickname}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
