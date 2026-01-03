import {
  getAttackAnimation,
  getFacing,
  getTurnDelay,
} from '../../scenes/game/combat/combat.helpers';
import { Move, MoveConfig } from '../move.model';

const defenseStat = 'defense' as const;
const damage = [400, 650, 900];

/**
 * Double Shock - Pawmi line's move
 *
 * Deals heavy damage to a single target. User cannot gain PP for a while.
 */
export const doubleShock = {
  displayName: 'Double Shock',
  type: 'active',
  cost: 10,
  startingPP: 4,
  defenseStat,
  targetting: 'unit',
  get description() {
    return `{{user}} discharges all the electricity from its body to blast a single target, dealing ${damage.join(
      '/'
    )} damage. {{user}} cannot gain PP for 10 seconds.`;
  },
  range: 1,
  use({ scene, user, target, onComplete }: MoveConfig<'unit'>) {
    user.addStatus('moveIsActive', 10_000);

    // animation: some sparks then a tackle
    const buzz = scene.add
      .sprite(user.x, user.y, 'double-shock')
      .play('double-shock');
    buzz.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      buzz.destroy();
      scene.add.tween({
        targets: [user],
        duration: getTurnDelay(user.basePokemon) * 0.15,
        ...getAttackAnimation(user, getFacing(user, target)),
        yoyo: true,
        ease: 'Power1',
        onYoyo: () => {
          scene.causeDamage(user, target, {
            damage: damage[user.basePokemon.stage - 1],
            defenseStat,
          });
          onComplete();
        },
      });
    });
  },
} as const satisfies Move;
