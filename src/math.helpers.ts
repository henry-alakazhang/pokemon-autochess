import { Coords } from './scenes/game/combat/combat.helpers';

/**
 * Interpolates a line between two points where the line is closer to horizontal than vertical
 * The provided coordinates must satisfy x1 < x2.
 */
function interpolateHorizontal(
  { x: x1, y: y1 }: Coords,
  { x: x2, y: y2 }: Coords
): Coords[] {
  const line = [];
  for (let i = x1; i <= x2; i++) {
    line.push({
      x: i,
      // linear interpolation between y1 and y2 based on the % of i between x1 and x2
      y: Math.round(y1 + ((y2 - y1) * (i - x1)) / (x2 - x1)),
    });
  }
  return line;
}

/**
 * Interpolates a line between two points where the line is closer to vertical than horizontal
 * The provided coordinates must satisfy y1 < y2
 */
function interpolateVertical(
  { x: x1, y: y1 }: Coords,
  { x: x2, y: y2 }: Coords
): Coords[] {
  const line = [];
  for (let i = y1; i <= y2; i++) {
    line.push({
      // linear interpolation between x1 and x2 based on the % of i between y1 and y2
      x: Math.round(x1 + ((x2 - x1) * (i - y1)) / (y2 - y1)),
      y: i,
    });
  }
  return line;
}

/**
 * Calculates the AOE for a line-based AOE between two points
 *
 * Uses Bresenham's line algorithm to calculate the line:
 * https://en.wikipedia.org/wiki/Bresenham%27s_line_algorithm
 */
export function interpolateLineAOE(
  p1: Coords,
  p2: Coords
  // TODO: support width
  //  { width = 1 }: { width: number }
): Coords[] {
  const dx = Math.abs(p2.x - p1.x);
  const dy = Math.abs(p2.y - p1.y);
  // special case: single point always returns self
  if (dx === 0 && dy === 0) {
    return [p1];
  }
  if (dx >= dy) {
    // most horizontal line
    return p1.x < p2.x
      ? interpolateHorizontal(p1, p2)
      : interpolateHorizontal(p2, p1);
  }

  // mostly vertical line
  return p1.y < p2.y
    ? interpolateVertical(p1, p2)
    : interpolateVertical(p2, p1);
}
