import { expect } from '@jest/globals';
import { Category } from '../core/game.model';
import { PokemonName } from '../core/pokemon.model';
import { Coords } from '../scenes/game/combat/combat.helpers';
import {
  CombatScene,
  CombatSceneData,
} from '../scenes/game/combat/combat.scene';
import { GameScene } from '../scenes/game/game.scene';
import { ShopScene } from '../scenes/game/shop.scene';
import { PokemonObject } from '../objects/pokemon.object';

/**
 * Create a testing Phaser.Game.
 * This can probably be shared across multiple test instances... I think.
 *
 * Needs to be destroyed in cleanup hooks.
 */
export async function createTestingGame(): Promise<Phaser.Game> {
  const game = new Phaser.Game({
    type: Phaser.CANVAS,
    parent: 'canvas',
    scene: [
      // Initial scene is nothing.
      class {
        static key = 'InitialScene';
      },
      GameScene,
      ShopScene,
      CombatScene,
    ],
    physics: {
      default: 'arcade',
    },
    dom: {
      createContainer: true,
    },
  });

  // Pause the game timer so tests can trigger manual updates.
  game.pause();

  return game;
}

export function createPlayer({
  scene,
  board,
  synergies = [],
}: {
  scene: GameScene;
  board: ReadonlyArray<{
    readonly name: PokemonName;
    readonly location: Coords;
  }>;
  synergies?: [Category, number][];
}) {
  const player = scene.generateNeutralPlayer({
    name: 'Test',
    board: board.map(({ name, location }) => ({ name, location })),
  });

  // Force set the synergies
  player.synergies = synergies.map(([category, count]) => ({
    category,
    count,
  }));
  // Don't call updateSynergies or it'll reset the manually updated ones.
  return player;
}

/**
 * Start a testing combat scene and return it.
 * Fills in default players with one pokemon each if not provided.
 *
 * Does not need to be manually cleaned up in cleanup hooks.
 * Calling this again in the next test will trigger
 * shutdown and start the scene afresh.
 */
export function startTestingCombatScene(
  game: Phaser.Game,
  gameScene: GameScene,
  {
    player = createPlayer({
      scene: gameScene,
      board: [{ name: 'neutral_only_rattata', location: { x: 0, y: 3 } }],
    }),
    enemy = createPlayer({
      scene: gameScene,
      board: [{ name: 'neutral_only_rattata', location: { x: 0, y: 3 } }],
    }),
    autoStart = false,
  }: Partial<CombatSceneData>
) {
  game.scene.start(CombatScene.KEY, { player, enemy, autoStart });
  return game.scene.getScene(CombatScene.KEY) as CombatScene;
}

/**
 * Advance a scene's clock by a given amount of time.
 *
 * Triggers ALL events that would occur in between.
 */
export function tick(scene: Phaser.Scene, time: number = 1000) {
  scene.time.preUpdate(time, time);
  scene.time.update(time, time);
}

/**
 * Returns the first Pokemon from a combat scene with the given name or
 * that matches a given predicate.
 *
 * Asserts that it exists and fails the test if it isn't there
 **/
export function getPokemonInScene(
  scene: CombatScene,
  condition: PokemonName | ((pokemon: PokemonObject) => boolean)
): PokemonObject {
  const pokemon = scene.board.flat().find((p) => {
    if (!p) {
      return false;
    }

    if (typeof condition === 'function') {
      return condition(p);
    }
    return p?.name === condition;
  });
  expect(pokemon).toBeDefined();
  return pokemon as PokemonObject;
}
