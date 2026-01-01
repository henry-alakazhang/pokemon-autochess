import { PhaserMock } from '../testing/phaser.mocks';
// Mock Phaser before game imports due to deps
(global as any).Phaser = PhaserMock;

import { describe, expect, test } from '@jest/globals';
import { getNextThreshold, getSynergyTier, Synergy } from './game.model';

// Create a mock synergy with given threshold/exactness
const createSynergy = (
  thresholds: number[],
  isExactThreshold?: boolean
): Synergy => ({
  category: 'normal' as const,
  displayName: 'Test Synergy',
  description: 'Test',
  thresholds,
  isExactThreshold,
});

describe('getSynergyTier', () => {
  describe('with standard thresholds', () => {
    test('should return tier 0 when count is below all thresholds', () => {
      expect(getSynergyTier(createSynergy([2, 4, 6]), 0)).toBe(0);
      expect(getSynergyTier(createSynergy([2, 4, 6]), 1)).toBe(0);
    });

    test('should return tier when count reaches a threshold', () => {
      expect(getSynergyTier(createSynergy([2, 4, 6]), 2)).toBe(1);
      expect(getSynergyTier(createSynergy([2, 4, 6]), 3)).toBe(1);
      expect(getSynergyTier(createSynergy([2, 4, 6]), 4)).toBe(2);
      expect(getSynergyTier(createSynergy([2, 4, 6]), 5)).toBe(2);
      expect(getSynergyTier(createSynergy([2, 4, 6]), 6)).toBe(3);
      expect(getSynergyTier(createSynergy([2, 4, 6]), 7)).toBe(3);
      expect(getSynergyTier(createSynergy([2, 4, 6]), 100)).toBe(3);
    });

    test('should handle single threshold', () => {
      expect(getSynergyTier(createSynergy([3]), 2)).toBe(0);
      expect(getSynergyTier(createSynergy([3]), 3)).toBe(1);
      expect(getSynergyTier(createSynergy([3]), 4)).toBe(1);
    });

    test('should handle empty thresholds array', () => {
      expect(getSynergyTier(createSynergy([]), 0)).toBe(0);
      expect(getSynergyTier(createSynergy([]), 5)).toBe(0);
    });
  });

  describe('with exact thresholds', () => {
    test('should return tier 0 when count does not match any threshold', () => {
      expect(getSynergyTier(createSynergy([1, 4], true), 0)).toBe(0);
      expect(getSynergyTier(createSynergy([1, 4], true), 2)).toBe(0);
      expect(getSynergyTier(createSynergy([1, 4], true), 3)).toBe(0);
      expect(getSynergyTier(createSynergy([1, 4], true), 5)).toBe(0);
    });

    test('should return tier when count exactly matches a threshold', () => {
      expect(getSynergyTier(createSynergy([1, 4], true), 1)).toBe(1);
      expect(getSynergyTier(createSynergy([1, 4], true), 4)).toBe(2);
    });

    test('should handle multiple exact thresholds', () => {
      expect(getSynergyTier(createSynergy([1, 3, 5], true), 1)).toBe(1);
      expect(getSynergyTier(createSynergy([1, 3, 5], true), 3)).toBe(2);
      expect(getSynergyTier(createSynergy([1, 3, 5], true), 5)).toBe(3);
      expect(getSynergyTier(createSynergy([1, 3, 5], true), 2)).toBe(0);
      expect(getSynergyTier(createSynergy([1, 3, 5], true), 4)).toBe(0);
    });

    test('should handle single exact threshold', () => {
      expect(getSynergyTier(createSynergy([3], true), 2)).toBe(0);
      expect(getSynergyTier(createSynergy([3], true), 3)).toBe(1);
      expect(getSynergyTier(createSynergy([3], true), 4)).toBe(0);
    });

    test('should handle empty thresholds array with exact matching', () => {
      expect(getSynergyTier(createSynergy([], true), 0)).toBe(0);
      expect(getSynergyTier(createSynergy([], true), 5)).toBe(0);
    });
  });
});

describe('getNextThreshold', () => {
  describe('with standard thresholds', () => {
    test('should always return the next threshold for standard thresholds', () => {
      expect(getNextThreshold(createSynergy([2, 4, 6]), 0)).toBe(2);
      expect(getNextThreshold(createSynergy([2, 4, 6]), 1)).toBe(2);
      expect(getNextThreshold(createSynergy([2, 4, 6]), 2)).toBe(4);
      expect(getNextThreshold(createSynergy([2, 4, 6]), 3)).toBe(4);
      expect(getNextThreshold(createSynergy([2, 4, 6]), 4)).toBe(6);
      expect(getNextThreshold(createSynergy([2, 4, 6]), 5)).toBe(6);
      expect(getNextThreshold(createSynergy([2, 4, 6]), 6)).toBe(6);
    });
  });

  describe('with exact thresholds', () => {
    test('should return the first exact threshold if below or at it', () => {
      expect(getNextThreshold(createSynergy([2, 4], true), 0)).toBe(2);
      expect(getNextThreshold(createSynergy([2, 4], true), 1)).toBe(2);
      expect(getNextThreshold(createSynergy([2, 4], true), 2)).toBe(2);
    });

    test('should return the previous threshold if between thresholds', () => {
      expect(getNextThreshold(createSynergy([1, 4], true), 2)).toBe(1);
      expect(getNextThreshold(createSynergy([1, 4], true), 3)).toBe(1);
      expect(getNextThreshold(createSynergy([1, 4], true), 4)).toBe(4);
      expect(getNextThreshold(createSynergy([1, 4], true), 5)).toBe(4);
      expect(getNextThreshold(createSynergy([1, 4], true), 6)).toBe(4);
    });
  });
});
