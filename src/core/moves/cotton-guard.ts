import { Coords } from '../../scenes/game/combat/combat.helpers';
import { CombatScene } from '../../scenes/game/combat/combat.scene';
import { Move, MoveConfig } from '../move.model';
import { createDamageReductionEffect } from '../status.model';
import * as Tweens from '../tweens';

const damageReduction = [40, 50, 60];

/**
 * Cotton Guard - Dubwool line's move
 *
 * Temporarily reduces all incoming damage and ignores status effects
 */
export const cottonGuard = {
  displayName: 'Cotton Guard',
  type: 'active',
  cost: 16,
  startingPP: 8,
  range: 1,
  targetting: 'ground',
  get description() {
    return `{{user}} reduces all incoming damage by ${damageReduction.join(
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
        .addStatus('statusImmunity', DURATION)
        .addEffect(
          createDamageReductionEffect(
            'cotton-guard',
            damageReduction[user.basePokemon.stage - 1]
          ),
          DURATION
        );
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
} as const satisfies Move;
