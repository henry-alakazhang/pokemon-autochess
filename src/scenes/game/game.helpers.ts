import { getSynergyTier, synergyData } from '../../core/game.model';
import { getPokemonStrength } from '../../core/pokemon.helpers';
import { Pokemon, PokemonName } from '../../core/pokemon.model';
import { flatten, isDefined, shuffle } from '../../helpers';
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

export interface Level {
  /** Amount of Pokemon that can be placed on the board at this level */
  readonly teamSize: number;
  /** Amount of bonus slots available (Pokemon applies traits but doesn't join combat) */
  readonly bonusSlots?: number;
  /** Amount of experienced needed to reach next level. Set this to 0 if there's no next level */
  readonly expToLevel: number;
  /**
   * Odds of each tier of Pokemon in the shop at this level.
   * 6-element array to allow for direct indexing using Pokemon tier.
   **/
  readonly shopOdds: [0, number, number, number, number, number];
}

/**
 * Default levelling cadence
 *
 * Odd levels = team size increase / slight shop odds change
 *
 * Even levels = new tier of Pokemon / significant shop odds change
 */
export const DEFAULT_LEVELS: Level[] = [
  { teamSize: 2, expToLevel: 2, shopOdds: [0, 80, 20, 0, 0, 0] },
  { teamSize: 3, expToLevel: 2, shopOdds: [0, 75, 25, 0, 0, 0] },
  { teamSize: 3, expToLevel: 6, shopOdds: [0, 55, 30, 15, 0, 0] },
  { teamSize: 4, expToLevel: 14, shopOdds: [0, 45, 35, 20, 0, 0] },
  { teamSize: 4, expToLevel: 14, shopOdds: [0, 33, 40, 24, 3, 0] },
  { teamSize: 5, expToLevel: 26, shopOdds: [0, 28, 36, 28, 8, 0] },
  { teamSize: 5, expToLevel: 26, shopOdds: [0, 21, 26, 35, 16, 2] },
  { teamSize: 6, expToLevel: 36, shopOdds: [0, 17, 23, 33, 21, 6] },
  { teamSize: 6, expToLevel: 54, shopOdds: [0, 10, 16, 26, 34, 14] },
  {
    teamSize: 6,
    bonusSlots: 1,
    expToLevel: 44,
    shopOdds: [0, 8, 14, 25, 33, 20],
  },
  {
    teamSize: 6,
    bonusSlots: 1,
    expToLevel: 0,
    shopOdds: [0, 5, 10, 20, 30, 35],
  },
];

export const DEFAULT_SHOP_POOL = {
  1: 27,
  2: 24,
  3: 21,
  4: 18,
  5: 15,
};

/**
 * A representation of a game mode, with all its options
 */
export interface GameMode {
  /** Debug name. */
  readonly name: string;
  /** The set of stages (which are made up of rounds) */
  readonly stages: Stage[];
  /**
   * Details of each player level.
   * Levels start at 0 for index convenience.
   */
  readonly levels: Level[];
  /**
   * The number of Pokemon in the shop pool for each tier.
   */
  readonly shopPool: {
    [tier in Pokemon['tier']]: number;
  };
  /** Starting player gold */
  readonly startingGold: number;
  /** Whether the game mode has opposing players */
  readonly isPVE?: boolean;
}

export type NeutralRound = {
  readonly name: string;
  readonly board: ReadonlyArray<{
    readonly name: PokemonName;
    readonly location: Coords;
  }>;
};

export interface Stage {
  /** Number of rounds to play through (1-1, 1-2, etc) */
  readonly rounds: number;
  /** Formula for damage at end of round */
  readonly damage: () => number;
  /** Formula for gold gain at end of round */
  readonly gold: (player: Player, won: boolean, streak: number) => number;
  readonly neutralRounds?: {
    [k: number]: NeutralRound;
  };
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
    name: 'hyper',
    stages: [
      {
        rounds: 1,
        damage: () => 5,
        gold: goldGainFunc(5),
        neutralRounds: {
          1: {
            name: 'Wild Rattata',
            board: [{ name: 'neutral_only_rattata', location: { x: 3, y: 3 } }],
          },
        },
      },
      {
        rounds: 1,
        damage: () => 5,
        gold: goldGainFunc(5),
        autolevel: 1,
        neutralRounds: {
          1: {
            name: 'Wild Rattata',
            board: [
              { name: 'neutral_only_rattata', location: { x: 0, y: 4 } },
              { name: 'neutral_only_rattata', location: { x: 2, y: 3 } },
              { name: 'neutral_only_rattata', location: { x: 3, y: 3 } },
              { name: 'neutral_only_rattata', location: { x: 5, y: 4 } },
            ],
          },
        },
      },
      { rounds: 1, damage: () => 5, autolevel: 2, gold: goldGainFunc(5) },
      { rounds: 2, damage: () => 10, autolevel: 3, gold: goldGainFunc(6) },
      { rounds: 2, damage: () => 10, autolevel: 4, gold: goldGainFunc(6) },
      { rounds: 3, damage: () => 15, autolevel: 5, gold: goldGainFunc(7) },
      { rounds: 3, damage: () => 15, autolevel: 6, gold: goldGainFunc(8) },
      { rounds: 4, damage: () => 20, autolevel: 7, gold: goldGainFunc(8) },
      { rounds: 4, damage: () => 20, autolevel: 8, gold: goldGainFunc(8) },
      { rounds: 5, damage: () => 25, autolevel: 9, gold: goldGainFunc(9) },
      { rounds: 5, damage: () => 25, autolevel: 10, gold: goldGainFunc(9) },
      // last section is sudden death. 99 damage, no gold - game must end!
      { rounds: 5, damage: () => 99, gold: () => 0 },
    ],
    levels: DEFAULT_LEVELS,
    shopPool: DEFAULT_SHOP_POOL,
    startingGold: 10,
  };
}

export function getDebugGameMode(): GameMode {
  return {
    name: 'debug',
    stages: [{ rounds: 99, damage: () => 1, gold: () => 50 }],
    levels: [{ teamSize: 6, expToLevel: 0, shopOdds: [0, 1, 1, 1, 1, 1] }],
    shopPool: {
      1: 50,
      2: 50,
      3: 50,
      4: 50,
      5: 50,
    },
    startingGold: 50,
  };
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

export function calculateBoardStrength(player: Player): number {
  const totalStrength = flatten(player.mainboard)
    .filter(isDefined)
    .map((pokemon) => getPokemonStrength(pokemon.basePokemon))
    .reduce((a, b) => a + b, 0);
  const totalSynergyTiers = player.synergies
    .map((synergy) =>
      getSynergyTier(synergyData[synergy.category], synergy.count)
    )
    .reduce((a, b) => a + 2 ** (b - 1), 0);

  return totalStrength + totalSynergyTiers;
}
