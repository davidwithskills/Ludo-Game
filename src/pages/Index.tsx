import { useEffect, useMemo, useState } from "react";
import { Board } from "@/components/Board";
import { Dice } from "@/components/Dice";
import { PlayerPanel } from "@/components/PlayerPanel";
import { Button } from "@/components/ui/button";
import {
  GameState,
  PLAYER_LABEL,
  PlayerId,
  applyMove,
  applySetupRoll,
  createInitialState,
  legalTokenIds,
  passTurn,
  rollDie,
} from "@/lib/ludo";

const PLAYER_TEXT: Record<PlayerId, string> = {
  red: "text-player-red",
  green: "text-player-green",
  yellow: "text-player-yellow",
  blue: "text-player-blue",
};

const Index = () => {
  const [state, setState] = useState<GameState>(() => createInitialState());

  const currentPlayer = state.players[state.current];

  // After dice rolled in playing phase, if no legal moves auto-pass after a delay.
  useEffect(() => {
    if (state.phase !== "playing" || state.dice == null || !state.awaitingMove) return;
    const moves = legalTokenIds(state, state.dice);
    if (moves.length === 0) {
      const t = setTimeout(() => setState((s) => passTurn(s)), 900);
      return () => clearTimeout(t);
    }
  }, [state]);

  const handleRoll = () => {
    const value = rollDie();
    if (state.phase === "setup") {
      // Show the value briefly, then advance setup.
      setState((s) => ({ ...s, dice: value }));
      setTimeout(() => setState((s) => applySetupRoll(s, value)), 500);
      return;
    }
    if (state.phase === "playing") {
      const newSixes = value === 6 ? state.consecutiveSixes + 1 : 0;
      setState((s) => ({
        ...s,
        dice: value,
        awaitingMove: true,
        consecutiveSixes: newSixes,
        message: `${PLAYER_LABEL[currentPlayer]} rolled a ${value}.`,
      }));
    }
  };

  const handleTokenClick = (tokenId: string) => {
    setState((s) => applyMove(s, tokenId));
  };

  const reset = () => setState(createInitialState());

  const diceDisabled = useMemo(() => {
    if (state.phase === "finished") return true;
    if (state.phase === "setup") return state.dice != null && !!state.setupRolls[currentPlayer];
    return state.dice != null; // must move first
  }, [state, currentPlayer]);

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 lg:py-10">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-4xl font-black tracking-tight text-foreground lg:text-5xl">
              Ludo
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Roll a six to enter. Capture, race, win.
            </p>
          </div>
          <Button variant="outline" onClick={reset} className="font-medium">
            New game
          </Button>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Board state={state} onTokenClick={handleTokenClick} />

          <aside className="flex flex-col gap-6">
            <div className="rounded-2xl border-2 border-board-line/30 bg-board/40 p-5 shadow-soft">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                {state.phase === "finished" ? "Game over" : state.phase === "setup" ? "Setup" : "Current turn"}
              </p>
              <p className={`mt-1 font-display text-2xl font-bold ${PLAYER_TEXT[currentPlayer]}`}>
                {state.winner ? PLAYER_LABEL[state.winner] : PLAYER_LABEL[currentPlayer]}
              </p>
              <p className="mt-3 min-h-[2.5rem] text-sm text-foreground/80">{state.message}</p>

              <div className="mt-5 flex items-center justify-between gap-4">
                <Dice
                  value={state.dice}
                  onRoll={handleRoll}
                  disabled={diceDisabled}
                  colorClass={PLAYER_TEXT[currentPlayer]}
                />
                <div className="text-right text-xs text-muted-foreground">
                  {state.phase === "playing" && state.awaitingMove && state.dice != null && (
                    <p>
                      {legalTokenIds(state, state.dice).length > 0
                        ? "Tap a glowing token to move."
                        : "No legal moves — passing…"}
                    </p>
                  )}
                  {state.phase === "playing" && !state.awaitingMove && state.dice == null && (
                    <p>Click the die to roll.</p>
                  )}
                  {state.phase === "setup" && (
                    <p>{PLAYER_LABEL[currentPlayer]}, roll the die.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border-2 border-board-line/30 bg-board/40 p-5 shadow-soft">
              <PlayerPanel state={state} />
            </div>

            <div className="rounded-2xl border-2 border-board-line/30 bg-board/40 p-5 text-xs leading-relaxed text-muted-foreground shadow-soft">
              <h3 className="mb-2 font-display text-base text-foreground">House rules</h3>
              <ul className="list-disc space-y-1 pl-4">
                <li>Highest roll begins the game; ties re-roll.</li>
                <li>Roll a six to bring a token out of the yard.</li>
                <li>Rolling a six grants another roll (max 3).</li>
                <li>Land on an opponent to send them home — except on safe ⭐ squares.</li>
                <li>Get all four tokens to the center to win.</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
};

export default Index;
