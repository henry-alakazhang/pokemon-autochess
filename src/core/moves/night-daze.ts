import {
  getAttackAnimation,
  getFacing,
  getTurnDelay,
} from '../../scenes/game/combat/combat.helpers';
import { Move, MoveConfig } from '../move.model';

const defenseStat = 'defense' as const;
const damage = [450, 650, 1200];

/**
 * Night Daze - Zoroark line's move
 *
 * Damages a target and blinds them for 3 seconds.
 */
export const nightDaze = {
  displayName: 'Night Daze',
  type: 'active',
  cost: 16,
  startingPP: 10,
  range: 1,
  targetting: 'unit',
  defenseStat,
  get description() {
    return `{{user}} hits a single enemy with a pitch-black blast, dealing ${damage.join(
      '/'
    )} damage and blinding it for 3 seconds`;
  },
  use({ scene, user, target, onComplete }: MoveConfig<'unit'>) {
    scene.add.tween({
      targets: [user],
      duration: getTurnDelay(user.basePokemon) * 0.15,
      ...getAttackAnimation(user, getFacing(user, target)),
      yoyo: true,
      ease: 'Power1',
      onYoyo: () => {
        scene.causeDamage(
          user,
          target,
          {
            damage: damage[user.basePokemon.stage - 1],
            defenseStat,
          },
          { canCrit: true }
        );
        target.addStatus('blind', 3000);
        onComplete();
      },
    });
  },
} as const satisfies Move;
