import * as Phaser from 'phaser';

/**
 * Spins in a circle or elliptical shape
 */
export async function spin(
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
  return new Promise(resolve => {
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
                  onComplete: () => {
                    onComplete?.();
                    resolve();
                  },
                });
              },
            });
          },
        });
      },
    });
  });
}

export async function hop(
  scene: Phaser.Scene,
  {
    targets,
    repeat = 0,
    onComplete,
  }: {
    targets: Phaser.GameObjects.GameObject[];
    repeat?: number;
    onComplete?: Function;
  }
) {
  return new Promise(resolve => {
    scene.add.tween({
      targets,
      duration: 150,
      y: '-= 10',
      yoyo: true,
      ease: 'Quad.easeOut',
      repeat,
      onComplete: () => {
        onComplete?.();
        resolve();
      },
    });
  });
}
