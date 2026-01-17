import { afterEach, beforeAll, describe, expect, test } from '@jest/globals';
import { mapPokemonCoords } from '../scenes/game/combat/combat.helpers';
import { CombatScene } from '../scenes/game/combat/combat.scene';
import { getDebugGameMode } from '../scenes/game/game.helpers';
import { GameScene } from '../scenes/game/game.scene';
import {
  createPlayer,
  createTestingGame,
  startTestingScene,
} from '../testing/creators';
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

describe('individual synergy effects', () => {
  let game: Phaser.Game;
  let gameScene: GameScene;
  let scene: CombatScene;

  beforeAll(async () => {
    game = await createTestingGame();
    gameScene = await startTestingScene(
      game,
      GameScene.KEY,
      getDebugGameMode()
    );
  });

  afterEach(() => {
    game.scene.stop(CombatScene.KEY);
  });

  describe('psychic', () => {
    test('should boost stats of isolated psychic-types and only psychic types', async () => {
      scene = await startTestingScene(game, CombatScene.KEY, {
        player: createPlayer({
          scene: gameScene,
          board: [
            { name: 'abra', location: { x: 0, y: 3 } },
            { name: 'aegislash', location: { x: 1, y: 4 } },
          ],
          synergies: [['psychic', 2]],
        }),
        enemy: createPlayer({ scene: gameScene }),
      });

      scene.time.timeScale = 0;
      scene.time.update(0, 0);

      const abra = mapPokemonCoords(scene.board).find(
        ({ pokemon }) => pokemon.name === 'abra'
      );

      expect(abra?.pokemon.statChanges.attack).toBe(1);
      expect(abra?.pokemon.statChanges.specAttack).toBe(1);
      expect(abra?.pokemon.statChanges.defense).toBe(0);
      expect(abra?.pokemon.statChanges.specDefense).toBe(0);
      expect(abra?.pokemon.statChanges.speed).toBe(0);
    });

    test('should not boost stats of non-isolated Pokemon', async () => {
      scene = await startTestingScene(game, CombatScene.KEY, {
        player: createPlayer({
          scene: gameScene,
          board: [
            { name: 'abra', location: { x: 0, y: 3 } },
            { name: 'abra', location: { x: 0, y: 4 } },
          ],
          synergies: [['psychic', 2]],
        }),
        enemy: createPlayer({ scene: gameScene }),
      });

      const abra = mapPokemonCoords(scene.board).find(
        ({ pokemon }) => pokemon.name === 'abra'
      );

      expect(abra?.pokemon.statChanges.attack).toBe(0);
      expect(abra?.pokemon.statChanges.specAttack).toBe(0);
      expect(abra?.pokemon.statChanges.defense).toBe(0);
      expect(abra?.pokemon.statChanges.specDefense).toBe(0);
      expect(abra?.pokemon.statChanges.speed).toBe(0);
    });

    test('should not boost stats of non-psychic-types', async () => {
      scene = await startTestingScene(game, CombatScene.KEY, {
        player: createPlayer({
          scene: gameScene,
          board: [{ name: 'aegislash', location: { x: 0, y: 3 } }],
          synergies: [['psychic', 2]],
        }),
        enemy: createPlayer({ scene: gameScene }),
      });

      const aegislash = mapPokemonCoords(scene.board).find(
        ({ pokemon }) => pokemon.name === 'aegislash'
      );

      expect(aegislash?.pokemon.statChanges.attack).toBe(0);
      expect(aegislash?.pokemon.statChanges.specAttack).toBe(0);
      expect(aegislash?.pokemon.statChanges.defense).toBe(0);
      expect(aegislash?.pokemon.statChanges.specDefense).toBe(0);
      expect(aegislash?.pokemon.statChanges.speed).toBe(0);
    });
  });
});
