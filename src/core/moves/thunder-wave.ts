import { Move } from '../move.model';

export const thunderWave: Move = {
  displayName: 'Thunder Wave',
  type: 'active',
  description: 'Paralyses the target for 4 seconds.',
  range: 2,
  use({ scene, board, user, targetCoords, onComplete }) {
    const target = board[targetCoords.x][targetCoords.y];
    if (!target) {
      return onComplete();
    }

    // hopping animation
    scene.add.tween({
      targets: [user],
      duration: 150,
      y: user.y - 10,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => {
        const img = scene.add.image(target.x, target.y, 'thunder-wave');
        const flashAnimation = window.setInterval(
          () => img.setVisible(!img.visible),
          200
        );
        window.setTimeout(() => {
          clearInterval(flashAnimation);
          img.destroy();

          target.status.paralyse = 4000;
          target.redrawBars();
          onComplete();
        }, 600);
      },
    });
  },
};
