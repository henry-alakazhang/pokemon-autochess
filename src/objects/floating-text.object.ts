export class FloatingText extends Phaser.GameObjects.Text {
  static readonly COMPLETE = 'complete';
  private textObject: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, text: string) {
    super(scene, x, y, text, {
      fontSize: '18px',
    });

    // randomly off-center it by up to 5 px
    const startX = (Math.random() - 0.5) * 10 + x;
    const startY = (Math.random() - 0.5) * 10 + y;

    this.textObject = this.scene.add.text(startX, startY, text, {
      fontSize: '18px',
    });
    this.textObject.setOrigin(0, 1);

    // add disappearing animation
    this.scene.add.tween({
      targets: this.textObject,
      duration: 600,
      ease: 'Exponential.In',
      x: startX + 5,
      y: startY - 10,
      alpha: 0.2,
      onComplete: () => {
        this.textObject.destroy();
        super.destroy();
      },
      callbackScope: this,
    });
  }
}
