import { calculateDamage } from '../../scenes/game/combat/combat.helpers';
import { animations } from '../animations';
import { Move, MoveConfig } from '../move.model';

/**
 * Leech Life - Zubat line's move
 *
 * Deals damage to a single target and heals the user for half the amount
 */
const move = {
  displayName: 'Leech Life',
  type: 'active',
  cost: 14,
  startingPP: 0,
  damage: [250, 450, 660],
  defenseStat: 'defense',
  targetting: 'unit',
  get description() {
    return `{{user}} attacks a single enemy and drains their blood, dealing ${this.damage.join(
      '/'
    )} bonus damage. {{user}}'s HP is restored by half that amount.`;
  },
  range: 2,
  use({ scene, user, target, onComplete }: MoveConfig<'unit'>) {
    scene.basicAttack(user, target, {
      onHit: () => {
        const damage = calculateDamage(user, target, {
          damage: this.damage[user.basePokemon.stage - 1],
          defenseStat: this.defenseStat,
        });
        scene.causeDamage(user, target, damage);

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
            user.heal(damage / 2);
          },
        });
      },
      onComplete,
    });
  },
} as const;

export const leechLife: Move = move;
