export class FloatingText extends Phaser.GameObjects.Text {
  constructor(scene: Phaser.Scene, x: number, y: number, text: string) {
    // randomly off-center it by up to 5 px
    const startX = (Math.random() - 0.5) * 10 + x;
    const startY = (Math.random() - 0.5) * 10 + y;

    super(scene, startX, startY, text, {
      fontSize: '18px',
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
