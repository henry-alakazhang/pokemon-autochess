import { Coords } from '../../scenes/game/combat/combat.helpers';
import { Move, MoveConfig } from '../move.model';
import * as Tweens from '../tweens';

const damage = [500, 800, 1300];
const defenseStat = 'specDefense' as const;

const getAOE = ({ x, y }: Coords) => {
  return [
    { x, y },
    { x: x + 1, y },
    { x: x - 1, y },
    { x, y: y + 1 },
    { x, y: y - 1 },
  ];
};

/**
 * Moonblast - Flutter Mane's move
 *
 * Placeholder move
 */
export const moonblast = {
  displayName: 'Proto Moonblast',
  type: 'active',
  cost: 6,
  startingPP: 2,
  defenseStat,
  targetting: 'unit',
  range: 3,
  description: `{{user}} attacks with a powerful blast of moonlight that deals ${damage.join('/')} special damage and lowers the target's Sp. Atk for 8 seconds. If the target's Sp. Atk is already lowered, the blast deals damage to all adjacent enemies instead.`,
  getAOE,
  async use({
    scene,
    user,
    target,
    targetCoords,
    onComplete,
  }: MoveConfig<'unit'>) {
    await Tweens.spin(scene, {
      targets: [user],
      height: 20,
      width: 20,
      duration: 250,
    });
    // TODO: graphics
    // Moon over flutter mane
    // Beam

    const action = { damage: damage[user.basePokemon.stage - 1], defenseStat };
    if (target.statChanges.specAttack < 0) {
      scene.causeAOEDamage(user, getAOE(targetCoords), action);
    } else {
      scene.causeDamage(user, target, action);
      target.changeStats({ specAttack: -1 }, 8000);
    }
    onComplete();
  },
} as const satisfies Move;
