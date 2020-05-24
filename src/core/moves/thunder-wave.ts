import { Move, MoveConfig } from '../move.model';
import * as Tweens from '../tweens';

export const thunderWave: Move = {
  displayName: 'Thunder Wave',
  type: 'active',
  description: 'Paralyses the target for 4 seconds.',
  range: 2,
  targetting: 'unit',
  use({ scene, user, target, onComplete }: MoveConfig<'unit'>) {
    // hopping animation
    Tweens.hop(scene, {
      targets: [user],
      onComplete: () => {
        const img = scene.add.image(target.x, target.y, 'thunder-wave');
        const flashAnimation = window.setInterval(
          () => img.setVisible(!img.visible),
          200
        );
        window.setTimeout(() => {
          clearInterval(flashAnimation);
          img.destroy();

          target.addStatus('paralyse', 4000);
          target.redrawBars();
          onComplete();
        }, 600);
      },
    });
  },
};
