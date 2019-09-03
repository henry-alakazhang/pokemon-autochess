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
}

export interface Pokemon {
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
  readonly evolution?: PokemonName;
  /** Evolution stage */
  readonly stage: 1 | 2 | 3;
}

/**
 * The base data for all Pokemon
 */
const rawPokemonData = {
  chandelure: {
    displayName: 'Chandelure',
    categories: ['fire', 'ghost'],
    tier: 2,
    maxHP: 60,
    maxPP: 15,
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
    stage: 1,
  },
  fletchling: {
    displayName: 'Fletchling',
    categories: ['fire', 'flying'],
    tier: 1,
    maxHP: 45,
    attack: 50,
    defense: 43,
    specAttack: 40,
    specDefense: 38,
    speed: 62,
    basicAttack: {
      range: 1,
      stat: 'attack',
    },
    evolution: 'fletchinder',
    stage: 1,
  },
  fletchinder: {
    displayName: 'Fletchinder',
    categories: ['fire', 'flying'],
    tier: 1,
    maxHP: 62,
    attack: 73,
    defense: 55,
    specAttack: 56,
    specDefense: 52,
    speed: 84,
    basicAttack: {
      range: 1,
      stat: 'attack',
    },
    evolution: 'talonflame',
    stage: 2,
  },
  talonflame: {
    displayName: 'Talonflame',
    categories: ['fire', 'flying', 'physical attacker'],
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
    stage: 3,
  },
  rotomw: {
    displayName: 'Rotom-W',
    categories: ['water', 'electric'],
    tier: 4,
    maxHP: 50,
    maxPP: 12,
    attack: 65,
    defense: 107,
    specAttack: 105,
    specDefense: 107,
    speed: 86,
    basicAttack: {
      range: 1,
      stat: 'specAttack',
    },
    stage: 3,
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
