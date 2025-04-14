import { useState, useEffect, useCallback } from "react";
import "./App.css";
import { supabase, CounterRecord } from "./lib/supabase";
import { RealtimeChannel } from "@supabase/supabase-js";
import Chat from './components/Chat'
import PasswordModal from './components/PasswordModal'
import { createConfetti } from './utils/confetti';
import UserInfo from './components/UserInfo';
import { motion } from "framer-motion";

// 테마 타입 정의
type Theme = 'light' | 'dark';

interface PersonCount {
  name: string;
  count: number;
}

function App() {
  const initialPeople: PersonCount[] = [
    { name: "정민재", count: 0 },
    { name: "강지원", count: 0 },
    { name: "박예준", count: 0 },
  ];

  const [people, setPeople] = useState<PersonCount[]>(initialPeople);
  const [confetti, setConfetti] = useState<Array<{
    id: number;
    x: number;
    y: number;
    color: string;
    tx: number;
    ty: number;
    rotation: number;
    type: 'circle' | 'square';
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    return savedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  });
  const RESET_PASSWORD = import.meta.env.VITE_RESET_PASSWORD || '1234';

  // 테마 변경 함수
  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => {
      const newTheme = prevTheme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', newTheme);
      return newTheme;
    });
  }, []);

  // 테마 효과 적용
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const setupRealtimeSubscription = useCallback(async () => {
    const channel = supabase.channel('db-changes', {
      config: {
        broadcast: { self: true },
        presence: { key: 'counter-app' },
      },
    });

    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'counters',
        },
        async (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updatedRecord = payload.new as CounterRecord;
            setPeople(currentPeople => {
              return currentPeople.map(person =>
                person.name === updatedRecord.name
                  ? { ...person, count: updatedRecord.count }
                  : person
              );
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('실시간 채팅 연결됨');
        }
      });

    return channel;
  }, []);

  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);
        await fetchCounts();
        const subscriptionChannel = await setupRealtimeSubscription();
        
        return () => {
          if (subscriptionChannel) {
            subscriptionChannel.unsubscribe();
          }
        };
      } catch (error) {
        setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다');
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [setupRealtimeSubscription]);

  useEffect(() => {
    const channel = supabase.channel('reset-events')
      .on(
        'broadcast',
        { event: 'chat-reset' },
        () => {
          createConfetti(setConfetti);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      createConfetti(setConfetti, e.clientX, e.clientY);
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const fetchCounts = async () => {
    try {
      const { data, error } = await supabase
        .from('counters')
        .select('*')
        .order('name');

      if (error) {
        setError(error.message);
        throw error;
      }

      if (data) {
        if (data.length === 0) {
          await Promise.all(
            initialPeople.map(person =>
              supabase
                .from('counters')
                .insert({ name: person.name, count: 0 })
            )
          );
          setPeople(initialPeople);
        } else {
          setPeople(data.map((record: CounterRecord) => ({
            name: record.name,
            count: record.count
          })));
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다');
      throw error;
    }
  };

  const incrementCount = async (index: number) => {
    try {
      const person = people[index];
      const newCount = person.count + 1;

      setPeople(currentPeople => 
        currentPeople.map((p, i) => 
          i === index ? { ...p, count: newCount } : p
        )
      );

      const { error } = await supabase
        .from('counters')
        .update({ count: newCount })
        .eq('name', person.name);

      if (error) {
        setPeople(currentPeople => 
          currentPeople.map((p, i) => 
            i === index ? { ...p, count: person.count } : p
          )
        );
        setError(error.message);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다');
    }
  };

  const resetCount = async (password: string) => {
    if (password !== RESET_PASSWORD) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }

    try {
      const channel = supabase.channel('db-changes');
      await channel.unsubscribe();

      const { error: counterError } = await supabase
        .from('counters')
        .update({ count: 0 })
        .in('name', people.map(p => p.name));

      if (counterError) throw counterError;

      setPeople(people.map(p => ({ ...p, count: 0 })));
      await setupRealtimeSubscription();
      
      createConfetti(setConfetti);
      setIsResetModalOpen(false);
    } catch (error) {
      console.error('초기화 중 오류:', error);
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다');
      await setupRealtimeSubscription();
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        color: 'var(--text-primary)'
      }}>
        로딩 중...
      </div>
    );
  }

  return (
    <div className="app-container">
      <UserInfo />
      <div className="counter-section">
        <div className="header-controls">
          <h1>날먹 카운터</h1>
          <button onClick={toggleTheme} className="theme-toggle">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
        {error && (
          <div style={{ 
            color: 'red', 
            margin: '10px', 
            padding: '10px', 
            border: '1px solid red',
            borderRadius: '4px'
          }}>
            에러: {error}
          </div>
        )}
        <div className="count-display">{people[0].count}회</div>
        <div className="button-container">
          <button onClick={() => incrementCount(0)} className="increment-button">
            날먹하기
          </button>
          <button onClick={() => setIsResetModalOpen(true)} className="reset-button">
            리셋
          </button>
        </div>
      </div>
      
      <Chat />
      
      <div className="confetti-container">
        {confetti.map(conf => (
          <motion.div
            key={conf.id}
            className={`confetti ${conf.type}`}
            style={{
              backgroundColor: conf.color,
              left: conf.x,
              top: conf.y,
              rotate: conf.rotation,
            }}
            initial={{ opacity: 1 }}
            animate={{
              x: conf.tx,
              y: conf.ty,
              opacity: 0,
            }}
            transition={{
              duration: 1,
              ease: "easeOut",
            }}
            onAnimationComplete={() => {
              setConfetti(prev => prev.filter(c => c.id !== conf.id));
            }}
          />
        ))}
      </div>
      <PasswordModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onSubmit={resetCount}
        title="리셋 비밀번호 입력"
      />
    </div>
  );
}

export default App;
