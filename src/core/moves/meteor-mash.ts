import {
  calculateDamage,
  getAttackAnimation,
  getFacing,
  inBounds,
} from '../../scenes/game/combat/combat.helpers';
import { Move, MoveConfig } from '../move.model';

/**
 * Meteor Mash - Beldum line's unique move
 *
 * Damages a target knocks it back, stunning it and anyone behind it.
 */
const move = {
  displayName: 'Meteor Mash',
  type: 'active',
  range: 1,
  targetting: 'unit',
  damage: [400, 750, 1400],
  get description() {
    return `{{user}} winds up for a huge punch to a single enemy. It deals ${this.damage.join(
      '/'
    )} damage and knocks the target back. The target and any enemy behind it are stunned for 2 seconds, doubled if hit into a wall.`;
  },
  use({
    scene,
    board,
    user,
    userCoords,
    target,
    targetCoords,
    onComplete,
  }: MoveConfig<'unit'>) {
    const forwardMovement = getAttackAnimation(user, getFacing(user, target));
    const backwardMovement = getAttackAnimation(user, getFacing(target, user));
    const originalCoords = { x: user.x, y: user.y };

    scene.add.tween({
      targets: [user],
      duration: 500,
      ...backwardMovement,
      onComplete: () => {
        scene.add.tween({
          targets: [user],
          duration: 100,
          ...forwardMovement,
          onComplete: () => {
            const punch = scene.add
              .sprite(target.x, target.y, 'meteor-mash')
              .play('meteor-mash')
              .once(Phaser.Animations.Events.ANIMATION_COMPLETE, () =>
                punch.destroy()
              );

            const dx = targetCoords.x - userCoords.x;
            const dy = targetCoords.y - userCoords.y;
            const endCoords = {
              x: targetCoords.x + dx,
              y: targetCoords.y + dy,
            };
            // find the first blocked / out-of-bounds square
            while (
              inBounds(board, endCoords) &&
              !board[endCoords.x][endCoords.y]
            ) {
              endCoords.x += dx;
              endCoords.y += dy;
            }
            // move to the square before
            // TODO: move faster than default speed/easing
            scene.movePokemon(targetCoords, {
              x: endCoords.x - dx,
              y: endCoords.y - dy,
            });

            const damage = calculateDamage(user, target, {
              damage: this.damage[user.basePokemon.stage - 1],
              defenseStat: 'defense',
            });
            scene.causeDamage(user, target, damage);

            if (
              inBounds(board, endCoords) &&
              board[endCoords.x][endCoords.y]?.side === target.side
            ) {
              // if the blockage is another enemy, stun both and deal damage to the other target
              target.addStatus('paralyse', 2000);

              const otherTarget = board[endCoords.x][endCoords.y];
              if (otherTarget) {
                const otherDamage = calculateDamage(user, otherTarget, {
                  damage: this.damage[user.basePokemon.stage - 1],
                  defenseStat: 'defense',
                });
                scene.causeDamage(user, otherTarget, otherDamage, {
                  isAOE: true,
                });
                otherTarget.addStatus('paralyse', 2000);
              }
            } else {
              // if the blockage is a wall or ally, stun the single target for longer
              target.addStatus('paralyse', 4000);
            }

            scene.add.tween({
              targets: [user],
              duration: 500,
              delay: 250,
              ...originalCoords,
              onComplete: () => {
                onComplete();
              },
            });
          },
        });
      },
    });
  },
} as const;

export const meteorMash: Move = move;
