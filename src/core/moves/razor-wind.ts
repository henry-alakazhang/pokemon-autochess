import { flatten } from '../../helpers';
import {
  calculateDamage,
  Coords,
  optimiseAOE,
} from '../../scenes/game/combat/combat.helpers';
import { CombatScene } from '../../scenes/game/combat/combat.scene';
import { getCoordinatesForMainboard } from '../../scenes/game/game.helpers';
import { Move, MoveConfig } from '../move.model';
import * as Tweens from '../tweens';

/**
 * Razor Wind - Shiftry line's move
 *
 * Starts a whirlwind which triggers after 2 seconds,
 * dealing significant damage over time to an area around the target
 *
 * TODO: add custom targetting to hit maximum AoE
 */
const move = {
  displayName: 'Razor Wind',
  type: 'active',
  cost: 24,
  startingPP: 12,
  damage: [400, 750, 100],
  defenseStat: 'specDefense',
  targetting: 'ground',
  get description() {
    return `{{user}} whips up a whirlwind over the fastest enemy. After 2 seconds, the whirlwind deals ${this.damage.join(
      '/'
    )} damage over 2 seconds to any enemies caught i it.`;
  },
  range: 99,
  getTarget(board: CombatScene['board'], user: Coords): Coords | undefined {
    let fastest: Coords | undefined;
    let fastestSpeed = -Infinity;
    flatten(
      board.map((col, x) => col.map((pokemon, y) => ({ x, y, pokemon })))
    ).forEach(({ x, y, pokemon }) => {
      if (!pokemon) {
        return;
      }
      if (
        pokemon.side !== board[user.x][user.y]?.side &&
        pokemon.basePokemon.speed > fastestSpeed
      ) {
        fastestSpeed = pokemon.basePokemon.speed;
        fastest = { x, y };
      }
    });

    if (!fastest) {
      return undefined;
    }

    // from the possible spots that can hit the target, pick the one that will hit the most enemies
    return optimiseAOE({
      board,
      user,
      range: this.range,
      getAOE: this.getAOE,
      pool: [
        fastest,
        { x: fastest.x, y: fastest.y - 1 },
        { x: fastest.x - 1, y: fastest.y - 1 },
        { x: fastest.x - 1, y: fastest.y - 1 },
      ],
    });
  },
  /** Area of effect is a 4-tile square */
  getAOE(coords: Coords) {
    return [
      { x: coords.x, y: coords.y },
      { x: coords.x, y: coords.y + 1 },
      { x: coords.x + 1, y: coords.y },
      { x: coords.x + 1, y: coords.y + 1 },
    ];
  },
  async use({
    scene,
    user,
    targetCoords,
    board,
    onComplete,
  }: MoveConfig<'ground'>) {
    const gfxTarget = getCoordinatesForMainboard(targetCoords);
    await Tweens.hop(scene, {
      targets: [user],
      // double-hopping animation
      repeat: 1,
    });
    // animation: small spinny whirlwind effect below the poekmon
    const base = scene.add
      .sprite(gfxTarget.x + 35, gfxTarget.y + 35, 'razor-wind-base')
      .setDepth(-1)
      .play('razor-wind-base');
    // turn is over after casting
    onComplete();

    // start dealing damage 2 seconds later
    scene.time.addEvent({
      callback: () => {
        base.destroy();
        const wind = scene.add
          .sprite(gfxTarget.x + 35, gfxTarget.y + 35, 'razor-wind-wind')
          .setScale(0.5, 0.5)
          .play('razor-wind-wind');
        scene.add.tween({
          targets: [wind],
          duration: 500,
          scaleX: 2,
          scaleY: 2,
        });
        // the code below has a delay, so the first tick will occur after the tween ends
        const ticks = 4;
        const dph = this.damage[user.basePokemon.stage - 1] / ticks;
        const timer = scene.time.addEvent({
          callback: () => {
            // deal damage to each person in range (2 x 2 square)
            this.getAOE(targetCoords).forEach(coord => {
              const pokemon = board[coord.x]?.[coord.y];
              if (pokemon && pokemon.side !== user.side) {
                const damage = calculateDamage(user, pokemon, {
                  damage: dph,
                  defenseStat: this.defenseStat,
                });
                scene.causeDamage(user, pokemon, damage, {
                  isAOE: true,
                  canCrit: true,
                });
              }
            });
            if (timer.repeatCount === 0) {
              wind.destroy();
            }
          },
          delay: 2000 / ticks,
          repeat: ticks,
        });
      },
      delay: 1000,
    });
  },
} as const;

export const razorWind: Move = move;
