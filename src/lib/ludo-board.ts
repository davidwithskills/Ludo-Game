// Coordinate maps for the 15x15 Ludo board.
// Cells are 1-indexed columns/rows from 1..15. We'll store each as [col, row].
// Rendering converts to percentage positions.

import { PlayerId } from "./ludo";

export type Cell = [number, number]; // [col, row], 1-15

// Helper to build the 52-cell track.
export const TRACK_CELLS: Cell[] = (() => {
  const t: Cell[] = [];
  // Path (col,row) clockwise from RED start (2,7):
  const path: Cell[] = [
    [2, 7], [3, 7], [4, 7], [5, 7], [6, 7],
    [7, 6], [7, 5], [7, 4], [7, 3], [7, 2],
    [7, 1], [8, 1], [9, 1],
    [9, 2], [9, 3], [9, 4], [9, 5], [9, 6],
    [10, 7], [11, 7], [12, 7], [13, 7], [14, 7],
    [15, 7], [15, 8], [15, 9],
    [14, 9], [13, 9], [12, 9], [11, 9], [10, 9],
    [9, 10], [9, 11], [9, 12], [9, 13], [9, 14],
    [9, 15], [8, 15], [7, 15],
    [7, 14], [7, 13], [7, 12], [7, 11], [7, 10],
    [6, 9], [5, 9], [4, 9], [3, 9], [2, 9],
    [1, 9], [1, 8], [1, 7]
  ];
  return path;
})();

function buildTrack(): Cell[] {
  const cells: Cell[] = [];
  const add = (c: Cell) => cells.push(c);

  for (let c = 2; c <= 6; c++) add([c, 7]);
  for (let r = 6; r >= 2; r--) add([7, r]);
  add([7, 1]); add([8, 1]); add([9, 1]);
  for (let r = 2; r <= 6; r++) add([9, r]);
  for (let c = 10; c <= 14; c++) add([c, 7]);
  add([15, 7]); add([15, 8]); add([15, 9]);
  for (let c = 14; c >= 10; c--) add([c, 9]);
  for (let r = 10; r <= 14; r++) add([9, r]);
  add([9, 15]); add([8, 15]); add([7, 15]);
  for (let r = 14; r >= 10; r--) add([7, r]);
  for (let c = 6; c >= 2; c--) add([c, 9]);
  add([1, 9]); add([1, 8]); add([1, 7]);

  return cells;
}

export const BOARD_TRACK: Cell[] = buildTrack();

export const HOME_COLUMNS: Record<PlayerId, Cell[]> = {
  red: [
    [2, 8], [3, 8], [4, 8], [5, 8], [6, 8], [7, 8],
  ],
  green: [
    [8, 2], [8, 3], [8, 4], [8, 5], [8, 6], [8, 7],
  ],
  yellow: [
    [14, 8], [13, 8], [12, 8], [11, 8], [10, 8], [9, 8],
  ],
  blue: [
    [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  ],
};

export const YARD_SLOTS: Record<PlayerId, Cell[]> = {
  red:    [[2.5, 2.5], [4.5, 2.5], [2.5, 4.5], [4.5, 4.5]],
  green:  [[11.5, 2.5], [13.5, 2.5], [11.5, 4.5], [13.5, 4.5]],
  yellow: [[11.5, 11.5], [13.5, 11.5], [11.5, 13.5], [13.5, 13.5]],
  blue:   [[2.5, 11.5], [4.5, 11.5], [2.5, 13.5], [4.5, 13.5]],
};

export const YARD_RECTS: Record<PlayerId, [number, number, number, number]> = {
  red:    [1, 1, 6, 6],
  green:  [10, 1, 15, 6],
  yellow: [10, 10, 15, 15],
  blue:   [1, 10, 6, 15],
};

export function cellToPercent(cell: [number, number]): { left: string; top: string } {
  const [col, row] = cell;
  return {
    left: `${((col - 0.5) / 15) * 100}%`,
    top: `${((row - 0.5) / 15) * 100}%`,
  };
}
