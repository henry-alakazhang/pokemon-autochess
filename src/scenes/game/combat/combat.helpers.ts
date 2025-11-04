import { Targetting } from '../../../core/move.model';
import { Pokemon } from '../../../core/pokemon.model';
import { assertNever, flatten, isDefined } from '../../../helpers';
import {
  PokemonAnimationType,
  PokemonObject,
} from '../../../objects/pokemon.object';
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

export function getOppositeSide(side: 'player' | 'enemy') {
  return side === 'player' ? 'enemy' : 'player';
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
export function getNearest(
  board: CombatScene['board'],
  { x, y }: Coords,
  condition: (target?: PokemonObject) => boolean
): Coords | undefined {
  const width = board.length;
  if (width === 0) {
    return;
  }
  const height = board[0].length;

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
          // meets the condition: target this one.
          if (condition(board[x2][y2])) {
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
 * Returns the Pokemon nearest to a Pokemon at a given Coords.
 * Ignores collision/pathing; just finds the nearest enemy
 */
export function getNearestTarget(
  board: CombatScene['board'],
  { x, y }: Coords
) {
  const self = board[x][y];
  if (!self) {
    return undefined;
  }

  return getNearest(
    board,
    { x, y },
    (target?: PokemonObject) => !!(target && target.side !== self.side)
  );
}

export function getNearestEmpty(board: CombatScene['board'], { x, y }: Coords) {
  // return self if empty before pathfinding
  if (!board[x][y]) {
    return { x, y };
  }

  return getNearest(
    board,
    { x, y },
    (target?: PokemonObject) => !isDefined(target)
  );
}

/**
 * Returns the middle point between a number of coordinates
 * Calculated via just averaging all the values :)
 */
export function getCenter(coords: Coords[]): Coords {
  const sum = { x: 0, y: 0 };
  // could do this with a reduce, but this is easier to read for sureee
  coords.forEach(({ x, y }) => {
    sum.x += x;
    sum.y += y;
  });
  return {
    x: Math.round(sum.x / coords.length),
    y: Math.round(sum.y / coords.length),
  };
}

/**
 * Builds a path from start to somewhere in range of any number of targets
 *
 * Returns the path to the closest target, in reverse order
 */
export function pathfind(
  board: CombatScene['board'],
  /** Self X and Y coordinates */
  start: Coords,
  /** All target's X and Y coordinates */
  targets: Coords[],
  /** Attack range to count as "reached" */
  range: number
): { target: Coords; path: Coords[] } | undefined {
  // uses BFS
  // TODO: if the AI ends up being super stupid, use an optimal-path algorithm instead

  const self = board[start.x][start.y];
  if (!self) {
    return undefined;
  }

  /** stores the fastest way to reach this step */
  const prev: Coords[][] = Array(board.length)
    .fill(undefined)
    .map(() => Array(board.length));
  const seen: boolean[][] = Array(board.length)
    .fill(undefined)
    .map(() => Array(board.length));

  const queue = [start];
  while (queue.length > 0) {
    // lazy cast because the loop condition already checks there'll be an element
    const check = queue.shift() as Coords;

    // check all targets to see if one is reachable
    const reachedTarget = targets.find(
      (t) => getGridDistance(check, t) <= range
    );
    if (reachedTarget) {
      prev[reachedTarget.x][reachedTarget.y] = check;
      break;
    }

    // else enqueue more items
    [
      { x: check.x + 1, y: check.y },
      { x: check.x - 1, y: check.y },
      { x: check.x, y: check.y + 1 },
      { x: check.x, y: check.y - 1 },
    ].forEach((newCoord) => {
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

  // find the target which we ended up reaching
  const foundTarget = targets.find((t) => isDefined(prev[t.x][t.y]));
  if (!foundTarget) {
    // if there wasn't one, then no targets are in range
    return undefined;
  }

  // reverse back through the prev grid to build the path
  let curr = foundTarget;
  const path: Coords[] = [];
  while (prev[curr.x][curr.y]) {
    if (coordsEqual(prev[curr.x][curr.y], start)) {
      return { target: foundTarget, path };
    }
    curr = prev[curr.x][curr.y];
    path.push(curr);
  }
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
  pool,
  needsEmpty,
}: {
  board: CombatScene['board'];
  user: Coords;
  range: number;
  getAOE: (coords: Coords, myCoords: Coords) => Coords[];
  targetAllies?: boolean;
  targetting?: Targetting;
  /** Specific tiles to optimise from (ignoring others) */
  pool?: Coords[];
  /** Whether the tile needs to be empty */
  needsEmpty?: boolean;
}): Coords | undefined {
  const userSide = board[user.x]?.[user.y]?.side;
  if (!userSide) {
    return undefined;
  }
  const targetSide = targetAllies ? userSide : getOppositeSide(userSide);

  let best: Coords | undefined;
  let most = 0;

  const checkCoords = (x: number, y: number) => {
    const tryCoords = { x, y };
    if (!inBounds(board, tryCoords)) {
      return;
    }

    const unitAtCoords = board[x]?.[y];
    // ignore squares outside of range
    if (getGridDistance(user, tryCoords) > range) {
      return;
    }
    // ignore squares without targettable units if we need to target one
    if (targetting === 'unit' && unitAtCoords?.side !== targetSide) {
      return;
    }
    // ignore squares with units if we need an empty space
    if (needsEmpty && isDefined(unitAtCoords)) {
      return;
    }

    // check how many people this would hit
    const numberHit = getAOE(tryCoords, user)
      .filter((coords) => inBounds(board, coords))
      .filter((hit) => board[hit.x]?.[hit.y]?.side === targetSide).length;

    if (numberHit > most) {
      best = tryCoords;
      most = numberHit;
    }
  };

  if (pool) {
    // if given a pool, just search in the pool
    pool.forEach(({ x, y }) => checkCoords(x, y));
  } else {
    // otherwise, search the entire board
    board.forEach((col, x) =>
      col.forEach((_, y) => {
        checkCoords(x, y);
      })
    );
  }

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

export function getRandomTarget({
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

  const possibleTargets = flatten(
    board.map((col, x) => col.map((pokemon, y) => ({ x, y, pokemon })))
  ).filter(({ pokemon }) => pokemon?.side === targetSide);

  if (possibleTargets.length === 0) {
    return undefined;
  }

  const choice = Math.floor(Math.random() * possibleTargets.length);

  // technically this returns the Pokemon with it, but the type system should prevent it from being used
  return possibleTargets[choice];
}

/**
 * Returns the turn delay in milliseconds for a pokemon.
 *
 * The delay scales linearly from 0.5 APS at 50 base speed to 1.0 at 150 speed.
 * The minimum is 0.5 APS / 2 seconds per attack (no upper cap)
 */
export function getTurnDelay(pokemon: Pokemon) {
  const aps = (pokemon.speed + 25) / 175;
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

/**
 * Represents a damaging action. One of:
 * - Basic attack (attack stat -> defense stat)
 * - Regular move damage (damage number -> defense stat)
 * - True damage (damage number)
 *
 * Latter is fully separated to make it harder to accidentally
 * pass true damage to a move.
 */
export type OffenseAction =
  | {
      stat: 'attack' | 'specAttack';
      defenseStat?: 'defense' | 'specDefense';
    }
  | {
      damage: number;
      defenseStat: 'defense' | 'specDefense';
    }
  | {
      trueDamage: number;
    };

export interface DamageConfig {
  /** Whether this is damage from a basic attack */
  readonly isAttack?: boolean;
  /** Whether damage is being dealt in an AOE */
  readonly isAOE?: boolean;
  /** Whether to trigger events (usually false for damage over time and similar effects) */
  readonly triggerEvents?: boolean;
  /** Whether attack can crit */
  readonly canCrit?: boolean;
}

/**
 * Returns the % damage reduction provided by a defense stat.
 *
 * The formula is similar to League/TFT but scales worse because numbers are higher
 * * 50 base defense provides 15% reduction
 * * 100 base defense provides 25% reduction
 * * 200 base defense provides 40% reduction
 *
 * This seems like diminishing returns, but it's actually linear in effective HP
 * Every point of base defense provides 0.33*% more effective HP
 */
export function getDamageReduction(defense: number) {
  return Math.round((100 * defense) / (300 + defense)) / 100;
}

export function calculateDamage(
  attacker: PokemonObject,
  defender: PokemonObject,
  attack: OffenseAction
) {
  if ('trueDamage' in attack) {
    return attack.trueDamage;
  }

  // use specified defenseStat, or the one that correlates to the attack stat
  const defenseStatName =
    attack.defenseStat ??
    (attack.stat === 'attack' ? 'defense' : 'specDefense');
  // use base attack/defense so the formula doesn't scale exponentially with level
  const baseDamage =
    'damage' in attack ? attack.damage : attacker.basePokemon[attack.stat];
  const defenseValue = defender.basePokemon[defenseStatName];

  const defenseReduction = getDamageReduction(defenseValue);
  // bonus percentage reduction from a buff
  const statusReduction =
    (defender.status.percentDamageReduction?.value ?? 0) / 100;

  return Math.round(
    baseDamage * (1 - defenseReduction) * (1 - statusReduction) + 2
  );
}
