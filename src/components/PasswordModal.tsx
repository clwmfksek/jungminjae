import { useState } from 'react';
import './PasswordModal.css';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (password: string) => void;
  title: string;
}

export default function PasswordModal({ isOpen, onClose, onSubmit, title }: PasswordModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('비밀번호를 입력해주세요.');
      return;
    }
    onSubmit(password.trim());
    setPassword('');
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>{title}</h3>
        {error && <p className="modal-error">{error}</p>}
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호를 입력하세요"
            className="modal-input"
            autoFocus
          />
          <div className="modal-buttons">
            <button type="button" onClick={onClose} className="modal-button cancel">
              취소
            </button>
            <button type="submit" className="modal-button submit">
              확인
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 