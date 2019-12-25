import { Coords, optimiseAOE } from '../../scenes/game/combat/combat.helpers';
import {
  CombatScene,
  getCoordinatesForGrid,
} from '../../scenes/game/combat/combat.scene';
import { Move, MoveConfig } from '../move.model';

/**
 * Razor Wind - Shiftry line's move
 *
 * Starts a whirlwind which triggers after 2 seconds,
 * dealing significant damage over time to an area around the target
 *
 * TODO: add custom targetting to hit maximum AoE
 */
export const razorWind: Move = {
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
  use({ scene, user, targetCoords, board, onComplete }: MoveConfig<'ground'>) {
    // double-hopping animation
    const gfxTarget = getCoordinatesForGrid(targetCoords);
    scene.add.tween({
      targets: [user],
      duration: 150,
      y: user.y - 10,
      yoyo: true,
      ease: 'Quad.easeOut',
      repeat: 1,
      onComplete: () => {
        // animation: small spinny whirlwind effect below the poekmon
        const base = scene.add
          .sprite(gfxTarget.x + 35, gfxTarget.y + 35, 'razor-wind-base')
          .setDepth(-1)
          .play('razor-wind-base');
        // turn is over after casting
        onComplete();
        // start dealing damage 2 seconds later
        window.setTimeout(() => {
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
          // the code below uses setInterval so the first tick will occur after the tween ends

          let hits = 0;
          const dph = this.damage[user.basePokemon.stage - 1] / 2;
          const interval = window.setInterval(() => {
            // deal damage to each person in range (2 x 2 square)
            this.getAOE(targetCoords).forEach(coord => {
              const pokemon = board[coord.x]?.[coord.y];
              if (pokemon && pokemon.side !== user.side) {
                user.dealDamage(dph);
                pokemon.takeDamage(dph);
              }
            });
            hits++;
            if (hits >= 2) {
              wind.destroy();
              window.clearInterval(interval);
            }
          }, 1000);
        }, 1000);
      },
    });
  },
} as const;
