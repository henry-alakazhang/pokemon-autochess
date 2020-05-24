import * as Phaser from 'phaser';

/**
 * Spins in a circle or elliptical shape
 */
export function spin(
  scene: Phaser.Scene,
  {
    targets,
    height,
    width,
    duration,
    onComplete,
  }: {
    targets: Phaser.GameObjects.GameObject[];
    height: number;
    width: number;
    duration: number;
    onComplete?: Function;
  }
) {
  const easeIn = Phaser.Math.Easing.Circular.In;
  const easeOut = Phaser.Math.Easing.Circular.Out;
  // make four quarter-circle turns
  scene.add.tween({
    targets,
    props: {
      x: { value: `+=${height / 2}`, ease: easeOut },
      y: { value: `-=${width / 2}`, ease: easeIn },
    },
    duration: duration / 4,
    onComplete: () => {
      scene.add.tween({
        targets,
        props: {
          x: { value: `-=${height / 2}`, ease: easeIn },
          y: { value: `-=${width / 2}`, ease: easeOut },
        },
        duration: duration / 4,
        onComplete: () => {
          scene.add.tween({
            targets,
            props: {
              x: { value: `-=${height / 2}`, ease: easeOut },
              y: { value: `+=${width / 2}`, ease: easeIn },
            },
            duration: duration / 4,
            onComplete: () => {
              scene.add.tween({
                targets,
                props: {
                  x: { value: `+=${height / 2}`, ease: easeIn },
                  y: { value: `+=${width / 2}`, ease: easeOut },
                },
                duration: duration / 4,
                // call the onComplete at the end
                onComplete,
              });
            },
          });
        },
      });
    },
  });
}
