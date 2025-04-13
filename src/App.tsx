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

  useEffect(() => {
    console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
    console.log('Supabase Key exists:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
    
    fetchCounts();

    // 실시간 구독 설정
    const channel = supabase
      .channel('counter-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'counters'
        },
        (payload) => {
          console.log('실시간 업데이트:', payload);
          if (payload.eventType === 'UPDATE') {
            const updatedRecord = payload.new as CounterRecord;
            setPeople((currentPeople) =>
              currentPeople.map((person) =>
                person.name === updatedRecord.name
                  ? { ...person, count: updatedRecord.count }
                  : person
              )
            );

            // 모든 카운터가 0이면 폭죽 애니메이션 실행
            if (Object.values(payload.new).every(record => 
              typeof record === 'number' ? record === 0 : true
            )) {
              createConfetti();
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    // 컴포넌트 언마운트 시 구독 해제
    return () => {
      channel.unsubscribe();
    };
  }, []);

  const fetchCounts = async () => {
    try {
      console.log('Fetching counts...');
      const { data, error } = await supabase
        .from('counters')
        .select('*')
        .order('name');

      if (error) {
        console.error('Supabase error:', error);
        setError(error.message);
        throw error;
      }

      console.log('Fetched data:', data);

      if (data) {
        const counts = data.map((record: CounterRecord) => ({
          name: record.name,
          count: record.count
        }));
        
        if (counts.length === 0) {
          console.log('Creating initial data...');
          // 초기 데이터 생성
          const insertResults = await Promise.all(
            initialPeople.map(person =>
              supabase
                .from('counters')
                .insert({ name: person.name, count: 0 })
            )
          );
          console.log('Insert results:', insertResults);
          setPeople(initialPeople);
        } else {
          console.log('Setting existing data:', counts);
          setPeople(counts);
        }
      }
    } catch (error) {
      console.error('Error fetching counts:', error);
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다');
    } finally {
      setLoading(false);
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
      console.log('Incrementing count for:', person.name, 'to:', newCount);

      const { data, error } = await supabase
        .from('counters')
        .update({ count: newCount, updated_at: new Date().toISOString() })
        .eq('name', person.name)
        .select();

      if (error) {
        console.error('Update error:', error);
        setError(error.message);
        throw error;
      }

      console.log('Update result:', data);
    } catch (error) {
      console.error('Error incrementing count:', error);
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다');
    }
  };

  const resetCount = async () => {
    try {
      console.log('Resetting all counts...');
      const { data, error } = await supabase
        .from('counters')
        .update({ count: 0, updated_at: new Date().toISOString() })
        .in('name', people.map(p => p.name))
        .select();

      if (error) {
        console.error('Reset error:', error);
        setError(error.message);
        throw error;
      }

      console.log('Reset result:', data);
    } catch (error) {
      console.error('Error resetting counts:', error);
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
