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
