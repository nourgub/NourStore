// Server-side validation of a saved whiteboard (types in ./boardState.ts).
import { z } from "zod";
import { BOARD_COLORS, type BoardState } from "./boardState";

export { EMPTY_BOARD, MAX_BOARD_BYTES, type BoardState } from "./boardState";

const coordinate = z.number().min(-0.05).max(1.05);

export const boardState: z.ZodType<BoardState> = z.object({
  v: z.literal(1),
  strokes: z
    .array(
      z.object({
        tool: z.enum(["pen", "eraser"]),
        color: z.enum(BOARD_COLORS),
        width: z.number().min(1).max(40),
        points: z.array(coordinate).max(4000),
      })
    )
    .max(1500),
  texts: z.array(z.object({ x: coordinate, y: coordinate, text: z.string().max(300), math: z.boolean(), color: z.enum(BOARD_COLORS) })).max(200),
  axes: z.boolean(),
  curves: z.array(z.string().max(80)).max(6),
  example: z.object({ skill: z.string().max(64), shown: z.number().int().min(0).max(30) }).nullable(),
});
