import { Move, MoveConfig } from '../move.model';
import * as Tweens from '../tweens';

const damage = [600, 999, 1600];
const defenseStat = 'defense' as const;

/**
 * Gigaton Hammer - Tinkatink line's move
 *
 * Deals massive damage. Self-flinches if it doesn't KO.
 */
export const gigatonHammer = {
  displayName: 'Gigaton Hammer',
  type: 'active',
  cost: 16,
  startingPP: 10,
  defenseStat,
  targetting: 'unit',
  range: 1,
  description: `{{user}} smashes its target with a massive hammer, dealing ${damage.join('/')} damage. If this doesn't KO the target, {{user}} flinches and the next cast costs more PP.`,
  async use({ scene, user, target, onComplete }: MoveConfig<'unit'>) {
    await Tweens.spin(scene, {
      targets: [user],
      height: 20,
      width: 20,
      duration: 250,
    });

    // TODO: graphics
    scene.causeDamage(user, target, {
      damage: damage[user.basePokemon.stage - 1],
      defenseStat,
    });
    if (target.currentHP > 0) {
      user.addStatus('ppReduction', 99_999);
    }
    onComplete();
  },
} as const satisfies Move;
