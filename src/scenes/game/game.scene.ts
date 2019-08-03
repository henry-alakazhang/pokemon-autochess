import { Scene } from 'phaser';
import { PokemonName } from '../../core/pokemon.model';
import {
  PokemonAnimationType,
  PokemonObject,
} from '../../objects/pokemon.object';
import { Coords, getGridDistance, getNearestTarget } from './game.helpers';

const CELL_WIDTH = 70;
const BOARD_WIDTH = 5;

/**
 * Returns the graphical x and y coordinates for a spot in the battle grid.
 * @param x
 * @param y
 */
function getCoordinatesForGrid({ x, y }: Coords): Coords {
  return { x: 400 + (x - 2) * CELL_WIDTH, y: 300 + (y - 2) * CELL_WIDTH };
}

export class GameScene extends Scene {
  static readonly KEY = 'GameScene';

  private board: Array<Array<PokemonObject | undefined>> = [[], [], [], [], []];

  private grid: Phaser.GameObjects.Grid;

  constructor() {
    super({
      key: GameScene.KEY,
    });
  }

  create() {
    this.grid = this.add.grid(
      400, // center x
      300, // center y
      CELL_WIDTH * 5, // total width
      CELL_WIDTH * 5, // total height
      CELL_WIDTH, // cell width
      CELL_WIDTH, // cell height
      0, // fill: none
      0, // fill alpha: transparent
      0xffaa00, // lines: yellow
      1 // line alpha: solid
    );

    this.addPokemon('player', { x: 2, y: 2 }, 'talonflame', 'down');
    this.addPokemon('enemy', { x: 2, y: 3 }, 'talonflame', 'up');

    this.board.forEach((col, x) => {
      col.forEach((_, y) => {
        setTimeout(() => this.takeTurn({ x, y }), 0);
      });
    });
  }

  addPokemon(
    side: 'player' | 'enemy',
    { x, y }: Coords,
    name: PokemonName,
    startingAnimation?: PokemonAnimationType
  ) {
    const coords = getCoordinatesForGrid({ x, y });
    const pokemon = new PokemonObject({
      scene: this,
      id: `${name}${x}${y}`,
      name,
      side,
      ...coords,
    });
    pokemon.on(
      Phaser.GameObjects.Events.DESTROY,
      () => {
        // rip dead pokemon out of the map
        // TODO find a cleaner way of doing this
        this.board = this.board.map(col =>
          col.map(cell => {
            console.log(cell && cell.id, pokemon.id);
            return cell && cell.id === pokemon.id ? undefined : cell;
          })
        );
      },
      this
    );
    if (startingAnimation) {
      pokemon.playAnimation(startingAnimation);
    }
    this.board[x][y] = pokemon;
  }

  /**
   * Takes a turn for the Pokemon at the given coordinates
   */
  takeTurn({ x, y }: Coords) {
    console.log(x, y);
    const pokemon = this.board[x][y];
    if (!pokemon) {
      return;
    }

    const attack = pokemon.basePokemon.basicAttack;
    const myCoords = { x, y };

    const targetCoords = getNearestTarget(
      this.board,
      myCoords,
      BOARD_WIDTH,
      BOARD_WIDTH
    );
    if (!targetCoords) {
      // do nothing and never do anything agian
      return;
    }

    if (getGridDistance(myCoords, targetCoords) > attack.range) {
      // TODO: move
      return;
    }

    const targetPokemon = this.board[targetCoords.x][targetCoords.y];
    if (!targetPokemon) {
      return;
    }

    const damage = Math.floor(
      (pokemon.basePokemon[attack.stat] * 10) /
        targetPokemon.basePokemon.defense
    );
    targetPokemon.dealDamage(damage);

    // turn over, wait until next one
    // delay is 100/speed seconds
    const delay = 100_000 / pokemon.basePokemon.speed;
    setTimeout(() => this.takeTurn(myCoords), delay);
  }
}
