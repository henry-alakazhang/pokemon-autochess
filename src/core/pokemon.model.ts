import { Move } from './move.model';
import { braveBird } from './moves';

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
    maxHP: basePokemon.maxHP * multi,
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
