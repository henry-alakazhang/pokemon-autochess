import { beforeAll, describe, expect, test } from '@jest/globals';
import { PokemonObject } from '../../objects/pokemon.object';
import { ActiveMove } from '../move.model';
import { iceShard as ic } from './ice-shard';

const highPlayerMock = {
  side: 'player',
  currentHP: 200,
  maxHP: 200,
} as PokemonObject;
const lowPlayerMock = {
  side: 'player',
  currentHP: 100,
  maxHP: 200,
} as PokemonObject;
const highEnemyMock = {
  side: 'enemy',
  currentHP: 200,
  maxHP: 200,
} as PokemonObject;
const lowEnemyMock = {
  side: 'enemy',
  currentHP: 100,
  maxHP: 200,
} as PokemonObject;
const criticalEnemyMock = {
  side: 'player',
  currentHP: 50,
  maxHP: 200,
} as PokemonObject;

describe('ice shard', () => {
  describe('getTarget', () => {
    const iceShard = ic as ActiveMove<'ground'>;
    let getTarget: NonNullable<typeof iceShard.getTarget>;
    beforeAll(() => {
      if (!iceShard.getTarget) {
        throw new Error('getTarget not defined for iceShard!');
      }
      getTarget = iceShard.getTarget;
    });

    test(`should not target if there are no enemies`, () => {
      expect(getTarget([[highPlayerMock]], { x: 0, y: 0 })).toBeUndefined();
    });

    test(`should jump next to only enemy if there is one
        A..
       >.B.
        ...`, () => {
      expect(
        getTarget(
          [
            [highPlayerMock, undefined, undefined],
            [undefined, highEnemyMock, undefined],
            [undefined, undefined, undefined],
          ],
          { x: 0, y: 0 }
        )
      ).toEqual({ x: 0, y: 1 });
    });

    test(`should work with enemies close to the edge
        A..
        ...
        B..
         ^`, () => {
      expect(
        getTarget(
          [
            [highPlayerMock, undefined, highEnemyMock],
            [undefined, undefined, undefined],
            [undefined, undefined, undefined],
          ],
          { x: 0, y: 0 }
        )
      ).toEqual({ x: 1, y: 2 });
      expect(
        getTarget(
          [
            [highPlayerMock, undefined, highEnemyMock],
            [undefined, undefined, undefined],
            [undefined, undefined, undefined],
          ],
          { x: 0, y: 0 }
        )
      ).toEqual({ x: 1, y: 2 });
    });

    test(`should target the lowest-HP enemy if there are multiple
        A..
        .B.
       >.b.`, () => {
      expect(
        getTarget(
          [
            [highPlayerMock, undefined, undefined],
            [undefined, highEnemyMock, lowEnemyMock],
            [undefined, undefined, undefined],
          ],
          { x: 0, y: 0 }
        )
      ).toEqual({ x: 0, y: 2 });
    });

    test(`should not jump to a low-health ally
        A..
       >.B.
        .a.`, () => {
      expect(
        getTarget(
          [
            [highPlayerMock, undefined, undefined],
            [undefined, highEnemyMock, lowPlayerMock],
            [undefined, undefined, undefined],
          ],
          { x: 0, y: 0 }
        )
      ).toEqual({ x: 0, y: 1 });
    });

    test(`should only jump into open spaces
                v
        AB. | A.. | AB.  | AB.
       >.bB | BbB | Bb.< | BbB
        .B. | .B. | .B.  | ...
                            ^`, () => {
      expect(
        getTarget(
          [
            [highPlayerMock, undefined, undefined],
            [highEnemyMock, lowEnemyMock, highEnemyMock],
            [undefined, highEnemyMock, undefined],
          ],
          { x: 0, y: 0 }
        )
      ).toEqual({ x: 0, y: 1 });
      expect(
        getTarget(
          [
            [highPlayerMock, highEnemyMock, undefined],
            [undefined, lowEnemyMock, highEnemyMock],
            [undefined, highEnemyMock, undefined],
          ],
          { x: 0, y: 0 }
        )
      ).toEqual({ x: 1, y: 0 });
      expect(
        getTarget(
          [
            [highPlayerMock, highEnemyMock, undefined],
            [highEnemyMock, lowEnemyMock, highEnemyMock],
            [undefined, undefined, undefined],
          ],
          { x: 0, y: 0 }
        )
      ).toEqual({ x: 2, y: 1 });
      expect(
        getTarget(
          [
            [highPlayerMock, highEnemyMock, undefined],
            [highEnemyMock, lowEnemyMock, undefined],
            [undefined, highEnemyMock, undefined],
          ],
          { x: 0, y: 0 }
        )
      ).toEqual({ x: 1, y: 2 });
    });

    test(`should pick the next-lowest if the lowest HP is inaccessible
        A..
        .B.<
        BbX`, () => {
      expect(
        getTarget(
          [
            [highPlayerMock, undefined, highEnemyMock],
            [undefined, highEnemyMock, criticalEnemyMock],
            [undefined, undefined, lowEnemyMock],
          ],
          { x: 0, y: 0 }
        )
      ).toEqual({ x: 2, y: 1 });
    });
  });
});
