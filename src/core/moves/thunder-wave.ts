import { Move, MoveConfig } from '../move.model';
import * as Tweens from '../tweens';

export const thunderWave = {
  displayName: 'Thunder Wave',
  type: 'active',
  cost: 16,
  startingPP: 6,
  description:
    '{{user}} sends a jolt of electricity at a single enemy, paralysing it for 4 seconds and lowering all stats for 4 more seconds.',
  range: 3,
  targetting: 'unit',
  use({ scene, user, target, onComplete }: MoveConfig<'unit'>) {
    // hopping animation
    Tweens.hop(scene, {
      targets: [user],
      onComplete: () => {
        const img = scene.add.image(target.x, target.y, 'thunder-wave');
        const timer = scene.time.addEvent({
          callback: () => {
            // play flicker "animation"
            img.setVisible(!img.visible);

            // if this is the end of the animation, apply status
            if (timer.repeatCount === 0) {
              target.addStatus('paralyse', 4000);
              target.changeStats(
                {
                  attack: -1,
                  defense: -1,
                  specAttack: -1,
                  specDefense: -1,
                  speed: -1,
                },
                8000
              );
            }
          },
          delay: 200,
          repeat: 4,
        });
        onComplete();
      },
    });
  },
} as const satisfies Move;
