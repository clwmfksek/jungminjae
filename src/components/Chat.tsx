import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import './Chat.css';
import PasswordModal from './PasswordModal';

interface Message {
  id: string;
  content: string;
  user_name: string;
  created_at: string;
}

const MESSAGES_PER_PAGE = 20;
const RESET_PASSWORD = import.meta.env.VITE_RESET_PASSWORD || '1234';

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [userName, setUserName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver>();
  const loadingRef = useRef<HTMLDivElement>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const fetchMessages = useCallback(async (isInitial = false) => {
    try {
      setIsLoading(true);
      const from = isInitial ? 0 : messages.length;
      const to = from + MESSAGES_PER_PAGE - 1;

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true })
        .range(from, to);

      if (error) throw error;

      const newMessages = data || [];
      setHasMore(newMessages.length === MESSAGES_PER_PAGE);
      
      setMessages(prev => {
        if (isInitial) return newMessages;
        // 중복 메시지 제거
        const uniqueMessages = newMessages.filter(
          newMsg => !prev.some(prevMsg => prevMsg.id === newMsg.id)
        );
        return [...prev, ...uniqueMessages];
      });

      if (isInitial) {
        setTimeout(scrollToBottom, 100);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('메시지를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [messages.length, scrollToBottom]);

  useEffect(() => {
    // 초기 메시지 로드
    fetchMessages(true);

    // 실시간 구독 설정
    const channel = supabase
      .channel('messages-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMessage = payload.new as Message;
          // 자신이 보낸 메시지는 이미 화면에 표시되어 있으므로 무시
          setMessages(prev => {
            const isDuplicate = prev.some(msg => msg.id === newMessage.id);
            if (isDuplicate) return prev;
            return [...prev, newMessage];
          });
          scrollToBottom();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
        },
        () => {
          setMessages([]);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('실시간 채팅 연결됨');
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [fetchMessages, scrollToBottom]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !isLoading) {
          fetchMessages();
        }
      },
      { threshold: 0.1 }
    );

    if (loadingRef.current) {
      observer.observe(loadingRef.current);
    }

    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [fetchMessages, hasMore, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !userName.trim()) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            content: newMessage.trim(),
            user_name: userName.trim(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // 서버에서 받은 응답으로 메시지 추가
      if (data) {
        setMessages(prev => [...prev, data]);
        scrollToBottom();
      }
      
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      setError('메시지 전송에 실패했습니다.');
    }
  };

  const handleChatReset = async (password: string) => {
    if (password !== RESET_PASSWORD) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }

    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .not('id', 'is', null); // 모든 메시지 삭제

      if (error) {
        console.error('Delete error:', error);
        throw error;
      }
      
      setMessages([]);
      setIsResetModalOpen(false);
    } catch (err) {
      console.error('Error resetting chat:', err);
      setError('채팅 초기화에 실패했습니다. ' + (err instanceof Error ? err.message : '알 수 없는 오류'));
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="chat-header-content">
          <h2>실시간 채팅</h2>
          <button 
            onClick={() => setIsResetModalOpen(true)}
            className="chat-reset-button"
          >
            채팅 초기화
          </button>
        </div>
      </div>
      <div className="chat-messages">
        <div ref={loadingRef} className="loading-trigger">
          {isLoading && <div className="loading">메시지 불러오는 중...</div>}
        </div>
        {messages.map((message) => (
          <div key={message.id} className="chat-message">
            <strong>{message.user_name}:</strong> {message.content}
            <span className="message-time">
              {new Date(message.created_at).toLocaleTimeString()}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit} className="chat-form">
        <input
          type="text"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="이름을 입력하세요"
          className="chat-input name-input"
          required
        />
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="메시지를 입력하세요"
          className="chat-input message-input"
          required
        />
        <button type="submit" className="chat-submit">전송</button>
      </form>
      <PasswordModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onSubmit={handleChatReset}
        title="채팅 초기화 비밀번호 입력"
      />
    </div>
  );
} 