"use client";

import { useEffect, useState } from "react";

/** Chama animada de posição (rank 1/2/3), ciclando os 6 frames do sprite. */
export default function RankFire({ rank }: { rank: 1 | 2 | 3 }) {
  const [frame, setFrame] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f % 6) + 1), 120);
    return () => clearInterval(id);
  }, []);
  const n = String(frame).padStart(3, "0");
  return (
    <img
      className="rank-fire"
      src={`/design-system/img/fire-rank${rank}/Fire_rank${rank}_${n}.png`}
      alt={`#${rank}`}
    />
  );
}
