import { FC } from 'react';
import { CounterState } from '../types/counter';
import './Counter.css';

interface CounterProps extends CounterState {
  onIncrement: () => Promise<void>;
  onReset: () => Promise<void>;
}

const Counter: FC<CounterProps> = ({
  count,
  onIncrement,
  onReset,
  error,
  isLoading
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
          <button 
            onClick={onIncrement} 
            className="action-button primary"
            disabled={isLoading}
          >
            {isLoading ? '처리중...' : '날먹하기'}
          </button>
          <button 
            onClick={onReset} 
            className="action-button secondary"
            disabled={isLoading}
          >
            리셋
          </button>
        </div>
      </div>
    </div>
  );
};

export default Counter; 