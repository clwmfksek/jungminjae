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

  const fetchMessages = useCallback(async () => {
    if (isLoading || !hasMore) return;
    
    setIsLoading(true);
    try {
      const from = messages.length;
      const to = from + MESSAGES_PER_PAGE - 1;
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);
        
      if (error) throw error;
      
      if (data) {
        setMessages(prev => [...prev, ...data]);
        setHasMore(data.length === MESSAGES_PER_PAGE);
        // 메시지 로딩 완료 후 스크롤을 맨 아래로 이동
        setTimeout(() => {
          chatContainerRef.current?.scrollTo({
            top: chatContainerRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }, 100);
      }
    } catch (error) {
      console.error('메시지 로딩 중 오류:', error);
    } finally {
      setIsLoading(false);
    }
  }, [messages.length, isLoading, hasMore]);

  // 스크롤 이벤트 핸들러 추가
  useEffect(() => {
    const chatContainer = chatContainerRef.current;
    if (!chatContainer) return;

    let isScrolling: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(isScrolling);
      isScrolling = setTimeout(() => {
        const { scrollTop } = chatContainer;
        // 스크롤이 맨 위에 도달했을 때만 새로운 메시지를 로드
        if (scrollTop === 0 && !isLoading && hasMore) {
          fetchMessages();
        }
      }, 150);
    };

    chatContainer.addEventListener('scroll', handleScroll);
    return () => {
      chatContainer.removeEventListener('scroll', handleScroll);
      clearTimeout(isScrolling);
    };
  }, [fetchMessages, isLoading, hasMore]);

  // 컴포넌트 마운트 시와 메시지 업데이트 시 스크롤 최하단으로
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel('messages-channel', {
        config: {
          broadcast: { self: true },
          presence: { key: 'chat-app' }
        }
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => {
            const isDuplicate = prev.some(msg => msg.id === newMessage.id);
            if (isDuplicate) return prev;
            const updatedMessages = [...prev, newMessage];
            return updatedMessages.slice(-100);
          });
          scrollToBottom(); // 새 메시지 수신 시 항상 스크롤 아래로
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
          setShouldScrollToBottom(true);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('실시간 연결 성공');
          setConnectionStatus('연결됨');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          console.log('연결 끊김, 재연결 시도...');
          setTimeout(() => {
            channel.subscribe();
          }, 3000);
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [fetchMessages, scrollToBottom, shouldScrollToBottom]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !isLoading) {
          fetchMessages();
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

      if (data) {
        setMessages(prev => [...prev, data]);
        setShouldScrollToBottom(true);
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
      
      // 초기화 이벤트 브로드캐스트
      await supabase.channel('reset-events').send({
        type: 'broadcast',
        event: 'chat-reset',
        payload: {}
      });
      
      setMessages([]);
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

  // 컴포넌트 언마운트 시
  useEffect(() => {
    const channelInstance = supabase.channel('messages-channel');
    return () => {
      channelInstance.unsubscribe();
    };
  }, []);

  return (
    <div className="chat-container" ref={chatContainerRef}>
      <div className="chat-header">
        <div className="chat-header-content">
          <h2>실시간 채팅</h2>
          <div className="chat-controls">
            <span className={`connection-status ${connectionStatus === '연결됨' ? 'connected' : connectionStatus === '연결 끊김' ? 'disconnected' : ''}`}>
              {connectionStatus}
            </span>
            <button 
              onClick={() => setIsResetModalOpen(true)}
              className="chat-reset-button"
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
          <div key={message.id} className="chat-message">
            <strong>{message.user_name}:</strong> {message.content}
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