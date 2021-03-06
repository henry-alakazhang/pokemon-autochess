export class Button extends Phaser.GameObjects.Text {
  constructor(scene: Phaser.Scene, x: number, y: number, text: string) {
    super(scene, x, y, text, {
      color: '#FFAA00',
      fontSize: '22px',
    });

    this.setOrigin(0.5, 0.5);
    this.setInteractive({ useHandCursor: true });

    this.on(Phaser.Input.Events.POINTER_OVER, () =>
      this.setStyle({ fontStyle: 'bold' })
    ).on(Phaser.Input.Events.POINTER_OUT, () =>
      this.setStyle({ fontStyle: 'normal' })
    );
  }
}
