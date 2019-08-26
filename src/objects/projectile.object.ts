export class Projectile extends Phaser.Physics.Arcade.Image {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    private target: Phaser.GameObjects.Sprite,
    private duration: number
  ) {
    super(scene, x, y, texture);
  }

  update(delta: number) {
    this.duration -= delta;
    if (this.duration <= 0) {
      this.destroy();
      return;
    }

    const remainingX = this.target.x - this.x;
    const remainingY = this.target.y - this.y;
    this.setVelocityX((remainingX * 1000) / this.duration);
    this.setVelocityY((remainingY * 1000) / this.duration);

    console.log(Math.atan2(this.body.velocity.y, this.body.velocity.x));
    this.setRotation(Math.atan2(this.body.velocity.y, this.body.velocity.x));
  }
}
