import { useState, useEffect } from "react";
import "./App.css";
import { supabase, CounterRecord } from "./lib/supabase";
import { RealtimeChannel } from "@supabase/supabase-js";

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

  const setupRealtimeSubscription = async () => {
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
          event: 'UPDATE',
          schema: 'public',
          table: 'counters',
        },
        (payload) => {
          const updatedRecord = payload.new as CounterRecord;
          
          setPeople(currentPeople => {
            const newPeople = currentPeople.map(person =>
              person.name === updatedRecord.name
                ? { ...person, count: updatedRecord.count }
                : person
            );

            // 모든 카운터가 0인지 확인
            const allZero = newPeople.every(p => p.count === 0);
            if (allZero) {
              createConfetti();
            }

            return newPeople;
          });
        }
      )
      .subscribe();

    return channel;
  };

  useEffect(() => {
    let channel: RealtimeChannel;

    const initialize = async () => {
      try {
        setLoading(true);
        // 먼저 초기 데이터를 가져옵니다
        await fetchCounts();
        // 그 다음 실시간 구독을 설정합니다
        channel = await setupRealtimeSubscription();
      } catch (error) {
        setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다');
      } finally {
        setLoading(false);
      }
    };

    initialize();

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
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
          const promises = initialPeople.map(person =>
            supabase
              .from('counters')
              .insert({ name: person.name, count: 0 })
          );

          await Promise.all(promises);
          setPeople(initialPeople);
        } else {
          const counts = data.map((record: CounterRecord) => ({
            name: record.name,
            count: record.count
          }));
          setPeople(counts);
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다');
      throw error;
    }
  };

  const createConfetti = () => {
    const colors = ['#3182F6', '#00D3BE', '#FF6B6B', '#FFD93D', '#4ADE80'];
    const newConfetti = [];
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    for (let i = 0; i < 40; i++) {
      const angle = (i / 40) * Math.PI * 2;
      const velocity = 150 + Math.random() * 150;
      const tx = Math.cos(angle) * velocity;
      const ty = Math.sin(angle) * velocity;
      const rotation = Math.random() * 360;
      const type = Math.random() > 0.5 ? 'circle' as const : 'square' as const;
      
      newConfetti.push({
        id: Date.now() + i,
        x: centerX,
        y: centerY,
        color: colors[Math.floor(Math.random() * colors.length)],
        tx,
        ty,
        rotation,
        type
      });
    }
    
    setConfetti(newConfetti);
    setTimeout(() => setConfetti([]), 800);
  };

  const incrementCount = async (index: number) => {
    try {
      const person = people[index];
      const newCount = person.count + 1;

      const { error } = await supabase
        .from('counters')
        .update({ count: newCount })
        .eq('name', person.name);

      if (error) {
        setError(error.message);
        throw error;
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다');
    }
  };

  const resetCount = async () => {
    try {
      const { error } = await supabase
        .from('counters')
        .update({ count: 0 })
        .in('name', people.map(p => p.name));

      if (error) {
        setError(error.message);
        throw error;
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다');
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
    <>
      <div className="confetti-container">
        {confetti.map((conf) => {
          const style = {
            left: `${conf.x}px`,
            top: `${conf.y}px`,
            backgroundColor: conf.color,
            '--tx': `${conf.tx}px`,
            '--ty': `${conf.ty}px`,
            '--rotation': `${conf.rotation}deg`
          } as React.CSSProperties;

          return (
            <div
              key={conf.id}
              className={`confetti-style3 ${conf.type}`}
              style={style}
            />
          );
        })}
      </div>
      <h1>과제 날먹 카운터</h1>
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
      <div className="card">
        {people.map((person, index) => (
          <div key={person.name}>
            <button onClick={() => incrementCount(index)}>
              {person.name}
              <span className="counter-value">{person.count}회</span>
            </button>
          </div>
        ))}
        <div>
          <button onClick={resetCount} className="reset-button">
            전체 초기화
          </button>
        </div>
      </div>
    </>
  );
}

export default App;
