import { describe, expect, test } from '@jest/globals';
import { DEFAULT_LEVELS } from './game.helpers';

describe('game modes', () => {
  describe('level shop odds', () => {
    DEFAULT_LEVELS.forEach(({ shopOdds }, level) => {
      test(`default odds at level ${level} should sum to 100%`, () => {
        expect(shopOdds.reduce((acc, curr) => acc + curr, 0)).toBe(100);
      });
    });
  });
});
