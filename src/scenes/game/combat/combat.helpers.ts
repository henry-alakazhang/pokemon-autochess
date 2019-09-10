import { Attack, Pokemon } from '../../../core/pokemon.model';
import { assertNever } from '../../../helpers';
import { PokemonAnimationType } from '../../../objects/pokemon.object';
import { CombatScene } from './combat.scene';

export interface Coords {
  x: number;
  y: number;
}

/**
 * Returns the Manhattan distance between two coordinates
 */
export function getGridDistance(first: Coords, second: Coords) {
  return Math.abs(first.x - second.x) + Math.abs(first.y - second.y);
}

export function coordsEqual(first: Coords, second: Coords) {
  return first.x === second.x && first.y === second.y;
}

/*
  This file has a `getNearestTarget` and a `pathfind` function,
  which are both implementations of breadth-first search.

  The key difference is that `getNearestTarget` ignores collision,
  looking for just the nearest Pokemon that can be targetted. 
  `pathfind` is, as its name suggests, a proper pathfinding algorithm.

  Both of these are needed, because certain attacks have range.
  Some Pokemon can attack targets that they can't reach via movement.
  As such, the targetting algorithm needs to ignore collisions.

  If anyone can think of a cleaner way to do this, feel free to make a PR.

  TODO: I can probably shrink these down to one function, or at least
  share the BFS logic instead of doing some messy super-optimised code
  in one function, and human-readable logic in the other.
 */

/**
 * Gets the nearest enemy for the Pokemon at the target coordinates
 * Uses a collisionless breadth-first search
 *
 * ie.
 *     5
 *   C 1 6
 * B 4 . 2 7
 *   A 3 8
 *     9
 */
export function getNearestTarget(
  board: CombatScene['board'],
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
  const steps = [[-1, 1], [-1, -1], [1, -1], [1, 1]];

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
    for (let j = 0; j < steps.length; j++) {
      const step = steps[j];
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
 * Builds a path from start to somewhere in range of the target
 * Returns the first step in the path.
 */
export function pathfind(
  board: CombatScene['board'],
  /** Self X and Y coordinates */
  start: Coords,
  /** Target's X and Y coordinates */
  target: Coords,
  /** Attack range to count as "reached" */
  range: number
): Coords | undefined {
  // uses BFS
  // TODO: if the AI ends up being super stupid, use an optimal-path algorithm instead

  const self = board[start.x][start.y];
  if (!self) {
    return undefined;
  }

  // FIXME: Don't hardcode this length
  /** stores the fastest way to reach this step */
  const prev: Coords[][] = [[], [], [], [], []];
  const seen: boolean[][] = [[], [], [], [], []];

  const queue = [start];
  while (queue.length > 0) {
    // lazy cast because the loop condition already checks there'll be an element
    const check = queue.shift() as Coords;

    // reached a goal state, end
    if (getGridDistance(check, target) <= range) {
      prev[target.x][target.y] = check;
      break;
    }

    // else enqueue more items
    [
      { x: check.x + 1, y: check.y },
      { x: check.x - 1, y: check.y },
      { x: check.x, y: check.y + 1 },
      { x: check.x, y: check.y - 1 },
    ].forEach(newCoord => {
      if (
        newCoord.x >= 0 &&
        // FIXME: don't hardcode this length
        newCoord.x < board.length &&
        newCoord.y >= 0 &&
        newCoord.y < board.length &&
        !seen[newCoord.x][newCoord.y] &&
        !board[newCoord.x][newCoord.y]
      ) {
        queue.push(newCoord);
        seen[newCoord.x][newCoord.y] = true;
        prev[newCoord.x][newCoord.y] = check;
      }
    });
  }

  // trace back along the `prev` map to find the first step
  let curr = target;
  while (prev[curr.x][curr.y]) {
    if (coordsEqual(prev[curr.x][curr.y], start)) {
      return curr;
    }
    curr = prev[curr.x][curr.y];
  }
}

/**
 * Returns the turn delay in milliseconds for a pokemon.
 *
 * The delay scales from 0.5 APS at 50 base speed to 1.0 at 125 speed.
 * The minimum is 0.5 APS / 2 seconds per attack (no upper cap)
 */
export function getTurnDelay(pokemon: Pokemon) {
  const aps = (pokemon.speed + 25) / 150;
  return Math.min(1000 / aps, 2000);
}

export function getFacing(first: Coords, second: Coords): PokemonAnimationType {
  const horizontal = second.x - first.x;
  const vertical = second.y - first.y;

  if (Math.abs(horizontal) > Math.abs(vertical)) {
    // left or right
    return horizontal < 0 ? 'left' : 'right';
  }
  // up or down
  return vertical < 0 ? 'up' : 'down';
}

/**
 * Returns the angle (in radians) between two points)
 */
export function getAngle(first: Coords, second: Coords) {
  return Math.atan2(second.y - first.y, second.x - first.x);
}

export function getAttackAnimation(
  start: Coords,
  facing: PokemonAnimationType
): Partial<Coords> {
  switch (facing) {
    case 'up':
      return { y: start.y - 15 };
    case 'down':
      return { y: start.y + 15 };
    case 'left':
      return { x: start.x - 15 };
    case 'right':
      return { x: start.x + 15 };
    default:
      assertNever(facing);
  }
  return start;
}

export function calculateDamage(
  attacker: Pokemon,
  defender: Pokemon,
  attack: Attack | { damage: number; defenseStat: 'defense' | 'specDefense' }
) {
  // use specified defenseStat, or the one that correlates to the attack stat
  const defenseStatName =
    attack.defenseStat || attack.stat === 'attack' ? 'defense' : 'specDefense';
  // use base attack/defense so the formula doesn't scale exponentially with level
  const attackStat = 'damage' in attack ? attack.damage : attacker[attack.stat];
  const defenseStat = defender[defenseStatName];

  // reduction is stat / 5, rounded down to the nearest 5
  const reduction = (Math.floor(defenseStat / 25) * 5) / 100;

  return Math.round(attackStat * (1 - reduction) + 2);
}
