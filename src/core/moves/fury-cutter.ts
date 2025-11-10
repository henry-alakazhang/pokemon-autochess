import {
  getAttackAnimation,
  getFacing,
  getTurnDelay,
} from '../../scenes/game/combat/combat.helpers';
import { Move, MoveConfig } from '../move.model';
import * as Tweens from '../tweens';

const defenseStat = 'defense' as const;
const baseDamage = [600, 1100, 999];

/**
 * Fury Cutter - Scizor line's move
 *
 * Deals damage to a single target that increases by 50% each time it hits
 */
export const furyCutter = {
  displayName: 'Fury Cutter',
  type: 'active',
  cost: 5,
  startingPP: 2,
  defenseStat,
  targetting: 'unit',
  get description() {
    return `{{user}} slashes a single enemy rapidly to deal ${baseDamage.join(
      '/'
    )} damage, doubling with each use.`;
  },
  range: 1,
  use({ scene, user, target, onComplete }: MoveConfig<'unit'>) {
    Tweens.hop(scene, {
      targets: [user],
      onComplete: () => {
        // ... into a faster-than-usual attack animation
        scene.add.tween({
          targets: [user],
          duration: getTurnDelay(user.basePokemon) * 0.1,
          ...getAttackAnimation(user, getFacing(user, target)),
          yoyo: true,
          ease: 'Power1',
          onComplete: () => onComplete(),
          onYoyo: () => {
            user.consecutiveAttacks++;
            const animationArr: Phaser.GameObjects.Sprite[] = [];
            // animation: play a number of slashes equal to the number of attacks up to now
            const event = scene.time.addEvent({
              callback: () => {
                // at the end of the loop, clean up
                if (event.repeatCount === 0) {
                  animationArr.forEach((sprite) => sprite.destroy());
                } else {
                  animationArr.push(
                    scene.add
                      .sprite(target.x, target.y, 'fury-cutter')
                      .play('fury-cutter')
                      .setFlipX(event.repeatCount % 2 === 0)
                  );
                }
              },
              delay: 100,
              // repeat once more than necessary to clean up
              repeat: user.consecutiveAttacks + 1,
            });
            const action = {
              // damage increases by 50% each strike
              damage:
                baseDamage[user.basePokemon.stage - 1] *
                2 ** (user.consecutiveAttacks - 1),
              defenseStat,
            };
            scene.causeDamage(user, target, action);
          },
        });
      },
    });
  },
} as const satisfies Move;
