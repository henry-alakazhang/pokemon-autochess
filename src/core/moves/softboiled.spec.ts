import * as expect from 'expect';
import { PokemonObject } from '../../objects/pokemon.object';
import { ActiveMove } from '../move.model';
import { softboiled as sb } from './softboiled';

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
const criticalPlayerMock = {
  side: 'player',
  currentHP: 50,
  maxHP: 200,
} as PokemonObject;
const lowEnemyMock = {
  side: 'enemy',
  currentHP: 100,
  maxHP: 200,
} as PokemonObject;

describe('softboiled', () => {
  describe('getTarget', () => {
    const softboiled = sb as ActiveMove<'unit'>;
    let getTarget: NonNullable<typeof softboiled.getTarget>;
    before(() => {
      if (!softboiled.getTarget) {
        throw new Error('getTarget not defined for softboiled!');
      }
      getTarget = softboiled.getTarget;
    });

    it('should target self on low health', () => {
      expect(getTarget([[lowPlayerMock]], { x: 0, y: 0 })).toEqual({
        x: 0,
        y: 0,
      });
    });

    it('should not target self on high health', () => {
      expect(getTarget([[highPlayerMock]], { x: 0, y: 0 })).toBeUndefined();
    });

    it('should target an ally on low health', () => {
      expect(
        getTarget([[highPlayerMock, lowPlayerMock]], { x: 0, y: 0 })
      ).toEqual({ x: 0, y: 1 });
    });

    it('should not target enemies on low health', () => {
      expect(
        getTarget([[highPlayerMock, lowEnemyMock]], { x: 0, y: 0 })
      ).toBeUndefined();
    });

    xit('should target the lowest-health if there are multiple low allies', () => {
      expect(
        getTarget([[lowPlayerMock, criticalPlayerMock]], { x: 0, y: 1 })
      ).toEqual({ x: 0, y: 1 });
    });
  });
});
