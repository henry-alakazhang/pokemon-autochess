import { Pokemon } from './pokemon.model';

/**
 * Returns the approximate strength of a Pokemon, for AI logic
 *
 * The math uses `stage * 2.5 + tier`, which looks approximately like this:
 *
 * ```
 *       5   4    3    2   1
 *  3 | 12.| 11.| 10.| 9.| 8.|
 *  2 | 10 | 9  | 8  | 7 | 6 |
 *  1 | 7. | 6. | 5. | 4.| 3.|
 * ```
 *
 * This is pretty close to how most people rate units in a vacuum (for TFT at least)
 */
export function getPokemonStrength(p: Pokemon) {
  return p.stage * 2.5 + p.tier;
}
