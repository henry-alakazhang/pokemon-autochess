import { titleStyle } from './text.helpers';

export class Button extends Phaser.GameObjects.Text {
  static Events = {
    CLICK: 'buttonClick',
  };

  constructor(scene: Phaser.Scene, x: number, y: number, text: string) {
    super(scene, x, y, text.toUpperCase(), {
      ...titleStyle,
      color: '#FFAA00',
      fontStyle: 'normal',
      fontSize: '22px',
    });

    this.setOrigin(0.5, 0.5);
    this.setInteractive({ useHandCursor: true });

    this.on(Phaser.Input.Events.POINTER_OVER, () => {
      this.setStyle({ fontStyle: 'bold' });
    })
      .on(Phaser.Input.Events.POINTER_OUT, () => {
        this.setStyle({ fontStyle: 'normal' });
      })
      .on(Phaser.Input.Events.POINTER_DOWN, (event: Phaser.Input.Pointer) => {
        if (event.leftButtonDown()) {
          this.emit(Button.Events.CLICK);
        }
      });
  }
}
