import { Scene } from 'phaser';
import { Status } from '../../../core/game.model';
import { Attack, PokemonName } from '../../../core/pokemon.model';
import { flatten, generateId, isDefined } from '../../../helpers';
import {
  PokemonAnimationType,
  PokemonObject,
} from '../../../objects/pokemon.object';
import { Projectile } from '../../../objects/projectile.object';
import {
  calculateDamage,
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
      .map(() => Array(5).fill(undefined));
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
    Object.values(this.projectiles).forEach(x => x?.update());
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
            return cell?.id === pokemon.id ? undefined : cell;
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
        if (pokemon?.id === id) {
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
    const delay = getTurnDelay(pokemon.basePokemon);
    // reduce the duration of each status
    (Object.keys(pokemon.status) as Status[]).forEach((s: Status) => {
      const duration = pokemon.status[s];
      if (duration) {
        const remaining = duration - delay;
        // reset to undefined if status is over
        pokemon.status[s] = remaining >= 0 ? remaining : undefined;
      }
    });
    setTimeout(() => this.takeTurn(pokemon), delay);
  }

  /**
   * Takes a turn for the given Pokemon
   */
  takeTurn(pokemon: PokemonObject) {
    // can't act: just wait til next turn
    if (pokemon.status.paralyse) {
      this.setTurn(pokemon);
      return;
    }

    const myCoords = this.getBoardLocationForPokemon(pokemon);
    if (!myCoords) {
      return;
    }

    // use move if available, otherwise use basic attack
    let selectedAttack =
      pokemon.currentPP === pokemon.maxPP &&
      pokemon.basePokemon.move &&
      pokemon.basePokemon.move.type === 'active'
        ? pokemon.basePokemon.move
        : pokemon.basePokemon.basicAttack;
    let selectedCoords =
      'getTarget' in selectedAttack && selectedAttack.getTarget
        ? selectedAttack.getTarget(this.board, myCoords)
        : getNearestTarget(this.board, myCoords, BOARD_WIDTH, BOARD_WIDTH);

    if (!selectedCoords) {
      // if move has no valid target, fall back to basic attack
      selectedAttack = pokemon.basePokemon.basicAttack;
      selectedCoords = getNearestTarget(
        this.board,
        myCoords,
        BOARD_WIDTH,
        BOARD_WIDTH
      );
    }

    // use const variables to make type inferencing neater below
    const attack = selectedAttack;
    const targetCoords = selectedCoords;

    if (!targetCoords) {
      // if basic attack has no valid target, do nothing and never do anything agian
      return;
    }

    // face target
    const facing = getFacing(myCoords, targetCoords);
    pokemon.playAnimation(facing);

    // move if out of range
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

    // if it's a move, use it
    if ('use' in attack) {
      pokemon.currentPP = 0;
      attack.use({
        scene: this,
        board: this.board,
        user: pokemon,
        target: targetPokemon,
        onComplete: () => {
          if (pokemon.currentHP > 0) {
            this.setTurn(pokemon);
          }
        },
      });
      return;
    }

    // otherwise make a basic attack
    this.basicAttack(pokemon, targetPokemon, () => {
      // afterwards, end the turn
      this.setTurn(pokemon);
    });
  }

  /**
   * Fires off a basic attack. Melee attacks hit at the tip of the animation,
   * while ranged ones fire off a projectile which deals damage when it hts.
   *
   * @param attacker Pokemon firing the projectile
   * @param defender Pokemon defending the attack
   * @param attack Attack being used
   */
  basicAttack(
    attacker: PokemonObject,
    defender: PokemonObject,
    onComplete?: Function
  ) {
    // attack animation is just moving to the enemy and back
    this.add.tween({
      targets: [attacker],
      duration: getTurnDelay(attacker.basePokemon) * 0.15,
      ...getAttackAnimation(attacker, getFacing(attacker, defender)),
      yoyo: true,
      ease: 'Power1',
      onComplete: () => {
        // attack is considered done after the animation ends
        if (onComplete) {
          onComplete();
        }
      },
      onYoyo: () => {
        const attack = attacker.basePokemon.basicAttack;
        const damage = calculateDamage(
          attacker.basePokemon,
          defender.basePokemon,
          attack
        );
        if (!attack.projectile) {
          // deal damage immediately
          attacker.dealDamage(damage);
          defender.takeDamage(damage);
        } else {
          // otherwise fire off a projectile
          this.fireProjectile(attacker, defender, attack.projectile, () => {
            attacker.dealDamage(damage);
            defender.takeDamage(damage);
          });
        }
      },
    });
  }

  /**
   * Fires a projectile from one Pokemon to another.
   * Creates the Projectile object, and handles cleanup when it does
   * or when the scene is cleaned up.
   */
  fireProjectile(
    from: PokemonObject,
    to: PokemonObject,
    projectile: NonNullable<Attack['projectile']>,
    onDestroy: Function
  ) {
    const projectileObj = new Projectile(
      this,
      from.x,
      from.y,
      projectile.key,
      to,
      projectile.speed
    );
    this.physics.add.existing(this.add.existing(projectileObj));
    // store this in the `projectiles` map under a random key
    const projectileKey = generateId();
    this.projectiles[projectileKey] = projectileObj;
    projectileObj.on(Phaser.GameObjects.Events.DESTROY, () => {
      onDestroy();
      delete this.projectiles[projectileKey];
    });
  }
}
