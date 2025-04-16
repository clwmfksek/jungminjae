import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import "./ReactionGame.css";

interface GameState {
  state: "waiting" | "ready" | "now" | "finished";
  message: string;
  startTime: number;
  endTime: number;
  userId: string | null;
}

const INITIAL_STATE: GameState = {
  state: "waiting",
  message: "시작하려면 클릭하세요",
  startTime: 0,
  endTime: 0,
  userId: null,
};

const COLORS = {
  waiting: "var(--bg-secondary)",
  ready: "#ef4444",
  now: "#22c55e",
  finished: "var(--bg-secondary)",
} as const;

// 반응 속도 등급 기준 (ms)
const REACTION_GRADES = {
  FAST: 250, // 250ms 이하: 빠름
  NORMAL: 350, // 350ms 이하: 보통
} as const;

const ReactionGame = () => {
  const navigate = useNavigate();
  const { state } = useAuth();
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const [records, setRecords] = useState<number[]>(() => {
    const savedRecords = localStorage.getItem("reactionGameRecords");
    return savedRecords ? JSON.parse(savedRecords) : [];
  });
  const [bestRecord, setBestRecord] = useState<number | null>(() => {
    const savedBest = localStorage.getItem("reactionGameBest");
    return savedBest ? Number(savedBest) : null;
  });
  const [reactionClass, setReactionClass] = useState<string>("");

  useEffect(() => {
    const userId = state.user?.supabaseId;
    if (userId) {
      setGameState((prev) => ({ ...prev, userId }));
    }
  }, [state.user]);

  // 게임 시작 핸들러
  const startGame = useCallback(() => {
    if (gameState.state !== "waiting") return;

    setGameState((prev) => ({
      ...prev,
      state: "ready",
      message: "초록색으로 변할 때 클릭하세요!",
    }));

    const delay = Math.floor(Math.random() * 2000) + 2000;
    const timeout = setTimeout(() => {
      setGameState((prev) => ({
        ...prev,
        state: "now",
        startTime: Date.now(),
        message: "지금 클릭하세요!",
      }));
    }, delay);

    return () => clearTimeout(timeout);
  }, [gameState.state]);

  // 반응 속도에 따른 클래스 결정
  const getReactionClass = (reactionTime: number): string => {
    if (reactionTime <= REACTION_GRADES.FAST) return "fast";
    if (reactionTime <= REACTION_GRADES.NORMAL) return "normal";
    return "slow";
  };

  // 게임 종료 핸들러
  const endGame = useCallback(async () => {
    if (gameState.state === "now") {
      const currentTime = Date.now();
      const reactionTime = currentTime - gameState.startTime;

      setGameState((prev) => ({
        ...prev,
        state: "finished",
        endTime: currentTime,
        message: `반응 속도: ${reactionTime}ms`,
      }));

      // 반응 속도에 따른 클래스 설정
      const newClass =
        !bestRecord || reactionTime < bestRecord
          ? "new-record"
          : getReactionClass(reactionTime);
      setReactionClass(newClass);

      setRecords((prev) => {
        const newRecords = [...prev, reactionTime];
        localStorage.setItem("reactionGameRecords", JSON.stringify(newRecords));
        return newRecords;
      });

      if (!bestRecord || reactionTime < bestRecord) {
        setBestRecord(reactionTime);
        localStorage.setItem("reactionGameBest", reactionTime.toString());
      }

      // 2초 후 클래스 제거
      setTimeout(() => setReactionClass(""), 2000);

      // 게임 기록 저장
      if (gameState.userId) {
        try {
          const { error } = await supabase.from("game_records").insert([
            {
              user_id: state.user?.supabaseId,
              reaction_time: reactionTime,
              is_high_score: !bestRecord || reactionTime < bestRecord,
            },
          ]);

          if (error) {
            console.error("기록 저장 실패:", error);
          }
        } catch (error) {
          console.error("기록 저장 중 오류 발생:", error);
        }
      }
    } else if (gameState.state === "ready") {
      setGameState({
        ...INITIAL_STATE,
        message: "너무 일찍 클릭했습니다! 다시 시도하려면 클릭하세요.",
      });
    }
  }, [gameState.state, gameState.startTime, bestRecord, gameState.userId]);

  // 키보드 이벤트 핸들러
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        if (gameState.state === "waiting" || gameState.state === "ready") {
          startGame();
        } else {
          endGame();
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [gameState.state, startGame, endGame]);

  // 게임 리셋 핸들러
  const resetGame = useCallback(() => {
    setGameState(INITIAL_STATE);
    setReactionClass("");
  }, []);

  // 통계 계산
  const stats = useMemo(() => {
    if (records.length === 0) return null;

    return {
      average: Math.round(records.reduce((a, b) => a + b, 0) / records.length),
      attempts: records.length,
      recentRecords: records.slice(-5),
    };
  }, [records]);

  // 클릭 핸들러
  const handleClick = useCallback(() => {
    if (gameState.state === "waiting" || gameState.state === "ready") {
      startGame();
    } else {
      endGame();
    }
  }, [gameState.state, startGame, endGame]);

  return (
    <div className="game-container">
      <div className="game-header">
        <h2>반응속도 테스트</h2>
        {stats && (
          <div className="stats">
            <div className="stat-item">
              <span className="stat-label">최고 기록</span>
              <span className="stat-value">{bestRecord}ms</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">평균</span>
              <span className="stat-value">{stats.average}ms</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">시도 횟수</span>
              <span className="stat-value">{stats.attempts}</span>
            </div>
          </div>
        )}
      </div>

      <div
        className={`game-box ${reactionClass}`}
        style={{ backgroundColor: COLORS[gameState.state] }}
        onClick={handleClick}
      >
        <p className="game-message">{gameState.message}</p>
      </div>

      {gameState.state === "finished" && (
        <button className="reset-button" onClick={resetGame}>
          다시 시도
        </button>
      )}

      {stats && (
        <div className="records-list">
          <h3>기록</h3>
          <div className="records-grid">
            {stats.recentRecords.map((record, index) => (
              <div key={`${record}-${index}`} className="record-item">
                {record}ms
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReactionGame;
