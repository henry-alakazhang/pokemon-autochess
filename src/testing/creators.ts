import { Category } from '../core/game.model';
import { PokemonName } from '../core/pokemon.model';
import { Coords } from '../scenes/game/combat/combat.helpers';
import { CombatScene } from '../scenes/game/combat/combat.scene';
import { GameScene } from '../scenes/game/game.scene';
import { ShopPool } from '../scenes/game/shop.helpers';
import { ShopScene } from '../scenes/game/shop.scene';

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

  return game;
}

export async function startTestingScene(
  game: Phaser.Game,
  scene: string,
  data: object
): Promise<Phaser.Scene> {
  return new Promise((resolve) => {
    game.scene.start(scene, data);
    const targetScene = game.scene.getScene(scene);
    setInterval(() => {
      if (game.scene.isActive(scene)) {
        resolve(targetScene);
      }
    }, 100);
  });
}

export function createPlayer({
  scene,
  board,
  synergies,
}: {
  scene: GameScene;
  board: ReadonlyArray<{
    readonly name: PokemonName;
    readonly location: Coords;
  }>;
  synergies: [Category, number][];
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
  // DON'T UPDATE
  return player;
}
