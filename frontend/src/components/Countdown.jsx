import { useEffect, useState } from "react";

// Live countdown to a target date. Calls onZero once when it reaches zero.
export default function Countdown({ to, onZero, className = "" }) {
  const [remaining, setRemaining] = useState(() => diff(to));

  useEffect(() => {
    const id = setInterval(() => {
      const d = diff(to);
      setRemaining(d);
      if (d <= 0) {
        clearInterval(id);
        onZero?.();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [to, onZero]);

  if (remaining <= 0) {
    return <span className={`font-mono ${className}`}>Live now</span>;
  }

  const { h, m, s } = split(remaining);
  return (
    <span className={`font-mono tabular-nums ${className}`}>
      {pad(h)}:{pad(m)}:{pad(s)}
    </span>
  );
}

function diff(to) {
  const t = new Date(to).getTime();
  return t - Date.now();
}

function split(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    h: Math.floor(total / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
  };
}

function pad(n) {
  return String(n).padStart(2, "0");
}
