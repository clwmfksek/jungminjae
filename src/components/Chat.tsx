import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import './Chat.css';
import PasswordModal from './PasswordModal';
import { useLocation } from 'react-router-dom';

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
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem('chat_username') || '';
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'연결 중...' | '연결됨' | '연결 끊김'>('연결 중...');
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (shouldScrollToBottom && chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [shouldScrollToBottom]);

  const handleScroll = useCallback(() => {
    if (chatMessagesRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatMessagesRef.current;
      const isNearBottom = scrollHeight - (scrollTop + clientHeight) < 100;
      setShouldScrollToBottom(isNearBottom);
    }
  }, []);

  useEffect(() => {
    const chatMessages = chatMessagesRef.current;
    if (chatMessages) {
      chatMessages.addEventListener('scroll', handleScroll);
      return () => chatMessages.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

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
      
      if (data) {
        const newMsg = data as Message;
        setMessages(prev => [...prev, newMsg]);
        setNewMessage('');
        setShouldScrollToBottom(true);
        setTimeout(scrollToBottom, 100);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('메시지 전송에 실패했습니다.');
    }
  };

  // 실시간 메시지 및 초기화 이벤트 구독
  useEffect(() => {
    // 메시지 변경사항을 구독하는 채널
    const messageChannel = supabase
      .channel('messages-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => {
            const isDuplicate = prev.some(msg => 
              msg.id === newMessage.id || 
              (msg.content === newMessage.content && 
               msg.user_name === newMessage.user_name && 
               msg.created_at === newMessage.created_at)
            );
            if (isDuplicate) return prev;
            return [...prev, newMessage];
          });
          
          if (shouldScrollToBottom) {
            setTimeout(scrollToBottom, 100);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('실시간 연결 성공');
          setConnectionStatus('연결됨');
          // 구독 성공 후 초기 메시지 로드
          fetchInitialMessages();
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          console.log('연결 끊김, 재연결 시도...');
          setConnectionStatus('연결 끊김');
          setTimeout(() => {
            messageChannel.subscribe();
          }, 3000);
        }
      });

    // 초기화 이벤트를 구독하는 채널
    const resetChannel = supabase
      .channel('reset-channel')
      .on(
        'broadcast',
        { event: 'chat-reset' },
        () => {
          console.log('채팅 초기화 이벤트 수신');
          setMessages([]);
        }
      )
      .subscribe();

    return () => {
      messageChannel.unsubscribe();
      resetChannel.unsubscribe();
    };
  }, [scrollToBottom, shouldScrollToBottom]);

  // 컴포넌트 마운트 시와 메시지 업데이트 시 스크롤 최하단으로
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  // 초기 메시지 로드 함수
  const fetchInitialMessages = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(MESSAGES_PER_PAGE);
        
      if (error) throw error;
      
      if (data) {
        setMessages(data);
        setHasMore(data.length === MESSAGES_PER_PAGE);
      }
    } catch (error) {
      console.error('메시지 로딩 중 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 이전 메시지 로드
  const fetchMoreMessages = async () => {
    if (isLoading || !hasMore) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true })
        .range(messages.length, messages.length + MESSAGES_PER_PAGE - 1);
        
      if (error) throw error;
      
      if (data) {
        setMessages(prev => [...prev, ...data]);
        setHasMore(data.length === MESSAGES_PER_PAGE);
      }
    } catch (error) {
      console.error('메시지 로딩 중 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Intersection Observer 설정
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !isLoading) {
          fetchMoreMessages();
        }
      },
      { 
        threshold: 0.5,
        rootMargin: '100px'
      }
    );

    const currentRef = loadingRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasMore, isLoading]);

  const handleChatReset = async (password: string) => {
    if (password !== RESET_PASSWORD) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }

    try {
      // 먼저 브로드캐스트로 초기화 이벤트 전송
      await supabase
        .channel('reset-channel')
        .send({
          type: 'broadcast',
          event: 'chat-reset',
          payload: {}
        });

      // 그 다음 실제 데이터베이스에서 메시지 삭제
      const { error } = await supabase
        .from('messages')
        .delete()
        .not('id', 'is', null);

      if (error) {
        console.error('Delete error:', error);
        throw error;
      }
      
      setIsResetModalOpen(false);
    } catch (err) {
      console.error('Error resetting chat:', err);
      setError('채팅 초기화에 실패했습니다. ' + (err instanceof Error ? err.message : '알 수 없는 오류'));
    }
  };

  // 사용자 이름 저장
  useEffect(() => {
    if (userName) {
      localStorage.setItem('chat_username', userName);
    }
  }, [userName]);

  // 라우트 변경 시 채팅 컴포넌트 스크롤 초기화
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [location]);

  return (
    <div className="chat-container" ref={chatContainerRef}>
      <div className="chat-header">
        <div className="chat-header-content">
          <h2>실시간 채팅</h2>
          <div className="chat-controls">
            <span className={`connection-status ${
              connectionStatus === '연결됨' 
                ? 'connected' 
                : connectionStatus === '연결 끊김' 
                  ? 'disconnected' 
                  : ''
            }`}>
              {connectionStatus}
            </span>
            <button 
              onClick={() => setIsResetModalOpen(true)}
              className="chat-reset-button"
              aria-label="채팅 초기화"
            >
              채팅 초기화
            </button>
          </div>
        </div>
      </div>
      <div className="chat-messages" ref={chatMessagesRef}>
        <div ref={loadingRef} className="loading-trigger">
          {isLoading && <div className="loading">메시지 불러오는 중...</div>}
        </div>
        {messages.map((message) => (
          <div 
            key={message.id} 
            className="chat-message"
          >
            <strong>{message.user_name}</strong>
            {message.content}
            <span className="message-time">
              {new Date(message.created_at).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit} className="chat-form">
        <input
          type="text"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="이름"
          className="chat-input"
          required
          maxLength={20}
        />
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="메시지를 입력하세요"
          className="chat-input"
          required
        />
        <button type="submit" className="chat-submit">
          전송
        </button>
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