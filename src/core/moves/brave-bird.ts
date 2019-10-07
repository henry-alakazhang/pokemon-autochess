import {
  calculateDamage,
  getAngle,
  getAttackAnimation,
  getFacing,
  getTurnDelay,
} from '../../scenes/game/combat/combat.helpers';
import { Move, MoveConfig } from '../move.model';

/**
 * Brave Bird - Talonflame line's move
 *
 * Deals heavy damage to a single target with some recoil to the user.
 * 250ms cast time
 *
 * TODO: differentiate this from Volt Tackle
 */
export const braveBird: Move = {
  displayName: 'Brave Bird',
  type: 'active',
  damage: [200, 350, 500],
  defenseStat: 'defense',
  get description() {
    return `Deals ${this.damage.join(
      '/'
    )} damage to a single target, with some recoil to the user.`;
  },
  range: 1,
  use({ scene, user, target, onComplete }: MoveConfig) {
    // animation: bird overlaying on top of Pokemon that grows
    const img = scene.add
      .image(user.x, user.y, 'brave-bird')
      .setScale(0.6, 0.6)
      .setRotation(getAngle(user, target));
    // grow bird
    scene.add.tween({
      targets: [img],
      duration: 250,
      scaleX: 1.2,
      scaleY: 1.2,
      onComplete: () => {
        // do attack animation
        scene.add.tween({
          targets: [user, img],
          duration: getTurnDelay(user.basePokemon) * 0.15,
          ...getAttackAnimation(user, getFacing(user, target)),
          yoyo: true,
          ease: 'Power1',
          onYoyo: (_, tweenTarget) => {
            // yoyo is called twice since we're moving both user and img
            // this makes sure the onhit effect is only run once
            if (tweenTarget !== user) {
              return;
            }

            img.destroy();
            const damage = calculateDamage(
              user.basePokemon,
              target.basePokemon,
              {
                damage: this.damage[user.basePokemon.stage - 1],
                defenseStat: 'defense',
              }
            );
            target.takeDamage(damage);
            user.takeDamage(Math.floor(damage / 4), false);
            onComplete();
          },
        });
      },
    });
  },
} as const;
