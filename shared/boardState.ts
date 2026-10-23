// The lesson whiteboard's saved state (types and constants, no validator:
// the client imports this; the server validates with ./board.ts).
// Coordinates are normalised to the board (0..1) so a board drawn on a phone
// opens on a tablet.
export const BOARD_COLORS = ["#f5f1e6", "#e0b43a", "#5fb3f0", "#e8735a", "#7bd389"] as const;
export type BoardColor = (typeof BOARD_COLORS)[number];
export const MAX_BOARD_BYTES = 400_000;

export type BoardStroke = {
  tool: "pen" | "eraser";
  color: BoardColor;
  width: number;
  /** Flattened x, y pairs. */
  points: number[];
};

export type BoardText = {
  x: number;
  y: number;
  text: string;
  /** Typed maths (left-to-right), as opposed to words (follows the language). */
  math: boolean;
  color: BoardColor;
};

export type BoardState = {
  v: 1;
  strokes: BoardStroke[];
  texts: BoardText[];
  axes: boolean;
  curves: string[];
  /** The teacher's worked example on the board: which skill, how many steps shown. */
  example: { skill: string; shown: number } | null;
};

export const EMPTY_BOARD: BoardState = { v: 1, strokes: [], texts: [], axes: false, curves: [], example: null };
