export const createConfetti = (setConfetti: React.Dispatch<React.SetStateAction<Array<{
  id: number;
  x: number;
  y: number;
  color: string;
  tx: number;
  ty: number;
  rotation: number;
  type: 'circle' | 'square';
}>>>) => {
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