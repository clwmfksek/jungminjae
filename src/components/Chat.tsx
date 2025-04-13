import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import './Chat.css';

interface Message {
  id: string;
  content: string;
  user_name: string;
  created_at: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [userName, setUserName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(data || []);
        scrollToBottom();
      } catch (err) {
        console.error('Error fetching messages:', err);
        setError('메시지를 불러오는데 실패했습니다.');
      }
    };

    fetchMessages();

    const channel = supabase
      .channel('messages')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !userName.trim()) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert([
          {
            content: newMessage.trim(),
            user_name: userName.trim(),
          },
        ]);

      if (error) throw error;
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      setError('메시지 전송에 실패했습니다.');
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>실시간 채팅</h2>
      </div>
      <div className="chat-messages">
        {messages.map((message) => (
          <div key={message.id} className="chat-message">
            <strong>{message.user_name}:</strong> {message.content}
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
    </div>
  );
} 