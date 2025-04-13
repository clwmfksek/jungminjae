import { useState, useEffect } from "react";
import "./App.css";
import { supabase, CounterRecord } from "./lib/supabase";

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

  useEffect(() => {
    fetchCounts();
  }, []);

  const fetchCounts = async () => {
    try {
      const { data, error } = await supabase
        .from('counters')
        .select('*')
        .order('name');

      if (error) {
        throw error;
      }

      if (data) {
        const counts = data.map((record: CounterRecord) => ({
          name: record.name,
          count: record.count
        }));
        
        if (counts.length === 0) {
          // 초기 데이터 생성
          await Promise.all(
            initialPeople.map(person =>
              supabase
                .from('counters')
                .insert({ name: person.name, count: 0 })
            )
          );
          setPeople(initialPeople);
        } else {
          setPeople(counts);
        }
      }
    } catch (error) {
      console.error('Error fetching counts:', error);
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

      const { error } = await supabase
        .from('counters')
        .update({ count: newCount, updated_at: new Date().toISOString() })
        .eq('name', person.name);

      if (error) {
        throw error;
      }

      setPeople(currentPeople => {
        const newPeople = [...currentPeople];
        newPeople[index] = {
          ...newPeople[index],
          count: newCount,
        };
        return newPeople;
      });
    } catch (error) {
      console.error('Error incrementing count:', error);
    }
  };

  const resetCount = async () => {
    try {
      const { error } = await supabase
        .from('counters')
        .update({ count: 0, updated_at: new Date().toISOString() })
        .in('name', people.map(p => p.name));

      if (error) {
        throw error;
      }

      setPeople(people.map(person => ({ ...person, count: 0 })));
      createConfetti();
    } catch (error) {
      console.error('Error resetting counts:', error);
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
