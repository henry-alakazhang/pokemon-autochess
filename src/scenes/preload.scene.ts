import { Scene } from 'phaser';
import { BootScene } from './boot.scene';

export class PreloadScene extends Scene {
  static readonly KEY = 'PreloadScene';

  constructor() {
    super({
      key: PreloadScene.KEY,
    });
  }

  preload(): void {
    this.load.image('logo', 'assets/logo.png');
  }

  update(): void {
    this.scene.start(BootScene.KEY);
  }
}
