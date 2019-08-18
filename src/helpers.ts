// general JS helpers file

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
