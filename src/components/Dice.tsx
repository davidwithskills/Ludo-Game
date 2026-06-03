import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface DiceProps {
  value: number | null;
  onRoll: () => void;
  disabled?: boolean;
  colorClass?: string; // tailwind text color class for the active player tint
}

const PIP_POSITIONS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
};

export const Dice = ({ value, onRoll, disabled, colorClass = "text-foreground" }: DiceProps) => {
  const [rolling, setRolling] = useState(false);
  const [display, setDisplay] = useState(value ?? 1);

  useEffect(() => {
    if (value != null) setDisplay(value);
  }, [value]);

  const handleClick = () => {
    if (disabled || rolling) return;
    setRolling(true);
    let ticks = 0;
    const interval = setInterval(() => {
      setDisplay(1 + Math.floor(Math.random() * 6));
      ticks++;
      if (ticks > 6) {
        clearInterval(interval);
        setRolling(false);
        onRoll();
      }
    }, 70);
  };

  const pips = PIP_POSITIONS[display];

  return (
    <button
      onClick={handleClick}
      disabled={disabled || rolling}
      className={cn(
        "relative h-20 w-20 rounded-2xl bg-background border-2 border-board-line shadow-token",
        "transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
        rolling && "animate-dice-roll",
        !disabled && !rolling && "hover:scale-105 cursor-pointer",
      )}
      aria-label={`Dice showing ${display}. Click to roll.`}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full p-1">
        {pips.map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={8} className={cn("fill-current", colorClass)} />
        ))}
      </svg>
    </button>
  );
};
