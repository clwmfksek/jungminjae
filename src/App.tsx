import { useState, useEffect } from "react";
import "./App.css";

interface PersonCount {
  name: string;
  count: number;
}

interface Confetti {
  id: number;
  x: number;
  y: number;
  color: string;
  tx: number;
  ty: number;
  rotation: number;
  type: 'circle' | 'square';
}

function App() {
  const initialPeople: PersonCount[] = [
    { name: "정민재", count: 0 },
    { name: "강지원", count: 0 },
    { name: "박예준", count: 0 },
  ];

  const [people, setPeople] = useState<PersonCount[]>(() => {
    const savedData = localStorage.getItem("peopleCounters");
    return savedData ? JSON.parse(savedData) : initialPeople;
  });

  const [confetti, setConfetti] = useState<Confetti[]>([]);

  useEffect(() => {
    localStorage.setItem("peopleCounters", JSON.stringify(people));
  }, [people]);

  const createConfetti = () => {
    const colors = ['#3182F6', '#00D3BE', '#FF6B6B', '#FFD93D', '#4ADE80'];
    const newConfetti: Confetti[] = [];
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    for (let i = 0; i < 40; i++) {
      const angle = (i / 40) * Math.PI * 2;
      const velocity = 150 + Math.random() * 150;
      const tx = Math.cos(angle) * velocity;
      const ty = Math.sin(angle) * velocity;
      const rotation = Math.random() * 360;
      
      newConfetti.push({
        id: Date.now() + i,
        x: centerX,
        y: centerY,
        color: colors[Math.floor(Math.random() * colors.length)],
        tx,
        ty,
        rotation,
        type: Math.random() > 0.5 ? 'circle' : 'square'
      });
    }
    
    setConfetti(newConfetti);
    setTimeout(() => setConfetti([]), 800);
  };

  const incrementCount = (index: number) => {
    setPeople((currentPeople) => {
      const newPeople = [...currentPeople];
      newPeople[index] = {
        ...newPeople[index],
        count: newPeople[index].count + 1,
      };
      return newPeople;
    });
  };

  const resetCount = () => {
    setPeople(initialPeople);
    localStorage.setItem("peopleCounters", JSON.stringify(initialPeople));
    createConfetti();
  };

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
