import { buyablePokemon, PokemonName } from '../../core/pokemon.model';

export const SHOP_POOL_SIZES = {
  1: 3,
  2: 3,
  3: 3,
  4: 3,
  5: 3,
};

/**
 * Rerolls a shop from a given pool of Pokemon
 * Mutates the pool by returning the previously rolled pokemon,
 * and removing the newly rolled Pokemon
 */
export function rerollShop(
  pool: {
    [k in PokemonName]?: number;
  },
  currentShop: PokemonName[]
): PokemonName[] {
  // return the original Pokemon to the shop (if applicable)
  currentShop.forEach(pokemon => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    pool[pokemon]! += 1;
  });

  const newShop: PokemonName[] = [];
  // populate it with new pokemon
  // we use a for loop here rather than a map because we use `delete`
  // to remove Pokemon from the shop, rather than marking as undefined
  // iterating over an array with missing elements doesn't hit the empty spots
  // TODO: scale the RNG based on how many Pokemon are remaining
  for (let i = 0; i < currentShop.length; i++) {
    let pick =
      buyablePokemon[Math.floor(Math.random() * buyablePokemon.length)];
    // don't pick if the pool is out of this Pokemon
    // in theory this will go infinite if we buy too many Pokemon :thinking:
    while (!pool[pick]) {
      pick = buyablePokemon[Math.floor(Math.random() * buyablePokemon.length)];
    }

    // DEBUG CODE: always add the latest Pokemon for debugging purposes
    if (i === 0) {
      pick = buyablePokemon[buyablePokemon.length - 1];
    }

    // take the pokemon out of the pool
    // non-null assertion here is ok because we literally just checked it
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    pool[pick]! -= 1;
    newShop.push(pick);
  }
  return newShop;
}
