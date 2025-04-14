import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './Chat.css';
import PasswordModal from './PasswordModal';
import { debounce } from 'lodash';

interface Message {
  id: string;
  content: string;
  user_name: string;
  created_at: string;
}

const MESSAGES_PER_PAGE = 20;
const RESET_PASSWORD = import.meta.env.VITE_RESET_PASSWORD || '1234';
const SCROLL_THRESHOLD = 100;
const DEBOUNCE_DELAY = 150;

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [userName, setUserName] = useState(() => localStorage.getItem('chat_username') || '');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'연결 중...' | '연결됨' | '연결 끊김'>('연결 중...');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);

  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const channelRef = useRef<any>(null);
  const location = useLocation();

  // 메시지 캐시 관리
  const messageCache = useRef<Map<string, Message>>(new Map());

  // 스크롤 최적화
  const scrollToBottom = useCallback(() => {
    if (shouldScrollToBottom && lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [shouldScrollToBottom]);

  // 스크롤 이벤트 최적화
  const handleScroll = useMemo(
    () =>
      debounce(() => {
        if (!chatMessagesRef.current) return;
        
        const { scrollTop, scrollHeight, clientHeight } = chatMessagesRef.current;
        const isNearBottom = scrollHeight - (scrollTop + clientHeight) < SCROLL_THRESHOLD;
        setShouldScrollToBottom(isNearBottom);
      }, DEBOUNCE_DELAY),
    []
  );

  // 메시지 전송 최적화
  const sendMessage = useCallback(async (content: string, userName: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .insert([{ content, user_name: userName }]);

      if (error) throw error;
    } catch (err) {
      console.error('Error sending message:', err);
      throw err;
    }
  }, []);

  // 폼 제출 핸들러 최적화
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedMessage = newMessage.trim();
    const trimmedUserName = userName.trim();
    
    if (!trimmedMessage || !trimmedUserName) return;

    setNewMessage(''); // 즉시 입력창 초기화
    
    try {
      await sendMessage(trimmedMessage, trimmedUserName);
    } catch (err) {
      setError('메시지 전송에 실패했습니다.');
      setNewMessage(trimmedMessage); // 실패 시 메시지 복구
    }
  }, [newMessage, userName, sendMessage]);

  // 초기 메시지 로드 최적화
  const fetchInitialMessages = useCallback(async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(MESSAGES_PER_PAGE);
        
      if (error) throw error;
      
      if (data) {
        const reversedData = data.reverse();
        setMessages(reversedData);
        setHasMore(data.length === MESSAGES_PER_PAGE);
        
        // 메시지 캐시 업데이트
        reversedData.forEach(msg => messageCache.current.set(msg.id, msg));
      }
    } catch (error) {
      console.error('메시지 로딩 중 오류:', error);
      setError('메시지를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  // 이전 메시지 로드 최적화
  const fetchMoreMessages = useCallback(async () => {
    if (isLoading || !hasMore || messages.length === 0) return;
    
    setIsLoading(true);
    try {
      const oldestMessage = messages[0];
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .lt('created_at', oldestMessage.created_at)
        .limit(MESSAGES_PER_PAGE);
        
      if (error) throw error;
      
      if (data) {
        const newMessages = data.reverse();
        setMessages(prev => [...newMessages, ...prev]);
        setHasMore(data.length === MESSAGES_PER_PAGE);
        
        // 메시지 캐시 업데이트
        newMessages.forEach(msg => messageCache.current.set(msg.id, msg));
      }
    } catch (error) {
      console.error('메시지 로딩 중 오류:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, hasMore, messages]);

  // Intersection Observer 최적화
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !isLoading) {
          fetchMoreMessages();
        }
      },
      { threshold: 0.5, rootMargin: '100px' }
    );

    if (messages.length > 0) {
      const firstMessage = chatMessagesRef.current?.firstElementChild;
      if (firstMessage) {
        observer.observe(firstMessage);
      }
    }

    return () => observer.disconnect();
  }, [fetchMoreMessages, hasMore, isLoading, messages.length]);

  // 실시간 구독 최적화
  useEffect(() => {
    let isSubscribed = true;

    const setupRealtimeSubscription = async () => {
      try {
        await fetchInitialMessages();

        if (!isSubscribed) return;

        channelRef.current = supabase
          .channel('messages-channel')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages'
            },
            (payload) => {
              if (!isSubscribed) return;

              const newMessage = payload.new as Message;
              if (!messageCache.current.has(newMessage.id)) {
                messageCache.current.set(newMessage.id, newMessage);
                setMessages(prev => [...prev, newMessage]);
                
                if (shouldScrollToBottom) {
                  setTimeout(scrollToBottom, 100);
                }
              }
            }
          )
          .subscribe(status => {
            if (!isSubscribed) return;

            if (status === 'SUBSCRIBED') {
              setConnectionStatus('연결됨');
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
              setConnectionStatus('연결 끊김');
              // 재연결 로직
              setTimeout(() => {
                if (isSubscribed && channelRef.current) {
                  channelRef.current.subscribe();
                }
              }, 3000);
            }
          });
      } catch (error) {
        console.error('실시간 구독 설정 오류:', error);
        if (isSubscribed) {
          setConnectionStatus('연결 끊김');
        }
      }
    };

    setupRealtimeSubscription();

    return () => {
      isSubscribed = false;
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [fetchInitialMessages, scrollToBottom, shouldScrollToBottom]);

  // 스크롤 이벤트 리스너
  useEffect(() => {
    const chatMessages = chatMessagesRef.current;
    if (chatMessages) {
      chatMessages.addEventListener('scroll', handleScroll);
      return () => chatMessages.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // 사용자 이름 저장
  useEffect(() => {
    if (userName) {
      localStorage.setItem('chat_username', userName);
    }
  }, [userName]);

  // 채팅 초기화 핸들러
  const handleChatReset = useCallback(async (password: string) => {
    if (password !== RESET_PASSWORD) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }

    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .not('id', 'is', null);

      if (error) throw error;
      
      setMessages([]);
      messageCache.current.clear();
      setIsResetModalOpen(false);
    } catch (err) {
      console.error('Error resetting chat:', err);
      setError('채팅 초기화에 실패했습니다.');
    }
  }, []);

  // 메시지 렌더링 최적화
  const renderMessages = useMemo(() => {
    return messages.map((message, index) => (
      <div
        key={message.id}
        ref={index === messages.length - 1 ? lastMessageRef : undefined}
        className="chat-message"
      >
        <strong>{message.user_name}</strong>
        {message.content}
        <span className="message-time">
          {new Date(message.created_at).toLocaleTimeString()}
        </span>
      </div>
    ));
  }, [messages]);

  return (
    <div className="chat-container">
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
        {isLoading && messages.length === 0 && (
          <div className="loading">메시지를 불러오는 중...</div>
        )}
        {renderMessages}
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