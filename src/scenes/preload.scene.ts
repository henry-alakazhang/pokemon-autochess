import { Scene } from 'phaser';
import { LoadingScene } from './loading.scene';

/**
 * The scene "shown" at the very start
 *
 * All this scene does is load the logo so it can be used in the LoadingScene
 */
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
    this.scene.start(LoadingScene.KEY);
  }
}
