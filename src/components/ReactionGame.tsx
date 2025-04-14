import { useState, useEffect, useCallback } from 'react';
import './ReactionGame.css';

const ReactionGame = () => {
  const [state, setState] = useState<'waiting' | 'ready' | 'now' | 'finished'>('waiting');
  const [message, setMessage] = useState('시작하려면 클릭하세요');
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [records, setRecords] = useState<number[]>([]);
  const [bestRecord, setBestRecord] = useState<number | null>(null);

  const startGame = useCallback(() => {
    if (state === 'waiting') {
      setState('ready');
      setMessage('초록색으로 변할 때 클릭하세요!');
      const timeout = setTimeout(() => {
        setState('now');
        setStartTime(Date.now());
        setMessage('지금 클릭하세요!');
      }, Math.floor(Math.random() * 2000) + 2000);
      return () => clearTimeout(timeout);
    }
  }, [state]);

  const endGame = useCallback(() => {
    if (state === 'now') {
      const endTime = Date.now();
      const reactionTime = endTime - startTime;
      setEndTime(endTime);
      setState('finished');
      setMessage(`반응 속도: ${reactionTime}ms`);
      setRecords(prev => [...prev, reactionTime]);
      if (!bestRecord || reactionTime < bestRecord) {
        setBestRecord(reactionTime);
      }
    } else if (state === 'ready') {
      setState('waiting');
      setMessage('너무 일찍 클릭했습니다! 다시 시도하려면 클릭하세요.');
    }
  }, [state, startTime, bestRecord]);

  const getBackgroundColor = () => {
    switch (state) {
      case 'waiting':
        return 'var(--bg-secondary)';
      case 'ready':
        return '#ef4444';
      case 'now':
        return '#22c55e';
      case 'finished':
        return 'var(--bg-secondary)';
      default:
        return 'var(--bg-secondary)';
    }
  };

  const resetGame = () => {
    setState('waiting');
    setMessage('시작하려면 클릭하세요');
  };

  const averageTime = records.length > 0 
    ? Math.round(records.reduce((a, b) => a + b, 0) / records.length) 
    : 0;

  return (
    <div className="game-container">
      <div className="game-header">
        <h2>반응속도 테스트</h2>
        {records.length > 0 && (
          <div className="stats">
            <div className="stat-item">
              <span className="stat-label">최고 기록</span>
              <span className="stat-value">{bestRecord}ms</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">평균</span>
              <span className="stat-value">{averageTime}ms</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">시도 횟수</span>
              <span className="stat-value">{records.length}</span>
            </div>
          </div>
        )}
      </div>

      <div 
        className="game-box"
        style={{ backgroundColor: getBackgroundColor() }}
        onClick={state === 'waiting' || state === 'ready' ? startGame : endGame}
      >
        <p className="game-message">{message}</p>
      </div>

      {state === 'finished' && (
        <button className="reset-button" onClick={resetGame}>
          다시 시도
        </button>
      )}

      {records.length > 0 && (
        <div className="records-list">
          <h3>기록</h3>
          <div className="records-grid">
            {records.slice(-5).map((record, index) => (
              <div key={index} className="record-item">
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