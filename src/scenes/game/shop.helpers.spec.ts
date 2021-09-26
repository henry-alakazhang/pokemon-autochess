import * as expect from 'expect';
import { Player } from '../../objects/player.object';
import { ShopPool } from './shop.helpers';

describe.only('shop rerolling', () => {
  const origRandom = Math.random;

  before(() => {
    // chosen by fair dice roll
    // this makes the tests run deterministically:
    // the RNG will always pick the LAST element of a list
    Math.random = () => 0.9999;
  });

  after(() => {
    Math.random = origRandom;
  });

  it('should roll and remove stuff from the pool', () => {
    const pool = new ShopPool(
      {
        1: [0, 1, 0, 0, 0, 0],
      },
      ['litwick'],
      { litwick: { tier: 1, base: 'litwick' } } as any,
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

  it('should roll through different pokemon', () => {
    const pool = new ShopPool(
      {
        1: [0, 1, 0, 0, 0, 0],
      },
      ['litwick', 'fletchling'],
      {
        litwick: { tier: 1, base: 'litwick' },
        fletchling: { tier: 1, base: 'fletchling' },
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

  it('should put stuff back in the pool when rerolling', () => {
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

  it('should put more back for higher stage pokemon', () => {
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

  it('should fall back to alternative tiers if current is exhausted', () => {
    const pool = new ShopPool(
      {
        1: [0, 1, 1, 0, 0, 0],
      },
      ['litwick', 'abra'],
      {
        litwick: { tier: 1, base: 'litwick' },
        abra: { tier: 2, base: 'abra' },
      } as any,
      { 1: 3, 2: 3, 3: 0, 4: 0, 5: 0 }
    );
    expect(pool.reroll({ level: 1 } as Player)).toEqual([
      // RNG picks from the back
      'abra',
      'abra',
      'abra',
      'litwick',
      'litwick',
    ]);
  });
});
