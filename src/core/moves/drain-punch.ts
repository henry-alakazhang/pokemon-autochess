import { calculateDamage } from '../../scenes/game/combat/combat.helpers';
import { Move, MoveConfig } from '../move.model';

const defenseStat = 'defense' as const;
const bonusDamage = [150, 250, 400];

/**
 * Drain Punch - Timburr line's move
 *
 * Attacks with bonus damage and heals the user for half the amount
 */
export const drainPunch = {
  displayName: 'Drain Punch',
  type: 'active',
  cost: 16,
  startingPP: 0,
  defenseStat,
  targetting: 'unit',
  get description() {
    return `{{user}}'s next attack deals ${bonusDamage.join(
      '/'
    )} bonus physical damage and recovers {{user}}'s HP by half the bonus damage dealt.`;
  },
  range: 2,
  use({ scene, user, target, onComplete }: MoveConfig<'unit'>) {
    scene.basicAttack(user, target, {
      onHit: () => {
        const action = {
          damage: bonusDamage[user.basePokemon.stage - 1],
          defenseStat,
        };
        scene.causeDamage(user, target, action);

        // play bee animation on the target
        const bees = scene.add
          .sprite(target.x, target.y, 'drain-punch')
          .play('drain-punch')
          .once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            bees.destroy();
          });
        user.heal(calculateDamage(user, target, action) / 2);
      },
      onComplete,
    });
  },
} as const satisfies Move;
