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
  readonly maxHP: number;
  readonly attack: number;
  readonly defense: number;
  readonly specAttack: number;
  readonly specDefense: number;
  readonly speed: number;
  readonly basicAttack: Attack;
  readonly evolution?: PokemonName;
  readonly cost?: number;
}

/**
 * The base data for all Pokemon
 */
export const pokemonData = {
  fletchling: {
    displayName: 'Fletchling',
    categories: ['fire', 'flying'],
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
    cost: 1,
  },
  fletchinder: {
    displayName: 'Fletchinder',
    categories: ['fire', 'flying'],
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
  },
  chandelure: {
    displayName: 'Chandelure',
    categories: ['fire', 'ghost'],
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
  },
  talonflame: {
    displayName: 'Talonflame',
    categories: ['fire', 'flying'],
    maxHP: 78,
    attack: 81,
    defense: 71,
    specAttack: 74,
    specDefense: 69,
    speed: 126,
    basicAttack: {
      range: 1,
      stat: 'attack',
    },
  },
  rotomw: {
    displayName: 'Rotom-W',
    categories: ['water', 'electric'],
    maxHP: 50,
    attack: 65,
    defense: 107,
    specAttack: 105,
    specDefense: 107,
    speed: 86,
    basicAttack: {
      range: 1,
      stat: 'specAttack',
    },
  },
} as const;

export type PokemonName = keyof typeof pokemonData;
export const allPokemonNames = Object.keys(pokemonData) as Array<PokemonName>;
export const catchablePokemon = allPokemonNames.filter(
  name => 'cost' in pokemonData[name]
);

/**
 * this is just to typecheck the PokemonData to make sure each object
 * conforms to the PokemonBaseStats model
 */
const typedPokemonData: { [k in PokemonName]: Pokemon } = pokemonData;
