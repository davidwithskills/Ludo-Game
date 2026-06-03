import { cn } from "@/lib/utils";
import { GameState, PlayerId, Token, legalTokenIds, SAFE_SQUARES, START_INDEX, HOME_ENTRY_PREV } from "@/lib/ludo";
import {
  BOARD_TRACK,
  HOME_COLUMNS,
  YARD_RECTS,
  YARD_SLOTS,
  cellToPercent,
} from "@/lib/ludo-board";

interface BoardProps {
  state: GameState;
  onTokenClick: (tokenId: string) => void;
}

const PLAYER_BG: Record<PlayerId, string> = {
  red: "bg-player-red-soft",
  green: "bg-player-green-soft",
  yellow: "bg-player-yellow-soft",
  blue: "bg-player-blue-soft",
};
const PLAYER_SOLID: Record<PlayerId, string> = {
  red: "bg-player-red",
  green: "bg-player-green",
  yellow: "bg-player-yellow",
  blue: "bg-player-blue",
};
const PLAYER_RING: Record<PlayerId, string> = {
  red: "ring-player-red",
  green: "ring-player-green",
  yellow: "ring-player-yellow",
  blue: "ring-player-blue",
};

// Convert token location to a board cell.
function tokenCell(token: Token, slotIndex: number): [number, number] {
  const { loc, player } = token;
  if (loc.kind === "yard") return YARD_SLOTS[player][slotIndex];
  if (loc.kind === "track") return BOARD_TRACK[loc.index];
  if (loc.kind === "home-col") return HOME_COLUMNS[player][loc.step];
  if (loc.kind === "home") return [8, 8]; // center
  return [8, 8];
}

export const Board = ({ state, onTokenClick }: BoardProps) => {
  const legalIds = state.dice != null ? new Set(legalTokenIds(state, state.dice)) : new Set<string>();
  const currentPlayer = state.players[state.current];

  // Group tokens by their position so stacked tokens render slightly offset.
  const positionGroups = new Map<string, Token[]>();
  for (const t of state.tokens) {
    if (t.loc.kind === "track") {
      const k = `track-${t.loc.index}`;
      if (!positionGroups.has(k)) positionGroups.set(k, []);
      positionGroups.get(k)!.push(t);
    }
  }

  return (
    <div className="relative aspect-square w-full max-w-[640px] mx-auto bg-board border-4 border-board-line rounded-2xl shadow-board overflow-hidden">
      {/* Yards */}
      {(Object.keys(YARD_RECTS) as PlayerId[]).map((p) => {
        const [c1, r1, c2, r2] = YARD_RECTS[p];
        const left = ((c1 - 1) / 15) * 100;
        const top = ((r1 - 1) / 15) * 100;
        const width = ((c2 - c1 + 1) / 15) * 100;
        const height = ((r2 - r1 + 1) / 15) * 100;
        return (
          <div
            key={p}
            className={cn("absolute border-2 border-board-line", PLAYER_SOLID[p])}
            style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
          >
            <div className={cn("absolute inset-[12%] rounded-lg border-2 border-board-line", PLAYER_BG[p])} />
          </div>
        );
      })}

      {/* Track squares */}
      {BOARD_TRACK.map((cell, i) => {
        const [col, row] = cell;
        const left = ((col - 1) / 15) * 100;
        const top = ((row - 1) / 15) * 100;
        const size = (1 / 15) * 100;
        // Color start squares with player color
        let bg = "bg-background";
        for (const p of ["red", "green", "yellow", "blue"] as PlayerId[]) {
          if (i === START_INDEX[p]) bg = PLAYER_BG[p];
        }
        const isSafe = SAFE_SQUARES.has(i);
        return (
          <div
            key={`tr-${i}`}
            className={cn("absolute border border-board-line/60", bg)}
            style={{ left: `${left}%`, top: `${top}%`, width: `${size}%`, height: `${size}%` }}
          >
            {isSafe && (
              <div className="absolute inset-0 flex items-center justify-center text-board-line/50">
                <svg viewBox="0 0 24 24" className="h-3/5 w-3/5 fill-current">
                  <path d="M12 2l2.39 7.36H22l-6.18 4.49L18.18 22 12 17.27 5.82 22l2.36-8.15L2 9.36h7.61z" />
                </svg>
              </div>
            )}
          </div>
        );
      })}

      {/* Home columns */}
      {(["red", "green", "yellow", "blue"] as PlayerId[]).map((p) =>
        HOME_COLUMNS[p].map((cell, i) => {
          const [col, row] = cell;
          const left = ((col - 1) / 15) * 100;
          const top = ((row - 1) / 15) * 100;
          const size = (1 / 15) * 100;
          if (i === 5) return null; // last cell is center triangle, drawn separately
          return (
            <div
              key={`hc-${p}-${i}`}
              className={cn("absolute border border-board-line/60", PLAYER_SOLID[p])}
              style={{ left: `${left}%`, top: `${top}%`, width: `${size}%`, height: `${size}%` }}
            />
          );
        }),
      )}

      {/* Center home (3x3) with 4 colored triangles */}
      <div
        className="absolute border-2 border-board-line bg-board-center"
        style={{
          left: `${(6 / 15) * 100}%`,
          top: `${(6 / 15) * 100}%`,
          width: `${(3 / 15) * 100}%`,
          height: `${(3 / 15) * 100}%`,
        }}
      >
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
          <polygon points="0,0 50,50 100,0" className="fill-player-green" />
          <polygon points="100,0 50,50 100,100" className="fill-player-yellow" />
          <polygon points="100,100 50,50 0,100" className="fill-player-blue" />
          <polygon points="0,100 50,50 0,0" className="fill-player-red" />
        </svg>
      </div>

      {/* Tokens */}
      {state.tokens.map((token) => {
        const sameYardIndex = state.tokens
          .filter((t) => t.player === token.player && t.loc.kind === "yard")
          .indexOf(token);
        // For yard, use the token's index within player (0..3) for stable slot assignment.
        const playerTokens = state.tokens.filter((t) => t.player === token.player);
        const idxWithinPlayer = playerTokens.indexOf(token);
        const slotIdx = token.loc.kind === "yard" ? idxWithinPlayer : 0;
        const cell = tokenCell(token, slotIdx);

        // Stack offset for track collisions
        let offsetX = 0;
        let offsetY = 0;
        if (token.loc.kind === "track") {
          const group = positionGroups.get(`track-${token.loc.index}`)!;
          const idx = group.indexOf(token);
          if (group.length > 1) {
            const angle = (idx / group.length) * 2 * Math.PI;
            offsetX = Math.cos(angle) * 12;
            offsetY = Math.sin(angle) * 12;
          }
        }

        const { left, top } = cellToPercent(cell);
        const isLegal = legalIds.has(token.id);
        const isCurrent = token.player === currentPlayer;

        return (
          <button
            key={token.id}
            onClick={() => isLegal && onTokenClick(token.id)}
            disabled={!isLegal}
            className={cn(
              "absolute -translate-x-1/2 -translate-y-1/2 transition-token",
              "h-[5.5%] w-[5.5%] rounded-full border-2 border-board-line shadow-token",
              PLAYER_SOLID[token.player],
              isLegal && "cursor-pointer ring-4 ring-offset-1 ring-offset-board animate-pulse-ring",
              isLegal && PLAYER_RING[token.player],
              !isLegal && "cursor-default",
              isCurrent && !isLegal && "opacity-95",
              !isCurrent && "opacity-90",
            )}
            style={{
              left: `calc(${left} + ${offsetX}%)`,
              top: `calc(${top} + ${offsetY}%)`,
            }}
            aria-label={`${token.player} token ${token.id}`}
          >
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="h-2 w-2 rounded-full bg-background/70" />
            </span>
          </button>
        );
      })}
    </div>
  );
};
