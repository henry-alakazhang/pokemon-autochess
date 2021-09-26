import { Scene } from 'phaser';
import { synergyData } from '../../../core/game.model';
import { Attack, PokemonName } from '../../../core/pokemon.model';
import { flatten, generateId, isDefined } from '../../../helpers';
import { FloatingText } from '../../../objects/floating-text.object';
import { Player } from '../../../objects/player.object';
import {
  PokemonAnimationType,
  PokemonObject,
} from '../../../objects/pokemon.object';
import { Projectile } from '../../../objects/projectile.object';
import { defaultStyle, titleStyle } from '../../../objects/text.helpers';
import {
  BOARD_WIDTH,
  CELL_WIDTH,
  getCoordinatesForMainboard,
  GRID_X,
  GRID_Y,
} from '../game.helpers';
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

export interface CombatEndEvent {
  readonly winner: 'player' | 'enemy' | undefined;
}
export type CombatBoard = Array<Array<PokemonObject | undefined>>;
export interface CombatSceneData {
  readonly player: Player;
  readonly enemy: Player;
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
  static Events = {
    COMBAT_END: 'combatComplete',
  };

  board: CombatBoard;
  private grid: Phaser.GameObjects.Grid;
  private title: Phaser.GameObjects.Text;
  private timerText: Phaser.GameObjects.Text;
  private projectiles: { [k: string]: Projectile } = {};

  private timer: number;

  private players: {
    player: Player;
    enemy: Player;
  };

  constructor() {
    super({
      key: CombatScene.KEY,
    });
  }

  create(data: CombatSceneData) {
    this.timer = 60_000;
    this.timerText = this.add
      .text(550, 35, '60', titleStyle)
      .setOrigin(0, 0)
      .setFontSize(30)
      .setPadding(4)
      .setBackgroundColor('slategrey');

    console.log(
      `Combat: ${data.player.playerName} vs ${data.enemy.playerName}`
    );

    this.board = Array(BOARD_WIDTH)
      .fill(undefined)
      // fill + map rather than `fill` an array because
      // `fill` will only initialise one array and fill with shallow copies
      .map(() => Array(BOARD_WIDTH).fill(undefined));

    this.grid = this.add.grid(
      GRID_X, // center x
      GRID_Y, // center y
      CELL_WIDTH * BOARD_WIDTH, // total width
      CELL_WIDTH * BOARD_WIDTH, // total height
      CELL_WIDTH, // cell width
      CELL_WIDTH, // cell height
      0, // fill: none
      0, // fill alpha: transparent
      0xffaa00, // lines: yellow
      1 // line alpha: solid
    );

    this.title = this.add
      .text(
        this.game.canvas.width / 2,
        50,
        `VS ${data.enemy.playerName}`,
        defaultStyle
      )
      .setFontSize(17)
      .setOrigin(0.5, 0);

    this.players = {
      player: data.player,
      enemy: data.enemy,
    };

    this.players.player.mainboard.forEach((col, x) =>
      col.forEach(
        (pokemon, y) =>
          pokemon && this.addPokemon('player', { x, y }, pokemon.name)
      )
    );
    this.players.enemy.mainboard.forEach((col, x) =>
      col.forEach(
        (pokemon, y) =>
          pokemon &&
          this.addPokemon(
            'enemy',
            {
              x,
              // flip Y coordinates for enemy teams
              y: BOARD_WIDTH - 1 - y,
            },
            pokemon.name
          )
      )
    );

    this.players.player.synergies.forEach(synergy => {
      synergyData[synergy.category].onRoundStart?.({
        scene: this,
        board: this.board,
        side: 'player',
        count: synergy.count,
      });
    });
    this.players.enemy.synergies.forEach(synergy => {
      synergyData[synergy.category].onRoundStart?.({
        scene: this,
        board: this.board,
        side: 'enemy',
        count: synergy.count,
      });
    });

    // check immediately in case someone is open-forting
    this.checkRoundEnd();

    flatten(this.board)
      .filter(isDefined)
      .forEach(pokemon => this.setTurn(pokemon));
  }

  update(time: number, delta: number) {
    // trigger updates on each projectile
    Object.values(this.projectiles).forEach(x => x?.update());

    this.timer -= delta;
    // TODO: speed up combat as we start running out of time
    this.timerText.setText(`${Math.round(this.timer / 1000)}`);

    if (this.timer <= 0) {
      this.add
        .text(GRID_X, GRID_Y, `ROUND OVER: DRAW!`, {
          ...defaultStyle,
          backgroundColor: '#000',
          fontSize: '40px',
        })
        .setDepth(200)
        .setOrigin(0.5, 0.5);
      this.scene.pause();
      this.events.emit(CombatScene.Events.COMBAT_END, {
        winner: undefined,
      } as CombatEndEvent);
      setTimeout(() => {
        this.scene.stop(CombatScene.KEY);
      }, 2000);
    }
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
        ...defaultStyle,
        backgroundColor: '#000',
        fontSize: '40px',
      })
      .setDepth(200)
      .setOrigin(0.5, 0.5);
    this.events.emit(CombatScene.Events.COMBAT_END, {
      winner,
    } as CombatEndEvent);
    setTimeout(() => {
      this.scene.stop(CombatScene.KEY);
    }, 2000);
  }

  addPokemon(
    side: 'player' | 'enemy',
    { x, y }: Coords,
    name: PokemonName,
    startingAnimation?: PokemonAnimationType
  ): PokemonObject {
    const coords = getCoordinatesForMainboard({ x, y });
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
        this.players.player.synergies.forEach(synergy => {
          synergyData[synergy.category].onDeath?.({
            scene: this,
            board: this.board,
            pokemon,
            side: 'player',
            count: synergy.count,
          });
        });
        this.players.enemy.synergies.forEach(synergy => {
          synergyData[synergy.category].onDeath?.({
            scene: this,
            board: this.board,
            pokemon,
            side: 'enemy',
            count: synergy.count,
          });
        });
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
    return pokemon;
  }

  movePokemon(start: Coords, end: Coords, onComplete?: Function) {
    if (start.x === end.x && start.y === end.y) {
      onComplete?.();
      return;
    }

    const facing = getFacing(start, end);
    const mover = this.board[start.x][start.y];
    if (!mover) {
      return;
    }

    mover.playAnimation(facing);
    this.board[end.x][end.y] = mover;
    this.board[start.x][start.y] = undefined;
    const newPosition = getCoordinatesForMainboard(end);
    mover.move(newPosition, onComplete);
  }

  /**
   * Searches the board for a Pokemon and returns its grid coords
   * This is slightly different to (and simpler than) the similar helpers in
   * the GameScene, because we only ever need to call this on actual Pokemon,
   * and not on clicks which may or may not be on Pokemon.
   *
   * Doing a search will also double as a check that the Pokemon is alive
   */
  getBoardLocationForPokemon(target?: PokemonObject): Coords | undefined {
    if (!target) {
      return undefined;
    }

    let location;
    this.board.forEach((col, x) => {
      col.forEach((pokemon, y) => {
        if (pokemon?.id === target.id) {
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
    pokemon.updateStatuses(delay);
    this.time.addEvent({
      callback: () => this.takeTurn(pokemon),
      delay,
    });
  }

  /**
   * Takes a turn for the given Pokemon
   */
  takeTurn(pokemon: PokemonObject) {
    // can't act: just wait til next turn
    if (pokemon.status.paralyse || pokemon.status.sleep) {
      this.setTurn(pokemon);
      return;
    }

    const myCoords = this.getBoardLocationForPokemon(pokemon);
    if (!myCoords) {
      return;
    }

    // simple targetting logic: either use an existing saved target
    // or use the nearest available Pokemon
    const simpleTargetCoords =
      this.getBoardLocationForPokemon(pokemon.currentTarget) ??
      getNearestTarget(this.board, myCoords);

    // use move if available, otherwise use basic attack
    let selectedAttack =
      pokemon.currentPP === pokemon.maxPP &&
      pokemon.basePokemon.move &&
      pokemon.basePokemon.move.type === 'active'
        ? pokemon.basePokemon.move
        : pokemon.basePokemon.basicAttack;
    // use move-specific targetting, or default to prepicked target
    let selectedCoords =
      'getTarget' in selectedAttack && selectedAttack.getTarget
        ? selectedAttack.getTarget(this.board, myCoords)
        : simpleTargetCoords;

    if (!selectedCoords) {
      // if move has no valid target, fall back to basic attack
      selectedAttack = pokemon.basePokemon.basicAttack;
      selectedCoords = simpleTargetCoords;
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
      if (pokemon.status.immobile) {
        // can't move: reset target and end turn
        pokemon.currentTarget = undefined;
        this.setTurn(pokemon);
        return;
      }

      const step = pathfind(this.board, myCoords, targetCoords, attack.range);
      if (!step) {
        console.log('no valid step');
        // can't reach: just reset targetting and wait for next turn
        // FIXME: I'm pretty sure this will result in times when the Pokemon
        // will tunnel-vision and freeze up even if there are other valid targets
        pokemon.currentTarget = undefined;
        this.setTurn(pokemon);
        return;
      }

      this.movePokemon(myCoords, step);
      this.setTurn(pokemon);
      return;
    }

    const targetPokemon = this.board[targetCoords.x][targetCoords.y];

    // if it's a move, use it
    if ('use' in attack) {
      pokemon.currentPP = 0;
      if (attack.targetting === 'unit' && !targetPokemon) {
        // end turn since there's no valid target
        return this.setTurn(pokemon);
      }
      attack.use({
        scene: this,
        board: this.board,
        user: pokemon,
        userCoords: myCoords,
        targetCoords,
        // cast here because it's always PokemonObject when we need it to be
        // we know because we just checkked `targetted && !targetPokemon`.
        target: targetPokemon as PokemonObject,
        onComplete: () => {
          this.players[pokemon.side].synergies.forEach(synergy => {
            synergyData[synergy.category].onMoveUse?.({
              scene: this,
              board: this.board,
              user: pokemon,
              count: synergy.count,
            });
          });
          if (pokemon.currentHP > 0) {
            this.setTurn(pokemon);
          }
        },
      });
      return;
    }

    if (!targetPokemon) {
      // end turn since there's no valid target
      return this.setTurn(pokemon);
    }

    // save the current target if it exists
    pokemon.currentTarget = targetPokemon;

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
    // don't do anything if the attacker can't attack
    if (attacker.basePokemon.basicAttack.unusable) {
      if (onComplete) {
        onComplete();
      }
      return;
    }

    const facing = getFacing(attacker, defender);
    attacker.playAnimation(facing);

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
        const damage = calculateDamage(attacker, defender, attack);

        const onHit = () => {
          this.causeDamage(attacker, defender, damage, { isAttack: true });
        };

        if (!attack.projectile) {
          // hit immediately
          onHit();
        } else {
          // otherwise fire off a projectile
          this.fireProjectile(attacker, defender, attack.projectile, () => {
            onHit();
          });
        }
      },
    });
  }

  /**
   * Causes one Pokemon to damage another, triggering all related effects
   */
  causeDamage(
    attacker: PokemonObject,
    defender: PokemonObject,
    amount: number,
    {
      isAttack = false,
      isAOE = false,
      canCrit = false,
    }: { isAttack?: boolean; isAOE?: boolean; canCrit?: boolean } = {}
  ) {
    if (isAttack) {
      // calculate miss chance
      const accuracy = attacker.status.blind ? 0 : 1;
      const { evasion } = defender;
      const hitChance = accuracy * (1 - evasion);
      if (Math.random() > hitChance) {
        // doesn't hit

        this.add.existing(
          new FloatingText(this, defender.x, defender.y, 'MISS!')
        );
        return;
      }
    }

    let totalDamage = amount;
    this.players[attacker.side].synergies.forEach(synergy => {
      totalDamage =
        synergyData[synergy.category].calculateDamage?.({
          attacker,
          defender,
          baseAmount: totalDamage,
          flags: { isAttack, isAOE },
          side: attacker.side,
          count: synergy.count,
        }) ?? totalDamage;
    });
    this.players[defender.side].synergies.forEach(synergy => {
      totalDamage =
        synergyData[synergy.category].calculateDamage?.({
          attacker,
          defender,
          baseAmount: totalDamage,
          flags: { isAttack, isAOE },
          side: defender.side,
          count: synergy.count,
        }) ?? totalDamage;
    });

    // if `canCrit` is passed in, use the value
    // otherwise, all attacks can crit by default
    const actuallyCanCrit = canCrit ?? isAttack ?? false;
    const doesCrit = Math.random() < attacker.critRate;
    if (actuallyCanCrit && doesCrit) {
      totalDamage *= attacker.critDamage;
    }

    totalDamage = Math.round(totalDamage);
    attacker.dealDamage(totalDamage);
    defender.takeDamage(totalDamage, { crit: doesCrit });
    this.players[attacker.side].synergies.forEach(synergy => {
      synergyData[synergy.category].onHit?.({
        scene: this,
        board: this.board,
        attacker,
        defender,
        damage: amount,
        flags: { isAttack, isAOE },
        count: synergy.count,
      });
    });
    this.players[defender.side].synergies.forEach(synergy => {
      synergyData[synergy.category].onBeingHit?.({
        scene: this,
        board: this.board,
        attacker,
        defender,
        damage: amount,
        flags: { isAttack, isAOE },
        count: synergy.count,
      });
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
    onHit: Function
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
    projectileObj.on(Projectile.Events.HIT, () => {
      onHit();
    });
    projectileObj.on(Phaser.GameObjects.Events.DESTROY, () => {
      delete this.projectiles[projectileKey];
    });
  }

  getOverlappingUnits(
    projectile: Phaser.GameObjects.GameObject
  ): PokemonObject[] {
    return flatten(this.board)
      .filter(isDefined)
      .filter(pokemon => this.physics.overlap(pokemon, projectile));
  }
}
