import { Category } from '../core/game.model';
import { PokemonName } from '../core/pokemon.model';
import { Player } from '../objects/player.object';
import { Coords } from '../scenes/game/combat/combat.helpers';
import { GameScene } from '../scenes/game/game.scene';
import { ShopPool } from '../scenes/game/shop.helpers';

const shopPoolMock = {
  rates: { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] },
  pools: { 1: [], 2: [], 3: [], 4: [], 5: [] },
  pokemonData: [],
  reroll: () => {},
  returnToShop: () => {},
} as unknown as ShopPool;

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
