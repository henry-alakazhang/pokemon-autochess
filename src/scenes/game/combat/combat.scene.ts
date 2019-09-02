import { Scene } from 'phaser';
import { PokemonName } from '../../../core/pokemon.model';
import { flatten, id, isDefined } from '../../../helpers';
import {
  PokemonAnimationType,
  PokemonObject,
} from '../../../objects/pokemon.object';
import { Projectile } from '../../../objects/projectile.object';
import {
  Coords,
  getAttackAnimation,
  getFacing,
  getGridDistance,
  getNearestTarget,
  getTurnDelay,
  pathfind,
} from './combat.helpers';

export type CombatEndCallback = (winner: 'player' | 'enemy') => void;
export type CombatBoard = Array<Array<PokemonObject | undefined>>;
export interface CombatSceneData {
  readonly playerBoard: CombatBoard;
  readonly enemyBoard: CombatBoard;
  readonly callback: CombatEndCallback;
}

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

  private board: CombatBoard;
  private grid: Phaser.GameObjects.Grid;
  private projectiles: { [k: string]: Projectile } = {};

  private combatEndCallback: CombatEndCallback;

  constructor() {
    super({
      key: CombatScene.KEY,
    });
  }

  create(data: CombatSceneData) {
    this.board = Array(5)
      .fill(undefined)
      // fill + map rather than `fill` an array because
      // `fill` will only initialise one array and fill with shallow copies
      .map(_ => Array(5).fill(undefined));
    this.combatEndCallback = data.callback;

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

    data.playerBoard.forEach((col, x) =>
      col.forEach(
        (pokemon, y) =>
          pokemon && this.addPokemon('player', { x, y }, pokemon.name)
      )
    );
    data.enemyBoard.forEach((col, x) =>
      col.forEach(
        (pokemon, y) =>
          pokemon &&
          this.addPokemon(
            'enemy',
            {
              x,
              // flip Y coordinates for enemy teams
              y: 4 - y,
            },
            pokemon.name
          )
      )
    );

    flatten(this.board)
      .filter(isDefined)
      .forEach(pokemon => this.setTurn(pokemon));
  }

  update() {
    // trigger updates on each projectile
    Object.values(this.projectiles).forEach(x => x && x.update());
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
      name,
      side,
      ...coords,
    });
    this.physics.add.existing(this.add.existing(pokemon));
    pokemon.initPhysics();
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
   * Searches the board for a Pokemon and returns its grid coords
   * This is slightly different to (and simpler than) the similar helpers in
   * the GameScene, because we only ever need to call this on actual Pokemon,
   * and not on clicks which may or may not be on Pokemon.
   *
   * Doing a search will also double as a check that the Pokemon is alive
   */
  getBoardLocationForPokemon({ id }: PokemonObject): Coords | undefined {
    let location;
    this.board.forEach((col, x) => {
      col.forEach((pokemon, y) => {
        if (pokemon && pokemon.id === id) {
          location = { x, y };
        }
      });
    });
    return location;
  }

  /**
   * Adds a turn for the given Pokemon, based on its speed
   */
  setTurn(pokemon: PokemonObject) {
    setTimeout(() => this.takeTurn(pokemon), getTurnDelay(pokemon.basePokemon));
  }

  /**
   * Takes a turn for the given Pokemon
   */
  takeTurn(pokemon: PokemonObject) {
    const myCoords = this.getBoardLocationForPokemon(pokemon);
    if (!myCoords) {
      return;
    }

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

    const attack = pokemon.basePokemon.basicAttack;
    if (getGridDistance(myCoords, targetCoords) > attack.range) {
      const step = pathfind(this.board, myCoords, targetCoords, attack.range);
      if (!step) {
        console.log('no valid step');
        // can't reach: just do nothing and wait for next turn
        // FIXME: I'm pretty sure this will result in times when the Pokemon
        // will tunnel-vision and freeze up even if there are other valid targets
        this.setTurn(pokemon);
        return;
      }

      this.movePokemon(myCoords, step);
      this.setTurn(pokemon);
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
    const facing = getFacing(myCoords, targetCoords);
    pokemon.playAnimation(facing);
    // attack animation is just moving to the enemy and back
    this.add.tween({
      targets: [pokemon],
      duration: getTurnDelay(pokemon.basePokemon) * 0.15,
      ...getAttackAnimation(pokemon, facing),
      yoyo: true,
      ease: 'Power1',
      onYoyo: () => {
        if (!attack.projectile) {
          // deal damage when the animation "hits"
          pokemon.dealDamage(damage);
          targetPokemon.takeDamage(damage);
        } else {
          // or add particle for projectile
          const projectile = new Projectile(
            this,
            pokemon.x,
            pokemon.y,
            attack.projectile.key,
            targetPokemon,
            attack.projectile.speed
          );
          this.physics.add.existing(this.add.existing(projectile));
          // store this in the `projectiles` map under a random key
          const projectileKey = id();
          this.projectiles[projectileKey] = projectile;
          // cause event when it hits
          projectile.on(Phaser.GameObjects.Events.DESTROY, () => {
            pokemon.dealDamage(damage);
            targetPokemon.takeDamage(damage);
            delete this.projectiles[projectileKey];
          });
        }
      },
    });

    // turn over, wait until next one
    // delay is 100/speed seconds
    this.setTurn(pokemon);
  }
}
