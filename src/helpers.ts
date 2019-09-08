import { PokemonName } from './core/pokemon.model';

// general JS helpers file

/**
 * Generate a random string for use as a unique identifier
 */
export function generateId(): string {
  return (Math.random() * 10000000 + 1).toString();
}

/**
 * Flatten a multi-dimensional array down to a single dimension
 */
export function flatten<T>(arr: T[][]): T[] {
  return arr.reduce((newArr, next) => [...newArr, ...next], []);
}

/**
 * Returns whether or not a value has a value
 */
export function isDefined<T>(x: T): x is NonNullable<T> {
  return x !== undefined && x !== null;
}

/**
 * An "uncallable" function - expects the value to never exist
 * If a real type is passed, this should cause a compile error
 */
export function assertNever(x: never): never {
  throw new Error(`Unexpected object: ${x}`);
}

/**
 * Returns the base texture for a Pokemon.
 *
 * Pokemon which don't evolve have repeat entries to represent their higher stages
 * This function will strip extra characters from their names to get the base texture name.
 */
export function getBaseTexture(pokemon: PokemonName) {
  return pokemon.split('-')[0];
}
