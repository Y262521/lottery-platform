import { useMemo } from "react";

// Interactive number grid for selecting lottery numbers.
// Props:
//   min, max      - inclusive range of selectable numbers
//   count        - how many numbers must be selected
//   selected     - array of selected numbers
//   onToggle(n)  - add/remove a number
export default function NumberPicker({ min = 1, max = 49, count = 6, selected = [], onToggle }) {
  const numbers = useMemo(
    () => Array.from({ length: max - min + 1 }, (_, i) => i + min),
    [min, max]
  );

  const done = selected.length >= count;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-xs text-cream-300">
        <span>
          Pick <span className="font-mono text-green-300">{count}</span> numbers
        </span>
        <span className="font-mono">
          {selected.length}/{count}
        </span>
      </div>
      <div className="grid grid-cols-7 gap-2 sm:grid-cols-10">
        {numbers.map((n) => {
          const active = selected.includes(n);
          return (
            <button
              key={n}
              type="button"
              onClick={() => onToggle(n)}
              disabled={!active && done}
              aria-pressed={active}
              className={[
                "flex h-10 w-10 items-center justify-center rounded-lg font-mono text-sm font-bold transition",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400/60",
                active
                  ? "bg-green-600 text-ink-900 shadow-glow scale-105"
                  : "bg-ink-600 text-cream-100 hover:bg-ink-500",
                !active && done ? "opacity-30 cursor-not-allowed hover:bg-ink-600" : "",
              ].join(" ")}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
