import { Targetting } from '../../../core/move.model';
import { Pokemon } from '../../../core/pokemon.model';
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

export function inBounds(board: unknown[][], coords: Coords) {
  return (
    coords.x >= 0 &&
    coords.x < board.length &&
    coords.y >= 0 &&
    coords.y < board[coords.x].length
  );
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
  const steps = [
    [-1, 1],
    [-1, -1],
    [1, -1],
    [1, 1],
  ];

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
        inBounds(board, newCoord) &&
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

export function getOppositeSide(side: 'player' | 'enemy') {
  return side === 'player' ? 'enemy' : 'player';
}

/**
 * Picks the best square to target to maximise an area of effect,
 * given a user, range and shape-producing function
 */
export function optimiseAOE({
  board,
  user,
  range,
  getAOE,
  targetAllies = false,
  targetting = 'ground',
}: {
  board: CombatScene['board'];
  user: Coords;
  range: number;
  getAOE: (coords: Coords, myCoords: Coords) => Coords[];
  targetAllies?: boolean;
  targetting?: Targetting;
}): Coords | undefined {
  const userSide = board[user.x][user.y]?.side;
  if (!userSide) {
    return undefined;
  }
  const targetSide = targetAllies ? userSide : getOppositeSide(userSide);

  let best: Coords | undefined;
  let most = 0;
  board.forEach((col, x) =>
    col.forEach((unitAtCoords, y) => {
      const tryCoords = { x, y };
      // ignore squares outside of range
      if (getGridDistance(user, tryCoords) > range) {
        return;
      }
      // ignore squares without targettable units if we need to target one
      if (targetting === 'unit' && unitAtCoords?.side !== targetSide) {
        return;
      }

      // check how many people this would hit
      const numberHit = getAOE(tryCoords, user).filter(
        hit => board[hit.x]?.[hit.y]?.side === targetSide
      ).length;

      if (numberHit > most) {
        best = tryCoords;
        most = numberHit;
      }
    })
  );

  return best;
}

/**
 * Picks the furthest square  the coords of the unit furthest away from the user of a move.
 *
 * TODO: might be able to do a sneaky here and merge this into optimiseAOE with a clever getAOE function.
 */
export function getFurthestTarget({
  board,
  user,
  targetAllies,
}: {
  board: CombatScene['board'];
  user: Coords;
  targetAllies?: boolean;
}): Coords | undefined {
  const userSide = board[user.x][user.y]?.side;
  if (!userSide) {
    return undefined;
  }
  const targetSide = targetAllies ? userSide : getOppositeSide(userSide);

  let furthest: Coords | undefined;
  board.forEach((col, x) => {
    col.forEach((unitAtCoords, y) => {
      const tryCoords = { x, y };

      // ignore unit if nonexistent or not ally
      if (unitAtCoords?.side !== targetSide) {
        return;
      }

      // set furthest if it doesn't exist yet
      if (!furthest) {
        furthest = tryCoords;
        return;
      }

      // otherwise set if this is further than the furthest
      if (getGridDistance(user, tryCoords) > getGridDistance(user, furthest)) {
        furthest = tryCoords;
      }
    });
  });

  return furthest;
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

type OffenseAction =
  | {
      stat: 'attack' | 'specAttack';
      defenseStat?: 'defense' | 'specDefense';
    }
  | {
      damage: number;
      defenseStat: 'defense' | 'specDefense';
    };

export function calculateDamage(
  attacker: Pokemon,
  defender: Pokemon,
  attack: OffenseAction
) {
  // use specified defenseStat, or the one that correlates to the attack stat
  const defenseStatName =
    attack.defenseStat || attack.stat === 'attack' ? 'defense' : 'specDefense';
  // use base attack/defense so the formula doesn't scale exponentially with level
  const baseDamage = 'damage' in attack ? attack.damage : attacker[attack.stat];
  const defenseValue = defender[defenseStatName];

  // reduction is stat / 5, rounded down to the nearest 5
  const reduction = (Math.floor(defenseValue / 25) * 5) / 100;

  return Math.round(baseDamage * (1 - reduction) + 2);
}
