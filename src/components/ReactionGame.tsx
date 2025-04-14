import { useState, useEffect, useCallback, useMemo } from 'react';
import './ReactionGame.css';

interface GameState {
  state: 'waiting' | 'ready' | 'now' | 'finished';
  message: string;
  startTime: number;
  endTime: number;
}

interface Firework {
  id: number;
  x: string | number;
  y: string | number;
}

const INITIAL_STATE: GameState = {
  state: 'waiting',
  message: '시작하려면 클릭하세요',
  startTime: 0,
  endTime: 0,
};

const COLORS = {
  waiting: 'var(--bg-secondary)',
  ready: '#ef4444',
  now: '#22c55e',
  finished: 'var(--bg-secondary)',
} as const;

const ReactionGame = () => {
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const [records, setRecords] = useState<number[]>(() => {
    const savedRecords = localStorage.getItem('reactionGameRecords');
    return savedRecords ? JSON.parse(savedRecords) : [];
  });
  const [bestRecord, setBestRecord] = useState<number | null>(() => {
    const savedBest = localStorage.getItem('reactionGameBest');
    return savedBest ? Number(savedBest) : null;
  });
  const [fireworks, setFireworks] = useState<Firework[]>([]);

  // 폭죽 생성 함수
  const createFireworks = useCallback((isEnterKey: boolean) => {
    if (!isEnterKey) return;

    const gameBox = document.querySelector('.game-box');
    if (!gameBox) return;

    const rect = gameBox.getBoundingClientRect();
    const newFireworks: Firework[] = [];
    const numFireworks = 12;

    for (let i = 0; i < numFireworks; i++) {
      newFireworks.push({
        id: Date.now() + i,
        x: '50%',  // CSS의 50%를 사용하여 중앙에 위치
        y: '50%',  // CSS의 50%를 사용하여 중앙에 위치
      });
    }

    setFireworks(newFireworks);
    setTimeout(() => setFireworks([]), 800);
  }, []);

  // 게임 시작 핸들러
  const startGame = useCallback(() => {
    if (gameState.state !== 'waiting') return;

    setGameState(prev => ({
      ...prev,
      state: 'ready',
      message: '초록색으로 변할 때 클릭하세요!',
    }));

    const delay = Math.floor(Math.random() * 2000) + 2000;
    const timeout = setTimeout(() => {
      setGameState(prev => ({
        ...prev,
        state: 'now',
        startTime: Date.now(),
        message: '지금 클릭하세요!',
      }));
    }, delay);

    return () => clearTimeout(timeout);
  }, [gameState.state]);

  // 게임 종료 핸들러
  const endGame = useCallback((isEnterKey: boolean = false) => {
    if (gameState.state === 'now') {
      const currentTime = Date.now();
      const reactionTime = currentTime - gameState.startTime;
      
      setGameState(prev => ({
        ...prev,
        state: 'finished',
        endTime: currentTime,
        message: `반응 속도: ${reactionTime}ms`,
      }));

      setRecords(prev => {
        const newRecords = [...prev, reactionTime];
        localStorage.setItem('reactionGameRecords', JSON.stringify(newRecords));
        return newRecords;
      });

      if (!bestRecord || reactionTime < bestRecord) {
        setBestRecord(reactionTime);
        localStorage.setItem('reactionGameBest', reactionTime.toString());
        createFireworks(isEnterKey);
      }
    } else if (gameState.state === 'ready') {
      setGameState({
        ...INITIAL_STATE,
        message: '너무 일찍 클릭했습니다! 다시 시도하려면 클릭하세요.',
      });
    }
  }, [gameState.state, gameState.startTime, bestRecord, createFireworks]);

  // 키보드 이벤트 핸들러
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (gameState.state === 'waiting' || gameState.state === 'ready') {
          startGame();
        } else {
          endGame(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState.state, startGame, endGame]);

  // 게임 리셋 핸들러
  const resetGame = useCallback(() => {
    setGameState(INITIAL_STATE);
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
    if (gameState.state === 'waiting' || gameState.state === 'ready') {
      startGame();
    } else {
      endGame(false);
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
        className="game-box"
        style={{ backgroundColor: COLORS[gameState.state], position: 'relative' }}
        onClick={handleClick}
      >
        <div className="firework-container">
          {fireworks.map(firework => (
            <div
              key={firework.id}
              className="firework"
              style={{
                left: firework.x,
                top: firework.y
              }}
            />
          ))}
        </div>
        <p className="game-message">{gameState.message}</p>
      </div>

      {gameState.state === 'finished' && (
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