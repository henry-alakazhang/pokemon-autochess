export class Projectile extends Phaser.GameObjects.Sprite {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    private target: Phaser.GameObjects.Sprite,
    /** speed in pixels per second */
    private speed: number
  ) {
    super(scene, x, y, texture);
  }

  update(delta: number) {
    // how far to move this update
    const stepDistance = (this.speed * delta) / 1000;

    const remainingX = this.target.x - this.x;
    const remainingY = this.target.y - this.y;

    // reached destination: selfdestruct
    if (Math.abs(remainingX) < 15 && Math.abs(remainingY) < 15) {
      this.destroy();
      return;
    }

    const total = Math.abs(remainingX) + Math.abs(remainingY);
    // scale the velocity based on the speed
    this.x += (stepDistance * remainingX) / total;
    this.y += (stepDistance * remainingY) / total;
    // point angle
    this.setRotation(Math.atan2(remainingY, remainingX));
  }
}
