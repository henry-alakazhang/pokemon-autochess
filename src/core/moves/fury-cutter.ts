import {
  calculateDamage,
  getAttackAnimation,
  getFacing,
  getTurnDelay,
} from '../../scenes/game/combat/combat.helpers';
import { Move, MoveConfig } from '../move.model';

/**
 * Fury Cutter - Scizor line's move
 *
 * Deals damage to a single target that increases by 50% each time it hits
 */
export const furyCutter: Move = {
  displayName: 'Fury Cutter',
  type: 'active',
  damage: [100, 200, 400],
  defenseStat: 'defense',
  targetting: 'unit',
  get description() {
    return `Deals ${this.damage.join(
      '/'
    )} damage to a single target, increasing each time it hits`;
  },
  range: 1,
  use({ scene, user, target, onComplete }: MoveConfig<'unit'>) {
    // hopping animation ...
    scene.add.tween({
      targets: [user],
      duration: 150,
      y: user.y - 10,
      yoyo: true,
      ease: 'Quad.easeOut',
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
            const playAnimation = (count: number) => {
              animationArr.push(
                scene.add
                  .sprite(target.x, target.y, 'fury-cutter')
                  .play('fury-cutter')
                  .setFlipX(count % 2 === 0)
              );
              if (count > 0) {
                // if there are still attacks to be performed do it.
                window.setTimeout(() => playAnimation(count - 1), 100);
              } else {
                // otherwise, clean up
                window.setTimeout(() => {
                  animationArr.forEach(sprite => sprite.destroy());
                }, 200);
              }
            };
            playAnimation(user.consecutiveAttacks);
            const damage = calculateDamage(
              user.basePokemon,
              target.basePokemon,
              {
                // damage increases by 50% each strike
                damage:
                  this.damage[user.basePokemon.stage - 1] *
                  1.5 ** user.consecutiveAttacks,
                defenseStat: 'defense',
              }
            );
            target.takeDamage(damage);
          },
        });
      },
    });
  },
} as const;
