import { Move } from '../move.model';

export const thunderWave: Move = {
  displayName: 'Thunder Wave',
  type: 'active',
  description: 'Paralyses the target for 4 seconds.',
  range: 2,
  use({ scene, user, target, onComplete }) {
    // hopping animation
    scene.add.tween({
      targets: [user],
      duration: 150,
      y: user.y - 10,
      yoyo: true,
      ease: 'Quad.InOut',
      // todo: inverse power
      onComplete: () => {
        const img = scene.add.image(target.x, target.y, 'thunder-wave');
        const flashAnimation = window.setInterval(
          () => img.setVisible(!img.visible),
          200
        );
        window.setTimeout(() => {
          clearInterval(flashAnimation);
          img.destroy();

          target.status.paralyse = true;
          target.redrawBars();
          // TODO: figure out a better way to make statuses last a certain duration
          window.setTimeout(() => {
            target.status.paralyse = false;
          }, 4000);
          onComplete();
        }, 600);
      },
    });
  },
};
