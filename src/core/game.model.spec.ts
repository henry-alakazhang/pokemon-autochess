import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { mapPokemonCoords } from '../scenes/game/combat/combat.helpers';
import { CombatScene } from '../scenes/game/combat/combat.scene';
import { getDebugGameMode } from '../scenes/game/game.helpers';
import { GameScene } from '../scenes/game/game.scene';
import {
  createPlayer,
  createTestingGame,
  getPokemonInScene,
  startTestingCombatScene,
  tick,
} from '../testing/helpers';
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
    game.scene.start(GameScene.KEY, getDebugGameMode());
    gameScene = game.scene.getScene(GameScene.KEY) as GameScene;
  });

  afterAll(() => {
    game.destroy(true);
  });

  describe.skip('normal', () => {});

  // TODO: implement calculateDamage tests
  describe.skip('fire', () => {});

  // TODO: implement calculateDamage tests
  describe.skip('fighting', () => {});

  describe.skip('water', () => {});

  // TODO: implement calculateDamage tests
  describe.skip('flying', () => {});

  describe('grass', () => {
    test('should heal grass-types when dealing damage and share damage to all enemies', async () => {
      scene = startTestingCombatScene(game, gameScene, {
        player: createPlayer({
          scene: gameScene,
          board: [{ name: 'chesnaught', location: { x: 0, y: 3 } }],
          synergies: [['grass', 2]],
        }),
      });

      const chesnaught = getPokemonInScene(scene, 'chesnaught');
      const enemyPokemon = getPokemonInScene(
        scene,
        ({ side }) => side === 'enemy'
      );

      // set Chesnaught to not be full HP
      chesnaught.currentHP = Math.floor(chesnaught.maxHP / 2);
      const prevHP = chesnaught.currentHP;

      // make it do some damage
      scene.causeDamage(
        chesnaught,
        enemyPokemon,
        { trueDamage: 100 },
        { triggerEvents: true }
      );

      // Should have healed Chesnaught
      expect(chesnaught.currentHP).toEqual(
        prevHP + 15 // 15% of 100
      );

      // After 4 seconds, should deal damage to enemy.
      const prevEnemyHP = enemyPokemon.currentHP;
      tick(scene, 4000);
      expect(enemyPokemon.currentHP).toBeLessThan(prevEnemyHP);
    });
  });

  describe.skip('poison', () => {});

  describe.skip('electric', () => {});

  describe.skip('ground', () => {});

  describe('psychic', () => {
    test('should boost stats of isolated psychic-types', async () => {
      scene = startTestingCombatScene(game, gameScene, {
        player: createPlayer({
          scene: gameScene,
          board: [
            { name: 'abra', location: { x: 0, y: 3 } },
            { name: 'aegislash', location: { x: 1, y: 4 } },
          ],
          synergies: [['psychic', 2]],
        }),
      });

      const abra = getPokemonInScene(scene, 'abra');

      expect(abra.statChanges.attack).toBe(1);
      expect(abra.statChanges.specAttack).toBe(1);
      expect(abra.statChanges.defense).toBe(0);
      expect(abra.statChanges.specDefense).toBe(0);
      expect(abra.statChanges.speed).toBe(0);
    });

    test('should not boost stats of non-isolated Pokemon', async () => {
      scene = startTestingCombatScene(game, gameScene, {
        player: createPlayer({
          scene: gameScene,
          board: [
            { name: 'abra', location: { x: 0, y: 3 } },
            { name: 'abra', location: { x: 0, y: 4 } },
          ],
          synergies: [['psychic', 2]],
        }),
      });

      const abra = getPokemonInScene(scene, 'abra');

      expect(abra.statChanges.attack).toBe(0);
      expect(abra.statChanges.specAttack).toBe(0);
      expect(abra.statChanges.defense).toBe(0);
      expect(abra.statChanges.specDefense).toBe(0);
      expect(abra.statChanges.speed).toBe(0);
    });

    test('should not boost stats of non-psychic-types', async () => {
      scene = startTestingCombatScene(game, gameScene, {
        player: createPlayer({
          scene: gameScene,
          board: [{ name: 'aegislash', location: { x: 0, y: 3 } }],
          synergies: [['psychic', 2]],
        }),
      });

      const aegislash = getPokemonInScene(scene, 'aegislash');

      expect(aegislash.statChanges.attack).toBe(0);
      expect(aegislash.statChanges.specAttack).toBe(0);
      expect(aegislash.statChanges.defense).toBe(0);
      expect(aegislash.statChanges.specDefense).toBe(0);
      expect(aegislash.statChanges.speed).toBe(0);
    });

    test('should not boost enemy stats', async () => {
      scene = startTestingCombatScene(game, gameScene, {
        player: createPlayer({
          scene: gameScene,
          board: [{ name: 'abra', location: { x: 0, y: 3 } }],
          synergies: [['psychic', 3]],
        }),
        enemy: createPlayer({
          scene: gameScene,
          board: [{ name: 'aegislash', location: { x: 0, y: 3 } }],
        }),
      });

      const aegislash = getPokemonInScene(scene, 'aegislash');

      expect(aegislash.statChanges.attack).toBe(0);
      expect(aegislash.statChanges.specAttack).toBe(0);
      expect(aegislash.statChanges.defense).toBe(0);
      expect(aegislash.statChanges.specDefense).toBe(0);
      expect(aegislash.statChanges.speed).toBe(0);
    });

    test('should boost more stats at tier 2', async () => {
      scene = startTestingCombatScene(game, gameScene, {
        player: createPlayer({
          scene: gameScene,
          board: [{ name: 'abra', location: { x: 0, y: 3 } }],
          synergies: [['psychic', 3]],
        }),
      });

      const abra = getPokemonInScene(scene, 'abra');

      expect(abra.statChanges.attack).toBe(1);
      expect(abra.statChanges.specAttack).toBe(1);
      expect(abra.statChanges.defense).toBe(1);
      expect(abra.statChanges.specDefense).toBe(1);
      expect(abra.statChanges.speed).toBe(0);
    });

    test('should boost more stats at tier 3', async () => {
      scene = startTestingCombatScene(game, gameScene, {
        player: createPlayer({
          scene: gameScene,
          board: [{ name: 'abra', location: { x: 0, y: 3 } }],
          synergies: [['psychic', 4]],
        }),
      });

      const abra = getPokemonInScene(scene, 'abra');

      expect(abra.statChanges.attack).toBe(1);
      expect(abra.statChanges.specAttack).toBe(1);
      expect(abra.statChanges.defense).toBe(1);
      expect(abra.statChanges.specDefense).toBe(1);
      expect(abra.statChanges.speed).toBe(1);
    });
  });

  describe.skip('rock', () => {});

  describe('ice', () => {
    test('should deal damage to enemies and not slow at tier 1', async () => {
      scene = startTestingCombatScene(game, gameScene, {
        player: createPlayer({
          scene: gameScene,
          board: [{ name: 'abra', location: { x: 0, y: 3 } }],
          synergies: [['ice', 2]],
        }),
        enemy: createPlayer({
          scene: gameScene,
          board: [{ name: 'aegislash', location: { x: 0, y: 3 } }],
        }),
      });

      const aegislash = getPokemonInScene(scene, 'aegislash');
      expect(aegislash.currentHP).toBeLessThan(aegislash.maxHP);
      expect(aegislash.statChanges.speed).toBe(0);
    });

    test('should not damage allies', async () => {
      scene = startTestingCombatScene(game, gameScene, {
        player: createPlayer({
          scene: gameScene,
          board: [{ name: 'abra', location: { x: 0, y: 3 } }],
          synergies: [['ice', 2]],
        }),
      });

      const abra = getPokemonInScene(scene, 'abra');

      expect(abra.currentHP).toBe(abra.maxHP);
      expect(abra.statChanges.speed).toBe(0);
    });

    test('should damage and slow at tier 2 ', async () => {
      scene = startTestingCombatScene(game, gameScene, {
        player: createPlayer({
          scene: gameScene,
          board: [{ name: 'abra', location: { x: 0, y: 3 } }],
          synergies: [['ice', 3]],
        }),
        enemy: createPlayer({
          scene: gameScene,
          board: [{ name: 'aegislash', location: { x: 0, y: 3 } }],
        }),
      });

      const aegislash = getPokemonInScene(scene, 'aegislash');

      expect(aegislash.currentHP).toBeLessThan(aegislash.maxHP);
      expect(aegislash.statChanges.speed).toBe(-1);
    });
  });

  describe('bug', () => {
    test('should copy the least evolved bug-type Pokemon at tier 1', async () => {
      scene = startTestingCombatScene(game, gameScene, {
        player: createPlayer({
          scene: gameScene,
          board: [
            { name: 'weedle', location: { x: 0, y: 0 } },
            { name: 'kakuna', location: { x: 1, y: 0 } },
          ],
          synergies: [['bug', 3]],
        }),
      });

      const boardMons = mapPokemonCoords(scene.board).filter(
        ({ pokemon }) => pokemon.side === 'player'
      );

      // There should be an extra Pokemon, which is a weedle
      expect(boardMons.length).toBe(3);
      expect(
        boardMons.filter(({ pokemon }) => pokemon.name === 'weedle').length
      ).toBe(2);
      expect(
        boardMons.filter(({ pokemon }) => pokemon.name === 'kakuna').length
      ).toBe(1);
    });

    test('should prioritise lower-cost Pokemon over higher-cost ones', async () => {
      scene = startTestingCombatScene(game, gameScene, {
        player: createPlayer({
          scene: gameScene,
          board: [
            { name: 'larvesta', location: { x: 0, y: 0 } }, // tier 3, stage 1
            { name: 'grubbin', location: { x: 2, y: 0 } }, // tier 1, stage 1
          ],
          synergies: [['bug', 3]],
        }),
      });

      const boardMons = mapPokemonCoords(scene.board).filter(
        ({ pokemon }) => pokemon.side === 'player'
      );
      expect(boardMons.length).toBe(3);
      expect(
        boardMons.filter(({ pokemon }) => pokemon.name === 'larvesta').length
      ).toBe(1);
      expect(
        boardMons.filter(({ pokemon }) => pokemon.name === 'grubbin').length
      ).toBe(2);
    });

    test('should not copy a non-bug type Pokemon', async () => {
      scene = startTestingCombatScene(game, gameScene, {
        player: createPlayer({
          scene: gameScene,
          board: [
            { name: 'abra', location: { x: 0, y: 0 } }, // psychic type
            { name: 'leavanny', location: { x: 1, y: 0 } }, // higher-evolved bug type
          ],
          synergies: [['bug', 3]],
        }),
      });

      const boardMons = mapPokemonCoords(scene.board).filter(
        ({ pokemon }) => pokemon.side === 'player'
      );

      expect(boardMons.length).toBe(3);
      // Abra should not be copied
      expect(
        boardMons.filter(({ pokemon }) => pokemon.name === 'abra').length
      ).toBe(1);
      // But Leavanny should be
      expect(
        boardMons.filter(({ pokemon }) => pokemon.name === 'leavanny').length
      ).toBe(2);
    });

    test('should not copy an enemy Pokemon', async () => {
      scene = startTestingCombatScene(game, gameScene, {
        player: createPlayer({
          scene: gameScene,
          board: [
            { name: 'swadloon', location: { x: 0, y: 0 } }, // higher tier bug type
          ],
          synergies: [['bug', 3]],
        }),
        enemy: createPlayer({
          scene: gameScene,
          board: [{ name: 'weedle', location: { x: 0, y: 0 } }], // enemy bug type
        }),
      });

      const boardMons = mapPokemonCoords(scene.board);

      expect(boardMons.length).toBe(3);
      // Swadloon should be copied
      expect(
        boardMons.filter(({ pokemon }) => pokemon.name === 'swadloon').length
      ).toBe(2);
      // Enemy weedle should not be copied.
      expect(
        boardMons.filter(({ pokemon }) => pokemon.name === 'weedle').length
      ).toBe(1);
    });
  });

  // TODO: write test - this one is complex.
  describe.skip('ghost', () => {});

  // TODO: implement calculateDamage tests
  describe.skip('dark', () => {});

  // TODO: write test - this one is complex.
  describe.skip('steel', () => {});

  // TODO: implement calculateDamage tests
  describe.skip('fairy', () => {});

  describe.skip('sweeper', () => {});

  describe.skip('revenge killer', () => {});

  describe.skip('wallbreaker', () => {});

  describe.skip('hazard setter', () => {});

  describe.skip('bulky attacker', () => {});

  describe.skip('wall', () => {});

  describe.skip('disruptor', () => {});

  describe.skip('support', () => {});

  describe.skip('pivot', () => {});

  describe.skip('utility', () => {});
});
