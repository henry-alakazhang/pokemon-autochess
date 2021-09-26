import { Player } from '../../objects/player.object';
import { Coords } from './combat/combat.helpers';

// fixme: scale this off the canvas size
/** X-coordinate of the center of the grid */
export const GRID_X = 450;
/** Y-coordinate of the center of the grid */
export const GRID_Y = 300;
export const CELL_WIDTH = 70;
export const BOARD_WIDTH = 6;

/**
 * Returns the graphical x and y coordinates for a spot in the mainboard
 * The x/y is offset to the center of the grid
 */
export function getCoordinatesForMainboard({ x, y }: Coords): Coords {
  return {
    x: GRID_X + (x - BOARD_WIDTH / 2 + 0.5) * CELL_WIDTH,
    y: GRID_Y + (y - BOARD_WIDTH / 2 + 0.5) * CELL_WIDTH,
  };
}

/**
 * A representation of a game mode, with all its options
 */
export interface GameMode {
  /** The set of stages (which are made up of rounds) */
  readonly stages: Stage[];
  /** Whether players can spend gold on exp to level up */
  readonly levelCosts?: number[];
}

export interface Stage {
  /** Number of rounds to play through (1-1, 1-2, etc) */
  readonly rounds: number;
  /** Formula for damage at end of round */
  readonly damage: () => number;
  /** Formula for gold gain at end of round */
  readonly gold: (player: Player, won: boolean, streak: number) => number;
  /** Whether to automatically level the player at the start of the stage */
  readonly autolevel?: number;
  // TODO: add only when shop is there
  // readonly pokemarts: number[];
}

export function getHyperRollGameMode(): GameMode {
  const streakGold = (streak: number) => {
    if (streak > 5) {
      return 3;
    }
    if (streak > 4) {
      return 2;
    }
    if (streak > 2) {
      return 1;
    }
    return 0;
  };
  // function that creates a function that returns how much gold is earned
  const goldGainFunc = (base: number) => {
    // hyper roll gold gain - base amount + 2 gold for wins + streak gold
    // hyper roll has no interest.
    return (player: Player, won: boolean, streak: number) =>
      base + (won ? 2 : 0) + streakGold(streak);
  };

  return {
    stages: [
      { rounds: 1, damage: () => 5, gold: goldGainFunc(3) },
      { rounds: 2, damage: () => 7, autolevel: 2, gold: goldGainFunc(3) },
      { rounds: 3, damage: () => 9, autolevel: 3, gold: goldGainFunc(4) },
      { rounds: 4, damage: () => 11, autolevel: 4, gold: goldGainFunc(4) },
      { rounds: 5, damage: () => 13, autolevel: 5, gold: goldGainFunc(5) },
      { rounds: 9, damage: () => 15, autolevel: 6, gold: goldGainFunc(5) },
      // last section is sudden death. 99 damage, no gold - game must end!
      { rounds: 5, damage: () => 99, gold: () => 0 },
    ],
    levelCosts: undefined,
  };
}

/**
 * Shuffles the first `amount` elements of a given array.
 * Modifies the array in-place and returns it.
 */
export function shuffle<T>(array: T[], amount = array.length - 1): T[] {
  // shuffle the list with a bastardised Fisher-Yates:
  // for each item (up to the limit we care about)
  for (let i = 0; i < amount; i++) {
    // pick a random other element (that we haven't already swapped)
    const swapIndex = Math.floor(Math.random() * (array.length - i)) + i;
    // and swap the two (fancy ES6 syntax)
    [array[i], array[swapIndex]] = [array[swapIndex], array[i]];
  }
  return array;
}

/**
 * Returns `amount` random names from a name list, with no repeats.
 */
export function getRandomNames(amount: number): string[] {
  const names = [
    'Red',
    'Leaf',
    'Blue',
    'Ethan',
    'Kris',
    'Lyra',
    'Silver',
    'May',
    'Brendan',
    'Wally',
    'Lucas',
    'Dawn',
    'Barry',
    'Hilbert',
    'Hilda',
    'Cheren',
    'Bianca',
    'Nate',
    'Rosa',
    'Hugh',
    'Calem',
    'Serena',
    'Elio',
    'Selene',
    'Hau',
    'Gladion',
    'Victor',
    'Gloria',
    'Hop',
    'Bede',
    'Marnie',
  ];

  return shuffle(names, amount).slice(0, amount);
}
