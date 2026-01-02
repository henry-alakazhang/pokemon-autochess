import {
  getAttackAnimation,
  getFacing,
  getTurnDelay,
} from '../../scenes/game/combat/combat.helpers';
import { Move, MoveConfig } from '../move.model';

const defenseStat = 'defense' as const;
const damage = [400, 650, 1000];

/**
 * Razor Leaf - Sewaddle line's move
 *
 * Hits the target and sends out two leaves in a Y shape.
 * TODO: implement the Y shaped leaves later as the logic is complex.
 */
export const razorLeaf = {
  displayName: 'Razor Leaf',
  type: 'active',
  cost: 12,
  startingPP: 8,
  defenseStat,
  targetting: 'unit',
  get description() {
    return `{{user}} slashes a target for ${damage.join('/')} physical damage.
  <br /><strong>Hazard: Sticky Web.</strong> Slows all enemies for 5 seconds / the entire round at the start of combat.`;
  },
  range: 1,
  use({ scene, user, target, onComplete }: MoveConfig<'unit'>) {
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
      },
      onComplete,
    });
  },
} as const satisfies Move;
