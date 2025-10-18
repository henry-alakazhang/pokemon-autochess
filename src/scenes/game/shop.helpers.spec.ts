import { afterEach, describe, expect, test } from '@jest/globals';
import { PokemonName } from '../../core/pokemon.model';
import { Player } from '../../objects/player.object';
import { ShopPool } from './shop.helpers';

const alwaysFirst = () => 0;
const alwaysLast = () => 0.99999;
/** Returns a random number generator that cycles through given results */
function customRng(results: number[]) {
  let index = 0;
  return () => {
    const res = results[index];
    index = (index + 1) % results.length;
    return res;
  };
}

describe('shop rerolling', () => {
  const origRandom = Math.random;

  afterEach(() => {
    Math.random = origRandom;
  });

  test('should roll and remove stuff from the pool', () => {
    Math.random = alwaysFirst;
    const pool = new ShopPool(
      {
        1: [0, 1, 0, 0, 0, 0],
      },
      ['litwick'],
      { litwick: { tier: 1, stage: 1, base: 'litwick' } } as any,
      { 1: 5, 2: 0, 3: 0, 4: 0, 5: 0 }
    );
    expect(pool.reroll({ level: 1 } as Player)).toEqual([
      'litwick',
      'litwick',
      'litwick',
      'litwick',
      'litwick',
    ]);
    expect(pool.pools[1]).toHaveLength(0);
  });

  test('should roll from the correct level for the player', () => {
    Math.random = alwaysFirst;
    const pool = new ShopPool(
      {
        // level 1: only roll tier 1s
        1: [0, 1, 0, 0, 0, 0],
        // level 2: only roll tier 2s
        2: [0, 0, 1, 0, 0, 0],
      },
      ['litwick', 'abra'],
      {
        litwick: { tier: 1, stage: 1, base: 'litwick' },
        abra: { tier: 2, stage: 1, base: 'abra' },
      } as any,
      { 1: 5, 2: 5, 3: 0, 4: 0, 5: 0 }
    );
    expect(pool.reroll({ level: 1 } as Player)).toEqual([
      'litwick',
      'litwick',
      'litwick',
      'litwick',
      'litwick',
    ]);
    expect(pool.pools[1]).toHaveLength(0);

    expect(pool.reroll({ level: 2 } as Player)).toEqual([
      'abra',
      'abra',
      'abra',
      'abra',
      'abra',
    ]);
    expect(pool.pools[2]).toHaveLength(0);
  });

  test('should roll through different pokemon', () => {
    Math.random = alwaysLast;
    const pool = new ShopPool(
      {
        1: [0, 1, 0, 0, 0, 0],
      },
      ['litwick', 'fletchling'],
      {
        litwick: { tier: 1, stage: 1, base: 'litwick' },
        fletchling: { tier: 1, stage: 1, base: 'fletchling' },
      } as any,
      { 1: 3, 2: 0, 3: 0, 4: 0, 5: 0 }
    );
    const rolls = pool.reroll({ level: 1 } as Player);
    expect(rolls).toEqual([
      // deterministic rng picks from the back
      'fletchling',
      'fletchling',
      'fletchling',
      'litwick',
      'litwick',
    ]);
    // with one pokemon out of 6 remaining
    expect(pool.pools[1]).toHaveLength(1);
  });

  test('should put stuff back in the pool when rerolling', () => {
    Math.random = alwaysFirst;
    const pool = new ShopPool(
      {
        1: [0, 1, 0, 0, 0, 0],
      },
      ['litwick'],
      { litwick: { tier: 1, stage: 1, base: 'litwick' } } as any,
      { 1: 10, 2: 0, 3: 0, 4: 0, 5: 0 }
    );
    const rolls = pool.reroll({ level: 1 } as Player);
    expect(pool.pools[1]).toHaveLength(5);
    pool.reroll({ level: 1 } as Player, rolls);
    expect(pool.pools[1]).toHaveLength(5);
  });

  test('should put more back for higher stage pokemon', () => {
    Math.random = alwaysFirst;
    const pool = new ShopPool(
      {
        1: [0, 1, 0, 0, 0, 0],
      },
      ['litwick'],
      {
        litwick: { tier: 1, stage: 1 },
        chandelure: { tier: 1, stage: 2, base: 'litwick' },
      } as any,
      { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    );
    const rolls = pool.reroll({ level: 1 } as Player, [
      'chandelure',
      'chandelure',
      'chandelure',
      'chandelure',
      'chandelure',
    ]);
    // should have returned 3 * 5
    // then pulled another 5
    expect(pool.pools[1]).toHaveLength(10);
    // returned the base form
    expect(rolls).toEqual([
      'litwick',
      'litwick',
      'litwick',
      'litwick',
      'litwick',
    ]);
  });

  test('should fall back to alternative tiers if current is exhausted', () => {
    Math.random = customRng([0, 0.9999]);
    const pool = new ShopPool(
      {
        1: [0, 1, 1, 0, 0, 0],
      },
      ['litwick', 'abra'],
      {
        litwick: { tier: 1, stage: 1, base: 'litwick' },
        abra: { tier: 2, stage: 1, base: 'abra' },
      } as any,
      { 1: 3, 2: 3, 3: 0, 4: 0, 5: 0 }
    );
    expect(pool.reroll({ level: 1 } as Player)).toEqual([
      // the rng alternates, but is used twice per pull (once for tier, once for pokemon)
      // so tier 1 ends up being all pulled first
      'litwick',
      'litwick',
      'litwick',
      'abra',
      'abra',
    ]);
  });

  test('should return empty slots if the entire shop is exhausted', () => {
    Math.random = alwaysFirst;
    const pool = new ShopPool(
      {
        1: [0, 1, 0, 0, 0, 0],
      },
      ['litwick'],
      {
        litwick: { tier: 1, stage: 1, base: 'litwick' },
      } as any,
      { 1: 2, 2: 0, 3: 0, 4: 0, 5: 0 }
    );

    expect(pool.reroll({ level: 1 } as Player)).toEqual([
      'litwick',
      'litwick',
      ,
      ,
      ,
    ]);

    // should have used all remaining Pokemon
    expect(pool.pools[1]).toHaveLength(0);
  });

  test('should handle passed shops with deleted elements', () => {
    Math.random = alwaysFirst;
    const pool = new ShopPool(
      {
        1: [0, 1, 0, 0, 0, 0],
      },
      ['litwick'],
      {
        litwick: { tier: 1, stage: 1, base: 'litwick' },
      } as any,
      { 1: 5, 2: 0, 3: 0, 4: 0, 5: 0 }
    );
    const shop: PokemonName[] = [
      'litwick',
      'litwick',
      'litwick',
      'litwick',
      'litwick',
    ];
    delete shop[1];
    delete shop[2];

    expect(pool.reroll({ level: 1 } as Player, shop)).toEqual([
      'litwick',
      'litwick',
      'litwick',
      'litwick',
      'litwick',
    ]);

    // should have returned 3 pokemon back
    expect(pool.pools[1]).toHaveLength(3);
  });
});
