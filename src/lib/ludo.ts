// Ludo game model
// Board: 52 outer track squares (indexed 0..51) + 4 home columns of 6 squares each.
// Each player has a START index on the outer track and an entry into their home column.

export type PlayerId = "red" | "green" | "yellow" | "blue";

export const PLAYERS: PlayerId[] = ["red", "green", "yellow", "blue"];

export const PLAYER_LABEL: Record<PlayerId, string> = {
  red: "Red",
  green: "Green",
  yellow: "Yellow",
  blue: "Blue",
};

// Standard Ludo: red starts at 0, green at 13, yellow at 26, blue at 39.
// Clockwise turn order (matches typical board): red -> green -> yellow -> blue.
export const START_INDEX: Record<PlayerId, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

// The square BEFORE the home column entry. After this square, the token enters
// its colored home column instead of continuing on the outer ring.
// Outer-track index AFTER which a token diverts into its home column instead of
// continuing to its own start square. Each player diverts one square before
// re-entering its own start.
export const HOME_ENTRY_PREV: Record<PlayerId, number> = {
  red: 51,    // after (1,7) divert into red home column
  green: 12,  // after (9,1) divert into green home column
  yellow: 25, // after (15,9) divert into yellow home column
  blue: 38,   // after (7,15) divert into blue home column
};

// Safe squares (stars + each player's start). Captures cannot happen here.
export const SAFE_SQUARES = new Set<number>([
  0, 8, 13, 21, 26, 34, 39, 47,
]);

export type TokenLocation =
  | { kind: "yard" }
  | { kind: "track"; index: number } // 0..51 outer ring
  | { kind: "home-col"; step: number } // 0..5 within own column
  | { kind: "home" }; // finished

export interface Token {
  id: string; // e.g. "red-0"
  player: PlayerId;
  loc: TokenLocation;
}

export type Phase = "setup" | "playing" | "finished";

export interface GameState {
  phase: Phase;
  players: PlayerId[]; // turn order (clockwise) once setup decided
  current: number; // index into players
  tokens: Token[];
  dice: number | null;
  rollsLeft: number; // extra rolls earned by sixes
  consecutiveSixes: number;
  setupRolls: Partial<Record<PlayerId, number>>; // for highest-roller-starts
  message: string;
  winner: PlayerId | null;
  awaitingMove: boolean; // dice rolled, player must pick a token (or pass if no moves)
}

export const ALL_PLAYERS: PlayerId[] = ["red", "green", "yellow", "blue"];

export function createInitialState(): GameState {
  const tokens: Token[] = [];
  for (const p of ALL_PLAYERS) {
    for (let i = 0; i < 4; i++) {
      tokens.push({ id: `${p}-${i}`, player: p, loc: { kind: "yard" } });
    }
  }
  return {
    phase: "setup",
    players: [...ALL_PLAYERS],
    current: 0,
    tokens,
    dice: null,
    rollsLeft: 0,
    consecutiveSixes: 0,
    setupRolls: {},
    message: "Each player rolls a die — highest roll begins the game.",
    winner: null,
    awaitingMove: false,
  };
}

export function rollDie(): number {
  return 1 + Math.floor(Math.random() * 6);
}

// Returns the next track index for a player after stepping one square.
// Returns null if the token would leave the track and enter the home column.
function nextTrackIndex(player: PlayerId, idx: number): number | "enter-home" {
  if (idx === HOME_ENTRY_PREV[player]) return "enter-home";
  return (idx + 1) % 52;
}

// Compute destination location after moving `steps` from a given location.
// Returns null if the move is illegal (e.g., overshoot home, or yard without a 6).
export function computeDestination(
  player: PlayerId,
  loc: TokenLocation,
  steps: number,
): TokenLocation | null {
  if (loc.kind === "home") return null;

  if (loc.kind === "yard") {
    if (steps !== 6) return null;
    return { kind: "track", index: START_INDEX[player] };
  }

  if (loc.kind === "track") {
    let cur = loc.index;
    let inHomeCol = false;
    let homeStep = -1;
    for (let s = 0; s < steps; s++) {
      if (!inHomeCol) {
        const nxt = nextTrackIndex(player, cur);
        if (nxt === "enter-home") {
          inHomeCol = true;
          homeStep = 0;
        } else {
          cur = nxt;
        }
      } else {
        homeStep += 1;
        if (homeStep > 5) return null; // overshoot
      }
    }
    if (inHomeCol) {
      if (homeStep === 5) return { kind: "home" };
      return { kind: "home-col", step: homeStep };
    }
    return { kind: "track", index: cur };
  }

  if (loc.kind === "home-col") {
    const target = loc.step + steps;
    if (target > 5) return null;
    if (target === 5) return { kind: "home" };
    return { kind: "home-col", step: target };
  }

  return null;
}

export function legalTokenIds(state: GameState, dice: number): string[] {
  const player = state.players[state.current];
  const ids: string[] = [];
  for (const t of state.tokens) {
    if (t.player !== player) continue;
    const dest = computeDestination(player, t.loc, dice);
    if (!dest) continue;
    // Can't land on a square occupied by 2+ own tokens (block) — keep simple: allow stacking own.
    // Disallow landing on own token's spot only if it would create > stacking issues — we allow stacking for simplicity.
    ids.push(t.id);
  }
  return ids;
}

export function locEquals(a: TokenLocation, b: TokenLocation): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "track" && b.kind === "track") return a.index === b.index;
  if (a.kind === "home-col" && b.kind === "home-col") return a.step === b.step;
  return true;
}

// Apply move: returns new state. Handles capture, extra turn on six/capture/home.
export function applyMove(state: GameState, tokenId: string): GameState {
  if (state.dice == null) return state;
  const dice = state.dice;
  const player = state.players[state.current];
  const tokens = state.tokens.map((t) => ({ ...t, loc: { ...t.loc } as TokenLocation }));
  const tok = tokens.find((t) => t.id === tokenId);
  if (!tok || tok.player !== player) return state;

  const dest = computeDestination(player, tok.loc, dice);
  if (!dest) return state;

  tok.loc = dest;

  // Capture: if landing on outer track (not safe), opponents on that square go to yard.
  let capturedSomeone = false;
  if (dest.kind === "track" && !SAFE_SQUARES.has(dest.index)) {
    for (const other of tokens) {
      if (other.player !== player && other.loc.kind === "track" && other.loc.index === dest.index) {
        other.loc = { kind: "yard" };
        capturedSomeone = true;
      }
    }
  }

  const reachedHome = dest.kind === "home";
  const rolledSix = dice === 6;

  // Check victory: all 4 tokens of this player at home.
  const allHome = tokens.filter((t) => t.player === player).every((t) => t.loc.kind === "home");

  let nextState: GameState = {
    ...state,
    tokens,
    dice: null,
    awaitingMove: false,
  };

  if (allHome) {
    return {
      ...nextState,
      phase: "finished",
      winner: player,
      message: `${PLAYER_LABEL[player]} wins! 🏆`,
      rollsLeft: 0,
      consecutiveSixes: 0,
    };
  }

  // Extra turn rules: rolling a 6, capturing, or landing a piece home grants another roll.
  // But three consecutive sixes forfeits the turn (classic rule, optional; we'll enforce).
  if (rolledSix || capturedSomeone || reachedHome) {
    if (state.consecutiveSixes >= 2 && rolledSix) {
      // Three sixes — forfeit.
      return {
        ...nextState,
        message: `Three sixes in a row — ${PLAYER_LABEL[player]} forfeits the turn.`,
        consecutiveSixes: 0,
        current: (state.current + 1) % state.players.length,
      };
    }
    return {
      ...nextState,
      message: `${PLAYER_LABEL[player]} rolls again${capturedSomeone ? " (capture!)" : reachedHome ? " (token home!)" : ""}.`,
    };
  }

  return {
    ...nextState,
    consecutiveSixes: 0,
    current: (state.current + 1) % state.players.length,
    message: `${PLAYER_LABEL[state.players[(state.current + 1) % state.players.length]]}'s turn.`,
  };
}

// Called after a roll when no legal moves exist — pass turn (unless six grants reroll? In Ludo, if you can't move you simply lose the turn).
export function passTurn(state: GameState): GameState {
  const rolledSix = state.dice === 6;
  // Even with a 6, if no move possible (all in yard impossible since 6 enters; but if start blocked by own block etc.) — simply pass.
  return {
    ...state,
    dice: null,
    awaitingMove: false,
    consecutiveSixes: rolledSix ? state.consecutiveSixes : 0,
    current: (state.current + 1) % state.players.length,
    message: `No legal moves. ${PLAYER_LABEL[state.players[(state.current + 1) % state.players.length]]}'s turn.`,
  };
}

// Setup phase: each player rolls. Highest starts; ties re-roll among tied players.
export function applySetupRoll(state: GameState, value: number): GameState {
  const player = state.players[state.current];
  const setupRolls = { ...state.setupRolls, [player]: value };
  const nextIdx = state.current + 1;

  if (nextIdx < state.players.length) {
    return {
      ...state,
      setupRolls,
      current: nextIdx,
      dice: value,
      message: `${PLAYER_LABEL[player]} rolled ${value}. ${PLAYER_LABEL[state.players[nextIdx]]} rolls next.`,
    };
  }

  // All rolled — find highest.
  const max = Math.max(...Object.values(setupRolls) as number[]);
  const leaders = (Object.entries(setupRolls) as [PlayerId, number][])
    .filter(([, v]) => v === max)
    .map(([p]) => p);

  if (leaders.length > 1) {
    // Re-roll among tied players, preserving clockwise order.
    const newOrder = ALL_PLAYERS.filter((p) => leaders.includes(p));
    return {
      ...state,
      players: newOrder.concat(ALL_PLAYERS.filter((p) => !leaders.includes(p))),
      setupRolls: {},
      current: 0,
      dice: value,
      message: `Tie at ${max}! ${leaders.map((l) => PLAYER_LABEL[l]).join(", ")} roll again.`,
    };
  }

  const winner = leaders[0];
  // Reorder players clockwise starting from the winner.
  const startIdx = ALL_PLAYERS.indexOf(winner);
  const order: PlayerId[] = [];
  for (let i = 0; i < 4; i++) order.push(ALL_PLAYERS[(startIdx + i) % 4]);

  return {
    ...state,
    players: order,
    current: 0,
    phase: "playing",
    setupRolls: {},
    dice: null,
    message: `${PLAYER_LABEL[winner]} rolled highest (${max}) and starts!`,
  };
}
