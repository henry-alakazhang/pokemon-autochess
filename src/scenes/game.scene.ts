import { Scene } from 'phaser';
import { PokemonName } from '../core/pokemon.data';
import { Pokemon, PokemonAnimationType } from '../objects/pokemon.object';

const CELL_WIDTH = 70;

export class GameScene extends Scene {
  static readonly KEY = 'GameScene';

  private board: Pokemon[][] = Array(5).fill(Array(5).fill([]));
  private grid: Phaser.GameObjects.Grid;

  constructor() {
    super({
      key: GameScene.KEY,
    });
  }

  create() {
    this.grid = this.add.grid(
      400,
      300,
      CELL_WIDTH * 5,
      CELL_WIDTH * 5,
      CELL_WIDTH,
      CELL_WIDTH,
      0, // no fill
      0,
      0xffaa00,
      1
    );

    this.addPokemon(2, 0, PokemonName.TALONFLAME, 'down');
    this.addPokemon(2, 4, PokemonName.TALONFLAME, 'up');
  }

  addPokemon(
    x: number,
    y: number,
    key: PokemonName,
    startingAnimation?: PokemonAnimationType
  ) {
    const coords = getCoordinatesForGrid(x, y);
    this.board[x][y] = new Pokemon({ scene: this, key, ...coords }, key);
    if (startingAnimation) {
      this.board[x][y].playAnimation(startingAnimation);
    }
  }
}

/**
 * Returns the graphical x and y coordinates for a spot in the battle grid.
 * @param x
 * @param y
 */
function getCoordinatesForGrid(x: number, y: number): { x: number; y: number } {
  return { x: 400 + (x - 2) * CELL_WIDTH, y: 300 + (y - 2) * CELL_WIDTH };
}
