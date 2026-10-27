import { useEffect, useState } from "react";

// Animated reveal of winning numbers, one ball at a time.
// Props: numbers (array), onDone (callback)
export default function DrawAnimation({ numbers = [], onDone }) {
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    setRevealed(0);
    if (!numbers.length) return;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setRevealed(i);
      if (i >= numbers.length) {
        clearInterval(id);
        onDone?.();
      }
    }, 650);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numbers]);

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {numbers.map((n, i) => {
        const shown = i < revealed;
        return (
          <div
            key={i}
            className={[
              "flex h-16 w-16 items-center justify-center rounded-full font-mono text-2xl font-bold transition-all duration-500",
              shown
                ? "bg-green-600 text-ink-900 shadow-glow scale-100 animate-popIn"
                : "bg-ink-600 text-cream-400 scale-95",
            ].join(" ")}
          >
            {shown ? n : "?"}
          </div>
        );
      })}
    </div>
  );
}
