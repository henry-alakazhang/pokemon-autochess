import {
  calculateDamage,
  getAttackAnimation,
  getFacing,
  getTurnDelay,
} from '../../scenes/game/combat/combat.helpers';
import { Move, MoveConfig } from '../move.model';
import * as Tweens from '../tweens';

/**
 * Fury Cutter - Scizor line's move
 *
 * Deals damage to a single target that increases by 50% each time it hits
 */
const move = {
  displayName: 'Fury Cutter',
  type: 'active',
  cost: 4,
  startingPP: 2,
  damage: [100, 200, 400],
  defenseStat: 'defense',
  targetting: 'unit',
  get description() {
    return `{{user}} slashes a single enemy rapidly to deal ${this.damage.join(
      '/'
    )} damage, increasing with each use.`;
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
                  animationArr.forEach(sprite => sprite.destroy());
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
            const damage = calculateDamage(user, target, {
              // damage increases by 50% each strike
              damage:
                this.damage[user.basePokemon.stage - 1] *
                1.5 ** user.consecutiveAttacks,
              defenseStat: 'defense',
            });
            scene.causeDamage(user, target, damage);
          },
        });
      },
    });
  },
} as const;

export const furyCutter: Move = move;
