import { FC } from 'react';
import './Counter.css';

interface CounterProps {
  count: number;
  onIncrement: () => void;
  onReset: () => void;
  error: string | null;
}

const Counter: FC<CounterProps> = ({
  count,
  onIncrement,
  onReset,
  error
}) => {
  return (
    <div className="counter-section">
      <div className="counter-header">
        <h1>날먹 카운터</h1>
      </div>

      {error && (
        <div className="error-banner">
          에러: {error}
        </div>
      )}

      <div className="counter-content">
        <div className="count-display">
          <span className="count-number">{count}</span>
          <span className="count-unit">회</span>
        </div>

        <div className="counter-actions">
          <button onClick={onIncrement} className="action-button primary">
            날먹하기
          </button>
          <button onClick={onReset} className="action-button secondary">
            리셋
          </button>
        </div>
      </div>
    </div>
  );
};

export default Counter; 