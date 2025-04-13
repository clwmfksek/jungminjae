import { useState, useEffect } from "react";
import "./App.css";

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

  const [people, setPeople] = useState<PersonCount[]>(() => {
    const savedData = localStorage.getItem("peopleCounters");
    return savedData ? JSON.parse(savedData) : initialPeople;
  });
  
  useEffect(() => {
    localStorage.setItem("peopleCounters", JSON.stringify(people));
  }, [people]);

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
  };

  return (
    <>
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
