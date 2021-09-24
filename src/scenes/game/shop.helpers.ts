import {
  buyablePokemon,
  pokemonData,
  PokemonName,
} from '../../core/pokemon.model';

const SHOP_POOL_SIZES = {
  1: 27,
  2: 24,
  3: 21,
  4: 18,
  5: 15,
};

/**
 * A pool of buyable units which forms a shop.
 */
export class ShopPool {
  readonly pool: {
    [k in PokemonName]?: number;
  };

  constructor() {
    this.pool = {};
    buyablePokemon.forEach(pokemon => {
      this.pool[pokemon] = SHOP_POOL_SIZES[pokemonData[pokemon].tier];
    });
  }

  /**
   * Empties a pool back into the shop and generates a new one.
   *
   * Note: If a unit has been bought, it is expecte to have
   * been DELETEd from the array. Don't just null it out.
   */
  reroll(currentShop: PokemonName[] = Array(5)): PokemonName[] {
    // return the original Pokemon to the shop (if applicable)
    currentShop.forEach(pokemon => {
      this.returnToShop(pokemon);
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
      // in theory this will go infinite if we buy out the entire shop :
      while (!this.pool[pick]) {
        pick =
          buyablePokemon[Math.floor(Math.random() * buyablePokemon.length)];
      }

      // DEBUG CODE: always add the latest Pokemon for debugging purposes
      if (i === 0) {
        pick = buyablePokemon[buyablePokemon.length - 1];
      }

      // take the pokemon out of the pool
      // non-null assertion here is ok because we literally just checked it
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.pool[pick]! -= 1;
      newShop.push(pick);
    }
    return newShop;
  }

  returnToShop(name: PokemonName) {
    const pokemon = pokemonData[name];
    // return more copies for evolved Pokemon
    const totalCopies = pokemon.stage === 1 ? 1 : pokemon.stage === 2 ? 3 : 9;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.pool[pokemon.base]! += totalCopies;
  }
}
