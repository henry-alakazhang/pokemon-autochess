import { isDefined } from '../../helpers';
import {
  calculateDamage,
  inBounds,
} from '../../scenes/game/combat/combat.helpers';
import { Move, MoveConfig } from '../move.model';
import * as Tweens from '../tweens';

/**
 * Mud Bomb - Mudkip line's move
 *
 * Damages a target and reduces its Speed temporarily. Damage splashes to nearby targets.
 */
const move = {
  displayName: 'Mud Bomb',
  type: 'active',
  cost: 24,
  startingPP: 12,
  range: 1,
  targetting: 'unit',
  damage: [200, 350, 550],
  defenseStat: 'specDefense',
  get description() {
    return `{{user}} launches a hard-packed mud ball at single enemy, dealing ${this.damage.join(
      '/'
    )} damage and slowing its Speed for 5 seconds. Adjacent enemies take half damage and aren't slowed.`;
  },
  async use({
    board,
    scene,
    user,
    target,
    targetCoords,
    onComplete,
  }: MoveConfig<'unit'>) {
    await Tweens.hop(scene, { targets: [user] });
    const baseDamage = this.damage[user.basePokemon.stage - 1];
    // animation is a mud bomb dropping
    const bomb = scene.add.sprite(target.x, target.y - 70, 'mud-bomb');
    scene.add.tween({
      targets: [bomb],
      y: target.y + 15,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 250,
      ease: Phaser.Math.Easing.Quadratic.In,
      onComplete: () => {
        // play explosion animation and cause target to jump like a knockup
        bomb
          .play('mud-bomb')
          .once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            // leave bomb in background
            bomb.setDepth(-1);
          });
        Tweens.hop(scene, { targets: [target] });
        const damage = calculateDamage(user, target, {
          damage: baseDamage,
          defenseStat: this.defenseStat,
        });
        scene.causeDamage(user, target, damage, { isAOE: true });
        target.changeStats({ speed: -1 }, 5000);
        scene.time.addEvent({
          callback: () => {
            // clean up ground effect when slow wears off
            bomb.destroy();
          },
          delay: 5000,
        });

        // deal damage to possible adjacent targets
        const extraTargets = [
          { x: targetCoords.x, y: targetCoords.y + 1 },
          { x: targetCoords.x, y: targetCoords.y - 1 },
          { x: targetCoords.x + 1, y: targetCoords.y },
          { x: targetCoords.x - 1, y: targetCoords.y },
        ];
        extraTargets
          // get Pokemon if in bounds
          .map(coords =>
            inBounds(board, coords) ? board[coords.x][coords.y] : undefined
          )
          // filter out nonexistent ones
          .filter(isDefined)
          .forEach(secondaryTarget => {
            if (secondaryTarget.side !== user.side) {
              const secondaryDamage = calculateDamage(user, secondaryTarget, {
                damage: baseDamage / 2,
                defenseStat: this.defenseStat,
              });
              scene.causeDamage(user, secondaryTarget, secondaryDamage, {
                isAOE: true,
              });
            }
          });

        onComplete();
      },
    });
  },
} as const;

export const mudBomb: Move = move;
