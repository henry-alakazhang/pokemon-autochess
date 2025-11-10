import { calculateDamage } from '../../scenes/game/combat/combat.helpers';
import { animations } from '../animations';
import { Move, MoveConfig } from '../move.model';

const defenseStat = 'defense' as const;
const bonusDamage = [175, 300, 400];

/**
 * Leech Life - Zubat line's move
 *
 * Deals damage to a single target and heals the user for half the amount
 */
export const leechLife = {
  displayName: 'Leech Life',
  type: 'active',
  cost: 16,
  startingPP: 0,
  defenseStat,
  targetting: 'unit',
  get description() {
    return `{{user}} attacks a single enemy and drains their blood, dealing ${bonusDamage.join(
      '/'
    )} bonus damage. {{user}}'s HP is restored by half that amount.`;
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
          .sprite(target.x, target.y, 'leech-life')
          .play('leech-life')
          .once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            bees.destroy();
          });
        // and move it onto the user
        scene.add.tween({
          targets: [bees],
          duration: animations['leech-life'].duration * 0.75,
          x: user.x,
          y: user.y,
          onComplete: () => {
            // FIXME: heal based on actual damage dealt
            user.heal(calculateDamage(user, target, action) / 2);
          },
        });
      },
      onComplete,
    });
  },
} as const satisfies Move;
