import { Scene } from 'phaser';
import { PokemonName } from '../../../core/pokemon.model';
import { flatten, isDefined } from '../../../helpers';
import {
  PokemonAnimationType,
  PokemonObject,
} from '../../../objects/pokemon.object';
import {
  Coords,
  getFacing,
  getGridDistance,
  getNearestTarget,
  getTurnDelay,
  pathfind,
} from './combat.helpers';

export type CombatEndCallback = (winner: 'player' | 'enemy') => void;

/** X-coordinate of the center of the grid */
const GRID_X = 400;
/** Y-coordinate of the center of the grid */
const GRID_Y = 250;
const CELL_WIDTH = 70;
const BOARD_WIDTH = 5;

/**
 * Returns the graphical x and y coordinates for a spot in the battle grid.
 */
function getCoordinatesForGrid({ x, y }: Coords): Coords {
  return { x: GRID_X + (x - 2) * CELL_WIDTH, y: GRID_Y + (y - 2) * CELL_WIDTH };
}

/**
 * The fight board scene
 *
 * This scene displays the battle grid and all the Pokemon while a fight is taking place.
 * It handles all combat-related logic, including taking turns, moving/pathfinding
 * and attacking + dealing damage
 */
export class CombatScene extends Scene {
  static readonly KEY = 'CombatScene';

  private board: Array<Array<PokemonObject | undefined>>;
  private grid: Phaser.GameObjects.Grid;

  private combatEndCallback: CombatEndCallback;

  constructor() {
    super({
      key: CombatScene.KEY,
    });
  }

  init({ callback }: { callback: CombatEndCallback }) {
    this.board = Array(5)
      .fill(undefined)
      // fill + map rather than `fill` an array because
      // `fill` will only initialise one array and fill with shallow copies
      .map(_ => Array(5).fill(undefined));
    this.combatEndCallback = callback;
  }

  create() {
    this.grid = this.add.grid(
      GRID_X, // center x
      GRID_Y, // center y
      CELL_WIDTH * 5, // total width
      CELL_WIDTH * 5, // total height
      CELL_WIDTH, // cell width
      CELL_WIDTH, // cell height
      0, // fill: none
      0, // fill alpha: transparent
      0xffaa00, // lines: yellow
      1 // line alpha: solid
    );

    this.addPokemon('player', { x: 0, y: 1 }, 'talonflame', 'right');
    this.addPokemon('enemy', { x: 3, y: 2 }, 'rotomw', 'left');

    this.board.forEach((col, x) => {
      col.forEach((_, y) => this.setTurn({ x, y }));
    });
  }

  checkRoundEnd() {
    const remainingSides = flatten(this.board)
      .filter(isDefined)
      .map(pokemon => pokemon.side);

    const playerAlive = remainingSides.includes('player');
    const enemyAlive = remainingSides.includes('enemy');

    if (playerAlive && enemyAlive) {
      return;
    }

    /* end the round */

    console.log('round over');

    const winner = playerAlive ? 'player' : 'enemy';
    this.add
      .text(GRID_X, GRID_Y, `ROUND OVER: ${winner.toUpperCase()} WINS!`, {
        backgroundColor: '#000',
        fontSize: '40px',
      })
      .setOrigin(0.5, 0.5);
    setTimeout(() => {
      this.combatEndCallback(winner);
      this.scene.stop(CombatScene.KEY);
    }, 2000);
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
    this.add.existing(pokemon);
    pokemon.on(
      PokemonObject.Events.Dead,
      () => {
        // rip dead pokemon out of the map
        // TODO find a cleaner way of doing this
        this.board = this.board.map(col =>
          col.map(cell => {
            console.log(cell && cell.id, pokemon.id);
            return cell && cell.id === pokemon.id ? undefined : cell;
          })
        );
        this.checkRoundEnd();
      },
      this
    );
    if (startingAnimation) {
      pokemon.playAnimation(startingAnimation);
    }
    this.board[x][y] = pokemon;
  }

  movePokemon(start: Coords, end: Coords) {
    const facing = getFacing(start, end);
    const mover = this.board[start.x][start.y];
    if (!mover) {
      return;
    }

    mover.playAnimation(facing);
    this.board[end.x][end.y] = mover;
    this.board[start.x][start.y] = undefined;
    const newPosition = getCoordinatesForGrid(end);
    mover.move(newPosition);
  }

  /**
   * Adds a turn for the Pokemon at a given coordinate
   */
  setTurn({ x, y }: Coords) {
    const pokemon = this.board[x][y];
    if (pokemon) {
      setTimeout(
        () => this.takeTurn({ x, y }),
        getTurnDelay(pokemon.basePokemon)
      );
    }
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
      const step = pathfind(this.board, myCoords, targetCoords, attack.range);
      if (!step) {
        console.log('no valid step');
        // can't reach: just do nothing and wait for next turn
        // FIXME: I'm pretty sure this will result in times when the Pokemon
        // will tunnel-vision and freeze up even if there are other valid targets
        this.setTurn(myCoords);
        return;
      }

      this.movePokemon(myCoords, step);
      this.setTurn(step);
      return;
    }

    const targetPokemon = this.board[targetCoords.x][targetCoords.y];
    if (!targetPokemon) {
      return;
    }

    // use specified defenseStat, or the one that correlates to the attack stat
    const defenseStat =
      attack.defenseStat || attack.stat === 'attack'
        ? 'defense'
        : 'specDefense';
    const damage = Math.floor(
      (pokemon.basePokemon[attack.stat] * 10) /
        targetPokemon.basePokemon[defenseStat]
    );
    pokemon.playAnimation(getFacing(myCoords, targetCoords));
    targetPokemon.dealDamage(damage);

    // turn over, wait until next one
    // delay is 100/speed seconds
    this.setTurn(myCoords);
  }
}
