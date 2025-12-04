import { isDefined } from '../../helpers';
import { inBounds } from '../../scenes/game/combat/combat.helpers';
import { Move, MoveConfig } from '../move.model';
import { createDamageReductionEffect } from '../status.model';

const defenseStat = 'defense' as const;
const totalDamage = [500, 750, 1250];

/**
 * Rollout - Geodude line's move
 *
 * Spins, reducing damage taken and damaging adjacent enemies over time.
 * aka. Garen / Juggernaut
 */
export const rollout = {
  displayName: 'Rollout',
  type: 'active',
  cost: 18,
  startingPP: 16,
  range: 1,
  targetting: 'unit',
  defenseStat,
  get description() {
    return `{{user}} curls up and spins for 5 seconds, dealing ${totalDamage.join(
      '/'
    )} damage to adjacent enemies over time, and reducing incoming damage by 30%.`;
  },
  use({ scene, board, user, userCoords, onComplete }: MoveConfig<'unit'>) {
    // bit hacky: any duration on statuses/effects will last until the next status check
    // which will run after the turn is completed
    user
      .addStatus('moveIsActive', 1)
      .addEffect(createDamageReductionEffect('rollout', 30), 1);
    // 5 RPS
    user.setAngularVelocity(1800);

    // FIXME: should be able to move
    const spinTimer = scene.time.addEvent({
      delay: 500,
      repeat: 10,
      callback: () => {
        const targets = [
          { x: userCoords.x + 1, y: userCoords.y },
          { x: userCoords.x - 1, y: userCoords.y },
          { x: userCoords.x, y: userCoords.y + 1 },
          { x: userCoords.x, y: userCoords.y - 1 },
        ]
          .filter((coords) => inBounds(board, coords))
          .map((coords) => board[coords.x][coords.y])
          .filter(isDefined);

        targets
          .filter((target) => target.side !== user.side)
          .forEach((target) => {
            // hit enemies
            const hitEffect = scene.add
              .sprite(target.x, target.y, 'rock-hit')
              .play('rock-hit')
              .once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
                hitEffect.destroy();
              });
            scene.causeDamage(
              user,
              target,
              {
                damage: totalDamage[user.basePokemon.stage - 1] / 10,
                defenseStat,
              },
              { isAOE: true }
            );
          });

        // after final spin, finish.
        if (spinTimer.getRepeatCount() === 0) {
          user.setAngle(0);
          user.setAngularVelocity(0);
          onComplete();
        }
      },
    });
    // cancels on death / cc
    user.addCancellableEvent({
      timer: spinTimer,
      onCancel: () => {
        user.setAngle(0);
        user.setAngularVelocity(0);
        onComplete();
      },
    });
  },
} as const satisfies Move;
