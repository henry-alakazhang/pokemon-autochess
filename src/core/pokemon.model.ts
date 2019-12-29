import { Move } from './move.model';
import {
  braveBird,
  dragonDance,
  furyCutter,
  razorWind,
  shadowTag,
  softboiled,
  thunderWave,
  twineedle,
  voltTackle,
} from './moves';

export type Type =
  | 'normal'
  | 'fire'
  | 'fighting'
  | 'water'
  | 'flying'
  | 'grass'
  | 'poison'
  | 'electric'
  | 'ground'
  | 'psychic'
  | 'rock'
  | 'ice'
  | 'bug'
  | 'dragon'
  | 'ghost'
  | 'dark'
  | 'steel'
  | 'fairy';

export type Role =
  | 'setup sweeper'
  | 'physical attacker'
  | 'special attacker'
  | 'bulky attacker'
  | 'hazard setter'
  | 'status support'
  | 'revenge killer'
  | 'wall breaker'
  | 'wall';

export type Category = Type | Role;

export interface Attack {
  /** number of squares away the move can reach */
  readonly range: number;
  /** the pokemon stat used for calculating damage */
  readonly stat: 'attack' | 'specAttack';
  /** the pokemon stat used for calculating resistance
   * defaults to the opposite of the attack stat */
  readonly defenseStat?: 'defense' | 'specDefense';
  /** details for the particle/fx for the projectile */
  readonly projectile?: {
    readonly key: string;
    readonly speed: number;
  };
  /**
   * If this attack can't be used.
   * hacky way to implement Pokemon without basic attacks :)
   */
  readonly unusable?: boolean;
}

export interface Pokemon {
  /** Name for display in-game */
  readonly displayName: string;
  readonly categories: ReadonlyArray<Category>;
  /** Pokemon tier / shop cost */
  readonly tier: 1 | 2 | 3 | 4 | 5;
  readonly maxHP: number;
  readonly maxPP?: number;
  readonly attack: number;
  readonly defense: number;
  readonly specAttack: number;
  readonly specDefense: number;
  readonly speed: number;
  readonly basicAttack: Attack;
  readonly move?: Move;
  readonly evolution?: PokemonName;
  /**
   * Stage 1 Pokemon that this evolves from
   * Used for figuring out shop pools / selling evolved Pokemon
   */
  readonly base: PokemonName;
  /** Evolution stage */
  readonly stage: 1 | 2 | 3;
}

/**
 * The raw data for all the Pokemon bases (fully evolved)
 * Pokemon at different evolution stages is extrapolated from this
 */
const basePokemonData = {
  litwick: {
    base: 'litwick',
    categories: ['fire', 'ghost'],
    tier: 2,
    maxHP: 60,
    attack: 55,
    defense: 90,
    specAttack: 145,
    specDefense: 90,
    speed: 80,
    basicAttack: {
      range: 3,
      stat: 'specAttack',
      projectile: {
        key: 'firedart',
        speed: 200,
      },
    },
    move: shadowTag,
  },
  fletchling: {
    base: 'fletchling',
    categories: ['fire', 'flying'],
    tier: 1,
    maxHP: 78,
    maxPP: 10,
    attack: 81,
    defense: 71,
    specAttack: 74,
    specDefense: 69,
    speed: 126,
    basicAttack: {
      range: 1,
      stat: 'attack',
    },
    move: braveBird,
  },
  rotomw: {
    base: 'rotomw',
    categories: ['water', 'electric'],
    tier: 4,
    maxHP: 50,
    maxPP: 10,
    attack: 65,
    defense: 107,
    specAttack: 105,
    specDefense: 107,
    speed: 86,
    basicAttack: {
      range: 1,
      stat: 'specAttack',
    },
    move: thunderWave,
  },
  pichu: {
    base: 'pichu',
    categories: ['electric'],
    tier: 1,
    maxHP: 60,
    maxPP: 10,
    attack: 90,
    defense: 55,
    specAttack: 90,
    specDefense: 80,
    speed: 110,
    basicAttack: {
      range: 1,
      stat: 'attack',
    },
    move: voltTackle,
  },
  seedot: {
    base: 'seedot',
    categories: ['grass', 'dark'],
    tier: 1,
    maxHP: 90,
    maxPP: 15,
    attack: 100,
    defense: 60,
    specAttack: 90,
    specDefense: 60,
    speed: 80,
    basicAttack: {
      range: 1,
      stat: 'attack',
    },
    move: razorWind,
  },
  weedle: {
    base: 'weedle',
    categories: ['bug', 'poison'],
    tier: 1,
    maxHP: 65,
    // slight hack: weedle has 0 PP and an active move which effectively replaces the basic attack
    maxPP: 0,
    attack: 90,
    defense: 40,
    specAttack: 45,
    specDefense: 80,
    speed: 75,
    basicAttack: {
      range: 2,
      stat: 'attack',
      projectile: {
        key: 'stinger',
        speed: 400,
      },
    },
    move: twineedle,
  },
  happiny: {
    base: 'happiny',
    categories: ['normal'],
    tier: 2,
    maxHP: 255,
    maxPP: 25,
    attack: 10,
    defense: 10,
    specAttack: 75,
    specDefense: 135,
    speed: 55,
    basicAttack: {
      range: 1,
      stat: 'attack',
    },
    move: softboiled,
  },
  scyther: {
    base: 'scyther',
    // NOTE: Stage 1 Scyther is pure bug
    categories: ['bug', 'steel'],
    tier: 4,
    maxHP: 70,
    maxPP: 10,
    attack: 130,
    defense: 100,
    specAttack: 65,
    specDefense: 80,
    speed: 65,
    basicAttack: {
      range: 1,
      stat: 'attack',
    },
    move: furyCutter,
  },
  magikarp: {
    base: 'magikarp',
    // NOTE: Stage 1 and 2 Magikarp are pure water
    categories: ['water', 'flying'],
    tier: 1,
    maxHP: 95,
    maxPP: 20,
    attack: 125,
    defense: 79,
    specAttack: 60,
    specDefense: 100,
    speed: 81,
    // NOTE: Stage 1 Magikarp's basic attack is unusable
    basicAttack: {
      range: 1,
      stat: 'attack',
    },
    // NOTE: Stage 1 and 2 Magikarp have no move - only Gyarados has this
    move: dragonDance,
  },
} as const;

/**
 * Returns the evolution of a Pokemon, with its stats scaled based on the evolution stage.
 */
function getEvolution(pokemon: keyof typeof basePokemonData, stage: 1 | 2 | 3) {
  const basePokemon = basePokemonData[pokemon];
  // maxHP and damage scale with Pokemon level
  // stage 1 =x2=> stage 2 =x2=> stage 3
  let multi = 1;
  if (stage === 2) {
    multi = 2;
  }
  if (stage === 3) {
    multi = 4;
  }

  return {
    ...basePokemon,
    maxHP: basePokemon.maxHP * 10 * multi,
    attack: basePokemon.attack * multi,
    specAttack: basePokemon.specAttack * multi,
    stage,
  };
}

/**
 * The raw Pokemon data for all Pokemon, including evolutions.
 * Uses the BasePokemon as a basis
 */
const rawPokemonData = {
  weedle: {
    ...getEvolution('weedle', 1),
    displayName: 'Weedle',
    evolution: 'kakuna',
  },
  kakuna: {
    ...getEvolution('weedle', 2),
    displayName: 'Kakuna',
    evolution: 'beedrill',
  },
  beedrill: {
    ...getEvolution('weedle', 3),
    displayName: 'Beedrill',
  },
  happiny: {
    ...getEvolution('happiny', 1),
    displayName: 'Happiny',
    evolution: 'chansey',
  },
  chansey: {
    ...getEvolution('happiny', 2),
    displayName: 'Chansey',
    evolution: 'blissey',
  },
  blissey: {
    ...getEvolution('happiny', 3),
    displayName: 'Blissey',
  },
  pichu: {
    ...getEvolution('pichu', 1),
    displayName: 'Pichu',
    evolution: 'pikachu',
  },
  pikachu: {
    ...getEvolution('pichu', 2),
    displayName: 'Pikachu',
    evolution: 'raichu',
  },
  raichu: {
    ...getEvolution('pichu', 3),
    displayName: 'Raichu',
  },
  scyther: {
    ...getEvolution('scyther', 1),
    categories: ['bug'],
    displayName: 'Scyther',
    evolution: 'scizor-1',
  },
  'scizor-1': {
    ...getEvolution('scyther', 2),
    displayName: 'Scizor',
    evolution: 'scizor-2',
  },
  'scizor-2': {
    ...getEvolution('scyther', 3),
    displayName: 'Scizor',
  },
  magikarp: {
    ...getEvolution('magikarp', 1),
    attack: 0,
    specAttack: 0,
    basicAttack: {
      range: 1,
      stat: 'attack',
      unusable: true,
    },
    categories: ['water'],
    move: undefined,
    displayName: 'Magikarp',
    evolution: 'magikarp-2',
  },
  'magikarp-2': {
    ...getEvolution('magikarp', 2),
    categories: ['water'],
    move: undefined,
    displayName: 'Magikarp',
    evolution: 'gyarados',
  },
  gyarados: {
    ...getEvolution('magikarp', 3),
    displayName: 'Gyarados',
  },
  seedot: {
    ...getEvolution('seedot', 1),
    displayName: 'Seedot',
    evolution: 'nuzleaf',
  },
  nuzleaf: {
    ...getEvolution('seedot', 2),
    displayName: 'Nuzleaf',
    evolution: 'shiftry',
  },
  shiftry: {
    ...getEvolution('seedot', 3),
    displayName: 'Shiftry',
  },
  litwick: {
    ...getEvolution('litwick', 1),
    displayName: 'Litwick',
    evolution: 'lampent',
  },
  lampent: {
    ...getEvolution('litwick', 2),
    displayName: 'Lampent',
    evolution: 'chandelure',
  },
  chandelure: {
    ...getEvolution('litwick', 3),
    displayName: 'Chandelure',
  },
  fletchling: {
    ...getEvolution('fletchling', 1),
    displayName: 'Fletchling',
    evolution: 'fletchinder',
  },
  fletchinder: {
    ...getEvolution('fletchling', 2),
    displayName: 'Fletchinder',
    evolution: 'talonflame',
  },
  talonflame: {
    ...getEvolution('fletchling', 3),
    displayName: 'Talonflame',
  },
  rotomw: {
    ...getEvolution('rotomw', 1),
    displayName: 'Rotom Wash',
    evolution: 'rotomw-2',
  },
  'rotomw-2': {
    ...getEvolution('rotomw', 2),
    displayName: 'Rotom Wash',
    evolution: 'rotomw-3',
  },
  'rotomw-3': {
    ...getEvolution('rotomw', 3),
    displayName: 'Rotom Wash',
  },
} as const;

export type PokemonName = keyof typeof rawPokemonData;
export const allPokemonNames = Object.keys(rawPokemonData) as Array<
  PokemonName
>;
export const buyablePokemon = allPokemonNames.filter(
  name => rawPokemonData[name].stage === 1
);

/**
 * The data for Pokemon, exported in a shape guaranteed to match the `Pokemon` type.
 */
export const pokemonData: { [k in PokemonName]: Pokemon } = rawPokemonData;

/**
 * some logging stuff
 * todo: remove in prod
 */

const categories: { [k: string]: number } = {};

const tiers = {
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 0,
};

Object.values(basePokemonData).forEach(pokemon => {
  // sum up the types/categories
  pokemon.categories.forEach((category: string) => {
    if (category in categories) {
      categories[category]++;
    } else {
      categories[category] = 1;
    }
  });

  // sum up the stages
  tiers[pokemon.tier]++;
});

console.log('Category summary:', categories);
console.log('Stage summary:', tiers);
