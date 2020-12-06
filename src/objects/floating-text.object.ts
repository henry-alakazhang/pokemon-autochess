export class FloatingText extends Phaser.GameObjects.Text {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    size: 'small' | 'large' = 'small'
  ) {
    // randomly off-center it by up to 5 px
    const startX = (Math.random() - 0.5) * 10 + x;
    const startY = (Math.random() - 0.5) * 10 + y;

    super(scene, startX, startY, text, {
      fontStyle: size === 'small' ? 'normal' : 'bold',
      fontSize: size === 'small' ? '18px' : '20px',
    });

    this.setOrigin(0, 1);

    // add disappearing animation
    this.scene.add.tween({
      targets: this,
      duration: 600,
      ease: 'Exponential.In',
      x: startX + 5,
      y: startY - 10,
      alpha: 0.2,
      onComplete: () => {
        this.destroy();
      },
      callbackScope: this,
    });
  }
}
