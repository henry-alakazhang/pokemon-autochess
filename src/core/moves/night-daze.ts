import {
  calculateDamage,
  getAttackAnimation,
  getFacing,
  getTurnDelay,
} from '../../scenes/game/combat/combat.helpers';
import { Move, MoveConfig } from '../move.model';

/**
 * Night Daze - Zoroark line's move
 *
 * Damages a target and blinds them for 3 seconds.
 */
export const nightDaze: Move = {
  displayName: 'Night Daze',
  type: 'active',
  range: 1,
  targetting: 'unit',
  damage: [350, 600, 1200],
  get description() {
    return `Hits the target with a pitch-black blast, dealing ${this.damage.join(
      '/'
    )} damage and blinding them for 3 seconds`;
  },
  use({ scene, user, target, onComplete }: MoveConfig<'unit'>) {
    scene.add.tween({
      targets: [user],
      duration: getTurnDelay(user.basePokemon) * 0.15,
      ...getAttackAnimation(user, getFacing(user, target)),
      yoyo: true,
      ease: 'Power1',
      onYoyo: () => {
        const damage = calculateDamage(user, target, {
          damage: this.damage[user.basePokemon.stage - 1],
          defenseStat: 'defense',
        });
        target.takeDamage(damage);
        target.addStatus('blind', 3000);
        onComplete();
      },
    });
  },
} as const;
