import { Scene } from 'phaser';
import { synergyData } from '../../../core/game.model';
import { PokemonName } from '../../../core/pokemon.model';
import { flatten, generateId, isDefined } from '../../../helpers';
import { DamageChart } from '../../../objects/damage-chart.object';
import { FloatingText } from '../../../objects/floating-text.object';
import { Player } from '../../../objects/player.object';
import {
  PokemonAnimationType,
  PokemonObject,
} from '../../../objects/pokemon.object';
import {
  Projectile,
  ProjectileConfig,
} from '../../../objects/projectile.object';
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
  getOppositeSide,
  getTurnDelay,
  pathfind,
} from './combat.helpers';

export interface CombatEndEvent {
  readonly winner: 'player' | 'enemy' | undefined;
  readonly damageGraph: {
    player: { dealt: { [k: string]: number }; taken: { [k: string]: number } };
    enemy: { dealt: { [k: string]: number }; taken: { [k: string]: number } };
  };
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

  private damageGraph: {
    player: { dealt: { [k: string]: number }; taken: { [k: string]: number } };
    enemy: { dealt: { [k: string]: number }; taken: { [k: string]: number } };
  };
  private damageChart: DamageChart;

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
    this.time.timeScale = 1;
    this.tweens.timeScale = 1;
    this.anims.globalTimeScale = 1;
    this.physics.world.timeScale = 1;
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

    this.damageGraph = {
      player: { dealt: {}, taken: {} },
      enemy: { dealt: {}, taken: {} },
    };
    this.damageChart = this.add.existing(
      new DamageChart(this, 690, 340, this.damageGraph.player.dealt)
    );

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
      .forEach(pokemon => {
        if (pokemon.basePokemon.move?.type === 'passive') {
          pokemon.basePokemon.move.onRoundStart?.({
            scene: this,
            self: pokemon,
          });
        }
        this.setTurn(pokemon);
      });
  }

  update(time: number, delta: number) {
    // trigger updates on each projectile
    Object.values(this.projectiles).forEach(x => x?.update(time, delta));

    this.timer -= delta;
    this.timerText.setText(`${Math.round(this.timer / 1000)}`);

    if (this.timer <= 10_000 && this.time.timeScale === 1) {
      this.timerText.setBackgroundColor('#840');
      this.time.timeScale = 2;
      this.tweens.timeScale = 2;
      this.anims.globalTimeScale = 2;
      // wtf?
      this.physics.world.timeScale = 0.5;
    }

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
        damageGraph: this.damageGraph,
      } as CombatEndEvent);
      console.log(this.damageGraph);
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

    const logDamage = (numbers: { [k: string]: number }) => {
      return Object.entries(numbers)
        .sort(([, a], [, b]) => b - a)
        .map(([id, damage]) => `${id.split('-')[0]}: ${damage}`)
        .join('\n');
    };
    console.log('Player damage');
    console.log(logDamage(this.damageGraph.player.dealt));
    console.log('Player damage taken');
    console.log(logDamage(this.damageGraph.player.taken));
    console.log('Enemy damage');
    console.log(logDamage(this.damageGraph.enemy.dealt));
    console.log('Enemy damage taken');
    console.log(logDamage(this.damageGraph.enemy.taken));

    const winner = playerAlive ? 'player' : 'enemy';
    this.add
      .text(GRID_X, GRID_Y, `ROUND OVER: ${winner.toUpperCase()} WINS!`, {
        ...defaultStyle,
        backgroundColor: '#000',
        fontSize: '40px',
      })
      .setDepth(200)
      .setOrigin(0.5, 0.5);
    this.scene.pause();
    this.events.emit(CombatScene.Events.COMBAT_END, {
      winner,
      damageGraph: this.damageGraph,
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
        this.removePokemon(pokemon);
        // wait a tick for other death triggers to go off as well
        this.time.addEvent({
          callback: () => this.checkRoundEnd(),
          delay: 0,
        });
      },
      this
    );
    if (startingAnimation) {
      pokemon.playAnimation(startingAnimation);
    }
    this.board[x][y] = pokemon;
    // initialize damage graph
    this.damageGraph[side].dealt[
      `${pokemon.basePokemon.name}-${pokemon.id}`
    ] = 0;
    this.damageGraph[side].taken[
      `${pokemon.basePokemon.name}-${pokemon.id}`
    ] = 0;
    return pokemon;
  }

  removePokemon(toRemove: PokemonObject) {
    this.board.forEach((col, x) =>
      col.forEach((pokemon, y) => {
        if (pokemon?.id === toRemove.id) {
          this.board[x][y] = undefined;
        }
      })
    );
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
    mover.move(newPosition, { onComplete });
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

    this.players[pokemon.side].synergies.forEach(synergy => {
      synergyData[synergy.category].onTurnStart?.({
        scene: this,
        board: this.board,
        pokemon,
        count: synergy.count,
      });
    });

    // use move if available, otherwise use basic attack
    const { basicAttack } = pokemon.basePokemon;
    const move =
      pokemon.basePokemon.move?.type === 'active'
        ? pokemon.basePokemon.move
        : undefined;
    /**
     * The attack the Pokeon is trying to use
     * If the Pokemon has an active move and enough PP, use it.
     */
    let selectedAttack =
      pokemon.currentPP === pokemon.maxPP && move ? move : basicAttack;
    /** The target being picked for the attack */
    let selectedCoords: Coords | undefined;
    /** The route to path through to reach the selected target */
    let selectedPath: Coords[] | undefined;

    // if the move has special targetting logic, check it
    if ('getTarget' in selectedAttack && isDefined(selectedAttack.getTarget)) {
      selectedCoords = selectedAttack.getTarget(this.board, myCoords);
      if (selectedCoords) {
        // if move has a valid target, calculate path
        // generally this code should be unnecessary,
        // as moves with getTarget() should only return targets that are in range
        selectedPath = pathfind(
          this.board,
          myCoords,
          [selectedCoords],
          selectedAttack.range
        )?.path;
        // FIXME: if there's no valid path, handle or something
      } else {
        // if move has no valid target, fall back to basic attack
        selectedAttack = pokemon.basePokemon.basicAttack;
      }
    }

    // if we didn't pick a specific target for the move, we need to pick a generic target
    if (!selectedCoords) {
      // check the Pokemon's current target
      const currentTargetCoords = this.getBoardLocationForPokemon(
        pokemon.currentTarget
      );
      // if it's in reasonable range (ie. only one move to reach), use the current target
      if (
        currentTargetCoords &&
        getGridDistance(myCoords, currentTargetCoords) <=
          selectedAttack.range + 1
      ) {
        selectedCoords = currentTargetCoords;
      } else {
        // get all possible enemy targets
        const allEnemyCoords =
          // first, map the board to Pokemon + coords and flatten it
          flatten(
            this.board.map((col, x) =>
              col.map((pokemonAt, y) => ({ pokemonAt, boardCoords: { x, y } }))
            )
          )
            .filter(
              // filter for opposing Poekmon
              ({ pokemonAt }) =>
                pokemonAt?.side === getOppositeSide(pokemon.side)
            )
            .map(({ boardCoords }) => boardCoords);

        // and use pathfind to get path to closest one
        const pathfound = pathfind(
          this.board,
          myCoords,
          allEnemyCoords,
          selectedAttack.range
        );
        selectedCoords = pathfound?.target;
        selectedPath = pathfound?.path;
      }
    }

    if (!selectedCoords) {
      // no valid target: wait until next turn
      // hopefully we can get unblocked eventually
      // FIXME: If there are no reachable enemies for a Pokemon,
      // they should ideally still walk closer (even if out of range)
      this.setTurn(pokemon);
      return;
    }

    // face target
    const facing = getFacing(myCoords, selectedCoords);
    pokemon.playAnimation(facing);

    // if out of range, move into range
    if (getGridDistance(myCoords, selectedCoords) > selectedAttack.range) {
      if (pokemon.status.immobile) {
        // can't move: reset target and end turn
        pokemon.currentTarget = undefined;
        this.setTurn(pokemon);
        return;
      }

      // access current path, or fallback to running pathfinding again
      // the pathfind here shouldn't really be called, but better safe than sorry I guess
      // note: pathfinding returns the path backwards so use .pop() to get the first step
      const step =
        selectedPath?.pop() ??
        pathfind(
          this.board,
          myCoords,
          [selectedCoords],
          selectedAttack.range
        )?.path.pop();
      if (!step) {
        console.log('no valid step');
        // can't reach: just reset targetting and wait for next turn
        // this should basically never happen since we check pathfinding to all targets
        // before actually picking one
        pokemon.currentTarget = undefined;
        this.setTurn(pokemon);
        return;
      }

      this.movePokemon(myCoords, step);
      this.setTurn(pokemon);
      return;
    }

    const targetPokemon = this.board[selectedCoords.x][selectedCoords.y];

    // if it's a move, use it
    if ('use' in selectedAttack) {
      pokemon.currentPP = 0;
      if (selectedAttack.targetting === 'unit' && !targetPokemon) {
        // end turn since there's no valid target
        return this.setTurn(pokemon);
      }
      selectedAttack.use({
        scene: this,
        board: this.board,
        user: pokemon,
        userCoords: myCoords,
        targetCoords: selectedCoords,
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
    this.basicAttack(pokemon, targetPokemon, {
      onComplete: () => {
        // afterwards, end the turn
        this.setTurn(pokemon);
      },
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
    { onComplete, onHit }: { onComplete?: Function; onHit?: Function } = {}
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

        const applyDamage = () => {
          this.causeDamage(attacker, defender, damage, { isAttack: true });
        };

        if (!attack.projectile) {
          // hit immediately
          applyDamage();
          onHit?.();
        } else {
          // otherwise fire off a projectile
          this.fireProjectile(attacker, defender, attack.projectile, () => {
            applyDamage();
            onHit?.();
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
      triggerEvents = true,
      canCrit,
    }: {
      isAttack?: boolean;
      isAOE?: boolean;
      canCrit?: boolean;
      triggerEvents?: boolean;
    } = {}
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

    if (!isAttack) {
      totalDamage *= attacker.status.movePowerBoost?.value ?? 1;
    }

    // if `canCrit` is passed in, use the value
    // otherwise, all attacks can crit by default
    const actuallyCanCrit = canCrit ?? isAttack ?? false;
    const doesCrit = actuallyCanCrit && Math.random() < attacker.critRate;
    if (doesCrit) {
      totalDamage *= attacker.critDamage;
    }

    // deal more damage in the Sudden Death fast time
    totalDamage *= this.time.timeScale;

    totalDamage = Math.round(totalDamage);
    attacker.dealDamage(totalDamage, { isAttack });
    defender.takeDamage(totalDamage, { triggerEvents, crit: doesCrit });

    if (triggerEvents) {
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
      if (attacker.basePokemon.move?.type === 'passive') {
        attacker.basePokemon.move.onHit?.({
          scene: this,
          attacker,
          defender,
          damage: totalDamage,
        });
      }
      if (defender.basePokemon.move?.type === 'passive') {
        defender.basePokemon.move.onBeingHit?.({
          scene: this,
          attacker,
          defender,
          damage: totalDamage,
        });
      }
    }

    // link damage to the Pokemon who owns/summoned this one
    const realAttacker = attacker.owner ?? attacker;
    this.damageGraph[realAttacker.side].dealt[
      `${realAttacker.basePokemon.name}-${realAttacker.id}`
    ] += amount;
    this.damageGraph[defender.side].taken[
      `${defender.basePokemon.name}-${defender.id}`
    ] += amount;
    this.damageChart.render();
  }

  /**
   * Fires a projectile from one Pokemon to another.
   * Creates the Projectile object, and handles cleanup when it does
   * or when the scene is cleaned up.
   */
  fireProjectile(
    from: PokemonObject,
    to: PokemonObject,
    config: ProjectileConfig,
    onHit: Function
  ) {
    const projectileObj = this.add.existing(
      new Projectile(this, from.x, from.y, to, config)
    );
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
