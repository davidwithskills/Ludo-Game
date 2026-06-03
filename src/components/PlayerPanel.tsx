import { cn } from "@/lib/utils";
import { GameState, PLAYER_LABEL, PlayerId } from "@/lib/ludo";

const DOT: Record<PlayerId, string> = {
  red: "bg-player-red",
  green: "bg-player-green",
  yellow: "bg-player-yellow",
  blue: "bg-player-blue",
};

interface Props {
  state: GameState;
}

export const PlayerPanel = ({ state }: Props) => {
  const current = state.players[state.current];

  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-display text-lg text-foreground/80">Turn order</h3>
      <ul className="space-y-1.5">
        {state.players.map((p, i) => {
          const isActive = state.phase !== "finished" && p === current;
          const homeCount = state.tokens.filter((t) => t.player === p && t.loc.kind === "home").length;
          const setupRoll = state.setupRolls[p];
          return (
            <li
              key={p}
              className={cn(
                "flex items-center justify-between gap-3 rounded-xl border-2 px-3 py-2 transition-all",
                isActive ? "border-board-line bg-background shadow-soft" : "border-transparent bg-background/40",
              )}
            >
              <div className="flex items-center gap-2.5">
                <span className={cn("h-4 w-4 rounded-full border border-board-line/50", DOT[p])} />
                <span className={cn("font-medium", isActive && "text-foreground")}>
                  {PLAYER_LABEL[p]}
                </span>
                <span className="text-xs text-muted-foreground">#{i + 1}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {state.phase === "setup" && setupRoll != null && (
                  <span className="rounded bg-board-safe px-1.5 py-0.5 font-mono">rolled {setupRoll}</span>
                )}
                {state.phase !== "setup" && (
                  <span className="rounded bg-board-safe px-1.5 py-0.5 font-mono">🏠 {homeCount}/4</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
