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

export interface BaseStats {
  readonly name: string;
  readonly categories: ReadonlyArray<Category>;
  readonly maxHP: number;
  readonly attack: number;
}

/**
 * The base data for all Pokemon
 */
export const pokemonData = {
  talonflame: {
    name: 'Talonflame',
    categories: ['fire', 'flying', 'physical attacker'],
    maxHP: 20,
    attack: 5,
  },
} as const;

export type PokemonName = keyof typeof pokemonData;
export const allPokemonNames = Object.keys(pokemonData) as PokemonName[];

/**
 * this is just to typecheck the PokemonData to make sure each object
 * conforms to the PokemonBaseStats model
 */
const typedPokemonData: { [k in PokemonName]: BaseStats } = pokemonData;
