import { Coords, optimiseAOE } from '../../scenes/game/combat/combat.helpers';
import {
  CombatScene,
  getCoordinatesForGrid,
} from '../../scenes/game/combat/combat.scene';
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
  damage: [600, 1000, 1800],
  defenseStat: 'specDefense',
  targetting: 'ground',
  get description() {
    return `After 2 seconds, whips up a whirlwind which deals ${this.damage.join(
      '/'
    )} damage over 2 seconds`;
  },
  range: 3,
  getTarget(board: CombatScene['board'], user: Coords): Coords | undefined {
    return optimiseAOE({
      board,
      user,
      range: this.range,
      getAOE: this.getAOE,
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
    const gfxTarget = getCoordinatesForGrid(targetCoords);
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
          duration: 1000,
          scaleX: 2,
          scaleY: 2,
        });
        // the code below has a delay, so the first tick will occur after the tween ends
        const dph = this.damage[user.basePokemon.stage - 1] / 2;
        scene.time.addEvent({
          callback: () => {
            // deal damage to each person in range (2 x 2 square)
            this.getAOE(targetCoords).forEach(coord => {
              const pokemon = board[coord.x]?.[coord.y];
              if (pokemon && pokemon.side !== user.side) {
                scene.causeDamage(user, pokemon, dph, { isAOE: true });
              }
            });
          },
          delay: 1000,
          repeat: 2,
        });
      },
      delay: 1000,
    });
  },
} as const;

export const razorWind: Move = move;
