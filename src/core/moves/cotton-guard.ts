import { Coords } from '../../scenes/game/combat/combat.helpers';
import { CombatScene } from '../../scenes/game/combat/combat.scene';
import { Move, MoveConfig } from '../move.model';
import * as Tweens from '../tweens';

/**
 * Cotton Guard - Dubwool line's move
 *
 * Temporarily reduces all incoming damage and ignores status effects
 */
const move = {
  displayName: 'Cotton Guard',
  type: 'active',
  cost: 16,
  startingPP: 8,
  range: 1,
  targetting: 'ground',
  // actually effectiveness haha
  damage: [40, 50, 60],
  get description() {
    return `{{user}} reduces all incoming damage by ${this.damage.join(
      '/'
    )}% and ignores status effects for 6 seconds.`;
  },
  getTarget(board: CombatScene['board'], myCoords: Coords) {
    return myCoords;
  },
  use({ scene, user, onComplete }: MoveConfig<'ground'>) {
    const DURATION = 6000;
    Tweens.hop(scene, { targets: [user] });

    const cotton = scene.add
      .sprite(user.x, user.y, 'cotton-guard')
      .play('cotton-guard-start');
    user.attach(cotton);
    user.addStatus('moveIsActive', DURATION);
    cotton.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      user
        // adding moveIsActive here will refresh the duration
        // so it lasts the same as everything else
        .addStatus('moveIsActive', DURATION)
        .addStatus(
          'percentDamageReduction',
          DURATION,
          this.damage[user.basePokemon.stage - 1]
        )
        .addStatus('statusImmunity', DURATION);
      cotton.play('cotton-guard-spin');
      onComplete();

      // end animation when status is over
      scene.time.addEvent({
        callback: () => {
          if (cotton.active) {
            cotton.play('cotton-guard-end');
            cotton.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
              cotton.destroy();
            });
          }
        },
        delay: DURATION,
      });
    });
  },
} as const;

export const cottonGuard: Move = move;
