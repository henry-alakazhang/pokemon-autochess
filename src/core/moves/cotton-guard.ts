import { Coords } from '../../scenes/game/combat/combat.helpers';
import { CombatScene } from '../../scenes/game/combat/combat.scene';
import { Move, MoveConfig } from '../move.model';

/**
 * Cotton Guard - Dubwool line's move
 *
 * Temporarily reduces all incoming damage and ignores status effects
 */
export const cottonGuard: Move = {
  displayName: 'Cotton Guard',
  type: 'active',
  range: 1,
  targetting: 'ground',
  // actually effectiveness haha
  damage: [30, 45, 60],
  get description() {
    return `Reduces all incoming damage by ${this.damage.join(
      '/'
    )} and ignores statuses for 6 seconds.`;
  },
  getTarget(board: CombatScene['board'], myCoords: Coords) {
    return myCoords;
  },
  use({ scene, user, onComplete }: MoveConfig<'ground'>) {
    const DURATION = 6000;
    // hopping animation
    scene.add.tween({
      targets: [user],
      duration: 150,
      y: user.y - 10,
      yoyo: true,
      ease: 'Quad.easeOut',
    });

    const cotton = scene.add
      .sprite(user.x, user.y, 'cotton-guard')
      .play('cotton-guard-start');
    user.attach(cotton);
    user.addStatus('moveIsActive', DURATION);
    cotton.once(Phaser.Animations.Events.SPRITE_ANIMATION_COMPLETE, () => {
      user
        // adding moveIsActive here will refresh the duration
        // so it lasts the same as everything else
        .addStatus('moveIsActive', DURATION)
        .addStatus(
          'percentDamageReduction',
          DURATION,
          this.damage[user.basePokemon.stage - 1]
        )
        .addStatus('statusImmunity', DURATION);
      cotton.play('cotton-guard-spin');
      onComplete();

      // end animation when status is over
      setTimeout(() => {
        if (cotton.active) {
          cotton.play('cotton-guard-end');
          cotton.once(
            Phaser.Animations.Events.SPRITE_ANIMATION_COMPLETE,
            () => {
              cotton.destroy();
            }
          );
        }
      }, DURATION);
    });
  },
} as const;
