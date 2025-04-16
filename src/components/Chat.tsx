import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation, Navigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import "./Chat.css";
import PasswordModal from "./PasswordModal";
import { debounce } from "lodash";
import type { Database } from "../types/supabase";

type Message = Database["public"]["Tables"]["messages"]["Row"];

const MESSAGES_PER_PAGE = 20;
const RESET_PASSWORD = import.meta.env.VITE_RESET_PASSWORD || "1234";
const SCROLL_THRESHOLD = 100;
const DEBOUNCE_DELAY = 150;

export default function Chat() {
  const { state } = useAuth();
  const user = state.user;

  // 로그인하지 않은 경우 로그인 페이지로 리다이렉트
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<
    "연결 중..." | "연결됨" | "연결 끊김"
  >("연결 중...");
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);

  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const channelRef = useRef<any>(null);
  const location = useLocation();

  // 메시지 캐시 관리
  const messageCache = useRef<Map<string, Message>>(new Map());

  // 스크롤 위치 계산
  const isNearBottom = useCallback(() => {
    if (!chatMessagesRef.current) return true;
    const { scrollHeight, scrollTop, clientHeight } = chatMessagesRef.current;
    return scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD;
  }, []);

  // 스크롤을 맨 아래로
  const scrollToBottom = useCallback(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, []);

  // 초기 메시지 로드
  const fetchInitialMessages = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(MESSAGES_PER_PAGE);

      if (error) throw error;

      if (data) {
        const uniqueMessages = data.filter(
          (msg) => !messageCache.current.has(msg.id)
        );

        uniqueMessages.forEach((msg) => messageCache.current.set(msg.id, msg));
        setMessages((prev) => {
          const newMessages = [...prev];
          uniqueMessages.forEach((msg) => {
            if (!newMessages.some((m) => m.id === msg.id)) {
              newMessages.push(msg);
            }
          });
          return newMessages;
        });

        setHasMore(data.length === MESSAGES_PER_PAGE);
      }
    } catch (error) {
      console.error("메시지 로딩 중 오류:", error);
      setError("메시지를 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  // 실시간 구독 최적화
  useEffect(() => {
    let isSubscribed = true;

    const setupRealtimeSubscription = async () => {
      try {
        // 기존 구독이 있다면 제거
        if (channelRef.current) {
          await channelRef.current.unsubscribe();
        }

        const channel = supabase.channel("messages").on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "messages",
          },
          (payload) => {
            if (!isSubscribed) return;

            if (payload.eventType === "INSERT") {
              const newMessage = payload.new as Message;
              if (!messageCache.current.has(newMessage.id)) {
                messageCache.current.set(newMessage.id, newMessage);
                setMessages((prev) => [...prev, newMessage]);
                if (shouldScrollToBottom) {
                  setTimeout(scrollToBottom, 100);
                }
              }
            }
          }
        );

        // 구독 상태 처리
        channel.subscribe(async (status) => {
          if (!isSubscribed) return;

          if (status === "SUBSCRIBED") {
            setConnectionStatus("연결됨");
            // 구독 성공 후 초기 메시지 로드
            await fetchInitialMessages();
          } else {
            setConnectionStatus("연결 끊김");
            // 재연결 시도
            setTimeout(setupRealtimeSubscription, 3000);
          }
        });

        channelRef.current = channel;
      } catch (error) {
        console.error("실시간 구독 설정 오류:", error);
        if (isSubscribed) {
          setConnectionStatus("연결 끊김");
          // 에러 발생 시 재연결 시도
          setTimeout(setupRealtimeSubscription, 3000);
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
  }, [fetchInitialMessages, shouldScrollToBottom, scrollToBottom]);

  // 메시지 전송 최적화
  const sendMessage = useCallback(
    async (content: string) => {
      if (!user || !content.trim()) return;

      try {
        const messageData = {
          content: content.trim(),
          user_name: user.properties.nickname,
          user_id: user.supabaseId,
          profile_image: user.properties.profile_image || null,
        };

        const { data, error } = await supabase
          .from("messages")
          .insert([messageData])
          .select()
          .single();

        if (error) {
          console.error("메시지 전송 오류:", error);
          throw error;
        }

        // 전송 성공 시 로컬 상태 업데이트
        if (data) {
          messageCache.current.set(data.id, data);
          setMessages((prev) => [...prev, data]);
          if (shouldScrollToBottom) {
            setTimeout(scrollToBottom, 100);
          }
        }
      } catch (err) {
        console.error("메시지 전송 실패:", err);
        throw err;
      }
    },
    [user, shouldScrollToBottom, scrollToBottom]
  );

  // 초기 메시지 로드는 컴포넌트 마운트 시 한 번만 실행
  useEffect(() => {
    let isSubscribed = true;

    const loadInitialMessages = async () => {
      try {
        await fetchInitialMessages();
      } catch (error) {
        if (isSubscribed) {
          console.error("초기 메시지 로딩 실패:", error);
          setError("메시지를 불러오는데 실패했습니다.");
        }
      }
    };

    loadInitialMessages();

    return () => {
      isSubscribed = false;
    };
  }, []);

  // 이전 메시지 로드
  const fetchPreviousMessages = useCallback(async () => {
    if (isLoading || !hasMore || messages.length === 0) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: false })
        .lt("created_at", messages[0].created_at)
        .limit(MESSAGES_PER_PAGE);

      if (error) throw error;

      if (data) {
        const reversedData = data.reverse() as Message[];
        setMessages((prev) => [...reversedData, ...prev]);
        setHasMore(data.length === MESSAGES_PER_PAGE);

        // 메시지 캐시 업데이트
        reversedData.forEach((msg) => messageCache.current.set(msg.id, msg));
      }
    } catch (error) {
      console.error("이전 메시지 로딩 중 오류:", error);
      setError("이전 메시지를 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, hasMore, messages]);

  // 채팅 초기화
  const handleChatReset = async (password: string) => {
    if (password !== RESET_PASSWORD) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    try {
      // 모든 메시지 삭제 시도
      const { error: deleteError } = await supabase
        .from("messages")
        .delete()
        .gt("id", "0"); // 모든 레코드 선택

      if (deleteError) {
        console.error("삭제 에러:", deleteError);
        throw deleteError;
      }

      // 로컬 상태 초기화
      setMessages([]);
      messageCache.current.clear();
      setIsResetModalOpen(false);
      setError(null);

      // 다른 클라이언트들에게 초기화 알림
      const channel = supabase.channel("chat_reset");
      await channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.send({
            type: "broadcast",
            event: "chat_reset",
            payload: { timestamp: new Date().toISOString() },
          });
          channel.unsubscribe();
        }
      });
    } catch (error: any) {
      console.error("채팅 초기화 중 오류:", error);
      setError(
        error?.message ||
          "채팅 초기화에 실패했습니다. 잠시 후 다시 시도해주세요."
      );
    }
  };

  // 채팅 초기화 이벤트 구독
  useEffect(() => {
    const resetChannel = supabase.channel("chat_reset");

    resetChannel
      .on("broadcast", { event: "chat_reset" }, () => {
        // 다른 클라이언트에서 초기화가 발생했을 때
        setMessages([]);
        messageCache.current.clear();
      })
      .subscribe();

    return () => {
      resetChannel.unsubscribe();
    };
  }, []);

  // 스크롤 이벤트 핸들러
  const handleScroll = useCallback(
    debounce(() => {
      if (!chatMessagesRef.current) return;

      const { scrollTop } = chatMessagesRef.current;
      if (scrollTop === 0) {
        fetchPreviousMessages();
      }

      setShouldScrollToBottom(isNearBottom());
    }, DEBOUNCE_DELAY),
    [fetchPreviousMessages, isNearBottom]
  );

  // 스크롤 이벤트 리스너
  useEffect(() => {
    const messagesDiv = chatMessagesRef.current;
    if (messagesDiv) {
      messagesDiv.addEventListener("scroll", handleScroll);
      return () => messagesDiv.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);

  // 새 메시지 도착 시 스크롤
  useEffect(() => {
    if (shouldScrollToBottom) {
      scrollToBottom();
    }
  }, [messages, shouldScrollToBottom, scrollToBottom]);

  // 폼 제출 핸들러
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedMessage = newMessage.trim();

      if (!trimmedMessage || !user) return;

      setNewMessage("");
      setShouldScrollToBottom(true);
      setTimeout(scrollToBottom, 100);

      try {
        await sendMessage(trimmedMessage);
      } catch (err) {
        setError("메시지 전송에 실패했습니다.");
        setNewMessage(trimmedMessage);
      }
    },
    [newMessage, user, sendMessage, scrollToBottom]
  );

  // 페이지 진입 시 스크롤 처리
  useEffect(() => {
    if (location.pathname === "/chat") {
      setTimeout(scrollToBottom, 100);
    }
  }, [location.pathname, scrollToBottom]);

  // 사용자 이름 저장
  useEffect(() => {
    if (user) {
      localStorage.setItem("chat_username", user.properties.nickname);
    }
  }, [user]);

  // 메시지 렌더링 최적화
  const renderMessages = useMemo(() => {
    return messages.map((message, index) => (
      <div
        key={message.id}
        ref={index === messages.length - 1 ? lastMessageRef : undefined}
        className={`chat-message ${
          message.user_id === message.id ? "my-message" : ""
        }`}
      >
        <div className="message-header">
          {message.profile_image && (
            <img
              src={message.profile_image}
              alt={message.user_name}
              className="message-profile-image"
            />
          )}
          <strong>{message.user_name}</strong>
        </div>
        <div className="message-content">{message.content}</div>
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
            <span
              className={`connection-status ${
                connectionStatus === "연결됨"
                  ? "connected"
                  : connectionStatus === "연결 끊김"
                  ? "disconnected"
                  : ""
              }`}
            >
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
