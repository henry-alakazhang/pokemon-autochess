import {
  getAngle,
  getAttackAnimation,
  getFacing,
  getTurnDelay,
} from '../../scenes/game/combat/combat.helpers';
import { Move, MoveConfig } from '../move.model';

export const braveBird: Move = {
  displayName: 'Brave Bird',
  type: 'active',
  range: 1,
  use: ({ scene, user, target, onComplete }: MoveConfig) => {
    // animation: bird overlaying on top of Pokemon that grows
    const img = scene.add
      .image(user.x, user.y, 'braveBird')
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
            // do tons of damage
            target.takeDamage(target.maxHP / 2);
            // recoil
            user.takeDamage(user.maxHP / 8);
            onComplete();
          },
        });
      },
    });
  },
} as const;
