import { Pokemon, PokemonName } from '../../core/pokemon.model';
import { Player } from '../../objects/player.object';

const SHOP_POOL_SIZES = {
  1: 27,
  2: 24,
  3: 21,
  4: 18,
  5: 15,
};

function getRandomIndex(array: unknown[]): number {
  return Math.floor(Math.random() * array.length);
}

function getRandomInArray<T>(array: T[]): T {
  return array[getRandomIndex(array)];
}

/**
 * A pool of buyable units which forms a shop.
 */
export class ShopPool {
  /**
   * Arrays containing scaled rates of different Pokemon tiers at each player level.
   * Each "rate" is an array of all the possibilities, with amounts based on likelihood.
   * This makes it trivial to pick a random tier for a given level.
   *
   * eg. `[1, 2]` would give 50% chance of tier 1 and 50% of tier 2
   */
  readonly rates: {
    [level: string]: Pokemon['tier'][];
  } = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

  /**
   * Arrays containing all the Pokemon in a given tier pool.
   * Similar to rates, this structure makes it trivial to pick a random Pokemon
   * while scaling the rates based on the amount remaining in the pool
   *
   * eg. `[litwick, fletchling, fletchling]` would have
   * 1/3 chance of litwick and 2/3 chance of fletchling
   */
  readonly pools: {
    [tier in Pokemon['tier']]: PokemonName[];
  } = { 1: [], 2: [], 3: [], 4: [], 5: [] };

  constructor(
    rates: {
      [k: string]: [number, number, number, number, number, number];
    },
    // these are only used by tests to replace imports
    pokemonList: PokemonName[],
    private pokemonData: { [k in PokemonName]: Pokemon },
    poolSizes = SHOP_POOL_SIZES
  ) {
    Object.keys(rates).forEach(level => {
      rates[level].forEach((rate, tier) => {
        // generate an array with that many elements
        const arr = Array(rate).fill(tier);
        // and append it to the existing rates
        this.rates[level].push(...arr);
      });
    });

    pokemonList.forEach(pokemon => {
      this.pools[this.pokemonData[pokemon].tier].push(
        ...Array(poolSizes[this.pokemonData[pokemon].tier]).fill(pokemon)
      );
    });
  }

  /**
   * Empties a pool back into the shop and generates a new one.
   *
   * Note: If a unit has been bought, it is expecte to have
   * been DELETEd from the array. Don't just null it out.
   */
  reroll(player: Player, currentShop: PokemonName[] = Array(5)): PokemonName[] {
    // return the original Pokemon to the shop (if applicable)
    currentShop.forEach(pokemon => {
      this.returnToShop(pokemon);
    });

    const newShop: PokemonName[] = [];
    // populate it with new pokemon
    // we use a for loop here rather than a map because we use `delete`
    // to remove Pokemon from the shop, rather than marking as undefined
    // iterating over an array with missing elements doesn't hit the empty spots
    for (let i = 0; i < currentShop.length; i++) {
      if (
        this.rates[player.level].every(
          availableTier => this.pools[availableTier].length === 0
        )
      ) {
        // if every available tier for this player level is used up,
        // insert an empty element into the array
        newShop.length++;
        continue;
      }

      let tier = getRandomInArray(this.rates[player.level]);
      while (this.pools[tier].length === 0) {
        // if the tier is already drained, pick a different one
        tier = getRandomInArray(this.rates[player.level]);
      }

      const pool = this.pools[tier];
      const pickIndex = getRandomIndex(pool);
      // swap the picked Pokemon to the end of the pool, them remove it.
      // the swap lets us remove in O(1) constant time.
      [pool[pickIndex], pool[pool.length - 1]] = [
        pool[pool.length - 1],
        pool[pickIndex],
      ];
      const pick = pool.pop();

      if (!pick) {
        // this is literally not possible and is just here to satisfy typescript
        throw new Error('Tried to pick from an empty pool');
      }

      // take the pokemon out of the pool
      // non-null assertion here is ok because we literally just checked it
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      newShop.push(pick);
    }
    return newShop;
  }

  returnToShop(name: PokemonName) {
    const pokemon = this.pokemonData[name];
    // return more copies for evolved Pokemon
    const totalCopies = pokemon.stage === 1 ? 1 : pokemon.stage === 2 ? 3 : 9;
    // shove that many copies into the list of pokemon at that tier
    this.pools[pokemon.tier].push(...Array(totalCopies).fill(pokemon.base));
  }
}
