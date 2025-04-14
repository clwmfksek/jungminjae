interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  color: string;
  tx: number;
  ty: number;
  rotation: number;
  type: 'circle' | 'square';
}

type SetConfettiFunction = React.Dispatch<React.SetStateAction<ConfettiParticle[]>>;

export const createConfetti = (
  setConfetti: SetConfettiFunction,
  x: number = window.innerWidth / 2,
  y: number = window.innerHeight / 2
) => {
  const colors = ['#FF577F', '#FF884B', '#FFC764', '#4DABF7', '#748FFC', '#845EF7'];
  const confettiCount = 30;
  const newConfetti: ConfettiParticle[] = [];

  for (let i = 0; i < confettiCount; i++) {
    const angle = (Math.PI * 2 * i) / confettiCount;
    const velocity = 2 + Math.random() * 2;
    const tx = Math.cos(angle) * velocity * (40 + Math.random() * 20);
    const ty = Math.sin(angle) * velocity * (40 + Math.random() * 20);

    newConfetti.push({
      id: Date.now() + i,
      x,
      y,
      color: colors[Math.floor(Math.random() * colors.length)],
      tx,
      ty,
      rotation: Math.random() * 360,
      type: Math.random() > 0.5 ? 'circle' : 'square',
    });
  }

  setConfetti(prev => [...prev, ...newConfetti]);

  setTimeout(() => {
    setConfetti(prev => prev.filter(conf => !newConfetti.includes(conf)));
  }, 1000);
}; 