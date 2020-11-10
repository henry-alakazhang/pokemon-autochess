import { Category } from '../core/game.model';

export class SynergyMarker extends Phaser.GameObjects.Sprite {
  static height = 30;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private category: Category,
    private count: number
  ) {
    super(scene, x, y, category);
    this.setDisplaySize(100, 22);
    this.setOrigin(0.5, 0.5);
  }
}
