import {
  calculateDamage,
  getAttackAnimation,
  getFacing,
  getTurnDelay,
} from '../../scenes/game/combat/combat.helpers';
import { animations } from '../animations';
import { Move, MoveConfig } from '../move.model';

/**
 * Leech Life - Zubat line's move
 *
 * Deals damage to a single target and heals the user for half the amount
 */
export const leechLife: Move = {
  displayName: 'Leech Life',
  type: 'active',
  damage: [150, 250, 400],
  defenseStat: 'defense',
  targetting: 'unit',
  get description() {
    return `Deals ${this.damage.join(
      '/'
    )} damage to a single target and heals the user for half that amount.`;
  },
  range: 1,
  use({ scene, user, target, onComplete }: MoveConfig<'unit'>) {
    scene.add.tween({
      targets: [user],
      duration: getTurnDelay(user.basePokemon) * 0.15,
      ...getAttackAnimation(user, getFacing(user, target)),
      yoyo: true,
      ease: 'Power1',
      onComplete: () => onComplete(),
      onYoyo: () => {
        const damage = calculateDamage(user, target, {
          damage: this.damage[user.basePokemon.stage - 1],
          defenseStat: this.defenseStat,
        });
        scene.causeDamage(user, target, damage);

        // play bee animation on the target
        const bees = scene.add
          .sprite(target.x, target.y, 'leech-life')
          .play('leech-life')
          .once(Phaser.Animations.Events.SPRITE_ANIMATION_COMPLETE, () => {
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
    });
  },
} as const;
