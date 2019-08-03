import { GameScene } from "./game.scene";

export interface Coords {
  x: number;
  y: number;
}

/**
 * Gets the nearest enemy for the Pokemon at the target coordinates
 * Uses a breadth-first search, checking squares 1 away, then 2, then 3 etc
 * going around clockwise starting at the right
 *
 * ie.
 *     5
 *   C 1 6
 * B 4 . 2 7
 *   A 3 8
 *     9
 */
export function getNearestTarget(
  board: GameScene["board"],
  { x, y }: Coords,
  /** width of the board */
  width: number,
  /** height of the board */
  height: number
): Coords | undefined {
  const self = board[x][y];
  if (!self) {
    return undefined;
  }

  const { side } = self;

  // the following code is some pathfinding magic
  // don't question it or look too closely

  // outer loop: distance
  for (let i = 1; i <= width + height - 2; i++) {
    // returned coordinates
    let x2 = x + i;
    let y2 = y;

    // TODO: Fix this loop, no-restricted-syntax
    // at each loop, there are 4 * dist possible places to go
    // and we will go in clockwise order
    // eg. (1,0) (0,1) (-1,0) (0,-1)
    // or  (2,0) (1,1) (0,2) (-1,1) (-2,0) (-1,-1) (0,-2) (1,-1)
    // if you observe, we can do (x-=1, y+=1) to iterate around the bottom-right
    // then do (x-=1, y-=1) to iterate around the bottom-left
    // and so on
    for (const step of [[-1, 1], [-1, -1], [1, -1], [1, 1]]) {
      for (let k = 0; k < i; k++) {
        // if still on board
        if (x2 >= 0 && x2 < width && y2 >= 0 && y2 < height) {
          const target = board[x2][y2];
          // opposite side matched: target this one
          if (target && target.side !== side) {
            return { x: x2, y: y2 };
          }
        }

        // continue loop
        x2 += step[0];
        y2 += step[1];
      }
    }
  }
}

/**
 * Returns the Manhattan distance between two coordinates
 */
export function getGridDistance(first: Coords, second: Coords) {
  return Math.abs(first.x - second.x) + Math.abs(first.y - second.y);
}
