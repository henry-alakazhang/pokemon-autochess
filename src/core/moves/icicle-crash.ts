import {
  getAttackAnimation,
  getFacing,
  getTurnDelay,
} from '../../scenes/game/combat/combat.helpers';
import { Move, MoveConfig } from '../move.model';
import * as Tweens from '../tweens';

const damage = [250, 400, 600];
const defenseStat = 'defense' as const;

/**
 * Icicle Crash - Mamoswine line's move
 */
export const icicleCrash = {
  displayName: 'Icicle Crash',
  type: 'active',
  targetting: 'unit',
  range: 1,
  cost: 16,
  startingPP: 10,
  defenseStat: 'defense',
  get description() {
    return `{{user}} smashes the target with a massive icicle, dealing ${damage.join('/')} physical damage and causing the target to flinch, reducing PP gain until their next move use.`;
  },
  use({ scene, user, target, onComplete }: MoveConfig<'unit'>) {
    Tweens.hop(scene, {
      targets: [user],
      onComplete: () => {
        scene.add.tween({
          targets: [user],
          duration: getTurnDelay(user.basePokemon) * 0.15,
          ...getAttackAnimation(user, getFacing(user, target)),
          yoyo: true,
          ease: 'Power1',
          onYoyo: () => {
            const action = {
              damage: damage[user.basePokemon.stage - 1],
              defenseStat,
            };

            const grip = scene.add
              .sprite(target.x, target.y - 36, 'icicle-crash')
              .play('icicle-crash');
            grip.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
              grip.destroy();
            });
            scene.causeDamage(user, target, action);
            target.addStatus('ppReduction', 99999);
            onComplete();
          },
        });
      },
    });
  },
} as const satisfies Move;
